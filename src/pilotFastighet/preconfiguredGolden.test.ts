import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { RealEstateEngine, type EngineState, type RiskState } from "./RealEstateEngine";
import {
  ACTION_EFFECTS,
  resolveActionDrivenState,
} from "./actionEffects";
import {
  buildDriverScoreState,
  type DriverScoreState,
} from "./driverScoreState";
import {
  getExecutiveDemoPlaybackRiskStates,
} from "./executiveDemoPlaybackScenario";
import { defaultRiskState } from "./presetRiskMapping";

const HORIZON = 36;

const INACTIVE_REGISTRY = {
  RefinancingConstraint: {
    type: "RefinancingConstraint",
    lifecycle: "INACTIVE",
    lastUpdatedStep: 0,
  },
  LiquidityConstraint: {
    type: "LiquidityConstraint",
    lifecycle: "INACTIVE",
    lastUpdatedStep: 0,
  },
  CovenantConstraint: {
    type: "CovenantConstraint",
    lifecycle: "INACTIVE",
    lastUpdatedStep: 0,
  },
  Custom: {
    type: "Custom",
    lifecycle: "INACTIVE",
    lastUpdatedStep: 0,
  },
} as const;

const ACTIVE_REFINANCING_REGISTRY = {
  ...INACTIVE_REGISTRY,
  RefinancingConstraint: {
    type: "RefinancingConstraint",
    lifecycle: "ACTIVE",
    lastUpdatedStep: 1,
    activatedAtStep: 1,
  },
} as const;

const DEFAULT_RISK_STATE = {
  demandRisk: "MODERATE",
  pricingPowerRisk: "MODERATE",
  tenantStabilityRisk: "MODERATE",
  maintenanceIntensityRisk: "MODERATE",
  operationalEfficiencyRisk: "MODERATE",
  energyExposureRisk: "MODERATE",
  interestRateExposureRisk: "MODERATE",
  leverageLevelRisk: "MODERATE",
  refinancingRisk: "MODERATE",
  marketVolatilityRisk: "MODERATE",
  regulatoryPressureRisk: "MODERATE",
  capitalCommitmentRigidityRisk: "MODERATE",
  accessibility: "MODERATE",
  modal_attractiveness: "MODERATE",
  congestion_pressure: "MODERATE",
  operational_capacity: "MODERATE",
  transit_signal_priority: "MODERATE",
  budget_pressure: "MODERATE",
} as const;

const DEFAULT_DRIVER_SCORES = Object.fromEntries(
  Object.keys(DEFAULT_RISK_STATE).map((key) => [key, 1])
) as DriverScoreState;

const DEMO_A_INITIAL_RISK_STATE = {
  ...DEFAULT_RISK_STATE,
  maintenanceIntensityRisk: "HIGH",
  regulatoryPressureRisk: "HIGH",
} as const;

const DEMO_B_INITIAL_RISK_STATE = {
  ...DEFAULT_RISK_STATE,
  tenantStabilityRisk: "LOW",
  maintenanceIntensityRisk: "LOW",
  operationalEfficiencyRisk: "LOW",
} as const;

const EXPECTED_CASCADE_EVENTS = [
  {
    step: 2,
    sourceRisk: "maintenanceIntensityRisk",
    targetRisk: "tenantStabilityRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "tenantStabilityRisk",
    targetRisk: "demandRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "interestRateExposureRisk",
    targetRisk: "refinancingRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "interestRateExposureRisk",
    targetRisk: "leverageLevelRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "leverageLevelRisk",
    targetRisk: "liquidityPressure",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "leverageLevelRisk",
    targetRisk: "capitalCommitmentRigidityRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
  {
    step: 2,
    sourceRisk: "capitalCommitmentRigidityRisk",
    targetRisk: "operationalEfficiencyRisk",
    level: "HIGH",
    iteration: 1,
    delaySteps: 1,
  },
] as const;

const DEFAULT_MARGINS = Array.from({ length: HORIZON }, () => 1);
const DEMO_A_MARGINS = [
  -0.4981884057971011,
  -2.201014492753623,
  ...Array.from({ length: HORIZON - 2 }, () => -3),
];
const DEMO_B_MARGINS = [
  1.849135802469136,
  2.5963753086419756,
  ...Array.from({ length: HORIZON - 2 }, () => 3),
];
const ORDER_TEST_MARGINS = [
  0.0018115942028988918,
  -1.2160144927536225,
  ...Array.from({ length: HORIZON - 2 }, () => -3),
];

const EXPECTED_TRAJECTORY_HASHES = {
  default: "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af",
  demoA: "98a467ca379ecb3c440146d67a9eb35bd8e23860348c8bc5842ed5579b21ccbd",
  demoB: "75ca4a990430eaec3c21a6b0de846c2f88d9e6419a37dbbd75b97ed564984373",
  orderTest: "fd42037794409447f69bbd7308a41a23040706446abf7c48cdb88774adb4acac",
} as const;

function runPreconfigured(
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

function exactTrajectoryHash(trajectory: EngineState[]): string {
  return createHash("sha256")
    .update(JSON.stringify(trajectory))
    .digest("hex");
}

function margins(trajectory: EngineState[]): number[] {
  return trajectory.map((state) => state.margin);
}

test("default baseline complete preconfigured trajectory remains golden", () => {
  assert.deepEqual(defaultRiskState, DEFAULT_RISK_STATE);
  assert.deepEqual(buildDriverScoreState(defaultRiskState), DEFAULT_DRIVER_SCORES);

  const trajectory = runPreconfigured(defaultRiskState);

  assert.equal(trajectory.length, HORIZON);
  assert.equal(exactTrajectoryHash(trajectory), EXPECTED_TRAJECTORY_HASHES.default);
  assert.deepEqual(margins(trajectory), DEFAULT_MARGINS);
  assert.deepEqual(trajectory.at(-1), {
    step: 36,
    margin: 1,
    registry: INACTIVE_REGISTRY,
    riskState: DEFAULT_RISK_STATE,
    driverScores: DEFAULT_DRIVER_SCORES,
    cascadeEvents: [],
  });
});

test("executive demo scenarios and their baseline remain fixed preconfigured inputs", () => {
  const demo = getExecutiveDemoPlaybackRiskStates();

  assert.deepEqual(Object.keys(demo).sort(), ["riskStateA", "riskStateB"]);
  assert.deepEqual(demo.riskStateA, DEMO_A_INITIAL_RISK_STATE);
  assert.deepEqual(demo.riskStateB, DEMO_B_INITIAL_RISK_STATE);

  const trajectoryA = runPreconfigured(
    demo.riskStateA,
    buildDriverScoreState(demo.riskStateA)
  );
  const trajectoryB = runPreconfigured(
    demo.riskStateB,
    buildDriverScoreState(demo.riskStateB)
  );
  const baseline = runPreconfigured(defaultRiskState);

  assert.equal(exactTrajectoryHash(trajectoryA), EXPECTED_TRAJECTORY_HASHES.demoA);
  assert.equal(exactTrajectoryHash(trajectoryB), EXPECTED_TRAJECTORY_HASHES.demoB);
  assert.equal(exactTrajectoryHash(baseline), EXPECTED_TRAJECTORY_HASHES.default);
  assert.deepEqual(margins(trajectoryA), DEMO_A_MARGINS);
  assert.deepEqual(margins(trajectoryB), DEMO_B_MARGINS);
  assert.deepEqual(margins(baseline), DEFAULT_MARGINS);

  assert.deepEqual(trajectoryA.at(-1), {
    step: 36,
    margin: -3,
    registry: ACTIVE_REFINANCING_REGISTRY,
    riskState: {
      ...DEFAULT_RISK_STATE,
      demandRisk: "HIGH",
      tenantStabilityRisk: "HIGH",
      maintenanceIntensityRisk: "HIGH",
      operationalEfficiencyRisk: "HIGH",
      interestRateExposureRisk: "HIGH",
      leverageLevelRisk: "HIGH",
      refinancingRisk: "HIGH",
      regulatoryPressureRisk: "HIGH",
      capitalCommitmentRigidityRisk: "HIGH",
      liquidityPressure: "HIGH",
    },
    driverScores: {
      ...DEFAULT_DRIVER_SCORES,
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
    },
    cascadeEvents: EXPECTED_CASCADE_EVENTS,
  });

  assert.deepEqual(trajectoryB.at(-1), {
    step: 36,
    margin: 3,
    registry: INACTIVE_REGISTRY,
    riskState: DEMO_B_INITIAL_RISK_STATE,
    driverScores: {
      ...DEFAULT_DRIVER_SCORES,
      tenantStabilityRisk: 0,
      maintenanceIntensityRisk: 0,
      operationalEfficiencyRisk: 0,
    },
    cascadeEvents: [],
  });
});

test("reversing conflicting selected actions is exactly order invariant", () => {
  const actionsAB = ["delay_maintenance", "secure_long_term_leases"];
  const actionsBA = [...actionsAB].reverse();
  const resolvedAB = resolveActionDrivenState(defaultRiskState, actionsAB);
  const resolvedBA = resolveActionDrivenState(defaultRiskState, actionsBA);

  assert.deepEqual(resolvedAB, resolvedBA);
  assert.deepEqual(resolvedAB, {
    driverScores: {
      ...DEFAULT_DRIVER_SCORES,
      demandRisk: 0,
      tenantStabilityRisk: 0.5,
      maintenanceIntensityRisk: 2,
    },
    riskState: {
      ...DEFAULT_RISK_STATE,
      demandRisk: "LOW",
      tenantStabilityRisk: "LOW",
      maintenanceIntensityRisk: "HIGH",
    },
  });

  const trajectoryAB = runPreconfigured(
    resolvedAB.riskState,
    resolvedAB.driverScores
  );
  const trajectoryBA = runPreconfigured(
    resolvedBA.riskState,
    resolvedBA.driverScores
  );

  assert.deepEqual(trajectoryAB, trajectoryBA);
  assert.equal(
    exactTrajectoryHash(trajectoryAB),
    EXPECTED_TRAJECTORY_HASHES.orderTest
  );
  assert.deepEqual(margins(trajectoryAB), ORDER_TEST_MARGINS);
  assert.deepEqual(trajectoryAB.at(-1)?.registry, ACTIVE_REFINANCING_REGISTRY);
  assert.deepEqual(trajectoryAB.at(-1)?.cascadeEvents, EXPECTED_CASCADE_EVENTS);
  assert.equal(trajectoryAB.at(-1)?.step, 36);
  assert.equal(trajectoryAB.at(-1)?.margin, -3);
});

test("current action inputs contain additive deltas but no scheduling semantics", () => {
  const currentActionInput: Parameters<typeof resolveActionDrivenState>[1] = [
    "increase_service_frequency",
  ];

  assert.deepEqual(currentActionInput, ["increase_service_frequency"]);

  for (const [actionId, effects] of Object.entries(ACTION_EFFECTS)) {
    assert.equal(typeof actionId, "string");
    assert.ok(actionId.length > 0);
    assert.ok(Object.keys(effects).length > 0);
    assert.ok(Object.values(effects).every((delta) => typeof delta === "number"));
    assert.equal("step" in effects, false);
    assert.equal("month" in effects, false);
    assert.equal("date" in effects, false);
    assert.equal("delay" in effects, false);
    assert.equal("duration" in effects, false);
    assert.equal("activation" in effects, false);
  }
});
