import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialConstraintRegistry } from "../../constraintState";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { EngineState } from "../../RealEstateEngine";
import type {
  ReactAnalysisBoundaryResult,
  ScenarioExecutionProvenance,
  ScenarioSchedules,
} from "../reactScheduledAnalysisBoundary";
import type { ScheduledActionExecution, ScheduledAnalyticalResults } from "../runCascadeAnalysis";
import { buildDecisionSpaceSnapshots } from "./buildDecisionSpaceSnapshots";
import { prepareStructuralObservationRun, type PreparedStructuralObservationRun } from "./prepareStructuralObservationRun";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const horizon = 3;
const schedules: ScenarioSchedules = {
  A: [
    { actionId: "reduce_travel_time", executionStep: 1 },
    { actionId: "increase_service_frequency", executionStep: 2 },
  ],
  B: [{ actionId: "expand_cycling_infrastructure", executionStep: 2 }],
};
const contract = {
  version: "structural-observation-v1",
  initiatives: [
    {
      id: "a-prior",
      actionKey: "reduce_travel_time",
      prerequisites: [],
      resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 3 }],
    },
    {
      id: "a-current",
      actionKey: "increase_service_frequency",
      prerequisites: [{ initiativeId: "unbound", type: "finish-to-start" }],
      resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 1 }],
    },
    {
      id: "b-current",
      actionKey: "expand_cycling_infrastructure",
      prerequisites: [],
      resourceClaims: [],
    },
    {
      id: "unbound",
      actionKey: "transit_signal_priority",
      prerequisites: [],
      resourceClaims: [],
    },
  ],
  resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
  scenarioBindings: [
    { scenario: "A", initiativeId: "a-prior" },
    { scenario: "A", initiativeId: "a-current" },
    { scenario: "B", initiativeId: "b-current" },
  ],
} as const;

function state(step: number, margin: number): EngineState {
  return { step, margin, registry: createInitialConstraintRegistry(), riskState: {}, driverScores: {}, cascadeEvents: [] };
}

function execution(
  scenario: "scenarioA" | "scenarioB",
  actionId: ScheduledActionExecution["actionId"],
  scheduledStep: number,
  actualExecutionStep = scheduledStep
): ScheduledActionExecution {
  return { scenario, actionId, scheduledStep, actualExecutionStep, appliedDriverDeltas: {} };
}

function boundary(provenance: ScenarioExecutionProvenance = {
  A: [execution("scenarioA", "reduce_travel_time", 1), execution("scenarioA", "increase_service_frequency", 2)],
  B: [execution("scenarioB", "expand_cycling_infrastructure", 2)],
}): ReactAnalysisBoundaryResult {
  const makeScenario = (offset: number) => {
    const trajectory = [state(1, offset + 1), state(2, offset + 2), state(3, offset + 3)];
    return {
      trajectory,
      get marginHistory() { return trajectory.map(({ margin }) => margin); },
      get constraintHistory() { return trajectory.map(({ registry }) => registry); },
      get cascadeHistory() { return trajectory.at(-1)?.cascadeEvents ?? []; },
      get terminalState() { return trajectory.at(-1)!; },
    };
  };
  const analysis: ScheduledAnalyticalResults = {
    scenarioA: makeScenario(10),
    scenarioB: makeScenario(20),
    baseline: makeScenario(30),
    comparison: { marginDifferenceByStep: [10, 10, 10], firstDivergenceIndex: 0, terminalMarginDifference: 10 },
    executionProvenance: [...provenance.A, ...provenance.B],
  };
  return {
    analysis,
    provenance,
    executionProfile: {
      domainId: profile.domainId,
      profileId: profile.profileId,
      modelVersion: profile.modelVersion,
      calibrationVersion: profile.calibrationVersion,
    },
  };
}

function prepared(provenance?: ScenarioExecutionProvenance) {
  return prepareStructuralObservationRun({ contract, profile, schedules, horizon, analysisResult: boundary(provenance) });
}

function initiative(result: ReturnType<typeof buildDecisionSpaceSnapshots>, scenario: "A" | "B", frame: number, id: string) {
  return result.scenarios[scenario][frame].initiatives.find(({ initiativeId }) => initiativeId === id)!;
}

test("builds one canonical ordered snapshot timeline containing every initiative", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  assert.equal(result.version, "structural-observation-v1");
  assert.equal(result.scenarios.A.length, horizon * 2);
  assert.equal(result.scenarios.B.length, horizon * 2);
  assert.deepEqual(result.scenarios.A.map(({ period, phase }) => [period, phase]), [
    [1, "before-execution"], [1, "after-transition"], [2, "before-execution"],
    [2, "after-transition"], [3, "before-execution"], [3, "after-transition"],
  ]);
  for (const snapshot of [...result.scenarios.A, ...result.scenarios.B]) {
    assert.deepEqual(snapshot.initiatives.map(({ initiativeId }) => initiativeId), ["a-current", "a-prior", "b-current", "unbound"]);
  }
});

test("planning statuses are disjoint for unbound, future, current, and past initiatives", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  assert.equal(initiative(result, "A", 0, "unbound").planningStatus, "not-planned");
  assert.equal(initiative(result, "A", 0, "a-current").planningStatus, "scheduled-future");
  assert.equal(initiative(result, "A", 0, "a-prior").planningStatus, "scheduled-current");
  assert.equal(initiative(result, "A", 2, "a-prior").planningStatus, "scheduled-past");
});

test("current assessments are shared across phases and preserved historically without reevaluation", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  const before = initiative(result, "A", 2, "a-current");
  const after = initiative(result, "A", 3, "a-current");
  const later = initiative(result, "A", 4, "a-current");
  assert.equal(before.structuralStatus, "would-be-blocked");
  assert.equal(after.structuralStatus, "would-be-blocked");
  assert.equal(later.structuralStatus, "not-evaluated");
  assert.deepEqual(after.startAssessment, before.startAssessment);
  assert.deepEqual(later.startAssessment, before.startAssessment);
  assert.equal(initiative(result, "A", 0, "a-current").startAssessment, null);
  assert.equal(initiative(result, "A", 0, "unbound").startAssessment, null);
});

test("phase-safe execution creates and preserves executed-despite-structural-block", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  const before = initiative(result, "A", 2, "a-current");
  const after = initiative(result, "A", 3, "a-current");
  const later = initiative(result, "A", 5, "a-current");
  assert.equal(before.visibleActualExecutionPeriod, null);
  assert.equal(before.executionStatus, "not-executed");
  assert.equal(after.visibleActualExecutionPeriod, 2);
  assert.equal(after.executionStatus, "executed-despite-structural-block");
  assert.equal(later.executionStatus, "executed-despite-structural-block");
  assert.equal(initiative(result, "B", 3, "b-current").executionStatus, "executed");
});

test("future evidence never leaks and A/B assessment histories remain isolated", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  assert.equal(initiative(result, "A", 0, "a-current").visibleActualExecutionPeriod, null);
  assert.equal(initiative(result, "A", 1, "a-current").visibleActualExecutionPeriod, null);
  assert.equal(initiative(result, "B", 1, "b-current").visibleActualExecutionPeriod, null);
  assert.equal(initiative(result, "B", 3, "b-current").visibleActualExecutionPeriod, 2);
  assert.equal(initiative(result, "B", 3, "a-current").startAssessment, null);
});

test("unresolved prerequisites are current-only and exclude resource reasons", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  const current = initiative(result, "A", 2, "a-current");
  assert.deepEqual(current.unresolvedPrerequisiteIds, ["unbound"]);
  assert.deepEqual(initiative(result, "A", 3, "a-current").unresolvedPrerequisiteIds, ["unbound"]);
  assert.deepEqual(initiative(result, "A", 4, "a-current").unresolvedPrerequisiteIds, []);
  assert.equal(current.startAssessment?.blockingReasons.some(({ code }) => code === "resource-overallocated"), true);
});

test("resource pressure is phase-stable while claims attach only to contributors", () => {
  const result = buildDecisionSpaceSnapshots(prepared());
  assert.deepEqual(result.scenarios.A[2].resourcePressure, result.scenarios.A[3].resourcePressure);
  assert.equal(initiative(result, "A", 2, "a-prior").activeResourceClaims.length, 1);
  assert.equal(initiative(result, "A", 2, "a-prior").structuralStatus, "not-evaluated");
  assert.equal(initiative(result, "A", 2, "a-current").activeResourceClaims.length, 1);
  assert.deepEqual(initiative(result, "A", 2, "unbound").activeResourceClaims, []);
});

test("uses prepared engine context only and exposes no Decision Space score", () => {
  const source = prepared();
  const result = buildDecisionSpaceSnapshots(source);
  assert.equal(result.scenarios.A[0].engineContext, null);
  assert.deepEqual(result.scenarios.A[1].engineContext, source.frames.A[1].engineContext);
  assert.deepEqual(result.scenarios.A[2].engineContext, source.frames.A[2].engineContext);
  assert.equal(result.scenarios.A[1].engineContext?.structuralMargin, 11);
  assert.equal("decisionSpaceScore" in result.scenarios.A[1], false);
});

test("minimal evidence retains phase safety without reconstructing provenance or deltas", () => {
  const source = prepared();
  const evidence = source.frames.A[3].visibleExecutionEvidence[0];
  assert.deepEqual(Object.keys(evidence).sort(), ["actionKey", "actualExecutionPeriod", "scenario", "scheduledExecutionPeriod"]);
  assert.equal("appliedDriverDeltas" in evidence, false);
  const result = buildDecisionSpaceSnapshots(source);
  assert.equal(initiative(result, "A", 2, "a-current").visibleActualExecutionPeriod, null);
  assert.equal(initiative(result, "A", 3, "a-current").visibleActualExecutionPeriod, 2);
});

test("output is deeply frozen without mutating or additionally freezing prepared input", () => {
  const source = prepared();
  const before = structuredClone(source);
  const frozenBefore = Object.isFrozen(source.frames.A[0]);
  const result = buildDecisionSpaceSnapshots(source);
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(source.frames.A[0]), frozenBefore);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.scenarios.A[0].initiatives[0]), true);
  assert.equal(Object.isFrozen(result.scenarios.A[0].resourcePressure[0].activeClaims), true);
  assert.notEqual(result.scenarios.A[1].engineContext, source.frames.A[1].engineContext);
});

test("rejects malformed preparation frames and unsupported preparation versions", () => {
  const source = structuredClone(prepared()) as PreparedStructuralObservationRun;
  assert.throws(() => buildDecisionSpaceSnapshots({ ...source, preparationVersion: "future" } as unknown as PreparedStructuralObservationRun), /unsupported structural observation preparation version/);
  assert.throws(() => buildDecisionSpaceSnapshots({ ...source, frames: { ...source.frames, A: source.frames.A.slice(1) } } as PreparedStructuralObservationRun), /exactly two frames per period/);
  const frames = [...source.frames.A];
  frames[0] = { ...frames[0], phase: "after-transition" };
  assert.throws(() => buildDecisionSpaceSnapshots({ ...source, frames: { ...source.frames, A: frames } } as PreparedStructuralObservationRun), /inconsistent scenario, period, phase, or plan/);
});

test("rejects unknown, duplicate, or assessment-less visible execution evidence", () => {
  const early: ScenarioExecutionProvenance = {
    A: [execution("scenarioA", "reduce_travel_time", 1), execution("scenarioA", "increase_service_frequency", 2, 1)],
    B: [execution("scenarioB", "expand_cycling_infrastructure", 2)],
  };
  assert.throws(() => buildDecisionSpaceSnapshots(prepared(early)), /has no start assessment/);

  const source = structuredClone(prepared()) as PreparedStructuralObservationRun;
  const frames = [...source.frames.A];
  frames[1] = { ...frames[1], visibleExecutionEvidence: [{ ...frames[1].visibleExecutionEvidence[0], actionKey: "congestion_pricing" }] };
  assert.throws(() => buildDecisionSpaceSnapshots({ ...source, frames: { ...source.frames, A: frames } } as PreparedStructuralObservationRun), /unknown or unbound action/);

  frames[1] = { ...source.frames.A[1], visibleExecutionEvidence: [source.frames.A[1].visibleExecutionEvidence[0], source.frames.A[1].visibleExecutionEvidence[0]] };
  assert.throws(() => buildDecisionSpaceSnapshots({ ...source, frames: { ...source.frames, A: frames } } as PreparedStructuralObservationRun), /multiple visible executions/);
});

test("builder source contains no diagnostics, persistence, UI, engine, or runtime execution", () => {
  const source = readFileSync(new URL("./buildDecisionSpaceSnapshots.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /diagnostics|fingerprint|saved.?run|runCascadeAnalysis\(|runReactAnalysisBoundary\(|new RealEstateEngine|\.stepForward\(/i);
});
