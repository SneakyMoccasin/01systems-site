"""Fresh audited fixtures for read-only comparison derivation; core is unchanged."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest

HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from service import Store,example,open_model,run_input,uid
from core.history import read_bundle,write_bundle,digest
from core.replay import replay

class Comparison(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='ce3-comparison-')
        cls.store=Store(cls.temp.name)
        source=subprocess.check_output(['git','show','4c2f745:isolated-tests/structural-ce3-workbench/service.py'],text=True)
        cls.old=types.ModuleType('comparison_checkpoint');cls.old.__file__=str(HERE/'service.py')
        exec(compile(source,cls.old.__file__,'exec'),cls.old.__dict__)
        cls.fixtures=[];cls.evidence=[]
        p=example('same_parking');base=deepcopy(p['plans']);p['plans']=[]
        labels={'ready':'positivt besked','rejected':'avslag','absent':'uteblivet besked'}
        for outcome in labels:
            for original in base:
                entry=deepcopy(original);entry['id']=uid();entry['name']+=' · '+labels[outcome];entry['outcomes']={'E_T2':outcome};p['plans'].append(entry)
        p['name']='UI-kontroll · jämförelsens tre elbesked';cls.transport=cls.store.save(p)
        for index,entry in enumerate(p['plans']):
            outcome=entry['outcomes']['E_T2']
            oldp=cls.old.example('same_parking');oldentry=oldp['plans'][index%2];oldentry['outcomes']=deepcopy(entry['outcomes'])
            cls.add_fixture(p,index,'same_parking',outcome,cls.old.run_input(oldp,oldentry))
        # Different condition-ready date and actual retry date, using the same rules.
        delay=deepcopy(base[0]);delay['id']=uid();delay['name']='A · senare uttryckligt försök';delay['outcomes']={'E_T2':'ready'}
        delay['script']['steps']['22']=delay['script']['steps'].pop('20')
        p['plans'].append(delay);p['id']=cls.transport['id'];p['revision']=cls.transport['revision'];p=cls.store.save(p)
        cls.add_fixture(p,6,'delayed','ready')
        cls.transport=p
        factory=example('factory');factory['plans'].append(deepcopy(factory['plans'][0]));factory['plans'][1]['id']=uid();factory['plans'][1]['name']='Senare produktionsstart'
        factory['plans'][1]['script']['steps']['13']=factory['plans'][1]['script']['steps'].pop('12')
        for entry in factory['plans']:entry['outcomes']={event:'approved' for event,rule in factory['model']['events'].items() if rule['kind']=='external'}
        factory=cls.store.save(factory)
        for index in range(2):cls.add_fixture(factory,index,'factory','approved')
        imported=open_model(factory['model']);imported['name']='UI-kontroll · importerad modell utan glappdefinitioner';imported['plans']=deepcopy(factory['plans'])
        imported=cls.store.save(imported)
        for index in range(2):cls.add_fixture(imported,index,'imported','approved')
        cls.imported=imported

    @classmethod
    def add_fixture(cls,p,index,family,outcome,checkpoint_input=None):
        saved=cls.store.get(p['id']) if p.get('id') else cls.transport
        # unsaved source project p can only be the already saved six-plan fixture
        entry=saved['plans'][index];before=run_input(saved,entry)
        if checkpoint_input is not None:assert before==checkpoint_input
        record=cls.store.run(saved['id'],saved['revision'],entry['id'])
        result=cls.store.result(saved['id'],record['id']);assert result['audit']['status']=='PASS'
        history=read_bundle(cls.store.folder(saved['id'])/'runs'/record['id']/'history.json.gz')
        if checkpoint_input is not None:assert history==replay(checkpoint_input, history['limits'])
        assert before==run_input(cls.store.get(saved['id']),entry)
        cls.fixtures.append(dict(family=family,outcome=outcome,project=saved,result=result,paths=history['paths']))
        cls.evidence.append(dict(family=family,plan=entry['name'],input_sha256=digest(before),history_sha256=digest(history),paths=len(history['paths']),audit=result['audit']['status'],checkpoint_identical=checkpoint_input is not None))

    def test_01_operational_identity_and_observation_definitions(self):
        self.assertEqual(len(self.fixtures),11)
        self.assertEqual(sum(f['checkpoint_identical'] for f in self.evidence),6)
        self.assertIsNone(self.imported['presentation'][self.imported['model_identity']].get('comparison'))
        p=self.store.get(self.transport['id']);raw=deepcopy(run_input(p,p['plans'][0]))
        p['presentation'][p['model_identity']]['comparison']['gaps']=[]
        self.assertEqual(raw,run_input(p,p['plans'][0]))

    def test_02_different_outcomes_explicit_comparison_mode(self):
        records=self.store.runs(self.transport['id'])
        a,b=records[0],records[2]
        with self.assertRaises(ValueError):self.store.compare(self.transport['id'],a['id'],b['id'])
        compared=self.store.compare(self.transport['id'],a['id'],b['id'],allow_different_outcomes=True)
        self.assertNotEqual(compared['left']['input']['outcomes'],compared['right']['input']['outcomes'])
        p=self.store.get(self.transport['id']);p['model']['source']+=' changed identity';p=self.store.save(p)
        changed=self.store.run(p['id'],p['revision'],p['plans'][0]['id'])
        with self.assertRaises(ValueError):self.store.compare(p['id'],a['id'],changed['id'],allow_different_outcomes=True)

    @classmethod
    def tearDownClass(cls):
        write_bundle(cls.fixtures,Path('/tmp/ce3-comparison-fixtures.json'))
        exported=cls.store.export(cls.transport['id'])
        exported['versions']=[v for v in exported['versions'] if v['revision']<=cls.transport['revision']]
        exported['runs']=[r for r in exported['runs'] if r['record']['revision']<=cls.transport['revision']]
        write_bundle(exported,Path('/tmp/ce3-comparison-browser.json'))
        write_bundle(cls.store.export(cls.imported['id']),Path('/tmp/ce3-comparison-imported-browser.json'))
        write_bundle(dict(checkpoint='4c2f745',status='PASS',runs=cls.evidence),HERE/'verification/comparison-invariance.json')
        cls.temp.cleanup()

if __name__=='__main__':unittest.main(verbosity=2)
