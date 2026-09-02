import type { ActionKey } from "../actionEffects";
import { buildDriverScoreState } from "../driverScoreState";
import type { RiskState } from "../RealEstateEngine";
import type { DomainKey } from "@/src/i18n/pulseLanguage";
import { getExecutableProfileIdForDomain } from "../executableDomainProfile";
import {
  createCleanRunSourceSnapshot,
  getScenarioScheduleValidationIssues,
  isActionSupportedForScheduledExecution,
  type ReactExecutionMode,
  type ScenarioSchedules,
  type ScenarioExecutionProvenance,
  type ScheduleScenarioId,
  type ScheduleValidationIssue,
} from "./reactScheduledAnalysisBoundary";

export type ScheduledFairComparisonFacts = Readonly<{
  identicalInitialStates: boolean;
  identicalActionSets: boolean;
  timingOrOrderOnlyDifference: boolean;
}>;

export function getRevealedExecutionProvenance(
  provenance: ScenarioExecutionProvenance,
  revealedStep: number
): ScenarioExecutionProvenance {
  const visible = (entries: ScenarioExecutionProvenance["A"]) =>
    entries
      .filter((entry) => entry.actualExecutionStep <= revealedStep)
      .map((entry) => structuredClone(entry))
      .sort(
        (left, right) =>
          left.actualExecutionStep - right.actualExecutionStep ||
          left.actionId.localeCompare(right.actionId)
      );
  return { A: visible(provenance.A), B: visible(provenance.B) };
}

export function getScheduledFairComparisonFacts(input: Readonly<{
  initialStateA: RiskState;
  initialStateB: RiskState;
  schedules: ScenarioSchedules;
}>): ScheduledFairComparisonFacts {
  const actionSet = (scenario: "A" | "B") =>
    [...new Set(input.schedules[scenario].map((entry) => entry.actionId))].sort();
  const identicalInitialStates =
    JSON.stringify(input.initialStateA) === JSON.stringify(input.initialStateB);
  const identicalActionSets =
    JSON.stringify(actionSet("A")) === JSON.stringify(actionSet("B"));
  const scheduleSignature = (scenario: "A" | "B") =>
    getOrderedScenarioSchedule(input.schedules, scenario).map(
      (entry) => `${entry.actionId}:${entry.executionStep}`
    );
  return {
    identicalInitialStates,
    identicalActionSets,
    timingOrOrderOnlyDifference:
      identicalInitialStates &&
      identicalActionSets &&
      JSON.stringify(scheduleSignature("A")) !== JSON.stringify(scheduleSignature("B")),
  };
}

export const DEFAULT_MANUAL_EXECUTION_MODE: ReactExecutionMode =
  "configured-start";

export function resolveManualExecutionMode(
  mode: ReactExecutionMode,
  executiveDemoMode: boolean
): ReactExecutionMode {
  return executiveDemoMode ? "configured-start" : mode;
}

export function toggleManualScheduledAction(
  schedules: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  actionId: ActionKey
): ScenarioSchedules {
  if (!isActionSupportedForScheduledExecution(actionId)) {
    throw new Error(`Action ${actionId} is not supported for scheduled execution.`);
  }
  const exists = schedules[scenario].some((entry) => entry.actionId === actionId);
  return {
    A: schedules.A.map((entry) => ({ ...entry })),
    B: schedules.B.map((entry) => ({ ...entry })),
    [scenario]: exists
      ? schedules[scenario]
          .filter((entry) => entry.actionId !== actionId)
          .map((entry) => ({ ...entry }))
      : [...schedules[scenario].map((entry) => ({ ...entry })), { actionId, executionStep: 1 }],
  };
}

export function updateManualScheduledActionStep(
  schedules: ScenarioSchedules,
  scenario: ScheduleScenarioId,
  actionId: ActionKey,
  executionStep: number,
  horizon: number
): ScenarioSchedules {
  if (!Number.isInteger(executionStep) || executionStep < 1 || executionStep > horizon) {
    throw new RangeError("Execution period is outside the configured horizon.");
  }
  if (!schedules[scenario].some((entry) => entry.actionId === actionId)) {
    throw new Error(`Scenario ${scenario} does not contain action ${actionId}.`);
  }
  return {
    A: schedules.A.map((entry) => ({ ...entry })),
    B: schedules.B.map((entry) => ({ ...entry })),
    [scenario]: schedules[scenario].map((entry) =>
      entry.actionId === actionId ? { actionId, executionStep } : { ...entry }
    ),
  };
}

export function getOrderedScenarioSchedule(
  schedules: ScenarioSchedules,
  scenario: ScheduleScenarioId
) {
  return [...schedules[scenario]].sort(
    (left, right) =>
      left.executionStep - right.executionStep ||
      left.actionId.localeCompare(right.actionId)
  );
}

export function getManualScheduleIssues(
  schedules: ScenarioSchedules,
  horizon: number
): readonly ScheduleValidationIssue[] {
  return getScenarioScheduleValidationIssues(schedules, horizon);
}

export function formatManualScheduleIssue(
  issue: ScheduleValidationIssue,
  actionLabel: string,
  language: "sv" | "en"
): string {
  const period = `M${String(issue.executionStep)}`;
  return language === "sv"
    ? `Scenario ${issue.scenario}: ${actionLabel} är vald för ${period}, utanför analysens tidshorisont M${issue.horizon}.`
    : `Scenario ${issue.scenario}: ${actionLabel} is set to ${period}, outside the analysis horizon M${issue.horizon}.`;
}

export function prepareManualScheduledRunSource(input: Readonly<{
  domainId: DomainKey;
  baseRiskStateA: RiskState;
  baseRiskStateB: RiskState;
  baselineRiskState: RiskState;
}>) {
  return createCleanRunSourceSnapshot({
    domainId: input.domainId,
    profileId: getExecutableProfileIdForDomain(input.domainId),
    scenarioA: {
      baseRiskState: input.baseRiskStateA,
      baseDriverScores: buildDriverScoreState(input.baseRiskStateA),
    },
    scenarioB: {
      baseRiskState: input.baseRiskStateB,
      baseDriverScores: buildDriverScoreState(input.baseRiskStateB),
    },
    baseline: { baseRiskState: input.baselineRiskState },
  });
}
