# CE3 → SR structured-grounded/1, offlinekoppling

Efterföljande sessionsstöd finns i [onboarding-session/v2](../../onboarding-session/v2/README.md): inbäddade granskningsarkiv, register-/receiptbundna händelser och uttrycklig historikmigration. Den här katalogens befintliga receipt/1- och bundle/1-format behåller sin offlinegräns. Avsnittet om kommande sessionsmigration nedan beskriver denna integrations tidigare checkpoint.

Aktuell isolerad adapter till `runStructuredGroundedReview` i SR **e7308010ecbea1ebe46c3298aa6a96f06381ad0a**, branch `codex/structured-grounded-v1`. CE3-bas: `8695110081097fb5bf9a3a0eea863baecea0a98e`. Förra adaptern/receipts i överordnad katalog är historisk grounded-0.1-verifiering och lämnas intakta. Den aktiva nya kodpinnen är [sr-code-pin.json](sr-code-pin.json); den historiska pinnen skrivs inte över.

**Offlineintegrationskontroll: riktig SR-kod, uttryckligen förskrivna modellsvar. Inga externa AI-anrop, kostnader eller upptäcktsmått.** SR-repot, CE3-motorn, UI, onboardingkontrakten och `ce3-onboarding-session/1` ändras inte.

## Körning

Från CE3-repots rot, med befintlig Node/Ajv samt SR:s redan installerade tsx/Zod:

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/structured/demo.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/structured/demo.cjs /tmp/ce3-structured-session-new.json
node isolated-tests/structural-ce3-workbench/onboarding-sr/structured/diagnostic.cjs /tmp/ce3-structured-cases-new
```

Utdatafiler/kataloger ska vara nya. Inget skrivs över och inget livekommando finns. [test-tape.cjs](test-tape.cjs) är en svarsdubbel, inte en granskningsmotor. Det finns ingen providerfabrik, credentialläsning, promptkopia eller egen stegersättning i CE3. `runtime.cjs` anropar SR:s exporterade `runStructuredGroundedReview` direkt; SR driver sin riktiga grounded-pipeline och de nya versionsmärkta stegkontrakten. Exakta SR-prompts i sparade resultat är anropsloggar, inte implementationer.

Före varje laddning/körning kontrolleras **hela commitidentiteten** med lokal Git och SHA-256 för 49 relevanta filer: icke-testkod i `src/lib`, package.json, låsfil och tsconfig. Oregistrerade filer i `src/lib` stoppas också eftersom de kan påverka importupplösning. Avvikelse ger `SR_VERSION_MISMATCH`, `SR_FILE_MISMATCH` eller annan tydlig kod **före modellsteg**. Ingen automatisk checkout, uppdatering eller nedladdning görs. `srRoot` kan ange en annan exakt lokal checkout. Installerade beroenden förutsätts matcha låsfilen; deras hela node_modules-innehåll är inte hashpinnat. Driftsatt beta verifieras inte.

## Gränssnitt och register

- `prepare(reviewRequest, {draftText?, srRoot?})`: binder CE3:s granskningsbegäran och använder SR:s faktiska `prepare`/schemas för register- och digestkontroll. `draftText` kan bevara originalfilens exakta bytes som UTF-8-text; JSON-innehållet måste vara identiskt med den bundna snapshoten.
- `reviewRecorded(reviewRequest, testTape, options)`: kör riktig SR och returnerar `ce3-structured-sr-receipt/1`.
- `verifyReceipt`, `saveReceipt`, `loadReceipt`, `attachOffline` är **asynkrona**. Verifieringen återspelar de sparade testsvaren genom samma låsta SR-kod. Inga AI-anrop görs vid återspelning.
- `bundle.cjs` erbjuder asynkrona `bundle/restore/save/load` för `ce3-structured-sr-bundle/1`, med en oförändrad session/1-logg och separat samling receipts. Äldre SR-receipts använder sin äldre bundle; formaten uppgraderas inte tyst.

Registret byggs deterministiskt från snapshoten och kan inte minskas av ett modellsvar. Det begär sju namngivna fält för varje modelluppgift, även historiska: `statement`, `type`, `status`, `value`, `scenario_choice`, `depends_on`, `refs`. Analysen får egna fält för frågan, analystypen och de tre ID-listorna. Omfattningens includes/excludes och varje luckas typ/status/impact/förklaring/uppgiftskoppling/resolution får egna mål och fält. Inga modell-ID:n uppfinns för kontextmål. ID-kollisioner eller mer än SR:s 80 fält stoppas; ingen tyst trunkering eller delgranskning införs.

Källpaketet innehåller allt originalinnehåll och alla källversioner från snapshoten, med stabila källspann. Utkastet är en separat, oförändrad JSON-text. Båda rollerna skickas enligt SR:s faktiska gränssnitt. Källkopior i utkastet blir inte fristående evidens. CE3:s kanoniska proposal-/evidence-digester hålls åtskilda från SR:s SHA-256 över exakt käll-/utkasttext. Registerdigest och SR:s hela request-bindning bevaras. Källversionens SR-sträng är CE3-underlagets digest; varje ursprungligt käll-ID/version finns dessutom i snapshot och spannregistret.

## Täckning, fynd och konservativ översättning

`original_sr_result` bevarar SR:s complete/partial/failed, producent, exakta stegindata/scheman, ursprungliga/validerade/vidarebefordrade svar, bedömningar, fynd och diagnostik. `field_coverage` och `finding_reporting` ligger separat även i CE3-kvittot. Dessa är olika mått.

En aktiv uppgift får tas med i review/1:s `assessed_item_ids` **endast om samtliga sju begärda fält uttryckligen är assessed**. Ett helt objektcitat ger ingen sådan täckning. Detta är täckning av det deklarerade registret, inte ett påstående om separat bedömning av varje annat JSON-underfält. Exempelvis unit/kind/rationale/supersedes finns i originalets kontext men har inte egna fältroller i SR:s nuvarande item-kontrakt. Komplett registertäckning bevisar varken modellens fullständighet, riktighet eller körbarhet.

Varje problematisk, uttryckligt bedömd fältdimension översätts separat:

| Ursprunglig bedömning | CE3-kategori / grund |
|---|---|
| Källstöd contradicted | contradiction / evidence |
| Källstöd unsupported | unsupported / absence_in_supplied_material |
| Källstöd partially_supported eller cannot_determine | hypothesis / review_hypothesis |
| Klassificering incorrect | meaning_shift / evidence |
| Klassificering cannot_determine | hypothesis / review_hypothesis |

SR:s kombinerade native-utfall används **inte** för att sudda ut skillnaden mellan källstöd och klassificering. Varje CE3-fynd kan spåras via assessment-ID, fält, dimension och ursprungliga fynd-ID:n. Källcitat måste ligga helt i exakt en originalkälla för att bli CE3-referenser. Förskrivna recommendedAction görs inte automatiskt om till kundfrågor; frågetext tillförs uttryckligen.

Kontextfynd (analys/scope/gap), fynd om inaktiva uppgifter och källcitat utan entydigt spann bevaras i `unmapped`. De ges inte godtyckliga item-ID:n och gör CE3-status partial. En tydlig fältbedömning som SR:s fyndtak lämnat utan slutligt fynd får fortfarande en markerad översättning med `origin=sr_assessment_without_final_finding`; den får inte presenteras som ett faktiskt SR-slutfynd. SR:s partiella fyndredovisning och CE3:s partial-status kvarstår.

CE3-status kan aldrig bli bättre än SR-status. Kontraktsogiltiga originalutkast och relevant informationsförlust ger ytterligare nedgradering. Alla översatta fynd är blockerande. Ett complete-resultat med blockerande fynd eller olösta frågor gör därför **inte** överlämning tillåten.

## Lagring, identitet och återöppning

Ett receipt innehåller den exakta begäran, käll-/utkast-/registerdigester, kodidentitet/pindigest, testtape, fullständigt SR-resultat, separat fälttäckning/fyndredovisning, CE3-resultat, mappningar och omappade problem. Hela paketet har checksumma. Vid återöppning:

1. Kontrollera checksumma, exakt SR-version/filhashar och deterministiskt ombyggd presentation/registrering.
2. Återspela testtapen med riktig SR och jämför alla semantiska resultat, status, bindningar, rådata, prompts och schemas.
3. Beräkna CE3-översättningen igen och jämför den med sparade uppgifter.
4. För bundle: återställ session/1:s befintliga historikkedja och verifiera varje receipt mot exakt granskningsbegäran, underlagsdigest och lagrat CE3-resultat. Saknat receipt avvisas.

Endast slumpat native run-ID, klockslag och mätta körtider undantas från jämförelsen mellan två SR-körningar; deras sparade originalvärden täcks fortfarande av checksumman. Checksummor är integritetskontroller, **inte signaturer eller skydd mot någon som skriver om hela historiken och alla dess underlag**. Ett avbrutet/trasigt filskriv avvisas vid läsning; distribuerad samtidighet ingår inte.

Session/1 behåller synthetic/model=null-spärren. Kopplingen accepterar enbart sin egna tydligt märkta offlineproducent. Sena svar kan läggas till för det gamla jobbet men gör inte ett nytt utkast granskat. Kundens svar löser inte fynd automatiskt. Ändrad källa eller modell gör granskning/bekräftelse inaktuell enligt befintlig session. Ändrat register/presentation upptäcks vid receipt-verifiering; den fristående gamla sessionsloggen känner inte till registerdigest eller receipt, vilket är migrationsgränsen.

## Diagnostiska integrationskontroller

[offline-records/summary.json](offline-records/summary.json) och de två receipts visar faktisk lokal SR-körning med testdubblar:

| Fall | Begärda fält | SR | CE3 | Kommentar |
|---|---:|---|---|---|
| Oförändrat c3-r1 | 54 | complete | partial | Ett föreskrivet klassificeringsfynd; historiskt CE3-kontraktsfel kvarstår |
| Oförändrat tydligt kontrollfall | 77 | complete | complete | Inga föreskrivna fynd |

Originalutkasten och underlagen från föregående checkpoint bevaras. Historiskt facit i `../diagnostic/gold.json` läses inte av förberedelse, adapter, SR eller demonstrationsskript. Testtapen innehåller förskrivna **svar**, aldrig facit som ursprunglig granskningsindata. SR:s senare steg får sina faktiska tidigare stegresultat som vanligt. Detta är integrationskontroller, inte bevis på upptäcktsförmåga eller kundnytta. Det kontraktsogiltiga c3-utkastet tas inte in som giltig kundsession.

## Minsta nästa steg: sessionsmigration

Inför en separat versionsmärkt review-händelse i en kommande sessionsversion som binder receipt-digest, registerdigest, kod-/kontraktsidentitet och producent till exakt proposal-/underlagsversion. Migrera gamla session/1-loggar uttryckligen och bevara frågor, dispositioner, sena svar och kundbekräftelser. En gammal synthetic review får inte bli live genom namnbyte eller borttagen mode-spärr. Låt överlämning kräva verifierat aktuellt receipt och bibehåll blockeringsreglerna; täckning och hanterade fynd är olika grindar.

Före livebruk krävs dessutom budgeterad transport med reservation och arkiv för alla interna reparationsförsök, senare uttrycklig budget samt separat utvärdering av livekvalitet. Driftsatt beta, livekvalitet och ett färdigt live-onboardingflöde är **inte verifierade** i detta pass. SR:s nuvarande providergräns visar inte alla råa HTTP-försök; kvittot gör inget sådant anspråk.
