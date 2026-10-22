# Integration av granskat manuellt pilotlager /2

2026-10-22. **Integrationskontroller PASS; renderad visuell kontroll återstår.**
`decision-flow-demo-v1` fast-forwardades från
`d1f1f8713c0505cde950f02f5393aee60ff0ad8c` till
`a9959e6004e3e9ad682756923bd12efa9dc84f20`. Ingen implementationskod ändrades.
Aktuell gemensam beskrivning är [engine-baseline-v3.json](engine-baseline-v3.json).
V1 och v2 bevaras byteoförändrade. Baslinjedokumentationen committas separat
ovanpå den integrerade granskningen; ingen push.

## Underlag, historik och bevarande

Rot-README:s produktlåsning lästes. Ingen tillämplig AGENTS.md hittades i repo
eller kontrollerade föräldrakataloger. PILOT-FORMAT-V2, rättningsrapporten och
PILOT-FIX-INDEPENDENT-REVIEW-5967182 lästes före integrationen. Det historiska
formatet lästes för kvarvarande mapping-/kontroll-/statusbetydelser. Arbetet
omfattar endast beställd integration och baslinjedokumentation.

Huvudarbetskopian `/Users/christian/Projects/pulse_engine_clean` stod på exakt
förväntad huvudbaslinje, utan tracked/staged-ändringar men med **246 ospårade
filer**. Uppgiftens detached worktree stod också på d1f1f87 och lämnas där.
**25 worktrees**, branchreferenser och gitstatus inventerades. En byteinventering
omfattade **2465 spårade och icke-ignorerade ospårade filer** i huvudarbetskopian.
Ingen inventering av alla ignorerade filer eller andra worktrees filbytes påstås.

| Commit | Direkt förälder | Roll |
|---|---|---|
| `599ac9e9a3e8f2a2573dd90067355dda5c7c6a2d` | `d1f1f87` | Ursprunglig pilotimplementation |
| `59671820b731542a683650c5d94afd8cf0ea372c` | `599ac9e` | Rättning F1–F3, pilot /2 |
| `a9959e6004e3e9ad682756923bd12efa9dc84f20` | `5967182` | Oberoende PASS, endast rapport och tester |
| `a8cc1fadbd57639bcc78fb16161d7b9585c5e0cf` | `599ac9e` | Historisk FAIL, separat och inte integrerad |

Merge-base mellan huvudbranchen och a9959e6 var d1f1f87. Ingen divergens fanns.
`git merge --ff-only a9959e6004e3e9ad682756923bd12efa9dc84f20` lyckades i
huvudarbetskopian. Sandboxen krävde särskild skrivrätt till huvudrepot och dess
Gitmetadata. Ingen cherry-pick, historikomskrivning, reset, clean, stash eller
framtvingad checkout användes.

Originalgranskning och originaltester bevaras på `codex/review-pilot-599ac9e`
i `/private/tmp/ce3-pilot-review-599ac9e`, exakt a8cc1fa. Läs originalfynden med:

```sh
git show a8cc1fadbd57639bcc78fb16161d7b9585c5e0cf:isolated-tests/structural-ce3-explorer/PILOT-INDEPENDENT-REVIEW-599ac9e.md
git show a8cc1fadbd57639bcc78fb16161d7b9585c5e0cf:isolated-tests/structural-ce3-explorer/pilot_review_tests/test_independent_pilot.py
```

F1/P1 (negativt/ofullständigt protokoll accepterades) rättades med typstrikt
exakt record/receipt-jämförelse och separata svarsunderlag. F2/P1 (paketägt
ankare via symlänk) rättades med paketfilpolicy, logiska/upplösta gränser och
filidentitetskontroll. F3/P2 (tappad fabriceringsmärkning) rättades med explicit
klassificering bunden genom hela kedjan och synlig notice i resultatet.
[Rättningsrapporten](../../../isolated-tests/structural-ce3-explorer/PILOT-FIX-REPORT-a8cc1fa.md)
beskriver ändringarna; [oberoende PASS](../../../isolated-tests/structural-ce3-explorer/PILOT-FIX-INDEPENDENT-REVIEW-5967182.md)
avser dessa rättningar inom dokumenterad modell. Mänsklig relevansbedömning,
sanningsenlig registrering och faktiskt samtycke är fortsatt mänskliga ansvar.

## Kodidentitet och gemensam baslinje

Efter integration beräknades ofiltrerade Git-blobidentiteter från faktiska
arbetskopiebytes för **alla 2231 filer i 5967182**: samtliga matchade.
Granskningsdiffen innehåller exakt två tillagda filer: rapporten och
`pilot_review_tests/test_independent_fix_5967182.py`. Ingen implementation
ändras av granskningscommitten eller dokumentationsleveransen.

Fast-forwarden ändrade fyra tidigare befintliga filer enligt godkänd diff:
explorer-README, contracts.py, scenario_contracts.py och scenario_runner.py.
Övriga 2461 inventerade filer var oförändrade efter integrationen.
Dokumentationen ändrar därefter endast capabilities-README och tillför v3
samt denna rapport. Samtliga tidigare ospårade filbytes bevaras. Övriga
branchreferenser, worktreelistan och andra worktrees gitstatus kontrolleras
mot startinventeringen; ingen annan worktree skrivs till.

V3 använder samma inventarieformat som v1/v2 och behåller den detaljerade
motor-/explorerbeskrivningen. Den skiljer vanlig syntetisk purpose från
separat manuellt /2-antagande, samt underlagsstatus från audit, mål, täckning
och budget/prefix. Deklarerad övning och deklarerat verkligt fall skiljs
uttryckligen; ingen klassificering autentiserar verklighet eller samtycke.
Pilot /1 är historiskt och avvisas av aktuell pilotingång. Ingen automatisk
onboarding, SR-integration eller migrationsfunktion påstås eller ändras.

22 kod-/profilhashar täcker replay-/explorermanifesten. Separata hashvärden
binder övningsgeneratorn, /2-kontraktet och rättningsrapporten. Build-ID:

```text
26705e9143a372eea6e5065c897b4e0b76a125679adae325b8056ed020033ad1
```

Pilotens oförändrade `registration()` binder fortfarande historiska v2 med
ID `ce3-optional-decisions-f31033b` och SHA-256
`b991f0dfc081e6b2236db8c67ece8b652aeccd1eb681320d131dda7947a90ac8`.
Den binder samtidigt faktisk aktuell explorer-build och replay/Python-runtime.
V3 är beskrivningen av den gemensamma baslinjen, inte en ny körparameter eller
ersättning av denna registrering. Detta undviker ändrade implementationsbytes
och självrefererande dokumenthashar. V3:s primära commitbindningar är 5967182
respektive a9959e6, inte dokumentationscommitten.

## Färsk fabricerad acceptanskörning

Från huvudrepots rot med CPython 3.9.6 via
`/Library/Developer/CommandLineTools/usr/bin/python3`, alla körningar med `-B`.
Samtliga sex steg inklusive generatorns två steg gav exit 0. Alla kataloger
var nya; ankaret publicerades separat utanför prepared/frozen/run:

```sh
X=isolated-tests/structural-ce3-explorer
E=/private/tmp/ce3-pilot-integration-20261022-l3wsj8zd
python3 -B "$X/pilot_examples/example.py" --output "$E/draft"
python3 -B "$X/pilot_runner.py" prepare --draft "$E/draft/draft.json" --materials "$E/draft/materials" --output "$E/prepared"
python3 -B "$X/pilot_examples/example.py" --fabricated-receipts-for "$E/prepared" --output "$E/receipts.json"
mkdir "$E/external-trust"
python3 -B "$X/pilot_runner.py" freeze --prepared "$E/prepared" --receipts "$E/receipts.json" --output "$E/frozen" --anchor "$E/external-trust/anchor.json"
python3 -B "$X/pilot_runner.py" run --frozen "$E/frozen" --anchor "$E/external-trust/anchor.json" --output "$E/run"
python3 -B "$X/pilot_runner.py" verify --output "$E/run" --anchor "$E/external-trust/anchor.json"
python3 -B "$X/scenario_runner.py" freeze --problem "$E/run/explorer/problem.json" --output "$E/synthetic-rejected"
```

Sista kommandot är negativproben: exit **1**, teknisk purpose-grind, ingen
outputkatalog. Välj nya kataloger vid reproduktion. Ankaret här är ett lokalt
övningsankare; separat sökväg bevisar inte betrodd extern förvaring.

Facit följer P som förberedelse, N som kräver P och U som dessutom kräver
approved; N/U före P blockeras utan retry. Resultat:

| Plan | approved | rejected | absent | Robust |
|---|---|---|---|---|
| NP | FALSE | FALSE | FALSE | FALSE |
| PN | TRUE | TRUE | TRUE | TRUE |
| PU | TRUE | FALSE | FALSE | FALSE |
| UP | FALSE | FALSE | FALSE | FALSE |

**12 certifierade celler, fyra positiva cellmål, endast PN robust TRUE.**
Söktäckning COMPLETE och execution_budget_status VALID. Resultatets
klassificering är `fabricated_exercise/fabricated_test`, med tydlig text:
”FABRICERAD ÖVNING med fabricerade testkvitton – inte en genomförd kundpilot.”
Run-stdout, verify-stdout och sparat resultat är identiska. Verify bevarade
paketens SHA-256, mtime_ns och mode. Ingen full testsvit upprepades: integrationen
visade inga fynd eller kodändringar som motiverade det. Granskningens 157
passerade testmetoder är historiskt granskningsunderlag, inte nya körresultat.

```text
pilot_case_id a46290858e23a46f64552d38414b55e4f83c36f9124c3eeef33b4f043bfcdffa
snapshot_id ba079e95ee26030f48daf5639e4b9a879d77df4f0f8f463ef8577cf23016646a
batch_spec_id 7d66608f4e96a3ed50957fbd54c8d5c9985aea005d9ce95b4a101340e82851b9
result_id e510fd4b79dbd9008b0d30a74c26a8317d399ebcfa4083151a4df72563e28ff0
review_html_sha256 657b64564f745d811bd904743c6ee0165fd9033f1496e57e99af416c88c695b6
```

## Dokument-, hash- och bindningskontroller

Strikt JSON-läsning avvisar dubbla nycklar/icke-finita tal. Kontroller omfattar
versionsfält, alla kod-/artefakthashar mot faktiska bytes och 5967182,
kanoniskt build-ID, referenser och lokala Markdown-länkar, commitföräldrar,
v1/v2-byteidentitet samt bevarade motorbeskrivningar. Den färska kedjan
kontrolleras separat från körresultatets påståenden: snapshot/case/batch/result-
digester, klassificering, registrerad v2/build/runtime, presentationsbytes,
båda receipts och exakta records, svarsunderlag/källfiler och varje cells
started/record-bindning till samma batchspec. HTML-text innehåller märkning,
Full snapshot och alla tre körgränsuppgifterna. `git diff --check` ingår.
Detta är innehålls-/bindningskontroll, inte renderad visuell granskning.

## Återstående manuell visning

**Renderad visuell kontroll är inte utförd.** Inget försök att kringgå
webbläsarpolicy gjordes. Christian ska öppna exakt den färska filen:

`/private/tmp/ce3-pilot-integration-20261022-l3wsj8zd/prepared/review.html`

Använd tillåten lokal filhantering, exempelvis Finder → Öppna med. Kontrollera
att fabriceringsmärkningen syns direkt, att tabeller/citat/svenska tecken är
läsbara utan klippning, att Full snapshot kan läsas och att Körgränser visar
60 sekunder per process, förprov utanför max_cells och ingen total
väggklocksgaranti. Kontrollera vald zoom/utskrift vid behov. Layout,
responsivitet och skärmläsaråtkomlighet har inte verifierats. Redigera inte
bekräftade HTML-bytes; en ändring kräver ny prepare och nya kvitton.

Före-/efterkontroller, kommandologg, kontrollskript, dokumentutkast, färska
paket och ankare finns under `/private/tmp/ce3-pilot-integration-20261022-l3wsj8zd/`.
De är lokala temporära arbetsbevis. Den committade baslinjen, rapporten och
granskningsunderlagen är det bestående reproduktionsunderlaget.
