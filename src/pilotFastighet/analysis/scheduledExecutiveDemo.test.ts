import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { ACTION_EFFECTS } from "../actionEffects";
import { getScheduledFairComparisonFacts, getRevealedExecutionProvenance } from "./manualScheduledExecution";
import {
  runReactAnalysisBoundary,
  type ScenarioExecutionProvenance,
} from "./reactScheduledAnalysisBoundary";
import {
  getScheduledExecutiveDemoRunSource,
  SCHEDULED_EXECUTIVE_DEMO_HORIZON,
  SCHEDULED_EXECUTIVE_DEMO_SCHEDULES,
} from "../scheduledExecutiveDemo";
import {
  buildScheduledExecutionGraphMarkers,
  calculateScheduledExecutiveMetrics,
} from "./scheduledExecutivePresentation";
import {
  getExecutiveDemoGraphFraming,
  getExecutiveDemoHero,
  getExecutiveDemoScenarioComparisonStrip,
} from "../executiveDemoFraming";

const EXPECTED_A = [
  { actionId: "delay_maintenance", executionStep: 1 },
  { actionId: "early_refinancing", executionStep: 9 },
  { actionId: "secure_long_term_leases", executionStep: 18 },
] as const;
const EXPECTED_B = [
  { actionId: "early_refinancing", executionStep: 1 },
  { actionId: "secure_long_term_leases", executionStep: 3 },
  { actionId: "delay_maintenance", executionStep: 18 },
] as const;

function execute() {
  const runSource = getScheduledExecutiveDemoRunSource();
  const result = runReactAnalysisBoundary({
    executionMode: "actions-over-time",
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    runSource,
    schedules: SCHEDULED_EXECUTIVE_DEMO_SCHEDULES,
  });
  return { runSource, result };
}

test("scheduled executive fixture differs only by canonical action timing and order", () => {
  const { runSource } = execute();
  assert.deepEqual(runSource.scenarioA, runSource.scenarioB);
  assert.deepEqual(SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.A, EXPECTED_A);
  assert.deepEqual(SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.B, EXPECTED_B);
  assert.deepEqual(
    [...SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.A.map((entry) => entry.actionId)].sort(),
    [...SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.B.map((entry) => entry.actionId)].sort()
  );
  for (const entry of [...SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.A, ...SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.B]) {
    assert.ok(entry.actionId in ACTION_EFFECTS);
    assert.deepEqual(Object.keys(entry).sort(), ["actionId", "executionStep"]);
  }
  assert.equal(new Set(SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.A.map((entry) => entry.actionId)).size, 3);
  assert.equal(new Set(SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.B.map((entry) => entry.actionId)).size, 3);
  assert.deepEqual(
    getScheduledFairComparisonFacts({
      initialStateA: runSource.scenarioA.initialRiskState,
      initialStateB: runSource.scenarioB.initialRiskState,
      schedules: SCHEDULED_EXECUTIVE_DEMO_SCHEDULES,
    }),
    { identicalInitialStates: true, identicalActionSets: true, timingOrOrderOnlyDifference: true }
  );
});

test("scheduled executive trajectories, provenance, and path metrics are exact", () => {
  const { result } = execute();
  const analysis = result.analysis;
  assert.deepEqual(
    [analysis.scenarioA, analysis.scenarioB, analysis.baseline].map((scenario) =>
      createHash("sha256").update(JSON.stringify(scenario.trajectory)).digest("hex")
    ),
    [
      "8f7834cc667d7f1c7216bf967476afb366a8c6d428f21cb98425babcd59e81cf",
      "28bd52f393138ed2a3994e680e6d22c5ab2255626098304a8b2afcc4b7d58eaa",
      "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af",
    ]
  );
  assert.equal(analysis.scenarioA.trajectory.length, 36);
  assert.equal(analysis.scenarioB.trajectory.length, 36);
  assert.deepEqual(result.provenance.A.map(({ actionId, scheduledStep, actualExecutionStep }) => ({ actionId, scheduledStep, actualExecutionStep })), EXPECTED_A.map(({ actionId, executionStep }) => ({ actionId, scheduledStep: executionStep, actualExecutionStep: executionStep })));
  assert.deepEqual(result.provenance.B.map(({ actionId, scheduledStep, actualExecutionStep }) => ({ actionId, scheduledStep, actualExecutionStep })), EXPECTED_B.map(({ actionId, executionStep }) => ({ actionId, scheduledStep: executionStep, actualExecutionStep: executionStep })));
  const marginsA = analysis.scenarioA.marginHistory;
  const marginsB = analysis.scenarioB.marginHistory;
  assert.deepEqual([marginsA[0], marginsA[2], marginsA[5], marginsA[8], marginsA[11], marginsA[17], marginsA[23], marginsA[35]], [0.1465125164690384, -1.90360732121212, -3, -3, -3, -3, -3, -3]);
  assert.deepEqual([marginsB[0], marginsB[2], marginsB[5], marginsB[8], marginsB[11], marginsB[17], marginsB[23], marginsB[35]], [1.194542569851336, 1.8958752877373437, 3, 3, 3, 2.0061364191692057, -3, -3]);
  const metrics = calculateScheduledExecutiveMetrics({ marginHistoryA: marginsA, marginHistoryB: marginsB, terminalStateA: analysis.scenarioA.terminalState, terminalStateB: analysis.scenarioB.terminalState });
  assert.deepEqual(metrics, { firstDivergencePeriod: 1, maximumMarginSeparation: 6, cumulativeAbsoluteSeparation: 107.22345298061776, firstLowerClampPeriodA: 4, firstLowerClampPeriodB: 24, visibleConstraintPeriodA: 2, visibleConstraintPeriodB: 21, terminalMarginA: -3, terminalMarginB: -3, convergencePeriod: 24 });
  assert.equal(analysis.scenarioA.cascadeHistory.length, 9);
  assert.equal(analysis.scenarioB.cascadeHistory.length, 7);
  assert.equal(analysis.baseline.terminalState.margin, 1);
});

test("execution graph markers come only from revealed facade provenance", () => {
  const { result } = execute();
  const labels = { A: "Adverse first", B: "Mitigation first" };
  const getActionLabel = (actionId: any) => `label:${actionId}`;
  const at = (revealedStep: number) =>
    buildScheduledExecutionGraphMarkers({
      provenance: result.provenance,
      revealedStep,
      language: "en",
      scenarioLabels: labels,
      getActionLabel,
    });

  assert.deepEqual(at(0), []);
  assert.deepEqual(at(1).map(({ scenario, actionId, actualExecutionStep, graphIndex, periodLabel }) => ({ scenario, actionId, actualExecutionStep, graphIndex, periodLabel })), [
    { scenario: "A", actionId: "delay_maintenance", actualExecutionStep: 1, graphIndex: 0, periodLabel: "M1" },
    { scenario: "B", actionId: "early_refinancing", actualExecutionStep: 1, graphIndex: 0, periodLabel: "M1" },
  ]);
  assert.deepEqual(at(3).map((marker) => marker.periodLabel), ["M1", "M1", "M3"]);
  assert.deepEqual(at(9).map((marker) => marker.periodLabel), ["M1", "M1", "M3", "M9"]);
  const complete = at(36);
  assert.equal(complete.length, 6);
  assert.deepEqual(complete.filter((marker) => marker.actualExecutionStep === 18).map(({ scenario, actionId }) => ({ scenario, actionId })), [
    { scenario: "A", actionId: "secure_long_term_leases" },
    { scenario: "B", actionId: "delay_maintenance" },
  ]);
  assert.equal(new Set(complete.map((marker) => `${marker.scenario}:${marker.actionId}`)).size, 6);
  assert.ok(complete.every((marker) => marker.accessibleLabel.includes(`Scenario ${marker.scenario}`) && marker.accessibleLabel.includes(marker.periodLabel)));
  assert.ok(complete.every((marker) => !Object.hasOwn(marker, "appliedDriverDeltas")));
});

test("planned schedules cannot create execution markers and clean reruns are exact", () => {
  const labels = { A: "Adverse first", B: "Mitigation first" };
  const build = (provenance: ScenarioExecutionProvenance, revealedStep: number) =>
    buildScheduledExecutionGraphMarkers({
      provenance,
      revealedStep,
      language: "en",
      scenarioLabels: labels,
      getActionLabel: (actionId) => actionId,
    });
  assert.deepEqual(build({ A: [], B: [] }, 36), []);
  const first = execute().result.provenance;
  const rerun = execute().result.provenance;
  assert.deepEqual(build(first, 0), []);
  assert.deepEqual(build(rerun, 0), []);
  assert.deepEqual(build(first, 36), build(rerun, 36));
});

test("executive provenance reveal never exposes future or cross-scenario actions", () => {
  const { result } = execute();
  assert.deepEqual(getRevealedExecutionProvenance(result.provenance, 0), { A: [], B: [] });
  assert.deepEqual(getRevealedExecutionProvenance(result.provenance, 1).A.map((entry) => entry.actionId), ["delay_maintenance"]);
  assert.deepEqual(getRevealedExecutionProvenance(result.provenance, 1).B.map((entry) => entry.actionId), ["early_refinancing"]);
  assert.deepEqual(getRevealedExecutionProvenance(result.provenance, 3).B.map((entry) => entry.actionId), ["early_refinancing", "secure_long_term_leases"]);
  assert.deepEqual(getRevealedExecutionProvenance(result.provenance, 18).A.map((entry) => entry.actionId), ["delay_maintenance", "early_refinancing", "secure_long_term_leases"]);
});

test("active executive framing is sequence-specific and claim-safe", () => {
  for (const language of ["sv", "en"] as const) {
    const visibleCopy = JSON.stringify({
      hero: getExecutiveDemoHero(language),
      comparison: getExecutiveDemoScenarioComparisonStrip(language),
      graph: getExecutiveDemoGraphFraming(language),
    }).toLowerCase();
    for (const forbidden of [
      "transformation overload",
      "concurrency penalty",
      "permanent avoidance",
      "optimized sequence",
      "preferred sequence",
      "phased execution",
    ]) {
      assert.equal(visibleCopy.includes(forbidden), false, forbidden);
    }
    assert.match(visibleCopy, language === "sv" ? /samma startvillkor/ : /same starting conditions/);
    assert.match(visibleCopy, language === "sv" ? /samma åtgärder/ : /same actions/);
    assert.match(visibleCopy, language === "sv" ? /terminala marginal/ : /terminal margin/);
  }
});
