import {
  ACTION_EFFECTS,
  getUnsupportedActionDrivers,
  type ActionKey,
} from "../actionEffects";
import type { RiskState } from "../RealEstateEngine";
import type { DriverScoreState } from "../driverScoreState";
import { REAL_ESTATE_IMPACT_CONTRACT } from "../impactContract";
import {
  runCascadeAnalysis,
  type AnalyticalResults,
  type PreconfiguredScenarioInput,
  type ScheduledAction,
  type ScheduledActionExecution,
  type ScheduledAnalyticalResults,
  type ScheduledCascadeAnalysisInput,
} from "./runCascadeAnalysis";

export type ScheduleScenarioId = "A" | "B";
export type ReactExecutionMode = "configured-start" | "actions-over-time";

export type ScenarioSchedules = Readonly<{
  A: readonly ScheduledAction[];
  B: readonly ScheduledAction[];
}>;

export type ConfiguredScenarioRunSource = Readonly<{
  baseRiskState: RiskState;
  baseDriverScores?: DriverScoreState;
}>;

export type CleanRunSourceSnapshot = Readonly<{
  scenarioA: Readonly<PreconfiguredScenarioInput>;
  scenarioB: Readonly<PreconfiguredScenarioInput>;
  baseline: Readonly<PreconfiguredScenarioInput>;
}>;

export type ScenarioExecutionProvenance = Readonly<{
  A: readonly ScheduledActionExecution[];
  B: readonly ScheduledActionExecution[];
}>;

export type ReactAnalysisBoundaryResult = Readonly<{
  analysis: AnalyticalResults | ScheduledAnalyticalResults;
  provenance: ScenarioExecutionProvenance;
}>;

export type ScheduleValidationIssue = Readonly<{
  scenario: ScheduleScenarioId;
  actionId: string;
  executionStep: unknown;
  horizon: number;
  reason:
    | "malformed-action"
    | "unknown-action"
    | "unsupported-action"
    | "duplicate-action"
    | "non-integer-step"
    | "step-outside-horizon";
}>;

export class ScenarioScheduleValidationError extends Error {
  readonly issues: readonly ScheduleValidationIssue[];

  constructor(issues: readonly ScheduleValidationIssue[]) {
    super(
      issues
        .map(
          (issue) =>
            `Scenario ${issue.scenario} action ${issue.actionId} at step ${String(
              issue.executionStep
            )} is invalid for horizon ${issue.horizon}: ${issue.reason}.`
        )
        .join(" ")
    );
    this.name = "ScenarioScheduleValidationError";
    this.issues = issues.map((issue) => ({ ...issue }));
  }
}

const MODELED_DRIVER_KEYS = REAL_ESTATE_IMPACT_CONTRACT.map(
  (parameter) => parameter.key
);

function isKnownActionId(value: unknown): value is ActionKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ACTION_EFFECTS, value)
  );
}

export function isActionSupportedForScheduledExecution(
  value: unknown
): value is ActionKey {
  return (
    isKnownActionId(value) &&
    getUnsupportedActionDrivers(value, MODELED_DRIVER_KEYS).length === 0
  );
}

export function getScheduledActionSupport(): Readonly<{
  supported: readonly ActionKey[];
  rejected: readonly ActionKey[];
}> {
  const supported: ActionKey[] = [];
  const rejected: ActionKey[] = [];

  for (const actionId of Object.keys(ACTION_EFFECTS).sort() as ActionKey[]) {
    (isActionSupportedForScheduledExecution(actionId) ? supported : rejected).push(
      actionId
    );
  }

  return { supported, rejected };
}

export function createEmptyScenarioSchedules(): ScenarioSchedules {
  return { A: [], B: [] };
}

function getRuntimeSchedule(value: unknown, scenario: ScheduleScenarioId): unknown[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new ScenarioScheduleValidationError([
      {
        scenario,
        actionId: "<schedule>",
        executionStep: undefined,
        horizon: 0,
        reason: "malformed-action",
      },
    ]);
  }

  const schedule = (value as Record<string, unknown>)[scenario];
  if (!Array.isArray(schedule)) {
    throw new ScenarioScheduleValidationError([
      {
        scenario,
        actionId: "<schedule>",
        executionStep: undefined,
        horizon: 0,
        reason: "malformed-action",
      },
    ]);
  }
  return schedule;
}

function validateScenario(
  value: unknown,
  scenario: ScheduleScenarioId,
  horizon: number
): ScheduleValidationIssue[] {
  let schedule: unknown[];
  try {
    schedule = getRuntimeSchedule(value, scenario);
  } catch (error) {
    if (error instanceof ScenarioScheduleValidationError) {
      return error.issues.map((issue) => ({ ...issue, horizon }));
    }
    throw error;
  }

  const issues: ScheduleValidationIssue[] = [];
  const seen = new Set<string>();

  schedule.forEach((candidate, index) => {
    if (candidate == null || typeof candidate !== "object" || Array.isArray(candidate)) {
      issues.push({
        scenario,
        actionId: `<unknown:${index}>`,
        executionStep: undefined,
        horizon,
        reason: "malformed-action",
      });
      return;
    }

    const entry = candidate as Record<string, unknown>;
    const actionId = typeof entry.actionId === "string" ? entry.actionId : `<unknown:${index}>`;
    const executionStep = entry.executionStep;

    if (!isKnownActionId(entry.actionId)) {
      issues.push({
        scenario,
        actionId,
        executionStep,
        horizon,
        reason: "unknown-action",
      });
    } else if (!isActionSupportedForScheduledExecution(entry.actionId)) {
      issues.push({
        scenario,
        actionId,
        executionStep,
        horizon,
        reason: "unsupported-action",
      });
    }

    if (seen.has(actionId)) {
      issues.push({
        scenario,
        actionId,
        executionStep,
        horizon,
        reason: "duplicate-action",
      });
    }
    seen.add(actionId);

    if (!Number.isInteger(executionStep)) {
      issues.push({
        scenario,
        actionId,
        executionStep,
        horizon,
        reason: "non-integer-step",
      });
    } else if ((executionStep as number) < 1 || (executionStep as number) > horizon) {
      issues.push({
        scenario,
        actionId,
        executionStep,
        horizon,
        reason: "step-outside-horizon",
      });
    }
  });

  return issues;
}

export function getScenarioScheduleValidationIssues(
  value: unknown,
  horizon: number
): readonly ScheduleValidationIssue[] {
  const horizonForMessage = Number.isInteger(horizon) && horizon >= 1 ? horizon : horizon;
  return [
    ...validateScenario(value, "A", horizonForMessage),
    ...validateScenario(value, "B", horizonForMessage),
  ];
}

export function assertValidScenarioSchedules(
  value: unknown,
  horizon: number
): asserts value is ScenarioSchedules {
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new RangeError("Schedule horizon must be a positive integer.");
  }
  const issues = getScenarioScheduleValidationIssues(value, horizon);
  if (issues.length > 0) throw new ScenarioScheduleValidationError(issues);
}

function cloneSchedules(value: ScenarioSchedules): { A: ScheduledAction[]; B: ScheduledAction[] } {
  return {
    A: value.A.map((entry) => ({ ...entry })),
    B: value.B.map((entry) => ({ ...entry })),
  };
}

export function addScheduledAction(
  value: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  entry: ScheduledAction,
  horizon: number
): ScenarioSchedules {
  assertValidScenarioSchedules(value, horizon);
  const next = cloneSchedules(value);
  if (next[scenario].some((candidate) => candidate.actionId === entry.actionId)) {
    throw new ScenarioScheduleValidationError([
      {
        scenario,
        actionId: entry.actionId,
        executionStep: entry.executionStep,
        horizon,
        reason: "duplicate-action",
      },
    ]);
  }
  next[scenario].push({ ...entry });
  assertValidScenarioSchedules(next, horizon);
  return next;
}

export function editScheduledActionStep(
  value: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  actionId: ActionKey,
  executionStep: number,
  horizon: number
): ScenarioSchedules {
  assertValidScenarioSchedules(value, horizon);
  const next = cloneSchedules(value);
  const index = next[scenario].findIndex((entry) => entry.actionId === actionId);
  if (index === -1) {
    throw new Error(`Scenario ${scenario} does not contain action ${actionId}.`);
  }
  next[scenario][index] = { actionId, executionStep };
  assertValidScenarioSchedules(next, horizon);
  return next;
}

export function removeScheduledAction(
  value: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  actionId: ActionKey
): ScenarioSchedules {
  const next = cloneSchedules(value);
  next[scenario] = next[scenario].filter((entry) => entry.actionId !== actionId);
  return next;
}

export function clearScenarioSchedule(
  value: ScenarioSchedules,
  scenario: ScheduleScenarioId
): ScenarioSchedules {
  const next = cloneSchedules(value);
  next[scenario] = [];
  return next;
}

export function clearAllScenarioSchedules(): ScenarioSchedules {
  return createEmptyScenarioSchedules();
}

export function replaceScenarioSchedule(
  value: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  replacement: readonly ScheduledAction[],
  horizon: number
): ScenarioSchedules {
  const next = cloneSchedules(value);
  next[scenario] = replacement.map((entry) => ({ ...entry }));
  assertValidScenarioSchedules(next, horizon);
  return next;
}

function cloneScenarioSource(
  source: ConfiguredScenarioRunSource
): Readonly<PreconfiguredScenarioInput> {
  const snapshot: PreconfiguredScenarioInput = {
    initialRiskState: structuredClone(source.baseRiskState),
    ...(source.baseDriverScores
      ? { initialDriverScores: structuredClone(source.baseDriverScores) }
      : {}),
  };
  Object.freeze(snapshot.initialRiskState);
  if (snapshot.initialDriverScores) Object.freeze(snapshot.initialDriverScores);
  return Object.freeze(snapshot);
}

export function createCleanRunSourceSnapshot(input: Readonly<{
  scenarioA: ConfiguredScenarioRunSource;
  scenarioB: ConfiguredScenarioRunSource;
  baseline: ConfiguredScenarioRunSource;
}>): CleanRunSourceSnapshot {
  return Object.freeze({
    scenarioA: cloneScenarioSource(input.scenarioA),
    scenarioB: cloneScenarioSource(input.scenarioB),
    baseline: cloneScenarioSource(input.baseline),
  });
}

export function prepareScheduledFacadeInput(input: Readonly<{
  horizon: number;
  runSource: CleanRunSourceSnapshot;
  schedules: ScenarioSchedules;
}>): ScheduledCascadeAnalysisInput {
  assertValidScenarioSchedules(input.schedules, input.horizon);
  return {
    executionMode: "scheduled",
    horizon: input.horizon,
    scenarioA: structuredClone(input.runSource.scenarioA),
    scenarioB: structuredClone(input.runSource.scenarioB),
    baseline: structuredClone(input.runSource.baseline),
    scenarioAActions: input.schedules.A.map(({ actionId, executionStep }) => ({
      actionId,
      executionStep,
    })),
    scenarioBActions: input.schedules.B.map(({ actionId, executionStep }) => ({
      actionId,
      executionStep,
    })),
  };
}

function emptyProvenance(): ScenarioExecutionProvenance {
  return { A: [], B: [] };
}

function splitProvenance(
  provenance: readonly ScheduledActionExecution[]
): ScenarioExecutionProvenance {
  return {
    A: provenance
      .filter((entry) => entry.scenario === "scenarioA")
      .map((entry) => structuredClone(entry)),
    B: provenance
      .filter((entry) => entry.scenario === "scenarioB")
      .map((entry) => structuredClone(entry)),
  };
}

export function runReactAnalysisBoundary(
  input:
    | Readonly<{
        executionMode: "configured-start";
        horizon: number;
        runSource: CleanRunSourceSnapshot;
      }>
    | Readonly<{
        executionMode: "actions-over-time";
        horizon: number;
        runSource: CleanRunSourceSnapshot;
        schedules: ScenarioSchedules;
      }>
): ReactAnalysisBoundaryResult {
  if (input.executionMode === "configured-start") {
    return {
      analysis: runCascadeAnalysis({
        executionMode: "preconfigured",
        horizon: input.horizon,
        scenarioA: structuredClone(input.runSource.scenarioA),
        scenarioB: structuredClone(input.runSource.scenarioB),
        baseline: structuredClone(input.runSource.baseline),
      }),
      provenance: emptyProvenance(),
    };
  }

  const analysis = runCascadeAnalysis(prepareScheduledFacadeInput(input));
  return {
    analysis,
    provenance: splitProvenance(analysis.executionProvenance),
  };
}
