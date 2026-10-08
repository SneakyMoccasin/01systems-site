"""Rebuild evidence in temporary storage; never modify model or saved runs."""
import json, sys, tempfile, subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]))
from service import digest
from core.replay import replay
from audit.verify import audit_bundle
spec=json.loads((HERE/'replay-inputs.json').read_text())
with tempfile.TemporaryDirectory(prefix='ce3-order-reproduction-') as directory:
    generated=[]
    for item in spec['runs']:
        value=dict(schema_version='ce3-run/1',profile='fixed-replay/0.1',model=spec['model'],script=item['script'],outcomes=item['outcomes'],sources=spec['sources'])
        assert digest(value)==item['input_sha256']
        history=replay(value,item['limits'])
        assert digest(history)==item['history_sha256'], 'Complete history changed'
        audit=audit_bundle(history,item['input_sha256'])
        assert audit['all_event_permutations'] and audit['status']=='PASS'
        generated.append(dict(name=item['name'],history=history))
    target=Path(directory)/'histories.json';target.write_text(json.dumps(dict(definition=spec['definition'],runs=generated)))
    subprocess.run(['node',str(HERE/'reproduce.cjs'),str(target)],check=True)
print('PASS: full input/history identities, independent audit, all-path metrics and 768 pairings reproduced')
