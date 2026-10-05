Lokal transportdemo – sparade resultat, ingen ny simulering

Starta från projektroten med Python 3.9 eller senare (endast standardbibliotek):

  python3 -B isolated-tests/structural-ce-v1-transport-t1/demo/serve.py

Öppna http://127.0.0.1:8765/ i en webbläsare. Stoppa servern med Ctrl+C.
Vid upptagen port: lägg till --port 8766 och öppna motsvarande lokala adress.
Sidan behöver den lokala servern och ska inte öppnas som en file://-fil.
Inga paket behöver installeras. Inga externa typsnitt, CDN:er eller andra
nätresurser används. Servern lyssnar endast på 127.0.0.1. Ingenting publiceras.

Välj färdigställd elanslutning, avslag eller uteblivet besked. Veckoväljaren
visar samma veckoslut i båda förloppen. Tidslinjerna och gaprutorna visar hela
förloppet till vecka 26 och ändras inte med veckoväljaren. Den vertikala linjen
visar vald vecka. Budgetkurvorna använder samma skala, 0–30 miljoner.

Statusen under tidslinjen är efter veckans events och beslut. Den skiljer
färdiga bussförutsättningar från genomfört trafikgodkännande. Händelselistan
skriver ut beslutsnamn. Blockeringar visar de verkliga felande förvillkoren
i den sparade historiken. Tidigare blockering och läget precis vid
parkeringsborttagningen går att fälla ut.

Glapp gäller bara de planerade förbättringarna; befintlig buss- och cykeltrafik
kvarstår. Vid kvarstående glapp visas ”minst X veckor till horisonten vecka 26”.
Det är observerad frånvaro av modellens godkännande fram till horisonten,
inte en prognos om senare start. Avslag skiljs från ett explicit vänteläge
utan ytterligare prövning. Godkännande ska inte tolkas som faktisk drift.

Datakälla
data.py läser ../same-parking-week14/results/run-1/summary.json och de sex
sparade referenshistorikerna i samma körnings histories/*.json.gz. Filernas
SHA-256 måste motsvara båda manifesten i den jämförelsens reproducibility.json.
Sammanställningen måste ha status PASS och veckosluten vara ordningsoberoende.
A:s momentana cycle_ready-markör vid borttagningen varierar med eventordningen;
detta visas uttryckligen. Det påverkar inte cykelöppningen eller glappen. Ingen modellmotor,
granskare eller simulationsmodul importeras av demon. Resultatfilerna ändras
inte. UI:t använder sparade veckoslut, färdigveckor, gap och blockeringsrader.

Utan läsbara, matchande resultat visas ett felmeddelande och inga ersättningsdata.
Servern tillhandahåller enbart tre statiska filer och en läsande resultatadress.

Kontrollera dataöverföringen utan att köra några modellförlopp:

  python3 -B isolated-tests/structural-ce-v1-transport-t1/demo/verify.py
  node --check isolated-tests/structural-ce-v1-transport-t1/demo/dist/app.js

verify.py jämför alla 162 veckoslut och samtliga namngivna händelser/beslut
med de sparade historikerna. Den kontrollerar också att parkeringsbeslutet i A och B
fortfarande visas efter blockerat trafikgodkännande vecka 12. Node behövs endast för
den valfria JavaScript-syntaxkontrollen, inte för att öppna demon.

Visningskontroll och kontrollsummor för skyddade original redovisas separat
i validation.txt och validation.json. Demons filer ligger endast här. Den nya jämförelsen ligger separat i
../same-parking-week14/. Originalets frysta underlag, skript och resultat,
CE2, v1-kontraktet och fabrikscheckpointen bevaras. Ändringen från demo-
checkpoint 439837d beskrivs i change-report.txt.
