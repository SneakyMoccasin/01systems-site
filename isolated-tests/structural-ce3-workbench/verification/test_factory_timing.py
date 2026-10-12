"""Real core replay, storage and independent audit for declared timing plans."""
from copy import deepcopy
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from factory_timing import timing_comparison
from service import Store, run_input
from core.history import digest, write_bundle
from core.schema import validate, UnsupportedFeature

class FactoryTiming(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(prefix='ce3-timing-')
        cls.store=Store(cls.tmp.name);cls.fixtures=[]
        for scenario in ('base','customer_absent'):
            p=cls.store.save(timing_comparison(scenario));runs=[]
            for entry in p['plans']:
                record=cls.store.run(p['id'],p['revision'],entry['id'])
                runs.append(dict(result=cls.store.result(p['id'],record['id']),bundle=cls.store.comparison_paths(p['id'],record['id'])))
            cls.fixtures.append(dict(scenario=scenario,project=p,runs=runs))
        write_bundle(cls.fixtures,Path('/tmp/ce3-factory-timing-fixtures.json'))

    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()

    def test_same_actions_and_only_declared_timing_changes(self):
        f=self.fixtures[0];a,b=[r['result']['input'] for r in f['runs']]
        for key in ('model','sources','outcomes'):self.assertEqual(a[key],b[key])
        positions=lambda s:{row['decision']:(int(week),i,row['mode']) for week,rows in s['steps'].items() for i,row in enumerate(rows)}
        x,y=positions(a['script']),positions(b['script'])
        self.assertEqual(set(x),set(y))
        self.assertEqual({k:(x[k],y[k]) for k in x if x[k]!=y[k]}, {'D5':((2,1,'attempt'),(6,0,'attempt')),'D6':((6,0,'attempt'),(10,0,'attempt')),'D8':((8,0,'attempt'),(12,0,'attempt'))})
        bad=deepcopy(a);bad['script']['steps']['2'][1]['mode']='if_customer_approved'
        with self.assertRaises(UnsupportedFeature):validate(bad)
        absent=self.fixtures[1]
        for key in ('model','sources'):self.assertEqual(f['project'][key],absent['project'][key])
        self.assertEqual(f['project']['plans'][0]['script'],absent['project']['plans'][0]['script'])
        for i in (0,1):self.assertEqual(absent['project']['plans'][i]['outcomes'],{'E_BANK':'approved','E_CUSTOMER':'absent','E_QUALITY':'approved'})
        self.assertNotIn('D5',positions(absent['project']['plans'][1]['script']))
        self.assertNotIn('D6',positions(absent['project']['plans'][1]['script']))
        self.assertEqual(positions(absent['project']['plans'][1]['script'])['D8'][0],12)

    def test_actual_traces_and_payments(self):
        for f in self.fixtures:
            absent=f['scenario']=='customer_absent'
            for i,run in enumerate(f['runs']):
                self.assertEqual(run['result']['audit']['status'],'PASS')
                self.assertEqual(run['result']['status'],'COMPLETE')
                for path in run['bundle']['paths']:
                    rows=path['history'];executed=[r for r in rows if r['kind']=='decision_executed']
                    starts=[r['step'] for r in executed if r['action']=='D8']
                    self.assertEqual(starts,[] if absent else [8 if i==0 else 12])
                    paid=sum(r['before']['state']['budget']-r['after']['state']['budget'] for r in executed)
                    self.assertEqual(paid,7 if absent and i else 10)
                    customer=sum(r['before']['state']['budget']-r['after']['state']['budget'] for r in executed if r['before']['state']['customer']!='approved')
                    self.assertEqual(customer,(10 if i==0 else 7) if absent else (9 if i==0 else 7))
                    blocked=[r for r in rows if r['kind']=='attempt_blocked']
                    self.assertEqual([r['action'] for r in blocked],['D8'] if absent else [])
                    if absent and i:self.assertEqual({v['field'] for v in blocked[0]['failures']},{'pl_machines','quality','customer'})
                    if not absent:
                        quality=next(r for r in executed if r['action']=='D6')
                        arrival=next(r for r in rows if r['action']=='E_MOVED_MACHINE' and r['kind']=='event_applied')
                        self.assertEqual(arrival['step'],quality['step']);self.assertLess(arrival['index'],quality['index'])
                        start=next(r for r in executed if r['action']=='D8')
                        approval=next(r for r in rows if r['action']=='E_QUALITY' and r['kind']=='event_applied')
                        self.assertEqual(approval['step'],start['step']);self.assertLess(approval['index'],start['index'])

    def test_storage_binding_reopen_and_scenario_separation(self):
        for f in self.fixtures:
            p=f['project'];self.assertEqual(Store(self.tmp.name).get(p['id']),p)
            a,b=[r['result'] for r in f['runs']]
            self.store.compare(p['id'],a['record']['id'],b['record']['id'])
            for entry,r in zip(p['plans'],[a,b]):self.assertEqual(digest(run_input(p,entry)),r['record']['input_sha256'])
            imported=self.store.import_project(self.store.export(p['id']))
            self.assertEqual(imported['plans'],p['plans'])
            for r in self.store.runs(imported['id']):self.assertEqual(self.store.result(imported['id'],r['id'])['audit']['status'],'PASS')
            altered=deepcopy(p);altered['plans'][0]['outcomes']['E_CUSTOMER']='rejected'
            altered=self.store.save(altered);r=self.store.run(p['id'],altered['revision'],altered['plans'][0]['id'])
            with self.assertRaises(ValueError):self.store.compare(p['id'],r['id'],b['record']['id'])
            self.assertEqual(self.store.get(p['id'],p['revision']),p)

if __name__=='__main__':unittest.main(verbosity=2)
