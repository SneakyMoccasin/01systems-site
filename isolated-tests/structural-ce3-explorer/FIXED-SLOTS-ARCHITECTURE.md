# Arkitekturkontroll före implementation: deklarerade beslut och tidsplatser

Datum: 2026-10-21. Baslinje HEAD `2dbb0fb` (implementation `7dab9a0`).
Ingen tillämplig AGENTS.md hittades. Repositoryts README-låsning är läst;
uppdraget gäller uttryckligen den isolerade explorern, inte pilotprodukten.
Båda fas-auditerna och explorerns implementations-, gransknings- och
formatrapporter är genomgångna. Befintliga ospårade filer bevaras; ett
bytehashmanifest har sparats i `/tmp/ce3-fixed-slots-before.json`.

## Beslut

Fortsätt med arkitektur A: en syntaktisk scriptproducent över oförändrad
`fixed-replay/0.1`. `core/schema.py` tillåter heltal start <= slot <= horizon,
även negativa heltal, enhetssteg, events före beslut och inklusiv horisont.
Replay besöker även tomma steg. Fördröjda events efter sista beslutet hanteras
därför redan korrekt; pending efter horizon är inte framtida måluppfyllelse.
Inget scheduler-API, ingen alternativ motor och ingen ändrad kärnsemantik behövs.

## Kontrakt och sökrymd

- Opt-in `ce3-scenario-problem/2`, `permutations_once/2`: icke-tom unik
  beslutslista som representerar en mängd, samtliga modellbeslut, lika många
  strikt stigande heltalsslots. Listans indataordning styr inte körordningen.
- Horisonten deklareras separat i oförändrat `model.clock`, inte härledd ur
  sista slot. Samma modell, mål, källor, slots, horizon och kandidatscript
  används mellan scenarier; endast deras fulla outcomes-map varierar.
- För n beslut och s scenarier är den fulla domänen n! kandidater och n! * s
  celler. Stödgräns: 720 kandidater och 2160 celler (alltså 1..6 beslut).
  Storlekskontroll sker före kandidat-/manifestmaterialisering. Överskridande
  är ogiltig/ostödd specifikation, aldrig ett täckningsbesked.
- `max_cells` är en separat körbudget. Hela den stödda populationen bevaras
  även vid budget 0; okörda celler är NOT_RUN med UNKNOWN-mål/robusthet.
- Ändrade search/candidate/cell/manifest/pins och körningens yttre
  execution/attempt/run/observation/result får version /2. Oförändrade
  scenario-set/scenario-space/scenario, plan, mål, auditkvitto och CE3-format
  återanvänds. /1-validering, fixtures och verifieringsbetydelse bevaras.

## Bevis och blockerare att stänga med tester

1. Förväntade ordningar härleds via faktoradisk rangavkodning av 0..n!-1;
   generatorn använder itertools.permutations. Ingen n^n-uppräkning. Varje
   rang väljer successivt bland återstående ID:n; n! olika rangtal ger exakt
   alla permutationer. Gemensam materialisering kontrolleras med direkta
   fullständiga input-orakel som inte använder materialiseringshjälparna.
2. Verify återskapar full domän från problemet före resultatläsning. Omhashat
   bortfall, dubletter och felkopplingar måste avvisas även med nya yttre pins.
3. Befintlig målobservatör härleder redan antalet accepterade försök från
   decision_ids. Alla auditerade banor måste fortfarande bedömas. Separata
   kandidat-/scenario-/cell-/eventbanebesked och trevärdesrobusthet bevaras.
4. Bounds, gaps, post-decision timers, n=1/2/4/5, omdöpning, budgetavbrott,
   gzip/audit/bantäckning och gamla kontrakt ska verifieras innan leverans.
5. Befintlig build-pin-policy gäller: äldre körpaket kräver sin registrerade
   explorerbuild; inga gamla paket eller historiska rapporter migreras.

Inga arkitekturblockerare återstår före implementation. Ovanstående är
acceptanskrav, ännu inte testresultat. Adaptiva policyer, tidpunktssökning,
valfria beslut, retries, resume, pruning, optimering och generell
AI-/domänkompilering ligger fortsatt utanför denna etapp.
