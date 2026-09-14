# M0A – Domain Model Golden Baseline Gap Audit

Auditdatum: 2026-09-14
Audittyp: read-only kod- och testaudit
Canonical repository: `/Users/christian/Projects/pulse_engine_clean`

## Status- och täckningsnyckel

- **VERIFIED (runtime):** följt genom aktuell canonical import/call path.
- **VERIFIED (test):** styrkt av namngivet befintligt test och ingick i auditens gröna körning.
- **INFERRED:** slutsats/rekommendation från verifierad kod; inte ett befintligt kontrakt.
- **NOT COVERED:** inget befintligt test låser det efterfrågade beteendet exakt.
- **OUT OF SCOPE:** implementation, test-/fixtureändring eller extern research.
- **EXACT GOLDEN:** komplett relevant resultat eller canonical SHA-256 är låst.
- **EXACT ASSERTIONS:** enskilda värden/strukturer är exakt låsta, men inte komplett resultat.
- **PROPERTY ONLY:** invariant/egenskap låses utan fulla exakta värden.
- **INDIRECT:** skyddas bara som del av annat test/resultat.

## 1. Executive verdict

**M0 är inte redo för första runtime switch.** Nuvarande suite skyddar scheduling-, inherited-state-, batching-, propagation-, constraints-, Structural Margin- och Structural Observation-egenskaper väl. Executive Demo har en stark exakt baseline: A-, B- och baseline-trajectory SHA-256, valda marginalpunkter, exakta path metrics, schedules och provenance är låsta. Default preconfigured real-estate trajectory är också golden. **VERIFIED (test):** `src/pilotFastighet/analysis/scheduledExecutiveDemo.test.ts::scheduled executive trajectories, provenance, and path metrics are exact` (rader 72–98); `src/pilotFastighet/preconfiguredGolden.test.ts::default baseline complete preconfigured trajectory remains golden` (rader 203–220).

Den kritiska luckan är att ingen versionslåst baseline låser **hela outputkontraktet för alla tre profiler och alla canonical execution surfaces**. Municipal och consulting saknar kompletta per-profile goldens för trajectory, terminal state, margin/constraint/cascade histories, baseline, comparison och provenance. Även realEstate saknar komplett surface-matris. Profile identity består av fyra strängar och saknar hash över den numeriskt relevanta profile-payloaden. **VERIFIED (runtime), NOT COVERED:** `src/pilotFastighet/executableDomainProfile.ts::ExecutableIdentity,getExecutableIdentity` (rader 15–20, 61–70); `src/pilotFastighet/analysis/savedRunPersistence.ts::evaluateSavedRunCompatibility` (rader 160–178).

Före migration krävs därför P0-goldens för ett litet representativt fixture-set per profil och surface, plus en versionslåst manifestdefinition och full semantic profile-payload fixture/hash. Ingen runtime-, kontrakts-, test-, fixture- eller snapshotändring gjordes i M0A. **INFERRED.**

## 2. Repository verification

| Kontroll | Resultat | Status |
|---|---|---|
| Absolut repository path | `/Users/christian/Projects/pulse_engine_clean` | VERIFIED |
| Branch | `decision-flow-demo-v1` | VERIFIED |
| HEAD | `90c3adc694b7fb426a1981235ccc21db99b1f407` | VERIFIED |
| Förväntad HEAD | exakt match | VERIFIED |
| Remote | `origin git@github.com:SneakyMoccasin/01systems-site.git` (fetch/push) | VERIFIED |
| Initial `git status --short` | tom | VERIFIED |
| Initial arbetskatalog | ren | VERIFIED |

Förkontrollen passerade. De obligatoriska dokumenten lästes i sin helhet: `docs/audits/historical-case-readiness-audit.md` och `docs/audits/domain-model-contract-readiness-audit.md`. Deras tekniska slutsatser kontrollerades mot aktuell runtime och testkod. HEAD-skillnaden består av readiness-auditdokumentation; canonical runtime/testfynden kvarstår. **VERIFIED (runtime/test).**

## 3. Canonical execution surfaces

| Surface | Entry/input → profile/engine → result | Befintligt testskydd | Låsnivå |
|---|---|---|---|
| Ordinary configured run | `configuredRunSource.ts::prepareOrdinaryConfiguredRunSource` (79–94), domänval → `getExecutableProfileIdForDomain`; `reactScheduledAnalysisBoundary.ts::runReactAnalysisBoundary` (434+) → `runCascadeAnalysis`; projicerar analysis + identity/provenance | `configuredRunSource.test.ts:ordinary configured preparation...`, `executableDomainProfile.test.ts:normal configured selection...` | PROPERTY ONLY; exakta source/rerun-invarianter, inte komplett profiloutput |
| Explicit/preconfigured run | `runPreconfiguredScenario.ts::runPreconfiguredScenario` (11+), `runCascadeAnalysis.ts::runCascadeAnalysis` (283+) med `mode:"preconfigured"`; profile eller legacy compatibility; `cascadeAnalysisProjection.ts::createScenarioAnalysisResult` | `preconfiguredGolden.test.ts`, `preconfiguredPlayback.test.ts`, `runCascadeAnalysis.parity.test.ts` | EXACT GOLDEN endast default och äldre demo-fixtures; annars PROPERTY/INDIRECT |
| Scheduled action analysis | `runCascadeAnalysis.ts` scheduled input (51–62), `runScheduledScenario` (214+) → en engine/scenario, canonical batches → projected histories/comparison; facade i `reactScheduledAnalysisBoundary.ts` | `runCascadeAnalysis.scheduled.test.ts`, `canonicalDriverDeltaBatch.test.ts`, `manualScheduledExecution.test.ts` | EXACT ASSERTIONS + PROPERTY ONLY; ingen full surface golden per profil |
| Initiative scheduled analysis | `runInitiativeScheduledAnalysis.ts::prepare...` (150–190), `runPrepared...` (192–231), `run...` (233+) med V2 contract/schedules → resolved profile/effects → `runInitiativeScenario` → baseline/comparison/provenance | `runInitiativeScheduledAnalysis.test.ts`, `runInitiativeScenario.test.ts`, `resolveInitiativeSchedules.test.ts` | PROPERTY ONLY/differential exactness; ingen full hash per profil |
| Executive Demo | `scheduledExecutiveDemo.ts::getScheduledExecutiveDemoRunSource` (28–44), horizon 36, explicit legacy-real-estate profile → facade scheduled analysis → presentation metrics | `scheduledExecutiveDemo.test.ts` (47–98), `configuredRunSource.test.ts`, claims/presentation tests | EXACT GOLDEN för trajectories; EXACT ASSERTIONS för metrics/provenance |
| Baseline execution | `runCascadeAnalysis` och initiative runner skapar actionfri baseline från samma initial input/profile; projection via `createScenarioAnalysisResult` | default golden, Executive baseline hash; scheduled isolation tests | EXACT GOLDEN för två real-estate fixtures; NOT COVERED per municipal/consulting fixture |
| Structural Observation V2 | Efter full analysis: `observeCompletedInitiativeStructuralAnalysis.ts::observe...` (24+) → preparation, snapshots, diagnostics, identity; påverkar inte engine result | V2 validation/schedule/fingerprint/identity/diagnostic/orchestrator/scale suites | EXACT ASSERTIONS + PROPERTY ONLY; inga versionslåsta kompletta observation-goldens |
| Saved-run persistence | `savedRunPersistence.ts::createSavedRunSnapshot` (43+), `readSavedRunHistory` (136+), compatibility (160+) | `savedRunPersistence.test.ts` | EXACT ASSERTIONS för round-trip/compatibility; ingen serialized-byte/hash golden och ingen profile-payload hash |
| Interpretation/presentation med provenance | `scheduledInterpretationContext.ts::buildScheduledInterpretationContext`; `scheduledExecutivePresentation.ts`; facade provenance används till markers/context | `route.scheduled.test.ts`, `scheduledExecutiveDemo.test.ts`, `publicWebsiteClaims.integration.test.ts` | EXACT ASSERTIONS/PROPERTY ONLY; presentation är inte motor-golden |

Arkiverad `_archive_disabled`-kod och legacy UI-fixtures som inte nås av dessa imports räknas inte som canonical. **VERIFIED (runtime search).**

## 4. Existing profile coverage matrix

Förkortningar: EG = EXACT GOLDEN, EA = EXACT ASSERTIONS, PO = PROPERTY ONLY, IN = INDIRECT, NC = NOT COVERED.

| Kontrakt/resultat | realEstate | municipal | consulting | Evidens |
|---|---:|---:|---:|---|
| profile identity | EA | EA | EA | `executableDomainProfile.test.ts:27–54,103–130`; persistence tests |
| model/calibration version | EA | EA | EA | `executableDomainProfile.ts:44–47,126–127,155–157`; profile/persistence tests |
| default state | EA | EA/IN | EA/IN | `executableDomainProfile.test.ts:56+`; global default exakt i `preconfiguredGolden.test.ts:203–218`; ingen separat per-profile serialized golden |
| action set/effects | EA | EA | EA | `executableDomainProfile.test.ts:Phase-1 profiles...`; `canonicalDriverDeltaBatch.test.ts:matches legacy aggregation across every canonical profile effect` |
| propagation relationships | EA | EA | EA | `transportPropagationProfile.test.ts:34–59` låser municipal tre edges och legacy content |
| impact mappings | EA | EA | EA | profile deep-equality och `modelRegression.test.ts`; ingen separat canonical payload hash |
| curves/amplitudes | EA | EA | EA | profile equality; `transportFinancingIsolation.test.ts:85+`; shapekonstanter bara indirekt |
| thresholds/clamps | EA/IN | EA | EA/IN | profile tests; municipal isolation; score band boundaries delvis numeriskt testade |
| constraints | EA | EA | EA/IN | `transportFinancingIsolation.test.ts`; endast refinancing activation har canonical runtime |
| initial state (representativ fixture) | EG | EA/IN | EA/IN | default/demo real-estate goldens; andra profiler saknar fryst fixture+hash |
| trajectories | EG (delmängd) | EA/PO | EA/PO | preconfigured + Executive hashes; municipal six histories exact assertions men ingen manifesthash; consulting parity mot legacy |
| terminal state | EG (default/legacy demo) | PO/IN | PO/IN | `preconfiguredGolden.test.ts:212+`; övriga främst parity/properties |
| margin history | EG/EA | EA/PO | PO/IN | Executive valda punkter + trajectory hash; transport history tests; consulting parity |
| constraint history | IN | EA/PO | IN | ingår i trajectory/result men saknar separat hash |
| cascade events/history | EG/EA | EA | IN | legacy expected events/trajectory; municipal exact edge/history assertions; consulting parity |
| provenance | EA för scheduled demo | PO | PO | scheduling/initiative tests; ingen per-profile provenance hash |
| baseline | EG (default/Executive) | NC | NC | `scheduledExecutiveDemo.test.ts:75–97`; default golden |
| A/B comparison | EA/PO | PO | PO | scheduled/initiative parity; ingen comparison hash per profil |
| deterministic repeat | EA/PO | PO | PO | configured/scheduled/V2 repeat tests; inga fulla per-profile golden bytes |

**Samlad bedömning:** profilkonfigurationens fält är relativt väl exakt assertade, men resultatkontraktets fulla numeriska baseline är real-estate-tung. Profile deep-equality mot samma globala objekt skyddar befintlig koppling men är inte en oberoende golden och kan flytta tillsammans med sanningskällan. **INFERRED.**

## 5. Executive Demo exact baseline

Canonical fixture: `SCHEDULED_EXECUTIVE_DEMO_HORIZON = 36`; profile `legacy-real-estate-v1`; A och B har exakt samma initial state/run source och samma tre action IDs, endast ordning/timing skiljer. **VERIFIED (runtime/test):** `scheduledExecutiveDemo.ts:10–43`; `scheduledExecutiveDemo.test.ts:47–69`.

| Värde | Exakt baseline |
|---|---|
| A schedule / actual execution | `delay_maintenance@M1`, `early_refinancing@M9`, `secure_long_term_leases@M18` |
| B schedule / actual execution | `early_refinancing@M1`, `secure_long_term_leases@M3`, `delay_maintenance@M18` |
| A trajectory SHA-256 | `8f7834cc667d7f1c7216bf967476afb366a8c6d428f21cb98425babcd59e81cf` |
| B trajectory SHA-256 | `28bd52f393138ed2a3994e680e6d22c5ab2255626098304a8b2afcc4b7d58eaa` |
| Baseline trajectory SHA-256 | `1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af` |
| Horizon/length | 36 / 36 post-transition states för A och B |
| A margins vid M1/M3/M6/M9/M12/M18/M24/M36 | `0.1465125164690384`, `-1.90360732121212`, `-3`, `-3`, `-3`, `-3`, `-3`, `-3` |
| B margins vid samma perioder | `1.194542569851336`, `1.8958752877373437`, `3`, `3`, `3`, `2.0061364191692057`, `-3`, `-3` |
| First divergence | M1 |
| Maximum separation | `6` |
| Cumulative absolute separation | `107.22345298061776` |
| First lower clamp A/B | M4 / M24 |
| Visible refinancing constraint A/B | M2 / M21 |
| Convergence | M24 |
| Terminal margins A/B | `-3` / `-3` |
| Cascade history lengths A/B | `9` / `7` |
| Baseline terminal margin | `1` |

Provenance låser för varje action `actionId`, `scheduledStep` och `actualExecutionStep`, och actual = planned för alla sex poster. Clean rerun-provenance är deep-equal. **VERIFIED (test):** samma test rader 87–98 och `planned schedules cannot create execution markers and clean reruns are exact` (131–147).

Luckor även här: terminal full-state, separata margin/constraint/cascade/provenance/comparison-hashar är inte namngivna goldens. De ligger delvis transitivt i trajectory-hashen, men comparison/provenance gör det inte. **NOT COVERED.**

## 6. Core numeric behavior coverage

| Beteende/konstant | Runtimeankare | Skydd | Bedömning |
|---|---|---|---|
| Risknivå → score `LOW/MODERATE/HIGH/SEVERE = 0/1/2/3` | `driverScoreState.ts:5–10` | default state och fractional tests | EA/IN; separat full mapping-test bör finnas |
| Score clamp `[0,3]`; bands `<=.5`, `<1.5`, `<2.5` | `driverScoreState.ts:19–33` | `RealEstateEngine.driverDeltas.test.ts:39+`, model regression half-steps | EA för clamp, delvis för samtliga exakta bandgränser |
| Action delta, fractional delta, atomic validation | `RealEstateEngine.ts:73–108` | driverDeltas + scheduled tests | EA |
| Multi-action batching/order invariance/same effect twice | `canonicalDriverDeltaBatch.ts`; `executeInitiativeTransition.ts` | canonical batch + initiative transition tests | EA |
| Inherited state/history | `RealEstateEngine.ts:103–108,123–297`; scenario runners | driverDeltas/scheduled tests | EA/PO |
| Propagation trigger/order/events | `riskPropagation.ts::propagateRisks`; global trigger lookup | transport profile/metadata + preconfigured expected events | EA för valda edges; ingen complete all-profile event golden |
| Curves | `curveConfig.ts:96–162` | downstream exact trajectories/profile equality | IN; exponent `1.2`, logistic `k=.8,x0=3`, interpolation och fallback `1` saknar fokuserad komplett golden |
| Dimension fold | `computeDimensionMultipliers.ts:24–87` | model regression/domain tests | EA/PO; ingen full vector golden per driver/score/step |
| Constraint activation/effects/lifecycle | `simulateConstraintsStep.ts:55–105` | financing isolation + preconfigured/Executive | EA för refinancing; Liquidity/Covenant activation saknas i runtime; `Custom` saknar semantics |
| Refinancing threshold `0.8`; effects `1.15/.8`; liquidity `1.1/1.05`; covenant `.6` | `executableDomainProfile.ts:88–95`; fallbacks `simulateConstraintsStep.ts:55–103` | profile equality/isolation, downstream results | EA/IN; fallback branches ej explicit helt låsta |
| Dold `riskState.sustainThreshold` override | `simulateConstraintsStep.ts:55–58` | inget namngivet kontraktstest | NC; kritisk dold fallback |
| Margin formula | `RealEstateEngine.ts:201–217` | goldens/regression | IN/EG för vissa fixtures, inte varje term isolerad |
| Margin constants baseline `1`, sensitivity `1.2`, weights `1.2/1.1/.45/.8`, pull `.12`, clamp `[-3,3]` | `RealEstateEngine.ts:56–57,209–221`; profile line 110 | trajectory goldens, graph/regression tests | IN/EA; inte explicit versionslåst som en algorithm payload |
| Baseline pull/recovery/convergence | `RealEstateEngine.ts:215–217` | Executive exact metrics; recovery tests | EA för demo/property för övrigt |
| Profile-less engine fallback | `RealEstateEngine.ts:43–47`; `resolveLegacyCompatibilityProfile` | legacy parity test | EA men migration-risk: måste explicit bevaras/avvecklas vid rätt boundary |
| Missing curve/unknown curve fallback `1` | `curveConfig.ts:132–145` | inget fokuserat test identifierat | NC; P0 source/behavior lock eller fail-closed beslut krävs |

## 7. Structural Observation coverage

| Krav | Täckning och ankare | Klass |
|---|---|---|
| V2 validation + unknown-field rejection | `validationV2.test.ts:85–184`; schedules `validateInitiativeSchedules.test.ts:71–173` | EA |
| Definition/A/B fingerprints, SHA-256 protocol, identity | `initiativeStructuralObservationFingerprints.test.ts`; `initiativeStructuralObservationIdentity.test.ts` | EA |
| Before/after phases och phase-safe evidence | `prepareInitiativeStructuralObservationRun.test.ts:116–219` | EA |
| Finish-to-start och same-period prerequisite semantics | dependency/structural start suites; diagnostics test | EA |
| Constant/periodized capacity, claim duration | V2 validation, resource pressure and snapshot suites | EA |
| `would-be-blocked`, `resource-overallocated`, `executed-despite-structural-block`, `planned-not-executed` | diagnostic/snapshot/orchestrator suites | EA; `planned-not-executed` är främst snapshot state/invariant, ej separat golden |
| Preservation of completed engine result | `observeCompletedInitiativeStructuralAnalysis.test.ts:189–199` | EA |
| Immutability/detachment/repeat/reordering | preparation, fingerprint, observation suites | EA/PO |
| 10/30 initiative scale | `initiativeStructuralObservationScale.test.ts:228–362` | EA för counts/bytes/bounds; timing är miljöberoende property |

Exakta scale-baselines från aktuell körning: 10 initiatives/horizon 12 → 24 snapshots per scenario, 480 initiative snapshot entries, diagnostics per scenario `10/6/10/5` för would-be-blocked/resource-overallocated/executed-despite-block/same-period, bytes `91254/412789/4022`; 30/horizon 18 → 36 snapshots, 2160 entries, diagnostics `30/16/30/15`, bytes `173404/1473783/6242`. **VERIFIED (test output).**

Observation är uttryckligen post-hoc och observation-only: den blockerar inte engine execution. `observeCompletedInitiativeStructuralAnalysis` tar ett redan färdigt resultat, och tests låser bevarande samt executed-despite-block. **VERIFIED (runtime/test).** En komplett canonical observation JSON/hash fixture saknas dock. **NOT COVERED.**

## 8. Serialization and provenance coverage

- Saved-run JSON round-trip bevarar `domainId`, `profileId`, `modelVersion`, `calibrationVersion`; olika värden klassificeras och numerisk jämförelse blockeras. Legacy/incomplete identity är aldrig compatible. **VERIFIED (test):** `savedRunPersistence.test.ts:84–121`.
- V1/V2 Structural Observation identities whitelistas, detacheras, fryses och round-trippar; malformed identity utelämnas utan att saved run förloras. V2 compatibility skiljer horizon/definition/A/B mismatch. **VERIFIED (test):** samma fil rader 185–216, 326–465.
- Scenario label och UI state är inte semantic identity och senare språk/appearance/domain/template kan inte skriva om saved identity. **VERIFIED (test):** rader 124–132.
- Persistence sparar identity, inte snapshots, diagnostics, frames, trajectory eller provenance. **VERIFIED (test):** rader 298–309, 443–465.
- Full engine-result identity/hash och serialization-byte golden saknas. Saved run innehåller en engine-state snapshot, inte ett komplett analysis result. **NOT COVERED.**
- `ExecutableIdentity` är bara fyra betrodda registrysträngar; ingen SHA-256 över drivers/actions/effects/edges/curves/thresholds/constraints/default/margin semantics finns. Structural fingerprints får inte misstolkas som profile fingerprint: de täcker definition och plans, medvetet inte engine/result/calibration. **VERIFIED (runtime/test), NOT COVERED.**

## 9. Claims protection

`publicWebsiteClaims.integration.test.ts` läser aktiva källor och låser följande: configured-model-formulering; samma start/actions med olika order/tider; propagation genom explicitly configured relationships; timing/capacity/constraints inom represented decision space; fyra CTA-block; frånvaro av obsolete proposition/access promise och att legacy homepage inte är claim source. **VERIFIED (test).**

Måste förbli oförändrat under migration: jämförelse inom en konfigurerad modell; same start/action set; endast timing/order varierar; represented relationships; capacity/prerequisite som observation; comparison, inte recommendation. AI-context låser dessutom safety-regler om no prediction, causal proof eller optimisation. **VERIFIED (test):** `app/api/ai-interpretation/route.scheduled.test.ts`; `scheduledInterpretationContext.ts`.

Kräver fortsatt kvalificering: “capacities and constraints affect decision space” får inte antyda enforcement; prerequisites/resources observeras endast. “Domain-agnostic”, “cross-domain”, “arbitrary/reusable domains”, “bring your own model” och user-configurable models stöds inte av closed unions/global fallbacks och måste förbli frånvarande eller kvalificeras till registrerade developer-configured profiles. **VERIFIED (runtime) + INFERRED claim boundary.**

## 10. P0–P3 golden gaps

| Pri | Gap; surfaces/profiler | Risk | Föreslagen test/fixture och minsta assertions | Ändring/insats |
|---|---|---|---|---|
| P0 | Full semantic profile payload saknar oberoende golden för alla tre profiler | En registry/global kan ändras och equality-testet flytta med | Ny `domainModelLegacyPayloadGolden.test.ts`; checked-in canonical JSON per profil; SHA-256 + deep equal av identity, defaults, actions/effects, edges, impacts, curves, thresholds, constraints, escalation, clamp och algorithm constants | Ny test+3 fixtures; 1–2 d |
| P0 | Kompletta representative outputs saknas per profil | Runtime switch kan ändra municipal/consulting numerik utan hashfailure | Ny/utökad golden: en neutral och en stressed/scheduled fixture per profil; hash trajectory, terminal, margin, constraints, cascades, provenance, baseline, comparison; repeat twice | Ny test+fixtures; 2–3 d |
| P0 | Surface equivalence saknas ordinary/preconfigured/scheduled/initiative/baseline | Adapter eller resolution kan divergera trots samma engine | Surface-equivalence test med samma expressible fixture; exact profile identity och canonical result/hash; dokumentera legitim shape-skillnad | Ny test; 1–2 d |
| P0 | Margin algorithmkonstanter och curve fallback är inte explicit versionslåsta | Extraktion kan ändra tal eller neutralisera missing data | Fokuserad numeric golden/source contract; assert exponent/logistic params, band boundaries, margin coefficients, pull, clamps; assert current missing/unknown curve behavior före avsiktlig senare ändring | Utöka/new; 1 d |
| P0 | Executive provenance/comparison/history-delar saknar separata hashgates | Trajectory kan vara stabil medan metadata ändras | Utöka befintligt Executive-test med canonical hashes för terminal/margin/constraint/cascade/provenance/comparison och full deterministic repeat | Utöka; 0.5–1 d |
| P1 | Baseline saknas för municipal/consulting | Profile injection kan använda global real-estate default | Per-profile action-free baseline fixture, exact initial/trajectory/terminal/histories/identity | Utöka profile golden; 0.5–1 d |
| P1 | Propagation complete-event ordering saknar full per-profile golden | Edge extraction/order kan ändra events | Stressed propagation fixture per profil; exact ordered events + history hash | Utöka/new; 1 d |
| P1 | Constraint lifecycle/history bara partiellt och refinancing-centrerat | Threshold/effect/default branches kan ändras | Exact activation period, lifecycle state per period, effects och no-activation profile cases; current hidden `sustainThreshold` behavior explicit | Utöka; 1 d |
| P1 | Saved analysis/result serialization identity saknas | Samma fyra versionsträngar kan beteckna annan payload | Manifest/profile fingerprint i framtida contract test; före switch lås current serialized snapshot projection och compatibility behavior | Ny test; 1 d |
| P1 | Complete Structural Observation output saknar golden | Canonicalization/diagnostic projection kan drifta | Ett litet V2 fixture med exact identity/fingerprint och hashes över snapshots/diagnostics; assert engine result preserved | Ny fixture/test; 1 d |
| P2 | External profile contract negative/scale golden saknas | Första externa profilen kan introducera invalid refs/ranges/cycles | När kontrakt finns: validator rejection matrix, registry spoof/version reuse, immutable package, external output/determinism/scale golden | Ny test; 2–4 d, före extern profil |
| P2 | Claim test blockerar inte alla breda synonymer | Marknadsclaim kan överstiga capability | Utöka claim denylist/semantic anchors för cross-domain/domain-agnostic/user-configurable/recommend/predict/causal/optimise | Utöka; 0.5 d |
| P3 | Presentation canonical hashes saknas | Text/layout kan ändras utan motorpåverkan | Behåll semantiska assertions; snapshots endast där compliance kräver | Kan vänta; 0.5–1 d |

## 11. Proposed baseline manifest

Föreslagen filform: versionslåst JSON, exempelvis `domain-model-baseline-manifest-v1`, med:

```json
{
  "schemaVersion": "domain-model-baseline-manifest-v1",
  "repositoryHead": "90c3adc694b7fb426a1981235ccc21db99b1f407",
  "canonicalization": { "algorithm": "canonical-json-v1", "hash": "sha256-lowercase-hex" },
  "engine": { "modelVersion": "pilot-fastighet-v0.4", "algorithmVersion": "legacy-margin-v1" },
  "profile": { "domainId": "...", "profileId": "...", "modelVersion": "...", "calibrationVersion": "...", "semanticPayloadHash": "..." },
  "executionSurface": "ordinary|preconfigured|scheduled|initiative-scheduled|executive|baseline|structural-observation",
  "input": { "fixtureId": "...", "canonicalHash": "..." },
  "result": {
    "trajectoryHash": "...", "terminalStateHash": "...", "marginHistoryHash": "...",
    "constraintHistoryHash": "...", "cascadeEventHash": "...", "provenanceHash": "...",
    "comparisonHash": "...", "structuralDefinitionFingerprint": "...",
    "scenarioPlanFingerprintA": "...", "scenarioPlanFingerprintB": "...",
    "expectedExactMetrics": {}
  },
  "createdDate": "YYYY-MM-DD", "reviewedDate": "YYYY-MM-DD"
}
```

Spara direkt: schema/algorithm IDs, HEAD, profile/version IDs, fixture ID/hash, approved hashes, få affärsläsbara exact metrics (horizon, schedules, terminal margins, divergence/clamp/constraint/convergence periods). Beräkna i test från canonical result: trajectory/terminal/history/event/provenance/comparison-hashar och Structural Observation fingerprints. Duplicera inte hela trajectory både som manifestvärden och manuella assertions; fixture + hash är sanningskälla, medan ett litet antal reviewbara metrics ger diagnos. Profile payload bör däremot finnas som explicit reviewed fixture **och** hash: fixturen är data-underlag, hashen identity/gate. **INFERRED.**

## 12. Minimal M0B implementation plan

1. Checkpoint 1 (0.5–1 d): definiera canonical JSON/hash helper endast för test och manifest schema; frys repository HEAD och fixture IDs. Stoppa vid `-0`, key-order eller undefined-ambiguitet.
2. Checkpoint 2 (1–2 d): exportera/projicera nuvarande tre semantic profile payloads i testfixtures och lås hashes/deep equality. Ingen runtime switch. Stoppa om något resultpåverkande fält inte kan representeras, särskilt margin/curve/fallbackkonstanter.
3. Checkpoint 3 (2–3 d): lägg representative neutral/stressed/scheduled goldens per profil och surface-equivalence gates; utöka Executive separata hashes. Stoppa vid nondeterminism eller oavsiktlig surface-skillnad.
4. Checkpoint 4 (1 d): lägg komplett liten V2 observation golden samt persistence/provenance baseline. Stoppa om identity inte kan bindas entydigt till input/profile.
5. Checkpoint 5 (0.5 d): kör isolerade sviter två gånger och full regression. Reviewa manifest/hashes utan update-mode. M0B slutar här; ingen contract/runtimeimplementation.

Föreslagna filer: utöka `preconfiguredGolden.test.ts`, `scheduledExecutiveDemo.test.ts`, `executableDomainProfile.test.ts`, `savedRunPersistence.test.ts`; skapa `analysis/domainModelLegacyPayloadGolden.test.ts`, `analysis/executionSurfaceGolden.test.ts`, och en V2 golden under `analysis/structuralObservation/`; lägg fixtures under en tydligt versionslåst test-fixturekatalog. Förväntat 5 checkpoints, cirka 5–8 utvecklardagar, med hög initial risk men låg kodrisk eftersom arbetet är test-only. **INFERRED.**

Isolerade kommandon bör använda `./node_modules/.bin/tsx --test <berörda filer>`. Full regression bör vara repositoryts normala fulla testkommando om ett sådant införs; idag saknas `test`-script i `package.json`, så explicit `tsx --test` över samtliga `*.test.ts(x)` måste användas och dokumenteras. **VERIFIED (runtime repository metadata).**

## 13. Test commands executed and results

Kört utan snapshot-/fixture-updateflaggor:

```text
./node_modules/.bin/tsx --test \
  src/pilotFastighet/preconfiguredGolden.test.ts \
  src/pilotFastighet/modelRegression.test.ts \
  src/pilotFastighet/RealEstateEngine.driverDeltas.test.ts \
  src/pilotFastighet/analysis/{canonicalDriverDeltaBatch,executableDomainProfile,runCascadeAnalysis.parity,runCascadeAnalysis.scheduled,configuredRunSource,preconfiguredPlayback,scheduledExecutiveDemo,savedRunPersistence,publicWebsiteClaims.integration,transportPropagationProfile,transportFinancingIsolation}.test.ts \
  src/pilotFastighet/analysis/structuralObservation/{validationV2,validateInitiativeSchedules,resolveInitiativeSchedules,executeInitiativeTransition,runInitiativeScenario,runInitiativeScheduledAnalysis,initiativeExecutionProvenance,initiativeStructuralObservationFingerprints,initiativeStructuralObservationIdentity,initiativeStructuralObservationDiagnostics,buildInitiativeDecisionSpaceSnapshots,prepareInitiativeStructuralObservationRun,observeCompletedInitiativeStructuralAnalysis,initiativeStructuralObservationScale}.test.ts
```

Resultat: **251 tests, 251 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**. Första sandboxade försöket startade inga tester eftersom `tsx` nekades lokal IPC-socket (`EPERM`); samma read-only kommando kördes därefter med tillåten temp-socket och passerade. Inga update-flaggor användes. **VERIFIED (test).**

## 14. Stop conditions

Stoppa M0B/migration om:

- canonical path/branch/HEAD avviker eller arbetskatalogen inte är ren före arbetet;
- någon nuvarande Executive/default hash eller exakt metric ändras;
- någon profil saknar komplett representativ baseline eller semantic payload projection;
- samma fixture skiljer mellan surfaces utan dokumenterad kontraktsskillnad;
- goldens är nondeterministiska mellan två rena körningar;
- canonicalization är tvetydig för key order, arrays, `-0`, non-finite eller omitted fields;
- profile ID/version kan behållas medan resultpåverkande payload ändras;
- hidden fallback (`curve → 1`, profile-less legacy, `sustainThreshold`, constraint default) tappas eller förändras oavsiktligt;
- observation börjar påverka execution eller completed engine result;
- publika claims antyder prediction, causal proof, optimisation/recommendation, enforcement eller obegränsad domain-agnostic capability;
- M0B börjar ändra runtime/contract istället för enbart baseline-tester/fixtures.

## 15. Final M0 readiness verdict

**NOT READY FOR RUNTIME SWITCH; READY TO EXECUTE M0B.** Befintliga tester ger en trovärdig behavior map och ett starkt ankare för Executive Demo, core mechanics och Structural Observation. De är dock inte en komplett golden baseline för tre profiler och alla canonical surfaces. P0-gapen ovan måste stängas innan profile injection/runtime switch påbörjas; P1 ska stängas senast före switchover; P2 före första externa profil.

## Slutverifiering

- Avsedd och enda skapade repositoryfil: `docs/audits/domain-model-golden-baseline-gap-audit.md`.
- Ingen runtimekod, schemafil, testfil eller fixture ändrades.
- Ingen snapshot eller golden uppdaterades.
- Ingen commit, push, merge eller deployment gjordes.
- Ingen extern research gjordes.
- M0B implementerades inte.
