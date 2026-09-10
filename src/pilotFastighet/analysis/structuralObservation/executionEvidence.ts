import type { ActionKey } from "../../actionEffects";
import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod } from "./contract";

/** Minimal execution evidence consumed by the structural observation layer. */
export type StructuralExecutionEvidence = Readonly<{
  scenario: ScheduleScenarioId;
  actionKey: ActionKey;
  scheduledExecutionPeriod: DisplayedPeriod;
  actualExecutionPeriod: DisplayedPeriod;
}>;
