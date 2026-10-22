"""Bounded syntactic selection. No guards, effects or execution semantics."""
from copy import deepcopy
from itertools import permutations, product
from math import factorial

from bridge import digest, equal, obj, require
from fixed_slots import expected_orders as factorial_orders, MAX_CANDIDATES, MAX_CELLS
from temporal_goals import validate_goal as validate_history_goal, VERSION as HISTORY_GOAL

PROBLEM = "ce3-scenario-problem/4"
GOAL = "ce3-history-goal/2"
SCRIPT_SOURCE = "CE3 selected fixed plan: one attempt per selected decision, prefix slots."


def enabled(problem):
    return problem["schema_version"] == PROBLEM


def ids_list(value, label):
    require(type(value) is list and all(type(x) is str and bool(x.strip()) for x in value),
            label + " must be a list of nonblank IDs")
    require(len(value) == len(set(value)), label + " must be unique")


def validate_search(problem):
    s = problem["search"]
    obj(s, ("kind", "required_decision_ids", "optional_decision_ids", "choice_groups", "slots",
            "slot_policy", "allow_empty", "mode", "retry", "early_stop"), "search")
    equal(s["kind"], "selected_permutations_once/1", "Unsupported selection grammar")
    equal(s["slot_policy"], "prefix/1", "Unsupported slot policy")
    equal(s["mode"], "attempt", "Only attempt supported")
    equal(s["retry"], False, "Retry unsupported")
    equal(s["early_stop"], False, "Early stop unsupported")
    require(type(s["allow_empty"]) is bool, "allow_empty must be boolean")
    decisions = problem["model"]["decisions"]
    require(type(decisions) is dict and 1 <= len(decisions) <= 6,
            "Unsupported search size: requires 1..6 model decisions")
    required, optional = s["required_decision_ids"], s["optional_decision_ids"]
    ids_list(required, "Required decisions")
    ids_list(optional, "Optional decisions")
    require(not set(required) & set(optional) and set(required) | set(optional) == set(decisions),
            "Required/optional partition must cover exactly all model decisions")
    require(type(s["choice_groups"]) is list, "choice_groups must be an array")
    grouped, names = set(), set()
    for group in s["choice_groups"]:
        obj(group, ("id", "kind", "members"), "choice group")
        name = group["id"]
        require(type(name) is str and bool(name.strip()) and name not in names, "Unique group ID required")
        names.add(name)
        require(group["kind"] in ("exactly_one", "at_most_one"), "Unsupported choice group")
        ids_list(group["members"], "Group members")
        members = set(group["members"])
        require(len(members) >= 2 and members <= set(optional) and not members & grouped,
                "Groups must be disjoint optional sets of at least two decisions")
        grouped.update(members)
    maximum = len(required) + len(set(optional) - grouped) + len(s["choice_groups"])
    slots, clock = s["slots"], problem["model"]["clock"]
    require(type(slots) is list and len(slots) == maximum, "Exactly Kmax slots required")
    require(all(type(t) is int for t in slots), "Slots must be integers")
    require(type(clock["start"]) is int and type(clock["horizon"]) is int and
            clock["start"] <= clock["horizon"], "Invalid integer clock bounds")
    require(all(a < b for a, b in zip(slots, slots[1:])) and
            all(clock["start"] <= t <= clock["horizon"] for t in slots), "Invalid prefix slot times")
    return maximum


def search_size(problem):
    """Polynomial coefficient count, before enumerating or building any input."""
    maximum = validate_search(problem)
    s = problem["search"]
    grouped = {d for g in s["choice_groups"] for d in g["members"]}
    free = len(set(s["optional_decision_ids"]) - grouped)
    coefficients = [0] * len(s["required_decision_ids"]) + [1]
    factors = [(1, 1)] * free + [
        (0 if g["kind"] == "exactly_one" else 1, len(g["members"])) for g in s["choice_groups"]]
    for constant, linear in factors:
        updated = [0] * (len(coefficients) + 1)
        for k, count in enumerate(coefficients):
            updated[k] += constant * count
            updated[k + 1] += linear * count
        coefficients = updated
    if not s["allow_empty"]:
        coefficients[0] = 0
    count = sum(c * factorial(k) for k, c in enumerate(coefficients))
    require(0 < count <= MAX_CANDIDATES, "Unsupported search size: selected population exceeds 720 candidates")
    scenarios = problem["scenario_set"]["members"] if "scenario_set" in problem else [None]
    require(type(scenarios) is list and bool(scenarios), "Nonempty scenario set required")
    require(len(scenarios) <= MAX_CELLS // count, "Unsupported search size: exceeds 2160 cells")
    return {"decisions": len(problem["model"]["decisions"]), "max_selected": maximum,
            "subsets_by_length": coefficients, "candidates": count, "scenarios": len(scenarios),
            "cells": count * len(scenarios), "max_candidates": MAX_CANDIDATES, "max_cells": MAX_CELLS}


def canonical_search(problem):
    s = deepcopy(problem["search"])
    for field in ("required_decision_ids", "optional_decision_ids"):
        s[field].sort()
    for group in s["choice_groups"]:
        group["members"].sort()
    s["choice_groups"].sort(key=lambda g: g["id"])
    return s


def definition(problem):
    s = canonical_search(problem)
    return dict(schema_version="ce3-selection-definition/1",
                **{k: s[k] for k in ("required_decision_ids", "optional_decision_ids", "choice_groups", "allow_empty")})


def search_identity(problem):
    return digest({"schema_version": "ce3-scenario-search-space/3", "model_id": digest(problem["model"]),
                   "source_set_id": digest(problem["sources"]), "grammar": canonical_search(problem),
                   "script_source": SCRIPT_SOURCE})


def validate_order(problem, order):
    search_size(problem)
    require(type(order) in (list, tuple), "Order must be a list or tuple")
    ids_list(list(order), "Selected order")
    chosen, s = set(order), problem["search"]
    require(set(s["required_decision_ids"]) <= chosen <= set(problem["model"]["decisions"]),
            "Selected order omits required or contains unknown decisions")
    require(bool(order) or s["allow_empty"], "Empty candidate forbidden")
    for g in s["choice_groups"]:
        count = len(chosen & set(g["members"]))
        require(count == 1 if g["kind"] == "exactly_one" else count <= 1, "Selected order violates choice group")
    require(len(order) <= len(s["slots"]), "Order exceeds prefix slots")


def script(problem, order):
    validate_order(problem, order)
    return {"schema_version": "ce3-script/1", "source": SCRIPT_SOURCE,
            "steps": {str(t): [{"decision": d, "mode": "attempt"}]
                      for t, d in zip(problem["search"]["slots"], order)}}


def candidate(problem, order):
    value = script(problem, order)
    plan_id = digest({"kind": "ce3-plan/1", "script": value})
    return {"candidate_id": digest({"schema_version": "ce3-scenario-candidate/3",
                                   "search_space_id": search_identity(problem), "plan_id": plan_id}),
            "plan_id": plan_id, "order": list(order), "script": value,
            "selected_ids": sorted(order), "omitted_ids": sorted(set(problem["model"]["decisions"]) - set(order)),
            "selection_definition_id": digest(definition(problem))}


def generated_orders(problem):
    """Production: product of independent choices, then permutations."""
    size = search_size(problem)
    s = canonical_search(problem)
    grouped = {d for g in s["choice_groups"] for d in g["members"]}
    choices = [[(), (d,)] for d in s["optional_decision_ids"] if d not in grouped]
    choices += [([()] if g["kind"] == "at_most_one" else []) + [(d,) for d in g["members"]]
                for g in s["choice_groups"]]
    orders = []
    for parts in product(*choices):
        chosen = sorted(s["required_decision_ids"] + [d for part in parts for d in part])
        if chosen or s["allow_empty"]:
            orders.extend(permutations(chosen))
    require(len(orders) == size["candidates"] and len(set(orders)) == len(orders), "Generated count mismatch")
    return sorted(orders, key=lambda w: (len(w), w))


def expected_orders(problem):
    """Independent oracle: bounded bitmasks, direct cardinalities, factorial ranks.

    Does not call production choice construction, permutations or validate_order.
    """
    size = search_size(problem)
    ids, s = sorted(problem["model"]["decisions"]), problem["search"]
    orders = []
    for mask in range(1 << len(ids)):
        chosen = {d for i, d in enumerate(ids) if mask & (1 << i)}
        if not set(s["required_decision_ids"]) <= chosen or (not chosen and not s["allow_empty"]):
            continue
        counts = [(g["kind"], sum(d in chosen for d in g["members"])) for g in s["choice_groups"]]
        if any(n != 1 if kind == "exactly_one" else n > 1 for kind, n in counts):
            continue
        orders.extend(factorial_orders(chosen))
    require(len(orders) == size["candidates"] and len(set(orders)) == len(orders), "Expected count mismatch")
    return sorted(orders, key=lambda w: (len(w), w))


def validate_goal(goal, model):
    obj(goal, ("schema_version", "goal_id", "sampling", "quantifier", "all_attempts_accepted", "all",
               "acceptance_scope"), "selected history goal")
    equal(goal["schema_version"], GOAL, "Unsupported selected goal version")
    equal(goal["acceptance_scope"], "candidate_script", "Unsupported acceptance scope")
    # Reuse the exact temporal language, without altering the problem or its decisions.
    temporal = {k: deepcopy(v) for k, v in goal.items() if k != "acceptance_scope"}
    temporal["schema_version"] = HISTORY_GOAL
    validate_history_goal(temporal, model)


def script_evidence(problem, value):
    """Re-derive selection from actual trusted script; never trust saved evidence."""
    search_size(problem)
    obj(value, ("schema_version", "source", "steps"), "selected script")
    require(type(value["steps"]) is dict, "Script steps must be a map")
    order = []
    for time in sorted(value["steps"], key=int):
        entries = value["steps"][time]
        require(type(entries) is list and len(entries) == 1, "One entry per selected slot required")
        obj(entries[0], ("decision", "mode"), "selected entry")
        order.append(entries[0]["decision"])
    plan = candidate(problem, order)
    equal(value, plan["script"], "Script differs from selected prefix candidate")
    selected = set(order)
    return {"selection_definition_id": plan["selection_definition_id"],
            "candidate_id": plan["candidate_id"], "plan_id": plan["plan_id"],
            "selected_ids": plan["selected_ids"], "omitted_ids": plan["omitted_ids"],
            "required_ids": sorted(problem["search"]["required_decision_ids"]),
            "groups": [{"id": g["id"], "kind": g["kind"], "selected_ids": sorted(selected & set(g["members"]))}
                       for g in canonical_search(problem)["choice_groups"]],
            "selection_satisfied": True,
            "expected_entries": [{"step": t, "script_position": 0, "decision": d, "mode": "attempt"}
                                 for t, d in zip(problem["search"]["slots"], order)]}


def accepted_attempts(evidence, rows):
    actual = [r for r in rows if r["kind"] in ("decision_executed", "attempt_blocked", "script_skip")]
    bindings = [{"step": r["step"], "script_position": r["script_position"],
                 "decision": r["action"], "mode": "attempt"} for r in actual]
    equal(bindings, evidence["expected_entries"], "Audited attempts differ from candidate entries")
    return all(r["kind"] == "decision_executed" for r in actual)
