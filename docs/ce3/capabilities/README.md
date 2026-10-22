# Gemensam CE3-motorbaslinje

**Aktuell rekommenderad version är [engine-baseline-v3.json](engine-baseline-v3.json)**,
med baseline-ID `ce3-manual-pilot-v2-5967182`. Den binder implementationen
`59671820b731542a683650c5d94afd8cf0ea372c` och oberoende granskning
`a9959e6004e3e9ad682756923bd12efa9dc84f20`: PASS för piloträttningen inom den
dokumenterade modellen. **Renderad visuell kontroll återstår.**

[engine-baseline-v1.json](engine-baseline-v1.json) och
[engine-baseline-v2.json](engine-baseline-v2.json) bevaras byteoförändrade som
historik för tidsmål respektive valfria beslut. V3 behåller inventarieformatet
`ce3-engine-capabilities/1`; filversionen ändrar inget exekverbart format.

Sökvägar i JSON räknas från repositoryroten. Läs `implementation_binding`,
`purpose` och `versions` först. Läs därefter `supported.replay`,
`supported.explorer` (scenario /2–/3), `supported.selected_explorer` (/4) och
`supported.manual_pilot` (separat antagningslager). `evidence_axes` skiljer
underlag, audit, mål, söktäckning och budget/prefix. Avsluta med
`resource_policy`, `unsupported` och `onboarding`.

## Versionsbindning och integration

`decision-flow-demo-v1` fast-forwardades från `d1f1f87` via pilotimplementation
`599ac9e` och rättning `5967182` till `a9959e6`. Granskningen är direkt barn
till rättningen och tillför endast rapport och tester. Alla implementationsbytes
matchar `5967182`; ingen implementationsändring behövdes vid integrationen.
[Integrationsrapporten](PILOT-INTEGRATION-REPORT.md) redovisar färsk körning,
byte-/bindningskontroller, bevarande och återstående visning.

Historisk FAIL på `599ac9e` bevaras separat på `a8cc1fa`, branch
`codex/review-pilot-599ac9e`. Läs originalrapporten utan att byta branch:

```sh
git show a8cc1fadbd57639bcc78fb16161d7b9585c5e0cf:isolated-tests/structural-ce3-explorer/PILOT-INDEPENDENT-REVIEW-599ac9e.md
```

F1 gällde negativ/ofullständig bekräftelse, F2 ett paketägt ankare via symlänk,
F3 förlorad fabriceringsmärkning i resultat. Rättningen och dess oberoende
PASS finns i [rättningsrapporten](../../../isolated-tests/structural-ce3-explorer/PILOT-FIX-REPORT-a8cc1fa.md)
och [granskningen](../../../isolated-tests/structural-ce3-explorer/PILOT-FIX-INDEPENDENT-REVIEW-5967182.md).
Originalrapport/tester är inte omskrivna eller integrerade som godkänd kod.

V3 binder 22 faktiska kod-/profilhashar från replayns och explorerns manifest,
inklusive båda pilotmodulerna. Övningsgeneratorn och normativa rättningsunderlag
har separata artefakthashar. `explorer_build_id` är motorns kanoniska JSON/LF-
digest, inte SHA-256 av v3-filen. Ingen egen dokumenthash eller slutlig
dokumentationscommit ingår som självrefererande identitet.

**Pilotkodens `registration()` binder fortfarande v2:s historiska baseline-ID
och exakta filhash**, tillsammans med aktuell faktisk kod/build och runtime.
V3 beskriver den nya gemensamma baslinjen men ändrar inte denna redan granskade
registrering. V1/v2 ska därför inte uppdateras för att följa dagens kodhashar.
Arkiverade paket kräver registrerad build och Python-runtime. Den äldre
budgetgranskningen `3ab8948` ligger fortsatt separat. Föregående integration
beskrivs i [v2-rapporten](OPTIONAL-DECISIONS-INTEGRATION-REPORT.md).

## Separat manuellt pilotflöde /2

[Det normativa /2-kontraktet](../../../isolated-tests/structural-ce3-explorer/PILOT-FORMAT-V2.md)
och [conciergeflödet](../../../isolated-tests/structural-ce3-explorer/PILOT-CONCIERGE.md)
styr pilotlagret. Christian sammanställer modell, källmapping, hypoteser,
frågor och handhärledda kontrollfall; kunden kan delta med dokument och samtal
utan att skriva JSON. Minst två distinkta kontrollfall måste passera replay,
audit och jämförelse med förhandsfacit. Full lövmapping och exakta citat/hashar
kontrolleras maskinellt, men källsanning, relevans och meningsfull scope bedöms
av människor. Osäker tid är inte outcomes-scenarier; modellglapp kräver
uttryckligen ändrad omfattning utan beroende slutsatser.

Endast `pilot_runner.py prepare|freeze|run|verify` är pilot-CLI. Inre problem
är /4 med `purpose=bounded_real_pilot`, godtaget endast inom ett validerat
pilotpaket. Delade Pythonfunktioners `Admission` kontrollerar paketet och det
exakta problemet igen; ett booleskt medgivande eller ändrad purpose-sträng räcker
inte. Vanliga syntetiska ingångar behåller `synthetic_integration_test`.
**Pilot /1 är historiskt och avvisas av den nya pilotingången.** Ingen automatisk
migrering: ny /2-prepare, manuell granskning, båda nya kvittona och nytt ankare.
`ce3-pilot-confirmation-record/1` är däremot det nya strukturerade postformatet.

Båda rollerna, `domain_review` och `customer_confirmation`, måste ha exakt
`approved` i /2-kvitto och separat strukturerad post, med samma snapshot,
presentation, klassificering, person-/roll-/tidsuppgifter, hela omfattningen,
antagandena och stödmaterialet. Saknade/extra/dubbla fält och typkonflikter
avvisas. Separata bevarade svar/protokoll hashbinds men tolkas inte som
maskinellt godkännande. Christian ansvarar för sanningsenlig registrering av
faktiskt svar; hashlikhet autentiserar inget samtycke.

| Deklaration | Kvittoursprung | Betydelse |
|---|---|---|
| `fabricated_exercise` | `fabricated_test` | Fabricerad övning; aldrig en genomförd kundpilot |
| `declared_real_case` | `declared_actual_response` | Uppgivet verkligt fall och faktiska svar; personer, svar och verklighetsuppgifter är inte autentiserade |

Klassificeringen binds före bekräftelse och följer med hela kedjan och
resultatets `case_notice`. Blandade/stale deklarationer avvisas, men en
konsekvent osann verklighetsdeklaration kan inte upptäckas. Övningsgeneratorn
vägrar skapa testkvitton för ett deklarerat verkligt fall.

Ankaret ska väljas och bevaras av operatören utanför paketens logiska och
upplösta rötter. Paketets ankarkopia och identitetsalias godtas inte som externt
ankare. Paketrot och innehåll får inte ha symlänkar eller specialfiler;
föräldraalias som macOS `/tmp` tillåts. En separat byteskopia bevisar inte
betrodd förvaring. Betrodd kod och stabila lokala filer förutsätts.

| Besked | Vad det säger |
|---|---|
| `pilot_status=COMPLETE_CURRENT` | Deklarerade underlags-/bekräftelse-/kontrollkrav mot bevarad snapshot; ingen bevakning av verkligheten |
| `run_status` och cellaudit | Certifierad exekvering, separat från målutfall |
| `goal_status` och cellmål | Robust TRUE/FALSE/UNKNOWN respektive certifierade positiva/negativa mål |
| `search_coverage` | Täckning av hela deklarerade cellpopulationen; kandidat-/scenarioprojektioner räcker inte |
| `execution_budget_status` | Giltigt/ogiltigt rekonstruerat försöksprefix och budget |

Komplett underlag kan alltså samexistera med nollbudget, ofullständig sökning
och UNKNOWN mål. Fullt negativ slutsats kräver full verifierad deklarerad
domän. Samma fasta script körs över scenarierna; ingen ranking eller global
omöjlighet följer. Förproven ligger utanför batchens `max_cells`, timeout är
60 sekunder per replay-/auditprocess och ingen total väggklocksgaranti finns.
Budget/limits är bekräftade snapshotfält och kan inte ändras med run-flaggor.
Verify är skrivskyddad, kör ingen replay och ignorerar sparade resultatcacher.

## Bevarat motorstöd i scenario /4

[Det normativa kontraktet](../../../isolated-tests/structural-ce3-explorer/OPTIONAL-DECISIONS-FORMAT.md)
definierar `ce3-scenario-problem/4` och `selected_permutations_once/1`.
Obligatoriska R och valfria O är en exakt disjunkt partition av modellens
1–6 beslut. Grupper består av minst två valfria beslut, är parvis disjunkta
och kräver `exactly_one` eller `at_most_one`. Ogrupperade valfria beslut väljs
oberoende. Varje giltig valmängd får alla permutationer, ett `attempt` per
valt beslut. Urvalslogiken verkställer inga guards, effekter eller kostnader.

`prefix/1` kräver exakt Kmax stigande heltalsslots, där
Kmax=antal obligatoriska + antal ogrupperade valfria + antal grupper.
Ett ord med k beslut använder de första k slotsen. Att utelämna X från
PXU@0/2/4 ger **PU@0/2**, inte P@0,U@4. Tidigareläggningen kan ändra utfallet
kring events och deadlines. Det finns ingen dold WAIT eller oanvänd slotnyckel.

Tom kandidat kräver uttryckligt `allow_empty=true` och att inga obligatoriska
beslut eller exakt-ett-grupper kräver ett val. Scriptet är `steps={}`, men
initiala events, hela horisonten och alla eventbanor körs och auditeras.
Noll försök gör försökskravet sant efter audit, inte målkomponenterna.

`ce3-history-goal/2` har `acceptance_scope=candidate_script`;
`ce3-goal-observation/3` binder urvalsbevis och förväntade entries. Verifieraren
kräver exakt beslut, tid, ordning och position enligt scriptet. Utelämnat
valfritt beslut är inget blockerat försök. Ett valt men blockerat beslut
fäller helhetsmålet. Operativ audit PASS räcker inte för ett urvalsstridigt
script. Hela modellen och fulla outcomes, även för oanvända regler/events,
behålls. Samma fasta script används i samtliga scenarier.

Stödtaken är **720 kandidater och 2160 celler, inklusivt**, före enumeration,
materialisering och output. Polynomkoefficienterna c_k räknar giltiga
valmängder per längd; C=Σ c_k·k! och M=C·antal scenarier. Sex modellbeslut
innebär inte automatiskt stöd: sex helt valfria ger 1957 kandidater med tomt
val och 1956 utan, och avvisas. Sex obligatoriska ger 720 och tillåter högst
tre scenarier. Fem helt valfria med tomt val ger 326. En liten eller noll
körbudget kan inte legitimera en större sökrymd.

## Bevarade garantier och gränser

Terminal, always och reach_by behåller tidigare typstrikta och inklusiva
snapshot-semantik. Scenarier varierar endast fulla externa outcomes.
Robust TRUE kräver samma kandidat positiv i alla deklarerade scenarier och
alla deras eventbanor. Ett certifierat motexempel ger FALSE; övrig ofullständig
evidens ger UNKNOWN. Run-, mål-, kandidat-, scenario-, cell- och eventtäckning
är skilda besked. Replayfel, limits eller saknad bana ger inga delbevis.

Körbudget är skild från stödtaken. /4 startar efter längd, lexikografiskt ord,
sedan deklarerad scenarioordning. Alla kvarvarande försöksposter, även tomma
eller misslyckade, räknas. Sparad enumeration får inte bestämma prefixet.
Verify återhärleder hela domänen, återauditerar och räknar om mål utan att
skriva, köra replay eller lita på result.json. Fullt omhashade ofullständiga
medlemslistor kan inte ersätta domänkontrollen.

Kvarstår: inga fria tidsval, överlappande/operativa urvalsvillkor, adaptiva
policyer, retry/resume, ranking, generell nåbarhetsanalys. Pilotantagningen ovan utökar inte dessa analysförmågor.
Stödtaken garanterar inte att eventbanor eller körning ryms inom replaylimits.
Hashar kräver betrodda pins/kod och stabila filer; de är inte signaturer,
verklighetssanning eller attestering av raderade försök och väggklocksordning.
Explorer /1 och scenario /1–/3 behåller sina kontrakt.

**Vanliga syntetiska ingångar accepterar fortsatt endast `synthetic_integration_test`.**
Den manuella /2-piloten är den separata antagningsvägen ovan. Replayprofilens `alternative_plan_search`-begränsning gäller
replaylagret; den separata explorern har den här uttryckligt begränsade sökningen.
Pilotlagret ändrar inte replayprofilens semantik eller de syntetiska ingångarnas purpose.

## Motor jämfört med onboarding och SR

V3 är rekommenderad gemensam referens för separat framtida översättning och granskning.
Det innebär inte att onboarding kan kompilera /4 eller att SR redan kan
verifiera dess domänsemantik. Onboarding ligger kvar separat på
`codex/ce3-onboarding`, observerad HEAD `27bec92`.

Den befintliga session/2-dokumentationen beskriver versionsbundna underlag,
förslag, granskningsarkiv, kundbekräftelse och överlämning för **separat
kompilering och validering**, med CE3 validation/run fortfarande `not_run`.
Den strukturerade SR-adaptern har pinnad SR-kod, täckning och receipts samt
offlinekontroller med sparade svar. Detta är ingen verifierad /4-kompilator
eller garanti för livegranskningens kvalitet. Gamla onboardingkontrakt och
den äldre replay-only `profile-context.json` har inte migrerats.

En separat bedömning behöver omfatta valbarhet, gruppkrav, prefixets
tidskonsekvenser, tom plan, mål, scenarios, källstöd och purpose. Kundbekräftelse
eller ett komplett SR-kvitto ersätter inte exekverbar validering, audit eller
målbevis. Inga onboarding- eller SR-filer ändras i denna integration.

## Återstående renderad visuell kontroll

Ingen renderad visuell kontroll har utförts vid denna integration. Ingen
webbläsarpolicy har kringgåtts. Christian ska manuellt öppna exakt den färska filen:

`/private/tmp/ce3-pilot-integration-20261022-l3wsj8zd/prepared/review.html`

Använd tillåten lokal filhantering, exempelvis Finder → Öppna med. Kontrollera
synlig fabriceringsmärkning, läsbara modell-/käll-/hypotes-/frågetabeller och
citat, svenska tecken, Full snapshot-bilagan samt alla tre körgränserna ovan.
Kontrollera zoom/utskrift vid behov. Renderad layout, responsivitet och
skärmläsaråtkomlighet är inte verifierade. Ändra inte HTML-bytes manuellt;
presentationsändring kräver ny prepare och nya bekräftelser. Filen är ett
lokalt temporärt arbetsbevis, inte en genomförd kundgranskning.
