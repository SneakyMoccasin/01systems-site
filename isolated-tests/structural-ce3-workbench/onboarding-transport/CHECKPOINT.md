# Checkpoint: isolerad, budgeterad SR-transport

Bas: CE3 `2cab759197e46af7007006c66b8a5446adada518`, befintlig branch `decision-flow-demo-v1`. Pinnad SR: `e7308010ecbea1ebe46c3298aa6a96f06381ad0a`, `structured-grounded/1`. Ingen ändring i SR, motorn, UI, granskningskontrakten eller session/2-formatet.

## Leverans

Separat katalog med prisprofilvalidering, atomisk beständig SQLite-budgetjournal, isolerad worker, instrumentering av **riktig SR OpenAIProvider** och dess interna reparationer, nätverksfri HTTP-fixture, session/2-länk/bundle, offline-demo, tester och ett **inte kört** livekommando. Befintlig session/2 README har endast fått en hänvisning. [FILES.txt](FILES.txt) listar samtliga 17 filer.

Versioner: `ce3-price-profile/1`, `ce3-budget/1`, `ce3-budget-journal/1`, `ce3-transport-plan/1`, `ce3-transport-result/1`, `ce3-transport-outcome/1`, `ce3-transport-session-link/1`, `ce3-transport-session-bundle/1` och `ce3-live-selection/1`. Journalen bevarar ursprungligt prepared-underlag redan vid reservation så att också avbrutna körningar har kvar sin exakta kontext.

Fulla sexförsöksreserven tas atomiskt före första anropet. Faktisk usage avstäms med den explicit valda profilens övre priser; osäker förbrukning frigörs inte. Samma kör-ID återanvänds aldrig. Ingen automatisk HTTP-retry, redirect, modellväxling eller påfyllning finns. Alla tre interna formatreparationer fångas vid HTTP-gränsen. Ingen pipeline eller prompt kopieras.

## Offlineverifiering

**22/22 nya transporttester passerar**, tillsammans med **150/150 befintliga JavaScript-regressioner** och **27/27 replaytester**. Inledande samlad körning hade 171 passerande tester; efter sista härdning av enbart transportmodulen kördes dess slutliga 22 tester igen, alla passerade. Ingen live-CLI har körts; dess argument-/profilvalidering testas som rena funktioner.

Testerna omfattar budgetstopp före anrop, riktig providerreparation i alla steg, fyra konkurrerande processer, timeout och avsaknad av usage, SIGKILL efter journalförd dispatch, återöppning utan omsändning, API-fel utan retry, faktiskt usagepris trots incomplete, modell-/tokengränsbrott, credential-ekon/felobjekt, session/2-arkiv, bevarade blockerare, transportfel som failed, frysning utan modellfallback samt native HTTPS-gränsens enda anrop utan redirect eller anslutningspool. Ingen socket eller extern fetch tillåts i offline-worker.

De hashfrysta **c3-r1 och clear är oförändrade** och går genom riktiga SR/provider med märkta HTTP-testsvar. Facit läses inte av transporten. C3:s historiska CE3-kontraktsfel ger fortsatt partial vid översättning även när testsvaren anger full täckning. Fallen skrivs inte om för att passa sessionens manuella källregistrering. Sessionsintegration verifieras separat med giltigt syntetiskt underlag.

Demonstrationen gav sex HTTP-fixtureförsök (tre initiala och tre reparationer), SR complete och ett förskrivet blockerande fynd som fortfarande nekar överlämning. Syntetisk initial reservation: **61 320 000 nano-USD**; syntetisk usagebaserad kostnadsgräns efter avstämning: **48 000 nano-USD**. Båda är testtal; **faktisk kostnad är 0 USD**. [offline-summary.json](offline-summary.json) bevarar den kompakta körsammanfattningen. Full SQLite-journal, pending-session och återöppningsbar bundle produceras av demo till en ny lokal katalog; de stora genererade testarkiven committas inte.

Historiska SR-receipts, diagnostikfreeze och tidigare evalresultat verifierades också. Verifikationen av tidigare eval läste 27 gamla reservationer och 26 gamla svar inklusive fem kontraktsogiltiga envelopes; den gjorde inga nya liveanrop.

```sh
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-evaluation/evaluation.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/adapter.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-transport/transport.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py'
node isolated-tests/structural-ce3-workbench/onboarding-sr/verify.cjs
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/run.cjs verify
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/verify-results.cjs
node isolated-tests/structural-ce3-workbench/onboarding-transport/demo.cjs /tmp/ce3-budget-demo-new
```

Bevarandekontroll: **2 166 befintliga CE3-filer** jämförda mot passets start; endast session/2 README-hänvisningen ändrad. **Samtliga 134 befintliga SR-filer byteidentiska** och SR:s arbetsstatus ren. Befintligt oregistrerat arbete i docs/audits bevaras och ingår inte i commit.

## Kvar inför liveprovet

Liveprofilen är en ofylld mall. Välj och verifiera exakta modell-/pris-/tokengränser, med officiella källor, aktuell attest och explicit digest. Programmet kan kontrollera profilens konsekvens och giltighetstid, men inte bevisa en attests sanningshalt. En hård maxkostnad förutsätter att de angivna övre gränserna faktiskt gäller. Ange sedan explicit totalbudget, körbudget, journal och fall och ge ett nytt körbeslut.

Två fall med en granskning vardera innebär **högst 12 HTTP-anrop och 132 000 outputtoken**, plus högst `12 × I` inputtoken där `I` är profilens verifierade inputgräns. En senare granskning efter kundkomplettering/uttryckligt nytt utkast kräver en ny reserverad körning, ytterligare högst sex anrop. Ingen AI-generering av modellförslag eller kundfrågor ingår i dessa tak.

Alla provider-HTTP-försök fångas; den tidigare luckan för formatreparationer är därmed täckt. Kvarstående insynsgränser: response headers/TLS-trafik och serverintern behandling/faktura arkiveras inte; avbrutna svar kan saknas eller vara partiella; hemliga ekon redigeras uttryckligen. SR:s stegresultat visar fortfarande bara providergränsens slutliga svar, medan full HTTP-historik ligger i transportjournal/bundle. Offline-sessionarkivet är en separat märkt scripted replay; ursprunglig providertrace sparas oförändrad vid sidan av. Livevägen behåller originalets verkliga producentmetadata.

Nästa lilla prov ska bedöma faktisk upptäckt, falska fynd, en begriplig kompletteringsfråga samt tid och usagekostnad. Testdubblarna här bevisar endast transport-, budget- och integrationslogik. Driftsatt beta, livekvalitet och kundnytta är inte verifierade. **0 externa AI-anrop, 0 USD, inga inköp eller publiceringar.**
