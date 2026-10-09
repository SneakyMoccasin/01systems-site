# Kompletteringar, jämförelsens räckvidd och framtida onboarding

**Underlaget räcker ännu inte för två körbara fasta planer.** A och B är policyförslag, inte scheman. Inga körfiler har skapats och ingen vinnare har utsetts. Källor: [underlagsregister](01-underlagsregister.md), [modellutkast](02-konceptuell-modell.md), [kodgrundad stödmatris](03-stodmatris.md).

## Minsta kompletteringar för ett avgränsat replaytest

Dessa frågor gäller en förenklad uppspelning av kontrollbesked och flyttmilstolpar. Uppgifterna behöver antingen vara källstyrkta eller uttryckligen valda av användaren som scenariopremisser, med typen bevarad. AI ska inte välja okända verksamhetsvärden. Ett accepterat hypotetiskt besked är fortfarande inte ett verifierat kontrollutfall.

| Nr | Nödvändig komplettering | Varför den behövs / minsta acceptabla svar |
|---|---|---|
| R1 | Bekräfta modellens omfattning | Ska testet enbart pröva frisläppning och mottagningsmilstolpar, eller även hyllor, systembyte och överlämning? Fastställ en ändlig grupp-/omgångslista. Ett representativt urval får inte ge slutsats om hela sortimentet eller komplett flytt. U28–U32 räcker inte till ”alla grupper”. |
| R2 | Definiera klockan | Välj startögonblick, arbetsdagssteg, horisont och betydelsen av stegets början/slut. Ange kalender och tillträde om tre/fyra kalenderveckor ska kontrolleras; annars avgränsa explicit bort den kontrollen och definiera en relativ kalender. Översätt inte veckor tyst till 15/20 arbetsdagar. |
| R3 | Fastställ startstatus och inventering | Bekräfta vad som är flyttat vid start, teststatus och inventeringsstatus. Om inventering inte är klar: ange separat kontrollpunkt, besked och hur planen hanterar utebliven bekräftelse. Startpremisserna i utkastet ska vara uttryckliga. |
| R4 | Ange exakta försök i A och B | För varje beslut: tidssteg, ordning inom steget samt `attempt`/`if_not_taken`; även planerade nya försök efter blockering. Ange frisläppningar, huvud-/reservomgångar och de övriga moment som ingår. ”Efter godkännande” är ett villkor, inte ett komplett fast skript. |
| R5 | Ange fördröjningar och fasta kontrollpunkter | Per omgång och test behövs heltalsfördröjning eller initialt förfallsteg, med källa/scenariostatus. Beslutsfördröjning måste vara positiv. 1–2, 10 och 5 dagar avgör inte dessa värden. Ange femdagarsramens fördelning och hur eventuell överlappning ska tolkas. |
| R6 | Ange externa besked, särskilt 20-order-kontrollen | För varje externt event behövs en uttrycklig bindning, även för ett event som inte används i en viss plan. För kontrollvillkoret saknas både tidpunkt och utfall. Bekräftat ska avse 20 riktiga korrekt packade order överlämnade till PostNord, totalt i nya lagret. Även test-, inventerings- och mottagningsbesked behöver källa eller tydligt valt scenario. Inget automatiskt absentval som ersättning för okänt. |
| R7 | Välj ekonomisk avgränsning | Antingen tillförs kostnader, kontoenhet och budget; eller väljs uttryckligen ett replaytest utan ekonomisk modell. I det senare fallet kan formatet senare kräva budget null och tekniska cost 0, men rapporten måste säga att kostnader är okända/ej modellerade. Kostnader sätts inte till noll som fakta. |
| R8 | Fastställ jämförelsens gemensamma premisser | Samma modell/start/källor och samma omgångsregler; normalt samma externa utfall. Ange hur beskedstider relaterar till respektive plan och vilka förenklingar som används. B får inte kortare varaktigheter enbart för att framstå som bättre. Om ett gemensamt kontrollsteg antas ska det framgå som experimentpremiss. |

När R1–R8 är besvarade går det att ta ställning till två konkreta indatauppsättningar. Varje regels `source`, källhashar, fullständig `initial`, referensordning för alla events och uttryckliga absentgrenar behöver då färdigställas enligt kontraktet. Dessa är formatkrav som modellförfattaren kan uppfylla när underlaget finns; de är inte nya frågor om kundens verksamhet.

Om beskedstid/utfall inte kan anges kan man senare definiera ett uttryckligen hypotetiskt scenario tillsammans med användaren. Det är inte tillåtet att nu göra båda planerna ”körbara” genom att godtyckligt sätta godkänt dag 2, ge B tidigare kontroll eller anta att reserven räcker.

## Indata och stöd som krävs för starkare verksamhetspåståenden

Dessa uppgifter är inte nödvändiga för ett uttryckligt avgränsat milstolpstest. De krävs för att verifiera motsvarande service-, kapacitets- eller ekonomipåstående. **Mer data ger inte i sig det saknade motorstödet**; separat analys eller senare modell-/profilutveckling kan behövas.

| Påstående att verifiera | Nödvändigt underlag utöver R1–R8 | Nuvarande begränsning |
|---|---|---|
| Hela ordern framme inom 7 arbetsdagar | Ordertid, orderrader och kvantiteter, tillgängligt saldo per artikel/adress, väntan och plock, delnings- och fördelningsregler, varje pakets överlämning/mottagande, kalender/cutoff och transportvariation. Klargör om fraktens genomsnitt avser arbetsdagar eller kalenderdagar. | Ingen generell order-/paket-/leveransmodell. Två dagars genomsnitt kan inte dras från sju som ett garanterat tidsutrymme. |
| Utskicken kan fortsätta och reserv räcker | Verkligt initialt saldo, inventering, efterfrågan över tid, mottagning per omgång, påfyllning och faktiskt reservuttag. Definiera vilken kontinuitet som krävs och gräns för delade försändelser. | Ingen automatisk lagerförbrukning eller allokering. En tillgänglighetsflagga bevisar inte tillgång på rätt orderrader. |
| Flytt ryms i 10 + 5 arbetsdagars ram och inom 3 veckor | Antal personer, arbetspass, kompetenser, arbetsfördelning mellan test/plock/flytt, fordon, lastvolymer, lastning/lossning, yta och mätningar av tider. Kalender; fördelning av slutomgångar och hyllarbete. | Ingen inbyggd löpande beläggning/kapacitetsplanering. Sex km och många önskade lass är otillräckligt. |
| Rätt lagerplats och rätt leveransadress | Artikel-/platsidentiteter, avstämningsprocedur och felhantering, grossistens order-/leveranslista, adresser, bekräftelser och rutin för redan skickat gods. | Externt ”kontrollerat” återger ett besked men verifierar inte fysisk hantering. Omstyrning och nya besked sker inte dynamiskt. |
| Flytten och informationsperioden slutar i tid | Faktiskt tillträde, kalender, slutkriterier för varor/hyllor/system och separat tömning/städning/överlämning; kampanjens start/slut. | Fasta milstolpar kan kontrolleras efter explicit modellering, men de nuvarande uppskattningarna bevisar ingen varaktighet. |
| Kostnad och lönsamhet | Budget, kostnadsenhet, löner/arbetstid, utrustning/flytt, hyra, frakttaxa och extra paket, försäljning, varukostnad/marginal, rabattbas och eventuell påverkan på efterfrågan. | Enkelt budgetkonto kan bokföra fasta värden; det beräknar inte effekten av 10 % rabatt, fri frakt över 799 kr eller försäljningsförändring. |

## Vad jämförelsen kan besvara efter komplettering

- Vilka **angivna** försök som accepteras eller blockeras, när det sker och vilka deklarerade villkor som saknas.
- Om reservflytt i de fasta skripten spärras tills externt bekräftat globalt kontrollbesked finns, samt om A kräver alla huvudomgångar och B endast aktuell färdig grupp.
- När definierade mottagnings-, flytt- och systemmilstolpar inträffar enligt valda tider och besked, inklusive kvarstående kö vid horisonten. Överlappning kan beskrivas som deklarerade aktivitetsstatusar om sådana finns, utan kapacitetsgaranti.
- Om samtidiga eventordningar förändrar tillstånd, blockerade försök eller milstolpar inom samma fasta scenario. Här betyder ordning **händelseordning**, inte kundorder.
- Hur valda negativa eller uteblivna kontrollbesked påverkar fasta planer i separata, tydligt avgränsade scenarier. Motorn väljer inte dessa scenarier och ger ingen sannolikhet.

## Vad jämförelsen inte kan besvara

Den kan inte med nuvarande underlag eller enbart milstolpsmodellen avgöra bästa strategi, garanterad sjudagarsservice, faktisk reservuthållighet, felfri varuhantering, tillräcklig bemanning, möjlig flytthastighet, kampanjvinst eller lägsta verkliga kostnad. Den kan inte bevisa att B blir snabbare för att fler frisläppningar tillåts.

Om det globala kontrollvillkoret nås först efter huvudflytten kan B:s möjlighet till tidigare reservflytt sakna praktisk effekt. Om en grupp blir klar tidigare och kontrollvillkoret redan är uppfyllt kan B tillåta tidigare frisläppning. Båda är logiska möjligheter, inte körresultat. Tidigare frisläppning kan dessutom minska tillgången till gammal reserv under en flyttomgång; effekten på service kan inte beräknas här. Därför utses ingen vinnare.

Ett audit-PASS gäller att historiken följer deklarerade regler och fasta indata. Det styrker inte att kontrollorder, lager eller kapacitet har verifierats i verkligheten.

## Lärdomar och krav för framtida AI-onboarding

Följande är dokumenterade krav för senare arbete (U49), inte funktioner som finns eller byggs i detta pass:

| Krav | Föreslaget framtida arbetssätt och acceptanskriterium |
|---|---|
| Kunden kan ladda upp egna filer | Bevara originalfil, filidentitet/hash, version och användarens beskrivning. Stöd behöver utformas för kunddokument utöver dagens strikta CE3-JSON. Ett utdrag får inte ersätta originalet. |
| Varje modellförslag kan spåras | Länka påståendet till dokument/sida/avsnitt eller svar-ID och exakt textstöd. Skilj användaruppgift, mål, krav, uppskattning, AI-förslag och okänt. Källa ska även följa med härledda regler och numeriska värden. |
| Okända värden ger frågor | Returnera en blockerande fråga eller explicit okänd status för saknat värde; skapa aldrig implicit nollkostnad, godkänt kontrollutfall eller kapacitet. Särskilj frågor för körbarhet från frågor för service/ekonomi. |
| Ersatta uppgifter bevaras | Spara versioner och relationen ”ersätter”, med källa och skäl. Konflikter ska visas. Förlorade äldre svar får inte rekonstrueras som om de fanns; detta fall har bara den sammanställda källan. |
| Moln och lokal LLM kan bytas | Definiera ett gemensamt versionsmärkt kontrakt för indata (källor, svar, vald profil) och utdata (källkopplade förslag, typ/status, öppna frågor, konflikter/ersättningar och stödluckor). Leverantörsadaptrar får inte ändra kontraktets betydelse eller fylla luckor. Profilvalidering hålls utanför LLM:n. |
| Gemensam kvalitetsgräns oavsett leverantör | Samma kontraktstester ska avvisa saknade källkopplingar, påhittad kontrolltid, antagen kundmottagning, blandade tidsenheter och simulerad orderhantering utan stöd. Kontraktet garanterar format och spårning, inte identiska modellförslag från olika LLM:er. |

Kärnans `source` och `sources` kan bära delar av proveniensen, men ett onboardingregister med frågor, ersättningshistorik och fältkopplingar är ett separat framtida behov. Dessa fält kan inte bara läggas till i `ce3-model/1`: dess strikta schema avvisar okända fält.

## Rekommenderat nästa steg

Gå igenom R1–R8 med Christian och spara svaren med referenser till detta register. Börja med modellens omfattning, kalendern samt hur och när test-, mottagnings- och 20-order-besked kan anges. Därefter kan två källförankrade fasta planer tas fram för en gemensam, uttryckligen begränsad milstolpsmodell och granskas före körning. Service-, kapacitets- och ekonomiverifiering kräver egna beslut om data och stöd; ingen motorutökning eller UI-utveckling föreslås som en del av denna leverans.
