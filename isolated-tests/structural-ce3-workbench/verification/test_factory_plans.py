"""Real replay + independent stored-history audit, no AI or result doubles."""
from copy import deepcopy
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from factory_plans import factory_comparison, MODEL
from service import Store, run_input
from core.history import digest, write_bundle

class FactoryPlans(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='ce3-factory-plans-')
        cls.store = Store(cls.tmp.name)
        cls.fixtures = []
        for scenario in ('base', 'customer_absent'):
            p = cls.store.save(factory_comparison(scenario))
            runs = []
            for entry in p['plans']:
                record = cls.store.run(p['id'], p['revision'], entry['id'])
                result = cls.store.result(p['id'], record['id'])
                bundle = cls.store.comparison_paths(p['id'], record['id'])
                runs.append(dict(result=result, bundle=bundle))
            cls.fixtures.append(dict(scenario=scenario, project=p, runs=runs))
        write_bundle(cls.fixtures, Path('/tmp/ce3-factory-plan-fixtures.json'))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_actual_four_runs_and_whole_interval(self):
        for fixture in self.fixtures:
            for i, run in enumerate(fixture['runs']):
                r, bundle = run['result'], run['bundle']
                self.assertEqual(r['audit']['status'], 'PASS')
                self.assertTrue(r['complete'])
                self.assertEqual(len(bundle['paths']), 4 if i == 0 else 2)
                self.assertEqual(r['model_identity'], MODEL)
                for path in bundle['paths']:
                    rows = path['history']
                    starts = [x['step'] for x in rows if x['kind']=='decision_executed' and x['action']=='D8']
                    self.assertEqual(starts, [12] if fixture['scenario']=='base' else [])
                    losses = [x['step'] for x in rows for side in ('before','after') if not (
                        x[side]['state']['se_premises'] and x[side]['state']['se_team'] and x[side]['state']['original_machine']=='sweden_in_use')]
                    self.assertEqual(min(losses) if losses else None, 2 if i==0 else None)
                    self.assertEqual(rows[-1]['after']['state']['budget'], 4 if i==0 else 0)
                    blocked = [x for x in rows if x['kind']=='attempt_blocked']
                    self.assertEqual([x['action'] for x in blocked], ['D8'] if fixture['scenario']=='customer_absent' else [])
                    if blocked:self.assertEqual([f['field'] for f in blocked[0]['failures']], ['customer'])

    def test_identical_premises_and_exact_plan_difference(self):
        for f in self.fixtures:
            a,b = [r['result'] for r in f['runs']]
            for key in ('model','sources','outcomes'):self.assertEqual(a['input'][key],b['input'][key])
            expected = deepcopy(b['input']['script'])
            expected['steps']['2'][1]['decision']='D5'
            self.assertEqual(expected, a['input']['script'])
            self.store.compare(f['project']['id'], a['record']['id'], b['record']['id'])
        a,b=self.fixtures
        self.assertEqual(a['project']['model'],b['project']['model'])
        for i in (0,1):
            self.assertEqual(a['project']['plans'][i]['script'],b['project']['plans'][i]['script'])
        self.assertNotEqual(a['project']['plans'][0]['outcomes'],b['project']['plans'][0]['outcomes'])

    def test_storage_binding_and_reopen(self):
        for f in self.fixtures:
            p=f['project']
            self.assertEqual(self.store.get(p['id']),p)
            for entry,run in zip(p['plans'],f['runs']):
                r=run['result']
                self.assertEqual(r['record']['input_sha256'],digest(run_input(p,entry)))
            imported=self.store.import_project(self.store.export(p['id']))
            self.assertEqual(imported['plans'],p['plans'])
            self.assertEqual(imported['sources'],p['sources'])
            for r in self.store.runs(imported['id']):
                self.assertEqual(self.store.result(imported['id'],r['id'])['audit']['status'],'PASS')
            changed=deepcopy(p);changed['plans'][0]['outcomes']['E_CUSTOMER']='rejected'
            changed=self.store.save(changed)
            r=self.store.run(p['id'],changed['revision'],changed['plans'][0]['id'])
            with self.assertRaises(ValueError):self.store.compare(p['id'],r['id'],f['runs'][1]['result']['record']['id'])
            self.assertEqual(self.store.get(p['id'],p['revision']),p)

if __name__=='__main__':unittest.main(verbosity=2)
