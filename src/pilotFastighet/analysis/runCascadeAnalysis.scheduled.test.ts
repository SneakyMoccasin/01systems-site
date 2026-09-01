import test from "node:test";
import assert from "node:assert/strict";

import { buildDriverScoreState } from "../driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "../executiveDemoPlaybackScenario";
import { defaultRiskState } from "../presetRiskMapping";
import {
  runCascadeAnalysis,
  type ScheduledAction,
  type ScheduledCascadeAnalysisInput,
} from "./runCascadeAnalysis";

function action(
  actionId: ScheduledAction["actionId"],
  executionStep: number,
  driverDeltas: ScheduledAction["driverDeltas"]
): ScheduledAction {
  return { actionId, executionStep, driverDeltas };
}

function scheduledInput(
  horizon: number,
  scenarioAActions: readonly ScheduledAction[] = [],
  scenarioBActions: readonly ScheduledAction[] = []
): ScheduledCascadeAnalysisInput {
  return {
    executionMode: "scheduled",
    horizon,
    scenarioA: { initialRiskState: defaultRiskState },
    scenarioB: { initialRiskState: defaultRiskState },
    scenarioAActions,
    scenarioBActions,
  };
}

test("step 1, later, and terminal actions affect exactly their recorded transitions", () => {
  const result = runCascadeAnalysis(scheduledInput(6, [
    action("reduce_parking_supply", 1, { demandRisk: 0.5 }),
    action("transit_signal_priority", 4, { transit_signal_priority: 0.5 }),
    action("reduce_travel_time", 6, { modal_attractiveness: 0.5 }),
  ]));

  assert.equal(result.scenarioA.trajectory[0].driverScores.demandRisk, 1.5);
  assert.deepEqual(
    result.scenarioA.trajectory.slice(0, 3).map(
      (state) => state.driverScores.transit_signal_priority
    ),
    [1, 1, 1]
  );
  assert.equal(result.scenarioA.trajectory[3].driverScores.transit_signal_priority, 1.5);
  assert.equal(result.scenarioA.trajectory[4].driverScores.modal_attractiveness, 1);
  assert.equal(result.scenarioA.terminalState.driverScores.modal_attractiveness, 1.5);
});

test("scheduled deltas execute once and persist without later reapplication", () => {
  const result = runCascadeAnalysis(scheduledInput(4, [
    action("transit_signal_priority", 2, { transit_signal_priority: 0.5 }),
  ]));

  assert.deepEqual(
    result.scenarioA.trajectory.map(
      (state) => state.driverScores.transit_signal_priority
    ),
    [1, 1.5, 1.5, 1.5]
  );
  assert.equal(result.executionProvenance.length, 1);
});

test("scenario actions remain independent and baseline is never scheduled", () => {
  const result = runCascadeAnalysis(scheduledInput(
    2,
    [action("reduce_parking_supply", 1, { demandRisk: 1 })],
    [action("reduce_travel_time", 1, { modal_attractiveness: 1 })]
  ));

  assert.equal(result.scenarioA.terminalState.driverScores.demandRisk, 2);
  assert.equal(result.scenarioA.terminalState.driverScores.modal_attractiveness, 1);
  assert.equal(result.scenarioB.terminalState.driverScores.demandRisk, 1);
  assert.equal(result.scenarioB.terminalState.driverScores.modal_attractiveness, 2);
  assert.deepEqual(result.baseline.terminalState.driverScores, buildDriverScoreState(defaultRiskState));
});

test("same-step actions are combined atomically and input-order invariant", () => {
  const first = action("reduce_travel_time", 1, {
    transit_signal_priority: 1,
    accessibility: 0.5,
  });
  const second = action("transit_signal_priority", 1, {
    transit_signal_priority: -0.5,
    accessibility: 0.5,
  });

  const forward = runCascadeAnalysis(scheduledInput(6, [first, second]));
  const reversed = runCascadeAnalysis(scheduledInput(6, [second, first]));

  assert.deepEqual(forward, reversed);
  assert.equal(forward.scenarioA.trajectory[0].driverScores.transit_signal_priority, 1.5);
  assert.equal(forward.scenarioA.trajectory[0].driverScores.accessibility, 2);
});

test("existing mechanics make the same actions timing-sensitive", () => {
  const stress = action("delay_maintenance", 1, {
    maintenanceIntensityRisk: 1,
    tenantStabilityRisk: 0.5,
  });
  const recovery = action("secure_long_term_leases", 4, {
    tenantStabilityRisk: -1,
    demandRisk: -1,
  });
  const stressFirst = runCascadeAnalysis(scheduledInput(8, [stress, recovery]));
  const recoveryFirst = runCascadeAnalysis(scheduledInput(8, [
    { ...recovery, executionStep: 1 },
    { ...stress, executionStep: 4 },
  ]));

  assert.notDeepEqual(
    stressFirst.scenarioA.trajectory,
    recoveryFirst.scenarioA.trajectory
  );
  assert.notDeepEqual(
    stressFirst.scenarioA.marginHistory,
    recoveryFirst.scenarioA.marginHistory
  );
});

test("later recovery preserves cascades, downstream state, and latched constraints", () => {
  const { riskStateA } = getExecutiveDemoPlaybackRiskStates();
  const input = scheduledInput(6, [
    action("reduce_leverage", 4, {
      interestRateExposureRisk: -2,
      refinancingRisk: -1,
    }),
  ]);
  input.scenarioA = {
    initialRiskState: riskStateA,
    initialDriverScores: buildDriverScoreState(riskStateA),
  };

  const result = runCascadeAnalysis(input);
  const beforeRecovery = result.scenarioA.trajectory[2];
  const afterRecovery = result.scenarioA.trajectory[3];

  assert.equal(beforeRecovery.driverScores.interestRateExposureRisk, 2);
  assert.equal(afterRecovery.driverScores.interestRateExposureRisk, 1);
  assert.equal(afterRecovery.riskState.interestRateExposureRisk, "MODERATE");
  assert.equal(afterRecovery.riskState.leverageLevelRisk, beforeRecovery.riskState.leverageLevelRisk);
  assert.equal(afterRecovery.riskState.liquidityPressure, beforeRecovery.riskState.liquidityPressure);
  assert.deepEqual(afterRecovery.cascadeEvents, beforeRecovery.cascadeEvents);
  assert.equal(
    afterRecovery.registry.RefinancingConstraint.lifecycle,
    "ACTIVE"
  );
  assert.equal(
    afterRecovery.registry.RefinancingConstraint.activatedAtStep,
    beforeRecovery.registry.RefinancingConstraint.activatedAtStep
  );
});

test("invalid scheduled input is rejected before any analysis result exists", () => {
  const invalidInputs: unknown[] = [
    scheduledInput(4, [action("reduce_parking_supply", 0, { demandRisk: 1 })]),
    scheduledInput(4, [action("reduce_parking_supply", 5, { demandRisk: 1 })]),
    scheduledInput(4, [action("reduce_parking_supply", 1.5, { demandRisk: 1 })]),
    scheduledInput(4, [action("reduce_parking_supply", 1, { unknown: 1 } as never)]),
    scheduledInput(4, [action("reduce_parking_supply", 1, { demandRisk: Number.NaN })]),
    scheduledInput(4, [action("reduce_parking_supply", 1, { demandRisk: Infinity })]),
    scheduledInput(4, [{ actionId: "unknown", executionStep: 1, driverDeltas: { demandRisk: 1 } }] as never),
    scheduledInput(4, [{ actionId: "reduce_parking_supply", executionStep: 1, driverDeltas: { demandRisk: "1" } }] as never),
    scheduledInput(4, [null] as never),
    scheduledInput(4, [{ actionId: "reduce_parking_supply", executionStep: "1", driverDeltas: { demandRisk: 1 } }] as never),
    scheduledInput(4, [{ actionId: "reduce_parking_supply", executionStep: 1, driverDeltas: null }] as never),
    { ...scheduledInput(4), scenarioAActions: null },
    {
      horizon: 4,
      scenarioA: { initialRiskState: defaultRiskState },
      scenarioB: { initialRiskState: defaultRiskState },
      scenarioAActions: [],
    },
  ];

  for (const input of invalidInputs) {
    assert.throws(() => runCascadeAnalysis(input as ScheduledCascadeAnalysisInput));
  }
});

test("scheduled execution is deterministic and does not mutate caller input", () => {
  const scenarioAActions = [
    action("reduce_parking_supply", 2, { demandRisk: 0.5 }),
  ];
  const input = scheduledInput(5, scenarioAActions);
  const snapshot = structuredClone(input);

  const first = runCascadeAnalysis(input);
  const second = runCascadeAnalysis(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, snapshot);
});

test("provenance records individual actions after atomic same-step application", () => {
  const result = runCascadeAnalysis(scheduledInput(3, [
    action("secure_long_term_leases", 2, { demandRisk: -1 }),
    action("delay_maintenance", 2, { maintenanceIntensityRisk: 1 }),
  ]));

  assert.deepEqual(result.executionProvenance, [
    {
      scenario: "scenarioA",
      actionId: "delay_maintenance",
      scheduledStep: 2,
      actualExecutionStep: 2,
      appliedDriverDeltas: { maintenanceIntensityRisk: 1 },
    },
    {
      scenario: "scenarioA",
      actionId: "secure_long_term_leases",
      scheduledStep: 2,
      actualExecutionStep: 2,
      appliedDriverDeltas: { demandRisk: -1 },
    },
  ]);
});

test("preconfigured calls expose no scheduled provenance", () => {
  const result = runCascadeAnalysis({
    executionMode: "preconfigured",
    horizon: 2,
    scenarioA: { initialRiskState: defaultRiskState },
    scenarioB: { initialRiskState: defaultRiskState },
  });

  assert.equal("executionProvenance" in result, false);
});
