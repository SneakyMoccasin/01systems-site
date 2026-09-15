# Domain Model Contract M1D legacy registry parity decision

## 1. Executive conclusion

The repository supports **Alternative A: an explicit compatibility registry declaration**. The declaration belongs in the profile-local, structurally validated, semantically validated and hash-verified M1C compatibility sidecar. It must describe the legacy-only registry representation that compatibility-effective execution materializes at its output adapter boundary. It must not add constraints to native V1 state or native V1 semantic payload.

The evidence does not support Alternative C. `LiquidityConstraint`, `CovenantConstraint` and `Custom` have no public activation transition. They are observable legacy runtime placeholders, not demonstrated native domain constraints. Alternative B could be designed, but the current sidecar does not authorize output exclusion or describe a versioned parity projection. More importantly, it would compare less than the full output even though the missing representation can be declared precisely. Alternative A preserves strict, lossless Comparator A coverage.

For Real Estate (RE) and Consulting (CO), the declaration must contain `LiquidityConstraint`, `CovenantConstraint` and `Custom`. For Municipal (MU), native V1 has no refinancing constraint, so its compatibility registry declaration must additionally contain `RefinancingConstraint`. All declared compatibility entries remain separate from native state.

**Verdict: READY FOR M1C COMPATIBILITY REGISTRY AMENDMENT**

## 2. Verified repository state

The audit began from:

- repository: `/Users/christian/Projects/pulse_engine_clean`;
- branch: `decision-flow-demo-v1`;
- HEAD: `499604bde22d5adfd025ebf7d9f248357c9701b2`;
- `origin`: `git@github.com:SneakyMoccasin/01systems-site.git`;
- index: empty;
- working tree: exactly the six untracked M1D-2a files under `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/`.

The six M1D-2a files were hashed before the audit:

| File | SHA-256 |
| --- | --- |
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `9e70c45f8a2595d21697a76ba0835cf017966dea0c4cf09b629f5d26f872b33d` |
| `differentialExecutionV1.ts` | `432839e2f3ad23e04dd4709c7e03ba56e7969f9a1c15d40339f8319398592424` |
| `domainModelDifferentialV1.test.ts` | `538e25893fdea1676e42b9b20d45b4b38c1f5287df7ea6a058e37d5403610afd` |
| `executeVerifiedNativeProjectionV1.ts` | `c48429f84e64babf4f5c3511566c813d6edac68b54896c041514fb6d2b53a154` |
| `runCompatibilityCounterfactualV1.ts` | `b13fcd5f2955d6609c0e7a7a21e076d2395ea03619cdae7fa3926d443c3389d8` |
| `runDomainModelDifferentialV1.ts` | `a9e051366ee301271c90dc9e34453a748f848f625bbdcf53ef2801de029b83ae` |

This audit does not treat untracked M1D code as repository authority. Its conclusions come from tracked production code, tracked M0B/M1B/M1C evidence and read-only executions of existing engine fixtures.

## 3. Exact blocker

`runEngineBaselineFixtureV1` projects the complete output returned by `runCascadeAnalysis`; `scenarioProjection` clones trajectory, terminal state, constraint history and cascade history without removing registry fields (`src/pilotFastighet/analysis/testSupport/engineOutputProjectionV1.ts:124-130`). A read-only neutral RE execution shows four entries at step 1 in scenario A, scenario B and baseline:

| Registry key | `type` | `lifecycle` | `activatedAtStep` | `lastUpdatedStep` |
| --- | --- | --- | --- | --- |
| `RefinancingConstraint` | `RefinancingConstraint` | `INACTIVE` | absent | `0` |
| `LiquidityConstraint` | `LiquidityConstraint` | `INACTIVE` | absent | `0` |
| `CovenantConstraint` | `CovenantConstraint` | `INACTIVE` | absent | `0` |
| `Custom` | `Custom` | `INACTIVE` | absent | `0` |

The same entries occur at:

- `/scenarioA/trajectory/<step>/registry` and `/scenarioA/constraintHistory/<step>`;
- `/scenarioB/trajectory/<step>/registry` and `/scenarioB/constraintHistory/<step>`;
- `/baseline/trajectory/<step>/registry` and `/baseline/constraintHistory/<step>`;
- each scenario's `/terminalState/registry`.

The RE native V1 contract declares only `refinancing-constraint` (`src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json:1011`). The current sidecar records excluded source values for the other keys, but it does not declare their output representation. A candidate cannot derive the three missing objects from an irreversible hash. Filtering them out makes Comparator A lossy; reconstructing them from live legacy code makes the candidate circular.

## 4. Registry implementation inventory

### 4.1 Type and constructor

`src/pilotFastighet/constraintState.ts:1-43` defines:

- the closed `ConstraintType` union: `RefinancingConstraint`, `LiquidityConstraint`, `CovenantConstraint`, `Custom`;
- lifecycle values `INACTIVE`, `ACTIVE`, `RECOVERING`;
- `ConstraintState` with `type`, `lifecycle`, optional `activatedAtStep` and `lastUpdatedStep`;
- `ConstraintRegistry` as `Record<ConstraintType, ConstraintState>`;
- `createInitialConstraintRegistry()`, which constructs all four entries in the order shown above, each as `INACTIVE`, without `activatedAtStep`, at step `0`.

This constructor is the authoritative source for the placeholder state shape. It is global rather than profile-local.

### 4.2 Engine construction and reset

`src/pilotFastighet/RealEstateEngine.ts:54-65` constructs a fresh registry with `createInitialConstraintRegistry()`. `RealEstateEngine.reset()` recreates it (`src/pilotFastighet/RealEstateEngine.ts:115-121`). The constructor accepts risk state, driver scores and an executable profile, but no registry. `setRiskState` resets the engine and therefore also recreates the registry. `runCascadeAnalysis` creates engines through this boundary and has no registry input.

The page also creates the same initial registry for local initial/display states at `app/pilot-fastighet/page.tsx:745`, `:756` and `:858`. These uses reinforce the stable legacy representation; they do not add activation semantics.

### 4.3 Reads, writes and transitions

`src/pilotFastighet/simulateConstraintsStep.ts:42-68` shallow-clones the registry and contains the only production activation write: `RefinancingConstraint` changes to `ACTIVE`, receives `activatedAtStep`, and sets `lastUpdatedStep` to the source step when margin is strictly below the effective threshold and refinancing is enabled.

The same function reads active states to apply effects:

- `RefinancingConstraint`: `src/pilotFastighet/simulateConstraintsStep.ts:71-81`;
- `LiquidityConstraint`: `src/pilotFastighet/simulateConstraintsStep.ts:83-91`;
- `CovenantConstraint`: `src/pilotFastighet/simulateConstraintsStep.ts:93-100`.

There is no production write that activates, recovers, deactivates or updates `LiquidityConstraint` or `CovenantConstraint`. `Custom` has neither an activation write nor an effect branch. No production transition to `RECOVERING` was found for any registry entry. The effect reads for Liquidity/Covenant are latent internal behavior if an already-active registry were passed directly to `simulateConstraintsStep`, but no public engine path accepts such a registry.

`RealEstateEngine.stepForward()` passes its internally constructed registry to `simulateConstraintsStep` and stores `updatedRegistry` in the next engine state (`src/pilotFastighet/RealEstateEngine.ts:172-181`, `:289-297`). Caller-controlled risk state can affect refinancing through margin and `sustainThreshold`; it cannot inject or activate the three placeholder entries through the public engine boundary.

### 4.4 Serialization and engine-output projection

`src/pilotFastighet/analysis/testSupport/engineOutputProjectionV1.ts:124-130` preserves full registry-bearing trajectory and terminal state, and clones full `constraintHistory`. `engineOutputGoldenV1.test.ts:43-50` hashes trajectory, terminal state and constraint history, so the placeholder entries are part of tracked observable output identity even though the compact Golden JSON stores hashes rather than expanded states.

The six M0B engine fixtures cover RE, MU and CO in neutral and stressed/scheduled forms. Read-only execution found no Liquidity/Covenant/Custom state other than `INACTIVE`, no `activatedAtStep`, `lastUpdatedStep: 0`. RE/CO refinancing activates in stressed runs; MU refinancing remains inactive because the profile disables it.

## 5. Per-profile behavior

| Profile | Native V1 constraints | Legacy-only registry entries required in compatibility declaration | Observed behavior across current M0B cases |
| --- | --- | --- | --- |
| RE (`legacy-real-estate-v1`) | `refinancing-constraint` | Liquidity, Covenant, Custom | all three always `INACTIVE`, no activation step, update step `0`; refinancing may activate in stressed execution |
| MU (`legacy-municipal-v1`) | none | Refinancing, Liquidity, Covenant, Custom | all four always `INACTIVE`, no activation step, update step `0` |
| CO (`legacy-consulting-v1`) | `refinancing-constraint` | Liquidity, Covenant, Custom | all three always `INACTIVE`, no activation step, update step `0`; refinancing may activate in stressed execution |

The same three-placeholder set applies to RE, MU and CO because the registry constructor is global. MU additionally needs a compatibility representation of `RefinancingConstraint`: its native contract correctly omits unreachable refinancing semantics, while the legacy engine still emits the global registry placeholder.

Profile source payloads declare Liquidity and Covenant active-effect coefficients for all three profiles (`src/pilotFastighet/analysis/testSupport/fixtures/legacy-domain-profile-semantic-payload-v1/legacy-real-estate-v1.json:318-334`, municipal `:194-210`, consulting `:320-336`). Those coefficients are not evidence of a reachable lifecycle transition. They remain separately covered by the source semantic payload and current excluded-value evidence.

## 6. Downstream observability

The registry is observable beyond the engine internals:

- `runCascadeAnalysis` returns registry-bearing engine states in trajectory, terminal state and constraint history.
- Engine-output projection and M0B hashes preserve those surfaces.
- Saved runs store an `EngineState` directly (`src/pilotFastighet/analysis/savedRunPersistence.ts:13-26`, `:35-72`). `readSavedRunHistory` tolerantly restores it for display/comparison (`:99-130`). It does not feed the restored registry into a new engine execution.
- Structural observation derives active constraints from `Object.values(state.registry)` (`src/pilotFastighet/analysis/structuralObservation/prepareStructuralObservationRun.ts:266-289`). Inactive placeholders are observed as absent from the active subset; unexpected activation would become structurally visible.
- The inspector timeline accepts a partial registry, filters for `APPROACHING`/`ACTIVE`, maps all four types and sorts visible activations (`app/pilot-fastighet/components/inspector-utils/buildConstraintActivationTimeline.ts:18-73`).
- The page supplies full scenario registries to inspector surfaces (`app/pilot-fastighet/page.tsx:1184-1196`, `:3667-3711`). Saved-run summary text directly reads refinancing lifecycle (`:4471-4473`).
- `AIInspectorPanel` receives registry references for both scenarios (`app/pilot-fastighet/components/AIInspectorPanel.tsx:1617-1618`).

Thus the placeholders are downstream-observable representation. Their current inertness matters: unexpected lifecycle, activation step, update step, absence or addition must fail evidence checks. They are not merely private allocation details.

## 7. Meaning of current `excludedSourceValues`

`projectLegacyProfileToDomainModelContractV1.ts:59-60` constructs current constraint exclusions:

- Liquidity: hash of `source.constraints.activeEffects.LiquidityConstraint`;
- Covenant: hash of `source.constraints.activeEffects.CovenantConstraint`;
- Custom: hash of the literal registry state `{type:"Custom", lifecycle:"INACTIVE", lastUpdatedStep:0}`;
- MU refinancing: hash of `{enabled:false, threshold, effects}`.

The shared M0B `hashBaselineValueV1` supplies these hashes. `validateLegacyProfileProjectionEnvelopeV1Semantics.ts:40` independently reconstructs and checks the same expected set. The M1C design classifies them as unreachable source semantics, not as permission to erase downstream output (`docs/audits/domain-model-contract-m1c-legacy-adapter-design.md:208-217`).

Consequences:

- Liquidity/Covenant hashes prove preservation of excluded effect definitions, not the emitted registry state.
- The MU refinancing hash proves the excluded profile configuration, not the global inactive registry object.
- Only the Custom hash happens to cover its initial object shape; its existing declaration still lacks materialization scope and cross-step invariants.
- None of the entries declares output admission, ordering, scenario coverage, cadence or an immutability rule.

Current `excludedSourceValues` is therefore necessary source-accounting evidence but insufficient compatibility-output evidence. It must remain; the proposed declaration complements rather than replaces it.

## 8. Evaluation of alternatives A/B/C

### 8.1 Alternative A — explicit compatibility registry declaration

This is supported. The constructor provides exact representation; exhaustive tracked search and all six M0B cases show the non-native entries are inert on public execution paths; existing M1C evidence already identifies why their domain behavior was excluded. A separate declaration can bind the representation to exact source evidence and output surfaces without moving it into native V1.

Risks are controllable through closed schema, profile-local exact-set validation, exact state hashes, fixed order and negative tests. The declaration must be described as output compatibility materialization, never as activation/effect semantics.

### 8.2 Alternative B — explicit semantic comparison projection

The current M1C sidecar is insufficient for this option. `excludedSourceValues` does not declare that an output path may be excluded, does not define the common semantic projection and does not establish per-step inertness. Treating it as an allowlist would be output-derived admission and would repeat the lossy normalization defect.

A future independently versioned projection could preserve raw observations and separately verify inertness, but it would require new declaration and comparator machinery comparable in size to Alternative A while deliberately omitting observable fields from primary parity. It is not recommended while exact representation is small, stable and available.

### 8.3 Alternative C — native constraints

This is not supported. The repository shows no public activation predicates, allowed transitions or deactivation behavior for Liquidity/Covenant, and no operational behavior for Custom. Their presence in `ConstraintRegistry` and latent effect branches does not establish native domain semantics. Adding them to native V1 solely to match legacy output would turn placeholders into purported model semantics and contradict M1C's verified exclusion rationale.

## 9. Recommended architecture

Amend the M1C compatibility object with one profile-local declaration named `legacyRegistryProjection`. It declares only legacy output representation that is absent from that profile's native contract.

The compatibility-effective M1D adapter must:

1. execute native constraints from the hash-verified native contract;
2. keep the native registry/state free of compatibility entries;
3. independently materialize the declared compatibility entries into a detached compatibility output overlay;
4. merge native-projected and compatibility-projected registry entries only when constructing the comparison observation;
5. reject duplicate source keys or compatibility identities across the two sets;
6. emit the exact four-key legacy order;
7. verify every declared inert entry after every step and fail if any field changes;
8. apply the overlay consistently to trajectory registry, constraint history and terminal registry;
9. record materialization as compatibility evidence for Comparator B;
10. let Comparator A compare the complete assembled candidate observation against the complete legacy observation with no filtering.

The overlay is compatibility observation state, not native execution state. It cannot affect margin, dimensions, propagation, native constraint transitions or other execution results.

## 10. Exact schema/projection changes

### 10.1 Proposed versioned types

```ts
type LegacyRegistryEntryCompatibilityV1 = Readonly<{
  kind: "legacy-inert-registry-entry-v1";
  sourceProfileId:
    | "legacy-real-estate-v1"
    | "legacy-municipal-v1"
    | "legacy-consulting-v1";
  sourceRegistryKey:
    | "RefinancingConstraint"
    | "LiquidityConstraint"
    | "CovenantConstraint"
    | "Custom";
  compatibilityEntryId:
    | "legacy-registry-entry-v1.refinancing-constraint"
    | "legacy-registry-entry-v1.liquidity-constraint"
    | "legacy-registry-entry-v1.covenant-constraint"
    | "legacy-registry-entry-v1.custom";
  legacyType:
    | "RefinancingConstraint"
    | "LiquidityConstraint"
    | "CovenantConstraint"
    | "Custom";
  initialState: Readonly<{
    lifecycle: "INACTIVE";
    activatedAtStep: "absent";
    lastUpdatedStep: 0;
  }>;
  transitionPolicy: "no-public-transition-v1";
  executionPolicy: "immutable-inert-output-placeholder-v1";
  sourceEvidence: Readonly<{
    constructorPath: "src/pilotFastighet/constraintState.ts#createInitialConstraintRegistry";
    excludedSourcePath:
      | "constraints.RefinancingConstraint"
      | "constraints.LiquidityConstraint"
      | "constraints.CovenantConstraint"
      | "constraints.Custom";
    initialRegistryStateHash: `sha256:${string}`;
  }>;
}>;

type LegacyRegistryProjectionCompatibilityV1 = Readonly<{
  version: "legacy-registry-projection-compatibility-v1";
  registryOrder: "legacy-constraint-registry-constructor-order-v1";
  materialization: Readonly<{
    scenarios: readonly ["scenarioA", "scenarioB", "baseline"];
    surfaces: readonly [
      "trajectory.registry",
      "constraintHistory",
      "terminalState.registry"
    ];
    cadence: "initial-and-every-completed-step-v1";
  }>;
  entries: readonly LegacyRegistryEntryCompatibilityV1[];
}>;
```

`legacyType` must equal `sourceRegistryKey`. `compatibilityEntryId` is a stable compatibility identity, not a native constraint ID. `activatedAtStep: "absent"` describes property absence and prevents accidental serialization as `undefined` or `null`.

### 10.2 Profile-bound exact sets

Canonical full legacy order is:

1. `RefinancingConstraint`
2. `LiquidityConstraint`
3. `CovenantConstraint`
4. `Custom`

Compatibility `entries` contains only keys absent from native V1 and follows that order after filtering:

- RE: Liquidity, Covenant, Custom;
- MU: Refinancing, Liquidity, Covenant, Custom;
- CO: Liquidity, Covenant, Custom.

Semantic validation must derive the expected missing set by profile and reject missing, extra, wrong-profile or natively duplicated entries. It must not derive admission from candidate output.

### 10.3 Structural limits and closedness

- `entries`: maximum 4; exact profile cardinality required semantically;
- `scenarios`: exactly 3 in the literal order above;
- `surfaces`: exactly 3 in the literal order above;
- every object uses an exact known-field set;
- strings use existing ID/version/metadata limits as appropriate;
- hashes use the existing prefixed SHA-256 syntax;
- no extensible metadata object, arbitrary output path, transition array or caller-provided payload is allowed.

### 10.4 Semantic rules

- source profile equals envelope source profile;
- key, type and compatibility ID form one exact predefined tuple;
- each tuple occurs once; duplicate key or ID fails;
- entry set equals the profile-specific native complement;
- initial state is exactly inactive, activation property absent and update step zero;
- transition and execution policies have only the literals above;
- source evidence path matches the key;
- `initialRegistryStateHash` equals the shared M0B hash of `{type, lifecycle:"INACTIVE", lastUpdatedStep:0}`;
- existing `excludedSourceValues` contains the matching source path and approved exclusion reason;
- RE/CO must not declare compatibility refinancing because it is native;
- MU must declare compatibility refinancing because native constraints are empty;
- materialization never alters native state or execution calculations.

### 10.5 Canonical ordering

Fixture representation and generated projection use the filtered global constructor order. Semantic validation rejects any other order. Hashing continues to use existing M0B canonicalization; no new canonicalizer or comparison order is introduced.

## 11. Hash and fixture impact

The new `legacyRegistryProjection` field belongs inside `compatibility` and therefore inside `LegacyCompatibilityIdentityProjectionV1`. `hashLegacyCompatibilityIdentityV1` already hashes every compatibility field except `declarationsHash`; once the closed type/parser includes the new field, it enters the existing compatibility hash domain automatically.

Required hash effects for all three M1C envelope fixtures:

- recompute `/compatibility/declarationsHash`;
- any test-computed full envelope hash changes because the envelope bytes and compatibility hash change;
- `/source/semanticPayloadHash` remains unchanged;
- `/projection/contract/identity/semanticPayloadHash`, `/projection/identity/semanticPayloadHash` and `/projection/semanticPayloadHash` remain unchanged because native V1 is unchanged;
- M0B engine Goldens remain unchanged.

M1C implementation files expected to change in separate amendments:

- `legacyProfileProjectionEnvelopeV1.ts` — closed types and compatibility field;
- `parseLegacyProfileProjectionEnvelopeV1Structure.ts` — exact structural parsing and limits;
- `projectLegacyProfileToDomainModelContractV1.ts` — deterministic declaration generation and new hashes;
- `validateLegacyProfileProjectionEnvelopeV1Semantics.ts` — independent exact-set, tuple, evidence and hash-source rules;
- `hashLegacyProfileProjectionEnvelopeV1.ts` — add a derived diagnostic code/path for registry projection; the compatibility identity hash function itself needs no new algorithm;
- `legacyProfileProjectionEnvelopeV1TestSupport.ts` — valid test-envelope builder;
- `legacyProfileProjectionV1.ts` if its compatibility/source accounting inventory enumerates the closed field set.

M1C tests expected to change:

- `parseLegacyProfileProjectionEnvelopeV1Structure.test.ts`;
- `validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts`;
- `legacyProfileProjectionEnvelopeV1.test.ts`;
- `legacyProfileProjectionV1.test.ts`.

Fixtures requiring a new field and recomputed compatibility declaration hash:

- `fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`;
- `fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json`;
- `fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json`.

No M1C history is rewritten. M1C-4a and M1C-4b are new amendment checkpoints.

## 12. Required tests

### 12.1 Structural negatives

- missing `legacyRegistryProjection`;
- unknown fields at projection, materialization, entry, state or source-evidence level;
- more than four entries;
- malformed compatibility ID or prefixed hash;
- wrong literal version, order, cadence, scenario, surface, lifecycle, absence marker or policy;
- nonzero/noninteger `lastUpdatedStep`;
- incomplete or reordered fixed arrays.

### 12.2 Semantic and hash negatives

- missing, extra, duplicate or reordered entry;
- duplicate source key or compatibility ID;
- wrong profile, key/type/ID tuple or source path;
- RE/CO compatibility refinancing entry;
- missing MU compatibility refinancing entry;
- compatibility entry that duplicates a native constraint;
- wrong exclusion reason or absent matching `excludedSourceValues` entry;
- initial state hash computed from effects rather than registry state;
- changed lifecycle, activation presence or update step;
- changed declaration with stale `declarationsHash`;
- confirmation that native semantic and projection hashes do not change.

### 12.3 M1D resumption tests

- pure native contains no compatibility registry entry;
- effective candidate builds each entry only from the verified declaration;
- no compatibility entry enters native state or influences calculations;
- all three scenarios contain exact entries at every trajectory step, in constraint history and terminal state;
- removal or mutation of an inactive entry fails Comparator A at the exact raw output path;
- unexpected activation, `activatedAtStep`, update-step change or additional field fails;
- Comparator B derives observed output paths from actual pure/effective discrepancies and attributes them to the registry declaration;
- ledger-only differences cannot establish the effect;
- declaration is activated/applied only when materialization executes;
- wrong-profile declaration and caller-fabricated registry data fail before execution;
- RE/CO merge three compatibility entries with native refinancing; MU materializes all four from compatibility;
- raw legacy and effective observations remain complete and Comparator A performs no filtering.

## 13. Migration/checkpoint sequence

The proposed sequence is correct:

1. checkpoint this registry parity decision audit;
2. M1C-4a: add versioned envelope/types, structural parser and structural negative tests without changing native V1;
3. M1C-4b: add semantic validation, deterministic projection, compatibility diagnostics, fixture declarations and recomputed compatibility hashes;
4. perform an M1C amendment completion audit confirming exact profile sets, unchanged native hashes and no runtime adoption;
5. resume M1D-2a, replace lossy normalization, close the public execution boundary and correct the independent propagation-attribution findings;
6. continue with M1D-2b and M1D-3.

Each amendment is a new checkpoint. No existing M1C commit is rewritten, rebased or force-pushed.

## 14. Stop conditions

Stop M1C-4a/4b or resumed M1D if any of the following occurs:

- a public path can inject or resume a registry into engine execution;
- Liquidity, Covenant or Custom gains a reachable lifecycle transition;
- the exact inactive state cannot be independently verified from tracked source;
- a profile's expected native complement is ambiguous;
- declaration generation must read candidate output to decide admission;
- compatibility entries must enter native V1 state or affect native calculations;
- the declaration requires reconstruction from a hash instead of explicit fields;
- native semantic/projection hashes change;
- full legacy/effective registry parity requires filtering, tolerance or a Golden update;
- duplicate identity cannot be rejected before materialization;
- an unexpected lifecycle/state mutation is ignored;
- production runtime, trust, registry admission, persistence or UI must adopt the test-only contract;
- any M1D correction requires a production or prior-audit edit outside its authorized scope.

## 15. Deferred work

This decision does not:

- implement M1C-4a or M1C-4b;
- repair the stopped M1D-2a code;
- resolve the independent propagation counterfactual/ledger circularity;
- define general native semantics for Liquidity, Covenant or Custom;
- define `RECOVERING` transitions;
- make saved-run state executable input;
- alter sustain-threshold, curve-fallback or propagation semantics;
- create new Goldens or acceptance writers;
- cover the full M1D-2b/M1D-3 combination matrix.

Future activation semantics require a separate domain decision and native-contract evidence. They must not be inferred from this inert compatibility representation.

## 16. Final verdict

The verified repository boundary is consistent: legacy-only registry entries are stable and observable output placeholders; native V1 correctly excludes unsupported domain semantics; and the current M1C sidecar lacks the explicit representation needed for lossless parity. A closed profile-local compatibility registry declaration supplies that missing representation without weakening Comparator A or contaminating native state.

The next authorized work is the two-checkpoint M1C compatibility registry amendment described above. M1D-2a remains stopped until that amendment is complete and audited.

**READY FOR M1C COMPATIBILITY REGISTRY AMENDMENT**
