# Domain Model Contract M1B completion audit

- Date: 2026-09-14
- Repository: `/Users/christian/Projects/pulse_engine_clean`
- Branch: `decision-flow-demo-v1`
- Audited HEAD: `9146ad8e8660787aa87573d74d03b993bd28a870`
- Remote: `git@github.com:SneakyMoccasin/01systems-site.git`

## 1. Executive conclusion

**VERIFIED — M1B COMPLETE. READY FOR NEXT DOCUMENTED CHECKPOINT.** The test-only native Domain Model Contract V1 implementation matches the final M1A ownership and schema design for M1B: it provides a bounded strict structural boundary, closed semantic validation, canonical semantic identity projection and hash verification, plus pure collision validation. The result remains untrusted, unregistered and non-executable.

The next documented checkpoint is **M1C legacy adapter/projection**, identified explicitly in M1A section 12. M1C is limited to a test-support adapter and exact projections for the three legacy profiles. This conclusion authorizes beginning that checkpoint only; it does not authorize runtime selection, external ingestion, trust registration, persistence adoption or deployment. M1D differential execution, M1E curve-fallback resolution and all first-runtime-switch gates remain mandatory.

No audit stop condition fired. Repository identity and history matched, the initial working tree was clean, the fixture hash reproduced, both full regressions passed deterministically, and no implementation defect, runtime adoption or M0B change was found.

## 2. Provenance and method

The audit began with a clean working tree. The repository root, branch, HEAD and remote matched the values above. Each required checkpoint is an ancestor of audited HEAD:

| Checkpoint | Commit | Verified history content |
|---|---|---|
| M1A | `b73183408071bd583dafefb2a502cf819ea84b79` | Added only the M1A design audit |
| M1B-1 | `b172434e45acbbcc69bb656ed45cc803a9eeba2f` | Structural model, limits, strict parsers, fixture and focused tests |
| M1B-2 | `14ece8113965e29fc9329e730f1ac74de476c083` | Semantic validator, semantic brand and focused tests |
| M1B-3 | `9146ad8e8660787aa87573d74d03b993bd28a870` | Predicate projection, semantic identity/hash pipeline, collision validator and focused tests |

Evidence was read from the complete M1B directory, the final M1A audit, the M0B canonicalizer and its focused tests, commit scopes, repository-wide import searches and the test outputs recorded below. `git diff b7318340..HEAD` contains only files under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/`; M1B did not modify runtime, M0B fixtures, Goldens, manifests, package files or earlier audits.

## 3. M1B-1 structural boundary

**VERIFIED.** `contractV1.ts` defines the complete closed native V1 model: exact schema/protocol identity, scales and levels, drivers, impacts, actions, propagation, dimensions, supported curves, recursive predicates, constraints, the closed measure/source/transform/update registries, escalation rules and optional presentation metadata.

**VERIFIED.** `parseDomainModelContractV1Structure` and `parseDomainModelContractV1StructureJson` are separate in-memory `unknown` and raw JSON boundaries. Both converge on the same structural validator; JSON text additionally crosses the duplicate-key scanner before `JSON.parse`.

The focused suite verifies:

- closed objects reject unknown and missing fields at every schema level;
- exact versions, discriminants, IDs, strings, finite JSON numbers and local numeric constraints;
- descriptor inspection rejects accessors without invoking getters, including array-index getters;
- non-enumerable fields, symbol keys/values, functions, bigint, `undefined`, negative zero, non-finite numbers, class instances, cycles, sparse arrays and extra array properties;
- raw duplicate JSON keys, including escaped-equivalent keys, with object-scope awareness;
- RFC 6901 escaping and full deterministic issue paths;
- deterministic sorting by path, code and message;
- detached, recursively frozen success output;
- UTF-8 byte, JSON depth, object depth, total node, container, collection, metadata string, numeric magnitude, integer rank, predicate-depth and predicate-node limits;
- exact-boundary acceptance and fail-closed short-circuiting before unsafe descendant traversal.

The structural output brand establishes only structural validation. It does not expose trust, registry membership, executability or a runtime type.

## 4. M1B-2 semantic validation

**VERIFIED.** Semantic validation operates only on structurally validated data and returns a detached recursively frozen `SemanticallyValidatedDomainModelContractV1` on success. It validates all stable ID namespaces and local duplicate identities before later canonical projection.

The implementation and negative matrix cover:

- scale, level, driver, action, propagation edge, dimension, curve, constraint, measure and term identities;
- driver, scale, level, dimension, curve and measure references at exact paths;
- action-effect identity, adverse/trigger/predicate/aggregate level or driver references, active-effect identity and escalation-rule identity;
- propagation self-edges, duplicate `(sourceDriverId,targetDriverId)` mappings and directed cycles;
- measure self-reference and indirect dependency cycles;
- contiguous unique ranks in author rank order, gap-free/non-overlapping materialization bands, endpoint policy, scale/driver total-range equality, and every level anchor materializing to its own band;
- initial score range and declared initial-level consistency;
- missing versus structurally unsupported curves;
- referenced curves reusable across multiple impacts or dimensions within one driver, but never shareable between different drivers;
- complete amplitude coverage for each referenced curve against its unambiguous owner driver's scale; an unused curve definition receives no M1B-2 owner and its amplitudes are therefore not checked against any driver's scale;
- driver impacts unique by `dimensionId` within each driver;
- recursive activation/sustain/deactivation predicates, threshold/reference validation, lifecycle transition uniqueness/self-transition rules, activation reachability and active effects;
- measure values/ranges, closed term sources and transforms, escalation thresholds and references;
- escalation transitions as a deterministic partial function with unique `fromLevelId` and strictly higher destination rank;
- `supportedActionIds` derived exactly from `actions`, with no parallel stored list.

`DOMAIN_MODEL_CONTRACT_V1_SEMANTIC_ISSUE_CODES` contains exactly 45 unique publicly reachable codes. The coverage table is asserted equal to that complete union. It includes `duplicate-predicate-child`; canonical-equivalent children are rejected before the full semantic identity projection, and both first and later `/predicates/{index}` paths are reported deterministically.

## 5. M1B-3 canonical semantic identity

### 5.1 Projection and ordering

**VERIFIED.** `DomainModelContractSemanticIdentityProjectionV1` includes exactly:

- `schemaVersion`;
- `engineProtocolVersion`;
- `identity.domainId`, `profileId`, `modelVersion` and `calibrationVersion`;
- the complete `semanticPayload`.

It excludes the declared `identity.semanticPayloadHash`, metadata/presentation, timestamps, source/review information, trust/registry state, execution input and persistence. Projection output is detached and recursively frozen.

Stable ordering is explicit and code-unit based:

| Collection | Canonical key/order |
|---|---|
| scales | `scaleId` |
| scale levels | ascending `rank`, then `levelId`; invalid author rank order rejects before projection |
| drivers | `driverId` |
| adverse levels | lexical level ID |
| driver impacts | `dimensionId`, `direction`, `curveId` |
| actions | `actionId` |
| action effects | `driverId` |
| propagation edges | `sourceDriverId`, `targetDriverId`, `propagatedLevelId`, `edgeId` |
| trigger levels | lexical level ID |
| dimensions | `dimensionId` |
| curves | `curveId` |
| constraints | `constraintId` |
| lifecycle transitions | `from`, then `to` |
| active effects | `dimensionId` |
| measures | `measureId` |
| measure terms | `termId` |
| aggregate driver references | lexical driver ID |
| escalation rules | `driverId`, then M0B-canonical numeric `whenBelow` |
| escalation transitions | unique `fromLevelId` |
| `driver-at-level.levelIds` | lexical level ID |
| `all`/`any` children | M0B canonical JSON of recursively projected child |

The M1B-3 suite uses semantically valid collections with at least two distinct entries and independently permutes every row above except scale levels, which are deliberately not freely author-order-neutral. Each case proves equal projection, canonical bytes and hash without input mutation. Reversed scale levels instead fail semantically with `rank-order-mismatch`; projection cannot hide the defect.

### 5.2 Recursive predicate decision

**VERIFIED.** `all` and `any` are order-neutral and remain distinct kinds. `driver-at-level.levelIds` is set-like. Child predicates are recursively projected and sorted by their M0B canonical JSON bytes using code-unit comparison. The implementation preserves nesting and performs no flattening, boolean algebra, De Morgan transformation, absorption or other logical simplification.

The focused evidence proves `all(A,all(B,C))` differs from `all(A,B,C)` with three distinct predicates. Two sibling predicates that become canonical-equal after normalization of `driver-at-level.levelIds` or recursive child order are rejected as `duplicate-predicate-child` before the full projection. Reordering distinct, non-duplicate children alone is order-neutral and accepted. The predicate tree is still neither flattened nor simplified.

### 5.3 Canonical JSON, hash and parser pipeline

**VERIFIED.** M1B imports and reuses only M0B `canonicalizeBaselineValueV1` and `hashBaselineValueV1`; it contains no competing general canonical JSON or hash algorithm and no `localeCompare` dependency. The composed raw JSON and in-memory pipelines preserve structural and semantic failures before hash verification:

`raw JSON/in-memory unknown → structural validation → semantic validation → canonical semantic projection → declared-hash verification → hash-verified brand`

A mismatch fails closed with code `semantic-payload-hash-mismatch` at `/identity/semanticPayloadHash`. Success is detached and recursively frozen. The resulting brand remains explicitly untrusted and non-executable.

The synthetic fixture's independently recalculated and repeated projection hash equals both the explicit test constant and declared fixture value:

`sha256:1fbecc460b0e0203386224e0b824aa4c766a42c5e7cd261c2e2827dffb8443f6`

Metadata-only and object-insertion-order changes preserve the hash; semantic changes alter it. Two repeated canonicalization/hash calls are identical.

### 5.4 Pure identity collision validation

**VERIFIED.** The collision key is M0B canonical JSON over this ordered, versioned tuple:

`[schemaVersion, engineProtocolVersion, domainId, profileId, modelVersion, calibrationVersion]`

No delimiter-based identity key remains. Control characters, NUL placement, quotes, backslashes and JSON-escaped characters pass the full parser/hash pipeline without creating false tuple collisions.

The validator is a pure grouping operation over already hash-verified inputs. A tuple with one unique hash is accepted; repeated identical tuple/hash bindings are idempotent; two or more hashes for one tuple mark every involved input path exactly once. Tests cover A/A, A/B, A/B/B, A/B/C, reversed input, separate model/calibration versions and metadata-only changes. Issues retain deterministic path/code/message sorting. No registry, last-write-wins behavior, trust grant, execution or mutation exists.

## 6. Architecture and scope

**VERIFIED.** Repository-wide searches found no import of `analysis/testSupport/domainModelContractV1` outside that directory. M1B imports only test-support dependencies, principally the M0B canonicalizer; it does not import a trusted registry or executable runtime.

Commit-scope inspection confirms:

- no production/runtime, profile, UI, persistence or deployment file changed;
- no M0B fixture, Golden, manifest, canonicalizer or locked M0B hash changed;
- no existing audit changed;
- the legacy runtime and all existing execution surfaces remain unchanged;
- M1B remains isolated test support and cannot make a contract executable.

Occurrences of “trusted” and “executable” inside M1B are negative compile-time/runtime architecture assertions. They are not capabilities or brands granted by the implementation.

## 7. Regression and determinism evidence

The complete repository suite used the same command in two independent processes:

```sh
find app src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z | xargs -0 node --import tsx --test
```

The inventory contained 78 test files.

| Check | Full run 1 | Full run 2 |
|---|---:|---:|
| Test files | 78 | 78 |
| Tests | 667 | 667 |
| Passed | 667 | 667 |
| Failed | 0 | 0 |
| Skipped | 0 | 0 |
| Cancelled | 0 | 0 |
| Todo | 0 | 0 |
| Duration | 3490.306 ms | 3567.477 ms |

Counts and outcomes are identical. Wall-clock duration is intentionally not a deterministic semantic result. Both runs emitted the repository's pre-existing React warning about a boolean `jsx` attribute in `MarginGraph`; it did not fail a test and M1B neither introduces nor changes that runtime component.

Focused and static verification:

| Check | Result |
|---|---:|
| M1B-1 structural suite | 22/22 passed |
| M1B-2 semantic suite | 18/18 passed |
| M1B-3 identity suite | 28/28 passed |
| M0B test-support/canonicalization | 50/50 passed |
| TypeScript, `tsc --noEmit --incremental false` | passed |
| ESLint, all M1B `*.ts`, zero warnings allowed | passed |
| `git diff --check` before report | passed |

## 8. What M1B proves

M1B proves that hostile raw JSON and in-memory values can cross a bounded, descriptor-safe, deterministic structural boundary; that structurally valid V1 data can be checked against the locked native semantic graph; that accepted semantic identity is canonical and author-order-neutral exactly where specified; that its declared hash can be verified without granting trust; and that identity/hash collisions can be detected purely and deterministically.

It also proves that the native V1 schema can represent a domain-neutral synthetic contract, reject the locked invalid states, preserve input immutability, and remain isolated from the legacy runtime and all production selection paths.

## 9. What M1B does not prove

M1B does not prove:

- legacy Real Estate, Municipal or Consulting projection completeness;
- behavioral parity between a contract-backed executor and the current runtime;
- resolution of supported-action/applicable-driver gaps, `sustainThreshold`, graph compatibility or Structural Margin adapter semantics;
- preservation or deliberate replacement of the legacy missing/unsupported-curve neutral fallback;
- trust review, registry policy, supported-pair registration or external-ingestion safety beyond parsing;
- runtime execution, persistence compatibility, UI behavior under contract-backed execution or deployment readiness;
- business correctness of any future external domain package.

Structural, semantic and hash validity remain necessary but insufficient for trust or executability.

## 10. Remaining risks and stop conditions

The M1A/M0B risks remain active:

1. M1C must inventory and project every result-affecting value for all three legacy profiles without unlisted drops or defaults.
2. The exact compatibility representation for supported-action/driver gaps and `sustainThreshold` must be explicit; it may not leak into native V1 semantics.
3. Structural Margin projection may require an explicitly legacy-only versioned measure kind if the generic V1 operator cannot reproduce legacy behavior.
4. M1D must differentially prove all six M0B engine Goldens, execution surfaces, provenance, persistence and Structural Observation non-interference. No unexplained numeric, byte, ordering or identity delta is acceptable.
5. M1E must independently characterize missing and unsupported curve fallback and lock the adapter/native rejection split.
6. Before any runtime switch, trusted registration, supported schema/protocol policy, collision protection, immutable lookup and external review boundaries must exist.
7. No runtime checkpoint may rewrite M0B expectations from actual output or introduce a silent fallback.

M1C must stop on any unlisted dropped/defaulted value or absent required gap-policy decision. M1D must stop on any unexplained differential. M1E must stop while fallback ownership remains unresolved.

## 11. Final assessment

The implementation matches the final M1A design for the complete M1B scope. All required safety, semantic, canonicalization, hash, collision, isolation and regression evidence passed. No new product decision is required to conclude M1B or to identify the next documented checkpoint.

**READY FOR NEXT DOCUMENTED CHECKPOINT — M1C legacy adapter/projection.**

This is not readiness for runtime adoption. M1C, M1D, M1E and the documented trust/persistence/runtime gates remain outstanding.
