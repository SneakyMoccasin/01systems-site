# Domain Model Contract M1D differential execution design and readiness audit

Date: 2026-09-15

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `6719010dd5c06d209e35d9ff0b28bd121930b17d`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Executive conclusion

**READY FOR M1D-2 DIFFERENTIAL HARNESS**

The repository contains a stable legacy reference execution path, locked source cases and output Goldens, and three structurally, semantically and hash-verified M1C projection envelopes. It does **not** contain a native V1 execution path. M1D-2 must therefore add a minimal test-only native-contract interpreter at the engine-algorithm boundary and produce three separate observations from the same immutable source case: legacy reference, pure native, and compatibility-effective candidate.

Primary parity is `legacy reference === compatibility-effective candidate`. A separate attribution comparison, `pure native` versus `compatibility-effective candidate`, must prove the effects of the verified sidecar through fresh, isolated and deterministic counterfactual executions. Permitted mechanisms come only from profile-local declarations; affected downstream output paths come from counterfactual evidence and may bind to a non-empty set of interacting declarations. Readiness means that this isolated harness can now be built and tested without adding native-semantic assumptions. It does not mean that the paths are equivalent, that a native contract is executable in production, or that runtime adoption is permitted. Compatibility declarations must be consumed as a separate verified sidecar; they must never be copied into, inferred as, or hidden inside native V1 semantics or state.

## 2. Verified repository state

Before any file was created, the following read-only checks matched the requested gate exactly:

| Check | Expected | Observed |
|---|---|---|
| Repository | `/Users/christian/Projects/pulse_engine_clean` | Exact match |
| Branch | `decision-flow-demo-v1` | Exact match |
| HEAD | `6719010dd5c06d209e35d9ff0b28bd121930b17d` | Exact match |
| Remote `origin` | `git@github.com:SneakyMoccasin/01systems-site.git` | Exact match |
| Working tree | Clean | Clean |
| Index | Empty | Empty |

`HEAD` is also `origin/decision-flow-demo-v1` and `origin/HEAD`. No repository deviation required an early stop.

## 3. Evidence inspected

### 3.1 Production execution code

| Responsibility | Exact path and relevant export |
|---|---|
| Legacy profile resolver and three profiles | `src/pilotFastighet/executableDomainProfile.ts`: `resolveExecutableDomainProfile`, `getExecutableProfileIdForDomain`, `resolveLegacyCompatibilityProfile`; private frozen `PROFILES` contains `legacy-real-estate-v1`, `legacy-municipal-v1`, and `legacy-consulting-v1` |
| Engine entry point | `src/pilotFastighet/analysis/runCascadeAnalysis.ts`: `runCascadeAnalysis` |
| Engine transition | `src/pilotFastighet/RealEstateEngine.ts`: `RealEstateEngine`, especially `applyDriverDeltas` and `stepForward` |
| Preconfigured execution | `src/pilotFastighet/analysis/runPreconfiguredScenario.ts`: `runPreconfiguredScenario` |
| Scheduled execution | `src/pilotFastighet/analysis/runCascadeAnalysis.ts`: private `runScheduledScenario`; scheduled overload of `runCascadeAnalysis` |
| React/manual facade | `src/pilotFastighet/analysis/reactScheduledAnalysisBoundary.ts`: `createCleanRunSourceSnapshot`, `prepareScheduledFacadeInput`, `runReactAnalysisBoundary`; `src/pilotFastighet/analysis/manualScheduledExecution.ts`: `prepareManualScheduledRunSource` and schedule helpers |
| Initial state | `src/pilotFastighet/domainState.ts`: `createFreshDomainScenarioState`; `src/pilotFastighet/presetRiskMapping.ts`: `defaultRiskState`; `src/pilotFastighet/driverScoreState.ts`: `buildDriverScoreState` |
| Action effects and batching | `src/pilotFastighet/actionEffects.ts`: `ACTION_EFFECTS`; `src/pilotFastighet/analysis/canonicalDriverDeltaBatch.ts`: `combineCanonicalDriverDeltaBatch` |
| Propagation | `src/pilotFastighet/riskPropagation.ts`: `RISK_PROPAGATION`, `propagateRisks` |
| Constraints and lifecycle | `src/pilotFastighet/simulateConstraintsStep.ts`: `simulateConstraintsStep`; `src/pilotFastighet/constraintState.ts`: `createInitialConstraintRegistry` |
| Impacts, curves and fallback | `src/pilotFastighet/computeDimensionMultipliers.ts`: `computeDimensionMultipliers`; `src/pilotFastighet/curveConfig.ts`: `getImpactMultiplier`, `PARAMETER_CURVE_CONFIG` |
| Score clamp/materialization | `src/pilotFastighet/driverScoreState.ts`: `clampDriverScore`, `scoreToRiskLevel`, `materializeRiskStateFromScores` |
| Result construction | `src/pilotFastighet/analysis/cascadeAnalysisProjection.ts`: `createScenarioAnalysisResult`, `compareScenarioTrajectories`; `runPreconfiguredScenario` constructs the equivalent result view |
| Saved-run boundary | `src/pilotFastighet/analysis/savedRunPersistence.ts`; runtime caller `app/pilot-fastighet/page.tsx` |
| Structural observation boundary | `src/pilotFastighet/analysis/structuralObservation/prepareStructuralObservationRun.ts`, `observeCompletedStructuralAnalysis.ts`, and the initiative variants under the same directory |

The production graph is profile-shaped, not native-contract-shaped. `runReactAnalysisBoundary` resolves a legacy `ExecutableDomainProfile`, delegates to `runCascadeAnalysis`, which creates `RealEstateEngine`, which calls propagation, constraint, multiplier, score and result helpers. UI, saved-run and observation consumers sit downstream of the analysis result and are outside the first differential boundary.

Direct and indirect runtime-import ownership is:

- `app/pilot-fastighet/page.tsx` directly imports `runReactAnalysisBoundary` and saved-run helpers; its configured and scheduled calls are the active UI route into analysis.
- `reactScheduledAnalysisBoundary.ts` directly imports `runCascadeAnalysis` and the profile resolver. `manualScheduledExecution.ts`, `configuredRunSource.ts`, scheduled-executive helpers and structural-observation preparation consume that facade or its types.
- `runCascadeAnalysis.ts` directly imports `RealEstateEngine`, `runPreconfiguredScenario`, profile resolution, canonical delta batching and result projection.
- `runPreconfiguredScenario.ts` and structural-observation's `runInitiativeScenario.ts`, `executeInitiativeTransition.ts`, and `runInitiativeScheduledAnalysis.ts` directly construct or drive `RealEstateEngine`; these are alternate production analysis consumers, not independent model implementations.
- `RealEstateEngine.ts` directly imports propagation, constraints, multipliers, score materialization, registry construction and legacy compatibility profile resolution. Those leaf modules import profile types/configuration but do not resolve native V1.
- Renderer, Inspector, presentation, saved-run and observation modules import result/event/state/provenance types or completed outputs. They are downstream observation consumers and do not own engine semantics.
- Files ending in `.test.ts`/`.test.tsx` and `analysis/testSupport/**` are test evidence. M0B support may import production runtime to characterize it; M1B/M1C contract code is imported by tests/test support only. No production file imports `domainModelContractV1/**`.

### 3.2 Existing test support and locked evidence

| Evidence | Exact path |
|---|---|
| Legacy semantic payload projection and fixtures | `src/pilotFastighet/analysis/testSupport/legacyDomainProfileSemanticPayloadV1.ts`; `fixtures/legacy-domain-profile-semantic-payload-v1/*.json` |
| Engine case parser/runner | `src/pilotFastighet/analysis/testSupport/engineOutputProjectionV1.ts`: `parseEngineBaselineInputFixtureV1`, `runEngineBaselineFixtureV1` |
| Six source cases | `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/*.json` |
| Six engine Goldens | `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/*.json` |
| Golden validator/test | `src/pilotFastighet/analysis/testSupport/engineOutputGoldenV1.ts`, `engineOutputGoldenV1.test.ts` |
| Manifest validator | `src/pilotFastighet/analysis/testSupport/domainModelBaselineManifestV1.ts` |
| Baseline manifests | Embedded `manifest` plus `manifestHash` in each `fixtures/engine-output-golden-v1/*.json`; parsed by `domainModelBaselineManifestV1.ts` |
| Structural observation input/Golden | `src/pilotFastighet/analysis/testSupport/fixtures/structural-observation-v2/` and `fixtures/structural-observation-golden-v2/` |
| Structural observation Golden support | `src/pilotFastighet/analysis/testSupport/structuralObservationGoldenV2.ts`, `structuralObservationGoldenV2.test.ts` |

The six engine cases cover neutral and stressed-scheduled execution for every profile. They are suitable immutable source cases for the first differential matrix. Structural-observation Goldens cover only the real-estate small V2 observation and belong downstream of core execution parity.

### 3.3 M1B and M1C test-only contract code

All code below is under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/` and has no production importer:

- M1B contract and validation: `contractV1.ts`, `parseDomainModelContractV1Structure.ts`, `validateDomainModelContractV1Semantics.ts`, `domainModelContractSemanticIdentityV1.ts`, and identity-collision validation.
- M1C adapter: `projectLegacyProfileToDomainModelContractV1.ts` and `legacyProfileProjectionV1.ts`.
- Envelope boundary: `legacyProfileProjectionEnvelopeV1.ts`, structural parser, semantic validator and `hashLegacyProfileProjectionEnvelopeV1.ts`.
- Verified fixture loader: `legacyProfileProjectionEnvelopeV1TestSupport.ts`.
- Three projection fixtures: `fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`, `legacy-municipal-v1.json`, and `legacy-consulting-v1.json`.

The M1C completion audit is `docs/audits/domain-model-contract-m1c-completion-audit.md`; the adapter boundary is `docs/audits/domain-model-contract-m1c-legacy-adapter-design.md`. These establish the four separate hash domains and the rule that M1C remains test-only.

## 4. Current legacy execution architecture

The reference path must be `runEngineBaselineFixtureV1` → `runCascadeAnalysis` → `RealEstateEngine`. The wrapper is appropriate because it parses a closed input fixture and projects the full existing result surface, but the reference semantics remain those of the production functions beneath it.

For each scenario, execution is:

1. Resolve one of the three frozen legacy profiles with `resolveExecutableDomainProfile`.
2. Clone identical risk levels and precise driver scores into a new `RealEstateEngine`; construct an inactive constraint registry at step 0 with margin `1.0`.
3. In scheduled mode, sort actions by `executionStep` and then `actionId`; at the scheduled step combine canonical deltas, clamp scores to `[0,3]`, and materialize risk levels.
4. In `stepForward`, apply margin-based escalation, then iterate propagation to a fixed point in JavaScript object insertion order.
5. Evaluate base multipliers and activate refinancing when enabled and `margin < sustainThreshold`, where a numeric property on `riskState` overrides the profile threshold.
6. Apply active constraint effects, compute erosion and pull-to-baseline, then clamp the next margin to the profile range `[-3,3]`.
7. Store post-transition risk state, exact driver scores, cumulative cascade events, registry and margin. The public trajectory excludes step 0.
8. Construct scenario, baseline, comparison and scheduled-provenance projections.

`LiquidityConstraint`, `CovenantConstraint`, `Custom`, and the `RECOVERING` lifecycle have no public activation/transition in this engine path. They must still be compared as state because unexpected mutation is evidence, but M1D must not invent transitions for them.

## 5. Current native V1 execution readiness

No current function accepts `SemanticallyValidatedDomainModelContractV1`, `HashVerifiedLegacyProfileProjectionEnvelopeV1`, or another verified native V1 value and executes it. `ExecutableDomainProfile` is a legacy production shape with camelCase driver keys, uppercase risk levels, direct impact lists and runtime-specific constraint fields. Native V1 uses its own IDs and declarative semantic payload.

Passing a projected contract to `RealEstateEngine` through a cast would bypass verification, fabricate executability and obscure mapping defects. Reusing `resolveExecutableDomainProfile` on the native side would make the comparison circular. The missing component is therefore a test-only interpreter and observation runner that:

- accepts only the real structurally → semantically → hash-verified M1C envelope brand;
- reads the nested validated native contract as the primary model;
- can execute the nested contract alone for a pure native observation and, in a separate run, receive the separately verified compatibility declarations as sidecar policy for a compatibility-effective observation;
- performs explicit ID/level/dimension/curve/constraint projection at a narrow boundary;
- executes the same algorithm stages without reading the live legacy profile as an oracle; and
- emits three independent, closed observation projections without sharing mutable state between runs.

This is implementable from the locked M1B/M1C data and is precisely the work of M1D-2a. It grants no general executable brand and must not be imported outside test support or tests.

## 6. Exact differential boundary

The controlled input is one parsed `EngineBaselineInputFixtureV1`, augmented only by explicit M1D characterization cases. All three observations must derive from that same immutable source case and receive the same profile identity, horizon, scenario identity, native-declared initial levels and precise scores after verified mapping, actions, execution steps and baseline. Legacy-only input is split into a separate compatibility-input projection before either native run; it is never inserted into pure native state.

The three observations are:

| Observation | Boundary | Permitted model/input source |
|---|---|---|
| Legacy reference | Existing `runEngineBaselineFixtureV1`/`runCascadeAnalysis` | Resolved frozen `ExecutableDomainProfile` |
| Pure native | New M1D test-only executor | Only the hash-verified nested native V1 contract and native-declared source-case projection; no compatibility declaration or legacy-only property |
| Compatibility-effective candidate | A separate fresh run of the same M1D executor | The same hash-verified native V1 contract plus exactly the separately verified M1C compatibility sidecar and compatibility-input projection |

Comparator A, the parity comparator, compares legacy reference with the compatibility-effective candidate and ends at the canonical engine-output projection: every post-transition state, terminal state, histories, comparison and action provenance. Every unresolved difference fails Comparator A; classification or attribution cannot suppress or convert that failure. Comparator B, the compatibility attribution comparator, compares pure native with the compatibility-effective candidate and requires a closed ledger that binds every difference to a non-empty set of verified declaration paths proven by isolated counterfactual runs. These attribution runs are not inputs to Comparator A. React presentation, saved-run serialization and structural observation are downstream consumers and are not allowed to repair or normalize a core discrepancy.

For ID-renamed fields, compare through one explicit bidirectional mapping derived from the verified `driverIdMappings`. The comparison report must retain both native and source IDs. It must reject a missing, duplicate or non-bijective mapping rather than silently omit a field.

## 7. Compatibility application boundary

Compatibility is an execution adapter sidecar, not native contract or native state content. M1D must run two separately instantiated native executions and keep their observations distinct:

1. **Pure native observation:** action effects, propagation, constraints, curves, measures and materialization expressed by `projection.contract.semanticPayload` only. It cannot read compatibility data.
2. **Compatibility-effective candidate observation:** a fresh native execution with only the exact verified declarations in `compatibility` applied at explicit adapter boundaries—ignored unknown deltas, compatibility-only actions, ID mappings, excluded actions, sustain override, legacy propagation order/edges and curve-fallback declaration.

The legacy reference is the third, independently produced observation. No state object, registry, event collection or diagnostic collection may be shared between the three executions.

The harness owns application of legacy propagation evaluation order. It must construct an ordered evaluation plan from `compatibility.propagation.sourceEvaluationOrder`; it must not use native array order, object insertion accident, alphabetical order or fixture representation order as semantic input. Compatibility-only edges are inserted at their declared occurrence positions. Every ordered occurrence must resolve to exactly one native or compatibility edge, or execution stops.

Compatibility-only `congestion_pricing` for MU and CO and RE's ignored delta tuples must be admitted only through their exact declarations. The harness must record whether each action contribution was native-applied, compatibility-applied or compatibility-ignored. It must never synthesize a native zero-effect action or driver.

Comparator B uses **declaration-derived admission**: the permitted mechanism set is derived exclusively from the verified profile-local sidecar before outputs are inspected. Observed output can identify affected paths but can never invent, broaden or repair the admitted declaration set.

Attribution is then proven with fresh, isolated, deterministic counterfactual executions: pure native; full compatibility-effective; when needed, exactly one declaration enabled; and when needed, leave-one-out with exactly one declaration removed from the otherwise complete verified sidecar plan. The runner may derive an execution plan with an explicit active declaration path-set, but it must not mutate the hash-verified envelope or create a new semantic declaration. Every run receives fresh state and may share no registry, event array, diagnostic collection or other mutable object.

Each pure-native/effective difference must bind to a non-empty closed set of verified declaration paths. Use one path when counterfactual evidence proves a unique cause. Multiple paths are valid only when isolated and leave-one-out runs prove their interaction, including downstream chains such as action → propagation, propagation → constraint, or constraint → margin. The report records the exact activated declaration path-set for every attribution run, profile, source/native IDs, scenario, step and counterfactually observed affected output paths. Unattributed, superfluously attributed, wrong-profile, wrong-step or unproven ambiguous differences fail; so does an admitted declaration expected to affect the case but missing its declared effect. This allowance never applies to Comparator A.

## 8. Three-profile execution matrix

### 8.1 Required case matrix

| Profile | Locked neutral | Locked stressed/scheduled | Required M1D characterization additions |
|---|---|---|---|
| Real Estate (`legacy-real-estate-v1`) | Existing M0B input and engine Golden | Existing M0B input and engine Golden | sustain finite/non-number/`NaN`/±`Infinity`; ignored `implementationPacingRisk` and `liquidityPressure`; liquidity compatibility edges; propagation-order witness; margin escalation; clamp boundaries; missing/unsupported curve witness |
| Municipal (`legacy-municipal-v1`) | Existing M0B input and engine Golden | Existing M0B input and engine Golden | `sustainThreshold` absence/null and disabled refinancing; compatibility-only `congestion_pricing`; three-edge propagation subset; no margin escalation; clamp boundaries; missing/unsupported curve witness |
| Consulting (`legacy-consulting-v1`) | Existing M0B input and engine Golden | Existing M0B input and engine Golden | sustain finite/non-number/`NaN`/±`Infinity`; compatibility-only `congestion_pricing`; liquidity compatibility edges; propagation-order witness; margin escalation; clamp boundaries; missing/unsupported curve witness |

Every matrix cell produces all three primary observations and runs both Comparator A and Comparator B. Comparator B adds declaration-isolated and leave-one-out attribution runs wherever unique or interacting causality cannot otherwise be proven. M1D-2a establishes the protocol with the neutral RE witness and at least one isolated compatibility effect; the complete profile combination and interaction matrix belongs to M1D-2b/M1D-3. Characterization additions should initially be inline closed test vectors or a new M1D input-fixture family. They are not Goldens until Comparator A is clean and Comparator B's closed compatibility evidence has been reviewed.

### 8.2 Per-case assertions

Every row above must compare:

- derivation from the same immutable source case, with exact native-declared initial state and driver scores after verified ID/level mapping;
- absence of every legacy-only property from pure native state and from the native semantic payload;
- separate compatibility input/observation for legacy-only values such as `sustainThreshold`, consumable only by the compatibility-effective run;
- identical action IDs, occurrences, canonical same-step ordering, delta contribution order and execution times;
- identical horizon and post-transition step numbering;
- driver score and materialized risk trajectory at every step;
- per-action native, compatibility and ignored effects;
- native propagation occurrences, compatibility-only occurrences, fixed-point iterations and declared legacy evaluation order;
- constraint eligibility, activation comparison, activation step, full registry and active multiplier effects;
- lifecycle transitions actually reachable in the reference path;
- base/adjusted multipliers needed to explain Structural Margin, if exposed by the test executor;
- Structural Margin trajectory, escalation decisions, raw pre-clamp margin and final clamp result;
- terminal state, cascade diagnostics/events, scenario comparison and action provenance; and
- three byte-stable primary observation reports, byte-stable attribution-run observations with their exact activated declaration path-sets, two byte-stable comparator reports and identical replay over repeated fresh executions.

The existing engine Goldens can directly anchor the six legacy observations. The existing semantic and projection fixtures anchor inputs and identities, not execution parity. New differential baselines are needed for the three observations, both comparator reports, stage-level diagnostics, sustain behavior, compatibility-only actions/edges, propagation-order witnesses and fallback hits. Structural-observation Goldens may be used later as downstream non-regression evidence, not as substitutes for the three-profile engine matrix.

## 9. Output comparison contract

The proposed output must contain three closed `DifferentialExecutionObservationV1` values—`legacyReference`, `pureNative`, and `compatibilityEffectiveCandidate`—plus two separately typed comparator results. Each observation should include:

| Field family | Comparison |
|---|---|
| Input identity and four M1C hashes | Exact string equality |
| Horizon, schedules and execution timing | Exact structural equality |
| Driver scores per step | Exact `Object.is`-aware numeric equality after ID mapping |
| Materialized risk levels | Exact equality after explicit level and ID mapping |
| Native action ledger | Exact ordered equality where applicable; pure native contains no compatibility entries |
| Compatibility input and effect ledger | Absent from pure native; exact, declaration-bound and ordered in the effective observation |
| Propagation ledger | Exact ordered equality including source, target, level, iteration and delay |
| Constraint registry/lifecycle | Exact equality including activation/update steps |
| Multipliers and margin calculation terms | Exact binary64 equality where both execute the same expression order |
| Margin trajectory, Structural Margin and terminal margin | Exact binary64 equality by default |
| Terminal state and derived histories | Exact canonical structural equality |
| Scheduled provenance | Exact ordered equality |
| Observation diagnostics | Exact code/path/profile/case/step/stage ordering and explicit native/compatibility ownership |

**Comparator A — parity:** compare `legacyReference` with `compatibilityEffectiveCandidate` after the verified ID/level projection. It must retain both values and every difference, not only a Boolean. Every difference is unresolved for parity and fails, regardless of classification. A preliminary classification—`adapter-error`, `contract-error`, `compatibility-rule`, `known-explicitly-deferred`, `possible-legacy-runtime-defect`, or `unresolved-design-decision`—is evidence metadata only and can never hide, allow or downgrade a Comparator A failure. Curve fallback remains separately reported as M1E-deferred, but any fallback-related legacy/effective mismatch still fails Comparator A for M1D parity.

**Comparator B — compatibility attribution:** compare `pureNative` with `compatibilityEffectiveCandidate`. Before inspection of output differences, derive the closed permitted-mechanism set only from the verified profile-local sidecar. Do not attempt to derive the complete downstream output-path list statically from declaration metadata. Instead, prove affected output paths through deterministic counterfactual execution: the two primary native runs, plus single-declaration and leave-one-out runs when needed. These test-only runs use fresh isolated state, report the exact activated declaration path-set, never modify the verified envelope, and never participate in Comparator A.

Each accepted difference binds a non-empty closed set of declaration paths, profile, source/native IDs, scenario, execution step and the counterfactually observed affected output paths. A unique path is required where unique causality is proven. Multiple paths are allowed only where isolated and leave-one-out evidence proves a real interaction. Unattributed, superfluous, wrong-profile, wrong-ID, wrong-step or unproven ambiguous attribution fails. A permitted declaration expected to affect the controlled case but producing no declared effect also fails. Accepted entries are `explicit-compatibility-evidence`, not unresolved discrepancies and not native semantics.

The combined report must preserve all three primary observations, every counterfactual observation and activated declaration path-set, both comparator results and the closed attribution ledger. No reviewed allowlist or attribution may excuse Comparator A. Comparator B's declaration-derived permitted mechanisms with counterfactually proven affected paths, and M1E's separately identified fallback evidence, are the only non-equality categories; neither permits runtime adoption.

## 10. Determinism and numeric comparison rules

No numeric tolerance is currently justified. All three executions run in the same JavaScript runtime from projections of the same immutable source case and can preserve the same arithmetic operation order. Exact binary64 comparison is required for scores, amplitudes, multipliers, erosion terms and margins. Treat `NaN` as equal only to `NaN` for diagnostic comparison via `Object.is`; distinguish `0` from `-0`; compare infinities exactly. JSON canonicalization cannot represent non-finite characterization values, so those cases must remain in-memory and must never enter JSON fixtures or hashes.

If the independent interpreter necessarily changes arithmetic association, that is an unresolved design decision, not an automatic epsilon. Any future tolerance requires a separate reviewed contract specifying fields, absolute/relative rule, bound, rationale and counterexamples. Identity, enums, order, steps, levels, hashes and provenance can never use tolerance.

Determinism evidence requires at least two fresh-process executions of every case, equality of all three full primary observations, every required single-declaration/leave-one-out observation, exact activated declaration path-sets, both comparator reports and their canonical hashes. Each attribution run starts from fresh isolated state and shares no registry, events or other mutable objects. Mutation tests reverse native set-like arrays without changing pure-native or compatibility-effective results, counterfactual attribution, compatibility-owned execution order or Comparator A parity.

## 11. `sustainThreshold` runtime investigation

The actual runtime read is in `src/pilotFastighet/simulateConstraintsStep.ts`:

```text
rawThreshold = riskState.sustainThreshold
threshold = typeof rawThreshold === "number"
  ? rawThreshold
  : profile.constraints.refinancingMarginThreshold ?? 0.8
activate when refinancing is enabled and margin < threshold
```

Consequences to prove by execution:

- RE and CO enable refinancing and their M1C sidecars declare the source-local override. Finite numbers replace native `0.8`; a non-number falls back to `0.8`; `NaN` makes the strict comparison false; `+Infinity` makes every finite margin eligible; `-Infinity` makes no finite margin eligible.
- MU disables refinancing and has a `null` declaration, so no sustain override may be applied even if a malicious test input supplies the property.
- Activation is checked against the margin entering the step, before that step's new margin is calculated. `step` starts at 0, so first-step activation records step 0.
- Once active, this runtime path does not recover or deactivate refinancing.

Native V1 owns only its declared `0.8` constraint threshold. Before any state mutation, the pure-native and effective calculations must be kept separate:

```text
nativeDeclaredThreshold = 0.8
nativeEligibility = refinancingEnabled && margin < nativeDeclaredThreshold
effectiveCompatibilityThreshold = verified source-local override
  when the profile declaration permits it; otherwise nativeDeclaredThreshold
effectiveEligibility = refinancingEnabled && margin < effectiveCompatibilityThreshold
```

`nativeEligibility` is recorded only in the pure-native observation and may drive only the pure-native run's independently owned registry. It must never activate, mutate or otherwise influence compatibility-effective candidate state. Only `effectiveEligibility` may drive the compatibility-effective candidate's constraint transition. The effective observation records both thresholds, both predicate results for attribution, the declaration source path and the transition actually selected; recording the native predicate there is diagnostic evidence, not a prior mutation.

For MU, `sustainThresholdOverride` must be `null`, the effective threshold remains native `0.8`, and refinancing remains disabled. A caller- or state-injected `sustainThreshold` must be rejected before execution; ignoring is permitted only if the closed compatibility-input parser explicitly classifies and proves the value unreachable, but rejection is the recommended fail-closed rule. It can never become native state or semantics.

Legacy-only `sustainThreshold` is held solely in the separately verified compatibility input/observation. Neither the native semantic payload nor pure-native state may gain that field. A parity result using the override is compatibility-effective parity, not proof that native V1 contains `sustainThreshold` semantics.

## 12. Propagation-order investigation

`propagateRisks` iterates `Object.entries(propagationRules)` and each target array in insertion order inside a fixed-point loop. Final risk levels may be order-insensitive for the current monotone raise-only rules, but event order, event iteration and downstream diagnostics are order-sensitive. Thus terminal-state equality alone cannot prove parity.

The native contract's set-like collections remain order-neutral. Pure-native execution must derive a deterministic traversal from canonical native edge identities solely as an execution mechanism, without treating source array order as contract semantics. Compatibility-effective execution separately reconstructs legacy order from the verified sidecar. The M1D executor must:

1. validate/hash the envelope through the existing M1B/M1C progression;
2. index native edges by their declared identities without assigning array meaning;
3. build that complete ordered legacy plan only for the compatibility-effective run, from `sourceEvaluationOrder` and declared positions;
4. splice compatibility-only edges through their declared occurrence positions and verify endpoint evidence;
5. execute that plan only in the compatibility-effective run while recording whether every occurrence is native or compatibility-owned; and
6. reject missing, extra, duplicated, ambiguous or cross-profile references before stepping.

Tests must permute all M1B-defined set-like native collections and prove unchanged execution, then mutate only the compatibility order and prove either a rejected verified envelope or an observable ordered-event difference in a deliberately constructed witness. No array order becomes native semantics.

## 13. Curve-fallback boundary to M1E

The legacy behavior is in `getImpactMultiplier`: missing curve configuration returns `1`; an unsupported curve discriminant reaches the `default` branch and also returns `1`. M1C declares `legacy-neutral-multiplier-v1` with `neutralMultiplier: 1` and evidence status `deferred-to-m1e`.

M1D may instrument all relevant observations to record `curve-fallback-hit` with profile, driver, reason, step and observed multiplier. It may classify the evidence as `known-explicitly-deferred` for M1E. It must remain separate from Comparator B compatibility attribution unless an exact verified sidecar declaration accounts for the hit, and it cannot excuse a Comparator A mismatch. M1D must not change policy, add fallback to native V1, claim equivalence, bless a new Golden, or switch runtime.

M1E owns the empirical fallback matrix, the decision to preserve or replace the policy, any contract versioning that follows, and the final equivalence boundary. A fallback hit does not block collecting the rest of M1D evidence, but unresolved fallback blocks any completion claim that includes fallback equivalence and blocks runtime adoption.

## 14. Proposed test-only file scope for implementation

M1D-2 should be limited to a new directory such as `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/`:

| Proposed file | Purpose |
|---|---|
| `differentialExecutionV1.ts` | Closed primary/counterfactual observation types, activated declaration path-sets, two comparator contracts and fail-closed results |
| `executeVerifiedNativeProjectionV1.ts` | Minimal interpreter with isolated pure-native and compatibility-effective entry points accepting only hash-verified M1C envelopes |
| `buildLegacyCompatibilityExecutionPlanV1.ts` | Separate, explicit compatibility sidecar application and ordered propagation plan |
| `runCompatibilityCounterfactualV1.ts` | Fresh single-declaration and leave-one-out attribution runs without envelope mutation |
| `runDomainModelDifferentialV1.ts` | One immutable source case, three primary executions, optional counterfactual executions, Comparator A/B and complete report |
| `domainModelDifferentialV1.test.ts` | Three-profile matrix, primary parity, counterfactual compatibility attribution and determinism |
| `domainModelDifferentialV1.negative.test.ts` | Mutation, rejection and discrepancy classification |
| `fixtures/` only if reviewed in M1D-2b/3 | New differential inputs and later reviewed baselines; never overwrite M0B/M1B/M1C files |

Exact filenames may be split for maintainability, but all imports must remain test-only. Production files, existing fixtures, Goldens, manifests, profiles, parsers, canonicalizers and hash functions must remain unchanged. The harness must reuse the existing verification and canonicalization functions rather than copy them.

## 15. Required negative and mutation tests

The harness must fail closed for:

- raw, structural-only or semantic-only values supplied where a hash-verified envelope is required;
- any source, projected, compatibility or envelope hash mismatch;
- identity/profile/domain mismatch between case and envelope;
- unknown/missing/duplicate/non-bijective driver mapping or level mapping;
- native edge endpoints not declared as native drivers;
- compatibility edge/order occurrence missing, duplicated, shifted or resolving ambiguously;
- compatibility data injected into the native semantic payload;
- compatibility-only input or state present in the pure-native observation;
- undeclared gap action/delta/driver, or compatibility action admitted for the wrong profile;
- `sustainThreshold` applied for MU or without the exact non-null declaration; injected into native state/payload; or used to mutate effective state through `nativeEligibility` before `effectiveEligibility` is selected;
- non-finite JSON numbers, while retaining explicit in-memory JavaScript characterization cases;
- invalid action step, horizon, duplicate schedule action, unsupported action or caller-supplied deltas;
- non-finite driver delta, absent precise score, clamp boundary mutation or materialization threshold mutation;
- curve owner/kind/parameter/amplitude mismatch and fallback hit without a deferred diagnostic;
- arithmetic, lifecycle, event-order, terminal-state, diagnostic or provenance mismatch;
- every Comparator A difference, including a classified or fallback-related difference;
- Comparator B admission invented from observed output; an empty attribution set; or an unattributed, superfluously attributed, wrong-profile, wrong-source-path, wrong-ID, wrong-step, collateral or unproven ambiguous effect;
- multiple declaration paths attributed without single-declaration and leave-one-out evidence of interaction, or an expected admitted mechanism that produces no declared effect;
- an attribution run that omits or misreports its exact activated declaration path-set, participates in Comparator A, or mutates the hash-verified envelope;
- reuse or sharing of mutable state between legacy, pure-native, compatibility-effective or counterfactual executions;
- mutation of inputs or verified envelopes by either runner;
- nondeterministic repeated output, including native set-like permutations; and
- attempts by production, UI, persistence or observation modules to import M1D test support.

A deliberately seeded Comparator A discrepancy for each classification code must prove that classification never suppresses failure. Comparator B must separately seed each attribution failure, unique cause and proven multi-declaration interaction; prove that admitted mechanisms are declaration-derived while downstream paths are counterfactually observed; and prove every attribution run isolated and deterministic. There must also be a test proving that a new Golden cannot be generated or accepted while Comparator A has any difference or Comparator B has any unattributed or incorrectly attributed difference.

## 16. Stop conditions

### 16.1 Before M1D-2 implementation

Stop without implementation if repository identity/status differs; any of the three envelopes fails the real structural, semantic or hash progression; a required M0B case/Golden/manifest is missing or mutated; the proposed code must alter production or prior evidence; or compatibility order cannot be resolved uniquely from the verified declaration.

### 16.2 During differential implementation

Stop the affected checkpoint on any Comparator A difference; any Comparator B difference without a non-empty counterfactually proven verified declaration path-set; an admitted mechanism invented from output; an unproven multi-declaration interaction; a missing expected declaration effect; an unclassified discrepancy; circular native execution through the legacy profile resolver; fabricated brand/cast as proof; alternate canonicalizer/hash; hidden tolerance; native-contract/state contamination by compatibility; mutation through the wrong sustain predicate; shared mutable state; nondeterministic attribution; envelope mutation; an attribution run entering Comparator A; or an attempted Golden update before review. Report the exact observation pair, profile, activated declaration path-set, case, scenario, step, stage, mapped IDs and both values.

### 16.3 Before any runtime adoption

Runtime adoption remains prohibited until all three profiles and required cases have Comparator A equality and closed Comparator B attribution; every discrepancy is resolved or explicitly versioned outside this parity claim; M1E resolves fallback; completion audit passes; production trust/registry/executability and persistence boundaries receive their own authorization; and UI, ingestion, deployment and migration plans are separately reviewed. M1D completion alone cannot authorize a switch.

## 17. Deferred work

The following are outside M1D-1 and remain deferred:

- implementation of the native test-only interpreter and comparator;
- creation and review of differential fixtures/Goldens;
- resolution of any discovered adapter, contract, compatibility or legacy defect;
- M1E fallback evidence and policy;
- trusted registration or general native executability;
- runtime, persistence, saved-run, observation, external-ingestion or UI adoption;
- historical-case completion, deployment and Vercel interaction.

Saved-run and structural-observation outputs may be checked only after core engine parity is established. They must remain separate downstream checkpoints so serialization or observation projection cannot conceal an engine discrepancy.

## 18. Recommended checkpoint sequence

Repository evidence supports the proposed sequence with one clarification: M1D-2a must establish the native interpreter and stage-level observation contract before broad three-observation baselines.

1. **M1D-1 — this design/readiness audit.** No execution implementation.
2. **M1D-2a — minimal test-only boundary.** Verify/load one real envelope through existing stages, construct separate pure-native and compatibility-effective inputs, execute all three primary observations for one neutral RE witness, and establish fail-closed Comparator A/B behavior with at least one isolated compatibility effect. Prove the fresh-state, exact-path-set counterfactual protocol; exhaustive combinations are not required here.
3. **M1D-2b — three-profile matrix.** Run all six M0B cases with all three primary observations; add reviewed compatibility, sustain, propagation, escalation and clamp witnesses; expand single-declaration and leave-one-out coverage for combinations/interactions; require legacy/effective parity and retain failures rather than rewriting expectations.
4. **M1D-3 — determinism and adversarial evidence.** Complete the interaction matrix, fresh-process replay, set-like permutations, negative/mutation matrix, Comparator A classifications, counterfactually closed Comparator B attribution and reviewed differential baselines only after both comparators pass.
5. **M1D completion audit.** Confirm actual execution coverage and unresolved/deferred inventory. Projection or hash equality alone is insufficient.
6. **M1E — curve-fallback evidence and final equivalence boundary.** Resolve missing/unsupported curve policy before any adoption proposal.

If M1D-2a reveals that the native declarative semantics are insufficient to implement a stage without importing legacy behavior, stop and classify that gap as a contract error or unresolved design decision. Do not fill it with an implicit default.

## 19. Final readiness verdict

**READY FOR M1D-2 DIFFERENTIAL HARNESS**

The exact next authorized work is a minimal, isolated, test-only native execution boundary producing legacy-reference, pure-native and compatibility-effective observations, with fail-closed primary parity and declaration-admitted, counterfactually proven compatibility attribution. Attribution runs use fresh isolated state, report exact activated declaration path-sets, remain outside Comparator A and cannot modify the verified envelope. Repository evidence supports this model without new native-semantic assumptions or contamination, so READY remains justified. There is no native runtime path today, no equivalence claim, and no authorization for production imports, runtime adoption, persistence, trust, registry, UI, external ingestion, deployment, staging, commit or push.
