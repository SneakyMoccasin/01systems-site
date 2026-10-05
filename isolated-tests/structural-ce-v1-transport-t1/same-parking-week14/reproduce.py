#!/usr/bin/env python3
"""Repeat the separate comparison; protect all original non-demo files."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def manifest(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob("*")) if p.is_file()}


def protected():
    parent = ROOT.parent
    files = [p for p in parent.rglob("*") if p.is_file() and p.relative_to(parent).parts[0] not in (ROOT.name, "demo")]
    files += [p for p in (parent.parent / "structural-ce-v1-factory-witness").rglob("*") if p.is_file()]
    return {str(p.relative_to(parent.parent)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    before = protected()
    for folder in ("run-1", "run-2"):
        subprocess.run([sys.executable, "-B", str(ROOT / "check.py"), "--output", str(out / folder)], check=True)
    first, second = manifest(out / "run-1"), manifest(out / "run-2")
    if first != second:
        raise ValueError("Repeat outputs differ")
    if protected() != before:
        raise ValueError("Protected original changed")
    proof = {"status": "PASS", "complete_runs": 2, "byte_identical": True, "files_compared": len(first),
             "run_1_sha256": first, "run_2_sha256": second, "protected_sha256": before, "deviations": []}
    (out / "reproducibility.json").write_text(json.dumps(proof, indent=2) + "\n")
    report = (out / "run-1/report.txt").read_text()
    (out / "report.txt").write_text(report + f"\nTvå kompletta körningar: {len(first)} byteidentiska resultatfiler vardera. {len(before)} originalfiler oförändrade.\n")
    print({"reproducibility": "PASS", "identical_files": len(first), "protected_files": len(before)})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "results")
    out = parser.parse_args().output.resolve()
    try:
        main(out)
    except Exception as error:
        out.mkdir(parents=True, exist_ok=True)
        (out / "reproducibility.json").write_text(json.dumps({"status": "FAIL", "error": str(error)}) + "\n")
        (out / "report.txt").write_text("FAIL: " + str(error) + "\n")
        raise
