"""Integration checks with fresh engine histories and separate-process audits."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from service import Store, example, open_model, run_input, inspect_history, uid, LIMITS, CORE
from core.history import read_bundle, write_bundle, digest, loads
from core.schema import InputError


class Workbench(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='ce3-ui-verification-')
        cls.store = Store(cls.temporary.name)
        cls.evidence = []

    @classmethod
    def tearDownClass(cls):
        if '--keep-evidence' in sys.argv:
            return
        cls.temporary.cleanup()

    def prepared(self, name, outcome=None):
        p = example(name)
        if name == 'factory':
            outcomes = read_bundle(HERE.parent / 'structural-ce-v1-factory-witness/candidate.json')['external_outcomes']
        else:
            outcomes = {'E_T2': outcome or 'ready'}
        for entry in p['plans']:
            entry['outcomes'] = deepcopy(outcomes)
        return p

    def execute(self, p, plan_index=0, limits=None):
        record = self.store.run(p['id'], p['revision'], p['plans'][plan_index]['id'], limits)
        result = self.store.result(p['id'], record['id'])
        self.evidence.append({'project':p['name'], 'run':record['id'], 'identity':record['input_sha256'],
                              'status':result['status'], 'audit':result['audit']['status'], 'paths':len(result['paths'])})
        return record, result

    def test_01_factory_full_flow_and_new_process_reopen(self):
        p = self.prepared('factory')
        raw = run_input(p, p['plans'][0])
        opened = open_model(raw)
        self.assertEqual(opened['model'], p['model'])
        copy = deepcopy(p['plans'][0]); copy['id'] = uid(); copy['name'] = 'Kopia · uppskjuten'
        copy['script']['steps']['13'] = copy['script']['steps'].pop('12')
        p['plans'].append(copy)
        p = self.store.save(p)
        a, ar = self.execute(p)
        b, br = self.execute(p, 1)
        self.assertEqual(ar['audit']['status'], 'PASS')
        self.assertEqual(len(ar['paths']), 2)
        self.assertEqual(ar['paths'][ar['reference']]['remaining'], 0)
        paths = [self.store.path(p['id'], r['id'], 0) for r in (a,b)]
        self.assertEqual([next(row['step'] for row in path['history'] if row['action']=='D8' and row['kind']=='decision_executed') for path in paths], [12,13])
        self.store.compare(p['id'], a['id'], b['id'])
        p['name'] = 'Fabriken · sparad'
        p = self.store.save(p)
        # A genuinely new Python process constructs the same store after restart.
        code = 'import sys;sys.path.insert(0,sys.argv[1]);from service import Store;print(Store(sys.argv[2]).get(sys.argv[3])["revision"])'
        revision = subprocess.check_output([sys.executable,'-B','-c',code,str(HERE),str(self.store.root),p['id']],text=True)
        self.assertEqual(int(revision), 2)
        export_file = self.store.export_file(p['id'])
        exported = read_bundle(export_file['path'])
        self.assertGreater(export_file['bytes'], 0)
        self.assertNotEqual(self.store.export_file(p['id'])['path'], export_file['path'])
        imported = self.store.import_project(exported)
        self.assertNotEqual(imported['id'], p['id'])
        self.assertEqual(imported['plans'], p['plans'])
        self.assertEqual(imported['saved_at'], p['saved_at'])
        self.assertEqual(len(self.store.runs(imported['id'])), 2)
        self.assertEqual(self.store.result(imported['id'], a['id'])['audit']['status'], 'PASS')

    def test_02_transport_full_flow_and_budget_projection(self):
        p = self.store.save(self.prepared('transport'))
        a, ar = self.execute(p); b, br = self.execute(p,1)
        self.assertEqual((len(ar['paths']),len(br['paths'])),(4,96))
        self.store.compare(p['id'],a['id'],b['id'])
        path = self.store.path(p['id'],a['id'],ar['reference'])
        self.assertTrue(any(r['kind']=='attempt_blocked' for r in path['history']))
        for record, result in [(a,ar),(b,br)]:
            history=read_bundle(self.store.folder(p['id'])/'runs'/record['id']/'history.json.gz')
            for summary, source in zip(result['paths'], history['paths']):
                spent=sum(p['model']['decisions'][r['action']]['cost'] for r in source['history'] if r['kind']=='decision_executed')
                events=sum(r['after']['state']['budget']-r['before']['state']['budget'] for r in source['history'] if r['kind']=='event_applied')
                self.assertEqual(summary['spent'],spent)
                self.assertEqual(summary['remaining'],p['model']['initial']['budget']-spent+events)
                self.assertEqual(summary['inflow']-summary['event_outflow'],events)
        clone=deepcopy(p['plans'][1]);clone['id']=uid();clone['name']='Plan B · kopia'
        clone['script']['steps']['21']=clone['script']['steps'].pop('20')
        p['plans'].append(clone);p=self.store.save(p)
        copied, reviewed = self.execute(p,2)
        self.assertEqual(reviewed['audit']['status'],'PASS')
        self.store.compare(p['id'],b['id'],copied['id'])
        copied_path=self.store.path(p['id'],copied['id'],reviewed['reference'])
        self.assertTrue(any(r['step']==21 and r['kind']=='script_skip' for r in copied_path['history']))
        p=Store(self.store.root).get(p['id'])
        imported=self.store.import_project(self.store.export(p['id']))
        self.assertEqual(len(imported['plans']),3)
        self.assertEqual(imported['plans'],p['plans'])

    def test_03_explicit_outcomes_required(self):
        p=example('factory')
        self.assertEqual(p['plans'][0]['outcomes'],{})
        p=self.store.save(p)
        with self.assertRaises(InputError): self.execute(p)
        self.assertEqual(self.store.runs(p['id']),[])

    def test_04_invalid_unused_rule_rejected(self):
        p=self.prepared('factory')
        event=next(iter(p['model']['events'].values()))
        next(iter(event['outcomes'].values()))['schedule']={'event':'invalid','delay':1}
        with self.assertRaises(InputError):self.store.save(p)
        with self.assertRaises(ValueError):loads('{"model":1,"model":2}')
        with self.assertRaises(ValueError):loads('{"value":NaN}')

    def test_05_negative_absent_and_later_independent_attempt(self):
        for outcome in ('rejected','absent'):
            p=self.store.save(self.prepared('same_parking',outcome))
            for n in (0,1):
                record,result=self.execute(p,n)
                self.assertEqual(result['audit']['status'],'PASS')
                path=self.store.path(p['id'],record['id'],result['reference'])
                event=next(r for r in path['history'] if r['action']=='E_T2' and r['kind']=='event_applied')
                self.assertEqual(event['outcome'],outcome)
                self.assertTrue(any(r['action']=='T7' and r['kind']=='attempt_blocked' for r in path['history']))
                self.assertTrue(any(r['action']=='T12' and r['kind']=='decision_executed' for r in path['history']))
                if outcome=='absent':
                    absent=p['model']['events']['E_T2']['absent']
                    self.assertEqual(event['after']['state'][absent['field']],absent['value'])

    def test_06_order_sensitivity_includes_intermediate_state(self):
        p=self.store.save(self.prepared('same_parking'))
        record,result=self.execute(p)
        self.assertEqual(len(result['paths']),8)
        self.assertTrue(result['order_sensitive'])
        self.assertTrue(any('cycle_ready' in v['fields'] for v in result['variations']))
        self.assertEqual(len({digest(s['final']['state']) for s in result['paths']}),1)

    def test_07_incomplete_is_not_reviewed(self):
        p=self.store.save(self.prepared('transport'))
        record,result=self.execute(p,limits=dict(LIMITS,max_paths=1))
        self.assertEqual(result['status'],'INCOMPLETE')
        self.assertNotEqual(result['audit']['status'],'PASS')
        self.assertEqual(result['paths'],[])
        with self.assertRaises(ValueError):self.store.path(p['id'],record['id'],0)

    def test_08_tampered_import_and_read_fail_closed(self):
        p=self.store.save(self.prepared('factory'))
        record,result=self.execute(p)
        exported=self.store.export(p['id'])
        exported['runs'][0]['history']['paths'][0]['history'][0]['after']['state']['budget']+=1
        imported=self.store.import_project(exported)
        failed=self.store.result(imported['id'],record['id'])
        self.assertEqual(failed['audit']['status'],'FAIL')
        self.assertEqual(failed['paths'],[])
        with self.assertRaises(ValueError):self.store.path(imported['id'],record['id'],0)
        # Corruption AFTER the first audit also cannot inherit the previous PASS.
        folder=self.store.folder(p['id'])/'runs'/record['id']
        write_bundle(exported['runs'][0]['history'],folder/'history.json.gz')
        self.assertEqual(self.store.result(p['id'],record['id'])['audit']['status'],'FAIL')

    def test_09_mismatched_outcomes_or_model_cannot_compare(self):
        p=self.store.save(self.prepared('factory'))
        a,_=self.execute(p)
        event=next(iter(p['plans'][0]['outcomes']))
        p['plans'][0]['outcomes'][event]=next(o for o in p['model']['events'][event]['outcomes'] if o!=p['plans'][0]['outcomes'][event])
        p=self.store.save(p);b,_=self.execute(p)
        with self.assertRaises(ValueError):self.store.compare(p['id'],a['id'],b['id'])
        p['model']['source']+=' changed';p=self.store.save(p);c,_=self.execute(p)
        with self.assertRaises(ValueError):self.store.compare(p['id'],b['id'],c['id'])

    def test_10_version_conflict_and_immutability(self):
        p=self.store.save(self.prepared('factory'));old=deepcopy(p)
        first=(self.store.folder(p['id'])/'versions/000001.json').read_bytes()
        p['plans'][0]['name']='Nytt namn';self.store.save(p)
        with self.assertRaises(ValueError):self.store.save(old)
        self.assertEqual((self.store.folder(p['id'])/'versions/000001.json').read_bytes(),first)
        with self.assertRaises(ValueError):self.store.get('../escape')

    def test_11_no_budget_and_unknown_labels(self):
        p=self.prepared('transport')
        p['model']['budget']=None
        for d in p['model']['decisions'].values():d['cost']=0
        p['display']={};p=self.store.save(p)
        _,result=self.execute(p)
        self.assertEqual(result['audit']['status'],'PASS')
        self.assertTrue(all(s['remaining'] is None and s['spent'] is None for s in result['paths']))

    def test_12_skip_instruction_and_same_step_order(self):
        p=self.prepared('transport')
        p['plans']=p['plans'][:1]
        p['plans'][0]['script']['steps']={'0':[{'decision':'T1','mode':'attempt'}, {'decision':'T1','mode':'if_not_taken'}, {'decision':'T1','mode':'attempt'}, {'decision':'T12','mode':'attempt'}]}
        p=self.store.save(p);record,result=self.execute(p)
        path=self.store.path(p['id'],record['id'],0)
        attempts=[r['kind'] for r in path['history'] if r['script_position'] is not None]
        self.assertEqual(attempts,['decision_executed','script_skip','attempt_blocked','decision_executed'])

    def test_13_interrupted_run_is_visible_and_exportable(self):
        p=self.store.save(self.prepared('factory'))
        run_id=uid();folder=self.store.folder(p['id'])/'runs'/run_id
        value=run_input(p,p['plans'][0])
        write_bundle(value,folder/'input.json')
        write_bundle(dict(id=run_id, project_id=p['id'],revision=p['revision'],plan_id=p['plans'][0]['id'],
                          plan_name=p['plans'][0]['name'],created_at='2026-10-07T00:00:00Z',
                          input_sha256=digest(value),run_status='RUNNING',audit_status='PENDING',limits=LIMITS),folder/'started.json')
        self.store.active.add(run_id)
        self.assertEqual(self.store.runs(p['id'])[0]['run_status'],'RUNNING')
        self.assertEqual(self.store.result(p['id'],run_id)['audit']['status'],'PENDING')
        self.store.active.discard(run_id)
        self.assertEqual(self.store.runs(p['id'])[0]['run_status'],'ERROR')
        result=self.store.result(p['id'],run_id)
        self.assertEqual(result['audit']['status'],'FAIL')
        self.assertEqual(result['paths'],[])
        imported=self.store.import_project(self.store.export(p['id']))
        self.assertEqual(self.store.runs(imported['id'])[0]['run_status'],'ERROR')

    def test_14_import_identity_rejection_is_atomic(self):
        p=self.store.save(self.prepared('factory'));self.execute(p)
        exported=self.store.export(p['id']);exported['runs'][0]['input']['sources']={}
        before=self.store.list()
        with self.assertRaises(ValueError):self.store.import_project(exported)
        self.assertEqual(self.store.list(),before)


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(Workbench)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    report=dict(status='PASS' if result.wasSuccessful() else 'FAIL',tests=result.testsRun,
                failures=[str(t) for t,_ in result.failures+result.errors], fresh_runs=Workbench.evidence)
    write_bundle(report,HERE/'verification/latest.json')
    sys.exit(0 if result.wasSuccessful() else 1)
