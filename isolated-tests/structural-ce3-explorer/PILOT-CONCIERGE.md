# Christians conciergeflöde för en avgränsad CE3-pilot /2

Aktuellt presentationsformat: [svenskt modellunderlag /1](PILOT-PRESENTATION-V1.md).
Nya utkast och snapshots använder /3 med ett uttryckligt namnregister;
kvitton, case, ankare och resultat behåller /2. Äldre paket migreras inte.

Kunden ska kunna delta genom samtal, befintliga dokument och ett begripligt
modellprotokoll. Christian sammanställer JSON och registrerar kvitton.
[Formatet /2](PILOT-FORMAT-V2.md) anger de maskinella kontrollerna. Ett komplett
pilotpaket betyder uppfyllda deklarerade kontroller; det betyder inte att
källorna eller verksamhetsmodellen har bevisats sanna.

1. **Samtal och underlag.** Skriv den konkreta frågan, vad svaret ska användas
   till, vem som faktiskt kan styra besluten, tidsenhet, inkluderad/exkluderad
   omfattning och begränsningar. Bevara originaldokument, svar och ett UTF-8-
   extrakt med käll-ID/version och kontrollerbara spann. Använd en ny lokal
   katalog med avtalad åtkomst. Christian ansvarar för relevans och extraktion.
   Deklarera `classification`: ett verkligt fall har `case_kind=declared_real_case`
   och `receipt_origin=declared_actual_response`; övningar måste ha
   `fabricated_exercise` och `fabricated_test`. Detta är uppgifter, inte bevis
   på verklighet. /1-paket uppgraderas inte automatiskt; skapa nytt /3-underlag med namnregister enligt presentationskontraktet.
2. **Modellutkast och frågor.** Översätt manuellt till stödd /4-semantik.
   Förklara och mappa alla initialvärden, guards, effekter, kostnader, tider,
   outcomes/absent, mål och urvalsval till källor eller synliga hypoteser.
   Skilj saknad fakta, framtida utfall, osäker tid, modellglapp och prioriteringar.
   Kritiska olösta frågor stoppar arbetet. Framtida utfall kan bli explicita
   scenarier; andra tider kräver separata modeller. En ostödd funktion måste
   lämnas utanför en uttryckligen ändrad fråga utan beroende slutsatser.
3. **Granskning och begriplig modellbekräftelse.** Förhandsbestäm minst två
   kontrollfall med motivering, helst ett positivt och ett negativt. prepare
   kör dem med vanlig replay/audit och skapar snapshot + review.html.
   Gå igenom HTML med domänansvarig och kund: fråga, scope, konkreta värden,
   källkopplingar, hypoteser, frågor, mål, scenarier, obligatoriska/valfria beslut,
   grupper, prefixets tidigareläggning, tom plan och körgränser. Visa särskilt
   60 sekunders timeout per replay-/auditprocess, att förproven ligger utanför
   max_cells-budgeten och att ingen total väggklocksgaranti finns. Kontrollera
   klassificeringen och kvittonas uppgivna ursprung med deltagarna. Vid ändring:
   nytt utkast, ny prepare-katalog, ny granskning. Registrera separat
   domängranskning och kundbekräftelse med exakta snapshot-/presentationsdigester,
   uppgiven person/roll, registrerare, tid och vad som faktiskt bekräftats.
   Bevara de verkliga svaren/mötesprotokollen som separata `supporting_records`.
   Christian registrerar även en strikt `ce3-pilot-confirmation-record/1` i JSON
   som exakt motsvarar varje /2-kvitto. Fri text söks inte efter ett godkännande.
   En negativ respons får inte registreras som approved. Concierge ansvarar
   för korrekt återgivning av det faktiska svaret. Kunden behöver aldrig skriva JSON.
4. **Frysning och körning.** freeze kräver båda aktuella kvittona och skapar
   nytt fryst paket samt ett separat ankare. Bevara ankaret via överenskommen
   betrodd kanal, utanför paketet. En fristående byteskopia bevisar inte betrodd
   förvaring. Paketrot och allt innehåll ska vara vanliga filer/kataloger utan
   symlänkar, inklusive pilot-/explorer-delarna. Föräldraalias som macOS /tmp
   tillåts. Relativt externt ankare eller extern symlänk till externt ankare
   tillåts; alias till paketets ankarkopia avvisas. Kontrollera identiteterna före run.
   All körning använder det bekräftade paketets budget och replaylimits.
   Spara paket, build/runtime och resultat. Vid avbrott används ny körkatalog;
   inga gamla försök skrivs över eller återupptas.
5. **Resultat med omfattning och begränsningar.** Kör verify mot separat ankare.
   Bevara resultatets klassificering och `case_notice` i varje presentation:
   en fabricerad övning är inte en genomförd kundpilot. Namn/roller autentiseras
   inte heller i ett deklarerat verkligt fall.
   Redovisa var för sig underlagsstatus, körningsaudit, mål, söktäckning och
   budgetprefix. Visa vilka scenarier och eventbanor beskedet omfattar och vilka
   celler som är UNKNOWN. Fullt negativt resultat får bara uttalas om hela den
   deklarerade domänen är verifierad. Ingen bästa plan, sannolikhet eller global
   omöjlighet följer. Hypoteser och exkluderad verksamhet följer med svaret.

Ett namn eller en hash autentiserar ingen person. Christian ansvarar för att
protokollet motsvarar faktiskt visat innehåll och faktiskt lämnad bekräftelse.
Domänansvarig måste bedöma om scope fortfarande är meningsfullt efter en
avgränsning. Ingen etikett ”accepterad begränsning” ersätter den bedömningen.

## CLI för ett riktigt manuellt sammanställt fall

Kör från denna implementationsworktrees repositoryrot. Alla mål ska vara nya.
`draft.json` och `materials/` sammanställs av Christian enligt formatet.

```sh
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py prepare \
  --draft /saker-lagring/fall/draft.json \
  --materials /saker-lagring/fall/materials \
  --output /saker-lagring/fall/prepared-v1
```

Öppna `prepared-v1/review.html` och genomför granskningen. Katalognamnet v1
här är fallrevision 1; utkast och snapshot är /3, övriga pilotformat är /2. CLI skriver snapshot_id,
presentation_sha256, klassificering och en läsbar notice.

1. Bevara de faktiska svaren, mejlen eller mötesanteckningarna som separata
   filer under `prepared-v1/materials/confirmation/`.
2. Registrera en JSON-post per roll enligt
   [exakt record-/receipt-format](PILOT-FORMAT-V2.md#strikt-bekräftelsepost-och-separat-mänskligt-underlag).
   Record-formatet är `ce3-pilot-confirmation-record/1`; ange `kind`,
   `decision=approved` endast vid faktiskt ja, snapshot/presentation,
   klassificering, uppgivna person-/roll-/registrerare-/tidsfält, statement,
   hela acknowledgements-listan, sorterade antagande-ID:n samt
   `supporting_records` med `{path,sha256}` för underlaget från steg 1.
3. Registrera två `ce3-pilot-receipt/2` i listan `receipts-v1.json`. Värdena
   måste vara exakt samma som respektive record; ändra schema_version och
   lägg till `record={path,sha256}` för den strukturerade JSON-posten.
   Referenssökvägar räknas från materials/. Filhash fås med
   `shasum -a 256 <fil>`. Använd inte en hash över omformaterad JSON som filhash.

Dubblerade nycklar, saknade fält, `not_approved`, ofullständig omfattning,
utbytta antaganden och motstridiga fält avvisas. Prosa autentiseras eller
tolkas inte; registreringen måste granskas manuellt mot de verkliga svaren.
Övningsgeneratorns testkvitton får aldrig användas för verkliga fall.

```sh
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py freeze \
  --prepared /saker-lagring/fall/prepared-v1 \
  --receipts /saker-lagring/fall/receipts-v1.json \
  --output /saker-lagring/fall/frozen-v1 \
  --anchor /separat-betrodd-lagring/fall-v1.anchor.json
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py run \
  --frozen /saker-lagring/fall/frozen-v1 \
  --anchor /separat-betrodd-lagring/fall-v1.anchor.json \
  --output /saker-lagring/fall/run-1
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py verify \
  --anchor /separat-betrodd-lagring/fall-v1.anchor.json \
  --output /saker-lagring/fall/run-1
```

Käll- eller scopeändring, ny modellregel, mål, scenario, sökgrammatik, limit,
budget, klassificering/kvittoursprung eller implementation: ny prepare, båda nya kvittona, freeze och ankare.
Tidigare material bevaras som historik. Ny körning av samma oförändrade frysta
paket får nytt batch-ID men samma batchspec; inget nytt kundkvitto krävs då.

## Reproducerbar övning, utan kund eller verklig bekräftelse

Följande generator skapar **fabricerade** modellnoter och, vid uttrycklig
flagga, fiktiva testkvitton. Använd aldrig sådana kvitton för ett riktigt fall.
Generatorn sätter alltid explicit fabricerad klassificering och vägrar skapa
testkvitton åt ett deklarerat verkligt fall. Resultatets stdout och result.json
är också märkta ”inte en genomförd kundpilot”. Detta bevarar deklarationen;
systemet kan inte avslöja medvetet falska uppgifter om verkligheten.
Exemplens JSON visar alla fält
för en manuell verklig sammanställning. Välj nya /tmp-namn vid upprepning.

```sh
python3 -B isolated-tests/structural-ce3-explorer/pilot_examples/example.py \
  --output /tmp/ce3-pilot-training
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py prepare \
  --draft /tmp/ce3-pilot-training/draft.json \
  --materials /tmp/ce3-pilot-training/materials --output /tmp/ce3-pilot-prepared
python3 -B isolated-tests/structural-ce3-explorer/pilot_examples/example.py \
  --fabricated-receipts-for /tmp/ce3-pilot-prepared --output /tmp/ce3-pilot-training-receipts.json
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py freeze \
  --prepared /tmp/ce3-pilot-prepared --receipts /tmp/ce3-pilot-training-receipts.json \
  --output /tmp/ce3-pilot-frozen --anchor /tmp/ce3-pilot-training-anchor.json
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py run \
  --frozen /tmp/ce3-pilot-frozen --anchor /tmp/ce3-pilot-training-anchor.json \
  --output /tmp/ce3-pilot-run
python3 -B isolated-tests/structural-ce3-explorer/pilot_runner.py verify \
  --anchor /tmp/ce3-pilot-training-anchor.json --output /tmp/ce3-pilot-run
```

Facit: NP, PN, PU, UP × approved/rejected/absent = 12 korrekt auditerade celler.
PN når målet i alla tre scenarier, PU endast approved. NP/UP missar. Därmed
4 positiva cellmål och endast PN robust TRUE. NP/UP är korrekt körda med
falskt mål. Ingen av planerna rankas. Den fysiska kapacitetsfrågan är uttryckligt
borttagen ur frågan; analysen påstår inte fysisk genomförbarhet.


## Christians manuella visuella kontroll

Om agentens visningsväg blockeras ska den inte kringgå spärren. Öppna själv
`review.html` från den nya prepared-katalogen i din lokala webbläsare enligt
din tillåtna lokala filhantering (exempelvis Finder → Öppna med). Kontrollera:

- Att klassificeringen syns direkt och att övningen tydligt säger att den
  inte är en genomförd kundpilot.
- Att modell-/mappingtabeller, citat, hypoteser, frågor och full snapshot går
  att läsa utan klippta värden; kontrollera även vald zoom och utskrift vid behov.
- Att Körgränser innehåller samtliga tre uppgifter: 60 sekunder per process,
  förprov utanför max_cells och ingen total väggklocksgaranti.
- Att svenska tecken, citattecken och eventuell källmarkup visas som text.

Redigera inte prepared/review.html för att förbättra layouten: de exakta bytesen
är bekräftelseartefakten. En presentationsändring kräver ny prepare med aktuell
kod, granskning och nya kvitton. Ingen maskinell kontroll kan bevisa att
kunden förstått eller faktiskt sett allt visat innehåll.
