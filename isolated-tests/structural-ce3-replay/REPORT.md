# Checkpoint 2 – full regression för fixed-replay/0.1

**PASS för checkpoint 2, profil `fixed-replay/0.1`.** Hela regressionsmängden och alla kompletterande kontroller har körts två gånger efter sista kodändringen. Separat återläsningsgranskning, övergångsvis jämförelse och permutationstäckning passerar. **Första avvikande övergång: ingen.** Inga kvarvarande materiella avvikelser identifierades.

Utgångs-HEAD verifierades till `9c85c4c1ef441d4e8de2311fe19b24538dd9b5d9` på `decision-flow-demo-v1`. Arbetskopian saknade spårade ändringar; befintliga ospårade granskningsdokument lämnades orörda. Allt nytt ligger i prototypmappen. Checkpoint 1:s resultat och bevarandemanifest är oförändrade.

## Genomförande och omfattning

Båda kompletta slutkörningarna använder samma uppspelare och separata granskare, med oförändrad kod och profil. Följande kommando genomför dubbelkörningen och vägrar återanvända en befintlig utmatningskatalog:

```sh
python3 -B isolated-tests/structural-ce3-replay/verification/run_regression.py --output isolated-tests/structural-ce3-replay/results/checkpoint-2
```

Katalogen finns nu; använd en ny sökväg vid repetition, enligt [README](README.md).

| Huvudmängd | Historiker per körning | Nya granskade rader |
|---|---:|---:|
| Fabrikens fem scenarier | 12 | 1 496 |
| Fabrikens bankavslag A/B | 10 | 1 238 |
| Originaltransportens sex fall | 300 | 39 300 |
| Transport med samma parkeringsdatum | 312 | 40 872 |
| Totalt | **634** | **82 906** |

Checkpoint 1:s sex historiker ingår i dessa 634 och körs alltså om i båda varven. Därutöver körs **20 giltiga kompletterande historiker**: fabrikens tio prober och referenshistorik ger 16 banor, och transportpaketens två prober vardera ger fyra. Totalt granskas 654 giltiga historiker och 85 253 nya rader per körning.

**Samtliga 33 namngivna kompletterande kontroller** ingår: fabrikens 13 samt respektive transportpakets tio. De omfattar 14 probkontroller och 19 felinjektioner. Dessutom genomförs nio separata integritetskontroller: saknad bana, dubblerad bana och faktisk resursbegränsning för fabrik och vardera transportpaketet. Avsiktligt skadade historiker och deras FAIL-besked sparas, liksom resursbegränsade INCOMPLETE-paket. De räknas inte som godkända huvudhistoriker.

Checkpoint 1:s **24 generella tester med 62 delkontroller** körs om i båda slutvarven. Tre nya tester med fyra delkontroller prövar regressionsverktygens kartesiska täckning, dokumentära källöverföring och identitet hos oanvända externa bindningar: totalt **27 tester och 66 delkontroller per varv**. Den generella sviten omfattar också sammanhängande manipulationer av efterföljande snapshots, inte bara brutna historiklänkar.

## Verifieringsmetod och fallresultat

Varje nytt historikpaket skrivs, återläses och granskas genom CLI i separat process mot betrodd normaliserad inmatning. Den fristående granskaren rekonstruerar övergångar och permutationsträd utan import av runtime-semantik. Varje gammal referenshistorik återgranskas också läsande med sin ursprungliga granskare; inga äldre resultatkommandon körs.

[Projektionen](verification/semantic_compare.py) matchar externa bindningar och hela eventordningssignaturen. Den jämför radordnad tid, utfall/ej tillämplighet, exakta blockeringsorsaker, proveniens, före/efter-state inklusive budget, tagna beslut och hela kön med ursprung och tider. Alla steg och beslutspunkter kontrolleras. Sammanlagt jämförs **67 595 projicerade rader per varv**, inklusive prober; tekniska beslutspunktsrader kontrolleras separat. Ingen samtidig eventordning eller momentant tillstånd sorteras bort.

[Den separata täckningskontrollen](verification/permutation_coverage.py) bygger förväntade kartesiska produkter av frysta fallgrupper och kontrollerar både mängd och antal. Originaltransport ger A 4/B 96 ordningar per utfall; samma parkering ger A 8/B 96. Inga banor saknas eller dubbleras i de kompletta mängderna. Negativa täckningsprover avvisas av både denna kontroll och den separata granskaren. INCOMPLETE ger aldrig certifierat PASS.

Fabrikens start-events, banktillskott, sista giltiga deadlines, event före beslut vid horisonten och kvarvarande kö till vecka 34 stämmer med originalen. Kandidaten tar D8 vecka 12 med bevarad Sverige-förmåga och slutbudget 0. Maskinflytten förlorar svensk maskinförmåga direkt efter D5 vecka 2. Bank-A blockerar D5/D6/D8 utan maskin- eller kvalitetsevents; bank-B tar D8 vecka 8 och förlorar det osäkrade arbetslaget. Båda slutar med budget 1.

Transportens blockerade T7 lämnar state, utgifter, kö och engångsrätt orörda. A ready tar T7 vid det senare försöket vecka 20; B ready har korrekt `script_skip` vecka 20. Uteblivet elbesked bevarar vänteläget och sammanblandas inte med ett ej tillämpligt event. T12 genomförs efter blockerat T7 i samma-parkerings-A och B:s negativa elutfall.

Vid färdig elanslutning bevaras originalets bussgap A18/B0 och cykelgap A14/B0; vid samma parkering blir de A6/B0 respektive A2/B0. Negativa elutfall ger kvarstående observerat bussgap till horisonten: original A24/B12, samma parkering A12/B12. Detta är historikmått, inte prognoser.

Samma-parkerings-A har både `cycle_ready=false` och `true` direkt efter borttagningseventet. Budgeten där är 3, medan veckoslutets budget är 2. Övriga frysta mått och veckoslut är stabila. B:s samtliga banor jämförs dessutom direkt med original-B:s semantik.

Alla **3 456 A/B-par per varv** kontrolleras mot sparade jämförelser: 384 per utfall i originalet och 768 per utfall vid samma parkering. Första skillnad är vecka 0, första fulla veckoslutslikvärdighet vecka 20 och aktuellt tillstånd är likvärdigt vid vecka 26 inom samma externa utfall. Historikerna förblir olika.

## Ändringar, avvikelser och reproducerbarhet

Ingen ändring behövdes i `core/` eller `audit/`. Formatadaptern har utökats så att bank-A/B:s dokumentära källtext kan hämtas från omslutande skriptdokument. Inga operativa regler har tillförts. Fallval, prober, observationskontroller och jämförelser ligger i separata moduler utanför kärnan. De ursprungliga rena transportobservationerna återanvänds läsande på nya historikers formatvy, vilket bevarar definitionerna av glapp och likvärdighet; de används aldrig för att styra uppspelningen.

Jämförelseverktyget har stärkts med explicit kontroll av **även oanvända externa bindningar**. Ett regressionstest ändrar bank-A:s ej konsumerade kvalitetsutfall och kräver avvisning. Detta ändrar ingen övergångssemantik.

Den första utvecklingskörningen är synligt **FAIL** i [checkpoint-2-attempt-1](results/checkpoint-2-attempt-1/summary.json). Tre verktygstester lades till mellan dess varv: 24/62 respektive 27/66 tester/delkontroller. Exakt två filer skilde sig, `generic-checks.json` och sammanställningen; alla historiker och övriga filer var byteidentiska. Orsaken finns i [development-note.json](results/checkpoint-2-attempt-1/development-note.json). Den räknas inte som leveransbevis. Körverktyget kontrollerar nu dessutom kod- och fixturehashar före/efter båda varven. Därefter kördes hela leveransen om två gånger med stabil kod.

**Alla 234 resultatfiler per slutvarv är byteidentiska**, inklusive indata, historiker, negativa kontrollpaket, observationer och rapporter. Bevarandekontrollen före/efter visar **874 skyddade filer, noll ändrade**: 856 original och befintliga ospårade filer samt 18 bevarade checkpoint-1-bevisfiler, inklusive dess manifest. CE2, kontrakt, gamla modeller/skript/resultat och demo är orörda. Endast prototypens ändringar ska ingå i checkpointens commit.

Slutkörningens reproducerbarhet och bevarande redovisas i [slutsammanställningen](results/checkpoint-2/summary.json). Detaljer per fall, felinjektion, täckningskontroll och A/B-par finns i [körning 1](results/checkpoint-2/run-1/summary.json) och [körning 2](results/checkpoint-2/run-2/summary.json). Alla förväntat negativa auditbesked ligger kvar i `faults/` och `integrity/` i varje varv.

## Kvarvarande begränsningar

Hela arkitekturgranskningens efterfrågade regressionsmängd ingår nu; inga av dess 634 huvudhistoriker eller angivna kompletterande fallkontroller återstår. Facit, modeller och antaganden har inte ändrats.

Profilen är fortsatt `fixed-replay/0.1`: fasta beslutsskript och externa utfall, ett budgetkonto, konjunktiva eq/ge-villkor, konstanta set/add-effekter och en schemaläggningsplats per event. Eventutfall som schemalägger events avvisas före start även i oanvända grenar. Återkommande events, avbokning/omschemaläggning, nolltidskedjor och godtyckliga skriptvillkor stöds inte. Permutationstillväxt hanteras med explicita resursgränser, inte något generellt skalbarhetslöfte.

Ingen plansökning, strategi- eller generell Möjlig/Stängd/Säkringsbar-beräkning, optimering, AI-onboarding, trafikprognos eller ny demo ingår. Ett PASS gäller **den avgränsade uppspelningskärnan och denna regressionsmängd**, inte fullständigt v1-stöd, verkliga verksamhetspremisser eller validerat produktvärde. Arbetet stannar efter checkpoint 2.
