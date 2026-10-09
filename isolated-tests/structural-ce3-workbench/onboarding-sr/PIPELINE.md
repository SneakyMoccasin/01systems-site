# Vad den lokala betakoden faktiskt kör

Läst och offlineverifierat 2026-10-09. SR: `main`, commit **10d2482186e0d116506f215bdbdbd70f009ab18b**, ren arbetskopia. [sr-code-pin.json](sr-code-pin.json) låser källfilerna som adaptern laddar och de UI/API-filer som kartläggningen bygger på. SR-repot är oförändrat.

**Driftsatt version är inte verifierad.** Lokal HEAD, lokal konfiguration och `docs/vercel-closed-beta.md` bevisar inte vilken commit, modell eller vilka miljövariabler en Vercel-deployment använder. Ingen betaserver, deployment-API eller extern AI har anropats i detta pass. Före ett test som kallas ”driftsatta betans pipeline” behövs deployment-ID, byggd commit och säker modell-/konfigurationsmetadata från ansvarig driftmiljö. Ingen sådan koppling antas här.

## Ingång och val av läge

| Kodväg i SR | Faktiskt beteende |
|---|---|
| [app/page.tsx](../../../../skeptical-reader/src/app/page.tsx), rad 6–11 | Verifierar betasessionscookie och visar `AuditWorkspace`, annars redirect till beta-access. `getConfiguredProviderMode()` anger mock/live-badge. |
| [app/AuditWorkspace.tsx](../../../../skeptical-reader/src/app/AuditWorkspace.tsx), rad 90–107 | `reviewMode` börjar som **text**. En lägesväljare erbjuder även grounded. Textknappen skickar `{text, language}` till `/api/audit`. |
| [app/GroundedReview.tsx](../../../../skeptical-reader/src/app/GroundedReview.tsx), rad 16, 61, 69 | Grounded-formuläret har separata `sourceMaterial`, `question`, `reviewText`; skickar `mode: "grounded"` till samma API. |
| [app/api/audit/route.ts](../../../../skeptical-reader/src/app/api/audit/route.ts), rad 18–41 | Betaskydd, storlekskontroll och processlokal request guard. Endast `mode === "grounded"` väljer grounded-schema och `runGroundedReview`. Övriga anrop väljer text-schema och `runCredibilityAudit`. |

Det är alltså fel att beskriva ”betans pipeline” som ett enda enhetligt fyrastegs- eller trestegsflöde. Förvalt textläge har fyra steg; det valbara grounded-läget har tre. CE3 använder uttryckligen den **befintliga grounded-vägen**, eftersom den skiljer underlag från granskningsobjekt. Det är ett val av faktisk lokal betakod, inte ett antagande om driftsatt standardläge.

## De två pipelinerna

| Läge / riktig exporterad funktion | Steg och promptversioner | Underlag och begränsning |
|---|---|---|
| [pipeline/run.ts](../../../../skeptical-reader/src/lib/pipeline/run.ts), `runCredibilityAudit(document, provider, language, options)` | `claim_extraction` 0.1 → `claim_review` 0.2 → `document_review` 0.1 → `adjudication` 0.1; shared 0.1 | Ett dokument går till samtliga steg. Ingen separat evidensparameter. Att lägga original och utkast i samma dokument skulle inte införa ett verifierat källgranskningskontrakt. |
| [grounded/run.ts](../../../../skeptical-reader/src/lib/grounded/run.ts), `runGroundedReview(sourceMaterial, question, reviewedText, provider, language, options)` | `grounded_claim_extraction` 0.3 → `grounded_support_assessment` 0.4 → `grounded_adjudication` 0.2; grounded-shared 0.1 | Extraktionen får fråga + reviewed_text. Stödbedömningen får validerade påståenden + hela source_material. Slutbedömningen får validerade bedömningar. Providergränsen bär båda textrollerna separat genom alla steg; det betyder inte att alla steg skickar båda till modellen. |

CE3:s [sr-runtime.cjs](sr-runtime.cjs) laddar `runGroundedReview` från dessa filer med SR:s redan installerade `tsx`. Ingen pipelineimplementation eller prompt kopieras till CE3-koden. Prompttext som syns i offlinearkiv är en logg av faktiska anrop till testdubbeln, inte en ersättningsimplementation. Inga Next.js-servrar startas. API-autentisering, HTTP-routing och deployment är statiskt kartlagda, inte integrationstestade över nätverk.

## Scheman, modell och validering

[grounded/input.ts](../../../../skeptical-reader/src/lib/grounded/input.ts) begränsar källa till 10–5 000 ord/50 000 tecken, granskningsobjekt till 10–3 000 ord/30 000 tecken och fråga till 1–200 ord/2 000 tecken; sammanlagt högst 7 500 ord/75 000 tecken. Routen begränsar request till 84 000 tecken. CE3 återanvänder inputschemat före funktionsanropet och stoppar om trimning skulle ändra positionsmappningen.

[grounded/stage-schemas.ts](../../../../skeptical-reader/src/lib/grounded/stage-schemas.ts) definierar Zod-schema för varje steg: upp till 80 extraherade påståenden, 80 stödbedömningar och 12 slutkandidater. [grounded/schemas.ts](../../../../skeptical-reader/src/lib/grounded/schemas.ts) definierar slutresultatet, exakta referenser, claim-/assessment-/finding-ID, outcome, recommendedAction, confidence och metadata. Textläget använder i stället [pipeline/stage-schemas.ts](../../../../skeptical-reader/src/lib/pipeline/stage-schemas.ts) och [schemas.ts](../../../../skeptical-reader/src/lib/schemas.ts).

[providers/index.ts](../../../../skeptical-reader/src/lib/providers/index.ts) väljer Mock eller OpenAI via `SKEPTICAL_READER_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Modellen är inte hårdkodad i pipelinen. Den befintliga lokala konfigurationen vid föregående pass var OpenAI / `gpt-5.6-terra`; detta verifierar inte betans driftskonfiguration. Adaptern här läser inga credentials, laddar inte providerfabriken och har inget livekommando.

[providers/openai.ts](../../../../skeptical-reader/src/lib/providers/openai.ts) använder Responses API, `store:false`, strikt JSON Schema via Zod och högst en formatreparation per steg. Identiteter jämförs vid reparation. [pipeline/execution.ts](../../../../skeptical-reader/src/lib/pipeline/execution.ts) har 120 s pipelinefrist och 90 s request-timeout. Grounded-taken är 8 000 / 20 000 / 5 000 outputtoken per steg och lika stora tak för respektive reparation. Tre steg kan därför innebära **sex** debiterbara API-anrop. Denna interna reparationslogik och de större tokenramarna får inte ersättas med antagandet från d795534 om ett anrop och 6 000 token.

## Citat, slutbedömning och täckning

[text.ts](../../../../skeptical-reader/src/lib/text.ts), `resolveExactReference`, hittar ordagranna citat med nollbaserat occurrenceIndex och UTF-16-positioner; inga sökningar görs på ungefärlig text. Grounded-pipelinen:

1. Filtrerar bort extraherade påståenden vars citat inte finns i reviewedText.
2. Accepterar högst en bedömning per claim-ID. Claim-citatet måste exakt motsvara den validerade extraktionen; sourceQuotes måste finnas i sourceMaterial. Supported, partially_supported och contradicted kräver källcitat.
3. Tar slutkandidater från adjudication, utesluter supported-bedömningar, grupperar blandade utfall och härleder slutliga claim-/sourceReferences från medlemmarna. Resultatet kapas till 12 fynd.
4. Returnerar `grounded-0.1` med claims, assessments, findings, summary och metadata/diagnostics, inklusive stage-tider, usage, modellidentitet, reparationsmarkörer och fingerprint.

Vissa felaktiga eller dubbla poster tas bort utan att hela körningen misslyckas. `claimsAssessed` mäter antalet bedömda **extraherade påståenden**, inte täckning av alla ursprungliga CE3-uppgifter. Slutresultatet har ingen complete/partial-status för ett förväntat register av CE3-fält. Stage-trace behövs för att se bortfall; route-resultatet ensamt innehåller inte hela denna trace.

## Kan etiketten scenario_assumption granskas?

Den kan **presenteras för SR**, men det är inte verifierat att SR upptäcker felet. CE3 visar hela uppgiftsobjektet, inklusive ID, statement, type, status, value, refs, scenario_choice, supersedes och rationale. En generell fråga förklarar kontraktets typer utan att ange det diagnostiska facit. Utkastet och källan förblir separata.

Extraktionsprompten väljer materiella påståenden i löptext; den kräver inte ett påstående om varje strukturerad etikett. Ett korrekt citat av ”provet är bokat dag 4” kan därför lämna den felaktiga scenariotypningen ogranskad. Även ett citat av hela JSON-objektet bevisar bara citatomfattning, inte vilka fält bedömaren faktiskt tog ställning till. CE3 markerar därför alla nuvarande grounded-resultat **partial**, eller **failed** vid fel, och redovisar individuella påståendecitat i stället för att fylla hela `assessed_item_ids`.

Detta är den centrala återstående granskningsluckan. SR är fortsatt inte CE3:s slutliga profilvalidator, och noll fynd betyder inte fullständighet eller korrekthet.
