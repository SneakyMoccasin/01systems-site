# Kunddialog · isolerad offlineprototyp

Förbättrad från faktisk HEAD `28a697fb423e221a570ad5f3df9143a60be24590`.
Öppna **http://127.0.0.1:8876/onboarding** i den lokala arbetsvyn.
Länken ”Prova onboarding · offline” finns även i arbetsvyns sidhuvud.

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8876
```

Använder redan installerad Python, Node, Ajv och pinnad SR:s tsx/Zod.
Servern binder bara till 127.0.0.1. Kör en arbetsvyprocess per datakatalog.

## Prova kundflödet

**Beskriv → Kontrollera → Komplettera vid behov → Bekräfta.**
Syftet visas först: kontrollera uppgifter inför en analys av vad som måste
ske först och vad som kan hindra planen. Nu granskar kunden beskrivningen;
sedan behöver underlaget översättas till en modell och kontrolleras.
Allt är syntetiskt och förskrivet. Egen fritext sparas utan tolkning.

Tre nya fall i `warehouse.cjs` handlar om att börja använda ett nytt
lagerdatasystem:

- **Tydligt underlag:** funktionsprovet behöver genomföras och beställaren
  lämna separat klartecken. Önskad start är dag 2; klartecknets tid är okänd.
  Kontrollera sammanfattningen och gå direkt till bekräftelse, utan frågor.
- **Feltolkning i förslaget:** samma originalunderlag. Första förslaget anger
  felaktigt ”Godkänt dag 2”. Visa rättat förslag: en uttrycklig ny version och
  ny förskriven granskning, utan kundfråga eller ändrat originalunderlag.
- **Ett startvillkor är oklart:** separat originalunderlag säger inte om
  klartecken krävs före start. Ja/nej ändrar den uttryckliga beroenderegeln.
  **Vet inte ännu** bevarar regeln som `unknown`/`null`, skjuter upp frågan
  och blockerar bekräftelse. Ingen generell blockeringsregel ändras.

Sammanfattningen visar **Ni vill**, **Först måste**, **Önskad start**,
**Fortfarande okänt** och **Analysen ska undersöka**, från aktuellt förslag.
Ingen kostnad, utfört prov, faktisk start eller lämnat klartecken fylls i.
Kundbekräftelsen gäller beskrivningen; den är **inte beställarens klartecken**.

Efter bekräftelsen visas att underlaget sparats och att ingen analys körts.
Nästa steg förklaras tillsammans med frågorna om startvillkor, dag 2 och
senare klartecken. Inga resultat eller ”Kör analys”-knapp finns.

Prova också **Rätta en uppgift** efter bekräftelse, till exempel önskad start
dag 3. Ändringslistan visar endast tidsmålet. Den ursprungliga analysfrågan
om dag 2 bevaras; kundens svar ändrar inte andra uppgifter implicit. Tidigare
bekräftelse blir inaktuell. Ny granskning ersätter inte behovet av ny bekräftelse.
Öppna **Historik och sparade kopior** för att återöppna exakt version eller
läsa en äldre, skrivskyddad kopia. Extra sparning skapar ingen modellversion.

## Varför den gamla luckan blockerade

Det äldre `gap`-fallet lade godkännandeansvarig som ett **aktivt okänt
modellfält** och en blockerande fråga. `contract.cjs` kräver alla aktiva
fält kända (`UNRESOLVED_ITEM`) och inga öppna blockerande frågor inför
överlämning. Det är ett kontraktskrav givet den modelleringen, **inte ett
krav på personnamn eller bevis att namn behövs för en analys**. Gamla
sessioner och blockeringsregler bevaras; deras presentationsförklaring
förtydligas. Nya lagerfall frågar i stället om ett faktiskt startvillkor.

## Modellprofil och kvarstående gräns

[fixed-replay/0.1](../../structural-ce3-replay/FORMAT.md) kan representera
deklarerade förvillkor, genomfört prov, externt klartecken och fasta
händelsetider/utfallsbindningar. Den kan inte förutsäga klartecknets tid eller
simulera sannolikheter eller resursbeläggning. Inga sådana funktioner läggs till.
`depends_on` i onboardingförslaget är spårbarhet, inte ett kompilerat CE3-villkor.

Okänd klarteckentid lagras som en uttrycklig `scope_limit` med
`limits_conclusion`/`accepted_limit`, kopplad till klarteckensregeln. Den
visas före kundens bekräftelse; inget datum sätts. Det accepterar begränsningen
för **beskrivningen**, inte en körbar modell eller ett svar om dag 2.
Inför eventuell analys måste konkreta fasta tidsantaganden (även för provet),
utfall, initialt läge och övriga körindata anges och kontrolleras separat.
Detta är ett kvarstående steg, inte något demonstrationen redan har utfört.

## Presentation och bevarad sessionslogik

`scenario.cjs` behåller `unclear`, `clear`, `misread` och `gap` samt deras
förslags-/svarsvägar för regression och sparade sessioner. De visas som äldre
demoflöden och erbjuds inte för nya sessioner i kundvyn. `warehouse.cjs`
tillför tre separata syntetiska fall. De frysta c3-r1-/clear-filerna och deras
resultat i SR-utvärderingen är orörda.

Sammanfattning och ändringslista använder samma namngivna sakfält och jämför
senaste och föregående förslaget. Det äldre utkastets synliga tidpunkt jämförs därför med
”Godkänt dag 2”, inte ”Saknades”. Lagerfallets feltolkning syns i startvillkoret;
dess tidsmål är fortfarande dag 2 före och efter rättelsen. Ändrade källreferenser utan ändrad saktext
visas inte som kundändring. Fullständiga modellobjekt, källreferenser,
versionskedjor och granskningsarkiv finns under **Tekniska detaljer**.

`controller.cjs` är fortfarande en adapter till **oförändrad session/2**.
Den har ingen egen versions- eller blockeringsmotor. `confirm + createHandoff`
prövas på en tillfällig sessionskopia för att styra bekräftelseformuläret;
samma grind används vid faktisk bekräftelse. Komplett granskning betyder
inte godkänd modell. Blockerande fynd, frågor och okända modellfält består.

Kundens svar sparas som ett eget steg innan förslag/granskning uppdateras.
Kommandona `correct` och `update` grupperar uttryckligt förslag och ny
förskriven granskning i kundvyn, men behåller separata session/2-händelser.
Misslyckas uppdateringen finns det sparade svaret och den inaktuella statusen
kvar; den kan inte bli en bekräftad ny version av misstag.

Förslag, frågor och fyndhantering är testdata. `Archive.recorded`/`tapeFor`
använder SR:s riktiga tre steg med märkta förskrivna svar. Frågan i luckfallet
är förskriven med förslaget som ursprung, inte en påstådd AI-upptäckt.
Inget av detta verifierar SR:s upptäcktsförmåga eller AI-kvalitet.

## Lokal lagring och gränser

Stegen sparas till nya, exklusiva session/2-filer:

`local-data/onboarding/<sessions-id>/000001.json`, `000002.json`, …

Varje fil innehåller full historik och inbäddade granskningsarkiv. Original
ersätts inte. `--data` flyttar även denna git-ignorerade lagring. Återöppning
använder `Session.load` och integritetskontroll utan modell eller ny SR-körning.
Ändringskommandon kräver senaste snapshotnamn och checksumma. En gammal flik
kan inte skriva över senare arbete. Webbläsaren minns bara visad session/kopia.
Oskickad formulärtext sparas inte.

Historikens händelsenamn härleds från sessionens händelser. Datum/tid avser
filens lokala spartid (`mtime`), inte ett nytt revisionssäkert tidsfält i
session/2. Flytt/kopiering av filer kan påverka den visade spartiden.

Node-processen får endast PATH, inga API-credentials, och blockerar utgående
fetch/HTTP/HTTPS/net. Ingen livetransport importeras. Loopback-, Host-, Origin-
och CSP-skydd återanvänds. Inga externa resurser eller typsnitt laddas.
Filuppladdning, filtolkning, kompilering, profilvalidering och CE3-körning ingår
inte. SR, motor och befintliga modeller/resultat är oförändrade. Liveprovet är pausat.

## Verifiering 2026-10-12

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-prototype/controller.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/onboarding-prototype/server.test.py
node --check isolated-tests/structural-ce3-workbench/onboarding-prototype/static/app.js
```

- 36 prototyp-/sessionstester: elva prototyptester och 25 session/2-regressioner.
- 60 kontrakts-/adaptertester, inklusive SR-kodpinne och frysta fall.
- Ett lokalt HTTP-test för rutter, lagring/återöppning, Origin och sökvägsskydd.
- Webbläsare: tydligt fall utan frågor; systemfeltolkning och rättelse;
  verklig lucka med okänt och känt svar; korrekt ändringslista; rättelse efter
  bekräftelse; omladdning, sparning och historisk skrivskyddad version.
  Tangentbord stöds med vanliga knappar och formulär (även verifierat i föregående pass). Bred och smal vy (390 px), utan
  horisontell overflow. Testsessioner ligger kvar lokalt; välj **Nytt demofall**.

**Noll externa AI-anrop, noll kostnad, inga installationer eller publiceringar.**
Nästa steg är Christians bedömning av kundspråket och dialogen. Ingen live-AI
kopplas på av denna uppgift.
