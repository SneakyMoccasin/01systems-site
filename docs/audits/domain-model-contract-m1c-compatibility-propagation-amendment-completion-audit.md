# Domain Model Contract M1C-5 compatibility propagation amendment completion audit

Date: 2026-09-16

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `e92629e0877a4e1119054a1977121ecfd622b1f1`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Conclusion

**READY TO RESUME M1D-2A DIFFERENTIAL HARNESS**

M1C-5 closes the compatibility propagation declaration needed by the isolated M1D differential harness. The sidecar now declares a structurally closed execution protocol, exact profile-local trigger evidence, an explicit implicit-node materialization policy, and complete compatibility/envelope hash coverage without changing native V1 semantics or adopting any runtime behavior.

This audit authorizes resumption of the test-only M1D-2a differential harness. It does not itself checkpoint M1D-2a, grant trust or executability, introduce a registry, or authorize runtime adoption.

## 2. Repository gate and audited change

The initial repository gate matched exactly:

| Check | Observed |
|---|---|
| Repository | `/Users/christian/Projects/pulse_engine_clean` |
| Branch | `decision-flow-demo-v1` |
| HEAD | `e92629e0877a4e1119054a1977121ecfd622b1f1` |
| Remote | `git@github.com:SneakyMoccasin/01systems-site.git` |
| Index | Clean |
| Tracked working tree | Clean |
| Untracked files | Exactly the six pre-existing M1D files under `domainModelDifferentialV1/` |

The audited checkpoint is `e92629e0877a4e1119054a1977121ecfd622b1f1` (`test: declare legacy compatibility propagation semantics`). Its diff contains exactly 13 modified M1C files, all under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/`, with 211 insertions and 63 deletions. No application, production runtime, resolver, persistence, UI, deployment, M0B, M1B, or M1D file is part of the commit.

## 3. Closed M1C-5 contract

`compatibility.propagation.executionSemantics` is mandatory. The structural parser admits exactly seven fields at that level and exactly four fields in its nested `eventPolicy`; missing and unknown fields fail closed.

The complete declared policy is:

```ts
{
  algorithm: "ordered-monotone-raise-fixed-point-v1";
  sourceReadPolicy: "missing-source-does-not-trigger-v1";
  targetReadPolicy: "missing-target-uses-declared-default-v1";
  targetComparison: "propagated-rank-strictly-greater-v1";
  writeVisibility: "later-occurrences-same-iteration-v1";
  iterationPolicy: "repeat-from-start-until-no-raise-v1";
  eventPolicy: {
    emission: "on-target-level-change-v1";
    step: "iteration-plus-one-v1";
    delaySteps: 1;
    duplicateSuppression: "no-change-no-event-v1";
  };
}
```

This is an unambiguous ordered monotone-raise fixed-point protocol: an absent source never triggers; an absent target uses the separately declared target default; a target changes only when the propagated rank is strictly greater; writes are visible to later occurrences in the same iteration; evaluation restarts from the beginning until an iteration has no raise; and events are emitted only for actual target-level changes with `step = iteration + 1`, `delaySteps = 1`, and no-change suppression.

Every compatibility-only edge is structurally closed and contains exactly:

- `triggerPredicate: "source-level-in-set-v1"`;
- `triggerLevelIds: ["high", "severe"]`; and
- `projectedPropagatedLevelId: "high"`.

The previous ambiguous per-edge fields `missingReadDefaultLevelId`, `materializeOnRaise`, `hasScore`, and `hasImpacts` are absent from the type, parser, projection output, and checked-in fixtures. Their responsibilities are represented once by the closed execution and implicit-node policies.

## 4. Profile binding

| Profile | Compatibility-only edges | Implicit node | Result |
|---|---:|---|---|
| RE (`legacy-real-estate-v1`) | 3 | Complete policy | Exact closed match |
| MU (`legacy-municipal-v1`) | 0 | `null` | Exact closed match |
| CO (`legacy-consulting-v1`) | 3 | Complete policy | Exact closed match |

RE and CO carry identical execution semantics and the same ordered compatibility-only edge inventory:

1. `leverage-level-risk -> liquidity-pressure`;
2. `refinancing-risk -> liquidity-pressure`; and
3. `liquidity-pressure -> capital-commitment-rigidity-risk`.

The semantic validator reconstructs the complete expected compatibility object from the locked profile fixture and compares the full propagation declaration. Real parser-to-validator negative tests prove that:

- RE rejects `implicitNode: null` with `legacy-propagation-order-mismatch` at `/compatibility/propagation`;
- CO rejects `implicitNode: null` with the same code and path;
- MU rejects a complete, structurally valid RE/CO implicit node with the same code and path; and
- MU rejects a complete, structurally valid compatibility-only edge with the same code and path, preserving its exact zero-edge contract.

No fabricated structural or semantic brand is used by these tests.

## 5. Materialization semantics

The declarations separate source and target reads:

| Concern | Declared behavior |
|---|---|
| Missing source | `missing-source-does-not-trigger-v1` |
| Missing target | `missing-target-uses-declared-default-v1` |
| Target default | Implicit node declares `targetMissingDefaultLevelId: "low"` |
| Raise comparison | `propagated-rank-strictly-greater-v1` |

The implicit node is bound as `liquidityPressure` / `liquidity-pressure`. Its initial level and score are both `absent`. Its materialization is `on-propagation-raise-v1`, and its score materialization is `projected-level-anchor-after-propagation-v1`.

For RE and CO, every compatibility-only edge propagates `high`. The projected `legacy-risk-scale-v1` contains `high` with anchor exactly `2`; tests bind every edge, the scale lookup, and the implicit-node score policy together. The node declares `impacts: "none"`, so it has no direct dimension effect.

## 6. Hash boundaries and provenance

The compatibility identity projection removes only `declarationsHash`. Consequently, every new execution, event, implicit-node, predicate, and trigger-level field remains in the compatibility hash domain. The envelope projection retains the complete verified envelope, so every new field is also envelope-hash-significant. A dedicated leaf-by-leaf test mutates every M1C-5 field independently and proves sensitivity in both domains while source and projected hashes remain unchanged.

| Profile | Fixture SHA-256 | Compatibility hash | Envelope hash |
|---|---|---|---|
| RE | `0479c98e7308ee9211ab80dcd7997814a2efa3479292c635528977e12eafabab` | `sha256:f67fdbe29c54a68c3f35de5bed354a29133fb51da5360da8fe8d1e863ac0b72e` | `sha256:0bb3e149951d1b583b55692d1716d551073889c53c289d8819b7409e23275bac` |
| MU | `5c2c0d7ca687ebea62918d5a699ea4ea35fe6ae4a6286277ee0a0e935c57203d` | `sha256:1b079ac5ee7cce11ce1a82087776433be4ea3963e72e991cb64a816fb278d857` | `sha256:355c59644b9fc2e32e62c79f2d3fb055e80ce5a1cd36688db444488bf4d43747` |
| CO | `c3be1e34315bba049202946643da6670b9b07044563b3d399af8efcebed78169` | `sha256:a7f19cfa77d31693fe9f011b6ba1a12618aed3171871af410b282a8ee101407e` | `sha256:37bf236ad981898d310dad92e5e65e2f0f9b495007dc9ac09ff32b2ec3c68bac` |

| Profile | Source hash, unchanged | Projected hash, unchanged |
|---|---|---|
| RE | `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` | `sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99` |
| MU | `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` | `sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99` |
| CO | `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` | `sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529` |

The unchanged source and projected hashes were compared directly with the parent checkpoint. Fixture byte hashes were recomputed independently. The provenance table contains the same source, projected, compatibility, and envelope values, and the projection tests independently reproduce all four named hash domains rather than using provenance as a calculation input.

## 7. Diagnostics

The derived diagnostic is exactly:

```text
code: legacy-propagation-execution-semantics-declared
path: /compatibility/propagation/executionSemantics
message: legacy-propagation-execution-semantics-declared:ordered-monotone-raise-fixed-point-v1
```

Exact derived totals are locked by explicit assertions:

| Profile | Diagnostic total |
|---|---:|
| RE | 15 |
| MU | 12 |
| CO | 14 |

Diagnostics are derived outside the raw envelope and therefore outside all raw hash projections. They are deterministically sorted by code, path, and message using direct ECMAScript code-unit comparison; two independent pipelines compare the complete ordered lists with the locked expected lists.

## 8. Safety and architectural boundaries

The checkpoint changes no native contract type, parser, semantic validator, fixture, or native semantic identity rule. Source and projected hashes remain byte-for-byte identical to the parent checkpoint, providing an independent identity-level check that native V1 semantics did not change.

The M1C surface remains isolated analysis test support. It imports neither the live executable profile resolver nor the live propagation trigger helper. It introduces no callback, executable expression, general rule engine, runtime switch, trust grant, registry adoption, persistence schema, UI path, or deployment behavior.

The curve fallback declaration remains `legacy-neutral-multiplier-v1` with `evidenceStatus: "deferred-to-m1e"`. M1E remains mandatory before any runtime switch.

The six existing M1D files remain untracked, unmodified, and outside the checkpoint. This audit does not declare their current content checkpoint-ready. Its successful conclusion removes the M1C-5 blocker and permits M1D-2a work to resume under its existing test-only boundaries.

## 9. Verification matrix

All commands were run from the repository root. The full test discovery found 83 files, including the existing untracked M1D-2a test file.

| Verification | Result |
|---|---|
| M1C focus run 1 | 72 tests; 72 passed; 0 failed/skipped/todo/cancelled |
| M1C focus run 2 | 72 tests; 72 passed; 0 failed/skipped/todo/cancelled |
| M1B-1/2/3 | 68 tests; 68 passed; 0 failed/skipped/todo/cancelled |
| M0B test-support/canonicalization | 50 tests; 50 passed; 0 failed/skipped/todo/cancelled |
| Existing M1D-2a non-regression | 7 tests; 7 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 1 | 83 files; 746 tests; 746 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 2 | 83 files; 746 tests; 746 passed; 0 failed/skipped/todo/cancelled |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Scoped ESLint | Passed over every TypeScript file in `domainModelContractV1`, with `--max-warnings 0` |
| Git diff check before audit | Passed |

The documented full-regression command was:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

## 10. Untracked M1D integrity

The six pre-existing M1D files retained their prior SHA-256 values before and after all audit execution:

| File | SHA-256 |
|---|---|
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `a043a49358a05d91f614c18596f58d2ca074c9b3e30df9f24d86aa789f7fcf44` |
| `differentialExecutionV1.ts` | `432839e2f3ad23e04dd4709c7e03ba56e7969f9a1c15d40339f8319398592424` |
| `domainModelDifferentialV1.test.ts` | `48fc8424b1e26c1b35739e5b65a8bdb02dae10762461ce06f5ac574052867106` |
| `executeVerifiedNativeProjectionV1.ts` | `3cadbdbc78eead90cc5e5673e66a10d2a23a863bf8d15768752f09d293b8ec89` |
| `runCompatibilityCounterfactualV1.ts` | `b5493954f127c2d3316168bfc4008ccefcd730d68cd547f448508c8fe23a1bfe` |
| `runDomainModelDifferentialV1.ts` | `fd502515a70cdf1d07d1e2d58ec89d78ec54e845bf1321f678dfa648875dfc0a` |

## 11. Final boundary

M1C-5 now provides the closed, profile-bound, structurally validated, semantically validated, and compatibility-hash-verified propagation declaration required by M1D. No unexplained differential, hash drift, native-contract change, unsafe import, or new adoption surface was found.

**READY TO RESUME M1D-2A DIFFERENTIAL HARNESS**
