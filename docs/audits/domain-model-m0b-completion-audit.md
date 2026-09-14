# Domain Model M0B Completion Audit

Date: 2026-09-14
Repository: `/Users/christian/Projects/pulse_engine_clean`
Branch: `decision-flow-demo-v1`
Audited HEAD: `d0be6f87725c25b9c5f66cb902151c71c890d760`

## 1. Executive conclusion

**READY FOR DOMAIN MODEL CONTRACT IMPLEMENTATION**

M0B is not approval for a runtime switch. Runtime adoption remains blocked until the contract is defined, legacy semantic gaps are resolved explicitly, and all required differential gates pass.

M0B is a behavior baseline. It locks the current canonicalization protocol, executable legacy profile payloads, engine outputs, execution-surface equivalence, Structural Observation V2 behavior, and saved-run identity behavior. It does not prove that the legacy model is domain-agnostic, validate future external profiles, mean that a contract/runtime migration has already happened, or change the website's current capability claims.

All stop conditions in this audit passed. No source, runtime, profile, fixture, Golden, manifest, or package metadata was changed by M0B-5. This audit is the only M0B-5 file.

## 2. Repository, branch, HEAD, and provenance

- Repository: `/Users/christian/Projects/pulse_engine_clean`
- Branch: `decision-flow-demo-v1`
- HEAD: `d0be6f87725c25b9c5f66cb902151c71c890d760`
- Remote: `git@github.com:SneakyMoccasin/01systems-site.git`
- Initial working tree: clean
- Baseline code commit: `90c3adc694b7fb426a1981235ccc21db99b1f407`
- Baseline code tree: `3741b545e1ac5b533327648eb1de324a838673be`
- M0B start commit: `5a63194f8594ac96205074d4e1851c6a9ea58db5`

Git object verification established that the baseline commit and M0B start commit exist, the baseline tree exists, and `90c3adc...^{tree}` is exactly `3741b545...`. Between the baseline code commit and M0B start, the only changed file is `docs/audits/domain-model-golden-baseline-gap-audit.md`. It is documentation and has no runtime or profile semantics. From M0B start through audited HEAD, all changes are confined to `analysis/testSupport`, versioned fixtures/Goldens, and that audit document.

Every result manifest uses the same baseline commit, tree, and M0B start commit above.

## 3. Checkpoint chain

The commits all exist in current ancestry and occur in this order:

1. M0A — `5a63194f8594ac96205074d4e1851c6a9ea58db5` — `docs: add domain model golden baseline gap audit`
2. M0B-1 — `197648097300f82411f010696a8a52184cea12dd` — `test: add domain model baseline infrastructure`
3. M0B-2 — `f34733518fba5bca51d4da214667276750cc9636` — `test: lock legacy domain profile semantics`
4. M0B-3 — `ca59db4a003186e7fe3a188c3be35e38dc5933c8` — `test: add canonical engine output baselines`
5. M0B-4 — `d0be6f87725c25b9c5f66cb902151c71c890d760` — `test: add structural observation persistence baseline`

## 4. Full M0B file inventory

| File | Classification |
|---|---|
| `docs/audits/domain-model-golden-baseline-gap-audit.md` | audit/documentation |
| `src/pilotFastighet/analysis/testSupport/baselineCanonicalizationV1.ts` | canonicalization/hash infrastructure |
| `src/pilotFastighet/analysis/testSupport/baselineCanonicalizationV1.test.ts` | test |
| `src/pilotFastighet/analysis/testSupport/domainModelBaselineManifestV1.ts` | manifest infrastructure |
| `src/pilotFastighet/analysis/testSupport/domainModelBaselineManifestV1.test.ts` | test |
| `src/pilotFastighet/analysis/testSupport/legacyDomainProfileSemanticPayloadV1.ts` | profile semantic payload |
| `src/pilotFastighet/analysis/testSupport/legacyDomainProfileSemanticPayloadV1.test.ts` | test |
| `src/pilotFastighet/analysis/testSupport/legacyAlgorithmAssumptionsV1.ts` | algorithm-assumption documentation |
| `src/pilotFastighet/analysis/testSupport/engineOutputProjectionV1.ts` | canonical engine test projection/parser infrastructure |
| `src/pilotFastighet/analysis/testSupport/engineOutputGoldenV1.ts` | engine Golden parser infrastructure |
| `src/pilotFastighet/analysis/testSupport/engineOutputGoldenV1.test.ts` | test |
| `src/pilotFastighet/analysis/testSupport/fixtures/legacy-domain-profile-semantic-payload-v1/legacy-real-estate-v1.json` | profile semantic payload |
| `src/pilotFastighet/analysis/testSupport/fixtures/legacy-domain-profile-semantic-payload-v1/legacy-municipal-v1.json` | profile semantic payload |
| `src/pilotFastighet/analysis/testSupport/fixtures/legacy-domain-profile-semantic-payload-v1/legacy-consulting-v1.json` | profile semantic payload |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-real-estate-v1-neutral.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-real-estate-v1-stressed-scheduled.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-municipal-v1-neutral.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-municipal-v1-stressed-scheduled.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-consulting-v1-neutral.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-baseline-input-v1/legacy-consulting-v1-stressed-scheduled.json` | engine inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-real-estate-v1-neutral.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-real-estate-v1-stressed-scheduled.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-municipal-v1-neutral.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-municipal-v1-stressed-scheduled.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-consulting-v1-neutral.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/fixtures/engine-output-golden-v1/legacy-consulting-v1-stressed-scheduled.json` | engine output-Golden |
| `src/pilotFastighet/analysis/testSupport/structuralObservationGoldenV2.ts` | Structural Observation test projection/parser infrastructure |
| `src/pilotFastighet/analysis/testSupport/structuralObservationGoldenV2.test.ts` | test |
| `src/pilotFastighet/analysis/testSupport/fixtures/structural-observation-v2/legacy-real-estate-v1-small-v2.json` | Structural Observation inputfixture |
| `src/pilotFastighet/analysis/testSupport/fixtures/structural-observation-golden-v2/legacy-real-estate-v1-small-v2.json` | Structural Observation output-Golden |

No runtime, UI, profile, or other production file changed within M0B.

## 5. Canonicalization and parser boundaries

M0B-1 uses one shared `canonical-json-v1` implementation. Object keys are recursively sorted lexicographically, array order is preserved, canonical bytes are UTF-8, and hashes are SHA-256 lowercase hexadecimal. Repeated calls produce identical bytes and hashes.

The boundary rejects `undefined`, bigint, NaN, Infinity, negative zero, functions, symbol values and symbol keys, accessors, non-enumerable fields, sparse arrays, extra array properties, cycles, and class instances. Manifest and Golden parsers are fail-closed, return detached recursively frozen data, reject unknown/missing closed-contract fields, validate all current result hash fields, and preserve full paths for nested failures.

M0B-2 through M0B-4 reuse `canonicalizeBaselineValueV1` and `hashBaselineValueV1`; no competing M0B canonicalization or hashing protocol was introduced. Structural fingerprints retain their pre-existing explicitly versioned structural-semantic protocol and are treated as runtime-produced identity inputs, not an alternative M0B Golden protocol.

## 6. Profile baselines

Each of the three fixtures deep-equals its independently produced runtime projection and covers identity, applicable drivers, the complete default state, all action effects and deltas, supported action IDs, propagation relationships, constraints, margin escalation, impact mappings, curve configuration, and clamp policy.

Locked hashes:

| Profile | semanticPayloadHash |
|---|---|
| Real Estate | `898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` |
| Municipal | `81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` |
| Consulting | `b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` |

The payload intentionally excludes algorithm-wide execution ordering, cascade loop mechanics, trajectory conventions, and other `NOT IN PROFILE PAYLOAD` assumptions recorded by `legacyAlgorithmAssumptionsV1.ts` and locked by numeric engine Goldens.

The verified legacy semantic gap remains unmodified: profiles expose all 15 registered actions while supported sets are Real Estate 8, Municipal 7, and Consulting 10. Supported-action driver references absent from `applicableDrivers` remain exactly:

- Real Estate: `implementationPacingRisk`, `liquidityPressure`
- Municipal: `modal_shift_pressure`, `political_feasibility`
- Consulting: `modal_shift_pressure`, `political_feasibility`

This gap is evidence for migration work, not a desired Domain Model Contract rule.

## 7. Engine baselines and manifest/hash register

There are exactly six inputs and six output Goldens: one neutral and one stressed-scheduled case per profile, with unique fixture IDs. Strict parsers validate profile/domain identity, full explicit state keys, supported actions, horizon and schedule invariants, hashes, exact metrics, manifests, detachment, and recursive freezing. Repeated execution is byte-identical.

| Golden | input | output | trajectory | terminal | margins | constraints | cascades | provenance | baseline | comparison | manifest |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Real Estate neutral | `98cb3e81…ac635` | `569495dc…a431d` | `c7504dee…ee5ba` | `2347b3fc…30c13` | `8af76e62…b6ac4` | `a4b106be…dd9d` | `787ba41b…60193` | `4f53cda1…2b945` | `31d3474b…1c5ce` | `73c1aa06…b383` | `122b7f21…982aa` |
| Real Estate stressed | `ac053060…d052f` | `2801ec1f…28665` | `f81ce874…555cf` | `e93e2f92…b6312` | `06cf82c5…d439c` | `2d3faf27…d38f6` | `bb7f556e…2233b4` | `6465dff2…97e1b` | `0123f8c3…ffa72` | `6625d297…c973` | `03fa6856…f46a` |
| Municipal neutral | `ed71a7a0…3beb` | `963f872e…06d41` | `c7504dee…ee5ba` | `2347b3fc…30c13` | `8af76e62…b6ac4` | `a4b106be…dd9d` | `787ba41b…60193` | `4f53cda1…2b945` | `31d3474b…1c5ce` | `73c1aa06…b383` | `e9cce4ca…63e3c` |
| Municipal stressed | `a21a3783…a5555` | `bf19b203…e8b5a` | `52e506da…f3c5a` | `af90e2c0…89c1b` | `b1255565…b29e8` | `9f9f2e1d…48571` | `2bad7bb6…a86b3` | `c84ce718…38770` | `de408adb…a7858` | `d8d8b9ba…e6c64` | `140cb58d…9a562` |
| Consulting neutral | `ffbc40ea…27f13` | `7c9aa718…152e` | `c7504dee…ee5ba` | `2347b3fc…30c13` | `8af76e62…b6ac4` | `a4b106be…dd9d` | `787ba41b…60193` | `4f53cda1…2b945` | `31d3474b…1c5ce` | `73c1aa06…b383` | `ba9ac206…c4414` |
| Consulting stressed | `80437367…3424` | `18e92388…05c53` | `6d95d52a…576d3e` | `fe60392b…b6497` | `351005b5…ffcf5` | `2d3faf27…d38f6` | `2be71551…09dfb` | `5d254955…02093` | `0123f8c3…ffa72` | `ae536e9c…2cf23` | `dc31d98b…2f370` |

The JSON Goldens contain the full 64-character values; this table abbreviates only for readability. Automated tests compare every full value and every exact metric.

Surface equivalence is locked for direct preconfigured versus ordinary configured, direct scheduled versus React scheduled, embedded baseline versus action-free preconfigured, and initiative-scheduled versus action-scheduled for all three profiles. Wrapper shape and provenance ownership differ legitimately; after explicit common-engine projection the engine results are equivalent.

## 8. Structural Observation V2 and persistence

Locked M0B-4 register:

- inputHash: `48033d96fbeab0408f537097216aa5f1cd18a0f65cf6a03a7a68a654d1b1b7d6`
- engineResultHash: `1f37d5833efe0f73e0197ca4e14892ec263e68cb53e282602186dfd1dbf55bf2`
- structuralObservationHash: `5cc8587785e31efd5737792f58a5cf3977ec298de46397117b1cf025362b8a9c`
- provenanceHash: `6aa6eb951b3ff0e50da3259fa2ada5cb8ce0e2deabbc464f77460cc25a1bd732`
- persistenceHash: `5973d8702d0f16e9f51236c55143426eb9b868a3f2b06ca0d1ac567302faef18`
- semanticPayloadHash: `898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc`
- definition fingerprint: `96169ee270dc3447294dc9c6f98301c8df437ef8c4c8d51d12a8f0a960bc9515`
- scenario A fingerprint: `06b855e52701e4f8d3985bbb9d0d9cbb78158587dfc563919abf7afbe089f00c`
- scenario B fingerprint: `077ad7cccc0762a6716f84be7a2d24551ee2d8a04c5f84cd34d32dab80fa5a2d`
- manifestHash: `de89a0fd0012e7bf2d9888f057ec7ef6389a4ecbc91b3776604cb4a158543e14`

The fixture has three initiative instances. `foundation` and `parallel` remain distinct while sharing `early_refinancing`; each receives its own canonical deltas and provenance entry. Scenario A binds all three at period 1, producing real runtime `would-be-blocked`, `resource-overallocated`, `executed-despite-structural-block`, and same-period prerequisite diagnostics. Scenario B separates execution across periods 1–3. Observation is post-hoc only and exact engine-result equality and hashes before/after are locked.

The identity chain binds fixture → domain/profile → M0B-2 semantic payload → executable identity → engine result → observation identity/fingerprints → persistence identity → manifest. The Golden parser verifies trusted identity, engine version, execution surface, fixture/input bindings, duplicated result hashes/fingerprints, semantic payload, overlapping exact metrics, and manifest hash.

Persistence JSON round-trip is detached. Compatibility covers matching identity and mismatches in domain, profile, model, calibration, horizon, definition, and both scenario plans, plus legacy/missing identity. The semantic persistence projection explicitly includes `engineState`, `executionIdentity`, `initiativeStructuralObservationIdentity`, and `metadata`; it explicitly excludes `completeAnalysisResult`, `diagnostics`, `executionProvenance`, and `snapshots`.

## 9. Self-confirmation and update-mode audit

Searches covered snapshot/update, Golden update, fixture rewrite, baseline regeneration, environment-controlled acceptance, filesystem writes, raw fixture casts, and runtime imports from `analysis/testSupport`.

No active Golden-update path, update environment variable, fixture-writing test, or runtime import from testSupport was found. The checked-in JSON fixtures and Goldens are independent data. Tests recalculate canonical bytes and hashes from actual projections and compare them with explicit constants. Manifest hashes are recalculated and independently compared. Test-only type assertions occur after strict validation or at typed runtime boundaries; imported raw M0B-3/M0B-4 fixture data passes through strict parsers before use.

No expected value is generated from an actual result and accepted as a replacement in the same run. No update flag was used during this audit.

## 10. Determinism and regression matrix

`package.json` has `dev`, `build`, `start`, and `lint`, but no complete test script. The audit therefore inventoried every repository `*.test.ts` and `*.test.tsx` under `app` and `src`: 75 files. No discovered test file was omitted. Both independent processes ran that same sorted list.

| Check | Run 1 | Run 2 |
|---|---:|---:|
| Test files | 75 | 75 |
| Tests | 599 | 599 |
| Pass | 599 | 599 |
| Fail | 0 | 0 |
| Cancelled | 0 | 0 |
| Skipped | 0 | 0 |
| Todo | 0 | 0 |
| Duration | 3902.332 ms | 3800.319 ms |
| Git status after run | clean | clean |

Reported locked hashes and canonical comparisons matched in both processes. No fixture or Golden changed. Counts above are per independent full run and are not added into a misleading aggregate total.

Tool checks:

- TypeScript: pass (`tsc --noEmit --incremental false`)
- Scoped ESLint over every M0B TypeScript file: pass
- `git diff --check` over M0B history before report: pass
- Previously committed fixture/Golden modification check: no changes

## 11. Remaining gaps and what M0B does not prove

M0B deliberately records rather than repairs legacy behavior. Remaining work includes:

- defining the future Domain Model Contract and migration semantics;
- explicitly resolving the verified supported-action/applicable-driver gaps;
- deciding which legacy algorithm assumptions become contract fields versus engine protocol;
- implementing and validating external profile ingestion and trust boundaries;
- migrating runtime entry points without changing locked behavior except through reviewed, intentional deltas;
- defining compatibility/versioning policy for future contract and calibration revisions.

Current missing/unsupported curve behavior and its neutral fallback remain explicitly **NOT COVERED** by a dedicated baseline. Other curve and margin behaviors have transitive output coverage where exercised by the existing engine Goldens, but that coverage does not replace a focused baseline for this specific fallback. The missing/unsupported curve behavior must be characterized and locked, or intentionally replaced through a reviewed versioned contract delta, before the first runtime switch.

M0B does not prove domain agnosticism, correctness of business semantics, suitability of legacy global action effects for future profiles, validity of future external data, or completion of runtime migration. It does not authorize normalization of recorded gaps and does not expand product or website claims.

## 12. What M0B protects

M0B protects canonical JSON/hash behavior; manifest provenance; current executable profile semantics; explicit algorithm assumptions; six representative engine inputs and their complete output components; baseline and comparison identity; provenance; execution-surface equivalence; Structural Observation V2 identity, snapshots, and diagnostics; post-hoc non-interference; saved-run identity persistence; compatibility classification; and deterministic repeatability.

Any subsequent implementation must either preserve these baselines exactly or present an explicit, reviewed migration delta with a new version/protocol rather than silently rewriting the Goldens.

## 13. Stop conditions before the first runtime switch

Before switching any runtime path to a Domain Model Contract implementation:

1. Define and review the versioned contract and canonical identity boundaries.
2. Map every locked profile field and every `NOT IN PROFILE PAYLOAD` assumption.
3. Resolve legacy semantic gaps explicitly; do not inherit them accidentally.
4. Preserve or deliberately version executable identity, model, calibration, schedule, and persistence compatibility.
5. Demonstrate equivalence against all M0B engine and Structural Observation Goldens.
6. Run the same complete regression and determinism checks with no update mode.
7. Prohibit runtime imports from testSupport and Golden-driven production behavior.
8. Require a reviewed migration report for every intentional mismatch.
9. Add a focused baseline for current missing/unsupported curve fallback behavior, or document and approve an intentional versioned replacement before runtime adoption.

This stop condition blocks the first runtime switch; it does not block test-only work to define and implement the contract schema and strict parser.

## 14. Recommended next checkpoint

The recommended next checkpoint is **M1: versioned Domain Model Contract schema and strict parser, test-only first**. M1 may begin now. It should define identity, profile payload, algorithm-assumption ownership, validation, canonical projection, compatibility/versioning, and explicit treatment of the legacy gaps. Runtime adoption remains a later checkpoint, gated by differential execution against this M0B baseline and explicit resolution of the missing/unsupported curve fallback.

## 15. Final status before report creation

All READY conditions passed: tests, two-process determinism, locked hashes, manifest consistency, Git provenance, test-only scope, absence of update mode, and clean working tree.

## Appendix A. Exact full-regression test-file inventory

Both independent runs used this lexicographically sorted 75-file inventory, without omissions:

```text
app/api/ai-interpretation/route.scheduled.test.ts
src/deployment/rootDeploymentIsolation.test.ts
src/pilotFastighet/RealEstateEngine.driverDeltas.test.ts
src/pilotFastighet/analysis/appearancePreference.test.ts
src/pilotFastighet/analysis/canonicalDriverDeltaBatch.test.ts
src/pilotFastighet/analysis/cascadePresentation.test.ts
src/pilotFastighet/analysis/configuredRunSource.test.ts
src/pilotFastighet/analysis/executableDomainProfile.test.ts
src/pilotFastighet/analysis/executiveAnnotationPlacement.test.ts
src/pilotFastighet/analysis/executiveDemoGraphAppearance.test.ts
src/pilotFastighet/analysis/executiveResultPresentation.test.tsx
src/pilotFastighet/analysis/expertModeAppearance.test.ts
src/pilotFastighet/analysis/legacyLibraryRemovalAppearance.test.ts
src/pilotFastighet/analysis/manualScheduledExecution.test.ts
src/pilotFastighet/analysis/marginGraphPresentation.test.ts
src/pilotFastighet/analysis/modelSetupSection.test.ts
src/pilotFastighet/analysis/periodPresentation.integration.test.ts
src/pilotFastighet/analysis/periodPresentation.test.ts
src/pilotFastighet/analysis/phase7dWorkspaceLayout.test.tsx
src/pilotFastighet/analysis/phase7gExecutiveSourceDetails.test.tsx
src/pilotFastighet/analysis/phase8aPresentation.test.tsx
src/pilotFastighet/analysis/phase8bDomainPresentation.test.tsx
src/pilotFastighet/analysis/phase8cAiInterpretation.test.tsx
src/pilotFastighet/analysis/preconfiguredPlayback.test.ts
src/pilotFastighet/analysis/publicWebsiteClaims.integration.test.ts
src/pilotFastighet/analysis/reactScheduledAnalysisBoundary.test.ts
src/pilotFastighet/analysis/runCascadeAnalysis.parity.test.ts
src/pilotFastighet/analysis/runCascadeAnalysis.scheduled.test.ts
src/pilotFastighet/analysis/savedRunPersistence.test.ts
src/pilotFastighet/analysis/scheduledExecutiveDemo.test.ts
src/pilotFastighet/analysis/structuralFindingsPresentationModel.test.ts
src/pilotFastighet/analysis/structuralFindingsSection.test.ts
src/pilotFastighet/analysis/structuralObservation/assessDependencyStarts.differential.test.ts
src/pilotFastighet/analysis/structuralObservation/assessDependencyStarts.test.ts
src/pilotFastighet/analysis/structuralObservation/assessInitiativeStructuralStarts.test.ts
src/pilotFastighet/analysis/structuralObservation/assessStructuralStarts.test.ts
src/pilotFastighet/analysis/structuralObservation/buildDecisionSpaceSnapshots.test.ts
src/pilotFastighet/analysis/structuralObservation/buildInitiativeDecisionSpaceSnapshots.test.ts
src/pilotFastighet/analysis/structuralObservation/dependencyAssessmentCore.test.ts
src/pilotFastighet/analysis/structuralObservation/executeInitiativeTransition.test.ts
src/pilotFastighet/analysis/structuralObservation/initiativeExecutionProvenance.test.ts
src/pilotFastighet/analysis/structuralObservation/initiativeStructuralObservationDiagnostics.test.ts
src/pilotFastighet/analysis/structuralObservation/initiativeStructuralObservationFingerprints.test.ts
src/pilotFastighet/analysis/structuralObservation/initiativeStructuralObservationIdentity.test.ts
src/pilotFastighet/analysis/structuralObservation/initiativeStructuralObservationScale.test.ts
src/pilotFastighet/analysis/structuralObservation/observeCompletedInitiativeStructuralAnalysis.test.ts
src/pilotFastighet/analysis/structuralObservation/observeCompletedStructuralAnalysis.test.ts
src/pilotFastighet/analysis/structuralObservation/observeResourcePressure.test.ts
src/pilotFastighet/analysis/structuralObservation/prepareInitiativeStructuralObservationRun.test.ts
src/pilotFastighet/analysis/structuralObservation/prepareStructuralObservationRun.test.ts
src/pilotFastighet/analysis/structuralObservation/resolveInitiativeObservationPlans.test.ts
src/pilotFastighet/analysis/structuralObservation/resolveInitiativeSchedules.test.ts
src/pilotFastighet/analysis/structuralObservation/resolveScenarioPlans.test.ts
src/pilotFastighet/analysis/structuralObservation/resourcePressureCore.test.ts
src/pilotFastighet/analysis/structuralObservation/runInitiativeScenario.test.ts
src/pilotFastighet/analysis/structuralObservation/runInitiativeScheduledAnalysis.test.ts
src/pilotFastighet/analysis/structuralObservation/structuralObservationDiagnostics.test.ts
src/pilotFastighet/analysis/structuralObservation/structuralObservationFingerprints.test.ts
src/pilotFastighet/analysis/structuralObservation/structuralObservationIdentity.test.ts
src/pilotFastighet/analysis/structuralObservation/structuralStartAssessmentCore.test.ts
src/pilotFastighet/analysis/structuralObservation/validateInitiativeSchedules.test.ts
src/pilotFastighet/analysis/structuralObservation/validation.test.ts
src/pilotFastighet/analysis/structuralObservation/validationV2.test.ts
src/pilotFastighet/analysis/testSupport/baselineCanonicalizationV1.test.ts
src/pilotFastighet/analysis/testSupport/domainModelBaselineManifestV1.test.ts
src/pilotFastighet/analysis/testSupport/engineOutputGoldenV1.test.ts
src/pilotFastighet/analysis/testSupport/legacyDomainProfileSemanticPayloadV1.test.ts
src/pilotFastighet/analysis/testSupport/structuralObservationGoldenV2.test.ts
src/pilotFastighet/analysis/transportActionPresentation.test.ts
src/pilotFastighet/analysis/transportFinancingIsolation.test.ts
src/pilotFastighet/analysis/transportPropagationMetadata.test.ts
src/pilotFastighet/analysis/transportPropagationProfile.test.ts
src/pilotFastighet/analysis/workspaceConfigurationShell.test.ts
src/pilotFastighet/modelRegression.test.ts
src/pilotFastighet/preconfiguredGolden.test.ts
```
