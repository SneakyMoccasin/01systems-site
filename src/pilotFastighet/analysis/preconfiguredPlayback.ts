import type { EngineState } from "../RealEstateEngine";
import type { RiskLevel } from "../impactContract";
import type { CascadeEvent } from "../riskPropagation";
import type { DriverScoreState } from "../driverScoreState";
import type { AnalyticalResults } from "./runCascadeAnalysis";

const MIN_STEPS_BEFORE_STEADY = 5;
const REQUIRED_STABLE_TICKS = 3;
const STEADY_EPSILON = 1e-6;

const RISK_LEVEL_TO_NUMBER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  SEVERE: 3,
};

export type PreconfiguredPlayback = {
  readonly analysis: AnalyticalResults;
  readonly visibleSteps: number;
  readonly completionTick: number;
  readonly visibleTerminalStateA: EngineState;
  readonly visibleTerminalStateB: EngineState;
  readonly compatibilityTerminalStateA: EngineState;
  readonly compatibilityTerminalStateB: EngineState;
};

export type PreconfiguredPlaybackSnapshot = {
  readonly tick: number;
  readonly visibleStepCount: number;
  readonly isCompatibilityPhase: boolean;
  readonly isCompleted: boolean;
  readonly currentStateA: EngineState | null;
  readonly currentStateB: EngineState | null;
  readonly marginHistoryA: readonly number[];
  readonly marginHistoryB: readonly number[];
  readonly marginHistoryBaseline: readonly number[];
  readonly demandHistoryA: readonly number[];
  readonly demandHistoryB: readonly number[];
  readonly riskStateA: EngineState["riskState"] | null;
  readonly riskStateB: EngineState["riskState"] | null;
  readonly driverScoresA: DriverScoreState | null;
  readonly driverScoresB: DriverScoreState | null;
  readonly cascadeEventsA: readonly CascadeEvent[];
  readonly cascadeEventsB: readonly CascadeEvent[];
  readonly tippingMarginIndexA: number | null;
  readonly tippingMarginIndexB: number | null;
  readonly steadyStateStep: number | null;
};

function assertTrajectoryLength(
  name: string,
  trajectory: readonly EngineState[],
  requiredSteps: number
): void {
  if (trajectory.length !== requiredSteps) {
    throw new RangeError(
      `${name} must contain exactly ${requiredSteps} post-transition states.`
    );
  }
}

export function createPreconfiguredPlayback(
  analysis: AnalyticalResults,
  visibleSteps: number
): PreconfiguredPlayback {
  if (!Number.isInteger(visibleSteps) || visibleSteps < 1) {
    throw new RangeError("Visible playback steps must be a positive integer.");
  }

  const requiredSteps = visibleSteps + 1;
  assertTrajectoryLength("Scenario A trajectory", analysis.scenarioA.trajectory, requiredSteps);
  assertTrajectoryLength("Scenario B trajectory", analysis.scenarioB.trajectory, requiredSteps);
  assertTrajectoryLength("Baseline trajectory", analysis.baseline.trajectory, requiredSteps);

  return {
    analysis,
    visibleSteps,
    completionTick: requiredSteps,
    visibleTerminalStateA: analysis.scenarioA.trajectory[visibleSteps - 1],
    visibleTerminalStateB: analysis.scenarioB.trajectory[visibleSteps - 1],
    // Temporary legacy compatibility: state 37 completes the run but is not graphed.
    compatibilityTerminalStateA: analysis.scenarioA.trajectory[visibleSteps],
    compatibilityTerminalStateB: analysis.scenarioB.trajectory[visibleSteps],
  };
}

function findTippingIndex(trajectory: readonly EngineState[]): number | null {
  const index = trajectory.findIndex(
    (state) => state.registry.RefinancingConstraint?.lifecycle === "ACTIVE"
  );
  return index === -1 ? null : index;
}

function deriveSteadyStateStep(
  trajectoryA: readonly EngineState[],
  trajectoryB: readonly EngineState[]
): number | null {
  let lastMarginA: number | null = null;
  let lastMarginB: number | null = null;
  let stableCounterA = 0;
  let stableCounterB = 0;
  let steadyStateStep: number | null = null;

  for (let index = 0; index < trajectoryA.length; index += 1) {
    const stateA = trajectoryA[index];
    const stateB = trajectoryB[index];

    if (stateA.step > MIN_STEPS_BEFORE_STEADY && lastMarginA !== null) {
      stableCounterA =
        Math.abs(stateA.margin - lastMarginA) < STEADY_EPSILON
          ? stableCounterA + 1
          : 0;
    }
    lastMarginA = stateA.margin;

    if (stateB.step > MIN_STEPS_BEFORE_STEADY && lastMarginB !== null) {
      stableCounterB =
        Math.abs(stateB.margin - lastMarginB) < STEADY_EPSILON
          ? stableCounterB + 1
          : 0;
    }
    lastMarginB = stateB.margin;

    if (
      (stateA.step > MIN_STEPS_BEFORE_STEADY &&
        stableCounterA >= REQUIRED_STABLE_TICKS) ||
      (stateB.step > MIN_STEPS_BEFORE_STEADY &&
        stableCounterB >= REQUIRED_STABLE_TICKS)
    ) {
      steadyStateStep = stateB.step;
    }
  }

  return steadyStateStep;
}

export function getPreconfiguredPlaybackSnapshot(
  playback: PreconfiguredPlayback,
  tick: number
): PreconfiguredPlaybackSnapshot {
  if (!Number.isInteger(tick) || tick < 0 || tick > playback.completionTick) {
    throw new RangeError("Playback tick is outside the supported range.");
  }

  const visibleStepCount = Math.min(tick, playback.visibleSteps);
  const visibleA = playback.analysis.scenarioA.trajectory.slice(0, visibleStepCount);
  const visibleB = playback.analysis.scenarioB.trajectory.slice(0, visibleStepCount);
  const visibleBaseline = playback.analysis.baseline.trajectory.slice(
    0,
    visibleStepCount
  );
  const isCompatibilityPhase = tick === playback.completionTick;
  const visibleCurrentA = visibleA[visibleA.length - 1] ?? null;
  const visibleCurrentB = visibleB[visibleB.length - 1] ?? null;

  return {
    tick,
    visibleStepCount,
    isCompatibilityPhase,
    isCompleted: isCompatibilityPhase,
    currentStateA: isCompatibilityPhase
      ? playback.compatibilityTerminalStateA
      : visibleCurrentA,
    currentStateB: isCompatibilityPhase
      ? playback.compatibilityTerminalStateB
      : visibleCurrentB,
    marginHistoryA: visibleA.map((state) => state.margin),
    marginHistoryB: visibleB.map((state) => state.margin),
    marginHistoryBaseline: visibleBaseline.map((state) => state.margin),
    demandHistoryA: visibleA.map(
      (state) => RISK_LEVEL_TO_NUMBER[state.riskState.demandRisk ?? "MODERATE"]
    ),
    demandHistoryB: visibleB.map(
      (state) => RISK_LEVEL_TO_NUMBER[state.riskState.demandRisk ?? "MODERATE"]
    ),
    riskStateA: visibleCurrentA?.riskState ?? null,
    riskStateB: visibleCurrentB?.riskState ?? null,
    driverScoresA: visibleCurrentA?.driverScores ?? null,
    driverScoresB: visibleCurrentB?.driverScores ?? null,
    cascadeEventsA: visibleCurrentA?.cascadeEvents ?? [],
    cascadeEventsB: visibleCurrentB?.cascadeEvents ?? [],
    tippingMarginIndexA: findTippingIndex(visibleA),
    tippingMarginIndexB: findTippingIndex(visibleB),
    steadyStateStep: deriveSteadyStateStep(visibleA, visibleB),
  };
}

export function isPlaybackGenerationCurrent(
  callbackGeneration: number,
  currentGeneration: number
): boolean {
  return callbackGeneration === currentGeneration;
}
