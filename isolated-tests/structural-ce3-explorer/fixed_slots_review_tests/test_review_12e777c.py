"""Independent falsification of 12e777c. No production helpers as test oracles.

R1 regression now requires rejection of the contradictory execution budget.
All artifact mutations occur only in private temporary copies.
"""
from copy import deepcopy
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, encode, read_bundle, write_bundle
import contracts as single
import fixed_slots
import scenario_contracts as contract
import scenario_runner as runner

# Derived from rules before consulting the saved expected fixture: Q requires
# P; approved supplies ready, absent needs earlier X, rejected also needs X
# after time 4 (not in slot 2). T's latest timer is at inclusive horizon 14.
GOALS = {
    "ja": set("PQXT PQTX PXQT PXTQ PTQX PTXQ XPQT XPTQ XTPQ TPQX TPXQ TXPQ".split()),
    "nej": set("PXQT PXTQ PTXQ TPXQ TXPQ".split()),
    "uteblivet": set("PXQT PXTQ PTXQ XPQT XPTQ XTPQ TPXQ TXPQ".split()),
}
ROBUST = set("PXQT PXTQ PTXQ TPXQ TXPQ".split())
SCRIPT_SOURCE = "CE3 minimal explorer: fixed permutation, one attempt per slot; synthetic integration test."


def insertion_orders(ids):
    """Third enumeration algorithm: insert each symbol at every position.

    Neither factorial unranking, itertools permutations/product, nor any
    production enumeration/materialization helper is used as an oracle.
    """
    orders = [()]
    for name in ids:
        orders = [old[:i] + (name,) + old[i:] for old in orders for i in range(len(old) + 1)]
    return set(orders)


def flags_problem(n=2, scenarios=1):
    ids = ["D" + str(i) for i in range(n)]
    model = {
        "schema_version": "ce3-model/1", "source": "Independent synthetic flag decisions.",
        "clock": {"start": -2, "horizon": 2*n, "step": 1, "unit": "test_tick",
                  "events_before_decisions": True, "horizon_inclusive": True},
        "domains": {name: {"enum": [False, True]} for name in ids},
        "initial": {name: False for name in ids}, "budget": None,
        "decisions": {name: {"requires": [], "effects": {"set": {name: True}, "add": {}},
                             "cost": 0, "schedule": None, "source": "Set own flag."} for name in ids},
        "events": {}, "initial_events": [], "reference_event_order": [],
        "metadata": {"assumption": "Synthetic review model.", "time_basis": "Unit integer ticks.", "deadlines": []},
    }
    return {"schema_version": "ce3-scenario-problem/2", "revision": 1,
            "purpose": "synthetic_integration_test", "profile": "fixed-replay/0.1", "model": model,
            "sources": {}, "search": {"kind": "permutations_once/2", "decision_ids": ids[::-1],
                                      "slots": [2*i for i in range(n)], "mode": "attempt",
                                      "retry": False, "early_stop": False},
            "observation": {"schema_version": "ce3-terminal-goal/1", "goal_id": "all_flags",
                            "sampling": "last_row.after", "quantifier": "all_event_paths",
                            "terminal_equals": {name: True for name in ids}, "all_attempts_accepted": True},
            "scenario_set": {"schema_version": "ce3-scenario-set/1", "variation": "outcomes_only",
                             "selection": "explicit_complete_list",
                             "members": [{"label": "s" + str(i), "outcomes": {}} for i in range(scenarios)]}}


def timer(field, value):
    return {"kind": "timer", "requires": [], "outcomes": {"tick": {"set": {field: value}, "add": {}}},
            "absent": None, "source": "Independent review timer."}


def window_problem():
    """New resource/expiry model, deliberately unrelated to P/Q/X/T."""
    p = flags_problem()
    m = p["model"]
    m["clock"].update(start=-5, horizon=2)
    m["domains"] = {"gate": {"enum": [False, True]}, "token": {"integer": [0, 1]},
                    "done": {"enum": [False, True]}, "settled": {"enum": [False, True]}}
    m["initial"] = {"gate": False, "token": 0, "done": False, "settled": False}
    m["decisions"] = {
        "reserve": {"requires": [{"field": "gate", "op": "eq", "value": True}],
                    "effects": {"set": {"token": 1}, "add": {}}, "cost": 0,
                    "schedule": {"event": "settle", "delay": 4}, "source": "Reserve during open window."},
        "use": {"requires": [{"field": "token", "op": "ge", "value": 1}],
                "effects": {"set": {"done": True}, "add": {"token": -1}}, "cost": 0,
                "schedule": None, "source": "Consume token once."}}
    m["events"] = {"open": timer("gate", True), "close": timer("gate", False), "settle": timer("settled", True)}
    m["initial_events"] = [{"id": "open", "due": -4, "scheduled_at": -5},
                           {"id": "close", "due": -1, "scheduled_at": -5}]
    m["reference_event_order"] = ["open", "close", "settle"]
    p["search"].update(decision_ids=["use", "reserve"], slots=[-3, 0])
    p["observation"]["terminal_equals"] = {"done": True, "settled": True, "token": 0}
    return p


def cli(*args):
    return subprocess.run([sys.executable, "-B", str(ROOT / "scenario_runner.py"), *map(str, args)],
                          capture_output=True, text=True, timeout=120)


def bytes_tree(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file()}


def rebind_spec(root, spec):
    """Attacker repairs all wrapper bindings; preserves actual inputs/histories."""
    attempt = read_bundle(root / "attempt.json")
    attempt["batch_spec_id"] = digest(spec)
    write_bundle(spec, root / "batch.json")
    write_bundle(attempt, root / "attempt.json")
    for directory in (root / "runs").iterdir():
        record = read_bundle(directory / "record.json")
        base = runner.base_record(record["cell"], spec, attempt["batch_attempt_id"], record["run_id"])
        obs = read_bundle(directory / "observation.json")
        obs["batch_spec_id"] = digest(spec)
        record.update(base, observation_id=digest(obs))
        for name, value in (("started", base), ("record", record), ("observation", obs)):
            write_bundle(value, directory / (name + ".json"))


class Review12e777c(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="ce3-review-12e777c-tests-")
        cls.base = Path(cls.tmp.name)
        cls.problem = read_bundle(ROOT / "fixtures/fixed-slots-problem.json")
        cls.complete, cls.frozen = cls.base / "complete", cls.base / "frozen"
        freeze = cli("freeze", "--problem", ROOT / "fixtures/fixed-slots-problem.json", "--output", cls.frozen)
        if freeze.returncode: raise AssertionError(freeze.stderr)
        cls.manifest = read_bundle(cls.frozen / "manifest.json")
        cls.pins = read_bundle(cls.frozen / "pins.json")
        run = cli("run", "--problem", ROOT / "fixtures/fixed-slots-problem.json",
                  "--manifest", cls.frozen / "manifest.json", "--pins", cls.frozen / "pins.json", "--output", cls.complete)
        if run.returncode: raise AssertionError(run.stderr)
        verify = cli("verify", "--pins", cls.frozen / "pins.json", "--output", cls.complete)
        if verify.returncode or verify.stdout != run.stdout: raise AssertionError(verify.stderr)
        cls.result = read_bundle(cls.complete / "result.json")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def setUp(self):
        self.work = self.base / self.id().split(".")[-1]

    def clone(self, suffix="copy"):
        root = self.work / suffix
        shutil.copytree(self.complete, root)
        return root

    def execute(self, problem, suffix="run", **kwargs):
        manifest, pins = contract.freeze(problem)
        root = self.work / suffix
        return root, runner.run(problem, manifest, pins, root, **kwargs), pins

    def row(self, result=None, order="PXQT", label="ja"):
        return next(c for c in (self.result if result is None else result)["cells"]
                    if c["order"] == list(order) and c["scenario_label"] == label)

    def test_01_full_fixture_rule_oracle_and_direct_input(self):
        expected_orders = insertion_orders(("T", "X", "P", "Q"))
        self.assertEqual({tuple(c["order"]) for c in self.manifest["candidates"]}, expected_orders)
        self.assertEqual(len(expected_orders), 24)
        self.assertEqual((len(self.result["cells"]), self.result["cell_coverage"]["certified"]), (72, 72))
        self.assertEqual(sum(c["event_path_coverage"]["audited_paths"] for c in self.result["cells"]), 90)
        for c in self.result["cells"]:
            order, label = "".join(c["order"]), c["scenario_label"]
            self.assertIs(c["goal_satisfied"], order in GOALS[label], (order, label))
            a, b, d, e = c["order"]
            expected = {"schema_version": "ce3-run/1", "profile": "fixed-replay/0.1",
                        "model": self.problem["model"], "sources": {},
                        "outcomes": {"response": {"ja": "approved", "nej": "rejected", "uteblivet": "absent"}[label]},
                        "script": {"schema_version": "ce3-script/1", "source": SCRIPT_SOURCE,
                                   "steps": {"2": [{"decision": a, "mode": "attempt"}],
                                             "5": [{"decision": b, "mode": "attempt"}],
                                             "9": [{"decision": d, "mode": "attempt"}],
                                             "12": [{"decision": e, "mode": "attempt"}]}}}
            directory = self.complete / "runs" / c["cell_id"]
            self.assertEqual(read_bundle(directory / "input.json"), expected)
            obs = read_bundle(directory / "observation.json")["projection"]
            for path in obs["paths"]:
                self.assertEqual(len(path["attempt_evidence"]["executed_rows"]), 4 if order in GOALS[label] else 3)
                self.assertEqual(path["terminal_state"]["budget"], 0 if order in GOALS[label] else 1)
        self.assertEqual({"".join(c["order"]) for c in self.result["candidates"] if c["robust"] == "TRUE"}, ROBUST)
        # Compare saved claims only after the independent rule-derived assertions.
        saved = read_bundle(ROOT / "fixtures/fixed-slots-expected.json")
        self.assertEqual({k: set(v) for k, v in saved["goals"].items()}, GOALS)
        for plan in self.manifest["candidates"]:
            cells = [c for c in self.result["cells"] if c["candidate_id"] == plan["candidate_id"]]
            self.assertEqual(len({digest(read_bundle(self.complete / "runs" / c["cell_id"] / "input.json")["script"])
                                  for c in cells}), 1)

    def test_02_independent_populations_one_through_six_and_limited_six_execution(self):
        counts = (1, 2, 6, 24, 120, 720)
        for n, count in enumerate(counts, 1):
            p = flags_problem(n, 3 if n == 6 else 1)
            expected = insertion_orders(p["search"]["decision_ids"])
            with patch.object(contract, "permutations", side_effect=AssertionError("oracle uses generator")), \
                 patch.object(contract, "product", side_effect=AssertionError("Cartesian explosion")):
                manifest, pins = contract.freeze(p)
            actual = [tuple(c["order"]) for c in manifest["candidates"]]
            self.assertEqual((len(actual), len(set(actual)), len(expected)), (count, count, count))
            self.assertEqual(set(actual), expected)
            with patch.object(contract, "expected_orders", side_effect=AssertionError("generator uses oracle")):
                generated = contract.generate(p)
            self.assertEqual(contract.check_population(manifest, generated)["status"], "COMPLETE")
            self.assertEqual(len(manifest["cells"]), count * (3 if n == 6 else 1))
        # Exactly six cells: two of 720 candidate orders, each in all 3 scenarios.
        result = runner.run(p, manifest, pins, self.work / "six", max_cells=6)
        self.assertEqual(result["cell_coverage"]["expected"], 2160)
        self.assertEqual(result["cell_coverage"]["certified"], 6)
        self.assertEqual(result["candidate_coverage"]["certified_represented"], 2)
        self.assertEqual(result["scenario_coverage"]["status"], "COMPLETE")
        self.assertEqual(sum(c["run_status"] == "NOT_RUN" for c in result["cells"]), 2154)
        self.assertEqual(sum(c["robust"] == "TRUE" for c in result["candidates"]), 2)
        self.assertEqual(sum(c["robust"] == "UNKNOWN" for c in result["candidates"]), 718)
        for c in result["cells"]:
            if c["run_status"] == "CERTIFIED":
                obs = read_bundle(self.work / "six" / "runs" / c["cell_id"] / "observation.json")
                self.assertEqual(len(obs["projection"]["paths"][0]["attempt_evidence"]["executed_rows"]), 6)

    def test_03_size_gate_zero_budget_and_inclusive_scenario_boundary(self):
        # Inclusive 2160 is validated up to the FIRST materialization, not run.
        for n, s in ((1, 2160), (5, 18), (6, 3)):
            with patch.object(contract, "single_input", side_effect=RuntimeError("reached envelope")):
                with self.assertRaisesRegex(RuntimeError, "reached envelope"):
                    contract.freeze(flags_problem(n, s))
        for n, s in ((0, 1), (7, 1), (1, 2161), (5, 19), (6, 4)):
            p = flags_problem(n, s)
            with self.subTest(n=n, s=s), \
                 patch.object(contract, "single_input", side_effect=AssertionError("too late")), \
                 patch.object(contract, "candidate", side_effect=AssertionError("too late")), \
                 patch.object(contract, "expected_orders", side_effect=AssertionError("too late")), \
                 patch.object(contract, "permutations", side_effect=AssertionError("too late")):
                for action in (contract.freeze, contract.generate):
                    with self.assertRaises(ValueError): action(p)
                with self.assertRaises(ValueError): runner.run(p, {}, {}, self.work, max_cells=0)
        self.assertFalse(self.work.exists())

    def test_04_new_window_model_negative_times_and_all_input_fields(self):
        p = window_problem()
        root, result, _ = self.execute(p)
        for c in result["cells"]:
            success = c["order"] == ["reserve", "use"]
            self.assertEqual(c["run_status"], "CERTIFIED")
            self.assertIs(c["goal_satisfied"], success)
            a, b = c["order"]
            expected = {"schema_version": "ce3-run/1", "profile": "fixed-replay/0.1", "model": p["model"],
                        "sources": {}, "outcomes": {}, "script": {"schema_version": "ce3-script/1",
                        "source": SCRIPT_SOURCE, "steps": {"-3": [{"decision": a, "mode": "attempt"}],
                                                           "0": [{"decision": b, "mode": "attempt"}]}}}
            directory = root / "runs" / c["cell_id"]
            self.assertEqual(read_bundle(directory / "input.json"), expected)
            rows = read_bundle(directory / "history.json.gz")["paths"][0]["history"]
            self.assertEqual([(r["action"], r["step"]) for r in rows if r["kind"] == "event_applied"],
                             [("open", -4), ("close", -1)] + ([("settle", 1)] if success else []))
            self.assertEqual([r["step"] for r in rows if r["kind"] == "step_end"], list(range(-5, 3)))

    def test_05_single_step_events_at_and_after_inclusive_horizon(self):
        p = flags_problem(1)
        p["model"]["clock"].update(start=7, horizon=7)
        p["search"]["slots"] = [7]
        p["model"]["events"] = {"set": timer("D0", True), "clear": timer("D0", False)}
        p["model"]["reference_event_order"] = ["set", "clear"]
        p["model"]["initial_events"] = [{"id": "set", "due": 7, "scheduled_at": 7},
                                           {"id": "clear", "due": 8, "scheduled_at": 7}]
        for horizon, success in ((7, True), (8, False), (9, False)):
            p["model"]["clock"]["horizon"] = horizon
            root, result, _ = self.execute(p, str(horizon))
            c = result["cells"][0]
            self.assertIs(c["goal_satisfied"], success)
            rows = read_bundle(root / "runs" / c["cell_id"] / "history.json.gz")["paths"][0]["history"]
            self.assertEqual([(r["kind"], r["action"], r["step"]) for r in rows if r["kind"] in ("event_applied", "decision_executed")],
                             [("event_applied", "set", 7), ("decision_executed", "D0", 7)] +
                             ([] if horizon == 7 else [("event_applied", "clear", 8)]))
            self.assertEqual(len(rows[-1]["after"]["pending"]), 1 if horizon == 7 else 0)

    def test_06_validation_missing_model_decisions_and_strict_types(self):
        mutations = [("slots", []), ("slots", [0]), ("slots", [0, 0]), ("slots", [2, 0]),
                     ("slots", [False, 2]), ("slots", [0.0, 2]), ("slots", ["0", 2]),
                     ("slots", [-3, 2]), ("slots", [0, 5]), ("decision_ids", ["D0", "D0"]),
                     ("decision_ids", ["D0", "unknown"]), ("decision_ids", ["D0", True])]
        for key, value in mutations:
            p = flags_problem(); p["search"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): contract.freeze(p)
        # An unused but valid model decision is NOT optional in this grammar.
        p = flags_problem(); p["search"].update(decision_ids=["D0"], slots=[0])
        with self.assertRaisesRegex(ValueError, "all model decisions"): contract.freeze(p)
        for key, value in (("horizon", -3), ("horizon", 1), ("horizon", True), ("horizon", 4.0),
                           ("start", False), ("step", True), ("horizon_inclusive", 1)):
            p = flags_problem(); p["model"]["clock"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): contract.freeze(p)

    def test_07_all_event_paths_negative_branch_and_limits(self):
        p = flags_problem(1)
        p["model"]["events"] = {"clear": timer("D0", False), "set": timer("D0", True)}
        p["model"]["initial_events"] = [{"id": name, "due": 2, "scheduled_at": -2} for name in ("clear", "set")]
        p["model"]["reference_event_order"] = ["clear", "set"]
        root, result, pins = self.execute(p)
        c = result["cells"][0]; directory = root / "runs" / c["cell_id"]
        obs = read_bundle(directory / "observation.json")["projection"]
        self.assertEqual([path["goal_satisfied"] for path in obs["paths"]], [True, False])
        self.assertFalse(c["goal_satisfied"])
        bundle = read_bundle(directory / "history.json.gz"); bundle["paths"].pop()
        write_bundle(bundle, directory / "history.json.gz")
        record = read_bundle(directory / "record.json")
        record.update(runner.artifact_record(read_bundle(directory / "started.json"), directory))
        write_bundle(record, directory / "record.json")
        damaged = runner.verify(root, pins)
        self.assertEqual(damaged["cells"][0]["goal_status"], "UNKNOWN")
        self.assertIn("Incomplete permutation coverage", damaged["cells"][0]["reason"])
        for key in ("max_paths", "max_rows", "max_steps"):
            limits = dict(single.LIMITS); limits[key] = 1
            _, result, _ = self.execute(p, key, limits=limits)
            self.assertEqual(result["cells"][0]["goal_status"], "UNKNOWN")
            self.assertEqual(result["candidates"][0]["robust"], "UNKNOWN")

    def test_08_rehashed_population_omissions_rejected(self):
        for target in ("candidate", "cell"):
            root = self.clone(target); manifest = deepcopy(self.manifest)
            if target == "candidate":
                key = manifest["candidates"].pop()["candidate_id"]
                remove = {c["cell_id"] for c in manifest["cells"] if c["candidate_id"] == key}
            else: remove = {manifest["cells"][-1]["cell_id"]}
            manifest["cells"] = [c for c in manifest["cells"] if c["cell_id"] not in remove]
            manifest["search_size"].update(candidates=len(manifest["candidates"]), cells=len(manifest["cells"]))
            pins = dict(self.pins, manifest_id=digest(manifest))
            for key in remove: shutil.rmtree(root / "runs" / key)
            spec = read_bundle(root / "batch.json")
            spec.update(manifest_id=digest(manifest), max_cells=len(manifest["cells"]), search_size=manifest["search_size"])
            rebind_spec(root, spec)
            result = deepcopy(self.result)
            result.update(manifest_id=digest(manifest), batch_spec_id=digest(spec), search_size=manifest["search_size"])
            result["cells"] = [c for c in result["cells"] if c["cell_id"] not in remove]
            result["candidates"] = [c for c in result["candidates"] if c["candidate_id"] in {p["candidate_id"] for p in manifest["candidates"]}]
            result["candidate_coverage"].update(expected=len(manifest["candidates"]), certified_represented=len(manifest["candidates"]))
            result["cell_coverage"].update(expected=len(manifest["cells"]), certified=len(manifest["cells"]))
            result["enumeration_coverage"] = contract.check_population(manifest, manifest["cells"])
            result["execution_budget"]["max_cells"] = len(manifest["cells"])
            for c in result["cells"]:
                c["observation_id"] = read_bundle(root / c["record_ref"])["observation_id"]
            for c in result["candidates"]:
                group = [row for row in result["cells"] if row["candidate_id"] == c["candidate_id"]]
                c.update(expected_scenarios=len(group), certified_cells=len(group),
                         cell_ids=[row["cell_id"] for row in group], robust=runner.robust(group))
            result.pop("result_id"); result["result_id"] = digest(result)
            for name, obj in (("manifest", manifest), ("pins", pins), ("enumeration", manifest["cells"]), ("result", result)):
                write_bundle(obj, root / (name + ".json"))
            self.assertEqual(result["enumeration_coverage"]["status"], "COMPLETE")
            with self.assertRaisesRegex(ValueError, "identity mismatch"): runner.verify(root, pins)
            call = cli("verify", "--output", root, "--pins", root / "pins.json")
            self.assertEqual(call.returncode, 1)
            self.assertNotIn("CERTIFIED", call.stdout)

    def test_09_exact_membership_and_payload_checks(self):
        for kind in ("missing", "duplicate", "unexpected", "misbound"):
            root = self.clone(kind); cells = deepcopy(self.manifest["cells"])
            if kind == "missing": cells.pop()
            elif kind == "duplicate": cells[-1] = deepcopy(cells[0])
            elif kind == "unexpected": cells[-1]["cell_id"] = "f" * 64
            else: cells[-1]["input_identity"] = "0" * 64
            write_bundle(cells, root / "enumeration.json")
            result = runner.verify(root, self.pins)
            self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE" if kind == "missing" else "INVALID")
            self.assertEqual(result["cell_coverage"]["certified"], 72)
        for kind in ("missing", "duplicate", "unexpected", "misbound"):
            manifest = deepcopy(self.manifest)
            if kind == "missing": manifest["candidates"].pop()
            elif kind == "duplicate": manifest["candidates"][-1] = manifest["candidates"][0]
            elif kind == "unexpected": manifest["candidates"][-1]["candidate_id"] = "0" * 64
            else: manifest["candidates"][-1]["script"]["steps"]["2"][0]["mode"] = "if_not_taken"
            with self.assertRaises(ValueError):
                contract.verify_frozen(self.problem, manifest, dict(self.pins, manifest_id=digest(manifest)))

    def test_10_changed_declarations_cannot_reuse_old_artifacts_even_rebound(self):
        for change in ("slots", "horizon", "goal", "outcomes", "decision_set"):
            p = deepcopy(self.problem)
            if change == "slots": p["search"]["slots"] = [3, 6, 10, 13]
            elif change == "horizon": p["model"]["clock"]["horizon"] = 15
            elif change == "goal": p["observation"]["terminal_equals"] = {"budget": 1}
            elif change == "outcomes": p["scenario_set"]["members"][0]["outcomes"]["response"] = "absent"
            else:
                p["model"]["decisions"]["renamed"] = p["model"]["decisions"].pop("T")
                p["search"]["decision_ids"] = ["renamed" if x == "T" else x for x in p["search"]["decision_ids"]]
            manifest, pins = contract.freeze(p)
            root = self.work / change; root.mkdir(parents=True)
            for file in self.complete.iterdir():
                if file.is_file(): shutil.copyfile(file, root / file.name)
            spec = read_bundle(root / "batch.json")
            spec.update(problem_id=digest(p), manifest_id=digest(manifest), search_size=manifest["search_size"])
            attempt = read_bundle(root / "attempt.json"); attempt["batch_spec_id"] = digest(spec)
            plans, scenarios = runner.lookups(manifest)
            for c in manifest["cells"]:
                order = ["T" if x == "renamed" else x for x in plans[c["candidate_id"]]["order"]]
                label = scenarios[c["scenario_id"]]["definition"]["label"]
                old = self.row(order=order, label=label)
                directory = root / "runs" / c["cell_id"]
                shutil.copytree(self.complete / "runs" / old["cell_id"], directory)
                record = read_bundle(directory / "record.json")
                base = runner.base_record(c, spec, attempt["batch_attempt_id"], record["run_id"])
                obs = read_bundle(directory / "observation.json")
                obs.update(problem_id=digest(p), cell_id=c["cell_id"], scenario_id=c["scenario_id"], batch_spec_id=digest(spec))
                # Rebind goal wrapper identities but keep OLD actual sampled claims.
                effective = {k: v for k, v in p.items() if k != "scenario_set"}
                effective["outcomes"] = scenarios[c["scenario_id"]]["definition"]["outcomes"]
                obs["projection"].update(problem_id=digest(effective), definition_id=digest(p["observation"]))
                record.update(base, observation_id=digest(obs))
                for name, value in (("started", base), ("record", record), ("observation", obs)):
                    write_bundle(value, directory / (name + ".json"))
            for name, value in (("problem", p), ("manifest", manifest), ("pins", pins), ("batch", spec),
                                ("attempt", attempt), ("enumeration", manifest["cells"])):
                write_bundle(value, root / (name + ".json"))
            with self.assertRaises(ValueError): runner.verify(root, self.pins)
            result = runner.verify(root, pins)
            self.assertEqual(result["cell_coverage"]["certified"], 48 if change == "outcomes" else 0, change)
            for c in result["cells"]:
                if change != "outcomes" or c["scenario_label"] == "ja":
                    self.assertIsNone(c["goal_satisfied"])

    def test_11_swapped_artifacts_with_outer_hashes_repaired(self):
        for other_order, other_label in (("PQXT", "ja"), ("PXQT", "nej")):
            for filename in ("input.json", "history.json.gz", "audit.json", "observation.json", "audit-receipt.json", "record.json"):
                root = self.clone(other_order + other_label + filename)
                target = root / "runs" / self.row()["cell_id"]
                source = root / "runs" / self.row(order=other_order, label=other_label)["cell_id"]
                shutil.copyfile(source / filename, target / filename)
                record = read_bundle(target / "record.json")
                if filename != "record.json":
                    record.update(runner.artifact_record(read_bundle(target / "started.json"), target))
                    record.update(observation_id=digest(read_bundle(target / "observation.json")),
                                  audit_receipt_id=digest(read_bundle(target / "audit-receipt.json")))
                    write_bundle(record, target / "record.json")
                result = runner.verify(root, self.pins)
                self.assertEqual(self.row(result)["goal_status"], "UNKNOWN", (filename, other_order, other_label))
                self.assertEqual(result["cell_coverage"]["certified"], 70 if filename == "record.json" else 71)

    def test_12_partial_zero_budget_projections_and_three_valued_robustness(self):
        for budget in (0, 1, 4):
            root, result, _ = self.execute(self.problem, str(budget), max_cells=budget)
            self.assertEqual(len(result["cells"]), 72)
            self.assertEqual(len(read_bundle(root / "enumeration.json")), 72)
            self.assertEqual(result["cell_coverage"]["certified"], budget)
            self.assertEqual(sum(c["run_status"] == "NOT_RUN" and c["goal_satisfied"] is None for c in result["cells"]), 72-budget)
            self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
            self.assertEqual(cli("verify", "--output", root, "--pins", self.frozen / "pins.json").returncode, 2)
        root = self.clone()
        for order in ("PXQT", "PQXT"):
            shutil.rmtree(root / "runs" / self.row(order=order)["cell_id"])
        result = runner.verify(root, self.pins)
        self.assertEqual(result["candidate_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["scenario_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
        robust = {"".join(c["order"]): c["robust"] for c in result["candidates"]}
        self.assertEqual((robust["PXQT"], robust["PQXT"], robust["PXTQ"]), ("UNKNOWN", "FALSE", "TRUE"))

    def test_13_corruption_read_only_and_stale_summary(self):
        for damage in ("header", "trailer", "deflate", "crc", "audit"):
            root = self.clone(damage); directory = root / "runs" / self.row()["cell_id"]
            path = directory / "history.json.gz"
            raw = path.read_bytes()
            if damage == "audit": write_bundle({"status": "FAIL"}, directory / "audit.json")
            else:
                if damage == "header": raw = b"XX" + raw[2:]
                elif damage == "trailer": raw = raw[:-8]
                elif damage == "deflate": raw = raw[:10] + bytes([(raw[10] & ~6) | 6]) + raw[11:]
                else: raw = raw[:-8] + bytes([raw[-8] ^ 1]) + raw[-7:]
                path.write_bytes(raw)
            write_bundle({"cell_coverage": "COMPLETE", "robust": "TRUE"}, root / "result.json")
            before = bytes_tree(root)
            with patch.object(runner, "cli_process", side_effect=AssertionError("verify replayed")):
                result = runner.verify(root, self.pins)
            self.assertEqual(result["cell_coverage"]["certified"], 71)
            self.assertEqual(self.row(result)["goal_status"], "UNKNOWN")
            self.assertEqual(cli("verify", "--output", root, "--pins", self.frozen / "pins.json").returncode, 2)
            self.assertEqual(before, bytes_tree(root))

    def test_14_previous_contract_differential_and_backend_bytes(self):
        repo = ROOT.parents[1]
        def previous(name):
            source = subprocess.check_output(["git", "show", "12e777c^:isolated-tests/structural-ce3-explorer/" + name + ".py"], cwd=repo, text=True)
            module = types.ModuleType("old_" + name); exec(compile(source, name, "exec"), module.__dict__)
            return module
        old_single = previous("contracts")
        with patch.dict(sys.modules, {"contracts": old_single}): old_cross = previous("scenario_contracts")
        for filename, old, new in (("problem.json", old_single, single), ("scenario-problem.json", old_cross, contract)):
            original = read_bundle(ROOT / "fixtures" / filename)
            variants = [original]
            for key, value in (("decision_ids", ["P", "Q"]), ("decision_ids", ["X", "Q", "P"]),
                               ("slots", [2, 5, 9]), ("slots", [False, 1, 2]), ("kind", "permutations_once/2")):
                p = deepcopy(original); p["search"][key] = value; variants.append(p)
            p = deepcopy(original); p["model"]["clock"]["horizon"] = 3; variants.append(p)
            p = deepcopy(original); p["schema_version"] = "ce3-scenario-problem/3"; variants.append(p)
            for p in variants:
                outputs = []
                for module in (old, new):
                    try: outputs.append(("accepted", module.freeze(p)))
                    except (ValueError, KeyError, TypeError): outputs.append(("rejected", None))
                self.assertEqual(outputs[0], outputs[1])
        diff = subprocess.check_output(["git", "diff", "12e777c^", "12e777c", "--",
                                        "isolated-tests/structural-ce3-replay", "isolated-tests/structural-ce3-workbench"], cwd=repo)
        self.assertEqual(diff, b"")
        pins = read_bundle(ROOT / "fixtures/backend-files.json")
        # The existing backend pins use replay-directory-relative paths.
        for name, expected in pins["files"].items():
            self.assertEqual(hashlib.sha256((ROOT.parent / "structural-ce3-replay" / name).read_bytes()).hexdigest(), expected)

    def test_15_order_and_names_are_data_not_goals(self):
        p = deepcopy(self.problem); p["search"]["decision_ids"].reverse()
        p["model"]["decisions"] = dict(reversed(list(p["model"]["decisions"].items())))
        manifest, _ = contract.freeze(p)
        self.assertEqual(manifest["candidates"], self.manifest["candidates"])
        # Novel two-decision model with names reversed lexically.
        p = window_problem(); names = {"reserve": "z", "use": "a"}
        p["model"]["decisions"] = {names[k]: v for k, v in p["model"]["decisions"].items()}
        p["search"]["decision_ids"] = ["z", "a"]
        _, result, _ = self.execute(p)
        self.assertEqual({tuple(c["order"]): c["goal_satisfied"] for c in result["cells"]},
                         {("z", "a"): True, ("a", "z"): False})

    def budget_forgery(self):
        root = self.clone()
        spec = read_bundle(root / "batch.json"); spec["max_cells"] = 0
        rebind_spec(root, spec)
        return root

    def test_16_R1_characterize_budget_contradiction(self):
        """Reject the batch contract while preserving independently valid goals."""
        root = self.budget_forgery()
        result = runner.verify(root, self.pins)
        self.assertEqual(result["execution_budget"]["max_cells"], 0)
        self.assertEqual(result["cell_coverage"]["status"], "INVALID")
        self.assertEqual(result["cell_coverage"]["certified"], 72)
        self.assertEqual([c["goal_satisfied"] for c in result["cells"]],
                         [c["goal_satisfied"] for c in self.result["cells"]])
        self.assertEqual(cli("verify", "--output", root, "--pins", self.frozen / "pins.json").returncode, 2)

    def test_17_R1_budget_contradiction_must_not_certify_complete_batch(self):
        """Regression for the missing gate at 12e777c."""
        root = self.budget_forgery()
        try:
            result = runner.verify(root, self.pins)
        except ValueError:
            return  # explicit rejection is also an acceptable future fix
        self.assertNotEqual(result["cell_coverage"]["status"], "COMPLETE")


if __name__ == "__main__":
    unittest.main(verbosity=2)
