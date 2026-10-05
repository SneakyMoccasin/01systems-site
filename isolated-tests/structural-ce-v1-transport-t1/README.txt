Transportfall T1 – separat mekanisk kontroll

Krav: Python 3.9 eller senare, endast standardbibliotek. Inga CE2- eller
fabriksmoduler importeras. Inget gränssnitt ingår.

Från projektroten, kör båda reproduktionskörningarna och jämför alla resultat:

  python3 -B isolated-tests/structural-ce-v1-transport-t1/reproduce.py

Det sparar results/run-1/, results/run-2/, results/reproducibility.json och
results/report.txt. Utdata skrivs över vid en ny körning; frysta indata ändras
aldrig. För separat reproduktion utan att röra checkpointade resultat:

  python3 -B isolated-tests/structural-ce-v1-transport-t1/reproduce.py --output /private/tmp/transport-t1-repeat

En enskild komplett körning:

  python3 -B isolated-tests/structural-ce-v1-transport-t1/run.py --output /private/tmp/transport-t1-single

Båda kommandona ger felkod vid avvikelse och skriver FAIL vid fel. PASS skrivs
först efter avslutade kontroller. Avsiktligt blockerade försök är förväntad
diagnostik och innebär inte i sig test-FAIL.

Filer
- sources/transport-t1-user.txt: ordagrant original med ursprunglig SHA-256.
- run-spec.txt: fryst metod, avgränsning, observationsdefinitioner och facit.
- model.json: direkt översättning av T1–T12, state-domäner och events.
- scripts.json: fasta ordnade försök, inklusive B:s villkor för T7 vecka 20.
- expected.json: oberoende förväntningar härledda före runtime/körning.
- freeze.json: tidpunkt och hashmanifest som låser ovanstående samt originalet
  av v1-kontraktet i den oförändrade fabriksmappen.
- replay.py: uppspelning och alla samtidiga eventpermutationer, ingen sökning.
- audit_history.py: separat rekonstruktion av återlästa historiker, utan import
  av replay.py eller expected.json. Kontrollerar både före och efter varje rad.
- observe.py: ren avläsning och A/B-jämförelse, styr aldrig besluten.
- checks.py: separata engångs-/budgetprober och felinjektioner i historikkopior.
- run.py: sparar, återläser, granskar och jämför varje historik med fryst facit.
- reproduce.py: två körningar, filvis SHA-256-jämförelse och fabriksintegritet.

Historiker lagras som deterministisk JSON.gz för rimlig filstorlek. De innehåller
full modell, skript, externt utfall och samtliga före-/eftersnapshots. Läs till
exempel med Python: gzip.open(path, 'rt', encoding='utf-8') och json.load(...).
TSV-tidslinjer visar en referensordning per fall; samtliga ordningar finns i
histories/ och motsvarande återläsningsgranskningar i audits/.

Jämför A och B inom samma elutfall. Ett godkänt T7 är en modelldefinierad
markör, inte faktisk trafikdrift. Uteblivet är vänteläge utan ny prövning.
Observerade gap som kvarstår vecka 26 är censurerade vid horisonten; inga
senare slutdatum antas. Resultaten avser de planerade förbättringarna, inte
avsaknad av samtliga befintliga alternativ till bilen.

Kontrollvärden får inte ändras för att matcha körningen. Eventuella avvikelser
ska utredas separat. Ingen generell strategi-, optimerings- eller
säkringsbarhetsberäkning, verifiering av hela v1 eller produktvärdesmätning ingår.
