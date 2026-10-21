"""Fresh CE3 replay/audit against the existing 34-case semantic oracle.

No writes to existing results. This complements (does not replace) the existing
core and workbench suites, and does not run the full two-pass checkpoint harness.
"""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import digest, read_bundle
from core.replay import replay
from audit.verify import audit_bundle
from verification.regression_catalog import catalog
from verification.semantic_compare import compare
from cases.observations import check_case


class ExistingCases(unittest.TestCase):
    def test_34_existing_cases_654_paths(self):
        specs = catalog()
        self.assertEqual(len(specs), 34)
        paths = 0
        for spec in specs:
            with self.subTest(package=spec["package"], name=spec["name"]):
                bundle = replay(spec["run"])
                self.assertEqual(audit_bundle(bundle, digest(spec["run"]))["status"], "PASS")
                old = read_bundle(spec["reference"])
                self.assertEqual(compare(old, bundle)["status"], "PASS")
                check_case(spec, bundle, old)
                paths += len(bundle["paths"])
        self.assertEqual(paths, 654)


if __name__ == "__main__":
    unittest.main(verbosity=2)
