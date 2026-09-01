import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import {
  RealEstateEngine,
  type EngineState,
  type RiskState,
} from "../RealEstateEngine";
import { buildDriverScoreState, type DriverScoreState } from "../driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "../executiveDemoPlaybackScenario";
import { defaultRiskState } from "../presetRiskMapping";
import { runCascadeAnalysis } from "./runCascadeAnalysis";

const HORIZON = 36;

const GOLDEN_TRAJECTORY_HASHES = {
  baseline: "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af",
  scenarioA: "98a467ca379ecb3c440146d67a9eb35bd8e23860348c8bc5842ed5579b21ccbd",
  scenarioB: "75ca4a990430eaec3c21a6b0de846c2f88d9e6419a37dbbd75b97ed564984373",
} as const;

const EXPECTED_CASCADE_ORDER = [
  "maintenanceIntensityRisk->tenantStabilityRisk",
  "tenantStabilityRisk->demandRisk",
  "interestRateExposureRisk->refinancingRisk",
  "interestRateExposureRisk->leverageLevelRisk",
  "leverageLevelRisk->liquidityPressure",
  "leverageLevelRisk->capitalCommitmentRigidityRisk",
  "capitalCommitmentRigidityRisk->operationalEfficiencyRisk",
];

function runLegacyLoop(
  riskState: RiskState,
  driverScores?: DriverScoreState
): EngineState[] {
  const engine = new RealEstateEngine(
    structuredClone(riskState),
    driverScores ? structuredClone(driverScores) : undefined
  );
  const trajectory: EngineState[] = [];

  for (let index = 0; index < HORIZON; index += 1) {
    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }

  return trajectory;
}

function exactHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildExecutiveDemoInput() {
  const demo = getExecutiveDemoPlaybackRiskStates();

  return {
    horizon: HORIZON,
    scenarioA: {
      initialRiskState: demo.riskStateA,
      initialDriverScores: buildDriverScoreState(demo.riskStateA),
    },
    scenarioB: {
      initialRiskState: demo.riskStateB,
      initialDriverScores: buildDriverScoreState(demo.riskStateB),
    },
    baseline: {
      initialRiskState: defaultRiskState,
    },
  };
}

test("headless facade exactly matches locked executive-demo trajectories", () => {
  const input = buildExecutiveDemoInput();
  const result = runCascadeAnalysis(input);
  const legacyA = runLegacyLoop(
    input.scenarioA.initialRiskState,
    input.scenarioA.initialDriverScores
  );
  const legacyB = runLegacyLoop(
    input.scenarioB.initialRiskState,
    input.scenarioB.initialDriverScores
  );
  const legacyBaseline = runLegacyLoop(input.baseline.initialRiskState);

  assert.deepEqual(result.scenarioA.trajectory, legacyA);
  assert.deepEqual(result.scenarioB.trajectory, legacyB);
  assert.deepEqual(result.baseline.trajectory, legacyBaseline);
  assert.equal(exactHash(result.scenarioA.trajectory), GOLDEN_TRAJECTORY_HASHES.scenarioA);
  assert.equal(exactHash(result.scenarioB.trajectory), GOLDEN_TRAJECTORY_HASHES.scenarioB);
  assert.equal(exactHash(result.baseline.trajectory), GOLDEN_TRAJECTORY_HASHES.baseline);
});

test("facade records 36 post-transition states and exposes derived views", () => {
  const result = runCascadeAnalysis(buildExecutiveDemoInput());

  for (const scenario of [result.scenarioA, result.scenarioB, result.baseline]) {
    assert.equal(scenario.trajectory.length, HORIZON);
    assert.equal(scenario.trajectory[0].step, 1);
    assert.equal(scenario.terminalState.step, 36);
    assert.deepEqual(
      scenario.marginHistory,
      scenario.trajectory.map((state) => state.margin)
    );
    assert.deepEqual(
      scenario.constraintHistory,
      scenario.trajectory.map((state) => state.registry)
    );
    assert.deepEqual(
      scenario.cascadeHistory,
      scenario.terminalState.cascadeEvents
    );
  }

  assert.equal(result.scenarioA.terminalState.margin, -3);
  assert.equal(result.scenarioB.terminalState.margin, 3);
  assert.equal(result.baseline.terminalState.margin, 1);
  assert.equal(
    result.scenarioA.terminalState.registry.RefinancingConstraint.activatedAtStep,
    1
  );
  assert.equal(
    result.scenarioA.trajectory.findIndex(
      (state) => state.registry.RefinancingConstraint.lifecycle === "ACTIVE"
    ),
    1
  );
  assert.deepEqual(
    result.scenarioA.cascadeHistory.map(
      (event) => `${event.sourceRisk}->${event.targetRisk}`
    ),
    EXPECTED_CASCADE_ORDER
  );
});

test("facade preserves precise and materialized states exactly", () => {
  const result = runCascadeAnalysis(buildExecutiveDemoInput());

  assert.deepEqual(result.scenarioA.terminalState.driverScores, {
    ...buildDriverScoreState(defaultRiskState),
    demandRisk: 2,
    tenantStabilityRisk: 2,
    maintenanceIntensityRisk: 2,
    operationalEfficiencyRisk: 2,
    interestRateExposureRisk: 2,
    leverageLevelRisk: 2,
    refinancingRisk: 2,
    regulatoryPressureRisk: 2,
    capitalCommitmentRigidityRisk: 2,
    liquidityPressure: 2,
  });
  assert.equal(result.scenarioA.terminalState.riskState.liquidityPressure, "HIGH");
  assert.equal(result.scenarioB.terminalState.driverScores.tenantStabilityRisk, 0);
  assert.equal(result.scenarioB.terminalState.riskState.tenantStabilityRisk, "LOW");
  assert.deepEqual(result.baseline.terminalState.driverScores, buildDriverScoreState(defaultRiskState));
  assert.deepEqual(result.baseline.terminalState.riskState, defaultRiskState);
});

test("facade preserves fractional preconfigured driver scores", () => {
  const preciseScores = buildDriverScoreState(defaultRiskState);
  preciseScores.operational_capacity = 0.5;
  preciseScores.budget_pressure = 1.5;

  const result = runCascadeAnalysis({
    horizon: 1,
    scenarioA: {
      initialRiskState: {
        ...defaultRiskState,
        operational_capacity: "LOW",
        budget_pressure: "HIGH",
      },
      initialDriverScores: preciseScores,
    },
    scenarioB: { initialRiskState: defaultRiskState },
  });

  assert.equal(result.scenarioA.terminalState.driverScores.operational_capacity, 0.5);
  assert.equal(result.scenarioA.terminalState.driverScores.budget_pressure, 1.5);
});

test("facade comparison is a deterministic derivation of canonical trajectories", () => {
  const first = runCascadeAnalysis(buildExecutiveDemoInput());
  const second = runCascadeAnalysis(buildExecutiveDemoInput());

  assert.deepEqual(first, second);
  assert.equal(first.comparison.firstDivergenceIndex, 0);
  assert.equal(first.comparison.terminalMarginDifference, 6);
  assert.deepEqual(
    first.comparison.marginDifferenceByStep,
    first.scenarioB.marginHistory.map(
      (marginB, index) => marginB - first.scenarioA.marginHistory[index]
    )
  );
});

test("facade rejects a horizon that cannot produce a terminal state", () => {
  assert.throws(
    () =>
      runCascadeAnalysis({
        horizon: 0,
        scenarioA: { initialRiskState: defaultRiskState },
        scenarioB: { initialRiskState: defaultRiskState },
      }),
    /positive integer/
  );
});
