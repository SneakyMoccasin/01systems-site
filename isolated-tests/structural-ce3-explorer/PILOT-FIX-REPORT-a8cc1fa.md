# Rättning av pilotgranskning a8cc1fa: F1–F3 och presentation

2026-10-22. **Implementerat och verifierat; redo för separat oberoende kontroll.**
Detta är en rättningsrapport, inte en ny oberoende PASS-bedömning eller en
bekräftelse på att en verklig kundpilot har genomförts.

## Bas, historik och arbetsgräns

Arbetet utgår från exakt `599ac9e9a3e8f2a2573dd90067355dda5c7c6a2d` på
`codex/ce3-bounded-pilot` i `/private/tmp/ce3-bounded-pilot`, som var ren vid start.
Dess förälder är `d1f1f8713c0505cde950f02f5393aee60ff0ad8c`.
Granskningscommit `a8cc1fadbd57639bcc78fb16161d7b9585c5e0cf` är direkt barn till
`599ac9e` och innehåller endast originalrapport och originaltester.
`git status`, `git worktree list`, `git rev-parse`, logg och
`git merge-base --is-ancestor 599ac9e a8cc1fa` kontrollerades.

Rot-README:s instruktion om låst produktspår lästes; ingen tillämplig
AGENTS.md hittades i repo eller föräldrakataloger. Endast isolerat pilotlager,
tester och dokumentation ändras. Ingen huvudspårsintegration eller push.
Onboarding-/SR-filer lämnas oförändrade.

Originalgranskningen lästes via `git show a8cc1fa:<rapport>` och testfilen
exporterades separat med `git show` till en temporär fil. Granskningsworktreen
`/private/tmp/ce3-pilot-review-599ac9e` och branchen
`codex/review-pilot-599ac9e` lämnas på `a8cc1fa`, med oförändrad historik.
Ingen cherry-pick/merge av granskningsbranchen görs. Nya anpassade regressioner
finns i `pilot_review_tests/test_pilot_v2_review_regressions.py` och kompletteras
av `pilot_review_tests/test_pilot_v2_fixes.py`.

## Versionsbeslut

[Det normativa /2-kontraktet](PILOT-FORMAT-V2.md) beskriver de nya fälten,
filpolicyn, uppgraderingens gräns och bekräftelseposten. Det skrevs som
beslut före kodändringarna. Draft, snapshot, receipt, case, binding, anchor och
result går till `ce3-pilot-<namn>/2`. Det nya separata postformatet heter
`ce3-pilot-confirmation-record/1`; det är inte en omtolkning av gammalt /1-kvitto.

Pilot /1 godtas inte av den nya ingången och uppgraderas inte automatiskt.
Gamla paket behöver sin registrerade /1-kod/runtime för historisk inspektion,
med de kända bristerna. Ny /2-antagning kräver nytt utkast, prepare, mänsklig
genomgång, båda nya kvittona och separat ankare. Gamla PILOT-FORMAT.md,
PILOT-ARCHITECTURE.md och PILOT-IMPLEMENTATION-REPORT.md bevaras byteoförändrade.
README och conciergeinstruktionen pekar nu på /2.

Motorproblem /4 och dess purpose, replay, audit, urval och tidsoperatorer
behåller sina format och betydelser. De tre gemensamma explorerkodfilerna
från ursprungsimplementationen ändras inte av denna rättning. Befintlig
pilot-binding-plats i batchspec bär nu den versionssatta /2-bindningen.
Buildidentiteten ändras som avsett när pilotkoden ändras; äldre paket migreras inte.

## F1/P1 — exakt strukturerad bekräftelse

`pilot_contract.py:validate_case` läser nu record-artefakten med den befintliga
strikta JSON-läsaren, som avvisar dubblerade nycklar på alla nivåer och
icke-finita JSON-tal. Exakta fält kontrolleras med `obj`, och hela posten
jämförs typstrikt med kvittots fält via den kanoniska JSON-kodningen.

Jämförelsen omfattar kind, beslut, snapshot, presentation, klassificering,
uppgiven person, roll, registrerare, tidsfält, statement, hela
acknowledgements-listan, sorterade antagande-ID:n samt supporting_records.
Både receipt och record måste ha exakt `decision=approved`. Negativa värden,
`not_approved`, prefix/suffix, feltyper, saknade fält, extra fält, dubblerade
nycklar och motsägelser avvisas. Receipt+record kan inte gemensamt kringgå
snapshotens antaganden eller obligatorisk bekräftelseomfattning.

Fri text, mejl och mötesanteckningar ligger i en separat icke-tom lista
`supporting_records`, med bevarade bytes, hash och relativa referenser.
Filerna kopieras med frozen/run och hashkontrolleras igen. De tolkas inte som
JSON-godkännande och söks aldrig efter ord som approved. Det är avsiktligt:
concierge ansvarar för att den maskinläsbara posten motsvarar det verkliga
svaret. En person kan ljuga i en korrekt formad post; det kan inte upptäckas
maskinellt. Det finns inga autentiserings- eller prosa-tolkningspåståenden.

**Verifiering:** rapportens F1-reproduktion avvisas före output/ankare.
Kompletterande tester ändrar vart och ett av de 13 gemensamma postfälten till
saknat, feltypat och motstridigt värde; testar negativa/delsträngsbeslut,
dubbel decision och nested klassificering, ofullständig/dubblerad omfattning,
utbytt verkligt antagande-ID, samt ofullständig eller förvanskad underlagslista.
Dubblerad nyckel i själva kvittolistan testas via riktig freeze-CLI.

## F2/P1 — avgränsad filpolicy och ankarseparation

`pilot_contract.py:package_tree` avvisar symlänkad paketrot och varje symlänk
eller specialfil under paketrot. Detta omfattar `pilot/`, `explorer/`,
material, toppnivåfiler, körspår och resultatcacher. Paketet läses först efter
kontrollen. Policyn används för prepare:s material/output, freeze:s
prepared/output, run:s frozen/output och verify:s run/pilot samt genom
Admission vid delade Pythonanrop. Verify kontrollerar även trädet före retur.

`pilot_runner.py:external_anchor` kontrollerar både logiska absoluta och
upplösta paketgränser. Verify anger också pilotdelen som paketrotsgräns.
Symlänkad pilotkatalog avvisas redan av filpolicyn. Ankarkopia och
alias/hårdlänk/symlänk till den avvisas fortsatt med `samefile`. Freeze
skriver exklusivt och ersätter inte befintligt ankare.

Legitimt externt ankare får anges absolut, relativt eller genom en extern
symlänk/hårdlänk till ett verkligt externt ankare. Föräldraalias ovanför
paketroten, exempelvis macOS `/tmp`, är tillåtna. En fristående byteskopia
bevisar inte betrodd förvaring; operatören måste välja och bevara sitt
ankare utanför paketet via avtalad betrodd hantering. Betrodd kod och stabila
lokala filer förutsätts. Ingen signering, generell OS-isolering eller
samtidighets-/TOCTOU-säkerhetsplattform införs.

**Verifiering:** originalattacken med flyttad pilotdel, symlänk och separat
paketägd ankarkopia ger nu CLI exit **1**, ingen godkänd JSON-resultatpayload.
Riktig CLI godtar legitima externa ankare och avvisar interna/aliasankare.
API-prober täcker symlänkad rot, material-/pilotdel, top-level-fil och dangling
länk genom samtliga steg. Befintliga tester för materialtraversering,
ankarets exklusiva publicering och case-/batchbindning passerar.

## F3/P2 — explicit ursprung genom hela kedjan

Draft/snapshot deklarerar ett strikt `classification`-objekt:

| case_kind | receipt_origin |
|---|---|
| fabricated_exercise | fabricated_test |
| declared_real_case | declared_actual_response |

Alla andra kombinationer avvisas. Objektet jämförs exakt i båda receipts och
bekräftelseposter, case, binding och ankare, och ingår i resultatet. Hashkedjan
binder det före bekräftelse och genom batch/celler. Presentationen visar det
nära början; acknowledgements har tillägget `classification_and_receipt_origin`.
Prepare-stdout, freeze-ankaret och run-/verify-resultatet visar också
klassificering och en läsbar `case_notice`.

Övningsgeneratorn skapar alltid fabricerade klassificeringar och explicita
fabricerade JSON-poster plus separata övningsanteckningar. Den vägrar skapa
testkvitton åt ett deklarerat verkligt fall. Det positiva resultatet lyder:

> FABRICERAD ÖVNING med fabricerade testkvitton – inte en genomförd kundpilot.

Detta finns i både stdout och `result.json`, inte bara i en refererad case-fil.
För declared_real_case anger notice att personer, svar och verklighetsuppgifter
inte är autentiserade. Namn används aldrig för att gissa verklighet eller fiktion.

**Verifiering:** klassificering följs genom draft, snapshot, HTML, receipt,
record, case, binding, ankare, explorerresultatets binding och pilotresultat.
Stale klassificering och rehashade gamla kvitton avvisas. Även nytt korrekt
case med ändrad klassificering kan inte auktorisera gammal körning/ankare.
Testkvitto och deklarerat verkligt fall avvisas, inklusive när receipt och
record är inbördes konsekventa. En helt ny, konsekvent real-deklaration testas
positivt med uttryckligen fiktiva testpersoner för att verifiera gränsen:
systemet känner inte igen osanna verklighetsuppgifter. Inget sådant test är en
faktiskt genomförd kundpilot.

## Presentation och visuell kontroll

`presentation()` visar nu följande text under Körgränser, i de bytes som
båda kvittona binder:

> Timeout är 60 sekunder per replay-/auditprocess. Förprovens kontrollkörningar
> ligger utanför batchens max_cells-budget. Ingen total väggklocksgaranti finns.

Klassificering och övningsnotice syns före analysfrågan. Determinism efter
JSON-rundtur och HTML-escaping kontrolleras fortsatt; manipulation av den
visade timeouten till 600 sekunder avvisas även om kvittots presentationshash
uppdateras. De registrerade originalbytesen härleds om från snapshoten.

**Ingen visuell kontroll påstås.** I samma session blockerades lokal
file:-navigering av Browser Use URL policy med uttryckligt förbud mot
workarounds/indirekta visningsvägar. Den spärren kringgicks inte, och den nya
filen öppnades inte genom en alternativ webbläsarväg. HTML-innehåll, escaping,
determinism och bindning kontrollerades genom kod/tester; layout, utskrift
och faktisk läsbarhet har inte verifierats i renderad vy.

Christian kan manuellt öppna den färska filen
`/private/tmp/ce3-pilot-fix-evidence/exercise-v2/prepared/review.html`
i lokal webbläsare genom sin tillåtna filhantering, exempelvis Finder → Öppna
med. Kontrollera att övningsmärkningen syns direkt, att hela modell-/käll-/
hypotes-/frågetabellerna är läsbara utan klippta värden och att alla tre
körgränsuppgifterna ovan syns. Kontrollera svenska tecken/markup samt öppna
bilagan Full snapshot. Testa vald zoom/utskrift om den ska användas med kunden.
Ändra inte HTML-filen manuellt; en ändring kräver ny prepare och nya kvitton.
Samma konkreta anvisning finns i [conciergeinstruktionen](PILOT-CONCIERGE.md).

## Tester, historiska felassertioner och resultat

**290 testmetoder OK, inga skips eller expected failures.** 250 befintliga
tester, 25 anpassade granskningsregressioner och 15 nya riktade metoder.
Alla kördes från `/private/tmp/ce3-bounded-pilot`, CPython 3.9.6 via
`/Library/Developer/CommandLineTools/usr/bin/python3`, med `-B`.

Originalets test 10 och 16 förväntade uttryckligen att felaktigt protokoll
respektive paketankare **accepterades**. De kräver nu avvisning. Test 21 och
24 förväntade frånvaro av fabriceringsmärkning; de kräver nu tydlig märkning
och klassificering. Dessa är vanliga positiva regressionstester av rättat
beteende, inga expectedFailure eller skips. Originalversionerna ligger kvar
oförändrade i `a8cc1fa`; rättningssvitens header anger dess ursprung.

Originalets test 05 (irrelevant men exakt citat kan accepteras) och 22
(ett verkligt beroende kan döljas genom en osann scopedeklaration) behåller
sina tester av dokumenterade mänskliga bedömningsgränser. Ingen semantisk
källsannings-, modellrelevans- eller identitetsdetektor har införts.

Den befintliga pilotsviten har inte skrivits om; dess 19 tester använder
övningsgeneratorns nya giltiga /2-underlag. Gemensam explorerkod ändrades
inte, men hela den tidigare 250-testpopulationen kördes ändå för att pröva
att pilotantagningen inte påverkar syntetiska körvägar eller replay/audit.

| Svit | Antal | Unittest-tid, s | Resultat |
|---|---:|---:|---|
| tests | 27 | 89.859 | OK |
| review_tests | 19 | 8.258 | OK |
| scenario_tests | 22 | 13.094 | OK |
| scenario_review_tests | 13 | 12.329 | OK |
| fixed_slots_tests | 19 | 34.114 | OK |
| fixed_slots_review_tests | 17 | 64.802 | OK |
| budget_tests | 8 | 29.550 | OK |
| temporal_tests | 19 | 3.882 | OK |
| temporal_review_tests | 15 | 4.610 | OK |
| selection_tests | 25 | 36.522 | OK |
| optional_review_tests | 20 | 34.708 | OK |
| pilot_tests | 19 | 10.128 | OK |
| verification | 27 | 3.099 | OK |
| pilot_review_tests (anpassad granskning + F1–F3) | 40 | 15.433 | OK |

För varje explorer-svit i tabellen kördes exakt detta kommando med respektive
katalognamn i `<svit>`:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/<svit> -p 'test_*.py' -v
```

Replay-raden kördes med:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Före slutkörningarna gav initial pilotkontroll 19 OK (9.842 s), första
anpassade granskningskörningen 25 OK (9.046 s) och första utökade körningen
40 OK (14.824 s). Därefter togs en onödig testmodultilldelning bort och hela
40-testssviten kördes igen (tiden i tabellen). Dessa upprepningar dubbelräknas
inte i 290. Ingen produktionskod ändrades efter de slutliga regressionskörningarna.

De 15 nya metoderna täcker exakt postmatchning, negativa/delsträngsbeslut,
dubblerade record-/receipt-nycklar genom CLI, scope och antaganden, separat
opaque svarsunderlag, krav på underlagslista, symlänkar genom alla steg,
legitima ankare via CLI, otillåtna ankare via CLI, hela klassificeringskedjan,
stale klassificering, blandat ursprung och generatoravvisning, deklarerat
real-fall utan autentisering, presentationens nya text och avvisning av /1.

Read-only-proberna i pilotsviten och den anpassade granskningen förbjuder
process-/skrivhjälpare, förstör båda result-cacherna och jämför bytes/mtime
före och efter API- och separat CLI-verify. Resultatet förblir identiskt utan
replay, nya kvitton, ny pin eller ändrade paketfiler. Teknisk manipulation och
ofullständiga körningar behåller UNKNOWN/UNVERIFIED; underlagsstatus ersätter
inte audit-, mål-, täcknings- eller budgetstatus.

## Färsk övningsreproduktion

Samtliga sex CLI-steg kördes med nya destinationskataloger och separat ankare,
exit 0. Resultaten från run, verify och sparad result.json är identiska.
Facit hämtades inte från generator/validator: P förbereder, N kräver P,
U kräver dessutom approved; N/U före P blockeras utan retry. Därav NP/UP
negativa i alla scenarier, PN positiv i alla tre, PU endast i approved.
**12 certifierade celler, fyra positiva mål och endast PN robust TRUE.**
Den anpassade granskningssvitens test 24 upprepar dessutom hela CLI-kedjan.
Det egna AB-paketet från granskningen återanvänds som separat modelltest med
två samtidiga tomma timers, två celler och två eventbanor per cell: AB TRUE,
BA FALSE, handhärlett utan pilotgeneratorn.

Exakt körda kommandon, där X och E nedan anger de använda sökvägarna:

```sh
X=isolated-tests/structural-ce3-explorer
E=/private/tmp/ce3-pilot-fix-evidence/exercise-v2
python3 -B "$X/pilot_examples/example.py" --output "$E/draft"
python3 -B "$X/pilot_runner.py" prepare --draft "$E/draft/draft.json" --materials "$E/draft/materials" --output "$E/prepared"
python3 -B "$X/pilot_examples/example.py" --fabricated-receipts-for "$E/prepared" --output "$E/receipts.json"
python3 -B "$X/pilot_runner.py" freeze --prepared "$E/prepared" --receipts "$E/receipts.json" --output "$E/frozen" --anchor "$E/trusted-anchor.json"
python3 -B "$X/pilot_runner.py" run --frozen "$E/frozen" --anchor "$E/trusted-anchor.json" --output "$E/run"
python3 -B "$X/pilot_runner.py" verify --anchor "$E/trusted-anchor.json" --output "$E/run"
```

Välj nytt E vid omkörning; befintliga paket/ankare får inte skrivas över.
Subprocesskommandona använde den ovan angivna absoluta Pythoninterpretern;
deras argv/exit och stdout/stderr finns i `exercise-v2/commands.json` och
numrerade stdout-/stderrfiler under E. Identiteter från denna färska körning:

```text
pilot_case_id  a46290858e23a46f64552d38414b55e4f83c36f9124c3eeef33b4f043bfcdffa
snapshot_id  ba079e95ee26030f48daf5639e4b9a879d77df4f0f8f463ef8577cf23016646a
batch_spec_id  7d66608f4e96a3ed50957fbd54c8d5c9985aea005d9ce95b4a101340e82851b9
result_id  0a38ca957ac9deea0eb2da868adb8af1211b6398c39fb93755d72eb080a158ca
```

Lokala fulla loggar finns under `/private/tmp/ce3-pilot-fix-evidence/`:
`regressions.json`, sviternas `.log`, `review-tests-final.log` och
`exercise-v2/`. Det är temporära arbetsbevis; committad kod, format och tester
är reproduktionsunderlag. Inga webbbuild-, onboarding- eller SR-tester har
körts; deras implementationer ändras inte.

## Kvarstående gränser och bevarande

Conciergeflödet är fortsatt möjligt utan kundskriven JSON. Christian skriver
modellen, mappingen, frågorna och kontrollfacit, registrerar de två exakta
posterna/kvittona, bevarar verkliga svar och hanterar ankaret. Kunden deltar
via dokument, samtal och begripligt visat material. Faktisk relevans, korrekt
transkription, mänskligt ja, acceptabel scope och sanna verklighetsuppgifter
kräver fortfarande mänsklig bedömning. Record kan bevisa överensstämmelse med
kvittot, inte att concierge återgav det faktiska svaret sanningsenligt.

Ingen dold auto-approval, digital signatur, betrodd personidentitet,
verklighetsövervakning, total körtidsgaranti eller automatisk kvittomigrering
införs. Klassificeringen bevarar deklarationer, inte bevis om verkligheten.
Den visuella manuella kontrollen ovan återstår och den begärda oberoende
kontrollen av rättningen ska göras separat.

Endast piloträttning, två nya testfiler och dokumentation ingår i committen.
`git diff --check` och jämförelse mot basen används före leverans. Replay,
audit, urval, tidsoperatorer, de tre gemensamma explorerfilerna, äldre
format/baslinjer, onboarding/SR och originalgranskningen är oförändrade.
Branchreferenser inventerades före arbetet; endast implementationsbranchen
ska flyttas av rättningscommitten. Andra worktrees har inte skrivits till.
Ingen full byteinventering av deras lokala/ignorerade filer påstås. Ingen
integration eller push har utförts.
