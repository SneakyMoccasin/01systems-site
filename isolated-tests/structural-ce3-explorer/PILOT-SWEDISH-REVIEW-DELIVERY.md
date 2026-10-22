# Leverans: förenklad svensk modellbekräftelse

Uppföljning ovanpå `fea13a50d598598fc730a8076a10883c90a6c754` på
`codex/ce3-swedish-model-review`. Faktisk HEAD, ren arbetskopia och repo-/
pilotinstruktioner kontrollerades före ändring. Ingen AGENTS.md hittades.
Samma isolerade worktree används: `/private/tmp/ce3-swedish-model-review`.
Ursprunglig huvudbaslinje är `d4589a8`; ingen integration eller push görs.

## Förändringen

Huvudvyn är ungefär hälften så lång i övningsfallet. Den börjar med en
överblick över frågan, alternativen och alla målkrav. Obligatoriska beslut
visas först, följda av alternativen. Varje beslut har ett kort med villkor,
effekter och relevanta kostnader/följdhändelser. Villkoren upprepas inte i ett
separat avsnitt. Upprepad källprosa ersätts med stängt **Visa underlag** per
avsnitt/kort. **Visa hur analysen fungerar** och **Visa tekniskt underlag**
är kvar och stängda från början.

Startläget visar fält som faktiskt används av regler, effekter, mål eller
budget. Helt oanvända fält, fulla värdemängder, tekniska regler och alla
ursprungliga uppgifter bevaras i det tekniska underlaget. Nollkostnader och
rader om att ingen följdhändelse finns tas bort. Avsaknad av kostnadskonto
förklaras en gång utan påstående om verklig kostnadsfrihet.

Valregler, fasta tider, tidigareläggning, avgörande villkor, externt besked
inklusive uteblivet besked, målgränser, antaganden, frågor och undantag syns
fortfarande direkt. En otillräcklig körbudget ger en synlig varning.
Övningsmärkningen och beskedet att sidan är underlag före analys behålls.
Övningsfallets deklarerade fråga och frågetexter har också fått enklare språk.

## Bindning och versionsbeslut

[Presentationskontraktet](PILOT-PRESENTATION-V1.md) beskriver det nya opt-in-
formatet `ce3-pilot-presentation/2`: ett strikt register med meningar för
booleska fälts true/false-värden. Exempel: ”Leveransen är klar” respektive
”Leveransen är inte klar”. Modellens faktiska värde väljer mening; det
finns ingen AI-sammanfattning eller språklig tolkning av kodnamn.
Saknas en bunden mening används neutralt namn och värde. Texternas faktiska
verksamhetsbetydelse måste fortfarande granskas av människor.

Draft/snapshot /3 och övriga pilotformat behålls. /1 kan användas som
uttryckligt författarformat i en **ny prepare**, utan automatisk tilläggstext
eller formatmigrering. Äldre paket kräver sin registrerade implementation.
Ny renderarkod ändrar buildbindningen. Meningar, namn, snapshot och exakta
HTML-bytes binds till båda bekräftelserna; inga äldre kvitton återanvänds.

## Verifiering

**85 tester passerar:** 10 presentationstester, 19 pilotregressioner och
56 regressioner från oberoende granskningar, inklusive F1–F3.

- Ändrade startvärden, villkor, effekter, tidsgränser, scenarier och valregler
  ger motsvarande svenska beskrivning. Nya regelberoenden gör startfält synliga.
- Beslutskorten behåller villkoren exakt en gång; tekniska nollrader försvinner.
  Kritiska tids-/beskedsvillkor och antaganden finns kvar i huvudvyn.
- Samtliga underlags-/detaljsektioner är stängda från början. Interna länkar,
  full spårning, determinism och HTML-escaping inklusive tillståndsmeningar
  kontrolleras. Ogiltiga meningar/kopplingar och gamla bekräftelser avvisas.
- Det separata AB-resursfallet med kostnader 3/2, ge-villkor, add +2/−1,
  intervall och schemalagd följdhändelse genomgår prepare/freeze/run/verify.
  Endast AB når målet. Det ursprungliga oberoende /1-författarformatet testas också.
- Färsk CLI-kedja med nya fabricerade kvitton ger **12 certifierade celler,
  fyra positiva mål och endast PN robust TRUE**. Verify ger samma resultat
  utan att ändra runpaketets bytes eller mtime.
- Övningens `problem` är exakt lika med det från fea13a5, inklusive modell,
  sökning, mål och scenarier. Det äldre paketet avvisas av aktuell kod med
  `Registered implementation/runtime/baseline changed`. Dess bytes och mtime
  förblir oförändrade. Ingen buildbindning har kringgåtts.
- `git diff --check` passerar. Replay, audit, sökning, mål, onboarding och SR
  ändras inte. Övriga worktrees och lokala filer lämnas orörda.

Testkommandon finns i presentationskontraktet. Loggar:
`/private/tmp/ce3-simple-{presentation,pilot,review}-tests-final.log`.
Färskt paket, CLI-utdata, kvitton, externt testankare, verifieringsresultat
samt `preservation-check.json` finns i:
`/private/tmp/ce3-swedish-review-simplified-final-20261022/`.
Testankarets förvaring är inte ett påstående om betrodd produktionsförvaring.
Tidigare paket har inte skrivits över.

## Manuell visuell kontroll

Den tillgängliga Browser Use-vägen blockerade lokal HTML genom URL-policy i
föregående leverans. Samma spärr har respekterats; ingen alternativ browser,
lokal server, CDP eller annan omväg har använts. HTML-struktur och CSS är
kontrollerade i kod, men renderad layout, zoom och utskrift är inte verifierade.

Christian: öppna den nya filen via **Finder → Öppna med → webbläsare**:

`/private/tmp/ce3-swedish-review-simplified-final-20261022/prepared/review.html`

Kontrollera överblicken, kortens läsbarhet, att alla underlag börjar stängda,
övningsmärkningen och läsbar tabellbredd när tekniskt underlag öppnas.
Redigera inte den färska HTML-filen; justeringar kräver ny prepare och nya kvitton.
