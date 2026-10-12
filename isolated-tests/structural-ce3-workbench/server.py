#!/usr/bin/env python3
"""Loopback-only CE3 workbench, Python standard library, no package installation."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
import sys
from urllib.parse import urlparse, parse_qs

from service import Store, HERE, CORE, example, open_model, LIMITS
from core.history import loads, encode, read_bundle
from core.schema import InputError, PROFILE
from onboarding import Onboarding


class Handler(BaseHTTPRequestHandler):
    def send(self, value, status=200, content_type='application/json; charset=utf-8'):
        raw = encode(value) if content_type.startswith('application/json') else value
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(raw)

    def dispatch(self, method):
        try:
            expected = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
            if self.headers.get('Host') not in expected:
                self.send({'message': 'Servern är endast tillgänglig lokalt.'}, 403)
                return
            origin = self.headers.get('Origin')
            if origin and origin not in {'http://' + host for host in expected}:
                self.send({'message': 'Anrop från en annan webbplats tillåts inte.'}, 403)
                return
            parsed = urlparse(self.path)
            query = {key: values[0] for key, values in parse_qs(parsed.query).items()}
            route = parsed.path
            data = None
            if method == 'POST':
                size = int(self.headers.get('Content-Length', '0'))
                if route == '/api/onboarding' and size > 20000:
                    raise ValueError('Demonstrationen tar bara kort text, inga filer.')
                if not 0 < size <= 128 * 1024 * 1024:
                    raise ValueError('Tom eller för stor fil (max 128 MB).')
                if not self.headers.get('Content-Type', '').startswith('application/json'):
                    raise ValueError('Använd JSON-format.')
                data = loads(self.rfile.read(size).decode('utf-8'))
            store = self.server.store
            if method == 'POST' and route == '/api/onboarding':
                return self.send(self.server.onboarding.dispatch(data))
            onboarding_files = {'/onboarding': 'index.html', '/onboarding/': 'index.html', '/onboarding/app.js': 'app.js', '/onboarding/style.css': 'style.css'}
            if method == 'GET' and route in onboarding_files:
                path = HERE / 'onboarding-prototype/static' / onboarding_files[route]
                return self.send(path.read_bytes(), content_type=mimetypes.guess_type(str(path))[0] + '; charset=utf-8')
            if method == 'GET' and route == '/api/config':
                return self.send(dict(storage=str(store.root), limits=LIMITS, profile=read_bundle(CORE / 'core/profile.json')))
            if method == 'GET' and route == '/api/projects':
                return self.send(store.list())
            if method == 'GET' and route == '/api/project':
                p = store.get(query['id'], int(query['revision']) if 'revision' in query else None)
                return self.send(dict(project=p, versions=[dict(revision=v['revision'], saved_at=v['saved_at'], name=v['name']) for v in [read_bundle(f) for f in store.versions(query['id'])]], runs=store.runs(query['id'])))
            if method == 'GET' and route == '/api/example':
                return self.send(example(query['name']))
            if method == 'GET' and route == '/api/result':
                return self.send(store.result(query['project'], query['run']))
            if method == 'GET' and route == '/api/path':
                return self.send(store.path(query['project'], query['run'], int(query['index'])))
            if method == 'GET' and route == '/api/comparison-paths':
                return self.send(store.comparison_paths(query['project'], query['run']))
            if method == 'GET' and route == '/api/compare':
                return self.send(store.compare(query['project'], query['left'], query['right'], query.get('allow_different_outcomes') == 'true'))
            if method == 'GET' and route == '/api/export':
                return self.send(store.export(query['id']))
            if method == 'POST' and route == '/api/export':
                return self.send(store.export_file(data['project']))
            if method == 'POST' and route == '/api/open':
                return self.send(open_model(loads(data['text'])))
            if method == 'POST' and route == '/api/save':
                return self.send(store.save(data))
            if method == 'POST' and route == '/api/run':
                return self.send(store.run(data['project'], data['revision'], data['plan'], data.get('limits')))
            if method == 'POST' and route == '/api/import':
                return self.send(store.import_project(loads(data['text'])))
            files = {'/': 'index.html', '/app.js': 'app.js', '/presentation.js': 'presentation.js', '/comparison.js': 'comparison.js', '/style.css': 'style.css'}
            if method == 'GET' and route in files:
                path = HERE / 'static' / files[route]
                return self.send(path.read_bytes(), content_type=mimetypes.guess_type(str(path))[0] + '; charset=utf-8')
            self.send({'message': 'Sidan finns inte.'}, 404)
        except InputError as error:
            self.send(dict(message='Modellen eller planen kan inte köras. Kontrollera fältet nedan och de deklarerade alternativen.',
                           path=error.path, detail=error.message, profile=PROFILE, type=type(error).__name__), 422)
        except (ValueError, KeyError, TypeError, AttributeError, FileNotFoundError) as error:
            self.send(dict(message=str(error), profile=PROFILE), 422)
        except Exception as error:
            print(f'Local server error: {error}', file=sys.stderr)
            self.send(dict(message='Ett lokalt serverfel inträffade. Kontrollera terminalen; tidigare versioner är bevarade.'), 500)

    def do_GET(self):
        self.dispatch('GET')

    def do_POST(self):
        self.dispatch('POST')


def make_server(port, data):
    data = Path(data).resolve()
    repo = HERE.parents[1]
    if (data == repo or repo in data.parents) and HERE not in data.parents:
        raise ValueError('Lagring inne i repositoryt måste ligga under den nya arbetsbänksmappen.')
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.store = Store(data)
    server.onboarding = Onboarding(data)
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8876, help='Use 0 for any free port.')
    parser.add_argument('--data', type=Path, default=HERE / 'local-data')
    args = parser.parse_args()
    server = make_server(args.port, args.data)
    print(f'CE3 lokal vy: http://127.0.0.1:{server.server_port}\nLagring: {server.store.root}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
