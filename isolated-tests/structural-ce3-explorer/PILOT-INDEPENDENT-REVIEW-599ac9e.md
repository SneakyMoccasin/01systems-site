# Oberoende kritisk granskning av pilotlagret 599ac9e

**Bedömning: FAIL.** Datum: 2026-10-22. Ingen implementation har ändrats.

Körmotor, fullständighetskontroller och bindning mellan två olika case klarade
granskningens prober. Tre reproducerade brister hindrar godkännande av det
begärda pilotkontraktet: ett uttryckligen negativt beslut i det bevarade
protokollet kan passera, ett paketägt ankare kan accepteras via en symlänkad
pilotkatalog, och övningens fabricerade ursprung försvinner ur resultatet.
Detta är inte bevis för att någon verklig kund har granskat eller bekräftat något.

## Omfattning, utgångsläge och oberoende

- Granskad commit: `599ac9e9a3e8f2a2573dd90067355dda5c7c6a2d`.
- Implementationsbranch: `codex/ce3-bounded-pilot`, på exakt denna commit vid start.
- Bas och direkt förälder: `d1f1f8713c0505cde950f02f5393aee60ff0ad8c`.
  `git merge-base --is-ancestor d1f1f87 599ac9e` gav exit 0;
  `git rev-parse 599ac9e^` gav exakt basen.
- Ny branch: `codex/review-pilot-599ac9e`.
- Separat worktree: `/private/tmp/ce3-pilot-review-599ac9e`.
  Skapad med `git worktree add -b codex/review-pilot-599ac9e /private/tmp/ce3-pilot-review-599ac9e 599ac9e`.
  Gitmetadata krävde sandboxgodkännande, som gavs. Worktreen var ren efter skapandet.
- Ursprunglig task-worktree: `/Users/christian/.codex/worktrees/6085/pulse_engine_clean`,
  ren detached HEAD på `d1f1f87`. Huvudcheckout och samtliga andra worktrees
  har lämnats orörda. Ingen integration, branchflytt, återställning eller push.
- Repo- och föräldrainventeringen hittade ingen tillämplig `AGENTS.md`.
  Rotens README lästes: låst Decision Flow-produktspår, inga refaktoreringar
  eller utvidgningar där. Arbetet är begränsat till isolerad granskning.

Hela diffen från `d1f1f87` lästes: 12 filer, 1 766 tillagda och 20 borttagna
rader. Den omfattar de fyra pilotdokumenten, explorer-README, två nya
pilotmoduler, övningsgeneratorn, pilotsviten och **alla tre gemensamma
kodändringarna** (`contracts.py`, `scenario_contracts.py`, `scenario_runner.py`).
Implementationsrapportens resultat användes som påståenden att pröva, inte facit.

Läst underlag: `PILOT-ARCHITECTURE.md`, `PILOT-FORMAT.md`,
`PILOT-CONCIERGE.md`, `PILOT-IMPLEMENTATION-REPORT.md`, pilotförslagets §§10–12 i
`OPTIONAL-DECISIONS-ARCHITECTURE-PROPOSAL.md`, aktuell
`docs/ce3/capabilities/engine-baseline-v2.json` och kapabilitetskatalogens README,
samt `FORMAT.md`, `SCENARIO-FORMAT.md`, `FIXED-SLOTS-FORMAT.md`,
`TEMPORAL-GOALS-FORMAT.md` och `OPTIONAL-DECISIONS-FORMAT.md`.
Berörda implementationer för admission, materialisering, observer, batch,
audit och fil-/identitetshantering följdes i koden.

Baslinjens 20 kod-/profilhashar jämfördes med faktiska bytes: **17 stämmer**,
precis de tre angivna gemensamma filerna skiljer sig. Replay/schema/audit,
urval och tidsoperatorer har inte ändrats av pilotcommitten. Baslinje v2
beskriver historiskt motorstöd vid `f31033b`; dess syntetiska purpose betyder
inte att pilotlagret redan har granskats eller att onboarding/SR kan kompilera det.

Den nya sviten är `pilot_review_tests/test_independent_pilot.py`.
Den bygger en egen fullständig AB-modell, källfil, mapping och testkvitton utan
övningsgeneratorn, befintliga modellfixtures eller pilotvalidatorns lövlista.
JSON-kodning, hashkontroller och lövinventering i testet är separata.
Produktionsfunktionerna är testobjekt, inte sanningsorakel. Bara test 24 använder
övningsgeneratorn, för att skapa indata till den uttryckligen begärda reproduktionen.

## Fynd efter allvarlighetsgrad

### F1 — P1: negativt protokollbeslut passerar kvittogrinden

**Plats:** `pilot_contract.py:330–334`, särskilt delsträngstestet på rad 333.

Kvittots eget `decision` kontrolleras strikt mot `approved`, men den bevarade
record-filen kontrolleras som ostrukturerad text med `receipt[key] in record`.
`approved` hittas därmed också i `not_approved`. Bekräftelsens
`acknowledgements` och `assumption_ids` jämförs inte med protokollets uppgifter.

**Reproduktion:** `test_10_observed_receipt_negative_record_substring_is_accepted`:

1. Skapa och prepare:a det egna AB-paketet.
2. Bevara båda protokollen som JSON-text med exakta snapshot- och
   presentationshashar, person, roll, registrerare, tid och statement.
3. Sätt **protokollens** `decision` till `not_approved` och
   `acknowledgements` till `[]`. Låt de yttre kvittona fortsätta säga
   `approved` och full bekräftelseomfattning; uppdatera bara record-filhasharna.
4. Kör freeze och run.

**Observerat:** freeze lyckas, och run/verify ger `COMPLETE_CURRENT`,
CERTIFIED och full söktäckning. Det finns inget positivt decision-fält i
protokollen. Den kvarvarande positiva statement-texten gör protokollet
motsägelsefullt, vilket inte heller avvisas. Ett vanligt negativt **yttre**
kvitto (`decision=rejected`) avvisas korrekt i test 08.

**Konsekvens:** den påstådda maskinella kontrollen av uttryckligt godkännande
även i bevarat protokoll håller inte. Det här är en detekterbar inkonsistens,
inte ett krav på att verifieraren ska autentisera människor eller förstå all
naturlig text. Samma sökmetod bevisar inte heller full identitetssträng,
roll eller tid som avgränsat fält; en sträng kan förekomma inuti en annan.

**Rättning före verklig pilot:** definiera en entydig, maskinläsbar
bekräftelsepost i det bevarade protokollet och jämför beslut, omfattning,
antaganden och bindningsfält exakt. Bevara fritt mötes-/svarsmaterial som
underlag till posten. Kunden kan fortfarande bekräfta muntligt eller i vanlig
text; concierge får registrera den strukturerade posten. Mänsklig kontroll
måste fortfarande avgöra om registreringen motsvarar kundens faktiska svar.

### F2 — P1: ett ankare inne i en symlänkad pilotkatalog godtas som externt

**Plats:** `pilot_runner.py:25–34` och anropet `external_anchor(anchor_path, output)`
på rad 155. Den faktiskt lästa katalogen `output/pilot` kontrolleras inte som
en egen upplöst paketrot.

**Reproduktion:** `test_16_observed_anchor_inside_symlinked_pilot_package_is_accepted`:

1. Kopiera en fullständig testkörning till en ny runkatalog.
2. Flytta dess `pilot/` till en separat katalog och ersätt `run/pilot` med en
   symbolisk kataloglänk dit. Paketets toppnivåfiler tillåter detta.
3. Lägg en **separat vanlig kopia** av ankaret i denna pilotkatalog som
   `untrusted-package-anchor.json` (inte en hårdlänk till `anchor-copy.json`).
4. Kör `pilot_runner.py verify --output <run> --anchor <run>/pilot/untrusted-package-anchor.json`.

**Observerat:** CLI exit **0**, samma fullständiga godkända resultat.
Den logiska ankarsökvägen ligger i paketet som verifieras. Efter `resolve()`
ligger den utanför runrotens fysiska katalog, och den namnspecifika
`samefile(anchor-copy.json)`-kontrollen fångar inte en separat kopia.

**Konsekvens:** paketets egna filer kan leverera det som CLI kallar separat
tillit. En stabil, genuint separat ankarsökväg som operatören redan har valt
kan fortfarande inte ersättas genom en vanlig paketändring; denna probe
bevisar inte förfalskning mot ett sådant oförändrat ankare. Felet är att
separationsgrinden accepterar en paketägd källa när den uttryckligen borde
avvisa den, även under stabila filer och betrodd kod.

**Rättning före verklig pilot:** kontrollera både logiska och upplösta
paketrötter, inklusive den faktiska `output/pilot`-roten; alternativt avvisa
symlänkade paketkataloger och säkerställ motsvarande gränser för lästa delar.
Gör extern ankarlagring till en explicit operatörshanterad tillitsrot.
Behåll avvisningen av kopior/hårdlänkar/symlänkar till `anchor-copy.json`.
En helt fristående byteskopia kan aldrig i sig bevisa betrodd hantering.

### F3 — P2: resultatet tappar märkningen av fabricerad övning

**Plats:** `pilot_runner.py:163–175`, särskilt rad 166 och 172–174.

**Reproduktion:** test 24 kör den levererade generatorn och färska
prepare/freeze/run/verify via CLI. Test 21 gör samma observation på det egna
fabricerade AB-paketet.

**Observerat:** källor, presentation och kvitton är tydligt märkta som
fabricerade/fiktiva. Själva stdout-/`result.json`-resultatet innehåller varken
`fabricerat`, `fabricated`, `training` eller `fiktiv`, eller något typat
övningsfält. Det visar `pilot_status=COMPLETE_CURRENT` och teknisk certifiering.
`evidence_ref` gör ursprunget möjligt att spåra tillbaka till case-filen,
men ett fristående resultat är inte märkt som övning.

`identity_assurance=self_reported_not_authenticated` är korrekt och bra,
men betyder inte ”personen är fiktiv och inget kundgodkännande har ägt rum”.
Det generiska modell-/källsanningsförbehållet gör inte heller denna skillnad.

**Rättning före verklig pilot:** inför en uttrycklig, snapshotbunden
klassificering av övning/verkligt fall och kvittonas testursprung, och för den
vidare till presentation, fryst case, ankare/bindning och resultat.
Övningsgeneratorn ska alltid sätta testklassificeringen. Det krävs också en
synlig resultatformulering om att detta inte är en genomförd kundpilot.
Detta kan bevara en sann deklaration; det kan inte avslöja att någon medvetet
lämnar en falsk deklaration om verklighet eller identitet.

## Övriga granskade kontroller och begränsningar

| Kontroll | Utfall och belägg |
|---|---|
| Alla publika explorer-CLI-ingångar | `runner.py` och `scenario_runner.py` freeze/run/verify inventerade och provade. Purpose-only ändring i giltiga fixtures för explorer /1 och scenario /1–/4 avvisas via CLI (test 25). Inre /4-problem utan paket och `_admission=True` avvisas (test 02). `pilot_examples/example.py` skapar författar-/övningsmaterial, inte ett färdigt pilotgodkännande. |
| Intern admission | Exakt `Admission` krävs; paket, källor, kvitton, build och problem läses om. Limits/budget binds i batchspec. Intern `_purpose`/`_validate_structure` är strukturhjälpare; de är inte publika köringångar. Pythonkoden är betrodd, inte en sandbox mot godtycklig kodexekvering/monkeypatching. |
| Källbytes och extrakt | Ändrade/missing bytes, fel hash, okänt source-ID/version och fel quote/span avvisas. `verbatim_utf8` jämför bytes; `manual_transcription` kräver deklaration men bevisar inte korrekt avskrift/OCR. |
| Unicode och CRLF | Egen källa innehåller Å, astral 😀 och CRLF. Exakt kodpunktsspann `Å😀\r\n` accepteras; UTF-16-lik förskjutning och normaliserade/felaktiga citat avvisas. Ingen tyst radslutsnormalisering. |
| Modellmapping | Full lövtäckning, explicita tomma containers, inga dubletter och giltiga antagandereferenser kontrolleras. Saknat initialfält avvisas av schemat. Test 05 visar att citatet `F` ändå kan påstås stödja samtliga modellregler och prepare lyckas: detta är en dokumenterad relevansgräns, inte ett källstödsbevis. |
| Hypoteser och frågor | Hypotesernas targets och kvittonas samtliga ID:n kontrolleras. Olösta kritiska frågor, fel frågeklass/disposition och bokstavlig `accepted_limitation` avvisas. Modellgap med kvarvarande deklarerade targets blockerar. |
| Scopegräns | Test 22 visar att samma fråga/modell kan passera när författaren bara deklarerar `scope_excluded`, `outside_scope`, tomma targets, tidigare scope och giltigt excludes-index. Ingen analys av verkliga beroenden eller historisk jämförelse med tidigare scope sker. Det är människans ansvar att upptäcka falska eller ofullständiga deklarationer; detta anges redan i formatet. |
| Kontrollfall | Minst två distinkta kandidat/scenariopar. Fel order, scenario, facit, replay-limit och auditprocessfel stoppar prepare. Sparad kontrollhistoria med borttagen bana och reparerad filhash stoppar senare freeze genom färsk audit (test 23). Kontrollerna behöver inte täcka alla scenarier eller ha båda sanningsvärdena; kvalitet/bredd och handhärledd rationale är mänskligt ansvar. |
| Exakt bekräftelse | Saknat, negativt yttre, stale, fel presentation och utbytt record avvisas. Ändrad modell, scope eller budget kräver nya kvitton. Att bara uppdatera digestfält med gammalt originalprotokoll räcker inte. F1 begränsar däremot vad en påstådd protokollkontroll faktiskt bevisar. |
| Kedjan till audit | Egna SHA-256/JSON-kontroller följer case → snapshot/kvitton → batchspec → started/record → input/history/audit. UUID för batchförsök bevaras. Två olika bekräftade case med identiskt problem får samma explorerpins men olika case-/batchspec-ID. Andra casets ankare, utbytt pilotkatalog eller ändrad top-level batch kan inte certifiera det första casets started/record (test 12). |
| Filhantering | Relativa ankarsökvägar och externa symlänkar till verkligt externt ankare fungerar. Material-`..`, absolut sökväg, `./`, dubbla separatorer och symlänkad fil/underkatalog avvisas. Direkt paketankare och symlänk/hårdlänk till anchor-copy avvisas. Befintligt ankare skrivs inte över. F2 gäller tillåtna symlänkade paketdelar. Materialroten själv löses med `resolve`; detta är ingen övergripande symlänkfri filsystemmodell. |
| Teknisk verifiering | Manipulerad målobservation, borttagen eventbana, korrupt gzip, falsk audit och saknad record ger UNVERIFIED/UNKNOWN. Borttagen cell kan inte ge komplett sökning. Noll-/delbudget behåller populationen och okända mål; extra försök utanför prefix ger INVALID och CLI 2. Underlagsstatus kan fortsatt vara COMPLETE_CURRENT; den ersätter inte teknisk status. |
| Read-only verify | Båda result-filerna förvanskas och ignoreras. Process-/skrivhjälpare förbjuds i proben. Alla paketfilers bytes och mtime jämförs före/efter API- och separat CLI-verify: identiska. Ingen replay, automatisk prepare, kvittoförnyelse eller ny pin. Färsk audit körs i verifieringen. |
| Äldre kontrakt | Alla 231 äldre tester samt 19 befintliga pilottester passerar. Ingen ändring i replay/audit, urvalsalgoritmer eller temporal operatorimplementation. Äldre sparade körningar kräver fortfarande sin registrerade build, inte denna nya build. |

Generisk replay har avsiktligt inget pilot-purpose och kan spela ett korrekt
`ce3-run/1`. Det är teknisk replay, inte pilotantagning. Ingen verifierare här
kan avgöra att ett kundfall felaktigt märkts `synthetic_integration_test`.

## Presentation och concierge

Källkod och egen oberoende lövinventering kontrollerar att `review.html`
innehåller alla modellvärden, guards/effekter/kostnader/tider, mål/scenarier,
urvalsregler och mappingreferenser. Texten förklarar obligatoriska/valfria
beslut, grupper, prefixets tidigareläggning, tom plan, all-path och
terminal/always/reach_by. Hypoteser, issues/dispositioner, inkluderat och
exkluderat scope, begränsningar, kontrollfall och execution-limits/max_cells
presenteras. Tekniska snapshoten finns dessutom i en utfällbar bilaga.

Sorterad JSON-rundtur ger byteidentisk presentation. Test 04 injicerar
script/img-markup i fråga och mappingförklaring: det visas escaped, inte som
HTML-element. Befintligt test 18 prövar även källmarkup. Renderer använder
`html.escape(..., quote=True)` för inmatat innehåll; inga script eller fjärrresurser
genereras. Detta är kod-/innehållskontroller, inte ett bevis för begriplighet.

**Exakt visuell kontrollbegränsning:** ett försök gjordes med CUA/Codex In-app
Browser att öppna
`file:///private/tmp/ce3-pilot-review-evidence-599ac9e/exercise/prepared/review.html`.
Webbläsarverktyget nekade navigeringen med “Browser Use rejected this action
due to browser security policy” och “URL is blocked by the Browser use URL
policy”, samt förbjöd indirekta workarounds. Ingen sådan gjordes. Ingen
renderad sida, screenshot, responsiv layout, utskrift eller faktisk
kundläsbarhet har därför verifierats visuellt. HTML-filen från reproduktionen
är 58 423 bytes. DOM-/skärmläsaråtkomlighet har inte verifierats.

En ytterligare presentationsbegränsning: `presentation()` visar
`execution.limits` och `max_cells`, men förklarar inte den fasta
60-sekunderstimeouten per replay-/auditprocess, att kontrollkörningar ligger
utanför batchbudgeten, eller att global väggklocksbudget saknas. Dessa
uppgifter står i PILOT-FORMAT och binds delvis genom kod/batch, men inte som
begriplig körgränstext i review.html. Lägg till dem före en verklig bekräftelse
av samtliga körgränser. Fler små positiva/negativa kontrollfall ger också
mer praktiskt stöd än enbart de två obligatoriska.

**Concierge utan kundskriven JSON: ja, som bemannat arbetssätt.** Kunden kan
lämna befintliga dokument, svara muntligt och granska HTML med concierge.
Christian måste däremot manuellt skriva hela modellen, mappingen, frågor,
kontrollfacit och två JSON-kvitton, bevara verkliga svar och hantera ankaret.
Det finns ingen automatisk översättning eller kvittoinsamling. De långa
tabellerna använder tekniska JSON-pekare och vissa engelska fältnamn;
förklaringar och muntlig genomgång behövs. Instruktionen är genomförbar för
en tekniskt kunnig concierge, men denna granskning har inte genomfört en
faktisk kundsession. F1–F3 och körgränspresentationen behöver åtgärdas först.

## Maskinellt verifierbart respektive mänskligt ansvar

Maskinen kan kontrollera bevarade bytes, självuppgivna versionsreferenser,
exakta kodpunktsspann/citat, strukturell mappingtäckning, typer/profil och
stödtak; deklarerade frågestatusar/beroenden; exakta snapshot-/presentations-
och casebindningar; prebundna kontrollers auditerade utfall; population,
script, prefix/budget, historik, alla eventbanor och målprojektion.
F1 och F2 är konkreta undantag från de påstådda protokoll-/ankarkontrollerna.

Människor måste bedöma källornas sanning och aktuella verklighetsversion,
avskriftens riktighet, citatens relevans, modellens kausalitet/fullständighet,
reella styrmöjligheter, acceptabla hypoteser, scenariernas tillräcklighet och
om en exkluderad funktion ändå påverkar slutsatsen. Även faktiskt visat
innehåll, faktiskt lämnad bekräftelse, person/roll, registreringstid,
kontrollfacitets oberoende och extern ankarlagring kräver mänsklig hantering.

Osanna men strukturellt konsekventa deklarationer kan passera: en ensam
bokstav kan mappas till regler, ett verkligt beroende kan utelämnas ur targets,
en fiktiv person kan beskrivas som verklig och nya falska kvitton kan skrivas
för en ändrad snapshot. Hashar är varken signaturer eller autentisering.
COMPLETE_CURRENT betyder aktuell **inom den bevarade snapshoten**, inte
övervakning av ändrade källsystem. Helt raderade försök, omskriven hel historia
inklusive separat ankare, faktisk exekveringstid eller verklig kundnytta
attesteras inte. Tillitsmodellen förutsätter betrodd kod och stabila filer;
ingen samtidighets-/TOCTOU-säkerhetsgaranti eller OS-behörighetsisolering prövades.

## Oberoende facit och färsk reproduktion

Övningens regler lästes direkt: P sätter prepared. N kräver prepared och
sätter done. U kräver dessutom approved. P och exakt ett av N/U väljs,
varje ordning använder tiderna 0 och 2. Externt svar kommer vid 1; absent
behåller waiting. Safe börjar sant och ändras inte. Mål: done terminalt och
senast 2, safe genom 5, samt alla valda försök accepterade.

| Plan | approved | rejected | absent | Robust |
|---|---|---|---|---|
| NP | FALSE | FALSE | FALSE | FALSE |
| PN | TRUE | TRUE | TRUE | TRUE |
| PU | TRUE | FALSE | FALSE | FALSE |
| UP | FALSE | FALSE | FALSE | FALSE |

N/U före P blockeras; det finns inget retry. PN levererar oberoende av svaret.
PU levererar bara vid approved. Därav **2 leveransval × 2 ordningar × 3
scenarier = 12 celler**, **4 positiva mål**, **endast PN robust**. Alla 12 kan
vara tekniskt korrekta även när målet är falskt. Resultatet jämfördes med denna
bokstavliga matris, inte med generatorns eller validatorns svar.

Färsk körning med separat ankare gav exit 0 i samtliga sex steg och identiska
run-/verify-resultat. Samma CLI-reproduktion ingår dessutom i eget test 24.
Från granskningsworktreens repo-rot kördes följande, där E var
`/private/tmp/ce3-pilot-review-evidence-599ac9e/exercise` och X var
`isolated-tests/structural-ce3-explorer`:

```sh
python3 -B "$X/pilot_examples/example.py" --output "$E/draft"
python3 -B "$X/pilot_runner.py" prepare --draft "$E/draft/draft.json" --materials "$E/draft/materials" --output "$E/prepared"
python3 -B "$X/pilot_examples/example.py" --fabricated-receipts-for "$E/prepared" --output "$E/receipts.json"
python3 -B "$X/pilot_runner.py" freeze --prepared "$E/prepared" --receipts "$E/receipts.json" --output "$E/frozen" --anchor "$E/trusted-anchor.json"
python3 -B "$X/pilot_runner.py" run --frozen "$E/frozen" --anchor "$E/trusted-anchor.json" --output "$E/run"
python3 -B "$X/pilot_runner.py" verify --anchor "$E/trusted-anchor.json" --output "$E/run"
```

Vid omkörning krävs nya kataloger. Faktiska subprocesskommandon använde den
absoluta interpreter som `python3` upplöste till, se miljön nedan.

Det egna AB-paketet är ännu mindre: A gör ready, B kräver ready och gör done,
båda obligatoriska vid 0/1. Två tomma timerhändelser vid 0 ger två ordningar
av events, båda utan tillståndseffekt. Ett scenario neutral ger två celler,
AB TRUE och BA FALSE, med exakt två auditerade eventbanor per cell. Detta
reproducerades genom prepare/freeze/run/verify, egna fabricerade kvitton och
separat ankare. En borttagen bana kan inte ge certifiering.

## Exakt körda tester och resultat

Miljö: CPython 3.9.6,
`/Library/Developer/CommandLineTools/usr/bin/python3`, macOS.
Alla kommandon kördes från `/private/tmp/ce3-pilot-review-599ac9e` med `-B`.

**Slutligt: 275 testmetoder OK, inga skips eller expected failures.**
250 är befintliga och 25 är nya. De tre tester som heter `observed_...` för
fynden hävdar uttryckligen det observerade felbeteendet. Att dessa tester ger
OK betyder att felet reproducerades, inte att motsvarande garanti är PASS.
Även test 24 bekräftar F3 på leveransens övning.

För varje rad nedan kördes exakt kommandot
`python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/<svit> -p 'test_*.py' -v`.
Tiderna är unittest:s rapporterade tider, inte ett prestandalöfte.

| Svit | Antal | Resultat | Tid, s |
|---|---:|---|---:|
| tests | 27 | OK | 89.481 |
| review_tests | 19 | OK | 7.762 |
| scenario_tests | 22 | OK | 13.058 |
| scenario_review_tests | 13 | OK | 11.912 |
| fixed_slots_tests | 19 | OK | 33.572 |
| fixed_slots_review_tests | 17 | OK | 64.010 |
| budget_tests | 8 | OK | 30.148 |
| temporal_tests | 19 | OK | 3.869 |
| temporal_review_tests | 15 | OK | 4.329 |
| selection_tests | 25 | OK | 36.944 |
| optional_review_tests | 20 | OK | 33.687 |
| pilot_tests | 19 | OK | 9.669 |
| pilot_review_tests, slutlig | 25 | OK, inklusive reproducerade fynd | 9.502 |

Därtill kördes exakt:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Resultat: **27 OK, 3.067 s**. En tidigare körning av den nya granskningssviten
innan test 24–25 och CLI-proben i test 16 lades till gav 23 OK på 7.006 s;
den räknas inte en gång till i totalsiffran 275.

De 25 egna metoderna prövar i ordning: (01) AB-facit och eventpopulation,
(02) publika ingångar/admission, (03) källor/mapping/schema, (04) Unicode,
CRLF, escaping och determinism, (05) irrelevant källstöd, (06) kontrollfacit/
domän/limits, (07) auditprocessfel, (08) kvittoavvisningar, (09) stale modell/
scope/budget, (10) F1, (11) egen hashkedja, (12) två case med identisk motorinput,
(13) materialpaths, (14) ankarkopia/alias/överskrivning, (15) relativa och
externa länkade ankare, (16) F2 inklusive CLI, (17) observation/historik/audit,
(18) cellbortfall/avbruten record, (19) read-only och falska resultatcacher,
(20) budget/prefix/exit 2, (21) F3 i AB-fallet, (22) deklarerad kontra dold
scope-lucka, (23) reauditering efter reparerad kontrollhash, (24) färsk
övnings-CLI/facit/F3, (25) purpose-only via CLI för alla äldre problemversioner.

För snabb separat reproduktion av ett fynd, exempelvis F1:

```sh
PYTHONPATH=isolated-tests/structural-ce3-explorer/pilot_review_tests python3 -B -m unittest test_independent_pilot.IndependentPilotReview.test_10_observed_receipt_negative_record_substring_is_accepted -v
```

Byt metodnamn till test 16 eller 24 för F2 respektive övning/F3. Testerna
skapar egna temporära kataloger och ändrar ingen implementation.

Lokala körloggar och CLI-artefakter finns i
`/private/tmp/ce3-pilot-review-evidence-599ac9e/`: `regressions.json`, sviternas
`.log`, `independent.log`, `independent-final.log`, och `exercise/` med stdout,
stderr och faktiska paket. Dessa är arbetsbevis, inte utlovad långtidslagring.
De committade testerna är den reproducerbara evidensen. Ingen webbbuild,
onboarding/SR-svit, livekundgranskning eller separat historisk budgetbranchs
extra svit har körts; baslinjens berörda budgetsviter har körts ovan.

## Rättningar och bevarande

Före en bemannad verklig pilot behövs: F1:s exakta protokollkontroll, F2:s
ankarseparation, F3:s genomgående övningsmärkning samt explicit timeout-/
förprovs-/totalbudgettext i presentationen. Följ detta med negativa
regressionstester och en faktisk visuell genomgång av det material kunden
ska bekräfta. Det kräver ingen ny motor, AI-kompilator, signeringstjänst eller
kundskriven JSON. Verkliga källor, modellrelevans och verkliga godkännanden
måste fortfarande granskas av ansvariga människor.

Endast denna rapport och `pilot_review_tests/test_independent_pilot.py`
läggs till i granskningscommitten. `git diff --check` körs före commit;
ursprungliga spårade filer jämförs mot `599ac9e`. Branchreferenser jämförs
före/efter rapportcommit, med endast granskningsbranchen som avsedd ändring.
Ingen full byteinventering av andra worktrees eller ignorerade användarfiler
påstås. Ingen implementation har rättats, och ingenting har pushats.
