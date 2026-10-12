# Budgeterad transport till riktig SR och CE3 session/2

Isolerad transport från CE3-checkpoint `2cab759197e46af7007006c66b8a5446adada518`, med SR `e7308010ecbea1ebe46c3298aa6a96f06381ad0a` och `structured-grounded/1`. **Verifierad endast offline med injicerade HTTP-testsvar. Noll externa AI-anrop och noll faktisk kostnad. Livekommandot är förberett men inte kört.**

SR:s riktiga `runStructuredGroundedReview`, grounded-pipeline och `OpenAIProvider` används oförändrade. En separat workerprocess ersätter processens `fetch` med en budgeterad HTTP-gräns. Den får både ursprungliga anrop och providerns interna formatreparationer. Ingen SR-prompt eller granskningspipeline kopieras till CE3. SR:s exakta commit och 49 filhashar verifieras före laddning.

Återkontroll 2026-10-12: transportgränsen sätter nu uttryckligen
`service_tier: "default"` i varje utgående modellanrop, inklusive alla
formatreparationer. Det är API-värdet för Standard enligt
[Responses API](https://developers.openai.com/api/reference/python/resources/responses/methods/create).
Fältet läggs till före räkning och journalföring; räkningsbehörigheten och
journalen binds till exakt dessa utgående bytes. Modellindatan är oförändrad.
Historiska arkiv utan tjänstenivå kan fortfarande läsas. SR-repot ändras inte.
Den [befintliga beredningen](prepared-standard-2026-10-09/README.md) är
uppdaterad, men live förblir blockerad: ett officiellt avgiftstak för
tokenräkning kunde fortfarande inte beläggas.

## Kontrollerad inputram (transport-plan/2)

Livevägen kräver nu `--input-token-limit`, `--count-price` och
`--count-price-digest`. Det tidigare kommandot med 132 USD saknar dessa
argument och kan inte köras. `ce3-price-profile/1` behåller modellens fulla
kontextgräns; provets separata `ce3-input-policy/1` anger ett lägre, hårt tak.
Sessionsformat och onboardingkontrakt ändras inte. Äldre offlinekörningar
med `ce3-transport-plan/1` kan fortfarande läsas och regressionstestas.

Före varje **modell-anrop**, även senare steg och formatreparationer, skickas
exakt `model`, `instructions`, `input` och `text` till OpenAI:s
`POST /v1/responses/input_tokens`. Därmed ingår prompts, originalunderlag,
utkast, register, fullständigt JSON-schema, tidigare stegresultat och
reparationens ogiltiga svar. Den pinnade providern har inga andra
modellinputfält; okända fält avvisas. `store`, `max_output_tokens` och CE3:s
`service_tier` är körinställningar och skickas inte till räkningsendpointen.

OpenAI dokumenterar att denna räknare omfattar även dold meddelandeinramning.
Lokal strängtokenisering eller byteantal har ingen verifierad motsvarande
övre gräns för denna modell och detta schemaformat. Byteantal sparas endast
som diagnostik, **aldrig som garanterat antal debiterbara token**.
Källa kontrollerad 2026-10-09:
[Counting tokens](https://developers.openai.com/api/docs/guides/token-counting),
[API-kontrakt](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count).

Svaret binds till exakt modell, rå modellrequest-hash och räkningspayloadens
digest. Ett giltigt räkningsresultat inom ramen krävs också av journalens
`dispatch`. För stort värde ger `INPUT_LIMIT_EXCEEDED`; fel, timeout, saknat
eller ogiltigt räkningsvärde ger `INPUT_COUNT_UNAVAILABLE`. Körningen stoppas,
ingenting trunkeras och inget modell-anrop skickas för det nekade försöket.
Tidigare requests, responses, usage och ursprungliga SR-stegresultat bevaras.
Transportstatus blir `not_completed`; resultatet kan inte ersätta en aktuell
sessionsgranskning eller undanröja blockerare. SR:s ursprungliga status skrivs
inte om till en påhittad complete-status.

Räkningsanrop har ingen automatisk retry och delar SR-försökets befintliga
AbortSignal/deadline med modell-anropet. Högst sex räkningsanrop och sex
modell-anrop per fall, alltså **24 HTTP-anrop för båda fallen**, varav högst
12 kan generera modellsvar. Ingen ytterligare granskningsprompt införs.

## Faktisk anropsomfattning

Inventeringen bygger på pinnad `src/lib/grounded/structured-v1/run.ts`, `grounded/run.ts`, `providers/openai.ts` och `pipeline/execution.ts`:

| SR-steg | Första outputtak | En möjlig reparation | Högst HTTP-anrop |
|---|---:|---:|---:|
| grounded_claim_extraction | 8 000 | 8 000 | 2 |
| grounded_support_assessment | 20 000 | 20 000 | 2 |
| grounded_adjudication | 5 000 | 5 000 | 2 |
| En granskning totalt | 33 000 | 33 000 | **6** |

SR reparerar endast vissa strukturellt reparerbara JSON-/schemafel och bevarar ID-inventeringen. API-fel, timeout eller ett andra schemafel ger ingen tredje chans. Providern använder direkt fetch, inget SDK och ingen HTTP-retryloop. Den nya nätverksfunktionen använder en enda `node:https.request`, ny anslutning (`agent: false`), ingen redirectföljning, proxy eller automatisk retry. Inga modellbyten görs. Transportgränsen nekar ett tredje försök eller avvikande modell/outputtak även om ett sådant skulle begäras.

SR:s deadline är 120 s för pipelinen och högst 90 s per providerförsök, begränsat av återstående pipelinefrist. Föräldern har en yttre 135 s processgräns. Det är stoppgränser, inte prognoser för faktisk tidsåtgång.

## Prisprofil och konservativ kostnadsgräns

`ce3-price-profile/1` har exakt modellidentitet, valuta USD, inputtak, heltalspriser i **nano-USD per token**, officiell pris- och modellkälla, datum och verifieringsuppgift. `1 USD = 1 000 000 000 nano-USD`; `1 USD per miljon token = 1 000 nano-USD per token`. Heltalsräkning undviker avrundning nedåt. Endast USD stöds; ingen valutakonvertering görs.

I plan/2 reserveras input till provets **kontrollerade tokentak per modell-anrop**, inklusive inramning. Alla senare och reparerade requests räknas när de faktiskt finns. Output reserveras till SR:s oförändrade tak ovan. Äldre plan/1 reserverar fortfarande modellens hela inputgräns. Profilens priser måste vara en övre gräns för samtliga tillämpliga input-/outputpriser och kontext-/service-/cachepristier för den valda modellen. Cached input räknas till samma konservativa inputpris; inga rabatter antas.

För inputgräns `I`, inputpris `Pi` och outputpris `Po` blir maximal reservation för en granskning:

`6 × I × Pi + 66 000 × Po + 6 × F` nano-USD, där `F` är en separat verifierad maximal avgift per räkningsanrop.

`max_output_tokens` begränsar all genererad output, även osynliga token. Usage omfattar mer än bara den synliga svarstexten. Se [officiell OpenAI-dokumentation om tokenräkning](https://developers.openai.com/api/docs/guides/token-counting), kontrollerad 2026-10-09. Den tidigare verifierade modellprisprofilen används i [inputberedningen](prepared-input-2026-10-09/REPORT.txt).

[synthetic-price.json](synthetic-price.json) är en **påhittad testprofil** och avvisas av livevägen. [live-price.template.json](live-price.template.json) är avsiktligt ofullständig och kan inte köras. Före live krävs att någon faktiskt verifierar modell, strukturerade svar, token-/prisgränser och officiella källor, fyller i namn/tid och högst sju dagars giltighet, samt väljer filens exakta kanoniska SHA-256 via `--price-digest`. Programmet kontrollerar format, konsekvens, officiella källdomäner, datum och digest; det kan **inte autentisera en människas attest eller automatiskt bevisa källornas sakuppgifter**. Felaktigt intygade prisgränser kan inte göras säkra av transporten. Vid avvikande returnerad modell eller usage över tokenramen fryses journalen och inga fortsatta anrop tillåts. Eventuellt redan överskriden förbrukning döljs inte.

Ingen profil eller prislista från tidigare eval läses automatiskt. Inga credentials läses vid planering/offlinetest.

## Separat prisgräns för tokenräkning

`ce3-input-count-price/1` anger valuta USD, räkningsmetod, maximal avgift per
request i nano-USD, officiell källa och tidsbegränsad verifiering. Noll är
endast tillåtet som ett uttryckligen verifierat pris; frånvaro av pris är
inte noll. Profilens digest väljs uttryckligen. Den nya livetransporten
validerar profilen före journal, credentials eller nätverk.

**Blockerare i denna checkpoint:** dokumentationen beskriver exakt räkning,
men ett uttryckligt aktuellt avgiftsfrihetsbesked eller högsta pris för denna
endpoint har inte kunnat beläggas. Beredningens `count-price.template.json`
är därför avsiktligt ogiltig. Inga liveanrop får startas med denna mall.
Modellreservationer anges separat från den ännu overifierade räkningsavgiften.
Detta är inte en färdig verifierad totalram för live.

Alla möjliga räkningsavgifter reserveras samtidigt som hela stegsekvensen.
Räkningsintent, rå request/response, mätning, fel och modellrequest-hash
sparas separat från generationens usage. Räkningsendpointen lämnar inget
usage-kvitto; dess verifierade maxavgift kvarstår därför konservativt även
vid fel eller lyckat svar. Ett oskickat modell-anrop frigör inte en redan
möjlig räkningsavgift. Processavbrott behåller reservationerna och samma
körnings-ID kan inte skickas automatiskt igen. Credentials, headers och
råa felobjekt sparas inte heller för räkningsanropen.

## Beständig budgetjournal

[journal.cjs](journal.cjs) använder inbyggda `node:sqlite` (verifierat med Node 25.1.0; inget nytt npm-beroende). SQLite-modulen är experimentell i denna Node-version. Journalen är lokal och kräver fungerande SQLite-lås på ett lokalt filsystem; nätverksfilsystem och kopior av en aktiv databas är inte stödda.

`ce3-budget/1` anger uttryckligen mode, valuta, totalgräns och gräns per körning. `ce3-budget-journal/1` lagrar konfiguration, körningar, samtliga försök, resultat och hashkedjad händelsehistorik. Konfigurationen kan inte höjas eller ändras vid återöppning. Budgeten gäller **en journal**, inte hela API-kontot. Parallella körningar måste använda samma journal; egna journaler är separata uttryckliga budgetar.

Varje ändring görs med `BEGIN IMMEDIATE`, checksummevalidering, SQLite WAL och `synchronous=FULL`. Hela granskningens sex möjliga försök reserveras atomiskt före första sändningen. Alla planerade och osäkra belopp räknas mot både totalgräns och körgräns. Parallella processer kan inte reservera samma pengar. Budgetnekande sker före första HTTP-anropet och får en säker diagnostikpost.

Varje försök följer `planned → uncertain → settled`:

- `planned`: pengar reserverade, inget dispatch-intent ännu.
- `uncertain`: exakt credentialfri request sparad och transaktionen committed **före** sändning; anropet kan ha debiterats. En krasch i gapet mellan commit och faktisk sändning ger därför konservativ överreservation.
- `settled`: giltig usage och rätt returnerad modell möjliggör avstämning. Input/output kostnadsberäknas med den valda profilens övre priser. `usage_cost_upper_nusd` är usagebaserad kostnadsgräns, inte verifierad faktura eller ett påstående om erhållen cacherabatt.

Saknad/felaktig usage, timeout eller uteblivet svar behåller hela försöksreserven. HTTP-fel utan betrodd usage förutsätts inte vara gratis. Ett faktiskt usagebesked räknas även för ett incomplete-svar eller ett schemafel. Ett normalt avslut släpper endast reservationer för steg/försök som aldrig nådde dispatch. Det avslutar körningen atomiskt, så senare dispatch nekas.

Vid processdöd bevaras även osända planerade reservationer i den oavslutade körningen. Återöppning städar inte bort dem och skickar inte något igen. Samma kör-ID kan aldrig återanvändas. Ny körning kräver nytt explicit ID och kvarvarande budget. Det finns ingen automatisk återförsöks-/återhämtningsfunktion, påfyllning eller metod som frigör osäker förbrukning. Manuell avstämning mot leverantör behöver ett senare, granskat journalformat om den ska frigöra pengar.

SQLite sköter återhämtning av avbrutna transaktioner. En krasch under första journalinitiering kan lämna en tom/ogiltig fil; den avvisas, inga anrop har då kunnat starta. Journalfilen skapas exklusivt med 0600. Utdata från live/demo placeras i ny katalog med 0700. Underlag lagras okrypterat lokalt. Checksummor är integritetskontroller, inte signaturer mot någon som kan skriva om hela databasen.

## Anropsarkiv och credentials

Varje försök har stabilt ID `run/stage/initial|repair`, modell/prisprofil, input-/outputram, reservation, safe request-body och hash, responsstatus/-text och hash, redigeringsmarkering, duration, usage, usagebaserad kostnadsgräns och säkra felkoder. Körningen bevarar exakta prepared-digester och hela SR-originalresultatet, inklusive stegindata, bedömningar och diagnostik. Reparationsanropens egna requests och misslyckade råsvar ligger kvar även när SR:s överordnade providerresultat bara visar det reparerade svaret.

Credentials går endast via den dedikerade workerprocessens minne och utgående Authorization-header. De läggs aldrig i jobbmeddelandet, journalen, requestarkivet eller kommandoradsargument. Worker får endast PATH och den särskilda credentialmiljövariabeln; denna tas bort ur miljön efter läsning. Inga HTTP-headerobjekt, råa exceptionobjekt eller stackar sparas. Providerns console-utdata under körningen vidarebefordras inte. Känd nyckel och Bearer/sk-mönster redigeras bort från responsinnehåll; en sådan respons avbryter granskningen och markeras som redigerad. Inmatning som innehåller credentialmönster nekas före sändning, så texten ändras inte tyst.

Transportinsynen omfattar UTF-8-request/response-bodies vid den egna HTTPS-gränsen, inklusive alla interna formatreparationer. Den omfattar **inte** råa TLS-paket, serverns interna arbete, fakturor eller headers. Vid avbrott kan ett svar helt saknas eller bara vara partiellt; möjlig kostnad kvarstår. Bodies begränsas till 8 MiB och avbrott markeras. Serveridentifierad usage används för avstämning, inte en LLM-domare. Redigerade bodies är uttryckligen inte byteidentiska med mottagna hemliga bytes. SR:s originalresultat innehåller fortfarande bara providergränsens slutliga stegsvar; den kompletterande HTTP-historiken finns i transportjournalen/bundlen.

## Session/2 och proveniens

[runner.cjs](runner.cjs) separerar transport från session och kontrakt:

- `plan(profile, mode, options)` laddar pinnade SR-gränser men gör inga modell-/HTTP-anrop.
- `run({journal, mode, profile, priceDigest, runId, prepared, fixture?, apiKey?})` kör separat worker en gång och returnerar beständigt outcome. Live kräver explicit profildigest och credential; fixture tillåts inte.
- `archiveFor(outcome)` skapar granskningsarkiv via session/2:s befintliga adapter och replaykontroller.
- `attach(session, jobId, outcome)` binder arkivet till det redan frysta session/2-jobbet. `bundle/save/restore` bevarar session, full transporthistorik och `ce3-transport-session-link/1` med exakta resultat-/journal-/arkivdigester. Återöppning skickar inga requests.

Livevägen använder `Archive.importLive` med **oförändrat SR-originalresultat**, rätt openai-producent, begärd/returnerad modell och körmetadata. Om arkivet inte kan verifieras sparas transportutfallet, men ingen giltig granskning läggs till. Ett väntande jobb måste sparas före transportstart; demonstrationen visar den ordningen. Ett avbrott mellan transport och sessionssparning kan återtas genom **uttrycklig import av det sparade resultatet**, aldrig genom automatisk omsändning.

Offline har en särskild proveniensgräns: SR:s verkliga OpenAIProvider har konstant `mode=live` i sin kod även när dess HTTP-svar injiceras. Transportutfallet märker därför hela körningen `offline` och `SYNTHETIC HTTP FIXTURE THROUGH REAL SR PROVIDER — NOT LIVE` och bevarar detta ursprungliga testresultat separat. Det används **inte som en påstådd livegranskning**. För session/2 görs en separat riktig SR-replay av de sparade stegsvaren via den etablerade, märkta testproducenten. Dess arkiv är synthetic, dess replayusage är noll, och länken anger `explicit_scripted_replay_of_offline_provider_outputs`. Ursprunglig HTTP-usage, reparationer och SR-resultat ligger kvar i den inbäddade transporthistoriken. Detta är explicit återspelning av testdata, inte ommärkning av ett liveutfall för att passera validering. Liveutfall får inte gå genom denna väg.

Budgetstopp/transportfel kan inte bli complete. Partial/failed, blockerande fynd, frågor och historiska omappade problem fortsätter hindra överlämning enligt oförändrad session/2. Inga gamla blockerare löses av transporten. En framtida lokal LLM kan använda samma producent-/gransknings-/sessionsgräns med egen transport; ingen lokal adapter byggs här.

## Kör offline och förbered senare liveprov

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-transport/transport.test.cjs isolated-tests/structural-ce3-workbench/onboarding-transport/input.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-transport/demo.cjs /tmp/ce3-budget-demo-new
```

Demonstrationen skapar en budgetjournal, en väntande session/2-snapshot, full återöppningsbar transport/session-bundle och summary. Alla tre steg kräver förskriven formatreparation, och ett förskrivet blockerande fynd förhindrar överlämning trots komplett granskning och bekräftelse. Alla priser och usage i testet är syntetiska; faktisk kostnad är noll.

Det separata **live.cjs har inte körts**. För ett senare uttryckligen godkänt prov kräver det samtliga följande argument, utan standardbudget eller standardmodell:

```text
node .../onboarding-transport/live.cjs
  --execute-live
  --journal ABSOLUTE_BUDGET_SQLITE_PATH
  --output NEW_DIRECTORY
  --profile VERIFIED_PRICE_JSON
  --price-digest EXACT_CANONICAL_PROFILE_SHA256
  --currency USD
  --total-usd EXPLICIT_TOTAL
  --per-run-usd EXPLICIT_RUN_LIMIT
  --cases c3-r1,clear
  --run-prefix UNIQUE_EXPERIMENT_ID
  --input-token-limit EXPLICIT_INPUT_LIMIT
  --count-price VERIFIED_COUNT_PRICE_JSON
  --count-price-digest EXACT_CANONICAL_COUNT_PRICE_SHA256
```

Credential hämtas då från `OPENAI_API_KEY`, aldrig CLI-argument eller arkiv. Kommandot kräver att den konservativa maxkostnaden för valda fall ryms i budgeten och journalens återstående utrymme. Varje körning reserverar därefter atomiskt sin fulla gräns. Prisprofilen och planens maxomfattning sparas före första anropet. Ett fel avbryter resterande fall utan retry. Verifiering av räkningsavgiften, giltiga prisprofiler och nytt uttryckligt körbeslut återstår.

CLI läser endast de hashfrysta, oförändrade `c3-r1` och `clear` via befintlig inputs-funktion; **facit läses inte**. Dessa blir fristående granskningsarkiv. C3 har sedan tidigare ett CE3-kontraktsfel, och båda frysta filerna har andra källursprung än sessionens manuella inmatningsväg. De normaliseras därför inte till giltiga sessioner. Sessionkopplingen verifieras separat med giltigt manuellt syntetiskt underlag. Detta är en uttrycklig integrationsgräns, inte en tyst ändring av fallen.

Två valda fall, en granskning vardera: **högst 12 modell-anrop plus 12 räkningsanrop, 132 000 outputtoken och 12 × provets inputtak för modell-anropen**. En ytterligare granskning efter kundkomplettering/uttryckligt nytt förslag kräver en separat reserverad körning: ytterligare högst sex modell-anrop och sex räkningsanrop, totalt 36 HTTP-anrop. Modellförslag, kundfrågetext och modelländringar genereras inte av denna transport och ingår inte i dessa gränser.

Nästa lilla liveprov bör först mäta om SR upptäcker c3-felet och undviker falska fynd i kontrollfallet, med facit separat. Bedöm sedan en uttryckligt formulerad kundfrågas begriplighet och koppling till fyndet. Ett giltigt session/2-fall med kundkomplettering och nytt granskningsvarv kan därefter prövas inom en ny explicit budget. Tid och usage kan tas ur journalen; kundarbete och faktisk upptäcktsförmåga behöver separat mänsklig bedömning. **Driftsatt beta, livekvalitet och kundnytta är fortfarande inte verifierade.**
