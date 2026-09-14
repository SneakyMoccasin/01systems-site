# Historical Case Readiness Audit – Cascade Engine Step 1

Auditdatum: 2026-09-14
Audittyp: read-only code- och testaudit
Omfattning: Cascade Engine Step 1; ingen historisk fallresearch

## Statusnyckel

- **VERIFIED (runtime):** följer canonical exekverande call path.
- **VERIFIED (test):** verifierat av namngivet test; utvalda sviter kördes vid auditen.
- **INFERRED:** metodkrav eller slutsats härledd från verifierad kapacitet, inte ett runtime-kontrakt.
- **NOT SUPPORTED:** saknar stöd i nuvarande Step 1-runtime.
- **OUT OF SCOPE:** kräver annan produktkapacitet, historisk research eller Step 2.

## 1. Executive verdict

**Villkorat redo.** Step 1 kan representera och deterministiskt jämföra två scenarier med samma initiala tillstånd, samma initiativmängd och olika periodisering. Den kan exekvera canonical action effects, propagera drivers, aktivera motorns constraints, beräkna Structural Margin och i ett separat observationslager diagnostisera finish-to-start-brister och delad resursöverbelastning. **VERIFIED (runtime/test):** `runInitiativeScheduledAnalysis`, `runInitiativeScenario`, `RealEstateEngine.stepForward`, `observeCompletedInitiativeStructuralAnalysis`; 53 utvalda tester passerade.

Step 1 är däremot inte en generell historisk modellplattform. Historiska initiativ måste mappas till befintliga canonical action/effect definitions och befintliga domain profiles. Action effects, driverrelationer, curve amplitudes, marginformel, constraint policy, weights och thresholds är kodkonfiguration – inte fallinputs. En central historisk mekanism som inte kan uttryckas genom dessa element ska leda till avvisning, inte dold omkalibrering. **VERIFIED (runtime), INFERRED (readiness rule):** `validationV2.ts::validateAndNormalizeStructuralObservationContractV2`; `executableDomainProfile.ts::PROFILES`.

Det publika fallet måste presenteras i sju strikt separata lager: Documented History; What Was Known at the Time; Model Representation; Historical Represented Sequence; Counterfactual Configuration; Cascade Engine Result; Limitations / Human Judgement. Alla resultat är modellrelativa. Jämförelsen etablerar inte vad som skulle ha hänt i verkligheten, kausal skuld eller en optimal rekommendation. **INFERRED metodkrav; NOT SUPPORTED:** verklighetsprognos, sannolikheter, causal discovery, optimering och rekommendation.

## 2. Repository verification

| Kontroll | Resultat | Status |
|---|---|---|
| Absolut path | `/Users/christian/Projects/pulse_engine_clean` | VERIFIED |
| Branch | `decision-flow-demo-v1` | VERIFIED |
| HEAD | `2aa18c0a6ec94528f6678659457a97fadacdbf4c` | VERIFIED |
| Remote | `origin git@github.com:SneakyMoccasin/01systems-site.git` (fetch/push) | VERIFIED |
| Initial `git status --short` | tom | VERIFIED |
| Ocommittade ändringar före audit | nej | VERIFIED |

Verifieringen gjordes innan auditfilen skapades. Ingen befintlig UI-ändring fanns i den kontrollerade arbetskatalogen.

## 3. Canonical runtime map

1. **Input och gemensam valideringsgräns.** `src/pilotFastighet/analysis/structuralObservation/runInitiativeScheduledAnalysis.ts::prepareInitiativeScheduledAnalysis` validerar top-level, löser profile, validerar horizon, V2-kontrakt och A/B-scheman och fryser ett gemensamt prepared context (rader 72–166). **VERIFIED (runtime/test).**
2. **Initiativ till canonical effects.** `resolveInitiativeSchedules.ts::resolveInitiativeSchedules` binder `initiativeId` till kontraktets `effectDefinitionId` och profilens canonical driver deltas. V2-valideringen accepterar endast kända och domänstödda effects (`validationV2.ts`, rader 230–266). **VERIFIED (runtime/test).**
3. **Periodexekvering.** `runInitiativeScenario.ts::runInitiativeScenario` grupperar schemat per period, exekverar alla planerade initiativ eller stegar motorn utan initiativ (rader 112–187). `executeInitiativeTransition.ts::executeInitiativeTransition` kombinerar canonical deltas, applicerar dem och anropar sedan `stepForward` (rader 42–109). **VERIFIED (runtime/test).**
4. **Inherited state och motor.** Samma lokalt ägda engine-instans förs fram period för period. `RealEstateEngine.applyDriverDeltas` ändrar precise scores/risk state; `stepForward` använder föregående margin, registry, risk state, scores och events och producerar nästa post-transition state (`RealEstateEngine.ts`, rader 73–108, 123–297). **VERIFIED (runtime).**
5. **Propagation.** `riskPropagation.ts::propagateRisks` itererar konfigurerade directed edges tills inga nivåer höjs och registrerar cascade events (rader 73–221). Municipal profile begränsar edges till en explicit subset (`executableDomainProfile.ts`, rader 133–163). **VERIFIED (runtime/test).**
6. **Constraints.** `simulateConstraintsStep.ts::simulateConstraintsStep` kan aktivera RefinancingConstraint när margin understiger threshold och multiplicerar load/cost/recovery för aktiva constraints (rader 30–119). Registry definierar Refinancing, Liquidity, Covenant och Custom, men endast refinancing har aktiveringslogik här (`constraintState.ts`, rader 1–43). **VERIFIED (runtime); NOT SUPPORTED:** generell fallkonfigurerad constraintlogik.
7. **Structural Margin.** `RealEstateEngine.stepForward` beräknar multipliers, risk pressure, erosion och pull-to-baseline, därefter clampad margin (`RealEstateEngine.ts`, rader 189–221). Baseline margin 1.0 och sensitivity 1.2 är interna konstanter (rader 56–57). **VERIFIED (runtime).**
8. **Motorresultat.** `cascadeAnalysisProjection.ts::createScenarioAnalysisResult` projicerar trajectory, margin-, constraint- och cascade history samt terminal state; `compareScenarioTrajectories` ger B–A per steg, första divergensindex och terminal skillnad (rader 5–61). **VERIFIED (runtime/test).**
9. **Structural Observation.** Först efter färdig analys skapar `prepareInitiativeStructuralObservationRun` fas-säkra before/after-frames från trajectory och execution provenance (rader 304–344). `buildInitiativeDecisionSpaceSnapshots` bedömer prerequisites och resource pressure, skapar snapshots och diagnostics (rader 244–310). **VERIFIED (runtime/test).**
10. **Structural Findings/Consequences.** `structuralFindingsPresentationModel.ts` klassificerar presentation fields som configured input, direct engine evidence eller deterministic presentation (rader 1–172). Det finns ingen separat canonical runtime-typ benämnd “Structural Consequences”; sådana formuleringar är presentations-/tolkningsderivat och måste bära provenance. **VERIFIED (runtime search); NOT SUPPORTED som separat motoroutput.**
11. **Interpretation context.** `scheduledInterpretationContext.ts::buildScheduledInterpretationContext` skickar horizon, planerade scheman, faktisk provenance och fair-comparison facts samt uttryckliga safety rules till tolkningslagret (rader 1–40). AI-text är inte motorbevis. **VERIFIED (runtime).**
12. **Executive Demo.** `scheduledExecutiveDemo.ts` använder horizon 36, samma tre actions och samma startvillkor men annan ordning/timing (rader 10–43). `scheduledExecutiveDemo.test.ts` verifierar identiska initial states/action sets, exakta trajectory-hashar, provenance och metrics (rader 47–98). **VERIFIED (test).**

## 4. Historical-case input schema

### 4.1 Canonical initiative-mode input

Det strängaste och mest relevanta schemat för ett Historical Reference Case är `InitiativeScheduledAnalysisInputV1` (`initiativeScheduledAnalysisContract.ts`, rader 19–28).

| Input | Typ; required/default | Validering och runtime consumer | Betydelse och historisk evidens | Klassificering |
|---|---|---|---|---|
| `version` | literal `"initiative-scheduled-analysis-input-v1"`; required; ingen default | Exakt literal; `validateTopLevel` | Schemaidentitet; ingen historisk evidens | Modelleringsval |
| `executionMode` | literal `"initiative-schedule-v1"`; required | Exakt literal; orchestration | Väljer initiativbaserad schedule execution | Modelleringsval |
| `domainId` | enum: `realEstate`, `municipal`, `consulting`; required | Måste finnas i `domainDrivers`; matchas mot profile | Vald representativ domän; motivera med källor om fall-fit | Modellrepresentation |
| `profileId` | enum: `legacy-real-estate-v1`, `legacy-municipal-v1`, `legacy-consulting-v1`; required | Icke-tom och måste lösas/matcha domän | Låser model/calibration version | Modelleringsval |
| `horizon` | positiv integer; required; ingen default | `validateHorizon`; styr A, B, baseline, schedules, capacity och snapshots | Antal modellperioder | Modellantagande, grundat i faktisk tidsrymd |
| `initialState.initialRiskState` | `Record<string, RiskLevel>`; required; RiskLevel = LOW/MODERATE/HIGH/SEVERE | Top-level kräver objekt; motorn använder aktuella profile drivers | Tillstånd vid cutoff; kräver samtidiga primärkällor eller transparent kodning | Historiskt faktum + modellrepresentation |
| `initialState.initialDriverScores` | `Record<string, number>`; optional; default byggs 0/1/2/3 från risknivå | Motorn; scores clampas 0–3 | Precisionsnivå inom kategorier; kräver stark evidens eller explicit assumption | Modellantagande |
| `contract.version` | literal `"structural-observation-v2"`; required | Exakt literal; V2 validator | Structural contract version | Modelleringsval |
| `contract.initiatives` | array; required (får vara tom tekniskt) | Varje objekt strict-valideras; observation och schedule resolution | Fallinitiativ | Dokumenterat faktum + representation |
| `initiative.id` | non-empty unique string; required | Dublett/tomhet avvisas | Stabil identitet, inte presentation label | Modelleringsval |
| `initiative.effectDefinitionId` | string som matchar canonical, domänstödd ActionKey; required | Okänd/unsupported avvisas; effects hämtas från profile | Mappning från verkligt initiativ till exekverbar effekt | Analytiskt antagande; kräver mapping rationale |
| `initiative.label` | string; optional; ingen default | Endast typkontroll; exkluderas från semantic identity | Historiskt namn/läsbar etikett | Dokumenterat faktum |
| `initiative.prerequisites` | array; required | Endast `{initiativeId, type:"finish-to-start"}`; definierad referens; unik; ej self; inga cycles | Hård completion-before-start-relation | Primärkälla om formell; annars explicit antagande |
| `initiative.resourceClaims` | array; required | Unik per resource; `amount` finite >0; `durationPeriods` positiv integer | Resursåtgång och aktiv varaktighet | Dokumenterat faktum om möjligt; annars känsligt antagande |
| `contract.resources` | array; required | Unika non-empty IDs, strict fields | Delade knappa resurser | Faktum/antagande med enheter dokumenterade externt |
| `resource.label` | string; optional | Typkontroll; ej semantic identity | Läsbar resursbenämning | Dokumenterat faktum |
| `resource.capacity` | `{type:"constant",amount:number}` eller `{type:"periodized",amounts:{period,amount}[]}`; required | Finite, non-negative; periodized kräver exakt varje period 1..horizon, unika/inom horizon | Tillgänglig kapacitet per period, i samma enhet som claims | Faktum eller transparent modellantagande |
| `schedules.version` | literal `"initiative-schedule-v1"`; required | Exakt literal | Schedule schema | Modelleringsval |
| `schedules.comparisonPolicy` | literal `"same-initiative-set"`; required | Endast detta stöds | A och B måste innehålla samma initiative IDs | Runtimekrav |
| `schedules.A/B` | arrays av `{initiativeId, executionStep}`; required | Känd, unik per scenario, integer 1..horizon; resource claim får ej löpa utanför horizon; samma mängd A/B | Historical represented respektive counterfactual timing/order | A: historisk representation; B: counterfactual assumption |

Unknown fields avvisas på top-level, contract-, initiative-, prerequisite-, claim-, resource-, capacity-, schedules- och schedule-entry-nivå. **VERIFIED (runtime):** `runInitiativeScheduledAnalysis.ts::validateTopLevel`; `validationV2.ts::rejectUnknownFields`; `validateInitiativeSchedules.ts::rejectUnknownFields`.

### 4.2 Perioddefinition

Runtimeperioden är en heltalsposition `M1..Mhorizon`, inte ett datum eller en duration. Post-transition trajectory innehåller inte step 0 (`cascadeAnalysisProjection.ts`, rader 5–15). Historical case behöver därför ett externt, versionsstyrt periodregister: periodnummer, startdatum/-händelse, slutdatum/-händelse, granularity och mappingregel för initiativstart. **VERIFIED (runtime) + INFERRED (evidence pack requirement).**

### 4.3 Canonical configuration, inte case input

| Element | Canonical källa/consumer | Auditbedömning |
|---|---|---|
| Action effects | `actionEffects.ts::ACTION_EFFECTS`, profiler, `executeInitiativeTransition` | Inte fritt input. Independent deltas avvisas. Varje historiskt initiativ kräver explicit mappning. |
| Driver relationships | `riskPropagation.ts::RISK_PROPAGATION`; profile subset | Kodlåsta directed rules; historisk evidens kan bedöma lämplighet men får inte skrivas in ad hoc. |
| Driver-to-dimension mapping | `impactContract.ts::REAL_ESTATE_IMPACT_CONTRACT` | Kodlåst modellrepresentation. |
| Weights/curve amplitudes | `curveConfig.ts::PARAMETER_CURVE_CONFIG`; margin coefficients i `RealEstateEngine.ts` rader 201–217 | Kodlåsta. Ingen historical-case input. Måste deklareras som motorantaganden. |
| Thresholds | score bands i `driverScoreState.ts` rader 27–33; refinancing threshold/profile; clamp −3..3 | Kodlåsta utom ett otypat `riskState.sustainThreshold` runtime-undantag; använd inte detta som dold fallkalibrering. |
| Constraints | `executableDomainProfile.ts::constraints`; `simulateConstraintsStep` | Endast befintlig policy exekverar; strukturell resource pressure är separat observation. |
| Baseline | Preconfigured scenario; default `defaultRiskState` om ej supplied | För historical case bör baseline anges explicit för spårbarhet även om resultattypen inte kräver separat input. |

Praktiskt nödvändiga inputs utanför runtime-JSON: case ID/version, beslutspunkt, cutoff, periodregister, evidence citations per värde, mapping rationale, assumption register, scenario-diff manifest och output wording policy.

## 5. Evidence requirements

| Evidenskategori | Tillåten användning | Minimikrav |
|---|---|---|
| Dokumenterat historiskt faktum | Datum, beslut, formella initiativ, mandat, budget-/bemanningsram, faktiskt kommunicerad sekvens | Primärkälla som protokoll, beslut, samtida plan, myndighets-/projektarkiv; exakt locator och datum |
| Information tillgänglig vid beslutspunkten | Initial state och realistiskt öppna alternativ | Samtida publicerings-/mottagningsdatum, målgrupp/aktör och accessbedömning; senare sammanfattning får endast peka till samtida underlag |
| Modellrepresentation | Kategorisering till driver, period, initiative, prerequisite/resource | Transparent transformationsregel; länka varje värde till fakta och/eller assumption ID |
| Analytiskt antagande | Scores, effect mapping, claim amount/duration, kapacitet när exakt data saknas | Motivering, confidence, sensitivity, alternativ och konsekvens; får inte etiketteras som fakta |
| Counterfactual assumption | B-timing/order och eventuella alternativa inputs | Visa att alternativet var institutionellt, tekniskt och tidsmässigt öppet vid cutoff; separat från historik |
| Modelleringsval | Horizon/granularity, profile, thresholds som redan finns i motor, discretisering | Versionslås och rationale; ingen primärkälla krävs för att valet gjorts, men empirisk lämplighet måste diskuteras |
| Utelämnad information | Okänt, tvetydigt eller ej representerbart | Explicit gap, varför det utelämnats och förväntad bias/riktning; får inte implicit få defaultvärde utan registerpost |

Primärkälla krävs för beslutspunkt, faktisk sekvens, beslutade/kommunicerade initiativ, formella dependencies, kända resursramar, informationstillgång och påståendet att counterfactualet var öppet. Modellmappning, discretisering och normaliserade resource units får vara transparenta antaganden. Senare utredningar kan användas för att lokalisera källor och beskriva efterutfall i lagret Documented History, men inte läcka in i “What Was Known at the Time” eller kalibrera cutoff-state.

## 6. Information-cutoff protocol

1. Definiera en unik beslutspunkt: beslutsorgan/aktör, beslut eller handlingsfönster, exakt datum/tid eller entydig händelse.
2. Sätt cutoff som senaste tidpunkt omedelbart före beslutet. Om beslutet utvecklades i steg, välj en namngiven gate och avvisa ett artificiellt sammanslaget datum.
3. Registrera per evidensobjekt: source ID, dokumenttitel, issuer, version, publication date, date information became available, mottagare/accesskanal och “reasonably available to actors” = yes/no/uncertain med motivering.
4. Tagga `pre-cutoff`, `post-cutoff` eller `date-uncertain`. Endast pre-cutoff och rimligen tillgänglig information får forma initial state och feasible counterfactual set.
5. Senare kunskap hålls i ett separat hindsight annex och får bara beskriva faktisk utveckling/limitations; den får inte bestämma scores, dependencies, effects eller B-schedule.
6. Motstridiga källor bevaras sida vid sida. Prioritera autentisk samtida primärkälla; dokumentera provenance, scope och konflikt. Lös inte konflikten genom tyst medelvärde. Modellera alternativt som sensitivity variants eller avvisa inputen.
7. Okänd/ofullständig information kodas `unknown` i evidence pack, inte automatiskt `MODERATE`. Om runtime kräver ett värde skapas en assumption ID och minst ett alternativt känslighetsvärde.
8. Frys `evidence-pack.json/md` och `model-config.json` separat med semantisk version, SHA-256, skapad datum, cutoff, source manifest och change log. Resultatpaketet ska referera båda hashvärdena samt engine HEAD/profile/model/calibration identity.
9. Varje ändring efter freeze skapar ny version; inget resultat får återanvändas under gammalt versionsnamn.
10. Genomför blind pre-registration av mappingregler och huvudsakliga sensitivities innan scenarioresultat granskas för att minska hindsight calibration.

## 7. Assumption register schema

Obligatoriskt tabell-/JSON-schema:

| Fält | Typ/regel |
|---|---|
| `assumptionId` | unik stabil string, t.ex. `A-001` |
| `description` | neutral text; ett antagande per post |
| `neededBecause` | varför runtime/analys kräver det |
| `affectedInputs` | array av exakta JSON paths |
| `evidenceStatus` | enum: `supported-partly`, `no-direct-evidence`, `disputed`, `unavailable-at-cutoff` |
| `confidence` | enum: `low`, `medium`, `high` plus rationale |
| `sensitivity` | enum: `low`, `medium`, `high`, `not-tested` plus plan/result |
| `sources` | source IDs och locators; tom array endast med `sourceGap` |
| `sourceGap` | nullable text |
| `scope` | enum: `historical-representation`, `counterfactual`, `shared-model-choice` |
| `alternatives` | array av alternativa värden/configuration IDs |
| `changeConsequence` | förväntad riktning och vilka outputs som kan ändras |
| `owner/status` | ansvarig granskare; enum: `proposed`, `accepted`, `rejected`, `superseded` |
| `version/timestamps` | registerversion, created/updated |

Ingen confidence får omvandlas till sannolikhet; Step 1 modellerar inte uncertainty. Sensitivity betyder körning av fördefinierade alternativa konfigurationer, inte stokastisk analys. **NOT SUPPORTED:** probability distributions och confidence intervals.

## 8. Step 1 motorresultat vs strukturdiagnostik

### Motorresultat

- Scheduled canonical driver deltas appliceras före periodens `stepForward`; actual execution period sätts till den konfigurerade perioden (`executeInitiativeTransition.ts`, rader 76–102). **VERIFIED (runtime/test).**
- Motorstate omfattar step, margin, constraint registry, risk state, driver scores och cumulative cascade events (`RealEstateEngine.ts`, rader 24–35). **VERIFIED (runtime).**
- Outputs är A/B trajectories och provenance, baseline, margin/constraint/cascade histories, terminal states och B–A margin comparison (`initiativeScheduledAnalysisContract.ts`, rader 30–39; `cascadeAnalysisProjection.ts`, rader 5–61). **VERIFIED (runtime/test).**

### Strukturdiagnostik

- Observationen bedömer endast initiativ som startar aktuell period och kombinerar prerequisite- och resource-reasons till `eligible` eller `would-be-blocked` (`structuralStartAssessmentCore.ts`, rader 6–44). **VERIFIED (runtime/test).**
- Missing prerequisite representeras som `prerequisite-not-planned` eller `prerequisite-not-completed-before-start`; same-period completion räknas alltså inte som completed-before-start. Resource overload representeras som `resource-overallocated` med capacity, total claimed och excess (`dependencyAssessmentCore.ts`; `resourcePressureCore.ts`, rader 32–56). **VERIFIED (runtime/test).**
- Snapshotfält: `structuralStatus`, `executionStatus`, `startAssessment`, `unresolvedPrerequisiteIds`, `resourcePressure` och diagnostics. `executed-despite-structural-block` sätts när provenance visar execution trots `would-be-blocked` (`buildInitiativeDecisionSpaceSnapshots.ts`, rader 190–231). **VERIFIED (runtime/test).**
- Before-phase diagnostics: `would-be-blocked`, `resource-overallocated`. After-phase: `executed-despite-structural-block`, `prerequisite-executed-same-period`, `planned-initiative-not-executed` (`initiativeStructuralObservationDiagnostics.ts`, rader 133–228). **VERIFIED (runtime/test).**
- Diagnosen ändrar inte trajectoryn. Observationen konsumerar ett redan färdigt result och testet verifierar att trajectory, provenance, baseline och comparison bevaras (`observeCompletedInitiativeStructuralAnalysis.test.ts`, rader 189–199). **VERIFIED (test).**

**Konkret exempel:** I `observeCompletedInitiativeStructuralAnalysis.test.ts::rawInput` schemaläggs `foundation`, `parallel` och `dependent` alla i Scenario A M1. `dependent` kräver att `foundation` är färdig före start, och två samtidiga 0,6-claims överstiger team capacity 1 (rader 28–84). Motorn exekverar ändå samtliga i M1; after-snapshot visar actual period 1 och `executed-despite-structural-block` för alla tre (rader 115–126), medan before/after diagnostics uttryckligen visar block, overload och executed-despite-block (rader 128–139). **VERIFIED (test, omkört och passerat).**

## 9. Counterfactual requirements

Nuvarande initiative runtime kräver `same-initiative-set` mellan A och B (`initiativeScheduleContract.ts`, rader 4–15; `validateInitiativeSchedules.ts`, rader 143–145, 236–250). Därför är ett direkt Step 1 A/B-case legitimt när samma representerade initiativ kan beläggas som realistiskt tillgängliga vid cutoff och skillnaden är timing/order.

Tvinga inte ett fall in i detta format. Om trovärdig B kräver andra verkliga initiativ, andra canonical effects, olika initial state eller nya strukturregler gäller något av följande:

- modellera separata, tydligt benämnda konfigurationer utanför påståendet “same actions/different sequence”, med full diff manifest, om befintlig runtimeväg tillåter det;
- behandla skillnaden som sensitivity/exploratory comparison, inte ren sekvenscounterfactual;
- avvisa fallet om den centrala kontrafaktiska mekanismen inte ryms utan kod-/kalibreringsändring.

Minimikrav:

1. Exakt cutoff och pre-cutoff feasible-set evidence.
2. A rekonstrueras utan post-cutoff outcome calibration.
3. B har dokumenterat institutionellt mandat, finansierings-/resursmöjlighet, teknisk genomförbarhet och rimlig ledtid vid cutoff.
4. Scenario-diff manifest listar varje skillnad i initial state, initiative set, effect mapping, schedule, resources, capacity, assumptions och profile. Inga dolda skillnader.
5. Same-actions-claim används endast när IDs/effects är samma; runtime verifierar samma initiative set men inte historisk realism.
6. Pre-registrerade sensitivities för högriskantaganden; redovisa intervall av modellresultat som separata deterministic runs, inte sannolikheter.
7. Formulering: “Within the configured representation…”, “Under the stated assumptions…”, “The modelled alternative produces…”, och “The comparison does not establish what would have happened in reality.”

CE får uttala sig om skillnader mellan representerade trajectories, margin paths, constraint activation, driver/cascade state och strukturdiagnostik under angiven configuration. CE får inte fastställa verklig kausalitet, sannolikhet, skuld, att alternativet skulle ha lyckats, vad som borde beslutats eller optimal/bästa sekvens. **NOT SUPPORTED.**

## 10. Case rejection criteria

Avvisa kandidaten före modellering om något av följande gäller:

- inga tillräckliga, autentiska primärkällor för beslut, faktisk sekvens och samtidiga constraints;
- beslutspunkten/cutoff kan inte göras entydig eller informationstillgång kan inte separeras från senare kunskap;
- centrala initial-state-värden kräver omfattande otestbara gissningar;
- inga modellerbara finish-to-start dependencies;
- inga meningsfulla shared resources/capacity constraints, om strukturdiagnostik är huvudpoängen;
- färre än 6 tydliga initiativ ger för tunn demonstration, eller fler än 10 kräver oproportionerlig aggregation för publik begriplighet; detta är en case-design gate, inte runtimegräns (30 initiativ är testat);
- inget realistiskt, öppet counterfactual vid cutoff;
- counterfactualet kräver annan initiative set men kommunikationen förutsätter same-actions/different-order;
- central effekt kan inte mappas försvarbart till en domänstödd canonical effect;
- central mekanism kräver sannolikheter, feedback, learning, endogenous delays, execution blocking eller andra Step 2-regler;
- slutsatsen beror på hindsight calibration eller mycket omtvistad kausal attribution;
- hög risk att sidan uppfattas som skuldutpekande, politisk rekommendation eller bevis för verkligt utfall;
- resultatet är endast intressant efter parameter-/weight-tuning mot känt efterutfall.

## 11. Research checklist

Använd samma checklista separat för Hallandsåstunneln och Helsingborgs lasarett; samla inte in eller poängsätt här.

- [ ] Kandidatens exakta beslutspunkt, beslutande aktör och cutoff.
- [ ] Primärt beslutsdokument med datum, version, diarienummer och locator.
- [ ] Samtida beslutsunderlag och vilka mottagare som faktiskt hade tillgång.
- [ ] Publication date och earliest-available date för varje källa.
- [ ] Kronologi före cutoff; separat kronologi efter cutoff.
- [ ] 6–10 kandidatinitiativ med historiskt namn, scope, beslut/status och start/finish evidence.
- [ ] Faktisk planerad sekvens vid cutoff och senare faktisk execution, tydligt åtskilda.
- [ ] Möjliga alternative timings/orders som uttryckligen diskuterades eller var genomförbara vid cutoff.
- [ ] Formella och praktiska prerequisites; evidens för finish-to-start, inte enbart efterhandskorrelation.
- [ ] Shared resources: typ, enhet, ägare, capacity per period, commitments och source.
- [ ] Resource claim per initiativ: amount, duration, period och osäkerhet.
- [ ] Externa och interna constraints kända vid cutoff; avgör vilka som faktiskt ryms i nuvarande engine.
- [ ] Initial driver evidence per relevant ParameterKey; lämna irrelevanta drivers explicit utanför.
- [ ] Mappingtabell: historiskt initiativ → canonical `effectDefinitionId`, med rationale och alternativ.
- [ ] Bedöm om vald domain/profile representerar mekanismen utan kodändring.
- [ ] Periodgranularitet och mapping från kalenderdatum/händelser till M1..Mn.
- [ ] Counterfactual feasibility: mandat, budget, kompetens, procurement, teknik och ledtid.
- [ ] Motstridiga källor, luckor och contested interpretations.
- [ ] Hindsight-only information och bekräftelse att den isolerats.
- [ ] Namngivna personer/organisationer och blame/polarisation review.
- [ ] Evidence pack manifest, assumption register och configuration diff.
- [ ] Oberoende källgranskning samt metod-/språkgranskning före publicering.

## 12. Candidate scoring rubric

Skala per kriterium: **0** saknas/oförenligt, **1** mycket svagt, **2** svagt, **3** tillräckligt, **4** starkt, **5** exceptionellt. Viktad poäng = `(score/5) × vikt`; total 100. Riskkriterier poängsätts omvänt: 5 = låg risk.

| Kriterium | Vikt |
|---|---:|
| Source availability | 10 |
| Decision-point clarity | 7 |
| Information-cutoff quality | 8 |
| 6–10 modellerbara initiativ | 5 |
| Dependencies | 6 |
| Prerequisites | 5 |
| Shared resources/capacity | 7 |
| Constraints | 5 |
| Sequence sensitivity (plausibel, ej outcome-tunad) | 8 |
| Counterfactual legitimacy | 10 |
| Step 1 compatibility | 10 |
| Public comprehensibility | 5 |
| Commercial relevance | 4 |
| Political polarisation risk (omvänd) | 3 |
| Blame risk (omvänd) | 4 |
| Hindsight risk (omvänd) | 3 |
| **Total** | **100** |

Diskvalificerande minimikrav: source availability, decision-point clarity, cutoff quality, counterfactual legitimacy och Step 1 compatibility måste vardera vara minst 3/5; dependencies och shared resources/capacity minst 2/5; inget av blame/hindsight risk får vara 0. Totalpoäng under 65 = avvisa; 65–74 = endast discovery; 75–84 = villkorad kandidat; ≥85 = stark kandidat, fortfarande beroende av gates.

Osäkerhet redovisas som `score [low–high]`, confidence (`low/medium/high`) och en mening om vad som skulle flytta poängen. Rangordna inte på punktestimat om intervallen överlappar materiellt; använd då “indeterminate pending evidence”. Ingen kandidat poängsätts i denna audit.

## 13. Known limitations

- Endast tre legacy profiles finns; modell/calibration är `pilot-fastighet-v0.4` med legacy eller transport subset (`executableDomainProfile.ts`, rader 10–59, 153–165). **VERIFIED.**
- Initiativ kan bara använda befintliga canonical effects; egna per-case driver deltas stöds inte. **VERIFIED.**
- Initiative A/B kräver samma initiativmängd; ingen automatisk sequence search eller optimisation. **VERIFIED / NOT SUPPORTED.**
- Endast finish-to-start dependencies; inga lag, probabilistiska beroenden eller partial completion. **VERIFIED / NOT SUPPORTED.**
- Claims är rektangulära: fast amount under helt antal perioder; capacity constant eller fullständigt periodized. **VERIFIED.**
- Resource overload observeras men påverkar inte execution, action effect eller trajectory. **VERIFIED.**
- Liquidity/Covenant finns i registry och kan ge effects om aktiva, men denna audited path visar ingen generell aktiveringslogik för dem. **VERIFIED; NOT SUPPORTED som fallinput.**
- Propagation höjer target till fasta kategorinivåer och itererar samma tick; inga sannolikheter eller empiriska delays. **VERIFIED.**
- Risknivåer och precise scores clampas; Structural Margin clampas −3..3. Detta kan skapa terminal convergence trots materiellt olika paths. **VERIFIED.**
- Structural Observation ger inget numeriskt Decision Space-score; Structural Margin förekommer endast som engine context. **VERIFIED (test):** `observeCompletedInitiativeStructuralAnalysis.test.ts`, rader 142–149.
- Labels påverkar inte semantic identity; fingerprints täcker structural definition och scenario plans, inte extern evidence provenance. **VERIFIED (test) + INFERRED limitation.**
- AI interpretation är ett separat textlager och får inte användas som runtimebevis. **VERIFIED.**

## 14. Contradictions or unsupported claims

| Claim | Bedömning | Evidens |
|---|---|---|
| “Blocked” stoppar eller skjuter upp initiativ | Motsägs av runtime | Execution sker först enligt schedule; diagnostics visar `executed-despite-structural-block`. |
| Samtidiga actions ger implementation-capacity/concurrency penalty i motorn | NOT SUPPORTED | Same-step effects kombineras atomiskt; interpretation safety rule förbjuder claimen (`scheduledInterpretationContext.ts`, rader 30–36). Resource overload är observation. |
| Step 1 inventerar verkliga framtida options | NOT SUPPORTED | Input definierar initiatives/schedules; observation diagnostiserar endast dessa. |
| Step 1 hittar bästa sekvens | NOT SUPPORTED | Två explicit konfigurerade scenarier jämförs; ingen sök-/målfunktion. |
| Resultatet är en verklighetsprognos eller causal proof | NOT SUPPORTED | Deterministiskt konfigurativt resultat; inga sannolikheter/causal identification. |
| Alla registry constraints aktiveras dynamiskt | NOT SUPPORTED | Auditerad aktiveringslogik gäller RefinancingConstraint; övriga effects tillämpas endast om registry redan är ACTIVE. |
| Historical case kan leverera egna action effects/weights | Motsägs av schema/runtime | `effectDefinitionId` måste vara canonical/domain-supported; independent deltas avvisas. |
| Public website claims bevisar runtime | Metodologiskt otillåtet | Webbclaims behandlades endast via integrationstest; runtimepåståenden grundas i kod och tester. |

Inga observerade motsägelser mellan den låsta produktgränsen i uppdraget och canonical Step 1-runtime. Den viktigaste terminologiska risken är att “constraint” kan avse både motorns constraint registry (trajectory-påverkande) och Structural Observation resource/prerequisite diagnostics (icke-verkställande).

## 15. Readiness verdict

**CONDITIONALLY READY för case discovery; NOT READY för publicering eller modellering av någon av kandidaterna ännu.**

Teknisk readiness finns för ett smalt fall där 6–10 historiska initiativ kan mappas utan kodändring till en befintlig profile/action vocabulary, där samma initiativmängd har ett legitimt alternativt timing/order-upplägg, och där finish-to-start samt shared capacity kan beläggas. Method readiness kräver först ett cutoff-säkert evidence pack, mapping review, assumption register, preregistrerade sensitivities och blame/hindsight review.

Om något kandidatfall kräver att structural diagnostics verkställer blockering, att nya actions/effects införs eller att sannolikheter/kausalitet modelleras är Step 1 inte redo för den centrala mekanismen.

## 16. Recommended next action

Genomför en separat, symmetrisk evidence-discovery för båda kandidaterna med checklistan i §11. Frys två preliminära evidence manifests utan att konfigurera motorn. Låt därefter en metodgranskare applicera diskvalificeringsgates och rubricen i §12. Välj kandidat först efter detta; bygg ingen modell och ändra ingen motor innan en kandidat passerat samtliga minimikrav.

## Audit verification

Utvalda tester körda vid audit: scheduled runtime, Executive Demo, initiative scheduled orchestration, completed Structural Observation, 10/30-initiative scale och public website claim integration. Resultat: **53 passed, 0 failed**.

Endast denna auditrapport skapades. Ingen kod eller test ändrades. Ingen commit, push, merge, deployment eller Vercel-interaktion utfördes.
