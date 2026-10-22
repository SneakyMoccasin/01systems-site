# CE3 manuell explorerpilot /2

Detta kontrakt ersätter pilot /1 för nya körningar efter rättningen av F1–F3
från granskning `a8cc1fa`. [PILOT-FORMAT.md](PILOT-FORMAT.md), arkitekturen och
första implementationsrapporten bevaras som historik för `599ac9e`.
Ingen äldre fryst formats betydelse ändras: denna implementation accepterar
endast pilot /2, inte /1 och ingen automatisk migrering av kvitton/paket.
För historisk /1-inspektion krävs dess registrerade kod/runtime, med de kända
bristerna. För nytt godkännande krävs ett nytt /2-utkast, prepare, granskning,
båda kvittona och nytt separat ankare.

Motorproblem /4, replay/audit, urval, tidsoperatorer, källmapping, hypoteser,
issues, kontrollfall, limits och statusskillnader behåller /1-dokumentets
innebörd. Följande ändringar är normativa för /2.

## Klassificering och versionskedja

Draft, snapshot, receipt, case, binding, anchor och result använder version
`ce3-pilot-<namn>/2`. Varje sådan payload har ett obligatoriskt objekt
`classification` med exakt två strängfält. Bara dessa kombinationer är giltiga:

| case_kind | receipt_origin | Betydelse |
|---|---|---|
| fabricated_exercise | fabricated_test | Fabricerad övning med testkvitton; inte en genomförd kundpilot |
| declared_real_case | declared_actual_response | Uppgivet verkligt fall och uppgivna faktiska svar; ingen autentisering |

Snapshoten binder klassificeringen innan bekräftelse. Case, båda receipts,
bekräftelseposter, binding och ankare måste återge exakt samma objekt.
Resultatet återger objektet och en läsbar `case_notice`. prepare:s stdout visar
också klassificering och notice. Ankaret visar notice vid freeze.
Övningsgeneratorn skapar alltid fabricated_exercise/fabricated_test och vägrar
skapa testkvitton åt ett declared_real_case. Inga klassificeringar härleds från
personnamn, prose, filnamn eller purpose. Ett fabricerat kvitto tillsammans med
ett deklarerat verkligt fall avvisas. Ändring kräver ny snapshot/presentation,
båda nya kvittona och nytt ankare. En konsekvent men medvetet osann deklaration
kan inte upptäckas; namn, roller och datum är uppgifter, inte autentiserade fakta.

## Strikt bekräftelsepost och separat mänskligt underlag

`ce3-pilot-receipt/2` har exakt följande fält:

```text
schema_version, kind, decision, snapshot_id, presentation_sha256,
classification, stated_person, stated_role, recorded_by, recorded_at,
statement, acknowledgements, assumption_ids, supporting_records, record
```

`record` är en vanlig `{path,sha256}`-artefaktreferens till en UTF-8 JSON-fil
med `schema_version=ce3-pilot-confirmation-record/1`. Denna nya record har exakt
samma fält och värden som receipt **utom** schema_version och record-fältet
självt. Såväl decision, kind, klassificering, de båda digesterna, statement,
alla uppgivna person-/roll-/registrerare-/tidsfält, acknowledgements,
antagande-ID:n och supporting_records jämförs typstrikt och exakt.
Objektnyckelordning saknar betydelse; arrayordning och JSON-typer bevaras.

Saknade/okända fält och dubblerade JSON-nycklar avvisas. Det gäller också
record-filens nested objekt. Typfel, konflikt med kvittot och ofullständig
bekräftelseomfattning avvisas. `decision` måste vara exakt `approved` i både
receipt och record: `not_approved`, `rejected`, prose, strängdelar, booleska
värden eller flera beslut duger inte. Fritt statement är en uppgift; systemet
tolkar inte prosa för att hitta godkännande eller avgöra dess sanning.

`acknowledgements` är exakt denna ordnade lista i båda dokumenten:

```json
["scope", "model_mapping", "assumptions", "issues", "goals", "scenarios",
 "selection_and_prefix_times", "limits_and_budget", "human_responsibility",
 "classification_and_receipt_origin"]
```

`assumption_ids` är alla snapshotens antagande-ID:n, sorterade. Tidsfältet
kräver ISO-tid med tidszon, men är inte en betrodd klockattestation.
`kind` är domain_review respektive customer_confirmation, exakt en av varje.

`supporting_records` är en icke-tom lista med unika `{path,sha256}`-referenser
till **separata** bevarade svar, mejl eller mötesanteckningar. En record kan
inte hänvisa till sig själv som mänskligt underlag. Deras faktiska bytes
hashkontrolleras och kopieras med det frysta paketet. De behöver inte vara
JSON eller UTF-8 och tolkas inte som maskinellt godkännande. Concierge
registrerar JSON-posten och kvittot efter den mänskliga genomgången och ansvarar
för att dessa motsvarar faktiskt visad version och faktiskt lämnat svar.
Kunden behöver aldrig skriva JSON. Hashlikhet bevisar inte ett riktigt samtycke.

## Filpolicy och externt ankare

Paketrot och alla dess befintliga underkataloger/filer måste vara vanliga
kataloger/filer, utan symboliska länkar, inklusive dangling länkar. Detta
kontrolleras vid prepare, freeze, run och verify; Admission kontrollerar sitt
case-paket också när det används genom gemensamma Pythonfunktioner.
Runpaketets `pilot/`, `explorer/`, material, top-level JSON/HTML, körspår och
resultatcacher omfattas. Verify läser inte resultatcachernas påståenden men
kontrollerar deras filtyp som del av paketpolicyn. Specialfiler avvisas.
Symlänkar i **föräldrakataloger ovanför paketrot** (exempelvis macOS `/tmp`)
får förekomma. Materialreferensernas tidigare relativa path-policy gäller också.

Ankaret måste ligga utanför varje relevant paketrots både logiska absoluta
sökväg och upplösta sökväg. Vid verify ingår hela runpaketet och dess faktiska
pilotdel; symlänkad pilotdel avvisas redan innan paketdata godtas. Relativa
externa ankarsökvägar och externa symlänkar till ett externt ankare är tillåtna.
Symlänk/hårdlänk/alias till paketets anchor-copy avvisas med filidentitet.
Freeze publicerar exklusivt och ersätter aldrig ett befintligt ankare.

En separat byteskopia bevisar **inte** betrodd förvaring. Operatören måste
välja och bevara sitt ankare via överenskommen betrodd hantering, utanför
paketet. Hashar ger inte signaturer, OS-isolering eller skydd mot omskrivning
av både paket och ankare. Policyn förutsätter stabila lokala filer och betrodd
kod; den är inte en generell filsystemsäkerhets- eller TOCTOU-plattform.

## Bekräftad presentation och verifiering

`review.html` visar klassificering/ursprung och ett tydligt besked när det är
en fabricerad övning. Körgränstexten anger 60 sekunders timeout per replay-
eller auditprocess, att förprovens kontrollkörningar ligger utanför batchens
max_cells-budget och att ingen total väggklocksgaranti finns. Allt ingår i
exakta presentationsbytes som båda kvittona binder.

Run och verify ger `ce3-pilot-result/2`, med synlig case_notice även i stdout
och result.json. COMPLETE_CURRENT gäller deklarerade kontraktskontroller;
fabricerad övning är aldrig en genomförd kundpilot. Verify fortsätter vara
skrivskyddad utan replay eller nya kvitton/pins och ignorerar sparade resultat.
