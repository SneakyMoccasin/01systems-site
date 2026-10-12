# Kunddialog · isolerad offlineprototyp

Bas: CE3-checkpoint `13bc35a317433e19eec28c935f4371e67e9adbcb`.
Öppna **http://127.0.0.1:8876/onboarding** i den lokala arbetsvyn.
Länken ”Prova onboarding · offline” finns också i arbetsvyns sidhuvud.

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8876
```

Använder befintlig Python, Node, Ajv samt den pinnade SR-checkoutens redan
installerade tsx/Zod. Ingen installation behövs. Servern binder bara till
127.0.0.1. Kör en arbetsvyprocess per datakatalog, som tidigare.

## Prova detta

1. **En viktig oklarhet:** behåll demotexten och visa förslaget. Ett tidsmål
   har avsiktligt blivit ”Godkänt dag 2”. Visa den förskrivna granskningen;
   frågan blockerar godkännande och förklarar varför beskedet behövs.
2. Välj **Dag 2 är ett mål**, läs svaret och spara kompletteringen. Den gamla
   granskningen blir inaktuell; fyndet finns kvar. Visa sedan uppdaterat
   förslag, läs ändringarna och visa den nya förskrivna granskningen.
3. Läs omfattning och begränsningar, ange ett demonamn och bekräfta exakt
   version. Bekräftelsen avser även aktuellt underlag och granskningsarkiv.
4. Öppna **Ändra uppgifter efter bekräftelse**, välj dag 3 och spara. Både
   granskning och tidigare bekräftelse blir inaktuella. Nytt förslag och ny
   granskning behövs; en äldre bekräftelse återanvänds inte.
5. Prova **Tydligt underlag**. Här ger den förskrivna granskningen inga fynd
   eller onödiga frågor. Bekräftelse är möjlig efter granskningen.
6. **Återöppna denna kopia**, ladda om sidan eller öppna ett äldre sparat
   steg. Äldre kopior visar sitt dåvarande läge och är skrivskyddade.

Egen text kan sparas både som underlag och komplettering. Den **tolkas inte**
och får inget automatiskt förslag. Endast exakt angivna demonstrationsdata
och de två uttryckliga demosvaren har förskrivna följdförslag. Ett eget svar
kan ersättas med ett demosvar; tidigare svar finns kvar i sessionens historik.
Ingen sannolik tolkning eller kundfakta fylls i för att klara grinden.

## Avgränsning och sessionsregler

Det syntetiska funktionsprovet använder `fixed-replay/0.1` och kontrollerar
en plans deklarerade villkor för driftstart. Tidsmålet är inget garanterat
utfall. Kostnad och faktisk godkännandetid är **okända och utanför analysens
omfattning**, inte noll eller påhittade modellvärden. Prototypen visar dem som
begränsningar som kunden måste acceptera. Den demonstrerar inte överlämning
med olösta okända modellfält; sessionens befintliga grind för sådana består.

Modellförslag, frågor, SR-svar och fyndhantering är **förskrivna testdata**.
`scenario.cjs` tillför uttryckliga förslag. `Archive.recorded` och befintlig
`tapeFor` kör SR:s riktiga tre steg med märkta svar; session/2 kontrollerar
och bäddar in hela granskningsarkivet. Detta bevisar inte upptäcktsförmåga,
AI-kvalitet eller korrekt källbedömning. De frysta c3-r1-/clear-filerna och
deras resultat används inte som ändringsbara kundfall och är orörda.

`controller.cjs` är en kommando- och presentationsadapter till **oförändrad
session/2**, inte en ny sessionshållare. Versions- och blockeringslogik
kopieras inte. Eftersom session/2 kan registrera en bekräftelse innan dess
överlämningsgrind är uppfylld prövar prototypen `confirm + createHandoff` på
en tillfällig återställd sessionskopia för att avgöra om knappen får användas.
Provet ändrar inte den riktiga historiken. Ett faktiskt godkännande gör
samma kontroll och sparar bekräftelse och överlämningsunderlag atomiskt som
en ny snapshot. UI:t kallar detta **redo för separat kompilering och
validering**. Ingen kompilering, profilvalidering eller CE3-körning utförs.

`onboarding.py` startar en lokal Node-process med enbart PATH i miljön,
utan API-credentials, och serialiserar kommandon. Node-processen blockerar
fetch och utgående HTTP/HTTPS-/net-anrop. Ingen livetransport importeras.
Den befintliga serverns loopback-, Host-, Origin- och CSP-skydd återanvänds.
SR, motor, befintliga modeller och resultat ändras inte. Liveprovet är pausat.

## Lagring

Alla slutförda steg sparas via `Session.save` till nya, exklusiva session/2-filer:

`local-data/onboarding/<sessions-id>/000001.json`, `000002.json`, …

Det är fristående snapshots med full historik och inbäddade arkiv, inte
referenser till tillfälliga granskningsfiler. Befintliga filer ersätts inte.
`--data` för arbetsvyn flyttar även denna lagring. Katalogen är git-ignorerad.
Återöppning använder `Session.load` och dess integritetskontroller, utan
modell eller ny SR-granskning. Saknade/skadade arkiv avvisas. En skadad ny
snapshot ersätter inte äldre filer och blir inte automatiskt en godkänd kopia.

Varje ändringskommando måste matcha senaste snapshotnamn och sessionens
checksumma. En annan flik eller en äldre kopia kan därför inte skriva över
en senare version. Webbläsaren minns bara vilken session/kopia som visades.
Oskickad formulärtext sparas inte; **Spara komplettering** krävs för svar.
Historiska kopior kan läsas men inte redigeras i denna prototyp.

Tekniska identiteter, digester, full JSON och granskningsarkiv ligger under
en separat utfällning. Ingen filuppladdning eller filtolkning finns. Inga
externa resurser, typsnitt eller skript laddas av den nya sidan.

## Verifierat 2026-10-12

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-prototype/controller.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/onboarding-prototype/server.test.py
node --check isolated-tests/structural-ce3-workbench/onboarding-prototype/static/app.js
```

- 29 tester: prototypens fyra flödes-/lagringstester och 25 session/2-regressioner.
- 60 kontrakts-/adaptertester, inklusive oförändrade frysta fall och SR-kodpinne.
- Ett lokalt HTTP-test: nya och befintliga läsrutter, lagring/återöppning,
  nekad annan Origin och nekad sökvägsmanipulation. Ingen motor körs av testet.
- Webbläsare: oklarhetsflödet till bekräftelse av version 2, rättelse efter
  bekräftelse, kontrollfallet utan frågor, återöppning efter omladdning och
  skrivskyddad historik. Visuell kontroll på bred vy (1280 px) och mobil
  (390 px), utan horisontell overflow. Browserns test-sessioner finns kvar i
  lokal lagring; välj **Nytt demofall** för ett eget prov.

**Noll externa AI-anrop, noll API-kostnad, inga installationer eller publiceringar.**
Nästa steg är Christians bedömning av språk, frågornas begriplighet och vad
bekräftelsen betyder. Live-AI kopplas inte på av denna prototyp.
