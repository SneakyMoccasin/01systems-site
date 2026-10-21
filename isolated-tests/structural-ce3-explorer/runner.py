#!/usr/bin/env python3
"""Minimal explorer: freeze, run through CE3 CLI, or re-audit existing artifacts."""
import argparse
from pathlib import Path
import subprocess
import sys
import uuid

from bridge import (ROOT, REPLAY, digest, equal, explorer_build, file_hash,
                    read_bundle, require, runtime_manifest, write_bundle)
from contracts import (LIMITS, check_coverage, freeze, materialize, verify_frozen)
from enumerate_scripts import generate
from observe import audit_receipt, observe


def search_spec(problem, manifest, runtime, build, limits, max_candidates):
    equal(sorted(limits), sorted(LIMITS), "Invalid limits keys")
    require(all(type(v) is int and v > 0 for v in limits.values()), "Limits must be positive integers")
    require(type(max_candidates) is int and 0 <= max_candidates <= 6, "Search budget must be 0..6")
    return {"schema_version": "ce3-search-execution/1", "problem_id": digest(problem),
            "manifest_id": digest(manifest), "runtime_id": digest(runtime),
            "explorer_build_id": digest(build), "limits": limits, "max_candidates": max_candidates}


def base_record(problem, manifest, candidate, spec, run_id):
    require(type(run_id) is str and uuid.UUID(hex=run_id).hex == run_id, "Invalid run UUID")
    return {"schema_version": "ce3-explorer-run/1", "run_id": run_id,
            "problem_id": digest(problem), "problem_revision": problem["revision"],
            "search_execution_id": digest(spec), "manifest_id": digest(manifest),
            "search_space_id": manifest["search_space_id"], "candidate_id": candidate["candidate_id"],
            "model_id": manifest["model_id"], "plan_id": candidate["plan_id"],
            "input_identity": candidate["input_identity"], "runtime_id": spec["runtime_id"],
            "execution_id": digest({"schema_version": "ce3-execution/1",
                                    "input_identity": candidate["input_identity"],
                                    "runtime_id": spec["runtime_id"], "limits": spec["limits"]})}


def artifact_record(base, directory):
    return dict(base, artifact_hashes={name: file_hash(directory / name)
                                     for name in ("input.json", "history.json.gz", "audit.json")},
                history_id=digest(read_bundle(directory / "history.json.gz")),
                audit_result_id=digest(read_bundle(directory / "audit.json")))


def cli_process(command, *args):
    result = subprocess.run([sys.executable, "-B", str(REPLAY / "cli.py"), command, *map(str, args)],
                            capture_output=True, text=True, timeout=60)
    return {"exit_code": result.returncode, "stdout": result.stdout, "stderr": result.stderr}


def run(problem, manifest, trusted_pins, output, *, limits=None, max_candidates=6):
    verify_frozen(problem, manifest, trusted_pins)
    limits = dict(LIMITS if limits is None else limits)
    runtime, build = runtime_manifest(), explorer_build()
    spec = search_spec(problem, manifest, runtime, build, limits, max_candidates)
    output = Path(output)
    # Refuse reuse, including incomplete attempts. No legacy artifact is overwritten.
    output.mkdir(parents=True, exist_ok=False)
    for name, value in (("problem.json", problem), ("manifest.json", manifest), ("pins.json", trusted_pins),
                        ("runtime.json", runtime), ("explorer-build.json", build), ("search.json", spec)):
        write_bundle(value, output / name)
    candidates = generate(problem)
    write_bundle(candidates, output / "enumeration.json")
    equal(check_coverage(manifest, candidates)["status"], "COMPLETE", "Generator coverage failed")
    for candidate in candidates[:max_candidates]:
        equal(runtime_manifest(), runtime, "Runtime changed before replay")
        equal(explorer_build(), build, "Explorer changed before replay")
        directory = output / "runs" / candidate["candidate_id"]
        directory.mkdir(parents=True, exist_ok=False)
        expected_input = materialize(problem, candidate["order"])
        write_bundle(expected_input, directory / "input.json")
        base = base_record(problem, manifest, candidate, spec, uuid.uuid4().hex)
        write_bundle(base, directory / "started.json")
        try:
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
            try:
                receipt = audit_receipt(bundle, expected_input, audit, spec["runtime_id"])
                observation = observe(problem, bundle, expected_input, audit,
                                      spec["runtime_id"], spec["explorer_build_id"])
                write_bundle(receipt, directory / "audit-receipt.json")
                write_bundle(observation, directory / "observation.json")
                record.update(audit_receipt_id=digest(receipt), observation_id=digest(observation))
            except ValueError as error:
                # ERROR/INCOMPLETE/AUDIT_FAIL never become a negative goal answer.
                record["uncertified_reason"] = str(error)
            write_bundle(record, directory / "record.json")
        except (OSError, ValueError, subprocess.TimeoutExpired) as error:
            write_bundle({"status": "UNVERIFIED", "reason": str(error)}, directory / "failure.json")
    result = verify(output, trusted_pins)
    write_bundle(result, output / "result.json")
    return result


def verify(output, trusted_pins):
    """Read-only: validate trusted identities, fresh audit, recompute observations.

    result.json is a disposable summary, never input to verification. No replay.
    """
    output = Path(output)
    problem, manifest = read_bundle(output / "problem.json"), read_bundle(output / "manifest.json")
    verify_frozen(problem, manifest, trusted_pins)
    equal(read_bundle(output / "pins.json"), trusted_pins, "Copied pins differ from external trust anchor")
    runtime, build = read_bundle(output / "runtime.json"), read_bundle(output / "explorer-build.json")
    equal(runtime, runtime_manifest(), "Runtime build mismatch; use the recorded version")
    equal(build, explorer_build(), "Explorer build mismatch; use the recorded version")
    spec = read_bundle(output / "search.json")
    equal(spec, search_spec(problem, manifest, runtime, build, spec["limits"], spec["max_candidates"]),
          "Search execution identity mismatch")
    candidates = read_bundle(output / "enumeration.json")
    require(type(candidates) is list, "Enumeration must be an array")
    coverage = check_coverage(manifest, candidates)
    expected_ids = {m["candidate_id"] for m in manifest["members"]}
    actual_ids = {p.name for p in (output / "runs").iterdir()} if (output / "runs").exists() else set()
    unexpected_runs = sorted(actual_ids - expected_ids)
    results, seen_runs = [], set()
    for candidate in manifest["members"]:
        directory = output / "runs" / candidate["candidate_id"]
        entry = {"candidate_id": candidate["candidate_id"], "plan_id": candidate["plan_id"],
                 "order": candidate["order"], "input_identity": candidate["input_identity"],
                 "record_ref": "runs/" + candidate["candidate_id"] + "/record.json",
                 "run_status": "NOT_RUN", "goal_status": "UNKNOWN", "goal_satisfied": None}
        try:
            if not directory.exists():
                results.append(entry)
                continue
            entry["run_status"] = "UNVERIFIED"
            record = read_bundle(directory / "record.json")
            base = base_record(problem, manifest, candidate, spec, record["run_id"])
            equal(read_bundle(directory / "started.json"), base, "Started/run binding mismatch")
            require(record["run_id"] not in seen_runs, "Duplicate run UUID")
            seen_runs.add(record["run_id"])
            expected_input = materialize(problem, candidate["order"])
            equal(read_bundle(directory / "input.json"), expected_input, "Stored input differs from candidate")
            bundle, audit = read_bundle(directory / "history.json.gz"), read_bundle(directory / "audit.json")
            equal(bundle["limits"], spec["limits"], "Replay limits mismatch")
            receipt = audit_receipt(bundle, expected_input, audit, spec["runtime_id"])
            observation = observe(problem, bundle, expected_input, audit,
                                  spec["runtime_id"], spec["explorer_build_id"])
            equal(read_bundle(directory / "audit-receipt.json"), receipt, "Audit receipt mismatch")
            equal(read_bundle(directory / "observation.json"), observation, "Observation mismatch")
            expected_record = dict(artifact_record(base, directory), audit_receipt_id=digest(receipt),
                                   observation_id=digest(observation))
            equal(record, expected_record, "Run artifact identity mismatch")
            entry.update(run_status="CERTIFIED", goal_status="SATISFIED" if observation["goal_satisfied"]
                         else "NOT_SATISFIED", goal_satisfied=observation["goal_satisfied"],
                         run_id=record["run_id"], execution_id=record["execution_id"],
                         history_id=record["history_id"], audit_receipt_id=digest(receipt),
                         observation_id=digest(observation))
        except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
            entry["reason"] = str(error)
        results.append(entry)
    uncertified = [r["candidate_id"] for r in results if r["run_status"] != "CERTIFIED"]
    invalid = coverage["status"] == "INVALID" or bool(unexpected_runs)
    complete = coverage["status"] == "COMPLETE" and not uncertified and not invalid
    result = {"schema_version": "ce3-explorer-result/1", "problem_id": digest(problem),
              "problem_revision": problem["revision"], "manifest_id": digest(manifest),
              "search_execution_id": digest(spec), "runtime_id": digest(runtime),
              "explorer_build_id": digest(build), "enumeration_coverage": coverage,
              "search_coverage": {"status": "INVALID" if invalid else "COMPLETE" if complete else "INCOMPLETE",
                                  "uncertified": uncertified, "unexpected_run_directories": unexpected_runs},
              "candidates": results, "interpretation": "synthetic_integration_test_not_customer_value_or_probability"}
    return dict(result, result_id=digest(result))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    prepare = sub.add_parser("freeze", help="Explicitly create new trust anchors; never part of run/verify")
    prepare.add_argument("--problem", type=Path, required=True)
    prepare.add_argument("--output", type=Path, required=True)
    play = sub.add_parser("run")
    play.add_argument("--problem", type=Path, default=ROOT / "fixtures/problem.json")
    play.add_argument("--manifest", type=Path, default=ROOT / "fixtures/search-manifest.json")
    play.add_argument("--pins", type=Path, default=ROOT / "fixtures/pins.json")
    play.add_argument("--output", type=Path, required=True)
    play.add_argument("--max-candidates", type=int, default=6)
    for key, value in LIMITS.items():
        play.add_argument("--" + key.replace("_", "-"), type=int, default=value)
    check = sub.add_parser("verify")
    check.add_argument("--output", type=Path, required=True, help="Existing output directory; read-only")
    check.add_argument("--pins", type=Path, default=ROOT / "fixtures/pins.json")
    args = parser.parse_args()
    try:
        if args.command == "freeze":
            manifest, pins = freeze(read_bundle(args.problem))
            args.output.mkdir(parents=True, exist_ok=False)
            write_bundle(manifest, args.output / "search-manifest.json")
            write_bundle(pins, args.output / "pins.json")
            print("Review and retain these pins independently before run:", pins)
            return 0
        pins = read_bundle(args.pins)
        if args.command == "run":
            result = run(read_bundle(args.problem), read_bundle(args.manifest), pins, args.output,
                         limits={key: getattr(args, key) for key in LIMITS}, max_candidates=args.max_candidates)
        else:
            result = verify(args.output, pins)
        for candidate in result["candidates"]:
            print(" ".join(candidate["order"]), candidate["run_status"], candidate["goal_status"])
        print("Search coverage:", result["search_coverage"]["status"])
        print("Result identity:", result["result_id"])
        return 0 if result["search_coverage"]["status"] == "COMPLETE" else 2
    except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
        print("INVALID: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
