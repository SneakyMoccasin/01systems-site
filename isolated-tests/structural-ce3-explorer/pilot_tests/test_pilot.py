"""Admission/binding attacks plus actual CLI replay/audit; no fake engine results."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'pilot_examples'))
from bridge import digest, read_bundle, write_bundle
import pilot_contract as C
import pilot_runner as P
import scenario_contracts as S
import scenario_runner as E
import contracts
from example import draft_fixture, fabricated_receipts


def inventory(root):
    return {str(p.relative_to(root)): (hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns)
            for p in root.rglob('*') if p.is_file()}


class PilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        cls.draft = draft_fixture(cls.root / 'draft')
        P.prepare(cls.draft, cls.root / 'draft/materials', cls.root / 'prepared')
        cls.receipts = fabricated_receipts(cls.root / 'prepared')
        cls.anchor = cls.root / 'trusted-anchor.json'
        P.freeze(cls.root / 'prepared', cls.receipts, cls.root / 'frozen', cls.anchor)
        cls.result = P.run(cls.root / 'frozen', cls.anchor, cls.root / 'run')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(tempfile.mkdtemp(dir=self.root))

    def copy(self, name):
        return Path(shutil.copytree(self.root / name, self.work / name))

    def assert_invalid_case(self, case, materials=None, shown=None):
        with self.assertRaises((ValueError, OSError, KeyError, TypeError)):
            C.validate_case(case, materials or self.root / 'frozen/materials',
                            C.presentation(case['snapshot']) if shown is None else shown)

    def test_01_full_run_has_five_separate_axes_and_literal_goal_oracle(self):
        r = self.result
        self.assertEqual(r['pilot_status'], 'COMPLETE_CURRENT')
        self.assertEqual(r['run_status'], 'CERTIFIED')
        self.assertEqual(r['search_coverage']['status'], 'COMPLETE')
        self.assertEqual(r['execution_budget_status'], 'VALID')
        self.assertEqual(len(r['explorer_result']['cells']), 12)
        positives = {(('P', 'N'), s) for s in ('approved', 'rejected', 'absent')} | {(('P', 'U'), 'approved')}
        for cell in r['explorer_result']['cells']:
            self.assertEqual(cell['run_status'], 'CERTIFIED')
            self.assertEqual(cell['goal_satisfied'], (tuple(cell['order']), cell['scenario_label']) in positives)
            record = read_bundle(self.root / 'run/explorer' / cell['record_ref'])
            self.assertEqual(record['batch_spec_id'], r['batch_spec_id'])
            self.assertTrue((self.root / 'run/explorer' / cell['record_ref']).exists())
        self.assertEqual([c['order'] for c in r['goal_status'] if c['robust'] == 'TRUE'], [['P', 'N']])
        self.assertEqual(P.verify(self.root / 'run', self.anchor), r)

    def test_02_synthetic_entry_points_still_reject_purpose_and_pilot_context_requires_package(self):
        for name in ('problem', 'scenario-problem', 'fixed-slots-problem', 'temporal-problem', 'optional-decisions-problem'):
            path = ROOT / 'fixtures' / (name + '.json')
            if not path.exists():
                self.fail('Expected legacy fixture: ' + str(path))
            problem = read_bundle(path)
            validator = contracts.validate_problem if name == 'problem' else S.validate_problem
            validator(problem)
            problem['purpose'] = C.PURPOSE
            with self.assertRaises(ValueError):
                validator(problem)
        with self.assertRaises(ValueError):
            S.freeze(self.draft['problem'], _admission=True)
        with self.assertRaises(ValueError):
            S.generate(self.draft['problem'])
        manifest = read_bundle(self.root / 'frozen/manifest.json')
        pins = read_bundle(self.anchor)['explorer_pins']
        with self.assertRaises(ValueError):
            E.run(self.draft['problem'], manifest, pins, self.work / 'forbidden')
        self.assertFalse((self.work / 'forbidden').exists())
        with self.assertRaises(ValueError):
            E.verify(self.root / 'run/explorer', pins)

    def test_03_every_relevant_edit_stales_exact_confirmation(self):
        original = read_bundle(self.root / 'frozen/case.json')
        mutations = [lambda s: s['analysis'].update(question='Ändrad fråga'),
                     lambda s: s['analysis']['excludes'].append('Ytterligare scope'),
                     lambda s: s['mapping'][0].update(explanation='Ändrad tolkning'),
                     lambda s: s['assumptions'][0].update(statement='Nytt antagande'),
                     lambda s: s['issues'][0].update(reason='Ny bedömning'),
                     lambda s: s['problem']['model']['initial'].update(aux_done=True),
                     lambda s: s['problem']['observation']['all'][1].update(deadline=3),
                     lambda s: s['problem']['scenario_set']['members'][0].update(label='nytt namn'),
                     lambda s: s['problem']['search'].update(allow_empty=True),
                     lambda s: s['execution'].update(max_cells=1),
                     lambda s: s['translator'].update(method_version='manual/2'),
                     lambda s: s.update(revision=2)]
        for change in mutations:
            with self.subTest(change=change):
                case = deepcopy(original)
                change(case['snapshot'])
                case['presentation_sha256'] = hashlib.sha256(C.presentation(case['snapshot'])).hexdigest()
                self.assert_invalid_case(case)

    def test_04_missing_stale_or_path_escaping_evidence_is_rejected(self):
        materials = self.copy('frozen') / 'materials'
        case = read_bundle(self.root / 'frozen/case.json')
        notes = materials / 'notes.txt'
        original = notes.read_bytes()
        notes.write_bytes(original + b'changed')
        self.assert_invalid_case(case, materials)
        notes.unlink()
        self.assert_invalid_case(case, materials)
        notes.write_bytes(original)
        for path in ('../notes.txt', '/tmp/notes.txt', 'a/../notes.txt', './notes.txt'):
            bad = deepcopy(case)
            bad['snapshot']['evidence'][0]['original']['path'] = path
            self.assert_invalid_case(bad, materials)
        (materials / 'link.txt').symlink_to(notes)
        bad = deepcopy(case)
        bad['snapshot']['evidence'][0]['original']['path'] = 'link.txt'
        self.assert_invalid_case(bad, materials)

    def test_05_mapping_requires_full_leaf_coverage_exact_quotes_and_assumption_links(self):
        changes = [lambda s: s['mapping'][0]['targets'].pop(),
                   lambda s: s['mapping'].append(deepcopy(s['mapping'][0])),
                   lambda s: s['mapping'][0]['targets'].append('/model'),
                   lambda s: s['mapping'][0].update(refs=[], assumption_ids=[]),
                   lambda s: s['mapping'][0]['refs'][0].update(quote='förfalskat citat'),
                   lambda s: s['mapping'][0]['refs'][0].update(source_version='2'),
                   lambda s: s['mapping'][0]['refs'][0].update(start=True),
                   lambda s: s['mapping'][-1].update(assumption_ids=['unknown']),
                   lambda s: s['evidence'][0].update(extraction='partial')]
        for change in changes:
            draft = deepcopy(self.draft)
            change(draft)
            with self.subTest(change=change), self.assertRaises(ValueError):
                C.validate_content(draft, self.root / 'draft/materials')

    def test_06_critical_issues_block_and_scope_cannot_conceal_function(self):
        mutations = [lambda s: s['issues'][0].update(disposition='open'),
                     lambda s: s['issues'][0].update(kind='missing_fact', disposition='open'),
                     lambda s: s['issues'][0].update(disposition='scenarios', scenario_event='response'),
                     lambda s: s['issues'][2].update(disposition='accepted_limit'),
                     lambda s: s['issues'][2].update(targets=['/model/initial/done']),
                     lambda s: s['issues'][2].update(previous_scope=''),
                     lambda s: s['issues'][2].update(excluded_scope_index=True),
                     lambda s: s['issues'][1]['targets'].pop(),
                     lambda s: s['issues'][3].update(impact='blocks_analysis'),
                     lambda s: s['analysis'].update(ranking='min_cost')]
        for change in mutations:
            draft = deepcopy(self.draft)
            change(draft)
            with self.subTest(change=change), self.assertRaises(ValueError):
                C.validate_content(draft, self.root / 'draft/materials')
        # Explicitly resolved missing fact is admissible; relevance is a human judgment.
        draft = deepcopy(self.draft)
        draft['issues'][0].update(kind='missing_fact', disposition='source_resolved', assumption_ids=[],
                                   refs=deepcopy(draft['mapping'][0]['refs']))
        C.validate_content(draft, self.root / 'draft/materials')

    def test_07_receipt_roles_record_scope_and_stale_hashes_cannot_be_patched_away(self):
        original = read_bundle(self.root / 'frozen/case.json')
        mutations = [lambda c: c['receipts'].pop(),
                     lambda c: c['receipts'][0].update(kind='customer_confirmation'),
                     lambda c: c['receipts'][0].update(stated_person='annan person'),
                     lambda c: c['receipts'][1].update(decision='rejected'),
                     lambda c: c['receipts'][1].update(assumption_ids=[]),
                     lambda c: c['receipts'][1].update(acknowledgements=['scope']),
                     lambda c: c['receipts'][1].update(snapshot_id='0'*64),
                     lambda c: c['receipts'][1].update(presentation_sha256='0'*64),
                     lambda c: c['receipts'][0].update(recorded_at='2026-10-22T12:00:00'),
                     lambda c: c.update(presentation_sha256='0'*64)]
        for change in mutations:
            case = deepcopy(original)
            change(case)
            with self.subTest(change=change):
                self.assert_invalid_case(case)
        case = deepcopy(original)
        case['snapshot']['analysis']['question'] = 'Ny fråga'
        case['presentation_sha256'] = hashlib.sha256(C.presentation(case['snapshot'])).hexdigest()
        for receipt in case['receipts']:
            receipt.update(snapshot_id=digest(case['snapshot']), presentation_sha256=case['presentation_sha256'])
        self.assert_invalid_case(case)  # old preserved human record cannot authorize a new snapshot
        self.assert_invalid_case(original, shown=b'wrong presentation')

    def test_08_budget_zero_and_partial_keep_population_and_unknown_goals(self):
        for budget in (0, 1, 4):
            root = self.work / str(budget)
            draft = draft_fixture(root / 'draft', max_cells=budget)
            P.prepare(draft, root / 'draft/materials', root / 'prepared')
            receipts = fabricated_receipts(root / 'prepared')
            P.freeze(root / 'prepared', receipts, root / 'frozen', root / 'anchor.json')
            r = P.run(root / 'frozen', root / 'anchor.json', root / 'run')
            self.assertEqual(r['pilot_status'], 'COMPLETE_CURRENT')
            self.assertEqual(r['execution_budget_status'], 'VALID')
            self.assertEqual(r['search_coverage']['status'], 'INCOMPLETE')
            self.assertEqual(len(r['explorer_result']['cells']), 12)
            certified = [c for c in r['explorer_result']['cells'] if c['run_status'] == 'CERTIFIED']
            self.assertEqual(len(certified), budget)
            self.assertTrue(all(c['goal_satisfied'] is None for c in r['explorer_result']['cells'] if c not in certified))
            if budget == 0:
                self.assertTrue(all(c['robust'] == 'UNKNOWN' for c in r['goal_status']))

    def test_09_outside_prefix_attempt_is_separate_from_model_and_cell_correctness(self):
        root = self.work
        draft = draft_fixture(root / 'draft', max_cells=1)
        P.prepare(draft, root / 'draft/materials', root / 'prepared')
        P.freeze(root / 'prepared', fabricated_receipts(root / 'prepared'), root / 'frozen', root / 'anchor.json')
        r = P.run(root / 'frozen', root / 'anchor.json', root / 'run')
        cells = sorted(r['explorer_result']['cells'], key=lambda c: (len(c['order']), c['order'], c['scenario_label']))
        untouched = next(c for c in cells if c['run_status'] == 'NOT_RUN')
        (root / 'run/explorer/runs' / untouched['cell_id']).mkdir()
        r = P.verify(root / 'run', root / 'anchor.json')
        self.assertEqual(r['pilot_status'], 'COMPLETE_CURRENT')
        self.assertEqual(r['execution_budget_status'], 'INVALID')
        self.assertEqual(r['search_coverage']['status'], 'INVALID')
        self.assertEqual(sum(c['run_status'] == 'CERTIFIED' for c in r['explorer_result']['cells']), 1)

    def test_10_verify_is_read_only_reaudits_and_ignores_result_files(self):
        root = self.copy('run')
        (root / 'result.json').write_text('invalid json')
        (root / 'explorer/result.json').write_text('invalid json')
        before = inventory(root)
        with patch.object(E, 'cli_process', side_effect=AssertionError('No replay on verify')), \
             patch.object(P, 'write_bundle', side_effect=AssertionError('No writes')), \
             patch.object(E, 'write_bundle', side_effect=AssertionError('No writes')):
            self.assertEqual(P.verify(root, self.anchor), self.result)
        self.assertEqual(before, inventory(root))
        cell = self.result['explorer_result']['cells'][0]
        directory = root / 'explorer/runs' / cell['cell_id']
        (directory / 'history.json.gz').write_bytes(b'corrupt gzip')
        result = P.verify(root, self.anchor)
        altered = next(c for c in result['explorer_result']['cells'] if c['cell_id'] == cell['cell_id'])
        self.assertEqual(altered['run_status'], 'UNVERIFIED')
        self.assertIsNone(altered['goal_satisfied'])
        self.assertEqual(result['pilot_status'], 'COMPLETE_CURRENT')
        self.assertEqual(result['search_coverage']['status'], 'INCOMPLETE')

    def test_11_trust_anchor_must_be_external_and_original_new_paths_only(self):
        frozen = self.copy('frozen')
        with self.assertRaises(ValueError):
            P.run(frozen, frozen / 'anchor-copy.json', self.work / 'run')
        with self.assertRaises((ValueError, OSError)):
            P.freeze(self.root / 'prepared', self.receipts, self.work / 'new', self.anchor)
        self.assertFalse((self.work / 'new').exists())
        root = self.copy('run')
        with self.assertRaises(ValueError):
            P.verify(root, root / 'pilot/anchor-copy.json')
        with self.assertRaises(OSError):
            P.run(self.root / 'frozen', self.anchor, root)

    def test_12_wrong_registered_runtime_and_batch_binding_rejected(self):
        frozen = self.copy('frozen')
        case = read_bundle(frozen / 'case.json')
        case['snapshot']['implementation']['runtime']['python']['version'] = '0.0.0'
        write_bundle(case, frozen / 'case.json')
        with self.assertRaises(ValueError):
            P.run(frozen, self.anchor, self.work / 'not-started')
        self.assertFalse((self.work / 'not-started').exists())
        root = self.copy('run')
        spec = read_bundle(root / 'explorer/batch.json')
        spec['pilot_binding']['case_id'] = '0'*64
        write_bundle(spec, root / 'explorer/batch.json')
        with self.assertRaises(ValueError):
            P.verify(root, self.anchor)

    def test_13_rehashed_population_omission_and_external_rebinding_cannot_bypass_domain(self):
        frozen = self.copy('frozen')
        manifest = read_bundle(frozen / 'manifest.json')
        manifest['cells'].pop()
        write_bundle(manifest, frozen / 'manifest.json')
        anchor = read_bundle(self.anchor)
        anchor['explorer_pins']['manifest_id'] = digest(manifest)
        write_bundle(anchor, frozen / 'anchor-copy.json')
        forged = self.work / 'forged.json'
        write_bundle(anchor, forged)
        with self.assertRaises(ValueError):
            P.run(frozen, forged, self.work / 'not-started')
        self.assertFalse((self.work / 'not-started').exists())

    def test_14_freeze_and_reverify_recheck_preserved_source_and_confirmation(self):
        prepared = self.copy('prepared')
        (prepared / 'materials/notes.txt').write_text('stale')
        with self.assertRaises(ValueError):
            P.freeze(prepared, self.receipts, self.work / 'blocked', self.work / 'anchor.json')
        self.assertFalse((self.work / 'anchor.json').exists())
        root = self.copy('run')
        (root / 'pilot/materials/confirmation/domain_review.txt').unlink()
        with self.assertRaises(OSError):
            P.verify(root, self.anchor)

    def test_15_hand_derived_control_mismatch_and_limits_cannot_certify(self):
        draft = deepcopy(self.draft)
        draft['controls'][0]['expected_goal'] = False
        with self.assertRaises(ValueError):
            P.prepare(draft, self.root / 'draft/materials', self.work / 'wrong-control')
        self.assertFalse((self.work / 'wrong-control/snapshot.json').exists())
        draft = deepcopy(self.draft)
        draft['execution']['limits']['max_steps'] = 1
        with self.assertRaises(ValueError):
            P.prepare(draft, self.root / 'draft/materials', self.work / 'limited-control')

    def test_16_cli_freeze_run_verify_and_bad_purpose_exit_codes(self):
        def cli(*args):
            return subprocess.run([sys.executable, '-B', str(ROOT / 'pilot_runner.py'), *map(str,args)], capture_output=True, text=True)
        result = cli('verify', '--output', self.root / 'run', '--anchor', self.anchor)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), self.result)
        result = cli('verify', '--output', self.root / 'run', '--anchor', self.root / 'run/pilot/anchor-copy.json')
        self.assertEqual(result.returncode, 1)
        self.assertIn('INVALID PILOT', result.stderr)
        prepared = self.copy('prepared')
        receipts = self.work / 'receipts.json'
        write_bundle(self.receipts, receipts)
        result = cli('freeze', '--prepared', prepared, '--receipts', receipts,
                     '--output', self.work / 'cli-frozen', '--anchor', self.work / 'cli-anchor.json')
        self.assertEqual(result.returncode, 0, result.stderr)
        result = cli('run', '--frozen', self.work / 'cli-frozen', '--output', self.work / 'cli-run',
                     '--anchor', self.work / 'cli-anchor.json')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['search_coverage']['status'], 'COMPLETE')


    def test_17_new_confirmation_same_model_cannot_authorize_old_run(self):
        draft = deepcopy(self.draft)
        draft['analysis']['intended_use'] = 'Ny uttryckligt bekräftad användning av samma modell.'
        P.prepare(draft, self.root / 'draft/materials', self.work / 'prepared')
        receipts = fabricated_receipts(self.work / 'prepared')
        P.freeze(self.work / 'prepared', receipts, self.work / 'frozen', self.work / 'anchor.json')
        new_anchor = read_bundle(self.work / 'anchor.json')
        self.assertEqual(new_anchor['explorer_pins'], read_bundle(self.anchor)['explorer_pins'])
        self.assertNotEqual(new_anchor['case_id'], read_bundle(self.anchor)['case_id'])
        self.assertNotEqual(new_anchor['batch_spec_id'], read_bundle(self.anchor)['batch_spec_id'])
        with self.assertRaises(ValueError):
            P.verify(self.root / 'run', self.work / 'anchor.json')
        root = self.copy('run')
        # A swapped otherwise valid pilot directory still cannot relabel the old batch.
        shutil.rmtree(root / 'pilot')
        shutil.copytree(self.work / 'frozen', root / 'pilot')
        with self.assertRaises(ValueError):
            P.verify(root, self.work / 'anchor.json')

    def test_18_unicode_spans_preserve_crlf_and_presentation_escapes_source_markup(self):
        draft = deepcopy(self.draft)
        material = self.work / 'materials'
        material.mkdir()
        content = '<script>alert(1)</script>\r\nÅ😀'
        (material / 'notes.txt').write_bytes(content.encode('utf-8'))
        draft['evidence'][0].update(original=C.descriptor(material, 'notes.txt'), extract=C.descriptor(material, 'notes.txt'))
        for mapping in draft['mapping']:
            for ref in mapping['refs']:
                ref.update(start=0, end=len(content), quote=content)
        C.validate_content(draft, material)
        snapshot = read_bundle(self.root / 'prepared/snapshot.json')
        snapshot.update(mapping=draft['mapping'], evidence=draft['evidence'])
        html = C.presentation(snapshot).decode('utf-8')
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertEqual(C.presentation(snapshot), C.presentation(json.loads(json.dumps(snapshot, sort_keys=True))))
        draft['mapping'][0]['refs'][0]['quote'] = content.replace('\r\n', '\n')
        with self.assertRaises(ValueError):
            C.validate_content(draft, material)

    def test_19_confirmed_budget_and_sources_are_rechecked_before_shared_execution(self):
        frozen = self.copy('frozen')
        admission = C.Admission(frozen)
        manifest = read_bundle(frozen / 'manifest.json')
        pins = read_bundle(self.anchor)['explorer_pins']
        with self.assertRaises(ValueError):
            E.run(self.draft['problem'], manifest, pins, self.work / 'wrong-budget',
                  max_cells=0, _admission=admission)
        self.assertFalse((self.work / 'wrong-budget').exists())
        (frozen / 'materials/notes.txt').write_text('changed after Admission construction')
        with self.assertRaises(ValueError):
            E.run(self.draft['problem'], manifest, pins, self.work / 'stale', _admission=admission)
        self.assertFalse((self.work / 'stale').exists())


if __name__ == '__main__':
    unittest.main()
