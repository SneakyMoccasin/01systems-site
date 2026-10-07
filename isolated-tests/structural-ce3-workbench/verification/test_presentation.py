"""Presentation persistence and input/result invariance relative to UI checkpoint a7a5525."""
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
from service import Store,example,open_model,run_input,validate_project
from presentation import decorate,CATALOG
from core.history import digest,read_bundle,write_bundle
from core.replay import replay


class PresentationTests(unittest.TestCase):
    def test_labels_are_complete_sourced_and_model_bound(self):
        for name in ('factory','transport','same_parking'):
            p=example(name);model=p['model'];data=p['presentation'][digest(model)]
            self.assertEqual(set(data['decisions']),set(model['decisions']))
            self.assertEqual(set(data['events']),set(model['events']))
            self.assertEqual(set(data['fields']),set(model['domains']))
            for field,domain in model['domains'].items():
                if 'enum' in domain:
                    self.assertEqual(set(data['values'][field]),{json.dumps(v,ensure_ascii=False,separators=(',',':')) for v in domain['enum']})
            self.assertTrue(all((HERE.parents[1]/path).is_file() for path in data['sources']))
            self.assertTrue(all(plan['outcomes']=={} for plan in p['plans']))
        self.assertEqual(example('transport')['presentation'][digest(example('transport')['model'])]['decisions']['T7'],'Godkänn utökad busstrafik')
        self.assertEqual(CATALOG[digest(example('factory')['model'])]['budget_unit'],'Mkr')
        self.assertEqual(CATALOG[digest(example('transport')['model'])]['budget_unit'],'miljoner')

    def test_no_guess_for_import_or_changed_model(self):
        p=example('factory');imported=open_model(p['model'])
        self.assertEqual(imported['presentation'][digest(p['model'])]['decisions'],{})
        self.assertEqual(imported['presentation'][digest(p['model'])]['budget_unit'],'')
        before=deepcopy(p['presentation']);p['model']['initial']['budget']=7
        changed=decorate(p)
        self.assertEqual(changed['presentation'][changed['model_identity']]['decisions'],{})
        self.assertEqual(changed['presentation'][next(iter(before))],before[next(iter(before))])

    def test_labels_persist_without_changing_operational_input(self):
        with tempfile.TemporaryDirectory() as folder:
            store=Store(folder);p=open_model(example('factory')['model'])
            data=p['presentation'][p['model_identity']]
            data['decisions']['D1']='Min finansieringsansökan'
            data['events']['E_BANK']='Mitt bankbesked'
            data['fields']['bank']='Min bankstatus'
            data['values']['bank']={'"pending"':'Vi inväntar bankens svar'}
            data['outcomes']['E_BANK']={'approved':'Min beviljade finansiering'}
            before=deepcopy(run_input(p,p['plans'][0]))
            p=store.save(p);again=Store(folder).get(p['id'])
            self.assertEqual(p['presentation'],again['presentation'])
            path=store.export_file(p['id'])['path'];imported=store.import_project(read_bundle(path))
            self.assertEqual(imported['presentation'],p['presentation'])
            self.assertEqual(run_input(imported,imported['plans'][0]),before)

    def test_legacy_custom_labels_bind_once(self):
        p=example('factory');del p['presentation'];p['display']['D1']='Eget tidigare namn'
        decorated=decorate(p)
        self.assertEqual(decorated['presentation'][decorated['model_identity']]['decisions']['D1'],'Eget tidigare namn')
        self.assertEqual(decorated['presentation'][decorated['model_identity']]['decisions']['D2'],'Teckna avtal för lokalen i Polen')
        decorated['model']['source']+=' new identity'
        changed=decorate(decorated)
        self.assertEqual(changed['presentation'][changed['model_identity']]['decisions'],{})

    def test_checkpoint_inputs_histories_and_attempt_order_are_identical(self):
        source=subprocess.check_output(['git','show','a7a5525:isolated-tests/structural-ce3-workbench/service.py'],text=True)
        old=types.ModuleType('ui_checkpoint');old.__file__=str(HERE/'service.py')
        exec(compile(source,old.__file__,'exec'),old.__dict__)
        evidence=[]
        for family in ('factory','transport','same_parking'):
            before=old.example(family);after=example(family)
            for a,b in zip(before['plans'],after['plans']):
                self.assertEqual(a['script'],b['script'])
                self.assertEqual(sum(len(v) for v in b['script']['steps'].values()),8 if family=='factory' else 13)
                outcomes={id:rule['absent']['outcome'] for id,rule in after['model']['events'].items() if rule['kind']=='external'}
                a['outcomes']=deepcopy(outcomes);b['outcomes']=deepcopy(outcomes)
                original=old.run_input(before,a);current=run_input(after,b)
                self.assertEqual(original,current)
                before_history=replay(original);after_history=replay(current)
                self.assertEqual(before_history,after_history)
                after['presentation'][after['model_identity']]['decisions'][next(iter(after['model']['decisions']))]='Ändrad etikett'
                self.assertEqual(run_input(after,b),original)
                evidence.append(dict(family=family,plan=b['name'],input_sha256=digest(current),history_sha256=digest(after_history),paths=len(after_history['paths'])))
                if family!='factory':
                    self.assertEqual([step for step,rows in b['script']['steps'].items() for row in rows if row['decision']=='T7'],['12','20'])
        self.assertEqual(len(evidence),5)
        write_bundle(dict(status='PASS',checkpoint='a7a5525',comparisons=evidence),HERE/'verification/presentation-invariance.json')


if __name__=='__main__':unittest.main(verbosity=2)
