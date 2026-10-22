# Svenskt modellunderlag: presentation /1–/2, draft och snapshot /3

Utgångspunkt: huvudbaslinjen `d4589a8` på `decision-flow-demo-v1`.
Detta är ett uttryckligt presentations- och indataformatbeslut ovanpå
[PILOT-FORMAT-V2.md](PILOT-FORMAT-V2.md). Modell, mål, urval, replay, audit,
körning, filpolicy, klassificering och bekräftelsernas betydelse ändras inte.

## Förenklad huvudvy ovanpå fea13a5

Den aktuella huvudvyn börjar med fråga, tillåtna alternativ och samtliga
målkrav. Beslutens villkor, effekter, kostnader och följdhändelser samlas i
ett kort per beslut; obligatoriska beslut visas före alternativen, utan
att ändra sökningens ordning. Varje avsnitt/kort har stängt **Visa underlag**.
Källhänvisningar, modellfält och exakta värden finns kvar. Antaganden och
olösta frågor är synliga. Varningsraden för en otillräcklig körbudget syns
också direkt. De två tidigare detaljnivåerna behålls stängda.

Startvyn visar de fält som används i villkor, effekter, mål eller budgetkonto.
Ett helt oanvänt fälts startvärde och alla tillåtna värdemängder finns i det
tekniska underlaget. Ändrade regler ändrar automatiskt vilka startfält som
är relevanta. Nollkostnader och frånvaro av följdhändelser skrivs inte ut i
varje kort. Avsaknad av kostnadskonto förklaras en gång utan påstående om
kostnadsfrihet i verkligheten. Positiva kostnader och krav på täckning syns.

För naturliga meningar införs ett litet, explicit opt-in-format:

```json
{
  "schema_version": "ce3-pilot-presentation/2",
  "labels": {"/model/domains/done": "Leveransen är klar"},
  "boolean_states": {
    "/model/domains/done": {
      "true": "Leveransen är klar",
      "false": "Leveransen är inte klar"
    }
  }
}
```

`boolean_states` är obligatoriskt för /2 men får vara tomt. Endast existerande
booleska tillståndsfält får anges. Varje post har exakt `true` och `false`,
med icke-tomma och åtskilda texter. Meningarna beskriver **tillstånd**, inte
händelser, framtida garantier eller nya regler. Modellen väljer rätt mening
utifrån det faktiska booleska värdet i startläge, villkor, effekt eller mål.
Exempel: en effekt visas som ”Efter genomförandet: Leveransen är klar”.
Inga meningar skapas genom språklig gissning eller tolkning av kodnamn.
Saknas en bunden mening används neutralt fältnamn och värde. Människor måste
granska att meningarna återger de avsedda tillstånden korrekt; typkontrollen
kan inte verifiera ordens verksamhetsbetydelse.

Draft och snapshot behåller /3; case, kvitton och ankare är oförändrade.
Presentation /1 är fortsatt ett uttryckligt giltigt **författarformat för en
ny prepare**, utan automatisk komplettering av meningar. Det omvandlas inte
till /2. Äldre paket måste använda sin registrerade implementation.
Ändrad renderarkod ändrar buildbindningen även för /1-underlag. Inga gamla
snapshots, HTML-filer, builds eller kvitton får repareras eller återanvändas.
Denna förenkling kräver nya paket och två nya bekräftelser. Reglerna för exakt
snapshot-/HTML-bindning nedan gäller även de nya tillståndsmeningarna.

## Versionsbeslut och bevarande

Nya prepare kräver `ce3-pilot-draft/3` och skriver `ce3-pilot-snapshot/3`.
Båda får exakt ett nytt obligatoriskt fält, `presentation`:

```json
{
  "schema_version": "ce3-pilot-presentation/1",
  "labels": {
    "/model/decisions/A": "Förbered",
    "/model/domains/ready": "Förberedelsen är klar",
    "/model/clock/unit": "dagar"
  }
}
```

Exemplet är endast syntax; namn och tidsenhet måste motsvara det faktiska fallet.
Det är manuellt deklarerade namn, inte AI-sammanfattning eller nya regler.
Tillåtna kopplingar är exakt modellens beslut, tillståndsfält (`domains`),
strängvärden i deras enumlistor, händelser, händelseutfall, klockans enhet och
scenarioetiketter. JSON-pointer-escaping gäller (`~0`, `~1`). Okända kopplingar,
formatversioner, tomma namn och sammanfallande namn inom samma kategori avvisas.
Tidsenhetens namn innebär ingen omräkning av tider.
En saknad etikett visas uttryckligen som **Namn saknas** med originalnamnet,
samt en synlig kompletteringsuppgift. Ingen betydelse gissas. Tomt namnregister
är tillåtet för ett ofullständigt namngivet underlag; det är inget intyg om
begriplighet. Namnregistrets riktighet måste granskas av människor.

Snapshotens digest omfattar presentationens version och namnregister.
Båda kvittona binder fortfarande exakt snapshot-ID och HTML-filens SHA-256.
`explorer_build` registrerar också `pilot_presentation.py` med faktisk filhash.
`validate_case` återgenererar samma HTML och jämför de exakta bytesen.
Namn- eller kodändring kan därför inte accepteras med tidigare kvitton.

Case, receipt, binding, anchor och result behåller **/2**: deras struktur,
strikta bekräftelseposter och klassificering ändras inte. Confirmation record
behåller **/1**. Den nya implementationen accepterar endast draft/snapshot /3.
Äldre /2-paket ska inspekteras med sin registrerade implementation/runtime;
deras betydelse eller bytes skrivs aldrig om. **Ingen automatisk migrering.**
För ny presentation krävs ett uttryckligt nytt /3-utkast, ny prepare-katalog,
ny granskning, två nya kvitton, ny freeze-katalog och nytt externt ankare.
Tidigare paket, kvitton och körkataloger bevaras.

## De tre nivåerna

1. Den öppna modellen visar överblick, relevanta startvärden och beslutskort
   med villkor, effekter, relevanta kostnader, schemaläggning,
   tider, scenarier och alla målkrav. Antaganden skiljs från källkopplade
   uppgifter. Frågor, undantag, begränsningar och körbudget syns före bekräftelse.
   Klassificeringen står överst. Sidan är underlag, aldrig ett analysresultat.
2. **Visa hur analysen fungerar** är stängd från början. Tillåtna planer
   räknas upp via befintlig syntaktisk generator med sina faktiska tider.
   Urval, valgrupper, prefix, tom plan, blockerade försök utan retry,
   samtidiga händelsebanor, fasta scenarioplaner och ofullständig sökning förklaras.
   Alla tre körgränsuppgifter från /2 samt de numeriska replaygränserna bevaras.
3. **Visa tekniskt underlag** är stängd från början. Exakta kodfält och värden,
   namnkopplingar, spårning, kontroller, identiteter, registrering och Full
   snapshot bevaras. Likadana källreferenser samlas med versions-/spannuppgifter;
   mappingtabeller hänvisar till ett numrerat källutdrag. Full snapshot behåller
   även ursprungliga citat utan förlust. Tabeller har två läsbara kolumner och
   horisontell rullning på små skärmar, inte bokstavssmala textkolumner.

Regelbeskrivningen använder endast stödets typade operationer: eq/ge,
set/add, kostnad och budgetkonto, tidsfördröjning, timer/externt utfall,
terminal/always/reach_by. Den utvärderar inga tillstånd eller regelutfall.
Värden hämtas alltid från aktuell snapshot; författarens mappingprosa ersätter
aldrig de genererade regelmeningarna. Källhänvisningar länkar tillbaka till
mappingens exakta modellfält. All författad text HTML-escapas. Dokumentet är
fristående utan skript, fjärrinnehåll eller beroenden på nätverk/klocka.

## Kontroll och öppning

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/presentation_tests -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_tests -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_review_tests -v
```

CLI-kommandona i [PILOT-CONCIERGE.md](PILOT-CONCIERGE.md) är oförändrade.
Övningsgeneratorn skapar ett uttryckligt /3-utkast med presentation /2, svenska
namn och booleska tillståndsmeningar. Alla kvitton den skapar är fortfarande fabricerade testkvitton.
Öppna den **nya prepared-katalogens `review.html`** via Finder → Öppna med →
webbläsare. Ändra aldrig en redan förberedd HTML-fil för att justera visningen.
