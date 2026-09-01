import test from "node:test";
import assert from "node:assert/strict";

import { defaultRiskState } from "../presetRiskMapping";
import {
  createEmptyScenarioSchedules,
  runReactAnalysisBoundary,
  type ScenarioSchedules,
} from "./reactScheduledAnalysisBoundary";
import {
  DEFAULT_MANUAL_EXECUTION_MODE,
  formatManualScheduleIssue,
  getManualScheduleIssues,
  getOrderedScenarioSchedule,
  getRevealedExecutionProvenance,
  getScheduledFairComparisonFacts,
  prepareManualScheduledRunSource,
  resolveManualExecutionMode,
  toggleManualScheduledAction,
  updateManualScheduledActionStep,
} from "./manualScheduledExecution";
import {
  createPreconfiguredPlayback,
  getPreconfiguredPlaybackSnapshot,
} from "./preconfiguredPlayback";

test("manual execution mode defaults to configured and executive mode forces configured", () => {
  assert.equal(DEFAULT_MANUAL_EXECUTION_MODE, "configured-start");
  assert.equal(resolveManualExecutionMode("actions-over-time", true), "configured-start");
  assert.equal(resolveManualExecutionMode("actions-over-time", false), "actions-over-time");
});

test("scheduled selection, editing, removal, and scenario isolation remain exact", () => {
  const selectedA = toggleManualScheduledAction(
    createEmptyScenarioSchedules(),
    "A",
    "delay_maintenance"
  );
  assert.deepEqual(selectedA, {
    A: [{ actionId: "delay_maintenance", executionStep: 1 }],
    B: [],
  });
  const selectedBoth = toggleManualScheduledAction(
    selectedA,
    "B",
    "delay_maintenance"
  );
  const editedB = updateManualScheduledActionStep(
    selectedBoth,
    "B",
    "delay_maintenance",
    6,
    36
  );
  assert.deepEqual(editedB.A, selectedA.A);
  assert.deepEqual(editedB.B, [
    { actionId: "delay_maintenance", executionStep: 6 },
  ]);
  assert.equal("driverDeltas" in editedB.B[0], false);
  assert.deepEqual(
    toggleManualScheduledAction(editedB, "A", "delay_maintenance"),
    { A: [], B: editedB.B }
  );
});

test("period mapping uses M1, M6, and M36 as exact execution steps", () => {
  let schedules = toggleManualScheduledAction(
    createEmptyScenarioSchedules(),
    "A",
    "early_refinancing"
  );
  assert.equal(schedules.A[0].executionStep, 1);
  schedules = updateManualScheduledActionStep(
    schedules,
    "A",
    "early_refinancing",
    6,
    36
  );
  assert.equal(schedules.A[0].executionStep, 6);
  schedules = updateManualScheduledActionStep(
    schedules,
    "A",
    "early_refinancing",
    36,
    36
  );
  assert.equal(schedules.A[0].executionStep, 36);
});

test("horizon validation blocks without mutating schedules and identifies the invalid entry", () => {
  const schedules = {
    A: [],
    B: [{ actionId: "early_refinancing", executionStep: 36 }],
  } as const satisfies ScenarioSchedules;
  const snapshot = structuredClone(schedules);
  const issues = getManualScheduleIssues(schedules, 12);
  assert.deepEqual(schedules, snapshot);
  assert.equal(issues.length, 1);
  assert.equal(
    formatManualScheduleIssue(issues[0], "Early refinancing", "en"),
    "Scenario B: Early refinancing is set to M36, outside the analysis horizon M12."
  );
});

test("schedule summary ordering is deterministic by execution step then action identity", () => {
  const schedules = {
    A: [
      { actionId: "secure_long_term_leases", executionStep: 6 },
      { actionId: "early_refinancing", executionStep: 2 },
      { actionId: "delay_maintenance", executionStep: 2 },
    ],
    B: [],
  } as const satisfies ScenarioSchedules;
  assert.deepEqual(
    getOrderedScenarioSchedule(schedules, "A").map(
      ({ actionId, executionStep }) => `${actionId}:M${executionStep}`
    ),
    ["delay_maintenance:M2", "early_refinancing:M2", "secure_long_term_leases:M6"]
  );
});

test("clean scheduled reruns never use terminal state and preserve exact provenance", () => {
  const schedules = {
    A: [{ actionId: "delay_maintenance", executionStep: 2 }],
    B: [{ actionId: "early_refinancing", executionStep: 3 }],
  } as const satisfies ScenarioSchedules;
  const source = prepareManualScheduledRunSource({
    baseRiskStateA: defaultRiskState,
    baseRiskStateB: defaultRiskState,
    baselineRiskState: defaultRiskState,
  });
  const run = () =>
    runReactAnalysisBoundary({
      executionMode: "actions-over-time",
      horizon: 6,
      runSource: source,
      schedules,
    });
  const first = run();
  const stoppedPrefix = getPreconfiguredPlaybackSnapshot(
    createPreconfiguredPlayback(first.analysis, 6),
    3
  );
  const rerun = run();
  assert.deepEqual(rerun, first);
  assert.notDeepEqual(stoppedPrefix.currentStateA, source.scenarioA.initialRiskState);
  assert.deepEqual(first.provenance.A.map((entry) => entry.actualExecutionStep), [2]);
  assert.deepEqual(first.provenance.B.map((entry) => entry.actualExecutionStep), [3]);
  assert.equal(source.scenarioA.initialDriverScores?.maintenanceIntensityRisk, 1);
  assert.equal(first.analysis.scenarioA.trajectory[0].driverScores.maintenanceIntensityRisk, 1);
  assert.equal(first.analysis.scenarioA.trajectory[1].driverScores.maintenanceIntensityRisk, 2);
});

test("revealed provenance includes only actually executed independent scenario records", () => {
  const provenance = {
    A: [
      { scenario: "scenarioA", actionId: "delay_maintenance", scheduledStep: 2, actualExecutionStep: 2, appliedDriverDeltas: {} },
      { scenario: "scenarioA", actionId: "early_refinancing", scheduledStep: 6, actualExecutionStep: 6, appliedDriverDeltas: {} },
    ],
    B: [
      { scenario: "scenarioB", actionId: "secure_long_term_leases", scheduledStep: 3, actualExecutionStep: 3, appliedDriverDeltas: {} },
    ],
  } as const;
  const revealed = getRevealedExecutionProvenance(provenance, 3);
  assert.deepEqual(revealed.A.map((entry) => entry.actionId), ["delay_maintenance"]);
  assert.deepEqual(revealed.B.map((entry) => entry.actionId), ["secure_long_term_leases"]);
  assert.equal(JSON.stringify(revealed).includes("early_refinancing"), false);
});

test("fair-comparison predicates identify timing-only differences without prose inference", () => {
  const facts = getScheduledFairComparisonFacts({
    initialStateA: defaultRiskState,
    initialStateB: structuredClone(defaultRiskState),
    schedules: {
      A: [{ actionId: "delay_maintenance", executionStep: 2 }],
      B: [{ actionId: "delay_maintenance", executionStep: 5 }],
    },
  });
  assert.deepEqual(facts, {
    identicalInitialStates: true,
    identicalActionSets: true,
    timingOrOrderOnlyDifference: true,
  });
});
