# Resultat: liten parad liveutvärdering

**Ingen unik detektionsnytta från SR-principgrenen observerades i de åtta jämförbara paren.** Egenkontrollen identifierade tre av fem bedömda utkastfel; SR-grenen identifierade två, båda även upptäckta av egenkontrollen. SR-grenen gav färre invändningar och frågor, men utelämnade också flera nödvändiga kompletteringar. Detta är en preliminär, källbunden kodagentsbedömning mot fryst facit, inte oberoende mänsklig kvalitetsvalidering.

Körningen stoppades av leverantörens **slut på befintliga API-krediter**, inte av studiens 5 USD-tak. Ingen påfyllning, kontoändring eller återförsök gjordes. Kontrollfallet utan avsedda problem saknar därmed fullständig parad jämförelse. Ingen modell ändrades efter granskning; resultatet säger inget om förbättrad slutmodellskorrekthet eller faktiskt kundarbete.

## Genomförande och bortfall

2026-10-09, 10:47:25–10:52:36 UTC. Befintlig OpenAI-konfiguration från SR lästes utan att ändras. Begärd och returnerad modell i alla 26 svar med modellidentitet: `gpt-5.6-terra`. Aliaset ger ingen garanti om samma backendversion vid framtida körning. Standardnivå, `reasoning.effort=low`, `store=false`, inga verktyg, högst 6 000 outputtoken, inga återförsök.

SR-grenen använder relevant grounded-arbetssätt: fullständig källtext, explicit item-täckning, källtyp och säkerhetsgrad, exakta citat, skillnad mellan saknat stöd och motsägelse samt separata fynd. Allt sker i ett strukturerat anrop. **Ingen SR-kod importeras och detta är ingen integration eller kvalitetsutvärdering av befintliga SR-programmet.** Samma grundmodell i A och B ger korrelerade felrisker.

| Fall | Upprepning 1 | Upprepning 2 |
|---|---|---|
| 1. Mål kontra godkännande | Utkast + A + B mottagna, kontraktsgiltiga | Alla mottagna; A har kontraktsfel |
| 2. Okänd kostnad och kontrolltid | Alla mottagna, kontraktsgiltiga | Alla mottagna, kontraktsgiltiga |
| 3. Rättat svar och konflikt | Alla mottagna; utkastets kontraktsfel följer med A/B | Alla mottagna; B har kontraktsfel |
| 4. Funktioner utanför profilen | Alla mottagna, kontraktsgiltiga | Alla mottagna, kontraktsgiltiga |
| 5. Tydligt fast underlag | Utkast och A mottagna; B nekades | Ej startad efter leverantörsstopp |

27 dispatchar: 26 strukturerade svar och ett HTTP 429 med `insufficient_quota` / `credit_balance_exhausted`, utan usage. 8/10 par har båda granskningssvaren; 5/10 har dessutom tre kontraktsgiltiga steg. Ett par är delvis genomfört och ett helt okört. Alla finns kvar i nämnaren. Se [run.json](results/run.json), [felresponsen](results/c5-r1-B/response.txt) och [budgetloggen](results/ledger.json).

Facit, fall, prompts, protokoll, körkod och schemasnapshot frystes innan första dispatch: [freeze.json](freeze.json). A och B har byteidentisk input för varje genomfört par och exakt samma utkast-digest, schema, modell och tokenram. A/B-ordningen växlas i andra upprepningen; anropen är stateless. Facit eller den andra grenens svar skickades aldrig. Inga fel injicerades och inga utkast korrigerades.

## Fel och detektion

Bedömningen är avsiktligt uppdelad i konkreta käll-/modellobservationer, mekaniska kontraktsresultat och preliminära semantiska slutsatser. [adjudication.json](adjudication.json) anger alla fynd, frågor, citat, uppgifts-ID, etiketter och motiveringar. [gold.json](gold.json) är facit låst före körningen och ändrades inte när resultaten blev synliga. Ingen separat LLM-domare anropades. Kodagenten är dock själv en AI och bedömningen är inte blind; en människa behöver kontrollera de semantiska gränsfallen innan dessa räknas som etablerat kvalitetsfacit.

| Par | Konkret observation i första utkastet | A | B |
|---|---|---|---|
| c1-r1 | `plan_p` får `user_fact` trots källa `brief.kind=document`; texten ”Bygg en provmodul” är korrekt. Mindre proveniensetikettfel, även flaggat deterministiskt. | Missat | Missat |
| c1-r2 | Inget säkert materiellt fel identifierat. Mål dag 2 och okänd beskedstid bevaras. | Ett falskt och ett osäkert fynd | Inga fynd |
| c2-r1 | `gap_control_notice_times` och frågor täcker tid men utelämnar kontrollutfall/relation till godkännande. Källan säger ”Båda kräver ett separat kontrollbesked”, inte att alla besked är positiva. | Upptäckt | Missat |
| c2-r2 | `analysis.question`: ”bland planer med separat kontrollbesked senast dag 5”; källan kräver ”bland planer som blir godkända senast dag 5”. Kriterie-item är korrekt men analysfrågan försvagas. | Upptäckt | Upptäckt |
| c3-r1 | `assumption_test_day` är ett känt `scenario_assumption`, medan svaret säger ”jag skrev fel, provet är bokat dag 4”. Rättelsen väljer inget hypotetiskt scenario. | Missat | Missat |
| c3-r2 | Utkastets frågor täcker gräns och provresultat men saknar godkännandetid för dag-5-kriteriet. ”provet är bokat dag 4” avgör inte den tidpunkten. | Upptäckt, för svag impact | Upptäckt, ogiltigt granskningskuvert |
| c4-r1, c4-r2 | Inget materiellt fel identifierat: optimering, upprepning och ombokning markeras blockerade av profilen. Inga kostnader eller vinnare hittas på. | Inga fynd | Inga fynd |
| c5-r1, ej parat | Korrekt fast besked dag 2, villkorat leveransförsök dag 3, initialvärden, klocka och avgränsning. Inga relevanta fel identifierade. | Inga fynd/frågor | Svar saknas |

Fem bedömda fel i åtta jämförbara utkast: ett mindre proveniensetikettfel, två materiella betydelse-/typfel och två utelämnade körbarhetskompletteringar. Utelämnandena är inte påståenden om att kontroll redan lyckats. Gränsen för vad ett preliminärt utkast måste innehålla är en bedömningsfråga och ska kontrolleras av mänsklig granskare. Tre av åtta parade utkast har inga identifierade fel; fyra om det mindre etikettfelet undantas. Det ytterligare observerade kontrollutkastet c5-r1 är också utan identifierade fel.

| Mått, endast åtta jämförbara par | A: egenkontroll | B: SR-principer |
|---|---:|---:|
| Upptäckta unika fel i råsvaren | 3/5 | 2/5 |
| Missade bedömda fel | 2 | 3 |
| Falska fynd | 1 | 0 |
| Osäkra fynd, varken träff eller falskt säkert fel | 1 | 0 |
| Träffar i ett kontraktsgiltigt granskningspaket | 3 | 1 |
| Nya träffar utöver andra grenen | 1 | 0 |
| Frågor i granskningssvar | 14 | 5 |
| Preliminär relevans, medel 1–5 | 4,07 | 4,60 |
| Preliminär begriplighet, medel 1–5 | 4,07 | 4,40 |

Rå detektion är skild från användbar, kontraktsgiltig granskning. B:s c3-r2-fynd kan inte importeras utan att hantera det rapporterade kontraktsfelet; ingen sådan reparation gjordes. Om det mindre proveniensetikettfelet undantas blir detektion A 3/4 och B 2/4. Vid par utan initialfel är recall ej tillämplig, inte 100 %. A:s fyndprecision kan inte uttryckas som ett enda säkert tal eftersom ett fynd är osäkert; tre träffar, ett falskt och ett osäkert är den fullständiga redovisningen. B:s två fynd motsvarar bedömda fel, men ett ligger i ogiltigt kuvert.

A:s falska fynd i c1-r2 kräver `scenario_choice` för en uppgift som är **unknown/null**. Kontraktet kräver detta vid ett **känt** scenarioantagande, vilket inte föreligger. Den andra invändningen vill ha garanterad färdigtid: det kan vara en relevant avgränsningsfråga men är inte ett säkert fel i det deklarerade leveransvillkoret. Dessa gränsfall finns öppet dokumenterade, inte bortstädade ur resultatet.

## Källstöd och kundfrågor

Samtliga 26 mottagna svar passerade wire- och JSON-schemavalidering samt exakt citatupplösning. Granskarna använder originalkällorna och bevarar de två motstridiga gränserna 8 och 10; rättelsen till dag 4 finns kvar tillsammans med den gamla dag-2-uppgiften. Detta betyder inte att deras etiketter och slutsatser alltid stöds: båda missar scenariotypningen i c3-r1. Ett ordagrant matchat citat är inte ett bevis på hela uppgiftens innebörd.

B:s högre medelvärde för de **fem frågor som faktiskt ställdes** ger ingen övergripande vinst. B saknar frågor om öppet beskedsbehov i c1-r1/r2, samtliga kompletteringar i c2-r1 och avgränsningsvalet i c4-r1/r2. A missar kostnadsfrågan i c2-r2. För c3-r2 saknar B gränskonfliktens fråga, medan A täcker den. Varje granskningsgrens frågor bedöms separat; utkastets ursprungliga frågor ligger kvar oförändrade och har inte automatiskt slagits samman med grenen.

I profilfallet frågar A efter kördata och en förenklad sekvens innan kunden tydligt fått välja mellan fast avgränsning och annan analysfunktion. I c3 förutsätter flera frågor ett redan utfört prov trots att källan bara anger en bokning. Frågor om nödvändig godkännandetid får ibland endast `limits_conclusion`, trots att den avsedda fasta analysen kräver komplettering. Detta är observerade svagheter i frågekvalitet och hantering av blockerande behov, särredovisade från antal upptäckta modellfel.

Ingen kundläsare, svarstid, korrigeringsrunda eller slutmodell ingår. Antal frågor är en grov arbetsindikator; färre frågor kan här vara bristande täckning. Det tydliga kontrollfallet gav inga onödiga frågor i utkastet eller A, men B:s beteende på detta fall kunde inte mätas.

## Schema och kontrakt

Fem kuvert underkändes av de oförändrade tvärreferens-/tillståndskontrollerna:

- `c1-r2-A`: `ABSENCE_SCOPE`. Kategorin `profile_gap` kombineras med `absence_in_supplied_material`, som kräver `unsupported`.
- `c3-r1-draft`: `SCENARIO_LABEL`. En ersatt uppgift behåller `scenario_choice`, trots att den inte är ett aktivt känt scenario. Samma utkast gör även c3-r1-A/B:s kompletta paket ogiltiga; detta är ett ärvt fel, inte två nya granskarfel.
- `c3-r2-B`: `REVIEW_TARGET`. Granskningen tar även med `value_test_day_a1` med status superseded i sin aktiva granskningsmängd.

Inga poster togs bort och ingen leverantörsreparation gjordes. Rådata, lyckad schemavalidering och misslyckad kontraktsvalidering finns sida vid sida. Tester med mockad transport verifierar budget, fel och adapterlogik; de räknas inte som belägg för AI- eller SR-kvalitet.

## Tid, token och kostnad

Taxan verifierades före dispatch i [officiell modellinformation](https://developers.openai.com/api/docs/models/gpt-5.6-terra): 2 USD/M input, 0,20 USD/M cached input och 12 USD/M output; cache-skrivningar kan kosta 1,25 × input. Structured Outputs och begränsningen som omfattar även reasoning följer [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) och [Responses-referensen](https://developers.openai.com/api/reference/python/resources/responses/methods/create). Daterade inställningar och budgetformel finns i [protocol.json](protocol.json).

| Steg, hela försöket inkl. bortfall | Dispatchar | Input / cached | Output | Anropstid | Usage × ordinarie taxa |
|---|---:|---:|---:|---:|---:|
| Första utkast | 9 | 16 538 / 11 869 | 13 070 | 111,368 s | 0,168552 USD |
| A | 9 | 29 024 / 0 | 12 112 | 123,431 s | 0,203392 USD |
| B | 9, varav 1 nekat | 27 309 / 7 763 | 7 479 | 74,765 s | 0,130393 USD + okänd för nekat anrop |
| Totalt | 27 | 72 871 / 19 632 | 32 661 | 309,564 s | **0,502336 USD + okänd för nekat anrop** |

Cached ingår i input, inte utöver. Samtliga 26 lyckade svar har usage. Leverantörens faktura har inte hämtats, och inget nollpris antas för anropet utan usage. Övre taxeberäkning för mottagna svar med cache-skrivningsmarginal är 0,528956 USD; plus full reservation 0,152 för det nekade anropet ger **0,680956 USD** som konservativ kostnadsredovisning. Budgetloggen behåller ännu försiktigare alla 27 fulla reservationer: **4,104 USD**. Den före körning låsta gränsen för alla 30 möjliga anrop var **4,56 USD**, under 5 USD.

I de åtta kompletta råsvarsparen kostar A totalt 0,185866 USD och tar 115,439 s; B kostar 0,130393 USD och tar 73,997 s. Som **ersättning för A** är B där 0,055473 USD billigare och 41,442 s snabbare totalt. B−A varierar per par mellan −12,039 och +5,446 s, och mellan −0,015750 och +0,003090 USD. Som **extra granskning efter A** tillför B 0,130393 USD och 73,997 s sekventiell anropstid i dessa åtta par, utan unik felträff. Skillnaden påverkas av svarslängd och promptcache: A hade inga cached token, B hade 7 763. Ingen latency- eller kostnadsgaranti kan dras av detta lilla stickprov.

Alla steg och parade differenser finns i [summary.json](results/summary.json); det nekade anropets korta svarstid ingår i totalen men räknas inte som snabb lyckad B-granskning.

## Slutsats och minsta nästa steg

Det finns ingen observerad unik SR-detektionsvinst i denna körning. SR-principgrenen producerade färre tveksamma invändningar men också färre nödvändiga frågor. Båda grenarna delar blindfläckar, och kontraktsvalidering fångade fel som deras språkliga bedömningar inte hanterade. Resultatet motiverar ingen produktintegration eller uppgift om förbättrad slutmodell.

Minsta nästa steg är **mänsklig granskning av de fem felbedömningarna och sju fynden**, inklusive det mindre etikettfelet och de två utelämnandena. Därefter kan de fyra saknade modellstegen (B i c5-r1 samt utkast/A/B i c5-r2) genomföras som en tydligt separat komplettering när en behörig användare har ordnat användbara API-krediter och godkänt en ny budget. Det skulle också vara ett nytt retrybeslut för det nekade B-anropet; denna körnings noll-retrypolicy och loggar ska stå kvar. Bygg inte vidare på produkten utifrån dessa preliminära siffror.

Fem syntetiska fall, varav kontrollfallet ofullständigt, ger ett första tecken och ingen generell evidens för kvalitet eller kundvärde.
