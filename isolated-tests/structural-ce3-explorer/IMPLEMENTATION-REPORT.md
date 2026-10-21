# CE3 minimal explorer – implementationsrapport

Datum: 2026-10-21. Utgångs-HEAD: `8ebd5dd178e2862139932f3d31c3f8edcd6635ca`.
Python 3.9.6, Node v25.1.0. Genomförd som den avgränsade vertikalen i Fas 1A.2,
med arkitektur A: wrapper ovanpå oförändrad `fixed-replay/0.1`.

## Leverans

Endast nya filer i `isolated-tests/structural-ce3-explorer/` tillkommer:

- `bridge.py`, `contracts.py`, `enumerate_scripts.py`, `runner.py`, `observe.py`.
- `fixtures/problem.json`, `search-manifest.json`, `pins.json`, `expected.json`, `backend-files.json`.
- `tests/test_explorer.py`, `tests/test_existing_cases.py`.
- `README.md`, `FORMAT.md` och denna rapport.

De implementerar ett strikt trebeslutskontrakt utan script i problemet,
stabila innehållsidentiteter, fryst fullständigt manifest, automatisk
permutationsgenerering, ordinarie replay/audit, separat historikobservation
och oberoende medlemskontroll. Alla operativa regler ligger i den deklarerade
CE3-modellen; explorern verkställer inga förvillkor eller effekter.

Auditernas blockerare är kopplade till konkreta filer/tester i
[README:s blockerarmatris](README.md#blockerare-från-auditerna).
Identitet, sexmedlemstäckning, målbevis och de tre separata beskeden är lösta
för denna etapp. Full generell batch, återupptagande/retry, pruning,
adaptiva policyer, AI-/domänkompilering och generellt Future Decision Space
är fortfarande inte implementerade. Inga sådana blockerare påstås vara lösta.

## Verifierad sexkandidatskörning

| Ordning | Replay | Audit | Alla försök accepterade | Terminalmål + accepterade försök |
|---|---|---|---|---|
| P Q X | COMPLETE | PASS | Ja | SATISFIED |
| P X Q | COMPLETE | PASS | Ja | SATISFIED |
| Q P X | COMPLETE | PASS | Nej | NOT_SATISFIED |
| Q X P | COMPLETE | PASS | Nej | NOT_SATISFIED |
| X P Q | COMPLETE | PASS | Ja | SATISFIED |
| X Q P | COMPLETE | PASS | Nej | NOT_SATISFIED |

Söktäckning: **COMPLETE**, exakt sex unika medlemmar och sex certifierade runs,
utan saknade/oväntade/dubblerade kandidater. Samtliga sex har en eventbana.
Förväntat facit `{PQX,PXQ,XPQ}` kommer från auditens handhärledning och den
separata literal-fixturen, inte från explorerutdata.

Den lokala acceptanskörningen finns under `output/acceptance-1/`, inklusive
vanliga input, kompletta historiker, auditbesked, kvitton, observationer och
resultatmanifest. Denna genererade katalog ignoreras av befintlig `.gitignore`
och ingår inte i commit. `verify` återläste den utan replay med samma resultat-ID.

| Bindning i acceptanskörningen | SHA-256 |
|---|---|
| problem_id | `69e12e72fc9dc55367f6e9ef3253f2b6a118c871219aa6e8c3333d95a552bc67` |
| manifest_id | `ac0ec76f44057b4baabd3e5066189eaf6a4f1dc86528b7914fa8d8b7224bb9d5` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `517aaea5f1c186f771ff65ca1dbe0d40e593ed0524694a1abf3b812c0d71179d` |
| result_id | `ed5a5fa28c57dca6541f8e36164a31890a43bdf11d3424df00ec1537ab36bb2a` |

## Utförda tester

| Testgrupp | Resultat |
|---|---|
| Ny explorersvit inklusive katalogregression | 27 PASS: 26 explorer-/kontrakts-/bevarandetester samt 1 test över 34 befintliga fall/654 banor |
| Befintlig core + regressionsharness | 27 PASS |
| Befintlig arbetsbänk | 14 PASS |
| Befintliga fabriksplaner/timing | 6 PASS |
| Befintlig session/1, session/2 och lagerexecution | 54 PASS |

Totalt 128 unittest/Node-testfall passerade. De 34 katalogfallen verifierades
med färsk replay, befintlig audit, befintlig semantisk comparator och befintliga
fallobservationer. Ingen gammal referensartefakt skrevs om.

Därutöver återauditerades Apollos 11 frysta run-1-inputs, inklusive fem
kontrollfall. Färsk replay med deras sparade limits gav 66 banor och kanoniskt
identiska historiker. Den redan dokumenterade skillnaden mellan gamla sources
och dagens Apollo-byggare ändrades inte.

Felinjektioner täcker bland annat saknad/dubblerad/oväntad kandidat, samma
antal men fel mängd, ändrat script med gammalt kandidat-ID, omhashat felmanifest,
ändrad modell/mål/källa/revision, fel audit, ändrad historik med uppdaterade
filhashar, utbytt input/historik från annan kandidat, förfalskad observation,
fel kvitto/record och ändrad runtime. Alla underkänner relevant bevisled.

Avbruten sökning och replay-limit lämnar mål UNKNOWN. En effekt som orsakar
ModelError ger också UNKNOWN, inte ett verksamhetsmässigt nej. Ett extra
ordningskänsligt timer-test gav två auditerade banor med målutfallen true/false;
all-event-paths-observationen gav korrekt false. Återkörning bevarade innehålls-
identiteterna medan run-UUID:n byttes.

Full tvåpass-checkpoint, webbappbygge och TypeScript-pilotens testsvit har inte
körts; den här ändringen använder inte dessa UI-/motorytor.

## Bevarande och reproduktion

Startmanifestet omfattade 2 404 befintliga spårade och ospårade, icke-ignorerade
filer. SHA-256-kontrollen efter implementation och regressioner fann ingen
ändrad eller borttagen fil. Manifestets filhash är
`1c56bfd5daf39b8f7bcb2cd05ea70f1826eb0d0887e2c2de2f726ac52264f28b`.
Det sparades i `/tmp/ce3-explorer-before.json`. Backendfilernas hashvärden
bevaras också i den nya testfixturen `fixtures/backend-files.json`.

Båda arkitekturauditerna, befintliga lokala ospårade filer, modeller, cases,
resultat, schema, replay, audit, sessioner och arbetsbänk lämnades orörda.
Commit omfattar endast den nya explorerkatalogens källor, dokument och fixtures.

Reproducera från repositoryroten med en ny outputkatalog:

```sh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-explorer-pqx-run
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-explorer-pqx-run
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
```

Samtliga regressionskommandon finns i [README](README.md#tester).

Etappen bevisar en spårbar teknisk integration och uttömmande sökning inom
den explicit deklarerade sexmedlemsdomänen. Den bevisar inte kundnytta,
modellens verklighetssanning, sannolikheter, generell problemlösning eller
att någon plan är bäst utifrån outtalade preferenser.
