"""Budget/prefix regressions across the existing single /1 and scenario /1,/2 paths.

Every artifact attack uses a fresh private copy and repairs budget bindings.
Goal evidence remains real CLI replay/audit output, not mocked certification.
"""
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, read_bundle, write_bundle
import contracts
import runner as single
import scenario_contracts
import scenario_runner as scenario


def rebind_budget(root, case, budget):
    name, field = case['spec'], case['budget']
    spec = read_bundle(root / name)
    spec[field] = budget
    write_bundle(spec, root / name)
    binding = 'search_execution_id' if case['single'] else 'batch_spec_id'
    if not case['single']:
        attempt = read_bundle(root / 'attempt.json')
        attempt[binding] = digest(spec)
        write_bundle(attempt, root / 'attempt.json')
    for directory in (root / 'runs').iterdir():
        for filename in ('started.json', 'record.json'):
            path = directory / filename
            if not path.exists():
                continue
            value = read_bundle(path)
            value[binding] = digest(spec)
            if filename == 'record.json' and not case['single']:
                obs = read_bundle(directory / 'observation.json')
                obs[binding] = digest(spec)
                write_bundle(obs, directory / 'observation.json')
                value['observation_id'] = digest(obs)
            write_bundle(value, path)


def tree(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}


class ExecutionBudget(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ce3-budget-regression-')
        cls.base = Path(cls.temp.name)
        cls.cases = []
        for label, fixture, api, contract in (
                ('single1', 'problem.json', single, contracts),
                ('scenario1', 'scenario-problem.json', scenario, scenario_contracts),
                ('scenario2', 'fixed-slots-problem.json', scenario, scenario_contracts)):
            problem = read_bundle(ROOT / 'fixtures' / fixture)
            manifest, pins = contract.freeze(problem)
            root = cls.base / label
            result = api.run(problem, manifest, pins, root)
            is_single = api is single
            rows = result['candidates' if is_single else 'cells']
            # Independent of saved enumeration and hash-sorted manifest cells.
            labels = [] if is_single else [s['label'] for s in problem['scenario_set']['members']]
            ordered = sorted(rows, key=lambda r: (r['order'], 0 if is_single else labels.index(r['scenario_label'])))
            key = 'candidate_id' if is_single else 'cell_id'
            cls.cases.append(dict(label=label, problem=problem, manifest=manifest, pins=pins,
                                  api=api, complete=root, result=result, single=is_single,
                                  ids=[r[key] for r in ordered], key=key,
                                  rows='candidates' if is_single else 'cells',
                                  coverage='search_coverage' if is_single else 'cell_coverage',
                                  spec='search.json' if is_single else 'batch.json',
                                  budget='max_candidates' if is_single else 'max_cells'))

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = self.base / self.id().split('.')[-1]
        self.serial = 0

    def destination(self, case):
        self.serial += 1
        return self.work / (case['label'] + '-' + str(self.serial))

    def clone(self, case, budget, keep=None):
        root = self.destination(case)
        shutil.copytree(case['complete'], root)
        rebind_budget(root, case, budget)
        if keep is not None:
            for directory in (root / 'runs').iterdir():
                if directory.name not in keep:
                    shutil.rmtree(directory)
        return root

    def check(self, case, root, status, count, certified):
        before = tree(root)
        with patch.object(case['api'], 'cli_process', side_effect=AssertionError('verify must not replay')):
            result = case['api'].verify(root, case['pins'])
        self.assertEqual(tree(root), before)
        runs = root / 'runs'
        self.assertEqual(len(list(runs.iterdir())) if runs.exists() else 0, count)
        rows = result[case['rows']]
        self.assertEqual(len(rows), len(case['ids']))
        self.assertEqual(sum(r['run_status'] == 'CERTIFIED' for r in rows), certified)
        for row in rows:
            if row['run_status'] != 'CERTIFIED':
                self.assertEqual(row['goal_status'], 'UNKNOWN')
                self.assertIsNone(row['goal_satisfied'])
        self.assertEqual(result[case['coverage']]['status'], 'INVALID' if status == 'INVALID' else
                         'COMPLETE' if certified == len(rows) else 'INCOMPLETE')
        return result

    def test_full_rehashed_to_zero_one_and_intermediate_budget(self):
        for case in self.cases:
            for budget in (0, 1, len(case['ids']) // 2):
                with self.subTest(contract=case['label'], budget=budget):
                    root = self.clone(case, budget)
                    result = self.check(case, root, 'INVALID', len(case['ids']), len(case['ids']))
                    self.assertEqual([r['goal_satisfied'] for r in result[case['rows']]],
                                     [r['goal_satisfied'] for r in case['result'][case['rows']]])
                    if not case['single']:
                        self.assertEqual(result['candidates'], case['result']['candidates'])
                    process = subprocess.run([sys.executable, '-B', str(ROOT / ('runner.py' if case['single'] else 'scenario_runner.py')),
                                              'verify', '--output', str(root), '--pins', str(root / 'pins.json')],
                                             capture_output=True, text=True, timeout=120)
                    self.assertEqual(process.returncode, 2, process.stderr)
                    self.assertIn('INVALID', process.stdout)

    def test_right_count_wrong_prefix_cannot_be_authorized_by_enumeration(self):
        for case in self.cases:
            for budget in (1, 4):
                with self.subTest(contract=case['label'], budget=budget):
                    keep = case['ids'][1:budget+1]
                    root = self.clone(case, budget, keep)
                    enumeration = read_bundle(root / 'enumeration.json')
                    enumeration.sort(key=lambda r: (r[case['key']] not in keep, r[case['key']]))
                    write_bundle(enumeration, root / 'enumeration.json')
                    result = self.check(case, root, 'INVALID', budget, budget)
                    self.assertEqual(result['enumeration_coverage']['status'], 'COMPLETE')

    def test_incomplete_and_failed_attempts_consume_budget_at_boundary(self):
        for case in self.cases:
            for evidence in ('empty', 'input.json', 'started.json', 'failure.json'):
                with self.subTest(contract=case['label'], evidence=evidence):
                    root = self.clone(case, 2, case['ids'][:2])
                    directory = root / 'runs' / case['ids'][1]
                    for path in directory.iterdir():
                        if path.name != evidence:
                            path.unlink()
                    if evidence == 'failure.json':
                        write_bundle({'status': 'UNVERIFIED', 'reason': 'interrupted replay'}, directory / evidence)
                    self.check(case, root, 'VALID', 2, 1)
                    rebind_budget(root, case, 1)
                    result = self.check(case, root, 'INVALID', 2, 1)
                    # Same count as budget but the only retained attempt is outside its prefix.
                    shutil.rmtree(root / 'runs' / case['ids'][0])
                    result = self.check(case, root, 'INVALID', 1, 0)

    def test_real_failure_does_not_refill_budget(self):
        for case in self.cases:
            with self.subTest(contract=case['label']):
                root = self.destination(case)
                original = case['api'].cli_process
                commands = []
                def fail_second_replay(command, *args):
                    commands.append(command)
                    if commands.count('replay') == 2:
                        raise subprocess.TimeoutExpired('replay', 60)
                    return original(command, *args)
                with patch.object(case['api'], 'cli_process', side_effect=fail_second_replay):
                    case['api'].run(case['problem'], case['manifest'], case['pins'], root, **{case['budget']: 2})
                self.assertEqual(commands, ['replay', 'audit', 'replay'])
                self.assertTrue((root / 'runs' / case['ids'][1] / 'failure.json').exists())
                self.check(case, root, 'VALID', 2, 1)
                rebind_budget(root, case, 1)
                self.check(case, root, 'INVALID', 2, 1)

    def test_genuine_partial_runs_keep_population_and_unknowns(self):
        for case in self.cases:
            for budget in (0, 1, 4):
                with self.subTest(contract=case['label'], budget=budget):
                    root = self.destination(case)
                    case['api'].run(case['problem'], case['manifest'], case['pins'], root, **{case['budget']: budget})
                    result = self.check(case, root, 'VALID', budget, budget)
                    self.assertEqual({r[case['key']] for r in result[case['rows']] if r['run_status'] == 'CERTIFIED'},
                                     set(case['ids'][:budget]))
                    self.assertEqual(sum(r['run_status'] == 'NOT_RUN' for r in result[case['rows']]), len(case['ids']) - budget)
                    if not case['single'] and budget == 0:
                        self.assertTrue(all(c['robust'] == 'UNKNOWN' for c in result['candidates']))

    def test_missing_evidence_inside_allowed_prefix_remains_unknown(self):
        for case in self.cases:
            with self.subTest(contract=case['label']):
                root = self.clone(case, 4, case['ids'][1:4])
                result = self.check(case, root, 'VALID', 3, 3)
                row = next(r for r in result[case['rows']] if r[case['key']] == case['ids'][0])
                self.assertEqual(row['run_status'], 'NOT_RUN')

    def test_full_runs_remain_complete_with_same_goal_evidence(self):
        for case in self.cases:
            with self.subTest(contract=case['label']):
                result = self.check(case, case['complete'], 'VALID', len(case['ids']), len(case['ids']))
                self.assertEqual(result, case['result'])
        fixed = self.cases[-1]['result']
        self.assertEqual(sum(c['goal_satisfied'] for c in fixed['cells']), 25)
        self.assertEqual(sum(c['event_path_coverage']['audited_paths'] for c in fixed['cells']), 90)
        self.assertEqual({''.join(c['order']) for c in fixed['candidates'] if c['robust'] == 'TRUE'},
                         {'PXQT', 'PXTQ', 'PTXQ', 'TPXQ', 'TXPQ'})

    def test_scenario_declaration_order_controls_partial_prefix(self):
        for case in self.cases[1:]:
            with self.subTest(contract=case['label']):
                problem = read_bundle(case['complete'] / 'problem.json')
                problem['scenario_set']['members'].reverse()
                manifest, pins = scenario_contracts.freeze(problem)
                root = self.destination(case)
                result = scenario.run(problem, manifest, pins, root, max_cells=1)
                self.assertEqual(result['cell_coverage']['status'], 'INCOMPLETE')
                certified = [c for c in result['cells'] if c['run_status'] == 'CERTIFIED']
                self.assertEqual(len(certified), 1)
                self.assertEqual(certified[0]['scenario_label'], problem['scenario_set']['members'][0]['label'])
                self.assertEqual(certified[0]['order'], sorted(problem['search']['decision_ids']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
