# Declared decisions and fixed slots — scenario explorer /2

Opt in with `ce3-scenario-problem/2` and search kind `permutations_once/2`.
The top-level shape is identical to [scenario /1](SCENARIO-FORMAT.md).
That document's evidence, identity, audit, coverage and robustness rules
continue to apply, with the changes below. The old single-scenario and
scenario /1 contracts retain their original three-decision meanings.

## Domain

```json
{"kind":"permutations_once/2","decision_ids":["A","B","C","D"],
 "slots":[-2,1,4,7],"mode":"attempt","retry":false,"early_stop":false}
```

- `decision_ids` is a nonempty list of unique nonblank strings containing
  exactly all model decisions. Its length declares n; no redundant count
  can disagree with it. Input list order need not be sorted.
- `slots` contains exactly n strictly increasing integers. Boolean, float,
  string, duplicate, reversed and out-of-clock values are rejected.
- `model.clock` independently declares start and inclusive horizon. The
  existing schema validates the entire clock, including unit step and
  events-before-decisions. Negative times and a one-step clock are allowed.
  Start may precede the first slot; horizon may follow the last slot.
- Each candidate is a permutation of all n IDs. Position i maps to slot i,
  with exactly one `attempt`. No decision is omitted or retried. All empty
  clock steps and events, including those after the final decision, remain
  the responsibility of unchanged replay. Pending after horizon stays pending.
- Model, sources, observation, slots, horizon and each candidate script are
  shared across all scenarios. Only full declared outcomes maps vary.
  A single scenario is supported, including `{}` outcomes for timer-only models.

Candidate enumeration uses sorted IDs for a deterministic candidate-major
prefix; scenario order remains the declared list order. Reordering input IDs
does not select or filter plans. Renaming IDs cannot affect complete semantic
results after mapping names back, but may change which plans a partial budget
visits first. List order remains part of the declaration's content identity;
no existing hash canonicalization is changed.

## Size gate and execution budget

Before generating any manifest or candidate population, derive:

`candidate_count = n!`, `scenario_count = s`, `cell_count = n! × s`.

Implementation support limits: **1 ≤ n ≤ 6**, **n! ≤ 720**,
**n! × s ≤ 2 160**, with s ≥ 1. No independent lower scenario limit beyond 1.
For n > 6, reject before calculating a potentially huge factorial; the error
reports n! symbolically and the supported bound. For n ≤ 6 the exact counts
are computed even when the cell count exceeds the cap. The size gate runs
before per-scenario input copies, candidate hashing or enumeration, including
direct calls to `freeze`, `generate`, `run` and the verifier's reconstruction.

`preflight` validates the declaration and reports counts, support limits,
`max_cells`, replay `max_paths/max_rows/max_steps`, and the existing 60-second
timeout per replay/audit subprocess. It creates no files or candidate lists.
It does validate one ordinary script envelope per scenario using the existing
schema. CLI freeze/run performs and prints preflight before enumeration.

`max_cells` is an integer in [0, cell_count], defaulting to the full count.
Replay limits remain positive integers, default 10 000 paths, 1 000 000 work
rows and 10 000 steps per cell. There is no total wall-clock guarantee and no
model-byte-size cap. Event permutation growth and long horizons are subject
to replay limits and subprocess timeout; they do not change the search domain.

An oversized domain is INVALID (CLI 1), with no manifest/result/coverage claim.
A supported domain with insufficient budget retains every expected candidate
and cell; unstarted cells are NOT_RUN, goal/event coverage UNKNOWN. CLI 2
indicates incomplete or invalid cell coverage. A cell whose replay/audit
cannot be certified is UNVERIFIED/UNKNOWN. No automatic resume or retry exists.

## Independent expected population

Generation uses `itertools.permutations`. Freezing /2 instead starts at the
sorted word and repeatedly finds the lexicographic successor by pivot/swap/
suffix reversal. These distinct algorithms share neither enumeration code nor
a Cartesian expansion. The oracle visits n! words with O(n) auxiliary space;
the materialized manifest itself necessarily uses O(n! × s) cell storage.
The manifest's counts are checked against the independent factorial calculation.

Every distinct all-ID word is a valid permutation; n! distinct such words
exhaust this finite grammar. Tests check literal 2- and 24-member universes,
120 unique five-ID permutations, and disable permutations/product/generate
while freezing. Generation is separately tested with the oracle disabled.

`verify_frozen` reconstructs the expected complete manifest from the problem
and compares both payload and independently supplied pins. A self-consistent
manifest/enumeration/result missing a cell or entire candidate is rejected
even if its local hashes and records have been repaired. Membership against
an arbitrary supplied manifest alone remains insufficient.

Input construction and identity helpers are intentionally shared. Direct
input-oracle tests assemble literal slot keys and complete CE3 envelopes
without calling those helpers as their expected-value source. This protects
the shared mapping boundary; it is not a claim of absolute implementation
independence or a replacement for trusted verifier code.

## Version and payload changes

These problem-dependent protocols use /2: `ce3-scenario-problem`,
`ce3-scenario-search-space`, `ce3-scenario-candidate`, `ce3-scenario-cell`,
`ce3-scenario-manifest`, `ce3-scenario-pins`, `ce3-scenario-execution`,
`ce3-scenario-attempt`, `ce3-scenario-run`, `ce3-scenario-observation`, and
`ce3-scenario-result`. Search kind is `permutations_once/2`.

`manifest.search_size` stores decision/candidate/scenario/cell counts and
support limits. `batch.json` additionally binds that search_size and the
process timeout along with existing limits/max_cells. `result.preflight`
reports the same derived size and execution limits. All are included in the
existing content hash chain and rederived at verification.

The scenario-set/space/scenario payloads remain /1 because their full-outcomes
meaning is unchanged. Plan/execution identities, terminal-goal definition,
goal projection, audit receipt, CE3 schemas/profile and audit stay unchanged.
The goal observer already derives required accepted attempts from n and still
checks every audited event path. No observer logic change is necessary.

Coverage remains separate: candidate and scenario projections, exact cells,
and each cell's audited event paths. Goal status is distinct from coverage.
Robustness is TRUE only for all certified true scenario cells, FALSE on any
certified false cell, otherwise UNKNOWN. A fully certified candidate can be
TRUE during an incomplete batch; complete projections cannot repair missing
cells. CLI 0 means complete cell verification, not existence of a robust plan.

Old fixture/pin payloads are unchanged. As before, stored packages require
their recorded explorer build; use the original checkout to verify historical
packages. There is no migration or rewriting of old artifacts.

## Commands

From repository root, with fresh output paths:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py preflight --problem isolated-tests/structural-ce3-explorer/fixtures/slots-problem.json
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/slots-problem.json --manifest isolated-tests/structural-ce3-explorer/fixtures/slots-manifest.json --pins isolated-tests/structural-ce3-explorer/fixtures/slots-pins.json --output /tmp/ce3-slots-new
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins isolated-tests/structural-ce3-explorer/fixtures/slots-pins.json --output /tmp/ce3-slots-new
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/slots_tests -p 'test_*.py' -v
```

Use `--max-cells 2` and a new output path for a partial run (exit 2).
For a different problem, `freeze --problem <file> --output <new directory>`
creates manifest.json/pins.json; review and retain pins separately before
run/verify. Defaults still select the legacy scenario /1 fixture.

This supports bounded order search at given times. It does not search times,
optional decisions, repeated attempts, adaptive policies, pruning, preferences
or optimality. Existing trust assumptions (separate pins, trusted code, stable
local files) and lack of probability/customer-value claims still apply.
