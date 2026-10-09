# Tunn adapter till faktisk lokal Skeptical Reader

CE3 laddar och kör SR:s befintliga `runGroundedReview` och dess tre steg, prompts, Zod-scheman, citatkontroller och slutbedömning. Testerna ersätter **modellleverantören** med förskrivna JSON-svar. Det är offlineverifiering av riktig pipelinekod, inte ett liveprov eller kvalitetsbevis.

[Pipelinekartläggning](PIPELINE.md) skiljer förvalt fyrastegs-textläge från valbart trestegs-groundedläge. Lokal SR-commit är `10d2482186e0d116506f215bdbdbd70f009ab18b`; den driftsatta betans version är **inte verifierad**. Tidigare `d795534` körde endast en ny enanropsprompt med SR-principer och utvärderade inte dessa riktiga pipelines.

## Kör offline

Använder befintlig Node/Ajv i CE3 och `tsx`/Zod i det lokala SR-repots `node_modules`. Inga beroenden installeras, ingen server startas och ingen credential läses. Standardplatsen är `/Users/christian/Projects/skeptical-reader`; kärnfunktionerna tar också `srRoot` för en identisk lokal checkout. Kodhasharna måste stämma med [sr-code-pin.json](sr-code-pin.json).

Från CE3-repots rot:

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-sr/adapter.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/verify.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/demo.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/demo.cjs /tmp/ce3-sr-session-new.json
node isolated-tests/structural-ce3-workbench/onboarding-sr/diagnostic.cjs prepare /tmp/ce3-sr-prepared-new
node isolated-tests/structural-ce3-workbench/onboarding-sr/diagnostic.cjs offline /tmp/ce3-sr-offline-new
```

Välj nya utdatafiler/kataloger; gamla resultat skrivs inte över. Det finns **inget livekommando**. Sparade [offline-records](offline-records/) kommer från riktig SR-kod med testdubbel, aldrig från extern AI. Testsviten stoppar varje försök att använda global `fetch`. Se [DIAGNOSTIC.md](DIAGNOSTIC.md) för det förberedda senare liveprovet och dess budgetgrind.

## Dataöverföring och status

`prepare(request)` binder exakt proposal/1-snapshot, model-digest, underlagsdigest och källversioner. Originalinnehåll läggs i `sourceMaterial` med separata källspann; hela modelluppgifter serialiseras förlustfritt till `reviewText`, tillsammans med analys, scope, gaps och versionsidentitet. En generell fråga förklarar fältens betydelse, utan facit. Källor ändras inte till påståenden i utkastet eller tvärtom. Bara fullständigt extraherat underlag accepteras här; dokumentinläsning ingår inte.

`runRecorded` anropar SR:s riktiga pipeline med en JSON-testtape. Varje steg loggar SR:s faktiska instruktioner, indata, schema och förskrivna svar före/efter Zod-validering. `translate` bevarar originalresultat och trace separat från CE3-fynd. Exakta UTF-16-positioner ger en koppling endast när citatet ryms i en entydig uppgiftsenhet respektive originalkälla. Ingen textlikhet, gissad identitet eller språklig tolkning används för koppling. Tvetydiga fynd och fynd om analys/omfattning bevaras separat och stoppar fullständighetsstatus.

Översättningen är konservativ: contradicted → contradiction/evidence; unsupported → unsupported/absence_in_supplied_material; partially_supported och cannot_determine → hypothesis/review_hypothesis. Detta betyder inte att alla hypoteser är fel. Alla översatta invändningar blockerar överlämning tills en dokumenterad hantering finns. SR:s originalutfall, confidence och recommendedAction ligger kvar i receipt. `recommendedAction` görs inte automatiskt om till en kundfråga; `customerQuestion` kräver uttrycklig frågetext och en entydigt översatt fyndreferens.

**Nuvarande SR saknar uttrycklig CE3-fälttäckning.** Adaptern returnerar därför alltid `partial` eller `failed`, aldrig `complete`. `coverage.links` visar faktiskt bedömda citat och kopplingar; `fully_quoted_units` betyder enbart full citatomfattning. `assessed_item_ids` fylls inte med antagna kompletta uppgiftsbedömningar. Tom fyndlista eller bekräftad kundversion upphäver inte detta.

Det diagnostiska c3-r1-utkastet har dessutom ett historiskt kontraktsfel. Det får ändå presenteras som oförändrat diagnostiskt granskningsobjekt, med `prepared.contract.valid=false`; ingen giltig kundsession eller överlämning skapas av detta. Historiska fynd-ID:n i en versionerad sessionsbegäran kan bara kontrolleras av sessionshistoriken, vilket anges som `history_check=deferred_to_session` när den saknas i den fristående begäran.

## Kundflödet och lokal historik

Avsett flöde är: kundens underlag → AI-utkast → riktig SR-granskning → kopplade kompletteringsfrågor → kundsvar → uttryckligt uppdaterat AI-utkast → ny riktig SR-granskning → kundbekräftelse av exakt version → separat CE3-validering/körning. Ingen UI, uppladdning, AI-författare eller CE-körning byggs här.

Demonstrationen använder den befintliga sessionshållaren och uttryckligt skrivna syntetiska förslag. Den kör två gånger genom riktig SR-kod med testtape. Kundsvaret gör den gamla granskningen och bekräftelsen inaktuella. Ett besvarat frågeformulär löser inte fyndet. Gamla fynd följer med; efter det nya förslaget och andra granskningen registreras aktuell kundbekräftelse. **Överlämningen nekas fortsatt**, eftersom granskningen är partiell. Detta är ett verifierat stopp, inte ett misslyckat försök som göms bakom en mockad complete-status.

`bundle.cjs` sparar sessionens oförändrade eventlogg tillsammans med SR-receipts. Vid återöppning kontrolleras sessionens historikkedja, originalresultat, översättning, granskningsbegäran och modell-/underlagsdigest. Saknat originalkvitto eller ändrad översättning avvisas. Bundle är versionsmärkt `ce3-sr-session-bundle/1`; session/1 och onboardingkontrakten är oförändrade. Checksummor upptäcker ändringar men är inte kryptografiska avsändarsignaturer. Lagringen är för lokal offlineverifiering, utan distribuerad samtidighet eller tjänsteautentisering; en avbruten skrivning avvisas vid läsning.

[Återstående beroenden](DEPENDENCIES.md): uttrycklig SR-fälttäckning, en versionsmärkt och receipt-bunden väg för livebesked i CE3-sessionen, budgeterad transport samt verifiering av driftsatt version. Sessionshållarens tidigare spärr mot livebesked är kvar. Inget i detta pass hävdar att hela produktflödet är liveklart.
