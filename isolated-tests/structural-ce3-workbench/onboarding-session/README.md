# Isolerad sessionshållare för CE3-onboarding

Ny separat version: [session/2 med inbäddade strukturerade SR-arkiv och uttrycklig migration](v2/README.md). Nedanstående dokument beskriver fortsatt **session/1** och dess mockgräns; format och standardbeteende bevaras.

Lokal modul för manuellt underlag, uttryckliga modellförslag och mockad granskning. Den använder oförändrade [onboarding-v1-kontrakt från 0a4d0b7](../contracts/onboarding-v1/README.md). Ingen fritext tolkas till modellregler. Ingen live-LLM, SR-integration, uppladdning, OCR, UI, modellkompilering eller CE-körning finns här.

## Kör demonstrationen

Från repositoryroten, med befintligt Node och Ajv (inga nya beroenden):

```sh
node isolated-tests/structural-ce3-workbench/onboarding-session/demo.cjs /tmp/ce3-onboarding-demo/session.json
```

Välj en **ny fil**. Kommandot vägrar skriva över en befintlig fil från en annan hållare. Demonstrationen registrerar ”Förhoppningsvis klart dag 2”, ett avsiktligt felaktigt första förslag, mockfynd, kundens förtydligande och ett uttryckligt rättat förslag. Dag 2 bevaras som mål; godkännande kräver ett separat besked. Ingen faktisk godkännandetid fylls i. En tidig syntetisk bekräftelse kan inte öppna överlämningen trots öppna blockerare och blir senare inaktuell.

Efter ny mockgranskning och motiverad åtgärd av fyndet registreras en aktuell kundbekräftelse. Kommandot skapar överlämningsunderlag, sparar sessionsloggen, återöppnar den och kontrollerar identiskt läge. Stdout visar versionsbundna kontrollpunkter och identiteter. Hela överlämningsobjektet återfås via `Session.load(file).view().transfers`; det rekonstrueras från loggen vid återöppning. Samma manuella sekvens ger identiska loggdata och hashvärden oberoende av sparväg; ingen väggklocka eller slumpmässig modellinformation ingår.

## Modul och adaptergräns

`Session` exporteras av [session.cjs](session.cjs). Anroparen tillför all verksamhetstext, frågor, modelländringar och bedömningar. Identiteter väljs uttryckligen och får bara innehålla bokstäver, siffror, punkt, bindestreck och understreck.

| Metod | Ansvar |
|---|---|
| `new Session(id)` | Skapar en tom session, utan modell |
| `registerSource({id, text, replaces_version})` | Registrerar manuellt dokumentunderlag; null vid första version, annars exakt senaste tidigare version |
| `submitProposal(proposal)` | Tar ett fullständigt, uttryckligt onboardingförslag. Källistan måste exakt matcha registrerat underlag; ändringar/parent/berörda fynd måste anges |
| `requestReview(id)` | Fryser en begäran för exakt modell- och underlagsversion; returnerar kopia av jobbet |
| `runReview(id, adapter)` / `completeReview(id, result)` | Anropar adapter för redan registrerat jobb respektive tar emot dess resultat. Validerar schema, citat, täckning och kopplingar före ändring |
| `addQuestions(questions)` | Validerar frågor och kopplingar; slår ihop uttryckligen likvärdiga öppna frågor enligt befintligt kontrakt |
| `answer({id, question_id, text, replaces_answer_id})` | Registrerar svar som källtext. Rättelse ersätter frågans senaste svar, med samma käll-ID och ny källversion |
| `setQuestionStatus({id, status, reason})` | Uppskjuten (`deferred`) eller återtagen (`withdrawn`) fråga med skäl; ändrar inte fynd |
| `handleFinding({review_id, finding_id, status, reason, by})` | Motiverad acceptans, avvisning eller åtgärd; alla tidigare bedömningar ligger kvar i loggen |
| `confirm({...})` | Bekräftar exakt visat modell-/underlags-/kontextdigest, med text, ansvarig och `scope_acknowledged: true` |
| `createHandoff(id)` | Returnerar versionsbundet underlag när samtliga grindar är uppfyllda |
| `setLifecycle(status, summary)` | Aktiv, pausad, begränsat avslut eller avslut utan analysbehov. Det sista kräver att ingen modell skapats |
| `view()`, `serialize()`, `save(file)`, `Session.load(file)` | Kopior av läge/logg, explicit lokal sparning och validerad återöppning |

[manual-example.cjs](manual-example.cjs) visar samtliga anrop, inklusive alla obligatoriska fält för frågor, ändringar och kundbekräftelse. Modellförslagen är manuellt skrivna där. Sessionsmodulen tillverkar inga nya modeller när ett kundsvar registreras.

[MockReviewAdapter](mock-review.cjs) implementerar `review(exactRequest) → Promise<reviewResult>`. Resultaten är förskrivna och väljs genom exakt förslagsdigest. Begäran innehåller full originaltext och svarsversioner i sin snapshot. Returen kopplas till jobbet av sessionshållaren; adaptern kan inte ersätta modell, jobb-ID eller källpaket. Endast `producer.mode: synthetic` och `model: null` accepteras i denna modul. Detta är avsiktligt ingen generell liveadapter.

## Versionsregler och status

- Källor är append-only. En dokumenträttelse anger `replaces_version`; svarsrättelse anger `replaces_answer_id`. Gamla bytes och länkar finns kvar. Underlagsversionen identifieras av en digest av hela den ordnade källsamlingen, inklusive historiska versioner.
- Förslag har egna revisioner, `parent_digest` och uttryckliga ändringskopplingar. Befintliga kontraktskontroller verifierar bl.a. att ändrade uppgifter, beroenden och tidigare fynd anges. Sessionshållaren skriver aldrig över förslagets källor med ny text.
- Nya källor/svar läggs först i källregistret. Om senaste förslaget ännu inte innehåller dem visas `pending_evidence: true` och granskning/bekräftelse som inaktuella. Ingen ny granskningsbegäran eller överlämning tillåts innan ett nytt, manuellt tillfört förslag innehåller exakt det underlaget.
- Granskningsbegäran sparas innan anrop. Ett sent svar binds alltid till sin gamla snapshot, även om en ny modellversion har tillkommit under ett väntande adapteranrop. Fynden sparas och kan blockera överlämning. Sena tomma fyndlistor gör inte en ny version granskad.
- Frågor, svar och olösta fynd bevaras över modellversioner. Ett svar markerar frågan besvarad men löser inget fynd. Ett accepterat fynd är fortfarande olöst. `resolved` kräver motivering och aktuell granskning av ett ändrat förslag. Efter ytterligare modell-/underlagsändring återgår dess effektiva status konservativt till accepted, medan tidigare åtgärd och skäl finns kvar. Motiverade avvisningar bevaras.
- En kundbekräftelse binds även till den visade granskningskontexten: frågor, svar, granskningar, begäranden och fyndhantering. Nya fynd/frågor efter ett tidigare ja kräver därför ny bekräftelse även om modelltexten är densamma. Bekräftelsens eget svar är separat och förändrar inte underlaget.
- `view().statuses` är sessionens aktuella status. Arkiverade kontraktspaket beskriver bara den version de avser; en gammal complete-granskning eller confirmed-post ska aldrig läsas som aktuell sessionsstatus. `transfers[].current` anger om det sparade underlaget fortfarande motsvarar aktiv session och visad kontext.
- Granskarens tomma fyndlista och kundens ja är inga sannings- eller fullständighetsbevis. Kontrollerna validerar struktur och proveniens, inte betydelsen i fritext eller kvaliteten i avvisningsmotiveringar.

## Överlämningsgrind

Aktuellt underlag måste vara infört i modellen, aktuell komplett granskning finnas, alla skickade granskningsjobb vara besvarade och kunden ha bekräftat aktuell kontext. Därefter körs onboardingkontraktets ordinarie grindar: inga blockerande obesvarade/uppskjutna frågor, inga olösta blockerande fynd, inga okända/conflict/ostödda AI-uppgifter eller öppna luckor. Det är **onboardingvalidering**, inte CE3-schema-/profilvalidering.

Icke-blockerande frågor och fynd kan följa med endast när motsvarande accepterad begränsning finns i det kundbekräftade förslaget. Sammanställningen bevarar källor, fullständiga fynd och deras behandling. Överlämningsformatet identifierar:

- Modell-ID, revision och digest samt hela förslaget.
- Underlagsdigest och varje källas ID, version och hashvärden.
- Vald komplett gransknings ID/digest, bedömda uppgifter, begränsningar och tydlig mockidentitet. Alla granskningar ingår i paketet; den senaste kompletta granskningen av samma version väljs enligt befintligt kontrakt.
- Kundbekräftelse och exakt visad kontext.
- Analysens omfattning, accepterade begränsningar och antaganden; mål och uppskattningar behåller sin typ i förslaget.

Status är `ready_for_separate_compilation_and_validation`. Paketets `ce3_validation_status` och `ce3_run_status` är fortfarande `not_run`. Inget `ce3-model/1` genereras. Ett redan skapat underlag bevaras historiskt när sessionen senare ändras.

## Lagring, transaktioner och formatversion

[session.schema.json](session.schema.json) definierar det nya omslutande formatet `ce3-onboarding-session/1`; [transfer.schema.json](transfer.schema.json) definierar `ce3-onboarding-transfer/1`. Dessa tillför väntande jobb, session utan modell, ändrat underlag som ännu inte modellerats och kontextbunden bekräftelse **utan att ändra betydelser eller fält i onboarding-v1 eller ce3-model/1**.

Migrationsgräns: befintliga onboarding-v1-filer och tester är oförändrade. Det finns inget tidigare sessionsfilformat att migrera. En befintlig proposal kan tillföras med `submitProposal` efter att motsvarande manuella källor registrerats; den får inte tyst normaliseras eller ändra källidentiteter. Godtyckliga gamla paket med annan proveniens importeras inte automatiskt. Framtida brytande sessionsändringar kräver nytt versionsfält och en uttrycklig migration. Okända format avvisas.

Varje operation körs på en kopia och valideras innan tillstånd/logg publiceras. Felaktigt adapterresultat, källa, fråga eller modellförslag lämnar senaste tillstånd och logg orörda. Adapterfel lämnar jobbet väntande; ett nytt anrop kan göras för samma jobb. Det finns ingen automatisk tolkning, återförsökspolicy eller tyst borttagning av ett väntande jobb.

Sessionsfilen innehåller en ordnad kommandologg, föregående hash, härledd tillståndshash och checksumma. Vid load valideras format/checksumma och varje operation spelas om genom sessionsmodulen; detta är **inte CE-uppspelning**. Både historik och härledda överlämningsobjekt kontrolleras. Hasharna upptäcker korruption men är inga signaturer mot någon som kan skriva om hela loggen och räkna om hashvärden.

`save` använder lokal låsfil, ny temporär fil, fsync och atomiskt namnbyte. En äldre öppnad hållare får inte skriva över en nyare sparning; en ny hållare får inte ersätta en redan befintlig fil. En processkrasch kan lämna en låsfil: kontrollera först att ingen skrivare arbetar, återöppna den validerade sessionsfilen och hantera låset manuellt. Ingen automatisk låsforcering finns. Sparning är explicit; minnesändringar sedan senaste save försvinner vid processavbrott. Avsikten är en liten lokal session med en skrivare, inte en databas eller tjänst. Text lagras okrypterat lokalt; ingen extern lagring eller loggning används.

## Tester och nästa steg

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Testerna verifierar sessionslogik, inte AI- eller SR-kvalitet. Se [CHECKPOINT.md](CHECKPOINT.md) för verifiering och filförteckning.

Minsta efterföljande liveutvärdering: fem korta syntetiska underlag (mål/kontroll, påhittad kostnad eller regel, oklar eller motsägande källa, korrekt enplansutkast, inget analysbehov), två upprepningar per fall. Kopiera samma första AI-utkast och originalunderlag till två armar: AI:s egenkontroll respektive AI + ett uttryckligt strukturerat SR-granskningsläge. Håll kundsvarsbank, frågesammanställning och högst en kompletteringsrunda lika. Förbered mänskligt facit, bedöm blint och mät rätt upptäckta/missade fel, falska fynd, frågornas begriplighet/relevans, väntetid, faktisk eller okänd kostnad och antal kundfrågor. Redovisa alla tio par och avbrott; en mock är inte en försöksarm. En sådan pilot kräver en separat godkänd liveadapter och utvärdering av SR:s nya granskningsläge enligt [tidigare återanvändningsbedömning](../contracts/onboarding-v1/SR-REUSE.md). Inga externa anrop har gjorts här.
