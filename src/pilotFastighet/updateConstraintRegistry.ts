import type { ConstraintRegistry, ConstraintState } from "./constraintState";

export type ConstraintUpdateInput = {
  type: ConstraintState["type"];
  triggered: boolean;
  targetSeverity: number;
  step: number;
  thresholdOvershoot?: number;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function computeDynamicAdjustmentRate(targetSeverity: number): number {
  const baseRate = 0.25;
  const amplification = 0.5;
  const rate = baseRate + targetSeverity * amplification;
  return Math.min(rate, 0.85);
}

export function updateConstraintRegistry(
  registry: ConstraintRegistry,
  input: ConstraintUpdateInput
): ConstraintRegistry {
  const current = registry[input.type];

  if (!current) return registry;

  let next: ConstraintState = { ...current };

  const { triggered, targetSeverity, step, thresholdOvershoot } = input;

  if (triggered) {
    const dynamicRate = computeDynamicAdjustmentRate(targetSeverity);

    const newSeverity =
      next.severityIndex +
      (targetSeverity - next.severityIndex) * dynamicRate;

    next = {
      ...next,
      lifecycle: "ACTIVE",
      severityIndex: clamp(newSeverity),
      activatedAtStep: next.activatedAtStep ?? step,
      lastUpdatedStep: step,
    };

    return {
      ...registry,
      [input.type]: next,
    };
  }

  if (!triggered && next.lifecycle === "ACTIVE") {
    next = {
      ...next,
      lifecycle: "RECOVERING",
      lastUpdatedStep: step,
    };
  }

  if (next.lifecycle === "RECOVERING") {
    const overshoot = thresholdOvershoot ?? 0;

    const decayFactor = clamp(overshoot, 0, 1);

    const newSeverity =
      next.severityIndex -
      next.severityIndex * decayFactor;

    next = {
      ...next,
      severityIndex: clamp(newSeverity),
      lifecycle: newSeverity <= 0.01 ? "INACTIVE" : "RECOVERING",
      lastUpdatedStep: step,
    };

    if (next.lifecycle === "INACTIVE") {
      next = {
        ...next,
        severityIndex: 0,
        activatedAtStep: undefined,
      };
    }

    return {
      ...registry,
      [input.type]: next,
    };
  }

  return registry;
}
