# CE3: tidsbundna mål över auditerad historik

2026-10-22. Baslinje `d24d6d1388542dead140226bc0e77406c0037b9c`.
Arbetet sker på `codex/ce3-temporal-goals` i separat worktree. Startstatus var
ren med frikopplad HEAD. Budgetgranskningen i `3ab8948` lästes via git;
dess tre tester återanvänds via export till /tmp, utan checkout eller cherry-pick.

## Resultat och gräns

Opt-in `ce3-scenario-problem/3` stöder ett uttryckligt `all` av typade
terminal-, always- och reach_by-komponenter. Varje komponent bedöms separat
på varje fullständigt auditerad eventbana. Inga operativa regler har flyttats
till observatören. Replay, schema, profil, audit och befintlig sökgrammatik
är oförändrade.

| Målkomponent | Fråga |
|---|---|
| terminal | Är predikatet sant vid horisonten, i sista radens after? |
| always | Är predikatet sant initialt och före/efter varje övergång till och med kontrolltiden? |
| reach_by | Finns minst en uppfylld punkt från start till och med deadline, även om predikatet senare blir falskt? |

Det samlade banmålet kräver **alla komponenter och alla deklarerade försök
accepterade över hela körningen**. Samlat cellmål kräver detta på **samtliga
auditerade eventbanor**. Komponenterna, försökskravet och samlat mål redovisas
var för sig. En sen blockering kan därför fälla samlat mål trots godkända
tidigare tidskrav. Befintlig robusthet över scenarier behålls: certifierat
motexempel ger FALSE, enbart full positiv scenariotäckning ger TRUE, annars UNKNOWN.

Ofullständig/overifierad run ger inget nytt komponentbevis och samlat UNKNOWN.
En korrekt auditerad negativ run är CERTIFIED/NOT_SATISFIED och kan ha full
täckning/CLI 0. Framtida pending-bekräftelse eller absent räknas inte som uppnådd.
Detta avser modellerade tillstånd, inte bevis på verksamhetsmodellens sanning
eller fullständighet.

## Arkitektur, underlag och identiteter

[Arkitektur- och semantikbeskrivningen](TEMPORAL-GOALS-ARCHITECTURE.md) skrevs
före produktionsändringarna. Båda arkitekturauditerna lästes från
`/Users/christian/Projects/pulse_engine_clean/CE3-PHASE1A-ARCHITECTURE-AUDIT.md`
och `CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md`; de saknas i denna worktree.
Explorer-/scenarioformat, fixed-slots-format/arkitektur/implementation/
oberoende granskning, budgeträttning/granskning och faktisk replay/audit/
målobservatör lästes. Inga tillämpliga AGENTS.md hittades. README:s pilotlåsning
är förenlig med uppdragets uttryckligt avgränsade explorerarbete.

Alla rader deltar med before/after i radordning. Punktens tid kommer från
snapshot.step; advance.after hör till nästa tid, inte radens gamla step.
Replay bär redan fram state genom tomma steg, och audit verifierar hela kedjan.
Ingen interpolering, extra scheduler, regelutvärdering eller kärnändring behövdes.

[Formatdokumentet](TEMPORAL-GOALS-FORMAT.md) specificerar alla fält, typer,
inklusive tider, kvantifiering, versioner, evidens och reproduktion.
Definitionen heter `ce3-history-goal/1`, projektionen `ce3-goal-observation/2`.
Berörda yttre scenariokontrakt får /3; oförändrad search-space/candidate och
permutationsgrammatik behåller /2. Äldre mål/fixtures/formatsvar behåller sin
betydelse. Gammal observation kan inte användas under ändrade operatorer,
predikat eller deadlines: definition/problem/manifest/pins/observation binds,
och verify beräknar om hela resultatet från rätt auditerad historik.

## Ändrade filer

Alla finns under `isolated-tests/structural-ce3-explorer/`:

- `temporal_goals.py` (ny): strikt målvalidator och ren historikprojektion med
  täckning, vittnen och motexempel.
- `contracts.py`: explicit opt-in till ny målvalidator; gammal validering kvar.
- `observe.py`: full audit före ny projektion, separata komponent-/försöksutfall.
- `scenario_contracts.py`: /3-grind och versionsbindningar med återanvänd /2-sökning.
- `scenario_runner.py`: befintliga storleks-/budgetfält gäller även /3; samma
  replay/audit/verify-/robusthetskedja används.
- `temporal_tests/test_temporal_goals.py` (ny): riktade acceptans- och angreppstester.
- `fixtures/temporal-problem.json` (ny): litet deklarerat reproduktionsexempel.
- `TEMPORAL-GOALS-ARCHITECTURE.md`, `TEMPORAL-GOALS-FORMAT.md`, denna rapport
  (nya) och `README.md`: semantik, format, leverans och navigering.

## Oberoende facit och exempel på evidens

Testmodellerna deklareras direkt, utan återanvändning av observatören som facit.
Förväntade sanningsvärden, vissa exakta rader och punktantal är literaler
härledda från små regler. Inga certifieringar mockas; integrationsfallen kör
riktig replay och separat audit via CLI. Spies förbjuder exekvering vid verify.

Den sparade fixturen har start 0, horizon 4, ett ovillkorligt no-op-försök D
vid 4, flag=true initialt, drop vid 1 som sätter flag=false och restore vid 3
som sätter flag=true. latch=false och count=0 ändras aldrig. Därav följer:

| Komponent | Förväntat och verifierat | Evidens |
|---|---|---|
| terminal flag=true | TRUE | Rad 22.after, tid 4 |
| always flag=true till 4 | FALSE | Motexempel rad 6.after, tid 1, flag=false |
| reach_by flag=false senast 1 | TRUE | Vittne rad 6.after, tid 1, flag=false |
| always count=0 till 4 | TRUE | [0,4], 46 before/after-punkter över 23 rader |
| reach_by latch=true senast 4 | FALSE | [0,4], 46 punkter utan vittne |

Det konkreta vittnet/motexemplet har state
`{"count":0,"flag":false,"latch":false}`, row_index=6, side=after, step=1.
Alla försök accepterades, men samlat cellmål och robusthet är FALSE.
Freeze/run/verify gav full täckning, exit 0 och identisk run-/verify-stdout.
Problem-ID `4afe82e811d7ec60f6d9328ab3f1e7f6c56473a05207c723bc101f47f1c3670c`;
manifest-ID `d9c4c09310b37ab21e0a09dfa1b6d7521106e6c330d7a8526fac00662982f25f`.
Körartefakter finns lokalt i `/tmp/ce3-temporal-example`; pins i separat
`/tmp/ce3-temporal-frozen`. De ingår inte i commit.

## Acceptansmatris

T01–T19 avser den nya testfilens metoder. Varje rad nedan har direkt
regel-/tillståndshärlett facit, inte observer-output som förväntanskälla.

| Uppdragskrav | Test och prövning |
|---|---|
| 1. Terminal sant, mellanliggande always-brott | T01: drop vid 1, restore vid 3; terminal TRUE, always FALSE |
| 2. Brott och återställning samma steg | T02: event bryter, D återställer vid 2; always FALSE |
| 3–4. Initialt falskt always / sant reach_by | T03–T04: rad 0.before avgör, senare återställning/förlust ändrar inte utfallet |
| 5. Exakt deadline / ett steg sent | T05: event vid 2 respektive 3, deadline 2; TRUE respektive FALSE |
| 6. Nått före deadline, falskt terminalt | T06: set vid 1, drop vid 3; reach TRUE, terminal FALSE |
| 7. Glesa tider/tomma steg | T07: deadline 1 före slots 4/6; exakt 17 täckta punkter, advance.after tid 1 |
| 8. Tidig kontroll och horizon-events | T08: always till 1, drop vid horizon 4; sen blockering fäller enbart samlat mål |
| 9. Bara en av två banor klarar kravet | T09: clear/lock vid 2; motsatta per-bana-svar för always och reach_by, samlat FALSE |
| 10. Flera scenarier | T10: yes/absent, positiv/negativ/okänd kombination ger TRUE/FALSE/UNKNOWN enligt befintlig robusthet |
| 11. Typer/okända fält/tider/operatorer | T11: avvisning före freeze; negativa tider och enpunktsperiod positiva kontroller |
| 12. Omhashade angrepp | T12: falsk vittnesrad, borttaget motexempel/falskt TRUE, borttagen täckningspunkt avvisas; T13: alla yttre mål-/deadlinebindningar reparerade men gammal projektion avvisas |
| 13. Teknisk osäkerhet | T14: auditfel, borttagen negativ bana, manipulerad state, trasig gzip, alla tre limits och model error ger UNKNOWN; T18 spärrar delprojektion direkt |
| 14. Äldre mål/budget/prefix/regression | T15: terminal /2 och /3 ekvivalenta; T16: /3 CLI, nollbudget och omhashat felprefix; befintliga sviter nedan |
| Predikatkonjunktion | T17: två fält sanna vid olika tider ger inget gemensamt vittne, men två separata reach_by-komponenter blir TRUE |
| Dokumenterat exempel | T19: exakta sanningsvärden, rader och 46 punkter enligt tabellen ovan |

Verify-testernas byteinventering före/efter omfattar även trasig result.json.
CLI/subprocess/replay är spärrade vid dessa kontroller. Allt verifieras utan
omspelning eller skrivning. T13 prövar både gamla externa pins (avvisas på
identitet) och nya giltiga pins med stale, omhashad observation (UNKNOWN).

## Tester och reproduktion

Python 3.9.6. Samtliga ordinarie sviter passerar:

| Svit | Testfall | Tid |
|---|---:|---:|
| Nya temporal_tests | 19 PASS | 3,759 s |
| Ursprunglig explorer/tests | 27 PASS | 104,407 s |
| scenario_tests | 22 PASS | 15,855 s |
| review_tests (inklusive gzip) | 19 PASS | 9,719 s |
| scenario_review_tests | 13 PASS | 14,895 s |
| fixed_slots_tests | 19 PASS | 43,720 s |
| fixed_slots_review_tests | 17 PASS | 79,712 s |
| budget_tests | 8 PASS | 38,168 s |
| Replay verification | 27 PASS | 4,185 s |

**171 tester PASS** i dessa sviter, inga skips eller expected failures.
Explorer/tests inkluderar dessutom 34 befintliga fall och 654 eventbanor;
dessa räknas inte som ytterligare unittest-metoder. Körningar överlappade,
så tiderna är inte prestandalöften.

Budgetgranskningens tre exporterade tester har **3 unika PASS i slutläge**.
T02/T03 passerade direkt. T01:s ursprungliga repo-relativa sökväg fungerade
inte från /tmp och gav ett miljöfel före sin jämförelse. Med GIT_DIR och
GIT_WORK_TREE satta till denna worktrees gitmetadata/repo passerade även T01;
den exporterade testkoden ändrades inte. T01 jämför riktiga paket från
362f647 och aktuell kod: äldre budget-0-paket accepteras, aktuell kod avvisar
alla tre budget-0-kontrakten utan ändrade individuella mål. Slutloggen är
`/tmp/ce3-temporal-regression-budget_review-final.log`.

**Totalt 174 unika tester PASS i slutläge**, inklusive den oberoende
budgetgranskningens tre tester. Ingen kvarstående testavvikelse.

Från repositoryroten, varje katalog nedan med:

```sh
python3 -B -m unittest discover -s <katalog> -p 'test_*.py' -v
```

```text
isolated-tests/structural-ce3-explorer/temporal_tests
isolated-tests/structural-ce3-explorer/tests
isolated-tests/structural-ce3-explorer/scenario_tests
isolated-tests/structural-ce3-explorer/review_tests
isolated-tests/structural-ce3-explorer/scenario_review_tests
isolated-tests/structural-ce3-explorer/fixed_slots_tests
isolated-tests/structural-ce3-explorer/fixed_slots_review_tests
isolated-tests/structural-ce3-explorer/budget_tests
isolated-tests/structural-ce3-replay/verification
```

Oberoende budgettester från godkänd granskningscommit:

```sh
mkdir -p /tmp/ce3-temporal-budget-review
git show 3ab8948:isolated-tests/structural-ce3-explorer/budget_review_tests/test_review_d24d6d1.py > /tmp/ce3-temporal-budget-review/test_review_d24d6d1.py
GIT_DIR="$(git rev-parse --absolute-git-dir)" GIT_WORK_TREE="$PWD" CE3_BUDGET_REVIEW_SOURCE="$PWD/isolated-tests/structural-ce3-explorer" python3 -B -m unittest discover -s /tmp/ce3-temporal-budget-review -p 'test_*.py' -v
git diff --check
```

CLI-kommandon för det sparade exemplet finns i formatdokumentet och har körts.
Loggar: `/tmp/ce3-temporal-tests.log`, `/tmp/ce3-temporal-regression-*.log`,
`/tmp/ce3-temporal-regression-results.json` samt exempelns run-/verify-loggar.
Den första utvecklingskörningen hade ett testhjälparfel: den försökte härleda
en ny dokumenthash ur medvetet trasig gzip innan verify anropades. Hjälparen
rättades att lämna befintlig record för just gzipfallet; verifieringskoden
behövde ingen rättning. Slutkörningarnas resultat redovisas ovan.

## Bevarande och kvarstående begränsningar

Startinventeringens 2198 filer jämfördes med SHA-256 efter testerna: endast
README.md, contracts.py, observe.py, scenario_contracts.py och scenario_runner.py
har ändrats. Övriga **2193 befintliga filer är byteidentiska**, inklusive hela
replay/audit, gamla fixtures och sparade resultat. Sex nya uppgiftsfiler
(dokumentation, kod, test och fixture) tillkommer. Inga tidigare ändringar
eller ospårade filer fanns i denna worktree vid start.

Skyddade refs är oförändrade: decision-flow-demo-v1=d24d6d1,
codex/ce3-declared-fixed-slots=7df45d6, codex/ce3-onboarding=27bec92 och
codex/review-budget-d24d6d1=3ab8948. Deras arbetskopior har inte modifierats.
Alla test-/angreppspaket finns i /tmp eller TemporaryDirectory; gamla
artefakter och externa underlag har inte skrivits om. git diff --check passerar.

Gamla körpaket kräver fortfarande sin registrerade explorerbuild. Ingen tyst
migration eller omskrivning av fixtures/äldre bevis ingår. Tillit förutsätter
separata pins, betrodd kod och stabila filer. Ingen signerad processattestation,
väggklocksordning eller återställning av helt raderad försöksevidens bevisas.

Täckningslistorna är avsiktligt explicita och växer med antal komponenter ×
historikrader × banor. Ingen komprimering av bevis eller prestandacertifiering
för maximala problem ingår. Atomic effects har inga observerbara inre delsteg.
Inga delbevis från ofullständiga körningar, fri temporal logik, tidsoptimering,
ny sökgrammatik, retry/resume, adaptiv policy, driftmodell, UI eller onboarding
har införts. Inga webb-/TypeScript- eller onboardingtester har körts för
denna isolerade ändring. Ingen oberoende extern granskning av denna nya kod
påstås. Endast uppgiftens implementation, tester och dokumentation committas;
ingen push.
