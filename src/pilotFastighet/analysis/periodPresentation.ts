export type DisplayedPeriod = number;
export type GraphIndex = number;

function requireIntegerAtLeast(
  value: number,
  minimum: number,
  name: string
): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return value;
}

export function engineStateStepToDisplayedPeriod(
  engineStateStep: number
): DisplayedPeriod {
  return requireIntegerAtLeast(engineStateStep, 1, "Engine state step");
}

export function trajectoryIndexToDisplayedPeriod(
  trajectoryIndex: number
): DisplayedPeriod {
  return requireIntegerAtLeast(trajectoryIndex, 0, "Trajectory index") + 1;
}

export function displayedPeriodToGraphIndex(
  displayedPeriod: number
): GraphIndex {
  return requireIntegerAtLeast(displayedPeriod, 1, "Displayed period") - 1;
}

export function executionStepToDisplayedPeriod(
  executionStep: number
): DisplayedPeriod {
  return requireIntegerAtLeast(executionStep, 1, "Execution step");
}

export function constraintSourceStepToDisplayedPeriod(
  constraintSourceStep: number
): DisplayedPeriod {
  return requireIntegerAtLeast(
    constraintSourceStep,
    0,
    "Legacy constraint source step"
  ) + 1;
}

export function divergenceIndexToDisplayedPeriod(
  divergenceIndex: number
): DisplayedPeriod | null {
  if (divergenceIndex === -1) return null;
  return trajectoryIndexToDisplayedPeriod(divergenceIndex);
}

export function formatDisplayedPeriod(displayedPeriod: number): string {
  return `M${requireIntegerAtLeast(displayedPeriod, 1, "Displayed period")}`;
}
