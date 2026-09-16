# M1E Final Equivalence Boundary — read-only design audit

## 1. Audit decision

**E. BLOCKED — NEW DESIGN DECISION REQUIRED**

The curve-fallback half of M1E has a closed, deterministic compatibility policy and can be witnessed without reopening M1C. The sustain half cannot be closed from current evidence: no authoritative RE/CO `riskState.sustainThreshold` value exists in a profile, fixture, manifest, Golden, executable input, or current hash domain. Choosing such a value, or choosing a new per-execution ownership model for it, would create semantics rather than verify them.

This is not an atomic curve-and-sustain problem. Curve fallback is owned by the hash-bound M1C compatibility declaration; sustain override is an optional runtime input whose value has no current owner. M1E must not make the curve mechanism wait conceptually for a sustain value, but it must not claim a complete final-equivalence boundary until the sustain ownership decision is made.

## 2. Scope, baseline, and evidence

The audit was performed read-only at branch `decision-flow-demo-v1`, with local HEAD, tracking HEAD, and the actual `origin/decision-flow-demo-v1` all at `5679c872f6091fb782694071c2595e9d210c1093`. The index and working tree were clean before this file was created.

The following normative audits were read and cross-checked:

- `docs/audits/domain-model-contract-m1c-completion-audit.md`
- `docs/audits/domain-model-contract-m1c-registry-amendment-completion-audit.md`
- `docs/audits/domain-model-contract-m1c-compatibility-propagation-amendment-completion-audit.md`
- `docs/audits/domain-model-contract-m1c-legacy-action-admission-amendment-completion-audit.md`
- `docs/audits/domain-model-contract-m1c-legacy-adapter-design.md`
- `docs/audits/domain-model-contract-m1d-differential-execution-design.md`
- `docs/audits/domain-model-contract-m1d-legacy-registry-parity-decision.md`
- `docs/audits/domain-model-contract-m1d-compatibility-propagation-decision.md`
- `docs/audits/domain-model-contract-m1d-legacy-action-admission-decision.md`
- `docs/audits/domain-model-contract-m1d2b-reference-and-sustain-decision.md`
- `docs/audits/domain-model-contract-m1d3-discrepancy-classification-decision.md`
- `docs/audits/domain-model-contract-m1d-completion-audit.md`

The audit also inspected the M0B manifests and six engine-output Goldens, the M1C envelope type/parser/semantic validator/hash/projector/fixtures, all six files under `analysis/testSupport/domainModelDifferentialV1`, the legacy profile projection and resolver, `runEngineBaselineFixtureV1`, `runCascadeAnalysis`, `RealEstateEngine`, and the curve, constraint, driver-state, multiplier, and impact implementations and tests. Findings below cite the owning source rather than inferring semantics from names.

## 3. Curve inventory

### 3.1 Closed inventory shared by all profiles

`executableDomainProfile.ts` resolves RE, MU, and CO from the same complete `PARAMETER_CURVE_CONFIG`. The M1C fixtures bind the same 18 projected curve identities in every profile. There is no source curve absent from native V1 and no profile-specific fallback configuration.

The four ordered amplitudes are LOW, MODERATE, HIGH, and SEVERE at legacy scores 0, 1, 2, and 3. The native scale bands in the M1C projection are LOW `[0, 0.5000000000000001)`, MODERATE `[0.5000000000000001, 1.5)`, HIGH `[1.5, 2.5)`, and SEVERE `[2.5, 3]`. “Points” below therefore means these four ordered level anchors; the source has no independent point array.

| Source driver / parameter | Native curve ID suffix | Kind and parameters | Ordered amplitudes | Effects |
| --- | --- | --- | --- | --- |
| `demandRisk` | `demand-risk` | linear | 0.9, 1, 1.15, 1.3 | +load |
| `pricingPowerRisk` | `pricing-power-risk` | linear | 0.9, 1, 1.15, 1.3 | +load |
| `tenantStabilityRisk` | `tenant-stability-risk` | linear | 0.9, 1, 1.2, 1.35 | +load, -recovery |
| `maintenanceIntensityRisk` | `maintenance-intensity-risk` | linear | 0.95, 1, 1.15, 1.3 | -recovery |
| `operationalEfficiencyRisk` | `operational-efficiency-risk` | linear | 0.9, 1, 1.2, 1.4 | +cost, -recovery |
| `energyExposureRisk` | `energy-exposure-risk` | linear | 0.95, 1, 1.2, 1.35 | +cost |
| `interestRateExposureRisk` | `interest-rate-exposure-risk` | exponential, exponent 1.2 | 0.9, 1, 1.4, 1.9 | +cost |
| `leverageLevelRisk` | `leverage-level-risk` | exponential, exponent 1.2 | 0.9, 1, 1.6, 2.3 | +cost, +sensitivity |
| `refinancingRisk` | `refinancing-risk` | logistic, k 0.8, x0 3 | 0.97, 1, 1.18, 1.35 | +cost |
| `marketVolatilityRisk` | `market-volatility-risk` | linear | 0.95, 1, 1.2, 1.4 | +load |
| `regulatoryPressureRisk` | `regulatory-pressure-risk` | linear | 0.95, 1, 1.25, 1.5 | +cost |
| `capitalCommitmentRigidityRisk` | `capital-commitment-rigidity-risk` | linear | 0.95, 1, 1.15, 1.3 | -recovery |
| `accessibility` | `accessibility` | linear | 0.98, 1, 1.04, 1.08 | -load, +recovery |
| `modal_attractiveness` | `modal_attractiveness` | linear | 0.97, 1, 1.05, 1.1 | -load, +recovery |
| `congestion_pressure` | `congestion_pressure` | linear | 0.98, 1, 1.05, 1.1 | +load, +cost |
| `operational_capacity` | `operational_capacity` | linear | 0.98, 1, 1.04, 1.08 | -load, +recovery |
| `transit_signal_priority` | `transit_signal_priority` | linear | 0.98, 1, 1.03, 1.06 | -load, +recovery |
| `budget_pressure` | `budget_pressure` | linear | 0.99, 1, 1.06, 1.12 | +cost, -recovery |

Every complete native identity is `legacy-curve-v1.<suffix>`. Driver-to-effect ownership comes from `curveConfig.ts` and `computeDimensionMultipliers.ts`; source-to-projected identity and ordering are locked by the M1C projector, fixtures, and semantic validator. Actions do not select curves directly: their parameter effects alter driver state, after which the affected driver’s curve contributes to dimension multipliers.

### 3.2 Actual legacy behavior

`curveConfig.ts#getImpactMultiplier` defines the runtime behavior:

- Missing curve configuration for a parameter returns the neutral multiplier `1` immediately.
- An unsupported curve discriminant reaches the switch default and returns `1`.
- An unknown native curve ID is not a legacy lookup condition. Legacy looks up by parameter key. A missing or unknown parameter key is the missing-configuration case; an unknown native reference is rejected by native contract validation before execution.
- Missing score is not a curve fallback. `computeDimensionMultipliers.ts` uses the driver’s risk level when score is absent; if both score and level are absent, that driver is skipped.
- Missing amplitude is not a neutral fallback and can propagate `undefined`/`NaN` behavior.
- Finite scores outside `[0, 3]` are clamped. `+Infinity` clamps to 3 and `-Infinity` to 0. `NaN` remains `NaN`; it does not trigger the neutral fallback.
- Interpolation between adjacent anchor outputs is ordinary curve evaluation, not fallback.

The fallback result has no synthesized level, score, delta, amplitude, event, or provenance record. It mutates no state. Its only semantic effect is the exact multiplier `1`, so downstream load/cost/recovery/sensitivity is unchanged by that curve contribution.

RE, MU, and CO have identical fallback behavior. Because all resolved profiles have all 18 configurations, none of the six M0B neutral/stressed-scheduled cases reaches either fallback branch. Positive fallback evidence therefore requires bounded special witnesses: a missing configuration and a source-representable unsupported discriminant witness. The latter must be isolated from typed production construction and must not be presented as a valid profile.

## 4. What M1C currently binds for curves

`LegacyCurveFallbackDeclarationV1` is exactly:

```text
policyId: "legacy-neutral-multiplier-v1"
appliesTo:
  - "missing-curve-configuration"
  - "unsupported-curve-discriminant"
neutralMultiplier: 1
evidenceStatus: "deferred-to-m1e"
```

The parser fixes every literal and the array order. Semantic validation compares the object to the closed profile projection. The declaration participates in the compatibility hash and whole-envelope hash. Source curve configuration participates in the source semantic hash. Projected IDs, curve kinds, parameters, ordered amplitudes, driver mappings, and scale definitions participate in the projected-native semantic hash. Fixtures cover all three profiles.

Diagnostics report the deferred M1E evidence state. The provenance table and diagnostics are not themselves hash inputs; provenance constants are equality targets validated against the closed source/projected mappings. Compatibility declarations, including registry, propagation, action admission, curve fallback, and sustain mechanism, are hash-bound through the compatibility domain.

### 4.1 Sufficiency decision

The current curve declaration is sufficient for a deterministic M1E witness harness. The two exhaustive trigger literals and exact output multiplier are present and hash-bound. No missing executable leaf is required to evaluate the fallback witness: the legacy function supplies actual behavior and the declaration supplies the expected compatibility result. `evidenceStatus: "deferred-to-m1e"` records where evidence is to be produced; it is not an unspecified result.

M1C must not be reopened merely to relabel that historical status. M1E’s final report should own the completed evidence. Parser, semantic validator, fixtures, hashes, and provenance need no curve amendment. A future broadening to more triggers, a different multiplier, or an event/mutation claim would require a new amendment and is outside this design.

## 5. Sustain-threshold audit

### 5.1 Actual source and behavior

`simulateConstraintsStep.ts` reads `(riskState as Record<string, unknown>).sustainThreshold`. If its runtime type is `number`, including `NaN` and infinities, that value overrides `profile.constraints.refinancingMarginThreshold`; otherwise the profile threshold is used, defaulting to `0.8` only if the profile threshold is absent.

All resolved profiles currently carry the normal refinancing constraint threshold `0.8`; MU also has refinancing disabled. That field is not the value of the optional `riskState.sustainThreshold` override. No `ParameterKey`, initial driver state, executable profile, source-semantic fixture, M0B input, manifest, Golden, or UI-to-engine input path supplies a sustain override. The UI’s `EXEC_SUSTAIN_THRESHOLD = 0.8` is presentation summary logic and is not written into engine risk state.

Consequently the authoritative profile-bound sustain override values are:

| Profile | Eligibility declaration | Authoritative override value |
| --- | --- | --- |
| RE | applicable | absent / not configured |
| MU | ineligible; no declaration | none |
| CO | applicable | absent / not configured |

There is therefore no exact numeric RE or CO value to report or derive, and no such value participates in the current source semantic hash.

### 5.2 Bound and unbound semantics

The existing `LegacySustainThresholdOverrideV1` binds mechanism kind, source field, constraint ID, accepted runtime type (`number-including-non-finite`), strict comparison (`margin-strictly-below-threshold`), and profile applicability. RE and CO contain the mechanism declaration; MU contains `null`.

It does not bind:

- a numeric RE/CO value or a value source;
- a source/value hash or execution-input hash;
- non-number fallback semantics as an explicit declaration;
- `NaN`, `+Infinity`, and `-Infinity` outcomes;
- the exact step timing and eligibility ordering;
- activation state mutation and provenance;
- an authorization boundary for injecting the override.

The runtime currently compares the entering-step margin strictly below the chosen threshold, after propagation and before that step’s margin update, only when refinancing is enabled and inactive. Equality does not activate. Activation writes lifecycle `ACTIVE`, `activatedAtStep`, and `lastUpdatedStep`; this path does not deactivate or recover. These facts are inspectable runtime behavior, but they do not manufacture an authoritative override value.

M1D reports `deferred-missing-hash-bound-value` for RE/CO precisely because the mechanism exists while its value does not. MU correctly reports `ineligible-no-declaration`.

### 5.3 Why a new decision is required

A conventional “sustain threshold amendment” cannot state the required profile-bound values without inventing them. Before any amendment, the product/domain owner must choose one of these mutually exclusive ownership models:

1. Sustain override is not part of the final equivalence contract and remains absent.
2. Sustain override is a fixed, profile-owned constant, with authoritative RE and CO values and source provenance.
3. Sustain override is an optional per-execution compatibility input, with a closed value domain, authorization, canonical hashing, and provenance.

The decision must also settle whether non-finite JavaScript numbers are contractually supported or rejected, and whether current timing/mutation behavior is normative. M1E may not choose among these models.

Curve and sustain must remain separate: they have different triggers, owners, hash surfaces, execution paths, and output effects. There is no evidence for an atomic M1C amendment.

## 6. Permitted final-equivalence architecture

### 6.1 Evidence boundaries and comparator ownership

| Boundary | Evidence | Owner |
| --- | --- | --- |
| Actual legacy runtime | detached actual success or actual rejection | observation layer |
| Native execution | verified envelope plus hash-verified native projection | native execution verifier |
| Compatibility-effective execution | native result plus closed compatibility rules and full attribution | Comparator B |
| Normalized legacy engine core | bounded reconstruction from verified inputs | normalized-reference comparator |
| Curve fallback witness | actual `getImpactMultiplier` result versus hash-bound policy | curve-specific M1E comparator |
| Sustain witness | actual constraint result versus a future authorized value/declaration | sustain-specific comparator, currently disabled |
| Final report | all evidence, statuses, attributions, discrepancies, and hash | M1E report builder |

Comparator A is applicable only when a successful actual legacy output exists and all M1D cause-exclusion prerequisites pass. Actual action rejection remains explicit rejection evidence and makes full Comparator A/notional admission comparison not applicable; a bounded normalized core comparison may still run under its distinct owner.

Comparator B owns pure-native versus full compatibility-effective differences and their exact attribution. A normalized reference must be used only where actual runtime cannot represent the admitted compatibility scenario. It must never be relabeled as actual legacy output.

Curve fallback uses a dedicated witness boundary because the six normal cases cannot hit it. The only permitted changed paths are those causally downstream of the affected curve multiplier; the neutral witness should produce no output delta. It must still record profile, driver/config key, trigger literal, actual multiplier, expected multiplier, declaration hash binding, and source/projection/envelope identities.

Sustain evidence must remain not executed until its value ownership is decided and hash-bound. Once authorized, changed paths are limited to the named refinancing constraint lifecycle/timing and its causally downstream output paths; attribution must cite the sustain declaration and value provenance.

### 6.2 Classification and status

- `adapter-error`: malformed, stale, wrongly bound, non-frozen, or internally inconsistent observation/report evidence.
- `contract-error`: invalid native contract or incomplete native execution evidence.
- `compatibility-rule`: a verified difference fully owned by a hash-bound compatibility declaration and exact attribution.
- `unresolved-design-decision`: a reproducible remainder only after the complete M1D Comparator A cause-exclusion chain succeeds.

Deferred, ineligible, rejected, and not-applicable are statuses, not discrepancies. `known-explicitly-deferred` and `possible-legacy-runtime-defect` remain reserved and non-emittable: neither has the required normative evidence chain. No alternate M1E route may activate them.

### 6.3 Report integrity

The final report must include all input/envelope/source/projected/compatibility hashes, observation hashes, execution hashes, comparator results, witness results, attributions, statuses, and discrepancies. Its report hash must use the existing canonical M0B hashing rules over the complete report excluding only the report-hash field itself. Ordered arrays remain order-sensitive; map-like inputs must be canonicalized before hashing.

All returned observations, normalized references, execution results, witness evidence, attribution arrays, discrepancies, and the report itself must be detached from caller inputs and recursively frozen. Repeated construction from identical semantic inputs must be byte- and hash-deterministic.

## 7. Required mutation and witness matrix

### 7.1 Curve matrix

The harness must cover RE, MU, and CO and every one of the 18 curves. For each curve it must cover all four anchors, every adjacent interpolation interval, both exact domain bounds, finite values below/above the domain, and deterministic repetition. Expected clamp cases are finite below 0, finite above 3, `-Infinity` to 0, and `+Infinity` to 3. `NaN` must be observed as non-neutral `NaN` behavior, never accepted as fallback.

Positive fallback witnesses are required for both declared triggers in every profile:

- missing curve configuration -> exactly multiplier 1;
- unsupported curve discriminant -> exactly multiplier 1 in an isolated runtime witness.

Negative mutations must include:

- missing/unknown parameter key versus unknown native curve reference;
- wrong curve ID, wrong driver mapping, wrong profile binding, and cross-profile substitution;
- wrong curve kind, exponent, logistic k/x0, amplitude, level/point order, scale boundary, or interpolation expectation;
- missing amplitude, missing score and level, `NaN`, infinities, and duplicate declarations;
- stale source, projected, compatibility, or envelope hash;
- mutation of output, provenance, attribution path, or attribution before/after values;
- insertion-order changes in map-like inputs and order changes in ordered arrays;
- input mutation, output aliasing, incomplete recursive freeze, and repeated-run nondeterminism.

Expected gates must distinguish behavior rather than collapse it: missing configuration and unsupported discriminant are neutral fallback; missing score may use level or skip; missing amplitude/`NaN` is invalid/non-neutral observation; interpolation and clamp are normal evaluation; invalid native identities reject before native execution.

The six M0B Goldens remain mandatory non-regression cases. They prove ordinary complete-profile behavior, not fallback coverage.

### 7.2 Sustain matrix

Until a value is authorized, the only positive result is a fail-closed gate proving that no sustain witness executes and no numeric value is inferred from `0.8`, UI constants, names, or fixture coincidence.

After a value is hash-bound, each eligible profile must test the representable values immediately below, exactly equal to, and immediately above its threshold. It must also test inactive/active lifecycle, refinancing enabled/disabled, correct entering-step timing, mutation fields, provenance, unrelated-path stability, and repeated determinism. `NaN`, `+Infinity`, `-Infinity`, non-number, missing value, wrong profile, cross-profile substitution, stale value hash, duplicate declaration, and unauthorized caller injection must follow the chosen value-domain decision. MU must remain ineligible unless a separate normative change explicitly alters it.

### 7.3 Whole-report matrix

For all observations and comparators, mutate source/projected/compatibility/envelope hashes independently; mutate output, provenance, classification, status, attribution path, and attribution before/after independently; add missing, extra, and duplicate paths; reorder semantic arrays; reorder non-semantic map insertion; retain caller aliases; omit recursive freeze; and repeat identical runs. Each mutation must either reject at its owning boundary or produce the one permitted, mechanically derived classification. It must never silently reclassify or repair evidence.

## 8. Claims and adoption gates

After a successful curve-only M1E witness, the permitted claim is narrow: the two declared legacy curve fallback triggers deterministically yield the hash-bound neutral multiplier under the witness boundary. It does not establish that ordinary M0B cases exercise fallback, sustain parity, full reconstructed-core actual-runtime parity, or production adoption.

No final M1E equivalence claim is permitted while sustain ownership is unresolved. Even after final equivalence, runtime adoption is not automatic. The following remain separate gates:

- trust and registration of the versioned contract;
- executable-contract authorization;
- persistence and version migration;
- runtime switch/adoption and rollback;
- production observability and provenance;
- security, resource, and failure boundaries.

M1E evidence is test-support evidence. It must not mutate production registries, profiles, runtime selection, persisted data, or deployment configuration.

## 9. Required decision and subsequent minimal scope

### 9.1 Immediate next scope

The minimum next scope is a read-only sustain ownership decision, not implementation. It must choose fixed profile values, a hash-bound per-execution input, or exclusion of the override from final equivalence; identify the authoritative owner/source; define finite/non-finite policy; and approve timing, mutation, and provenance semantics. Stop if exact RE/CO values are required but no authoritative source is produced.

Curve witness design may be prepared independently, but a “final equivalence complete” report remains blocked.

### 9.2 Conditional M1C amendment after that decision

If the decision chooses fixed profile ownership, the minimal closed schema must add, for RE and CO, an exact numeric value, literal value-source kind, verified source path/identifier, canonical value hash, finite/non-finite policy, strict comparison, timing, mutation fields, and provenance identifier; MU remains `null`. If it chooses per-execution ownership, the schema must instead bind the input schema/version, authorization boundary, canonical input hashing, allowed numeric domain, absence behavior, profile applicability, timing, mutation, and provenance. These alternatives must not coexist as caller-selectable authority.

Parser requirements are exact keys, literals, numeric policy, order, and unknown-key rejection. Semantic validation must compare against a closed authoritative table and reject cross-profile substitution. The compatibility and envelope hash domains must cover the complete declaration; an execution-owned value must additionally enter the observation/execution/report hash chain. Diagnostics must identify absent, ineligible, stale-value, and verified states without treating them as discrepancy classifications.

Fixtures must cover RE, MU, and CO; negative tests must cover every schema leaf, value/hash staleness, non-finite policy, profile substitution, duplicates, order, detachment, recursive freeze, and determinism. Provenance must name the actual value owner, not a test helper.

Only after the ownership decision may an amendment authorize the smallest relevant set among the M1C envelope type, parser/tests, semantic validator/tests, projector, three fixtures, hash/diagnostic tests, and provenance constants. No runtime, M0B, Golden, M1D, UI, manifest, or deployment file is implicitly authorized. Stop on any need to fabricate a value, broaden profile applicability, or change runtime behavior.

## 10. Verification record

The documented full regression ran once over 83 test files: 779 passed, 0 failed, 0 skipped, 0 todo, and 0 cancelled. `npx tsc --noEmit --incremental false` passed. Audit-file whitespace, terminal newline, heading hierarchy, code-fence balance, table-column consistency, repository diff, and exact file scope are verified after creation.

## 11. Final conclusion

**E. BLOCKED — NEW DESIGN DECISION REQUIRED**

Curve fallback is sufficiently and deterministically declared for an M1E-specific witness without reopening M1C. Sustain is not: the current evidence binds that an override mechanism exists for RE/CO, but binds no authoritative override value or value ownership. M1C must not be reopened until that upstream choice is made; afterward, only the sustain-owned contract surface may be amended. No curve-and-sustain atomic amendment is justified.
