import { getExecutableIdentity, resolveExecutableDomainProfile, type ExecutableProfileId } from "../../executableDomainProfile";
import { runCascadeAnalysis, type AnalyticalResults, type ScheduledAnalyticalResults } from "../runCascadeAnalysis";
import { projectLegacyDomainProfileSemanticPayloadV1 } from "./legacyDomainProfileSemanticPayloadV1";

export type EngineBaselineInputFixtureV1 = Readonly<{
  version: "engine-baseline-input-v1";
  fixtureId: string;
  kind: "neutral" | "stressed-scheduled";
  domainId: "realEstate" | "municipal" | "consulting";
  profileId: ExecutableProfileId;
  horizon: number;
  initialState: Readonly<{
    riskState: Readonly<Record<string, "LOW" | "MODERATE" | "HIGH" | "SEVERE">>;
    driverScores: Readonly<Record<string, number>>;
  }>;
  schedules: Readonly<{
    A: readonly Readonly<{ actionId: string; executionStep: number }>[];
    B: readonly Readonly<{ actionId: string; executionStep: number }>[];
  }>;
}>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function fail(path: string, reason: string): never {
  throw new TypeError(`Engine Baseline Input Fixture V1 validation failed at ${path}: ${reason}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(path, "must be a plain object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, "must be a plain object");
  if (Object.getOwnPropertySymbols(value).length > 0) fail(path, "symbol keys are not supported");
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) fail(`${path}.${key}`, "non-enumerable fields are not supported");
    if (!("value" in descriptor)) fail(`${path}.${key}`, "accessor fields are not supported");
  }
  return value as Record<string, unknown>;
}

function exactFields(value: Record<string, unknown>, fields: readonly string[], path: string): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${path}.${key}`, "unknown field");
  for (const key of fields) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key}`, "required field is missing");
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(path, "must be an array");
  if (Object.getOwnPropertySymbols(value).length > 0) fail(path, "symbol keys are not supported");
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) fail(`${path}[${index}]`, "sparse arrays are not supported");
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) fail(`${path}[${index}]`, "accessor entries are not supported");
  }
  const allowed = new Set(["length", ...value.map((_, index) => String(index))]);
  for (const key of Object.getOwnPropertyNames(value)) if (!allowed.has(key)) fail(`${path}.${key}`, "unknown array field");
  return value;
}

function nonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
}

export function parseEngineBaselineInputFixtureV1(value: unknown): EngineBaselineInputFixtureV1 {
  const fixture = record(value, "$");
  exactFields(fixture, ["version", "fixtureId", "kind", "domainId", "profileId", "horizon", "initialState", "schedules"], "$");
  if (fixture.version !== "engine-baseline-input-v1") fail("$.version", "must equal \"engine-baseline-input-v1\"");
  nonEmptyString(fixture.fixtureId, "$.fixtureId");
  if (fixture.kind !== "neutral" && fixture.kind !== "stressed-scheduled") fail("$.kind", "must be neutral or stressed-scheduled");
  if (fixture.domainId !== "realEstate" && fixture.domainId !== "municipal" && fixture.domainId !== "consulting") fail("$.domainId", "must be a known domain ID");
  if (fixture.profileId !== "legacy-real-estate-v1" && fixture.profileId !== "legacy-municipal-v1" && fixture.profileId !== "legacy-consulting-v1") fail("$.profileId", "must be a known profile ID");
  try {
    resolveExecutableDomainProfile(fixture.profileId, fixture.domainId);
  } catch {
    fail("$.profileId", `does not match domain ${fixture.domainId}`);
  }
  if (!Number.isInteger(fixture.horizon) || (fixture.horizon as number) <= 0) fail("$.horizon", "must be a positive integer");

  const initialState = record(fixture.initialState, "$.initialState");
  exactFields(initialState, ["riskState", "driverScores"], "$.initialState");
  const riskState = record(initialState.riskState, "$.initialState.riskState");
  const driverScores = record(initialState.driverScores, "$.initialState.driverScores");
  const intendedKeys = Object.keys(resolveExecutableDomainProfile(fixture.profileId, fixture.domainId).defaultState).sort();
  exactFields(riskState, intendedKeys, "$.initialState.riskState");
  exactFields(driverScores, intendedKeys, "$.initialState.driverScores");
  for (const key of intendedKeys) {
    if (!(["LOW", "MODERATE", "HIGH", "SEVERE"] as const).includes(riskState[key] as never)) fail(`$.initialState.riskState.${key}`, "must be a valid risk level");
    const score = driverScores[key];
    if (typeof score !== "number" || !Number.isFinite(score) || Object.is(score, -0)) fail(`$.initialState.driverScores.${key}`, "must be finite and must not be -0");
  }

  const schedules = record(fixture.schedules, "$.schedules");
  exactFields(schedules, ["A", "B"], "$.schedules");
  const supported = new Set(projectLegacyDomainProfileSemanticPayloadV1(fixture.profileId).supportedActionIds);
  const actionSets: Record<"A" | "B", Set<string>> = { A: new Set(), B: new Set() };
  for (const scenario of ["A", "B"] as const) {
    const entries = array(schedules[scenario], `$.schedules.${scenario}`);
    entries.forEach((entry, index) => {
      const path = `$.schedules.${scenario}[${index}]`;
      const action = record(entry, path);
      exactFields(action, ["actionId", "executionStep"], path);
      nonEmptyString(action.actionId, `${path}.actionId`);
      if (!supported.has(action.actionId)) fail(`${path}.actionId`, "must be supported by the resolved profile");
      if (actionSets[scenario].has(action.actionId)) fail(`${path}.actionId`, "duplicate action within scenario");
      actionSets[scenario].add(action.actionId);
      if (!Number.isInteger(action.executionStep) || (action.executionStep as number) < 1 || (action.executionStep as number) > (fixture.horizon as number)) fail(`${path}.executionStep`, "must be an integer within 1..horizon");
    });
  }
  if (fixture.kind === "neutral" && (actionSets.A.size > 0 || actionSets.B.size > 0)) fail("$.schedules", "neutral fixtures require empty schedules");
  if (fixture.kind === "stressed-scheduled" && actionSets.A.size === 0) fail("$.schedules.A", "stressed-scheduled fixtures require at least one entry");
  if (fixture.kind === "stressed-scheduled" && actionSets.B.size === 0) fail("$.schedules.B", "stressed-scheduled fixtures require at least one entry");
  if (fixture.kind === "stressed-scheduled" && (actionSets.A.size !== actionSets.B.size || [...actionSets.A].some((id) => !actionSets.B.has(id)))) fail("$.schedules", "stressed-scheduled fixtures require the same action set in A and B");

  return deepFreeze(structuredClone(value)) as EngineBaselineInputFixtureV1;
}

function scenarioProjection(result: AnalyticalResults["scenarioA"]) {
  return {
    trajectory: structuredClone(result.trajectory),
    terminalState: structuredClone(result.terminalState),
    marginHistory: [...result.marginHistory],
    constraintHistory: structuredClone(result.constraintHistory),
    cascadeHistory: structuredClone(result.cascadeHistory),
  };
}

export function runEngineBaselineFixtureV1(fixture: EngineBaselineInputFixtureV1) {
  const profile = resolveExecutableDomainProfile(fixture.profileId, fixture.domainId);
  const common = {
    profileId: fixture.profileId,
    horizon: fixture.horizon,
    scenarioA: { initialRiskState: structuredClone(fixture.initialState.riskState), initialDriverScores: structuredClone(fixture.initialState.driverScores) },
    scenarioB: { initialRiskState: structuredClone(fixture.initialState.riskState), initialDriverScores: structuredClone(fixture.initialState.driverScores) },
    baseline: { initialRiskState: structuredClone(fixture.initialState.riskState), initialDriverScores: structuredClone(fixture.initialState.driverScores) },
  };
  const result = fixture.kind === "neutral"
    ? runCascadeAnalysis({ ...common, executionMode: "preconfigured" })
    : runCascadeAnalysis({
        ...common,
        executionMode: "scheduled",
        scenarioAActions: structuredClone(fixture.schedules.A) as never,
        scenarioBActions: structuredClone(fixture.schedules.B) as never,
      });
  const scheduled = result as Partial<ScheduledAnalyticalResults>;
  return deepFreeze({
    schemaVersion: "canonical-engine-output-projection-v1" as const,
    fixtureId: fixture.fixtureId,
    executionSurface: fixture.kind === "neutral" ? "runCascadeAnalysis/preconfigured" : "runCascadeAnalysis/scheduled",
    profileIdentity: getExecutableIdentity(profile),
    horizon: fixture.horizon,
    plannedSchedules: structuredClone(fixture.schedules),
    scenarioA: scenarioProjection(result.scenarioA),
    scenarioB: scenarioProjection(result.scenarioB),
    baseline: scenarioProjection(result.baseline),
    comparison: structuredClone(result.comparison),
    executionProvenance: structuredClone(scheduled.executionProvenance ?? []),
  });
}
