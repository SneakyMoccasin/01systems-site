# CE3 – första minimala explorer

Tekniskt integrationstest ovanpå oförändrad `fixed-replay/0.1`, enligt
[Fas 1A](../../CE3-PHASE1A-ARCHITECTURE-AUDIT.md) och
[Fas 1A.2](../../CE3-PHASE1A2-PROBLEM-EXPLORER-AUDIT.md).
Detta visar inte kundnytta, verklighetsprediktion, sannolikheter eller optimalitet.

Tre deklarerade beslut, ingen färdig plan: generatorn skapar sex vanliga
`ce3-script/1`. Varje fullständigt input körs genom ordinarie Python-CLI replay
och separat CLI-audit. En explicit efterhandsobservation bedömer målet från
auditerad historik. En separat full medlemskontroll bedömer söktäckningen.
Ingen TypeScript Structural Observation eller alternativ transition engine används.

## Reproducerbar körning

Kräver Python 3.9+ och standardbiblioteket. Kör från repositoryroten och välj en
**ny** utmatningskatalog:

```sh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-explorer-pqx-run
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-explorer-pqx-run
```

Standardindata är versionsbundna `fixtures/problem.json`, `search-manifest.json`
och separat betrodda `pins.json`. CLI kräver inte att problemindata har ett script.
Exitkod 0 betyder komplett verifierad sökning, 2 ofullständig/ogiltig resultat-
täckning och 1 fel i kontrakt/tillitsankare/filhantering. En målfalsk kandidat
är inte ett processfel.

| Ordning i steg 0, 1, 2 | Körning korrekt | Målet uppfyllt | Slutbudget |
|---|---|---|---|
| P Q X | Ja, audit PASS | Ja | 0 |
| P X Q | Ja, audit PASS | Ja | 0 |
| Q P X | Ja, audit PASS | Nej, Q blockeras steg 0 | 1 |
| Q X P | Ja, audit PASS | Nej, Q blockeras steg 0 | 1 |
| X P Q | Ja, audit PASS | Ja | 0 |
| X Q P | Ja, audit PASS | Nej, Q blockeras steg 1 | 1 |

P schemalägger ready-eventet ett steg senare. Q kräver ready. X är oberoende.
När P ligger sist blir eventet pending vid steg 3, efter horisonten. Detta är
vanlig CE3-semantik och ger inget dolt retry av Q. Den oberoende förväntade
mängden fastställdes i `fixtures/expected.json` före första explorerkörningen.

Avbrotts-/limitexempel, också till nya kataloger:

```sh
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --max-candidates 2 --output /tmp/ce3-explorer-pqx-partial
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --max-steps 1 --output /tmp/ce3-explorer-pqx-limited
```

Båda ska ge exitkod 2. Okörda/overifierade mål är UNKNOWN, aldrig automatiskt nej.
`verify` skriver inte över resultat eller startar om körningar. För en avsiktligt
ändrad modell krävs nya granskade pins via `runner.py freeze --problem <fil>
--output <ny-katalog>`, därefter explicita `--problem`, `--manifest`, `--pins`.
Att frysa ett nytt problem är inte att få det gamla problemet att passera sin identitet.

## Tester

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_workbench.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-workbench/verification -p 'test_factory*.py' -v
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/v2/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-prototype/execution.test.cjs
```

Explorersviten innehåller riktiga subprocesskörningar, felinjektioner, det
oberoende sexmedlemsoraklet, test av all-event-paths med två olika målutfall,
bytekontroll av fryst backend samt färsk replay/audit/semantisk jämförelse av
befintliga 34 katalogfall/654 banor. Befintlig komplett tvåpass-checkpoint med
alla dess felprober ersätts inte av denna svit.

## Filer och ansvar

| Fil | Ansvar |
|---|---|
| `bridge.py` | Befintlig codec/schema samt faktisk runtime-/buildidentitet |
| `contracts.py` | Snävt problemkontrakt, rena identiteter/materialisering, fryst manifest och täckningskontroll |
| `enumerate_scripts.py` | Automatisk syntaktisk permutation, ingen regelutvärdering |
| `runner.py` | Nya artefaktkataloger, ordinarie CLI replay/audit, återläsning och tre separata besked |
| `observe.py` | Typat terminalmål och accepterade försök, med färsk audit och radevidens |
| `fixtures/` | Problem, manifest, tillitsankare, oberoende orakel och frysta backendfilhashar |
| `tests/` | Integration, mutationer, ofullständighet, determinism och befintliga fall |
| `FORMAT.md` | Normativa kontrakt, hashdomäner, statusar, gränser och trust model |

Alla befintliga repo-filer lämnas oförändrade. Explorerns nya format injiceras
inte i `ce3-run/1` eller gamla Store-/sessionformat.

## Blockerare från auditerna

”Stängd för etappen” betyder endast den uttryckliga trebeslutsdomänen här.
Det betyder inte att de större produktblockerarna är lösta.

| Blockerare | Åtgärd/befintlig kod | Status |
|---|---|---|
| B1 identitet/kanonisering | `core.history` återanvänds; contracts/bridge binder problem, plan, input, runtime, historik och kvitton; golden-pins och mutationstester | Stängd för denna Pythonvertikal; cross-language och generell batch kvarstår |
| B2 population | Fryst fullständigt manifest, oberoende kartesisk verifiering och literal-orakel; check_coverage testar innehåll och mängd | Stängd för sex kandidater; scenario-set-kartesisk korsning kvarstår |
| B3 observationsbevis | ce3-terminal-goal/1 + observe med history/path/row/auditbindning; återberäkning vid verify | Stängd för terminalmålet/alla försök; generell robusthet och Decision Space kvarstår |
| B4 modell-/planvariant | Modell/bindningar/sources förblir identiska inom sökningen; endast scriptordning varierar; ändrat problem avvisas mot pins | Stängd för etappen; modellvarianter och scenarioexpander kvarstår |
| B5 avbrott/limits/retry | Ordinarie replay-limits, processtimeout, started-record, immutable försök, okända mål och ofullständig population | Delvis: återupptagande, retries, konfliktlösning mellan försök inte implementerade |
| B6 bevarande/Apollo | Före/efter-hashmanifest av faktisk arbetskopia; backend bytepin; befintliga resultat läses oförändrade | Bevarande kontrollerat; Apollos äldre dokumenterade källhashdrift är inte korrigerad |
| E1 problem/mål/capability | Strikt nytt subset-kontrakt + befintligt schema; ostödda fält avvisas | Stängd för subset; generellt Problem Contract kvarstår |
| E2 sökdomän | Exakt tre slots, attempt en gång, inga retries/stopp; manifest och literal-orakel | Stängd för etappen |
| E3 tre bevis | run_status, goal_status och search_coverage skiljs; sex audit-PASS med dublett ger INVALID | Stängd för etappen |
| E4 state equivalence/pruning | Ingen state search, merging eller pruning alls | Undviks genom implementationens scope; generella bevis kvarstår |
| E5 information/nonanticipation | Endast fasta scripts och timer-events; policy-/externa scenariofält avvisas | Utanför etappen, adaptivt stöd olöst |
| E6 AI/domänkompilering | Handskrivet explicit problem; inga AI-/domänpaketsingångar | Utanför etappen, generell kompilering olöst |
| E7 sökproveniens/frontier | Fryst sexmedlemsdomän, build/spec-ID, kvarvarande NOT_RUN/UNVERIFIED-medlemmar | Stängd för uttömmande syntaktisk domän; resume, cuts och allmänna negativbevis kvarstår |
| E8 availability/ModelError | Explorern beräknar inte availability; ordinarie auditgrind, ERROR/INCOMPLETE ger UNKNOWN | Stängd för etappen; generell future availability inte levererad |
| E9 bakåtkompatibilitet | Ingen kärnändring; nya/regressionstester och bevarandekontroll | Stängd för denna ändring, inga framtida migrationer godkända |

Ingen generell Fas 1B-scenario-wrapper fanns att återanvända. Den behövs inte för
denna uttryckligen beställda enkla miljö med tom outcomes-map. Den nya kedjan
återanvänder de befintliga CLI-kontrakten och auditens identiteter direkt. Den
ersätter inte Fas 1B:s fortfarande återstående scenario-set-implementation.

Etappen bevisar att CE3 kan verifiera alla sex scripts och att detta begränsade
söklager kan redovisa deras mål och täckning. Den bevisar inte generell nåbarhet,
permanent förlorade beslut, optimalitet, adaptiva policyer, kundnytta eller
fullständig täckning utanför den deklarerade sökrymden.
