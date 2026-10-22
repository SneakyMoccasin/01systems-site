"""Versioned, deterministic Swedish projection. Never evaluates model rules."""
from html import escape
import json

from bridge import digest, obj, require
from selection import search_size, generated_orders

VERSION = 'ce3-pilot-presentation/2'
LEGACY_NAMES = 'ce3-pilot-presentation/1'


def part(value):
    return str(value).replace('~', '~0').replace('/', '~1')


def label_targets(problem):
    """Only names, never replacement prose for a rule, value or predicate."""
    m = problem['model']
    result = {'/model/clock/unit'}
    for section in ('decisions', 'events', 'domains'):
        result.update('/model/' + section + '/' + part(k) for k in m[section])
    for field, domain in m['domains'].items():
        if 'enum' in domain:
            result.update('/model/domains/' + part(field) + '/enum/' + str(i)
                          for i, value in enumerate(domain['enum']) if type(value) is str)
    for event, rule in m['events'].items():
        result.update('/model/events/' + part(event) + '/outcomes/' + part(k) for k in rule['outcomes'])
    result.update('/scenario_set/members/' + str(i) + '/label'
                  for i in range(len(problem['scenario_set']['members'])))
    return result


def validate(definition, problem):
    version = definition.get('schema_version') if type(definition) is dict else None
    require(version in (LEGACY_NAMES, VERSION), 'Unsupported presentation; new prepare required')
    obj(definition, ('schema_version', 'labels') + (('boolean_states',) if version == VERSION else ()), 'presentation names')
    if version == VERSION:
        states = definition['boolean_states']
        allowed = {'/model/domains/' + part(k) for k, d in problem['model']['domains'].items()
                   if 'enum' in d and all(type(v) is bool for v in d['enum'])}
        require(type(states) is dict and set(states) <= allowed, 'Boolean phrases require a boolean field')
        for phrases in states.values():
            obj(phrases, ('true', 'false'), 'boolean state phrases')
            require(all(type(v) is str and bool(v.strip()) for v in phrases.values()), 'Nonblank boolean phrases required')
            require(phrases['true'].strip().casefold() != phrases['false'].strip().casefold(), 'Boolean phrases must distinguish true and false')
    labels = definition['labels']
    require(type(labels) is dict and set(labels) <= label_targets(problem), 'Unknown presentation name target')
    require(all(type(v) is str and bool(v.strip()) for v in labels.values()), 'Nonblank presentation names required')
    # Names must not make distinct choices/fields/outcomes indistinguishable.
    groups = [[p for p in labels if p.startswith('/model/' + section + '/') and
               p.count('/') == 3] for section in ('decisions', 'domains', 'events')]
    groups += [[p for p in labels if p.startswith('/model/events/' + part(e) + '/outcomes/')]
               for e in problem['model']['events']]
    groups += [[p for p in labels if p.startswith('/model/domains/' + part(f) + '/enum/')]
               for f in problem['model']['domains']]
    groups += [[p for p in labels if p.startswith('/scenario_set/')]]
    for group in groups:
        values = [labels[p].strip().casefold() for p in group]
        require(len(values) == len(set(values)), 'Presentation names must distinguish alternatives')


def render(snapshot, notice):
    from pilot_contract import targets, leaves
    p, a = snapshot['problem'], snapshot['analysis']
    m, s, goal = p['model'], p['search'], p['observation']
    definition = snapshot['presentation']
    validate(definition, p)
    labels = definition['labels']
    source_titles = {e['id']: e['title'] for e in snapshot['evidence']}
    assumption_names = {v['id']: 'antagande ' + str(i) for i, v in enumerate(snapshot['assumptions'], 1)}
    esc = lambda v: escape(str(v), quote=True)
    raw = lambda v: json.dumps(v, ensure_ascii=False, sort_keys=True)
    def name(path, fallback):
        return labels.get(path, 'Namn saknas: ”' + str(fallback) + '”')
    def field(k):
        return name('/model/domains/' + part(k), k)
    def decision(k):
        return name('/model/decisions/' + part(k), k)
    def event(k):
        return name('/model/events/' + part(k), k)
    def outcome(e, k):
        return name('/model/events/' + part(e) + '/outcomes/' + part(k), k)
    def value(k, v):
        if type(v) is bool:
            return 'ja' if v else 'nej'
        if type(v) is str:
            index = m['domains'][k]['enum'].index(v)
            return name('/model/domains/' + part(k) + '/enum/' + str(index), v)
        return str(v)
    unit = name('/model/clock/unit', m['clock']['unit'])
    def time(v):
        return str(v) + ' ' + unit
    def paragraph(text):
        return '<p>' + esc(text) + '</p>'
    def bullets(items):
        return '<ul>' + ''.join('<li>' + esc(x) + '</li>' for x in items) + '</ul>'
    def table(head, rows):
        return ('<div class="table-scroll"><table><thead><tr>' + ''.join('<th scope="col">' + esc(x) + '</th>' for x in head) +
                '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + esc(c) + '</td>' for c in row) + '</tr>' for row in rows) +
                '</tbody></table></div>')
    def document_support(key):
        return '<details class="support"><summary>Visa underlag</summary><a href="#record-' + key + '">Exakta uppgifter och kopplingar</a></details>'
    def provenance(*prefixes, document=None):
        matches = [(i, mp) for i, mp in enumerate(snapshot['mapping'], 1)
                   if any(t == pre or t.startswith(pre + '/') for t in mp['targets'] for pre in prefixes)]
        refs = sorted({r['source_id'] for _, mp in matches for r in mp['refs']})
        assumptions = sorted({k for _, mp in matches for k in mp['assumption_ids']})
        support = ('Källor: ' + ', '.join(source_titles[r] for r in refs) + '. ' if refs else '')
        support += ('Antaganden: ' + ', '.join(assumption_names[k] for k in assumptions) + '.' if assumptions else '')
        visible = ('<p class="assumption">Bygger på ' + esc(', '.join(assumption_names[k] for k in assumptions)) + '.</p>' if assumptions else '')
        return visible + '<details class="support"><summary>Visa underlag</summary>' + paragraph(support) + ''.join(
            '<p><a href="#mapping-' + str(i) + '">Underlag ' + str(i) + '</a></p>' +
            bullets([t for t in mp['targets'] if any(t == pre or t.startswith(pre + '/') for pre in prefixes)])
            for i, mp in matches) + (
                '<p><a href="#record-' + document + '">Avgränsning och användning</a></p>' if document else '') + '</details>'
    def state(k, v):
        phrases = definition.get('boolean_states', {}).get('/model/domains/' + part(k))
        if type(v) is bool and phrases:
            return phrases['true' if v else 'false']
        return field(k) + ': ' + value(k, v)
    def predicates(items):
        return '; '.join(state(g['field'], g['value']) if g['op'] == 'eq' else
                         field(g['field']) + ' är minst ' + str(g['value']) for g in items)
    def effects(e):
        lines = [state(k, v) for k, v in sorted(e['set'].items())]
        lines += [field(k) + (' ökar med ' if v >= 0 else ' minskar med ') + str(abs(v))
                  for k, v in sorted(e['add'].items())]
        return '; '.join(lines) or 'Inga värden ändras'
    def equality(values):
        return '; '.join(state(k, v) for k, v in sorted(values.items()))
    def goal_lines():
        lines = []
        for c in goal['all']:
            if c['operator'] == 'terminal':
                timing = 'Vid slutet, ' + time(m['clock']['horizon'])
            elif c['operator'] == 'reach_by':
                timing = 'Minst en gång från ' + time(m['clock']['start']) + ' till och med ' + time(c['deadline'])
            else:
                timing = 'Vid varje kontrollpunkt från ' + time(m['clock']['start']) + ' till och med ' + time(c['through'])
            lines.append(timing + ': ' + equality(c['equals']) + '.')
        return lines
    def choice_lines():
        lines = []
        if s['required_decision_ids']:
            lines.append('Måste ingå: ' + ', '.join(decision(k) for k in s['required_decision_ids']) + '.')
        for group in s['choice_groups']:
            lines.append(('Välj exakt ett' if group['kind'] == 'exactly_one' else 'Välj högst ett') +
                         ' av: ' + ', '.join(decision(k) for k in group['members']) + '.')
        grouped = {k for g in s['choice_groups'] for k in g['members']}
        free = [decision(k) for k in s['optional_decision_ids'] if k not in grouped]
        if free:
            lines.append('Kan väljas till eller utelämnas var för sig: ' + ', '.join(free) + '.')
        if search_size(p)['subsets_by_length'][0]:
            lines.append('Även en plan utan beslut ingår.')
        return lines
    parts = ['<!doctype html><html lang="sv"><head><meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width, initial-scale=1">',
             '<title>Underlag för modellbekräftelse</title>',
             '<style>body{font:17px system-ui,sans-serif;color:#172b36;background:#f6f7f8;max-width:1080px;margin:32px auto;padding:0 24px;line-height:1.6}'
             'main{background:white;padding:28px;border-radius:12px}h1{line-height:1.2}h2{margin-top:2em;line-height:1.3}h3{margin-bottom:.4em}'
             '.decision-card{border:1px solid #bfcbd2;border-left:4px solid #35637d;border-radius:8px;padding:16px 20px;margin:16px 0}.decision-card h3{margin:0}.decision-card p{margin:.5em 0}'
             '.support{padding:8px 12px;margin:12px 0}.support summary{font-size:1em}.assumption{color:#684d00}.overview{border-bottom:1px solid #bfcbd2;padding-bottom:16px}'
             '.notice{background:#fff0c2;border:2px solid #846000;padding:16px;font-weight:700}.support{font-size:.9em;color:#3c5260}'
             'a{color:#174f83}details{margin:24px 0;border:1px solid #8b9aa4;border-radius:8px;padding:16px;background:white}'
             'summary{font-size:1.15em;font-weight:700;cursor:pointer}li{margin:.4em 0}.table-scroll{overflow-x:auto}'
             'table{border-collapse:collapse;width:100%;min-width:640px}td,th{border:1px solid #bfcbd2;padding:12px;vertical-align:top;text-align:left;min-width:14rem;word-break:normal;overflow-wrap:break-word}'
             'th{background:#edf2f5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}code{overflow-wrap:anywhere}'
             '@media(max-width:600px){body{padding:0 10px}main{padding:16px}}'
             '@media print{body{max-width:none;background:white}main{padding:0}.table-scroll{overflow:visible}table{min-width:0}td,th{min-width:0}}</style></head><body>',
             '<p class="notice">' + esc(notice) + '</p><main><h1>Kontrollera beskrivningen av er verksamhet</h1>',
             paragraph('Det här är beskrivningen före analysen, inte ett analysresultat eller en rekommendation. Ni ska kontrollera att den stämmer med verksamheten.'),
             '<section class="overview"><h2>Det här ska vi undersöka.</h2>', paragraph(a['question']), bullets(a['includes']),
             '<h3>Alternativen</h3>', bullets(choice_lines()),
             '<h3>Det här räknas som att målet är nått.</h3>', bullets(goal_lines()),
             paragraph('Alla målkrav ska gälla, och varje valt beslut måste kunna genomföras. Samma plan prövas i alla angivna scenarier.'),
             paragraph('Kontrollpunkterna omfattar även läget före och efter händelser vid samma tid. Kraven ska gälla oavsett ordningen mellan samtidiga händelser.'),
             provenance('/search', '/observation', document='analysis'), '</section>',
             '<h2>Så ser läget ut från början.</h2>']
    # Only fields used by a guard, effect, budget or goal affect this model's question.
    # All other initial fields and every domain remain available in the technical view.
    relevant = {k for c in goal['all'] for k in c['equals']}
    for rule in list(m['decisions'].values()) + list(m['events'].values()):
        relevant.update(g['field'] for g in rule['requires'])
        for effect in ([rule['effects']] if 'effects' in rule else rule['outcomes'].values()):
            relevant.update(effect['set'])
            relevant.update(effect['add'])
    if m['budget']:
        relevant.add(m['budget']['field'])
    parts += [bullets([state(k, m['initial'][k]) + '.' for k in sorted(relevant)]),
              provenance('/model/initial', '/model/domains', '/model/budget')]
    if not m['budget']:
        parts += [paragraph('Modellen har inget kostnadskonto. Det betyder inte att besluten är kostnadsfria i verkligheten.')]
    parts += ['<h2>Det här kan ni besluta.</h2>',
              paragraph('Villkoren i korten ska gälla samtidigt, vid beslutets fasta tid. Annars genomförs beslutet inte och får ingen effekt eller kostnad. Det görs inget nytt försök.')]
    for k, rule in sorted(m['decisions'].items(), key=lambda item: (item[0] not in s['required_decision_ids'], item[0])):
        parts += ['<article class="decision-card"><h3>' + esc(decision(k)) + '</h3>',
                  paragraph('Måste ingå.' if k in s['required_decision_ids'] else 'Ett alternativ enligt valreglerna ovan.'),
                  paragraph('Kräver: ' + predicates(rule['requires']) + '.') if rule['requires'] else
                  (paragraph('Inga särskilda förvillkor.') if not rule['cost'] else ''),
                  paragraph('Efter genomförandet: ' + effects(rule['effects']) + '.')]
        if rule['cost']:
            parts += [paragraph('Förbrukar ' + str(rule['cost']) + ' från ' + field(m['budget']['field']) + '. Detta måste finnas tillgängligt när beslutet tas.')]
        if rule['schedule']:
            parts += [paragraph('Följs av ' + event(rule['schedule']['event']) + ' efter ' + time(rule['schedule']['delay']) + '.')]
        parts += [provenance('/model/decisions/' + part(k)), '</article>']
    parts += ['<h2>Tider och viktiga besked.</h2>',
              paragraph('Period: ' + time(m['clock']['start']) + ' till och med ' + time(m['clock']['horizon']) +
                        '. Händelser hanteras före beslut vid samma tid.'),
              paragraph('Besluten försöks i vald ordning vid ' + ', '.join(time(t) for t in s['slots']) +
                        '. Kortare planer använder de första tiderna, så utelämnade beslut kan tidigarelägga andra beslut.')]
    for deadline in m['metadata']['deadlines']:
        parts += [paragraph('Sista tid före ' + event(deadline['event']) + ': ' + time(deadline['last_inclusive_step']) + ', inklusive denna tid.')]
    for k, rule in sorted(m['events'].items()):
        parts += ['<h3>' + esc(event(k)) + '</h3>']
        initial = [e for e in m['initial_events'] if e['id'] == k]
        for e in initial:
            parts += [paragraph('Hanteras vid ' + time(e['due']) + (', efter analysens slut.' if e['due'] > m['clock']['horizon'] else '.'))]
        if not initial and not any(d['schedule'] and d['schedule']['event'] == k for d in m['decisions'].values()):
            parts += [paragraph('Inte schemalagd i denna modell.')]
        if rule['requires']:
            parts += [paragraph('Kräver: ' + predicates(rule['requires']) + '. Om villkoren inte gäller då uteblir effekten; händelsen försöks inte igen.')]
        parts += [bullets([('Uteblivet besked – ' if rule['absent'] and o == rule['absent']['outcome'] else '') +
                          outcome(k, o) + ': ' + effects(e) + '.' for o, e in sorted(rule['outcomes'].items())])]
    parts += ['<h3>Scenarier</h3>', bullets([
        name('/scenario_set/members/' + str(i) + '/label', sc['label']) + ': ' +
        ('; '.join(event(k) + ' → ' + outcome(k, v) for k, v in sorted(sc['outcomes'].items())) or 'Inga externa besked varierar.')
        for i, sc in enumerate(p['scenario_set']['members'])]),
        provenance('/model/clock', '/model/initial_events', '/model/events', '/model/metadata/deadlines', '/scenario_set'),
        '<h2>Det här antar vi.</h2>',
        bullets([assumption_names[x['id']].capitalize() + ': ' + x['statement'] + ' ' + x['reason'] for x in snapshot['assumptions']])
        if snapshot['assumptions'] else paragraph('Inga separata antaganden är deklarerade.'), document_support('assumptions'),
        '<h2>Det här ingår inte i analysen.</h2>', bullets(a['excludes'] + a['limitations']), document_support('analysis'),
        '<h2>Det här behöver ni kontrollera före bekräftelse.</h2>']
    dispositions = {'open': 'Olöst fråga', 'hypothetical': 'Antagande', 'scenarios': 'Osäkert besked',
                    'scope_excluded': 'Utanför analysen', 'source_resolved': 'Källstödd uppgift'}
    # Keep every issue's substance visible; detailed ownership, source spans and
    # former scope are retained in its closed section and the technical snapshot.
    parts += [bullets([dispositions[x['disposition']] + ': ' + x['question'] + ' ' + x['reason'] for x in snapshot['issues']])]
    missing = label_targets(p) - set(labels)
    if missing:
        parts += [paragraph('Begripliga namn saknas för ' + str(len(missing)) + ' delar. De markeras med ”Namn saknas”; kontrollera betydelsen innan ni bekräftar.')]
    parts += [paragraph('Kontrollera särskilt startläget, beslutens villkor, tiderna, målen och antagandena. Källstöd och ordval behöver också granskas; sidan bevisar inte att uppgifterna är sanna.'),
              '<details class="support"><summary>Visa underlag</summary>',
              paragraph('Användning: ' + a['intended_use']), paragraph('Vem får besluta: ' + a['decision_authority']),
              paragraph('Namn och tillståndsmeningar är manuellt angivna. Källkopplade uppgifter hänvisar till bevarade källor; antaganden är hypoteser.'),
              '<a href="#review-records">Frågor, antaganden och källor med exakta kopplingar</a></details>']
    size = search_size(p)
    budget = snapshot['execution']['max_cells']
    if budget < size['cells']:
        parts += [paragraph('Körbudgeten räcker till ' + str(budget) + ' av ' + str(size['cells']) +
                            ' kombinationer av plan och scenario. Alla alternativ ryms inte i budgeten. Återstående resultat är okända, inte negativa.')]
    parts += [paragraph('Bekräftelsen gäller denna beskrivning. Ändringar kräver ny granskning och nya bekräftelser.'), '</main>']
    parts += ['<details id="analysis-method"><summary>Visa hur analysen fungerar</summary>',
              paragraph('Obligatoriska beslut: ' + (', '.join(decision(k) for k in s['required_decision_ids']) or 'inga') + '.'),
              paragraph('Valfria beslut: ' + (', '.join(decision(k) for k in s['optional_decision_ids']) or 'inga') + '.'),
              paragraph('Alla tillåtna beslutskombinationer enligt valreglerna ovan prövas i alla ordningar. Varje valt beslut försöks exakt en gång. '
                        'Inga nya försök görs om ett beslut blockeras (inga retries), och planen avbryts inte i förtid. '
                        'Ett kortare urval använder de första tidsplatserna. Att utelämna beslut kan alltså tidigarelägga andra beslut. '
                        'Samma fasta plan används genom alla deklarerade scenarier; den anpassas inte till besked. Scenarier ändrar bara externa utfall, inte tider eller regler.'),
              paragraph('Tom plan: ' + ('ingår i sökningen.' if size['subsets_by_length'][0] else 'ingår inte i sökningen.') +
                        (' Tillstånd för tom plan är angivet, men övriga urvalsregler måste också tillåta den.' if s['allow_empty'] else ' Tom plan är uttryckligen förbjuden.')),
              paragraph('Sökningen omfattar ' + str(size['candidates']) + ' planer × ' + str(size['scenarios']) + ' scenarier = ' + str(size['cells']) + ' kombinationer (celler).'),
              '<h3>Planerna och deras tider</h3>',
              bullets([' → '.join(decision(k) + ' vid ' + time(t) for t, k in zip(s['slots'], order)) or 'Tom plan: inga beslutsförsök.' for order in generated_orders(p)]),
              paragraph('För varje plan och scenario undersöks samtliga möjliga ordningar av samtidiga händelser. Varje sådan händelsebana måste kontrolleras. '
                        'För att en plan ska nå målet genom alla scenarier måste kraven gälla på alla dessa banor i varje deklarerat scenario.'),
              paragraph('Tiden går i steg om ' + time(m['clock']['step']) + '. Bara schemalagda händelser kan inträffa, en gång per händelse. Händelser efter sluttiden förblir väntande. '
                        'Målens kontrollpunkter är varje registrerad rads före- och efterläge inom intervallet; slutmålet gäller efter sista raden. '
                        'Värden utanför tillåtna värdemängder är modellfel, inte vanliga negativa målresultat.'),
              '<h3>Körgränser</h3>', paragraph('Körbudgeten tillåter högst ' + str(budget) + ' av ' + str(size['cells']) + ' kombinationer. ' +
                  ('Budgeten räcker inte för att pröva alla alternativ. ' if budget < size['cells'] else 'Budgeten rymmer alla kombinationer, men avbrott eller andra gränser kan ändå göra sökningen ofullständig. ') +
                  'Okörda eller ofullständigt kontrollerade alternativ har okända resultat, inte ett nej. '
                  'Ordningen är tekniskt bestämd och innebär ingen ranking eller sannolikhet.'),
              bullets(['Per körning: högst ' + str(snapshot['execution']['limits']['max_paths']) + ' händelsebanor, ' +
                       str(snapshot['execution']['limits']['max_rows']) + ' historikrader och ' + str(snapshot['execution']['limits']['max_steps']) + ' tidssteg.',
                       'Timeout är 60 sekunder per replay-/auditprocess: en enskild kör- eller kontrollprocess får högst denna tid.',
                       'Förprovens kontrollkörningar ligger utanför batchens max_cells-budget. Dessa inledande modellkontroller förbrukar alltså inte de ' + str(budget) + ' kombinationerna.',
                       'Ingen total väggklocksgaranti finns. Gränserna lovar inte en viss total körtid.']),
              paragraph('Ingen plan utses till bäst. Inga sannolikheter, optimalitet eller global omöjlighet följer av sökningen. Underlag, körningskorrekthet, mål och söktäckning är separata besked.'), '</details>',
              '<details id="technical"><summary>Visa tekniskt underlag</summary>',
              paragraph('Presentationsformat: ' + definition['schema_version'] + '. Snapshot: ' + digest(snapshot)),
              table(['Klassificeringsfält', 'Värde'], sorted(snapshot['classification'].items())),
              '<h3>Manuellt angivna namn</h3>', table(['Exakt modellkoppling', 'Namn som visas'], sorted(labels.items())),
              '<h3>Bundna tillståndsmeningar</h3>', table(['Booleskt fält', 'Meningar för true/false'], [(k, raw(v)) for k, v in sorted(definition.get('boolean_states', {}).items())])]
    # Quotes are collected once here. Mapping rows link to that numbered collection.
    refs = {raw(r): r for entry in snapshot['mapping'] + snapshot['issues'] for r in entry['refs']}
    numbered = {key: i for i, key in enumerate(sorted(refs), 1)}
    values = targets(p)
    parts += ['<h3>Fullständiga modellvärden och källkopplingar</h3>']
    for i, mapping in enumerate(snapshot['mapping'], 1):
        parts += ['<section id="mapping-' + str(i) + '"><h4>Underlag ' + str(i) + '</h4>', paragraph(mapping['explanation']),
                  table(['Kodfält', 'Exakt värde'], [(t, raw(values[t])) for t in mapping['targets']]),
                  paragraph('Antaganden: ' + (', '.join(mapping['assumption_ids']) or 'inga')),
                  '<p>Källhänvisningar: ' + (', '.join('<a href="#source-' + str(numbered[raw(r)]) + '">Källutdrag ' + str(numbered[raw(r)]) + '</a>' for r in mapping['refs']) or 'inga') + '</p></section>']
    parts += ['<h3>Samlat källunderlag</h3>']
    for key, i in numbered.items():
        r = refs[key]
        parts += ['<section id="source-' + str(i) + '"><h4>Källutdrag ' + str(i) + '</h4>',
                  paragraph(r['source_id'] + '@' + r['source_version'] + ', tecken ' + str(r['start']) + '–' + str(r['end']) + ' (slut ej inkluderat).'),
                  '<pre>' + esc(r['quote']) + '</pre></section>']
    parts += ['<section id="review-records">']
    for key, title in [('analysis', 'Fråga, avgränsning och användning'), ('assumptions', 'Antaganden med exakta kopplingar'), ('issues', 'Frågor och dispositioner'),
                       ('controls', 'Kontrollfall'), ('evidence', 'Bevarade källor'), ('execution', 'Exakta körgränser')]:
        # Keep quotes only in collected source material and the required full snapshot.
        data = json.loads(raw(snapshot[key]))
        if key == 'issues':
            for issue in data:
                issue['refs'] = ['Källutdrag ' + str(numbered[raw(r)]) for r in issue['refs']]
        parts += ['<h3 id="record-' + key + '">' + title + '</h3>', table(['Kodfält', 'Exakt värde / hänvisning'], [(k, raw(v)) for k, v in leaves(data).items()])]
    parts += ['</section><details><summary>Full snapshot och registrerad implementation</summary><pre>',
              esc(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, indent=2)), '</pre></details></details></body></html>\n']
    return '\n'.join(parts).encode('utf-8')
