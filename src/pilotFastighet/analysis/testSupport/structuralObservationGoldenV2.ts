import { defaultRiskState } from "../../presetRiskMapping";
import { getExecutableIdentity, getExecutableProfileIdForDomain, resolveExecutableDomainProfile } from "../../executableDomainProfile";
import {
  createSavedRunSnapshot,
  readSavedRunHistory,
} from "../savedRunPersistence";
import { observeCompletedInitiativeStructuralAnalysis } from "../structuralObservation/observeCompletedInitiativeStructuralAnalysis";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
} from "../structuralObservation/runInitiativeScheduledAnalysis";
import {
  canonicalizeBaselineValueV1,
  hashBaselineValueV1,
  type BaselineJsonValue,
} from "./baselineCanonicalizationV1";
import {
  parseDomainModelBaselineManifestV1,
  type DomainModelBaselineManifestV1,
} from "./domainModelBaselineManifestV1";
import { projectLegacyDomainProfileSemanticPayloadV1 } from "./legacyDomainProfileSemanticPayloadV1";

export type StructuralObservationGoldenInputV1 = Readonly<{
  version: "structural-observation-golden-input-v1";
  fixtureId: string;
  domainId: "realEstate";
  profileId: "legacy-real-estate-v1";
  horizon: number;
  contract: BaselineJsonValue;
  schedules: BaselineJsonValue;
  initialState: BaselineJsonValue;
}>;

export type StructuralObservationOutputGoldenV1 = Readonly<{
  version: "structural-observation-output-golden-v1";
  fixtureId: string;
  inputHash: string;
  engineResultHash: string;
  structuralObservationHash: string;
  provenanceHash: string;
  persistenceHash: string;
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
  exactMetrics: Readonly<Record<string, BaselineJsonValue>>;
  manifest: DomainModelBaselineManifestV1;
  manifestHash: string;
}>;

const INPUT_FIELDS = ["version", "fixtureId", "domainId", "profileId", "horizon", "contract", "schedules", "initialState"] as const;
const GOLDEN_FIELDS = ["version", "fixtureId", "inputHash", "engineResultHash", "structuralObservationHash", "provenanceHash", "persistenceHash", "structuralDefinitionFingerprint", "scenarioPlanFingerprintA", "scenarioPlanFingerprintB", "exactMetrics", "manifest", "manifestHash"] as const;
const HASH_FIELDS = ["inputHash", "engineResultHash", "structuralObservationHash", "provenanceHash", "persistenceHash", "structuralDefinitionFingerprint", "scenarioPlanFingerprintA", "scenarioPlanFingerprintB", "manifestHash"] as const;
const RESULT_BINDINGS = [
  ["engineResultHash", "engineResultHash"],
  ["structuralObservationHash", "structuralObservationHash"],
  ["provenanceHash", "provenanceHash"],
  ["persistenceHash", "persistenceHash"],
  ["structuralDefinitionFingerprint", "structuralDefinitionFingerprint"],
  ["scenarioPlanFingerprintA", "scenarioPlanFingerprintA"],
  ["scenarioPlanFingerprintB", "scenarioPlanFingerprintB"],
] as const;
const HASH = /^[0-9a-f]{64}$/;

function fail(path: string, reason: string): never {
  throw new TypeError(`Structural Observation Golden validation failed at ${path}: ${reason}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(path, "must be a plain object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, "must be a plain object");
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, fields: readonly string[], path: string): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${path}.${key}`, "unknown field");
  for (const key of fields) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key}`, "required field is missing");
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function detached<T>(value: T): T {
  return freeze(structuredClone(value));
}

function validateInitialState(value: unknown): void {
  const state = record(value, "$.initialState");
  exact(state, ["initialRiskState", "initialDriverScores"], "$.initialState");
  const risks = record(state.initialRiskState, "$.initialState.initialRiskState");
  const scores = record(state.initialDriverScores, "$.initialState.initialDriverScores");
  const keys = Object.keys(defaultRiskState).sort();
  exact(risks, keys, "$.initialState.initialRiskState");
  exact(scores, keys, "$.initialState.initialDriverScores");
  for (const key of keys) {
    if (!["LOW", "MODERATE", "HIGH"].includes(String(risks[key]))) fail(`$.initialState.initialRiskState.${key}`, "invalid risk state");
    if (typeof scores[key] !== "number" || !Number.isFinite(scores[key]) || Object.is(scores[key], -0)) fail(`$.initialState.initialDriverScores.${key}`, "must be a finite number other than negative zero");
  }
}

export function parseStructuralObservationGoldenInputV1(value: unknown): StructuralObservationGoldenInputV1 {
  canonicalizeBaselineValueV1(value);
  const input = record(value, "$");
  exact(input, INPUT_FIELDS, "$");
  if (input.version !== "structural-observation-golden-input-v1") fail("$.version", "unsupported version");
  if (typeof input.fixtureId !== "string" || input.fixtureId.length === 0) fail("$.fixtureId", "must be non-empty");
  if (input.domainId !== "realEstate") fail("$.domainId", "must identify the executable real-estate domain");
  if (input.profileId !== "legacy-real-estate-v1") fail("$.profileId", "must identify the executable real-estate profile");
  if (!Number.isInteger(input.horizon) || (input.horizon as number) < 1) fail("$.horizon", "must be a positive integer");
  validateInitialState(input.initialState);
  resolveExecutableDomainProfile(input.profileId, input.domainId);
  try {
    prepareInitiativeScheduledAnalysis({
      version: "initiative-scheduled-analysis-input-v1",
      executionMode: "initiative-schedule-v1",
      domainId: input.domainId,
      profileId: input.profileId,
      horizon: input.horizon as number,
      contract: input.contract,
      schedules: input.schedules,
      initialState: input.initialState,
    } as InitiativeScheduledAnalysisInputV1);
  } catch (error) {
    fail("$", error instanceof Error ? error.message : "invalid initiative input");
  }
  return detached(value) as StructuralObservationGoldenInputV1;
}

export function parseStructuralObservationOutputGoldenV1(value: unknown): StructuralObservationOutputGoldenV1 {
  canonicalizeBaselineValueV1(value);
  const golden = record(value, "$");
  exact(golden, GOLDEN_FIELDS, "$");
  if (golden.version !== "structural-observation-output-golden-v1") fail("$.version", "unsupported version");
  if (typeof golden.fixtureId !== "string" || golden.fixtureId.length === 0) fail("$.fixtureId", "must be non-empty");
  for (const field of HASH_FIELDS) if (typeof golden[field] !== "string" || !HASH.test(golden[field])) fail(`$.${field}`, "must be exactly 64 lowercase hexadecimal characters");
  canonicalizeBaselineValueV1(record(golden.exactMetrics, "$.exactMetrics"), "$.exactMetrics");
  const manifest = parseDomainModelBaselineManifestV1(golden.manifest);
  let profile;
  try {
    getExecutableProfileIdForDomain(manifest.profile.domainId as never);
  } catch {
    fail("$.manifest.profile.domainId", "unknown executable domain");
  }
  try {
    profile = resolveExecutableDomainProfile(manifest.profile.profileId as never, manifest.profile.domainId as never);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid executable profile";
    fail("$.manifest.profile.profileId", message);
  }
  const identity = getExecutableIdentity(profile);
  if (manifest.profile.modelVersion !== identity.modelVersion) fail("$.manifest.profile.modelVersion", "does not match trusted executable identity");
  if (manifest.profile.calibrationVersion !== identity.calibrationVersion) fail("$.manifest.profile.calibrationVersion", "does not match trusted executable identity");
  if (manifest.engine.modelVersion !== identity.modelVersion) fail("$.manifest.engine.modelVersion", "does not match trusted executable identity");
  if (manifest.engine.algorithmVersion !== "unversioned-legacy-real-estate-engine") fail("$.manifest.engine.algorithmVersion", "must equal the canonical legacy real-estate engine algorithm version");
  if (golden.fixtureId !== manifest.input.fixtureId) fail("$.manifest.input.fixtureId", "must equal $.fixtureId");
  if (golden.inputHash !== manifest.input.canonicalHash) fail("$.manifest.input.canonicalHash", "must equal $.inputHash");
  for (const [goldenField, manifestField] of RESULT_BINDINGS) {
    const manifestValue = manifest.result[manifestField];
    if (manifestValue === undefined) fail(`$.manifest.result.${manifestField}`, `is required when $.${goldenField} is present`);
    if (golden[goldenField] !== manifestValue) fail(`$.manifest.result.${manifestField}`, `must equal $.${goldenField}`);
  }
  if (manifest.executionSurface !== "observeCompletedInitiativeStructuralAnalysis") fail("$.manifest.executionSurface", "must equal the canonical Structural Observation execution surface");
  const semanticPayloadHash = hashBaselineValueV1(projectLegacyDomainProfileSemanticPayloadV1(profile.profileId));
  if (manifest.profile.semanticPayloadHash !== semanticPayloadHash) fail("$.manifest.profile.semanticPayloadHash", "does not match the current M0B-2 semantic payload");
  for (const metric of Object.keys(manifest.result.expectedExactMetrics).sort()) {
    if (!Object.prototype.hasOwnProperty.call(golden.exactMetrics, metric)) fail(`$.manifest.result.expectedExactMetrics.${metric}`, "is missing from $.exactMetrics");
    const expected = manifest.result.expectedExactMetrics[metric];
    const actual = (golden.exactMetrics as Record<string, BaselineJsonValue>)[metric];
    if (canonicalizeBaselineValueV1(expected) !== canonicalizeBaselineValueV1(actual)) fail(`$.manifest.result.expectedExactMetrics.${metric}`, `must canonically equal $.exactMetrics.${metric}`);
  }
  if (hashBaselineValueV1(manifest) !== golden.manifestHash) fail("$.manifestHash", "does not match the canonical manifest hash");
  return detached({ ...golden, manifest }) as StructuralObservationOutputGoldenV1;
}

function runtimeInput(input: StructuralObservationGoldenInputV1): InitiativeScheduledAnalysisInputV1 {
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: input.domainId,
    profileId: input.profileId,
    horizon: input.horizon,
    contract: input.contract,
    schedules: input.schedules,
    initialState: input.initialState,
  } as InitiativeScheduledAnalysisInputV1;
}

/**
 * Canonical semantic projection. Deliberately excludes labels, UI/AI/copy,
 * wall-clock values, storage labels/IDs, and non-serializable object identity.
 */
export async function projectStructuralObservationGoldenV2(input: StructuralObservationGoldenInputV1) {
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(runtimeInput(input));
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const projectEngineResult = () => ({
    version: analysisResult.version,
    executionMode: analysisResult.executionMode,
    executionIdentity: analysisResult.executionIdentity,
    horizon: analysisResult.horizon,
    baseline: {
      trajectory: analysisResult.baseline.trajectory,
      terminalState: analysisResult.baseline.terminalState,
      marginHistory: analysisResult.baseline.marginHistory,
      constraintHistory: analysisResult.baseline.constraintHistory,
      cascadeHistory: analysisResult.baseline.cascadeHistory,
    },
    scenarioA: analysisResult.scenarioA,
    scenarioB: analysisResult.scenarioB,
    comparison: analysisResult.comparison,
  });
  const engineBeforeProjection = projectEngineResult();
  const engineBefore = hashBaselineValueV1(engineBeforeProjection);
  const observed = await observeCompletedInitiativeStructuralAnalysis({ preparedAnalysis, analysisResult });
  const engineAfter = hashBaselineValueV1(projectEngineResult());
  if (engineBefore !== engineAfter) throw new Error("Structural observation mutated the completed engine result.");
  const profileIdentity = getExecutableIdentity(preparedAnalysis.profile);
  const persistenceSource = createSavedRunSnapshot({
    snapshotId: "excluded-canonical-storage-id",
    createdAt: 0,
    engineState: analysisResult.scenarioA.trajectory[analysisResult.scenarioA.trajectory.length - 1],
    caseId: input.fixtureId,
    scenario: "A",
    executionIdentity: profileIdentity,
    initiativeStructuralObservationIdentity: observed.identity,
  });
  const restored = readSavedRunHistory(JSON.stringify([persistenceSource]))[0];
  const persistence = {
    version: "structural-observation-persistence-projection-v1",
    executionIdentity: restored.executionIdentity,
    initiativeStructuralObservationIdentity: restored.initiativeStructuralObservationIdentity,
    metadata: restored.metadata,
    engineStateHash: hashBaselineValueV1(restored.engineState),
    persistedSemanticFields: ["engineState", "executionIdentity", "initiativeStructuralObservationIdentity", "metadata"],
    intentionallyNotPersisted: ["completeAnalysisResult", "diagnostics", "executionProvenance", "snapshots"],
  };
  const projection = {
    version: "canonical-structural-observation-output-v2",
    fixtureId: input.fixtureId,
    executionSurface: "observeCompletedInitiativeStructuralAnalysis",
    profileIdentity,
    horizon: preparedAnalysis.horizon,
    observationIdentity: observed.identity,
    resolvedSchedules: preparedAnalysis.resolvedSchedules,
    executionProvenance: {
      A: analysisResult.scenarioA.executionProvenance,
      B: analysisResult.scenarioB.executionProvenance,
    },
    snapshots: observed.result.scenarios,
    engineResultPreservation: {
      resultIdentity: {
        version: analysisResult.version,
        executionMode: analysisResult.executionMode,
        executionIdentity: analysisResult.executionIdentity,
        horizon: analysisResult.horizon,
      },
      beforeHash: engineBefore,
      afterHash: engineAfter,
      preserved: true,
    },
    persistence,
  };
  canonicalizeBaselineValueV1(projection);
  return detached(projection);
}

export function structuralObservationGoldenHashes(projection: Awaited<ReturnType<typeof projectStructuralObservationGoldenV2>>) {
  return freeze({
    engineResultHash: projection.engineResultPreservation.beforeHash,
    structuralObservationHash: hashBaselineValueV1({
      profileIdentity: projection.profileIdentity,
      horizon: projection.horizon,
      observationIdentity: projection.observationIdentity,
      resolvedSchedules: projection.resolvedSchedules,
      snapshots: projection.snapshots,
    }),
    provenanceHash: hashBaselineValueV1(projection.executionProvenance),
    persistenceHash: hashBaselineValueV1(projection.persistence),
  });
}
