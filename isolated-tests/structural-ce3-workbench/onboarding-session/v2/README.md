# CE3 session/2 med inbäddade strukturerade SR-arkiv

Efterföljande separat [budgeterad transport](../../onboarding-transport/README.md) använder denna oförändrade sessionsversion. Den är offlineverifierad genom riktig SR/provider med injicerade HTTP-testsvar; livekommandot är ännu inte kört. Beskrivningen av kommande transport nedan avser session/2:s ursprungliga checkpoint.

Bas: CE3 `9f18f0c247d201e2dba77e3917a4738f5a54bb28`. Modulen inför en separat sessionsversion för [den strukturerade SR-adaptern](../../onboarding-sr/structured/README.md). SR är fortsatt pinnat till `e7308010ecbea1ebe46c3298aa6a96f06381ad0a`, kontrakt `structured-grounded/1`. Befintliga onboarding-v1-kontrakt, session/1-format, receipts och bundles är oförändrade. Ingen motor, UI, modelltransport eller credentialläsning ingår.

**Offlineverifiering med förskrivna, märkta modellsvar genom riktig SR-kod. Testerna verifierar integration och sessionslogik, inte AI:s eller SR:s granskningskvalitet.**

## Körning

Från CE3-repots rot, med befintlig Node/Ajv och den pinnade SR-checkoutens installerade tsx/Zod:

```sh
node isolated-tests/structural-ce3-workbench/onboarding-session/v2/demo.cjs /tmp/ce3-session-2-new.json
node --test isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-session/v2/migrate.cjs /path/to/session-1.json /path/to/new-session-2.json
```

Alla utdatafiler måste vara **nya**. Katalogen måste finnas. Demo kan också köras utan filargument. Inga nya beroenden installeras och inget kommando här anropar en modell.

Demonstrationen använder ett uttryckligen felaktigt första förslag: ”Förhoppningsvis klart dag 2” har blivit ”Godkänt dag 2”. Förskrivna SR-svar flaggar klassificeringen. Kunden förtydligar mål respektive separat godkännandebesked. Kundsvaret gör gammal granskning och bekräftelse inaktuella, men löser inte fyndet. Ett uttryckligen tillfört nytt förslag, ny strukturerad granskning, dokumenterad fyndhantering och ny exakt bekräftelse möjliggör överlämning. En tidig överlämning nekas.

## Format och bindningar

| Ny version | Betydelse |
|---|---|
| `ce3-onboarding-session/2` | Händelsekedja, explicit migrationsursprung och kompletta arkiv, indexerade med arkivdigest |
| `ce3-review-archive/1` | Originalreceipt, producentmetadata, replaykontrollens jämförelsedigester och arkivdigest |
| `ce3-review-producer/1` | Uttryckligt synthetic/live, svarens ursprung, lokal/fjärrproducent, begärd/returnerad modell och köridentitet |
| `ce3-structured-sr-prepared/2` | Version för uttryckligt valt register; samtliga obligatoriska mål/fält från befintlig adapter kvarstår |
| `ce3-structured-sr-receipt/2` | Fullständigt SR-resultat och samma deterministiska CE3-översättning, med ny adapteridentitet `ce3-structured-sr/2` |
| `ce3-session-migration/1` | Ursprung, originalets checksumma och hela orörda session/1-loggen |
| `ce3-onboarding-transfer/2` | Exakt strukturerad granskningsbindning, ny kundbekräftelse och oförändrat onboarding-v1-paket |

De tre JSON-schemana beskriver session, arkiv/producent/bindning och överlämning. Semantiska kontroller i modulerna kompletterar schemana. SR:s egna kontrakt och fältsemantik kopieras inte till CE3.

Händelsen `receive_structured_review` binder arkivets och receiptets digest, proposal-/evidence-digester, exakta source-/draft-ID:n, versioner och texthashar, registerdigest, SR:s fulla commit/pindigest/kontrakt och adapterns identitet. Producentmetadata ingår också. Källsamlingens SR-version är dess CE3-digest; individuella källversioner och spann ligger i snapshoten. Digest för kanonisk JSON och SHA-256 för exakt text hålls åtskilda.

Arkivet innehåller hela receiptet: originalunderlag, modellutkast, register, ursprungliga SR-stegindata, scheman, råsvar, validerade svar, bedömningar, fynd och diagnostik. Fälttäckning och fyndredovisning bevaras separat, liksom CE3-översättningen, fältmappningar och omappade fynd. Synthetic-arkiv innehåller även märkt testtape. Ingen tillfällig fil eller extern receiptfil behövs vid återöppning.

## API

`Session` exporteras av [session.cjs](session.cjs); arkivgränsen finns i [archive.cjs](archive.cjs). Källor, modellförslag, frågor, svar, dispositioner och livscykel har samma explicita inmatningsmetoder som session/1. Hållaren tolkar inte fritext eller skapar modelländringar.

```js
const { Session } = require('./session.cjs');
const Archive = require('./archive.cjs');
const { tapeFor } = require('../../onboarding-sr/structured/test-tape.cjs');
// session innehåller redan manuellt underlag och uttryckligt modellförslag.
const job = session.requestReview('review-1');
const archive = await Archive.recorded(job.prepared, tapeFor(job.prepared));
await session.receiveReview(job.id, archive);
session.save('/tmp/new-session-snapshot.json');
const reopened = Session.load('/tmp/new-session-snapshot.json');
await reopened.auditArchives(); // separat och frivillig replay med sparade svar
```

- `requestReview(id, {srRoot?})` fryser aktuell begäran och registret. `selectRegister(targets, reason, options)` gör registerändring uttrycklig; obligatoriska fält får inte tas bort. SR:s gräns på 80 fält består.
- `Archive.recorded(prepared, tape)` kör riktig SR med förskrivna svar. `receiveReview` gör en separat lokal replaykontroll innan händelsen och arkivet publiceras atomiskt i minnet. Fel lämnar sessionen oförändrad.
- `Archive.fromReceipt(receipt)` kan uttryckligen importera ett befintligt strukturerat receipt/1 efter dess gamla adapterkontroller, utan ändrat originaldigest eller adapteretikett. Det är aldrig en uppgradering av en äldre fristående mockgranskning.
- `confirm` kräver proposal-/evidence-/context-digester och `review_binding` från den visade aktuella versionen, samt person, bekräftelsetext och godkänd omfattning. [demo.cjs](demo.cjs) visar hela anropet.
- `view().statuses`, `current_review`, `effective_dispositions` och `transfers_v2[].current` anger aktuellt läge. Historiska statusvärden och migrerade `transfers` är inte ett aktuellt överlämningsbesked.

## Inaktualitet och överlämning

Valet av aktuell granskning följer **begärans ordning**, inte svarens ankomstordning. Den senaste begäran för aktuell modell, källsamling och registergeneration måste vara besvarad och komplett. Ett sent komplett svar får inte ersätta en nyare partial/failed eller väntande granskning. Alla svar och fynd sparas. Ett sent svar ändrar den visade kontexten och kräver därför ny kundbekräftelse även när den aktuella granskningen är densamma.

Ändrade källor, utkast eller register gör granskning och tillhörande bekräftelse inaktuella. Även ett återvalt identiskt register skapar konservativt en ny generation. Frågor och gamla fynd försvinner inte. `resolved` kräver ändrat förslag, aktuell komplett strukturerad granskning med relevanta bedömda mål och uttrycklig motivering. En senare ändring gör åtgärden omprövningspliktig. Motiverade avvisningar ligger kvar.

Överlämning kräver aktuell komplett granskning och exakt aktuell bekräftelse, inga väntande jobb (även migrerade jobb räknas), full fälttäckning och full fyndredovisning. De befintliga onboardinggrindarna kontrollerar dessutom blockerande fynd, frågor, luckor, okända värden och kundaccepterade begränsningar. Komplett täckning betyder inte korrekt modell. Ett fyndtak ger fortsatt partial trots komplett fälttäckning.

**Omappade relevanta fynd från tidigare granskningar fortsätter också blockera.** Review/1 saknar förlustfri disposition för dessa kontext-/fältfynd. Session/2 erbjuder därför ingen tyst avskrivning av dem när ett nytt utkast granskas; en senare versionsmärkt hantering behövs för att lösa sådana historiska blockerare.

Överlämningen har status `ready_for_separate_compilation_and_validation`; `ce3_validation_status` och `ce3_run_status` är `not_run`. Den har inte kompilerats, profilvaliderats eller körts. Begränsningar, antaganden, omfattning och källor följer med i det exakta paketet.

## Integritet, replay och lokal lagring

`Session.load/restore` kontrollerar schema, checksummor, källpresentation, versionsbindningar, inbäddade arkiv och varje händelses tillståndshash. Saknade eller oanvända arkiv avvisas. Den spelar endast om **CE3:s lokala sessionshändelser**. Den laddar inte SR-checkouten, behöver inga tillfälliga filer och anropar ingen modell. Automatiska tester bryter medvetet SR-laddaren och replayfunktionen under återöppning för att kontrollera denna gräns.

`auditArchives` är en uttrycklig, separat kontroll: exakt SR-commit och 49 pinnade filer verifieras, sedan körs riktig SR med redan sparade svar. Nya resultat jämförs med originalet och CE3-översättningen räknas om med den gemensamma adapterkoden. Denna replay är inte ny AI-granskning. Sparade slump-ID:n/tider bevaras men undantas vid jämförelse med den nya replayens ID:n/tider. För liveursprung undantas även den privata nyckelns runFingerprint från replayjämförelsen; dess originalvärde ligger kvar under checksumman.

Checksummor och replay visar integritet och intern konsekvens, **inte autentiskt ursprung eller kryptografiskt signerad historik**. En aktör som skriver om all historik och alla digester omfattas inte av skyddet. Arkivets verification-fält är en dokumenterad lokal kontroll, inget externt intyg.

`save` skapar en exklusiv ny fil med behörighet 0600 och fsync. Varje sparning är en ny, fristående snapshot; ingen befintlig session ersätts. Det finns ingen databas, låsforcering eller distribuerad samtidighet. Ett avbrott kan lämna en ofullständig ny fil; läsningen avvisar den och föregående snapshot finns kvar. Data lagras okrypterat lokalt och sparning måste begäras uttryckligen.

## Uttrycklig migration från session/1

`Session.migrate(log, sourceLabel)` och `Session.migrateFile(source, newDestination)` validerar session/1 med dess befintliga kod och bevarar hela originalloggen inklusive alla händelser, identiteter, hashkedjor, frågor, svar, granskningar, dispositioner och gamla bekräftelser. `origin` anger migrationsversion, ursprungsformat, källetikett och checksumma. Nya session/2-händelser har en egen kedja och härledda tillståndshashar. Ingen implicit migration sker vid `load`.

En gammal mockgranskning blir **inte** en strukturerad SR-granskning. Gamla bekräftelser och överlämningar är historik och uppfyller aldrig den nya grinden. Ett aktuellt strukturerat receipt och ny versionsbunden kundbekräftelse krävs. Oavslutade legacyjobb bevaras och blockerar fortfarande. Denna version har ingen händelse för att besvara ett sådant gammalt mockjobb: slutför det uttryckligen i session/1 och migrera en ny snapshot, eller inför senare en granskad versionsmärkt hantering. Ursprungssessionen skrivs aldrig över, inte heller om käll- och målsökvägen är samma.

## Producentläge och återstående livearbete

Offlinekörningar heter `synthetic`/`scripted_responses`, med SR:s faktiska mockidentitet, `model: null` i CE3-resultatet och tydlig testtape. Det nya `Archive.importLive(prepared, originalResult, producerMetadata)` tar endast emot **redan framtaget** resultat; ingen livetransport finns. Live kräver konsekventa modell-/körmetadata, returnerad modell och användningsmetadata per svarssteg, SR mode=live, CE3 mode=live och ingen testtape. En liveetikett ändras aldrig till mock för att passera gamla grindar. Session/1 behåller sin mockspärr.

Producenten kan vara `local` eller `remote`; inget leverantörsnamn är hårdkodat för live. En lokal LLM kan därför använda samma framtida kontraktsgräns. Saknade eller inkonsekventa metadata avvisas. Avbrutna körningar utan SR-slutmetadata får en deterministisk arkividentitet från stegen; detta är inte ett leverantörsutfärdat kör-ID. Liveimport kräver reproducerbar sparad stegtrace; avbrott som inte kan återspelas likvärdigt nekas och behöver ett senare uttryckligt avbrottsformat.

Tester för liveformatet använder **helt fabricerade, märkta metadatafixturer**, inte livegranskningar. De bevisar bara formatkontroll och att live inte märks om. Den förskrivna demonstrationen är synthetic hela vägen. Metadata kan inte ensamt styrka att en viss modell verkligen körts.

Minsta nästa steg inför ett kostnadsbegränsat liveprov är en separat transport med uttrycklig budget, reservation för varje steg och samtliga interna reparationsförsök, token-/anropsgränser och bevarande av faktiska modellidentiteter, användning, fel och avbrott. SR:s nuvarande providergräns visar inte alla råa HTTP-försök; session/2 löser inte den kostnads-/proveniensgränsen. Därefter kan oförändrade syntetiska c3-r1 och kontrollfallet användas med facit separat från indata. **Driftsatt beta, livekvalitet och ett färdigt live-onboardingflöde är fortfarande inte verifierade.**
