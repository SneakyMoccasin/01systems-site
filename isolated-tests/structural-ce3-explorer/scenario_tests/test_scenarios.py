"""Independent literal oracle, direct input assertions and adversarial crossing tests."""
import ast
from copy import deepcopy
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, read_bundle, runtime_manifest, write_bundle
from contracts import LIMITS, SCRIPT_SOURCE, validate_problem as validate_single
import scenario_contracts as contracts
import scenario_runner as runner


class Scenarios(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="ce3-crossing-tests-")
        cls.problem = read_bundle(ROOT / "fixtures/scenario-problem.json")
        cls.manifest = read_bundle(ROOT / "fixtures/scenario-manifest.json")
        cls.pins = read_bundle(ROOT / "fixtures/scenario-pins.json")
        cls.oracle = read_bundle(ROOT / "fixtures/scenario-expected.json")
        cls.complete = Path(cls.temp.name) / "complete"
        with patch.object(runner, "cli_process", wraps=runner.cli_process) as calls:
            cls.result = runner.run(cls.problem, cls.manifest, cls.pins, cls.complete)
            cls.commands = [c.args[0] for c in calls.call_args_list]

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(self.temp.name) / self.id().split(".")[-1]

    def clone(self):
        shutil.copytree(self.complete, self.work)
        return self.work

    def row(self, order="PQX", label="ja", result=None):
        return next(c for c in (result or self.result)["cells"]
                    if c["order"] == list(order) and c["scenario_label"] == label)

    def directory(self, root, order="PQX", label="ja"):
        return root / "runs" / self.row(order, label)["cell_id"]

    def assert_one_unknown(self, root):
        result = runner.verify(root, self.pins)
        self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
        self.assertEqual(result["cell_coverage"]["certified"], 17)
        damaged = self.row(result=result)
        self.assertEqual(damaged["goal_status"], "UNKNOWN")
        self.assertIsNone(damaged["goal_satisfied"])
        self.assertEqual(damaged["event_path_coverage"]["status"], "UNKNOWN")
        for old, new in zip(self.result["cells"], result["cells"]):
            if old["cell_id"] != damaged["cell_id"]:
                self.assertEqual(old, new)
        return result

    def test_literal_oracle_all_18_cells_and_distinct_external_states(self):
        self.assertEqual(self.commands, ["replay", "audit"] * 18)
        self.assertEqual(len({c["cell_id"] for c in self.result["cells"]}), 18)
        for oracle in self.oracle["orders"]:
            for label, goal in oracle["goals"].items():
                row = self.row(oracle["order"], label)
                with self.subTest(order=oracle["order"], label=label):
                    self.assertEqual(row["run_status"], "CERTIFIED")
                    self.assertIs(row["goal_satisfied"], goal)
                    self.assertEqual(row["event_path_coverage"], {"status": "COMPLETE", "audited_paths": 1})
                    directory = self.directory(self.complete, oracle["order"], label)
                    obs = read_bundle(directory / "observation.json")["projection"]["paths"][0]
                    state = obs["terminal_state"]
                    self.assertEqual(state["response"], {"ja":"approved", "nej":"rejected", "uteblivet":"waiting"}[label])
                    self.assertEqual(state["budget"], 0 if goal else 1)
                    self.assertEqual(state["done"], goal)
                    self.assertTrue(state["prepared"] and state["aux_done"])
                    self.assertEqual(state["ready"], not (label == "nej" and oracle["order"][0] == "X"))
                    self.assertEqual(obs["pending"], [])
                    bundle = read_bundle(directory / "history.json.gz")
                    blocked = [r for r in bundle["paths"][0]["history"] if r["kind"] == "attempt_blocked"]
                    step = oracle["blocked_steps"][label]
                    self.assertEqual([(r["action"], r["step"]) for r in blocked], [] if step is None else [("Q", step)])
        for name in ("candidate_coverage", "scenario_coverage", "cell_coverage", "enumeration_coverage"):
            self.assertEqual(self.result[name]["status"], "COMPLETE")
        self.assertEqual([c["robust"] for c in self.result["candidates"]],
                         ["FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE"])

    def test_direct_inputs_without_materializer_as_oracle(self):
        for row in self.result["cells"]:
            actual = read_bundle(self.complete / "runs" / row["cell_id"] / "input.json")
            # Intentionally construct literal slots independently of any production helper.
            a, b, c = row["order"]
            expected = {"schema_version":"ce3-run/1", "profile":"fixed-replay/0.1",
                        "model":self.problem["model"], "sources":self.problem["sources"],
                        "outcomes":{"response":{"ja":"approved", "nej":"rejected", "uteblivet":"absent"}[row["scenario_label"]]},
                        "script":{"schema_version":"ce3-script/1", "source":SCRIPT_SOURCE,
                                  "steps":{"0":[{"decision":a,"mode":"attempt"}],
                                           "1":[{"decision":b,"mode":"attempt"}],
                                           "2":[{"decision":c,"mode":"attempt"}]}}}
            self.assertEqual(actual, expected)
            self.assertEqual(digest(actual), row["input_identity"])
        for plan in self.manifest["candidates"]:
            group = [c for c in self.result["cells"] if c["candidate_id"] == plan["candidate_id"]]
            self.assertEqual(len(group), 3)
            self.assertEqual(len({digest(read_bundle(self.complete / "runs" / c["cell_id"] / "input.json")["script"]) for c in group}), 1)

    def test_renamed_decisions_labels_and_reordered_definitions_do_not_control_logic(self):
        p = deepcopy(self.problem)
        names = {"P":"z_prepare", "Q":"a_finish", "X":"m_aux"}
        p["model"]["decisions"] = {names[k]:v for k,v in reversed(list(p["model"]["decisions"].items()))}
        p["search"]["decision_ids"] = sorted(names.values())
        labels = {"ja":"opaq-c", "nej":"opaq-a", "uteblivet":"opaq-b"}
        for s in p["scenario_set"]["members"]:
            s["label"] = labels[s["label"]]
        p["scenario_set"]["members"].reverse()
        manifest, pins = contracts.freeze(p)
        result = runner.run(p, manifest, pins, self.work)
        for oracle in self.oracle["orders"]:
            for label, goal in oracle["goals"].items():
                self.assertIs(self.row([names[n] for n in oracle["order"]], labels[label], result)["goal_satisfied"], goal)

    def test_manifest_enumeration_has_independent_path_and_exact_membership(self):
        contracts.verify_frozen(self.problem, self.manifest, self.pins)
        generated = contracts.generate(self.problem)
        self.assertNotEqual(generated, self.manifest["cells"])  # differing enumeration order
        self.assertEqual(contracts.check_population(self.manifest, generated)["status"], "COMPLETE")
        with patch.object(contracts, "generate", side_effect=AssertionError("independent")), \
             patch.object(contracts, "permutations", side_effect=AssertionError("independent")):
            self.assertEqual(contracts.freeze(self.problem)[0], self.manifest)
        for kind in ("missing", "duplicate", "unexpected", "misbound"):
            cells = deepcopy(generated)
            if kind == "missing": cells.pop()
            elif kind == "duplicate": cells[-1] = cells[0]
            elif kind == "unexpected": cells[-1]["cell_id"] = "0" * 64
            else: cells[-1]["scenario_id"] = cells[0]["scenario_id"]
            self.assertNotEqual(contracts.check_population(self.manifest, cells)["status"], "COMPLETE", kind)

    def test_bad_generator_stops_before_replay(self):
        with patch.object(runner, "generate", return_value=self.manifest["cells"][:-1]), \
             patch.object(runner, "cli_process") as calls:
            with self.assertRaisesRegex(ValueError, "Generator coverage"):
                runner.run(self.problem, self.manifest, self.pins, self.work)
            calls.assert_not_called()

    def test_consistently_removed_cell_rejected_against_declared_space(self):
        root = self.clone()
        manifest = deepcopy(self.manifest)
        missing = manifest["cells"].pop()
        pins = dict(self.pins, manifest_id=digest(manifest))
        spec = read_bundle(root / "batch.json")
        spec["manifest_id"] = digest(manifest)
        spec["max_cells"] = 17
        attempt = read_bundle(root / "attempt.json")
        attempt["batch_spec_id"] = digest(spec)
        shutil.rmtree(root / "runs" / missing["cell_id"])
        result = deepcopy(self.result)
        result["cells"] = [c for c in result["cells"] if c["cell_id"] != missing["cell_id"]]
        result["manifest_id"], result["batch_spec_id"] = digest(manifest), digest(spec)
        result["enumeration_coverage"] = contracts.check_population(manifest, manifest["cells"])
        result["cell_coverage"].update(expected=17, certified=17)
        for candidate in result["candidates"]:
            group = [c for c in result["cells"] if c["candidate_id"] == candidate["candidate_id"]]
            candidate.update(cell_ids=[c["cell_id"] for c in group], expected_scenarios=len(group),
                             certified_cells=len(group), robust=runner.robust(group))
        for c in manifest["cells"]:
            directory = root / "runs" / c["cell_id"]
            record = read_bundle(directory / "record.json")
            base = runner.base_record(c, spec, attempt["batch_attempt_id"], record["run_id"])
            obs = read_bundle(directory / "observation.json")
            obs["batch_spec_id"] = digest(spec)
            record.update(base, observation_id=digest(obs))
            next(r for r in result["cells"] if r["cell_id"] == c["cell_id"])["observation_id"] = digest(obs)
            for name, value in (("started",base),("record",record),("observation",obs)):
                write_bundle(value, directory / (name + ".json"))
        result.pop("result_id")
        result["result_id"] = digest(result)
        for name, value in (("manifest",manifest),("pins",pins),("batch",spec),("attempt",attempt),
                            ("result",result),("enumeration",manifest["cells"])):
            write_bundle(value, root / (name + ".json"))
        self.assertEqual(contracts.check_population(manifest, manifest["cells"])["status"], "COMPLETE")
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            runner.verify(root, pins)

    def test_bad_enumeration_and_extra_directory_do_not_hide_good_cells(self):
        root = self.clone()
        cells = deepcopy(self.manifest["cells"])
        cells[-1] = cells[0]
        write_bundle(cells, root / "enumeration.json")
        result = runner.verify(root, self.pins)
        self.assertEqual(result["cell_coverage"]["status"], "INVALID")
        self.assertEqual(result["cell_coverage"]["certified"], 18)
        write_bundle(self.manifest["cells"], root / "enumeration.json")
        (root / "runs" / "extra").mkdir()
        self.assertEqual(runner.verify(root, self.pins)["cell_coverage"]["status"], "INVALID")

    def test_changed_outcomes_goal_or_scenario_definition_rejects_reused_artifacts(self):
        for kind in ("outcomes", "goal", "label"):
            root = self.work / kind
            shutil.copytree(self.complete, root)
            p = deepcopy(self.problem)
            if kind == "outcomes": p["scenario_set"]["members"][0]["outcomes"]["response"] = "rejected"
            elif kind == "goal": p["observation"]["terminal_equals"]["done"] = False
            else: p["scenario_set"]["members"][0]["label"] = "changed definition"
            manifest, pins = contracts.freeze(p)
            spec = read_bundle(root / "batch.json")
            spec.update(problem_id=digest(p), manifest_id=digest(manifest))
            attempt = read_bundle(root / "attempt.json")
            attempt["batch_spec_id"] = digest(spec)
            for old, new in zip(self.manifest["scenarios"], manifest["scenarios"]):
                for plan in manifest["candidates"]:
                    old_cell = next(c for c in self.manifest["cells"] if c["candidate_id"] == plan["candidate_id"] and c["scenario_id"] == old["scenario_id"])
                    new_cell = next(c for c in manifest["cells"] if c["candidate_id"] == plan["candidate_id"] and c["scenario_id"] == new["scenario_id"])
                    source = root / "runs" / old_cell["cell_id"]
                    dest = root / "runs" / new_cell["cell_id"]
                    source.rename(dest)
                    record = read_bundle(dest / "record.json")
                    base = runner.base_record(new_cell, spec, attempt["batch_attempt_id"], record["run_id"])
                    record.update(base)
                    write_bundle(base, dest / "started.json")
                    write_bundle(record, dest / "record.json")
            for name, value in (("problem",p),("manifest",manifest),("pins",pins),("batch",spec),
                                ("attempt",attempt),("enumeration",manifest["cells"])):
                write_bundle(value, root / (name + ".json"))
            with self.assertRaises(ValueError): runner.verify(root, self.pins)
            result = runner.verify(root, pins)  # even with newly trusted declarations
            self.assertEqual(result["cell_coverage"]["certified"], 0, kind)
            self.assertTrue(all(c["goal_status"] == "UNKNOWN" for c in result["cells"]))

    def test_missing_run_interruption_audit_failure_and_swapped_artifacts(self):
        for name in ("input.json", "history.json.gz", "audit.json", "observation.json", "audit-receipt.json", "started.json", "record.json", "missing_run", "interrupted", "audit_fail"):
            root = self.work / name
            shutil.copytree(self.complete, root)
            target = self.directory(root)
            if name == "missing_run": shutil.rmtree(target)
            elif name == "interrupted": (target / "record.json").unlink()
            elif name == "audit_fail": write_bundle({"status":"FAIL"}, target / "audit.json")
            else: shutil.copyfile(self.directory(root, label="nej") / name, target / name)
            if name == "record.json":
                result = runner.verify(root, self.pins)
                self.assertEqual(result["cell_coverage"]["certified"], 16)
                for label in ("ja", "nej"):
                    self.assertEqual(self.row(label=label, result=result)["goal_status"], "UNKNOWN")
            else:
                self.assert_one_unknown(root)

    def test_gzip_corruption_isolated_verify_readonly_and_cli_exit_2(self):
        root = self.clone()
        history = self.directory(root) / "history.json.gz"
        original = history.read_bytes()
        result_bytes = (root / "result.json").read_bytes()
        variants = (original[:4], original[:-8], b"not gzip", original[:-8] + b"\0" * 8,
                    original[:10] + bytes([7]) + original[11:])
        for damaged in variants:
            history.write_bytes(damaged)
            self.assert_one_unknown(root)
        result = subprocess.run([sys.executable,"-B",str(ROOT / "scenario_runner.py"),"verify","--output",str(root)], capture_output=True,text=True)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("UNKNOWN", result.stdout)
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual((root / "result.json").read_bytes(), result_bytes)

    def test_failure_during_run_continues_and_timeout_remains_unknown(self):
        calls = 0
        real = runner.cli_process
        def fail_once(command, *args):
            nonlocal calls
            calls += 1
            if calls == 1: raise subprocess.TimeoutExpired("replay", 60)
            return real(command, *args)
        with patch.object(runner, "cli_process", side_effect=fail_once):
            result = runner.run(self.problem, self.manifest, self.pins, self.work)
        self.assertEqual(result["cell_coverage"]["certified"], 17)
        self.assertTrue((self.directory(self.work) / "failure.json").exists())

    def test_gzip_damage_during_run_keeps_remaining_cells(self):
        calls = 0
        real = runner.cli_process
        def corrupt_after_audit(command, *args):
            nonlocal calls
            result = real(command, *args)
            if command == "audit":
                calls += 1
                if calls == 1:
                    path = Path(args[args.index("--history") + 1])
                    path.write_bytes(path.read_bytes()[:-8])
            return result
        with patch.object(runner, "cli_process", side_effect=corrupt_after_audit):
            result = runner.run(self.problem, self.manifest, self.pins, self.work)
        self.assertEqual(result["cell_coverage"]["certified"], 17)
        self.assertEqual(self.row(result=result)["goal_status"], "UNKNOWN")
        self.assertTrue((self.directory(self.work) / "failure.json").exists())

    def test_trust_and_build_gates(self):
        for name in ("runtime", "explorer-build", "attempt", "batch"):
            root = self.work / name
            shutil.copytree(self.complete, root)
            value = read_bundle(root / (name + ".json"))
            if name in ("runtime", "explorer-build"):
                value["files"][next(iter(value["files"]))] = "0" * 64
            elif name == "attempt": value["batch_spec_id"] = "0" * 64
            else: value["manifest_id"] = "0" * 64
            write_bundle(value, root / (name + ".json"))
            with self.assertRaises(ValueError): runner.verify(root, self.pins)

    def test_three_valued_robustness_and_independent_coverage_axes(self):
        root = self.clone()
        # PXQ was robust TRUE. Remove one cell: no refutation, therefore UNKNOWN.
        shutil.rmtree(self.directory(root, "PXQ", "ja"))
        # XPQ still has a verified negative in 'nej': FALSE even with another unknown.
        shutil.rmtree(self.directory(root, "XPQ", "ja"))
        result = runner.verify(root, self.pins)
        values = {"".join(c["order"]): c for c in result["candidates"]}
        self.assertEqual(values["PXQ"]["robust"], "UNKNOWN")
        self.assertEqual(values["XPQ"]["robust"], "FALSE")
        self.assertEqual(values["XPQ"]["certified_cells"], 2)
        self.assertEqual(result["candidate_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["scenario_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["cell_coverage"]["status"], "INCOMPLETE")
        empty = runner.run(self.problem, self.manifest, self.pins, self.work / "zero", max_cells=0)
        self.assertEqual(len(empty["cells"]), 18)
        self.assertTrue(all(c["robust"] == "UNKNOWN" for c in empty["candidates"]))
        for key in ("candidate_coverage", "scenario_coverage", "cell_coverage"):
            self.assertEqual(empty[key]["status"], "INCOMPLETE")
        partial = runner.run(self.problem, self.manifest, self.pins, self.work / "partial", max_cells=2)
        self.assertEqual(partial["cell_coverage"]["certified"], 2)
        self.assertEqual(partial["candidate_coverage"]["certified_represented"], 1)
        self.assertEqual(partial["scenario_coverage"]["certified_represented"], 2)
        self.assertEqual(next(c for c in partial["candidates"] if c["order"] == list("PQX"))["robust"], "FALSE")

    def test_limits_and_model_errors_are_not_negative_goals(self):
        for key in LIMITS:
            result = runner.run(self.problem, self.manifest, self.pins, self.work / key,
                                limits=dict(LIMITS, **{key:1}), max_cells=1)
            # Fixture has one event path; max_paths=1 is sufficient.
            self.assertEqual(result["cell_coverage"]["certified"], 1 if key == "max_paths" else 0)
        p = deepcopy(self.problem)
        p["model"]["domains"]["counter"] = {"integer":[0,0]}
        p["model"]["initial"]["counter"] = 0
        p["model"]["decisions"]["P"]["effects"]["add"]["counter"] = 1
        m, pins = contracts.freeze(p)
        result = runner.run(p, m, pins, self.work / "error", max_cells=1)
        self.assertTrue(all(c["goal_status"] == "UNKNOWN" for c in result["cells"]))

    def test_goal_requires_all_event_paths(self):
        p = deepcopy(self.problem)
        p["model"]["events"]["clear"] = {"kind":"timer", "requires":[], "absent":None,
            "source":"Order sensitivity witness", "outcomes":{"clear":{"set":{"ready":False},"add":{}}}}
        p["model"]["initial_events"].append({"id":"clear","due":1,"scheduled_at":0})
        p["model"]["reference_event_order"] = ["response","clear"]
        m, pins = contracts.freeze(p)
        result = runner.run(p, m, pins, self.work, max_cells=1)
        row = self.row(result=result)
        self.assertEqual(row["run_status"], "CERTIFIED")
        self.assertIs(row["goal_satisfied"], False)
        obs = read_bundle(self.work / "runs" / row["cell_id"] / "observation.json")["projection"]
        self.assertEqual({x["goal_satisfied"] for x in obs["paths"]}, {False, True})
        self.assertEqual(row["event_path_coverage"]["audited_paths"], 2)
        limited = runner.run(p, m, pins, self.work / "limited", max_cells=1, limits=dict(LIMITS,max_paths=1))
        self.assertEqual(limited["cell_coverage"]["certified"], 0)

    def test_duplicate_occurrence_rejects_both_claimants(self):
        root = self.clone()
        a, b = self.directory(root), self.directory(root, label="nej")
        record = read_bundle(b / "record.json")
        record["run_id"] = read_bundle(a / "record.json")["run_id"]
        started = read_bundle(b / "started.json")
        started["run_id"] = record["run_id"]
        write_bundle(record, b / "record.json")
        write_bundle(started, b / "started.json")
        result = runner.verify(root, self.pins)
        self.assertEqual(result["cell_coverage"]["certified"], 16)

    def test_forged_history_and_observation_recomputed_even_after_rehash(self):
        for kind in ("history", "observation"):
            root = self.work / kind
            shutil.copytree(self.complete, root)
            d = self.directory(root)
            record = read_bundle(d / "record.json")
            if kind == "history":
                bundle = read_bundle(d / "history.json.gz")
                bundle["paths"][0]["history"][-1]["after"]["state"]["done"] = False
                write_bundle(bundle, d / "history.json.gz")
                record.update(runner.artifact_record(read_bundle(d / "started.json"), d))
            else:
                obs = read_bundle(d / "observation.json")
                obs["projection"]["goal_satisfied"] = False
                write_bundle(obs, d / "observation.json")
                record["observation_id"] = digest(obs)
            write_bundle(record, d / "record.json")
            self.assert_one_unknown(root)

    def test_unsupported_scope_and_incomplete_outcomes_fail_closed(self):
        mutations = [lambda p:p.update(script={}), lambda p:p["scenario_set"].update(variation="model_patch"),
            lambda p:p["scenario_set"].update(members=[]),
            lambda p:p["scenario_set"]["members"][0].update(model={}),
            lambda p:p["scenario_set"]["members"][0].update(outcomes={}),
            lambda p:p["scenario_set"]["members"][0]["outcomes"].update(response="undeclared"),
            lambda p:p["scenario_set"]["members"][1].update(label="ja"),
            lambda p:p["search"].update(retry=True), lambda p:p["search"].update(decision_ids=["P","Q"]),
            lambda p:p["search"].update(slots=[False,1,2]), lambda p:p["observation"].update(quantifier="any_event_path")]
        for mutate in mutations:
            p = deepcopy(self.problem); mutate(p)
            with self.assertRaises(ValueError): contracts.freeze(p)
        with self.assertRaises(ValueError): validate_single(self.problem)
        with self.assertRaises(ValueError): contracts.freeze(read_bundle(ROOT / "fixtures/problem.json"))

    def test_unused_outcomes_bound_and_identical_result_states_not_deduplicated(self):
        p = deepcopy(self.problem)
        p["model"]["initial_events"] = []
        m, pins = contracts.freeze(p)
        self.assertEqual(len(m["cells"]), 18)
        result = runner.run(p,m,pins,self.work,max_cells=3)
        first = [c for c in result["cells"] if c["run_status"] == "CERTIFIED"]
        self.assertEqual(len(first), 3)
        self.assertEqual(len({c["input_identity"] for c in first}), 3)
        states = []
        for row in first:
            obs = read_bundle(self.work / "runs" / row["cell_id"] / "observation.json")
            states.append(obs["projection"]["paths"][0]["terminal_state"])
        self.assertTrue(all(s == states[0] for s in states))

    def test_reproducible_contents_new_attempts_and_verify_does_not_replay(self):
        second = runner.run(self.problem,self.manifest,self.pins,self.work)
        for a,b in zip(self.result["cells"],second["cells"]):
            for key in ("cell_id","candidate_id","plan_id","input_identity","execution_id","history_id","audit_receipt_id","observation_id"):
                self.assertEqual(a[key],b[key],key)
            self.assertNotEqual(a["run_id"],b["run_id"])
        self.assertNotEqual(second["batch_attempt_id"],self.result["batch_attempt_id"])
        (self.work / "result.json").write_text("corrupt disposable summary")
        with patch.object(runner,"cli_process",side_effect=AssertionError("verify must not replay")):
            self.assertEqual(runner.verify(self.work,self.pins),second)
        with self.assertRaises(FileExistsError): runner.run(self.problem,self.manifest,self.pins,self.work)

    def test_no_transition_imports_no_oracle_in_production_backend_unchanged(self):
        for name in ("scenario_contracts.py","scenario_runner.py"):
            text = (ROOT / name).read_text()
            tree = ast.parse(text)
            for n in ast.walk(tree):
                if isinstance(n,ast.ImportFrom):
                    self.assertFalse((n.module or "").startswith(("core.replay","core.transitions","core.expressions")))
            self.assertNotIn("scenario-expected",text)
        self.assertEqual(runtime_manifest()["files"], read_bundle(ROOT / "fixtures/backend-files.json")["files"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
