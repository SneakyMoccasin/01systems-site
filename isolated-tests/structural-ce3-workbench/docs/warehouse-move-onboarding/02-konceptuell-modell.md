# Konceptuellt modellutkast

**Ej körbar modell.** Symbolerna nedan saknar avsiktligt numeriska tider, kostnader och utfallsbindningar. Inga JSON-indata, körresultat eller nya funktioner har skapats. Käll-ID hänvisar till [underlagsregistret](01-underlagsregister.md). Kodstödet och dess begränsningar redovisas i [stödmatrisen](03-stodmatris.md).

## Modellens avgränsning

Ett möjligt första steg är en fast uppspelning av deklarerade flyttomgångar och externa kontrollbesked. Den kan pröva ordningen mellan inventering, mottagning, systemtest, gemensam orderkontroll och frisläppning av reserv. Den bevisar inte fysisk lagerkorrekthet, orderleverans, bemanning eller lönsamhet.

Låt G vara en **ännu ej fastställd** mängd grupper/omgångar. U28–U32 är ett partiellt underlag för G, inte ett komplett sortiment. Vid behov måste en grupp delas i flera fasta omgångar för att återge successiv flytt. Varje omgång kräver egna beslut och event-ID:n eftersom profilen inte har återanvändbara händelseinstanser. Ingen antalssättning görs här.

80/20 avser ungefärlig andel **per artikel**. En gruppmarkör betyder bara att deklarerad omgång mottagits och kontrollerats. Den betyder inte att 80 % av gruppens volym eller varje artikel verkligen finns tillgänglig. Förbrukning av den kvarvarande reserven lämnas okänd (U14–U15).

## Föreslaget starttillstånd vid arbetsdag 1

| Del | Konceptuellt startvärde | Källa / status |
|---|---|---|
| Tillgång till nya lagret | Tillgängligt, målat; ny utrustning och nya hyllor på plats | U09–U10, testets startpremiss |
| Upphämtning från båda adresser | Ordnad | U12 |
| Förvaringsväg | Tillfällig förvaring möjlig; gamla hyllor kan återstå | U11; inte automatisk kapacitetsgaranti |
| Inventering | Ej bekräftad | U13; särskilt enumvärde, inte ”genomförd” eller ”underkänd” |
| Teststatus | Ej godkänt i underlaget; teststart planeras dag 1 | U19–U20; statusmodell är analysförslag |
| Huvudomgång per g | Ej flyttad enligt den valda startavgränsningen | Modellpremiss måste bekräftas före körning |
| Mottagning/registrering per g | Ännu ej bekräftad för den planerade omgången | U18, U21, U33 |
| Återstående reserv per artikel | Kvantitet okänd; avsedd initial andel cirka 20 % | U14–U15; inget statiskt 20 %-tal i lagersaldo |
| Gemensamt kontrollbesked | 20-order-villkoret ännu ej bekräftat | U22–U24; ingen klocka eller räknare sätts till 20 |
| Reservfrisläppning och reservomgång per g | Ej frisläppt / ej flyttad | Förslag till administrativa markörer |
| Lager-/ordersystem | Separata system, manuell fördelning och avbockning | U33; tekniska integrationsstatusar okända |
| Leveransadress | Nya adressen som normal avsikt | U37; bekräftad styrning och pågående leveranser okända |
| Ekonomi och resursbeläggning | Utanför detta utkast; värden okända | U26–U27, U45; inte noll |

Fält som betyder kunskap ska namnges som besked eller bekräftelse. ”Ej bekräftad” får inte rapporteras som att en fysisk aktivitet säkert inte skett. Med profilens fullständiga `initial` kan en sådan skillnad uttryckas som en explicit enum, men ett okänt heltalsvärde kan inte bara ersättas med null.

## Beslut, villkor, effekter och möjliga händelser

Samtliga rader är analysförslag, källförankrade men inte färdigställda modellregler. Bekräftelser hämtas externt och binds före en framtida uppspelning. Ingen av fördröjningarna nedan har valts.

| Föreslagen handling / händelse | Förvillkor | Omedelbar effekt | Möjlig fördröjd händelse och innebörd | Källa |
|---|---|---|---|---|
| Registrera inventeringsbesked | Underlag för genomförd inventering behövs | Vid externt bekräftat utfall: inventering bekräftad | Initialt besked vid deklarerat steg, eller ett separat beslut med positiv fördröjning. Inget automatiskt godkännande | U13 |
| Starta system- och packstationstest | Tillträde och utrustning tillgängliga | Test pågår | Externt testbesked: godkänt / ej godkänt / besked uteblivet. Enbart förfluten tid ger aldrig godkänt | U10, U19–U20 |
| Starta huvudomgång g | Inventering bekräftad; omgång g ännu ej flyttad | Omgångens flyttade varor markeras under transport/hantering | Externt mottagningsbesked: mottagna, registrerade och avbockade / avvikelse / besked uteblivet. Endast första utfallet gör omgången tillgänglig | U13–U18, U33 |
| Registrera första riktiga utskicksbesked | Test godkänt och deklarerad relevant vara mottagen/registrerad | Externt bekräftad milstolpe kan markeras | Valfri fast kontrollpunkt; uppnåendet får inte härledas enbart ur tillgänglighet. Kräver även verklig order i den externa verksamheten | U21 |
| Registrera gemensamt 20-order-besked | Bekräftelse av 20 riktiga korrekt packade order från nya lagret, överlämnade till PostNord; modellmässigt minst godkänt systemtest | Bekräftat / inte uppfyllt / väntar på besked | Externt event vid ännu okänt, senare uttryckligen angivet steg. Inget separat orderprov per g och inget kundmottagningskrav | U22–U24 |
| Frisläpp reserv enligt A | Gemensamt kontrollbesked bekräftat; samtliga huvudomgångar mottagna och kontrollerade | Frisläpp återstående reserv för alla grupper | Behöver ingen fördröjd händelse; fysisk flytt följer i separata beslut | U46 |
| Frisläpp reserv för g enligt B | Samma globala kontrollbesked; huvudomgång g mottagen och kontrollerad | Frisläpp återstående reserv för g | Övriga huvudomgångar kan återstå; ger ingen extra kapacitet | U25, U47 |
| Starta reservomgång g | Reserv g frisläppt; faktisk omfattning/mängd fastställd externt | Deklarerad återstående reservomgång markeras under flytt | Separat externt mottagnings-/avbockningsbesked. Inget antagande att 20 % finns kvar | U15, U17–U18 |
| Flytta/montera kvarvarande gamla hyllor | Vilka hyllor som kan frigöras och deras samband med kvarvarande varor måste klarläggas | Föreslagen status ”arbete pågår” | Externt färdigbesked eller uttryckligen antagen fast arbetstid. Ska inte spärra alla nya utskick generellt | U11, U17 |
| Bekräfta övergång till endast nya systemet | Alla definierade varuomgångar flyttade och avbockade; avstämningskrav behöver preciseras | Endast nya systemet används | Ingen automatisk lager-/ordersynkronisering eller förbrukning | U33–U34 |
| Registrera grossistadress/omstyrning | Leveransidentitet och omstyrningsmöjlighet behövs | Fast administrativ adressmarkör | Externt leveransbesked kan modelleras för en namngiven leverans; inga generella rutter eller automatiska beställningar | U05, U37–U39 |
| Bekräfta flytt klar respektive lokal överlämnad | Varor/hyllor respektive tömning/städning/överlämning behöver egna färdigkriterier | Separata milstolpar | Datumkontroll först när kalender och gränser är fastställda | U08, U17 |

Flera fysiska steg får bara slås ihop till ett mottagningsbesked om förenklingen uttrycks: ”mottagen och avbockad” återges då som ett externt faktum. Det simulerar varken manuell registrering eller felplock. Godkännandemarkören för en grupp är en varukontroll, inte 20 order eller ett nytt kundorderprov för den gruppen.

## 20-order-villkoret: exakt representationsgräns

Det minsta förslaget är ett gemensamt enumfält för **externt bekräftat kontrollbesked**, med tillstånd som ej bekräftat, bekräftat, inte uppfyllt och väntar. En `external`-händelse har fasta möjliga effekter och en explicit absentgren som sätter vänteläget. Reservfrisläppning kräver `eq` mot bekräftat.

Utanför motorn måste någon styrka att 20 riktiga kundorder uppfyller både packnings- och överlämningskravet. Källa, ansvarig bekräftelse och tidpunkt behöver dokumenteras. Bekräftelsen avser totalt 20 order i nya lagret. Den får varken bytas mot 20 paket eller räknas som kundmottagande. Om order delas måste kontrollunderlaget tydliggöra vilka order som faktiskt kvalificerar; motorn avgör inte detta.

Ett begränsat heltalsfält med `ge 20` är syntaktiskt möjligt. Men dess `set`/`add` skulle fortfarande kräva i förväg deklarerade externa uppgifter. Varken räknaren eller en uppdelning i 20 engångsbeslut skapar orderhantering. Det minsta utkastet väljer därför beskedsmarkören, inte en skenbart simulerad orderräknare.

En utfallsbindning läses inte som ett tidigt faktum: den appliceras först när händelsen förfaller och dess förvillkor gäller. Om förvillkor saknas tas händelsen ur kön med `event_inapplicable`, utan valt utfall. Om absentgrenen väljs sätts vänteläget och eventet är också förbrukat. Inget av fallen ger automatisk omprövning. En senare kontroll kräver separat, i förväg deklarerad händelse och plats i planen. Ett externt besked är här **fast indata till replay**, inte en levande integration eller callback.

Tidpunkten är okänd. Ingen timer får sätta beskedet till bekräftat efter dag 1, 2, 10 eller någon annan antagen dag. Första-utskicks-målet är inte en källgrund för när order nummer 20 är överlämnad.

## Gemensam modell, två fasta skript

Arbetsvyns jämförelse kräver samma modell och källidentitet. Ett möjligt gemensamt modellutkast har både A:s samlade frisläppningsbeslut och B:s frisläppning per grupp. Båda sätter samma frisläppningsfält; själva reservflytten per grupp är ett gemensamt engångsbeslut med samma regler. A-skriptet använder enbart A-frisläppningen, B-skriptet enbart B-frisläppningarna. Därmed behöver inte gemensamma mottagningsevent få två schemaläggningsplatser.

I A hålls **kvarvarande**, inte garanterat 20-procentig, reserv kvar tills alla huvudomgångar och det globala villkoret är klara. I B tillåts frisläppning av färdiga grupper efter samma globala villkor. Att frisläppning blir tillåten startar ingen flytt automatiskt: varje försök måste finnas vid ett bestämt steg i respektive skript. Misslyckade försök upprepas bara om ytterligare försök uttryckligen skrivits in.

Ingen tidigareläggning eller kortare fördröjning tilldelas B här. Tio- och femdagarsramarna anger inte hur mycket parallellarbete som ryms. Gemensamma omgångars antagna varaktigheter, tillgängliga resurser och kontrollutfall ska hållas lika i en rättvis jämförelse, eller skillnader redovisas som egna scenariopremisser. Kontrollbesked kan vara planberoende i verkligheten; samma beskedstid i A/B är i så fall en uttrycklig experimentförenkling, inte ett verksamhetsfaktum.

## Tid, deadlines och möjliga timers

En framtida arbetsdagsmodell måste definiera startögonblick, vilket ögonblick varje steg representerar, horisont, helger, helgdagar och kopplingen till tre/fyra kalenderveckor. Ett startdatum behövs för verkliga datum; en uttryckligt avtalad relativ kalender kan räcka för ett avgränsat replaytest. Ingen sådan kalender antas nu.

Kärnan förlägger beslutsschemalagda händelser till `beslutssteg + delay`, där delay är ett positivt heltal. Start på steg 1 med delay 1 ger steg 2; delay 2 ger steg 3. Därför kan ”test under dag 1–2” inte okritiskt översättas till delay 2 och samtidigt sägas vara klart senast dag 2. Händelser behandlas före beslut samma steg; en start och ett nytt positivt fördröjt besked kan inte inträffa i samma steg.

Timers kan, efter kalenderbeslut, markera att en tidsgräns eller informationsperiod passerats. De ska inte godkänna test, mottagning eller 20 order. Profilens deadline-metadata kräver ett initialt expiry-event vid sista inkluderade steg + 1, men metadata skapar ingen beslutsspärr. Ett krav behöver uttryckliga tillståndseffekter/förvillkor eller en separat historikobservation. Ett mål som första utskick dag 2 ska inte omvandlas till ett förbud mot senare utskick. Grossistens önskade tre dagars beskedstid är inte en hård deadline.

Ett event kan inte schemalägga ett annat event, och ett beslut kan schemalägga högst ett. Teststart och varuflytt måste därför vara skilda beslut om båda behöver egna senare besked. Tidsintervall som 1–2 dagar kräver senare uttryckliga scenarioval; motorn väljer inte värde eller sannolikhet.
