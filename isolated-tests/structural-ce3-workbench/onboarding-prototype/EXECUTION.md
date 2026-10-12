# Avgränsat lagerprov: bekräftelse till faktisk CE3-körning

Utgångspunkt: faktisk HEAD `8b36285`. Ingen motor-, SR- eller session/2-ändring.
Öppna `http://127.0.0.1:8876/onboarding`, bekräfta ett lagerfall och välj
**Prova två testplaner i CE3**. Förbered tiderna, granska alla antaganden och
markera rutan före **Validera och kör båda testplanerna**.

## Återanvänd körväg

`execution.cjs` översätter endast den exakt identifierade förskrivna
lagerbeskrivningen. `execution_bridge.py` anropar befintliga
`core.schema.validate`, arbetsvyns `service.open_model` och `Store.save/run/result`.
`Store.run` kör riktiga `structural-ce3-replay/cli.py replay` i en separat process.
Historiken granskas med befintlig oberoende `cli.py audit` mot sparad motorindata.
Ingen egen övergångsmotor, plansökning eller generell texttolkning införs.

Kontrakt: `ce3-model/1`, `ce3-script/1`, `ce3-run/1`, `ce3-history/1`, profil
`fixed-replay/0.1`. Format och ordningsregler är lästa i
[FORMAT.md](../../structural-ce3-replay/FORMAT.md), `core/schema.py` och
`core/transitions.py`. COMPLETE betyder komplett uppspelning; PASS betyder
godkänd historikkontroll. Båda krävs innan resultattexter visas.

## Översättning och uppgifter som inte blir motorregler

| Bekräftad uppgift | Representation |
|---|---|
| Genomföra funktionsprov | Beslut `function_test`, fördröjd timer `test_done` |
| Beställarens klartecken | Externt event `approval`, explicit mottaget-/uteblivetgren |
| Börja använda systemet | Beslut `start`, tillstånd `started` |
| Prov krävs före start | Booleskt förvillkor `test_done == true` |
| Klartecken krävs / krävs inte | Lägg till / utelämna `approval_received == true`, enbart från uttryckligt känt booleskt värde |
| Önskad start | Bevarat beskrivningsmål, inte automatisk deadline eller försöksdag |
| Aktuell analysfråga | Exakt förskriven fråga väljer dag 2 eller 3 för plan och efterhandsavläsning |
| Okänd verklig beskedstid | Förblir okänd i sessionen; två separata syntetiska antaganden används |

Ett nej på klarteckenfrågan behåller mottagningshändelsen men gör den inte till
startvillkor. Förslagets `depends_on: approval` betyder beroende av **regeln**,
inte ett ovillkorligt krav på mottaget besked. Ett okänt svar kan inte
bekräftas eller köras. Feltolkningsfallet måste först få ett uttryckligt rättat
förslag och aktuell granskning/bekräftelse.

Översättaren jämför hela det semantiska förslaget med den tillåtna,
deterministiska lagermallen. Avvikande/ytterligare uppgifter avvisas före
körning; revision och ändringshistorik identifieras i sessionsbindningen.
Källor, referenser, typ/status, analys, omfattning och luckor bevaras i
originalsessionen och redovisas i översättningsmanifestet. De behandlas inte
som körinstruktioner. Provets interna arbete, fortsatt drift, verklig
beskedstid, ekonomi, sannolikheter och resursbeläggning analyseras inte.

## Alla tillagda körindata är syntetiska

- Dag 0: inget prov klart, inget klartecken mottaget, drift ej startad.
- Beslutet att genomföra provet tas dag 0. Sluthändelsen inträffar på den valda
  dagen 1…D+1, med strikt positiv fördröjning. D är aktuell **analysdag**.
- Scenario i tid: klartecken tas emot dag D. Scenario senare: dag D+1.
  Båda binder det externa utfallet till `received`; detta är inga kundfakta.
  Motorn kräver även en explicit uteblivetgren; den finns men väljs inte här.
- Två fasta testplaner: startförsök dag D, nytt försök dag D+1 endast om start
  inte redan tagits (`if_not_taken`). Ingen automatisk återförsökssökning.
- Horisont 0…D+1 inklusive, steg 1. Händelser körs **före** dagens beslut.
  Klartecken/prov klart på startdagen kan därför uppfylla förvillkoren.
  När båda händelserna sammanfaller räknar motorn samtliga två ordningar.
- Ingen budgetmodell. Beslutskostnad 0 är profilens tekniska krav utan konto,
  inte ett påstående om kostnadsfri verksamhet.
- Resurstak per plan: 16 banor, 2 000 arbetsrader, 16 tidssteg. Inga tak ändras
  i motorn. Ofullständiga eller underkända resultat ger inga slutsatser.

Datum, besked, initialt läge, försöksordning och horisont visas före körning.
Ändrat testvärde döljer tidigare aktuella resultat tills nya förutsättningar
sparats; de måste därefter köras separat. Underlaget och bekräftelsen ändras inte.

## Identiteter och lokal lagring

Inga session/2-fält, händelser eller migrationsregler läggs till. Dess verkliga
överlämningsgrind används utan att skapa en ny kundbekräftelse. Testknapparna
kräver senaste sessionskopia/checksumma samt en aktuell bekräftelse.

Ett separat, oföränderligt körunderlag `ce3-warehouse-experiment/1` lagras under
`local-data/onboarding/<session>/experiments/<uuid>/request.json`. Det innehåller:

- Ursprunglig sessionskopia och dess checksumma.
- Underlags-, förslags- och kontextdigest, exakt kundbekräftelse och review-binding.
- Översättningsversion, granskningsmanifest, hela motorindata för båda scenarierna
  och alla testantaganden. Hela dokumentet har en checksumma.

`projects/` använder **oförändrad arbetsvylagring**, inklusive projektversion,
`input.json`, `started.json`, `history.json.gz`, `audit.json` och `record.json`.
Varje scenario får ett eget projekt eftersom beskedstiden ingår i modellens
startkö. Vyn jämför de två spårens observationer; den använder inte arbetsvyns
generella jämförelsegrind som kräver identiska modeller.

`attempt.json` skapas exklusivt innan första försöket och journalför kopplingar
till projekten. En avbruten körning får inte startas om i samma arkiv. Förbered
ett nytt test; tidigare försök ligger kvar. Processgränser: 30 sekunder för
denna smala bridge; befintlig kör-/auditprocess har 120 sekunders eget tak.
Ett avbrott kan lämna en process som avslutar sin redan startade körning;
ingen automatisk ny dispatch görs. Återöppning avgör status från sparade data.

Återöppning verifierar sessionen, arkivchecksumma, omräknad översättning och
motorns inputdigest, och återgranskar historiken med audit. Det är **inte** en
ny motorkörning eller modellkörning. Saknade/ändrade delar ger synlig diagnostik.
Senaste förberedelsen är aktuell bara om sessionsbindningen fortfarande är
exakt aktuell. Rättat underlag, ny bekräftelse eller nya testförutsättningar
gör äldre testresultat historiska. Äldre sessionskopior har inga körknappar.
Extra sessionssparning utan sakändring gör inte en giltig bindning inaktuell.

Lagringen är lokal och git-ignorerad. Kör en arbetsvyprocess per datakatalog,
som tidigare. Detta är integritetskontroll av lokala filer, inte ett signerat
eller åtkomstskyddat fleranvändararkiv. Kopiera hela sessionskatalogen för att
bevara både originalarkiv och körningar.

## Faktiskt verifierat resultat

Fyra integrationstester kör tolv faktiska planer och oberoende audit. Samtliga
har COMPLETE/PASS. UI-texterna kontrolleras mot deras verkliga historikrader.

| Bekräftat krav / test | Analysdag | I tid | Senare |
|---|---:|---|---|
| Klartecken krävs, prov klart dag 1 | 2 | Start dag 2 | Blockerat dag 2: klartecken; start dag 3 |
| Klartecken krävs, prov klart dag 1 | 3 | Start dag 3 | Blockerat dag 3: klartecken; start dag 4 |
| Klartecken krävs, prov klart D+1 | 2 respektive 3 | Blockerat dag D: prov; start D+1 | Blockerat dag D: prov och klartecken; start D+1 |
| Uttryckligt ja, prov klart dag 2 | 2 | Start dag 2, båda eventordningar | Blockerat dag 2: klartecken; start dag 3 |
| Uttryckligt nej, prov klart dag 2 | 2 | Start dag 2, båda eventordningar | Start dag 2 trots besked dag 3 |

Regressionskommandon finns i [README](README.md). Tester täcker även ogiltig
och inaktuell bekräftelse, felaktiga tider, ändrade testindata, historiska resultat,
sparning/återöppning, manipulerad motorindata/arkiv och avbrott utan tyst omkörning.
Tidigare sessions-, kontrakts-, adapter-, motor- och arbetsvystester behålls.

Detta är ett tekniskt integrationsprov för ett syntetiskt exempel. Ingen generell
genomförbarhet, optimal ordning eller tidigast möjlig start är fastställd.
AI-kvalitet, SR:s upptäcktsförmåga och kundnytta är inte verifierade. Inga externa
AI-anrop, installationer, kostnader eller publiceringar. Liveprovet förblir pausat.
