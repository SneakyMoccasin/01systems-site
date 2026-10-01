# Fristående vittneskontroll — resultat

**PASS: kandidatbanan finns under de angivna ASSUMED-förutsättningarna.**

D8 genomförs vecka 12. Svensk lokal, ursprunglig maskin i bruk i Sverige och svenskt arbetslag finns kvar efter varje övergång till och med vecka 26. Slutbudget: 0 miljoner.

Detta är en kontrollerad vittnesbana. Det är inte en generell beräkning för sammansatta mål, verifiering av CE2 eller hela v1, eller bevis på produktvärde. Ingen sökning över ledningsstrategier eller generell säkringsbarhetsberäkning har körts.

## Körning och metod

Kommando: `python3 -B run.py` från denna testmapp. Endast Pythons standardbibliotek används. Alternativ utmatningsmapp: `--output /absolut/sökväg`.

Modellen och kandidatbanan läses från JSON. Alla veckor 0–26 besöks, inklusive veckor utan beslut. Alla förfallna events körs före veckans beslut. Varje samtidig eventordning spelas upp separat utan sammanslagning. Historiker sparas och läses tillbaka innan den oberoende övergångsgranskningen och den separata svenska historikkontrollen körs.

Det finns inga kontrollvillkor för svensk kontinuitet i replay-koden. Den läser inte denna egenskap och ändrar aldrig ledningsval utifrån den. Historikgranskaren kontrollerar både före- och eftertillstånd, vilket även inkluderar start och horisont.

I negativa scenarier loggas otillåtna planerade beslut som avvisade försök utan effekter. Kvarvarande veckor spelas upp för diagnostik; dessa avvisade försök räknas inte som genomförda beslut eller som en giltig kandidatbana. Ingen reparerande strategi läggs till.

## Utförda huvudkontroller

| Scenario | Eventordningar | D8 | Obruten svensk förmåga | Slutbudget | Avvisade försök |
|---|---:|---|---|---:|---|
| candidate | 2 | vecka 12 | ja | 0 | inga |
| bank_rejected | 2 | genomförs inte | ja | 1 | D4, D6, D8 |
| customer_absent | 2 | genomförs inte | ja | 0 | D8 |
| quality_rejected | 2 | genomförs inte | ja | 0 | D8 |
| machine_moved | 4 | vecka 12 | nej — förlust vid D5 vecka 2 | 4 | inga |

Vecka 2 provas båda ordningarna för bankbesked och polskt lokaltillträde i varje scenario. Maskinflyttsvarianten provar dessutom båda ordningarna för arbetslag och maskin vid vecka 6: totalt 2 × 2 = 4 kombinationer. Ingen ordningskänslighet påvisades för de kontrollerade egenskaperna i dessa körningar.

Kandidatens tre externa godkännanden är valda utfall, inte garanterade besked. Bankavslag blockerar D4, D6 och D8 i just det fasta skriptet. Uteblivet kundsvar och underkänd kvalitet blockerar D8. Inget nytt svar schemaläggs efter uteblivet. Maskinflyttsvarianten kan genomföra D8 men förlorar svensk maskinförmåga direkt vid D5.

Kontrollerat för varje sparad övergång: förvillkor, engångsregel, fullständiga före-/eftertillstånd, budgetens domän och separat budgetbokföring, kostnad endast vid accepterat beslut, deklarerade positiva ledtider, eventkö och förfall, externa utfall, förfallna ej tillämpliga events, beslut efter samtliga events, exakt kandidatordning, samtliga veckor och horisont inklusive vecka 26.

Huvudscenarierna omfattar **12 fullständiga historiker, 1172 historikrader och 2344 kontrollerade före-/eftertillstånd för svensk förmåga**. Veckomarkörer ingår i historikraderna; de är inte nya verksamhetsövergångar.

## Kompletterande kontroller

- **PASS** `once_only`: D9 två gånger samma vecka: andra försöket avvisas utan ytterligare kostnad.
- **PASS** `lease_week_4`: D2 tillåts sista giltiga veckan 4 och lokalen blir tillgänglig vecka 6.
- **PASS** `lease_week_5`: Expiry vecka 5 behandlas före D2 och blockerar beslutet.
- **PASS** `secure_week_6`: D9 tillåts sista giltiga veckan 6; avgångseventet vecka 8 förfaller utan effekt.
- **PASS** `secure_week_7`: Expiry vecka 7 blockerar D9; det osäkrade arbetslaget lämnar vecka 8.
- **PASS** `quality_then_d8_at_horizon`: Kvalitetsbesked vid vecka 26 behandlas före D8; horisonten är inklusive.
- **PASS** `lease_loss_at_horizon`: Uppsägning vecka 18 ger lokalbortfall vecka 26, vilket historikkontrollen upptäcker.
- **PASS** `effect_beyond_horizon`: D10 vid horisonten får schemalägga vecka 34; effekten utförs inte i förtid.
- **PASS** `modernization_timer`: D11 kräver redan säkrat arbetslag; kostnad 5 och färdigmarkör efter sex veckor.
- **PASS** `both_machines_allowed`: D4 och D5 kan båda genomföras; två maskiner räknas utan exklusivitetsregel.
- **PASS** `detect_budget_tampering`: En manipulerad budget efter D9 avvisas av historikgranskaren.
- **PASS** `detect_wrong_schedule`: En manipulerad maskinleveransvecka avvisas av historikgranskaren.
- **PASS** `detect_missing_week_marker`: En saknad veckostart på en vecka utan beslut avvisas av historikgranskaren.

## Sparade underlag och begränsning

`candidate-timeline.tsv` visar varje rad i kandidatens referensordning. `histories/` innehåller fullständiga före-/eftertillstånd, externa utfall, beslut, eventköer, källhänvisningar och alla eventordningar. `audits/` innehåller den separata granskningens resultat. `summary.json` innehåller exakta antal och SHA-256 för modell, kandidat, scenarier, källkopior och verktygsfiler.

Det negativa bankutfallet bevisar endast att det oförändrade kandidatskriptet inte fungerar i den grenen. Ingen slutsats om alla alternativa ledningsbanor dras. De kompletterande proberna kontrollerar utvalda gränser; de utgör inte en uttömmande verifiering av verktyget eller modellen. Den positiva slutsatsen gäller det deklarerade diskreta veckomodellens tillstånd och övergångar.
