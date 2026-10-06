"""Runtime predicates and deterministic effects. Never imported by the auditor."""
from .schema import in_domain


class ModelError(ValueError):
    pass


def failures(state, requirements):
    result = []
    for item in requirements:
        value, target = state[item["field"]], item["value"]
        valid = (type(value) is type(target) and value == target) if item["op"] == "eq" else value >= target
        if not valid:
            result.append({"field": item["field"], "operator": item["op"],
                           "required": target, "actual": value})
    return result


def apply_effect(state, effect):
    state.update(effect["set"])
    for field, amount in effect["add"].items():
        state[field] += amount


def check_state(state, domains):
    if set(state) != set(domains):
        raise ModelError("State fields changed")
    for field, domain in domains.items():
        if not in_domain(state[field], domain):
            raise ModelError("Value outside domain: " + field)
