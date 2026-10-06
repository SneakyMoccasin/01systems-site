"""Small hand-derived tests independent of business-case expected conclusions."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.schema import InputError, UnsupportedFeature, validate
from core.history import digest, encode, loads, read_bundle, write_bundle
from core.replay import replay
from core.transitions import attempt, available
from core.expressions import ModelError
from audit.verify import AuditError, audit_bundle
from adapters.factory_v1 import adapt
from verification.semantic_compare import compare, Divergence


def fixture():
    return read_bundle(ROOT / "verification/generic_fixtures/ledger.json")


def base():
    run = fixture()["input"]
    run["model"]["decisions"] = {}
    run["model"]["events"] = {}
    run["model"]["initial_events"] = []
    run["model"]["reference_event_order"] = []
    run["script"]["steps"] = {}
    return run


def decision(set_values=None, add=None, requires=None, cost=0, schedule=None):
    return {"requires": requires or [], "effects": {"set": set_values or {}, "add": add or {}},
            "cost": cost, "schedule": schedule, "source": "Hand-derived decision"}


def timer(set_values=None, add=None, requires=None):
    return {"requires": requires or [], "kind": "timer", "outcomes": {"tick": {"set": set_values or {}, "add": add or {}}},
            "absent": None, "source": "Hand-derived event"}


def guard(field, value, op="eq"):
    return {"field": field, "op": op, "value": value}


def entries(*names):
    return [{"decision": name, "mode": "attempt"} for name in names]


def schedule_initial(run, name, event, due):
    run["model"]["events"][name] = event
    run["model"]["initial_events"].append({"id": name, "due": due, "scheduled_at": run["model"]["clock"]["start"]})
    run["model"]["reference_event_order"].append(name)


def external_run():
    run = base()
    run["model"]["domains"]["reply"] = {"enum": ["pending", "yes", "no", "waiting"]}
    run["model"]["initial"]["reply"] = "pending"
    event = {"requires": [guard("gate", True)], "kind": "external", "source": "Synthetic review",
             "absent": {"outcome": "silence", "field": "reply", "value": "waiting", "source": "Explicit waiting, no re-review"},
             "outcomes": {name: {"set": {"reply": value}, "add": {}}
                          for name, value in [("yes", "yes"), ("no", "no"), ("silence", "waiting")]}}
    schedule_initial(run, "review", event, 1)
    run["outcomes"] = {"review": "silence"}
    return run


class GenericChecks(unittest.TestCase):
    def checked(self, run):
        bundle = replay(run)
        self.assertEqual(bundle["status"], "COMPLETE")
        self.assertEqual(audit_bundle(bundle, digest(run))["status"], "PASS")
        return bundle

    def test_hand_derived_budget_retry_once_and_order(self):
        data = fixture()
        bundle = self.checked(data["input"])
        path = bundle["paths"][0]
        material = [[r["step"], r["kind"], r["action"]] for r in path["history"]
                    if r["kind"] in ("attempt_blocked", "decision_executed", "event_applied", "script_skip")]
        self.assertEqual(material, data["expected_material_sequence"])
        self.assertEqual(path["snapshot"]["state"], data["expected_final_state"])
        rejected = [r for r in path["history"] if r["kind"] == "attempt_blocked"]
        self.assertEqual([r["failures"] for r in rejected], [
            [{"field": "gate", "operator": "eq", "required": True, "actual": False},
             {"field": "coins", "operator": "ge", "required": 3, "actual": 2}],
            [{"field": "coins", "operator": "ge", "required": 3, "actual": 2}],
            [{"field": "once_only", "actual": "buy"}, {"field": "coins", "operator": "ge", "required": 3, "actual": 0}]])
        for row in rejected:
            self.assertEqual(row["before"], row["after"])
        self.assertEqual(path["snapshot"]["taken"], ["unlock", "buy", "finish"])

    def test_same_step_dependencies_and_blocked_continuation(self):
        run = base()
        run["model"]["decisions"] = {"gate": decision({"gate": True}),
            "dependent": decision({"flag": True}, requires=[guard("gate", True)])}
        run["script"]["steps"] = {"0": entries("dependent", "gate", "dependent")}
        rows = self.checked(run)["paths"][0]["history"]
        self.assertEqual([r["kind"] for r in rows if r["action"] in ("gate", "dependent")],
                         ["attempt_blocked", "decision_executed", "decision_executed"])

    def test_start_deadline_horizon_events_and_empty_steps(self):
        run = base()
        schedule_initial(run, "open", timer({"gate": True}), 0)
        schedule_initial(run, "expiry", timer({"gate": False}), 2)
        schedule_initial(run, "last", timer({"flag": True}), 3)
        run["model"]["metadata"]["deadlines"] = [{"event": "expiry", "last_inclusive_step": 1, "source": "Synthetic inclusive expiry"}]
        run["model"]["decisions"] = {
            "early": decision(requires=[guard("gate", True)]),
            "late": decision(requires=[guard("gate", True)]),
            "horizon": decision(requires=[guard("flag", True)])}
        run["script"]["steps"] = {"1": entries("early"), "2": entries("late"), "3": entries("horizon")}
        path = self.checked(run)["paths"][0]
        self.assertEqual(path["snapshot"]["taken"], ["early", "horizon"])
        self.assertEqual([r["step"] for r in path["history"] if r["kind"] == "decision_point"], [0, 1, 2, 3])
        self.assertEqual([r["action"] for r in path["history"] if r["step"] == 3 and r["kind"] in
                          ("event_applied", "decision_executed")], ["last", "horizon"])

    def test_pending_after_horizon(self):
        run = base()
        run["model"]["decisions"] = {"late": decision(schedule={"event": "future", "delay": 7})}
        run["model"]["events"] = {"future": timer({"flag": True})}
        run["model"]["reference_event_order"] = ["future"]
        run["script"]["steps"] = {"3": entries("late")}
        path = self.checked(run)["paths"][0]
        self.assertEqual(path["snapshot"]["pending"], [{"id": "future", "due": 10, "scheduled_at": 3,
                                                       "origin": {"kind": "decision", "id": "late"}}])
        self.assertFalse(path["snapshot"]["state"]["flag"])

    def test_conflicting_events_change_availability(self):
        run = base()
        schedule_initial(run, "up", timer({"gate": True}), 1)
        schedule_initial(run, "down", timer({"gate": False}), 1)
        run["model"]["decisions"] = {"claim": decision(requires=[guard("gate", True)])}
        run["script"]["steps"] = {"1": entries("claim")}
        paths = self.checked(run)["paths"]
        self.assertEqual(len(paths), 2)
        self.assertEqual({tuple(p["snapshot"]["taken"]) for p in paths}, {(), ("claim",)})
        points = [next(r["after"] for r in p["history"] if r["kind"] == "decision_point" and r["step"] == 1) for p in paths]
        self.assertEqual({tuple(available(run["model"], p)) for p in points}, {(), ("claim",)})
        with self.assertRaises(ValueError):
            available(run["model"], paths[0]["history"][0]["before"])

    def test_event_preconditions_are_rechecked_in_each_order(self):
        run = base()
        schedule_initial(run, "unlock", timer({"gate": True}), 1)
        schedule_initial(run, "conditional", timer({"flag": True}, requires=[guard("gate", True)]), 1)
        paths = self.checked(run)["paths"]
        self.assertEqual({p["snapshot"]["state"]["flag"] for p in paths}, {False, True})
        kinds = {next(r["kind"] for r in p["history"] if r["action"] == "conditional") for p in paths}
        self.assertEqual(kinds, {"event_applied", "event_inapplicable"})

    def test_cartesian_coverage_not_just_counts(self):
        run = base()
        for step in (1, 2):
            schedule_initial(run, "a" + str(step), timer({"gate": True}), step)
            schedule_initial(run, "b" + str(step), timer({"gate": False}), step)
        bundle = self.checked(run)
        self.assertEqual(len(bundle["paths"]), 4)
        for mutation in (lambda b: b["paths"].pop(), lambda b: b["paths"].__setitem__(0, deepcopy(b["paths"][1]))):
            bad = deepcopy(bundle)
            mutation(bad)
            with self.assertRaises(AuditError):
                audit_bundle(bad, digest(run))

    def test_absent_inapplicable_and_selected_outcome_no_lookahead(self):
        run = external_run()
        bundle = self.checked(run)
        path = bundle["paths"][0]
        self.assertEqual(path["snapshot"]["state"]["reply"], "pending")
        row = next(r for r in path["history"] if r["action"] == "review")
        self.assertEqual((row["kind"], row["outcome"]), ("event_inapplicable", None))
        self.assertEqual(path["unused_outcomes"], ["review"])
        run["model"]["initial"]["gate"] = True
        run["model"]["decisions"]["approve"] = decision(requires=[guard("reply", "yes")])
        run["script"]["steps"] = {"0": entries("approve"), "1": entries("approve")}
        for choice, state in (("silence", "waiting"), ("yes", "yes"), ("no", "no")):
            with self.subTest(choice=choice):
                run["outcomes"]["review"] = choice
                path = self.checked(run)["paths"][0]
                self.assertEqual(path["snapshot"]["state"]["reply"], state)
                self.assertFalse(path["snapshot"]["pending"])
                attempts = [r for r in path["history"] if r["action"] == "approve"]
                self.assertEqual(attempts[0]["kind"], "attempt_blocked")
                self.assertEqual(attempts[1]["kind"], "decision_executed" if choice == "yes" else "attempt_blocked")

    def test_decision_overflow_is_atomic_and_error_not_block(self):
        run = base()
        run["model"]["initial"]["count"] = 2
        run["model"]["decisions"]["overflow"] = decision({"flag": True}, {"count": 1}, cost=2,
                                                           schedule={"event": "never", "delay": 1})
        run["model"]["events"]["never"] = timer()
        run["model"]["reference_event_order"] = ["never"]
        run["script"]["steps"] = {"0": entries("overflow")}
        bundle = replay(run)
        self.assertEqual(bundle["status"], "ERROR")
        before = bundle["error"]["last_snapshot"]
        self.assertEqual(before["state"], run["model"]["initial"])
        self.assertEqual(before["taken"], [])
        self.assertEqual(before["pending"], [])
        original = deepcopy(before)
        with self.assertRaises(ModelError):
            attempt(run["model"], before, entries("overflow")[0], 0)
        self.assertEqual(before, original)
        self.assertEqual(audit_bundle(bundle, digest(run))["status"], "ERROR")

    def test_event_overflow_does_not_consume_queue_or_publish_effect(self):
        run = base()
        run["model"]["initial"]["coins"] = 10
        schedule_initial(run, "overflow", timer({"flag": True}, {"coins": 1}), 0)
        bundle = replay(run)
        self.assertEqual(bundle["status"], "ERROR")
        last = bundle["error"]["last_snapshot"]
        self.assertEqual(last["state"], run["model"]["initial"])
        self.assertEqual(len(last["pending"]), 1)
        self.assertFalse(any(r["kind"].startswith("event_") for r in bundle["error"]["last_history"]))

    def test_strict_types_and_unused_rules(self):
        changes = {
            "bool_integer": lambda r: r["model"]["initial"].update(coins=True),
            "float_integer": lambda r: r["model"]["initial"].update(coins=2.0),
            "bool_cost": lambda r: r["model"]["decisions"]["unused"].update(cost=True),
            "negative_cost": lambda r: r["model"]["decisions"]["unused"].update(cost=-1),
            "wrong_enum_type": lambda r: r["model"]["decisions"]["unused"]["effects"]["set"].update(gate=1),
            "float_add": lambda r: r["model"]["decisions"]["unused"]["effects"]["add"].update(count=1.0),
            "add_bool_field": lambda r: r["model"]["decisions"]["unused"]["effects"]["add"].update(gate=1),
            "unknown_field": lambda r: r["model"]["decisions"]["unused"]["effects"]["set"].update(unknown=True),
            "set_add_overlap": lambda r: r["model"]["decisions"]["unused"]["effects"].update(set={"count": 1}, add={"count": 1}),
            "unknown_operator": lambda r: r["model"]["decisions"]["unused"].update(requires=[guard("coins", 1, "gt")]),
            "clock_guard": lambda r: r["model"]["decisions"]["unused"].update(requires=[guard("step", 1)]),
            "ge_boolean": lambda r: r["model"]["decisions"]["unused"].update(requires=[guard("gate", True, "ge")]),
            "eq_coercion": lambda r: r["model"]["decisions"]["unused"].update(requires=[guard("gate", 1)]),
            "unknown_event": lambda r: r["model"]["decisions"]["unused"].update(schedule={"event": "missing", "delay": 1}),
            "incomplete_order": lambda r: r["model"]["reference_event_order"].append("missing"),
            "script_unknown": lambda r: r["script"]["steps"].update({"0": entries("missing")}),
            "outside_horizon": lambda r: r["script"]["steps"].update({"4": entries("unused")}),
            "noncanonical_step": lambda r: r["script"]["steps"].update({"01": entries("unused")}),
            "unknown_flag": lambda r: r["model"]["decisions"]["unused"].update(repeat=True),
            "float_clock": lambda r: r["model"]["clock"].update(start=0.0),
            "clock_flags": lambda r: r["model"]["clock"].update(events_before_decisions=1),
            "missing_state": lambda r: r["model"]["initial"].pop("gate"),
            "wrong_version": lambda r: r["script"].update(schema_version="unknown"),
            "account_set": lambda r: r["model"]["decisions"]["unused"]["effects"]["set"].update(coins=3),
            "account_double_debit": lambda r: r["model"]["decisions"]["unused"]["effects"]["add"].update(coins=-1),
        }
        for name, change in changes.items():
            with self.subTest(name=name):
                run = base()
                run["model"]["decisions"]["unused"] = decision()
                change(run)
                with self.assertRaises(InputError):
                    validate(run)

    def test_unsupported_outcome_schedule_even_unchosen(self):
        run = external_run()
        run["model"]["events"]["review"]["outcomes"]["yes"]["schedule"] = {"event": "review", "delay": 1}
        with self.assertRaises(UnsupportedFeature) as caught:
            replay(run)
        self.assertIn("/outcomes/yes/schedule", caught.exception.path)
        self.assertIn("fixed-replay/0.1", str(caught.exception))

    def test_unsupported_forms_and_references(self):
        changes = [
            lambda r: r["model"]["events"]["review"].update(absent=None),
            lambda r: r["model"]["events"]["review"]["outcomes"]["no"].update(callback="anything"),
            lambda r: r["model"]["events"]["review"].update(cancel=True),
            lambda r: r["model"]["initial_events"].append(deepcopy(r["model"]["initial_events"][0])),
            lambda r: r["model"]["decisions"].update(unused=decision(schedule={"event": "review", "delay": 1})),
            lambda r: r["model"]["clock"].update(step=2),
            lambda r: r["model"]["clock"].update(horizon_inclusive=False),
        ]
        for change in changes:
            with self.subTest(change=changes.index(change)):
                run = external_run()
                change(run)
                with self.assertRaises(UnsupportedFeature):
                    validate(run)
        for delay in (0, -1, True, 1.5):
            run = base()
            run["model"]["events"]["later"] = timer()
            run["model"]["reference_event_order"] = ["later"]
            run["model"]["decisions"]["unused"] = decision(schedule={"event": "later", "delay": delay})
            with self.subTest(delay=delay), self.assertRaises(InputError):
                validate(run)
        for choice in ({}, {"review": "unknown"}, {"review": "silence", "other": "yes"}):
            run = external_run()
            run["outcomes"] = choice
            with self.subTest(choice=choice), self.assertRaises(InputError):
                validate(run)
        run = external_run()
        run["model"]["events"]["review"]["outcomes"]["no"]["set"]["reply"] = False
        with self.assertRaises(InputError):
            validate(run)

    def test_strict_json_reader(self):
        for text in ('{"a":1,"a":2}', '{"a":{"x":1,"x":2}}', '{"x":NaN}', '{"x":Infinity}'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                loads(text)

    def test_no_budget_account_and_integer_ge(self):
        run = base()
        run["model"]["budget"] = None
        run["model"]["decisions"] = {"increment": decision(add={"count": 2}),
                                     "use": decision({"flag": True}, requires=[guard("count", 2, "ge")])}
        run["script"]["steps"] = {"0": entries("increment", "use")}
        self.assertTrue(self.checked(run)["paths"][0]["snapshot"]["state"]["flag"])
        run["model"]["decisions"]["use"]["cost"] = 1
        with self.assertRaises(InputError):
            validate(run)

    def test_limits_never_pass(self):
        run = base()
        schedule_initial(run, "up", timer({"gate": True}), 1)
        schedule_initial(run, "down", timer({"gate": False}), 1)
        for key in ("max_paths", "max_rows", "max_steps"):
            limits = {"max_paths": 100, "max_rows": 1000, "max_steps": 100}
            limits[key] = 1
            bundle = replay(run, limits)
            self.assertEqual(bundle["status"], "INCOMPLETE")
            self.assertEqual(bundle["paths"], [])
            self.assertEqual(audit_bundle(bundle, digest(run))["status"], "INCOMPLETE")

    def test_manipulated_history_rows_and_input(self):
        run = fixture()["input"]
        bundle = self.checked(run)
        def select(b, kind):
            return next(r for r in b["paths"][0]["history"] if r["kind"] == kind)
        mutations = {
            "budget": lambda b: select(b, "decision_executed")["after"]["state"].update(coins=9),
            "false_reason": lambda b: select(b, "attempt_blocked").update(failures=[]),
            "rejected_taken": lambda b: select(b, "attempt_blocked")["after"]["taken"].append("buy"),
            "source": lambda b: select(b, "event_applied").update(source="forged"),
            "outcome": lambda b: select(b, "event_applied").update(outcome="fake"),
            "scheduled": lambda b: select(b, "event_applied")["scheduled"].update(due=2),
            "origin": lambda b: select(b, "event_applied")["scheduled"]["origin"].update(kind="decision", id="buy"),
            "missing_row": lambda b: b["paths"][0]["history"].pop(1),
            "terminal": lambda b: b["paths"][0]["snapshot"]["state"].update(coins=1),
            "bool_as_integer": lambda b: b["paths"][0]["history"][0]["after"]["state"].update(coins=True),
            "extra_row_field": lambda b: select(b, "decision_executed").update(ignored=True),
            "false_summary": lambda b: b["paths"][0].update(all_attempts_accepted=True),
        }
        for name, change in mutations.items():
            with self.subTest(name=name):
                bad = deepcopy(bundle)
                change(bad)
                with self.assertRaises(AuditError):
                    audit_bundle(bad, digest(run))
        bad = deepcopy(bundle)
        bad["input"]["model"]["initial"]["coins"] = 3
        bad["input_sha256"] = digest(bad["input"])
        with self.assertRaisesRegex(AuditError, "Input identity"):
            audit_bundle(bad, digest(run))

    def test_link_consistent_tampering_is_still_detected(self):
        run = fixture()["input"]
        bad = deepcopy(self.checked(run))
        rows = bad["paths"][0]["history"]
        target = next(i for i, r in enumerate(rows) if r["kind"] == "decision_executed" and r["action"] == "buy")
        # Alter the transition and EVERY subsequent snapshot coherently: links remain intact.
        rows[target]["after"]["state"]["flag"] = True
        for row in rows[target + 1:]:
            row["before"]["state"]["flag"] = True
            row["after"]["state"]["flag"] = True
        self.assertTrue(all(a["after"] == b["before"] for a, b in zip(rows, rows[1:])))
        with self.assertRaisesRegex(AuditError, "first divergent transition"):
            audit_bundle(bad, digest(run))

    def test_name_independence_and_time_shift(self):
        run = fixture()["input"]
        original = self.checked(run)
        names = {name: "arbitrary_" + str(i) for i, name in enumerate(
            list(run["model"]["domains"]) + list(run["model"]["decisions"]) + list(run["model"]["events"]))}
        def rename(value, table):
            if type(value) is dict:
                return {table.get(k, k): rename(v, table) for k, v in value.items()}
            if type(value) is list:
                return [rename(v, table) for v in value]
            return table.get(value, value) if type(value) is str else value
        renamed = self.checked(rename(run, names))
        restored = rename(renamed["paths"], {v: k for k, v in names.items()})
        self.assertEqual(restored, original["paths"])
        shifted = deepcopy(run)
        shifted["model"]["clock"].update(start=7, horizon=10)
        shifted["script"]["steps"] = {str(int(k) + 7): v for k, v in shifted["script"]["steps"].items()}
        for event in shifted["model"]["initial_events"]:
            event["due"] += 7
            event["scheduled_at"] += 7
        path = self.checked(shifted)["paths"][0]
        self.assertEqual(path["snapshot"]["state"], original["paths"][0]["snapshot"]["state"])
        self.assertEqual([r["step"] - 7 for r in path["history"]], [r["step"] for r in original["paths"][0]["history"]])

    def test_auditor_import_boundary(self):
        for path in (ROOT / "audit").glob("*.py"):
            imports = []
            for node in ast.walk(ast.parse(path.read_text())):
                if isinstance(node, ast.ImportFrom):
                    imports.append(node.module)
                elif isinstance(node, ast.Import):
                    imports.extend(n.name for n in node.names)
            self.assertFalse(set(imports) & {"core.replay", "core.transitions", "core.expressions"})
        code = "import audit.verify, sys; assert not any(n in sys.modules for n in ['core.replay','core.transitions','core.expressions'])"
        subprocess.run([sys.executable, "-B", "-c", code], cwd=ROOT, check=True)

    def test_cli_roundtrip_and_incomplete_exit(self):
        with TemporaryDirectory(prefix="ce3-generic-") as directory:
            folder = Path(directory)
            source, history, checked = folder / "input.json", folder / "history.json.gz", folder / "audit.json"
            run = fixture()["input"]
            write_bundle(run, source)
            subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), "replay", "--input", str(source),
                            "--output", str(history)], check=True, capture_output=True)
            subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), "audit", "--history", str(history),
                            "--trusted-input", str(source), "--output", str(checked)], check=True, capture_output=True)
            self.assertEqual(read_bundle(checked)["status"], "PASS")
            raw = history.read_bytes()
            write_bundle(read_bundle(history), history)
            self.assertEqual(history.read_bytes(), raw)
            result = subprocess.run([sys.executable, "-B", str(ROOT / "cli.py"), "replay", "--input", str(source),
                                     "--output", str(history), "--max-rows", "1"], capture_output=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(read_bundle(history)["status"], "INCOMPLETE")

    def test_adapter_rejects_inconsistent_legacy_budget_and_unused_effect(self):
        folder = ROOT.parent / "structural-ce-v1-factory-witness"
        model = read_bundle(folder / "model.json")
        script = read_bundle(folder / "candidate.json")
        metadata = read_bundle(ROOT / "cases/factory/metadata.json")
        model["decisions"]["D11"]["cost"] = 4
        with self.assertRaises(InputError):
            adapt(model, script, metadata, {})
        model = read_bundle(folder / "model.json")
        model["events"]["E_BANK"]["outcomes"]["rejected"]["schedule"] = {"id": "E_BANK", "delay": 1}
        with self.assertRaises(UnsupportedFeature):
            adapt(model, script, metadata, {})

    def test_semantic_projection_detects_intermediate_changes(self):
        folder = ROOT.parent / "structural-ce-v1-factory-witness"
        run = adapt(read_bundle(folder / "model.json"), read_bundle(folder / "candidate.json"),
                    read_bundle(ROOT / "cases/factory/metadata.json"), {})
        bundle = self.checked(run)
        old = read_bundle(folder / "results/histories/candidate.json")
        self.assertEqual(compare(old, bundle)["paths"], 2)
        for change in ("state", "failure", "order", "queue"):
            with self.subTest(change=change):
                bad = deepcopy(bundle)
                rows = bad["paths"][0]["history"]
                row = next(r for r in rows if r["kind"] == "decision_executed")
                if change == "state":
                    row["after"]["state"]["budget"] += 1
                elif change == "failure":
                    row["failures"] = [{"field": "budget", "actual": 0}]
                elif change == "queue":
                    row["after"]["pending"][-1]["due"] += 1
                else:
                    event_indices = [i for i, r in enumerate(rows) if r["step"] == 2 and r["kind"] == "event_applied"]
                    i, j = event_indices
                    rows[i], rows[j] = rows[j], rows[i]
                # Terminal state remains unchanged in every mutation.
                self.assertEqual(bad["paths"][0]["snapshot"], bundle["paths"][0]["snapshot"])
                with self.assertRaises(Divergence):
                    compare(old, bad)

    def test_case_names_absent_from_core_and_profile_is_versioned(self):
        profile = read_bundle(ROOT / "core/profile.json")
        self.assertEqual(profile["profile"], "fixed-replay/0.1")
        self.assertEqual(profile["versions"]["model"], "ce3-model/1")
        self.assertIn("event_outcome_schedules_event", profile["v1_allowed_but_unsupported_here"])
        for folder in ("core", "audit"):
            for path in (ROOT / folder).glob("*.py"):
                literals = [node.value for node in ast.walk(ast.parse(path.read_text()))
                            if isinstance(node, ast.Constant) and isinstance(node.value, str)]
                self.assertFalse(set(literals) & {"D8", "D9", "E_BANK", "T7", "E_T2", "se_team", "traffic_authorized"})


if __name__ == "__main__":
    unittest.main()
