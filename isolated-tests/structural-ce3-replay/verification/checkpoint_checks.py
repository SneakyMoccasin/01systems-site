#!/usr/bin/env python3
"""Checkpoint 1 only: two frozen case sets, two complete runs, no legacy writes."""
import argparse
import hashlib
import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from adapters.factory_v1 import adapt as factory_adapt
from adapters.transport_t1 import adapt as transport_adapt
from core.history import digest, read_bundle, write_bundle
from verification.semantic_compare import compare, Divergence
from cli import output_allowed

REPO = ROOT.parents[1]
FACTORY = ROOT.parent / "structural-ce-v1-factory-witness"
TRANSPORT = ROOT.parent / "structural-ce-v1-transport-t1"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def preservation():
    baseline = read_bundle(ROOT / "preservation-before.json")
    changed = [p for p, h in baseline["files"].items()
               if not (REPO / p).is_file() or sha(REPO / p) != h]
    require(not changed, "Protected originals changed: " + repr(changed))
    return {"status": "PASS", "baseline_head": baseline["head"],
            "files_checked": len(baseline["files"]), "changed": changed,
            "baseline_manifest_sha256": sha(ROOT / "preservation-before.json")}


def legacy_auditor(folder, label):
    spec = importlib.util.spec_from_file_location(label, folder / "audit_history.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def input_sources(files):
    return {str(p.relative_to(REPO)): sha(p) for p in files}


def prepare():
    contract = FACTORY / "sources/structural-ce-v1-frozen.txt"
    metadata_f = ROOT / "cases/factory/metadata.json"
    metadata_t = ROOT / "cases/transport/metadata.json"
    fm, fs = read_bundle(FACTORY / "model.json"), read_bundle(FACTORY / "candidate.json")
    tm, ts = read_bundle(TRANSPORT / "model.json"), read_bundle(TRANSPORT / "scripts.json")["A"]
    factory = factory_adapt(fm, fs, read_bundle(metadata_f), input_sources([
        FACTORY / "model.json", FACTORY / "candidate.json", FACTORY / "sources/factory-assumed.txt", metadata_f, contract]))
    transport = transport_adapt(tm, ts, {"E_T2": "ready"}, read_bundle(metadata_t), input_sources([
        TRANSPORT / "model.json", TRANSPORT / "scripts.json", TRANSPORT / "sources/transport-t1-user.txt",
        TRANSPORT / "run-spec.txt", metadata_t, contract]))
    fpath = FACTORY / "results/histories/candidate.json"
    tpath = TRANSPORT / "results/run-1/histories/A_ready.json.gz"
    old_f, old_t = read_bundle(fpath), read_bundle(tpath)
    require(digest(old_f["script"]) == digest(fs), "Factory saved script mismatch")
    require(digest(old_t["model"]) == digest(tm) and digest(old_t["script"]) == digest(ts)
            and old_t["external"] == {"E_T2": "ready"}, "Transport saved input mismatch")
    # Audit original artifacts read-only as well, never run an old output command.
    fa = legacy_auditor(FACTORY, "legacy_factory_audit")
    ta = legacy_auditor(TRANSPORT, "legacy_transport_audit")
    for p in old_f["paths"]:
        fa.audit_transitions(p["history"], fm, fs)
        require(p["snapshot"] == p["history"][-1]["after"], "Legacy factory terminal mismatch")
    for p in old_t["paths"]:
        ta.audit(p["history"], p["snapshot"], tm, ts, old_t["external"])
    return {"factory_candidate": (factory, old_f, fpath), "transport_A_ready": (transport, old_t, tpath)}


def observations(name, bundle):
    values = []
    for path in bundle["paths"]:
        history = path["history"]
        executed = {r["action"]: r["step"] for r in history if r["kind"] == "decision_executed"}
        if name == "factory_candidate":
            continuous = all(s["state"]["se_premises"] is True and s["state"]["se_team"] is True
                             and s["state"]["original_machine"] == "sweden_in_use"
                             for r in history for s in (r["before"], r["after"]))
            value = {"d8_week": executed.get("D8"), "continuous_sweden": continuous,
                     "final_budget": path["snapshot"]["state"]["budget"]}
            saved = read_bundle(FACTORY / "results/summary.json")["scenarios"][0]
            require(value == {"d8_week": saved["d8_weeks"][0], "continuous_sweden": saved["continuous_sweden"],
                              "final_budget": saved["final_budget"]}, "Factory observation mismatch")
        else:
            removal = next(r["step"] for r in history if r["kind"] == "event_applied" and r["action"] == "E_T12")
            value = {"parking_week": removal, "t7_execution_week": executed.get("T7"),
                     "cycle_open_week": executed.get("T11"), "traffic_gap": executed["T7"] - removal,
                     "cycle_gap": executed["T11"] - removal, "final_budget": path["snapshot"]["state"]["budget"]}
            expected = read_bundle(TRANSPORT / "expected.json")["scenarios"]["A_ready"]
            require(all(value[k] == (expected[k]["weeks"] if k in ("traffic_gap", "cycle_gap") else expected[k])
                        for k in value), "Transport observation mismatch")
        values.append(value)
    require(all(v == values[0] for v in values), "Order-sensitive case observation")
    return values[0]


def run_one(output, cases):
    output.mkdir(parents=True, exist_ok=True)
    summary = {}
    for name, (run, legacy, reference) in cases.items():
        input_file = output / (name + ".input.json")
        history_file = output / (name + ".history.json.gz")
        audit_file = output / (name + ".audit.json")
        write_bundle(run, input_file)
        subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), "replay", "--input", str(input_file),
                        "--output", str(history_file)], check=True)
        # Separate process: only codec/schema and independent verifier loaded.
        subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), "audit", "--history", str(history_file),
                        "--trusted-input", str(input_file), "--output", str(audit_file)], check=True)
        stored = read_bundle(history_file)
        comparison = compare(legacy, stored)
        expected_paths = 2 if name == "factory_candidate" else 4
        require(len(stored["paths"]) == expected_paths, "Wrong checkpoint path count")
        summary[name] = {"audit": read_bundle(audit_file), "semantic_comparison": comparison,
                         "observations": observations(name, stored),
                         "legacy_artifact": str(reference.relative_to(REPO)), "legacy_sha256": sha(reference)}
    write_bundle({"status": "PASS", "cases": summary}, output / "summary.json")
    return summary


def main(output):
    output = output_allowed(output)
    # Fail rather than accidentally mixing an old directory with a fresh proof.
    require(not output.exists(), "Output directory must be new: " + str(output))
    output.mkdir(parents=True)
    try:
        preserved = preservation()
        cases = prepare()
        first = run_one(output / "run-1", cases)
        run_one(output / "run-2", cases)
        manifests = [{p.name: sha(p) for p in sorted((output / run).iterdir()) if p.is_file()}
                     for run in ("run-1", "run-2")]
        require(manifests[0] == manifests[1], "Two runs differ byte for byte")
        require(preservation() == preserved, "Preservation proof changed")
        result = {"status": "PASS", "checkpoint": 1, "complete_runs": 2,
                  "case_sets": 2, "paths_per_run": 6, "byte_identical": True,
                  "files_compared": len(manifests[0]), "run_1_sha256": manifests[0],
                  "run_2_sha256": manifests[1], "preservation": preserved,
                  "cases": first, "deviations": []}
        write_bundle(result, output / "checkpoint.json")
        print("CHECKPOINT 1 PASS: 2 case sets, 6 paths/run, two byte-identical runs")
    except Exception as error:
        write_bundle({"status": "FAIL", "type": type(error).__name__,
                      "detail": error.detail if isinstance(error, Divergence) else str(error)}, output / "checkpoint.json")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    main(parser.parse_args().output)
