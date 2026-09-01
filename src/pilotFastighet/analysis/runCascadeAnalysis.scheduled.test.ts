import test from "node:test";
import assert from "node:assert/strict";

import { ACTION_EFFECTS } from "../actionEffects";
import { buildDriverScoreState } from "../driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "../executiveDemoPlaybackScenario";
import { defaultRiskState } from "../presetRiskMapping";
import {
  runCascadeAnalysis,
  type ScheduledAction,
  type ScheduledCascadeAnalysisInput,
} from "./runCascadeAnalysis";

type ScheduledActionHasDriverDeltas =
  "driverDeltas" extends keyof ScheduledAction ? true : false;
const scheduledActionHasDriverDeltas: ScheduledActionHasDriverDeltas = false;

function action(
  actionId: ScheduledAction["actionId"],
  executionStep: number
): ScheduledAction {
  return { actionId, executionStep };
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

test("canonical action identity is the only public source of scheduled effects", () => {
  assert.equal(scheduledActionHasDriverDeltas, false);
  const result = runCascadeAnalysis(scheduledInput(1, [
    action("reduce_parking_supply", 1),
  ]));

  assert.equal(result.scenarioA.terminalState.driverScores.demandRisk, 2);
  assert.deepEqual(result.executionProvenance, [
    {
      scenario: "scenarioA",
      actionId: "reduce_parking_supply",
      scheduledStep: 1,
      actualExecutionStep: 1,
      appliedDriverDeltas: ACTION_EFFECTS.reduce_parking_supply,
    },
  ]);
});

test("independent runtime driver deltas are explicitly rejected", () => {
  const mismatch = scheduledInput(1, [
    {
      actionId: "reduce_travel_time",
      executionStep: 1,
      driverDeltas: {
        transit_signal_priority: 1,
        accessibility: 0.5,
      },
    } as unknown as ScheduledAction,
  ]);

  assert.throws(() => runCascadeAnalysis(mismatch), /must not supply independent driverDeltas/);
});

test("unsupported canonical actions identify every unsupported driver", () => {
  const rejected = [
    {
      actionId: "congestion_pricing" as const,
      drivers: ["modal_shift_pressure", "political_feasibility"],
    },
    {
      actionId: "stagger_project_starts" as const,
      drivers: ["implementationPacingRisk"],
    },
    {
      actionId: "increase_liquidity_buffer" as const,
      drivers: ["liquidityPressure"],
    },
  ];

  for (const { actionId, drivers } of rejected) {
    assert.throws(
      () => runCascadeAnalysis(scheduledInput(2, [action(actionId, 1)])),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, new RegExp(actionId));
        for (const driver of drivers) assert.match(error.message, new RegExp(driver));
        return true;
      }
    );
  }
});

test("step 1, later, and terminal actions affect exactly their recorded transitions", () => {
  const result = runCascadeAnalysis(scheduledInput(6, [
    action("reduce_parking_supply", 1),
    action("transit_signal_priority", 4),
    action("reduce_travel_time", 6),
  ]));

  assert.equal(result.scenarioA.trajectory[0].driverScores.demandRisk, 2);
  assert.deepEqual(
    result.scenarioA.trajectory.slice(0, 3).map(
      (state) => state.driverScores.transit_signal_priority
    ),
    [1, 1, 1]
  );
  assert.equal(result.scenarioA.trajectory[3].driverScores.transit_signal_priority, 2);
  assert.equal(result.scenarioA.trajectory[4].driverScores.modal_attractiveness, 1);
  assert.equal(result.scenarioA.terminalState.driverScores.modal_attractiveness, 2);
});

test("canonical scheduled effects execute once and persist without reapplication", () => {
  const result = runCascadeAnalysis(scheduledInput(4, [
    action("transit_signal_priority", 2),
  ]));

  assert.deepEqual(
    result.scenarioA.trajectory.map(
      (state) => state.driverScores.transit_signal_priority
    ),
    [1, 2, 2, 2]
  );
  assert.equal(result.executionProvenance.length, 1);
});

test("scenario actions remain independent and baseline is never scheduled", () => {
  const result = runCascadeAnalysis(scheduledInput(
    2,
    [action("reduce_parking_supply", 1)],
    [action("reduce_travel_time", 1)]
  ));

  assert.equal(result.scenarioA.terminalState.driverScores.demandRisk, 2);
  assert.equal(result.scenarioA.terminalState.driverScores.modal_attractiveness, 1);
  assert.equal(result.scenarioB.terminalState.driverScores.demandRisk, 1);
  assert.equal(result.scenarioB.terminalState.driverScores.modal_attractiveness, 2);
  assert.deepEqual(result.baseline.terminalState.driverScores, buildDriverScoreState(defaultRiskState));
});

test("same-step canonical actions combine atomically and remain input-order invariant", () => {
  const electrify = action("electrify_bus_fleet", 1);
  const retrofit = action("energy_retrofit_program", 1);

  const forward = runCascadeAnalysis(scheduledInput(4, [electrify, retrofit]));
  const reversed = runCascadeAnalysis(scheduledInput(4, [retrofit, electrify]));

  assert.deepEqual(forward, reversed);
  assert.equal(forward.scenarioA.trajectory[0].driverScores.energyExposureRisk, 0);
  assert.equal(
    forward.scenarioA.trajectory[0].driverScores.operationalEfficiencyRisk,
    1.5
  );
  assert.equal(
    forward.scenarioA.trajectory[0].driverScores.capitalCommitmentRigidityRisk,
    1.5
  );
});

test("existing mechanics make canonical action timing consequential", () => {
  const stress = action("delay_maintenance", 1);
  const recovery = action("secure_long_term_leases", 4);
  const stressFirst = runCascadeAnalysis(scheduledInput(8, [stress, recovery]));
  const recoveryFirst = runCascadeAnalysis(scheduledInput(8, [
    { ...recovery, executionStep: 1 },
    { ...stress, executionStep: 4 },
  ]));

  assert.notDeepEqual(stressFirst.scenarioA.trajectory, recoveryFirst.scenarioA.trajectory);
  assert.notDeepEqual(
    stressFirst.scenarioA.marginHistory,
    recoveryFirst.scenarioA.marginHistory
  );
});

test("canonical recovery preserves cascades, downstream state, and latched constraints", () => {
  const { riskStateA } = getExecutiveDemoPlaybackRiskStates();
  const input = scheduledInput(6, [action("reduce_leverage", 3)]);
  input.scenarioA = {
    initialRiskState: riskStateA,
    initialDriverScores: buildDriverScoreState(riskStateA),
  };

  const result = runCascadeAnalysis(input);
  const beforeRecovery = result.scenarioA.trajectory[1];
  const afterRecovery = result.scenarioA.trajectory[2];

  assert.equal(beforeRecovery.driverScores.refinancingRisk, 1);
  assert.equal(afterRecovery.driverScores.refinancingRisk, 0);
  assert.equal(afterRecovery.riskState.refinancingRisk, "LOW");
  assert.equal(afterRecovery.riskState.leverageLevelRisk, beforeRecovery.riskState.leverageLevelRisk);
  assert.equal(afterRecovery.riskState.liquidityPressure, beforeRecovery.riskState.liquidityPressure);
  assert.deepEqual(afterRecovery.cascadeEvents, beforeRecovery.cascadeEvents);
  assert.equal(afterRecovery.registry.RefinancingConstraint.lifecycle, "ACTIVE");
  assert.equal(
    afterRecovery.registry.RefinancingConstraint.activatedAtStep,
    beforeRecovery.registry.RefinancingConstraint.activatedAtStep
  );
});

test("invalid scheduled input is rejected before any analysis result exists", () => {
  const invalidInputs: unknown[] = [
    scheduledInput(4, [action("reduce_parking_supply", 0)]),
    scheduledInput(4, [action("reduce_parking_supply", 5)]),
    scheduledInput(4, [action("reduce_parking_supply", 1.5)]),
    scheduledInput(4, [{ actionId: "unknown", executionStep: 1 }] as never),
    scheduledInput(4, [null] as never),
    scheduledInput(4, [{ actionId: "reduce_parking_supply", executionStep: "1" }] as never),
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
  const scenarioAActions = [action("reduce_parking_supply", 2)];
  const input = scheduledInput(5, scenarioAActions);
  const snapshot = structuredClone(input);

  const first = runCascadeAnalysis(input);
  const second = runCascadeAnalysis(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, snapshot);
});

test("provenance records complete canonical effects after atomic application", () => {
  const result = runCascadeAnalysis(scheduledInput(3, [
    action("secure_long_term_leases", 2),
    action("delay_maintenance", 2),
  ]));

  assert.deepEqual(result.executionProvenance, [
    {
      scenario: "scenarioA",
      actionId: "delay_maintenance",
      scheduledStep: 2,
      actualExecutionStep: 2,
      appliedDriverDeltas: ACTION_EFFECTS.delay_maintenance,
    },
    {
      scenario: "scenarioA",
      actionId: "secure_long_term_leases",
      scheduledStep: 2,
      actualExecutionStep: 2,
      appliedDriverDeltas: ACTION_EFFECTS.secure_long_term_leases,
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
