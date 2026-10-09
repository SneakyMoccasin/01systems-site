# Checkpoint: isolerad liveutvärdering av onboarding

2026-10-09. Start-HEAD `2aa123c1d850cd4b62b0bb1e1dae85ab1bfd7046`, branch `decision-flow-demo-v1`, 15 commits före lokal origin-referens. Staging och spårad arbetskopia var rena. Kontrakten från `0a4d0b7` och sessionshållaren från `2aa123c` används oförändrade.

Alla nya filer ligger i `isolated-tests/structural-ce3-workbench/onboarding-evaluation/`. Fullständig filförteckning: [FILES.txt](FILES.txt).

| Filer | Innehåll |
|---|---|
| `adapters.cjs` | Strikt wire-schema, exakt citatupplösning, kuvert och oförändrade kontraktskontroller |
| `provider.cjs` | Befintlig OpenAI-konfiguration, begränsad transport, beständig budget och mätning |
| `run.cjs` | Frysning, isolerade par, oföränderliga utkast, stopp och felloggning |
| `summarize.cjs`, `verify-results.cjs`, `inspect.cjs` | Offlineberäkning, återskapande från råsvar och läsbar granskning |
| `evaluation.test.cjs` | 16 adapter-/budget-/isoleringstester med lokal mocktransport |
| `cases.json`, `gold.json` | Fem syntetiska fall och före körning låst facit |
| `protocol.json`, `prompts.json`, `profile-context.json`, `freeze.json` | Exakta inställningar, priskällor, prompts, teknisk profilkontext och hashes |
| `sr-provenance.json` | SR-HEAD, hashes av relevanta implementationer och säker konfigurationsmetadata |
| `adjudication.json` | Granskningsbar, preliminär källbunden bedömning av faktiskt erhållna svar |
| `results/` | 27 begäranden, 26 lyckade råsvar och ett kreditfel, valideringar, artefakter, usage, tider, budget och summering |
| `README.md`, `REPORT.md`, `CHECKPOINT.md`, `FILES.txt` | Reproduktion, resultat, begränsningar och filförteckning |

## Körning och begränsning

8 parade upprepningar färdiga som råsvar; fem av dem är kontraktsgiltiga i alla tre steg. c5-r1 har utkast/A men B nekades med HTTP 429 `credit_balance_exhausted`. c5-r2 startades inte. Totalt 26 svar med usage och ett nekat anrop utan usage. Ingen retry och inget inköp. Ingenting rättades tyst och inga fel injicerades.

Känd usage × daterad ordinarie taxa: **0,5023364 USD**, inte verifierad faktura. Taxans övre cache-skrivningsberäkning plus hela reservationen för anropet utan usage: **0,6809559 USD**. Alla reservationer ligger kvar: 4,104 USD. Före körning låst max för 30 anrop: 4,56 USD, under användarens 5 USD. Förbrukningen av befintliga API-krediter stoppade körningen; ingen ytterligare användbar kredit finns enligt leverantörssvaret.

Den preliminära semantiska bedömningen visar ingen unik SR-träff. Se [REPORT.md](REPORT.md) för fulla nämnare, konkreta belägg, rå kontra kontraktsgiltig detektion, frågetäckning och jämförbara parade kostnader. Mänsklig semantisk granskning har inte genomförts; en kodagents bedömning är inte oberoende mänskligt facit. Inget påstående om förbättrad slutmodell, generell kvalitet eller kundvärde görs.

## Verifiering

| Kontroll | Resultat |
|---|---|
| `node --test isolated-tests/structural-ce3-workbench/contracts/onboarding-v1/contract.test.cjs isolated-tests/structural-ce3-workbench/onboarding-session/session.test.cjs isolated-tests/structural-ce3-workbench/onboarding-evaluation/evaluation.test.cjs` | **80/80**, varav 39 kontrakt, 25 session och 16 nya utvärderingstester |
| `python3 -B -m unittest discover -s isolated-tests/structural-ce3-replay/verification -p 'test_*.py' -v` | **27/27** befintliga regressionskontroller |
| `node .../onboarding-evaluation/run.cjs verify` | Frysning oförändrad efter livekörningen |
| `node .../onboarding-evaluation/verify-results.cjs` | 27 begäranden matchar frysta indata; 26 svar/artefakter och deras valideringar återskapas exakt; fem kontraktsogiltiga kuvert bevarade |
| `node .../onboarding-evaluation/summarize.cjs` | Offlineberäkning från usage, tidsloggar, budget och explicita bedömningsetiketter |
| Bevarande | Alla **61** tidigare ospårade revisionsfiler byteidentiska mot startbaslinjen; inga tidigare spårade filer ändrade |
| SR | HEAD `10d2482186e0d116506f215bdbdbd70f009ab18b`, ren arbetskopia, ingen ändring |
| Hemligheter | Befintlig nyckel kontrollerad mot samtliga leveransfiler utan att visas; ingen nyckel eller auth-header lagrad |

Node v25.1.0 och befintlig Ajv används, utan beroendeinstallation. Ingen UI, kunddata, lagerdokumentation, CE-kompilering, CE-scenariokörning, SR-modifikation eller publicering ingår. Befintliga kärntester kördes endast som regression.

Nästa steg: låt mänsklig granskare kontrollera fel-/frågebedömningarna. De fyra återstående modellstegen kräver fungerande krediter och ett separat beslutat kompletteringspass; använd inte denna körnings resultatkatalog för att nollställa budget eller dölja återförsök.
