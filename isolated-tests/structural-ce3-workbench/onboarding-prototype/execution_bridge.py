"""Offline orchestration only. Reuse workbench validation, storage, replay and audit."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from service import Store, open_model
from core.schema import validate
from core.history import digest, read_bundle, write_bundle


def observations(paths, day):
    result = []
    for index, path in enumerate(paths):
        rows = [r for r in path['history'] if r['action'] in ('function_test', 'test_done', 'approval', 'start')
                and r['kind'] in ('decision_executed', 'attempt_blocked', 'event_applied', 'script_skip')]
        starts = [r for r in rows if r['action'] == 'start' and r['kind'] == 'decision_executed']
        first = starts[0]['step'] if starts else None
        result.append(dict(path=index, started_by_day=first is not None and first <= day,
                           actual_start=first, trace=rows))
    return result


def dispatch(operation, folder, payload):
    inputs = [validate(s['input']) for s in payload['scenarios']]
    if operation == 'validate':
        return dict(valid=True, input_digests=[digest(v) for v in inputs])
    store = Store(folder / 'projects')
    ledger = folder / 'attempt.json'
    if operation == 'run':
        # Exclusive marker survives interruption. Never silently rerun an uncertain attempt.
        with ledger.open('x') as f:
            json.dump(dict(payload_digest=digest(payload), assumptions_acknowledged=True, projects=[]), f)
        for scenario in payload['scenarios']:
            project = open_model(scenario['input'])
            project['name'] = scenario['label']
            project = store.save(project)
            state = read_bundle(ledger)
            state['projects'].append(dict(scenario=scenario['id'], project=project['id']))
            write_bundle(state, ledger)
            store.run(project['id'], project['revision'], project['plans'][0]['id'],
                      dict(max_paths=16, max_rows=2000, max_steps=16))
    if not ledger.exists():
        return dict(status='prepared', scenarios=[])
    state = read_bundle(ledger)
    if state['payload_digest'] != digest(payload):
        raise ValueError('Körjournalens indataidentitet stämmer inte.')
    results = []
    for scenario in payload['scenarios']:
        entries = [e for e in state['projects'] if e['scenario'] == scenario['id']]
        if len(entries) != 1:
            results.append(dict(id=scenario['id'], status='INCOMPLETE', error='Scenariot saknar en entydig körning.'))
            continue
        project = entries[0]['project']
        runs = store.runs(project)
        if len(runs) != 1:
            results.append(dict(id=scenario['id'], status='INCOMPLETE', error='Försöket saknar slutbesked. Förbered ett nytt test.'))
            continue
        result = store.result(project, runs[0]['id'])  # re-audit, never replay on opening
        if digest(result['input']) != digest(scenario['input']):
            raise ValueError('Sparad motorindata skiljer sig från den bundna översättningen.')
        good = result['audit']['status'] == 'PASS' and result['status'] == 'COMPLETE'
        history = read_bundle(store.folder(project) / 'runs' / runs[0]['id'] / 'history.json.gz') if good else None
        results.append(dict(id=scenario['id'], status=result['status'], audit=result['audit'],
                            input_digest=digest(result['input']), model_digest=result['model_identity'],
                            run_id=runs[0]['id'], project_id=project,
                            observations=observations(history['paths'], payload['assumptions']['analysis_day']) if good else []))
    complete = len(results) == 2 and all(r['status'] == 'COMPLETE' and r.get('audit', {}).get('status') == 'PASS' for r in results)
    return dict(status='complete' if complete else 'incomplete', scenarios=results)


if __name__ == '__main__':
    try:
        # No network or provider imports. Only local Python core subprocesses.
        print(json.dumps(dispatch(sys.argv[1], Path(sys.argv[2]), json.load(sys.stdin)), ensure_ascii=False))
    except Exception as error:
        print(json.dumps(dict(error=str(error)), ensure_ascii=False))
        sys.exit(1)
