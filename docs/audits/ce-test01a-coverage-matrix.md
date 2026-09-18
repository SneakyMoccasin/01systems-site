# CE Test 01A Coverage Matrix

Status: documentation/planning checkpoint

Repository: `pulse_engine_clean`

Baseline commit: `cb00322677979ca3c16c84f47783ce0d6631ef49`

Verdict: **B. COMPLETE WITH CHECKPOINT SPLIT RECOMMENDED**

## 1. Purpose and authority

This document freezes the coverage plan from the Pilot-Readiness System Audit
Test 01A blockers to the remaining implementation checkpoints. It exists to
ensure that a system-level prerequisite cannot fall between locally passing
technical checkpoints.

The authoritative architecture remains
[`ce-minimum-sufficient-architecture-two-layer-mtc-freeze.md`](./ce-minimum-sufficient-architecture-two-layer-mtc-freeze.md).
This plan neither changes nor expands that architecture. It also incorporates:

- the broad read-only CE Pilot-Readiness System Audit;
- the independently verified CP1 and CP2 implementation at `cb003226`; and
- the independent A15 verification: 28/28 CP1+CP2 tests and 832/832 complete
  repository regression tests passed, with V1 isolation intact.

This checkpoint does not authorize CP3, Clean MU authoring, Test 01A case
construction, or Test 01A execution.

## 2. Checkpoint structure

CP3 and CP4 each contain two independently dangerous mechanisms and therefore
receive mandatory internal splits:

- **CP3A — structural inputs and deterministic validation**
- **CP3B — authoritative Layer 1 lifecycle, admission and execution**
- **CP4A — immutable one-way observation-source boundary**
- **CP4B — Layer 2 evaluation and persistence**
- **CP5 — committed history, Decision Space, result and A/B comparison**
- **CP6 — domain-neutral vertical fixture and conformance**
- **CP7 — minimum executable Clean MU profile**
- **CP8 — Test 01A preregistration freeze and execution**

The splits reduce risk without creating new architecture phases. CP3A prevents
execution work from beginning on an ambiguous scenario/lifecycle contract.
CP4A proves hard layer non-interference before causal traversal and persistence
are introduced. Each subcheckpoint follows the same stop rule as a full
checkpoint.

## 3. Master blocker matrix

| Blocker | Description | Owner checkpoint | Implementation deliverable | Success gate | Test evidence | Stop condition | Architecture significance | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Scenario and initial-state contract absent | CP3A | Canonical scenario with scenario and initiative-instance identities, type references, schedule, duration/completion inputs, dependencies/claims by reference, initial lifecycle/resource/constraint/entitlement state, optional scenario-owned source mappings, horizon, identity and strict validation; instance data cannot redefine domain semantics | Equivalent semantic inputs have identical identity; invalid, ambiguous, duplicate, out-of-horizon and instance-semantic override inputs fail closed before execution | Unit, mutation, canonical identity, negative/fail-closed, deterministic validation | Any required Test 01A input cannot be expressed without instance-owned domain semantics or ambiguous timing | IMPLEMENTATION ONLY unless a required mechanism lies outside both layers | OPEN |
| A2 | Authoritative Layer 1 executor and atomic admission absent | CP3B | Pure period executor separating eligibility from admission; deterministic simultaneous admission, atomic commit/failure, dependency/resource/constraint/entitlement enforcement and unresolved conflict | Ineligible never admits; no `executed-despite-structural-block`; simultaneous input order is neutral; failed/unresolved period causes no partial mutation | Unit, mutation, permutation, deterministic replay, negative/fail-closed, atomicity | Eligibility/admission contradiction, incidental-order result, or inability to represent atomic failure | ARCHITECTURE-SENSITIVE | OPEN |
| A3 | Lifecycle, duration and resource-release semantics absent | CP3A contract; CP3B execution | Frozen pending-active-completed lifecycle with sufficient duration/completion declaration and exact admission, completion, reservation, release and entitlement-consumption boundaries | Every A3 lifecycle gate in section 5 passes, including active-at-horizon and same-period permutation cases | Transition-table unit tests, boundary tests, deterministic replay, mutation, resource/entitlement conformance | Required timing cannot be deterministic inside canonical model periods | ARCHITECTURE-SENSITIVE | OPEN |
| A4 | Committed history and Decision Space absent | CP5 | Immutable period-indexed Layer 1 history and next-action eligibility projection with canonical reasons and explicit terminal/unresolved status | Snapshots reproduce from committed history; hidden resource/entitlement/history differences can change Decision Space; structurally different states may project equal eligibility; output disclaims cohort feasibility/reachability | Unit, projection, deterministic replay, mutation, negative claim tests, A/B differential | Decision Space requires Layer 2, hidden valuation, or reconstruction from missing state | ARCHITECTURE-SENSITIVE | OPEN |
| A5 | Constraint and entitlement state transitions absent | CP3B | Initial and committed blocking-constraint state; reusable and consumable entitlement behavior; deterministic transition/consumption at declared boundary | Blocking constraint prevents admission; reusable entitlement remains; consumable entitlement admits once and cannot be consumed twice; failure is atomic | Unit, state-transition, mutation, simultaneous-conflict, negative/fail-closed | State change depends on Layer 2, incidental order, or partial commit | ARCHITECTURE-SENSITIVE | OPEN |
| A6 | Layer 2 evaluator absent | CP4B | Deterministic bounded DAG evaluator over immutable source events producing only affected/exposed/unchanged/unknown, with edge/path/terminal provenance | Repeated equivalent events yield byte-identical observations; branching/merging is bounded; absent/unknown inputs follow declared outcomes; no execution mutation occurs | Unit, traversal conformance, deterministic replay, mutation, limits, non-interference | Useful required path needs magnitude, arbitrary threshold, or Layer 1 authority | ARCHITECTURE-SENSITIVE | OPEN |
| A7 | Layer 2 source binding undefined | CP4A | Canonical immutable observation-source event and one-way adapter from admitted initiative/required structural events into Layer 2 | Every source-binding gate in section 6 passes; source event identity and provenance are deterministic; missing mapping has a declared fail-closed/no-activation result | Unit, source-event identity, deterministic replay, mutation, negative mapping, import/non-interference | Binding requires mutable Layer 1 reads or Layer 2 write-back | ARCHITECTURE-SENSITIVE | OPEN |
| A8 | `declared-persistent` operational semantics undefined | CP4B | Period-indexed persistence rule with explicit start, visibility, continuation, termination, repeated-source and multi-path behavior | Every persistence gate in section 7 passes and A/B persistence comparison requires no magnitude/threshold | Transition-table unit tests, boundary/mutation, deterministic replay, multi-path, A/B differential | Determinism requires arbitrary magnitude/threshold or execution authority | ARCHITECTURE-SENSITIVE | OPEN |
| A9 | Result, unresolved outcome and A/B comparison absent | CP5 | Immutable result and comparison contracts for structural and Layer 2 trajectories, first divergence, persistence/convergence, terminal equivalence and unresolved/incomparable outcomes | Required comparison facets are mechanically present; incompatible/unresolved is data; no winner or hidden score exists | Contract/unit, deterministic replay, mutation, A/B differential, negative incompatibility | Required facet cannot be represented categorically or atomically | ARCHITECTURE-SENSITIVE | OPEN |
| A10 | End-to-end material-finding provenance absent | CP5 framework; CP6 vertical proof | Typed provenance references spanning actual structural/causal reason chain and deterministic non-valuative finding projection/compression | Every material finding exposes its complete applicable chain from input/declaration to comparison without external reconstruction; raw provenance remains available | Provenance integrity, mutation, broken-reference negative tests, vertical fixture | Material output remains untraceable or compression needs hidden ranking | ARCHITECTURE-SENSITIVE | OPEN |
| A11 | Domain-neutral executable fixture and conformance run absent | CP6 | Synthetic 5–7 initiative vertical fixture plus negative/mutation partners exercising both layers, comparison and finding projection | Fixture meets every section 10 requirement, replays identically, produces declared divergence/convergence outcome and retains complete provenance | Vertical fixture, conformance, deterministic replay, mutation, A/B differential, V1 non-interference | Fixture can pass only by bypassing a layer, fabricating precision, or omitting a required mechanism | ARCHITECTURE-SENSITIVE if the frozen model cannot express the fixture | OPEN |
| A12 | Clean MU executable profile and frozen Test 01A input absent | CP7 for profile; CP8 for frozen case/run | CP7: minimum evidence-linked Clean MU using only frozen capabilities. CP8: preregistered immutable case bundle and execution | CP7 passes contract/conformance without invented precision; CP8 freezes all listed inputs/criteria before first output and classifies run PASS/FAIL/INCONCLUSIVE | Profile validation, evidence/provenance, deterministic replay, case-bundle identity, preregistration integrity, final Test 01A execution | Required semantics/evidence absent; output inspected before freeze; profile adds case-serving capability | ARCHITECTURE-SENSITIVE only if a materially required mechanism falls outside both layers | OPEN |
| A13 | Automated A/B comparability/fairness validation absent | CP5 | Comparison policy and compatibility report distinguishing pure sequence changes from additional interventions | All fairness invariants in section 8 are checked; order/timing may differ; other changes are explicit interventions or incomparable | Unit, pairwise mutation matrix, identity, negative/fail-closed, A/B differential | Material mismatch is silently described as sequence-only | IMPLEMENTATION ONLY | OPEN |
| A14 | Checkpoint plan did not cover every blocker/PASS criterion | This document | Complete blocker ownership, gates, tests, architecture sensitivity and PASS crosswalk | A1–A13 and all eight PASS criteria are mapped to CP3–CP8; no Test prerequisite is deferred externally | Documentation cross-reference and integrity review | Any prerequisite remains unowned or only post-Test | IMPLEMENTATION ONLY | **CLOSED BY COVERAGE PLAN** |
| A15 | CP1/CP2 tests lacked independent execution | Independent verification completed before this document | Exact-commit independent CP1/CP2, regression, type, lint, isolation and integrity verification | 28/28 CP1+CP2 and 832/832 full regression passed; no tracked changes remained | Independent verification | Material verification failure | IMPLEMENTATION ONLY | **CLOSED** |

No COVERAGE OMISSION was found. A1–A14 collectively contain every Test 01A
prerequisite identified by the broad audit.

## 4. Exact checkpoint scopes

### CP3 scope — exact

**CP3A** owns only the scenario/initial-state/lifecycle input contracts,
canonical identities and deterministic validation needed by frozen Layer 1.
It must prohibit initiative instances from redefining type semantics.

**CP3B** owns only authoritative period execution: eligibility reports,
admission, lifecycle, prerequisite enforcement, resource reservation/capacity,
blocking constraints, reusable/consumable entitlements, atomic period commit,
unresolved conflicts and structural event provenance.

CP3 does not build Layer 2, Decision Space, comparison, Clean MU or UI.

### CP4 scope — exact

**CP4A** owns canonical immutable observation-source events and their one-way
binding from committed Layer 1 events. It proves Layer 2 cannot read mutable
execution state or write to Layer 1.

**CP4B** owns bounded categorical DAG evaluation, declared persistence,
source-to-edge-to-terminal provenance, limits and deterministic observation
history. It provides no execution authority, magnitude, threshold or valuation.

### CP5 scope — exact

CP5 owns committed structural history, next-action Decision Space, immutable
execution results, comparison policy and compatibility, A/B comparison,
unresolved/incomparable outcomes, first divergence, structural and causal-path
differences, persistence/convergence, terminal equivalence, end-to-end
provenance references and deterministic material-finding compression.

### CP6 scope — exact

CP6 owns the domain-neutral executable vertical fixture, its conformance run,
negative/mutation partners, deterministic replay and complete V1
non-interference regression. It adds no production capability beyond CP3–CP5.

### CP7 scope — exact

CP7 owns only the minimum executable Clean MU domain model/profile supported by
existing semantic and evidence work. It must use frozen MTC capabilities and
must not invent magnitudes, thresholds or features to create a desired result.

### CP8 scope — exact

CP8 first freezes the actual Test 01A bundle: case input, evidence,
assumptions, initial state, initiative universe, A/B schedules, horizon,
comparison policy, PASS/FAIL/INCONCLUSIVE criteria, applicable predeclared
sensitivity variations, versions and hashes. Only then may it execute,
reproduce and classify Test 01A. It does not tune the case after output.

## 5. A3 lifecycle gate

CP3 cannot pass until tests prove all of the following:

1. Every initiative instance begins `pending` unless a valid initial-state
   declaration says it is already active or completed.
2. An eligible, admitted initiative becomes `active` at one specified canonical
   period boundary.
3. An active initiative completes at one specified deterministic boundary.
4. Duration/completion input is sufficient for Test 01A and is identity-bearing.
5. A finish-to-start prerequisite becomes satisfied only at the declared
   completion boundary; same-period completion/start behavior is explicit.
6. Resource reservation begins at the declared admission/activation boundary.
7. Resource release occurs at the declared completion boundary and neither one
   period early nor late.
8. Consumable entitlement consumption occurs exactly once at the declared
   admission boundary; reusable entitlement remains available.
9. Horizon ending while an initiative is active yields a deterministic,
   representable terminal result and never fabricates completion or release.
10. Same-period eligibility, admission, consumption, reservation and completion
    are invariant under input and object iteration order.

Pause, cancellation, restart and failure recovery are outside this gate.

## 6. A7 source-binding gate

CP4A cannot pass until it demonstrates this one-way boundary:

`committed Layer 1 event -> immutable canonical source event -> Layer 2 input`

Required proof:

- admitted initiative execution emits the declared canonical source event;
- required committed structural events can emit declared source events;
- the source event contains sufficient identity, period and provenance without
  exposing mutable Layer 1 state;
- Layer 2 consumes only the immutable event plus its own declarations/history;
- Layer 2 has no imports, callback or result path capable of changing Layer 1
  eligibility, admission, resources, constraints or entitlements;
- identity is stable under equivalent declaration order and sensitive to
  semantic source changes;
- missing/unknown source mapping has one declared deterministic outcome and
  cannot activate a fabricated path; and
- repeated equivalent execution produces identical activation and provenance.

Any need for Layer 2 write-back or mutable Layer 1 reads stops CP4 and triggers
architecture review.

## 7. A8 persistence gate

For every `declared-persistent` observation used by the MTC, CP4B must define
and test:

- source/start condition;
- first visible period;
- continuation rule;
- termination condition;
- final visible period;
- post-termination state;
- repeated-source behavior;
- multiple-path behavior for one observation;
- deterministic A/B persistence and convergence comparison; and
- categorical operation without magnitude, activation threshold or authority.

If the minimum Clean MU later does not use persistence, the engine still must
honor the frozen contract capability before CP4 passes; the test cannot silently
redefine `declared-persistent` as forever or until horizon.

## 8. A/B fairness gate

For a pure sequence comparison CP5 must require identical:

- protocol and limits versions;
- domain contract semantic identity;
- initial-state identity;
- initiative-instance universe and instance semantics;
- evidence and assumption identity;
- resource definitions;
- horizon; and
- comparison policy.

Only order and timing may differ. A changed initiative set, initial state,
resource assignment, evidence/assumption or horizon must be listed as an
additional intervention or make the requested pure-sequence comparison
incomparable. It must never be silently described as sequence-only.

The result must support first divergence; structural, eligibility, resource,
constraint and entitlement differences; Layer 2 path difference; persistence;
convergence; terminal equivalence; and unresolved/incomparable status. It must
not select a winner.

## 9. End-to-end provenance gate

Before A10 closes, every material finding must carry the complete subset of
this chain that actually produced it:

`scenario input -> declaration -> eligibility/admission decision -> structural`
`transition -> observation-source event -> Layer 2 edge/path -> Decision Space`
`difference -> A/B comparison -> material finding`

Not every finding traverses every step. A pure Layer 1 finding must not invent
a Layer 2 path; a pure causal observation must not claim execution authority.
All referenced identities must resolve, semantic mutation must invalidate the
appropriate identity, broken references must fail closed, deterministic
compression must retain uncompressed provenance, and no reviewer may need to
reconstruct missing engine logic manually.

## 10. Vertical fixture requirements

CP6 requires a nontrivial synthetic, domain-neutral fixture with:

- 5–7 initiative instances and stable type/instance identity;
- at least one finish-to-start prerequisite;
- at least one exclusive or quantitative shared resource;
- at least one multi-period active lifecycle and verified release;
- at least one blocking constraint or reusable/consumable entitlement;
- simultaneous or competing candidate starts;
- two defensible schedules containing the same initiative universe;
- a Layer 1 structural divergence and complete reason chain;
- at least one canonical Layer 2 source event;
- a branching or multi-edge categorical path;
- declared persistence;
- a pre-blocking causal divergence that has no Layer 1 authority;
- a later Decision Space difference where the declared mechanism produces one;
- either convergence or deliberately persistent divergence;
- complete end-to-end provenance; and
- deterministic non-valuative finding compression.

Negative/mutation partners must cover dependency/resource/entitlement conflict,
invalid source binding, Layer 2 cycle/limit, persistence boundary, A/B
incompatibility, provenance breakage and semantic-identity sensitivity.

## 11. Frozen Test 01A PASS-criteria crosswalk

| Frozen PASS criterion | Checkpoint owner | Exact evidence | Final confirmation |
| --- | --- | --- | --- |
| 1. Deterministic, reproducible A/B runs | CP3B, CP4B, CP5 | Permutation tests, repeated canonical replay, byte-identical result/comparison identity | CP6 fixture replay; CP8 independent Test 01A replay |
| 2. Meaningful sequence mechanism entirely in declared model | CP3A–CP5 | Contracts contain all lifecycle, structural, causal and comparison semantics; no runtime fallback | CP6 vertical fixture; CP7 Clean MU conformance; CP8 case review |
| 3. Complete Layer 1 reason chain for every authoritative option change | CP3B, CP5 | Eligibility/admission reports, structural-event provenance and Decision Space reason chains | CP6 provenance fixture; CP8 finding trace |
| 4. Complete non-authoritative Layer 2 path for pre-blocking divergence | CP4A–CP5 | Immutable source event, edge/path/terminal trace and non-interference tests | CP6 pre-blocking path; CP8 finding trace |
| 5. First divergence, persistence/convergence and changed future options | CP5 | Required comparison facets and categorical finding projection | CP6 A/B differential; CP8 comparison |
| 6. Reviewer traces one important finding end-to-end | CP5, CP6 | Resolvable provenance chain without fabricated steps or external reconstruction | CP8 reviewer trace |
| 7. No unsupported magnitude, arbitrary threshold or hidden valuation | CP4B, CP5 | Categorical-only observation/persistence and non-valuative compression; negative schema tests | CP6 conformance; CP7 profile review; CP8 output review |
| 8. V1 remains isolated and unchanged | Every checkpoint | Import isolation, forbidden reachability, existing Golden/hash and full regression suite | CP6 full suite; CP7 and CP8 final full suites |

No PASS criterion is unmapped.

## 12. External-pilot items excluded from pre-Test scope

The following remain external-pilot or productization work and do not enter
CP3–CP8:

- generalized unknown/dispute register;
- formal organizational model-approval workflow;
- production-quality immutable pilot storage/package infrastructure;
- customer disclosure workflow;
- validated human elicitation method;
- privacy/confidentiality operations; and
- correction workflow for live organizations.

Test 01A still needs explicit evidence/assumption declarations, immutable
identity-bearing test artifacts and the already frozen one-corrected-rerun
rule. Those bounded preregistration requirements are not generalized external
pilot infrastructure.

## 13. Future capabilities excluded from pre-Test scope

CP3–CP8 do not require or authorize:

- pause, cancellation or restart;
- partial completion;
- recurring initiatives;
- probabilistic timing;
- OR, start-to-start, finish-to-finish, soft or dynamic dependencies;
- substitute or pooled resources;
- optimization or full future reachability;
- joint portfolio Decision Space;
- quantitative causal magnitude;
- Layer 2 to Layer 1 promotion; or
- a generalized Full V2 state system.

If Test 01A appears to require any item in this list, implementation must stop
and report the conflict rather than silently adding it.

## 14. Checkpoint risk map

The labels are independent qualitative classifications, not a score.

| Checkpoint | Implementation complexity | Architecture sensitivity | V1 regression risk | Scope-creep risk | Mandatory review stop |
| --- | --- | --- | --- | --- | --- |
| CP3A | MODERATE | MODERATE | LOW | MODERATE | Yes, before CP3B |
| CP3B | HIGH | HIGH | MODERATE | HIGH | Yes; architecture-sensitive failures reviewed before correction |
| CP4A | MODERATE | HIGH | LOW | MODERATE | Yes, before CP4B |
| CP4B | HIGH | HIGH | LOW | HIGH | Yes; architecture-sensitive failures reviewed before correction |
| CP5 | HIGH | HIGH | LOW | HIGH | Yes |
| CP6 | MODERATE | HIGH | MODERATE | MODERATE | Yes |
| CP7 | MODERATE | MODERATE | LOW | HIGH | Yes |
| CP8 | MODERATE | HIGH | LOW | HIGH | Yes before freeze, then again before execution |

CP3B, CP4A, CP4B, CP5, CP6 and CP8 can expose a preregistered falsifying
technical contradiction. CP3A or CP7 can expose that a materially required
mechanism falls outside both layers, but ordinary schema/profile omissions are
implementation or case issues, not automatically architecture contradictions.

## 15. CP3 PASS evidence

CP3 may be called PASS only when all of this evidence exists:

- strict scenario/initial-state/lifecycle schemas and canonical identities;
- negative proof that instances cannot redefine domain semantics;
- deterministic validation and issue ordering;
- complete eligibility reason reports distinct from admission reports;
- atomic simultaneous admission and unresolved-conflict handling;
- pending/active/completed transition and horizon-active behavior;
- correct prerequisite-completion boundary;
- exact resource reserve/release boundary;
- correct constraint and reusable/consumable entitlement behavior;
- no partial mutation on rejection, unresolved conflict or failure;
- same-period permutation and deterministic replay proof;
- canonical structural event provenance;
- V1/MTC isolation and complete existing regression pass; and
- independent checkpoint review followed by a stop.

## 16. CP4 PASS evidence

CP4 may be called PASS only when all of this evidence exists:

- canonical immutable source-event contract and deterministic identity;
- initiative and required structural-event emission proof;
- deterministic missing-source behavior;
- immutable one-way binding with no mutable Layer 1 read;
- mechanical proof of no Layer 2 write path to Layer 1;
- deterministic bounded categorical traversal, branching and convergence;
- complete source-to-edge-to-terminal provenance;
- all persistence start/visibility/continuation/termination/repetition/multi-path
  boundary tests;
- deterministic repeated execution and A/B observation history;
- fail-closed cycle, limit, reference and unsupported-field tests;
- proof that no magnitude, arbitrary threshold or valuation is used;
- V1/MTC isolation and complete existing regression pass; and
- independent checkpoint review followed by a stop.

## 17. A14 decision and process lock

A14 is **CLOSED BY COVERAGE PLAN**. Every A1–A13 blocker has an owner,
deliverable, success gate, test category, stop condition and architecture
classification. CP3–CP8 collectively cover all eight frozen PASS criteria, and
no required Test 01A behavior is deferred to an external-pilot phase.

Every checkpoint and subcheckpoint is locked to:

`IMPLEMENT -> TEST -> REPORT -> COMMIT/PUSH IF PASS -> STOP`

No checkpoint automatically starts the next. Any CP3 or CP4
architecture-sensitive failure is reviewed before correction. The same rule
applies wherever later implementation demonstrates a frozen falsifying
technical contradiction.

## 18. Direct decisions

1. **Does CP3–CP8 cover every known Test 01A prerequisite?** Yes, with the
   mandatory CP3A/CP3B and CP4A/CP4B safety splits.
2. **Is A14 now closed?** Yes: **CLOSED BY COVERAGE PLAN**.
3. **Is architecture expansion required before CP3?** No.
4. **Which checkpoints can falsify the frozen architecture?** CP3B, CP4A,
   CP4B, CP5, CP6 and CP8 directly; CP3A/CP7 only if a materially required
   mechanism is shown to lie outside both frozen layers.
5. **What evidence must exist before CP3 is PASS?** The complete evidence set
   in section 15.
6. **What evidence must exist before CP4 is PASS?** The complete evidence set
   in section 16.
7. **What must not be built before Test 01A?** The external-pilot and future
   capabilities excluded in sections 12 and 13, including Full V2,
   quantitative causal magnitude, promotion, optimization and generalized
   reachability.
