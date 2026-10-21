# Arkitekturkontroll före implementation — deklarerade tidsplatser

2026-10-21. Baslinje HEAD `2dbb0fb`, med implementation `7dab9a0`.
Arbetskopian var ren. Inga tillämpliga AGENTS.md hittades. README:s låsta
pilot lämnas orörd; uppdraget gäller endast den isolerade explorern.
De två CE3-PHASE1A*-auditerna saknas i denna worktree och lästes oförändrade
i `/Users/christian/Projects/pulse_engine_clean/`. Explorerns tidigare
implementations-, format-, gransknings- och gziprapporter lästes också.

## Beslut

Fortsätt med auditens arkitektur A. `fixed-replay/0.1` tillåter redan
heltalstider, tomma steg, events före beslut och separat inklusiv horisont.
Ett längre script eller andra fasta slots behöver ingen ny övergångsregel.
Wrappern producerar endast vanliga inputs. Befintlig replay/CLI exekverar,
befintlig audit verifierar alla eventbanor och befintlig målobservatör
räknar redan accepterade försök från antalet deklarerade beslut.

## Kontrakt och sökrymd

Nytt opt-in `ce3-scenario-problem/2` och `permutations_once/2`: icke-tom
unik beslutslista (indataordning behöver inte vara sorterad), lika många
strikt stigande heltalsslots inom modellens deklarerade clock.
Alla modellbeslut måste fortfarande ingå. Horisont deklareras endast i
`model.clock`, aldrig härledd från sista slot. Modell, mål, källor, slots,
horisont och kandidatens script är gemensamma för samtliga scenarier.
Endast outcomes varierar. En enda deklarerad scenariomedlem stöds också.

Populationen är exakt n! kandidater och n! × s celler. Implementationstaket
är 6 beslut / 720 kandidater och 2 160 celler. Storlekskontrollen ligger
före manifest-/kandidatuträkning och före scenariovisa modellkopior.
För stor domän avvisas; en lägre max_cells-budget behåller hela populationen
och ger NOT_RUN/UNKNOWN för återstoden. Replay-limits är ett separat tak.

Problemberoende sök-/kandidat-/cell-/manifest-/pinskontrakt och körningens
execution/attempt/run/observation/result får /2. Oförändrade scenario-set,
scenario-space, scenario, plan, terminalmål, auditkvitto och kärnformat
behåller /1. /1-ingångarnas scope, fixtures och hashpayloads bevaras.
Gamla outputpaket kräver som tidigare sin registrerade explorerbuild.

## Oberoende och blockerare

Generatorn använder itertools.permutations. /2:s frysta population härleds
separat genom lexikografisk successor (pivot, efterföljare, vänt suffix),
från sorterade ID:n. Det går igenom n! ord med O(n) arbetsminne, inte n^n.
Verifieraren återbygger hela manifestet från problemet före resultatläsning.
Gemensam materialisering skyddas av direkta fullständiga input-orakel.

B1/E1: nya versioner och identitetsbindningar behövs.
B2/E2/E7: storleksgrind, oberoende population och bortfallsattacker behövs.
B3/E3/E8: håll cell-, eventbane-, mål- och robusthetsbesked separata;
korruption, limit eller auditfel får inte bli ett verifierat negativt mål.
B4/E5: fasta scripts och outcomes-only förhindrar scenarioadaptiva planval.
B5: budget får inte krympa domänen; retry/resume ingår inte.
B6/E9: baslinjens 2 187 filer är hashinventerade i
`/tmp/ce3-slots-before.json`; backend och gamla fixtures ska bevaras.

Inget kärnsemantiskt hinder har identifierats. Återstående acceptansgrindar
är implementation och tester av punkterna ovan. Pruning, merging, policies,
tidsoptimering, valfria/upprepade beslut, generell AI-kompilering och UI
är utanför denna etapp och förblir separata framtida frågor.
