# M1C Sustain Exclusion — scope amendment audit

## 1. Executive conclusion

**A. READY FOR M1C SUSTAIN EXCLUSION IMPLEMENTATION WITH PROVENANCE SCOPE AMENDMENT**

The only implementation file missing from the checkpointed sustain-exclusion scope is:

```text
src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.ts
```

That file is a normative consumer of the compatibility and envelope hashes for all three closed profiles. The required change is exactly six derived hash fields: one compatibility hash and one envelope hash for RE, MU, and CO. No other field, row, binding, type, control flow, or provenance property in the file needs to change.

This is a scope correction, not a new product decision or semantic amendment. The already-checkpointed sustain ownership decision remains authoritative.

## 2. Baseline and method

The audit started on branch `decision-flow-demo-v1` with local HEAD, tracking HEAD, and actual `origin/decision-flow-demo-v1` all at `39379eb9235b0f9337277841a75b0a599da7bbe7`. The index and working tree were clean.

The review used:

- the complete `legacyProfileProjectionV1.ts` source;
- the three checked-in `legacy-profile-projection-v1` envelope fixtures;
- the existing canonical hash implementation in `baselineCanonicalizationV1.ts`;
- compatibility and envelope hash projections and verification tests;
- the checkpointed M1E sustain ownership decision;
- repository-wide exact searches for all six old compatibility/envelope hash values, separated into active source/test consumers and immutable historical audits.

The proposed sustain disposition was applied only to in-memory fixture clones. The repository’s existing canonicalizer derived the candidate compatibility and envelope hashes. No repository file was modified during that derivation.

## 3. Original blocker

The first implementation attempt correctly changed the sustain-owned compatibility object and regenerated the three fixtures. Its first focus run produced 114 tests, 113 passed, 1 failed, with 0 skipped/todo/cancelled.

The sole failure compared the newly derived RE compatibility hash against the old provenance value:

```text
actual:   sha256:58921487fa47497da85ce96ce80cf1f203947b0a4bf47cd41e004dbd896952d0
expected: sha256:2861190f027ac80b238017e8cd691e6cd201c848de5d225f1881c0da876a120a
```

The attempt was restored because `legacyProfileProjectionV1.ts` was not present in the exact allowed scope. Leaving it unchanged would preserve stale normative provenance; changing it without an amendment would exceed scope.

## 4. Verified hash dependency

`LEGACY_PROFILE_PROJECTION_V1_PROVENANCE` is recursively frozen and contains one closed row per profile. Each row is created by `provenance(...)` with eight positional inputs:

1. source domain ID;
2. projected domain ID;
3. model version;
4. calibration version;
5. source semantic hash;
6. projected-native semantic hash;
7. compatibility declarations hash;
8. envelope hash.

The last two arguments become `compatibilityDeclarationsHash` and `envelopeHash`. `legacyProfileProjectionV1.test.ts` independently reconstructs the compatibility identity, compatibility hash, full envelope hash, and complete provenance row. It therefore detects a stale table value through the real canonicalization chain rather than through duplicated arithmetic.

The sustain exclusion replaces one compatibility member for every profile, including MU’s renamed `null` member. Consequently all three compatibility identities change. Because the full envelope contains compatibility, all three envelope hashes change as well.

The source and projected-native objects are outside this mutation. Their bytes and semantic hashes remain identical.

## 5. Profile and hash matrix

| Profile | Hash domain | Before | Verified derived after | Disposition |
| --- | --- | --- | --- | --- |
| RE | source semantic | `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc` | identical | must not change |
| RE | projected native | `sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99` | identical | must not change |
| RE | compatibility | `sha256:2861190f027ac80b238017e8cd691e6cd201c848de5d225f1881c0da876a120a` | `sha256:58921487fa47497da85ce96ce80cf1f203947b0a4bf47cd41e004dbd896952d0` | update provenance |
| RE | envelope | `sha256:a202b3d24dda2507d496f2264af73e3eacd1a2fd161fd4b38d75a2b1b82d2989` | `sha256:644b16b57b6cd87529a40b8c46fbef727d76d5f2ae3e8daa9bcbed854bf7f89d` | update provenance |
| MU | source semantic | `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b` | identical | must not change |
| MU | projected native | `sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99` | identical | must not change |
| MU | compatibility | `sha256:08c101f11de28bbc10864ba90fba63f24096767b05964a49ab9eea069007d96c` | `sha256:4252be6bdb7f17b681a9748338eadac2c77f2da94298838b330446ee312bed7e` | update provenance |
| MU | envelope | `sha256:e06441b7889e8c1528a76fe5050612c795d2c4301e6e44720193f8bddbb30c64` | `sha256:0aa41b573af6f1144e517538f3675d9e35b2214bf367d486c3eb57c5534fd324` | update provenance |
| CO | source semantic | `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7` | identical | must not change |
| CO | projected native | `sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529` | identical | must not change |
| CO | compatibility | `sha256:62258283079ae9b5786b41b8522de238b6d3e6ade960fd47e327743cb35649c5` | `sha256:0b7515e994aedc36625de9a5f6658b3a3b703271a8244c4a9d65f8d3927c8654` | update provenance |
| CO | envelope | `sha256:30bb1be2e49f15a8c1ad32678884d2b94eeceffdb6d12a832c637770b961dd71` | `sha256:f2589416e7b48ffb9c3b42990e0485b591132aaebb4e8982dbdff559604790d1` | update provenance |

The “after” values are evidence for the scope dependency, not permission to copy values blindly. During implementation they must be reproduced from the final regenerated fixtures through structural validation, semantic validation, compatibility canonicalization, compatibility hash verification, and whole-envelope hashing before the provenance table is edited.

## 6. Permitted change in the added file

Only these six positional arguments in `LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles` may change:

- RE `compatibilityDeclarationsHash`;
- RE `envelopeHash`;
- MU `compatibilityDeclarationsHash`;
- MU `envelopeHash`;
- CO `compatibilityDeclarationsHash`;
- CO `envelopeHash`.

The values must equal the hashes reproduced by the verified regenerated envelope fixtures. The source and projected hashes in the same three calls must remain byte-identical.

No other edit to `legacyProfileProjectionV1.ts` is permitted. In particular, row order, profile keys, domain IDs, versions, fixture paths, schema/adapter/protocol versions, declarations version, `provenance(...)`, `deepFreeze(...)`, source-field accounting, nested-field shapes, types, and control flow remain unchanged.

## 7. Forbidden changes

The scope amendment does not authorize:

- a new sustain value, value source, execution input, comparison, witness, or runtime behavior;
- changes to source or projected-native hashes;
- changes to profile eligibility or identity;
- edits to curve fallback declarations, curves, curve hashes, or witnesses;
- changes to registry, propagation, action admission, or other compatibility mechanisms;
- changes to runtime, resolvers, profiles, M0B fixtures, manifests, Goldens, UI, persistence, migration, deployment, or Vercel configuration;
- a new canonicalizer, alternate hash function, manually fabricated hash, or hash update before final fixture verification;
- restructuring or generalizing the provenance table;
- rewriting historical audit documents to replace their historical hashes.

This amendment grants no runtime adoption and changes no product decision. It only lets a normative consumer follow the already-approved compatibility identity transition.

## 8. Search for other stale consumers

An exact repository-wide search for the six old hash values found the following active locations:

| Location | Values consumed | Scope status |
| --- | --- | --- |
| three `legacy-profile-projection-v1/*.json` fixtures | three compatibility hashes | already explicitly allowed |
| `legacyProfileProjectionV1.test.ts` | three envelope hashes and verification of all domains | already explicitly allowed |
| `legacyProfileProjectionV1.ts` | all six compatibility/envelope provenance hashes | only missing file; added by this audit |

The search also found the old values in `domain-model-contract-m1c-legacy-action-admission-amendment-completion-audit.md`. That file is an immutable historical completion record, not an executable or normative current-value consumer. It must not be edited by this implementation.

No other active source, test, fixture, manifest, Golden, generated artifact, or configuration file contains any of the six old values. There is therefore no additional scope dependency.

## 9. Updated exact implementation scope

The complete allowed scope is the prior checkpointed list plus one provenance file. Only sustain-owned regions may change.

### M1C types, parser, validation, projection, hashing, and tests

- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/projectLegacyProfileToDomainModelContractV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json`

### Added provenance scope

- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.ts`

This added file is restricted to the six hash arguments listed in section 6.

### M1D sustain adaptation

- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/differentialExecutionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`
- sustain/status-only portions of `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/domainModelDifferentialV1.test.ts`

`hashLegacyProfileProjectionEnvelopeV1.ts` remains restricted to the sustain diagnostic literal/path; its canonical hashing implementation must not change. M1D changes remain restricted to consuming the closed sustain disposition/status and enforcing non-execution.

## 10. Stop conditions

Stop without staging if:

- any file outside section 9 changes;
- `legacyProfileProjectionV1.ts` changes beyond exactly six compatibility/envelope hash arguments;
- any source or projected-native hash changes;
- a proposed provenance value differs from the verified regenerated fixture pipeline;
- any hash is inserted before parser, semantic validator, compatibility hash verifier, and envelope hash reproduction all agree;
- the three provenance rows, their order, identities, versions, paths, structure, or control flow change;
- a numeric sustain value or execution-input model is introduced;
- MU eligibility changes;
- old and new sustain authority coexist;
- curve, registry, propagation, action admission, runtime, resolver, profile, M0B, manifest, Golden, UI, persistence, migration, deployment, or Vercel surfaces change;
- focused tests, provenance/hash reproduction, full regression, TypeScript, scoped ESLint, diff checks, or deterministic reruns fail.

## 11. Verification record

The current baseline focus tests for `legacyProfileProjectionV1.test.ts` and `legacyProfileProjectionEnvelopeV1.test.ts` passed: 39/39, with 0 failed/skipped/todo/cancelled. `npx tsc --noEmit --incremental false` passed.

The in-memory candidate transformation reproduced the exact six new hashes shown in section 5 using `hashBaselineValueV1`. It also verified all three source and projected hash strings remained identical. The result independently matches the sole failed focus-test value recorded during the restored implementation attempt.

Repository `git diff --check`, audit-file structural checks, and exact Git scope are verified after audit creation.

## 12. Final conclusion

**A. READY FOR M1C SUSTAIN EXCLUSION IMPLEMENTATION WITH PROVENANCE SCOPE AMENDMENT**

`legacyProfileProjectionV1.ts` is the only missing file. Its authorization is limited to exactly six canonical-pipeline-derived hash replacements. No additional product decision, sustain semantics, runtime adoption, curve change, or compatibility-mechanism expansion is required.
