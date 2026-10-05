"""Supplementary probes and fault injections, outside the frozen six cases."""
from copy import deepcopy

from audit_history import audit, require


def run_checks(model, reference, script, evaluate_probe):
    results = []
    repeated = {"decisions_by_week": {"0": [{"id": "T1", "only_if_not_taken": False}] * 2},
                "source": "Supplementary once-only probe"}
    paths, audits = evaluate_probe("once_only", model, repeated)
    require(len(paths) == 1 and audits[0]["blocked"] == [{"week": 0, "decision": "T1", "missing": ["once_only"]}]
            and audits[0]["final_budget"] == 22, "Once-only probe failed")
    require(sum(row["kind"] == "event" for row in paths[0]["history"]) == 1, "Duplicate event after rejection")
    results.append({"id": "once_only", "status": "PASS"})

    limited = deepcopy(model)
    limited["initial"]["budget"] = 7
    unfunded = {"decisions_by_week": {"0": [{"id": "T1", "only_if_not_taken": False}]},
                "source": "Supplementary budget boundary; initial budget 7 only in this probe"}
    paths, audits = evaluate_probe("insufficient_budget", limited, unfunded)
    require(audits[0]["blocked"] == [{"week": 0, "decision": "T1", "missing": ["budget"]}]
            and audits[0]["final_budget"] == 7 and not paths[0]["snapshot"]["pending"], "Budget probe failed")
    require(not any(row["kind"] == "event" for row in paths[0]["history"]), "Unfunded decision generated event")
    results.append({"id": "insufficient_budget", "status": "PASS", "probe_initial_budget": 7})

    def injected(name, change):
        history = deepcopy(reference["history"])
        change(history)
        try:
            audit(history, reference["snapshot"], model, script, {"E_T2": "ready"})
        except (ValueError, KeyError) as error:
            results.append({"id": name, "status": "PASS", "detected": str(error)})
        else:
            raise ValueError("Auditor accepted fault: " + name)

    def selected(rows, kind, action):
        return next(row for row in rows if row["kind"] == kind and row["action"] == action)

    injected("detect_budget_tampering", lambda rows: selected(rows, "decision", "T1")["after"]["state"].update(budget=23))
    injected("detect_wrong_schedule", lambda rows: selected(rows, "decision", "T1")["after"]["pending"][0].update(due=9))
    injected("detect_rejected_state_effect", lambda rows: selected(rows, "rejected_attempt", "T7")["after"]["state"].update(traffic_authorized=True))
    injected("detect_event_from_rejection", lambda rows: selected(rows, "rejected_attempt", "T7")["after"]["pending"].append(
        {"id": "E_T1", "origin": "T7", "scheduled_at": 12, "due": 13}))
    injected("detect_false_block_reason", lambda rows: selected(rows, "rejected_attempt", "T7").update(failures=[]))
    injected("detect_duplicate_taken", lambda rows: selected(rows, "decision", "T1")["after"]["taken"].append("T1"))
    injected("detect_wrong_outcome", lambda rows: selected(rows, "event", "E_T2").update(outcome="absent"))
    injected("detect_missing_empty_week", lambda rows: next(row for row in rows if row["kind"] == "week_begin" and row["week"] == 15).update(kind="week_end"))
    return results
