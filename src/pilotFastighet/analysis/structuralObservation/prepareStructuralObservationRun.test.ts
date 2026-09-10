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
import type {
  ScheduledActionExecution,
  ScheduledAnalyticalResults,
} from "../runCascadeAnalysis";
import {
  prepareStructuralObservationRun,
  StructuralObservationPreparationError,
  toExecutionScenarioId,
  toScheduleScenarioId,
} from "./prepareStructuralObservationRun";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const horizon = 3;
const schedules: ScenarioSchedules = {
  A: [
    { actionId: "increase_service_frequency", executionStep: 1 },
    { actionId: "reduce_travel_time", executionStep: 3 },
  ],
  B: [{ actionId: "expand_cycling_infrastructure", executionStep: 2 }],
};
const contract = {
  version: "structural-observation-v1",
  initiatives: [
    { id: "a-early", actionKey: "increase_service_frequency", prerequisites: [], resourceClaims: [] },
    { id: "a-late", actionKey: "reduce_travel_time", prerequisites: [], resourceClaims: [] },
    { id: "b-middle", actionKey: "expand_cycling_infrastructure", prerequisites: [], resourceClaims: [] },
  ],
  resources: [],
  scenarioBindings: [
    { scenario: "A", initiativeId: "a-early" },
    { scenario: "A", initiativeId: "a-late" },
    { scenario: "B", initiativeId: "b-middle" },
  ],
} as const;

function state(step: number, margin = step, active: string[] = []): EngineState {
  const registry = createInitialConstraintRegistry();
  for (const [index, type] of active.entries()) {
    const key = type as keyof typeof registry;
    registry[key] = {
      ...registry[key],
      lifecycle: "ACTIVE",
      activatedAtStep: index,
      lastUpdatedStep: step - 1,
    };
  }
  return { step, margin, registry, riskState: {}, driverScores: {}, cascadeEvents: [] };
}

function execution(
  scenario: "scenarioA" | "scenarioB",
  actionId: ScheduledActionExecution["actionId"],
  period: number
): ScheduledActionExecution {
  return { scenario, actionId, scheduledStep: period, actualExecutionStep: period, appliedDriverDeltas: {} };
}

function boundary(overrides: Partial<ReactAnalysisBoundaryResult> = {}): ReactAnalysisBoundaryResult {
  const provenance: ScenarioExecutionProvenance = {
    A: [execution("scenarioA", "reduce_travel_time", 3), execution("scenarioA", "increase_service_frequency", 1)],
    B: [execution("scenarioB", "expand_cycling_infrastructure", 2)],
  };
  const scenarioA = { trajectory: [state(1, 11), state(2, 12), state(3, 13)] };
  const scenarioB = { trajectory: [state(1, 21), state(2, 22), state(3, 23)] };
  const baseline = { trajectory: [state(1, 31), state(2, 32), state(3, 33)] };
  const enrich = (value: typeof scenarioA) => ({
    ...value,
    get marginHistory() { return value.trajectory.map(({ margin }) => margin); },
    get constraintHistory() { return value.trajectory.map(({ registry }) => registry); },
    get cascadeHistory() { return value.trajectory.at(-1)?.cascadeEvents ?? []; },
    get terminalState() { return value.trajectory.at(-1)!; },
  });
  const analysis: ScheduledAnalyticalResults = {
    scenarioA: enrich(scenarioA),
    scenarioB: enrich(scenarioB),
    baseline: enrich(baseline),
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
    ...overrides,
  };
}

function prepare(input: Partial<Parameters<typeof prepareStructuralObservationRun>[0]> = {}) {
  return prepareStructuralObservationRun({ contract, profile, schedules, horizon, analysisResult: boundary(), ...input });
}

test("prepares exactly two canonical frames per period and scenario", () => {
  const result = prepare();
  assert.equal(result.frames.A.length, 6);
  assert.equal(result.frames.B.length, 6);
  assert.deepEqual(result.frames.A.map(({ scenario, period, phase }) => [scenario, period, phase]), [
    ["A", 1, "before-execution"], ["A", 1, "after-transition"],
    ["A", 2, "before-execution"], ["A", 2, "after-transition"],
    ["A", 3, "before-execution"], ["A", 3, "after-transition"],
  ]);
  assert.equal(result.contract.version, "structural-observation-v1");
  assert.equal(result.scenarioPlans.A.scenario, "A");
});

test("indexes before and after engine context without fabricating M1 initial context", () => {
  const result = prepare();
  assert.equal(result.frames.A[0].engineContext, null);
  assert.deepEqual([result.frames.A[1].engineContext?.engineStateStep, result.frames.A[1].engineContext?.structuralMargin], [1, 11]);
  assert.deepEqual([result.frames.A[2].engineContext?.engineStateStep, result.frames.A[2].engineContext?.structuralMargin], [1, 11]);
  assert.deepEqual([result.frames.A[3].engineContext?.engineStateStep, result.frames.A[3].engineContext?.structuralMargin], [2, 12]);
  assert.equal(result.frames.B[1].engineContext?.structuralMargin, 21);
});

test("phase-safe evidence hides current and future records and keeps prior records", () => {
  const result = prepare();
  const actions = (index: number) => result.frames.A[index].visibleExecutionEvidence.map(({ actionId }) => actionId);
  assert.deepEqual(actions(0), []);
  assert.deepEqual(actions(1), ["increase_service_frequency"]);
  assert.deepEqual(actions(4), ["increase_service_frequency"]);
  assert.deepEqual(actions(5), ["increase_service_frequency", "reduce_travel_time"]);
  assert.deepEqual(result.frames.B[5].visibleExecutionEvidence.map(({ actionId }) => actionId), ["expand_cycling_infrastructure"]);
});

test("scenario mapping is explicit and rejects unknown identities", () => {
  assert.equal(toExecutionScenarioId("A"), "scenarioA");
  assert.equal(toExecutionScenarioId("B"), "scenarioB");
  assert.equal(toScheduleScenarioId("scenarioA"), "A");
  assert.equal(toScheduleScenarioId("scenarioB"), "B");
  assert.throws(() => toExecutionScenarioId("C" as "A"), /unknown scenario/);
  assert.throws(() => toScheduleScenarioId("scenarioC" as "scenarioA"), /unknown execution scenario/);
});

test("rejects invalid horizons and every trajectory length or step mismatch", () => {
  for (const invalid of [0, -1, 1.5]) assert.throws(() => prepare({ horizon: invalid }), /horizon must be a positive integer/);
  for (const key of ["scenarioA", "scenarioB", "baseline"] as const) {
    for (const delta of [-1, 1]) {
      const source = boundary();
      const trajectory = [...source.analysis[key].trajectory];
      if (delta < 0) trajectory.pop(); else trajectory.push(state(4));
      const analysis = { ...source.analysis, [key]: { ...source.analysis[key], trajectory } };
      assert.throws(() => prepare({ analysisResult: { ...source, analysis } }), new RegExp(`${key} trajectory length`));
    }
  }
  const source = boundary();
  const badA = [...source.analysis.scenarioA.trajectory];
  badA[1] = { ...badA[1], step: 9 };
  assert.throws(() => prepare({ analysisResult: { ...source, analysis: { ...source.analysis, scenarioA: { ...source.analysis.scenarioA, trajectory: badA } } } }), /trajectory M2 has step 9/);
});

test("rejects provenance scenario, timing, duplication, and schedule contradictions", () => {
  const cases: Array<[ScheduledActionExecution[], RegExp]> = [
    [[execution("scenarioB", "increase_service_frequency", 1)], /contains provenance for scenarioB/],
    [[{ ...execution("scenarioA", "increase_service_frequency", 1), actualExecutionStep: 4 }], /outside the horizon/],
    [[execution("scenarioA", "increase_service_frequency", 1), execution("scenarioA", "increase_service_frequency", 1)], /duplicate provenance/],
    [[{ ...execution("scenarioA", "increase_service_frequency", 1), scheduledStep: 2 }], /does not match its canonical schedule/],
  ];
  for (const [records, expected] of cases) {
    const source = boundary();
    assert.throws(() => prepare({ analysisResult: { ...source, provenance: { ...source.provenance, A: records } } }), expected);
  }
});

test("rejects split provenance from a different scheduled result", () => {
  const source = boundary();
  assert.throws(
    () => prepare({
      analysisResult: {
        ...source,
        provenance: { ...source.provenance, A: source.provenance.A.slice(1) },
      },
    }),
    /split provenance does not match the scheduled analysis result/
  );
});

test("accepts equal profile identity by value and rejects each identity mismatch", () => {
  assert.doesNotThrow(() => prepare({ profile: { ...profile } }));
  for (const key of ["domainId", "profileId", "modelVersion", "calibrationVersion"] as const) {
    const source = boundary();
    const executionProfile = { ...source.executionProfile, [key]: `different-${key}` } as typeof source.executionProfile;
    assert.throws(() => prepare({ analysisResult: { ...source, executionProfile } }), new RegExp(`execution profile ${key}`));
  }
});

test("requires scheduled analytical result and preserves typed contract validation", () => {
  const source = boundary();
  const analysis = {
    scenarioA: source.analysis.scenarioA,
    scenarioB: source.analysis.scenarioB,
    baseline: source.analysis.baseline,
    comparison: source.analysis.comparison,
  };
  assert.throws(() => prepare({ analysisResult: { ...source, analysis } }), /must come from scheduled execution/);
  assert.throws(
    () => prepare({ contract: { ...contract, version: "future" } }),
    (error) => error instanceof StructuralObservationPreparationError && error.issues.some(({ code }) => code === "unknown-version")
  );
});

test("projects only ACTIVE constraints with separate source and displayed periods in stable order", () => {
  const source = boundary();
  const trajectory = [...source.analysis.scenarioA.trajectory];
  trajectory[0] = state(1, 11, ["RefinancingConstraint", "CovenantConstraint"]);
  trajectory[0].cascadeEvents.push({ source: "x", target: "y", step: 99 } as never);
  const result = prepare({ analysisResult: { ...source, analysis: { ...source.analysis, scenarioA: { ...source.analysis.scenarioA, trajectory } } } });
  const constraints = result.frames.A[1].engineContext?.activeConstraints ?? [];
  assert.deepEqual(constraints.map(({ type }) => type), ["CovenantConstraint", "RefinancingConstraint"]);
  assert.deepEqual(constraints.map(({ activatedAtSourceStep, activatedAtDisplayedPeriod }) => [activatedAtSourceStep, activatedAtDisplayedPeriod]), [[1, 2], [0, 1]]);
  assert.equal(result.frames.A[1].period, 1);
});

test("does not mutate or freeze inputs, leaks no engine/provenance references, and deeply freezes output", () => {
  const analysisResult = boundary();
  const mutableSchedules = structuredClone(schedules);
  const mutableContract = structuredClone(contract);
  const before = structuredClone({ mutableSchedules, mutableContract, analysisResult });
  const result = prepare({ contract: mutableContract, schedules: mutableSchedules, analysisResult });
  assert.deepEqual({ mutableSchedules, mutableContract, analysisResult }, before);
  assert.equal(Object.isFrozen(analysisResult), false);
  assert.equal(Object.isFrozen(analysisResult.analysis.scenarioA.trajectory[0]), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.frames.A[1].visibleExecutionEvidence[0]), true);
  assert.notEqual(result.frames.A[1].engineContext, analysisResult.analysis.scenarioA.trajectory[0]);
  assert.equal("appliedDriverDeltas" in result.frames.A[1].visibleExecutionEvidence[0], false);
});

test("semantically reordered contract, schedules, and provenance produce deep-equal output", () => {
  const first = prepare();
  const source = boundary();
  const reorderedContract = {
    ...contract,
    initiatives: [...contract.initiatives].reverse(),
    scenarioBindings: [...contract.scenarioBindings].reverse(),
  };
  const reorderedSchedules = { A: [...schedules.A].reverse(), B: [...schedules.B].reverse() };
  const reorderedResult = {
    ...source,
    provenance: { A: [...source.provenance.A].reverse(), B: [...source.provenance.B].reverse() },
  };
  assert.deepEqual(prepare({ contract: reorderedContract, schedules: reorderedSchedules, analysisResult: reorderedResult }), first);
});

test("preparation source has no engine or runtime execution dependency", () => {
  const source = readFileSync(new URL("./prepareStructuralObservationRun.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /new RealEstateEngine|runCascadeAnalysis\(|runReactAnalysisBoundary\(|\.stepForward\(/);
  assert.doesNotMatch(source, /appliedDriverDeltas:/);
});
