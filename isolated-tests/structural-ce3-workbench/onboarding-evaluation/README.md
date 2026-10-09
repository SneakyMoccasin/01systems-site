# Isolerad parad liveutvärdering

Detta verktyg jämför ett AI-utkasts egenkontroll (A) med en separat, strukturerad granskning enligt SR-grounded-principer (B). Det återanvänder **principer**, inte SR:s kod eller körkedja. Samma modell används i båda grenarna; felriskerna är därför inte oberoende. Resultaten och den källbundna bedömningen finns i [REPORT.md](REPORT.md).

Fem korta svenska syntetiska fall, två nya utkast per fall, ett anrop per steg: högst 30 anrop. Båda grenarna får exakt samma fullständiga källpaket och oförändrade modellförslag. A/B har samma schema, modell, tokenram och reasoning-inställning. Ordningen växlas i andra upprepningen; varje anrop är stateless. Det enda avsedda metodiska skillnaden är granskningsinstruktionen. Inget facit skickas. Utkasten korrigeras aldrig och inga fel injiceras.

Denna mindre körning följer användarens senare instruktion om 5 × 2 och ersätter för detta pass storleken 12 × 3 i den äldre [utvärderingsplanen](../contracts/onboarding-v1/EVALUATION.md). Inga kunddialogrundor, slutmodeller eller oberoende mänskliga bedömare ingår. Frågebedömning är preliminär; antal frågor mäter inte faktisk arbetsbörda.

## Körning

Från repositoryts rot, med befintlig Node och Ajv; inga nya beroenden:

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-evaluation/evaluation.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/run.cjs verify
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/summarize.cjs
```

Den bevarade livekörningen startades med:

```sh
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/run.cjs live /Users/christian/Projects/skeptical-reader/.env.local
```

Nyckeln läses i minnet, ingår inte i kommandot, prompts, resultat eller loggar. Endast namngivna miljövariabler tolkas; dotenv exekveras inte. För annan lokal miljö behövs `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6-terra` och OpenAI som leverantör. Inga konton eller inköp görs. Modellbyte kräver en ny priskontroll och ett nytt låst protokoll.

`freeze` får bara köras en gång innan en ny studies första dispatch; den befintliga frysningen får inte ersättas. Kod, stimuli, facit, prompts, protokoll och kontraktsfiler verifieras före varje körning. Befintliga anrop återanvänds aldrig som osynliga återförsök. Resultaten behålls på plats: radera dem inte för att återställa budget. Ett nytt experiment behöver en separat katalog, budget och frysning. Resultaten reproduceras exakt offline; nya modellutdata kan variera och modellalias är inte en garanterat oföränderlig modellversion.

## Adaptergräns och kontrakt

`adapters.cjs` genererar ett strikt JSON-utdataschema från onboarding-v1. Modellförfattaren äger `analysis`, `scope`, `items`, `gaps` och frågor. Adaptern tillför endast versions-/källkuvert och deterministiska citatpositioner. Wire-referensen använder `source_id`, `source_version`, ordagrant `quote` och nollbaserad `occurrence`; ingen stavning, innebörd, post eller länk repareras. Samtliga råsvar finns kvar även vid valideringsfel.

Granskarna lämnar en explicit bedömning per aktiv item, separata fel och frågor. Bedömningarnas stödstatus är ett isolerat utvärderingsfält; findings följer befintliga review/1-betydelser. Frågor kan gälla redan korrekt modellerade okända uppgifter utan att räknas som nya modellfel. Frågelänkar valideras separat. Endast adapterkuvertet bygger `assessed_item_ids`, producentidentitet och snapshot-digest. Båda grenar genomgår samma ursprungliga schema- och tvärreferenskontroller. Ogiltiga förslag som ändå kan monteras sparas och kan granskas; deras kontraktsfel kvarstår synligt och rättas inte.

Inga onboarding-kontrakt har ändrats. Detta utvärderingsformat `ce3-paired-evaluation/1` är ingen migration av produktkontraktet. Sessionshållarens mockbegränsning är oförändrad. Inga resultat matas in i kundsessioner och ingen överlämning, CE-kompilering eller körning görs.

## Kostnad och lokal lagring

[protocol.json](protocol.json) innehåller den daterade officiella taxan och API-källorna. Standardnivå, inga verktyg, högst 6 000 genererade token inklusive reasoning. Indatans konservativa gräns är JSON-begärans UTF-8-byteantal plus 4 096 token för inramning, högst 32 000. Detta räknar även schema och instruktioner; större begäran stoppas före anropet. Bytegränsen överskattar textens bytebaserade tokenisering. Maxpriset inkluderar 1,25 × indatapris för eventuella cache-skrivningar:

`30 × (32 000 × 2,50 + 6 000 × 12) / 1 000 000 = 4,56 USD < 5 USD`.

`provider.cjs` reserverar 0,152 USD beständigt före varje dispatch och lämnar reservationen kvar även vid avbrott, fel eller okänd usage. Ingen SDK med dolda återförsök används; retrytaket är noll. Ett processlås förhindrar parallell körning. Vid hård processkrasch finns reservationen kvar och ett kvarvarande `run.lock` kräver manuell kontroll att processen har avslutats innan låset tas bort. En påbörjad/ofullständig parpost körs inte om. Detta är ett litet lokalt engångsverktyg, inte distribuerad budgethantering.

Varje anrop sparar den exakta begäran utan auth-header, rå HTTP-body, timing/modell/usage, parsade data, kontraktsartefakt och validering. JSON-filer skrivs atomiskt; budgeten fsync:as före dispatch. Saknad usage betyder okänd faktisk kostnad. Taxeberäknad kostnad och en cache-skrivningsövre kostnad särredovisas; leverantörens faktura hämtas inte. Modellen kan använda promptcache mellan anrop, vilket påverkar kostnad/tid men tillför inget granskningssvar från den andra grenen.

`gold.json` är låst före körningen. `adjudication.json` innehåller efterföljande källbunden bedömning av den faktiska körningen; varje fynd och fråga går att kontrollera. `summarize.cjs` räknar mått från loggarna och explicita bedömningsetiketter. En kodagents semantiska bedömning är ingen ersättning för två oberoende mänskliga bedömare. Nästa steg är mänsklig kontroll av dessa bedömningar före ett större försök eller produktarbete.
