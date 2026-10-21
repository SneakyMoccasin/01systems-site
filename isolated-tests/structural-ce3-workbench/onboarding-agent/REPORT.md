> Historisk rapport för första offlineleveransen. Aktuell modelladapter,
> verifiering och livebudget finns i [LIVE-PROBE.md](LIVE-PROBE.md).

# Leveransrapport · onboardingagent etapp 1

Arbetsmapp: `/Users/christian/Projects/pulse_engine_ce3_onboarding`.
Branch: `codex/ce3-onboarding`. Bas: `2dbb0fb19193fee8ffeee3612dd045e33762a750`.
Endast nya filer under `isolated-tests/structural-ce3-workbench/onboarding-agent/`.
Ingen motor-, SR-, gammal sessions- eller kontraktsändring. Ingen push.

## Återanvändning

- Oförändrat onboarding-v1-schema och `contract.cjs`: typer, citat, versionskedja,
  frågeformat, findings och överlämningsspärrar.
- Oförändrad `Session/2`: källor/svar, utkastversioner, status, arkiv, inaktualitet,
  frågor, livscykel och immutable snapshots. Ingen parallell sessionsmotor.
- Kundprototypens lagringsprinciper: exklusiva snapshots, senaste kopia + checksumma
  före ändring, skrivskyddad historik och källnära sammanställning. En separat
  tunn Store behövs för agent-ID:n och försöksspår; prototypens Store är bunden
  till warehouse-ID:n och dess exekveringsvy. Inga övergångsregler kopieras.
- SR-adaptern används enbart i regressionstestet för verklig review-/confirmation-
  inaktualitet. Agenten tilldelar aldrig någon gransknings- eller körstatus.

## Transportkontroll före implementation

Befintlig `onboarding-transport` är en budgeterad wrapper kring pinnad SR:s
strukturerade trestegspipeline, inklusive dess reparationer. Den är inte en
modellförfattare för onboarding. Den befintliga `input.cjs` kräver en giltig
`ce3-input-count-price/1` med verifierat maximalt pris per räkningsanrop.
`prepared-standard-2026-10-09/count-price.template.json` har fortfarande
`max_request_nusd: null` och `verification: null`. Därmed kan den inte passera
livegrinden. Prisverifikationer får dessutom vara högst sju dagar gamla;
historiska profiler är inget aktuellt körbeslut.

Ingen ny prisuppgift antas och inga externa pris-/API-kontroller har gjorts.
Det här är en kontroll av repots befintliga blockerare, inte ett påstående om
leverantörens aktuella prissättning. Befintlig transport och spärrar är orörda.
Den gamla `onboarding-evaluation`-enanropsprompten kopplas inte in som SR.

## Genomförd offlineverifiering

18 nya tester passerade, inklusive:

| Fall / felprov | Observerat beteende |
|---|---|
| Deklarerat lager-/startfall | Sex kategorier, två beslut, exakta citat, utkast utan SR eller körning |
| Saknade uppgifter | Högst tre prioriterade frågor; svar kopplas till målitem och egen källversion |
| Vet inte | `unknown/null` bevaras och följdfråga finns kvar |
| Två olika tider för samma deklaration | Båda uppgifterna bevaras som conflict, inga valda standardvärden |
| Delad resurs / parallellitet | Öppen unsupported_profile-lucka; utelämnande från ett testsvar avvisas |
| Föreslaget antagande | Behåller ai_proposal och blockerande lucka |
| Rättat användarsvar | Ny svarsversion, exakt ersättningslänk och aktuellt citat; målfrågan ändras inte av ett tidsvar |
| Källrättelse | Originalversion kvar; gamla uppgifter historiska; nya citat pekar på ny version |
| Felaktigt modellkuvert / citat / borttappad uppgift | Ingen ny utkastversion; originalsvaret ligger kvar i försöksarkivet |
| Modellfel efter svar | Användarsvaret sparat, tidigare utkast inaktuellt, explicit nytt försök krävs |
| Befintlig granskning och bekräftelse | Riktig Session/2 + riktig SR med testtape; båda blir stale efter ändring, arkivet kvar |
| Gammal flik / samtidiga skrivningar | En skrivning antas, nästa får 409; historisk kopia förblir oförändrad |
| Omstart / korrumperat försök | Återläsning utan modell; ändrade responsbytes upptäcks |
| Kapabilitetsdrift | Ändrade backendbytes avvisas, senare leveranser adopteras inte |
| HTTP/DOM | Loopback, Host/Origin-kontroller, säker textvisning även för HTML i underlag |

Startkommandot verifierades även från den slutliga worktreen. Ett manuellt
webbläsarprov med syntetiskt lagerunderlag visade version 1, följdfråga, sparat
svar och version 2 med uppdaterad sammanställning; granskning och bekräftelse
förblev ej begärda. Normal skrivbordslayout granskades visuellt.

Dessutom passerade **78 befintliga regressionstester**: 39 onboardingkontrakt,
25 Session/2 och 14 kundprototyp/controller. De kördes med befintliga beroenden
via NODE_PATH. Ingen dependency eller motorfil ändrades.

Alla nya tester är offline. Regelutdata är inte LLM-utdata. `scripted_test`
är förskrivna svar, och processadaptertestet är en förskriven programstub.
De bevisar gränssnitt, proveniens och sessionsbeteende, inte detektionskvalitet
eller att ett lokalt LLM kan följa schemat. Inga nya CE3-körningar behövdes.

## Nästa begränsade modellprov

För ett prov med en verklig **lokal** modell: välj en redan installerad modell
med exakt versionsidentitet och en lokal JSON-wrapper enligt README. Kör samma
fall från tomma sessionskataloger, utan facit i requesten. Bevara råsvar, tidsåtgång,
fel, exakta källreferenser och alla felaktiga/avbrutna försök. Ett sådant prov
är ännu inte gjort. Utvärdera även fria omformuleringar som inte använder
offlinehjälpens rubriker. Mänsklig bedömning behövs av sakstöd, utelämnanden,
klassificering, frågeprioritering och om utkastet faktiskt återger situationen.

För ett senare **betalt** begränsat prov krävs först:

1. En separat adapter för modellutkast, ansluten till detta request/response-
   kontrakt. SR-transportens sex möjliga stegförsök kan inte bokföras som om de
   vore samma sak som ett utkastanrop. Ingen sådan betald adapter ingår nu.
2. Aktuell verifierad modell/prisprofil och en verifierad inputräkningsmetod
   inklusive eventuell maxavgift. Det befintliga räkningsprisglappet måste lösas
   eller ersättas genom en uttryckligen granskad annan metod; byteantal är inte
   bevisat debiterbart tokenantal.
3. En uttrycklig totalbudget, per-anropstak, input/outputtak, antal dialogrundor
   och fall. Reservation ska ske före varje möjlig dispatch, inklusive eventuella
   reparationsanrop. Ingen automatisk retry eller modellväxling.
4. Beständigt anropsarkiv och journal med modellidentitet, usage, fel, osäker
   förbrukning och ursprungliga bytes. Credentials ska hållas utanför request,
   kommandorad och arkiv. Ett nytt uttryckligt körbeslut behövs.
5. Börja med syntetiska fall ovan och separat facit. Bedöm faktisk modellkvalitet
   innan kundunderlag används. SR är ett senare separat granskningssteg med
   befintliga spärrar, inte en etikett som utkastagenten kan sätta.

Senare motorcommits `12e777c` och `362f647` registreras endast i
`engine-information.json`. Kapabilitetsbasen och körkoden i denna worktree
ligger kvar på den begärda committade basen.
