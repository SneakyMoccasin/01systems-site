import type { GoalType } from "./goalTypes";
import type { StructuralGoalSummaryMessage } from "./buildStructuralGoalSummaryMessage";

export function buildGoalConditionedSystemStatusMessage(
  goalType: GoalType,
  summary: StructuralGoalSummaryMessage | null
): { scenarioDirection: "baseline" | "target"; messageKey: string } | null {
  if (!summary) return null;

  switch (goalType) {
    case "delay":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "activationTiming"
      };

    case "avoidance":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "constraintAvoidance"
      };

    case "margin-preservation":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "marginPreservation"
      };

    case "robustness":
    default:
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "flexibilityWindow"
      };
  }
}
