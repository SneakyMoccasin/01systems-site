"""Independent Cartesian oracle from frozen case simultaneity groups.

Does not import the replay enumerator or auditor's branching-tree checker.
The full signature (including singleton events) is additionally compared to
legacy histories by semantic_compare; this oracle checks all concurrent groups.
"""
from itertools import permutations, product
from verification.checkpoint_checks import require


def coverage(bundle, groups):
    require(bundle["status"] == "COMPLETE", "Coverage is INCOMPLETE: no complete bundle")
    groups = sorted((int(step), events) for step, events in groups.items())
    expected = set(product(*[[(step, order) for order in permutations(events)] for step, events in groups]))
    seen = []
    for path in bundle["paths"]:
        actual = {}
        for row in path["history"]:
            if row["kind"] in ("event_applied", "event_inapplicable"):
                actual.setdefault(row["step"], []).append(row["action"])
        seen.append(tuple((step, tuple(events)) for step, events in sorted(actual.items()) if len(events) > 1))
    missing, extra = expected - set(seen), set(seen) - expected
    duplicates = len(seen) - len(set(seen))
    require(not missing and not extra and not duplicates,
            f"Permutation coverage: missing={sorted(missing)!r}, extra={sorted(extra)!r}, duplicates={duplicates}")
    return dict(status="PASS", expected=len(expected), observed=len(seen), missing=0, extra=0, duplicates=0)
