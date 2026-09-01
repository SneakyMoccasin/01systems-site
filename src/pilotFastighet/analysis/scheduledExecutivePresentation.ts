import type { EngineState } from "../RealEstateEngine";

export type ScheduledExecutiveMetrics = Readonly<{
  firstDivergencePeriod: number | null;
  maximumMarginSeparation: number;
  cumulativeAbsoluteSeparation: number;
  firstLowerClampPeriodA: number | null;
  firstLowerClampPeriodB: number | null;
  visibleConstraintPeriodA: number | null;
  visibleConstraintPeriodB: number | null;
  terminalMarginA: number;
  terminalMarginB: number;
}>;

export function calculateScheduledExecutiveMetrics(input: Readonly<{
  marginHistoryA: readonly number[];
  marginHistoryB: readonly number[];
  terminalStateA: EngineState;
  terminalStateB: EngineState;
}>): ScheduledExecutiveMetrics {
  const length = Math.min(input.marginHistoryA.length, input.marginHistoryB.length);
  const separations = Array.from({ length }, (_, index) =>
    Math.abs(input.marginHistoryB[index] - input.marginHistoryA[index])
  );
  const firstDivergenceIndex = separations.findIndex((value) => value > 0);
  const firstLowerClamp = (history: readonly number[]) => {
    const index = history.findIndex((value) => value === -3);
    return index === -1 ? null : index + 1;
  };
  const visibleConstraintPeriod = (state: EngineState) => {
    const activatedAtStep = state.registry.RefinancingConstraint?.activatedAtStep;
    return activatedAtStep == null ? null : activatedAtStep + 1;
  };

  return {
    firstDivergencePeriod:
      firstDivergenceIndex === -1 ? null : firstDivergenceIndex + 1,
    maximumMarginSeparation:
      separations.length === 0 ? 0 : Math.max(...separations),
    cumulativeAbsoluteSeparation: separations.reduce((sum, value) => sum + value, 0),
    firstLowerClampPeriodA: firstLowerClamp(input.marginHistoryA),
    firstLowerClampPeriodB: firstLowerClamp(input.marginHistoryB),
    visibleConstraintPeriodA: visibleConstraintPeriod(input.terminalStateA),
    visibleConstraintPeriodB: visibleConstraintPeriod(input.terminalStateB),
    terminalMarginA: input.terminalStateA.margin,
    terminalMarginB: input.terminalStateB.margin,
  };
}
