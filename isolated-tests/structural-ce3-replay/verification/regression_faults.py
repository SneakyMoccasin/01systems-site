"""Persisted fault injections against the independent auditor only."""
from copy import deepcopy
from core.history import read_bundle, write_bundle
from verification.checkpoint_checks import require


def injections(family):
    def select(rows, kind, action):
        return next(r for r in rows if r["kind"] == kind and r["action"] == action)
    def marker(rows):
        next(r for r in rows if r["kind"] == "step_begin" and r["step"] == 15)["kind"] = "step_end"
    if family == "factory":
        return {
            "detect_budget_tampering": lambda rows: select(rows, "decision_executed", "D9")["after"]["state"].update(budget=4),
            "detect_wrong_schedule": lambda rows: select(rows, "decision_executed", "D4")["after"]["pending"][-1].update(due=11),
            "detect_missing_week_marker": marker,
        }
    return {
        "detect_budget_tampering": lambda rows: select(rows, "decision_executed", "T1")["after"]["state"].update(budget=23),
        "detect_wrong_schedule": lambda rows: select(rows, "decision_executed", "T1")["after"]["pending"][0].update(due=9),
        "detect_rejected_state_effect": lambda rows: select(rows, "attempt_blocked", "T7")["after"]["state"].update(traffic_authorized=True),
        "detect_event_from_rejection": lambda rows: select(rows, "attempt_blocked", "T7")["after"]["pending"].append(
            dict(id="E_T1", origin={"kind": "decision", "id": "T7"}, scheduled_at=12, due=13)),
        "detect_false_block_reason": lambda rows: select(rows, "attempt_blocked", "T7").update(failures=[]),
        "detect_duplicate_taken": lambda rows: select(rows, "decision_executed", "T1")["after"]["taken"].append("T1"),
        "detect_wrong_outcome": lambda rows: select(rows, "event_applied", "E_T2").update(outcome="absent"),
        "detect_missing_empty_week": marker,
    }


def fault_checks(folder, original, input_file, family, cli):
    results = []
    for name, change in injections(family).items():
        bad = deepcopy(original)
        change(bad["paths"][0]["history"])
        require(bad != original, "No-op fault injection: " + name)
        history, report = folder / (name + ".history.json.gz"), folder / (name + ".audit.json")
        write_bundle(bad, history)
        cli("audit", "--history", history, "--trusted-input", input_file, "--output", report, exit_code=1)
        checked = read_bundle(report)
        require(checked["status"] == "FAIL" and checked["type"] == "AuditError"
                and "first divergent transition" in checked["message"], "Wrong fault rejection: " + name)
        results.append(dict(id=name, status="PASS", expected_audit_status="FAIL", detected=checked))
    return results
