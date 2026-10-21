"""Bounded /2 syntax and independent population oracle. No replay semantics."""
from math import factorial

from bridge import equal, obj, require

MAX_CANDIDATES = 720
MAX_CELLS = 2160


def search_size(problem):
    """Check arithmetic bounds before constructing any candidate or manifest.

    Stop factorial multiplication as soon as unsupported; even a huge declared
    ID list must not cause giant integer arithmetic or permutation enumeration.
    Exact counts are returned for every supported declaration.
    """
    ids = problem["search"]["decision_ids"]
    scenarios = problem["scenario_set"]["members"]
    require(type(ids) is list and bool(ids), "Nonempty decision set required")
    require(type(scenarios) is list and bool(scenarios), "Nonempty scenario set required")
    count = 1
    for factor in range(2, len(ids) + 1):
        count *= factor
        require(count <= MAX_CANDIDATES,
                "Unsupported search size: n! exceeds 720 candidates")
    cells = count * len(scenarios)
    require(cells <= MAX_CELLS,
            f"Unsupported search size: {count} candidates x {len(scenarios)} scenarios = "
            f"{cells} cells exceeds {MAX_CELLS}")
    return {"decisions": len(ids), "candidates": count, "scenarios": len(scenarios),
            "cells": cells, "max_candidates": MAX_CANDIDATES, "max_cells": MAX_CELLS}


def validate_search(problem):
    search = problem["search"]
    obj(search, ("kind", "decision_ids", "slots", "mode", "retry", "early_stop"), "search")
    ids, slots = search["decision_ids"], search["slots"]
    require(type(ids) is list and bool(ids) and
            all(type(x) is str and bool(x.strip()) for x in ids), "Nonempty decision IDs required")
    require(len(set(ids)) == len(ids), "Decision set must be unique")
    require(type(slots) is list and len(slots) == len(ids), "One time slot per decision required")
    require(all(type(t) is int for t in slots), "Time slots must be integers")
    require(all(a < b for a, b in zip(slots, slots[1:])), "Time slots must be strictly increasing")
    equal(search, {"kind": "permutations_once/2", "decision_ids": ids, "slots": slots,
                   "mode": "attempt", "retry": False, "early_stop": False}, "Unsupported search grammar")
    # Bounds and clock semantics are subsequently checked by unchanged CE3 schema.


def expected_orders(ids):
    """Decode each factorial rank; independent of itertools.permutations.

    At width k, rank // (k-1)! chooses one unused symbol. The remainder
    selects its suffix. This is a bijection on [0,n!), with O(n*n!) output
    and O(n^2*n!) small-list work, never an n^n Cartesian population.
    Caller must pass the size gate first.
    """
    for rank in range(factorial(len(ids))):
        remaining, order = sorted(ids), []
        while remaining:
            index, rank = divmod(rank, factorial(len(remaining) - 1))
            order.append(remaining.pop(index))
        yield tuple(order)
