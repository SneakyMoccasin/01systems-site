"""Outcome-only crossing of the existing three-decision grammar. No transitions."""
from copy import deepcopy
from itertools import permutations, product

from bridge import digest, equal, obj, require, validate
from contracts import materialize as single_input, validate_declaration, SCRIPT_SOURCE


def effective_problem(problem, scenario):
    """Projection for the existing input builder and terminal goal observer."""
    return dict({k: deepcopy(v) for k, v in problem.items() if k != "scenario_set"},
                outcomes=deepcopy(scenario["outcomes"]))


def validate_problem(problem):
    obj(problem, ("schema_version", "revision", "purpose", "profile", "model", "sources",
                  "search", "observation", "scenario_set"), "scenario problem")
    equal(problem["schema_version"], "ce3-scenario-problem/1", "Unsupported scenario problem")
    space = problem["scenario_set"]
    obj(space, ("schema_version", "variation", "selection", "members"), "scenario set")
    equal(space["schema_version"], "ce3-scenario-set/1", "Unsupported scenario set")
    equal(space["variation"], "outcomes_only", "Only outcomes may vary")
    equal(space["selection"], "explicit_complete_list", "Unsupported scenario selection")
    require(type(space["members"]) is list and bool(space["members"]), "Nonempty scenario set required")
    labels = set()
    for scenario in space["members"]:
        obj(scenario, ("label", "outcomes"), "scenario")
        label = scenario["label"]
        require(type(label) is str and bool(label.strip()) and label not in labels,
                "Unique nonempty scenario label required")
        labels.add(label)
        validate_declaration(effective_problem(problem, scenario))
    return problem


def search_identity(problem):
    return digest({"schema_version": "ce3-scenario-search-space/1",
                   "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"]),
                   "grammar": problem["search"], "script_source": SCRIPT_SOURCE})


def scenario_space_identity(problem):
    return digest({"schema_version": "ce3-scenario-space/1", "set": problem["scenario_set"],
                   "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"])})


def candidate(problem, order):
    script = single_input(effective_problem(problem, problem["scenario_set"]["members"][0]), order)["script"]
    plan_id = digest({"kind": "ce3-plan/1", "script": script})
    return {"candidate_id": digest({"schema_version": "ce3-scenario-candidate/1",
                                   "search_space_id": search_identity(problem), "plan_id": plan_id}),
            "plan_id": plan_id, "order": list(order), "script": script}


def scenario_member(problem, definition):
    payload = {"schema_version": "ce3-scenario/1", "scenario_space_id": scenario_space_identity(problem),
               "definition": deepcopy(definition)}
    return dict(payload, scenario_id=digest(payload), outcomes_id=digest(definition["outcomes"]))


def materialize(problem, plan, scenario):
    run = single_input(effective_problem(problem, scenario["definition"]), plan["order"])
    equal(run["script"], plan["script"], "Fixed script mismatch")
    return validate(run)


def cell(problem, plan, scenario):
    payload = {"schema_version": "ce3-scenario-cell/1", "problem_id": digest(problem),
               "candidate_id": plan["candidate_id"], "plan_id": plan["plan_id"],
               "scenario_space_id": scenario_space_identity(problem), "scenario_id": scenario["scenario_id"],
               "outcomes_id": scenario["outcomes_id"],
               "input_identity": digest(materialize(problem, plan, scenario))}
    return dict(payload, cell_id=digest(payload))


def freeze(problem):
    """Independent enumerator: all length-three words, filtered by all-different.

    Crosses by scenario first, unlike generate's permutations then scenario loop.
    Shared materialization is additionally checked by direct input tests.
    """
    validate_problem(problem)
    ids = problem["search"]["decision_ids"]
    plans = [candidate(problem, w) for w in product(ids, repeat=3) if len(set(w)) == 3]
    scenarios = [scenario_member(problem, s) for s in problem["scenario_set"]["members"]]
    cells = [cell(problem, p, s) for s in scenarios for p in plans]
    cells.sort(key=lambda c: c["cell_id"])
    manifest = {"schema_version": "ce3-scenario-manifest/1", "problem_id": digest(problem),
                "search_space_id": search_identity(problem), "scenario_space_id": scenario_space_identity(problem),
                "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"]),
                "observation_definition_id": digest(problem["observation"]),
                "candidates": plans, "scenarios": scenarios, "cells": cells}
    return manifest, {"schema_version": "ce3-scenario-pins/1", "problem_id": digest(problem),
                      "manifest_id": digest(manifest)}


def verify_frozen(problem, manifest, pins):
    expected, expected_pins = freeze(problem)
    equal(pins, expected_pins, "Trusted problem/manifest identity mismatch")
    equal(manifest, expected, "Manifest differs from declared candidate x scenario population")


def generate(problem):
    return [cell(problem, candidate(problem, order), scenario_member(problem, s))
            for order in permutations(problem["search"]["decision_ids"])
            for s in problem["scenario_set"]["members"]]


def check_population(manifest, cells):
    expected = {c["cell_id"]: c for c in manifest["cells"]}
    seen, duplicates, unexpected, invalid = set(), [], [], []
    for c in cells:
        key = c.get("cell_id") if type(c) is dict else None
        if not isinstance(key, str):
            invalid.append("malformed_cell")
            continue
        if key in seen:
            duplicates.append(key)
        seen.add(key)
        if key not in expected:
            unexpected.append(key)
        elif digest(c) != digest(expected[key]):
            invalid.append(key)
    missing = sorted(set(expected) - seen)
    return {"status": "INVALID" if duplicates or unexpected or invalid else
            "INCOMPLETE" if missing else "COMPLETE", "expected": len(expected), "observed": len(cells),
            "missing": missing, "duplicates": sorted(duplicates), "unexpected": sorted(unexpected),
            "invalid": sorted(invalid)}
