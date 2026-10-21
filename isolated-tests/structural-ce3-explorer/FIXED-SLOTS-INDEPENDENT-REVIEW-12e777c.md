# Kritisk granskning av CE3-explorerns /2-kontrakt

Datum: 2026-10-21. **Verdict: PASS WITH LIMITATIONS.**

Granskad commit och start-HEAD: `12e777c023d91ad79487527c01a6f466ee926708`.
Ett verifieringsfel, **R1/P2**, bekräftades: ett konsekvent ombundet paket med
72 runs kan godkännas med deklarerad körbudget `max_cells=0`. Detta är en
motsägelse i batchspecifikationen, inte ett falskt målutfall eller ett lyckat
bortfall av sökmedlemmar. R1 behöver rättas före nästa motorfas om batchens
deklarerade körgränser ska kunna behandlas som verifierade. Ingen rättning
ingår i denna granskning.

Övriga prövade garantier höll. Färsk /2 freeze/run/verify reproducerade exakt
24 kandidater, 72 certifierade celler, 90 eventbanor och fem robusta ordningar.
Jag kunde inte få en saknad kandidat/cell, en saknad negativ eventbana eller
felbundet input att ge ett falskt fullständigt mål-/populationsbevis.

Granskningen bygger på kodläsning och nya falsifieringsförsök, med separat
insättningsalgoritm, direkt konstruerade input och regelhärlett facit.
Detta är inte en extern person-/organisationsattestation eller ett formellt
bevis för alla möjliga fel. Implementationsrapportens resultat användes som
kontrollbara påståenden, inte som testfacit.

## Underlag och bevarande

Repositoryrots README-låsning och föräldrakataloger kontrollerades; ingen
tillämplig AGENTS.md hittades. Arbetskopian hade inga ändrade spårade filer
eller staged ändringar, men befintliga ospårade underlag och Apollo.

Underlag: båda arkitekturauditerna i repositoryroten, explorerns tidigare
IMPLEMENTATION-REPORT, INDEPENDENT-REVIEW-5429b52, R1-GZIP-FIX-REPORT,
SCENARIO-FORMAT, SCENARIO-IMPLEMENTATION-REPORT och
SCENARIO-INDEPENDENT-REVIEW-7dab9a0 samt de tre FIXED-SLOTS-dokumenten.
Tidigare genomläst underlag kompletterades med förnyad läsning av relevanta
arkitektur-/kontraktsavsnitt, aktuell commitdiff och faktiska kodvägar.
Schema, profil, codec, replay, transitions, expressions, CLI och audit ingick.

E nedan = `isolated-tests/structural-ce3-explorer/`, R =
`isolated-tests/structural-ce3-replay/`. Radnummer avser `12e777c`.
T01–T17 avser `E/fixed_slots_review_tests/test_review_12e777c.py`.

Ett startmanifest över **2440 befintliga spårade/ospårade, icke-ignorerade
filer** sparades som `/tmp/ce3-review-12e777c-before.json`, SHA-256
`dec888e4f3ce7a47ba8bd814dd907971d53c112f7322a8b0c8b82d1967d43fce`.
Slutkontrollen bekräftade att samtliga 2440 filer är byteidentiska. Endast
denna rapport och den nya testfilen tillkommer. Alla kör-/angriparpaket skrivs i /tmp
eller TemporaryDirectory; inga gamla artefakter, pins eller rapporter ändras.

## Fynd efter allvarlighetsgrad

Inga bekräftade P0/P1-fynd. Ett P2-fynd:

### R1/P2 — verifieraren accepterar fler runs än deklarerad cellbudget

**Kodankare:** `E/scenario_runner.py:130–141` rekonstruerar spec från dess
egna `max_cells` och jämför körkatalogerna med hela manifestets ID-mängd.
Ingen kontroll kopplar faktiska försök till budgeten. Raderna 214–224 kan
därför ge COMPLETE och samtidigt exponera budget 0. Den riktiga körvägen på
rad 73 använder däremot `cells[:spec['max_cells']]` och respekterar budgeten.

**Reproduktion, T16/T17:**

1. Gör en färsk vanlig 72-cellskörning och kopiera paketet till en privat
   testkatalog. Behåll problem, manifest, enumeration och externa pins.
2. Ändra enbart `batch.json.max_cells` från 72 till 0.
3. Räkna om batch-spec-ID, bind om `attempt.json`, varje `started.json`,
   `record.json` och `observation.json`; uppdatera observationernas hashvärden.
   Alla faktiska inputs, historiker, audits och auditkvitton lämnas oförändrade.
4. Kör `verify` mot de **ursprungliga externa pinsen**. Resultatsammanfattningen
   behöver inte repareras: verifieraren ignorerar den som avsett.

**Förväntat:** avvisa den internt motsägelsefulla batchen, eller ge en separat
INVALID-status som förhindrar ett godkänt batchbesked/CLI exit 0. En deklaration
med budget 0 kan inte innehålla 72 tillåtna körförsök. Den förväntade logiska
populationen ska fortfarande vara 72; lösningen är inte att krympa den.

**Faktiskt:** färsk verify returnerar:

```text
execution_budget.max_cells = 0
cell_coverage.status = COMPLETE
cell_coverage.expected = 72
cell_coverage.certified = 72
CLI exit = 0
```

Detta reproducerades dels i `/tmp/ce3-review-12e777c-budget-probe`, dels
från nya CLI-körningar inuti granskningssviten. T16 verifierar den faktiska
motsägelsen; T17 uttrycker önskat avvisande som **expectedFailure**. T17 är
ett öppet fel, inte ett passerat acceptanskrav.

**Påverkad garanti:** konsistensen mellan deklarerad batchbudget och
certifierad körpopulation. Problempinsen binder fortfarande rätt domän;
de 72 historikerna finns verkligen och deras mål är fortfarande korrekta.
Detta ska därför inte beskrivas som att 0 verkliga runs räcker för COMPLETE,
att ett saknat scenario godkänns, eller att någon falsk robust vinnare hittats.
Ingen signerad processattestation behövs för att upptäcka denna statiska
motsägelse mellan budget och antal försök.

**Härkomst:** luckan finns i gemensam verifieringskod från `7dab9a0` enligt
commitdiff/blame; `12e777c` inför inte denna kontrollmiss men ärver den till
/2 och redovisar nu budgeten direkt i resultatet. Den klassas därför som ett
befintligt verifieringsfel som gäller den granskade committen, inte en
bevisad /1-regression orsakad av /2-ändringen.

**Rättning före nästa motorfas:** kontrollera försökens konsistens mot
`max_cells` och den deklarerade körordningen, utan att ändra full population
eller göra avbrutna runs till negativa mål. Räkna även startade/overifierade
försök som försök, och testa budget 0, antal över budget samt försök utanför
det tillåtna prefixet. Låt mismatch påverka batchens godkännandestatus/exitkod;
korrekt individuellt målbevis behöver inte förstöras. Ingen sådan ändring har
gjorts här. Testet av överantal är genomfört; ett separat angrepp med enbart
fel prefix och korrekt antal har inte genomförts.

## Oberoende fyrbeslutsfacit och full reproduktion

Modellen lästes som regler: P sätter prepared, Q kräver prepared och ready,
X sätter ready och aux_done, T schemalägger tail två steg senare. Q och X
kostar sammanlagt 2, vilket ryms i initialbudgeten. Slots är 2/5/9/12, start
1 och inklusiv horizon 14. response förfaller vid 4 före beslut:
ja sätter ready, nej tar bort ready, uteblivet lämnar ready oförändrat.

Följaktligen måste P ligga före Q. Under ja räcker detta. Under uteblivet
måste även X ligga före Q. Under nej måste X dessutom ligga efter beskedet,
alltså inte på första slot. T:s event inträffar senast vid 14 och begränsar
inte dessa mål. Målet omfattar done/aux_done/tail och alla fyra accepterade
försök, på samtliga banor. Denna härledning frystes som literal-mängder i
granskningstestet före jämförelse med `fixed-slots-expected.json`.

| Scenario | Förväntade och faktiskt observerade målträffar |
|---|---|
| Ja, 12 | PQXT, PQTX, PXQT, PXTQ, PTQX, PTXQ, XPQT, XPTQ, XTPQ, TPQX, TPXQ, TXPQ |
| Nej, 5 | PXQT, PXTQ, PTXQ, TPXQ, TXPQ |
| Uteblivet, 8 | PXQT, PXTQ, PTXQ, XPQT, XPTQ, XTPQ, TPXQ, TXPQ |

De fem ordningarna i nej-mängden är robust TRUE;
övriga 19 är FALSE. Ingen UNKNOWN förekommer i den kompletta körningen.
Alla 72 celler är CERTIFIED, med 25 målträffar totalt.

När T är först förfaller tail och response båda vid 4. Det ger två banor
i 18 celler; övriga 54 har en bana: **18×2 + 54 = 90**. Alla banor ingår
i målbedömningen. T01 jämför dessutom varje helt sparat CE3-input med ett
direkt konstruerat envelope med literal-slots 2/5/9/12, attempt, full outcomes,
modell och sources. Materialiserare, candidate eller effective_problem
används inte som facit. Samma kandidats script är identiskt i alla scenarier.

Färsk fristående CLI-run och verify gav båda exit 0 och byteidentisk stdout.
Resultat-ID i denna granskning:
`c90a7c4b1fd3e3abd4d7cf52dae48b463ddf96c7781fe75d32da9755ad31a7c7`.
Problem-/manifest-/runtime-/build-ID matchar implementationens deklarerade
värden. Nytt result_id beror på nya occurrence-UUID:n.

## Population, stödgränser och faktiskt körda urval

`fixed_slots.py:17–29` räknar n! med tidig avvisning över 720 och därefter
n!×s mot 2160. `scenario_contracts.py:33–34,95,122–123` passerar grinden
före kandidat-/manifestmaterialisering, även vid direkt generatoranrop.
Budget 0 ger ingen genväg förbi grinden.

Det faktoradiska oraklet på `fixed_slots.py:49–62` väljer ett oanvänt ID i
varje factorial-block. Det är en bijektion mellan rangtal 0..n!-1 och
permutationerna. Generatorn använder i stället `itertools.permutations`.
Ingen n^n-lista byggs för /2. Den gemensamma materialiseringen är fortfarande
en möjlig gemensam felkälla; direkta envelopes och regel-facit skyddar den
testade ytan, inte varje tänkbar framtida materialiseringsändring.

T02 tillför en **tredje algoritm**: börja med det tomma ordet och sätt in varje
nytt ID på alla positioner i de tidigare orden. Den använder varken factorial
unranking, permutations/product eller produktionshjälpare som facit. Exakta
ordmängder jämförs för n=1..6 mot literal-antalen 1,2,6,24,120,720. Unikhet,
hela ordmängden och cellernas payload/mängd kontrolleras. Orakel/generator
körs också med respektive andra produktionsväg avstängd.

| Problem/kontroll | Population kontrollerad | Replay/audit utförd |
|---|---:|---|
| Fyra beslut, ursprungsfixturen | 24 kandidater, 72 celler | **Alla 72**, 90 banor |
| Nya flaggmodeller n=1..5, ett scenario | 1,2,6,24,120 kandidater/celler | Ingen körning i populationsloopen |
| Sex flaggbeslut, tre separata etiketter med samma outcomes | **720 kandidater, 2160 celler** | **6 celler**, två kandidater × tre scenarier |
| n=1/s=2160 och n=5/s=18 | Storleksgrindens inklusiva gräns till första envelope | Ingen full materialisering eller körning av dessa två gränsproblem |
| n=6/s=3 | Inklusiv gräns, även full population enligt raden ovan | Endast de sex angivna cellerna |
| n=0, n=7, n=1/s=2161, n=5/s=19, n=6/s=4 | Avvisade före uppräkning | 0, även med budget 0 |

Sexbeslutskörningen har 6 CERTIFIED/TRUE celler, 2154 NOT_RUN/UNKNOWN,
två robust TRUE och 718 robust UNKNOWN. Scenarioprojektionen är COMPLETE,
kandidatprojektionen 2/720 och celltäckningen INCOMPLETE. Varje körd bana
innehåller sex accepterade beslut. **Detta är inte en full 2160-cellskörning.**

## Ny modell och tidssemantik

T04 bygger en ny modell direkt, utan den befintliga fixturens fält/regler:

- Start −5, slots −3 och 0, horizon 2. Initialt gate=false, token=0,
  done=false och settled=false. Token har heltalsdomän 0..1.
- Ett open-event vid −4 sätter gate=true före första beslutet. Ett close-
  event vid −1 stänger fönstret före andra beslutet.
- reserve kräver gate=true, sätter token=1 och schemalägger settle efter 4 steg.
- use kräver token≥1, minskar token med 1 och sätter done=true.
- settle sätter settled=true. Målet är done/settled=true och token=0,
  samt båda försök accepterade.

Handfacit: reserve→use lyckas; settle inträffar vid 1, efter sista beslutet.
use→reserve blockerar båda försöken eftersom token saknas först och fönstret
sedan är stängt. Båda fulla körningarna gav rätt mål och full audit.
Direkta full-input-jämförelser, alla tomma steg −5..2 och exakta eventrader
−4/−1/(1 vid framgång) matchade. T15 döpte om besluten till z/a och fick
fortfarande endast z→a som vinnare, trots motsatt lexikal ordning.

T05 testar start=slot=horizon=7 med ett initialt set-event vid 7 och clear
vid 8. Eventet vid 7 utförs före beslutet. Horizon 7 ger verifierat true och
clear pending; horizon 8 respektive 9 ger verifierat false eftersom clear
utförs efter sista beslutet. Detta testar både inklusiv slutpunkt, tomt
suffix och skillnaden mellan pending och faktiskt utförd effekt.

Kärnans `core/schema.py:80–88,230–244` validerar heltal, clock och slotgränser.
Replay besöker alla steg och kör due-events före beslut; ingen scheduler
eller övergångslogik hittades i omslaget. Bara modell/scriptmaterialisering,
processorkestrering, identitetskontroll och historikprojektion används.

## Övriga falsifieringsförsök

| Test | Förväntat och faktiskt beteende |
|---|---|
| T06: syntax/typer | Fel slotantal, dubletter/fallande tider, bool/float/string, tider utanför clock, ogiltig horizon och fel ID-mängd avvisas. PASS. |
| T06: modellbeslut utelämnat | Även ett giltigt men oanvänt modellbeslut måste finnas i sökdeklarationen. Färre ID:n med matchande slots avvisas på `contracts.py:53`, `Search must include all model decisions`. Ingen valfrihet eller delmängd stöds. PASS. |
| T07: positiv referens, negativ annan bana | clear→set ger true, set→clear false; cellmålet blir false. Borttagen negativ bana med omräknade artefakthashar ger UNKNOWN och `Incomplete permutation coverage`. PASS. |
| T07: replay-limits | max_paths, max_rows och max_steps ger UNKNOWN och ingen robust TRUE för ofullständiga runs. PASS. |
| T08: konsekvent omhashat bortfall | En hel kandidat med tre celler respektive en cell tas bort ur manifest, enumeration, runs och result; pins/spec/attempt/records/observations/result repareras. Lokal kontroll ger COMPLETE relativt falskt manifest; full verify återskapar domänen och avvisar med identity mismatch/exit 1. PASS. |
| T09: medlemsinnehåll | Saknad/dubbel/oväntad/felkopplad kandidat och cell upptäcks. Fel enumeration kan ge INCOMPLETE/INVALID trots 72 kvarvarande certifierade runs. PASS. |
| T10: slots/horizon/mål/outcomes/ID-mängd ändras | Gamla pins avvisar allt. Med nya korrekta pins och ombundna yttre records avvisas gamla input eller gamla målprojektioner; 0 certifierade för slots/horizon/mål/ID-byte. Outcomeändring bara i ja lämnar rätt 48 oförändrade celler certifierade och 24 UNKNOWN. PASS. |
| T11: artefaktswap med reparerade hashvärden | input, history, audit, observation, receipt och record byts mellan kandidat respektive scenario: 12 fall. Berörd cell UNKNOWN; recordbyte gör båda UUID-anspråken okända, 70 kvar. Övriga swapfall har 71 certifierade. PASS. |
| T12: budget 0/1/4 vid riktig run | Hela 72-cellspopulationen och enumeration består; bara 0/1/4 certifieras. Resterande är NOT_RUN/UNKNOWN och verify ger 2. PASS. Detta är skilt från R1:s förvanskade budgetmetadata. |
| T12: projektioner/robusthet | Två saknade runs ger full kandidat- och scenarioprojektion men 70/72 celler och INCOMPLETE. PXQT UNKNOWN utan motexempel; PQXT FALSE med verifierat motexempel trots okänd cell; oskadad PXTQ TRUE. PASS. |
| T13: felisolering/summary/read-only | Trasig gzip-header/trailer/DEFLATE/CRC samt audit FAIL ger 71 certifierade och en UNKNOWN, CLI 2. Falsk gammal result.json ignoreras; alla bytes före/efter verify oförändrade; inget replay-anrop. PASS. |
| T14: gammal kontraktsbetydelse | Föregående commits validators laddas i separata Pythonmoduler. Accepterat/avvisat och fulla freeze-output jämförs för båda /1-formaten, inklusive andra slots, horizon, mode-version och ID-listor. Matchar. PASS efter rättad sökväg i själva testet. |
| T16/T17: budgetkontradiktion | COMPLETE/72 certifierade accepteras trots max_cells=0. **R1, öppet fel.** |

`observe.py:22–47` bedömer varje bana. Rad 31 jämför accepterade beslut med
deklarerad `len(decision_ids)`; 1-, 2-, 4- och 6-beslutskörningarna styrker
att tre inte är hårdkodat. Typed terminalmål och frånvaro av blockerade
försök krävs samtidigt. `audit_receipt` gör färsk audit av samma bundle mot
förväntat input; gammalt sparat PASS är inte tillräckligt.

## Bakåtkompatibilitet och deklarerade begränsningar

Diffen för hela replay- och workbench-katalogerna mellan `12e777c^` och
`12e777c` är tom. Frysta backendbytehashar matchar. De gemensamma ändringarna
gör /2 opt-in; /1 kräver fortfarande tre sorterade ID:n, 0/1/2 och clock 0..2.
T14 jämför dessutom fulla äldre freeze-output med föregående kod. Testet är
riktat, inte ett uttömmande differentialbevis över alla möjliga JSON-input.

Inget byte av /1-identiteter eller fixtures hittades. De nya toppnivåfilerna
ändrar explorer_build_id enligt det redan befintliga kontraktet; gamla
körpaket kräver sin registrerade build. Det är en deklarerad begränsning,
inte en regressionsrättning som ska göras genom omhashning av gamla paket.

Helperfunktioner som materialize/expected_orders är inte självständiga
publika verifieringsgränser: deras anropare måste validera deklaration och
storlek. De riktiga freeze/run/verify-ingångarna gör det. Populationstaket
begränsar inte godtycklig modellstorlek, eventförgrening eller runtimekostnad;
replay-limits och timeout kan fortfarande ge UNKNOWN. Ingen full exekvering
av alla stödda 2160 celler, verklig lång OS-timeout eller aktiv samtidig
kod-/filswap certifieras av denna granskning.

## Exakt körda tester och kommandon

Miljö: Python 3.9.6, Node inte använt för nya körningar. Befintliga relevanta
Python-sviter kördes **en gång vardera**. Arbetsbänks-/fabriks-/sessionssviter,
Apollo-omspelning, webbbuild och full tvåpass-checkpoint upprepades inte;
dessa oförändrade ytor hade körts i föregående implementationsuppdrag.
Det är inget nytt verifieringsintyg för dem här. Ursprungliga explorersviten
omfattar dock färsk replay/audit/semantisk jämförelse av 34 fall/654 banor.

| Grupp | Faktiskt resultat |
|---|---|
| Befintliga /2-tester | 19 PASS, 40,820 s |
| Ursprunglig explorer + 34-fallsregression | 27 PASS, 95,773 s |
| Scenariokorsning /1 | 22 PASS, 13,219 s |
| Tidigare granskning/R1 gzip | 19 PASS, 9,562 s |
| Scenariogranskning `7dab9a0` | 13 PASS, 15,014 s |
| Replay/regressionsharness | 27 PASS, 3,958 s |
| Nya T01–T17, slutläge per test | **16 PASS, 1 expected failure (öppet R1)** |

Totalt **144 unika testfall: 143 PASS och 1 förväntad avvikelse**. Ett av de
passerande nya testen, T16, reproducerar uttryckligen felet; PASS för det
testet betyder inte att budgetgarantin håller.

Första körningen av nya sviten tog 67,954 s och hade 15 PASS, ett testfel
och en expected failure. Testfelet var en felaktig basväg i T14:s läsning av
backend-pins (repo-relative i stället för replay-relative). Endast testets
sökväg korrigerades; riktad omkörning av T14 gav PASS, 10,735 s inklusive
klassens fixturekörning. Inga produktionsfiler ändrades och de dyra
regressionssviterna kördes inte om för detta testfel.

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/fixed_slots_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/fixed_slots_review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/fixed_slots_review_tests -p 'test_*.py' -k test_14 -v
```

R1 kan reproduceras isolerat med samma sista katalog och `-k R1`; T16 visar
det accepterade paketet och T17 den förväntade avvikelsen. Sviten bygger
sina egna färska körningar; den beror inte på gamla filer i /tmp.

Färska fristående CLI-flöden, från repositoryroten med nya destinationer:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/fixed-slots-problem.json --output /tmp/ce3-review-12e777c-frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/fixed-slots-problem.json --manifest /tmp/ce3-review-12e777c-frozen/manifest.json --pins /tmp/ce3-review-12e777c-frozen/pins.json --output /tmp/ce3-review-12e777c-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /tmp/ce3-review-12e777c-frozen/pins.json --output /tmp/ce3-review-12e777c-full
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-review-12e777c-single
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-review-12e777c-single
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --output /tmp/ce3-review-12e777c-scenario
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --output /tmp/ce3-review-12e777c-scenario
git diff 12e777c^ 12e777c -- isolated-tests/structural-ce3-replay isolated-tests/structural-ce3-workbench
git diff --check
```

Samtliga oförvanskade fulla CLI-run/verify gav 0 och parvis identisk stdout.
Riktade tester verifierar också exit 1 för omhashat domänbortfall och exit 2
för delkörning/korrupt artefakt. Loggar finns i `/tmp/ce3-review-12e777c-*.log`.

## Inför nästa motorfas

Behåll wrapperarkitekturen och åtskillnaden mellan mål, eventbanor och
kandidat/scenario/celltäckning. De prövade n!-, tids- och populationsgarantierna
ger inget skäl att byta replaymotor eller ändra kärnsemantik. Rätta R1 i
omslagets batchverifiering och gör T17 till ett vanligt passerande test innan
hela körspecifikationen ges ett reservationslöst verifieringsbesked.

Tidpunktssökning, valfria beslut, upprepade försök, policies, pruning,
optimering, UI och onboarding förblir uttryckligen utanför kontraktet.
De är inte funna buggar. Granskningscommitten innehåller enbart rapporten
och de nya testerna. Ingen implementation har rättats och ingen push görs.
