"""UI batch reader and isolated variable/incomplete order fixtures."""
import json,sys,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1];sys.path.insert(0,str(HERE))
from service import Store,open_model,plan,run_input,LIMITS
class Coverage(unittest.TestCase):
 def test_batch_and_certification(self):
  model=json.loads((HERE/'verification/fixtures/order-variation.json').read_text())
  with tempfile.TemporaryDirectory() as folder:
   store=Store(folder);p=open_model(model);p['name']='UI-test: varierande huvudmått'
   p['plans']=[plan('Försök vecka '+str(t),{'schema_version':'ce3-script/1','source':'Fixture','steps':{str(t):[{'decision':'D','mode':'attempt'}]}}) for t in [1,2]]
   data=p['presentation'][p['model_identity']];data.update(decisions={'D':'Genomför testbeslut'},events={'READY':'Förberedelsen blir klar','ACCEPT':'Prövning av testvillkoret'},fields={'accepted':'Testvillkoret är uppfyllt'},budget_unit='testenheter',comparison={'focus':{'field':'accepted','op':'eq','value':True},'gaps':[{'name':'Testglapp','after':{'field':'anchor','op':'eq','value':True},'until':{'field':'accepted','op':'eq','value':True}}]})
   p=store.save(p);fixtures=[]
   for entry in p['plans']:
    record=store.run(p['id'],p['revision'],entry['id']);result=store.result(p['id'],record['id']);bundle=store.comparison_paths(p['id'],record['id'])
    self.assertEqual(bundle['audit']['status'],'PASS');self.assertEqual(len(bundle['paths']),2)
    self.assertEqual(bundle['input_sha256'],record['input_sha256'])
    fixtures.append(dict(project=p,result=result,bundle=bundle))
   Path('/tmp/ce3-variable-comparison.json').write_text(json.dumps(fixtures))
   Path('/tmp/ce3-variable-comparison-export.json').write_text(json.dumps(store.export(p['id'])))
   record=store.run(p['id'],p['revision'],p['plans'][1]['id'],dict(LIMITS,max_paths=1))
   result=store.result(p['id'],record['id']);self.assertEqual(result['status'],'INCOMPLETE')
   with self.assertRaises(ValueError):store.comparison_paths(p['id'],record['id'])
   Path('/tmp/ce3-incomplete-comparison-export.json').write_text(json.dumps(store.export(p['id'])))
if __name__=='__main__':unittest.main(verbosity=2)
