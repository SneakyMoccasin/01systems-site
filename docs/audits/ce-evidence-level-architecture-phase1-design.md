# CE Evidence-Level Architecture Design v1 — Phase 1 Checkpoint

Checkpoint date: 2026-09-18

Repository: `/Users/christian/Projects/pulse_engine_clean`

Starting checkpoint: `1afcd29ad978a9ff944a00628c822dd273fe0ddc`

Predecessors:

- [`ce-evidence-level-architecture-checkpoint.md`](./ce-evidence-level-architecture-checkpoint.md), the provisional evidence-level architecture checkpoint;
- [`ce-evidence-level-architecture-adr-adoption.md`](./ce-evidence-level-architecture-adr-adoption.md), the authoritative revised ADR adoption.

Status: **PHASE 1 COMPLETE — COHERENT AND READY FOR CONTRACT-LEVEL ARCHITECTURE DESIGN. IMPLEMENTATION NOT AUTHORIZED.**

## 1. Phase 1 verdict and scope

**A. COHERENT — READY FOR CONTRACT DESIGN.**

Phase 1 establishes the foundational execution model for the new CE evidence-level architecture. A defensible model exists without changing or reinterpreting the legacy protocol.

This checkpoint closes the architecture-level choices for state kinds, typed transitions, same-period composition, within-period visibility, bounded predicates, propagation, Decision Space scope, eligibility and admission, mixed-precision resources, typed comparison, materiality, convergence, measures, valuation separation, evidence precision, and protocol version boundaries.

It does not define implementation schemas or authorize runtime, migration, profile, persistence, presentation, Clean MU, Sundvik, or Test 01A work.

## 2. Closed architecture-v1 state-kind set

The closed architecture-v1 state-kind set is:

1. **nominal**;
2. **ordinal**;
3. **set-valued**; and
4. **quantitative**.

| Kind | Architectural use | Required semantics |
| --- | --- | --- |
| Nominal | Modes, categories, statuses, authorization, and other finite unordered state | Finite named values, equality, initial value, allowed transition graph or table |
| Ordinal | State for which the domain genuinely asserts order | Finite named values, explicit order, initial value, allowed transitions; no implied interval distance |
| Set-valued | Dynamic entitlements, capabilities, memberships, and reservations | Closed member universe, uniqueness, deterministic add/remove/set semantics |
| Quantitative | Capacity, amount, duration, measured exposure, and calibrated numeric mechanisms | Finite numeric domain, explicit unit, bounds, precision and arithmetic policy |

Boolean state is represented as constrained nominal state with exactly two declared values. Lifecycle state is nominal state with a lifecycle role, transition graph, invariants, and any terminal-state semantics. Neither requires an additional value kind.

Ordinal ranks must never be treated as distances. They must not be summed, averaged, subtracted, or otherwise used as interval quantities unless the domain separately declares and justifies a quantitative representation.

Set-valued state is retained because dynamically changing membership cannot always be represented honestly as one nominal value. It supports mechanisms such as entitlement consumption, capability availability, and identified reservation membership without proliferating unrelated boolean state.

Quantitative state always requires an explicit canonical unit. A dimensionless quantity must explicitly declare a dimensionless unit and its domain meaning. An arbitrary unitless score is not a substitute for a unit, evidence basis, or calibrated mechanism.

State representation, evidence basis, calibration status, and uncertainty are separate concepts.

## 3. State declarations and semantic identity

Every state declaration must contain, conceptually:

- a stable state ID;
- its state kind;
- domain meaning;
- allowed values or member universe, or a bounded quantitative domain;
- an initial or reference value;
- invariants;
- transition vocabulary and allowed transitions;
- a batch-resolution policy;
- comparison semantics;
- an evidence-basis reference;
- precision and calibration classification;
- ordering for ordinal state;
- units, range, precision and arithmetic policy for quantitative state;
- canonicalization rules; and
- missing, invalid, and unresolved behavior.

Every result-affecting declaration belongs to semantic identity and hashing. Presentation labels and explanatory copy do not.

## 4. Typed transition model

Actions and rules emit typed transition intents. The foundational forms are:

- named domain transition;
- explicitly authorized `SET`;
- `ADD` or `REMOVE` for set-valued state;
- unit-compatible `DELTA` for quantitative state;
- `NO-OP`; and
- explicit `UNRESOLVED` or conflict outcome.

Named transitions are the default for nominal and ordinal state. Generic operators are available only where the state algebra inherently supports them and their semantics are completely declared.

For every target and execution stage:

```text
prior state
+ complete atomic transition-intent batch
+ declared resolver
→ resolved state + transition provenance

or

→ explicit unresolved conflict
```

An intent identifies its target state, transition kind or named transition ID, operands, source action or rule, period, stage, evidence reference, and instance identity.

`UNRESOLVED` is an execution outcome, not an ordinary value that may be coerced or silently consumed. It preserves the prior value as historical evidence, records every competing intent, and prevents downstream predicates from guessing a result. Invalid transitions fail closed before authoritative execution evidence is produced.

| State kind | Permitted transition foundation | Default batch behavior |
| --- | --- | --- |
| Nominal | Named transition; authorized `SET` | Identical results are idempotent; incompatible results require a declared resolver or become unresolved |
| Ordinal | Named transition; authorized `SET`; explicitly meaningful step transition | No rank arithmetic; the complete intent multiset must be resolved or marked unresolved |
| Set-valued | `ADD`, `REMOVE`, authorized `SET`, named transition | Adds compose by union; removes compose by union; add/remove of the same member conflicts unless explicitly resolved |
| Quantitative | Unit-compatible `DELTA`, authorized `SET`, named transition | Compatible deltas use declared arithmetic; conflicting sets or set-plus-delta require an explicit policy |

## 5. Same-period composition

Same-period effects targeting the same state are resolved atomically from one declared prior state. Incidental action-ID, array, object-insertion, hash, or serialization order must not determine the analytical result.

Canonical ordering exists for:

- identity;
- serialization;
- hashing; and
- provenance.

It does not resolve peer state effects.

Same-period order is semantically meaningful only between declared lifecycle stages, explicit subperiods, or declared domain precedence. If a domain genuinely requires within-period precedence, that precedence must be explicit, hash-bound, auditable, and supported by the domain evidence. Otherwise peer order is prohibited from affecting the result.

## 6. Deterministic period lifecycle

The architecture-v1 period lifecycle is:

| Stage | Name | Result |
| ---: | --- | --- |
| 0 | Period start | Immutable view of prior committed state, lifecycle, reservations, history, and conditions |
| 1 | Candidate assessment | Per-candidate eligibility and proposed-cohort compatibility from period-start evidence |
| 2 | Admission | Authoritative admitted, rejected, or unresolved start decisions |
| 3 | Resource commitment | Atomic reservations for the admitted cohort or an explicit conflict |
| 4 | Direct-effect batching | Complete per-target direct transition-intent batches |
| 5 | Direct transition resolution | Resolved direct state or explicit unresolved target conflict |
| 6 | Propagation | Layered predicate-to-transition evaluation over post-direct state |
| 7 | Conditions and constraints | Constraint and condition lifecycle transitions |
| 8 | Optional measures | Named measure values over the declared final structural stage |
| 9 | Decision Space derivation | Next-action eligibility structure over the end-of-period modeled state |
| 10 | Commit | Immutable end snapshot, events, provenance, and identities |

The visibility rules are:

- starts are assessed from committed period-start state;
- same-period completion does not retroactively authorize an already assessed start;
- resource commitment for an admitted cohort is atomic;
- direct effects resolve atomically before propagation;
- propagation peer-layer writes resolve atomically;
- one propagation layer's resolved state is visible to later layers;
- constraint transitions evaluate after propagation; and
- constraint writes to ordinary modeled state feed the next period unless a future bounded stage explicitly declares otherwise.

## 7. Bounded predicate and activation model

The protocol supports these bounded predicate families:

- state equality, membership, and valid ordinal-relation predicates;
- transition or event occurrence and state-change predicates over a named prior stage;
- unit-compatible quantitative comparisons;
- execution-history predicates;
- prerequisite and dependency predicates;
- resource availability, exclusivity, and capacity predicates;
- initiative and lifecycle predicates; and
- bounded `ALL`, `ANY`, and `NOT` composition.

Arbitrary code, scripts, unrestricted expressions, undeclared arithmetic, and future-stage inspection are prohibited.

Predicates evaluate to:

- `true`;
- `false`; or
- `unknown`.

Unknown is not false and cannot authorize execution. Every predicate must be deterministic, serializable, bounded, hashable, auditable, phase-qualified where necessary, and fail closed for incompatible or unresolved inputs.

## 8. Propagation model

Propagation is a named specialization of:

```text
predicate satisfied → emit typed transition intent
```

It remains distinct because it supplies a declared causal dependency graph, layered evaluation, cascade provenance, source-to-target attribution, and bounded termination semantics.

For architecture V1:

- the propagation graph is acyclic;
- rules are topologically layered;
- peer-layer transition intents are resolved atomically;
- a layer's resolved state is visible to later layers;
- cycles, including indirect state-dependency cycles, reject during validation;
- non-monotone acyclic propagation is permitted because termination is structural;
- each applicable rule is evaluated at its declared layer; and
- no implicit inverse, recovery, or deactivation exists.

Cyclic or fixed-point mixed-type propagation is deferred. A later protocol may admit it only with a formal state algebra, progress rule, termination proof, and deterministic fixed-point selection.

## 9. Decision Space V1

Decision Space V1 adopts **next-action eligibility** as its executable scope.

> Decision Space V1 is the complete modeled state at a declared committed period boundary plus a derived assessment of whether each declared, non-terminal initiative could validly start at the next execution opportunity under the current state, execution history, lifecycle, dependencies, resources and reservations, constraints, authorization or entitlement state, and declared eligibility predicates.

Each initiative receives one canonical status:

- `eligible`;
- `ineligible`;
- `unknown`; or
- `already-terminal`.

Each result includes canonical reasons and referenced predicates.

Decision Space V1 contains:

- period and phase;
- execution and semantic identities;
- complete comparison-visible modeled state;
- initiative lifecycle state;
- dependency completion state;
- active constraints and conditions;
- resource availability and reservations;
- consumed or available entitlements;
- the declared initiative universe;
- per-initiative status and reasons;
- the declared `next-action-eligibility` scope; and
- explicit reachability exclusions.

Decision Space V1 is not bounded-future reachability and is not full reachability. Individual eligibility does not imply that all individually eligible initiatives can start simultaneously. Concrete cohort feasibility is determined atomically during admission.

An ordinary state snapshot is not automatically a Decision Space object because it lacks the declared initiative universe, eligibility derivation, reasons, scope, and exclusions.

## 10. Eligibility, admission, and diagnostics

The architecture separates three concepts:

**Eligibility assessment** is a pure derivation of whether an initiative could validly start at the declared boundary.

**Admission** is the authoritative execution decision for a proposed candidate or cohort.

**Diagnostic observation** is non-enforcing analysis and must not be presented as authoritative admission.

For new authoritative protocol execution:

- an ineligible initiative cannot be admitted;
- an initiative with unknown eligibility cannot be admitted;
- incomplete semantics cannot silently authorize execution;
- resource cohort feasibility is resolved atomically; and
- enforceable admission cannot produce `executed-despite-structural-block`.

A prerequisite must be completed before the period-start assessment boundary. Completion later in the same period may affect the next opportunity, not the already assessed start.

Legacy `executed-despite-structural-block` remains valid legacy diagnostic behavior. It is not reinterpreted under the new protocol and does not change existing execution.

## 11. Mixed-precision resource model

| Resource concern | Architecture-v1 treatment |
| --- | --- |
| Identity or contention | Structural resource identity and declared contention semantics |
| Exclusivity | Structural availability plus holder or reservation identity |
| Quantitative capacity | Unit-bearing quantitative capacity with declared arithmetic |
| Reservation | Persistent identified claim with start, duration or release semantics |
| Exact claim | Unit-compatible quantitative amount |
| Unknown capacity | Explicit unknown result; never fabricated as a number |
| Unsupported reasoning | Explicit unsupported result; cannot authorize execution |
| Simultaneous claims | Atomic cohort-feasibility resolution |
| Release | Declared transition tied to completion, cancellation, expiry, or named event |

Identity-only contention must not be represented by pseudo-capacity. Exact capacity must not be reduced to a boolean when the protocol makes an exact allocation claim.

## 12. Canonical typed A/B comparison

The new comparison contract has these facets:

- state;
- transition and event;
- execution and provenance;
- dependency and eligibility;
- resources;
- constraints and conditions;
- Decision Space option structure; and
- optional named measures.

Comparison outcomes may be:

- `equal`;
- `different`;
- `partially-equivalent`;
- `incomparable`; or
- `unknown`.

Incomparable means that no declared ordering exists. It does not mean the values cannot be distinguished.

The comparison object carries compatible execution identities, comparison-policy identity, scope, period alignment, typed facet results, incomparability reasons, and deterministic provenance. It supports, per facet and declared policy:

- first divergence;
- convergence episodes;
- persistent divergence; and
- terminal equivalence.

There is no universal winner field. No cross-type arithmetic or implicit utility score is permitted.

## 13. Mechanical materiality

A difference may be mechanically material when it:

- changes an initiative's eligibility status;
- changes a blocking or enabling reason;
- activates or deactivates a predicate;
- changes lifecycle or constraint state;
- changes resource feasibility, reservation, or exclusivity;
- adds or removes a next-action option;
- creates an unresolved conflict;
- creates persistent comparison-visible divergence;
- crosses an explicitly declared named-measure threshold; or
- changes execution admission, rejection, completion, or provenance where the comparison policy declares that event observable.

Raw state differences remain reportable but are not automatically material. Magnitude alone is not materiality unless a quantitative state or measure declares a threshold, tolerance, or domain interpretation that gives the magnitude that meaning.

Every mechanically material classification must cite the rule that produced it. Mechanical materiality does not imply organizational importance, desirability, or preference.

## 14. Typed convergence and equivalence

The first-class concepts are:

- state equality;
- structural equality;
- execution-history equality;
- option or eligibility equivalence;
- resource equivalence;
- named-measure equality; and
- observational equivalence under a named comparison policy.

There is no universal convergence flag.

States may differ while Decision Space is option-equivalent when they produce the same next-action eligibility statuses and reasons. States may match while Decision Space differs because execution history, consumed entitlements, reservations, constraints, or initiative lifecycle differs.

Identical measure values do not prove structural equality. Identical driver state does not prove Decision Space equivalence. Terminal equivalence is always facet- and policy-qualified.

## 15. Optional measure boundary

Measures are optional, named, domain-owned projections. A measure may declare:

- sources and evaluation stage;
- units;
- formula or operator;
- range and precision;
- thresholds;
- evidence and calibration basis;
- missing or unresolved-input behavior; and
- comparison semantics.

A measure may participate in a predicate or constraint only through an explicit hash-bound declaration, at a stage where the measure is available, with compatible source semantics and units. Missing or unresolved inputs cannot silently become neutral values.

Measures do not:

- define Decision Space;
- redefine underlying structural execution;
- automatically rank scenarios;
- create organizational preference; or
- become mandatory for structural execution unless an explicit declared execution predicate requires them.

## 16. Valuation boundary

A future valuation layer may consume immutable typed comparison results and optional named measures together with explicitly declared organizational objectives, priorities, thresholds, or acceptability rules.

Valuation identity remains separate from:

- domain execution identity;
- engine protocol identity;
- scenario identity; and
- comparison-policy identity.

Changing valuation may change a ranking or acceptability result. It must not alter transitions, execution history, Decision Space, resources, eligibility, propagation, constraints, measures, comparison evidence, or provenance.

## 17. Protocol and compatibility boundary

The architecture requires separate new versions:

- **DMC V2**, for typed state, transitions, relationships, predicates, initiatives, resources, eligibility, and optional measures;
- **Engine Protocol V2**, for batching, lifecycle stages, propagation, conflict outcomes, admission, and Decision Space derivation; and
- **Result/Comparison Protocol V2**, for typed trajectories, Decision Space, unresolved results, and facet comparison.

The preserved legacy path remains:

- DMC V1;
- Engine Protocol V1 and its compatibility envelope;
- numeric scores and deltas;
- materialization bands, curves, and dimensions;
- Structural Margin and existing comparison semantics; and
- existing saved-run behavior.

There is no silent reinterpretation or inferred compatibility between V1 and V2. A DMC V1 profile cannot be loaded under Engine Protocol V2 by inference. A DMC V2 profile cannot be projected into V1 numeric semantics without a separately authorized and proven adapter. Migration is outside Phase 1.

## 18. Evidence precision

The architecture separates:

**Representation type** identifies whether state is nominal, ordinal, set-valued, or quantitative.

**Evidence basis** references the support and provenance for the semantic declaration.

**Calibration status** is a separately declared classification for whether and how a mechanism has been calibrated.

**Uncertainty** is deferred from architecture V1 except for explicit unknown and unsupported semantics. Architecture V1 does not invent probabilities, confidence intervals, or fuzzy state.

State type must not be confused with evidence confidence. Quantitative representation does not prove empirical calibration, and nominal or ordinal representation does not imply weak evidence.

## 19. Formal design invariants

Any implementation of this architecture must satisfy all of the following:

1. The same verified semantic contract, protocol, scenario, and initial state produce identical execution and comparison output.
2. No state kind is implicitly coerced into another.
3. Boolean and lifecycle roles remain nominal semantics, and their role-specific invariants are enforced.
4. Ordinal ranks never participate in interval arithmetic.
5. Quantitative state always has an explicit unit, and unit-incompatible operations reject.
6. Dimensionless quantitative state explicitly declares its unit and domain meaning.
7. Same-period peer intent order cannot affect state results.
8. Canonical ordering affects serialization, hashing, identity, and provenance only.
9. Unsupported or incomplete transitions fail closed.
10. Unresolved conflicts never silently choose a value.
11. Predicates over unknown or unresolved inputs cannot authorize execution.
12. Propagation V1 is acyclic and terminates by construction.
13. Propagation writes become visible only at declared layer boundaries.
14. Next-action eligibility uses one declared committed boundary.
15. Same-period completion cannot retroactively authorize an already assessed start.
16. Enforceable admission cannot produce `executed-despite-structural-block`.
17. Diagnostic observations and enforceable eligibility are distinct artifacts.
18. Unknown capacity is never converted into pseudo-numeric capacity.
19. Individual eligibility does not imply simultaneous cohort feasibility.
20. Optional measure absence cannot invalidate structural execution unless an explicitly declared execution predicate requires that measure; in that case the contract is incomplete or the predicate evaluates unknown.
21. Measures do not imply organizational preference.
22. Valuation cannot alter execution or comparison evidence.
23. Comparison cannot mutate or reinterpret either scenario.
24. Comparison and valuation identities remain separate from execution identity.
25. Legacy semantic identity remains isolated.
26. Legacy profiles are never reinterpreted under typed-state semantics.
27. Decision Space claims never exceed the declared next-action scope.
28. Full or bounded-future reachability is not inferred from next-action eligibility.
29. Every mechanically material result cites the rule that made it material.
30. Every result-affecting declaration is included in semantic identity.

## 20. Bounded open contract-design questions

The following questions remain for contract-level design. They are not foundational blockers:

1. the exact canonical vocabulary for nominal lifecycle roles;
2. whether nominal `SET` is generally available or individually authorized;
3. the smallest closed quantitative unit and conversion vocabulary;
4. exact numeric representation and tolerance policy;
5. the default resolution of set-member add/remove conflict;
6. canonical predicate-tree depth, size, and composition limits;
7. the closed eligibility reason-code taxonomy;
8. whether comparison-visible state is opt-in or all semantic state by default;
9. the representation of individually eligible initiatives that compete only as a proposed cohort;
10. whether an unresolved target stops the entire scenario or permits unrelated branches to continue in a non-authoritative result;
11. the exact evidence-basis and calibration-status vocabulary; and
12. hash-domain separation among execution, Decision Space, comparison, and valuation artifacts.

## 21. Adversarial design results

| Case | Architecture-v1 disposition |
| --- | --- |
| Two simultaneous opposite ordinal transitions | The complete batch enters the declared ordinal resolver. No rank arithmetic is permitted. The resolver returns a state or an explicit unresolved conflict. |
| Nominal state receives incompatible transitions | Identical targets are idempotent. Distinct targets require a declared resolver or become unresolved. |
| Quantitative and nominal effects target the same state | Rejected as a state-kind/operator mismatch. |
| Prerequisite is satisfied after the scheduled start | The start remains ineligible because assessment uses committed period-start history. Later satisfaction may affect a later opportunity only. |
| Resource capacity is unknown | Eligibility is unknown, no capacity is fabricated, and authoritative admission is denied. |
| Scenarios have identical driver state but different consumed entitlement | Set-valued entitlement or structural history differs, so Decision Space may differ despite equal driver state. |
| Scenarios have different state but identical next-action eligibility | State comparison reports the difference while the Decision Space facet reports option equivalence. |
| Propagation cycle exists | Contract validation rejects the graph in architecture V1. |
| Optional measure is missing | Structural execution continues unless an explicit required execution predicate references it; measure comparison reports it unavailable. |
| Valuation policy is reversed | Execution, Decision Space, and typed comparison evidence remain unchanged; only separately identified valuation output may change. |
| Action has evidence for direction but not resulting state | It may be retained as a descriptive observation but cannot serve as an executable persistent-state transition. |
| Future initiative has incomplete eligibility semantics | Status is unknown with a canonical incomplete-semantics reason; it cannot be admitted or claimed as reachable. |

The adversarial cases expose no foundational contradiction. The remaining questions concern bounded schema vocabulary, validation, identity separation, and failure granularity.

## 22. Phase 2 — Contract-Level Architecture Design

Phase 2 must design:

1. the DMC V2 conceptual schema and ownership matrix;
2. declarations for the four closed state kinds;
3. transition intents and batch resolvers;
4. the bounded predicate schema and validation rules;
5. initiatives, dependencies, entitlements, resources, reservations, and eligibility;
6. the acyclic propagation schema;
7. constraint and lifecycle declarations;
8. optional measures;
9. the Decision Space result contract;
10. execution/result and A/B comparison contracts;
11. execution, Decision Space, comparison, and valuation identity/hash domains;
12. fail-closed structural and semantic validation;
13. the explicit V1/V2 compatibility matrix;
14. abstract conformance fixtures for every state kind, conflict class, predicate family, and adversarial case; and
15. unresolved-run granularity.

Phase 2 remains architecture design. No implementation is authorized by this checkpoint.

## 23. Repository evidence and current boundary

Phase 1 was derived from the adopted ADRs and checked against current scheduled execution, engine lifecycle, numeric DMC V1, margin-centered comparison, Structural Observation, dependency and resource assessment, fingerprints, saved-run compatibility, and relevant file history.

The current repository remains authoritative evidence that:

- scheduled actions are batched as numeric driver deltas before the legacy engine step;
- current engine state, propagation, constraints, dimensions, and Structural Margin are numerically coupled;
- current canonical comparison is margin-centered;
- current Structural Observation is diagnostic and can record `executed-despite-structural-block`;
- resource observation currently supports explicit numeric capacities and claims;
- DMC V1 is numeric-score and delta centered; and
- legacy identities and equivalence evidence protect the existing path.

Those facts motivate the version boundary. They are not modified by this design.

## 24. Authorization boundary

This checkpoint records architecture only. It does not authorize:

- DMC V2 implementation;
- Engine Protocol V2 implementation;
- Result/Comparison Protocol V2 implementation;
- runtime or source changes;
- profile, test, fixture, or Golden changes;
- migration or reinterpretation of legacy results;
- persistence or UI changes;
- Clean MU contract authoring or execution;
- Sundvik inputs, schedules, or execution;
- Test 01A schedule construction or execution; or
- deployment or production adoption.

The legacy numeric, delta, curve, propagation, Structural Margin, comparison, persistence, and saved-run semantics remain unchanged and preserved behind their existing versioned boundary.
