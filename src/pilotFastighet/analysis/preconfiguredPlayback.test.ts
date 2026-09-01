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
const TOTAL_TRANSITIONS = 37;
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

    assert.equal(snapshot.isCompleted, false);
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

test("completion preserves 36 visible states and exposes legacy state 37 separately", () => {
  const { playback, legacyA, legacyB } = buildPlayback(executiveFixture);
  const visible = getPreconfiguredPlaybackSnapshot(playback, VISIBLE_STEPS);
  const completed = getPreconfiguredPlaybackSnapshot(playback, TOTAL_TRANSITIONS);

  assert.equal(visible.isCompleted, false);
  assert.equal(visible.currentStateA?.step, 36);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.isCompatibilityPhase, true);
  assert.equal(completed.visibleStepCount, 36);
  assert.equal(completed.marginHistoryA.length, 36);
  assert.equal(completed.marginHistoryB.length, 36);
  assert.deepEqual(completed.marginHistoryA, visible.marginHistoryA);
  assert.deepEqual(completed.marginHistoryB, visible.marginHistoryB);
  assert.deepEqual(completed.currentStateA, legacyA[36]);
  assert.deepEqual(completed.currentStateB, legacyB[36]);
  assert.deepEqual(completed.riskStateA, legacyA[35].riskState);
  assert.deepEqual(completed.riskStateB, legacyB[35].riskState);
  assert.deepEqual(playback.visibleTerminalStateA, legacyA[35]);
  assert.deepEqual(playback.visibleTerminalStateB, legacyB[35]);
  assert.deepEqual(playback.compatibilityTerminalStateA, legacyA[36]);
  assert.deepEqual(playback.compatibilityTerminalStateB, legacyB[36]);
});

test("stopping preserves early, middle, and late revealed prefixes", () => {
  const { playback } = buildPlayback(manualFixture);
  for (const prefix of [2, 18, 36]) {
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
  assert.deepEqual(completed.currentStateA, legacyA[36]);
  assert.deepEqual(completed.currentStateB, legacyB[36]);
});

test("React boundary uses one preconfigured facade call and no scheduled or engine stepping path", () => {
  const pageSource = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.equal((pageSource.match(/runCascadeAnalysis\s*\(/g) ?? []).length, 1);
  assert.match(pageSource, /executionMode:\s*["']preconfigured["']/);
  assert.doesNotMatch(pageSource, /new\s+RealEstateEngine\s*\(/);
  assert.doesNotMatch(pageSource, /\.stepForward\s*\(/);
  assert.doesNotMatch(pageSource, /ScheduledAction|scenarioAActions|scenarioBActions/);
});
