# Plan för kvalitetsutvärdering

Denna plan är föreslagen och **inte genomförd**. De deterministiska testerna kontrollerar kontraktsstruktur, referenser, tillstånd och historik. Förskrivna SR-fynd bevisar inte att SR hittar modellfel eller ger bättre kvalitet än AI ensam. Ingen verklig LLM har anropats i detta arbete.

## Två separata frågor

1. Fungerar kontraktet? Testa schemavalidering, källidentitet, okäntvärden, versionskoppling, öppna frågor/fynd, kundbekräftelse och överlämningsgrindar. Syntetiska resultat kan användas här.
2. Förbättrar SR utfallet till rimlig extra kostnad? Detta kräver verkliga modellförslag, riktiga granskningssvar och oberoende mänsklig bedömning. Testa inte en förskriven mock som om den vore SR.

## Litet parat pilotupplägg

Förslag: 12 korta svenska underlag. Fyra gäller kontroll av en plan, tre gäller alternativval, tre gäller ändrat antagande och två saknar analysbehov. Ta med tydliga, tvetydiga och motsägande källor samt ofullständig extraktion och dokumentinstruktioner. Ha korrekta förslag med försiktig formulering, så att onödiga invändningar och frågor också kan mätas. Materialet ska vara separat från utvecklingsfixturerna och inte bestå av bara lagerfallet.

För varje analysfall genereras ett första AI-utkast under låsta inställningar. Samma utkast, fullständiga originalunderlag och svar kopieras sedan till två armar:

- **A – AI ensam:** AI går igenom sitt eget förslag och sammanställer nästa frågor.
- **B – AI + SR:** SR granskar samma förslag mot samma underlag; samma frågesammanställningssteg förenar AI:s frågor och SR:s fynd.

Armarna har samma analysomfattning, källor, grundmodell, sammanställningsinstruktion, kundsvarsbank och högst två kompletteringsrundor. SR får inte få extra verksamhetsinformation. En blind moderator ger samma förberedda svar på likvärdiga frågor och registrerar extra frågor. Olika frågeordning och adaptiva följdfrågor loggas; de får inte döljas som identiska försök. Fall utan analysbehov ska kunna avslutas och mäts för onödigt arbete.

Kör varje par tre gånger med dokumenterade modell-/prompt-/adapterversioner och inställningar. Detta ger ett litet explorativt material, inte statistiskt bevis. Registrera avbrott, ogiltig JSON, ofullständig granskning, saknad usage och extraktionsfel separat; ta inte bort dem ur nämnaren. B använder extra beräkning, vilket ska mätas. Om man senare vill skilja effekten av SR-metoden från effekten av fler anrop behövs även en arm med motsvarande beräkningsbudget för AI:s egenkontroll.

Komplettera med ett separat detektionstest med medvetet insatta fel: mål → faktum, uppskattning → garanterad varaktighet, tid → godkännande, påhittad kostnad/beroenderegel, okänt → absent/noll, felaktig scenarioetikett och saknat profilstöd. Båda armar granskar exakt samma felaktiga utkast. Redovisa detta separat från fel som uppkommer naturligt i onboarding; sammanblandning skulle överdriva praktisk effekt.

## Facit och blind bedömning

Två granskare markerar oberoende varje materiellt modellfel, källa, berörd uppgift, felkategori och rimlig korrigering. Oenighet avgörs i en gemensam bedömning och tvetydiga fall redovisas separat. Bedömarna får inte veta arm eller leverantör. Samma sakfel i flera SR-fynd räknas en gång; en bred invändning räknas inte som träff om den inte pekar ut felet begripligt. En granskningshypotes räknas inte som ett bevisat modellfel.

Bedöm även slututkastet efter frågor och korrigeringar: ett upptäckt fel som skrivs tillbaka igen är inte en lyckad korrigering. Kontrollera nytillkomna fel, ändrad betydelse och kvarstående överdrivna säkerhetsanspråk. Avvisade SR-fynd bedöms separat: var avvisningen korrekt och motiverad?

## Mått och rapportering

| Mått | Definition / registrering |
|---|---|
| Korrekt upptäckta modellfel | Antal unika facitfel som identifierats med rätt innebörd och målreferens; redovisa per felkategori och fall |
| Missade fel | Facitfel som inte identifierats; recall = träffar / alla facitfel. Vid inga facitfel är recall ej tillämpligt, inte 100 % |
| Felaktiga fynd | Fynd utan tillräckligt stöd eller felaktig tolkning; precision = korrekta fynd / samtliga bedömda fynd. Vid inga fynd är precision ej tillämpligt, inte bevis på korrekthet |
| Frågors relevans | Blind skala 1–5 plus konkret motivering; antal redan besvarade, dubbla eller ovidkommande frågor och felaktigt blockerande frågor |
| Frågors begriplighet | Kundlik testläsare skattar 1–5 och återberättar vad som efterfrågas; registrera tekniska termer som försvårar svaret |
| Slutlig modellkvalitet | Kvarstående, rättade och nytillkomna materiella fel; korrekta okänt-/scenario-/begränsningsetiketter |
| Extra väntetid | Väggklocka per arm och steg, inklusive fel/omförsök; redovisa parade skillnader och spridning, inte bara ett medelvärde |
| Extra kostnad | Faktiska anrop/tokens och tillgänglig användningskostnad. Vid beräkning från taxa sparas daterad taxa. Okänd kostnad rapporteras okänd, inte noll |
| Extra kundarbete | Antal frågor, omformuleringar, rundor, läs-/svarstid och nödvändiga rättelser; mäts med samma moderator/testpersonsvillkor |

Rapportera varje par och variation över upprepningar. Visa armarnas absoluta felantal och nettoskillnad, inklusive korrekta utkast där SR skapade extra arbete. Antal fynd i sig är inte ett kvalitetsmått. Mock-/kontraktsutfall redovisas i en annan tabell än LLM-resultat.

## Beslut efter piloten

Christian fastställer före körning hur mycket extra väntan och kundarbete som är acceptabelt. Inget vinstlöfte eller godtyckligt numeriskt framgångsmål sätts här. Gå vidare med liveintegration endast om resultaten visar en användbar minskning av materiella fel utan oacceptabelt många felaktiga invändningar eller onödiga frågor. Negativa eller blandade resultat ska leda till ändrat granskningsläge, tydligare omfattning eller att SR förblir ett valbart steg.

Ett lyckat pilotresultat gäller de testade underlagen, versionerna och inställningarna. Det visar inte att en viss plan är genomförbar, att kunduppgifter är sanna eller att en annan lokal/molnmodell ger samma kvalitet.
