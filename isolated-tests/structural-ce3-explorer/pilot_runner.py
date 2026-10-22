#!/usr/bin/env python3
"""Explicit manual pilot: prepare a review snapshot, freeze, run, read-only verify."""
import argparse
from copy import deepcopy
import hashlib
import os
from pathlib import Path
import subprocess
import sys

from bridge import digest, encode, equal, read_bundle, require, write_bundle
import pilot_contract as contract
from pilot_contract import Admission
import scenario_contracts as scenarios
import scenario_runner as engine
from runner import cli_process


def new_json(path, value):
    """Exclusive external anchor publication; no replace of existing trust."""
    path = Path(path)
    with path.open('xb') as stream:
        stream.write(encode(value))


def external_anchor(path, *packages):
    logical_path = Path(os.path.abspath(path))
    path = Path(path).resolve()
    for package in packages:
        contract.package_tree(package)
        logical_package = Path(os.path.abspath(package))
        require(logical_path != logical_package and logical_package not in logical_path.parents,
                "Trust anchor must be retained logically outside packages")
        package = Path(package).resolve()
        require(path != package and package not in path.parents, "Trust anchor must be retained outside packages")
        for name in ("anchor-copy.json", "pilot/anchor-copy.json"):
            copied = package / name
            require(not (path.exists() and copied.exists() and path.samefile(copied)),
                    "Copied anchor cannot serve as independent trust anchor")
    return path


def copy_materials(descriptors, source, destination):
    for item in descriptors:
        raw = contract.artifact(source, item).read_bytes()
        target = contract.safe_path(destination, item["path"])
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            equal(target.read_bytes().hex(), raw.hex(), "Conflicting material paths")
        else:
            with target.open('xb') as stream:
                stream.write(raw)


def prepare(draft, materials, output):
    contract.package_tree(materials)
    contract.package_tree(output)
    contract.obj(draft, contract.DRAFT_KEYS, "pilot draft")
    equal(draft["schema_version"], "ce3-pilot-draft/3", "Unsupported pilot draft")
    contract.validate_content(draft, materials)
    contract.validate_controls(draft, materials, False)
    snapshot = deepcopy(draft)
    snapshot.update(schema_version="ce3-pilot-snapshot/3", implementation=contract.registration())
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    retained = output / "materials"
    copy_materials([s[k] for s in draft["evidence"] for k in ("original", "extract")], materials, retained)
    for index, control in enumerate(snapshot["controls"]):
        relative = "_pilot_controls/" + str(index)
        directory = retained / relative
        directory.mkdir(parents=True, exist_ok=False)
        run_input = contract.control_input(snapshot["problem"], control)
        write_bundle(run_input, directory / "input.json")
        limits = snapshot["execution"]["limits"]
        play = cli_process("replay", "--input", directory / "input.json", "--output", directory / "history.json.gz",
                           "--max-paths", limits["max_paths"], "--max-rows", limits["max_rows"],
                           "--max-steps", limits["max_steps"])
        write_bundle(play, directory / "replay-process.json")
        equal(play["exit_code"], 0, "Control replay failed")
        audit = cli_process("audit", "--history", directory / "history.json.gz", "--trusted-input", directory / "input.json",
                            "--output", directory / "audit.json")
        write_bundle(audit, directory / "audit-process.json")
        equal(audit["exit_code"], 0, "Control audit failed")
        control.update(history=contract.descriptor(retained, relative + "/history.json.gz"),
                       audit=contract.descriptor(retained, relative + "/audit.json"))
    contract.validate_snapshot(snapshot, retained)
    write_bundle(snapshot, output / "snapshot.json")
    (output / "review.html").write_bytes(contract.presentation(snapshot))
    return {"snapshot_id": digest(snapshot), "presentation_sha256": hashlib.sha256(contract.presentation(snapshot)).hexdigest(),
            "status": "PREPARED_NOT_CONFIRMED", "classification": snapshot["classification"],
            "case_notice": contract.case_notice(snapshot["classification"])}


def reconstruct(admission):
    problem = admission.case["snapshot"]["problem"]
    manifest, pins = scenarios.freeze(problem, _admission=admission)
    snapshot = admission.case["snapshot"]
    impl, execution = snapshot["implementation"], snapshot["execution"]
    spec = engine.batch_spec(problem, manifest, impl["runtime"], impl["explorer_build"],
                             execution["limits"], execution["max_cells"], _admission=admission)
    anchor = {"schema_version": "ce3-pilot-anchor/2", "case_id": admission.case_id,
              "classification": snapshot["classification"], "case_notice": contract.case_notice(snapshot["classification"]),
              "snapshot_id": digest(snapshot), "explorer_pins": pins, "batch_spec_id": digest(spec),
              "runtime_id": digest(impl["runtime"]), "explorer_build_id": digest(impl["explorer_build"])}
    return manifest, spec, anchor


def freeze(prepared, receipts, output, anchor_path):
    prepared, output = Path(prepared), Path(output)
    anchor_path = external_anchor(anchor_path, prepared, output)
    require(not anchor_path.exists(), "Anchor already exists; choose a new reviewed anchor")
    snapshot = read_bundle(prepared / "snapshot.json")
    case = {"schema_version": "ce3-pilot-case/2", "snapshot": snapshot, "classification": snapshot["classification"],
            "presentation_sha256": hashlib.sha256((prepared / "review.html").read_bytes()).hexdigest(),
            "receipts": receipts}
    contract.validate_case(case, prepared / "materials", (prepared / "review.html").read_bytes())
    output.mkdir(parents=True, exist_ok=False)
    write_bundle(case, output / "case.json")
    (output / "review.html").write_bytes((prepared / "review.html").read_bytes())
    copy_materials(contract.material_descriptors(case), prepared / "materials", output / "materials")
    admission = Admission(output)
    manifest, spec, anchor = reconstruct(admission)
    write_bundle(manifest, output / "manifest.json")
    write_bundle(spec, output / "batch.json")
    write_bundle(anchor, output / "anchor-copy.json")
    new_json(anchor_path, anchor)  # publish external trust only after successful validation
    return anchor


def load_frozen(directory, anchor):
    directory = Path(directory)
    admission = Admission(directory)
    manifest, spec, expected = reconstruct(admission)
    equal(anchor, expected, "External pilot trust anchor mismatch")
    equal(read_bundle(directory / "anchor-copy.json"), anchor, "Copied pilot anchor mismatch")
    equal(read_bundle(directory / "manifest.json"), manifest, "Frozen pilot population differs from declared domain")
    equal(read_bundle(directory / "batch.json"), spec, "Frozen pilot batch specification mismatch")
    return admission, manifest, spec


def copy_frozen(source, destination, admission):
    destination.mkdir(parents=True, exist_ok=False)
    for name in ("case.json", "review.html", "manifest.json", "batch.json", "anchor-copy.json"):
        (destination / name).write_bytes((source / name).read_bytes())
    copy_materials(contract.material_descriptors(admission.case), source / "materials", destination / "materials")


def run(frozen, anchor_path, output):
    frozen, output = Path(frozen), Path(output)
    anchor_path = external_anchor(anchor_path, frozen, output)
    anchor = read_bundle(anchor_path)
    admission, manifest, spec = load_frozen(frozen, anchor)
    output.mkdir(parents=True, exist_ok=False)
    copy_frozen(frozen, output / "pilot", admission)
    retained, manifest, spec = load_frozen(output / "pilot", anchor)
    engine.run(retained.case["snapshot"]["problem"], manifest, anchor["explorer_pins"], output / "explorer",
               limits=spec["limits"], max_cells=spec["max_cells"], _admission=retained)
    result = verify(output, anchor_path)
    write_bundle(result, output / "result.json")
    return result


def verify(output, anchor_path):
    """Read only. Both saved result files are deliberately ignored."""
    output = Path(output)
    anchor = read_bundle(external_anchor(anchor_path, output, output / "pilot"))
    admission, manifest, spec = load_frozen(output / "pilot", anchor)
    equal(read_bundle(output / "explorer/batch.json"), spec, "Run is bound to another pilot/budget")
    result = engine.verify(output / "explorer", anchor["explorer_pins"], _admission=admission)
    equal(result["batch_spec_id"], anchor["batch_spec_id"], "Result/pilot batch mismatch")
    admission.validate(admission.case["snapshot"]["problem"])
    contract.package_tree(output)
    # A source re-check and external-anchor re-read avoid accepting a mid-check change.
    equal(read_bundle(anchor_path), anchor, "External anchor changed during verification")
    payload = {"schema_version": "ce3-pilot-result/2", "pilot_case_id": admission.case_id,
               "snapshot_id": anchor["snapshot_id"], "confirmation_ids": [digest(r) for r in admission.case["receipts"]],
               "batch_spec_id": digest(spec), "batch_attempt_id": result["batch_attempt_id"],
               "classification": admission.case["classification"],
               "case_notice": contract.case_notice(admission.case["classification"]),
               "pilot_status": "COMPLETE_CURRENT", "identity_assurance": "self_reported_not_authenticated",
               "run_status": "CERTIFIED" if all(c["run_status"] == "CERTIFIED" for c in result["cells"]) else "INCOMPLETE",
               "goal_status": [{"candidate_id": c["candidate_id"], "order": c["order"], "robust": c["robust"]}
                               for c in result["candidates"]],
               "search_coverage": result["cell_coverage"],
               "execution_budget_status": result["execution_prefix_status"],
               "evidence_ref": "pilot/case.json", "review_ref": "pilot/review.html",
               "cell_artifact_root": "explorer/", "explorer_result": result,
               "interpretation": "declared_controls_satisfied_not_source_truth_or_business_model_proof_no_ranking"}
    return dict(payload, result_id=digest(payload))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("prepare", help="Run hand-derived controls and write an unconfirmed review snapshot")
    p.add_argument("--draft", type=Path, required=True)
    p.add_argument("--materials", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p = commands.add_parser("freeze", help="Require exact manual receipts and create a separate anchor")
    p.add_argument("--prepared", type=Path, required=True)
    p.add_argument("--receipts", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--anchor", type=Path, required=True)
    p = commands.add_parser("run")
    p.add_argument("--frozen", type=Path, required=True)
    p.add_argument("--anchor", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p = commands.add_parser("verify")
    p.add_argument("--anchor", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "prepare":
            result = prepare(read_bundle(args.draft), args.materials, args.output)
        elif args.command == "freeze":
            result = freeze(args.prepared, read_bundle(args.receipts), args.output, args.anchor)
        elif args.command == "run":
            result = run(args.frozen, args.anchor, args.output)
        else:
            result = verify(args.output, args.anchor)
        # Complete fresh result goes to stdout; verify never modifies the package.
        print(encode(result).decode('utf-8'), end='')
        return 0 if "search_coverage" not in result or result["search_coverage"]["status"] == "COMPLETE" else 2
    except engine.ERRORS + (UnicodeError, subprocess.TimeoutExpired) as error:
        print("INVALID PILOT: " + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
