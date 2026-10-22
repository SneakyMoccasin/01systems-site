# Svenskt modellunderlag: presentation /1, draft och snapshot /3

Utgångspunkt: huvudbaslinjen `d4589a8` på `decision-flow-demo-v1`.
Detta är ett uttryckligt presentations- och indataformatbeslut ovanpå
[PILOT-FORMAT-V2.md](PILOT-FORMAT-V2.md). Modell, mål, urval, replay, audit,
körning, filpolicy, klassificering och bekräftelsernas betydelse ändras inte.

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

1. Den öppna modellen visar de nio svenska rubrikerna, konkreta startvärden och
   tillåtna värden, beslut, villkor, effekter, regelkostnader, schemaläggning,
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
Övningsgeneratorn skapar nu ett uttryckligt /3-utkast med deklarerade svenska
namn. Alla kvitton den skapar är fortfarande fabricerade testkvitton.
Öppna den **nya prepared-katalogens `review.html`** via Finder → Öppna med →
webbläsare. Ändra aldrig en redan förberedd HTML-fil för att justera visningen.
