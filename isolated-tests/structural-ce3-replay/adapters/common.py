"""Translate the shared legacy data shapes without adding operational rules."""
from copy import deepcopy

from core.schema import (MODEL_VERSION, SCRIPT_VERSION, RUN_VERSION, PROFILE,
                         obj, need, text, integer, sequence, mapping, validate)


def translate(model, script, outcomes, metadata, sources, factory=False):
    obj(model, ("provenance", "clock", "domains", "initial", "initial_events", "decisions", "events",
                "reference_event_order"), "$legacy/model", optional=("name",))
    obj(metadata, ("budget_field", "time_basis", "deadlines", "external_roles"), "$adapter")
    account = metadata["budget_field"]
    text(account, "$adapter/budget_field")
    obj(model["clock"], ("start", "horizon", "step"), "$legacy/clock",
        optional=("events_before_decisions", "horizon_inclusive", "maximum_scheduled_due"))
    clock = deepcopy(model["clock"])
    ceiling = clock.pop("maximum_scheduled_due", None)
    clock.update(unit="week")
    clock.setdefault("events_before_decisions", True)
    clock.setdefault("horizon_inclusive", True)

    def guards(value):
        sequence(value, "$legacy/requires")
        result = []
        for item in value:
            sequence(item, "$legacy/requires/item")
            need(len(item) == 3, "$legacy/requires/item", "Three operands required")
            result.append(dict(field=item[0], op=item[1], value=item[2]))
        return result

    def effects(value):
        obj(value, ("set",), "$legacy/effect", optional=("add",))
        return {"set": deepcopy(value["set"]), "add": deepcopy(value.get("add", {}))}

    decisions = {}
    mapping(model["decisions"], "$legacy/decisions")
    for name, rule in model["decisions"].items():
        obj(rule, ("cost", "requires", "set", "source"), "$legacy/decisions/" + name,
            optional=("label", "schedule", "add"))
        integer(rule["cost"], "$legacy/cost")
        translated_guards = guards(rule["requires"])
        funding = [g for g in translated_guards if g["field"] == account]
        # The old budget guard is redundant data, not a new inferred guard.
        target = {"field": account, "op": "ge", "value": rule["cost"]}
        need((len(funding) == 1 and funding[0] == target and type(funding[0]["value"]) is int)
             or (not funding and rule["cost"] == 0), "$legacy/decisions/" + name,
             "Cost and explicit legacy budget guard disagree")
        schedule = rule.get("schedule")
        if schedule is not None:
            obj(schedule, ("id", "delay"), "$legacy/schedule")
            schedule = {"event": schedule["id"], "delay": schedule["delay"]}
        change = {key: rule[key] for key in ("set", "add") if key in rule}
        decisions[name] = {"cost": rule["cost"], "requires": [g for g in translated_guards if g["field"] != account],
                           "effects": effects(change), "schedule": schedule, "source": rule["source"]}
    if ceiling is not None:
        integer(ceiling, "$legacy/clock/maximum_scheduled_due")
        need(ceiling == clock["horizon"] + max((r["schedule"]["delay"] for r in decisions.values()
                                               if r["schedule"] is not None), default=0),
             "$legacy/clock/maximum_scheduled_due", "Legacy ceiling contradicts model delays")
    events = {}
    mapping(model["events"], "$legacy/events")
    mapping(metadata["external_roles"], "$adapter/external_roles")
    for name, rule in model["events"].items():
        obj(rule, ("requires", "outcomes", "source"), "$legacy/events/" + name)
        mapping(rule["outcomes"], "$legacy/events/" + name + "/outcomes")
    external_ids = {name for name, rule in model["events"].items() if len(rule["outcomes"]) > 1}
    need(set(metadata["external_roles"]) == external_ids, "$adapter/external_roles", "Explicit roles must cover every external event")
    for name, rule in model["events"].items():
        obj(rule, ("requires", "outcomes", "source"), "$legacy/events/" + name)
        events[name] = {"requires": guards(rule["requires"]), "kind": "external" if name in external_ids else "timer",
                        "outcomes": {label: effects(effect) for label, effect in rule["outcomes"].items()},
                        "absent": deepcopy(metadata["external_roles"].get(name)), "source": rule["source"]}
    initial = []
    sequence(model["initial_events"], "$legacy/initial_events")
    for item in model["initial_events"]:
        obj(item, ("id", "due", "origin", "scheduled_at"), "$legacy/initial_events")
        need(item["origin"] == "initial", "$legacy/initial_events", "Unexpected legacy initial origin")
        initial.append({k: item[k] for k in ("id", "due", "scheduled_at")})
    if factory:
        obj(script, ("name", "source", "decisions_by_week", "external_outcomes", "otherwise"), "$legacy/script")
    else:
        obj(script, ("source", "decisions_by_week"), "$legacy/script")
    steps = {}
    mapping(script["decisions_by_week"], "$legacy/script/decisions_by_week")
    for step, entries in script["decisions_by_week"].items():
        sequence(entries, "$legacy/script/" + step)
        converted = []
        for entry in entries:
            if factory:
                text(entry, "$legacy/script/entry")
                converted.append({"decision": entry, "mode": "attempt"})
            else:
                obj(entry, ("id", "only_if_not_taken"), "$legacy/script/entry")
                need(type(entry["only_if_not_taken"]) is bool, "$legacy/script/entry", "Skip flag must be boolean")
                converted.append({"decision": entry["id"], "mode": "if_not_taken" if entry["only_if_not_taken"] else "attempt"})
        steps[step] = converted
    normalized = {"schema_version": RUN_VERSION, "profile": PROFILE, "sources": sources,
                  "model": {"schema_version": MODEL_VERSION, "source": model["provenance"], "clock": clock,
                            "domains": deepcopy(model["domains"]), "initial": deepcopy(model["initial"]),
                            "budget": {"field": account}, "initial_events": initial,
                            "reference_event_order": deepcopy(model["reference_event_order"]),
                            "decisions": decisions, "events": events,
                            "metadata": {"assumption": model["provenance"], "time_basis": metadata["time_basis"],
                                         "deadlines": deepcopy(metadata["deadlines"])}},
                  "script": {"schema_version": SCRIPT_VERSION, "source": script["source"], "steps": steps},
                  "outcomes": deepcopy(outcomes)}
    return validate(normalized)
