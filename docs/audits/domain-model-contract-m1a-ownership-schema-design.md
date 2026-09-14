# Domain Model Contract M1A — ownership and schema design audit

Date: 2026-09-14  
Repository: `/Users/christian/Projects/pulse_engine_clean`  
Branch: `decision-flow-demo-v1`  
Audited HEAD: `7ef12d3dd38d89dcf145b6cf42c11eaf0077fe69`  
Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Executive conclusion

**VERIFIED — M1A COMPLETE AS A DESIGN AUDIT.** A fail-closed Domain Model Contract V1 is technically feasible without teaching the engine about real estate, municipal, consulting, historical cases, or future pilot domains. No runtime switch is authorized by this conclusion.

**PROPOSED — ownership boundary.** The contract owns domain vocabulary and calibrated semantics: identity, drivers and scales, defaults, actions and canonical effects, propagation graph, impacts and curve instances, constraints, and named decision-space measures. The referenced engine protocol owns generic deterministic mechanics: validation/canonicalization protocol, batching, timestep execution, stable ordering, fixed-point processing, numeric application operators, lifecycle transition machinery, trajectory construction, and comparison mechanics. Scenario/execution input owns horizon, initial state overrides, selected/scheduled action instances, scenario labels and observation plans. Presentation metadata owns labels, groups, explanatory copy, colors and layout. Persistence owns hashes, execution identity, compatibility classification and saved-run bindings.

**VERIFIED — the current implementation does not yet satisfy that boundary.** `RealEstateEngine.ts`, `driverScoreState.ts`, `riskPropagation.ts`, `curveConfig.ts`, `constraintState.ts`, and `simulateConstraintsStep.ts` contain result-affecting global constants and domain-shaped assumptions. `executableDomainProfile.ts` captures much, but not all, of the executable semantics. M0B explicitly records the missing portion in `legacyAlgorithmAssumptionsV1.ts`.

**BLOCKER BEFORE RUNTIME SWITCH.** Before any contract-backed runtime path is selected, the legacy gaps and curve fallback must be resolved explicitly, the protocol and semantic hash must be implemented, and differential execution must match every applicable M0B Golden or carry an approved versioned delta.

**BLOCKER BEFORE EXTERNAL PROFILE.** JSON-schema success alone must never grant executability. External data needs strict structural parsing, semantic validation, limits, review, trusted registration, immutable output, collision protection, and a supported schema/protocol pair.

## 2. Evidence and method

The audit began from a clean working tree and verified repository, branch, HEAD and remote exactly as listed above. `docs/audits/domain-model-m0b-completion-audit.md` exists and concludes **READY FOR DOMAIN MODEL CONTRACT IMPLEMENTATION**. Evidence was traced from runtime sources and M0B test-support projections/Goldens; no product, type, parser, test, fixture, Golden, manifest or package file was changed.

Primary anchors: `executableDomainProfile.ts`, `RealEstateEngine.ts`, `actionEffects.ts`, `riskPropagation.ts`, `impactContract.ts`, `curveConfig.ts`, `computeDimensionMultipliers.ts`, `driverScoreState.ts`, `constraintState.ts`, `simulateConstraintsStep.ts`, `canonicalDriverDeltaBatch.ts`, `runCascadeAnalysis.ts`, `manualScheduledExecution.ts`, `savedRunPersistence.ts`, Structural Observation contracts/validators, and M0B `legacyDomainProfileSemanticPayloadV1.ts`, `legacyAlgorithmAssumptionsV1.ts`, fixtures and Goldens.

Status language is normative: **VERIFIED** describes observed code/baseline behavior; **INFERRED** is a consequence not directly asserted by code; **PROPOSED** is the V1 design; **OPEN DECISION** needs review; blockers gate the named milestone.

## 3. Full ownership matrix

`Explicit` means the V1 semantic payload must carry the value. `Protocol` means it may be a version-locked engine constant referenced by `engineProtocolVersion`.

| Concern | Runtime source of truth / current owner | Proposed class and V1 owner | Domain-specific vs protocol; explicit/protocol | M0B protection | Migration risk; decision |
|---|---|---|---|---|---|
| domain/profile/model/calibration identity | `executableDomainProfile.ts` | PERSISTENCE/COMPATIBILITY + CONTRACT REQUIRED; contract | Domain semantic; explicit | profile payload and saved-run Goldens | Medium; preserve four-part identity and add schema/protocol/hash |
| applicable drivers | profile `applicableDrivers` derived from global impact contract | CONTRACT REQUIRED; contract `drivers` | Domain; derive set from driver definitions | profile Goldens | High; remove dependence on global registry |
| state/risk levels | `impactContract.ts` union | CONTRACT REQUIRED; per-contract ordered scale | Potentially domain-specific; explicit | engine Goldens transitively | High; V1 allows one compatible ordinal scale per contract |
| default state | global `defaultRiskState`, cloned into profile | CONTRACT REQUIRED; each driver | Domain; explicit initial level and score | profile fixtures | Medium; level and score must agree |
| initial driver scores | built from anchors unless supplied | EXECUTION INPUT with contract defaults | Scenario override; anchors are contract scale | engine input/outputs | Medium; reject incomplete/inconsistent pairs |
| actions and supported set | global `ACTION_EFFECTS` plus `DOMAIN_ACTIONS` | CONTRACT REQUIRED; contract actions | Domain; explicit | profile payload | High; supported list derived from actions, not separate |
| action deltas | global registry copied wholesale | CONTRACT REQUIRED; action effects | Domain; explicit, every driver known | profile payload | High; current payload contains unsupported references |
| canonical delta batching | `canonicalDriverDeltaBatch.ts` | ENGINE PROTOCOL | Generic; protocol | M0B engine/surface Goldens | Low; stable effect/instance/driver ordering and sum-without-rounding |
| propagation graph | global rules, filtered for municipal | CONTRACT REQUIRED; contract edges | Domain; explicit | profile payload/engine Goldens | High |
| trigger polarity/adverse levels | global impact specs/default tables | CONTRACT REQUIRED; driver adverse levels | Domain vocabulary; explicit | only transitive; algorithm assumption recorded | High; no fallback polarity |
| propagated severity | rule `level` | CONTRACT REQUIRED; edge output level | Domain; explicit | profile payload | Medium |
| propagation ordering | object/array insertion order | ENGINE PROTOCOL plus canonical edge ordering | Generic; protocol must define sort keys | engine Goldens | High; payload order must not accidentally define semantics |
| fixed point, severity order | `propagateRisks.ts` do/while and local rank | ENGINE PROTOCOL; ordered scale supplied by contract | Generic mechanism; scale explicit, algorithm protocol | Goldens/assumption record | High; termination validation required |
| event delay | hardcoded `delaySteps: 1`, event step `iteration + 1` | ENGINE PROTOCOL | Generic protocol constant | transitive outputs | Medium; version-lock semantics |
| impact mappings/dimensions/direction | impact contract and multiplier reducer | CONTRACT REQUIRED for mappings/dimensions; ENGINE PROTOCOL for multiply/divide | Domain mapping explicit; application operator protocol | profile/engine Goldens | High |
| curve selection/amplitudes | impact specs plus curve config | CONTRACT REQUIRED; one curve instance per impacted driver | Calibration; explicit | profile payload | High |
| exponential exponent; logistic k/x0 | hardcoded 1.2; 0.8/3 | CONTRACT REQUIRED curve parameters | Calibration/domain; explicit | algorithm assumption, transitive outputs | High; do not hide in generic protocol |
| missing/unsupported curve | `getImpactMultiplier` returns `1` | LEGACY GAP; V1 parser rejects | Legacy behavior; adapter-only fallback policy | explicitly NOT COVERED | Critical; focused baseline required |
| score anchors | `RISK_LEVEL_TO_SCORE` 0..3 | CONTRACT REQUIRED scale entries | Domain-compatible calibration; explicit | assumption and outputs | High |
| score clamp | `clampDriverScore` 0..3 | ENGINE PROTOCOL operation over explicit driver range | Generic mechanism; range explicit | assumption/outputs | Medium |
| materialization bands | `scoreToRiskLevel` (`<=.5`, `<1.5`, `<2.5`) | CONTRACT REQUIRED scale bands | Calibration; explicit | assumption/outputs | High |
| constraints | fixed registry plus profile subset | CONTRACT REQUIRED definitions | Domain; explicit | profile and engine Goldens | High |
| registry/default lifecycle | `createInitialConstraintRegistry` four fixed types | ENGINE PROTOCOL lifecycle mechanism; contract definitions instantiate registry | Mechanism generic, members domain-specific | assumption/outputs | High; no global registry completion |
| activation thresholds | refinancing flag/threshold | CONTRACT REQUIRED activation predicate | Domain/calibration; explicit | profile/outputs | High |
| `sustainThreshold` | undeclared value read from risk state; overrides threshold | LEGACY GAP — EXPLICIT MIGRATION DECISION | Neither valid driver nor generic mechanism | assumption, no focused contract | Critical; V1 rejects it; adapter may reproduce only under named protocol |
| sustain/deactivation | activation is one-way; no implemented recovery transition | CONTRACT REQUIRED policy + ENGINE PROTOCOL state machine | Policy explicit; transitions protocol | outputs where exercised | High; V1 must not imply recovery exists |
| active effects | profile multipliers with hardcoded fallbacks | CONTRACT REQUIRED | Domain; explicit | profile payload/outputs | High; V1 forbids missing effect values that runtime would default |
| lifecycle transitions | only refinancing INACTIVE→ACTIVE; other active states may arrive in registry | ENGINE PROTOCOL with explicit allowed transition table | Generic; protocol, configured policy | transitive | High |
| Structural Margin baseline/sensitivity | constructor baseline `1.0`; property `sensitivity = 1.2` is passed to `simulateConstraintsStep` but not read there | CONTRACT REQUIRED named measure; unused legacy field belongs only in adapter evidence, not native executable semantics | Baseline is domain/calibration explicit; generic update mechanics are protocol | assumption/outputs | Critical; exact legacy projection remains gated by M1C differential proof |
| measure input sources and coefficients | erosion reads post-constraint cost/recovery/load and a base-dimension pressure aggregate; weights `1.2`, `1.1`, `.45`, `.8` | CONTRACT REQUIRED measure terms and ENGINE PROTOCOL finite source/transform registry | References/weights explicit; source evaluation and update operator protocol-versioned | assumption/outputs | Critical; no hardcoded dimension lookup or arbitrary expression |
| recovery pull | `.12` to baseline | CONTRACT REQUIRED measure policy | Domain/calibration; explicit | assumption/outputs | High |
| margin clamp | profile `-3..3` | CONTRACT REQUIRED range, ENGINE PROTOCOL clamp | Range domain/calibration; explicit | profile payload/outputs | Medium |
| escalation rules | profile rules, engine hardcoded LOW/MODERATE branches | CONTRACT REQUIRED rules; protocol transition application | Domain policy explicit | profile/outputs | High; define behavior for every level |
| horizons/schedules/periods | `runCascadeAnalysis` and scheduling boundaries | EXECUTION INPUT | Run-specific; explicit in run, not domain contract | input and surface Goldens | Medium |
| action execution timing/order | before step; sort step/action ID | ENGINE PROTOCOL + EXECUTION INPUT | Schedule data input; order protocol | engine/surface Goldens | Medium |
| baseline behavior | optional input or default state; preconfigured runner | EXECUTION INPUT + ENGINE PROTOCOL | Run selection/input, generic trajectory | Goldens | Medium |
| comparison semantics | trajectory comparison and same-action-set checks | ENGINE PROTOCOL; observation contract may add policy | Generic/versioned | comparison Goldens | Medium |
| provenance | scheduled and initiative execution builders | PERSISTENCE/COMPATIBILITY + ENGINE PROTOCOL | Run output, deterministic protocol | provenance Goldens | Medium |
| Structural Observation definitions | `structuralObservation/contract*.ts` | OUT OF V1 domain model payload; separately versioned observation contract | Analysis-layer semantic artifact | V2 Golden | Medium; bind identity, do not merge schemas |
| prerequisites | initiative observation contract | EXECUTION INPUT / separate observation definition | Scenario/initiative-specific | V2 Golden | Low for M1 |
| resources/capacity | initiative observation contract | EXECUTION INPUT / separate observation definition | Scenario/initiative-specific | V2 Golden | Low for M1 |
| observation-only behavior | post-hoc observation functions | ENGINE PROTOCOL of observation subsystem, OUT OF V1 | Generic non-interference guarantee | V2 exact equality | High if coupled; preserve separation |
| presentation labels/groups | impact labels/groups, UI mappings | PRESENTATION ONLY; metadata | Nonsemantic | presentation tests, not semantic hash | Low |
| persistence identity/compatibility | `savedRunPersistence.ts` | PERSISTENCE/COMPATIBILITY | Generic rules with semantic identifiers | M0B V2 persistence Golden | High; add schema/protocol/hash and preserve legacy classification |

**VERIFIED.** `applyActionEffectsToRiskState` silently skips unknown actions and drivers absent from the initial score state, while scheduled execution rejects unknown actions and unsupported driver references. V1 must standardize on rejection at registration/parse time and never rely on either silent path.

## 4. Proposed Domain Model Contract V1

The schema below is TypeScript-like design, not implementation. Collections are arrays to permit strict duplicate detection before canonical projection. IDs use `^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$`, are case-sensitive, Unicode-normalized ASCII only, and are never trimmed or rewritten.

```ts
type Id = string;
type JsonNumber = number; // finite, not -0

type DomainModelContractV1 = Readonly<{
  schemaVersion: "domain-model-contract-v1";
  engineProtocolVersion: "pulse-domain-engine-protocol-v1";
  identity: {
    domainId: Id;
    profileId: Id;
    modelVersion: string;
    calibrationVersion: string;
    semanticPayloadHash: `sha256:${string}`;
  };
  semanticPayload: {
    scales: readonly OrdinalScale[];
    drivers: readonly DriverDefinition[];
    actions: readonly ActionDefinition[];
    propagation: PropagationDefinition;
    dimensions: readonly DimensionDefinition[];
    curves: readonly CurveDefinition[];
    constraints: readonly ConstraintDefinition[];
    measures: readonly NamedMeasureDefinition[];
  };
  metadata?: { name?: string; description?: string; labels?: Record<string,string> };
}>;

type OrdinalScale = {
  scaleId: Id;
  levels: readonly {
    levelId: Id; rank: number; anchor: JsonNumber;
    materialization: {
      minimumInclusive: JsonNumber;
      maximumExclusive?: JsonNumber; // required except on final level
      maximumInclusive?: JsonNumber; // required only on final level
    };
  }[];
};

type DriverDefinition = {
  driverId: Id;
  scaleId: Id;
  initial: { levelId: Id; score: JsonNumber };
  numericRange: { minimum: JsonNumber; maximum: JsonNumber };
  adverseLevelIds: readonly Id[];
  impacts: readonly { dimensionId: Id; direction: "increase"|"decrease"; curveId: Id }[];
};

type ActionDefinition = {
  actionId: Id;
  effects: readonly { driverId: Id; delta: JsonNumber }[]; // non-empty
};

type PropagationDefinition = {
  edges: readonly {
    edgeId: Id; sourceDriverId: Id; targetDriverId: Id;
    triggerLevelIds: readonly Id[]; propagatedLevelId: Id;
  }[];
  cyclePolicy: "reject"; selfEdgePolicy: "reject";
  duplicateEdgePolicy: "reject";
};

type DimensionDefinition = { dimensionId: Id; neutralValue: JsonNumber };
type CurveDefinition =
  | { curveId: Id; type: "linear"; amplitudeByLevel: Record<Id,JsonNumber> }
  | { curveId: Id; type: "exponential"; exponent: JsonNumber; amplitudeByLevel: Record<Id,JsonNumber> }
  | { curveId: Id; type: "logistic"; k: JsonNumber; x0: JsonNumber; amplitudeByLevel: Record<Id,JsonNumber> };

type ConstraintDefinition = {
  constraintId: Id;
  initialLifecycle: "inactive"|"active"|"recovering";
  activation: Predicate;
  sustain: Predicate | { kind: "until-explicit-transition" };
  deactivation: Predicate | { kind: "none" };
  allowedTransitions: readonly { from: string; to: string }[];
  activeEffects: readonly { dimensionId: Id; operation: "multiply"; value: JsonNumber }[];
};

type Predicate =
  | { kind: "measure-below"; measureId: Id; threshold: JsonNumber }
  | { kind: "driver-at-level"; driverId: Id; levelIds: readonly Id[] }
  | { kind: "all"|"any"; predicates: readonly Predicate[] };

type SupportedProtocolSignalId =
  | "base-dimension-pressure-sum-v1";

type MeasureTerm = {
  termId: Id;
  source:
    | { kind: "dimension"; dimensionId: Id; stage: "base"|"after-constraints" }
    | { kind: "aggregate-driver-pressure"; driverIds: readonly Id[] }
    | { kind: "current-measure-value" }
    | { kind: "measure"; measureId: Id }
    | { kind: "protocol-signal"; signalId: SupportedProtocolSignalId };
  transform:
    | "identity"
    | "deviation-from-neutral"
    | "positive-deviation-from-neutral"
    | "inverse-from-neutral";
  weight: JsonNumber;
};

type NamedMeasureDefinition = {
  measureId: Id;
  kind: "weighted-signal-aggregate-v1";
  updateOperator: "subtract-terms-add-recovery-v1";
  initialValue: JsonNumber;
  terms: readonly MeasureTerm[];
  recovery: {
    targetValue: JsonNumber;
    pull: JsonNumber;
  };
  range: { minimum: JsonNumber; maximum: JsonNumber };
  escalationRules: readonly {
    whenBelow: JsonNumber; driverId: Id;
    transitions: readonly { fromLevelId: Id; toLevelId: Id }[];
  }[];
};
```

### 4.1 Contract-bound decisions

- **PROPOSED:** `supportedActionIds` is not stored. It is exactly the set of `actions[].actionId`; a separate list creates the verified divergence seen today.
- **PROPOSED:** impact mappings refer to a `curveId`; curve type and all required parameters are explicit. Missing or unsupported curves reject.
- **PROPOSED:** propagation input is canonicalized independently of author order. The protocol sorts edges by source, target, propagated level and edge ID, then runs deterministic fixed point. V1 rejects duplicate `(source,target)` edges, self-edges and all cycles. Supporting cycles safely can be a later protocol version; legacy cyclic graphs require an explicit adapter/protocol exception and differential proof.
- **PROPOSED:** risk vocabulary is contract-defined but V1 requires one finite total ordinal order and non-overlapping, gap-free materialization bands. This permits another domain vocabulary without making the engine understand it.
- **PROPOSED:** adverse direction is explicit as `adverseLevelIds`; names such as `HIGH` or `LOW` carry no inferred polarity.
- **PROPOSED:** the validator recursively derives every driver and measure reference from constraint activation, sustain and deactivation predicates. `referencedDriverIds` is removed because it has no separate runtime meaning and could contradict those predicates.

### 4.2 Structural Margin decision

**PROPOSED:** replace the privileged `Structural Margin` concept with a named measure whose inputs are explicit references. Native V1 initially supports only `weighted-signal-aggregate-v1`, with the protocol-versioned update operator `subtract-terms-add-recovery-v1`. Each term has stable identity, a closed source discriminant, a closed transform and a finite weight. Dimension sources identify both `dimensionId` and evaluation stage; aggregate-driver sources enumerate contract driver IDs; measure sources name another measure; protocol-signal sources use the finite `SupportedProtocolSignalId` registry. `current-measure-value` means only the measure being evaluated and cannot name another measure. No source is discovered by a hardcoded name. The validator builds the directed measure-reference graph and rejects every direct or indirect cycle before registration.

The exact runtime formula is:

```text
riskPressure = (base.load - 1) + (base.cost - 1)
             + (1 - base.recovery) + (base.sensitivity - 1)
erosion = 1.2 * (adjusted.cost - 1)
        + 1.1 * (1 - adjusted.recovery)
        + 0.45 * max(0, adjusted.load - 1)
        + 0.8 * riskPressure
next = clamp(current - erosion + 0.12 * (1.0 - current), -3, 3)
```

A candidate legacy adapter projection therefore binds four terms: post-constraint `cost` with `deviation-from-neutral`/`1.2`; post-constraint `recovery` with `inverse-from-neutral`/`1.1`; post-constraint `load` with `positive-deviation-from-neutral`/`0.45`; and protocol signal `base-dimension-pressure-sum-v1` with `identity`/`0.8`. Recovery targets `1.0` with pull `0.12`; range is `[-3,3]`. The signal is defined by `pulse-domain-engine-protocol-v1` as the ordered sum of deviation-from-neutral for base load and cost plus inverse-from-neutral for base recovery plus deviation-from-neutral for base sensitivity. It is a finite, versioned protocol signal, not a dimension-name convention.

**BLOCKER BEFORE RUNTIME SWITCH:** this candidate is not declared parity-complete until M1C projects the legacy profile and M1D proves it against M0B. The runtime's stored `sensitivity = 1.2` is currently passed into `simulateConstraintsStep` but not consumed; the adapter must record that fact without inventing native semantics. If differential work shows the generic operator cannot reproduce legacy behavior exactly, M1C must introduce an explicitly named and versioned `legacy-structural-margin-v1` measure kind. Such a kind is compatibility behavior, not a universally domain-neutral mechanic.

Making Structural Margin an engine-global measure would leak one pilot's assumptions into all domains. Allowing arbitrary executable formulas, `eval`, scripts, user-defined operators or nested expression trees in JSON is forbidden. A finite, versioned registry of measure kinds, update operators, source kinds, transforms and protocol signals is the narrow middle. Unknown values or references reject. Historical/future domains may use a supported kind or await a later schema/protocol; new mechanics require engine review and a protocol/version change.

## 5. Semantic identity

`semanticPayloadHash = "sha256:" + SHA256(canonical-json-v1(semanticIdentityProjection))`, where the projection contains, and only contains:

```text
schemaVersion
engineProtocolVersion
identity.domainId
identity.profileId
identity.modelVersion
identity.calibrationVersion
semanticPayload (all nested semantic fields)
```

The hash field itself is excluded to avoid recursion. `metadata`, labels, descriptions, author, timestamps, source URLs, review notes, UI grouping/order/color/layout, signatures and registry status are excluded. Array order is semantic only where explicitly stated (ordinal levels and transition order); set-like arrays are canonicalized by stable ID/key. Duplicate entries reject before canonicalization. The canonicalizer must retain M0B guarantees: sorted object keys, UTF-8 bytes, preserved semantic array order, finite JSON-only values, no `undefined`, bigint, symbols, accessors, sparse arrays, extra properties, class instances, cycles, NaN, Infinity or `-0`.

**PROPOSED collision rule:** `(domainId, profileId, modelVersion, calibrationVersion, schemaVersion, engineProtocolVersion)` may bind exactly one hash. A changed semantic payload must change at least `modelVersion` or `calibrationVersion`; the registry rejects reuse with another hash. Metadata-only edits retain the hash and semantic identity.

## 6. Parse result and deterministic errors

```ts
type ContractIssue = Readonly<{
  code: string;       // stable kebab-case machine code
  path: string;       // JSON Pointer, root is ""
  message: string;    // deterministic English diagnostic
}>;
type ParseResult<T> =
  | Readonly<{ ok: true; value: DeepReadonly<T>; semanticPayloadHash: string }>
  | Readonly<{ ok: false; issues: readonly ContractIssue[] }>;
```

Parsing never throws for data errors, never returns a partial executable contract, deep-clones and recursively freezes success output, and sorts issues by path, code, then message using code-unit lexical order. Resource-limit failure may short-circuit with one deterministic root issue. Programmer/environment faults may throw and are not converted into validation success.

## 7. Trust boundary and ingestion

```text
raw input
  -> strict structural parse
  -> semantic validation + hash verification
  -> review/approval outside the parser
  -> trusted registry (identity/hash collision check)
  -> immutable executable contract
  -> runtime, pinned to supported engine protocol
```

| Trust level | Structural/parser and unknown fields | Semantic/version/limits | Registry/execution |
|---|---|---|---|
| Built-in developer-authored | Same strict parser; closed objects; no type assertions as validation | Full semantic validation; exact supported schema/protocol; repository-defined conservative limits; frozen detached result | Build/test-reviewed registration; collision rejects; execution allowed only after registered |
| Imported reviewed | Same parser; unknown fields reject | Full validation/hash; supported versions only; stricter file/count/depth/string/numeric limits; documented review record | Explicit trusted registration required; collision rejects; execution allowed after approval and signature/source policy |
| Untrusted external/user data | Parse as hostile bytes; JSON only; unknown fields reject; bounded parser | Full validation, exact versions, strictest limits; no adapter; no automatic migration | Never executable merely because valid; quarantine/display errors, then independent review and registration |

Native V1 limits are locked constants: 1 MiB UTF-8 input; depth 32; 256 drivers; 256 actions; 32 effects/action; 2,048 edges; 128 curves; 64 constraints; 64 measures; 256 measure terms in total and 64 terms/measure; IDs 1–96 ASCII characters; metadata strings 4 KiB; every numeric value finite, non-negative where required, and absolute magnitude at most `1e6`. Reject unknown fields at every semantic object. Registries are append-only by semantic identity; a collision is never last-write-wins. Changing a limit requires a later schema/protocol version, not a local parser preference.

## 8. Validation matrix

| Rule | V1 disposition | Required behavior |
|---|---|---|
| unknown/missing fields | Reject | Closed schema at every object; optional means explicitly listed |
| duplicate IDs | Reject | Across each namespace; no last-write-wins |
| invalid IDs | Reject | Exact ASCII pattern/length; no trim/case normalization |
| unsupported `schemaVersion` | Reject | No best-effort parsing |
| empty collections | Reject | Native V1 requires non-empty scales, drivers, actions and dimensions; `weighted-signal-aggregate-v1` requires non-empty terms |
| undefined/non-JSON; NaN/Infinity/-0 | Reject | At raw-value boundary and canonicalizer |
| unknown driver/action/constraint refs | Reject | All references resolve locally; execution inputs also validate action IDs |
| duplicate propagation edges | Reject | Same source/target, regardless of edge ID |
| self-edges | Reject | V1 |
| cycles | Reject | V1; adapter-only for a proven legacy graph if needed |
| invalid risk levels | Reject | Must resolve to driver scale and be rank/band-valid |
| invalid ranges | Reject | finite min < max; initial and anchors in range |
| invalid curve parameters | Reject | exponent finite > 0; logistic finite `k != 0`, finite x0 |
| missing/unsupported curve | Reject | Legacy adapter only with explicit fallback policy/version |
| invalid amplitude | Reject | finite and > 0; complete for every scale level |
| invalid thresholds | Reject | finite and in referenced measure/driver domain |
| impossible clamps | Reject | min < max; initial value within clamp |
| invalid lifecycle config | Reject | known states, unique transitions, activation path possible; no implicit transition |
| action with no effects | Reject | No no-op actions in V1 |
| identity/version collision | Reject | Same tuple cannot bind different hash |
| semantic hash mismatch | Reject | Recompute after validation/canonicalization |
| unsafe scale/size | Reject | Deterministic limit code; never partially register |
| mutation after parse | Prevent/reject registration | Detached recursive freeze; registry verifies frozen/hash-bound value |
| inconsistent initial level/score | Reject | Score must materialize to declared level |
| duplicate action effects for driver | Reject | Author supplies one canonical delta per driver |
| unknown dimension/curve | Reject | Local reference integrity |
| unknown measure source kind | Reject | Closed source-kind registry; no extension by spelling convention |
| unknown protocol signal | Reject | Must be in the finite registry of the exact `engineProtocolVersion` |
| unknown measure transform/update operator | Reject | Closed versioned registries; no arbitrary expressions or scripts |
| unknown measure source reference | Reject | Dimension, driver and measure IDs resolve locally; stage is supported |
| duplicate measure `termId` | Reject | Duplicate rejection precedes stable-key canonicalization |
| empty measure terms | Reject | Required for `weighted-signal-aggregate-v1` |
| measure dependency cycle | Reject | Native V1; includes direct and indirect current/other-measure dependencies |
| constraint predicate reference | Reject if unresolved | Validator recursively derives references from activation/sustain/deactivation; no redundant declared reference list |
| propagation trigger empty | Reject | No inert edge definitions |
| presentation metadata malformed | Reject structurally, but exclude from semantic hash | Metadata cannot change execution |
| legacy silent normalization | Allowed only through explicit legacy adapter | Adapter emits diagnostics and named adapter version |

## 9. Legacy gaps

The verified gaps are:

- Real Estate supported actions reference `implementationPacingRisk` and `liquidityPressure`, absent from `applicableDrivers`.
- Municipal and Consulting supported actions reference `modal_shift_pressure` and `political_feasibility`, absent from `applicableDrivers`.

**PROPOSED recommendation for V1:** none of these names may be auto-created, globally resolved or silently filtered. A native V1 profile containing those actions is invalid until the profile owner chooses one of two semantic repairs: define reviewed drivers completely (scale/default/score/polarity/range/impacts as applicable), or remove the affected action from that profile and version the semantic change. M1A does not choose causal meaning on insufficient evidence.

For M1C parity only, use an explicit `legacy-profile-projection-v1` adapter that can represent the inconsistency as a declared `ignoredUnknownDriverDelta` compatibility rule bound to the exact legacy profile identity/hash. It must list each ignored `(profileId, actionId, driverId)` tuple, produce deterministic diagnostics, never apply to native/imported V1 contracts, and never manufacture a driver. This preserves M0B without blessing the gap as V1 semantics.

**M1B DECISION LOCK:** the adapter is a separate versioned envelope, not a native contract mode. M1B may define only the envelope discriminant/type if needed to prove version separation; it does not project legacy profiles. Native V1 therefore rejects these gaps. M1C owns the explicit compatibility representation.

**OPEN DECISION before first external profile:** domain owners must decide each gap's real semantic repair. No M0B Golden is changed in making that decision; a changed native profile receives new identity and its own expected results.

## 10. Curve fallback decision

**VERIFIED current behavior and anchor:** `curveConfig.ts::getImpactMultiplier` performs `const config = curveConfiguration[parameterKey]; if (!config) return 1`. Missing configuration therefore yields a neutral multiplier of `1`. When a config exists but `curve` reaches the switch default, it also returns `1`; TypeScript types make that unreachable for typed built-ins, but unvalidated runtime data or casts can reach it. These are two distinct cases with the same current result.

It is neither an error nor a default curve. It is a neutral multiplier. Because `computeDimensionMultipliers` continues applying the returned value, the corresponding impact is an effective no-op. M0B states this specific fallback is **NOT COVERED** by a focused baseline.

**PROPOSED:** native V1 requires every referenced curve to exist and have a supported discriminant and complete valid parameters; missing and unsupported reject with distinct codes (`missing-curve-reference`, `unsupported-curve-type`). Only the exact legacy adapter may declare `curveFallbackPolicy: "neutral-multiplier-v1"`, bound to its adapter/protocol identity.

**BLOCKER BEFORE RUNTIME SWITCH:** add a focused baseline that separately exercises (a) an impact driver absent from curve configuration and (b) a present configuration with an unsupported runtime discriminant, and locks multiplier `1`, unchanged dimension aggregation, deterministic output, and no mutation. Then either preserve that behavior solely in the adapter or approve a versioned intentional delta. Do not implement or update that baseline in M1A.

## 11. Versioning and compatibility

- `schemaVersion` versions syntax and validation meaning. Unsupported major/exact identifiers reject; V1 has no permissive minor negotiation.
- `engineProtocolVersion` versions every mechanic outside the payload: batching, application order, fixed-point/order/event timing, lifecycle execution, trajectory/comparison, canonicalization reference and supported measure/curve kinds.
- `modelVersion` changes for causal topology, driver/action/constraint membership, propagation, impacts, formulas or other structural semantics.
- `calibrationVersion` changes for numeric anchors, bands, deltas, amplitudes, curve parameters, thresholds, coefficients or clamps without structural topology change.
- `semanticPayloadHash` is the final content binding. Versions are human-governed labels; the hash detects reuse or drift.
- Same domain/profile may coexist across model/calibration versions. The full identity tuple plus hash is immutable.
- A calibration change is comparable only under an explicit comparison policy and matching model/protocol; it is never silently treated as identical. A semantic hash change always needs a version change.
- Saved runs persist schema, protocol, four-part identity, semantic hash and execution-input identity. Direct replay requires the exact registered hash/protocol. Cross-version comparison requires an explicit compatibility declaration; otherwise classify non-comparable.
- Old identities remain readable and are classified `legacy-or-unknown` unless an exact legacy identity/hash adapter is registered. Migration produces a new record referencing source identity; it does not rewrite history.
- Legacy and contract-backed profiles may coexist behind explicit registry keys. Profile-less input continues only through the named legacy compatibility path until retired; it must never resolve to an arbitrary latest profile.

## 12. Migration checkpoints

Estimates are engineering time after review, not commitments.

| Checkpoint | Scope and allowed files | Forbidden changes | Tests/gates | Stop conditions | Estimate / risk |
|---|---|---|---|---|---|
| M1B test-only schema/types/parser | Native V1 types; strict structural/semantic parser; canonical semantic projection/hash; one synthetic domain-neutral fixture; deterministic errors; locked size/range limits. New isolated test-support contract module, fixtures and tests; audit update only if separately authorized | Legacy adapter implementation/projection/parity; runtime registry/execution; external ingestion; arbitrary measure formulas; runtime/profile imports or switches; Golden rewrites; package changes | Closed parser, semantic matrix, stable-key canonical hash, freezing, deterministic issues, limits, measure source/reference/registry validation | Any contradiction in the locked native decisions or inability to define the minimal measure kind completely; legacy parity is not an M1B stop condition | 3–5 days / High |
| M1C legacy adapter/projection | Test-support adapter and exact projections for three profiles; new adapter fixtures/tests | Runtime selection; global normalization; altering M0B fixtures/Goldens | Exact field inventory, explicit gap diagnostics, exact legacy identity/hash, missing semantics surfaced | Any unlisted dropped/defaulted value; gap policy not approved | 3–5 days / High |
| M1D differential contract execution harness | Test-only executor/harness and differential tests using registered built-ins | Production runtime switch; accepting mismatches; Golden update mode | All six engine Goldens, surfaces, provenance, persistence and Structural Observation non-interference; mismatch report | Any unexplained byte/numeric/ordering/identity delta | 5–8 days / Critical |
| M1E curve fallback baseline/resolution | Focused tests/fixtures and decision record | Broad runtime refactor; unrelated Golden edits | Separate missing/unsupported cases, neutral legacy behavior, adapter/native rejection split | Baseline absent or fallback ownership unresolved | 1–2 days / High |
| M2 first gated runtime integration | Small feature-gated built-in contract path and registry; only enumerated runtime/test files | Default switch, external ingestion, removal of legacy path, silent fallback | Differential suite, complete regression twice, typecheck/lint, persistence compatibility, rollback flag | Any M0B mismatch without approved new version; incomplete observability/rollback | 5–10 days / Critical |
| M3 first external/historical profile | One reviewed profile, ingestion/quarantine/registry and domain-specific evidence artifacts | Claims of validation/publication based only on schema; auto-execution | parser limits/security, domain review, calibration validation, scenario plausibility, provenance | Missing research provenance, causal review, calibration or publication approval | 2–6 weeks+ / Critical |

Exact allowed-file lists should be fixed in each checkpoint brief. M1B and M1C must not import testSupport into runtime. No checkpoint may regenerate M0B expectations from actual output in the same run.

## 13. Historical cases and pilot readiness

The contract makes it technically possible to express stable drivers, actions, causal propagation, impacts, constraints and named measures for Hallandsåsen 1996–1997, Great Western Route Modernisation, and a future actual pilot without adding domain-name branches to the engine. It can also bind source/model/calibration versions so later revisions do not overwrite prior claims.

That technical expressiveness is not evidence that any case is already modeled. Each case separately requires source research and data-quality assessment, historically appropriate time and state definitions, calibrated numeric values, expert review of the causal model, uncertainty and sensitivity work, and publication/legal/communications review. A future pilot additionally needs agreed decision questions, data governance, operational validation and monitored limitations. Schema-valid means structurally executable after trust registration; it does not mean true, calibrated, reviewed, useful or publication-ready.

## 14. Decisions and open questions

### 14.1 Recommended decisions to lock now

1. Use a closed, JSON-only, immutable V1 with explicit engine protocol reference and content hash.
2. Contract owns domain/calibration semantics; protocol owns deterministic mechanisms; run input, presentation and persistence remain separate.
3. Derive supported actions from the action collection.
4. Require all references to resolve; prohibit global-registry normalization and silent filtering.
5. Use contract-defined ordinal scales/adverse levels/materialization bands.
6. Use generic named measure kinds; represent legacy Structural Margin as configured semantics, not engine-global truth.
7. Reject missing/unsupported curves natively; permit neutral fallback only in an exact versioned legacy adapter.
8. Reject duplicate edges, self-edges and cycles in native V1.
9. Bind each version identity to exactly one semantic hash.
10. Require reviewed trusted registration after validation; validation alone never authorizes execution.

### 14.2 M1B decision lock

The following decisions are locked for the test-only native V1 parser:

1. Duplicate rejection happens before canonicalization. Every set-like array is then canonicalized by its documented stable semantic key: IDs by ID; action effects by `driverId`; impacts by `(dimensionId,direction,curveId)`; propagation edges by `(sourceDriverId,targetDriverId)`; transitions by `(from,to)`; measure terms by `termId`; and reference-ID arrays by ID. Author/display order belongs only in presentation metadata and does not affect `semanticPayloadHash`.
2. Native V1 requires at least one action. Zero-action/non-actionable profiles are deferred to a later `schemaVersion`.
3. Materialization bands are contiguous half-open intervals `[minimumInclusive, maximumExclusive)`, except the final level, which uses `[minimumInclusive, maximumInclusive]`. Bands must be rank-ordered, non-overlapping, gap-free and exactly cover the driver's numeric range.
4. The limits in section 7 are exact native V1 constants.
5. The legacy adapter is a separate versioned envelope, never a native contract mode. M1B may type the envelope discriminant for separation but does not implement or populate it.
6. Native V1's initial measure registry contains only `weighted-signal-aggregate-v1`, with the closed source, transform, update-operator and protocol-signal registries shown in section 4. If it cannot be fully validated in M1B, M1B stops; it is not replaced by arbitrary formulas. A legacy-only kind, if differential proof requires one, belongs to M1C and is explicitly non-universal.
7. Native V1 rejects every propagation cycle, every self-edge and every duplicate source/target edge. Any conflicting legacy graph is an explicit M1C adapter need, never silently normalized.
8. Missing and unsupported curves reject separately as `missing-curve-reference` and `unsupported-curve-type`. Legacy neutral fallback belongs only to the separate adapter and remains gated by M1E.
9. `supportedActionIds` is exactly derived from non-empty `actions` and is not stored separately.
10. Constraint driver/measure references are derived recursively from activation, sustain and deactivation predicates and validated; `referencedDriverIds` is not part of native V1.

These locks deliberately define native V1 even where legacy differs. They do not change M0B: action/driver gaps, possible graph-order/cycle requirements, `sustainThreshold`, neutral curve fallback, and exact Structural Margin projection remain explicit M1C/M1D/M1E compatibility work.

### 14.3 Questions that must be decided before M1B

None. No unresolved technical safety or schema-design choice blocks the test-only native V1 work described here. A new product requirement that native V1 support non-actionable profiles would require Christian's product decision and a schema revision; it is not assumed by M1B.

### 14.4 Questions that may wait to M1C/M1D

- Exact adapter tuple list and representation of `sustainThreshold` compatibility.
- Whether legacy event ordering must preserve insertion order internally or can be projected to canonical order with identical outputs.
- Exact compatibility declarations for cross-calibration comparisons.
- Retirement timing for profile-less legacy input.

### 14.5 Blockers before first runtime switch

- Approved V1 schema/protocol/hash boundary and strict parser.
- Explicit legacy-gap adapter/repair decision.
- Focused curve-fallback baseline and resolution.
- Complete legacy projection with no unreported defaults/drops.
- Differential equality against all M0B engine, surface, provenance, persistence and observation protections.
- Registry collision, immutable parse and saved-run compatibility implementation.
- Full regression/determinism checks and rollback gate.

### 14.6 Blockers before first external profile

- Hostile-input limits and quarantine path.
- Review/approval and trusted registration workflow.
- Source provenance, causal-model review and calibration evidence.
- Identity/signature/change-control policy.
- Domain-specific validation and publication readiness decision.
- No unresolved legacy adapter semantics in external ingestion.

### 14.7 Recommended exact scope for the next Cody assignment

**M1B: test-only native Domain Model Contract V1 schema, canonical semantic projection and strict parser.** Allow only a new isolated directory under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/` containing native types, strict structural/semantic parser, canonical projection/hash, one schema-valid synthetic domain-neutral fixture and focused tests, plus one M1B audit file. Reuse the existing M0B canonical JSON/hash implementation from testSupport. Implement every V1 rejection in section 8, deterministic issue ordering, recursive detachment/freezing, the exact size/range limits, identity/hash verification and collision-unit tests. Implement the locked stable semantic keys and the minimal closed measure registries. Do not implement a legacy adapter or legacy parity, runtime registry, runtime execution, external ingestion, arbitrary formulas, production imports, package changes, or any M0B fixture/Golden change. An adapter-envelope discriminant/type may be defined only if needed to demonstrate clean version separation; no legacy profile may be projected through it in M1B.

## 15. Final audit status

**VERIFIED:** M0B authorizes contract implementation work, not runtime adoption.  
**PROPOSED:** the V1 boundary and schema above are sufficient to begin a test-only M1B after its listed decisions are reviewed.  
**BLOCKER BEFORE RUNTIME SWITCH:** M1C–M1E and differential/persistence gates remain mandatory.  
**BLOCKER BEFORE EXTERNAL PROFILE:** trust registration, evidence, calibration and publication review remain mandatory.
