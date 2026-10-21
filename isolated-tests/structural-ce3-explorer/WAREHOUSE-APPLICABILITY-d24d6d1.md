# Lagerflyttens tillämpbarhet i CE3 explorer

2026-10-21. **Bedömning: NEEDS INPUT för frågan om fasta ordningar mellan huvudflytt och reservflytt av foder och kläder. Modellen är okörklar.** Underlaget stöder kontrollvillkor men inte en fullständig beslutsmängd, fasta tidsplatser eller beskedsmodell. Inga kritiska luckor har fyllts, inga körindata skapats och ingen freeze/run/verify utförts. Detta är ett tillämpbarhetstest, inte kundvalidering eller ett besked om hela flyttens genomförbarhet.

## Baslinje och källinventering

Arbetet började i `/Users/christian/.codex/worktrees/4ab8/pulse_engine_clean` med ren gitstatus och frikopplad HEAD `d24d6d1388542dead140226bc0e77406c0037b9c`, samma commit som `decision-flow-demo-v1`. Rapportbranch: `codex/warehouse-explorer-applicability`. README:s låsning är läst; inga tillämpliga AGENTS.md hittades i arbetskopian eller dess överordnade kataloger. Uppdraget gäller en isolerad rapport. Alternativet `7df45d6`, huvudbranchens referens och onboarding-worktreen lämnas orörda.

Sökningen omfattade arbetskopians källor, dokument och fixtures, filhistorik via git samt relevanta lokala rapporter i huvudcheckouten. Ingen onboarding-worktree användes. Förkortningar nedan: **E** = denna explorerkatalog, **W** = `isolated-tests/structural-ce3-workbench`, **R** = `isolated-tests/structural-ce3-replay`. Kodreferenser avser `d24d6d1`.

| ID | Källa och proveniens | Vad den faktiskt stöder |
|---|---|---|
| S1 | [Bevarad användarsammanställning](../structural-ce3-workbench/docs/warehouse-move-onboarding/source-request.txt), införd i `691f24737b9f8418630f4236ca20b26303289024` | Närmaste tillgängliga verksamhetskälla. Beskrivs som konstruerat onboardingtest baserat på Christians svar. Originalintervju och ursprunglig bilaga är inte återfunna; dokumentets uppgift om ordagrann bilagekopia är inte nyverifierad mot bilagan. |
| S2 | W:s [underlagsregister](../structural-ce3-workbench/docs/warehouse-move-onboarding/01-underlagsregister.md), [modellutkast](../structural-ce3-workbench/docs/warehouse-move-onboarding/02-konceptuell-modell.md), [stödmatris](../structural-ce3-workbench/docs/warehouse-move-onboarding/03-stodmatris.md), [kompletteringar](../structural-ce3-workbench/docs/warehouse-move-onboarding/04-kompletteringar-och-onboarding.md) och README | Tidigare härledda register och modellförslag, inte ytterligare verksamhetsevidens. Särskilt A/B-regler, administrativa markörer och externa kontrollhändelser är föreslagna representationer. |
| S3 | W:s [warehouse.cjs](../structural-ce3-workbench/onboarding-prototype/warehouse.cjs), [EXECUTION.md](../structural-ce3-workbench/onboarding-prototype/EXECUTION.md), onboarding-v1:s README, DIALOGUE, EVALUATION och [examples/fixtures.cjs](../structural-ce3-workbench/contracts/onboarding-v1/examples/fixtures.cjs) | Förskrivna syntetiska exempel. Separat beställarklartecken, timer för provklart, valda dagar och nytt startförsök är inte fakta om lagerflytten. Den körbara systemstartmallen är ett annat fall. |
| S4 | E:s [FORMAT](FORMAT.md), [SCENARIO-FORMAT](SCENARIO-FORMAT.md), [FIXED-SLOTS-FORMAT](FIXED-SLOTS-FORMAT.md), [arkitekturkontroll](FIXED-SLOTS-ARCHITECTURE.md), implementationer och granskningar för `5429b52`, `7dab9a0`, `12e777c`; R:s profil/schema/transitions | Faktiskt format- och kodstöd. E:s [fixed-slots-problem.json](fixtures/fixed-slots-problem.json) är uttryckligen syntetisk: P/Q/X/T, slots 2/5/9/12 och horisont 14 får inte importeras som lagerfakta. |
| S5 | `git show 3ab8948:isolated-tests/structural-ce3-explorer/FIXED-SLOTS-R1-INDEPENDENT-REVIEW-d24d6d1.md` samt [budgeträttningsrapport](FIXED-SLOTS-R1-BUDGET-FIX-REPORT.md) | Oberoende granskning ger PASS för den avgränsade budget-/prefixrättningen. Den äldre granskningens öppna R1 är därmed stängt inom granskat scope. Ingen merge/cherry-pick gjordes. Detta styrker körkontrakt, inte lageruppgifterna. |
| S6 | Lokala `CE3-PHASE1A-ARCHITECTURE-AUDIT.md` och `CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md` i `/Users/christian/Projects/pulse_engine_clean/` | Inte versionshanterade i denna baslinje; relevanta avsnitt lästa på plats. Skiljer körbevis, målbevis och söktäckning; rekommenderar wrapper över oförändrad replay. Beskriver framtida förmågor, inte redan levererade kontrakt. |
| S7 | Samma huvudcheckout: `DEMO-CASE-SELECTION-AUDIT.md`, avsnitt 6 | Bekräftar dokumentationsskillnaden mellan syntetisk systemstart och större okörklar lagerflytt. Dess krav på demonstrationsvärde är inte krav på att detta test måste ge ett överraskande svar. |

SHA-256: S1 `7dd1f6be9289678433a1fbe4406d283a7647d65718cf544bea820638828ad391`; S6 Fas 1A `5d34cd2cad2347e35c8c4f157f3cfd6b5de8e3c0e6095de3b1438fb34194e44e`; Fas 1A.2 `39167021a841439aee258e6b3501b290fb533ab492d4ef4523a2623bb83f8ef6`.

S1 preciserar sökvägledningen på viktiga punkter:

- Utskick ska fortsätta, **enskilda order får vänta**, och hela beställningen ska nå kunden inom sju arbetsdagar (r. 31–36). Detta är inte noll väntetid för varje order.
- Cirka 20 procent lämnas **per artikel**, även foder, och reserven kan förbrukas (r. 55–56). Den är inte ett konstant saldo.
- Systemtestets 1–2 dagar är mål/planeringsram. Kravet på 20 riktiga korrekt packade kundorder, överlämnade till PostNord, gäller före reservflytten; varken kundmottagande eller separat orderprov per grupp krävs (r. 61–68).
- Grossisten önskar besked **helst** tre arbetsdagar före leverans; ingen hård gräns eller garanti för omstyrning är bekräftad (r. 103–105).
- Foder ligger tidigt trots hög försäljning; låg försäljning gäller inte hela tidiggruppen. Kläder ligger sist, men exakta tider och ordning inom faserna är öppna (r. 74–92).
- Separata lagersystem och manuell fördelning är källstödda (r. 96–99). Att kalla det nya systemet specifikt ett nytt **WMS** är här en återgiven uppgift från den aktuella prompten, med originalkälla ej verifierad. Inga integrationsfunktioner följer av den beteckningen.

Inga ersatta originalversioner har hittats. Skillnaderna ovan redovisas som preciseringar/konflikter i återgivningen, inte som en rekonstruerad ändringshistorik. A/B i S1 r. 118–124 är uttryckligen analysförslag, inte kundbekräftade planer; deras tidigare upphov som AI- eller människoförslag kan inte fastställas från sammanställningen.

## Verifierad analysförmåga

| Förmåga | Exakt stöd och gräns i kod |
|---|---|
| Beslut och tider | `fixed_slots.py:6–45`, `contracts.py:12–18,30–69`: /2 kräver 1–6 unika beslut, exakt alla modellbeslut, ett `attempt` var vid lika många strikt stigande heltalsslots. Inga valfria beslut, retries, early stop eller tidsval. Två beslut kan inte dela samma slot. Äldre /1 har fortfarande tre beslut vid 0/1/2. |
| Horisont och effekter | `R/core/schema.py:81–88,195–249`, `R/core/transitions.py:45–86`: separat inklusiv horisont, steg 1, events före beslut, positiv beslutsfördröjning. Högst ett event schemaläggs per beslut; varje event-ID har en schemaläggningsplats. Falskt eventförvillkor förbrukar eventet utan utfall; det väntar inte automatiskt. |
| Scenarier | `scenario_contracts.py:15–43,60–77`: samma modell, initialvärden, klocka, slots, källor, mål och kandidatscript; endast fullständiga outcomes-mappar varierar. Externa utfall måste inkludera explicit absentgren enligt R:s schema. Framtida utfall är scenariopremisser, inte kända fakta eller sannolikheter. Ändrade tider är modellvarianter, inte outcomes-only-scenarier. |
| Mål och bevis | `contracts.py:57–69`, `observe.py:6–47`: typade terminala likheter vid `last_row.after` **och** alla n försök accepterade utan blockering, på varje färskt auditerad eventbana. Inget generellt `always` eller `reach_by` i målspråket. Robust TRUE gäller samma script över alla deklarerade scenarier; certifierat motexempel ger FALSE, ofullständigt stöd annars UNKNOWN. |
| Storlek och körbudget | `fixed_slots.py:10–31`: n! kandidater, n! × s celler; tak 720/2160 före materialisering. Sex beslut tillåter högst tre scenarier. `runner.py:105–114`, `scenario_runner.py:139–148` kontrollerar kvarvarande försök mot budget och tillåtet prefix. Lägre budget ger inte mindre deklarerad sökdomän. |
| Verksamhetsmodell | R:s `core/profile.json` medger ändliga tillstånd, eq/ge-guards och konstanta set/add-effekter. Det är ingen generell order-, lager-, kalender- eller kapacitetsmotor. Handskrivna avgränsade resursregler kan vara möjliga, men kräver verkligt underlag. |

Ytterligare kontraktsgräns: `contracts.py:38` kräver `purpose="synthetic_integration_test"`; även scriptets källtext är teknisk. En framtida körning får bara presenteras som en avgränsad teknisk prövning med spårat underlag. Att byta etikett till kundvalidering eller tyst skapa ett annat purpose stöds inte. Detta ändras inte i uppgiften.

## Analysfråga och avgränsning

Två kandidater:

1. **Vald för fortsatt beredning:** Vilka fasta ordningar för huvudflytt och reservflytt av foder respektive kläder respekterar inventerings-, mottagnings- och 20-order-villkoren och ger bekräftad mottagning av de valda omgångarna vid en deklarerad horisont?
2. Kan hela flytten genomföras med fortsatta utskick och varje hel kundbeställning mottagen inom sju arbetsdagar? **UNSUPPORTED som helhetsfråga med dagens explorer och föreliggande modellunderlag.** Fler fakta ensamma löser inte den saknade driftmodellen och historikmålet.

Fråga 1 knyter an till ett verkligt val: när gammal reserv får tas bort medan annan huvudflytt återstår. Foder och kläder väljs som **förslag till avgränsning**, eftersom S1 anger tidig respektive sen prioritet och olika efterfrågeförhållanden. Grupperna är inte bekräftade som varsin odelbar omgång. Ett resultat som bara bekräftar den kända kontrollordningen kan vara användbart för att upptäcka för tidiga försök; ingen oväntad vinnare behövs.

Fyra möjliga kärnbeslut är huvud-/reservstart för vardera gruppen. Det är **ingen fastställd fyrbeslutsmodell**: teststart, inventering, hyllor, andra grupper eller flera omgångar kan vara oumbärliga. Att testet ska börja parallellt med varuflytten måste också förenas med separata slots och en uttrycklig tidsupplösning. Ingen aktivitet markeras färdig vid start för att komma under sexgränsen. Om nödvändiga beslut inte ryms måste frågan avgränsas på verksamhetsgrund eller bedömas ostödd; de får inte döljas i en enda magisk handling.

Avgränsningen kan behålla betydelsen som **kontroll av en planerad etapps beroenden**, om Christian bekräftar etappen och hur övrig verksamhet påverkar den. Den behåller inte betydelsen av ”vilken flyttstrategi är bäst/säker”. Fortsatta utskick, sju arbetsdagar, reservförbrukning, varukorrekthet, grossistadress och treveckorsgränsen kvarstår som verkliga krav men certifieras inte här. Om något av dem avgör de valda beslutens tillåtlighet får det inte avgränsas bort utan belagd hantering. Därför är avgränsningen ännu inte körgodkänd.

S2:s A/B-modell med separat samlad respektive gruppvis frisläppning kan inte användas oförändrad: dess scripts väljer olika delmängder av beslut. Explorern kräver alla beslut i varje permutation. En eventuell gemensam omgångsmodell måste först förankras; olika regeluppsättningar får inte framställas som en ren ordningsskillnad.

## Spårbar kartläggning

**K = källstödd uppgift i S1, inte oberoende verksamhetsverifierad. A = antagande/modellförslag, ej antaget för körning. M = saknad uppgift. O = ostödd av aktuell analysförmåga för angivet påstående.** Kombinationer skiljer källa från representation. S1-rader gör kartläggningen oberoende av S2:s tolkningar.

| Ref | Del | Källa och status | Representation eller blockerare |
|---|---|---|---|
| M1 | Start | K: lokal/ny utrustning, tillfällig förvaring, upphämtning på båda adresser; r. 42–51. M: faktiskt inventerings-/test-/flyttläge vid analysstart. | A: bekräftelsestatus som enum. ”Ej bekräftad” betyder inte ”fysiskt ogjord”. Ingen full initial-state kan skrivas ännu. |
| M2 | Beslut | K: huvudflytt, reservflytt och parallell teststart; r. 55–68. A: fyra startbeslut för foder/kläder. M: exakt omgångslista, övriga nödvändiga beslut och ansvar. | Att påbörja en omgång får inte omedelbart sätta mottagen eller leveranskapabel. |
| M3 | Förvillkor | K: inventering före flytt, test och mottagna/registrerade varor före första utskick, global 20-orderkontroll samt redan överflyttad/kontrollerad grupp före reserv; r. 51,63–68. | A: uttryckliga guards på bekräftelser. M: exakt gruppkontroll och hur delade order räknas. Inget extra 20-orderkrav per grupp. |
| M4 | Effekter | K: otillgänglighet tills mottagen/avbockad, manuell registrering, reservförbrukning; r. 55–60,96–102. | A: påbörjad och externt mottagen som milstolpar. M: omgångarnas konkreta effekter. O: härleda saldo, felfri hantering eller framtida kapacitet från markörerna. |
| M5 | Tider | K: 10/5 arbetsdagars planeringsram, 1–2 dagars otillgänglighet/test, första utskick mål dag 2; r. 57–63. M: slots, fördröjningar, beskedstider, startögonblick och horisont. | Intervall och mål är inte exakta tider. O: automatisk tidssökning eller tidsvariation inom outcomes-only. Samma stöd krävs oavsett vilken ordning som gynnas. |
| M6 | Tidsgränser | K: flytt inom tre veckor, lokaler fyra veckor; r. 42–46. K: grossistens önskemål tre arbetsdagar; r. 103–105. M: kalender och konkreta leveranser. | Ingen omvandling till 15/20 arbetsdagar eller hård tredagarsguard. Separat horisont ersätter inte gränsernas definition. |
| M7 | Externa besked | K: testgodkännande, 20 riktiga packade/överlämnade order, mottagning; r. 60–68. M: kontrollansvar, belägg, beskedspunkter, negativa/uteblivna konsekvenser. | A: separata test-, global orderkontroll- och mottagningshändelser. Framtida utfall öppna. Gemensamt 20-orderbesked kan vara planberoende; en fast tid får inte antas giltig för alla permutationer. |
| M8 | Terminalmål | A: alla valda huvud-/reservomgångar externt mottagningsbekräftade vid horisont och alla försök accepterade. K: kontrollkraven enligt M3. M: godkänd omfattning och målhorisont. | Sökbar form efter komplettering, inte redan källgiven mål-JSON. Avslag kan korrekt blockera reserv och ändå ge målet FALSE; det betyder inte att säkerhetsregeln bröts. |
| M9 | Verksamhetsmål och driftkrav | K: större/bättre lager/närmare motorväg; r. 26–38. K: utskick, inga sammanblandningar, rätt grossistadress, sju arbetsdagar, begränsad delning; r. 31–36. | O: bevisa dessa genom M8. Ett terminalt ”leveranser fungerar” bevisar inte kontinuitet. Ett godkänt test/20-orderbesked bevisar inte framtida driftkapacitet. |
| M10 | Prioritering och ekonomi | K: ungefärlig gruppordning, extra personal, rabatt/fraktvillkor; r. 69,74–92,109–116. M: hårdhet i prioriteringen, resurser, kostnader och rangordningsmål. | A: lämna ekonomisk värdering utanför kontrollfrågan. Inga okända kostnader blir noll; eventuell teknisk cost=0 utan budgetkonto betyder endast ”ej modellerat”. |

## Unknown Registry

Samtliga poster är **open**. Inga scenarioantaganden är godkända. Christian behöver bekräfta eller ange relevant verksamhetsansvarig; modellglapp kräver dessutom ett separat teknikbeslut. Framtida utfall löses genom ett avgränsat scenariourval, inte genom att begära förhandskunskap om vad som faktiskt kommer hända.

| ID / typ | Berörda refs och belägg | Betydelse och upplösning |
|---|---|---|
| U1 missing_fact | M1–M3; S1 r. 51,55–68,92 | Exakta omgångar, verkligt startläge och kontrollregler saknas. Blockerar modell. Bekräfta urval, inventering, teststatus och beroenden till övriga grupper/hyllor/adressflöden. |
| U2 future_outcome | M7; S1 r. 62,64–67 | Test, mottagning och 20-orderkontroll kan lyckas, misslyckas eller sakna besked. Blockerar utfallsbindning. Definiera meningsfulla utfall/effekter och vilka scenarier som ska prövas; ”okänt” är inte automatiskt absent. |
| U3 uncertain_timing | M5–M7; S1 r. 45–46,57–67,104 | Kalender, slots, kontrollpunkter och varaktigheter saknas eller är uppskattningar. Blockerar fast sökdomän. Kräver oberoende motiverade tider; ändrade eventtider behöver separata modellvarianter utanför dagens gemensamma scenariokorsning. |
| U4 model_gap | M4,M7,M9; S1 r. 56,69–70,96–105 | Orderflöde → 20-orderbesked, reservförbrukning → leveransförmåga och personal → parallell kapacitet saknar modell/evidens. Blockerar driftslutsatser och även vald fråga om dessa samband avgör dess förvillkor. Externt belagda kontrollpunkter kan räcka för ett smalt test; de skapar ingen driftmodell. |
| U5 unresolved_preference | M2,M8,M10; S1 r. 36,74–92,118–124 | Är tidigt/sist bindande, och är syftet kontroll av frisläppning eller val av snabbare/säkrare strategi? Blockerar slutlig mål-/omfattningsdefinition; unik ranking saknar stöd. Bekräfta hårda krav och acceptera endast den avgränsade slutsatsens räckvidd. |
| U6 missing_fact | M10; S1 r. 69,116 | Kostnader, bemanning och saldo okända. Ekonomi kan uteslutas från vald fråga, men inte resurser eller saldo som faktiskt avgör om en omgång får starta. Dokumentera beroendet innan posten kan sättas utanför scope. |

Fem prioriterade frågor till Christian:

1. Är kontroll av huvud-/reservordning för **foder och kläder** ett användbart avgränsat beslut, och vilka konkreta omgångar samt beroenden till andra varor, hyllor och grossistleveranser måste ingå? Är tidigt/sist krav eller önskemål?
2. Vid vilket startögonblick ska analysen börja, och vad är då belagt om inventering, systemtest, mottagna varor och kvarvarande reserv? Vilka villkor måste faktiskt vara uppfyllda för varje start och mottagningsbekräftelse?
3. Vilka fasta beslutstillfällen, kontrollpunkter, fördröjningar och horisont har stöd i planeringen, med vilken arbetsdagskalender och betydelse av början/slut på dagen? Hur ska parallell test-/flyttstart representeras utan påhittad tidsförskjutning?
4. Vem bekräftar test, gruppmottagning och de 20 riktiga orderna, hur kvalificerar delade order, och vilka framtida utfall ska prövas? Kan beskedspunkterna motiveras för samtliga ordningar, eller beror de på den valda planen?
5. Räcker ett svar om **accepterade försök och mottagningsmilstolpar**, utan slutsats om service, reservuthållighet, kapacitet eller ekonomi? Vilka av dessa verksamhetsvillkor måste ändå styra de valda startbesluten?

## Konkreta behov inför nästa motorfas

Följande är minimala logiska motexempel, **inte verksamhetsfakta, fixtures eller körresultat**. Ingen funktion implementeras.

- **Kontinuitetsmål:** En modellerad leveransflagga är sann initialt, falsk under ett mellanliggande steg och sann vid horisonten. Terminalmålet kan passera trots avbrott. Ett auditerat `always`-predikat med initialt samt before/after vid varje övergång behövs i observationslagret. För verklig leveranskontinuitet krävs dessutom definition, order-/lagerdata och en stödd verksamhetsmodell; observationen ensam räcker inte. Ingen ny transition engine är motiverad av just historikpredikatet.
- **Vänta på kontrollbesked:** Ett reservförsök vid en fast tid blockeras; kontrollbeskedet kommer senare. Dagens explorer försöker inte igen. Att söka ”flytta när beskedet kommit, annars vänta” kräver explicit retry-/valfrihetsgrammatik eller ett observationsstyrt policykontrakt med icke-anticipation. Kärnans stöd för handskrivna upprepade försök betyder inte att explorern söker sådana planer.
- **Osäker beskedstid:** Samma kontrollutfall inträffar före respektive efter ett reservförsök. Det ändrar `due`/delay och därmed modellen, inte bara outcomes. Gemensam certifierad tidskänslighetsanalys behöver ett kontrakt för ändliga modellvarianter och deras täckning; inga tider väljs nu.
- **Fortsatt drift efter godkänt test:** Två verkliga förlopp har samma 20-orderbesked men olika efterfrågan; i det ena tar gammal reserv slut innan nästa mottagning. Milstolpsmodellen kan inte skilja dem. Behovet är först underlag och uttrycklig lager-/order-/resurssemantik, inte fler permutationer eller en ny godtycklig ja/nej-flagga.

För vald fråga är nästa steg främst kompletterat underlag och bekräftad avgränsning. Någon generell motorutbyggnad beställs inte av denna rapport. Om den fullständiga etappen ryms och får stöd kan ordinarie /2 `freeze → run → verify` användas, med pins separat från körkatalogen och mål-, kör-, cell- och eventtäckning redovisade var för sig. Inga nuvarande fakta motiverar att starta den kedjan.

## Kontroller och leverans

Kod- och kontraktsläsning samt gitbaserad rapportgranskning utfördes. Tidigare testresultat är granskarnas rapporterade resultat, inte nya körningar här. Inga motor-/regressionstester behövdes för denna dokumentändring. Rapportens länkar, S1-radankare, källhash, Markdown-tabeller och whitespace kontrollerades. Bevarandekontrollen jämför 2 198 befintliga spårade/icke-ignorerade filer mot `/tmp/ce3-warehouse-applicability-before.json`; inga sådana filer ändrades. Endast denna rapport ingår i commit. Ingen push.
