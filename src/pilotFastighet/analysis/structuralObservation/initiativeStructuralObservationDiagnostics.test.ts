import assert from "node:assert/strict";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import {
  buildInitiativeDecisionSpaceSnapshots,
  type StructuralObservationResultV2,
} from "./buildInitiativeDecisionSpaceSnapshots";
import {
  selectInitiativeStructuralObservationDiagnostics,
} from "./initiativeStructuralObservationDiagnostics";
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
  ];
  const A = [
    { initiativeId: "foundation", executionStep: 1 },
    { initiativeId: "same-effect", executionStep: 2 },
    { initiativeId: "dependent", executionStep: 2 },
    { initiativeId: "eligible", executionStep: 3 },
  ];
  const B = [
    { initiativeId: "same-effect", executionStep: 1 },
    { initiativeId: "foundation", executionStep: 2 },
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

function prepare(reverse = false) {
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(rawInput(reverse));
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  return prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
}

function snapshot(result: StructuralObservationResultV2, scenario: "A" | "B", period: number, phase: "before-execution" | "after-transition") {
  const value = result.scenarios[scenario].find((entry) => entry.period === period && entry.phase === phase);
  assert.ok(value);
  return value;
}

test("stores blocking and resource diagnostics only in the before snapshot", () => {
  const result = buildInitiativeDecisionSpaceSnapshots(prepare());
  const before = snapshot(result, "B", 2, "before-execution");
  const after = snapshot(result, "B", 2, "after-transition");
  assert.deepEqual(before.diagnostics.map(({ code }) => code), [
    "would-be-blocked",
    "would-be-blocked",
    "resource-overallocated",
  ]);
  assert.equal(after.diagnostics.some(({ code }) => code === "would-be-blocked" || code === "resource-overallocated"), false);
  const resource = before.diagnostics.find(({ code }) => code === "resource-overallocated");
  assert.ok(resource?.code === "resource-overallocated");
  assert.deepEqual(resource.contributingInitiativeIds, ["dependent", "foundation", "same-effect"]);
  assert.deepEqual(resource.wouldBlockStartingInitiativeIds, ["dependent", "foundation"]);
});

test("after diagnostics use InitiativeId evidence once and keep same-effect instances separate", () => {
  const result = buildInitiativeDecisionSpaceSnapshots(prepare());
  const after = snapshot(result, "B", 2, "after-transition");
  assert.deepEqual(after.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    initiativeId: "initiativeId" in diagnostic ? diagnostic.initiativeId : undefined,
  })), [
    { code: "executed-despite-structural-block", initiativeId: "dependent" },
    { code: "executed-despite-structural-block", initiativeId: "foundation" },
    { code: "prerequisite-executed-same-period", initiativeId: "dependent" },
  ]);
  assert.deepEqual(snapshot(result, "B", 3, "after-transition").diagnostics, []);
  const sameEffectDiagnostics = selectInitiativeStructuralObservationDiagnostics(result)
    .filter((diagnostic) => "effectDefinitionId" in diagnostic && diagnostic.effectDefinitionId === "early_refinancing");
  assert.ok(sameEffectDiagnostics.some((diagnostic) => "initiativeId" in diagnostic && diagnostic.initiativeId === "foundation"));
  assert.ok(sameEffectDiagnostics.some((diagnostic) => "initiativeId" in diagnostic && diagnostic.initiativeId === "same-effect"));
});

test("same-period prerequisite appears only after actual phase-safe prerequisite evidence", () => {
  const result = buildInitiativeDecisionSpaceSnapshots(prepare());
  assert.equal(snapshot(result, "B", 2, "before-execution").diagnostics.some(({ code }) => code === "prerequisite-executed-same-period"), false);
  const diagnostic = snapshot(result, "B", 2, "after-transition").diagnostics.find(({ code }) => code === "prerequisite-executed-same-period");
  assert.deepEqual(diagnostic, {
    code: "prerequisite-executed-same-period",
    scenario: "B",
    period: 2,
    initiativeId: "dependent",
    effectDefinitionId: "secure_long_term_leases",
    prerequisiteInitiativeId: "foundation",
  });
  assert.equal(snapshot(result, "B", 1, "after-transition").diagnostics.some(({ code }) => code === "prerequisite-executed-same-period"), false);
});

test("a current starter without same-period execution gets the V2 missing diagnostic", () => {
  const prepared = structuredClone(prepare()) as PreparedInitiativeStructuralObservationRunV2;
  for (const frame of prepared.scenarios.A.frames) {
    if (frame.period >= 3) {
      (frame.visibleExecutionEvidence as unknown as { initiativeId: string }[]) = frame.visibleExecutionEvidence.filter(({ initiativeId }) => initiativeId !== "eligible") as never;
    }
  }
  const result = buildInitiativeDecisionSpaceSnapshots(prepared);
  const diagnostic = snapshot(result, "A", 3, "after-transition").diagnostics.find(({ code }) => code === "planned-initiative-not-executed");
  assert.ok(diagnostic?.code === "planned-initiative-not-executed");
  assert.equal(diagnostic.initiativeId, "eligible");
  assert.equal(diagnostic.plannedExecutionPeriod, 3);
  assert.equal(JSON.stringify(result).includes("planned-action-not-executed"), false);
});

test("historical contributors do not become blocked and A/B diagnostics stay isolated", () => {
  const result = buildInitiativeDecisionSpaceSnapshots(prepare());
  const beforeA2 = snapshot(result, "A", 2, "before-execution");
  const blockedIds = beforeA2.diagnostics
    .filter(({ code }) => code === "would-be-blocked")
    .map((diagnostic) => diagnostic.code === "would-be-blocked" ? String(diagnostic.initiativeId) : "");
  assert.equal(blockedIds.includes("foundation"), false);
  for (const scenario of ["A", "B"] as const) {
    assert.ok(result.scenarios[scenario].flatMap(({ diagnostics }) => diagnostics).every((diagnostic) => diagnostic.scenario === scenario));
  }
});

test("selector is canonical, detached, frozen, and input-order invariant", () => {
  const result = buildInitiativeDecisionSpaceSnapshots(prepare());
  const reordered = buildInitiativeDecisionSpaceSnapshots(prepare(true));
  const selected = selectInitiativeStructuralObservationDiagnostics(result);
  assert.deepEqual(selected, selectInitiativeStructuralObservationDiagnostics(reordered));
  assert.equal(Object.isFrozen(selected), true);
  assert.equal(Object.isFrozen(selected[0]), true);
  assert.notStrictEqual(selected[0], result.scenarios.A.flatMap(({ diagnostics }) => diagnostics)[0]);
  assert.deepEqual(selected.map(({ code }) => code), [...selected.map(({ code }) => code)].sort((left, right) => {
    const order = ["would-be-blocked", "resource-overallocated", "executed-despite-structural-block", "prerequisite-executed-same-period", "planned-initiative-not-executed"];
    return order.indexOf(left) - order.indexOf(right);
  }));
});

test("selector rejects duplicate, misplaced, unknown, and effect-mismatched diagnostics", () => {
  const original = buildInitiativeDecisionSpaceSnapshots(prepare());
  const check = (mutate: (value: StructuralObservationResultV2) => void, pattern: RegExp) => {
    const value = structuredClone(original) as StructuralObservationResultV2;
    mutate(value);
    assert.throws(() => selectInitiativeStructuralObservationDiagnostics(value), pattern);
  };
  check((value) => {
    const diagnostics = value.scenarios.B[2].diagnostics as unknown as unknown[];
    diagnostics.push(structuredClone(diagnostics[0]));
  }, /duplicate persisted diagnostic/);
  check((value) => {
    const diagnostic = value.scenarios.B[3].diagnostics[0] as { scenario: string };
    diagnostic.scenario = "A";
  }, /wrong scenario or period/);
  check((value) => {
    const diagnostic = value.scenarios.B[3].diagnostics[0] as { effectDefinitionId: string };
    diagnostic.effectDefinitionId = "wrong";
  }, /effect mismatch/);
  check((value) => {
    const diagnostic = value.scenarios.B[2].diagnostics[0] as { initiativeId: string };
    diagnostic.initiativeId = "unknown";
  }, /initiative or effect mismatch/);
});

test("diagnostic output is recursively frozen and does not mutate or freeze caller input", () => {
  const prepared = structuredClone(prepare()) as PreparedInitiativeStructuralObservationRunV2;
  const before = structuredClone(prepared);
  const result = buildInitiativeDecisionSpaceSnapshots(prepared);
  assert.deepEqual(prepared, before);
  assert.equal(Object.isFrozen(prepared), false);
  const diagnostic = snapshot(result, "B", 2, "before-execution").diagnostics[0];
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(snapshot(result, "B", 2, "before-execution").diagnostics), true);
  assert.equal(Object.isFrozen(diagnostic), true);
  if (diagnostic.code === "would-be-blocked") assert.equal(Object.isFrozen(diagnostic.blockingReasons[0]), true);
});
