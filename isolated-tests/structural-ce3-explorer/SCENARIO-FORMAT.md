# CE3 scenario crossing /1

This is an outcome-only technical integration contract on top of the existing
three-decision explorer. It is separate from `ce3-explorer-problem/1` and its
single-scenario `COMPLETE`. Neither replay nor audit changes.

## Input and scope

`ce3-scenario-problem/1` has exactly `schema_version`, `revision`, `purpose`,
`profile`, `model`, `sources`, `search`, `observation`, `scenario_set`.
The existing grammar remains exactly three distinct, sorted decision IDs,
one `attempt` per decision in slots `[0,1,2]`, all six permutations, no retry,
no early stop, and clock 0..2 inclusive. All model decisions must be included.
The model and sources are shared without overrides across the entire batch.

`ce3-terminal-goal/1` is unchanged: a nonempty conjunction of typed terminal
state equalities, sampled at `last_row.after`, AND every decision attempt
accepted, universally quantified over every independently audited event path.
The common declaration validator is reused by both version-specific entry
points; it alone does not authorize an input version or environment scope.
The old entry point still permits only timer events and empty outcomes.

The scenario set has exactly:

```json
{
  "schema_version": "ce3-scenario-set/1",
  "variation": "outcomes_only",
  "selection": "explicit_complete_list",
  "members": [
    {"label": "ja", "outcomes": {"response": "approved"}},
    {"label": "nej", "outcomes": {"response": "rejected"}},
    {"label": "uteblivet", "outcomes": {"response": "absent"}}
  ]
}
```

The list must be nonempty, with unique nonblank labels; list order is part of
its identity. Labels are opaque provenance, never predicates. Each outcomes
map binds **exactly every external event**, including unused events, to a
schema-valid declared outcome. No implicit baseline, patches, exclusions,
probabilities, or model/script variants exist. Timer events may coexist with
external events. Additional small fixtures can declare a different nonempty
scenario list; the expected population is derived, never fixed at 18 in code.
Different labels with identical outcomes remain different declared scenarios.

An `absent` binding uses the model's existing external absent role. It applies
that declared branch at the scheduled event phase; it is not a missing map
entry, an event with false guards, or an invented rejection. In the acceptance
fixture it keeps response=`waiting` through horizon 2 without approving,
rejecting or clearing existing readiness. No later response is scheduled.
This does not model an indefinite wait or a future response beyond the horizon.
The core schema checks the explicit waiting-field assignment; domain meaning
and the absence of other undesirable effects remain model-authoring duties.

## Frozen population and materialization

`freeze` derives all length-three words over the declared decision set and
keeps those with three distinct IDs. It crosses those six words with every
scenario definition, scenario first. `generate` independently uses
`itertools.permutations` then a scenario loop. The manifest's cells are sorted
by content ID. Both routes share small identity/materialization helpers, not
operational semantics; tests separately construct ordinary input payloads
without those helpers and use a literal rule-derived goal oracle.

`ce3-scenario-manifest/1` contains problem, search-space, scenario-space,
model, sources and observation-definition IDs, all candidates (including
full scripts), all scenarios (including full outcomes), and all cells.
Every ordinary `ce3-run/1` is schema-validated during freezing, before replay.
Materialization only copies model/sources/outcomes and inserts the fixed script.
The wrapper never evaluates guards, effects, scheduling or state transitions.

Verification reconstructs this entire manifest from the declared problem
before trusting enumeration or results. External `ce3-scenario-pins/1` must
equal the reconstructed problem/manifest IDs. Matching a supplied manifest
alone is insufficient: consistently removing a cell and recomputing all local
hashes still fails against the declared space. New declarations require new
explicitly reviewed pins. Copied pins inside an output directory are not the
external trust anchor.

## Identity protocol

All document IDs use unchanged `core.history.digest`:
UTF-8, sorted object keys, compact JSON, Unicode preserved, terminal LF.
Array order and primitive types are significant. Physical file SHA-256 is a
separate byte identity (especially for gzip). New IDs are hashes of the exact
versioned payloads in `scenario_contracts.py` and `scenario_runner.py`.

| Identity | Content bound |
|---|---|
| problem_id | Entire problem, including revision, goal, complete scenario set, model, sources and grammar |
| model_id / source_set_id | Full unchanged model / sources |
| observation_definition_id | Existing complete terminal goal contract |
| search_space_id (`ce3-scenario-search-space/1`) | Model, sources, grammar, fixed script source; excludes scenarios and goal |
| plan_id (`ce3-plan/1`) | Entire script; excludes scenario/outcomes |
| candidate_id (`ce3-scenario-candidate/1`) | Search-space ID and plan ID |
| scenario_space_id (`ce3-scenario-space/1`) | Complete scenario set, model and sources |
| scenario_id (`ce3-scenario/1`) | Scenario-space ID plus complete definition, including label and full outcomes |
| outcomes_id | Entire outcomes map, including unused bindings |
| input_identity | Full ordinary `ce3-run/1`; the trusted audit input hash |
| cell_id (`ce3-scenario-cell/1`) | Problem, candidate, plan, scenario-space, scenario, outcomes and input IDs |
| manifest_id | Full frozen population, candidates, scenarios and observation definition |
| batch_spec_id (`ce3-scenario-execution/1`) | Problem, manifest, runtime/build, limits and cell execution budget |
| batch_attempt_id / run_id | Separate UUIDs for batch and single-cell occurrence |
| execution_id (`ce3-execution/1`) | Input, runtime and limits; independent of occurrence |
| history_id / artifact hashes | Canonical decompressed history / input, history and audit file bytes |
| audit_receipt_id (`ce3-audit-receipt/1`) | Existing fresh audit receipt binding input/history/runtime and full audit result |
| observation_id (`ce3-scenario-observation/1`) | Problem, cell, scenario, batch spec and existing goal projection with path/row evidence |
| result_id (`ce3-scenario-result/1`) | Entire result excluding its own ID, including actual occurrence UUIDs |

Cell IDs are deliberately **logical population identities**, defined before
runtime/limits. The manifest includes cells; the batch spec hashes the
manifest; the run record binds the cell and batch spec. This acyclic ordering
replaces the audit's illustrative runtime-dependent cell ID with an equally
explicit two-level binding. No ID contains itself. Changing limits changes
batch spec/execution/observation, not the logical cell. Changing goal changes
problem/cell/manifest/observation even if replay input stays identical.
Changing a scenario label changes scenario-space and cell identities, not
execution logic or candidate scripts. Repeated identical runs have stable
content identities and new occurrence UUIDs.

`ce3-scenario-run/1` embeds the complete cell and binds batch spec, batch
attempt, run UUID, execution, artifacts, receipt and observation. `started.json`
and completed `record.json` must agree. A duplicate run UUID makes **both**
claimants UNKNOWN. No result is selected by timestamp or “latest attempt”.

## Execution, read-only verification, and statuses

The wrapper calls the existing explorer `cli_process`, which invokes ordinary
replay and separate audit CLI processes, and reuses `artifact_record`,
`audit_receipt`, `observe` and the gzip-safe bridge. The observation wrapper
adds crossing identities around the existing goal projection. Projection
`problem_id` identifies the effective single-outcome declaration; the outer
observation explicitly binds the whole scenario problem. It is not a legacy
single-scenario certification.

Runtime and explorer source manifests are checked against the current files.
The build includes every top-level explorer Python file. Existing output
packages require their recorded build; there is no automatic migration,
omnibus trust in an older COMPLETE, or rewriting of old artifacts.

`verify` never replays and never reads `result.json`. It reconstructs expected
inputs, matches started/record, checks UUID uniqueness and limits, freshly
re-audits the history against expected input, recomputes goal observations,
and checks all receipts and physical artifact hashes. It derives a fresh
result without overwriting any file.

| Cell result | Meaning |
|---|---|
| CERTIFIED + SATISFIED / true | Complete audit and all evidence bindings; goal holds on every event path |
| CERTIFIED + NOT_SATISFIED / false | Same certification; at least one audited path violates the goal |
| NOT_RUN + UNKNOWN / null | Expected cell has no run directory |
| UNVERIFIED + UNKNOWN / null | Artifacts absent, corrupt, inconsistent, incomplete, audit-failed or errored |

An ordinary blocked decision can be CERTIFIED/NOT_SATISFIED. Audit failure,
limits, model errors, process timeout, interrupted writes and gzip corruption
cannot become a negative goal claim. They retain UNKNOWN for the affected
cell while unaffected cells remain reportable. Invalid top-level declarations,
pins or runtime/build identities reject the whole package. `failure.json`
and process logs are diagnostics, not goal evidence.

Output directories must be new. One attempt per cell is allowed. No retry,
resume, policy, pruning, optimization, AI compilation or UI is implemented.
`max_cells` is a computation budget on the generator's candidate-major prefix;
it does not shrink the expected manifest. Zero budget still returns all cells.
CLI exit codes: 0 = complete cell coverage, 2 = incomplete/invalid population
with reportable cells, 1 = invalid top-level package/specification.

## Four coverage axes and robustness

These are distinct, with separate denominators:

1. `candidate_coverage`: projection of CERTIFIED cells onto declared candidate
   IDs. COMPLETE means each candidate has at least one certified scenario
   cell, **not** that every scenario was verified for each candidate.
2. `scenario_coverage`: projection of CERTIFIED cells onto the declared
   scenario IDs. COMPLETE means each scenario has at least one certified
   candidate cell, **not** that every candidate was verified in each scenario.
3. `cell_coverage`: the full candidate × scenario population. COMPLETE
   requires exact generated membership/content, every expected cell CERTIFIED,
   and no unexpected run directory. Missing enumeration/certification gives
   INCOMPLETE; duplicate, unexpected or mismatched membership gives INVALID.
4. Each cell's `event_path_coverage`: COMPLETE only with certified fresh audit
   of all event permutations; `audited_paths` is that cell's path count.
   Unverified cells give UNKNOWN and null count, never a trusted partial count.

`enumeration_coverage` separately lists missing, duplicate, unexpected and
misbound generated cells. Candidate/scenario projection coverage can both be
COMPLETE while cell coverage is INCOMPLETE or INVALID. All counts are
enumeration facts, not probabilities. No path index is paired across runs.

For each candidate, `robust` is the strong three-valued conjunction over its
**entire frozen scenario population**:

- FALSE if any CERTIFIED cell has goal=false, even if other cells are unknown.
- TRUE only if every scenario cell is CERTIFIED and goal=true.
- UNKNOWN otherwise (no verified refutation, at least one unknown).

The aggregate also reports expected scenarios, certified cells, and every
cell ID. Following a cell's record and observation gives the exact audited
history, path event orders, terminal row and full attempt evidence interval.
Coverage is not suppressed when a counterexample already makes robustness
FALSE. TRUE is a claim only over this declared scenario set and goal.

## Trust boundary

Assumes separately trusted pins, trusted verifier/runtime code and stable
local files throughout reading/verification. These hashes are integrity
bindings, not signed execution attestations or protection against replacement
of both package and trust anchor. No source-truth, customer-value, general
problem-solving, reachability, preference or probability claim follows.
