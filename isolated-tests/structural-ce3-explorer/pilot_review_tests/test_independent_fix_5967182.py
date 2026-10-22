"""Independent bounded review of 5967182; no implementer test helpers imported.

The shipped generator supplies INPUT for the required 12-cell reproduction.
Expected outcomes, receipt writer, mutations and digest checks are authored here.
All persons/responses are fabricated, including tests of real-case declarations.
Set REVIEW_EVIDENCE to a new directory to retain CLI logs and test artifacts.
"""
from contextlib import ExitStack
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

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import pilot_contract as C
import pilot_runner as P
import scenario_contracts as S
import scenario_runner as E

FAKE = dict(case_kind='fabricated_exercise', receipt_origin='fabricated_test')
REAL = dict(case_kind='declared_real_case', receipt_origin='declared_actual_response')
ACK = ['scope', 'model_mapping', 'assumptions', 'issues', 'goals', 'scenarios',
       'selection_and_prefix_times', 'limits_and_budget', 'human_responsibility',
       'classification_and_receipt_origin']


def raw(value):
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')) + '\n').encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_bytes())


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw(value))


def descriptor(path, root):
    return dict(path=str(path.relative_to(root)), sha256=sha(path.read_bytes()))


def record_for(prepared, receipt, value=None, content=None):
    path = prepared / 'materials' / receipt['record']['path']
    if content is None:
        if value is None:
            value = {k: v for k, v in receipt.items() if k != 'record'}
            value['schema_version'] = 'ce3-pilot-confirmation-record/1'
        content = raw(value)
    path.write_bytes(content)
    receipt['record'] = descriptor(path, prepared / 'materials')


def author_receipts(prepared):
    """Independent JSON author; intentionally cannot establish actual consent."""
    snapshot = read(prepared / 'snapshot.json')
    result = []
    for role in ['domain_review', 'customer_confirmation']:
        support = prepared / 'materials' / 'independent' / (role + '.txt')
        support.parent.mkdir(parents=True, exist_ok=True)
        support.write_bytes(b'FABRICATED REVIEW DATA: not an actual customer response.\n')
        receipt = dict(schema_version='ce3-pilot-receipt/2', kind=role, decision='approved',
                       classification=deepcopy(snapshot['classification']), snapshot_id=sha(raw(snapshot)),
                       presentation_sha256=sha((prepared / 'review.html').read_bytes()),
                       stated_person='FIKTIV independent reviewer', stated_role=role,
                       recorded_by='FIKTIV test recorder', recorded_at='2026-10-22T17:00:00+02:00',
                       statement='FABRICERAT granskningskvitto; inga faktiska kunder.',
                       acknowledgements=ACK[:], assumption_ids=sorted(a['id'] for a in snapshot['assumptions']),
                       supporting_records=[descriptor(support, prepared / 'materials')],
                       record={'path': 'independent/' + role + '.json', 'sha256': ''})
        record_for(prepared, receipt)
        result.append(receipt)
    return result


def inventory(root):
    return {str(p.relative_to(root)): (sha(p.read_bytes()), p.stat().st_mtime_ns, p.stat().st_mode)
            for p in root.rglob('*') if p.is_file()}


class IndependentFixReview(unittest.TestCase):
    @classmethod
    def command(cls, script, *args):
        argv = [sys.executable, '-B', str(ROOT / script), *map(str, args)]
        response = subprocess.run(argv, capture_output=True, text=True, timeout=45)
        cls.commands.append(dict(argv=argv, exit=response.returncode,
                                 stdout=response.stdout, stderr=response.stderr))
        save(cls.root / 'commands.json', cls.commands)
        return response

    @classmethod
    def setUpClass(cls):
        cls.temp = None
        if os.environ.get('REVIEW_EVIDENCE'):
            cls.root = Path(os.environ['REVIEW_EVIDENCE'])
            cls.root.mkdir(parents=True, exist_ok=False)
        else:
            cls.temp = tempfile.TemporaryDirectory(prefix='ce3-fix-independent-5967182-')
            cls.root = Path(cls.temp.name)
        cls.commands = []
        cls.anchor = cls.root / 'external-anchor.json'
        steps = [ ('pilot_examples/example.py', '--output', cls.root / 'draft'),
                  ('pilot_runner.py', 'prepare', '--draft', cls.root / 'draft/draft.json', '--materials', cls.root / 'draft/materials', '--output', cls.root / 'prepared'),
                  ('pilot_examples/example.py', '--fabricated-receipts-for', cls.root / 'prepared', '--output', cls.root / 'receipts.json'),
                  ('pilot_runner.py', 'freeze', '--prepared', cls.root / 'prepared', '--receipts', cls.root / 'receipts.json', '--output', cls.root / 'frozen', '--anchor', cls.anchor),
                  ('pilot_runner.py', 'run', '--frozen', cls.root / 'frozen', '--anchor', cls.anchor, '--output', cls.root / 'run'),
                  ('pilot_runner.py', 'verify', '--output', cls.root / 'run', '--anchor', cls.anchor)]
        cls.outputs = []
        for step in steps:
            response = cls.command(*step)
            if response.returncode != 0:
                raise AssertionError(response.stderr)
            cls.outputs.append(response.stdout)
        cls.result = json.loads(cls.outputs[-1])
        cls.receipts = read(cls.root / 'receipts.json')
        cls.draft = read(cls.root / 'draft/draft.json')

    @classmethod
    def tearDownClass(cls):
        if cls.temp:
            cls.temp.cleanup()

    def setUp(self):
        self.work = self.root / self._testMethodName
        self.work.mkdir()

    def copy(self, name, suffix=''):
        return Path(shutil.copytree(self.root / name, self.work / (name + suffix)))

    def reject(self, prepared, receipts, suffix=''):
        receipt_file = self.work / ('receipts' + suffix + '.json')
        save(receipt_file, receipts)
        output, anchor = self.work / ('rejected' + suffix), self.work / ('anchor' + suffix)
        response = self.command('pilot_runner.py', 'freeze', '--prepared', prepared,
                                '--receipts', receipt_file, '--output', output, '--anchor', anchor)
        self.assertEqual(response.returncode, 1, response.stderr)
        self.assertEqual(response.stdout, '')
        self.assertFalse(output.exists())
        self.assertFalse(anchor.exists())
        return response

    def test_01_fresh_cli_oracle_and_complete_classification_chain(self):
        expected = {(plan, scenario): plan == 'PN' or (plan == 'PU' and scenario == 'approved')
                    for plan in ['NP', 'PN', 'PU', 'UP'] for scenario in ['approved', 'rejected', 'absent']}
        cells = self.result['explorer_result']['cells']
        self.assertEqual({(''.join(c['order']), c['scenario_label']): c['goal_satisfied'] for c in cells}, expected)
        self.assertEqual(len(cells), 12)
        self.assertEqual(sum(c['run_status'] == 'CERTIFIED' for c in cells), 12)
        self.assertEqual(sum(c['goal_satisfied'] is True for c in cells), 4)
        self.assertEqual([c['order'] for c in self.result['goal_status'] if c['robust'] == 'TRUE'], [['P', 'N']])
        self.assertEqual(json.loads(self.outputs[-2]), self.result)
        self.assertEqual(read(self.root / 'run/result.json'), self.result)
        case = read(self.root / 'frozen/case.json')
        spec = read(self.root / 'frozen/batch.json')
        values = [self.draft, case['snapshot'], case, read(self.anchor), spec['pilot_binding'],
                  self.result, self.result['explorer_result']['pilot_binding'], *case['receipts']]
        for receipt in case['receipts']:
            values.append(read(self.root / 'frozen/materials' / receipt['record']['path']))
        for value in values:
            self.assertEqual(value['classification'], FAKE)
        for index in [1, 3, 4, 5]:
            self.assertIn('FABRICERAD ÖVNING', self.outputs[index])
            self.assertIn('inte en genomförd kundpilot', self.outputs[index])
        self.assertEqual(sha(raw(case)), self.result['pilot_case_id'])
        self.assertEqual(sha(raw(case['snapshot'])), self.result['snapshot_id'])
        self.assertEqual(sha(raw(spec)), self.result['batch_spec_id'])
        for cell in cells:
            for name in ['started.json', 'record.json']:
                self.assertEqual(read(self.root / 'run/explorer/runs' / cell['cell_id'] / name)['batch_spec_id'], sha(raw(spec)))

    def test_02_original_not_approved_attack_cli(self):
        prepared = self.copy('prepared')
        receipts = deepcopy(self.receipts)
        for receipt in receipts:
            record = read(prepared / 'materials' / receipt['record']['path'])
            record.update(decision='not_approved', acknowledgements=[])
            record_for(prepared, receipt, record)
        response = self.reject(prepared, receipts)
        self.assertIn('Structured confirmation record differs', response.stderr)

    def test_03_each_confirmation_field_typed_exact_and_no_missing_extra(self):
        prepared = self.copy('prepared')
        good = author_receipts(prepared)
        fields = [k for k in good[0] if k not in ['record', 'schema_version']]
        for field in fields:
            original = read(prepared / 'materials' / good[0]['record']['path'])
            for mode in ['missing', 'null', 'boolean', 'array', 'object', 'different']:
                with self.subTest(field=field, mode=mode):
                    receipts = deepcopy(good)
                    record = deepcopy(original)
                    if mode == 'missing':
                        del record[field]
                    else:
                        record[field] = {'null': None, 'boolean': True, 'array': [], 'object': {}, 'different': 'contradiction'}[mode]
                    record_for(prepared, receipts[0], record)
                    with self.assertRaises((ValueError, TypeError, KeyError)):
                        P.freeze(prepared, receipts, self.work / 'bad', self.work / 'bad.anchor')
            record_for(prepared, good[0], original)
        receipts = deepcopy(good)
        record = read(prepared / 'materials' / receipts[0]['record']['path'])
        record['override'] = 'approved'
        record_for(prepared, receipts[0], record)
        self.reject(prepared, receipts)

    def test_04_duplicate_escaped_nested_keys_and_nonfinite_cli(self):
        prepared = self.copy('prepared')
        receipts = deepcopy(self.receipts)
        path = prepared / 'materials' / receipts[0]['record']['path']
        original = path.read_bytes()
        variants = [original.replace(b'"decision":"approved"', b'"decision":"not_approved","deci\\u0073ion":"approved"'),
                    original.replace(b'"receipt_origin":"fabricated_test"', b'"receipt_origin":"fabricated_test","receipt_origin":"fabricated_test"'),
                    original.replace(b'"sha256":', b'"path":"unrelated","sha256":', 1),
                    original.replace(b'"decision":"approved"', b'"decision":NaN')]
        for index, content in enumerate(variants):
            with self.subTest(index=index):
                self.assertNotEqual(content, original)
                record_for(prepared, receipts[0], content=content)
                self.reject(prepared, receipts, str(index))
        record_for(prepared, receipts[0], content=original)
        path = self.work / 'duplicate-receipts.json'
        path.write_bytes(raw(receipts).replace(b'"decision":"approved"', b'"decision":"not_approved","decision":"approved"', 1))
        response = self.command('pilot_runner.py', 'freeze', '--prepared', prepared, '--receipts', path,
                                '--output', self.work / 'bad', '--anchor', self.work / 'bad.anchor')
        self.assertEqual(response.returncode, 1)
        self.assertIn('Duplicate', response.stderr)

    def test_05_agreeing_but_invalid_scope_assumptions_decisions(self):
        prepared = self.copy('prepared')
        for index, (field, value) in enumerate([
                ('decision', 'not_approved'), ('decision', True), ('decision', ['approved']),
                ('decision', 'approved\u0000'), ('decision', 'Approved'),
                ('acknowledgements', ACK[::-1]), ('acknowledgements', ACK[:-1]),
                ('assumption_ids', []), ('assumption_ids', ['time-hypothesis', 'time-hypothesis']),
                ('assumption_ids', [1]), ('supporting_records', []), ('supporting_records', {}),
                ('supporting_records', [self.receipts[0]['supporting_records'][0]] * 2)]):
            with self.subTest(field=field, value=value):
                receipts = deepcopy(self.receipts)
                receipts[0][field] = value
                record_for(prepared, receipts[0])
                self.reject(prepared, receipts, str(index))

    def test_06_prose_is_not_machine_approval_or_authenticated_consent(self):
        prepared = self.copy('prepared')
        receipts = author_receipts(prepared)
        receipt = receipts[0]
        support = prepared / 'materials' / receipt['supporting_records'][0]['path']
        support.write_bytes(b'not_approved: NO. FABRICATED TEST OF HUMAN TRANSCRIPTION LIMIT.\xff')
        receipt['supporting_records'] = [descriptor(support, prepared / 'materials')]
        record_for(prepared, receipt)
        # Deliberately inconsistent human prose is opaque: this is NOT actual consent.
        P.freeze(prepared, receipts, self.work / 'structurally-valid', self.work / 'external')
        record_for(prepared, receipt, content=b'approved\n' + raw(receipt))
        self.reject(prepared, receipts, 'prose-as-record')
        receipt['decision'] = 'not_approved'
        support.write_bytes(b'approved approved approved')
        receipt['supporting_records'] = [descriptor(support, prepared / 'materials')]
        record_for(prepared, receipt)
        self.reject(prepared, receipts, 'prose-cannot-override')

    def test_07_original_symlinked_pilot_package_anchor_cli(self):
        target = self.copy('run')
        outside = self.work / 'relocated-pilot'
        (target / 'pilot').rename(outside)
        (target / 'pilot').symlink_to(outside, target_is_directory=True)
        shutil.copyfile(self.anchor, outside / 'package-owned-anchor.json')
        response = self.command('pilot_runner.py', 'verify', '--output', target,
                                '--anchor', target / 'pilot/package-owned-anchor.json')
        self.assertEqual(response.returncode, 1)
        self.assertIn('Symlink package entry', response.stderr)
        self.assertEqual(response.stdout, '')

    def test_08_all_stages_reject_unreferenced_fifo_and_dangling_cli(self):
        for stage, source in [('prepare', 'draft'), ('freeze', 'prepared'), ('run', 'frozen'), ('verify', 'run')]:
            for kind in ['fifo', 'dangling']:
                with self.subTest(stage=stage, kind=kind):
                    target = self.copy(source, stage + kind)
                    entry = target / ('materials/extra' if stage == 'prepare' else 'extra')
                    if kind == 'fifo':
                        os.mkfifo(entry)
                    else:
                        entry.symlink_to(self.work / 'absent')
                    output = self.work / (stage + kind + '-out')
                    if stage == 'prepare':
                        args = ['--draft', target / 'draft.json', '--materials', target / 'materials', '--output', output]
                    elif stage == 'freeze':
                        args = ['--prepared', target, '--receipts', self.root / 'receipts.json', '--output', output, '--anchor', self.work / (stage + kind + '-anchor')]
                    elif stage == 'run':
                        args = ['--frozen', target, '--anchor', self.anchor, '--output', output]
                    else:
                        args = ['--output', target, '--anchor', self.anchor]
                    response = self.command('pilot_runner.py', stage, *args)
                    self.assertEqual(response.returncode, 1, response.stderr)
                    self.assertRegex(response.stderr, 'Special package files|Symlink package entry')
                    self.assertFalse(output.exists())

    def test_09_shared_admission_revalidates_whole_case_tree(self):
        frozen = self.copy('frozen')
        admission = C.Admission(frozen)
        case = read(frozen / 'case.json')
        problem, execution = case['snapshot']['problem'], case['snapshot']['execution']
        manifest, pins = S.freeze(problem, _admission=admission)
        # A previously valid handle must not ignore subsequently added invalid entries.
        (frozen / 'unreferenced-link').symlink_to(self.work / 'missing')
        calls = [lambda: C.Admission(frozen), lambda: admission.validate(problem),
                 lambda: admission.binding(problem, execution['limits'], execution['max_cells']),
                 lambda: S.freeze(problem, _admission=admission),
                 lambda: S.generate(problem, _admission=admission),
                 lambda: E.run(problem, manifest, pins, self.work / 'bad-run', limits=execution['limits'], max_cells=execution['max_cells'], _admission=admission),
                 lambda: E.verify(self.root / 'run/explorer', pins, _admission=admission)]
        for index, call in enumerate(calls):
            with self.subTest(index=index), self.assertRaisesRegex(ValueError, 'Symlink'):
                call()
        self.assertFalse((self.work / 'bad-run').exists())

    def test_10_external_anchor_forms_and_internal_aliases_cli(self):
        target = self.copy('run')
        good_symlink, good_hardlink = self.work / 'external-symlink', self.work / 'external-hardlink'
        good_symlink.symlink_to(self.anchor)
        os.link(self.anchor, good_hardlink)
        for anchor in [self.anchor, os.path.relpath(self.anchor), good_symlink, good_hardlink]:
            response = self.command('pilot_runner.py', 'verify', '--output', target, '--anchor', anchor)
            self.assertEqual(response.returncode, 0, response.stderr)
            self.assertEqual(json.loads(response.stdout), self.result)
        own = target / 'distinct-owned-copy'
        shutil.copyfile(self.anchor, own)
        bad_symlink, bad_hardlink = self.work / 'bad-symlink', self.work / 'bad-hardlink'
        bad_symlink.symlink_to(target / 'pilot/anchor-copy.json')
        os.link(target / 'pilot/anchor-copy.json', bad_hardlink)
        for anchor in [own, target / 'pilot/anchor-copy.json', bad_symlink, bad_hardlink]:
            response = self.command('pilot_runner.py', 'verify', '--output', target, '--anchor', anchor)
            self.assertEqual(response.returncode, 1, response.stderr)
        parent = self.work / 'parent-alias'
        parent.symlink_to(self.root, target_is_directory=True)
        self.assertEqual(P.verify(parent / 'run', self.anchor), self.result)

    def test_11_stale_mixed_and_fully_rehashed_classification(self):
        prepared = self.copy('prepared')
        snapshot = read(prepared / 'snapshot.json')
        snapshot['classification'] = REAL
        save(prepared / 'snapshot.json', snapshot)
        (prepared / 'review.html').write_bytes(C.presentation(snapshot))
        self.reject(prepared, self.receipts, 'stale')
        receipts = deepcopy(self.receipts)
        for receipt in receipts:
            receipt.update(classification=REAL, snapshot_id=sha(raw(snapshot)),
                           presentation_sha256=sha((prepared / 'review.html').read_bytes()))
        self.reject(prepared, receipts, 'updated-outer-old-record')
        # Entirely new consistent but fabricated declarations are structurally possible.
        receipts = author_receipts(prepared)
        P.freeze(prepared, receipts, self.work / 'new-frozen', self.work / 'new-anchor')
        with self.assertRaisesRegex(ValueError, 'anchor mismatch'):
            P.run(self.work / 'new-frozen', self.anchor, self.work / 'bad-run')
        with self.assertRaises(ValueError):
            P.verify(self.root / 'run', self.work / 'new-anchor')
        new = P.run(self.work / 'new-frozen', self.work / 'new-anchor', self.work / 'new-run')
        self.assertEqual(new['classification'], REAL)
        self.assertIn('inte autentiserade', new['case_notice'])
        self.assertEqual(new['identity_assurance'], 'self_reported_not_authenticated')
        for receipt in receipts:
            receipt['classification'] = FAKE
            record_for(prepared, receipt)
        self.reject(prepared, receipts, 'mixed-receipt-and-snapshot')
        for kind, origin in [('declared_real_case', 'fabricated_test'), ('fabricated_exercise', 'declared_actual_response')]:
            draft = deepcopy(self.draft)
            draft['classification'] = dict(case_kind=kind, receipt_origin=origin)
            with self.assertRaisesRegex(ValueError, 'cannot be mixed'):
                P.prepare(draft, self.root / 'draft/materials', self.work / 'invalid-draft')
        # Rehash the entire top-level pilot package around old cells: still no certification.
        target = self.copy('run')
        (target / 'pilot').rename(self.work / 'retained-old-pilot')
        shutil.copytree(self.work / 'new-frozen', target / 'pilot')
        spec = read(target / 'pilot/batch.json')
        save(target / 'explorer/batch.json', spec)
        attempt = read(target / 'explorer/attempt.json')
        attempt['batch_spec_id'] = sha(raw(spec))
        save(target / 'explorer/attempt.json', attempt)
        result = P.verify(target, self.work / 'new-anchor')
        self.assertTrue(all(c['run_status'] == 'UNVERIFIED' and c['goal_satisfied'] is None for c in result['explorer_result']['cells']))
        self.assertNotEqual(result['search_coverage']['status'], 'COMPLETE')

    def test_12_generator_refuses_real_case_without_writing_receipts(self):
        draft = deepcopy(self.draft)
        draft['classification'] = REAL
        prepared = self.work / 'real-prepared'
        P.prepare(draft, self.root / 'draft/materials', prepared)
        before = inventory(prepared)
        response = self.command('pilot_examples/example.py', '--fabricated-receipts-for', prepared,
                                '--output', self.work / 'forbidden-receipts.json')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn('Fabricated receipts cannot confirm a declared real case', response.stderr)
        self.assertFalse((self.work / 'forbidden-receipts.json').exists())
        self.assertEqual(inventory(prepared), before)

    def test_13_v1_versions_rejected_without_migration(self):
        draft = deepcopy(self.draft)
        draft['schema_version'] = 'ce3-pilot-draft/1'
        path = self.work / 'v1-draft.json'
        save(path, draft)
        response = self.command('pilot_runner.py', 'prepare', '--draft', path, '--materials', self.root / 'draft/materials', '--output', self.work / 'bad')
        self.assertEqual(response.returncode, 1)
        self.assertIn('Unsupported pilot draft', response.stderr)
        for level in ['snapshot', 'case', 'receipt', 'binding', 'anchor']:
            with self.subTest(level=level):
                frozen = self.copy('frozen', level)
                anchor = self.work / (level + '.anchor')
                shutil.copyfile(self.anchor, anchor)
                if level == 'anchor':
                    value = read(anchor)
                    value['schema_version'] = 'ce3-pilot-anchor/1'
                    save(anchor, value)
                elif level == 'binding':
                    value = read(frozen / 'batch.json')
                    value['pilot_binding']['schema_version'] = 'ce3-pilot-binding/1'
                    save(frozen / 'batch.json', value)
                else:
                    value = read(frozen / 'case.json')
                    node = value if level == 'case' else value['snapshot'] if level == 'snapshot' else value['receipts'][0]
                    node['schema_version'] = 'ce3-pilot-' + level + '/1'
                    save(frozen / 'case.json', value)
                before = inventory(frozen)
                response = self.command('pilot_runner.py', 'run', '--frozen', frozen, '--anchor', anchor, '--output', self.work / ('bad-' + level))
                self.assertEqual(response.returncode, 1)
                self.assertEqual(inventory(frozen), before)
                self.assertFalse((self.work / ('bad-' + level)).exists())

    def test_14_confirmed_presentation_limits_and_rehashed_forgery(self):
        prepared = self.copy('prepared')
        shown = (prepared / 'review.html').read_bytes()
        for text in ['60 sekunder per replay-/auditprocess', 'utanför batchens max_cells-budget',
                     'Ingen total väggklocksgaranti finns', 'FABRICERAD ÖVNING']:
            self.assertIn(text.encode(), shown)
        for receipt in self.receipts:
            self.assertEqual(receipt['presentation_sha256'], sha(shown))
        (prepared / 'review.html').write_bytes(shown.replace(b'60 sekunder', b'600 sekunder'))
        # Both receipt AND record now bind the forged HTML; rederivation must still reject it.
        receipts = author_receipts(prepared)
        response = self.reject(prepared, receipts)
        self.assertIn('Displayed snapshot differs', response.stderr)

    def test_15_verify_readonly_with_missing_or_lying_caches(self):
        target = self.copy('run')
        (target / 'result.json').write_bytes(b'{"schema_version":"ce3-pilot-result/1","classification":"real"}')
        (target / 'explorer/result.json').unlink()
        before = inventory(target)
        with ExitStack() as stack:
            for module in [P, E]:
                for name in ['write_bundle', 'cli_process']:
                    stack.enter_context(patch.object(module, name, side_effect=AssertionError('verify must not write/replay')))
            self.assertEqual(P.verify(target, self.anchor), self.result)
        response = self.command('pilot_runner.py', 'verify', '--output', target, '--anchor', self.anchor)
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual(json.loads(response.stdout), self.result)
        self.assertEqual(inventory(target), before)
        # File policy also covers an ignored cache, not just semantically consumed files.
        (target / 'result.json').unlink()
        (target / 'result.json').symlink_to(self.root / 'run/result.json')
        response = self.command('pilot_runner.py', 'verify', '--output', target, '--anchor', self.anchor)
        self.assertEqual(response.returncode, 1)
        self.assertIn('Symlink', response.stderr)

    def test_16_synthetic_purpose_gate_all_versions_and_shared_boolean(self):
        for name in ['problem', 'scenario-problem', 'fixed-slots-problem', 'temporal-problem', 'optional-decisions-problem']:
            problem = read(ROOT / 'fixtures' / (name + '.json'))
            problem['purpose'] = 'bounded_real_pilot'
            path = self.work / (name + '.json')
            save(path, problem)
            for operation in ['freeze', 'run']:
                target = self.work / (name + operation)
                response = self.command('runner.py' if name == 'problem' else 'scenario_runner.py', operation,
                                        '--problem', path, '--output', target)
                self.assertEqual(response.returncode, 1, response.stderr)
                self.assertIn('without explicit pilot admission', response.stderr)
                self.assertFalse(target.exists())
        with self.assertRaisesRegex(ValueError, 'Invalid pilot admission'):
            S.freeze(self.draft['problem'], _admission=True)


if __name__ == '__main__':
    unittest.main()
