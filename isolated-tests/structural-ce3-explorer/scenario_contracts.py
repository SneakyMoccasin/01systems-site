"""Outcome-only crossing of versioned fixed-script grammars. No transitions."""
from copy import deepcopy
from itertools import permutations, product

from bridge import digest, equal, obj, require, validate
from contracts import materialize as single_input, validate_declaration, SCRIPT_SOURCE
from fixed_slots import expected_orders, search_size as fixed_search_size
import selection


WRAPPERS = ("problem", "cell", "manifest", "pins", "execution", "attempt", "run", "observation", "result")
VERSIONS = {suffix: dict.fromkeys(WRAPPERS, suffix) for suffix in ("1", "2", "3", "4")}
for suffix, search_version in (("1", "1"), ("2", "2"), ("3", "2"), ("4", "3")):
    VERSIONS[suffix].update({"search-space": search_version, "candidate": search_version})


def version(problem, name):
    suffix = problem["schema_version"].rsplit("/", 1)[-1]
    require(suffix in VERSIONS and name in VERSIONS[suffix], "Unsupported scenario payload version")
    return "ce3-scenario-" + name + "/" + VERSIONS[suffix][name]


def search_size(problem):
    return selection.search_size(problem) if selection.enabled(problem) else fixed_search_size(problem)


def effective_problem(problem, scenario):
    """Projection for the existing input builder and versioned goal observer."""
    return dict({k: deepcopy(v) for k, v in problem.items() if k != "scenario_set"},
                outcomes=deepcopy(scenario["outcomes"]))


def validate_problem(problem):
    obj(problem, ("schema_version", "revision", "purpose", "profile", "model", "sources",
                  "search", "observation", "scenario_set"), "scenario problem")
    require(problem["schema_version"] in ("ce3-scenario-problem/1", "ce3-scenario-problem/2", "ce3-scenario-problem/3", selection.PROBLEM),
            "Unsupported scenario problem")
    expanded = problem["schema_version"] in ("ce3-scenario-problem/2", "ce3-scenario-problem/3", selection.PROBLEM)
    space = problem["scenario_set"]
    obj(space, ("schema_version", "variation", "selection", "members"), "scenario set")
    equal(space["schema_version"], "ce3-scenario-set/1", "Unsupported scenario set")
    equal(space["variation"], "outcomes_only", "Only outcomes may vary")
    equal(space["selection"], "explicit_complete_list", "Unsupported scenario selection")
    require(type(space["members"]) is list and bool(space["members"]), "Nonempty scenario set required")
    if expanded:
        search_size(problem)  # before envelopes, candidate lists or manifests
    labels = set()
    for scenario in space["members"]:
        obj(scenario, ("label", "outcomes"), "scenario")
        label = scenario["label"]
        require(type(label) is str and bool(label.strip()) and label not in labels,
                "Unique nonempty scenario label required")
        labels.add(label)
        validate_declaration(effective_problem(problem, scenario), fixed_slots=expanded,
                             history_goals=problem["schema_version"] == "ce3-scenario-problem/3",
                             selected=selection.enabled(problem))
    return problem


def search_identity(problem):
    if selection.enabled(problem):
        return selection.search_identity(problem)
    grammar = deepcopy(problem["search"])
    if problem["schema_version"] in ("ce3-scenario-problem/2", "ce3-scenario-problem/3"):
        grammar["decision_ids"] = sorted(grammar["decision_ids"])
    return digest({"schema_version": version(problem, "search-space"),
                   "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"]),
                   "grammar": grammar, "script_source": SCRIPT_SOURCE})


def scenario_space_identity(problem):
    return digest({"schema_version": "ce3-scenario-space/1", "set": problem["scenario_set"],
                   "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"])})


def candidate(problem, order):
    if selection.enabled(problem):
        return selection.candidate(problem, order)
    script = single_input(effective_problem(problem, problem["scenario_set"]["members"][0]), order)["script"]
    plan_id = digest({"kind": "ce3-plan/1", "script": script})
    return {"candidate_id": digest({"schema_version": version(problem, "candidate"),
                                   "search_space_id": search_identity(problem), "plan_id": plan_id}),
            "plan_id": plan_id, "order": list(order), "script": script}


def scenario_member(problem, definition):
    payload = {"schema_version": "ce3-scenario/1", "scenario_space_id": scenario_space_identity(problem),
               "definition": deepcopy(definition)}
    return dict(payload, scenario_id=digest(payload), outcomes_id=digest(definition["outcomes"]))


def materialize(problem, plan, scenario):
    if selection.enabled(problem):
        equal(plan, candidate(problem, plan["order"]), "Selected candidate content mismatch")
    run = single_input(effective_problem(problem, scenario["definition"]), plan["order"])
    equal(run["script"], plan["script"], "Fixed script mismatch")
    return validate(run)


def cell(problem, plan, scenario):
    payload = {"schema_version": version(problem, "cell"), "problem_id": digest(problem),
               "candidate_id": plan["candidate_id"], "plan_id": plan["plan_id"],
               "scenario_space_id": scenario_space_identity(problem), "scenario_id": scenario["scenario_id"],
               "outcomes_id": scenario["outcomes_id"],
               "input_identity": digest(materialize(problem, plan, scenario))}
    return dict(payload, cell_id=digest(payload))


def freeze(problem):
    """Independent oracle: /1 Cartesian words; /2 and /3 factorial rank decoding.

    Crosses by scenario first, unlike generate's permutations then scenario loop.
    Shared materialization is additionally checked by direct input tests.
    """
    validate_problem(problem)
    ids = problem["search"].get("decision_ids")
    expanded = problem["schema_version"] in ("ce3-scenario-problem/2", "ce3-scenario-problem/3", selection.PROBLEM)
    orders = (selection.expected_orders(problem) if selection.enabled(problem) else
              expected_orders(ids) if expanded else (w for w in product(ids, repeat=3) if len(set(w)) == 3))
    plans = [candidate(problem, w) for w in orders]
    scenarios = [scenario_member(problem, s) for s in problem["scenario_set"]["members"]]
    cells = [cell(problem, p, s) for s in scenarios for p in plans]
    cells.sort(key=lambda c: c["cell_id"])
    manifest = {"schema_version": version(problem, "manifest"), "problem_id": digest(problem),
                "search_space_id": search_identity(problem), "scenario_space_id": scenario_space_identity(problem),
                "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"]),
                "observation_definition_id": digest(problem["observation"]),
                "candidates": plans, "scenarios": scenarios, "cells": cells}
    if expanded:
        manifest["search_size"] = search_size(problem)
    if selection.enabled(problem):
        require(len(plans) == manifest["search_size"]["candidates"] and
                len(cells) == manifest["search_size"]["cells"], "Manifest count mismatch")
        manifest["selection_definition"] = selection.definition(problem)
        manifest["selection_definition_id"] = digest(manifest["selection_definition"])
    return manifest, {"schema_version": version(problem, "pins"), "problem_id": digest(problem),
                      "manifest_id": digest(manifest)}


def verify_frozen(problem, manifest, pins):
    expected, expected_pins = freeze(problem)
    equal(pins, expected_pins, "Trusted problem/manifest identity mismatch")
    equal(manifest, expected, "Manifest differs from declared candidate x scenario population")


def generate(problem):
    if selection.enabled(problem):
        validate_problem(problem)
        return [cell(problem, candidate(problem, order), scenario_member(problem, s))
                for order in selection.generated_orders(problem)
                for s in problem["scenario_set"]["members"]]
    ids = problem["search"]["decision_ids"]
    if problem["schema_version"] in ("ce3-scenario-problem/2", "ce3-scenario-problem/3"):
        validate_problem(problem)  # size gate also protects direct generator calls
        ids = sorted(ids)
    return [cell(problem, candidate(problem, order), scenario_member(problem, s))
            for order in permutations(ids)
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
