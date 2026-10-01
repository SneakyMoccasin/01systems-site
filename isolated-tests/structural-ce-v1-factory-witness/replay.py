"""Finite, fixed-script replay only. No search over management choices or goals."""
from copy import deepcopy
from itertools import permutations


def failed_conditions(state, conditions):
    failures = []
    for key, op, value in conditions:
        if op not in ("eq", "ge"):
            raise ValueError("Unsupported condition: " + op)
        valid = state[key] == value if op == "eq" else state[key] >= value
        if not valid:
            failures.append([key, op, value, state[key]])
    return failures


def record(path, kind, action, mutate=None, **details):
    before = deepcopy(path["snapshot"])
    if mutate:
        mutate(path["snapshot"])
    path["history"].append({
        "index": len(path["history"]), "week": before["week"],
        "kind": kind, "action": action, "before": before,
        "after": deepcopy(path["snapshot"]), **details,
    })


def apply_effect(state, effect):
    state.update(effect.get("set", {}))
    for key, amount in effect.get("add", {}).items():
        state[key] += amount


def decision(path, decision_id, model):
    rule = model["decisions"][decision_id]
    snapshot = path["snapshot"]
    failed = failed_conditions(snapshot["state"], rule["requires"])
    if decision_id in snapshot["taken"]:
        failed.append(["once_only", decision_id])
    if failed:
        # Diagnostic attempt, NOT an executed CE decision or valid witness step.
        record(path, "rejected_attempt", decision_id, failures=failed,
               source=rule["source"])
        return

    def mutate(snap):
        snap["state"]["budget"] -= rule["cost"]
        apply_effect(snap["state"], rule)
        snap["taken"].append(decision_id)
        if "schedule" in rule:
            schedule = rule["schedule"]
            if type(schedule["delay"]) is not int or schedule["delay"] <= 0:
                raise ValueError("A delay must be a positive integer")
            snap["pending"].append({
                "id": schedule["id"], "due": snap["week"] + schedule["delay"],
                "origin": decision_id, "scheduled_at": snap["week"],
            })

    record(path, "decision", decision_id, mutate, source=rule["source"])


def event(path, item, model, external_outcomes):
    rule = model["events"][item["id"]]
    failed = failed_conditions(path["snapshot"]["state"], rule["requires"])
    outcome = None
    if not failed:
        outcome = (next(iter(rule["outcomes"])) if len(rule["outcomes"]) == 1
                   else external_outcomes[item["id"]])
        if outcome not in rule["outcomes"]:
            raise ValueError("Undeclared external outcome")

    def mutate(snap):
        snap["pending"].remove(item)
        if not failed:
            apply_effect(snap["state"], rule["outcomes"][outcome])

    record(path, "event_skipped" if failed else "event", item["id"], mutate,
           scheduled=deepcopy(item), outcome=outcome, failures=failed,
           source=rule["source"])


def replay(model, script):
    """Enumerate EVERY due-event permutation at EVERY week; never merge traces."""
    start, horizon = model["clock"]["start"], model["clock"]["horizon"]
    if start != 0 or horizon != 26 or model["clock"]["step"] != 1:
        raise ValueError("This witness checker is fixed to weeks 0..26")
    if any(not 0 <= int(w) <= horizon for w in script["decisions_by_week"]):
        raise ValueError("Decision outside the horizon")
    initial = {"week": start, "state": deepcopy(model["initial"]),
               "taken": [], "pending": deepcopy(model["initial_events"])}
    paths = [{"snapshot": initial, "history": [], "event_orders": []}]
    record(paths[0], "initial", "INITIAL", source="Berättelsens startläge; v1")
    rank = {name: i for i, name in enumerate(model["reference_event_order"])}
    for week in range(start, horizon + 1):
        next_paths = []
        for old_path in paths:
            due = sorted((e for e in old_path["snapshot"]["pending"]
                          if e["due"] == week), key=lambda e: rank[e["id"]])
            for ordering in permutations(due):
                path = deepcopy(old_path)
                record(path, "week_begin", "WEEK_BEGIN", source="v1 Tid")
                if len(due) > 1:
                    path["event_orders"].append({"week": week,
                                                  "order": [e["id"] for e in ordering]})
                for item in ordering:
                    event(path, item, model, script["external_outcomes"])
                for decision_id in script["decisions_by_week"].get(str(week), []):
                    decision(path, decision_id, model)
                record(path, "week_end", "WEEK_END", source="v1 Tid")
                if week < horizon:
                    record(path, "advance", "ADVANCE",
                           lambda s: s.update(week=week + 1), source="v1 ADVANCE")
                next_paths.append(path)
        paths = next_paths
    return paths
