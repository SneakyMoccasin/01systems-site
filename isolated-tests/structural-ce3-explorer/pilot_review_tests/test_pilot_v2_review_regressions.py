"""Regression adaptation for pilot /2 from independent review a8cc1fa.
Original tests remain unchanged in that historical commit. Tests 10,16,21,24
previously asserted broken behavior; now they require rejection or clear labels.

No example-generator, fixture, production leaf walker, or validator supplies
an expected answer. All people/receipts here are FABRICATED REVIEW TEST DATA.
Run from repository root using unittest discover. Temporary evidence is isolated.
"""
from copy import deepcopy
import gzip
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

ACK = ['scope', 'model_mapping', 'assumptions', 'issues', 'goals', 'scenarios',
       'selection_and_prefix_times', 'limits_and_budget', 'human_responsibility', 'classification_and_receipt_origin']


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n').encode()


def identity(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = encoded(value)
    path.write_bytes(gzip.compress(raw, mtime=0) if path.suffix == '.gz' else raw)


def read(path):
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def ref(root, relative):
    return {'path': relative, 'sha256': hashlib.sha256((root/relative).read_bytes()).hexdigest()}


def walk(value, path=''):
    result = {}
    if isinstance(value, dict) and value:
        for key, child in value.items():
            result.update(walk(child, path+'/'+key.replace('~', '~0').replace('/', '~1')))
    elif isinstance(value, list) and value:
        for i, child in enumerate(value):
            result.update(walk(child, path+'/'+str(i)))
    else:
        result[path] = value
    return result


def draft_at(directory):
    """Entirely authored here: A prepares, B delivers iff ready; two no-op timers.
    AB succeeds, BA fails; E1/E2 and E2/E1 both leave states unchanged.
    Thus 2 cells, 2 audited event paths/cell, exactly 1 successful order.
    """
    materials = directory/'materials'; materials.mkdir(parents=True)
    note = ('FABRICERAT GRANSKNINGSTEST. Å😀\r\n'
            'A sätter ready=true. B kräver ready=true och sätter done=true.\r\n'
            'ready och done börjar false; safe börjar true. Alla är booleska.\r\n'
            'A och B är obligatoriska, försöks en gång vid 0 och 1 i båda ordningar.\r\n'
            'Två timerhändelser E1/E2 vid 0 gör ingenting; inga kostnader eller nya events.\r\n'
            'Klocka 0..1 inklusive, event före beslut. Terminalt done, done senast 1, safe alltid.\r\n'
            'Endast scenario neutral, tom outcomes och sources. Ingen ranking.\r\n'
            'Alla dokumentära fält är explicit representation av detta fabricerade test.\r\n')
    (materials/'note.txt').write_bytes(note.encode())
    rule = lambda requires, effects: dict(requires=requires, effects={'set': effects,'add': {}}, cost=0, schedule=None, source='FABRICERAT TEST')
    model = dict(schema_version='ce3-model/1', source='FABRICERAT TEST',
                 clock=dict(start=0,horizon=1,step=1,unit='test_step',events_before_decisions=True,horizon_inclusive=True),
                 domains={k:{'enum':[False,True]} for k in ['ready','done','safe']},
                 initial=dict(ready=False,done=False,safe=True),budget=None,
                 decisions={'A':rule([],{'ready':True}), 'B':rule([{'field':'ready','op':'eq','value':True}],{'done':True})},
                 events={k:dict(requires=[],kind='timer',outcomes={'noop':{'set':{},'add':{}}},absent=None,source='FABRICERAT TEST') for k in ['E1','E2']},
                 initial_events=[dict(id=k,due=0,scheduled_at=0) for k in ['E1','E2']],
                 reference_event_order=['E1','E2'], metadata=dict(assumption='FABRICERAT TEST',time_basis='0..1 inklusive',deadlines=[]))
    problem = dict(schema_version='ce3-scenario-problem/4',revision=1,purpose='bounded_real_pilot',profile='fixed-replay/0.1',model=model,sources={},
                   search=dict(kind='selected_permutations_once/1',required_decision_ids=['A','B'],optional_decision_ids=[],choice_groups=[],slots=[0,1],slot_policy='prefix/1',allow_empty=False,mode='attempt',retry=False,early_stop=False),
                   observation=dict(schema_version='ce3-history-goal/2',goal_id='delivery',sampling='each_row.before_after.snapshot_step/1',quantifier='all_event_paths',acceptance_scope='candidate_script',all_attempts_accepted=True,
                                    all=[dict(id='finish',operator='terminal',equals={'done':True}),dict(id='early',operator='reach_by',equals={'done':True},deadline=1),dict(id='safe',operator='always',equals={'safe':True},through=1)]),
                   scenario_set=dict(schema_version='ce3-scenario-set/1',variation='outcomes_only',selection='explicit_complete_list',members=[dict(label='neutral',outcomes={})]))
    refs=[dict(source_id='note',source_version='v1',start=0,end=len(note),quote=note)]
    mapping=[]
    for section in ['model','sources','search','observation','scenario_set']:
        mapping.append(dict(targets=list(walk(problem[section],'/'+section)), explanation='FABRICERAT TEST: '+section+' enligt notens explicita AB-regler.',refs=deepcopy(refs),assumption_ids=[]))
    draft = dict(schema_version='ce3-pilot-draft/2',case_id='independent-AB-fabricated',revision=1,
                 classification={'case_kind':'fabricated_exercise','receipt_origin':'fabricated_test'},
                 analysis=dict(question='FABRICERAT TEST: vilken AB-ordning levererar?',intended_use='Oberoende tekniskt test, ingen kundpilot.',includes=['A och B samt två tomma timers.'],excludes=['Verklig verksamhet.'],decision_authority='Fiktiv testoperatör styr A och B.',time_unit='test_step',limitations=['Fabricerat granskningsfall.'],ranking='none'),
                 translator=dict(stated_person='FIKTIV granskare',method_version='independent-manual/1'),problem=problem,
                 evidence=[dict(id='note',version='v1',title='Fabricerad AB-not',original=ref(materials,'note.txt'),extract=ref(materials,'note.txt'),extraction='verbatim_utf8',extraction_note='Exakta UTF-8-bytes med CRLF och astral Unicode.')],
                 mapping=mapping,assumptions=[],issues=[],
                 controls=[dict(order=['A','B'],scenario_label='neutral',expected_goal=True,rationale='A vid 0 gör ready sant; B vid 1 gör done sant; timers saknar effekt.'),dict(order=['B','A'],scenario_label='neutral',expected_goal=False,rationale='B blockeras vid 0; A vid 1 kan inte leverera och inget retry görs.')],
                 execution=dict(limits=dict(max_paths=100,max_rows=10000,max_steps=10),max_cells=2))
    save(directory/'draft.json',draft)
    return draft


def receipts_at(prepared):
    snapshot=read(prepared/'snapshot.json'); materials=prepared/'materials'
    receipts=[]
    for kind in ['domain_review','customer_confirmation']:
        receipt=dict(schema_version='ce3-pilot-receipt/2',kind=kind,decision='approved',snapshot_id=identity(snapshot),
                     classification=deepcopy(snapshot['classification']),
                     presentation_sha256=hashlib.sha256((prepared/'review.html').read_bytes()).hexdigest(),
                     stated_person='FIKTIV AB-person '+kind,stated_role='FIKTIV testroll',recorded_by='FIKTIV testregistrerare',recorded_at='2026-10-22T15:00:00+02:00',
                     statement='FABRICERAT TESTKVITTO: denna AB-testmodell godtas endast för kontraktsgranskning.',acknowledgements=ACK[:],assumption_ids=[])
        support='receipts/'+kind+'.txt'
        (materials/'receipts').mkdir(exist_ok=True)
        (materials/support).write_text('FABRICERAT TESTUNDERLAG. Inget faktiskt kundsvar.')
        receipt['supporting_records']=[ref(materials,support)]
        rel='receipts/'+kind+'.json'
        save(materials/rel,dict(receipt,schema_version='ce3-pilot-confirmation-record/1'))
        receipt['record']=ref(materials,rel);receipts.append(receipt)
    return receipts


def cli(file,*args):
    return subprocess.run([sys.executable,'-B',str(ROOT/file),*map(str,args)],capture_output=True,text=True)


def inventory(root):
    return {str(p.relative_to(root)):(hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns) for p in root.rglob('*') if p.is_file()}


class IndependentPilotReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='ce3-independent-pilot-')
        cls.root=Path(cls.temp.name)
        cls.draft=draft_at(cls.root/'draft')
        P.prepare(cls.draft,cls.root/'draft/materials',cls.root/'prepared')
        cls.receipts=receipts_at(cls.root/'prepared')
        cls.anchor=cls.root/'trusted.json'
        P.freeze(cls.root/'prepared',cls.receipts,cls.root/'frozen',cls.anchor)
        cls.result=P.run(cls.root/'frozen',cls.anchor,cls.root/'run')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work=Path(tempfile.mkdtemp(dir=self.root))

    def copy(self,name):
        return Path(shutil.copytree(self.root/name,self.work/name))

    def reject_draft(self,draft):
        with self.assertRaises((ValueError,KeyError,TypeError,OSError)):
            P.prepare(draft,self.root/'draft/materials',self.work/'bad')
        self.assertFalse((self.work/'bad/snapshot.json').exists())

    def test_01_independent_model_and_literal_oracle(self):
        r=self.result
        self.assertEqual(r['search_coverage']['status'],'COMPLETE')
        self.assertEqual(r['execution_budget_status'],'VALID')
        self.assertEqual({tuple(c['order']):c['goal_satisfied'] for c in r['explorer_result']['cells']},{('A','B'):True,('B','A'):False})
        for c in r['explorer_result']['cells']:
            self.assertEqual(c['run_status'],'CERTIFIED')
            self.assertEqual(c['event_path_coverage']['audited_paths'],2)
        self.assertEqual(P.verify(self.root/'run',self.anchor),r)

    def test_02_cli_entrypoints_and_boolean_admission_fail_closed(self):
        for script in ['runner.py','scenario_runner.py']:
            for command in ['freeze','run']:
                out=self.work/(script+command)
                p=cli(script,command,'--problem',self.root/'draft/draft.json','--output',out)
                self.assertEqual(p.returncode,1,p.stderr);self.assertFalse(out.exists())
            p=cli(script,'verify','--pins',self.anchor,'--output',self.root/'run/explorer')
            self.assertEqual(p.returncode,1,p.stderr)
        # Feed the correct *inner* declaration too (draft wrapper rejection alone proves nothing).
        save(self.work/'problem.json',self.draft['problem'])
        for script in ['runner.py','scenario_runner.py']:
            for command in ['freeze','run']:
                p=cli(script,command,'--problem',self.work/'problem.json','--output',self.work/(script+command+'inner'))
                self.assertEqual(p.returncode,1,p.stderr)
        with self.assertRaises(ValueError):S.freeze(self.draft['problem'],_admission=True)
        with self.assertRaises(ValueError):E.run(self.draft['problem'],read(self.root/'frozen/manifest.json'),read(self.anchor)['explorer_pins'],self.work/'forbidden')
        p=cli('pilot_runner.py','run','--frozen',self.root/'draft','--anchor',self.anchor,'--output',self.work/'forbidden')
        self.assertEqual(p.returncode,1)

    def test_03_source_hash_missing_mapping_and_broken_refs(self):
        changes=[lambda d:d['evidence'][0]['original'].update(sha256='0'*64),
                 lambda d:d['evidence'][0]['extract'].update(path='missing.txt'),
                 lambda d:d['mapping'][0]['targets'].pop(),
                 lambda d:d['mapping'][0]['refs'][0].update(source_id='unknown'),
                 lambda d:d['mapping'][0]['refs'][0].update(source_version='old'),
                 lambda d:d['problem']['model']['initial'].pop('ready'),
                 lambda d:d['mapping'][0]['refs'][0].update(quote='false quote'),
                 lambda d:d['mapping'][0]['refs'][0].update(end=True)]
        for change in changes:
            with self.subTest(change=change):
                d=deepcopy(self.draft);change(d);self.reject_draft(d)

    def test_04_unicode_crlf_and_escaping_determinism(self):
        d=deepcopy(self.draft)
        note=(self.root/'draft/materials/note.txt').read_bytes().decode()
        start=note.index('Å'); ref0=d['mapping'][0]['refs'][0]
        ref0.update(start=start,end=start+4,quote='Å😀\r\n')
        C.validate_content(d,self.root/'draft/materials')
        ref0.update(end=start+5)
        with self.assertRaises(ValueError):C.validate_content(d,self.root/'draft/materials')
        s=read(self.root/'prepared/snapshot.json')
        s['analysis']['question']='<script>bad()</script> & "quote"'
        s['mapping'][0]['explanation']='<img src=x onerror=alert(1)>'
        a=C.presentation(s)
        self.assertNotIn(b'<script>',a);self.assertNotIn(b'<img',a)
        self.assertIn(b'&lt;script&gt;',a);self.assertIn(b'&lt;img',a)
        self.assertEqual(a,C.presentation(json.loads(encoded(s))))
        # Every independently enumerated field/value is present in the expanded tables.
        from html import escape
        for section in ['model','sources','search','observation','scenario_set']:
            for key,value in walk(s['problem'][section],'/'+section).items():
                self.assertIn(escape(key).encode(),a)
                self.assertIn(escape(json.dumps(value,ensure_ascii=False),quote=True).encode(),a)

    def test_05_observed_limitation_irrelevant_quote_is_accepted(self):
        d=deepcopy(self.draft)
        for m in d['mapping']:
            m['refs'][0].update(start=0,end=1,quote='F')
            m['explanation']='Detta citat bevisar varje modellregel.'
        P.prepare(d,self.root/'draft/materials',self.work/'prepared')
        self.assertTrue((self.work/'prepared/snapshot.json').exists())

    def test_06_control_wrong_answer_order_scenario_and_limits_rejected(self):
        changes=[lambda d:d['controls'][0].update(expected_goal=False),lambda d:d['controls'][0].update(order=['B']),
                 lambda d:d['controls'][0].update(scenario_label='unknown'),lambda d:d['execution']['limits'].update(max_paths=1)]
        for i,change in enumerate(changes):
            d=deepcopy(self.draft);change(d)
            with self.subTest(i=i),self.assertRaises(ValueError):P.prepare(d,self.root/'draft/materials',self.work/str(i))
            self.assertFalse((self.work/str(i)/'snapshot.json').exists())

    def test_07_control_audit_failure_cannot_prepare(self):
        original=P.cli_process
        def fail_audit(command,*args):
            if command=='audit':return {'exit_code':1,'stdout':'','stderr':'injected independent audit-process failure'}
            return original(command,*args)
        with patch.object(P,'cli_process',side_effect=fail_audit),self.assertRaises(ValueError):
            P.prepare(self.draft,self.root/'draft/materials',self.work/'bad')
        self.assertFalse((self.work/'bad/snapshot.json').exists())

    def test_08_receipts_missing_negative_stale_swapped_rejected(self):
        changes=[lambda r:r.pop(),lambda r:r[0].update(decision='rejected'),lambda r:r[0].update(snapshot_id='0'*64),
                 lambda r:r[1].update(presentation_sha256='0'*64),lambda r:r[0].update(record=r[1]['record']),lambda r:r[0].update(acknowledgements=[])]
        for i,change in enumerate(changes):
            receipts=deepcopy(self.receipts);change(receipts)
            with self.subTest(i=i),self.assertRaises(ValueError):P.freeze(self.root/'prepared',receipts,self.work/str(i),self.work/(str(i)+'.anchor'))

    def test_09_confirmed_scope_model_budget_stale(self):
        changes=[lambda s:s['analysis']['includes'].append('ny omfattning'),lambda s:s['problem']['model']['metadata'].update(assumption='changed'),lambda s:s['execution'].update(max_cells=1)]
        for i,change in enumerate(changes):
            p=Path(shutil.copytree(self.root/'prepared',self.work/str(i)))
            s=read(p/'snapshot.json');change(s);save(p/'snapshot.json',s)
            (p/'review.html').write_bytes(C.presentation(s))
            with self.subTest(i=i),self.assertRaises(ValueError):P.freeze(p,self.receipts,self.work/('f'+str(i)),self.work/('a'+str(i)))

    def test_10_negative_record_substring_is_rejected(self):
        p=self.copy('prepared');receipts=deepcopy(self.receipts)
        for r in receipts:
            record=read(p/'materials'/r['record']['path'])
            record['decision']='not_approved'  # No affirmative decision exists in this record.
            record['acknowledgements']=[]
            save(p/'materials'/r['record']['path'],record)
            r['record']=ref(p/'materials',r['record']['path'])
        with self.assertRaisesRegex(ValueError,'Structured confirmation record differs'):
            P.freeze(p,receipts,self.work/'frozen',self.work/'anchor')
        self.assertFalse((self.work/'anchor').exists())

    def test_11_identity_chain_is_independently_hashed(self):
        r=self.result;case=read(self.root/'frozen/case.json');spec=read(self.root/'frozen/batch.json')
        self.assertEqual(r['pilot_case_id'],identity(case));self.assertEqual(r['snapshot_id'],identity(case['snapshot']))
        self.assertEqual(r['batch_spec_id'],identity(spec));self.assertEqual(spec['pilot_binding']['case_id'],identity(case))
        self.assertEqual(r['confirmation_ids'],[identity(x) for x in case['receipts']])
        for c in r['explorer_result']['cells']:
            directory=self.root/'run/explorer/runs'/c['cell_id']
            record=read(directory/'record.json');started=read(directory/'started.json')
            self.assertEqual(record['batch_spec_id'],r['batch_spec_id']);self.assertEqual(started['batch_spec_id'],r['batch_spec_id'])
            self.assertEqual(record['batch_attempt_id'],r['batch_attempt_id'])
            self.assertEqual(c['input_identity'],identity(read(directory/'input.json')))
            self.assertEqual(c['history_id'],identity(read(directory/'history.json.gz')))

    def test_12_two_cases_same_problem_cannot_relabel_run_or_cell(self):
        d=deepcopy(self.draft);d['case_id']='independent-second-case'
        P.prepare(d,self.root/'draft/materials',self.work/'prepared')
        P.freeze(self.work/'prepared',receipts_at(self.work/'prepared'),self.work/'frozen',self.work/'anchor')
        other=P.run(self.work/'frozen',self.work/'anchor',self.work/'other-run')
        self.assertEqual(read(self.work/'anchor')['explorer_pins'],read(self.anchor)['explorer_pins'])
        self.assertNotEqual(other['batch_spec_id'],self.result['batch_spec_id'])
        with self.assertRaises(ValueError):P.verify(self.root/'run',self.work/'anchor')
        target=self.copy('run'); shutil.rmtree(target/'pilot');shutil.copytree(self.work/'frozen',target/'pilot')
        with self.assertRaises(ValueError):P.verify(target,self.work/'anchor')
        # Even matching case/batch at top level cannot authorize an old cell's started/record.
        save(target/'explorer/batch.json',read(self.work/'frozen/batch.json'))
        attempt=read(target/'explorer/attempt.json');attempt['batch_spec_id']=other['batch_spec_id'];save(target/'explorer/attempt.json',attempt)
        r=P.verify(target,self.work/'anchor')
        self.assertTrue(all(c['run_status']=='UNVERIFIED' for c in r['explorer_result']['cells']))

    def test_13_material_traversal_and_symlinks_rejected(self):
        materials=self.work/'materials';shutil.copytree(self.root/'draft/materials',materials)
        (materials/'link.txt').symlink_to(materials/'note.txt')
        (materials/'dir').symlink_to(materials,target_is_directory=True)
        for path in ['../note.txt','/tmp/note.txt','./note.txt','dir/../note.txt','a//b','link.txt','dir/note.txt']:
            d=deepcopy(self.draft);d['evidence'][0]['original']['path']=path
            with self.subTest(path=path),self.assertRaises((ValueError,OSError)):C.validate_content(d,materials)

    def test_14_anchor_copy_alias_and_replacement_rejected(self):
        frozen=self.copy('frozen')
        for path in [frozen/'anchor-copy.json',self.work/'alias',self.work/'hardlink']:
            if path.name=='alias':path.symlink_to(frozen/'anchor-copy.json')
            if path.name=='hardlink':os.link(frozen/'anchor-copy.json',path)
            with self.subTest(path=str(path)),self.assertRaises(ValueError):P.run(frozen,path,self.work/'bad')
        with self.assertRaises(ValueError):P.freeze(self.root/'prepared',self.receipts,self.work/'new',self.anchor)
        anchor=read(self.anchor);anchor['case_id']='0'*64;save(self.work/'wrong-anchor',anchor)
        with self.assertRaises(ValueError):P.verify(self.root/'run',self.work/'wrong-anchor')

    def test_15_relative_external_anchor_and_external_symlink_work(self):
        relative=os.path.relpath(self.anchor,Path.cwd())
        self.assertEqual(P.verify(self.root/'run',relative),self.result)
        alias=self.work/'trusted-alias';alias.symlink_to(self.anchor)
        self.assertEqual(P.verify(self.root/'run',alias),self.result)

    def test_16_anchor_inside_symlinked_pilot_package_is_rejected(self):
        target=self.copy('run')
        detached=self.work/'detached-pilot';shutil.move(str(target/'pilot'),detached)
        (target/'pilot').symlink_to(detached,target_is_directory=True)
        # A distinct package-owned file (not the hardlink/symlink copy check).
        shutil.copyfile(self.anchor,detached/'untrusted-package-anchor.json')
        with self.assertRaisesRegex(ValueError,'Symlink package entry'):
            P.verify(target,target/'pilot/untrusted-package-anchor.json')
        response=cli('pilot_runner.py','verify','--output',target,'--anchor',target/'pilot/untrusted-package-anchor.json')
        self.assertEqual(response.returncode,1,response.stderr)
        self.assertIn('Symlink package entry',response.stderr)

    def test_17_observation_forgery_and_history_path_omission_unknown(self):
        for mutation in ['observation','path','corrupt','audit']:
            root=Path(shutil.copytree(self.root/'run',self.work/mutation))
            cell=self.result['explorer_result']['cells'][0];directory=root/'explorer/runs'/cell['cell_id']
            if mutation=='observation':
                o=read(directory/'observation.json');o['projection']['goal_satisfied']=not o['projection']['goal_satisfied'];save(directory/'observation.json',o)
            elif mutation=='path':
                h=read(directory/'history.json.gz');h['paths'].pop();save(directory/'history.json.gz',h)
            elif mutation=='audit':
                a=read(directory/'audit.json');a['status']='FAIL';save(directory/'audit.json',a)
            else:(directory/'history.json.gz').write_bytes(b'corrupt')
            r=P.verify(root,self.anchor);c=next(c for c in r['explorer_result']['cells'] if c['cell_id']==cell['cell_id'])
            self.assertEqual(c['run_status'],'UNVERIFIED');self.assertIsNone(c['goal_satisfied'])
            self.assertNotEqual(r['search_coverage']['status'],'COMPLETE')

    def test_18_deleted_cell_and_started_only_unknown(self):
        for mode in ['delete','started_only']:
            root=Path(shutil.copytree(self.root/'run',self.work/mode));cell=self.result['explorer_result']['cells'][0]
            directory=root/'explorer/runs'/cell['cell_id']
            if mode=='delete':shutil.rmtree(directory)
            else:(directory/'record.json').unlink()
            r=P.verify(root,self.anchor);c=next(c for c in r['explorer_result']['cells'] if c['cell_id']==cell['cell_id'])
            self.assertIsNone(c['goal_satisfied']);self.assertNotEqual(r['search_coverage']['status'],'COMPLETE')

    def test_19_verify_readonly_no_process_and_cache_ignored(self):
        root=self.copy('run');(root/'result.json').write_text('{"pilot_status":"WRONG"}')
        (root/'explorer/result.json').write_text('not json')
        before=inventory(root)
        with patch.object(P,'cli_process',side_effect=AssertionError('No process in verify')),patch.object(E,'cli_process',side_effect=AssertionError('No process in verify')),patch.object(P,'write_bundle',side_effect=AssertionError('No write')),patch.object(E,'write_bundle',side_effect=AssertionError('No write')):
            self.assertEqual(P.verify(root,self.anchor),self.result)
        self.assertEqual(inventory(root),before)
        p=cli('pilot_runner.py','verify','--output',root,'--anchor',self.anchor)
        self.assertEqual(p.returncode,0,p.stderr);self.assertEqual(json.loads(p.stdout),self.result)
        self.assertEqual(inventory(root),before)

    def test_20_budgets_zero_one_and_outside_prefix(self):
        for budget in [0,1]:
            base=self.work/str(budget);d=deepcopy(self.draft);d['execution']['max_cells']=budget
            P.prepare(d,self.root/'draft/materials',base/'prepared')
            P.freeze(base/'prepared',receipts_at(base/'prepared'),base/'frozen',base/'anchor')
            r=P.run(base/'frozen',base/'anchor',base/'run')
            self.assertEqual(r['pilot_status'],'COMPLETE_CURRENT');self.assertEqual(r['search_coverage']['status'],'INCOMPLETE')
            self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in r['explorer_result']['cells']),budget)
            cell=next(c for c in r['explorer_result']['cells'] if c['run_status']=='NOT_RUN')
            (base/'run/explorer/runs'/cell['cell_id']).mkdir(parents=True)
            r=P.verify(base/'run',base/'anchor');self.assertEqual(r['execution_budget_status'],'INVALID')
            self.assertEqual(cli('pilot_runner.py','verify','--output',base/'run','--anchor',base/'anchor').returncode,2)

    def test_21_result_preserves_explicit_fabrication_label(self):
        self.assertEqual(self.result['classification'],
                         {'case_kind':'fabricated_exercise','receipt_origin':'fabricated_test'})
        self.assertIn('inte en genomförd kundpilot',self.result['case_notice'])
        self.assertIn('FABRICERAD ÖVNING',self.result['case_notice'])
        self.assertEqual(self.result['identity_assurance'],'self_reported_not_authenticated')

    def test_22_declared_blocker_vs_untruthful_scope_exclusion(self):
        issue=dict(id='gap',kind='model_gap',question='Beror leverans på omodellerad kapacitet?',owner='FIKTIV granskare',impact='blocks_analysis',targets=['/model/initial/ready'],disposition='accepted_limitation',reason='Test',refs=[],assumption_ids=[],scenario_event=None,excluded_scope_index=None,previous_scope=None)
        d=deepcopy(self.draft);d['issues']=[issue]
        self.reject_draft(d)
        issue.update(disposition='scope_excluded',impact='outside_scope',targets=[],excluded_scope_index=0,previous_scope='Verklig leverans inklusive kapacitet.')
        # Same analysis/model; only the declaration claims no dependencies remain.
        C.validate_content(d,self.root/'draft/materials')

    def test_23_controls_reaudited_after_hash_repair(self):
        p=self.copy('prepared');s=read(p/'snapshot.json');c=s['controls'][0]
        history=p/'materials'/c['history']['path'];h=read(history);h['paths'].pop();save(history,h)
        c['history']=ref(p/'materials',c['history']['path']);save(p/'snapshot.json',s)
        (p/'review.html').write_bytes(C.presentation(s))
        with self.assertRaises(ValueError):P.freeze(p,receipts_at(p),self.work/'bad',self.work/'anchor')


    def test_24_fresh_training_cli_literal_oracle_and_result_label(self):
        # The generator supplies test INPUT only. Expected answers below are literal,
        # derived from P preparing, N requiring P, and U additionally requiring approval.
        steps=[('pilot_examples/example.py','--output',self.work/'draft'),
               ('pilot_runner.py','prepare','--draft',self.work/'draft/draft.json','--materials',self.work/'draft/materials','--output',self.work/'prepared'),
               ('pilot_examples/example.py','--fabricated-receipts-for',self.work/'prepared','--output',self.work/'receipts.json'),
               ('pilot_runner.py','freeze','--prepared',self.work/'prepared','--receipts',self.work/'receipts.json','--output',self.work/'frozen','--anchor',self.work/'anchor'),
               ('pilot_runner.py','run','--frozen',self.work/'frozen','--anchor',self.work/'anchor','--output',self.work/'run'),
               ('pilot_runner.py','verify','--anchor',self.work/'anchor','--output',self.work/'run')]
        outputs=[]
        for args in steps:
            response=cli(*args);self.assertEqual(response.returncode,0,response.stderr);outputs.append(response.stdout)
        result=json.loads(outputs[-1]);self.assertEqual(result,json.loads(outputs[-2]))
        expected={(word,scenario):word=='PN' or (word=='PU' and scenario=='approved')
                  for word in ['NP','PN','PU','UP'] for scenario in ['approved','rejected','absent']}
        cells=result['explorer_result']['cells']
        self.assertEqual({(''.join(c['order']),c['scenario_label']):c['goal_satisfied'] for c in cells},expected)
        self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in cells),12)
        self.assertEqual(sum(c['goal_satisfied'] for c in cells),4)
        self.assertEqual([c['order'] for c in result['goal_status'] if c['robust']=='TRUE'],[['P','N']])
        self.assertEqual(result['classification'],{'case_kind':'fabricated_exercise','receipt_origin':'fabricated_test'})
        self.assertIn('inte en genomförd kundpilot',result['case_notice'])
        self.assertEqual(read(self.work/'run/result.json'),result)
        self.assertIn('FABRICERAT',(self.work/'prepared/review.html').read_text())

    def test_25_all_legacy_versions_cli_reject_purpose_only_edit(self):
        for name in ['problem','scenario-problem','fixed-slots-problem','temporal-problem','optional-decisions-problem']:
            problem=read(ROOT/'fixtures'/(name+'.json'));problem['purpose']='bounded_real_pilot'
            source=self.work/(name+'.json');save(source,problem)
            script='runner.py' if name=='problem' else 'scenario_runner.py'
            for command in ['freeze','run']:
                target=self.work/(name+'-'+command)
                response=cli(script,command,'--problem',source,'--output',target)
                self.assertEqual(response.returncode,1,response.stderr)
                self.assertIn('without explicit pilot admission',response.stderr)
                self.assertFalse(target.exists())


if __name__=='__main__':unittest.main()
