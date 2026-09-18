# CE Evidence-Level Architecture Design v1 — Phase 2 Contract Design Checkpoint

Checkpoint date: 2026-09-18

Repository: `/Users/christian/Projects/pulse_engine_clean`

Starting checkpoint: `39c1f3658aef17a7809af5fea12eeb07bc8a0933`

Predecessors:

- [`ce-evidence-level-architecture-checkpoint.md`](./ce-evidence-level-architecture-checkpoint.md), the original provisional evidence-level checkpoint;
- [`ce-evidence-level-architecture-adr-adoption.md`](./ce-evidence-level-architecture-adr-adoption.md), the authoritative revised ADR adoption;
- [`ce-evidence-level-architecture-phase1-design.md`](./ce-evidence-level-architecture-phase1-design.md), the authoritative foundational execution model.

Status: **PHASE 2 COMPLETE — COHERENT WITH BOUNDED CONTRACT QUESTIONS. READY FOR IMPLEMENTATION ARCHITECTURE AND VERIFICATION DESIGN. IMPLEMENTATION NOT AUTHORIZED.**

## 1. Phase 2 verdict and scope

**B. COHERENT WITH BOUNDED CONTRACT QUESTIONS.**

The contract architecture is sufficiently resolved to proceed to Implementation Architecture and Verification Design. The remaining questions concern bounded vocabularies, limits, representation, and serialization. They do not reopen Phase 1 state semantics, execution order, Decision Space scope, or legacy isolation.

Phase 2 defines the conceptual contracts and authority boundaries for:

- Domain Model Contract V2;
- Engine Protocol V2;
- Result/Comparison Protocol V2;
- scenario input; and
- the boundary of a future Valuation Protocol.

No schema, parser, validator, executor, comparator, migration, or runtime adoption is authorized by this checkpoint.

## 2. Authoritative ownership model

| Concept | Authoritative owner | Boundary |
| --- | --- | --- |
| Domain meaning | DMC V2 | No other artifact may redefine it |
| State declaration and value/member universe | DMC V2 | Four Phase 1 state kinds only |
| Unit definitions | Engine Protocol V2 registry | DMC references allowlisted unit IDs |
| Unit selection | DMC V2 | Result-affecting and hash-bound |
| Initial/reference domain state | DMC V2 | Scenario override only where explicitly permitted |
| Transition vocabulary | DMC V2 | Names, source/target meaning, permissions |
| Transition execution | Engine Protocol V2 | Closed typed-intent semantics |
| Batch resolver selection/configuration | DMC V2 | Selects only allowlisted protocol resolvers |
| Batch resolver algorithm | Engine Protocol V2 | No callbacks or domain code |
| Predicate declarations | DMC V2 | Domain rules and references |
| Predicate evaluation | Engine Protocol V2 | Three-valued and stage-aware |
| Action types and effects | DMC V2 | Typed transition-intent templates |
| Initiative types | DMC V2 | Lifecycle, permitted parameters, intrinsic semantics |
| Initiative instances | Scenario input | Concrete occurrence referencing one type |
| Schedules | Scenario input | Validated against protocol and horizon |
| Concrete dependencies | Scenario input | Only allowed dependency semantics |
| Resource definitions and semantics | DMC V2 | Kind, unit, availability and release policy |
| Permitted resource instances and claims | Scenario input | Constrained by DMC declarations |
| Reservations | Engine Protocol V2 result state | Generated from admitted initiatives |
| Eligibility rules | DMC V2 | Intrinsic domain rules and reason IDs |
| Eligibility derivation | Engine Protocol V2 | Next-action algorithm |
| Constraints | DMC V2 | Specialized lifecycle declarations |
| Propagation declarations | DMC V2 | Predicate-to-intent rules |
| Propagation layering | Engine Protocol V2 | Derived topologically, never authored |
| Optional measures | DMC V2 | Named quantitative projections |
| Fixed period lifecycle | Engine Protocol V2 | Phase 1 ten-stage protocol |
| Admission | Engine Protocol V2 | Candidate eligibility and atomic cohort feasibility |
| Decision Space derivation | Engine Protocol V2 | Fixed next-action scope |
| Immutable execution evidence | Result Protocol V2 | Does not recompute execution |
| Typed comparison and policy identity | Comparison Protocol V2 | Separate from execution |
| Mechanical materiality | Comparison Protocol V2 | References DMC rules and thresholds |
| Organizational preference | Future Valuation Protocol | Never execution or eligibility authority |
| Presentation metadata | DMC metadata or external presentation artifact | Excluded from semantic execution hash |
| Trust and authorization | Registry/governance boundary | Separate third validation gate |

No result contract, comparison policy, initiative instance, scenario input, or valuation artifact may redefine domain semantics.

## 3. DMC V2 top-level contract

DMC V2 is a closed, JSON-like, immutable domain-semantics package. Raw collections remain arrays where duplicate detection must occur before canonicalization.

| Section | Required | Semantic purpose | Owned IDs and references | Identity and validation |
| --- | ---: | --- | --- | --- |
| Contract identity | Yes | Domain/profile/model and required protocol versions | Domain ID, profile ID, model version, DMC and Engine version | Exact literals and version compatibility |
| Semantic identity | Yes | Claimed hash and canonicalization policy | Complete semantic payload | Recomputed and verified |
| Metadata | No | Labels and presentation description | May reference semantic IDs for display | Excluded from semantic execution hash |
| Evidence manifest reference | Yes | Identifies evidence supporting semantic claims | Evidence identity/hash | Separate evidence hash domain |
| Calibration declaration | Yes | Contract-level calibration status/version | Evidence/calibration record IDs | Separate evidence identity; parameters remain semantic |
| State declarations | Yes, non-empty | Typed persistent state | State/value/member/transition/resolver/unit IDs | Full kind-specific validation |
| Transition definitions | Yes; empty only for immutable state | Named domain transitions | State/value/evidence IDs | Result-affecting and hash-bound |
| Batch resolver declarations | Yes | Select and configure allowlisted resolvers | State, stage and transition IDs | Complete target/stage coverage |
| Predicate definitions | Yes; may be empty | Reusable bounded domain rules | State, event, measure, resource and lifecycle references | Bounded AST and stage validation |
| Action types | Yes for executable contracts | Domain intervention semantics | Intent templates, predicates and resources | Instance cannot redefine effects |
| Initiative types | Yes | Lifecycle and allowed instance variation | Action, predicate and resource references | Exactly one action binding |
| Resource definitions | Yes; may be empty | Mixed-precision resource semantics | Resource and unit IDs | Kind/unit/release validation |
| Constraint definitions | Yes; may be empty | Explicit lifecycle mechanisms | State, predicate, intent and reason IDs | Lifecycle/stage validation |
| Propagation rules | Yes; may be empty | Acyclic predicate-to-intent relationships | Rule, predicate and target IDs | Derived graph cycle validation |
| Measure definitions | Optional | Quantitative domain projections | Measure, source, unit and threshold IDs | Unit, stage and dependency validation |
| Eligibility rules | Yes | Intrinsic eligibility and canonical reasons | Predicate, constraint, entitlement and reason IDs | Complete for every executable initiative type |
| Comparison defaults | Optional | Suggested observation surface | State, event and measure IDs | Advisory only; cannot affect execution |

DMC V2 contains no callbacks, source code, arbitrary formulas, arbitrary predicate expressions, hidden defaults, implicit units, runtime-dependent values, or unbounded collections. Every result-affecting declaration is included in the domain semantic hash.

## 4. State declaration contracts

Every state declaration shares a common envelope:

- stable state ID;
- state kind;
- domain meaning ID;
- initial/reference value;
- invariants;
- transition vocabulary;
- resolver selection by stage;
- comparison semantics;
- evidence-basis ID;
- calibration status;
- canonicalization rules; and
- missing, invalid and unresolved behavior.

### 4.1 Nominal

Nominal state declares:

- a finite universe of named value IDs;
- allowed directed transitions;
- an optional role such as boolean, lifecycle or authorization;
- authorized `SET` semantics;
- terminal values for lifecycle roles; and
- optional comparison equivalence classes.

Values and transition endpoints are unique and known. Boolean role requires exactly two values. Lifecycle terminal values have no outgoing transition unless the declaration explicitly permits one. Comparison equivalence never makes distinct values interchangeable for execution unless a predicate explicitly invokes that equivalence relation.

### 4.2 Ordinal

Ordinal state declares:

- a finite named value universe;
- an explicit unique total order;
- initial/reference value;
- allowed named transitions;
- explicitly authorized `SET` targets; and
- equality and order comparison semantics.

No numeric anchor is required. Rank and order are unavailable to arithmetic and do not imply interval distance.

### 4.3 Set-valued

Set-valued state declares:

- a closed member universe;
- a canonical initial set;
- permitted `ADD`, `REMOVE` and authorized `SET` operations;
- optional minimum and maximum cardinality; and
- explicit same-member add/remove conflict semantics.

Members are unique, canonicalized, and drawn only from the declared universe.

### 4.4 Quantitative

Quantitative state declares:

- an explicit unit, including explicit dimensionless unit where applicable;
- canonical numeric policy ID;
- minimum and maximum bounds;
- precision/scale;
- allowed arithmetic;
- initial/reference value;
- exact execution equality;
- `DELTA` and `SET` permissions; and
- optional comparison tolerance semantics owned by comparison policy rather than execution.

No implicit conversion is allowed. State representation, evidence basis, calibration status, and uncertainty remain separate concepts.

## 5. Closed transition-intent contract

The Phase 2 intent family is:

- `named-transition`;
- `set-value`;
- `add-member`;
- `remove-member`;
- `quantitative-delta`;
- `quantitative-set`; and
- `no-op`.

Every intent names or derives:

- target state ID;
- transition kind or named transition ID;
- operands;
- source semantic ID;
- source instance or rule ID;
- evidence-basis ID;
- execution stage;
- period; and
- deterministic intent identity.

| Intent | Valid target kinds | Core validation |
| --- | --- | --- |
| Named transition | Any kind where declared | Current value and parameters match a declared transition |
| Set value | Nominal, ordinal and set-valued where authorized | Target value/set declared and `SET` permitted |
| Add member | Set-valued | Member belongs to universe |
| Remove member | Set-valued | Member belongs to universe and removal behavior declared |
| Quantitative delta | Quantitative | Unit exact-match and delta arithmetic permitted |
| Quantitative set | Quantitative | Unit, permission, precision and bounds valid |
| No-op | Any | Reason ID required; state unchanged |

`UNRESOLVED` is not an intent. It is a batch-resolution or execution outcome.

Actions, propagation, constraints, and lifecycle mechanisms use the same intent family but are restricted to their protocol-defined execution stages. No cross-kind coercion exists.

## 6. Closed batch-resolver vocabulary

| Resolver | Supported kinds | Valid intent combinations | Result |
| --- | --- | --- | --- |
| `single-or-conflict-v1` | All | Zero or one effective intent | Singleton applies; multiple intents unresolved |
| `identical-result-v1` | Nominal, ordinal, quantitative `SET` | Intents independently resolve to one identical value | Identical value or unresolved |
| `set-membership-merge-v1` | Set-valued | Adds/removes on distinct members or repeated identical operation | Canonical merged set; same-member opposition unresolved |
| `quantitative-sum-v1` | Quantitative | Unit-compatible deltas only | Exact canonical sum followed by declared bounds behavior |
| `explicit-batch-table-v1` | Nominal, ordinal, optionally set-valued | Bounded canonical multiset of named transition IDs | Table result or unresolved |
| `conflict-on-multiple-v1` | All | Any batch | Singleton applies; multiple effective intents unresolved |

`NO-OP` remains in event provenance but is removed from the effective resolution multiset.

There are no callbacks, generic domain-code resolvers, expressions, or incidental action-order resolvers. Semantic precedence must be expressed through an explicit lifecycle stage, subperiod, or bounded hash-bound batch table. An unmatched conflict becomes unresolved.

## 7. Bounded predicate contract

| Predicate | Operands | Three-valued behavior |
| --- | --- | --- |
| `state-equals` | State ID and valid value | Unknown for unresolved/missing state |
| `state-in` | Nominal/ordinal state and non-empty value set | Unknown for unresolved/missing state |
| `ordinal-relation` | Ordinal state, order operator and value | No arithmetic or distance |
| `transition-occurred` | Transition/event ID and earlier stage | Later-stage reference invalid |
| `state-changed` | State ID and earlier stage interval | Unknown if either boundary unresolved |
| `quantitative-compare` | Quantitative state/measure, operator, same-unit constant | Unit mismatch invalid; unresolved input unknown |
| `execution-history` | Initiative/action/event and temporal relation | Reads committed history only |
| `dependency-satisfied` | Dependency or initiative ID | Reads committed prerequisite lifecycle |
| `resource-known` | Resource ID | True only when required semantics are complete |
| `resource-available` | Resource and requested use | Unknown for unsupported feasibility |
| `resource-capacity-sufficient` | Quantitative resource and claim | Unknown capacity produces unknown |
| `initiative-status` | Initiative ID and lifecycle/status set | Scenario-bound |
| `all` | 1–32 predicates | False if any false; true if all true; otherwise unknown |
| `any` | 1–32 predicates | True if any true; false if all false; otherwise unknown |
| `not` | Exactly one predicate | True/false invert; unknown remains unknown |

Predicate results are `true`, `false`, or `unknown`. Unknown is not false and cannot authorize execution.

Proposed bounds are AST depth 8, at most 32 children per `ALL`/`ANY`, and at most 2,048 predicate nodes per contract. These values are Phase 3-fixable but boundedness itself is final. Duplicate children reject. Commutative child collections canonicalize by semantic identity.

No arbitrary code, arithmetic, expression language, or future-stage inspection is permitted.

## 8. Action type and initiative instance

An **action type** is DMC-owned domain semantics. It owns:

- stable action type ID;
- domain meaning and evidence;
- direct transition-intent templates;
- intrinsic eligibility predicates;
- intrinsic resource-requirement templates; and
- a closed parameter schema where variability is allowed.

An **initiative instance** is a scenario-owned concrete occurrence. It owns:

- stable instance ID;
- action and initiative type references;
- proposed schedule period;
- concrete permitted dependencies;
- concrete resource claims;
- permitted instance-specific eligibility conditions;
- lifecycle instance state where allowed; and
- parameter values admitted by the action schema.

An initiative instance may not redefine action effects, transitions, units, intrinsic predicates, resource semantics, or domain meaning. Multiple instances of one action type remain distinct through instance identity and provenance.

## 9. Dependencies, resources, eligibility and admission

Finish-to-start is a true temporal dependency. Its predecessor must reach the declared completed lifecycle before period-start assessment.

Authorization is a state or entitlement predicate, not an overloaded dependency edge. Mutual exclusion is structural exclusivity or an exclusive resource. Same-cohort incompatibility is an admission rule, not a temporal dependency.

The closed resource kinds are:

- `contention-observation`;
- `exclusive`; and
- `quantitative-capacity`.

| Resource concern | Contract behavior |
| --- | --- |
| Contention observation | Reports concurrent use but cannot prove feasibility or authorize a required start |
| Exclusive resource | At most one conflicting active reservation |
| Quantitative capacity | Explicit unit, known/unknown capacity and exact unit-compatible claims |
| Reservation | Engine-generated persistent claim with claimant, resource, start, release and provenance |
| Unknown capacity | Remains unknown; never represented by a fabricated number |
| Simultaneous claims | Complete candidate cohort evaluated atomically |

Eligibility results are:

- `eligible`;
- `ineligible`;
- `unknown`; or
- `already-terminal`.

Eligibility composes intrinsic action rules, instance rules, dependencies, resources, authorization/entitlements, constraints, and lifecycle. Canonical reasons reference evaluated rule IDs and facts; free-form explanation is not authority.

Admission requires every candidate to be eligible and the complete cohort to be feasible. Organizational preference is prohibited from eligibility and admission.

## 10. Propagation and constraint contracts

Propagation is:

```text
predicate satisfied → emit typed transition intent(s)
```

Each propagation rule declares:

- stable rule ID;
- predicate ID or bounded predicate;
- emitted intent templates;
- semantic source references;
- evidence-basis ID; and
- provenance behavior.

The protocol derives graph edges from predicate reads and intent writes. Rules are topologically layered. Peer writers targeting one state enter the ordinary target batch resolver. A rule reading several states is placed after the latest upstream layer. Direct and hidden indirect cycles reject during semantic validation. Layer is derived, never authored. No inverse, recovery, or deactivation is inferred.

Constraints remain a special declarative construct for stage ownership, discoverability, activation/sustain/deactivation completeness, and eligibility attribution. A constraint declares:

- constraint ID;
- nominal lifecycle-state reference;
- activation predicate;
- sustain predicate where required;
- deactivation predicate where supported;
- emitted transition intents;
- eligibility impact and canonical reasons;
- evidence basis; and
- provenance behavior.

Constraint lifecycle is ordinary nominal state, not a fifth state kind. Constraint writes to ordinary state become visible in the next period unless a later protocol defines another bounded stage.

## 11. Optional measure contract

Measures are optional, quantitative, named, domain-owned projections. Every measure declares:

- stable measure ID;
- explicit unit;
- evaluation stage;
- source states, resources, event counts, set cardinalities, or earlier measures;
- one allowlisted operator;
- range and precision;
- optional named thresholds;
- missing and unresolved behavior;
- evidence/calibration declaration; and
- comparison semantics.

The initial operator set is:

- `identity-v1`;
- `count-v1`;
- `sum-v1` over identical units;
- `difference-v1` over identical units;
- `weighted-sum-v1` with explicit dimensionless weights and compatible output unit;
- `minimum-v1`; and
- `maximum-v1`.

Initially excluded are nonlinear curves, arbitrary formulas, scripts, implicit ordinal scoring, implicit cross-unit arithmetic, and ratios. Ratio semantics require later explicit design.

Measures may be absent. A measure referenced by an execution-required predicate is no longer operationally optional for that contract and must validate as complete.

## 12. Decision Space Result V2

Decision Space Result V2 has literal scope `next-action-eligibility` and contains:

- exact protocol/result version;
- committed period and boundary;
- execution identity;
- domain semantic identity;
- Engine Protocol identity;
- immutable state-snapshot content reference;
- initiative-universe identity;
- exactly one eligibility entry per declared initiative;
- eligibility status;
- canonical reasons;
- dependency, resource, constraint, entitlement, lifecycle and predicate fact references;
- typed unknown and unsupported reasons;
- explicit exclusions and non-claims; and
- complete content hash excluding only its own hash field.

Full state is referenced through immutable content identity rather than duplicated. A standalone export must include the content-addressed snapshot in the same bundle; dangling references reject.

Decision Space may differ when driver states match because it references the full structural snapshot, initiative universe, execution history, reservations, constraints, entitlements, and lifecycle.

## 13. Execution Result V2

The authoritative result envelope contains:

- result version;
- authority status;
- domain, evidence, engine, scenario and execution identities;
- initial snapshot;
- period records for every completed lifecycle stage;
- typed state history;
- transition, propagation, lifecycle, constraint, resource and measure events;
- unresolved conflicts;
- candidate assessment and admission/rejection results;
- resource-reservation history;
- constraint/lifecycle history;
- Decision Space for every committed period;
- optional measure values or typed unavailable results;
- complete provenance;
- terminal record and stop reason; and
- result hash.

Authority statuses are:

- `authoritative-complete`;
- `failed-validation`; and
- `failed-unresolved`.

Only `authoritative-complete` supports a complete authoritative A/B comparison.

## 14. Unresolved-run policy

Architecture V2 adopts: **stop the entire authoritative run immediately**.

When an unresolved conflict occurs:

- the failed period is not committed;
- later stages in that period do not run;
- future periods do not run;
- the last committed state remains the authoritative terminal state;
- the result becomes `failed-unresolved`;
- complete conflict evidence is retained, including batch, resolver, intents, prior state, period and stage;
- partial failed-period work is diagnostic only;
- no Decision Space result is produced for the failed boundary; and
- authoritative A/B comparison beyond the shared committed prefix is unavailable.

Partial continuation is deferred because it would require dependency-slicing semantics that Phase 1 did not authorize and that could conceal downstream coupling.

## 15. Result/Comparison Protocol V2

Mandatory comparison facets are:

- state;
- transitions/events;
- execution/provenance;
- eligibility/dependencies;
- resources;
- constraints/conditions; and
- Decision Space.

Named-measure comparison is conditional and optional.

Comparison outcomes are:

- `equal`;
- `different`;
- `partially-equivalent`;
- `incomparable`; or
- `unknown`.

The comparison contract includes:

- compatibility gate result;
- both execution/result identity references;
- comparison-policy identity;
- period alignment;
- typed facet differences;
- first divergence per facet;
- convergence intervals per facet;
- persistent divergence per facet;
- terminal equivalence per facet;
- rule-backed mechanical materiality;
- optional measure differences;
- typed incomparability reasons;
- provenance; and
- complete comparison-result hash.

There is no universal winner. A comparison policy may narrow observational scope but cannot erase the canonical record of mechanically material differences outside that scope or claim full equivalence when mandatory facets differ.

## 16. Comparison policy contract

A comparison policy is a separately identified, hash-bound artifact. It may select:

- visible state IDs;
- event classes;
- eligibility and dependency detail;
- resource and constraint detail;
- Decision Space views;
- optional measures;
- explicit quantitative tolerances; and
- observational-equivalence scope.

It may control presentation of mechanical materiality but cannot alter the canonical materiality record.

It may not alter execution, reinterpret state kinds, introduce domain effects, change action semantics, change Decision Space, or add organizational preference.

## 17. Evidence and calibration model

The architecture separates:

1. **representation type** — nominal, ordinal, set-valued, or quantitative;
2. **semantic evidence basis** — referenced support/provenance for a semantic claim;
3. **calibration status** — classification of result-affecting parameter calibration; and
4. **uncertainty** — deferred except explicit unknown and unsupported semantics.

The proposed calibration vocabulary is:

- `not-applicable`;
- `uncalibrated`; and
- `calibrated`.

“Structurally reviewed” is governance/evidence status, not calibration. Whether calibration is empirical, expert-elicited, statutory, or synthetic belongs to evidence basis and provenance.

Evidence references are required for result-affecting state meanings, transitions, eligibility and constraint predicates, propagation relationships, quantitative bounds/capacities/deltas/weights/thresholds, explicit precedence, batch-table rows, and measure definitions.

Evidence identity remains separate from mathematical execution identity. Citation formatting alone may change evidence-manifest identity while leaving semantic execution identity stable. A changed semantic parameter must always change semantic identity even when its citation remains unchanged.

## 18. Identity and hash domains

All hashes use canonical, domain-separated inputs whose first component identifies the artifact and version.

| Identity domain | Coverage | Exclusions |
| --- | --- | --- |
| Domain semantic | All DMC result-affecting semantics, IDs, parameters, rules, selected units, resolvers and measures | Presentation metadata and citation formatting |
| Evidence | Canonical evidence manifest, source digests, evidence-basis and calibration records | Execution results |
| Engine protocol | Lifecycle, intent semantics, resolvers, predicate logic, admission, numeric policy, limits and canonicalization | Domain declarations |
| Scenario | Initial overrides, initiative instances, schedules, dependencies, claims and parameters | Execution output |
| Execution | Domain semantic, Engine Protocol and scenario identities | Comparison and valuation; evidence bound separately |
| State snapshot | Complete committed typed and structural state | Presentation |
| Decision Space | Execution, state snapshot, initiative universe, scope, eligibility entries and reasons | Valuation |
| Measure definition | Separately addressable and included in domain semantic identity | Measure output |
| Comparison policy | Selected facets, visibility, tolerance and observational scope | Execution semantics |
| Comparison result | Both result hashes, policy identity and complete comparison content | Valuation |
| Valuation | Valuation rules/objectives and immutable comparison input | Execution and comparison evidence |

Semantic change requires a semantic hash change. Evidence citation formatting alone leaves execution identity stable, although evidence-manifest identity may change. Valuation changes cannot invalidate or modify execution or comparison evidence. Metadata and UI labels are excluded from semantic identity. Caller-supplied hashes are verified, never trusted.

## 19. Validation model

Validation has three separate fail-closed gates.

### 19.1 Parse and structural validation

Reject:

- invalid JSON and duplicate JSON keys;
- accessors, symbols, class instances, sparse arrays and cyclic values;
- unknown fields;
- missing required fields;
- duplicate IDs before canonicalization;
- unsupported discriminants;
- invalid identifiers, versions, hashes or units;
- non-finite or otherwise forbidden numeric representations; and
- payload, depth, collection and numeric-limit violations.

A success result is detached and recursively frozen.

### 19.2 Semantic validation

Reject:

- unresolved references and identity collisions;
- state-kind/operator mismatch;
- invalid initial/reference values;
- invalid or incomplete transition graphs;
- missing resolver coverage;
- invalid explicit batch tables;
- ordinal arithmetic;
- unit mismatch or implicit conversion;
- invalid bounds or precision;
- predicate stage violations;
- unsupported predicate/state combinations;
- propagation self-edges and direct or hidden cycles;
- incomplete action or initiative semantics;
- resource kind, claim or unit mismatch;
- incomplete eligibility semantics;
- measure dependency cycles or stage inversions;
- constraint lifecycle errors;
- hidden semantic change under a reused hash/version; and
- DMC/Engine protocol mismatch.

### 19.3 Trust and authorization validation

Separately verify:

- trusted registry membership;
- issuer and reviewer authorization;
- approved evidence manifest;
- non-reused identity/version;
- permitted calibration status; and
- deployment/runtime allowlisting.

Schema validity alone never grants executability.

## 20. V1/V2 compatibility matrix

| Combination | Default result |
| --- | --- |
| DMC V1 + Engine V1 | Supported current path |
| DMC V1 + Engine V2 | Rejected |
| DMC V2 + Engine V1 | Rejected |
| DMC V2 + Engine V2 | Supported only when exact versions are allowlisted |
| Result V1 compared with Result V1 | Existing V1 semantics |
| Result V2 compared with Result V2 | V2 compatibility gate |
| Result V1 compared with Result V2 | Rejected |
| Saved V1 result loaded in a future V2 UI | Readable only through explicit legacy view/adapter; never relabeled V2 |
| V1 profile projected to V2 | Rejected unless a separately proven and versioned adapter exists |
| V2 profile projected to V1 | Rejected unless a separately proven lossless adapter exists |
| V1 and V2 shown together | May be displayed with protocol labels; no typed comparison without an approved bridge |

No compatibility is inferred from matching IDs, labels, values, or presentation.

## 21. Abstract conformance suite

The required domain-neutral fixture categories are:

- all four state kinds;
- valid and invalid transitions;
- same-period idempotence, merging and conflicts;
- unresolved execution and non-commit behavior;
- true, false and unknown for every predicate family;
- temporal eligibility and late prerequisite;
- exclusive, quantitative, unknown and observational resources;
- individually eligible but jointly infeasible cohorts;
- entitlement consumption and authorized/unauthorized restoration;
- acyclic multi-layer propagation and rejected direct/indirect cycles;
- constraint activation, sustain, deactivation and eligibility impact;
- optional measure absent, valid, threshold-crossing, unresolved and cyclic;
- same state/different Decision Space and different state/same Decision Space;
- equality, difference, partial equivalence, incomparability and unknown comparison;
- comparison-policy visibility and materiality protection;
- valuation independence;
- deterministic replay, detachment and recursive freeze;
- semantic fingerprint sensitivity and metadata/evidence-format neutrality;
- every V1/V2 compatibility rejection; and
- payload limits and hostile structural input.

Each fixture specifies raw contract/scenario, expected structural and semantic validation, execution authority, hashes, stage events, committed snapshots, Decision Space, and comparison result where applicable.

Every positive fixture requires mutation partners for missing and extra fields, duplicate IDs, stale hashes, cross-kind substitution, unit mismatch, stage mutation, semantic-array reordering, map-order neutrality, caller aliasing, output mutation and repeated-run determinism.

No Sundvik or other domain-specific fixture belongs in this suite.

## 22. Bounded Phase 3 contract questions

The remaining questions are:

1. the canonical decimal representation, maximum precision and rounding mode;
2. the initial unit registry and exact no-conversion boundary;
3. hard collection, payload, nesting and numeric limits;
4. the closed evidence-basis classification vocabulary;
5. nominal `SET` authorization granularity;
6. explicit batch-table size and multiplicity limits;
7. the closed eligibility reason-code vocabulary;
8. whether observational contention is permitted in an authoritative contract when no admission depends on it;
9. the scenario parameter-declaration language;
10. the default comparison-visible state policy;
11. failed-period diagnostic serialization; and
12. the trust policy for uncalibrated quantitative declarations.

None reopens Phase 1 architecture.

## 23. Adversarial contract results

| Case | Required behavior | Disposition |
| --- | --- | --- |
| 1. Nominal transition table has a missing edge | Reject if declared action/rule can emit an invalid transition; runtime also fails closed on malformed input | Handled; only syntactic declared completeness is claimed, not full reachability proof |
| 2. Ordinal action has directional evidence only | Retain as descriptive observation only; no executable transition without resulting-state semantics | Handled |
| 3. Quantitative delta uses incompatible unit | Semantic validation rejects before execution | Handled |
| 4. Peer intents conflict without resolver | Missing resolver rejects contract; unmatched valid batch becomes unresolved and stops the run | Handled |
| 5. Predicate references a later lifecycle stage | Stage validation rejects | Handled |
| 6. Propagation predicate reads upstream states in different layers | Rule is placed after the latest upstream layer | Handled |
| 7. Rule graph contains hidden indirect cycle | Derived read/write graph detects and rejects the cycle | Handled |
| 8. Initiative has unknown resource capacity | Eligibility is unknown and authoritative admission is denied | Handled |
| 9. Eligibility predicate lacks evidence or semantics | Semantic/trust validation rejects required executable rule; it cannot evaluate true by default | Handled |
| 10. Constraint and propagation target the same state | Declared stages separate them; constraint ordinary-state write is deferred to next period | Handled |
| 11. Measure depends on unresolved state | Run stops before measure stage; no value is fabricated | Handled |
| 12. Comparison policy hides the only material Decision Space difference | Observational subset may omit it, but canonical materiality remains and full equivalence cannot be claimed | Handled |
| 13. Evidence citation changes but semantics do not | Evidence identity may change; semantic and execution identities remain stable | Handled |
| 14. Semantics change but evidence citation does not | Domain semantic hash changes; reused hash/version rejects | Handled |
| 15. V1 result is compared as V2 | Version and identity gate reject before comparison | Handled |
| 16. Valuation reverses preference | Execution and comparison remain unchanged; only valuation identity/output changes | Handled |
| 17. Run becomes unresolved midway | Failed period does not commit; run stops `failed-unresolved`; prior committed prefix remains authoritative evidence | Handled |
| 18. Incomplete initiative is never scheduled | Decision Space still covers it: status becomes unknown or scenario validation rejects according to structural completeness | Handled; exact reason code remains Phase 3 work |
| 19. Optional measure is absent but constraint references it | Contract is incomplete because the measure is execution-required; semantic validation rejects | Handled |
| 20. Set-valued entitlement is consumed and later re-added | Re-add succeeds only through an explicitly authorized operation/transition; otherwise it rejects | Handled |

No adversarial case revealed a fundamental contract gap.

## 24. Phase 3 — Implementation Architecture and Verification Design

Phase 3 must fix:

- canonical JSON and decimal representation;
- initial unit registry and no-conversion rules;
- exact DMC V2 schema shapes and discriminants;
- Engine Protocol V2 algorithm interfaces;
- exact execution, Decision Space and comparison result envelopes;
- validation issue taxonomy and path rules;
- hard limits;
- eligibility reason codes;
- unresolved failed-period diagnostic serialization;
- hash projections and domain separators;
- trust and authorization seams;
- abstract fixture inventory and expected hashes;
- parser, semantic validator, executor and comparator module boundaries;
- the V1 non-interference plan;
- implementation sequence and stop gates; and
- proof that no V2 module enters the V1 runtime path before an explicit adoption gate.

Phase 3 remains design only. It must not silently become DMC V2, Engine Protocol V2, Result/Comparison Protocol V2, migration, or runtime implementation.

## 25. Current repository and legacy boundary

The current repository remains authoritative evidence for DMC V1 numeric state, action deltas, legacy propagation, constraints, Structural Margin, margin-centered comparison, saved-run behavior, Structural Observation, fingerprints and final-equivalence boundaries.

This Phase 2 design does not alter those artifacts. The legacy path retains:

- DMC V1;
- Engine Protocol V1;
- existing numeric score/delta/materialization semantics;
- current curves and dimensions;
- current propagation and constraints;
- Structural Margin;
- existing A/B comparison;
- existing Structural Observation diagnostic behavior; and
- existing persistence and saved-run compatibility.

## 26. Authorization boundary

This checkpoint records contract architecture only. It does not authorize:

- DMC V2, Engine Protocol V2 or Result/Comparison Protocol V2 implementation;
- schema, type, parser or validator implementation;
- execution or comparison implementation;
- runtime or source changes;
- DMC V1 or Engine Protocol V1 changes;
- profile, test, fixture or Golden changes;
- migration or reinterpretation of legacy results;
- UI or persistence changes;
- Clean MU authoring or execution;
- Sundvik inputs, schedules or execution;
- Test 01A construction or execution; or
- production adoption or deployment.

All executable semantics remain unchanged.
