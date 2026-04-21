import {
  compareConstraintActivationOrdering,
  type ConstraintActivationTimelineEntry,
} from "./buildConstraintActivationTimeline";

export type ConstraintOrderingMessage = {
  earlierConstraint: ConstraintActivationTimelineEntry["constraintType"];
  laterConstraint: ConstraintActivationTimelineEntry["constraintType"];
  scenarioDirection: "baseline" | "target";
};

export function buildConstraintOrderingMessages(
  timelineA: ConstraintActivationTimelineEntry[],
  timelineB: ConstraintActivationTimelineEntry[]
): ConstraintOrderingMessage[] {
  return compareConstraintActivationOrdering(timelineA, timelineB).map(
    (entry) => ({
      earlierConstraint:
        entry.orderingB === "earlier"
          ? entry.earlierConstraint
          : entry.laterConstraint,
      laterConstraint:
        entry.orderingB === "earlier"
          ? entry.laterConstraint
          : entry.earlierConstraint,
      scenarioDirection:
        entry.orderingB === "earlier" ? "target" : "baseline",
    })
  );
}
