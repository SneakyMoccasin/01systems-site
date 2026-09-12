import assert from "node:assert/strict";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { assessInitiativeDependencyStartsForFrame, assessInitiativeDependencyStartsForPeriod } from "./assessInitiativeDependencyStarts";
import type { DisplayedPeriod } from "./contract";
import { prepareInitiativeStructuralObservationRun, type PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";
import { prepareInitiativeScheduledAnalysis, runPreparedInitiativeScheduledAnalysis, type InitiativeScheduledAnalysisInputV1 } from "./runInitiativeScheduledAnalysis";
import { resolveInitiativeObservationPlans, toObservationScenarioPlanV2 } from "./resolveInitiativeObservationPlans";

function rawInput(reverse = false): InitiativeScheduledAnalysisInputV1 {
  const definitions = [
    { id: "prerequisite", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [] },
    { id: "same-effect", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [] },
    { id: "dependent", effectDefinitionId: "secure_long_term_leases", prerequisites: [{ initiativeId: "prerequisite", type: "finish-to-start" }], resourceClaims: [] },
    { id: "unbound", effectDefinitionId: "reduce_leverage", prerequisites: [], resourceClaims: [] },
  ] as const;
  const A = [{ initiativeId: "prerequisite", executionStep: 1 }, { initiativeId: "same-effect", executionStep: 2 }, { initiativeId: "dependent", executionStep: 3 }];
  const B = [{ initiativeId: "dependent", executionStep: 3 }, { initiativeId: "same-effect", executionStep: 2 }, { initiativeId: "prerequisite", executionStep: 1 }];
  return { version: "initiative-scheduled-analysis-input-v1", executionMode: "initiative-schedule-v1", domainId: "realEstate", profileId: "legacy-real-estate-v1", horizon: 4, contract: { version: "structural-observation-v2", initiatives: reverse ? [...definitions].reverse() : definitions, resources: [] }, schedules: { version: "initiative-schedule-v1", comparisonPolicy: "same-initiative-set", A: reverse ? [...A].reverse() : A, B: reverse ? [...B].reverse() : B }, initialState: { initialRiskState: structuredClone(defaultRiskState), initialDriverScores: buildDriverScoreState(defaultRiskState) } };
}

function endToEnd(reverse = false) {
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(rawInput(reverse));
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const preparedObservation = prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
  return { preparedObservation, plans: resolveInitiativeObservationPlans(preparedObservation) };
}

test("V2 observation plans include every definition and preserve exact bound periods", () => {
  const { preparedObservation, plans } = endToEnd();
  for (const scenario of ["A", "B"] as const) {
    assert.deepEqual(plans[scenario].initiatives.map(({ initiativeId }) => initiativeId), ["dependent", "prerequisite", "same-effect", "unbound"]);
    assert.equal(plans[scenario].initiatives.find(({ initiativeId }) => initiativeId === "dependent")?.plannedExecutionPeriod, 3);
    assert.deepEqual(plans[scenario].initiatives.find(({ initiativeId }) => initiativeId === "unbound"), {
      initiativeId: "unbound", effectDefinitionId: "reduce_leverage", scenario, bindingStatus: "not-bound", plannedExecutionPeriod: null,
      definition: preparedObservation.contract.initiatives.find(({ id }) => id === "unbound"),
    });
  }
  assert.equal(Object.isFrozen(plans.A.initiatives), true);
  assert.notStrictEqual(plans.A.initiatives[0].definition, preparedObservation.contract.initiatives[2]);
});

test("V2 dependency assessment uses InitiativeId and keeps equal effects separate", () => {
  const { preparedObservation, plans } = endToEnd();
  const beforeM3 = preparedObservation.scenarios.A.frames[4];
  const result = assessInitiativeDependencyStartsForFrame({ scenarioPlan: plans.A, frame: beforeM3 });
  assert.deepEqual(result, [{ initiativeId: "dependent", scenario: "A", evaluatedAtPeriod: 3, outcome: "eligible", blockingReasons: [] }]);
  const sameEffectEvidence = beforeM3.visibleExecutionEvidence.filter(({ effectDefinitionId }) => effectDefinitionId === "early_refinancing");
  assert.deepEqual(sameEffectEvidence.map(({ initiativeId }) => initiativeId), ["prerequisite", "same-effect"]);
});

test("V2 preserves same-period, future, unbound, and multiple-prerequisite semantics", () => {
  const { plans } = endToEnd();
  const dependent = plans.A.initiatives.find(({ initiativeId }) => initiativeId === "dependent");
  assert.ok(dependent);
  const evidence = (actualExecutionPeriod: number) => [{ scenario: "A" as const, initiativeId: "prerequisite", effectDefinitionId: "early_refinancing", scheduledExecutionPeriod: 1 as DisplayedPeriod, actualExecutionPeriod: actualExecutionPeriod as DisplayedPeriod }];
  for (const actual of [3, 4]) {
    const result = assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, visibleExecutionEvidence: evidence(actual) as never });
    assert.equal(result[0].outcome, "would-be-blocked");
    assert.equal(result[0].blockingReasons[0].code, "prerequisite-not-completed-before-start");
  }
  const modified = structuredClone(plans.A);
  const mutableDependent = modified.initiatives.find(({ initiativeId }) => initiativeId === "dependent") as unknown as { definition: { prerequisites: unknown[] } };
  mutableDependent.definition.prerequisites.push({ initiativeId: "unbound", type: "finish-to-start" });
  const result = assessInitiativeDependencyStartsForPeriod({ scenarioPlan: modified as never, period: 3 as DisplayedPeriod, visibleExecutionEvidence: [] });
  assert.deepEqual(result[0].blockingReasons.map(({ code }) => code), ["prerequisite-not-completed-before-start", "prerequisite-not-planned"]);
});

test("V2 only assesses current starters and isolates A/B evidence", () => {
  const { preparedObservation, plans } = endToEnd();
  assert.deepEqual(assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, visibleExecutionEvidence: [] }), []);
  assert.throws(() => assessInitiativeDependencyStartsForFrame({ scenarioPlan: plans.B, frame: preparedObservation.scenarios.A.frames[4] }), /frame and scenario plan disagree/);
  assert.throws(() => assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.B, period: 3 as DisplayedPeriod, visibleExecutionEvidence: preparedObservation.scenarios.A.frames[4].visibleExecutionEvidence }), /scenario B contains evidence for scenario A/);
});

test("V2 plan and assessment are deterministic, detached, and recursively frozen", () => {
  const first = endToEnd(false);
  const second = endToEnd(true);
  assert.deepEqual(first.plans, second.plans);
  const firstResult = assessInitiativeDependencyStartsForFrame({ scenarioPlan: first.plans.A, frame: first.preparedObservation.scenarios.A.frames[4] });
  const secondResult = assessInitiativeDependencyStartsForFrame({ scenarioPlan: second.plans.A, frame: second.preparedObservation.scenarios.A.frames[4] });
  assert.deepEqual(firstResult, secondResult);
  assert.equal(Object.isFrozen(firstResult), true);
  assert.equal(Object.isFrozen(firstResult[0]), true);
});

test("V2 adapters reject identity, membership, planned-period, and bound-set contradictions", () => {
  const { preparedObservation, plans } = endToEnd();
  const baseEvidence = preparedObservation.scenarios.A.frames[1].visibleExecutionEvidence[0];
  assert.throws(() => assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 1 as DisplayedPeriod, visibleExecutionEvidence: [{ ...baseEvidence, initiativeId: "unknown" as never }] }), /does not match its scenario-plan definition/);
  assert.throws(() => assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 1 as DisplayedPeriod, visibleExecutionEvidence: [{ ...baseEvidence, effectDefinitionId: "reduce_leverage" as never }] }), /does not match/);
  assert.throws(() => assessInitiativeDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 1 as DisplayedPeriod, visibleExecutionEvidence: [{ ...baseEvidence, scheduledExecutionPeriod: 2 as DisplayedPeriod }] }), /planned period/);
  const conflicting = structuredClone(preparedObservation);
  (conflicting.resolvedSchedules.B as unknown as unknown[]).pop();
  assert.throws(() => resolveInitiativeObservationPlans(conflicting as PreparedInitiativeStructuralObservationRunV2), /bound initiative sets differ/);
});

test("neutral V2 core projection contains no executable effect identity", () => {
  const { plans } = endToEnd();
  const neutral = toObservationScenarioPlanV2(plans.A);
  assert.doesNotMatch(JSON.stringify(neutral), /effectDefinitionId|actionKey|driverDeltas|label/);
});
