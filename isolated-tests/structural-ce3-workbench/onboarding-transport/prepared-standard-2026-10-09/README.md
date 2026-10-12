# OpenAI-liveprov: verifierad prisuppgift, ännu ingen verifierad totalram

Återkontrollerat 2026-10-12 från senaste faktiska CE3-checkpoint `1c1b5674b855b663205ce182989096ffda6b1014`.
SR `e7308010ecbea1ebe46c3298aa6a96f06381ad0a`, `structured-grounded/1`,
samtliga 49 pinnade filhashar verifierade. Endast förberedelse;
**inga modell-/tokenräkningsanrop, inga kreditpåfyllningar, faktisk kostnad 0 USD**.

**Beslut: båda fallen är matematiskt förenliga med 5 USD vid Standard, men
en verifierbar totalgräns kan inte intygas ännu.** Standard begärs nu
uttryckligen i varje modellanrop, inklusive formatreparationer.
Räkningsavgiften saknar fortfarande belagd övre gräns. Mallarna här är därför avsiktligt ogiltiga, inte liveprisprofiler.
Den gamla 132 USD-beredningen används inte.

## Faktisk transport och aktuella priser

Oförändrad SR `OpenAIProvider` använder `gpt-5.6-terra` enligt den uttryckligt
valda profilen, `POST https://api.openai.com/v1/responses`, `store:false` och
strikt JSON-schema. Ingen Batch, verktygsanvändning eller regional endpoint.
CE3 använder direkt HTTPS utan automatiska återförsök. SR:s egna
formatreparationer räknas separat. Inga credentials har skrivits till filer.

Officiella Standardpriser, USD per miljon token:

| Input ≤272 000 token | Pris |
|---|---:|
| Vanlig input | 2,00 |
| Lästa cachetoken | 0,20 |
| Cache-skrivningar | 2,50 |
| Output, inklusive reasoning | 12,00 |

Modellsidan anger 1 050 000 kontexttoken, 128 000 maximala outputtoken,
cache-skrivningar till 1,25 gånger inputpriset samt förhöjda priser över
272 000 inputtoken. Vi reserverar **all input till 2,50**, utan att räkna hem
cacherabatt. Det föreslagna kontrollerade taket ligger under långkontextgränsen.
Källor: [modell](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[priser](https://developers.openai.com/api/docs/pricing).
Beloppen är API-förbrukning i USD; eventuell skatt, växling eller kreditköp
ingår inte och har inte kontrollerats eller utförts.

**Standard-begäran är verifierad offline.** CE3:s befintliga `fetchBoundary`
lägger till `service_tier: "default"` efter kontroll av SR:s ursprungliga
request och före räkning, journalföring och HTTP-dispatch. Enligt
[Responses API, service_tier](https://developers.openai.com/api/reference/python/resources/responses/methods/create)
betyder `default` Standard; utelämnat värde betyder projektstyrd `auto`.
Samtliga initiala försök och reparationer går genom samma gräns. SR:s
prompts, scheman, steg, outputtak och providerimplementation är orörda.

Journalen och räkningsbehörigheten binds till den faktiska utgående
requestens hash, inklusive tjänstenivån. Räkningspayloaden innehåller
oförändrat hela modellindatan; `service_tier` är en körinställning och ingår
inte där. Gamla arkiv utan fältet går fortfarande att läsa; nya dispatches
får alltid `default`. Andra tier-värden och okända inputfält avvisas.
Offlinetester verifierar både utgående transportargument och journalen.
Leverantörens faktiska svar och debitering har inte provats live.

## Kontrollerat inputtak och oförändrade steg

Förslag: **100 000 inputtoken per faktiskt modellanrop**, även reparationer.
Det är en stoppgräns, inte en uppskattning av verklig usage eller ett löfte
om att båda fallen blir färdiga. Den befintliga transporten räknar exakt
`model`, `instructions`, `input` och `text` inklusive JSON-schema via
`/v1/responses/input_tokens` före varje generation. Underlag, utkast,
register, tidigare stegresultat och reparationsinput ingår. För stort,
saknat eller ogiltigt räkningsresultat stoppar före modelldispatch utan
trunkering. Tidigare resultat och möjlig förbrukning bevaras.
Se [Counting tokens](https://developers.openai.com/api/docs/guides/token-counting).

Motivering till taket: de sparade, syntetiska offlinekörningarnas steginput
växer från 20 888 till 173 044 byte för c3-r1 och från 27 159 till 408 334
byte för clear, före instruktioner och schema. Ett tak på 2 066 token från
den äldre beräkningen saknar meningsfull marginal för dessa strukturer.
100 000 väljs som en större provram som samtidigt lämnar kostnadsmarginal
under 5 USD. **Bytevärdena är inte tokenräkning**; syntetiska stegsvar kan
inte förutsäga liveinput. Även 100 000 kan stoppa ett senare steg.

| SR-steg | Första outputtak | Högst en reparation |
|---|---:|---:|
| grounded_claim_extraction | 8 000 | 8 000 |
| grounded_support_assessment | 20 000 | 20 000 |
| grounded_adjudication | 5 000 | 5 000 |

Två fall, en granskning vardera: högst **12 modellanrop + 12 räkningsanrop**,
1 200 000 inputtoken för generation och 132 000 outputtoken. Räkningsanropen
har egna avgiftsreservationer. Outputtaken omfattar också osynliga token.
Provider-/pipelinefristerna är oförändrade (90/120 s, yttre workergräns
135 s); räkning tar av samma tidsram. Ingen automatisk fortsättning eller
extra retry. Ett misslyckat första fall kan stoppa clear.

## Kostnadsram och kvarstående blockerare, kontrollerad 12 oktober

Låt `F` vara en **verifierad maximal avgift i USD per räkningsrequest**.

| Reservation | En granskning | Båda fallen |
|---|---:|---:|
| Input vid taket, inklusive möjlig cache-skrivning | 1,500 | 3,000 |
| Output inklusive alla möjliga reparationer | 0,792 | 1,584 |
| Modellreservation, villkorad på Standard | **2,292** | **4,584** |
| Tokenräkning | 6 × F | 12 × F |
| Föreslagen budget | **2,50** | **5,00** |

Villkoret är `4,584 + 12F ≤ 5`. I journalens hela nano-USD ryms högst
**34 666 666 nano-USD (0,034666666 USD) per räkningsanrop**. Detta är
budgetutrymmet, **inte ett verifierat pris**. Om avgiften vore belagt noll
skulle maximal reservation vara 4,584 USD; noll har inte belagts.

[Räkningsguiden](https://developers.openai.com/api/docs/guides/token-counting)
och [endpointreferensen](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count)
beskriver funktionen men anger inget uttryckligt avgiftstak som jag kunnat
verifiera. Prissidans allmänna besked att Responses API inte prissätts
separat och att token debiteras enligt modellen fastställer inte hur just
räkningsrequestens token debiteras. Det ger därför inte stöd för att sätta
`F=0`. Inte heller ett fel eller en timeout antas vara gratis.

Prisattester har inte förnyats eftersom räkningspriset inte kan beläggas.
Befintlig `ce3-price-profile/1` kräver en attest om övre pris för
alla tillämpliga tierer, med modellens fulla inputgräns. Den här
Standard-/kortkontextberäkningen får inte skrivas in som en sådan generell
attest. Standard binds nu vid dispatch, men prisformatets generella attest är
fortfarande inte en attest begränsad till kort kontext. `verification:null`
behålls; ingen ny profilvariant eller formatändring införs medan provet är
blockerat. Modellmallens datum och kommandots digest har uppdaterats efter
priskontrollen den 12 oktober. Räkningsmallens avgift och attest är fortsatt
`null`, inte noll.

Ingen faktisk kostnadsprognos lämnas: verkliga stegsvar, usage, reparationer
och cacheutfall är okända. En högre totalbudget löser inte en okänd avgift;
någon verifierad minsta totalbudget kan därför inte anges nu.

## Exakt kommando och lagringsplatser

[command.txt](command.txt) innehåller det exakta, **inte körklara** kommandot
för befintlig `live.cjs`, båda oförändrade fall, 100 000 inputtoken, total
5 USD och 2,50 USD per körning. Det har inte exekverats. Det väljer de
bifogade mallarnas exakta digester; modellmallen nekas med `PRICE_FIELDS`
och räkningsmallen separat med `COUNT_PRICE_BOUND`, före journal och nätverk.
Ingen osäker prisuppgift har märkts verifierad.

Efter en separat komplettering måste aktuella prisattester och digester
ersätta mallarna. Återanvänd inte mallarnas digest efter en ändring.
Planerade platser (ännu inte skapade):

- Journal: `prepared-standard-2026-10-09/budget.sqlite`.
- Resultat: `prepared-standard-2026-10-09/results/` med plan, transportutfall,
  granskningsarkiv och summary under denna onboarding-transport-katalog.

Det som saknas är **officiellt belägg för avgiften eller ett högsta pris för
`POST /v1/responses/input_tokens`**, även för de requests som stoppas före
generation. Först därefter kan prisattester färdigställas och en totalram
verifieras. Ingen ytterligare profilvariant, leverantörsutredning eller
integrationsnivå har skapats.

## Offlineverifiering och bevarat arbete

Kört:

```sh
node --test isolated-tests/structural-ce3-workbench/onboarding-transport/input.test.cjs isolated-tests/structural-ce3-workbench/onboarding-transport/transport.test.cjs
```

**39 tester passerade** (38 i hela transport-/inputsuiten och det därefter
tillagda dispatchtestet separat). Testerna använder injicerade svar utan nätverk, med
stopp före första generation, senare steg och samtliga reparationer;
timeout, saknad usage, processavbrott och sessionens blockerare ingår.
Testdubblar verifierar kontrollflöde, inte tokenräknarens eller SR:s
livekvalitet. Kodpinne och de två frysta fallens manifesthashar verifierades
separat. Facit har inte skickats till granskning.

Endast den isolerade transportgränsen, dess inputvalidering, tester och
dokumentation har ändrats. Den befintliga beredningskatalogen har uppdaterats
och tas med i uppgiftens commit; den var oregistrerad vid start. SR-repo,
motor, UI, fall, facit och äldre beredningar är oförändrade. SR-arbetsträdet är rent.
Befintliga orelaterade oregistrerade filer har lämnats orörda. Inga tjänster
har startats och inget livekommando har körts.
