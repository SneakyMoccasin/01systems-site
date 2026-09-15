# Domain Model Contract M1C-4 registry amendment completion audit

Date: 2026-09-15

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `a061bd6bc4d5f32eb40221778fcf5b27e7ba4ce6`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

Audited change: `94f84c5625a0fd5218a2f47f8cc755e9cc578ecb..a061bd6bc4d5f32eb40221778fcf5b27e7ba4ce6`

## 1. Conclusion

**READY TO RESUME M1D-2A DIFFERENTIAL HARNESS**

The M1C-4 registry design blocker is resolved in the hash-verified M1C compatibility sidecar. The amendment is closed, profile-specific, deterministic, test-only, and does not alter native semantics or adopt the declaration in any runtime surface.

The six existing untracked M1D files remain stopped and are not checkpoint-ready. M1D must be corrected to materialize the registry overlay from the verified declaration. Comparator A must not filter out any registry field. No curve-fallback behavior is proved here; that remains M1E scope.

## 2. Repository gate and audit scope

The initial repository gate matched exactly: branch, HEAD, and remote were the values above; the index and tracked working tree were clean; and the only untracked content was exactly these six files:

- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/buildLegacyCompatibilityExecutionPlanV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/differentialExecutionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/domainModelDifferentialV1.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/runCompatibilityCounterfactualV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/runDomainModelDifferentialV1.ts`

They were not edited, staged, moved, formatted, or deleted. Tests only read them for the requested existing-M1D non-regression check.

The reviewed commit is `a061bd6bc4d5f32eb40221778fcf5b27e7ba4ce6` (`test: add legacy registry compatibility projection`). Its complete diff changes 13 files, all under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/`: three checked-in M1C fixtures and ten M1C TypeScript implementation/test files. It changes no application, runtime, resolver, trust, registration, persistence, UI, deployment, package, M0B, or M1D file.

## 3. Schema and parser verification

`legacyRegistryProjection` is a required member of the closed compatibility object. Its projection, materialization, entry, initial-state, and source-evidence objects all pass through the existing closed-object parser, which reports missing and unknown properties. The parser accepts only the declared versions, policies, profile IDs, registry keys, compatibility IDs, legacy types, source paths, constructor path, lifecycle values, exact integer values, and lowercase prefixed SHA-256 format.

`entries` has a hard maximum of four. Materialization requires, in exact order, scenarios `scenarioA`, `scenarioB`, `baseline` and surfaces `trajectory.registry`, `constraintHistory`, `terminalState.registry`, plus the exact cadence literal. Structural negative tests cover missing fields, unknown fields at every new nesting level, wrong literals and discriminants, bad hashes, five entries, reordered materialization arrays, sparse arrays, extra array properties, and raw duplicate JSON keys.

The amendment reuses the descriptor- and resource-safe M1C parser boundary. Nested and array-index accessors are rejected through property descriptors without invoking getters; depth, node, container, collection, string, numeric, and byte limits remain enforced. The new parser calls use the same bounded helpers and introduce no weaker path or direct property-read bypass. Successful structural, semantic, and hash stages remain detached, recursively frozen, and progressively branded.

## 4. Exact profile registry declarations

The semantic validator compares the complete declaration against a closed profile-local expected projection. The reproduced registry order is:

| Profile | Exact compatibility entries in constructor order |
|---|---|
| RE (`legacy-real-estate-v1`) | `LiquidityConstraint`, `CovenantConstraint`, `Custom` |
| MU (`legacy-municipal-v1`) | `RefinancingConstraint`, `LiquidityConstraint`, `CovenantConstraint`, `Custom` |
| CO (`legacy-consulting-v1`) | `LiquidityConstraint`, `CovenantConstraint`, `Custom` |

The semantic negative matrix rejects a missing, extra, reordered, or duplicated entry; changed source profile, source key, compatibility ID, or legacy type; duplicate source key; duplicate compatibility ID; evidence changes; and stale or wrong state hashes. Structurally valid insertion of the municipal refinancing entry into RE or CO is rejected as a native duplicate. MU must retain it because its native constraint list is empty, while RE and CO retain native refinancing and therefore cannot declare it as compatibility.

## 5. Tuple, evidence, and state-hash binding

Every accepted entry is bound to its envelope profile. `sourceRegistryKey`, `legacyType`, and `compatibilityEntryId` must equal one of the four closed tuples, and the exact profile list/order must match. `excludedSourcePath` must be `constraints.<sourceRegistryKey>`.

Semantic validation additionally requires a matching entry in `excludedSourceValues` with both the exact source path and the profile-/key-specific reason code. Refinancing in MU uses `profile-constraint-disabled`; liquidity and covenant use `no-public-activation-transition`; custom uses `inert-global-registry-member`.

The existing M0B hash function independently reproduced each `initialRegistryStateHash` over exactly `{ type, lifecycle: "INACTIVE", lastUpdatedStep: 0 }`:

| Type | Reproduced registry-state hash |
|---|---|
| `RefinancingConstraint` | `sha256:16d7376bf1bf72af49b2a884cc91392ed0ecfc9b754dc57bced8f9cf99c7175f` |
| `LiquidityConstraint` | `sha256:6e94c8e2e84c176132b733e9ebf4fa5634ed508688666a9e4d6f302e522ff38c` |
| `CovenantConstraint` | `sha256:e0ccb545014dfb140c1f2e829c0a40ac73201886888b1d0673983b083825ad26` |
| `Custom` | `sha256:df6dcffe8835027599e597a8d3ad19b8a1eaa7fbe98cb07de12ff82327ade9e2` |

The tests explicitly substitute an effects/source-value hash as a registry-state hash and reject it. State identity is therefore not confused with constraint effects.

## 6. Native isolation and adoption boundary

The registry declaration exists only at `compatibility.legacyRegistryProjection`. Projection tests compare each declared entry with the production constructor's initial registry member while separately asserting that no compatibility entry enters native constraints. The native source and projected hashes remain unchanged, and semantic validation continues to compare the complete native contract against its closed profile expectation.

Repository-wide import/symbol searches found no adoption outside M1C test support or the already-untracked M1D work. The commit introduces no runtime execution, resolver selection, trust or registration brand, executable state, persistence schema, UI, deployment, or production import. A registry entry cannot affect native calculations through this amendment: it is data in the compatibility identity only, with `no-public-transition-v1` and `immutable-inert-output-placeholder-v1` policies.

## 7. Hash domains, provenance, and fixtures

Values were reproduced from the real parser → semantic validator → hash verifier chain using the existing M0B canonical hash, M1B semantic-identity hash, and M1C compatibility/envelope functions. The provenance constants were equality targets, not inputs to the calculations.

| Profile | Source hash | Projected hash | Compatibility hash | Envelope hash | Fixture SHA-256 |
|---|---|---|---|---|---|
| RE | `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` | `sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99` | `sha256:3c52fd64d9e56eee0ebbcd91a4f9dc23b09bb9b067a42899328e803575df0f29` | `sha256:fb31efa3ea25f58c12091328350ee321e1da85abec291384b8fc545e2f286183` | `7138540eb93e4dbbf0e26974290b1221edb71000f41870fae37e9623dce5abec` |
| MU | `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` | `sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99` | `sha256:b5b8b11bbea58ae2df38baad536aa54bd8825794e31720f0e0b76c196ac052a3` | `sha256:08ae9d9de9de5774a62a86e75616adb1891bf60c0d4b642d23f0a3e71cb19c0f` | `e66576a70196a359b7ce5a0e9501de880e263d951147d7c0e67b5502986285f6` |
| CO | `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` | `sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529` | `sha256:ede17caafd2a2f02f8af62720b4a6a36e982a569be9863eebe4b4e6af2ef5bb3` | `sha256:9df150ed7122ebfc17f0f3a9a80406d34c20c1db30ec0563da9b5dbc221dfc7d` | `5cd144034e3c512e2a3ab459b5c95a9fc7b0d22c46bab660f8d26ca998a17c0b` |

The compatibility identity mechanically contains every compatibility field except `declarationsHash`, including the complete registry declaration. Mutation tests show every top-level compatibility part is hash-significant. The envelope projection is the complete hash-verified raw envelope. Derived diagnostics and any envelope-hash field are absent from both checked-in raw fixtures and the hash projection. A registry mutation with the old declarations hash fails the named compatibility hash check.

## 8. Diagnostics

Exactly one `legacy-registry-output-materialization-declared` diagnostic is derived per declared entry, at `/compatibility/legacyRegistryProjection/entries/<index>`, with the profile and source key in its message. Reproduced totals are RE 14, MU 11, and CO 13.

The expected diagnostic arrays are independently assembled in tests and compared against two independent complete pipelines per profile. Code, RFC 6901 path, and message ordering uses deterministic code-unit comparison. Diagnostics are derived only after hash verification and are not part of compatibility or envelope identity.

## 9. Negative coverage and issue closure

Structural tests cover the entire new nested surface and exercise the real unknown-input parser. Semantic tests use structurally accepted values and the real structural-to-semantic brand chain. They cover exact profile complements, tuple members, missing/extra/duplicate/reordered entries, duplicate keys and compatibility IDs, profile binding, evidence path, reason code, native refinancing duplicates, and state-hash identity. Hash tests then use the real semantic brand and reject stale declarations hashes at the exact RFC 6901 path.

The structural, semantic, and hash issue-code unions are asserted closed and duplicate-free. Publicly reachable semantic families have parser-to-validator negative paths. Type-only assertions check progressive brands; runtime validation inputs are not admitted by fabricating a semantic or hash-verified cast.

## 10. Verification matrix

All commands ran from the repository root in independent processes. The two full regressions used the exact requested command and enumerated 83 test files, including the six-file untracked M1D worktree surface.

| Verification | Result |
|---|---|
| M1C focus run 1 | 63 tests; 63 passed; 0 failed/skipped/todo/cancelled |
| M1C focus run 2 | 63 tests; 63 passed; 0 failed/skipped/todo/cancelled |
| M1B-1/2/3 | 68 tests; 68 passed; 0 failed/skipped/todo/cancelled |
| M0B test-support/canonicalization | 50 tests; 50 passed; 0 failed/skipped/todo/cancelled |
| Existing M1D non-regression | 6 tests; 6 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 1 | 736 tests; 736 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 2 | 736 tests; 736 passed; 0 failed/skipped/todo/cancelled |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Scoped M1C ESLint | Passed over all `domainModelContractV1/**/*.ts` with zero warnings allowed |
| Commit diff check | Passed: no whitespace errors in the audited commit range |
| Fixture byte hashes | Passed: all three SHA-256 values matched |

The full-regression command was:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

## 11. M1D and M1E boundary

M1C-4 resolves the registry-design blocker only by declaring the exact overlay in the hash-verified compatibility sidecar. It does not repair or approve the current M1D implementation. Before checkpointing M1D-2A, the harness must materialize the registry overlay solely from the verified declaration for all declared scenarios, surfaces, and steps. It may not synthesize the inventory from live legacy code or introduce new declaration fields.

Comparator A must compare the complete relevant output and must not filter any registry field. Parity that still requires registry filtering or live-code synthesis is a stop condition. The amendment does not establish neutral behavior for missing or unsupported curve configuration; curve fallback remains a separate M1E proof and runtime-switch gate.

No staging, commit, push, deployment, Vercel interaction, or review bundle was performed.
