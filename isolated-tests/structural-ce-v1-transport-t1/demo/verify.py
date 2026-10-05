#!/usr/bin/env python3
"""Verify the display adapter against existing artifacts, without a simulation."""
import ast
import gzip
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from data import CASE, DECISIONS, EVENTS, GRID_EVENTS, MISSING, load_payload


def main():
    payload = load_payload()
    summary = json.loads((CASE / "results/run-1/summary.json").read_text())
    checked = 0
    entries_checked = 0
    expenses_checked = 0
    rejected_checked = 0
    canonical_model = json.loads((CASE.parent / "model.json").read_text())
    # Independent field translations for the observed week-end values.
    status_labels = {
        "buses_delivered": {False: "Inte levererade", True: "Levererade"},
        "depot_ready": {False: "Inte tillgänglig", True: "Tillgänglig"},
        "charger_delivered": {False: "Inte levererad", True: "Levererad"},
        "charger_installed": {False: "Inte installerad", True: "Installerad"},
        "drivers_ready": {False: "Inte tillgängliga", True: "Tillgängliga"},
        "signal_ready": {False: "Inte färdig", True: "Färdig"},
        "cycle_ready": {False: "Inte färdigt", True: "Färdigt"},
        "cycle_parking_ready": {False: "Inte tillgänglig", True: "Tillgänglig"},
        "parking_removed": {0: "Inte borttagna", 100: "Borttagna"},
        "grid": {"pending": "Besked inväntas", "ready": "Färdig", "rejected": "Avslag – inte färdig",
                 "waiting_no_further_review": "Uteblivet besked – ingen ny prövning"},
    }
    for name, display in payload["cases"].items():
        metrics = summary["scenarios"][name]
        assert display["metrics"] == metrics
        assert len(display["weeks"]) == 27
        with gzip.open(CASE / "results/run-1/histories" / (name + ".json.gz"), "rt") as stream:
            saved = json.load(stream)
        assert saved["model"] == canonical_model
        original = saved["paths"][0]["history"]
        assert display["decision_weeks"] == {r["action"]: r["week"] for r in original if r["kind"] == "decision"}
        assert display["grid_review_week"] == next(r["week"] for r in original if r["kind"] == "event" and r["action"] == "E_T2")
        if name.startswith("A_"):
            assert metrics["parking_sensitive_fields"] == ["cycle_ready"]
            assert metrics["at_parking"]["cycle_ready"] is None
            assert {v["cycle_ready"] for v in metrics["at_parking_variants"]} == {False, True}
        for point in display["weeks"]:
            week = point["week"]
            end = next(row for row in original if row["week"] == week and row["kind"] == "week_end")
            assert point["state"] == end["after"]["state"]
            assert point["state"]["budget"] == metrics["budget_after_decision_weeks"][str(week)]
            assert point["t7_requirements_met"] == metrics["decision_points"][week]["t7_requirements_met"]
            paid = [r for r in original if r["kind"] == "decision" and r["week"] <= week
                    and canonical_model["decisions"][r["action"]]["cost"] > 0]
            assert len(point["expenses"]) == len(paid)
            for item, row in zip(point["expenses"], paid):
                definition = canonical_model["decisions"][row["action"]]
                assert (item["source_index"], item["week"], item["cost"]) == (row["index"], row["week"], definition["cost"])
                assert item["cost"] == row["before"]["state"]["budget"] - row["after"]["state"]["budget"]
                event = canonical_model["events"][definition["schedule"]["id"]]
                fields = set().union(*(outcome["set"] for outcome in event["outcomes"].values()))
                assert len(fields) == 1
                field = next(iter(fields))
                value = end["after"]["state"][field]
                assert item["completion"] == {"field": field, "value": value, "label": status_labels[field][value]}
                expenses_checked += 1
            assert point["spent"] == sum(canonical_model["decisions"][r["action"]]["cost"] for r in paid)
            assert point["spent"] + point["state"]["budget"] == 30
            for row in original:
                if row["kind"] == "rejected_attempt" and row["week"] <= week:
                    assert row["index"] not in {item["source_index"] for item in point["expenses"]}
                    rejected_checked += 1
            rows = [row for row in original if row["week"] == week and row["kind"] in
                    ("decision", "event", "rejected_attempt", "script_skip")]
            assert len(point["entries"]) == len(rows)
            for entry, row in zip(point["entries"], rows):
                assert entry["source_index"] == row["index"] and entry["kind"] == row["kind"]
                assert entry["grid_status"] == row["before"]["state"]["grid"]
                if row["kind"] == "event":
                    assert entry["label"] == (GRID_EVENTS[row["outcome"]] if row["action"] == "E_T2" else EVENTS[row["action"]])
                else:
                    assert entry["label"] == DECISIONS[row["action"]]
                errors = row.get("failures", [])
                assert entry["missing"] == [{"label": MISSING[f["field"]], "field": f["field"], "actual": f["actual"]} for f in errors]
                entries_checked += 1
            checked += 1
        removal = metrics["parking_week"]
        assert display["weeks"][26]["spent"] == 29
        assert display["weeks"][26]["state"]["budget"] == 1
        assert display["weeks"][removal]["state"]["parking_removed"] == 100
        assert display["weeks"][removal - 1]["state"]["parking_removed"] == 0
        assert metrics["traffic_gap"]["unresolved_at_horizon"] == name.endswith(("rejected", "absent"))
        if name.startswith("A_") or not name.endswith("ready"):
            at_12 = display["weeks"][12]["entries"]
            assert any(e["kind"] == "rejected_attempt" and e["label"] == DECISIONS["T7"] for e in at_12)
            assert any(e["kind"] == "decision" and e["label"] == DECISIONS["T12"] for e in at_12)
    # Inspect only demo import declarations; importing a model runner is forbidden here.
    for path in Path(__file__).parent.glob("*.py"):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                assert node.module not in ("replay", "audit_history", "observe", "run", "reproduce")
            if isinstance(node, ast.Import):
                assert not any(n.name in ("replay", "audit_history", "observe", "run", "reproduce") for n in node.names)
    # A changed artifact must fail closed. Only temporary copies are altered.
    with TemporaryDirectory(prefix="transport-demo-integrity-") as folder:
        temporary = Path(folder)
        (temporary / "results/run-1").mkdir(parents=True)
        (temporary / "results/reproducibility.json").write_bytes((CASE / "results/reproducibility.json").read_bytes())
        (temporary / "results/run-1/summary.json").write_bytes((CASE / "results/run-1/summary.json").read_bytes() + b"\n")
        try:
            load_payload(temporary)
        except ValueError as error:
            assert "Kontrollsumman" in str(error)
        else:
            raise AssertionError("Changed result was accepted")
    result = {"status": "PASS", "saved_cases_checked": len(payload["cases"]),
              "week_end_snapshots_checked": checked, "named_entries_checked": entries_checked,
              "summary_metrics_exact": True, "missing_preconditions_exact": True,
              "expense_rows_checked": expenses_checked, "rejected_attempt_exclusions_checked": rejected_checked,
              "expense_decisions_and_costs_exact": True, "expense_completion_exact": True,
              "spent_plus_remaining_always_30": True, "all_six_final_spent_29_remaining_1": True,
              "no_simulation_imports": True, "changed_result_rejected": True,
              "source_sha256": payload["evidence"]["source_sha256"]}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
