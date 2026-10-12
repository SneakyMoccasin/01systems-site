# Fabriken: två handlingsplaner, offline

Utgångspunkt: `1c1588e61afae7d7d8582c0066411af1a74ee67a`, 2026-10-12.
Det befintliga fabriksfallet är konstruerat av **ASSUMED** premisser enligt
`../structural-ce-v1-factory-witness/sources/factory-assumed.txt`.
Det är inte en AI-genererad modell eller verifierade kunduppgifter.

## Öppna och prova

Starta från reporoten:

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8877
```

Öppna <http://127.0.0.1:8877/>, välj **Öppna grundjämförelse**, sedan
**Kör båda handlingsplanerna**. Välj därefter det separata scenariot med
uteblivet kundbesked och kör båda planerna där. Inga förskrivna resultat används.
Sparade scenarier öppnas från Projekt; välj Jämförelse → Jämför körningarna
för att återgranska befintliga körspår utan att köra motorn igen.

Frågan är: **Vilken av de två testade planerna startar produktionen i Polen
senast vecka 26 och bevarar svensk produktionsförmåga till och med vecka 26?**
Modellens D8 betyder godkänd produktionsstart, inte uppmätt produktion.

## Samma förutsättningar, en uttrycklig planskillnad

`factory_plans.py` återanvänder befintlig fabriksadapter och kandidatplan.
Modell, kandidat, scenarioregister och antagandekälla kontrolleras mot filhashar;
den normaliserade modellen kontrolleras mot exakt digest. Inget fryst underlag ändras.

| Vecka | Flytta svensk maskin | Ny maskin · behåll Sverige |
|---|---|---|
| 0, i ordning | D1 finansieringsansökan → D2 hyr lokal → D9 säkra svenskt arbetslag → D7 begär kundgodkännande | Samma |
| 2, i ordning | D3 rekrytera/utbilda i Polen → **D5 flytta svensk maskin (2 Mkr)** | D3 → **D4 beställ ny maskin (6 Mkr)** |
| 10 | D6 kvalitetsgranskning | Samma |
| 12 | D8 godkänn produktionsstart | Samma |

D5 ersätter D4 i exakt samma position enligt frysta scenariot `machine_moved`.
Inga andra beslut prövas. Detta är **handlingsplaner**, inte en ren ordningsjämförelse.
Flyttplanen flyttar inte D6 tidigare trots att maskinen anländer vecka 6.
Ingen optimering ingår.

Gemensamt: start vecka 0, horisont 26 inklusive, initial budget 8 Mkr,
samma initiala tillstånd och händelser. Händelser behandlas före beslut.
Grundscenario: bank-, kund- och kvalitetsbesked godkända. Andra scenariot använder
exakt `customer_absent`-överstyrningen på **båda** planerna; inga övriga besked ändras.
Frysta scenariernas `expected`-facit läses inte in som resultat eller motorindata.

## Faktiska körresultat

| Scenario / plan | D8 genomförd | Sverige bevarat 0–26 | Första förlust | Utbetalt / kvar, Mkr | Båda delmål |
|---|---|---|---|---|---|
| Grund / flytta | vecka 12 | nej | vecka 2 | 10 / 4 | nej |
| Grund / ny maskin | vecka 12 | ja | ingen | 14 / 0 | ja |
| Uteblivet kundbesked / flytta | nej | nej | vecka 2 | 10 / 4 | nej |
| Uteblivet kundbesked / ny maskin | nej | ja | ingen | 14 / 0 | nej |

Varje scenario har fyra händelseordningar för flyttplanen och två för köpplanen:
**12 fullständiga banor**, alla återgranskade med motorns befintliga audit.
Alla redovisade mått är lika över respektive plans händelseordningar.

D5 vecka 2 ändrar `original_machine` från `sweden_in_use` till `in_transit`.
Maskinen kommer till Polen vecka 6. D4 vecka 2 ändrar i stället `new_machine`
till `ordered`; den installeras vecka 10 utan att flytta den svenska maskinen.
D6 kan genomföras vid det planerade försöket vecka 10 i båda fallen.

När kundbeskedet uteblir vecka 3 blir `customer=waiting_no_further_review`.
D8 vecka 12 blockeras av kravet `customer=approved`. Alla övriga föreskrivna
beslut genomförs, inklusive lokal, arbetslag, maskinåtgärd och kvalitetsgranskning.
Endast köpplanen behåller den svenska reservförmågan. Modellen har inget
återflyttningsbeslut; detta är ingen allmän utsaga om permanent förlust i verkligheten.

Budgeten är ett saldo: 8 initialt + 6 från bankbesked − beslutens kostnader.
Ingen löpande drift, intäkt, produktionsvolym eller lönsamhet ingår.

## Spårbarhet och säker visning

Befintlig `ce3-project/1`-lagring och oförändrad `Store.run/result/compare`
används. Presentationsmarkören `factory-plans/1` är inte ett nytt sessionsformat.
Session/2 och lagerflödet påverkas inte.

Varje körning sparar modell, plan, externa utfall, källhashar, input-digest,
historik och audit i `local-data/<projekt-id>/runs/<run-id>/`.
Scenarierna är separata projekt. Återöppning och export/import återanvänder
befintlig audit mot sparade indata. Aktuella indata måste matcha körningen.
Ändringar gör jämförelsen inaktuell; äldre resultat bevaras.

`factory-comparison.js` observerar befintliga spår. Svensk förmåga kräver samtidigt
lokal, maskin i bruk i Sverige och arbetslag: initialt samt **före och efter varje
övergång** vecka 0–26. Det räcker inte att slutläget är rätt. Visningen kräver
fullständig audit, korrekta input-digester, samtliga banor och samma mått på alla banor.
Ofullständiga, blandade eller varierande underlag ger ingen gemensam slutsats.
Den avgränsade vyn accepterar endast de två uttryckliga planerna och scenarierna.
Ändrade planer hänvisas till befintlig planvy, utan att tillskrivas förinställda orsaker.

## Verifiering

```sh
python3 -B isolated-tests/structural-ce3-workbench/verification/test_factory_plans.py
node isolated-tests/structural-ce3-workbench/verification/factory-comparison-ui.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p test_workbench.py
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py'
node --test isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/controller.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs
```

Fabriksprovet: tre integrationstester med verkliga körningar, identiska premisser,
exakt D4/D5-skillnad, återöppning, export/import och avvisad jämförelse av olika besked.
UI-testet använder dessa faktiska banor och kontrollerar tabellceller, stale-vy,
saknade banor, fel digest och variation. Ett uttryckligen manipulerat **negativt
observatörstest** simulerar tillfällig förlust med återställt slutläge; det är inte
ett motorresultat eller en ändring av fabriksfallet.

Regressioner: 14 arbetsbänkstester, 27 kärntester och 43 onboarding-/sessionstester.
Befintliga tester för planarbetsyta, läsbara resultat och jämförelse passerar.
Webbläsaren granskad vid 1280/1440 px och 390 px: båda scenarier, faktisk körning,
sparning/återöppning, tabell, förklaring och utfällningar. Ingen sidöversvämning på
390 px. Tabell och utfällningar kan nås med tangentbord.

Lagerregressionen preciserar att sent färdigt funktionsprov är efter **första**
startförsöket men före det andra samma dag. Faktiskt spår verifierar eventets index
före det andra startbeslutet för både analysdag 2 och 3. Ingen motorsemantik ändrad.

I de här två testade planerna uppfyller köpplanen båda grundmålen. Med uteblivet
kundbesked uppfyller ingen båda. Detta visar inte bästa möjliga plan, generell
omöjlighet, AI-kvalitet eller verifierad kundnytta. Nästa steg är att Christian
bedömer om jämförelsen gör målkonflikten begriplig. Inga externa AI-anrop,
installationer, kostnader eller publiceringar; liveprovet är fortsatt pausat.
