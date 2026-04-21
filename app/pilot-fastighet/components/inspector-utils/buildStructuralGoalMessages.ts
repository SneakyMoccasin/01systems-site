import type { ConstraintActivationTimelineEntry } from "./buildConstraintActivationTimeline";

export type StructuralGoalMessage = {
  winningScenario: "baseline" | "target";
  constraintType: ConstraintActivationTimelineEntry["constraintType"];
  delayMonths: number;
};

export function buildStructuralGoalMessages(
  timelineA: ConstraintActivationTimelineEntry[],
  timelineB: ConstraintActivationTimelineEntry[]
): StructuralGoalMessage[] {
  const mapA = new Map(
    timelineA.map((entry) => [entry.constraintType, entry.activationStep])
  );

  const mapB = new Map(
    timelineB.map((entry) => [entry.constraintType, entry.activationStep])
  );

  const constraintTypes = new Set([...mapA.keys(), ...mapB.keys()]);

  const results: StructuralGoalMessage[] = [];

  constraintTypes.forEach((type) => {
    const stepA = mapA.get(type);
    const stepB = mapB.get(type);

    if (stepA == null || stepB == null) return;
    if (stepA === stepB) return;

    if (stepB > stepA) {
      results.push({
        winningScenario: "target",
        constraintType: type,
        delayMonths: stepB - stepA,
      });
    }

    if (stepA > stepB) {
      results.push({
        winningScenario: "baseline",
        constraintType: type,
        delayMonths: stepA - stepB,
      });
    }
  });

  return results;
}
