"""Independent review probes for 7dab9a0; no production writes or fixes.

Run with unittest discovery. Every run/tampering artifact lives in TemporaryDirectory.
The expected matrix and input envelope below do not call either materializer.
"""
from copy import deepcopy
from itertools import product
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, encode, read_bundle, write_bundle
import contracts as single
import scenario_contracts as contract
import scenario_runner as runner


# Derived from rules: Q requires prepared and ready; event at 1 precedes decision.
# P prepares, X restores readiness. Rejection clears X's earlier readiness,
# absence leaves it intact. Q is never retried. Columns: approved/rejected/absent.
MATRIX = {"PQX": (True, False, False), "PXQ": (True, True, True),
          "QPX": (False, False, False), "QXP": (False, False, False),
          "XPQ": (True, False, True), "XQP": (False, False, False)}
OUTCOMES = ("approved", "rejected", "absent")
LABELS = ("ja", "nej", "uteblivet")
SCRIPT_SOURCE = "CE3 minimal explorer: fixed permutation, one attempt per slot; synthetic integration test."


def direct_input(problem, order, outcomes):
    a, b, c = order
    return {"schema_version": "ce3-run/1", "profile": "fixed-replay/0.1",
            "model": deepcopy(problem["model"]), "sources": deepcopy(problem["sources"]),
            "outcomes": deepcopy(outcomes),
            "script": {"schema_version": "ce3-script/1", "source": SCRIPT_SOURCE,
                       "steps": {"0": [{"decision": a, "mode": "attempt"}],
                                 "1": [{"decision": b, "mode": "attempt"}],
                                 "2": [{"decision": c, "mode": "attempt"}]}}}


class IndependentScenarioReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="ce3-review-7dab9a0-")
        cls.problem = read_bundle(ROOT / "fixtures/scenario-problem.json")
        cls.manifest = read_bundle(ROOT / "fixtures/scenario-manifest.json")
        cls.pins = read_bundle(ROOT / "fixtures/scenario-pins.json")
        cls.complete = Path(cls.temp.name) / "baseline"
        cls.result = runner.run(cls.problem, cls.manifest, cls.pins, cls.complete)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(self.temp.name) / self._testMethodName

    def clone(self, suffix="copy"):
        return Path(shutil.copytree(self.complete, self.work / suffix))

    def row(self, order, label, result=None):
        return next(c for c in (self.result if result is None else result)["cells"]
                    if c["order"] == list(order) and c["scenario_label"] == label)

    def directory(self, root, order="PXQ", label="ja"):
        return root / "runs" / self.row(order, label)["cell_id"]

    def cli(self, root, pins=None):
        args = [sys.executable, "-B", str(ROOT / "scenario_runner.py"), "verify", "--output", str(root)]
        if pins is not None:
            pinfile = root.parent / (root.name + "-external-pins.json")
            write_bundle(pins, pinfile)
            args += ["--pins", str(pinfile)]
        return subprocess.run(args, text=True, capture_output=True, check=False)

    def assert_unknown(self, result, order="PXQ", label="ja", certified=17):
        self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
        self.assertEqual(result["cell_coverage"]["certified"], certified)
        row = self.row(order, label, result)
        self.assertEqual(row["goal_status"], "UNKNOWN")
        self.assertIsNone(row["goal_satisfied"])
        self.assertEqual(row["event_path_coverage"], {"status": "UNKNOWN", "audited_paths": None})

    def test_01_literal_rules_direct_inputs_and_full_population(self):
        expected_pairs = set(product(MATRIX, LABELS))
        actual_pairs = [("".join(c["order"]), c["scenario_label"]) for c in self.result["cells"]]
        self.assertEqual(len(actual_pairs), 18)
        self.assertEqual(set(actual_pairs), expected_pairs)
        self.assertEqual(len({c["cell_id"] for c in self.result["cells"]}), 18)
        for order, goals in MATRIX.items():
            scripts = []
            for index, label in enumerate(LABELS):
                row = self.row(order, label)
                d = self.directory(self.complete, order, label)
                actual = read_bundle(d / "input.json")
                expected = direct_input(self.problem, order, {"response": OUTCOMES[index]})
                self.assertEqual(encode(actual), encode(expected))
                self.assertEqual(row["input_identity"], digest(expected))
                scripts.append(encode(actual["script"]))
                self.assertEqual(row["run_status"], "CERTIFIED")
                self.assertIs(row["goal_satisfied"], goals[index])
                path = read_bundle(d / "observation.json")["projection"]["paths"][0]
                state = path["terminal_state"]
                self.assertEqual(state, {"prepared": True, "aux_done": True,
                    "ready": not (label == "nej" and order.startswith("X")),
                    "done": goals[index], "budget": 0 if goals[index] else 1,
                    "response": ("approved", "rejected", "waiting")[index]})
                self.assertEqual(path["pending"], [])
                history = read_bundle(d / "history.json.gz")["paths"][0]["history"]
                self.assertEqual([(r["action"], r["step"]) for r in history if r["kind"] == "attempt_blocked"],
                                 [] if goals[index] else [("Q", order.index("Q"))])
                event = next(r for r in history if r["kind"] == "event_applied")
                self.assertEqual((event["step"], event["outcome"]), (1, OUTCOMES[index]))
                if label == "uteblivet":
                    self.assertEqual(event["before"]["state"]["ready"], event["after"]["state"]["ready"])
            self.assertEqual(len(set(scripts)), 1)
        # Saved oracle is compared only after assertions against the literal rule-derived oracle.
        saved = read_bundle(ROOT / "fixtures/scenario-expected.json")
        self.assertEqual({"".join(r["order"]): tuple(r["goals"][s] for s in LABELS)
                          for r in saved["orders"]}, MATRIX)

    def test_02_missing_cells_projection_complete_but_no_false_robust_true(self):
        root = self.clone()
        shutil.rmtree(self.directory(root, "PXQ", "uteblivet"))
        shutil.rmtree(self.directory(root, "XPQ", "ja"))
        result = runner.verify(root, self.pins)
        self.assert_unknown(result, "PXQ", "uteblivet", 16)
        self.assertEqual(result["candidate_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["scenario_coverage"]["status"], "COMPLETE")
        aggregates = {"".join(c["order"]): c["robust"] for c in result["candidates"]}
        self.assertEqual(aggregates["PXQ"], "UNKNOWN")
        self.assertEqual(aggregates["XPQ"], "FALSE")
        proc = self.cli(root)
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("cell_coverage: {'status': 'INCOMPLETE'", proc.stdout)
        self.assertIn("P X Q robust: UNKNOWN", proc.stdout)
        self.assertNotIn("robust: TRUE", proc.stdout)

    def test_03_no_robust_candidate_complete_is_not_goal_success(self):
        p = deepcopy(self.problem)
        # Every fully accepted run spends Q+X=2, leaving 0; blocked runs leave 1
        # but violate all_attempts_accepted. Therefore no candidate can meet this goal.
        p["observation"]["terminal_equals"] = {"budget": 1}
        m, pins = contract.freeze(p)
        result = runner.run(p, m, pins, self.work)
        self.assertEqual(result["cell_coverage"]["certified"], 18)
        self.assertTrue(all(c["goal_satisfied"] is False for c in result["cells"]))
        self.assertEqual({c["robust"] for c in result["candidates"]}, {"FALSE"})
        proc = self.cli(self.work, pins)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.count("robust: FALSE"), 6)
        self.assertNotIn("robust: TRUE", proc.stdout)

    def test_04_positive_reference_path_cannot_hide_negative_path(self):
        p = deepcopy(self.problem)
        p["model"]["events"]["clear"] = {"kind": "timer", "requires": [], "absent": None,
            "source": "Independent review order witness",
            "outcomes": {"reset": {"set": {"ready": False}, "add": {}}}}
        p["model"]["initial_events"].append({"id": "clear", "due": 1, "scheduled_at": 0})
        # The first/reference path succeeds: clear THEN approved. The other fails.
        p["model"]["reference_event_order"] = ["clear", "response"]
        m, pins = contract.freeze(p)
        result = runner.run(p, m, pins, self.work, max_cells=1)
        row = self.row("PQX", "ja", result)
        d = self.work / "runs" / row["cell_id"]
        paths = read_bundle(d / "observation.json")["projection"]["paths"]
        self.assertEqual([x["goal_satisfied"] for x in paths], [True, False])
        self.assertEqual(row["event_path_coverage"], {"status": "COMPLETE", "audited_paths": 2})
        self.assertIs(row["goal_satisfied"], False)
        history = read_bundle(d / "history.json.gz")
        history["paths"].pop()  # Keep only the successful reference path.
        write_bundle(history, d / "history.json.gz")
        record = read_bundle(d / "record.json")
        record.update(runner.artifact_record(read_bundle(d / "started.json"), d))
        write_bundle(record, d / "record.json")
        checked = runner.verify(self.work, pins)
        self.assert_unknown(checked, "PQX", "ja", 0)
        self.assertIn("Incomplete permutation coverage", self.row("PQX", "ja", checked)["reason"])

    def test_05_consistent_17_cell_package_rehash_is_rejected(self):
        root = self.clone()
        missing = self.row("PXQ", "uteblivet")["cell_id"]
        m = deepcopy(self.manifest)
        m["cells"] = [c for c in m["cells"] if c["cell_id"] != missing]
        pins = dict(self.pins, manifest_id=digest(m))
        spec = read_bundle(root / "batch.json")
        spec.update(manifest_id=digest(m), max_cells=17)
        attempt = read_bundle(root / "attempt.json")
        attempt["batch_spec_id"] = digest(spec)
        shutil.rmtree(root / "runs" / missing)
        result = deepcopy(self.result)
        result["cells"] = [c for c in result["cells"] if c["cell_id"] != missing]
        result.update(manifest_id=digest(m), batch_spec_id=digest(spec))
        result["enumeration_coverage"].update(expected=17, observed=17)
        result["cell_coverage"].update(expected=17, certified=17)
        for c in result["cells"]:
            d = root / "runs" / c["cell_id"]
            for filename in ("started.json", "record.json", "observation.json"):
                payload = read_bundle(d / filename)
                payload["batch_spec_id"] = digest(spec)
                write_bundle(payload, d / filename)
            record = read_bundle(d / "record.json")
            c["observation_id"] = record["observation_id"] = digest(read_bundle(d / "observation.json"))
            write_bundle(record, d / "record.json")
        for a in result["candidates"]:
            group = [c for c in result["cells"] if c["candidate_id"] == a["candidate_id"]]
            a.update(cell_ids=[c["cell_id"] for c in group], expected_scenarios=len(group), certified_cells=len(group),
                     robust="TRUE" if all(c["goal_satisfied"] for c in group) else "FALSE")
        result.pop("result_id")
        result["result_id"] = digest(result)
        for name, value in (("manifest", m), ("pins", pins), ("batch", spec), ("attempt", attempt),
                            ("enumeration", m["cells"]), ("result", result)):
            write_bundle(value, root / (name + ".json"))
        self.assertEqual(contract.check_population(m, m["cells"])["status"], "COMPLETE")
        with self.assertRaisesRegex(ValueError, "Trusted problem/manifest identity mismatch"):
            runner.verify(root, pins)
        proc = self.cli(root, pins)
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(proc.stdout, "")

    def test_06_enumeration_mutations_and_unexpected_runs_cannot_exit_zero(self):
        for kind in ("missing", "duplicate", "misbound", "unexpected_directory", "unexpected_file"):
            with self.subTest(kind=kind):
                root = self.clone(kind)
                cells = deepcopy(self.manifest["cells"])
                if kind == "missing": cells.pop()
                elif kind == "duplicate": cells[-1] = cells[0]
                elif kind == "misbound": cells[-1]["input_identity"] = "0" * 64
                elif kind == "unexpected_directory": (root / "runs" / "unexpected").mkdir()
                else: (root / "runs" / "unexpected").write_text("extra artifact")
                write_bundle(cells, root / "enumeration.json")
                checked = runner.verify(root, self.pins)
                self.assertEqual(checked["cell_coverage"]["certified"], 18)
                self.assertEqual(checked["cell_coverage"]["status"], "INCOMPLETE" if kind == "missing" else "INVALID")
                self.assertEqual(self.cli(root).returncode, 2)
                # Robustness can still be TRUE here: all three real PXQ cells were
                # audited. This is not a complete enumeration/batch claim.
                self.assertEqual(next(c for c in checked["candidates"] if c["order"] == list("PXQ"))["robust"], "TRUE")

    def test_07_opaque_names_scenario_cardinality_and_duplicate_outcomes(self):
        p = deepcopy(self.problem)
        rename = {"P": "z", "Q": "a", "X": "m"}
        p["search"]["decision_ids"] = ["a", "m", "z"]
        p["model"]["decisions"] = {rename[k]: v for k, v in p["model"]["decisions"].items()}
        p["scenario_set"]["members"] = [
            {"label": "ja", "outcomes": {"response": "rejected"}},
            {"label": "nej", "outcomes": {"response": "absent"}},
            {"label": "uteblivet", "outcomes": {"response": "approved"}},
            {"label": "duplicate approved", "outcomes": {"response": "approved"}}]
        m, pins = contract.freeze(p)
        self.assertEqual(len(m["cells"]), 24)
        result = runner.run(p, m, pins, self.work)
        self.assertEqual(result["cell_coverage"]["certified"], 24)
        for order, goals in MATRIX.items():
            new_order = [rename[x] for x in order]
            for label, index in (("ja", 1), ("nej", 2), ("uteblivet", 0), ("duplicate approved", 0)):
                row = self.row(new_order, label, result)
                self.assertIs(row["goal_satisfied"], goals[index])
                actual = read_bundle(self.work / "runs" / row["cell_id"] / "input.json")
                self.assertEqual(actual, direct_input(p, new_order, {"response": OUTCOMES[index]}))
        # No hard-coded 3-scenario denominator or deduplication of equal outcomes.
        self.assertTrue(all(c["expected_scenarios"] == 4 for c in result["candidates"]))

    def test_08_artifact_swaps_between_candidate_and_scenario(self):
        for source_order, source_label in (("XPQ", "ja"), ("PXQ", "nej")):
            for name in ("input.json", "history.json.gz", "audit.json", "audit-receipt.json",
                         "observation.json", "record.json", "started.json"):
                with self.subTest(source=(source_order, source_label), artifact=name):
                    root = self.clone(source_order + source_label + name)
                    shutil.copyfile(self.directory(root, source_order, source_label) / name,
                                    self.directory(root) / name)
                    result = runner.verify(root, self.pins)
                    self.assert_unknown(result, certified=16 if name == "record.json" else 17)
                    if name == "record.json":
                        self.assertEqual(self.row(source_order, source_label, result)["goal_status"], "UNKNOWN")
                    for old in self.result["cells"]:
                        new = next(c for c in result["cells"] if c["cell_id"] == old["cell_id"])
                        if new["run_status"] == "CERTIFIED": self.assertEqual(new, old)

    def test_09_interruption_after_real_process_preserves_unknown_population(self):
        real = runner.cli_process
        for stop_after in ("replay", "audit"):
            root = self.work / stop_after
            def interrupt(command, *args):
                result = real(command, *args)
                if command == stop_after:
                    raise KeyboardInterrupt("independent review interruption")
                return result
            with patch.object(runner, "cli_process", side_effect=interrupt):
                with self.assertRaises(KeyboardInterrupt):
                    runner.run(self.problem, self.manifest, self.pins, root)
            result = runner.verify(root, self.pins)
            self.assertEqual(len(result["cells"]), 18)
            self.assertEqual(result["cell_coverage"]["certified"], 0)
            self.assertEqual(sum(c["run_status"] == "UNVERIFIED" for c in result["cells"]), 1)
            self.assertEqual(sum(c["run_status"] == "NOT_RUN" for c in result["cells"]), 17)
            self.assertTrue(all(c["robust"] == "UNKNOWN" for c in result["candidates"]))
            self.assertEqual(self.cli(root).returncode, 2)

    def test_10_corrupt_gzip_and_stale_result_are_isolated_read_only(self):
        root = self.clone()
        d = self.directory(root)
        history = d / "history.json.gz"
        original = history.read_bytes()
        (root / "result.json").write_text('{"cell_coverage":{"status":"COMPLETE"},"robust":"TRUE"}')
        for raw in (original[:4], original[:-8], b"invalid", original[:-8] + b"\0" * 8,
                    original[:10] + b"\x07" + original[11:], original + original[:12]):
            history.write_bytes(raw)
            before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()}
            result = runner.verify(root, self.pins)
            self.assert_unknown(result)
            self.assertEqual(self.cli(root).returncode, 2)
            after = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()}
            self.assertEqual(after, before)
        history.write_bytes(original)
        (root / "result.json").unlink()
        with patch.object(runner, "cli_process", side_effect=AssertionError("verify must not replay")):
            self.assertEqual(runner.verify(root, self.pins), self.result)

    def test_11_common_validator_preserves_previous_acceptance_domain(self):
        # Execute the exact pre-commit validator in an isolated namespace, with
        # the unchanged codec/schema. No checkout or production file mutation.
        repo = ROOT.parents[1]
        source = subprocess.check_output(["git", "show", "7dab9a0^:isolated-tests/structural-ce3-explorer/contracts.py"],
                                         cwd=repo, text=True)
        previous = {}
        exec(compile(source, "pre-7dab9a0-contracts.py", "exec"), previous)
        original = read_bundle(ROOT / "fixtures/problem.json")
        cases = [original]
        for key in original:
            p = deepcopy(original); p.pop(key); cases.append(p)
        for key, value in (("schema_version", "ce3-scenario-problem/1"), ("outcomes", {"response": "absent"}),
                           ("revision", True), ("profile", "other")):
            p = deepcopy(original); p[key] = value; cases.append(p)
        for terminal in ({}, {"done": 1}, {"done": False}, {"budget": 1}):
            p = deepcopy(original); p["observation"]["terminal_equals"] = terminal; cases.append(p)
        external = {k: deepcopy(v) for k, v in self.problem.items() if k != "scenario_set"}
        external.update(schema_version="ce3-explorer-problem/1", outcomes={"response": "absent"})
        cases.append(external)
        for p in cases:
            def accepts(fn):
                try: fn(p); return True
                except (ValueError, KeyError, TypeError): return False
            self.assertEqual(accepts(previous["validate_problem"]), accepts(single.validate_problem), repr(p))
        self.assertEqual(single.freeze(original), previous["freeze"](original))

    def test_12_false_unknown_truth_table_all_combinations(self):
        values = (True, False, None)
        for goals in product(values, repeat=3):
            cells = [{"run_status": "CERTIFIED" if v is not None else "UNVERIFIED", "goal_satisfied": v}
                     for v in goals]
            expected = "FALSE" if False in goals else "UNKNOWN" if None in goals else "TRUE"
            self.assertEqual(runner.robust(cells), expected)
        self.assertEqual(runner.robust([{"run_status": "UNVERIFIED", "goal_satisfied": False}]), "UNKNOWN")
        self.assertEqual(runner.robust([{"run_status": "NOT_RUN", "goal_satisfied": True}]), "UNKNOWN")
        with self.assertRaises(ValueError): runner.robust([])

    def test_13_rebound_old_results_still_require_current_input_and_goal(self):
        for kind in ("outcome", "goal"):
            root = self.clone(kind)
            p = deepcopy(self.problem)
            if kind == "outcome":
                # PXQ's goal stays true, but its full input must nevertheless change.
                p["scenario_set"]["members"][0]["outcomes"]["response"] = "absent"
            else:
                p["observation"]["terminal_equals"] = {"budget": 1}
            m, pins = contract.freeze(p)
            spec = read_bundle(root / "batch.json")
            spec.update(problem_id=digest(p), manifest_id=digest(m))
            attempt = read_bundle(root / "attempt.json")
            attempt["batch_spec_id"] = digest(spec)
            # Repair every outer declaration and record binding, including the
            # observation digest. Keep old projection/input/history/audit contents.
            for old_s, new_s in zip(self.manifest["scenarios"], m["scenarios"]):
                for plan in m["candidates"]:
                    old_c = next(c for c in self.manifest["cells"] if
                        c["candidate_id"] == plan["candidate_id"] and c["scenario_id"] == old_s["scenario_id"])
                    new_c = next(c for c in m["cells"] if
                        c["candidate_id"] == plan["candidate_id"] and c["scenario_id"] == new_s["scenario_id"])
                    d = root / "runs" / new_c["cell_id"]
                    (root / "runs" / old_c["cell_id"]).rename(d)
                    record = read_bundle(d / "record.json")
                    started = read_bundle(d / "started.json")
                    execution_id = digest({"schema_version": "ce3-execution/1",
                        "input_identity": new_c["input_identity"], "runtime_id": spec["runtime_id"],
                        "limits": spec["limits"]})
                    for data in (started, record):
                        data.update(cell=new_c, batch_spec_id=digest(spec), execution_id=execution_id)
                    obs = read_bundle(d / "observation.json")
                    obs.update(problem_id=digest(p), cell_id=new_c["cell_id"],
                               scenario_id=new_c["scenario_id"], batch_spec_id=digest(spec))
                    record["observation_id"] = digest(obs)
                    for name, data in (("record", record), ("started", started), ("observation", obs)):
                        write_bundle(data, d / (name + ".json"))
            for name, data in (("problem", p), ("manifest", m), ("pins", pins), ("batch", spec),
                               ("attempt", attempt), ("enumeration", m["cells"])):
                write_bundle(data, root / (name + ".json"))
            with self.assertRaises(ValueError): runner.verify(root, self.pins)
            checked = runner.verify(root, pins)
            self.assertEqual(checked["cell_coverage"]["certified"], 12 if kind == "outcome" else 0)
            for row in checked["cells"]:
                if kind == "goal" or row["scenario_label"] == "ja":
                    self.assertIsNone(row["goal_satisfied"])
                    self.assertIn("Observation mismatch" if kind == "goal" else "Stored input differs from cell", row["reason"])
            self.assertEqual(self.cli(root, pins).returncode, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
