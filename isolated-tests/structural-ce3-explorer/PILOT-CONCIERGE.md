# Christians conciergeflöde för en avgränsad CE3-pilot

Kunden ska kunna delta genom samtal, befintliga dokument och ett begripligt
modellprotokoll. Christian sammanställer JSON och registrerar kvitton.
[Formatet](PILOT-FORMAT.md) anger de maskinella kontrollerna. Ett komplett
pilotpaket betyder uppfyllda deklarerade kontroller; det betyder inte att
källorna eller verksamhetsmodellen har bevisats sanna.

1. **Samtal och underlag.** Skriv den konkreta frågan, vad svaret ska användas
   till, vem som faktiskt kan styra besluten, tidsenhet, inkluderad/exkluderad
   omfattning och begränsningar. Bevara originaldokument, svar och ett UTF-8-
   extrakt med käll-ID/version och kontrollerbara spann. Använd en ny lokal
   katalog med avtalad åtkomst. Christian ansvarar för relevans och extraktion.
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
   grupper, prefixets tidigareläggning, tom plan och körgränser. Vid ändring:
   nytt utkast, ny prepare-katalog, ny granskning. Registrera separat
   domängranskning och kundbekräftelse med exakta snapshot-/presentationsdigester,
   uppgiven person/roll, registrerare, tid och vad som faktiskt bekräftats.
   Bevara de verkliga svaren/mötesprotokollen. Kunden behöver aldrig skriva JSON.
4. **Frysning och körning.** freeze kräver båda aktuella kvittona och skapar
   nytt fryst paket samt ett separat ankare. Bevara ankaret via överenskommen
   betrodd kanal, utanför paketet. Kontrollera identiteterna före run.
   All körning använder det bekräftade paketets budget och replaylimits.
   Spara paket, build/runtime och resultat. Vid avbrott används ny körkatalog;
   inga gamla försök skrivs över eller återupptas.
5. **Resultat med omfattning och begränsningar.** Kör verify mot separat ankare.
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

Öppna `prepared-v1/review.html` och genomför granskningen. CLI skriver
snapshot_id och presentation_sha256. Lägg de verkliga, separata protokollen
under `prepared-v1/materials/confirmation/`. Registrera en JSON-lista med två
kvitton i `receipts-v1.json`, enligt PILOT-FORMAT. SHA-256 av protokollbytes
kan tas med `shasum -a 256 <fil>`. Beslutet `approved`, hela statement och uppgivna person-/roll-/
registrerare-/tidsfält ska finnas i protokollet, tillsammans med båda digesterna.
Bekräftelsens omfattning och alla antagande-ID:n anges uttryckligen i kvittot.

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
budget eller implementation: ny prepare, båda nya kvittona, freeze och ankare.
Tidigare material bevaras som historik. Ny körning av samma oförändrade frysta
paket får nytt batch-ID men samma batchspec; inget nytt kundkvitto krävs då.

## Reproducerbar övning, utan kund eller verklig bekräftelse

Följande generator skapar **fabricerade** modellnoter och, vid uttrycklig
flagga, fiktiva testkvitton. Använd aldrig sådana kvitton för ett riktigt fall.
Det är inte bevis på genomförd kundgranskning. Exemplens JSON visar alla fält
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
