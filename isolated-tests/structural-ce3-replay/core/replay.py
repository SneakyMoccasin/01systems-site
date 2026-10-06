"""Enumerates every simultaneous event order for a single fixed script."""
from copy import deepcopy
from itertools import permutations
from math import factorial

from .schema import HISTORY_VERSION, PROFILE, validate
from .history import digest
from .expressions import ModelError
from .transitions import attempt, event, marker

DEFAULT_LIMITS = {"max_paths": 10000, "max_rows": 1000000, "max_steps": 10000}


class ResourceLimit(Exception):
    pass


def replay(run, limits=None):
    run = validate(run)
    limits = deepcopy(DEFAULT_LIMITS if limits is None else limits)
    if set(limits) != set(DEFAULT_LIMITS) or any(type(x) is not int or x < 1 for x in limits.values()):
        raise ValueError("Limits require positive integer max_paths/max_rows/max_steps")
    model, script = run["model"], run["script"]
    clock = model["clock"]
    initial = {"step": clock["start"], "phase": "initial", "state": deepcopy(model["initial"]),
               "taken": [], "pending": [dict(e, origin={"kind": "initial", "id": e["id"]})
                                         for e in model["initial_events"]]}
    bundle = {"schema_version": HISTORY_VERSION, "profile": PROFILE, "input": run,
              "input_sha256": digest(run), "limits": limits, "status": "COMPLETE", "error": None,
              "paths": [], "work_rows": 0}
    path = {"snapshot": initial, "history": [], "event_orders": []}

    def publish(target, transition):
        if bundle["work_rows"] >= limits["max_rows"]:
            raise ResourceLimit("max_rows")
        transition["index"] = len(target["history"])
        target["history"].append(transition)
        target["snapshot"] = deepcopy(transition["after"])
        bundle["work_rows"] += 1

    try:
        if clock["horizon"] - clock["start"] + 1 > limits["max_steps"]:
            raise ResourceLimit("max_steps")
        publish(path, marker(initial, "initial"))
        paths = [path]
        rank = {name: i for i, name in enumerate(model["reference_event_order"])}
        for step in range(clock["start"], clock["horizon"] + 1):
            due_sets = [sorted((e for e in p["snapshot"]["pending"] if e["due"] == step),
                               key=lambda e: rank[e["id"]]) for p in paths]
            if sum(factorial(len(due)) for due in due_sets) > limits["max_paths"]:
                raise ResourceLimit("max_paths")
            expanded = []
            for previous, due in zip(paths, due_sets):
                for order in permutations(due):
                    path = deepcopy(previous)
                    publish(path, marker(path["snapshot"], "step_begin"))
                    # All steps are included; coverage is not inferred from a count alone.
                    path["event_orders"].append({"step": step, "order": [e["id"] for e in order]})
                    for item in order:
                        publish(path, event(model, path["snapshot"], item, run["outcomes"]))
                    publish(path, marker(path["snapshot"], "decision_point"))
                    for position, entry in enumerate(script["steps"].get(str(step), [])):
                        publish(path, attempt(model, path["snapshot"], entry, position))
                    publish(path, marker(path["snapshot"], "step_end"))
                    if step < clock["horizon"]:
                        publish(path, marker(path["snapshot"], "advance"))
                    expanded.append(path)
            paths = expanded
        for path in paths:
            used = {r["action"] for r in path["history"] if r["kind"] == "event_applied"
                    and r["action"] in run["outcomes"]}
            path["unused_outcomes"] = sorted(set(run["outcomes"]) - used)
            path["all_attempts_accepted"] = not any(r["kind"] == "attempt_blocked" for r in path["history"])
        bundle["paths"] = paths
    except (ResourceLimit, ModelError) as error:
        # Incomplete/error documents never advertise a partial set as complete.
        bundle["status"] = "INCOMPLETE" if isinstance(error, ResourceLimit) else "ERROR"
        bundle["error"] = {"type": type(error).__name__, "message": str(error),
                           "last_snapshot": deepcopy(path["snapshot"]),
                           "last_history": deepcopy(path["history"])}
    return bundle
