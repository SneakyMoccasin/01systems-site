"""Tests for the regression harness, independently of expected business results."""
from copy import deepcopy
from itertools import permutations, product
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.history import read_bundle
from core.replay import replay
from adapters.factory_v1 import adapt
from verification.checkpoint_checks import FACTORY
from verification.permutation_coverage import coverage
from verification.semantic_compare import compare, Divergence
from verification.regression_catalog import catalog


class RegressionHarness(unittest.TestCase):
    def test_cartesian_oracle_rejects_missing_duplicate_and_wrong_groups(self):
        groups = {"3": ["alpha", "beta"], "7": ["gamma", "delta"]}
        paths = []
        for first, second in product(permutations(groups["3"]), permutations(groups["7"])):
            paths.append({"history": [dict(step=s, kind="event_applied", action=a)
                                      for s, order in ((3, first), (7, second)) for a in order]})
        bundle = dict(status="COMPLETE", paths=paths)
        self.assertEqual(coverage(bundle, groups)["observed"], 4)
        for change in ("missing", "duplicate_same_count", "wrong_group", "incomplete"):
            with self.subTest(change=change):
                bad = deepcopy(bundle)
                if change == "missing":
                    bad["paths"].pop()
                elif change == "duplicate_same_count":
                    bad["paths"][-1] = deepcopy(bad["paths"][0])
                elif change == "wrong_group":
                    bad["paths"][0]["history"][0]["step"] = 4
                else:
                    bad["status"] = "INCOMPLETE"
                with self.assertRaises(ValueError):
                    coverage(bad, groups)

    def test_catalog_inputs_are_frozen_and_envelope_is_documentary(self):
        specs = catalog()
        self.assertEqual(sum(s["main"] for s in specs), 19)
        self.assertEqual(len(specs), 34)
        bank = read_bundle(FACTORY / "bank-rejection-ab/scripts.json")
        script = deepcopy(bank["A"])
        model = read_bundle(FACTORY / "model.json")
        metadata = read_bundle(ROOT / "cases/factory/metadata.json")
        converted = adapt(model, script, metadata, {}, envelope_source=bank["source"])
        explicit = dict(script, source=bank["source"])
        self.assertEqual(converted, adapt(model, explicit, metadata, {}))
        self.assertEqual(script, bank["A"])
        self.assertNotIn("source", script)

    def test_unconsumed_external_binding_is_part_of_path_identity(self):
        spec = next(s for s in catalog() if s["package"] == "bank" and s["name"] == "A")
        bundle = replay(spec["run"])
        old = read_bundle(spec["reference"])
        self.assertEqual(compare(old, bundle)["paths"], 2)
        # This branch is never applied: row-only matching would miss the difference.
        bundle["input"]["outcomes"]["E_QUALITY"] = "rejected"
        with self.assertRaisesRegex(Divergence, "External binding mismatch"):
            compare(old, bundle)


if __name__ == "__main__":
    unittest.main()
