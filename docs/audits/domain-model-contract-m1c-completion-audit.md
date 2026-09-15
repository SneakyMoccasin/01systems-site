# Domain Model Contract M1C completion audit

Date: 2026-09-15

Repository: `/Users/christian/Projects/pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Audited HEAD: `ffbeaac163904352b4fb2382008fdcec44f3b788`

Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Executive conclusion

**READY FOR M1D DIFFERENTIAL EXECUTION**

M1C is complete as a closed, test-only legacy projection and evidence layer for the three existing profiles. Its structural, semantic, hash, provenance, compatibility, fixture, mutation, boundary, ordering and collision evidence passes. The next permitted checkpoint is M1D, and M1D must remain test-only differential execution.

This conclusion does not authorize a runtime switch, trusted registration, a registry, executability, production adoption, persistence adoption, external ingestion, UI exposure, deployment, or claim that the historical case is complete. It also does not resolve the M1E curve-fallback gate.

## 2. Repository and provenance

The audit started from the repository, branch, HEAD and remote listed above. The working tree and index were clean. Local `HEAD` and `origin/decision-flow-demo-v1` were both `ffbeaac163904352b4fb2382008fdcec44f3b788`.

Every M1C checkpoint is an ancestor of audited HEAD:

| Checkpoint | Commit and message | Exact commit content |
|---|---|---|
| M1C-1 | `5ea29207de4d72f3457e1afc93a051fc04807753` — `docs: define legacy domain model adapter boundary` | `A docs/audits/domain-model-contract-m1c-legacy-adapter-design.md` |
| M1C-2a | `5d690d2b97b03972a1f3cfabe4937ea561db6d06` — `test: add legacy profile projection envelope parser` | `A src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.test.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.ts` |
| M1C-2b | `80e970a7eed8ec31e9e5a3ad39875b5c52c209fa` — `test: add legacy profile projection semantic validation` | `A src/pilotFastighet/analysis/testSupport/domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.test.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1TestSupport.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.ts` |
| M1C-3a | `d6851fc893576cf01beeb41dbda704123c2748da` — `test: add legacy domain model profile projections` | `A src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.test.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.ts`<br>`A src/pilotFastighet/analysis/testSupport/domainModelContractV1/projectLegacyProfileToDomainModelContractV1.ts` |
| M1C-3b | `ffbeaac163904352b4fb2382008fdcec44f3b788` — `test: verify legacy profile projection identities` | `M src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.test.ts`<br>`M src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.ts` |

Git object and ancestry checks verified every full commit ID, subject and name-status entry.

Commit `3b7262dc0529bb747a1b4d549928027b8f5cd77a` (`chore: restrict vercel deployments to main`) adds only `01systems-site/vercel.json`. It lies between M1C checkpoints but is deployment policy, not M1C evidence.

Normative review covered the M1C-1 design audit, M1B completion audit, M0B completion audit, the complete `domainModelContractV1` directory, readable M0B semantic fixtures, all three M1C projection fixtures, relevant M0B manifests/Goldens/tests, and every M1C checkpoint diff.

## 3. M1C requirement matrix

| Requirement | M1C-1 decision | Implementation | Test evidence | Status | Remaining limitation |
|---|---|---|---|---|---|
| Raw legacy projection envelope | Separate closed raw envelope; diagnostics excluded | Versioned envelope types | Exact object-level fields and literals | Verified | Test-only, not native input |
| Closed structural parser | Fail closed at raw JSON and in-memory boundaries | `parseLegacyProfileProjectionEnvelopeV1Structure` | Unknown/missing/type/literal/path matrix | Verified | Grants no trust |
| Descriptor/resource safety | Reject accessors and bounded traversal | Descriptor inspection and M1B-aligned limits | Nested/array getters, depth, nodes, containers | Verified | None within parser scope |
| Duplicate JSON keys | Reject decoded duplicates before parsing | Shared duplicate-key scanner | Escaped keys, sibling scopes and syntax | Verified | JSON boundary only |
| Structural/semantic/hash brands | Progressive envelope and nested M1B brands | Separate parser, validator and verifier | Compile-time and runtime brand stages | Verified | No trusted/executable brand |
| Semantic source binding | Exact three-profile identity/hash allowlist | Profile-local fixture table and source hashes | Identity/hash mutation matrix | Verified | No external profiles |
| Projected native binding | Complete expected native contract per profile | M1B parser/validator and closed expected projection | Full native mutation matrix | Verified | No execution parity yet |
| Compatibility declarations | Exact, closed and hashed | Compatibility projection excluding only its hash | Per-field negative coverage | Verified | Compatibility is not native semantics |
| Driver-ID mapping | Exact 18 mappings | Twelve conversions and six identities | Missing/extra/mismatch/collision tests | Verified | Closed to these profiles |
| Actions/admission | Native actions are supported actions with modeled effects | Exact native and excluded inventories | RE/MU/CO action-set tests | Verified | Gap actions require M1D parity |
| Six gap tuples | Six occurrences over four undeclared IDs | RE ignored tuples; MU/CO ignored action effects | Exact tuple mutation coverage | Verified | Deliberate legacy compatibility |
| MU/CO `congestion_pricing` | Compatibility-only; never native zero-effect action | One declaration per MU/CO | Exact action/effect tests | Verified | Differential behavior remains M1D |
| `liquidityPressure` evidence | Source evidence must remain explicit | Compatibility tuples/edge evidence | Exact source IDs and positions | Verified | Not a native driver |
| Adapter-local `liquidity-pressure` | Allowed only in compatibility edge evidence | Stable adapter-local endpoints | StableId and leakage tests | Verified | No native contamination |
| Native propagation | Only declared-driver endpoints | Exact native edge sets/IDs | Full order/endpoints mutation matrix | Verified | Execution parity remains M1D |
| Compatibility propagation | Preserve omitted liquidity edges separately | Exact RE/CO three edges, MU zero | Evidence fields and occurrence positions | Verified | Must be honored by M1D harness |
| Legacy evaluation order | Semantically significant | `sourceEvaluationOrder` with positions | Reorder/missing/extra/cross-profile rejection | Verified | Cannot be canonicalized away |
| Constraints/reachability | Project only reachable refinancing | RE/CO native; MU none; exclusions hashed | Constraint and exclusions mutation tests | Verified | Runtime parity remains M1D |
| Sustain threshold | Source-local declaration, not native input | RE/CO declaration; MU `null` | Declaration and language-level comparison characterization | Verified | Actual runtime equivalence is M1D |
| Structural Margin | Expressible as native named measure | Four exact terms, recovery, range, escalation | Complete measure mutation coverage | Verified | Differential numeric parity remains M1D |
| Curves/generated IDs | Eighteen driver-owned valid curves | IDs from projected drivers; edges from endpoints | Parameters, amplitudes, ownership and ID tests | Verified | Fallback remains M1E |
| Binary64 bands | Native bands represent legacy thresholds exactly | `0.5000000000000001`, `1.5`, `2.5` boundaries | Neighbor and clamp tests | Verified | No hash-policy change |
| Four hash domains | Reuse M0B/M1B projections only | Named source/projected/compatibility/envelope paths | Independent reproduction and mutation sensitivity | Verified | Raw envelope is representation-sensitive |
| Diagnostics | Derived, deterministic and outside raw hashes | Separate frozen diagnostics result | Exact code/path/message and ordering | Verified | Not caller-authored |
| Detachment/freeze | Every successful stage detached/frozen | Recursive clones/freezes | Mutation/nonmutation/repeat tests | Verified | No persistence adoption |
| Fixture reproducibility | Exactly three checked-in readable fixtures | Deterministic M1C-3 adapter output | Fixture equality, bytes and SHA-256 | Verified | Fixtures are evidence, not runtime config |
| Collision detection | Reuse M1B canonical tuple validator | Hash-verified projected contracts | Idempotence, versions and conflicting hash | Verified | No registry created |
| Native order neutrality | M1B set-like policy applies | M1B semantic identity projection | Full-envelope neutral permutations | Verified | `levels[]` is rank ordered |
| Raw-envelope representation | Whole raw verified envelope is hashed | M0B canonical representation | Neutral native permutation changes envelope hash | Verified | Deliberate documented sensitivity |
| Field accounting | No unlisted source drop/default | Closed source-field accounting table | Exact enumerable field families | Verified | Algorithm-wide behavior belongs to later gates |
| Forbidden surfaces | No runtime/trust/registry/execution adoption | Isolated analysis test support | Import/symbol and commit-scope searches | Verified | All adoption gates remain closed |

## 4. Exact profile inventory

Counts were read from the committed fixtures and checked through the validators, not copied from the design target.

| Profile | Native drivers | Native actions | Native edges | Compatibility edges | Excluded actions | Native constraints |
|---|---:|---:|---:|---:|---:|---:|
| RE (`legacy-real-estate-v1`) | 18 | 8 | 17 | 3 | 7 | 1 |
| MU (`legacy-municipal-v1`) | 18 | 6 | 3 | 0 | 8 | 0 |
| CO (`legacy-consulting-v1`) | 18 | 9 | 17 | 3 | 5 | 1 |

Exact unsupported complements are:

- RE: `congestion_pricing`, `electrify_bus_fleet`, `expand_cycling_infrastructure`, `increase_service_frequency`, `reduce_parking_supply`, `reduce_travel_time`, `transit_signal_priority`.
- MU: `delay_maintenance`, `early_refinancing`, `energy_retrofit_program`, `increase_liquidity_buffer`, `phase_project_starts`, `reduce_leverage`, `secure_long_term_leases`, `stagger_project_starts`.
- CO: `energy_retrofit_program`, `increase_liquidity_buffer`, `reduce_leverage`, `secure_long_term_leases`, `stagger_project_starts`.

## 5. Identity and ID evidence

Source-to-native domain mapping is `realEstate` → `real-estate`, `municipal` → `municipal`, and `consulting` → `consulting`. Projected profile/model/calibration identities are separately versioned and hash-bound.

The closed driver map contains exactly 18 rows: 12 camelCase source IDs map to kebab-case native IDs and six already-valid IDs remain identity mappings. Action IDs, including underscores, are preserved. Curve IDs are `legacy-curve-v1.<projectedDriverId>`. Native edge IDs derive from projected endpoints; compatibility edge IDs use adapter-local endpoints and their own namespace.

Every applicable namespace uses M1B's exact StableId rule:

```text
^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$
```

Tests validate native drivers, actions, curves, native edges, compatibility edges and permitted adapter-local `liquidity-pressure` separately, including per-namespace collision freedom and rejection of an ID beginning with a digit. They do not incorrectly require global uniqueness between typed namespaces. None of the 12 camelCase source driver IDs occurs in native `semanticPayload`, and native drivers contain neither `liquidityPressure` nor `liquidity-pressure`.

## 6. Gap and compatibility evidence

The six exact gap occurrences span `implementationPacingRisk`, `liquidityPressure`, `modal_shift_pressure` and `political_feasibility`:

- RE `stagger_project_starts` ignores `{ implementationPacingRisk: -1 }`.
- RE `increase_liquidity_buffer` ignores `{ liquidityPressure: -1 }`.
- MU and CO each declare compatibility-only `congestion_pricing` with exactly `modal_shift_pressure: +2` and `political_feasibility: -1`.

No native no-op action and no fabricated native driver was created. The compatibility layer separately preserves exact support complements, driver mappings, evaluation order, and three RE plus three CO liquidity-edge occurrences. Each compatibility edge binds source/target evidence, projected/adapter-local endpoints, source and edge positions, occurrence position, level semantics and generated compatibility edge ID.

Excluded constraint inventory is exact and hash-bound:

| Source path | Profiles | Source-value hash | Reason |
|---|---|---|---|
| `constraints.RefinancingConstraint` | MU | `sha256:875126baf72ca3012509241c9aa5956eb7b28634d419de8ee462bcd1760851b1` | `profile-constraint-disabled` |
| `constraints.LiquidityConstraint` | RE/MU/CO | `sha256:b4ee3ecb27eef4f18792f73cffa47ab9cc55113b2dcb67b136c12b283d40a600` | `no-public-activation-transition` |
| `constraints.CovenantConstraint` | RE/MU/CO | `sha256:38393ab946cb354edacbefeee830f3aa27a04028abbf521de462245efc0ffc43` | `no-public-activation-transition` |
| `constraints.Custom` | RE/MU/CO | `sha256:df6dcffe8835027599e597a8d3ad19b8a1eaa7fbe98cb07de12ff82327ade9e2` | `inert-global-registry-member` |

The curve fallback declaration is explicit, compatibility-only and `deferred-to-m1e`; it is not empirical fallback proof.

## 7. Hash and fixture register

| Profile | Source hash | Projected hash | Compatibility hash | Envelope hash | Fixture SHA-256 |
|---|---|---|---|---|---|
| RE | `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` | `sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99` | `sha256:751fef9a3384efec184e0c83971b963efa3779b5d7aafeca1cae988223c70c50` | `sha256:27576f25895e0189fc33ab38e1572c0324ec9a9365f87041eecc46f8f343d855` | `5bbed9ce5b152ac9e09a0a89e606fe0130cb0a0684538ccb860cccf3d3e0b71c` |
| MU | `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` | `sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99` | `sha256:41e5d32fdc302fc39a432358692169464fe0b2b85537d9549ae4999832680de8` | `sha256:d682421748ee83d20bee3b4562bb993b0bf17cef291d8cb4325e565af854fcbd` | `76f05af1f7a1786cfbd481034d65414c7d70c88d03b284c3e29317058dfc7ce0` |
| CO | `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` | `sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529` | `sha256:ec4d42c61c6a0fcb6862153319995f3fa290b7af769bdd47b7ac919f7c6b2395` | `sha256:658381b072c2b0a82a8962ec7519376e997385ac5f02f5b7ee0cab6d7942cc6d` | `316cbc9ad5046710ddff3f17a2c90393c7d03acb470fc97c2f174b90ce020779` |

The source hash is reproduced independently from both the readable M0B fixture and a separate live M0B projection. The projected hash is reproduced from the nested contract after the real M1B structural and semantic boundaries, using the named M1B semantic identity projection and direct M0B hash. The compatibility proof removes only `declarationsHash` and mechanically retains every other top-level field. The envelope proof hashes the complete hash-verified raw envelope. Derived diagnostics are absent from compatibility and envelope projections; neither diagnostics nor an `envelopeHash` field is embedded in raw fixtures. The provenance table is an equality target, never a calculation source. Repeated reads prove fixture bytes unchanged.

## 8. Numeric and order semantics

The projected scale clamps to `[0,3]`. Exact tested materialization includes:

| Input | Level |
|---:|---|
| `0.5` | `low` |
| `0.5000000000000001` | `moderate` |
| `1.4999999999999998` | `moderate` |
| `1.5` | `high` |
| `1.5000000000000002` | `high` |
| `2.4999999999999996` | `high` |
| `2.5` | `severe` |
| `2.5000000000000004` | `severe` |

Negative values clamp to `low`; `0` is `low`; `3` and values above it clamp to `severe`. `levels[]` remains rank ordered and is not freely set-like. M1B-defined native set-like collections canonicalize order-neutrally, so their projected semantic identity and projected hash remain stable under permitted permutations. Legacy `sourceEvaluationOrder` remains semantic and reordered data is rejected. Because the envelope hash deliberately covers the complete raw representation, that hash changes under an otherwise semantically neutral native array permutation. No hash policy was changed.

## 9. Sustain-threshold boundary

RE and CO have the exact non-null compatibility declaration; MU has `null`. The declaration binds `sourceField: sustainThreshold`, `constraintId: refinancing-constraint`, `acceptedRuntimeType: number-including-non-finite`, `comparison: margin-strictly-below-threshold`, and `applicability: this-envelope-source-only`. The normal native activation threshold for RE/CO is exactly `0.8`; `sustainThreshold` is absent from native `semanticPayload`.

M1C characterizes the declaration and JavaScript comparison behavior at language level only. It does not execute the existing runtime and therefore does not prove runtime equivalence for finite overrides, non-number fallback, `NaN`, or positive/negative infinity. That proof belongs to M1D. Recursive numeric traversal verifies that all three strict-JSON fixtures contain only finite numbers.

## 10. Curve fallback

All 18 valid per-profile curves are projected, with exact ownership, kinds, parameters and amplitudes. Missing configuration and unsupported discriminants are represented only by the versioned deferred compatibility declaration. M1C does not empirically prove the legacy neutral multiplier fallback. M1E must characterize and lock that behavior or approve a reviewed versioned replacement before any runtime switch. This blocks runtime adoption but does not block test-only M1D.

## 11. Test and verification matrix

All commands were run from repository root after creating this audit. Counts are per independent process.

| Verification | Result |
|---|---|
| M1C-3 focus run 1 | 21 tests; 21 passed; 0 failed/skipped/todo/cancelled |
| M1C-3 focus run 2 | 21 tests; 21 passed; 0 failed/skipped/todo/cancelled |
| M1C-2a/M1C-2b | 35 tests; 35 passed; 0 failed/skipped/todo/cancelled |
| M1B-1/2/3 | 68 tests; 68 passed; 0 failed/skipped/todo/cancelled |
| M0B test-support/canonicalization | 50 tests; 50 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 1 | 82 test files; 723 tests; 723 passed; 0 failed/skipped/todo/cancelled |
| Full regression run 2 | 82 test files; 723 tests; 723 passed; 0 failed/skipped/todo/cancelled |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Scoped M1C ESLint | Passed over every TypeScript file in `domainModelContractV1`, with `--max-warnings 0` |
| Diff, whitespace and document structure | Passed: diff check, trailing whitespace, one terminal newline, headings, fences and table columns |

The exact full-regression command is:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

Inventory uses both suffixes and contains 82 test files.

## 12. Remaining risks and stop conditions

M1C does not prove differential execution, output equivalence between the legacy runtime and projected-contract execution, parity for gap actions, actual sustain-override runtime equivalence, or the M1E curve fallback. It creates no trusted registry, executable contract, runtime switch, persistence adoption, UI/deployment path, or historical case implementation.

The next gates are mandatory:

1. M1D must use the existing M1B/M1C semantic projections and hashes; no alternative identity path is allowed.
2. M1D must feed the legacy and projected paths the same controlled input.
3. M1D must compare complete relevant output, trajectory, terminal state, Structural Margin, constraints, cascades and provenance against the M0B baseline.
4. M1D must preserve compatibility graph/order without fabricating native `liquidity-pressure`.
5. M1D must test finite, non-number, `NaN` and positive/negative infinity sustain cases against the actual legacy runtime.
6. M1D cannot grant trust, registration, executability or runtime adoption.
7. M1E fallback proof must pass before the first runtime switch.
8. Every difference must be classified as an implementation bug, explicit legacy compatibility, or a reviewed versioned contract delta.
9. No fixture or Golden may be rewritten to hide a mismatch.

Any violation is a stop condition. An unexplained differential blocks completion of M1D.

## 13. Recommended next checkpoint

**M1D: test-only differential execution harness**

M1D should cover all three profiles, neutral and stressed/scheduled inputs, identical controlled inputs to legacy and projected/adapter paths, exact comparison of existing output boundaries, compatibility-specific cases, and actual sustain runtime cases. It must not introduce trust, a registry, production execution or a runtime switch.

M1D and M1E remain separate: M1D owns normal differential execution plus compatibility/order/sustain parity; M1E owns missing/unsupported curve fallback characterization or an explicitly reviewed versioned replacement.

## 14. Final boundary

M1C has established a complete, deterministic, closed and independently verified projection evidence layer for the three legacy profiles. It remains isolated test support. With the final verification matrix above passing, the executive conclusion remains controlling.

No M1C result is trusted, registered, executable, persisted, UI-visible, externally ingestible or deployed.
