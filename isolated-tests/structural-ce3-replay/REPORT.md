# Checkpoint 1 för gemensam strukturell CE kärna

**PASS för checkpoint 1, profil `fixed-replay/0.1`.** Fabrikens positiva kandidat och originaltransportens A ready har körts genom samma kärna, sparats deterministiskt, återlästs och granskats separat. Inga materiella avvikelser eller konflikter med den avgränsade profilsemantiken identifierades. Full v1-implementation eller hela regressionsmängden är inte verifierad.

Utgångs-HEAD var `c76ee49544c3a49d2b2c7e8d20cd121a33bb0c57`, på befintlig branch `decision-flow-demo-v1`. Inga spårade ändringar fanns före arbetet. Implementationen och alla nya levererade resultat ligger enbart i denna prototypmapp. Arkitekturförslaget är den oförändrade rapporten `docs/audits/ce3-structural-replay-architecture-review-2026-10-06.md`.

## Implementerat

Versionsmärkta modell-, skript-, körnings- och historikformat, maskinläsbar profilbeskrivning, strikt JSON-inläsning och full modellvalidering före start. Gemensamma atomiska övergångar stödjer typade ändliga tillstånd, eq/ge, set/add, ett deklarerat budgetkonto, engångsbeslut, oförändrade blockerade försök, initiala och beslutsschemalagda events, fasta externa utfall och explicita uteblivna besked.

Uppspelaren besöker alla steg inklusive horisonten, behandlar förfallna events före beslut, behåller kö efter horisonten och enumererar samtliga samtidiga eventordningar utan sammanslagning. Resursgränser ger INCOMPLETE; domänöverskridande ger ERROR utan delvis publicerad övergång. Ingen av dessa statusar kan få ett granskar-PASS.

Historikgranskaren rekonstruerar varje övergång, budget, köursprung, diagnostik, fas, terminal snapshot och hela permutationstäckningen. Den importerar inte uppspelarens förvillkors-, effekt- eller övergångsfunktioner. Historik granskas i en separat process mot en separat identifierad inmatning. Fallnamn och förväntade slutsatser finns endast i adaptermetadata och verifieringslagret.

## Faktiskt körd verifiering

Levererad slutkörning:

```sh
python3 -B isolated-tests/structural-ce3-replay/verification/run_checkpoint.py --output isolated-tests/structural-ce3-replay/results/checkpoint-1
```

Den katalogen finns nu och skrivs inte över. Repetera enligt README med en ny utmatningskatalog.

| Fallmängd | Ordningar per körning | Separat granskade nya rader | Resultat |
|---|---:|---:|---|
| Fabrik positiv kandidat | 2 | 250 | D8 vecka 12, obruten svensk förmåga genom horisonten, slutbudget 0 |
| Originaltransport A ready | 4 | 524 | Parkering vecka 2, T7 vecka 20, cykelöppning vecka 16, gap 18 respektive 14 veckor, slutbudget 1 |

Sammanlagt 6 huvudhistoriker och 774 nya rader per slutkörning. Båda fallmängderna kördes två gånger. **Alla sju resultatfiler per körning var byteidentiska**, inklusive normaliserade indata, komprimerade historiker, separata granskningsresultat och sammanställningen.

Jämförelsen matchade banorna efter hela eventordningen och kontrollerade varje materiell övergång, felorsaker, budget, genomförda beslut, kö med schemaläggningstid/ursprung, källreferenser, samtliga steg och beslutspunkter. Ingen övergångsordning sorterades bort. Projektionen jämförde 196 fabrikrader och 416 transportrader per körning efter borttagning av de separata tekniska beslutspunktsraderna; beslutspunkterna verifierades dessutom separat. Fabrikens nya beslutspunktsrader förklarar skillnaden mellan gammalt och nytt radantal.

**Första avvikande övergång: ingen.** Originalhistorikerna återgranskades också läsande med respektive äldre fristående granskare. Inget äldre körkommando som skriver resultat kördes. Varken gamla historiker, facit eller demodata ändrades.

**24 tester med 62 delkontroller passerade.** De omfattar strikta typer och oanvända regler, avvisade eventkedjor, budgetgräns och tillskott, blockering följd av accepterat omförsök, engångsrätt, beslut inom samma steg, start/deadline/horisont, tomma steg, kö bortom horisonten, motstridiga events, ändrade eventförvillkor, uteblivet kontra ej tillämpligt, atomiska domänfel, full permutationstäckning, resursgränser, namnbyte och tidsförskjutning. Manipulationer av både enstaka rader och sammanhängande snapshots upptäcktes. Importgräns, CLI-persistens, adapterkonflikter och jämförelsens förmåga att hitta mellanliggande ändringar testades också.

Bevarande före och efter körningen: **856 ursprungliga filer kontrollerade, noll ändrade**. Manifestet omfattar spårade filer, de gamla isolerade fallen och befintliga ospårade filer, inklusive arkitekturgranskningen. Ingen CE2-kod, kontraktstext, originalmodell, originalskript, originalresultat eller demo har ändrats.

Detaljer och filhashar finns i:

- [Slutsammanställning](results/checkpoint-1/summary.json)
- [Generella kontroller](results/checkpoint-1/generic-checks.json)
- [Båda körningarnas jämförelse och bevarande](results/checkpoint-1/cases/checkpoint.json)
- [Körning 1](results/checkpoint-1/cases/run-1/summary.json)
- [Körning 2](results/checkpoint-1/cases/run-2/summary.json)

## Kvarvarande begränsningar och nästa byggsteg

Eventutfall som schemalägger events avvisas före start med `UnsupportedFeature`, även i oanvänd gren. Externa prövningar utan explicit uteblivetgren, flera schemaläggningsplatser för samma event, återkommande events, avbokning, omschemaläggning, nolltidskedjor, formler, callbacks, allmänna skriptvillkor och andra klocksemantiker stöds inte. Ett konto, enkla villkor och de dokumenterade effektbegränsningarna gäller. Se `FORMAT.md` och `core/profile.json`.

Ingen plan-/strategisökning, generell Möjlig/Stängd/Säkringsbar-beräkning, optimering, AI-onboarding, trafikprognos eller ändring av demon ingår. Permutationsuppräkningen kan växa snabbt; den har explicita resursgränser och gör inget generellt skalbarhetsanspråk.

Av arkitekturrapportens 634 huvudhistoriker återstår **628**: fabrikens övriga huvudscenarier (10), bankavslagsjämförelsen A/B (10), originaltransportens övriga fall (296) och hela samma-parkeringsjämförelsen (312). Dessutom återstår migrering av de äldre kompletterande fallkontrollerna och hela A/B-jämförelsemängden. De nya generella testerna ersätter inte dessa regressioner. Särskilt A:s momentana cykelstatus i samma-parkeringsjämförelsen är inte genomkörd i denna checkpoint.

Den kompletta checkpointverifieringen kontrollerar det ursprungliga arbetskopiemanifestet och förutsätter därför att även de dokumenterade ospårade filerna finns kvar. På en annan checkout behöver arbetskopians bevarandekontroll hanteras separat; de självbärande normaliserade inmatningarna kan spelas upp och granskas direkt med CLI utan tillgång till dessa ospårade filer.

**Checkpoint 1 avslutas här.** Fortsätt först i ett separat nästa byggsteg med den återstående regressionsmängden. Inga facit har uppdaterats för att få tester att passera.
