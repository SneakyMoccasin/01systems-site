# Syntetiskt dialogexempel

Detta gäller en påhittad demonstration, inte lagerflytten. Ingen verklig AI eller SR har körts. Fynden är handskrivna exempel på hur dialogen ska hanteras, inte uppmätt granskningsförmåga. Exekverbara kontraktsfixturer finns i [exempelkatalogen](examples/catalog.json).

**Onboarding:** Vad vill du få svar på: jämföra alternativ, kontrollera en befintlig plan eller undersöka vad ett ändrat antagande får för konsekvenser?

**Kund:** Jag vill kontrollera om min demonstrationsplan uppfyller kravet att en ansvarig bekräftar resultatet.

**Onboarding:** Då kontrollerar vi den planen mot bekräftelsekravet. Du behöver inte föreslå en andra plan. Jag behöver underlaget som beskriver planen och kravet.

**Kund:** Här står planen. Vi hoppas få resultatet bekräftat dag 2. Kostnaden vet vi inte.

I det framtida flödet bevarar dokumentläsaren filidentitet, version, extraktionsstatus och textpositioner. AI:s första samlade förslag blir i detta **avsiktliga felexempel** ”Resultatet är godkänt dag 2”. SR får både förslaget och originalunderlaget. Det förskrivna SR-fyndet pekar på ”hoppas” och anger att ett mål felaktigt blivit ett faktum. AI har samtidigt föreslagit frågan när beskedet kan lämnas. Frågesammanställningen kopplar ihop dem till en fråga och behåller båda ursprungen.

**Onboarding:** Är dag 2 ett mål, eller finns ett faktiskt besked om att resultatet då är godkänt? Vi frågar eftersom planen annars räknar med ett godkännande som underlaget inte fastställer.

**Kund:** Det är bara ett mål. Och jag behöver rätta mig: målbilden är dag 3. Vi vet fortfarande inte när ansvarig godkänner.

Svar 1 bevaras, svar 2 länkas som rättelse. Utkastet får en ny version med mål dag 3 och okänt godkännandebesked. Det gamla granskningsbeskedet är inaktuellt. Fyndet finns kvar tills rättelsen bedömts; det blir inte automatiskt löst när kunden svarar. Ingen ny full SR-granskning startar mitt i varje kort svar.

**Onboarding:** Utkastet visar nu dag 3 som mål och godkännandet som okänt. Den okända tidpunkten hindrar en fast uppspelning av bekräftelsen. Kostnaden är också okänd; utan ekonomiska uppgifter kan vi inte dra slutsatser om kostnad. Vill du fortsätta precisera kontrollen, begränsa analysfrågan eller pausa här?

**Kund:** Pausa här. Jag behöver prata med ansvarig.

**Sammanfattning vid paus:** En plan ska kontrolleras mot kravet på ansvarigs bekräftelse. Dag 3 är ett mål, inte ett godkänt utfall. Beskedstid och faktiskt utfall är obesvarade. Kostnad är okänd. Den nya utkastversionen behöver samlad granskning. Ingen CE3-validering eller körning har skett.

Detta är ett fullvärdigt pausläge. Kunden behöver inte välja ett påhittat utfall för att få lämna dialogen. Vid återupptagning visas öppna frågor och tidigare fynd. Alternativet ”avsluta med denna sammanfattning” ger `closed_limited` och bevarar luckorna.

## Exempel på ett tveksamt SR-fynd

SR föreslår dessutom: ”Kanske krävs en kontrollant per demonstrationsbord?” Det finns inget sådant krav i underlaget. Fyndet märks **granskningshypotes**, inte motsägelse eller fastställt modellfel. En ansvarig granskare kan avvisa det med motiveringen: ”Underlaget kräver en ansvarigs bekräftelse, inget separat godkännande per bord; SR har inte visat stöd för det extra kravet.” Fynd, målreferens, bedömare och motivering behålls. Ingen ny beroenderegel skrivs in i modellen.

## Bekräftelse efter senare komplettering

När nödvändiga uppgifter faktiskt finns, eller kunden uttryckligen valt och förstått ett avgränsat hypotetiskt scenario, visas ett samlat utkast: analysfråga, planen, kontrollvillkor, angivna värden, mål/uppskattningar, kvarstående begränsningar och senaste granskningens status. För scenario-val ska texten exempelvis säga ”Du har valt detta som ett hypotetiskt test; det är inte ett verifierat besked.” Exemplet fyller inte i någon tid eller något utfall åt kunden.

**Onboarding:** Bekräftar du att detta utkast återger dina uppgifter och valda avgränsningar? Bekräftelsen gäller just denna version. Nästa steg är separat format- och profilvalidering; bekräftelsen innebär inte att planen är körbar eller att kravet kommer att hållas.

Ett rent ja lagras med den visade versionens digest. En ändring i svaret blir en ny förslagssnapshot, följd av relevant granskning och ny bekräftelse. Förslaget överlämnas endast om kontraktets grindar tillåter det. Separat CE3-kod kan därefter fortfarande avvisa det.

## När kunden inte har något analysbehov

**Kund:** Jag vill bara få ordning på vad underlaget säger, inte jämföra eller kontrollera något.

**Onboarding:** Då avslutar vi med en sammanfattning av uppgifterna, osäkerheterna och eventuella motsägelser. Ingen plan eller körning behöver tas fram.

Detta ger `analysis.kind: none` och `closed_no_analysis`. Kontraktet kräver inte två alternativ, en kundbekräftad modell eller SR-anrop för ett sådant avslut.
