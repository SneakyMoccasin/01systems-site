# Format och semantik för fixed-replay/0.1

Detta är ett separat uppspelningsformat under det frysta Structural CE v1.0-kontraktet. Den maskinläsbara kapabilitetsbeskrivningen finns i `core/profile.json`; `core/schema.py` är den exekverbara strikta valideraren. Okända fält avvisas, även i oanvända regler. JSON med dubbla nycklar eller icke-finita tal avvisas. Inga typer konverteras implicit.

## Versionsmärkta indata

En körinmatning har exakt dessa fält:

| Fält | Innehåll |
|---|---|
| `schema_version` | `ce3-run/1` |
| `profile` | `fixed-replay/0.1` |
| `model` | Modell med `schema_version: ce3-model/1` |
| `script` | Skript med `schema_version: ce3-script/1` |
| `outcomes` | Fast utfallsbindning för varje externt event-ID |
| `sources` | Namn/sökväg till SHA-256, för extern identifiering av källmaterial |

Modellen har `source`, `clock`, `domains`, `initial`, `budget`, `decisions`, `events`, `initial_events`, `reference_event_order` och `metadata`. Inga fältnamn, ID:n eller stegnummer har särskild verksamhetsbetydelse i kärnan.

- `clock`: heltalen `start`, `horizon`, `step: 1`, en textenhet `unit`, samt `events_before_decisions: true` och `horizon_inclusive: true`. Slut får inte föregå start.
- `domains`: varje fält har antingen `{"integer": [min, max]}` eller `{"enum": [värden...]}`. En enum är icke-tom, utan dubbletter och har en gemensam primitiv typ: bool, sträng eller heltal. `True` är inte heltalet 1.
- `initial`: exakt samma fält som domänerna och giltiga värden i samtliga.
- `budget`: null, eller `{"field": "valfritt_heltalsfält"}`. Kontot har undre gräns 0. Alla beslut har en icke-negativ heltalskostnad; utan konto måste kostnaden vara 0.
- `metadata`: källförklarande strängar `assumption` och `time_basis`, samt `deadlines`. En deadlinepost har `event`, `last_inclusive_step`, `source` och måste motsvara ett initialt expiry-event vid nästa steg. Metadata lägger inte till effekter eller beslutsspärrar.

Varje beslut har exakt `requires`, `effects`, `cost`, `schedule`, `source`. `requires` är en lista av `{"field": ..., "op": "eq" eller "ge", "value": konstant}`. Alla villkor måste gälla. `eq` har typstrikt konstant från domänen; `ge` har heltalsfält och heltalskonstant. Tom lista betyder inga deklarerade förvillkor. Aktuell tid är inte ett statefält och kan inte användas som förvillkor.

Effekter har exakt `{"set": {...}, "add": {...}}`. `add` använder konstanta heltal på begränsade heltalsfält. Samma fält får inte förekomma i båda operationerna. Konto-`set` är förbjudet överallt, och konto-`add` är förbjudet för beslut; eventutfall kan ändra kontot med `add`. En accepterad beslutskostnad kontrolleras och dras automatiskt exakt en gång. Andra numeriska fält kan ändras med `add` i både beslut och eventutfall.

`schedule` är null eller `{"event": id, "delay": positivt_heltal}`. Endast ett event kan schemaläggas av varje beslut, och varje event-ID får ha högst en schemaläggningsplats i modellen, antingen i startkön eller hos ett beslut. En outnyttjad eventdefinition är tillåten men måste ändå vara giltig och förekomma i referensordningen.

Varje event har exakt `requires`, `kind`, `outcomes`, `absent`, `source`. `outcomes` mappar namn till effekter. `kind: timer` kräver ett enda utfall och `absent: null`. `kind: external` kräver minst två utfall och en explicit absentroll:

```json
{"outcome": "silence", "field": "review_state", "value": "waiting", "source": "Deklarerad uteblivetgren"}
```

Den angivna grenen måste faktiskt sätta det angivna enumfältet till vänteläget. Uteblivet är därmed en verklig vald gren; ett event med falska förvillkor har inget utfall. Utfall som innehåller `schedule` ger alltid `UnsupportedFeature`, även när grenen är oanvänd. Inget event skapar implicit ny prövning.

`initial_events` är en lista med `id`, `due`, `scheduled_at`. Alla tider är heltal och `scheduled_at <= start <= due`. En startdeklaration får förfalla vid start, eftersom den inte är ett nytt nolltidsbeslut. För beslut gäller alltid positiv fördröjning. Förfall efter horisonten bevaras i kön.

`reference_event_order` listar varje event-ID exakt en gång. Ordningen används endast för deterministisk uppräkning av alla permutationer, aldrig som ett faktapåstående om fysisk prioritet.

Skriptet har exakt `schema_version`, `source`, `steps`. `steps` mappar kanoniskt skrivna heltalssträngar inom horisonten till ordnade instruktioner, vardera med `decision` och `mode`. Tillåtna lägen är `attempt` och `if_not_taken`. Den senare loggar `script_skip` om beslutet redan genomförts, annars ett vanligt försök. Inga andra villkor eller automatiska omförsök stöds.

`outcomes` måste binda exakt alla externa event till deklarerade utfall. En giltig bindning får förbli oanvänd. Den orsakar inte schemaläggning, påverkar inte tidigare beslut och konsumeras inte av ett ej tillämpligt event. Timers får inga externa bindningar.

Ett komplett handskrivet exempel, med förväntad materiell övergångssekvens och härledning, finns i `verification/generic_fixtures/ledger.json`. De båda normaliserade verksamhetsinmatningarna sparas i varje checkpointkörning.

## Historik och fel

Historikpaketet har `schema_version: ce3-history/1`, `profile`, full `input`, `input_sha256`, `limits`, `status`, `error`, `paths`, `work_rows`. Varje bana har `history`, terminal `snapshot`, `event_orders`, `unused_outcomes` och `all_attempts_accepted`. Status `COMPLETE` betyder slutförd uppspelning, inte bevis för en allmän målstatus; verifieraren ger ett separat PASS.

Snapshot har `step`, `phase`, `state`, ordnad `taken` och `pending`. En köpost har `id`, `due`, `scheduled_at` och strukturerat `origin` med `kind` och `id`. Ursprung är en initial eventdeklaration eller ett faktiskt accepterat beslut. ID:n är unika i denna profil; stöd för flera instanser införs inte genom bakdörren.

Varje rad har exakt `index`, `step`, `kind`, `action`, `source`, full `before`/`after`, `outcome`, `failures`, `scheduled` och `script_position`. Icke relevanta fält är null eller tom lista. `failures` innehåller alla felande villkor och eventuell engångsblockering. Källsträngar och källhashar bevaras.

Radtyperna är `initial`, `step_begin`, `event_applied`, `event_inapplicable`, `decision_point`, `decision_executed`, `attempt_blocked`, `script_skip`, `step_end`, `advance`. Faserna är `initial`, `events`, `decisions`, `ended`, `advanced`. Varje steg tömmer förfallna events före beslutspunkten. Flera beslut kan ändra tillgängligheten i samma steg. `available()` avvisar snapshots utanför beslutsfas eller med förfallna events kvar.

`attempt_blocked` och `script_skip` har identiska före- och eftersnapshots. Ett ej tillämpligt event tar endast bort sin köpost och loggar exakta orsaker. Runtime bygger en övergång på en kopia och kontrollerar alla domäner innan någon rad eller snapshot publiceras. Ett domänfel ger `ERROR`, aldrig en normal blockering eller en delvis accepterad övergång.

Resursgränserna `max_paths`, `max_rows` och `max_steps` är positiva heltal. `max_rows` räknar emitterade arbetsrader i förgreningsträdet, inte extra kopior av gemensamma historikprefix. Begränsning ger `INCOMPLETE`, tom lista av certifierade banor och diagnostik med senast publicerad snapshot/historik. Varken `INCOMPLETE` eller `ERROR` kan få granskar-PASS. Det finns ingen slumpmässig sampling eller sammanslagning.

JSON skrivs med stabil nyckelordning och utan väggklocka eller absoluta utmatningssökvägar i innehållet. Gzip använder fast tidsstämpel. En fullständig fil publiceras genom atomiskt namnbyte. SHA-256 för körinmatningen måste kontrolleras mot en separat betrodd inmatning, inte bara mot en checksumma som följer med samma historik.

## Oberoende granskning och äldre format

`audit/verify.py` importerar bara datavalidering och kodning från kärnan. Den rekonstruerar själv varje övergång och all debitering/tillförsel, exakta förvillkorsfel, eventursprung, faser, samtliga steg, schemaläggning, terminal snapshot och eventordningarnas fullständiga förgreningsträd. Importgränsen kontrolleras både statiskt och i en ny Pythonprocess.

De gamla modellerna går genom formatadaptrar. Adaptern kontrollerar att duplicerade budgetvillkor motsvarar kostnaden innan den ersätter dem med den automatiska kontoregeln. Den reparerar ingen regel. Externa roller och inkluderade deadlines anges i separata källförankrade metadatafiler. Kärnan importerar inga adaptrar, facit eller fallobservationer.

`semantic_compare.py` matchar banor efter hela eventordningen. Den jämför varje övergångs tid, typ, ID, utfall, fel, proveniens, före/efter-state, budget, mängden genomförda beslut och full kö. Den bevarar radordningen och kontrollerar även initialt/terminalt läge och alla beslutspunkter. Tekniska fasmarkörer mappas; fabrikens saknade beslutspunkt härleds efter sista förfallna event. Endast rent teknisk markerproveniens och den äldre `script_skip`-förklaringens textformat normaliseras bort; operativa källor och källidentiteter bevaras. Första materiella avvikelse rapporteras med ordningssignatur och rad.
