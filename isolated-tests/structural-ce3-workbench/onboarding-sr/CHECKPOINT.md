# Checkpoint: faktisk SR-kod bakom CE3:s adapter

Datum: 2026-10-09. Start-HEAD i CE3: `d7955345003c163124e99b7c76136e729942b2a1`, branch `decision-flow-demo-v1`, 16 commits före lokal origin-referens. Spårad arbetskopia och staging var rena. Befintliga oregistrerade revisionsfiler bevarades.

SR lästes på `main`, **10d2482186e0d116506f215bdbdbd70f009ab18b**, med ren arbetskopia. Lokal beta-UI/API har två lägen: förvalt textläge med fyra steg och grounded med tre steg och separata käll-/utkastfält. **Driftsatt beta-commit och modell är inte verifierade.** Ingen SR-fil ändrades och ingen server, modell-API eller extern tjänst anropades.

## Leverans

Fullständig förteckning: [FILES.txt](FILES.txt). 26 nya filer under `onboarding-sr/` och två dokumentförtydliganden under `onboarding-evaluation/`.

| Filer | Funktion |
|---|---|
| `PIPELINE.md`, `DEPENDENCIES.md` | Kodvägar från beta-UI/API, modell/scheman/prompts, verifieringsgränser och exakt återstående kontraktsarbete |
| `sr-runtime.cjs`, `sr-code-pin.json` | Hashlåst laddning av SR:s verkliga `runGroundedReview`, inputschema, Zod och citatkontroller; endast förskriven offline-provider |
| `adapter.cjs` | Separata evidens-/utkastfält, versionsdigester, positionsmappning, originalresultat/trace, konservativ översättning och partial/failed-status |
| `bundle.cjs`, `demo.cjs` | Befintlig sessionshållare med två riktiga SR-kodkörningar, kundfråga/svar, explicit ny modell, exakt bekräftelse, bevarade receipts och verifierat överlämningsstopp |
| `test-tape.cjs`, `adapter.test.cjs` | Förskrivna leverantörssvar och 24 offlinekontroller; ingen kvalitetsbedömning av AI |
| `diagnostic.cjs`, `verify.cjs` | Förberedelse utan facitöverföring, offlinekörning och verifiering av fryst paket/sparade receipts |
| `diagnostic/` | Byteidentiska ursprungliga c3-r1-/c5-r1-utkast, c3-originaltext, separat facit och låst manifest |
| `offline-records/` | Två preparerade paket, testtapes och verkliga SR-kodresultat med testdubbel; alla sex stagespår bevarade |
| `README.md`, `DIAGNOSTIC.md`, `CHECKPOINT.md`, `FILES.txt` | Kundflöde, körinstruktioner, senare explicit budget och leverans-/testredovisning |
| `../onboarding-evaluation/README.md`, `../onboarding-evaluation/REPORT.md` | En tillagd notering vardera: `d795534` testade enanropsprompt med SR-principer, inte betans verkliga pipelines |

## Faktiskt återanvänt och faktiskt oprövat

Offlinekörningarna använder SR:s exporterade `runGroundedReview`, alla tre befintliga grounded-prompts, stage-/resultatscheman, citatvalidering, filtrering, adjudication, metadata och tidsgränslogik. SR:s provider ersätts med JSON-testdubbel. Pipelinen kopieras inte. Inget nytt enanropsgranskningsläge införs.

Fynd i offlinearkivet är förskrivna testdata. Det är inte ett liveprov, ingen mätning av AI-kvalitet och inget bevis för att SR upptäcker scenariotypfelet. Lokal funktionsanropning är verifierad; driftsatt HTTP/autentisering, live-provider, pris, kredit och kundarbete är oprövade i detta pass. Externa AI-anrop: **0**, extern AI-kostnad: **0 USD**.

Fälttäckning saknas i SR:s nuvarande resultatkontrakt. Adaptern rapporterar därför alltid partial eller failed, bevarar osäkra/omappade fynd och låter inte tom fyndlista ge komplett granskning. Sessionshållarens live-spärr lämnas kvar. Kundbekräftelse för aktuell version demonstreras, men **överlämning nekas**. Detta stopp kan inte hävas genom att bara sätta complete eller byta producentetikett.

För ett fullständigt liveflöde återstår ett uttryckligt SR-täckningskontrakt, en receipt-bunden sessionsversion för live-resultat och budgeterad transport med samtliga interna reparationsförsök. Se [DEPENDENCIES.md](DEPENDENCIES.md). Ett avgränsat diagnostiskt liveprov kan testa befintlig pipeline före dessa produktändringar, men kräver eget budgetbeslut och får inte slutföra onboarding med partial-resultat.

## Kontroller

| Kontroll | Resultat |
|---|---|
| `node --test .../contracts/onboarding-v1/contract.test.cjs .../onboarding-session/session.test.cjs .../onboarding-evaluation/evaluation.test.cjs .../onboarding-sr/adapter.test.cjs` | **104/104**: 39 kontrakt, 25 session, 16 tidigare utvärderingsadapter, 24 nya SR-adaptertester |
| `node .../onboarding-sr/demo.cjs` | Två fulla SR-kodkedjor med testdata; gammal granskning/bekräftelse blir stale, svar löser inte fynd, aktuell kundbekräftelse registreras, överlämning stoppas |
| `node .../onboarding-sr/verify.cjs` | Diagnostikfrysning och båda sparade originalreceipts verifierade |
| Sparade svar återspelade i tester | SR:s claims, assessments, findings och summary återskapas identiskt; tidsmetadata får variera |
| `node .../onboarding-evaluation/run.cjs verify` | Tidigare experimentfrysning oförändrad |
| `node .../onboarding-evaluation/verify-results.cjs` | Tidigare 27 requests och 26 råsvar/artefakter fortsatt verifierade, inklusive historiska fel |
| Bevarande mot startbaslinje | 2 115 CE3-filer kontrollerade: endast de två tillåtna dokumentnoteringarna ändrade; tidigare rådata/facit, sessionskod, kontrakt och annat arbete byteidentiska |
| SR-bevarande | Samtliga 120 tidigare spårade/icke-ignorerade filer byteidentiska; ren git-status |

Ingen UI, filuppladdning, OCR, modellkompilering, CE-körning, motorändring, CE2-/webbplatsändring eller publicering. Inga nya beroenden installerade. Inga konton, påfyllningar eller inköp.
