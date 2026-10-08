# Verifieringsrapport · lokal CE3-vy

Senaste tillägget är jämförelsepasset nedan, utifrån UI-checkpoint `4c2f745`. De inledande avsnitten dokumenterar första leveransen; deras äldre testresultat ska inte läsas som nya körningar.

Datum: 2026-10-07. Utgångs-HEAD: `ede28868f4018aba2bf6da92500bce659f6badcc`. Inga spårade ändringar fanns vid start. Befintliga ospårade granskningsfiler har lämnats orörda. Inga AGENTS.md-filer fanns i projektets anvisningskedja. Kärnans README, REPORT, FORMAT, exekverbara schema, profile.json, adaptrar och historikformat lästes före implementationen.

Leveransen ligger helt i `isolated-tests/structural-ce3-workbench/`. Ingen fil i uppspelningskärnan, granskaren, CE2, kontraktet, originalfallen, deras resultat eller transportdemon har ändrats. Ingen ny motorregel har införts.

## Levererat

Fyra svenska sektioner: Projekt, Beslut, Planer och Jämförelse. Responsiv layout med beslutskort, sektionstoner, symboler och textstatus. Modellstyrda kostnader, villkor och effekter; separat etikettlager. Flera namngivna planer med duplicering, tidssteg, radordning och `if_not_taken`. Obligatoriska externa val, inga positiva standardbesked i exemplen.

Loopback-server i Pythonstandardbiblioteket. Append-only projektversioner och separata körkataloger. Replay använder befintlig CLI i egen process; audit använder den separata befintliga granskaren i ännu en process. Historiken återläses och granskas igen före resultatvisning, inklusive vid återöppning och import. Referensbana och andra eventordningar kan väljas. Ordningskänslighet beräknas som observationer av granskade rader, även mellanlägen. Ingen verksamhetsmålfunktion eller poäng finns.

Projektbyte sparar ändrat utkast. Modellbyte återställer externa val och behåller försök för uttrycklig rättning. Ändrade körindata ger markering för äldre resultat. Export sparas direkt som ny lokal JSON-fil via servern; import skapar en ny projektidentitet med bevarad versionshistorik. Ingen webbläsarnedladdning krävs.

## Automatiskt genomförda kontroller

| Kontroll | Resultat |
|---|---|
| Befintlig kärnsvit, `unittest discover ... -p 'test_*.py' -v` | 27 tester PASS |
| UI/serverintegration, `verification/test_workbench.py` | 14 tester PASS |
| Riktad omkörning av test 13 efter förbättrad RUNNING/PENDING-visning | PASS |
| JavaScript, `node --check static/app.js` | PASS |
| Bevarande, SHA-256 av alla vid start spårade och ej ignorerade ospårade filer | 1 846 kontrollerade, 0 ändrade |

UI-svitens slutkörning skapade **18 nya replaypaket**: 17 COMPLETE/PASS och ett avsiktligt INCOMPLETE. De kompletta paketen innehöll sammanlagt **431 banor**. Skadade importer och senare manipulationer testades separat och förväntades ge FAIL. Ett avsiktligt begränsat paket eller en avsiktligt skadad historik räknas aldrig som ett granskat verksamhetsresultat.

De 14 testerna täcker:

1. Fabrik: normaliserad filöppning, duplicerad/redigerad plan, färsk replay, audit, parvis jämförelse, versionssparande, ny Pythonprocess, exportfil och import.
2. Transport: A:s 4 och B:s 96 eventordningar; samtliga budgetprojektioner mot färska historiker; duplicerad B med överhoppningsförsöket flyttat från vecka 20 till 21, ny replay/audit/jämförelse; bestående lagring och import.
3. Tomma externa val får sparas som utkast men avvisas före replay.
4. Otillåten regel i oanvänd gren, dubbla JSON-nycklar och NaN avvisas.
5. Negativt och uteblivet elbesked för båda samma-parkeringsplanerna, blockerade T7 och efterföljande oberoende T12. Uteblivet bevarar deklarerat vänteläge.
6. Åtta samma-parkeringsbanor; mellanläget `cycle_ready` varierar trots ett gemensamt sluttillstånd.
7. `max_paths=1` ger INCOMPLETE; ingen bana exponeras som granskad.
8. Manipulerad import och manipulation efter första godkända granskningen avvisas vid nästa läsning.
9. Olika externa utfall eller modeller får inte jämföras.
10. Versionskonflikt avvisas och tidigare versionsfil förblir byteidentisk. Ogiltiga sökvägsidentiteter avvisas.
11. Modell utan budgetkonto ger inga påhittade budgetvärden.
12. Samma steg: genomfört försök, villkorat överhopp, engångsblockering och nästa oberoende genomförda försök bevarar ordningen.
13. Pågående körning ger RUNNING/PENDING; avbruten körning utan slutbesked ger synligt ERROR/FAIL och kan exporteras/importeras.
14. Import med felaktig inputkoppling avvisas atomärt utan ett delvis skapat projekt.

Loggar: `verification/core-tests.log`, `verification/workbench-tests.log`, `verification/active-run-tests.log`. Maskinläsbar slutrapport med indataidentiteter: `verification/latest.json`. Bevarandemanifest med utgångshashar: `verification/preservation.json`.

Den gamla fulla dubbelregressionen med 634 huvudhistoriker har **inte** körts om. Kärnans relevanta befintliga generella svit samt nya integrationer har körts. Inga gamla resultatkommandon användes.

## Webbläsarverifiering

Genomförd i Codex inbyggda webbläsare, med bred vy **1440 × 960** och smal vy **390 × 844**. Startsida, beslutskort, planredigering och jämförelse inspekterades visuellt. Smal plan- och jämförelsevy höll sig inom skärmbredden; observerad dokumentbredd 375 px i 390 px viewport inklusive rullningslist. Sektionerna kunde navigeras och formulären användas även i den smala vyn. Konsolkontrollen visade inga JavaScriptfel.

Fabrikens exempel öppnades, externa utfall valdes uttryckligen och planen kördes. En kopia namngavs och D8 flyttades från vecka 12 till 13. Vid vecka 12 visade jämförelsen 8 respektive 7 genomförda försök och `production_authorized=true/false`. Vid horisonten beskrev sammanfattningen de konkreta olika genomförandetiderna. Efter ändringen visades ”Resultat från en äldre version” tills planen kördes på nytt.

Fabrikens historikvärden i UI: 8 genomförda, 0 blockerade, beslutsutgifter 14, tillskott 6, kvarvarande budget 0. Transportens A: 12 genomförda, 1 blockerat, utgifter 29, budget 1. Duplicerad B: 12 genomförda, 0 blockerade, 1 villkorat överhopp, utgifter 29, budget 1. Värdena stämdes av mot nya sparade och granskade historiker. Planerna jämfördes vid vecka 12 och vid horisonten; råa tillståndsskillnader och konkreta beslutstidpunkter visades utan glappmått eller målpoäng.

Det ordningskänsliga samma-parkeringsfallet kördes separat i webbläsaren. UI visade **8 av 8 granskade banor** och efter `E_T12` vecka 14: `cycle_ready: Ja / Nej`. En ensam referensbana presenterades inte som robust.

En modellfil med otillåten steglängd gav begripligt fel och utfällbar sökväg `$/model/clock`, profil `fixed-replay/0.1`, typ `UnsupportedFeature`. En giltig normaliserad modellfil öppnades och sparades som ett nytt projekt. En projektfil med avsiktligt skadad historik importerades: körstatus COMPLETE och granskningsstatus FAIL visades separat, utan granskad tillståndsvy. En ny körning med `max_paths=1` gav synligt INCOMPLETE även i granskningen.

Servern stoppades och startades om på 8876 med samma datakatalog. Både fabrikens och transportens sparade projekt återöppnades i webbläsaren och deras historiker återgranskades till PASS med samma budgetvärden. Exportknappen verifierades mot den slutliga serverlagringen: transportprojektets exportfil skapades under `local-data/exports/` och dess exakta sökväg visades. Ren export/import för båda fallen verifierades dessutom i integrationstesterna.

Under arbetet hittades och rättades ett formulärproblem där fältändringar kunde missas före blur samt en felaktigt nästlad projektlista. Den korrigerade vyn verifierades efter omladdning. Webbläsarens blob-nedladdning gav ingen verifierbar download-händelse, varför slutleveransen använder serverlagrad export i stället.

## Drift och begränsningar

Slutservern startades på **http://127.0.0.1:8876**. Ingen process eller fil för transportdemon på 8765 ändrades. Startinstruktioner finns i README.

Första lokalversion, en serverprocess per datakatalog. Endast kärnans befintliga `fixed-replay/0.1` stöds. Ingen grafisk modellredigering, AI-onboarding, optimering eller publicering. ID:n och källtexter används när visningsmetadata saknas; enumvärden översätts inte automatiskt. Jämförelsen använder de två valda planernas senaste granskade körningar som matchar aktuella indata; äldre resultat är läsbara under Planer.

Resurstak: 1 000 banor, 200 000 emitterade arbetsrader, 1 000 steg, 120 sekunder per replay/auditprocess, 128 MB import. Stora fullhistoriker kan bli långsamma att visa och exportera. Slutresultatet är ett lokalt arbetsverktyg för den avgränsade profilen, inte en verifiering av modellernas verkliga verksamhetspremisser.


## Användarvänlighetspass · 2026-10-07 · efter a7a5525

Omfattning: endast denna UI-katalog. Visuell grunddesign, kärna, kontrakt, CE2, originalmodeller, originalresultat och transportdemo på 8765 är oförändrade. Servern har startats om på samma **http://127.0.0.1:8876** med befintlig lagring.

### Faktiskt genomförda förbättringar

- Separat presentation knuten till exakt modellidentitet och ID för beslut, händelser, tillstånd, typade kategorivärden och externa utfall. Transportens T1–T12 använder de beställda namnen och E_T2 ”Besked om elanslutningen”. Fabrikens namn är kopplade till originalunderlaget, inklusive D1 ”Ansök om finansiering” och E_BANK ”Bankens besked”. Levererat, installerat, tillgängligt och godkänt hålls isär.
- Gemensamma etiketter i beslutskort, planväljare, externa besked, blockeringar, tidslinjer, tillstånd, utgifter och jämförelse. Äldre resultat använder sin sparade modellidentitet. Etiketter ingår inte i `run_input`, replay eller audit.
- Beslutskorten visar namn, kostnad, förutsättningar, direkt förändring inklusive budgetavdrag samt senare möjliga effekter. Externa alternativ och eventförvillkor visas uttryckligen. Fulla regler, råa ID:n och källidentiteter finns i utfällbara tekniska detaljer.
- ”Analys till”, kort svensk vägledning och modellbundna budgetenheter. Fabriken använder Mkr från originalets ”miljoner kronor”. Transporten använder ”miljoner”; dess original anger ingen valuta, vilket vyn förklarar. Import utan enhetsmetadata visar ”enhet saknas”.
- Planerna grupperas per tidssteg, med rubriker Vecka/Beslut/Utförande och bibehållen intern ordning. Planens avsikt skiljs från körningens faktiska resultat. Även tomma deklarerade tidssteg bevaras vid avläsning av formuläret.
- Jämförelse väljer två olika planer när sådana finns. En ensam plan får erbjudandet att duplicera och ändra tidpunkter. Samma plan på båda sidor, saknade externa val, saknade körningar och behov av omkörning förklaras före jämförelsen.
- Import utan namn använder tydliga ID-fallbacks; egna namn kan anges under Projekt → Visningsetiketter och på beslutskorten. Enbart öppning av tomma etikettfält skapar inga ändringar. Äldre egna beslutsnamn bevaras vid övergång till det modellbundna lagret.

### Kontroller i detta pass

| Kontroll | Resultat |
|---|---|
| Befintliga UI/serverintegrationer, `test_workbench.py` | 14 tester PASS, ny logg `usability-integration-tests.log` |
| Presentation, källkoppling, modellisolering, beständighet och checkpointjämförelse | 5 Python-tester PASS, `presentation-tests.log` |
| Faktisk JS-rendering/formuläravläsning i DOM samt presentationsfunktioner och jämförelsevägledning | PASS, `presentation-ui-tests.log` |
| JavaScript-syntax, både app.js och presentation.js | PASS |
| Gamla och nya operativa indata och fulla replaypaket | Exakt lika för fabrikens plan, transport A/B och samma-parkering A/B; `presentation-invariance.json` |
| Bevarande av skyddade befintliga filer | 1 908 filer kontrollerade, 0 ändrade; därav 62 befintliga lokala projekt-/resultatfiler; `usability-preservation.json` |

Checkpointjämförelsen laddar UI-servicekoden från `a7a5525` och kör samma oförändrade kärna för båda versionerna. Externa utfall väljs uttryckligen till respektive modells deklarerade uteblivna besked i de fem jämförelserna. De befintliga integrationstesterna täcker även positiva och negativa utfall, granskning, blockeringar, avbrott, export/import och ordningskänslighet. Kärnans 27-testsvit och den äldre fulla dubbelregressionen har inte körts om i detta presentationspass.

### Levande webbläsare och upprepade rader

Fabrik och transport kontrollerades i Codex webbläsare vid **1440 × 960** och **390 × 844**: beslutskort, planredigering och jämförelse. Den smala vyn hade dokumentbredd 375 px inom 390 px viewport inklusive rullningslist. Namn, kategorimeningar, deklarerade budgetenheter och externa besked kontrollerades i den levande vyn. Inga JavaScriptfel rapporterades i webbläsarkonsolen.

Transportens Plan A jämfördes före och efter ändringen mot sparad version 2 och modellens planinnehåll. Levande DOM hade **13 försök och exakt radnummer 01–13**, utan dubbla radnummer. Plan B kontrollerades också: **13 försök, 01–13**, i samma ordning som sparad plan. Plan A:s T7 vecka 12 och 20 är två uttryckliga försök. Plan B:s T7 vecka 20 har kvar `if_not_taken`. Grupperingen flyttar eller tar inte bort något av dessa försök. Den rapporterade upprepningen i helsidesskärmbilden kunde inte beläggas som ett faktiskt visningsfel; DOM och sparad plan visar ingen dubblering. Den behandlas därför som en skärmbildseffekt, utan någon automatisk rensning av rader.

Fabrikens sparade planer jämfördes i webbläsaren: produktionsstart vecka 12 respektive 13 visas med svenska beslutsnamn och naturliga tillståndsmeningar. Transportens A och sparade B-kopia jämfördes: ett respektive noll blockerade försök, 29 miljoner i beslutsutgifter och 1 miljon kvar. Känslighet för händelseordningar är fortsatt synlig. Att välja samma plan på båda sidor gav det avsedda beskedet. En tillfällig ändring av A:s sista försök från vecka 20 till 21 gav både ”Resultat från en äldre version” och ”planen har ändrats och behöver köras om”. Tidpunkten återställdes till 20.

Nya fabrik- och transportexempel öppnades med sina befintliga 8 respektive 13 försök. Samtliga externa väljare var tomma; körning krävde uttryckliga val. En ren normaliserad modell importerades via webbläsarens filväljare och visade tom plan, vägledning att skapa den samt ID-fallbacks och ”enhet saknas”. Egna besluts-, event-, tillstånds- och kategori-etiketter skrevs in, sparades och exporterades via vyn. Exportfilen återimporterades via samma lokala servers import-API och öppnades sedan i webbläsaren: alla fyra etiketter fanns kvar. Det separata integrationstestet täcker även egna externa utfallsnamn. Erbjudandet ”Duplicera planen och ändra tidpunkterna” provades och öppnade den nya kopian i planvyn.

Befintliga avsiktligt skadade/ofullständiga kontrollhistoriker öppnades på nytt: COMPLETE/FAIL respektive INCOMPLETE/INCOMPLETE visas separat och utan granskat tillståndsresultat. Tidigare versions- och resultatfiler ändrades inte. Nya kontrollprojekt och versioner ligger som nya, git-ignorerade lokala filer.

### Kvarvarande begränsningar

Transportunderlaget anger inte valuta. Importerade modeller saknar automatisk semantisk översättning och behöver egna visningsetiketter; ingen betydelse gissas utifrån ID. Långa namn kan kapas visuellt i en smal nativ väljare, medan hela alternativtexten finns i väljaren och på beslutskortet. Övriga begränsningar för lokal drift, resurstak, strikt modellformat och stora historiker är oförändrade.


## Begriplig jämförelse · 2026-10-07 · efter 4c2f745

Startkontroll: branch `decision-flow-demo-v1`, HEAD `4c2f745`, inga spårade arbetskatalogsändringar. Befintliga ospårade granskningsfiler har bevarats. Inga tillämpliga AGENTS.md fanns. Endast filer i denna UI-katalog har ändrats. Ingen publicering; servern fortsätter på **http://127.0.0.1:8876**.

### Förändring och härledning

Jämförelsen läses nu i fem numrerade avsnitt: **Huvudskillnaden → Konsekvensen → Varför → Utgifterna → Förutsättningarna**. Två planers namn och faktiska tidpunkter visas först. Därefter visas avslutade respektive kvarstående glapp, faktiska blockeringsorsaker och när kraven observeras uppfyllda, betalningar per genomfört beslut och tidssteg samt respektive plans externa besked, horisont och kontrollstatus. Detaljer om tillstånd, ordningar, källor och full historik är hopfällda. ”Avläst status” har bytts till ”Resultat i vald körning”. Ingen generell vinnare utses.

Nya `static/comparison.js` är ett rent avläsningslager. Transportens originaltext definierar i kontrollfråga 5 glapp efter parkeringsborttagning tills trafikgodkännande respektive öppnat cykelstråk finns. Dessa två läsanvisningar, samt fokusmarkören från jämförelsefrågan, finns som modellbundna tillståndsvillkor i `presentations.json`, med befintliga originalkällors hashkoppling och konkret källreferens. Det finns inga transportnamn, besluts-ID:n, fasta resultatveckor eller accepterade slutsatser i härledningsalgoritmen. Alla resultat räknas från den valda granskade historiken. Metadata skrivs inte in i operativa modeller eller körindata.

Glapp avläses vid tidsstegens slut. Längden är differensen mellan tidpunkterna; vecka 14–26 är tolv veckor, inte tretton. Öppna intervall saknar slutdatum och visas som minst den observerade längden. Återöppnade glapp och glapp som avslutas exakt vid horisonten hanteras. Ett glapp som redan råder vid start får en markering om okänd tidigare början. Ordningen mellan samtidiga händelser kan påverka mellanlägen; veckolängder framställs inte som en fullständig beskrivning av dessa mellanlägen.

Blockeringsförklaringar börjar i `attempt_blocked.failures`. Senare uppfyllande av varje saknat villkor söks i efterföljande observerade tillstånd. Samtidiga krav och budget avläses vid beslutstillfällen medan beslutet ännu inte är taget, separat från faktiska `decision_executed`-rader. Vyn kör inte motorn på nya, hypotetiska försök. Villkor som först uppfylls behöver inte vara permanent uppfyllda, vilket anges.

Betalningstabellen använder deklarerade kostnader enbart för faktiskt genomförda beslut. Blockerade och överhoppade försök kommer inte med. Kostnadsfria beslut redovisas som antal. Övriga budgetförändringar redovisas separat; kvarvarande budget kommer från observerat tillstånd. Transportens enhet är fortsatt ”miljoner”, inte Mkr.

Olika externa utfall tillåts genom ett uttryckligt alternativ i UI-serverns jämförelseanrop. Modell, startläge, källidentitet, aktuella körindata och granskning måste fortfarande stämma. Både före och efter jämförelsen visas att skillnader då kan bero på både plan och besked. Varje plans besked visas separat. Serverns tidigare strikta jämförelseläge finns kvar som standard för anrop utan alternativet. Replay och audit har inte ändrats.

### Verifiering i detta pass

| Kontroll | Resultat |
|---|---|
| Befintlig UI/serverintegration | 14 tester PASS; `comparison-integration-tests.log` |
| Befintlig presentation/regression | 5 Python-tester PASS; `comparison-presentation-regression.log`; befintligt DOM-test PASS |
| Nya riktade server-/invarianstester | 2 tester PASS; `comparison-tests.log` |
| Ny härledning och faktisk HTML-rendering | PASS; `comparison-ui-tests.log` |
| JavaScript-syntax och whitespace | PASS |
| Skyddade befintliga filer | 1 918 kontrollerade, 0 ändrade, inklusive 72 befintliga lokala projekt-/resultatfiler; `comparison-preservation.json` |

Nya jämförelsetestet skapar elva färska, granskade testhistoriker: sex för Samma parkering (A/B × färdigt/avslag/uteblivet besked), en med senare uttryckligt återförsök, två fabriksplaner och två importerade planer utan presentationsmetadata. Ett ytterligare ändrat modellfall används för att verifiera att modellskillnad fortfarande avvisas även när olika externa utfall är tillåtna. För de sex acceptansfallen jämförs både operativ inmatning och **hela replaypaketet** med checkpointens indata och samma resursgränser: exakt lika. Identiteter och status finns i `comparison-invariance.json`. Den äldre kärnsviten och fulla gamla dubbelregressionen har inte körts om i detta rena UI-pass.

Node-testet kontrollerar alla banor i de sex acceptansfallen, även med omvänd jämförelseordning. Kontrollerade resultat:

| Elbesked | Trafikgodkännande A / B | Parkeringsborttagning | Bussglapp A / B | Cykelglapp A / B | Slutbudget |
|---|---|---|---|---|---|
| Färdigt | vecka 20 / 12, åtta veckors skillnad | vecka 14 / 14 | 6 veckor avslutat / inget | 2 veckor avslutat / inget | 1 miljon / 1 miljon |
| Avslag | inget inom vecka 26 / inget inom vecka 26 | vecka 14 / 14 | minst 12 veckor kvarstår / minst 12 veckor kvarstår | 2 veckor avslutat / inget | 1 miljon / 1 miljon |
| Uteblivet besked | inget inom vecka 26 / inget inom vecka 26 | vecka 14 / 14 | minst 12 veckor kvarstår / minst 12 veckor kvarstår | 2 veckor avslutat / inget | 1 miljon / 1 miljon |

A:s blockerade försök vecka 12 har saknad depå, laddinstallation och elanslutning. Vid positivt besked observeras dessa uppfyllda vecka 16, 18 respektive 20. Den särskilda planen med nytt försök vecka 22 visar uppfyllda krav vecka 20 och faktiskt beslut vecka 22. Fabrikens jämförelse visar uppfyllda krav vecka 12 i båda planerna, men genomförande vecka 12 respektive 13. Ingen driftstart härleds från ett godkännande.

Dessutom prövas avsaknad/ogiltighet av glappdefinitioner, modell utan budgetkonto, återöppnade glapp, avslut exakt vid horisonten, lika beslutstider med olika sluttillstånd, tidsavläsning före horisonten, betalningar utan blockerade försök, separata externa besked och att presentationen inte muterar sina indata.

### Webbläsargranskning

Granskad i en separat flik på 8876 så att den befintliga flikens arbete kunde bevaras. Bred vy **1440 × 960**, smal vy **390 × 844**. Positivt besked, avslag och uteblivet besked öppnades i jämförelsen och avlästes mot acceptansvärdena ovan. Omvänd ordning gav fortsatt B åtta veckor före A. Blandat positivt besked/avslag gav synlig varning och olika externa besked under respektive plan.

Huvudavsnitt, glapp, blockeringar, utgifter och förutsättningar kontrollerades i levande DOM. Fabriken och en återimporterad modell utan namn/glappdefinitioner prövades också. Importen visar ID-fallbacks, okänd beloppsenhet och explicit begränsning för glapp. Smal betalningsvy har dokumentbredd 375 px inom 390 px viewport inklusive rullningslist. Inga JavaScriptfel observerades i konsolen. Tillfälliga kontrollprojekt har sparats som nya git-ignorerade lokala projekt; tidigare filer är orörda.

### Databegränsningar

Fabriksmodellen och godtyckliga importer innehåller ingen generell definition av verksamhetsglapp. Sådana beräknas därför inte utan separat, källkopplad läsanvisning. Saknad definition betyder inte noll glapp. Utan deklarerad fokusfråga kan UI visa en konkret tids-/tillståndsskillnad men inte avgöra verksamhetens viktigaste mål. Härledningen gäller modellens markörer och granskade tillstånd, inte faktisk trafikdrift eller produktionsvolym. Ett ej observerat godkännande får inget uppskattat framtida datum. Ett första uppfyllt villkor är inte ett bevis om bestående tillgänglighet. Sammanfattningen avser valda händelseordningar; kontroll av alla ordningar och begränsningar för INCOMPLETE/FAIL finns fortsatt kvar. Transportens valuta är fortsatt odeklarerad.


### Ändrade filer i jämförelsepasset

Alla sökvägar är relativa till `isolated-tests/structural-ce3-workbench/`:

- `static/comparison.js` (ny): generell, ren avläsning av tidpunkter, intervall, krav och betalningar.
- `static/app.js`, `static/style.css`, `static/index.html`: femdelad resultatvy, språk, responsiv layout och inläsning av härledningsmodulen.
- `static/presentation.js`: jämförelseförberedelsen tillåter olika externa besked, med varning i vyn.
- `presentation.py`, `presentations.json`: modell- och källbundna läsanvisningar för transportens jämförelsefråga och glapp; uppgradering av äldre källkopplade presentationer utan ändrade körindata.
- `server.py`, `service.py`: servering av modulen och uttryckligt UI-alternativ för jämförelse med olika externa utfall.
- `verification/test_comparison.py`, `verification/comparison-ui.test.cjs` (nya): riktade regressioner och härledningskontroller.
- `verification/comparison-invariance.json`, `verification/comparison-preservation.json`, `verification/comparison-tests.log`, `verification/comparison-ui-tests.log`, `verification/comparison-integration-tests.log`, `verification/comparison-presentation-regression.log` (nya) samt uppdaterad `verification/latest.json`: verifieringsbevis.
- `README.md`, `REPORT.md`: arbetsflöde, härledningsprinciper, kontroller och databegränsningar.

## Planarbetsvy: redigering och resultat (2026-10-07)

Utgångspunkt: branch `decision-flow-demo-v1`, HEAD `d5d2da7`, inga spårade ändringar vid start. Befintliga ospårade revisionsunderlag lämnades orörda. Ändringen gäller endast arbetsvyns UI, verifiering och dokumentation. Ingen ändring i kärna, server, operativa modeller, jämförelseregler, CE2 eller publik webbplats. Ingen publicering; servern behålls på `http://127.0.0.1:8876`.

### Genomförda förändringar

- Planer har interna flikar **Redigera plan** och **Resultat**. Planval, formulärutkast, externa besked och resursinställningar bevaras vid flikbyte. Ny körning öppnar Resultat. Fast verktygsrad erbjuder planval, flikar, sparande och körning/återgång.
- Kompakta rader och en gemensam kolumnrubrik på bred skärm. Mobilkontroller har separata tillgängliga namn och synligt tangentbordsfokus. Pilar ändrar endast ordningen inom samma tidssteg; uttryckliga återförsök tas inte bort.
- Standardvyn visar bara veckor med försök och förklarar att övriga veckor ingår i körningen. **Visa alla veckor** är initialt avstängt. Valet visar högst tolv tidssteg åt gången, med föregående/nästa och direkt hopp, utifrån modellens start/horizont. Tomma veckor märks **Inga beslutsförsök planerade**. Visningen skapar inga tomma operativa rader.
- Formulärsynkronisering använder en stabil fullständig radlista under varje rendering. Dolda veckor försvinner inte när bara en sida syns; flersiffrig tidsredigering råkar inte skriva över en annan rad efter omsortering av visningen. Befintliga tomma tidssteg bevaras också vid uttryckliga radåtgärder.
- Resultatets direkta sammanfattning visar sparat plannamn, körningens egna externa besked, hela perioden, genomförda/blockerade/överhoppade försök, totala utgifter och kvarvarande budget. Faktiska blockeringar och kontrollbegränsningar är synliga; vid många blockeringar finns sidval (åtta per sida).
- Inaktuella resultat är uttryckligen märkta. Den sparade körningens besked ersätts aldrig av den ändrade planens nya besked. INCOMPLETE eller underkänd kontroll visas utan en missvisande fullständig budgetsammanfattning. Ordningskänslighet och vald händelseordning syns direkt.
- Körförlopp, fullständig slutstatus samt tekniska kontroller/full historik är hopfällda från början. Tidslinjen grupperar högst åtta veckor per sida, skiljer beslutsförsök från fördröjda händelser och kan filtreras. Den sparade ordningen inom varje vecka behålls. Inga nya målstatusar eller verksamhetsglapp införs.

### Undersökning av upprepade veckorubriker

I den levande vyn före ändringen, med sparad Plan B i Samma parkering, fanns **en** planrubrik för vecka 12 och två planrader, T7 följt av T12. Tidslinjen hade **sex** separata tidsangivelser för vecka 12: fyra fördröjda händelser följda av två försök. Något fel med tre dubblerade planrubriker kunde alltså inte reproduceras; en specifik skärmbildseffekt kan inte fastställas utan originalbilden. Den nya tidslinjen samlar de sex raderna under en veckorubrik utan att ändra deras index eller ordning. Ingen operativ sortering eller deduplicering har införts.

### Faktiskt utförd verifiering

- Webbläsargranskning av Transporten, Samma parkering, Fabriken och importerad fabriksmodell utan etiketter på bred (1440 × 960; även 1266 px) och smal (390 × 844) skärm. Redigering och resultat öppnades för alla fyra. Ingen horisontell dokumentöverströmning i kontrollerade mobilvyer.
- Osparad tidsändring och ändrat externt besked följde med över flikbyte och tillbaka. Tidigare resultat visade inaktuell-markering och sina ursprungliga besked. Veckosidbyte utan ändring behöll markeringen att resultatet matchar körindata.
- Fabrikens duplicerade kontrollplan kördes i webbläsaren och öppnade Resultat automatiskt: 8 genomförda, 0 blockerade, 14 Mkr spenderat, 0 Mkr kvar. Återgång till redigering fungerade.
- Samma parkering: B visade 12 genomförda, 0 blockerade, 1 överhoppat, 29 miljoner spenderat, 1 miljon kvar. Vecka 12 hade en tidslinjerubrik och de sex faktiska raderna i sparad ordning. A visade ett blockerat försök med de tre faktiska saknade förvillkoren. Import utan etiketter visade tydliga ID och ”enhet saknas”.
- Tangentbord: Tab till radkontroll, vänster/höger samt End mellan interna flikar; vald flik och fokus verifierades i levande DOM. Native knappar, select, checkbox och details behålls. Skärmläsare har inte manuellt provats.
- Sparande/återöppning och export gjordes i webbläsaren. Exporten återimporterades via samma lokala server-API som filimporten använder, därefter öppnades kontrollplanens återgranskade resultat i webbläsaren. Modell, etiketter, planrader, ordning och externa besked var exakt lika. Filväljarens operativsystemdialog provades inte om i detta pass.
- `test_workbench.py`: **14/14 PASS** (inklusive fullständiga acceptansresultat, bevarande, import/export, ordning, INCOMPLETE och granskning).
- `test_comparison.py`: **2/2 PASS**. `comparison-ui.test.cjs`: PASS för alla banor i de tre elutfallen, omvänd jämförelse, fabrik och importer. Tidigare jämförelsevillkor är oförändrade.
- `presentation-ui.test.cjs`: PASS. Nytt `plan-workspace-ui.test.cjs`: PASS på elva granskade fixturer, dolda rader, flikbyte, besked, separata orsaker till inaktuella resultat, flersiffrig tidsändring, lägg till/flytta/ta bort/duplicera, tom ny plan, icke-noll start och miljonstegshorisont, tidslinjeordning och ofullständiga/underkända resultat.
- `check_plan_workspace_invariance.py`: **alla elva kompletta körbanemängder och operativa indata identiska med `d5d2da7`**, inklusive samtliga sex Samma parkering-fall, extra återförsök, fabrik och importer. Bevis i `verification/plan-workspace-invariance.json`.
- SHA-256-kontroll mot arbetsstarten: tidigare ospårade filer, originalmodeller/resultat och alla tidigare lokala datafiler oförändrade. Kontrollkörningen, exporten och importkopian tillförde enbart git-ignorerade lokala filer/versioner.

### Begränsningar och filer

Sammanfattningen avser hela horisonten för den tydligt angivna, valda händelseordningen. Den sammanför inte olika ordningar till en ny verksamhetsbedömning. Historiken kan visa faktiska misslyckade villkor men ger inga nya garantier om framtiden. Alla veckor och tidslinjen är sidindelade; en plan med många faktiska försök kan fortfarande vara lång i standardvyn. Flikval och filter är sessionsval, medan planutkast bevaras genom det befintliga uttryckliga sparandet.

Ändrade filer: `static/app.js`, `static/style.css`, `README.md`, `REPORT.md`, `verification/latest.json`. Nya filer: `verification/plan-workspace-ui.test.cjs`, `verification/check_plan_workspace_invariance.py`, `verification/plan-workspace-invariance.json`, `verification/plan-workspace-tests.log` och `verification/plan-workspace-preservation.json`.

## Läsbara resultatutfällningar (2026-10-07)

Startkontroll: `decision-flow-demo-v1`, HEAD `094c81e`, inga spårade ändringar. Befintliga ospårade filer och lokala data bevarade. Endast UI, dokumentation och verifiering ändras; kärna, server, modeller, körindata, körordning, exportformat och jämförelseregler är oförändrade.

### Presentation

- **Genomförda beslut och kvarvarande kö** visar en tabell med befintliga visningsnamn och genomförandetid från registrerade `decision_executed`-rader. Beslut utan avläsbar tid får uttrycklig upplysning om detta. Kön redovisar händelsenamn, schemalagd tid, modellens villkor och det sparade externa beskedet när sådant finns. Schemalagd prövning beskrivs aldrig som ett garanterat resultat. Tom kö har en tydlig text.
- **Avlästa slutvärden för alla banor** visar genomförda/blockerade försök, spenderat totalt och kvarvarande budget per händelseordning. Händelseutgifter, beslutsutgifter och inflöden särredovisas när relevanta. Totala utgifter är beslutsutgifter plus händelseutgifter; inflöden dras inte av. Tabellen förklarar att ordningarna tillhör samma plan och att lika slutbudget inte bevisar identiska resultat. Den gemensamma presentationen används även i jämförelsens tekniska kontroller, där respektive plannamn anges.
- **Samtliga betalningar och budgetförändringar** visar bara faktiskt registrerade förändringar i budgetkontot efter genomförda beslut eller inträffade händelser. Tid, visningsnamn, utgift/inflöde och saldot direkt efter raden kommer från den sparade historiken. Nollförändringar, blockerade försök och överhoppade försök listas inte som transaktioner.
- Resultatets och jämförelsens rådata är samlade under **Visa tekniska rådata (JSON)** inom tekniska detaljer. Utfällningen är initialt stängd. Underlaget för slutstatus, betalningar, banor, villkor, indata och historik finns kvar; exporten är oförändrad. Mellanlägets JSON ligger också uttryckligen under tekniska detaljer.
- Tabellerna har rubriker, tangentbordsfokuserbara rullningsområden och begränsad höjd. På smal skärm kan breda tabeller rullas inom sin sektion. Befintliga flikar, fast verktygsrad, kontrollvarningar och inaktuell-markering behålls.

### Utförda kontroller

Webbläsare: Transporten, Samma parkering, Fabriken och importerad fabriksmodell utan etiketter; bred vy 1440 × 960 och smal vy 390 × 844. Beslutslistor, transaktioner och bantabeller öppnades. JSON-sektionen öppnades separat och kontrollerades som initialt stängd. Mobilkontroll gav dokumentbredd 375 px inom 390 px viewport; tabellernas extra bredd stannar i rullningsområdet. Tangentbordsfokus och sidrullning i tabell provades. Inga JavaScriptfel observerades.

Konkreta avläsningar:

- Samma parkering A: trafikgodkännandet finns i genomförandelistan vecka 20, inte vid det blockerade försöket vecka 12. Tolv genomförda beslut men tio faktiska utgiftstransaktioner; 29 miljoner spenderat och 1 miljon kvar.
- Fabriken: bankens inflöde vecka 2 är 6 Mkr och budgeten direkt efter är 9 Mkr. Tabellen visar totalt 14 Mkr i utgifter, 6 Mkr i inflöden och 0 Mkr kvar. Betalningarna följer historikens faktiska ordning.
- Import utan etiketter: exempelvis ”Beslut (ID: D2)” och ”Händelse (ID: E_BANK)”, belopp med ”enhet saknas”. Inga betydelser gissas.
- Tom kö kontrollerad i de ordinarie exemplen. Befintligt granskat vittne `factory_probes/effect_beyond_horizon.history.json.gz` öppnades som en ny lokal kontrollkopia: beslut vecka 26, väntande händelse **Tillgången till den svenska lokalen upphör**, schemalagd vecka 34. Kopians körindata och kompletta bana är identiska med vittnet. Originalet ändrades inte. Villkor och externa besked i kö verifierades dessutom mot en faktisk tidigare köbild ur transporthistoriken i det riktade testet.
- Jämförelsens gemensamma utfällningar kontrollerades också: A:s åtta ordningar och B:s 96 ordningar visas i separata tabeller med plannamn; rådata finns i en separat JSON-sektion.

Automatiskt:

- `test_workbench.py`: **14/14 PASS**, inklusive acceptansresultat, bevarande, export/import, ordning och kontrollfel.
- `readable-results-ui.test.cjs`: **11 granskade fall / 328 kompletta banor PASS**. Beslutsnamn/tider, alla registrerade transaktioner och efterföljande saldon, summeringar mot faktisk historik, isolering av JSON samt oförändrade indata/historiker. Dessutom väntande händelse bortom horisonten, externa villkor/besked, saknad tid/budgetinformation och riktat fall med negativ händelseförändring samt separat inflöde.
- Befintliga `plan-workspace-ui.test.cjs`, `presentation-ui.test.cjs` och `comparison-ui.test.cjs`: PASS, inklusive flikar, inaktuella resultat och kompletta jämförelseacceptanser.
- `check_readable_results_invariance.py`: samtliga elva kompletta banmängder och operativa indata identiska med checkpoint **094c81e**. Bevis i `verification/readable-results-invariance.json`.
- SHA-256-kontroll mot arbetsstarten bekräftar att tidigare originalresultat, modeller, ospårade filer och lokala datafiler är oförändrade. Den nya kontrollkopian ligger i ignorerad lokal lagring.

### Databegränsningar och ändrade filer

Modeller utan budgetkonto får ingen fabricerad transaktionsredovisning. Om historiken saknar nödvändiga budgetvärden anges det och raden redovisas inte som en säker transaktion. Tidpunkter utan motsvarande historik anges som saknade. En köpost anger endast schemaläggning; körningen säger inget om ett faktiskt utfall efter horisonten. Beloppsenheter och namn följer befintliga modellbundna etiketter. Skärmläsare har inte manuellt testats.

Ändrade: `static/app.js`, `static/style.css`, `README.md`, `REPORT.md`, `verification/latest.json`. Nya: `verification/readable-results-ui.test.cjs`, `verification/check_readable_results_invariance.py`, `verification/readable-results-invariance.json`, `verification/readable-results-tests.log`, `verification/readable-results-preservation.json`. Servern behålls på `http://127.0.0.1:8876`. Ingen publicering.


## Jämförelsens slutsats, kontroll och orsaker · 2026-10-08

Utgångspunkt: branch `decision-flow-demo-v1`, HEAD `ec4bc06`, inga befintliga ändringar i spårade filer. Tidigare ospårat arbete i `docs/audits/` bevarat. Endast UI/presentation och denna verifiering ändras.

### Resultat

Huvudskillnaden uttrycks direkt med körningarnas plannamn, modellbundna resultatetiketter och faktiskt observerade tidpunkter. Transportens presentationskatalog anger ”får trafikökningen godkänd”; logiken innehåller inga transport-ID, veckor eller slutsatser. Fabrik och importer ger en saklig beslutsbenämning, med ID-reserv när etikett saknas. Ett uteblivet resultat får inget senare antaget datum.

En ny läsoperation hämtar de redan granskade banorna i ett anrop per körning. Presentationen kontrollerar COMPLETE, profil, granskarens PASS/verified/all_event_permutations, matchande indataidentitet, banidentiteter och full historik till modellhorisonten. Antal räcker inte. Tidpunkt/utebliven uppfyllelse, definierade glapps perioder och öppet/avslutat-läge samt spenderat/kvarvarande jämförs över alla banor. Variationens värden och antal visas vid berört mått. Saknad fullständig täckning ger uttrycklig begränsning, aldrig stabilitetsbesked. Befintlig spärr mot jämförelse av INCOMPLETE eller felgranskade körningar kvarstår.

Tekniska detaljer skiljer mellan observationer efter enskilda händelser och vid tidsstegens slut. Beslutsutfall/blockeringsorsaker, transaktioner och komplett slutstatus jämförs uttryckligen innan de beskrivs som oförändrade. Orsakstabellen visar saknade förvillkor och faktisk observerad falskt→sant-övergång efter blockeringen. Krav uppfyllda i beslutsfas, verkliga försök och genomförande redovisas separat. Den gäller vald bana och övergången lovar inte fortsatt uppfyllelse.

### Bevarat orderunderlag

Se [kontrollrapporten](verification/order-audit-20261008/REPORT.md). Exakta kopior av tre maskinläsbara sammanställningar, ett gemensamt indataunderlag, fullhistorikhashar och reproduktionsskript ersätter behovet av dubbla stora historikfiler. Originalet i `/tmp/ce3-order-audit-20261008/` lämnades orört. Reproduktion verifierar båda fullständiga historikerna, oberoende granskning, varje banas mått, 768 jämförelsepar samt separata utfalls-/transaktions-/slutstatusinvarianser.

### Utförda kontroller

- Webbläsare på 1440×960 och 390×844: positivt, negativt och uteblivet elbesked, omvänd ordning, fabrik, import utan etiketter/glappdefinitioner samt separat syntetiskt variationsfall. Ingen dokumentöverbredd vid mobilkontroll. Orsakstabellen och tekniska förklaringen öppnades och avlästes. Variationsvarningens typografi korrigerades efter mobilgranskning.
- Positivt: A godkänd vecka 20, B vecka 12; 8 respektive 96 banor med stabila huvudmått. Tekniska detaljer: 6 respektive 8 varierande observationer efter händelser, inga vid veckosluten. Försök/orsaker, transaktioner och hela slutstatusen oförändrade inom respektive plan.
- Avslag/uteblivet: inget godkännande inom vecka 26, bussglapp minst 12 veckor och fortfarande öppet i båda planerna. Orsakstabellen anger ingen observerad övergång för elanslutningen.
- Fabrik: produktionsgodkännande vecka 12 respektive 13. Import: ”Beslut (ID: D8)” utan gissad betydelse, uttryckligt saknade glappdefinitioner.
- Separat fixture `verification/fixtures/order-variation.json`: två tillåtna ordningar med resultat vecka 1 respektive uteblivet, glapp avslutat respektive kvarstående, spenderat 2/0 och budget 8/10. Banbyte behåller variationsbeskedet. En riktig körning begränsad till max_paths=1 blir INCOMPLETE och jämförelseknappen spärras. Befintliga modeller ändras inte; två nya lokala kontrollkopior ligger i ignorerad lagring.
- `test_workbench.py`: 14/14 PASS. `test_comparison.py`: 2/2 PASS. `test_presentation.py`: PASS. Ny `test_comparison_coverage.py`: PASS för batchläsning och avvisad ofullständig granskning.
- Befintliga `comparison-ui.test.cjs`, `presentation-ui.test.cjs`, `plan-workspace-ui.test.cjs`, `readable-results-ui.test.cjs`: PASS. Det sista kontrollerar 11 fall / 328 kompletta banor. Ny `comparison-coverage-ui.test.cjs`: stabilitet, variation vid berörda mått, ändrad avläsningstid, omvänd ordning, reservbenämning, orsakstabell, sju ogiltiga/saknade täckningsfall och oförändrade indata.
- `check_comparison_coverage_invariance.py`: 11 kompletta banmängder och operativa indata identiska med `ec4bc06`; bevis i `verification/comparison-coverage-invariance.json`. SHA-256-kontroll mot arbetsstarten bevarar övriga källor, originalresultat och tidigare lokala filer; se `verification/comparison-coverage-preservation.json`.

### Reproduktion av UI-kontroller

Från repots rot, kör Python med `-B`:

```sh
python3 -B isolated-tests/structural-ce3-workbench/verification/test_comparison.py
python3 -B isolated-tests/structural-ce3-workbench/verification/test_comparison_coverage.py
node isolated-tests/structural-ce3-workbench/verification/comparison-coverage-ui.test.cjs
python3 -B isolated-tests/structural-ce3-workbench/verification/check_comparison_coverage_invariance.py
python3 -B isolated-tests/structural-ce3-workbench/verification/order-audit-20261008/reproduce.py
```

De två första skapar tillfälliga testunderlag i /tmp. Node-testerna använder befintlig linkedom-installation i repot.

### Filer och begränsningar

Ändrade produktfiler: `static/app.js`, `static/comparison.js`, `static/style.css`, `presentation.py`, `presentations.json`, `service.py`, `server.py`. Dokumentation: `README.md`, `REPORT.md`. Verifieringsfiler: `verification/latest.json`, nya coverage-tester, fixture, invarians-/bevarandebevis, testlogg och katalogen `verification/order-audit-20261008/`.

Kontrollen avser tillgängliga fullständigt granskade banor för fasta körindata enligt fixed-replay/0.1. Den omfattar inte andra strategier eller verklighetsvalidering. Saknade glappdefinitioner ersätts inte med gissningar. Orsakssektionen gäller vald bana. Alla banors historiker läses för kontrollen, vilket kan ta längre tid vid stora körningar; misslyckad hämtning ger ett begränsningsbesked. Skärmläsare har inte manuellt testats. Kärna, operativa modeller/planer och kompletta körresultat är oförändrade. Server: `http://127.0.0.1:8876`. Ingen publicering.
