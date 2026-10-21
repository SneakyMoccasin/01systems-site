"""Real CLI integration plus independent literal oracle and adversarial evidence tests."""
import ast
from copy import deepcopy
import hashlib
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, REPLAY, digest, encode, file_hash, read_bundle, runtime_manifest, write_bundle
from contracts import (LIMITS, check_coverage, freeze, materialize, validate_problem, verify_frozen)
from enumerate_scripts import generate
import runner


class Explorer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="ce3-explorer-tests-")
        cls.problem = read_bundle(ROOT / "fixtures/problem.json")
        cls.manifest = read_bundle(ROOT / "fixtures/search-manifest.json")
        cls.pins = read_bundle(ROOT / "fixtures/pins.json")
        cls.oracle = read_bundle(ROOT / "fixtures/expected.json")
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

    def candidate_dir(self, root, index=0):
        return root / "runs" / self.manifest["members"][index]["candidate_id"]

    def assert_unverified(self, root, index=0):
        result = runner.verify(root, self.pins)
        self.assertNotEqual(result["search_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["candidates"][index]["run_status"], "UNVERIFIED")
        self.assertIsNone(result["candidates"][index]["goal_satisfied"])
        return result

    def test_all_six_real_replays_and_audits_match_independent_oracle(self):
        self.assertNotIn("script", self.problem)
        self.assertEqual(self.commands, ["replay", "audit"] * 6)
        result = self.result
        self.assertEqual(result["search_coverage"]["status"], "COMPLETE")
        actual = {tuple(r["order"]): r for r in result["candidates"]}
        expected = {tuple(r["order"]): r for r in self.oracle["orders"]}
        self.assertEqual(set(actual), set(expected))
        self.assertEqual(len({r["candidate_id"] for r in actual.values()}), 6)
        self.assertEqual({k for k, r in actual.items() if r["goal_satisfied"]},
                         {("P", "Q", "X"), ("P", "X", "Q"), ("X", "P", "Q")})
        for order, row in actual.items():
            with self.subTest(order=order):
                self.assertEqual(row["run_status"], "CERTIFIED")
                self.assertIs(row["goal_satisfied"], expected[order]["goal"])
                directory = self.complete / "runs" / row["candidate_id"]
                bundle = read_bundle(directory / "history.json.gz")
                audit = read_bundle(directory / "audit.json")
                observation = read_bundle(directory / "observation.json")
                record = read_bundle(directory / "record.json")
                self.assertEqual(bundle["status"], "COMPLETE")
                self.assertEqual(audit["status"], "PASS")
                self.assertTrue(audit["verified"])
                self.assertEqual(len(bundle["paths"]), 1)
                self.assertEqual(record["problem_id"], self.pins["problem_id"])
                self.assertEqual(record["history_id"], digest(bundle))
                self.assertEqual(record["observation_id"], digest(observation))
                self.assertEqual(record["audit_receipt_id"], digest(read_bundle(directory / "audit-receipt.json")))
                self.assertEqual(audit["input_sha256"], row["input_identity"])
                path = bundle["paths"][0]
                self.assertEqual(path["snapshot"]["state"]["budget"], expected[order]["budget"])
                self.assertEqual([e["due"] for e in path["snapshot"]["pending"]], expected[order]["pending_due"])
                blocked = [r for r in path["history"] if r["kind"] == "attempt_blocked"]
                step = expected[order]["blocked_step"]
                self.assertEqual([r["step"] for r in blocked], [] if step is None else [step])
                self.assertEqual([r["action"] for r in blocked], [] if step is None else ["Q"])
                evidence = observation["paths"][0]
                for reference in evidence["attempt_evidence"]["blocked_rows"]:
                    history_row = path["history"][reference["row_index"]]
                    self.assertEqual(history_row["kind"], "attempt_blocked")
                    self.assertEqual(history_row["failures"], reference["failures"])

    def test_deterministic_content_identities_distinct_run_occurrences(self):
        second = runner.run(self.problem, self.manifest, self.pins, self.work)
        for first, other in zip(self.result["candidates"], second["candidates"]):
            for key in ("candidate_id", "plan_id", "input_identity", "execution_id", "history_id",
                        "audit_receipt_id", "observation_id"):
                self.assertEqual(first[key], other[key], key)
            self.assertNotEqual(first["run_id"], other["run_id"])
        self.assertNotEqual(self.result["result_id"], second["result_id"])

    def test_pinned_manifest_matches_independent_cartesian_domain(self):
        verify_frozen(self.problem, self.manifest, self.pins)
        self.assertEqual(generate(self.problem), self.manifest["members"])
        self.assertEqual({tuple(m["order"]) for m in self.manifest["members"]},
                         {tuple(m["order"]) for m in self.oracle["orders"]})

    def test_canonical_identity_domain_types_order_unicode_and_lf(self):
        raw = '{"a":true,"å":1}\n'.encode("utf-8")
        self.assertEqual(encode({"å": 1, "a": True}), raw)
        self.assertEqual(digest({"a": True, "å": 1}), hashlib.sha256(raw).hexdigest())
        self.assertNotEqual(digest(True), digest(1))
        self.assertNotEqual(digest(["P", "Q"]), digest(["Q", "P"]))
        reversed_keys = dict(reversed(list(self.problem.items())))
        self.assertEqual(digest(reversed_keys), self.pins["problem_id"])

    def test_changed_problem_is_rejected_before_any_replay(self):
        mutations = [lambda p: p.update(revision=2),
                     lambda p: p["model"]["initial"].update(ready=True),
                     lambda p: p["model"]["metadata"].update(assumption="Changed source meaning"),
                     lambda p: p["observation"]["terminal_equals"].update(done=False),
                     lambda p: p["sources"].update(evidence="a" * 64)]
        for mutate in mutations:
            problem = deepcopy(self.problem)
            mutate(problem)
            with self.subTest(problem_id=digest(problem)), patch.object(runner, "cli_process") as calls:
                with self.assertRaisesRegex(ValueError, "identity mismatch"):
                    runner.run(problem, self.manifest, self.pins, self.work)
                calls.assert_not_called()
                self.assertFalse(self.work.exists())

    def test_goal_revision_changes_problem_not_model_or_plan(self):
        changed = deepcopy(self.problem)
        changed["observation"]["terminal_equals"]["done"] = False
        manifest, pins = freeze(changed)
        self.assertNotEqual(pins["problem_id"], self.pins["problem_id"])
        self.assertEqual(manifest["model_id"], self.manifest["model_id"])
        self.assertEqual(manifest["members"], self.manifest["members"])
        result = runner.run(changed, manifest, pins, self.work)
        self.assertEqual(result["search_coverage"]["status"], "COMPLETE")
        self.assertTrue(all(r["goal_satisfied"] is False for r in result["candidates"]))

    def test_goal_quantifies_all_event_paths_not_just_first_path(self):
        problem = deepcopy(self.problem)
        problem["model"]["events"]["clear"] = {
            "kind": "timer", "requires": [], "absent": None, "source": "Order-sensitive test",
            "outcomes": {"clear": {"set": {"ready": False}, "add": {}}}}
        problem["model"]["initial_events"] = [{"id": "clear", "due": 1, "scheduled_at": 0}]
        problem["model"]["reference_event_order"] = ["clear", "ready_event"]
        manifest, pins = freeze(problem)
        result = runner.run(problem, manifest, pins, self.work)
        first = result["candidates"][0]  # P Q X: two legitimate simultaneous-event orders.
        self.assertEqual(first["run_status"], "CERTIFIED")
        observation = read_bundle(self.work / "runs" / first["candidate_id"] / "observation.json")
        self.assertEqual([p["goal_satisfied"] for p in observation["paths"]], [True, False])
        self.assertIs(first["goal_satisfied"], False)

    def test_unsupported_problem_and_grammar_fail_closed(self):
        for key, value in (("unknowns", []), ("policy", {}), ("script", {})):
            changed = dict(self.problem, **{key: value})
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_problem(changed)
        for key, value in (("retry", True), ("early_stop", True), ("mode", "if_not_taken"),
                           ("slots", [False, 1, 2]), ("decision_ids", ["P", "P", "X"])):
            changed = deepcopy(self.problem)
            changed["search"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_problem(changed)

    def test_missing_duplicate_unexpected_and_wrong_candidate_content(self):
        for kind in ("missing", "duplicate", "unexpected", "script", "order", "plan_id", "input_identity"):
            members = deepcopy(self.manifest["members"])
            if kind == "missing":
                members.pop()
            elif kind == "duplicate":
                members[-1] = deepcopy(members[0])
            elif kind == "unexpected":
                members[-1]["candidate_id"] = "0" * 64
            elif kind == "script":
                members[-1]["script"]["steps"]["0"][0]["mode"] = "if_not_taken"
            elif kind == "order":
                members[-1]["order"] = ["P", "Q", "X"]
            else:
                members[-1][kind] = "0" * 64
            with self.subTest(kind=kind):
                coverage = check_coverage(self.manifest, members)
                self.assertNotEqual(coverage["status"], "COMPLETE")

    def test_rehashed_malformed_manifest_does_not_redefine_search_domain(self):
        bad = deepcopy(self.manifest)
        bad["members"][-1] = deepcopy(bad["members"][0])
        pins = dict(self.pins, manifest_id=digest(bad))
        with self.assertRaises(ValueError):
            verify_frozen(self.problem, bad, pins)

    def test_six_certified_runs_do_not_repair_bad_enumeration(self):
        root = self.clone()
        members = deepcopy(self.manifest["members"])
        members[-1] = deepcopy(members[0])
        write_bundle(members, root / "enumeration.json")
        result = runner.verify(root, self.pins)
        self.assertTrue(all(r["run_status"] == "CERTIFIED" for r in result["candidates"]))
        self.assertEqual(result["search_coverage"]["status"], "INVALID")
        self.assertTrue(result["enumeration_coverage"]["duplicates"])

    def test_bad_generator_cannot_start_replay(self):
        with patch.object(runner, "generate", return_value=self.manifest["members"][:-1]), \
             patch.object(runner, "cli_process") as calls:
            with self.assertRaisesRegex(ValueError, "Generator coverage"):
                runner.run(self.problem, self.manifest, self.pins, self.work)
            calls.assert_not_called()

    def test_search_budget_retains_all_six_members_and_unknown_goals(self):
        result = runner.run(self.problem, self.manifest, self.pins, self.work, max_candidates=2)
        self.assertEqual(result["enumeration_coverage"]["status"], "COMPLETE")
        self.assertEqual(result["search_coverage"]["status"], "INCOMPLETE")
        self.assertEqual(len(result["candidates"]), 6)
        self.assertEqual([r["run_status"] for r in result["candidates"]], ["CERTIFIED"] * 2 + ["NOT_RUN"] * 4)
        self.assertTrue(all(r["goal_satisfied"] is None for r in result["candidates"][2:]))

    def test_replay_limit_never_becomes_goal_failure(self):
        result = runner.run(self.problem, self.manifest, self.pins, self.work,
                            limits=dict(LIMITS, max_steps=1))
        self.assertEqual(result["search_coverage"]["status"], "INCOMPLETE")
        self.assertTrue(all(r["goal_satisfied"] is None for r in result["candidates"]))
        self.assertEqual(read_bundle(self.candidate_dir(self.work) / "audit.json")["status"], "INCOMPLETE")

    def test_model_error_is_unknown_not_an_ordinary_block(self):
        problem = deepcopy(self.problem)
        problem["model"]["domains"]["counter"] = {"integer": [0, 0]}
        problem["model"]["initial"]["counter"] = 0
        problem["model"]["decisions"]["P"]["effects"]["add"]["counter"] = 1
        manifest, pins = freeze(problem)
        result = runner.run(problem, manifest, pins, self.work)
        self.assertEqual(result["search_coverage"]["status"], "INCOMPLETE")
        self.assertTrue(all(r["goal_satisfied"] is None for r in result["candidates"]))
        for candidate in result["candidates"]:
            bundle = read_bundle(self.work / "runs" / candidate["candidate_id"] / "history.json.gz")
            self.assertEqual(bundle["status"], "ERROR")
            self.assertEqual(bundle["error"]["type"], "ModelError")

    def test_audit_fail_blocks_verified_analysis(self):
        root = self.clone()
        write_bundle({"status": "FAIL", "verified": False}, self.candidate_dir(root) / "audit.json")
        self.assert_unverified(root)

    def test_forged_history_with_updated_hashes_and_old_pass_is_reaudited(self):
        root = self.clone()
        directory = self.candidate_dir(root)
        bundle = read_bundle(directory / "history.json.gz")
        bundle["paths"][0]["history"][-1]["after"]["state"]["done"] = False
        write_bundle(bundle, directory / "history.json.gz")
        record = read_bundle(directory / "record.json")
        record["history_id"] = digest(bundle)
        record["artifact_hashes"]["history.json.gz"] = file_hash(directory / "history.json.gz")
        write_bundle(record, directory / "record.json")
        self.assert_unverified(root)

    def test_audited_history_from_other_candidate_cannot_be_substituted(self):
        root = self.clone()
        a, b = self.candidate_dir(root), self.candidate_dir(root, 1)
        shutil.copyfile(b / "history.json.gz", a / "history.json.gz")
        shutil.copyfile(b / "audit.json", a / "audit.json")
        self.assert_unverified(root)

    def test_input_substitution_is_rejected(self):
        root = self.clone()
        directory = self.candidate_dir(root)
        wrong = materialize(self.problem, ["X", "Q", "P"])
        write_bundle(wrong, directory / "input.json")
        self.assert_unverified(root)

    def test_observation_tampering_is_recomputed(self):
        root = self.clone()
        directory = self.candidate_dir(root)
        observation = read_bundle(directory / "observation.json")
        observation["goal_satisfied"] = False
        write_bundle(observation, directory / "observation.json")
        self.assert_unverified(root)

    def test_receipt_and_record_tampering_are_rejected(self):
        root = self.clone()
        directory = self.candidate_dir(root)
        receipt = read_bundle(directory / "audit-receipt.json")
        receipt["history_id"] = "0" * 64
        write_bundle(receipt, directory / "audit-receipt.json")
        self.assert_unverified(root)
        shutil.copyfile(self.candidate_dir(self.complete) / "audit-receipt.json", directory / "audit-receipt.json")
        record = read_bundle(directory / "record.json")
        record["candidate_id"] = self.manifest["members"][1]["candidate_id"]
        write_bundle(record, directory / "record.json")
        self.assert_unverified(root)

    def test_interruption_is_preserved_and_verify_never_replays(self):
        root = self.clone()
        (self.candidate_dir(root) / "record.json").unlink()
        with patch.object(runner, "cli_process", side_effect=AssertionError("No replay on verify")):
            self.assert_unverified(root)
        self.assertTrue((self.candidate_dir(root) / "started.json").exists())
        with self.assertRaises(FileExistsError):
            runner.run(self.problem, self.manifest, self.pins, root)

    def test_unexpected_run_directory_invalidates_coverage(self):
        root = self.clone()
        (root / "runs/unexpected").mkdir()
        result = runner.verify(root, self.pins)
        self.assertEqual(result["search_coverage"]["status"], "INVALID")

    def test_runtime_and_problem_tampering_fail_at_trust_boundary(self):
        root = self.clone()
        runtime = read_bundle(root / "runtime.json")
        runtime["files"]["cli.py"] = "0" * 64
        write_bundle(runtime, root / "runtime.json")
        with self.assertRaisesRegex(ValueError, "Runtime build mismatch"):
            runner.verify(root, self.pins)
        shutil.copyfile(self.complete / "runtime.json", root / "runtime.json")
        problem = read_bundle(root / "problem.json")
        problem["revision"] += 1
        write_bundle(problem, root / "problem.json")
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            runner.verify(root, self.pins)

    def test_generator_has_no_execution_imports(self):
        for name in ("enumerate_scripts.py", "contracts.py", "observe.py", "runner.py", "bridge.py"):
            tree = ast.parse((ROOT / name).read_text())
            imports = []
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    imports.append(node.module or "")
                elif isinstance(node, ast.Import):
                    imports.extend(x.name for x in node.names)
            self.assertFalse(any(x.startswith(("core.transitions", "core.expressions", "core.replay"))
                                 for x in imports), name)
        self.assertNotIn("expected.json", (ROOT / "runner.py").read_text())
        self.assertNotIn("expected.json", (ROOT / "enumerate_scripts.py").read_text())

    def test_frozen_ce3_backend_bytes_unchanged(self):
        frozen = read_bundle(ROOT / "fixtures/backend-files.json")
        self.assertEqual(runtime_manifest()["files"], frozen["files"])
        for name, expected in frozen["files"].items():
            self.assertEqual(file_hash(REPLAY / name), expected, name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
