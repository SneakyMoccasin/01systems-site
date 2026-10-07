"""Run after test_comparison.py: compare complete fixtures with d5d2da7."""
import sys,json,types,subprocess
from pathlib import Path
here=Path(__file__).resolve().parents[1];sys.path.insert(0,str(here))
from service import run_input
from core.replay import replay
from core.history import digest
old=types.ModuleType('checkpoint');old.__file__=str(here/'service.py');exec(compile(subprocess.check_output(['git','show','d5d2da7:isolated-tests/structural-ce3-workbench/service.py'],text=True),old.__file__,'exec'),old.__dict__)
fixtures=json.load(open('/tmp/ce3-comparison-fixtures.json'));evidence=[]
for f in fixtures:
 p=f['project'];plan=next(x for x in p['plans'] if x['id']==f['result']['record']['plan_id']);a=run_input(p,plan);b=old.run_input(p,plan);assert a==b
 history=replay(b,f['result']['record']['limits']);assert history['paths']==f['paths']
 evidence.append(dict(family=f['family'],outcome=f['outcome'],plan=plan['name'],paths=len(history['paths']),input_sha256=digest(a),history_sha256=digest(history),identical_to_checkpoint=True))
(here/'verification/plan-workspace-invariance.json').write_text(json.dumps(dict(checkpoint='d5d2da7',cases=evidence),ensure_ascii=False,indent=2)+'\n')
print('PASS: all 11 complete audited path sets and operational inputs identical to d5d2da7')
