# CE3 selected fixed plans /4

This is the implemented opt-in contract from the
[architecture proposal](OPTIONAL-DECISIONS-ARCHITECTURE-PROPOSAL.md), §§3–9.
`fixed-replay/0.1`, its schema, CLI, audit and temporal operators are unchanged.
Purpose remains exactly `synthetic_integration_test`. No pilot admission exists.
The [capability baseline v1](../../docs/ce3/capabilities/engine-baseline-v1.json)
is the preserved **previous scope**, through scenario /3; it does not describe
this extension. Its historical JSON and reading instructions are unchanged.

## Declaration

`ce3-scenario-problem/4` has exactly the same outer fields as /3: schema_version,
revision, purpose, profile, model, sources, search, observation, scenario_set.
The complete example is [optional-decisions-problem.json](fixtures/optional-decisions-problem.json).
All fields below are required; unknown fields and implicit coercion are rejected.

```json
{
  "kind": "selected_permutations_once/1",
  "required_decision_ids": ["P"],
  "optional_decision_ids": ["U", "N", "X"],
  "choice_groups": [
    {"id": "delivery_route", "kind": "exactly_one", "members": ["U", "N"]}
  ],
  "slots": [0, 2, 4],
  "slot_policy": "prefix/1",
  "allow_empty": false,
  "mode": "attempt",
  "retry": false,
  "early_stop": false
}
```

Required R and optional O are unique nonblank string-ID lists, disjoint, with
union exactly all model decisions U. Either list may be empty; 1≤|U|≤6.
Groups have exactly id/kind/members, unique nonblank group IDs, kind exactly
`exactly_one` or `at_most_one`, at least two distinct members from O, and no
overlap with another group. No nesting, required group members, conditions,
partial order, operational guards or exclusions exist in this grammar.

A selected set A must contain R, be a subset of U, contain exactly one member
of each exactly_one group and at most one of each at_most_one group. Every
selected decision occurs once. Empty A additionally requires allow_empty=true;
it never overrides required/group constraints. All three flags are strict bools.

Let f be the number of optional IDs outside groups, r=|R| and g the number of
groups. Exactly Kmax=r+f+g slots are required, strictly increasing integers
(excluding bool/float/string), all within the separately declared inclusive
clock interval. Negative times, gaps, start=horizon and a later horizon are
allowed as in replay. All slots are checked even for short/empty candidates.

An order w of k selected IDs uses precisely slots[0:k]. Script steps contain
one `{decision,mode:"attempt"}` entry per used time, no other keys or empty
lists. Empty order has steps={}. The stable script source is exactly:
`CE3 selected fixed plan: one attempt per selected decision, prefix slots.`
Omitting X from PXU@0/2/4 gives PU@0/2, not P@0,U@4. There is no hidden WAIT,
time choice or early termination. Replay always continues through horizon.
The omitted rule remains in the model; it makes no attempt, debit or schedule.
Initial events still execute. Full outcomes binding, including unused events,
and validation of all rules are mandatory. All scenarios use the same fixed
script/model/initial/sources/clock/goal. Only full external outcomes vary.

## Exact population and support gate

With exactly-one group sizes a_i and at-most-one sizes b_j:

```text
P(z) = z^r (1+z)^f ∏(a_i z) ∏(1+b_j z)
c_k = [z^k] P(z), with c_0 set to 0 when allow_empty=false
C = Σ c_k k!                    M = C × S, S≥1
```

`selection.search_size` validates syntax/partition/groups/times and computes
these small integer coefficients before any candidate, input envelope,
manifest or output directory. Both **C≤720 and M≤2160** are inclusive support
bounds, additional to |U|≤6. Empty population is invalid. Five wholly optional
IDs with empty allowed yield 326; six yield 1957 and are rejected even with
budget zero. Six required IDs yield 720 and support at most three scenarios.

`search_size` in manifest, batch and result has exactly decisions, max_selected,
subsets_by_length (coefficients indexed 0..Kmax), candidates, scenarios, cells,
max_candidates=720, max_cells=2160. Execution `batch.max_cells` is separately
0..M, default M; it never reduces the expected domain. Replay resource limits
and the 60-second subprocess timeout retain the /2 and /3 rules and defaults.
Support does not promise every model finishes within those execution limits.

Production uses an independent choice product then itertools.permutations;
freeze/verify use bitmasks over sorted U with direct cardinality checks then
factorial rank decoding. Both compare their unique count to the polynomial,
but neither enumeration route calls the other or interprets model rules.
Small identity/materialization helpers and codec are shared and covered by
direct input-oracle tests. Production never reads fixture expected answers.

Start order is (candidate length, lexicographic order of IDs in the word,
scenario declaration position). All words of a length are globally sorted.
Manifest candidates use length/word order; manifest cells are sorted by cell-ID
as before. Verify reconstructs execution order independently of enumeration.json.
Every retained runs entry, including empty/failure-only directories, consumes
an attempt in the allowed first max_cells entries. Over-count or wrong prefix
makes batch coverage INVALID while independently certified cell goals remain
reportable. Missing evidence stays UNKNOWN; chronological or erased execution
is not attested. No retry, resume, pruning or automatic goal-based stopping.

## Goals and exact accepted attempts

Only `ce3-history-goal/2` is accepted in /4. It has exactly the /1 definition
fields plus `acceptance_scope:"candidate_script"`; all_attempts_accepted is true.
The nonempty all conjunction, terminal/always/reach_by, typed equals predicates,
snapshot-step sampling, inclusive bounds and all_event_paths quantifier retain
[TEMPORAL-GOALS-FORMAT](TEMPORAL-GOALS-FORMAT.md) semantics. The temporal module
is unchanged; /2 validation delegates its temporal part to the existing /1
validator without changing the problem or model decision set.

The new observer re-derives candidate identity, required inclusion, groups,
selected/omitted IDs, exact times and script shape from the **trusted script**.
It compares the complete script to its canonical prefix materialization.
After full fresh audit, each path's decision_executed/attempt_blocked/script_skip
rows must correspond one-to-one, in order, to the expected entries, including
step, decision and script_position. Acceptance is true only if all these rows
are decision_executed. The complete run is checked, including after deadlines.

Omission is not a blocked attempt. A selected optional blocked attempt fails
the goal, even if state components succeed. Empty candidate has vacuous attempt
acceptance only after full audit; its components still need actual evidence.
Initial success suffices for reach_by, but later loss can fail terminal/always.
Invalid selection is a contract/binding error, never an operational blocked
row or a certified negative goal. An unverified cell has UNKNOWN/null and no
component proofs; a valid audited block is CERTIFIED/NOT_SATISFIED.

## Versions, payloads and identity

| Payload | Version |
|---|---|
| scenario problem/cell/manifest/pins/execution/attempt/run/observation/result | /4 |
| search kind | selected_permutations_once/1 |
| scenario search-space/candidate | /3 |
| selection definition | ce3-selection-definition/1 |
| history goal / projection | ce3-history-goal/2 / ce3-goal-observation/3 |
| scenario-set/space/scenario, plan, execution, audit receipt, runtime/build, replay contracts | unchanged |

Use unchanged Python JSON/LF digest, with separate physical artifact hashes.
Canonical search sorts R/O, group members, groups by ID; slots and word order
are preserved. The whole original problem is still hashed exactly as declared.
Set-list reordering preserves search/candidate/plan identity, not problem/pins.
Scenario order remains identity- and budget-significant. No ID normalization.

The selection definition has exactly schema_version, required_decision_ids,
optional_decision_ids, choice_groups, allow_empty in canonical form. Its digest
is selection_definition_id. Manifest adds both definition and ID.
Search-space /3 binds model_id, source_set_id, canonical grammar and script_source.
Plan identity remains H({kind:"ce3-plan/1",script}). Candidate identity remains
H({schema_version:"ce3-scenario-candidate/3",search_space_id,plan_id}). Candidate
payload has candidate_id, plan_id, order, script, selected_ids, omitted_ids and
selection_definition_id. Materialization rechecks the entire candidate payload.

Projection /3 retains all /2 fields and adds `selection_evidence` with exactly:
selection_definition_id, candidate_id, plan_id, selected_ids, omitted_ids,
required_ids, groups, selection_satisfied=true, expected_entries. Groups are
canonical `{id,kind,selected_ids}` records. Entries are ordered
`{step,script_position:0,decision,mode:"attempt"}`. Existing per-path attempt
row evidence binds them to the audited history. Missing/false/extra/reordered
stored evidence is rejected by whole-observation recomputation, not trusted.
No selection certificate bypasses the independent expected population.

Cell, scenario, execution, history, receipt and result binding formulas retain
SCENARIO-FORMAT principles with the versions above. Logical cells precede the
batch spec; no circular hash. A changed goal need not change a script but does
change problem/cell/observation. A changed selection changes search/candidate
identity even when one plan's bytes stay unchanged. Fresh occurrence UUIDs
change result identity. Runtime/build pin policy for archived packages remains.

Older explorer /1 and scenario /1–/3 accept exactly their previous grammars,
goals and meanings. No old fixture, hash or historical baseline is rewritten.
All-required new problems are operationally equivalent to fixed permutations,
with new documentation/source and wrapper identities. Three-valued robustness,
four coverage axes, UNKNOWN isolation, external pins, read-only verify and
CLI exits 0/2/1 retain their previous meanings. Verify never replays, writes
artifacts or trusts result.json. Hashes are not signatures or source truth.

## Reproduction

From the repository root, use new destinations. Retain reviewed pins outside
the run directory. Full example expects 16 candidates, 48 certified cells,
8 positive cells, robust TRUE only PN and PNX. CLI 0 means complete coverage,
not that every goal is true.

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --output /tmp/ce3-optional-frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --manifest /tmp/ce3-optional-frozen/manifest.json --pins /tmp/ce3-optional-frozen/pins.json --output /tmp/ce3-optional-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /tmp/ce3-optional-frozen/pins.json --output /tmp/ce3-optional-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --manifest /tmp/ce3-optional-frozen/manifest.json --pins /tmp/ce3-optional-frozen/pins.json --output /tmp/ce3-optional-partial --max-cells 4
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/selection_tests -p 'test_*.py' -v
```

Partial run expects CLI 2, the entire 48-cell population, four certified
attempts and remaining NOT_RUN/UNKNOWN. No pilot/UI/onboarding integration.
