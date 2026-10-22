"""Independent review: explicit state traces, real replay/audit, hostile packages.

No implementation-test helpers or goal observer are used to derive expected
answers. Helpers below only declare inputs, run the public API and alter private
temporary artifacts. Literal transition lists and truth tables are the oracle.
"""
from contextlib import ExitStack
from copy import deepcopy
import builtins
import gzip
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from bridge import digest, read_bundle, write_bundle
from contracts import LIMITS
import scenario_contracts as contracts
import scenario_runner as runner
import core.replay as replay
import observe
from audit.verify import audit_bundle


def goal(key, operator, equals, limit=None):
    value = dict(id=key, operator=operator, equals=equals)
    if operator != 'terminal':
        value['through' if operator == 'always' else 'deadline'] = limit
    return value


def model_case(components, start=0, end=3, initial=False, slot=None):
    return {
        'schema_version': 'ce3-scenario-problem/3', 'revision': 1,
        'purpose': 'synthetic_integration_test', 'profile': 'fixed-replay/0.1',
        'sources': {},
        'model': {
            'schema_version': 'ce3-model/1', 'source': 'Independent review model.',
            'clock': {'start': start, 'horizon': end, 'step': 1, 'unit': 'step',
                      'events_before_decisions': True, 'horizon_inclusive': True},
            'domains': {name: {'enum': [False, True]} for name in ('x', 'y', 'lock')},
            'initial': {'x': initial, 'y': False, 'lock': False}, 'budget': None,
            'decisions': {'N': {'requires': [], 'effects': {'set': {}, 'add': {}},
                                'cost': 0, 'schedule': None, 'source': 'No-op.'}},
            'events': {}, 'initial_events': [], 'reference_event_order': [],
            'metadata': {'assumption': 'Synthetic review only.',
                         'time_basis': 'Integer snapshots.', 'deadlines': []}},
        'search': {'kind': 'permutations_once/2', 'decision_ids': ['N'],
                   'slots': [end if slot is None else slot], 'mode': 'attempt',
                   'retry': False, 'early_stop': False},
        'scenario_set': {'schema_version': 'ce3-scenario-set/1',
                         'variation': 'outcomes_only', 'selection': 'explicit_complete_list',
                         'members': [{'label': 'review', 'outcomes': {}}]},
        'observation': {'schema_version': 'ce3-history-goal/1', 'goal_id': 'review',
                        'sampling': 'each_row.before_after.snapshot_step/1',
                        'quantifier': 'all_event_paths', 'all_attempts_accepted': True,
                        'all': components}}


def timer(p, name, at, sets, requires=None):
    m = p['model']
    m['events'][name] = {'kind': 'timer', 'requires': requires or [], 'absent': None,
                          'outcomes': {'tick': {'set': sets, 'add': {}}},
                          'source': 'Explicit review transition.'}
    m['initial_events'].append({'id': name, 'due': at, 'scheduled_at': m['clock']['start']})
    m['reference_event_order'].append(name)


def eq(field, value):
    return {'field': field, 'op': 'eq', 'value': value}


def disjoint_witness_case(components):
    p = model_case(components)
    # Early-first: rise at 0, fall at 1; lock-first: rise at 2, fall at 3.
    # Before-points at the falling edges count too; the time sets are disjoint.
    timer(p, 'early', 0, {'x': True}, [eq('lock', False)])
    timer(p, 'lock', 0, {'lock': True})
    timer(p, 'close', 1, {'x': False, 'y': True}, [eq('x', True)])
    timer(p, 'late', 2, {'x': True}, [eq('y', False)])
    timer(p, 'reset', 3, {'x': False})
    return p


class IndependentTemporalReview(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='ce3-independent-temporal-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.sequence = 0

    def run_case(self, p, **kwargs):
        self.sequence += 1
        root = self.root / str(self.sequence)
        manifest, pins = contracts.freeze(p)
        result = runner.run(p, manifest, pins, root, **kwargs)
        return root, pins, result

    def certified(self, p):
        root, pins, result = self.run_case(p)
        self.assertEqual(result['cell_coverage']['status'], 'COMPLETE')
        self.assertEqual(result['cells'][0]['run_status'], 'CERTIFIED')
        directory = root / 'runs' / result['cells'][0]['cell_id']
        obs = read_bundle(directory / 'observation.json')['projection']
        bundle = read_bundle(directory / 'history.json.gz')
        self.assertEqual(read_bundle(directory / 'audit.json')['status'], 'PASS')
        self.assertEqual(self.read_only(root, pins), result)
        return root, pins, result, directory, obs, bundle

    def read_only(self, root, pins):
        def inventory():
            return {str(p.relative_to(root)): (p.read_bytes(), p.stat().st_mtime_ns)
                    for p in root.rglob('*') if p.is_file()}
        before = inventory()
        builtin_open, path_open = builtins.open, Path.open

        def checked_open(file, mode='r', *args, **kwargs):
            if any(c in mode for c in 'wax+'):
                raise AssertionError('verify tried to write: ' + str(file))
            return builtin_open(file, mode, *args, **kwargs)

        def checked_path_open(file, mode='r', *args, **kwargs):
            if any(c in mode for c in 'wax+'):
                raise AssertionError('verify tried to write: ' + str(file))
            return path_open(file, mode, *args, **kwargs)

        with ExitStack() as stack:
            for target, name in ((runner, 'cli_process'), (subprocess, 'run'),
                                 (subprocess, 'Popen'), (replay, 'replay'),
                                 (runner, 'write_bundle')):
                stack.enter_context(patch.object(target, name, side_effect=AssertionError(name)))
            stack.enter_context(patch('builtins.open', checked_open))
            stack.enter_context(patch.object(Path, 'open', checked_path_open))
            result = runner.verify(root, pins)
        self.assertEqual(inventory(), before)
        return result

    def unknown(self, result):
        self.assertEqual(result['cell_coverage']['certified'], 0)
        for cell in result['cells']:
            self.assertEqual(cell['goal_status'], 'UNKNOWN')
            self.assertIsNone(cell['goal_satisfied'])
            self.assertEqual(cell['event_path_coverage'], {'status': 'UNKNOWN', 'audited_paths': None})
            self.assertNotIn('components', cell)
        self.assertTrue(all(c['robust'] == 'UNKNOWN' for c in result['candidates']))

    def test_01_signed_time_boundary_matrix(self):
        # true at start; false after drop(start+1); true after restore(start+3).
        # At each time's initial before-point the preceding state still counts.
        for start in (-2, 5):
            components = []
            for offset in range(5):
                components += [goal('a'+str(offset), 'always', {'x': True}, start+offset),
                               goal('r'+str(offset), 'reach_by', {'x': False}, start+offset)]
            p = model_case(components, start=start, end=start+4, initial=True)
            timer(p, 'drop', start+1, {'x': False})
            timer(p, 'restore', start+3, {'x': True})
            *_, obs, bundle = self.certified(p)
            self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']],
                             [True, False, False, True, False, True, False, True, False, True])
            changes = [(r['after']['step'], r['action'], r['before']['state']['x'], r['after']['state']['x'])
                       for r in bundle['paths'][0]['history'] if r['kind'] == 'event_applied']
            self.assertEqual(changes, [(start+1, 'drop', True, False), (start+3, 'restore', False, True)])

    def test_02_exact_advance_points_with_empty_control_step(self):
        p = model_case([goal('stable', 'always', {'x': False}, -1),
                        goal('missing', 'reach_by', {'x': True}, -1)], start=-2, end=1)
        timer(p, 'future', 0, {'x': True})
        *_, obs, bundle = self.certified(p)
        # initial 0; step -2: rows 1..4; step -1: rows 5..8.
        expected = []
        for i, before, after in [(0,-2,-2),(1,-2,-2),(2,-2,-2),(3,-2,-2),
                                 (4,-2,-1),(5,-1,-1),(6,-1,-1),(7,-1,-1)]:
            expected += [{'row_index': i, 'side': 'before', 'step': before},
                         {'row_index': i, 'side': 'after', 'step': after}]
        expected += [{'row_index': 8, 'side': 'before', 'step': -1}]
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [True, False])
        for c in obs['paths'][0]['components']:
            self.assertEqual(c['evidence']['points'], expected)
        row = bundle['paths'][0]['history'][8]
        self.assertEqual((row['kind'], row['step'], row['before']['step'], row['after']['step']),
                         ('advance', -1, -1, 0))

    def test_03_one_point_interval_initial_and_decision(self):
        for start in (-3, 0, 7):
            for initial in (False, True):
                p = model_case([goal('a', 'always', {'x': True}, start),
                                goal('r', 'reach_by', {'x': True}, start),
                                goal('t', 'terminal', {'x': True})],
                               start=start, end=start, initial=initial)
                p['model']['decisions']['N']['effects']['set'] = {'x': not initial}
                *_, obs, bundle = self.certified(p)
                a, r, t = obs['paths'][0]['components']
                self.assertEqual([a['satisfied'], r['satisfied'], t['satisfied']],
                                 [False, True, not initial])
                self.assertEqual(r['evidence']['witness']['row_index'], 0 if initial else 3)
                self.assertEqual(r['evidence']['witness']['side'], 'before' if initial else 'after')
                self.assertEqual(len(a['evidence']['points']), 10)
                self.assertEqual(len(bundle['paths'][0]['history']), 5)

    def test_04_same_step_drop_recovery_and_early_cutoff(self):
        p = model_case([goal('early', 'always', {'x': True}, 0),
                        goal('now', 'always', {'x': True}, 1),
                        goal('pulse', 'reach_by', {'x': False}, 1),
                        goal('finish', 'terminal', {'x': True})], initial=True, slot=1)
        timer(p, 'drop', 1, {'x': False})
        p['model']['decisions']['N']['effects']['set'] = {'x': True}
        *_, obs, bundle = self.certified(p)
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [True, False, True, True])
        transitions = [(r['kind'], r['after']['step'], r['after']['state']['x'])
                       for r in bundle['paths'][0]['history']
                       if r['kind'] in ('event_applied', 'decision_executed')]
        self.assertEqual(transitions, [('event_applied', 1, False), ('decision_executed', 1, True)])
        self.assertEqual(obs['paths'][0]['components'][1]['evidence']['counterexample']['row_index'], 6)

    def test_05_all_paths_can_have_disjoint_witness_times(self):
        p = disjoint_witness_case([goal('reach', 'reach_by', {'x': True}, 2)])
        *_, obs, bundle = self.certified(p)
        self.assertTrue(obs['goal_satisfied'])
        self.assertEqual([p['components'][0]['evidence']['witness']['step'] for p in obs['paths']], [0, 2])
        self.assertEqual([p['components'][0]['satisfied'] for p in obs['paths']], [True, True])
        # Independently check actual states: no shared time can witness x=true.
        positive_times = [{r[side]['step'] for r in p['history'] for side in ('before', 'after')
                           if r[side]['state']['x']} for p in bundle['paths']]
        self.assertEqual(positive_times, [{0, 1}, {2, 3}])
        self.assertEqual(positive_times[0] & positive_times[1], set())
        self.assertEqual([[r['action'] for r in p['history'] if r['kind'] == 'event_inapplicable']
                          for p in bundle['paths']], [['late'], ['early', 'close']])

    def test_06_every_component_on_every_path_with_earlier_deadline(self):
        p = disjoint_witness_case([goal('early', 'reach_by', {'x': True}, 1),
                                  goal('ever', 'reach_by', {'x': True}, 2),
                                  goal('never', 'always', {'x': False}, 2)])
        *_, obs, _ = self.certified(p)
        self.assertEqual([[c['satisfied'] for c in p['components']] for p in obs['paths']],
                         [[True, True, False], [False, True, False]])
        self.assertFalse(obs['goal_satisfied'])

    def test_07_conjunction_atomic_switch_and_distinct_component_witnesses(self):
        p = model_case([goal('both', 'reach_by', {'x': True, 'y': True}, 2),
                        goal('x', 'reach_by', {'x': True}, 2),
                        goal('y', 'reach_by', {'y': True}, 2)])
        timer(p, 'x', 1, {'x': True})
        timer(p, 'switch', 2, {'x': False, 'y': True})
        *_, obs, bundle = self.certified(p)
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [False, True, True])
        self.assertEqual([c['evidence']['witness']['step'] for c in obs['paths'][0]['components'][1:]], [1, 2])
        self.assertEqual([(r['before']['state']['x'], r['before']['state']['y'],
                           r['after']['state']['x'], r['after']['state']['y'])
                          for r in bundle['paths'][0]['history'] if r['kind'] == 'event_applied'],
                         [(False, False, True, False), (True, False, False, True)])

    def test_08_late_block_changes_goal_not_component_evidence(self):
        p = model_case([goal('a', 'always', {'x': True}, 1),
                        goal('r', 'reach_by', {'x': True}, 0)], initial=True)
        timer(p, 'drop', 2, {'x': False})
        *_, good, _ = self.certified(p)
        p['model']['decisions']['N']['requires'] = [eq('x', True)]
        *_, blocked, _ = self.certified(p)
        self.assertTrue(good['goal_satisfied'])
        self.assertTrue(blocked['components_satisfied'])
        self.assertFalse(blocked['all_attempts_accepted'])
        self.assertFalse(blocked['goal_satisfied'])
        self.assertEqual(good['paths'][0]['components'], blocked['paths'][0]['components'])
        self.assertEqual(len(blocked['paths'][0]['attempt_evidence']['blocked_rows']), 1)

    def test_09_deadline_before_exact_after_event_and_decision(self):
        for source in ('event', 'decision'):
            for at, expected in ((0, True), (1, True), (2, False)):
                p = model_case([goal('reach', 'reach_by', {'x': True}, 1)], slot=at)
                if source == 'event':
                    timer(p, 'set', at, {'x': True})
                else:
                    p['model']['decisions']['N']['effects']['set'] = {'x': True}
                *_, obs, _ = self.certified(p)
                self.assertIs(obs['goal_satisfied'], expected)
                evidence = obs['paths'][0]['components'][0]['evidence']
                if expected:
                    self.assertEqual(evidence['witness']['step'], at)
                else:
                    self.assertNotIn('witness', evidence)
                self.assertLessEqual(max(p['step'] for p in evidence['points']), 1)

    def rehash_observation(self, directory):
        record = read_bundle(directory / 'record.json')
        record['observation_id'] = digest(read_bundle(directory / 'observation.json'))
        write_bundle(record, directory / 'record.json')

    def test_10_rehashed_forged_evidence_is_recomputed(self):
        p = model_case([goal('r', 'reach_by', {'x': True}, 2),
                        goal('a', 'always', {'x': False}, 2)])
        timer(p, 'set', 1, {'x': True})
        root, pins, _, directory, _, _ = self.certified(p)
        for damage in ('witness_state', 'witness_time', 'witness_side', 'missing_counterexample',
                       'missing_coverage', 'reorder_coverage', 'false_success'):
            with self.subTest(damage=damage):
                target = self.root / damage
                shutil.copytree(root, target)
                d = target / 'runs' / directory.name
                obs = read_bundle(d / 'observation.json')
                path = obs['projection']['paths'][0]
                r, a = path['components']
                if damage == 'witness_state': r['evidence']['witness']['state']['x'] = False
                elif damage == 'witness_time': r['evidence']['witness']['step'] = 0
                elif damage == 'witness_side': r['evidence']['witness']['side'] = 'before'
                elif damage == 'missing_counterexample': del a['evidence']['counterexample']
                elif damage == 'missing_coverage': a['evidence']['points'].pop()
                elif damage == 'reorder_coverage': r['evidence']['points'].reverse()
                else:
                    a['satisfied'] = True
                    del a['evidence']['counterexample']
                    path.update(components_satisfied=True, goal_satisfied=True)
                    obs['projection'].update(components_satisfied=True, goal_satisfied=True)
                write_bundle(obs, d / 'observation.json')
                self.rehash_observation(d)
                (target / 'result.json').write_text('not json: stale summaries are not evidence')
                result = self.read_only(target, pins)
                self.unknown(result)
                self.assertIn('Observation mismatch', result['cells'][0]['reason'])

    def test_11_changed_operator_and_deadline_with_fully_rebound_identity(self):
        for change in ('operator', 'deadline'):
            p = model_case([goal('g', 'reach_by', {'x': True}, 2)])
            timer(p, 'set', 2, {'x': True})
            root, old_pins, result, directory, _, _ = self.certified(p)
            new = deepcopy(p)
            c = new['observation']['all'][0]
            if change == 'operator':
                c['operator'] = 'always'; c['through'] = c.pop('deadline')
            else: c['deadline'] = 1
            manifest, pins = contracts.freeze(new)
            cell = manifest['cells'][0]
            self.assertEqual(cell['input_identity'], result['cells'][0]['input_identity'])
            spec = read_bundle(root / 'batch.json')
            spec.update(problem_id=digest(new), manifest_id=digest(manifest))
            attempt = read_bundle(root / 'attempt.json'); attempt['batch_spec_id'] = digest(spec)
            d = root / 'runs' / cell['cell_id']; directory.rename(d)
            record = read_bundle(d / 'record.json')
            base = runner.base_record(cell, spec, attempt['batch_attempt_id'], record['run_id'])
            obs = read_bundle(d / 'observation.json')
            obs.update(problem_id=digest(new), cell_id=cell['cell_id'], batch_spec_id=digest(spec))
            obs['projection'].update(definition_id=digest(new['observation']),
                problem_id=digest(contracts.effective_problem(new, new['scenario_set']['members'][0])))
            # Even repair operator/interval labels: old truth/evidence must fail.
            saved = obs['projection']['paths'][0]['components'][0]
            saved['operator'] = c['operator']
            if change == 'deadline': saved['evidence']['interval'] = [0, 1]
            record.update(base, observation_id=digest(obs))
            for name, value in [('problem', new), ('manifest', manifest), ('pins', pins),
                                ('batch', spec), ('attempt', attempt), ('enumeration', contracts.generate(new))]:
                write_bundle(value, root / (name+'.json'))
            for name, value in [('started', base), ('record', record), ('observation', obs)]:
                write_bundle(value, d / (name+'.json'))
            with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                self.read_only(root, old_pins)
            rejected = self.read_only(root, pins)
            self.unknown(rejected)
            self.assertIn('Observation mismatch', rejected['cells'][0]['reason'])
            *_, fresh, _ = self.certified(new)
            self.assertFalse(fresh['goal_satisfied'])

    def test_12_missing_path_row_and_audit_prevent_any_projection(self):
        p = disjoint_witness_case([goal('g', 'reach_by', {'x': True}, 1)])
        root, pins, _, directory, _, _ = self.certified(p)
        for damage in ('negative_path', 'positive_path', 'row', 'audit', 'missing_history'):
            target = self.root / damage; shutil.copytree(root, target)
            d = target / 'runs' / directory.name
            if damage == 'audit':
                write_bundle({'status': 'FAIL'}, d / 'audit.json')
            elif damage == 'missing_history': (d / 'history.json.gz').unlink()
            else:
                bundle = read_bundle(d / 'history.json.gz')
                if damage.endswith('path'): bundle['paths'].pop(1 if damage == 'negative_path' else 0)
                else: bundle['paths'][0]['history'].pop(2)
                write_bundle(bundle, d / 'history.json.gz')
            if damage != 'missing_history':
                record = read_bundle(d / 'record.json')
                record.update(runner.artifact_record(read_bundle(d / 'started.json'), d))
                write_bundle(record, d / 'record.json')
            with patch.object(observe, 'components_for_path', side_effect=AssertionError('partial proof')):
                self.unknown(self.read_only(target, pins))

    def test_13_gzip_corruption_is_unknown(self):
        p = model_case([goal('g', 'reach_by', {'x': False}, 0)])
        root, pins, _, directory, _, _ = self.certified(p)
        original = (directory / 'history.json.gz').read_bytes()
        bad_crc = bytearray(original); bad_crc[-8] ^= 0xff
        cases = [b'not gzip', original[:-8], bytes(bad_crc), original + gzip.compress(b'x')[:-3]]
        for i, data in enumerate(cases):
            target = self.root / ('gzip-'+str(i)); shutil.copytree(root, target)
            (target / 'runs' / directory.name / 'history.json.gz').write_bytes(data)
            with patch.object(observe, 'components_for_path', side_effect=AssertionError('partial proof')):
                self.unknown(self.read_only(target, pins))

    def test_14_limits_and_error_trace_never_create_partial_proofs(self):
        p = disjoint_witness_case([goal('g', 'reach_by', {'x': False}, 0)])
        for key in ('max_paths', 'max_rows', 'max_steps'):
            with patch.object(observe, 'components_for_path', side_effect=AssertionError('partial proof')):
                root, pins, result = self.run_case(p, limits=dict(LIMITS, **{key: 1}))
                self.unknown(result)
                self.unknown(self.read_only(root, pins))
                self.assertEqual(list(root.glob('runs/*/observation.json')), [])
        # A late model error still invalidates a real, initially satisfied goal.
        p['model']['domains']['counter'] = {'integer': [0, 1]}
        p['model']['initial']['counter'] = 0
        p['model']['decisions']['N']['effects']['add'] = {'counter': 2}
        root, pins, result = self.run_case(p)
        self.unknown(result)
        self.assertEqual(list(root.glob('runs/*/observation.json')), [])
        bundle = read_bundle(next(root.glob('runs/*/history.json.gz')))
        self.assertEqual(bundle['status'], 'ERROR')
        self.assertFalse(bundle['error']['last_history'][0]['before']['state']['x'])
        effective = contracts.effective_problem(p, p['scenario_set']['members'][0])
        with patch.object(observe, 'components_for_path', side_effect=AssertionError('partial proof')):
            with self.assertRaisesRegex(ValueError, 'complete audit certification'):
                observe.observe(effective, bundle, bundle['input'],
                                audit_bundle(bundle, digest(bundle['input'])), 'runtime', 'build')
        self.unknown(self.read_only(root, pins))

    def test_15_time_types_and_out_of_interval_rejected(self):
        for operator in ('always', 'reach_by'):
            for value in (-4, 2, True, False, -1.0, '-1', None):
                p = model_case([goal('g', operator, {'x': True}, value)], start=-3, end=1)
                with self.subTest(operator=operator, limit=value), self.assertRaises(ValueError):
                    contracts.freeze(p)
            for value in (-3, -2, 0, 1):
                p = model_case([goal('g', operator, {'x': True}, value)], start=-3, end=1, initial=True)
                *_, obs, _ = self.certified(p)
                self.assertTrue(obs['goal_satisfied'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
