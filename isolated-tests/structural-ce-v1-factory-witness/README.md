# Isolerad vittneskontroll för fabriksfallet

Detta verktyg är fristående från CE2 och använder inga projektberoenden. Det ändrar inte det frysta Structural CE v1-kontraktet. Alla verksamhetsförutsättningar är användarens konstruerade ASSUMED-underlag.

## Körning

Kör med Python 3.9 eller senare, endast standardbibliotek:

```sh
python3 -B /Users/christian/Projects/pulse_engine_clean/isolated-tests/structural-ce-v1-factory-witness/run.py
```

Resultat sparas i `results/`. För en separat reproduktionskörning, lägg till `--output /private/tmp/factory-witness-repeat`. Körningen avbryts med felkod om en kontroll inte uppfylls. Rapporten märks som pågående innan kontrollerna börjar; PASS skrivs först när alla kontroller har passerat.

## Fryst kandidat och precisering

Frågan är: Finns minst en tillåten bana där ledningen genomför D8 senast vecka 26 och svensk produktionsförmåga finns kvar oavbrutet från vecka 0 till och med vecka 26? Förmågan kräver samtidigt svensk lokal, ursprunglig maskin i bruk i Sverige och svenskt arbetslag.

Det är gemensam möjlighet på samma bana. Verktyget beräknar inte en generell sammansatt målstatus eller en strategi. Ett godkänt vittne ger ett positivt svar på existensfrågan. Ett underkänt vittne utesluter inte andra banor. Ingen ovillkorlig säkringsbarhetsberäkning ingår.

- `model.json`: tillståndsdomäner, start, samtliga elva beslut, kostnader, enkla förvillkor, effekter, timers, externa utfall och källhänvisningar.
- `candidate.json`: exakt beslutsskript och tre godkända externa besked från rapporten. Övriga veckor innehåller inga beslut.
- `scenarios.json`: oförändrad kandidat plus de fyra uttryckligen begärda negativa kontrollerna. Maskinflyttsvarianten ersätter D4 med D5 vecka 2.
- `replay.py`: uppspelning av varje vecka och alla samtidiga eventpermutationer. Ingen logik för svensk kontinuitet eller målberäkning.
- `audit_history.py`: oberoende övergångsgranskning och separat inspektion av svensk produktionsförmåga i den sparade historiken.
- `checks.py`: kompletterande gräns- och felinjektionskontroller, åtskilda från kandidatbanan.
- `run.py`: körning, persistens, återläsning, permutationskontroll och rapportering.
- `sources/`: oförändrade kopior av användarens två bifogade textunderlag. Originalen ändras inte.

Alla beslut tas högst en gång. Schemalagda events efter horisonten sparas men utförs inte. Expiry gäller vecka 5 respektive 7 för sista tillåtna beslut vecka 4 respektive 6. Alla förfallna events, även ej tillämpliga, loggas före beslut. Vid uteblivet svar behålls ett explicit vänteläge utan ny prövning. Inga extra förvillkor införs vid deterministiska färdigställanden. Modernisering återställer inga resurser. Ny och flyttad maskin är inte ömsesidigt uteslutande.

En avvisad planerad åtgärd i en negativ kontroll är en diagnostikrad utan state-effekt, inte ett tillåtet genomfört beslut. Verktyget fortsätter genom vecka 26 för att visa återstående händelser och försök; hela det ursprungliga skriptet markeras då som otillåtet. Det repareras aldrig.

Resultatet är en kontrollerad vittnesbana under de deklarerade antagandena. Det är inte verifiering av CE2, hela v1, ett allmänt modellkontrollverktyg eller produktvärde.
