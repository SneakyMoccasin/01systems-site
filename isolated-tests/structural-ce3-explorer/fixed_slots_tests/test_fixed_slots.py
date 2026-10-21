"""Literal population/goal oracles, direct inputs, and /2 adversarial proofs."""
from copy import deepcopy
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, encode, read_bundle, write_bundle
from contracts import LIMITS, SCRIPT_SOURCE, freeze as single_freeze
import fixed_slots
import scenario_contracts as contracts
import scenario_runner as runner


def counting_problem(n):
    """Synthetic declaration, not an evaluator: n unconditional increments."""
    p = read_bundle(ROOT / "fixtures/fixed-slots-problem.json")
    ids = ["d" + str(i) for i in range(n)]
    p["search"].update(decision_ids=ids, slots=list(range(n)))
    m = p["model"]
    m.update(domains={"count": {"integer": [0, n]}}, initial={"count": 0}, budget=None,
             events={}, initial_events=[], reference_event_order=[],
             decisions={name: {"requires": [], "effects": {"set": {}, "add": {"count": 1}},
                               "cost": 0, "schedule": None, "source": "Synthetic increment."}
                        for name in ids})
    m["clock"].update(start=0, horizon=max(0, n-1))
    p["observation"]["terminal_equals"] = {"count": n}
    p["scenario_set"]["members"] = [{"label": "only", "outcomes": {}}]
    return p


def timer_problem():
    p = counting_problem(2)
    m = p["model"]
    m.update(domains={"ready": {"enum": [False, True]}, "done": {"enum": [False, True]}},
             initial={"ready": False, "done": False})
    m["clock"].update(start=1, horizon=7)
    m["decisions"] = {
        "A": {"requires": [], "effects": {"set": {}, "add": {}}, "cost": 0,
              "schedule": {"event": "ready", "delay": 2}, "source": "Synthetic prepare."},
        "B": {"requires": [{"field": "ready", "op": "eq", "value": True}],
              "effects": {"set": {"done": True}, "add": {}}, "cost": 0,
              "schedule": None, "source": "Synthetic finish."}}
    m["events"] = {"ready": {"requires": [], "kind": "timer",
                              "outcomes": {"yes": {"set": {"ready": True}, "add": {}}},
                              "absent": None, "source": "Synthetic delay 2."}}
    m["reference_event_order"] = ["ready"]
    p["search"].update(decision_ids=["B", "A"], slots=[2, 5])
    p["observation"]["terminal_equals"] = {"ready": True, "done": True}
    return p


class FixedSlots(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="ce3-fixed-slots-tests-")
        cls.problem = read_bundle(ROOT / "fixtures/fixed-slots-problem.json")
        cls.oracle = read_bundle(ROOT / "fixtures/fixed-slots-expected.json")
        cls.manifest, cls.pins = contracts.freeze(cls.problem)
        cls.complete = Path(cls.temp.name) / "complete"
        with patch.object(runner, "cli_process", wraps=runner.cli_process) as calls:
            cls.result = runner.run(cls.problem, cls.manifest, cls.pins, cls.complete)
        cls.commands = [c.args[0] for c in calls.call_args_list]

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(self.temp.name) / self.id().split(".")[-1]

    def execute(self, problem, name="run", **kwargs):
        manifest, pins = contracts.freeze(problem)
        root = self.work / name
        result = runner.run(problem, manifest, pins, root, **kwargs)
        return root, result, pins

    def clone(self, name="copy"):
        root = self.work / name
        shutil.copytree(self.complete, root)
        return root

    def test_four_decisions_three_scenarios_exact_24_72_literal_oracle(self):
        self.assertEqual(self.commands, ["replay", "audit"] * 72)
        self.assertEqual({"".join(c["order"]) for c in self.manifest["candidates"]},
                         set(self.oracle["orders"]))
        self.assertEqual((len(self.manifest["candidates"]), len(self.result["cells"])), (24, 72))
        self.assertEqual(len({c["cell_id"] for c in self.result["cells"]}), 72)
        for axis in ("candidate_coverage", "scenario_coverage", "cell_coverage", "enumeration_coverage"):
            self.assertEqual(self.result[axis]["status"], "COMPLETE")
        for c in self.result["cells"]:
            self.assertEqual(c["run_status"], "CERTIFIED")
            self.assertIs(c["goal_satisfied"], "".join(c["order"]) in self.oracle["goals"][c["scenario_label"]])
            self.assertEqual(c["event_path_coverage"],
                             {"status": "COMPLETE", "audited_paths": 2 if c["order"][0] == "T" else 1})
        self.assertEqual({"".join(c["order"]) for c in self.result["candidates"] if c["robust"] == "TRUE"},
                         set(self.oracle["robust_true"]))
        self.assertEqual(sum(c["goal_satisfied"] for c in self.result["cells"]), 25)
        self.assertEqual(sum(c["event_path_coverage"]["audited_paths"] for c in self.result["cells"]), 90)

    def test_direct_full_input_oracle_fixed_scripts_and_tail_timers(self):
        for c in self.result["cells"]:
            a, b, d, e = c["order"]
            expected = {"schema_version": "ce3-run/1", "profile": "fixed-replay/0.1",
                        "model": self.problem["model"], "sources": self.problem["sources"],
                        "outcomes": {"response": {"ja": "approved", "nej": "rejected", "uteblivet": "absent"}[c["scenario_label"]]},
                        "script": {"schema_version": "ce3-script/1", "source": SCRIPT_SOURCE,
                                   "steps": {"2": [{"decision": a, "mode": "attempt"}],
                                             "5": [{"decision": b, "mode": "attempt"}],
                                             "9": [{"decision": d, "mode": "attempt"}],
                                             "12": [{"decision": e, "mode": "attempt"}]}}}
            directory = self.complete / "runs" / c["cell_id"]
            self.assertEqual(read_bundle(directory / "input.json"), expected)
            self.assertEqual(c["input_identity"], digest(expected))
            rows = read_bundle(directory / "history.json.gz")["paths"][0]["history"]
            self.assertEqual(rows[-1]["step"], 14)
            self.assertTrue(rows[-1]["after"]["state"]["tail"])
            self.assertEqual(rows[-1]["after"]["pending"], [])
            self.assertEqual([r["step"] for r in rows if r["kind"] == "event_applied" and r["action"] == "tail_event"],
                             [[4, 7, 11, 14][c["order"].index("T")]])
            self.assertEqual([r["step"] for r in rows if r["kind"] == "step_end"], list(range(1, 15)))
        for plan in self.manifest["candidates"]:
            group = [c for c in self.result["cells"] if c["candidate_id"] == plan["candidate_id"]]
            self.assertEqual(len({digest(read_bundle(self.complete / "runs" / c["cell_id"] / "input.json")["script"])
                                  for c in group}), 1)

    def test_two_decisions_exact_orders_timer_gap_and_horizon(self):
        root, result, _ = self.execute(timer_problem())
        self.assertEqual({tuple(c["order"]) for c in result["cells"]}, {("A", "B"), ("B", "A")})
        for c in result["cells"]:
            self.assertIs(c["goal_satisfied"], c["order"] == ["A", "B"])
            rows = read_bundle(root / "runs" / c["cell_id"] / "history.json.gz")["paths"][0]["history"]
            self.assertEqual([r["step"] for r in rows if r["kind"] == "event_applied"],
                             [4] if c["order"] == ["A", "B"] else [7])
            self.assertTrue(rows[-1]["after"]["state"]["ready"])
        p = timer_problem()
        p["model"]["clock"]["horizon"] = 6
        root, result, _ = self.execute(p, "shorter")
        ba = next(c for c in result["cells"] if c["order"] == ["B", "A"])
        last = read_bundle(root / "runs" / ba["cell_id"] / "history.json.gz")["paths"][0]["history"][-1]
        self.assertFalse(last["after"]["state"]["ready"])
        self.assertEqual(last["after"]["pending"][0]["due"], 7)

    def test_minimum_one_decision_inclusive_timer_and_censored_tail(self):
        p = timer_problem()
        del p["model"]["decisions"]["B"]
        p["search"].update(decision_ids=["A"], slots=[4])
        p["model"]["clock"]["horizon"] = 6
        p["observation"]["terminal_equals"] = {"ready": True}
        for horizon, goal in ((6, True), (5, False)):
            p["model"]["clock"]["horizon"] = horizon
            _, result, _ = self.execute(p, str(horizon))
            self.assertEqual(result["search_size"]["candidates"], 1)
            self.assertEqual(result["cells"][0]["run_status"], "CERTIFIED")
            self.assertIs(result["cells"][0]["goal_satisfied"], goal)
            self.assertEqual(result["candidates"][0]["robust"], "TRUE" if goal else "FALSE")

    def test_five_decisions_120_independent_population_without_cartesian(self):
        p = counting_problem(5)
        with patch.object(contracts, "permutations", side_effect=AssertionError("generator used by oracle")), \
             patch.object(contracts, "product", side_effect=AssertionError("n^n enumeration")), \
             patch.object(contracts, "generate", side_effect=AssertionError("generator used by oracle")):
            manifest, pins = contracts.freeze(p)
        orders = [tuple(c["order"]) for c in manifest["candidates"]]
        self.assertEqual(len(orders), 120)
        self.assertEqual(len(set(orders)), 120)
        self.assertTrue(all(len(o) == 5 and set(o) == {"d0", "d1", "d2", "d3", "d4"} for o in orders))
        # Membership + uniqueness + independent 5!=120 count exhaust the domain.
        with patch.object(contracts, "expected_orders", side_effect=AssertionError("oracle used by generator")):
            generated = contracts.generate(p)
        self.assertEqual(contracts.check_population(manifest, generated)["status"], "COMPLETE")
        contracts.verify_frozen(p, manifest, pins)

    def test_maximum_bounds_and_oversize_gate_before_materialization(self):
        p = counting_problem(6)
        p["scenario_set"]["members"] *= 3
        for i in range(3):
            p["scenario_set"]["members"][i] = {"label": str(i), "outcomes": {}}
        self.assertEqual(fixed_slots.search_size(p)["cells"], 2160)
        manifest, _ = contracts.freeze(p)
        self.assertEqual((len(manifest["candidates"]), len(manifest["cells"])), (720, 2160))
        too_many_scenarios = counting_problem(1)
        too_many_scenarios["scenario_set"]["members"] *= 2161
        for bad in (counting_problem(7), counting_problem(10000), too_many_scenarios,
                    dict(p, scenario_set=dict(p["scenario_set"], members=p["scenario_set"]["members"] * 2))):
            with self.subTest(n=len(bad["search"]["decision_ids"])), \
                 patch.object(contracts, "candidate", side_effect=AssertionError("materialized")), \
                 patch.object(contracts, "single_input", side_effect=AssertionError("materialized")), \
                 patch.object(contracts, "expected_orders", side_effect=AssertionError("enumerated")), \
                 patch.object(contracts, "permutations", side_effect=AssertionError("enumerated")):
                for operation in (contracts.freeze, contracts.generate):
                    with self.assertRaisesRegex(ValueError, "Unsupported search size"):
                        operation(bad)
                with self.assertRaisesRegex(ValueError, "Unsupported search size"):
                    runner.run(bad, {}, {}, self.work, max_cells=0)
        self.assertFalse(self.work.exists())

    def test_invalid_declarations_rejected(self):
        mutations = [
            ("slots", []), ("slots", [2]), ("slots", [2, 2]), ("slots", [5, 2]),
            ("slots", [2, 8]), ("slots", [0, 5]), ("slots", [True, 5]),
            ("slots", [2.0, 5]), ("slots", ["2", 5]), ("slots", None),
            ("decision_ids", []), ("decision_ids", ["A", "A"]),
            ("decision_ids", ["A", "missing"]), ("decision_ids", ["A", " "]),
            ("mode", "if_not_taken"), ("retry", True), ("early_stop", True),
            ("kind", "permutations_once/1")]
        for key, value in mutations:
            p = timer_problem(); p["search"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                contracts.freeze(p)
        for field, value in (("horizon", 0), ("horizon", 4), ("horizon", True),
                             ("horizon", 7.0), ("horizon", "7"), ("start", 3),
                             ("step", 2), ("events_before_decisions", False), ("horizon_inclusive", False)):
            p = timer_problem(); p["model"]["clock"][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                contracts.freeze(p)
        for key in ("horizon", "start"):
            p = timer_problem(); del p["model"]["clock"][key]
            with self.assertRaises(ValueError): contracts.freeze(p)

    def test_negative_time_and_single_step_follow_replay_contract(self):
        for start, slot, horizon in ((-5, -3, -1), (4, 4, 4)):
            p = counting_problem(1)
            p["model"]["clock"].update(start=start, horizon=horizon)
            p["search"]["slots"] = [slot]
            _, result, _ = self.execute(p, str(start))
            self.assertTrue(result["cells"][0]["goal_satisfied"])

    def test_input_order_independent_and_renamed_decisions_preserve_analysis(self):
        p = deepcopy(self.problem)
        p["search"]["decision_ids"].reverse()
        p["model"]["decisions"] = dict(reversed(list(p["model"]["decisions"].items())))
        manifest, _ = contracts.freeze(p)
        self.assertEqual(manifest["candidates"], self.manifest["candidates"])
        self.assertEqual([c["input_identity"] for c in contracts.generate(p)],
                         [c["input_identity"] for c in contracts.generate(self.problem)])
        names = {"P": "z_prepare", "Q": "a_finish", "X": "m_aux", "T": "b_tail"}
        p["model"]["decisions"] = {names[k]: v for k, v in p["model"]["decisions"].items()}
        p["search"]["decision_ids"] = [names[k] for k in p["search"]["decision_ids"]]
        p["scenario_set"]["members"].reverse()
        _, result, _ = self.execute(p)
        inverse = {v: k for k, v in names.items()}
        for c in result["cells"]:
            order = "".join(inverse[k] for k in c["order"])
            self.assertIs(c["goal_satisfied"], order in self.oracle["goals"][c["scenario_label"]])

    def test_missing_duplicate_unexpected_misbound_candidates_and_cells(self):
        for target in ("candidates", "cells"):
            for kind in ("missing", "duplicate", "unexpected", "misbound"):
                manifest = deepcopy(self.manifest)
                members = manifest[target]
                if kind == "missing": members.pop()
                elif kind == "duplicate": members[-1] = deepcopy(members[0])
                elif kind == "unexpected": members[-1]["candidate_id" if target == "candidates" else "cell_id"] = "0" * 64
                elif target == "candidates": members[-1]["order"].reverse()
                else: members[-1]["input_identity"] = "0" * 64
                pins = dict(self.pins, manifest_id=digest(manifest))
                with self.subTest(target=target, kind=kind), self.assertRaises(ValueError):
                    contracts.verify_frozen(self.problem, manifest, pins)
        generated = contracts.generate(self.problem)
        for kind in ("missing", "duplicate", "unexpected", "misbound"):
            cells = deepcopy(generated)
            if kind == "missing": cells.pop()
            elif kind == "duplicate": cells[-1] = cells[0]
            elif kind == "unexpected": cells[-1]["cell_id"] = "0" * 64
            else: cells[-1]["candidate_id"] = "0" * 64
            root = self.clone(kind)
            write_bundle(cells, root / "enumeration.json")
            result = runner.verify(root, self.pins)
            self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE" if kind == "missing" else "INVALID")
            self.assertEqual(result["cell_coverage"]["certified"], 72)

    def test_consistently_rehashed_omissions_rejected_against_problem(self):
        for target in ("candidate", "cell"):
            root = self.clone(target)
            manifest = deepcopy(self.manifest)
            if target == "candidate":
                key = manifest["candidates"].pop()["candidate_id"]
                removed = {c["cell_id"] for c in manifest["cells"] if c["candidate_id"] == key}
            else:
                removed = {manifest["cells"][-1]["cell_id"]}
            manifest["cells"] = [c for c in manifest["cells"] if c["cell_id"] not in removed]
            manifest["search_size"].update(candidates=len(manifest["candidates"]), cells=len(manifest["cells"]))
            pins = dict(self.pins, manifest_id=digest(manifest))
            spec = read_bundle(root / "batch.json")
            spec.update(manifest_id=digest(manifest), max_cells=len(manifest["cells"]), search_size=manifest["search_size"])
            attempt = read_bundle(root / "attempt.json"); attempt["batch_spec_id"] = digest(spec)
            result = deepcopy(self.result)
            result["cells"] = [c for c in result["cells"] if c["cell_id"] not in removed]
            result["candidates"] = [c for c in result["candidates"] if c["candidate_id"] in
                                    {p["candidate_id"] for p in manifest["candidates"]}]
            result.update(manifest_id=digest(manifest), batch_spec_id=digest(spec), search_size=manifest["search_size"])
            result["execution_budget"]["max_cells"] = len(manifest["cells"])
            result["enumeration_coverage"] = contracts.check_population(manifest, manifest["cells"])
            result["cell_coverage"].update(expected=len(manifest["cells"]), certified=len(manifest["cells"]))
            result["candidate_coverage"].update(expected=len(manifest["candidates"]), certified_represented=len(manifest["candidates"]))
            for c in result["candidates"]:
                group = [row for row in result["cells"] if row["candidate_id"] == c["candidate_id"]]
                c.update(cell_ids=[row["cell_id"] for row in group], expected_scenarios=len(group),
                         certified_cells=len(group), robust=runner.robust(group))
            for key in removed: shutil.rmtree(root / "runs" / key)
            for c in manifest["cells"]:
                directory = root / "runs" / c["cell_id"]
                record = read_bundle(directory / "record.json")
                base = runner.base_record(c, spec, attempt["batch_attempt_id"], record["run_id"])
                obs = read_bundle(directory / "observation.json"); obs["batch_spec_id"] = digest(spec)
                record.update(base, observation_id=digest(obs))
                next(row for row in result["cells"] if row["cell_id"] == c["cell_id"])["observation_id"] = digest(obs)
                for name, value in (("started", base), ("record", record), ("observation", obs)):
                    write_bundle(value, directory / (name + ".json"))
            result.pop("result_id"); result["result_id"] = digest(result)
            for name, value in (("manifest", manifest), ("pins", pins), ("batch", spec), ("attempt", attempt),
                                ("enumeration", manifest["cells"]), ("result", result)):
                write_bundle(value, root / (name + ".json"))
            self.assertEqual(contracts.check_population(manifest, manifest["cells"])["status"], "COMPLETE")
            with self.assertRaisesRegex(ValueError, "identity mismatch"):
                runner.verify(root, pins)

    def test_partial_and_zero_budget_keep_entire_population(self):
        for budget in (0, 1, 4):
            root, result, _ = self.execute(self.problem, str(budget), max_cells=budget)
            self.assertEqual(result["search_size"]["cells"], 72)
            self.assertEqual(result["cell_coverage"]["expected"], 72)
            self.assertEqual(result["cell_coverage"]["certified"], budget)
            self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
            self.assertEqual(result["enumeration_coverage"]["status"], "COMPLETE")
            self.assertEqual(len(read_bundle(root / "enumeration.json")), 72)
            unknown = [c for c in result["cells"] if c["run_status"] == "NOT_RUN"]
            self.assertEqual(len(unknown), 72-budget)
            self.assertTrue(all(c["goal_satisfied"] is None and c["goal_status"] == "UNKNOWN" for c in unknown))
            self.assertTrue(all(c["robust"] == "UNKNOWN" for c in result["candidates"] if not c["certified_cells"]))
            if budget == 1:
                self.assertEqual(result["candidates"][0]["robust"], "UNKNOWN")
            if budget == 4:
                self.assertEqual(result["candidates"][0]["robust"], "FALSE")

    def test_gzip_and_audit_failure_are_unknown_and_verify_is_read_only(self):
        good = next(c for c in self.result["cells"] if c["order"] == list("PXQT") and c["scenario_label"] == "ja")
        for damage in ("gzip", "audit"):
            root = self.clone(damage)
            directory = root / "runs" / good["cell_id"]
            if damage == "gzip":
                path = directory / "history.json.gz"; path.write_bytes(path.read_bytes()[:-8])
            else: write_bundle({"status": "FAIL"}, directory / "audit.json")
            write_bundle({"cell_coverage": "COMPLETE", "robust": "TRUE"}, root / "result.json")
            before = {str(p): p.read_bytes() for p in root.rglob("*") if p.is_file()}
            with patch.object(runner, "cli_process", side_effect=AssertionError("verify replayed")):
                result = runner.verify(root, self.pins)
            self.assertEqual(before, {str(p): p.read_bytes() for p in root.rglob("*") if p.is_file()})
            self.assertEqual(result["cell_coverage"]["certified"], 71)
            damaged = next(c for c in result["cells"] if c["cell_id"] == good["cell_id"])
            self.assertEqual(damaged["goal_status"], "UNKNOWN")
            self.assertIsNone(damaged["goal_satisfied"])
            self.assertEqual(next(c for c in result["candidates"] if c["order"] == list("PXQT"))["robust"], "UNKNOWN")

    def test_projection_coverage_does_not_replace_cells_or_robustness(self):
        root = self.clone()
        for order, label in (("PXQT", "ja"), ("PQXT", "ja")):
            c = next(c for c in self.result["cells"] if c["order"] == list(order) and c["scenario_label"] == label)
            shutil.rmtree(root / "runs" / c["cell_id"])
        result = runner.verify(root, self.pins)
        self.assertEqual(result["candidate_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["scenario_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
        self.assertEqual(result["cell_coverage"]["certified"], 70)
        self.assertEqual(next(c for c in result["candidates"] if c["order"] == list("PXQT"))["robust"], "UNKNOWN")
        self.assertEqual(next(c for c in result["candidates"] if c["order"] == list("PQXT"))["robust"], "FALSE")

    def test_outcome_only_scope_and_spec_size_binding(self):
        for field, value in (("model", self.problem["model"]), ("slots", [2, 3, 4, 5]),
                             ("horizon", 20), ("script", {})):
            p = deepcopy(self.problem)
            p["scenario_set"]["members"][0][field] = value
            with self.assertRaises(ValueError): contracts.freeze(p)
        for outcomes in ({}, {"response": "not_declared"}, {"response": "approved", "extra": "absent"}):
            p = deepcopy(self.problem); p["scenario_set"]["members"][0]["outcomes"] = outcomes
            with self.assertRaises(ValueError): contracts.freeze(p)
        for name in ("count", "timeout"):
            root = self.clone(name)
            spec = read_bundle(root / "batch.json")
            if name == "count": spec["search_size"]["candidates"] = 23
            else: spec["process_timeout_seconds"] = 61
            write_bundle(spec, root / "batch.json")
            with self.assertRaisesRegex(ValueError, "Batch specification mismatch"):
                runner.verify(root, self.pins)

    def test_all_event_paths_and_missing_negative_path_never_certify(self):
        p = counting_problem(1)
        p["model"]["clock"]["horizon"] = 3
        p["model"]["events"] = {name: {"kind": "timer", "requires": [], "absent": None,
                                        "outcomes": {"apply": {"set": {"count": value}, "add": {}}},
                                        "source": "Synthetic conflicting timer."}
                                 for name, value in (("clear", 0), ("set", 1))}
        p["model"]["initial_events"] = [{"id": name, "due": 3, "scheduled_at": 0} for name in ("clear", "set")]
        p["model"]["reference_event_order"] = ["clear", "set"]
        root, result, pins = self.execute(p)
        c = result["cells"][0]
        self.assertEqual(c["event_path_coverage"]["audited_paths"], 2)
        self.assertIs(c["goal_satisfied"], False)
        directory = root / "runs" / c["cell_id"]
        obs = read_bundle(directory / "observation.json")["projection"]
        self.assertEqual([path["goal_satisfied"] for path in obs["paths"]], [True, False])
        bundle = read_bundle(directory / "history.json.gz")
        bundle["paths"].pop()
        write_bundle(bundle, directory / "history.json.gz")
        base = read_bundle(directory / "started.json")
        record = read_bundle(directory / "record.json")
        record.update(runner.artifact_record(base, directory))
        write_bundle(record, directory / "record.json")
        result = runner.verify(root, pins)
        self.assertEqual(result["cells"][0]["goal_status"], "UNKNOWN")
        self.assertEqual(result["candidates"][0]["robust"], "UNKNOWN")
        _, limited, _ = self.execute(p, "limit", limits=dict(LIMITS, max_paths=1))
        self.assertEqual(limited["cells"][0]["event_path_coverage"]["status"], "UNKNOWN")

    def test_replay_limits_model_error_and_invalid_budgets(self):
        for name, limits in (("steps", dict(LIMITS, max_steps=2)), ("rows", dict(LIMITS, max_rows=2))):
            _, result, _ = self.execute(timer_problem(), name, limits=limits)
            self.assertTrue(all(c["goal_status"] == "UNKNOWN" for c in result["cells"]))
        p = counting_problem(1); p["model"]["decisions"]["d0"]["effects"]["add"]["count"] = 2
        _, result, _ = self.execute(p, "overflow")
        self.assertEqual(result["cells"][0]["goal_status"], "UNKNOWN")
        for budget in (-1, 73, True, 1.5):
            with self.assertRaisesRegex(ValueError, "budget"):
                runner.run(self.problem, self.manifest, self.pins, self.work / "invalid", max_cells=budget)
        self.assertFalse((self.work / "invalid").exists())

    def test_versions_and_legacy_frozen_contracts_unchanged(self):
        for filename, freeze in (("problem.json", single_freeze), ("scenario-problem.json", contracts.freeze)):
            p = read_bundle(ROOT / "fixtures" / filename)
            manifest, pins = freeze(p)
            prefix = "scenario-" if filename.startswith("scenario-") else ""
            self.assertEqual(manifest, read_bundle(ROOT / "fixtures" / (prefix + ("manifest.json" if prefix else "search-manifest.json"))))
            self.assertEqual(pins, read_bundle(ROOT / "fixtures" / (prefix + "pins.json")))
            p["search"]["slots"] = [2, 5, 9]
            p["model"]["clock"]["horizon"] = 11
            with self.assertRaises(ValueError): freeze(p)
        self.assertEqual(self.manifest["schema_version"], "ce3-scenario-manifest/2")
        self.assertEqual(self.pins["schema_version"], "ce3-scenario-pins/2")
        self.assertEqual(self.result["schema_version"], "ce3-scenario-result/2")
        self.assertEqual(self.result["execution_budget"]["process_timeout_seconds"], 60)
        self.assertEqual(self.result["execution_budget"]["limits"], LIMITS)
        for name in ("batch", "attempt"):
            self.assertTrue(read_bundle(self.complete / (name + ".json"))["schema_version"].endswith("/2"))

    def test_cli_freeze_run_verify_and_rejection_exit_codes(self):
        self.work.mkdir()
        p = counting_problem(1)
        write_bundle(p, self.work / "problem.json")
        def cli(*args):
            return subprocess.run([sys.executable, "-B", str(ROOT / "scenario_runner.py"), *map(str, args)],
                                  capture_output=True, text=True)
        frozen = self.work / "frozen"; output = self.work / "run"
        call = cli("freeze", "--problem", self.work / "problem.json", "--output", frozen)
        self.assertEqual(call.returncode, 0, call.stderr)
        self.assertIn("Declared search size", call.stdout)
        run = cli("run", "--problem", self.work / "problem.json", "--manifest", frozen / "manifest.json",
                  "--pins", frozen / "pins.json", "--output", output)
        verify = cli("verify", "--pins", frozen / "pins.json", "--output", output)
        self.assertEqual((run.returncode, verify.returncode), (0, 0), run.stderr + verify.stderr)
        self.assertEqual(run.stdout, verify.stdout)
        partial = cli("run", "--problem", self.work / "problem.json", "--manifest", frozen / "manifest.json",
                      "--pins", frozen / "pins.json", "--output", self.work / "partial", "--max-cells", 0)
        self.assertEqual(partial.returncode, 2, partial.stderr)
        write_bundle(counting_problem(7), self.work / "large.json")
        large = cli("freeze", "--problem", self.work / "large.json", "--output", self.work / "large")
        self.assertEqual(large.returncode, 1)
        self.assertIn("Unsupported search size", large.stderr)
        self.assertFalse((self.work / "large").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
