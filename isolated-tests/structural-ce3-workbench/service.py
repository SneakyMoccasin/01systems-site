"""Local persistence and presentation only. All semantics live in the existing core."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import uuid

HERE = Path(__file__).resolve().parent
CORE = HERE.parent / 'structural-ce3-replay'
sys.path.insert(0, str(CORE))
from core.history import digest, read_bundle, write_bundle
from core.schema import validate, InputError, PROFILE
from adapters.factory_v1 import adapt as factory_adapt
from adapters.transport_t1 import adapt as transport_adapt

from presentation import decorate, validate_presentation

LIMITS = {'max_paths': 1000, 'max_rows': 200000, 'max_steps': 1000}


def uid():
    return uuid.uuid4().hex


def now():
    return datetime.now(timezone.utc).isoformat()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def identifier(value):
    require(isinstance(value, str) and re.fullmatch('[a-f0-9]{32}', value), 'Ogiltig lokal identitet.')
    return value


def script():
    return {'schema_version': 'ce3-script/1', 'source': 'Lokal användarplan', 'steps': {}}


def plan(name, value=None, outcomes=None):
    return {'id': uid(), 'name': name, 'script': value or script(), 'outcomes': outcomes or {}}


def run_input(project, entry):
    return {'schema_version': 'ce3-run/1', 'profile': PROFILE, 'model': project['model'],
            'script': entry['script'], 'outcomes': entry['outcomes'], 'sources': project['sources']}


def validate_project(value):
    require(isinstance(value, dict), 'Projektet måste vara ett objekt.')
    require(isinstance(value.get('name'), str) and value['name'].strip(), 'Ange ett projektnamn.')
    require(isinstance(value.get('display'), dict), 'Visningsetiketter saknas.')
    require(all(isinstance(k, str) and isinstance(v, str) for k, v in value['display'].items()), 'Etiketter måste vara text.')
    require(isinstance(value.get('plans'), list) and value['plans'], 'Projektet behöver minst en plan.')
    validate_presentation(value)
    ids = []
    for entry in value['plans']:
        ids.append(identifier(entry['id']))
        require(isinstance(entry.get('name'), str) and entry['name'].strip(), 'Ange ett plannamn.')
        run = deepcopy(run_input(value, entry))
        # Validate unfinished drafts without inventing an actual run choice. These
        # placeholders never leave this function or enter persistence/replay.
        outcomes = run['outcomes']
        require(isinstance(outcomes, dict), 'Externa val måste vara ett objekt.')
        for event, rule in run['model'].get('events', {}).items():
            if rule.get('kind') == 'external' and event not in outcomes:
                absent = rule.get('absent')
                if isinstance(absent, dict):
                    outcomes[event] = absent.get('outcome')
        validate(run)
    require(len(ids) == len(set(ids)), 'Planernas identiteter måste vara unika.')
    return value


def open_model(value):
    if value.get('schema_version') == 'ce3-run/1':
        validate(value)
        project = dict(name='Importerat projekt', model=value['model'], sources=value['sources'], display={},
                       plans=[plan('Importerad plan', value['script'], value['outcomes'])])
    else:
        project = dict(name='Importerat projekt', model=value, sources={}, display={}, plans=[plan('Plan 1')])
    return decorate(validate_project(project), known=False)


def example(name):
    require(name in ('factory', 'transport', 'same_parking'), 'Okänt exempel.')
    factory = HERE.parent / 'structural-ce-v1-factory-witness'
    transport = HERE.parent / 'structural-ce-v1-transport-t1'
    folder = factory if name == 'factory' else transport
    model = read_bundle(folder / 'model.json')
    metadata = CORE / 'cases' / ('factory' if name == 'factory' else 'transport') / 'metadata.json'
    scripts_file = folder / 'candidate.json' if name == 'factory' else (folder / ('same-parking-week14/scripts.json' if name == 'same_parking' else 'scripts.json'))
    files = [folder / 'model.json', scripts_file, metadata]
    sources = {str(p.relative_to(HERE.parents[1])): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    raw = read_bundle(scripts_file)
    if name == 'factory':
        runs = [('Utgångsplan', factory_adapt(model, raw, read_bundle(metadata), sources))]
    else:
        absent = {k: v['outcome'] for k, v in read_bundle(metadata)['external_roles'].items()}
        runs = [(f'Plan {key}', transport_adapt(model, raw[key], absent, read_bundle(metadata), sources)) for key in ('A', 'B')]
    return decorate(dict(name={'factory': 'Fabriken', 'transport': 'Transporten', 'same_parking': 'Transport · samma parkering'}[name],
                model=runs[0][1]['model'], sources=sources,
                display={key: rule['label'] for key, rule in model['decisions'].items() if rule.get('label')},
                plans=[plan(label, run['script']) for label, run in runs]), known=True)


def inspect_history(history):
    """Pure observations of saved rows; no availability or domain goal inference."""
    paths = history['paths']
    model = history['input']['model']
    field = model['budget']['field'] if model['budget'] else None
    summaries, observations = [], {}
    for index, path in enumerate(paths):
        rows = path['history']
        spent = sum(r['before']['state'][field] - r['after']['state'][field] for r in rows
                    if field and r['kind'] == 'decision_executed')
        deltas = [r['after']['state'][field] - r['before']['state'][field] for r in rows
                  if field and r['kind'] == 'event_applied']
        summaries.append(dict(index=index, executed=sum(r['kind'] == 'decision_executed' for r in rows),
                              blocked=sum(r['kind'] == 'attempt_blocked' for r in rows),
                              skipped=sum(r['kind'] == 'script_skip' for r in rows), spent=spent if field else None,
                              inflow=sum(max(0, x) for x in deltas) if field else None,
                              event_outflow=-sum(min(0, x) for x in deltas) if field else None,
                              remaining=path['snapshot']['state'][field] if field else None,
                              final=path['snapshot'], orders=path['event_orders']))
        for row in rows:
            if row['kind'] not in ('step_end', 'event_applied', 'event_inapplicable', 'decision_executed', 'attempt_blocked', 'script_skip'):
                continue
            # The same event can be applied in one order and inapplicable in another.
            category = 'event' if row['kind'].startswith('event_') else ('attempt' if row['script_position'] is not None else 'step_end')
            key = (row['step'], category, row['action'], row['script_position'])
            observation = dict(state=row['after']['state'], taken=sorted(row['after']['taken']),
                               pending=sorted(row['after']['pending'], key=lambda item: item['id']),
                               kind=row['kind'], outcome=row['outcome'], failures=row['failures'])
            observations.setdefault(key, {})[digest(observation)] = observation
    variations = []
    for key, variants in observations.items():
        if len(variants) > 1:
            values = list(variants.values())
            fields = {f: list({digest(v['state'][f]): v['state'][f] for v in values}.values()) for f in model['initial']}
            variations.append(dict(step=key[0], category=key[1], action=key[2], position=key[3],
                                   variants=len(values), fields={f: vs for f, vs in fields.items() if len(vs) > 1},
                                   kinds=sorted(set(v['kind'] for v in values)),
                                   outcomes=list({digest(v['outcome']): v['outcome'] for v in values}.values())))
    rank = {name: n for n, name in enumerate(model['reference_event_order'])}
    reference = next((i for i, path in enumerate(paths) if all(
        o['order'] == sorted(o['order'], key=lambda event: rank[event]) for o in path['event_orders'])), None)
    return dict(paths=summaries, reference=reference, variations=variations,
                order_sensitive=bool(variations), complete=history['status'] == 'COMPLETE')


class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.active = set()

    def folder(self, project_id):
        return self.root / identifier(project_id)

    def versions(self, project_id):
        return sorted((self.folder(project_id) / 'versions').glob('*.json'))

    def get(self, project_id, revision=None):
        files = self.versions(project_id)
        require(bool(files), 'Projektet finns inte.')
        if revision is not None:
            require(type(revision) is int and revision > 0, 'Ogiltig version.')
            path = self.folder(project_id) / 'versions' / f'{revision:06d}.json'
        else:
            path = files[-1]
        require(path.is_file(), 'Versionen finns inte.')
        return decorate(read_bundle(path))

    def list(self):
        projects = []
        for folder in self.root.iterdir():
            if re.fullmatch('[a-f0-9]{32}', folder.name) and (folder / 'versions').is_dir():
                p = self.get(folder.name)
                projects.append({k: p[k] for k in ('id', 'name', 'revision', 'saved_at')})
        return sorted(projects, key=lambda p: p['saved_at'], reverse=True)

    def save(self, value):
        with self.lock:
            value = decorate(validate_project(value))
            project_id = value.get('id') or uid()
            files = self.versions(project_id)
            if files:
                require(value.get('revision') == self.get(project_id)['revision'],
                        'Projektet har ändrats i en annan vy. Öppna senaste versionen innan du sparar.')
            value.update(id=project_id, revision=len(files) + 1, saved_at=now())
            write_bundle(value, self.folder(project_id) / 'versions' / f'{value["revision"]:06d}.json')
            return value

    def audit(self, folder):
        # Read the history anew in a separate process with the independently saved input.
        with tempfile.TemporaryDirectory(prefix='ce3-audit-') as temporary:
            target = Path(temporary) / 'audit.json'
            try:
                process = subprocess.run([sys.executable, '-B', str(CORE / 'cli.py'), 'audit',
                    '--history', str(folder / 'history.json.gz'), '--trusted-input', str(folder / 'input.json'),
                    '--output', str(target)], capture_output=True, text=True, timeout=120)
                if target.exists():
                    return read_bundle(target)
                return dict(status='FAIL', message=process.stderr[-2000:] or 'Granskaren gav inget besked.')
            except subprocess.TimeoutExpired:
                return dict(status='FAIL', message='Granskningen nådde tidsgränsen 120 sekunder.')

    def runs(self, project_id):
        records = []
        for folder in (self.folder(project_id) / 'runs').glob('*'):
            if (folder / 'record.json').exists():
                records.append(read_bundle(folder / 'record.json'))
            elif (folder / 'started.json').exists():
                record = read_bundle(folder / 'started.json')
                if record['id'] not in self.active:
                    record.update(run_status='ERROR', audit_status='FAIL',
                                  message='Körningen saknar slutbesked; den kan ha avbrutits. Kör om planen.')
                records.append(record)
        for record in records:
            value = read_bundle(self.folder(project_id) / 'runs' / record['id'] / 'input.json')
            record['input_summary'] = dict(model_identity=digest(value['model']), script=value['script'],
                                           outcomes=value['outcomes'], sources=value['sources'])
        return sorted(records, key=lambda r: r['created_at'])

    def run(self, project_id, revision, plan_id, limits=None):
        with self.lock:
            p = self.get(project_id, revision)
            entry = next((e for e in p['plans'] if e['id'] == plan_id), None)
            require(entry is not None, 'Planen finns inte i denna version.')
            value = validate(run_input(p, entry))
            limits = limits or LIMITS.copy()
            require(set(limits) == set(LIMITS) and all(type(n) is int and 0 < n <= LIMITS[k] for k, n in limits.items()),
                    'Resursgränser måste vara positiva heltal inom den lokala serverns maxvärden.')
            run_id = uid()
            folder = self.folder(project_id) / 'runs' / run_id
            folder.mkdir(parents=True)
            write_bundle(value, folder / 'input.json')
            record = dict(id=run_id, project_id=project_id, revision=revision, plan_id=plan_id,
                          plan_name=entry['name'], input_sha256=digest(value), created_at=now(),
                          run_status='RUNNING', audit_status='PENDING', limits=limits)
            # Initial record survives a server/process interruption.
            self.active.add(run_id)
            write_bundle(record, folder / 'started.json')
            args = [sys.executable, '-B', str(CORE / 'cli.py'), 'replay', '--input', str(folder / 'input.json'),
                    '--output', str(folder / 'history.json.gz')]
            for key, number in limits.items():
                args += ['--' + key.replace('_', '-'), str(number)]
            try:
                subprocess.run(args, capture_output=True, text=True, timeout=120)
                history = read_bundle(folder / 'history.json.gz')
                record['run_status'] = history.get('status', 'ERROR')
                audit = self.audit(folder)
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError) as error:
                record['run_status'] = 'ERROR'
                audit = dict(status='FAIL', message=str(error))
            record['audit_status'] = audit['status']
            write_bundle(audit, folder / 'audit.json')
            write_bundle(record, folder / 'record.json')
            self.active.discard(run_id)
            return next(r for r in self.runs(project_id) if r['id'] == run_id)

    def result(self, project_id, run_id):
        folder = self.folder(project_id) / 'runs' / identifier(run_id)
        record = next((r for r in self.runs(project_id) if r['id'] == run_id), None)
        require(record is not None, 'Körningen finns inte.')
        trusted = read_bundle(folder / 'input.json')
        audit = (dict(status='PENDING', message='Körningen pågår.')
                 if record['run_status'] == 'RUNNING' else self.audit(folder))
        if digest(trusted) != record['input_sha256']:
            audit = dict(status='FAIL', message='Den sparade inmatningen skiljer sig från körningens identitet.')
        history = read_bundle(folder / 'history.json.gz') if (folder / 'history.json.gz').exists() else None
        result = dict(record=record, audit=audit, input=trusted, model_identity=digest(trusted['model']), status=record['run_status'], error=None,
                      paths=[], reference=None, variations=[], order_sensitive=False, complete=False)
        if history:
            result['status'], result['error'] = history.get('status', 'ERROR'), history.get('error')
            # Failed histories remain downloadable for diagnosis, never rendered as reviewed observations.
            if audit['status'] == 'PASS':
                result.update(inspect_history(history))
        return result

    def path(self, project_id, run_id, index):
        result = self.result(project_id, run_id)
        require(result['audit']['status'] == 'PASS', 'Historiken är inte godkänd. Resultat visas inte som granskade.')
        folder = self.folder(project_id) / 'runs' / identifier(run_id)
        history = read_bundle(folder / 'history.json.gz')
        require(type(index) is int and 0 <= index < len(history['paths']), 'Banan finns inte.')
        return history['paths'][index]

    def compare(self, project_id, left, right, allow_different_outcomes=False):
        require(left != right, 'Välj två olika körningar.')
        a, b = self.result(project_id, left), self.result(project_id, right)
        require(a['audit']['status'] == b['audit']['status'] == 'PASS', 'Båda körningarna måste vara fullständigt granskade.')
        for field in (('model', 'sources') if allow_different_outcomes else ('model', 'outcomes', 'sources')):
            require(digest(a['input'][field]) == digest(b['input'][field]),
                    'Jämförelsen kräver samma modell, startläge, källidentitet och alla externa utfallsval.')
        return dict(left=a, right=b)

    def export(self, project_id):
        folder = self.folder(project_id)
        runs = []
        for record in self.runs(project_id):
            sub = folder / 'runs' / record['id']
            runs.append(dict(record=record, input=read_bundle(sub / 'input.json'),
                             history=read_bundle(sub / 'history.json.gz') if (sub / 'history.json.gz').exists() else None))
        return dict(format='ce3-project/1', versions=[read_bundle(p) for p in self.versions(project_id)], runs=runs)

    def export_file(self, project_id):
        with self.lock:
            value = self.export(project_id)
            path = self.root / 'exports' / ('ce3-project-' + uid() + '.json')
            write_bundle(value, path)
            return dict(path=str(path), bytes=path.stat().st_size)

    def import_project(self, value):
        require(value.get('format') == 'ce3-project/1', 'Okänt projektformat.')
        require(isinstance(value.get('versions'), list) and value['versions'], 'Versionshistoriken saknas.')
        require(isinstance(value.get('runs'), list), 'Körhistoriken saknas.')
        # Stage the entire import; failed validation cannot publish a partial project.
        with self.lock, tempfile.TemporaryDirectory(dir=self.root, prefix='import-') as temporary:
            staged = Store(Path(temporary) / 'store')
            new_id = uid()
            versions = {}
            for n, old in enumerate(value['versions'], 1):
                require(old.get('revision') == n, 'Versionsordningen är ogiltig.')
                candidate = deepcopy(old)
                candidate.update(id=new_id, revision=n - 1)
                saved = staged.save(candidate)
                saved['saved_at'] = old['saved_at']
                saved['imported_at'] = now()
                write_bundle(saved, staged.folder(new_id) / 'versions' / f'{n:06d}.json')
                versions[n] = saved
            for item in value['runs']:
                record = deepcopy(item['record'])
                identifier(record['id'])
                require(record['revision'] in versions, 'Körningen saknar motsvarande projektversion.')
                p = versions[record['revision']]
                entry = next((e for e in p['plans'] if e['id'] == record['plan_id']), None)
                require(entry is not None and digest(run_input(p, entry)) == digest(item['input']) == record['input_sha256'],
                        'Körningens indata stämmer inte med projektversionen.')
                folder = staged.folder(new_id) / 'runs' / record['id']
                require(not folder.exists(), 'Dubblerad köridentitet.')
                record['project_id'] = new_id
                write_bundle(item['input'], folder / 'input.json')
                if item['history'] is not None:
                    write_bundle(item['history'], folder / 'history.json.gz')
                audit = staged.audit(folder)
                record['audit_status'] = audit['status']
                record['run_status'] = item['history'].get('status', 'ERROR') if item['history'] else 'ERROR'
                write_bundle(audit, folder / 'audit.json')
                write_bundle(record, folder / 'record.json')
            staged.folder(new_id).rename(self.folder(new_id))
            return self.get(new_id)
