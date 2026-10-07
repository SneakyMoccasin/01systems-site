# CE3 · Beslut & planer

Första lokala användarvyn för den oförändrade kärnan `../structural-ce3-replay/`, profil `fixed-replay/0.1`. Python 3.9+ och en modern webbläsare räcker. Inga paket behöver installeras. Ingen molntjänst används.

## Starta på Mac

Från repositoryroten:

```sh
python3 -B isolated-tests/structural-ce3-workbench/server.py --port 8876
```

Öppna **http://127.0.0.1:8876**. Servern binder enbart till loopback. Transportdemon på 8765 berörs inte. Om 8876 är upptagen, använd `--port 0`; terminalen skriver ut den tilldelade adressen. Stoppa med Ctrl-C och starta med samma kommando för att återöppna samma lagring.

Standardlagring: `isolated-tests/structural-ce3-workbench/local-data/` på den lokala Macen. Katalogen är git-ignorerad. En alternativ lokal katalog kan anges med `--data /absolut/sökväg`. Servern vägrar placera data i andra delar av detta repository.

## Arbetsflöde

1. **Projekt:** öppna en JSON-modell i `ce3-model/1` eller en fullständig inmatning i `ce3-run/1`. Exempelknapparna läser fabrik och transport genom befintliga formatadaptrar. Exemplens externa besked lämnas tomma. En fullständig importerad körinmatning behåller sina uttryckliga utfall.
2. **Beslut:** läs modellens förvillkor, kostnad, direkta effekter och fördröjda händelser. Källkopplade svenska etiketter används för exemplen. Senare effekter visas med egna villkor och möjliga externa besked; en fördröjning är inte ett löfte om färdigställande. ID:n, fulla regler och källidentiteter finns i tekniska detaljer.
3. **Planer:** skapa, namnge eller duplicera planer. Försöken grupperas per tidssteg med rubriker för vecka, beslut och utförande. Tidssteget och radordningen anger försöksordningen. Upprepade försök bevaras, inklusive transportens T7 vecka 12 och 20. Pilar flyttar inom samma steg. Välj `Hoppa över om genomfört` för kärnans `if_not_taken`. Välj samtliga externa utfall före körning. `Kör & granska` sparar en projektversion, validerar, kör kärnan, sparar input/historik och anropar den separata granskaren i en ny process.
4. **Jämförelse:** två olika planer väljs som standard. Med en enda plan erbjuds duplicering. Vyn visar vilka besked eller körningar som saknas, om samma plan valts på båda sidor och om en ändrad plan behöver köras om. Jämför därefter deras senaste körningar. Båda måste vara granskade och motsvara aktuella körindata; modell inklusive startläge och källidentiteter måste vara lika. Olika externa val tillåts med synlig varning om att både planering och besked påverkar jämförelsen. Läs huvudskillnad → konsekvens → varför → utgifter → förutsättningar. Välj vid behov tidpunkt och händelseordning i den hopfällda kontrollen under Förutsättningarna. Referensbanan följer modellens deklarerade eventordning.

`Spara projekt` gör en ny version. Växling till ett annat projekt sparar först ett ändrat utkast; felaktiga utkast behöver rättas för att kunna sparas. Vid omladdning varnar webbläsaren om osparade ändringar. Tidigare projektversioner och körningar ändras aldrig. Äldre versioner kan öppnas; sparande från en gammal version avvisas för att undvika att nyare arbete ersätts.

`Byt modell i detta projekt` läser en ny modellfil, behåller planernas försök och återställer externa val till tomma. Saknade besluts-ID:n visas uttryckligen och måste rättas. Full grafisk modellredigering ingår inte.

## Visningsetiketter och enheter

Under **Projekt → Visningsetiketter** kan namn anges för beslut, händelser, tillstånd, kategorivärden och externa utfall. Namnen sparas i `presentation[modellens SHA-256]`, åtskilda från modellen, planen och körinmatningen. Kategorivärden använder typbevarande JSON-nycklar. Namn följer med projektversioner och export/import; ett modellbyte återanvänder inte etiketter enbart för att ID:n är lika. Sparade resultat visas med sin egen modellidentitet.

`presentations.json` innehåller fabrikens och transportens källkopplade svenska presentationer med originalfilernas hashvärden och regelreferenser. Fabrikens original deklarerar miljoner kronor (Mkr). Transportens original deklarerar miljoner men inte valuta; vyn skriver därför ”miljoner” och upplyser om den saknade valutan. En importerad modell utan presentation får tydlig ID-fallback och ”enhet saknas”, även om ID:n liknar ett exempel. Äldre sparade exempel känns igen genom exakt modellidentitet och originalmodellens källhash; egna äldre beslutsnamn bevaras.

## Tolkning av resultaten

- **Körning** (`COMPLETE`, `INCOMPLETE`, `ERROR`), **granskning** (`PASS`, `FAIL`, `INCOMPLETE`) och **beslutens utfall** hålls åtskilda. COMPLETE/PASS kan innehålla blockerade försök.
- Varje resultatöppning återläser och återgranskar historiken mot separat sparad betrodd inmatning. Underkända historiker får inga granskade tillstånds- eller budgetvyer. Det ursprungliga auditbeskedet sparas; återgranskningen skriver inte över det.
- Alla samtidiga eventordningar körs enligt kärnan, utan sampling. En resursgräns ger INCOMPLETE och inga certifierade delbanor.
- Ordningskontrollen jämför tillstånd, tagna beslut, kö och radutfall efter motsvarande event, försök och tidssteg. Den fångar också olika mellanlägen trots identiska sluttillstånd. Visad bana är alltid en specifik ordning.
- Tillstånd avläses normalt vid stegets slut. Klicka på en tidslinjerad för mellanläget efter just den raden. Händelsekön visar också sådant som förfaller efter horisonten.
- Utgifter/tillskott räknas enbart från historikens faktiska budgetförändringar. Beslutskostnader, positiva eventtillskott, negativa eventförändringar och kvarvarande budget visas separat. Saknas budgetkonto visas inga påhittade monetära värden.
- Ändrade körindata markerar äldre resultat. Namn/etiketter ändrar inte köridentiteten. Tidigare resultat kan alltid öppnas under Planer.
- Ingen generell målfunktion, poäng eller rekommendation införs. Verksamhetsglapp kräver en källkopplad läsanvisning i presentationslagret; saknas den anges begränsningen.

## Så läses jämförelsen

`static/comparison.js` läser granskade historiker utan att ändra körindata. Transportens källkopplade `presentation[modellidentitet].comparison` anger vilken tillståndsmarkör jämförelsefrågan gäller och vilka par av villkor som definierar glapp. Definitionen kommer från originalets kontrollfrågor, inte från antagna betydelser hos ID:n. Namn, faktiska veckor, längder och slutsatser hämtas från respektive modell/presentation och historik.

Glapp räknas vid tidsstegens slut som förfluten tid. De kan avslutas eller öppnas igen. Ett fortfarande öppet glapp visar ”minst” och får inget antaget slutdatum. Läget vid analysens start kan begränsa kunskapen om när ett glapp började. Ett godkännande betyder inte att faktisk drift har startat.

Blockeringar kommer från historikens faktiska misslyckade försök. Vyn visar när vart och ett av de då saknade villkoren först observeras uppfyllt senare. Samtidigt uppfyllda krav, budget och ej tidigare taget beslut avläses separat vid observerade beslutstillfällen. Detta är ingen sökning efter en ny möjlig plan. Det faktiska genomförandet hämtas från historiken.

Betalningstabellen innehåller endast genomförda beslut med positiv deklarerad kostnad. Kostnadsfria genomföranden räknas separat. Budgettillskott och övriga förändringar redovisas separat från beslutsbetalningar; blockerade/överhoppade försök betalas inte.

Fabriken och importer utan glappdefinitioner får inga påhittade glapp. Utan prioriterad jämförelsefråga väljer vyn ett beslut som bara genomförts på ena sidan eller den största tidsskillnaden, med tydlig begränsning om att ingen generell viktning finns. Om beslutstiderna är lika men sluttillstånden skiljer sig visas tillståndsskillnaderna. Sammanfattningen gäller valda händelseordningar; befintlig full kontrollstatus hålls synlig.

## Export, import och lagringsformat

Knappen **Exportera** sparar en ny JSON-fil under lagringskatalogens `exports/`. Den exakta lokala sökvägen visas i vyn; välj den filen med **Importera projekt**. Funktionen kräver ingen nedladdningsfunktion i webbläsaren.

Exporten `ce3-project/1` innehåller alla projektversioner och deras modeller, källidentiteter, visningsmetadata och planer samt körindata, inputhashar och fulla körhistoriker. Import skapar en ny lokal projektidentitet och granskar historikerna på nytt. En skadad historik behålls med synlig FAIL; en felaktig koppling mellan input och projektversion avvisar hela importen. Import publiceras först när hela projektstrukturen är validerad.

På disk ligger `PROJECT_ID/versions/000001.json` och `PROJECT_ID/runs/RUN_ID/{input.json,started.json,history.json.gz,audit.json,record.json}`. Versioner och körningar får nya identiteter; befintliga filer används inte som nya utdata. Saknas slutbesked efter ett avbrott visas körningen som ERROR och kan köras om till en ny identitet. Kör högst en serverprocess per datakatalog; låsning och versionskonflikter hanteras inom den processen.

## Verifiering

```sh
python3 -B isolated-tests/structural-ce3-workbench/verification/test_workbench.py
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B isolated-tests/structural-ce3-workbench/verification/test_presentation.py
node isolated-tests/structural-ce3-workbench/verification/presentation-ui.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/verification/test_comparison.py
node isolated-tests/structural-ce3-workbench/verification/comparison-ui.test.cjs
node --check isolated-tests/structural-ce3-workbench/static/app.js
node --check isolated-tests/structural-ce3-workbench/static/presentation.js
```

DOM-testet använder repositoryts befintliga utvecklingsberoende `linkedom`; servern har fortfarande inga paketberoenden. Presentationstestet jämför mot git-checkpoint `a7a5525`; jämförelsetestet jämför sex fulla körpaket mot `4c2f745`. Kör Python-jämförelsetestet före dess Node-test: det skapar tillfälliga, färska och granskade testhistoriker under `/tmp`.

UI-sviten använder tillfällig, separat lagring och färska kärnkörningar. `verification/latest.json` sparar senaste testsammanställningen, med köridentiteter och granskningsstatus. Den är en testlogg; tillfälliga testprojekt städas efter sviten. Manuellt verifierade browserprojekt ligger kvar i lokal lagring. Se `REPORT.md` för faktiskt genomförda kontroller.

## Avgränsningar

Lokalt prototyplager, en serverprocess per datakatalog, ingen inloggning eller publicering. Inga ändringar i kärnans regler. Ingen AI-onboarding eller optimering. JSON-formatet är strikt; äldre originalformat öppnas via exempeladaptrarna, inte genom generell konvertering av godtyckliga äldre modeller. Importerade modeller utan visningsmetadata använder tydliga ID-fallbacks. Egna namn kan anges; betydelser gissas inte utifrån ID.

Standardtak: 1 000 banor, 200 000 emitterade arbetsrader och 1 000 steg. Replay och audit har vardera 120 sekunders processtak. Gränser kan sänkas i UI men inte höjas över serverns tak. Stora fulla historiker kan ge långsamma vyer/exporter; import begränsas till 128 MB. Jämförelsen är parvis och gäller valda fasta utfall, ingen sökning efter bästa plan.
