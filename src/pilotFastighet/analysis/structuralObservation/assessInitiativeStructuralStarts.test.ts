import assert from "node:assert/strict";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { assessInitiativeStructuralStartsForPeriod } from "./assessInitiativeStructuralStarts";
import type { DisplayedPeriod } from "./contract";
import { observeInitiativeResourcePressureForPeriod } from "./observeInitiativeResourcePressure";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";
import { resolveInitiativeObservationPlans } from "./resolveInitiativeObservationPlans";
import { prepareInitiativeScheduledAnalysis, runPreparedInitiativeScheduledAnalysis, type InitiativeScheduledAnalysisInputV1 } from "./runInitiativeScheduledAnalysis";

function execute(reverse = false) {
  const definitions = [
    { id: "prerequisite", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 3 }] },
    { id: "same-effect", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 2 }] },
    { id: "dependent", effectDefinitionId: "secure_long_term_leases", prerequisites: [{ initiativeId: "prerequisite", type: "finish-to-start" }], resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 1 }] },
  ];
  const entries = [{ initiativeId: "prerequisite", executionStep: 1 }, { initiativeId: "same-effect", executionStep: 2 }, { initiativeId: "dependent", executionStep: 3 }];
  const raw: InitiativeScheduledAnalysisInputV1 = { version: "initiative-scheduled-analysis-input-v1", executionMode: "initiative-schedule-v1", domainId: "realEstate", profileId: "legacy-real-estate-v1", horizon: 4, contract: { version: "structural-observation-v2", initiatives: reverse ? [...definitions].reverse() : definitions, resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }] }, schedules: { version: "initiative-schedule-v1", comparisonPolicy: "same-initiative-set", A: reverse ? [...entries].reverse() : entries, B: reverse ? [...entries].reverse() : entries }, initialState: { initialRiskState: structuredClone(defaultRiskState), initialDriverScores: buildDriverScoreState(defaultRiskState) } } as InitiativeScheduledAnalysisInputV1;
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(raw);
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const prepared = prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
  return { prepared, plans: resolveInitiativeObservationPlans(prepared) };
}

test("V2 resource wrapper keeps equal-effect contributors separate and historical contributors non-blocked", () => {
  const { prepared, plans } = execute();
  const pressureM2 = observeInitiativeResourcePressureForPeriod({ prepared, scenarioPlan: plans.A, period: 2 as DisplayedPeriod })[0];
  assert.deepEqual(pressureM2.contributingInitiativeIds, ["prerequisite", "same-effect"]);
  assert.deepEqual(pressureM2.startingInitiativeIds, ["same-effect"]);
  assert.deepEqual(pressureM2.wouldBlockStartingInitiativeIds, ["same-effect"]);
});

test("V2 combined wrapper merges dependency and resource reasons for current starters only", () => {
  const { prepared, plans } = execute();
  const beforeM3 = prepared.scenarios.A.frames[4];
  const result = assessInitiativeStructuralStartsForPeriod({ prepared, scenarioPlan: plans.A, period: 3 as DisplayedPeriod, visibleExecutionEvidence: [] });
  assert.deepEqual(result.map(({ initiativeId }) => initiativeId), ["dependent"]);
  assert.deepEqual(result[0].blockingReasons.map(({ code }) => code), ["prerequisite-not-completed-before-start", "resource-overallocated"]);
  const eligibleDependency = assessInitiativeStructuralStartsForPeriod({ prepared, scenarioPlan: plans.A, period: 3 as DisplayedPeriod, visibleExecutionEvidence: beforeM3.visibleExecutionEvidence });
  assert.deepEqual(eligibleDependency[0].blockingReasons.map(({ code }) => code), ["resource-overallocated"]);
});

test("V2 resource and combined results are A/B-isolated, deterministic, detached, and frozen", () => {
  const first = execute(false);
  const second = execute(true);
  const a = assessInitiativeStructuralStartsForPeriod({ prepared: first.prepared, scenarioPlan: first.plans.A, period: 3 as DisplayedPeriod, visibleExecutionEvidence: first.prepared.scenarios.A.frames[4].visibleExecutionEvidence });
  const reordered = assessInitiativeStructuralStartsForPeriod({ prepared: second.prepared, scenarioPlan: second.plans.A, period: 3 as DisplayedPeriod, visibleExecutionEvidence: [...second.prepared.scenarios.A.frames[4].visibleExecutionEvidence].reverse() });
  assert.deepEqual(a, reordered);
  assert.equal(Object.isFrozen(a), true);
  assert.equal(Object.isFrozen(a[0]), true);
  assert.equal(Object.isFrozen(first.prepared), true);
  assert.notStrictEqual(observeInitiativeResourcePressureForPeriod({ prepared: first.prepared, scenarioPlan: first.plans.A, period: 2 as DisplayedPeriod }), observeInitiativeResourcePressureForPeriod({ prepared: first.prepared, scenarioPlan: first.plans.B, period: 2 as DisplayedPeriod }));
});
