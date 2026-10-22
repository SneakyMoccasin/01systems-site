# Valfria beslut och alternativa fasta planer — arkitekturprövning

2026-10-22. **PROCEED WITH BLOCKERS.** Status: **FÖRSLAG, inte infört kontrakt eller pilotgodkännande**.

Utgångspunkt: `85e19b09f5e5b1daca23873efb33b53f533e7388` på
`decision-flow-demo-v1`. Ja: explorern kan undersöka olika delmängder av
modellbesluten genom att producera vanliga fasta `ce3-script/1`, ovanpå
oförändrad replay och audit. Rekommendationen är en liten syntaktisk
urvalsgrammatik med disjunkta valgrupper och **prefix av deklarerade slots**.
Ingen operativ regelmotor, adaptiv policy eller ny replayprofil behövs.

Blockerarna gäller nya sök-/observationskontrakt och deras verifiering, inte
ett konstaterat fel i den granskade huvudbaslinjen. Dagens explorer kan inte
redan köra det föreslagna formatet. Purpose-låsningen ska bestå i denna etapp.
En verklig pilot behöver en separat, uttrycklig antagningsprocess; ett nytt
purpose-värde är inte tillräckligt.

## 1. Baslinje, instruktioner och bevisnivå

Start: exakt ovanstående HEAD, detached HEAD och ren tracked/staged/untracked
status i `/Users/christian/.codex/worktrees/b95c/pulse_engine_clean`.
Den befintliga separata worktreen används på ny gren
`codex/ce3-optional-decisions-architecture`. Huvudcheckouten ligger kvar på
baslinjen; onboarding på `27bec92`, alternativa fixed-slots-implementationen
på `7df45d6` och övriga arbetskopior har inte redigerats eller integrerats.
Git krävde utökad skrivrätt för grenreferensen i det gemensamma `.git`.

Ingen tillämplig `AGENTS.md` hittades i repositoryt eller kontrollerade
föräldrakataloger. README:s låsning av pilotprodukten har lästs. Uppdraget
avser uttryckligen analys och förslag i den isolerade explorerytan. Ingen
onboarding-, SR-, motor-, fixture- eller capability-fil ändras.

Underlag, med företräde för faktisk kod:

- De två ursprungliga lokala auditerna i huvudcheckouten:
  `CE3-PHASE1A-ARCHITECTURE-AUDIT.md` och
  `CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md`. De saknas i denna worktree och
  har endast lästs. SHA-256 är respektive
  `5d34cd2cad2347e35c8c4f157f3cfd6b5de8e3c0e6095de3b1438fb34194e44e` och
  `39167021a841439aee258e6b3501b290fb533ab492d4ef4523a2623bb83f8ef6`.
- [Gemensam motorbaslinje](../../docs/ce3/capabilities/engine-baseline-v1.json)
  och [läsanvisningen](../../docs/ce3/capabilities/README.md) finns från
  repositoryroten under `docs/ce3/capabilities/`.
  De 19 deklarerade kodhasharna har jämförts med faktiska bytes: alla matchar.
- [Explorer](FORMAT.md), [scenario](SCENARIO-FORMAT.md),
  [fixed-slots](FIXED-SLOTS-FORMAT.md), [tidsmål](TEMPORAL-GOALS-FORMAT.md),
  [replay](../structural-ce3-replay/FORMAT.md) och replayprofilen.
- Implementationsrapporterna för explorer, scenario, fixed-slots och tidsmål;
  relevanta fynd/bevis i granskningarna av `5429b52`, `7dab9a0`, `12e777c`
  och `9b705f0`; gziprättningen och budgeträttningen `d24d6d1`.
  Budgetgranskningen lästes via
  `git show 3ab8948:isolated-tests/structural-ce3-explorer/FIXED-SLOTS-R1-INDEPENDENT-REVIEW-d24d6d1.md`.
  Den är bevarad separat, inte integrerad genom denna uppgift.
- Faktisk kod i explorerns nio Pythonfiler, replays schema, codec, replay
  och audit; relevanta kontrakt och gränser i workbench/onboarding lästes.
  Onboardings förslag, bekräftelse och handoff är inte körgodkännande.

De tidigare granskningarnas testresultat är historiska bevis för baslinjen.
Denna rapport redovisar egna avgränsade prober i §9 och §13; den påstår inte
att de 189 tidigare testmetoderna återkörts eller att förslaget implementerats.

## 2. Faktisk ändringsyta och arkitekturgräns

| Led i baslinjen | Faktiskt beteende | Konsekvens för nästa etapp |
|---|---|---|
| `contracts.py:31–75`, `fixed_slots.py:34–46` | Samtliga modellbeslut, en slot per beslut, en attempt var | Ny opt-in-validering behövs; gamla versioner får inte lättas upp |
| `scenario_contracts.py:93–132` | Freeze härleder n! faktoradiskt; generate använder permutationer | Båda måste härleda den nya fulla delmängdsdomänen separat |
| `contracts.py:13–19` | Materialisering zippar slots och order, kopierar hela modellen/källor/outcomes | Zip råkar kunna ge kort script men är inget stödbevis; längd, medlemskap och slotpolicy måste kontrolleras först |
| `scenario_contracts.py:78–91` | Samma script i varje scenariocell; full CE3-validering | Behåll hela modellen även när beslut utelämnas; validera även oanvända regler/utfall |
| `observe.py:35` | Accepterat kräver antal executed = antal `search.decision_ids`, utan blocked | Kan inte användas oförändrat för olika kandidatlängder |
| `temporal_goals.py:50–76` | Läser typade before/after-snapshots, inga transitions | Tidsoperatorernas semantik kan återanvändas oförändrad |
| `scenario_runner.py:120–234` | Återhärleder manifest, kontrollerar pins/build/prefix, återauditerar och omberäknar observation | Nya versioner och kandidatlängd måste nå hela denna kedja |
| `runner.py:105–114` | Kvarvarande försöksevidens måste ligga inom budgetprefixet | Ny exekveringsordning måste definieras och verifieras oberoende av sparad enumeration |
| Replay/audit | Exekverar/verifierar de entries som faktiskt finns i scriptet, även tomt script | Ingen kärnändring behövs; kärnan känner inte till sökfrågans obligatoriska urval |

Fas 1A/1A.2:s separation består: korrekt körning, uppfyllt problem och full
sökning är tre olika bevis. Syntaktisk begränsning av planmängden är tillåten;
att explorern räknar readiness, pengar, effekter eller framtida möjlighet
för att välja bort kandidater är utanför denna etapp.

## 3. Föreslagen första urvalsgrammatik

Följande JSON är ett **kontraktsutkast**, inte indata som dagens validator
accepterar. Alla visade search-fält blir obligatoriska i den föreslagna
versionen, okända fält avvisas. Problemet får inget färdigt script.

```json
{
  "kind": "selected_permutations_once/1",
  "required_decision_ids": ["P"],
  "optional_decision_ids": ["U", "N", "X"],
  "choice_groups": [
    {"id": "delivery_route", "kind": "exactly_one", "members": ["U", "N"]}
  ],
  "slots": [0, 2, 4],
  "slot_policy": "prefix/1",
  "allow_empty": false,
  "mode": "attempt",
  "retry": false,
  "early_stop": false
}
```

Låt U vara modellens alla besluts-ID:n, R den obligatoriska mängden och O den
valfria. R och O måste vara disjunkta, utan dubletter, och deras union exakt U.
Inget oklassificerat beslut och inget dolt excluded-läge tillåts. U omfattar
**1–6 beslut** i första versionen, även om begränsningar skulle göra en större
modell kombinatoriskt liten. Varje ID är en icke-blank sträng och refererar
till ett faktiskt modellbeslut. R eller O får vara tomma.

En vald mängd A är giltig när:

1. R ⊆ A ⊆ U. Varje valt beslut förekommer exakt en gång i kandidatordningen.
2. För varje `exactly_one`-grupp G gäller |A ∩ G| = 1.
3. För varje `at_most_one`-grupp G gäller |A ∩ G| ≤ 1.
4. A får vara tom endast om `allow_empty=true`. Flaggan upphäver aldrig 1–3.

Grupper har exakt `id`, `kind`, `members`. Grupp-ID:n är unika icke-blanka
strängar; kind är exakt ett av värdena ovan. Varje grupp har minst två unika
medlemmar ur O. Grupperna är parvis disjunkta. Överlappande grupper, grupper
med obligatoriska beslut och nästlade grupper avvisas, även om vissa sådana
fall skulle kunna lösas matematiskt. Detta undviker motsägelser, redundanta
tolkningar och ett allmänt constraint-språk. En obligatorisk singleton uttrycks
i R; en valfri singleton i O. O utanför grupper får väljas oberoende.

”Valfritt” betyder individuellt valbart; en medlem i en exakt-ett-grupp är
inte individuellt obligatorisk, men gruppens val är obligatoriskt.
`allow_empty`, `retry` och `early_stop` ska vara faktiska booleska värden,
inte 0/1 eller strängar. Inga implicita standardvärden.

### Urvalskrav är inte operativa förvillkor

R säger ”denna sökfråga omfattar bara planer som försöker P”. Det gör inte P
genomförbart. Exakt ett av U/N säger ”undersök en av dessa vägar per fast
plan”; det säger inte att modellen fysiskt förbjuder båda. Om förbudet är en
verksamhetsregel även för andra scripts måste det uttryckas genom modellens
state/guards och bekräftas separat. Gruppen får inte automatiskt lägga till
en guard eller ta bort en historikrad.

Exempel: U kräver prepared=true. En syntaktiskt giltig kandidat UP ska
fortfarande genereras och replay ska blockera U om P ännu inte genomförts.
Inga `if`, `depends_on`, kostnadsgränser, tidsberoende gruppvillkor,
scenarioetiketter, målutfall eller guardpredikat tillåts i urvalsspråket.
”Om godkännande, välj U, annars N” är en policy och avvisas.

En underkänd urvalsregel är fel kandidat/specifikation, inte
`attempt_blocked`. Ett valt men operativt blockerat beslut är däremot ett
verkligt auditerat försök och fäller accepterade-försök-kravet.

## 4. Slots, utelämning och exakt sökrymd

| Alternativ | Full population för a_k giltiga delmängder av storlek k och m slots | Betydelse och bedömning |
|---|---|---|
| Prefix | Σ a_k k!, k≤m | k beslut använder de första k tiderna. Enkelt, ingen separat tidsvalsdimension. Rekommenderas först |
| Valfri slotdelmängd | Σ a_k binom(m,k) k! | Både urval, ordning och väntan söks. Kan bevara sena tider efter utelämning men ökar population/bevisyta; separat senare grammatik |
| Fast tid per besluts-ID | Antal tillåtna delmängder vid unika tider | Utelämning lämnar andra beslut på deras egna tider. Ingen fri ordningssökning; användbart för färdiga planer, besvarar en annan fråga |
| Explicit planlista | Antal olika deklarerade scripts | Bra för kundens färdiga planer. Full täckning gäller listan, inte alla tillåtna delmängder/ordningar |

För prefixversionen härleds Kmax = |R| + antal ogrupperade valfria beslut
+ antal valgrupper. Kräv **exakt Kmax slots**, strikt stigande heltal inom
[clock.start, clock.horizon]; bool/float/sträng avvisas. Varje slot måste
valideras även om en kort kandidat inte använder den. Horisonten deklareras
separat och får vara senare än sista slot; negativa tider är tillåtna.

Kandidaten är ett ord w över en giltig A, k=|A|. Materialisering:
`steps[str(slots[i])] = [{decision:w[i], mode:"attempt"}]` för i=0..k−1.
Inga tomma listor eller nycklar för resterande slots skrivs. Ett tomt ord
materialiseras exakt till `steps={}`. Scriptets source-text ska vara en
fryst neutral text för just denna nya grammatik och bindas i sökidentiteten.
Ingen omskrivning av gamla versioners syntetiska script-source görs.

**Viktig domänkonsekvens:** från PXU på [0,2,4] ger borttaget X kandidaten
PU på [0,2], inte P@0,U@4. Utelämning är ingen WAIT-instruktion eller tom
reserverad slot. Dessa två planer kan få olika utfall kring ett event eller
en deadline. Prefixsökningen får därför inte kallas ”alla tidsplaceringar”.
Om U måste få ligga kvar vid 4 behövs en uttrycklig färdig plan eller den
senare slotdelmängdsgrammatiken. Skapa inte ett låtsasbeslut för att fylla tid.

Att ett beslut utelämnas betyder att inget försök görs under denna fasta
plan. Det debiteras inte, läggs inte i taken och schemalägger inte sitt event.
Det är inte blockerat, skippat av `if_not_taken`, permanent omöjligt eller
bevisat onödigt. Beslutet och dess regler finns kvar i modellen. Initiala
events fortsätter och full outcomes-bindning krävs också för oanvända events.

### Exakt antal, före materialisering

Sätt r=|R|, f=antal ogrupperade valfria beslut, e=antal exakt-ett-grupper
med storlekar a_i, h=antal högst-ett-grupper med storlekar b_j. Polynom:

```text
P(z) = z^r (1+z)^f × ∏(a_i z) × ∏(1+b_j z)
c_k = koefficienten för z^k i P(z)
C = Σ[k=0..Kmax] c_k k! − (c_0 om allow_empty=false, annars 0)
S = antal deklarerade scenarier, S ≥ 1
M = C × S
```

c_k räknar valmängder, k! ordningar. Olika mängder kan inte ge samma ord;
olika ord ger olika scripts vid strikt stigande tider. 0!=1: tom kandidat
räknas en gång, inte en gång per möjlig stopposition. Scenarielabels med lika
outcomes är fortsatt separata medlemmar. Eventbanor ingår inte i C eller M.

Behåll stödgränserna **C≤720 och M≤2160**, inklusiva. För fem helt valfria
beslut med tom kandidat är C=326; för sex C=1957 och förslaget avvisas.
Sex obligatoriska beslut ger 720 och är fortsatt inom gränsen. ”1–6 beslut”
är alltså nödvändigt men inte tillräckligt för stöd.

Ordning för förkontrollen: strikt form/typer, storleksgräns |U|≤6,
partition/grupper, Kmax och slots/scenariolista, sedan polynom och C/M.
Räkna med små heltal eller mättnad vid gräns+1; skapa inga kandidatord,
fulla input, manifest eller outputkataloger före godkänd storleksgrind.
Scenariogränsen kan kontrolleras med S≤floor(2160/C). Därefter valideras
hela modell-/outcomes-envelope med befintligt schema och samtliga
materialiserade kandidater före körstart. Inga oanvända regler undantas.
En tom tillåten population avvisas som ogiltig specifikation, inte COMPLETE.

## 5. Tom kandidat, accepterade försök och mål

Tillåt tom kandidat genom den uttryckliga flaggan, när R är tom och ingen
exakt-ett-grupp kräver ett val. Det är en meningsfull ”gör inget”-referens.
Den ska köras och auditeras över hela horisonten, i varje scenario och varje
eventordning. Tomt script betyder inte tom historik eller tom banpopulation.

Behåll tidsoperatorernas granskade betydelse: initialt sant räcker för
reach_by, terminal kontrolleras vid horizon och always före/efter varje
övergång från start till och med through. Initial uppfyllelse ger ingen
genväg för audit eller tidigt stopp. En initial uppfyllelse kan senare
förloras; reach_by kan då vara true samtidigt som terminal/always är false.
Pending efter horizon är inget vittne. Olika banor får ha olika reach-vittnen.

För varje kandidat verifieras först att dess **exakta script**, ord, valda
ID:n och tider följer den frysta urvalsgrammatiken. Kontrollera R och varje
grupp igen vid verify; lita inte på sparade `selected_ids` eller på att
generatorn påstår sig ha kontrollerat dem. Därefter, på varje helt auditerad
bana, krävs en bijektion mellan kandidatens k entries och accepterade rader:

- Samma beslut, tid, ordning och script_position som de k förväntade entries.
- Exakt k `decision_executed`, inga `attempt_blocked` eller `script_skip`,
  inga extra försök och inget utelämnat obligatoriskt beslut.
- Hela körningen ingår, också försök efter en tidig måldeadline.

Audit mot det exakt materialiserade inputet styrker redan radkopplingen;
den nya målprojektionen ska binda och redovisa den kandidaten och dess
urvalsbevis. Enbart `len(executed)==k` från en självrapporterad kandidat
räcker inte. Att byta hela problemets beslutslista till valda ID:n för att
återanvända gamla observe är olämpligt: det tappar obligatoriska krav,
gruppkontext och ursprunglig problemidentitet.

För k=0 är försökskravet sant efter full audit: noll föreskrivna försök och
noll blockerade. Det gör inte målkomponenterna automatiskt sanna. För varje
giltig kandidat gäller sedan oförändrad konjunktion av komponenter och
försökskrav, över alla auditerade banor. Ett utelämnat valfritt beslut räknas
inte som ett misslyckat försök. Ett valt valfritt beslut som blockeras fäller
helhetsmålet även om terminaltillståndet är rätt.

Fel i kandidatens urval är fel i population/bindning, inte ett certifierat
NOT_SATISFIED. Certifierad operativ blockering ger NOT_SATISFIED. Saknad
audit, ModelError, limits, korrupt historik eller ofullständiga eventbanor
ger UNKNOWN/null och inga nya komponentbevis. Skilj dessa felklasser även
när ett främmande, urvalsstridigt script i sig skulle passera replayaudit.

## 6. Identiteter, oberoende härledning och körbudget

Återanvänd exakt `core.history.encode/digest`: typbevarad UTF-8 JSON, sorterade
objektnycklar, kompakta separatorer, avslutande LF. Filhashar, gziphashar och
dokumenthashar förblir olika begrepp. Ingen ny JS-kanonisering införs.

Kanonisera den nya grammatiken för sökidentitet genom sorterade R/O,
sorterade gruppmedlemmar och grupper sorterade på unikt grupp-ID. Bevara
slots i stigande tidsordning och kandidatens exekveringsordning. Ingen
Unicode-normalisering, trimning eller semantisk sammanslagning av ID:n.
Problemhashen binder fortsatt den exakta ursprungsdeklarationen; omordnad
set-lista kan ändra problem/cell/pins men inte sökrymd/kandidat/script.
Scenarioordning är fortsatt betydelsebärande för identitet och körprefix.

| Identitet | Föreslagen bindning |
|---|---|
| selection_definition_id | H av versionsmärkt kanoniskt R/O/grupper/allow_empty |
| search_space_id | Ny version; hela kanoniska grammatiken, modell- och sources-ID samt fryst script-source. Mål och outcomes ingår inte |
| plan_id | Oförändrat H({kind:"ce3-plan/1", script:hela scriptet}) |
| candidate_id | Ny typ/version + search_space_id + plan_id; valt urval kan härledas entydigt ur scriptet |
| candidate payload | order, härlett sorterat selected_ids/omitted_ids, script, plan/candidate-ID. Redundanta listor måste kontrolleras mot script, inte användas som auktoritet |
| scenario/cell/manifest | Samma acykliska princip: hela scenariodefinitionen; cell binder problem/kandidat/plan/scenario/outcomes/input; manifest innehåller hela populationen |
| execution/observation/result | Batch binder manifest, build/runtime, limits och budget; projektion binder mål, urvalsdefinition, exakt kandidat/plan/input, historik och färsk audit |

Ändrat gruppkrav eller allow_empty ändrar sökidentitet, även om ett visst
script förblir identiskt. Ändrade slots/horizon ändrar rätt sök-/modell-ID;
ändrat mål ändrar mål/problem/cell/observation men behöver inte ändra plan.
Ändrad delmängd ändrar script/plan/kandidat/input. Samma val med olika ordning
är olika kandidater. Nya körförsök får nya UUID:n; ingen UUID ersätter hash.

### Två populationsalgoritmer, plus ett oberoende facit

Föreslagen produktionsväg: bygg giltiga valmängder genom produkten av
R, varje oberoende optional 0/1 och varje grupps deklarerade val; permutera
varje mängd med `itertools.permutations`. Inga modellregler läses för urvalet.

Förväntansväg i freeze/verify: gå igenom högst 2^6 bitmasker över sorterat U,
kontrollera R och gruppkardinaliteter direkt, avkoda varje godkänd mängds
k! permutationer faktoradiskt. Den får inte importera/anropa generatorns
valmängdsrutin, permutationsfunktion eller dess filter för medlemskap.
Polynomräkningen ger ett tredje antal, inte bara antal i genererat manifest.
Algoritmerna delar betrodd codec, grundvalidering och liten materialiserare;
gemensamma fel där kräver direkta full-input-orakel utan dessa hjälpare.

Verifiera både exakt mängd **och fullständigt innehåll**, utan dubletter,
oväntade kandidater/celler eller olika scripts per scenario. Återhärled hela
domänen från problemet före jämförelse med externa pins. Ett konsekvent
omhashat manifest med ett borttaget urval ska avvisas även med omräknade
lokala pins. Separata betrodda originalpins behövs fortfarande för att
upptäcka en ändrad *problemdeklaration*; ingen verifierare kan härleda
användarens avsikt från ersatt deklaration och ersatt tillitsankare.

Definiera den nya startordningen som **(k stigande, ord lexikografiskt,
scenario i deklarerad ordning)**. Tom kandidat kommer först om tillåten.
Alla ord för en längd sorteras globalt; grupp-/valmängdsiteration får inte
bli dold prefixordning. Denna prioritering är determinism, ingen optimering
eller preferens för korta planer. Omdöpning kan ändra ett budgetprefix.

`max_cells` förblir separat körbudget 0..M, default M. Hela förväntade
populationen och enumeration finns kvar även vid 0; okörda celler är
NOT_RUN/UNKNOWN. Kvarvarande poster under runs, också tomma/failure-only,
räknas som startade försök. Verify återställer ordningen från den oberoende
domänen och kräver antal≤budget och medlemskap inom de första budget cellerna.
Det befintliga sorteringsvillkoret enbart `order` måste uppdateras för nya
versionen; annars kan nya generate och verify välja olika prefix.

Stödgräns och budget får aldrig bytas ut mot varandra: C=1957 får inte tas
in med budget 1 eller 0. Ett stött problem kan ändå överskrida replay-limits
(10000 banor, 1000000 arbetsrader, 10000 steg som nuvarande default) eller
60 sekunders processtimeout. Detta ger ofullständig evidens, ingen mindre
sökrymd. Supportcap är inget löfte om exekveringstid; eventbanorna kan växa
oberoende av kandidatantalet. Retry/resume, pruning och early-stop införs inte.

Behåll kandidat-/scenarioprojektion, full celltäckning och eventbanetäckning
separata. Fulla projektioner räcker inte för full korsning. Budgetstridig
batch är INVALID även om vissa cellmål är korrekt certifierade. Helt raderad
försöksevidens eller verklig väggklocksordning attesteras fortfarande inte.

## 7. Samma fasta kandidat och bakåtkompatibilitet

En kandidat väljer A, ordning och tider **före** scenariokorsning. Samma
fulla scriptbytes, modell, initialläge, källor, clock och mål gäller i alla
scenarier. Endast fulla externa outcomes varierar. Ingen filtrering efter
utfall, fallback från U till N eller tillägg av ett försök efter en blockering.
Valda försök sker även när scenariots guards blockerar dem.

Robust fast lösning betyder `∃ kandidat ∀ scenarier ∀ eventbanor: mål`.
Det skiljer sig från `∀ scenarier ∃ kandidat`: den senare kan redovisa olika
vittnesplaner men är ingen gemensam plan eller genomförbar adaptiv policy.
Robust TRUE kräver alla deklarerade celler certifierade och positiva; FALSE
kräver minst en certifierad negativ cell; annars UNKNOWN. Ett motexempel
krymper inte populationen. Olika kandidater kan ge olika antal eventbanor;
para dem inte efter path_index och använd inte antal som sannolikhet.

Föreslagna explicita versioner (namn att frysa i nästa kontraktsetapp):

| Yta | Förslag |
|---|---|
| Problem och yttre cell/manifest/pins/execution/attempt/run/observation/result | `ce3-scenario-…/4` |
| Sökgrammatik | `selected_permutations_once/1`, endast prefix/1 |
| Sökrymd och kandidat | `ce3-scenario-search-space/3`, `ce3-scenario-candidate/3` |
| Urvalsdefinition | `ce3-selection-definition/1` |
| Måldefinition | `ce3-history-goal/2`: samma komponenter/sampling som /1, med obligatoriskt `acceptance_scope:"candidate_script"` och `all_attempts_accepted:true` |
| Målprojektion | `ce3-goal-observation/3`, explicit kandidat- och urvalsbevis |
| Oförändrat | fixed-replay/0.1; CE3 run/model/script/history /1; plan/execution/auditkvitto/runtime/build; scenario-set/space/scenario /1 |

Versionssteget för mål/observation gör kandidatrelativt försökskrav explicit;
det ändrar inte terminal/always/reach_by eller inklusiv snapshot-sampling.
Den första nya problemversionen behöver bara detta tidsmålskontrakt;
terminal-only uttrycks som en terminalkomponent. Ingen ny måloperator behövs.
Versionsdispatch bör vara uttrycklig per protokoll, inte anta att alla
suffix automatiskt följer problemets version.

Explorer /1 och scenario /1–/3 fortsätter kräva alla modellbeslut och sina
gamla slots/mål. Nya urvalsfält ska avvisas där. Befintliga golden manifests,
pins och målfacit skrivs inte om. En ny deklaration med alla beslut i R,
inga grupper och n slots har samma n! operativa scripts som /2–/3, bortsett
från den nya dokumentära script-source-texten och nya omslagsidentiteter.
Dess materiella historiker och motsvarande mål ska matcha, inte nödvändigtvis
input-/history-hashar. Gammal script-source och gamla ID-definitioner förblir
oförändrade. Arkiverade paket kräver sin registrerade build/runtime.

Regression ska bevara PQX/PXQ/XPQ i originalet, PXQ robust i scenario-/1,
de fem robusta fixed-slots-ordningarna PXQT/PXTQ/PTXQ/TPXQ/TXPQ och det
granskade tidsmålexemplets komponenter [true,false,true,true,false] med
samlat false trots accepterade försök. Den nya grammatiken får inte förändra
redan granskade frågor eller tyst omtolka gamla mål.

## 8. Blockerare och minsta implementationsetapp

| Blockerare före godkänd leverans | Minsta stängningsbevis |
|---|---|
| B1: Urval och utelämning saknar exekverbart kontrakt | Frys §3–5; strikt opt-in-validator, partition/disjunkta grupper, slots och tom kandidat; negativa typ-/referens-/överlapptest |
| B2: Dagens n!-orakel beskriver fel population | Separata valprodukt/permutations- och bitmask/faktoradiska vägar, polynomantal, literal-mängder och omhashat bortfall/dublett/extra medlem |
| B3: Dagens försökskrav jämför mot alla modellbeslut | Kandidatbunden projektion och direkt scriptmatchning; utelämnad optional tillåts, vald blockerad optional fäller, saknad required/gruppmedlem avvisas |
| B4: Nya identiteter och budgetprefix måste slutas | Versions- och mutationsprov för urval/slots/empty/mål, rätt antal men fel prefix, 0-budget, misslyckade försök, extern pins och read-only verify |
| B5: Scope och gamla garantier måste bevaras | Samma script över scenarier, fulla unused outcomes, alla eventbanor, negativa/okända resultat, gamla mål-/gzip-/budgetregressioner och bytekontroll av replay/audit |

Minsta leverans är en enda isolerad syntetisk vertikal: ny urvalsmodul,
versionsgrindar i contracts/scenario_contracts, kandidatbunden målobservation,
anpassad startordning i scenario_runner, nya formatdokument och små fixtures/
tester. Återanvänd befintlig CLI replay/audit, codec och resursstatusar.
Ingen kärnrefaktorering, solver, inkrementell state search, onboarding,
SR-koppling, UI, pilotläge, integration eller ranking behövs.

Skriv facit först, implementera därefter och låt en separat granskning
försöka falsifiera full population och målbevis. Relevanta existerande
regressioner ska köras i det framtida implementationsuppdraget. Att denna
rapport rekommenderar vägen är inte att B1–B5 redan är stängda.

## 9. Litet syntetiskt acceptansproblem och oberoende facit

Detta är samma grammatikkonfiguration som §3: R={P}, O={U,N,X}, exakt ett
av U/N, X fritt. Start=0, horizon=5, slots=[0,2,4], enhetssteg och events
före beslut. Inga kostnader, budgetkonto eller beslutsschemalagda events.
Booleska fält prepared/done/aux_done initialt false, safe initialt true.
response är enum waiting/approved/rejected, initialt waiting.

| Regel | Förvillkor | Effekt |
|---|---|---|
| P, förbered | Inga | prepared=true |
| U, uppgradering | prepared=true och response=approved | done=true |
| N, nyanskaffning | prepared=true | done=true |
| X, valfri efterkontroll | done=true | aux_done=true |
| response, initialt external-event vid 1, scheduled_at=0 | Inga | approved/rejected sätter motsvarande response; absent sätter waiting |

response-eventet är den enda eventdefinitionen och hela referensordningen.
Varje scenario binder det uttryckligen till approved, rejected respektive
absent. Absent har explicit waiting-roll, ingen senare schemaläggning och
inga andra effekter. Varje effekt har tom add-map; varje beslut schedule=null,
cost=0. Övriga documentary-fält anger syntetiska antaganden och tidsbas,
deadlines=[] och sources={}. Ingen business-sanning påstås.

Målet är terminal(done=true), reach_by(done=true, deadline=2),
always(safe=true, through=5), samt alla **valda** försök accepterade på alla
eventbanor. aux_done är avsiktligt inget hårt mål: X får utelämnas.

Handhärledning: P(z)=z·(2z)·(1+z)=2z²+2z³. C=2·2!+2·3!=16,
M=16·3=48. För varje leveransväg finns två korta ordningar och sex långa.
P måste föregå leveransbeslutet. Ett valt X måste dessutom komma efter
leveransen för att accepteras. U fungerar endast vid approved; N i alla
tre scenarier. Därmed är hela målmatrisen:

| Kandidatord, prefixslots | approved | rejected | absent | Robust |
|---|---|---|---|---|
| PU | true | false | false | FALSE |
| UP | false | false | false | FALSE |
| PN | true | true | true | TRUE |
| NP | false | false | false | FALSE |
| PUX | true | false | false | FALSE |
| PXU | false | false | false | FALSE |
| UPX | false | false | false | FALSE |
| UXP | false | false | false | FALSE |
| XPU | false | false | false | FALSE |
| XUP | false | false | false | FALSE |
| PNX | true | true | true | TRUE |
| PXN | false | false | false | FALSE |
| NPX | false | false | false | FALSE |
| NXP | false | false | false | FALSE |
| XPN | false | false | false | FALSE |
| XNP | false | false | false | FALSE |

Tabellen är en literal medlemslista, inte körordningen. Ny körordning enligt
§6 börjar NP, PN, PU, UP, sedan längd tre i lexikal ordning. Det finns
**8 positiva celler och exakt PN/PNX som robusta kandidater**. Alla 48 ska
vara korrekt auditerbara, med en eventbana per cell. Det är ingen optimering:
PNX kan inte väljas framför PN utan ett separat, uttalat värdekriterium.

Faktiskt prövat här: de 16 bokstavligt listade scriptsen materialiserades
direkt i en temporär analysprob, utan explorerns kandidat-/materialiserings-
hjälpare. 48 vanliga CLI-replays och 48 separata CLI-audits gav exit 0,
PASS och 48 banor. Radernas accepterade försök och befintliga rena
tidskomponentprojektion jämfördes med ovanstående i förväg angivna positiva
mängder. Alla 8 målträffar stämde. **Ingen ny explorer, urvalsvalidator,
manifestverifierare eller certifierande målprojektion har implementerats.**
Detta prövar kärnans återanvändbarhet och acceptansproblemets facit.

Ytterligare handhärledda acceptansfall för kommande implementation:

- Byt gruppen till högst ett: P(z)=z(1+2z)(1+z)=z+3z²+2z³,
  C=1+6+12=19, M=57. Nya ord P/PX/XP missar done; positiva mängden är
  fortfarande samma 8 celler. Dessa tre nya körningar per scenario är
  förväntningar, inte körresultat i denna rapport.
- Gör P också valfritt och gruppen högst ett: P(z)=(1+z)²(1+2z),
  C=27 med empty, 26 utan. Kontrollerar både tom kandidat och allow_empty-ID.
- Tomt script med initial done=true och event vid 1 som sätter done=false:
  reach_by(2)=true med vittne 0.before, terminal=false. Ett extra always(done)
  ska vara false. Full audit krävs även för det initiala vittnet.
- Ett utelämnat beslut som skulle schemalägga ett external-event skapar
  ingen köpost, men dess fulla outcomes-bindning och regelvalidering kvarstår.
- Exakt-ett med noll/två val, saknad P, överlappande grupper, extra ID,
  dublettförsök och tom kandidat med required ska avvisas syntaktiskt.
- Två samtidiga ordningskänsliga events: en positiv referensbana räcker inte;
  borttagen negativ bana och omhashad observation måste ge UNKNOWN/avvisning.
- Gränser: C=720/M=2160 godtas; C=1957, M>2160 och |U|>6 avvisas före
  materialisering även vid budget 0. Disable/spies ska skydda båda
  enumerationsvägarna; direkt helt input-orakel skyddar delad materialisering.
- Ta bort hel valmängd och alla dess celler, håll antal med dubletter,
  omhasha allt, byt scenario-script eller använd fel budgetprefix: ingen
  full sökning får godkännas. Verify ska vara skrivskyddad och utan replay.

Den tomma scriptvarianten prövades också i minne med befintlig replay och
oberoende audit: PASS, försökskrav true, komponenterna terminal(done),
reach_by(done), always(safe) = [false,true,true], vittne 0.before. Ingen
tom/partiell historik accepterades som bevis.

## 10. Separat inventering av purpose-låsningen

| Plats | Vad den faktiskt upprätthåller |
|---|---|
| `contracts.py:36–40` | purpose är obligatoriskt och exakt `synthetic_integration_test`; annan sträng avvisas med ”Only technical integration scope supported” |
| `contracts.validate_problem` | Originalexplorerns /1-ingång anropar samma deklarationsgrind |
| `scenario_contracts.py:18–45` | effective_problem behåller purpose; varje scenario i /1–/3 går genom samma grind |
| freeze/run/verify i båda runners | freeze validerar; run och verify går via verify_frozen som återhärleder/validerar. Purpose binds av full problemhash, manifest/pins och deras kedjor |
| `contracts.SCRIPT_SOURCE`, fixtures, FORMAT och README | Syntetisk märkning i script/körunderlag och dokumenterad användningsgräns |
| `runner.py:187`, `scenario_runner.py:234` | Resultatens interpretation avgränsar påståenden; scenarioresultatet säger frozen_scenario_set_only_not_probability_or_customer_value |
| capability-baslinjens purpose-avsnitt | Dokumenterar faktiskt stöd; är inte en extra exekverbar grind |
| Replay `core/schema.py:64–72`, CLI och workbench `run_input` | Inget purpose-fält i `ce3-run/1`; extra fält avvisas. Dessa generella körvägar utför inte explorerns purpose-kontroll |

Fyra faktiska prober validerade baseline-fixturerna och ändrade därefter
enbart purpose till `bounded_real_pilot`: explorer /1 och scenario /1, /2,
/3 avvisade samtliga med ovanstående meddelande. Namnet är bara en negativ
teststräng, inget infört pilotvärde. Befintlig låsning har inte ändrats.

Låsningen är en **format-/användningsgräns vid explorer-ingångarna**, inte
en säkerhetsmekanism som kan avgöra om en modell beskriver en kund. Den
kontrollerar inte källbytes, fakta, domänsamband, bekräftelse, risknivå eller
modellens relevans. Ett kundfall som etiketteras syntetiskt skulle inte
upptäckas semantiskt; det vore ändå ett missvisande användande av kontraktet.
En intern hjälpfunktion är inte en godkänd pilot-ingång för att den saknar
egen purpose-kontroll. Ingen kringgång rekommenderas.

Att fristående replay inte har samma spärr är förenligt med dess generella
uppgift: verifiera konsekvenser av ett givet input. Det betyder inte att
hela produkten, onboarding eller modellen redan är pilotgodkänd.

## 11. Minsta konkreta väg till en avgränsad verklig pilot

Detta är ett separat framtida beslut. Piloten behöver inte vänta på en
generell AI-kompilator eller full produktifiering. Den behöver en begriplig,
fryst analysfråga och en granskad översättning till stödd modellsemantik.

### Nödvändiga korrekthetskrav

1. **Avgränsa ett fall och dess användning.** Namnge kund-/domänansvarig,
   analysfråga, tidsenhet, start/horizon, vilka beslut som faktiskt kan
   styras, externa utfall, mål och vad resultatet ska stödja. Bekräfta vad
   som lämnas utanför, exempelvis fortsatt drift eller fysisk kapacitet.
   En modellerad start får inte presenteras som verifierad produktion.
2. **Godkänn den konkreta modellen.** För varje initialvärde, guard,
   kostnad, effekt, delay, outcome/absent och mål behövs källstöd eller
   tydligt märkt antagande samt en granskad mapping. Kundens ja bekräftar
   avsikt/antaganden; domänansvarig bedömer om förenklingen är meningsfull.
   Små handhärledda positiva och negativa fall ska jämföras med faktisk
   replay/audit. Ostödda funktioner får inte approximeras i tysthet.
3. **Hantera olösta frågor före frysning.** Saknad relevant fakta eller
   modellrelation blockerar beroende slutsatser. Ett uttryckligt hypotetiskt
   värde kan accepteras som antagande, aldrig ommärkas till fakta. Framtida
   outcome kan täckas i namngivna scenarier när konsekvenserna är modellerade.
   Osäker due/delay/initialbudget är modellvariation, inte outcomes-only:
   håll separata frysta modeller och begränsa jämförelserna. Olösta
   preferenser blockerar ranking; oklart hårt mål blockerar målfrågan.
4. **Bind godkännandet till fryst innehåll.** Källor, mapping, antaganden,
   öppna frågor, mål, scenario-/plan-/sökrymd och bekräftelser ska vara
   versionsbundna före körning enligt nästa avsnitt. Ändring kräver ny
   snapshot och relevant ny granskning/bekräftelse, inte omhashning av gammalt
   godkännande. Separat bevarade pins och registrerad build/runtime krävs.
5. **Separera resultatens anspråk.** Rapportera input/model identity,
   run/audit, mål per bana/cell, population/täckning och okänt. Endast full
   verifierad domän får ge ”ingen plan inom denna grammatik klarar målet”.
   Ingen sannolikhet, global omöjlighet, optimering eller verklighetsgaranti
   följer. Pilotgodkännande och teknisk certifiering ska ha skilda statusar.

### Ett litet yttre pilotpaket, inte en ny motor

Föreslaget `ce3-pilot-case/1` är ett separat framtida manifest, inte ett
fält i replay och inte en ändring av onboarding/SR. Minsta innehåll:

| Artefakt | Innehåll som binds |
|---|---|
| Evidence manifest | Käll-ID/version, faktisk originalfilhash, text-/extraktionshash och status, lokaliserbara relevanta spann; svar och granskningsunderlag bevaras |
| Modell-/mapping snapshot | Hela CE3-modellen, sources, mål och tidsram; per modellfält/regeldel koppling till claim/källa/antagande, översättarversion och reviewer |
| Assumptions/issues | ID, typ, berörda refs, fråga, ansvarig, påverkan på slutsats, resolution/explicit antagande/avgränsning och motivering |
| Analysis snapshot | Färdig planlista eller explorergrammatik, full scenario-set, måldefinition, scope och stödd profil/build |
| Confirmation/review receipts | Vem, roll, när, begripligt visat innehåll och exakt digest av ovanstående snapshot, hanterade fynd och kvarstående begränsningar |
| Run binding/result | Pilotmanifest-ID till trusted input/plan eller explorer problem/manifest/pins och batch-spec, runtime/build/limits; tillbaka från result/cell till audit/history/evidens |

Undvik cirkulära hashvärden: frys först evidence/model/analysis/issue-snapshot,
låt bekräftelsekvittot referera dess digest och låt slutligt pilotmanifest
binda snapshot + kvitton. Körspecifikationen binder pilotmanifestet; resultat
refererar körspecifikationen. Lägg inte resultat eller en bekräftelse som
hashar sig själv i snapshoten. Onboardings befintliga hashdomän är en annan
än Python-JSON-LF; använd typade opaka referenser, inte omtolkade digest.

Maskinell paketkontroll ska kontrollera faktisk tillgång till källbytes och
hashar, alla referenser, fälttäckning, exakt aktuell bekräftelse, olösta
blockerare, stödd profil, fulla input, separata pins och resultatbindningar.
Det intygar att godkännandet avser körningen, inte att ett källpåstående är
sant eller en granskningsmotivering god. Om en fråga begränsas för att undvika
en modellucka måste den nya omfattningen bekräftas; en blockerande lucka kan
inte bara byta status till accepterad begränsning.

### Conciergepilot: manuellt respektive kod

| Arbete | Minsta rimliga hantering |
|---|---|
| Intervju, källäsning, modellutkast, klassificering av fakta/antaganden, domängranskning | Manuellt, med sparade underlag och namngivet ansvar; inget krav på AI/OCR/SR-automation |
| Översättning till CE3 och små kontrollfall | Manuellt handbyggd modell/input med dokumenterad mapping och separat granskning; schema/replay/audit körs maskinellt |
| Modellbekräftelse och accepterade avgränsningar | Manuellt protokoll som pekar på exakta snapshot-hashar; autenticitet följer pilotens överenskomna hantering, hash ensam identifierar ingen person |
| Frysning, länkkontroller, stale-kontroll, resultatsammanställning | En liten lokal verifierare/CLI behövs om detta ska ges maskinellt pilotgodkännande. Kan först drivas som granskad manuell procedur med befintliga hash-/auditverktyg, men får då märkas manuellt granskat |
| Explorer i verklig pilot | Kräver kod för uttrycklig opt-in-ingång/versionskontrakt, kontroll av pilotpaket och bindning till freeze/run/verify/resultat; syntetisk purpose får inte återetiketteras till pilotbevis |
| Lagring och åtkomst | Avtalad lokal, stabil lagring och separat ankare kan räcka för en bemannad pilot; bevara körpaket och exakt runtime/build för återläsning |

Det nödvändiga nya kodarbetet för ett maskinellt avgränsat pilotläge är
alltså ett tunt antagnings-/bindningslager och testning av dess avvisningar,
inte en ändrad transition engine. Inför aldrig ett nytt purpose-värde utan
denna kedja och uttrycklig granskning. Den syntetiska ingången och dess
historiska paket ska fortsätta ha sin nuvarande betydelse.

Följande är framtida förbättringar, inte generella förkrav för en enda
conciergepilot: generell AI-kompilator, automatisk SR-integration, självservice,
domänpaketsmarknad, webb-UI, molndrift, automatisk OCR, optimering, distribuerad
körkö, resume/retry, signering eller processattestation. Om pilotens faktiska
hotbild/användning kräver någon sådan kontroll måste den tas särskilt; bygg
inte allt på förhand och kalla inte manuell hantering maskinellt verifierad.

### Kundens färdiga planer jämfört med explorer

**Färdiga planer:** börja helst här om kunden redan har en eller två planer.
Spela upp deras exakta beslut, delmängder och tider genom befintlig replay.
Replay tillåter delmängder och tomma steg utan ny explorergrammatik. Frys
planerna före scenariokörning. Den manuella pilotprocessen kan godkänna
modell och underlag utan en purpose-ändring i replay, eftersom fältet inte
finns där. Ett sammanlagt scenario-/målbesked behöver ändå definierad
observation och verifierad explicit cellista; workbench eller en vanlig
audit ger inte automatiskt explorerns fulla beviskedja. Använd inte den
syntetiska exploreringången som en obemärkt pilotwrapper.

**Explorer:** kunden behöver dessutom bekräfta beslutens valbarhet,
gruppkrav, slots, prefixbetydelse, tom kandidat och den fullständiga sökfrågan.
Kod måste verifiera hela den härledda populationen och varje kandidats
urval. ”Ingen av kundens två planer lyckas” kräver bara rätt tvåplansbevis;
”ingen plan inom denna sökrymd lyckas” kräver full explorertäckning. Ingen
av formuleringarna betyder att ingen annan verklig lösning finns.

Valfria beslut behöver därför inte vara blockerare för en första pilot som
enbart granskar färdiga kundplaner. Explorerpiloten kräver både §8:s
syntetiska leveransbevis och det separata pilotlagrets antagningsbevis.

## 12. Vad ska bekräftas och vad kan verifieras?

| Fråga | Användare/domänansvarig | Maskinell verifiering |
|---|---|---|
| Är P obligatoriskt, U/N alternativ och X valfritt? | Avsikt, verklig kontroll och rätt slags exklusivitet | Partition, referenser, disjunkthet, kardinalitet och scriptmedlemskap |
| Är prefix rätt när ett beslut utelämnas? | Tidsbetydelse, om andra försök får tidigareläggas, tillåtna slots | Exakta tider, k-prefix, typer och clock-bounds |
| Är gör-inget en tillåten plan? | Analysens avsikt och eventuell handlingsplikt | allow_empty, required/gruppkrav och full replay även för k=0 |
| Är modellens regler rimliga och källstödda? | Källrelevans, enheter, kausal innebörd, förenklingar | Källhashar/mapping, strikta typer, profil, oberoende audit av konsekvenser |
| Är mål/scenarier tillräckliga för frågan? | Verksamhetsbetydelse, antaganden, uteblivet besked och avgränsning | Fryst definition, fulla outcomes, all-path-projektion och deklarerad korsning |
| Är bekräftelsen aktuell? | Verkligt godkännande av visad version | Digest-/referenslikhet och avvisning av stale underlag |
| Är en negativ slutsats täckande? | Godtar scope, inget anspråk utanför det | Full urvals-/cell-/eventtäckning, inga UNKNOWN; rätt budgetprefix |

Bekräftelserna är krav inför användning av det framtida kontraktet eller ett
verkligt fall, inte frågor som hindrar denna analysleverans. Maskinen kan
verifiera att ett domänbeslut följts; den kan inte själv godkänna dess
verklighetsinnehåll.

## 13. Utförd kontroll och bevarande

Analysproben finns tillfälligt i
`/private/tmp/ce3-selection-architecture-probe.py`; körning med
`python3 -B /private/tmp/ce3-selection-architecture-probe.py` från denna
repositoryrot skapar en ny temporär katalog. Den utför endast befintlig
replay/audit på bokstavliga syntetiska scripts och kontraktsprober, ingen
ny sökfunktion. De observerade artefakterna finns i
`/private/tmp/ce3-selection-probe-6uudb7_e/summary.json` med underkataloger för
48 input/historik/audit-par. Temporärfilernas tillgänglighet är inget
långsiktigt kontrakt; §9 anger hela modellreglerna och oberoende facit.

Utfört: 19 kodhashar mot baseline, fyra positiva baseline-valideringar och
fyra purpose-avvisningar, 48 CLI replay/audit-par, den tomma scriptproben,
matematisk populationshärledning och dokument-/diffkontroller. Ingen full
regressionssvit, webbbuild, onboarding- eller SR-test har körts. Ingen
granskning av en ny urvalsimplementation påstås.

Startinventeringen `/private/tmp/ce3-selection-architecture-before.json`
innehåller hash för 2208 befintliga spårade/icke-ignorerade filer i denna
worktree, originalauditerna samt branchreferenser. Slutjämförelsen visar att
samtliga 2208 befintliga filer och båda originalauditerna är byteidentiska.
Alla branchreferenser var oförändrade före rapportcommitten. Endast denna
förslagsrapport committas på den nya arbetsgrenen.
Kontrollen av andra arbetskopior är läsande och deras refs bevaras; ingen
full byteinventering av deras ignorerade/lokala filer påstås. Ingen
implementation, integration, purpose-ändring eller push ingår.
