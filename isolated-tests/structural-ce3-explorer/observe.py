"""Explicit terminal goal projection of independently audited CE3 history."""
from bridge import digest, encode, equal, require
from audit.verify import audit_bundle


def audit_receipt(bundle, trusted_input, audit_result, runtime_id):
    # Never trust a stored PASS. Re-audit the exact artifact against trusted input.
    fresh = audit_bundle(bundle, digest(trusted_input))
    equal(audit_result, fresh, "Stored audit differs from fresh independent audit")
    require(fresh["status"] == "PASS" and fresh.get("verified") is True and
            fresh.get("all_event_permutations") is True, "Run lacks complete audit certification")
    return {"schema_version": "ce3-audit-receipt/1", "history_id": digest(bundle),
            "input_identity": digest(trusted_input), "runtime_id": runtime_id, "result": fresh}


def observe(problem, bundle, trusted_input, audit_result, runtime_id, observer_build_id):
    receipt = audit_receipt(bundle, trusted_input, audit_result, runtime_id)
    for key in ("model", "outcomes", "sources"):
        equal(trusted_input[key], problem[key], "Observation problem/input mismatch: " + key)
    definition = problem["observation"]
    paths = []
    for index, path in enumerate(bundle["paths"]):
        rows = path["history"]
        terminal = rows[-1]
        checks = [{"field": field, "expected": value,
                   "actual": terminal["after"]["state"][field],
                   "satisfied": encode(terminal["after"]["state"][field]) == encode(value)}
                  for field, value in sorted(definition["terminal_equals"].items())]
        executed = [r for r in rows if r["kind"] == "decision_executed"]
        blocked = [r for r in rows if r["kind"] == "attempt_blocked"]
        accepted = not blocked and len(executed) == len(problem["search"]["decision_ids"])
        paths.append({"path_index": index, "event_orders": path["event_orders"],
                      "terminal_evidence": {"row_index": terminal["index"], "side": "after"},
                      "attempt_evidence": {"row_interval": [0, terminal["index"]],
                                           "executed_rows": [r["index"] for r in executed],
                                           "blocked_rows": [{"row_index": r["index"], "decision": r["action"],
                                                             "failures": r["failures"]} for r in blocked]},
                      "terminal_checks": checks, "all_attempts_accepted": accepted,
                      "terminal_state": terminal["after"]["state"],
                      "pending": terminal["after"]["pending"],
                      "goal_satisfied": accepted and all(c["satisfied"] for c in checks)})
    require(bool(paths), "Empty audited path population")
    return {"schema_version": "ce3-goal-observation/1", "problem_id": digest(problem),
            "definition_id": digest(definition), "observer_build_id": observer_build_id,
            "input_identity": digest(trusted_input), "history_id": digest(bundle),
            "audit_receipt_id": digest(receipt), "quantifier": definition["quantifier"],
            "goal_satisfied": all(p["goal_satisfied"] for p in paths), "paths": paths}
