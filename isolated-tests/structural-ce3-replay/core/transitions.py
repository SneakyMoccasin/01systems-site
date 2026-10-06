"""Pure atomic transitions: validate the entire copy before publishing a row."""
from copy import deepcopy

from .expressions import apply_effect, check_state, failures
from .schema import PROFILE


def decision_failures(model, snapshot, name):
    rule = model["decisions"][name]
    errors = []
    if name in snapshot["taken"]:
        errors.append({"field": "once_only", "actual": name})
    errors.extend(failures(snapshot["state"], rule["requires"]))
    if model["budget"] is not None:
        field = model["budget"]["field"]
        if snapshot["state"][field] < rule["cost"]:
            item = {"field": field, "operator": "ge", "required": rule["cost"],
                    "actual": snapshot["state"][field]}
            if item not in errors:
                errors.append(item)
    return errors


def available(model, snapshot):
    if snapshot["phase"] != "decisions" or any(e["due"] <= snapshot["step"] for e in snapshot["pending"]):
        raise ValueError("Availability requires a decision phase with no due events")
    return [name for name in sorted(model["decisions"]) if not decision_failures(model, snapshot, name)]


def row(before, after, kind, action, source, *, outcome=None, errors=None,
        scheduled=None, position=None):
    return {"step": before["step"], "kind": kind, "action": action,
            "source": source, "before": deepcopy(before), "after": deepcopy(after),
            "outcome": outcome, "failures": errors or [], "scheduled": deepcopy(scheduled),
            "script_position": position}


def marker(snapshot, kind):
    after = deepcopy(snapshot)
    phases = {"step_begin": "events", "decision_point": "decisions",
              "step_end": "ended", "advance": "advanced"}
    if kind in phases:
        after["phase"] = phases[kind]
    if kind == "advance":
        after["step"] += 1
    return row(snapshot, after, kind, kind, PROFILE)


def attempt(model, snapshot, entry, position):
    # Enforce the phase even when a script entry will be skipped.
    available(model, snapshot)
    name = entry["decision"]
    rule = model["decisions"][name]
    if entry["mode"] == "if_not_taken" and name in snapshot["taken"]:
        return row(snapshot, snapshot, "script_skip", name, rule["source"], position=position)
    errors = decision_failures(model, snapshot, name)
    if errors:
        return row(snapshot, snapshot, "attempt_blocked", name, rule["source"], errors=errors, position=position)
    after = deepcopy(snapshot)
    if model["budget"] is not None:
        after["state"][model["budget"]["field"]] -= rule["cost"]
    apply_effect(after["state"], rule["effects"])
    after["taken"].append(name)
    scheduled = None
    if rule["schedule"] is not None:
        scheduled = {"id": rule["schedule"]["event"], "due": snapshot["step"] + rule["schedule"]["delay"],
                     "scheduled_at": snapshot["step"], "origin": {"kind": "decision", "id": name}}
        after["pending"].append(scheduled)
    check_state(after["state"], model["domains"])
    return row(snapshot, after, "decision_executed", name, rule["source"], scheduled=scheduled, position=position)


def event(model, snapshot, item, external):
    if snapshot["phase"] != "events" or item not in snapshot["pending"] or item["due"] != snapshot["step"]:
        raise ValueError("Event outside its due phase")
    rule = model["events"][item["id"]]
    errors = failures(snapshot["state"], rule["requires"])
    after = deepcopy(snapshot)
    after["pending"].remove(item)
    outcome = None
    if not errors:
        outcome = next(iter(rule["outcomes"])) if rule["kind"] == "timer" else external[item["id"]]
        apply_effect(after["state"], rule["outcomes"][outcome])
    check_state(after["state"], model["domains"])
    return row(snapshot, after, "event_inapplicable" if errors else "event_applied", item["id"],
               rule["source"], outcome=outcome, errors=errors, scheduled=item)
