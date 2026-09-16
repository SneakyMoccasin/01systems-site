# M1E Final Equivalence Harness Implementation Readiness Audit

## 1. Executive conclusion

**A. READY FOR M1E FINAL EQUIVALENCE HARNESS IMPLEMENTATION**

The remaining final-equivalence work is implementable as a new, isolated, test-only M1E boundary. M1C supplies closed, hash-verified profile envelopes; M1D supplies deterministic differential reports with owned comparators, attribution, discrepancies, and report hashes; the completed sustain amendment supplies a non-executable, profile-specific result; and the actual legacy `getImpactMultiplier` function exposes both declared fallback outcomes without a new curve algorithm.

The minimum implementation adds one M1E implementation file and one M1E test file. It changes no M1C file, M1D file, fixture, Golden, manifest, runtime, resolver, UI, persistence, or deployment surface. No new product decision is required.

Final pass is explicitly limited to the declared contract surface. RE and CO sustain exclusion and MU ineligibility may coexist with that pass because sustain parity is outside the declared equivalence surface. Runtime adoption remains prohibited.

## 2. Verified baseline

Repository state was verified at:

```text
60eba9b052c9c474734a1cd841cb56b2b3653726
```

Local HEAD, tracking HEAD, and the actual remote branch were identical, and the index and working tree were clean before this audit file was created.

The verified baseline is:

- M1C is complete for the three closed legacy projection envelopes.
- M1D is complete for its six M0B cases and four action cases.
- the sustain exclusion amendment and its Municipal result-shape correction are complete;
- RE and CO report `excluded-no-authoritative-value`, `forbidden`, and `excluded-from-final-equivalence`;
- MU reports `ineligible-no-declaration` with no `execution` or `claim` property;
- no numeric sustain input or execution semantics exist;
- curve fallback remains a separate M1E boundary;
- no production module imports M1D test support and no runtime adoption is authorized.

The six M1D source files remain:

1. `buildLegacyCompatibilityExecutionPlanV1.ts`
2. `differentialExecutionV1.ts`
3. `domainModelDifferentialV1.test.ts`
4. `executeVerifiedNativeProjectionV1.ts`
5. `runCompatibilityCounterfactualV1.ts`
6. `runDomainModelDifferentialV1.ts`

## 3. Authoritative inputs

### 3.1 Inputs M1E may consume

| Artifact | Existing owner | M1E treatment |
| --- | --- | --- |
| Raw M1C envelope | M1C fixture/projection boundary | Re-run structural parsing, semantic validation, compatibility-hash verification, and envelope-hash verification internally |
| Parsed M0B input | Existing baseline fixture parser | Parse internally; reject identity or case mismatch |
| M1D differential report | `runDomainModelDifferentialV1` | Reproduce internally from verified envelope and parsed case; recompute its report hash |
| Actual legacy observation | M1D report | Consume unchanged inside the recomputed report |
| Pure-native observation | M1D report | Consume unchanged inside the recomputed report |
| Compatibility-effective observation | M1D report | Consume unchanged inside the recomputed report |
| Comparator A | M1D report | Preserve status and discrepancies; derive a canonical comparator-content hash in M1E |
| Comparator B and attribution | M1D report | Preserve exact content; independently require `pass`, empty discrepancies, and full M1D-owned attribution; derive a canonical content hash |
| Normalized legacy engine-core reconstruction | M1D action boundary | Preserve only in the existing action-report evidence; never relabel it as actual runtime output |
| Sustain result | `evaluateSustainThresholdV1` | Recompute internally from the verified envelope and compare with the profile disposition |
| Curve fallback declaration | Verified M1C envelope | Bind witnesses to its exact policy, trigger order, multiplier, compatibility hash, and envelope hash |
| Legacy fallback implementation | `curveConfig.ts::getImpactMultiplier` | Execute directly through the private M1E witness boundary |

The public M1E entry point accepts untrusted raw envelope and case data, not a caller-supplied verified brand, M1D report, hash, comparator status, classification, attribution, emitter, curve result, sustain result, or final status. Verified values are created or reproduced only inside the boundary.

### 3.2 Independent reproduction

M1E must independently:

- re-run every M1C verification stage;
- parse and identity-bind each of the six existing M0B cases;
- invoke M1D for each case rather than accepting a supplied report;
- recompute each M1D report hash from content excluding `reportHash`;
- hash Comparator A and Comparator B content using the existing canonical baseline hash;
- execute both curve fallback witnesses for every profile;
- invoke the existing sustain evaluator and bind its exact shape to the verified disposition;
- derive final status, final discrepancies, and the final report hash.

M1E must not reproduce the internal algorithms of Comparator A, Comparator B, attribution, normalized reconstruction, or sustain evaluation.

## 4. Curve fallback witness design

### 4.1 Closed trigger and result types

The trigger union is exactly:

```ts
type CurveFallbackTriggerV1 =
  | "missing-curve-configuration"
  | "unsupported-curve-discriminant";
```

Each profile has exactly two witnesses, in the declaration's `appliesTo` order. A witness is bound to:

```ts
type CurveFallbackWitnessV1 = Readonly<{
  version: "legacy-curve-fallback-witness-v1";
  profileId: string;
  trigger: CurveFallbackTriggerV1;
  declarationPath: "/compatibility/curveFallbackDeclaration";
  policyId: "legacy-neutral-multiplier-v1";
  parameterKey: string;
  sourceSemanticPayloadHash: string;
  projectedSemanticPayloadHash: string;
  compatibilityDeclarationsHash: string;
  envelopeHash: string;
  expectedMultiplier: 1;
  actualMultiplier: number;
  status: "pass" | "fail";
  discrepancies: readonly FinalEquivalenceDiscrepancyV1[];
}>;
```

The source identity is bound by the source semantic hash and profile ID. The projected identity is bound by the projected semantic hash. The compatibility identity binds the declaration and its exact ordered triggers. The envelope hash binds the complete verified envelope.

No witness claims that an ordinary M0B case reached fallback. The report records `coverageKind: "isolated-synthetic-legacy-runtime-witness-v1"` at the profile-witness collection boundary. The six normal M0B cases remain separately identified as non-fallback differential observations.

### 4.2 Missing-configuration witness

The private witness selects a real profile-bound source parameter key, removes only that key from a detached curve-configuration copy, and calls the actual `getImpactMultiplier` function with a declared risk level and step. The expected and actual multiplier are exactly `1`.

The witness records no synthesized level, score, delta, interpolation, dimension result, state mutation, event, or production provenance. Its only output effect is the multiplier observation.

### 4.3 Unsupported-discriminant witness

The unsupported discriminant is not constructible through the production `CurveType` union. A private M1E runtime witness therefore creates a frozen raw configuration with one explicit sentinel discriminant and calls the actual `getImpactMultiplier` using `Reflect.apply`. This avoids `as any`, a fabricated brand, and an alternate evaluator while reaching the existing JavaScript `default` branch.

The raw sentinel is evidence local to the isolated witness. It is never represented as a valid profile, M1C contract, native curve, fixture, Golden, or runtime configuration. The actual and expected multiplier are exactly `1`.

Direct read-only execution confirmed both existing branches:

```json
{"missing":1,"unsupported":1}
```

No private reference adapter is required. The private helper is only an invocation and verification boundary around the real legacy function; it implements no curve, interpolation, clamp, or fallback algorithm.

### 4.4 Profile coverage and ownership

RE, MU, and CO share the same hash-bound policy but require separate profile-bound witnesses because their source, projected, compatibility, and envelope identities differ. Required positive coverage is therefore six witnesses: three profiles multiplied by two triggers.

Only the private curve-witness verifier may emit `curve-fallback-mismatch`. A wrong trigger, multiplier, profile, parameter key, declaration, hash, order, count, freeze state, or provenance binding rejects or fails at that boundary before final status is derived.

## 5. Sustain consumption

M1E invokes `evaluateSustainThresholdV1` with the internally verified envelope. It does not accept a caller-supplied sustain result and does not duplicate the evaluator's status logic.

The exact permitted results are:

| Profiles | Disposition | Required result |
| --- | --- | --- |
| RE and CO | closed exclusion declaration | `excluded-no-authoritative-value`, `execution: forbidden`, `claim: excluded-from-final-equivalence` |
| MU | `sustainThresholdDisposition: null` | `ineligible-no-declaration`, with no `execution` or `claim` property |

M1E binds the complete result shape into its report and report hash. It verifies own-property absence for MU and own-property presence for RE/CO. Status, disposition, shape, profile, compatibility hash, or envelope hash mutation fails the private sustain-binding verifier.

No sustain witness executes. No numeric value, optional numeric input, `0.8` inference, comparison, lifecycle mutation, or parity claim is permitted. Future support remains possible only through a new versioned amendment with an authoritative value source.

## 6. Final equivalence report

### 6.1 Aggregate report shape

The minimum report is one aggregate over all three profiles and all six existing M0B cases:

```ts
type FinalEquivalenceStatusV1 =
  | "pass-declared-contract-surface-v1"
  | "fail-v1";

type DomainModelFinalEquivalenceReportV1 = Readonly<{
  version: "domain-model-final-equivalence-report-v1";
  profiles: readonly FinalEquivalenceProfileEvidenceV1[];
  cases: readonly FinalEquivalenceCaseEvidenceV1[];
  status: FinalEquivalenceStatusV1;
  discrepancies: readonly FinalEquivalenceDiscrepancyV1[];
  reportHash: string;
}>;
```

Each profile entry contains exact profile/domain/version identities, the four M1C hashes, the two ordered curve witnesses, and the exact sustain result. Each case entry contains profile ID, fixture case ID, scenario identity, M1D report hash, actual/pure-native/compatibility-effective observation hashes, Comparator A content hash and status, Comparator B content hash and status, and the unchanged M1D discrepancies and attribution evidence.

The three profile entries use canonical profile order: RE, MU, CO. The six case entries use the closed profile order and, within each profile, neutral then stressed/scheduled. Curve witnesses use the declaration's ordered trigger list. These arrays are semantically ordered and order-sensitive.

Invalid raw input, failed parsing, stale hashes, invalid M1D evidence, or malformed prerequisite evidence rejects before report construction. A validly constructed report may have `fail-v1` when an owned observed comparison or witness fails. The caller cannot select either status.

### 6.2 Hashing and integrity

`hashFinalEquivalenceReportContentV1` reuses `hashBaselineValueV1`. It hashes the complete report content excluding only `reportHash`. Every identity, hash, observation binding, comparator status/hash, attribution, witness field, sustain field, final status, and discrepancy affects the result.

Map-like raw inputs are parsed and projected before hashing. Object insertion order is neutral under the existing canonicalizer. Ordered arrays remain order-sensitive. Duplicate profile IDs, case IDs, witness trigger/profile pairs, discrepancy paths, or attribution paths reject.

The returned report and all nested values are detached from caller inputs and recursively frozen. Repeated construction from identical semantic inputs must produce deep-equal content and an identical report hash, while returning distinct object identities and leaving inputs unchanged.

## 7. Pass rules

Final status is `pass-declared-contract-surface-v1` if and only if all of the following hold:

1. all three M1C envelopes pass structural, semantic, compatibility-hash, and envelope-hash verification;
2. all six M0B inputs parse and bind to their expected profile, case, and scenario identities;
3. all six M1D reports are internally reproduced and their report hashes verify;
4. Comparator A is `pass` with `ok: true` and an exactly empty discrepancy list for every ordinary M0B case;
5. Comparator B is `pass` with an exactly empty discrepancy list for every case;
6. every Comparator B primary difference has complete, unique, exact attribution and there are no missing, extra, duplicate, or before/after-divergent paths;
7. all six required curve fallback witnesses are present once, correctly ordered, identity-bound, recursively frozen, and pass with actual and expected multiplier exactly `1`;
8. each sustain result exactly matches its verified profile disposition and result shape;
9. no M1D `unresolved-design-decision`, `adapter-error`, or `contract-error` discrepancy exists;
10. no M1E-owned discrepancy exists;
11. every derived comparator, observation, witness, and final report hash verifies.

Comparator A not-applicable and actual rejection remain legitimate M1D states for the separate four action cases, but they do not satisfy an ordinary six-case final-pass entry. The action evidence remains mandatory M1D non-regression coverage and is not relabeled or duplicated by M1E.

Sustain exclusion may coexist with final pass. The exact claim is: the declared contract surface is equivalent, curve fallback is verified by isolated legacy-runtime witnesses, and sustain is explicitly outside parity. It is not a sustain-equivalence claim.

## 8. Discrepancy ownership

M1D classifications and discrepancies are embedded unchanged. M1E never rewrites, reclassifies, suppresses, or recreates them.

M1E uses this separate closed kind union only for M1E-owned evidence:

```ts
type FinalEquivalenceDiscrepancyKindV1 =
  | "curve-fallback-mismatch"
  | "sustain-binding-mismatch"
  | "final-report-integrity-error";
```

| Private owner | Permitted kind | Surface |
| --- | --- | --- |
| Curve witness verifier | `curve-fallback-mismatch` | `/profiles/{index}/curveFallbackWitnesses/{index}/...` |
| Sustain binding verifier | `sustain-binding-mismatch` | `/profiles/{index}/sustain/...` |
| Final report integrity verifier | `final-report-integrity-error` | aggregate identity, count, order, duplicate, hash, and freeze failures |

The general discrepancy verifier is private. Callers cannot supply an owner, emitter, kind, classification, path, pass status, or prebuilt discrepancy. Each private owner derives paths and values from independently verified observations.

Paths are absolute RFC 6901 paths with `~` and `/` escaping. Paths are unique and sorted by UTF-16 code-unit order without `localeCompare`. Duplicate or contradictory paths reject. A pass has exactly zero M1E discrepancies; a fail has at least one.

Reserved M1D classifications remain reserved. M1E has no route that emits `known-explicitly-deferred` or `possible-legacy-runtime-defect`.

## 9. Mutation matrix

The test file must cover at least this matrix:

| Family | Required mutations and assertions |
| --- | --- |
| Closed matrix | all three profiles, all six M0B cases, both fallback triggers per profile |
| Witness inventory | missing, extra, duplicate, reordered, wrong trigger, wrong profile, and cross-profile substitution |
| Witness result | multiplier other than `1`, non-finite multiplier, wrong parameter key, wrong policy/path, and changed coverage kind |
| Curve declaration | changed policy, trigger order, trigger value, neutral multiplier, or evidence status |
| Identity binding | independently stale source, projected, compatibility, and envelope hashes |
| M1D report | stale report hash, changed observation, missing/extra observation, and changed version/profile/case/scenario |
| Comparator A | status, `ok`, discrepancy, and comparator literal mutation |
| Comparator B | status mutation, non-empty discrepancy list, changed primary differences, and incomplete or collateral attribution |
| Attribution | missing, extra, duplicate, wrong declaration path, wrong before/after, wrong profile/case, and reordered semantic arrays |
| Sustain RE/CO | changed status/disposition/path, missing execution or claim, ineligible substitution, and numeric injection |
| Sustain MU | excluded substitution, any execution or claim own property, numeric injection, or non-null declaration |
| Final report | version/status/output mutation, missing/extra profile or case, duplicate path, stale report hash, and hash-field self-inclusion |
| Canonicalization | object insertion-order neutrality and ordered-array sensitivity |
| Ownership | caller-supplied brand, hash, pass, classification, attribution, emitter, witness result, sustain result, or discrepancy rejected by API shape |
| Immutability | input nonmutation, detached outputs, recursive freeze, and repeated-run determinism |

The existing six M0B cases and four M1D action cases must continue to pass. No test may claim an ordinary M0B fallback hit. No fallback mutation may be repaired by a default or alternate evaluator.

## 10. Exact implementation scope

Create exactly this directory and two files:

```text
src/pilotFastighet/analysis/testSupport/domainModelFinalEquivalenceV1/domainModelFinalEquivalenceV1.ts
src/pilotFastighet/analysis/testSupport/domainModelFinalEquivalenceV1/domainModelFinalEquivalenceV1.test.ts
```

No existing file needs modification. No new fixture or Golden is needed; tests read the existing three M1C envelopes and six M0B fixtures.

### 10.1 Public exports

The implementation file may export only:

- `CurveFallbackTriggerV1`;
- `CurveFallbackWitnessV1`;
- `SustainFinalEvidenceV1` as the existing evaluator result type or an exact alias;
- `FinalEquivalenceProfileEvidenceV1`;
- `FinalEquivalenceCaseEvidenceV1`;
- `FinalEquivalenceDiscrepancyV1`;
- `FinalEquivalenceStatusV1`;
- `DomainModelFinalEquivalenceReportV1`;
- `hashFinalEquivalenceReportContentV1`;
- one public raw-input entry point, `runDomainModelFinalEquivalenceV1`.

### 10.2 Private helpers

All of these remain private:

- raw envelope and fixture verification;
- legacy curve witness invocation;
- unsupported-discriminant `Reflect.apply` adapter;
- M1D report reproduction and report-hash verification;
- Comparator A/B and attribution prerequisite verification;
- sustain binding verification;
- M1E discrepancy construction and ownership verification;
- final status derivation;
- final report integrity and hash verification.

The implementation reuses the existing M0B canonicalizer, M1C parser/validator/hash chain, M1D runner/report hash, sustain evaluator, and production `getImpactMultiplier`. It must not copy their algorithms.

### 10.3 Forbidden files and artifacts

Do not change any M1C or M1D file. Do not create or regenerate JSON fixtures, snapshots, baselines, Goldens, manifests, generated artifacts, runtime adapters, profile resolvers, UI, persistence, migration, deployment, or Vercel files.

## 11. Stop conditions

Stop implementation without workaround if:

- either fallback trigger cannot be observed through the actual `getImpactMultiplier` implementation;
- a witness requires a new curve algorithm, interpolation rule, clamp rule, or production discriminant;
- M1C or M1D must be modified to make M1E pass;
- a numeric sustain value or sustain execution is required;
- MU gains a sustain declaration, execution, or claim;
- RE/CO lose their exclusion execution/claim shape;
- any M1C identity or hash changes;
- a caller must provide a verified brand, result, pass status, hash, classification, attribution, emitter, or discrepancy;
- M1D evidence must be reclassified or normalized by M1E;
- an ordinary M0B case is falsely reported as fallback coverage;
- a reserved M1D classification must be activated;
- any runtime, trust, registry, persistence, UI, deployment, or production-adoption change becomes necessary;
- any required mutation, determinism, freeze, hash, focus, full-regression, TypeScript, ESLint, or diff check fails.

## 12. Permitted and forbidden claims

### 12.1 Permitted after a passing M1E report

- The declared RE, MU, and CO contract surface is equivalent for the six locked M0B cases under the verified M1D observation and comparator boundaries.
- Both declared legacy fallback triggers deterministically return the hash-bound neutral multiplier `1` in isolated, profile-bound witnesses using the actual legacy function.
- RE and CO sustain is explicitly excluded because no authoritative value exists.
- MU is ineligible and has no sustain execution or claim status.
- Sustain parity is not claimed.
- Actual-runtime observations are distinct from normalized legacy engine-core reconstructions.
- Curve fallback witnesses are distinct from ordinary runtime-case coverage.

### 12.2 Forbidden

- a verified numeric sustain value or sustain parity;
- a claim that sustain executes;
- a claim that `0.8` is the sustain override value;
- a claim that an ordinary M0B case reached curve fallback;
- relabeling normalized reconstruction as actual runtime output;
- general contract trust, registration, or production executability;
- production runtime adoption or switch authorization;
- persistence, migration, rollback, production provenance, observability, security, resource, ingestion, UI, deployment, or Vercel authorization.

## 13. Verification results

| Check | Result |
| --- | --- |
| M1C/M1D focus | 114/114 passed; 0 failed, skipped, todo, or cancelled |
| Full regression | 83 test files; 781/781 passed; 0 failed, skipped, todo, or cancelled |
| TypeScript | `npx tsc --noEmit --incremental false` passed |
| Existing legacy missing-configuration branch | actual multiplier `1` |
| Existing legacy unsupported-discriminant branch | actual multiplier `1` through isolated `Reflect.apply` witness |
| Repository diff check before audit creation | passed |
| Existing repository files | unchanged |

All names in this audit were checked against current source. The proposed M1E names are explicitly new names authorized by this design, not claims that the symbols already exist.

## 14. Residual risks

The isolated unsupported-discriminant witness deliberately reaches a JavaScript default branch that the production TypeScript union cannot construct. Its proof is valid only as a test-only characterization of existing legacy behavior. It must remain private, raw, frozen, and visibly synthetic.

The aggregate report increases mutation-test volume because every semantic field must be hash-sensitive and every ordered collection must have an order mutation. This is implementation effort, not an unresolved design decision.

M1E completion will still require a separate read-only completion audit. Even a passing M1E report cannot authorize runtime adoption or any production integration.

## 15. Final readiness conclusion

**A. READY FOR M1E FINAL EQUIVALENCE HARNESS IMPLEMENTATION**

The current M1C and M1D boundaries provide all authoritative identities, observations, status semantics, attribution, and hashes required by M1E. The two remaining curve fallback cases are directly observable through the existing legacy function, sustain is closed as non-executable evidence, and the final report can be derived without caller authority or new product semantics. Implementation may proceed within the exact two-file test-only scope in section 10.
