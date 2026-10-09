# Stödgranskning: fixed-replay/0.1

Granskad kod: HEAD `386671794c95f527c5c0d026cf5f339aa164f627` på `decision-flow-demo-v1`. Hela `structural-ce3-replay/` har tom git-diff mot kärncheckpoint `ede28868f4018aba2bf6da92500bce659f6badcc`. Detta är en kod- och kontraktsgranskning; ingen lagerflyttmodell har körts.

**Direkt stöd** betyder att en generell profilmekanism finns. **Uttrycklig förenkling** betyder att verksamheten ersätts av deklarerade markörer eller fasta besked. **Saknat stöd** betyder att den efterfrågade dynamiken inte implementeras av nuvarande kontrakt. **Ytterligare indata krävs** betyder att relevanta mekanismer finns men att fallet ännu saknar konkreta uppgifter. Samma verksamhetsbehov kan kräva både en förenkling och kompletteringar.

## Kod- och kontraktsreferenser

Radangivelser avser granskad HEAD; symboler och filnamn möjliggör återkontroll efter senare ändringar.

| Ref | Faktisk källa | Relevant del |
|---|---|---|
| C01 | [FORMAT.md](../../../structural-ce3-replay/FORMAT.md), [profile.json](../../../structural-ce3-replay/core/profile.json) | Hela profilkontraktet; `supported`, `unsupported`, `resource_policy` |
| C02 | [schema.py](../../../structural-ce3-replay/core/schema.py) | `validate`, rader 64–120: körformat, SHA-256, strikt modell, klocka, domäner, initial, budget |
| C03 | [schema.py](../../../structural-ce3-replay/core/schema.py) | `guards`/`effects`, rader 122–153: konjunktion, eq/ge mot konstant, set/add, kontobegränsningar |
| C04 | [schema.py](../../../structural-ce3-replay/core/schema.py) | Rader 155–193: timer/external, explicit absentgren, unik schemaläggningsplats |
| C05 | [schema.py](../../../structural-ce3-replay/core/schema.py) | Rader 195–249: kostnad, ett event/beslut, positiv delay, initiala events, deadlines, fasta skript och full utfallsbindning |
| C06 | [transitions.py](../../../structural-ce3-replay/core/transitions.py) | `decision_failures`, `available`, `attempt`, rader 8–70: engångsbeslut, budget, blockering, kostnad och eventkö |
| C07 | [transitions.py](../../../structural-ce3-replay/core/transitions.py) | `event`, rader 73–86: förvillkor vid förfall, borttagning ur kö, vald extern effekt |
| C08 | [replay.py](../../../structural-ce3-replay/core/replay.py) | `replay`, rader 18–81: fast skript, alla samtidiga eventpermutationer, horisont, gränsstatus |
| C09 | [expressions.py](../../../structural-ce3-replay/core/expressions.py) | `failures`, `apply_effect`, `check_state`, rader 9–31: inga formler, uppdatering endast av deklarerade effekter |
| C10 | [audit/verify.py](../../../structural-ce3-replay/audit/verify.py) | `audit_bundle`, rader 41–202: betrodd indatahash, komplett historik, separat rekonstruktion och ordningstäckning |
| C11 | [service.py](../../service.py) | `validate_project`, rader 57–80; `open_model`, 83–90; `run`, 235–270; `compare`, 306–313 |
| C12 | [arbetsvyns README](../../README.md) | Import/export, resultat, jämförelsens glappdefinitioner och avgränsningar |
| C13 | [test_generic.py](../../../structural-ce3-replay/verification/test_generic.py) | Bland annat `test_absent_inapplicable_and_selected_outcome_no_lookahead`, `test_no_budget_account_and_integer_ge`, `test_unsupported_outcome_schedule_even_unchosen`, `test_start_deadline_horizon_events_and_empty_steps` |

## Matris

| Behov / käll-ID | Klassning | Vad profilen faktiskt kan göra och var gränsen går | Kodstöd |
|---|---|---|---|
| Startläge och namngivna milstolpar, U10–U13 | Direkt stöd; ytterligare indata krävs | Begränsade heltal och homogena enums. Alla initialvärden måste anges. ”Ej bekräftad” kan vara enum; okänt heltal kan inte vara null. Ingen automatisk slutsats från fältnamn. | C02, C09 |
| Flyttvillkor, U13, U21–U25 | Direkt stöd | Alla deklarerade eq/ge-villkor måste gälla. En fast lista gruppvillkor kan uttrycka ”alla”; ingen dynamisk kvantifiering eller generell OR. | C03, C06 |
| Testgodkännande, U19–U20 | Uttrycklig förenkling; ytterligare indata krävs | Externt fast besked kan ändra teststatus. Tid och valt utfall saknas. Timer är ingen faktakontroll. | C04–C07 |
| 20 godkända order totalt, U22–U24 | Uttrycklig förenkling; ytterligare indata krävs | Externt bekräftat kontrollbesked kan spärra reservflytt. Ett heltalsfält med ge 20 är tekniskt möjligt men måste matas med deklarerade uppgifter; motorn skapar inte order eller räknar kvalificerade verkliga order. | C03–C09 |
| Uteblivet/negativt kontrollbesked | Direkt stöd för fast gren; saknat stöd för automatisk uppföljning | Extern händelse kräver explicit absentgren. Event med falska förvillkor förbrukas utan utfall. Varken detta eller vänteläget skapar ny kontroll. Ny kontroll kräver nytt ID och fast schemaläggning. | C04, C05, C07, C13 |
| Huvud-/reservomgångar, U14–U18 | Uttrycklig förenkling; ytterligare indata krävs | Engångsbeslut och senare mottagningsmarkör per fast omgång. Exakt omgångsuppdelning, tid och mottagningsutfall saknas. Cirka 80/20 kan beskrivas i källa men beräknas inte från lagret. | C03–C08 |
| 1–2 arbetsdagars otillgänglighet, U18 | Ytterligare indata krävs; uttrycklig förenkling | Positiva heltalsfördröjningar stöds. Intervallet blir inte automatiskt en fördelning eller två scenarier. Mottagen/avbockad kan endast bli externt bekräftad tillgänglighetsmarkör i detta utkast. | C04–C07 |
| Reservförbrukning och faktisk lagertillgång, U15, U35–U36 | Saknat stöd för lager-/orderdynamik | Konstanta add kan återge en ändlig serie uttryckliga lagerbokningar. Ingen automatisk efterfrågan, plockning, påfyllning, procentberäkning, artikelallokering eller dynamisk överföring av ”det som återstår”. Statisk reservflagga styrker inte leveransförmåga. | C01, C03, C05, C08–C09 |
| Fortsatta utskick och väntande order, U03, U35 | Saknat stöd för faktisk orderhantering | Saknar orderkö, orderrader, lagertilldelning och paketlivscykel. Deklarerade externa utskicksbesked är möjliga som förenkling men validerar inte denna drift. | C01–C09 |
| Hela ordern mottagen inom 7 arbetsdagar, U06 | Saknat stöd för generell serviceverifiering; ytterligare indata krävs | Inbyggd beräkning av orderålder, sista paketmottagande och transportvariation saknas. Namngivna externa ordermilstolpar kan bara återges/observeras för en på förhand avgränsad mängd med rätt data. | C01–C09 |
| Inga förväxlingar/felplaceringar, U04, U33 | Uttrycklig förenkling | Externt kontrollbesked kan lagras. Kärnan kontrollerar deklarerade tillståndsregler, inte skanning, artikelidentitet eller fysisk placering. | C03–C07, C10 |
| Parallell test och varuflytt, U19 | Direkt stöd för flera beslut; uttrycklig förenkling för verkligt parallellarbete | Flera beslut kan försökas samma steg. De sker i skriptordning, inte samtidigt som fysisk aktivitet. En accepterad handling kan påverka nästa samma steg. Inga automatiska resurskonflikter upptäcks. | C06, C08 |
| Personal, fordon, packstationer och löpande beläggning, U26–U27 | Saknat stöd för generell resursmodell; ytterligare indata krävs | Kan manuellt deklareras som ändliga lås/räknare och frigörande effekter, men varaktig beläggning och schemaläggning är inte inbyggda. Samtidiga tillåtna beslut bevisar inte bemanning eller kapacitet. | C01, C03, C05, C09 |
| A/B med olika frisläppningspolicy, U46–U48 | Direkt stöd för fasta skript; ytterligare indata krävs | Samma gemensamma modell/start/källor, olika schemalagda försök. Ingen automatisk strategi, ”så snart möjligt”-sökning eller optimering. Modellupplägg beskrivs i utkastet. | C05, C08, C11 |
| A/B:s fem dagar och möjlig överlappning, U17, U48 | Ytterligare indata krävs | Fem dagar är inte automatiskt fem per grupp, fem kalendersteg eller en gemensam resursbudget. Uppdelning och samtidighet måste förankras. | C02, C05, C08 |
| Tillträde, tre/fyra veckor, U08–U09 | Ytterligare indata krävs; saknat stöd för kalenderautomatik | Kärnan har heltalssteg och textenhet, ingen arbetsdagskalender. Deadlineannotation kräver expiry-event; själva annotationen spärrar inget beslut. | C02, C05, C08 |
| Fasta ordningar och event samma steg | Direkt stöd inom gränser | Alla permutationer av samtidiga förfallna events prövas före fasta beslut. Detta är händelseordningsanalys, inte olika kundorder eller variation av varaktigheter/externa utfall. Begränsning ger INCOMPLETE. | C01, C08, C10 |
| Systembyte, U33–U34 | Uttrycklig förenkling | En statusmarkör kan ange bekräftat byte. Ingen WMS-integration, datamigrering eller automatisk avstämning finns i profilen. | C01–C09 |
| Grossistadress, omstyrning och besked, U05, U37–U39 | Uttrycklig förenkling; ytterligare indata krävs | Fasta leverans-/adressmarkörer kan deklareras. Ingen dynamisk omstyrning, eventavbokning eller omschemaläggning. Redan skickade leveranser och möjlighet att ändra behöver data. Tre dagar får inte hårdkodas som spärr. | C01, C04–C08 |
| Kostnader och budget, U45 | Direkt stöd för begränsat konto; ytterligare indata krävs | Ett valfritt heltalskonto, fast icke-negativ kostnad per beslut och fasta add vid event. Ingen löpande lön, rabatt-, marginal-, omsättnings- eller fraktberäkning. Belopp/enhet/startbudget saknas. | C02–C06, C09 |
| Ingen ekonomimodell | Uttrycklig förenkling som ännu inte valts | `budget: null` kräver syntaktiskt cost 0 för varje beslut. Det skulle betyda ingen modellerad debitering, aldrig kostnadsfri flytt. Kräver uttryckligt avgränsat framtida test; ingen sådan körfil skapas här. | C02, C05, C13 |
| Rabatt, delade paket och fri frakt, U07, U40–U44 | Saknat stöd för generell ekonomisk/orderbaserad beräkning | Information/rabatt kan återges som fasta statusar eller källtext. Försändelsekostnad, ordertröskel och rabattens effekt härleds inte. 2-dagarsgenomsnitt kan inte bli garanterat tak. | C01, C03, C05, C09 |
| Källspårning | Direkt stöd på kör-/regelnivå; saknat komplett onboardingflöde | `source`-strängar och `sources` med SHA-256 bevarar identifiering. Schema kontrollerar hashformat, inte att påståendet är sant eller att filen stöder förslaget. Ingen strukturerad evidenspost per föreslaget modellfält finns i kontraktet. | C02, C04–C05, C06, C10–C12 |
| Egna filer och AI-onboarding, U49 | Saknat stöd för önskat framtida flöde | Arbetsvyn importerar strikt modell-/kör-/projekt-JSON; godtyckliga kunddokument och AI-tolkning stöds inte. Moln/lokal LLM-adapter ingår inte. | C01, C11–C12 |
| Resultat och jämförelse | Direkt stöd för replayhistorik; uttrycklig verksamhetstolkning krävs | Audit-PASS styrker rekonstruktion mot betrodd indata, inte sanningshalten i externa besked. Befintliga transportglapp ska inte återanvändas som lager- eller leveransmått. | C08, C10–C12 |

## Särskilda risker vid översättning

1. Arbetsvyn kan validera ett ofullständigt utkast genom tillfälliga absentval i en kopia (`validate_project`). Dessa sparas inte som faktiska utfallsval. `run` validerar de verkliga körindata och kräver att alla externa event bundits. Ett sparbart utkast betyder därför inte att underlaget är körklart (C11).
2. Att `ge 20` finns är inte belägg för en ordermotor. Att `add -1` finns är inte belägg för löpande lagerförbrukning. Att två aktiviteter kan vara accepterade samma steg är inte belägg för ledig personal (C03, C06, C09).
3. Varken `COMPLETE` eller audit-`PASS` betyder att flytten blev klar eller att sjudagarskravet höll. Blockerade försök och väntande besked kan finnas i en fullständigt och korrekt granskad uppspelning (C08, C10).
4. Samma fasta externa utfall bör användas när planskillnaden ska isoleras. Arbetsvyn kan uttryckligen tillåta olika utfall, men då varierar även beskeden och jämförelsen ger inget rent planpåstående. Modell och källidentitet måste fortfarande vara lika (C11).
