import {
  RealEstateEngine,
  type DriverDeltas,
  type EngineState,
  type RiskState,
} from "../RealEstateEngine";
import type { CascadeEvent } from "../riskPropagation";
import type { ConstraintRegistry } from "../constraintState";
import type { DriverScoreState } from "../driverScoreState";
import { ACTION_EFFECTS, type ActionKey } from "../actionEffects";
import { REAL_ESTATE_IMPACT_CONTRACT } from "../impactContract";
import { defaultRiskState } from "../presetRiskMapping";

export type PreconfiguredScenarioInput = {
  initialRiskState: RiskState;
  initialDriverScores?: DriverScoreState;
};

type CommonCascadeAnalysisInput = {
  scenarioA: PreconfiguredScenarioInput;
  scenarioB: PreconfiguredScenarioInput;
  baseline?: PreconfiguredScenarioInput;
  horizon: number;
};

export type PreconfiguredCascadeAnalysisInput = CommonCascadeAnalysisInput & {
  executionMode?: "preconfigured";
  scenarioAActions?: never;
  scenarioBActions?: never;
};

export type ScheduledAction = {
  actionId: ActionKey;
  executionStep: number;
  driverDeltas: DriverDeltas;
};

export type ScheduledCascadeAnalysisInput = CommonCascadeAnalysisInput & {
  executionMode: "scheduled";
  scenarioAActions: readonly ScheduledAction[];
  scenarioBActions: readonly ScheduledAction[];
};

export type CascadeAnalysisInput =
  | PreconfiguredCascadeAnalysisInput
  | ScheduledCascadeAnalysisInput;

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

export type ScheduledActionExecution = {
  scenario: "scenarioA" | "scenarioB";
  actionId: ActionKey;
  scheduledStep: number;
  actualExecutionStep: number;
  appliedDriverDeltas: DriverDeltas;
};

export type ScheduledAnalyticalResults = AnalyticalResults & {
  executionProvenance: readonly ScheduledActionExecution[];
};

type NormalizedScheduledAction = ScheduledAction & {
  driverDeltas: DriverDeltas;
};

const SUPPORTED_DRIVER_KEYS = new Set<string>(
  REAL_ESTATE_IMPACT_CONTRACT.map((parameter) => parameter.key)
);

function compareCanonicalStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateHorizon(horizon: number): void {
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new RangeError("Cascade analysis horizon must be a positive integer.");
  }
}

function normalizeScheduledActions(
  value: unknown,
  horizon: number,
  collectionName: string
): NormalizedScheduledAction[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${collectionName} must be an array.`);
  }

  return value.map((candidate, index) => {
    if (candidate == null || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new TypeError(`${collectionName}[${index}] must be an action object.`);
    }

    const action = candidate as Record<string, unknown>;
    const actionId = action.actionId;
    if (
      typeof actionId !== "string" ||
      !Object.prototype.hasOwnProperty.call(ACTION_EFFECTS, actionId)
    ) {
      throw new Error(`${collectionName}[${index}] has an unknown action ID.`);
    }

    const executionStep = action.executionStep;
    if (!Number.isInteger(executionStep)) {
      throw new RangeError(`${collectionName}[${index}] executionStep must be an integer.`);
    }
    if ((executionStep as number) < 1 || (executionStep as number) > horizon) {
      throw new RangeError(
        `${collectionName}[${index}] executionStep must be within the analysis horizon.`
      );
    }

    const deltas = action.driverDeltas;
    if (deltas == null || typeof deltas !== "object" || Array.isArray(deltas)) {
      throw new TypeError(`${collectionName}[${index}] driverDeltas must be an object.`);
    }

    const normalizedEntries = Object.entries(deltas).sort(([left], [right]) =>
      compareCanonicalStrings(left, right)
    );
    for (const [driver, delta] of normalizedEntries) {
      if (!SUPPORTED_DRIVER_KEYS.has(driver)) {
        throw new Error(`${collectionName}[${index}] has an unsupported driver: ${driver}.`);
      }
      if (typeof delta !== "number" || !Number.isFinite(delta)) {
        throw new TypeError(
          `${collectionName}[${index}] has a non-finite driver delta: ${driver}.`
        );
      }
    }

    return {
      actionId: actionId as ActionKey,
      executionStep: executionStep as number,
      driverDeltas: Object.fromEntries(normalizedEntries) as DriverDeltas,
    };
  });
}

function scheduledActionSortKey(action: NormalizedScheduledAction): string {
  return `${action.executionStep}:${action.actionId}:${JSON.stringify(action.driverDeltas)}`;
}

function validateExecutionInput(input: CascadeAnalysisInput): {
  scenarioAActions: NormalizedScheduledAction[];
  scenarioBActions: NormalizedScheduledAction[];
} | null {
  if (input.executionMode === "scheduled") {
    return {
      scenarioAActions: normalizeScheduledActions(
        input.scenarioAActions,
        input.horizon,
        "scenarioAActions"
      ),
      scenarioBActions: normalizeScheduledActions(
        input.scenarioBActions,
        input.horizon,
        "scenarioBActions"
      ),
    };
  }

  if (input.executionMode !== undefined && input.executionMode !== "preconfigured") {
    throw new Error("Unknown cascade-analysis execution mode.");
  }
  if ("scenarioAActions" in input || "scenarioBActions" in input) {
    throw new Error("Scheduled actions require executionMode: scheduled.");
  }

  return null;
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

function runScheduledScenario(
  input: PreconfiguredScenarioInput,
  horizon: number,
  scenario: "scenarioA" | "scenarioB",
  scheduledActions: readonly NormalizedScheduledAction[]
): {
  result: ScenarioAnalysisResult;
  provenance: ScheduledActionExecution[];
} {
  const engine = new RealEstateEngine(
    structuredClone(input.initialRiskState),
    input.initialDriverScores
      ? structuredClone(input.initialDriverScores)
      : undefined
  );
  const trajectory: EngineState[] = [];
  const provenance: ScheduledActionExecution[] = [];
  const actionsByStep = new Map<number, NormalizedScheduledAction[]>();

  for (const action of [...scheduledActions].sort((left, right) =>
    compareCanonicalStrings(scheduledActionSortKey(left), scheduledActionSortKey(right))
  )) {
    const actions = actionsByStep.get(action.executionStep) ?? [];
    actions.push(action);
    actionsByStep.set(action.executionStep, actions);
  }

  for (let index = 0; index < horizon; index += 1) {
    const executionStep = index + 1;
    const actions = actionsByStep.get(executionStep) ?? [];

    if (actions.length > 0) {
      const combinedDeltas = new Map<string, number>();
      for (const action of actions) {
        for (const [driver, delta] of Object.entries(action.driverDeltas)) {
          combinedDeltas.set(driver, (combinedDeltas.get(driver) ?? 0) + delta);
        }
        provenance.push({
          scenario,
          actionId: action.actionId,
          scheduledStep: action.executionStep,
          actualExecutionStep: executionStep,
          appliedDriverDeltas: structuredClone(action.driverDeltas),
        });
      }

      engine.applyDriverDeltas(
        Object.fromEntries(
          [...combinedDeltas.entries()].sort(([left], [right]) =>
            compareCanonicalStrings(left, right)
          )
        ) as DriverDeltas
      );
    }

    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }

  return {
    result: createScenarioResult(trajectory),
    provenance,
  };
}

function createScenarioResult(trajectory: EngineState[]): ScenarioAnalysisResult {
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
 * Runs the pilotFastighet analysis synchronously.
 *
 * Preconfigured mode expects all action effects in the supplied initial state.
 * Scheduled mode applies validated one-shot deltas before their recorded step.
 */
export function runCascadeAnalysis(
  input: PreconfiguredCascadeAnalysisInput
): AnalyticalResults;
export function runCascadeAnalysis(
  input: ScheduledCascadeAnalysisInput
): ScheduledAnalyticalResults;
export function runCascadeAnalysis(
  input: CascadeAnalysisInput
): AnalyticalResults | ScheduledAnalyticalResults {
  validateHorizon(input.horizon);
  const scheduledInput = validateExecutionInput(input);

  if (scheduledInput) {
    const scenarioA = runScheduledScenario(
      input.scenarioA,
      input.horizon,
      "scenarioA",
      scheduledInput.scenarioAActions
    );
    const scenarioB = runScheduledScenario(
      input.scenarioB,
      input.horizon,
      "scenarioB",
      scheduledInput.scenarioBActions
    );
    const baseline = runPreconfiguredScenario(
      input.baseline ?? { initialRiskState: defaultRiskState },
      input.horizon
    );

    return {
      scenarioA: scenarioA.result,
      scenarioB: scenarioB.result,
      baseline,
      comparison: compareScenarios(scenarioA.result, scenarioB.result),
      executionProvenance: [...scenarioA.provenance, ...scenarioB.provenance],
    };
  }

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
