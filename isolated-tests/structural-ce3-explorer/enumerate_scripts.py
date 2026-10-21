"""Syntactic candidate production only. Never executes or tests model rules."""
from itertools import permutations

from contracts import member, validate_problem


def generate(problem):
    validate_problem(problem)
    return [member(problem, order) for order in permutations(problem["search"]["decision_ids"])]
