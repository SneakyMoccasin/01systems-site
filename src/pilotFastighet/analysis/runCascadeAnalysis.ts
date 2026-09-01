import {
  RealEstateEngine,
  type EngineState,
  type RiskState,
} from "../RealEstateEngine";
import type { CascadeEvent } from "../riskPropagation";
import type { ConstraintRegistry } from "../constraintState";
import type { DriverScoreState } from "../driverScoreState";
import { defaultRiskState } from "../presetRiskMapping";

export type PreconfiguredScenarioInput = {
  initialRiskState: RiskState;
  initialDriverScores?: DriverScoreState;
};

export type CascadeAnalysisInput = {
  scenarioA: PreconfiguredScenarioInput;
  scenarioB: PreconfiguredScenarioInput;
  baseline?: PreconfiguredScenarioInput;
  horizon: number;
};

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

export type AnalyticalResults = {
  scenarioA: ScenarioAnalysisResult;
  scenarioB: ScenarioAnalysisResult;
  baseline: ScenarioAnalysisResult;
  comparison: CascadeAnalysisComparison;
};

function validateHorizon(horizon: number): void {
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new RangeError("Cascade analysis horizon must be a positive integer.");
  }
}

function runPreconfiguredScenario(
  input: PreconfiguredScenarioInput,
  horizon: number
): ScenarioAnalysisResult {
  const engine = new RealEstateEngine(
    structuredClone(input.initialRiskState),
    input.initialDriverScores
      ? structuredClone(input.initialDriverScores)
      : undefined
  );
  const trajectory: EngineState[] = [];

  for (let index = 0; index < horizon; index += 1) {
    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }

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

function compareScenarios(
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

/**
 * Runs the current preconfigured pilotFastighet analysis synchronously.
 *
 * Any selected-action effects must already be resolved into the supplied
 * initial risk state and precise driver scores before this boundary is called.
 * No action is applied after engine construction.
 */
export function runCascadeAnalysis(
  input: CascadeAnalysisInput
): AnalyticalResults {
  validateHorizon(input.horizon);

  const scenarioA = runPreconfiguredScenario(input.scenarioA, input.horizon);
  const scenarioB = runPreconfiguredScenario(input.scenarioB, input.horizon);
  const baseline = runPreconfiguredScenario(
    input.baseline ?? { initialRiskState: defaultRiskState },
    input.horizon
  );

  return {
    scenarioA,
    scenarioB,
    baseline,
    comparison: compareScenarios(scenarioA, scenarioB),
  };
}
