# M1C Sustain Exclusion Amendment Completion Follow-up

## 1. Executive conclusion

**A. M1C SUSTAIN EXCLUSION AMENDMENT COMPLETE — READY TO RESUME M1E FINAL EQUIVALENCE HARNESS**

The sole blocker recorded by the prior completion audit is closed. Municipal now retains its four applicable evidence fields while omitting `execution` and `claim` entirely. Real Estate and Consulting retain the exclusion result required by the sustain ownership decision.

The correction is limited to the M1D sustain result boundary and its focused test. It changes no M1C contract, parser, validator, fixture, hash, provenance, curve, runtime, comparator, attribution, or discrepancy-classification surface. All required tests and quality checks pass.

## 2. Verified commits

| Role | Commit |
| --- | --- |
| Sustain exclusion implementation | `87683f61ff884a0908866e8493e5cdcea7f68b56` |
| Blocker audit | `d8f5a33d90e3507cc45ac746581233a08102dc56` |
| Municipal result correction | `498019e7af90bc1d6cc237de33c17c6f09c0e0a9` |

The correction commit has exactly the blocker-audit commit as its parent:

```text
d8f5a33d90e3507cc45ac746581233a08102dc56
```

Its content is exactly two modified files:

```text
M src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/domainModelDifferentialV1.test.ts
M src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts
```

Its exact diffstat is:

```text
2 files changed, 51 insertions(+), 9 deletions(-)
```

The production diff adds the closed result union and separates the no-declaration branch from the exclusion branch. The test diff strengthens the existing sustain test. No other file or M1D boundary is changed by the correction commit.

## 3. Closure of prior blocker

The prior audit found that Municipal correctly reported `ineligible-no-declaration` but incorrectly inherited the eligible profiles' `execution` and `claim` properties. The correction introduces an early no-declaration branch and returns a detached, recursively frozen object containing only the four applicable evidence fields.

Direct execution of the verified Municipal fixture produces:

```json
{"declarationPath":null,"status":"ineligible-no-declaration","historicalMechanismObserved":false,"hashBoundValue":"absent"}
```

Mechanical inspection confirms:

- `execution` is not an own property;
- `claim` is not an own property;
- neither key occurs in the serialized representation;
- neither property is represented by `null`, `undefined`, an optional own property, a default, or a normalized substitute;
- all four applicable evidence fields are present with their exact required values.

The previous blocker is therefore closed.

## 4. MU result contract

The Municipal variant is exactly:

```ts
Readonly<{
  declarationPath: null;
  status: "ineligible-no-declaration";
  historicalMechanismObserved: false;
  hashBoundValue: "absent";
}>
```

The exported result type is a two-member discriminated union. The Municipal member does not declare `execution` or `claim`; the eligible exclusion member requires both. No third result shape is defined.

The focused test proves exact deep equality, presence and values of the four evidence fields, own-property absence of the two inapplicable fields, serialized absence, repeated determinism, distinct result identities, recursive freeze, and input nonmutation.

## 5. RE/CO non-regression

Real Estate and Consulting continue to produce the same structure and values as the implementation commit:

```text
declarationPath: /compatibility/sustainThresholdDisposition
status: excluded-no-authoritative-value
historicalMechanismObserved: true
hashBoundValue: absent
execution: forbidden
claim: excluded-from-final-equivalence
```

Direct execution against both verified fixtures confirms that `execution` and `claim` remain required own properties for these profiles. Their declaration, evidence, compatibility-hash, and envelope-hash bindings are unchanged.

The focused test repeats each eligible result, deep-compares the exact complete structure, verifies detached identities and recursive freeze, and confirms that neither input envelope is mutated.

## 6. M1C, hash, and provenance non-regression

There is no diff between the implementation commit and the correction commit under `domainModelContractV1`. Consequently the correction does not change:

- M1C types, structural parser, semantic validator, projection, or diagnostics;
- any of the three profile fixtures;
- source semantic objects or hashes;
- projected-native objects or hashes;
- compatibility or envelope hash declarations;
- provenance rows or positional hash arguments;
- curve fallback, curve identities, or curve configuration;
- registry, propagation, or action admission;
- profile identities, domain IDs, versions, or fixture paths.

The existing verification chain independently reproduces all six current compatibility and envelope hashes:

| Profile | Compatibility hash | Envelope hash |
| --- | --- | --- |
| RE | `sha256:58921487fa47497da85ce96ce80cf1f203947b0a4bf47cd41e004dbd896952d0` | `sha256:644b16b57b6cd87529a40b8c46fbef727d76d5f2ae3e8daa9bcbed854bf7f89d` |
| MU | `sha256:4252be6bdb7f17b681a9748338eadac2c77f2da94298838b330446ee312bed7e` | `sha256:0aa41b573af6f1144e517538f3675d9e35b2214bf367d486c3eb57c5534fd324` |
| CO | `sha256:0b7515e994aedc36625de9a5f6658b3a3b703271a8244c4a9d65f8d3927c8654` | `sha256:f2589416e7b48ffb9c3b42990e0485b591132aaebb4e8982dbdff559604790d1` |

The source and projected-native identities remain those checkpointed by the implementation commit. The canonicalizer and hash function are unchanged.

The correction also leaves Comparator A, Comparator B, attribution, discrepancy classification, runtime, and every non-sustain M1D function unchanged. It introduces no numeric sustain value, execution input, comparison, caller authority, fabricated brand, runtime adoption, or curve-fallback claim.

## 7. Test and quality results

| Check | Run | Result |
| --- | --- | --- |
| Affected M1D test | 1 | 38/38; 0 failed, skipped, todo, or cancelled |
| Affected M1D test | 2 | 38/38; 0 failed, skipped, todo, or cancelled |
| Full M1C/M1D focus | 1 | 114/114; 0 failed, skipped, todo, or cancelled |
| Full M1C/M1D focus | 2 | 114/114; 0 failed, skipped, todo, or cancelled |
| Full regression | 1 | 83 test files; 781/781; 0 failed, skipped, todo, or cancelled |
| TypeScript | 1 | `npx tsc --noEmit --incremental false` passed |
| Scoped ESLint | 1 | Both correction files passed with `--max-warnings 0` |
| Repository diff check before audit creation | 1 | passed |
| Hash reproduction | 1 | all six compatibility/envelope values reproduced |

No test was removed, skipped, or weakened. The correction extends the existing sustain test with exact result-shape, absence, determinism, freeze, detachment, and nonmutation assertions while retaining the pre-existing RE/CO and caller-authority assertions.

## 8. Residual risks

The completion blocker is closed without widening the semantic surface. Sustain remains explicitly excluded for eligible profiles, Municipal remains ineligible, and no numeric parity or runtime-adoption claim is made.

M1E must still treat curve fallback as its separate, unresolved verification boundary. This readiness conclusion authorizes resumption of the M1E Final Equivalence Harness; it does not claim that curve fallback is already complete, that sustain executes, or that production adoption is approved.

## 9. Final readiness conclusion

**A. M1C SUSTAIN EXCLUSION AMENDMENT COMPLETE — READY TO RESUME M1E FINAL EQUIVALENCE HARNESS**

The previous Municipal result-shape blocker is fully closed, every earlier approved M1C and M1D boundary remains intact, the hash and provenance chains remain stable, and the complete required verification matrix passes.
