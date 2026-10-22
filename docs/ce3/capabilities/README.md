# Gemensam CE3-motorbaslinje

**Aktuell rekommenderad version är [engine-baseline-v2.json](engine-baseline-v2.json)**,
med baseline-ID `ce3-optional-decisions-f31033b`. Den beskriver den granskade
implementationen `f31033b` och dess oförändrade äldre motorstöd.
[engine-baseline-v1.json](engine-baseline-v1.json) bevaras byteoförändrad som
historik för tidsmålsetappen `9b705f0`/`2ceb06b`, genom scenario /3.
Filversionen v2 ändrar inte inventarieformatets `ce3-engine-capabilities/1`
eller något exekverbart indataformat.

Sökvägar i JSON räknas från repositoryroten. Läs `implementation_binding`,
`purpose` och `versions` först, därefter `supported`, `evidence_axes`,
`unsupported` och `onboarding`. `supported.explorer` gäller uttryckligen
scenario /2–/3; `supported.selected_explorer` beskriver /4. Motsvarande mål
finns i `goals.history` respektive `goals.selected_history`.

## Versionsbindning och integration

`decision-flow-demo-v1` fast-forwardades från `85e19b0` via arkitekturförslaget
`250f021` och implementationen `f31033b` till den oberoende granskningen
`f63bc0d`. Granskningen är direkt barn till implementationen och tillför
endast rapport och granskningstester. Status är PASS utan nödvändiga rättningar.
Ingen integrationsändring av implementationen gjordes.

V2 binder dessa fullständiga commit-ID:n, granskningarnas rapportsökvägar och
20 faktiska kod-/profilhashar från replayns och explorerns manifest, inklusive
`selection.py`. `explorer_build_id` är motorns kanoniska JSON/LF-digest av
kodmanifestet, inte SHA-256 av denna formaterade JSON-fil. Ingen slutlig
dokumentationscommit eller egen dokumenthash används som självrefererande
bindning. Arkiverade körpaket kräver sin registrerade build och Python-runtime.
Budgetgranskningen `3ab8948` refereras fortsatt separat; den har inte mergats.

[Integrationsrapporten](OPTIONAL-DECISIONS-INTEGRATION-REPORT.md) redovisar
bytekontroll, färsk körning, dokumentkontroller och bevarande.

## Nytt motorstöd i scenario /4

[Det normativa kontraktet](../../../isolated-tests/structural-ce3-explorer/OPTIONAL-DECISIONS-FORMAT.md)
definierar `ce3-scenario-problem/4` och `selected_permutations_once/1`.
Obligatoriska R och valfria O är en exakt disjunkt partition av modellens
1–6 beslut. Grupper består av minst två valfria beslut, är parvis disjunkta
och kräver `exactly_one` eller `at_most_one`. Ogrupperade valfria beslut väljs
oberoende. Varje giltig valmängd får alla permutationer, ett `attempt` per
valt beslut. Urvalslogiken verkställer inga guards, effekter eller kostnader.

`prefix/1` kräver exakt Kmax stigande heltalsslots, där
Kmax=antal obligatoriska + antal ogrupperade valfria + antal grupper.
Ett ord med k beslut använder de första k slotsen. Att utelämna X från
PXU@0/2/4 ger **PU@0/2**, inte P@0,U@4. Tidigareläggningen kan ändra utfallet
kring events och deadlines. Det finns ingen dold WAIT eller oanvänd slotnyckel.

Tom kandidat kräver uttryckligt `allow_empty=true` och att inga obligatoriska
beslut eller exakt-ett-grupper kräver ett val. Scriptet är `steps={}`, men
initiala events, hela horisonten och alla eventbanor körs och auditeras.
Noll försök gör försökskravet sant efter audit, inte målkomponenterna.

`ce3-history-goal/2` har `acceptance_scope=candidate_script`;
`ce3-goal-observation/3` binder urvalsbevis och förväntade entries. Verifieraren
kräver exakt beslut, tid, ordning och position enligt scriptet. Utelämnat
valfritt beslut är inget blockerat försök. Ett valt men blockerat beslut
fäller helhetsmålet. Operativ audit PASS räcker inte för ett urvalsstridigt
script. Hela modellen och fulla outcomes, även för oanvända regler/events,
behålls. Samma fasta script används i samtliga scenarier.

Stödtaken är **720 kandidater och 2160 celler, inklusivt**, före enumeration,
materialisering och output. Polynomkoefficienterna c_k räknar giltiga
valmängder per längd; C=Σ c_k·k! och M=C·antal scenarier. Sex modellbeslut
innebär inte automatiskt stöd: sex helt valfria ger 1957 kandidater med tomt
val och 1956 utan, och avvisas. Sex obligatoriska ger 720 och tillåter högst
tre scenarier. Fem helt valfria med tomt val ger 326. En liten eller noll
körbudget kan inte legitimera en större sökrymd.

## Bevarade garantier och gränser

Terminal, always och reach_by behåller tidigare typstrikta och inklusiva
snapshot-semantik. Scenarier varierar endast fulla externa outcomes.
Robust TRUE kräver samma kandidat positiv i alla deklarerade scenarier och
alla deras eventbanor. Ett certifierat motexempel ger FALSE; övrig ofullständig
evidens ger UNKNOWN. Run-, mål-, kandidat-, scenario-, cell- och eventtäckning
är skilda besked. Replayfel, limits eller saknad bana ger inga delbevis.

Körbudget är skild från stödtaken. /4 startar efter längd, lexikografiskt ord,
sedan deklarerad scenarioordning. Alla kvarvarande försöksposter, även tomma
eller misslyckade, räknas. Sparad enumeration får inte bestämma prefixet.
Verify återhärleder hela domänen, återauditerar och räknar om mål utan att
skriva, köra replay eller lita på result.json. Fullt omhashade ofullständiga
medlemslistor kan inte ersätta domänkontrollen.

Kvarstår: inga fria tidsval, överlappande/operativa urvalsvillkor, adaptiva
policyer, retry/resume, ranking, generell nåbarhetsanalys eller pilotläge.
Stödtaken garanterar inte att eventbanor eller körning ryms inom replaylimits.
Hashar kräver betrodda pins/kod och stabila filer; de är inte signaturer,
verklighetssanning eller attestering av raderade försök och väggklocksordning.
Explorer /1 och scenario /1–/3 behåller sina kontrakt.

**Purpose är fortsatt endast `synthetic_integration_test`.** Ingen ny tillåten
användning införs. Replayprofilens `alternative_plan_search`-begränsning gäller
replaylagret; den separata explorern har den här uttryckligt begränsade sökningen.
Arkitekturförslagets framtida pilotprocess är inte implementerat motorstöd.

## Motor jämfört med onboarding och SR

V2 är rekommenderad motorreferens för framtida översättning och granskning.
Det innebär inte att onboarding kan kompilera /4 eller att SR redan kan
verifiera dess domänsemantik. Onboarding ligger kvar separat på
`codex/ce3-onboarding`, observerad HEAD `27bec92`.

Den befintliga session/2-dokumentationen beskriver versionsbundna underlag,
förslag, granskningsarkiv, kundbekräftelse och överlämning för **separat
kompilering och validering**, med CE3 validation/run fortfarande `not_run`.
Den strukturerade SR-adaptern har pinnad SR-kod, täckning och receipts samt
offlinekontroller med sparade svar. Detta är ingen verifierad /4-kompilator
eller garanti för livegranskningens kvalitet. Gamla onboardingkontrakt och
den äldre replay-only `profile-context.json` har inte migrerats.

En separat bedömning behöver omfatta valbarhet, gruppkrav, prefixets
tidskonsekvenser, tom plan, mål, scenarios, källstöd och purpose. Kundbekräftelse
eller ett komplett SR-kvitto ersätter inte exekverbar validering, audit eller
målbevis. Inga onboarding- eller SR-filer ändras i denna integration.
