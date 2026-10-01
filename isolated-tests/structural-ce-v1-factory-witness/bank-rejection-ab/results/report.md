# Bankavslag vecka 2: jämförelse av två fasta förlopp

**A genomför inte den angivna Polenbanan och behåller svensk produktionsförmåga till och med vecka 26. B godkänner produktionsstart i Polen vecka 8 men förlorar svensk produktionsförmåga redan vecka 2. Båda slutar med 1 miljon kvar.** Detta är mekaniskt kontrollerat för exakt de beställda förloppen.

Vecka 0 genomför båda **ansöka om finansiering**, **teckna polskt lokalavtal** och **begära kundgodkännande**, i den ordningen. A genomför därefter även **säkra svenskt arbetslag**. B genomför aldrig det beslutet. Banken avslår vecka 2 och kunden godkänner vecka 3 i båda fallen.

| Vecka | A: svenskt arbetslag säkrat | B: svenskt arbetslag inte säkrat | Kvar A / B, miljoner |
|---|---|---|---:|
| 0 | Polskt avtal kostar 2; svensk personalsäkring kostar 3. | Polskt avtal kostar 2. | 3 / 6 |
| 2 | **Rekrytera och utbilda polskt arbetslag** genomförs för 2. **Flytta svensk maskin** blockeras: endast 1 återstår, men flytten kostar 2. | **Rekrytera och utbilda polskt arbetslag** och **flytta svensk maskin** genomförs för 2 vardera. Sverige förlorar maskinen i bruk direkt. | 1 / 2 |
| 6 | Polskt arbetslag blir redo. **Beställa kvalitetsprövning** blockeras eftersom ingen maskin finns i Polen. | Polskt arbetslag och flyttad maskin blir tillgängliga. **Beställa kvalitetsprövning** genomförs för 1. | 1 / 1 |
| 8 | **Godkänna produktionsstart** blockeras: maskin och kvalitetsgodkännande saknas. Det säkrade svenska arbetslaget stannar. | Den faktiskt beställda kvalitetsprövningen godkänns; **godkänna produktionsstart** genomförs. Det osäkrade svenska arbetslaget lämnar också denna vecka. | 1 / 1 |
| 26 | Svensk lokal, ursprunglig maskin i bruk i Sverige och svenskt arbetslag finns kvar. | Svensk produktionsförmåga är fortsatt förlorad. | 1 / 1 |

**Blockerade beslut skapar inga följdevents.** I A finns därför varken något event för maskinens ankomst eller någon kvalitetsprövning vecka 8. Det förvalda positiva kvalitetsutfallet används aldrig: ingen prövning beställdes. I B schemaläggs kvalitetsprövningen först av den genomförda beställningen vecka 6 och ger godkännande två veckor senare. A:s blockerade försök loggas utan kostnad eller annan effekt; inga ersättningsbeslut läggs till.

Kontrollen besökte varje vecka 0–26 och granskade budget, förvillkor, engångsregel, schemaläggning och event före beslut. Svensk produktionsförmåga kontrollerades separat i sparad och återläst historik. A kördes i båda eventordningarna vecka 2. B kördes i alla åtta kombinationer av samtidiga events vecka 2, 6 och 8. Samma redovisade utfall erhölls i samtliga ordningar. Modellen, kontraktet och tidigare resultat är oförändrade.

Resultatet gäller bara dessa två fasta förlopp med bankavslag. Inga andra strategier eller anpassningar har sökts eller bedömts.

Kör igen med `python3 -B isolated-tests/structural-ce-v1-factory-witness/bank-rejection-ab/run.py` från projektroten. `../scripts.json` sparar beslutsförloppen; `A-histories.json` och `B-histories.json` sparar alla övergångar och eventordningar. Separata granskningar finns i `A-audits.json` och `B-audits.json`, läsbara tidslinjer i motsvarande TSV-filer och sammanställning samt kontrollsummor i `summary.json`.
