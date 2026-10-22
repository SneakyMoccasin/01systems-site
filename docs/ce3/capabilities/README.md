# Gemensam CE3-motorbaslinje

Läs [engine-baseline-v1.json](engine-baseline-v1.json) som ett versionsbundet
inventarium över faktisk motorförmåga. `schema_version` är
`ce3-engine-capabilities/1`. Sökvägar i JSON räknas från repositoryroten.
Börja med `implementation_binding` och `purpose`, följt av `versions`,
`supported` och `evidence_axes`. `unsupported` och `onboarding` anger gränserna.
Detta är dokumentation, inte ett nytt indataformat eller en ändring av validatorerna.

Dokumentet beskriver implementationen **9b705f0**, ovanpå budgeträttningen
**d24d6d1**, granskad i **2ceb06b**. `decision-flow-demo-v1` fast-forwardades
från d24d6d1 till 2ceb06b. Den senare har exakt 9b705f0 som förälder och tillför
endast granskningsrapport och tester. Ingen implementationskod ändrades vid
integrationen. Budgetgranskningen **3ab8948** bevaras separat och refereras med
commit och rapportsökväg; den är inte en ancestor till den integrerade etappen.
Ingen slutlig dokumentationscommit används som självrefererande identitet.

Inventeringen återanvänder strukturen i
[replayprofilen](../../../isolated-tests/structural-ce3-replay/core/profile.json)
för kärnans profil, versioner, stöd, begränsningar, resursregler och audit.
Profilen förblir oförändrad: dess `alternative_plan_search`-begränsning gäller
replaylagret. Det separata explorerlagret stöder den avgränsade permutationssökningen.
Äldre explorer /1 och scenario /1–/2 behåller sina kontrakt; tidsmål kräver
uttryckligen scenario /3. Arkiverade körpaket kräver fortsatt sin registrerade
runtime/build, även när formatversionen är densamma.

`source_files_sha256` binder samtliga 19 filer i replayns och explorerns
befintliga kodmanifest. `explorer_build_id` använder motorns kanoniska digest,
inte SHA-256 av JSON-filens formaterade bytes. Dokumentation ingår inte i
explorerns kodmanifest. Formatkontrakten i `contract_inventory` och de
exekverbara validatorerna avgör vilka indata som accepteras.

För onboarding är den gemensamma referensen implementation 9b705f0 med
granskning 2ceb06b: `fixed-replay/0.1`, `ce3-scenario-problem/3`,
`permutations_once/2`, `ce3-history-goal/1` och `ce3-goal-observation/2`.
Onboarding ligger separat på `codex/ce3-onboarding`, observerad HEAD **27bec92**.
Dess äldre `onboarding-evaluation/profile-context.json` är en replaybeskrivning,
inte det samlade motorstödet. Motorförmåga visar inte att onboarding redan kan
kompilera eller SR-granska funktionen. Ingen onboardingfil eller SR-integration
ändras här. Explorerns enda tillåtna `purpose` är fortfarande
`synthetic_integration_test`; dokumentet vidgar inte det användningsområdet.

## Verifiering vid integrationen, 2026-10-22

Färsk freeze/run/verify av
[temporal-problem.json](../../../isolated-tests/structural-ce3-explorer/fixtures/temporal-problem.json)
gav exitkod **0/0/0**, en certifierad cell och fullständig söktäckning.
Målet var avsiktligt `NOT_SATISFIED`, robusthet `FALSE`. Komponenterna gav
terminal=true, always=false, reach_by=true, stable_count=true och
no_confirmation=false; samtliga beslutsförsök accepterades. Run och verify
beräknade samma resultatidentitet. Detta skiljer korrekt körning från uppfyllt mål.

Dokumentkontrollerna omfattade unik JSON-nyckelsättning, dokumentstruktur,
commit-föräldrar, granskningsreferenser, alla 19 kodhashar, exakt återanvändning
av replayprofilen, kontraktssökvägar, versionskonstanter, stödgränser,
körbudgetstandarder och syftesbegränsningen. Fixturer för ursprunglig explorer
samt scenario /1, /2 och /3 validerades utan att hela testsviter kördes om.
Alla spårade filer från 9b705f0 jämfördes byte för byte med huvudspårets
arbetskopia. Den godkända granskningssvitens 189 testmetoder återkördes inte;
resultatet finns i den [oberoende granskningen](../../../isolated-tests/structural-ce3-explorer/TEMPORAL-GOALS-INDEPENDENT-REVIEW-9b705f0.md).

Reproducera freeze/run/verify med nya utmatningskataloger enligt
[tidsmålskontraktet](../../../isolated-tests/structural-ce3-explorer/TEMPORAL-GOALS-FORMAT.md#reproduction).
Lokala integrationsloggar, tillitsankare, körpaket och bevarandeinventering
finns i `/private/tmp/ce3-baseline-integration-20261022/`; de är tillfälliga
arbetsartefakter och inte normativa referenser.
