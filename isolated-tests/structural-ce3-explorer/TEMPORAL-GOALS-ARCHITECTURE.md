# Tidsbundna mål: arkitektur och semantik före implementation

2026-10-22. Baslinje `d24d6d1`, ren arbetskopia med frikopplad HEAD.
Budgeträttningen är godkänd i `3ab8948`; granskningsrapporten lästes via git.
Ingen tillämplig AGENTS.md finns. README:s pilotlåsning är läst; uppdraget
auktoriserar enbart den isolerade explorern. Båda arkitekturauditerna lästes
från huvudcheckouten (de finns inte i denna worktree), tillsammans med
explorer-/scenario-/fixed-slots-format och fixed-slots-rapporterna.
Startinventering: `/tmp/ce3-temporal-before.json`, 2198 befintliga filer.
Alternativet `7df45d6`, huvudcheckouten och onboarding-worktreen ändras inte.

## Beslut och observationspunkter

Oförändrad replay och audit räcker. `core/replay.py` publicerar initial,
step_begin, varje event, decision_point, varje beslutsförsök, step_end och
advance. Även tomma steg finns med. `audit/verify.py` verifierar varje hel
before/after-snapshot, obruten radkedja, slutrad och hela permutationsträdet.
Inget nödvändigt historikfält saknas; ingen alternativ motor behövs.

På varje certifierad bana används samtliga rader i indexordning, med before
följt av after. Initialpunkten är rad 0.before (0.after ingår också).
Punktens tid är snapshot.step, **inte** radens step: advance.before hör till
t och advance.after till t+1. Dubbla lika tillstånd behålls som separata
evidenspunkter. Marker-, blockerade och inapplicable-rader ingår också.
Det sista tillståndet är sista radens after vid inklusiv modellhorisont.

Tillstånd bärs redan fram av replay och finns i de auditerade markörerna.
Observatören filtrerar snapshots; den tillämpar inga regler, budgetar eller
events och interpolerar inte fram nya tillstånd. Mellan övergångar ändras
inga modellerade statefält. Flera övergångar samma tid bedöms var för sig:
en falsk after-punkt följd av återställning samma steg bryter alltid always.
Atomiska övergångars interna effektordning är inga observationspunkter.

## Mål och kvantifiering

- `terminal(equals)` jämför typade likheter i sista radens after-state.
- `always(equals, through)` kräver predikatet på alla punkter från clock.start
  till och med through, inklusive alla övergångar vid kontrolltiden.
- `reach_by(equals, deadline)` kräver minst en punkt från clock.start till och
  med deadline. Initial uppfyllelse räcker; senare förlust upphäver inte vittnet.
- Tider måste vara heltal (inte bool), inom deklarerat [start,horizon].
  Negativa modelltider tillåts. Predikatet är en icke-tom konjunktion av samma
  typade tillståndslikheter som terminalmålet. Inga nästlade operatorer.
- En explicit icke-tom `all`-lista konjungerar komponenter. Varje komponent
  bedöms separat på varje bana. Samlat banmål kräver både alla komponenter
  och exakt n accepterade försök utan blockerade försök över **hela** körningen,
  även efter en tidig kontrolltid/deadline. Cellmålet kräver detta på alla banor.
- Befintlig trevärdesrobusthet över hela deklarerade scenariomängden återanvänds.
  Ett certifierat negativt cellmål är ett motexempel, inte ett tekniskt fel.

## Bevisgräns, identitet och kompatibilitet

Audit måste certifiera hela körningen innan någon komponent bedöms.
INCOMPLETE/ERROR, saknade banor eller trasiga artefakter ger UNKNOWN för cellen;
ingen delhistorik ger nya delbevis. Pending/framtida besked är inga vittnen.
Verify återauditerar rätt input/historik och jämför hela den nyhärledda
observationen inklusive evidens med den sparade, utan replay eller skrivning.

Nytt opt-in `ce3-scenario-problem/3` använder oförändrad permutations_once/2.
Målkontrakt `ce3-history-goal/1`, projektion `ce3-goal-observation/2`.
Berörda yttre scenario cell/manifest/pins/execution/attempt/run/observation/result
får /3. Search-space/candidate behåller /2 eftersom söksemantiken är identisk;
scenario-set/space/scenario, plan, CE3-input, auditkvitto och runtime behålls.
Gamla /1- och /2-problem accepterar endast det gamla terminalkontraktet.
Ny /3 kan uttrycka samma terminalkrav som en terminalkomponent.
Definitionens hash binder sampling, operatorer, predikat, tidsgränser,
konjunktion och all_event_paths. Problem/manifest/pins och observation binder
definitionen; ändrad deadline kan inte återanvända gammal observation.
Byggidentiteten omfattar som tidigare alla toppnivå-Pythonfiler.

TRUE always och FALSE reach_by får intervallet samt hela den täckta ordnade
punktlistan. FALSE always får ett konkret första motexempel; TRUE reach_by
ett första vittne. Punktbevis anger snapshot-tid, radindex, sida och state.
Bana/eventordningar och history/input/audit/build binds av observationsomslaget.

Ett verifierat historikpredikat gäller modellerade tillstånd. Det bevisar
varken att verksamhetsmodellen är fullständig eller att den är sann i verkligheten.
Ingen ny sökgrammatik, tidsoptimering, driftmodell, retry/resume, policy,
UI eller onboarding ingår. Ovanstående fastställs före produktionsändringarna;
acceptansfallen ska ha facit direkt från små deklarerade regler.
