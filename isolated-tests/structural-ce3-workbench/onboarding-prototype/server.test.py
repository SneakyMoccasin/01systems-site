"""Local HTTP smoke checks only; no engine runs or external services."""
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import make_server


class OfflineRoutes(unittest.TestCase):
    def test_local_routes_and_session_roundtrip(self):
        with tempfile.TemporaryDirectory() as directory:
            server = make_server(0, directory)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            def request(method, route, data=None, origin=None):
                conn = http.client.HTTPConnection('127.0.0.1', server.server_port)
                headers = {'Content-Type': 'application/json'}
                if origin:
                    headers['Origin'] = origin
                conn.request(method, route, json.dumps(data) if data else None, headers)
                response = conn.getresponse()
                result = (response.status, response.read())
                conn.close()
                return result
            try:
                for route in ['/', '/onboarding', '/onboarding/app.js', '/onboarding/style.css', '/api/config']:
                    self.assertEqual(request('GET', route)[0], 200)
                self.assertEqual(request('POST', '/api/onboarding', {'action': 'list'}, 'https://unrelated.invalid')[0], 403)
                _, raw = request('POST', '/api/onboarding', {'action': 'list'})
                self.assertEqual(len(json.loads(raw)['cases']), 3)
                _, raw = request('POST', '/api/onboarding', {'action': 'create', 'case_id': 'clear', 'question': 'Egen fråga', 'situation': 'Egen text'})
                saved = json.loads(raw)
                self.assertFalse(saved['can_propose'])
                _, raw = request('POST', '/api/onboarding', {'action': 'open', 'id': saved['id'], 'snapshot': saved['snapshot']})
                self.assertEqual(json.loads(raw)['technical'], saved['technical'])
                self.assertEqual(request('POST', '/api/onboarding', {'action': 'open', 'id': '../../other'})[0], 422)
            finally:
                server.shutdown()
                server.server_close()
                thread.join()


if __name__ == '__main__':
    unittest.main()
