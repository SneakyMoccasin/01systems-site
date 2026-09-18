# CE Evidence-Level Architecture — Phase 3 Implementation Architecture and Verification Design

Status: documentation-only checkpoint
Repository: `pulse_engine_clean`
Branch: `decision-flow-demo-v1`
Starting commit: `467ea70315ad2fb820096d9b1db8a6b8c8fefad6`
Phase 3 verdict: **A. READY FOR CHECKPOINTED IMPLEMENTATION**

## 1. Purpose and authorization boundary

This document records the completed Full V2 Phase 3 reference architecture. It
does not authorize implementation, production integration, a V1 adaptation, or
changes to runtime code, tests, fixtures, Goldens, UI, persistence, or profiles.

**No implementation has yet begun. P3.1 is NOT yet authorized by this
checkpoint. Before implementation, the architecture will be compared against
simpler minimum-sufficient alternatives to determine whether Full V2 is
necessary or over-generalized.**

The next task is **MINIMUM-SUFFICIENT ARCHITECTURE COMPARISON**: compare Full V2
against simpler candidate architectures before authorizing P3.1.

## 2. TABLE 1 — MODULE BOUNDARIES

The proposed isolated root is:

`src/pilotFastighet/analysis/evidenceLevelV2/`

| Boundary | Proposed modules | Classification | Import rule |
| --- | --- | --- | --- |
| Public V2 contract | `contract/contractV2.ts`, `contract/discriminantsV2.ts` | NEW V2 ONLY | Types only; no V1 imports |
| Structural parsing | `contract/parseContractV2Structure.ts`, `parseJsonObjectV2.ts`, `duplicateKeysV2.ts` | NEW V2 ONLY | V2 primitives, limits and issues only |
| Semantic validation | `contract/validateContractV2Semantics.ts`, `referenceIndexV2.ts` | NEW V2 ONLY | Parse first; never coerce |
| Canonical representation | `canonical/canonicalJsonV1.ts`, `canonical/canonicalDecimalV1.ts`, `canonical/canonicalOrderV1.ts` | NEW V2 ONLY | Leaf modules; platform primitives only |
| Identity and hash | `identity/hashDomainV1.ts`, `hashCanonicalV1.ts`, `artifactIdentityV2.ts` | NEW V2 ONLY | SHA-256 wrapper only |
| Evidence and calibration | `evidence/evidenceManifestV1.ts`, `validateEvidenceManifestV1.ts` | NEW V2 ONLY | No execution imports |
| Scenario contract | `scenario/scenarioV2.ts`, `parseScenarioV2.ts`, `validateScenarioV2.ts`, `scenarioParametersV1.ts` | NEW V2 ONLY | Validated DMC interfaces only |
| Protocol contract | `protocol/protocolV2.ts`, `protocolLimitsV2.ts`, `unitRegistryV1.ts` | NEW V2 ONLY | No domain-specific imports |
| State/value primitives | `engine/stateValuesV2.ts`, `stateStoreV2.ts`, `quantitiesV1.ts` | NEW V2 ONLY | Pure immutable values |
| Intents | `engine/transitionIntentsV2.ts`, `evaluateIntentV2.ts` | NEW V2 ONLY | Pure |
| Resolvers | `engine/batchResolversV2.ts`, `resolveIntentBatchV2.ts` | NEW V2 ONLY | Pure |
| Predicates | `engine/predicatesV2.ts`, `evaluatePredicateV2.ts` | NEW V2 ONLY | Pure and three-valued |
| Resources | `engine/resourcesV2.ts`, `evaluateResourceClaimsV2.ts` | NEW V2 ONLY | Pure |
| Eligibility/admission | `engine/eligibilityV2.ts`, `evaluateEligibilityV2.ts`, `admitInitiativesV2.ts` | NEW V2 ONLY | Pure |
| Propagation | `engine/propagationV2.ts`, `evaluatePropagationV2.ts` | NEW V2 ONLY | Prevalidated DAG |
| Constraints | `engine/constraintsV2.ts`, `evaluateConstraintsV2.ts` | NEW V2 ONLY | Pure |
| Measures | `engine/measuresV2.ts`, `evaluateMeasuresV2.ts` | NEW V2 ONLY | Pure decimal operations |
| Lifecycle/executor | `engine/periodLifecycleV2.ts`, `executeScenarioV2.ts` | NEW V2 ONLY | Authorized bundles only |
| DecisionSpace | `result/decisionSpaceV2.ts`, `buildDecisionSpaceV2.ts` | NEW V2 ONLY | Projection from authoritative state |
| Result | `result/executionResultV2.ts`, `validateExecutionResultV2.ts`, `resultIdentityV2.ts` | NEW V2 ONLY | Immutable artifact |
| Comparison | `comparison/comparisonPolicyV2.ts`, `compareResultsV2.ts`, `materialityV2.ts`, `convergenceV2.ts` | NEW V2 ONLY | No valuation or UI imports |
| Trust seam | `trust/authorizeExecutableBundleV2.ts`, `trustedRegistryPortV2.ts` | FUTURE INTEGRATION SEAM | Production registry absent initially |
| Fixture support | `testSupport/buildersV2.ts`, `fixtureLoaderV2.ts`, `fixtures/**` | NEW V2 ONLY, TEST ONLY | Never reachable from production roots |
| UTF-8 and SHA-256 | Runtime primitives wrapped inside V2 | SAFE SHARED PURE UTILITY | No shared repository edit |
| Existing `analysis/testSupport/**` | Existing contracts and Goldens | V1 LOCKED | V2 cannot import them |
| `RealEstateEngine.ts`, cascade analysis, persistence, structural observation, legacy profiles, app and UI | Existing runtime | V1 LOCKED | Cannot import V2 before adoption |
| UI selector, persistence adapter, registry binding and migration | Not implemented in Phase 3 | FUTURE INTEGRATION SEAM | Separate adoption checkpoint |

There is no V2 export from an existing `analysis` barrel. No V1-named utility is
reused for V2 semantics.

## 3. TABLE 2 — CANONICAL REPRESENTATION

| Concern | Frozen decision |
| --- | --- |
| Serialization | Canonical JSON encoded as UTF-8 |
| Objects | Keys sorted by normalized UTF-8 byte sequence |
| Arrays | Order preserved unless the schema defines a semantic set |
| Semantic sets | Sorted by canonical identity key; duplicates rejected |
| Strings | NFC required; identifiers also use a strict ASCII grammar |
| Unknown fields | Rejected |
| `undefined`, `NaN`, infinities | Rejected |
| `null` | Rejected unless a specific schema field expressly admits it |
| Optional meaning | Omission or explicit tagged union, never ambiguous `null` |
| Integers | JSON safe integers only and schema-bounded |
| Quantitative values | Canonical decimal strings; never binary floating-point |
| Decimal grammar | `0` or `-?[1-9][0-9]*(\.[0-9]*[1-9])?` |
| Forbidden forms | `+1`, `01`, `.5`, `1.`, `1.0`, `-0`, exponent notation |
| Precision | At most 34 significant digits |
| Scale | At most 18 fractional digits |
| Magnitude | At most 18 integer digits |
| Arithmetic | Signed arbitrary-precision coefficient plus scale |
| Transition rounding | None; required rounding is a failure |
| Measure quantization | Only where declared; round-half-even |
| Overflow/domain error | Deterministic failure; never clamp or wrap |
| String escaping | Minimal JSON escaping for control characters, quote and backslash |
| Hash | SHA-256 over domain-separated canonical bytes |

Canonical decimals are bounded base-10 values represented externally as strings
and internally as coefficient/scale pairs. Semantic quantities must never use a
JavaScript `number`. Excess input scale is invalid. Arithmetic that exceeds a
bound returns `numeric-domain-error`. Only explicitly declared measure
quantization can round; its output scale is identity-bearing.

## 4. TABLE 3 — UNIT REGISTRY

Registry version: `ce-unit-registry-v1`.

| Canonical ID | Dimension/use | Rule |
| --- | --- | --- |
| `1` | Dimensionless ratio/fraction | Percentages are fractions; there is no `%` unit |
| `count` | Discrete count | Scale is zero |
| `model-period` | Protocol-relative duration | Scale is zero |
| `person-hour` | Labor capacity/consumption | Decimal permitted |
| `m` | Length | No implicit conversion |
| `kW` | Power | No implicit conversion |
| `kWh` | Energy | No implicit conversion |
| `currency/AAA` | Currency family | Suffix is exactly three uppercase ASCII letters |

A currency suffix is an opaque denomination token, not a claim of current ISO
recognition. Different suffixes are incompatible. V1 has no aliases, implicit
conversions, prefixes, dimensional derivations, compound units, inflation
adjustment, or exchange rates. Those require a new registry version or a future
explicit conversion declaration.

## 5. TABLE 4 — SCHEMA/DISCRIMINANTS

| Artifact or union | Exact discriminator |
| --- | --- |
| DMC | `schemaVersion: "ce-dmc-v2"` |
| Engine protocol | `protocolVersion: "ce-engine-protocol-v2"` |
| Scenario | `schemaVersion: "ce-scenario-v2"` |
| Evidence manifest | `schemaVersion: "ce-evidence-manifest-v1"` |
| Execution result | `schemaVersion: "ce-execution-result-v2"` |
| DecisionSpace | `schemaVersion: "ce-decision-space-v2"` |
| Comparison policy | `schemaVersion: "ce-comparison-policy-v2"` |
| Comparison result | `schemaVersion: "ce-comparison-result-v2"` |
| State kinds | `nominal-v1`, `ordinal-v1`, `set-v1`, `quantitative-v1` |
| Intents | `named-transition-v1`, `set-value-v1`, `add-member-v1`, `remove-member-v1`, `quantitative-delta-v1`, `quantitative-set-v1`, `no-op-v1` |
| Resolvers | `single-or-conflict-v1`, `identical-result-v1`, `set-membership-merge-v1`, `quantitative-sum-v1`, `explicit-batch-table-v1`, `conflict-on-multiple-v1` |
| Predicates | `all-v1`, `any-v1`, `not-v1`, `state-equals-v1`, `ordinal-at-least-v1`, `set-contains-v1`, `quantity-compare-v1`, `initiative-status-v1`, `period-compare-v1` |
| Resources | `contention-observation-v1`, `exclusive-v1`, `quantitative-capacity-v1` |
| Measures | `identity-v1`, `count-v1`, `sum-v1`, `difference-v1`, `weighted-sum-v1`, `min-v1`, `max-v1` |
| Calibration | `not-applicable`, `uncalibrated`, `calibrated` |
| Result status | `completed`, `failed-validation`, `failed-unresolved` |
| Predicate value | `true`, `false`, `unknown` |

Top-level envelopes carry their own version, semantic ID, revision, applicable
protocol reference, canonical identity and provenance. Cross-version nesting is
rejected rather than adapted.

## 6. TABLE 5 — ALGORITHM INTERFACES

All inputs and outputs are deeply immutable. Mutation is forbidden. Equivalent
canonical inputs must produce byte-identical canonical outputs.

| Function | Input to output | Failure behavior |
| --- | --- | --- |
| `parseContractV2Structure` | bytes/string to structural contract | Structural issues |
| `validateContractV2Semantics` | parsed to validated contract | Semantic issues |
| `canonicalizeArtifactV2` | validated artifact to bytes | Canonicalization issue |
| `hashArtifactV2` | domain plus bytes to digest | Platform hash failure only |
| `validateScenarioV2` | scenario plus DMC to validated scenario | Structural/semantic issues |
| `bindScenarioParametersV2` | scenario plus declarations to bound scenario | Missing/type/range issue |
| `evaluatePredicateV2` | predicate plus read view to truth and trace | Unknown is data, not an exception |
| `evaluateIntentV2` | intent plus state declaration to candidate | Kind/unit/domain issue |
| `resolveIntentBatchV2` | resolver plus ordered candidates to resolved/unresolved | Explicit reason |
| `evaluateResourceClaimsV2` | claims plus availability to observations | Unknown/incompatible unit |
| `evaluateEligibilityV2` | initiative plus read view to report | Unknown is data |
| `admitInitiativesV2` | reports plus policy to admitted/rejected | No partial mutation |
| `evaluatePropagationV2` | DAG plus staged values to staged deltas | Numeric/domain issue |
| `evaluateConstraintsV2` | constraints plus staged view to reports | Unknown/invariant issue |
| `commitPeriodV2` | prior state plus resolved batch to state | Atomic success or failure |
| `evaluateMeasuresV2` | committed state/history to values | Unit/numeric issue |
| `buildDecisionSpaceV2` | committed state plus context to snapshot | Projection issue |
| `executeScenarioV2` | authorized bundle to result | Validation or unresolved result |
| `compareResultsV2` | two results plus policy to comparison | Incompatibility is a result |

The period transaction is: read committed state; derive eligibility; admit;
create intents; resolve every batch; propagate; evaluate blocking constraints;
commit atomically; compute measures; build next-action DecisionSpace.

## 7. TABLE 6 — VALIDATION TAXONOMY

| Category | Stable codes |
| --- | --- |
| Structural | `invalid-json`, `duplicate-json-key`, `missing-field`, `unknown-field`, `invalid-type`, `invalid-discriminant`, `invalid-id`, `invalid-canonical-value`, `unsafe-integer`, `limit-exceeded` |
| Semantic | `unknown-reference`, `duplicate-semantic-id`, `kind-mismatch`, `unit-mismatch`, `invalid-bound`, `invalid-transition`, `resolver-incomplete`, `unsupported-operation`, `dependency-cycle`, `propagation-cycle`, `measure-cycle`, `incomplete-semantics`, `protocol-mismatch`, `identity-mismatch` |
| Trust | `untrusted-artifact`, `unauthorized-issuer`, `unapproved-evidence`, `version-reuse`, `calibration-not-authorized`, `bundle-token-invalid` |
| Execution | `predicate-unknown`, `unresolved-intent-batch`, `numeric-domain-error`, `resource-resolution-error`, `constraint-indeterminate`, `invariant-violation`, `result-limit-exceeded` |
| Comparison | `incompatible-result`, `non-authoritative-result`, `policy-reference-invalid`, `alignment-failure`, `missing-mandatory-facet`, `comparison-indeterminate` |

An issue has `category`, `code`, `artifactVersion`, `canonicalPath`, optional
`semanticId` and `relatedIds`, canonical `context`, and optional diagnostic
`message`. Message text is non-authoritative and excluded from semantic identity.
Issues sort by category rank, canonical path bytes, code, semantic ID and context
bytes.

## 8. TABLE 7 — HARD LIMITS

| Limit | Frozen value |
| --- | ---: |
| Raw DMC | 2 MiB |
| Raw scenario | 1 MiB |
| Raw comparison policy | 256 KiB |
| Raw result accepted for validation | 64 MiB |
| States | 128 |
| Values per nominal/ordinal state | 64 |
| Members per set declaration/value | 256 |
| Named transitions | 512 |
| Initiative types | 256 |
| Scenario initiatives | 256 |
| Dependencies | 1,024 |
| Resources | 128 |
| Claims across an initiative batch | 2,048 |
| Predicate nodes | 2,048 |
| Predicate depth | 8 |
| Predicate children | 32 |
| Propagation nodes/edges | 512 / 2,048 |
| Propagation layers | 64 |
| Constraints | 128 |
| Measures | 128 |
| Periods | 240 |
| Intents for one state/period batch | 64 |
| Explicit resolver rows | 512 |
| Parameter declarations | 128 |
| Events in result | 50,000 |
| Canonical result payload | 32 MiB |

Limits apply before expensive traversal or allocation where possible. A limit
failure cannot return a partial trusted result.

## 9. TABLE 8 — ELIGIBILITY REASONS

| Category and rank | Codes |
| --- | --- |
| Blocking, 0 | `prerequisite-incomplete`, `dependency-unsatisfied`, `predicate-false`, `resource-unavailable`, `capacity-insufficient`, `authorization-missing`, `blocking-constraint`, `cohort-conflict` |
| Unknown, 1 | `predicate-unknown`, `capacity-unknown`, `resource-semantics-unsupported`, `incomplete-semantics` |
| Informational, 2 | `eligible`, `already-terminal` |

Reasons sort by category rank, code and referenced resource/state/initiative ID.
`eligible` and `already-terminal` each appear alone. Unknown never defaults to
eligible. A blocking reason makes an initiative ineligible even if unknown
reasons also exist. Admission accepts only eligible initiatives.

## 10. Scenario parameter language

The closed parameter kinds are `nominal-value-v1`, `ordinal-value-v1`,
`quantitative-value-v1`, `member-id-v1`, and `member-set-v1`. Each declaration
contains an ID, kind, admissible domain, required/optional status, and an explicit
default when optional.

Declared placeholders may affect only initial state, initiative start period,
initiative quantity, resource-claim quantity, intent quantity, predicate
comparison operand, or measure weight. Parameters cannot choose operators,
resolvers, state kinds, evidence basis, hash behavior, or arbitrary object paths.
Binding precedes authorization and participates in scenario identity.

## 11. Unresolved diagnostic serialization

An `unresolved-diagnostic-v1` contains period index, stage, stable code, typed
subject ID, optional resolver ID, canonically ordered candidate intents,
authoritative pre-period state hash, related IDs and canonical context. Each
candidate records its source initiative ID, intent kind, canonical intent hash
and, when applicable, proposed value.

The diagnostic participates in the result hash because it is part of the
semantic failure outcome. The last committed state and history remain
authoritative. Failed-period staged mutations, provisional propagation and
provisional measures are diagnostic only and never committed.

A comparison involving a failed result may compare validated identities, status,
failure point, authoritative shared committed prefix and failure diagnostics. It
must not compare failed-period state as completed state.

## 12. Evidence basis and calibration vocabulary

Each evidence record has exactly one basis from this frozen vocabulary:

- `normative`
- `observed`
- `derived`
- `expert-elicited`
- `synthetic`
- `assumed`

A claim identifies one primary evidence record and may identify supporting
records. Conflicts remain visible.

Calibration is independent and uses exactly `not-applicable`, `uncalibrated`, or
`calibrated`. A calibrated claim needs an authorized calibration record naming
the target, dataset or process, method, date/version, acceptance criteria and
issuer. Evidence presence alone cannot imply calibration. An uncalibrated bundle
can support labelled development/conformance work, but its output is
non-authoritative for decision-evidence claims.

## 13. TABLE 9 — HASH DOMAINS

The exact preimage is:

`ASCII(domain) || 0x00 || ASCII(schema-or-policy-version) || 0x00 || canonical-bytes`

| Artifact | Domain |
| --- | --- |
| DMC semantic identity | `CE:DMC:SEMANTIC` |
| DMC envelope | `CE:DMC:ENVELOPE` |
| Protocol | `CE:PROTOCOL` |
| Scenario semantic identity | `CE:SCENARIO:SEMANTIC` |
| Scenario envelope | `CE:SCENARIO:ENVELOPE` |
| Evidence manifest | `CE:EVIDENCE` |
| Authorized bundle | `CE:EXECUTABLE-BUNDLE` |
| Execution result | `CE:RESULT` |
| DecisionSpace | `CE:DECISION-SPACE` |
| Comparison policy | `CE:COMPARISON-POLICY` |
| Comparison result | `CE:COMPARISON-RESULT` |
| Fixture manifest | `CE:FIXTURE-MANIFEST` |

Domains are never reused. Envelope hashes include provenance and evidence
references. Semantic hashes exclude signatures, storage metadata, display labels
and human messages, while including every execution-affecting field.

## 14. Trust and authorization seam

Validation establishes completeness; authorization establishes whether an exact
artifact may execute in a context. The executor accepts an opaque
`AuthorizedExecutableBundleV2`, never raw DMC and scenario objects.

The authorizer validates DMC, protocol, scenario, evidence and identities; checks
an injected trusted-registry port; creates a module-private runtime token; stores
it in a non-exported `WeakSet`; freezes the bundle; and records verified hashes.
The executor checks token membership and hashes. A TypeScript cast is therefore
insufficient.

Initially only a test authorization provider may exist under V2 test support. A
production registry is absent until the adoption gate. Valuation,
recommendation, optimization and UI interpretation remain outside the seam.

## 15. TABLE 10 — FIXTURE INVENTORY

| Group | Exact fixture IDs | Purpose |
| --- | --- | --- |
| Canonical | `CAN-001-OBJECT-ORDER`, `CAN-002-UNICODE`, `CAN-003-DECIMAL`, `CAN-004-SET-ORDER` | Canonical bytes |
| Units | `UNIT-001-VALID`, `UNIT-002-INCOMPATIBLE`, `UNIT-003-CURRENCY` | Registry semantics |
| States | `STATE-001-NOMINAL`, `STATE-002-ORDINAL`, `STATE-003-SET`, `STATE-004-QUANTITATIVE` | Four state kinds |
| Intents | `INTENT-001-SINGLE`, `INTENT-002-CONFLICT`, `INTENT-003-IDENTICAL`, `INTENT-004-SET-MERGE`, `INTENT-005-SUM`, `INTENT-006-BATCH-TABLE` | Resolver coverage |
| Predicates | `PRED-001-TRUE`, `PRED-002-FALSE`, `PRED-003-UNKNOWN` | Three-valued logic |
| Propagation | `PROP-001-DAG`, `PROP-002-CYCLE` | Order and rejection |
| Scenario | `SCN-001-MINIMAL`, `SCN-002-PARAMETERS`, `SCN-003-INVALID-REF` | Binding and validation |
| Identity | `HASH-001-DMC`, `HASH-002-SCENARIO`, `HASH-003-RESULT` | Golden digests |
| Execution | `EXEC-001-NOMINAL`, `EXEC-002-UNRESOLVED`, `EXEC-003-RESOURCE`, `EXEC-004-ATOMICITY` | Lifecycle |
| DecisionSpace | `DS-001-NEXT-ACTION`, `DS-002-UNKNOWN` | Projection |
| Results | `RESULT-001-COMPLETED`, `RESULT-002-FAILED-VALIDATION`, `RESULT-003-FAILED-UNRESOLVED` | Envelopes |
| Comparison | `CMP-001-EQUIVALENT`, `CMP-002-MATERIAL`, `CMP-003-INCOMPATIBLE`, `CMP-004-FAILED-PREFIX` | Comparison behavior |
| Trust | `TRUST-001-AUTHORIZED`, `TRUST-002-FORGED`, `TRUST-003-UNCALIBRATED` | Trust seam |

Before executor work the minimum Golden set is every `CAN-*`, `UNIT-*`,
`STATE-*`, `PRED-*`, `PROP-*`, `SCN-*`, and `HASH-001/002` fixture. Each positive
fixture has mutations for missing required field, unknown field, wrong
discriminator, duplicate key/ID, unknown reference, wrong unit/kind, limit plus
one, reordered semantic set, noncanonical decimal, altered evidence reference
and version substitution.

## 16. TABLE 11 — IMPLEMENTATION CHECKPOINTS

| Checkpoint | Scope | Required verification | Success/stop rule | Risk |
| --- | --- | --- | --- | --- |
| P3.1 | Canonical modules, limits, issues | Canonical and mutation Goldens | Stop on cross-runtime byte mismatch | Foundational |
| P3.2 | Types and structural parser | Unknown/duplicate/limit tests | No coercion or ignored field | Foundational |
| P3.3 | Semantic validator/index | References, cycles and units | No executable object yet | High |
| P3.4 | Identity and evidence | Domain and Golden hash tests | Review every projection | High |
| P3.5 | Scenario and parameters | Binding and influence tests | No undeclared placeholder | High |
| P3.6 | Trust seam | Forgery and registry tests | Executor remains absent | Security |
| P3.7 | State, intents, predicates, resolvers | Pure property/mutation tests | No lifecycle orchestration | High |
| P3.8 | Resources, eligibility, admission | Permutation and unknown tests | Stable reason ordering | High |
| P3.9 | Propagation, constraints, measures | DAG/order/numeric tests | Atomic staged evaluation | High |
| P3.10 | Lifecycle and executor | Execution, repeatability, atomicity | Authorized bundles only | Very high |
| P3.11 | Result and DecisionSpace | Success/failure serialization | No failed-period authority | High |
| P3.12 | Comparison | Mandatory facets and failures | No silent facet omission | High |
| P3.13 | Complete isolated harness | Full V2/V1 suites and import proof | Isolated evaluation only | Very high |
| P3.14 | Future integration | Separate proposal and approval | Not authorized here | Product-critical |

Each checkpoint is a reviewable commit. Failures cannot be hidden by snapshots,
and Goldens cannot be regenerated without explicit semantic review.

## 17. TABLE 12 — V1 NON-INTERFERENCE GATES

| Gate | Mechanical proof |
| --- | --- |
| Additive paths only | Diff from baseline permits only the V2 subtree, V2 tests and approved audit documents |
| No V1 to V2 imports | TypeScript-resolved graph from every V1/app production entry has zero V2 nodes |
| No V2 to V1 imports | V2 production imports cannot leave the V2 root except for an explicit platform/package allowlist |
| No production fixture import | No production root reaches V2 `testSupport` |
| No barrel leakage | Search and graph prohibit V2 exports from existing barrels |
| Baseline identity | Existing V1 manifest and Golden bytes/hashes remain exact |
| Runtime parity | Existing cascade, scheduled, persistence, structural-observation and preconfigured tests pass |
| Build isolation | Existing typecheck/build passes with V2 unreachable |
| Persistence isolation | Existing readers/writers contain no V2 discriminator |
| UI isolation | No V2 path is reachable from `app/**` |
| Dependency isolation | No new runtime dependency without separate review |
| Performance isolation | Representative V1 performance remains inside accepted noise |

The graph proof uses TypeScript resolution, including aliases and re-exports;
text search is supplementary only. The comparison baseline is
`467ea70315ad2fb820096d9b1db8a6b8c8fefad6`.

## 18. TABLE 13 — STOP GATES

| Stop condition | Evidence required before resuming |
| --- | --- |
| Canonical bytes differ across runs/platforms | Root-cause report and reviewed Golden |
| Semantic quantity reaches `number` | API correction and regression test |
| Unknown field is ignored | Parser correction and mutation test |
| Resolver has an implicit fallback | Explicit semantics and fixture |
| Predicate unknown becomes Boolean implicitly | Three-valued correction |
| Failed period leaks staged state | Atomicity correction and fixture |
| Unresolved diagnostic is not reproducible | Trace/schema correction |
| Hash omits execution-affecting data | Identity redesign and Golden review |
| V1 imports V2 or V2 imports V1 | Remove the edge |
| Production constructs trust brand directly | Redesign trust seam |
| Fixture builder bypasses validation | Redesign test boundary |
| Golden changes without semantic explanation | Reject update |
| Existing V1 suite or Golden changes | Stop; no expected update under isolation |
| Limit cannot be enforced before allocation | Parser architecture review |
| Comparison omits mandatory facet | Fail comparison checkpoint |
| Result exceeds limits | Explicit failed result; no partial evidence |

## 19. Rollback strategy

Before integration, rollback is removal or reversion of the additive V2 subtree
and its audit documents. No migration, shared utility change, persistence field,
route, feature flag or V1 Golden update should exist. Checkpoints remain
individually revertible, contain no mixed V1/V2 refactor, record their baseline,
and keep the previous checkpoint runnable.

After a future integration, rollback first disables its selector/registry entry
and then removes adapters. Stored V2 evidence remains readable even when V2
execution is disabled.

## 20. TABLE 14 — RISK REGISTER

| Risk | Likelihood/impact | Mitigation |
| --- | --- | --- |
| Accidental V1 coupling | Medium/Critical | Separate root and bidirectional graph gates |
| Canonicalization ambiguity | Medium/Critical | Frozen bytes and cross-runtime Goldens |
| Decimal drift | Medium/Critical | No semantic JavaScript numbers |
| Hidden rounding | Medium/High | Rounding prohibited except declared quantization |
| Hash projection omission | Medium/Critical | Field-influence tests |
| Resolver incompleteness | Medium/Critical | Closed unions and exhaustive fixtures |
| Predicate unknown collapse | Medium/High | Explicit three-valued result |
| Nonatomic failed periods | Medium/Critical | Immutable staging and atomicity tests |
| Resource ordering bias | Medium/High | Canonical ordering and permutation tests |
| Parameter adds hidden logic | Medium/High | Closed kinds and influence targets |
| Trust brand forged by casting | Medium/High | Runtime private-token verification |
| Uncalibrated output overclaimed | High/High | Calibration metadata and UI/adoption gate |
| Result/comparison size blow-up | Medium/High | Limits before retention |
| Diagnostic hash instability | Medium/High | Canonical structured diagnostics |
| Golden laundering | Medium/Critical | Manual semantic-delta review |
| Schema/version confusion | Medium/High | Exact discriminants; reject adapters |
| Excessive genericity | Medium/High | Minimal registry and operations |
| Insufficient performance | Medium/High | Bounded fixtures and P3.10 budget |
| Premature integration | Medium/Critical | Integration absent until P3.14 |
| Domain evidence confused with engine validity | High/High | Separate conformance, evidence and calibration claims |

## 21. TABLE 15 — DEVELOPER-EFFORT ESTIMATE

These are developer-effort estimates in developer-days, not calendar
commitments. They include uncertainty but exclude waiting for external domain
evidence.

| Workstream | Implementation | Tests/fixtures | Review | Debug reserve | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Canonicalization, schemas, validation, identity, trust | 20–30 | 18–28 | 6–10 | 8–15 | 52–83 |
| Engine primitives through first neutral execution | 15–25 | 15–25 | 5–8 | 8–12 | 43–70 |
| Result, DecisionSpace and comparison | 15–25 | 18–30 | 6–10 | 8–15 | 47–80 |
| V1 isolation automation | 3–6 | 8–15 | 3–5 | 3–6 | 17–32 |
| Clean MU authoring after foundation | 8–15 | 8–15 | 5–10 | 5–10 | 26–50 |
| Test 01A after conformance | 4–8 | 5–10 | 3–6 | 3–6 | 15–30 |
| Production integration/adoption | 20–40 | 20–40 | 10–20 | 15–30 | 65–130 |

Overall size is **very large**. Architecture risk is moderate, implementation
correctness risk high, V1 regression risk low while isolated and high during
future integration, and product/evidence-misuse risk very high.

## 22. Production adoption gate

Production adoption requires all of the following:

1. P3.1 through P3.13 are complete.
2. Mandatory fixtures and mutation matrices pass.
3. Two independent executions have byte-identical results.
4. Cross-runtime canonical and hash Goldens match.
5. The full V1 suite, manifest and Goldens remain unchanged.
6. Bidirectional import isolation passes.
7. Trust-boundary review finds no raw execution path.
8. Limits and adversarial resource tests pass.
9. A reviewed production registry exists.
10. An approved bundle has adequate evidence and explicit calibration status.
11. Result and comparison claims receive independent review.
12. Persistence and UI changes have separate rollback/migration designs.
13. Performance budgets are accepted.
14. Security and denial-of-service review is complete.
15. An explicit architecture decision authorizes integration.

Until then V2 output may be described only as isolated conformance or
experimental evidence.

## 23. Adversarial implementation review

| # | Attack or failure | Prevention | Detection/checkpoint | Residual risk |
| ---: | --- | --- | --- | --- |
| 1 | Duplicate JSON key changes meaning | Pre-parse duplicate-key detector | P3.2 mutations | Parser defects |
| 2 | Unknown field hides future semantics | Reject unknown fields | P3.2 | Schema review omissions |
| 3 | Numeric spellings hash differently | Canonical decimal grammar | P3.1 | Producer friction |
| 4 | Unicode lookalike IDs | ASCII IDs and NFC strings | P3.1/P3.2 | Human label confusion |
| 5 | Reordering changes semantic hash | Canonical sorting | P3.1 Goldens | Bad set classification |
| 6 | Binary float contaminates quantity | Decimal type/API prohibition | P3.1 type tests | Unsafe casting |
| 7 | Overflow silently clamps | Checked arithmetic | P3.7/P3.9 | Limits too tight |
| 8 | Resolver relies on arrival order | Canonical candidate ordering | P3.7 permutations | Incorrect tie semantics |
| 9 | Unsupported batch picks first | Closed resolver and unresolved result | P3.7 | Authoring burden |
| 10 | Unknown predicate becomes false | Three-valued union | P3.7 | Consumer misuse |
| 11 | Admission depends on map iteration | Canonical ordering | P3.8 permutations | Policy unfairness |
| 12 | Propagation cycle hangs | DAG validation and limits | P3.3/P3.9 | Cost of large valid DAG |
| 13 | Failed period partly commits | Immutable staging/atomic commit | P3.10 `EXEC-004` | Implementation defect |
| 14 | Failed result exposes provisional state | Result schema forbids it | P3.11 | Diagnostic misunderstanding |
| 15 | Comparison treats failure as completion | Status-specific compatibility | P3.12 | User overinterpretation |
| 16 | Cross-version artifact is adapted | Exact discriminator match | P3.2/P3.12 | External adapter misuse |
| 17 | Hash omits semantic field | Field-influence matrix | P3.4 | Coverage gaps |
| 18 | Forged TypeScript brand executes | Private runtime capability | P3.6 | Malicious host process |
| 19 | Uncalibrated result appears authoritative | Calibration metadata/adoption gate | P3.6/P3.11/P3.14 | UI or human misuse |
| 20 | V2 alters V1 through shared helper | No shared-helper extraction; graph/diff gates | Every checkpoint | Future integration risk |

## 24. Final checkpoint statement

Full V2 is a coherent implementation reference and is ready for checkpointed
implementation in architectural terms. This documentation checkpoint preserves
that reference but intentionally withholds implementation authorization.

No implementation has yet begun. P3.1 is not authorized. The next task is the
**MINIMUM-SUFFICIENT ARCHITECTURE COMPARISON**, which must compare this Full V2
design against simpler candidates and determine whether Full V2 is necessary or
over-generalized before any implementation checkpoint starts.
