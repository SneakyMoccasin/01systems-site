# CE3 gemensam uppspelningskärna – checkpoint 2

Isolerad Pythonprototyp för `fixed-replay/0.1`. Fabrik och båda transportpaketen använder samma kärna och samma separata historikgranskare. Checkpoint 2 omfattar arkitekturgranskningens 634 huvudhistoriker samt kompletterande fallkontroller. Ingen CE2-integration eller demoändring ingår.

Kräver Python 3.9 eller senare och endast standardbiblioteket. Kör från repositoryroten med `-B` för att undvika bytecodefiler.

## Kör hela regressionen

Välj en **ny** utmatningskatalog inne i prototypen. Befintliga bevis skrivs aldrig över:

```sh
python3 -B isolated-tests/structural-ce3-replay/verification/run_regression.py --output isolated-tests/structural-ce3-replay/results/checkpoint-2-repeat
```

Kommandot genomför hela leveransen två gånger:

- 634 huvudhistoriker: fabrik 12, bankavslag A/B 10, originaltransport 300, samma parkering 312. Checkpoint 1:s sex historiker ingår.
- 20 ytterligare giltiga historiker, inklusive fabrikens referenshistorik. Alla 13 + 10 + 10 namngivna kompletterande fallkontroller genomförs; 19 av dem är felinjektioner.
- Separat återläsningsgranskning i egen process för varje historikpaket och övergångsvis semantisk jämförelse mot de oförändrade originalbanorna.
- Oberoende kontroll av samtliga permutationskombinationer, nio extra kontroller av saknade/dubblerade banor och faktisk resursbegränsning, samt 3 456 A/B-par.
- Checkpoint 1:s 24 generella tester och tre tester av regressionsverktygen: sammanlagt 27 tester med 66 delkontroller per körning.
- SHA-256-kontroll av skyddade original och kod/fixeringar, samt bytejämförelse av samtliga resultatfiler mellan körningarna.

Ett avsiktligt skadat paket sparas med granskarstatus `FAIL`; en avsiktligt begränsad uppspelning sparas med `INCOMPLETE`. Den omgivande kontrollen får bara PASS när dessa förväntade avvisningar verkligen inträffar. De räknas aldrig som godkända huvudhistoriker. Oväntat fel ger felkod och en synlig FAIL-sammanställning, med fall- och indataidentitet och första avvikande övergång när jämförelsen hittar en sådan.

Levererade artefakter ligger i `results/checkpoint-2/`; läs `REPORT.md` och `results/checkpoint-2/summary.json`. `run-1/` och `run-2/` innehåller normaliserade indata, kompletta gzip-historiker, granskningsbesked, fallkontroller, observationer per eventordning, alla A/B-jämförelser och negativa kontrollpaket. Den separata utvecklingskörningen `results/checkpoint-2-attempt-1/` behåller sitt FAIL och en förklaring i `development-note.json`.

## Enskilda tester och äldre checkpoint

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
```

Checkpoint 1:s gamla resultat är bevarade i `results/checkpoint-1/`. Dess avgränsade tvåfallskommando finns kvar:

```sh
python3 -B isolated-tests/structural-ce3-replay/verification/run_checkpoint.py --output isolated-tests/structural-ce3-replay/results/checkpoint-1-repeat
```

Testupptäckten inkluderar numera även de tre nya verktygstesterna. Kör inget äldre fabriks- eller transportkommando som skriver till originalresultaten.

## Kör eller granska en normaliserad inmatning

```sh
python3 -B isolated-tests/structural-ce3-replay/cli.py replay --input isolated-tests/structural-ce3-replay/results/checkpoint-2/run-1/factory/candidate.input.json --output isolated-tests/structural-ce3-replay/results/example.history.json.gz
python3 -B isolated-tests/structural-ce3-replay/cli.py audit --history isolated-tests/structural-ce3-replay/results/example.history.json.gz --trusted-input isolated-tests/structural-ce3-replay/results/checkpoint-2/run-1/factory/candidate.input.json --output isolated-tests/structural-ce3-replay/results/example.audit.json
```

`--trusted-input` ska identifiera den förväntade inmatningen separat. Att ändra både historik och medföljande modell ersätter inte kontrollen mot betrodda indatahashar.

`replay` accepterar också `--max-paths`, `--max-rows`, `--max-steps`. CLI returnerar 0 för COMPLETE/PASS, 2 för INCOMPLETE/runtime-ERROR och 1 för indata- eller granskningsfel. CLI förbjuder utmatning i originalfallmapparna och över egen indata; välj i övrigt en ny fil eftersom en uttryckligt vald befintlig CLI-utdatafil kan ersättas.

## Struktur och bevisgräns

- `core/`, `audit/`: oförändrade från checkpoint 1. Uppspelning respektive oberoende rekonstruktion; ingen fallstyrning.
- `adapters/`: formatöversättning. Fabrikens bank-A/B hämtar enbart saknad dokumentär källtext från omslutande skriptdokument.
- `cases/`: metadata och efterhandsobservationer. De ursprungliga rena transportfunktionerna i `observe.py` återanvänds läsande på en formatvy av den nya historiken. Inga äldre uppspelare importeras. Momentana avläsningar mitt i eventfasen är observationer, inte tillåtelse att fatta beslut då.
- `verification/regression_catalog.py`: fasta skript, prober och frysta samtidighetsgrupper; inga förväntade slutsatser går in i kärnan.
- `verification/semantic_compare.py`: matchar externa bindningar, även oanvända, och full eventordningssignatur; bevarar varje banas radordning.
- `verification/permutation_coverage.py`: separat kartesisk täckningskontroll utan uppspelarens eller granskarens enumereringskod.
- `verification/regression_faults.py`, `run_regression.py`: negativa kontroller och sammanhållen leveransgrind.
- `preservation-checkpoint-2-before.json`: 874 skyddade filhashar, inklusive 856 original/befintliga ospårade filer och checkpoint 1:s 18 bevarade bevisfiler.

Verifieringen förutsätter tillgång till de ursprungliga fallmapparna och de ospårade dokument som ingår i arbetskopians bevarandemanifest. Normaliserade inmatningar kan spelas upp och granskas fristående med CLI. Manifestet ska inte skrivas om för att dölja saknade eller ändrade original.

Se `FORMAT.md` och `core/profile.json` för exakt stöd. Eventkedjor avvisas även i oanvända grenar. Ingen plansökning, generell Möjlig/Stängd/Säkringsbar-beräkning, optimering, AI-onboarding eller trafikprognos ingår. Ett PASS gäller denna avgränsade profil och regressionsmängd, inte full v1 eller validerat produktvärde. Arbetet stannar efter checkpoint 2.
