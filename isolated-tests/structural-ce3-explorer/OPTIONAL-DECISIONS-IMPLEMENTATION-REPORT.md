# Valfria beslut — minsta implementationsetapp

Implementerad 2026-10-22. **PROCEED till oberoende granskning** av denna isolerade
syntetiska etapp. Ingen integration eller push. Arkitekturförslaget behövde ingen
alternativ arkitektur eller ändring av kärnsemantik. B1–B5 har implementations-
och testbevis nedan; oberoende godkännande av den nya ändringen återstår.

## Bas och avgränsning

Utgångspunkt är `85e19b09f5e5b1daca23873efb33b53f533e7388` på
`decision-flow-demo-v1`, med endast arkitekturrapporten tillagd i dess direkta
barn `250f0210f44cfb1262885e7786c20107a7d8af52`. Rapporten lästes i sin helhet,
inklusive §8, mot tidigare lästa repo-instruktioner, båda ursprungliga auditer,
kapabilitetsbaslinje/läsanvisning och explorer-/scenario-/slot-/tidsmålskontrakt,
implementationer och granskningar. Faktisk generering, materialisering,
observation och verifiering kontrollerades.

Branch-/worktreeinventering fann ingen pågående implementation av valfria
beslut. En enda implementationsbranch `codex/ce3-optional-decisions` skapades
från rapportcommitten, i `/private/tmp/ce3-optional-decisions-implementation`.
Arkitekturworktreen, huvudspåret, onboarding och alternativa implementationer
lämnades kvar. Ingen utcheckning eller städning gjordes i deras arbetskopior.

Ändringens fem existerande filer är explorer-README samt `contracts.py`,
`scenario_contracts.py`, `scenario_runner.py` och `observe.py`. Nya filer är
`selection.py`, två syntetiska fixturefiler, `selection_tests/test_selection.py`,
[det normativa kontraktet](OPTIONAL-DECISIONS-FORMAT.md) och denna rapport.
Alla 2 204 övriga av de 2 209 initialt spårade filerna är byteidentiska med
startsnapshotten. Särskilt replay, audit, schema, profil, `temporal_goals.py`,
äldre fixtures/pins, onboarding, SR och UI är oförändrade.

Kapabilitetsbaslinje v1 markeras i README och det nya formatdokumentet som
**tidigare omfattning**, genom scenario /3. Dess historiska JSON och läsanvisning
är inte omskrivna. Purpose-grinden kräver fortsatt `synthetic_integration_test`.
Ingen pilot-ingång eller alternativ purpose införs.

## Levererat kontrakt och exakt sökrymd

Scenario /4 väljer en mängd A ur hela modellens 1–6 beslut U. Required R och
optional O måste vara en exakt disjunkt partition av U. R ingår alltid.
Disjunkta grupper om minst två optional-ID:n väljer exakt ett eller högst ett.
Ogrupperade optional väljs oberoende. `allow_empty` är obligatorisk bool och
upphäver aldrig R eller exakt-ett-grupper. Inga operativa villkor läses av
urvalsmodulen; befintlig replay ensam verkställer förvillkor och effekter.

För varje tillåten mängd finns alla permutationer, med exakt ett attempt per
valt beslut. Med r obligatoriska, f ogrupperade optional, exakt-ett-storlekar
a_i och högst-ett-storlekar b_j är:

```text
P(z) = z^r (1+z)^f ∏(a_i z) ∏(1+b_j z)
c_k = [z^k] P(z); c_0 = 0 om allow_empty=false
C = Σ c_k k!; M = C × antal deklarerade scenarier
Kmax = r + f + antal grupper
```

Exakt Kmax stigande heltalsslots deklareras inom clock. Ett ord av längd k
använder de första k slotsen. Att ta bort X från PXU vid [0,2,4] ger PU vid
[0,2], ingen WAIT vid 2. Tom kandidat har steps={} men kör hela horisonten.
Initialt uppnått reach_by kan vara sant trots senare förlust som fäller
terminal/always. Samtliga valda försök körs även efter uppnått mål, utan
retry, early stop, fallback eller anpassning till utfall.

Hela modellen, sources och full outcomes-bindning behålls även för beslut som
utelämnas. Samma fullständiga script gäller i alla scenarier; endast externa
outcomes varierar. Tekniska fel ger UNKNOWN, ett auditerat blockerat valt
försök ger ett certifierat falskt mål. Utelämnade beslut är inga försök.

Grindarna **C≤720 och M≤2160** gäller före kandidater, inputmaterialisering och
utmatningskataloger, även vid direkta kandidat-/materialiseringsanrop. Sex
helt valfria beslut med empty ger 1957 och avvisas även med körbudget 0;
fem ger 326. Sex obligatoriska ger 720 och tillåter högst tre scenarier.
Körbudget 0..M ändrar aldrig den stödda sökrymden eller den förväntade populationen.

Produktionsvägen bygger valprodukter och använder `itertools.permutations`.
Freeze/verify prövar högst 64 bitmasker med direkta kardinalitetskrav och
faktoradisk permutationsavkodning. Polynomräkningen är en tredje oberoende
antalsväg. Mängd och innehåll kontrolleras, inte bara antal. Det literalbaserade
facit skrevs före implementationen och läses endast av testerna. Små gemensamma
identitets-/materialiseringsfunktioner kontrolleras med direkta full-input-orakel.

Körordning är **kandidatlängd, lexikografiskt ord, deklarerad scenarioordning**.
Verify härleder den från den oberoende populationen. Kvarvarande försöksposter,
även tomma och failure-only, räknas mot budgeten och måste ligga i tillåtet
prefix. För stort antal eller fel prefix ger INVALID även när vissa cellmål
kan certifieras separat. Verifiering är skrivskyddad, startar aldrig replay
eller subprocesser och läser inte result.json som bevis.

## Versioner och kandidatrelativt försökskrav

| Kontrakt | Fryst version |
|---|---|
| Problem och yttre cell/manifest/pins/execution/attempt/run/observation/result | ce3-scenario-…/4 |
| Sökgrammatik och slotpolicy | selected_permutations_once/1, prefix/1 |
| Sökrymd/kandidat | ce3-scenario-search-space/3, ce3-scenario-candidate/3 |
| Urvalsdefinition | ce3-selection-definition/1 |
| Mål | ce3-history-goal/2, acceptance_scope=candidate_script |
| Målprojektion | ce3-goal-observation/3 med selection_evidence |

Det nya målet kräver all_attempts_accepted=true och återanvänder exakt de gamla
tidsoperatorernas validator och projektion. Problemets beslutsmängd ändras inte
för målbedömningen. Urval, obligatoriska beslut, grupper, kandidat-/plan-ID och
förväntade entries återhärleds från det betrodda faktiska scriptet. Hela scriptet
måste vara en kanonisk prefixkandidat. Efter färsk full audit måste historikens
försöksrader matcha entries exakt i antal, beslut, steg, position och ordning;
alla måste vara decision_executed. Rätt antal med fel beslut räcker inte.

Kanonisering, payloadfält och samtliga hashbindningar finns i
[OPTIONAL-DECISIONS-FORMAT.md](OPTIONAL-DECISIONS-FORMAT.md). Äldre explorer /1
och scenario /1–/3 behåller egna grammatik-/målbetydelser och ID-definitioner.
Nya /4-fält accepteras inte tyst i gamla versioner. Arkiverade körpaket kräver
fortsatt sin registrerade build/runtime; nya filhashar är ingen migration.

## Blockerare §8

| Blockerare | Implementerat stängningsbevis | Nya testnummer |
|---|---|---|
| B1, urval/utelämning | Strikt versionsgrind, exakt partition, disjunkta grupper, prefix, explicit empty, typ-/referensprov | 02–09, 11, 24 |
| B2, full population | Separata produkt- och bitmaskvägar, polynomantal, literal-facit; omhashat bortfall av hel valmängd/cell, dublett/extra/innehåll | 01–03, 09–10, 12–13, 24 |
| B3, accepterade försök | Exakt scriptbunden projektion med urvalsbevis; omitted/blocked skiljs; required/gruppkrav verifieras | 04–06, 14–15, 23, 25 |
| B4, identitet/budget | Versions- och kanoniseringsprov, förfalskade bevis, 0-budget, längd-/scenarioordning, misslyckade försök och fel prefix | 11–19, 22 |
| B5, bevarande | Full modell/outcomes, samtliga eventbanor, UNKNOWN-isolering, skrivskyddad verify, äldre regressioner och bytekontroll | 01, 06, 20–25 samt äldre sviter |

Dessa är implementationsbevis för den avgränsade etappen. Oberoende granskning
av de nya bevisen återstår enligt beställningen. Inga kända funktionella
blockerare inom denna grammatik kvarstår. Adaptiva policyer, val av slotdelmängd,
pruning, ranking, retries/resume och pilotgodkännande ingår inte i leveransen.

## Acceptans och regression

§9 används oförändrat: P obligatorisk, U/N exakt ett, X fri optional, slots
[0,2,4], horizon 5, approved/rejected/absent. Polynom 2z²+2z³ ger
**16 kandidater × 3 scenarier = 48 celler**. Alla 48 kördes genom vanlig CLI
replay och separat CLI-audit; testet kontrollerar samtliga 96 anrop.

| Scenario | Exakt positiva kandidatord |
|---|---|
| approved | PU, PN, PUX, PNX |
| rejected | PN, PNX |
| absent | PN, PNX |

Övriga 40 celler är certifierat negativa. Exakt 8 positiva cellmål och exakt
**PN och PNX robust TRUE**. Högst-ett-varianten har 19 kandidater/57 celler,
samma 8 positiva. Två disjunkta grupper och fri optional ger det separat
handräknade antalet 38. Två fria optional med empty ger fem kandidatord.

Slutkontroll körd med Python 3.9.6 och standardbiblioteket. **214 tester PASS**:

| Svit | Antal |
|---|---:|
| selection_tests | 25 |
| tests, inklusive befintliga 34 fall/654 eventbanor | 27 |
| scenario_tests | 22 |
| fixed_slots_tests | 19 |
| temporal_tests | 19 |
| review_tests | 19 |
| scenario_review_tests | 13 |
| fixed_slots_review_tests | 17 |
| temporal_review_tests | 15 |
| budget_tests | 8 |
| replay/verification | 27 |
| budget_review_tests, oförändrat exporterad från 3ab8948 | 3 |

De tidigare granskade målsvaren bevaras: originalets PQX/PXQ/XPQ; scenario /1
PXQ robust; fixed-slots PXQT/PXTQ/PTXQ/TPXQ/TXPQ robusta; tidsmålets komponenter
[true,false,true,true,false] och samlat false trots accepterade försök.
Test 25 jämför dessutom nya all-required-planer mot /3: identiska materiella
historiker och målprojektionernas pathbevis, med både ett blockerat och ett
accepterat kandidatord. Nya identiteter behöver inte vara identiska.

De nya testerna angriper också fullständigt omhashade falska populationer,
felaktiga urvalsbevis, fel script/kandidatlängd och budgetprefix, borttagen
negativ eventbana, korrupt gzip, replay-limits, timeout och ModelError.
Försöksgrinden gäller även när endast input, started eller failure återstår.
Ett enda misslyckat försök utanför budget=1-prefixet avvisas trots rätt antal.

Efter den första gröna körningen skärptes stödgrinden även för direkta
materialiseringshjälpare. Slutkörningen upprepade alla ovanstående sviter på
den slutliga koden. Inga nya produktionsändringar gjordes efter den körningen.

## Reproduktion och lokala evidenspaket

Exakta freeze/run/verify-kommandon och partial-körning finns i
[formatdokumentets Reproduction](OPTIONAL-DECISIONS-FORMAT.md#reproduction).
De kördes med nya destinationer, med utfall freeze=0, run=0, verify=0,
partial max_cells=4=2. Partial behåller alla 48 celler: fyra CERTIFIED och
44 NOT_RUN/UNKNOWN. Filinnehåll och mtime var oförändrade efter verify.

Lokala granskningsartefakter, inte incheckade:

- `/tmp/ce3-optional-frozen`: manifest och externa pins.
- `/tmp/ce3-optional-full`: komplett körpaket med replay/audit för 48 celler.
- `/tmp/ce3-optional-partial`: budget 4.
- `/private/tmp/ce3-optional-final-regression`: slutliga testloggar per svit.
- `/private/tmp/ce3-optional-regression/cli-*.log`: dokumenterade CLI-körningar.

Betrodda pins för fixturen (behåll utanför körpaketet):

```text
problem_id   14e6384126acf9620b169ff1979ea558285d285d3b1c9e9072125b49407504b4
manifest_id  b3aca18d4dfc8cfac54400bbacad4b8cdbd92557680521cf2270e1d6c2ad09e4
build_id     d4c049fb4613fcaaa9ed2856a81653c9a0beb989fcef708f75eb4a1be2db105f
runtime_id   b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d
result_id    b0d6a13619ac6ef6642d67632767cfce6360d275742423c49516a05a17a5edaf
```

Result-ID ovan gäller just denna förekomst; nya UUID:n ändrar det vid en ny
körning. Pythonversionen ingår i runtime-ID. Build-ID binder de faktiskt
exekverade explorer-Pythonfilerna; rapporten ingår inte i dess hash.

Kör de incheckade sviterna från reporoten:

```sh
for suite in selection_tests tests scenario_tests fixed_slots_tests temporal_tests review_tests scenario_review_tests fixed_slots_review_tests temporal_review_tests budget_tests; do
  python3 -B -m unittest discover -s "isolated-tests/structural-ce3-explorer/$suite" -p 'test_*.py' -v || exit 1
done
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Budgetgranskningen finns på granskningscommitten, inte huvudbaslinjen. Den
exporterades oförändrad till en temporär katalog och kördes mot denna kod via
CE3_BUDGET_REVIEW_SOURCE; GIT_DIR/GIT_WORK_TREE pekade på denna worktree så att
dess historiska jämförelse kunde läsa 362f647 utan checkout. Reproduktion:

```sh
review_root=$(mktemp -d /tmp/ce3-budget-review-XXXXXX)
review_file="$review_root/isolated-tests/structural-ce3-explorer/budget_review_tests/test_review_d24d6d1.py"
mkdir -p "$(dirname "$review_file")"
git show 3ab8948:isolated-tests/structural-ce3-explorer/budget_review_tests/test_review_d24d6d1.py > "$review_file"
CE3_BUDGET_REVIEW_SOURCE="$PWD/isolated-tests/structural-ce3-explorer" GIT_DIR="$(git rev-parse --absolute-git-dir)" GIT_WORK_TREE="$PWD" python3 -B "$review_file"
```

## Kvarstående omfattningsgränser och ansvar

Maskinen verifierar deklarationens syntaktiska urval, fasta tider, full
population, input-/historik-/målbindning, budgetprefix, full audit och
målresultat inom den deklarerade scenariomängden. Hashar är inga signaturer.
Originalpins måste vara separat betrodda. Raderad försöksevidens och faktisk
väggklocksordning kan inte attesteras av ett återstående filpaket.

Användare/domänansvarig måste bekräfta att ett beslut verkligen får utelämnas,
att gruppkraven är riktiga, att prefixets tidigareläggning är avsedd, att
tom kandidat är meningsfull, samt modell, mål, tidsskala, scenarios och källstöd.
Varken 8 positiva mål, full täckning eller ett nytt kontraktsversionsnummer
bekräftar att antagandena beskriver en verklig kund. Arkitekturrapportens
separata pilotväg och modellbekräftelse återstår; purpose är fortfarande låst.
Ingen full produktifiering krävs eller påbörjas av denna ändring.
