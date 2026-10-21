# R1/P2: rättning av explorerbudgetens verifiering

Datum: 2026-10-21. Bas: `12e777c`, med oberoende granskning i `362f647`.
Rättningen är gjord på `decision-flow-demo-v1` i huvudcheckouten
`/Users/christian/Projects/pulse_engine_clean`, med start-HEAD
`362f647af691e7cd1d4c2be21369b1dfdaf68f28`.

R1:s konsekvent omhashade 72-cellspaket med `max_cells=0` ger nu
`cell_coverage.status=INVALID` och CLI exit **2**, även när alla 72
enskilda målbedömningar fortfarande kan certifieras. Det får inte längre
ett verifierat COMPLETE. Samma brist rättas för äldre explorer-/1 och
scenario-/1 i deras befintliga verifieringsvägar.

Den ursprungliga `FIXED-SLOTS-INDEPENDENT-REVIEW-12e777c.md` bevaras oförändrad
som historik. Den här rapporten beskriver rättningen och dess regressionstest;
den ersätter inte den tidigare oberoende granskningen.

## Befintlig budgetregel

Budgeten begränsar startade försök, inte antalet certifierade eller positiva
resultat. Båda körvägarna itererar redan ett fast prefix, skapar en ny
`runs/<id>`-katalog, skriver input/started och försöker därefter replay/audit.
Ett misslyckat försök ersätts inte av en senare medlem utanför prefixet.

| Väg | Tillåten startordning | Budget |
|---|---|---|
| Explorer `/1` | Lexikografiska permutationer av de tre deklarerade, redan sorterade besluts-ID:na | `search.max_candidates`, 0..6 |
| Scenario `/1` | Samma kandidatordning; deklarerad scenarioordning inom varje kandidat | `batch.max_cells`, 0..6×s |
| Scenario `/2` | Lexikografiska permutationer av sorterade deklarerade besluts-ID:n; deklarerad scenarioordning inom varje kandidat | `batch.max_cells`, 0..n!×s |

För budget B får bara de första B medlemmarna i denna ordning startas.
Alla förväntade medlemmar finns kvar i manifest, enumeration och resultat.
Budget 0 tillåter inga försök. Giltig budget 1 innebär inte en encellsdomän.

Verifieringen räknar varje direkt post under `runs/` som kvarvarande
försöksevidens. Katalogskapandet är den tidigaste beständiga reservationen
av en försöksplats; man väntar inte på `started.json` eller `record.json`.
Även en tom katalog, enbart input, enbart started, failure, ofullständig
historik eller misslyckad audit förbrukar därför platsen. Oväntade poster
är fortfarande ogiltiga. Detta gäller körförsök för en kandidat/cell,
inte individuella beslut eller eventbanor inne i replay.

Om A är mängden kvarvarande poster och P hela tillåtna startordningen,
krävs båda `len(A) <= B` och `A <= set(P[:B])`. Rätt antal försök räcker
alltså inte om ett försök ligger utanför prefixet.

## Kod och felstatus

`runner.execution_prefix_valid` används av båda verifierarna. Den tar emot
ordningen från det redan rekonstruerade och verifierade manifestet.
Scenariovägen sorterar cellerna efter kandidatens beslutsordning och
scenariots deklarerade position; manifestets celler är annars hash-sorterade.
Sparad `enumeration.json` kan inte flytta budgetprefixet genom omsortering.
Ingen ny uppräkning av sökdomänen eller replay införs i verify.

Befintliga resultatfält, schemaversioner och CLI-koder behålls:

- Överskriden budget eller försök utanför prefixet: `search_coverage.status`
  respektive `cell_coverage.status` blir **INVALID**, CLI **2**.
- Förenlig delkörning eller saknad/ofullständig evidens inom tillåtet prefix:
  **INCOMPLETE**, CLI **2**. Saknad katalog ger NOT_RUN/UNKNOWN; kvarvarande
  overifierbart försök ger UNVERIFIED/UNKNOWN och null mål.
- Giltig full population med certifierade körningar: **COMPLETE**, CLI **0**.
- Ogiltiga övergripande deklarationer, pins eller buildbindningar avvisas
  fortsatt som tidigare med CLI **1**.

INVALID här är ett fel i batchens körkontrakt; det gör inte ett korrekt
enskilt mål falskt. Verifierarna granskar fortfarande alla förväntade
medlemmar och isolerar skadad evidens per medlem. Giltiga mål, eventbanor,
kandidat-/scenarioprojektioner och robusthetsvärden behålls, även när batchen
är INVALID. Exempelvis kan 72 individuellt certifierade celler och fem robusta
ordningar finnas i ett budgetstridigt paket, men det är inget godkänt
batchbesked. Full enumeration är heller inte full exekverad söktäckning.

## Äldre kontrakt och oförändrad omfattning

Källkodskontroll av `5429b52:runner.py` visar att ursprunglig explorer-/1
redan körde `candidates[:max_candidates]`, medan verify bara kontrollerade
medlemskap mot hela manifestet. `7dab9a0:scenario_runner.py` har motsvarande
skillnad för `cells[:max_cells]`. R1 infördes alltså inte av fasta slots.
Rättningen omfattar båda gemensamma verifieringsvägarna i nuvarande kod;
den skriver inte om historiska commits eller äldre körpaket.

Regressionsfallen körs med färska verkliga artefakter för alla tre kontrakten:
6 kandidater i explorer-/1, 18 celler i scenario-/1 och 72 celler i scenario-/2.
Äldre `/1` får samma budgetregel som deras körväg redan upprätthöll. Den
avsiktliga beteendeskärpningen är att tidigare accepterad motsägelsefull
budgetmetadata nu ger INVALID. Det sker ingen tyst ändring av /1:s fasta
beslut, slots, clock, domän, kontraktsidentiteter eller pins.

Replay, schema, profil, audit, målprojektion, generator, storleksgrindar och
fixtures är oförändrade. Inga resultatfält eller kontraktsversioner läggs till.
Ingen retry/resume, ny sökfunktion eller integration från `7df45d6` ingår.
Ändrade Pythonfiler ger som tidigare ett nytt `explorer_build_id`; gamla
paket kräver sin registrerade build. Ingen buildbindning kringgås eller
migreras i produktionskoden.

## Tester

T17/R1 är nu ett vanligt passerande test utan `expectedFailure`. T16 kräver
INVALID och CLI 2 men kontrollerar att alla 72 giltiga individuella mål
behålls. Den separata budgetsviten har åtta testmetoder med subfall för de
tre kontrakten:

1. Full körning ombunden till budget 0, 1 och mellanbudget 3/9/36, inklusive
   CLI 2 och oförändrade individuella mål/robusthet.
2. Rätt antal (1 eller 4) men fel medlemmar utanför prefixet. Omsorterad,
   fortfarande komplett enumeration legitimerar inte dessa medlemmar.
3. Tom katalog, input-only, started-only och failure-only på budgetgränsen:
   två försök/budget 2 är INCOMPLETE; samma paket/budget 1 är INVALID trots
   bara en certifierad körning. En ensam ofullständig post utanför prefixet
   är också INVALID trots rätt antal.
4. Färsk körning med två tillåtna försök där den andra replayprocessens
   anropsgräns injicerar `TimeoutExpired`: ingen tredje cell startas,
   ett riktigt mål behålls och det misslyckade försöket räknas.
5. Färska giltiga budgetar 0/1/4 behåller hela populationen, korrekt prefix
   och NOT_RUN/UNKNOWN för resten.
6. Borttagen tidigare evidens inom budgetprefixet ger UNKNOWN/INCOMPLETE,
   inte ett påhittat bevis om körningarnas tidsordning.
7. Fulla giltiga körningar ger COMPLETE och identisk ny verify-sammanfattning.
   Fyrbeslutsfixturen ger 25 positiva cellmål, 90 eventbanor och exakt
   `PXQT`, `PXTQ`, `PTXQ`, `TPXQ`, `TXPQ` som fem robusta ordningar.
8. Omvänd deklarerad scenarioordning följs också vid budget 1 för /1 och /2.

Budgetsvitens verifieringskontroller jämför artefakternas bytehashar före/efter
och förbjuder replayprocessanrop under verify. Testattackerna ändrar enbart
privata temporära paket, aldrig bevarade användarartefakter.

| Svit | Resultat | Tid |
|---|---|---|
| `budget_tests` | 8 PASS | 31.614 s |
| `fixed_slots_review_tests` | 17 PASS | 70.255 s |
| `fixed_slots_tests` | 19 PASS | 36.618 s |
| `tests` | 27 PASS | 93.438 s |
| `scenario_tests` | 22 PASS | 14.374 s |
| `review_tests` | 19 PASS | 8.649 s |
| `scenario_review_tests` | 13 PASS | 13.584 s |
| `replay` | 27 PASS | 3.520 s |

**Totalt 152 tester: 152 PASS, inga expected failures.** Ursprunglig
explorersvit omfattar även 34 befintliga fall/654 eventbanor. Äldre R1-gzipregressioner
och båda scenarioversionernas korruptions-/felisoleringstester passerade.

Kommandon från huvudcheckoutens rot, varje katalog körd med
`python3 -B -m unittest discover -s <katalog> -p 'test_*.py' -v`:

```text
isolated-tests/structural-ce3-explorer/budget_tests
isolated-tests/structural-ce3-explorer/fixed_slots_review_tests
isolated-tests/structural-ce3-explorer/fixed_slots_tests
isolated-tests/structural-ce3-explorer/tests
isolated-tests/structural-ce3-explorer/scenario_tests
isolated-tests/structural-ce3-explorer/review_tests
isolated-tests/structural-ce3-explorer/scenario_review_tests
isolated-tests/structural-ce3-replay/verification
```

Slutloggar: `/tmp/ce3-r1-budget-fix/*-final.log`; maskinläsbar körlista:
`/tmp/ce3-r1-budget-fix/test-results.json`. De är lokala arbetsloggar, inte
versionshanterade artefakter. `git diff --check` passerade också.

En första utvecklingskörning passerade budgetsvitens 8 och granskningssvitens
17 tester. Därefter togs ett tillfälligt extra diagnostikfält bort för att
behålla befintligt resultatformat; tabellen ovan avser den slutliga koden.
Inga produktionsfiler ändrades under slutkörningarna.

## Begränsningar och bevarande

Verifieraren kan inte återställa helt raderad försöksevidens eller bevisa
historisk väggklocksordning. Saknade kataloger inom det tillåtna prefixet
förblir okända; förekomsten av en senare tillåten katalog gör inte i sig
batchen budgetstridig. Ett paket kan inte certifiera full täckning när
förväntad evidens saknas. Ingen signerad försöksjournal, retryhistorik eller
samtidighets-/filsystemsattestation införs. Timeouttestet injicerar undantaget
vid processgränsen; det väntar inte på en faktisk 60-sekunders OS-timeout.

Arbetet började med ren tracked/staged-status och befintliga ospårade filer.
Bytehashinventering av alla befintliga tracked/ospårade filer används för
att kontrollera bevarandet. Ursprunglig granskningsrapport, övriga lokala
filer samt alternativets checkout och branch på `7df45d6` bevaras.
Committen omfattar endast två verifieringsfiler, uppdaterade R1-tester,
den nya budgetsviten och denna rättningsrapport. Ingen merge, cherry-pick
eller push utförs. Ingen nästa motorfas påbörjas.
