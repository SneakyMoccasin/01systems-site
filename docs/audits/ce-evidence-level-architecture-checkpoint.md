# CE Evidence-Level Architecture Checkpoint

Checkpoint date: 2026-09-18

Repository: `/Users/christian/Projects/pulse_engine_clean`

Source audit: **Directional / Ordinal CE Feasibility Audit** (completed read-only architecture audit; no implementation or contract adoption)

Status: **documentation checkpoint only**. No decision in this document changes runtime, Domain Model Contract V1, an executable profile, tests, Goldens, or an existing verification boundary.

## 1. Final feasibility verdict

**D. HYBRID CORE REQUIRED.**

- Direction-only semantics are insufficient for Cascade Engine's driver-state analytical core. They preserve reaction descriptions, event order, and provenance, but cannot by themselves resolve persistent state, accumulation, cancellation, convergence, or state-dependent activation.
- Persistent bounded ordinal state, combined with explicit transition and activation semantics, is sufficient for meaningful temporal sequence behavior without requiring interval-scale driver magnitudes.
- Quantitative precision remains required only for mechanisms that make quantitative claims, such as exact resource over-allocation, scalar weighted measures, or constraints with measured numeric thresholds.
- Different CE mechanisms may therefore legitimately operate at different evidence and precision levels.

This verdict does not adopt a new architecture. It records the feasibility conclusion that must be tested by the next architecture decision audit.

## 2. Provisional architecture decisions to audit next

### ADR-1 — Decision Space is structural state

**Status: PROVISIONAL / NOT YET ADOPTED.**

Decision Space should be treated as the modeled structural state that conditions which future actions remain open, constrained, exposed, or changed by prior decisions. It should not be treated as synonymous with a scalar Structural Margin.

A scalar measure may be an optional, domain-owned projection of Decision Space. It is not necessarily Decision Space itself and should not automatically become a global ranking of alternative sequences.

### ADR-2 — Ordinal minimum for persistent driver state

**Status: PROVISIONAL / NOT YET ADOPTED.**

The minimum persistent driver-state precision for CE should be ordinal.

- Directional relations may describe which factors react and in which direction.
- Bounded ordinal state may support persistence, explicit transitions, activation, divergence, convergence, and path dependence without claiming equal distances between levels.
- Quantitative values may be used where evidence supports them.
- Different mechanisms may legitimately use different precision levels within the same domain profile or analysis.

### ADR-3 — Separate direction, polarity, and valuation

**Status: PROVISIONAL / NOT YET ADOPTED.**

CE should separate:

1. **Descriptive change direction:** a factor increased or decreased.
2. **Mechanism-specific polarity:** the changed state is adverse or beneficial for a named mechanism.
3. **Organizational valuation:** the outcome or sequence is good, bad, acceptable, or preferred by an organization.

Organizational preference or ranking should not be inferred by the CE core merely from mechanical polarity. For example, increased budget pressure may reduce implementation headroom while remaining acceptable because of benefits outside that mechanism.

## 3. Minimum viable analytical core found by the audit

The audit found that CE requires the following minimum semantic capabilities to remain a genuine temporal and structural sequence engine:

- stable semantic identities for actions, drivers, initiatives, resources, conditions, and protocol elements;
- exact discrete model periods and execution order;
- finite, domain-owned driver states;
- explicit action-transition semantics;
- persistent state across periods;
- deterministic same-period effect and conflict resolution;
- explicit activation semantics;
- deterministic propagation with reproducible event provenance;
- boolean temporal dependencies;
- mixed-precision resource handling, including structural contention and exact capacity only where justified;
- A/B comparison over structural and driver-state vectors rather than requiring a single scalar difference;
- optional domain-owned measures and a separate valuation layer;
- semantic fingerprints that include protocol identity and evidence/precision semantics.

Quantitative driver magnitudes are not part of this minimum unless the mechanism makes a quantitative claim.

## 4. Activation finding

Ordinal activation is not automatically valid.

Named state regimes, crossings between regimes, and structural predicates require independent justification. They may be defensible when they correspond to a predeclared and observable operational distinction, a documented rule, or an explicitly justified expert classification.

Replacing an unsupported numeric threshold with an arbitrary `HIGH` label is not acceptable. That merely relocates calibration into a categorical boundary. Activation semantics must be justified independently of the scenario output and must not be chosen to create desired A/B separation.

## 5. Accumulation and cancellation finding

Direction alone cannot resolve accumulation or cancellation.

Given `A -> X increases`, `B -> X increases`, and `C -> X decreases`, direction-only semantics can preserve the signed event history but cannot determine the resulting state of `X`.

The minimum non-interval solution is a bounded ordinal state machine with:

- explicit transition semantics;
- bounded state behavior;
- a deterministic same-period conflict or batch-resolution rule;
- no assumption that adjacent ordinal levels are equally distant.

At ordinal precision, CE must not encode `up + up + down` as numeric net `+1`. Legitimate resolution requires an explicit transition algebra, a complete domain transition table, a declared semantic ordering rule, or an unresolved-conflict result.

## 6. Static-graph differentiation

CE clearly exceeds static graph traversal only when exact time and order are combined with:

- persistent state;
- explicit state transitions;
- state- or structure-dependent activation;
- alternative-sequence execution;
- deterministic same-period resolution; and
- reproducible provenance.

Direction-only edges with timestamps remain useful as a temporal event graph, but they do not constitute the minimum driver-state analytical core. Persistent ordinal state makes it possible for prior decisions to change the conditions encountered by later decisions, for paths to diverge or converge, and for the same action set to produce different structural histories when ordered differently.

## 7. Current implementation gap

Current DMC V1 and runtime behavior are not ordinal-pure:

- action effects are numeric deltas;
- driver scores, ranges, anchors, and materialization bands are numeric;
- current curve, dimension, and aggregation mechanics require numeric values;
- the current native differential executor expects a specifically named `structural-margin` measure even though the DMC V1 schema and semantic validator permit an empty measure set;
- canonical A/B divergence and terminal comparison are margin-centered;
- production engine state, result projections, saved-run comparison, Structural Observation preparation context, presentation, and equivalence surfaces assume a numeric margin.

These are current implementation and compatibility boundaries. They do not establish that uncalibrated numeric driver magnitudes or a scalar margin are analytically necessary for every future domain.

Therefore Clean MU must not be forced into the current numeric shapes by inventing action magnitudes, curve amplitudes, dimension weights, thresholds, or margin calibration.

## 8. Clean MU status

- Clean MU semantic extraction is **PAUSED** before curve selection, action-magnitude selection, margin weighting, or executable contract authoring.
- Existing driver-semantic work is not discarded. Repository-supported meanings, directionality findings, semantic risks, and exclusions remain inputs to later work.
- Sundvik remains frozen before initial-state selection, A/B schedule construction, or any CE execution.
- No Cascade Engine Falsification Test 01A output has been inspected.

This checkpoint does not authorize Clean MU implementation or case execution.

## 9. Next step

The next work item is an **adversarial Architecture Decision Audit of ADR-1, ADR-2, and ADR-3** before any implementation design.

That audit must attempt to falsify the three provisional decisions, identify their compatibility and migration consequences, and determine whether they should be adopted, rejected, narrowed, or replaced. No implementation design is authorized by this checkpoint.

## 10. Evidence and repository references

The completed **Directional / Ordinal CE Feasibility Audit** is the direct source for this checkpoint. Relevant checked-in evidence includes:

- [`domain-model-contract-m1a-ownership-schema-design.md`](./domain-model-contract-m1a-ownership-schema-design.md), including the DMC V1 scale, driver, action, propagation, constraint, and named-measure model;
- [`domain-model-contract-readiness-audit.md`](./domain-model-contract-readiness-audit.md), including the current numeric and margin-centered runtime boundaries;
- [`domain-model-contract-m1d-differential-execution-design.md`](./domain-model-contract-m1d-differential-execution-design.md), including native execution and comparison boundaries;
- [`domain-model-contract-m1e-final-equivalence-design.md`](./domain-model-contract-m1e-final-equivalence-design.md), including the legacy-equivalence boundary;
- [`illustrative-case-profile-fit-design-audit.md`](./illustrative-case-profile-fit-design-audit.md), including the distinction between modeled outputs, Structural Observation, and empirical claims;
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/contractV1.ts`, the current DMC V1 type surface;
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseDomainModelContractV1Structure.ts` and `validateDomainModelContractV1Semantics.ts`, which permit an empty named-measure collection while retaining numeric scale/action structures;
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`, whose current native executor requires `structural-margin`;
- `src/pilotFastighet/analysis/cascadeAnalysisProjection.ts`, whose canonical A/B comparison is margin-centered;
- `src/pilotFastighet/analysis/structuralObservation/buildDecisionSpaceSnapshots.ts`, `dependencyAssessmentCore.ts`, and `resourcePressureCore.ts`, which establish Decision Space snapshots, boolean temporal dependencies, and quantitative resource-pressure observation;
- `src/pilotFastighet/analysis/structuralObservation/prepareStructuralObservationRun.ts`, which currently includes Structural Margin as engine context; and
- `src/pilotFastighet/analysis/structuralObservation/observeCompletedInitiativeStructuralAnalysis.test.ts`, which explicitly verifies that Decision Space has no numerical `decisionSpaceScore`.

## 11. Checkpoint boundary

This document records architecture findings only. It does not:

- adopt ADR-1, ADR-2, or ADR-3;
- redesign or amend DMC V1;
- define a new execution protocol or transition algebra;
- change legacy profile behavior or equivalence commitments;
- specify or implement Clean MU;
- define Sundvik inputs or schedules;
- execute a CE scenario; or
- assert empirical validity for directional, ordinal, or quantitative semantics.
