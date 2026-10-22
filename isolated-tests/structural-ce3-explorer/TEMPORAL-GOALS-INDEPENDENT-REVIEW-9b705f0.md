# Oberoende kritisk granskning av tidsmål i CE3

2026-10-22. **Verdict: PASS inom det deklarerade tidsmålskontraktet.**

Granskad commit: `9b705f04f8756c9c0bb9ce43f427a6c3253a4dd9` på
`codex/ce3-temporal-goals`. Jämförelsebas:
`d24d6d1388542dead140226bc0e77406c0037b9c`.

Inga bekräftade implementationsfel eller nödvändiga rättningar hittades i
den granskade omfattningen. **189 testmetoder passerade**, varav 15 nya
oberoende granskningstester med flera underfall. Inga skips eller expected
failures. Dokumentationens exempel reproducerades med färsk freeze/run/verify.

Bedömningen bygger på kodgranskning, egna deklarerade modeller, handhärledda
tillståndsförlopp och försök att förfalska kompletta körpaket. Leveransrapportens
påståenden behandlades som hypoteser. Resultatet är inte ett formellt bevis för
alla modeller eller en extern person-/organisationsattestation.

## Isolering, instruktioner och underlag

En ny worktree skapades på exakt granskningscommitten i
`/private/tmp/ce3-temporal-review-9b705f0`, på den separata branchen
`codex/review-temporal-9b705f0`. Startstatus var ren. Den ursprungliga
arbetskopian på `d24d6d1` och implementationsworktreen på `9b705f0` lämnades
orörda. Git behövde särskild skrivrätt för worktree-/branchmetadata i det
gemensamma repositoryts `.git`; inga implementationer kopierades tillbaka.

Repositoryrots README:s pilotlåsning lästes. Inga tillämpliga `AGENTS.md`
hittades i repositoryt eller kontrollerade föräldrakataloger. Uppdraget
auktoriserar endast denna isolerade granskning, rapport och tester.

Underlag som lästes:

- `TEMPORAL-GOALS-ARCHITECTURE.md`, `TEMPORAL-GOALS-FORMAT.md` och
  `TEMPORAL-GOALS-REPORT.md`, den nya fixturen, testerna och hela ändringsdiffen.
- `FORMAT.md`, `SCENARIO-FORMAT.md`, `FIXED-SLOTS-FORMAT.md` och relevanta
  gransknings-/rättningsavsnitt i `INDEPENDENT-REVIEW-5429b52.md`,
  `R1-GZIP-FIX-REPORT.md`, `SCENARIO-INDEPENDENT-REVIEW-7dab9a0.md`,
  `FIXED-SLOTS-INDEPENDENT-REVIEW-12e777c.md` och
  `FIXED-SLOTS-R1-BUDGET-FIX-REPORT.md`.
- Budgetgranskningens `FIXED-SLOTS-R1-INDEPENDENT-REVIEW-d24d6d1.md` och
  tre tester lästes/exporterades direkt ur `3ab8948`, utan checkout eller integration.
- Faktisk kod för målvalidering/-projektion, scenariokontrakt, run/verify,
  budgetprefix, codec/bridge samt replay, transitions, schema, profil och audit.
- Färsk full before/after-historik och audit från dokumentationsexemplet samt
  de egna testmodellerna. Inga gamla `/tmp`-körningar användes som resultatfacit.

Nedan betyder E `isolated-tests/structural-ce3-explorer/` och R
`isolated-tests/structural-ce3-replay/`. Implementationsrader avser exakt
`9b705f0`. T01–T15 finns i
`E/temporal_review_tests/test_review_9b705f0.py`.

## Fynd och prövade garantier

**Inga öppna P0–P3-fynd.** Tabellen redovisar reproduktion, kodankare och
förväntat/faktiskt beteende för de efterfrågade garantierna; PASS-raderna är
kontroller, inte påstådda fel. Varje T-test kan köras med `-k test_XX` enligt
kommandot längre ned.

| Garanti och kodankare | Reproduktion / oberoende förväntan | Faktiskt |
|---|---|---|
| Snapshottid, before/after, advance. E/temporal_goals.py:41–43,57–64; R/core/transitions.py:30–46 | T02: start −2, kontrolltid −1, event först vid 0. Exakt 17 punktreferenser: båda sidor av rad 0–7 och enbart 8.before. Rad 4.after har tid −1; rad 8.after har tid 0 och ska uteslutas trots radtid −1. | PASS: hela ordnade listan stämmer. always(x=false)=TRUE, reach_by(x=true)=FALSE. Ingen gammal radtid läcker in. |
| Initialtillstånd, negativa tider, inklusiva gränser, kontroll mellan övergångar. E/temporal_goals.py:35–38,57–62 | T01: true → false vid start+1 → true vid start+3, för start −2 och 5. Kontrollera fem gränser från start till start+4. always(true): T,F,F,F,F; reach(false): F,T,T,T,T. | PASS för båda tidsförskjutningarna, inklusive tomt mellansteg. Faktiska eventövergångar jämförs med literal-listor. |
| Enpunktsintervall, start=horizon. Samma ankare | T03: tider −3, 0 och 7; initial x växlas av beslut vid samma tid. För initial false respektive true ska [always(true),reach(true),terminal(true)] vara [F,T,T] respektive [F,T,F]. | PASS: fem rader/tio punkter; initialt vittne är 0.before, annars beslutets 3.after. |
| Brott som återställs samma steg och senare övergångar. E/temporal_goals.py:58–70 | T04: initial true, event vid 1 sänker x, beslut vid 1 återställer. always till 0 TRUE, till 1 FALSE, reach(false) till 1 TRUE, terminal TRUE. | PASS: brottet finns på 6.after trots återställning inom samma tidssteg. Tidig komponent påverkas inte. |
| Reach före/exakt/efter deadline; tidigare uppnått får förloras. E/temporal_goals.py:59–70 | T09: sätt x vid 0,1,2 för deadline 1, separat via event och beslut: T,T,F. T01/T03/T05 når predikat och förlorar det igen. | PASS. Inga vittnen eller täckningspunkter efter deadline. Initial och tidigare uppfyllelse behålls. |
| Gemensam punkt inom fältkonjunktion, olika mellan komponenter. E/temporal_goals.py:46–47,61–62 | T07: (x,y) går (F,F) → (T,F) vid 1 → (F,T) atomiskt vid 2. Gemensam reach(x=true,y=true) FALSE; separata reach-komponenter TRUE med vittnen vid 1 respektive 2. | PASS. Ingen intern ordning på set-fälten skapar ett fiktivt vittne. |
| Alla komponenter på alla banor; inget gemensamt vittne mellan banor. E/observe.py:26,47–61 | T05/T06 använder två eventordningar med helt skilda vittnestider, detaljer nedan. Vid deadline 2 klarar båda reach; vid deadline 1 klarar bara ena. | PASS: samlat TRUE respektive FALSE. Samtliga tre komponenter i T06 redovisas för båda banorna. |
| Komponent, försökskrav och helhetsmål hålls isär. E/observe.py:33–35,50–61 | T08: tidiga always/reach är uppfyllda; sänk x vid 2 och lägg till guard x=true på sista beslutet vid 3. | PASS: komponenternas hela evidens är identisk före/efter guardändringen. components_satisfied=TRUE, all_attempts_accepted=FALSE, goal_satisfied=FALSE. |
| Ofullständig historik, borttagen bana, auditfel, limits och gzip. E/observe.py:7–18; E/scenario_runner.py:164–194; E/bridge.py:19–24 | T12 tar bort positiv/negativ bana, rad eller historikfil och förfalskar audit. T13 skadar gzipheader, trailer, CRC och andra medlem. T14 kör alla tre limits samt ett sent ModelError efter ett initialt vittne. | PASS: UNKNOWN/null, ingen certifierad bana eller nytt komponentbevis. Spärrad komponentprojektion anropas inte före godkänd audit. Ofullständiga run skapar ingen observation.json. |
| Omhashad evidens måste omberäknas. E/scenario_runner.py:179–186 | T10 ändrar vittnets state/tid/sida, tar bort motexempel/täckningspunkt, vänder punktordning eller fabricerar TRUE. Observation och record hashas om. | PASS: samtliga ger UNKNOWN med `Observation mismatch`. Trasig result.json används inte som bevis. |
| Ändrad deadline/operator får inte återanvända gammalt bevis. E/scenario_contracts.py:83–121; E/scenario_runner.py:123–128,181–186 | T11 byter deadline 2→1 eller reach_by→always; skapar nya pins och reparerar alla yttre bindningar, cellkatalog, operator-/intervalltext och hashvärden men behåller gammalt positivt bevis. | PASS: gamla pins avvisas på identitet. Nya pins med gammal projektion ger UNKNOWN/Observation mismatch. Färsk körning av nya målet ger korrekt certifierat FALSE. |
| Skrivskyddad verify utan replay. E/scenario_runner.py:120–194 | Testhjälparen spärrar replay, CLI, subprocess.run/Popen, write_bundle och skrivlägen i open/Path.open; jämför filer och mtime före/efter. Körs på riktiga och manipulerade paket. | PASS. Ingen replay eller skrivning; fulla oförvanskade paket ger samma resultat som run. |
| Strikt tidsvalidering. E/temporal_goals.py:35–38 | T15: både operatorer, negativa tillåtna tider, nedre/övre gräns samt bool, float, string, null och tider utanför intervallet. | PASS: tillåtna gränser fungerar, ogiltiga avvisas före freeze. Befintlig T11 täcker även typade predikat, extra fält och fel operatorer. |

T12:s borttagna banor/rader får nya artefakthashar i record. Avvisningen
beror på färsk audit, inte bara en gammal filhash. T14 kontrollerar dessutom
`observe()` direkt med ett faktiskt ERROR-bundle vars `error.last_history`
innehåller en initial uppfylld punkt: hela certifieringskravet stoppar
projektion ändå. Den rena interna `components_for_path` är inte en separat
certifierings-API; kontraktet kräver dess auditerande anropare.

### Två banor med skilda vittnestider

T05 deklarerar initialt x=false, y=false, lock=false. Vid tid 0 körs två
events i båda ordningar: `early` sätter x=true endast om lock=false och
`lock` sätter lock=true. Vid 1 sätter `close` x=false,y=true endast om x=true.
Vid 2 sätter `late` x=true endast om y=false. Vid 3 sänker `reset` x.

| Eventordning vid 0 | Handhärlett förlopp | Första vittne | reach_by deadline 2 |
|---|---|---|---|
| early, lock | x blir true vid 0, false vid 1; late är inapplicable | tid 0, early.after | TRUE |
| lock, early | early och close är inapplicable; x blir true vid 2, false vid 3 | tid 2, late.after | TRUE |

Faktiska true-punkters snapshot-tider över hela körningen är `{0,1}` och
`{2,3}`: before-punkten vid respektive sänkning räknas också. Mängderna är
disjunkta. Inom deadline 2 är andra mängden `{2}`. Därmed finns inget gemensamt
vittnestillfälle mellan banorna, men varje bana uppfyller reach_by och cellen
blir korrekt TRUE. Ett no-op-beslut vid 3 accepteras på båda banorna.
Med deadline 1 blir komponentutfallen `[TRUE,FALSE]` och cellen FALSE.

## Färsk reproduktion av dokumentationsexemplet

Fristående CLI-kommandon kördes från granskningsworktreens rot, med nya
destinationer och pins utanför körpaketet:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/temporal-problem.json --output /private/tmp/ce3-review-9b705f0-evidence/frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/temporal-problem.json --manifest /private/tmp/ce3-review-9b705f0-evidence/frozen/manifest.json --pins /private/tmp/ce3-review-9b705f0-evidence/frozen/pins.json --output /private/tmp/ce3-review-9b705f0-evidence/example
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /private/tmp/ce3-review-9b705f0-evidence/frozen/pins.json --output /private/tmp/ce3-review-9b705f0-evidence/example
```

Alla tre gav exit 0; run och verify gav byteidentisk stdout. För att upprepa,
välj nya destinationsnamn: run/freeze vägrar skriva över befintliga kataloger.

Problem-ID och manifest-ID matchar dokumentationen exakt:

- `4afe82e811d7ec60f6d9328ab3f1e7f6c56473a05207c723bc101f47f1c3670c`
- `d9c4c09310b37ab21e0a09dfa1b6d7521106e6c330d7a8526fac00662982f25f`

Färsk audit: PASS, verified=true, all_event_permutations=true, en bana,
23 rader. Historiken visar initial flag=true, drop på 6.after vid 1,
restore på 15.after vid 3 och accepterat D vid 4. Terminalpunkten är
22.after vid 4. De fem komponentutfallen är `[TRUE,FALSE,TRUE,TRUE,FALSE]`;
stabilt count=0 och ej nådd latch=true har vardera 46 täckningspunkter.
Vittne/motexempel på rad 6 har state `{count:0,flag:false,latch:false}`.

All attempts är TRUE, cellmålet och robustheten FALSE, celltäckningen
COMPLETE. Detta är korrekt negativ målevidens, inte ett tekniskt fel.
Färskt result-ID:
`56af4fb63c1a4cf19e7297b1dfde0bd0ee9dc505aa8becdc1f91f4d6c075d52f`.
Nya försök har nya UUID:n; result-ID förväntas inte upprepas mellan runs.

## Äldre kontrakt, budget och oförändrad kärna

Diffen `d24d6d1..9b705f0` omfattar enbart elva explorerfiler. Inga ändringar
finns i replaykatalogen, inklusive schema, profil, transitions, audit och CLI.
Den nya observatören utvärderar typade likheter över auditerade snapshots;
den kör inga events, guards, effekter eller alternativ scheduler.

`contracts.py:59–61` aktiverar tidsmål enbart på uttrycklig begäran från
`scenario_contracts.py:44–45`, som kräver problem /3. Äldre /1-/2-vägar
behåller terminalkontraktet och sin sökgrammatik. Search-space/candidate
för /3 behåller /2-identitet; målbindningar får nya identiteter. Befintliga
temporal T11/T15 och äldre kontraktssviter passerade, inklusive /2-/3-
terminalekvivalens och avvisning av tidsmål under /2.

Budget-/prefixkontrollen i `runner.py:105–114` och
`scenario_runner.py:139–148,197` behåller sin betydelse. Hela populationen
kvarstår vid delkörning; antal kvarvarande försök och medlemskap i tillåtet
prefix kontrolleras separat från individuella mål. Budgetsvitens åtta tester,
den tidigare oberoende granskningens tre tester och temporal T16 passerade.
Det omfattar överantal, fel prefix trots rätt antal, tomma/ofullständiga
försöksposter, omvänd scenarioordning, nollbudget och bevarade individuella mål
vid INVALID batch. Den exporterade budgetgranskningen jämför dessutom riktiga
äldre `362f647`-paket med aktuell kod, utan att ändra någon checkout.

## Testkörningar

Python 3.9.6. Alla nedanstående sviter kördes färskt; tiderna är unittest-
tider i denna miljö. Vissa sviter kördes samtidigt och tiderna är inga
prestandagarantier.

| Svit | Testmetoder | Resultat | Sekunder |
|---|---:|---|---:|
| Egna temporal_review_tests | 15 | PASS | 4,327 |
| temporal_tests | 19 | PASS | 4,266 |
| tests | 27 | PASS | 99,618 |
| scenario_tests | 22 | PASS | 14,333 |
| review_tests | 19 | PASS | 8,675 |
| scenario_review_tests | 13 | PASS | 13,340 |
| fixed_slots_tests | 19 | PASS | 37,956 |
| fixed_slots_review_tests | 17 | PASS | 72,811 |
| budget_tests | 8 | PASS | 34,184 |
| Replay verification | 27 | PASS | 3,561 |
| Exporterade budget_review_tests från 3ab8948 | 3 | PASS | 37,691 |
| **Totalt** | **189** | **PASS** | |

Explorer/tests inkluderar färsk regression av 34 befintliga fall/654
eventbanor; dessa räknas inte som ytterligare unittest-metoder. Alla sviter
passerade vid första körningen i denna granskning. Ingen implementationskod
eller gammal testkod behövde rättas. Endast en förklarande kommentar i den
nya testfilen förtydligades efter körningen.

Körkommandot för varje svit, från repositoryroten:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/temporal_review_tests -p 'test_*.py' -v
```

Byt sista katalogen till respektive explorersvit ovan. Replay körs med
`-s isolated-tests/structural-ce3-replay/verification`. För exporterade
budgettester sattes `CE3_BUDGET_REVIEW_SOURCE` till denna worktrees
explorerkatalog, `GIT_WORK_TREE` till worktreens rot och `GIT_DIR` till
resultatet av `git rev-parse --absolute-git-dir`; testkoden ändrades inte.

Lokala körloggar, färskt exempel och bevarandeinventering finns under
`/private/tmp/ce3-review-9b705f0-evidence/`. Testerna skapar egna nya temporära
paket och behöver inte dessa kvarvarande artefakter för att reproduceras.

## Bevarande och slutsatsens gränser

SHA-256-inventeringen före/efter omfattar samtliga 2204 befintliga filer i
granskningsworktreen, exklusive gitmetadata. **Alla är byteidentiska.**
Endast denna rapport och den nya testfilen tillkommer här. Övriga lokala
branchreferenser är oförändrade. Arbetskopiors gitstatus jämfördes också:
i worktreen `c1d4` tillkom under arbetet den ospårade filen
`CE3-WSP-OUTREACH-CLAIMS-AUDIT.md`. Den har inte skapats, redigerats eller
tagits bort av denna granskning. Övriga kontrollerade arbetskopiors status
är oförändrad. Huvudcheckoutens befintliga ospårade filer har inte redigerats. Påståendet
om bytejämförelse gäller granskningsworktreen, inte en full inventering av
andra arbetskopiors ignorerade/lokala filer.

Ingen implementation ändras, ingen integration görs och inget pushas.
Rapport och nya granskningstester är det enda innehållet i granskningscommitten.

PASS avser heltalstider, inklusiva before/after-snapshots, fasta scripts,
deklarerade scenarier och full auditerad bantäckning. Interna deleffekter i
en atomisk övergång är inga punkter. Kontinuerlig tid, fri temporal logik,
modellens verklighetssanning, maximal resurs-/prestandatålighet och UI ingår
inte. Tillit förutsätter betrodd kod, separata pins och stabila filer; ingen
signering, samtidighetsattestation eller rekonstruktion av helt raderad
försökshistorik har prövats eller införts. Arkiverade paket kräver fortsatt
sin registrerade build. Dessa är kontrakts-/granskningsgränser, inga dolda
underkända tester. **Ingen nödvändig implementationsrättning identifierades.**
