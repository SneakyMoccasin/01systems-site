# Avgränsad manuell explorerpilot /1

Arkitekturbeslut före kodändring, 2026-10-22. Bas d1f1f8713c0505cde950f02f5393aee60ff0ad8c.
Implementationsbranch codex/ce3-bounded-pilot, isolerad worktree /private/tmp/ce3-bounded-pilot.
Rot-README:s låsta produktspår lämnas orört. Ingen tillämplig AGENTS.md hittades.

## Lästa kontrakt och återanvändning

Kapabilitetsbaslinje [v2](../../docs/ce3/capabilities/engine-baseline-v2.json),
[explorer](FORMAT.md), [scenarier](SCENARIO-FORMAT.md),
[tidsmål](TEMPORAL-GOALS-FORMAT.md), [urval](OPTIONAL-DECISIONS-FORMAT.md),
[pilotförslag §10–12](OPTIONAL-DECISIONS-ARCHITECTURE-PROPOSAL.md), oberoende
urvalsgranskning f31033b och tidigare gransknings-/budgeträttningsrapporter styr.
Återanvänd audit före målprojektion, full domänrekonstruktion, UNKNOWN vid
ofullständiga banor och budgetprefix från deklarationen, aldrig sparad enumeration.

Läsande inventering av [onboardingkontraktet](../structural-ce3-workbench/contracts/onboarding-v1/README.md),
contract.cjs och review-/confirmation-/handoffgrindarna samt
[session/2](../structural-ce3-workbench/onboarding-session/v2/README.md) och
[SR-adaptern](../structural-ce3-workbench/onboarding-sr/structured/README.md):
återanvänd källversion/spann, explicit hypotes, fynd/fråga med påverkan,
aktuell exakt bekräftelse och skilda gransknings-/körstatusar som begrepp.
Onboardingöverlämning är fortfarande ready_for_separate_compilation_and_validation,
CE3 not_run. Inget gammalt kvitto migreras till pilotgodkännande; inga SR- eller
AI-anrop krävs. Onboardings kanoniska hash utan LF är inte Python-JSON/LF.
Eventuellt importerat material bevaras som opaka källbytes med namngivet ursprung.

## Minsta kontrakt och beslut

Ny yttre ce3-pilot-case/1 och pilot_runner.py är den enda pilotingången.
Den inre deklarationen använder befintlig /4-struktur/urvals- och målsemantik
med purpose bounded_real_pilot, enbart under kontrollerad pilotantagning.
Den skickas aldrig genom en syntetisk ometikettering. Vanliga explorer- och
scenario-CLI:er fortsätter kräva synthetic_integration_test. En intern
antagningsparameter i gemensamma funktioner kräver kontroll av hela pilotpaketet
mot exakt problem och underlag; det är ingen ny fristående purpose-auktoritet.
Endast /4 i denna pilotversion: 1–6 beslut, högst 720 kandidater/2160 celler,
outcomes-only-scenarier, prefixslots och befintliga hårda tidsmål. All-required
är möjligt. Ingen ranking, även om preferenser dokumenteras. Ingen ny regelmotor.

Snapshoten innehåller:

- Fall/revision, fråga, användning, inkluderad/exkluderad omfattning, tidsenhet,
  ansvar för styrbara beslut, begränsningar och översättare/version.
- Fullt problem: modell inklusive dokumentära fält, källmetadata, mål,
  scenarios och sökgrammatik. Allt binds, även oanvända regler och outcomes.
- Käll-ID/version, original- och extraktionsfil med SHA-256 över faktiska bytes,
  explicit extraktionsstatus och exakta UTF-8-textspann (Python-kodpunkter).
- Mapping med begriplig förklaring från varje löv/explicit tom container i
  modell, sources, mål, scenarier och sökning till källa eller märkt antagande.
  Full lövtäckning är konservativ strukturkontroll, inte relevansbevis.
- Antaganden, frågor/fynd, berörda referenser, ansvar, påverkan och disposition.
- Handhärledda kontrollfall med förväntat mål, motivering och bevarad vanlig
  replay/audit. Ingen alternativ utvärderare. Samma build/runtime används.
- Registrerad faktisk explorerbuild, replayruntime/Python, baslinjereferens,
  replaylimits och exakt batchbudget. Ändring kräver ny snapshot/bekräftelse.

prepare skapar en ny snapshot och deterministisk läsbar HTML-presentation.
Kunden får fråga/scope, konkreta värden med mappingförklaring, antaganden,
frågor, mål, scenario-/prefixbetydelse och begränsningar. Teknisk fulltext är
bilaga. Kunden skriver inte JSON. Christian registrerar två manuella kvitton:
domängranskning och kundbekräftelse. Varje kvitto binder snapshotdigest och
exakta presentationsbytes, person/roll som UPPGIFT, registrerare, tid, text,
hela omfattningen och antagandena samt bevarat mötes-/svarsprotokoll.
Maskinen kan inte veta att personen sett dokumentet eller faktiskt sagt ja.
Namn, tidsstämpel och hash är varken autentisering eller digital signatur.

## Frågor och avgränsning

Saknad fakta måste få källbundet svar eller uttryckligt hypotetiskt antagande.
Framtida externa utfall får bindas till samtliga deklarerade outcomes-scenarier.
Osäker tid är en fryst hypotes eller kräver separat modell; inga due/delay-
variationer göms i outcomes. Modellglapp/ostödd funktion får inte accepteras
som en begränsning i beroende analys: /1 kräver en uttryckligt exkluderad fråga,
ändrad omfattning och förklaring av tidigare omfattning, utan kvarvarande
modellberoenden. Korrigerade stödda modeller kan lämnas in som ny snapshot.
Olösta prioriteringar får kvarstå endast som rankingfrågor; ranking saknas helt.
Övriga olösta kritiska frågor blockerar. Maskinen kontrollerar deklarerade
beroenden, inte att människan har upptäckt alla verkliga beroenden.

## Acyklisk bindning och tillit

1. Källor/modell/analys/frågor/kontrollfall/build/budget → snapshotdigest.
2. Snapshot → deterministisk presentation; kvitton refererar båda digesterna.
3. Snapshot + presentationshash + kvitton → pilot-case-ID.
4. Explorer-domän + pilot-case-ID + build/runtime/limits/budget → batchspec.
5. Separat bevarat ankare binder case, manifest och batchspec före körning.
6. Started/record/observation binder batchspec; resultat binder case, snapshot,
   kvitton och den faktiska batchens UUID. Cellens record leder till history,
   audit och exakt input; case leder tillbaka till mapping/källor.

Inga kvitton eller resultat ingår i sin egen snapshot. freeze/run/verify
kontrollerar originalbytes, presentation, referenser, aktuell bekräftelse,
registrerad kod/runtime och separat ankare. verify skriver inte och spelar
inte om körningar; den återanvänder befintlig färsk audit/målbedömning.
Frysta paket är självförsörjande med bevarade materialfiler; externa ankaret
måste ligga utanför det paket som kontrolleras. Inga automatiska nya pins vid
run/verify. Stabil lokal lagring och betrodd kod är förutsättningar; raderade
försök, omskriven hel historik inklusive ankare eller verklig identitet intygas inte.

Fem besked exponeras separat: pilotunderlag COMPLETE_CURRENT enligt kontraktet;
körningskorrekthet per cell; mål per cell/kandidat; söktäckning i deklarerad
domän; batchbudget/prefix VALID/INVALID. Ett komplett pilotunderlag kan ha
noll körda celler och UNKNOWN mål. Audit-PASS kan ha falskt mål. Full enumeration
är inte full körning. Inga sannolikheter, verklighetssanning eller global
omöjlighet följer av dessa besked.

Inga avgörande arkitekturfrågor kräver en annan lösning inom denna omfattning.
Mänsklig källrelevans, rimlig modell, accepterade antaganden, faktisk bekräftelse
och bedömningen att scope inte beror på ostödd funktion förblir explicit ansvar.
