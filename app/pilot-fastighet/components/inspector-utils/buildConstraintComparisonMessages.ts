import {
  compareConstraintActivationTimelines,
  type ConstraintActivationTimelineEntry,
} from "./buildConstraintActivationTimeline";

export type ConstraintComparisonMessage = {
  constraintType: ConstraintActivationTimelineEntry["constraintType"];
  messageKey: "earlier" | "avoided";
  differenceMonths: number | null;
  scenarioDirection: "baseline" | "target";
};

export function buildConstraintComparisonMessages(
  timelineA: ConstraintActivationTimelineEntry[],
  timelineB: ConstraintActivationTimelineEntry[]
): ConstraintComparisonMessage[] {
  return compareConstraintActivationTimelines(timelineA, timelineB).flatMap(
    (entry): ConstraintComparisonMessage[] => {
      if (entry.stepA == null && entry.stepB == null) {
        return [];
      }

      if (entry.stepA == null && entry.stepB != null) {
        return [
          {
            constraintType: entry.constraintType,
            messageKey: "avoided" as const,
            differenceMonths: null,
            scenarioDirection: "baseline" as const,
          },
        ];
      }

      if (entry.stepA != null && entry.stepB == null) {
        return [
          {
            constraintType: entry.constraintType,
            messageKey: "avoided" as const,
            differenceMonths: null,
            scenarioDirection: "target" as const,
          },
        ];
      }

      if (entry.difference == null || entry.difference === 0) {
        return [];
      }

      return [
        {
          constraintType: entry.constraintType,
          messageKey: "earlier" as const,
          differenceMonths: Math.abs(entry.difference),
          scenarioDirection: entry.difference < 0 ? ("target" as const) : ("baseline" as const),
        },
      ];
    }
  );
}
