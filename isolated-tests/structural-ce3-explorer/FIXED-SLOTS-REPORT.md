# Deklarerade beslut och fasta tidsplatser — leveransrapport

2026-10-21. Baslinje HEAD `2dbb0fb`, innehållande implementation `7dab9a0`.
Python 3.9.6, Node v25.1.0. Arbetskopian var ren vid start.

**Resultat:** nytt opt-in `/2`-kontrakt för 1–6 unika beslut, lika många
strikt stigande fasta heltalstider och en separat deklarerad horisont.
Acceptansfixturen ger exakt **24 kandidater × 3 scenarier = 72 certifierade
celler**, med **90 auditerade eventbanor** och 12 målsanna celler.
Samtliga kandidater är robust FALSE för just fixturens deklarerade mål och
scenariomängd. Full täckning är alltså inte ett påstående om en robust vinnare.

## Arkitektur och kontrakt

[Arkitekturkontrollen](FIXED-SLOTS-ARCHITECTURE.md) sparades före kodändring.
De båda CE3-auditerna lästes i huvudcheckouten eftersom de saknas i denna
worktree. Inga tillämpliga AGENTS.md hittades. Repositoryts README-låsning
respekteras genom den uttryckligen beställda isolerade explorerändringen.
Explorerns tidigare implementationer, format, granskningar och R1-rapport
lästes som underlag; de historiska dokumenten är bevarade.

Auditens arkitektur A håller. Kärnans befintliga clock/script-format tillåter
redan glesa tidsplatser, negativa heltalstider, tomma steg och events fram till
inklusive horisonten. Explorern bygger endast scripts och vanliga inputs.
Ordinarie replay verkställer regler och ordinarie audit verifierar körningarna.
Den oförändrade målobservatören kräver redan antal accepterade försök =
antal deklarerade beslut och bedömer alla auditerade eventbanor.

Nya versioner: `ce3-scenario-{problem,search-space,candidate,cell,manifest,
pins,execution,attempt,run,observation,result}/2`, samt sökgrammatik
`permutations_once/2`. Scenario-set/space/scenario, plan, execution identity,
terminalmål, målprojektion, auditkvitto och alla CE3-kärnformat behåller sina
befintliga versioner. Exakta payloads finns i [formatet](FIXED-SLOTS-FORMAT.md).
`/1`-fixtures och deras manifest/pins återskapas identiskt. Som tidigare kräver
historiska körpaket sin registrerade explorerbuild; ingen migration har gjorts.

## Filer

Ändrade befintliga filer, alla under `isolated-tests/structural-ce3-explorer/`:

- `contracts.py`: valideraren får en explicit opt-in för deklarerade slots;
  gamla publika enscenarioingången behåller sin gamla grammatikkontroll.
- `scenario_contracts.py`: versionsstyrning, storleksgrind och separat
  lexikografisk populationshärledning för /2. /1 behåller sin kartesiska oracle.
- `scenario_runner.py`: /2-identiteter, preflight och bundna storleks-/körgränser;
  befintlig exekverings-, audit-, mål- och täckningskedja återanvänds.
- `README.md`: hänvisning till nya etappens kontrakt och rapporter.

Nya filer:

- `fixed_slots.py`: ren syntaktisk validering, storleksberäkning och oberoende
  lexikografisk successor, utan operativ regelutvärdering.
- `fixtures/slots-{problem,manifest,pins}.json`: separat fryst fyrbeslutsfixture.
- `slots_tests/test_fixed_slots.py`: 22 acceptanstester med direkta/literala
  orakel, riktiga CLI-körningar och förfalskade paket.
- `FIXED-SLOTS-ARCHITECTURE.md`, `FIXED-SLOTS-FORMAT.md`, denna rapport.

## Exakt sökrymd, storlek och budget

n är längden av den icke-tomma unika beslutslistan, som måste omfatta exakt
modellens beslut. Kandidaterna är alla n! permutationer, ett attempt per
beslut, permutationens position i på deklarerad slot i. Ingen annan
beslutspopulation eller tidsplacering ingår. s är antalet uttryckligt
listade scenarier; identiska outcomes med olika etiketter behålls.

**Stödgräns: n ≤ 6, n! ≤ 720 och n! × s ≤ 2 160.** n=1 är minsta stöd,
s≥1. Ingen sorteringsordning krävs för indata-ID:n. Slots ska vara strikt
stigande heltal, ligga inom `model.clock.start..horizon` och vara lika många
som besluten. Horisonten är aldrig ett defaultvärde från sista slot.

Storleken härleds och kontrolleras innan kandidater/manifest materialiseras,
inklusive före scenariovisa modellkopior. n>6 avvisas innan själva factorial-
beräkningen och feltexten anger n! samt taket. Annars beräknas exakta n! och
n!×s. För stor sökrymd ger INVALID/exit 1 och inget täckningsbesked.

`max_cells` är körbudget på hela stödda populationen, inte en ändring av
sökdomänen. Budget 0/1/2/4 testas mot samma 72 celler. Alla återstående celler
finns kvar som NOT_RUN/UNKNOWN. Max-cells samt positiva replay-limits
(default 10 000 paths, 1 000 000 rows, 10 000 steps) och 60 s per subprocess
redovisas före körning och binds i /2-batchspecifikationen. Ingen total
väggklocksgaranti eller modellstorleksgräns utlovas.

Generatorn använder itertools.permutations. Manifestoraklet använder i stället
lexikografisk successor från sorterat ord: pivot, byte med minsta större
suffixelement, suffixvändning. Därmed besöks bara n! ord, med O(n) hjälputrymme,
inte n^n kartesiska ord. Manifestet innehåller hela n!×s-populationen.
Verifieraren rekonstruerar den från problemdeklarationen före resultatbevisen.

Testerna stänger av generator/permutations/product under freezing och stänger
av oraklet under generation. För fem beslut kontrolleras 120 distinkta giltiga
all-ID-ord: exakt den matematiskt fastställda 5!-populationen. Två/fyra beslut
jämförs dessutom mot literal mängd. Delad materialisering skyddas genom fulla
input-orakel med direkta nycklar `-2/1/4/7`, `2/6` och `-4`, utan att använda
materialiseringshjälparen som facit. Detta är begränsat algoritmiskt oberoende,
inte ett formellt bevis mot alla gemensamma implementationfel.

## Syntetiska problem och oberoende facit

| Problem | Deklarerade regler och tider | Förväntat och faktiskt resultat |
|---|---|---|
| Ett beslut | A sätter a=true; inga events/budget; start=slot=horizon=-4 | 1 kandidat/cell, CERTIFIED/SATISFIED, robust TRUE |
| Två beslut | Slots 2,6; start 1, horizon 10. A sätter a=true och schemalägger ready=true med delay 4. B kräver ready och sätter b=true. Målet ready=true plus alla försök accepterade | Exakt AB och BA. AB får ready vid 6 före B och lyckas. BA blockerar B vid 2, får ready vid 10 och misslyckas trots sant terminalfält. Inget retry |
| Kortare horisont | Samma tvåbeslutsmodell men horizon 9 | BA lämnar ready-event due 10 pending och ready=false; event efter horisonten verkställs inte |
| Fyra × tre | Slots -2,1,4,7; start -3, horizon 9. A/C/D sätter egna boolska fält; B kräver a=true och sätter b=true. D schemalägger finish efter 2 steg, som sätter late=true. Initial response vid 0 väljer approved/rejected/waiting genom yes/no/absent | 24 kandidater, 72 celler. Alla audit-PASS. Målet är a=b=c=d=late=true och response=approved plus alla försök accepterade. Exakt 12 A-före-B-ordningar under yes lyckas, ingen under no/absent. Alla 24 robust FALSE |
| Fem beslut | A–E sätter varsitt boolskt fält, slots 0..4 | 120 distinkta kandidater/celler i oberoende populationskontroll; ingen operativ simulering behövs för antalsfacit |
| Sex × tre | A–F sätter varsitt boolskt fält; tre uttryckliga scenarier med tom outcomes-map, slots 0..5 | Övre stödda gränsen: 720 kandidater, 2 160 unika celler; freeze/generate/verify_frozen överensstämmer |
| Två konkurrerande timers | Tvåbeslutsmodellen plus initial clear ready=false vid 6; referensordning clear→ready | AB har två banor, mål [true,false]; hela cellmålet FALSE. Borttagning av negativa banan med nya artefakthashar avvisas av befintlig audit och ger UNKNOWN |

Fyrbeslutsproblemets målsanna ord under yes är bokstavligen
`ABCD ABDC ACBD ACDB ADBC ADCB CABD CADB CDAB DABC DACB DCAB`.
B kräver A; övriga beslut saknar förvillkor. Det förklarar direkt de tolv
träffarna utan en separat regelutvärderare. Slutvärdet response ger oberoende
nej för alla no/absent-celler. D sist ger finish vid horisont 9, efter sista
beslutet 7. D först ger finish och response samtidigt vid 0: sex ordningar
× tre scenarier har två eventbanor, övriga 54 celler en; totalt 90 banor.
De samtidiga eventen ändrar skilda fält och båda ordningarna bedöms.

Ett inledande test antog felaktigt en bana per cell. Det rättades till ovan
handhärledda tvåbanefall; inget målfacit eller modellregel ändrades för att
anpassas till resultatet. Testerna innehåller ingen generell regelutvärderare.

## Falsifiering och statusgränser

- Tomma/dubbla/okända ID:n, fel antal slots, dubbel/reverserad slot, bool,
  float, sträng, tider utanför clock, ogiltig horizon/step och ostödd grammatik
  avvisas. Scenariofält för modell/script/mål/clock-variation avvisas.
- Omdöpta ID:n med omvänd osorterad indata- och scenariolista ger samma
  handhärledda fulla målmatris efter namnöversättning.
- Saknad, duplicerad, oväntad och felkopplad kandidat/cell avvisas.
  Skadad enumeration kan inte repareras av 72 certifierade runs eller
  kompletta kandidat-/scenarioprojektioner.
- Samma cell respektive hel kandidat tas bort ur manifest, enumeration,
  resultat och run-kataloger. Pins, storleksanspråk, batch, attempt, records,
  observationer och resultathash räknas om. Lokal medlemskontroll blir
  COMPLETE relativt det falska manifestet; full verify avvisar mot problemets
  självständigt härledda 72-cellspopulation.
- Budget 0/1/2/4 bevarar alla 72 celler. En första målsann cell med kvarvarande
  okända scenarier ger UNKNOWN. Ett certifierat negativt scenario ger FALSE
  även när andra är okända. Ett separat mål utan response-villkoret och budget
  3 ger ABCD robust TRUE, men batchtäckningen är fortfarande INCOMPLETE.
- Sju beslut och för många celler avvisas innan ens inputkopiering eller
  permutationshjälpare får anropas. Även max_cells=0 kan inte godkänna en för
  stor sökrymd. Övre gränsen 6×3 materialiseras och verifieras faktiskt.
- Trunkerad gzip, skadad DEFLATE, audit FAIL och utbytt scenarioinput ger en
  UNKNOWN-cell och 71 certifierade celler. Fysiska hashvärden repareras i
  angreppen; ny audit/inputkontroll behövs ändå. Verify ändrar inte gammalt
  result.json. Borttagen eventbana och replay max_paths/max_rows/max_steps
  ger också UNKNOWN, aldrig ett falskt mål- eller robusthetsbevis.

## Körda tester och reproduktion

De 22 nya testmetoderna kördes som 21 PASS i hela sviten (40,683 s), följt
av det tillagda övre gränstestet separat (1 PASS, 12,385 s). Ingen metod
räknas två gånger. Övriga observerade resultat:

| Grupp | Resultat |
|---|---|
| Nya fasta-slots-tester | 22 PASS |
| Ursprunglig explorer | 27 PASS; inkluderar 34 gamla katalogfall / 654 banor |
| Ursprunglig oberoende granskning/R1 | 19 PASS |
| Scenario /1 | 22 PASS |
| Scenario oberoende granskning | 13 PASS |
| Replay/regressionsharness | 27 PASS |
| Arbetsbänk | 14 PASS |
| Fabriksplaner/timing | 6 PASS |
| Session/1, Session/2 och lagerexecution | 54 PASS (65,815 s) |

Totalt **204 testfall PASS**, inga skips eller expected failures. Samtliga
loggar sparas under `/tmp/ce3-slots-*.log`. Testantal räknar metoder/Node-testfall,
inte varje subTest, attack, cell eller bana.

Färsk `/2` CLI run och verify gav exit 0, samma result_id och samma rader efter
run-kommandots extra preflight-rad. Både gamla enscenario- och scenario-CLI gav
exit 0 och byteidentisk run/verify-output. Nya tester kör också partial CLI
run/verify (exit 2) och oversized freeze (exit 1, ingen outputkatalog).

Därutöver: **11 frysta Apollo-inputs / 66 banor PASS**. Apollo saknas i denna
worktree; input/historiker lästes därför från huvudcheckoutens run-1, med
worktreens oförändrade replay/audit. Gamla historiker återauditerades, färsk
replay med sparade limits auditerades och `encode(new)==encode(old)`
kontrollerades i minne. Ingen källhash eller artefakt ändrades.

Reproducera nya körningen med kommandona i [formatet](FIXED-SLOTS-FORMAT.md#commands).
Körd acceptanskatalog: `/tmp/ce3-slots-acceptance-20261021`.
Gamla färska kataloger: `/tmp/ce3-slots-legacy-{single,scenario}-20261021`.
Regressionerna kördes från repositoryroten:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/slots_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
```

Worktreen saknade node_modules. Första Node-starten saknade ajv. NODE_PATH
mot huvudcheckouten räckte för sessionerna men inte executiontestets relativa
linkedom-import. Slutkörningen använder därför en temporär node_modules-länk
till huvudcheckoutens redan installerade beroenden (ajv 6.14.0); inga beroenden,
lockfiler eller testkällor ändrades. Länken togs bort efter godkänd körning.
För samma reproduktion i en worktree utan installerade beroenden:

```sh
ln -s /Users/christian/Projects/pulse_engine_clean/node_modules node_modules
```

Kör därefter Node-kommandot ovan och ta bort enbart den skapade länken.
Dessa miljöstopp räknas inte som passerade
eller saknade acceptanstester.

| Identitet i färsk /2-körning | SHA-256 |
|---|---|
| problem_id | `87360196eccb44ffd714b68615e1ddcf7c286f3abc65f402876579ce81bdd45f` |
| manifest_id | `a1aaecc1046051d3fc8d045733fd3328da96390d574bfdb26886172a637749cd` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `087430b60ce22ef9807ef8ec4a89cb20e7351d714447855831e5d4f3425bcda4` |
| result_id | `8ed960137df31d3b6ac70a57849841e12eb70a18d3775915d28e026986027b0f` |

## Blockerare, bevarande och kvarstående gränser

B1/E1: nya versionsbundna payloads och preflight löser kontraktsändringen.
B2/E2/E7: oberoende full population, storleksgrind och konsekvent omhashade
bortfallsattacker täcker den nya domänen. B3/E3/E8: oförändrad auditgrind och
all-event-paths-observation, skilda täcknings-/målbesked och trevärdesrobusthet.
B4/E5: endast outcomes varierar över scenarier; inga adaptiva script.
B5: stödgräns och körbudget har olika felstatus; hela återstoden bevaras.
B6/E9: gamla kontrakt, fixtures och backend är bytebevarade och regressionstestade.
Inget behov av ändrad kärnsemantik eller alternativ motor identifierades.

Före/efter-kontrollen omfattar 2 187 befintliga spårade/ospårade,
icke-ignorerade filer. Endast de fyra avsedda explorerfilerna ovan ändrades;
övriga **2 183 filer är byteidentiska**. Baslinjemanifestets hash:
`f284b177e8aeede09678aaea32a216b20b2b692a0795d83873cfea9627b60c09`.
Replay, schema, profil, audit, gamla fixtures, historiska rapporter, UI och
onboarding lämnas orörda. `git diff --check` passerar.

Utvidgningen möjliggör uttömmande ordningssökning vid deklarerade fasta tider
inom stödgränsen, med events även efter sista beslutet. Den stöder fortfarande
inte tidsval/optimering, valfria beslut, retry/resume, adaptiva policyer,
pruning/merging, generell AI-kompilering, Future Decision Space eller UI.
Hashar kräver betrodda pins/kod och stabila filer; de är inga signaturer eller
verklighetsevidens. Ingen sannolikhet, kundnytta eller generell optimalitet följer.

Full tvåpass-checkpoint, webbbygge och TypeScript-pilotens tester kördes inte.
Endast denna uppgifts implementation, tester, fixtures och dokumentation
committas. Ingen push.
