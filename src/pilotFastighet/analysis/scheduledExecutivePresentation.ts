import type { EngineState } from "../RealEstateEngine";
import type { ActionKey } from "../actionEffects";
import type { ScenarioExecutionProvenance } from "./reactScheduledAnalysisBoundary";
import { getRevealedExecutionProvenance } from "./manualScheduledExecution";

export type ScheduledExecutionGraphMarker = Readonly<{
  scenario: "A" | "B";
  actionId: ActionKey;
  actualExecutionStep: number;
  graphIndex: number;
  periodLabel: string;
  actionLabel: string;
  accessibleLabel: string;
}>;

export function buildScheduledExecutionGraphMarkers(input: Readonly<{
  provenance: ScenarioExecutionProvenance;
  revealedStep: number;
  language: "sv" | "en";
  scenarioLabels: Readonly<Record<"A" | "B", string>>;
  getActionLabel: (actionId: ActionKey, language: "sv" | "en") => string;
}>): readonly ScheduledExecutionGraphMarker[] {
  const revealed = getRevealedExecutionProvenance(
    input.provenance,
    input.revealedStep
  );
  return (["A", "B"] as const)
    .flatMap((scenario) =>
      revealed[scenario].map((entry) => {
        const actionId = entry.actionId as ActionKey;
        const periodLabel = `M${entry.actualExecutionStep}`;
        const actionLabel = input.getActionLabel(actionId, input.language);
        return {
          scenario,
          actionId,
          actualExecutionStep: entry.actualExecutionStep,
          graphIndex: entry.actualExecutionStep - 1,
          periodLabel,
          actionLabel,
          accessibleLabel:
            input.language === "sv"
              ? `Scenario ${scenario}, ${input.scenarioLabels[scenario]}: ${actionLabel} genomfördes ${periodLabel}`
              : `Scenario ${scenario}, ${input.scenarioLabels[scenario]}: ${actionLabel} executed ${periodLabel}`,
        };
      })
    )
    .sort(
      (left, right) =>
        left.actualExecutionStep - right.actualExecutionStep ||
        left.scenario.localeCompare(right.scenario) ||
        left.actionId.localeCompare(right.actionId)
    );
}

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
  convergencePeriod: number | null;
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
  const convergenceIndex = separations.findIndex((value, index) =>
    value === 0 && separations.slice(index).every((candidate) => candidate === 0)
  );

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
    convergencePeriod: convergenceIndex === -1 ? null : convergenceIndex + 1,
  };
}
