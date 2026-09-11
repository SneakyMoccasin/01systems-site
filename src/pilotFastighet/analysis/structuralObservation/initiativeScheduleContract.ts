import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod, InitiativeId } from "./contract";

export type { ScheduleScenarioId };

export type InitiativeScheduleVersion = "initiative-schedule-v1";
export type InitiativeComparisonPolicy = "same-initiative-set";

export type ScheduledInitiativeV1 = Readonly<{
  initiativeId: InitiativeId;
  executionStep: DisplayedPeriod;
}>;

export type ScenarioInitiativeSchedulesV1 = Readonly<{
  version: InitiativeScheduleVersion;
  comparisonPolicy: InitiativeComparisonPolicy;
  A: readonly ScheduledInitiativeV1[];
  B: readonly ScheduledInitiativeV1[];
}>;

declare const validatedScenarioInitiativeSchedulesV1: unique symbol;

export type ValidatedScenarioInitiativeSchedulesV1 =
  ScenarioInitiativeSchedulesV1 & {
    readonly [validatedScenarioInitiativeSchedulesV1]: true;
  };

export const INITIATIVE_SCHEDULE_SCENARIOS = Object.freeze([
  "A",
  "B",
] as const satisfies readonly ScheduleScenarioId[]);
