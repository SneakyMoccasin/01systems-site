# Oberoende kritisk granskning av CE3 scenariokorsning

Datum: 2026-10-21. **Verdict: PASS WITH LIMITATIONS.**

Granskad commit och start-HEAD: `7dab9a0ff418dc8370e513f8783e793cdf819397`.
Inga bekräftade implementationsfel hittades i de redovisade försöken. Inga
falska COMPLETE, CERTIFIED eller robust TRUE kunde framkallas inom den
deklarerade tillitsmodellen. Begränsningarna nedan är faktiska gränser för
slutsatsen, inte dolda underkända tester. Ingen implementationskod har ändrats.

**Påståendet ”PXQ når målet i samtliga tre deklarerade scenarier” håller.**
En färsk run och en separat färsk verify certifierade samma 18 celler.
Samma fasta PXQ-script uppfyller det deklarerade terminalmålet och kravet
att alla tre försöken accepteras under ja, nej och uteblivet besked, på
samtliga auditerade eventbanor. Detta gäller den syntetiska modellen,
stegen 0/1/2 och det frysta scenariourvalet; det bevisar inte framgång i
verkligheten, andra tidsförlopp eller andra externa utfall.

## Underlag, instruktioner och bevarande

Repositoryrots README:s låsning lästes. Ingen tillämplig AGENTS.md hittades
i repositoryt eller föräldrakatalogerna. Uppdraget är en uttryckligt begärd
granskning av den isolerade CE3-ytan; inga produktfunktioner eller rättningar
ingår. Startstatus hade inga ändrade spårade filer och inget staged innehåll,
men många befintliga ospårade filer, bland annat auditerna och Apollo.

Lästa underlag: båda arkitekturauditerna i repositoryroten,
`CE3-PHASE1A-ARCHITECTURE-AUDIT.md` och
`CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md`, samt explorerns
`IMPLEMENTATION-REPORT.md`, `INDEPENDENT-REVIEW-5429b52.md`,
`R1-GZIP-FIX-REPORT.md`, `SCENARIO-IMPLEMENTATION-REPORT.md`,
`SCENARIO-FORMAT.md` och README. Commitdiffen, scenariokoden, fixtures,
befintliga scenariotester och gemensamma contracts/runner/observe/bridge
granskades. Replays FORMAT, profil, schema, codec, replay, transitions,
expressions, CLI och audit lästes för att fastställa den faktiska semantiken.

E nedan betyder `isolated-tests/structural-ce3-explorer/`, R betyder
`isolated-tests/structural-ce3-replay/`, båda under
`/Users/christian/Projects/pulse_engine_clean/`. Fil/rad avser granskad commit.
T01–T13 är metoderna i den nya, separata granskningssviten
`E/scenario_review_tests/test_review_7dab9a0.py`.

Ett SHA-256-manifest över **2 431 befintliga spårade och ospårade,
icke-ignorerade filer** sparades före nya tester. Slutjämförelsen fann ingen
ändrad eller borttagen befintlig fil. Ignorerade filer och gitmetadata ingår
inte i den kontrollen. Manifest: `/tmp/ce3-review-7dab9a0-before.json`, SHA-256
`41b34fb4cb7f2551999ab8592bbd2eca64d89c49eb7d148b6e10991c7ab8091a`.
Alla nya run-/mutationsartefakter ligger i temporära kataloger. Endast denna
rapport och den nya granskningssviten ska ingå i granskningscommitten.

## Fynd efter allvarlighetsgrad

| Allvarlighet | Bekräftade implementationsfel |
|---|---|
| P0/P1 | Inga identifierade |
| P2 | Inga identifierade |
| P3 | Inga identifierade |

De prövade garantierna och deras konkreta reproduktioner redovisas nedan.
PASS betyder att just dessa försök inte falsifierade garantin; det är inte
ett formellt bevis för alla tänkbara program- eller lagringsfel.

## Oberoende regelhärledning och matris

Facit härleddes från modellreglerna, utan anrop till materialisering,
guardutvärderare eller replay. Q kräver både prepared och ready. P sätter
prepared; X sätter ready och aux_done. Eventet vid steg 1 sker före beslutet:
approved sätter ready, rejected nollställer ready, absent lämnar ready
oförändrad och sätter response till waiting. Q och X kostar tillsammans 2,
vilket ryms i initialbudgeten. Inget blockerat Q görs om.

- Q först saknar prepared. Även XQP saknar prepared när Q försöks.
- PQX har prepared vid Q men saknar X:s readiness; endast approved hjälper.
- PXQ har X efter eventet. Därför finns både prepared och ready vid Q,
  oberoende av vilket av de tre deklarerade beskeden som inträffade.
- XPQ har X före eventet. Rejected förstör readiness, medan absent bevarar
  den. Därför skiljer sig nej och uteblivet även i måluppfyllelse.

| Fast ordning | Ja | Nej | Uteblivet | Robust |
|---|---|---|---|---|
| PQX | TRUE | FALSE | FALSE | FALSE |
| PXQ | TRUE | TRUE | TRUE | TRUE |
| QPX | FALSE | FALSE | FALSE | FALSE |
| QXP | FALSE | FALSE | FALSE | FALSE |
| XPQ | TRUE | FALSE | TRUE | FALSE |
| XQP | FALSE | FALSE | FALSE | FALSE |

Samtliga 18 körningar är CERTIFIED; matrisens FALSE betyder verifierat
målfel, inte körfel. Varje originalcell har en eventbana. T01 innehåller
denna literal-matris och ett separat vanligt CE3-input-orakel med uttryckliga
slots 0/1/2 och attempt. Det återanvänder varken `materialize`, `candidate`
eller `effective_problem` som facit. Det jämför hela sparade input,
terminaltillstånd, budget, response, pending och blockeringssteg och jämför
därefter den sparade `scenario-expected.json` med literal-oraklet. Alla
jämförelser passerade. Detta styrker även att uteblivet inte är dolt avslag.

## Falsifieringsförsök, förväntat och faktiskt beteende

| Garanti och kodankare | Reproduktion | Förväntat | Faktiskt |
|---|---|---|---|
| Fast kandidat, ingen framtidsstyrd ordning. E/contracts.py:11, E/scenario_contracts.py:47–64 | T01 och T07 jämför fulla inputs mot direkt konstruerade envelopes; T07 byter P/Q/X till z/a/m och kopplar svenska etiketter till andra outcomes | Samma script, modell, startläge, sources och mål per kandidat; endast full outcomes-map varierar | PASS. Samma tre scriptinstruktioner i alla scenarier; mål följer outcomes/regler, inte etikett eller ID |
| Härledd full population. E/scenario_contracts.py:76–100; E/scenario_runner.py:120 | T05 tar bort PXQ/uteblivet ur manifest, enumeration, runs och result; räknar om pins, batch, attempt, started, record, observation och result-ID:n | Avvisa trots lokalt konsekventa 17 celler | PASS. Lokal check_population ger COMPLETE relativt det reducerade manifestet; full verify ger `Trusted problem/manifest identity mismatch`, CLI exit 1 och inga framgångsrader |
| Exakt medlemskap och körkataloger. E/scenario_contracts.py:109–128; E/scenario_runner.py:135–137,210–214 | T06 tar bort enumerationsmedlem, ersätter med dublett, felkopplar input-ID eller tillför oväntad katalog/fil under runs | Ingen komplett celltäckning eller exit 0 | PASS. Saknad enumeration ger INCOMPLETE; övriga INVALID. 18 oskadade celler redovisas fortfarande; CLI exit 2 |
| Rätt trevärdeslogik. E/scenario_runner.py:106–113,196–202 | T12 prövar alla 27 kombinationer av TRUE/FALSE/UNKNOWN samt obestyrkta boolska värden och tom mängd; T02 tar bort PXQ/uteblivet och XPQ/ja | PXQ UNKNOWN; XPQ FALSE på verifierat nej-motexempel; tom mängd får inte bli TRUE | PASS. Verifierat FALSE har företräde över UNKNOWN; TRUE kräver alla certifierade sanna celler |
| Projektioner är inte cellbevis. E/scenario_runner.py:189–214,250 | Samma T02 | Kandidat- och scenarioprojektioner får vara COMPLETE, men celltäckning INCOMPLETE och PXQ UNKNOWN | PASS. 6/6 respektive 3/3 representerade, 16/18 certifierade, exit 2 och ingen robust TRUE |
| Ingen framtvingad robust vinnare. E/observe.py:29–47; E/scenario_runner.py:106–113,250 | T03 ändrar målet till budget=1 med nya pins; fullt accepterade planer slutar på 0, blockerade planer på 1 | Alla 18 certifierade men mål falskt; alla sex robust FALSE | PASS. Full täckning och CLI exit 0, sex uttryckliga FALSE. Exit 0 betyder verifieringsfullständighet, inte att någon plan når målet |
| Alla eventbanor bedöms. E/observe.py:22–47; R/audit/verify.py:189–202 | T04 tillför clear vid steg 1 och sätter referensordningen clear→response, så första banan lyckas men andra misslyckas | Cellmålet FALSE trots lyckad referensbana | PASS. Två auditerade banor, observerade mål `[true,false]`, cell CERTIFIED/NOT_SATISFIED |
| Borttagen negativ eventbana får inte godkännas. Samma ankare | T04 tar bort den misslyckade banan och räknar om recordens artefakthashar | UNKNOWN/ofullständigt | PASS. Färsk audit avvisar med `Incomplete permutation coverage` |
| Identiteter för kandidat/scenario/cell och artefakter. E/scenario_runner.py:163–176 | T08 byter var för sig input, historik, audit, receipt, observation, started och record från annan kandidat respektive annat scenario | Berörd cell UNKNOWN; oskadade celler kvar | PASS i 14 swap-fall. Normalt 17 certifierade. Recordbyte skapar dubbelt run-UUID och underkänner båda anspråken: 16 certifierade |
| Gamla resultat efter nya outcomes/mål får inte återanvändas. E/scenario_runner.py:168,172–174 | T13 ändrar approved till absent respektive mål till budget=1; skapar nya pins, flyttar alla kataloger till nya cell-ID:n och reparerar alla yttre record-/observationsbindningar men behåller gamla inputs/projektioner | Gammalt ankare avvisas; med nytt ankare krävs korrekt input och ombedömt mål | PASS. Outcomeändring: sex ändrade celler UNKNOWN med `Stored input differs from cell`, övriga tolv certifierade. Måländring: alla 18 UNKNOWN med `Observation mismatch` trots oförändrade replay-inputs |
| Avbrott ska inte krympa populationen. E/scenario_runner.py:64–67,154–185 | T09 injicerar KeyboardInterrupt efter riktig replay respektive riktig CLI-audit, före slutrecord; därefter separat verify | 18 celler kvar, ej slutförd cell UNVERIFIED, resten NOT_RUN; UNKNOWN | PASS. 1 UNVERIFIED + 17 NOT_RUN, inga certifierade mål, exit 2 |
| Gzipfel isoleras och gammal summary är inte auktoritet. E/bridge.py:18–23; E/scenario_runner.py:169,183 | T10 skadar header, trailer, CRC/ISIZE, DEFLATE eller andra gzipmedlemmen i PXQ/ja och sparar falskt COMPLETE/TRUE i result.json | Skadad cell UNKNOWN, 17 korrekta celler kvar, ingen omskrivning, exit 2 | PASS i sex varianter. Alla filer bytejämförs före/efter verify. Borttagen result.json påverkar inte återverifiering efter återställd historik |
| Scenariomängden härleds, inte hårdkodas till tre. E/scenario_contracts.py:24–32,84–86 | T07 använder fyra scenarier, inklusive två etiketter med identiska approved-outcomes | 24 celler, ingen resultatbaserad deduplicering | PASS. 24 certifierade, korrekt matris efter ID-/etikettbyte och denominator 4 för varje kandidat |

T05:s angriparpaket använder nya, separat inskickade pins för det falska
17-cellsmanifestet. Avvisningen beror alltså inte bara på att den gamla
manifesthashen glömts bort. Problemet är fortfarande oförändrat och kräver
18 celler; verifieraren återskapar den domänen innan den läser cellbevisen.

När **bara enumeration** skadas i T06 finns alla 18 verkliga, korrekt bundna
runartefakter kvar. PXQ kan då fortfarande vara robust TRUE medan
cell_coverage är INCOMPLETE/INVALID och CLI ger 2. Det är ingen genväg via
projektionerna: alla tre konkreta PXQ-celler har återauditerats. Man får inte
tolka detta kandidatbevis som ett COMPLETE för batchens enumeration.

## Ytterligare befintliga tester som faktiskt omkördes

Den befintliga scenariotestsviten gav 22 PASS. Utöver överlappande fall ovan
verifierade den följande gränser vid denna granskning:

- `test_limits_and_model_errors_are_not_negative_goals` och
  `test_goal_requires_all_event_paths`: max_steps och max_rows stoppar
  certifiering; max_paths=1 räcker i singleton-fixturen men ger UNKNOWN när
  två eventordningar krävs. Domänöverskridande effekt ger ERROR/UNKNOWN.
- `test_failure_during_run_continues_and_timeout_remains_unknown`: injicerad
  TimeoutExpired lämnar en okänd cell och låter de andra 17 bli certifierade.
  Detta är en injektion vid processgränsen, inte ett test av verklig
  60-sekunders OS-timeout.
- `test_gzip_damage_during_run_keeps_remaining_cells`: skada efter riktig
  CLI-audit ger failure.json och fortsatt körning av övriga celler.
- `test_missing_run_interruption_audit_failure_and_swapped_artifacts`:
  sparad audit FAIL, saknad katalog och saknat slutrecord kan inte bli
  verksamhetsmässigt FALSE eller verifierat TRUE.
- `test_forged_history_and_observation_recomputed_even_after_rehash`:
  ändrad terminalrad respektive falsk observation stoppas trots nya hashvärden.
- `test_unused_outcomes_bound_and_identical_result_states_not_deduplicated`:
  borttagen schemaläggning gör outcomes oanvända; tre identiska materiella
  resultat behåller tre olika fullständiga inputidentiteter och celler.
- `test_unsupported_scope_and_incomplete_outcomes_fail_closed`:
  modellpatch, scriptfält, saknade/okända outcomes, fel grammatikkvantifierare
  och andra ostödda deklarationer avvisas.
- `test_trust_and_build_gates`, `test_duplicate_occurrence_rejects_both_claimants`
  och reproducerbarhetstestet: runtime/build/spec, UUID och innehållsbindningar
  kontrolleras; verify kör inte replay och skriver inte över gamla resultat.

## Identiteter, arkitektur och enscenarioflödets regression

| Bindning | Kod och faktisk kontroll |
|---|---|
| Problem och mål | E/scenario_contracts.py:68,88–94 binder hela problemet och observationsdefinitionen. Ändrat mål ger nya celler även om replay-input är identiskt. T13 avvisar gammal målprojektion. |
| Kandidat och fast plan | E/scenario_contracts.py:36–52 binder modell, sources, grammatik, stabil script-source och full scriptpayload. Scenarioutfall ingår inte i planvalet. |
| Scenario och full outcomes-map | E/scenario_contracts.py:42–58 binder hela mängden och definitionen inklusive etikett samt separat full outcomes-map. R/core/schema.py:245–249 kräver bindning för varje externt event, även oanvänt. |
| Cell och input | E/scenario_contracts.py:67–73 binder problem/kandidat/plan/scenario/outcomes/input. E/scenario_runner.py:167–168 återskapar och jämför vanligt input. |
| Försök och exekveringsspecifikation | E/scenario_runner.py:21–37,125–144,163–165 binder manifest/runtime/build/limits/budget, batch-UUID, run-UUID, started och record. Dubbla run-UUID:n underkänner båda. UUID är ingen signerad processattestation. |
| Historik och audit | E/runner.py:38–42 lagrar filhashar och kanonisk history-identitet. E/observe.py:6–13 kräver färsk audit av samma inlästa bundle mot förväntat input; gammalt PASS räcker inte. |
| Observation och result | E/observe.py:16–47 och E/scenario_runner.py:40–45,171–176 binder mål, build, input, historik, audit, cell, scenario och batch. Resultat sammanställs på nytt; result.json läses inte. |

Kandidatgenereringen är syntaktisk. `freeze` använder all-different-filtrerade
kartesiska ord och `generate` permutationer. De delar små materialiserings-
och identitetshjälpare, vilket är en gemensam felkälla; därför behövs det
direkta input-oraklet. Ingendera evaluerar guards, effects, budget eller
eventtillstånd. Användningen av första scenariots envelope i
`candidate()` innebär ingen förutseende plan: den plockar endast scriptet
som byggs av fasta slots och order, och identiska script kontrolleras igen.

Operativ exekvering sker via befintlig replay-CLI och separat audit-CLI
(E/scenario_runner.py:81–87; E/runner.py:45–48). Färsk verify anropar samma
befintliga oberoende audit i processen. Målobservatören läser alla auditerade
banor och jämför terminalvärden; den verkställer inga övergångar. Ingen
alternativ regelmotor hittades. Auditors separata kontrollsemantik är
avsiktlig och importerar inte runtimepredikat, effekter eller transitions.

Diffen för hela replay- och workbench-katalogerna mellan `7dab9a0^` och
`7dab9a0` är tom. Backendets frysta bytehash-test passerade. Den enda
gemensamma kodändringen är extraktionen av `validate_declaration` i
E/contracts.py:20–65. Den gamla ingången kontrollerar fortfarande sin egen
version, tom outcomes-map och endast timer-events. Kontrollordningen är
ändrad, så exakt första felmeddelande för flerfaldigt ogiltiga input är inte
ett bevarandelöfte. Ingen accepterad ny enscenariofunktion hittades.

T11 laddar exakt föregående commits contracts.py i ett separat namespace
utan checkout eller filändring och jämför accepterat/avvisat för giltigt
input, saknade fält, fel version/outcomes/revision/profil, typade mål och
externt event. Det jämför även hela freeze-resultatet för den gamla
fixturen. Allt matchade. Detta är ett riktat differentialtest, inte ett
uttömmande bevis för alla input. Dessutom passerade gamla explorerns 27
tester, dess 19 tidigare granskningstester och färsk enscenario-run/verify.

## Dokumenterade begränsningar, inte implementationsfynd

1. **Fryst scope.** Exakt tre beslut, ett attempt vardera i slots 0/1/2,
   horisont 0..2, endast outcomesvariation. Inga adaptiva policyer, retries,
   pruning, optimering, AI-kompilering eller generell nåbarhetsgaranti.
   Terminalt mål och alla accepterade försök är starkare än enbart done=true
   men säger inget om kontinuerlig säkerhet eller verklig leverans.
2. **Uteblivet är modellerat.** Den explicita absentgrenen tillämpas vid
   steg 1 och lämnar waiting till horisontens slut. Den är inte oändlig
   väntan och säger inget om besked efter steg 2. Schema kontrollerar det
   deklarerade vänteläget, inte verklighetssanningen eller att varje tänkbar
   absentmodell har önskad verksamhetsbetydelse.
3. **Tillitsgräns.** Separat betrodda pins, betrodd verifierarkod och stabila
   filer under verifieringen krävs. Hashar och UUID:n är inte signaturer,
   exekveringsattestation eller bevis för källornas sanning. Samtidig aktiv
   kod-/filswap och utbyte av både hela paketet och dess tillitsankare har
   inte testats eller certifierats.
4. **Statusar måste läsas med rätt nämnare.** candidate_coverage och
   scenario_coverage är uttryckligen projektioner. cell_coverage avgör CLI:s
   0/2. Exit 0 är tillåtet utan en enda robust kandidat; exit 2 kan innehålla
   ett fullständigt verifierat kandidatvittne. Varken antalen eller en
   referensbana anger sannolikhet. T02, T03 och T06 verifierar dessa skillnader.
5. **Felisolering har en toppnivågräns.** Skadad cell kan redovisas som
   UNKNOWN med oskadade celler kvar. Ogiltigt problem/manifest/pins eller
   runtime/build avvisar hela paketet med exit 1, eftersom population eller
   tillitsgrund då saknas. Avbruten process kräver separat verify; automatisk
   återstart/resume ingår inte.

Ingen av dessa begränsningar motsäger PXQ-påståendet inom den verifierade
frysta mängden. De förhindrar att det utvidgas till ett allmänt robusthets-
eller produktnyttopåstående.

## Exakt körd verifiering

Miljö: Python **3.9.6**, Node **v25.1.0**. Från repositoryroten:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --output /tmp/ce3-review-7dab9a0-fresh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --output /tmp/ce3-review-7dab9a0-fresh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-review-7dab9a0-single
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-review-7dab9a0-single
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/scenario_review_tests -p 'test_*.py' -v
git diff 7dab9a0^ 7dab9a0 -- isolated-tests/structural-ce3-replay isolated-tests/structural-ce3-workbench
git diff --check
```

Stdout/stderr sparades lokalt under `/tmp/ce3-review-7dab9a0-*.log`:
`run`, `verify`, `single-run`, `single-verify`, `scenario`, `explorer`,
`review`, `replay`, `workbench`, `factory`, `sessions`, `independent`, `apollo`.
Testernas extra CLI-anrop och mutationer framgår exakt av testkoden;
temporary-katalogerna städas av testerna. Den oberoende sviten kördes först
med 12 tester (12 PASS), därefter med T13 tillagt (13 PASS). Den första
körningen adderas inte till totalsiffran.

| Grupp | Observerat resultat | Vad det styrker |
|---|---|---|
| Befintlig scenariotestsvit | 22 PASS, 13,204 s | Aktuella scenario-, fel-, gräns- och bevarandetester |
| Ursprunglig explorer | 27 PASS, 101,144 s | Enscenarioflödet samt färsk replay/audit/semantisk jämförelse av 34 befintliga fall och 654 banor |
| Tidigare oberoende granskning/R1 | 19 PASS, 12,012 s | Tidigare falsifieringsfall och gzipregressioner |
| Replay/regressionsharness | 27 PASS, 5,172 s | Kärnans befintliga semantik och auditgräns |
| Arbetsbänk | 14 PASS, 93,991 s | Befintlig lagring/run/återaudit/import/export |
| Fabriksplaner/timing | 6 PASS, 18,882 s | Befintliga factory-flöden |
| Session/1, session/2, lagerexecution | 54 PASS, 71,096 s | Befintliga sessions- och executionkontrakt |
| Nya oberoende granskningstester | 13 PASS, 12,116 s | T01–T13 ovan, med direkta input- och literal-orakel |

Totalt **182 testfall PASS**, inga expected failures, skips eller öppna
testavvikelser. Antalet omfattar testmetoder/Node-testfall, inte varje
underliggande cell, mutation eller subTest. Testtiderna är observerade
körtider, inte prestandabenchmarks; flera regressionssviter kördes samtidigt.

Därutöver kördes följande Pythonkontroll i minne via `python3 -B -`:

```python
import pathlib, sys
sys.path.insert(0, str(pathlib.Path('isolated-tests/structural-ce3-replay').resolve()))
from core.history import read_bundle, digest, encode
from core.replay import replay
from audit.verify import audit_bundle
files = sorted(pathlib.Path('isolated-tests/structural-ce3-apollo8/results/run-1').rglob('input.json'))
paths = 0
for file in files:
    data = read_bundle(file)
    old = read_bundle(file.with_name('history.json.gz'))
    assert audit_bundle(old, digest(data))['status'] == 'PASS'
    new = replay(data, old['limits'])
    assert audit_bundle(new, digest(data))['status'] == 'PASS'
    assert encode(new) == encode(old)
    paths += len(new['paths'])
assert (len(files), paths) == (11, 66)
```

Resultat: **11 frysta Apollo-inputs / 66 banor PASS**, gamla historiker
återauditerade och kanoniskt identiska med färsk replay. Den tidigare
dokumenterade skillnaden i gamla sources mot dagens Apollo-byggare
reparerades inte. Inga gamla resultat skrevs över.

Full tvåpass-checkpoint med samtliga felprober, webbbygge, TypeScript-pilotens
tester, UI-flöden, långvarig OS-timeout och samtidiga lagringsangrepp kördes
inte. Resultaten ovan ska inte användas som intyg för dessa ytor.

## Färska identiteter och leverans

Scenario-run och efterföljande verify gav båda exit **0** och byteidentisk
CLI-output. Enscenario-run/verify gav också exit **0**, sex CERTIFIED och
de ursprungliga tre målträffarna PQX/PXQ/XPQ.

| Scenarioidentitet | Värde i den färska körningen |
|---|---|
| problem_id | `ad7cb37ef5c21d03ca173d4201256a45350aa912553dc268762cef4419fde0ff` |
| manifest_id | `a8dab8898c7fb4f8f90bf5420e4acb514ec07f587a7e6e40d1838a8814e03ac5` |
| scenario_space_id | `f3ec324e1ac87c481134cb0d9e5bbb435c7f1b23eabf1db73674617ea3a1d9e2` |
| batch_spec_id | `0a1a208cea85e700c6304f031e0936ab49e378871347ae527db3238df49d4b28` |
| runtime_id | `b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d` |
| explorer_build_id | `1067aed6c34904c9e8579a9da47c350658c348fd5169333c17f8382f94fa557f` |
| result_id, run och verify | `4afe17000984aab519feb3a220818df8752d5990a701adcdbea77962b490ceae` |

Enscenarioresultatets ID är
`5f1939685a07628f9bbfbebdf72f79d566cbc5b3ea718837e07224d587e68083`.
Nya UUID:n gör att result_id inte förväntas matcha tidigare rapporters
körförsök. Granskningstesterna ligger i en underkatalog och ändrar inte
explorer_build_id, som binder toppnivåns implementationsfiler.

Leveransen består enbart av denna rapport och
`scenario_review_tests/test_review_7dab9a0.py`. Ingen produktionskod,
fixture, historisk rapport eller befintlig artefakt har rättats. Ingen push.
