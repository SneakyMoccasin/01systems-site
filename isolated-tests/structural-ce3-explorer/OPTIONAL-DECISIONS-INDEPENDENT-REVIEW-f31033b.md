# Oberoende granskning av valfria beslut i f31033b

2026-10-22. **PASS** inom det deklarerade syntetiska `/4`-kontraktet.
Inga reproducerbara implementationsfel eller blockerande kontraktsavvikelser
hittades. Samtliga 12 prioriterade kontrollområden har prövats. Bedömningen
är inte ett pilotgodkännande eller ett bevis om planer utanför grammatiken.

Granskad commit: `f31033b57f6fad7ccccf2912692746710ba6648a`, på
`codex/ce3-optional-decisions`. Baslinje:
`85e19b09f5e5b1daca23873efb33b53f533e7388`.
Granskningsbranch: `codex/review-optional-f31033b`.
Separat worktree: `/private/tmp/ce3-optional-review-f31033b`.

## Oberoende, underlag och gitkontroll

Worktreen skapades från exakt den granskade committen, utan merge eller
cherry-pick. `git merge-base 85e19b0 f31033b` gav `85e19b0`; ancestry-path
består av arkitekturcommitten `250f021` följd av `f31033b`.
Implementationsbranchens HEAD var exakt `f31033b`. Startstatus i både
implementationens och granskningens worktree var ren. Den ursprungliga
Codex-worktreen låg kvar detached på `85e19b0`.

Ingen tillämplig AGENTS.md hittades i repositoryt, granskningsworktreen eller
kontrollerade föräldrakataloger. Rot-README:s produktlåsning och explorer-/replay-
README lästes. Uppdraget omfattar endast den isolerade granskningen.
Git behövde separat skrivrätt till det gemensamma repots metadata för att skapa
worktree/branch och senare committa granskningsleveransen.

Läst och granskat: hela OPTIONAL-DECISIONS-ARCHITECTURE-PROPOSAL, FORMAT och
IMPLEMENTATION-REPORT; diffen `85e19b0..f31033b`; äldre explorer-, scenario-,
fixed-slots- och temporal-format; budgeträttningsrapporten; faktisk codec,
schema, replay, audit, urvalsmodul, materialisering, målprojektion och
freeze/run/verify. Tidigare testresultat användes som påståenden att kontrollera,
inte som ersättning för färska körningar.

Diffen omfattar 12 filer. Endast fyra befintliga Pythonfiler ändras:
`contracts.py`, `scenario_contracts.py`, `scenario_runner.py`, `observe.py`.
`selection.py` och dess tester tillkommer. Replay, audit, schema, temporalmodul,
äldre fixtures, budgethjälparen och purpose-värdet ändras inte.

Det nya testet är
[optional_review_tests/test_review_f31033b.py](optional_review_tests/test_review_f31033b.py).
Det importerar inga levererade testhjälpare. Förväntad ordpopulation härleds
med rekursiv utvidgning av distinkta ord och explicita mängdkrav, utan produkt,
permutationsfunktion, bitmask, faktoradisk avkodning eller produktionsmaterialiserare.
Koefficienterna härleds separat från de unika valmängderna. Testet innehåller
egen JSON/LF-hashning och direkt konstruktion av kompletta `ce3-run/1`-input.
Vanlig CLI-replay och separat CLI-audit används som faktisk exekvering.

## Acceptansfixtur: härledning före facitjämförelse

R={P}; exakt ett av N/U; X fritt. Därmed
`P(z)=z·2z·(1+z)=2z²+2z³`, och `C=2·2!+2·3!=16`, `M=16·3=48`.
P måste accepteras före leveransbeslutet. N kräver prepared; U kräver dessutom
approved efter response-eventet vid 1. Valt X måste komma efter leveransen.
Leveransen ska nås senast 2, safe ändras aldrig. Följaktligen är PN och PNX
positiva i alla scenarier; PU och PUX endast i approved. Alla övriga ord har
minst ett blockerat försök eller missar tidsmålet.

`fixture_answer` beräknar denna regelhärledning och sparar en egen matris innan
sparat `optional-decisions-expected.json` läses. Därefter jämförs facit,
färsk explorerutdata och ytterligare **48 direkta full-input CLI replay/audit-par**.
Inputen byggs utan `materialize`, `candidate` eller `selection.script`.
Samtliga inputidentiteter och hela historikdokument matchar.

| Ord i faktisk kandidatordning | approved | rejected | absent | Robust |
|---|---|---|---|---|
| NP | false | false | false | FALSE |
| PN | true | true | true | TRUE |
| PU | true | false | false | FALSE |
| UP | false | false | false | FALSE |
| NPX | false | false | false | FALSE |
| NXP | false | false | false | FALSE |
| PNX | true | true | true | TRUE |
| PUX | true | false | false | FALSE |
| PXN | false | false | false | FALSE |
| PXU | false | false | false | FALSE |
| UPX | false | false | false | FALSE |
| UXP | false | false | false | FALSE |
| XNP | false | false | false | FALSE |
| XPN | false | false | false | FALSE |
| XPU | false | false | false | FALSE |
| XUP | false | false | false | FALSE |

Färsk CLI freeze/run/verify gav alla exit 0: **16 kandidater, 48 CERTIFIED
celler, 48 auditerade eventbanor, 8 positiva cellmål, endast PN/PNX robusta**.
Detta verifierar implementationsrapportens centrala acceptanspåståenden.

## Kontrollresultat och kodankare

Radnummer avser `f31033b`. T01–T20 avser de nya testmetodernas nummer.
Alla förväntade beteenden nedan observerades; tabellen är verifieringsresultat,
inte en lista över implementationsfel.

| Kontroll / kodankare | Reproduktion och förväntat beteende | Faktiskt och garanti |
|---|---|---|
| 1. Partition och grupper. `selection.py:25–64,116–127` | T03: överlapp R/O, saknat/extra/dubblerat ID, överlappande grupper, required i grupp, singleton/dubblerad medlem, okänd gruppregel, fel flaggtyper. Även empty med required. | Avvisas. Båda enumeratorerna fungerar med helt opaka regelvärden och genererar även UP. Urval läser inte guards/effekter och gör inga operativa gallringar. |
| 2. Population. `selection.py:67–91,147–181`; `fixed_slots.py:49–65` | T02: rekursivt ord-/valmängdsorakel mot båda vägar och polynom; stäng av motsatt väg med felkastande spies. Fem fria optional-storlekar och fyra gruppvarianter. | Exakt innehåll, ordning och koefficienter stämmer. Ny sexbeslutskonfiguration beskrivs nedan och kördes fullt. |
| 3. Prefix. `selection.py:130–134,195–207` | T04: R={A,C}, O={B}, slots 0/2/4. A/B no-op, C sätter done; reach_by(2). Jämför AC och ABC samt direkt AC@0/4. T20: oanvänd slotnyckel, ledande nolla, extra entry och fel mode. | AC=true, ABC=false trots accepterade försök i båda. AC@0/4 ger tidsmål false men är inte en giltig prefixkandidat. Inga WAIT/empty keys. Alla deklarerade slots valideras även när de inte används. |
| 4. Kandidatrelativt försökskrav. `selection.py:195–225`; `observe.py:18–58` | T05–06: ändra beslut, tid, position, ordning, antal, blockering/skip; kör syntaktiskt otillåtna tomt/P/N/PUN direkt genom riktig replay/audit. | Exakta entrybindningar krävs. De fyra operativa körningarna får audit PASS men nekas målcertifiering av urvalsgrinden. Utelämnat B ger inget misslyckande; valt blockerat B ger CERTIFIED/false trots sant state-mål. |
| 5. Tom kandidat. `selection.py:123,130–134,225`; `observe.py:30–69` | T07: initial done=true, två samtidiga drop/restore vid horizon=5, empty script; terminal/reach_by(0)/always(5). | Full horisont, två eventbanor, inga försök. Försökskravet true; reach_by true med 0.before, always false, terminal olika mellan banorna. Helhetsmålet false. T20 prövar även start=horizon=-2. |
| 6. Hela modellen och outcomes. `contracts.py:14–22,44–50`; `scenario_contracts.py:91–96` | T08: X schemalägger external response men utelämnas i PN; initiala events tas bort. Fulla direkta input jämförs mellan scenarier; saknat unused outcome och fel i X:s oanvända regel prövas. | Ingen eventköpost från utelämnat X, response kvar i unused_outcomes; full regel och full bindning finns kvar. Saknad bindning/ogiltig oanvänd regel avvisas. Script/modell/källor identiska mellan scenarier. |
| 7. Identitet. `selection.py:94–144`; `scenario_runner.py:178–187` | T09–10: omordna R/O/grupper/medlemmar; ändra gruppkrav och allow_empty; förfalska selected/omitted/required, kandidatord/längd och entries; omhasha observation, record, manifest och pins. | Mängdomordning bevarar sök-/kandidat-/planidentitet, men ändrar problem/pins. Gruppkrav/allow_empty ändrar selection/search/candidate även när PN-scriptet är identiskt. Förfalskningar nekas; skadad observation blir UNKNOWN, övriga 47 celler förblir certifierade. |
| 8. Full domän. `scenario_contracts.py:109–142,162–180`; `scenario_runner.py:124,138,178–187` | T11: ta bort hela {P,N}, båda ordningar och alla sex celler; justera polynomantal, enumeration, runs, manifest, externa/lokala pins, batch, attempt, observations-/recordbindningar och resultdigest. T12/T18: bibehåll antal med dubletter; koppla cell till fel kandidat; byt rejected-PN-script till PU med ny riktig replay/audit. | Det lokalt självkonsistenta 14/42-paketets medlemskontroll är COMPLETE, men full verify avvisar domän/pins med CLI 1. Dubletter/felkoppling avvisas; enumerationfel ger INVALID. Scriptbytet ger UNKNOWN för berörd cell, 47 andra förblir CERTIFIED. |
| 9. Budget och prefix. `selection.py:161,181`; `scenario_runner.py:140–149`; `runner.py:105–114` | T13–14: budget 0/11/12/13, gränsen UP→NPX, omvänd scenarioordning, omordnad enumeration, rätt antal med fel medlem. Behåll tom/input-only/started-only/failure-only/history-only post. | Längd, sedan ord, sedan deklarerat scenario följs. Enumeration kan inte flytta prefix. Alla kvarvarande försöksposter räknas; överbudget eller fel prefix ger INVALID, även med korrekta cellmål. Empty kandidat förbrukar första cellförsöket. |
| 10. Storleksgrind. `selection.py:35–37,67–91`; `scenario_contracts.py:46–47`; `contracts.py:15–16` | T15: 720 kandidater/2160 celler accepteras och materialiseras; fyra scenarier vid 720, sju beslut samt sex helt optional med/utan empty nekas. Spies förbjuder båda enumeratorer och materialisering vid överstorlek; run prövas med budget 0. | Inklusiva tak stämmer. Sex fria optional ger orakelantal 1957/1956 och avvisas före enumeration/input/outputkatalog. Fem ger 326. Liten budget upphäver inte stödtaket. Levererad T09 täcker också direkta materialiseringsgränser. |
| 11. Eventbanor/UNKNOWN/read-only. `observe.py:8–14,51–69`; `scenario_runner.py:120–198` | T07/T19: radera en bana och omhasha historik/observation/kvitto/record. T19 har positiv referensbana men negativ alternativ bana. T16: korrupt gzip, alla tre replay-limits, ModelError, trasig result.json; förbjud subprocess/replay/skrivhjälpare och jämför bytes/mtime. | Endast full all-path-audit kan certifiera. Saknad bana ger UNKNOWN, inte positivt eller negativt delbevis. Berörd cell isoleras. En saknad positiv PN-cell ger robust UNKNOWN; ett kvarvarande certifierat UP-motexempel ger FALSE. Verify är skrivskyddad, ignorerar result.json och kör ingen replay. |
| 12. Äldre kontrakt/purpose. `contracts.py:39–42`; `scenario_contracts.py:33–58`; `selection.py:184–192`; `temporal_goals.py:40–77` | T17 och återkörda äldre sviter/budgetgranskning: /4 all-required mot /3 med samma modell, blockerad respektive accepterad ordning, tidsmål och sent event; byt purpose på alla fem problemingångar. | Identiska materiella historiker och mål, AB=false/BA=true. Tidsoperatorerna är byteoförändrade. Gamla versioner avvisar ny grammatik; samtliga purpose-prober nekas. Budgeträttningen kvarstår även mot den historiska bristens verkliga reproduktion. |

Ny gruppkonfiguration i T02: U={A,B,C,D,E,F}, R={}, exakt ett av A/B/C,
högst ett av D/E, F fri. `3z(1+2z)(1+z)=3z+9z²+6z³`, alltså
`3+18+36=57` kandidater. Denna är inte leveransfixturen eller levererad
fem-ID-gruppfixtur. Alla 57 körs/certifieras och fulla input jämförs direkt.
Ytterligare varianter har båda grupperna högst ett, F obligatorisk och
allow_empty=false. Oraklet jämför hela populationen, inte bara antal.

## Fel kontra deklarerade gränser

**Faktiska fel:** inga konstaterade. Ingen implementation rättas.
Följande begränsningar kvarstår och ska inte omklassificeras till vare sig
buggar eller större stöd än vad kontraktet lovar:

- Prefixgrammatiken söker inte sena bibehållna tider, WAIT, adaptiva val,
  retry eller alla tänkbara planer. T04 visar konkret varför detta spelar roll
  för målutfallet (`selection.py:130–134`). Att lägga in ett no-op-beslut för
  att representera väntan är ingen generell tidsvalsfunktion.
- Den frysta domänen kan återhärledas trots omhashade falska medlemslistor.
  Däremot kan avsikten hos en samtidigt utbytt problemdeklaration och ett
  utbytt betrott ankare inte härledas. Separata pins, betrodd kod och stabila
  filer behövs (`scenario_contracts.py:139–142`; SCENARIO-FORMAT, Trust boundary).
- Budgetkontrollen gäller kvarvarande försöksevidens och tillåtet prefix.
  Den bevisar inte faktisk startordning över väggklockan och återställer inte
  helt raderade försök (`runner.py:105–114`, budgeträttningskontraktet).
  En budgetstridig batch kan fortfarande innehålla korrekt certifierade cellmål;
  INVALID får därför inte döljas av dessa mål.
- Produktions- och verifieringsenumeration delar validator, identitets- och
  materialiseringshjälpare. Oberoende algoritmer ensamma eliminerar inte delade
  fel; därför används direkta full-input-orakel och en tredje ordhärledning här.
  Dessa tester är inte ett formellt bevis för alla möjliga giltiga modeller.
- C/M-taken begränsar inte eventbanor, modellstorlek eller total körtid.
  Limits/ModelError ger UNKNOWN. Den befintliga timeoutinjektionen testar
  processgränsen, inte en faktisk 60-sekunders OS-timeout. Ingen ny testning av
  samtidiga filbyten eller illvilligt ändrad verifierarkod görs.
- Purpose är en format-/användningsgräns, inte en semantisk detektor av
  kundfall eller verklighetssanning. `synthetic_integration_test` är oförändrad.
  Ingen pilotantagning, optimering, sannolikhet eller kundnytta styrks.

## Tester och reproduktion

CPython 3.9.6. **234 testmetoder PASS; inga fel, skips eller expected failures**
i de rapporterade slutkörningarna. Delprober ingår i respektive metodantal.

| Svit | Antal | Tid från unittest |
|---|---:|---:|
| optional_review_tests (nya) | 20 | 36.624 s |
| selection_tests | 25 | 38.164 s |
| tests (inklusive 34 äldre fall / 654 banor) | 27 | 91.624 s |
| review_tests | 19 | 7.908 s |
| scenario_tests | 22 | 13.083 s |
| scenario_review_tests | 13 | 12.093 s |
| fixed_slots_tests | 19 | 36.015 s |
| fixed_slots_review_tests | 17 | 64.953 s |
| budget_tests | 8 | 29.819 s |
| temporal_tests | 19 | 4.153 s |
| temporal_review_tests | 15 | 4.637 s |
| replay/verification | 27 | 3.222 s |
| budget_review_tests exporterad oförändrad från 3ab8948 | 3 | 37.700 s |

Alla incheckade sviter kördes från granskningsworktreens rot med:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/optional_review_tests -p 'test_*.py' -v
# Samma kommando med respektive explorer-svit ovan i -s.
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Budgetgranskningens testfil hämtades med `git show
3ab8948:isolated-tests/structural-ce3-explorer/budget_review_tests/test_review_d24d6d1.py`
till en separat temporär katalog och kördes oförändrad med
`CE3_BUDGET_REVIEW_SOURCE` pekande på denna worktrees explorer. `GIT_DIR` och
`GIT_WORK_TREE` pekade på denna worktree. Historiska `362f647` exporterades
läsande, utan checkout. Alla tre gamla kontrakt gav historiskt COMPLETE/0 med
ombunden nollbudget men nu INVALID/2, med oförändrade individuella mål.

Färsk separat CLI-reproduktion (välj nya destinationsnamn vid upprepning):

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --output /private/tmp/ce3-optional-review-evidence/fresh-frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --manifest /private/tmp/ce3-optional-review-evidence/fresh-frozen/manifest.json --pins /private/tmp/ce3-optional-review-evidence/fresh-frozen/pins.json --output /private/tmp/ce3-optional-review-evidence/fresh-full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /private/tmp/ce3-optional-review-evidence/fresh-frozen/pins.json --output /private/tmp/ce3-optional-review-evidence/fresh-full
```

Färska identiteter:

```text
problem_id  14e6384126acf9620b169ff1979ea558285d285d3b1c9e9072125b49407504b4
manifest_id b3aca18d4dfc8cfac54400bbacad4b8cdbd92557680521cf2270e1d6c2ad09e4
build_id    d4c049fb4613fcaaa9ed2856a81653c9a0beb989fcef708f75eb4a1be2db105f
runtime_id  b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d
result_id   81125f98ee4e6ca31345a49e7b676704f49cae22bcfa0bbda4e7414f2f1244c1
```

Problem/manifest/build/runtime matchar rapportens tidigare påståenden med
samma Pythonversion. Result-ID skiljer sig som avsett genom nya UUID:n.
Loggar, `regressions.json`, inventering och färska körpaket ligger lokalt under
`/private/tmp/ce3-optional-review-evidence/`. De är arbetsbevis, inte en
versionshanterad leverans eller långsiktig lagringsgaranti. Testsviten skapar
egna temporära paket och städar dem vid avslut.

Den fulla äldre tvåpass-checkpointen med samtliga historiska lokala
bevarandeförutsättningar återkördes inte. Här kördes replaytesterna samt
explorerns färska 34-falls-/654-banorsregression. Webbbuild, onboarding och UI
ligger utanför denna ändring och granskning.

## Bevarande och leverans

Startinventeringen binder alla 2215 befintliga spårade filer i
review-worktreen. Slutkontrollen visar att dessa är byteoförändrade.
Alla befintliga replayfiler jämfördes också direkt mot `85e19b0` utan ändring.
Övriga worktrees hanterades läsande; branchreferenser och gitstatus jämfördes
mot startinventeringen. Ingen full byteinventering av deras ignorerade eller
lokala filer påstås. Deras existerande ospårade filer lämnas kvar.

Endast denna rapport och `optional_review_tests/test_review_f31033b.py` ingår
i granskningscommitten. Ingen implementation, fixture, sparad audit eller
historisk rapport ändras. Ingen integration eller push görs. Granskningen
ger PASS för den begränsade tekniska leveransen och lämnar dess uttryckliga
produkt-/tillitsgränser oförändrade.
