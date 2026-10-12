# Kunddialog · isolerad offlineprototyp

Förbättrad från faktisk HEAD `bd76ef6631ebb5eb0d54494c2bb38f238301715c`.
Öppna **http://127.0.0.1:8876/onboarding** i den lokala arbetsvyn.
Länken ”Prova onboarding · offline” finns även i arbetsvyns sidhuvud.

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8876
```

Använder redan installerad Python, Node, Ajv och pinnad SR:s tsx/Zod.
Servern binder bara till 127.0.0.1. Kör en arbetsvyprocess per datakatalog.

## Prova kundflödet

**Beskriv → Kontrollera → Komplettera vid behov → Bekräfta.**
En aktuell uppgift visas åt gången. Introduktionen förklarar syftet före
start; under pågående flöde blir sidhuvudet kompakt. Allt är syntetiskt och
förskrivet. Egen fritext sparas men tolkas inte automatiskt.

- **Tydligt underlag:** visa sammanfattningen, kontrollera den och gå direkt
  till bekräftelse. Inga kompletteringsfrågor behövs.
- **Rätta en feltolkning:** originalet säger ”Förhoppningsvis klart dag 2”.
  Det första förslaget gör fel när det anger ”Godkänt dag 2”. Den förskrivna
  SR-granskningen pekar ut felet. **Visa rättat förslag** tillför uttryckligen
  version 2 och en ny granskning, utan kundfråga eller ändrat originalunderlag.
  SR skriver inte om modellen. Äldre fynd och deras uttryckliga hantering bevaras.
- **En uppgift saknas:** separat syntetiskt underlag lämnar öppet vem som ska
  ge godkännandet. Frågan förklarar varför rollen behövs. Välj driftledaren,
  beställaren eller **Vet inte ännu**. Det sista svaret lämnar modellfältet
  `unknown` med `null` som värde; frågan skjuts upp och bekräftelse förblir
  blockerad även efter ny fullständig förskriven granskning. Ett senare
  uttryckligt svar kan föras in i ett nytt förslag och granskas.
- Efter bekräftelse: välj **Rätta en uppgift**, exempelvis dag 3 i de två
  tidsmålsfallen. Tidigare granskning och bekräftelse blir inaktuella. Svaret
  sparas först; ett separat nytt förslag och en ny granskning följer. Den gamla
  bekräftelsen uppfyller inte grinden för den nya versionen.
- Öppna **Historik och sparade kopior**. Återöppna en kopia eller ladda om
  sidan. Äldre kopior är tydligt historiska och skrivskyddade. Förslagsversion
  och sparad kopia är olika begrepp. En extra kopia skapar ingen modellversion.

Bekräftelsen gäller sammanfattningen och valda antaganden inför analysen,
inte ett verksamhetsbeslut, SR:s kvalitet eller en resultatgaranti. Analysfråga,
omfattning och okända kostnader/godkännandetider visas vid bekräftelsen.
Sluttexten anger att underlaget är bekräftat och sparat och att ingen analys
har körts. Kostnad och faktisk tid ligger utanför dessa falls analysomfattning.

## Presentation och bevarad sessionslogik

`scenario.cjs` behåller det ursprungliga `unclear`-fallet och dess äldre
svarsväg för regression och redan sparade sessioner. Det erbjuds inte för
nya kunddemonstrationer. `misread` återanvänder samma originaltext men rättar
systemfelet utan att lägga ansvaret på kunden. `clear` är oförändrat.
Det nya `gap`-fallet är separat. De frysta c3-r1-/clear-filerna och deras
resultat i SR-utvärderingen är orörda.

Sammanfattning och ändringslista använder samma namngivna sakfält och jämför
senaste och föregående förslaget. Tidpunkten i första utkastet är därför
”Godkänt dag 2”, inte ”Saknades”. Ändrade källreferenser utan ändrad saktext
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

- 33 prototyp-/sessionstester: åtta prototyptester och 25 session/2-regressioner.
- 60 kontrakts-/adaptertester, inklusive SR-kodpinne och frysta fall.
- Ett lokalt HTTP-test för rutter, lagring/återöppning, Origin och sökvägsskydd.
- Webbläsare: tydligt fall utan frågor; systemfeltolkning och rättelse;
  verklig lucka med okänt och känt svar; korrekt ändringslista; rättelse efter
  bekräftelse; omladdning, sparning och historisk skrivskyddad version.
  Bekräftelse med Tab, mellanslag och Enter. Bred och smal vy (390 px), utan
  horisontell overflow. Testsessioner ligger kvar lokalt; välj **Nytt demofall**.

**Noll externa AI-anrop, noll kostnad, inga installationer eller publiceringar.**
Nästa steg är Christians bedömning av kundspråket och dialogen. Ingen live-AI
kopplas på av denna uppgift.
