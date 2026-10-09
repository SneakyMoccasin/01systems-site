# Lokal modell för riktig SR: genomförbarhet 2026-10-09

**Providerkopplingen är möjlig utan att ersätta SR-pipelinen. Denna Mac är däremot inte ett tryggt val för ett fullständigt kvalitetsprov med oförändrade granskningsramar.** 8 GB delat minne är huvudbegränsningen. Rekommendationen är först en isolerad offlineadapter, därefter ett uttryckligen beslutat, stoppbart resursprov. Att båda fallen kan slutföras är inte verifierat. Ingen mindre modell rekommenderas enbart för att den får plats.

Bas: CE3 `a7c76ed19e6e87eac6fb2d48beb58d0b64b9fad3`, SR `e7308010ecbea1ebe46c3298aa6a96f06381ad0a`, `structured-grounded/1`. SR:s fulla commit och samtliga 49 pinnade filhashar kontrollerades med `structured/runtime.cjs::verifyCode`, utan modellkörning. Befintliga oregistrerade CE3-filer lämnades orörda; SR:s arbetskatalog var ren. Detta är dokumentation, ingen implementation eller liveverifiering.

## Dator och befintliga modeller

Lokalt avläst med `system_profiler`, `sw_vers`, `df`, appens Info.plist samt Ollama-manifest och GGUF-metadata. Inga tensorer laddades till en modellruntime.

| Resurs | Avläst värde |
|---|---|
| Mac | MacBook Air, Mac15,13, Apple M3 |
| CPU/GPU | 8 CPU-kärnor, 10 GPU-kärnor, Metal |
| RAM | **8 GB unified memory**, delat av operativsystem, CPU och GPU |
| macOS | 26.4.1, build 25E253 |
| Disk | Cirka **12 GiB tillgängligt** på APFS-datavolymen vid kontrollen |
| Runtime | `/Applications/Ollama.app` **0.32.1**, CLI på PATH |

Inga andra kontrollerade runtimes hittades via PATH, Applications eller standardmodellcache för LM Studio, llama.cpp, MLX, Hugging Face och Jan. Detta är ingen fullständig disksökning. Inga relevanta `OLLAMA_*`-inställningar fanns i undersökningsprocessens miljö; en redan körande tjänsts miljö och status är inte verifierade. Inga tjänster startades. Credentials och runtime-loggar lästes inte.

Ollamas lokala modellager upptar cirka 6,37 GiB. Taggarna är föränderliga; nedanstående identiteter kommer från filerna, inte från antaganden om dagens `latest`.

| Befintlig tagg | Faktisk lokal modell / kvantisering | Modellfil | Native kontext | Licens / bedömning |
|---|---|---:|---:|---|
| `llama3:latest` | Meta-Llama-3-8B-Instruct, Q4_0 | 4 661 211 424 byte | 8 192 | Meta Llama 3 Community License. Kontexten understiger SR:s supportstegs outputtak ensamt. Olämplig för detta oförändrade prov. |
| `phi3:latest` | **Phi-3-mini-128k-instruct**, 3,8B, Q4_0 | 2 176 177 120 byte | 131 072 | MIT. Lång nominell kontext betyder inte att den ryms i 8 GB. Rekommenderas inte som kvalitetsalternativ. |

Lokala manifest-SHA256: Llama `365c0bd3c000a25d28ddbf732fe1c6add414de7275464c4e4d1c3b5fcb5d8ad1`; Phi `4f222292793889a9a40a020799cfd28d53f3e01af25d48e06c5e708610fc47e9`. Modellfamiljernas primärkällor: [Meta](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct), [Microsoft](https://huggingface.co/microsoft/Phi-3-mini-128k-instruct). Ingen ny nedladdning behövs för dessa redan befintliga filer.

Phi-filens metadata anger 32 lager, 32 KV-huvuden och dimension 96. Beräknad okomprimerad FP16-KV-cache är `2 × 32 × 32 × 96 × 2 byte/token`: **3 GiB vid 8 192 token, 12 GiB vid 32 768**, utöver vikter, arbetsbuffertar och macOS. Detta är en arkitekturberäkning, inte uppmätt runtime-minne. Lägre cacheprecision ändrar villkoren och eliminerar inte behovet av mätning.

## Ett villkorat förstahandsalternativ

**Befintlig Ollama 0.32.1 + Qwen3.5-4B, tagg `qwen3.5:4b-q4_K_M`**, llama.cpp/GGUF-varianten. Ollamas officiella sida anger **Q4_K_M, cirka 3,3 GB nedladdning, Apache-2.0**, visat artefakt-ID `d8b0f5e9760c`. Paketet inkluderar en BF16-visionprojektor; provet ska enbart använda text. Den generiska `:4b`-taggen visar även en annan backendvariant på 4,0 GB och ska inte väljas implicit. Fullständiga manifest-/blobdigester och faktiskt vald backend måste låsas senare. [Exakt modelltagg](https://ollama.com/library/qwen3.5:4b-q4_K_M).

Kandidaten väljs för hybridarkitektur och dokumenterade instruktions-/långkontextresultat, inte bara liten filstorlek. Tillverkarens modellkort anger 262 144 tokens native kontext, thinking som standard och rekommenderar minst 128K för att bevara thinking-förmåga. Det är **inte** evidens för svensk SR-granskning, kvantiserad kvalitet eller prestanda på denna Mac. [Qwens modellkort](https://huggingface.co/Qwen/Qwen3.5-4B).

Utifrån [modellkonfigurationen](https://huggingface.co/Qwen/Qwen3.5-4B/blob/main/config.json) ger de åtta full-attention-lagren med fyra KV-huvuden och dimension 256 ungefär **2 GiB FP16-KV vid 65 536 token**, 4 GiB vid 131 072. Recurrent state, vikter, projektor, runtime-buffertar och macOS tillkommer. **Grov total uppskattning vid 64K: 7–10 GiB**, alltså nära eller över datorns RAM. Cache i q8 kan minska KV-delen, men backendstödet för just denna hybridmodell måste verifieras; det är ingen utlovad lösning. Ollama dokumenterar minnes-/precisionsavvägningen för cachekvantisering. [Ollama FAQ](https://docs.ollama.com/faq).

Slutsats för hårdvaran: en liten lokal inferens är tekniskt plausibel, men ett meningsfullt komplett tvåfallsprov kan inte rekommenderas som genomförbart ännu. Endast ett villkorat resursprov motiveras. Om oförändrade fält, input och output inte ryms ska resultatet bli **”maskinen otillräcklig för denna konfiguration”**, inte ett förenklat test. Ingen andra modell rekommenderas på tillgängligt underlag. Ingen tokens/sekund-prognos lämnas utan mätning.

Senare behövs **ingen ny runtime-installation som första åtgärd**. Den enda föreslagna modellnedladdningen är ovanstående 3,3-GB-paket, efter nytt beslut och disk-/minneskontroll. Cirka 12 GiB ledigt räcker till själva paketet men ger begränsad marginal för temporära filer, loggar och eventuell swap. Ingen automatiserad modell- eller runtime-uppdatering ska ingå. Eventuellt ytterligare tokenizerverktyg får väljas först när räkningsgränsen nedan har utretts; någon körklar installationslista för detta påstås inte finnas ännu.

## Faktisk SR-gräns och minsta integration

Läst i SR: `src/lib/providers/{types,openai}.ts`, `grounded/structured-v1/{run,contracts}.ts`, `grounded/{run,stage-schemas}.ts`, `pipeline/execution.ts` och `run-diagnostics.ts`. CE3-gränser: [structured](structured/README.md), [session/2](../onboarding-session/v2/README.md), [transport](../onboarding-transport/README.md).

`runStructuredGroundedReview(input, provider, 'sv', options)` tar redan en injicerad `ModelProvider`. Minsta tillägg är en isolerad lokal provider och runner i CE3, med `generateStructured(request)`, `name`, `model`, `mode='live'`. Anropa den **befintliga SR-funktionen direkt**. Den driver fortfarande `grounded_claim_extraction → grounded_support_assessment → grounded_adjudication`, med samma strukturerade prompts, fältregister, validering, citatkontroller och deterministiska täckning.

Providern skickar `request.instructions` som systemmeddelande och `request.input` som användarmeddelande, utan omskrivning. `z.toJSONSchema(request.schema)` skickas som Ollamas `format`, med `stream:false`. Separata käll-/utkastroller bevaras i SR-indatan; providern bygger inte om dem. Använd bara fast loopbackadress och lokal modellidentitet, ingen cloudfallback eller credentials. Befintlig OpenAI-provider har hårdkodad Responses-URL; en ändrad miljövariabel räcker inte för att byta leverantör. [Ollamas schema-API](https://docs.ollama.com/capabilities/structured-outputs).

**Schemakrav:** strict objects, required/properties, additionalProperties=false, nästlade objekt/arrayer, maxItems=80, minItems, enum, stränglängder, digest-regex, heltalsgränser och numerisk confidence 0–1. Ollamas schemafunktion är ingen fullständig kontraktsgaranti. llama.cpp beskriver en delmängd av JSON Schema, tyst överhoppade begränsningar och numeriska gränser som stöds för integer men inte number. Behåll alltid SR:s Zod- och semantikvalidering, inklusive separata bedömningar av källstöd och klassificering, bindningar, dubletter och exakta citat. Testa de tre **verkliga** schemana mot den valda backendversionen. [Primär dokumentation om grammatikbegränsningar](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md). Lägg inte tyst till schematext i granskningsprompterna för att få bättre svar.

**Reparationer är inte automatiskt återanvända:** de ligger i `OpenAIProvider`, inte i trestegsorkestreringen. En ny lokal provider måste uttryckligen få samma begränsade policy: högst en formatreparation per steg, identiska ID:n och antal poster, ingen semantisk omtolkning; samtliga försök arkiveras. Detta är providerarbete, ingen kopierad granskningspipeline. Om exakt återanvändning av den befintliga reparationsimplementationen krävs behövs först en liten separat SR-refaktorering till gemensam hjälpfunktion och **ny kodpinne**. Den möjligheten får inte beskrivas som redan tillgänglig i `e730801`.

**Arkiv:** använd befintlig `Archive.importLive` och producentmetadata med `mode=live`, `response_origin=model_responses`, `location=local`. Spara verklig begärd/returnerad modell, usage och reparationsdiagnostik. Lokal inferens är inte mock. En separat versionsmärkt körmanifestfil bör binda runtime/backend, fulla modelldigester, kvantisering, kontext, sampling, råa försök och tider till arkivdigest; befintligt strikt producentformat ska inte utökas godtyckligt. SR:s nuvarande fingerprint beskriver hårdkodat `api:responses`; bevara originalet men använd det inte som bevis för Ollama-konfigurationen. Återöppning och replay av sparade svar ska fortsatt ske utan inferens.

## Kontext, output och avbrott

Registret omfattar **54 fält för c3-r1, 77 för clear**. Alla steg innehåller register och originalutkast; supportsteget får separat originalunderlag. Senare steg får tidigare resultat, och adjudication får dessutom ursprungliga fältbedömningar. Reparationsinput inkluderar det ogiltiga svaret.

Avlästa `stage.input` från befintliga **syntetiska offline-receipts**, UTF-8-byte:

| Fall | Extraktion | Support | Adjudication |
|---|---:|---:|---:|
| c3-r1 | 20 888 | 54 229 | 173 044 |
| clear | 27 159 | 70 208 | 408 334 |

Därtill kommer instructions (698 byte), schemas (1 519/2 705/1 671 byte) och runtime-inramning. Detta visar storleksökningen men är **varken tokenräkning, liveprognos eller nödvändig minsta kontext**. Testsvaren är förskrivna och senare verkliga svar okända.

Behåll SR:s outputtak **8 000 / 20 000 / 5 000**, samma tak vid varje möjlig reparation: högst sex genereringar och 66 000 outputtoken per fall, tolv och 132 000 för båda. En kontext måste rymma aktuell full input **plus** outpututrymme. Exempel: 32 768 input + 20 000 output kräver minst 52 768 total kontext före eventuell ytterligare inramning. Ollamas dokumenterade standard är bara 4K på små minneskonfigurationer; `num_ctx` måste väljas explicit. [Kontextdokumentation](https://docs.ollama.com/context-length).

Blockerande integrationsfråga: verifiera tokenisering och chattemplate för exakt modell/backend, inklusive schemas påverkan, innan en hård lokal inputgräns kan utlovas. Byteantal eller molnmodellens tokenizer duger inte. Källkoden för Ollama 0.32.1 har `truncate` och `shift`; båda ska sättas false och faktiskt felbeteende verifieras. `_debug_render_only` ger renderad text men är inget verifierat publikt tokenräkningskontrakt. Stoppa vid överstor input, saknad säker räkning eller avslut p.g.a. token-/kontextgräns; trunkera inte och bygg inte på en ofullständig JSON-sträng. [Ollamas versionerade typer](https://github.com/ollama/ollama/blob/v0.32.1/api/types.go), [promptkod](https://github.com/ollama/ollama/blob/v0.32.1/server/prompt.go), [routes](https://github.com/ollama/ollama/blob/v0.32.1/server/routes.go).

Molnets 90 s/anrop, 120 s/pipeline och CE3-workergräns är inte rimliga obevisade lokala antaganden. Förslag för ett senare stoppbart prov: **10 min/försök, 30 min/fall**, sekventiellt, inga automatiska retries. Detta är tidsgränser, inte hastighetsprognoser. Pipeline-deadline kan redan anges via options; lokal provider/worker måste hantera egna deadlines, AbortSignal och verifierad avbruten servergenerering. Tidigare svar/usage bevaras vid stopp. Arkivera `done_reason`, prompt-/outputtoken och uppdelad laddnings-/genereringstid från [Ollamas chat-API](https://docs.ollama.com/api/chat).

## Nästa avgränsade implementation och prov

1. **Endast offlineimplementation först:** lokal provider/runner med injicerad nätverksfri testtransport, full attempt-logg, schema-/reparationskontroll, resursstopp och session/2-arkiv. Behåll SR-pinnen. Testa timeout, sena svar, utebliven usage, fel schema, reparations-ID:n, inputgräns även senare och oförändrade sessionsblockerare. Utred räknings- och backendgränsen före en körbar inferensväg.
2. Efter separat beslut: hämta endast den valda modellartefakten, verifiera runtime/backend och digester, stäng av cloudfunktioner, bind loopback och använd en modell/en begäran åt gången. Föreslagen första resursprofil är högst 65 536 total kontext, oförändrade outputtak, text-only, `think:false` och explicit fryst sampling. Detta avviker från Qwens thinkingstandard och molnmodellens beteende; det är ett eget prov, ingen likvärdig modellkonfiguration. Cacheprecision och RAM/swap måste mätas och låsas, inte justeras tyst under körning. Avbryt om ramen kräver trunkering eller ohållbart minne.
3. Kör exakt en granskning vardera av oförändrade `diagnostic/c3-r1-proposal.json` och `diagnostic/clear-proposal.json`. Lås SHA256 före/efter. Facit i `diagnostic/gold.json` läses endast av efterbedömningen. Inga testsvar eller facit ska gå till providern; mellan stegen går bara SR:s verkliga stegresultat vidare. Bevara även avbrutna fall, råsvar, formatfel och reparationer. Ett resursstopp är ett resultat, inte upptäcktsmiss eller godkännande.
4. Bedöm manuellt mot separat facit med konkreta fält/källcitat: upptäckt av bokning→scenario-felet i c3-r1, missade fel, falska fynd i clear, bedömningarnas stöd/klassificering, fälttäckning och separat fyndredovisning. Räkna schemafel/reparationer deterministiskt; mät varje stegs väggtid, token, peak-minne, swap och total tid. Bedöm föreslagen kompletterings relevans och begriplighet separat; inga automatiska kundfrågor eller modelländringar uppfinns av sessionshållaren.
5. Återöppna arkiven utan modell och kontrollera digester/replay. De frysta diagnostikfallen ger fristående arkiv; c3-r1:s befintliga kontraktsavvikelse ska bevaras och får inte normaliseras för att få en giltig session. Verifiera session/2-anslutningen separat med befintlig kompatibel syntetisk fixture. **Giltig JSON och complete betyder inte korrekt granskning eller tillåten överlämning.** Ingen CE-kompilering eller körning ingår.

Resultatet kan visa att datorn inte räcker. Två syntetiska fall kan inte belägga generell kvalitet eller kundnytta. Lokal SR-inferens innebär heller inte ett helt lokalt kundflöde: filuppladdning, OCR och AI-generering av modellförslag omfattas inte.

Verifiering i detta pass: statisk käll-/metadataanalys, SR-kodpinne med filhashar, avläsning av befintliga receipts och Git-diffkontroll. Inga inferens- eller regressionstester kördes för dokumentändringen. **Noll installationer, modell-/programnedladdningar, tjänstestarter, modellanrop och betalda API-anrop; 0 USD.** Endast offentliga dokumentationssidor hämtades. Molnprovet kördes inte. Produktkod, SR-repo, motor, UI, frysta fall och befintligt arbete är bevarade. Driftsatt beta och lokal/live granskningskvalitet är fortfarande inte verifierade.
