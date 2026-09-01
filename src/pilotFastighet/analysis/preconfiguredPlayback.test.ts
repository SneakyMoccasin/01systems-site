import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { RealEstateEngine, type EngineState, type RiskState } from "../RealEstateEngine";
import { buildDriverScoreState, type DriverScoreState } from "../driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "../executiveDemoPlaybackScenario";
import { PILOT_CASES } from "../pilotCases";
import { defaultRiskState } from "../presetRiskMapping";
import {
  createPreconfiguredPlayback,
  getPreconfiguredPlaybackSnapshot,
  isPlaybackGenerationCurrent,
} from "./preconfiguredPlayback";
import { runCascadeAnalysis } from "./runCascadeAnalysis";

const VISIBLE_STEPS = 36;
const TOTAL_TRANSITIONS = 36;
const DEMAND_LEVEL = { LOW: 0, MODERATE: 1, HIGH: 2, SEVERE: 3 } as const;

type Fixture = {
  scenarioA: RiskState;
  scenarioB: RiskState;
  driverScoresA: DriverScoreState;
  driverScoresB: DriverScoreState;
};

function runLegacy(
  initialRiskState: RiskState,
  initialDriverScores?: DriverScoreState
): EngineState[] {
  const engine = new RealEstateEngine(
    structuredClone(initialRiskState),
    initialDriverScores ? structuredClone(initialDriverScores) : undefined
  );
  const trajectory: EngineState[] = [];
  for (let index = 0; index < TOTAL_TRANSITIONS; index += 1) {
    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }
  return trajectory;
}

function tippingIndex(trajectory: readonly EngineState[]): number | null {
  const index = trajectory.findIndex(
    (state) => state.registry.RefinancingConstraint.lifecycle === "ACTIVE"
  );
  return index === -1 ? null : index;
}

function steadyStateStep(
  trajectoryA: readonly EngineState[],
  trajectoryB: readonly EngineState[]
): number | null {
  let lastA: number | null = null;
  let lastB: number | null = null;
  let stableA = 0;
  let stableB = 0;
  let result: number | null = null;

  for (let index = 0; index < trajectoryA.length; index += 1) {
    const stateA = trajectoryA[index];
    const stateB = trajectoryB[index];
    if (stateA.step > 5 && lastA !== null) {
      stableA = Math.abs(stateA.margin - lastA) < 1e-6 ? stableA + 1 : 0;
    }
    lastA = stateA.margin;
    if (stateB.step > 5 && lastB !== null) {
      stableB = Math.abs(stateB.margin - lastB) < 1e-6 ? stableB + 1 : 0;
    }
    lastB = stateB.margin;
    if ((stateA.step > 5 && stableA >= 3) || (stateB.step > 5 && stableB >= 3)) {
      result = stateB.step;
    }
  }
  return result;
}

function buildPlayback(fixture: Fixture) {
  const analysis = runCascadeAnalysis({
    executionMode: "preconfigured",
    horizon: TOTAL_TRANSITIONS,
    scenarioA: {
      initialRiskState: fixture.scenarioA,
      initialDriverScores: fixture.driverScoresA,
    },
    scenarioB: {
      initialRiskState: fixture.scenarioB,
      initialDriverScores: fixture.driverScoresB,
    },
    baseline: { initialRiskState: defaultRiskState },
  });
  return {
    analysis,
    playback: createPreconfiguredPlayback(analysis, VISIBLE_STEPS),
    legacyA: runLegacy(fixture.scenarioA, fixture.driverScoresA),
    legacyB: runLegacy(fixture.scenarioB, fixture.driverScoresB),
    legacyBaseline: runLegacy(defaultRiskState),
  };
}

const manualCase = PILOT_CASES.find((candidate) => candidate.id === "refinancing_squeeze");
assert.ok(manualCase);
const manualFixture: Fixture = {
  scenarioA: manualCase.riskStateA,
  scenarioB: manualCase.riskStateB,
  driverScoresA: buildDriverScoreState(manualCase.riskStateA),
  driverScoresB: buildDriverScoreState(manualCase.riskStateB),
};

const executiveDemo = getExecutiveDemoPlaybackRiskStates();
const executiveFixture: Fixture = {
  scenarioA: executiveDemo.riskStateA,
  scenarioB: executiveDemo.riskStateB,
  driverScoresA: buildDriverScoreState(executiveDemo.riskStateA),
  driverScoresB: buildDriverScoreState(executiveDemo.riskStateB),
};

function assertEveryVisiblePrefix(fixture: Fixture): void {
  const { playback, legacyA, legacyB, legacyBaseline } = buildPlayback(fixture);

  for (let prefix = 1; prefix <= VISIBLE_STEPS; prefix += 1) {
    const snapshot = getPreconfiguredPlaybackSnapshot(playback, prefix);
    const expectedA = legacyA.slice(0, prefix);
    const expectedB = legacyB.slice(0, prefix);
    const expectedBaseline = legacyBaseline.slice(0, prefix);

    assert.equal(snapshot.isCompleted, prefix === VISIBLE_STEPS);
    assert.equal(snapshot.visibleStepCount, prefix);
    assert.deepEqual(snapshot.marginHistoryA, expectedA.map((state) => state.margin));
    assert.deepEqual(snapshot.marginHistoryB, expectedB.map((state) => state.margin));
    assert.deepEqual(
      snapshot.marginHistoryBaseline,
      expectedBaseline.map((state) => state.margin)
    );
    assert.deepEqual(
      snapshot.demandHistoryA,
      expectedA.map((state) => DEMAND_LEVEL[state.riskState.demandRisk])
    );
    assert.deepEqual(
      snapshot.demandHistoryB,
      expectedB.map((state) => DEMAND_LEVEL[state.riskState.demandRisk])
    );
    assert.deepEqual(snapshot.currentStateA, expectedA[prefix - 1]);
    assert.deepEqual(snapshot.currentStateB, expectedB[prefix - 1]);
    assert.deepEqual(snapshot.riskStateA, expectedA[prefix - 1].riskState);
    assert.deepEqual(snapshot.riskStateB, expectedB[prefix - 1].riskState);
    assert.deepEqual(snapshot.driverScoresA, expectedA[prefix - 1].driverScores);
    assert.deepEqual(snapshot.driverScoresB, expectedB[prefix - 1].driverScores);
    assert.deepEqual(snapshot.cascadeEventsA, expectedA[prefix - 1].cascadeEvents);
    assert.deepEqual(snapshot.cascadeEventsB, expectedB[prefix - 1].cascadeEvents);
    assert.deepEqual(snapshot.currentStateA?.registry, expectedA[prefix - 1].registry);
    assert.deepEqual(snapshot.currentStateB?.registry, expectedB[prefix - 1].registry);
    assert.equal(snapshot.tippingMarginIndexA, tippingIndex(expectedA));
    assert.equal(snapshot.tippingMarginIndexB, tippingIndex(expectedB));
    assert.equal(snapshot.steadyStateStep, steadyStateStep(expectedA, expectedB));
  }
}

test("manual preconfigured playback matches every legacy visible prefix exactly", () => {
  assertEveryVisiblePrefix(manualFixture);
});

test("executive-demo playback matches every legacy visible prefix exactly", () => {
  assertEveryVisiblePrefix(executiveFixture);
});

test("state 36 is the sole terminal state and completes the visible playback", () => {
  const { playback, legacyA, legacyB } = buildPlayback(executiveFixture);
  const beforeCompletion = getPreconfiguredPlaybackSnapshot(
    playback,
    VISIBLE_STEPS - 1
  );
  const completed = getPreconfiguredPlaybackSnapshot(playback, VISIBLE_STEPS);

  assert.equal(beforeCompletion.isCompleted, false);
  assert.equal(beforeCompletion.currentStateA?.step, 35);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.visibleStepCount, 36);
  assert.equal(completed.marginHistoryA.length, 36);
  assert.equal(completed.marginHistoryB.length, 36);
  assert.deepEqual(completed.currentStateA, legacyA[35]);
  assert.deepEqual(completed.currentStateB, legacyB[35]);
  assert.deepEqual(completed.riskStateA, legacyA[35].riskState);
  assert.deepEqual(completed.riskStateB, legacyB[35].riskState);
  assert.deepEqual(playback.terminalStateA, legacyA[35]);
  assert.deepEqual(playback.terminalStateB, legacyB[35]);
  assert.throws(
    () => getPreconfiguredPlaybackSnapshot(playback, VISIBLE_STEPS + 1),
    /outside the supported range/
  );

  const extraTransition = runCascadeAnalysis({
    executionMode: "preconfigured",
    horizon: VISIBLE_STEPS + 1,
    scenarioA: {
      initialRiskState: executiveFixture.scenarioA,
      initialDriverScores: executiveFixture.driverScoresA,
    },
    scenarioB: {
      initialRiskState: executiveFixture.scenarioB,
      initialDriverScores: executiveFixture.driverScoresB,
    },
    baseline: { initialRiskState: defaultRiskState },
  });
  assert.throws(
    () => createPreconfiguredPlayback(extraTransition, VISIBLE_STEPS),
    /exactly 36 post-transition states/
  );
});

test("an arbitrary configured horizon is authoritative", () => {
  const horizon = 4;
  const analysis = runCascadeAnalysis({
    executionMode: "preconfigured",
    horizon,
    scenarioA: {
      initialRiskState: manualFixture.scenarioA,
      initialDriverScores: manualFixture.driverScoresA,
    },
    scenarioB: {
      initialRiskState: manualFixture.scenarioB,
      initialDriverScores: manualFixture.driverScoresB,
    },
    baseline: { initialRiskState: defaultRiskState },
  });
  const playback = createPreconfiguredPlayback(analysis, horizon);

  assert.equal(analysis.scenarioA.trajectory.length, horizon);
  assert.equal(getPreconfiguredPlaybackSnapshot(playback, horizon - 1).isCompleted, false);
  const completed = getPreconfiguredPlaybackSnapshot(playback, horizon);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.visibleStepCount, horizon);
  assert.equal(completed.currentStateA?.step, horizon);
  assert.deepEqual(completed.currentStateA, analysis.scenarioA.terminalState);
  assert.throws(() => getPreconfiguredPlaybackSnapshot(playback, horizon + 1));
});

test("stopping preserves early, middle, and late preterminal prefixes", () => {
  const { playback } = buildPlayback(manualFixture);
  for (const prefix of [2, 18, 35]) {
    const stopped = getPreconfiguredPlaybackSnapshot(playback, prefix);
    const frozen = structuredClone(stopped);
    getPreconfiguredPlaybackSnapshot(playback, prefix + 1);
    assert.deepEqual(stopped, frozen);
    assert.equal(stopped.visibleStepCount, prefix);
    assert.equal(stopped.marginHistoryA.length, prefix);
    assert.equal(stopped.isCompleted, false);
  }
});

test("run generations reject stale reset and rerun callbacks", () => {
  const firstRun = 1;
  const resetGeneration = 2;
  const rerunGeneration = 3;
  assert.equal(isPlaybackGenerationCurrent(firstRun, firstRun), true);
  assert.equal(isPlaybackGenerationCurrent(firstRun, resetGeneration), false);
  assert.equal(isPlaybackGenerationCurrent(firstRun, rerunGeneration), false);
  assert.equal(isPlaybackGenerationCurrent(rerunGeneration, rerunGeneration), true);
});

test("executive demo facade output and completion state equal legacy execution", () => {
  const { analysis, playback, legacyA, legacyB, legacyBaseline } =
    buildPlayback(executiveFixture);
  assert.deepEqual(analysis.scenarioA.trajectory, legacyA);
  assert.deepEqual(analysis.scenarioB.trajectory, legacyB);
  assert.deepEqual(analysis.baseline.trajectory, legacyBaseline);
  const completed = getPreconfiguredPlaybackSnapshot(playback, TOTAL_TRANSITIONS);
  assert.equal(analysis.scenarioA.trajectory.length, 36);
  assert.equal(analysis.scenarioB.trajectory.length, 36);
  assert.equal(analysis.baseline.trajectory.length, 36);
  assert.equal(analysis.scenarioA.terminalState.margin, -3);
  assert.equal(analysis.scenarioB.terminalState.margin, 3);
  assert.equal(analysis.baseline.terminalState.margin, 1);
  assert.equal(analysis.comparison.terminalMarginDifference, 6);
  assert.equal(analysis.scenarioA.cascadeHistory.length, 7);
  assert.equal(analysis.scenarioB.cascadeHistory.length, 0);
  assert.equal(
    analysis.scenarioA.terminalState.registry.RefinancingConstraint.lifecycle,
    "ACTIVE"
  );
  assert.equal(
    analysis.scenarioA.terminalState.registry.RefinancingConstraint.activatedAtStep,
    1
  );
  assert.equal(
    analysis.scenarioB.terminalState.registry.RefinancingConstraint.lifecycle,
    "INACTIVE"
  );
  assert.deepEqual(completed.currentStateA, legacyA[35]);
  assert.deepEqual(completed.currentStateB, legacyB[35]);
  assert.deepEqual(completed.riskStateA, legacyA[35].riskState);
  assert.deepEqual(completed.riskStateB, legacyB[35].riskState);
  assert.deepEqual(completed.driverScoresA, legacyA[35].driverScores);
  assert.deepEqual(completed.driverScoresB, legacyB[35].driverScores);
  assert.equal(completed.tippingMarginIndexA, 1);
  assert.equal(completed.tippingMarginIndexB, null);
  assert.equal(completed.steadyStateStep, 36);
});

test("React boundary selects configured-start and exposes no scheduled or engine stepping path", () => {
  const pageSource = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.equal((pageSource.match(/runReactAnalysisBoundary\s*\(/g) ?? []).length, 1);
  assert.match(pageSource, /executionMode:\s*["']configured-start["']/);
  assert.match(pageSource, /horizon:\s*simulationHorizon\s*,/);
  assert.doesNotMatch(pageSource, /horizon:\s*simulationHorizon\s*\+\s*1/);
  assert.doesNotMatch(pageSource, /Compatibility|compatibility|state 37|state-37/);
  assert.doesNotMatch(pageSource, /new\s+RealEstateEngine\s*\(/);
  assert.doesNotMatch(pageSource, /\.stepForward\s*\(/);
  assert.doesNotMatch(
    pageSource,
    /actions-over-time|ScheduledAction|scenarioAActions|scenarioBActions/
  );
  assert.match(pageSource, /currentStateARef\.current\s*=\s*snapshot\.currentStateA/);
  assert.match(pageSource, /currentStateBRef\.current\s*=\s*snapshot\.currentStateB/);
  assert.match(pageSource, /engineState:\s*JSON\.parse\(JSON\.stringify\(stateA\)\)/);
  assert.match(pageSource, /engineState:\s*JSON\.parse\(JSON\.stringify\(stateB\)\)/);
  assert.match(pageSource, /constraintRegistryA=\{stateA\.registry\}/);
  assert.match(pageSource, /constraintRegistryB=\{stateB\.registry\}/);
});
