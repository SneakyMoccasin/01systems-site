# Avgränsad oberoende granskning av budgeträttningen

Datum: 2026-10-21. **Verdict: PASS för budgeträttningen. R1/P2 kan stängas.**
Inga kvarstående fel hittades inom den granskade budget-/prefixgarantin.
Detta är en separat kod- och testgranskning, inte en ny fullständig motoraudit
eller extern personattestation. Ingen implementation har ändrats.

## Omfattning och bevarande

Start-HEAD var `d24d6d1388542dead140226bc0e77406c0037b9c`, samma commit som
`decision-flow-demo-v1`, med ren gitstatus och frikopplad HEAD i denna worktree.
Granskningen sparas på separat lokal branch `codex/review-budget-d24d6d1`.
Huvudcheckoutens branch och alternativet `codex/ce3-declared-fixed-slots`
på `7df45d6cb838fe4e9747f6740ada936c0d9f707d` lämnas orörda. Ingen push.

Läst: README:s repo-låsning, `FIXED-SLOTS-INDEPENDENT-REVIEW-12e777c.md`,
`FIXED-SLOTS-R1-BUDGET-FIX-REPORT.md`, `FORMAT.md`, `SCENARIO-FORMAT.md`,
`FIXED-SLOTS-FORMAT.md`, budgettesterna och berörda kodvägar.
Ingen tillämplig AGENTS.md hittades i arbetskopian eller dess föräldrakataloger.
Hela diffen `362f647..d24d6d1` granskades. Den innehåller två ändrade
produktionsfiler, rättningsrapporten, budgetsviten och uppdaterade R1-testkrav.

SHA-256-inventeringen `/tmp/ce3-budget-review-before.json` omfattar 2198
befintliga spårade/icke-ignorerade ospårade filer. Alla är byteidentiska efter
granskningen. Endast denna rapport och `budget_review_tests/test_review_d24d6d1.py`
tillkommer. Testartefakter och exporterad äldre kod ligger i privata
TemporaryDirectory-kataloger som rensas efter testerna.

## Reproduktion och utfall

T01–T03 nedan finns i den nya granskningssviten. T01 exporterar nödvändiga
originalfiler från `362f647` med `git ls-tree`/`git show` till temporär katalog.
Ingen checkout, kodpatch, mockad certifiering eller kringgång av buildbindning
används. Båda versionerna skapar egna färska fulla artefakter via riktig
replay-/audit-CLI. Deras mål, status per medlem, scenariernas eventtäckning
och robusthetsvärden jämförs över hela populationen.

Angreppet ändrar budgeten till 0 och binder om spec, started, record samt
scenario-attempt/observation och observationens hash. Inputs, historiker och
auditbevis behålls. Externa pins ligger utanför det angripna paketet.

| Fullt riktigt paket, ombundet till budget 0 | `362f647` | `d24d6d1` |
|---|---|---|
| Explorer /1, 6 kandidater | COMPLETE, CLI 0 | INVALID, CLI 2 |
| Scenario /1, 18 celler | COMPLETE, CLI 0 | INVALID, CLI 2 |
| Scenario /2, 72 celler | COMPLETE, CLI 0 | INVALID, CLI 2 |

Alla individuella mål behålls i båda versionerna. Oförvanskade fulla paket
ger COMPLETE/CLI 0 och oförändrade mål-/robusthetsresultat jämfört med äldre
kod. Befintligt budgettest bekräftar också /2:s 25 positiva cellmål, 90
eventbanor och robust TRUE för exakt PXQT, PXTQ, PTXQ, TPXQ, TXPQ.

| Kontroll | Förväntat och faktiskt resultat |
|---|---|
| Rätt antal, fel prefix | Budgetsviten prövar 1/4 försök i alla tre kontrakt: INVALID trots komplett omsorterad enumeration. |
| Egen prefixhärledning, T02 | Rekursivt välj nästa oanvända sorterade deklarerade ID, korsa varje ord med deklarerad scenarioordning. Ingen produktionsgenerator eller `execution_prefix_valid` används som facit. Hela logiska populationen jämförs före mappning till cell-ID. |
| Omvänd scenarioordning, T02 | /1 och /2 kör fem riktiga celler. /2 använder osorterade `[X,T,Q,P]`. De första fem matchar eget facit. Budget 4 med de fyra första ger INCOMPLETE; byt fjärde mot femte och behåll antal 4: INVALID. CLI 2 i båda fallen. Enumeration reverseras också. |
| Försöksevidens | För alla tre kontrakt: ett certifierat försök plus tom katalog, input-only, started-only eller failure-only ger INCOMPLETE vid budget 2 och INVALID vid budget 1. Endast den andra posten kvar ger fortfarande INVALID vid budget 1, trots rätt antal. |
| Misslyckat verkligt körförsök | Budgetsviten injicerar TimeoutExpired på andra replayanropet. Failure sparas, ingen tredje medlem startas, första målet behålls. Två försök/ett certifikat är INCOMPLETE med budget 2, INVALID med budget 1. |
| Giltiga delkörningar | Färska budgetar 0/1/4 behåller samtliga 6/18/72 medlemmar; ej körda får NOT_RUN/UNKNOWN/null. Ofullständig evidens får UNVERIFIED/UNKNOWN/null. Nollbudget ger robust UNKNOWN. Saknad tidigare evidens inom prefixet förblir INCOMPLETE. |
| Mål kontra batch | T01/T03 jämför samtliga individuella mål och robusthetsvärden före/efter budgetbrott. INVALID gör inga mål verksamhetsmässigt falska. |
| Skrivskydd, result.json och replay | T01–T03 jämför filhashar/katalogposter före/efter verify och spärrar CLI-hjälparen, subprocess.run och core.replay.replay. T02/T03 använder trasig JSON-sammanfattning och gammal COMPLETE; färsk verify ignorerar båda utan omskrivning. |

## Kodbedömning och fynd

Inga nya avvikelser kräver fil/rad-fynd. Följande ankare avser `d24d6d1`:

- `runner.py:105–114,135–140`: alla direkta poster under runs räknas före
  certifiering; både antal och medlemskap i tillåtet prefix kontrolleras.
  Verifierat manifest rekonstrueras först (`123–131`).
- `scenario_runner.py:139–148`: kandidatens lexikala beslutsordning och
  deklarationens scenarioordning återställs från verifierat manifest;
  hashordningen på celler eller sparad enumeration kan inte flytta prefixet.
- `runner.py:170–186`, `scenario_runner.py:187–224`: individuell certifiering
  och målprojektion behålls; budgetbrott påverkar batchens INVALID-besked.

Diffkontrollen visar inga ändringar i replaykatalogen (inklusive schema,
profil, audit och CLI), workbench, contracts, scenario_contracts, fixed_slots,
enumerate_scripts, observe eller fixtures. Körloopar, sökdomän, formatversioner
och robusthetslogik är oförändrade. Ändrade verifieringsfiler ändrar som förut
explorer_build_id; gamla artefakter kräver fortfarande sin registrerade build.

## Exakt körda tester

Python 3.9.6. Kommandon från repositoryroten:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/budget_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/budget_review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/budget_review_tests -p 'test_*.py' -k test_01 -k test_03 -v
git diff --check
```

Befintliga budgettester: **8 PASS, 33,771 s**. Nya tester: **3 unika PASS i
slutläge**. Första körningen (26,604 s) passerade T02; T01/T03 föll på ett
fel i granskningshjälparen som antog att explorer /1 har scenariofältet
event_path_coverage. Hjälparen korrigerades enbart för denna formatskillnad;
riktad omkörning av T01/T03 gav **2 PASS, 33,303 s**. Inga expected failures.
Totalt 11 unika passerade tester med underfall. Ingen bredare regression
kördes: inget produktionsfynd motiverade den.

Loggar: `/tmp/ce3-budget-review-existing.log`,
`/tmp/ce3-budget-review-independent.log` och
`/tmp/ce3-budget-review-independent-final.log`. T01 kör även riktiga verify-CLI
med separat `--pins` för äldre budget-0-paket (exit 0), nya fulla (0) och nya
budget-0-paket (2). T02 kör verify-CLI för båda egna prefixfallen (2).

## Kvarstående gränser

Helt raderad försöksevidens kan inte återskapas. Verifieraren bevisar inte
historisk väggklocksordning, raderade retries eller processens autenticitet.
Den prövar kvarvarande evidens mot ett deklarerat tillåtet prefix. Saknade
förväntade körningar förblir UNKNOWN och hindrar COMPLETE. Ingen journal,
signering, samtidighets-/filsystemsattestation eller verklig lång OS-timeout
har tillförts eller certifierats. Detta begränsar inte slutsatsen att just
R1:s statiskt motsägelsefulla budgetpaket nu avvisas korrekt.
