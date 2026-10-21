# R1 — isolera korrupta gzipartefakter

Datum: 2026-10-21. Utgångs-HEAD: `2be3f55bb430e1376f6e2b8828a24198ba07b4c4`.
**Resultat: R1 rättat och regressionstester passerar.** Den ursprungliga
`INDEPENDENT-REVIEW-5429b52.md` är bevarad oförändrad som historik.

## Ändring

Explorerns `bridge.read_bundle` delegerar fortfarande till befintlig CE3-läsare,
men omvandlar exakt `EOFError`, `gzip.BadGzipFile` och `zlib.error` från läsningen
till `ValueError` med artefaktens sökväg och ursprungligt fel som orsak.
Ingen bred `Exception`-fångst har införts. RuntimeError/AssertionError fortsätter
ut ur gränsen; detta testas också.

Explorerns befintliga kandidatvisa felhantering kan därmed fortsätta:
berörd kandidat blir **UNVERIFIED**, mål **UNKNOWN/null**, sökningen
**INCOMPLETE** och oskadade kandidater får sina korrekta besked. CLI verify
ger exitkod **2** och alla sex kandidatrader, utan traceback.
Vid skada under run sparas failure.json och efterföljande kandidater körs.

Ett gammalt COMPLETE i result.json ignoreras vid färsk verifiering. Verify
förblir skrivskyddad och lämnar den gamla filen orörd; testerna kontrollerar
både detta och att det nya verifieringsresultatet är INCOMPLETE.

Replaykärna, audit, runner, modell, mål, sökgrammatik och historikformat är
oförändrade. Ingen scenariofunktion eller annan produktegenskap har tillkommit.

## Tester

Kört från repositoryroten med Python 3.9.6:

```sh
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/review_tests -p 'test_*.py' -v
python3 -B -m unittest discover -s isolated-tests/structural-ce3-explorer/tests -p 'test_*.py' -v
python3 -B isolated-tests/structural-ce3-explorer/runner.py run --output /tmp/ce3-r1-fixed-pqx
python3 -B isolated-tests/structural-ce3-explorer/runner.py verify --output /tmp/ce3-r1-fixed-pqx
```

- Granskningstester: **19 PASS**, inga expected failures (8,233 sekunder).
  R1:s tidigare expectedFailure är ett vanligt passerande test; CLI-testet
  kräver nu exit 2, UNKNOWN för skadad kandidat och rätt besked för övriga fem.
- Ursprunglig explorersvit: **27 PASS** (89,715 sekunder), inklusive
  backendbytekontroll och färsk replay/audit/semantisk jämförelse av
  **34 befintliga katalogfall / 654 banor**.
- Åtta korruptionsfall: trunkerad header, payload och trailer; fel header;
  fel CRC; fel ISIZE; ogiltig DEFLATE-blocktyp; trunkerad andra gzipmedlem.
  Tester verifierar respektive dekomprimeringsfel, UNKNOWN/null, exakt en
  overifierad kandidat och oförändrat resultat för de andra fem.
- Felinjektion efter riktig CLI-audit under run täcker EOFError, BadGzipFile
  och zlib.error; efterföljande kandidater körs och verifieras korrekt.
- Före kodrättningen kördes de fyra gziptesterna med `-k gzip`; de reproducerade
  avvikelserna. Efter rättningen kördes båda fulla sviterna ovan.
- Färsk run och verify: båda exit **0**, sex CERTIFIED, mål SATISFIED för
  **PQX, PXQ, XPQ**, NOT_SATISFIED för **QPX, QXP, XQP**, search COMPLETE.
  Båda gav result_id
  `8b84f8df18d5eff43b52fbf25439d55c7bd79728b84389502014f1265d4803d6`.

Lokala testloggar: `/tmp/ce3-r1-review.log`, `/tmp/ce3-r1-explorer.log` och
före-rättningsloggen `/tmp/ce3-r1-before.log`. Övriga arbetsbänks-/session-/UI-
sviter och full tvåpass-checkpoint har inte körts för denna avgränsade rättning.

## Bevarande och kvarstående gränser

Repo-instruktioner och gitstatus kontrollerades. Startstatus hade inga ändrade
spårade filer men befintliga ospårade underlag, vilka lämnades orörda.
SHA-256-jämförelse över 2 421 befintliga spårade/ospårade, icke-ignorerade filer
visar endast de två avsedda ändringarna: bridge.py och granskningstestfilen.
Övriga **2 419 filer**, inklusive ursprungsrapporten och replay/audit, är identiska.
Denna korta rapport är den enda nya filen.

Rättningen ändrar explorer_build_id till
`5bac99001126ab9700df87de3dfdb23e51da597ff78dab6835baa40c666b02c2`;
runtime_id är oförändrat. Enligt befintligt kontrakt kräver äldre outputpaket
sin registrerade explorerbuild; ingen migrering eller omhashning har gjorts.
Den deklarerade trebeslutsomfattningen och övriga begränsningar i den historiska
granskningen kvarstår. Verify ger ingen automatisk reparation av skadade filer
och ersätter inte result.json. Inga kvarstående fel identifierades inom R1:s
testade omfattning. Endast rättning, tillhörande tester och denna rapport
committas; ingen push.
