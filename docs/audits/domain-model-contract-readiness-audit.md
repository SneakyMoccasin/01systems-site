# Domain Model Contract Readiness Audit

Auditdatum: 2026-09-14
Audittyp: read-only kod- och testaudit
Omfattning: Cascade Engine; ingen implementation, schemaändring, Step 2 eller extern historisk research

## Statusnyckel

- **VERIFIED (runtime):** följt genom canonical import- och exekveringsväg.
- **VERIFIED (test):** styrkt av namngivet test; auditens urval kördes vid angiven HEAD.
- **INFERRED:** rekommendation eller slutsats härledd från verifierad implementation.
- **NOT SUPPORTED:** saknar stöd i nuvarande runtime/kontrakt.
- **OUT OF SCOPE:** fallresearch, Step 2 eller implementation.

## 1. Executive verdict

**Verdict: motorns orchestration är till stor del återanvändbar, men den exekverande kärnan är inte ännu domänagnostisk och produktgränsen är stängd.** Scheduled A/B-exekvering, inherited state, additive action batches, deterministisk propagation-algoritm, trajectory-projektion, Structural Observation samt fingerprint/canonicalization kan återanvändas. **VERIFIED (runtime):** `runInitiativeScenario.ts::runInitiativeScenario`, `executeInitiativeTransition.ts::executeInitiativeTransition`, `riskPropagation.ts::propagateRisks`, `observeCompletedInitiativeStructuralAnalysis.ts`.

Domänmodellen är däremot en TypeScript-union med exakt tre registrerade profiler. Alla är byggda från ett legacy-kontrakt. Driver vocabulary, action keys, risk scale, fyra impact dimensions, curves, marginformel och constraint registry/policy är helt eller delvis kodlåsta. `RealEstateEngine` är därför både felbenämnd **och** semantiskt fastighets-/finansieringskopplad: klassens state machine är generisk, men den hårdkodar baseline/sensitivity, en finansieringsvariabel, fyra dimensioner och Structural Margin-koefficienter. **VERIFIED (runtime):** `executableDomainProfile.ts:10-59,83-171`; `RealEstateEngine.ts:37-57,132-221`; `simulateConstraintsStep.ts:55-105`.

En första infrastructure/transport-profil kan införas utan en parallell motor, men inte säkert genom att bara lägga till en fjärde registry-post. Minsta säkra arbete är ett strikt, versionslåst och djupt immutable Domain Model Contract, full validering före engine-instansiering, migrering av de tre profilerna till kontraktsinstanser samt byte av kvarvarande globala/legacy-fallbacks mot den validerade profilen. **INFERRED.** Numerisk ekvivalens är möjlig men måste vara en release gate, inte ett antagande.

**Rekommendation:** bygg kontraktsgränsen före Step 2. Vänta med Step 2:s verkställande constraint-policy-språk tills Step 2-designen är godkänd, men låt Step 2 senare konsumera samma profile identity, drivers, actions, resources och supported-feature declarations. **INFERRED.**

## 2. Repository verification

| Kontroll | Resultat | Status |
|---|---|---|
| Absolut repository path | `/Users/christian/Projects/pulse_engine_clean` | VERIFIED |
| Branch | `decision-flow-demo-v1` | VERIFIED |
| HEAD | `d560128b873c4189dc7e0677e62a0554bf30a34c` | VERIFIED |
| Förväntad commit i HEAD | exakt HEAD | VERIFIED |
| Remote | `origin git@github.com:SneakyMoccasin/01systems-site.git` fetch/push | VERIFIED |
| Initial `git status --short` | tom | VERIFIED |
| Arbetskatalog före audit | ren | VERIFIED |

Förkontrollen passerade innan någon rapportfil skapades.

## 3. Canonical runtime map

1. **Domain/profile selection.** `pulseLanguage.ts::DomainKey` härleds från `domainDrivers` och är exakt `realEstate | municipal | consulting` (`:1-22`). `configuredRunSource.ts::prepareOrdinaryConfiguredRunSource` härleder betrodd profile från domän; godtycklig inkommande profile-attribution ignoreras. **VERIFIED (runtime/test):** `executableDomainProfile.test.ts:103-116`.
2. **Profile resolution.** `executableDomainProfile.ts::PROFILES`, `DOMAIN_PROFILE_IDS` och `resolveExecutableDomainProfile` väljer en djupt fryst kodinstans och failar på okänd/mismatchad identitet (`:153-193`). **VERIFIED (runtime/test):** `executableDomainProfile.test.ts:27-54`.
3. **Input boundary.** Initiative mode kräver version, mode, domain/profile, horizon, initial state, V2 structural contract och A/B schedules. `runInitiativeScheduledAnalysis.ts::prepareInitiativeScheduledAnalysis` validerar före execution. Unknown fields avvisas av `validationV2.ts::rejectUnknownFields` och schedule-validatorn. **VERIFIED (runtime/test):** `validationV2.test.ts`; `runInitiativeScheduledAnalysis.test.ts`.
4. **Effect resolution.** `resolveInitiativeSchedules.ts::resolveInitiativeSchedules` binder varje `effectDefinitionId` till profilens canonical `actionEffects`; caller-supplied deltas accepteras inte. **VERIFIED (runtime/test):** `resolveInitiativeSchedules.test.ts`, särskilt canonical clone/isolation assertions.
5. **Scheduled execution.** `runInitiativeScenario.ts:135-187` sorterar per period, skapar en lokal engine och stegar samma instans genom hela trajectoryn. `executeInitiativeTransition.ts:76-109` kombinerar samtidiga canonical deltas deterministiskt, applicerar dem före `stepForward` och skriver faktisk provenance. **VERIFIED (runtime/test).**
6. **Driver state.** `driverScoreState.ts:5-49` mappar `LOW/MODERATE/HIGH/SEVERE` till 0..3, clamp och fasta bandgränser. `RealEstateEngine.applyDriverDeltas` validerar driver och finite delta atomiskt (`:73-108`). **VERIFIED (runtime/test):** `RealEstateEngine.driverDeltas.test.ts`.
7. **Propagation.** `riskPropagation.ts::propagateRisks` är en data-driven, iterativ directed-edge-algoritm; rules väljs från profile. Triggerpolarity hämtas dock via globala `impactContract.ts::getPropagationTriggerLevels`. **VERIFIED (runtime); DOMAIN-COUPLED boundary.**
8. **Dimensions och curves.** `computeDimensionMultipliers.ts:24-87` foldar profile impact entries till exakt `load/cost/recovery/sensitivity`. `curveConfig.ts:96-162` implementerar tre generiska curve-funktioner, men exponential exponent 1.2 och logistic `k=0.8`, `x0=3` är interna konstanter; okänd curve/config ger neutral `1`. **VERIFIED (runtime).**
9. **Constraints.** `simulateConstraintsStep.ts:55-105` aktiverar endast `RefinancingConstraint`, med en otypad `riskState.sustainThreshold` override, och tillämpar effects för tre fasta constraintnamn. Registryt innehåller dessutom `Custom`, men ingen generell activation semantics (`constraintState.ts:1-43`). **VERIFIED (runtime); NOT SUPPORTED som generell policy.**
10. **Structural Margin.** `RealEstateEngine.ts:201-221` beräknar risk pressure och erosion med fasta koefficienter 1.2/1.1/0.45/0.8 samt pull-to-baseline 0.12; baseline 1.0 och sensitivity 1.2 sätts i konstruktorn (`:56-57`). Profilen styr endast clamp. **VERIFIED (runtime).**
11. **Results/serialization.** Analysis projection skapar trajectories, histories, terminal state, comparison och provenance. Saved-run identity jämför domain/profile/model/calibration; Structural Observation använder versionerad canonical JSON och SHA-256-identiteter (`initiativeStructuralObservationIdentity.ts:4-17,131-220`). **VERIFIED (runtime/test).** Domain-model-package fingerprint finns inte. **NOT SUPPORTED.**
12. **Structural Observation.** Körs efter avslutad motoranalys och observerar prerequisites/resources utan enforcement. Definition, A-plan och B-plan har separata fingerprints; output är detached och recursively frozen. **VERIFIED (runtime/test):** `observeCompletedInitiativeStructuralAnalysis.test.ts`; `initiativeStructuralObservationFingerprints.test.ts`.
13. **Presentation/interpretation.** Domain labels, scenario copy och inspector narratives ligger i UI/i18n och presentation builders. De påverkar inte trajectory. AI context är ett härlett, säkerhetsbegränsat tolkningslager, inte motorbevis. **VERIFIED (runtime/test).**

## 4. Genericity map

| Komponent | Klassificering | Evidens och bedömning |
|---|---|---|
| Initiative input contract, schedules, horizon | GENERIC CORE | Versionsstyrt och strikt, men `domainId/profileId/effectDefinitionId` är closed unions. `initiativeScheduledAnalysisContract.ts`; validators. VERIFIED (runtime/test). |
| `domainId` / `profileId` | DOMAIN CONFIGURATION, stängd boundary | Tre `DomainKey` och tre `ExecutableProfileId`; registry lookup fail-closed. `pulseLanguage.ts:1-22`; `executableDomainProfile.ts:10-20,153-193`. |
| Executable profile container/deep freeze | GENERIC CORE | Bra embryo till contract; immutable lookup. `executableDomainProfile.ts:41-80`. |
| `PROFILES`, `DOMAIN_PROFILE_IDS`, legacy builder | DOMAIN CONFIGURATION | Kodregistry, samtliga profiler härleds från global legacy model. `executableDomainProfile.ts:83-171`. |
| `RealEstateEngine` orchestration/state | DOMAIN-COUPLED CORE | Generisk state progression men fasta margin- och financingsemantiker. `RealEstateEngine.ts:37-67,123-297`. |
| Risk/driver score mechanics | GENERIC CORE med DOMAIN-COUPLED scale | Record-baserad state/deltas är generell; fyra labels, 0..3 clamp och band är globala. `driverScoreState.ts:3-49`. |
| Action definitions/effects | DOMAIN CONFIGURATION, stängd | `ActionKey` och `ACTION_EFFECTS` kodlåsta; profile type kräver alla keys. `actionEffects.ts::ActionKey,ACTION_EFFECTS,DOMAIN_ACTIONS`. |
| Effect resolution/batching | GENERIC CORE | Profile-owned lookup, cloned deltas, stable same-period combination. `resolveInitiativeSchedules.ts`; `canonicalDriverDeltaBatch.ts`; `executeInitiativeTransition.ts:76-85`. |
| Driver relationships | DOMAIN CONFIGURATION | Data i profile; municipal subset visar variation utan ny algoritm. `executableDomainProfile.ts:133-163`. |
| Propagation algorithm | GENERIC CORE med kopplad trigger lookup | Data-driven edges; polarity lookup använder global real-estate contract. `riskPropagation.ts::propagateRisks`; `impactContract.ts:280-304`. |
| Driver-to-dimension mapping | DOMAIN CONFIGURATION men closed vocabulary | Profile-owned `impactContract`, men `ParameterKey`, `ImpactSpec` och fyra dimensions är unions. `impactContract.ts`; `computeDimensionMultipliers.ts:12-22`. |
| Curve evaluators | DOMAIN-COUPLED CORE | Återanvändbara former, men formparametrar och silent neutral fallback är interna. `curveConfig.ts:96-162`. |
| Structural Margin | DOMAIN-COUPLED CORE | Fasta dimensioner, vikter, baseline, erosion och recovery pull. `RealEstateEngine.ts:56-57,201-221`. |
| Thresholds | DOMAIN-COUPLED CORE / DOMAIN CONFIGURATION | Score bands globala; refinancing threshold profile-owned; `sustainThreshold` kan smygas in via risk state. `driverScoreState.ts:27-33`; `simulateConstraintsStep.ts:55-64`. |
| Constraints | DOMAIN-COUPLED CORE | Fasta typer och endast refinancing activation. `constraintState.ts:1-43`; `simulateConstraintsStep.ts:60-105`. |
| Baseline/default initial state | DOMAIN CONFIGURATION med legacy fallback | Profile har `defaultState`, men UI fresh state importerar global `defaultRiskState`. `domainState.ts:25-48`; `executableDomainProfile.ts:49,85`. |
| Scheduled execution/inherited state | GENERIC CORE | Profile injiceras; ingen casespecifik branch. `runInitiativeScenario.ts:146-187`. |
| Structural Observation | GENERIC CORE | Initiativ-ID, FTS och named resources; post-hoc, deterministic. `structuralObservation/*`. |
| Findings/UI labels/renderer | PRESENTATION ONLY, delvis domain-coupled | Real-estate/transport komponentnamn och texter; presentation påverkar inte runtime. `pulseLanguage.ts`; `CascadeRendererRealEstate.tsx`; `CascadeRendererTransport.tsx`. |
| Interpretation context | PRESENTATION ONLY | Trace-derived safety-bounded context. `scheduledInterpretationContext.ts`. |
| Fingerprints/hashes | GENERIC CORE men ofullständig model identity | Robust structural identities; saknar full profile payload hash. `initiativeStructuralObservationIdentity.ts:4-17`. |
| Persistence compatibility | GENERIC CORE | Jämför identity och avvisar olika domäner/profiler, men litar på strängversioner. `savedRunPersistence.ts`; `savedRunPersistence.test.ts`. |
| Arkiverade/äldre demos | LEGACY/UNUSED | `_archive_disabled/*` ingår inte i canonical path. VERIFIED (runtime search). |

## 5. Domain assumptions inventory

| Antagande | Fil/symbol → consumer | Beteende; semantik/namn | Numerik | Nödvändig boundary | Risk |
|---|---|---|---|---|---|
| Exakt tre domäner | `pulseLanguage.ts::domainDrivers/DomainKey` → selectors, profile resolver | Semantiskt closed set | Indirekt | Open string ID validerad mot registry | Medel |
| Exakt tre profiler | `executableDomainProfile.ts::ExecutableProfileId/PROFILES` → all runs | Semantiskt closed set | Ja | Versionerat package registry | Hög |
| Alla profiler delar legacy effects/curves/impact | `LEGACY_EXECUTABLE_CONTRACT` → `createLegacyProfile` | Semantiskt | Ja | Självständig komplett profile payload | Hög |
| `ActionKey` är global union och profile kräver alla actions | `actionEffects.ts` → schedule validation/resolution | Semantiskt | Ja | Per-profile action registry; inga dubbla globala registries | Hög |
| Driver vocabulary är `ParameterKey` | `impactContract.ts` → deltas, profile, curves | Semantiskt | Ja | Per-profile unique driver definitions och referential integrity | Hög |
| Risk scale är LOW..SEVERE/0..3 | `driverScoreState.ts` → engine/effects | Semantiskt | Ja | Låst scale contract; MVP bör behålla exakt skalan | Hög |
| Propagation höjer kategorisk nivå och reverserar inte historik | `riskPropagation.ts::propagateRisks` → engine | Semantiskt | Ja | Declarative directed rules + fixed algorithm ID | Hög |
| Triggerpolarity kommer från global impact spec | `impactContract.ts::getPropagationTriggerLevels` → propagation | Semantiskt | Ja | Trigger levels/polarity per driver/rule | Hög |
| Endast fyra impact dimensions | `computeDimensionMultipliers.ts::DimensionMultipliers` → margin/constraints | Semantiskt | Ja | Versionerad dimension vocabulary; MVP behåll fyra | Hög |
| Dimension fold är multiplikativ | `computeDimensionMultipliers.ts:37-78` → margin | Semantiskt | Ja | Fixed algorithm identity; profile får bara data | Hög |
| Curve shapes har hårda parametrar och neutral fallback | `curveConfig.ts:109-145` → multipliers | Semantiskt | Ja | Full curve validation; förbjud missing config/default | Hög |
| Structural Margin är fyra fasta termer | `RealEstateEngine.ts:201-217` → result | Semantiskt | Ja | Margin model/config med allowlisted algorithm ID | Kritisk |
| Baseline 1.0, sensitivity 1.2, pull 0.12 | `RealEstateEngine.ts:56-57,215` | Semantiskt | Ja | Profile/calibration fields eller permanent engine invariants | Kritisk |
| Finansieringsdriver läses direkt | `RealEstateEngine.ts:177` → constraints | Semantiskt real estate | Ja | Constraint input binding per policy | Hög |
| Refinancing är enda autoaktiverade constraint | `simulateConstraintsStep.ts:60-72` | Semantiskt finance | Ja | Allowlisted policy DSL/strategy; Step 2-del bör vänta | Kritisk |
| Fyra fasta constrainttyper | `constraintState.ts:1-43` → registry/UI | Semantiskt | Ja | Generic ID + validated lifecycle/policy registry | Hög |
| `sustainThreshold` i risk state är threshold | `simulateConstraintsStep.ts:55-58` | Semantiskt och otypat | Ja | Ta bort dold kanal under migration; explicit profile field | Kritisk |
| Fresh UI state använder global default | `domainState.ts:25-48` → UI | Semantiskt fallback | Ja | Resolve profile first; clone `profile.defaultState` | Hög |
| Klassnamnet `RealEstateEngine` | klass/imports → all execution | Namngivning **och** faktisk semantik | Nej i sig; ja via body | Byt namn sist eller aliasa; ingen V2 engine | Låg för namn, hög för felbedömning |
| Debug loggar nämner finance/property drivers | `RealEstateEngine.ts:147-255` | Namngivning/debug | Nej | Rensa först efter equivalence migration | Låg |
| Profile identity saknar payload fingerprint | `getExecutableIdentity` → provenance/persistence | Semantisk provenance-lucka | Inte direkt | SHA-256 över canonical full semantic payload | Kritisk auditability |

**Svar om `RealEstateEngine`:** inte bara felbenämnd. Själva state transition-loopen kan generaliseras, men margin equation, leverage/refinancing bindning, constraint activation och fyra dimensions är domänsemantik. En rename utan extraktion skulle ge en falsk generisk boundary. **VERIFIED (runtime).**

## 6. Proposed Domain Model Contract

Föreslagen top-level: `DomainModelPackageV1`, strikt JSON-kompatibel, unknown-field rejection på varje nivå, inga funktioner, inga `NaN/Infinity/-0`, inga implicita defaults. Package valideras och canonicaliseras **före** registry insertion eller engine construction, klonas, djupfryses och fingerprints. **INFERRED.**

| Fält | Req/type och validering | Runtime consumer | Semantic identity / mellan runs | Felkonfigurationsrisk |
|---|---|---|---|---|
| `schemaVersion` | req literal `domain-model-package-v1` | validator/serializer | Ja; immutable | Hög: schema drift |
| `domainModelId` | req namespaced string, stabil, unik | registry/input resolution | Ja; aldrig ändra in-place | Hög: spoof/collision |
| `domainModelVersion` | req immutable semver eller monotonic opaque version | resolver/provenance | Ja; exakt låst per run | Kritisk: version reuse |
| `label` | req localized/presentation object; non-empty, bounded | UI only | Nej | Låg |
| `modelAlgorithmVersion` | req allowlisted engine algorithm ID | engine factory | Ja; fixed per run | Kritisk |
| `calibration` | req `{id,version,method?,reviewedAt?}`; stable IDs | provenance/gates | Ja; fixed | Kritisk: outcome tuning |
| `riskScale` | req ordered levels, numeric anchors, band thresholds; MVP exakt legacy fyra nivåer/0..3 | score materialization | Ja; fixed | Kritisk |
| `drivers` | req non-empty unique IDs; polarity, scale ref, label; strict identifier regex | state, deltas, propagation, UI | Ja; fixed | Kritisk: unknown/missing |
| `initialStateVocabulary` | req exact one value/score per applicable driver; no extras | engine construction | Ja för default model; case override separat | Hög |
| `actions` | req unique IDs, label optional, `effects` finite driver deltas; referenced drivers only; bounded deltas | resolution/execution | Ja; fixed | Kritisk |
| `propagation.relationships` | req unique edge IDs/source/target/trigger levels/target level/delay; all refs known; deterministic order; cycle policy | propagation | Ja; fixed | Kritisk: cycles/explosion |
| `impactDimensions` | req unique allowlisted IDs; MVP exakt load/cost/recovery/sensitivity | multiplier/margin | Ja; fixed | Kritisk |
| `driverImpacts` | req complete mappings where applicable; known refs/direction | multiplier fold | Ja; fixed | Kritisk |
| `curves` | req one valid config per impacted driver; allowlisted LINEAR/EXPONENTIAL/LOGISTIC plus all numeric parameters explicitly present | curve evaluator | Ja; fixed | Kritisk: silent neutral |
| `marginModel` | req allowlisted algorithm ID plus baseline, sensitivity, term weights, pull, clamp; finite/ranged | Structural Margin | Ja; fixed | Kritisk |
| `thresholds` | req named, typed, finite, unit/scale-bound; no case-state overrides | score/constraints/presentation | Ja; fixed | Kritisk: tuning |
| `constraints` | req registry + allowlisted activation/effect policies; known driver/dimension refs; MVP only existing policies | constraint simulation | Ja; fixed | Kritisk |
| `structuralFeatures` | req capability flags/versions: FTS, constant/periodized capacity, claims, observation-only/enforcement mode | V2 validator/Step 2 gate | Ja; fixed | Hög |
| `resources` | req allowed resource ID patterns and units; optional profile-level catalog; units must match claims/capacity | structural validation | Ja för catalog; run values case-owned | Hög |
| `validationPolicy` | req explicit max drivers/actions/edges/resources/horizon, delta/range bounds, cycle and completeness rules | preparation | Ja | Kritisk |
| `provenance` | req issuer, authors/reviewers, created/reviewed dates, source/evidence manifest refs, change rationale | audit/result export | Ja; metadata changes create version | Hög |
| `evidence` | req per calibrated element: evidence/assumption IDs, locators/digests; content may live externally | review gate | Ja via manifest digest | Hög |
| `canonicalizationVersion` | req allowlisted | fingerprint builder | Ja | Kritisk |
| `fingerprintAlgorithm` | req `sha256` initially | fingerprint builder | Ja | Kritisk |
| `immutableFingerprint` | req 64 lowercase hex over all semantic fields excluding itself and presentation-only labels | resolver/provenance/persistence | Ja; fixed | Kritisk |

Referential validation måste säkerställa: alla state/effect/edge/curve/impact/constraint-driver-referenser finns; inga extra default-state drivers; alla numeriska värden är finite och inom policy; action effects är icke-tomma och domain-supported; edge IDs är unika; cycles avvisas i MVP; dimensioner och algorithms är allowlistade; package identity och computed fingerprint matchar; profile är recursively frozen. **INFERRED.**

MVP bör **inte** generalisera risk scale, dimensionalgoritm eller constraint DSL mer än nödvändigt. Fälten ska ändå deklareras och fingerprints så att legacysemantiken är explicit. Pilotversionen kan senare tillåta fler granskade algorithm IDs utan att göra dem till case input.

## 7. Configuration safety boundaries

| Boundary | Tillåtet innehåll | Förbjudet/krav |
|---|---|---|
| Vanlig case input | vald registrerad `domainModelId@version`; horizon; full initial state inom profile vocabulary; initiatives som refererar godkända action IDs; A/B timing; FTS prerequisites; resource instances, capacities och claims i godkända units; labels/evidence refs | Inga deltas, curves, weights, thresholds, nya drivers, constraint algorithms eller fingerprint overrides |
| Granskad domain profile | drivers, default state, actions/effects, propagation, impact mapping, curves, margin calibration, thresholds, constraint policies, feature flags, allowed resource units, evidence/provenance | Måste code-reviewas, versioneras, valideras, fingerprints och golden-testas |
| Intern engine configuration | supported algorithm implementations, canonicalization/hash protocol, deterministic ordering, numeric safety limits, execution phase order, state transition invariants | Endast allowlisted IDs; inga exekverbara callbacks i package |
| Inte konfigurerbart | randomness/time/network under run, arbitrary code/formulas, mutation after preparation, silent defaults, caller-controlled fingerprint, disabling validation, per-run tuning av calibration | Fail closed |

Säkerhetsanalys:

- **Extrema weights/deltas:** kan forcera clamp och fabricera önskat resultat. Begränsa med reviewed calibration ranges och reject, aldrig clamp vid profile validation. **INFERRED.**
- **Propagation cycles:** nuvarande monotona fyra-nivålogik terminerar, men cycles kan skapa svårförklarade cascades och blir farliga om framtida regler inte är monotona. MVP: avvisa cycles; pilot: endast explicit reviewed SCC-policy med bound. **INFERRED.**
- **Unknown drivers/effects/dimensions:** fail closed och path-specifikt fel. Nuvarande `applyDriverDeltas` gör detta för drivers; profile-package validator saknas. **VERIFIED/NOT SUPPORTED.**
- **Outcome-tunade thresholds:** calibration ID, evidence, preregistrerad review och ny version/fingerprint vid varje ändring. **INFERRED.**
- **Invalid constraint policies:** endast allowlisted declarative operators; type/unit/reference validation; inga expressions/eval. **INFERRED.**
- **Nondeterminism:** canonical ordering, locale-independent comparison, no current time/randomness, golden repeat tests. Existing scheduled/observation paths är deterministiska. **VERIFIED (test).**
- **Mutation:** clone + validate + deep freeze före run; result detached/frozen. Existing profiles och V2 output är frozen. **VERIFIED (test).**
- **Spoofing/provenance gaps:** resolver ska matcha ID+version+computed fingerprint mot trusted registry; current identity har ingen profile payload hash. **NOT SUPPORTED.**
- **Schema drift/silent defaults:** exact literal version och unknown-field rejection; förbjud default `1` för missing curve och legacy profile fallback på den nya boundaryn. **INFERRED; current fallback VERIFIED.**

## 8. MVP for first external profile

**Ja:** första profilen bör registreras i kod, men som en validerad instans av samma generella kontrakt som de tre legacyprofilerna. Detta är inte user authoring. **INFERRED.**

Minsta säkra implementation:

1. Definiera JSON-lik `DomainModelPackageV1`, canonical projection, strict validator, fingerprint builder och trusted code registry.
2. Gör engine entry points beroende av ett enda validated/frozen package; eliminera nya körningars globala lookups och silent legacy defaults.
3. Representera befintliga `LEGACY_EXECUTABLE_CONTRACT`, tre `PROFILES`, `ACTION_EFFECTS`, relevant `DOMAIN_ACTIONS`, `RISK_PROPAGATION`, impact mapping, curves, thresholds, defaults och margin/constraint calibration som tre package instances utan värdeändring.
4. Lägg in infrastructure/transport package med casespecifika driver/action/edge-data, men initialt samma allowlistade risk scale, dimensions, margin algorithm och constraint capabilities som engine säkert stöder.
5. Bind result/saved-run provenance till package ID, version, calibration och fingerprint.
6. Lås ekvivalens före borttagning av legacy registry; ingen dubbel runtime registry får finnas efter switchover.

Utvecklare måste fortsatt granska och versionslåsa driver semantics, action deltas, propagation, curves, weights, thresholds, constraints, scale och evidence. Labels, case initial state, initiative instances, schedule, dependencies och capacity kan vara vanliga inputs inom profile policy.

Kan vänta: UI authoring, upload/import, database, remote registry, approval workflow UI, arbitrary scales/dimensions, generell constraint DSL och Step 2 enforcement. MVP kräver **inget** nytt UI, persistence, API-route eller databasschema. Ett internt package-schema är en kodkontraktsändring men inte en databasschema-migration. **INFERRED.**

Alla tre nuvarande profiler kan representeras genom kontraktet eftersom `ExecutableDomainProfile` redan samlar deras exekverbara data. För exakt ekvivalens måste även de idag interna margin/curve- och fallbackkonstanterna deklareras eller låsas till ett explicit algorithm version. **VERIFIED (runtime) + INFERRED.**

Requirement probes: Probe A/B kräver nya driver- och action vocabularies, multi-driver effects, relationships, FTS och shared resources. Kontraktet kan bära detta. Nuvarande engine kan däremot bara tolka dem numeriskt genom sina fyra dimensions och befintliga margin/constraint algorithms; claims om full infrastructure/rail semantics är därför **NOT SUPPORTED** innan den nya profilen har evidens, calibration och golden tests. Ingen historisk sanningsbedömning gjordes. **OUT OF SCOPE.**

## 9. Backward-compatible migration plan

| Checkpoint | Arbete | Gate | Stop condition |
|---|---|---|---|
| M0 Baseline capture | Frys HEAD, alla nuvarande profile outputs, Executive hashes/metrics, action/effect, propagation, constraints, observation och claims | Alla goldens gröna två gånger | Någon flaky/oklar baseline |
| M1 Contract only | Lägg typer, strict validation, canonicalization/fingerprint utan runtime switch | Invalid/unknown/mutation contract tests | Silent default, fingerprint ambiguity |
| M2 Legacy adapters as data | Materialisera tre packages från exakt nuvarande värden | Deep equality för varje semantic payload | Ett värde saknas/normaliseras |
| M3 Shadow resolution | Resolve package parallellt endast för jämförelse, aldrig separat execution | Byte-for-byte canonical payload och identity | Två sanningskällor divergerar |
| M4 Single-profile injection | Låt befintlig engine konsumera validated package; behåll samma engine | Samtliga trajectory/result/provenance hashes identiska | Minsta numeriska/provenance-avvikelse |
| M5 Remove fallbacks | Ta bort globala runtime lookups, `sustainThreshold`-kanal och profile-less fallback vid nya boundaryn; legacy API får explicit adapter | Unknown/missing fail-closed | Dold fallback eller dubbel registry |
| M6 External package | Lägg första reviewed infrastructure/transport package | Contract, semantic review, determinism, scale och profile goldens | Obevisad mapping/constraint semantics |
| M7 Product exposure | Exponera endast registrerad profile selection om behövligt | Claims/UI/persistence compatibility | Spoofbar identity eller cross-profile compare |

Ingen `RealEstateEngineV2`, historical-case engine, domain `if` i engine eller separat effect registry får skapas. Namnbyte kan göras sist som mekanisk refaktor efter ekvivalens; kompatibilitetsalias kan temporärt bevara imports. **INFERRED.**

## 10. Regression and equivalence gates

Före och efter varje runtime checkpoint ska följande låsas:

- Exakt trajectory JSON/SHA-256, terminal state, margin-, constraint- och cascade histories för alla tre profiler över representativa initial states/horizons; dagens särskilda real-estate/consulting legacy parity och municipal subset måste bevaras. `preconfiguredGolden.test.ts`, `modelRegression.test.ts`, `executableDomainProfile.test.ts`, `transportPropagationProfile.test.ts`, `transportFinancingIsolation.test.ts`. **VERIFIED (test).**
- Executive Demo A/B/baseline hashes `8f7834…`, `28bd52…`, `1e7db2…`; exakta 36-period metrics inklusive max separation 6, cumulative separation `107.22345298061776`, clamp/constraint/convergence periods och provenance. `scheduledExecutiveDemo.test.ts:72-98`. **VERIFIED (test).**
- Action-effect equality för varje action, multi-action order invariance, same-effect instances, fractional deltas, atomic rejection och clamping. `preconfiguredGolden.test.ts`; `canonicalDriverDeltaBatch.test.ts`; `RealEstateEngine.driverDeltas.test.ts`; `resolveInitiativeSchedules.test.ts`.
- Propagation edge sets/events/order, trigger polarity och no-cross-domain financing cascades. `transportPropagationProfile.test.ts`; `transportPropagationMetadata.test.ts`.
- Constraint lifecycle, activation periods/effects, municipal disablement, Structural Margin coefficients/clamps och exact margins. `modelRegression.test.ts`; `transportFinancingIsolation.test.ts`; goldens.
- Scheduled A/B same initial/action set, inherited state, actual execution provenance, baseline and comparison parity. `runCascadeAnalysis.scheduled.test.ts`; `runInitiativeScheduledAnalysis.test.ts`; `runCascadeAnalysis.parity.test.ts`.
- Structural Observation diagnostics, observation-only behavior, fingerprints, identity compatibility, serialization round-trip, determinism, immutability and 10/30-initiative scale. `structuralObservation/*test.ts`.
- Public website bounded claims remain present and broad claims absent. `publicWebsiteClaims.integration.test.ts`.

Nya contract tests/goldens:

1. Valid package round-trip → identical canonical bytes/fingerprint; label/order neutrality only där uttryckligen tillåtet.
2. Unknown field, unknown reference, missing required field, duplicate ID/edge, non-finite/-0, out-of-range value, unsupported algorithm/curve/dimension/policy, cycle och fingerprint mismatch reject före engine construction.
3. Deep immutability och caller detachment för nested arrays/maps; mutation efter preparation kan inte ändra run.
4. Registry rejects duplicate `id@version`, version reuse with new fingerprint, ID/version spoof och untrusted package.
5. Golden semantic payload för varje legacy package och full output equivalence för varje public execution mode.
6. External profile golden: canonical effects, propagation, constraint support, trajectory, provenance, deterministic repeat, scale bounds och cross-profile comparison rejection.
7. No-fallback source guard: canonical execution imports varken global effects/curves/default state eller implicit legacy resolver.

Auditkörning vid denna HEAD: **104/104 passerade**, 0 failed/skipped, över 13 utvalda filer. Omfattade profile/goldens, engine deltas, transport propagation/isolation, Executive Demo, claims, V2 validation/orchestration/fingerprints/scale/observation. **VERIFIED (test).**

## 11. Relationship to Step 2

Domain Model Contract bör göras **före Step 2**, med en avgränsning: etablera identity, driver/action/resource vocabulary, immutable package, validation och nuvarande constraint capability declarations nu; designa inte ett generellt enforcement-språk i förväg. **INFERRED.**

Step 2 behöver generisk boundary för initiative IDs, effect definitions, prerequisites, resources/units, capacity/claims, supported structural features, constraint IDs/policies, phase order och provenance. Byggs Step 2 först mot `ActionKey`, tre legacyprofiler, fasta constrainttyper och real-estate margin inputs kommer regler, felmeddelanden, persistence och tests att cementera fel vocabulary och behöva migreras två gånger.

Kontraktet kan byggas utan Step 2 eftersom Step 1 redan har profile injection, immutable preparation, strict structural validation och observation-only feature semantics. Step 2 kan senare konsumera samma package och endast aktivera policies vars `structuralFeatures.enforcement` och algorithm version stöds. Det som bör vänta är generell activation/recovery DSL, konfliktresolution mellan samtidiga constraints, resource/dependency enforcement ordering och nya constraint effects; dessa är Step 2-designbeslut.

## 12. Complexity and time estimates

Antaganden: en utvecklare med god repo-kännedom; befintlig testmiljö; ingen historisk research, UI redesign, ny numerisk calibration eller extern approval latency. Tider är intervall, inte löften.

| Leverans | Svårighet/risk | Berör | Implementation / test | Vanlig failure mode | Motorresultat |
|---|---|---|---|---|---|
| 1. Ny hårdkodad profile idag | Medel / hög semantisk risk | unions, registries, globals, UI labels, tests | 2–4 dagar / 2–3 dagar | Ser registrerad ut men återanvänder legacy drivers/effects/margin felaktigt | Sannolikt nya resultat; legacy kan oavsiktligt ändras |
| 2. Minimalt generellt contract | Hög / hög | schema, validator, canonicalization, fingerprint, registry, engine boundaries | 6–10 dagar / 4–7 dagar | Silent fallback eller ofullständig identity | Ska vara noll för legacy; gate krävs |
| 3. Migrera tre profiler | Medel–hög / kritisk regression | all profile data, defaults, entry points, persistence | 4–7 dagar / 4–7 dagar | Ett implicit default missas | Måste vara byte/exakt oförändrat |
| 4. Första externa infrastructure/transport profile | Hög / hög modellrisk | reviewed package, mappings, goldens, presentation labels | 5–10 dagar / 4–7 dagar, exkl. evidens/calibration | Semantiskt olämplig margin/constraint mapping | Nya profile-resultat; legacy noll förändring |
| 5. Robust pilotredo system | Mycket hög / hög | signed/trusted registry, evidence, compatibility, richer validation/tooling | 4–8 veckor / 2–4 veckor | Version/provenance drift och otillräcklig review | Legacy oförändrat; nya calibrated outputs |
| 6. User/UI authoring | Mycket hög / kritisk | authoring UX, auth, approvals, storage, migrations, sandboxing, preview/diff | 8–16+ veckor / 4–8+ veckor | Outcome tuning, invalid packages, unsafe publication | Kan påverka allt om boundary läcker |

Extern profile-estimat förutsätter att expertgranskad modelldefinition redan finns. Om drivers, relations, weights, thresholds och evidence ska tas fram tillkommer ett separat, sannolikt större modelleringsarbete. **INFERRED.**

## 13. Claims assessment

Aktiva claims verifierades via de filer som `publicWebsiteClaims.integration.test.ts:9-35` läser.

| Claim | Bedömning | Evidens/kvalificering |
|---|---|---|
| “Within a configured model … same starting conditions and actions … different orders/times” | SUPPORTED NOW | Exakt aktiv homepage-copy och Executive golden. `publicWebsiteClaims.integration.test.ts:39-49`; `scheduledExecutiveDemo.test.ts:47-98`. |
| Represented states/effects propagate through explicitly configured structural relationships | SUPPORTED NOW | Active architecture copy; profile rules konsumeras av propagation. Claims-test `:51-58`. |
| Configured timing/order, represented capacities and configured constraints affect represented decision space within model | SUPPORTED WITH QUALIFICATION | Timing påverkar engine; capacity/prerequisite påverkar idag endast diagnostisk observation, inte execution. Claims-test `:60-63`; Step 1 contract. Copy måste fortsätta skilja “represented/observed” från enforcement. |
| Domain-agnostic engine | NOT YET SUPPORTED | Closed unions samt hardcoded margin/finance/constraints. |
| Cross-domain / reusable across arbitrary domains | NOT YET SUPPORTED | Tre valbara labels/profiles är inte ett öppet domain contract; municipal har särskild subset men delar legacy model. |
| Configurable models | SUPPORTED WITH QUALIFICATION | Developer-coded, immutable executable profiles finns; användare kan inte definiera drivers/effects/model packages. Formulera “within a configured model”, inte “configure your own model”. |
| Pilot setup for a reviewed new domain | FUTURE CAPABILITY | Contract, validation, evidence/calibration och external golden saknas. |

Claims som måste kvalificeras före kontraktet: varje aktiv text som säger eller implicerar “domain-agnostic”, “cross-domain”, “reusable across domains”, “configurable domain models”, “bring your own model” eller snabb pilotkonfiguration. Tillåtna formuleringar ska avse **de registrerade, konfigurerade modellerna** och separera Structural Observation från execution enforcement. Ingen webbändring föreslås eller gjordes.

## 14. Contradictions and unsupported assumptions

1. `ExecutableDomainProfile` ser generisk ut men typerna låser profile IDs, model/calibration versions, all-actions record, `ParameterKey` och tre constraintnamn. **VERIFIED (runtime).**
2. `RealEstateEngine` injicerar profile men behåller real-estate/finance semantics i transition body. Antagandet “endast fel namn” stöds inte. **NOT SUPPORTED.**
3. `constraints.activeEffects` kan konfigurera Liquidity/Covenant, men canonical runtime har ingen generell activation för dem. Ett fyllt registry är inte bevis på fungerande policy. **VERIFIED (runtime).**
4. Profile har `defaultState`, men fresh domain UI bygger alla domäner från global `defaultRiskState`. **VERIFIED (runtime).**
5. Profile identity innehåller versionsträngar men inte semantic payload fingerprint; Structural Observation har starkare fingerprints för structural input än engine profile har för sin model. **VERIFIED (runtime).**
6. Missing curve returnerar `1`, och profile-less engine resolvear legacy real estate. Detta står i konflikt med ett framtida strict/no-silent-default contract. **VERIFIED (runtime).**
7. Active claim om capacities/constraints kan läsas för brett: capacity är Step 1 observation och verkställer inte blockering. Kräver fortsatt qualification. **SUPPORTED WITH QUALIFICATION.**
8. Historical Case Readiness Auditens runtimefynd bekräftas, men dess repository HEAD `2aa18c…` är äldre än denna audits HEAD `d560128…`; dess testantal ska inte återanvändas som aktuell verifiering. **VERIFIED.**

## 15. Recommended implementation order

1. Baseline/golden manifest för samtliga nuvarande outputs och claims.
2. Contract schema, strict validator, canonicalization och full semantic fingerprint.
3. Explicit legacy package instances med exakt dagens numerik.
4. En enda trusted resolver och validated/frozen injection genom alla entry points.
5. Ta bort silent globals/fallbacks från canonical path; behåll endast tydligt testad legacy adapter där backward compatibility kräver det.
6. Bind provenance, serialization och comparison compatibility till package fingerprint.
7. Registrera och reviewa första external package; kör contract + domain golden gates.
8. Därefter Step 2 design mot samma boundary.
9. Först senare pilot tooling; sist user authoring.

## 16. Stop conditions

Stoppa migration/release om något av följande inträffar:

- någon legacy trajectory byte/hash, margin, event, constraint lifecycle, provenance, fingerprint eller Executive metric ändras;
- package kräver en andra engine, effect registry eller domain-specific branch i core;
- en modelreferens kan resolveas via mer än en sanningskälla;
- validator accepterar unknown fields/references, cycles, non-finite/out-of-range values eller unsupported algorithms;
- missing model data faller tillbaka till neutral `1`, global config eller legacy profile;
- package kan muteras efter preparation eller fingerprint täcker inte alla numeriskt/semantiskt relevanta fält;
- ID/version/fingerprint kan spoofas eller återanvändas med ändrat payload;
- external profile saknar reviewed calibration/evidence för resultpåverkande värden;
- Step 2 enforcement byggs innan ordering, conflict och provenance semantics är explicit versionerade;
- publika claims överstiger verifierad configured-model/observation capability.

## 17. Final readiness verdict

**CONTRACT-READY WITH EXTRACTION; NOT EXTERNAL-PROFILE READY TODAY.** Arkitekturen har tillräckliga seams för ett Domain Model Contract utan parallell motor: profile injection, deterministic scheduling, data-driven effects/relationships, strict structural validation, immutability och fingerprints. Men kontraktet är ännu inte en fristående, fullständigt validerad semantic identity, och kärnans margin/constraint/scale/dimension assumptions måste antingen lyftas in i ett allowlistat package eller explicit deklareras som oföränderliga algorithm-versioner.

En backward-compatible migration är realistisk och ska inte ändra befintliga numeriska resultat. Den första externa profilen bör komma **efter** kontrakts- och legacy-equivalence-gates och **före** Step 2. UI, databas, nya routes och user authoring behövs inte för MVP.

## Slutverifiering

- Avsedd enda skapade fil: `docs/audits/domain-model-contract-readiness-audit.md`.
- Ingen runtimekod, schemafil eller testfil ändrades.
- Ingen commit, push, merge, deployment eller Vercel-interaktion utfördes.
- Ingen extern historisk research utfördes.
