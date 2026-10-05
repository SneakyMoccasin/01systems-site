"""Pure observations of independently audited, persisted histories."""
import json


MARKERS = ["buses_delivered", "depot_ready", "charger_delivered", "charger_installed",
           "drivers_ready", "signal_ready", "cycle_ready", "cycle_parking_ready",
           "cycle_open", "grid_ready", "traffic_authorized"]


def mark(state, field):
    return state["grid"] == "ready" if field == "grid_ready" else state[field]


def conditions(state, requirements):
    return all(state[k] == v if op == "eq" else state[k] >= v for k, op, v in requirements)


def decision_space(snapshot, model):
    return [key for key, rule in model["decisions"].items()
            if key not in snapshot["taken"] and conditions(snapshot["state"], rule["requires"])]


def current(snapshot):
    """Canonical current state; never erase or rewrite historical snapshots."""
    return {"week": snapshot["week"], "state": snapshot["state"],
            "taken": sorted(snapshot["taken"]),
            "pending": sorted(snapshot["pending"], key=lambda x: json.dumps(x, sort_keys=True))}


def observe(history, model):
    horizon = model["clock"]["horizon"]
    milestones = {field: next((row["week"] for row in history
                              if mark(row["after"]["state"], field)), None) for field in MARKERS}
    removal = next(row for row in history if row["kind"] == "event" and row["action"] == "E_T12")
    parking_week = removal["week"]
    at_parking = {field: mark(removal["after"]["state"], field) for field in MARKERS}
    at_parking["grid_status"] = removal["after"]["state"]["grid"]
    requirements_week = next((row["week"] for row in history if row["kind"] == "decision_point"
                              and conditions(row["after"]["state"], model["decisions"]["T7"]["requires"])), None)
    t7 = next((row["week"] for row in history if row["kind"] == "decision" and row["action"] == "T7"), None)
    t11 = next((row["week"] for row in history if row["kind"] == "decision" and row["action"] == "T11"), None)

    def gap(week):
        return {"weeks": horizon - parking_week if week is None else max(0, week - parking_week),
                "unresolved_at_horizon": week is None}

    return {"parking_week": parking_week, "parking_removed": removal["after"]["state"]["parking_removed"],
            "milestones": milestones, "at_parking": at_parking,
            "parking_snapshot": removal["after"],
            "decision_space_at_parking": decision_space(removal["after"], model),
            "t7_requirements_week": requirements_week, "t7_execution_week": t7,
            "cycle_open_week": t11, "traffic_gap": gap(t7), "cycle_gap": gap(t11),
            "all_marker_gaps": {field: gap(week) for field, week in milestones.items()},
            "final_budget": history[-1]["after"]["state"]["budget"],
            "final_grid": history[-1]["after"]["state"]["grid"],
            "pending_at_horizon": history[-1]["after"]["pending"],
            "budget_after_decision_weeks": {str(row["week"]): row["after"]["state"]["budget"]
                                            for row in history if row["kind"] == "week_end"},
            "decision_points": [{"week": row["week"], "available": decision_space(row["after"], model),
                                 "t7_requirements_met": conditions(row["after"]["state"], model["decisions"]["T7"]["requires"])}
                                for row in history if row["kind"] == "decision_point"]}


def compare(a, b, model):
    initial_equal = current(a[0]["before"]) == current(b[0]["before"])
    first_a = next(row for row in a if row["kind"] == "decision")
    first_b = next(row for row in b if row["kind"] == "decision")
    first_different = current(first_a["after"]) != current(first_b["after"])
    ends_a = {r["week"]: r["after"] for r in a if r["kind"] == "week_end"}
    ends_b = {r["week"]: r["after"] for r in b if r["kind"] == "week_end"}
    equal_weeks = [week for week in ends_a if current(ends_a[week]) == current(ends_b[week])]
    horizon = model["clock"]["horizon"]
    return {"initial_equal": initial_equal,
            "first_difference_week": first_a["week"] if first_different else None,
            "first_commitments": {"A": first_a["action"], "B": first_b["action"]},
            "first_commitment_states": {"A": current(first_a["after"]), "B": current(first_b["after"])},
            "first_commitment_decision_spaces": {"A": decision_space(first_a["after"], model),
                                                 "B": decision_space(first_b["after"], model)},
            "equal_week_end_states": equal_weeks,
            "first_week_end_full_equivalence": equal_weeks[0] if equal_weeks else None,
            "week_end_decision_space_equal": {str(week): decision_space(ends_a[week], model) == decision_space(ends_b[week], model)
                                               for week in ends_a},
            "final_equivalent": current(ends_a[horizon]) == current(ends_b[horizon]),
            "final_decision_space_equal": decision_space(ends_a[horizon], model) == decision_space(ends_b[horizon], model),
            "histories_equal": a == b}
