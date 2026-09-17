# Hallandsås Historical Evidence Design Audit

Audit date: 2026-09-17

Repository baseline: `8ac967bdec65a2eb835560fe5f1536194768f492`

Scope: strict read-only historical-evidence design audit; no historical case, profile, fixture, Golden, input model, runtime adoption, website implementation, staging, commit, push, deployment, or Vercel interaction

## Executive conclusion

**D. BLOCKED — COUNTERFACTUAL SEQUENCE NOT DEFENSIBLE**

The official reconstructions support a coherent four-event corridor, but not yet a defensible review-gated counterfactual. The 5 December 1996 event was Skanska's notice that contractual injection methods did not work, not the material strategy decision. The first candidate decision was Banverket's still-undated January 1997 instruction to widen the northern tunnel sections for possible lining while continuing the search for sealant. Limited Rhoca Gil injections were ordered on 20 February; Bergrådet recommended larger sections on 24 June; Banverket and Skanska agreed on 26 June to follow that recommendation.

This chronology is reconstructed mainly from SOU 1998:60 and SOU 1998:137. The underlying January decision, 20 February order, test records, 24 June advice packet, construction-meeting record, contract authority clauses, and contemporaneous feasibility evidence for a review gate were not retrieved. A Banverket chemical-control rule and an unaccepted toxicity addendum show a review path was institutionally conceivable, but do not establish its authority, duration, staffing, contractual effect, or practical availability before 26 June. The stop condition therefore fires before historical-input or profile design.

## Scope och claim boundary

The audit asks only whether a three-to-five-decision Hallandsås case has traceable pre-cutoff evidence and a historically available alternative sequence suitable for the next design step. It does not decide fault, reconstruct the whole project, infer causation from chronology, calculate alternative cost or time, predict environmental or health outcomes, select engine values, or execute Cascade Engine (CE).

Repository precontrol passed before this file was created: branch `decision-flow-demo-v1`; local, tracking, and actual `origin/decision-flow-demo-v1` HEAD all `8ac967bdec65a2eb835560fe5f1536194768f492`; remote `origin`; clean index and working tree. The only permitted repository mutation is this untracked audit file.

The M0B–M1E boundary remains controlling:

- M0B locks canonical JSON, SHA-256 hashing, six fixture/Golden pairs, executable legacy-profile semantics, deterministic repeatability, and post-hoc Structural Observation without authorizing a new case (`docs/audits/domain-model-m0b-completion-audit.md`, sections 5–8 and 12).
- M1A separates contract-owned domain/calibration semantics from run input, presentation, and persistence (`docs/audits/domain-model-contract-m1a-ownership-schema-design.md`, sections 3–9).
- M1B–M1C require strict parsing, semantic validation, closed provenance, collision checks, and separate source, projected-native, compatibility, and envelope hash domains; validity grants neither trust nor executability (`docs/audits/domain-model-contract-m1b-completion-audit.md`, sections 5–8; `docs/audits/domain-model-contract-m1c-completion-audit.md`, sections 4–10).
- M1D Comparator A requires successful legacy output and fail-closed cause-exclusion prerequisites. Comparator B compares pure-native with compatibility-effective execution and requires exact, complete attribution (`docs/audits/domain-model-contract-m1d-completion-audit.md`, sections 5–9).
- M1E closes only three locked profiles and six locked M0B cases. It does not authorize Hallandsås, production trust, registration, persistence, runtime adoption, migration, or deployment (`docs/audits/domain-model-contract-m1e-final-equivalence-completion-audit.md`, sections 1, 4–6, 11–15).
- Path B is a reproducible historical analysis outside M1E: versioned evidence, assumptions, period register, mapping, hash-bound input and deterministic snapshot, with no production wiring or equivalence claim (`docs/audits/historical-case-post-equivalence-readiness-audit.md`, sections 4, 7–11).

## Source methodology

The search prioritized contemporaneous 1996–1997 records, then official later reconstructions. Search terms covered the dates, Rhoca Gil, building and rock-engineering meetings, the Cement and Concrete Institute reports, Banverket chemical rules, authority, water judgments, and supervision. No secondary source carries a material finding.

Evidence labels mean:

- `contemporary-primary`: the audit inspected the original document or an official reproduction.
- `contemporary-reported`: a later official source names or quotes the contemporary document, but this audit did not inspect the complete original.
- `later-official-reconstruction`: an official post-cutoff account used to verify history, never automatically actor knowledge.
- `secondary-orientation`: discovery only.
- `modelling-assumption`: explicit analytical construction without historical proof.
- `unresolved`: required fact not established.

### Source register

| ID | Document title | Issuer | Date/year | Locator | URL | Class | Available before cutoff? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | *Kring Hallandsåsen*, SOU 1998:60 | Tunnelkommissionen / Statens offentliga utredningar | 1998 | pp. 43–49, especially pp. 44–46 | [Riksdagen HTML](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/statens-offentliga-utredningar/kring-hallandsasen_gmb360/html/) | later-official-reconstruction | No; verifies later history only |
| S2 | *Miljö i grund och botten – erfarenheter från Hallandsåsen*, SOU 1998:137 | Tunnelkommissionen / Statens offentliga utredningar | 1998 | main report pp. 82–83, 111–113; Bilaga 3 pp. 36–39; Bilaga 6 pp. 6–15 | [Riksdagen official text](https://data.riksdagen.se/dokument/GMB3137d1) | later-official-reconstruction | No; verifies later history only |
| C1 | *Yttrande om beständigheten hos Rhoca Gil 110-25*, preliminary report | Cement och Betong Institutet, commissioned by Banverket | 1997-02-21 | Named in S2, Bilaga 3 p. 37, note 54 | No standalone public URL found; cited in [S2](https://data.riksdagen.se/dokument/GMB3137d1) | contemporary-reported | Yes as a document; exact recipients and receipt times unresolved |
| C2 | *Utvärdering av beständigheten hos injekteringsmedel baserade på akrylamid*, no. 97042 | Cement och Betong Institutet, commissioned by Banverket | 1997-04-22 | Named in S2, Bilaga 3 p. 37, note 55 | No standalone public URL found; cited in [S2](https://data.riksdagen.se/dokument/GMB3137d1) | contemporary-reported | Yes as a document; exact distribution unresolved |
| C3 | *Byggmötesprotokoll nr 16* | Banverket, Södra regionen | 1997-06-30 | Named in S2, Bilaga 3 p. 39, note 58 | No standalone public URL found; cited in [S2](https://data.riksdagen.se/dokument/GMB3137d1) | contemporary-reported | It records the 26 June meeting, but the signed record post-dates the proposed cutoff |
| C4 | Skanska notice at building meeting: contractual injection did not work | Banverket/Skanska meeting record | 1996-12-05 | Quoted in S1 p. 44 | No standalone public URL found; quoted in [S1](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/statens-offentliga-utredningar/kring-hallandsasen_gmb360/html/) | contemporary-reported | Yes to meeting participants; wider distribution unresolved |
| C5 | Banverket order for four Rhoca Gil injections | Banverket to Skanska | 1997-02-20 | Quoted in S1 p. 45 | No standalone public URL found; quoted in [S1](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/statens-offentliga-utredningar/kring-hallandsasen_gmb360/html/) | contemporary-reported | Yes to sender/recipient; signatory, scope, and distribution unresolved |
| C6 | *PA-handboken. Arbetsmiljö*, BVH 200.6d:1 | Banverket | version applicable in 1997, exact issue date unresolved | Named in S2, Bilaga 3 p. 38, note 56 | No standalone public URL found; cited in [S2](https://data.riksdagen.se/dokument/GMB3137d1) | contemporary-reported | Reported applicable before cutoff; exact version and holders unresolved |
| C7 | Del-dom DVA 29/95, mål VA 55/91 | Växjö tingsrätt, Vattendomstolen | 1995-05-23 | Identified in S2, Bilaga 5 p. 35, note 73; S1 sections 3.3 and 3.8 | No complete official reproduction retrieved; referenced in [S2](https://data.riksdagen.se/dokument/GMB3137d1) | contemporary-reported | Yes; exact operative text must be retrieved |

The absence of standalone URLs does not imply that C1–C7 do not exist. It means their full contents were not inspectable in this audit and therefore cannot carry `contemporary-primary` weight.

## Case wrapper

The Hallandsås tunnels were part of the West Coast railway upgrade. The project sought a new double-track passage through the ridge to improve railway capacity and efficiency. Fractured and water-bearing rock produced heavy ingress; the permitted abstraction and discharge conditions made sealing central to continued tunnelling. S1 pp. 31–49 and S2 pp. 25–31 are later official reconstructions, not pre-cutoff inputs.

Within the audited window, Banverket was the public client and builder; Skanska was general contractor; Bergrådet supplied rock-engineering advice; Cement och Betong Institutet assessed durability; Rhône-Poulenc supplied product information; Länsstyrelsen supervised water matters; Båstad municipality and Yrkesinspektionen had distinct environmental-health and workplace roles. These organization-level roles are supported by S1 pp. 20–24, 43–46 and S2 pp. 82–83, 111–113 and Bilaga 6. Individual delegated authority for the four candidate decisions is not established.

The narrow corridor begins when failed contractual injection made alternatives explicit and ends at the meeting that authorized a 200-metre test/use section. It excludes the original investment choice, earlier contractors, later large-scale use, contamination discovery, stoppage, litigation, restart, completion, and total-project economics.

## Final Swedish ingress

> Hallandsåstunneln byggdes för att förbättra Västkustbanans kapacitet men mötte svår, vattenförande berggrund. Analysen zoomar in på beslutskedjan från Skanskas besked den 5 december 1996 till byggmötet den 26 juni 1997: hur prov, granskning och fortsatt användning förändrade återstående handlingsutrymme. Informationsgränsen är mötets slut, vars exakta tid ännu måste beläggas. CE-frågan är om en då genomförbar granskningsstyrd ordning hade bevarat fler val. Analysen avgör inte skuld, orsak, alternativ kostnad, miljö- eller hälsoresultat och behandlar inte senare kunskap som känd i juni 1997.

Word count: 75.

## Actor and authority register

| Actor | Organizational role | Documented competence/access in window | Function | Source | Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Banverket, Södra regionen / Hallandsås project | Builder and client | Ordered work and CBI study; party to January and June choices; held water-judgment obligations | order, approval, client control | S1 pp. 43–46; S2 pp. 111–113 | Individual signatory, delegation limit, and meeting vote unresolved |
| Skanska | General contractor and employer under the contract | Obtained Rhoca Gil information; executed injections; party to 26 June meeting | information gathering, recommendation input, implementation, employer safety | S1 pp. 45–46; S2 p. 112 and Bilaga 6 pp. 6–15 | Exact method-selection and procurement authority split unresolved |
| Bergrådet | Expert group of researchers and consultants | Rock-engineering advice; recommendation on 24 June | recommendation only | S1 p. 46; S2 Bilaga 3 p. 38 | Membership, mandate, evidence packet, and whether advice was conditional unresolved |
| Cement och Betong Institutet | Independent technical consultant commissioned by Banverket | C1 and C2 assessed durability and mentioned toxicity | information production, not approval | C1, C2; S1 p. 45; S2 Bilaga 3 p. 37 | Original reports and distribution lists not retrieved |
| Rhône-Poulenc Sverige AB | Supplier | Product and safety information; workplace instruction | supplier information | S1 pp. 45, 63–65; S2 Bilaga 3 pp. 38–39 | Exact versions/dates of all product sheets and representations unresolved |
| SJ Kemiska Laboratoriet | Banverket-rule review body for previously unused products | C6 reportedly required its examination/opinion; it was not asked before cutoff | potential internal chemical review | S2 Bilaga 3 p. 38 | Rule version, mandatory effect, turnaround, capacity, and decisional consequence unresolved |
| Länsstyrelsen i Skåne län | Water supervision | Monitored water abstraction/discharge; filed suspected water-law offence on 20 February 1997 | supervision, not product approval | S2 pp. 82–83; S1 section 3.8 | Whether and when it knew of Rhoca Gil before cutoff unresolved |
| Båstads kommun, miljö- och hälsoskydd | Local health/environment role | No evidence of Rhoca Gil notice before cutoff; first official account places notice in August | later control, not June decision owner | S1 pp. 46, 58–61 | Pre-cutoff product-specific access not established |
| Yrkesinspektionen | Workplace supervision | January 1997 inspection; later system inspection planned | supervision | S2 Bilaga 6 pp. 12–15 | No evidence of product-specific input before cutoff |

No authority is inferred from a job title. Named individuals listed in later interview appendices are not assigned decision ownership without the underlying delegation and records.

## Decision register

Exactly four analytical events can be retained, but only two are candidate approvals, one is an observation/strategy trigger, and one is a recommendation. Calling all four “decisions” would be inaccurate.

| ID | Neutral title; date | Owner / recommender / implementer | Historical choice and then-practical alternatives | Pre-decision evidence; missing evidence and dependencies | Effect on options | Class; confidence; sources |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | Preserve lining geometry while seeking sealant; unknown day in Jan 1997 | Owner: Banverket organization; recommender and individual authority unresolved; implementer: Skanska | Widen northern sections for possible lining and continue sealant search. Autumn alternatives: current section with increased reinforcement/sealing; combined lining/sealing plus new water application; complete lining | Available: C4 and three evaluated strategies. Missing: January decision record, exact date, signatory, design instruction, cost/schedule/contract analysis. Dependencies: geometry, water judgment, cost, schedule, contract | Preserved lining geometrically while keeping chemical-sealant search open; did not itself select Rhoca Gil | later-official-reconstruction; **bounded**; S1 pp. 44–45 |
| H2 | Order four Rhoca Gil injections; 20 Feb 1997 | Owner/orderer: Banverket organization; supplier/implementer: Skanska; individual recommender unresolved | Four injections. Possible bounds: no order, delayed order, other sealant/lining work, or condition on review; only the four-injection order itself is verified in reconstruction | Available: product information, commissioned durability work; C1 was dated the next day and therefore cannot be assumed available before the order. Missing: C5 full text, quantity/location/test protocol, acceptance criteria, authority, safety/environment review, alternatives memo. Dependencies: supply, technique, water ingress, chemical rule, work safety | Opened experiential use of Rhoca Gil; whether it closed other routes is unproved | contemporary-reported via later official reconstruction; **bounded**; C5; S1 p. 45 |
| H3 | Recommend larger test/use section; 24 Jun 1997 | Recommender: Bergrådet; decision owner: none at this step; implementer prospective | Recommend Rhoca Gil for next 100 m north, described as 200 m total. Other recommendations are not documented and must not be invented | Available: short-section trials, C1/C2, supplier information. Missing: minutes, attendees, test data, criteria, caveats, environmental/occupational review, alternatives considered. Dependencies: trial performance, polymerisation, water, geometry, supply | Created the immediate basis for H4; did not itself authorize execution | later-official-reconstruction; **bounded**; S1 p. 46; S2 Bilaga 3 p. 38 |
| H4 | Follow recommendation for 200-metre section; 26 Jun 1997, time unknown | Joint organizational decision: Banverket and Skanska; recommender: Bergrådet; implementer: Skanska | Follow H3. A bounded continuation or review-first path is conceivable but not proved practically available | Available: H3, short trials, C1/C2, supplier material, reported concern prompting compilation task. Missing: C3 full record, attendance, votes/delegations, exact wording/time, test/use distinction, acceptance gates, contract and resource consequences. Orders of 360 tonnes occurred 26 Jun–3 Jul, so not all were necessarily made before meeting close. | Committed a larger section and procurement while making immediate return to other methods costlier; exact irreversibility unquantified | contemporary-reported via later official reconstruction; **bounded**; C3; S1 p. 46; S2 Bilaga 3 pp. 38–39 |

The 5 December event is H0, a documented observation/contract-performance notice (C4), not a fifth material decision. The January decision is the correct substantive start, but its exact date is unresolved. No important evidenced approval between H2 and H3 was found; trial execution from late March through June is an action/observation stream, not automatically another decision.

## Information cutoff

Provisional cutoff: the close of the Banverket–Skanska construction meeting on 26 June 1997, immediately after the H4 decision and before any later order, observation, notice, or knowledge. Exact clock time and meeting close are unresolved because C3 was not retrieved. C3 itself is dated 30 June, so it is later documentation of the meeting, not proof that the signed text was available at cutoff.

Last permitted information event: information actually presented or available to an identified H4 participant before the meeting closed. First forbidden event: any post-meeting information, including later orders whose time cannot be shown to precede the close. C1/C2 and contemporaneous test/product/water records may be input only after receipt and actor access are proved. S1/S2 may verify history and locate documents but may never supply pre-cutoff knowledge merely because they describe it.

Explicitly forbidden as input: August authority notice, September symptoms/sampling/authority inquiries, 29–30 September findings and stoppage, October public warnings and emergency action, later exposure and health studies, commission judgments, criminal/civil outcomes, restart method, final cost/time, and completion history.

## Hindsight-leakage matrix

| Information object | Known/date | Source | Allowed before cutoff | Later verification only | Irrelevant to bounded model |
| --- | --- | --- | --- | --- | --- |
| Contractual injection failure | meeting participants, 5 Dec 1996 | C4; S1 p. 44 | Yes after distribution proof | No | No |
| Three sealing/lining strategies | discussed autumn 1996 | S1 pp. 44–45 | Yes only when underlying papers/access are retrieved | S1 currently only | No |
| C1 durability/toxicity statements | report dated 21 Feb 1997 | C1; S2 Bilaga 3 p. 37 | Yes for proven recipients after receipt, not for H2 on 20 Feb | Yes for content verification | No |
| C2 final durability report | 22 Apr 1997 | C2; S2 Bilaga 3 p. 37 | Yes for proven recipients | Yes | No |
| Short-trial performance | late Mar–24 Jun 1997 | S1 pp. 45–46 | Only exact logs available to actor | Aggregate reconstruction only | No |
| H3 recommendation | 24 Jun 1997 | S1 p. 46 | Yes for proven H4 participants | Yes | No |
| H4 discussion/decision | 26 Jun 1997 | C3; S1 p. 46 | Meeting content only, at the meeting | Signed 30 Jun record verifies later | No |
| 360-tonne orders | 26 Jun–3 Jul 1997 | S1 p. 46 | Only an order proven before meeting close | Otherwise verification only | No |
| Authority notice of Rhoca Gil | 14 Aug 1997 | S1 p. 46 | No | Yes | No |
| Symptoms, contamination, stoppage | Sep–Oct 1997 | S1 pp. 50–72 | No | Yes, solely to test historical chronology | Outcome detail is irrelevant to CE input |
| Later blame, legal and completion outcomes | post-1997 | S2 and later records | No | No, except source discovery | Yes |

The ingress statement about later environmental knowledge is true only if the future input enforces this matrix and actor-specific receipt dates. It is not enough to use a document dated before cutoff.

## Historical sequence

| Step | Type; date; owner | Available information | Changed room for action | Next dependency |
| --- | --- | --- | --- | --- |
| H0 | Documented observation; 5 Dec 1996; Skanska to Banverket | Contract injection methods reported ineffective | Forced reconsideration but made no selected strategy | Banverket strategy choice |
| H1 | Later-described decision; Jan 1997; Banverket | Three autumn strategies, water/cost/geometry constraints | Preserved lining geometry and continued sealant search | Product selection and bounded trial |
| O1 | Documented intent/workstream; Jan–Feb | Skanska product information; Banverket durability commission | Rhoca Gil became a candidate; knowledge remained incomplete | H2 and C1/C2 |
| H2 | Later-described order; 20 Feb | C1 not yet issued; exact packet unknown | Authorized limited physical use | Test execution and evaluation |
| O2 | Conducted action/observations; late Mar–Jun | C1, later C2, supplier instructions, test experience | Generated technical experience; environmental maturity unresolved | H3 advice |
| H3 | Recommendation; 24 Jun; Bergrådet | Exact advice packet unknown | Proposed scale from short sections to 200 m | H4 authority decision |
| H4 | Later-described joint decision; 26 Jun; Banverket/Skanska | H3 and some technical material; exact consolidated review absent | Authorized larger use/test and increased commitment | Procurement and execution after cutoff |

The table asserts ordering and documented roles, not that any step caused the later accident. “Changed room for action” is an analytical interpretation bounded by the named evidence.

## Alternative sequence

The hypothesized sequence is retained only as a test object, not as a historically available alternative:

| ID | Action / owner | Earliest feasible time | Required material/resources | Contractual and technical possibility | Evidence vs assumption | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Keep H2 to explicitly bounded injections; Banverket/Skanska | 20 Feb 1997 or later | C5 protocol, defined quantity/location, acceptance criteria | Four injections were ordered, so bounded testing occurred; exact stop rule unknown | Evidence: C5/S1. Assumption: enforceable completion gate | bounded |
| A2 | Route product through independent or strengthened chemical/environmental/work review; owner unresolved | After C1, potentially after C2 | C6, SJ lab or equivalent experts, toxicity/polymerisation/environment inputs, time and budget | Institutional route is reported; its mandatory force, turnaround, staffing, and contract effect are not proved. A toxicity addendum was contemplated but not taken up partly because of time constraints | Evidence: S2 Bilaga 3 pp. 37–38. Assumption: timely capacity and authority | unresolved |
| A3 | Explicit readiness decision after review; Banverket/Skanska authority split unresolved | Only after A2 | Signed review, technical trial results, water/legal review, delegated approvers | No contemporaneous readiness-gate procedure or decision form retrieved | modelling-assumption | unresolved |
| A4 | Then either bounded further use or lining/sealing route; owner unresolved | Before or instead of H4 only if A2/A3 fit window | geometry status, lining design, plant/personnel, schedule, water-court application, contract change | H1 preserved lining geometry, but operational lead time, cost, contract and availability at June are unproved | Evidence of option concept: S1 pp. 44–45. Feasibility: modelling-assumption | unresolved |

## Counterfactual feasibility

The proposed “limited test → strengthened review → explicit readiness decision → possible scale-up” sequence meets the no-hindsight rule in concept: toxicity/polymerisation concerns appeared in C1, C2 existed by April, C6 reportedly pre-existed, and lining had been preserved in H1. But concept availability is not practical feasibility.

The following necessary facts are missing: who could impose the gate; whether C6 applied to this procurement and what non-compliance legally/operationally meant; SJ lab capacity and likely turnaround; the proposed toxicity addendum's scope, owner, duration, and rejection record; whether work could remain bounded without violating contract/schedule/water constraints; whether a viable lining/sealing path was resourced in June; and what consequences delay imposed. S2's later statement that following the rule would have prevented massive injection is a retrospective judgment, not proof of every contemporaneous feasibility condition.

Therefore the alternative cannot be called historically available. Rephrasing it as “the model inserts an assumed review gate” would violate the audit's requirement for a defensible historical alternative. This is the decisive D blocker.

## Mechanism mapping

These are domain-independent evidence needs, not engine values:

| Mechanism | Decision/evidence | Option; state before → after | Why CE needs it | Status |
| --- | --- | --- | --- | --- |
| Technical validation | H2–H3; C1/C2 and missing trial logs | Rhoca Gil: candidate → recommended for larger section | Distinguishes evidence generation from commitment | bounded |
| Environmental/occupational review | C1/C2/C6; missing review | review route: conceivable → not evidenced as completed | Needed for A2 readiness gate | unresolved |
| Assurance/readiness gate | missing between H2 and H4 | scale-up: should remain conditional → authorized without evidenced gate | Central alternative ordering mechanism | modelling-assumption |
| Option preservation | H1; S1 pp. 44–45 | lining: geometrically threatened → provisionally preserved | Tracks retained alternative | bounded |
| Commitment | H4 and post-meeting orders | limited trials → larger section/procurement | Tracks narrowing and switching difficulty | bounded, magnitude unresolved |
| Schedule pressure | cost/completion forecasts in S1 pp. 44–45; S2 Bilaga 3 pp. 39–40 | time flexibility unknown → reported pressure | May affect review feasibility | bounded, no fabricated value |
| Approval dependency | H3→H4 | advice pending → joint organizational approval | Separates recommender from decision owner | bounded |
| Shared expert capacity | unaccepted toxicity addendum; S2 Bilaga 3 p. 37 | expertise needed → availability unproved | Central to A2 feasibility | unresolved |
| Information maturity | C1→C2→missing compilation | partial durability/toxicity information → still incomplete | Prevents later knowledge leakage | bounded |
| Implementation pressure | H4/orders | limited work → larger committed work | May make reversal costlier | bounded; no causal outcome claim |

No mechanism is introduced because the later harm is known.

## Profile comparison

The comparison uses the checked-in semantic payloads and M0B fixtures, not profile names. All profiles carry mixed property/finance and transport drivers. Their fixed actions, effects, constraints, curves, propagation and declarations cannot be renamed.

| Profile | Exact/partial matches | Missing or conflicting semantics | Fabrication required | Usable unchanged? |
| --- | --- | --- | --- | --- |
| `legacy-real-estate-v1` | Partial: `phase_project_starts`, `stagger_project_starts`, capital-commitment rigidity can express generic pacing/commitment | No technical validation, chemical/environment review, readiness approval, test acceptance, lining option, or expert-review capacity; refinancing, leverage, liquidity, tenancy and maintenance semantics conflict | Initial driver levels, action equivalences, durations, effects, resource units and constraint meanings | No |
| `legacy-municipal-v1` | Partial: operational capacity and budget pressure; post-hoc dependencies/resources can describe pressure | Supported actions are transport-service measures; no engineering assurance or chemical governance; refinancing disabled does not solve semantic mismatch | Relabelled transit actions, driver states, effects, readiness gate and resource capacities | No; transport connection is irrelevant |
| `legacy-consulting-v1` | Partial: `phase_project_starts`; broad propagation can represent generic accumulated pressure | Same missing assurance/validation/review semantics; financial/property and transit chains are unrelated; extra action admission does not create the needed mechanisms | Action mapping, all state values, effect meaning, review authority and capacity | No |

A case input could be hash-bound mechanically, but no evidence-backed mapping exists to the unchanged declarations/effects. Hashing invented values would make fabrication reproducible, not valid. The minimum future profile-design decision, only after the D blocker is cleared, is whether CE needs a versioned engineering-programme assurance profile with explicit ownership for readiness gates, technical validation, environmental review, option preservation, commitment, expert capacity, approval dependencies, information maturity, units, effects, constraints, curves and provenance. This audit does not design that profile. Such a profile would require the applicable M1C–M1E versioned extension before any equivalence claim.

## Evidence package

A future frozen Path B package must contain, in canonical order:

| Layer | Required contents |
| --- | --- |
| Raw historical evidence | Source register; archived originals; stable locators; retrieval metadata; SHA-256 document fingerprints; exact excerpts; distribution/receipt evidence |
| Normalized historical input | Actor/authority register; four-event decision register; period/date register; cutoff declaration; historical sequence; normalized claims with source IDs |
| Modelling assumptions | Assumption register; uncertainty/conflict register; alternative-sequence feasibility record; sensitivity variants; transformation rules |
| Derived CE input | Mechanism mapping; profile decision; action/driver/dependency/resource/constraint mapping; exact source-and-assumption links for every value |
| Deterministic output | Engine commit and model/profile/calibration identities; canonical case/input/evidence/assumption/mapping hashes; result and observation hashes; deterministic snapshot; Comparator claims only if separately authorized |
| Analyst interpretation | Supported/prohibited wording, option-space interpretation, limitations, skeptical review, publication status |

Hash domains must be separate for documents, evidence ledger, assumptions, normalized case, mapping/profile, execution input, engine identity, raw deterministic result, interpretation, and whole package. Canonical ordering must be explicit; ordered sequences remain order-sensitive while map-like keys use the repository's canonical JSON rules. Provenance is many-to-many and must bind every derived value back to evidence and assumptions. No URL alone is a fingerprint.

## Website transparency contract

No page may be built while this audit concludes D. If later authorized, the minimum page must show: the Swedish ingress; reason for the window; four-event timeline with H0 clearly labelled observation; cutoff marker; historical and alternative lanes; source drawer for every included event; actor/authority uncertainty; assumptions; feasibility status; CE result and profile/model/hash identities; interpretation; limitations; and “what this does not claim.”

Historical facts, later reconstruction, modelling assumptions, deterministic CE output, and analyst interpretation require distinct persistent labels and visual treatments. Every decision link must open the exact document and locator. The cutoff and leakage exclusions must remain adjacent to the comparison. Marketing language may not turn structural-option output into accident prevention, causality, validation, blame, or total-project prediction.

## Supported claims

- Later official reconstructions describe a four-event corridor from a January strategy choice through a 26 June joint decision.
- The 5 December 1996 event is an observation/notice, not the first verified material decision.
- Limited injections preceded a technical recommendation and a larger-section decision.
- The record distinguishes information producer, recommender, organizational orderer/approver, implementer, and supervisor, while individual delegated authority remains unresolved.
- The January choice appears to preserve a lining option; the June choice appears to increase commitment. Exact option count and switching cost are not established.
- A review-gated order is analytically meaningful but not yet proved practically available.
- No existing profile maps the central assurance/review mechanisms without semantic invention.

## Prohibited claims

- That the alternative sequence would have prevented environmental or health damage.
- Exact alternative cost, completion date, legal result, health result, environmental result, or optimal policy.
- Fault, blame, negligence, liability, intent, or individual responsibility.
- That sequence alone caused later events.
- That CE predicts or reproduces the whole Hallandsås project.
- That later commission findings or accident knowledge were available by cutoff.
- That C1 was available for H2 on 20 February, or that every C2 statement reached every H3/H4 actor.
- That the 26 June “test” and later large-scale use are identical in scope.
- That an existing profile is suitable because it is municipal, transport-labelled, consulting, or capital-project adjacent.
- That deterministic hashes prove historical validity, causal validity, M1E inclusion, or runtime readiness.

## Evidence gaps

| Blocking item | Missing evidence / why needed | Sources searched | Minimum correction | Forbidden shortcut |
| --- | --- | --- | --- | --- |
| H1 | Original January decision, exact date, signatory/delegation, design instruction; needed to time and own first material decision | S1, S2, Riksdagen/Regeringen official search | Obtain Banverket project archive record and delegation | Use “January” as exact date or infer authority from title |
| H2 | Complete C5 order, protocol, quantity, acceptance criteria, authority, alternatives; needed to define a genuinely limited test | S1, S2, official web search | Obtain signed order and test plan/logs | Treat “four injections” as a complete readiness gate |
| H3 | 24 June minutes/advice packet, membership, evidence, conditions; needed to separate recommendation from approval | S1, S2, official web search | Obtain Bergrådet record and attachments | Invent pause/review alternatives from hindsight |
| H4/cutoff | C3 full record, exact meeting time/end, attendees, delegations, wording, procurement timing; needed for ownership and leakage-safe cutoff | S1, S2, official web search | Obtain authenticated protocol and order timestamps | Treat the 30 June protocol date as pre-cutoff knowledge or all 26 Jun–3 Jul orders as in-cutoff |
| A2–A4 | C6 exact rule/version, review authority, SJ lab capacity/turnaround, toxicity-addendum record, contract effects, lining resources/lead time; needed for practical feasibility | S2 Bilaga 3 and 6, S1, official web search | Archive dossier proving a gate could be imposed and completed while alternatives remained executable | Infer feasibility from later criticism, rule existence, or later harm |
| Actor access | Distribution/receipt lists for C1/C2/product/test/water material; needed for actor-specific knowledge | S1, S2, report citations | Retrieve cover letters, registers, minutes and distribution lists | Equate document date with universal knowledge |

## Minimal next scope

Perform one archive-only evidence retrieval pass, without modelling or code:

1. Request from Trafikverket/Banverket archives the January 1997 decision/instruction, C5, injection/test logs, 24 June Bergrådet record, C3 with attachments, delegation orders, contract/change-order clauses, and procurement timestamps.
2. Obtain complete C1, C2, their commissions, cover letters and distribution/receipt records.
3. Obtain the 1997-effective C6 and records concerning SJ Kemiska Laboratoriet and the proposed toxicity addendum, including capacity and expected turnaround.
4. Obtain contemporaneous lining design, plant/personnel, cost, lead-time, water-court and contract-change material valid by 26 June.
5. Re-run only the authority, cutoff, and alternative-feasibility gates. If A2–A4 still lack practical support, keep D and do not proceed to profile design.

This is smaller than input design, profile design, fixture creation, execution, or publication. Runtime adoption remains prohibited.

## Final conclusion

**D. BLOCKED — COUNTERFACTUAL SEQUENCE NOT DEFENSIBLE**

Blocking decisions: H1 lacks an exact date and verified delegated owner; H2 lacks its full bounded-test terms; H3 lacks its advice packet; H4 lacks its full meeting record, exact cutoff time, and individual authority. Most decisively, A2–A4 lack evidence that an independent or strengthened review, explicit readiness decision, and subsequent viable choice could be authorized, staffed, completed, and contractually/technically accommodated between February and 26 June 1997.

The official reconstructions establish a strong research corridor, not readiness for historical input design. The minimum correction is the archive dossier named above. It is forbidden to fill the gaps with later outcomes, titles, generic safety expectations, sector labels, default `MODERATE` values, renamed legacy actions, or hash-bound assumptions presented as facts.
