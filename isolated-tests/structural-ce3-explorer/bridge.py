"""Use CE3's existing codec/schema; execution remains in its separate CLI."""
import hashlib
from pathlib import Path
import platform
import sys

ROOT = Path(__file__).resolve().parent
REPLAY = ROOT.parent / "structural-ce3-replay"
sys.path.insert(0, str(REPLAY))

from core.history import digest, encode, read_bundle, write_bundle
from core.schema import PROFILE, in_domain, obj, validate


def require(condition, message):
    if not condition:
        raise ValueError(message)


def equal(actual, expected, message):
    require(encode(actual) == encode(expected), message)


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def runtime_manifest():
    files = [REPLAY / "cli.py", REPLAY / "core/profile.json"]
    files += sorted((REPLAY / "core").glob("*.py"))
    files += sorted((REPLAY / "audit").glob("*.py"))
    return {"schema_version": "ce3-runtime-manifest/1", "profile": PROFILE,
            "schemas": ["ce3-run/1", "ce3-model/1", "ce3-script/1", "ce3-history/1"],
            "python": {"implementation": platform.python_implementation(),
                       "version": platform.python_version()},
            "files": {str(p.relative_to(REPLAY)): file_hash(p) for p in files}}


def explorer_build():
    return {"schema_version": "ce3-explorer-build/1",
            "files": {p.name: file_hash(p) for p in sorted(ROOT.glob("*.py"))}}
