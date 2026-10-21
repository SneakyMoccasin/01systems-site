"""Bounded independent review of R1; all run packages live in temporary dirs.

The old revision is exported via git show, never checked out. Prefix expectations
come from declaration-only recursive words, not the production prefix helper,
generator, saved enumeration, or manifest order. No certification is mocked.
"""
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(os.environ.get('CE3_BUDGET_REVIEW_SOURCE', Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(SOURCE))
import contracts
import runner
import scenario_contracts
import scenario_runner
from bridge import digest, read_bundle, write_bundle


def declaration_order(problem):
    def words(remaining, prefix=()):
        if not remaining:
            yield prefix
        for name in remaining:
            yield from words([x for x in remaining if x != name], prefix + (name,))
    labels = [s['label'] for s in problem['scenario_set']['members']] if 'scenario_set' in problem else [None]
    return [(word, label) for word in words(sorted(problem['search']['decision_ids'])) for label in labels]


def logical(row):
    return tuple(row['order']), row.get('scenario_label')


def semantic(result, case):
    rows = result[case['rows']]
    return dict(goals=sorted((list(r['order']), r.get('scenario_label', ''),
                             r['run_status'], r['goal_status'], r['goal_satisfied'],
                             None if case['single'] else r['event_path_coverage']) for r in rows),
                robust=[] if case['single'] else sorted((r['order'], r['robust']) for r in result['candidates']))


def make_case(label, fixture, base, problem=None, budget=None):
    single = label == 'explorer1'
    api, contract = (runner, contracts) if single else (scenario_runner, scenario_contracts)
    problem = read_bundle(SOURCE / 'fixtures' / fixture) if problem is None else problem
    manifest, pins = contract.freeze(problem)
    # External pins remain outside the attacked run package.
    pin_path = base / (label + '-pins.json')
    write_bundle(pins, pin_path)
    output = base / label
    field = 'max_candidates' if single else 'max_cells'
    result = api.run(problem, manifest, pins, output, **({field: budget} if budget is not None else {}))
    return dict(label=label, single=single, api=api, problem=problem, pins=pins,
                pin_path=pin_path, root=output, result=result, budget=field,
                rows='candidates' if single else 'cells',
                key='candidate_id' if single else 'cell_id',
                coverage='search_coverage' if single else 'cell_coverage')


def full_cases(base):
    return [make_case(label, fixture, base) for label, fixture in (
        ('explorer1', 'problem.json'), ('scenario1', 'scenario-problem.json'),
        ('scenario2', 'fixed-slots-problem.json'))]


def rebind(root, case, budget):
    spec_path = root / ('search.json' if case['single'] else 'batch.json')
    spec = read_bundle(spec_path)
    spec[case['budget']] = budget
    write_bundle(spec, spec_path)
    binding = 'search_execution_id' if case['single'] else 'batch_spec_id'
    paths = list((root / 'runs').glob('*/started.json')) + list((root / 'runs').glob('*/record.json'))
    if not case['single']:
        paths += [root / 'attempt.json']
        for obs_path in (root / 'runs').glob('*/observation.json'):
            obs = read_bundle(obs_path)
            obs[binding] = digest(spec)
            write_bundle(obs, obs_path)
    for path in paths:
        value = read_bundle(path)
        value[binding] = digest(spec)
        if path.name == 'record.json' and not case['single']:
            value['observation_id'] = digest(read_bundle(path.parent / 'observation.json'))
        write_bundle(value, path)


def cli(case, root):
    return subprocess.run([sys.executable, '-B', str(SOURCE / ('runner.py' if case['single'] else 'scenario_runner.py')),
                           'verify', '--output', str(root), '--pins', str(case['pin_path'])],
                          capture_output=True, text=True, timeout=120)


def snapshot(root):
    return {str(p.relative_to(root)): ('dir' if p.is_dir() else hashlib.sha256(p.read_bytes()).hexdigest())
            for p in root.rglob('*')}


def old_worker(base):
    report = {}
    for case in full_cases(base):
        full = case['result']
        rebind(case['root'], case, 0)
        zero = case['api'].verify(case['root'], case['pins'])
        process = cli(case, case['root'])
        report[case['label']] = dict(full_status=full[case['coverage']]['status'],
                                    zero_status=zero[case['coverage']]['status'], exit=process.returncode,
                                    full=semantic(full, case), zero=semantic(zero, case))
    (base / 'legacy-results.json').write_text(json.dumps(report))


class BudgetReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ce3-independent-budget-')
        cls.base = Path(cls.temp.name)
        cls.cases = full_cases(cls.base)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def verify_read_only(self, case, root):
        before = snapshot(root)
        with patch.object(case['api'], 'cli_process', side_effect=AssertionError('replay forbidden')), \
             patch('subprocess.run', side_effect=AssertionError('subprocess forbidden')), \
             patch('core.replay.replay', side_effect=AssertionError('in-process replay forbidden')):
            result = case['api'].verify(root, case['pins'])
        self.assertEqual(snapshot(root), before)
        return result

    def test_01_previous_code_accepts_zero_current_rejects_without_goal_changes(self):
        repo = Path(__file__).resolve().parents[3]
        old = self.base / 'old-source'
        # Minimal pristine runtime export, including all hashed source files.
        paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '362f647', '--',
                                         'isolated-tests/structural-ce3-explorer',
                                         'isolated-tests/structural-ce3-replay'], cwd=repo, text=True).splitlines()
        for name in paths:
            p = Path(name)
            tail = p.parts[2:]
            keep = (p.parts[1] == 'structural-ce3-explorer' and
                    ((len(tail) == 1 and p.suffix == '.py') or tail[0] == 'fixtures')) or (
                        p.parts[1] == 'structural-ce3-replay' and
                        (tail[0] in ('core', 'audit') or tail == ('cli.py',)))
            if keep:
                dest = old / p
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(subprocess.check_output(['git', 'show', '362f647:' + name], cwd=repo))
        out = self.base / 'old-runs'
        out.mkdir()
        env = dict(os.environ, CE3_BUDGET_REVIEW_SOURCE=str(old / 'isolated-tests/structural-ce3-explorer'))
        process = subprocess.run([sys.executable, '-B', str(Path(__file__).resolve()), '--legacy-worker', str(out)],
                                 env=env, capture_output=True, text=True, timeout=180)
        self.assertEqual(process.returncode, 0, process.stderr)
        legacy = json.loads((out / 'legacy-results.json').read_text())
        for case in self.cases:
            with self.subTest(contract=case['label']):
                prior = legacy[case['label']]
                self.assertEqual((prior['full_status'], prior['zero_status'], prior['exit']), ('COMPLETE', 'COMPLETE', 0))
                self.assertEqual(prior['full'], prior['zero'])
                full = self.verify_read_only(case, case['root'])
                self.assertEqual(full, case['result'])
                self.assertEqual(full[case['coverage']]['status'], 'COMPLETE')
                self.assertEqual(cli(case, case['root']).returncode, 0)
                self.assertEqual(json.loads(json.dumps(semantic(full, case))), prior['full'])
                root = self.base / (case['label'] + '-zero')
                shutil.copytree(case['root'], root)
                rebind(root, case, 0)
                result = self.verify_read_only(case, root)
                self.assertEqual(result[case['coverage']]['status'], 'INVALID')
                self.assertEqual(semantic(result, case), semantic(full, case))
                self.assertEqual(cli(case, root).returncode, 2)
                print(case['label'], 'legacy COMPLETE/0 -> current INVALID/2; all goals unchanged', flush=True)

    def test_02_declared_prefix_reversed_scenarios_and_unsorted_ids(self):
        for base_case in self.cases[1:]:
            problem = deepcopy(base_case['problem'])
            problem['scenario_set']['members'].reverse()
            if problem['schema_version'].endswith('/2'):
                problem['search']['decision_ids'] = ['X', 'T', 'Q', 'P']
            expected = declaration_order(problem)
            case = make_case(base_case['label'] + '-reversed', '', self.base, problem, 5)
            rows = case['result']['cells']
            by_logical = {logical(row): row['cell_id'] for row in rows}
            self.assertEqual(len(by_logical), len(expected))
            self.assertEqual(set(by_logical), set(expected))
            ids = [by_logical[item] for item in expected]
            self.assertEqual({logical(r) for r in rows if r['run_status'] == 'CERTIFIED'}, set(expected[:5]))
            for wrong in (False, True):
                with self.subTest(contract=base_case['label'], wrong_prefix=wrong):
                    root = self.base / (case['label'] + ('-wrong' if wrong else '-valid'))
                    shutil.copytree(case['root'], root)
                    rebind(root, case, 4)
                    shutil.rmtree(root / 'runs' / ids[3 if wrong else 4])
                    enumeration = read_bundle(root / 'enumeration.json')
                    enumeration.reverse()
                    write_bundle(enumeration, root / 'enumeration.json')
                    # Malformed stale summary must neither be read nor rewritten.
                    (root / 'result.json').write_text('{stale invalid JSON')
                    result = self.verify_read_only(case, root)
                    self.assertEqual(result['cell_coverage']['status'], 'INVALID' if wrong else 'INCOMPLETE')
                    self.assertEqual(result['enumeration_coverage']['status'], 'COMPLETE')
                    self.assertEqual(result['cell_coverage']['certified'], 4)
                    self.assertEqual(len(result['cells']), len(expected))
                    for row in result['cells']:
                        if row['run_status'] != 'CERTIFIED':
                            self.assertEqual((row['run_status'], row['goal_status'], row['goal_satisfied']),
                                             ('NOT_RUN', 'UNKNOWN', None))
                    self.assertEqual(cli(case, root).returncode, 2)

    def test_03_stale_result_cannot_change_full_or_invalid_result(self):
        for case in self.cases:
            root = self.base / (case['label'] + '-stale')
            shutil.copytree(case['root'], root)
            (root / 'result.json').write_text('{broken summary')
            self.assertEqual(self.verify_read_only(case, root), case['result'])
            rebind(root, case, 0)
            write_bundle(case['result'], root / 'result.json')  # old COMPLETE
            result = self.verify_read_only(case, root)
            self.assertEqual(result[case['coverage']]['status'], 'INVALID')
            self.assertEqual(semantic(result, case), semantic(case['result'], case))


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--legacy-worker':
        old_worker(Path(sys.argv[2]))
    else:
        unittest.main(verbosity=2)
