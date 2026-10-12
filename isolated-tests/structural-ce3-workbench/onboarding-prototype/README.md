# Kunddialog · isolerad offlineprototyp

Förbättrad från faktisk HEAD `8b36285`.
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
Underlaget är syntetiskt; modellförslag och SR-svar är förskrivna. Egen fritext
sparas utan tolkning. Det valfria körprovet efter bekräftelsen använder faktisk CE3-kod.

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

Efter bekräftelsen visas att beskrivningen stämmer och att underlaget sparats.
**Prova två testplaner i CE3** öppnar det nya, avgränsade körprovet. Ingen
körning görs automatiskt av kundbekräftelsen. Den bekräftade
sammanfattningen finns i utfällningen. Analysfrågan visas där en gång från
`proposal.analysis.question`; den tidigare separata frågelistan är borttagen.
Kundbekräftelse är fortfarande inte beställarens klartecken till driftstart.

### När önskad start ändras till dag 3

Välj **Rätta en uppgift**, dag 3 och spara. Tidigare granskning och bekräftelse
blir inaktuella direkt. Demot frågar sedan uttryckligen om analysen också ska
undersöka dag 3 eller behålla dag 2. Inget alternativ är automatiskt valt.
Ett klick på ett av de två alternativen sparar valet och tillför ett nytt
förskrivet förslag och en ny granskning. Före valet kan varken nytt förslag
eller ny bekräftelse skapas genom prototypens kommandon.

Valet använder befintlig session/2: en blockerande fråga med ID knutet till
det sparade startsvaret, sedan ett vanligt svar med egen källidentitet.
Inga nya sessionsfält eller kontrakt införs. Hela analysfrågan väljs ur två
förskrivna texter; inga datum ersätts i fri kundtext. Startmålet hämtas från
startsvaret och analysfrågan från analysdagssvaret, inte från senaste svaret
utan hänsyn till vilken fråga det besvarar.

- **Undersök dag 3:** ändringslistan visar startmål och analysfråga var för sig.
- **Behåll dag 2:** bara startmålet är ändrat. Vyn förklarar att önskad start
  är dag 3 men att analysen fortfarande ska undersöka om dag 2 är möjlig.
- Ny rättelse ersätter en obesvarad äldre analysdagsfråga med motiverat
  återtagande. Ett sent val för fel fråga avvisas; tidigare historik bevaras.
- Att välja dag 3 i formuläret och sedan gå tillbaka **utan att spara** gör
  inga sessionsanrop och skapar ingen version. Först sparknappen ändrar underlaget.

En ny granskning ersätter inte behovet av ny kundbekräftelse. Öppna
**Historik och sparade kopior** för att återöppna exakt version eller läsa
en äldre, skrivskyddad kopia. Äldre sparade sessioner skrivs inte om; valet
införs för nya sparade startkorrigeringar. Extra sparning skapar ingen modellversion.

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
Det separata steget **Välj testförutsättningar** gör nu detta för just de
förskrivna lagerfallen. Se [översättning, spårbarhet och faktiskt körresultat](EXECUTION.md).

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
Filuppladdning och filtolkning ingår inte. Deterministisk översättning,
profilvalidering och faktisk CE3-körning ingår endast för lagerexemplets två testplaner. SR, motor och befintliga modeller/resultat är oförändrade. Liveprovet är pausat.

## Verifiering 2026-10-12

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-prototype/controller.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/onboarding-prototype/server.test.py
node --test isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
node --check isolated-tests/structural-ce3-workbench/onboarding-prototype/static/app.js
```

- 39 prototyp-/sessionstester: 14 prototyptester och 25 session/2-regressioner.
- 60 kontrakts-/adaptertester, inklusive SR-kodpinne och frysta fall.
- Ett lokalt HTTP-test för rutter, lagring/återöppning, Origin och sökvägsskydd.
- Fyra nya integrationstester med 12 faktiska motorplaner, plus DOM-kontroller av
  resultattexterna mot körspåren, båda analysdagarna och klarteckenreglerna,
  sent funktionsprov, ogiltiga/inaktuella bekräftelser och historiska resultat.
- 27 befintliga motortester och 14 arbetsvystester, inklusive validering,
  separat audit, sparning, återöppning, partiella körningar och skadade historiker.
- Webbläsare: förberedelse, granskning av testantaganden, faktisk körning,
  ändrade testförutsättningar, återöppning och historiska resultat. Bred vy
  och smal vy (390 px). Testsessioner ligger kvar lokalt; välj **Nytt demofall**.

**Noll externa AI-anrop, noll kostnad, inga installationer eller publiceringar.**
Nästa steg är Christians bedömning av kundspråket och dialogen. Ingen live-AI
kopplas på av denna uppgift.
