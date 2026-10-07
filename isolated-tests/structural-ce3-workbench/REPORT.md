# Verifieringsrapport · lokal CE3-vy

Senaste tillägget är användarvänlighetspasset nedan, utifrån UI-checkpoint `a7a5525`. De inledande avsnitten dokumenterar första leveransen; deras äldre testresultat ska inte läsas som nya körningar.

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
