import assert from "node:assert/strict";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import {
  buildInitiativeDecisionSpaceSnapshots,
  type StructuralObservationResultV2,
} from "./buildInitiativeDecisionSpaceSnapshots";
import type { DisplayedPeriod } from "./contract";
import type { PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
} from "./runInitiativeScheduledAnalysis";

function rawInput(reverse = false): InitiativeScheduledAnalysisInputV1 {
  const definitions = [
    { id: "foundation", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 3 }] },
    { id: "same-effect", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 2 }] },
    { id: "dependent", effectDefinitionId: "secure_long_term_leases", prerequisites: [{ initiativeId: "foundation", type: "finish-to-start" as const }], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 1 }] },
    { id: "eligible", effectDefinitionId: "reduce_leverage", prerequisites: [], resourceClaims: [] },
    { id: "unbound", effectDefinitionId: "delay_maintenance", prerequisites: [], resourceClaims: [] },
  ];
  const A = [
    { initiativeId: "foundation", executionStep: 1 },
    { initiativeId: "same-effect", executionStep: 2 },
    { initiativeId: "dependent", executionStep: 2 },
    { initiativeId: "eligible", executionStep: 3 },
  ];
  const B = [
    { initiativeId: "foundation", executionStep: 2 },
    { initiativeId: "same-effect", executionStep: 1 },
    { initiativeId: "dependent", executionStep: 2 },
    { initiativeId: "eligible", executionStep: 4 },
  ];
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon: 4,
    contract: {
      version: "structural-observation-v2",
      initiatives: reverse ? [...definitions].reverse() : definitions,
      resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: reverse ? [...A].reverse() : A,
      B: reverse ? [...B].reverse() : B,
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  } as InitiativeScheduledAnalysisInputV1;
}

function execute(reverse = false) {
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(rawInput(reverse));
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const prepared = prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
  return { prepared, result: buildInitiativeDecisionSpaceSnapshots(prepared) };
}

function snapshot(
  result: StructuralObservationResultV2,
  scenario: "A" | "B",
  period: number,
  phase: "before-execution" | "after-transition"
) {
  const found = result.scenarios[scenario].find(
    (candidate) => candidate.period === period && candidate.phase === phase
  );
  assert.ok(found);
  return found;
}

function initiative(
  result: StructuralObservationResultV2,
  scenario: "A" | "B",
  period: number,
  phase: "before-execution" | "after-transition",
  id: string
) {
  const found = snapshot(result, scenario, period, phase).initiatives.find(
    (candidate) => candidate.initiativeId === id
  );
  assert.ok(found);
  return found;
}

test("builds canonical horizon-times-two V2 timelines containing every definition", () => {
  const { result } = execute();
  assert.equal(result.version, "structural-observation-v2");
  for (const scenario of ["A", "B"] as const) {
    assert.equal(result.scenarios[scenario].length, result.horizon * 2);
    assert.deepEqual(
      result.scenarios[scenario].map(({ period, phase }) => `${period}:${phase}`),
      Array.from({ length: result.horizon }, (_, index) => [
        `${index + 1}:before-execution`,
        `${index + 1}:after-transition`,
      ]).flat()
    );
    assert.deepEqual(result.scenarios[scenario][0].initiatives.map(({ initiativeId }) => initiativeId), [
      "dependent", "eligible", "foundation", "same-effect", "unbound",
    ]);
    assert.equal(Array.isArray(result.scenarios[scenario][0].diagnostics), true);
    assert.equal("decisionSpaceScore" in result.scenarios[scenario][0], false);
  }
});

test("represents not-planned, future, current, and past without fabricating unbound state", () => {
  const { result } = execute();
  assert.equal(initiative(result, "A", 1, "before-execution", "unbound").planningStatus, "not-planned");
  assert.deepEqual(initiative(result, "A", 1, "before-execution", "unbound"), {
    initiativeId: "unbound",
    effectDefinitionId: "delay_maintenance",
    plannedExecutionPeriod: null,
    visibleActualExecutionPeriod: null,
    planningStatus: "not-planned",
    structuralStatus: "not-evaluated",
    executionStatus: "not-executed",
    startAssessment: null,
    activeResourceClaims: [],
    unresolvedPrerequisiteIds: [],
  });
  assert.equal(initiative(result, "A", 1, "before-execution", "eligible").planningStatus, "scheduled-future");
  assert.equal(initiative(result, "A", 3, "before-execution", "eligible").planningStatus, "scheduled-current");
  assert.equal(initiative(result, "A", 4, "after-transition", "eligible").planningStatus, "scheduled-past");
});

test("assesses current starters once, reuses the assessment, and preserves history", () => {
  const { result } = execute();
  const before = initiative(result, "A", 3, "before-execution", "eligible");
  const after = initiative(result, "A", 3, "after-transition", "eligible");
  const later = initiative(result, "A", 4, "after-transition", "eligible");
  assert.equal(before.structuralStatus, "eligible");
  assert.strictEqual(after.startAssessment, before.startAssessment);
  assert.equal(after.structuralStatus, "eligible");
  assert.deepEqual(later.startAssessment, before.startAssessment);
  assert.equal(later.structuralStatus, "not-evaluated");
  assert.equal(initiative(result, "A", 2, "before-execution", "eligible").startAssessment, null);
});

test("combines dependency and resource blocking without leaking resource IDs into prerequisites", () => {
  const { result } = execute();
  const bDependent = initiative(result, "B", 2, "before-execution", "dependent");
  assert.equal(bDependent.structuralStatus, "would-be-blocked");
  assert.deepEqual(bDependent.startAssessment?.blockingReasons.map(({ code }) => code), [
    "prerequisite-not-completed-before-start",
    "resource-overallocated",
  ]);
  assert.deepEqual(bDependent.unresolvedPrerequisiteIds, ["foundation"]);
  const pressure = snapshot(result, "B", 2, "before-execution").resourcePressure[0];
  assert.deepEqual(pressure.contributingInitiativeIds, ["dependent", "foundation", "same-effect"]);
  assert.deepEqual(pressure.startingInitiativeIds, ["dependent", "foundation"]);
  assert.deepEqual(pressure.wouldBlockStartingInitiativeIds, ["dependent", "foundation"]);
  assert.strictEqual(
    snapshot(result, "B", 2, "before-execution").resourcePressure,
    snapshot(result, "B", 2, "after-transition").resourcePressure
  );
});

test("uses phase-safe InitiativeId evidence and preserves executed-despite-block", () => {
  const { result } = execute();
  const before = initiative(result, "B", 2, "before-execution", "dependent");
  const after = initiative(result, "B", 2, "after-transition", "dependent");
  const later = initiative(result, "B", 4, "after-transition", "dependent");
  assert.equal(before.visibleActualExecutionPeriod, null);
  assert.equal(before.executionStatus, "not-executed");
  assert.equal(after.visibleActualExecutionPeriod, 2);
  assert.equal(after.executionStatus, "executed-despite-structural-block");
  assert.equal(later.executionStatus, "executed-despite-structural-block");
  assert.equal(later.structuralStatus, "not-evaluated");
  const equalEffect = snapshot(result, "A", 2, "after-transition").initiatives
    .filter(({ effectDefinitionId }) => effectDefinitionId === "early_refinancing");
  assert.deepEqual(equalEffect.map(({ initiativeId, visibleActualExecutionPeriod }) => ({ initiativeId, visibleActualExecutionPeriod })), [
    { initiativeId: "foundation", visibleActualExecutionPeriod: 1 },
    { initiativeId: "same-effect", visibleActualExecutionPeriod: 2 },
  ]);
});

test("keeps A/B histories isolated and copies exact prepared engine context", () => {
  const { prepared, result } = execute();
  assert.notDeepEqual(
    initiative(result, "A", 1, "after-transition", "foundation").startAssessment,
    initiative(result, "B", 1, "after-transition", "foundation").startAssessment
  );
  for (const scenario of ["A", "B"] as const) {
    prepared.scenarios[scenario].frames.forEach((frame, index) => {
      assert.deepEqual(result.scenarios[scenario][index].engineContext, frame.engineContext);
      if (frame.engineContext !== null) {
        assert.notStrictEqual(result.scenarios[scenario][index].engineContext, frame.engineContext);
      }
    });
  }
});

test("is reorder-deterministic, detached, recursively frozen, and does not mutate input", () => {
  const first = execute(false);
  const preparedBefore = structuredClone(first.prepared);
  const reordered = execute(true);
  assert.deepEqual(first.result, reordered.result);
  assert.deepEqual(buildInitiativeDecisionSpaceSnapshots(first.prepared), first.result);
  assert.deepEqual(structuredClone(first.prepared), preparedBefore);
  assert.equal(Object.isFrozen(first.result), true);
  assert.equal(Object.isFrozen(first.result.scenarios.A), true);
  assert.equal(Object.isFrozen(first.result.scenarios.A[0].initiatives[0]), true);
  assert.equal(Object.isFrozen(first.result.scenarios.A[0].resourcePressure[0].activeClaims), true);
  assert.notStrictEqual(first.result.scenarios.A[1].engineContext, first.prepared.scenarios.A.frames[1].engineContext);
});

test("rejects malformed preparation frames and evidence", () => {
  const { prepared } = execute();
  const check = (mutate: (value: PreparedInitiativeStructuralObservationRunV2) => void, pattern: RegExp) => {
    const value = structuredClone(prepared) as PreparedInitiativeStructuralObservationRunV2;
    mutate(value);
    assert.throws(() => buildInitiativeDecisionSpaceSnapshots(value), pattern);
  };
  check((value) => { (value as { preparationVersion: string }).preparationVersion = "wrong"; }, /preparation version/);
  check((value) => { (value.scenarios.A.frames as unknown[]).pop(); }, /two frames/);
  check((value) => { (value.scenarios.A.frames[0] as { phase: string }).phase = "after-transition"; }, /ordering/);
  check((value) => { (value.scenarios.A.frames[1].visibleExecutionEvidence[0] as { scenario: string }).scenario = "B"; }, /across scenarios/);
  check((value) => { (value.scenarios.A.frames[1].visibleExecutionEvidence[0] as { initiativeId: string }).initiativeId = "unbound"; }, /not-bound/);
  check((value) => { (value.scenarios.A.frames[1].visibleExecutionEvidence[0] as { effectDefinitionId: string }).effectDefinitionId = "wrong"; }, /effect definition/);
  check((value) => { (value.scenarios.A.frames[1].visibleExecutionEvidence[0] as { scheduledExecutionPeriod: DisplayedPeriod }).scheduledExecutionPeriod = 2 as DisplayedPeriod; }, /scheduled period/);
  check((value) => {
    const evidence = value.scenarios.A.frames[1].visibleExecutionEvidence as unknown as unknown[];
    evidence.push(structuredClone(evidence[0]));
  }, /duplicate visible/);
  check((value) => { (value.scenarios.A.frames[0].visibleExecutionEvidence as unknown[]).push(structuredClone(value.scenarios.A.frames[1].visibleExecutionEvidence[0])); }, /future execution/);
});
