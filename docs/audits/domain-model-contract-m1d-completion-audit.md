# Domain Model Contract M1D completion audit

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `de63fa66dd18e9070491ee2d56162f1f41d44102`

## 1. Executive conclusion

**READY FOR M1E FINAL EQUIVALENCE BOUNDARY**

M1D is complete as an isolated, test-only differential-execution and evidence layer for the three checkpointed legacy profiles. The implementation produces separate legacy-reference, pure-native and compatibility-effective observations; executes the six locked M0B cases and four action-admission cases; proves complete pure-native/effective attribution; applies fail-closed Comparator A prerequisites; and enforces deterministic discrepancy ownership without activating either reserved classification.

This conclusion advances only to M1E's curve-fallback evidence and final equivalence boundary. It does not authorize runtime adoption, trusted registration, persistence adoption, migration, deployment, or Vercel interaction. It does not claim a hash-bound sustain value, sustain parity, full actual-runtime parity for the compatibility-normalized reconstruction, actual execution of ignored effects, or resolved curve fallback.

## 2. Scope and verified commits

The audit began with a clean index and working tree. Local HEAD, `origin/decision-flow-demo-v1`, and the actual remote branch all resolved to `de63fa66dd18e9070491ee2d56162f1f41d44102`. This file is the only audit-produced worktree entry and remains untracked and unstaged.

The following normative and implementation checkpoints were verified as ancestors of audited HEAD:

| Boundary | Commit | Subject |
|---|---|---|
| M1C completion | `6719010dd5c06d209e35d9ff0b28bd121930b17d` | `docs: complete domain model contract m1c audit` |
| M1D design | `499604b` | `docs: define domain model differential execution boundary` |
| Registry decision | `94f84c5` | `docs: define legacy registry parity boundary` |
| Registry amendment audit | `1d0fabe` | `docs: complete m1c registry amendment audit` |
| Propagation decision | `90ddec4` | `docs: define compatibility propagation boundary` |
| Propagation amendment audit | `34b1057` | `docs: complete m1c compatibility propagation audit` |
| M1D-2a implementation | `eb8baaf086c2ff88b40299bbdf711ee42b8cd64b` | `test: add domain model differential execution harness` |
| Action-admission decision | `acc8bbe` | `docs: define legacy action admission boundary` |
| Action-admission amendment | `a4fedca` | `test: add legacy action admission compatibility contract` |
| Action-admission amendment audit | `eb13207` | `docs: complete m1c legacy action admission audit` |
| Reference/sustain decision | `365282c` | `docs: decide m1d2b reference and sustain boundary` |
| M1D-2b implementation | `3f80e04c9d277d0cc156d5dfa3ee0a908c116506` | `test: complete domain model differential execution matrix` |
| Classification decision | `dfac34e` | `docs: define m1d3 discrepancy classification` |
| M1D-3 implementation | `de63fa66dd18e9070491ee2d56162f1f41d44102` | `test: harden m1d differential evidence ownership` |

The M1D implementation commits affect only the six files under `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/`. The audit reviewed those files, their tests, the M1C envelope types, structural and semantic boundaries, the compatibility/envelope hash implementation, and all ten required design, decision and completion audits. No prior readiness statement was used without comparison to current code and tests.

## 3. Architecture boundaries

`runDomainModelDifferentialV1` creates three separately typed and recursively frozen observations from one parsed source case:

1. `legacy-reference` is produced through the unchanged `runEngineBaselineFixtureV1` boundary.
2. `pure-native` is produced by `executePureNativeProjectionV1` from only `SemanticHashVerifiedDomainModelContractV1` and `NativeSourceCaseProjectionV1`.
3. `compatibility-effective` is a fresh native execution whose sidecar plan is derived from `HashVerifiedLegacyProfileProjectionEnvelopeV1`.

The pure-native executor imports contract types and M1D plan/types but no production profile resolver, `RealEstateEngine`, `ACTION_EFFECTS`, or runtime propagation table. Production imports in `runDomainModelDifferentialV1.ts` are confined to the legacy reference, actual rejection observation, and explicitly bounded compatibility-normalized legacy engine-core reconstruction. They do not enter `executePureNativeProjectionV1`.

`buildLegacyCompatibilityExecutionPlanV1` derives driver mappings, ordered propagation, registry materialization and action admission from the hash-verified M1C envelope. It rejects incomplete, duplicate, shifted, ambiguous, cross-profile or executable registry data. Compatibility-only registry members, propagation edges and action admission remain outside the native semantic payload and native state; `nativeStateHasCompatibilityProperties` is locked to `false`.

No production module imports `domainModelDifferentialV1`. No M1D commit changes runtime, profile resolution, fixtures, Goldens, manifests, M1C schemas, persistence, UI or deployment. M1D reuses `hashBaselineValueV1` for report hashing and `hashLegacyProfileProjectionEnvelopeV1` for envelope identity; it introduces no canonicalizer or hash implementation. Implementation code contains no fabricated verified-brand cast, `as any`, or `as unknown as` bridge. The one `as unknown as` occurrence is a negative test that sends a freshly parsed raw contract through the real structural, semantic and hash pipeline.

## 4. Profile and case matrix

| Profile | M0B cases | Registry | Compatibility propagation | Action-admission evidence | Sustain status |
|---|---:|---|---|---|---|
| RE `legacy-real-estate-v1` | neutral and stressed/scheduled | Complete inert overlay | Three declared edges; implicit node, immediate visibility and duplicate suppression proved | `increase_liquidity_buffer` and `stagger_project_starts`; retained effects execute, ignored effects do not enter output attribution | `deferred-missing-hash-bound-value` |
| MU `legacy-municipal-v1` | neutral and stressed/scheduled | Complete inert overlay | Exact zero-edge declaration | `congestion_pricing`; actual runtime rejects and normalized/effective action is output-neutral | `ineligible-no-declaration` |
| CO `legacy-consulting-v1` | neutral and stressed/scheduled | Complete inert overlay | Three declared edges; implicit-node behavior proved | `congestion_pricing`; actual runtime rejects and normalized/effective action is output-neutral | `deferred-missing-hash-bound-value` |

All six locked M0B cases require Comparator A equality and passing full Comparator B. The four action cases keep actual runtime rejection separate from the compatibility-normalized reconstruction and compatibility-effective execution. Their provenance is separately typed as actual rejection, normalized admission and canonical compatibility execution evidence.

Registry tests cover trajectory, history and terminal surfaces. Propagation tests cover missing source, implicit high-level materialization with anchor score two, later-occurrence visibility in the same iteration, fixed-point traversal, exact event identity/order/step/delay and no-change duplicate suppression. Counterfactual tests prove that native propagation remains present.

## 5. Comparator A

Comparator A compares the complete legacy canonical output projection with the compatibility-effective projection. The test suite proves that the legacy surface is the unmodified `runEngineBaselineFixtureV1` result; there is no filtering, tolerance or identity normalization. Action cases use `not-applicable-no-successful-legacy-output` only because the actual runtime rejects before producing successful output.

Before classification, `compareLegacyToCompatibilityEffective` mechanically requires:

- all three observations to be concrete and recursively frozen;
- exact kinds `legacy-reference`, `pure-native`, and `compatibility-effective`;
- envelope-bound profile, shared case, `combined` scenario and `nativeStateHasCompatibilityProperties: false`;
- exact source, projected, compatibility and recomputed envelope hashes;
- Comparator B literal `pure-native-vs-full-compatibility-effective-v1`;
- a concrete, recursively frozen Comparator B with `status === "pass"`;
- `discrepancies` to be an actual array with length zero;
- independently recomputed pure-native/effective primary differences to deep-equal stored `primaryDifferences`; and
- flattened attribution differences to match the full independently recomputed primary set, including exact path and before/after values.

Only after these gates does Comparator A run the legacy/effective structural diff twice. The two results must be exactly equal. Paths owned by the complete verified attribution set become `compatibility-rule`; remaining exact reproducible paths become `unresolved-design-decision`. There is no default classification argument and no evidence factory accepting booleans, free strings, declaration paths, `verified: true`, brands or precomputed cause-exclusion flags.

## 6. Comparator B and attribution

`comparePureNativeToCompatibilityEffective` independently computes the complete pure-native/effective diff. The permitted declaration set comes from the verified plan, while expected counterfactual observations are executed internally. Callers cannot provide admission mappings, registry overlays, propagation mappings, hashes or emitter authority.

Each counterfactual must have exactly one permitted declaration path and exact observation identity, hashes, compatibility ledger and comparison surface. It must produce a real output difference, preserve native propagation, and match a primary path with identical before/after values. Missing, extra, duplicate, collision, collateral, forbidden, wrong-profile, wrong-owner, wrong-value and unproven paths become discrepancies. The union of attribution paths must cover the primary diff exactly, with no duplicates.

Registry and propagation attribution are bound to their verified declaration paths. Action attribution additionally binds the source action, declaration index, scheduled step, output disposition, effective activated paths and ledger entry. MU/CO output-neutral actions require zero attributed output paths. RE output attribution is derived from execution with the exact retained effects; ignored effects remain policy/provenance evidence and are absent from output attribution.

`ActionAdmissionAttributionResultV1` and `CompatibilityDeclarationCounterfactualV1` remain subordinate evidence and cannot substitute for `FullCompatibilityComparatorV1`. Compile-time tests reject that ownership substitution.

## 7. Action admission and actual rejection

For each of the four gap-action cases, M1D reads the unchanged runtime action catalog only to construct and verify the actual runtime rejection observation. `runEngineBaselineFixtureV1` must reject before step 1 with the exact unsupported-driver set, no output, no mutation and no canonical execution provenance.

The compatibility-normalized path is explicitly named `compatibility-normalized-legacy-engine-core-reconstruction-v1`. It independently drives `RealEstateEngine` with only the verified retained partition and is compared with the native effective surface. This supports bounded engine-core agreement, not full actual-runtime parity. Admission comparison separately proves the runtime rejection matches the hash-verified action-admission policy.

The admission boundary rejects wrong profile, undeclared action, duplicate action, step outside horizon, inventory mismatch, missing/extra/duplicate effects and mapping mismatch atomically. No caller-supplied deltas or mappings acquire authority.

## 8. Classification ownership

The public owner-bound verifiers are separate:

| Boundary | Sole accepted classification |
|---|---|
| `verifyAdapterReportDiscrepanciesV1` | `adapter-error` |
| `verifyNativeExecutionDiscrepanciesV1` | `contract-error` |
| `verifyCompatibilityDiscrepanciesV1` | `compatibility-rule` |
| Private Comparator A verifier | `compatibility-rule` or mechanically derived `unresolved-design-decision` |

The shared verifier is private and receives its permitted classification only from these owner-bound wrappers. No public verifier accepts an emitter argument. Changing verifier function cannot reclassify an existing discrepancy because each wrapper rejects every other classification. Comparator A's private classification selector is reached only after the prerequisite and cause-exclusion sequence in section 5.

`known-explicitly-deferred` and `possible-legacy-runtime-defect` remain in the closed descriptive union but are absent from `ACTIVE_CLASSIFICATIONS`; negative tests prove both are rejected. Old authority API names occur only in negative export tests, and the sole `emitter:` occurrence is a `@ts-expect-error` call proving the argument is unavailable.

The verifier enforces active-union membership, owner, absolute RFC 6901 syntax, concrete recursively frozen values, code-unit sorting, unique paths, pass with zero discrepancies, fail with at least one discrepancy, and empty discrepancy lists for non-comparison statuses. Classification does not alter equality or convert a failure to a pass.

## 9. Determinism and report hash

Repeated fresh reports are deeply equal, detached, recursively frozen and non-mutating. Tests preserve the envelope and source bytes across execution, permute object insertion order without changing the report hash, and prove that semantically ordered arrays remain order-sensitive. Direct ECMAScript code-unit comparison is used; no `localeCompare` exists.

`hashDifferentialReportContent` reuses M0B canonical hashing. `runDomainModelDifferentialV1` hashes the report content before adding `reportHash`, so the hash excludes itself. Tests mutate each semantic report family, including all three observations, counterfactual ordering and both comparator identities, and require hash changes. A stale report hash is classified at the adapter/report boundary and cannot be accepted. `JSON.stringify` occurrences are diagnostic test-message rendering only, never semantic equality.

## 10. Deferred M1E scope

The sustain declaration contains no hash-bound numeric value. M1D therefore correctly performs no numeric sustain execution:

- RE and CO return `deferred-missing-hash-bound-value` with `execution: "deferred"`.
- MU returns `ineligible-no-declaration` because its declaration is `null`.

These are closed statuses, not discrepancies or parity evidence, and do not block M1D completion under the reviewed M1D-2b decision.

Curve fallback remains M1E scope. The native executor fails closed with a `curve-fallback-hit` reason if a required curve is absent; it does not implement the legacy neutral multiplier, activate `known-explicitly-deferred`, alter native semantics or claim fallback equivalence. M1E must characterize missing and unsupported curve configurations and close the final equivalence boundary before any adoption proposal.

## 11. Claims M1D supports

M1D supports these bounded claims:

- six locked M0B cases have exact legacy-reference versus compatibility-effective parity;
- pure-native versus compatibility-effective differences have complete verified registry/propagation attribution;
- the four declared gap actions retain exact actual-runtime rejection evidence;
- the compatibility-normalized legacy engine core agrees with compatibility-effective native execution on its declared comparison surface;
- MU/CO action admission is output-neutral;
- RE action admission applies only retained native effects and excludes ignored effects from output attribution;
- all primary and counterfactual evidence is deterministic, detached, recursively frozen, hash-bound and report-hash protected; and
- discrepancy classification is fail-closed and owner-bound.

## 12. Claims M1D does not support

M1D does not claim:

- a verified RE/CO sustain-threshold value or sustain parity;
- full actual-runtime parity for compatibility-normalized engine-core reconstruction;
- that actual runtime executed ignored effects;
- that curve fallback is resolved or equivalent;
- that compatibility declarations are native V1 semantics;
- that M1D grants trust, registration or general executability; or
- that runtime, profile resolver, persistence, UI, migration, deployment or Vercel adoption is authorized.

## 13. Test and quality results

All commands ran from repository root against audited HEAD. Test processes were independent.

| Verification | Result |
|---|---|
| M1D focus run 1 | 38 tests; 38 passed; 0 failed/skipped/todo/cancelled |
| M1D focus run 2 | 38 tests; 38 passed; 0 failed/skipped/todo/cancelled |
| M1C/M1B/M0B documented focus matrix | 192 tests; 192 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 1 | 83 test files; 779 tests; 779 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 2 | 83 test files; 779 tests; 779 passed; 0 failed/skipped/todo/cancelled |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Scoped M1D ESLint | Passed over exactly all six M1D TypeScript files with `--max-warnings 0` |
| Git diff check before audit | Passed |
| Forbidden-symbol and import searches | Passed with only documented negative-test/diagnostic occurrences |

The full regression command was:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

Current M1D file identities are:

| File | SHA-256 |
|---|---|
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `55cadcee845cb554e3501825043c3bcca8a1ff69847b9f78d224d639b76bc31f` |
| `differentialExecutionV1.ts` | `800ba7113aeda562f1a4cebf04cefff3ac8fb1752faad121beb0324a2c063da4` |
| `domainModelDifferentialV1.test.ts` | `8efd1f8011a8b2e70223851385090ee4ec9b8ece6e25f464d1419487937b08c1` |
| `executeVerifiedNativeProjectionV1.ts` | `7e78375b47456c14e23023afd824d2978365aa55d7d6fb0d928d4a3dbce04e6d` |
| `runCompatibilityCounterfactualV1.ts` | `5acb3445f46ea46ba808749efb6ee33c67458c5c87fd03ac295c21e8ab190a9b` |
| `runDomainModelDifferentialV1.ts` | `f0fb6acaee2701e606c127ecadf3fd3a07ca688e6670925a4979325ce9f2331f` |

## 14. Residual risks

The remaining risks are explicit later-boundary risks, not open M1D defects:

1. Curve fallback lacks empirical final-equivalence evidence and remains the mandatory M1E gate.
2. Sustain execution cannot resume without a separately reviewed, hash-bound source value or equivalent authoritative evidence.
3. The action reconstruction deliberately bypasses actual runtime normalization after that runtime rejects; its evidence claim must remain bounded to engine-core agreement.
4. The entire native/compatibility executor is test support. Production adoption still requires separate trust, registration, persistence, migration and runtime reviews.

No unexplained Comparator A mismatch, incomplete Comparator B attribution, active reserved classification, hash drift, nondeterminism, unsafe ownership authority or production adoption was found.

## 15. Final readiness conclusion

All M1D completion gates are closed for the reviewed three-profile, six-M0B-case and four-action-case scope. Deferred sustain statuses are correctly non-executable, and curve fallback remains explicitly outside M1D and inside M1E.

**READY FOR M1E FINAL EQUIVALENCE BOUNDARY**
