# Domain Model Contract M1D compatibility propagation decision audit

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `1d0fabe8300a71dcee11d72563c3058850de5ae3`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Conclusion

**READY FOR M1C COMPATIBILITY PROPAGATION AMENDMENT**

The blocked behavior is implicit in the live legacy runtime but is finite, deterministic, and representable without callbacks, executable expressions, a general rule engine, native-contract changes, or runtime adoption. M1C-5 must amend the compatibility sidecar before M1D-2a resumes.

All RE and CO compatibility-only edges use the same exact trigger predicate: the source level is a member of `HIGH | SEVERE`. This is set membership, not an independent rank comparison and not a stored polarity rule. MU has no compatibility-only propagation edges.

The current `missingReadDefaultLevelId: "low"` is not sufficient. The runtime does not default a missing source read: `undefined` fails the trigger predicate. It defaults only a missing target's current level to `LOW` before the strict rank comparison. Those two reads must be declared separately.

The current `hasScore: false` is also insufficient as an execution declaration. The implicit node has no initial score and no impact definition, but when propagation materializes it, `RealEstateEngine.stepForward` adds a driver score using `riskLevelToScore`. For `HIGH`, the resulting score is `2`, equal to the projected scale anchor. M1C-5 must distinguish initial absence from score materialization.

## 2. Audit scope and repository gate

The initial repository gate matched the requested state:

| Check | Observed |
|---|---|
| Branch | `decision-flow-demo-v1` |
| HEAD | `1d0fabe8300a71dcee11d72563c3058850de5ae3` |
| Remote | `git@github.com:SneakyMoccasin/01systems-site.git` |
| Index | Clean |
| Tracked working tree | Clean |
| Untracked files | Exactly the six existing M1D files under `domainModelDifferentialV1/` |

The audit inspected the runtime and its locked test evidence, the three legacy semantic fixtures/envelopes, the M1C projection/parser/semantic/hash boundaries, and the existing M1D design audits. It made no implementation, fixture, Golden, M1C, or M1D change. The only new file is this audit.

## 3. Authoritative legacy execution chain

The relevant execution chain is:

1. `executableDomainProfile.ts` assigns the full `RISK_PROPAGATION` object to RE and CO. MU receives a three-edge filtered subset with no `liquidityPressure` edge.
2. `RealEstateEngine.stepForward` passes the post-escalation risk state and the profile's propagation rules to `propagateRisks`.
3. `riskPropagation.ts::propagateRisks` clones the risk state, traverses `Object.entries(propagationRules)` and each target array in insertion order, and repeats until an entire iteration performs no raise.
4. `impactContract.ts::isPropagationTriggerLevel` returns false for an absent source. For a present source it uses the source parameter's polarity, defaulting an unknown parameter to risk polarity. Risk triggers are exactly `HIGH | SEVERE`; benefit triggers are exactly `LOW`.
5. For an eligible edge, the target's current level is read as `next[target] ?? "LOW"`. The target is raised only when the propagated level's severity rank is strictly greater than the current level's rank.
6. The write is immediate. A later occurrence in the same iteration sees the raised value.
7. A cascade event is emitted only when the assigned target value differs from the previous value. Its fields are `step: iteration + 1`, exact legacy source and target IDs, the applied level, `iteration`, and `delaySteps: 1`.
8. After propagation, `RealEstateEngine.stepForward` adds or updates a score for every risk-state value changed from the pre-propagation state. The conversion is the legacy level-to-score mapping; `HIGH` becomes `2`.

No callback or context-sensitive rule is involved. The only profile-sensitive inputs are the ordered edge inventory and the source trigger set.

## 4. Exact compatibility edge inventory

RE and CO have the same three compatibility-only occurrences in the same positions:

| Occurrence | Edge | Trigger levels | Applied level |
|---:|---|---|---|
| 2 | `leverage-level-risk -> liquidity-pressure` | `high`, `severe` | `high` |
| 5 | `refinancing-risk -> liquidity-pressure` | `high`, `severe` | `high` |
| 7 | `liquidity-pressure -> capital-commitment-rigidity-risk` | `high`, `severe` | `high` |

The legacy IDs are respectively `leverageLevelRisk`, `refinancingRisk`, `liquidityPressure`, and `capitalCommitmentRigidityRisk`. `liquidityPressure` is absent from the applicable-driver inventory, default risk state, impact contract, and curve configuration. It exists as an implicit propagation node only.

MU has exactly three native/projectable propagation edges and zero compatibility-only edges. It never materializes `liquidityPressure` through its profile-local propagation rules.

## 5. Exact trigger predicate

For every RE/CO compatibility-only edge, the exact predicate is:

```text
source exists AND source level is a member of { HIGH, SEVERE }
```

The declaration should encode this as explicit projected level IDs `high`, `severe` in that exact scale order.

The predicate is not:

- rank-at-or-above as an independently executable rule;
- rank-at-or-below;
- a runtime polarity lookup in M1D;
- a callback to `getPropagationTriggerLevels`; or
- an inference from the propagated target level.

The live runtime obtains the same set through adverse risk polarity. Storing the final closed set is sufficient and preferable: it removes the global lookup and does not introduce an unnecessary abstract polarity concept.

The subsequent target transition does use rank: apply `high` only if its declared scale rank is strictly greater than the target's current level rank. Trigger admission and target raising are separate operations.

## 6. Missing reads and implicit-node materialization

`missingReadDefaultLevelId: "low"` currently conflates two different cases and cannot independently define execution:

| Read | Legacy behavior | Required declaration |
|---|---|---|
| Missing source | Source value is `undefined`; trigger predicate returns false | `missing-source-does-not-trigger-v1` |
| Missing target current level | Current target is evaluated as `LOW` | `missing-target-uses-level-v1` plus `low` |

In the neutral RE case, leverage and refinancing are `MODERATE`, so occurrences 2 and 5 do not trigger. `liquidityPressure` remains absent, so occurrence 7 also does not trigger. No compatibility node, score, event, downstream level, dimension, or margin is produced.

An absent implicit node can be materialized. If leverage or refinancing is `HIGH` or `SEVERE`, occurrence 2 or 5 compares the missing liquidity target as `LOW`, writes `liquidityPressure: HIGH`, and emits an event. Because writes are immediate, occurrence 7 sees `liquidityPressure: HIGH` later in the same iteration and may raise capital commitment in that iteration.

The full runtime graph also contains direct leverage/refinancing-to-capital edges before occurrence 7. Those may already have raised capital commitment, in which case occurrence 7 emits no duplicate event. This does not make occurrence 7 inactive: it is evaluated, but the strict target-rank comparison prevents another transition and event.

## 7. Fixed point, order, and events

The current `sourceEvaluationOrder` is complete and unambiguous for fixed-point execution:

- RE and CO each contain all 20 occurrences, with contiguous source and edge positions and stable referenced identities.
- MU contains its complete three-occurrence subset.
- M1C semantic validation reconstructs and compares the entire ordered graph.

The order declaration alone is not a complete execution protocol. M1C-5 must also declare:

- ordered monotone-raise fixed-point iteration;
- immediate visibility to later occurrences in the same iteration;
- restart at occurrence zero after any iteration containing a raise;
- termination after an iteration with no raise;
- strict propagated-rank-greater-than-current comparison;
- missing-source and missing-target behavior;
- event-on-level-change only;
- event `step = iteration + 1`;
- `delaySteps = 1`; and
- suppression when the target already equals or outranks the applied level.

These rules reproduce both terminal state and order-sensitive event evidence. No separate delay expression or event callback is needed.

## 8. Score, dimensions, and margin

The implicit node requires no score to decide propagation. Propagation reads categorical levels only. Nevertheless, after a successful raise the legacy engine materializes `driverScores.liquidityPressure = 2` from `HIGH`.

The node has no impact definition and no curve configuration, so it has no direct dimension effect. `computeDimensionMultipliers` iterates the profile impact contract rather than arbitrary risk-state keys. The node can still affect dimensions and margin indirectly by raising `capitalCommitmentRigidityRisk`, which has a declared recovery impact.

Therefore M1C-5 must express all three facts independently:

- initial implicit-node level and score are absent;
- a propagation raise materializes its categorical level and a score from the projected level anchor; and
- the implicit node has no direct impacts.

## 9. Direct answers to the audit questions

1. Each compatibility edge triggers when its source exists and its level is exactly `HIGH` or `SEVERE`.
2. The predicate is explicit membership in a trigger-level set. Polarity is how legacy derives the set, but need not be stored once the set is explicit. Rank is used only for the target raise.
3. No. `low` is sufficient only for a missing target-current read; a missing source has separate non-triggering behavior.
4. Yes. A triggered edge targeting the absent node materializes it as `HIGH`.
5. The write is visible immediately to later occurrences in the same iteration.
6. Every compatibility edge applies `HIGH`, projected as `high`.
7. An event is emitted only when the edge changes the target level.
8. Required fields are exact source ID, target ID, applied level, `iteration`, `step = iteration + 1`, and `delaySteps = 1`.
9. No score is needed for propagation; a score is nevertheless materialized after propagation for the changed implicit node.
10. It has no direct dimension effect, but can affect dimensions and margin indirectly through downstream native drivers.
11. Yes. RE and CO use the same full rules, trigger lookup, order, and compatibility edges.
12. No. MU has zero compatibility-only edges.
13. Yes for edge identity/order; no as a standalone execution contract without the fixed-point/read/visibility/event policies listed above.

## 10. Minimal closed M1C-5 declaration

The smallest sufficient amendment is one shared closed execution-semantics object under `compatibility.propagation`, explicit trigger fields on each compatibility-only edge, and one closed implicit-node policy. Suggested names are normative in meaning but may be adjusted mechanically during implementation:

```ts
type LegacyCompatibilityPropagationExecutionSemanticsV1 = Readonly<{
  algorithm: "ordered-monotone-raise-fixed-point-v1";
  sourceReadPolicy: "missing-source-does-not-trigger-v1";
  targetReadPolicy: "missing-target-uses-declared-default-v1";
  targetComparison: "propagated-rank-strictly-greater-v1";
  writeVisibility: "later-occurrences-same-iteration-v1";
  iterationPolicy: "repeat-from-start-until-no-raise-v1";
  eventPolicy: Readonly<{
    emission: "on-target-level-change-v1";
    step: "iteration-plus-one-v1";
    delaySteps: 1;
    duplicateSuppression: "no-change-no-event-v1";
  }>;
}>;

type LegacyCompatibilityImplicitNodeV1 = Readonly<{
  sourceNodeId: "liquidityPressure";
  adapterLocalNodeId: "liquidity-pressure";
  initialLevel: "absent";
  initialScore: "absent";
  targetMissingDefaultLevelId: "low";
  materialization: "on-propagation-raise-v1";
  scoreMaterialization: "projected-level-anchor-after-propagation-v1";
  impacts: "none";
}>;

type LegacyCompatibilityOnlyPropagationEdgeV1 = Readonly<{
  // Existing identity, position, endpoint, and applied-level fields remain.
  triggerPredicate: "source-level-in-set-v1";
  triggerLevelIds: readonly ["high", "severe"];
}>;
```

`missingReadDefaultLevelId`, `materializeOnRaise`, `hasScore`, and `hasImpacts` should not remain ambiguous parallel authorities. Replace them with the closed implicit-node policy, or retain them only if semantic validation proves exact equivalence and assigns one unambiguous meaning. In particular, retaining `hasScore: false` as “never has a score” would contradict runtime behavior.

No callback, polarity enum, executable predicate tree, expression language, extensible metadata map, or generalized rule engine is needed.

## 11. M1C implementation impact

An eventual M1C-5 amendment should be confined to M1C test support and its audit. At minimum it changes:

| Area | Required change |
|---|---|
| Types | `legacyProfileProjectionEnvelopeV1.ts`: add the closed execution, implicit-node, trigger predicate, and trigger-level types |
| Structural parser | `parseLegacyProfileProjectionEnvelopeV1Structure.ts`: require exact fields/literals, two ordered trigger levels, and closed nested objects |
| Semantic validator | `validateLegacyProfileProjectionEnvelopeV1Semantics.ts`: bind the shared policy, implicit node, edge/profile tuple, exact trigger set/order, applied level, and positions to each profile |
| Projection builder | `projectLegacyProfileToDomainModelContractV1.ts`: emit the closed policy and explicit trigger sets from audited source behavior |
| Hash projection | Existing complete compatibility/envelope projections should absorb the new fields automatically only if their current whole-object projection remains complete; tests must prove this rather than assume it |
| Diagnostics | Add one derived `legacy-propagation-execution-semantics-declared` diagnostic at `/compatibility/propagation/executionSemantics`; retain per-edge diagnostics and make their tests cover trigger semantics |
| Test support | Update expected compatibility construction and complete-pipeline expected diagnostics; no runtime importer is permitted |
| Fixtures | Regenerate all three checked-in legacy projection envelopes through the real pipeline |

The three fixture paths are:

- `fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`
- `fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json`
- `fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json`

All three change because the shared propagation execution policy is present even where MU has an empty compatibility-edge list. RE and CO additionally gain per-edge trigger declarations and the implicit-node policy.

## 12. Hash-domain effects

The following must remain byte- and value-identical:

- legacy source semantic payload and source semantic payload hash;
- native projected contract semantic payload and projected semantic payload hash;
- native contract identity and all native driver, scale, propagation, curve, constraint, and measure content.

The following must change for all three profiles:

- `compatibility.declarationsHash`;
- full envelope hash; and
- checked-in fixture byte SHA-256.

No source fixture, engine input fixture, engine Golden, native source hash, or native projected hash may change. A stale declarations hash must fail at `/compatibility/declarationsHash`; a stale envelope expectation must fail independently.

## 13. Required M1C-5 negative tests

Structural negatives must cover:

- missing `executionSemantics`, `implicitNode`, `triggerPredicate`, or `triggerLevelIds`;
- unknown fields at every new object level;
- wrong predicate literal;
- missing, extra, duplicated, sparse, or reordered trigger levels;
- wrong source-read policy or target-read policy;
- wrong target default level;
- wrong target comparison, visibility, iteration, event, delay, or duplicate-suppression policy;
- wrong implicit-node IDs, initial presence, materialization, score, or impacts policy; and
- accessor, symbol, collection-limit, depth, and byte-limit behavior through the existing safe parser boundary.

Semantic negatives must use structurally valid values and cover:

- `low` substituted for either trigger level;
- the benefit trigger set used on a compatibility edge;
- trigger set correct but bound to the wrong profile or edge;
- source/target/implicit-node identity mismatch;
- wrong applied target level;
- wrong source position, edge position, or occurrence position;
- RE/CO policy divergence;
- a compatibility edge inserted into MU;
- MU missing the shared execution policy;
- initial score declared present or materialized score disabled;
- event policy inconsistent with fixed-point visibility; and
- stale `declarationsHash` after any accepted semantic mutation.

Hash tests must prove that every new field is compatibility-hash-significant and envelope-hash-significant while source and projected hashes remain unchanged.

## 14. Required M1D resumption tests

M1D-2a may resume only after the amended fixture passes structural parsing, semantic validation, and hash verification. Its tests must then prove:

1. Pure native receives only the hash-verified native contract plus a completed native source-case projection; it never receives or reads compatibility data.
2. Effective execution starts from a fresh identical native run and receives the verified sidecar separately.
3. Neutral missing-source reads are non-triggering solely because of the verified source-read and trigger-set declarations.
4. Every compatibility occurrence is evaluated in declared order; none is filtered out.
5. A leverage/refinancing witness materializes `liquidity-pressure` from a missing target using `low`, with exact level and score.
6. A reduced compatibility-edge witness proves that the materialized node is visible to the later liquidity-to-capital edge in iteration 1.
7. Full-graph witnesses prove duplicate event suppression when a prior direct edge already raised capital commitment.
8. Events match exact source/target IDs, level, order, `iteration`, `step`, and `delaySteps`.
9. Native propagation order and execution remain identical between pure and registry-only counterfactuals.
10. Registry counterfactuals enable exactly one internally selected verified registry declaration and no propagation declaration.
11. Comparator B derives admission from the verified envelope and matches pure/counterfactual/effective values at every attributed path with no collateral or duplicate attribution.
12. The implicit node has no direct dimension effect, while downstream native effects and margin remain exactly comparable.

## 15. Boundaries and deferred work

This decision authorizes only an M1C compatibility declaration amendment and later resumption of the isolated M1D harness. It does not authorize:

- adding `liquidity-pressure` as a native driver;
- changing native V1 propagation or scale semantics;
- importing the live legacy resolver or trigger helper into candidate execution;
- changing runtime, fixtures outside the three M1C envelopes, engine Goldens, UI, persistence, or deployment;
- curve fallback adoption; or
- production trust, registration, or runtime switching.

The amendment remains test-only compatibility evidence. Runtime adoption is not required and would be out of scope.
