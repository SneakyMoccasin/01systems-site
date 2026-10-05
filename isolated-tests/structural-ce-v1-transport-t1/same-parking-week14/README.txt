Separat jämförelse: parkering bort vecka 14 i båda förloppen

Från projektroten:
  python3 -B isolated-tests/structural-ce-v1-transport-t1/same-parking-week14/reproduce.py

Separat reproduktionskatalog utan att skriva över sparade resultat:
  python3 -B isolated-tests/structural-ce-v1-transport-t1/same-parking-week14/reproduce.py --output /private/tmp/same-parking-repeat

En körning:
  python3 -B isolated-tests/structural-ce-v1-transport-t1/same-parking-week14/check.py --output /private/tmp/same-parking-single

Endast Python 3.9+ och standardbibliotek. Originalets oförändrade modell,
uppspelare och separata granskare läses från föräldramappen. De gamla
skripten och resultaten används inte som utdata för den nya uppspelningen.

run-spec.txt och expected.json är frysta före körning med freeze.json.
scripts.json ändrar enbart placeringen av A:s T12. Resultaten ligger i results/.
JSON.gz-filerna innehåller samtliga historiker och återläsningsgranskningar.
reproduce.py kör två gånger och jämför alla resultatfiler byte för byte.

Observera A:s samtidiga events vecka 14: cycle_ready är ordningskänsligt
precis efter borttagningseventet. Alla varianter sparas. Sammanställningens
at_parking.cycle_ready=null betyder varierar, inte falskt eller saknat underlag.
Veckoslut och rapporterade godkännanden/gap är lika i samtliga ordningar.

Den lokala demon läser denna jämförelse via ../demo/serve.py på port 8765.
Originaljämförelsen bevaras i föräldramappens results/.
