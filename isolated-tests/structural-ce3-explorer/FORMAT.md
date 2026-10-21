# Minimal explorer – kontrakt och bevisgräns

Detta är `ce3-explorer-problem/1`, en avgränsad teknisk integrationsprofil. Det är
inte implementationen av hela det föreslagna `ce-problem/1`. Operativ modell,
script, run, historik och audit använder oförändrade CE3-kontrakt.

## Problem och sökrymd

`fixtures/problem.json` är det frysta P/Q/X-problemet från Fas 1A.2 §12.
Det innehåller ingen plan. Ordningen på `search.decision_ids` är en kanonisk
representation av en mängd, inte en exekveringsordning.

`contracts.validate_problem` är den exekverbara kontraktsvalideraren. Okända
fält avvisas. Den här versionen kräver:

- Profil `fixed-replay/0.1`, positiv heltalsrevision, purpose `synthetic_integration_test`.
- Exakt tre unika, sorterade besluts-ID:n, vilka är modellens samtliga beslut.
- Slots `[0,1,2]`, ett `attempt` per slot, varje beslut exakt en gång. Inga retries,
  tidiga stopp, policyer, omordnade slots, exklusioner, pruning eller merging.
- Modellens horisont 0..2, inga externa outcome-dimensioner, endast timer-events.
  Övrig operativ typ-/regelvalidering delegeras till `core.schema.validate`.
- Full explicit modell, sources och outcomes. Ingen unknown-fyllning/AI-kompilering.
- Ett icke-tomt typat terminalmål samt kravet att alla tre försök accepterats.

Modellen använder P:s event efter ett tidssteg för att sätta `ready=true`.
Q kräver ready och kostar 1; X är oberoende och kostar 1. Startbudget är 2.
P kostar 0. Målet är terminalt `done=true`, `aux_done=true` samt alla försök
accepterade, för **alla auditerade eventbanor**. Ingen guard eller effekt
implementeras i explorern; dessa deklareras enbart i den vanliga CE3-modellen.

`enumerate_scripts.generate` använder permutationer för produktion.
`contracts.freeze` använder separat kartesisk produkt med all-different-filter
för det förväntade manifestet. Båda använder samma dokumenterade rena
scriptmaterialisering och identitetscodec. Det handhärledda testoraklet
`fixtures/expected.json` är en tredje, bokstavligt listad mängd. Det importeras
aldrig av produktionskod. Fullständighetsbeviset omfattar dessa sex slotordningar,
inte samtliga scripts som CE3 i allmänhet tillåter.

## Identiteter och tillitsankare

Alla JSON-identiteter använder befintlig `core.history.digest`: sorterade
objektnycklar, UTF-8, kompakta separatorer, typbevarade värden, avslutande LF.
Listordning är betydelsebärande. Filhashar är SHA-256 över faktiska bytes;
gzip-filhash och historikdokumentets identitet är olika.

| Identitet | Normativ payload |
|---|---|
| problem_id | H(hela problem.json), inklusive revision, mål och dokumentära fält |
| model_id / source_set_id | H(model) / H(sources), som i Fas 1A |
| observation_definition_id | H(problem.observation) |
| search_space_id | H(typad payload med modell, sources, outcomes, grammatik och stabil script-source) |
| plan_id | H({kind:`ce3-plan/1`,script:hela scriptet}), enligt Fas 1A |
| candidate_id | H({schema_version:`ce3-search-candidate/1`,search_space_id,plan_id}) |
| input_identity | H(hela vanliga `ce3-run/1`), exakt auditarens trusted input-hash |
| manifest_id | H(manifestets version, problem/revision, identiteter, grammatik och full medlemslista) |
| runtime_id | H(faktiska core-/audit-/CLI-/profilfilhashar, CE3-versioner, Pythonimplementation/version) |
| explorer_build_id | H(samtliga toppnivå-Pythonfiler i denna katalog); binder även observationskoden |
| search_execution_id | H(problem/manifest/runtime/build, replay-limits, max_candidates och kontraktsversion) |
| execution_id | H(typad input_identity/runtime_id/limits-payload) |
| run_id | Ny UUID per faktiskt försök; aldrig innehållsidentitet |
| history_id | H(hela oförändrade historikdokumentet) |
| audit_receipt_id | H(yttre versionerat kvitto med history/input/runtime och oförändrat auditresultat) |
| observation_id | H(definition, problem, observer-build, history/input/auditkvitto och mål/evidens) |
| result_id | H(resultatpayload exklusive result_id); inkluderar konkreta run-ID:n |

Det finns inga självrefererande hashvärden. Återkörning ger samma script-, input-,
execution-, history-, audit-receipt- och observation-ID:n med samma kod/miljö/limits,
men nya run-ID:n och därför nytt övergripande result_id.

`fixtures/pins.json` är det separat betrodda problem-/manifestankaret. `run` och
`verify` får **inte** härleda detta ankare från filerna de ska kontrollera.
En ändrad modell, källa, målformulering eller revision avvisas mot gamla pins.
En ändrad manifestlista avvisas även om någon hashar om den, eftersom den också
kontrolleras mot den deklarerade fullständiga domänen.

`freeze` är en explicit modellproduktionsoperation som skapar nya pins i en ny
katalog. Granska/bevara dem separat före användning. Den körs inte automatiskt
vid run/verify. Hashar ger inte autenticitet om en aktör kan ersätta både
underlag och det betrodda ankaret. Ingen filhash bevisar modellens verklighetssanning.

## Körning och återläsning

Ny utmatningskatalog krävs; befintlig katalog, inklusive ett avbrutet försök,
skrivs aldrig över. Före replay sparas problem, manifest, pins, runtime, build,
sökspecifikation och hela genererade kandidatlistan. Varje körning får:

```text
runs/<candidate_id>/
  input.json                 vanlig ce3-run/1, fullständigt script inkluderat
  started.json               problem/kandidat/input/runtime/execution/run-bindning
  history.json.gz            befintlig CLI replay, oförändrat format
  audit.json                 befintlig CLI audit, separat process och trusted input
  replay-process.json        diagnostik, ingen resultat-/målauktoritet
  audit-process.json         diagnostik, ingen resultat-/målauktoritet
  audit-receipt.json          yttre innehållsbindning, endast vid certifiering
  observation.json            endast efter PASS/verified/all_event_permutations
  record.json                 identiteter + artefakthashar, eller uncertified_reason
  failure.json                vid process-/lagringsfel, om detta kan sparas
```

Runtime/build kontrolleras före och efter varje körning. Varje subprocess har
60 sekunders timeout; timeout certifierar ingenting. Processavbrott kan lämna
started utan record. `verify` återläser oförändrade artefakter, kontrollerar
identiteter/limits, kör befintlig audit igen och omberäknar observationen. Ingen
ny replay sker vid återläsning. En bytt runtime/build kräver den registrerade
versionen för verifiering; historiska artefakter migreras inte automatiskt.

`result.json` är en återbildbar sammanfattning, inte tillitskälla. `verify`
ignorerar den och producerar sitt besked från underliggande artefakter. Ett
result_id kan kontrolleras separat, men använd verify för certifierad återläsning.

## Tre separata besked

1. **Körningskorrekthet:** CERTIFIED kräver riktig komplett historik, färsk
   audit-PASS, verified/all_event_permutations och samtliga artefaktbindningar.
   NOT_RUN och UNVERIFIED har `goal_satisfied=null`, goal_status UNKNOWN.
2. **Måluppfyllelse:** `ce3-terminal-goal/1` samplar sista radens after-state,
   jämför deklarerade terminalvärden typstrikt och kräver tre executed-rader
   samt inga blocked-rader. Alla eventbanor måste uppfylla detta. En korrekt
   körning med blockering är CERTIFIED / NOT_SATISFIED.
3. **Sökfullständighet:** enumeration_coverage kräver exakt kandidatpopulation
   inklusive innehåll och inga dubletter. search_coverage blir COMPLETE först
   när också alla sex kandidater har CERTIFIED körning och inga främmande
   runkataloger finns. Saknad medlem eller overifierad run ger INCOMPLETE;
   dubblerad/oväntad/förvanskad medlem ger INVALID. Ingetdera får kallas fullständigt.

Observationen binder history_id, path_index **och** event_orders, terminalradens
index/after, executed-/blocked-rader samt hela banans intervall för frånvaro av
blockering. Feltexten för ett blockerat försök kommer från auditerade failures.
Intervallens ändpunkter är inklusiva. Paths från olika kandidater paras aldrig
ihop via lokalt index.

`ModelError`, auditfel, replay-INCOMPLETE eller saknad artefakt ger UNKNOWN,
inte målfalskt. Inga halvfärdiga error.last_history används som bevis. Vid
max_candidates-avbrott finns alla sex medlemmar kvar, med explicita okända
resultat. Återupptagande, försökssammanslagning och automatiska retries ingår
inte; välj en ny katalog för ett nytt försök.
