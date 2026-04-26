import type { GoalType } from "./goalTypes";
import type { StructuralGoalSummaryMessage } from "./buildStructuralGoalSummaryMessage";

export function buildGoalConditionedSystemStatusMessage(
  goalType: GoalType,
  summary: StructuralGoalSummaryMessage | null,
  _uiLanguage: "sv" | "en",
  caseType?: "transport" | "real-estate" | null
): {
  scenarioDirection: "baseline" | "target";
  messageKey: string;
  narrativeFocus: "transport" | "real-estate" | "generic";
} | null {
  if (!summary) return null;

  const narrativeFocus =
    caseType === "real-estate"
      ? "real-estate"
      : caseType === "transport"
      ? "transport"
      : "generic";

  switch (goalType) {
    case "delay":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "activationTiming",
        narrativeFocus,
      };

    case "avoidance":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "constraintAvoidance",
        narrativeFocus,
      };

    case "margin-preservation":
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "marginPreservation",
        narrativeFocus,
      };

    case "robustness":
    default:
      return {
        scenarioDirection: summary.winningScenario,
        messageKey: "flexibilityWindow",
        narrativeFocus,
      };
  }
}
