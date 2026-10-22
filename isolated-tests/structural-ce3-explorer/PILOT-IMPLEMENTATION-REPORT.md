# Leverans: minsta manuella explorerpilot /1

2026-10-22. Implementerat och testat på `codex/ce3-bounded-pilot` i
`/private/tmp/ce3-bounded-pilot`, från exakt
`d1f1f8713c0505cde950f02f5393aee60ff0ad8c` på `decision-flow-demo-v1`.
Ingen merge, integration eller push. Ingen faktisk kundbekräftelse påstås.

[Arkitektur och semantik](PILOT-ARCHITECTURE.md) skrevs innan kodändringarna.
[Normativt pilotformat](PILOT-FORMAT.md) och
[Christians conciergeflöde](PILOT-CONCIERGE.md) beskriver användningen.

## Vad som levererats

- `pilot_contract.py`: strikt versionssatt manuellt draft/snapshot/case/receipt-
  kontrakt, faktiska källbytes/extrakt/spann, full lövmapping, synliga hypoteser,
  separata frågeklasser, blockerings-/scopekontroller och deterministisk HTML.
- `pilot_runner.py prepare/freeze/run/verify`: handhärledda förprov via vanlig
  replay/audit, exakt bekräftelse av visad snapshot, bevarade underlag,
  separat externt ankare, låst build/runtime/budget och bindslinga till batch,
  cellbevis och tillbaka till källor. Verify är skrivskyddad utan ny replay.
- Tre små ändringar i befintliga kodfiler: internt styrd antagning i
  `contracts.py`/`scenario_contracts.py` och pilotbindning i `scenario_runner.py`.
  Syntetiska ingångar behåller sin purpose och sina format/resultatfält.
- Separata besked om pilotunderlag, körning, mål, deklarerad söktäckning och
  budget/prefix. Pilotresultat hämtas från färsk verifiering, aldrig en sparad
  sammanfattnings PASS. Ingen modellregel implementeras i pilotlagret.
- Fabricerat övningsfall och 19 pilottestmetoder med verklig replay/audit,
  avvisnings-/mutationsprober samt oberoende bokstavligt mål-facit.

V1 kräver två distinkta kontrollceller och de befintliga /4-semantikerna.
Även kompletta paket med budget 0 redovisas som ofullständig sökning med UNKNOWN
mål. Ingen ny allmän problemversion, AI-/SR-koppling, kund-UI eller ranking.
Godkännandet gäller deklarerade kontroller; källrelevans, modellens rimlighet,
acceptabla hypoteser och faktisk bekräftelse är mänskligt ansvar.
Uppgiven identitet är inte autentiserad och kvittona är inte digitala signaturer.

## Verifiering

**250 testmetoder PASS, inga skips eller expected failures.**
231 äldre tester prövar de gemensamma kodvägarna; 19 slutliga pilottester prövar
hela den nya antagningen. De äldre sviterna kördes efter ändringarna i alla tre
gemensamma kodfiler. Efter detta skärptes bara pilotkvittot med explicit
`decision=approved` och tre ytterligare pilottester tillkom; den slutliga
19-testssviten och separat CLI-körning gäller denna slutliga pilotkod.

| Svit | PASS |
|---|---:|
| explorer/tests, inklusive 34 äldre fall och 654 eventbanor | 27 |
| review_tests | 19 |
| scenario_tests | 22 |
| scenario_review_tests | 13 |
| fixed_slots_tests | 19 |
| fixed_slots_review_tests | 17 |
| budget_tests | 8 |
| temporal_tests | 19 |
| temporal_review_tests | 15 |
| selection_tests | 25 |
| optional_review_tests | 20 |
| replay/verification | 27 |
| pilot_tests, slutlig körning 9,714 s | 19 |

Från repositoryrot, för varje explorer-svit i tabellen:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/pilot_tests -p 'test_*.py' -v
# Byt pilot_tests mot respektive annan explorer-svit.
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
git diff --check
```

Nya prober omfattar inaktuellt/saknat underlag, källversion/citat/radslut,
JSON-pekar-/lövtäckning, hypoteskoppling, olösta fakta och tider, ostödd funktion
maskerad som begränsning, förkortat scope med kvarvarande beroende, saknad eller
inaktuell gransknings-/kundbekräftelse, avvikande presentationsbytes, omskrivna
hashfält med gammalt originalprotokoll, fel runtime, budget och casebindning,
omhashat domänbortfall, externa/kopierade ankare, korrupt historik, falskt
kontrollfacit, kontroll-limitfel, nollbudget/delbudget och tom försökspost utanför
prefix. Två bekräftade case med exakt samma problem får olika batchspec:
det andra kan inte godkänna eller märka om det förstas körning.

Read-only-proben förbjuder replay-/skrivhjälpare, jämför bytes och mtime och
förvanskar båda result.json. Färsk verify ger samma resultat ändå. Fel i en
cell ger UNKNOWN där utan att förvandla andra certifierade mål till falska.
Den återanvända äldre fulla all-path- och domänmutationssviten passerar också.

Första utvecklingsförsöket avslöjade att HTML-tabellordning berodde på dict-
insättningsordning efter JSON-återläsning. Renderingen rättades till sorterade
nycklar före dessa slutkörningar; test 18 kontrollerar nu uttryckligen samma
presentation före/efter kanonisk JSON-rundtur samt escaped källmarkup och
bevarade Unicode-/CRLF-spann. Webbläsarpolicyn blockerade lokal file:-öppning;
ingen visuell webbläsarkontroll påstås. Ingen workaround användes.

Detta är implementationsverifiering, inte en ny oberoende granskning av pilot-
lagret. Äldre oberoende granskningar gäller sina angivna commits. Webbbuild,
onboarding/SR och historiska separata budgetgranskningssviten från 3ab8948
återkördes inte. De berörda äldre budget-/granskningssviterna i baslinjen kördes.

## Separat färsk CLI-reproduktion

Övningsgenerator → prepare → uttryckligt fabricerade kvitton → freeze → run →
verify gav exit 0. De fem CLI-stegen efter draft använde faktiska filer och
separat ankare. Run och verify gav identiska fullständiga resultat. Ett försök
att mata samma pilotproblem till vanliga `scenario_runner.py run` gav exit 1
före outputskapande: den syntetiska purpose-grinden kvarstår.

Handhärlett facit: NP/PN/PU/UP × approved/rejected/absent, 12 celler,
alla CERTIFIED. PN positiv i samtliga scenarier och PU endast approved;
exakt 4 positiva mål och endast PN robust TRUE. Full celltäckning och giltigt
budgetprefix. Alla personer och kvitton är tydligt märkta fiktiva.

```text
pilot_case_id      00f3a864f105cbcbdc0105bec6579f99263a9330a6b621d65e959fc96194b918
snapshot_id        d78f97409da19508717766b459f881e27850e5338eb3eaa36e480939786b7789
batch_spec_id      85a20f78888544824fa147881e067c3729e5c4e0622bbfc680adc36c821b6705
explorer_build_id  00701d8941d2fc4b5dbe7babdd02b81cf94ec290ac70856e2e70da224bcbac19
runtime_id         b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d
result_id          3e9af0713232a5b13cc76d2c076c69c7ada83156eb34933fbe774b05487fb546
```

Python CPython 3.9.6. Lokala arbetsbevis:
`/private/tmp/ce3-pilot-delivery/` och `/private/tmp/ce3-pilot-regressions/`.
Dessa temporära kataloger är inte ett löfte om långsiktig lagring.
Det incheckade övningsskriptet, formatet och testsviten återskapar evidensen.
Ny körning får nytt batch-/result-ID. Samma kod och Python krävs för verifiering.

## Bevarande

Startinventering: 2219 befintliga spårade filer och huvudcheckoutens 246
icke-ignorerade lokala/ospårade filer. Före leveranscommit var exakt fyra
befintliga filer ändrade: explorer-README samt de tre angivna explorerkodfilerna.
Alla andra befintliga spårade filer var byteidentiska, inklusive replay/schema/
audit/profil, urvals-/tidsmålskod, fixtures, sparade körningar, kapabilitetsbaslinjer,
onboarding och SR. Huvudcheckoutens 246 lokala filer var byteidentiska.

Huvudspåret låg kvar på d1f1f87, den ursprungliga task-worktreen var ren och
alla befintliga branchrefs/worktreebindningar oförändrade före leveranscommit.
Endast den nya implementationsbranchen får denna leveranscommit. Ingen full
byteinventering av alla andra worktrees eller deras ignorerade filer påstås;
de har inte skrivits till. Alternativa implementationer och separat onboarding
bevaras. Ingen lokal användarfil städas bort eller skrivs över.
