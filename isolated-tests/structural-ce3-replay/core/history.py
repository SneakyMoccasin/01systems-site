"""Strict JSON and deterministic artifacts; contains no transition semantics."""
import gzip
import hashlib
import json
from pathlib import Path


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key: " + key)
        result[key] = value
    return result


def loads(text):
    def invalid(value):
        raise ValueError("Non-finite JSON number: " + value)
    return json.loads(text, object_pairs_hook=_pairs, parse_constant=invalid)


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True,
                       separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def digest(value):
    return hashlib.sha256(encode(value)).hexdigest()


def read_bundle(path):
    path = Path(path)
    raw = path.read_bytes()
    if path.suffix == ".gz":
        raw = gzip.decompress(raw)
    return loads(raw.decode("utf-8"))


def write_bundle(value, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = encode(value)
    if path.suffix == ".gz":
        raw = gzip.compress(raw, mtime=0)
    # A completed document is published with one atomic rename.
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(raw)
    temporary.replace(path)
    return {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
