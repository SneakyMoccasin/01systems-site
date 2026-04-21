import type { ConstraintComparisonMessage } from "./buildConstraintComparisonMessages";
import type { StructuralGoalMessage } from "./buildStructuralGoalMessages";
import type { GoalType } from "./goalTypes";

export type DominantConstraintMessage = {
  constraintKey: string;
  scenarioDirection: "baseline" | "target";
};

export function buildDominantConstraintMessage(
  goalType: GoalType,
  constraintComparisonMessages: ConstraintComparisonMessage[],
  structuralGoalMessages: StructuralGoalMessage[]
): DominantConstraintMessage | null {
  if (goalType === "margin-preservation") {
    return null;
  }

  if (goalType === "avoidance") {
    const avoided = constraintComparisonMessages.find(
      (msg) => msg.messageKey === "avoided"
    );

    if (!avoided) return null;

    return {
      constraintKey: avoided.constraintType,
      scenarioDirection: avoided.scenarioDirection
    };
  }

  if (goalType === "delay" || goalType === "robustness") {
    const delayed = structuralGoalMessages[0];

    if (!delayed) return null;

    return {
      constraintKey: delayed.constraintType,
      scenarioDirection: delayed.winningScenario
    };
  }

  return null;
}
