#!/usr/bin/env python3
"""Two complete runs, byte-for-byte comparison and factory integrity checks."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def manifest(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob("*")) if p.is_file()}


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    (output / "report.txt").write_text("Två körningar pågår. Inget slutresultat.\n", encoding="utf-8")
    factory = ROOT.parent / "structural-ce-v1-factory-witness"
    before = manifest(factory)
    runs = [output / "run-1", output / "run-2"]
    for run in runs:
        subprocess.run([sys.executable, "-B", str(ROOT / "run.py"), "--output", str(run)], check=True)
    manifests = [manifest(run) for run in runs]
    if manifests[0] != manifests[1]:
        raise ValueError("Reproduction differs: " + repr([key for key in set(manifests[0]) | set(manifests[1])
                                                         if manifests[0].get(key) != manifests[1].get(key)]))
    if manifest(factory) != before:
        raise ValueError("Factory files changed")
    result = {"status": "PASS", "complete_runs": 2, "byte_identical": True,
              "files_compared": len(manifests[0]), "run_1_sha256": manifests[0], "run_2_sha256": manifests[1],
              "factory_files_checked": len(before), "factory_sha256_before_and_after": before,
              "python": sys.version, "deviations": []}
    (output / "reproducibility.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    text = runs[0].joinpath("report.txt").read_text(encoding="utf-8")
    text += (f"\nREPRODUCERBARHET: PASS. Två kompletta körningar; {len(manifests[0])} filer per körning "
             "är byteidentiska enligt SHA-256, inklusive alla komprimerade historiker.\n"
             f"Fabrikscheckpointens {len(before)} filer har oförändrade kontrollsummor.\n"
             "reproducibility.json innehåller båda filmanifesten och skyddskontrollen.\n")
    (output / "report.txt").write_text(text, encoding="utf-8")
    print(json.dumps({"reproducibility": "PASS", "files_compared": len(manifests[0]),
                      "factory_files_unchanged": len(before)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "results")
    destination = parser.parse_args().output.resolve()
    try:
        main(destination)
    except Exception as error:
        destination.mkdir(parents=True, exist_ok=True)
        (destination / "report.txt").write_text("FAIL: " + str(error) + "\n", encoding="utf-8")
        (destination / "reproducibility.json").write_text(json.dumps({"status": "FAIL", "error": str(error)}) + "\n")
        raise
