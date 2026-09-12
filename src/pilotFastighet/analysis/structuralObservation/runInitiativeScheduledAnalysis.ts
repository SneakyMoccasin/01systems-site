import { domainDrivers } from "../../../i18n/pulseLanguage";
import {
  getExecutableIdentity,
  resolveExecutableDomainProfile,
} from "../../executableDomainProfile";
import {
  compareScenarioTrajectories,
  createScenarioAnalysisResult,
} from "../cascadeAnalysisProjection";
import { runPreconfiguredScenario } from "../runPreconfiguredScenario";
import { resolveInitiativeSchedules } from "./resolveInitiativeSchedules";
import { runInitiativeScenario } from "./runInitiativeScenario";
import type {
  InitiativeScheduledAnalysisInputV1,
  InitiativeScheduledAnalysisResultV1,
  PreparedInitiativeScheduledAnalysisV1,
} from "./initiativeScheduledAnalysisContract";
export type {
  InitiativeScheduledAnalysisInputV1,
  InitiativeScheduledAnalysisResultV1,
  PreparedInitiativeScheduledAnalysisV1,
} from "./initiativeScheduledAnalysisContract";
import {
  validateAndNormalizeStructuralObservationContractV2,
  type StructuralObservationV2ValidationIssue,
} from "./validationV2";
import {
  validateAndNormalizeScenarioInitiativeSchedulesV1,
  type InitiativeScheduleValidationIssue,
} from "./validateInitiativeSchedules";

export type InitiativeScheduledAnalysisInputIssue = Readonly<{
  code:
    | "invalid-input"
    | "unknown-field"
    | "unknown-version"
    | "unknown-execution-mode"
    | "unknown-domain"
    | "invalid-profile-id"
    | "invalid-horizon"
    | "invalid-initial-state";
  path: string;
  message: string;
}>;

export type InitiativeScheduledAnalysisValidationIssue =
  | InitiativeScheduledAnalysisInputIssue
  | StructuralObservationV2ValidationIssue
  | InitiativeScheduleValidationIssue;

export class InitiativeScheduledAnalysisValidationError extends Error {
  readonly stage: "input" | "contract" | "schedule";
  readonly issues: readonly InitiativeScheduledAnalysisValidationIssue[];

  constructor(
    stage: "input" | "contract" | "schedule",
    issues: readonly InitiativeScheduledAnalysisValidationIssue[]
  ) {
    super(`Initiative scheduled analysis ${stage} validation failed.`);
    this.name = "InitiativeScheduledAnalysisValidationError";
    this.stage = stage;
    this.issues = deepFreeze(issues.map((issue) => ({ ...issue })));
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) deepFreeze(nested);
  }
  return value;
}

function validateTopLevel(input: unknown): asserts input is InitiativeScheduledAnalysisInputV1 {
  const source = record(input);
  if (!source) {
    throw new InitiativeScheduledAnalysisValidationError("input", [
      { code: "invalid-input", path: "$", message: "Initiative scheduled analysis input must be an object." },
    ]);
  }
  const issues: InitiativeScheduledAnalysisInputIssue[] = [];
  const allowed = new Set([
    "version",
    "executionMode",
    "domainId",
    "profileId",
    "horizon",
    "contract",
    "schedules",
    "initialState",
  ]);
  for (const key of Object.keys(source).sort(compareText)) {
    if (!allowed.has(key)) {
      issues.push({ code: "unknown-field", path: key, message: `Unknown orchestration field ${key}.` });
    }
  }
  if (source.version !== "initiative-scheduled-analysis-input-v1") {
    issues.push({ code: "unknown-version", path: "version", message: "Unsupported initiative analysis input version." });
  }
  if (source.executionMode !== "initiative-schedule-v1") {
    issues.push({ code: "unknown-execution-mode", path: "executionMode", message: "Unsupported initiative execution mode." });
  }
  if (
    typeof source.domainId !== "string" ||
    !Object.prototype.hasOwnProperty.call(domainDrivers, source.domainId)
  ) {
    issues.push({ code: "unknown-domain", path: "domainId", message: "Unknown executable domain." });
  }
  if (typeof source.profileId !== "string" || source.profileId.length === 0) {
    issues.push({ code: "invalid-profile-id", path: "profileId", message: "Executable profile ID must be supplied." });
  }
  const initialState = record(source.initialState);
  if (!initialState || !record(initialState.initialRiskState)) {
    issues.push({ code: "invalid-initial-state", path: "initialState", message: "Initial state must contain an initial risk state." });
  } else {
    const allowedInitial = new Set(["initialRiskState", "initialDriverScores"]);
    for (const key of Object.keys(initialState).sort(compareText)) {
      if (!allowedInitial.has(key)) {
        issues.push({ code: "unknown-field", path: `initialState.${key}`, message: `Unknown initial-state field ${key}.` });
      }
    }
  }
  if (issues.length > 0) {
    issues.sort((left, right) => compareText(left.path, right.path) || compareText(left.code, right.code));
    throw new InitiativeScheduledAnalysisValidationError("input", issues);
  }
}

function validateHorizon(horizon: number): void {
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new InitiativeScheduledAnalysisValidationError("input", [
      { code: "invalid-horizon", path: "horizon", message: "Horizon must be a positive integer." },
    ]);
  }
}

/** @internal The single validation/resolution boundary for initiative mode. */
export function prepareInitiativeScheduledAnalysis(
  rawInput: InitiativeScheduledAnalysisInputV1
): PreparedInitiativeScheduledAnalysisV1 {
  validateTopLevel(rawInput);
  const profile = resolveExecutableDomainProfile(rawInput.profileId, rawInput.domainId);
  validateHorizon(rawInput.horizon);
  const contractResult = validateAndNormalizeStructuralObservationContractV2({
    contract: rawInput.contract,
    horizon: rawInput.horizon,
    profile,
  });
  if (!contractResult.valid) {
    throw new InitiativeScheduledAnalysisValidationError("contract", contractResult.issues);
  }
  const scheduleResult = validateAndNormalizeScenarioInitiativeSchedulesV1({
    contract: contractResult.value,
    schedules: rawInput.schedules,
    horizon: rawInput.horizon,
  });
  if (!scheduleResult.valid) {
    throw new InitiativeScheduledAnalysisValidationError("schedule", scheduleResult.issues);
  }
  const resolvedSchedules = resolveInitiativeSchedules({
    contract: contractResult.value,
    schedules: scheduleResult.value,
    profile,
  });
  const initialState = deepFreeze(structuredClone(rawInput.initialState));

  return Object.freeze({
    preparationVersion: "initiative-scheduled-analysis-preparation-v1",
    profile,
    executionIdentity: getExecutableIdentity(profile),
    horizon: rawInput.horizon,
    initialState,
    contract: contractResult.value,
    schedules: scheduleResult.value,
    resolvedSchedules,
  }) as PreparedInitiativeScheduledAnalysisV1;
}

/** @internal Executes only an already prepared, nominally branded context. */
export function runPreparedInitiativeScheduledAnalysis(
  prepared: PreparedInitiativeScheduledAnalysisV1
): InitiativeScheduledAnalysisResultV1 {
  const scenarioA = runInitiativeScenario({
    scenario: "A",
    resolvedSchedules: prepared.resolvedSchedules,
    profile: prepared.profile,
    initialState: prepared.initialState,
    horizon: prepared.horizon,
  });
  const scenarioB = runInitiativeScenario({
    scenario: "B",
    resolvedSchedules: prepared.resolvedSchedules,
    profile: prepared.profile,
    initialState: prepared.initialState,
    horizon: prepared.horizon,
  });
  const baseline = runPreconfiguredScenario(
    prepared.initialState,
    prepared.horizon,
    prepared.profile
  );
  const scenarioAProjection = createScenarioAnalysisResult([...scenarioA.trajectory]);
  const scenarioBProjection = createScenarioAnalysisResult([...scenarioB.trajectory]);
  const comparison = compareScenarioTrajectories(
    scenarioAProjection,
    scenarioBProjection
  );

  return deepFreeze({
    version: "initiative-scheduled-analysis-v1",
    executionMode: "initiative-schedule-v1",
    executionIdentity: prepared.executionIdentity,
    horizon: prepared.horizon,
    baseline,
    scenarioA,
    scenarioB,
    comparison,
  });
}

export function runInitiativeScheduledAnalysis(
  input: InitiativeScheduledAnalysisInputV1
): InitiativeScheduledAnalysisResultV1 {
  return runPreparedInitiativeScheduledAnalysis(
    prepareInitiativeScheduledAnalysis(input)
  );
}
