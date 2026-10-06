#!/usr/bin/env python3
"""Execute the bounded checkpoint-1 suite and persist deterministic evidence."""
import argparse
import io
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from cli import output_allowed
from core.history import write_bundle
from verification.checkpoint_checks import main as cases_main, preservation, sha


class Results(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.passed = []
        self.subchecks = 0

    def addSuccess(self, test):
        super().addSuccess(test)
        self.passed.append(test.id())

    def addSubTest(self, test, subtest, error):
        self.subchecks += 1
        super().addSubTest(test, subtest, error)


def main(output):
    output = output_allowed(output)
    if output.exists():
        raise ValueError("Use a new output directory; existing evidence is never overwritten")
    before = preservation()
    output.mkdir(parents=True)
    write_bundle({"status": "RUNNING", "checkpoint": 1}, output / "summary.json")
    try:
        suite = unittest.defaultTestLoader.discover(str(ROOT / "verification"), pattern="test_*.py")
        result = unittest.TextTestRunner(stream=io.StringIO(), verbosity=2, resultclass=Results).run(suite)
        tests = {"status": "PASS" if result.wasSuccessful() else "FAIL", "tests_run": result.testsRun,
                 "subchecks": result.subchecks, "passed": sorted(result.passed),
                 "failures": [{"test": t.id(), "traceback": trace} for t, trace in result.failures + result.errors]}
        write_bundle(tests, output / "generic-checks.json")
        if not result.wasSuccessful():
            raise ValueError("Generic checks failed; see generic-checks.json")
        cases_main(output / "cases")
        after = preservation()
        if before != after:
            raise ValueError("Preservation changed during checkpoint")
        code_files = [p for folder in ("core", "audit", "adapters", "cases", "verification")
                      for p in (ROOT / folder).rglob("*") if p.suffix in (".py", ".json")]
        code_files += [ROOT / "cli.py"]
        summary = {"status": "PASS", "checkpoint": 1, "profile": "fixed-replay/0.1",
                   "generic_tests": result.testsRun, "generic_subchecks": result.subchecks,
                   "case_sets": ["factory_candidate", "transport_A_ready"], "paths_per_run": 6,
                   "complete_runs": 2, "preservation": after,
                   "code_and_fixture_sha256": {str(p.relative_to(ROOT)): sha(p) for p in sorted(code_files)},
                   "full_634_regression_executed": False, "first_divergence": None}
        write_bundle(summary, output / "summary.json")
        print(f"PASS: {result.testsRun} tests, {result.subchecks} subchecks; checkpoint 1 complete")
    except Exception as error:
        write_bundle({"status": "FAIL", "checkpoint": 1, "message": str(error)}, output / "summary.json")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    main(parser.parse_args().output)
