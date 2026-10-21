# Förberett språkmodellprov · 2026-10-21

Adaptern är implementerad och verifierad offline. **Inga betalda anrop, inklusive
räkningsanrop, har gjorts. Ingen verklig språkmodell har utvärderats.**
Arbetsmapp: `/Users/christian/Projects/pulse_engine_ce3_onboarding`, branch
`codex/ce3-onboarding`, fortsatt motorbas `2dbb0fb19193fee8ffeee3612dd045e33762a750`.

## Vad som ändrats

`OpenAIProvider` genererar ett utkast och högst tre situationsbundna följdfrågor
via Responses API och strikt JSON-schema. Den fasta modellversionen är
`gpt-5.4-mini-2026-03-17`, med `reasoning.effort: low`.
Instruktionen skiljer mål (önskat resultat), krav (villkor att hålla), startläge
(befintliga förhållanden) och möjliga åtgärder. Analysfrågan har eget fält.
Ett leveranskrav ska alltså inte bli en åtgärd, och befintliga lagersystem ska
inte tappas bort. Detta är ännu en instruktions- och kontraktsegenskap, inte
belagd modellprecision.

Källreferenser överförs som käll-ID/version, ordagrant citat och förekomstnummer.
Lokalkoden hittar exakta UTF-16-positioner, inklusive upprepade citat och Unicode.
Påhittade citat avvisas. Modellen kan omklassificera en äldre uppgift endast med
bibehållet innehåll och källstöd samt en explicit ersättningslänk. Äldre frågor
sparas; aktuella formuleringar för samma mål visas före äldre formuleringar.

Återanvänt, utan ändringar i de gemensamma modulerna:

- Onboardingkontraktet för utkast, referenser, ändringskedja och luckor.
- Session/2 för käll-/svarsversioner, frågor, granskningar och bekräftelser.
- Kundprototypens mönster med immutabla snapshots och optimistisk checksumma.
- Transportens `price.cjs`, SQLite-`Journal`, HTTPS-anrop och sekretessfiltrering.

Ingen parallell sessionsimplementation. Ingen SR-körning, bekräftelse, generell
kompilering eller CE3-körning. Den gemensamma SR-transportens steg-/reparationslogik
används inte för utkast; dess granskningstjänst är fortsatt separat.

## Pris, räkning och budget

Kontrollerat i officiella dokument 2026-10-21:

- [Modellkort och fast version](https://developers.openai.com/api/docs/models/gpt-5.4-mini):
  400 000 kontexttoken, högst 128 000 utdata-token, Structured Outputs;
  Standard-pris 0,75 USD/miljon indatatoken och 4,50 USD/miljon utdatatoken.
- [Prissättning](https://developers.openai.com/api/docs/pricing): Responses API
  har ingen separat API-avgift utöver tillämpliga modell-/verktygspriser.
- [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching):
  denna modellfamilj före GPT-5.6 har ingen extra cache-write-avgift.
  Inga cache-rabatter räknas in i taket.
- [Tokenräkning](https://developers.openai.com/api/docs/guides/token-counting):
  separat endpoint kan räkna verklig indata, inklusive formatkostnad. En uttrycklig
  maximal avgift för räkningsanropet framgår inte av de granskade källorna.
  Den gamla räkningspris-mallen har därför fortfarande en verklig blockerare.
  Den fylls inte med ett antaget nollpris.

Detta prov använder **ingen separat räknare**. Budgeten reserverar i stället hela
modellens dokumenterade kontextfönster som konservativ indatagräns per anrop.
Detta är en övre kostnadsberäkning, inte en exakt förhandsräkning. Schema och
instruktioner ingår i API-indatan. Trunkering är avstängd; för stor indata ger
fel. Dessutom avvisas wire-payload över 240 000 bytes lokalt, utan trunkering;
bytegränsen används aldrig som tokenestimat.

| Gräns | Första provet |
| --- | --- |
| Genereringsanrop | Högst 3 totalt, även över omstart/sessioner |
| Räkningsanrop, verktyg, retry, formatreparation | 0 |
| API / nivå | `https://api.openai.com/v1/responses`, `service_tier: default` |
| Utdata | Högst 12 000 token/anrop, inklusive resonemang och osynliga token |
| Reserverad indata | 400 000 token/anrop |
| Tak per anrop | `400000 × 0,75 / 1e6 + 12000 × 4,50 / 1e6 = 0,354 USD` |
| Tak för hela provet | **1,062 USD** (1 062 000 000 nano-USD) |
| Timeout | 60 sekunder; okänt utfall stoppar provet |
| Prisunderlag giltigt till | **2026-10-28 18:00 UTC** |

Tak avser detta provs API-användning i USD före eventuell skatt/valutaväxling,
inte annan användning av kontot. Det är härlett ur dokumenterade priser och
modellgränser, inte en leverantörsgaranti. Kort svensk text bör använda betydligt
mindre indata; faktiska tokenvärden lagras efter svar. Kontots modellbehörighet,
kvot och API-formatets faktiska acceptans återstår att verifiera live.

`live-policy.json` är hashpinnad i adaptern. Priser, modell, tidsgräns eller budget
kan inte ändras via ett CLI-argument. Varje dispatch gör en ny giltighetskontroll.
Efter utgångsdatum krävs en dokumenterad, testad prisuppdatering; flytta inte bara
datumet. Begränsningen till Standard och den globala endpointen är fast.
Ingen regionavgift, Fast-läge, verktygsavgift eller serverkonversation aktiveras.

Hela budgeten reserveras med SQLite FULL/WAL före nätverk. Tre engångsplatser
håller ett separat anropstak. Ingen reservation återbetalas automatiskt; lägre
uppmätt tokenkostnad skapar inte nya anropsplatser. Timeout, API-fel, fel modell/
nivå, saknad usage, felaktigt schema/citat eller avvisat utkast stoppar provet.
Ett kvarvarande dispatch-intent efter krasch stoppar också nästa anrop.
Inga automatiska omförsök, redirects eller hämtningar av svar görs.

## Exakt lokal konfigurering

1. Använd ett OpenAI API-projekt med fakturering/kvot och åtkomst till den fasta
   modellen. Skapa en projekt-API-nyckel via
   [API keys](https://platform.openai.com/api-keys), med rätt att skapa Responses.
   [Officiell nyckelguide](https://developers.openai.com/api/docs/quickstart).
   Ingen nyckel behöver delas med Codex eller sparas i repot.
2. Stoppa eventuell tidigare onboardingserver med Ctrl-C. Kör i macOS Terminal
   med zsh. Kontrollera först policyn och skapa den lokala budgetjournalen:

```sh
cd /Users/christian/Projects/pulse_engine_ce3_onboarding
node isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs --live-status
node isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs --prepare-live
```

Dessa kommandon gör **inga nätverksanrop**, läser ingen API-nyckel och startar inte
liveprovet. `--prepare-live` återanvänder en befintlig journal utan att nollställa
den. Journalen ligger fast i
`isolated-tests/structural-ce3-workbench/local-data/onboarding-agent-first-live/budget.sqlite`.
`--data` påverkar inte budgetjournalen. Radera eller byt inte journal för att
fortsätta ett stoppat/förbrukat prov; det kräver ett nytt uttryckligt budgetbeslut.

3. **Först när du vill aktivera det betalda liveprovet:** läs nyckeln dolt i samma
   terminal och starta adaptern. Kommandona nedan har inte körts i leveransen.

```zsh
read -r -s 'OPENAI_API_KEY?OpenAI-projektnyckel: '
printf '\n'
export OPENAI_API_KEY
node isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs --provider openai --execute-live
unset OPENAI_API_KEY
```

`unset` körs när servern har avslutats. Öppna **http://127.0.0.1:8877**.
Nyckeln passerar endast till serverprocessen i detta uttryckliga läge och används
i Authorization-headern; ingen `.env` läses. Offline- och testlägen ärver inte
nyckeln. Serverstart, återöppning och statusläsning gör inga modellanrop.

Beskrivning, alla källversioner, tidigare utkast och fråge-/svarshistorik skickas
till OpenAI när du skapar/uppdaterar ett utkast eller sparar ett svar i aktiv
session. `store: false` används, men innebär inte en garanti om Zero Data
Retention hos leverantören. Lokala underlag och redigerade API-kvitton sparas
okrypterat under `local-data`; API-nyckeln ingår inte.

## Genomför första provet med tre anrop

1. Skapa en ny beskrivning med din verkliga lager-/leveranssituation. Kontrollera
   att mål, krav, lagersystem och analysfråga hamnar rätt; granska citaten.
2. Besvara **en** av de prioriterade följdfrågorna. Kontrollera att den bygger på
   situationen och att svaret får egen versionsbunden källa i nästa utkast.
3. Rätta det svaret under ”Alla frågor och svar”. Kontrollera ny svarsversion,
   nytt utkast, bevarad historik och markering av eventuellt inaktuellt underlag.

Varje aktivt sparat svar eller källrättelse använder ett anrop; ”Uppdatera utkast”
gör också det. Lägg därför inte extra klick eller alla tre frågesvaren före
rättelseprovet. Efter tre försök kan underlag fortfarande sparas men nästa
modellförsök stoppas och föregående utkast markeras inaktuellt.

Bedöm mänskligt: korrekt rollindelning, relevanta följdfrågor, bevarade krav,
semantisk källtrohet, tydliga okända uppgifter och ingen påstådd körklarhet.
En godkänd JSON-struktur bevisar inte dessa kvaliteter. Modellens förmåga att
upptäcka motsägelser, negationer och resurslogik kräver ytterligare livefall med
separat budget efter detta prov. Ingen SR-granskning får tillskrivas provet.

## Offlineverifiering och begränsningar

```sh
node isolated-tests/structural-ce3-workbench/onboarding-agent/start.cjs --test
```

Testerna använder förskrivna HTTP-svar, ett syntetiskt testdatum och temporära
budgetjournaler. De testar transport, kontrakt, källkoppling, stopp och UI;
**de är inte verkliga modellkörningar**. Fallen täcker lager/leverans, luckor,
motsägelsefull tid, ostödd resurslogik, rättat svar, Unicode/citat, omklassificering,
modell-/prisdrift, usage-gränser, treanropstak över omstart, parallella försök,
krasch, timeout, avvisat utkast och sekretessfiltrering.

Samtliga 38 onboarding-/adaptertester passerar.
Befintliga 78 kontrakts-, Session/2- och prototypregressioner är också körda.
Basens filhashar är oförändrade. Senare motorcommit `d24d6d1` är endast noterad i
`engine-information.json`, aldrig införd som kapabilitet. Motor- och SR-repot
har inte ändrats. Inga paket har installerats och ingen push har gjorts.

## Felsökning av första liveförsöket, 2026-10-21

Det sparade anropet kl. 18:28:08 UTC fick **HTTP 401**,
`error.type: invalid_request_error`, `error.code: invalid_api_key`.
API-svaret klassificerades som ”incorrect API key provided”; nyckel eller
nyckelfragment återges inte. Det är ett autentiseringsfel, inte belägg för ett
fel i modellens JSON-schema. Det går inte att avgöra lokalt om nyckeln var
felkopierad, återkallad eller från fel källa. Inget utkast skapades.

Journalen granskades via en separat kopia av SQLite- och WAL-filerna. Serverns
stdout/stderr var kopplade till en terminal, inte en sparad loggfil; terminalens
scrollback var inte tillgänglig här. Det lokala `outcome.json` bekräftar endast
den äldre generiska felkoden. HTTP-kvittot i journalen är underlaget för diagnosen.
Ingen API-kontroll, nyckelläsning ur processmiljö eller nytt modellanrop gjordes.

`diagnostics.cjs` ger en säker läsvy av befintliga kvitton. UI visar nu HTTP-status,
en känd felkod och nästa steg även för gamla generiska fel. API:ets fria
felmeddelande, okända koder, parametrar och headers skickas aldrig till UI.
Ändringen kräver omstart av serverprocessen och omladdning av sidan. Den startar
inte något anrop och häver inte stoppet. Journal, reservationer och räknare ändras
inte vid diagnostikläsning.

Nästa steg är att kontrollera eller ersätta projektnyckeln lokalt och läsa in den
på nytt enligt instruktionen ovan. Ingen nyckel ska delas i chatten. Nyckelbyte
eller omstart räcker inte för att häva budgetstoppet: fortsatt liveprov kräver en
separat, uttrycklig återupptagning som bevarar första försöket och bara använder
de två återstående platserna. Ingen återupptagning eller budgetåterställning har
införts eller utförts i felsökningen. Radera inte journalen.

Räknaren är **1/3**, första försökets reservation **0,354 USD**, hela provets
reservation **1,062 USD**. Kvittot saknar usage; ingen slutsats om faktisk
debitering dras och ingen reservation återbetalas. Offlineverifieringen omfattar
40 passerande onboarding-/adaptertester, inklusive 401-diagnos, sekretess,
UI-visning, oförändrad journal och noll extra anrop vid diagnostikläsning.
