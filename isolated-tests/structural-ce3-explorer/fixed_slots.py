"""Bounded syntactic /2 grammar and independent population oracle. No replay rules."""
from math import factorial

from bridge import equal, obj, require

SUPPORT_LIMITS = {"max_decisions": 6, "max_candidates": 720, "max_cells": 2160}


def search_size(problem):
    """Fail before enumeration, hashing candidate inputs, or copying scenarios.

    Reject n > 6 before factorial: even the size calculation stays bounded.
    This is a support limit, never a truncated expected population.
    """
    ids = problem["search"]["decision_ids"]
    scenarios = problem["scenario_set"]["members"]
    require(type(ids) is list and bool(ids), "Nonempty decision set required")
    require(type(scenarios) is list and bool(scenarios), "Nonempty scenario set required")
    n, s = len(ids), len(scenarios)
    require(n <= SUPPORT_LIMITS["max_decisions"],
            f"Unsupported search size: {n}! candidates; at most 6 decisions / 720 candidates")
    count = factorial(n)
    require(count <= SUPPORT_LIMITS["max_candidates"] and count * s <= SUPPORT_LIMITS["max_cells"],
            f"Unsupported search size: {count} candidates x {s} scenarios = {count * s} cells; maximum 2160")
    return {"decision_count": n, "candidate_count": count, "scenario_count": s,
            "cell_count": count * s, "support_limits": dict(SUPPORT_LIMITS)}


def validate_search(problem):
    search = problem["search"]
    obj(search, ("kind", "decision_ids", "slots", "mode", "retry", "early_stop"), "search")
    ids, slots = search["decision_ids"], search["slots"]
    require(type(ids) is list and bool(ids) and all(type(x) is str and x.strip() for x in ids),
            "Nonempty decision IDs required")
    require(len(set(ids)) == len(ids), "Decision IDs must be unique")
    require(type(slots) is list and len(slots) == len(ids) and all(type(t) is int for t in slots),
            "Exactly one integer slot per decision required")
    require(all(a < b for a, b in zip(slots, slots[1:])), "Slots must be strictly increasing")
    equal(search, {"kind": "permutations_once/2", "decision_ids": ids, "slots": slots,
                   "mode": "attempt", "retry": False, "early_stop": False}, "Unsupported search grammar")
    clock = problem["model"]["clock"]
    require(type(clock["start"]) is int and type(clock["horizon"]) is int and
            clock["start"] <= slots[0] <= slots[-1] <= clock["horizon"],
            "Slots must lie within the declared integer clock start/horizon")
    # Full clock, rule, outcome and input validation remains in the existing schema.


def expected_orders(ids):
    """Lexicographic successor, independent of itertools.permutations/product.

    Start at the least permutation. Swap the rightmost increasing pivot with
    its least greater suffix item, then reverse the descending suffix. Each
    step reaches the immediate successor; the descending word terminates.
    Only n! words are visited, with O(n) auxiliary memory.
    """
    word = sorted(ids)
    while True:
        yield tuple(word)
        pivot = len(word) - 2
        while pivot >= 0 and word[pivot] >= word[pivot + 1]:
            pivot -= 1
        if pivot < 0:
            return
        successor = len(word) - 1
        while word[successor] <= word[pivot]:
            successor -= 1
        word[pivot], word[successor] = word[successor], word[pivot]
        word[pivot + 1:] = reversed(word[pivot + 1:])
