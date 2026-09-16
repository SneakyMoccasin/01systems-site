# M1E sustain ownership — normative decision audit

## 1. Decision

**A. READY FOR M1C SUSTAIN EXCLUSION AMENDMENT**

The product decision is normative: the current contract version does not support execution of `riskState.sustainThreshold`, and M1E must exclude sustain from its final-equivalence claim. The existing M1C declaration cannot express that decision unambiguously. It hash-binds an override mechanism, an accepted runtime type, a comparison operator, and RE/CO applicability. Those fields describe executable capability even though no value is bound and M1D currently defers execution.

A minimal sustain-owned M1C amendment is therefore required before M1E-2. It must replace the executable-looking declaration with a hash-bound exclusion disposition. It must not change legacy runtime behavior, introduce a threshold value, create an execution-input model, or touch curve semantics.

## 2. Baseline and reviewed evidence

This read-only audit started on branch `decision-flow-demo-v1` with local HEAD, tracking HEAD, and actual `origin/decision-flow-demo-v1` all at `82880b6bb9b56edc1bc723da55e39dfc7c9a8e45`. The index and working tree were clean.

The review traced:

- `LegacySustainThresholdOverrideV1` and the compatibility envelope in `legacyProfileProjectionEnvelopeV1.ts`;
- the closed structural parser in `parseLegacyProfileProjectionEnvelopeV1Structure.ts`;
- the closed expected table and compatibility comparison in `validateLegacyProfileProjectionEnvelopeV1Semantics.ts`;
- projection in `projectLegacyProfileToDomainModelContractV1.ts`;
- compatibility hashing, whole-envelope hashing, and diagnostics in `hashLegacyProfileProjectionEnvelopeV1.ts`;
- all three checked-in legacy projection fixtures and their parser, semantic, hash, byte-lock, diagnostic, and mutation tests;
- `evaluateSustainThresholdV1`, M1D status unions, verification rules, tests, report composition, and report hashing;
- `simulateConstraintsStep.ts`, profile resolution, M0B inputs, manifests, Goldens, and earlier M1C/M1D/M1E audits.

## 3. Existing code, supported contract, and claim boundary

These three layers are distinct:

| Layer | Current fact | Normative consequence |
| --- | --- | --- |
| Legacy code | `simulateConstraintsStep.ts` can dynamically read a numeric `riskState.sustainThreshold`, including non-finite numbers | Historical implementation observation only; runtime remains unchanged |
| Versioned contract | M1C currently declares an override mechanism for RE/CO but binds no value | Must be amended to express exclusion rather than executable support |
| M1E claim | No authorized/hash-bound value exists | No witness, execution, or sustain-parity claim is permitted |

The normal refinancing threshold `0.8` is not a sustain override. Neither the UI constant, a fixture, a Golden, a profile name, earlier characterization, `1.2`, `NaN`, nor either infinity can supply a value. RE and CO have value status `absent-unconfigured`. MU remains `ineligible-no-declaration` and must accept no sustain input.

The statement that sustain is excluded does not mean the legacy runtime lacks technical ability to read the field. It means that optional behavior is outside the authorized versioned contract and equivalence surface.

## 4. Answers to the required questions

### A. Is the current M1C declaration compatible with non-executable sustain?

Not sufficiently. It is compatible with the weaker historical statement “a mechanism was observed but no value is presently bound.” It is not an unambiguous representation of “execution is forbidden in this contract version.” The new decision changes disposition from pending evidence to explicit exclusion and must not be left to prose outside the verified envelope.

### B. Do the current fields imply executable support?

Yes. The literal `legacy-risk-state-number-overrides-constraint-threshold-v1`, `acceptedRuntimeType: number-including-non-finite`, `comparison: margin-strictly-below-threshold`, and non-null RE/CO declaration collectively describe an applicable executable mechanism. The field name `sustainThresholdOverride` reinforces that interpretation. M1D’s later decision not to accept a caller value narrows execution but does not rewrite the hash-bound M1C meaning.

### C. Replace, supplement, or reinterpret?

Replace the declaration and field with an explicit sustain disposition. Merely supplementing the current executable-looking object creates two competing authorities. Leaving it unchanged and interpreting it only in M1E makes the exclusion non-hash-bound and permits another consumer to treat the old declaration as authorization.

The replacement must preserve historical observation as explicitly non-authorizing metadata while removing “accepted” and “applicability” terminology.

### D. Must the decision be hash-bound?

Yes. The disposition belongs to compatibility semantics. It must participate in `compatibility.declarationsHash`; the complete envelope hash consequently changes. The source semantic and projected-native semantic payloads do not change and their hashes must remain byte-identical.

### E. Must the M1D status change?

Yes. For RE and CO, `deferred-missing-hash-bound-value` must become `excluded-no-authoritative-value`. “Deferred” implies that supplying a value may complete the current version. The product decision instead requires a future versioned amendment. MU remains `ineligible-no-declaration`.

The evaluation result must report execution as forbidden/excluded, not deferred. A caller-supplied value must remain absent from the function type and be rejected at any untyped boundary before evidence is created.

### F. Which tests and claims change?

The following existing claims must change:

- the M1C test that “locks the source-local sustain threshold declaration” must lock the exclusion disposition;
- the JavaScript comparison-characterization test must move out of the contractual declaration claim or be retained only as clearly historical runtime characterization with no accepted-input semantics;
- parser literal/key, missing/unknown-field, semantic closed-table, compatibility hash, envelope hash, diagnostics, fixture-byte, and mutation tests must target the new disposition;
- diagnostics must stop saying `legacy-sustain-threshold-override-declared` and report explicit exclusion;
- M1D’s “execution stays deferred” test must become fail-closed exclusion coverage;
- the M1D closed status union and all status-matrix tests must replace `deferred-missing-hash-bound-value` with `excluded-no-authoritative-value` for this ownership path;
- claims in later audits/harness documentation must say excluded in the current version, not pending a value within it.

`DomainModelDifferentialReportV1` currently has no sustain result member. Nevertheless, its observations carry compatibility/envelope identities, so regenerated compatibility hashes can change derived report hashes. No hard-coded report hash may be preserved across the amendment. A future M1E report must include the exclusion status in its own hashed content.

### G. Can curve fallback proceed independently?

Yes. Curve fallback has a separate declaration, trigger set, neutral result, hash ownership, witness boundary, and tests. The sustain amendment must leave `LegacyCurveFallbackDeclarationV1`, every curve, all curve hashes, and curve diagnostics byte-semantically unchanged. After the sustain checkpoint, M1E-2 may implement the curve witness without a curve amendment.

## 5. Required replacement schema

Rename the compatibility member from `sustainThresholdOverride` to `sustainThresholdDisposition`. The RE/CO value must be the following closed object:

```ts
type LegacySustainThresholdExclusionV1 = Readonly<{
  kind: "legacy-sustain-threshold-exclusion-v1";
  sourceField: "sustainThreshold";
  historicalObservation: Readonly<{
    kind: "optional-runtime-field-read-observed-v1";
    constraintId: "refinancing-constraint";
    observedRuntimeType: "number-including-non-finite";
    observedComparison: "margin-strictly-below-threshold";
  }>;
  valueStatus: "absent-unconfigured";
  contractDisposition: "excluded-no-authoritative-value";
  executionPolicy: "reject-at-equivalence-boundary-v1";
  claimPolicy: "no-sustain-parity-v1";
  futureSupport: "requires-versioned-amendment-and-authoritative-value-source-v1";
}>;
```

The compatibility shape is:

```ts
sustainThresholdDisposition: LegacySustainThresholdExclusionV1 | null;
```

RE and CO carry the exact object. MU carries `null`. No second field, numeric value, numeric-value union, caller value, optional execution switch, or legacy override object may coexist. `declarationsVersion` may remain `legacy-compatibility-declarations-v1`, consistent with earlier M1C compatibility amendments; the changed canonical declaration hash is the versioned identity of this amendment.

The nested `historicalObservation` deliberately uses `observedRuntimeType` and `observedComparison`, not “accepted.” It records existing code without granting contractual execution authority. The exclusion leaves are the only normative disposition.

## 6. Parser and semantic validation

The structural parser must:

- require `sustainThresholdDisposition` and reject `sustainThresholdOverride` as unknown;
- require exactly the listed top-level and nested keys;
- lock every literal exactly, without trimming, case folding, aliases, or defaults;
- accept only the exact object or `null`;
- retain existing hostile-value, accessor, duplicate-key, depth, node, and resource-limit behavior;
- return detached, recursively frozen data.

Semantic validation must derive the expected value from the closed profile table: exact exclusion for refinancing-enabled RE/CO and exact `null` for MU. It must reject cross-profile substitution, object/null inversion, missing/extra leaves, historical-observation mutation, and every disposition mutation. It must not consult a caller value or infer an object from runtime state.

## 7. Hashes, diagnostics, fixtures, and provenance

### 7.1 Hash domains

- Source semantic payload: unchanged.
- Projected native semantic payload: unchanged.
- Compatibility declaration identity: changed, because the complete disposition replaces the override declaration.
- Whole envelope: changed as a consequence of the compatibility change.
- M1D/M1E reports: recomputed from their complete content and updated envelope identities; never patched to old values.

All three projection fixtures must be regenerated only through the sustain-specific compatibility change. RE/CO contain the new object; MU changes only the member name with `null` and the resulting compatibility/envelope hashes. No source fixture, native contract, M0B fixture, manifest, or Golden may change.

### 7.2 Diagnostics

For RE/CO, replace the old diagnostic with:

```text
code: legacy-sustain-threshold-excluded
path: /compatibility/sustainThresholdDisposition
message: legacy-sustain-threshold-excluded:no-authoritative-value
```

MU emits no sustain diagnostic because it has no declaration and remains ineligible. Diagnostics remain derived rather than hash inputs; the disposition they describe is hash-bound.

### 7.3 Provenance

No execution provenance may be emitted. The only permitted provenance is declaration provenance identifying the verified envelope path, profile identity, compatibility hash, and envelope hash. It must state historical observation plus contractual exclusion and must not contain a numeric value. If no standalone provenance table currently owns sustain, do not create a general-purpose table; keep the declaration path in the sustain evaluation result.

## 8. M1D and M1E boundary after amendment

`evaluateSustainThresholdV1` remains non-numeric and accepts only a hash-verified envelope. For RE/CO it returns a detached, recursively frozen result equivalent to:

```text
declarationPath: /compatibility/sustainThresholdDisposition
status: excluded-no-authoritative-value
historicalMechanismObserved: true
hashBoundValue: absent
execution: forbidden
claim: excluded-from-final-equivalence
```

For MU it returns:

```text
declarationPath: null
status: ineligible-no-declaration
historicalMechanismObserved: false
hashBoundValue: absent
execution: forbidden
claim: excluded-from-final-equivalence
```

No discrepancy is emitted for either closed status. Status and discrepancy classification remain separate. M1E must hash the exact status/evidence into its final report and must not instantiate a sustain witness or comparator. The curve witness remains separately executable.

## 9. Required negative tests

At minimum, prove rejection or exact closed behavior for:

- every wrong or missing schema key and literal;
- retention of `sustainThresholdOverride` or the old override kind;
- `acceptedRuntimeType`, `comparison`, or `applicability` at the new boundary;
- missing/extra/mutated historical-observation leaves;
- any numeric value, including `0.8`, `1.2`, `NaN`, `+Infinity`, `-Infinity`, and `-0`;
- RE/CO `null`, MU non-null, and cross-profile substitution;
- any execution policy other than fail-closed rejection;
- any parity claim or execution/witness result;
- stale compatibility or envelope hash;
- changed source or projected hash;
- caller-supplied sustain value at compile-time and untyped runtime boundaries;
- aliasing, input mutation, incomplete recursive freeze, and nondeterministic reruns;
- any curve declaration/hash change caused by the sustain amendment.

Existing normal refinancing-threshold tests remain valid but must not call `0.8` a sustain value. Historical runtime characterization may remain only if its labels explicitly deny contract authorization and no value enters M1D/M1E evidence.

## 10. Exact allowed implementation scope

The M1C amendment may modify only the sustain-owned portions of:

- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/projectLegacyProfileToDomainModelContractV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionEnvelopeV1.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelContractV1/legacyProfileProjectionV1.test.ts`
- the three files under `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/differentialExecutionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`
- sustain/status-only tests in `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/domainModelDifferentialV1.test.ts`

`hashLegacyProfileProjectionEnvelopeV1.ts` may change only for the diagnostic literal/path; its canonical hashing algorithm must not change. The M1D files may change only to consume the new closed disposition/status and preserve fail-closed non-execution. No curve, native V1, runtime, resolver, profile, source fixture, M0B fixture, manifest, Golden, registry, propagation, action-admission, deployment, or UI file is allowed.

## 11. Stop conditions

Stop the amendment without staging if any of the following occurs:

- a numeric sustain value is required or inferred;
- a caller/execution-input model is introduced;
- legacy runtime or profile eligibility must change;
- source or projected-native semantic hashes change;
- curve declarations, curve hashes, or curve tests change semantically;
- MU becomes eligible or accepts input;
- old and new sustain authorities coexist;
- compatibility changes exceed the sustain disposition;
- any M0B fixture, manifest, Golden, runtime, UI, registry, propagation, or action-admission file changes;
- exclusion cannot be enforced before witness/comparator execution;
- full regression, TypeScript, scoped lint, hash checks, or deterministic fixture verification fails.

## 12. Checkpoint order

1. Checkpoint this normative decision audit separately.
2. Implement the M1C sustain exclusion amendment within the exact scope above.
3. Verify source/projected hashes unchanged and compatibility/envelope hashes changed only as expected.
4. Run focused parser/semantic/hash/fixture/M1D tests twice, the documented full regression, TypeScript, scoped lint, and diff/whitespace/newline checks.
5. Produce and checkpoint a read-only sustain-exclusion completion audit.
6. Only then begin M1E-2 curve witness work.

M1E final-equivalence implementation must not begin from an uncheckpointed or partially migrated mix of old override and new exclusion semantics.

## 13. Claims after the amendment

The system may say:

- no authoritative sustain value exists;
- sustain does not execute within the current equivalence contract;
- absence/exclusion is explicit, hash-bound, and fail-closed;
- MU is ineligible;
- curve fallback can be verified separately.

It may not say that the sustain value is `0.8` or `1.2`, that sustain parity is verified, that actual runtime cannot technically read the field, that sustain is executable but merely untested, that optional runtime-input semantics were proved, or that runtime adoption is approved.

## 14. Verification record

The documented full regression ran once over 83 test files: 779 passed, 0 failed, 0 skipped, 0 todo, and 0 cancelled. `npx tsc --noEmit --incremental false` passed. Audit-file whitespace, terminal newline, heading hierarchy, code-fence balance, table consistency, repository diff, exact file scope, and empty index are verified after file creation.

## 15. Final conclusion

**A. READY FOR M1C SUSTAIN EXCLUSION AMENDMENT**

The current declaration is a faithful historical mechanism description but not a safe contractual exclusion. The product decision must replace it with a hash-bound sustain disposition before M1E-2. Curve fallback remains independent and unchanged.
