"""Deliberately small problem/identity contract. No operational predicates."""
from copy import deepcopy
from itertools import product

from bridge import PROFILE, digest, equal, in_domain, obj, require, validate
from fixed_slots import validate_search
from temporal_goals import validate_goal

SCRIPT_SOURCE = "CE3 minimal explorer: fixed permutation, one attempt per slot; synthetic integration test."
LIMITS = {"max_paths": 10000, "max_rows": 1000000, "max_steps": 10000}


def materialize(problem, order):
    return {"schema_version": "ce3-run/1", "profile": PROFILE,
            "model": deepcopy(problem["model"]),
            "script": {"schema_version": "ce3-script/1", "source": SCRIPT_SOURCE,
                       "steps": {str(step): [{"decision": name, "mode": "attempt"}]
                                 for step, name in zip(problem["search"]["slots"], order)}},
            "outcomes": deepcopy(problem["outcomes"]), "sources": deepcopy(problem["sources"])}


def validate_problem(problem):
    validate_declaration(problem)
    equal(problem["schema_version"], "ce3-explorer-problem/1", "Unsupported problem version")
    equal(problem["outcomes"], {}, "Scenario expansion is outside this stage")
    require(all(e["kind"] == "timer" for e in problem["model"]["events"].values()),
            "Only timer events supported in this stage")
    return problem


def validate_declaration(problem, *, fixed_slots=False, history_goals=False):
    """Shared shape/grammar/goal checks, not a public version authorization.

    Callers must separately enforce their version and environment contract.
    """
    obj(problem, ("schema_version", "revision", "purpose", "profile", "model", "outcomes",
                  "sources", "search", "observation"), "problem")
    require(type(problem["revision"]) is int and problem["revision"] >= 1, "Invalid revision")
    equal(problem["purpose"], "synthetic_integration_test", "Only technical integration scope supported")
    equal(problem["profile"], PROFILE, "Unsupported profile")
    search = problem["search"]
    obj(search, ("kind", "decision_ids", "slots", "mode", "retry", "early_stop"), "search")
    ids = search["decision_ids"]
    if fixed_slots:
        validate_search(problem)
    else:
        require(type(ids) is list and len(ids) == 3 and all(type(x) is str for x in ids),
                "Exactly three decision IDs required")
        require(len(set(ids)) == 3 and ids == sorted(ids), "Decision set must be unique and canonical")
        equal(search, {"kind": "permutations_once/1", "decision_ids": ids, "slots": [0, 1, 2],
                       "mode": "attempt", "retry": False, "early_stop": False}, "Unsupported search grammar")
    # Schema validation is delegated, including every unused model rule/outcome.
    validate(materialize(problem, ids))
    equal(sorted(problem["model"]["decisions"]), sorted(ids), "Search must include all model decisions")
    clock = problem["model"]["clock"]
    if not fixed_slots:
        require(clock["start"] == 0 and clock["horizon"] == 2, "Only horizon 0..2 supported")
    observation = problem["observation"]
    if history_goals:
        validate_goal(observation, problem["model"])
        return problem
    obj(observation, ("schema_version", "goal_id", "sampling", "quantifier", "terminal_equals",
                      "all_attempts_accepted"), "observation")
    equal(observation["schema_version"], "ce3-terminal-goal/1", "Unsupported observation version")
    require(type(observation["goal_id"]) is str and bool(observation["goal_id"].strip()), "Goal ID required")
    equal(observation["sampling"], "last_row.after", "Unsupported sampling")
    equal(observation["quantifier"], "all_event_paths", "Unsupported goal quantifier")
    equal(observation["all_attempts_accepted"], True, "Accepted-attempts condition required")
    values = observation["terminal_equals"]
    require(type(values) is dict and bool(values), "Nonempty terminal goal required")
    for field, value in values.items():
        require(field in problem["model"]["domains"] and
                in_domain(value, problem["model"]["domains"][field]), "Invalid typed goal field/value")
    return problem


def search_identity(problem):
    return digest({"schema_version": "ce3-search-space/1", "model_id": digest(problem["model"]),
                   "source_set_id": digest(problem["sources"]), "outcomes": problem["outcomes"],
                   "grammar": problem["search"], "script_source": SCRIPT_SOURCE})


def member(problem, order):
    run = materialize(problem, order)
    plan_id = digest({"kind": "ce3-plan/1", "script": run["script"]})
    return {"candidate_id": digest({"schema_version": "ce3-search-candidate/1",
                                   "search_space_id": search_identity(problem), "plan_id": plan_id}),
            "order": list(order), "plan_id": plan_id, "script": run["script"],
            "input_identity": digest(run)}


def freeze(problem):
    """Independent syntactic oracle: Cartesian words filtered by all-different.

    Does not import or call the permutation generator or inspect model guards.
    """
    validate_problem(problem)
    ids = problem["search"]["decision_ids"]
    members = [member(problem, word) for word in product(ids, repeat=3) if len(set(word)) == 3]
    manifest = {"schema_version": "ce3-search-manifest/1", "problem_id": digest(problem),
                "problem_revision": problem["revision"], "search_space_id": search_identity(problem),
                "model_id": digest(problem["model"]), "source_set_id": digest(problem["sources"]),
                "observation_definition_id": digest(problem["observation"]),
                "grammar": deepcopy(problem["search"]), "members": members}
    pins = {"schema_version": "ce3-explorer-pins/1", "problem_id": digest(problem),
            "manifest_id": digest(manifest)}
    return manifest, pins


def verify_frozen(problem, manifest, trusted_pins):
    expected, pins = freeze(problem)
    equal(trusted_pins, pins, "Trusted problem/manifest identity mismatch")
    equal(manifest, expected, "Frozen manifest differs from the entire declared search space")


def check_coverage(manifest, candidates):
    """Exact membership AND content; neither six nor six IDs is sufficient."""
    expected = {m["candidate_id"]: m for m in manifest["members"]}
    seen, duplicates, unexpected, invalid = set(), [], [], []
    for candidate in candidates:
        key = candidate.get("candidate_id") if type(candidate) is dict else None
        if not isinstance(key, str):
            invalid.append("malformed_candidate")
            continue
        if key in seen:
            duplicates.append(key)
        seen.add(key)
        if key not in expected:
            unexpected.append(key)
        elif digest(candidate) != digest(expected[key]):
            invalid.append(key)
    missing = sorted(set(expected) - seen)
    status = "INVALID" if duplicates or unexpected or invalid else ("INCOMPLETE" if missing else "COMPLETE")
    return {"status": status, "expected": len(expected), "observed": len(candidates),
            "missing": missing, "duplicates": sorted(duplicates),
            "unexpected": sorted(unexpected), "invalid": sorted(invalid)}
