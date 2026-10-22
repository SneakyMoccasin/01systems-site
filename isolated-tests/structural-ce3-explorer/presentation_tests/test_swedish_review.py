"""Concrete language and binding tests; no alternative replay implementation."""
from copy import deepcopy
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'pilot_examples'), str(ROOT / 'pilot_review_tests')]
import pilot_contract as C
import pilot_runner as P
import pilot_presentation as H
from bridge import read_bundle, write_bundle, digest
from example import draft_fixture, fabricated_receipts
from test_pilot_v2_review_regressions import draft_at


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.depth = 0
        self.visible = []
        self.all_text = []
        self.details = []
        self.ids = set()
        self.links = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'details':
            self.depth += 1
            self.details.append(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.links.append(attrs['href'])

    def handle_endtag(self, tag):
        if tag == 'details':
            self.depth -= 1

    def handle_data(self, data):
        self.all_text.append(data)
        if self.depth == 0:
            self.visible.append(data)


class SwedishReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        cls.draft = draft_fixture(cls.root / 'draft')
        P.prepare(cls.draft, cls.root / 'draft/materials', cls.root / 'prepared')
        cls.snapshot = read_bundle(cls.root / 'prepared/snapshot.json')
        cls.receipts = fabricated_receipts(cls.root / 'prepared')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def page(self, snapshot=None):
        return C.presentation(snapshot or self.snapshot).decode()

    def direct(self, snapshot=None):
        return ' '.join(Page(self.page(snapshot)).visible)

    def test_three_levels_values_and_trace_links(self):
        page = Page(self.page())
        visible = ' '.join(page.visible)
        for text in ['Det här ska vi undersöka.', 'Så ser läget ut från början.',
                     'Det här kan ni besluta.', 'Det här måste vara uppfyllt.',
                     'Tider och viktiga besked.', 'Det här räknas som att målet är nått.',
                     'Det här antar vi.', 'Det här ingår inte i analysen.',
                     'Det här behöver ni kontrollera före bekräftelse.',
                     'FABRICERAD ÖVNING', 'inte ett analysresultat',
                     'Förberedelsen är klar: nej', 'Leveransen är klar: nej',
                     'Säkerhetsvillkoret är uppfyllt: ja', 'Externt besked: Väntar på besked',
                     'inlagt vid 0 övningssteg, ska hanteras vid 1 övningssteg',
                     'till och med 2 övningssteg: ”Leveransen är klar” är ja',
                     'till och med 5 övningssteg: ”Säkerhetsvillkoret är uppfyllt” är ja',
                     'Antaganden: antagande 1', 'Olöst fråga: Vilken väg är bäst?',
                     'ingen slutsats om fysisk genomförbarhet får dras']:
            self.assertIn(text, visible)
        for technical in ['/model/', 'sha256', digest(self.snapshot), 'Full snapshot', 'schema_version']:
            self.assertNotIn(technical, visible)
        self.assertEqual(len(page.details), 3)
        self.assertTrue(all('open' not in x for x in page.details))
        self.assertEqual(page.details[:2], [{'id': 'analysis-method'}, {'id': 'technical'}])
        self.assertTrue(all(link.startswith('#') and link[1:] in page.ids for link in page.links))
        self.assertNotIn('Namn saknas', visible)
        self.assertNotIn('overflow-wrap:anywhere}table', self.page())
        # Long quotes appear once as collected evidence, once per original ref in Full snapshot only.
        before_full = self.page().split('<summary>Full snapshot')[0]
        self.assertEqual(before_full.count('Detta är underlag för kontraktstest, inte källbevis.'), 1)

    def test_changed_rules_change_the_corresponding_swedish_sentence(self):
        mutations = [
            (lambda s: s['problem']['model']['decisions']['N']['requires'][0].update(value=False),
             'Leverera efter förberedelse: ”Förberedelsen är klar” är nej.'),
            (lambda s: s['problem']['model']['decisions']['P']['effects']['set'].update(prepared=False),
             'Om beslutet genomförs: ”Förberedelsen är klar” blir nej.'),
            (lambda s: s['problem']['model']['initial'].update(done=True), 'Leveransen är klar: ja.'),
            (lambda s: s['problem']['model']['initial_events'][0].update(due=3), 'ska hanteras vid 3 övningssteg'),
            (lambda s: s['problem']['observation']['all'][1].update(deadline=4),
             'till och med 4 övningssteg: ”Leveransen är klar” är ja.'),
            (lambda s: s['problem']['scenario_set']['members'][0]['outcomes'].update(response='rejected'),
             'Godkänt besked: Externt leveransbesked → Avslag'),
            (lambda s: s['problem']['search']['choice_groups'][0].update(kind='at_most_one'),
             'Högst ett av följande beslut får ingå:'),
            (lambda s: s['execution'].update(max_cells=2), 'Alla alternativ ryms inte i budgeten.')]
        for mutate, sentence in mutations:
            with self.subTest(sentence=sentence):
                changed = deepcopy(self.snapshot)
                mutate(changed)
                C.validate_content(changed, self.root / 'prepared/materials')
                self.assertIn(sentence, self.direct(changed))
                self.assertNotIn(sentence, self.direct())
                self.assertNotEqual(C.presentation(changed), C.presentation(self.snapshot))

    def test_strict_versioned_names_and_missing_name_fallback(self):
        for mutation in [lambda d: d['presentation'].update(schema_version='ce3-pilot-presentation/99'),
                         lambda d: d['presentation']['labels'].update({'/model/initial/done': 'we are done'}),
                         lambda d: d['presentation']['labels'].update({'/model/decisions/N': 'Förbered leverans'}),
                         lambda d: d['presentation']['labels'].update({'/model/decisions/N': ''})]:
            changed = deepcopy(self.draft)
            mutation(changed)
            with self.assertRaises(ValueError):
                C.validate_content(changed, self.root / 'draft/materials')
        changed = deepcopy(self.snapshot)
        del changed['presentation']['labels']['/model/decisions/N']
        self.assertIn('Namn saknas: ”N”', self.direct(changed))
        self.assertIn('Begripliga namn saknas för 1 delar', self.direct(changed))

    def test_determinism_and_html_escaping_every_authored_surface(self):
        changed = deepcopy(self.snapshot)
        attack = '<script>alert("å&😀")</script>'
        changed['presentation']['labels']['/model/decisions/P'] = attack
        changed['analysis']['question'] = attack
        changed['assumptions'][0]['statement'] = attack
        changed['issues'][0]['question'] = attack
        changed['evidence'][0]['title'] = attack
        changed['mapping'][0]['refs'][0]['quote'] = attack
        html = self.page(changed)
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertEqual(html, self.page(json.loads(json.dumps(changed, sort_keys=True))))
        self.assertNotIn(' open', html)

    def test_names_new_version_and_rules_invalidate_receipts(self):
        for i, mutate in enumerate([
                lambda s: s['presentation']['labels'].update({'/model/decisions/P': 'Förbered inför leverans'}),
                lambda s: s['problem']['model']['decisions']['N']['requires'][0].update(value=False)]):
            changed = deepcopy(self.snapshot)
            mutate(changed)
            shown = C.presentation(changed)
            case = dict(schema_version='ce3-pilot-case/2', snapshot=changed,
                        classification=changed['classification'], receipts=self.receipts,
                        presentation_sha256=hashlib.sha256(shown).hexdigest())
            with self.assertRaises(ValueError):
                C.validate_case(case, self.root / 'prepared/materials', shown)
        old = deepcopy(self.draft)
        old['schema_version'] = 'ce3-pilot-draft/2'
        del old['presentation']
        with self.assertRaises(ValueError):
            P.prepare(old, self.root / 'draft/materials', self.root / 'old-upgrade')
        self.assertFalse((self.root / 'old-upgrade').exists())
        old_snapshot = deepcopy(self.snapshot)
        old_snapshot['schema_version'] = 'ce3-pilot-snapshot/2'
        with self.assertRaises(ValueError):
            C.presentation(old_snapshot)

    def test_another_model_costs_addition_scheduling_and_domains(self):
        directory = self.root / 'resource-case'
        draft = draft_at(directory)
        m = draft['problem']['model']
        m['domains']['credits'] = {'integer': [0, 12]}
        m['domains']['count'] = {'integer': [0, 6]}
        m['initial'].update(credits=10, count=1)
        m['budget'] = {'field': 'credits'}
        m['decisions']['A']['cost'] = 3
        m['decisions']['B']['cost'] = 2
        m['decisions']['A']['requires'] = [{'field': 'count', 'op': 'ge', 'value': 1}]
        m['decisions']['A']['effects']['add'] = {'count': 2}
        m['decisions']['A']['schedule'] = {'event': 'E2', 'delay': 1}
        m['initial_events'] = m['initial_events'][:1]
        m['events']['E2']['outcomes']['noop']['add'] = {'count': -1}
        m['metadata']['deadlines'] = [{'event': 'E1', 'last_inclusive_step': -1, 'source': 'test'}]
        labels = {'/model/decisions/A': 'Förbered', '/model/decisions/B': 'Slutför',
                  '/model/domains/credits': 'Budget i poäng', '/model/domains/count': 'Antal',
                  '/model/events/E1': 'Första tidsgränsen', '/model/events/E2': 'Efterarbete',
                  '/model/events/E2/outcomes/noop': 'Avdrag', '/model/clock/unit': 'teststeg'}
        draft['presentation']['labels'] = labels
        # New model leaves are explicitly sourced to a new fabricated note; no source-truth claim.
        note = directory / 'materials/note.txt'
        text = note.read_text() + '\nFabricerat resursfall: budget 10 poäng, A kostar 3, B kostar 2. Antal 1 inom 0..6; A kräver minst 1 och adderar 2. A schemalägger E2 ett steg senare; E2 drar bort 1. Budgetdomän 0..12. E1 vid 0 har sista tid -1.\n'
        note.write_text(text)
        descriptor = C.descriptor(directory / 'materials', 'note.txt')
        draft['evidence'][0].update(original=descriptor, extract=descriptor)
        for mapping in draft['mapping']:
            section = mapping['targets'][0].split('/')[1]
            mapping['targets'] = list(C.leaves(draft['problem'][section], '/' + section))
            mapping['refs'][0].update(start=0, end=len(text), quote=text)
        P.prepare(draft, directory / 'materials', directory / 'prepared')
        snapshot = read_bundle(directory / 'prepared/snapshot.json')
        visible = self.direct(snapshot)
        for sentence in ['Budget i poäng: 10. Tillåtna värden: från 0 till 12',
                         'Regelkostnad: 3. Dras från Budget i poäng',
                         'Förbered: ”Antal” är minst 1; Budget i poäng måste räcka till regelkostnaden 3',
                         '”Antal” ökar med 2', '”Antal” minskar med 1',
                         'Schemalägger Efterarbete med fördröjning 1 teststeg',
                         'Angiven sista tid före Första tidsgränsen: -1 teststeg']:
            self.assertIn(sentence, visible)
        receipts = fabricated_receipts(directory / 'prepared')
        P.freeze(directory / 'prepared', receipts, directory / 'frozen', directory / 'anchor.json')
        result = P.run(directory / 'frozen', directory / 'anchor.json', directory / 'run')
        self.assertEqual(result['search_coverage']['status'], 'COMPLETE')
        self.assertEqual([x['order'] for x in result['goal_status'] if x['robust'] == 'TRUE'], [['A', 'B']])
        self.assertEqual(P.verify(directory / 'run', directory / 'anchor.json'), result)

    def test_prefix_empty_budget_and_no_ranking_explanation(self):
        snapshot = deepcopy(self.snapshot)
        s = snapshot['problem']['search']
        s.update(required_decision_ids=[], optional_decision_ids=['P', 'N', 'U'], allow_empty=True)
        s['choice_groups'][0]['kind'] = 'at_most_one'
        snapshot['execution']['max_cells'] = 1
        for mapping in snapshot['mapping']:
            if all(t.startswith('/search/') for t in mapping['targets']):
                mapping['targets'] = list(C.leaves(s, '/search'))
        C.validate_content(snapshot, self.root / 'prepared/materials')
        html = self.page(snapshot)
        for text in ['Tom plan: ingår i sökningen.', 'Tom plan: inga beslutsförsök.',
                     'Förbered leverans vid 0 övningssteg', 'de första tidsplatserna',
                     'tidigarelägga andra beslut', 'Inga nya försök', 'Samma fasta plan',
                     'okända resultat, inte ett nej', 'ingen ranking eller sannolikhet',
                     '60 sekunder per replay-/auditprocess', 'utanför batchens max_cells-budget',
                     'Ingen total väggklocksgaranti finns']:
            self.assertIn(text, html)
        self.assertIn('Körbudgeten tillåter högst 1 av 24 kombinationer.', html)


if __name__ == '__main__':
    unittest.main()
