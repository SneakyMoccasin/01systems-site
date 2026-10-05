"""Fixed T1 scripts, no strategy search or observation/expected-value logic."""
from copy import deepcopy
from itertools import permutations


def failures(snapshot, rule, decision_id=None):
    result = []
    if decision_id in snapshot["taken"]:
        result.append({"field": "once_only", "actual": decision_id})
    for field, op, value in rule["requires"]:
        actual = snapshot["state"][field]
        if op not in ("eq", "ge"):
            raise ValueError("Unsupported guard operator")
        if not (actual == value if op == "eq" else actual >= value):
            result.append({"field": field, "operator": op,
                           "required": value, "actual": actual})
    return result


def record(path, kind, action, source, mutate=None, **details):
    before = deepcopy(path["snapshot"])
    if mutate is not None:
        mutate(path["snapshot"])
    path["history"].append({"index": len(path["history"]), "week": before["week"],
                            "kind": kind, "action": action, "source": source,
                            "before": before, "after": deepcopy(path["snapshot"]),
                            **details})


def attempt(path, entry, model):
    name = entry["id"]
    rule = model["decisions"][name]
    if entry["only_if_not_taken"] and name in path["snapshot"]["taken"]:
        record(path, "script_skip", name, "Förlopp B vecka 20: endast om ej genomfört",
               reason="already_taken")
        return
    errors = failures(path["snapshot"], rule, name)
    if errors:
        record(path, "rejected_attempt", name, rule["source"], failures=errors)
        return

    def change(snapshot):
        snapshot["state"]["budget"] -= rule["cost"]
        snapshot["state"].update(rule["set"])
        snapshot["taken"].append(name)
        if "schedule" in rule:
            schedule = rule["schedule"]
            if type(schedule["delay"]) is not int or schedule["delay"] <= 0:
                raise ValueError("Nonpositive/noninteger delay")
            snapshot["pending"].append({"id": schedule["id"], "origin": name,
                                        "scheduled_at": snapshot["week"],
                                        "due": snapshot["week"] + schedule["delay"]})

    record(path, "decision", name, rule["source"], change)


def apply_event(path, item, model, external):
    rule = model["events"][item["id"]]
    errors = failures(path["snapshot"], rule)
    outcome = None
    if not errors:
        outcome = next(iter(rule["outcomes"])) if len(rule["outcomes"]) == 1 else external[item["id"]]
        if outcome not in rule["outcomes"]:
            raise ValueError("Undeclared outcome")

    def change(snapshot):
        snapshot["pending"].remove(item)
        if not errors:
            snapshot["state"].update(rule["outcomes"][outcome]["set"])

    record(path, "event_skipped" if errors else "event", item["id"], rule["source"],
           change, scheduled=deepcopy(item), outcome=outcome, failures=errors)


def replay(model, script, external):
    start, horizon = model["clock"]["start"], model["clock"]["horizon"]
    if model["clock"]["step"] != 1:
        raise ValueError("Only single integer steps are supported")
    if any(not start <= int(w) <= horizon for w in script["decisions_by_week"]):
        raise ValueError("Script outside horizon")
    snapshot = {"week": start, "state": deepcopy(model["initial"]),
                "taken": [], "pending": deepcopy(model["initial_events"])}
    paths = [{"snapshot": snapshot, "history": []}]
    record(paths[0], "initial", "INITIAL", "T1 startläge; v1 State")
    rank = {name: i for i, name in enumerate(model["reference_event_order"])}
    for week in range(start, horizon + 1):
        expanded = []
        for previous in paths:
            due = sorted((item for item in previous["snapshot"]["pending"] if item["due"] == week),
                         key=lambda item: rank[item["id"]])
            for order in permutations(due):
                path = deepcopy(previous)
                record(path, "week_begin", "WEEK_BEGIN", "v1 Tid")
                for item in order:
                    apply_event(path, item, model, external)
                record(path, "decision_point", "AFTER_EVENTS", "v1 event före beslut")
                for entry in script["decisions_by_week"].get(str(week), []):
                    attempt(path, entry, model)
                record(path, "week_end", "WEEK_END", "v1 Tid")
                if week < horizon:
                    record(path, "advance", "ADVANCE", "v1 ADVANCE",
                           lambda s: s.update(week=week + 1))
                expanded.append(path)
        paths = expanded
    return paths
