# CE Evidence-Level Architecture — Revised ADR Adoption

Checkpoint date: 2026-09-18

Repository: `/Users/christian/Projects/pulse_engine_clean`

Starting checkpoint: `576ff11b391645008a86c5b587b0ebb99ea38ce8`

Previous checkpoint: [`ce-evidence-level-architecture-checkpoint.md`](./ce-evidence-level-architecture-checkpoint.md)

Status: **ADOPTED DESIGN DIRECTION; IMPLEMENTATION NOT AUTHORIZED.**

## 1. Decision

The adversarial architecture decision audit reached:

- ADR-1 — Decision Space: **SURVIVES WITH QUALIFICATION**;
- ADR-2 — ordinal minimum: **FAILS**;
- ADR-3 — value separation: **SURVIVES WITH QUALIFICATION**; and
- overall: **ADOPT WITH REVISIONS**.

This checkpoint formally adopts the revised evidence-level architecture direction as the basis for **CE Evidence-Level Architecture Design v1**. It does not adopt an implementation, schema, migration, executable profile, comparison algorithm, persistence format, or UI design.

The adversarial audit found that the direction remains coherent only after narrowing Decision Space, replacing the universal ordinal minimum with typed persistent state, locating polarity at the mechanism-specific boundary, and defining comparison and convergence as typed rather than universally scalar.

## 2. Adopted ADR-1 — Decision Space

**Decision Space is the modeled state plus the derived eligibility/reachability structure relevant to future actions.**

Decision Space is neither synonymous with Structural Margin nor synonymous with an arbitrary structural snapshot.

This decision establishes that:

- state description and option structure are distinct but related;
- resources, dependencies, execution history, lifecycle or entitlement state, constraints, and other structural conditions may affect Decision Space;
- identical driver states do not guarantee identical Decision Space;
- different internal states may be equivalent with respect to future reachable actions;
- current Structural Observation snapshots are evidence about Decision Space, but are not yet a complete executable feasibility or reachability model; and
- Structural Margin or another scalar measure is an optional domain-owned projection only when its semantics and calibration justify the claim it makes.

This checkpoint does not claim that current CE computes the complete future feasible set.

## 3. Adopted ADR-2 — Typed persistent state

The provisional decision that ordinal state is the minimum persistent driver precision is **rejected**.

It is replaced by:

> Persistent modeled state must have domain-owned semantics and deterministic transition rules. Ordinal state is required only when the modeled domain asserts an ordered state relation.

Candidate state kinds may include boolean, nominal, lifecycle, ordinal, set-valued, and quantitative state. The formal design phase must decide the supported set; this checkpoint does not freeze it.

The adopted consequences are:

- directional change alone may describe an event or reaction but is insufficient as a general persistent-state protocol;
- ordinal ranks must not be treated as interval quantities unless interval semantics are separately justified;
- opposing or simultaneous effects require explicit batch and conflict semantics;
- unresolved state may be a legitimate typed result; and
- all transition semantics must be deterministic, versioned, and reproducible.

Ordinal labels do not by themselves define accumulation, cancellation, saturation, activation, or same-period conflict resolution.

## 4. Adopted ADR-3 — Value separation

CE must distinguish:

1. descriptive change or state;
2. mechanism-specific relationship or polarity;
3. activation predicate;
4. optional measure contribution; and
5. organizational valuation.

Polarity is not assumed to be an intrinsic global property of a driver. The same state may enable one mechanism while constraining another.

Therefore:

- descriptive direction belongs to a transition or observed change;
- mechanical effect belongs to a named relationship or target mechanism;
- activation belongs to a predicate;
- measure contribution belongs to a named measure; and
- organizational preference, acceptability, or priority belongs to a separate optional valuation policy or layer.

The CE core must not infer a globally better sequence merely from mechanical effects.

## 5. Adopted comparison principles

Future CE comparison must distinguish typed forms of difference. Candidate comparison classes for formal design include:

- state difference;
- structural difference;
- event or provenance difference;
- lifecycle or constraint difference;
- resource difference;
- eligibility or reachability difference;
- optional named-measure difference; and
- optional valuation difference.

Incomparability and partial equivalence are valid possible results. CE does not require a single total ranking.

Until an explicit valuation policy is present, materiality means declared mechanical or structural significance—for example a state transition, predicate change, constraint transition, resource condition, eligibility change, or event occurrence. It does not mean organizational importance, desirability, or preference.

The canonical typed A/B comparison object and its materiality rules remain design questions.

## 6. Adopted convergence principle

Convergence has no single universal meaning. Formal design must distinguish at least:

- driver or state convergence;
- full structural convergence;
- option or eligibility equivalence;
- named-measure convergence; and
- observational equivalence under a declared comparison protocol.

These forms may disagree. Identical measures do not prove structural convergence, identical driver states do not prove option equivalence, and different internal states may still be observationally equivalent under a declared protocol. This checkpoint does not define the algorithms.

## 7. Method classification

CE is not claimed to be a fundamentally new mathematical species.

The adopted direction is closest to a versioned deterministic, event-sourced discrete-state or discrete-event model with:

- domain-owned semantics;
- explicit evidence precision;
- alternative-sequence execution;
- structural and option comparison;
- reproducible provenance; and
- semantic fingerprints.

CE's potential analytical and product value lies in the disciplined combination of these mechanics, its comparison surface, evidence governance, reproducibility, and domain application. This checkpoint makes no claim of novel state-machine mathematics.

## 8. Current CE mechanics that remain valid

The following verified current or legacy mechanics remain valid within their existing versioned boundaries:

- exact model periods;
- action order;
- scheduled execution;
- persistent execution history;
- deterministic replay;
- stable identities;
- provenance;
- existing dependency observation;
- existing resource observation;
- fail-closed validation;
- fingerprints;
- legacy numeric profile behavior; and
- current calibrated or declared scalar measures within their versioned profiles.

Existing legacy profiles must not be reinterpreted under future typed-state semantics. Their numeric scores, deltas, materialization, curves, propagation, measures, and comparison behavior remain governed by their existing identities and compatibility boundaries unless a separately authorized migration proves otherwise.

Structural Margin is not removed. It remains valid where a versioned domain profile owns and justifies it; it is no longer presumed to define Decision Space for every future domain.

## 9. Current limitations and implementation gap

The current repository establishes important boundaries that formal design must respect:

- Structural Observation is diagnostic, not enforcement;
- `executed-despite-structural-block` demonstrates that current eligibility observation is not a runtime feasibility gate;
- current `DecisionSpaceSnapshot` values describe initiatives, execution, current-start assessments, resource pressure, engine context, and diagnostics, but do not derive the complete future eligibility or reachability set;
- the canonical A/B comparison in `cascadeAnalysisProjection.ts` is margin-centered;
- Domain Model Contract V1 is numeric-score and numeric-delta centered;
- current persistence, result, and presentation surfaces assume legacy numeric comparison; and
- current driver-level global polarity is too coarse for the adopted mechanism-specific direction.

These limitations do not invalidate the existing versioned behavior. They establish why a new design and, if later authorized, new protocol versions would be required rather than silently changing V1 semantics.

## 10. Architectural consequence boundary

The adversarial audit identified likely new-version or semantic-change pressure across DMC schema and protocol, action effects, driver state, transition semantics, propagation, activation predicates, typed A/B comparison, Decision Space snapshots, fingerprints, persistence, and presentation.

This checkpoint records that consequence only at architecture level. It does not choose a DMC V2 schema, transition algebra, propagation algorithm, feasibility algorithm, result shape, fingerprint payload, migration policy, or UI representation.

Constraints and named measures may remain extensible concepts. Optional measures may continue to make quantitative claims where their domain semantics justify them. No measure becomes a global valuation merely by being numeric.

## 11. Clean MU and Test 01A status

Clean MU remains **PAUSED** before:

- numeric calibration;
- curve selection;
- action-magnitude selection;
- margin weighting; and
- executable native contract authoring.

Existing semantic extraction work remains useful, but it must be revisited against the future typed-state protocol before it can support executable semantics.

Sundvik remains frozen before:

- initial-state selection;
- A/B schedule construction; and
- CE execution.

No Cascade Engine Falsification Test 01A output has been inspected.

## 12. Next phase — CE Evidence-Level Architecture Design v1

The formal design phase must resolve:

1. which state kinds are supported;
2. how deterministic transitions are declared for each state kind;
3. how same-period effects compose, conflict, or produce an unresolved result;
4. which transition results are visible to later operations in the same period;
5. how propagation terminates and how cycles are handled;
6. how evidence precision is represented and validated;
7. how activation predicates and categorical or quantitative boundaries are justified;
8. whether Decision Space means full reachability, next-action eligibility, or a declared bounded approximation;
9. how eligibility is derived for future initiatives that are not currently scheduled to start;
10. how dependencies, resources, execution history, lifecycle state, entitlements, and constraints determine option availability;
11. the canonical typed A/B comparison object;
12. the definitions of typed convergence, partial equivalence, and observational equivalence;
13. how mechanical materiality is declared without embedding organizational valuation;
14. how an optional valuation layer consumes comparison results without changing structural execution;
15. how execution, comparison, and valuation identities and fingerprints are separated and bound;
16. how legacy profiles remain isolated, reproducible, and uninterpreted by new state semantics;
17. how saved runs are classified when comparison or state protocols differ; and
18. how UI and presentation represent typed differences, incomparability, and optional valuation without implying an unsupported winner.

No implementation is authorized by this checkpoint.

## 13. Evidence and references

This adoption records the conclusions of the completed adversarial ADR audit, which tested the three provisional decisions against repository evidence, existing DMC V1 architecture and equivalence boundaries, current execution and comparison behavior, Structural Observation, persistence, fingerprints, historical audits, and focused tests.

Primary checked-in references include:

- [`ce-evidence-level-architecture-checkpoint.md`](./ce-evidence-level-architecture-checkpoint.md), the provisional checkpoint and direct predecessor;
- [`domain-model-contract-m1a-ownership-schema-design.md`](./domain-model-contract-m1a-ownership-schema-design.md), the DMC V1 ownership and numeric contract design;
- [`domain-model-contract-readiness-audit.md`](./domain-model-contract-readiness-audit.md), the runtime and migration boundary;
- [`domain-model-contract-m1d-differential-execution-design.md`](./domain-model-contract-m1d-differential-execution-design.md), the native and compatibility execution boundary;
- [`domain-model-contract-m1e-final-equivalence-design.md`](./domain-model-contract-m1e-final-equivalence-design.md) and [`domain-model-contract-m1e-final-equivalence-completion-audit.md`](./domain-model-contract-m1e-final-equivalence-completion-audit.md), the declared legacy equivalence boundary;
- [`illustrative-case-profile-fit-design-audit.md`](./illustrative-case-profile-fit-design-audit.md), the distinction between model output, Structural Observation, and empirical or organizational claims;
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/contractV1.ts`, including numeric scales, action deltas, driver adverse levels, curves, predicates, and named measures;
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateDomainModelContractV1Semantics.ts` and `domainModelContractSemanticIdentityV1.ts`, including current validation and semantic identity;
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`, including the current native `structural-margin` requirement;
- `src/pilotFastighet/analysis/cascadeAnalysisProjection.ts`, whose canonical comparison is margin-centered;
- `src/pilotFastighet/analysis/savedRunPersistence.ts`, whose compatible numeric comparison is a saved margin delta;
- `src/pilotFastighet/analysis/structuralObservation/buildDecisionSpaceSnapshots.ts`, including `executed-despite-structural-block` and the non-scalar snapshot shape;
- `src/pilotFastighet/analysis/structuralObservation/dependencyAssessmentCore.ts` and `resourcePressureCore.ts`, the current diagnostic dependency and quantitative resource observations; and
- Structural Observation contracts, identities, fingerprints, preparation, diagnostics, and focused tests.

## 14. Authorization boundary

This checkpoint adopts a design direction only. It does not authorize:

- runtime or source implementation;
- DMC V2 implementation;
- transition, propagation, comparison, or feasibility implementation;
- profile, fixture, test, or Golden semantic changes;
- migration or reinterpretation of saved results;
- persistence or UI changes;
- removal or modification of legacy margin behavior;
- Clean MU execution or executable contract authoring;
- Sundvik inputs or execution;
- Test 01A schedule construction or execution; or
- deployment or runtime adoption.

Any such work requires a separately scoped and authorized phase after CE Evidence-Level Architecture Design v1.
