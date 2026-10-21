# CE3 scenariokorsning — implementationsrapport

Datum: 2026-10-21. Utgångs-HEAD: `98536ecc84946569e84a26c20ada81b36ddeb299`.
Tidigare implementation `5429b52`, granskning `2be3f55` och R1-rättning
`98536ec` låg i baslinjen. Ingen tillämplig AGENTS.md hittades. Repositoryts
README-låsning lästes; denna uttryckligen beställda, isolerade CE3-etapp
ändrar inte den låsta pilotprodukten.

**Resultat:** exakt 18 unika celler, 18 CERTIFIED, samtliga matchar det
oberoende fastställda facit. `PXQ` är TRUE för robusthet över den deklarerade
mängden; övriga fem är FALSE. Körverifiering och måluppfyllelse redovisas
separat. Replaykärna, schema, audit, profil och gamla resultat är oförändrade.

## Filer och kontrakt

Ändrade befintliga filer:

- `contracts.py`: gemensam deklarations-/grammatik-/målvalidering lyfts till
  `validate_declaration`; enscenarioingången behåller sin version, endast
  timer-events och tom outcomes-map. Inga regler verkställs av valideraren.
- `README.md`: länk och kommandon till den nya separata etappen.

Nya filer:

- `scenario_contracts.py`: strikt outcomes-only-kontrakt, fryst manifest,
  innehållsidentiteter, vanlig CE3-materialisering och två uppräkningsvägar.
- `scenario_runner.py`: CLI freeze/run/verify, journal per cell, färsk audit,
  målobservation, fyra täckningsaxlar och trevärdesrobusthet.
- `fixtures/scenario-problem.json`, `scenario-manifest.json`,
  `scenario-pins.json`, `scenario-expected.json`.
- `scenario_tests/test_scenarios.py`: 22 riktade integrationstester.
- `SCENARIO-FORMAT.md` och denna rapport.

Nya yttre versioner är `ce3-scenario-{problem,set,search-space,space,candidate,
manifest,pins,cell,execution,attempt,run,observation,result}/1` samt
`ce3-scenario/1`. Exakta payloads och identiteter finns i
[SCENARIO-FORMAT.md](SCENARIO-FORMAT.md).
`ce3-terminal-goal/1`, `ce3-plan/1`, `ce3-execution/1`, auditkvittot och
replays input-/historikkontrakt återanvänds. Det nya observationsomslaget
binder cell/scenario/batch och innehåller befintlig målprojektion med full
rad-/banevidens. Gamla COMPLETE omtolkas aldrig som scenariotäckning.

Körningen återanvänder befintliga `runner.cli_process`, `artifact_record`,
`observe.audit_receipt`, `observe.observe` och den gzip-säkra `bridge`.
Replay och audit körs via ordinarie separata CLI-processer; verifiering gör
färsk audit utan replay. Ingen kopia av övergångslogiken har införts.

## Blockerare och avgränsningar från auditerna

| Krav | Hantering och verifiering |
|---|---|
| B1: identitet/kanonisering | Befintlig Python-JSON-LF-codec; typade scenariomängds-, scenario-, kandidat-, cell-, input-, batch-, försöks-, historik-, audit- och observationsbindningar. Frysta manifest/pins och stabilitets-/manipulationstester. Ingen korsspråklig serializer införs. |
| B2: population | Förväntan härleds ur problemets tre ID:n och deklarerade scenariolista: all-different över kartesiska ord, separat från generatorns permutationer. Exakt innehåll/mängd och oberoende input-orakel. Ett konsekvent 17-cellspaket avvisas även med omräknade pins, batch-, record-, observation- och resultathashar. |
| B3: mål/evidens | Samma uttryckliga terminalmål och alla försök accepterade på varje auditerad eventbana. Färsk omberäkning av observation med history/input/audit/cell-binding; falsk observation eller historik avvisas även efter omhashning. |
| B4: variantgräns | Modell, startläge, mål, källor och fasta scripts delas. Scenariodefinitioner tillåter endast label och full outcomes-map. Modell-/scriptpatchar avvisas. Direkta inputkontroller och omdöpta ID:n/etiketter passerar. |
| B5: avbrott/limits | Alla förväntade celler kvarstår. Auditfel, timeout, avbrott, korrupt gzip, model error och limits ger UNKNOWN; oskadade celler redovisas. Nya kataloger krävs, ett försök per cell; retry/resume är uttryckligen utanför etappen. Dubbla run-UUID:n underkänner båda anspråken. |
| B6: baslinje/Apollo | Filhashmanifest över arbetskopian före första ändring; backendets frysta bytekontroll och gamla katalogregressioner. Befintlig Apollo-proveniensavvikelse och historiska källhashar repareras inte. |
| E1/E2: avgränsad fråga | Nytt strikt yttre problemkontrakt; exakt tre beslut, slots 0/1/2, en attempt vardera, alla permutationer, horisont 0..2 och befintligt målspråk. |
| E3/E7/E8: skilda bevis/fel | Körstatus, målstatus, exakt populationskontroll, fyra täckningsaxlar och full cellista. En blockering är ett möjligt verifierat målfel; ModelError/auditfel är UNKNOWN. |
| E4/E5/E6: större produktscope | Ingen pruning, merging, adaptiv policy, informationsmodell eller AI-/domänkompilator. Handbyggd deklarativ modell; dessa större funktioner kvarstår som separata framtida blockerare. |
| E9: bevarande | Enscenarioflöde, dess 27 tester och samtliga 19 granskningstester inklusive R1 passerar. Replay, audit, sessioner och arbetsbänk lämnas orörda. |
| Granskningens punkter 1–5 | R1 återanvänds och testas också för korsningen; oberoende cellpopulation, fasta scripts/full outcomes, separata kvantifierare/täckning och direkta materialiseringskontroller implementeras. |

Auditens illustrativa cell-ID härleddes efter en batchspecifikation. Här
är cell-ID i stället en logisk, problem- och inputbunden populationsidentitet
före runtime/limits; batchspecifikationen binder hela manifestet och varje
run-record binder cell + batchspecifikation. Detta är acykliskt och ger
explicit bindning av både logisk cell och faktisk exekvering. Ingen ändrad
replaysemantik behövdes. Ingen blockerare kvarstår inom den testade etappen.

## Testproblem och facit före implementationens resultat

Fixturen är en ny syntetisk modell med samma trebeslutsgrammatik, inte en
ändring av den gamla P/Q/X-fixturen. Alla tre scenarier delar hela modellen,
startläget och målet. Initialt är prepared/ready/done/aux_done falska,
response=`waiting`, budget=2. Besluten har följande deklarerade regler:

- P: inga förvillkor, sätter prepared=true, kostnad 0.
- Q: kräver prepared=true OCH ready=true; sätter done=true, kostnad 1.
- X: inga förvillkor, sätter ready=true och aux_done=true, kostnad 1.

Ett initialt externt response-event förfaller vid steg 1, före beslutet:

- Ja (`approved`): response=approved och ready=true.
- Nej (`rejected`): response=rejected och ready=false.
- Uteblivet (`absent`): response=waiting; ready lämnas oförändrad.

Absent är den explicita absentrollen i CE3-modellen. Det är ett deklarerat
antagande om inget svar inom horisonten 0..2, med vänteläget kvar även vid
slutet. Det sätter varken approval eller rejection och schemalägger inget
senare besked. Steg 1 är modellens kontrollpunkt; inga svar efter horisonten
påstås eller simuleras. Inget beslut gör retry.

Målet är oförändrat mellan scenarier: terminalt done=true OCH aux_done=true,
plus alla tre försök accepterade på **samtliga** auditerade eventbanor.

Facit skrevs till `scenario-expected.json` före den första körningen:

- Q först misslyckas alltid eftersom prepared=false.
- Q som tvåa kan bara lyckas i PQX under ja: P har förberett och ja ger
  readiness före Q. Under nej/uteblivet har X ännu inte satt readiness.
- I PXQ sker X efter beskedet, så Q lyckas i alla tre scenarier.
- I XPQ har X satt readiness före beskedet: ja bekräftar den, nej tar bort
  den, uteblivet lämnar den kvar. Q lyckas därför under ja och uteblivet.
- XQP misslyckas alltid eftersom P kommer efter Q.

Detta är direkt regelhärledning, ingen kopia av motorns utvärderare.
Testerna kontrollerar dessutom terminalt response, budget, prepared, ready,
done, aux_done, tom pending och exakt blockeringssteg. Nej och uteblivet
skiljer sig således både i explicit tillstånd och i XPQ:s målutfall.
Produktionskoden läser aldrig facitfilen eller P/Q/X-specifika fältnamn.

## Matris: alla 18 celler

Varje cell visar **körverifiering / mål**. C = CERTIFIED, S = SATISFIED,
N = NOT_SATISFIED. Alla 18 har replay COMPLETE, audit PASS och en auditerad
eventbana. Det finns sex målträffar; antalet är ingen sannolikhet.

| Fast ordning | Ja | Nej | Uteblivet besked | Robusthet i fryst mängd |
|---|---|---|---|---|
| P Q X | C / S | C / N | C / N | FALSE |
| P X Q | C / S | C / S | C / S | TRUE |
| Q P X | C / N | C / N | C / N | FALSE |
| Q X P | C / N | C / N | C / N | FALSE |
| X P Q | C / S | C / N | C / S | FALSE |
| X Q P | C / N | C / N | C / N | FALSE |

`PXQ` är robust för det redan fastställda målet. Målet ändrades inte för att
framtvinga en vinnare. Vid borttagning av en PXQ-cell blir robustheten UNKNOWN.
XPQ förblir FALSE med okänd ja-cell och verifierat motexempel under nej.

## Exakta täcknings- och robusthetsdefinitioner

- **Kandidattäckning:** projektionen av CERTIFIED celler på kandidat-ID.
  COMPLETE betyder att varje kandidat har minst en certifierad scenariocell:
  här 6/6. Det betyder inte att varje kandidats alla scenarier är certifierade.
- **Scenariotäckning:** projektionen av CERTIFIED celler på scenario-ID.
  COMPLETE betyder att varje deklarerat scenario har minst en certifierad
  kandidatcell: här 3/3. Det betyder inte att alla kandidater körts i scenariot.
- **Celltäckning:** exakt förväntad kandidat × scenario-population, exakt
  enumeration inklusive innehåll, alla celler CERTIFIED och inga oväntade
  körkataloger: här COMPLETE, 18/18. Dubbletter/felkoppling/oväntade celler
  ger INVALID; saknad enumeration eller certifiering ger INCOMPLETE.
- **Eventbanetäckning:** COMPLETE per cell endast efter färsk fullständig
  audit; här 1 bana i var och en av 18 celler. Overifierad cell har UNKNOWN
  och null för antal auditerade banor. Ingen referensbana ersätter hela mängden.

Enumerationskontrollen redovisas dessutom separat med missing, duplicates,
unexpected och invalid. De två projektionerna kan vara COMPLETE trots
ofullständig celltäckning; testerna visar just detta. De får aldrig användas
som ersättning för hela korsningens täckningsbesked.

Robusthet för varje kandidat över exakt dess deklarerade scenarioceller:
TRUE om alla är CERTIFIED och goal=true; FALSE om minst en CERTIFIED cell
har goal=false; annars UNKNOWN. Täckning och antal certifierade celler
redovisas även när ett enda motexempel redan ger FALSE. Varje aggregat listar
sina cell-ID:n; varje cell pekar på record/observation med history, audit,
bansignatur, terminalrad och hela evidensintervallet för accepterade försök.

## Tester och observerade körningar

Python 3.9.6, Node v25.1.0. Samtliga **169 testfall PASS**, inga expected
failures: 22 nya + de tidigare 147 (128 ursprungliga och 19 granskningstester).

| Grupp | Resultat |
|---|---|
| Scenariokorsning | 22 PASS, 13,504 s; det ytterligare skärpta konsekventa 17-cellstestet kördes separat igen och PASS |
| Ursprunglig explorer | 27 PASS, inklusive färsk replay/audit/semantisk jämförelse av 34 katalogfall och 654 banor |
| Oberoende granskning/R1 | 19 PASS, inklusive samtliga tidigare gzipregressioner |
| Replay/regressionsharness | 27 PASS |
| Arbetsbänk | 14 PASS |
| Fabriksplaner/timing | 6 PASS |
| Session/1, session/2, lagerexecution | 54 PASS |

De nya testerna omfattar full literal-matris, direkt CE3-input, identiska
scripts, ändrade besluts-ID:n och etiketter, oberoende enumeration, saknad/
duplicerad/oväntad/felkopplad cell, konsekvent omhashat bortfall, ändrade
outcomes/mål/scenariodefinitioner med återanvända artefakter, oanvända fulla
outcomes, auditfel, avbrott, timeout, gzip vid run och verify, flera eventbanor,
alla tre limits, model error, TRUE/FALSE/UNKNOWN, dubbla UUID:n, rehashad
förfalskning, runtime/build-bindningar och read-only verify.

Under utvecklingen behövde ett test korrigeras: byte av `record.json` skapar
ett duplicerat UUID och ska därför underkänna **båda** anspråken (16 kvar),
inte bara den utbytta cellen (17 kvar). Den separata dubblettregressionen
kontrollerar samma avsiktliga beteende. Ingen förväntad avvikelse döljs.

Färsk CLI run och verify för korsningen gav båda exit 0 och identisk output.
Även enscenario-run/verify gav exit 0, de ursprungliga tre målträffarna
PQX/PXQ/XPQ och identisk output. Verifiering lämnar resultatfilen orörd och
ignorerar dess påståenden; korrupt gzip ger exit 2 med övriga celler redovisade.

Lokal korsningskörning: `/tmp/ce3-scenario-acceptance-20261021`.

| Identitet | Värde |
|---|---|
| problem_id | `ad7cb37ef5c21d03ca173d4201256a45350aa912553dc268762cef4419fde0ff` |
| manifest_id | `a8dab8898c7fb4f8f90bf5420e4acb514ec07f587a7e6e40d1838a8814e03ac5` |
| scenario_space_id | `f3ec324e1ac87c481134cb0d9e5bbb435c7f1b23eabf1db73674617ea3a1d9e2` |
| batch_spec_id | `0a1a208cea85e700c6304f031e0936ab49e378871347ae527db3238df49d4b28` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `1067aed6c34904c9e8579a9da47c350658c348fd5169333c17f8382f94fa557f` |
| result_id, run och verify | `1b84be37499363fd09de3d75f591979e8293b74bc032aa59312880260480c728` |

Nya körförsök får nya UUID:n och därmed nya result_id. Innehållsidentiteterna
för cell/input/execution/history/audit/observation förblir reproducerbara.

## Reproduktion

Från repositoryroten, med nya outputkataloger:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --output /tmp/ce3-crossing-new
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --output /tmp/ce3-crossing-new
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --output /tmp/ce3-crossing-partial --max-cells 2
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-single-new
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-single-new

python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
```

Partial-kommandot ger avsiktligt exit 2. Standardkommandona använder separat
frysta fixture-pins, inte outputkatalogens kopia. För ett annat deklarerat
problem: kör `scenario_runner.py freeze --problem <problem.json> --output
<ny katalog>`, granska och behåll pins separat, och ange `--problem`,
`--manifest`, `--pins` uttryckligen vid run samt `--pins` vid verify.
Freeze görs aldrig automatiskt under run/verify.

Lokala loggar: `/tmp/ce3-scenario-{tests,legacy,review,replay,workbench,factory,
sessions,omission,run,verify,single-run,single-verify}.log`.
Genererade körartefakter i /tmp committas inte.

## Vad etappen bevisar och inte bevisar

Etappen visar en uttömmande, spårbar och kontrollerad integration av fasta
scripts × deklarerade externa outcomes inom denna begränsade grammatik.
Robusthet gäller endast den frysta mängden och det uttryckliga målet, med
samtliga eventbanor i varje certifierad cell. Inga sannolikheter eller rankningar
härleds ur antalen.

Tillitsmodellen kräver separat betrodda pins, betrodd aktuell verifierarkod
och stabil lokal lagring under verifieringen. Hasharna är inte digitala
signaturer eller exekveringsattestation och styrker inte källornas sanning.
Generella policyer, retry/resume, andra horisonter/slotgrammatiker, pruning,
optimering, AI-kompilering och UI ingår inte. Full tvåpass-checkpoint,
webbbygge och TypeScript-pilotens tester har inte körts. Detta är ett tekniskt
integrationstest, inte bevis på kundnytta eller generell problemlösning.

## Slutlig bevarandekontroll

Före ändringar sparades `/tmp/ce3-scenario-before.json` med SHA-256 för
2 422 befintliga spårade och ospårade, icke-ignorerade filer. Manifestets
filhash är `9126910b99a37064484c5a6df486602c6ebed66482d9071cd95e48ef61ea842a`.
Slutkontrollen visar exakt två avsedda befintliga ändringar, explorer-
`contracts.py` och `README.md`; övriga **2 420 filer är byteidentiska**.
Nya filer listas ovan. Befintliga ospårade underlag lämnas utanför commit.

Separat Apollo-kontroll: samtliga 11 frysta `results/run-1/**/input.json`
återauditerades mot sina gamla historiker. Färsk replay med sparade limits
och färsk audit gav PASS och kanoniskt identiska historiker för sammanlagt
66 banor. Inga gamla input, källhashar, historiker eller rapporter skrevs om.
Verifieringen kördes i minne med samma metod som granskningsrapporten:
`audit_bundle(old, digest(input))`, `replay(input, old['limits'])`, ny audit
och exakt jämförelse med `encode(new) == encode(old)`.

`git diff --check` passerar. Endast denna uppgifts implementation, tester,
fixtures och dokumentation tas med i commit. Ingen push görs.
