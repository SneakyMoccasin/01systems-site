# CE3 declared decisions and fixed slots /2

This opt-in extension uses `scenario_runner.py` and the audited outcome-only
wrapper. It keeps replay, schema, profile, audit and terminal goal semantics
unchanged. See [the pre-implementation architecture check](FIXED-SLOTS-ARCHITECTURE.md).
The legacy [single-scenario /1](FORMAT.md) and [scenario /1](SCENARIO-FORMAT.md)
remain supported with exactly their original three-decision restrictions.

## Declaration

`ce3-scenario-problem/2` has the same exact fields as scenario problem /1.
`search` is now:

```json
{
  "kind": "permutations_once/2",
  "decision_ids": ["X", "T", "Q", "P"],
  "slots": [2, 5, 9, 12],
  "mode": "attempt",
  "retry": false,
  "early_stop": false
}
```

The decision list must be nonempty, contain unique nonblank string IDs, and
include exactly all model decisions. Its length declares n; no second count
can disagree with it. It represents a set, not a prescribed execution order.
The n slots must be explicitly supplied, strictly increasing integers (not
booleans, floats or numeric strings). Each candidate uses each ID exactly once
as an attempt, placing permutation element i at slot i. There are no optional
decisions, retries, pruning, optimization, adaptive policies or time search.

The separately declared `model.clock` retains the CE3 contract: integer start
and horizon, start <= horizon, unit steps, events before decisions, inclusive
horizon. Every slot must lie within that interval. Negative times, a first
slot after start, empty intervening steps, and a horizon after the last slot
are allowed. No implicit horizon is inferred from slots. Events at horizon
execute; events beyond horizon remain pending. A horizon longer than the
declared replay `max_steps` is a valid problem but an incomplete execution.

All scenarios share the entire model, initial state, sources, clock, slots,
goal and candidate script. `ce3-scenario-set/1` is unchanged: a nonempty explicit
list of unique nonblank labels and full outcomes maps; only outcomes vary.
Labels with identical outcomes remain distinct scenarios. A singleton set
supports one-scenario problems in /2; the original enscenario entry point
`runner.py` continues to enforce `ce3-explorer-problem/1`.

## Size gate and computation budgets

Before producing any candidate, manifest or run, derive n! candidates and
n! * s cells for s declared scenarios. The supported bounds are **720
candidates and 2160 cells**, both inclusive. Thus n is 1..6; at n=6 at most
3 scenarios fit, at n=5 at most 18, and at n=1 at most 2160. A preflight loop
multiplies factors only until the candidate limit is exceeded: an enormous
input list cannot trigger enormous factorial arithmetic. Unsupported counts
raise `Unsupported search size` without a manifest, output directory, replay
or coverage claim. For supported problems all exact counts are returned.

`manifest.search_size` records `decisions`, `candidates`, `scenarios`, `cells`,
`max_candidates` (720) and `max_cells` (2160). These last two fields are
implementation support bounds, **not** the execution budget. The same object
is bound into the batch specification and fresh result.

`batch.max_cells` declares the actual computation budget, 0..n!*s, defaulting
to the full population. The full expected and generated populations are
preserved regardless of this value. Execution visits the candidate-major prefix
of sorted-ID permutations, with scenarios in declaration order. Changing ID
names can change which prefix a partial budget visits; this does not change
the full search domain or the result of any corresponding script.

Replay limits are explicit positive integers: defaults `max_paths=10000`,
`max_rows=1000000`, `max_steps=10000`. The /2 spec also records the existing
fixed `process_timeout_seconds=60`, per replay or audit subprocess; it is not
a configurable new runtime feature or a total batch timeout. Limits and budget
are validated and bound before execution. Result `execution_budget` exposes
these same values. There is no additional horizon-length support restriction
or general model-byte-size limit; schema validity and runtime resource limits
still apply. The population cap is not a promise that every supported model
will finish within its replay limits.

Budget exhaustion leaves remaining expected cells NOT_RUN, goal UNKNOWN/null,
and event coverage UNKNOWN. A stopped subset is never a complete search.
Already certified counterexamples can still establish robust FALSE. No
resume, retry or reuse of an existing output directory is provided.

## Independent expected population

The /2 `freeze` oracle decodes every integer rank in `[0,n!)` using factorial
blocks. At width k, division by `(k-1)!` chooses one unused symbol; the remainder
chooses the suffix. This bijection contains each permutation exactly once.
It uses bounded lists of unused IDs, never an n^n Cartesian product. Cost is
O(n^2*n!) for small-list operations and O(n*n!) order output, plus the declared
candidate × scenario materialization. The production generator separately
uses `itertools.permutations`. /1 keeps its old Cartesian oracle unchanged.

The paths share identity/materialization helpers, schema and codec. They do
not share enumeration algorithms or evaluate guards/effects. Tests disable
each enumeration route while exercising the other, assert literal 2- and
24-order sets, and verify 120 unique valid five-ID permutations against the
independent factorial count. Direct full CE3 envelopes with literal slots,
attempt mode, outcomes and unchanged model/sources protect shared
materialization. Expected goal sets are derived from the synthetic rules and
stored separately; production code never imports those oracles.

Verify regenerates the complete expected manifest from the declared problem
before accepting supplied pins, enumeration or runs. Locally consistent
rehashing after removing a candidate or cell cannot change the declared
population. Membership checks still compare complete payloads as well as IDs;
counts alone, even correct counts, are insufficient.

## Versions and identity

The following changed explorer payloads use /2:

- `ce3-scenario-problem/2` and `permutations_once/2`.
- `ce3-scenario-search-space/2`, `ce3-scenario-candidate/2`,
  `ce3-scenario-cell/2`, `ce3-scenario-manifest/2`, `ce3-scenario-pins/2`.
- `ce3-scenario-execution/2`, `ce3-scenario-attempt/2`, `ce3-scenario-run/2`,
  `ce3-scenario-observation/2`, `ce3-scenario-result/2`.

Unchanged scenario-set/space/scenario, plan, execution, goal projection,
audit receipt, runtime/build and CE3 input/history types retain /1. Their
payload meanings are unchanged. Hashes still use CE3's typed Python JSON/LF
codec; physical gzip hashes remain separate from document hashes.

For /2, the search-space grammar sorts the decision IDs before hashing;
the original declaration is not modified. Candidate identities, scripts,
generator order and corresponding analysis are therefore invariant under
permuting the input decision list. Problem identity still binds the exact
declaration, including array order; consequently cell/manifest/pin identities
change when that declaration changes. Renaming IDs changes identities and
lexical enumeration order, but never rule meaning. Model dictionary order
does not affect canonical hashes. Clock changes change model and search IDs.

No /1 fixtures or frozen manifests are rewritten. Adding/changing top-level
explorer code changes `explorer_build_id` as before; archived packages require
their recorded build for verification. This extension neither migrates old
artifacts nor certifies them under a new build without that existing check.

## Separate evidence and statuses

The definitions in SCENARIO-FORMAT remain in force. Candidate and scenario
coverage are projections of certified cells; cell coverage checks the entire
crossing and enumeration. Event path coverage is per cell and requires fresh
audit of **all** paths. Goal observation requires the typed terminal equalities
and exactly n executed decision attempts with no blocked attempts on every
audited path; n comes from the declaration, never the old constant three.

Robust TRUE requires every declared scenario cell to be certified and satisfy
the goal. Robust FALSE requires at least one certified negative cell. Otherwise
it is UNKNOWN. Complete cell coverage can coexist with zero goal successes;
complete projection coverage can coexist with incomplete cell coverage.
Corrupt gzip, audit failure, missing paths, errors and limits give UNKNOWN,
not a certified negative or positive goal. Verification is read-only, does not
replay and ignores saved `result.json` as evidence.

CLI exit codes remain 0 for complete verified cell coverage, 2 for incomplete
or invalid reportable coverage, and 1 for invalid/unsupported top-level input
or trust bindings. Pins must be retained separately; hashes are integrity
bindings under trusted code/stable storage, not signatures or source truth.

## Reproduction

From the repository root, use fresh destinations:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/fixed-slots-problem.json --output /tmp/ce3-fixed-slots-frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/fixed-slots-problem.json --manifest /tmp/ce3-fixed-slots-frozen/manifest.json --pins /tmp/ce3-fixed-slots-frozen/pins.json --output /tmp/ce3-fixed-slots-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /tmp/ce3-fixed-slots-frozen/pins.json --output /tmp/ce3-fixed-slots-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/fixed-slots-problem.json --manifest /tmp/ce3-fixed-slots-frozen/manifest.json --pins /tmp/ce3-fixed-slots-frozen/pins.json --output /tmp/ce3-fixed-slots-partial --max-cells 4
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/fixed_slots_tests -p 'test_*.py' -v
```

The frozen pins are outside both run directories. Review and retain them as
the trust anchor. Full run/verify return 0; the partial run intentionally
returns 2 with all 72 cells retained. The four-decision fixture's independently
derived goal matrix and observed results are in the implementation report.
