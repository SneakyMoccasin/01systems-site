# Great Western Route Modernisation Historical Evidence Design Audit

Audit date: 2026-09-17

Repository baseline: `e92c05daa15cfcde45bca466ce1d4e9518dba960`

Scope: strict read-only historical-evidence design audit; no historical case, profile, fixture, Golden, input model, execution, runtime adoption, website implementation, staging, commit, push, deployment, or Vercel interaction

## Executive conclusion

**D. BLOCKED — COUNTERFACTUAL SEQUENCE NOT DEFENSIBLE**

The historical corridor can be reduced to four material commitments: the 1 March 2011 decision to resume IEP with a mixed electric/bi-mode fleet and extend electrification to Cardiff; Network Rail's October 2011 factory-train commitment; the 16 July 2012 statutory infrastructure output and Swansea electrification scope; and the Great Western IEP contract deed on 24 July 2012. The last event is verified by the published contract itself.

The proposed alternative is not yet historically defensible. Public contemporaneous material shows partial infrastructure requirements, developing designs, dependencies and a government assurance framework, but not a pre-signature integrated baseline, critical path, readiness criterion, empowered gate owner, review duration, procurement standstill, financing tolerance, or quantified consequences of delaying the deed. Later National Audit Office criticism proves neither that such a gate existed nor that it could have been inserted without losing procurement, finance, delivery or service options. The case therefore stops before historical-input or profile design.

## Scope och claim boundary

This audit asks whether evidence available by the 24 July 2012 Great Western IEP contractual commitment supports a reproducible CE comparison of historical ordering and an integrated requirements/readiness-gated alternative. It does not model the full programme, calculate alternative cost or delivery, decide optimal rail policy, attribute blame, or infer that later overruns and delays were foreseeable.

Repository precontrol passed before this file was created: branch `decision-flow-demo-v1`; local, tracking and actual `origin/decision-flow-demo-v1` HEAD all `e92c05daa15cfcde45bca466ce1d4e9518dba960`; remote `origin`; clean index and working tree. This audit is the only permitted new untracked file.

The internal boundary is unchanged:

- M0B locks canonical JSON/SHA-256 behavior, three executable legacy semantic payloads, six input/Golden pairs and deterministic observations, but does not validate a new historical case (`docs/audits/domain-model-m0b-completion-audit.md`, sections 5–8 and 12).
- M1A assigns domain/calibration semantics to the contract while run input, presentation and persistence remain separate (`docs/audits/domain-model-contract-m1a-ownership-schema-design.md`, sections 3–9).
- M1B–M1C require strict parsing, semantic validation, provenance and separate source, projected-native, compatibility and envelope hash domains; validity is neither trust nor executability (`docs/audits/domain-model-contract-m1b-completion-audit.md`, sections 5–8; `docs/audits/domain-model-contract-m1c-completion-audit.md`, sections 4–10).
- M1D/M1E close fail-closed Comparator A/B and exact attribution only for three profiles and six locked M0B cases. They do not establish GWRM truth, causal validity, a new profile, production trust or runtime adoption (`docs/audits/domain-model-contract-m1d-completion-audit.md`, sections 5–9; `docs/audits/domain-model-contract-m1e-final-equivalence-completion-audit.md`, sections 1, 4–6 and 14–18).
- Path B is a non-production reproducible historical analysis with frozen evidence, assumptions, mapping, hashes and deterministic output. It requires an unchanged semantically fitting profile and does not enter M1E without a separate amendment (`docs/audits/historical-case-post-equivalence-readiness-audit.md`, sections 4 and 7–11).
- The comparative audit's GWRM dates and four decisions were hypotheses. The Hallandsås audit's distinction between original evidence, later reconstruction, actor receipt and assumptions is reused; none of its historical facts is reused (`docs/audits/historical-case-hallandsas-gwrm-comparative-scope-audit.md`, sections 10–17; `docs/audits/historical-case-hallandsas-evidence-design-audit.md`, Source methodology and Information cutoff).

## Source methodology

Research prioritized DfT and Network Rail material dated 2011–2012, the executed IEP contract, the statutory HLOS, the Great Western franchise invitation, then NAO's later integrated reconstruction. Searches also covered HM Treasury/major-project assurance, business cases, programme boards, baselines, critical path, readiness, depots, signalling, stations and service dependencies.

Evidence classes:

- `contemporary-primary`: original document or official reproduction inspected.
- `contemporary-reported`: an official source reports a contemporary record not fully inspected.
- `later-official-reconstruction`: post-cutoff official account used to verify events, not actor knowledge.
- `secondary-orientation`: source discovery only.
- `modelling-assumption`: explicit analytical construction without historical proof.
- `unresolved`: required fact not established.

### Source register

| ID | Document, issuer, date | Stable locator and URL | Class | Pre-cutoff availability and actual access |
| --- | --- | --- | --- | --- |
| P1 | *Intercity Express and rail electrification*, Department for Transport / Secretary of State, 1 Mar 2011 | paras beginning “With permission”; specifically announcement paragraphs on IEP, financial close, Cardiff and Swansea; [GOV.UK](https://www.gov.uk/government/speeches/intercity-express-and-rail-electrification) | contemporary-primary | Public 1 Mar; DfT/Secretary necessarily held announcement content; Network Rail access to the formal remit must be proved separately |
| P2 | *Network Rail Annual Return 2012*, Network Rail, 2012 | printed pp. 140–142, Programme ID 12.00; [PDF](https://www.networkrail.co.uk/wp-content/uploads/2016/11/Network-Rail-Annual-Return-2012.pdf) | contemporary-primary | Published before contract; Network Rail produced it; exact DfT/Agility receipt not proved |
| P3 | *High Level Output Specification 2012: Railways Act 2005 statement*, DfT / Secretary of State, 16 Jul 2012 | statutory statement and illustrative options; [GOV.UK collection](https://www.gov.uk/government/publications/high-level-output-specification-2012) | contemporary-primary | Public 16 Jul; DfT issuer, Network Rail statutory recipient; Agility's exact receipt/use not proved |
| P4 | *Great Western Franchise: Invitation to Tender*, DfT, 2012 | printed pp. 61–62 and 75–76, sections 4.4 and 4.5.2; [PDF](https://assets.publishing.service.gov.uk/media/5a79533be5274a2acd18bde3/invitation-to-tender.pdf) | contemporary-primary | Issued before financial close; DfT and bidders had access; Network Rail source documents are referenced but receipt set is unresolved |
| P5 | *Great Western IEP Network Master Availability and Reliability Agreement*, Secretary of State for Transport and Agility Trains West Ltd, deed dated 24 Jul 2012, public version amended/restated 31 Jan 2014 | cover; pp. 1, 14, 97–100; clauses 2.1–2.4; [PDF](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/355606/great-western-iep-network-master-agreement.pdf) | contemporary-primary for original deed clauses shown; later publication/redaction context | Parties had executed terms; full pre-signature distribution and unamended 2012 text are not public here |
| P6 | *£4.5 billion investment in new trains creates new jobs*, DfT, 25 Jul 2012 | announcement and Notes to editors; [GOV.UK](https://www.gov.uk/government/news/4-5-billion-investment-in-new-trains-creates-new-jobs) | contemporary-primary | Post-signature public confirmation; prohibited as pre-signature input |
| P7 | *Major Projects approval and assurance guidance*, HM Treasury and Cabinet Office, 1 Apr 2011 | overview/details and attached guidance; [GOV.UK](https://www.gov.uk/government/publications/major-projects-approval-and-assurance-guidance) | contemporary-primary | Framework existed before cutoff; no retrieved evidence shows which IEP review occurred, findings, recipients or closure |
| R1 | *Modernising the Great Western railway*, National Audit Office, 9 Nov 2016 | summary paras 1–9; paras 2.2–2.9, printed pp. 19–25; Figures 5–7; [PDF](https://www.nao.org.uk/wp-content/uploads/2016/11/Modernising-the-Great-Western-railway.pdf) | later-official-reconstruction | No; verifies chronology and locates missing records only |
| R2 | *National Infrastructure Plan update 2012*, HM Treasury, Dec 2012 | printed pp. 54 and 56, Great Western Electrification and IEP rows; [PDF](https://assets.publishing.service.gov.uk/media/5a7ce980ed915d7c849adfe3/national_infrastructure_plan_051212.pdf) | later-to-cutoff contemporary report | Post-cutoff; verification only |

Document date never establishes distribution. Claims below name the actor whose access is evidenced or mark access unresolved.

## Case wrapper

Great Western Route Modernisation was not one project. It joined replacement intercity trains with electrification and capability works along routes from London Paddington to west and south-west England and South Wales. Depots, platforms, gauge clearance, traction power, overhead-line equipment, signalling, stations, Crossrail interfaces, service patterns and franchise obligations had to align before new trains entered service. P1, P2 pp. 140–142 and P4 pp. 61–76 are contemporary-primary for the elements known at the time; R1 pp. 6 and 18–25 later reconstruct their integration.

DfT set policy, high-level infrastructure outputs, procured IEP and managed franchise obligations. Network Rail developed and delivered infrastructure. Agility Trains West contracted to design, build, own and maintain trains and associated facilities. Operators would accept/use trains through linked agreements. The sequence matters because infrastructure scope and dates affected the contracted rolling-stock/service plan, while the train contract converted some infrastructure expectations into harder deadlines. The case excludes the whole national investment programme, later replanning, delivered outcomes and all post-cutoff cost evidence.

## Final English ingress

> Great Western Route Modernisation linked new intercity trains with electrification, depots, stations, signalling, infrastructure and service commitments across routes from London to western England and South Wales. This analysis focuses on four commitments from 1 March 2011 to the Great Western train contract deed on 24 July 2012. Its information cutoff is immediately before that deed was executed. CE would compare the documented order with a then-feasible integrated requirements and readiness gate, if such feasibility can be proven. It does not model the whole programme, predict cost or delivery, assign blame, or treat later overruns, delays and replanning as knowledge available at the cutoff.

Word count: 104.

## Actor and authority register

| Actor | Documented role and access | Function | Source | Uncertainty |
| --- | --- | --- | --- | --- |
| Secretary of State for Transport / Department for Transport | Announced policy, set HLOS, led IEP, issued franchise ITT and executed P5 | policy, requirements, procurement, funding sponsorship, contracting | P1; P3; P4; P5 cover and p. 1 | Internal delegations, investment-committee record and exact signatory authentication are redacted/unretrieved |
| Network Rail Infrastructure Limited | Received infrastructure remit; developed capability and electrification works; reported 2011–12 status | infrastructure planning and delivery; technical information producer | P2 pp. 140–142; R1 p. 6 | Exact board approvals, factory-train decision record and pre-signature readiness advice not retrieved |
| Agility Trains West Limited | Contract party appointed train service provider | finance/contract counterparty; train/depot design, build, ownership and maintenance | P5 cover, recitals and clauses 2–3 | Negotiation data room, board approvals, financing conditions and tolerance for delay unavailable |
| Hitachi Rail Europe and John Laing | Consortium constituents; Hitachi manufacturer/maintainer role reported | commercial/technical input and delivery | P1; P6; P5 project-document structure | No basis to assign DfT approval authority to either constituent |
| First Great Western / future Great Western franchisee | Operator requirements and later TARA/RODA obligations; P4 addressed bidders | operator/service input and future acceptance/use | P1 states operator design input; P4 pp. 75–76 | Exact participation, requirements and receipt before each decision unresolved |
| HM Treasury | Funding/approval framework and December progress reporting | potential finance approval and assurance | P7; R2 | Case-specific IEP approval, MPRG/Gateway review, conditions and dates not retrieved; no authority inferred from general framework |
| Office of Rail Regulation | Economic regulator within HLOS/control-period process | review/regulatory settlement, not IEP contract party | P3; R1 pp. 6–8 | Pre-cutoff advice and recipients not retrieved |
| Wales Office / Welsh Government | Consulted on Welsh electrification; Wales Office announced Swansea/Valleys scope | policy consultation and regional input | P1 paras on Welsh consultation; P3 and 16 Jul announcement linked from collection | Exact approval split and business-case access unresolved |

No programme board or assurance body is treated as a decision owner without its contemporaneous terms of reference and decision record.

## Decision register

Four events can honestly represent the corridor, although G2 currently has month-only timing and later-official evidence for the commitment itself.

| ID | Neutral title and date | Owner / recommendation / implementation | Historical selection and evidenced alternatives | Information, missing material and dependencies | Options effect | Class; confidence; sources |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Resume IEP procurement with mixed fleet and extend GW electrification to Cardiff; 1 Mar 2011 | Owner: Secretary of State/DfT; proposer: Agility for mixed fleet; infrastructure implementer: Network Rail | Proceed toward Agility mixed electric/bi-mode proposal and instruct Cardiff extension. Explicit train alternative assessed: all-electric fleet with diesel locomotives beyond wires. Swansea electrification rejected then for lack of viable business case | Available to DfT: proposal, Foster review context, legal/technical/commercial issues, high-level business-case reasoning. Missing: full decision paper, IEP business-case update, assurance/approval records, recipient-specific remit. Dependencies: value for money, EU law, future financial close, electrification, service patterns | Resumed procurement and coupled rolling stock to electrification while preserving bi-mode reach beyond wires | contemporary-primary; **verified** at policy level, not contractual commitment; P1 paras 67–101 |
| G2 | Commit to factory electrification installation train; Oct 2011, exact day unresolved | Owner: Network Rail organization; recommender/board authority and supplier unresolved | Purchase factory train as delivery method. Alternative delivery/staging approaches are not documented in retrieved sources | Available: revised DfT client remit/timescales and developing capability works. Missing: board paper, business case, procurement record, options, capacity and critical path. Dependencies: Series 1 design, access, plant, programme scope | Increased commitment to a delivery method; magnitude and reversibility unresolved | later-official-reconstruction for commitment; contemporaneous P2 for surrounding status; **bounded**; R1 Figure 6 p. 23; P2 pp. 140–142 |
| G3 | Set CP5 outputs including Swansea electrification; 16 Jul 2012 | Owner: Secretary of State/DfT under Railways Act process; funder/settlement actors include government and regulator; implementer: Network Rail | HLOS required expanded electrification/output scope. March 2011 had retained Cardiff–Swansea non-electrified with bi-mode operation, proving narrower scope had previously existed; whether it remained commercially available on 16 July is unresolved | Available publicly: HLOS and illustrative options; pre-existing IEP/electrification work. Missing: final Swansea/Valleys business cases, integrated IEP dependency analysis, funding approvals, Network Rail acceptance and delivery readiness. Dependencies: finance, regulator settlement, Series 1, train mix, depots, services | Expanded infrastructure obligation eight days before contract deed and changed the rolling-stock/infrastructure interface | contemporary-primary; **verified** for statutory output date/scope, bounded for internal authority chain; P3; 16 Jul GOV.UK announcement linked from P3 |
| G4 | Execute Great Western IEP MARA deed; 24 Jul 2012, clock time unresolved | Parties: Secretary of State and Agility Trains West; financing parties in project documents; Network Rail infrastructure dependencies | Execute P5 for Great Western trains/facilities. P1 explicitly made progress conditional on value for money, negotiations and EU compliance; precise pre-signature alternatives/expiry rights are not public | Available: negotiated project documents, financing and technical schedules to parties, HLOS, partial infrastructure development. Missing: 2012 unamended complete contract/data room, updated IEP business case, approval minutes, assurance reviews, conditions-precedent satisfaction record, signature time, integrated baseline/critical path. Dependencies: finance, depots, manufacturer, franchise, Network Rail works, delivery dates | Created immediately binding clauses from Commencement Date and conditioned wider obligations; materially reduced freedom to change train/depot/deadline terms without contractual process | contemporary-primary; **verified** for deed/date and named parties, bounded for full effective moment; P5 cover, pp. 1, 14 and 97–100, clauses 2.1–2.4 |

April 2012 Series 1 development is an implementation action, not a separately evidenced approval. December 2012's early requirements outline is after cutoff and cannot be a fifth historical decision. Three decisions would omit Network Rail's delivery-method commitment; five would elevate an unevidenced implementation step. Four is the least misleading representation, but G2 remains a collection gap.

## Information cutoff

Final decision window: **1 March 2011 through execution of the Great Western IEP MARA deed on 24 July 2012**. December 2012 is removed from the historical-input window and retained only as later verification.

Final information cutoff: **the instant immediately before P5 was executed as a deed on 24 July 2012**. Exact clock time is unresolved. G4 is the terminal historical action observed at the boundary; its selected terms verify what was done, but the executed document and P6 announcement cannot be used as if available to choose G4. Input must be limited to information demonstrably available to the relevant decision actor before signature.

P5 defines Commencement Date as the agreement date and makes specified clauses binding from that date, while most obligations are subject to conditions precedent and an Effective Date. The retrieved public record does not provide a separate timestamp/certificate proving when every condition was satisfied. “Financial close” is officially reported for 24/25 July, but exact intra-day sequencing is unresolved. The first forbidden information event is execution itself for decision input; P6 on 25 July is wholly post-cutoff.

## Hindsight-leakage matrix

| Information object | Date/source | Recipient/access | Pre-cutoff input? | Later verification | Forbidden use |
| --- | --- | --- | --- | --- | --- |
| Mixed-fleet proposal and explicit all-electric/locomotive alternative | 1 Mar 2011, P1 | DfT/Secretary; Agility involvement stated | Yes for those actors | No | Do not infer Network Rail's full access |
| Cardiff electrification instruction and Swansea non-selection | 1 Mar 2011, P1 | DfT; Network Rail formally affected, exact remit receipt missing | Yes after receipt proof | No | Do not treat press statement as full technical remit |
| Revised client remit and IEP infrastructure status | 2011–12, P2 pp. 140–142 | Network Rail producer | Yes for Network Rail | Yes for chronology | Do not assume Agility/DfT received every detail |
| Factory-train commitment | Oct 2011, R1 p. 23 | Network Rail; exact board recipients missing | Only after original record retrieval | Yes | Later NAO statement alone cannot prove cutoff knowledge |
| Series 1 development status | Apr 2012, R1 pp. 21–23 | Network Rail team; distribution unresolved | Only with original record | Yes | Do not import later maturity judgment |
| Great Western franchise ITT dependencies | 2012, P4 pp. 61–76 | DfT and bidders | Yes for named recipients | No | Do not equate bidder data site with all programme actors |
| HLOS/Swansea scope | 16 Jul 2012, P3 | DfT issuer; Network Rail statutory delivery context | Yes after issuance/receipt | No | Do not infer integrated readiness |
| MARA negotiated terms/data room | before 24 Jul, P5 | DfT, Agility and advisers; exact versions/others unresolved | Only version proven received before signature | Executed deed verifies choice | Do not use amended 2014 text as unchanged 2012 input |
| Signed MARA/financial close | 24 Jul, P5; 25 Jul, P6 | Parties at signature; public next day | No for G4 choice | Yes | No hindsight into pre-signature input |
| Early infrastructure requirements outline | Dec 2012, R1 para 2.7 | DfT/Network Rail | No | Yes | Cannot define missing July baseline |
| 2013–16 risks, business case, critical-path criticism, costs, delays, all-bi-mode/replan | R1 pp. 7–29 | later actors | No | Yes, chronology/omission testing only | Cannot justify alternative feasibility or values |

## Historical sequence

| Step | Type, date, owner | Available information | Binding/options before → after | Next dependency |
| --- | --- | --- | --- | --- |
| G1 | Political/programme direction, 1 Mar 2011, DfT | Mixed proposal, explicit alternative, high-level electrification/business-case reasoning | Procurement paused/alternatives compared → Agility route resumed subject to conditions; Cardiff scope instructed | Commercial close and infrastructure remit |
| O1 | Infrastructure planning, Jun 2011, DfT/Network Rail | Revised client remit and train dates | Like-for-like capability work → electric/capacity work and dates | Delivery method/design |
| G2 | Delivery-method commitment, Oct 2011, Network Rail | Exact option paper unknown | Installation approach open → factory train committed | Series 1 and access planning |
| O2 | Technical development, Apr 2012, Network Rail | Need for compliant new electrification system | Technical maturity early → design work underway | Scope/deadline readiness |
| G3 | Statutory output/scope decision, 16 Jul 2012, DfT | HLOS, Welsh discussions/business-case material not retrieved | Cardiff limit/bi-mode flexibility → Swansea and wider output obligation | Contract/interface alignment |
| G4 | Commercial/legal deed, 24 Jul 2012, DfT and Agility West | Negotiated contract, finance, technical schedules; exact integrated readiness packet missing | Negotiation and conditional options → binding commencement provisions and conditioned long-term delivery framework | Effective conditions and implementation |
| V1 | Verification observation, Dec 2012, DfT/Network Rail | Early outline requirements issued | Not historical input | Confirms requirements were still developing |

Chronology and dependency do not establish causality. A public announcement is distinguished from instruction, procurement commitment, statutory output and deed.

## Alternative sequence

The five-step hypothesis is tested, not adopted:

| ID | Action and putative owner | Earliest feasible date | Required evidence/expertise | Procurement, finance, technical and deadline effect | Evidence / assumption | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Joint requirements baseline; DfT sponsor plus Network Rail/Agility/operator contributors | After revised remit, before 16 Jul 2012 | Train, infrastructure, depot, signalling, station, service and franchise requirements; accountable baseline owner | Must fit live procurement and protect tender equality; cost/time unknown | P2/P4 show component requirements; joint baseline is assumption | unresolved |
| A2 | Integrated dependency and critical-path review; owner unresolved | After A1 | Programme planners, engineers, commercial/finance/franchise expertise, dependency schedule | Could expose deadline conflicts; no pre-cutoff duration/capacity or procurement standstill evidence | Later need described by R1; pre-cutoff gate evidence absent | unresolved |
| A3 | Infrastructure/delivery readiness assessment; Network Rail with independent assurance and DfT sponsor | After A2 | Series 1 maturity, surveys, plant, access, consents, depots, power, signalling, quantified schedule risk | May require scope/date changes; financing consequences unknown | P7 shows generic assurance framework only | unresolved |
| A4 | Explicit readiness decision; authority unresolved | Before G3 or G4 | Approved baseline, review findings, value-for-money/business-case update, Treasury/department approvals | Must have power to condition HLOS/contract; no decision right or review criterion retrieved | modelling-assumption | unresolved |
| A5 | Only then additional scope/deadline/contract commitment; DfT and relevant parties | By 24 Jul only if A1–A4 feasible | Negotiated alternatives, finance availability, supplier consent, statutory and service plan | Delay might affect financing, procurement validity, factory/depot/train dates and franchise; magnitude unknown | Historical path did not evidence this gate | unresolved |

## Counterfactual feasibility

The sequence is methodologically plausible but historically unproved. Before cutoff, P1 acknowledged legal, technical and commercial issues and conditional financial close; P2/P4 exposed multiple live dependencies; P7 provided a general assurance framework. None proves that a combined GWRM gate was authorized, staffed or schedulable in the eight days between G3 and G4, or earlier without affecting procurement and finance.

R1 later reports no integrated programme business case until March 2015, only an early requirements outline in December 2012, detailed requirements in August 2014, and no mature integrated critical path. Those are later reconstruction facts. They show the proposed gate would require material not evidenced before signature; they do not prove that postponement was available, costless, lawful or preferred. Missing Agility financing expiry, procurement standstill/variation rights, HM Treasury approval conditions, DfT decision minutes, Network Rail readiness advice and resource/lead-time evidence prevent a practical-feasibility finding.

The D stop condition therefore fires. Recasting the gate as a free modelling assumption would violate the requested historical comparison.

## Mechanism mapping

| Mechanism | Decision/evidence | Option and state before → after | CE need | Status |
| --- | --- | --- | --- | --- |
| Integrated requirements | P2/P4; missing joint baseline | component requirements → still not evidenced as integrated | Defines consistent initiative inputs | unresolved |
| Readiness/assurance gate | P7 generic framework; no case record | possible governance tool → no proven GWRM gate | Central alternative mechanism | unresolved |
| Technical maturity | O2; R1 pp. 21–24 | early Series 1/design → development underway | Bounds feasible dates/resources | bounded, actor access incomplete |
| Contractual commitment | G4/P5 | negotiation → deed/binding commencement clauses | Represents commitment and switching friction | verified, exact effective moment bounded |
| Deadline commitment | G1/G4; P1/P5 schedules | target dates → contract-linked obligations | Tracks loss of schedule flexibility | bounded; do not invent numeric pressure |
| Scope coupling | G1/G3 | Cardiff/mixed fleet → Swansea/output expansion before deed | Links train and infrastructure choices | verified at policy level |
| Dependency visibility | P2/P4 | multiple interfaces known → integrated visibility unproved | Needed for ordering/dependency graph | bounded/unresolved |
| Critical-path maturity | no pre-cutoff artifact; R1 later finding | unknown → unknown | Required for feasible alternative schedule | unresolved |
| Option preservation | P1 explicit train alternative and bi-mode reach | competing fleet concept → selected mixed route with some route flexibility | Tracks real, not invented alternatives | bounded |
| Financing constraint | G4/P5/P6 | negotiation → financial close | May constrain gate timing | verified existence; tolerances unresolved |
| Shared delivery capacity | factory train, designers, access, depots | capacity choices → commitments | Needed for resource conflicts | unresolved quantities/units |
| Implementation pressure | eight-day G3–G4 interval; live procurement | changing scope → imminent close | May narrow review time | bounded chronology, not causal effect |
| Information maturity | P2/P4/R1 | partial requirements → no proven integrated baseline | Protects cutoff and uncertainty | bounded |

No mechanism is added to reproduce later overruns.

## Profile comparison

| Profile | Real/partial matches | Missing/conflicting semantics | Values requiring invention | Usable unchanged? |
| --- | --- | --- | --- | --- |
| `legacy-real-estate-v1` | Partial project phasing, liquidity and capital-commitment rigidity | No requirements baseline, technical maturity, assurance authority, procurement/contract gate, rail dependencies or deadline commitment; property/refinancing/tenancy semantics conflict | Driver levels, action equivalence, effects, resources, dates and constraints | No |
| `legacy-municipal-v1` | Partial operational capacity and budget pressure; transport-labelled actions | Actions model service measures, not train procurement/electrification readiness; no contract/finance/assurance gate or integrated programme semantics | Relabelled transit actions, readiness effects, capacities and dependency weights | No; transport calibration is not semantic fit |
| `legacy-consulting-v1` | Partial phasing and broad implementation-pressure propagation | Financial/property and transit chains conflict; no statutory output, infrastructure maturity, procurement, finance close or readiness approval | Action mapping, states, effects, resources and gate semantics | No |

Hash-binding invented mappings would only make semantic distortion reproducible. If the historical D blocker is cleared, the minimum future design decision is whether a versioned integrated infrastructure-programme profile is required, with explicit owners, units, actions/effects, requirements/readiness states, technical maturity, scope/deadline/contract commitments, financing constraints, dependency visibility, shared capacity, curves, propagation and evidence rules. This audit neither designs nor implements it. A new profile would require the applicable M1C–M1E extension before any equivalence claim; a Path B analysis under an unchanged profile would not.

## Evidence package

| Layer | Future frozen contents |
| --- | --- |
| Raw historical evidence | Source register, archived originals, version/date/recipient metadata, stable locators, SHA-256 document fingerprints, approval/signature/receipt records |
| Normalized historical input | Actor/authority register, four-decision register, final cutoff declaration, period/date register, historical sequence, document-to-claim ledger |
| Modelling assumptions | Alternative-feasibility record, assumption and uncertainty/conflict registers, sensitivity variants, transformation rules |
| Derived CE input | Mechanism map, profile decision, action/driver/dependency/resource/constraint map, exact evidence/assumption links for every value |
| Deterministic output | Engine commit and profile/model/calibration identities, canonical case/input/evidence/assumption/mapping/result hashes, deterministic snapshot |
| Analyst interpretation | Supported/prohibited claims, option-space interpretation, limitations, skeptical review and publication status |

Use separate hash domains for documents, evidence ledger, assumptions, normalized case, cutoff, authority, alternative feasibility, mechanism/profile mapping, execution input, engine identity, raw result, interpretation and whole package. Ordered decisions/sequences remain order-sensitive; map-like keys use the repository canonicalizer. Provenance must be many-to-many. A URL or deterministic hash is not proof of historical validity or receipt.

## Website transparency contract

No case page may be built while conclusion D stands. A later authorized page must show the English ingress, minimum programme background, 1 March 2011–24 July 2012 window, pre-deed cutoff, four included decisions, excluded post-cutoff observations, historical and alternative lanes, source and actor receipt per decision, assumptions, uncertainties, feasibility disposition, CE results, interpretation, limitations, non-claims, and engine/profile/input/evidence/result identities.

Contemporary fact, later reconstruction, modelling assumption, CE output and analyst interpretation require distinct persistent visual and language labels. Each decision must open its exact source/locator. December 2012 requirements, 2013–16 risks, later costs, delays, all-bi-mode changes and replanning must be visibly outside the input lane.

## Supported claims

- P5 verifies that the Great Western MARA deed was dated 24 July 2012, not 25 July.
- The defensible historical window ends at that deed; December 2012 is verification only.
- G1 connected train procurement and electrification while explicitly considering a fleet alternative.
- G3 expanded statutory infrastructure scope eight days before G4.
- G4 created binding commencement provisions and a conditioned long-term contract framework.
- Train, electrification, infrastructure, depot, station, signalling, franchise and service dependencies existed before cutoff, although integrated visibility is not proved.
- A readiness-gated comparison is analytically relevant but not shown practically available.
- No existing profile represents the central mechanisms without semantic invention.

## Prohibited claims

- That the alternative would have avoided cost growth, delay or any particular operational outcome.
- Exact alternative cost, signing date, delivery date, fleet, scope or benefit.
- Optimal rail policy, fault, negligence, blame or liability.
- That a press statement alone constituted the deed or every programme approval.
- That all MARA obligations became fully effective at one proven clock time on 24 July.
- That the December 2012 outline, 2014 detailed requirements, 2015 business case/critical-path work or later problems were known before signature.
- That bi-mode capability made infrastructure scope changes free or operationally equivalent.
- That NAO's later criticism proves a pre-cutoff gate was feasible.
- That `legacy-municipal-v1` fits because it has transport calibration.
- That deterministic output, hashing or M1E proves historical truth, causality, validation or runtime readiness.

## Evidence gaps

| Blocker | Missing evidence and why needed | Sources searched | Minimum correction | Forbidden shortcut |
| --- | --- | --- | --- | --- |
| G1 authority/input | Full 2011 IEP decision paper, updated business case, Foster-response record, approvals and formal Network Rail remit; verifies alternatives, authority and receipt | P1, P2, DfT/GOV.UK and NAO searches | Retrieve DfT file and distribution trail | Treat speech as complete approval pack |
| G2 | Exact factory-train decision date, owner, business case, options and board authority | P2, R1, Network Rail official search | Retrieve Network Rail board/investment/procurement record | Promote NAO month-only chronology to verified authority |
| G3 | Swansea/Valleys business cases, funding and regulator approvals, Network Rail readiness response and integration analysis | P3, 16 Jul releases, P4, R1 | Retrieve HLOS decision/settlement dossier | Infer readiness from statutory output |
| G4/binding point | Original unamended 2012 project documents, signature time, Effective Date/conditions certificate, DfT investment and Treasury approvals, Agility finance-expiry terms | P5, P6, R1, HM Treasury/GOV.UK searches | Obtain authenticated close bible, approvals and timestamped certificates | Equate 25 Jul press release with signing, or assume all conditions from “financial close” |
| Actor knowledge | Versioned distribution/receipt records for requirements, designs, risk, business-case and contract material | P1–P7, R1 | Retrieve data-room index, correspondence and meeting records | Equate publication date with organization-wide knowledge |
| A1–A5 feasibility | Gate owner, criterion, authority, duration, reviewers, integrated baseline/critical path, procurement standstill, financing tolerance, technical resources and deadline consequences | P1–P7, R1–R2, searches for business case/governance/readiness | Archive dossier demonstrating the gate could lawfully and practically precede G3/G4 | Use later NAO critique or generic assurance guidance as feasibility proof |

## Minimal next scope

Perform one archive and disclosure collection pass, without modelling or code:

1. Obtain DfT's 2011 and 2012 IEP business cases, investment-committee/Accounting Officer/HM Treasury approvals, assurance reviews, action closures and decision minutes.
2. Obtain the original 2012 Great Western close bible: unamended MARA and linked schedules, signing timestamp, conditions-precedent/effective-date certificate, finance expiry and variation/termination consequences available before close.
3. Obtain Network Rail's June 2011 remit, October 2011 factory-train approval, April 2012 Series 1 initiation, pre-contract readiness/risk reports, requirement baselines and distribution records.
4. Obtain the HLOS Swansea/Valleys business cases, funding/regulator records and Network Rail response.
5. Re-run only the authority, actor-access, binding-time and A1–A5 feasibility gates. If a practicable gate remains unproved, retain D and stop.

This is smaller than input design, profile design, fixture creation, execution, M1C–M1E amendment or publication. Runtime adoption remains out of scope.

## Final conclusion

**D. BLOCKED — COUNTERFACTUAL SEQUENCE NOT DEFENSIBLE**

Blocking decisions: G2 lacks exact day, owner and original approval; G3 lacks its integrated funding/readiness dossier; G4 lacks the original complete close record, intra-day binding sequence and case-specific approval/assurance chain. Most decisively, A1–A5 lack evidence that an empowered integrated readiness gate could be completed before 24 July while respecting procurement law, Agility financing, technical lead times, Network Rail capacity, HLOS scope and service/franchise deadlines.

The smallest correction is the archive dossier above. It is forbidden to replace it with later criticism, generic programme-management best practice, sector resemblance, assumed unlimited time, renamed legacy actions, fabricated engine values or hash-bound assumptions presented as history.
