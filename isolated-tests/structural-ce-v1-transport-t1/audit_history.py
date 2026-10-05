"""Independent saved-history verifier. Never imports replay or expected values."""
from copy import deepcopy


def require(condition, message):
    if not condition:
        raise ValueError(message)


def guard_errors(snapshot, rule, decision=None):
    errors = []
    if decision is not None and decision in snapshot["taken"]:
        errors.append({"field": "once_only", "actual": decision})
    for field, operator, target in rule["requires"]:
        require(operator in ("eq", "ge"), "Unknown guard")
        value = snapshot["state"][field]
        violates = value != target if operator == "eq" else value < target
        if violates:
            errors.append(dict(field=field, operator=operator, required=target, actual=value))
    return errors


def check_snapshot(snapshot, model):
    clock = model["clock"]
    require(set(snapshot) == {"week", "state", "taken", "pending"}, "Snapshot schema")
    require(type(snapshot["week"]) is int and clock["start"] <= snapshot["week"] <= clock["horizon"],
            "Week outside horizon")
    require(set(snapshot["state"]) == set(model["domains"]), "State schema")
    for field, domain in model["domains"].items():
        value = snapshot["state"][field]
        if "integer" in domain:
            lo, hi = domain["integer"]
            require(type(value) is int and lo <= value <= hi, "Integer domain: " + field)
        else:
            require(any(type(v) is type(value) and v == value for v in domain["enum"]),
                    "Enum domain: " + field)
    require(len(snapshot["taken"]) == len(set(snapshot["taken"])), "Repeated decision")
    require(set(snapshot["taken"]) <= set(model["decisions"]), "Unknown taken decision")
    pending = snapshot["pending"]
    require(len({e["id"] for e in pending}) == len(pending), "Duplicate event")
    for item in pending:
        require(set(item) == {"id", "origin", "scheduled_at", "due"}, "Event queue schema")
        require(item["id"] in model["events"], "Unknown queued event")
        require(type(item["due"]) is int and type(item["scheduled_at"]) is int
                and item["due"] > item["scheduled_at"], "Invalid event delay")
        require(item["origin"] in snapshot["taken"], "Event without accepted origin decision")
        rule = model["decisions"][item["origin"]]
        require(rule.get("schedule", {}).get("id") == item["id"], "Wrong event origin")
        require(item["due"] == item["scheduled_at"] + rule["schedule"]["delay"], "Wrong queued delay")


def audit(history, terminal, model, script, external):
    require(bool(history), "Empty history")
    clock = model["clock"]
    require(not model["initial_events"], "T1 has no initial events")
    previous = {"week": clock["start"], "state": deepcopy(model["initial"]),
                "taken": [], "pending": []}
    phase = "initial"
    begun, points, ended, advanced = [], [], [], []
    scheduled_by_decision = {}
    executed, rejected, skipped = [], [], []
    spent = 0
    position = 0
    for index, row in enumerate(history):
        before, after = row["before"], row["after"]
        require(row["index"] == index and before == previous, "Broken history linkage")
        require(row["week"] == before["week"], "Wrong row time")
        require(isinstance(row.get("source"), str) and row["source"], "Missing provenance")
        check_snapshot(before, model)
        check_snapshot(after, model)
        expected = deepcopy(before)
        week, kind, action = row["week"], row["kind"], row["action"]
        due = [e for e in before["pending"] if e["due"] == week]
        require(not any(e["due"] < week for e in before["pending"]), "Overdue event")
        if kind == "initial":
            require(index == 0 and phase == "initial" and action == "INITIAL", "Wrong initial marker")
        elif kind == "week_begin":
            require(index > 0 and phase in ("initial", "advanced") and action == "WEEK_BEGIN",
                    "Wrong week begin")
            begun.append(week)
            phase, position = "events", 0
        elif kind in ("event", "event_skipped"):
            require(phase == "events", "Event outside event phase")
            item = row["scheduled"]
            require(item in due and action == item["id"], "Unscheduled or mistimed event")
            require(item["scheduled_at"] == scheduled_by_decision[item["origin"]],
                    "Scheduling date not an accepted decision")
            rule = model["events"][action]
            require(row["source"] == rule["source"], "Wrong event provenance")
            errors = guard_errors(before, rule)
            require(row["failures"] == errors, "Wrong event precondition diagnostics")
            require((kind == "event_skipped") == bool(errors), "Wrong event applicability")
            expected["pending"].remove(item)
            if errors:
                require(row["outcome"] is None, "Inapplicable is not absent")
            else:
                outcomes = rule["outcomes"]
                chosen = next(iter(outcomes)) if len(outcomes) == 1 else external[action]
                require(row["outcome"] == chosen and chosen in outcomes, "Wrong external outcome")
                for field, value in outcomes[chosen]["set"].items():
                    expected["state"][field] = value
        elif kind == "decision_point":
            require(phase == "events" and not due and action == "AFTER_EVENTS", "Incomplete event phase")
            points.append(week)
            phase = "decisions"
        elif kind in ("decision", "rejected_attempt", "script_skip"):
            require(phase == "decisions" and not due, "Decision before events")
            entries = script["decisions_by_week"].get(str(week), [])
            require(position < len(entries), "Unexpected script entry")
            entry = entries[position]
            position += 1
            require(action == entry["id"], "Wrong script order")
            rule = model["decisions"][action]
            errors = guard_errors(before, rule, action)
            conditional_skip = entry["only_if_not_taken"] and action in before["taken"]
            if conditional_skip:
                require(kind == "script_skip" and row["reason"] == "already_taken", "Missing conditional skip")
                skipped.append({"week": week, "decision": action})
            elif errors:
                require(kind == "rejected_attempt" and row["failures"] == errors,
                        "Wrong rejected attempt/diagnostics")
                require(row["source"] == rule["source"], "Wrong rejection provenance")
                rejected.append({"week": week, "decision": action,
                                 "missing": [error["field"] for error in errors]})
            else:
                require(kind == "decision", "Available script entry not executed")
                require(row["source"] == rule["source"], "Wrong decision provenance")
                require(before["state"]["budget"] >= rule["cost"], "Unfunded decision")
                spent += rule["cost"]
                expected["state"]["budget"] -= rule["cost"]
                for field, value in rule["set"].items():
                    expected["state"][field] = value
                expected["taken"].append(action)
                executed.append({"week": week, "decision": action})
                if "schedule" in rule:
                    event = rule["schedule"]
                    require(type(event["delay"]) is int and event["delay"] > 0, "Nonpositive delay")
                    expected["pending"].append({"id": event["id"], "origin": action,
                                                "scheduled_at": week, "due": week + event["delay"]})
                    scheduled_by_decision[action] = week
        elif kind == "week_end":
            require(phase == "decisions" and not due and action == "WEEK_END", "Wrong week end")
            require(position == len(script["decisions_by_week"].get(str(week), [])), "Missing script entry")
            ended.append(week)
            phase = "ended"
        elif kind == "advance":
            require(phase == "ended" and week < clock["horizon"] and not due and action == "ADVANCE",
                    "Invalid advance")
            expected["week"] = week + 1
            advanced.append(week)
            phase = "advanced"
        else:
            raise ValueError("Unknown row kind")
        require(after == expected, "Wrong transition effects at row " + str(index))
        require(after["state"]["budget"] == model["initial"]["budget"] - spent, "Independent budget ledger")
        previous = after
    weeks = list(range(clock["start"], clock["horizon"] + 1))
    require(begun == points == ended == weeks, "Missing/repeated weeks or decision points")
    require(advanced == weeks[:-1] and phase == "ended", "Incomplete horizon")
    require(terminal == previous, "Terminal snapshot mismatch")
    for name, flag in (("T7", "traffic_authorized"), ("T11", "cycle_open")):
        require(previous["state"][flag] == (name in previous["taken"]), "Approval marker without decision")
    return {"status": "PASS", "rows_checked": len(history), "snapshots_checked": 2 * len(history),
            "weeks_checked": len(weeks), "executed": executed, "blocked": rejected,
            "skipped": skipped, "spent": spent, "final_budget": previous["state"]["budget"],
            "all_rejections_without_effects": True}
