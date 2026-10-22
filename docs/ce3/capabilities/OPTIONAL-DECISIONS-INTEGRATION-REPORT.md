# Integration av godkända valfria beslut

2026-10-22. **PASS.** `decision-flow-demo-v1` fast-forwardades från
`85e19b09f5e5b1daca23873efb33b53f533e7388` till
`f63bc0d7556e82bb5ef29b950fc8e748f73fbab5` utan implementationsändring.
Aktuell rekommenderad kapabilitetsbeskrivning är
[engine-baseline-v2.json](engine-baseline-v2.json).
V1 bevaras byteoförändrad; läsanvisningen pekar på v2.

## Underlag och släktskap

Repo-README:s produktlåsning och berörda format-/granskningsdokument lästes.
Ingen tillämplig AGENTS.md hittades i huvudrepot eller kontrollerade
föräldrakataloger. Arbetet begränsas till den uttryckligen beställda
integrationen och kapabilitetsdokumentationen.

Start-HEAD på huvudbranchen var exakt `85e19b0`. Inga tracked/staged-ändringar
fanns; befintliga ospårade auditer, fallunderlag och kataloger inventerades.
18 worktrees och samtliga branchreferenser registrerades före integrationen.
Commitinnehåll och de direkta föräldralänkarna kontrollerades:

| Commit | Förälder | Innehåll |
|---|---|---|
| `250f0210f44cfb1262885e7786c20107a7d8af52` | `85e19b0` | Endast arkitekturförslaget |
| `f31033b57f6fad7ccccf2912692746710ba6648a` | `250f021` | Valfria beslut i isolerad explorer, format, fixture, tester och implementationsrapport |
| `f63bc0d7556e82bb5ef29b950fc8e748f73fbab5` | `f31033b` | Endast oberoende granskningsrapport och 20 nya granskningstester; PASS, inga nödvändiga rättningar |

`git merge-base decision-flow-demo-v1 f63bc0d` gav `85e19b0`.
`git merge --ff-only f63bc0d7556e82bb5ef29b950fc8e748f73fbab5` lyckades i
huvudarbetskopian `/Users/christian/Projects/pulse_engine_clean`.
Ingen divergens, mergecommit, reset, clean, tvingad checkout eller stash uppstod.
Git- och huvudworktreeskrivning krävde sandboxens separata skrivrätt.

## Kodidentitet och dokumentkontroller

Efter fast-forwarden beräknades ofiltrerade Git-blobidentiteter från faktiska
arbetskopiebytes för **alla 2215 filer i f31033b** och jämfördes med dess träd.
Alla matchade, även fixtures, backend och äldre dokumentation. Granskningen
lade endast till sina två filer. Den efterföljande dokumentationsleveransen
berör endast denna rapport, capabilities-README och den nya v2-filen.

V2:s bindning använder den redan granskade implementationen och dess
arkitektur-/granskningsreferenser, inte sin egen slutliga commit eller hash.
20 kod-/profilhashar täcker replayns och explorerns kodmanifest.
`explorer_build_id` är
`d4c049fb4613fcaaa9ed2856a81653c9a0beb989fcef708f75eb4a1be2db105f`.

Genomförda kontroller:

- Strikt JSON-inläsning med avvisning av dubbla nycklar; inventarieformat,
  versionsfält, referenser, commitföräldrar och rapporternas existens.
- Alla 20 SHA-256-värden mot faktiska bytes och `f31033b`; exakt kodmanifest
  och kanoniskt build-ID. V1:s bytes jämfördes med startinventeringen.
- Bevarat replaystöd mot oförändrad profil, äldre /1–/3-versioner, /2–/3-sökning,
  tidsoperatorer och robusthet. /4-versioner jämfördes med exekverbara
  versionsfunktioner och fixtur; 720/2160 och replaylimits med kodkonstanter.
- Alla fem befintliga problemfixturer validerades: ursprunglig explorer samt
  scenario /1, /2, /3 och /4. Purpose-prober med `bounded_real_pilot` avvisades
  för samtliga. Tillåtet värde förblir endast `synthetic_integration_test`.
- Färsk verify producerade samma resultat som run utan ändrade artefaktbytes
  eller mtime; replayanrop förbjöds under den extra återläsningskontrollen.
- Lokala länkar i dokumentationen, snäv filändringsyta och whitespace kontrollerades.

V2 skiljer äldre permutationssökning från selected-plan-/4-stöd. Den beskriver
partition, disjunkta grupper, full delmängdspopulation, prefixets tidigareläggning,
tom kandidat, kandidatrelativ acceptance, full modell/outcomes och fasta scripts
mellan scenarier. Sex modellbeslut innebär inte automatiskt att 720-taket ryms.
Tidsmål, budgetprefix, UNKNOWN, all-path-audit och tillitsgränser kvarstår.

Onboarding observerades läsande på `codex/ce3-onboarding` vid `27bec92`.
Session-/SR-dokumentation skiljs från motorförmåga: arkivering, bekräftelse,
strukturerad granskning och överlämning är inte en verifierad /4-kompilator,
CE3-validering eller målcertifiering. V2:s engine_target är en rekommenderad
referens för separat bedömning, inte ett påstående om migrerat onboardingstöd.
Ingen onboarding- eller SR-fil ändras, inget pilotläge införs.

## Färsk acceptanskörning på huvudspåret

CPython 3.9.6. Ordinarie CLI freeze/run/verify gav **0/0/0**.
Resultatet blev **16 kandidater, 48 certifierade celler och eventbanor,
8 positiva cellmål, robust TRUE endast för PN och PNX**.
Run och verify gav samma resultatidentitet:

```text
problem_id  14e6384126acf9620b169ff1979ea558285d285d3b1c9e9072125b49407504b4
manifest_id b3aca18d4dfc8cfac54400bbacad4b8cdbd92557680521cf2270e1d6c2ad09e4
runtime_id  b66a813d364b2064fe1e8e5b78f4039be406d08ba2ce684d1944c36ffa659d0d
result_id   d4213e829ad4be3e0d4517830e70f994029335b4ede799ae6b5d0e798ddf502d
```

Result-ID gäller denna körförekomst; nya UUID:n ger ett annat vid upprepning.
Problem/manifest/runtime/build matchar den granskade etappens bindningar.

Kör från huvudrepots rot med nya destinationer:

```sh
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py freeze --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --output /private/tmp/ce3-optional-integration-20261022/frozen
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py run --problem isolated-tests/structural-ce3-explorer/fixtures/optional-decisions-problem.json --manifest /private/tmp/ce3-optional-integration-20261022/frozen/manifest.json --pins /private/tmp/ce3-optional-integration-20261022/frozen/pins.json --output /private/tmp/ce3-optional-integration-20261022/full
python3 -B isolated-tests/structural-ce3-explorer/scenario_runner.py verify --pins /private/tmp/ce3-optional-integration-20261022/frozen/pins.json --output /private/tmp/ce3-optional-integration-20261022/full
```

Den oberoende granskningens 234 godkända testmetoder återkördes **inte**;
integrationskontrollen visade inget nytt problem. Dess rapport och tester
har integrerats oförändrade. Ingen ny funktion eller rättning behövdes.

## Bevarande

Startinventeringen omfattar 2454 spårade och icke-ignorerade ospårade filer.
Fast-forwarden ändrade exakt fem befintliga filer enligt godkänd diff:
explorer-README samt contracts.py, observe.py, scenario_contracts.py och
scenario_runner.py. Övriga 2449 befintliga filer var byteoförändrade efter
fast-forwarden. Dokumentationscommitten ändrar dessutom enbart den befintliga
capabilities-README och lägger till två nya dokument. V1 är oförändrad.

Övriga branchreferenser och worktrees gitstatus jämfördes med startinventeringen
utan avvikelse. Deras lokala filer skrevs inte. Huvudrepots befintliga ospårade
filer bevarades med bytekontroll; ingen full inventering av ignorerade filer
eller övriga worktrees filinnehåll påstås.

Lokala loggar, före-/efterinventeringar, dokumentkontrollskript, externa pins
och färska körpaket finns under `/private/tmp/ce3-optional-integration-20261022/`.
De är tillfälliga arbetsbevis. Endast kapabilitetsdokumentation och denna
rapport committas ovanpå f63bc0d. Ingen push görs.
