# Oberoende granskning av piloträttningen 5967182

**Bedömning: PASS för rättningen inom dokumenterad modell. F1 PASS, F2 PASS,
F3 PASS.** 2026-10-22. Inga nya blockerande fynd i den beställda omfattningen.
**Renderad visuell kontroll återstår separat**, eftersom webbläsarpolicyn
blockerade den. PASS betyder varken genomförd kundpilot, autentiserat samtycke
eller fullständig motoraudit.

## Bas, isolering och läst underlag

Ny granskningsbranch `codex/review-pilot-fix-5967182` skapades i ny worktree
`/private/tmp/ce3-pilot-fix-review-5967182`, med exakt
`59671820b731542a683650c5d94afd8cf0ea372c` som bas. Worktreen var ren.
Skapandekommandot var:

```sh
git worktree add -b codex/review-pilot-fix-5967182 /private/tmp/ce3-pilot-fix-review-5967182 5967182
```

Gitmetadata i huvudrepot krävde sandboxgodkännande, vilket gavs. Inga andra
worktrees användes för testkörningar eller redigerades. Rot-README:s låsta
produktspår lästes. Ingen tillämplig AGENTS.md hittades i repo eller undersökta
föräldrakataloger. Inga instruktioner om delegering; granskningen utfördes utan
subagenter.

Läst: originalrapporten `PILOT-INDEPENDENT-REVIEW-599ac9e.md` och hela
`pilot_review_tests/test_independent_pilot.py` via `git show a8cc1fa:...`,
`PILOT-FIX-REPORT-a8cc1fa.md`, `PILOT-FORMAT-V2.md`, `PILOT-CONCIERGE.md`,
explorer-README samt det äldre formatet för kvarvarande kontraktsbetydelser.
Hela rättningsdiffen `599ac9e..5967182` granskades: nio filer, 1 464 tillagda
och 48 borttagna rader. De tre implementationsfilerna, båda tillagda testfilerna
och alla fyra dokumentändringarna ingår. Den anpassade granskningssviten
jämfördes dessutom direkt mot originaltestfilen från `a8cc1fa`.

Berörda delade vägar följdes i `scenario_contracts.py`, `scenario_runner.py`,
`bridge.py` och `runner.py`. Rättningen ändrar inte dessa filer, replay/audit,
urval eller tidsoperatorer. Detta är en avgränsad kontroll av F1–F3 och deras
berörda garantier, ingen ny motorutveckling eller full motoraudit.

## Resultat per fynd

| Fynd | Besked | Egen reproduktion och kodankare i 5967182 |
|---|---|---|
| F1 exakt bekräftelse | **PASS** | Test 02 återskapar `not_approved` + tom omfattning i båda posterna och omhashar record-referenserna. Riktig freeze-CLI ger exit 1, tom stdout, inget frozen-paket/ankare. `pilot_contract.py:362–402`, särskilt 378–394. |
| F2 externt ankare | **PASS** | Test 07 flyttar `run/pilot`, ersätter med symlänk och lägger en separat paketägd ankarkopia där. Riktig verify-CLI ger exit 1, `Symlink package entry unsupported`, ingen resultatpayload. `pilot_contract.py:63–81`, `pilot_runner.py:26–40,163–174`. |
| F3 fabriceringsmärkning | **PASS** | Test 01 följer klassificering och egen hashkedja genom färsk CLI-körning; test 11–12 prövar stale, blandade och omhashade deklarationer samt generatorgrinden. `pilot_contract.py:36–60,367,377,434–436`, `pilot_runner.py:98–104,175–189`, `pilot_examples/example.py:103–109`. |

### F1: vad som faktiskt har verifierats

Den nya egna sviten är `pilot_review_tests/test_independent_fix_5967182.py`.
Den importerar inga av implementatörens testhjälpare. Den har egen JSON-kodning,
SHA-256-beräkning, kvitto-/postförfattare, negativa mutationer och bokstavligt
utfallsfacit. Leveransens generator används som indata till den uttryckligen
beställda övningsreproduktionen, inte som sanningsorakel.

Test 03 prövar alla 13 gemensamma fält separat med saknat fält, null, boolean,
array, objekt och motstridigt värde: kind, beslut, snapshot, presentation,
klassificering, person, roll, registrerare, tid, statement, omfattning,
antaganden och stödmaterial. Alla avvisas. Extra fält avvisas också.
Jämförelsen använder kanoniska JSON-bytes genom `bridge.equal` (rad 30–31),
vilket skiljer JSON-typer och bevarar arrayordning utan krav på nyckelordning.

Test 04 prövar dubblerade beslut, även `decision` kontra JSON-escapad
`deci\u0073ion`, identiska dubblerade nycklar i klassificeringen, dubblerad
nested path i stödmaterial och NaN. CLI avvisar allt; även dubblerat beslut i
själva kvittolistan avvisas. Test 05 ändrar både record och receipt lika:
`not_approved`, booleskt beslut, lista, NUL-suffix och fel versalisering,
omkastad/ofullständig omfattning, saknade/dubblerade/feltypade antaganden samt
tomt/feltypat/dubblerat stödmaterial avvisas fortfarande.

Test 06 visar gränsen uttryckligen. Ett giltigt record/receipt med
`approved`, men separat binärt svarsunderlag som säger `not_approved: NO`,
kan frysas. Det är **strukturell överensstämmelse, inte faktiskt samtycke**:
prosan används inte som maskinellt godkännande och sanningsenlig transkription
är conciergens ansvar. Om den strukturerade posten ersätts av prosa som
innehåller ordet approved avvisas den. Positiv stödprosa kan inte heller
överrida ett negativt strukturerat beslut. Detta är kontraktets avsedda
mänskliga gräns och återöppnar inte originalets detekterbara record/receipt-fel.

Implementatörens 40 kompletterande tester passerar också, inklusive
ofullständigt/utbytt stödmaterial och efterföljande förändrade materialbytes.
Originaltesterna i `a8cc1fa` ändras inte eller körs med felaktiga förväntningar
på det nya formatet: originalets observerade felutfall har reproducerats som
angrepp mot /2 och krävs nu avvisade.

### F2: filpolicy och faktisk ankarseparation

Prepare kontrollerar materialrot och output (`pilot_runner.py:55–57`).
Draft är ett inläst JSON-värde; dess föräldrakatalog är inte en separat
paketrot i denna policy. Freeze kontrollerar prepared/output via
`external_anchor` (rad 108–110), run kontrollerar frozen/output (rad 148–151),
verify hela runträdet och dess pilotdel före läsning och före retur
(rad 163–174). Admission kontrollerar sitt **case-paket** vid konstruktion och
varje validering (`pilot_contract.py:414–428`). Den delade scenarioverifieraren
är inte själv ett fullständigt pilot-CLI eller ett externt ankar-API.

Eget test 08 lägger till orefererade FIFO-filer respektive dangling symlänkar
i de faktiska paketrötterna för alla fyra steg. Samtliga riktiga CLI-anrop
avvisar dem utan att fastna i FIFO-läsning. Test 09 skapar först ett giltigt
Admission-handtag och lägger därefter till en orefererad länk i dess paket.
Ny Admission, validate, binding, delad freeze/generate/run/verify avvisar
länken. Ingen delad runoutput skapas. Ingen samtidig race eller TOCTOU-attack
behövs eller påstås.

Test 10 godtar absolut och relativt externt ankare samt externa symlänkar och
hårdlänkar till ett faktiskt externt ankare. Separat byteskopia inne i run,
direkt anchor-copy och externa symlänk-/hårdlänkalias till anchor-copy
avvisas. Föräldraalias ovanför paketrot fungerar. Test 15 bekräftar att även
en ignorerad `result.json`-cache måste uppfylla filpolicyn.
Implementatörens tester kompletterar med symlänkad paketrot, material-/pilotdel
och toppnivåfil i alla steg samt exklusiv ankarpublicering.

Ankargrinden kontrollerar både logisk absolut och upplöst sökväg samt
filidentitet via samefile. En oberoende byteskopia på en extern plats kan
inte avslöja vem som förvarat den. Betrodd kod, stabila lokala filer och en
operatör som väljer och bevarar sitt externa ankare är fortfarande förutsatta.
Ingen signerings-, behörighetsisolerings- eller samtidighetsplattform krävs
för denna PASS-bedömning.

### F3: deklaration, bindning och synligt resultat

Klassificeringen är exakt `fabricated_exercise/fabricated_test` i draft,
snapshot, HTML, båda receipts, båda confirmation-records, fryst case,
batchens pilot-binding, ankare, explorerresultatets binding och färskt
pilotresultat. Egen hashkontroll binder case/snapshot/batch och varje cells
started/record till samma batchspec. Notice finns direkt i prepare-stdout,
freeze-stdout, run-/verify-stdout och sparad pilot-`result.json`:

> FABRICERAD ÖVNING med fabricerade testkvitton – inte en genomförd kundpilot.

Test 11 ändrar snapshot till deklarerat verkligt fall: gamla kvitton avvisas,
liksom uppdaterade kvittohashar/klassificering med gamla records. Nya helt
konsekventa testförfattade poster kan skapa ett nytt deklarerat real-paket,
men det kan varken köras mot gamla ankaret eller verifiera gamla körningen
med sitt nya ankare. Efter byte av hela pilotdelen och omhashning av
explorer-batch/attempt är gamla celler alla UNVERIFIED med okända mål.
Blandat verkligt/test-ursprung i draft eller mellan snapshot och de inbördes
överensstämmande kvittona/posterna avvisas.

En ny konsekvent deklaration med fiktiva personer passerar avsiktligt tekniskt.
Dess notice säger att personer, svar och verklighetsuppgifter **inte är
autentiserade**, och `identity_assurance=self_reported_not_authenticated`.
Klassificeringen är därmed inte ett påstående om autentiserad verklighet.
Test 12 verifierar att övningsgeneratorn vägrar ett förberett real-deklarerat
fall, inte skapar någon kvittofil och inte ändrar något i prepared-paketet.

## Versioner och presentation

Eget test 13 prövar /1 för draft, snapshot, case, receipt, anchor och binding
via riktig CLI: exit 1, ingen köroutput, inga omskrivna indata. Draft säger
`Unsupported pilot draft`; övriga avvisas av schema- eller exakt ankar-/
batchjämförelse. Ingen tyst migrering sker. Det nya record-formatets /1 är
avsiktligt `ce3-pilot-confirmation-record/1`, inte ett gammalt pilotkvitto.

En sparad result-cache är inte antagningsunderlag. Test 15 lägger därför en
falsk `ce3-pilot-result/1` i cachen och tar bort explorerresultatcachen:
verify ignorerar dem och återskapar korrekt /2-resultat. Detta är ingen
/1-migrering; faktiska case/snapshot/receipt/anchor/binding måste vara /2.

Båda kvittonas digest binder exakta presentationsbytes. Test 14 verifierar:

- 60 sekunder per replay-/auditprocess.
- Förprovens kontrollkörningar utanför batchens max_cells-budget.
- Ingen total väggklocksgaranti.

Texten finns i `pilot_contract.py:352–354`; faktiskt processanrop har
`timeout=60` i `runner.py:43–47`. Prepare kör separata kontrollprocesser
(`pilot_runner.py:69–84`), batchen får först senare sin max_cells-budget.
Ingen total väggklocksgräns införs. Att ändra texten till 600 sekunder och
omhasha **både** receipt och record räcker inte: omhärledd presentation avvisar
förfalskningen före freeze-output. Determinism/escaping och full lövtäckning
kontrolleras dessutom av de passerande anpassade originaltesterna.

### Kvarstående manuell visuell kontroll

Ett direkt försök med CUA/Codex In-app Browser att öppna
`file:///private/tmp/ce3-pilot-fix-independent-evidence-5967182/independent/prepared/review.html`
blockerades: “Browser Use rejected this action due to browser security policy”.
Verktyget angav att URL-policyn blockerar sidan och förbjöd alternativa
webbläsarytor och indirekta workarounds. Ingen server, alternativ renderer,
webbläsare eller annan kringgång användes.

HTML-innehåll, exakta bytes och bindning är kontrollerade; renderad layout,
läsbarhet, responsivitet, utskrift och skärmläsaråtkomlighet är **inte**
verifierade. Filen är 58 981 bytes. Christian behöver manuellt öppna den
färska `review.html` via tillåten lokal filhantering, exempelvis Finder →
Öppna med, och kontrollera direkt synlig övningsmärkning, läsbara tabeller och
citat, de tre körgränserna, svenska tecken och Full snapshot-bilagan samt
vald zoom/utskrift vid behov. Ändra inte bekräftade HTML-bytes; en ändring
kräver ny prepare och nya bekräftelser.

## Färsk reproduktion och oberoende facit

P förbereder; N kräver förberedelse; U kräver dessutom approved. N/U före P
blockeras utan retry. Därför är facit, fastlagt i testkod utan att fråga
validatorn eller generatorn efter utfall:

| Plan | approved | rejected | absent | Robust |
|---|---|---|---|---|
| NP | FALSE | FALSE | FALSE | FALSE |
| PN | TRUE | TRUE | TRUE | TRUE |
| PU | TRUE | FALSE | FALSE | FALSE |
| UP | FALSE | FALSE | FALSE | FALSE |

Färsk CLI prepare/freeze/run/verify med fabricerade kvitton gav **12
certifierade celler, fyra positiva mål och endast PN robust TRUE**. Alla sex
CLI-steg, inklusive generatorns två steg, gav exit 0. Run-stdout,
verify-stdout och sparad result.json är identiska.

Exakt följande argv-struktur kördes från granskningsrepots rot, med
`python3` upplöst till `/Library/Developer/CommandLineTools/usr/bin/python3`.
X och E nedan förkortar de använda sökvägarna, inte andra körningar:

```sh
X=isolated-tests/structural-ce3-explorer
E=/private/tmp/ce3-pilot-fix-independent-evidence-5967182/independent
python3 -B "$X/pilot_examples/example.py" --output "$E/draft"
python3 -B "$X/pilot_runner.py" prepare --draft "$E/draft/draft.json" --materials "$E/draft/materials" --output "$E/prepared"
python3 -B "$X/pilot_examples/example.py" --fabricated-receipts-for "$E/prepared" --output "$E/receipts.json"
python3 -B "$X/pilot_runner.py" freeze --prepared "$E/prepared" --receipts "$E/receipts.json" --output "$E/frozen" --anchor "$E/external-anchor.json"
python3 -B "$X/pilot_runner.py" run --frozen "$E/frozen" --anchor "$E/external-anchor.json" --output "$E/run"
python3 -B "$X/pilot_runner.py" verify --output "$E/run" --anchor "$E/external-anchor.json"
```

Välj nya kataloger vid omkörning. Färska identiteter:

```text
pilot_case_id a46290858e23a46f64552d38414b55e4f83c36f9124c3eeef33b4f043bfcdffa
snapshot_id ba079e95ee26030f48daf5639e4b9a879d77df4f0f8f463ef8577cf23016646a
batch_spec_id 7d66608f4e96a3ed50957fbd54c8d5c9985aea005d9ce95b4a101340e82851b9
result_id 682e5b50856bfe870804240b1ac46f20d24613462bf18feb84eaae2f4762151d
```

De tre första matchar deterministiskt implementatörens övningsunderlag;
resultatet binds till ett nytt körförsök och har därför annat result_id.
Egen test 15 förbjuder process-/skrivhjälpare i API-verify och jämför samtliga
paketfilers SHA-256, mtime_ns och mode före/efter API och separat CLI.
Felaktig eller saknad cache påverkar varken resultat eller paketbytes.
Test 16 bevarar purpose-grinden genom freeze/run-CLI för explorer /1 och
scenario /1–/4 samt avvisar boolesk intern admission.

## Exakt körda testkommandon

Miljö: macOS, CPython 3.9.6, alla Pythonkörningar med `-B`, från
`/private/tmp/ce3-pilot-fix-review-5967182`. **157 testmetoder OK**, inga skips,
expected failures eller misslyckade testkörningar. Parameteriserade subtester
räknas inte som ytterligare metoder. Vissa regressioner kördes samtidigt;
tiderna nedan är unittest:s uppmätta tider och inget prestandalöfte.

```sh
REVIEW_EVIDENCE=/private/tmp/ce3-pilot-fix-independent-evidence-5967182/independent python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_review_tests -p 'test_independent_fix_5967182.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_review_tests -p 'test_pilot_v2*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/selection_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/budget_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

| Svit | Metoder | Sekunder | Resultat |
|---|---:|---:|---|
| Ny oberoende rättningsgranskning | 16 | 12.784 | OK |
| Implementatörens anpassade granskning + fixprober | 40 | 18.162 | OK |
| pilot_tests | 19 | 14.752 | OK |
| selection_tests | 25 | 44.092 | OK |
| budget_tests | 8 | 36.755 | OK |
| scenario_tests | 22 | 18.497 | OK |
| replay/verification | 27 | 5.663 | OK |

De egna 16 metoderna täcker i nummerordning: (01) färsk CLI/facit/hashkedja/
klassificering, (02) original-F1, (03) alla recordfält/typer, (04) dubblerade
nycklar/NaN, (05) gemensamt ogiltiga fält, (06) fritext/mänsklig gräns,
(07) original-F2, (08) FIFO/dangling i samtliga steg, (09) delad Admission,
(10) ankare/alias, (11) stale/blandade/omhashade klassificeringar, (12)
generatorns real-grind, (13) /1, (14) presentation, (15) read-only/cache,
(16) syntetisk purpose-grind. Testnamnen är fullständiga i den committade
filen. Den egna körningen omfattade dessutom 68 loggade CLI-anrop.

Regressionerna valdes för pilotantagning, delad scenarioväg, /4-urval,
budget/prefix och replay/audit. Inga fynd motiverade en ny bred motoraudit.
Separata äldre fullsviter för explorer/fixed-slots/temporal, webbuild,
onboarding och SR kördes inte här; implementatörens tidigare totalsiffra 290
presenteras inte som denna gransknings körresultat.

Loggarnas stdout/stderr omdirigerades till
`/private/tmp/ce3-pilot-fix-independent-evidence-5967182/`:
`independent.log`, `implementer-review.log`, `pilot_tests.log`,
`selection_tests.log`, `budget_tests.log`, `scenario_tests.log`,
`replay_verification.log`. `independent/commands.json` innehåller full argv,
exitkod och stdout/stderr för alla egna CLI-prober; samma katalog bevarar
färska paket och mutationskopior. Där finns även ursprungsdiff och exporterad
originaltestfil för läsjämförelse. Detta är lokala temporära arbetsbevis;
committad rapport och tester är det bestående reproduktionsunderlaget.

## Mänskliga gränser och bevarande

Människor måste fortfarande bedöma källornas sanning/aktualitet, modellens
rimlighet och fullständighet, citatens relevans, scope, antaganden och
kontrollfacit, faktisk visning/förståelse, verkligt ja, person/roll och korrekt
transkription. Separat betrodd ankarförvaring måste väljas och hanteras av
operatören. Klassificering och hashkedja bevarar deklarationer; de gör dem
inte sanna. COMPLETE_CURRENT avser bevarad snapshot, inte extern övervakning.

Endast denna rapport och den nya testfilen läggs till på granskningsbranchen.
`git diff --check` och jämförelse mot exakt bas används före commit; inga
ursprungliga spårade filer ändras. Originalgranskningen i `a8cc1fa`,
implementationsbranchen, huvudspåret, onboarding/SR och andra worktrees
lämnas orörda. Branchreferenser inventeras före och efter rapportcommit för
att kontrollera att endast granskningsbranchen flyttats. Ingen full
byteinventering av andra worktrees eller deras lokala/ignorerade filer
påstås. Ingen implementation, integration eller push ingår.
