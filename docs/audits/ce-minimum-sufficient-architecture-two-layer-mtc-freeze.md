# CE Minimum-Sufficient Architecture — Two-Layer MTC Freeze

Status: final pre-implementation architecture checkpoint
Repository: `pulse_engine_clean`
Branch: `decision-flow-demo-v1`
Starting commit: `837cb7e91b194baa0e8e72f5892536d682c53b46`
Decision: **C. TWO-LAYER**

## 1. Purpose and authority

This checkpoint freezes the selected architecture direction and Minimal
Testable Core for Test 01A. It supersedes Full Typed-State V2 as the
implementation direction before Test 01A. The Full V2 architecture remains a
preserved reference design and possible future extension; it is neither deleted
nor declared invalid.

This documentation commit does not authorize implementation. It does not
authorize runtime, V1, test, fixture, Golden, UI, persistence, Clean MU,
Sundvik, or Test 01A changes.

The authoritative preceding records are:

- [`ce-evidence-level-architecture-checkpoint.md`](./ce-evidence-level-architecture-checkpoint.md)
- [`ce-evidence-level-architecture-adr-adoption.md`](./ce-evidence-level-architecture-adr-adoption.md)
- [`ce-evidence-level-architecture-phase1-design.md`](./ce-evidence-level-architecture-phase1-design.md)
- [`ce-evidence-level-architecture-phase2-contract-design.md`](./ce-evidence-level-architecture-phase2-contract-design.md)
- [`ce-evidence-level-architecture-phase3-implementation-design.md`](./ce-evidence-level-architecture-phase3-implementation-design.md)
- the completed read-only Minimum-Sufficient Architecture Comparison that
  selected Candidate C.

## 2. Selected architecture

**MINIMUM-SUFFICIENT ARCHITECTURE: TWO-LAYER**

The architecture is the minimum judged sufficient to test this CE product
hypothesis:

> The same decisions, executed in different sequences or at different times,
> may leave an organization in different structural conditions and with
> different future action possibilities, and CE can make those differences and
> their mechanisms explicit, deterministic, reproducible and traceable.

The structural/eligibility-first candidate alone is narrower than this
hypothesis. Full Typed-State V2 preserves the hypothesis but introduces
generality, authority semantics and elicitation burden not required before Test
01A. Two-layer preserves authoritative Decision Space plus pre-blocking causal
observation without forcing observational causality into execution authority.

## 3. Layer 1 — authoritative structural execution

The frozen pre-Test-01A Layer 1 scope is:

- canonical model periods;
- deterministic lifecycle;
- initiative identity;
- schedules;
- dependencies;
- only resource and reservation mechanisms required by the domain-neutral
  fixture and minimum Clean MU;
- explicit constraints required by Clean MU;
- explicit entitlements and authorization required by Clean MU;
- complete eligibility reasons;
- deterministic admission;
- committed-period structural history;
- next-action Decision Space;
- unresolved-conflict handling;
- canonical identity; and
- provenance.

Layer 1 alone determines authoritative:

- eligibility;
- admission;
- blocking;
- resource feasibility;
- constraint state;
- entitlement and authorization effects; and
- next-action Decision Space.

## 4. Layer 2 — causal observation

The frozen pre-Test-01A Layer 2 scope is:

- evidence-referenced source events;
- a bounded acyclic directional graph;
- only the categorical observation states `affected`, `exposed`, `unchanged`
  and `unknown`;
- period-indexed persistence only where explicitly declared;
- source-to-edge-to-terminal provenance; and
- deterministic comparison of differing causal paths and exposure structure.

No generalized ordinal-regime system, quantitative causal magnitude, or
arbitrary activation score is required before Test 01A.

## 5. Hard layer non-interference

**LAYER 2 HAS NO EXECUTION AUTHORITY OVER LAYER 1.**

The following are prohibited:

- a Layer 1 predicate reading Layer 2 state or status;
- a Layer 2 path creating a Layer 1 constraint;
- Layer 2 severity changing eligibility;
- a Layer 2 observation changing admission;
- a Layer 2 observation reserving or releasing a Layer 1 resource;
- a Layer 2 observation consuming or restoring an entitlement;
- a Layer 2 ordinal or quantitative threshold creating Layer 1 authority; and
- automatic observation-to-authority promotion.

There is no runtime promotion mechanism. If a causal relationship is later
believed to affect feasibility, a separate Layer 1 rule must be independently
authored, independently evidenced, validated, versioned and hash-bound.
Historical Layer 2 observations are never retroactively reinterpreted as Layer
1 authority.

## 6. Shared result and comparison core

The minimum shared scope is:

- first divergence;
- structural trajectory;
- next-action Decision Space differences;
- Layer 2 observation-path differences;
- persistent divergence;
- convergence where present;
- unresolved outcomes;
- separate authority, evidence and calibration labels; and
- provenance.

Before Test 01A, the result and comparison model expressly prohibits a
universal winner, utility score, importance score, hidden weighting, arbitrary
magnitude threshold, or organizational ranking.

## 7. Material finding projection

The frozen non-valuative top-level projection may contain:

1. first divergent committed period;
2. first changed structural fact;
3. changed eligibility or admission outcome;
4. changed blocking reason;
5. changed resource feasibility;
6. changed constraint or entitlement state;
7. persistent versus converged structural divergence;
8. minimal differing Layer 2 causal path;
9. changed downstream exposure structure; and
10. unresolved conflict.

Raw traversal events do not each become top-level findings. Layer 2 may use
deterministic path compression or grouping based only on identical source,
identical path prefix, period, terminal exposure, or exact duplicate structure.
No severity weighting or undocumented importance ranking is permitted.
Uncompressed provenance remains available.

## 8. Evidence and authority language

The following distinction is frozen:

**AUTHORITATIVE STRUCTURAL FACT**

A Layer 1 result that participates in execution or eligibility.

**ANALYTICAL CAUSAL OBSERVATION**

A Layer 2 causal result without execution authority.

**EXPLICIT ASSUMPTION**

A declared unsupported or assumed semantic input.

**QUANTITATIVELY CALIBRATED DECLARATION**

A quantitative declaration with separately valid calibration evidence.

Representation type must never be presented as evidence strength.

## 9. Structural elicitation status

Candidate C has **MEDIUM STRUCTURAL ELICITATION BURDEN**. This is not a
usability finding.

Layer 1 structurally requires initiatives, schedules and lifecycle,
dependencies, relevant resources, relevant constraints and entitlements, and
structural eligibility semantics. Layer 2 structurally requires bounded
directional causal relations, evidence references and persistence semantics
where used.

This finding does not establish that customers find the process easy, that
self-service works, that experts agree, or that elicitation time is
commercially acceptable. Those remain empirical hypotheses for later human
testing.

## 10. Scale boundary

The intended Test 01A and pilot scale is **10–30 initiatives**. Decision Space
remains **NEXT-ACTION ELIGIBILITY**. There is no full future-reachability
search.

Layer 2 uses a bounded DAG and bounded causal depth and degree. Dense graphs do
not enumerate every path. Comparison produces minimal differing paths while
retaining edge and source provenance. Output volume must remain traceable. No
benchmark-performance claim exists before measurement.

## 11. Test 01A architecture PASS

Test 01A passes the architecture test only if all criteria hold:

1. Both sequence runs are deterministic and reproducible.
2. At least one meaningful sequence mechanism is represented entirely inside
   the declared model.
3. Every authoritative option change has a complete Layer 1 reason chain.
4. Every pre-blocking causal divergence has a complete Layer 2 path and does
   not alter eligibility.
5. Comparison identifies first divergence, persistence or convergence, and
   affected future action possibilities where present.
6. A reviewer can trace one important finding from scenario input through
   mechanism to output without reconstructing missing causal logic externally.
7. No useful finding requires unsupported magnitude, arbitrary activation
   threshold or hidden valuation.
8. V1 remains mechanically isolated and unchanged.

## 12. Test 01A architecture FAIL

Test 01A fails the architecture test if any of the following occurs:

- a materially relevant required sequence mechanism cannot be represented;
- Layer 2 must alter Layer 1 to produce the useful result;
- important pre-blocking divergence remains invisible;
- useful comparison requires unsupported magnitude or an arbitrary threshold;
- deterministic output depends on incidental iteration or object order;
- a required finding cannot be expressed without valuation;
- mechanically material output remains untraceable after categorical grouping;
- model construction requires assumptions disproportionate to its result; or
- V1 isolation cannot be maintained.

## 13. Test 01A architecture INCONCLUSIVE

Test 01A is inconclusive if:

- the case produces no relevant divergence;
- Clean MU omits necessary but representable semantics;
- required evidence or calibration is unavailable;
- implementation defects prevent a valid run without demonstrating an
  architecture contradiction; or
- case duration or initiative selection fails to exercise the preregistered
  mechanisms.

An inconclusive result does not authorize architecture expansion.

## 14. Inconclusive rerun rule

The same Test 01 case may receive at most **one corrected rerun** after an
inconclusive result. A rerun is allowed only when:

- the inconclusive cause is concretely identified;
- the correction does not change the frozen architecture;
- PASS, FAIL and INCONCLUSIVE criteria remain unchanged;
- no CE output is used to tune the case toward a desired result; and
- the correction and its reason are documented before the rerun.

If the corrected rerun is also inconclusive, that case closes as inconclusive.
Further attempts require a separately preregistered Test 01B or new case. The
original case is not repeatedly modified.

## 15. Falsifying technical contradictions

Architecture correction before Test 01A is allowed only if implementation
demonstrates that a required MTC invariant cannot be satisfied because:

- canonical deterministic execution is impossible;
- valid executions depend on incidental iteration or object order;
- required structural path dependence cannot persist;
- eligibility or admission semantics are internally contradictory;
- atomic period failure cannot be represented;
- Layer 1 and Layer 2 cannot remain mechanically isolated;
- Layer 2 cannot represent a required supported causal path without acquiring
  authority;
- the result contract cannot represent required first divergence,
  persistence, convergence, Decision Space change or observational-path
  difference;
- categorical materiality requires a score or threshold;
- V1 isolation cannot be maintained; or
- a required Test 01A mechanism falls outside both layers rather than merely
  outside the Clean MU profile.

Only these classes may reopen architecture before Test 01A.

## 16. Post-test backlog — not blockers

The following are non-blocking before Test 01A:

- another state or resource type would be useful;
- richer measures or predicates would be useful;
- quantitative causal effects would improve a later case;
- greater causal depth would be useful;
- richer presentation would be useful;
- a generalized promotion workflow would be convenient;
- broader comparison policies would be elegant;
- production persistence or UI refactoring;
- a feature that broadens future market coverage; and
- generalized Full V2 capabilities not required by the MTC.

These do not authorize pre-Test architecture expansion.

## 17. Implementation finding rule

Implementation findings may reduce the MTC, correct an implementation defect,
or block progress through a preregistered falsifying technical contradiction.
They may not expand architecture merely because another capability would be
useful or elegant.

A missing Clean MU declaration, evidence gap, calibration gap or ordinary
implementation bug is not automatically an architecture contradiction.

## 18. Timing rule

The comparison produced this planning information, which is not an architecture
invariant:

- original estimate: **18–30 developer-days**;
- original target: **Test 01A by 2026-11-06**, assuming implementation begins
  by 2026-09-21.

Missing the original start date or calendar target does not reopen architecture
or expand scope. The implementation scope remains frozen. Active implementation
time, Cody iterations, failures and debugging time are logged per checkpoint.
After the first two implementation checkpoints, observed throughput is used to
set or revise the practical Test 01A calendar target. A target change requires
a scheduling reason, not an architecture change.

Developer-day estimates must not be presented as equivalent to Christian's
calendar days.

## 19. External review and preregistration status

The architecture and Test 01A criteria were frozen before:

- completion of the Clean MU executable profile;
- completion of the Test 01A scenario;
- any Test 01A CE execution; and
- any inspection of Test 01A output.

The Git commit containing this document serves as preregistration evidence.
Future external review may assess the frozen methodology, but it does not
permit retroactive modification of Test 01A criteria after output has been
observed. A fundamental methodological criticism discovered before execution
may be documented separately but must not be silently incorporated into the
frozen criteria.

## 20. Process lock

There is no further purely theoretical architecture comparison or expansion
before Test 01A. The next work is implementation.

The allowed sequence is:

1. checkpoint this decision;
2. start a new Cody implementation thread;
3. implement the Two-layer MTC checkpoint by checkpoint;
4. produce a domain-neutral deterministic fixture;
5. author minimum Clean MU;
6. freeze Test 01A case input;
7. run Test 01A; and
8. classify the architecture result using the frozen criteria.

There is no Phase 4 architecture design.

## 21. Full V2 status

The Phase 3 Full V2 architecture remains preserved as a reference design. It
is not the current pre-Test implementation target. It may be reconsidered after
Test 01A or later pilot evidence if required.

No Full V2 code has been implemented. No Two-layer MTC implementation has
begun. This checkpoint freezes the direction but does not itself authorize
implementation.
