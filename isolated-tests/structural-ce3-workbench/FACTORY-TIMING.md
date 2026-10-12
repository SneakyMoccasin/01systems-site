# Fabriken: värdet av ändrad flyttidpunkt

Utgångspunkt och faktisk HEAD vid start: `f9288b19a2d4883e372d9bd98f378b5e748945e2`.
Verifierat 2026-10-12. Köp kontra flytt finns kvar som separat strategijämförelse.
Detta är deklarerade planer över det frysta **ASSUMED**-fallet, inte optimering,
AI-generering eller verifiering av kundnytta.

## Öppna

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8878
```

<http://127.0.0.1:8878/> → **Kundgodkännande kommer** → **Kör båda handlingsplanerna**.
Det separata scenariot öppnas med **Kundbesked uteblir**.
Sparade projekt öppnas från Projekt → Jämförelse → Jämför sparade körningar. Det läser
befintliga resultat och granskar dem igen utan ny körning.

## Deklarerade planer och modellstöd

`factory_timing.py` återanvänder fabriksadapter, källpinnar, validering och
`Store.run/result/compare`. Varken modellregler, priser eller budget ändras.
Gemensamt: initialt 8 Mkr, banktillskott 6 Mkr, samma startläge, vecka 0–26 inklusive,
samma godkända bank-, kund- och kvalitetsbesked i grundscenariot.

| Försök | Tidig plan | Senare plan |
|---|---|---|
| D1 → D2 → D9 → D7, i denna ordning | vecka 0 | vecka 0 |
| D3 rekrytera/utbilda polskt arbetslag | vecka 2 | vecka 2 |
| D5 flytta svensk maskin | vecka 2, efter D3 | vecka 6 |
| D6 beställ kvalitetsprövning | vecka 6 | vecka 10 |
| D8 godkänn produktionsstart | vecka 8 | vecka 12 |

Alla beslut försöks en gång. Inga extra åtgärder eller olika inköp.
Tidpunkter **och placeringen relativt händelser** ändras; det är inte enbart en
ordningsändring inom samma vecka. Den tidiga tidsplanen är inte identisk med den
äldre strategijämförelsens flyttplan, som behåller D6 vecka 10 och D8 vecka 12.

Motivering utan sökning: D2 vecka 0 ger lokal vecka 2. D3 vecka 2 ger arbetslag
vecka 6. Bankbesked kommer vecka 2 och kundbesked vecka 3. D5 har fyra veckors
timer, D6 två. Händelser inträffar före beslut samma vecka, så maskinankomst kan
följas av D6 samma vecka och kvalitetsbesked av D8. D2 görs före erbjudandets
utgång vecka 5; D9 före utgång vecka 7 och förhindrar arbetslagets avgång vecka 8.
Det går inte att invänta godkänd kvalitet före maskinflytten i dessa planer:
D6 kräver redan en maskin i Polen.

## Observerade resultat från faktisk CE3-körning

| Mått | Tidig | Senare | Tidig, kundbesked uteblir | Väntplan, kundbesked uteblir |
|---|---:|---:|---:|---:|
| Godkänd start i Polen | v8 | v12 | inte till v26 | inte till v26 |
| Startmålet v26 | ja | ja | nej | nej |
| Första förlust av svensk förmåga | v2 | v6 | v2 | ingen |
| Modellveckor med svensk förmåga | 2 | 6 | 2 | 26 |
| Svensk förmåga hela 0–26 | nej | nej | nej | ja |
| Varken svensk förmåga eller godkänd polsk start | [2,8), 6 veckor | [6,12), 6 veckor | [2,26], 24 veckor, öppet | inget glapp |
| Utbetalt utan godkänt bankbesked, Mkr | 5 | 5 | 5 | 5 |
| Utbetalt utan godkänt kundbesked, Mkr | 9 | 7 | 10 | 7 |
| Utbetalt utan godkänt kvalitetsbesked, Mkr | 10 | 10 | 10 | 7 |
| Totalt utbetalt / kvar, Mkr | 10 / 4 | 10 / 4 | 10 / 4 | 7 / 7 |
| Båda ursprungliga delmålen | nej | nej | nej | nej |

Grundscenariot: fyra veckor längre svensk förmåga, fyra veckor senare godkänd
start och 2 Mkr mindre utbetalt utan kundgodkännande. Samma sexveckorsglapp och
samma totalkostnad. Senare förlust uppfyller inte målet svensk förmåga hela 0–26.

Det finns **8 banor för tidig och 2 för senare plan per scenario**, totalt 20.
Alla är COMPLETE med audit PASS. Tabellmåtten och de observerade slutsatserna är
lika i samtliga banor för respektive plan. Ordningen mellan samtidiga händelser
varierar och bevaras i körspåren. Presentationskoden behåller en fördelning för
varje mått; variation visas med samtliga värden och antal banor, inte som sannolikhet.
Den skapar ingen enskild differens när observationerna varierar.

## Uteblivet kundbesked är ett separat fast skript

`fixed-replay/0.1` stöder `attempt` och `if_not_taken`, men inte
`if_customer_approved` eller andra generella villkorade planer. Därför väljer
användaren uttryckligen en **separat väntplan** för detta scenario:

- Samma externa utfall för båda: bank/quality approved, customer absent.
- Tidiga planen är oförändrad.
- Senare planen försöker inte D5 eller D6 inom horisonten. Etableringen är fortfarande
  avsikten, men det körda skriptet är därför inte längre bara en tidsförskjutning.
- D8 vecka 12 behålls som diagnostiskt försök, inte som ett löfte om start.
- D1, D2, D9, D7 och D3 genomförs i båda. Tidiga planen genomför även D5 och D6.

Motorn har **inte** blockerat eller valt bort flytten. Planen utelämnar försöket.
Motorn blockerar däremot D8: tidigt saknas kundgodkännande; i väntplanen saknas även
maskin i Polen och godkänd kvalitet. Kvalitetsutfallet är gemensamt deklarerat men
aktiveras aldrig i väntplanen eftersom D6 inte försöks. Ingen generaliserad
villkorsmotor eller ny regel har införts.

## Exakta mått och gränser

Svensk förmåga = `se_premises=true`, `original_machine=sweden_in_use`, `se_team=true`.
Både före och efter varje övergång samt initialt och vid vecka 26 kontrolleras.
Intervall börjar/slutar vid den övergång som ändrar predikatet, inte först nästa
vecka. `[a,b)` ger `b-a` förflutna modellveckor. Kvarstående intervall redovisas
fram till horisonten 26, inklusive tillståndet där, utan påhittat slutdatum.
Maximal varaktighet är 26, medan antalet veckopunkter är 27. Ett glapp som börjar
och slutar samma vecka har längd 0 men dess övergångar behålls. En tillfällig förlust
kan alltså underkänna kontinuitetsmålet även utan positiv varaktighet.

Tillståndsglapp = ingen svensk förmåga **och** `production_authorized=false`.
D8 mäter godkänd start, inte fysisk produktionsvolym. Glappet mäter inte
produktionsförlust eller intäkter.

Utbetalning = verklig budgetminskning vid genomfört beslut. För vart och ett av
bank/kund/kvalitet räknas betalningar där beskedets tillstånd **före beslutet** inte
är approved. Ett godkänt besked tidigare samma vecka räknas före betalningen.
Vid uteblivet eller aldrig begärt besked räknas alla sådana betalningar till 26.
De tre raderna överlappar och får inte summeras. Inget påstående görs om
återbetalning, oåterkallelighet, förlust eller lönsamhet.

## Arkiv och verifiering

Befintligt `ce3-project/1`-arkiv används; `factory-timing/1` är endast en
presentationsmarkör. Källpinnen för den separata plandeklarationsfilen inkluderas
i båda planernas identiska sources. Exakt modell, script, besked och sources
binds till körningens input-digest. Nytt scenario får ett separat projekt.
Sparning, återöppning, export/import och audit går genom befintliga funktioner.
Ändrad plan döljer aktuell jämförelse; äldre resultat bevaras. Fel input-digest,
saknade banor, olika besked eller förändrade deklarerade planer stoppar denna vy.

```sh
python3 -B isolated-tests/structural-ce3-workbench/verification/test_factory_timing.py
node isolated-tests/structural-ce3-workbench/verification/factory-timing-ui.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/verification/test_factory_plans.py
node isolated-tests/structural-ce3-workbench/verification/factory-comparison-ui.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p test_workbench.py
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py'
node isolated-tests/structural-ce3-workbench/verification/plan-workspace-ui.test.cjs
node isolated-tests/structural-ce3-workbench/verification/comparison-ui.test.cjs
```

Pass: 3 nya integrationstester + UI-test på alla 20 banor, 3 befintliga
strategitester + UI-test, 14 arbetsbänkstester och 27 kärntester samt befintliga
planarbetsytans/jämförelsens UI-regressioner. UI-testet täcker faktiska cellvärden,
differenser, omvänd kolumnordning, betalningar efter besked samma vecka, målstatus
skild från COMPLETE/PASS, stale-visning och bevarade identiteter. Separata tydligt
syntetiska negativa observatörstester täcker nollvaraktighet, horisontgräns och
variation; dessa påstås inte vara nya giltiga motorresultat.

Webbläsargranskning: grundscenario och uteblivet besked, sparning/återöppning samt
bred (1280 px) och smal (390 px) skärm. Slutsatsen ligger före tabellen och teknisk
status under utfällning. Modell, frysta fall, SR, session/2 och onboarding är
oförändrade. Ingen extern AI, installation, kostnad eller publicering. Liveprovet
är fortsatt pausat. Detta säger inget om bästa plan eller verifierad kundnytta.


## Kundvy efter 517c8f6

Presentationsrättelse med oförändrade planer, beräkningar och arkiv. Ordningen är
analysfråga och alternativ → markerat kundbesked → kör/jämför → avvägning och två
delmål → fem huvudmått och kort orsakskedja → utfällbara detaljer.

Sammanfattningen läser också glapplängd och målstatus från de befintliga
observationerna. Tidig/senare identifieras från de deklarerade skripten, så
omkastade kolumner ändrar inte innebörden. Varierande observationer ger ingen
påhittad enskild differens; värden och antal banor visas. Saknad start förblir
saknad. Glapp som kvarstår räknas endast till horisonten.

Huvudtabellen har fem rader: start, svensk förmågas varaktighet/första förlust,
glapp, utbetalt före kundgodkännande och totalt utbetalt. Övriga budgetmått,
blockeringar, intervallnotation, besluts-ID och COMPLETE/PASS ligger i detaljer.
Väntplanens avstående från flytt och kvalitetsprövning förklaras i kundvyn.
Scenariobyte visar inga föregående resultat. Ny jämförelse kräver aktuella
körningar för exakt de valda planerna och deras besked.

Verifiering av denna rättelse: 3 integrationstester med 20 faktiska banor,
utökad timing-UI-regression, tidigare strategi-/planarbetsyta-/jämförelsetester
och 14 arbetsbänkstester passerar. Observatörs-, intervall-, täcknings- och
plandefinitionskoden jämförs byte för byte med 517c8f6, och observationsresultaten
jämförs för alla 20 banor. Inget beräkningsfel har upptäckts eller korrigerats.
Webbläsarprov omfattar båda scenariernas faktiska körning, markerat scenario,
omkastade kolumner, tom resultatvy, sparning/återöppning och 1280/390 px.
Detta verifierar presentation och kontrollflöde, inte kundnytta.
