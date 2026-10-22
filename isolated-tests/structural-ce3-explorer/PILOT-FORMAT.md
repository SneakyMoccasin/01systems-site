# CE3 manuell explorerpilot /1

Detta är ett explicit, lokalt pilotkontrakt ovanpå den befintliga explorern.
Arkitektur och avsikt definierades före kod i [PILOT-ARCHITECTURE](PILOT-ARCHITECTURE.md).
[Conciergeflödet](PILOT-CONCIERGE.md) beskriver kundarbetet.
Exekverbar kontraktsauktoritet: `pilot_contract.py` och `pilot_runner.py`.

## Ingång och versionsgräns

Endast `pilot_runner.py prepare|freeze|run|verify` är pilot-CLI.
`runner.py` och `scenario_runner.py` behåller `synthetic_integration_test`, sina
äldre fixtures, pins och statusbetydelser. Att byta purpose och köra dessa CLI:er
avvisas. Ingen verklig modell märks om till syntetisk för att passera.

`ce3-pilot-case/1` definierar en inre deklaration med `/4`-struktur och
`purpose=bounded_real_pilot`. Den är tillåten **endast inom pilotkontraktet**,
inte som en ny fristående giltig syntetisk `/4`-deklaration. Alla andra
problemfält och deras modell-/mål-/urvalssemantik är oförändrade. Ingen /1–/3-
översättning eller allmän purpose-parameter finns i CLI. `_admission` i delade
Pythonfunktioner är en intern paketkontroll: en `Admission` läser om hela
paketet och validerar dess bytes och exakta problem. `_validate_structure` är
endast strukturkontroll under författande, inget pilotbesked eller köringång.

Pilot /1 stöder 1–6 modellbeslut, högst 720 kandidater/2160 celler,
`selected_permutations_once/1`, `prefix/1`, outcomes-only-scenarier och
`ce3-history-goal/2`. Samma fasta script används i varje scenario. Inga nya
regler, tidsval, adaptiva policyer, replaysemantiker, sannolikheter eller ranking.
Även all-required stöds. Pilotkontrollfallen kräver minst två distinkta
kandidat/scenariopar; ett encellsproblem ligger därför utanför pilot /1.

## Paketets delar

Alla nedanstående objekts fält är obligatoriska och okända fält avvisas.
Tomma listor tillåts endast där de är meningsfulla enligt validatorn.

| Format | Exakt innehåll |
|---|---|
| `ce3-pilot-draft/1` | schema_version, case_id, revision, analysis, translator, problem, evidence, mapping, assumptions, issues, controls, execution |
| `ce3-pilot-snapshot/1` | Samma fält samt implementation; controls har dessutom history/audit-artefakter |
| `ce3-pilot-receipt/1` | schema_version, kind, decision, snapshot_id, presentation_sha256, stated_person, stated_role, recorded_by, recorded_at, statement, acknowledgements, assumption_ids, record |
| `ce3-pilot-case/1` | schema_version, snapshot, presentation_sha256, receipts |
| `ce3-pilot-binding/1` | schema_version, case_id (digest av hela case-payloaden), snapshot_id |
| `ce3-pilot-anchor/1` | schema_version, case_id, snapshot_id, explorer_pins, batch_spec_id, runtime_id, explorer_build_id |
| `ce3-pilot-result/1` | Identiteter, de fem beskeden, spårbara filreferenser och fullständigt återhärlett explorer_result; result_id är H(payload utan result_id) |

Snapshotens `case_id` är författarens fallnamn. Ankarets/bindningens `case_id`
och resultatets `pilot_case_id` är innehållsdigest av hela `ce3-pilot-case/1`.
De två rollerna får inte förväxlas.

`analysis` har question, intended_use, includes, excludes, decision_authority,
time_unit, limitations, ranking. Alla texter är icke-tomma, scope-/begränsnings-
listorna icke-tomma och ranking exakt `none`. time_unit måste vara modellens
enhet. `translator` har stated_person och method_version. revision är positivt
heltal. Tidsgränser, beslut och mål finns i det fullständiga `problem`.

`execution={limits,max_cells}` fryser alla tre positiva replaylimits samt en
heltalsbudget 0..hela cellpopulationen. Timeout är befintliga 60 sekunder per
replay-/auditprocess. Körbudget är skild från sökdomänens stödtak. Kontroll-
körningar under prepare ingår inte i batchens max_cells; de är namngivna
förprov, minst två, som använder samma replaylimits. De har ingen global
väggklocksbudget. Ändrad budget/limits kräver ny snapshot och båda kvittona.

`implementation` skapas av prepare och innehåller capability_baseline med ID
`ce3-optional-decisions-f31033b` och faktisk v2-filhash, runtime med faktisk
replaykod/profil/Pythonversion samt explorer_build med alla aktuella toppnivå-
Pythonfiler, inklusive pilotlagret. Baslinjereferensen avser motorsemantikens
historiska bas, inte ett påstående att nya pilotfilbytes granskades i f31033b.
Inga commit-ID:n eller dokumenthashar som beror på sig själva ingår.

## Underlag, mapping och frågor

Varje evidence-post har id, version (icke-tom sträng), title, original, extract,
extraction och extraction_note. En aktuell version per käll-ID i snapshoten.
Alla artefaktreferenser är `{path,sha256}`, med SHA-256 över verkliga filbytes.
Sökvägen är relativ till materials/, kan inte lämna katalogen och får inte
vara symlänk. Originalbytes och UTF-8-extrakt måste finnas vid prepare, freeze,
run och verify. `verbatim_utf8` kräver identiska original-/extraktbytes;
`manual_transcription` kräver uttrycklig notering och mänsklig granskning.
Partiell/saknad extraktion är inte godtagbar i denna version.

Källreferens har source_id, source_version, start, end, quote. Spannet är
[start,end) räknat i Python-Unicode-kodpunkter i exakt UTF-8-avkodade bytes,
utan normalisering av radslut. Citatet måste vara exakt. Det är inte JS:s
UTF-16-index eller onboardings hashdomän. Importerat onboardingmaterial kan
bevaras som original/extrakt; dess gamla digest omtolkas aldrig.

`mapping` är en lista av `{targets,explanation,refs,assumption_ids}`. Targets
är exakta RFC6901-liknande JSON-pekare relativt problem. Maskinen härleder
samtliga löv under model, sources, search, observation och scenario_set;
också tomma listor/objekt räknas som löv. Varje löv ska finnas exakt en gång i
mapping. En grupp får ha flera explicit listade löv, aldrig en implicit
rot-/wildcardtäckning. Icke-tom begriplig explanation och minst en faktisk
källreferens eller ett täckande antagande krävs. Detta omfattar initialvärden,
domäner, guards, effekter, kostnader, schemaläggning/delay/due, absent, mål,
valbarhet, prefix och alla scenariobindningar, även oanvända regler.

`assumptions` har id, statement, reason, targets. Alla sådana antaganden är
uttryckligt hypotetiska. Mappingens antagandereferenser ska tillsammans täcka
exakt antagandets targets. Båda kvittona bekräftar alla antagande-ID:n.

Varje issue har id, kind, question, owner, impact, targets, disposition, reason,
refs, assumption_ids, scenario_event, excluded_scope_index, previous_scope.
Impact är blocks_analysis, outside_scope eller ranking_only. Relevanta
korrigeringar och granskningsfynd registreras i samma frågelista; inga tysta
accepterade begränsningar finns som disposition.

| Klass | Tillåtna dispositioner |
|---|---|
| missing_fact | source_resolved med faktiskt källspann och targets; hypothetical med täckande antagande; scope_excluded |
| future_outcome | scenarios: ett externt event och exakt dess outcome-target i varje deklarerat scenario; scope_excluded |
| uncertain_time | source_resolved eller hypothetical; scope_excluded. Aldrig scenarios |
| model_gap | Endast scope_excluded i denna snäva version; inget löfte om den ostödda funktionen |
| unresolved_priority | open enbart med ranking_only och inga modelltargets; source_resolved; scope_excluded. Fortfarande ingen ranking |

scope_excluded kräver outside_scope, tomma targets, giltigt index i excludes,
uttrycklig previous_scope och motivering till den nya omfattningen. Resterande
frågor får inte lämnas öppna. scenarios kräver kind=future_outcome, ett faktiskt
external-event och alla dess deklarerade scenariopekarreferenser. Alla andra
dispositioner har scenario_event=null. Bara hypothetical använder assumption_ids;
övriga har []. Bara scope_excluded har excluded_scope_index/previous_scope;
övriga har null. Alla uppgivna käll- och antagandereferenser kontrolleras.

Maskinen kan inte avgöra om exkluderad fysisk kapacitet i verkligheten ändå
påverkar frågan. Den mänskliga domängranskningen måste avvisa en sådan scope.
För en rättad modell: bevara den gamla snapshoten och gör ett nytt utkast med
aktuell frågelista, full mapping och nya kvitton. Ingen automatisk sessions-
historik, fyndmigration eller SR-granskning påstås.

## Kontrollfall och begriplig exakt bekräftelse

`controls` innehåller minst två distinkta par av order/scenario_label, ett
booleskt expected_goal och en handhärledd rationale. De måste tillhöra samma
frysta modell/domän. Välj positiva och negativa fall när båda finns; om domänen
bara har ett målutfall ska motiveringen förklara det. Expected_goal är facit
före replay, inte ett kopierat resultat. prepare kör vanlig CLI replay och
separat CLI audit, bevarar history och audit med filhashar och jämför facit
med befintlig målprojektion. Saknad bana, felaktig förväntan eller limitfel
stoppar snapshoten. Dessa kontrollfall reauditeras vid senare paketkontroll;
verify kör aldrig ny replay. Kontrollfallen bevisar inte att källorna är sanna.

`review.html` är deterministisk, HTML-escaped UTF-8 utan fjärrinnehåll eller
script. Snapshot-ID visas. Den innehåller analys/scope, förklaringar, samtliga
mappade värden och citat, antaganden, frågor, kontrollfall, källförteckning,
grammatik-/målsemantik och begränsningar. Full snapshot/build finns i teknisk
bilaga. Dokumentets bytes härleds om och jämförs; en egen förkortad presentation
kan inte ersätta denna bekräftelseartefakt. Christian får dessutom förklara
modellen muntligt och ska dokumentera det i det bevarade protokollet.

Varje receipt kräver uttryckligt `decision=approved`, även i bevarat protokoll.
Exakt två manuella receipts krävs: domain_review och customer_confirmation.
Samma person kan uppges i båda om rollen är lämplig; ingen identitet eller
oberoende granskarroll autentiseras. recorded_at är ISO-tid med tidszon,
registrerad uppgift utan betrodd klockattestation. De måste binda aktuell
snapshot_id och presentation_sha256 samt följande exakta acknowledgements:

```json
["scope", "model_mapping", "assumptions", "issues", "goals", "scenarios",
 "selection_and_prefix_times", "limits_and_budget", "human_responsibility"]
```

assumption_ids är alla antagande-ID:n sorterade. record pekar på ett bevarat
UTF-8-protokoll/svar som innehåller snapshot-/presentationsdigesterna, uppgiven
person/roll, registrerare, tid och exakt statement. Detta kontrollerar
protokollbindning, inte autenticitet eller att människan verkligen sett HTML.
Alla relevanta ändringar skapar annan snapshot/presentation och kräver båda
nya kvittona. Att bara räkna om hashfält i ett gammalt kvitto räcker inte.

## Frysning, bindning och återverifiering

```text
frozen/                         run/
  case.json                       pilot/   (egen full kopia av frozen)
  review.html                     explorer/
  materials/                        problem.json, manifest.json, pins.json
  manifest.json                     batch.json, attempt.json, enumeration.json
  batch.json                        runtime.json, explorer-build.json
  anchor-copy.json                   runs/<cell_id>/{input,started,history,audit,...}
                                    result.json (återbildbar cache)
                                  result.json   (återbildbar pilotcache)
external-anchor.json            (separat utanför båda paketen)
```

freeze validerar snapshot/presentation/kvitton och kopierar alla bundna
materialfiler. Den återhärleder hela explorerpopulationen och skapar batchspec
som utöver befintliga /4-fält innehåller `pilot_binding`. Detta villkorade fält
finns bara inom pilotkontraktet. Därmed binder varje started, record och
observation exakt pilot-case-ID genom batch_spec_id. Externa ankaret binder
case/snapshot, problem/manifest, batchspec och build/runtime. Det publiceras
exklusivt efter lyckad frysning och får aldrig skrivas över automatiskt.
Kopian i paketet är inte ett externt tillitsankare.

run kontrollerar allt igen, behåller en egen kopia av underlaget och använder
befintlig scenario_runner, urval, replay, audit och observer. Både modellens
purpose och pilot-binding bevaras. Inga limits-/budgetöverskrivningar finns
som körflaggor. verify kontrollerar materialfiler och kvitton, återhärleder
hela domänen, jämför extern trust och faktisk batchspec, återauditerar och
räknar om mål/täckning. Båda result.json ignoreras och inga filer skrivs.
Resultatet går till stdout; dirigera det till en ny separat rapportfil.

Resultatet binder det faktiska batch_attempt_id. Via explorer_result.cells →
record_ref → batchspec/input/history/audit finns körspåret. Via pilot_case_id →
case.json → snapshot/problem/mapping/evidence/receipts finns modell- och
källspåret. Ingen resultatidentitet eller kvitto ingår i sin egen snapshot.
JSON-digester använder befintlig Python JSON/UTF-8/sorterade nycklar/LF;
filhashar avser faktiska bytes. Listordning och JSON-typer behålls.

| Besked | Betydelse |
|---|---|
| pilot_status=COMPLETE_CURRENT | Deklarerade underlags-/referens-/bekräftelse-/kontrollkrav uppfyllda mot just denna snapshot |
| run_status och cells[].run_status | Sammanfattning respektive separat CERTIFIED/UNVERIFIED/NOT_RUN från verklig audit |
| goal_status och cellmål | TRUE/FALSE/UNKNOWN robust per kandidat; SATISFIED/NOT_SATISFIED/UNKNOWN per cell |
| search_coverage | Full celltäckning inom deklarerad domän; alla äldre projektioner och eventtäckning finns också i explorer_result |
| execution_budget_status | VALID/INVALID från befintlig kontroll av samtliga kvarvarande försöksposter mot rekonstruerat prefix och budget |

Topplevelfel i underlag, ankare eller specifikation: exit 1, inget godkänt
pilotresultat. Giltigt paket med ofullständig/ogiltig batchtäckning: exit 2.
Full verifierad sökning: exit 0, oberoende av om något mål är sant. En korrekt
enskild cell kan behålla sitt målbevis när batchprefix är ogiltigt; INVALID
får aldrig döljas av en positiv robusthetsrad. Budget 0 kan ge komplett
pilotunderlag men alla mål UNKNOWN och ofullständig sökning.

## Tillitsgräns

COMPLETE_CURRENT betyder aktuell mot den bevarade, bekräftade snapshoten;
verifieraren bevakar inte externa källsystem eller senare verkliga förändringar.
Christian måste registrera nya fakta/fynd som nytt underlag och ny snapshot.
Separata pins kräver betrodd hantering utanför paketet, betrodd kod och stabila
lokala filer. Hashar och namn är inte signaturer, autentisering, verklighetssanning
eller intyg om helt raderade försök och väggklocksordning. Kopiera bevarad build
inklusive Pythonmiljö för framtida verifiering; äldre paket migreras inte.
Alla godkännanden av källrelevans, modellens rimlighet, hypoteser och scope är
mänskliga bedömningar. Ingen automatisk AI-/SR-kompilering eller kund-UI ingår.
