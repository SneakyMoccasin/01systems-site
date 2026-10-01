"""Independent post-run checks of saved history. Imports no replay code.

Swedish continuity is ONLY a history inspection, never a transition guard,
model goal, synthetic decision, or input to management choice.
"""
from copy import deepcopy


def require(condition, message):
    if not condition:
        raise ValueError(message)


def conditions_hold(state, conditions):
    for field, operator, target in conditions:
        require(operator in ("eq", "ge"), "Unknown guard operator")
        if operator == "eq" and state[field] != target:
            return False
        if operator == "ge" and state[field] < target:
            return False
    return True


def check_domains(snapshot, model):
    require(0 <= snapshot["week"] <= 26, "Week out of range")
    require(set(snapshot["state"]) == set(model["domains"]), "State schema changed")
    for field, domain in model["domains"].items():
        value = snapshot["state"][field]
        if "integer" in domain:
            lo, hi = domain["integer"]
            require(type(value) is int and lo <= value <= hi, "Invalid integer: " + field)
        else:
            require(any(type(value) is type(v) and value == v for v in domain["enum"]),
                    "Invalid enum: " + field)
    require(len(snapshot["taken"]) == len(set(snapshot["taken"])), "Repeated decision")
    require(set(snapshot["taken"]) <= set(model["decisions"]), "Unknown decision")
    ids = [e["id"] for e in snapshot["pending"]]
    require(len(ids) == len(set(ids)), "Repeated scheduled event")
    for item in snapshot["pending"]:
        require(item["id"] in model["events"], "Unknown event")
        require(type(item["due"]) is int and item["scheduled_at"] < item["due"] <= 34,
                "Invalid due date / nonpositive delay")


def audit_transitions(history, model, script):
    """Reconstruct allowed transitions from data; check full before/after snapshots."""
    require(bool(history), "Empty history")
    initial = {"week": 0, "state": deepcopy(model["initial"]), "taken": [],
               "pending": deepcopy(model["initial_events"])}
    require(history[0]["kind"] == "initial" and history[0]["before"] == initial,
            "Wrong initial state")
    phase = "initial"
    week_attempts = []
    begun, ended, advances, executed, rejected = [], [], [], [], []
    balances, budget_checks = [], 0
    previous = initial
    for index, row in enumerate(history):
        before, after = row["before"], row["after"]
        require(row["index"] == index and before == previous, "Broken history linkage")
        require(row["week"] == before["week"], "Wrong row week")
        check_domains(before, model)
        check_domains(after, model)
        require(bool(row.get("source")), "Missing provenance")
        week, kind, action = before["week"], row["kind"], row["action"]
        expected = deepcopy(before)
        due = [e for e in before["pending"] if e["due"] == week]
        require(not any(e["due"] < week for e in before["pending"]), "Overdue event")
        if kind == "initial":
            require(index == 0, "Repeated initial marker")
        elif kind == "week_begin":
            require(phase in ("initial", "advanced"), "Invalid week begin")
            begun.append(week)
            week_attempts = []
            phase = "events"
        elif kind in ("event", "event_skipped"):
            require(phase == "events", "Event after management choice")
            item = row["scheduled"]
            require(item in due and action == item["id"], "Unscheduled / mistimed event")
            rule = model["events"][action]
            applicable = conditions_hold(before["state"], rule["requires"])
            require(applicable == (kind == "event"), "Wrong event applicability")
            expected["pending"].remove(item)
            if applicable:
                outcome = row["outcome"]
                require(outcome in rule["outcomes"], "Undeclared outcome")
                target = (next(iter(rule["outcomes"])) if len(rule["outcomes"]) == 1
                          else script["external_outcomes"][action])
                require(outcome == target, "Not the prescribed external outcome")
                effect = rule["outcomes"][outcome]
                for field, value in effect.get("set", {}).items():
                    expected["state"][field] = value
                for field, delta in effect.get("add", {}).items():
                    expected["state"][field] += delta
            else:
                require(row["outcome"] is None and row["failures"],
                        "Inapplicable event confused with absent external response")
        elif kind in ("decision", "rejected_attempt"):
            require(phase in ("events", "decisions") and not due,
                    "Decision before all due events")
            phase = "decisions"
            rule = model["decisions"][action]
            allowed = action not in before["taken"] and conditions_hold(
                before["state"], rule["requires"])
            require(allowed == (kind == "decision"), "Wrong decision acceptance")
            week_attempts.append(action)
            if allowed:
                require(before["state"]["budget"] >= rule["cost"], "Unfunded commitment")
                expected["taken"].append(action)
                expected["state"]["budget"] -= rule["cost"]
                expected["state"].update(rule["set"])
                if "schedule" in rule:
                    schedule = rule["schedule"]
                    require(type(schedule["delay"]) is int and schedule["delay"] > 0,
                            "Nonpositive scheduling delay")
                    expected["pending"].append({"id": schedule["id"],
                        "due": week + schedule["delay"], "origin": action,
                        "scheduled_at": week})
                executed.append({"week": week, "decision": action})
            else:
                require(bool(row["failures"]), "Rejection without reason")
                rejected.append({"week": week, "decision": action,
                                 "failures": row["failures"]})
        elif kind == "week_end":
            require(phase in ("events", "decisions") and not due, "Events not exhausted")
            require(week_attempts == script["decisions_by_week"].get(str(week), []),
                    "Candidate script was changed or repaired")
            ended.append(week)
            balances.append({"week": week, "budget": after["state"]["budget"]})
            phase = "ended"
        elif kind == "advance":
            require(phase == "ended" and week < 26 and not due, "Invalid ADVANCE")
            expected["week"] = week + 1
            advances.append(week)
            phase = "advanced"
        else:
            raise ValueError("Unknown history row kind")
        require(after == expected, "Wrong transition effects at row " + str(index))
        # Separate financial ledger: only accepted decisions and approved bank add/change money.
        delta = 0
        if kind == "decision":
            delta = -model["decisions"][action]["cost"]
        elif kind == "event" and action == "E_BANK" and row["outcome"] == "approved":
            delta = 6
        require(after["state"]["budget"] == before["state"]["budget"] + delta,
                "Budget ledger mismatch")
        budget_checks += 1
        previous = after
    require(begun == list(range(27)) and ended == list(range(27)), "Missing/repeated week")
    require(advances == list(range(26)) and phase == "ended", "Incomplete horizon")
    d8_weeks = [x["week"] for x in executed if x["decision"] == "D8"]
    require(previous["state"]["production_authorized"] == bool(d8_weeks),
            "D8 marker does not match actual execution")
    return {"transition_audit": "PASS", "weeks_checked": 27,
            "rows_checked": len(history), "budget_transitions_checked": budget_checks,
            "executed": executed, "rejected_attempts": rejected,
            "script_is_legal": not rejected, "d8_weeks": d8_weeks,
            "week_end_balances": balances, "final_budget": previous["state"]["budget"],
            "pending_after_horizon": previous["pending"]}


def inspect_swedish_history(history):
    """Pure observation of already-saved states; never called by replay."""
    violations, snapshots_checked = [], 0
    for row in history:
        for side in ("before", "after"):
            snapshot = row[side]
            if 0 <= snapshot["week"] <= 26:
                snapshots_checked += 1
                state = snapshot["state"]
                missing = []
                if state["se_premises"] is not True:
                    missing.append("se_premises")
                if state["original_machine"] != "sweden_in_use":
                    missing.append("original_machine_in_use_in_sweden")
                if state["se_team"] is not True:
                    missing.append("se_team")
                if missing:
                    violations.append({"index": row["index"], "week": snapshot["week"],
                                       "side": side, "action": row["action"], "missing": missing})
    return {"continuous_sweden": not violations, "snapshots_checked": snapshots_checked,
            "violation_count": len(violations),
            "first_violation": violations[0] if violations else None}
