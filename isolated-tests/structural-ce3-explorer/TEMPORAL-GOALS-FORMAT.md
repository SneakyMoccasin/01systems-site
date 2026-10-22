# CE3 history goals /1 and scenario problem /3

This opt-in extension uses the existing `scenario_runner.py` freeze/run/verify
commands. [Architecture and exact sampling](TEMPORAL-GOALS-ARCHITECTURE.md)
were specified before implementation. Replay, audit, clocks, scenarios,
search grammar, budgets, prefix checks and robustness retain their semantics.

## Declaration

`ce3-scenario-problem/3` has exactly the same outer fields as /2. It retains
`permutations_once/2`, 1..6 decisions, explicit fixed slots and at most 720
candidates / 2160 cells. Only `observation` changes:

```json
{
  "schema_version": "ce3-history-goal/1",
  "goal_id": "delivery_with_continuity",
  "sampling": "each_row.before_after.snapshot_step/1",
  "quantifier": "all_event_paths",
  "all_attempts_accepted": true,
  "all": [
    {"id": "finish", "operator": "terminal", "equals": {"done": true}},
    {"id": "continuity", "operator": "always", "equals": {"ready": true}, "through": 5},
    {"id": "early_finish", "operator": "reach_by", "equals": {"done": true}, "deadline": 3}
  ]
}
```

The example requires declared `done`/`ready` boolean domains and a clock
containing both 3 and 5. A full runnable declaration is
[`fixtures/temporal-problem.json`](fixtures/temporal-problem.json).

All displayed fields are required; unknown fields are rejected. `goal_id`
and component `id` are nonblank strings, with component IDs unique within the
nonempty `all` list. Components have exactly `id`, `operator`, `equals`, plus
`through` for always or `deadline` for reach_by. Terminal has no time field.
The predicate is a nonempty map of declared state fields to in-domain values;
all equalities must hold in the **same snapshot**. Equality preserves types:
boolean true is not integer 1. No expressions, code, ge, any/not, nested all,
nested temporal operators, arbitrary intervals or existential path quantifiers.

Time limits are integers, excluding booleans/floats/strings, and must satisfy
`model.clock.start <= limit <= model.clock.horizon`. Negative integer times
and start=horizon are supported. Both boundaries are inclusive; start is
always the declared analysis start, never the first decision or first event.

## Exact semantics

For each **fully audited event path**, form an ordered sequence of all history
rows by row index, before then after per row. Each point has time
`row[side].step`. In particular, advance.before has time t and advance.after
has time t+1 although the row itself has step t. Initial state occurs first
at row 0.before; its duplicate row 0.after is retained. All marker, event,
decision, blocked and inapplicable rows participate. Identical neighboring
states remain distinct points. Last row.after is the terminal state.

| Component | Required condition |
|---|---|
| terminal | Predicate holds in last row.after at the inclusive horizon |
| always | Predicate holds at every point with snapshot time in [start, through] |
| reach_by | Predicate holds at some point with snapshot time in [start, deadline] |

Events at the limit and decisions at the limit are included. Multiple
transitions at one time are all included: a drop followed by recovery in the
same time step violates always. Initial success or transient later success
suffices for reach_by, even if the predicate is false at horizon. Different
reach_by components may have different witnesses, but all equalities within
one component require a common witness.

Replay already carries state through empty steps and records it in markers;
the observer neither fills gaps nor applies transitions. State is unchanged
between modeled transitions. Internal suboperations of an atomic transition
are not separately observable. Pending events and unused external outcome
bindings are not evidence that their future effects occurred.

Every path reports component outcomes separately from `all_attempts_accepted`.
The latter retains the old rule: exactly n decision_executed rows and no
attempt_blocked rows over the **whole** audited run. A blocked late decision
still prevents the combined goal even when all deadlines were earlier.

`path.goal_satisfied = path.components_satisfied AND path.all_attempts_accepted`.
The cell goal is the conjunction of this expression over **all** audited
event paths. Existing scenario robustness is unchanged: FALSE if a certified
scenario cell is negative; TRUE only if every declared scenario is certified
positive; UNKNOWN otherwise. Unknown scenarios do not cancel an independently
certified negative scenario. A cell with incomplete path coverage, however,
provides no component proofs at all in this stage, even if a partial history
appears to contain a witness or violation.

## Observation and evidence

`ce3-goal-observation/2` retains problem/definition/input/history/audit-receipt/
observer-build IDs, quantifier, paths and goal_satisfied from /1. It adds
`components_satisfied` and `all_attempts_accepted` at the top level, each
universally quantified over paths. Each path retains path_index, event_orders,
terminal_evidence, terminal_state, pending and attempt_evidence. It replaces
terminal_checks with `components` and adds `components_satisfied`.

Each component result has exactly `id`, `operator`, `predicate` (the declared
equals map), boolean `satisfied`, and `evidence`. Evidence always contains:

- `interval`: [start, limit] for temporal components; [horizon, horizon] for terminal.
- `inclusive`: true.
- `points`: the complete ordered list of covered `{row_index, side, step}` references.

Additional evidence:

| Component outcome | Evidence |
|---|---|
| always TRUE | Whole interval and every covered point; no counterexample |
| always FALSE | First failing point as `counterexample`, including its complete `state` |
| reach_by TRUE | First satisfying point as `witness`, including its complete `state` |
| reach_by FALSE | Whole interval and every covered point without witness |
| terminal | One last-row after point and `terminal_state`; a failing point also has counterexample |

Witness/counterexample objects have exactly row_index, side, step, state.
The same path's event_orders and enclosing history/input identities identify
their source; row indices are not global IDs and are never paired across
scenarios. Point references are verified by deriving the entire observation
again after fresh audit, not by trusting their stored hashes. Coverage means
checked modeled snapshots, not elapsed-duration measurements.

Audit completion precedes every projection. Missing artifacts, incomplete
event coverage, corrupted gzip, audit mismatch, model error and replay limits
yield cell UNKNOWN/null, never a certified negative goal. No new component
observations are produced from error.last_history or any other partial trace.
Technical failure is separate from CERTIFIED/NOT_SATISFIED, which is valid
negative evidence. Existing CLI codes remain 0 complete, 2 incomplete/invalid
reportable population, 1 invalid top-level declaration or identity bindings.

## Versions, identity and read-only verify

| Payload | Version |
|---|---|
| scenario problem, cell, manifest, pins, execution, attempt, run, observation, result | /3 |
| history goal definition | ce3-history-goal/1 |
| goal projection | ce3-goal-observation/2 |
| search grammar, scenario search-space and candidate | /2, unchanged search semantics |
| scenario-set/space/scenario, plan, execution, audit receipt, runtime/build, CE3 contracts | existing /1 (profile fixed-replay/0.1) |

`definition_id = digest(observation)` binds version, sampling, quantifier,
acceptance requirement, conjunction order/IDs, each operator, typed predicate
and time limit. The full problem additionally binds clock/model/scenarios.
Manifest/pins, cell, batch and observation bind these identities as before.
Changing a deadline changes definition/problem/cell/manifest/pins/observation
even when replay input and search/candidate identities remain identical.

Verify reconstructs the frozen domain, checks external pins, re-audits the
expected input/history, recomputes every component/evidence point, and compares
the **entire** observation and record. Rehashing a false witness, removing a
violation or rebinding a stale observation to a changed deadline cannot replace
this computation. Verify never replays, writes artifacts or trusts result.json.

Explorer /1 and scenario /1 and /2 retain ce3-terminal-goal/1 and their exact
old meanings and frozen fixtures. Temporal definitions require explicit /3;
a terminal-only /3 conjunction can represent the old state requirement.
No automatic migration. Adding/changing observer code changes explorer_build_id;
archived packages still require their recorded build, as before.

Trust assumes external pins, trusted code and stable local files. Hashes are
integrity bindings, not signatures or source-truth guarantees. A satisfied
modeled-state predicate does not prove that the business model is complete
or true. No optimization, new search grammar, retry/resume, adaptive policy,
operating model, UI or onboarding behavior is introduced.

## Reproduction

Run from the repository root with new destinations. The example intentionally
has a verified negative combined goal while all replay/audit checks pass.

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/temporal-problem.json --output /tmp/ce3-temporal-frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/temporal-problem.json --manifest /tmp/ce3-temporal-frozen/manifest.json --pins /tmp/ce3-temporal-frozen/pins.json --output /tmp/ce3-temporal-example
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /tmp/ce3-temporal-frozen/pins.json --output /tmp/ce3-temporal-example
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/temporal_tests -p 'test_*.py' -v
```

Retain pins outside the run package. Read per-component evidence in
`runs/<cell_id>/observation.json`; CLI summarizes the combined cell goal.
