# Underlagsregister: lagerflytt

Detta är ett konstruerat onboardingtest baserat på Christians svar, inte ett verifierat kundfall. Enda tillgängliga verksamhetskällan är användarens sammanställda uppgift, bevarad ordagrant i [source-request.txt](source-request.txt). Ursprungliga intervjusvar, bilagor och tidigare versioner har inte tillhandahållits. Registrets referenser anger källans rubrik och en identifierande fras. Inga externa verksamhetsuppgifter har lagts till.

**Typer:** U = användaruppgift (inte oberoende verifierad), M = mål, K = krav, E = uppskattning/önskemål, A = analysförslag, O = okänt. En rad kan innehålla flera typer; de skilda delarna anges i texten. ID:n är stabila för detta dokumentpaket. Modellförslag är förslag även när deras källa är en användaruppgift.

## Situation, tid och startläge

| ID | Typ | Uppgift och osäkerhet | Referens i källan |
|---|---|---|---|
| U01 | U | Webbutik flyttar eget lager 6 km. Ingen kapacitet följer av avståndet. | Beslutssituationen: ”6 km bort” |
| U02 | M/O | Större lager, bättre planlösning, närmare motorvägen. Inga fastställda tids- eller kostnadsbesparingar. | Beslutssituationen: Mål; sista meningen |
| U03 | K | Utskicken ska fortsätta under flytten; enskilda order får vänta. Detta säger inte hur många order som måste skickas per dag. | Beslutssituationen: ”Utskicken ska fortsätta” |
| U04 | K | Varor får inte blandas ihop eller hamna fel. | Beslutssituationen: ”Varor får inte” |
| U05 | K | Grossistleveranser ska tas emot på rätt adress. | Beslutssituationen: ”Grossistleveranser” |
| U06 | K | Kunden ska ha fått hela beställningen inom högst 7 arbetsdagar från beställning. Avser sista delen vid delning, inte endast utleverans. | Beslutssituationen: ”hela beställningen” |
| U07 | K/E/O | Delade försändelser accepteras men ska begränsas. Tillåten nivå eller numerisk gräns saknas. | Beslutssituationen: ”Delade försändelser” |
| U08 | U/K | Båda lokaler tillgängliga 4 veckor; flytten klar inom 3 veckor; sista veckan tömning, städning, överlämning. Kalenderkoppling saknas. | Tidsram och startläge: första tre punkterna |
| U09 | O/K/U | Exakt tillträde okänt. Kalenderveckor och arbetsdagar får inte blandas utan kalenderdefinition. Dag 1 är första arbetsdagen med tillgång till nya lagret. | Tidsram och startläge: ”Exakt tillträdesdatum”; ”Dag 1” |
| U10 | U | Målat; nya hyllor och ny utrustning på plats vid tillträdet. Detta är startpremisser för testet, inte bevis om en verklig lokal. | Tidsram och startläge: ”Lokalen är målad” |
| U11 | U | Del av gamla hyllor flyttas/monteras senare. Tillfällig förvaring medger registrering, plockning och utskick dessförinnan. | Tidsram och startläge: ”En del gamla hyllor”; ”Tillfällig förvaring” |
| U12 | U | PostNords upphämtning från båda adresser är ordnad. | Tidsram och startläge: ”PostNords upphämtning” |
| U13 | K/O | Inventering ska ske före flytten; genomförandet är inte bekräftat. | Tidsram och startläge: ”Inventering” |

## Flytt och kontroll

| ID | Typ | Uppgift och osäkerhet | Referens i källan |
|---|---|---|---|
| U14 | U/E | Cirka 80 % av varje artikel flyttas först; cirka 20 % lämnas i gamla lagret, även foder. Inte en exakt mängd per grupp. | Flytt och kontroll: ”Cirka 80 %” |
| U15 | U/O | Reserv kan förbrukas av utskick. Återstående mängd vid slutflytt är okänd; 20 % är inte ett invariant lager. | Flytt och kontroll: ”Reserven kan förbrukas” |
| U16 | E | Huvudflyttens planeringsram 10 arbetsdagar. Uppskattning med marginal och önskad maxram, ingen verifierad varaktighet. | Flytt och kontroll: ”Huvudflyttens”; ”Tiderna är uppskattningar” |
| U17 | E/O | Slutflyttens ram 5 arbetsdagar för återstående varor och hyllor; fördelning över grupper och eventuell överlappning okänd. Ingen verifierad varaktighet. | Flytt och kontroll: ”Slutflyttens”; Två föreslagna jämförelseplaner: sista stycket |
| U18 | E/M | Berörda varor uppskattas otillgängliga 1–2 arbetsdagar per omgång, med 1 som mål, tills mottagna och avbockade. | Flytt och kontroll: ”Varje flyttomgång” |
| U19 | U | Test av datasystem och packstationer börjar parallellt med varuflytt vid tillträdet. | Flytt och kontroll: ”Testkörning” |
| U20 | M/E/K | Testmål 1 arbetsdag, ram 2. Förfluten tid ger inget automatiskt godkännande. | Flytt och kontroll: ”Testmål” |
| U21 | M/K | Första riktiga utskick från nya lagret senast arbetsdag 2 är ett mål. Kräver godkända tester samt mottagna och registrerade varor. | Flytt och kontroll: ”Första riktiga utskick” |
| U22 | K | Före sista reservens flytt: 20 riktiga kundorder korrekt packade i nya lagret och överlämnade till PostNord. Gemensamt kontrollvillkor. | Flytt och kontroll: ”Innan sista reserven” |
| U23 | K | Kontrollorder behöver inte ha nått kunden. Inget separat prov eller kundorder per artikelgrupp krävs. | Flytt och kontroll: ”Kunden behöver inte”; ”Inget separat prov” |
| U24 | O | Tidpunkten för 20 godkända order uttryckligen okänd. | Flytt och kontroll: ”Tidpunkten” |
| U25 | U/K | Efter kontrollvillkoret får reserv flyttas successivt för redan överflyttade och kontrollerade grupper, medan huvudflytt fortsätter för andra. Gruppkontroll betyder inte ett nytt kundorderkrav per grupp. | Flytt och kontroll: ”Därefter” |
| U26 | U/O | Extra personal tas in. Antal, arbetstid, fördelning och kostnad okända. | Flytt och kontroll: ”Extra personal” |
| U27 | E/O | Förhoppning om många lass per dag, ingen fastställd flyttkapacitet från detta eller 6 km. | Flytt och kontroll: ”Avståndet 6 km” |

## Gruppordning och drift

| ID | Typ | Uppgift och osäkerhet | Referens i källan |
|---|---|---|---|
| U28 | U | Tidigt: hundburar för bil; friseringsverktyg; säsongsartiklar utanför säsong; akvarier och akvarietillbehör; fågelburar och kaninburar; foder. Ingen intern exakt ordning. | Ungefärlig ordning: Tidigt |
| U29 | U | Första grupper prioriteras för låg försäljning och otymplighet. Foder är explicit undantag med hög försäljning. | Ungefärlig ordning: ”De första grupperna” |
| U30 | U | Ungefär mitten: hundgodis, ett populärt koppel, en populär hundbädd. | Ungefärlig ordning: Ungefär i mitten |
| U31 | U | Sist: kläder. | Ungefärlig ordning: Sist |
| U32 | O/K | Exakta fastider och intern ordning lämnas öppna; listan får inte antas täcka hela sortimentet. | Ungefärlig ordning: sista stycket |
| U33 | U | Separata lagersystem; flyttar registreras och bockas av manuellt; order fördelas manuellt mellan lagren. | System, order och påfyllning: första tre punkterna |
| U34 | U | När allt flyttats används endast nya systemet. | System, order och påfyllning: ”När allt” |
| U35 | U/K | Gamla lagret kan skicka från reserven om nya inte är redo, så länge berörd vara finns kvar. Saknas tillgänglig vara väntar ordern tills mottagning/avbockning. | System, order och påfyllning: ”Gamla lagret”; ”Saknas” |
| U36 | E | Reserv för de tre nämnda bästsäljarna uppskattas räcka ungefär en vecka. Ingen garanti, inte generell förbrukningsregel; veckans dagtyp är inte preciserad. | System, order och påfyllning: ”Reserven för de tre” |
| U37 | U | Grossistleveranser normalt till nya adressen, kan styras om vid behov. | System, order och påfyllning: ”Grossistleveranser” |
| U38 | E | Grossisten önskar besked helst 3 arbetsdagar före leverans; ingen bekräftad hård tidsgräns. | System, order och påfyllning: ”Grossisten önskar” |
| U39 | O | Hantering av redan skickade leveranser okänd. | System, order och påfyllning: ”Hantering” |

## Kundinformation, ekonomi och analys

| ID | Typ | Uppgift och osäkerhet | Referens i källan |
|---|---|---|---|
| U40 | U/O | Webbinfo om längre leveranstider och delade paket under 3 veckor. Periodens exakta start och kalenderkoppling saknas. | Kundinformation och ekonomi: ”Hemsidan” |
| U41 | U | 10 % rabatt på hela sortimentet under samma period. | Kundinformation och ekonomi: ”10 %” |
| U42 | U | Ingen extra kundavgift för delade paket. Fri frakt över 799 kr gäller hela beställningen. Butiken betalar extra försändelser. ”Över” får inte tyst bytas till ”från”. | Kundinformation och ekonomi: tre punkter om avgift/frakt |
| U43 | U | Normal leveranstid anges som 1–3 arbetsdagar, inte en uppmätt garanti i underlaget. | Kundinformation och ekonomi: ”Normal leveranstid” |
| U44 | E/O | PostNords transporttid anges som genomsnitt 2 dagar. Inget garanterat tak; arbetsdagar/kalenderdagar okänt. | Kundinformation och ekonomi: ”PostNords transporttid” |
| U45 | O/K | Budget, flyttkostnader, personal, frakt, försäljning och rabattens ekonomiska effekt okända. Okänt får inte bli noll. | Kundinformation och ekonomi: ”Budget” |
| U46 | A | A håller kvar återstående reserv för hela sortimentet tills huvudflytt och kontrollvillkor är klara, därefter slutflytt. | Två föreslagna jämförelseplaner: A |
| U47 | A | B slutflyttar färdiga grupper efter kontrollvillkoret parallellt med huvudflytt av andra. | Två föreslagna jämförelseplaner: B |
| U48 | A/O/K | A/B är analysförslag, inte bekräftade kompletta scheman. Resurser och femdagarsramens fördelning okända. B får inte ges kortare tider för att skapa vinnare. | Två föreslagna jämförelseplaner: sista stycket |
| U49 | K | Framtida onboarding: egna filer, källkopplade modellförslag, frågor vid okänt, gemensamt kontrakt för moln/lokal LLM. Ingen sådan funktion byggs här. | Leverera: ”Dokumentera också lärdomar” |

## Preciseringar och ersatta tolkningar

Original till äldre svar finns inte i materialet. Tabellen bevarar uttryckliga preciseringar och markerar vilka **tolkningar som inte längre får användas**; den påstår inte att användaren tidigare lämnat dessa äldre uppgifter. Om äldre källor senare laddas upp ska de sparas med egen identitet och ersättningslänk, inte skrivas över.

| Ej tillåten tolkning | Gällande precisering | Referens |
|---|---|---|
| Inventering redan klar | Genomförande obekräftat; ska ske före flytt | U13 |
| Alla gamla hyllor måste monteras före utskick | Tillfällig förvaring tillåter registrering, plockning och utskick | U11 |
| Foder saknar reserv / alla tidiga grupper säljer lite | Även foder cirka 20 % initial reserv; foder har hög försäljning | U14, U29 |
| 20 % finns alltid kvar / reserv räcker garanterat en vecka | Reserv kan förbrukas; veckouppskattning endast för tre bästsäljare | U15, U36 |
| Test blir godkänt efter en eller två dagar | Tidsmål och ram är skilda från godkänt resultat | U20 |
| 20 kundmottagna order eller 20 per grupp | 20 totalt, korrekt packade och överlämnade i nya lagret; ingen kundmottagning/per-grupp-orderkontroll | U22–U24 |
| All huvudflytt måste alltid vara klar innan reservflytt | Krävs i A; B kan överlappa efter global kontroll och färdig grupp | U25, U46–U48 |
| 10 + 5 arbetsdagar bevisar tre kalenderveckor | Uppskattningar; kalender och överlappningsfördelning saknas | U08–U09, U16–U17 |
| Två dagars transport ger garanterad sjudagarsservice | Genomsnitt utan dagtyp eller tak; hela orderns mottagande krävs | U06, U44 |
| Grossistbesked tre dagar är hård spärr | Önskemål; redan skickade leveranser okända | U38–U39 |

## Öppna uppgifter som följer av modellgranskningen

Följande frågor är härledda av analysen, inte ytterligare användaruppgifter: fullständig artikel-/gruppavgränsning och omgångar; exakt återstående mängd; datumkalender; beslutstider och fördröjningar; verifierade mottagnings-, inventerings-, test- och kontrollbesked; planernas gemensamma antaganden; lager- och orderdata; transportvariation och resurskapacitet. Prioritering och skillnaden mellan körbarhet och verksamhetsverifiering finns i [04-kompletteringar-och-onboarding.md](04-kompletteringar-och-onboarding.md).
