import type { ConstraintComparisonMessage } from "./buildConstraintComparisonMessages";
import type { GoalType } from "./goalTypes";
import type { StructuralGoalMessage } from "./buildStructuralGoalMessages";

export type StructuralGoalSummaryMessage = {
  winningScenario: "baseline" | "target";
  improvedConstraintCount: number;
  avoidedConstraintCount: number;
  robustnessScore: number;
};

export function buildStructuralGoalSummaryMessage(
  goalType: GoalType,
  constraintComparisonMessages: ConstraintComparisonMessage[],
  structuralGoalMessages: StructuralGoalMessage[],
  marginHistoryA?: number[],
  marginHistoryB?: number[]
): StructuralGoalSummaryMessage | null {
  if (!constraintComparisonMessages.length && !structuralGoalMessages.length) {
    return null;
  }

  let baselineDelayedCount = 0;
  let targetDelayedCount = 0;
  let baselineAvoidedCount = 0;
  let targetAvoidedCount = 0;
  let baselineScore = 0;
  let targetScore = 0;

  structuralGoalMessages.forEach((message) => {
    if (message.winningScenario === "baseline") {
      baselineDelayedCount += 1;
      baselineScore += 1;
    }

    if (message.winningScenario === "target") {
      targetDelayedCount += 1;
      targetScore += 1;
    }
  });

  constraintComparisonMessages.forEach((message) => {
    if (message.messageKey !== "avoided") return;

    if (message.scenarioDirection === "baseline") {
      baselineAvoidedCount += 1;
      baselineScore += 2;
    }

    if (message.scenarioDirection === "target") {
      targetAvoidedCount += 1;
      targetScore += 2;
    }
  });

  switch (goalType) {
    case "delay":
      baselineAvoidedCount = 0;
      targetAvoidedCount = 0;
      baselineScore = baselineDelayedCount;
      targetScore = targetDelayedCount;
      break;
    case "avoidance":
      baselineDelayedCount = 0;
      targetDelayedCount = 0;
      baselineScore = baselineAvoidedCount * 2;
      targetScore = targetAvoidedCount * 2;
      break;
    case "margin-preservation": {
      if (!marginHistoryA?.length || !marginHistoryB?.length) {
        return null;
      }

      const minA = Math.min(...marginHistoryA);
      const minB = Math.min(...marginHistoryB);

      const breachIndexA = marginHistoryA.findIndex((value) => value < 0);
      const breachIndexB = marginHistoryB.findIndex((value) => value < 0);

      const breachA = breachIndexA >= 0 ? breachIndexA : null;
      const breachB = breachIndexB >= 0 ? breachIndexB : null;

      if (breachA != null && breachB != null) {
        if (breachB > breachA) {
          return {
            winningScenario: "target",
            improvedConstraintCount: 0,
            avoidedConstraintCount: 0,
            robustnessScore: breachB - breachA,
          };
        }
        if (breachA > breachB) {
          return {
            winningScenario: "baseline",
            improvedConstraintCount: 0,
            avoidedConstraintCount: 0,
            robustnessScore: breachA - breachB,
          };
        }
      } else if (breachA == null && breachB != null) {
        return {
          winningScenario: "baseline",
          improvedConstraintCount: 0,
          avoidedConstraintCount: 0,
          robustnessScore: 1,
        };
      } else if (breachB == null && breachA != null) {
        return {
          winningScenario: "target",
          improvedConstraintCount: 0,
          avoidedConstraintCount: 0,
          robustnessScore: 1,
        };
      }

      if (minB > minA) {
        return {
          winningScenario: "target",
          improvedConstraintCount: 0,
          avoidedConstraintCount: 0,
          robustnessScore: minB - minA,
        };
      }
      if (minA > minB) {
        return {
          winningScenario: "baseline",
          improvedConstraintCount: 0,
          avoidedConstraintCount: 0,
          robustnessScore: minA - minB,
        };
      }

      return null;
    }
    case "robustness":
    default:
      baselineScore = baselineDelayedCount + baselineAvoidedCount * 2;
      targetScore = targetDelayedCount + targetAvoidedCount * 2;
      break;
  }

  if (
    baselineDelayedCount === 0 &&
    targetDelayedCount === 0 &&
    baselineAvoidedCount === 0 &&
    targetAvoidedCount === 0
  ) {
    return null;
  }

  if (baselineScore === targetScore) return null;

  return targetScore > baselineScore
    ? {
        winningScenario: "target",
        improvedConstraintCount: targetDelayedCount,
        avoidedConstraintCount: targetAvoidedCount,
        robustnessScore: targetScore,
      }
    : {
        winningScenario: "baseline",
        improvedConstraintCount: baselineDelayedCount,
        avoidedConstraintCount: baselineAvoidedCount,
        robustnessScore: baselineScore,
      };
}
