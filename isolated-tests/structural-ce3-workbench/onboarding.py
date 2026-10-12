"""Thin offline bridge to the existing Node session/2 implementation."""
import json
import os
from pathlib import Path
import subprocess
import threading


class Onboarding:
    def __init__(self, root):
        self.root = Path(root) / 'onboarding'
        self.lock = threading.Lock()

    def dispatch(self, data):
        # One workbench process per data directory, as for existing projects.
        with self.lock:
            result = subprocess.run(
                ['node', str(Path(__file__).parent / 'onboarding-prototype/controller.cjs'), str(self.root)],
                input=json.dumps(data), text=True, capture_output=True, timeout=45,
                env={'PATH': os.environ.get('PATH', '')},
            )
            try:
                response = json.loads(result.stdout)
            except ValueError:
                raise ValueError('Offlineprototypen kunde inte öppnas. Kontrollera lokal Node och den pinnade SR-koden.')
            if result.returncode or 'error' in response:
                raise ValueError(response.get('error', 'OFFLINE_PROTOTYPE_ERROR'))
            return response
