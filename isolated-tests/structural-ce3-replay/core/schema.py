"""Executable strict input schema for fixed-replay/0.1.

Validation visits every rule and outcome, including unused branches. No eval,
callbacks, inferred rules or branch-dependent input validation.
"""
from copy import deepcopy
import re

PROFILE = "fixed-replay/0.1"
RUN_VERSION = "ce3-run/1"
MODEL_VERSION = "ce3-model/1"
SCRIPT_VERSION = "ce3-script/1"
HISTORY_VERSION = "ce3-history/1"


class InputError(ValueError):
    def __init__(self, path, message):
        self.path, self.message = path, message
        super().__init__(f"{type(self).__name__} [{PROFILE}] {path}: {message}")


class UnsupportedFeature(InputError):
    pass


def need(condition, path, message):
    if not condition:
        raise InputError(path, message)


def obj(value, required, path, optional=()):
    need(type(value) is dict, path, "Expected object")
    unknown = set(value) - set(required) - set(optional)
    if unknown:
        raise UnsupportedFeature(path + "/" + sorted(unknown)[0], "Unknown or unsupported field")
    need(set(required) <= set(value), path, "Missing fields: " + str(sorted(set(required) - set(value))))


def text(value, path):
    need(type(value) is str and bool(value.strip()), path, "Expected nonempty string")


def integer(value, path):
    need(type(value) is int, path, "Expected integer (not boolean or float)")


def mapping(value, path):
    need(type(value) is dict, path, "Expected object")
    for key in value:
        text(key, path)


def sequence(value, path):
    need(type(value) is list, path, "Expected array")


def in_domain(value, domain):
    if "integer" in domain:
        lo, hi = domain["integer"]
        return type(value) is int and lo <= value <= hi
    return any(type(value) is type(v) and value == v for v in domain["enum"])


def validate(run):
    obj(run, ("schema_version", "profile", "model", "script", "outcomes", "sources"), "$")
    need(run["schema_version"] == RUN_VERSION, "$/schema_version", "Unsupported run version")
    if run["profile"] != PROFILE:
        raise UnsupportedFeature("$/profile", "Unsupported profile")
    mapping(run["sources"], "$/sources")
    for name, value in run["sources"].items():
        need(type(value) is str and re.fullmatch(r"[0-9a-f]{64}", value) is not None,
             "$/sources/" + name, "Expected SHA-256")
    m = run["model"]
    obj(m, ("schema_version", "source", "clock", "domains", "initial", "budget",
            "decisions", "events", "initial_events", "reference_event_order", "metadata"), "$/model")
    need(m["schema_version"] == MODEL_VERSION, "$/model/schema_version", "Unsupported model version")
    text(m["source"], "$/model/source")
    obj(m["metadata"], ("assumption", "time_basis", "deadlines"), "$/model/metadata")
    for key in ("assumption", "time_basis"):
        text(m["metadata"][key], "$/model/metadata/" + key)
    c = m["clock"]
    obj(c, ("start", "horizon", "step", "unit", "events_before_decisions", "horizon_inclusive"), "$/model/clock")
    for key in ("start", "horizon", "step"):
        integer(c[key], "$/model/clock/" + key)
    need(c["horizon"] >= c["start"], "$/model/clock", "Horizon precedes start")
    text(c["unit"], "$/model/clock/unit")
    if c["step"] != 1 or c["events_before_decisions"] is not True or c["horizon_inclusive"] is not True:
        raise UnsupportedFeature("$/model/clock", "Requires unit steps, events first, inclusive horizon")
    domains = m["domains"]
    mapping(domains, "$/model/domains")
    for field, domain in domains.items():
        p = "$/model/domains/" + field
        need(type(domain) is dict and len(domain) == 1, p, "One domain kind required")
        if "integer" in domain:
            bounds = domain["integer"]
            sequence(bounds, p)
            need(len(bounds) == 2, p, "Two bounds required")
            for bound in bounds:
                integer(bound, p)
            need(bounds[0] <= bounds[1], p, "Reversed bounds")
        elif "enum" in domain:
            values = domain["enum"]
            sequence(values, p)
            need(bool(values), p, "Empty domain")
            need(type(values[0]) in (str, bool, int), p, "Unsupported enum type")
            need(all(type(v) is type(values[0]) for v in values), p, "Mixed enum types")
            need(len(set(values)) == len(values), p, "Duplicate enum values")
        else:
            raise UnsupportedFeature(p, "Unknown domain kind")
    mapping(m["initial"], "$/model/initial")
    need(set(m["initial"]) == set(domains), "$/model/initial", "State fields differ from domains")
    for field, value in m["initial"].items():
        need(in_domain(value, domains[field]), "$/model/initial/" + field, "Value outside typed domain")
    account = None
    if m["budget"] is not None:
        obj(m["budget"], ("field",), "$/model/budget")
        account = m["budget"]["field"]
        text(account, "$/model/budget/field")
        need(account in domains and "integer" in domains[account], "$/model/budget", "Account must be bounded integer")
        need(domains[account]["integer"][0] == 0, "$/model/budget", "Account lower bound must be zero")

    def guards(items, p):
        sequence(items, p)
        for i, item in enumerate(items):
            q = p + "/" + str(i)
            obj(item, ("field", "op", "value"), q)
            field, op, value = item["field"], item["op"], item["value"]
            text(field, q + "/field")
            need(field in domains, q, "Unknown state field; time is not a guard operand")
            if op not in ("eq", "ge"):
                raise UnsupportedFeature(q + "/op", "Only eq/ge are supported")
            if op == "ge":
                need("integer" in domains[field], q, "ge requires integer domain")
                integer(value, q + "/value")
            else:
                need(in_domain(value, domains[field]), q + "/value", "Constant outside typed domain")

    def effects(effect, p, decision=False):
        # schedule is rejected here before any outcome is selected.
        obj(effect, ("set", "add"), p)
        for op in ("set", "add"):
            mapping(effect[op], p + "/" + op)
            for field, value in effect[op].items():
                q = p + "/" + op + "/" + field
                need(field in domains, q, "Unknown effect field")
                if op == "set":
                    need(in_domain(value, domains[field]), q, "Effect outside typed domain")
                else:
                    need("integer" in domains[field], q, "add requires integer domain")
                    integer(value, q)
        need(not (set(effect["set"]) & set(effect["add"])), p, "set/add overlap")
        if account in effect["set"] or (decision and account in effect["add"]):
            raise UnsupportedFeature(p, "Account may only be debited by cost and changed by event add")

    mapping(m["events"], "$/model/events")
    mapping(m["decisions"], "$/model/decisions")
    external_ids = set()
    for event_id, rule in m["events"].items():
        p = "$/model/events/" + event_id
        obj(rule, ("requires", "kind", "outcomes", "absent", "source"), p)
        text(rule["source"], p + "/source")
        guards(rule["requires"], p + "/requires")
        mapping(rule["outcomes"], p + "/outcomes")
        need(bool(rule["outcomes"]), p, "Empty outcomes")
        for name, effect in rule["outcomes"].items():
            effects(effect, p + "/outcomes/" + name)
        if rule["kind"] == "timer":
            need(len(rule["outcomes"]) == 1 and rule["absent"] is None, p, "Timer needs one outcome and no absent role")
        elif rule["kind"] == "external":
            external_ids.add(event_id)
            if rule["absent"] is None:
                raise UnsupportedFeature(p + "/absent", "External review without explicit absent branch")
            obj(rule["absent"], ("outcome", "field", "value", "source"), p + "/absent")
            a = rule["absent"]
            text(a["outcome"], p + "/absent/outcome")
            text(a["field"], p + "/absent/field")
            text(a["source"], p + "/absent/source")
            need(len(rule["outcomes"]) >= 2 and a["outcome"] in rule["outcomes"], p, "Invalid external outcome roles")
            need(a["field"] in domains and "enum" in domains[a["field"]], p, "Waiting state must be explicit finite enum")
            need(in_domain(a["value"], domains[a["field"]]), p, "Invalid waiting value")
            actual = rule["outcomes"][a["outcome"]]["set"]
            need(a["field"] in actual and type(actual[a["field"]]) is type(a["value"])
                 and actual[a["field"]] == a["value"], p, "Absent outcome must set declared waiting state")
        else:
            raise UnsupportedFeature(p + "/kind", "Unknown event kind")
    sites = set()

    def site(event_id, p):
        text(event_id, p)
        need(event_id in m["events"], p, "Unknown event")
        if event_id in sites:
            raise UnsupportedFeature(p, "Multiple scheduling sites for one event")
        sites.add(event_id)

    for name, rule in m["decisions"].items():
        p = "$/model/decisions/" + name
        obj(rule, ("requires", "effects", "cost", "schedule", "source"), p)
        text(rule["source"], p + "/source")
        integer(rule["cost"], p + "/cost")
        need(rule["cost"] >= 0 and (account is not None or rule["cost"] == 0), p, "Invalid cost or missing account")
        guards(rule["requires"], p + "/requires")
        effects(rule["effects"], p + "/effects", decision=True)
        if rule["schedule"] is not None:
            obj(rule["schedule"], ("event", "delay"), p + "/schedule")
            site(rule["schedule"]["event"], p + "/schedule/event")
            integer(rule["schedule"]["delay"], p + "/schedule/delay")
            if rule["schedule"]["delay"] <= 0:
                raise UnsupportedFeature(p + "/schedule/delay", "Positive integer delay required")
    sequence(m["initial_events"], "$/model/initial_events")
    for i, item in enumerate(m["initial_events"]):
        p = "$/model/initial_events/" + str(i)
        obj(item, ("id", "due", "scheduled_at"), p)
        site(item["id"], p + "/id")
        integer(item["due"], p + "/due")
        integer(item["scheduled_at"], p + "/scheduled_at")
        need(item["scheduled_at"] <= c["start"] <= item["due"], p, "Initial event must be declared by start and not overdue")
    order = m["reference_event_order"]
    sequence(order, "$/model/reference_event_order")
    for value in order:
        text(value, "$/model/reference_event_order")
    need(len(order) == len(set(order)) and set(order) == set(m["events"]), "$/model/reference_event_order", "Must list every event exactly once")
    sequence(m["metadata"]["deadlines"], "$/model/metadata/deadlines")
    for deadline in m["metadata"]["deadlines"]:
        obj(deadline, ("event", "last_inclusive_step", "source"), "$/model/metadata/deadlines")
        text(deadline["source"], "$/model/metadata/deadlines/source")
        integer(deadline["last_inclusive_step"], "$/model/metadata/deadlines/last_inclusive_step")
        need(any(e["id"] == deadline["event"] and e["due"] == deadline["last_inclusive_step"] + 1
                 for e in m["initial_events"]), "$/model/metadata/deadlines", "Deadline annotation contradicts initial expiry")
    script = run["script"]
    obj(script, ("schema_version", "source", "steps"), "$/script")
    need(script["schema_version"] == SCRIPT_VERSION, "$/script/schema_version", "Unsupported script version")
    text(script["source"], "$/script/source")
    mapping(script["steps"], "$/script/steps")
    for key, entries in script["steps"].items():
        p = "$/script/steps/" + key
        need(re.fullmatch(r"0|-?[1-9][0-9]*", key) is not None, p, "Noncanonical integer step")
        need(c["start"] <= int(key) <= c["horizon"], p, "Script outside horizon")
        sequence(entries, p)
        for entry in entries:
            obj(entry, ("decision", "mode"), p)
            text(entry["decision"], p)
            need(entry["decision"] in m["decisions"], p, "Unknown decision")
            if entry["mode"] not in ("attempt", "if_not_taken"):
                raise UnsupportedFeature(p + "/mode", "Unsupported script condition")
    mapping(run["outcomes"], "$/outcomes")
    need(set(run["outcomes"]) == external_ids, "$/outcomes", "Bind exactly every external event; unused bindings are allowed")
    for name, outcome in run["outcomes"].items():
        text(outcome, "$/outcomes/" + name)
        need(outcome in m["events"][name]["outcomes"], "$/outcomes/" + name, "Undeclared outcome")
    return deepcopy(run)
