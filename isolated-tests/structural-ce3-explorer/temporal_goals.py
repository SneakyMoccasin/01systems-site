"""Typed state predicates over already audited snapshots; no execution rules."""
from copy import deepcopy

from bridge import encode, equal, in_domain, obj, require

VERSION = "ce3-history-goal/1"
SAMPLING = "each_row.before_after.snapshot_step/1"


def validate_goal(definition, model):
    obj(definition, ("schema_version", "goal_id", "sampling", "quantifier",
                     "all_attempts_accepted", "all"), "history goal")
    equal(definition["schema_version"], VERSION, "Unsupported history goal version")
    require(type(definition["goal_id"]) is str and bool(definition["goal_id"].strip()), "Goal ID required")
    equal(definition["sampling"], SAMPLING, "Unsupported history sampling")
    equal(definition["quantifier"], "all_event_paths", "Unsupported goal quantifier")
    equal(definition["all_attempts_accepted"], True, "Accepted-attempts condition required")
    components = definition["all"]
    require(type(components) is list and bool(components), "Nonempty goal conjunction required")
    seen = set()
    for component in components:
        require(type(component) is dict, "Goal component must be an object")
        operator = component.get("operator")
        require(operator in ("terminal", "always", "reach_by"), "Unsupported goal operator")
        time_field = {"terminal": None, "always": "through", "reach_by": "deadline"}[operator]
        obj(component, ("id", "operator", "equals") + ((time_field,) if time_field else ()), "goal component")
        key = component["id"]
        require(type(key) is str and bool(key.strip()) and key not in seen, "Unique component ID required")
        seen.add(key)
        values = component["equals"]
        require(type(values) is dict and bool(values), "Nonempty typed predicate required")
        for field, value in values.items():
            require(field in model["domains"] and in_domain(value, model["domains"][field]),
                    "Invalid typed goal field/value")
        if time_field:
            time = component[time_field]
            require(type(time) is int and model["clock"]["start"] <= time <= model["clock"]["horizon"],
                    "Goal time must be an integer within analysis period")


def point(row, side):
    # advance.after is at row.step + 1; the snapshot is the time authority.
    return {"row_index": row["index"], "side": side, "step": row[side]["step"]}


def matches(state, values):
    return all(encode(state[field]) == encode(value) for field, value in values.items())


def components_for_path(definition, rows, clock):
    """Caller must certify the entire bundle before entering this projection."""
    results = []
    for component in definition["all"]:
        operator = component["operator"]
        end = (clock["horizon"] if operator == "terminal" else
               component["through" if operator == "always" else "deadline"])
        samples = ([(rows[-1], "after")] if operator == "terminal" else
                   [(row, side) for row in rows for side in ("before", "after")
                    if clock["start"] <= row[side]["step"] <= end])
        require(bool(samples), "Empty audited observation interval")
        checks = [matches(row[side]["state"], component["equals"]) for row, side in samples]
        satisfied = any(checks) if operator == "reach_by" else all(checks)
        evidence = {"interval": [end if operator == "terminal" else clock["start"], end],
                    "inclusive": True, "points": [point(row, side) for row, side in samples]}
        # Existential success and universal failure have concrete point evidence.
        witness_value = True if operator == "reach_by" else False
        if witness_value in checks:
            row, side = samples[checks.index(witness_value)]
            evidence["witness" if witness_value else "counterexample"] = dict(
                point(row, side), state=deepcopy(row[side]["state"]))
        if operator == "terminal":
            evidence["terminal_state"] = deepcopy(rows[-1]["after"]["state"])
        results.append({"id": component["id"], "operator": operator,
                        "predicate": deepcopy(component["equals"]), "satisfied": satisfied,
                        "evidence": evidence})
    return results
