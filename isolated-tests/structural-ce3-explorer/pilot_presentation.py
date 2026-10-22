"""Versioned, deterministic Swedish projection. Never evaluates model rules."""
from html import escape
import json

from bridge import digest, equal, obj, require
from selection import search_size, generated_orders

VERSION = 'ce3-pilot-presentation/1'


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
    obj(definition, ('schema_version', 'labels'), 'presentation names')
    equal(definition['schema_version'], VERSION, 'Unsupported presentation; new prepare required')
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
    def provenance(*prefixes):
        matches = [(i, mp) for i, mp in enumerate(snapshot['mapping'], 1)
                   if any(t == pre or t.startswith(pre + '/') for t in mp['targets'] for pre in prefixes)]
        refs = sorted({r['source_id'] for _, mp in matches for r in mp['refs']})
        assumptions = sorted({k for _, mp in matches for k in mp['assumption_ids']})
        text = ('Källkopplat underlag: ' + ', '.join(source_titles[r] for r in refs) + '. ' if refs else '')
        text += ('Antaganden: ' + ', '.join(assumption_names[k] for k in assumptions) + '. ' if assumptions else '')
        if refs and assumptions:
            text += 'Delar bygger på antaganden; källkopplingen gäller inte allt. '
        return '<p class="support">' + esc(text) + 'Spårning: ' + ', '.join(
            '<a href="#mapping-' + str(i) + '">underlag ' + str(i) + '</a>' for i, _ in matches) + '.</p>'
    def predicates(items):
        return ' och '.join('”' + field(g['field']) + '”' + (' är ' if g['op'] == 'eq' else ' är minst ') +
                            value(g['field'], g['value']) for g in items) or 'Inga särskilda villkor'
    def effects(e):
        lines = ['”' + field(k) + '” blir ' + value(k, v) for k, v in sorted(e['set'].items())]
        lines += ['”' + field(k) + '”' + (' ökar med ' if v >= 0 else ' minskar med ') + str(abs(v))
                  for k, v in sorted(e['add'].items())]
        return '; '.join(lines) or 'Inga värden ändras'
    def equality(values):
        return ' och '.join('”' + field(k) + '” är ' + value(k, v) for k, v in sorted(values.items()))
    parts = ['<!doctype html><html lang="sv"><head><meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width, initial-scale=1">',
             '<title>Underlag för modellbekräftelse</title>',
             '<style>body{font:17px system-ui,sans-serif;color:#172b36;background:#f6f7f8;max-width:1080px;margin:32px auto;padding:0 24px;line-height:1.6}'
             'main{background:white;padding:28px;border-radius:12px}h1{line-height:1.2}h2{margin-top:2em;line-height:1.3}h3{margin-bottom:.4em}'
             '.notice{background:#fff0c2;border:2px solid #846000;padding:16px;font-weight:700}.support{font-size:.9em;color:#3c5260}'
             'a{color:#174f83}details{margin:24px 0;border:1px solid #8b9aa4;border-radius:8px;padding:16px;background:white}'
             'summary{font-size:1.15em;font-weight:700;cursor:pointer}li{margin:.4em 0}.table-scroll{overflow-x:auto}'
             'table{border-collapse:collapse;width:100%;min-width:640px}td,th{border:1px solid #bfcbd2;padding:12px;vertical-align:top;text-align:left;min-width:14rem;word-break:normal;overflow-wrap:break-word}'
             'th{background:#edf2f5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}code{overflow-wrap:anywhere}'
             '@media(max-width:600px){body{padding:0 10px}main{padding:16px}}'
             '@media print{body{max-width:none;background:white}main{padding:0}.table-scroll{overflow:visible}table{min-width:0}td,th{min-width:0}}</style></head><body>',
             '<p class="notice">' + esc(notice) + '</p><main><h1>Kontrollera beskrivningen av er verksamhet</h1>',
             paragraph('Ni bekräftar modellbeskrivningen i denna version. Sidan är inte ett analysresultat och bevisar inte att verksamhetsuppgifterna är sanna. '
                       'Källornas relevans, reglernas rimlighet och antagandena behöver bedömas av er och den domänansvariga.'),
             '<h2>Det här ska vi undersöka.</h2>', paragraph(a['question']), paragraph('Användning: ' + a['intended_use']),
             bullets(a['includes']), paragraph('Vem får besluta: ' + a['decision_authority']),
             '<h2>Så ser läget ut från början.</h2>']
    for k, v in sorted(m['initial'].items()):
        domain = m['domains'][k]
        allowed = ('från ' + str(domain['integer'][0]) + ' till ' + str(domain['integer'][1])
                   if 'integer' in domain else ', '.join(value(k, x) for x in domain['enum']))
        parts += [paragraph(field(k) + ': ' + value(k, v) + '. Tillåtna värden: ' + allowed + '.'),
                  provenance('/model/initial/' + part(k), '/model/domains/' + part(k))]
    parts += [paragraph('Budgetkonto: ' + field(m['budget']['field']) + '.' if m['budget'] else
                        'Inget budgetkonto finns i modellen. Alla beslut har regelkostnad 0; detta säger inget om verkliga kostnader.'),
              provenance('/model/budget'), '<h2>Det här kan ni besluta.</h2>']
    for k, rule in sorted(m['decisions'].items()):
        lines = [('Obligatoriskt i varje plan.' if k in s['required_decision_ids'] else 'Valbart, med de valregler som anges nedan.'),
                 'Om beslutet genomförs: ' + effects(rule['effects']) + '.',
                 'Regelkostnad: ' + str(rule['cost']) + ('. Dras från ' + field(m['budget']['field']) + '.' if m['budget'] else '.')]
        if rule['schedule']:
            lines.append('Schemalägger ' + event(rule['schedule']['event']) + ' med fördröjning ' + time(rule['schedule']['delay']) + ' efter genomfört beslut.')
        else:
            lines.append('Schemalägger ingen händelse.')
        parts += ['<h3>' + esc(decision(k)) + '</h3>', bullets(lines), provenance('/model/decisions/' + part(k))]
    parts += ['<h2>Det här måste vara uppfyllt.</h2>',
              paragraph('Villkoren kontrolleras vid beslutets fasta tid. Om något villkor inte är uppfyllt blockeras försöket utan effekt eller kostnad. Det görs inget nytt försök.')]
    for k, rule in sorted(m['decisions'].items()):
        requirement = predicates(rule['requires'])
        if m['budget']:
            requirement += '; ' + field(m['budget']['field']) + ' måste räcka till regelkostnaden ' + str(rule['cost'])
        parts += [paragraph(decision(k) + ': ' + requirement + '.'), provenance('/model/decisions/' + part(k) + '/requires', '/model/decisions/' + part(k) + '/cost')]
    parts += [paragraph('Alla angivna villkor måste gälla samtidigt. Värden måste hållas inom modellens tillåtna intervall; ett värde utanför intervallet är ett modellfel, inte ett vanligt nej.')]
    for group in s['choice_groups']:
        parts += [paragraph(('Exakt ett' if group['kind'] == 'exactly_one' else 'Högst ett') + ' av följande beslut får ingå: ' + ', '.join(decision(k) for k in group['members']) + '.')]
    parts += [provenance('/search'), '<h2>Tider och viktiga besked.</h2>',
              paragraph('Analysen börjar vid ' + time(m['clock']['start']) + ' och slutar vid ' + time(m['clock']['horizon']) + ', inklusive slutpunkten. '
                        'Tiden går i steg om ' + time(m['clock']['step']) + '. Händelser hanteras före beslut vid samma tid.'),
              paragraph('Beslutens fasta tidsplatser: ' + ', '.join(time(t) for t in s['slots']) + '.'), provenance('/model/clock', '/search/slots')]
    for i, initial in enumerate(m['initial_events']):
        parts += [paragraph(event(initial['id']) + ': inlagt vid ' + time(initial['scheduled_at']) + ', ska hanteras vid ' + time(initial['due']) + '.'),
                  provenance('/model/initial_events/' + str(i))]
    for i, deadline in enumerate(m['metadata']['deadlines']):
        parts += [paragraph('Angiven sista tid före ' + event(deadline['event']) + ': ' + time(deadline['last_inclusive_step']) + ', inklusive denna tid.'),
                  provenance('/model/metadata/deadlines/' + str(i))]
    for k, rule in sorted(m['events'].items()):
        parts += ['<h3>' + esc(event(k)) + '</h3>', paragraph(('Tidsstyrd händelse. ' if rule['kind'] == 'timer' else 'Externt besked. ') + 'Villkor: ' + predicates(rule['requires']) + '.'),
                  bullets([outcome(k, o) + ': ' + effects(e) + '.' for o, e in sorted(rule['outcomes'].items())])]
        if rule['absent']:
            absent = rule['absent']
            parts += [paragraph('Uteblivet besked representeras av ' + outcome(k, absent['outcome']) + ': ' + field(absent['field']) + ' blir ' + value(absent['field'], absent['value']) + '. Övriga effekter för detta utfall visas ovan.')]
        parts += [provenance('/model/events/' + part(k))]
    parts += [paragraph('Endast schemalagda händelser kan inträffa. En schemalagd händelse hanteras en gång. Om dess villkor inte gäller då tas den bort utan effekt. '
                        'Händelser efter analysens sluttid ligger kvar som väntande och inträffar inte inom analysen.'), '<h3>Scenarier som ska prövas</h3>']
    for i, sc in enumerate(p['scenario_set']['members']):
        parts += [paragraph(name('/scenario_set/members/' + str(i) + '/label', sc['label']) + ': ' +
                            ('; '.join(event(k) + ' → ' + outcome(k, v) for k, v in sorted(sc['outcomes'].items())) or 'Inga externa besked varierar.') ),
                  provenance('/scenario_set/members/' + str(i))]
    parts += ['<h2>Det här räknas som att målet är nått.</h2>', paragraph('Alla följande målkrav ska uppfyllas, och alla valda beslutsförsök måste ha godkänts av modellens regler:')]
    for i, component in enumerate(goal['all']):
        op = component['operator']
        timing = {'terminal': 'Vid analysens slut, ' + time(m['clock']['horizon']),
                  'always': 'Vid varje modellerad kontrollpunkt från ' + time(m['clock']['start']) + ' till och med ' + time(component.get('through', m['clock']['horizon'])),
                  'reach_by': 'Vid minst en modellerad kontrollpunkt från ' + time(m['clock']['start']) + ' till och med ' + time(component.get('deadline', m['clock']['horizon']))}[op]
        parts += [paragraph(timing + ': ' + equality(component['equals']) + '.'), provenance('/observation/all/' + str(i))]
    parts += [paragraph('Kontrollpunkterna omfattar läget före och efter varje registrerad händelse eller steg inom tidsintervallet, även mellan händelser vid samma tid. '
                        'Slutmålet kontrolleras efter den sista registrerade raden. Detta är modellens diskreta kontrollpunkter, inte ett bevis om verkligheten mellan dem. '
                        'Kraven gäller på samtliga prövade ordningar av samtidiga händelser. Ett mål uppfyllt i ett scenario betyder inte automatiskt att det gäller i de andra.'),
              '<h2>Det här antar vi.</h2>', paragraph('Antaganden är uttryckliga hypoteser. Källkopplade uppgifter har hänvisningar till bevarat underlag; hänvisningen bevisar inte att uppgiften är sann.')]
    parts += [bullets([assumption_names[x['id']].capitalize() + ': ' + x['statement'] + ' Varför: ' + x['reason'] for x in snapshot['assumptions']]) if snapshot['assumptions'] else paragraph('Inga separata antaganden är deklarerade.')]
    parts += ['<h2>Det här ingår inte i analysen.</h2>', bullets(a['excludes']), '<h3>Viktiga begränsningar</h3>', bullets(a['limitations']),
              '<h2>Det här behöver ni kontrollera före bekräftelse.</h2>',
              paragraph('Kontrollera fråga och avgränsning, namn och konkreta värden, villkor, effekter, kostnader, tider, mål och scenarier. '
                        'Bedöm antaganden, öppna frågor, beslutsurval och körbudget. Namnen i beskrivningen är manuellt angivna presentationstexter, inte ytterligare fakta eller regler.')]
    missing = sorted(label_targets(p) - set(labels))
    if missing:
        parts += [paragraph('Begripliga namn saknas för ' + str(len(missing)) + ' delar av underlaget. De visas som ”Namn saknas” med originalnamnet. '
                            'Komplettera och granska en ny version om betydelsen inte är tydlig; ingen verksamhetsbetydelse har gissats.')]
    dispositions = {'open': 'Olöst fråga', 'hypothetical': 'Hanteras som antagande', 'scenarios': 'Prövas i deklarerade scenarier',
                    'scope_excluded': 'Utanför den avgränsade frågan', 'source_resolved': 'Uppgift med källstöd'}
    impacts = {'blocks_analysis': 'Kritisk för den avgränsade analysen', 'outside_scope': 'Ligger utanför analysen', 'ranking_only': 'Gäller värdering mellan alternativ'}
    for issue in snapshot['issues']:
        parts += ['<h3>' + esc(dispositions[issue['disposition']] + ': ' + issue['question']) + '</h3>',
                  paragraph(issue['reason'] + ' Ansvarig: ' + issue['owner'] + '. ' + impacts[issue['impact']] + '.'),
                  paragraph('Tidigare omfattning: ' + issue['previous_scope']) if issue['previous_scope'] else '']
    if not snapshot['issues']:
        parts += [paragraph('Inga särskilda frågor är registrerade. Detta bevisar inte att underlaget är fullständigt i verkligheten.')]
    size = search_size(p)
    budget = snapshot['execution']['max_cells']
    parts += [paragraph('Körbudget: högst ' + str(budget) + ' av ' + str(size['cells']) + ' kombinationer av plan och scenario. ' +
                        ('Alla alternativ ryms inte i budgeten. Okörda alternativ har okända resultat.' if budget < size['cells'] else
                         'Alla kombinationer ryms, men avbrott och körgränser kan ändå lämna okända resultat.'))]
    parts += [paragraph('Domänansvarig granskar modellen och kunden bekräftar beskrivningen av verksamheten. Bekräftelserna gäller exakt denna version. '
                        'Ändringar kräver ny prepare, ny granskning och nya bekräftelser. Namn och hashvärden autentiserar inte personer eller faktiska svar.'), '</main>']
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
              paragraph('Presentationsformat: ' + VERSION + '. Snapshot: ' + digest(snapshot)),
              table(['Klassificeringsfält', 'Värde'], sorted(snapshot['classification'].items())),
              '<h3>Manuellt angivna namn</h3>', table(['Exakt modellkoppling', 'Namn som visas'], sorted(labels.items()))]
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
    for key, title in [('assumptions', 'Antaganden med exakta kopplingar'), ('issues', 'Frågor och dispositioner'),
                       ('controls', 'Kontrollfall'), ('evidence', 'Bevarade källor'), ('execution', 'Exakta körgränser')]:
        # Keep quotes only in collected source material and the required full snapshot.
        data = json.loads(raw(snapshot[key]))
        if key == 'issues':
            for issue in data:
                issue['refs'] = ['Källutdrag ' + str(numbered[raw(r)]) for r in issue['refs']]
        parts += ['<h3>' + title + '</h3>', table(['Kodfält', 'Exakt värde / hänvisning'], [(k, raw(v)) for k, v in leaves(data).items()])]
    parts += ['<details><summary>Full snapshot och registrerad implementation</summary><pre>',
              esc(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, indent=2)), '</pre></details></details></body></html>\n']
    return '\n'.join(parts).encode('utf-8')
