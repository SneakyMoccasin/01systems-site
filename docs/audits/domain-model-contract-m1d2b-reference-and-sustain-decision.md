# M1D-2b reference and sustain decision audit

## Scope and frozen state

This audit stops M1D-2b implementation and resolves three external-review findings without changing implementation, fixtures, or Git state. It is based on branch `decision-flow-demo-v1` at `eb13207c53bd4772e9cad95843a8427e5f18e6e4` with an empty index. The five modified M1D files and the unchanged sixth M1D file were read in full and treated as byte-frozen throughout this audit.

The evidence set also includes the M1D differential-execution design audit, the M1D legacy action-admission decision, the M1C action-admission completion audit, `runEngineBaselineFixtureV1`, `runCascadeAnalysis`, `normalizeScheduledActions`, `RealEstateEngine`, the legacy action-effect source, the executable-profile resolver, and the M1C `sustainThresholdOverride` declaration and projection evidence.

## Decision summary

| Finding | Decision | Consequence |
| --- | --- | --- |
| Normalized reference | The current path is a compatibility-normalized legacy engine-core reconstruction, not the actual legacy runtime | Rename it and narrow its evidence claim |
| `sustainThreshold` | `1.2` has no verified source or identity binding | Defer these cases; remove caller-supplied threshold use from admissible M1D evidence |
| Comparator B | The action code is an action-local leave-one-out attribution, not full Comparator B | Separate full comparison, action attribution, and declaration counterfactual evidence |

## 1. Normalized reference classification

### Observed execution path

The current normalized action path is:

```text
runLegacyScenarioWithRetainedEffects
  -> resolveLegacyDomainProfile
  -> new RealEstateEngine
  -> apply retained driver deltas at the chosen step
  -> private M1D-owned step loop
  -> createScenarioAnalysisResult
  -> manually assembled output and provenance
```

It therefore does not cross the same boundary as:

```text
runEngineBaselineFixtureV1
  -> runCascadeAnalysis
  -> normalizeScheduledActions
```

`normalizeScheduledActions` accepts an action identifier and execution step, rejects caller-supplied `driverDeltas`, and reloads the complete canonical effect set from the executable profile. It also rejects canonical effects whose drivers are outside the profile's applicable-driver set. No existing input field admits a hash-verified filtered effect partition.

Consequently, there is no unchanged route through `runEngineBaselineFixtureV1 -> runCascadeAnalysis` that can consume the verified retained-effect partition without at least one prohibited change: a production/runtime API extension, mutation of `ACTION_EFFECTS`, caller-supplied effect mappings or deltas, or bypass of runtime normalization and provenance.

### Locked name and claim boundary

The required implementation and report name is:

```text
compatibility-normalized-legacy-engine-core-reconstruction-v1
```

The required result type is `CompatibilityNormalizedLegacyEngineCoreResultV1`. Its status is the closed union:

```ts
type CompatibilityNormalizedLegacyEngineCoreStatusV1 =
  | "pass"
  | "fail"
  | "not-applicable-normalization-rejected";
```

This reference may support the following claim:

> Given the hash-verified admitted action occurrence and retained-effect partition, an independently executed legacy engine core and the native compatibility-effective candidate agree on the declared comparison surface.

It may not support any of these claims:

- actual legacy-runtime parity;
- parity through `runCascadeAnalysis` action normalization;
- unchanged legacy scheduling, batching, action lookup, output wrapping, or runtime provenance;
- validation of ignored effects through runtime execution.

The reference remains independent of the native candidate because it resolves the legacy executable profile and executes `RealEstateEngine`; it does not call the native interpreter or reuse native projected results. It reuses legacy driver-delta validation and application, engine state transitions, constraint behavior, curves, propagation, and `stepForward`. It reconstructs scheduling, batching, action normalization, the outer step loop, scenario-result construction, output assembly, planned schedules, and provenance.

The required comparison name for this bounded comparison is:

```text
compatibility-normalized-legacy-engine-core-vs-native-effective-v1
```

It must carry the same closed status union and must never be labelled full or actual legacy-runtime parity.

## 2. `sustainThreshold` source audit

### Trace result

The literal `1.2` used by current M1D sustain tests comes from the test caller's `compatibilityOverride`. No actual profile or runtime source supplies `sustainThreshold: 1.2`.

The actual constraint runtime reads an optional `riskState.sustainThreshold`; when it is absent it falls back to the profile refinancing threshold and then `0.8`. The application constant `EXEC_SUSTAIN_THRESHOLD` is `0.8`, not `1.2`. Other repository occurrences of `1.2` are unrelated curve, sensitivity, coefficient, or mutation-test values and are not sustain-threshold source evidence.

| Question | Finding |
| --- | --- |
| Is `1.2` present in the actual RE/CO profile or runtime configuration? | No |
| Is a sustain override value in the M0B semantic payload? | No; the assumption register explicitly classifies it as not in profile payload |
| Is a value in a hash-verified M1C identity? | No; only the override behavior declaration is hashed |
| Can binary64 `1.2` be derived from the current envelope? | No |
| What does MU carry? | `sustainThresholdOverride: null`, therefore no value and no override eligibility |

The M1C declaration binds `kind`, `sourceField`, `constraintId`, accepted runtime type, comparison, and applicability. It deliberately does not bind a numeric value. Compatibility and envelope hashes therefore prove that an override mechanism is declared for RE and CO; they do not prove which value was supplied. Neither a decimal spelling nor its binary64 representation can be recovered from that declaration.

### Minimum correct solution

Option B is unavailable because there is no already hash-verified source field containing the value. Option A cannot be justified from current evidence: adding `1.2` would turn a caller/test literal into purported source provenance. A future M1C amendment is permissible only after an authoritative product or historical-source decision identifies the per-profile value and its provenance; this audit does not fabricate that decision.

The locked choice is therefore option C: sustain-threshold differential cases remain deferred. `evaluateSustainThresholdV1` must not accept or rely on caller-supplied `compatibilityOverride` as evidence. MU remains explicitly ineligible through `null`. RE and CO may report the existing declaration and the absence of a hash-bound value, but may not execute or claim compatibility parity for a chosen override.

Resumption requires a separately reviewed M1C amendment that binds an exact value and source evidence, or discovery of a genuine already-owned source field followed by equivalent parser, semantic, hash, diagnostic, and negative-test proof. Until then, non-finite and negative-zero value policy is intentionally unresolved rather than inferred from the present declaration's accepted runtime-type wording.

## 3. Comparator B ownership

### Classification of current action code

The current sequence

```text
noActionEffective vs actionEffective
  -> actionDifferences
  -> manually constructed ComparatorBResultV1 with ok: true
```

is an action-local leave-one-out counterfactual. Both sides are compatibility-effective executions; the comparison isolates one action-admission declaration. It is not the complete pure-native-versus-full-compatibility-effective Comparator B and must not be stored in or presented as that result.

### Locked report structures

#### Full Comparator B

```ts
type FullCompatibilityComparatorStatusV1 = "pass" | "fail";

interface FullCompatibilityComparatorV1 {
  comparator: "pure-native-vs-full-compatibility-effective-v1";
  status: FullCompatibilityComparatorStatusV1;
  primaryDifferences: readonly DifferenceV1[];
  attributions: readonly CompatibilityAttributionV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}
```

This object alone owns the complete comparison between pure native and the full compatibility-effective execution. It covers every primary difference caused by propagation, registry projection, action admission, and every other active compatibility declaration.

#### Action-admission attribution

```ts
type ActionAdmissionAttributionStatusV1 = "pass" | "fail";

interface ActionAdmissionAttributionResultV1 {
  comparator: "full-effective-with-action-vs-without-exact-action-declaration-v1";
  status: ActionAdmissionAttributionStatusV1;
  declarationPath: string;
  outputDisposition: "changed" | "unchanged";
  attributedDifferences: readonly DifferenceV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}
```

This object owns only paths counterfactually caused by the exact action-admission declaration. An empty `attributedDifferences` with `outputDisposition: "unchanged"` is a positive, mechanically verified output-neutral result, not absence of full Comparator B attribution.

#### Single-declaration evidence

```ts
type CompatibilityCounterfactualStatusV1 = "pass" | "fail";

interface CompatibilityDeclarationCounterfactualV1 {
  comparator: "single-declaration-leave-one-out-v1";
  status: CompatibilityCounterfactualStatusV1;
  declarationPath: string;
  before: unknown;
  after: unknown;
  attributedDifferences: readonly DifferenceV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}
```

This generic evidence type may back an attribution but does not replace the full comparator or inherit ownership of unrelated primary differences.

### Mechanical pass rule

No status may become `"pass"` from a literal or optimistic default. The full comparator passes only if executable checks establish all of the following:

1. The union of attribution paths equals the complete set of primary-difference paths.
2. Every attribution path is a primary-difference path; there are no collateral paths.
3. Provenance, ledger, diagnostic, and declaration-only paths are excluded from output attribution.
4. Each attributed path has exact expected `before` and `after` values.
5. Every counterfactual is derived from its verified declaration, never caller-created mappings or effects.
6. Native propagation remains present and unchanged except for the deliberately removed compatibility declaration.
7. Inputs, envelopes, plans, and previously returned results are nonmutated.

The action-admission result applies the same rules to its subset and declaration. It may feed the full comparator's coverage proof, but cannot certify unrelated propagation or registry differences.

### Profile-specific boundaries

For MU and CO, an empty action-output attribution means only that the action-admission declaration is output-neutral on the tested surface. Their full Comparator B results must still contain mechanically proven registry and propagation attribution wherever those declarations create primary differences.

For RE, action attribution is limited to paths counterfactually observed from the retained effect. An ignored effect remains provenance/ledger evidence and must not appear as an output attribution.

## Next checkpoint

The minimum next checkpoint is **M1D-2b reference/comparator correction with sustain-threshold execution deferred**.

Allowed file scope is limited to these existing M1D files:

- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/differentialExecutionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/domainModelDifferentialV1.test.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/executeVerifiedNativeProjectionV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/runDomainModelDifferentialV1.ts`
- `src/pilotFastighet/analysis/testSupport/domainModelDifferentialV1/runCompatibilityCounterfactualV1.ts`, only if needed to centralize the full comparator proof without changing its established semantics

`buildLegacyCompatibilityExecutionPlanV1.ts` is outside the expected correction unless a compile-time type propagation is mechanically required; encountering that need is a stop condition requiring scope review. All M1C files, fixtures, production runtime files, `ACTION_EFFECTS`, profile resolvers, and application files are outside scope.

Stop immediately if correction would require a production/runtime API change, mutation of global action effects, caller-supplied effect or threshold data, an M1C schema/fixture/hash change, weakening a verified M1C identity, or attribution that cannot be proven mechanically.

Required tests are:

- compile-time closed-union and ownership checks for the three result structures;
- actual-runtime rejection evidence through the unchanged baseline runner;
- engine-core reconstruction agreement and deliberate mismatch cases;
- full Comparator B coverage, collision, gap, collateral-path, ledger-only, wrong-value, altered-native-propagation, and mutation failures;
- action-attribution changed and output-neutral cases for RE, MU, and CO;
- RE retained-effect-only attribution and ignored-effect ledger exclusion;
- proof that no caller-supplied sustain value remains executable evidence;
- deterministic repeat execution, M1D focus, affected earlier milestones, full regression, TypeScript, scoped ESLint, and `git diff --check`.

After correction, M1D-2b may claim hash-verified plan execution, actual-runtime admission/rejection observations, bounded legacy engine-core agreement, complete mechanically attributed pure-native-versus-effective differences, and output-neutral action attribution where proven. It may not claim full actual legacy-runtime parity for the reconstructed route, a verified RE/CO threshold value, sustain-threshold parity, or action-local evidence as the entirety of Comparator B.

## Audit integrity record

Pre-audit SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `buildLegacyCompatibilityExecutionPlanV1.ts` | `55cadcee845cb554e3501825043c3bcca8a1ff69847b9f78d224d639b76bc31f` |
| `differentialExecutionV1.ts` | `8991274b7bb74d10e0cf1d9ad4f527d5f464bd2e467b56e9a5deb7eb3451ac36` |
| `domainModelDifferentialV1.test.ts` | `c91b64d02362b4d31cfa8482791cca99bd13975ecc13e2bc857a7e76d4c9d03f` |
| `executeVerifiedNativeProjectionV1.ts` | `505ce1399932799d05a50e6779495cc4c5764071b6ae014a6afb5eb420dfe08c` |
| `runDomainModelDifferentialV1.ts` | `0297a1984a6496f431e37e88b63bee81e2b8bf3e8bd9d0624f021d62188404e2` |
| `runCompatibilityCounterfactualV1.ts` | `46702de6c67a0796dedbf8bd4265a57c3f21aa1224aa0ad279794becfd486516` |

The post-audit verification must reproduce every value above. Audit-file SHA-256, byte count, and line count are reported after the file is finalized and are intentionally not embedded here, because embedding a file's own physical checksum would change that checksum.

## Conclusion

DEFER SUSTAIN THRESHOLD AND CORRECT M1D REFERENCE/COMPARATORS
