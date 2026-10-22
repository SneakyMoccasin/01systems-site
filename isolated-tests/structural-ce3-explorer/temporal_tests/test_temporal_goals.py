"""Rule-derived literal answers; real CLI replay/audit, adversarial read-only verify."""
from copy import deepcopy
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, read_bundle, write_bundle
from contracts import LIMITS
import scenario_contracts as contracts
import scenario_runner as runner
import core.replay as replay_module


def component(operator, value=True, time=4, field='flag', key=None):
    c = {'id': key or operator, 'operator': operator, 'equals': {field: value}}
    if operator != 'terminal':
        c['through' if operator == 'always' else 'deadline'] = time
    return c


def problem(*components, initial=True, slot=4, start=0, horizon=4):
    return {
        'schema_version': 'ce3-scenario-problem/3', 'revision': 1,
        'purpose': 'synthetic_integration_test', 'profile': 'fixed-replay/0.1',
        'sources': {},
        'model': {
            'schema_version': 'ce3-model/1', 'source': 'Synthetic temporal acceptance model.',
            'clock': {'start': start, 'horizon': horizon, 'step': 1, 'unit': 'step',
                      'events_before_decisions': True, 'horizon_inclusive': True},
            'domains': {'flag': {'enum': [False, True]}, 'latch': {'enum': [False, True]},
                        'count': {'integer': [0, 1]}},
            'initial': {'flag': initial, 'latch': False, 'count': 0}, 'budget': None,
            'decisions': {'D': {'requires': [], 'effects': {'set': {}, 'add': {}},
                                'cost': 0, 'schedule': None, 'source': 'Unconditional no-op.'}},
            'events': {}, 'initial_events': [], 'reference_event_order': [],
            'metadata': {'assumption': 'Synthetic only.', 'time_basis': 'Inclusive integer steps.', 'deadlines': []}},
        'search': {'kind': 'permutations_once/2', 'decision_ids': ['D'], 'slots': [slot],
                   'mode': 'attempt', 'retry': False, 'early_stop': False},
        'scenario_set': {'schema_version': 'ce3-scenario-set/1', 'variation': 'outcomes_only',
                         'selection': 'explicit_complete_list', 'members': [{'label': 'only', 'outcomes': {}}]},
        'observation': {'schema_version': 'ce3-history-goal/1', 'goal_id': 'declared_goal',
                        'sampling': 'each_row.before_after.snapshot_step/1',
                        'quantifier': 'all_event_paths', 'all_attempts_accepted': True,
                        'all': list(components)}}


def event(p, name, time, value, *, field='flag', requires=None):
    m = p['model']
    m['events'][name] = {'kind': 'timer', 'requires': requires or [], 'absent': None,
                          'outcomes': {'apply': {'set': {field: value}, 'add': {}}},
                          'source': 'Declared synthetic timer.'}
    m['initial_events'].append({'id': name, 'due': time, 'scheduled_at': m['clock']['start']})
    m['reference_event_order'].append(name)


def branching_problem(*components):
    p = problem(*components)
    # clear first: false forever; lock first: clear inapplicable, true forever.
    event(p, 'clear', 2, False, requires=[{'field': 'latch', 'op': 'eq', 'value': False}])
    event(p, 'lock', 2, True, field='latch')
    return p


class TemporalGoals(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ce3-temporal-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sequence = 0

    def execute(self, p, **kwargs):
        self.sequence += 1
        output = self.root / str(self.sequence)
        manifest, pins = contracts.freeze(p)
        result = runner.run(p, manifest, pins, output, **kwargs)
        return output, result, pins

    def observation(self, root, cell):
        return read_bundle(root / 'runs' / cell['cell_id'] / 'observation.json')['projection']

    def single(self, p):
        root, result, pins = self.execute(p)
        self.assertEqual(result['cell_coverage']['status'], 'COMPLETE')
        self.assertEqual(result['cells'][0]['run_status'], 'CERTIFIED')
        return self.observation(root, result['cells'][0])

    def verify_read_only(self, root, pins):
        before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}
        with patch.object(runner, 'cli_process', side_effect=AssertionError('verify executed CLI')), \
             patch.object(subprocess, 'run', side_effect=AssertionError('verify executed process')), \
             patch.object(replay_module, 'replay', side_effect=AssertionError('verify replayed')):
            result = runner.verify(root, pins)
        self.assertEqual(before, {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()})
        return result

    def assert_unknown(self, result):
        for cell in result['cells']:
            self.assertEqual(cell['goal_status'], 'UNKNOWN')
            self.assertIsNone(cell['goal_satisfied'])
            self.assertEqual(cell['event_path_coverage'], {'status': 'UNKNOWN', 'audited_paths': None})
        self.assertTrue(all(c['robust'] == 'UNKNOWN' for c in result['candidates']))

    def test_01_terminal_true_but_middle_violation(self):
        p = problem(component('terminal'), component('always'))
        event(p, 'drop', 1, False); event(p, 'restore', 3, True)
        obs = self.single(p)
        self.assertFalse(obs['goal_satisfied'])
        self.assertTrue(obs['all_attempts_accepted'])
        a, b = obs['paths'][0]['components']
        self.assertEqual([a['satisfied'], b['satisfied']], [True, False])
        self.assertEqual(b['evidence']['counterexample'],
                         {'row_index': 6, 'side': 'after', 'step': 1,
                          'state': {'flag': False, 'latch': False, 'count': 0}})

    def test_02_false_and_restored_in_same_step(self):
        p = problem(component('terminal'), component('always', time=2), slot=2)
        event(p, 'drop', 2, False)
        p['model']['decisions']['D']['effects']['set'] = {'flag': True}
        obs = self.single(p)
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [True, False])
        self.assertEqual(obs['paths'][0]['components'][1]['evidence']['counterexample']['step'], 2)
        # No duration or step_end sampling may erase this violation.
        self.assertFalse(obs['goal_satisfied'])

    def test_03_initial_false(self):
        p = problem(component('always'), initial=False, slot=0)
        p['model']['decisions']['D']['effects']['set'] = {'flag': True}
        obs = self.single(p)
        c = obs['paths'][0]['components'][0]
        self.assertFalse(c['satisfied'])
        self.assertEqual(c['evidence']['counterexample']['row_index'], 0)
        self.assertEqual(c['evidence']['counterexample']['side'], 'before')

    def test_04_initial_reach_survives_later_loss(self):
        p = problem(component('reach_by', time=0), component('terminal'))
        event(p, 'drop', 0, False)
        obs = self.single(p)
        reach, terminal = obs['paths'][0]['components']
        self.assertEqual([reach['satisfied'], terminal['satisfied']], [True, False])
        self.assertEqual(reach['evidence']['witness']['row_index'], 0)
        self.assertEqual(reach['evidence']['witness']['step'], 0)

    def test_05_exact_deadline_and_one_step_late(self):
        for due, expected in ((2, True), (3, False)):
            with self.subTest(due=due):
                p = problem(component('reach_by', time=2), initial=False)
                event(p, 'set', due, True)
                obs = self.single(p)
                c = obs['paths'][0]['components'][0]
                self.assertIs(obs['goal_satisfied'], expected)
                if expected:
                    self.assertEqual(c['evidence']['witness']['step'], 2)
                    self.assertEqual(c['evidence']['witness']['side'], 'after')
                else:
                    self.assertNotIn('witness', c['evidence'])
                    self.assertEqual(c['evidence']['interval'], [0, 2])
                    self.assertEqual(max(x['step'] for x in c['evidence']['points']), 2)

    def test_06_reached_then_lost_before_horizon(self):
        p = problem(component('reach_by', time=2), component('terminal'), initial=False)
        event(p, 'set', 1, True); event(p, 'drop', 3, False)
        obs = self.single(p)
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [True, False])
        self.assertEqual(obs['paths'][0]['components'][0]['evidence']['witness']['step'], 1)

    def test_07_empty_steps_coverage_and_snapshot_time(self):
        p = problem(component('always', time=1), component('reach_by', False, 1))
        obs = self.single(p)
        a, r = obs['paths'][0]['components']
        self.assertEqual([a['satisfied'], r['satisfied']], [True, False])
        # By declared replay row schedule: initial; 4 rows per nonfinal step.
        refs = [(i, side) for i in range(8) for side in ('before', 'after')] + [(8, 'before')]
        for c in (a, r):
            self.assertEqual(c['evidence']['interval'], [0, 1])
            self.assertEqual([(x['row_index'], x['side']) for x in c['evidence']['points']], refs)
            self.assertEqual(c['evidence']['points'][9], {'row_index': 4, 'side': 'after', 'step': 1})
        # Two sparse decision slots: no state transition before slot 4.
        p['model']['decisions']['E'] = deepcopy(p['model']['decisions']['D'])
        p['model']['clock']['horizon'] = 6
        p['search'].update(decision_ids=['E', 'D'], slots=[4, 6])
        _, result, _ = self.execute(p)
        self.assertEqual(len(result['cells']), 2)
        self.assertTrue(all(c['goal_satisfied'] is False for c in result['cells']))

    def test_08_early_control_and_horizon_events(self):
        p = problem(component('always', time=1), component('reach_by', False, 4))
        event(p, 'drop', 4, False)
        obs = self.single(p)
        self.assertTrue(obs['goal_satisfied'])
        self.assertEqual(obs['paths'][0]['components'][1]['evidence']['witness']['step'], 4)
        p['model']['decisions']['D']['requires'] = [{'field': 'flag', 'op': 'eq', 'value': True}]
        obs = self.single(p)
        self.assertTrue(obs['components_satisfied'])
        self.assertFalse(obs['all_attempts_accepted'])
        self.assertFalse(obs['goal_satisfied'])
        self.assertEqual(len(obs['paths'][0]['attempt_evidence']['blocked_rows']), 1)

    def test_09_each_event_path_separately(self):
        for c, expected in ((component('always'), [False, True]),
                            (component('reach_by', False, 2), [True, False])):
            obs = self.single(branching_problem(c))
            self.assertEqual([p['components'][0]['satisfied'] for p in obs['paths']], expected)
            self.assertFalse(obs['goal_satisfied'])
            self.assertEqual(obs['paths'][0]['event_orders'][2]['order'], ['clear', 'lock'])
            self.assertEqual(obs['paths'][1]['event_orders'][2]['order'], ['lock', 'clear'])

    def test_10_scenarios_robust_true_false_unknown_and_absent(self):
        p = problem(component('reach_by', time=2), initial=False)
        event(p, 'reply', 2, True)
        rule = p['model']['events']['reply']
        rule.update(kind='external', outcomes={
            'yes': {'set': {'flag': True}, 'add': {}},
            'absent': {'set': {'flag': False}, 'add': {}}},
            absent={'outcome': 'absent', 'field': 'flag', 'value': False, 'source': 'No confirmation.'})
        for outcomes, budget, expected in ((['yes', 'yes'], None, 'TRUE'),
                                           (['yes', 'absent'], None, 'FALSE'),
                                           (['yes', 'absent'], 1, 'UNKNOWN'),
                                           (['absent', 'yes'], 1, 'FALSE')):
            p['scenario_set']['members'] = [{'label': str(i), 'outcomes': {'reply': o}} for i, o in enumerate(outcomes)]
            root, result, pins = self.execute(p, max_cells=budget)
            self.assertEqual(result['candidates'][0]['robust'], expected)
            for c in result['cells']:
                if c['run_status'] == 'CERTIFIED':
                    self.assertIs(c['goal_satisfied'], outcomes[int(c['scenario_label'])] == 'yes')
            self.assertEqual(result, self.verify_read_only(root, pins))
        # A scheduled future positive reply beyond horizon is not a witness.
        p['model']['initial_events'][0]['due'] = 5
        p['scenario_set']['members'] = [{'label': 'future', 'outcomes': {'reply': 'yes'}}]
        obs = self.single(p)
        self.assertFalse(obs['goal_satisfied'])
        self.assertEqual(obs['paths'][0]['pending'][0]['due'], 5)

    def test_11_strict_goal_validation_and_legacy_opt_in(self):
        good = problem(component('always'))
        bads = []
        for value in (True, 4.0, '4', -1, 5, None):
            p = deepcopy(good); p['observation']['all'][0]['through'] = value; bads.append(p)
        for values in ({'flag': 1}, {'count': True}, {'missing': True}, {}, {'count': 2}):
            p = deepcopy(good); p['observation']['all'][0]['equals'] = values; bads.append(p)
        for key, value in (('operator', 'until'), ('operator', ['always']), ('extra', 1),
                           ('deadline', 2), ('id', ''), ('equals', {'all': []})):
            p = deepcopy(good); p['observation']['all'][0][key] = value; bads.append(p)
        for key, value in (('all', []), ('all', {}), ('quantifier', 'some_event_paths'),
                           ('all_attempts_accepted', False), ('all_attempts_accepted', 1),
                           ('sampling', 'step_end'), ('extra', None), ('schema_version', 'ce3-history-goal/2')):
            p = deepcopy(good); p['observation'][key] = value; bads.append(p)
        p = deepcopy(good); p['observation']['all'] *= 2; bads.append(p)
        p = deepcopy(good); del p['observation']['all'][0]['through']; bads.append(p)
        p = deepcopy(good); p['schema_version'] = 'ce3-scenario-problem/2'; bads.append(p)
        p = deepcopy(good); p['schema_version'] = 'ce3-scenario-problem/4'; bads.append(p)
        for p in bads:
            with self.subTest(observation=p['observation']), self.assertRaises(ValueError):
                contracts.freeze(p)
        for operator in ('always', 'reach_by'):
            p = problem(component(operator, time=-2), start=-2, slot=-2, horizon=-2)
            self.assertTrue(self.single(p)['goal_satisfied'])

    def test_12_rehashed_witness_and_omitted_violation(self):
        p = problem(component('reach_by', time=2), component('always', False, 2), initial=False)
        event(p, 'set', 2, True)
        root, result, pins = self.execute(p)
        for damage in ('witness', 'omission', 'coverage'):
            target = self.root / damage; shutil.copytree(root, target)
            directory = target / 'runs' / result['cells'][0]['cell_id']
            obs = read_bundle(directory / 'observation.json')
            a, b = obs['projection']['paths'][0]['components']
            if damage == 'witness': a['evidence']['witness']['row_index'] = 0
            elif damage == 'coverage': a['evidence']['points'].pop()
            else:
                b['satisfied'] = True; del b['evidence']['counterexample']
                obs['projection']['paths'][0].update(goal_satisfied=True, components_satisfied=True)
                obs['projection'].update(goal_satisfied=True, components_satisfied=True)
            write_bundle(obs, directory / 'observation.json')
            record = read_bundle(directory / 'record.json'); record['observation_id'] = digest(obs)
            write_bundle(record, directory / 'record.json')
            damaged = self.verify_read_only(target, pins)
            self.assert_unknown(damaged)
            self.assertIn('Observation mismatch', damaged['cells'][0]['reason'])

    def test_13_changed_deadline_rebound_package_cannot_reuse_observation(self):
        p = problem(component('reach_by', time=2), initial=False); event(p, 'set', 2, True)
        root, result, old_pins = self.execute(p)
        old_cell = result['cells'][0]
        p['observation']['all'][0]['deadline'] = 1
        manifest, pins = contracts.freeze(p)
        self.assertNotEqual(pins, old_pins)
        cell = manifest['cells'][0]
        self.assertEqual(cell['input_identity'], old_cell['input_identity'])
        self.assertEqual(cell['candidate_id'], old_cell['candidate_id'])
        spec = read_bundle(root / 'batch.json')
        spec.update(problem_id=digest(p), manifest_id=digest(manifest))
        attempt = read_bundle(root / 'attempt.json'); attempt['batch_spec_id'] = digest(spec)
        directory = root / 'runs' / cell['cell_id']
        (root / 'runs' / old_cell['cell_id']).rename(directory)
        record = read_bundle(directory / 'record.json')
        base = runner.base_record(cell, spec, attempt['batch_attempt_id'], record['run_id'])
        obs = read_bundle(directory / 'observation.json')
        obs.update(problem_id=digest(p), cell_id=cell['cell_id'], batch_spec_id=digest(spec))
        obs['projection'].update(problem_id=digest(contracts.effective_problem(p, p['scenario_set']['members'][0])),
                                 definition_id=digest(p['observation']))
        obs['projection']['paths'][0]['components'][0]['evidence']['interval'] = [0, 1]
        record.update(base, observation_id=digest(obs))
        for name, value in (('problem', p), ('manifest', manifest), ('pins', pins), ('batch', spec),
                            ('attempt', attempt), ('enumeration', contracts.generate(p))):
            write_bundle(value, root / (name + '.json'))
        for name, value in (('started', base), ('record', record), ('observation', obs)):
            write_bundle(value, directory / (name + '.json'))
        with self.assertRaisesRegex(ValueError, 'identity mismatch'):
            runner.verify(root, old_pins)
        damaged = self.verify_read_only(root, pins)
        self.assert_unknown(damaged)
        self.assertIn('Observation mismatch', damaged['cells'][0]['reason'])

    def test_14_audit_paths_limits_gzip_and_model_errors_no_partial_proofs(self):
        p = branching_problem(component('always'))
        root, result, pins = self.execute(p)
        for damage in ('audit', 'path', 'row', 'gzip'):
            target = self.root / damage; shutil.copytree(root, target)
            d = target / 'runs' / result['cells'][0]['cell_id']
            if damage == 'audit': write_bundle({'status': 'FAIL'}, d / 'audit.json')
            elif damage == 'gzip': (d / 'history.json.gz').write_bytes((d / 'history.json.gz').read_bytes()[:-8])
            else:
                bundle = read_bundle(d / 'history.json.gz')
                if damage == 'path': bundle['paths'].pop(0)  # omit negative path
                else: bundle['paths'][0]['history'][0]['after']['state']['flag'] = False
                write_bundle(bundle, d / 'history.json.gz')
            record = read_bundle(d / 'record.json')
            if damage != 'gzip':
                record.update(runner.artifact_record(read_bundle(d / 'started.json'), d))
            write_bundle(record, d / 'record.json')
            (target / 'result.json').write_text('not even JSON')
            self.assert_unknown(self.verify_read_only(target, pins))
        for limit in ('max_steps', 'max_rows', 'max_paths'):
            output, limited, trusted = self.execute(p, limits=dict(LIMITS, **{limit: 1}))
            self.assert_unknown(limited)
            self.assertFalse(list(output.glob('runs/*/observation.json')))
            self.assert_unknown(self.verify_read_only(output, trusted))
        p['model']['decisions']['D']['effects']['add'] = {'count': 2}
        output, result, _ = self.execute(p)
        self.assert_unknown(result)
        self.assertFalse(list(output.glob('runs/*/observation.json')))

    def test_15_identity_versions_and_terminal_compatibility(self):
        p = problem(component('terminal'))
        legacy = deepcopy(p); legacy['schema_version'] = 'ce3-scenario-problem/2'
        legacy['observation'] = {'schema_version': 'ce3-terminal-goal/1', 'goal_id': 'old',
                                 'sampling': 'last_row.after', 'quantifier': 'all_event_paths',
                                 'terminal_equals': {'flag': True}, 'all_attempts_accepted': True}
        m3, pins3 = contracts.freeze(p); m2, _ = contracts.freeze(legacy)
        self.assertEqual(m3['candidates'], m2['candidates'])
        self.assertEqual(m3['search_space_id'], m2['search_space_id'])
        root, new, _ = self.execute(p); _, old, _ = self.execute(legacy)
        self.assertEqual(new['cells'][0]['goal_satisfied'], old['cells'][0]['goal_satisfied'])
        self.assertEqual(new['schema_version'], 'ce3-scenario-result/3')
        self.assertEqual(self.observation(root, new['cells'][0])['schema_version'], 'ce3-goal-observation/2')
        for name in ('batch', 'attempt', 'manifest', 'pins'):
            self.assertTrue(read_bundle(root / (name + '.json'))['schema_version'].endswith('/3'))
        for name in ('started', 'record', 'observation'):
            self.assertTrue(read_bundle(root / 'runs' / new['cells'][0]['cell_id'] / (name + '.json'))['schema_version'].endswith('/3'))
        for key, value in (('operator', 'always'), ('equals', {'flag': False})):
            q = deepcopy(p); q['observation']['all'][0][key] = value
            if key == 'operator': q['observation']['all'][0]['through'] = 4
            self.assertNotEqual(digest(q['observation']), digest(p['observation']))
            self.assertNotEqual(contracts.freeze(q)[1], pins3)
        self.assertEqual(new, self.verify_read_only(root, pins3))

    def test_16_cli_and_budget_prefix_regression_for_new_contract(self):
        p = problem(component('always'))
        p['model']['decisions']['E'] = deepcopy(p['model']['decisions']['D'])
        p['search'].update(decision_ids=['E', 'D'], slots=[1, 4])
        write_bundle(p, self.root / 'problem.json')
        def cli(*args):
            return subprocess.run([sys.executable, '-B', str(ROOT / 'scenario_runner.py'), *map(str, args)], capture_output=True, text=True)
        frozen = self.root / 'frozen'; output = self.root / 'cli'
        self.assertEqual(cli('freeze', '--problem', self.root / 'problem.json', '--output', frozen).returncode, 0)
        args = ['--problem', self.root / 'problem.json', '--manifest', frozen / 'manifest.json', '--pins', frozen / 'pins.json']
        run = cli('run', *args, '--output', output)
        check = cli('verify', '--pins', frozen / 'pins.json', '--output', output)
        self.assertEqual((run.returncode, check.returncode), (0, 0), run.stderr + check.stderr)
        self.assertEqual(run.stdout, check.stdout)
        partial = cli('run', *args, '--output', self.root / 'partial', '--max-cells', 0)
        self.assertEqual(partial.returncode, 2)
        pins = read_bundle(frozen / 'pins.json')
        self.assert_unknown(runner.verify(self.root / 'partial', pins))
        # Rebind a full package to budget 1, retain only the second (wrong) member.
        spec = read_bundle(output / 'batch.json'); spec['max_cells'] = 1
        attempt = read_bundle(output / 'attempt.json'); attempt['batch_spec_id'] = digest(spec)
        cells = contracts.generate(p)
        shutil.rmtree(output / 'runs' / cells[0]['cell_id'])
        d = output / 'runs' / cells[1]['cell_id']
        record = read_bundle(d / 'record.json')
        base = runner.base_record(cells[1], spec, attempt['batch_attempt_id'], record['run_id'])
        obs = read_bundle(d / 'observation.json'); obs['batch_spec_id'] = digest(spec)
        record.update(base, observation_id=digest(obs))
        for name, value in (('batch', spec), ('attempt', attempt)):
            write_bundle(value, output / (name + '.json'))
        for name, value in (('started', base), ('record', record), ('observation', obs)):
            write_bundle(value, d / (name + '.json'))
        result = self.verify_read_only(output, pins)
        self.assertEqual(result['cell_coverage']['status'], 'INVALID')
        self.assertEqual(result['cell_coverage']['certified'], 1)
        self.assertEqual(cli('verify', '--pins', frozen / 'pins.json', '--output', output).returncode, 2)

    def test_17_predicate_conjunction_requires_one_common_witness(self):
        both = component('reach_by', time=3, key='together')
        both['equals'] = {'flag': True, 'latch': True}
        p = problem(both, component('reach_by', time=3, key='flag_ever'),
                    component('reach_by', field='latch', time=3, key='latch_ever'),
                    component('always', value=0, field='count'), initial=False)
        event(p, 'flag_on', 1, True)
        event(p, 'switch', 2, False)
        p['model']['events']['switch']['outcomes']['apply']['set']['latch'] = True
        obs = self.single(p)
        self.assertEqual([c['satisfied'] for c in obs['paths'][0]['components']], [False, True, True, True])
        self.assertFalse(obs['goal_satisfied'])

    def test_18_direct_observer_cannot_project_uncertified_bundle(self):
        from observe import observe
        from contracts import materialize
        from audit.verify import audit_bundle
        p = problem(component('reach_by', time=0))
        effective = contracts.effective_problem(p, p['scenario_set']['members'][0])
        run_input = materialize(effective, ['D'])
        bundle = replay_module.replay(run_input, dict(LIMITS, max_steps=1))
        audit = audit_bundle(bundle, digest(run_input))
        with patch('observe.components_for_path', side_effect=AssertionError('partial proof attempted')):
            with self.assertRaisesRegex(ValueError, 'complete audit certification'):
                observe(effective, bundle, run_input, audit, 'runtime', 'build')

    def test_19_documented_fixture_literal_evidence(self):
        p = read_bundle(ROOT / 'fixtures/temporal-problem.json')
        obs = self.single(p)
        path = obs['paths'][0]
        self.assertEqual([c['satisfied'] for c in path['components']], [True, False, True, True, False])
        self.assertTrue(path['all_attempts_accepted'])
        self.assertFalse(obs['goal_satisfied'])
        terminal, always, reach, stable, absent = path['components']
        self.assertEqual(terminal['evidence']['points'], [{'row_index': 22, 'side': 'after', 'step': 4}])
        expected = {'row_index': 6, 'side': 'after', 'step': 1,
                    'state': {'flag': False, 'latch': False, 'count': 0}}
        self.assertEqual(always['evidence']['counterexample'], expected)
        self.assertEqual(reach['evidence']['witness'], expected)
        for c in (stable, absent):
            self.assertEqual(c['evidence']['interval'], [0, 4])
            self.assertEqual(len(c['evidence']['points']), 46)
        self.assertNotIn('witness', absent['evidence'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
