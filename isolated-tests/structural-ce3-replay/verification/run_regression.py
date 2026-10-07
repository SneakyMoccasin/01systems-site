#!/usr/bin/env python3
"""Checkpoint 2: 634 main paths, all supplemental cases, two deterministic runs."""
import argparse
from copy import deepcopy
import io
from itertools import product
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.history import digest, encode, read_bundle, write_bundle
from verification.checkpoint_checks import REPO, FACTORY, TRANSPORT, require, sha, preservation, legacy_auditor
from verification.regression_catalog import catalog, SAME
from verification.permutation_coverage import coverage
from verification.regression_faults import fault_checks
from verification.semantic_compare import compare, Divergence, signature
from verification.run_checkpoint import Results
from cases.observations import check_case, legacy_view, TRANSPORT_OBSERVER, expected


CURRENT_CASE = None


def code_manifest():
    paths = [p for folder in ("core", "audit", "adapters", "cases", "verification")
             for p in (ROOT / folder).rglob("*") if p.suffix in (".py", ".json")]
    paths.append(ROOT / "cli.py")
    return {str(p.relative_to(ROOT)): sha(p) for p in sorted(paths)}


def protected():
    preservation()
    manifest = ROOT / "preservation-checkpoint-2-before.json"
    baseline = read_bundle(manifest)
    changed = [p for p, h in baseline["files"].items() if not (REPO / p).is_file() or sha(REPO / p) != h]
    require(not changed, "Protected files changed: " + repr(changed))
    return dict(status="PASS", baseline_head=baseline["head"], files_checked=len(baseline["files"]),
                manifest_sha256=sha(manifest), changed=changed)


def cli(command, *args, exit_code=0):
    result = subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), command, *map(str, args)],
                            capture_output=True, text=True)
    require(result.returncode == exit_code,
            f"CLI {command}: expected exit {exit_code}, got {result.returncode}: {result.stdout} {result.stderr}")


def originals(spec, old, auditors):
    for path in old["paths"]:
        if spec["family"] == "factory":
            auditors["factory"].audit_transitions(path["history"], spec["model"], spec["script"])
            require(path["snapshot"] == path["history"][-1]["after"], "Legacy factory terminal differs")
        else:
            auditors["transport"].audit(path["history"], path["snapshot"], spec["model"], spec["script"], old["external"])
    return dict(status="PASS", paths=len(old["paths"]), artifact=str(spec["reference"].relative_to(REPO)), sha256=sha(spec["reference"]))


def integrity_checks(folder, spec, bundle, cli_input):
    """Case-scale missing/duplicate coverage plus actual resource exhaustion."""
    results = []
    for name in ("missing_path", "duplicate_path"):
        bad = deepcopy(bundle)
        if name == "missing_path":
            bad["paths"].pop()
        else:
            bad["paths"].append(deepcopy(bad["paths"][0]))
        history, report = folder / (name + ".history.json.gz"), folder / (name + ".audit.json")
        write_bundle(bad, history)
        cli("audit", "--history", history, "--trusted-input", cli_input, "--output", report, exit_code=1)
        checked = read_bundle(report)
        require(checked["type"] == "AuditError", "Unexpected coverage audit failure")
        try:
            coverage(read_bundle(history), spec["groups"])
        except ValueError as error:
            coverage_error = str(error)
        else:
            raise ValueError("Independent coverage checker accepted " + name)
        results.append(dict(id=name, status="PASS", audit=checked, coverage_rejection=coverage_error))
    history, report = folder / "limited.history.json.gz", folder / "limited.audit.json"
    cli("replay", "--input", cli_input, "--output", history, "--max-paths", 1, exit_code=2)
    cli("audit", "--history", history, "--trusted-input", cli_input, "--output", report, exit_code=2)
    limited, checked = read_bundle(history), read_bundle(report)
    require(limited["status"] == checked["status"] == "INCOMPLETE" and checked["verified"] is False
            and not limited["paths"], "Resource limit certified partial success")
    try:
        coverage(limited, spec["groups"])
    except ValueError as error:
        coverage_error = str(error)
    else:
        raise ValueError("Coverage certified incomplete run")
    results.append(dict(id="resource_limit", status="PASS", expected_replay_status="INCOMPLETE",
                        audit=checked, coverage_rejection=coverage_error))
    return results


def cross_comparisons(folder, package, case_rows, model):
    base = TRANSPORT if package == "transport" else SAME
    targets = read_bundle(base / "expected.json")["comparisons"]
    frozen = read_bundle(base / "results/run-1/comparisons.json")
    results = {}
    for outcome, target in targets.items():
        pairs = []
        for a, b in product(case_rows["A_" + outcome], case_rows["B_" + outcome]):
            observed = TRANSPORT_OBSERVER.compare(a["rows"], b["rows"], model)
            expected(observed, target, package + "/" + outcome)
            require(observed["initial_equal"] and observed["final_decision_space_equal"] and
                    not observed["histories_equal"], "Comparison boundaries")
            frozen_observation = {k: v for k, v in frozen[outcome].items() if k != "pair_count"}
            require(encode(observed) == encode(frozen_observation), "Frozen A/B comparison differs: " + outcome)
            pairs.append(dict(a_order=a["order"], b_order=b["order"], observation=observed))
        require(len(pairs) == frozen[outcome]["pair_count"], "Comparison pair count")
        write_bundle(pairs, folder / package / (outcome + ".comparisons.json.gz"))
        results[outcome] = dict(status="PASS", pairs=len(pairs), observation=pairs[0]["observation"])
    return results


def run_one(output, specs):
    global CURRENT_CASE
    output.mkdir(parents=True)
    suite = unittest.defaultTestLoader.discover(str(ROOT / "verification"), pattern="test_*.py")
    checked = unittest.TextTestRunner(stream=io.StringIO(), verbosity=2, resultclass=Results).run(suite)
    tests = dict(status="PASS" if checked.wasSuccessful() else "FAIL", tests_run=checked.testsRun,
                 subchecks=checked.subchecks, passed=sorted(checked.passed),
                 failures=[dict(test=t.id(), traceback=trace) for t, trace in checked.failures + checked.errors])
    write_bundle(tests, output / "generic-checks.json")
    require(checked.wasSuccessful(), "Generic tests failed")
    auditors = {"factory": legacy_auditor(FACTORY, "frozen_factory_audit"),
                "transport": legacy_auditor(TRANSPORT, "frozen_transport_audit")}
    cases, faults, integrity = {}, {}, {}
    case_rows = {"transport": {}, "same_parking": {}}
    main_counts, probe_count, main_rows, all_rows, projected_rows = {}, 0, 0, 0, 0
    for spec in specs:
        package, name = spec["package"], spec["name"]
        key = package + "/" + name
        CURRENT_CASE = dict(id=key, input_sha256=digest(spec["run"]),
                            legacy_artifact=str(spec["reference"].relative_to(REPO)),
                            legacy_sha256=sha(spec["reference"]))
        folder = output / package
        input_file, history_file, audit_file = [folder / (name + ext) for ext in (".input.json", ".history.json.gz", ".audit.json")]
        old = read_bundle(spec["reference"])
        legacy_audit = originals(spec, old, auditors)
        write_bundle(spec["run"], input_file)
        cli("replay", "--input", input_file, "--output", history_file)
        cli("audit", "--history", history_file, "--trusted-input", input_file, "--output", audit_file)
        stored, audited = read_bundle(history_file), read_bundle(audit_file)
        require(audited["status"] == "PASS" and audited["verified"], "Unverified persisted replay")
        semantic = compare(old, stored)
        cover = coverage(stored, spec["groups"])
        observation, per_path = check_case(spec, stored, old)
        write_bundle(per_path, folder / (name + ".observations.json.gz"))
        entry = dict(status="PASS", main=spec["main"], audit=audited, legacy_audit=legacy_audit,
                     input_sha256=digest(spec["run"]), semantic_comparison=semantic, coverage=cover, observation=observation)
        write_bundle(entry, folder / (name + ".check.json"))
        cases[key] = entry
        count = len(stored["paths"])
        all_rows += audited["rows"]
        projected_rows += semantic["projected_rows"]
        if spec["main"]:
            main_counts[package] = main_counts.get(package, 0) + count
            main_rows += audited["rows"]
        else:
            probe_count += count
        if package in case_rows:
            case_rows[package][name] = [dict(order=signature(p, True), rows=legacy_view(p)) for p in stored["paths"]]
            if package == "same_parking" and spec["target"]["arm"] == "B":
                unchanged = compare(read_bundle(TRANSPORT / f"results/run-1/histories/{name}.json.gz"), stored)
                require(unchanged["status"] == "PASS", "Same-parking B changed")
                entry["unchanged_original_B"] = unchanged
                write_bundle(entry, folder / (name + ".check.json"))
        if key in ("factory_probes/auditor_reference", "transport/A_ready", "same_parking/A_ready"):
            group = "factory" if spec["family"] == "factory" else package
            faults[group] = fault_checks(output / "faults" / group, stored, input_file, spec["family"], cli)
            integrity[group] = integrity_checks(output / "integrity" / group, spec, stored, input_file)
        print(f"PASS {key}: {count} histories, {audited['rows']} rows", flush=True)
    require(main_counts == dict(factory=12, bank=10, transport=300, same_parking=312) and probe_count == 20,
            "Regression matrix count mismatch")
    comparisons = {package: cross_comparisons(output, package, rows, read_bundle(TRANSPORT / "model.json"))
                   for package, rows in case_rows.items()}
    supplementary = {}
    frozen_lists = {"factory": read_bundle(FACTORY / "results/summary.json")["supplementary_checks"],
                    "transport": read_bundle(TRANSPORT / "results/run-1/summary.json")["supplementary_checks"],
                    "same_parking": read_bundle(SAME / "results/run-1/summary.json")["supplementary_checks"]}
    for package in frozen_lists:
        probes = [dict(id=k.split("/")[1], status="PASS", paths=v["audit"]["paths"])
                  for k, v in cases.items() if k.startswith(package + "_probes/") and not k.endswith("/auditor_reference")]
        supplementary[package] = probes + faults[package]
        require(len(supplementary[package]) == len(frozen_lists[package]) and
                {x["id"] for x in supplementary[package]} == {x["id"] for x in frozen_lists[package]}, "Missing/duplicate supplemental check")
    summary = dict(status="PASS", main_histories=main_counts, main_total=sum(main_counts.values()),
                   supplementary_valid_histories=probe_count, main_rows=main_rows, all_valid_rows=all_rows,
                   all_projected_rows=projected_rows, generic_tests=tests, cases=cases,
                   supplementary_checks=supplementary, coverage_integrity=integrity, comparisons=comparisons,
                   checkpoint_1_paths_rerun=6, deviations=[])
    write_bundle(summary, output / "summary.json")
    return summary


def main(output):
    output = output.resolve()
    require(ROOT in output.parents and not output.exists(), "Use a NEW output directory inside the prototype")
    before = protected()
    frozen_code = code_manifest()
    output.mkdir(parents=True)
    write_bundle(dict(status="RUNNING", checkpoint=2), output / "summary.json")
    try:
        specs = catalog()
        first = run_one(output / "run-1", specs)
        require(code_manifest() == frozen_code, "Code changed during run-1; repeat with a stable revision")
        run_one(output / "run-2", specs)
        require(code_manifest() == frozen_code, "Code changed during run-2; repeat with a stable revision")
        hashes = [{str(p.relative_to(output / name)): sha(p) for p in sorted((output / name).rglob("*")) if p.is_file()}
                  for name in ("run-1", "run-2")]
        require(hashes[0] == hashes[1], "Non-deterministic result files")
        after = protected()
        require(after == before, "Preservation changed")
        summary = dict(status="PASS", checkpoint=2, profile="fixed-replay/0.1", complete_runs=2,
                       main_histories_per_run=634, supplemental_valid_histories_per_run=20,
                       named_supplementary_checks_per_run=33, integrity_checks_per_run=9,
                       generic_tests_per_run=first["generic_tests"]["tests_run"],
                       generic_subchecks_per_run=first["generic_tests"]["subchecks"],
                       main_rows_per_run=first["main_rows"], all_valid_rows_per_run=first["all_valid_rows"],
                       all_projected_rows_per_run=first["all_projected_rows"],
                       transport_comparison_pairs_per_run=3456, checkpoint_1_paths_rerun_per_run=6,
                       preservation=after, byte_identical=True, files_compared=len(hashes[0]),
                       run_1_sha256=hashes[0], run_2_sha256=hashes[1],
                       code_and_fixture_sha256=frozen_code,
                       first_divergence=None, deviations=[])
        write_bundle(summary, output / "summary.json")
        print("CHECKPOINT 2 PASS: 634 + 20 histories/run, 33 supplemental checks, two byte-identical runs")
    except Exception as error:
        write_bundle(dict(status="FAIL", checkpoint=2, type=type(error).__name__, case=CURRENT_CASE,
                          code_and_fixture_sha256_at_start=frozen_code,
                          code_unchanged=code_manifest() == frozen_code,
                          detail=error.detail if isinstance(error, Divergence) else str(error)), output / "summary.json")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    main(parser.parse_args().output)
