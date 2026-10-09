# CE3-onboardingkontrakt, utkast 1

**Leverans: ett offlinekontrakt med syntetiska exempel och deterministiska tester.** Ingen live-AI, SR-koppling, filuppladdning, OCR, UI, översättning till körformat eller CE3-körning är byggd. `ce3-model/1` och motorn är oförändrade. Lagerfallet från `691f247` är fortsatt ett avslutat, dokumenterat onboardingtest; inga lagerplaner eller nya verksamhetsvärden skapas.

Utgångspunkt: [lagerdokumentationen](../../docs/warehouse-move-onboarding/README.md), [användarens uppgift](source-request.txt), befintligt [CE3-format](../../../structural-ce3-replay/FORMAT.md), [schema](../../../structural-ce3-replay/core/schema.py) och [profil](../../../structural-ce3-replay/core/profile.json). SR betyder **Skeptical Reader**, Christians separata granskningsverktyg. Dess faktiska återanvändningsmöjligheter beskrivs i [SR-REUSE.md](SR-REUSE.md).

## Flöde och ansvar

Kundunderlag → preliminärt modellförslag → SR-granskning av förslaget mot samma originalunderlag och svar → sammanställda frågor och korrigeringar → begripligt utkast och kundbekräftelse → separat översättning, CE3-validering, uppspelning och historikgranskning.

Dialogen börjar med **vad kunden vill få svar på**:

| Analysbehov | Minsta analysram |
|---|---|
| Välja mellan alternativ (`choose`) | Minst två namngivna alternativ och kontrollkriterier |
| Kontrollera befintlig plan (`check`) | Minst en plan och ett krav/kriterium; inget tvång att hitta ett alternativ |
| Ändrat antagande (`change`) | Minst en plan, kriterium och identifierat antagande som ändras |
| Inget analysbehov (`none`) | Sammanfattning och möjlighet att avsluta utan modellkomplettering, SR eller körning |

AI tolkar underlag, föreslår källkopplade uppgifter/regler, markerar osäkerhet och föreslår frågor. SR granskar förslaget, inklusive betydelseförskjutningar och otillåtna säkerhetsanspråk. SR får föreslå granskningshypoteser men inte fylla luckor eller skriva över modellen. Frågesammanställningen bevarar ursprung, skäl och berörda uppgifter, tar bort uttryckligen identifierade dubbletter och prioriterar. Kunden svarar, korrigerar och bekräftar ett visat utkast och dess avgränsningar. Separat kod ansvarar senare för CE3-format och profilvalidering.

**Varken SR-besked, tom fyndlista eller kundbekräftelse bevisar fullständighet eller verklig korrekthet.** En kandidat för separat validering kan fortfarande underkännas där. Den innehåller ännu inga körindata.

## Fyra separata strukturer

Teknik: JSON Schema draft-07 med slutna objekt, obligatoriska fält och explicita nullvärden. Befintlig Ajv i repositoryts utvecklingsberoenden används utan typkonvertering, automatisk ifyllnad eller borttagning av okända fält. Tvärreferenser och tillståndsregler kontrolleras separat i [contract.cjs](contract.cjs). Det är ett litet fristående referenskontrakt, inte en ny del av replayprofilen.

| Schema / versionsfält | Innehåll och ägare |
|---|---|
| [proposal.schema.json](schemas/proposal.schema.json), `ce3-onboarding-proposal/1` | Analysfråga, plan-/kriterie-ID, profil, omfattning, versionsmärkta källor, atomära modelluppgifter, luckor och ändringskopplingar. Dokumentläsaren äger originalidentiteter/extraktion; AI föreslår uppgifter. |
| [review.schema.json](schemas/review.schema.json), `ce3-onboarding-review/1` | Oföränderlig indatasnapshot och dess digest, granskningsutlösare, täckning, fynd och begränsningar. SR lämnar ett separat resultat. Inget modellpatchfält finns. |
| [dialogue.schema.json](schemas/dialogue.schema.json), `ce3-onboarding-dialogue/1` | Frågor, prioritet, ursprung, berörda uppgifter, status, svar och ersättningslänkar. Frågesammanställningen äger formen; kundsvar bevaras som egna källversioner. |
| [handoff.schema.json](schemas/handoff.schema.json), `ce3-onboarding-handoff/1` | Fyndhantering med motivering/bedömare, granskningsstatus, versionsbunden kundbekräftelse, öppna frågor/fynd och överlämningsstatus. Beslut om att acceptera/avvisa ett fynd ägs inte av SR. |

Testpaketet är `{proposal, reviews, dialogue, handoff}`; `reviews` är ett append-only arkiv av ovanstående granskningsstruktur. Det paketet är ingen CE3-modell. Scheman laddas lokalt via sina `urn:`-ID:n; inga nätverksuppslag behövs. Versionsändring av kontraktet kräver ny version, inte tyst ändrad betydelse.

### Källor, regler och värden

Varje modellregel och värde är en egen `item`, med ID, begripligt påstående, värde/enhet, källreferenser och motivering. `depends_on` kopplar förslaget till berörda andra uppgifter; det är spårbarhet för påverkan, **inte direkt ett CE3-förvillkor**. Plan- och kriterietexter måste också ha proveniens. Ett sammansatt påstående ska delas när olika delar har olika källor, osäkerhet eller innebörd.

`type` skiljer `document_fact`, `user_fact`, `goal`, `requirement`, `estimate`, `ai_proposal` och `scenario_assumption`. ”Fact” betyder uppgift ur dokument/svar, inte oberoende verifierad sanning. `status` är separat: `known`, `unknown`, `conflict` eller `superseded`. `known` betyder angivet, inte sant. Vid `unknown` och `conflict` måste `value` vara null. Detta null är en onboardingmarkör och får inte skickas vidare som ett numeriskt CE3-värde.

Kända uppgifter kräver källreferens. Ett ännu ostött AI-förslag får ha tom källista om det tydligt är `ai_proposal` med motivering; det är en **synlig olöst lucka**, aldrig godkänd proveniens, och blockerar överlämning. Ett hypotetiskt värde kräver dessutom `scenario_choice` till ett uttryckligt kundsvar och behåller typen `scenario_assumption` även efter bekräftelse. Att svaret faktiskt uttrycker detta val behöver bedömas semantiskt. Det får inte skrivas om till kundfakta.

En konflikt har en egen öppen luckpost. Vid korrigering behålls gamla källor och svar; nytt svar har `replaces_answer_id`. En uppgift kan revideras med samma ID i en ny modellsnapshot, eller ersättas av en ny uppgift med `supersedes` medan den gamla markeras `superseded`. Ingen historik skrivs över. Okänt får inte fyllas med noll, absent eller godkänt; övergång från okänt till angivet kräver ändrad proveniens eller uttryckligt scenario-val.

### Filunderlag och leverantörsgränser

En källa bär dokument-/svar-ID, version, originalreferens, originalfilens SHA-256, extraktionsstatus, extraherad text och separat texthash. `complete`, `partial`, `failed` och `missing` skiljs åt; fel/ofullständighet kräver en notering. Vid failed/missing är innehåll och texthash null. Detta beskriver ett framtida dokumentläsningsgränssnitt; ingen fil läses eller extraheras genom kontraktskontrollerna.

Referenser anger käll-ID/version, exakt citat, start/slut i extraherad text och valfri platsbeskrivning, exempelvis sida, tabellcell eller svar-ID. Plats som saknas är null och får inte uppfinnas. Offset räknas i JavaScript UTF-16-kodenheter, slut exklusivt; eventuell OCR-/sidmappning måste bevaras av dokumentläsaren. Kontrollen matchar citat och texthash. Den verifierar inte originalfilens bytes, OCR-kvalitet eller citatets relevans. Originalfilhashen måste senare kontrolleras vid inläsning.

SR får den exakta förslagssnapshoten med hela extraherade originalunderlaget och alla svarsversioner, **inte bara AI:s sammanfattning eller utvalda citat**. Originalreferenserna bevaras för åtkomst till filerna i ett framtida läslager. Misslyckad extraktion får inte beskrivas som att SR läst filen. Alla aktiva modellreferenser måste peka på läsbart innehåll; kandidatövergången kräver fullständig extraktion för senaste versionen av varje källa och varje aktivt citerad version. Äldre misslyckade extraktioner kan finnas kvar i arkivet när en ny komplett version har tillkommit. Annars kan dialogen pausas eller avslutas begränsad, utan överlämning.

`trust: data_only` gäller dokument, användarsvar och granskningsindata. Dokumentinstruktioner är citat/underlag, aldrig styrinstruktioner. Ingen eval, nätverksbegäran eller kommandokörning sker från innehållet. Mocktestet bevisar dock inte en LLM:s motståndskraft mot promptinjektion.

Dokumentläsning, modellförslags-AI, SR, frågesammanställning och CE3 är separata komponenter. Moln- och lokala LLM-adaptrar ska ta samma versionsmärkta indata och lämna samma typer av förslag/resultat utan att ändra källor. Adapter-/modell-/promptidentitet följer granskningsresultatet; ingen leverantör väljs här. Ett framtida körlager behöver separat deklarera var dokumentläsning/OCR, inferens, lagring och loggning sker. **Lokal LLM innebär inte automatiskt lokal OCR, lagring eller loggning.**

Föreslagna adapteranrop är `propose(proposal, dialogue) → proposal` och `review(review.request) → review.result`, med respektive schema som in-/utdatakontrakt. Första proposal kan vara ett tunt utkast med analysram och källor; AI:s resultat får fortfarande innehålla okända uppgifter. Källpaketet tillförs och låses av sessionslagret: AI får föreslå ändrade uppgifter men får inte skriva om originaltext, källhashar, användarsvar eller kundbekräftelse. Nya källversioner kommer från dokumentläsaren eller kunden. Sessionslagret arkiverar föregående version och kontrollerar resultatet före antagande. AI-genererade frågor binds till uppgifter/luckor och förs in i dialogue separat. Dessa är föreslagna gränser, inga implementerade adaptrar.

### Granskningscykel och status

Första samlade utkastet granskas. Små svar samlas till nästa meningsfulla utkast; inget krav på full SR-körning efter varje kort svar. Ändrade regler, värden, mål/krav, scenario-val, profil, källor, analysfråga eller omfattning är väsentliga ändringar. Visningsetiketter och rent dialogspråk kan ligga utanför förslagssnapshoten. Detta referenskontrakt är konservativt: varje ny förslagssnapshot kräver aktuell granskning inför överlämning; återanvändning av delgranskningar implementeras inte.

`digest` är SHA-256 av rekursivt nyckelsorterad JSON enligt `canonical()` i referenskoden. Hashen beräknas av det betrodda kontraktslagret, inte av LLM:n. Alla adaptrar använder samma funktion/serialisering; detta är inte ett påstående om generell JCS-kompatibilitet. Källhashar använder de angivna textbytesen i UTF-8. Hashar identifierar versioner, inte sanningshalt eller kundens identitet.

Ny version länkar till förra via `parent_digest`. `changed_item_ids` omfattar ändrade uppgifter och beroende uppgifter transitivt. Vid ändrade källor, profil, analysram eller luckor markeras konservativt alla aktiva uppgifter berörda. `affected_finding_ids` pekar på relevanta gamla fynd som `review-id/finding-id`. `validateTransition(before, after)` kontrollerar versionskedja, bevarad historik och ändringskoppling; enbart JSON Schema räcker inte till detta.

Gamla granskningar behålls men gäller inte nya digest. `review_status` är `not_requested`, `current`, `stale` eller `incomplete`; current kräver minst en komplett granskning av just denna snapshot med deklarerad täckning av alla aktiva uppgifter. Full deklarerad täckning är fortfarande ett granskarpåstående, inte bevis att varje fel hittades. SR-fynd får grunden källbelägg, frånvaro i angivet granskat material eller **granskningshypotes**. Frånvaro av belägg är inte motsägelse eller falskhet. Hypoteser får inte döljas som faktabaserade fynd.

Fyndhantering är separat: `open`, `accepted`, `rejected`, `resolved`. Accepterat fynd betyder att problemet erkänns, inte att det är löst. Avvisning kräver motivering och bedömare; åtgärdad status kräver senare aktuell granskning och motivering. Även gamla olösta fynd finns kvar. En ny tom fyndlista stänger dem inte automatiskt. Kontrollerna verifierar form och spårning, inte kvaliteten i avvisningsmotiveringen.

Kundbekräftelse binds till digest, alla visade aktiva uppgifter och avgränsningar. Bekräftelsens eget svar lagras **utanför** förslagssnapshoten, så att ett rent ja inte gör den bekräftade versionen inaktuell. Ett ja som innehåller en korrigering är däremot ett nytt underlag och skapar ny förslagssnapshot. Bekräftelsen ger ingen CE3-validering eller verklighetsverifiering; senare produktion behöver även autentisering och behörighetskontroll.

### Frågor, paus och begränsat avslut

`impact` skiljer blockerad överlämning från begränsad slutsats. Frågan använder verksamhetsord; tekniska mål-ID:n, skäl, prioritet och ursprung ligger separat. Dubbletter slås bara samman efter uttryckligt vald `equivalence_key` och samma berörda uppgifter. Referensfunktionen använder ingen språkmodell för likhetsbedömning. Ursprung och skäl bevaras, högsta angelägenhetsgrad och blockerande status vinner. Olika betydelser får inte döljas under samma nyckel. Besvarade frågor slås inte automatiskt samman.

`dialogue_status` medger active, paused, closed_no_analysis, closed_limited och ready_for_translation. Obesvarat/deferred och olösta fynd ska alltid listas. Paus och begränsat avslut kräver begriplig sammanfattning; de betyder inte att luckorna är lösta. Som dialogpolicy ställs högst tre prioriterade frågor åt gången; efter två kompletteringsrundor erbjuds uttryckligen paus eller avslut med begränsningar. Detta är ett föreslaget dialogbeteende, inte en automatisk tidsgräns i schemat.

För `candidate_for_validation` krävs aktuell granskning, versionsbunden bekräftelse, angivna källkopplade uppgifter, inga blockerande frågor/fynd eller öppna luckor och fullständig relevant extraktion. Scope-frågor kan finnas kvar endast med motsvarande `accepted_limit` i det bekräftade förslaget. En blockerande lucka kan inte bara avfärdas som accepterad begränsning; analysens omfattning och regler måste först omprövas. SR eller kund kan inte ge statusen ”körbar”. De separata `ce3_validation_status` och `ce3_run_status` är alltid `not_run` i detta överlämningskontrakt. Senare validerings-/körresultat ska vara separata CE3-artefakter bundna till översättningens indatahash, inte en SR-egenskap.

## Exempel, tester och minsta nästa steg

- [DIALOGUE.md](DIALOGUE.md): begriplig dialog med en plan, mål/faktaskillnad, rättelse, paus och senare bekräftelse.
- [examples/catalog.json](examples/catalog.json) och [fixtures.cjs](examples/fixtures.cjs): elva syntetiska fall, inklusive både påhittad kostnad och beroenderegel. Positiva och negativa kontraktskontroller finns i [contract.test.cjs](contract.test.cjs).
- [EVALUATION.md](EVALUATION.md): separat plan för jämförelse av AI ensam och AI + SR med verkliga svar.

Från repositoryroten, med befintligt Node och installerade utvecklingsberoenden:

```sh
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs
node isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/examples/show.cjs base
node isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/examples/show.cjs correctedAnswer
```

`show.cjs` skriver kompletta JSON-paket eller ett before/after-par till stdout utan att ändra data. Testerna använder Ajv **6.14.0**, som redan finns i arbetskopian; ingen dependency eller paketfil har ändrats. Om Ajv saknas i en annan miljö behövs samma utvecklingsberoende där, inte en ändring av replaykärnan. Endast kontraktskontroller körs, inga AI-/SR-anrop.

**Minsta nästa implementationssteg:** bygg en separat lokal sessionshållare som tar ett manuellt förslag och källpaket, versionshanterar dem och använder detta kontrakt med mockad granskningsadapter. Pröva dialog och mänsklig bedömning av fynd innan livekoppling. Därefter utvärderas ett särskilt strukturerat SR-läge enligt kvalitetsplanen. Översättning till `ce3-model/1` är ett senare separat steg med profilens befintliga validator som grind.

Faktisk arbetsstatus, filförteckning och verifiering för denna leverans finns i [CHECKPOINT.md](CHECKPOINT.md).
