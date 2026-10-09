# Berget AI för strukturerad SR-granskning

Undersökt **2026-10-09**, från CE3 `c8742f702ff4b98c9618e56ff1185cde6560ff89`. SR `e7308010ecbea1ebe46c3298aa6a96f06381ad0a`, `structured-grounded/1`; full commit och 49 pinnade filhashar kontrollerade utan modellkörning. [Lokal jämförelserapport](LOCAL-LLM-FEASIBILITY.md) och faktisk provider-, pipeline-, arkiv- och transportkod har lästs.

**Beslut: Berget är en rimlig senare kandidat, men inte den minsta vägen till första kvalitetsprovet.** Chat Completions och strikt JSON Schema är dokumenterade. Exakt SR-schemakompatibilitet, serverns tokengränser och en verifierbar inputkostnadsgräns återstår. En separat provider, transport och valutahantering behövs. Rekommendationen är att först lösa de kvarstående budgetfrågorna i den redan förberedda OpenAI-vägen. Ingen väg är ännu klar för obevakad livekörning.

## Kompatibilitet mot faktisk kod

SR:s `ModelProvider.generateStructured(request)` tar instructions, input, Zod-schema, signal och deadline. `runStructuredGroundedReview` driver riktig grounded-extraktion, stöd-/klassificeringsbedömning och adjudication. Registret och tidigare stegresultat ingår i senare prompts; källor och utkast har skilda roller. Fält- och fyndtäckning beräknas deterministiskt.

Bergets offentliga [OpenAPI-specifikation](https://api.berget.ai/openapi.json), version 1.0.0, lästes som dokument, inte genom ett tjänsteanrop. Hämtade bytes hade SHA256 `fdf3d19947f413e5cacc1ff5c4d393165b60ff4a5a6c1e756f25d233ede0eb94`. Den kompletteras av [kapabilitetsmatrisen](https://docs.berget.ai/models/capabilities). Dokumenterat stöd är inte verifierat driftsbeteende.

| Område | Dokumenterat hos Berget | Följd / kvar att verifiera |
|---|---|---|
| API | `POST /v1/chat/completions`. Ingen Responses- eller tokenräkningsendpoint i specifikationen. | SR:s hårdkodade OpenAI Responses-provider kan inte bytas genom enbart base URL. Avsaknad i dokumentationen bevisar inte att en odokumenterad endpoint saknas. |
| Strukturerat svar | `response_format.type=json_schema`, `json_schema.name/schema/strict`; Gemma 4 har schema-markering i matrisen. | Använd strict=true. JSON-object-läge räcker inte. Ingen offentlig keyword-/backendversionmatris belägger samtliga SR-scheman. |
| Output/reasoning | `max_tokens`, alias `max_completion_tokens`, `reasoning_effort`; separat reasoning-innehåll kan returneras. | Modellens tillåtna maxvärden och om varje debiterad reasoningtoken omfattas av taket måste beläggas. Okända fält kan vidarebefordras till backend; accepterad request är inte bevis på effekt. |
| Svar/usage | Completion-ID, modell, choices/finish_reason; usage med prompt-, completion- och totaltoken, eventuell reasoninguppdelning. Usage kan saknas även vid HTTP 200. | Spara råsvar, faktisk modell och varje försök. Ingen modellrevision/weight-digest garanteras av modellsträngen. Saknad usage får inte frigöra reservationen. |
| Fel | Bland annat 400, 401, 403, 404, 413, 429, 500 och 503 dokumenteras. | Ingen belagd garanti om timeout, kostnad vid avbrott, idempotent retry eller interna omförsök. Klientavbrott bevisar inte stoppad debitering. |

SR använder strict objects, required/properties, additionalProperties=false, nästlade arrays/objekt, enum, min/maxLength, min/maxItems (upp till 80), digest-regex, heltalsgränser och numerisk confidence 0–1. **Varje sådan schemafunktion är fortfarande oprövad mot Bergets valda backend.** Behåll SR:s Zod- och semantikvalidering av ID:n, digester, citat, dubletter, stöd och klassificering även om leverantören garanterar JSON-struktur.

Minsta framtida integration är en isolerad Berget-`ModelProvider` som skickar SR:s oförändrade instructions/input som system-/användarmeddelanden, aktuellt schema som response_format och `n=1, stream=false`. Den injiceras direkt i befintlig `runStructuredGroundedReview`; inga granskningsprompts eller pipelineled kopieras. Zod-validering och högst en identitetsbevarande formatreparation per steg behövs i providern: reparationen ligger idag i `OpenAIProvider`, inte i orkestreringen. Exakt gemensam reparationsimplementation skulle kräva separat SR-refaktorering och ny kodpinne; den återanvänds inte automatiskt.

Transporten måste journalföra rå request/response, initial/repair-ID, modell, tokenramar, usage, tidsåtgång och säkert filtrerade fel. Inga automatiska klientretries eller modellbyten; reservera före dispatch och bevara osäker kostnad efter timeout. SR:s 90 s/anrop, 120 s/pipeline och CE3:s 135-s-worker måste bedömas mot uppmätta tider; eventuella avvikelser fryses som provinställningar.

CE3:s befintliga transport validerar OpenAI-endpoint och Responses-payload. `input.cjs` kräver OpenAI:s räkningsmetod; `price.cjs` och `journal.cjs` kräver OpenAI/USD respektive USD. **Dessa fungerar inte oförändrade med Berget.** Inför senare separata versionsmärkta Berget-/EUR-profiler och inputkontroll. Skriv aldrig EUR som `estimatedCostUsd`. Session/2 kan återanvända `Archive.importLive`, `mode=live`, `location=remote`, verklig modellmetadata och bundna digester; fulla försöksloggar behöver eget granskningsbart körunderlag. SR:s hårdkodade Responses-fingerprint är inte bevis för Berget-konfigurationen. Partial/failed, omappade fynd och blockerare ska fortsätta hindra överlämning.

## Modell och kommersiella villkor

**Ett villkorat förstahandsval: `google/gemma-4-31B-it`.** Berget rekommenderar modellen för svenska/skandinaviska tillämpningar med uttryckligt språkkrav; det passar SR:s befintliga svenska instruktion. Den är listad med JSON-schema och generell analysförmåga. Detta är bättre underlag för valet än bara lågt pris, men inget bevis på SR-kvalitet. [Bergets modellvalsguide](https://docs.berget.ai/models/choosing-a-model).

| Uppgift | Belägg och begränsning |
|---|---|
| Tillgänglighet / ID | Exakt ID finns i aktuell kapabilitetsmatris; allmänt tillgänglig enligt Bergets publicering 2026-05-05. Kontoåtkomst och driftsstatus har inte anropats. |
| Kontext | Google anger **256K** för grundmodellens 31B-variant. Detta är **inte verifierad serverkontext hos Berget**. |
| Output | Berget dokumenterar klientparametrar men inget verifierat modellspecifikt outputmaximum. Stöd för SR:s 20 000-tokensteg är därför inte belagt. |
| Pris | Officiellt publicerat **0,25 EUR/miljon inputtoken och 0,50 EUR/miljon outputtoken**, 2026-05-05. Samma tal finns i aktuell offentlig sidkod, men dagens debiteringstariff är inte oberoende verifierad mot den dynamiska katalogen. |
| Reasoning | Grundmodellen har konfigurerbar thinking. Bergets exakta mapping, standardläge och tak/debitering för denna modell behöver verifieras. |

Källor: [Bergets modellpublicering](https://berget.ai/en/blog/gemma-4-general-availability), [Googles modellkort](https://ai.google.dev/gemma/docs/core/model_card_4), [offentlig katalogkod läst som text](https://berget.ai/assets/chunks/chunk-VRmENw-A.js). Modellkortets kontext och funktioner får inte likställas med en specifik serverdeployment. Ingen andra kandidat behövs innan dessa gemensamma kompatibilitetsfrågor är lösta.

Den [aktuella prissidan](https://berget.ai/sv/pricing) anger **EUR, exklusive moms**: Trial 0 EUR/månad med 5 EUR startkrediter, **kort krävs**, ingen debitering vid registrering enligt FAQ. Fortsatt API-åtkomst efter provet kräver plan från 25 EUR/månad; ren pay-as-you-go utan plan erbjuds inte. Överförbrukning debiteras separat; betalda planer kan använda engångspåfyllning eller automatiska regler. Cachetoken har samma inputpris. Svenska privatpersoner anges få 25 % moms: Starter blir 31,25 EUR. Sidans uppgifter om företagsmoms måste stämmas av för det faktiska kontot, inte antas generellt.

[Allmänna villkor](https://berget.ai/en/terms), senast daterade 2025-10-16, komplicerar provlöftet: §12 medger noll/negativt saldo och rätt att stänga av, inte ett utlovat exakt debiteringsstopp. §13 medger avgifter efter provperiod och kräver uppsägning om man inte fortsätter. Dessutom avser §1 professionell användning, medan pris-FAQ diskuterar privatpersoner. **Provets löptid, automatisk övergång, påfyllningens standardläge och tillämplig kontotyp är inte klarlagda.** Före eventuell registrering behövs ett tydligt besked om dessa punkter. Ingen kontakt med leverantören har skickats.

## Kostnadsram för exakt c3-r1 + clear

Oförändrade SR-tak per fall: 8 000 + 20 000 + 5 000 outputtoken, med högst en lika stor formatreparation per steg. För båda: **högst 12 genereringsförsök, 132 000 outputtoken**, om leverantören verkligen tillämpar taken på all debiterad generering. Inga extra retries. Inputen måste räknas komplett före varje dispatch: prompts, källor, utkast, register, schema/inramning, tidigare resultat och reparationssvar. Överskridande ska stoppa utan trunkering.

**Verifierbar maximal totalkostnad: ännu inte möjlig att ange.** Ingen fullständig Berget-räkningsendpoint, avgift eller verifierad lokal övre räknegräns identifierades. Grundmodellens tokenizer bevisar inte serverns inramning och eventuella tillägg. Inte heller är serverns output-/reasoningtak fastställda. Modellkatalogens statiska HTML saknar tariff-/kontextvärden; sidkoden hämtar modellobjekt dynamiskt. Inga katalog-API-anrop gjordes, och statisk sidmetadata är inte ett bindande aktuellt prisbesked.

Enbart **villkorad budgetmatematik**, inte reservation eller prognos: med de publicerade Gemma-priserna, ett faktiskt kontrollerat inputtak `I` per försök och total verifierad räkningsavgift `C` i EUR blir ramen

`12 × I × 0,25 / 1 000 000 + 132 000 × 0,50 / 1 000 000 + C = 0,000003 × I + 0,066 + C EUR exkl. moms`.

Exempel `I=32 768`: **0,164304 EUR + C** exkl. moms; 0,20538 EUR + 1,25×C om 25 % moms gäller. Inputtaket är här ett räkneexempel, **inte** en dokumenterad Berget-gräns eller ett bevis att fallen ryms. Det reserverar inte hela modellkontexten. Om en framtida räkningslösning kräver ett anrop per försök blir `C` högst 12 gånger dess verifierade maxavgift; avgiftsfrihet har inte antagits. Större input kräver nytt uttryckligt tak och reservation, inte automatisk höjning.

Med dessa villkor ser tokenkostnaden liten ut relativt 5 EUR startkredit, men **ett genomfört prov inom krediten är inte verifierat**. Trial kan enligt pris-FAQ börja utan egen betalning; behov av egna pengar för hela provet kan inte avgöras säkert innan gränser och provvillkor är klara. Efter provet krävs betald plan. Ingen numerisk förbrukningsprognos lämnas utifrån testsvar.

## Val av nästa steg

| Väg | Fördel | Återstående hinder |
|---|---|---|
| Berget / Gemma 4 31B | Svenskinriktad större modell, publicerat låg tokenkostnad, svensk drift. | Ny provider och EUR-transport; inputräkning, output/reasoning, faktisk tariff och provvillkor. |
| Lokal Qwen3.5-4B Q4_K_M / M3 8 GB | Ingen extern tokenavgift. | Ny adapter och modellnedladdning; stor kontext konkurrerar om 8 GB. Tvåfallsprovets genomförbarhet och kvalitet är inte belagda. |
| Befintlig OpenAI-väg | Riktig SR/provider, journal och inputgrind redan offlineverifierade. | Aktuell prisprofil, räkningsavgift och faktiska tokenantal behövs fortfarande; tidigare 5-USD-exempel garanterar inte genomförande. |

**Minsta rekommenderade arbete:** klargör först OpenAI-vägens kvarstående räknings-/prisvillkor enligt [befintlig förberedelse](../onboarding-transport/prepared-input-2026-10-09/REPORT.txt), utan att köra den. Om de kan lösas är den kortaste vägen till kvalitetsdata där. Berget innebär just nu mer integrationsarbete än observerad nytta för första provet. Om svensk drift är ett separat krav blir nästa Berget-uppgift att belägga de saknade gränserna, därefter bygga en offlineverifierad provider/transport; inget liveprov ska maskeras som kompatibilitetstest utan budget.

Senare prov: exakt en granskning vardera av oförändrade c3-r1 och clear genom alla tre SR-steg. Frys modell/config, käll-/utkast-/registerdigester, prompts, pris och ramar före körning; håll `diagnostic/gold.json` utanför granskningsindata. Bedöm bokning→scenarioklassificeringsfelet med konkreta SR-bedömningar och källcitat. **CE3:s befintliga kontraktsblockering för c3-r1 räknas inte som SR-träff.** Mät missar, falska fynd i clear, fälttäckning separat från fyndredovisning, schemafel, reparationer, tid och faktisk/osäker kostnad. Ofullständiga körningar redovisas separat. Giltig JSON eller complete bevisar inte korrekthet; två syntetiska fall bevisar inte kundvärde.

Kontroller i detta pass: källäsning, SR-kodpinne/filhashar och dokument-/Git-kontroll. Ingen adapter implementerad eller regressionstestsvit körd för dokumentändringen. **Inga tjänstestarter, modell-/tjänste-API-anrop, konton, betalningar, installationer eller kostnader (0 USD/0 EUR).** Endast offentliga webbsidor, statisk API-dokumentation och offentlig sidkod lästes. SR-repot, CE3-motorn, UI, frysta fall och befintligt arbete är orörda.
