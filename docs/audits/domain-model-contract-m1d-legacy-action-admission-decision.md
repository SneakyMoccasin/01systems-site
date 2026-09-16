# Domain Model Contract M1D legacy action-admission decision

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `eb8baaf086c2ff88b40299bbdf711ee42b8cd64b`

## 1. Decision

**READY FOR M1C LEGACY ACTION ADMISSION AMENDMENT**

The four blocked action cases do not have a successful historical runtime execution to use as a full-output oracle. The actual runtime rejects them before step 1, and the earlier engine boundary would reject the same unknown drivers atomically. Existing M1C declarations identify the profile-local actions and gap deltas, but they do not completely specify scheduling admission, duplicate and failure policy, or observable provenance. M1D must not infer those missing rules.

The next atomic checkpoint must therefore extend the hash-verified M1C compatibility sidecar with a closed legacy action-admission protocol. After that amendment, M1D may add a separate test-only compatibility-normalized reference. The actual runtime rejection remains a separately named observation and must never be relabeled as an unmodified successful legacy execution.

Comparator A remains exclusively:

```text
actual successful legacy runtime output === compatibility-effective candidate output
```

It cannot run as a full-output comparator for these four rejected cases. A new, separately typed comparator will be required after the amendment:

```text
compatibility-normalized reference output === compatibility-effective candidate output
```

A third admission comparator must preserve the independent fact that the actual runtime rejects the source action. These three meanings must not be combined.

## 2. Repository gate and protected worktree

The read-only gate matched the requested state:

| Check | Observed |
|---|---|
| Repository | `/Users/christian/Projects/pulse_engine_clean` |
| Branch | `decision-flow-demo-v1` |
| HEAD | `eb8baaf086c2ff88b40299bbdf711ee42b8cd64b` |
| Index | Empty |
| Existing changes | Exactly five modified, unstaged M1D files |
| Other changes before audit | None |

The five protected M1D files were not edited. Their pre-audit SHA-256 values were:

| File | SHA-256 |
|---|---|
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `a31f6ab458abe384fb08d17103271923d6abc1a22d28f799075200afe6f3efae` |
| `differentialExecutionV1.ts` | `2d5677b100d992b0b0157eea58c9c94c121f4d878159dfcaf790ccb9b19dbbb4` |
| `domainModelDifferentialV1.test.ts` | `87457da1ec59cdff362537e5e98acb7cc6dbda41bee7e62d082a690cf00c8241` |
| `executeVerifiedNativeProjectionV1.ts` | `bd478bed839f3fca47c97e1ef7b13e2988b60e8551ef243f6457d5967fdb034d` |
| `runDomainModelDifferentialV1.ts` | `5bbeefc65aed9a0742917c02cce03255416e5abca4b4ec8f624327693e45140b` |

## 3. Execution trace and current admission boundary

### 3.1 M0B source and reference path

`src/pilotFastighet/analysis/testSupport/engineOutputProjectionV1.ts` defines the closed M0B input parser and `runEngineBaselineFixtureV1`. The parser derives its nominal action inventory from `projectLegacyDomainProfileSemanticPayloadV1(...).supportedActionIds`. The runner then resolves the frozen executable profile and delegates scheduled cases to `runCascadeAnalysis`.

The six checked-in M0B fixtures deliberately contain none of `congestion_pricing`, `stagger_project_starts`, or `increase_liquidity_buffer`. `engineOutputGoldenV1.test.ts` asserts that exclusion explicitly. Consequently, the six M0B Goldens provide no successful execution evidence for the blocked actions.

### 3.2 Runtime normalization

`src/pilotFastighet/analysis/runCascadeAnalysis.ts` performs all scheduled-action normalization before constructing an engine result:

1. the action ID must exist in `profile.actionEffects`;
2. caller-supplied `driverDeltas` are forbidden;
3. canonical effects are read from the resolved profile;
4. every canonical driver must occur in `profile.applicableDrivers`;
5. any unsupported driver rejects the whole scheduled input;
6. only after complete validation are actions grouped, sorted by execution step and action ID, recorded in provenance, combined, and applied.

The rejection is therefore pre-step, fail-closed, and produces no `AnalyticalResults` or `ScheduledAnalyticalResults`.

`runCascadeAnalysis.scheduled.test.ts` independently locks the exact rejected inventory and requires the error to name every unsupported driver:

| Action | Unsupported drivers |
|---|---|
| `congestion_pricing` | `modal_shift_pressure`, `political_feasibility` |
| `stagger_project_starts` | `implementationPacingRisk` |
| `increase_liquidity_buffer` | `liquidityPressure` |

### 3.3 Engine driver-delta boundary

`src/pilotFastighet/RealEstateEngine.ts#applyDriverDeltas` validates every delta against the resolved profile's `applicableDrivers` before cloning or mutating score state. An unsupported driver throws before any delta is applied. Thus bypassing scheduled normalization would not reveal an older ignore/filter policy; it would reach a second atomic rejection.

### 3.4 Resolver and profile contents

`src/pilotFastighet/executableDomainProfile.ts` places the global `ACTION_EFFECTS` table in each legacy executable profile while maintaining an independent profile-local `applicableDrivers` list. This explains why a canonical action ID can exist in `actionEffects` yet be non-executable.

`src/pilotFastighet/actionEffects.ts` defines the four gap tuples exactly:

- `congestion_pricing`: `modal_shift_pressure: +2`, `political_feasibility: -1`;
- `stagger_project_starts`: modeled `capitalCommitmentRigidityRisk: -1` plus unknown `implementationPacingRisk: -1`;
- `increase_liquidity_buffer`: modeled `refinancingRisk: -1` plus unknown `liquidityPressure: -1`.

Current scheduled normalization rejects the complete action if any one canonical effect is unsupported. It does not retain the modeled subset.

### 3.5 Public facade admission

`src/pilotFastighet/analysis/reactScheduledAnalysisBoundary.ts` derives scheduled support by requiring zero unsupported action drivers. Its tested rejected inventory is exactly:

```text
congestion_pricing
increase_liquidity_buffer
stagger_project_starts
```

`modelRegression.test.ts` also proves that domain-selectable actions with unmodeled drivers are filtered out before current modeled execution. These actions ordinarily never reach `runCascadeAnalysis` through the supported facade.

### 3.6 Provenance

For a successfully normalized action, `runCascadeAnalysis` records scenario, action ID, scheduled step, actual execution step, and the complete canonical `appliedDriverDeltas` before applying the combined batch. For a rejected action, normalization completes no result and emits no execution provenance.

There is no current provenance variant for admitted-but-output-neutral actions, retained versus ignored effects, or compatibility-normalized execution.

## 4. Historical evidence

Local Git history establishes the following sequence:

| Commit | Evidence |
|---|---|
| `af227242fa49004fd4092281e50316cd6141864b` | Driver score execution already validates modeled driver identity. |
| `f27ee19cc041e0fc02804bc1e0317e2522a96242` | `RealEstateEngine.applyDriverDeltas` introduces the explicit `Unsupported driver` rejection before mutation. |
| `fd3c2653e2d0814f469b651b66bde2c913f7c2a1` | Scheduled execution and provenance are introduced. Its normalizer rejects unsupported drivers supplied with scheduled actions. |
| `16b9fae587f3da21fbbdb3b84fa9a407493a1876` | Scheduled actions become bound to canonical effects and independently supplied deltas are prohibited; canonical gap effects remain fail-closed. |
| `b77da27f10af11ab271a7f287bd82fc58030957b` | Domain profiles parameterize `applicableDrivers`; the same rejection becomes profile-bound. |

No inspected revision contains a successful scheduled execution of the four blocked cases. Before the scheduled path existed, preconfigured execution expected action effects to have been resolved into initial state. The available resolver helpers filter unsupported selectable actions; they do not establish an execution oracle that retains or silently ignores only part of an action.

Therefore:

1. the four actions have not been shown to execute successfully in the existing runtime;
2. unknown deltas were not historically ignored by the engine;
3. they were rejected when they reached validation and normally filtered from selectable/scheduled admission before that;
4. the checked-in M0B cases intentionally prevented them from reaching execution.

## 5. Meaning of the current M1C declarations

The current sidecar is hash-verified and profile-bound, but its action declarations have narrower evidentiary meaning than an executable protocol.

### 5.1 Compatibility-only actions

MU and CO declare `/compatibility/compatibilityOnlyActions/0` with:

- `kind: legacy-compatibility-only-action-v1`;
- profile-local `sourceProfileId`;
- `sourceActionId: congestion_pricing`;
- `projectedNativeAction: omitted-because-no-modeled-effects`;
- `admission: legacy-adapter-only`;
- the two exact `ignoredEffects`.

This is intended adapter semantics and an exact account of latent source-profile information. It is not observed successful runtime semantics: no existing runtime adapter consumes the declaration.

### 5.2 Ignored unknown deltas

RE declares:

- `/compatibility/ignoredUnknownDriverDeltas/0`: `stagger_project_starts`, `implementationPacingRisk`, `-1`;
- `/compatibility/ignoredUnknownDriverDeltas/1`: `increase_liquidity_buffer`, `liquidityPressure`, `-1`.

The native projection filters unknown driver tuples from native actions, and M1C tests lock that projection and hash identity. The word `ignored` describes intended projection/adapter accounting. It does not prove that the unmodified runtime historically ignored those deltas; the runtime rejects the complete action.

### 5.3 What is missing

Neither declaration family closes:

- schedule admission and duplicate semantics;
- whether modeled sibling effects are retained when one effect is ignored;
- pre-normalization versus execution-time filtering;
- exact failure behavior for undeclared actions or tuple mismatches;
- normalized provenance representation;
- whether output-neutral actions appear in scheduled provenance;
- interaction with same-step batching and canonical action order;
- the observation and comparator contract for actual rejection versus normalized success.

Giving the existing fields those meanings in M1D would fabricate semantics not presently carried by the hash-verified envelope.

## 6. Independent oracle assessment

No existing tested path is a successful independent oracle for the four actions:

| Candidate | Result |
|---|---|
| `runEngineBaselineFixtureV1` | Delegates to the rejecting runtime. |
| `runCascadeAnalysis` scheduled | Rejects before step 1. |
| `RealEstateEngine.applyDriverDeltas` | Rejects unknown drivers atomically. |
| React/manual scheduled facade | Filters/rejects the three gap actions before execution. |
| M0B Goldens | Deliberately omit all three action IDs. |
| Native M1C projection | Removes compatibility-only actions and unknown tuples; it is not legacy execution. |
| M1D native candidate | Candidate under test, not an independent oracle. |

The independent evidence that does exist is admission/rejection evidence: action identity, exact unsupported-driver set, error timing, lack of mutation, and absence of provenance.

## 7. Required separation of observations

The amended design must keep these observations distinct:

| Observation | Meaning | Expected blocked-case result |
|---|---|---|
| Actual legacy runtime | Unmodified `runEngineBaselineFixtureV1` → `runCascadeAnalysis` | Rejection before step 1; no engine output or execution provenance |
| Compatibility-normalized legacy reference | Future test-only preprocessing governed solely by a verified M1C policy, followed by the existing legacy runtime | Successful output only after declared effects are partitioned; explicitly not unmodified legacy runtime |
| Compatibility-effective native candidate | Native contract plus verified compatibility policy | Successful output without native compatibility-only action or driver creation |

The rejection observation must remain available even after normalized execution exists.

## 8. Alternative evaluation

| Alternative | Strength | Fatal limitation | Decision |
|---|---|---|---|
| A. Actual runtime is the only Comparator-A reference | Preserves the strongest historical evidence and existing Comparator A | Provides only rejection for the four cases; cannot prove full-output parity | Retain for successful legacy cases and rejection evidence, but insufficient alone |
| B. Separate test-only normalized reference | Can provide an independent normalized full-output comparison without runtime adoption | Current declarations do not close admission, batching, failure, or provenance semantics | Adopt only after C |
| C. Explicit M1C action-admission policy | Hash-binds every rule required for deterministic normalization and independent verification | Requires an atomic contract amendment before M1D resumes | Recommended next checkpoint |
| D. Compare current rejections | Can prove both paths reject the same admitted input | Cannot exercise trajectory, registry, margin, provenance, or Comparator B output attribution | Use only as a separate admission/rejection comparator |
| E. Defer to M1E or later | Avoids inventing action semantics | M1E owns curve fallback, not action admission; M1D could not claim the requested full action matrix | Reject as misplaced deferral |

## 9. Required M1C amendment

### 9.1 Closed types

M1C must add the following exact mandatory compatibility-owned field and types. `StableId` is the existing `string` alias from `contractV1.ts`; every StableId must pass the existing StableId parser rules. `JsonNumber` is the existing finite JSON-number type; negative zero is rejected. `VerifiedDeclarationPathV1` is a string validated as the exact RFC 6901 path derived internally from the verified entry index. It is never caller-supplied.

```ts
type VerifiedDeclarationPathV1 = string;

type LegacyActionAdmissionPolicyV1 = Readonly<{
  schemaVersion: "legacy-action-admission-policy-v1";
  protocol: "partition-source-effects-before-execution-v1";
  scheduleInput: "source-action-id-and-execution-step-v1";
  ordering: "execution-step-then-source-action-id-code-unit-v1";
  duplicatePolicy: "reject-duplicate-source-action-per-scenario-v1";
  undeclaredActionPolicy: "reject-before-execution-v1";
  undeclaredEffectPolicy: "reject-before-execution-v1";
  normalizationFailurePolicy: "atomic-no-output-no-provenance-v1";
  actualRuntimeExpectation: "reject-unsupported-driver-before-step-v1";
  normalizedProvenancePolicy: "separate-closed-compatibility-provenance-v1";
  entries: readonly LegacyActionAdmissionEntryV1[];
}>;

type LegacyActionAdmissionEntryV1 = Readonly<{
  entryId: StableId;
  sourceProfileId: StableId;
  sourceActionId: StableId;
  admissionMode: "admit-after-exact-effect-partition-v1";
  outputDisposition: "output-neutral-v1" | "retained-native-effects-v1";
  retainedEffects: readonly LegacyRetainedActionEffectV1[];
  ignoredEffects: readonly LegacyIgnoredActionEffectV1[];
}>;

type LegacyRetainedActionEffectV1 = Readonly<{
  sourceDriverId: StableId;
  projectedDriverId: StableId;
  delta: JsonNumber;
  disposition: "apply-to-projected-native-driver-v1";
}>;

type LegacyIgnoredActionEffectV1 = Readonly<{
  sourceDriverId: StableId;
  delta: JsonNumber;
  disposition: "ignore-without-state-node-v1";
  reason: "driver-absent-from-native-contract-v1";
}>;
```

The field is exactly `compatibility.actionAdmission`. All objects are closed. Every listed field is required and no additional field is permitted. `entries` is sorted by `sourceActionId` using direct ECMAScript code-unit order. `retainedEffects` is sorted by `projectedDriverId`; `ignoredEffects` is sorted by `sourceDriverId`. Duplicate entry IDs, action IDs, retained projected IDs, retained source IDs, or ignored source IDs are rejected. A source effect must occur exactly once across the retained and ignored arrays.

### 9.2 Locked profile/action partitions

The amendment must contain exactly the following four profile-local entries. These are normative values, not implementation choices.

| Profile | Entry ID | Source action | Retained effects | Ignored effects | Output disposition | Declaration path |
|---|---|---|---|---|---|---|
| MU | `legacy-action-admission-v1.legacy-municipal-v1.congestion_pricing` | `congestion_pricing` | `[]` | `modal_shift_pressure`, `+2`, `ignore-without-state-node-v1`, `driver-absent-from-native-contract-v1`; `political_feasibility`, `-1`, same disposition/reason | `output-neutral-v1` | `/compatibility/actionAdmission/entries/0` |
| CO | `legacy-action-admission-v1.legacy-consulting-v1.congestion_pricing` | `congestion_pricing` | `[]` | `modal_shift_pressure`, `+2`, `ignore-without-state-node-v1`, `driver-absent-from-native-contract-v1`; `political_feasibility`, `-1`, same disposition/reason | `output-neutral-v1` | `/compatibility/actionAdmission/entries/0` |
| RE | `legacy-action-admission-v1.legacy-real-estate-v1.increase_liquidity_buffer` | `increase_liquidity_buffer` | `refinancingRisk` → `refinancing-risk`, `-1`, `apply-to-projected-native-driver-v1` | `liquidityPressure`, `-1`, `ignore-without-state-node-v1`, `driver-absent-from-native-contract-v1` | `retained-native-effects-v1` | `/compatibility/actionAdmission/entries/0` |
| RE | `legacy-action-admission-v1.legacy-real-estate-v1.stagger_project_starts` | `stagger_project_starts` | `capitalCommitmentRigidityRisk` → `capital-commitment-rigidity-risk`, `-1`, `apply-to-projected-native-driver-v1` | `implementationPacingRisk`, `-1`, `ignore-without-state-node-v1`, `driver-absent-from-native-contract-v1` | `retained-native-effects-v1` | `/compatibility/actionAdmission/entries/1` |

The complete source inventories are therefore:

- MU/CO `congestion_pricing`: exactly `modal_shift_pressure: +2` and `political_feasibility: -1`; both ignored, none retained.
- RE `increase_liquidity_buffer`: exactly `refinancingRisk: -1` retained through the verified bijection to `refinancing-risk`, and `liquidityPressure: -1` ignored.
- RE `stagger_project_starts`: exactly `capitalCommitmentRigidityRisk: -1` retained through the verified bijection to `capital-commitment-rigidity-risk`, and `implementationPacingRisk: -1` ignored.

Every source effect with a verified bijective mapping to a declared native driver is retained. Only the exact unknown-driver tuples listed above are ignored. The complete canonical source effect inventory must be partitioned exactly once; no effect may be added, omitted, duplicated, or assigned to both dispositions.

### 9.3 Ownership

`compatibility` owns the protocol, entry inventory, source IDs, admission mode, ignored effects, scheduling policy, failure policy, and compatibility provenance rules. The native contract continues to own only native actions, native drivers, and native effects. Source cases own only action occurrence and execution step. Callers own no mapping, admission decision, declaration path, or effect partition.

The four exact partitions in section 9.2 are the only admitted entries. M1C implementation has no discretion to change retained or ignored membership.

### 9.4 Hash and validation

The complete protocol and every nested leaf must enter both the compatibility declarations hash and envelope hash. Native source and projected semantic hashes must remain unchanged.

The structural parser must reject missing/unknown fields, wrong containers, unsupported literals, non-finite or negative-zero deltas, duplicate IDs, sparse/accessor values, and resource-limit violations. Semantic validation must reconstruct the exact profile-local policy from independently locked source evidence and reject:

- wrong-profile entries;
- missing, extra, reordered, or duplicate entries/effects;
- source action/effect mismatches;
- retained effects without a bijective native driver mapping;
- ignored effects that resolve to native drivers;
- incomplete partition of every canonical source effect;
- non-neutral disposition with an empty retained set;
- neutral disposition with a non-empty retained set;
- wrong duplicate, ordering, failure, or provenance policy;
- any native action or driver contamination.

Negative tests must pass through the real structural → semantic → hash progression. Leaf mutation tests must prove compatibility- and envelope-hash sensitivity.

## 10. Execution and provenance after amendment

Normalization must occur before either normalized executor mutates state:

1. verify the complete M1C envelope;
2. bind profile and source action occurrence;
3. find exactly one admission entry;
4. compare the canonical source effect inventory with the declared complete partition;
5. reject atomically on any mismatch;
6. sort occurrences by declared execution-step/action-ID order;
7. apply only `retainedEffects` through the ordinary target executor's native driver boundary;
8. record ignored effects without creating state nodes;
9. execute the step even when retained effects are empty;
10. preserve fresh state for every primary and counterfactual run.

Normalized provenance is test-only and separate from canonical runtime `executionProvenance`. It uses exactly this closed discriminated union:

```ts
type NormalizedActionAdmissionProvenanceV1 =
  | AdmittedActionProvenanceV1
  | RejectedActionProvenanceV1;

type NormalizedObservationKindV1 =
  | "compatibility-normalized-reference"
  | "compatibility-effective-native";

type NormalizedScenarioV1 = "scenarioA" | "scenarioB";

type AdmittedActionProvenanceV1 = Readonly<{
  version: "normalized-action-admission-provenance-v1";
  outcome: "admitted";
  observationKind: NormalizedObservationKindV1;
  profileId: StableId;
  scenario: NormalizedScenarioV1;
  entryId: StableId;
  sourceActionId: StableId;
  declarationPath: VerifiedDeclarationPathV1;
  scheduledStep: number;
  actualStep: number;
  retainedEffects: readonly LegacyRetainedActionEffectV1[];
  ignoredEffects: readonly LegacyIgnoredActionEffectV1[];
  outputDisposition: "output-neutral-v1" | "retained-native-effects-v1";
  outputChanged: boolean;
}>;

type RejectedActionProvenanceV1 = Readonly<{
  version: "normalized-action-admission-provenance-v1";
  outcome: "rejected";
  observationKind: NormalizedObservationKindV1;
  profileId: StableId;
  scenario: NormalizedScenarioV1;
  entryId: StableId | null;
  sourceActionId: StableId;
  declarationPath: VerifiedDeclarationPathV1 | null;
  scheduledStep: number;
  canonicalSourceEffects: readonly Readonly<{
    sourceDriverId: StableId;
    delta: JsonNumber;
  }>[];
  failureStage:
    | "profile-binding"
    | "action-admission"
    | "effect-partition"
    | "schedule-validation";
  failureReason:
    | "wrong-profile"
    | "undeclared-action"
    | "duplicate-action"
    | "step-outside-horizon"
    | "source-effect-inventory-mismatch"
    | "missing-effect"
    | "extra-effect"
    | "duplicate-effect"
    | "mapping-mismatch";
  engineOutput: "absent";
  stateMutation: false;
  canonicalExecutionProvenance: "absent";
}>;
```

No other provenance fields or literals are permitted. `scheduledStep` and admitted `actualStep` are integers within `1..horizon`; for an admitted occurrence they are equal. Rejected provenance has no `actualStep`, retained/ignored partition, output disposition, or `outputChanged`, because execution did not occur. Admitted provenance has no failure fields or canonical source inventory field.

`declarationPath` is derived internally after hash verification. For admitted entries it equals the exact section 9.2 path. A rejected known entry retains its derived path and entry ID; an undeclared action uses `null` for both. `canonicalSourceEffects` is sorted by `sourceDriverId` using code-unit order.

Semantic validation permits only these failure-stage/reason pairs: `profile-binding`/`wrong-profile`; `action-admission`/`undeclared-action`; `schedule-validation`/`duplicate-action` or `step-outside-horizon`; and `effect-partition` with `source-effect-inventory-mismatch`, `missing-effect`, `extra-effect`, `duplicate-effect`, or `mapping-mismatch`. Every other combination is rejected.

Required outcomes are:

| Case | Provenance |
|---|---|
| Admitted compatibility-only action | One admitted occurrence, empty retained effects, exact ignored effects, `outputChanged: false` |
| Ignored unknown delta with retained siblings | One admitted occurrence, exact retained and ignored partitions; output change derived from retained effects |
| Output-neutral declaration | Ledger/provenance evidence only; never an output attribution in Comparator B |
| Rejected action | Rejection observation with stage/reason and no execution provenance or state mutation |

For an admitted `output-neutral-v1` action, normalized provenance exists, canonical engine output is byte-for-byte unchanged from the same run without that occurrence, `outputChanged` is `false`, and Comparator B creates no output attribution. For `retained-native-effects-v1`, only `retainedEffects` are applied; ignored effects create no state node. `outputChanged` is calculated by exact comparison of the primary engine output before and after the occurrence and is never inferred from disposition. Comparator B may attribute only paths that this actual comparison and the required counterfactuals expose.

## 11. Comparator structure

### 11.1 Comparator A

Comparator A remains unchanged and strict. It compares complete successful actual runtime output with complete compatibility-effective output. It performs no filtering, normalization, tolerance, identity substitution, or admission repair.

Comparator A has this exact status union:

```ts
type ComparatorAStatusV1 =
  | "pass"
  | "fail"
  | "not-applicable-no-successful-legacy-output";
```

`pass` and `fail` are permitted only when actual runtime produced a complete output. `not-applicable-no-successful-legacy-output` is neither pass nor fail and contributes no parity evidence. All four blocked action cases have exactly this status because actual runtime rejects before step 1.

### 11.2 Normalized-reference comparator

The separate comparator is named `compatibility-normalized-reference-vs-effective-v1`. Its status union is exactly `"pass" | "fail" | "not-applicable-normalization-rejected"`. It compares complete normalized outputs exactly and contains the verified action-admission policy hash, both complete normalized observations, and every exact RFC 6901 discrepancy. Passing proves only parity with the reviewed compatibility-normalized model and is never historical legacy parity.

### 11.3 Admission comparator

The admission comparator is named `actual-runtime-admission-vs-declared-policy-v1`. Its status union is exactly `"pass" | "fail"`. It compares the declared `actualRuntimeExpectation`, source occurrence, complete canonical effect inventory, actual rejection stage, unsupported-driver evidence, absence of mutation, absence of engine output, and absence of canonical execution provenance. It never compares rejection with successful output and never supplies engine-output parity evidence.

Its actual-runtime input is exactly:

```ts
type ActualRuntimeActionRejectionV1 = Readonly<{
  version: "actual-runtime-action-rejection-v1";
  outcome: "rejected";
  profileId: StableId;
  scenario: NormalizedScenarioV1;
  sourceActionId: StableId;
  scheduledStep: number;
  canonicalSourceEffects: readonly Readonly<{
    sourceDriverId: StableId;
    delta: JsonNumber;
  }>[];
  unsupportedSourceDriverIds: readonly StableId[];
  failureStage: "normalize-scheduled-actions-before-step-v1";
  failureReason: "canonical-effect-driver-not-applicable-v1";
  engineOutput: "absent";
  stateMutation: false;
  canonicalExecutionProvenance: "absent";
}>;
```

Both effect and unsupported-driver arrays use direct code-unit order and reject duplicates. `scheduledStep` is an integer within `1..horizon`. These fields are captured from the unmodified runtime boundary; no compatibility declaration is used to manufacture the observed rejection.

### 11.4 Comparator B

Comparator B continues to compare pure native with compatibility-effective output. Output-neutral compatibility actions and ignored effects may be recorded as admitted/applied or ignored in the compatibility ledger, but they receive no output attribution. Retained modeled effects may receive attribution only when a single-declaration or leave-one-out counterfactual proves actual primary output paths. Ledger-only evidence is never sufficient.

Interactions between an admission entry and propagation, constraints, or sustain behavior require both single-declaration and leave-one-out runs. Every run must preserve native propagation and must not mutate the envelope, source case, actual rejection observation, or other counterfactuals.

### 11.5 Applicability for the four blocked cases

| Profile/action | Comparator A | Normalized-reference comparator | Admission comparator | Comparator B |
|---|---|---|---|---|
| MU `congestion_pricing` | `not-applicable-no-successful-legacy-output` | Applicable; must pass before M1D-2b completion | Applicable; actual pre-step rejection must pass | No output attribution; action is output-neutral |
| CO `congestion_pricing` | `not-applicable-no-successful-legacy-output` | Applicable; must pass before M1D-2b completion | Applicable; actual pre-step rejection must pass | No output attribution; action is output-neutral |
| RE `increase_liquidity_buffer` | `not-applicable-no-successful-legacy-output` | Applicable; must pass before M1D-2b completion | Applicable; actual pre-step rejection must pass | Attribute only counterfactually observed paths caused by retained `refinancing-risk: -1`; ignored `liquidityPressure` is ledger-only |
| RE `stagger_project_starts` | `not-applicable-no-successful-legacy-output` | Applicable; must pass before M1D-2b completion | Applicable; actual pre-step rejection must pass | Attribute only counterfactually observed paths caused by retained `capital-commitment-rigidity-risk: -1`; ignored `implementationPacingRisk` is ledger-only |

## 12. Minimum implementation scope after this decision

The next checkpoint is M1C-only:

1. extend compatibility types with the closed action-admission protocol;
2. extend structural parsing, semantic validation, identity projection, hashing, diagnostics, fixtures, and provenance constants;
3. add profile-complete positive, negative, mutation, hash-domain, detachment, and recursive-freeze tests;
4. prove native contract and native semantic hashes unchanged;
5. perform no M1D or production edits in the same checkpoint.

Only after that amendment is reviewed may a separate M1D checkpoint:

1. preserve actual runtime rejection observations;
2. build the normalized reference only from the verified protocol;
3. extend the compatibility-effective candidate without adding native actions or drivers;
4. add normalized-output and admission comparators;
5. implement declaration-derived single and leave-one-out counterfactuals;
6. resume the four action cases and then the paused sustain-threshold matrix.

No production runtime, resolver, UI, persistence, trust registry, executable brand, deployment, fixture Golden, or M0B baseline change belongs to either checkpoint unless separately authorized.

## 13. Required tests

The amendment and later M1D work must prove:

- exact MU/CO profile binding for `congestion_pricing`;
- exact RE binding for both ignored-delta tuples;
- complete effect partition with no silently dropped tuple;
- duplicate schedule rejection and deterministic same-step order;
- unknown action, undeclared tuple, wrong delta, wrong profile, and cross-profile entry rejection;
- actual runtime rejection before step 1, with no mutation or provenance;
- normalized reference and effective execution use only retained effects;
- ignored drivers never enter native state, driver maps, propagation, constraints, or output;
- output-neutral actions produce no Comparator B attribution;
- modeled retained effects preserve exact legacy IDs, scores, levels, margins, registry, events, and normalized provenance;
- caller-supplied admission, mappings, hashes, declaration paths, effects, or deltas remain impossible;
- all primary and counterfactual observations are detached, recursively frozen, deterministic, and mutation-free;
- no production importer or runtime adoption appears.

## 14. Resumption criteria and stop conditions

M1D-2b may resume only when:

- the M1C amendment is structurally, semantically, and hash verified for all three profiles;
- every source action effect belongs to exactly one retained or ignored partition;
- normalized provenance and failure policy are closed;
- native source and projected semantic identities remain unchanged;
- the actual rejection observation, normalized reference, and effective candidate have separate types;
- comparator ownership and naming are locked;
- all M1C regression and boundary tests pass.

Stop again if:

- an implementation partition differs from any locked section 9.2 entry;
- normalized execution needs live profile data not represented in the verified envelope;
- an ignored effect changes primary output;
- a compatibility-only action enters native contract/state;
- actual rejection is omitted or renamed as success;
- normalized parity is reported as actual legacy parity;
- provenance or duplicate policy is inferred by M1D;
- counterfactual attribution is ledger-only or mutates another observation;
- implementation requires production/runtime adoption.

The sustain-threshold matrix remains paused during this audit and is unaffected by this decision.

## 15. Final conclusion

The repository contains strong independent evidence for fail-closed rejection, but no successful historical action oracle. Existing M1C declarations accurately inventory the compatibility gaps and intended omission/ignore direction; they are not yet a complete executable admission protocol. A hash-bound M1C amendment is the smallest design change that preserves actual legacy evidence, supports independent normalized verification, keeps Comparator A understandable, and avoids runtime or native adoption.

**READY FOR M1C LEGACY ACTION ADMISSION AMENDMENT**
