# Domain Model Contract M1C-1 — legacy inventory and adapter-envelope design

Date: 2026-09-14

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `657ba00144eac9d9216125b4d54aaf741bd612a5`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Conclusion

**READY FOR M1C-2 LEGACY ADAPTER ENVELOPE.** The current implementation is sufficiently characterized to implement a strict, test-only envelope, parser and validator without a further product decision. This does not authorize projection fixtures (M1C-3), execution, a trusted registry, persistence adoption, external ingestion or a runtime switch.

The final ID audit proves every proposed native ID against unchanged M1B regex `^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$`: 12 camelCase drivers and source domain `realEstate` have explicit mappings; six already-valid drivers and all source action IDs are retained; generated curve/edge IDs use only projected or adapter-local StableIds. A read-only mechanical check found zero invalid IDs and no within-namespace collision. Identical text across different typed namespaces (for example driver and action `transit_signal_priority`) is permitted and is not an ID collision.

Three legacy exception families must be data in the envelope, never native V1 semantics: six action/unknown-driver tuple occurrences over four distinct undeclared driver IDs; three profiles' ordered propagation projections, including three edge definitions through `liquidityPressure` occurring once in each of Real Estate and Consulting (six profile-bound edge occurrences); and the optional numeric `riskState.sustainThreshold` input override. Municipal and Consulting `congestion_pricing` additionally need a closed compatibility-only action declaration because removing both unknown-driver effects would leave a native-invalid zero-effect action. Structural Margin is exactly expressible by the closed native V1 named-measure model and needs no new measure kind. Curve fallback may be declared only as deferred compatibility evidence; its numeric proof remains M1E work.

## 2. Preconditions and evidence status

The precheck passed before this file was created. The repository path, branch, HEAD and remote equal the values above; the working tree was empty; and checkpoints `7ef12d3dd38d89dcf145b6cf42c11eaf0077fe69`, `b73183408071bd583dafefb2a502cf819ea84b79`, `b172434e45acbbcc69bb656ed45cc803a9eeba2f`, `14ece8113965e29fc9329e730f1ac74de476c083`, `9146ad8e8660787aa87573d74d03b993bd28a870` and `657ba00144eac9d9216125b4d54aaf741bd612a5` are all ancestors of HEAD.

The required M1A, M1B completion, M0B completion, Golden-gap and readiness audits were read. Runtime evidence was traced through `executableDomainProfile.ts`, `actionEffects.ts`, `presetRiskMapping.ts`, `impactContract.ts`, `curveConfig.ts`, `computeDimensionMultipliers.ts`, `driverScoreState.ts`, `riskPropagation.ts`, `constraintState.ts`, `simulateConstraintsStep.ts`, `RealEstateEngine.ts`, `runCascadeAnalysis.ts` and initiative execution. Test-support evidence was traced through the M0B semantic projection, algorithm assumptions, six engine Goldens and the Structural Observation/persistence Golden. `VERIFIED` below means directly observed in source or fixture; `INFERRED` is a necessary consequence; `DESIGN` is the M1C contract proposed here.

## 3. Exact identities and source hashes

| Profile | Domain | Model / calibration | M0B source semantic payload SHA-256 |
|---|---|---|---|
| `legacy-real-estate-v1` | `realEstate` | `pilot-fastighet-v0.4` / `legacy-global-v1` | `898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` |
| `legacy-municipal-v1` | `municipal` | `pilot-fastighet-v0.4` / `transport-causal-subset-v2` | `81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` |
| `legacy-consulting-v1` | `consulting` | `pilot-fastighet-v0.4` / `legacy-global-v1` | `b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` |

These were independently re-derived from each checked-in readable M0B fixture and from a fresh `projectLegacyDomainProfileSemanticPayloadV1` result by the existing M0B test. Both paths use only `canonicalizeBaselineValueV1` and `hashBaselineValueV1`; the test asserts both hashes equal the literals. M1C-3 must repeat both paths and must not copy the literal into the computed path.

## 4. Full ownership and projection matrix

Profile abbreviations are RE, MU and CO. “All” means each of those three exact identities, not future profiles.

| Value or rule; exact source/symbol | Profiles | Current owner and runtime effect | M0B coverage | Future owner / native V1 representation | Envelope or exclusion; unresolved? |
|---|---|---|---|---|---|
| four identity strings; `executableDomainProfile.ts::PROFILES`, `createLegacyProfile` | All | profile-owned; resolver and provenance compatibility | semantic fixtures/hashes and engine manifests | contract `identity` plus envelope source/projected identities | envelope binds exact source; none unresolved |
| applicable driver order/set; `LEGACY_EXECUTABLE_CONTRACT.applicableDrivers` from `REAL_ESTATE_IMPACT_CONTRACT` | All | profile-owned; delta validation and state vocabulary | semantic fixture; 18-key engine inputs | `semanticPayload.drivers[]` through exact 18-entry source→projected mapping; canonical by projected `driverId` | no exception, except adapter-local propagation node below |
| default `MODERATE` for all 18; `presetRiskMapping.ts::defaultRiskState` | All | profile-owned clone; profile default and fallback run input | semantic fixture and neutral Goldens | each driver `initial:{levelId:"moderate",score:1}` | no exception |
| global four levels, score anchors `0,1,2,3`, clamp `[0,3]`, bands `<=0.5`, `<1.5`, `<2.5`, otherwise severe; `driverScoreState.ts` symbols | All | global runtime semantics; delta application/materialization | algorithm assumption plus engine Goldens; boundaries partly focused | ordinal scale with exact binary64 successor boundary `0.5000000000000001`; section 4.1 | no envelope exception because exact native representation is proven |
| all 15 effects; `actionEffects.ts::ACTION_EFFECTS` | All source payloads | profile-owned clone of global registry; scheduled path exposes only domain-supported subset | semantic fixture contains every delta; engine Goldens avoid gap actions | supported actions with at least one modeled effect become native `actions[]`; effects canonical by driver | excluded unsupported IDs, six ignored tuples and two compatibility-only action occurrences are exhaustive |
| supported subsets; `actionEffects.ts::DOMAIN_ACTIONS` | RE 8, MU 7, CO 10 | global domain mapping; validation/execution admission | exact semantic fixtures/counts | native actions are source support minus compatibility-only actions; native schema has no support list | source payload hash plus exhaustive support/exclusion inventories; no redundant support-set hash |
| impact mappings; `impactContract.ts::REAL_ESTATE_IMPACT_CONTRACT`, cloned into executable legacy contract | All | profile-owned; multiplies/divides four dimensions | semantic fixtures, output Goldens | driver `impacts[]` with dimension, direction, curve ID | labels/groups excluded as presentation; no unresolved semantic value |
| curve instances; `curveConfig.ts::PARAMETER_CURVE_CONFIG` | All | profile-owned clone; supplies curve kind/amplitudes | semantic fixtures and transitive output Goldens | native `curves[]`, one driver-owned instance each | valid curves project exactly |
| exponent `1.2`, logistic `k=0.8,x0=3`; `resolveExponential`, `resolveLogistic` | All | global runtime calibration | algorithm assumption/transitive Goldens | explicit native curve parameters | no exception |
| numeric interpolation between score floor/ceil; `getImpactMultiplier` | All | global protocol semantics | transitive Goldens | `pulse-domain-engine-protocol-v1` | no exception |
| missing config and unsupported discriminant return `1`; `getImpactMultiplier` | All possible legacy calls | global silent fallback | explicitly not focused by M0B | native V1 rejects | envelope reserves deferred declaration; M1E proof still required |
| dimension neutral `1`, ordered driver fold, increase=`*`, decrease=`/`; `computeDimensionMultipliers` | All | global runtime semantics | transitive Goldens | dimensions with neutral 1; protocol operators/order | no exception |
| propagation relationships; `riskPropagation.ts::RISK_PROPAGATION`, municipal filter in `executableDomainProfile.ts` | RE/CO full 20, MU exact 3 | profile-owned edge selection; global fixed point mutates state/emits events | semantic fixtures and cascade hashes | native edges where both endpoints declared | ordered compatibility projection required; 3 definitions × RE/CO = 6 liquidity edge occurrences; see section 8 |
| adverse trigger sets: risk=`HIGH,SEVERE`, benefit=`LOW`; `impactContract.ts::DEFAULT_ADVERSE_PROPAGATION_LEVELS`, `getPropagationTriggerLevels` | All | global lookup by source polarity, unknown defaults to risk | assumption/transitive Goldens | each driver `adverseLevelIds` and edge `triggerLevelIds` | no silent fallback in native projection |
| severity order, do/while fixed point, event `iteration`, `step=iteration+1`, `delaySteps=1`; `propagateRisks` | All | global protocol; order-observable events | algorithm assumption and cascade hashes | engine protocol except legacy edge order | insertion order declared in envelope |
| constraint registry four entries initially inactive, `lastUpdatedStep=0`; `constraintState.ts::createInitialConstraintRegistry` | All | global registry shape; every public engine run constructs/resets this state | assumptions and constraint-history hashes | only reachable profile constraint semantics project natively | Liquidity/Covenant/Custom are declared excluded source values; restored snapshots are display/compare only and never engine input |
| refinancing enabled and threshold `0.8`; `LEGACY_EXECUTABLE_CONTRACT.constraints`, MU override | RE/CO enabled, MU disabled | profile-owned activation policy | semantic fixture and constraint histories | constraint activation predicate `measure-below` 0.8; omit definition for MU or use no activatable constraint | optional override is legacy-only, section 6 |
| active effects: refinancing cost `1.15`, recovery `0.8`; liquidity cost `1.1`, load `1.05`; covenant recovery `0.6`; same source | All | profile-owned values; only refinancing is reachable from current public execution | semantic fixture; refinancing exercised, Liquidity/Covenant activation absent | RE/CO refinancing projects natively; MU disabled refinancing and all Liquidity/Covenant effects do not | exact excluded-source declarations; never fabricate activation predicates |
| one-way refinancing `INACTIVE/RECOVERING -> ACTIVE`, activation stamps current step; no deactivation/recovery; `simulateConstraintsStep` | RE/CO; MU disabled | global lifecycle semantics | output Goldens | activation, sustain `until-explicit-transition`, deactivation `none`, allowed transitions to active | no exception |
| Structural Margin baseline `1`, update weights `1.2,1.1,0.45,0.8`, recovery pull `0.12`, clamp `[-3,3]`; `RealEstateEngine` | All | mixed global/profile; produces every margin | exact margin-history hashes, transitive component coverage | one native named measure; section 7 | exact native projection; no compatibility kind |
| `sensitivity=1.2` property passed to but unread by `simulateConstraintsStep` | All | global dead value; no runtime effect | recorded algorithm assumption but cannot affect outputs | no native semantic representation | envelope `excludedSourceValues` diagnostic; excluded as non-effectful execution residue |
| margin escalation below `-1`: interest rate LOW→MODERATE, MODERATE→HIGH; `LEGACY_EXECUTABLE_CONTRACT.marginEscalationRules`; MU empty | RE/CO, not MU | profile-owned; before propagation | semantic fixtures and output Goldens | named measure escalation rule/transitions | exact native projection |
| step order: escalate, propagate, constraints, base dimensions, erosion/recovery/clamp, state write; `RealEstateEngine.stepForward` | All | global protocol | engine Goldens | `pulse-domain-engine-protocol-v1` | must be asserted, not stored as arbitrary formula |
| action batching before each engine step; `canonicalDriverDeltaBatch.ts`, `executeInitiativeTransition.ts`, `runCascadeAnalysis.ts` | All | global execution semantics | surface parity and engine Goldens | engine protocol/execution input | excluded from contract and envelope semantic payload |
| horizon, initial override, schedules, initiative IDs, prerequisites/resources | per run | execution/observation input | M0B engine and Structural Observation Goldens | remains execution/observation-owned | excluded |
| labels, groups, colors, copy | All | presentation only | deliberately absent from semantic fixtures | optional native metadata only | excluded from envelope semantic identity |
| registry trust, selected profile, saved-run serialization | All | runtime/persistence | persistence Golden | later trusted registration/persistence layer | forbidden in M1C |

### 4.1 Exact driver, impact and curve inventory

All profiles share these 18 applicable drivers, initial `MODERATE`/score `1`, range `[0,3]`, and the exact curves below. Amplitude columns are `LOW/MODERATE/HIGH/SEVERE`; `MODERATE` is legacy `base`.

Native V1's half-open non-final bands represent the legacy comparisons exactly under JavaScript binary64 semantics: LOW `[0,0.5000000000000001)`, MODERATE `[0.5000000000000001,1.5)`, HIGH `[1.5,2.5)`, SEVERE `[2.5,3]`. The JSON number `0.5000000000000001` is the immediate binary64 successor of `0.5` (`nextUp(0.5)`); no representable runtime number exists strictly between them. Consequently LOW includes exactly `0.5`, while its exclusive native upper endpoint excludes the next possible score, with no epsilon approximation. M1C-3 must test `0.5 → LOW`, `0.5000000000000001 → MODERATE`, the predecessor/current/successor around `1.5` (`1.4999999999999998/1.5/1.5000000000000002`) and around `2.5` (`2.4999999999999996/2.5/2.5000000000000004`), after the same `[0,3]` clamp. This is solution A and needs no legacy compatibility field.

| Exact source driver ID | Projected native StableId | Polarity; impacts (`+` multiply, `-` divide) | Curve; amplitudes |
|---|---|---|---|
| `demandRisk` | `demand-risk` | risk; `+load` | linear; `.9/1/1.15/1.3` |
| `pricingPowerRisk` | `pricing-power-risk` | risk; `+load` | linear; `.9/1/1.15/1.3` |
| `tenantStabilityRisk` | `tenant-stability-risk` | risk; `+load,-recovery` | linear; `.9/1/1.2/1.35` |
| `maintenanceIntensityRisk` | `maintenance-intensity-risk` | risk; `-recovery` | linear; `.95/1/1.15/1.3` |
| `operationalEfficiencyRisk` | `operational-efficiency-risk` | risk; `+cost,-recovery` | linear; `.9/1/1.2/1.4` |
| `energyExposureRisk` | `energy-exposure-risk` | risk; `+cost` | linear; `.95/1/1.2/1.35` |
| `interestRateExposureRisk` | `interest-rate-exposure-risk` | risk; `+cost` | exponential exponent `1.2`; `.9/1/1.4/1.9` |
| `leverageLevelRisk` | `leverage-level-risk` | risk; `+cost,+sensitivity` | exponential exponent `1.2`; `.9/1/1.6/2.3` |
| `refinancingRisk` | `refinancing-risk` | risk; `+cost` | logistic `k=.8,x0=3`; `.97/1/1.18/1.35` |
| `marketVolatilityRisk` | `market-volatility-risk` | risk; `+load` | linear; `.95/1/1.2/1.4` |
| `regulatoryPressureRisk` | `regulatory-pressure-risk` | risk; `+cost` | linear; `.95/1/1.25/1.5` |
| `capitalCommitmentRigidityRisk` | `capital-commitment-rigidity-risk` | risk; `-recovery` | linear; `.95/1/1.15/1.3` |
| `accessibility` | `accessibility` | benefit; `-load,+recovery` | linear; `.98/1/1.04/1.08` |
| `modal_attractiveness` | `modal_attractiveness` | benefit; `-load,+recovery` | linear; `.97/1/1.05/1.1` |
| `congestion_pressure` | `congestion_pressure` | risk; `+load,+cost` | linear; `.98/1/1.05/1.1` |
| `operational_capacity` | `operational_capacity` | benefit; `-load,+recovery` | linear; `.98/1/1.04/1.08` |
| `transit_signal_priority` | `transit_signal_priority` | benefit; `-load,+recovery` | linear; `.98/1/1.03/1.06` |
| `budget_pressure` | `budget_pressure` | risk; `+cost,-recovery` | linear; `.99/1/1.06/1.12` |

This is the complete 18-entry mapping: exactly 12 camelCase source IDs fail M1B's regex and map to the listed kebab-case IDs; the other six already match and are identity-mapped. The raw envelope stores this exact array as `compatibility.driverIdMappings`, each `{sourceDriverId,projectedDriverId}`. It is a closed legacy-projection rule, not a general normalizer. Semantic validation requires all 18 entries exactly once, rejects missing/extra/mismatched entries and collisions, and never reads presentation labels or applies this mapping to native/external input. Every native driver reference—action effects, impacts through their owning driver, propagation endpoints, predicates, aggregate-driver sources and escalation rules—must resolve through this table. A source camelCase ID anywhere in the projected native contract is `legacy-source-driver-id-leaked-into-native`.

No applicable driver lacks a curve configuration, and every impact's curve discriminant agrees with its driver configuration. The only runtime path to an unsupported discriminant requires an untyped/mutated object; TypeScript does not make it unreachable at runtime, and the default branch is neutral `1`. Exact valid legacy curves can therefore be projected now; fallback equivalence cannot be claimed before M1E.

### 4.2 Exact action inventory

The source registry is identical in all profiles. Effects are: `increase_service_frequency` → `accessibility:+1, operational_capacity:-.5, budget_pressure:+.5`; `reduce_travel_time` → `modal_attractiveness:+1`; `expand_cycling_infrastructure` → `modal_attractiveness:+2, congestion_pressure:-1, budget_pressure:+1`; `congestion_pricing` → `modal_shift_pressure:+2, political_feasibility:-1`; `electrify_bus_fleet` → `energyExposureRisk:-1, operationalEfficiencyRisk:-.5, capitalCommitmentRigidityRisk:+.5`; `transit_signal_priority` → `transit_signal_priority:+1`; `reduce_parking_supply` → `demandRisk:+1`; `phase_project_starts` → `capitalCommitmentRigidityRisk:-1, refinancingRisk:-.5`; `stagger_project_starts` → `capitalCommitmentRigidityRisk:-1, implementationPacingRisk:-1`; `increase_liquidity_buffer` → `liquidityPressure:-1, refinancingRisk:-1`; `reduce_leverage` → `refinancingRisk:-1, interestRateExposureRisk:-1`; `secure_long_term_leases` → `tenantStabilityRisk:-1, demandRisk:-1`; `energy_retrofit_program` → `energyExposureRisk:-1, operationalEfficiencyRisk:+1`; `delay_maintenance` → `maintenanceIntensityRisk:+1, tenantStabilityRisk:+.5`; `early_refinancing` → `refinancingRisk:-1, interestRateExposureRisk:-.5`.

Supported sets are exactly:

- RE: `delay_maintenance`, `early_refinancing`, `energy_retrofit_program`, `increase_liquidity_buffer`, `phase_project_starts`, `reduce_leverage`, `secure_long_term_leases`, `stagger_project_starts`.
- MU: `congestion_pricing`, `electrify_bus_fleet`, `expand_cycling_infrastructure`, `increase_service_frequency`, `reduce_parking_supply`, `reduce_travel_time`, `transit_signal_priority`.
- CO: `congestion_pricing`, `delay_maintenance`, `early_refinancing`, `electrify_bus_fleet`, `expand_cycling_infrastructure`, `increase_service_frequency`, `phase_project_starts`, `reduce_parking_supply`, `reduce_travel_time`, `transit_signal_priority`.

The other registry actions are explicitly excluded from each projected contract because they are not admitted by `DOMAIN_ACTIONS`: RE excludes the seven municipal actions; MU excludes the eight remaining actions; CO excludes `energy_retrofit_program`, `increase_liquidity_buffer`, `reduce_leverage`, `secure_long_term_leases`, and `stagger_project_starts`. The M1C validator must compare these exclusions against the exact source registry; an omission or extra entry fails.

M1B structurally requires `actions[].effects` to contain at least one item. After its two ignored effects are removed, supported `congestion_pricing` has no native-valid effect in MU or CO. It must therefore be absent from `projection.contract.semanticPayload.actions`, but it must not be treated as unsupported or silently dropped. Each of those two per-profile envelopes contains exactly one source-local declaration:

```ts
type CompatibilityOnlyActionV1 = Readonly<{
  kind: "legacy-compatibility-only-action-v1";
  sourceProfileId: "legacy-municipal-v1" | "legacy-consulting-v1";
  sourceActionId: "congestion_pricing";
  projectedNativeAction: "omitted-because-no-modeled-effects";
  admission: "legacy-adapter-only";
  ignoredEffects: readonly [
    { driverId:"modal_shift_pressure"; delta:2 },
    { driverId:"political_feasibility"; delta:-1 }
  ];
}>;
```

The raw paths are `/compatibility/compatibilityOnlyActions/0/...`; RE requires an empty array, MU and CO require the exact singleton bound to their own source profile. Effects canonicalize by exact source `driverId`, but exact tuple membership/deltas are checked. Source action IDs containing underscores already satisfy M1B's StableId regex, so every projectable action retains its exact ID (`early_refinancing`, `phase_project_starts`, and all others). No redundant action-ID mapping array is stored: semantic validation compares native action IDs directly with the source-supported set minus compatibility-only actions, and rejects missing, extra or changed IDs. Missing, extra, duplicated, cross-profile or mismatched compatibility declarations fail with `legacy-compatibility-only-action-mismatch`. The derived success diagnostic is `legacy-compatibility-only-action:congestion_pricing:omitted-from-native-actions`; it is source-local, never creates drivers or a no-op, preserves adapter-only admission, and can never apply to native/external V1.

## 5. Exact `ignoredUnknownDriverDelta` tuples

Source: `ACTION_EFFECTS` intersected with each exact `DOMAIN_ACTIONS` set and subtracted from that profile's `applicableDrivers`. There are exactly six occurrences, not merely six names:

1. (`legacy-real-estate-v1`, `stagger_project_starts`, `implementationPacingRisk`) delta `-1`
2. (`legacy-real-estate-v1`, `increase_liquidity_buffer`, `liquidityPressure`) delta `-1`
3. (`legacy-municipal-v1`, `congestion_pricing`, `modal_shift_pressure`) delta `+2`
4. (`legacy-municipal-v1`, `congestion_pricing`, `political_feasibility`) delta `-1`
5. (`legacy-consulting-v1`, `congestion_pricing`, `modal_shift_pressure`) delta `+2`
6. (`legacy-consulting-v1`, `congestion_pricing`, `political_feasibility`) delta `-1`

`ignoredUnknownDriverDelta` is sufficient for exact action application parity for all six. Both legacy action application paths only accumulate/apply a delta when the key exists in the precise score state; the 18-key initial/default states omit all four names. The declaration must contain the exact delta as additional mismatch protection and emit, sorted by `(profileId,actionId,driverId)`, `legacy-ignored-unknown-driver-delta:<profileId>:<actionId>:<driverId>:<delta>`. It never creates a driver. It is accepted only when source identity and source hash both equal the envelope, is rejected on native/external V1, and fails validation for an unlisted, missing, extra or value-mismatched tuple.

For MU and CO the two tuples are nested in the corresponding `compatibilityOnlyActions[].ignoredEffects` and are not duplicated in `ignoredUnknownDriverDeltas`; RE's two tuples remain in `ignoredUnknownDriverDeltas`. Validation nevertheless derives and compares the same exhaustive set of six tuple occurrences across both declaration forms and reports four distinct undeclared IDs: `implementationPacingRisk`, `liquidityPressure`, `modal_shift_pressure`, `political_feasibility`.

This rule is not sufficient for propagation parity by itself. `liquidityPressure` is also a source/target in three full-profile edges and is dynamically materialized by `propagateRisks`; that separate fact is handled in section 8 and must never be silently folded into this action rule.

## 6. `sustainThreshold` decision

Exact path: `RealEstateEngine.stepForward` passes its post-propagation `riskState` to `simulateConstraintsStep`; lines represented by `simulateConstraintsStep::rawThreshold/sustainThreshold` read own/inherited property `riskState.sustainThreshold`. If its runtime type is `number`, including `NaN` or infinities, it replaces `profile.constraints.refinancingMarginThreshold`; otherwise the profile threshold is used, then fallback `0.8` only when no profile exists. Activation tests `margin < sustainThreshold` and only matters when refinancing is enabled and the registry entry is not already active.

No `ParameterKey`, `defaultRiskState`, executable profile default, M0B engine input fixture or M0B semantic fixture contains `sustainThreshold`. The strict M0B engine fixture parser requires exactly the 18 driver keys, so none of the six engine Goldens exercises the override. MU is unaffected because `refinancingEnabled=false`. RE and CO can be affected only through a non-contract caller that supplies the extra property; after propagation/spread the property survives. The UI constant `EXEC_SUSTAIN_THRESHOLD=0.8` is presentation-summary input and is never inserted into engine risk state.

**Decision B: an explicit legacy-only compatibility field is required.** Native V1 can express the normal profile threshold directly as `measure-below`; it cannot and should not allow arbitrary scenario state to rewrite a contract predicate. The envelope field is:

```ts
type LegacySustainThresholdOverrideV1 = Readonly<{
  kind: "legacy-risk-state-number-overrides-constraint-threshold-v1";
  sourceField: "sustainThreshold";
  constraintId: "refinancing-constraint";
  acceptedRuntimeType: "number-including-non-finite";
  comparison: "margin-strictly-below-threshold";
  applicability: "this-envelope-source-only";
}>;
```

The structural parser accepts only these literals. The field is non-null with exact applicability in the RE and CO envelopes, and exactly `null` in MU because refinancing is disabled there. Semantic validation binds it only to that envelope's source identity/hash, an enabled projected refinancing constraint and normal threshold `0.8`; it never names another profile. Diagnostic: `legacy-sustain-threshold-override-declared:not-covered-by-m0b-engine-goldens`. M1C-3 must add characterization tests, including finite values, non-number fallback, `NaN` comparison behavior through an in-memory source object, and MU disabled behavior; strict JSON fixtures cannot encode non-finite values. This field documents legacy behavior but must not be added to native contract or normal V1 execution input.

## 7. Structural Margin exact projection

Update order and operands are exact:

1. Current margin begins at baseline `1.0` and is read before escalation/constraint activation.
2. Base multipliers are computed from the post-escalation, post-propagation driver state in impact-contract insertion order.
3. Constraints multiply base dimensions to adjusted cost/recovery/load.
4. `loadImpact=max(0,adjustedLoad-1)`.
5. `riskPressure=(baseLoad-1)+(baseCost-1)+(1-baseRecovery)+(baseSensitivity-1)`.
6. `erosion=(adjustedCost-1)*1.2+(1-adjustedRecovery)*1.1+loadImpact*.45+riskPressure*.8`.
7. `pullToBaseline=(1-margin)*.12`; next is `margin-erosion+pullToBaseline`.
8. Clamp after update to profile range `[-3,3]`; then write the new state. At the next step, escalation reads this value. RE/CO escalation below `-1` changes `interestRateExposureRisk` LOW→MODERATE or MODERATE→HIGH before propagation; MU has no rule.

This maps exactly to the final M1B `NamedMeasureDefinition`:

```ts
{
  measureId: "structural-margin",
  kind: "weighted-signal-aggregate-v1",
  updateOperator: "subtract-terms-add-recovery-v1",
  initialValue: 1,
  terms: [
    { termId:"adjusted-cost", source:{kind:"dimension",dimensionId:"cost",stage:"after-constraints"}, transform:"deviation-from-neutral", weight:1.2 },
    { termId:"adjusted-recovery", source:{kind:"dimension",dimensionId:"recovery",stage:"after-constraints"}, transform:"inverse-from-neutral", weight:1.1 },
    { termId:"positive-adjusted-load", source:{kind:"dimension",dimensionId:"load",stage:"after-constraints"}, transform:"positive-deviation-from-neutral", weight:.45 },
    { termId:"base-pressure", source:{kind:"protocol-signal",signalId:"base-dimension-pressure-sum-v1"}, transform:"identity", weight:.8 }
  ],
  recovery:{targetValue:1,pull:.12}, range:{minimum:-3,maximum:3},
  escalationRules:[/* RE/CO exact transitions below; MU empty */]
}
```

The protocol signal is already closed in M1A/M1B as the ordered sum of base load/cost deviations, inverse base recovery and base sensitivity deviation. The update operator supplies current-value subtraction/recovery semantics. Therefore no legacy-only measure kind, arbitrary expression or new product decision is needed. The unused engine `sensitivity=1.2` field is not a coefficient in this formula and must not be projected.

RE/CO native escalation rules reference projected `driverId:"interest-rate-exposure-risk"` and projected level transitions `low→moderate` and `moderate→high`; MU has no escalation rule. No camelCase source ID or uppercase source level is used in the native measure.

### 7.1 Constraint reachability and projection

`RealEstateEngine` always creates `createInitialConstraintRegistry()` and exposes no constructor parameter or setter for a registry. `reset()` recreates it. `runCascadeAnalysis` supplies risk state/scores/profile, never registry. The page's default state does the same. `readSavedRunHistory` tolerantly restores `engineState` for display and comparison, but no public path feeds that restored state into an engine. Therefore persistence/restoration cannot activate a constraint in a future run. `simulateConstraintsStep` can apply Liquidity/Covenant effects if an internal caller manually passes an active registry, but no current public execution surface does so; only `RealEstateEngine` and a diagnostic test call it, and the engine path begins inactive. `Custom` has neither profile effect nor application branch.

Decisions by source constraint:

- `RefinancingConstraint`: A, full native projection for RE/CO with threshold/effects/lifecycle above. MU's `refinancingEnabled:false` makes its copied threshold/effects unreachable, so MU uses C and has no fabricated always-false activation predicate.
- `LiquidityConstraint`: C for all three profiles. Its profile-owned effects are declared but excluded because no activation transition is reachable on the scoped public execution/restoration/persistence surfaces.
- `CovenantConstraint`: C for all three for the same reason.
- `Custom`: C for all three as inert global registry shape; there is no profile-owned effect or runtime application branch.

Each C entry is a closed `ExcludedSourceValueV1` at `/compatibility/excludedSourceValues/<index>` with `{kind:"provably-unreachable-public-execution-v1", sourcePath, sourceValueHash, reasonCode}`. Exact reason codes are `profile-constraint-disabled` (MU refinancing), `no-public-activation-transition` (Liquidity/Covenant), and `inert-global-registry-member` (Custom). `sourceValueHash` uses the shared M0B hash helper over the exact named source value, not a new algorithm. Derived diagnostics use `legacy-source-value-excluded:<reasonCode>:<sourcePath>`. Missing/extra entries, wrong source value hash, a projected native constraint for a C entry, or a newly discovered public registry injection/resume path fails validation and stops M1C. The Liquidity/Covenant effects remain covered by the source payload hash and are not silently discarded.

## 8. Propagation graph and ordering

RE and CO have the same 20 ordered edges:

1. `interestRateExposureRisk→refinancingRisk:H` 2. `interestRateExposureRisk→leverageLevelRisk:H` 3. `leverageLevelRisk→liquidityPressure:H` 4. `leverageLevelRisk→capitalCommitmentRigidityRisk:H` 5. `refinancingRisk→leverageLevelRisk:H` 6. `refinancingRisk→liquidityPressure:H` 7. `refinancingRisk→capitalCommitmentRigidityRisk:H` 8. `liquidityPressure→capitalCommitmentRigidityRisk:H` 9. `capitalCommitmentRigidityRisk→operationalEfficiencyRisk:H` 10. `capitalCommitmentRigidityRisk→maintenanceIntensityRisk:H` 11. `operationalEfficiencyRisk→maintenanceIntensityRisk:H` 12. `operationalEfficiencyRisk→tenantStabilityRisk:H` 13. `maintenanceIntensityRisk→tenantStabilityRisk:H` 14. `tenantStabilityRisk→demandRisk:H` 15. `congestion_pressure→modal_attractiveness:H` 16. `modal_attractiveness→accessibility:H` 17. `accessibility→demandRisk:H` 18. `operational_capacity→tenantStabilityRisk:H` 19. `budget_pressure→capitalCommitmentRigidityRisk:H` 20. `transit_signal_priority→operational_capacity:H`.

MU has exactly, in order: `operationalEfficiencyRisk→maintenanceIntensityRisk:H`, `accessibility→demandRisk:H`, `budget_pressure→capitalCommitmentRigidityRisk:H`. Every edge has event delay 1. Triggers are risk `HIGH|SEVERE` except benefit sources `accessibility`, `modal_attractiveness`, `operational_capacity`, `transit_signal_priority`, which trigger at `LOW`. Propagated level is always `HIGH`.

There are no duplicate `(source,target)` edges, self-edges or directed cycles in any profile. MU is a subgraph. RE/CO each contain the same three definitions whose endpoint `liquidityPressure` is not applicable: leverage→liquidity, refinancing→liquidity and liquidity→capital commitment. They are six profile-bound occurrences. Native V1 rejects such references.

Legacy traversal is insertion-order-sensitive for event iteration/order: within a fixed-point pass, a newly raised source occurring later in object order propagates immediately, whereas an earlier source waits for the next pass. Canonical sorting is not generally observationally equivalent even though monotone terminal levels converge. M0B cascade hashes protect the existing order for six selected runs but do not prove all states. Therefore the envelope must declare `edgeEvaluationOrder:"legacy-source-and-target-insertion-order-v1"` plus the complete ordered edge IDs.

Native edge identity is versioned derivation, not position: `legacy-edge-v1.<projectedSourceDriverId>.to.<projectedTargetDriverId>`. It uses only the mapped native StableIds and satisfies the M1B grammar; semantic validation recomputes it and rejects any collision. Projected native edges use this ID for the 17 RE/CO modeled edges and all three MU edges. Source evidence remains separate as `sourceDriverId`/`targetDriverId` exact legacy strings.

Each envelope's `propagation.sourceEvaluationOrder` is an array of `{sourcePosition,edgePosition,sourceLegacyDriverId,targetLegacyDriverId,projectedOrCompatibilityEdgeId}` for every source/target occurrence, where source fields preserve exact legacy strings and the referenced edge ID is separately StableId-validated. Positions are zero-based integers matching `Object.entries` and nested-array insertion order. Stable identity detects substitution/duplication; positions independently detect reorder. Semantic validation reconstructs the exact profile graph from the M0B source payload, rejects missing/extra/duplicate identities, requires source positions and each source's edge positions to be contiguous and unique, and rejects any reordered occurrence with `legacy-propagation-order-mismatch`. Canonical native semantic hashing may reorder native edges and does not erase or replace this separately hashed legacy evaluation order.

For a structurally valid projected native contract, the three `liquidityPressure` edges are omitted from native propagation and declared verbatim per RE and per CO envelope as three `compatibilityOnlyEdges`; thus there are two separate three-entry arrays, never one cross-profile declaration. Each entry separates `sourceLegacySourceDriverId` and `sourceLegacyTargetDriverId` (exact strings, including `liquidityPressure`) from `adapterLocalSourceDriverId` and `adapterLocalTargetDriverId` (mapped StableIds, using `liquidity-pressure` only inside compatibility). Its `compatibilityEdgeId` is `legacy-compat-edge-v1.<adapterLocalSourceDriverId>.to.<adapterLocalTargetDriverId>`. It also carries source/edge positions (source positions 1, 2 and 3; nested edge positions 0, 1 and 0), flattened occurrence positions 2, 5 and 7 (human list positions 3, 6 and 8), exact source propagated level plus projected level, `implicitSourceNodeId:"liquidityPressure"`, `adapterLocalImplicitNodeId:"liquidity-pressure"`, `missingReadDefaultLevelId:"low"`, `materializeOnRaise:true`, `hasScore:false`, and `hasImpacts:false`. MU requires an empty array. `liquidity-pressure` is never emitted in native `drivers` or any native driver reference. An omitted, extra, duplicated, cross-profile, invalid-ID or reordered edge fails M1C validation.

## 9. Curves and fallback boundary

The 18 valid instances are exhaustively listed in section 4.1. There is no missing configuration for an applicable driver and no source-authored unsupported discriminant in any of the three profiles. M1C-3 can project each valid instance exactly, including exponent/logistic parameters that were previously global.

Every impacted driver owns exactly one curve instance with `curveId = "legacy-curve-v1." + projectedDriverId`, yielding, for example, `legacy-curve-v1.demand-risk`, `legacy-curve-v1.interest-rate-exposure-risk` and `legacy-curve-v1.refinancing-risk`. All 18 generated values match the M1B StableId grammar and are collision-free under the exact driver mapping. Every impact of one driver reuses that driver's single ID; no ID is shared across drivers. The curve definition's discriminant is the driver's configured curve: exponential plus exponent `1.2` only for projected `interest-rate-exposure-risk` and `leverage-level-risk`, logistic plus `k=.8,x0=3` only for `refinancing-risk`, and linear for the other 15. Exactly the 18 referenced definitions are emitted; no unreferenced curve is fabricated. Semantic validation recomputes the ID from the projected owner driver, enforces one-owner reuse and exact parameters/amplitudes, making projection and hash independent of source object insertion order.

The envelope may contain only:

```ts
curveFallbackDeclaration: {
  policyId: "legacy-neutral-multiplier-v1";
  appliesTo: ["missing-curve-configuration", "unsupported-curve-discriminant"];
  neutralMultiplier: 1;
  evidenceStatus: "deferred-to-m1e";
}
```

This declares the known source behavior and prevents its accidental loss; it does not make the projected native contract accept either condition, does not claim a Golden, and is not executable in M1C. M1E must independently characterize both branches before any runtime switch. A declaration with `evidenceStatus:"verified"` is invalid in M1C.

## 10. Projected identities and stable IDs

The envelope is the new migration record required by M1A: it refers to immutable source identity/hash and contains a distinct projected identity; it never rewrites historical identity. Exact projected identities are:

| Source | Projected `domainId` | Projected `profileId` | Projected `modelVersion` | Projected `calibrationVersion` |
|---|---|---|---|---|
| RE | `real-estate` | `legacy-real-estate-v1-domain-model-contract-v1` | `pilot-fastighet-v0.4-domain-model-contract-v1` | `legacy-global-v1-domain-model-contract-v1` |
| MU | `municipal` | `legacy-municipal-v1-domain-model-contract-v1` | `pilot-fastighet-v0.4-domain-model-contract-v1` | `transport-causal-subset-v2-domain-model-contract-v1` |
| CO | `consulting` | `legacy-consulting-v1-domain-model-contract-v1` | `pilot-fastighet-v0.4-domain-model-contract-v1` | `legacy-global-v1-domain-model-contract-v1` |

The RE envelope source identity retains exact legacy `domainId:"realEstate"`; only its projected native identity uses `domainId:"real-estate"`. MU and CO source/native domain IDs are identity mappings because `municipal` and `consulting` already satisfy StableId. The following inventory distinguishes validation categories rather than implying every string is a StableId:

| Namespace | Source value/rule | Projected value/rule | Validation type | Collision rule |
|---|---|---|---|---|
| envelope/schema versions | legacy literals | `legacy-profile-projection-v1`, `legacy-domain-profile-adapter-v1`, declaration version | exact enum/version string, not asserted as a model StableId | exact literal uniqueness |
| engine protocol | source migration binding | `pulse-domain-engine-protocol-v1` | exact protocol version string | one supported literal |
| domain | `realEstate`, `municipal`, `consulting` | `real-estate`, `municipal`, `consulting` | source exact string → native StableId | projected values unique |
| profile | three exact source profile IDs | table above | native StableId | unique across three projections |
| model/calibration | exact source version strings | table above | version strings; included in semantic identity | exact source/projected pair unique |
| scale | no source ID | `legacy-risk-scale-v1` | native StableId | singleton |
| level | source `LOW/MODERATE/HIGH/SEVERE` | `low/moderate/high/severe` | source enum → native StableId | four unique ranks and IDs |
| dimension | exact lowercase source IDs | `load/cost/recovery/sensitivity` | native StableId identity mapping | four unique IDs |
| driver | 18 exact source IDs | exact table in section 4.1 | source exact string → native StableId | 18 projected IDs unique |
| action | exact source IDs | exact identity mapping for projectable actions | native StableId; source compatibility string for omitted action | unique within projected actions; direct source-set comparison |
| curve | source driver-owned config has no curve ID | `legacy-curve-v1.<projectedDriverId>` | generated native StableId | one per projected driver; no cross-driver reuse |
| constraint | source `RefinancingConstraint` | `refinancing-constraint` | source enum → native StableId | singleton where reachable |
| measure | source Structural Margin concept | `structural-margin` | native StableId | singleton |
| measure term | formula terms | `adjusted-cost`, `adjusted-recovery`, `positive-adjusted-load`, `base-pressure` | native StableId | four unique IDs |
| native edge | exact source/target evidence | `legacy-edge-v1.<projectedSource>.to.<projectedTarget>` | generated native StableId | recomputed pair key; reject duplicate/collision |
| compatibility edge | exact legacy source/target, including `liquidityPressure` | `legacy-compat-edge-v1.<adapterLocalSource>.to.<adapterLocalTarget>` | adapter-local StableId, not native driver identity | recomputed pair key; reject duplicate/collision |
| compatibility implicit node | exact source `liquidityPressure` | adapter-local `liquidity-pressure` | source evidence string plus adapter-local StableId | exact singleton; native driver creation forbidden |
| diagnostics | no source identity | closed diagnostic codes in section 11 | enum/literal, not model identity | exact code set/templates |

Every native reference uses the projected IDs: `drivers[].driverId`, action-effect `driverId`, owning driver impacts/curve references, propagation source/target, predicates, aggregate-driver references and escalation `driverId`. Adverse level references use projected level IDs. Exact source IDs remain only in envelope evidence, mappings, gap tuples and source hashes. All generated/projected IDs are mechanically regex-checked and collision-checked; no presentation label, array index or localized text is semantic identity.

## 11. Separate, closed legacy envelope

```ts
type Sha256 = `sha256:${string}`;

type RawLegacyProfileProjectionEnvelopeV1 = Readonly<{
  schemaVersion: "legacy-profile-projection-v1";
  adapterVersion: "legacy-domain-profile-adapter-v1";
  engineProtocolVersion: "pulse-domain-engine-protocol-v1";
  source: {
    identity: { domainId:string; profileId:string; modelVersion:string; calibrationVersion:string };
    semanticPayloadVersion: "legacy-domain-profile-semantic-payload-v1";
    semanticPayloadHash: Sha256;
  };
  projection: {
    identity: DomainModelContractV1["identity"];
    semanticPayloadHashPolicy: "domain-model-contract-v1-semantic-payload-v1";
    semanticPayloadHash: Sha256;
    contract: DomainModelContractV1;
  };
  compatibility: {
    declarationsVersion: "legacy-compatibility-declarations-v1";
    declarationsHash: Sha256;
    ignoredUnknownDriverDeltas: readonly IgnoredUnknownDriverDeltaV1[];
    compatibilityOnlyActions: readonly CompatibilityOnlyActionV1[];
    driverIdMappings: readonly LegacyDriverIdMappingV1[];
    excludedUnsupportedActionIds: readonly string[];
    sustainThresholdOverride: LegacySustainThresholdOverrideV1 | null;
    propagation: LegacyPropagationCompatibilityV1;
    excludedSourceValues: readonly ExcludedSourceValueV1[];
    curveFallbackDeclaration: LegacyCurveFallbackDeclarationV1;
  };
}>;

type DerivedLegacyProjectionDiagnosticV1 = Readonly<{
  code:
    | "legacy-ignored-unknown-driver-delta"
    | "legacy-compatibility-only-action"
    | "legacy-sustain-threshold-override-declared"
    | "legacy-propagation-evaluation-order-declared"
    | "legacy-propagation-only-edge"
    | "legacy-source-value-excluded"
    | "legacy-curve-fallback-deferred-to-m1e";
  path: string; // canonical JSON Pointer into the raw envelope
  message: string; // fixed template selected by code; source IDs only
}>;

type ValidatedLegacyProfileProjectionEnvelopeV1 = Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  diagnostics: readonly DerivedLegacyProjectionDiagnosticV1[];
}>;
```

This chooses diagnostics model A, the smaller fail-closed model. The serialized/raw envelope has no `diagnostics` field and rejects one as unknown. Validation returns a separate detached/frozen result containing the hash-verified envelope and diagnostics recomputed and sorted by `(code,path,message)`. Diagnostics are never caller-authored, are excluded from the compatibility hash and raw-envelope fixture hash, and are deterministic consequences of the hashed raw data. The schema is closed at every object level; arrays reject holes, accessors, symbols and non-plain objects; numbers follow existing M1B limits except the documented in-memory sustain source behavior; results are detached and recursively frozen.

Separation is normative:

- **A. Native contract:** `DomainModelContractV1`; strict M1B rules, no compatibility fields.
- **B. Envelope:** source evidence, projection binding and exhaustive legacy-only declarations; never accepted as a native contract.
- **C. Projected contract:** a normal structurally and semantically valid native object nested in the envelope; its hash uses the complete existing M1B semantic-identity projection.
- **D. Trusted/executable registration:** absent and forbidden. Parsing an envelope or projected contract confers no trust or executability.

Allowed brands are only `StructurallyValidatedLegacyProfileProjectionEnvelopeV1`, `SemanticallyValidatedLegacyProfileProjectionEnvelopeV1`, and `HashVerifiedLegacyProfileProjectionEnvelopeV1`. The nested contract independently receives the existing structural, semantic and semantic-hash brands. No `Trusted`, `Registered`, `Executable`, `PreparedForExecution` or equivalent brand may exist in M1C.

Structural validation covers exact fields, literals, primitive types, limits, plain data, cloning/freezing and hash syntax. Semantic validation resolves exact source identity/hash allowlist, recomputes the six gap tuples, complete unsupported-action complement, native contract validity, Structural Margin definition, sustain scope, complete legacy edge list/order and compatibility-only edges, deterministic diagnostics, and no compatibility/native contamination. Hash verification follows semantic validation.

## 12. Hash policy

All M1C-specific projections use only M0B `canonicalizeBaselineValueV1`/`hashBaselineValueV1`; the projected native contract must instead call the existing M1B semantic-identity wrappers named below, which themselves reuse those primitives. No alternative canonical JSON, SHA implementation or reduced native projection is allowed. Lowercase hex is represented as `sha256:<64 hex>` in M1C objects while comparisons strip/add only this fixed prefix.

1. **Source hash:** hash the complete M0B `LegacyDomainProfileSemanticPayloadV1`; literals are section 3.
2. **Projected native hash:** reuse, without wrapping or reducing it, `projectDomainModelContractSemanticIdentityV1`, `canonicalizeDomainModelContractSemanticIdentityV1` and `hashDomainModelContractSemanticIdentityV1`. Their projection contains `schemaVersion`, `engineProtocolVersion`, the four identity fields `domainId/profileId/modelVersion/calibrationVersion`, and the complete canonical `semanticPayload`; it excludes `identity.semanticPayloadHash` and `metadata`. Store the returned hash in both projected identity and projection binding. M1C must not hash `semanticPayload` alone or implement an alternative projection.
3. **Compatibility hash:** hash the complete `compatibility` object excluding `declarationsHash` itself. The parser design should implement this as a named projection function, not a second canonicalizer.
4. **Envelope hash:** computed for fixtures/tests over the complete hash-verified envelope; it is not embedded in the envelope, avoiding self-reference. M1C-3 records it beside each fixture in the test case table.

Presentation metadata and only `identity.semanticPayloadHash` are excluded from the projected semantic identity; the four other projected identity fields are included. Exact source identity is independently bound by the envelope and validated against its source hash. Any source identity/hash mismatch, compatibility hash mismatch or projected hash mismatch fails before a branded result.

Projected domain, profile, driver, curve and edge IDs—and unchanged action IDs—therefore affect the M1B semantic identity through its identity/payload fields. M1C-1 records rules only and fabricates no projected, compatibility or envelope hash. M1C-3 must first build and validate each projection, then compute the three hash layers from actual values using the prescribed functions; fixtures record those computed results only after review.

## 13. M0B coverage and limitations

The three readable semantic fixtures and exact hashes cover explicit profile identity, drivers/defaults, 15 action maps, supported sets, propagation arrays/order, constraints, escalation, impacts, curves and clamp. Six engine Goldens (neutral and stressed/scheduled per profile) hash full output, trajectory, terminal state, margin, constraints, cascades, provenance, baseline and comparison. They deliberately avoid `stagger_project_starts`, `increase_liquidity_buffer` and `congestion_pricing`, so ignored-gap runtime parity is not exercised. Structural Observation V2/persistence Golden binds the RE semantic hash and proves observation non-interference, identity and round-trip, but it adds no adapter evidence.

Algorithm assumptions record score mechanics, propagation triggers/fixed point/delay, curve parameters/fallback, Structural Margin, constraint registry and sustain behavior. Output Goldens transitively cover normal Structural Margin and propagation paths, but do not isolate every term/order or cover sustain override/missing-curve branches. M1C must not relabel these limitations as proof.

## 14. Exact allowed files and tests

### M1C-2 allowed files

Only these new files under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/`, plus this audit unchanged:

- `legacyProfileProjectionEnvelopeV1.ts`
- `parseLegacyProfileProjectionEnvelopeV1Structure.ts`
- `validateLegacyProfileProjectionEnvelopeV1Semantics.ts`
- `hashLegacyProfileProjectionEnvelopeV1.ts`
- `legacyProfileProjectionEnvelopeV1.test.ts`
- `parseLegacyProfileProjectionEnvelopeV1Structure.test.ts`
- `validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts`

M1C-2 tests: closed raw structure with diagnostics rejected as an unknown field; separate derived diagnostic result and deterministic sorting; exactly three allowed source/projected identity pairs (`realEstate→real-estate` included) and source hashes; exact 18-entry driver mapping with 12 conversions/six identity mappings, no missing/extra/mismatch/collision/label use; every proposed concrete/generated ID checked against the unchanged M1B regex within its namespace; unchanged action IDs and absence of redundant action mapping data; existing M1B semantic identity functions only; brand separation; detached recursive freeze; mutation safety; source identity/hash mismatch; missing/extra/mismatched compatibility declarations; six tuple occurrences/four undeclared IDs; exact RE gap array and MU/CO compatibility-only `congestion_pricing`; zero native zero-effect actions; source-local sustain nullability; exact binary64 materialization boundaries; Structural Margin shape; constraint reachability exclusions and source-value hashes; complete ordered edge declaration, projected endpoint IDs, source evidence fields, adapter-local `liquidity-pressure`, stable/recomputed IDs and six profile-bound liquidity occurrences; curve IDs from projected drivers/ownership/parameters; curve fallback fixed as deferred; no runtime/profile resolver imports in the adapter directory; no native type contamination; no trust/registry/executable symbols; stable repeated compatibility/raw-envelope hashes.

### M1C-3 allowed files

Only these additional files in the same directory:

- `projectLegacyProfileToDomainModelContractV1.ts`
- `legacyProfileProjectionV1.ts`
- `legacyProfileProjectionV1.test.ts`
- `fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`
- `fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json`
- `fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json`

M1C-3 tests: exactly three fixtures; independent source fixture and live M0B projection hashes; exhaustive field accounting with no unlisted drop/default; exact projected identities and StableIds; every native driver reference belongs to the 18 projected IDs and none of the 12 camelCase source IDs leaks into native data; exact native actions retain source IDs while their effects reference projected drivers; exact impacts/curves/constraints/predicates/aggregate sources/escalation references; all 18 `legacy-curve-v1.<projectedDriverId>` values valid/unique and all native/compatibility edge IDs valid/unique in their namespaces; native action counts RE 8, MU 6, CO 9 with MU/CO adapter-only admission restoring source counts 7/10; all six tuples across the two declaration forms; exact unsupported-action complements; `0.5`/nextUp and `1.5`/`2.5` neighbor boundaries; source-local sustain characterization; RE/CO refinancing plus exact excluded constraint values; complete propagation identity/order, mapped endpoints and separate RE/CO liquidity evidence/adapter-local arrays; author-order neutrality only for native V1 set-like arrays while legacy evaluation order remains explicit; hashes through the existing M1B semantic identity functions and only after projection validation; stable compatibility/raw-envelope hashes; diagnostics excluded from both hashes; repeat, detachment, freeze and mutation tests; native parser acceptance of nested projected contract; no runtime imports, registry or execution; explicit non-proof of M1E fallback.

No existing M0B/M1B file or fixture may be edited at either checkpoint.

## 15. Decisions, risks and gates

### Decisions proven from current implementation

- Exact identities, 18-driver vocabulary/defaults, all action values/support sets, six gap occurrences, impact/curve values, constraints, escalation, clamp and graph arrays are recoverable.
- The six gap tuple occurrences cover four distinct undeclared driver IDs. MU/CO `congestion_pricing` becomes a compatibility-only action rather than an invalid zero-effect native action; `liquidityPressure` propagation remains a distinct behavior.
- All native IDs have a closed regex-valid derivation: RE domain and 12 drivers map explicitly, six drivers and projectable actions retain valid source IDs, and curves/edges derive from mapped IDs. Exact legacy strings remain source evidence only.
- Native half-open bands exactly reproduce the inclusive LOW boundary by using binary64 `nextUp(0.5) = 0.5000000000000001`.
- Sustain override is absent from defaults/Goldens, affects only enabled refinancing, and replaces rather than supplements the profile threshold.
- Structural Margin maps exactly to the closed native measure/operator/signal registry.
- Graphs are acyclic, duplicate-free and self-edge-free, but traversal order is event-observable.
- Liquidity/Covenant/Custom cannot become active through current public execution or restored saved runs; only refinancing is reachable, and MU disables it.

### Decisions inherited from M1A/M1B

- Native V1 is strict and author-order-neutral for documented set-like arrays.
- Legacy adaptation is a separate envelope; compatibility never applies to native/external contracts.
- Missing/unsupported native curves reject; no arbitrary expressions or generic formula language.
- Parsing/validation/hash verification are not trust or executability.

### Decisions still missing

No product decision blocks M1C-2 or the data-only M1C-3 projection. The closed decisions are raw-envelope-without-diagnostics; exact new projected identities including `realEstate→real-estate`; the exhaustive 18-driver map; unchanged valid action IDs; binary64-native materialization; compatibility-only MU/CO action; source-local sustain declaration; excluded unreachable constraints; deterministic driver-owned curve IDs from projected drivers; and position-independent edge identities plus separate source evaluation positions/evidence. M1E still owes empirical fallback characterization. M1D still owes differential execution proof, including compatibility graph/order and sustain cases. Later milestones must decide trusted registration and runtime adoption; those are deliberately outside M1C.

### Risks

- Treating `liquidityPressure` only as an ignored delta would lose propagation events/state.
- Canonically reordering legacy edges can preserve terminal levels while changing iterations and cascade hashes.
- Projecting all 15 registry actions would falsely enlarge native support.
- Reusing `realEstate` or any of the 12 camelCase driver strings as native IDs would fail M1B before semantic validation; normalizing already-valid action IDs would create needless identity drift.
- Removing both `congestion_pricing` effects while retaining a native action would violate M1B; dropping its admission would lose legacy behavior.
- Replacing `0.5000000000000001` with an approximate epsilon would misclassify a representable score.
- Projecting unreachable Liquidity/Covenant effects with invented predicates would fabricate semantics; omitting their declarations would hide source values.
- Encoding sustain override as a native predicate input would create an unsafe calibration channel.
- Hashing only native `semanticPayload`, hashing diagnostics, hashing the envelope recursively or inventing another projection/normalizer would create identity ambiguity.
- Calling the deferred curve declaration verified would pre-empt M1E.

### Exact stop conditions for M1C-2

Stop if any source/projected identity differs; any proposed native or adapter-local ID fails the unchanged M1B regex or collides within its namespace; the exact domain/18-driver mappings are missing, extra or mismatched; a camelCase source driver leaks into native data; action IDs are unnecessarily normalized; a native `liquidity-pressure` driver is created; any projection hash is guessed rather than deferred to M1C-3; the six-tuple/four-ID inventory, compatibility-only actions, exact binary64 bands, source-local sustain scope, constraint exclusions, curve IDs/ownership, six liquidity edge occurrences or evaluation positions cannot be reproduced exactly; raw diagnostics are accepted; existing M1B semantic identity functions cannot be reused unchanged; a compatibility declaration cannot be closed and exhaustive; native types need modification; any runtime, trust, registry or executable import/type is required; deterministic derived diagnostics, detachment or recursive freezing fail; or any file outside the M1C-2 list changes.

### Exact stop conditions for M1C-3

Stop if a projected contract fails the unchanged M1B parser/semantic/hash pipeline; any native ID/reference fails regex, mapping or collision checks; RE projected domain is not exactly `real-estate`; any of the 12 camelCase source drivers appears in native semantic identity; projectable action IDs differ from source; curve/edge IDs are not derived from projected endpoints; `liquidityPressure` source evidence is confused with adapter-local `liquidity-pressure` or a native driver; MU/CO action admission cannot be preserved without a zero-effect/no-op/native-driver fabrication; any source value is dropped/defaulted without an exact declaration; boundary neighbor tests disagree; restored/public constraint reachability contradicts section 7.1; hashes are predeclared, collide or vary across repeats/order-neutral inputs; legacy propagation order or liquidity-node behavior cannot be represented by the approved per-profile envelope; sustain/Structural Margin tests contradict this audit; M0B hashes/Goldens change; fallback proof is required before M1E; or any file outside the M1C-3 list changes.

### Recommended checkpoint sequence and estimates

| Checkpoint | Work | Implementation | Review |
|---|---|---:|---:|
| M1C-2a | raw envelope types, structural parser, brands, separate diagnostics result | 0.75–1.25 days | 0.5 day |
| M1C-2b | semantic validator, action/materialization/constraint/edge compatibility, hashes | 1.5–2 days | 0.75–1 day |
| M1C-3a | three exact native projections, identities/IDs and readable fixtures | 1.5–2 days | 1 day |
| M1C-3b | independent hashes, boundary/reachability/mutation/order/negative tests | 1.5–2 days | 0.75–1 day |
| External review gate | compare audit, fixtures and computed manifests; no runtime switch | — | 0.5–1 day |

## 16. Final boundary

M1C-2 may begin with the envelope only. M1C-3 may follow after its parser/validator review. M1D must prove output equivalence before any execution use. M1E must separately prove or replace the neutral curve fallback. No result of M1C is trusted, registered, executable, persisted, UI-visible or externally ingestible.

No M1C result or checkpoint authorizes deployment or Vercel interaction.
