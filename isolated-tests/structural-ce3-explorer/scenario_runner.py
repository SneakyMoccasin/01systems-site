#!/usr/bin/env python3
"""Freeze, execute and verify an outcome-only candidate x scenario population."""
import argparse
from pathlib import Path
import subprocess
import sys
import uuid
from collections import Counter

from bridge import (ROOT, digest, equal, explorer_build, read_bundle, require,
                    runtime_manifest, write_bundle)
from contracts import LIMITS
from observe import audit_receipt, observe
from runner import artifact_record, cli_process
from scenario_contracts import (check_population, effective_problem, freeze, generate,
                                materialize, verify_frozen)

ERRORS = (OSError, ValueError, KeyError, TypeError, IndexError)


def batch_spec(problem, manifest, runtime, build, limits, max_cells):
    equal(sorted(limits), sorted(LIMITS), "Invalid limits keys")
    require(all(type(v) is int and v > 0 for v in limits.values()), "Invalid limits")
    require(type(max_cells) is int and 0 <= max_cells <= len(manifest["cells"]), "Invalid cell budget")
    return {"schema_version": "ce3-scenario-execution/1", "problem_id": digest(problem),
            "manifest_id": digest(manifest), "runtime_id": digest(runtime),
            "explorer_build_id": digest(build), "limits": limits, "max_cells": max_cells}


def base_record(cell, spec, batch_id, run_id):
    for value in (batch_id, run_id):
        require(type(value) is str and uuid.UUID(hex=value).hex == value, "Invalid attempt UUID")
    return {"schema_version": "ce3-scenario-run/1", "cell": cell, "run_id": run_id,
            "batch_attempt_id": batch_id, "batch_spec_id": digest(spec),
            "execution_id": digest({"schema_version": "ce3-execution/1",
                                    "input_identity": cell["input_identity"],
                                    "runtime_id": spec["runtime_id"], "limits": spec["limits"]})}


def observation(problem, scenario, cell, bundle, run_input, audit, spec):
    projection = observe(effective_problem(problem, scenario["definition"]), bundle, run_input, audit,
                         spec["runtime_id"], spec["explorer_build_id"])
    return {"schema_version": "ce3-scenario-observation/1", "problem_id": digest(problem),
            "cell_id": cell["cell_id"], "scenario_id": scenario["scenario_id"],
            "batch_spec_id": digest(spec), "projection": projection}


def lookups(manifest):
    return ({p["candidate_id"]: p for p in manifest["candidates"]},
            {s["scenario_id"]: s for s in manifest["scenarios"]})


def run(problem, manifest, pins, output, *, limits=None, max_cells=None):
    verify_frozen(problem, manifest, pins)
    runtime, build = runtime_manifest(), explorer_build()
    spec = batch_spec(problem, manifest, runtime, build, dict(LIMITS if limits is None else limits),
                      len(manifest["cells"]) if max_cells is None else max_cells)
    cells = generate(problem)
    equal(check_population(manifest, cells)["status"], "COMPLETE", "Generator coverage failed")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)  # no overwrite, resume or retry
    attempt = {"schema_version": "ce3-scenario-attempt/1", "batch_spec_id": digest(spec),
               "batch_attempt_id": uuid.uuid4().hex}
    for name, value in (("problem", problem), ("manifest", manifest), ("pins", pins),
                        ("runtime", runtime), ("explorer-build", build), ("batch", spec),
                        ("attempt", attempt), ("enumeration", cells)):
        write_bundle(value, output / (name + ".json"))
    plans, scenarios = lookups(manifest)
    for cell in cells[:spec["max_cells"]]:
        equal(runtime_manifest(), runtime, "Runtime changed before replay")
        equal(explorer_build(), build, "Explorer changed before replay")
        directory = output / "runs" / cell["cell_id"]
        directory.mkdir(parents=True)
        scenario = scenarios[cell["scenario_id"]]
        expected_input = materialize(problem, plans[cell["candidate_id"]], scenario)
        base = base_record(cell, spec, attempt["batch_attempt_id"], uuid.uuid4().hex)
        write_bundle(expected_input, directory / "input.json")
        write_bundle(base, directory / "started.json")
        try:
            limits = spec["limits"]
            play = cli_process("replay", "--input", directory / "input.json",
                               "--output", directory / "history.json.gz",
                               "--max-paths", limits["max_paths"], "--max-rows", limits["max_rows"],
                               "--max-steps", limits["max_steps"])
            write_bundle(play, directory / "replay-process.json")
            check = cli_process("audit", "--history", directory / "history.json.gz",
                                "--trusted-input", directory / "input.json", "--output", directory / "audit.json")
            write_bundle(check, directory / "audit-process.json")
            equal(runtime_manifest(), runtime, "Runtime changed during run")
            equal(explorer_build(), build, "Explorer changed during run")
            record = artifact_record(base, directory)
            bundle, audit = read_bundle(directory / "history.json.gz"), read_bundle(directory / "audit.json")
            receipt = audit_receipt(bundle, expected_input, audit, spec["runtime_id"])
            obs = observation(problem, scenario, cell, bundle, expected_input, audit, spec)
            write_bundle(receipt, directory / "audit-receipt.json")
            write_bundle(obs, directory / "observation.json")
            write_bundle(dict(record, audit_receipt_id=digest(receipt), observation_id=digest(obs)),
                         directory / "record.json")
        except ERRORS + (subprocess.TimeoutExpired,) as error:
            write_bundle({"status": "UNVERIFIED", "reason": str(error)}, directory / "failure.json")
    result = verify(output, pins)
    write_bundle(result, output / "result.json")
    return result


def robust(cells):
    """Strong three-valued conjunction over a nonempty declared cell set."""
    require(bool(cells), "Robustness requires a declared nonempty scenario population")
    if any(c["run_status"] == "CERTIFIED" and c["goal_satisfied"] is False for c in cells):
        return "FALSE"
    if all(c["run_status"] == "CERTIFIED" and c["goal_satisfied"] is True for c in cells):
        return "TRUE"
    return "UNKNOWN"


def verify(output, pins):
    """Reconstruct the domain, re-audit, then derive goals. Never read result.json."""
    output = Path(output)
    problem, manifest = read_bundle(output / "problem.json"), read_bundle(output / "manifest.json")
    verify_frozen(problem, manifest, pins)
    equal(read_bundle(output / "pins.json"), pins, "Copied pins differ from external trust anchor")
    runtime, build = read_bundle(output / "runtime.json"), read_bundle(output / "explorer-build.json")
    equal(runtime, runtime_manifest(), "Runtime build mismatch")
    equal(build, explorer_build(), "Explorer build mismatch")
    spec, attempt = read_bundle(output / "batch.json"), read_bundle(output / "attempt.json")
    equal(spec, batch_spec(problem, manifest, runtime, build, spec["limits"], spec["max_cells"]),
          "Batch specification mismatch")
    equal(attempt, {"schema_version": "ce3-scenario-attempt/1", "batch_spec_id": digest(spec),
                    "batch_attempt_id": attempt["batch_attempt_id"]}, "Batch attempt mismatch")
    # Validate even a zero-budget attempt UUID.
    base_record(manifest["cells"][0], spec, attempt["batch_attempt_id"], attempt["batch_attempt_id"])
    enumeration = read_bundle(output / "enumeration.json")
    require(type(enumeration) is list, "Enumeration must be an array")
    membership = check_population(manifest, enumeration)
    expected_ids = {c["cell_id"] for c in manifest["cells"]}
    actual_ids = {p.name for p in (output / "runs").iterdir()} if (output / "runs").exists() else set()
    unexpected = sorted(actual_ids - expected_ids)
    # A duplicate occurrence makes every claimant unknown, independent of iteration order.
    occurrences = Counter()
    for key in expected_ids:
        try:
            value = read_bundle(output / "runs" / key / "record.json")["run_id"]
            if type(value) is str:
                occurrences[value] += 1
        except ERRORS:
            pass
    plans, scenarios = lookups(manifest)
    results = []
    for cell in manifest["cells"]:
        key = cell["cell_id"]
        directory = output / "runs" / key
        entry = dict(cell, order=plans[cell["candidate_id"]]["order"],
                     scenario_label=scenarios[cell["scenario_id"]]["definition"]["label"],
                     record_ref="runs/" + key + "/record.json", run_status="NOT_RUN",
                     goal_status="UNKNOWN", goal_satisfied=None,
                     event_path_coverage={"status": "UNKNOWN", "audited_paths": None})
        try:
            if not directory.exists():
                results.append(entry)
                continue
            entry["run_status"] = "UNVERIFIED"
            record = read_bundle(directory / "record.json")
            base = base_record(cell, spec, attempt["batch_attempt_id"], record["run_id"])
            equal(read_bundle(directory / "started.json"), base, "Started/cell binding mismatch")
            require(occurrences[record["run_id"]] == 1, "Duplicate run UUID")
            scenario = scenarios[cell["scenario_id"]]
            expected_input = materialize(problem, plans[cell["candidate_id"]], scenario)
            equal(read_bundle(directory / "input.json"), expected_input, "Stored input differs from cell")
            bundle, audit = read_bundle(directory / "history.json.gz"), read_bundle(directory / "audit.json")
            equal(bundle["limits"], spec["limits"], "Replay limits mismatch")
            receipt = audit_receipt(bundle, expected_input, audit, spec["runtime_id"])
            obs = observation(problem, scenario, cell, bundle, expected_input, audit, spec)
            equal(read_bundle(directory / "audit-receipt.json"), receipt, "Audit receipt mismatch")
            equal(read_bundle(directory / "observation.json"), obs, "Observation mismatch")
            equal(record, dict(artifact_record(base, directory), audit_receipt_id=digest(receipt),
                               observation_id=digest(obs)), "Run artifact identity mismatch")
            goal = obs["projection"]["goal_satisfied"]
            entry.update(run_status="CERTIFIED", goal_status="SATISFIED" if goal else "NOT_SATISFIED",
                         goal_satisfied=goal, run_id=record["run_id"], execution_id=record["execution_id"],
                         history_id=record["history_id"], audit_receipt_id=digest(receipt),
                         observation_id=digest(obs),
                         event_path_coverage={"status": "COMPLETE", "audited_paths": len(bundle["paths"])})
        except ERRORS as error:
            entry["reason"] = str(error)
        results.append(entry)
    certified = [c for c in results if c["run_status"] == "CERTIFIED"]
    invalid = membership["status"] == "INVALID" or bool(unexpected)

    def projection_coverage(field, members):
        expected = {m[field] for m in members}
        represented = {c[field] for c in certified}
        return {"status": "COMPLETE" if represented == expected else "INCOMPLETE",
                "expected": len(expected), "certified_represented": len(represented),
                "unrepresented": sorted(expected - represented)}

    aggregates = []
    for plan in manifest["candidates"]:
        group = [c for c in results if c["candidate_id"] == plan["candidate_id"]]
        aggregates.append({"candidate_id": plan["candidate_id"], "order": plan["order"],
                           "robust": robust(group), "expected_scenarios": len(group),
                           "certified_cells": sum(c["run_status"] == "CERTIFIED" for c in group),
                           "cell_ids": [c["cell_id"] for c in group]})
    result = {"schema_version": "ce3-scenario-result/1", "problem_id": digest(problem),
              "manifest_id": digest(manifest), "scenario_space_id": manifest["scenario_space_id"],
              "batch_spec_id": digest(spec), "batch_attempt_id": attempt["batch_attempt_id"],
              "runtime_id": digest(runtime), "explorer_build_id": digest(build),
              "enumeration_coverage": membership,
              "candidate_coverage": projection_coverage("candidate_id", manifest["candidates"]),
              "scenario_coverage": projection_coverage("scenario_id", manifest["scenarios"]),
              "cell_coverage": {"status": "INVALID" if invalid else "COMPLETE" if
                                membership["status"] == "COMPLETE" and len(certified) == len(results)
                                else "INCOMPLETE", "expected": len(results), "certified": len(certified),
                                "uncertified": [c["cell_id"] for c in results if c["run_status"] != "CERTIFIED"],
                                "unexpected_run_directories": unexpected},
              "cells": results, "candidates": aggregates,
              "interpretation": "frozen_scenario_set_only_not_probability_or_customer_value"}
    return dict(result, result_id=digest(result))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("freeze", "run", "verify"))
    parser.add_argument("--problem", type=Path, default=ROOT / "fixtures/scenario-problem.json")
    parser.add_argument("--manifest", type=Path, default=ROOT / "fixtures/scenario-manifest.json")
    parser.add_argument("--pins", type=Path, default=ROOT / "fixtures/scenario-pins.json")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--max-cells", type=int)
    for key, value in LIMITS.items():
        parser.add_argument("--" + key.replace("_", "-"), type=int, default=value)
    args = parser.parse_args()
    try:
        if args.command == "freeze":
            manifest, pins = freeze(read_bundle(args.problem))
            args.output.mkdir(parents=True, exist_ok=False)
            write_bundle(manifest, args.output / "manifest.json")
            write_bundle(pins, args.output / "pins.json")
            print("Retain reviewed pins separately:", pins)
            return 0
        pins = read_bundle(args.pins)
        result = (run(read_bundle(args.problem), read_bundle(args.manifest), pins, args.output,
                      limits={key: getattr(args, key) for key in LIMITS}, max_cells=args.max_cells)
                  if args.command == "run" else verify(args.output, pins))
        for cell in sorted(result["cells"], key=lambda c: (c["order"], c["scenario_label"])):
            print(" ".join(cell["order"]), cell["scenario_label"], cell["run_status"], cell["goal_status"])
        for candidate in result["candidates"]:
            print(" ".join(candidate["order"]), "robust:", candidate["robust"])
        for key in ("candidate_coverage", "scenario_coverage", "cell_coverage"):
            print(key + ":", result[key])
        print("Result identity:", result["result_id"])
        return 0 if result["cell_coverage"]["status"] == "COMPLETE" else 2
    except ERRORS as error:
        print("INVALID: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
