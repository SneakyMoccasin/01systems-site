import type { EngineState } from "../RealEstateEngine";
import type { CascadeEvent } from "../riskPropagation";
import type { ConstraintRegistry } from "../constraintState";

export type ScenarioAnalysisResult = {
  /** Post-transition states only. The initial step-0 state is not included. */
  trajectory: readonly EngineState[];
  /** Derived view of the canonical trajectory. */
  readonly marginHistory: readonly number[];
  /** Derived view of the canonical trajectory. */
  readonly constraintHistory: readonly ConstraintRegistry[];
  /** Cumulative cascade history on the terminal state. */
  readonly cascadeHistory: readonly CascadeEvent[];
  /** The final recorded trajectory state. */
  readonly terminalState: EngineState;
};

export type CascadeAnalysisComparison = {
  /** Scenario B margin minus Scenario A margin at each recorded step. */
  marginDifferenceByStep: readonly number[];
  firstDivergenceIndex: number | null;
  terminalMarginDifference: number;
};

export function createScenarioAnalysisResult(
  trajectory: EngineState[]
): ScenarioAnalysisResult {
  return {
    trajectory,
    get marginHistory() {
      return trajectory.map((state) => state.margin);
    },
    get constraintHistory() {
      return trajectory.map((state) => state.registry);
    },
    get cascadeHistory() {
      return trajectory[trajectory.length - 1].cascadeEvents;
    },
    get terminalState() {
      return trajectory[trajectory.length - 1];
    },
  };
}

export function compareScenarioTrajectories(
  scenarioA: ScenarioAnalysisResult,
  scenarioB: ScenarioAnalysisResult
): CascadeAnalysisComparison {
  const marginDifferenceByStep = scenarioB.marginHistory.map(
    (marginB, index) => marginB - scenarioA.marginHistory[index]
  );
  const divergenceIndex = marginDifferenceByStep.findIndex(
    (difference) => difference !== 0
  );

  return {
    marginDifferenceByStep,
    firstDivergenceIndex: divergenceIndex === -1 ? null : divergenceIndex,
    terminalMarginDifference:
      scenarioB.terminalState.margin - scenarioA.terminalState.margin,
  };
}
