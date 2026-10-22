# Leverans: begriplig svensk modellbekräftelse

Baslinje och faktisk start-HEAD: `d4589a8bab453b8e951f6bf80b0c357445601c4f`,
samma som `decision-flow-demo-v1`. Startarbetskopian var ren och detached.
Repo-/pilotinstruktioner lästes före arbete; ingen AGENTS.md hittades i
arbetskopian eller de kontrollerade föräldrakatalogerna.

Arbetet ligger isolerat i `/private/tmp/ce3-swedish-model-review` på
`codex/ce3-swedish-model-review`. Ingen integration eller push har gjorts.
Replay, audit, söksemantik, mål, onboarding, SR och huvudspåret är oförändrade.

## Levererat

Den öppna sidan visar nio svenska avsnitt med faktiska modellvärden,
beslutsnamn, villkor, effekter, regelkostnader, tider, mål, källkopplingar,
antaganden, begränsningar och olösta frågor. Övningsmärkningen står överst.
Sökförklaringen och det tekniska underlaget är stängda från början.
Källcitat samlas; full snapshot och alla exakta värden finns kvar.

[Versionsbeslutet](PILOT-PRESENTATION-V1.md) inför draft/snapshot /3 och ett
strikt manuellt namnregister i presentation /1. Kvitton/case/ankare/resultat
behåller /2 och sina säkerhetsgarantier. Inga äldre paket migreras. Ny
presentation kräver ny prepare och båda nya bekräftelserna. HTML genereras
deterministiskt från snapshoten och binds som exakta bytes. Saknade namn
markeras uttryckligen; inga verksamhetsbetydelser härleds ur kodnamn.

## Verifiering

- 19 pilotregressioner, 56 oberoende/regressions-/F1–F3-tester och 7 nya
  presentationstester: **82 tester passerar**.
- Ändrade regler/värden ändrar rätt svensk mening: villkor, effekt,
  initialvärde, händelsetid, målgräns, scenario, valgrupp och körbudget.
- Determinism vid annan objektordning, HTML-escaping, stängda details,
  fungerande interna hänvisningar, full modellspårning och gamla kvittons
  ogiltighet kontrolleras. Namnregistret och versionsgränsen valideras strikt.
- Separat AB-modell med budgetkonto, kostnader 3/2, add +2/−1,
  intervall, ge-villkor, tidsgräns och schemalagd händelse genomgår
  prepare/freeze/run/verify. Endast AB når målet.
- Färsk CLI-kedja med **fabricerade** kvitton: 12 certifierade celler,
  fyra positiva mål, endast PN robust TRUE. Verify ger samma resultat
  och ändrar varken bytes eller mtime i runpaketet.
- `git diff --check` passerar. Ändringarna är begränsade till pilotens
  presentation, dess indataformat, exempel, relevanta tester och dokumentation.

Testkommandon finns i versionsdokumentet. Slutliga loggar:
`/private/tmp/ce3-swedish-{pilot,review,presentation}-tests-final.log`.
Det bevarade färska paketet med CLI-utdata, kvitton, separat externt ankare
för kontraktstest och verifieringssammanfattning ligger i:
`/private/tmp/ce3-swedish-review-final-20261022/`.
Ankarets testförvaring är inte ett påstående om betrodd produktionsförvaring.
Tidigare kontrollpaket har inte skrivits över eller återanvänts.

## Manuell visuell kontroll återstår

Den renderade kontrollen blockerades av Browser Use URL-policy vid öppning
av den lokala HTML-filen. Ingen alternativ browser, server, CDP eller annan
omväg användes. Struktur och CSS är granskade i koden, men faktisk layout,
zoom, utskrift och skärmbredd har inte verifierats i en renderad webbläsare.

Christian: öppna följande **slutliga, färska** fil via Finder → Öppna med →
webbläsare. Finder → Gå → Gå till mapp kan användas med katalogsökvägen.

`/private/tmp/ce3-swedish-review-final-20261022/prepared/review.html`

Kontrollera särskilt övningsmärkningen, de nio avsnitten, de två stängda
huvudsektionerna, läsbar tabellbredd och alla tre körgränsuppgifterna.
Ändra inte HTML-filen: justeringar kräver en ny prepare och nya bekräftelser.
