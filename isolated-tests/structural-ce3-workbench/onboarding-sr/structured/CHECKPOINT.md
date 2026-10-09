# Checkpoint: CE3:s strukturerade SR-koppling

CE3-bas `8695110081097fb5bf9a3a0eea863baecea0a98e`; SR `e7308010ecbea1ebe46c3298aa6a96f06381ad0a` på `codex/structured-grounded-v1`. Aktuell koppling finns i denna katalog; gammal grounded-0.1-kod, pin, diagnostikfacit och råresultat bevaras. Endast tre överordnade dokument har fått en hänvisning till denna version. Ingen CE3-kontrakts-/sessionsmigration eller motor-/UI-ändring ingår.

Leveransen anropar riktig `runStructuredGroundedReview` och dess tre steg med märkta testsvar. Full commit och 49 filhashar verifieras innan laddning/körning. Register med sju item-fält och separata kontextfält binds till exakta käll-/utkast-/registerdigester. Receipts bevarar ursprungliga SR-resultat/diagnostik, separata stöds-/klassificeringsbedömningar, fälttäckning, fyndredovisning och CE3-översättning. Omappade problem och fyndtak döljs inte. Sparade testsvar återspelas genom SR vid återöppning.

Offlinefallet c3-r1: **54 fält, SR complete, CE3 partial, ett förskrivet klassificeringsfynd.** Oförändrat utkast med historiskt CE3-kontraktsfel; ingen giltig kundsession skapas för detta fall. Kontrollfallet: **77 fält, SR complete, CE3 complete, noll förskrivna fynd.** Resultat finns i [offline-records/summary.json](offline-records/summary.json), detaljer i respektive receipt. Originalfacit läses inte av granskningskoden. Detta är integrationskontroller, inte bevis på SR:s upptäcktsförmåga.

Sessionsdemonstrationen verifierar första granskning → blockerad tidig överlämning → kundsvar → inaktuell gammal granskning/bekräftelse → uttryckligt nytt utkast → ny granskning → dokumenterad fyndhantering → aktuell bekräftelse → status `ready_for_separate_compilation_and_validation`. Inget kompileras eller körs. Återöppning bevarar session/1 och hela SR-underlaget i separat `ce3-structured-sr-bundle/1`.

Verifiering: **125/125 tester passerar**: 39 kontrakt, 25 session, 16 tidigare eval, 24 historiska SR-adapter och 21 nya strukturerade adaptertester. Bevarad diagnostikfreeze och tidigare evalresultat verifieras också (27 arkiverade begäranden, 26 svar och 5 historiskt ogiltiga envelopes; inga nya liveanrop). Kod-/underlagsavvikelse, manipulerad översättning, saknade receipts, sena svar, felaktiga bindningar och liveetiketter testas uttryckligen.

Från CE3-repots rot:

```sh
node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-evaluation/evaluation.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/adapter.test.cjs isolated-tests/structural-ce3-workbench/onboarding-sr/structured/adapter.test.cjs
node isolated-tests/structural-ce3-workbench/onboarding-sr/verify.cjs
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/run.cjs verify
node isolated-tests/structural-ce3-workbench/onboarding-evaluation/verify-results.cjs
```

Bevarandekontroll: 2 142 befintliga CE3-filer jämförda, endast de tre avsedda dokumenthänvisningarna ändrade; samtliga 134 befintliga SR-filer byteidentiska och SR:s Git-status ren. [FILES.txt](FILES.txt) listar samtliga 17 leveransfiler.

**0 externa AI-anrop, 0 USD; SR-repot oförändrat.** Ingen publicering. Driftsatt beta, livekvalitet och fullständig live-onboarding är fortfarande inte verifierade. Minsta nästa steg är en separat sessionsversion med receipt-/register-/kodbindning i review-händelsen och uttrycklig migration av historiken, följt av budgeterad livetransport i ett senare pass. Se [README.md](README.md).
