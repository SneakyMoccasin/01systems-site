# CE3.0 gemensam uppspelningskärna checkpoint 1

Isolerad Pythonprototyp för `fixed-replay/0.1`. Fabrikens positiva kandidat och originaltransportens A med färdigställd elanslutning använder exakt samma kärna och separata återläsningsgranskare. Ingen CE2-integration, ändring av originalfall eller demo ingår.

Kräver Python 3.9 eller senare, endast standardbibliotek. Inga paket behöver installeras. Kör från repositoryroten med `-B` för att undvika bytecodefiler.

## Kör hela checkpointen

Välj en **ny** explicit utmatningskatalog; verifieringskommandot skriver aldrig över tidigare bevis:

```sh
python3 -B isolated-tests/structural-ce3-replay/verification/run_checkpoint.py --output /private/tmp/ce3-checkpoint-1-repeat
```

Kommandot kör de generella testerna, kontrollerar originalens hashmanifest, återgranskar de två gamla historikmängderna läsande och kör de två nya fallmängderna två gånger. Varje ny historik sparas, återläses och granskas i en separat process. Samtliga eventordningar jämförs övergång för övergång med originalen. Sju resultatfiler per körning jämförs byte för byte. Fel ger felkod och FAIL; inget facit uppdateras.

Den levererade körningen finns i `results/checkpoint-1/`. Se `REPORT.md`, `results/checkpoint-1/summary.json`, `generic-checks.json` och `cases/checkpoint.json`.

Endast de generella kontrollerna:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

## Kör eller granska en normaliserad inmatning

```sh
python3 -B isolated-tests/structural-ce3-replay/cli.py replay --input isolated-tests/structural-ce3-replay/results/checkpoint-1/cases/run-1/factory_candidate.input.json --output /private/tmp/ce3-factory.history.json.gz
python3 -B isolated-tests/structural-ce3-replay/cli.py audit --history /private/tmp/ce3-factory.history.json.gz --trusted-input isolated-tests/structural-ce3-replay/results/checkpoint-1/cases/run-1/factory_candidate.input.json --output /private/tmp/ce3-factory.audit.json
```

`--trusted-input` ska vara den förväntade inmatningen från en betrodd källa. Att ändra både historik och dess inmatning ersätter inte kontrollen mot checkpointens manifest.

`replay` tar även `--max-paths`, `--max-rows`, `--max-steps`. CLI returnerar 0 för COMPLETE uppspelning respektive PASS granskning, 2 för INCOMPLETE/runtime-ERROR och 1 för indata- eller granskningsfel. Resultat från en ofullständig körning kan aldrig bli ett ofullständigt PASS. CLI förbjuder utmatning i de två gamla fallmapparna och utmatning över egen indata. Använd i övrigt en separat utmatningsfil; en uttryckligt vald befintlig CLI-utdatafil kan ersättas.

## Struktur och begränsning

- `core/`: versionsschema, profilbeskrivning, typade uttryck, atomiska övergångar, alla eventordningar och deterministisk persistens.
- `audit/`: separat rekonstruktion, utan import av uppspelarens förvillkor, effekter eller övergångar.
- `adapters/`: rent strukturell översättning av de äldre JSON-formaten.
- `cases/`: källförankrade budget-, deadline- och externa rollmetadata. Observationer och checkpointval finns utanför kärnan i verifieringslagret.
- `verification/`: handhärlett generellt exempel, gräns-/felinjektionstester, semantisk projektion och exakt de två efterfrågade fallmängderna.
- `preservation-before.json`: 856 ursprungliga filhashar och HEAD före arbetet, inklusive befintliga ospårade filer.

Se `FORMAT.md` för det exakta formatet och `core/profile.json` för maskinläsbart stöd. Eventutfall som schemalägger nya events avvisas före start, även i oanvänd gren. Profilen saknar generell framtids-/strategisökning och full v1-statusberäkning. Den fulla regressionsmängden på 634 huvudhistoriker ingår inte i checkpoint 1.

Stanna vid denna checkpoint. Nästa byggsteg är resterande regressioner och fallkontroller, inte nya semantiska mekanismer eller demoändringar.
