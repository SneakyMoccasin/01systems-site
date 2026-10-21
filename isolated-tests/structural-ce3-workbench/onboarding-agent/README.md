# CE3 · lokal onboardingagent, etapp 1

En separat dialog ovanpå oförändrad Session/2. Skriv svenska, komplettera med
svar eller inklistrade dokumentpassager, rätta uppgifter, återöppna historik
och exportera sammanställning och `ce3-onboarding-proposal/1` med källor.
Inget här kompilerar, kör CE3, begär SR-granskning eller bekräftar en modell.

En färdig OpenAI-adapter finns nu för ett uttryckligt, budgetbegränsat liveprov.
Se **[LIVE-PROBE.md](LIVE-PROBE.md)** för exakt API-konfigurering, treanropsbudget
på 1,062 USD, prisgiltighet och skillnaden mellan offlineprov och verkliga körningar.

## Starta lokalt

```sh
node /Users/christian/Projects/pulse_engine_ce3_onboarding/isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs
```

Öppna **http://127.0.0.1:8877**. Node 25.1.0 användes i verifieringen.
`start.cjs` läser befintligt Ajv från denna checkout eller Git-repots
huvudarbetsmapp. Den installerar ingenting och skriver inget där. Vid annan
beroendeplacering: ange `CE3_DEPENDENCY_ROOT` till checkouten som redan har
`node_modules/ajv`. Linkedom behövs bara för tester. SR-checkouten behövs inte
för vanlig användning; endast SR-regressionstestet laddar dess pinnade kod.

Använd `--port 0` för en ledig port, eller `--data /absolut/egen/katalog`
för separat lagring. Standard är workbenchens git-ignorerade
`local-data/onboarding-agent/`. Stoppa med Ctrl-C. Kör en server per datakatalog.
En exklusiv `.server-lock` skyddar mot två processer; efter ett hårt avbrott
måste man kontrollera att den gamla servern är avslutad innan låsfilen tas bort.
Ingen automatiserad låsforcering eller omsändning sker.

Standardläget är **regelbaserad offlinehjälp, ingen språkmodell**. Det arbetar
med din faktiska text, inte ett förskrivet lagerfall. Rubrikerna `Mål:`,
`Startläge:`, `Beslut:`, `Beroende:`, `Besked:` och `Tid:` samt ett påstående per
rad ger säkrare sortering. Utan rubriker används snäva svenska ordmönster;
svårtolkad text bevaras och ger frågor. Tider hålls som citerad text, inte
påhittade motorvärden. Beroenden beskrivs men kompileras inte till förvillkor.

Knappen för syntetiskt exempel fyller endast i **indata**. Svaren beräknas av
samma regler som för annan text. `RecordedProvider` används enbart för tydligt
märkta förskrivna testresultat. En faktisk språkmodells kvalitet är inte
utvärderad i denna leverans.

## Modellgräns

`protocol.cjs` skapar `ce3-onboarding-model-request/1`, med exakt Session/2-
checksumma, alla källversioner och citat, föregående utkast, frågor/svar,
versionsbundet kapabilitetsunderlag, instruktion och JSON-schema.
`generate(request)` returnerar `{response, metadata}`; svaret följer
`ce3-onboarding-model-response/1`. Producentidentitet och requestdigest
kontrolleras. Agenten äger källpaket, utkast-ID, revisionskedja och påverkan på
tidigare fynd; modellen får inte skriva dessa delar eller skapa en bekräftelse.

Fyra utbytbara adaptrar finns:

- `OpenAIProvider`: Responses API med strikt schema, fasta engångsplatser i
  befintlig SQLite-budgetjournal och inget automatiskt omförsök. Kräver uttrycklig
  aktivering; se [LIVE-PROBE.md](LIVE-PROBE.md).
- `OfflineProvider`: deterministiska svenska regler, `model_calls: 0`.
- `RecordedProvider`: explicit `scripted_test`; endast för integrationstester.
- `LocalCommandProvider`: ett uttryckligen valt lokalt modellprogram. Det får
  request-JSON på stdin och måste skriva response-JSON på stdout. Ingen shell
  används; endast PATH ärvs. Max 45 sekunder, 1 MiB svar, ingen retry eller
  automatisk formatreparation. Programidentiteten hashbinds. Modellnamnet är
  operatörens deklaration, inget signerat bevis på vilken modell som körts.

Exempel för ett eget, redan installerat modellprogram (platshållare):

```text
node .../onboarding-agent/start.cjs --model-command /absolut/lokal-modell-wrapper --model-id exakt-modellversion --model-args '[]'
```

Programmet behöver självt anropa den lokala modellen och hantera schemaformatet.
Detta lokala programgränssnitt är inte en färdig Ollama-adapter; OpenAI har en separat adapter. Inget
modellpaket laddas ned. Välj endast ett betrott lokalt program: gränsen är ingen
OS-sandbox som hindrar programmet från egen fil-/nätverksåtkomst. Standardläget aktiverar ingen betald
modelladapter eller credentialläsning.

Alla försök får nya kataloger med `request.json`, mottaget `response.json` och
`outcome.json`. Misslyckade svar arkiveras men publiceras aldrig som utkast.
Saknat slutbesked visas som avbrott. Källan/svaret sparas före modellförsöket,
så tidigare granskning och bekräftelse blir inaktuella även vid modellfel.
Ett nytt försök kräver en uttrycklig handling. Återöppning gör inga modellanrop.

## Kapabiliteter och versionsgränser

`capabilities.json` fryser bas **2dbb0fb19193fee8ffeee3612dd045e33762a750**, kopia av
`fixed-replay/0.1`, relevanta filhashar och den committade explorerns separata
begränsningar. Serverstart och varje nytt utkast kontrollerar drift. Varje
session och modellförsök binds till dokumentets digest. Vanliga onboarding-
commits är tillåtna utan att motorbasen ändras.

`engine-information.json` registrerar senare observerade motorleveranser som
**adopted: false**. Den filen är information och förs inte in som nya
kapabiliteter i modellrequesten. Uppdatering av motorbas kräver en ny uttrycklig
kapabilitetsversion och testad kompatibilitet, inte omtolkning av gamla sessioner.

## Begränsningar

- Schemat och citatkontrollerna verifierar form, identitet och exakta textspann,
  inte sanningshalt, fullständighet eller semantisk källtrohet.
- Offlinehjälpen sorterar meningar, inte allmänna svenska resonemang. Den
  upptäcker bara snäva motsägelser (samma formulering med olika tal/negation).
  Komplexa villkor, flera betydelser i samma mening och språklig negation
  behöver mänsklig eller senare modellbaserad granskning. Ordmönstret för
  resurslogik är konservativt och kan ge extra frågor.
- Högst tre öppna frågor visas i taget. Uppskjutna frågor och äldre blockerare
  bevaras. Att återta en fråga med motivering löser inte dess modellucka.
- Ingen generell kompilering, operativ beroendegraf, sökning, ekonomi,
  resursplanering eller automatisk analys av ett färdigt utkast.
- Inklistrade passager blir manuella källor i Session/2. Ingen filuppladdning,
  OCR, kontroll av originalfilhash eller automatisk sidmappning finns.
- Lokal okrypterad lagring; checksummor är integritetskontroller, inte signaturer
  eller kundautentisering. Ingen fleranvändardrift.
- Max 20 000 tecken per inmatning, 120 000 serialiserade källbytes i request,
  100 utkast-items (inklusive historiska), 100 modellrapporterade luckor och
  20 föreslagna frågor per protokollsvar (OpenAI-adaptern begränsar till 3). Överskridande avvisas; inget trunkeras tyst.
  SR:s separata 80-fältsgräns kan blockera större framtida granskningar.

## Tester

```sh
node /Users/christian/Projects/pulse_engine_ce3_onboarding/isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs --test
```

Testerna använder temporära datakataloger och en tillfällig loopback-port.
De gör inga betalda anrop. SR-regressionen kör riktig SR med förskrivna svar;
processadaptertestet använder en märkt programstub, ingen språkmodell.
Se [LIVE-PROBE.md](LIVE-PROBE.md) för aktuell verifiering och liveprov.
`REPORT.md` beskriver den tidigare offlineleveransen.
