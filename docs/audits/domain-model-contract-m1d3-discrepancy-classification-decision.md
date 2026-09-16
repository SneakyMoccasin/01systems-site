# Domain Model Contract M1D-3 discrepancy classification decision

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch and audited HEAD: `decision-flow-demo-v1` at `3f80e04c9d277d0cc156d5dfa3ee0a908c116506`

## 1. Decision

M1D-3 shall classify a discrepancy by the semantic owner of the violated invariant at the first independently verified boundary that can prove the violation. Detection location, test name, exception message, and stack are never classification inputs. Earlier fail-closed validation takes precedence over every later hypothetical mismatch.

The active report classifications are `adapter-error`, `contract-error`, `compatibility-rule`, and `unresolved-design-decision`. `known-explicitly-deferred` and `possible-legacy-runtime-defect` remain members of the closed type but are reserved: neither has a valid current M1D-3 report case. Reserved classifications must not be emitted merely to obtain coverage.

Structural, semantic, hash, normalization, eligibility, and expected rejection outcomes retain their closed statuses and do not become ordinary discrepancies. A discrepancy exists only after the inputs required by its comparison boundary have passed all earlier applicable gates.

## 2. Evidence and current inventory

The decision is based on the M1D design and subsequent reference, sustain, action-admission, registry, and propagation decisions; the four M1C completion/amendment audits; all six checkpointed M1D files; the M1C structural, semantic, identity, and hash boundaries; M0B canonicalization; the baseline runner; and the actual-runtime rejection and output-projection boundaries.

There is one declaration of `DiscrepancyClassification`, in `differentialExecutionV1.ts`. Its six literals are the six classes governed here. `collectDiscrepancies` requires a classification, but `compareLegacyToCompatibilityEffective` currently supplies the default `unresolved-design-decision`. All other production calls in the M1D test-support directory pass either `compatibility-rule` or, for the input-mutation guard, `adapter-error`. Current tests assert `unresolved-design-decision` for the seeded Comparator A mismatch and `compatibility-rule` for compatibility attribution. No current test validly exercises the other four classes as report evidence.

Current fail-fast boundaries include compatibility-plan rejection, native-execution rejection, missing executable contract semantics, missing/invalid action declarations, unexpected normalized-admission rejection, declaration-path mismatch, and unexpected actual-runtime behavior. Structural, semantic, and hash fixture loading also stops before report construction. These boundaries must not derive classification from their exception text.

Current closed outcomes include `pass`, `fail`, `not-applicable-no-successful-legacy-output`, `not-applicable-normalization-rejected`, `deferred-missing-hash-bound-value`, `ineligible-no-declaration`, admitted/applied/ignored/rejected ledger states, normalized admission rejection, and actual-runtime rejection. They remain distinct from discrepancy classification.

## 3. Classification model and precedence

Classification combines two facts: the first independently proving boundary and the semantic owner of the invariant proved there. The boundary establishes that the evidence is admissible; ownership selects the class. The following precedence is normative:

1. Structural, semantic, and hash rejection stops processing with no discrepancy classification.
2. A closed not-applicable, deferred, ineligible, or expected-rejection status owns the outcome and emits no discrepancy.
3. For valid inputs, a proven projection, mapping, isolation, detachment, freeze, or harness-integrity violation is `adapter-error`.
4. For a structurally, semantically, and hash-valid contract that is still insufficient to execute a required native stage, the execution boundary emits `contract-error` or fails fast with that typed reason.
5. For a verified compatibility declaration whose execution, binding, attribution, counterfactual, ledger, ownership, or promised effect is wrong, the compatibility comparator emits `compatibility-rule`.
6. A successful legacy/effective Comparator A mismatch not already proved to belong to items 3–5 is `unresolved-design-decision`.
7. `possible-legacy-runtime-defect` may replace item 6 only after the independent evidence chain in section 4.5 is complete.
8. `known-explicitly-deferred` never replaces an existing explicit deferred or ineligible status. It may be activated later only by a separately authorized report surface for a documented deferred observation that is not already represented by such a status.

One report path has exactly one classification. If multiple symptoms share a path, the earliest applicable owner above wins. Later consequences are either omitted as derivative or reported at distinct paths. Hash-invalid input therefore stops at the hash gate even if execution would later produce a compatibility mismatch.

## 4. Exact class definitions

### 4.1 `adapter-error`

Definition: a valid upstream value was projected, mapped, isolated, copied, frozen, ordered, or transported incorrectly by the M1D adapter or harness.

Preconditions: every applicable contract/envelope structural, semantic, and hash gate passed; the violated fact is owned by adapter mechanics rather than native contract semantics or a compatibility declaration.

Allowed emitters: source-case projection verification, observation/report identity verification, cross-profile binding guard, detachment/freeze/nonmutation verifier, and report-hash ownership verifier.

Forbidden emitters: M1C structural/semantic/hash parsers, compatibility attribution used solely because the candidate is compatibility-effective, and Comparator A without isolated adapter evidence.

Positive repository examples: a projected driver is dropped despite a verified bijection; a report reuses mutable input state; observation hashes/profile identity are copied from the wrong envelope.

Neighboring non-examples: a valid contract lacks required executable semantics (`contract-error`); a verified action-admission ledger names the wrong declaration owner (`compatibility-rule`).

State: active. It may occur in a final failed report when the report boundary can represent the evidence; otherwise the adapter rejects before execution with a typed, non-message-based reason. It is compatible with `fail`, never `pass`, not-applicable, deferred, or ineligible.

### 4.2 `contract-error`

Definition: a structurally, semantically, and hash-valid native contract cannot express semantics required by the already authorized native execution boundary.

Preconditions: invalid representation and invalid identity have already been excluded; the missing or contradictory executable fact is owned by the native contract rather than by projection or compatibility policy.

Allowed emitter: the verified native execution boundary or a verifier dedicated to completeness of that boundary.

Forbidden emitters: structural/semantic/hash validation, projection helpers, compatibility attribution, and a generic Comparator A default.

Positive repository example: the valid projected contract lacks the required `structural-margin` measure at the native execution stage. In M1D-3 this should become a typed fail-fast contract rejection or a failed report discrepancy only if the report schema explicitly represents that pre-execution outcome.

Neighboring non-examples: a malformed/missing contract field rejected structurally has classification `none`; the adapter fails to project an existing driver (`adapter-error`).

State: active for valid-but-insufficient semantics; invalid contracts remain pre-execution rejection with classification absent. It may accompany only `fail` or typed fail-fast rejection.

### 4.3 `compatibility-rule`

Definition: after the native contract, adapter projection, and relevant identities have been verified, execution or proof of a specific verified compatibility declaration violates that declaration's closed behavior, ownership, binding, attribution, counterfactual, ledger, or effect partition.

Preconditions: an exact verified declaration path owns the expected rule, or a closed compatibility comparator contract owns the expected binding; the failure is not merely any difference on the compatibility-effective side.

Allowed emitters: compatibility-plan verifier, normalized engine-core comparator, admission comparator, full Comparator B, action-attribution verifier, and declaration counterfactual verifier.

Forbidden emitters: pure-native execution, M1C validation, generic projection checks, and Comparator A when no declaration-specific cause has been independently proven.

Positive repository examples: wrong counterfactual ledger mechanism/source/native ID/step; collateral attribution; an ignored effect becomes output; a retained effect disappears; an output-neutral declaration changes output.

Neighboring non-examples: the source/native mapping is incorrectly projected before compatibility is applied (`adapter-error`); both executions succeed but no cause can be isolated (`unresolved-design-decision`).

State: active. It may occur in a final failed compatibility comparator or typed compatibility-plan rejection. It is compatible with `fail`, never `pass`, deferred, ineligible, or not-applicable.

### 4.4 `known-explicitly-deferred`

Definition: evidence concerns a boundary that a normative decision explicitly assigns to a later checkpoint and that has no more specific closed status.

Preconditions: the exact deferred subject and owner are named by an existing normative decision; successful parity is not claimed; no current closed deferred/ineligible status already owns the outcome.

Allowed emitter: only a future explicitly authorized deferred-evidence report boundary.

Forbidden emitters: current sustain evaluation, Comparator A/B, generic mutation tests, and any helper attempting to convert a mismatch into a tolerated result.

Current evidence: curve fallback remains M1E, but M1D-3 has no authorized curve-fallback discrepancy report. RE/CO sustain is already `deferred-missing-hash-bound-value`; MU is already `ineligible-no-declaration`.

Neighboring non-examples: a deferred status literal is mutated (`adapter-error` at status verification); a successful Comparator A mismatch of unknown cause (`unresolved-design-decision`).

State: reserved and non-emittable in the current M1D-3 discrepancy surface. Allowed current statuses are the explicit deferred/ineligible statuses with classification `none`.

### 4.5 `possible-legacy-runtime-defect`

Definition: a successful actual legacy runtime output conflicts with an independently reconstructed result after all relevant contract, adapter, compatibility, source-case, arithmetic-order, and report-integrity facts have been verified, and an independently locked legacy expectation supports the reconstruction rather than the observed runtime output.

Minimum evidence chain: reproducible actual-runtime output; verified source fixture and identity; independently verified native semantics; verified adapter projection; all applicable verified compatibility declarations; identical controlled inputs and operation order; exact discrepancy path and values; exclusion of mutation, nondeterminism, tolerance, deferred fallback, and unresolved design choice; and independent locked evidence that states the expected result without being derived from the disputed runtime execution.

Allowed emitter: only Comparator A after that complete evidence record is attached and mechanically verified.

Forbidden emitters: ordinary mutation tests, actual-runtime rejection checks, normalized reconstruction alone, Comparator B, and any message/stack-based diagnosis.

Positive current example: none. No present case meets the evidence chain.

Neighboring non-examples: a reconstruction mismatch without independent oracle evidence (`unresolved-design-decision`); output/state/provenance appears during an expected atomic rejection (`compatibility-rule` because the verified rejection policy is violated).

State: reserved. It may later occur only with Comparator A `fail`; fabricating a case for coverage is forbidden.

### 4.6 `unresolved-design-decision`

Definition: both relevant executions and all known prerequisite gates are valid, an exact mismatch is real and reproducible, but current normative evidence cannot assign it to contract, adapter, compatibility, or a proven possible legacy-runtime defect without introducing new semantics.

Preconditions: successful comparable executions; exact path and concrete values; adapter and applicable compatibility causes excluded; no explicit deferred boundary owns the case; the unresolved semantic choice is identified.

Allowed emitter: Comparator A or an explicitly bounded reconstruction comparator after completing the cause-exclusion checks.

Forbidden emitters: `collectDiscrepancies` callers as a convenience default, parser/hash rejection, Comparator B declaration failures, and unknown exceptions.

Positive repository example: a deliberately seeded Comparator A output mismatch for which no authorized owner evidence is supplied. This proves fail-closed behavior, not that every Comparator A difference belongs here.

Neighboring non-examples: independently proven projection corruption (`adapter-error`); wrong verified counterfactual ownership (`compatibility-rule`).

State: active but never a fallback. It is compatible only with `fail`. The default argument on `compareLegacyToCompatibilityEffective` must be removed in M1D-3; the caller must provide classification evidence or use a deterministic classifier that performs the prerequisite checks.

## 5. Boundary decisions

| Boundary and condition | Expected outcome | Classification | Owner/emitter |
|---|---|---|---|
| Structural-invalid envelope | Reject before execution | `none` | M1C structural parser |
| Semantic-invalid envelope | Reject before execution | `none` | M1C semantic validator |
| Any source/projected/compatibility/envelope hash mismatch | Reject before execution | `none` | M1C hash verifier |
| Profile/contract identity mismatch detected at verified binding | Reject or failed identity verification | `adapter-error` | projection/binding verifier |
| Valid contract lacks required executable semantics | Typed rejection or `fail` | `contract-error` | native execution boundary |
| Wrong source-case projection, dropped driver, wrong mapping/output identity, extra state | `fail` or typed adapter rejection | `adapter-error` | projection verifier |
| Cross-profile substitution or mutated valid input | `fail` or typed adapter rejection | `adapter-error` | binding/nonmutation verifier |
| Registry/propagation/action-admission declaration mismatch | `fail` | `compatibility-rule` | compatibility verifier |
| Wrong declaration ownership or counterfactual ledger | `fail` | `compatibility-rule` | Comparator B/counterfactual verifier |
| Gap, collision, collateral, forbidden path, lost retained effect, emitted ignored effect | `fail` | `compatibility-rule` | Comparator B/action verifier |
| Output-neutral declaration changes output | `fail` | `compatibility-rule` | action attribution verifier |
| Successful legacy/effective mismatch with proven adapter cause | `fail` | `adapter-error` | Comparator A with adapter evidence |
| Successful legacy/effective mismatch with proven compatibility cause | `fail` | `compatibility-rule` | Comparator A with declaration evidence |
| Successful legacy/effective mismatch with all known causes excluded | `fail` | `unresolved-design-decision` | Comparator A |
| Successful mismatch satisfying the full independent defect chain | `fail` | `possible-legacy-runtime-defect` | Comparator A; currently reserved |
| Action case without successful legacy output | `not-applicable-no-successful-legacy-output` | `none` | Comparator A status |
| Bounded engine-core reconstruction mismatch | `fail` | `compatibility-rule` if policy-specific, otherwise `unresolved-design-decision` | bounded comparator |
| Normalization rejected | `not-applicable-normalization-rejected` | `none` | normalization status |
| Claim that reconstruction proves full runtime parity | Reject claim | `contract-error` | report verifier |
| Actual runtime rejects differently from declared policy | `fail` | `compatibility-rule` | admission comparator |
| Actual runtime unexpectedly succeeds under declared rejection policy | `fail` | `compatibility-rule` | admission comparator |
| Output/state/provenance exists during expected atomic rejection | `fail` | `compatibility-rule` | admission comparator |
| Runtime output mismatch after all non-runtime owners are independently excluded | `fail` | `unresolved-design-decision`, or reserved defect class only after full chain | Comparator A |
| Curve fallback observation | Deferred to M1E | `none` in current M1D-3 | explicit deferred boundary |
| RE/CO sustain without hash-bound value | `deferred-missing-hash-bound-value` | `none` | sustain evaluator |
| MU sustain without declaration | `ineligible-no-declaration` | `none` | sustain evaluator |
| Future, non-normative compatibility semantics | Stop for design | `none`; no fabricated report | design gate |

## 6. Status versus discrepancy

A closed status is not a discrepancy surrogate. Structural, semantic, and hash rejection return their existing issue/rejection evidence and stop before a differential report. Expected atomic actual-runtime rejection remains rejection evidence; only deviation from the expected rejection contract is a discrepancy. `not-applicable-no-successful-legacy-output`, `not-applicable-normalization-rejected`, `deferred-missing-hash-bound-value`, and `ineligible-no-declaration` carry no classification and cannot be counted as pass or parity evidence.

Classification may appear as separate evidence metadata only after a status expectation itself is violated. For example, changing an eligible RE sustain result from deferred to pass is an adapter/status-contract failure, not a deferred discrepancy. A pass result has exactly zero discrepancies; a fail result has at least one. Not-applicable, deferred, ineligible, and rejected outcomes never masquerade as pass.

## 7. Normative M1D-3 mutation matrix

| Mutation family | Example path | First proving boundary | Expected status | Classification | Rationale | Allowed emitter | Forbidden alternatives |
|---|---|---|---|---|---|---|---|
| Observation identity: version/kind/profile/case/scenario | `/pureNative/profileId` | report identity verifier | `fail` | `adapter-error` | Harness owns observation identity | report verifier | all others |
| Hash identity leaf | `/pureNative/hashes/envelopeHash` | report identity/hash-binding verifier | `fail` | `adapter-error` | Valid hash was transported incorrectly | report verifier | `contract-error`, `compatibility-rule` |
| Native compatibility marker | `/pureNative/nativeStateHasCompatibilityProperties` | pure-native boundary verifier | `fail` | `adapter-error` | Boundary contamination is harness-owned | native boundary verifier | `compatibility-rule` |
| Comparator A nested value/missing/extra/array order without isolated cause | `/comparisonSurface/scenarioA/trajectory/0/margin` | Comparator A after prerequisite checks | `fail` | `unresolved-design-decision` | Both executions succeeded but no authorized owner was proved | Comparator A | automatic `compatibility-rule` or defect class |
| Comparator B nested value/missing/extra/array order | `/comparisonSurface/scenarioA/trajectory/0/margin` | full compatibility comparator | `fail` until exactly attributed | `compatibility-rule` | Comparator B owns verified declaration attribution | Comparator B | `unresolved-design-decision` |
| Absent versus explicit undefined/null in a mutated observation/report | `/pureNative/comparisonSurface/.../field` | report integrity verifier | `fail` when representation is permitted | `adapter-error` | The verifier compares exact property presence in a transported observation | report verifier | message-derived or deferred class |
| Permitted number edge case in Comparator A | `/comparisonSurface/.../value` | Comparator A after prerequisite checks | `fail` when `Object.is` differs | `unresolved-design-decision` | No new NaN/Infinity policy or tolerance is authorized | Comparator A | tolerance, deferred, or automatic defect class |
| Counterfactual missing/extra/duplicate declaration | `/counterfactualBinding/compatibility/...` | counterfactual binding verifier | `fail` | `compatibility-rule` | Verified declaration set is violated | Comparator B | `adapter-error` unless plan transport itself was independently corrupted |
| Counterfactual owner/family/status/mechanism/IDs/step/path/value | `/counterfactualBinding/.../compatibilityLedger/0/mechanism` | counterfactual binding verifier | `fail` | `compatibility-rule` | Binding belongs to verified compatibility proof | Comparator B | all others |
| Counterfactual collateral or declaration-only path | `/counterfactualBinding/.../comparisonSurface/...` | attribution verifier | `fail` | `compatibility-rule` | Output-only attribution invariant violated | Comparator B | `unresolved-design-decision` |
| Native propagation removed/changed in counterfactual | `/counterfactualBinding/.../comparisonSurface` | counterfactual isolation verifier | `fail` | `compatibility-rule` | Counterfactual protocol requires native propagation | Comparator B | `adapter-error` unless shared-state mutation is independently proven |
| Action path/ID/declarations/ledger/disposition | `/actionAttributionBinding/declarationPath` | action binding verifier | `fail` | `compatibility-rule` | Exact verified admission entry owns binding | action verifier | all others |
| Pass with discrepancies or fail without discrepancies | `/actionAttribution/consistency/status` | discrepancy invariant verifier | `fail` | `adapter-error` | Report construction is internally inconsistent | report verifier | `compatibility-rule` |
| Unchanged with differences or changed without differences | `/actionAttribution/consistency/outputDisposition` | action attribution verifier | `fail` | `compatibility-rule` | Declaration effect proof is inconsistent | action verifier | `adapter-error` |
| Retained/ignored effect crosses disposition | `/actionAttributionBinding/compatibilityLedger` | action admission verifier | `fail` | `compatibility-rule` | Verified partition owns disposition | action verifier | `contract-error` |
| Actual rejection stage/reason/inventory/output/state/provenance | `/actualRuntimeRejection/failureStage` | admission comparator | `fail` | `compatibility-rule` | Declared actual-runtime policy owns expected rejection | admission comparator | `possible-legacy-runtime-defect` |
| Engine-core reference/comparator/policyHash identity | `/engineCoreComparator/policyHash` | engine-core report verifier | `fail` | `adapter-error` | Report identity was transported/constructed incorrectly | report verifier | `compatibility-rule` |
| Engine-core nested output mismatch | `/comparisonSurface/...` | bounded comparator | `fail` | `compatibility-rule` if policy-specific; otherwise `unresolved-design-decision` | Cause must be proved, not guessed | bounded comparator | automatic defect class |
| Full-runtime-parity claim from reconstruction | `/engineCoreComparator/reference` | claim verifier | reject | `contract-error` | Evidence model cannot support the claim | report verifier | `possible-legacy-runtime-defect` |
| RE/CO sustain caller numeric value | `/sustainThreshold` | type/API boundary | compile-time impossible or reject | `none` | No caller authority exists | sustain boundary | every discrepancy class |
| RE/CO sustain status mutation | `/sustain/status` | status verifier | `fail` | `adapter-error` | Required deferred status was misreported | report verifier | `known-explicitly-deferred` |
| MU sustain status mutation | `/sustain/status` | status verifier | `fail` | `adapter-error` | Required ineligible status was misreported | report verifier | `known-explicitly-deferred` |
| Report content changed without matching hash | `/reportHash` | report-hash verifier | `fail` | `adapter-error` | Report owns its canonical M0B hash | report verifier | `contract-error` |
| Hash field included in its own hash input | `/reportHash` | report-hash ownership verifier | `fail` | `adapter-error` | Hash recursion/ownership is harness logic | report verifier | all others |
| Cross-profile envelope/fixture/counterfactual/action substitution | `/profileId` or `/counterfactualBinding/.../profileId` | earliest identity binding | reject or `fail` | `adapter-error` | Substitution must stop before false parity | binding verifier | `compatibility-rule` unless a valid same-profile declaration is later misbound |
| Input/result aliasing, mutation, missing recursive freeze | `/` or exact affected path | nonmutation/freeze verifier | `fail` | `adapter-error` | Harness owns isolation | report/execution verifier | all others |
| Unordered object insertion permutation changes result/hash | `/reportHash` or affected path | determinism verifier | `fail` | `adapter-error` | Canonicalization/comparison mechanics failed | determinism verifier | `unresolved-design-decision` |
| Semantic array order mutation is ignored by report/hash verification | exact ordered array path | report/hash integrity verifier | `fail` | `adapter-error` | The harness incorrectly normalized away contractually ordered evidence | report/hash verifier | `unresolved-design-decision` |
| Repeated identical run differs | first differing absolute path | determinism verifier | `fail` | `adapter-error` | Identical verified inputs must produce identical results; no semantic owner changed | determinism verifier | default unresolved or defect class |

## 8. Discrepancy invariants

M1D-3 shall add one minimal test-only verifier within the existing M1D directory. It shall enforce:

- every discrepancy classification is a member of the closed union and is permitted for its emitter;
- every path is an absolute RFC 6901 pointer, with `/` reserved for the complete root value;
- before/after values are concrete, detached, and recursively frozen; absence uses the existing explicit sentinel and is not silently converted to `undefined` or `null`;
- discrepancies are sorted by direct ECMAScript code-unit order, never `localeCompare`;
- one path has one owner and one classification; duplicates and contradictory ownership fail;
- pass has exactly zero discrepancies and fail has at least one;
- not-applicable, deferred, ineligible, and rejected outcomes cannot masquerade as pass;
- a reserved classification cannot be emitted unless its complete activation preconditions are mechanically present;
- classification never changes comparator equality, suppresses a failure, or supplies parity evidence; and
- no semantic equality decision uses `JSON.stringify`.

## 9. Authorized M1D-3 implementation scope

The primary implementation file remains `domainModelDifferentialV1.test.ts`. Existing files in `domainModelDifferentialV1/` may change only as follows:

- `differentialExecutionV1.ts`: remove the default classification from `compareLegacyToCompatibilityEffective`; add the minimal closed classification/status/discrepancy verifier and any mechanically required closed evidence type.
- `runCompatibilityCounterfactualV1.ts`: call the verifier and make emitter ownership explicit where required; do not broaden compatibility authority.
- `runDomainModelDifferentialV1.ts`: select classification only from explicit mechanically verified evidence and verify report content before hashing.
- `buildLegacyCompatibilityExecutionPlanV1.ts` and `executeVerifiedNativeProjectionV1.ts`: change only if needed to expose an existing typed fail-fast boundary without adding semantics.

No new file is required. No M1C, M1B, M0B, fixture, Golden, manifest, audit, profile, resolver, runtime, UI, API, persistence, trust, deployment, or Vercel file may change.

Public types/functions may change only to remove the Comparator A default, encode emitter evidence, and expose the test-only verifier. `DiscrepancyClassification` remains closed. `collectDiscrepancies` remains a structural differ and must not infer semantic ownership.

Required tests are the full table-driven mutation matrix in section 7; repeated whole-matrix determinism; report-hash ownership and semantic sensitivity; insertion-order neutrality and ordered-array sensitivity; detachment, recursive freeze, and nonmutation; cross-profile isolation; status/discrepancy invariants; active-class positive controls; and compile-time impossibility of caller-provided sustain values. Reserved classes receive negative tests proving they cannot be emitted without activation evidence, not fabricated positive cases.

All existing positive M1D cases, the six M0B cases, four action cases, actual-runtime rejection evidence, bounded engine-core agreement, Comparator A applicability rules, full Comparator B, action/registry/propagation attribution, and sustain deferred/ineligible statuses must continue to pass.

Stop if implementation requires new domain or compatibility semantics; a new M1C field or fixture; sustain value; curve fallback; runtime change; profile resolver in pure native; caller authority; new trust/persistence semantics; altered Golden/manifest; weakened hash/brand boundary; message/stack/test-name classification; or activation of a reserved class without its evidence chain.

Completion requires the active mutation table to have one deterministic outcome per row, all invariants to be mechanically verified, both repeated full regressions to pass, TypeScript and scoped ESLint to pass, exact permitted file scope, unchanged prior evidence, and zero unexplained/skipped/todo/cancelled tests. Curve fallback remains M1E. Runtime trust, registration, persistence, migration, and adoption remain later separately authorized work.

## 10. Integrity baseline

The checkpointed M1D SHA-256 values at audit start were:

```text
55cadcee845cb554e3501825043c3bcca8a1ff69847b9f78d224d639b76bc31f  buildLegacyCompatibilityExecutionPlanV1.ts
8041fe7b447d247d735e0f51bdddd5b6bdec9ce4c2251ae6a8f78979fd2abb65  differentialExecutionV1.ts
f5dc0521cf374d7fbf36c895a052cc40c233241ee385e31fd5ddce3d991c9baa  domainModelDifferentialV1.test.ts
7e78375b47456c14e23023afd824d2978365aa55d7d6fb0d928d4a3dbce04e6d  executeVerifiedNativeProjectionV1.ts
421ddeb294d2d87f4cb7c8cf5a1213f98a8003f32bf4adcc8e58948e893e3174  runCompatibilityCounterfactualV1.ts
bfef00a26da900851eaa7c34143f983d1b1bceb8405d861a4e6fa1689590f72a  runDomainModelDifferentialV1.ts
```

## 11. Conclusion

The active mutation surface is now deterministic without inventing evidence for unused classes. `known-explicitly-deferred` and `possible-legacy-runtime-defect` are reserved and non-emittable in current M1D-3 reports. All other classes have a single owner model, explicit precedence, bounded emitters, and exact status interaction.

**READY FOR M1D-3 WITH RESERVED CLASSIFICATIONS**
