# Händelseordningar: Samma parkering, 2026-10-08

Kontrollen utgår från UI-checkpoint `ec4bc06`, profilen `fixed-replay/0.1`, originalplanerna för Samma parkering, positivt elutfall (`E_T2: ready`) i båda planerna och vecka 0–26. Inga modeller, planer eller körresultat har ändrats.

## Slutsats och omfattning

Plan B får trafikökningen godkänd åtta veckor tidigare i samtliga 768 kombinationer av de granskade A- och B-banorna. Alla nedanstående huvudmått är oförändrade inom respektive plan. Detta avser godkännande, inte faktisk trafikdrift eller verklighetsvalidering.

A har 8 och B 96 banor. Båda körningarna är COMPLETE; den oberoende granskaren anger PASS, `verified: true` och `all_event_permutations: true`. Därmed ingår alla tillåtna händelseordningar för just dessa fasta körindata enligt profilen. Antalet ensamt är inte täckningsbevis. Gränserna var max_paths=1000, max_rows=200000 och max_steps=1000; de avbröt inte kontrollen. A har 1048 historikrader, B 12576.

A förgrenar vid två samtidiga händelser vecka 8, 14 och 16: 2×2×2=8. B förgrenar vid två vecka 8, två vecka 10 och fyra vecka 12: 2×2×24=96. Besluten ligger efter händelsefasen. Detta är inte en kontroll av andra strategier, planordningar eller externa utfall.

## Mått per plan

| Mått | Alla värden A | Antal banor | Varierar |
|---|---|---:|---|
| Trafikgodkännande | vecka 20 | 8 | Nej |
| 100 parkeringsplatser borttagna | vecka 14 | 8 | Nej |
| Bussglapp | 6 veckor, avslutat [14,20) | 8 | Nej |
| Cykelglapp | 2 veckor, avslutat [14,16) | 8 | Nej |
| Spenderat | 29 miljoner | 8 | Nej |
| Kvarvarande budget | 1 miljon | 8 | Nej |

| Mått | Alla värden B | Antal banor | Varierar |
|---|---|---:|---|
| Trafikgodkännande | vecka 12 | 96 | Nej |
| 100 parkeringsplatser borttagna | vecka 14 | 96 | Nej |
| Bussglapp | 0 veckor, inga perioder | 96 | Nej |
| Cykelglapp | 0 veckor, inga perioder | 96 | Nej |
| Spenderat | 29 miljoner | 96 | Nej |
| Kvarvarande budget | 1 miljon | 96 | Nej |

Glappen följer de befintliga definitionerna och avläses vid tidsstegens slut. Enhet är miljoner; ingen valuta antas. `metrics.json` bevarar de maskinläsbara fördelningarna.

## Identiteter

Modellens kanoniska SHA-256: `4639269d5ba9e7ee51664dacda6f11dfbea2fae3eeb084c9c2dfa2850c6c810d`.

| Identitet | A | B |
|---|---|---|
| Plan-ID i kontrollkörningen | ef4bafcd9be74a788cf739149fdc2722 | ad007af60714417fb2daf5d261ec49f4 |
| Körnings-ID | 6596f3b627574d54ad062a3b26afc6e1 | 372871c7be8d40cfadc64ca991b89579 |
| Script SHA-256 | 1e3e9dc5d35e92b511a1b17503c84cd89daf1ddd121e56c2836a630b036933d4 | a3deb329f34bd89cbc9cbe7b5bb55d83804d80a12227b74bb3d1c0668555c74c |
| Operativa indata SHA-256 | 9039d8e263e9a8f9671e79b140b42faf99cca2cedd886250b6af9a3213307f4d | a2e37d06afda4f6729cd489234ec8aac9901ace83df6b047e03e5834fa5bd3fa |

Källvägar och deras hashvärden finns i `audit-summary.json` och `replay-inputs.json`. Plan-ID och körnings-ID är kontrollens lokala identiteter; reproduktionen verifierar innehållshashar.

## Vad ordningskänsligheten påverkar

A har sex varierande observationer direkt efter enskilda händelser: E_T1/E_T6 vecka 8, E_T9/E_T12 vecka 14 samt E_T3/E_T10 vecka 16. B har åtta: E_T6/E_T9 vecka 8, E_T3/E_T10 vecka 10 samt E_T1/E_T2/E_T5/E_T8 vecka 12.

Konkreta exempel (banor numrerade från 1, historikens index från 0):

- A: efter E_T3 vecka 16, bana 1 index 82, är cykelparkeringen ännu inte klar och E_T10 väntar. På bana 2 index 83 har E_T10 redan inträffat: cykelparkeringen är klar och händelsen saknas i kön.
- B: efter E_T1 vecka 12, bana 1 index 65, är elanslutningen pending. På bana 7 index 66 är den ready, eftersom E_T2 redan inträffat.

`intermediate-examples.json` bevarar dessa konkreta före/efterbilder. Inom respektive plan jämfördes också uttryckligen: samtliga beslutsutfall och blockeringsorsaker, registrerade transaktioner, sekvensen av veckoslutsbilder samt hela slutstatusen inklusive kvarvarande kö och genomförda beslut. Dessa var oförändrade. Det påståendet grundas inte bara på lika slutbudget. Full historik är däremot inte identisk mellan banorna.

## Orsaker och tidpunkter

A:s försök T7 vecka 12 blockeras (referensbanans index 62). Depån är inte tillgänglig, laddutrustningen inte installerad och elanslutningen pending. Faktiska övergångar observeras vecka 16 för depån (index 82 eller 83), vecka 18 för installationen (index 94) och vecka 20 för elanslutningen (index 103). Alla krav inklusive budget är uppfyllda i beslutsfasen vecka 20; planen försöker då igen och genomför beslutet (index 105).

B genomför T7 vecka 12 (index 70). Den villkorade instruktionen vecka 20 hoppas över (index 105); den är inte ett nytt genomförandeförsök. Parkeringen tas bort vecka 14 (A referensindex 72, B 79). Referensraderna finns i `audit-summary.json`.

Tidigare ”först observerat uppfyllt” sökte en efterbild i hela historiken efter blockeringen, inte enbart vid ett nytt beslutsförsök. Den nya presentationen kräver en observerad falskt→sant-övergång och skiljer den från readiness i beslutsfasen och faktiskt genomförande. Övergången är ingen garanti för fortsatt uppfyllelse. Orsaksförklaringen gäller vald bana; andra modeller kan ha varierande orsaker.

## Reproduktion och evidens

Kör från repots rot:

```sh
python3 -B isolated-tests/structural-ce3-workbench/verification/order-audit-20261008/reproduce.py
```

Kräver befintlig Python 3 och Node. Skriptet använder tillfällig lagring, återspelar båda kompletta körningarna, kontrollerar operativa indata och hela historikens SHA-256, kör den oberoende granskaren och verifierar mått per bana samt alla 768 par. Förväntat: PASS.

`replay-inputs.json` innehåller modellen en gång, båda script, externa utfall, begränsningar, källhashar, glappdefinitioner och historikhashar. `audit-summary.json`, `metrics.json` och `intermediate-examples.json` är exakta kopior från `/tmp/ce3-order-audit-20261008/`. Historikfilernas absoluta sökvägar i den gamla sammanfattningen är historiska referenser; reproduktionen behöver dem inte. Stora historikfiler dubbleras inte. Originalkatalogen i /tmp lämnas orörd.
