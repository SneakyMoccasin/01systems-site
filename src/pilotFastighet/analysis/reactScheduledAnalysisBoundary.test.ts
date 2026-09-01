import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ACTION_EFFECTS } from "../actionEffects";
import { buildDriverScoreState } from "../driverScoreState";
import { defaultRiskState } from "../presetRiskMapping";
import {
  addScheduledAction,
  assertValidScenarioSchedules,
  clearAllScenarioSchedules,
  clearScenarioSchedule,
  createCleanRunSourceSnapshot,
  createEmptyScenarioSchedules,
  editScheduledActionStep,
  getScenarioScheduleValidationIssues,
  getScheduledActionSupport,
  prepareScheduledFacadeInput,
  removeScheduledAction,
  replaceScenarioSchedule,
  runReactAnalysisBoundary,
  ScenarioScheduleValidationError,
  type ScenarioSchedules,
} from "./reactScheduledAnalysisBoundary";

const HORIZON = 6;

function cleanSource() {
  return createCleanRunSourceSnapshot({
    scenarioA: {
      baseRiskState: defaultRiskState,
      baseDriverScores: buildDriverScoreState(defaultRiskState),
    },
    scenarioB: {
      baseRiskState: defaultRiskState,
      baseDriverScores: buildDriverScoreState(defaultRiskState),
    },
    baseline: { baseRiskState: defaultRiskState },
  });
}

test("Scenario A and B add, edit, and remove operations remain isolated", () => {
  const empty = createEmptyScenarioSchedules();
  const withA = addScheduledAction(
    empty,
    "A",
    { actionId: "delay_maintenance", executionStep: 2 },
    HORIZON
  );
  assert.deepEqual(empty, { A: [], B: [] });
  assert.deepEqual(withA.B, []);

  const withB = addScheduledAction(
    withA,
    "B",
    { actionId: "delay_maintenance", executionStep: 4 },
    HORIZON
  );
  const editedA = editScheduledActionStep(
    withB,
    "A",
    "delay_maintenance",
    3,
    HORIZON
  );
  assert.deepEqual(editedA.B, withB.B);

  const editedB = editScheduledActionStep(
    editedA,
    "B",
    "delay_maintenance",
    5,
    HORIZON
  );
  assert.deepEqual(editedB.A, editedA.A);
  assert.deepEqual(removeScheduledAction(editedB, "A", "delay_maintenance").B, editedB.B);
  assert.deepEqual(removeScheduledAction(editedB, "B", "delay_maintenance").A, editedB.A);
});

test("duplicate canonical actions fail explicitly within one scenario", () => {
  const once = addScheduledAction(
    createEmptyScenarioSchedules(),
    "A",
    { actionId: "early_refinancing", executionStep: 1 },
    HORIZON
  );
  assert.throws(
    () =>
      addScheduledAction(
        once,
        "A",
        { actionId: "early_refinancing", executionStep: 2 },
        HORIZON
      ),
    (error: unknown) =>
      error instanceof ScenarioScheduleValidationError &&
      error.issues[0]?.scenario === "A" &&
      error.issues[0]?.actionId === "early_refinancing" &&
      error.issues[0]?.reason === "duplicate-action"
  );
  assert.doesNotThrow(() =>
    addScheduledAction(
      once,
      "B",
      { actionId: "early_refinancing", executionStep: 2 },
      HORIZON
    )
  );
});

test("validation identifies scenario, action, step, and horizon for invalid entries", () => {
  const malformed = {
    A: [
      { actionId: "delay_maintenance", executionStep: 0 },
      { actionId: "early_refinancing", executionStep: 7 },
      { actionId: "phase_project_starts", executionStep: 1.5 },
      { actionId: "congestion_pricing", executionStep: 2 },
      { actionId: "unknown", executionStep: 2 },
      null,
    ],
    B: [],
  };
  const issues = getScenarioScheduleValidationIssues(malformed, HORIZON);
  assert.ok(
    issues.some(
      (issue) =>
        issue.scenario === "A" &&
        issue.actionId === "delay_maintenance" &&
        issue.executionStep === 0 &&
        issue.horizon === HORIZON &&
        issue.reason === "step-outside-horizon"
    )
  );
  assert.ok(issues.some((issue) => issue.actionId === "early_refinancing"));
  assert.ok(issues.some((issue) => issue.reason === "non-integer-step"));
  assert.ok(issues.some((issue) => issue.reason === "unsupported-action"));
  assert.ok(issues.some((issue) => issue.reason === "unknown-action"));
  assert.ok(issues.some((issue) => issue.reason === "malformed-action"));
  assert.throws(() => assertValidScenarioSchedules(malformed, HORIZON));
});

test("horizon reduction reports stale entries without clamping, deleting, or moving them", () => {
  const schedules = addScheduledAction(
    createEmptyScenarioSchedules(),
    "B",
    { actionId: "secure_long_term_leases", executionStep: 6 },
    6
  );
  const snapshot = structuredClone(schedules);
  const issues = getScenarioScheduleValidationIssues(schedules, 5);
  assert.deepEqual(schedules, snapshot);
  assert.deepEqual(issues, [
    {
      scenario: "B",
      actionId: "secure_long_term_leases",
      executionStep: 6,
      horizon: 5,
      reason: "step-outside-horizon",
    },
  ]);
});

test("clear and replacement operations are atomic and immutable", () => {
  const original = addScheduledAction(
    addScheduledAction(
      createEmptyScenarioSchedules(),
      "A",
      { actionId: "delay_maintenance", executionStep: 1 },
      HORIZON
    ),
    "B",
    { actionId: "early_refinancing", executionStep: 2 },
    HORIZON
  );
  const snapshot = structuredClone(original);
  const replacement = [{ actionId: "phase_project_starts", executionStep: 4 }] as const;
  const replaced = replaceScenarioSchedule(original, "A", replacement, HORIZON);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(replaced.A, replacement);
  assert.deepEqual(replaced.B, original.B);
  assert.deepEqual(clearScenarioSchedule(original, "A"), { A: [], B: original.B });
  assert.deepEqual(clearAllScenarioSchedules(), { A: [], B: [] });
});

test("supported inventory is derived from canonical effects and modeled drivers", () => {
  const inventory = getScheduledActionSupport();
  assert.deepEqual(inventory.rejected, [
    "congestion_pricing",
    "increase_liquidity_buffer",
    "stagger_project_starts",
  ]);
  assert.equal(
    inventory.supported.length + inventory.rejected.length,
    Object.keys(ACTION_EFFECTS).length
  );
  for (const actionId of Object.keys(ACTION_EFFECTS)) {
    assert.equal(
      inventory.supported.includes(actionId as never) ||
        inventory.rejected.includes(actionId as never),
      true
    );
  }
});

test("clean run-source snapshots clone precise configured inputs and remain immutable", () => {
  const riskState = structuredClone(defaultRiskState);
  const scores = buildDriverScoreState(riskState);
  scores.tenantStabilityRisk = 0.5;
  const source = createCleanRunSourceSnapshot({
    scenarioA: { baseRiskState: riskState, baseDriverScores: scores },
    scenarioB: { baseRiskState: riskState, baseDriverScores: scores },
    baseline: { baseRiskState: riskState },
  });
  riskState.tenantStabilityRisk = "SEVERE";
  scores.tenantStabilityRisk = 3;
  assert.equal(source.scenarioA.initialRiskState.tenantStabilityRisk, "MODERATE");
  assert.equal(source.scenarioA.initialDriverScores?.tenantStabilityRisk, 0.5);
  assert.equal(Object.isFrozen(source), true);
  assert.equal(Object.isFrozen(source.scenarioA.initialRiskState), true);
  assert.equal(Object.isFrozen(source.scenarioA.initialDriverScores), true);
});

test("scheduled facade input contains only canonical identity and execution step", () => {
  const schedules = {
    A: [{ actionId: "delay_maintenance", executionStep: 1 }],
    B: [{ actionId: "early_refinancing", executionStep: 4 }],
  } as const satisfies ScenarioSchedules;
  const prepared = prepareScheduledFacadeInput({
    horizon: HORIZON,
    runSource: cleanSource(),
    schedules,
  });
  assert.equal(prepared.executionMode, "scheduled");
  assert.equal(prepared.horizon, HORIZON);
  assert.deepEqual(prepared.scenarioAActions, schedules.A);
  assert.deepEqual(prepared.scenarioBActions, schedules.B);
  assert.equal("driverDeltas" in prepared.scenarioAActions[0], false);
  assert.equal("driverDeltas" in prepared.scenarioBActions[0], false);
  assert.deepEqual(prepared.scenarioA.initialRiskState, defaultRiskState);
  assert.deepEqual(prepared.baseline?.initialRiskState, defaultRiskState);
});

test("step-1 scheduled action is absent from the clean initial state and applied exactly once", () => {
  const schedules = addScheduledAction(
    createEmptyScenarioSchedules(),
    "A",
    { actionId: "delay_maintenance", executionStep: 1 },
    HORIZON
  );
  const runSource = cleanSource();
  assert.equal(runSource.scenarioA.initialDriverScores?.maintenanceIntensityRisk, 1);
  assert.equal(runSource.scenarioA.initialDriverScores?.tenantStabilityRisk, 1);

  const result = runReactAnalysisBoundary({
    executionMode: "actions-over-time",
    horizon: HORIZON,
    runSource,
    schedules,
  });
  assert.equal(result.analysis.scenarioA.trajectory[0].driverScores.maintenanceIntensityRisk, 2);
  assert.equal(result.analysis.scenarioA.trajectory[0].driverScores.tenantStabilityRisk, 1.5);
  assert.equal(result.provenance.A.length, 1);
  assert.equal(result.provenance.B.length, 0);
});

test("scheduled provenance remains exact and separated by scenario", () => {
  const schedules = {
    A: [{ actionId: "delay_maintenance", executionStep: 2 }],
    B: [{ actionId: "early_refinancing", executionStep: 3 }],
  } as const satisfies ScenarioSchedules;
  const result = runReactAnalysisBoundary({
    executionMode: "actions-over-time",
    horizon: HORIZON,
    runSource: cleanSource(),
    schedules,
  });
  assert.deepEqual(result.provenance.A, [
    {
      scenario: "scenarioA",
      actionId: "delay_maintenance",
      scheduledStep: 2,
      actualExecutionStep: 2,
      appliedDriverDeltas: ACTION_EFFECTS.delay_maintenance,
    },
  ]);
  assert.deepEqual(result.provenance.B, [
    {
      scenario: "scenarioB",
      actionId: "early_refinancing",
      scheduledStep: 3,
      actualExecutionStep: 3,
      appliedDriverDeltas: ACTION_EFFECTS.early_refinancing,
    },
  ]);
});

test("configured-start boundary preserves facade output and exposes no provenance", () => {
  const runSource = cleanSource();
  const result = runReactAnalysisBoundary({
    executionMode: "configured-start",
    horizon: HORIZON,
    runSource,
  });
  assert.equal(result.analysis.scenarioA.trajectory.length, HORIZON);
  assert.deepEqual(result.provenance, { A: [], B: [] });
  assert.equal("executionProvenance" in result.analysis, false);
});

test("Gate 5A adds no public schedule control or scheduled consumer wiring", () => {
  const pageSource = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  const actionPanelSource = readFileSync(
    "app/pilot-fastighet/components/ActionPanel.tsx",
    "utf8"
  );
  const interpretationSource = readFileSync(
    "app/pilot-fastighet/components/AIInterpretationPanel.tsx",
    "utf8"
  );
  assert.match(pageSource, /executionMode:\s*["']configured-start["']/);
  assert.doesNotMatch(pageSource, /actions-over-time|ScheduledAction|executionProvenance/);
  assert.doesNotMatch(actionPanelSource, /executionStep|scheduledStep/);
  assert.doesNotMatch(interpretationSource, /executionProvenance|scheduledStep/);
});
