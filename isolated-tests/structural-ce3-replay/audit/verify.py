"""Independent auditor. Imports schema/codec only, never runtime semantics.

Consumes history rows as claims, reconstructs each expected row independently,
then verifies branch coverage from the observed branching tree.
"""
from copy import deepcopy
from itertools import permutations
from math import factorial

from core.history import digest, encode
from core.schema import HISTORY_VERSION, PROFILE, validate


class AuditError(ValueError):
    pass


def require(test, message):
    if not test:
        raise AuditError(message)


def equal(actual, expected, message):
    # Serialized equality is type-strict, unlike Python True == 1.
    require(encode(actual) == encode(expected), message)


def guard_errors(state, guards):
    errors = []
    for guard in guards:
        actual, required = state[guard["field"]], guard["value"]
        if guard["op"] == "eq":
            valid = type(actual) is type(required) and actual == required
        else:
            valid = actual >= required
        if not valid:
            errors.append(dict(field=guard["field"], operator=guard["op"], required=required, actual=actual))
    return errors


def audit_bundle(bundle, trusted_input_hash):
    require(type(trusted_input_hash) is str, "Trusted input hash required")
    equal(sorted(bundle), sorted(("schema_version", "profile", "input", "input_sha256", "limits",
                                 "status", "error", "paths", "work_rows")), "Bundle schema")
    require(bundle["schema_version"] == HISTORY_VERSION and bundle["profile"] == PROFILE, "History version")
    require(bundle["input_sha256"] == digest(bundle["input"]) == trusted_input_hash, "Input identity mismatch")
    run = validate(bundle["input"])
    if bundle["status"] != "COMPLETE":
        require(bundle["status"] in ("INCOMPLETE", "ERROR") and bundle["error"] is not None
                and bundle["paths"] == [], "Invalid noncomplete document")
        return {"status": bundle["status"], "verified": False, "reason": "No complete-run certification"}
    require(bundle["error"] is None and type(bundle["paths"]) is list and bool(bundle["paths"]), "Empty or erroneous complete run")
    model, script = run["model"], run["script"]
    start, horizon = model["clock"]["start"], model["clock"]["horizon"]
    account = model["budget"]["field"] if model["budget"] else None
    row_count = 0
    branches, signatures = {}, set()
    unique_work = set()

    def effect(state, change):
        for field, value in change["set"].items():
            state[field] = value
        for field, delta in change["add"].items():
            state[field] = state[field] + delta

    def state_domains(state):
        require(set(state) == set(model["domains"]), "State fields differ")
        for field, domain in model["domains"].items():
            value = state[field]
            if "integer" in domain:
                lo, hi = domain["integer"]
                require(type(value) is int and lo <= value <= hi, "Integer domain: " + field)
            else:
                require(any(type(value) is type(v) and value == v for v in domain["enum"]), "Enum domain: " + field)

    for path_index, path in enumerate(bundle["paths"]):
        equal(sorted(path), sorted(("snapshot", "history", "event_orders", "unused_outcomes", "all_attempts_accepted")), "Path schema")
        snapshot = {"step": start, "phase": "initial", "state": deepcopy(model["initial"]), "taken": [],
                    "pending": [dict(e, origin={"kind": "initial", "id": e["id"]}) for e in model["initial_events"]]}
        index = 0
        history = path["history"]
        orders, signature, used = [], [], set()
        spent = credits = 0
        blocked = False

        def consume(kind, action, source, after=None, outcome=None, errors=None, scheduled=None, position=None):
            nonlocal index, snapshot, row_count
            require(index < len(history), f"Path {path_index} missing row {index}: {kind}")
            next_snapshot = deepcopy(snapshot if after is None else after)
            state_domains(next_snapshot["state"])
            expected = {"index": index, "step": snapshot["step"], "kind": kind, "action": action,
                        "source": source, "before": deepcopy(snapshot), "after": next_snapshot,
                        "outcome": outcome, "failures": errors or [], "scheduled": scheduled,
                        "script_position": position}
            equal(history[index], expected, f"Path {path_index} first divergent transition {index} ({kind} {action})")
            if account is not None:
                require(next_snapshot["state"][account] == model["initial"][account] - spent + credits,
                        f"Path {path_index} row {index}: independent account ledger")
            # Count work by execution prefix, not by repeated copies of its history.
            unique_work.add(digest({"prefix": signature, "row": expected}))
            snapshot = next_snapshot
            index += 1
            row_count += 1

        def mark(kind, phase=None, advance=False):
            after = deepcopy(snapshot)
            if phase:
                after["phase"] = phase
            if advance:
                after["step"] += 1
            consume(kind, kind, PROFILE, after=after)

        mark("initial")
        for step in range(start, horizon + 1):
            due = {e["id"]: deepcopy(e) for e in snapshot["pending"] if e["due"] == step}
            require(not any(e["due"] < step for e in snapshot["pending"]), "Overdue event")
            prefix = tuple(signature)
            branch = branches.setdefault(prefix, {"due": tuple(sorted(due)), "orders": set(), "state": digest(snapshot)})
            equal(branch["due"], tuple(sorted(due)), "Different due sets at same branch prefix")
            require(branch["state"] == digest(snapshot), "Different states at same branch prefix")
            # The order is a claim to verify, not an instruction from runtime code.
            require(len(path["event_orders"]) > step - start, "Missing event order")
            claimed = path["event_orders"][step - start]
            equal(sorted(claimed), ["order", "step"], "Order schema")
            require(type(claimed["step"]) is int and claimed["step"] == step, "Wrong order step")
            order = claimed["order"]
            require(type(order) is list and all(type(x) is str for x in order), "Invalid event order")
            require(len(order) == len(set(order)) and set(order) == set(due), "Missing/duplicate due event")
            branch["orders"].add(tuple(order))
            signature.append((step, tuple(order)))
            orders.append({"step": step, "order": order})
            mark("step_begin", "events")
            for name in order:
                item, rule = due[name], model["events"][name]
                errors = guard_errors(snapshot["state"], rule["requires"])
                after = deepcopy(snapshot)
                after["pending"].remove(item)
                outcome = None
                if not errors:
                    outcome = next(iter(rule["outcomes"])) if rule["kind"] == "timer" else run["outcomes"][name]
                    change = rule["outcomes"][outcome]
                    effect(after["state"], change)
                    if account is not None:
                        credits += change["add"].get(account, 0)
                    if rule["kind"] == "external":
                        used.add(name)
                consume("event_inapplicable" if errors else "event_applied", name, rule["source"],
                        after=after, errors=errors, outcome=outcome, scheduled=item)
            mark("decision_point", "decisions")
            for position, entry in enumerate(script["steps"].get(str(step), [])):
                name = entry["decision"]
                rule = model["decisions"][name]
                if entry["mode"] == "if_not_taken" and name in snapshot["taken"]:
                    consume("script_skip", name, rule["source"], position=position)
                    continue
                errors = []
                if name in snapshot["taken"]:
                    errors.append({"field": "once_only", "actual": name})
                errors += guard_errors(snapshot["state"], rule["requires"])
                if account is not None and snapshot["state"][account] < rule["cost"]:
                    funding = dict(field=account, operator="ge", required=rule["cost"], actual=snapshot["state"][account])
                    if funding not in errors:
                        errors.append(funding)
                if errors:
                    blocked = True
                    consume("attempt_blocked", name, rule["source"], errors=errors, position=position)
                else:
                    after = deepcopy(snapshot)
                    if account is not None:
                        after["state"][account] -= rule["cost"]
                    spent += rule["cost"]
                    effect(after["state"], rule["effects"])
                    after["taken"].append(name)
                    scheduled = None
                    if rule["schedule"] is not None:
                        scheduled = {"id": rule["schedule"]["event"], "due": step + rule["schedule"]["delay"],
                                     "scheduled_at": step, "origin": {"kind": "decision", "id": name}}
                        after["pending"].append(scheduled)
                    consume("decision_executed", name, rule["source"], after=after, scheduled=scheduled, position=position)
            mark("step_end", "ended")
            if step != horizon:
                mark("advance", "advanced", advance=True)
        require(index == len(history), f"Path {path_index}: extra history rows")
        equal(path["snapshot"], snapshot, "Terminal snapshot differs")
        equal(path["event_orders"], orders, "Event orders differ")
        equal(path["unused_outcomes"], sorted(set(run["outcomes"]) - used), "Unused outcome bindings differ")
        equal(path["all_attempts_accepted"], not blocked, "Wrong acceptance summary")
        require(tuple(signature) not in signatures, "Duplicate complete path")
        signatures.add(tuple(signature))
    for branch in branches.values():
        # Reject missing coverage before constructing a potentially huge set.
        require(len(branch["orders"]) == factorial(len(branch["due"])), "Incomplete permutation coverage")
        require(branch["orders"] == set(permutations(branch["due"])), "Incomplete permutation coverage")
    # Resource metadata is also checked; completed histories cannot exceed caps.
    limits = bundle["limits"]
    equal(sorted(limits), ["max_paths", "max_rows", "max_steps"], "Limit schema")
    require(all(type(v) is int and v > 0 for v in limits.values()), "Invalid limits")
    require(len(signatures) <= limits["max_paths"] and horizon - start + 1 <= limits["max_steps"], "Complete run exceeded limits")
    require(type(bundle["work_rows"]) is int and bundle["work_rows"] == len(unique_work)
            and bundle["work_rows"] <= limits["max_rows"], "Work-row accounting differs")
    return {"status": "PASS", "verified": True, "paths": len(signatures), "rows": row_count,
            "input_sha256": trusted_input_hash, "all_event_permutations": True}
