"""Additional F1/F2/F3 adversarial tests. All names and answers are test data.
Even declared_real_case inputs below simulate declarations; no actual customer.
"""
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest

import test_pilot_v2_review_regressions as R

C, P = R.C, R.P
FAKE = {'case_kind': 'fabricated_exercise', 'receipt_origin': 'fabricated_test'}
REAL = {'case_kind': 'declared_real_case', 'receipt_origin': 'declared_actual_response'}


class PilotV2Fixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        R.IndependentPilotReview.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(tempfile.mkdtemp(dir=self.root))

    def copy(self, name, destination=None):
        return Path(shutil.copytree(self.root / name, destination or self.work / name))

    def reject_receipts(self, prepared, receipts, output):
        with self.assertRaises((ValueError, TypeError, KeyError, OSError)):
            P.freeze(prepared, receipts, output, output.with_suffix('.anchor'))
        self.assertFalse(output.with_suffix('.anchor').exists())
        self.assertFalse(output.exists())

    def rewrite_record(self, prepared, receipt, record):
        path = prepared / 'materials' / receipt['record']['path']
        R.save(path, record)
        receipt['record'] = R.ref(prepared / 'materials', receipt['record']['path'])

    def test_01_each_record_field_requires_exact_typed_match(self):
        for field in ['kind', 'decision', 'snapshot_id', 'presentation_sha256',
                      'classification', 'stated_person', 'stated_role', 'recorded_by',
                      'recorded_at', 'statement', 'acknowledgements', 'assumption_ids',
                      'supporting_records']:
            for mode in ['missing', 'wrong_type', 'conflicting']:
                with self.subTest(field=field, mode=mode):
                    base = self.work / (field + '-' + mode)
                    prepared = self.copy('prepared', base / 'prepared')
                    receipts = deepcopy(self.receipts)
                    record = R.read(prepared / 'materials' / receipts[0]['record']['path'])
                    if mode == 'missing':
                        del record[field]
                    elif mode == 'wrong_type':
                        record[field] = 1
                    else:
                        record[field] = 'prefix_' + str(record[field]) + '_suffix'
                    self.rewrite_record(prepared, receipts[0], record)
                    self.reject_receipts(prepared, receipts, base / 'frozen')

    def test_02_negative_decisions_and_substrings_never_approve(self):
        for decision in ['not_approved', 'rejected', 'disapproved', 'approved_no',
                         ' approved ', ['approved'], True, None]:
            base = self.work / str(len(list(self.work.iterdir())))
            prepared = self.copy('prepared', base / 'prepared')
            receipts = deepcopy(self.receipts)
            record = R.read(prepared / 'materials' / receipts[0]['record']['path'])
            record['decision'] = decision
            # Even approval-looking prose and supporting text cannot authorize this record.
            self.rewrite_record(prepared, receipts[0], record)
            self.reject_receipts(prepared, receipts, base / 'frozen')
            receipts[0]['decision'] = decision
            self.reject_receipts(prepared, receipts, base / 'also-bad')

    def test_03_duplicate_record_and_receipt_json_fields_rejected_via_cli(self):
        for mutation in ['decision', 'nested_classification', 'unknown_field', 'receipt_duplicate']:
            base = self.work / mutation
            prepared = self.copy('prepared', base / 'prepared')
            receipts = deepcopy(self.receipts)
            path = prepared / 'materials' / receipts[0]['record']['path']
            raw = path.read_text()
            if mutation == 'decision':
                raw = raw.replace('"decision":"approved"', '"decision":"not_approved","decision":"approved"')
            elif mutation == 'nested_classification':
                raw = raw.replace('"case_kind":"fabricated_exercise"',
                                  '"case_kind":"declared_real_case","case_kind":"fabricated_exercise"')
            elif mutation == 'unknown_field':
                raw = raw.replace('{', '{"decision_override":"approved",', 1)
            path.write_text(raw)
            receipts[0]['record'] = R.ref(prepared / 'materials', receipts[0]['record']['path'])
            receipt_file = base / 'receipts.json'
            R.save(receipt_file, receipts)
            if mutation == 'receipt_duplicate':
                receipt_file.write_text(receipt_file.read_text().replace(
                    '"decision":"approved"', '"decision":"rejected","decision":"approved"', 1))
            response = R.cli('pilot_runner.py', 'freeze', '--prepared', prepared,
                             '--receipts', receipt_file, '--output', base / 'frozen', '--anchor', base / 'anchor')
            self.assertEqual(response.returncode, 1, response.stderr)
            self.assertFalse((base / 'frozen').exists())
            self.assertFalse((base / 'anchor').exists())

    def test_04_scope_and_assumptions_match_record_receipt_and_snapshot(self):
        for field, value in [('acknowledgements', []), ('acknowledgements', R.ACK[:-1]),
                             ('acknowledgements', R.ACK + ['scope']),
                             ('assumption_ids', ['invented-assumption']),
                             ('assumption_ids', [True])]:
            base = self.work / str(len(list(self.work.iterdir())))
            prepared = self.copy('prepared', base / 'prepared')
            receipts = deepcopy(self.receipts)
            record = R.read(prepared / 'materials' / receipts[0]['record']['path'])
            record[field] = value
            self.rewrite_record(prepared, receipts[0], record)
            self.reject_receipts(prepared, receipts, base / 'mismatched')
            # Agreeing receipt+record cannot override required scope / snapshot assumption IDs.
            receipts[0][field] = value
            self.reject_receipts(prepared, receipts, base / 'consistent-but-wrong')
        # Exercise nonempty actual assumptions, swapping the ID for another equally typed one.
        draft = deepcopy(self.draft)
        target = '/model/initial/ready'
        draft['assumptions'] = [dict(id='ready-hypothesis', statement='Hypotetiskt startvärde false.',
                                    reason='Fabricerad granskningshypotes.', targets=[target])]
        draft['mapping'][0]['targets'].remove(target)
        draft['mapping'].append(dict(targets=[target], explanation='Startvärdet antas.', refs=[],
                                     assumption_ids=['ready-hypothesis']))
        prepared = self.work / 'hypothesis'
        P.prepare(draft, self.root / 'draft/materials', prepared)
        receipts = R.receipts_at(prepared)
        # Review fixture has no hypotheses by default; set actual IDs explicitly here.
        for receipt in receipts:
            receipt['assumption_ids'] = ['ready-hypothesis']
            record = {k: v for k, v in receipt.items() if k != 'record'}
            record['schema_version'] = 'ce3-pilot-confirmation-record/1'
            self.rewrite_record(prepared, receipt, record)
        P.freeze(prepared, receipts, self.work / 'correct', self.work / 'correct.anchor')
        record = R.read(prepared / 'materials' / receipts[0]['record']['path'])
        record['assumption_ids'] = ['swapped-hypothesis']
        self.rewrite_record(prepared, receipts[0], record)
        self.reject_receipts(prepared, receipts, self.work / 'swapped')

    def test_05_free_text_separate_bound_preserved_not_interpreted(self):
        prepared = self.copy('prepared')
        receipts = deepcopy(self.receipts)
        for receipt in receipts:
            item = receipt['supporting_records'][0]
            # Arbitrary binary/email content is retained, not parsed for "approved".
            (prepared / 'materials' / item['path']).write_bytes(b'\xff\x00not_approved\r\nTEST ONLY')
            receipt['supporting_records'] = [R.ref(prepared / 'materials', item['path'])]
            record = {k: v for k, v in receipt.items() if k != 'record'}
            record['schema_version'] = 'ce3-pilot-confirmation-record/1'
            self.rewrite_record(prepared, receipt, record)
        P.freeze(prepared, receipts, self.work / 'frozen', self.work / 'anchor')
        for receipt in receipts:
            path = receipt['supporting_records'][0]['path']
            self.assertEqual((prepared / 'materials' / path).read_bytes(),
                             (self.work / 'frozen/materials' / path).read_bytes())
        # The concierge's truthful transcription remains human responsibility, not prose NLP.
        item = receipts[0]['supporting_records'][0]
        (self.work / 'frozen/materials' / item['path']).write_bytes(b'changed')
        with self.assertRaises(ValueError):
            P.run(self.work / 'frozen', self.work / 'anchor', self.work / 'run')

    def test_06_support_material_required_unique_and_current(self):
        for value in [[], None, 'note.txt', [self.receipts[0]['supporting_records'][0]] * 2]:
            base = self.work / str(len(list(self.work.iterdir())))
            prepared = self.copy('prepared', base / 'prepared')
            receipts = deepcopy(self.receipts)
            receipts[0]['supporting_records'] = value
            record = {k: v for k, v in receipts[0].items() if k != 'record'}
            record['schema_version'] = 'ce3-pilot-confirmation-record/1'
            self.rewrite_record(prepared, receipts[0], record)
            self.reject_receipts(prepared, receipts, base / 'frozen')

    def test_07_symlinks_rejected_consistently_at_all_stages(self):
        for stage in ['prepare', 'freeze', 'run', 'verify']:
            for entry in ['root', 'materials_or_pilot', 'top_file', 'dangling']:
                base = self.work / (stage + '-' + entry)
                source = {'prepare':'draft', 'freeze':'prepared', 'run':'frozen', 'verify':'run'}[stage]
                package = self.copy(source, base / 'package')
                if entry == 'root':
                    alias = base / 'alias'; alias.symlink_to(package, target_is_directory=True); package = alias
                elif entry == 'materials_or_pilot':
                    path = package / ('pilot' if stage == 'verify' else 'materials')
                    outside = base / 'detached'; shutil.move(str(path), outside)
                    path.symlink_to(outside, target_is_directory=True)
                elif entry == 'top_file':
                    name = {'prepare':'draft.json', 'freeze':'review.html', 'run':'case.json', 'verify':'explorer/batch.json'}[stage]
                    path = package / name; outside = base / 'detached-file'
                    shutil.move(str(path), outside); path.symlink_to(outside)
                else:
                    (package / 'dangling').symlink_to(base / 'missing')
                # prepare does not ingest the draft directory: it validates materials/output.
                # Move the injected symlink into that actual checked root when appropriate.
                if stage == 'prepare' and entry in ['top_file', 'dangling']:
                    link = package / ('draft.json' if entry == 'top_file' else 'dangling')
                    link.rename(package / 'materials/injected-link')
                if stage == 'prepare' and entry == 'root':
                    materials = base / 'material-alias'; materials.symlink_to(package / 'materials', target_is_directory=True)
                else:
                    materials = package / 'materials'
                with self.subTest(stage=stage, entry=entry), self.assertRaisesRegex(ValueError, 'Symlink'):
                    if stage == 'prepare':
                        P.prepare(self.draft, materials, base / 'out')
                    elif stage == 'freeze':
                        P.freeze(package, self.receipts, base / 'out', base / 'anchor')
                    elif stage == 'run':
                        P.run(package, self.anchor, base / 'out')
                    else:
                        P.verify(package, self.anchor)

    def test_08_legitimate_anchor_paths_and_aliases_cli(self):
        for form in ['absolute', 'relative', 'external_symlink', 'external_hardlink']:
            anchor = self.anchor
            if form == 'relative':
                anchor = os.path.relpath(anchor, Path.cwd())
            elif form == 'external_symlink':
                anchor = self.work / 'symlink'; anchor.symlink_to(self.anchor)
            elif form == 'external_hardlink':
                anchor = self.work / 'hardlink'; os.link(self.anchor, anchor)
            response = R.cli('pilot_runner.py', 'verify', '--output', self.root / 'run', '--anchor', anchor)
            self.assertEqual(response.returncode, 0, response.stderr)
            self.assertEqual(json.loads(response.stdout), self.result)
        # Same bytes alone don't prove trusted storage. Operator must choose its provenance.
        shutil.copyfile(self.anchor, self.work / 'operator-copy')
        self.assertEqual(P.verify(self.root / 'run', self.work / 'operator-copy'), self.result)

    def test_09_anchor_inside_package_or_copy_alias_never_accepted_cli(self):
        run = self.copy('run')
        for name in ['pilot/anchor-copy.json', 'inside-copy']:
            path = run / name
            if name == 'inside-copy': shutil.copyfile(self.anchor, path)
            response = R.cli('pilot_runner.py', 'verify', '--output', run, '--anchor', path)
            self.assertEqual(response.returncode, 1)
        for form in ['symlink', 'hardlink']:
            path = self.work / form
            if form == 'symlink': path.symlink_to(run / 'pilot/anchor-copy.json')
            else: os.link(run / 'pilot/anchor-copy.json', path)
            response = R.cli('pilot_runner.py', 'verify', '--output', run, '--anchor', path)
            self.assertEqual(response.returncode, 1)
        # Platform ancestor aliases are valid; logical anchor-inside check still applies.
        alias = self.work / 'parent-alias'; alias.symlink_to(self.root, target_is_directory=True)
        self.assertEqual(P.verify(alias / 'run', self.anchor), self.result)

    def test_10_classification_bound_across_complete_chain(self):
        case = R.read(self.root / 'frozen/case.json')
        anchor = R.read(self.anchor)
        spec = R.read(self.root / 'frozen/batch.json')
        values = [self.draft, case, case['snapshot'], anchor, spec['pilot_binding'], self.result,
                  self.result['explorer_result']['pilot_binding'], *case['receipts']]
        for receipt in case['receipts']:
            values.append(R.read(self.root / 'frozen/materials' / receipt['record']['path']))
        for value in values:
            self.assertEqual(value['classification'], FAKE)
        for value in [case, case['snapshot'], anchor, spec['pilot_binding'], self.result, *case['receipts']]:
            self.assertTrue(value['schema_version'].endswith('/2'))
        html = (self.root / 'prepared/review.html').read_text()
        for text in ['FABRICERAD ÖVNING', 'inte en genomförd kundpilot', 'fabricated_exercise', 'fabricated_test']:
            self.assertIn(text, html)
        self.assertEqual(R.read(self.root / 'run/result.json'), self.result)

    def test_11_classification_change_stales_confirmation_and_anchor(self):
        prepared = self.copy('prepared')
        snapshot = R.read(prepared / 'snapshot.json')
        snapshot['classification'] = REAL
        R.save(prepared / 'snapshot.json', snapshot)
        (prepared / 'review.html').write_bytes(C.presentation(snapshot))
        self.reject_receipts(prepared, self.receipts, self.work / 'old-receipts')
        receipts = deepcopy(self.receipts)
        for r in receipts:
            r.update(classification=REAL, snapshot_id=R.identity(snapshot),
                     presentation_sha256=hashlib.sha256((prepared / 'review.html').read_bytes()).hexdigest())
        # Rehashing receipt fields cannot renew its preserved old confirmation record.
        self.reject_receipts(prepared, receipts, self.work / 'rehashed-receipts')
        # Simulated fresh declarations (still fictional test people, never a real pilot).
        # Existing receipt filenames are reused only in this isolated mutation copy.
        fresh = R.receipts_at(prepared)
        P.freeze(prepared, fresh, self.work / 'new-frozen', self.work / 'new-anchor')
        with self.assertRaises(ValueError):
            P.run(self.work / 'new-frozen', self.anchor, self.work / 'bad-run')
        with self.assertRaises(ValueError):
            P.verify(self.root / 'run', self.work / 'new-anchor')
        self.assertNotEqual(R.read(self.work / 'new-anchor')['batch_spec_id'], R.read(self.anchor)['batch_spec_id'])

    def test_12_mixed_real_fabricated_records_rejected(self):
        for classification in [dict(case_kind='declared_real_case', receipt_origin='fabricated_test'),
                               dict(case_kind='fabricated_exercise', receipt_origin='declared_actual_response'),
                               dict(case_kind=True, receipt_origin='fabricated_test'), {}]:
            draft = deepcopy(self.draft); draft['classification'] = classification
            with self.assertRaises(ValueError):
                P.prepare(draft, self.root / 'draft/materials', self.work / 'bad')
        draft = deepcopy(self.draft); draft['classification'] = REAL
        P.prepare(draft, self.root / 'draft/materials', self.work / 'prepared')
        receipts = R.receipts_at(self.work / 'prepared')
        receipts[0]['classification'] = FAKE
        record = {k: v for k, v in receipts[0].items() if k != 'record'}
        record['schema_version'] = 'ce3-pilot-confirmation-record/1'
        self.rewrite_record(self.work / 'prepared', receipts[0], record)
        self.reject_receipts(self.work / 'prepared', receipts, self.work / 'bad-freeze')
        response = R.cli('pilot_examples/example.py', '--fabricated-receipts-for', self.work / 'prepared',
                         '--output', self.work / 'fabricated.json')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn('Fabricated receipts cannot confirm', response.stderr)
        self.assertFalse((self.work / 'fabricated.json').exists())

    def test_13_declared_real_path_is_not_authentication(self):
        draft = deepcopy(self.draft); draft['classification'] = REAL
        prepared = self.work / 'prepared'
        status = P.prepare(draft, self.root / 'draft/materials', prepared)
        self.assertEqual(status['classification'], REAL)
        P.freeze(prepared, R.receipts_at(prepared), self.work / 'frozen', self.work / 'anchor')
        result = P.run(self.work / 'frozen', self.work / 'anchor', self.work / 'run')
        self.assertEqual(result['classification'], REAL)
        self.assertIn('inte autentiserade', result['case_notice'])
        self.assertEqual(result['identity_assurance'], 'self_reported_not_authenticated')
        self.assertEqual(result['search_coverage']['status'], 'COMPLETE')
        # Self-declared test people are deliberately not recognized as fictitious by name.

    def test_14_presentation_limits_and_classification_are_confirmed(self):
        html = (self.root / 'prepared/review.html').read_text()
        for text in ['60 sekunder per replay-/auditprocess', 'Förprovens kontrollkörningar',
                     'utanför batchens max_cells-budget', 'Ingen total väggklocksgaranti finns']:
            self.assertIn(text, html)
        snapshot = R.read(self.root / 'prepared/snapshot.json')
        self.assertEqual(C.presentation(snapshot), C.presentation(json.loads(R.encoded(snapshot))))
        prepared = self.copy('prepared')
        (prepared / 'review.html').write_text(html.replace('60 sekunder', '600 sekunder'))
        receipts = deepcopy(self.receipts)
        for r in receipts:
            r['presentation_sha256'] = hashlib.sha256((prepared / 'review.html').read_bytes()).hexdigest()
        self.reject_receipts(prepared, receipts, self.work / 'bad')

    def test_15_no_silent_v1_upgrade(self):
        draft = deepcopy(self.draft); draft['schema_version'] = 'ce3-pilot-draft/1'
        with self.assertRaisesRegex(ValueError, 'Unsupported pilot draft'):
            P.prepare(draft, self.root / 'draft/materials', self.work / 'bad')
        for level in ['snapshot', 'case', 'receipt', 'anchor', 'binding']:
            base = self.work / level
            frozen = self.copy('frozen', base / 'frozen')
            anchor = base / 'anchor'; shutil.copyfile(self.anchor, anchor)
            if level == 'anchor':
                value = R.read(anchor); value['schema_version'] = 'ce3-pilot-anchor/1'; R.save(anchor, value)
            elif level == 'binding':
                value = R.read(frozen / 'batch.json'); value['pilot_binding']['schema_version'] = 'ce3-pilot-binding/1'; R.save(frozen / 'batch.json', value)
            else:
                case = R.read(frozen / 'case.json')
                target = case if level == 'case' else case['snapshot'] if level == 'snapshot' else case['receipts'][0]
                target['schema_version'] = 'ce3-pilot-' + level + '/1'
                R.save(frozen / 'case.json', case)
            with self.subTest(level=level), self.assertRaises(ValueError):
                P.run(frozen, anchor, base / 'bad-run')


if __name__ == '__main__':
    unittest.main()
