import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayedPeriod, InitiativeId, SharedResourceId } from "./contract";
import type { DependencyStartAssessment } from "./dependencyAssessmentCore";
import type { ObservationScenarioPlan } from "./observationPlanCore";
import type { ResourcePressureObservation } from "./resourcePressureCore";
import { combineStructuralStartAssessmentsCore } from "./structuralStartAssessmentCore";

const period = 2 as DisplayedPeriod;
const scenarioPlan: ObservationScenarioPlan = { scenario: "A", initiatives: [{ initiativeId: "starter" as InitiativeId, scenario: "A", bindingStatus: "bound", plannedExecutionPeriod: period, definition: { initiativeId: "starter" as InitiativeId, prerequisites: [], resourceClaims: [] } }] };
const dependency: DependencyStartAssessment = { initiativeId: "starter" as InitiativeId, scenario: "A", evaluatedAtPeriod: period, outcome: "would-be-blocked", blockingReasons: [{ code: "prerequisite-not-planned", prerequisiteInitiativeId: "z" as InitiativeId }, { code: "prerequisite-not-completed-before-start", prerequisiteInitiativeId: "a" as InitiativeId, prerequisitePlannedPeriod: 1 as DisplayedPeriod, priorActualExecutionPeriod: null }] };
const pressure: ResourcePressureObservation = { resourceId: "team" as SharedResourceId, period, capacity: 1, totalClaimed: 2, remainingCapacity: -1, overallocatedBy: 1, overallocated: true, activeClaims: [], contributingInitiativeIds: ["starter" as InitiativeId], startingInitiativeIds: ["starter" as InitiativeId], wouldBlockStartingInitiativeIds: ["starter" as InitiativeId] };

test("combined core adds resource reasons in canonical order without recalculation", () => {
  const result = combineStructuralStartAssessmentsCore({ scenarioPlan, period, dependencyAssessments: [dependency], resourcePressure: [pressure] });
  assert.deepEqual(result[0].blockingReasons.map(({ code }) => code), ["prerequisite-not-planned", "prerequisite-not-completed-before-start", "resource-overallocated"]);
  assert.equal(result[0].outcome, "would-be-blocked");
  assert.equal(Object.isFrozen(result[0].blockingReasons), true);
});

test("combined core rejects missing, duplicate, and non-current assessments or reasons", () => {
  assert.throws(() => combineStructuralStartAssessmentsCore({ scenarioPlan, period, dependencyAssessments: [], resourcePressure: [] }), /cover every current starter/);
  assert.throws(() => combineStructuralStartAssessmentsCore({ scenarioPlan, period, dependencyAssessments: [dependency, dependency], resourcePressure: [] }), /cover every current starter/);
  assert.throws(() => combineStructuralStartAssessmentsCore({ scenarioPlan, period, dependencyAssessments: [dependency], resourcePressure: [{ ...pressure, wouldBlockStartingInitiativeIds: ["other" as InitiativeId] }] }), /non-current/);
  assert.throws(() => combineStructuralStartAssessmentsCore({ scenarioPlan, period, dependencyAssessments: [dependency], resourcePressure: [pressure, pressure] }), /duplicate resource reason/);
});
