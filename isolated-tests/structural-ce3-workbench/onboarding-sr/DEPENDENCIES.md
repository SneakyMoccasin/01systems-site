# Vad återstår före ett komplett liveflöde?

**Ingen SR-ändring behövs för att anropa den befintliga lokala grounded-pipelinen med separata källor och utkast.** Dess exporterade funktion och providergräns används redan i offlineprovet. Följande krävs däremot för att låta resultaten slutföra en verklig onboarding, och har inte genomförts i detta pass.

## SR: uttryckligt register och täckningsresultat

Föreslagen liten, versionsmärkt ingång i SR, exempelvis `runStructuredGroundedReview`, som återanvänder befintliga steg och kompletterar deras kontrakt. Den ska inte vara en enanropsersättning. Exakt namn är ett förslag, inte ett befintligt API.

Indata behöver ett versionsbundet register med modell-/underlagsdigest samt förväntade enheter/uppgifts-ID och granskade fält. Originalkällor och granskningsobjekt behåller skilda roller. Uppgiftens text, typ, status, värde, scenarioval, beroenden och källstöd ska gå att begära granskning av; analysfråga/omfattning/luckor behöver också kunna granskas utan att ett godtyckligt item-ID uppfinns.

Resultatet behöver explicit ange per begärt fält: assessed eller unassessed med skäl, claim-/assessment-ID, stödutfall och källreferenser. Ett citerat objekt ska inte automatiskt ge assessed för samtliga fält. Bortfiltrerade citat, dubbletter, utelämnade materialbedömningar och gräns på 12 fynd måste synas som diagnostik och påverka complete/partial. Behåll samtliga ursprungliga stage-resultat och slutliga fynd separat från CE3:s översättning.

Berörda befintliga delar: `src/lib/grounded/run.ts`, `grounded/stage-schemas.ts`, `grounded/schemas.ts` samt versionsmärkta grounded-prompts. Testa framför allt scenariotypning mot faktisk bokning, korrekt känt scenario, okända värden, utebliven extraktion, felaktiga citat och att en tom fyndlista inte kan täcka ett saknat fält. Denna specifikation ändrar inget i SR nu.

## CE3: granskningar, historik och livegräns

Sessionshållaren i `2aa123c` tillåter avsiktligt bara `producer.mode=synthetic` och `model=null`. Offlinekopplingen uppfyller detta ärligt: riktig SR-kod körs, men leverantörssvaren är förskrivna testdata. En livegranskning får inte döpas om till mock för att passera spärren.

En senare sessionsversion behöver kunna ta emot en validerad live-receipt med ursprungligt SR-resultat, täckning, producent, stage-/kostnadsmetadata och exakta digester. Lägg till en särskild granskningshändelse med receipt-digest, migrera gamla sessionsloggar explicit och behåll nuvarande tester för sena svar, gamla bekräftelser, frågor och fynd. Släpp inte enbart på en mode-kontroll: hela underlaget för översättningen måste kunna återöppnas och verifieras. Nuvarande bundle visar offlineformatet men ändrar inte session/1.

Fynd om analysfråga eller flera tvetydigt kopplade uppgifter ligger kvar i receipt med unmapped-status och gör granskningen partiell. Ett framtida CE3-kontrakt kan få uttryckliga måltyper för analys/scope/gap, eller låta en granskare göra en dokumenterad manuell koppling. Det får inte ske genom att slumpmässigt välja en modelluppgift. Kontraktens version 1 ändras inte här.

## Drift, budget och dataåtkomst

- Verifiera driftsatt SR-commit och konfiguration om provet ska representera den driftsatta betan. Den lokala funktionen kräver ingen ny HTTP-ingång. En server-till-server-koppling till betan skulle däremot behöva godkänd autentisering och versions-/resultatkontrakt; dess webbsessionscookie är inte här testad som tjänstegräns.
- Kontrollera aktuella officiella API-priser och användbara credentials i ett senare, uttryckligen budgeterat pass. Ingen sådan kontroll med modell-API eller påfyllning görs här.
- Lägg en beständig budgetvakt framför den riktiga SR-providern, med maxkostnadsreservation **inklusive dess interna reparation** före varje steg. Instrumentering måste bevara även misslyckade anrops usage/rådata där de finns. Dagens provider exponerar aggregerad usage och repairUsed men inte alla råa transportförsök vid ett kastat fel.
- Flytta inte in den tidigare enanropsadaptern som ersättningspipeline. Om en budgeterad transport behövs återanvänds SR:s pipeline/steg och modellerade providergräns; transportändringen och dess eventuella skillnad mot beta dokumenteras separat.

Den konservativa partial-spärren kan hävas först när ett uttryckligt täckningskontrakt har verifierats och sessionsmigreringen är klar. Detta är en integrationsgrind, inte ett krav på att SR bevisar verklig sanning. Kundbekräftelse gäller fortfarande endast exakt visad version; separat CE3-validering/körning kommer efter detta och ingår inte här.
