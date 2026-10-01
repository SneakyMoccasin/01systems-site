# Fabriksflytten: vittneskontroll jämförd med konventionell baslinje

**Det finns en mekaniskt kontrollerad bana där D8 genomförs vecka 12 och Sverige behåller produktionsförmågan oavbrutet till och med vecka 26.** Den kräver de valda positiva bank-, kund- och kvalitetsbeskeden. Alla verksamhetsförutsättningar är konstruerade ASSUMED-uppgifter.

**Den kontrollerade vägen**

| Vecka | Beslut och händelser | Kvar, miljoner |
|---|---|---:|
| 0 | Ansök om finansiering (D1), teckna polskt lokalavtal (D2), säkra svenskt arbetslag (D9), begär kundgodkännande (D7). | 3 |
| 2 | Banken tillför 6; polsk lokal blir tillgänglig. Beställ arbetslag (D3) och ny maskin (D4). | 1 |
| 3 och 6 | Kunden godkänner vecka 3; polskt arbetslag blir redo vecka 6. | 1 |
| 10 | Ny maskin blir tillgänglig. Beställ kvalitetsprövning (D6). | 0 |
| 12 | Kvalitetsprövningen godkänns. Genomför D8. | 0 |
| Till och med 26 | Inga ytterligare beslut. Svensk lokal och ursprunglig maskin behålls; arbetslaget är säkrat genom D9. | 0 |

Varje vecka 0–26 spelades upp, även de utan beslut. Efter varje övergång kontrollerades de tre svenska villkoren separat i den sparade historiken. D5 och D10 genomförs aldrig. Båda ordningarna för de samtidiga händelserna vecka 2 gav samma slutsats.

**Maskinflytt och negativa besked — mekaniskt kontrollerat**

| Testad ändring | Vad körningen visar |
|---|---|
| D4 ersätts med D5 vecka 2 | Sverige förloras som produktionsalternativ **omedelbart vid D5 vecka 2**. Lokal och säkrat arbetslag finns kvar, men maskinen tas ur bruk. D8 genomförs ändå vecka 12. Alla fyra kombinationer av samtidiga eventordningar kontrollerades. |
| Banken avslår vecka 2 | Efter D3 återstår 1 miljon. D4 blockeras av finansieringskravet; D6 blockeras sedan av saknad maskin och D8 av saknad maskin och kvalitetsgodkännande. |
| Kunden lämnar inget svar vecka 3 | D8 blockeras av saknat kundgodkännande. Övriga planerade åtaganden genomförs och budgeten förbrukas. Vänteläget består utan ny prövning. |
| Kvaliteten underkänns vecka 12 | D8 blockeras av saknat kvalitetsgodkännande. Budgeten är förbrukad. Ingen omprövning erbjuds. |

Sverige bevaras i alla tre negativa beskedstester. De behåller kandidatens planerade åtgärder; blockerade försök får inga effekter och inga alternativa beslut läggs till. Ett misslyckat kandidatskript bevisar inte att alla andra banor är omöjliga.

**Jämförelse med baslinjen**

Huvudslutsatserna sammanfaller: ny maskin kan förenas med svensk kontinuitet, maskinflytt tar bort Sverige direkt och externa godkännanden krävs för D8. Baslinjens 14 miljoner för ny maskin och svensk kontinuitet motsvarar kandidatens faktiska utgifter. Dess vecka 12 vid maskinbeställning efter bankbeskedet stämmer med vittnet.

Två skillnader kräver rätt avgränsning:

- Baslinjens flyttväg till vecka 8 beställer kvalitetsprövningen vecka 6. Den testade flyttvarianten behåller D6 vid vecka 10 och når därför D8 vecka 12. Baslinjens nya-maskin-väg till vecka 10 beställer maskinen redan vecka 0; vittnet beställer vecka 2. Det är olika banor, inte motstridiga resultat.
- Baslinjens svar 2, att flyttvägen för 7 miljoner eller svensk säkring och modernisering för 8 miljoner återstår vid bankavslag, behöver villkoras på tidigare åtaganden. **Direkt budgethärledning:** kandidaten har redan betalat 3 för svensk personalsäkring och 2 för polskt avtal. Flyttvägen inklusive den betalda personalsäkringen kostar 10, medan svensk säkring och modernisering inklusive det betalda polska avtalet också kostar 10. De ryms inte i 8. Baslinjens alternativ beskriver således andra åtagandeförlopp, inte automatiskt tillgängliga reservvägar från kandidatens bankavslagstillstånd.

**Evidensgräns och vad jämförelsen tillför**

Mekaniskt kontrollerat är fem scenarier i totalt 12 eventordningar samt 13 kompletterande kontroller, bland annat engångsregel, deadlines och event före beslut vid horisonten. Resultatrapporten preciserar tidpunkt, blockerande förvillkor, saldo och övergången där Sverige förloras. Den gör slutsatserna spårbara till sparad historik; detta är ingen uppmätt förbättring av begriplighet.

Direkta härledningar, inte uttömmande sökresultat, är kostnadssummorna ovan och baslinjens moderniseringsgräns: personalsäkring 3 + modernisering 5 + billigaste polska etablering 7 = minst 15, över tillgängliga 14. Att ovillkorlig garanti för D8 saknas följer också direkt av medgivna negativa besked utan omprövning; ingen generell strategiberäkning har körts.

Ännu inte mekaniskt beräknat är alla alternativa eller anpassade banor, globalt tidigaste produktionsstart samt baslinjens startvägar vecka 8 och 10. Uteblivet bankbesked, nekande kundbesked och uteblivet kvalitetsresultat ingick inte som körda negativa huvudscenarier. Ingen generell sammansatt målberäkning, verifiering av hela CE2/v1, uppmätt tidsvinst eller bevis på produktvärde redovisas.

Underlag: [körresultat och kontrollförteckning](/Users/christian/Projects/pulse_engine_clean/isolated-tests/structural-ce-v1-factory-witness/results/report.md), [maskinläsbara resultat](/Users/christian/Projects/pulse_engine_clean/isolated-tests/structural-ce-v1-factory-witness/results/summary.json) och [oförändrad kopia av den bifogade baslinjen](/Users/christian/Projects/pulse_engine_clean/isolated-tests/structural-ce-v1-factory-witness/comparison/baseline-analysis.md). Jämförelsen använder de redan körda resultaten; inga nya modellkörningar eller ändringar av CE2 har gjorts för rapporten.
