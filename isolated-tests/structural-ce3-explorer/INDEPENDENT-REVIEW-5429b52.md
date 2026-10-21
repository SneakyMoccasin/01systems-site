# Oberoende granskning av första CE3-explorern

Datum: 2026-10-21. **Verdict: PASS WITH LIMITATIONS.**

Granskad commit och start-HEAD: `5429b52a007372e90f7bea1f1f8690402c1d1302`.
Bedömningen gäller endast `ce3-explorer-problem/1`: tre beslut, ett försök per
beslut i slots 0/1/2, fasta scripts, timer-events och ett terminalmål över alla
eventbanor. Den är inte ett godkännande av scenariokorsning eller bevis för
kundnytta, optimalitet, generell nåbarhet eller generell problemlösning.

Inga falska COMPLETE, CERTIFIED eller SATISFIED hittades genom de redovisade
falsifieringsförsöken. Ett faktiskt fel i hanteringen av trasiga artefakter
hittades: trunkerad gzip avbryter hela verifieraren med ett ohanterat undantag.
Det blockerar certifiering, men bryter den avsedda felisoleringen och den
strukturerade redovisningen av okända kandidater. Därför inget reservationslöst
PASS. Ingen implementationskod har rättats.

## Underlag och bevarande

Lästa underlag:

- Repositoryrots `README.md`, inklusive förbud mot refaktorering och nya
  produktfunktioner. Ingen tillämplig `AGENTS.md` hittades i föräldrakatalogerna,
  repositoryts spårade filer eller under `isolated-tests`.
- Båda auditfilerna, lokaliserade i repositoryroten:
  `CE3-PHASE1A-ARCHITECTURE-AUDIT.md` och
  `CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md`.
- Alla 15 tillkomna filer i `5429b52`, inklusive implementationsrapporten,
  samtliga fixtures och de två ursprungliga testfilerna.
- Befintlig replays `FORMAT.md`, `core/profile.json`, `cli.py`, `core/history.py`,
  `core/schema.py`, `core/replay.py`, `core/transitions.py`,
  `core/expressions.py` och `audit/verify.py`.

Gitstatus visade inga ändrade spårade filer eller staged ändringar vid start,
men många befintliga ospårade filer, inklusive auditerna och Apollo. Dessa
ingår inte i granskningscommitten. Ett SHA-256-manifest över **2 419 befintliga
spårade och ospårade, icke-ignorerade filer** kontrollerades efter körningarna:
ingen befintlig fil ändrad eller borttagen. Ignorerade filer och gitmetadata
ingår inte i detta påstående.

Startmanifestet ligger lokalt i
`/var/folders/0l/s0c1v52x4b123xmtw3vtv6t00000gn/T/ce3-independent-review-v015qd7i/before.json`;
dess filhash är `a3ed59b4ebe97e27ee16f4ebfba29ac3c3f2275fa3c28f30856e52b3a8b983ee`.
Gitdiff från föregångaren till `5429b52` innehåller endast nya explorerfiler;
diffen för hela `structural-ce3-replay` är tom. Testet av backendfilernas frysta
bytehashar passerade också. Varken replaykod eller replaysemantik har ändrats
av den granskade committen.

## Fynd, efter allvarlighetsgrad

### R1 — P2: trunkerad gzip avbryter verifieringen för hela sökningen

**Plats:** `runner.py:145`, undantagsgränsen `runner.py:160` och CLI-gränsen
`runner.py:213`. Samma läsfel kan uppstå vid `runner.py:85–86`; körgränsen
`runner.py:98` fångar inte heller `EOFError`.
Läsaren `../structural-ce3-replay/core/history.py:36` anropar `gzip.decompress`.

**Reproduktion:** kopiera en komplett sexkandidatskörning till en ny katalog.
Ta bort sista åtta bytes från första kandidatens `history.json.gz`. Kör
`runner.py verify --output <kopian>`. Detta genomfördes i
`/tmp/ce3-review-5429b52-truncated`, kopierad från den nya acceptanskörningen.

**Förväntat:** kandidaten blir UNVERIFIED med UNKNOWN/null; sökningen blir
INCOMPLETE och övriga kandidaters status kan fortfarande redovisas.

**Faktiskt:** `EOFError: Compressed file ended before the end-of-stream marker
was reached` lämnar `verify` via rad 145. CLI ger exitkod 1, traceback på stderr
och tom stdout. Inget nytt verifieringsresultat returneras. Den redan sparade
`result.json` ligger kvar, men är enligt kontraktet ingen verifieringsauktoritet.

**Påverkad garanti:** robust felisolering och maskinläsbar redovisning av
ofullständiga sökningar. Felet ger **inte** ett falskt COMPLETE eller ett
verksamhetsmässigt NOT_SATISFIED. Det grundläggande kravet att trasiga artefakter
ska förhindra verifierad framgång håller i denna reproduktion.

**Granskningstester:**
`review_tests/test_independent_review.py:282` anger det önskade beteendet som
`expectedFailure`; `:289` verifierar separat det faktiska CLI-beteendet.
Den förväntade testavvikelsen är ett öppet fel, inte ett passerat acceptanskrav.

**Nödvändig rättning före scenariokorsning:** hantera de relevanta
dekomprimeringsfelen vid explorerns artefaktgräns och behåll kandidatens
UNKNOWN-status samt fortsatt granskning av andra kandidater. Testa trunkering
och andra korrupta komprimerade strömmar. Detta kan göras i omslaget utan att
ändra fryst replaysemantik. Ingen sådan rättning ingår här.

Inga P0/P1-fynd eller andra bekräftade korrekthetsfel identifierades. Följande
avgränsningar är dokumenterade kontraktsvillkor, inte dolda produktfel.

## Oberoende och arkitektur

| Led | Kontroll och bedömning |
|---|---|
| Kandidatgenerering | `enumerate_scripts.py:6–9` permuterar deklarerade ID:n; `contracts.py:11–17` materialiserar scripts. Ingen guardutvärdering, kostnadsdebitering, eventhantering, pruning eller tillståndsövergång finns här. Modellvalidering via befintligt schema är inte replay. |
| Exekvering | `runner.py:45–48,75–82` startar befintlig CLI replay och separat CLI audit för varje kandidat. Ursprungstestets call-spy observerar `[replay,audit] × 6`. Ingen TypeScript-motor eller alternativ exekveringsväg används. |
| Audit | Befintlig `audit/verify.py:41–202` rekonstruerar övergångar, ledger och hela eventpermutationsträdet. Den importerar schema/codec, inga runtimepredikat eller transitions. Importgränsens regressionstest passerar. |
| Mål | `observe.py:16–47` läser auditerade rader, jämför terminalvärden och räknar executed/blocked. Den verkställer inga modellregler. `audit_receipt` återauditerar samma bundle mot förväntat input. Målutfallet är en separat härledning, inte ett fält som befintlig motoraudit certifierar. |
| Sökrymd | `contracts.py:74–95` bygger alla längd-3-ord över tre ID:n och filtrerar all-different. Det är en annan uppräkningsalgoritm än generatorns permutationer. `runner.verify` kör denna kontroll innan medlems- eller resultatkontroll. |
| Medlemskap | `contracts.py:98–118` kontrollerar kandidatinnehåll och exakt mängd mot manifestet. Funktionen ensam bevisar bara fullständighet relativt det givna manifestet. |

Ingen implementation känner till den vinnande mängden `{PQX,PXQ,XPQ}`.
P/Q/X, ready/done och förväntade målutfall finns i fixtures och tester;
produktionskodens observationer läser namngivna målfält ur problemet. Ändrade
ID:n, guards och mål verifierades mot nya handhärledda svar, se testmatrisen.

Oberoendet är inte absolut: generator och manifestverifierare delar
`member`, `materialize`, schema och codec. En gemensam framtida
materialiseringsbugg kan därför undgå deras inbördes jämförelse. Nuvarande
materialisering granskades rad för rad och testades separat mot direkta
slot/decision/mode-payloads utan att använda dessa hjälpfunktioner som oracle.
Det är ett granskat litet program, inte ett maskinellt bevis mot godtyckliga
gemensamma implementationfel. För scenariokorsning behövs motsvarande
oberoende cell- och input-orakel.

`observe` är inte en fristående problem-/sökverifierare: den förutsätter den
validerade kedjan i `runner`. Kopplingen mellan script och problemets
slotgrammatik kontrolleras av `runner.py:139–144`. Framtida anropare får inte
hoppa över den grinden och tolka en lös observationsfunktion som full certifiering.

## Söktäckning utan cirkelbevis

För tre unika ID:n och tre fasta slots är den deklarerade mängden exakt
3! = 6 ordningar. Den härleds ur problemkontraktet, inte ur lyckade körningar,
resultatantal eller tillgängliga beslut. Även blockerade kandidater ingår.

Det riktade bortfallstestet tog bort **XPQ** ur manifest, enumeration, runkatalog
och resultatsammanfattning. Testet uppdaterade också manifesthashen i pins,
sökspecifikationen, started/record och resultathashen. De fem återstående
runartefakterna är fortfarande de korrekta artefakterna för respektive medlem.

- `check_coverage(femmanifest, femkandidater)` gav **COMPLETE**. Det är korrekt
  enbart relativt femmanifestet och får inte användas som sökrymdsbevis.
- `runner.verify(katalog, omhashade_pins)` avvisade paketet med
  `Trusted problem/manifest identity mismatch`: den förväntade
  sexmedlemspopulationen återskapades från det oförändrade problemet.
- Samma avvisning skulle inträffa ännu tidigare med de ursprungliga externa
  pinsen. Testet med uppdaterade pins utesluter att kontrollen bara råkar fånga
  en gammal checksumma.

Saknad medlem, dublett med bibehållet antal, oväntat ID, fel medlemsinnehåll
och extra runkatalog underkändes också. Sex korrekta runs reparerar inte en
felaktig enumeration. Ett separat avbrott efter två kandidater bevarar sex
förväntade medlemmar, två CERTIFIED och fyra NOT_RUN/UNKNOWN.

## Identiteter och beviskedja

| Identitet | Faktisk bindning och gräns |
|---|---|
| problem_id | Hela problemet, inklusive modell, mål, revision, sources och sökgrammatik. Målbyte kräver nytt problem-/manifestankare. |
| model_id / source_set_id | Hela model respektive sources. Källhashar verifierar inte källornas sanningshalt eller filernas faktiska existens. |
| observation_definition_id | Hela observationsdefinitionen, inklusive sampling, kvantifierare och all_attempts_accepted. |
| search_space_id | Modellhash, sources-hash, outcomes, grammatik och stabil script-source. Binder medvetet inte mål eller problemrevision. |
| candidate_id / plan_id | Kandidaten binder search_space_id och plan_id; planen binder hela scriptet i en typad payload. Ett målbyte kan bevara båda identiteterna. |
| input_identity | Hela vanligt ce3-run/1: modell, script, outcomes och sources. Samma hash är auditens trusted input. Binder inte explorerns mål eller limits. |
| runtime_id / explorer_build_id | Backendfilmanifest inklusive profil och Pythonimplementation/version; respektive alla toppnivå-Pythonfiler i explorerkatalogen. Tests/Markdown ingår inte i explorer-build. Detta är innehållsbindning, ingen signerad exekveringsattestation. |
| search_execution_id / execution_id | Sökningen binder problem, manifest, runtime, build, limits och max_candidates. En enskild execution binder input, runtime och limits. |
| run_id | UUID för försök, separat från innehåll; format och dubletter kontrolleras. UUID är inte kryptografiskt bevis för att en viss process faktiskt kördes. |
| history_id / filhashar | Hela dekomprimerade historikdokumentet respektive faktiska input-/historik-/auditbytes. Gzipfilhash och dokumenthash är olika. |
| audit_receipt_id | Yttre kvitto med history/input/runtime och auditresultat. Sparat PASS jämförs med färsk audit. |
| observation_id | Problem, mål, observer-build, history/input/auditkvitto och alla värden/evidens. Den återberäknas vid verifiering. |
| result_id | Slutpayload inklusive konkreta run-ID:n. `result.json` ignoreras vid verify och är ingen tillitskälla. |

Återläsningen härleder expected_input från det validerade manifestet och
kontrollerar started/record, limits, input, färsk audit, kvitto, observation
och artefakthashar (`runner.py:133–159`). Därmed kan gamla målresultat inte
återanvändas bara för att candidate/input-ID är oförändrat efter ett målbyte.
Det testades med nya giltiga problem-/manifestpins och uppdaterad sökspecifikation,
men gamla runartefakter: samtliga mål blev UNKNOWN.

Individuellt byte av input, historik, audit, kvitto, observation, started och
record mellan två kandidater gav UNVERIFIED/UNKNOWN. Förfalskat terminaltillstånd
med uppdaterad filhash stoppades av färsk audit. Förfalskad observationsevidens
med uppdaterat observation_id stoppades av omberäkningen. Ändrade mål, modell,
källor, revision och runtime underkändes av respektive identitetsgrind.

Tillitsmodellen kräver separat betrodda pins och betrodd aktuell verifierarkod,
samt stabil lokal lagring under verifieringen. Hasharna autentiserar inte
hela ersatta paket eller skyddar mot aktiv kod-/filswap under läsning. Sådana
samtidiga angrepp eller signerad proveniens har inte testats eller utlovats här.

## Generalisering, mål och fel — genomförda försök

Nya orakel fastställdes direkt från reglerna, före jämförelse med körresultat.
Ingen kopia av CE3:s guard-/effektutvärderare användes för att räkna facit.

| Test | Oberoende förväntan och faktiskt resultat |
|---|---|
| P→z_start, Q→a_finish, X→m_aux; omvänd ordning på modellens beslutsegenskaper | Exakt sex ordningar; endast z_start före a_finish lyckas. Tre träffar, samma kausala ordningar som tidigare. PASS. |
| Ändrad JSON-nyckelordning | Samma problemhash och manifest. PASS. |
| `decision_ids=[X,Q,P]` | Avvisas eftersom kontraktet kräver sorterad mängdrepresentation. Ingen dold planprioritering. PASS. |
| Q kräver ready=false | Exakt QPX, QXP, XQP lyckas. PASS. |
| Q kräver ready=true och aux_done=true | Exakt PXQ, XPQ lyckas. PASS. |
| P:s eventdelay=2 respektive 3 | Bara PXQ lyckas vid delay 2; ingen vid delay 3. Horisontgränsen följs. PASS. |
| Ny A/B/C-modell utan budget och events | A sätter phase=started och ökar n till 1; B kräver started och sätter done; C kräver n≥1. Mål n=1 och phase=done: exakt ABC och ACB lyckas. Sträng-/heltalsmål och ge-guard fungerar. PASS. |
| Mål prepared=true | Terminalmålet är sant även i blockerade runs; endast de tre runs där alla försök accepterats får SATISFIED. PASS. |
| Mål budget=1 | Blockerade runs har saldo 1, men inga runs uppfyller hela målkonjunktionen. Sex CERTIFIED/NOT_SATISFIED och COMPLETE. PASS. |
| Tomt mål, okänt fält, null, bool/int/float-förväxling och värde utanför domän | Avvisas. PASS. |
| Annan sampling, any-kvantifierare eller avstängt acceptancekrav | Avvisas uttryckligen. PASS. |
| Två eller fyra besluts-ID:n | Avvisas med Exactly three decision IDs required. Dokumenterad begränsning; inget stöd byggdes ut. |
| Två ordningskänsliga timer-events, ursprungssviten | Två auditerade banor med true/false ger mål false för kandidaten. Ingen referensbane-genväg. PASS. |
| Ändrad målstatus eller radevidens | Färsk omberäkning stoppar observationen även om observation_id räknas om. PASS. |
| Audit FAIL, förändrad historik eller utbytta artefakter | Relevant kandidat blir UNVERIFIED/UNKNOWN. PASS. |
| Saknad run/record, duplicerat UUID, trasig JSON/dubbla JSON-nycklar | NOT_RUN eller UNVERIFIED, mål UNKNOWN och ingen COMPLETE. PASS. |
| Sökbudget 0 eller 2 | Okörda medlemmar behålls, search INCOMPLETE. PASS. |
| max_steps, max_rows, max_paths | Ingen målcertifiering för ofullständiga runs. PASS. |
| ModelError i effekt | ERROR blir UNKNOWN, inte ett korrekt genomfört målfel. PASS. |
| Processtimeout | Injekterat TimeoutExpired vid processgränsen; UNVERIFIED/UNKNOWN bevaras. PASS. Ingen verklig 60-sekunders OS-timeout provocerades. |
| Trunkerad gzip | Ohantagen EOFError, inga verifierade besked. R1, förväntad testavvikelse. |
| Förfalskad eller borttagen result.json | Samma verifierade resultat återbildas från underliggande artefakter. PASS. |

Målspråket är endast en icke-tom konjunktion av typade terminala likheter plus
alla försök accepterade. Det stöder inte always, reach_by, valfria försök,
retry, preferenser, scenarioquantifiering eller allmän framtida nåbarhet.
Ett initialt eller övergående sant mål räcker inte: implementationen samplar
uttryckligen sista radens after-state. Pending efter horizon räknas inte som
framtida måluppfyllelse. Andra antalsproblem avvisades i stället för att ändra
den uttryckliga trebeslutsbegränsningen.

## Exakt körda tester och reproduktion

Miljö: Python **3.9.6**, Node **v25.1.0**. Alla kommandon nedan kördes från
repositoryroten; Python med `-B`. Befintliga sviter kördes via discovery för
att undvika rapportskrivande main/entrypoints i repositoryt.

```sh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-review-5429b52-pqx
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-review-5429b52-pqx
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
```

| Grupp | Eget observerat resultat |
|---|---|
| Ursprunglig explorersvit | 27 PASS, inklusive färsk replay/audit/semantisk jämförelse av 34 katalogfall och 654 banor |
| Core/regressionsharness | 27 PASS |
| Arbetsbänk | 14 PASS |
| Fabriksplaner/timing | 6 PASS |
| Session/1, session/2 och lagerexecution | 54 PASS |
| Nya oberoende granskningstester | 16 totalt: **15 PASS, 1 expected failure (R1)** |
| Apollo, separat in-memory-kontroll | 11 frysta inputs / 66 banor: gammal historik återauditerad, färsk replay/audit PASS och kanoniskt identisk historik |

De ursprungligen rapporterade **128 testfallen** reproducerades alltså utan
avvikelse. Nya granskningssvitens slutkörning gav 16 tester på 6,017 sekunder;
dess tidigare körning före tillägg av row/path-limit-testet gav 15 tester med
samma enda förväntade avvikelse. Det öppna felet ska inte räknas som PASS.
Loggar finns lokalt i `/tmp/ce3-review-{explorer,replay,workbench,factory,sessions,independent}.log`.

Apollo-kontrollen använde alla `input.json` under
`isolated-tests/structural-ce3-apollo8/results/run-1`. För varje fil kördes
följande i minne, utan rapportskrivning eller ändring av gamla sources:

```python
old = read_bundle(file.with_name("history.json.gz"))
run = read_bundle(file)
assert audit_bundle(old, digest(run))["status"] == "PASS"
new = replay(run, old["limits"])
assert audit_bundle(new, digest(run))["status"] == "PASS"
assert encode(new) == encode(old)
```

Antalet inputs och summan av banor assertades till `(11, 66)`. Apollos
tidigare dokumenterade källhashdrift reparerades inte. Dagens Apollo-byggare,
full tvåpass-checkpoint, extra jämförelse-UI-sviter, webbbygge och
TypeScript-pilotens fulla tester kördes inte i denna granskning.

Ny sexkandidatskörning och efterföljande verify gav båda exitkod 0 och:

| Ordning | Körning | Mål |
|---|---|---|
| PQX | CERTIFIED | SATISFIED |
| PXQ | CERTIFIED | SATISFIED |
| QPX | CERTIFIED | NOT_SATISFIED |
| QXP | CERTIFIED | NOT_SATISFIED |
| XPQ | CERTIFIED | SATISFIED |
| XQP | CERTIFIED | NOT_SATISFIED |

Search coverage: COMPLETE. En eventbana per kandidat.

| Identitet | Värde i ny körning |
|---|---|
| problem_id | `69e12e72fc9dc55367f6e9ef3253f2b6a118c871219aa6e8c3333d95a552bc67` |
| manifest_id | `ac0ec76f44057b4baabd3e5066189eaf6a4f1dc86528b7914fa8d8b7224bb9d5` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `517aaea5f1c186f771ff65ca1dbe0d40e593ed0524694a1abf3b812c0d71179d` |
| result_id, run och verify | `9df3d4b9318b9455783c0baa4512efcb24f51824f3c1b86403ed0221397aea35` |

Problem/manifest/runtime/build matchar implementationsrapportens värden.
Resultat-ID skiljer sig från den gamla körningen eftersom nya run-UUID:n ingår.
Ursprungssvitens omkörningstest verifierade stabila kandidat-, plan-, input-,
execution-, history-, receipt- och observation-ID:n med nya run-ID:n.

## Vad beskeden betyder efter granskningen

**CERTIFIED:** rätt fullständiga input/historikartefakter har matchats mot
kandidaten och sökspecifikationen; färsk befintlig audit verifierar körningen
och alla dess eventordningar; alla obligatoriska kvitton, observationer och
bindningar stämmer. En blockering i en korrekt historik kan vara CERTIFIED.

**SATISFIED:** för denna kandidat, detta problem och denna modell gäller alla
deklarerade typade terminala likheter på sista radens after-state, och exakt
tre beslut har exekverats utan blockerade försök, på **varje** auditerad
eventbana. NOT_SATISFIED kräver samma korrekta fullständiga körkedja och att
minst en bana bryter någon del av målet. Tekniskt overifierad körning ger
UNKNOWN/null när verifieringen kan returnera ett strukturerat resultat.
Vid R1 måste hela anropet behandlas som verifieringsfel; inget gammalt
result.json får användas som ersättningscertifikat.

**enumeration_coverage COMPLETE:** exakt medlemskap och innehåll mot det
givna manifestet. **search_coverage COMPLETE från full runner.verify:**
dessutom matchar manifestet den från problemet härledda sexmedlemsdomänen,
alla sex har CERTIFIED resultat och inga oväntade runkataloger finns.
Det säger inte att någon kandidat klarar målet; även sex negativa målbesked
kan ge COMPLETE. Det avser inte alla scripts som fixed-replay i allmänhet
tillåter och inte någon extern scenario-population.

## Före nästa etapp med scenariokorsning

1. Rätta R1 i exploreromslaget och gör dess expectedFailure till ett vanligt
   passerande regressionstest; behåll UNKNOWN och kandidatvis felisolering.
2. Behåll den oberoende härledningen av hela populationen. Ett nytt explicit
   scenariofält behöver exakt kandidat × scenario-manifest och ett oberoende
   litet orakel, inklusive ett konsekvent paket med samma cell borttagen ur
   både manifest och resultat. Dagens COMPLETE kan inte återanvändas för detta.
3. Bind scenariodefinition, fulla outcomes, cell, effektiv modell, fast script,
   observation och försök. Bevisa att scriptet är oförändrat mellan scenarier;
   en plan per känt utfall är inte en gemensam adaptiv policy.
4. Håll event-, kandidat- och scenariotäckning åtskilda och redovisa explicita
   kvantifierare. Avbrutna/overifierade celler måste finnas kvar som okända.
   Om retry/resume införs behövs separat försöks- och konfliktkontrakt.
5. Behåll replay/audit frysta och skydda den gemensamma materialiseringen med
   direkta input-orakel. Lägg inga guards, effekter eller tillståndssökning i
   omslaget för att fylla återstående scope-luckor.

Punkterna 2–5 är acceptanskrav för en ny omfattning, inte fel som innebär att
den nuvarande trebeslutsexplorern måste byggas ut under denna granskning.
Endast denna rapport och granskningstesterna ingår i leveransen; ingen push.
