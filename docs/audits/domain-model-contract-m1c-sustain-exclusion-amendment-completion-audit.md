# M1C Sustain Exclusion Amendment Completion Audit

## 1. Executive conclusion

**B. M1C SUSTAIN EXCLUSION AMENDMENT INCOMPLETE — NOT READY FOR M1E**

The amendment is correct at the M1C schema, parser, semantic-validation, fixture, hashing, and provenance boundaries. Its implementation commit has the authorized scope, all canonical hashes reproduce, and the complete test and quality matrix passes.

One M1D result-shape defect prevents completion. `evaluateSustainThresholdV1` correctly assigns Municipal the status `ineligible-no-declaration`, but it also assigns Municipal `execution: "forbidden"` and `claim: "excluded-from-final-equivalence"`. The required Municipal result has no applicable execution or claim status because Municipal has no sustain declaration. The test currently locks the incorrect shape.

The minimum correction is restricted to the Municipal branch of the M1D sustain evaluator and its focused test. It must preserve the Real Estate and Consulting results, the M1C envelope and all hashes, and every unrelated M1D boundary.

## 2. Scope and verified commits

The audited implementation commit is:

```text
87683f61ff884a0908866e8493e5cdcea7f68b56
```

Its parent is exactly:

```text
fced6d21fd35551b38f909044ea93a4d149f9cee
```

Local HEAD, tracking HEAD, and the actual remote branch were independently verified at the implementation commit. The repository was clean before this audit file was created.

The implementation commit contains exactly sixteen modified files, all listed in section 9 of `domain-model-contract-m1c-sustain-exclusion-scope-amendment.md`:

- three `legacy-profile-projection-v1` fixtures;
- nine M1C type, parser, validation, projection, hashing, provenance, and test files;
- one added provenance-scope file, `legacyProfileProjectionV1.ts`;
- three M1D sustain/status files.

The exact commit diffstat is:

```text
16 files changed, 113 insertions(+), 73 deletions(-)
```

No historical audit, runtime, profile, resolver, M0B fixture, manifest, Golden, UI, persistence, deployment, or undeclared generated-artifact path occurs in the commit.

## 3. Contract form

The new property is exactly `sustainThresholdDisposition`. The production and contract paths no longer expose `sustainThresholdOverride`. The old name remains only in the negative parser test that proves it is rejected and in immutable historical documentation.

Real Estate and Consulting use `LegacySustainThresholdExclusionV1` with the closed normative fields:

| Field | Required and observed value |
| --- | --- |
| `kind` | `legacy-sustain-threshold-exclusion-v1` |
| `valueStatus` | `absent-unconfigured` |
| `contractDisposition` | `excluded-no-authoritative-value` |
| `executionPolicy` | `reject-at-equivalence-boundary-v1` |
| `claimPolicy` | `no-sustain-parity-v1` |
| `futureSupport` | `requires-versioned-amendment-and-authoritative-value-source-v1` |

Municipal has exactly `sustainThresholdDisposition: null`. No parallel sustain authority exists in the current contract.

## 4. Parser and semantic validation

Positive verification covers the exact Real Estate exclusion, Consulting exclusion, and Municipal null declaration.

The structural parser uses an exact-key object boundary. The semantic validator compares the parsed declaration with a closed profile-derived expectation. Neither boundary defaults missing values, normalizes the old representation, nor admits unknown keys.

The negative matrix covers:

- the old `sustainThresholdOverride` property;
- numeric `sustainThreshold`, including finite values, non-finite values, and negative zero;
- missing and extra sustain fields;
- incorrect `kind`, `valueStatus`, `contractDisposition`, `executionPolicy`, and `claimPolicy` literals;
- null or missing exclusion for an eligible profile;
- an exclusion declaration for Municipal;
- cross-profile substitution;
- stale compatibility and envelope hashes;
- relevant diagnostic, projection, provenance, and nested-object mutations.

No cast, fabricated brand, alternate verifier, or caller-provided sustain authority can turn an invalid declaration into verified evidence.

## 5. Profile and result matrix

| Profile | Declaration | Required status | Observed execution | Observed claim | Result |
| --- | --- | --- | --- | --- | --- |
| RE | closed exclusion | `excluded-no-authoritative-value` | `forbidden` | `excluded-from-final-equivalence` | correct |
| MU | `null` | `ineligible-no-declaration` | `forbidden` | `excluded-from-final-equivalence` | incorrect: execution and claim are not applicable |
| CO | closed exclusion | `excluded-no-authoritative-value` | `forbidden` | `excluded-from-final-equivalence` | correct |

The defect is at `executeVerifiedNativeProjectionV1.ts`, in `evaluateSustainThresholdV1`. The function conditionally derives `declarationPath`, `status`, and `historicalMechanismObserved`, but unconditionally emits the same `execution` and `claim` values for all profiles. `domainModelDifferentialV1.test.ts` asserts and therefore locks that unconditional Municipal output.

Minimum correction:

1. Make the Municipal/no-declaration branch return no applicable execution or claim status, using the repository's established closed result-shape convention rather than an invented semantic value.
2. Update the focused Municipal expectation to require that exact ineligible shape.
3. Retain the RE/CO result unchanged.
4. Re-run the M1D focus, full regression, TypeScript, scoped ESLint, diff checks, deterministic/freeze checks, and exact scope checks.

Forbidden workarounds include making Municipal eligible, adding a Municipal declaration, assigning a numeric threshold, treating `forbidden` as a synonym for inapplicability, weakening the audit requirement, changing M1C hashes, or altering curve/runtime semantics.

## 6. Numeric-exclusion proof

The implementation introduces no authoritative numeric sustain value, numeric union, optional numeric execution input, threshold fallback, boundary comparison, state mutation, witness execution, or caller-supplied execution authority.

`0.8` appears in the sustain amendment only as an explicitly rejected numeric parser mutation. Other repository occurrences belong to existing curve or refinancing semantics and are not used as a sustain override value. NaN and infinities are tested as rejected input shapes, not as execution policy.

The evaluator reads only the hash-verified disposition. It does not read, derive, compare, or execute a number.

## 7. Hash domains

All source semantic objects and projected-native objects are identical to the parent commit. Their existing hashes are unchanged.

The final fixtures reproduce these compatibility and envelope transitions through the existing parser, semantic validator, compatibility projection, canonicalizer, and hash verifier:

| Profile | Domain | Parent | Implementation |
| --- | --- | --- | --- |
| RE | compatibility | `sha256:2861190f027ac80b238017e8cd691e6cd201c848de5d225f1881c0da876a120a` | `sha256:58921487fa47497da85ce96ce80cf1f203947b0a4bf47cd41e004dbd896952d0` |
| RE | envelope | `sha256:a202b3d24dda2507d496f2264af73e3eacd1a2fd161fd4b38d75a2b1b82d2989` | `sha256:644b16b57b6cd87529a40b8c46fbef727d76d5f2ae3e8daa9bcbed854bf7f89d` |
| MU | compatibility | `sha256:08c101f11de28bbc10864ba90fba63f24096767b05964a49ab9eea069007d96c` | `sha256:4252be6bdb7f17b681a9748338eadac2c77f2da94298838b330446ee312bed7e` |
| MU | envelope | `sha256:e06441b7889e8c1528a76fe5050612c795d2c4301e6e44720193f8bddbb30c64` | `sha256:0aa41b573af6f1144e517538f3675d9e35b2214bf367d486c3eb57c5534fd324` |
| CO | compatibility | `sha256:62258283079ae9b5786b41b8522de238b6d3e6ade960fd47e327743cb35649c5` | `sha256:0b7515e994aedc36625de9a5f6658b3a3b703271a8244c4a9d65f8d3927c8654` |
| CO | envelope | `sha256:30bb1be2e49f15a8c1ad32678884d2b94eeceffdb6d12a832c637770b961dd71` | `sha256:f2589416e7b48ffb9c3b42990e0485b591132aaebb4e8982dbdff559604790d1` |

The canonicalizer and underlying hash function are unchanged. In `hashLegacyProfileProjectionEnvelopeV1.ts`, only the sustain diagnostic literal and path changed. Stale and mutated hashes are rejected. No active non-audit consumer retains an old compatibility or envelope hash; historical audits remain unchanged records.

## 8. Provenance

A byte-level normalization check against the parent proves that `legacyProfileProjectionV1.ts` differs only in six positional arguments:

- RE compatibility and envelope hashes;
- MU compatibility and envelope hashes;
- CO compatibility and envelope hashes.

Source hashes, projected-native hashes, profile rows, row order, identities, domain IDs, versions, paths, types, structure, `provenance(...)`, `deepFreeze(...)`, and control flow are otherwise byteidentical. All six new arguments equal the independently reproduced fixture values.

## 9. Curve and compatibility non-regression

Comparison with the parent confirms no semantic change to:

- curve fallback, curve identities, or curve configuration;
- registry compatibility;
- compatibility propagation;
- legacy action admission;
- source-field accounting outside sustain;
- profile identities, domain IDs, versions, or fixture paths;
- Comparator A or Comparator B;
- discrepancy classification or attribution.

Curve fallback remains deferred to M1E and has not been solved, broadened, or claimed as verified by this amendment.

## 10. Determinism and authority

The focused matrix verifies repeated-run determinism, object insertion-order neutrality, ordered-array sensitivity, input nonmutation, output detachment, recursive freeze, stale-hash rejection, cross-profile rejection, duplicate/extra-key rejection, and mechanically owned discrepancy classification.

No new semantic comparison uses `JSON.stringify`; test-only serialization remains diagnostic. No `localeCompare`, unsafe implementation cast, fabricated verified brand, caller-supplied emitter, or caller-supplied sustain authority was introduced.

The Municipal result-shape defect does not fabricate numeric evidence, but it overstates applicability by attaching exclusion execution and claim fields to an ineligible profile.

## 11. Allowed and forbidden claims

The evidence supports these claims:

- sustain override is explicitly excluded for eligible profiles in the current contract version;
- RE and CO have no authoritative sustain value;
- MU has no sustain declaration and is ineligible;
- numeric sustain execution is forbidden at the equivalence boundary for the eligible exclusion declarations;
- no sustain parity is claimed for RE or CO;
- future support requires a versioned amendment and an authoritative value source;
- curve fallback remains a separate M1E boundary.

This audit does not claim a verified numeric sustain value, sustain parity, sustain execution, `0.8` as an override value, completed M1E curve-fallback verification, runtime adoption, or full production authorization.

Because the current M1D output attaches execution and claim fields to MU, the implementation cannot yet claim that the exposed result model cleanly preserves Municipal inapplicability.

## 12. Test and quality results

| Check | Result |
| --- | --- |
| M1C/M1D focus, run 1 | 114/114; 0 failed, skipped, todo, or cancelled |
| M1C/M1D focus, run 2 | 114/114; 0 failed, skipped, todo, or cancelled |
| Full regression, run 1 | 83 files; 781/781; 0 failed, skipped, todo, or cancelled |
| Full regression, run 2 | 83 files; 781/781; 0 failed, skipped, todo, or cancelled |
| `npx tsc --noEmit --incremental false` | passed |
| Scoped ESLint over the 13 changed TypeScript files | passed with `--max-warnings 0` |
| Implementation commit diff check | passed |
| Hash reproduction | all six compatibility/envelope values reproduced |
| Source/projected and non-sustain fixture comparison | unchanged |
| Exact provenance comparison | six hash arguments only |

The green test matrix does not remove the blocker because the focused test currently expects the incorrect Municipal execution and claim fields.

## 13. Residual risks

The sole completion blocker found is the Municipal result shape. Once corrected and independently reverified, no additional M1C schema, fixture, hash, provenance, curve, runtime, or product-semantics change is indicated by this audit.

Changing the result shape may affect inferred TypeScript return types or downstream consumers. The correction must therefore search all consumers and retain an explicit closed discriminated result rather than making arbitrary fields loosely optional. That is verification work for the corrective implementation, not authorization to expand scope.

## 14. Final readiness conclusion

**B. M1C SUSTAIN EXCLUSION AMENDMENT INCOMPLETE — NOT READY FOR M1E**

M1C cannot be closed again and M1E Final Equivalence Harness must not resume until Municipal's `ineligible-no-declaration` result carries no applicable execution or claim status and the corrected boundary passes the complete required verification matrix.
