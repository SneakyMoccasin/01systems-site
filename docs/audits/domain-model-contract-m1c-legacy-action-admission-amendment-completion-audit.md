# Domain Model Contract M1C legacy action-admission amendment completion audit

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited checkpoint: `a4fedcaaca3f2130ad519b628a4be311bf4524df`

Parent checkpoint: `acc8bbe3e00c2ffa2bf7ba6e70cf102a8f57b9ab`

## 1. Conclusion

**READY TO RESUME M1D-2B**

The checkpoint `a4fedcaaca3f2130ad519b628a4be311bf4524df` (`test: add legacy action admission compatibility contract`) is complete and safe as the M1C legacy action-admission amendment. It adds a mandatory, closed, profile-bound and hash-verified compatibility policy for the four previously blocked action/profile cases. It does not change native semantics or adopt the policy in runtime, resolver, UI, persistence, trust, registration, deployment or Vercel surfaces.

All required tests and quality gates passed. The four partitions, closed provenance types, diagnostic behavior and four hash domains were independently checked. The source and projected identities remain unchanged. The five protected M1D files had identical SHA-256 values before and after this audit.

This conclusion authorizes resumption of the isolated test-only M1D-2B work. It does not authorize a runtime switch, trust or executability, persistence adoption, deployment, fixture regeneration or any change to M0B Goldens.

## 2. Repository and commit gate

At the initial gate, local HEAD, the tracking ref and the actual remote branch all resolved to `a4fedcaaca3f2130ad519b628a4be311bf4524df`. The index was empty, the M1C worktree was clean, and the only existing changes were exactly five unstaged files under `domainModelDifferentialV1`.

The audited range is:

```text
acc8bbe3e00c2ffa2bf7ba6e70cf102a8f57b9ab..a4fedcaaca3f2130ad519b628a4be311bf4524df
```

Its complete scope is exactly 13 modified files under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/`: three JSON fixtures and ten TypeScript implementation/test files. The range contains 308 additions and 16 deletions. It contains no M1D, runtime, resolver, UI, M0B, Golden, manifest, persistence, trust, deployment or Vercel file.

| File | Additions | Deletions |
|---|---:|---:|
| `fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json` | 37 | 1 |
| `fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json` | 37 | 1 |
| `fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json` | 61 | 1 |
| `hashLegacyProfileProjectionEnvelopeV1.ts` | 1 | 0 |
| `legacyProfileProjectionEnvelopeV1.test.ts` | 39 | 3 |
| `legacyProfileProjectionEnvelopeV1.ts` | 78 | 0 |
| `legacyProfileProjectionV1.test.ts` | 3 | 3 |
| `legacyProfileProjectionV1.ts` | 3 | 3 |
| `parseLegacyProfileProjectionEnvelopeV1Structure.test.ts` | 1 | 0 |
| `parseLegacyProfileProjectionEnvelopeV1Structure.ts` | 7 | 1 |
| `projectLegacyProfileToDomainModelContractV1.ts` | 17 | 1 |
| `validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts` | 21 | 0 |
| `validateLegacyProfileProjectionEnvelopeV1Semantics.ts` | 3 | 2 |
| **Total** | **308** | **16** |

## 3. Closed action-admission protocol

`compatibility.actionAdmission` is mandatory. Its structural object is closed to exactly `schemaVersion`, `protocol`, `scheduleInput`, `ordering`, `duplicatePolicy`, `undeclaredActionPolicy`, `undeclaredEffectPolicy`, `normalizationFailurePolicy`, `actualRuntimeExpectation`, `normalizedProvenancePolicy` and `entries`.

The exact policy is:

```text
schemaVersion: legacy-action-admission-policy-v1
protocol: partition-source-effects-before-execution-v1
scheduleInput: source-action-id-and-execution-step-v1
ordering: execution-step-then-source-action-id-code-unit-v1
duplicatePolicy: reject-duplicate-source-action-per-scenario-v1
undeclaredActionPolicy: reject-before-execution-v1
undeclaredEffectPolicy: reject-before-execution-v1
normalizationFailurePolicy: atomic-no-output-no-provenance-v1
actualRuntimeExpectation: reject-unsupported-driver-before-step-v1
normalizedProvenancePolicy: separate-closed-compatibility-provenance-v1
```

Entry IDs and source action IDs are StableIds. Entries are sorted by source action ID using direct code-unit comparison and duplicates are rejected. Retained effects are sorted by projected driver ID; ignored effects are sorted by source driver ID. Missing, extra, duplicate or reordered members fail closed. The atomic policy explicitly promises no engine output, state mutation or canonical execution provenance after normalization failure. The declared actual-runtime expectation remains rejection before step 1 and is not mislabeled as successful historical execution.

## 4. Exact profile partitions

The semantic validator reconstructs these entries from locked source evidence and compares the complete policy object. The declaration path for each entry is derived from its verified array index.

| Profile/action | Entry and declaration path | Retained effects | Ignored effects | Disposition |
|---|---|---|---|---|
| MU `congestion_pricing` | `legacy-action-admission-v1.legacy-municipal-v1.congestion_pricing`; `/compatibility/actionAdmission/entries/0` | none | `modal_shift_pressure: +2`; `political_feasibility: -1` | `output-neutral-v1` |
| CO `congestion_pricing` | `legacy-action-admission-v1.legacy-consulting-v1.congestion_pricing`; `/compatibility/actionAdmission/entries/0` | none | `modal_shift_pressure: +2`; `political_feasibility: -1` | `output-neutral-v1` |
| RE `increase_liquidity_buffer` | `legacy-action-admission-v1.legacy-real-estate-v1.increase_liquidity_buffer`; `/compatibility/actionAdmission/entries/0` | `refinancingRisk -> refinancing-risk: -1` | `liquidityPressure: -1` | `retained-native-effects-v1` |
| RE `stagger_project_starts` | `legacy-action-admission-v1.legacy-real-estate-v1.stagger_project_starts`; `/compatibility/actionAdmission/entries/1` | `capitalCommitmentRigidityRisk -> capital-commitment-rigidity-risk: -1` | `implementationPacingRisk: -1` | `retained-native-effects-v1` |

Every entry uses `admit-after-exact-effect-partition-v1`. Every retained effect uses `apply-to-projected-native-driver-v1`. Every ignored effect uses `ignore-without-state-node-v1` with reason `driver-absent-from-native-contract-v1`. MU and CO do not fabricate a native zero-effect action. RE does not fabricate native drivers for either ignored source driver.

## 5. Structural and semantic boundaries

The action-admission parser reuses the existing descriptor-safe and resource-bounded M1C structural boundary. Exact-object helpers reject missing and extra fields. Literal checks reject the wrong policy, disposition, admission, effect or reason literal. Array checks reject the wrong container, sparse arrays and arrays with extra properties. Descriptor traversal rejects hostile getters without invocation. Shared traversal rejects cycles and enforces byte, depth, node, container, collection and string limits. Numeric parsing requires finite JSON numbers and rejects negative zero. StableIds use the existing closed syntax.

The complete M1C structural suite additionally locks duplicate decoded JSON keys, raw diagnostics rejection, malformed hashes, invalid nested native structures and deterministic sorted/deduplicated issues. Action-admission-specific ordering and duplicate checks run only after safe structural collection.

The semantic boundary rebuilds the exact profile-local declaration from locked source actions, source driver deltas and the existing closed driver mapping. A whole-object comparison rejects wrong profile, action or entry identity; wrong retained mapping or delta; missing, extra, duplicate or reordered effects; incomplete or overlapping partitions; wrong output disposition; cross-profile substitution; and native contamination. The negative mutation matrix reaches the real structural-to-semantic pipeline and reports `compatibility-declaration-mismatch` at `/compatibility/actionAdmission` for semantic deviations.

## 6. Provenance type boundary

`NormalizedActionAdmissionProvenanceV1` is a discriminated union on `outcome` between admitted and rejected observations. Admitted provenance carries execution fields and no rejection fields. Rejected provenance carries failure fields plus the closed no-output evidence and no execution fields.

`RejectedActionProvenanceV1` intersects its common rejected shape with `RejectedActionFailureV1`, a discriminated union containing exactly these nine pairs:

1. `profile-binding / wrong-profile`
2. `action-admission / undeclared-action`
3. `schedule-validation / duplicate-action`
4. `schedule-validation / step-outside-horizon`
5. `effect-partition / source-effect-inventory-mismatch`
6. `effect-partition / missing-effect`
7. `effect-partition / extra-effect`
8. `effect-partition / duplicate-effect`
9. `effect-partition / mapping-mismatch`

Compile-time coverage uses `satisfies readonly RejectedActionFailureV1[]` for all nine valid pairs. Representative crossed pairs are rejected with `@ts-expect-error`. Separate compile-time cases prove that admitted provenance cannot contain `failureStage` or `failureReason`, and rejected provenance cannot contain `actualStep`, `retainedEffects`, `ignoredEffects`, `outputDisposition` or `outputChanged`.

This is deliberately a TypeScript boundary. Provenance is not raw envelope input, so no fabricated runtime parser was introduced. Raw `actionAdmission` policy data is independently protected by structural, semantic and hash validation.

## 7. Hash and fixture register

The fixture bytes and all four identity domains were reproduced through the real parser, semantic validator and hash verifier. Fixture SHA-256 was also computed directly over checked-in bytes. Source identities were independently reproduced from readable M0B fixtures and live source projection; projected identities were reproduced through the M1B semantic projection.

| Profile | Fixture SHA-256 | Compatibility hash | Envelope hash | Source semantic hash | Projected semantic hash |
|---|---|---|---|---|---|
| RE | `4d5c72ce45762b051c1504e0fdb2d27342dd050ce11c46c7b88501140b2f6ebf` | `sha256:2861190f027ac80b238017e8cd691e6cd201c848de5d225f1881c0da876a120a` | `sha256:a202b3d24dda2507d496f2264af73e3eacd1a2fd161fd4b38d75a2b1b82d2989` | `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` | `sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99` |
| MU | `a2b64816e6368f1ad551dceb80a3cfd879ffb653bba3aa1bd7f7c26bfddad433` | `sha256:08c101f11de28bbc10864ba90fba63f24096767b05964a49ab9eea069007d96c` | `sha256:e06441b7889e8c1528a76fe5050612c795d2c4301e6e44720193f8bddbb30c64` | `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` | `sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99` |
| CO | `89fc8e84e73bc3363e530cb7e3a65bc224479199b4030d99d7db0c338ce4792a` | `sha256:62258283079ae9b5786b41b8522de238b6d3e6ade960fd47e327743cb35649c5` | `sha256:30bb1be2e49f15a8c1ad32678884d2b94eeceffdb6d12a832c637770b961dd71` | `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` | `sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529` |

The compatibility identity projection removes only `declarationsHash`; it retains the complete `actionAdmission` policy. The envelope projection retains the complete verified raw envelope. A recursive leaf test mutates every action-admission leaf, and an array test reverses every relevant multi-element array; every mutation changes both compatibility and envelope hashes. The source and projected semantic hashes are unchanged from the pre-amendment identities.

Diagnostics and an envelope-hash result field are absent from raw input and both hash projections. No alternative hashing or canonicalization implementation was added.

## 8. Diagnostics

Each verified action-admission entry produces exactly one diagnostic:

```text
code: legacy-action-admission-declared
path: /compatibility/actionAdmission/entries/<verified-index>
message: legacy-action-admission-declared:<profileId>:<sourceActionId>:<outputDisposition>
```

The complete derived totals remain RE 17, MU 13 and CO 15. Expected diagnostic arrays are independently assembled in tests and compared with two fresh pipeline results. Sorting is direct code-unit order over code, path and message; no `localeCompare` is used. Results are detached and recursively frozen, and raw mutation cannot affect a verified envelope or its diagnostics.

## 9. Architecture boundary review

Commit-scope, import-graph and symbol searches found no runtime or resolver adoption and no production import of the amendment. The only consumers outside M1C are the pre-existing, protected test-only M1D files. The commit creates no native compatibility-only action or driver, places no compatibility data in native state, grants no trusted, registered or executable status, and adds no persistence, UI, deployment or Vercel path.

No semantic equality uses `JSON.stringify`; JSON stringification occurrences are error rendering, test cloning or duplicate-key test construction. The `createHash` occurrence independently checks fixture bytes in a test; semantic hashes continue using the shared M0B canonical hash. Deliberate `any` annotations are confined to hostile-input or invalid-mutation tests and are documented by ESLint suppressions. The source-fixture `unknown as` bridge is pre-existing typed JSON-module plumbing and does not fabricate a verified brand. There is no `localeCompare`, production engine import, resolver import, `runCascadeAnalysis` import or curve-fallback implementation in the amendment.

The existing curve fallback remains explicitly deferred to M1E. This blocks a runtime switch, but it does not block resumption of isolated M1D-2B action-admission work.

## 10. Verification matrix

All commands ran from the repository root in independent processes against the audited checkpoint and the protected M1D worktree.

| Verification | Result |
|---|---|
| M1C focus run 1 | 74 tests; 74 passed; 0 failed/skipped/todo/cancelled |
| M1C focus run 2 | 74 tests; 74 passed; 0 failed/skipped/todo/cancelled |
| M1B-1/2/3 | 68 tests; 68 passed; 0 failed/skipped/todo/cancelled |
| M0B test-support/canonicalization | 50 tests; 50 passed; 0 failed/skipped/todo/cancelled |
| Protected M1D non-regression | 21 tests; 21 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 1 | 762 tests; 762 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 2 | 762 tests; 762 passed; 0 failed/skipped/todo/cancelled |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Scoped M1C ESLint | Passed over every TypeScript file under `domainModelContractV1`, with zero warnings allowed |
| Commit and worktree diff checks | Passed |
| Trailing whitespace and terminal newline | Passed |
| Fixture and identity reproduction | Passed for all three profiles and all five reported hashes per profile |

The documented full-regression command was used twice:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

## 11. Protected M1D files

The values were identical before and after the audit:

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `a31f6ab458abe384fb08d17103271923d6abc1a22d28f799075200afe6f3efae` | `a31f6ab458abe384fb08d17103271923d6abc1a22d28f799075200afe6f3efae` |
| `differentialExecutionV1.ts` | `2d5677b100d992b0b0157eea58c9c94c121f4d878159dfcaf790ccb9b19dbbb4` | `2d5677b100d992b0b0157eea58c9c94c121f4d878159dfcaf790ccb9b19dbbb4` |
| `domainModelDifferentialV1.test.ts` | `87457da1ec59cdff362537e5e98acb7cc6dbda41bee7e62d082a690cf00c8241` | `87457da1ec59cdff362537e5e98acb7cc6dbda41bee7e62d082a690cf00c8241` |
| `executeVerifiedNativeProjectionV1.ts` | `bd478bed839f3fca47c97e1ef7b13e2988b60e8551ef243f6457d5967fdb034d` | `bd478bed839f3fca47c97e1ef7b13e2988b60e8551ef243f6457d5967fdb034d` |
| `runDomainModelDifferentialV1.ts` | `5bbeefc65aed9a0742917c02cce03255416e5abca4b4ec8f624327693e45140b` | `5bbeefc65aed9a0742917c02cce03255416e5abca4b4ec8f624327693e45140b` |

## 12. Final boundary

M1D-2B may resume only as isolated test-support work that consumes the verified declaration. It must keep actual runtime rejection, compatibility-normalized reference output and compatibility-effective native output as separately typed observations. It may not infer undeclared policy, synthesize effects from live runtime tables, manufacture native drivers or actions, grant trust or executability, or weaken the existing M0B/M1B/M1C identity chain.

The amendment is complete for that purpose. Runtime adoption remains gated by the later differential, fallback, trust, persistence and deployment checkpoints.
