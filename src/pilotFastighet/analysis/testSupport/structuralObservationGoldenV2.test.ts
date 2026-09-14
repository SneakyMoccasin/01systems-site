import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { EngineState } from "../../RealEstateEngine";
import type { ExecutableIdentity } from "../../executableDomainProfile";
import {
  createSavedRunSnapshot,
  evaluateSavedRunCompatibility,
  evaluateSavedRunInitiativeStructuralObservationCompatibility,
  readSavedRunHistory,
  type SavedRunSnapshot,
} from "../savedRunPersistence";
import type { InitiativeStructuralObservationIdentity } from "../structuralObservation/initiativeStructuralObservationIdentity";
import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "./baselineCanonicalizationV1";
import inputJson from "./fixtures/structural-observation-v2/legacy-real-estate-v1-small-v2.json";
import goldenJson from "./fixtures/structural-observation-golden-v2/legacy-real-estate-v1-small-v2.json";
import {
  parseStructuralObservationGoldenInputV1,
  parseStructuralObservationOutputGoldenV1,
  projectStructuralObservationGoldenV2,
  structuralObservationGoldenHashes,
} from "./structuralObservationGoldenV2";

const input = parseStructuralObservationGoldenInputV1(inputJson);
const golden = parseStructuralObservationOutputGoldenV1(goldenJson);

function assertFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertFrozen(child);
}

function metrics(projection: Awaited<ReturnType<typeof projectStructuralObservationGoldenV2>>) {
  const codes = (scenario: "A" | "B") => [...new Set(projection.snapshots[scenario].flatMap((snapshot) => snapshot.diagnostics.map(({ code }) => code)))].sort();
  return {
    horizon: projection.horizon,
    initiativeCount: projection.resolvedSchedules.A.length,
    snapshotCountA: projection.snapshots.A.length,
    snapshotCountB: projection.snapshots.B.length,
    provenanceCountA: projection.executionProvenance.A.entries.length,
    provenanceCountB: projection.executionProvenance.B.entries.length,
    diagnosticCodesA: codes("A"),
    diagnosticCodesB: codes("B"),
  };
}

test("canonical V2 fixture is explicit, detached, frozen, profile-valid, and structurally representative", () => {
  assert.notStrictEqual(input, inputJson);
  assertFrozen(input);
  assert.equal(inputJson.contract.version, "structural-observation-v2");
  assert.equal(inputJson.contract.initiatives.length, 3);
  assert.deepEqual(inputJson.schedules.A.map(({ initiativeId }) => initiativeId).sort(), inputJson.schedules.B.map(({ initiativeId }) => initiativeId).sort());
  assert.notDeepEqual(inputJson.schedules.A.map(({ executionStep }) => executionStep), inputJson.schedules.B.map(({ executionStep }) => executionStep));
  assert.ok(inputJson.contract.initiatives.some(({ prerequisites }) => prerequisites.length > 0));
  assert.ok(inputJson.contract.initiatives.some(({ resourceClaims }) => resourceClaims.length > 0));
  assert.ok(inputJson.contract.resources.length > 0);
});

test("input and Golden parsers fail closed and return detached recursively frozen data", () => {
  const original = structuredClone(inputJson) as Record<string, unknown>;
  const parsed = parseStructuralObservationGoldenInputV1(original);
  (original as { fixtureId: string }).fixtureId = "changed";
  assert.equal(parsed.fixtureId, input.fixtureId);
  assert.throws(() => { (parsed as { fixtureId: string }).fixtureId = "mutated"; }, TypeError);
  assertFrozen(golden);
  const originalGolden = structuredClone(goldenJson) as Record<string, unknown>;
  const parsedGolden = parseStructuralObservationOutputGoldenV1(originalGolden);
  assert.equal(canonicalizeBaselineValueV1(parsedGolden), canonicalizeBaselineValueV1(goldenJson));
  originalGolden.fixtureId = "changed";
  assert.equal(parsedGolden.fixtureId, golden.fixtureId);
  assert.throws(() => { (parsedGolden as { fixtureId: string }).fixtureId = "mutated"; }, TypeError);

  const badInputs: unknown[] = [
    { ...inputJson, unknown: true },
    (() => { const value = structuredClone(inputJson) as Record<string, unknown>; delete value.contract; return value; })(),
    { ...inputJson, version: "future" },
    { ...inputJson, domainId: "municipal" },
    { ...inputJson, profileId: "legacy-consulting-v1" },
    { ...inputJson, horizon: Number.NaN },
    { ...inputJson, fixtureId: -0 },
    Object.assign(Object.create({}), inputJson),
  ];
  const symbol = structuredClone(inputJson) as Record<PropertyKey, unknown>; symbol[Symbol("x")] = true; badInputs.push(symbol);
  const accessor = structuredClone(inputJson) as Record<string, unknown>; Object.defineProperty(accessor, "fixtureId", { enumerable: true, get: () => "x" }); badInputs.push(accessor);
  const hidden = structuredClone(inputJson) as Record<string, unknown>; Object.defineProperty(hidden, "hidden", { enumerable: false, value: true }); badInputs.push(hidden);
  for (const value of badInputs) assert.throws(() => parseStructuralObservationGoldenInputV1(value));

  for (const mutate of [
    (value: Record<string, unknown>) => { value.unknown = true; },
    (value: Record<string, unknown>) => { delete value.inputHash; },
    (value: Record<string, unknown>) => { value.version = "future"; },
    (value: Record<string, unknown>) => { value.provenanceHash = "A".repeat(64); },
    (value: Record<string, unknown>) => { value.exactMetrics = { invalid: undefined }; },
    (value: Record<string, unknown>) => { (value.manifest as Record<string, unknown>).unknown = true; },
  ]) {
    const value = structuredClone(goldenJson) as Record<string, unknown>; mutate(value);
    assert.throws(() => parseStructuralObservationOutputGoldenV1(value));
  }
});

test("output Golden parser rejects every semantic identity and hash inconsistency at its precise path", () => {
  const cases: ReadonlyArray<readonly [(value: Record<string, unknown>) => void, RegExp]> = [
    [(value) => { ((value.manifest as Record<string, unknown>).profile as Record<string, unknown>).domainId = "unknown"; }, /\$\.manifest\.profile\.domainId: unknown executable domain/],
    [(value) => { ((value.manifest as Record<string, unknown>).profile as Record<string, unknown>).profileId = "unknown"; }, /\$\.manifest\.profile\.profileId: Unknown executable profile/],
    [(value) => { const profile = (value.manifest as Record<string, unknown>).profile as Record<string, unknown>; profile.domainId = "municipal"; }, /\$\.manifest\.profile\.profileId: Executable profile .* does not match domain municipal/],
    [(value) => { ((value.manifest as Record<string, unknown>).profile as Record<string, unknown>).modelVersion = "future"; }, /\$\.manifest\.profile\.modelVersion: does not match trusted executable identity/],
    [(value) => { ((value.manifest as Record<string, unknown>).profile as Record<string, unknown>).calibrationVersion = "future"; }, /\$\.manifest\.profile\.calibrationVersion: does not match trusted executable identity/],
    [(value) => { ((value.manifest as Record<string, unknown>).engine as Record<string, unknown>).modelVersion = "future"; }, /\$\.manifest\.engine\.modelVersion: does not match trusted executable identity/],
    [(value) => { ((value.manifest as Record<string, unknown>).engine as Record<string, unknown>).algorithmVersion = "future"; }, /\$\.manifest\.engine\.algorithmVersion: must equal the canonical legacy real-estate engine algorithm version/],
    [(value) => { ((value.manifest as Record<string, unknown>).input as Record<string, unknown>).fixtureId = "other"; }, /\$\.manifest\.input\.fixtureId: must equal \$\.fixtureId/],
    [(value) => { ((value.manifest as Record<string, unknown>).input as Record<string, unknown>).canonicalHash = "1".repeat(64); }, /\$\.manifest\.input\.canonicalHash: must equal \$\.inputHash/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).engineResultHash = "1".repeat(64); }, /\$\.manifest\.result\.engineResultHash: must equal \$\.engineResultHash/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).structuralObservationHash = "1".repeat(64); }, /\$\.manifest\.result\.structuralObservationHash: must equal \$\.structuralObservationHash/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).provenanceHash = "1".repeat(64); }, /\$\.manifest\.result\.provenanceHash: must equal \$\.provenanceHash/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).persistenceHash = "1".repeat(64); }, /\$\.manifest\.result\.persistenceHash: must equal \$\.persistenceHash/],
    [(value) => { delete ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).persistenceHash; }, /\$\.manifest\.result\.persistenceHash: is required when \$\.persistenceHash is present/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).structuralDefinitionFingerprint = "1".repeat(64); }, /\$\.manifest\.result\.structuralDefinitionFingerprint: must equal \$\.structuralDefinitionFingerprint/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).scenarioPlanFingerprintA = "1".repeat(64); }, /\$\.manifest\.result\.scenarioPlanFingerprintA: must equal \$\.scenarioPlanFingerprintA/],
    [(value) => { ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).scenarioPlanFingerprintB = "1".repeat(64); }, /\$\.manifest\.result\.scenarioPlanFingerprintB: must equal \$\.scenarioPlanFingerprintB/],
    [(value) => { ((value.manifest as Record<string, unknown>).profile as Record<string, unknown>).semanticPayloadHash = "1".repeat(64); }, /\$\.manifest\.profile\.semanticPayloadHash: does not match the current M0B-2 semantic payload/],
    [(value) => { (value.manifest as Record<string, unknown>).executionSurface = "other-surface"; }, /\$\.manifest\.executionSurface: must equal the canonical Structural Observation execution surface/],
  ];
  for (const [mutate, path] of cases) {
    const value = structuredClone(goldenJson) as Record<string, unknown>;
    mutate(value);
    assert.throws(() => parseStructuralObservationOutputGoldenV1(value), path);
  }
});

test("output Golden parser requires every manifest exact metric to exist and canonically match the full Golden metrics", () => {
  const cases: ReadonlyArray<readonly [(value: Record<string, unknown>) => void, RegExp]> = [
    [(value) => { (((value.manifest as Record<string, unknown>).result as Record<string, unknown>).expectedExactMetrics as Record<string, unknown>).missingMetric = 1; }, /\$\.manifest\.result\.expectedExactMetrics\.missingMetric: is missing from \$\.exactMetrics/],
    [(value) => { (((value.manifest as Record<string, unknown>).result as Record<string, unknown>).expectedExactMetrics as Record<string, unknown>).horizon = 5; }, /\$\.manifest\.result\.expectedExactMetrics\.horizon: must canonically equal \$\.exactMetrics\.horizon/],
    [(value) => { const metrics = ((value.manifest as Record<string, unknown>).result as Record<string, unknown>).expectedExactMetrics as Record<string, unknown>; metrics.nestedMetric = { values: [1, 2] }; (value.exactMetrics as Record<string, unknown>).nestedMetric = { values: [1, 3] }; }, /\$\.manifest\.result\.expectedExactMetrics\.nestedMetric: must canonically equal \$\.exactMetrics\.nestedMetric/],
  ];
  for (const [mutate, path] of cases) {
    const value = structuredClone(goldenJson) as Record<string, unknown>;
    mutate(value);
    assert.throws(() => parseStructuralObservationOutputGoldenV1(value), path);
  }
});

test("reviewed Golden locks the complete canonical observation, provenance, persistence, manifest, and exact metrics", async () => {
  const first = await projectStructuralObservationGoldenV2(input);
  const second = await projectStructuralObservationGoldenV2(input);
  assert.equal(canonicalizeBaselineValueV1(first), canonicalizeBaselineValueV1(second));
  assert.deepEqual(structuralObservationGoldenHashes(first), {
    engineResultHash: golden.engineResultHash,
    structuralObservationHash: golden.structuralObservationHash,
    provenanceHash: golden.provenanceHash,
    persistenceHash: golden.persistenceHash,
  });
  assert.equal(hashBaselineValueV1(input), golden.inputHash);
  assert.deepEqual(metrics(first), golden.exactMetrics);
  assert.equal(hashBaselineValueV1(golden.manifest), golden.manifestHash);
  assert.equal(first.engineResultPreservation.beforeHash, first.engineResultPreservation.afterHash);
  assert.equal(first.engineResultPreservation.preserved, true);
  assertFrozen(first);

  assert.equal(golden.manifest.input.fixtureId, input.fixtureId);
  assert.equal(golden.manifest.input.canonicalHash, golden.inputHash);
  assert.deepEqual(golden.manifest.profile, { domainId: "realEstate", profileId: "legacy-real-estate-v1", modelVersion: "pilot-fastighet-v0.4", calibrationVersion: "legacy-global-v1", semanticPayloadHash: "898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc" });
  assert.equal(golden.manifest.result.structuralDefinitionFingerprint, first.observationIdentity.structuralDefinitionFingerprint);
  assert.equal(golden.manifest.result.scenarioPlanFingerprintA, first.observationIdentity.scenarioPlanFingerprintA);
  assert.equal(golden.manifest.result.scenarioPlanFingerprintB, first.observationIdentity.scenarioPlanFingerprintB);
  assert.equal(golden.manifest.result.structuralObservationHash, golden.structuralObservationHash);
  assert.equal(golden.manifest.result.engineResultHash, golden.engineResultHash);
  assert.equal(golden.manifest.result.persistenceHash, golden.persistenceHash);
  assert.equal(golden.structuralDefinitionFingerprint, first.observationIdentity.structuralDefinitionFingerprint);
  assert.equal(golden.scenarioPlanFingerprintA, first.observationIdentity.scenarioPlanFingerprintA);
  assert.equal(golden.scenarioPlanFingerprintB, first.observationIdentity.scenarioPlanFingerprintB);
});

test("snapshots and provenance lock post-hoc blocking semantics without changing execution", async () => {
  const projection = await projectStructuralObservationGoldenV2(input);
  const aDiagnostics = projection.snapshots.A.flatMap(({ diagnostics }) => diagnostics);
  for (const code of ["would-be-blocked", "resource-overallocated", "executed-despite-structural-block", "prerequisite-executed-same-period"]) {
    assert.ok(aDiagnostics.some((diagnostic) => diagnostic.code === code));
  }
  assert.deepEqual(projection.snapshots.A.map(({ period, phase }) => [period, phase]), [[1, "before-execution"], [1, "after-transition"], [2, "before-execution"], [2, "after-transition"], [3, "before-execution"], [3, "after-transition"], [4, "before-execution"], [4, "after-transition"]]);
  const entries = [...projection.executionProvenance.A.entries, ...projection.executionProvenance.B.entries];
  assert.deepEqual(entries.map(({ scenario, initiativeId }) => `${scenario}:${initiativeId}`), ["A:dependent", "A:foundation", "A:parallel", "B:foundation", "B:parallel", "B:dependent"]);
  assert.ok(entries.every(({ effectDefinitionId, scheduledExecutionPeriod, actualExecutionPeriod, appliedDriverDeltas }) => effectDefinitionId.length > 0 && scheduledExecutionPeriod === actualExecutionPeriod && Object.keys(appliedDriverDeltas).length > 0));
  assert.ok(projection.snapshots.A[1].initiatives.every(({ executionStatus }) => executionStatus === "executed-despite-structural-block"));
});

test("saved-run baseline preserves identities through JSON and classifies every compatibility dimension", async () => {
  const projection = await projectStructuralObservationGoldenV2(input);
  const executionIdentity = projection.profileIdentity as ExecutableIdentity;
  const identity = projection.observationIdentity as InitiativeStructuralObservationIdentity;
  const make = (execution = executionIdentity, observation: InitiativeStructuralObservationIdentity | undefined = identity): SavedRunSnapshot => createSavedRunSnapshot({ snapshotId: "canonical", createdAt: 0, engineState: { margin: 1 } as EngineState, caseId: input.fixtureId, scenario: "A", executionIdentity: execution, initiativeStructuralObservationIdentity: observation });
  const source = make();
  const restored = readSavedRunHistory(JSON.stringify([source]))[0];
  assert.notStrictEqual(restored, source);
  assert.notStrictEqual(restored.executionIdentity, source.executionIdentity);
  assert.deepEqual(restored.executionIdentity, executionIdentity);
  assert.deepEqual(restored.initiativeStructuralObservationIdentity, identity);
  assert.equal(evaluateSavedRunCompatibility(source, restored).classification, "compatible");
  assert.equal(evaluateSavedRunInitiativeStructuralObservationCompatibility(restored, identity).classification, "compatible");

  const executableChanges = [
    [{ ...executionIdentity, domainId: "municipal" }, "different-domain"],
    [{ ...executionIdentity, profileId: "legacy-consulting-v1" }, "different-profile"],
    [{ ...executionIdentity, modelVersion: "next" }, "different-model-version"],
    [{ ...executionIdentity, calibrationVersion: "next" }, "different-calibration-version"],
  ] as const;
  for (const [changed, expected] of executableChanges) assert.equal(evaluateSavedRunCompatibility(source, make(changed as ExecutableIdentity)).classification, expected);

  for (const [change, expected] of [
    [{ horizon: identity.horizon + 1 }, "horizon-mismatch"],
    [{ structuralDefinitionFingerprint: "1".repeat(64) }, "structural-definition-mismatch"],
    [{ scenarioPlanFingerprintA: "2".repeat(64) }, "scenario-plan-a-mismatch"],
    [{ scenarioPlanFingerprintB: "3".repeat(64) }, "scenario-plan-b-mismatch"],
  ] as const) {
    assert.equal(evaluateSavedRunInitiativeStructuralObservationCompatibility(source, { ...identity, ...change }).classification, expected);
  }
  const legacy = createSavedRunSnapshot({ snapshotId: "legacy", createdAt: 0, engineState: { margin: 1 } as EngineState, caseId: null, scenario: "A", executionIdentity });
  assert.equal(evaluateSavedRunInitiativeStructuralObservationCompatibility(legacy, identity).classification, "missing-identity");
  assert.deepEqual(projection.persistence.intentionallyNotPersisted, ["completeAnalysisResult", "diagnostics", "executionProvenance", "snapshots"]);
});

test("runtime sources never import M0B-4 test support", () => {
  for (const file of ["../savedRunPersistence.ts", "../structuralObservation/observeCompletedInitiativeStructuralAnalysis.ts", "../structuralObservation/runInitiativeScheduledAnalysis.ts"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /analysis\/testSupport|structuralObservationGoldenV2/);
  }
});
