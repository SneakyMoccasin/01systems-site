# CE3 explorer — deklarerade beslut och fasta tidsplatser

Datum: 2026-10-21. Utgångs-HEAD `2dbb0fb`, med implementation `7dab9a0`
och dess granskning i baslinjen. Python 3.9.6, Node v25.1.0.

**Resultat: 201 testfall PASS.** Den nya fyrbeslutsfixturen ger exakt
24 kandidater × 3 scenarier = 72 CERTIFIED celler, 90 auditerade eventbanor,
25 målträffar och 5 robusta ordningar. Full run och separat read-only verify
ger exit 0 och identisk CLI-output/resultatidentitet. Replay, kärnschema,
profil, audit, gamla fixtures och gamla resultat är oförändrade.

## Arkitekturbedömning och implementation

[Arkitekturkontrollen](FIXED-SLOTS-ARCHITECTURE.md) skrevs före implementation.
Båda fas-auditerna samt tidigare implementations-, gransknings- och
formatrapporter lästes först. Ingen tillämplig AGENTS.md hittades.
Repositoryts README-låsning är läst; detta uttryckligen beställda arbete
är begränsat till den isolerade CE3-explorern.

Arkitektur A räcker: explorern genererar vanliga fasta scripts, befintlig
replay verkställer alla regler, separat CLI-audit verifierar körningarna,
och återläsning gör färsk audit utan replay. CE3 stöder redan heltalsstart,
heltalsslots, tomma steg och en separat inklusiv horisont. Ingen operativ
semantik, scheduler, guardutvärderare eller alternativ motor har införts.

Den nya ingången är `ce3-scenario-problem/2` med `permutations_once/2`.
Den kräver en icke-tom unik mängd av samtliga modellbeslut och lika många
strikt stigande heltalsslots. Ett försök per beslut; permutationens i:te
beslut ligger på i:te slot. Modellens `clock.horizon` deklareras separat.
Scenarier får endast variera fulla outcomes; allt annat delas.

Ändrade yttre search-space/candidate/cell/manifest/pins samt
execution/attempt/run/observation/result använder `ce3-scenario-…/2`.
Oförändrade scenario-set/space/scenario, plan, individuellt execution-ID,
terminalmål, målprojektion, auditkvitto, runtime/build och CE3-format behåller
sina tidigare versioner. Exakta fält och identiteter dokumenteras i
[FIXED-SLOTS-FORMAT.md](FIXED-SLOTS-FORMAT.md).

Enscenario-/1 och scenario-/1 behåller tre beslut, slots 0/1/2 och horizon 2.
De gamla frysta manifesten och pins jämförs exakt i testerna. Ett /2-problem
med ett scenario använder den nya scenarioingången; den gamla enscenario-
ingången har inte fått en tyst utvidgning. Befintlig build-pin-policy består:
historiska körpaket kräver sin registrerade explorerbuild.

## Ändrade filer

Fyra befintliga filer i `isolated-tests/structural-ce3-explorer/` ändras:

- `contracts.py`: explicit opt-in till /2-grammatikkontroll i den gemensamma
  deklarationsvalideraren; /1-grindarna består.
- `scenario_contracts.py`: versionsval, förkontroll av storlek, separat /2-
  populationsorakel, kanonisk beslutsmängd för kandidatidentitet och generation.
- `scenario_runner.py`: versionerade omslag och explicita storleks-/budgetfält
  i spec och resultat; återanvänder körning, audit och målbedömning.
- `README.md`: väg till /2-kontrakt, rapport och tester.

Sju nya filer:

- `fixed_slots.py`: storleksgrind, strikt söksyntax och faktoradiskt orakel.
- `fixtures/fixed-slots-problem.json` och `fixed-slots-expected.json`:
  syntetisk modell respektive separat literal-facit.
- `fixed_slots_tests/test_fixed_slots.py`: 19 nya testmetoder.
- `FIXED-SLOTS-ARCHITECTURE.md`, `FIXED-SLOTS-FORMAT.md` och denna rapport.

`observe.py` behövde ingen ändring: antalet accepterade försök härleddes redan
från `len(decision_ids)`. De nya 1-, 2- och 4-beslutskörningarna verifierar
detta och behåller bedömningen av samtliga auditerade banor.

## Sökrymd, gränser och oberoende

För n beslut och s scenarier: **n! kandidater och n! × s celler**.
Implementationens uttryckliga stödgränser är **720 kandidater och 2160
celler**, inklusiva. Minsta stöd är n=1; största n=6. Exempelvis ryms högst
3 scenarier vid n=6 och 18 vid n=5. Minsta scenariomängd är 1.

Storleken härleds innan kandidat-/manifestmaterialisering och före replay.
Fakultetsmultiplikationen avbryts så snart 720 överskrids. Även ett test med
10000 deklarerade ID:n avvisas utan uppräkning eller materialisering.
För varje stödd deklaration sparas exakta antal och stödgränser i manifest,
batchspecifikation och resultat. Överskridande ger tydligt fel/CLI exit 1,
ingen outputkatalog och inget täckningsbesked.

`max_cells` är en separat körbudget (0..hela populationen). Standard är alla
celler. Default replay-limits är 10000 banor, 1000000 rader och 10000 steg;
varje replay-/auditprocess har befintlig timeout 60 sekunder. Dessa gränser
deklareras i /2-specifikationen före körning och exponeras i resultatet.
Ingen extra horisontlängdsgräns införs: ett schema-giltigt längre problem kan
ge INCOMPLETE på `max_steps`. Negativa heltalstider och start=slot=horizon
är uttryckligen testade och stöds enligt befintligt replaykontrakt.

Generatorn använder `itertools.permutations`. Det nya förväntansoraklet
avkodar rangtal 0..n!-1 faktoradiskt, genom att successivt välja ett kvarvarande
ID med kvot och rest från `(k-1)!`. Detta är en bijektion, inte filtrering av
n^n ord. För varje rang finns exakt en permutation och omvänt. Testerna
stänger av generator/permutations/product när oraklet körs och stänger av
oraklet när generatorn körs. Gemensam materialisering skyddas av fulla
direkta input-orakel med literal-slots och utfall utan produktionshjälpare
som facit. Ingen ny regelutvärderare används för förväntade målutfall.

Kandidatidentiteter och genereringsordning kanoniserar beslutsmängden; ändrad
indataordning påverkar inte scripts eller analys. Problemhashen binder dock
den exakta deklarationen, så ändrad listordning ger nya problem-/cell-/pins-ID:n.
Omdöpning ändrar identiteter och lexikal prefixordning vid delbudget; motsvarande
fullständiga scripts behåller sina analysresultat.

## Testproblemens regler och oberoende facit

### Ett och två beslut

A har inga förvillkor, kostnad 0 och schemalägger ready-event med delay 2.
B kräver ready=true och sätter done=true. Initialt är båda fälten false.
Vid slots [2,5], start 1 och horizon 7 finns exakt `{AB,BA}`. AB ger ready
vid 4 och accepterat B vid 5: mål true. BA blockerar B vid 2; A:s event
inträffar vid 7, men B försöks inte igen: mål false. Horizon 6 lämnar
BA:s ready-event pending due=7 och ready=false. Det finns ingen implicit retry.

Minimiproblemet innehåller bara A på slot 4 och mål ready=true. Horizon 6
ger TRUE (event vid inklusiv horisont), horizon 5 ger verifierat FALSE med
eventet fortfarande pending. Exakt ett accepterat försök räcker här.
Separata enbeslutsproblem verifierar negativa tider och ett enda tidssteg.

### Fyra beslut och tre scenarier

Start 1, slots `[2,5,9,12]`, separat horizon 14. Initialt prepared/ready/done/
aux_done/tail=false, response=waiting, budget=2.

- P sätter prepared=true, inga förvillkor, kostnad 0.
- Q kräver prepared=true och ready=true, sätter done=true, kostnad 1.
- X sätter ready=true och aux_done=true, inga förvillkor, kostnad 1.
- T schemalägger tail-event med delay 2, inga förvillkor, kostnad 0.
- tail-event sätter tail=true. Det sker senast vid horizon 14, även om T är sist.
- response-event vid 4: ja sätter approved/ready=true; nej sätter
  rejected/ready=false; uteblivet sätter waiting och lämnar ready oförändrat.

Mål: terminalt done, aux_done och tail ska vara true, plus alla fyra försök
accepterade på varje bana. Q kan aldrig lyckas före P. Under ja räcker P före
Q; under uteblivet måste också X föregå Q; under nej måste X dessutom ligga
efter response-eventet, alltså inte på första slot. T begränsar inte målet
med horizon 14. Dessa regler ger följande literal-mängder, fastställda före
körningen och verifierade mot alla celler:

| Scenario | Exakt förväntade och observerade målträffar |
|---|---|
| Ja, 12 | PQXT, PQTX, PXQT, PXTQ, PTQX, PTXQ, XPQT, XPTQ, XTPQ, TPQX, TPXQ, TXPQ |
| Nej, 5 | PXQT, PXTQ, PTXQ, TPXQ, TXPQ |
| Uteblivet, 8 | PXQT, PXTQ, PTXQ, XPQT, XPTQ, XTPQ, TPXQ, TXPQ |
| Robust TRUE, 5 | PXQT, PXTQ, PTXQ, TPXQ, TXPQ |

Övriga celler har verifierat false mål, övriga 19 kandidater robust FALSE.
Alla 72 celler är CERTIFIED. De 18 celler där T är först har två samtidiga
events vid 4 och därmed två auditerade ordningar; övriga 54 har en. Summa
90 banor, alla bedömda. Dessa två events ändrar olika fält och ger samma mål.

Första testkörningen innehöll en felaktig testförväntan om en bana även när
T var först. Den gav ett testfel; rättades till två utifrån de deklarerade
förfallotiderna. Mål-facit och implementation ändrades inte. Slutkörningen
har inga skips, expected failures eller kvarstående testavvikelser.

### Fem, sex och motstridiga events

Fem ovillkorliga beslut ökar count med 1 vardera. Domän 0..5, initialt 0,
slots 0..4. Populationskontrollen finner exakt 120 unika ordningar som var
och en innehåller alla fem ID:n. Unikhet + giltigt medlemskap + det separat
fastställda 5!=120 ger full population utan ett andra permutationsfacit.
Detta är populationskontroll, inte 120 påstått utförda replays.

Sex motsvarande beslut × tre scenarier ger vid stödgränsen exakt 720
kandidater/2160 manifestceller. Även detta test fryser populationen, inte
2160 körningar. Sju beslut, 10000 beslut och cellantal över 2160 avvisas
före materialisering, även om körbudgeten är 0.

Ett särskilt enbeslutsproblem har två motstridiga timers vid horizon 3:
clear sätter count=0 och set sätter count=1. Referensordningen clear→set
ger mål true; omvänd ordning ger false. Två auditerade banor ger korrekt
cellmål false. Borttagning av den negativa banan med nya artefakthashar
ger UNKNOWN; max_paths=1 ger också UNKNOWN.

## Acceptans och falsifieringsresultat

| Krav | Observerat resultat |
|---|---|
| 2 beslut / 4 beslut × 3 / 5 beslut | Exakta 2 / 24 och 72 / 120; literal-mängder, unikhet och full medlemskontroll PASS |
| Glesa tider, timers och separat horizon | Slots 2/5/9/12, tomma steg, event efter sista beslut och event vid/efter horizon följer replay; PASS |
| Omdöpning/indataordning | Full ny 72-cellskörning med omdöpta ID:n och omvänd modell-/scenarioordning matchar samma regel-facit; PASS |
| Felaktiga tider/horisonter/ID:n | Antal, dubletter, fallande slots, utanför clock, bool/float/string, okänt ID och ostödd grammatik avvisas; PASS |
| Kandidat-/cellmutationer | Saknad, duplicerad, oväntad och felkopplad medlem avvisas; skadad enumeration ger INCOMPLETE/INVALID trots 72 korrekta runs; PASS |
| Konsekvent omhashat bortfall | Hel kandidat med 3 celler respektive en cell tas bort ur manifest, enumeration, runs och result. Pins/spec/attempt/records/observations/result hashas om. Lokal medlemskontroll ger COMPLETE men full verify avvisar mot problemet; PASS |
| Körbudget 0/1/4 | 72 förväntade celler kvar, 0/1/4 certifierade, övriga NOT_RUN/UNKNOWN, aldrig komplett sökning; PASS |
| Skilda täckningsbesked | Två borttagna runs lämnar kandidat- och scenarioprojektion COMPLETE men celltäckning INCOMPLETE (70/72); tidigare robust plan UNKNOWN och plan med verifierat motexempel FALSE; PASS |
| Gzip/auditfel | Berörd robust plans cell UNKNOWN, övriga 71 certifierade; falsk sparad summary ignoreras och verify ändrar inga bytes; PASS |
| Alla eventbanor | Positiv referensbana räcker inte; borttagen negativ bana, replay-limits och model error ger UNKNOWN; PASS |
| Gränser före kostsam uppräkning | Materialiserare och enumeratorer ersatta med felkastande spies; för stor domän ger ändå rätt storleksfel före dem och utan output; PASS |
| Outcomes-only/specbindningar | Modell/slot/horizon/scriptpatchar, ofullständiga outcomes och ändrade spec-counts/timeout avvisas; PASS |
| Gamla /1-flöden | Exakta gamla manifest/pins, gamla testsviter samt nya CLI run/verify för båda äldre ingångarna PASS |

## Faktiskt körda tester och reproduktion

| Grupp | Testfall | Observerad tid |
|---|---:|---:|
| Nya fasta slots /2 | 19 PASS | 39,198 s |
| Ursprunglig explorer, inklusive 34 katalogfall/654 banor | 27 PASS | 96,898 s |
| Scenariokorsning /1 | 22 PASS | 16,707 s |
| Tidigare granskning/R1 | 19 PASS | 9,437 s |
| Scenariogranskning `7dab9a0` | 13 PASS | 13,107 s |
| Replay/regressionsharness | 27 PASS | 3,967 s |
| Arbetsbänk | 14 PASS | 90,018 s |
| Fabriksplaner/timing | 6 PASS | 17,342 s |
| Session/1, session/2, lagerexecution | 54 PASS | 64,266 s |
| **Totalt** | **201 PASS** | |

Antalen är testmetoder/Node-testfall, inte subTests, celler eller mutationer.
Tiderna är observerade med överlappande sviter, inte prestandalöften.

Kommandon från repositoryroten:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/fixed_slots_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
```

Full /2 freeze/run/verify och partial-kommandon finns ordagrant i
[formatdokumentet](FIXED-SLOTS-FORMAT.md#reproduction) och kördes till de där
angivna katalogerna. Full run/verify gav båda 0 med identisk stdout; partial
gav avsiktligt 2 och 4 CERTIFIED + 68 NOT_RUN/UNKNOWN. Separata äldre CLI-flöden:

```sh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-fixed-slots-legacy-single
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-fixed-slots-legacy-single
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --output /tmp/ce3-fixed-slots-legacy-crossing
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --output /tmp/ce3-fixed-slots-legacy-crossing
git diff --check
```

Äldre run/verify gav också exit 0 och identisk stdout parvis. Alla genererade
artefakter ligger i /tmp, inte i commit. Loggar: `/tmp/ce3-fixed-slots-*.log`.

Därutöver passerade Apollos 11 frysta inputs och 66 banor med gammal audit,
färsk replay/audit och exakt kanonisk historiklikhet. Den tidigare dokumenterade
skillnaden mellan historiska sources och dagens byggare ändrades inte.
Reproduktion av den utförda kontrollen, helt i minne:

```sh
python3 -B - <<'PY'
import pathlib, sys
sys.path.insert(0, str(pathlib.Path('isolated-tests/structural-ce3-replay').resolve()))
from core.history import read_bundle, digest, encode
from core.replay import replay
from audit.verify import audit_bundle
files = sorted(pathlib.Path('isolated-tests/structural-ce3-apollo8/results/run-1').rglob('input.json'))
paths = 0
for file in files:
    data = read_bundle(file)
    old = read_bundle(file.with_name('history.json.gz'))
    assert audit_bundle(old, digest(data))['status'] == 'PASS'
    new = replay(data, old['limits'])
    assert audit_bundle(new, digest(data))['status'] == 'PASS'
    assert encode(new) == encode(old)
    paths += len(new['paths'])
assert (len(files), paths) == (11, 66)
print('Apollo: 11 frozen inputs / 66 paths PASS; canonical histories identical')
PY
```

Färska /2-identiteter:

| Identitet | SHA-256 |
|---|---|
| problem_id | `34a0617ae8ad85cfbd23e1d466548b5e44a71c847d75216f21abeb0a9870aea8` |
| manifest_id | `414fd123a7b1bcd89023b1b28c5b767c17e8cc2c703d7a27bb4fa9991c5daa52` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `05ec6aabda53fe95e9c80eb2447164efccffcd5cc51c13b45f4ca5bd689ce028` |
| result_id, run och verify | `6687aedd48a75d106f58b29d5c803da66626d59e6bb78659da9410db92318fa2` |

## Bevarande, blockerare och kvarstående scope

Startmanifest `/tmp/ce3-fixed-slots-before.json` omfattar 2433 befintliga
spårade och ospårade, icke-ignorerade filer. Manifestets SHA-256 är
`ca605a12d1c116f652235c08741156d1e5f259faa0dbd8abe0604386a64194fe`.
Kontrollen efter testerna visar endast de fyra avsedda befintliga ändringarna
ovan; övriga **2429 filer är byteidentiska**. Ospårade underlag, båda auditerna,
Apollo, gamla resultat, schema/replay/audit, arbetsbänk och sessioner bevaras.

B1/E1/E2 (kontrakt, identiteter, exakt fråga), B2/E7 (oberoende population och
omhashningsskydd), B3/E3/E8 (audit, mål och täckning separat), B4 (outcomes-only),
B5 (budget/felisolering) och B6/E9 (bevarande) är uppfyllda inom den testade
etappen. Ingen kvarstående blockerare har identifierats inom denna scope.

Utvidgningen möjliggör uttömmande jämförelse av fler beslut vid givna tider
och händelser mellan/efter besluten. Den stöder fortfarande inte automatisk
tidpunktssökning, valfria beslut, upprepade försök, resume/retry, adaptiva
policyer, pruning, optimering, generell AI-/domänkompilering, UI eller
onboarding. Robusthet gäller endast hela den deklarerade scenariomängden och
det explicita målet; antal är inte sannolikhet. Stödgränsen garanterar inte
att komplexa eventpopulationer ryms i en viss runtimebudget.

Tillitsgränsen är separat betrodda pins, betrodd kod och stabila lokala filer.
Hashar är inte signaturer eller bevis på källors sanning. Ingen extern
oberoende kodgranskning, full tvåpass-checkpoint, webbbuild eller TypeScript-
pilotsvit ingår i denna leverans. Endast uppgiftens implementation, tester
och dokumentation committas efter kontrollerna; ingen push.
