# Förberett senare liveprov: bokning kontra valt scenario

**Inte kört live. Kostnad för externa AI-anrop i detta pass: 0 USD.** API-krediterna var slut i föregående pass; ingen påfyllning eller nytt försök görs. Detta är en riktad diagnostik av den riktiga lokala SR-pipelinen, inte generell kvalitetsvalidering eller en ny parad utvärdering.

## Låst material

- [c3-original.json](diagnostic/c3-original.json): exakt syntetiskt originalunderlag från c3, inklusive gammalt svar a1 och rättande svar a2, där ”provet är bokat dag 4”. Textinnehållet är oförändrat.
- [c3-r1-proposal.json](diagnostic/c3-r1-proposal.json): **byteidentiskt** med `d795534`-körningens första modellutkast c3-r1. `assumption_test_day` är känt `scenario_assumption` trots att källan är en faktisk rättelse, inte uttryckligt scenarioval. Även det separata historiska `SCENARIO_LABEL`-kontraktsfelet för en superseded uppgift bevaras.
- [clear-proposal.json](diagnostic/clear-proposal.json): byteidentiskt tydligt c5-r1-utkast inklusive dess originalkälltext, fasta analys och avgränsning. Inget motsvarande scenariotypfel. Detta är en separat tydlig kontroll, inte en konstruerad rättning av c3.
- [gold.json](diagnostic/gold.json): förväntad felinnebörd, fråga och kontrollfall. **Får inte skickas till SR.** Den förväntade frågan är: ”Är dag 4 en faktisk bokning eller ett hypotetiskt scenario som du uttryckligen vill använda?” Det viktiga är korrekt åtskillnad, inte exakt samma ord.
- [manifest.json](diagnostic/manifest.json): hashes av material, presenterare, kodpin och facit. Vid ändring skapas ett nytt diagnostikpaket; detta facit skrivs inte över efter ett liveutfall.

`diagnostic.cjs prepare NEW_DIRECTORY` läser bara de två namngivna förslagsfilerna och deras inbäddade originalkällor. Den läser inte gold. Utdata innehåller de faktiska `sourceMaterial`, `question`, `reviewText`, versionsdigester och positionskartor som ska lämnas till SR. Frågan förklarar kontraktets typer generellt utan att nämna dag 4 eller ge facit.

## Vad offlinearkivet bevisar

[offline-records](offline-records/) innehåller två testtapes, preparerade paket och SR-receipts. Tapes är handskrivna testdubblar; den generiska byggaren i `test-tape.cjs` skapar förskrivna claim-/assessment-/adjudication-svar. Den riktiga pipelinefunktionen kör dem och producerar resultatet. Det sparade c3-fyndet är avsiktligt förskrivet, **inte en upptäckt av SR:s AI**. Återuppspelning verifierar överföring, exakta citat, stegordning, bevarade originalfynd och översättning. Tidsstämplar, UUID och uppmätta millisekunder kan skilja mellan offlinekörningar; sakresultaten är reproducerbara.

## Senare körning med explicit budget

1. Begär/fastställ ett separat hårt budgetbelopp **B USD** för just två fall. Verifiera användbara befintliga credentials och aktuella officiella priser/modellegenskaper i det passet. Köp eller fyll inte på automatiskt. Bind SR-commit och dependencies; verifiera även deployment om provet ska representera driftsatta betan.
2. Använd `runGroundedReview` från samma SR-kod och dess faktiska providergräns. Behåll de tre granskningsstegen och versionsmärkta prompts. Ladda endast prepared-paketens tre textfält och språk. Skicka varken gold, offline-tape, tidigare granskningssvar eller orelaterad repodata.
3. Förbered en beständig budgetvakt som reserverar kostnad innan providersteg kan göra **både första försök och intern formatreparation**. Befintliga SR-tak per fall är 8 000 + 20 000 + 5 000 outputtoken; med en reparation per steg blir det högst sex API-anrop och 66 000 outputtoken per fall. Två fall ger högst **12 försök och 132 000 outputtoken**. Inga ytterligare återförsök eller modellbyten.
4. Välj en explicit indatagräns I token per transportförsök och stoppa före dispatch om den överskrids. Inkludera schema, instruktioner, växande stage-kontext och en eventuell reparationsprompt. Med konservativa verifierade priser `Rin` och `Rout` USD per miljon token är total övre kostnad `12 × I × Rin / 1e6 + 132000 × Rout / 1e6`. Ta med eventuella cache-skrivningstillägg och andra faktiskt valda avgifter. Kör bara om gränsen ryms under B; inga kostnadstal från oktoberkörningen antas fortsatt aktuella.
5. Bevara alla transportförsök, stage-svar, fel, saknad usage, faktisk modellidentitet och originalresultat. SR:s nuvarande provider exponerar inte alla misslyckade transportförsök, så budget-/rådatainstrumentering behöver färdigställas före livekörningen. Den får inte kringgå SR med en ny prompt. Se [DEPENDENCIES.md](DEPENDENCIES.md).
6. Bedöm mot det redan låsta facit: extraherades etikettpåståendet, bedömdes det mot kundens faktiska rättelse, kom invändningen vidare till slutliga fynd och kan fyndet kopplas entydigt till rätt uppgift? Skilj bortfall i extraktion, stödbedömning, adjudication och adapterkoppling från en korrekt bevarande-bedömning. Räkna inte det kända deterministiska schemafelet som en AI-upptäckt. Kontrollera samtidigt om det tydliga fallet ger påhittade problem eller frågor. Mänsklig källbunden bedömning behövs; ingen LLM-domare är ensam facit.

Det finns inget aktiverbart live-flagga eller exekverbart livekommando i denna leverans. En senare budgeterad transport/runner och sessionens live-receipt-kontrakt är återstående arbete. Ett diagnostiskt liveprov kan undersöka den befintliga pipelinens förmåga före fälttäckningsändringen, men dess resultat får då fortfarande status partial i CE3 och kan inte slutföra onboarding.
