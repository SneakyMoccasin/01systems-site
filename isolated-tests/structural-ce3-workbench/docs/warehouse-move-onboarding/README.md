# Lagerflytt: konstruerat CE3-onboardingtest

Dokumenterat 2026-10-09. Detta är ett konstruerat test baserat på Christians svar, **inte ett verifierat kundfall**. Underlaget räcker ännu inte för två körbara fasta planer. Ingen körbar lagerflyttmodell eller nya resultat har skapats.

Profilen `fixed-replay/0.1` kan återge fasta flyttbeslut och externa kontrollbesked med explicita förvillkor. Villkoret om 20 riktiga korrekt packade kundorder, överlämnade till PostNord från nya lagret, kan i det minsta utkastet endast återges som **ett externt bekräftat kontrollbesked**. Tidpunkt och utfall är okända. Det är inte simulerad orderhantering.

## Filförteckning och läsordning

| Fil | Innehåll |
|---|---|
| [README.md](README.md) | Slutsats, omfattning, arbetsstatus och genomförda kontroller |
| [source-request.txt](source-request.txt) | Oförändrad kopia av hela användaruppgiften, bevarad som källa |
| [01-underlagsregister.md](01-underlagsregister.md) | 49 källrefererade poster; uppgifter, mål, krav, uppskattningar, analysförslag och okänt; uttryckliga preciseringar |
| [02-konceptuell-modell.md](02-konceptuell-modell.md) | Starttillstånd, beslut, villkor, effekter, möjliga händelser och gemensam modell för A/B |
| [03-stodmatris.md](03-stodmatris.md) | Kod- och kontraktsförankrade stödklassningar, inklusive 20-order-villkorets gräns |
| [04-kompletteringar-och-onboarding.md](04-kompletteringar-och-onboarding.md) | Minsta indata för körbarhet, separat behov för service/kapacitet/ekonomi, jämförelsens räckvidd och framtida onboardingkrav |

Källkopians SHA-256: `7dd1f6be9289678433a1fbe4406d283a7647d65718cf544bea820638828ad391`. Ursprung: användarens bifogade `pasted-text.txt`. Tidigare intervjusvar eller ersatta originalversioner har inte tillhandahållits; registret uppfinner ingen sådan historik.

## Kontrollerad utgångspunkt och avgränsning

- Branch före ändringar: `decision-flow-demo-v1`, 12 commits före den lokala referensen `origin/decision-flow-demo-v1`. Ingen fetch eller publicering gjordes.
- HEAD före ändringar: `386671794c95f527c5c0d026cf5f339aa164f627`, vilket matchar rapporterad UI-checkpoint `3866717`.
- Kärncheckpoint: `ede28868f4018aba2bf6da92500bce659f6badcc`. `git diff ede2886 HEAD -- isolated-tests/structural-ce3-replay` var tom före ändringarna.
- Arbetsstatus före ändringar: inga ändrade spårade eller stagade filer; befintliga ospårade granskningsdokument och kataloger under `docs/audits/` fanns. De har bevarats och ingår inte i leveransen.
- Inga tillämpliga `AGENTS.md` hittades i överordnade kataloger eller repositoryts icke-ignorerade filträd.
- Endast denna nya dokumentationskatalog ändras. Arbetsvyn hade `README.md`/`REPORT.md` men ingen `docs/`-katalog; detta fall läggs därför under dess egen `docs/warehouse-move-onboarding/`.
- CE2, offentlig webbplats, replaykärna, fabrikens checkpoint, transportmodeller och befintliga resultat lämnas oförändrade. Inga UI-funktioner, AI-leverantörsadaptrar eller motorutökningar byggs. Ingen publicering eller push.

## Genomförd verifiering

1. Läste kontrakt, maskinläsbar profil, strikt schema, uttrycksutvärdering, beslut/eventövergångar, uppspelning, oberoende audit och arbetsvyns import-/kör-/jämförelsegränser. Exakta kodreferenser finns i stödmatrisen.
2. Körning från repositoryroten:

   ```sh
   python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v
   ```

   Resultat: **27 tester godkända**, 3,143 sekunder. Det är befintliga profil- och regressionsverktygstester, inklusive externa besked, absent/inapplicable, engångsbeslut, tidssteg, strikta typer, budget och audit. Det är inte en körning av lagerflyttfallet eller hela checkpointens 634 huvudhistoriker. Testernas tillfälliga CLI-filer skrevs i tillfällig katalog.
3. Dokumentkontroll: samtliga lokala Markdown-länkar pekar på befintliga filer, tabeller har konsekvent kolumnantal och refererade U-/C-ID:n finns. Källkopian är byteidentisk med bilagan. Markdown-filerna har slutrad och inga avslutande blanktecken; `git diff --cached --check` kontrolleras inför commit.
4. Bevarandekontroll: före arbetet beräknades SHA-256 för **1 903 befintliga spårade och icke-ignorerade ospårade filer**. Samtliga är bytebevarade efter dokumentation och tester. Ignorerade lokala data ingår inte i detta hashpåstående och har inte använts för uppgiften. Befintlig ospårad arbetsstatus kontrolleras separat mot baslinjen.
5. Commit avgränsas till de sex filerna ovan. Ingen befintlig fil ingår. Leveransens commit-ID rapporteras separat; dokumentet beskriver utgångs-HEAD, inte ett självrefererande commit-ID.

## Slutsats och nästa steg

Viktigaste stödluckorna är faktisk orderhantering och lagerförbrukning, löpande resursbeläggning, kalenderautomatik samt service- och ekonomiberäkningar. Fasta tillstånd och kontrollbesked kan återges med tydliga förenklingar, men underlaget saknar bland annat exakta omgångar, scheman, beskedstider och kontrollutfall. Okända kostnader har inte blivit noll.

Nästa steg är att besvara R1–R8 i [kompletteringslistan](04-kompletteringar-och-onboarding.md) och först därefter färdigställa två källförankrade fasta planer. A/B kan då pröva deklarerade beroenden och frisläppningar. Den jämförelsen får inte ges betydelsen att B är snabbare, sjudagarsservice säkrad eller flytten lönsam.
