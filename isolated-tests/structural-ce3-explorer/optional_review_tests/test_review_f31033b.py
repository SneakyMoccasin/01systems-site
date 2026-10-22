"""Independent review of f31033b: recursive word oracle and direct CLI inputs.

No delivered test helpers or expected fixture are used to derive answers.
Only this file and the accompanying review report are review changes.
"""
from collections import Counter
from contextlib import ExitStack
from copy import deepcopy
from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import bridge
import contracts as single
import scenario_contracts as sc
import scenario_runner as sr
import selection
import observe
import core.replay as replay

SOURCE = 'CE3 selected fixed plan: one attempt per selected decision, prefix slots.'


def load(path):
    return bridge.read_bundle(path)


def save(value, path):
    bridge.write_bundle(value, path)


def h(value):
    """Independent implementation of the declared JSON/LF hash, not bridge.digest."""
    return hashlib.sha256((json.dumps(value, sort_keys=True, separators=(',', ':'),
                                     ensure_ascii=False) + '\n').encode()).hexdigest()


def fixture():
    return load(ROOT / 'fixtures/optional-decisions-problem.json')


def words(p):
    """DFS of all distinct words, accepting each prefix by direct set predicates.

    No product, permutations, bitmask, factoradic decoder, production count,
    candidate constructor, or materializer is used as the expected answer.
    """
    s = p['search']
    found = []

    def visit(word, unused):
        chosen = set(word)
        if ((word or s['allow_empty']) and set(s['required_decision_ids']) <= chosen
                and all(len(chosen.intersection(g['members'])) in
                        ({1} if g['kind'] == 'exactly_one' else {0, 1})
                        for g in s['choice_groups'])):
            found.append(tuple(word))
        for name in unused:
            visit(word + [name], [x for x in unused if x != name])

    visit([], sorted(p['model']['decisions']))
    return sorted(found, key=lambda w: (len(w), w))


def full_input(p, word, scenario, times=None):
    """Build the entire replay envelope directly, without production helpers."""
    slots = p['search']['slots'] if times is None else times
    return {'schema_version': 'ce3-run/1', 'profile': 'fixed-replay/0.1',
            'model': deepcopy(p['model']), 'sources': deepcopy(p['sources']),
            'outcomes': deepcopy(scenario['outcomes']),
            'script': {'schema_version': 'ce3-script/1', 'source': SOURCE,
                       'steps': {str(slots[i]): [{'decision': d, 'mode': 'attempt'}]
                                 for i, d in enumerate(word)}}}


def fixture_answer(word, label):
    """Rule-derived acceptance, independently written before reading saved facit.

    P prepares; N needs P; U needs P and approved response at time >=1;
    X needs completed delivery. Delivery must happen by 2. Safety never changes.
    """
    prepared = done = False
    accepted = []
    done_time = None
    for t, d in zip([0, 2, 4], word):
        ok = (d == 'P' or (d == 'N' and prepared) or
              (d == 'U' and prepared and label == 'approved' and t >= 1) or
              (d == 'X' and done))
        accepted.append(ok)
        if ok and d == 'P':
            prepared = True
        if ok and d in ('N', 'U'):
            done = True
            done_time = t
    return all(accepted) and done and done_time <= 2


def tiny(n=2, required=(), groups=(), empty=True, scenarios=1):
    p = fixture()
    names = [chr(65+i) for i in range(n)]
    p['model'].update(decisions={d: {'requires': [], 'effects': {'set': {}, 'add': {}},
                                       'cost': 0, 'schedule': None, 'source': 'Review no-op'}
                                  for d in names}, events={}, initial_events=[], reference_event_order=[])
    p['model']['clock']['horizon'] = max(5, n)
    p['search'].update(required_decision_ids=list(required),
                       optional_decision_ids=[d for d in names if d not in required],
                       choice_groups=deepcopy(list(groups)), allow_empty=empty)
    grouped = {d for g in groups for d in g['members']}
    p['search']['slots'] = list(range(n - len(grouped) + len(groups)))
    p['observation']['all'] = [{'id': 'safe', 'operator': 'terminal', 'equals': {'safe': True}}]
    p['scenario_set']['members'] = [{'label': 's'+str(i), 'outcomes': {}} for i in range(scenarios)]
    return p


def timer(p, name, due, field, value, requires=None):
    m = p['model']
    m['events'][name] = {'kind': 'timer', 'requires': requires or [], 'absent': None,
                        'outcomes': {'apply': {'set': {field: value}, 'add': {}}},
                        'source': 'Review initial timer'}
    m['initial_events'].append({'id': name, 'due': due, 'scheduled_at': m['clock']['start']})
    m['reference_event_order'].append(name)


def tree(path):
    return {str(f.relative_to(path)): (hashlib.sha256(f.read_bytes()).hexdigest(), f.stat().st_mtime_ns)
            for f in path.rglob('*') if f.is_file()}


class OptionalIndependentReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='ce3-independent-f31033b-')
        cls.base = Path(cls.tmp.name)
        cls.p = fixture()
        cls.oracle_words = words(cls.p)
        cls.answers = {(w, s['label']): fixture_answer(w, s['label'])
                       for w in cls.oracle_words for s in cls.p['scenario_set']['members']}
        assert len(cls.oracle_words) == 16 and sum(cls.answers.values()) == 8
        assert {w for w in cls.oracle_words if all(cls.answers[w, s['label']]
                 for s in cls.p['scenario_set']['members'])} == {tuple('PN'), tuple('PNX')}
        # The independently derived table exists before any saved expected file is read.
        save([{'word': list(w), 'scenario': s, 'goal': v} for (w, s), v in cls.answers.items()],
             cls.base / 'rule-derived-oracle.json')
        cls.frozen = cls.base / 'frozen'
        cls.full = cls.base / 'full'
        cls.cli('freeze', '--problem', ROOT/'fixtures/optional-decisions-problem.json', '--output', cls.frozen)
        cls.cli('run', '--problem', ROOT/'fixtures/optional-decisions-problem.json',
                '--manifest', cls.frozen/'manifest.json', '--pins', cls.frozen/'pins.json', '--output', cls.full)
        cls.cli('verify', '--pins', cls.frozen/'pins.json', '--output', cls.full)
        cls.manifest = load(cls.frozen/'manifest.json')
        cls.pins = load(cls.frozen/'pins.json')
        cls.result = load(cls.full/'result.json')

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    @classmethod
    def cli(cls, *args, code=0):
        result = subprocess.run([sys.executable, '-B', str(ROOT/'scenario_runner.py'), *map(str, args)],
                                capture_output=True, text=True)
        if result.returncode != code:
            raise AssertionError((result.returncode, result.stdout, result.stderr))
        return result

    def setUp(self):
        self.directory = self.base/self._testMethodName
        self.directory.mkdir()
        self.serial = 0

    def dest(self):
        self.serial += 1
        return self.directory/str(self.serial)

    def clone(self):
        dest = self.dest()
        shutil.copytree(self.full, dest)
        return dest

    def direct_cli(self, value):
        d = self.dest()
        d.mkdir()
        save(value, d/'input.json')
        for command, args in [('replay', ['--input', d/'input.json', '--output', d/'history.json.gz']),
                              ('audit', ['--history', d/'history.json.gz', '--trusted-input', d/'input.json',
                                         '--output', d/'audit.json'])]:
            result = subprocess.run([sys.executable, '-B', str(ROOT.parent/'structural-ce3-replay/cli.py'),
                                     command, *map(str, args)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
        bundle, audit = load(d/'history.json.gz'), load(d/'audit.json')
        self.assertEqual(audit['status'], 'PASS')
        self.assertTrue(audit['verified'] and audit['all_event_permutations'])
        return bundle, audit

    def execute(self, p, **kwargs):
        manifest, pins = sc.freeze(p)
        d = self.dest()
        result = sr.run(p, manifest, pins, d, **kwargs)
        self.assertEqual(self.verify(d, pins), result)
        return d, result, pins

    def verify(self, d, pins=None):
        before = tree(d)
        with ExitStack() as stack:
            for module, name in [(sr, 'cli_process'), (subprocess, 'run'), (replay, 'replay'),
                                  (sr, 'write_bundle'), (Path, 'write_text'), (Path, 'write_bytes')]:
                stack.enter_context(patch.object(module, name, side_effect=AssertionError('verify side effect')))
            result = sr.verify(d, self.pins if pins is None else pins)
        self.assertEqual(before, tree(d))
        return result

    def projection(self, d, c):
        return load(d/'runs'/c['cell_id']/'observation.json')['projection']

    def rehash(self, d, manifest=None, budget=None):
        """Rebind all outer records; external pins are deliberately also supplied anew.

        An attacker replacing pins cannot authorize an incomplete domain of the
        unchanged declaration. Result is untrusted, but its digest is repaired too.
        """
        spec = load(d/'batch.json')
        if manifest is not None:
            save(manifest, d/'manifest.json')
            pins = load(d/'pins.json')
            pins.update(problem_id=manifest['problem_id'], manifest_id=h(manifest))
            save(pins, d/'pins.json')
            spec.update(problem_id=manifest['problem_id'], manifest_id=h(manifest),
                        search_size=manifest['search_size'])
        if budget is not None:
            spec['max_cells'] = budget
        save(spec, d/'batch.json')
        attempt = load(d/'attempt.json')
        attempt['batch_spec_id'] = h(spec)
        save(attempt, d/'attempt.json')
        for directory in (d/'runs').iterdir():
            for filename in ['started.json', 'record.json']:
                file = directory/filename
                if not file.exists():
                    continue
                record = load(file)
                record['batch_spec_id'] = h(spec)
                if filename == 'record.json':
                    obs = load(directory/'observation.json')
                    obs['batch_spec_id'] = h(spec)
                    save(obs, directory/'observation.json')
                    record['observation_id'] = h(obs)
                save(record, file)
        result = load(d/'result.json')
        result.update(batch_spec_id=h(spec), manifest_id=spec['manifest_id'], search_size=spec['search_size'])
        if manifest is not None:
            keep = {c['cell_id'] for c in manifest['cells']}
            result['cells'] = [c for c in result['cells'] if c['cell_id'] in keep]
            pids = {p['candidate_id'] for p in manifest['candidates']}
            result['candidates'] = [c for c in result['candidates'] if c['candidate_id'] in pids]
            result['cell_coverage'].update(expected=len(keep), certified=len(keep), uncertified=[])
            result['enumeration_coverage'].update(expected=len(keep), observed=len(keep))
            result['candidate_coverage'].update(expected=len(pids), certified_represented=len(pids))
        result.pop('result_id')
        result['result_id'] = h(result)
        save(result, d/'result.json')

    def execution_ids(self):
        mapping = {(tuple(c['order']), c['scenario_label']): c['cell_id'] for c in self.result['cells']}
        return [mapping[w, s['label']] for w in self.oracle_words for s in self.p['scenario_set']['members']]

    def test_01_rule_oracle_full_cli_matrix_and_direct_inputs(self):
        self.assertEqual(self.result['cell_coverage']['status'], 'COMPLETE')
        self.assertEqual(self.result['cell_coverage']['certified'], 48)
        self.assertEqual([tuple(p['order']) for p in self.manifest['candidates']], self.oracle_words)
        self.assertEqual(self.manifest['search_size']['subsets_by_length'], [0, 0, 2, 2])
        saved = load(ROOT/'fixtures/optional-decisions-expected.json')
        self.assertEqual(set(saved['orders']), {''.join(w) for w in self.oracle_words})
        for label, positive in saved['positive'].items():
            self.assertEqual(set(positive), {''.join(w) for w in self.oracle_words if self.answers[w, label]})
        for cell in self.result['cells']:
            w, label = tuple(cell['order']), cell['scenario_label']
            self.assertEqual(cell['goal_satisfied'], self.answers[w, label])
            self.assertEqual(cell['run_status'], 'CERTIFIED')
            scenario = next(s for s in self.p['scenario_set']['members'] if s['label'] == label)
            direct = full_input(self.p, w, scenario)
            self.assertEqual(load(self.full/'runs'/cell['cell_id']/'input.json'), direct)
            self.assertEqual(cell['input_identity'], h(direct))
            # A second ordinary CLI replay/audit of direct full inputs protects
            # shared production materialization, including all 48 cells.
            history, _ = self.direct_cli(direct)
            self.assertEqual(history, load(self.full/'runs'/cell['cell_id']/'history.json.gz'))
            rows = history['paths'][0]['history']
            attempts = [r for r in rows if r['kind'] in ('decision_executed', 'attempt_blocked', 'script_skip')]
            self.assertEqual([(r['step'], r['action'], r['script_position']) for r in attempts],
                             [(t, d, 0) for t, d in zip([0, 2, 4], w)])
            done_by_two = any(r[side]['state']['done'] for r in rows for side in ['before', 'after']
                              if r[side]['step'] <= 2)
            observed = all(r['kind'] == 'decision_executed' for r in attempts) and done_by_two and rows[-1]['after']['state']['done']
            self.assertEqual(observed, self.answers[w, label])
        self.assertEqual({tuple(c['order']) for c in self.result['candidates'] if c['robust'] == 'TRUE'},
                         {tuple('PN'), tuple('PNX')})

    def test_02_new_group_configurations_recursive_oracle_and_route_independence(self):
        groups = [{'id': 'route', 'kind': 'exactly_one', 'members': ['A', 'B', 'C']},
                  {'id': 'extra', 'kind': 'at_most_one', 'members': ['D', 'E']}]
        cases = [tiny(n) for n in range(1, 6)]
        cases += [tiny(6, groups=groups), tiny(6, groups=[dict(g, kind='at_most_one') for g in groups]),
                  tiny(6, required=['F'], groups=groups), tiny(6, groups=groups, empty=False)]
        for p in cases:
            with self.subTest(search=p['search']):
                expected = words(p)
                subsets = Counter(map(len, {frozenset(w) for w in expected}))
                size = selection.search_size(p)
                coefficients = [subsets[k] for k in range(size['max_selected']+1)]
                self.assertEqual(size['subsets_by_length'], coefficients)
                self.assertEqual(size['candidates'], len(expected))
                self.assertEqual(sum(c*math.factorial(k) for k, c in enumerate(coefficients)), len(expected))
                with patch.object(selection, 'expected_orders', side_effect=AssertionError('shared oracle')), \
                     patch.object(selection, 'factorial_orders', side_effect=AssertionError('shared decoder')):
                    self.assertEqual(selection.generated_orders(p), expected)
                with patch.object(selection, 'generated_orders', side_effect=AssertionError('shared generator')), \
                     patch.object(selection, 'permutations', side_effect=AssertionError('shared permutations')), \
                     patch.object(selection, 'product', side_effect=AssertionError('shared product')):
                    self.assertEqual(selection.expected_orders(p), expected)
        p = tiny(6, groups=groups)
        self.assertEqual(selection.search_size(p)['subsets_by_length'], [0, 3, 9, 6])
        self.assertEqual(len(words(p)), 57)
        d, result, _ = self.execute(p)
        self.assertEqual(result['cell_coverage']['certified'], 57)
        self.assertTrue(all(c['goal_satisfied'] for c in result['cells']))
        for c in result['cells']:
            self.assertEqual(load(d/'runs'/c['cell_id']/'input.json'),
                             full_input(p, c['order'], p['scenario_set']['members'][0]))

    def test_03_partition_groups_types_and_selection_are_syntactic(self):
        changes = [lambda s: s['required_decision_ids'].append('N'),
                   lambda s: s['optional_decision_ids'].remove('X'),
                   lambda s: s['optional_decision_ids'].append('Z'),
                   lambda s: s['optional_decision_ids'].append('X'),
                   lambda s: s['choice_groups'].append({'id': 'overlap', 'kind': 'at_most_one', 'members': ['N', 'X']}),
                   lambda s: s['choice_groups'][0].update(members=['P', 'N']),
                   lambda s: s['choice_groups'][0].update(members=['N']),
                   lambda s: s['choice_groups'][0].update(members=['N', 'N']),
                   lambda s: s['choice_groups'][0].update(kind='conditional'),
                   lambda s: s['choice_groups'][0].update(requires=[])]
        for change in changes:
            p = fixture(); change(p['search'])
            with self.assertRaises(ValueError): sc.freeze(p)
        for field in ['allow_empty', 'retry', 'early_stop']:
            for value in [0, 1, 'false', None]:
                p = fixture(); p['search'][field] = value
                with self.assertRaises(ValueError): sc.freeze(p)
        for word in ['', 'P', 'PN U'.replace(' ', ''), 'NNP', 'N', 'PZ']:
            with self.assertRaises(ValueError): selection.candidate(fixture(), list(word))
        p = fixture(); p['search']['allow_empty'] = True
        with self.assertRaises(ValueError): selection.candidate(p, [])
        # Enumerator must not read rules at all: replace values by inaccessible
        # opaque objects; keys/clock/search are enough for both syntactic routes.
        q = fixture(); q['model']['decisions'] = dict.fromkeys(q['model']['decisions'], object())
        self.assertEqual(selection.generated_orders(q), self.oracle_words)
        self.assertEqual(selection.expected_orders(q), self.oracle_words)
        self.assertIn(tuple('UP'), selection.generated_orders(p))

    def test_04_prefix_advancement_changes_goal_without_blocked_confound(self):
        p = tiny(3, required=['A', 'C'], empty=False)
        p['search']['slots'] = [0, 2, 4]
        p['model']['decisions']['C']['effects']['set'] = {'done': True}
        p['observation']['all'] = [{'id': 'early', 'operator': 'reach_by', 'equals': {'done': True}, 'deadline': 2}]
        scenario = p['scenario_set']['members'][0]
        for word, expected in [('AC', True), ('ABC', False)]:
            value = full_input(p, word, scenario)
            bundle, audit = self.direct_cli(value)
            obs = observe.observe(sc.effective_problem(p, scenario), bundle, value, audit, 'r', 'b')
            self.assertTrue(obs['all_attempts_accepted'])
            self.assertEqual(obs['goal_satisfied'], expected)
            self.assertEqual(selection.candidate(p, list(word))['script'], value['script'])
            self.assertEqual(len(value['script']['steps']), len(word))
        delayed = full_input(p, 'AC', scenario, times=[0, 4])
        bundle, _ = self.direct_cli(delayed)
        self.assertFalse(any(r[side]['state']['done'] for r in bundle['paths'][0]['history']
                             for side in ['before', 'after'] if r[side]['step'] <= 2))
        with self.assertRaises(ValueError): selection.script_evidence(p, delayed['script'])
        unused = full_input(p, 'AC', scenario)['script']; unused['steps']['4'] = []
        with self.assertRaises(ValueError): selection.script_evidence(p, unused)

    def test_05_exact_attempt_decision_time_order_position_and_blocking(self):
        cell = next(c for c in self.result['cells'] if c['order'] == list('PNX'))
        rows = load(self.full/'runs'/cell['cell_id']/'history.json.gz')['paths'][0]['history']
        evidence = selection.script_evidence(self.p, full_input(self.p, 'PNX', self.p['scenario_set']['members'][0])['script'])
        self.assertTrue(selection.accepted_attempts(evidence, rows))
        mutations = [('action', 'U'), ('step', 1), ('script_position', 1)]
        for key, value in mutations:
            bad = deepcopy(rows); next(r for r in bad if r['kind'] == 'decision_executed')[key] = value
            with self.assertRaises(ValueError): selection.accepted_attempts(evidence, bad)
        attempts = [r for r in rows if r['kind'] == 'decision_executed']
        for bad in [list(reversed(attempts)), attempts[:-1], attempts+[attempts[0]]]:
            with self.assertRaises(ValueError): selection.accepted_attempts(evidence, bad)
        for kind in ['attempt_blocked', 'script_skip']:
            bad = deepcopy(rows); next(r for r in bad if r['kind'] == 'decision_executed')['kind'] = kind
            self.assertFalse(selection.accepted_attempts(evidence, bad))
        p = tiny(2, required=['A'], empty=False)
        p['model']['decisions']['B']['requires'] = [{'field': 'done', 'op': 'eq', 'value': True}]
        _, result, _ = self.execute(p)
        self.assertTrue(next(c['goal_satisfied'] for c in result['cells'] if c['order'] == ['A']))
        self.assertTrue(all(c['goal_satisfied'] is False for c in result['cells'] if 'B' in c['order']))
        self.assertTrue(all(c['run_status'] == 'CERTIFIED' for c in result['cells']))

    def test_06_operational_audit_pass_cannot_authorize_invalid_selection(self):
        scenario = self.p['scenario_set']['members'][0]
        for word in ['', 'P', 'N', 'PUN']:
            value = full_input(self.p, word, scenario)
            bundle, audit = self.direct_cli(value)
            with self.assertRaises(ValueError):
                observe.observe(sc.effective_problem(self.p, scenario), bundle, value, audit, 'r', 'b')

    def test_07_empty_full_horizon_initial_witness_and_all_event_orders(self):
        p = tiny(1)
        p['model']['initial']['done'] = True
        timer(p, 'drop', 5, 'done', False)
        timer(p, 'restore', 5, 'done', True)
        p['observation']['all'] = [
            {'id': 'terminal', 'operator': 'terminal', 'equals': {'done': True}},
            {'id': 'initial', 'operator': 'reach_by', 'equals': {'done': True}, 'deadline': 0},
            {'id': 'continuous', 'operator': 'always', 'equals': {'done': True}, 'through': 5}]
        d, result, pins = self.execute(p)
        empty = next(c for c in result['cells'] if not c['order'])
        self.assertEqual(empty['event_path_coverage']['audited_paths'], 2)
        obs = self.projection(d, empty)
        self.assertTrue(obs['all_attempts_accepted'])
        self.assertFalse(obs['goal_satisfied'])
        self.assertEqual(sorted(path['components'][0]['satisfied'] for path in obs['paths']), [False, True])
        for path in obs['paths']:
            self.assertTrue(path['components'][1]['satisfied'])
            self.assertFalse(path['components'][2]['satisfied'])
            self.assertEqual(path['components'][1]['evidence']['witness']['step'], 0)
            self.assertEqual(path['components'][1]['evidence']['witness']['side'], 'before')
        value = full_input(p, [], p['scenario_set']['members'][0])
        bundle, _ = self.direct_cli(value)
        self.assertEqual(bundle, load(d/'runs'/empty['cell_id']/'history.json.gz'))
        self.assertTrue(all(path['history'][-1]['after']['step'] == 5 for path in bundle['paths']))
        # Rehash after removing a complete path, including fresh stored audit if
        # possible. Independent coverage must fail before goal projection.
        directory = d/'runs'/empty['cell_id']
        bundle['paths'] = [path for path in bundle['paths'] if path['snapshot']['state']['done']]
        save(bundle, directory/'history.json.gz')
        record = load(directory/'record.json'); record.update(sr.artifact_record({}, directory)); save(record, directory/'record.json')
        changed = self.verify(d, pins)
        self.assertIsNone(next(c['goal_satisfied'] for c in changed['cells'] if not c['order']))

    def test_08_full_model_outcomes_and_unused_rules_remain_bound(self):
        p = fixture()
        p['model']['initial_events'] = []
        p['model']['decisions']['X']['requires'] = []
        p['model']['decisions']['X']['schedule'] = {'event': 'response', 'delay': 1}
        value = full_input(p, 'PN', p['scenario_set']['members'][0])
        bundle, _ = self.direct_cli(value)
        self.assertEqual(bundle['paths'][0]['unused_outcomes'], ['response'])
        manifest, _ = sc.freeze(p)
        plan = next(c for c in manifest['candidates'] if c['order'] == list('PN'))
        for scenario in manifest['scenarios']:
            actual = sc.materialize(p, plan, scenario)
            self.assertEqual(actual, full_input(p, 'PN', scenario['definition']))
            self.assertEqual(actual['model'], p['model'])
            self.assertEqual(actual['script'], value['script'])
        bad = deepcopy(p); bad['scenario_set']['members'][0]['outcomes'] = {}
        with self.assertRaises(ValueError): sc.freeze(bad)
        bad = deepcopy(p); bad['model']['decisions']['X']['effects']['set']['unknown'] = True
        with self.assertRaises(ValueError): sc.freeze(bad)

    def test_09_canonical_sets_and_changed_identity_contract(self):
        groups = [{'id': 'z', 'kind': 'exactly_one', 'members': ['B', 'C']},
                  {'id': 'a', 'kind': 'at_most_one', 'members': ['D', 'E']}]
        p = tiny(6, required=['A', 'F'], groups=groups)
        q = deepcopy(p)
        for key in ['required_decision_ids', 'optional_decision_ids', 'choice_groups']: q['search'][key].reverse()
        for g in q['search']['choice_groups']: g['members'].reverse()
        self.assertEqual(sc.search_identity(p), sc.search_identity(q))
        self.assertEqual(words(p), words(q))
        for w in words(p): self.assertEqual(sc.candidate(p, w), sc.candidate(q, w))
        self.assertNotEqual(sc.freeze(p)[1], sc.freeze(q)[1])
        for key in ['allow_empty', 'kind']:
            p = fixture(); q = deepcopy(p)
            if key == 'kind': q['search']['choice_groups'][0]['kind'] = 'at_most_one'
            else: q['search']['allow_empty'] = True
            a, b = sc.candidate(p, list('PN')), sc.candidate(q, list('PN'))
            self.assertNotEqual(a['candidate_id'], b['candidate_id'])
            self.assertNotEqual(a['selection_definition_id'], b['selection_definition_id'])
            self.assertEqual(a['plan_id'], b['plan_id'])
            self.assertNotEqual(sc.freeze(p)[1], sc.freeze(q)[1])

    def test_10_rehashed_selection_evidence_and_candidate_payload(self):
        cell = next(c for c in self.result['cells'] if c['order'] == list('PN'))
        mutations = [lambda e: e.update(selected_ids=['P', 'N', 'X']),
                     lambda e: e.update(omitted_ids=[]),
                     lambda e: e.update(required_ids=[]),
                     lambda e: e.update(selection_satisfied=False),
                     lambda e: e['groups'][0].update(kind='at_most_one'),
                     lambda e: e['expected_entries'].pop(),
                     lambda e: e['expected_entries'].reverse(),
                     lambda e: e.update(selection_definition_id='0'*64)]
        for mutate in mutations:
            d = self.clone(); directory = d/'runs'/cell['cell_id']
            obs = load(directory/'observation.json'); mutate(obs['projection']['selection_evidence'])
            save(obs, directory/'observation.json')
            record = load(directory/'record.json'); record['observation_id'] = h(obs); save(record, directory/'record.json')
            result = self.verify(d)
            bad = next(c for c in result['cells'] if c['cell_id'] == cell['cell_id'])
            self.assertIsNone(bad['goal_satisfied'])
            self.assertIn('Observation mismatch', bad['reason'])
            self.assertEqual(result['cell_coverage']['certified'], 47)
        for field, value in [('selected_ids', ['P']), ('omitted_ids', []), ('order', list('PNX'))]:
            d = self.clone(); manifest = load(d/'manifest.json')
            plan = next(c for c in manifest['candidates'] if c['order'] == list('PN')); plan[field] = value
            self.rehash(d, manifest=manifest)
            with self.assertRaises(ValueError): self.verify(d, load(d/'pins.json'))
        for field in ['allow_empty', 'kind']:
            d = self.clone(); manifest = load(d/'manifest.json')
            definition = manifest['selection_definition']
            if field == 'kind': definition['choice_groups'][0]['kind'] = 'at_most_one'
            else: definition['allow_empty'] = True
            manifest['selection_definition_id'] = h(definition)
            for plan in manifest['candidates']: plan['selection_definition_id'] = h(definition)
            self.rehash(d, manifest=manifest)
            with self.assertRaises(ValueError): self.verify(d, load(d/'pins.json'))

    def test_11_whole_selection_deleted_with_consistent_rehash(self):
        d = self.clone(); manifest = load(d/'manifest.json')
        deleted = {p['candidate_id'] for p in manifest['candidates'] if set(p['order']) == set('PN')}
        gone = {c['cell_id'] for c in manifest['cells'] if c['candidate_id'] in deleted}
        self.assertEqual(len(gone), 6)
        manifest['candidates'] = [p for p in manifest['candidates'] if p['candidate_id'] not in deleted]
        manifest['cells'] = [c for c in manifest['cells'] if c['cell_id'] not in gone]
        manifest['search_size'].update(subsets_by_length=[0, 0, 1, 2], candidates=14, cells=42)
        enum = [c for c in load(d/'enumeration.json') if c['cell_id'] not in gone]
        save(enum, d/'enumeration.json')
        for key in gone: shutil.rmtree(d/'runs'/key)
        self.rehash(d, manifest=manifest, budget=42)
        self.assertEqual(sc.check_population(manifest, enum)['status'], 'COMPLETE')
        with self.assertRaisesRegex(ValueError, 'Trusted problem/manifest'):
            self.verify(d, load(d/'pins.json'))
        self.cli('verify', '--output', d, '--pins', d/'pins.json', code=1)

    def test_12_count_preserving_duplicates_miswired_cells_and_scenario_script_swap(self):
        for kind in ['duplicate', 'wire']:
            d = self.clone(); enum = load(d/'enumeration.json')
            if kind == 'duplicate': enum[-1] = deepcopy(enum[0])
            else:
                enum[0]['candidate_id'] = enum[-1]['candidate_id']
                payload = {k: v for k, v in enum[0].items() if k != 'cell_id'}
                enum[0]['cell_id'] = h(payload)
            save(enum, d/'enumeration.json')
            result = self.verify(d)
            self.assertEqual(len(enum), 48)
            self.assertEqual(result['cell_coverage']['status'], 'INVALID')
            self.assertEqual(result['cell_coverage']['certified'], 48)
        d = self.clone()
        target = next(c for c in self.result['cells'] if c['order'] == list('PN') and c['scenario_label'] == 'rejected')
        directory = d/'runs'/target['cell_id']
        value = full_input(self.p, 'PU', self.p['scenario_set']['members'][1])
        bundle, audit = self.direct_cli(value)
        save(value, directory/'input.json'); save(bundle, directory/'history.json.gz'); save(audit, directory/'audit.json')
        record = load(directory/'record.json'); record.update(sr.artifact_record({}, directory)); save(record, directory/'record.json')
        result = self.verify(d)
        self.assertEqual(result['cell_coverage']['certified'], 47)
        bad = next(c for c in result['cells'] if c['cell_id'] == target['cell_id'])
        self.assertIsNone(bad['goal_satisfied'])
        self.assertIn('Stored input differs from cell', bad['reason'])

    def test_13_length_boundary_budget_and_independent_enumeration_order(self):
        ids = self.execution_ids()
        self.assertEqual([''.join(w) for w in self.oracle_words[:5]], ['NP', 'PN', 'PU', 'UP', 'NPX'])
        for budget in [0, 11, 12, 13]:
            d = self.clone()
            for directory in (d/'runs').iterdir():
                if directory.name not in ids[:budget]: shutil.rmtree(directory)
            self.rehash(d, budget=budget)
            enum = load(d/'enumeration.json'); enum.reverse(); save(enum, d/'enumeration.json')
            result = self.verify(d)
            self.assertEqual(result['cell_coverage']['status'], 'INCOMPLETE')
            self.assertEqual({c['cell_id'] for c in result['cells'] if c['run_status'] == 'CERTIFIED'}, set(ids[:budget]))
        p = fixture(); p['scenario_set']['members'].reverse()
        _, result, _ = self.execute(p, max_cells=13)
        expected = [(w, s['label']) for w in self.oracle_words for s in p['scenario_set']['members']][:13]
        self.assertEqual({(tuple(c['order']), c['scenario_label']) for c in result['cells'] if c['run_status'] == 'CERTIFIED'}, set(expected))
        d = self.clone(); self.rehash(d, budget=12)
        keep = ids[:11] + [ids[12]]
        for directory in (d/'runs').iterdir():
            if directory.name not in keep: shutil.rmtree(directory)
        enum = load(d/'enumeration.json'); enum.insert(0, enum.pop(12)); save(enum, d/'enumeration.json')
        self.assertEqual(self.verify(d)['cell_coverage']['status'], 'INVALID')

    def test_14_empty_incomplete_failed_attempts_consume_budget(self):
        ids = self.execution_ids()
        for retained in [None, 'input.json', 'started.json', 'failure.json', 'history.json.gz']:
            d = self.clone()
            for directory in (d/'runs').iterdir():
                if directory.name not in ids[:2]: shutil.rmtree(directory)
            self.rehash(d, budget=2)
            partial = d/'runs'/ids[1]
            for file in partial.iterdir():
                if file.name != retained: file.unlink()
            if retained == 'failure.json': save({'status': 'UNVERIFIED'}, partial/retained)
            result = self.verify(d)
            self.assertEqual(result['cell_coverage']['status'], 'INCOMPLETE')
            self.assertEqual(result['cell_coverage']['certified'], 1)
            self.rehash(d, budget=1)
            self.assertEqual(self.verify(d)['cell_coverage']['status'], 'INVALID')
            shutil.rmtree(d/'runs'/ids[0])
            self.assertEqual(self.verify(d)['cell_coverage']['status'], 'INVALID')
        d = self.clone(); self.rehash(d, budget=0)
        self.assertEqual(self.verify(d)['cell_coverage']['status'], 'INVALID')
        _, result, _ = self.execute(tiny(1), max_cells=1)
        self.assertEqual([c['order'] for c in result['cells'] if c['run_status'] == 'CERTIFIED'], [[]])

    def test_15_size_gates_precede_enumeration_materialization_and_budget(self):
        boundary = tiny(6, required=list('ABCDEF'), empty=False, scenarios=3)
        self.assertEqual(selection.search_size(boundary)['candidates'], 720)
        self.assertEqual(selection.search_size(boundary)['cells'], 2160)
        manifest, _ = sc.freeze(boundary)
        self.assertEqual((len(manifest['candidates']), len(manifest['cells'])), (720, 2160))
        self.assertEqual(len(words(tiny(6))), 1957)
        self.assertEqual(len(words(tiny(6, empty=False))), 1956)
        self.assertEqual(selection.search_size(tiny(5))['candidates'], 326)
        for p in [tiny(6), tiny(6, empty=False), tiny(7, required=list('ABCDEFG')),
                  tiny(6, required=list('ABCDEF'), scenarios=4)]:
            with ExitStack() as stack:
                for module, method in [(selection, 'generated_orders'), (selection, 'expected_orders'),
                                       (sc, 'candidate'), (single, 'materialize'), (sc, 'materialize')]:
                    stack.enter_context(patch.object(module, method, side_effect=AssertionError('before size gate')))
                with self.assertRaisesRegex(ValueError, 'Unsupported search size'): sc.freeze(p)
                with self.assertRaisesRegex(ValueError, 'Unsupported search size'): sc.generate(p)
                d = self.dest()
                with self.assertRaisesRegex(ValueError, 'Unsupported search size'): sr.run(p, {}, {}, d, max_cells=0)
                self.assertFalse(d.exists())

    def test_16_unknown_isolation_robustness_readonly_and_no_replay(self):
        d = self.clone(); (d/'result.json').write_text('corrupt and ignored', encoding='utf-8')
        self.assertEqual(self.verify(d), self.result)
        for word, expected in [('PN', 'UNKNOWN'), ('UP', 'FALSE')]:
            d = self.clone()
            cell = next(c for c in self.result['cells'] if c['order'] == list(word))
            path = d/'runs'/cell['cell_id']/'history.json.gz'
            path.write_bytes(path.read_bytes()[:-8])
            result = self.verify(d)
            self.assertEqual(result['cell_coverage']['certified'], 47)
            bad = next(c for c in result['cells'] if c['cell_id'] == cell['cell_id'])
            self.assertIsNone(bad['goal_satisfied'])
            self.assertEqual(bad['event_path_coverage']['status'], 'UNKNOWN')
            self.assertEqual(next(c['robust'] for c in result['candidates'] if c['order'] == list(word)), expected)
        p = tiny(1)
        timer(p, 'a', 1, 'safe', False); timer(p, 'b', 1, 'safe', True)
        for field in ['max_paths', 'max_rows', 'max_steps']:
            limits = dict(single.LIMITS); limits[field] = 1
            _, result, _ = self.execute(p, limits=limits)
            self.assertTrue(all(c['goal_satisfied'] is None for c in result['cells']))
        p = tiny(1)
        p['model']['domains']['counter'] = {'integer': [0, 0]}; p['model']['initial']['counter'] = 0
        timer(p, 'overflow', 1, 'safe', True)
        p['model']['events']['overflow']['outcomes']['apply']['add'] = {'counter': 1}
        d, result, _ = self.execute(p)
        self.assertTrue(all(c['goal_satisfied'] is None for c in result['cells']))
        self.assertFalse(list(d.rglob('observation.json')))

    def test_17_legacy_versions_temporal_meaning_and_purpose(self):
        p = tiny(2, required=['A', 'B'], empty=False)
        p['model']['decisions']['A']['requires'] = [{'field': 'done', 'op': 'eq', 'value': True}]
        p['model']['decisions']['B']['effects']['set'] = {'done': True}
        timer(p, 'late', 5, 'safe', False)
        p['observation']['all'] = [{'id': 'end', 'operator': 'terminal', 'equals': {'safe': False}},
                                 {'id': 'early', 'operator': 'reach_by', 'equals': {'done': True}, 'deadline': 0},
                                 {'id': 'safe', 'operator': 'always', 'equals': {'safe': True}, 'through': 4}]
        old = deepcopy(p); old['schema_version'] = 'ce3-scenario-problem/3'
        old['search'] = {'kind': 'permutations_once/2', 'decision_ids': ['A', 'B'], 'slots': [0, 1],
                         'mode': 'attempt', 'retry': False, 'early_stop': False}
        old['observation']['schema_version'] = 'ce3-history-goal/1'; del old['observation']['acceptance_scope']
        newdir, new, _ = self.execute(p); olddir, previous, _ = self.execute(old)
        for result in [new, previous]:
            self.assertEqual({''.join(c['order']): c['goal_satisfied'] for c in result['cells']}, {'AB': False, 'BA': True})
        for cell in new['cells']:
            other = next(c for c in previous['cells'] if c['order'] == cell['order'])
            self.assertEqual(load(newdir/'runs'/cell['cell_id']/'history.json.gz')['paths'],
                             load(olddir/'runs'/other['cell_id']/'history.json.gz')['paths'])
        for file in ['problem.json', 'scenario-problem.json', 'fixed-slots-problem.json', 'temporal-problem.json', 'optional-decisions-problem.json']:
            q = load(ROOT/'fixtures'/file); q['purpose'] = 'bounded_real_pilot'
            fn = single.freeze if file == 'problem.json' else sc.freeze
            with self.assertRaisesRegex(ValueError, 'Only technical integration scope supported'): fn(q)
        for version in ['1', '2', '3']:
            q = fixture(); q['schema_version'] = 'ce3-scenario-problem/'+version
            with self.assertRaises((ValueError, KeyError)): sc.freeze(q)

    def test_18_manifest_duplicate_and_rehashed_cell_rewiring(self):
        for attack in ['candidate_duplicate', 'cell_duplicate', 'rewire']:
            d = self.clone(); manifest = load(d/'manifest.json')
            if attack == 'candidate_duplicate':
                manifest['candidates'][-1] = deepcopy(manifest['candidates'][0])
            elif attack == 'cell_duplicate':
                manifest['cells'][-1] = deepcopy(manifest['cells'][0])
            else:
                c = manifest['cells'][0]
                other = next(x for x in manifest['cells'] if x['candidate_id'] != c['candidate_id'])
                c['candidate_id'], c['plan_id'] = other['candidate_id'], other['plan_id']
                c['cell_id'] = h({k: v for k, v in c.items() if k != 'cell_id'})
            save(deepcopy(manifest['cells']), d/'enumeration.json')
            self.rehash(d, manifest=manifest)
            self.assertEqual(len(manifest['candidates']), 16)
            self.assertEqual(len(manifest['cells']), 48)
            with self.assertRaisesRegex(ValueError, 'Trusted problem/manifest'):
                self.verify(d, load(d/'pins.json'))

    def test_19_empty_candidate_positive_reference_is_not_all_paths_proof(self):
        p = tiny(1)
        # Reference lock -> clear is safe; reverse order is unsafe.
        timer(p, 'lock', 1, 'done', True)
        timer(p, 'clear', 1, 'safe', False, [{'field': 'done', 'op': 'eq', 'value': False}])
        d, result, pins = self.execute(p)
        cell = next(c for c in result['cells'] if not c['order'])
        projection = self.projection(d, cell)
        self.assertEqual([x['goal_satisfied'] for x in projection['paths']], [True, False])
        self.assertFalse(cell['goal_satisfied'])
        directory = d/'runs'/cell['cell_id']
        bundle = load(directory/'history.json.gz')
        bundle['paths'] = bundle['paths'][:1]
        save(bundle, directory/'history.json.gz')
        # Repair stored observations, receipt and physical hashes to pretend
        # that the remaining positive reference was the complete population.
        obs = load(directory/'observation.json')
        obs['projection']['paths'] = obs['projection']['paths'][:1]
        obs['projection'].update(goal_satisfied=True, components_satisfied=True, history_id=h(bundle))
        receipt = load(directory/'audit-receipt.json'); receipt['history_id'] = h(bundle)
        save(receipt, directory/'audit-receipt.json')
        obs['projection']['audit_receipt_id'] = h(receipt)
        save(obs, directory/'observation.json')
        record = load(directory/'record.json'); record.update(sr.artifact_record({}, directory))
        record.update(observation_id=h(obs), audit_receipt_id=h(receipt)); save(record, directory/'record.json')
        result = self.verify(d, pins)
        bad = next(c for c in result['cells'] if not c['order'])
        self.assertIsNone(bad['goal_satisfied'])
        self.assertEqual(bad['event_path_coverage']['status'], 'UNKNOWN')

    def test_20_unused_slots_strict_times_and_no_script_shape_loopholes(self):
        for slots in [[0, 2], [0, 2, 4, 5], [0, 2, 6], [0, 2, True], [0, 2, 4.0],
                      [0, 2, '4'], [0, 2, 2], [2, 0, 4]]:
            p = fixture(); p['search']['slots'] = slots
            with self.assertRaises(ValueError): sc.freeze(p)
        value = full_input(self.p, 'PN', self.p['scenario_set']['members'][0])['script']
        for attack in ['empty_key', 'leading_zero', 'if_not_taken', 'extra_entry', 'source']:
            bad = deepcopy(value)
            if attack == 'empty_key': bad['steps']['4'] = []
            elif attack == 'leading_zero': bad['steps']['00'] = bad['steps'].pop('0')
            elif attack == 'if_not_taken': bad['steps']['0'][0]['mode'] = 'if_not_taken'
            elif attack == 'extra_entry': bad['steps']['0'].append({'decision': 'X', 'mode': 'attempt'})
            else: bad['source'] = 'different'
            with self.assertRaises(ValueError): selection.script_evidence(self.p, bad)
        p = tiny(1)
        p['model']['clock'].update(start=-2, horizon=-2)
        p['search']['slots'] = [-2]
        d, result, _ = self.execute(p)
        self.assertEqual(result['cell_coverage']['certified'], 2)
        for c in result['cells']:
            self.assertTrue(c['goal_satisfied'])
            history = load(d/'runs'/c['cell_id']/'history.json.gz')
            self.assertEqual(history['paths'][0]['history'][-1]['after']['step'], -2)


if __name__ == '__main__':
    unittest.main()
