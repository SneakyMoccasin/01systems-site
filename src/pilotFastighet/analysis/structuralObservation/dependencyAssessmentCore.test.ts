import assert from "node:assert/strict";
import test from "node:test";
import { assessDependencyStartsCore } from "./dependencyAssessmentCore";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { ObservationExecutionEvidence, ObservationPlannedInitiative, ObservationScenarioPlan } from "./observationPlanCore";

const id = (value: string) => value as InitiativeId;
const period = (value: number) => value as DisplayedPeriod;
function initiative(value: string, planned: number | null, prerequisites: string[] = []): ObservationPlannedInitiative {
  return { initiativeId: id(value), scenario: "A", bindingStatus: planned === null ? "not-bound" : "bound", plannedExecutionPeriod: planned === null ? null : period(planned), definition: { initiativeId: id(value), prerequisites: prerequisites.map((item) => ({ initiativeId: id(item), type: "finish-to-start" })), resourceClaims: [] } };
}
function plan(initiatives: readonly ObservationPlannedInitiative[]): ObservationScenarioPlan { return { scenario: "A", initiatives }; }
function evidence(value: string, scheduled: number, actual: number): ObservationExecutionEvidence { return { scenario: "A", initiativeId: id(value), scheduledExecutionPeriod: period(scheduled), actualExecutionPeriod: period(actual) }; }

test("neutral core assesses only current starters and requires strictly earlier execution", () => {
  const scenarioPlan = plan([initiative("prerequisite", 2), initiative("dependent", 4, ["prerequisite"]), initiative("future", 6)]);
  assert.equal(assessDependencyStartsCore({ scenarioPlan, period: period(4), visibleExecutionEvidence: [evidence("prerequisite", 2, 2)] })[0].outcome, "eligible");
  for (const actual of [4, 6]) {
    const result = assessDependencyStartsCore({ scenarioPlan, period: period(4), visibleExecutionEvidence: [evidence("prerequisite", 2, actual)] });
    assert.equal(result[0].outcome, "would-be-blocked");
    assert.equal(result[0].blockingReasons[0].code, "prerequisite-not-completed-before-start");
  }
  assert.deepEqual(assessDependencyStartsCore({ scenarioPlan, period: period(5), visibleExecutionEvidence: [] }), []);
});

test("neutral core preserves unbound and multiple prerequisite semantics with stable order", () => {
  const scenarioPlan = plan([initiative("z-unbound", null), initiative("a-bound", 2), initiative("dependent", 5, ["z-unbound", "a-bound"])]);
  const result = assessDependencyStartsCore({ scenarioPlan, period: period(5), visibleExecutionEvidence: [] });
  assert.deepEqual(result[0].blockingReasons.map(({ code }) => code), ["prerequisite-not-completed-before-start", "prerequisite-not-planned"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result[0].blockingReasons), true);
});

test("neutral core rejects contradictory plans and evidence", () => {
  const bound = initiative("bound", 2);
  const unbound = initiative("unbound", null);
  const cases: Array<readonly [ObservationScenarioPlan, readonly ObservationExecutionEvidence[], RegExp]> = [
    [plan([bound, bound]), [], /duplicate initiative/],
    [plan([{ ...bound, scenario: "B" }]), [], /contains initiative/],
    [plan([{ ...bound, plannedExecutionPeriod: null }]), [], /bound initiative/],
    [plan([{ ...unbound, plannedExecutionPeriod: period(2) }]), [], /fabricated/],
    [plan([bound]), [evidence("unknown", 2, 2)], /unknown initiative/],
    [plan([unbound]), [evidence("unbound", 2, 2)], /unbound initiative/],
    [plan([bound]), [evidence("bound", 2, 2), evidence("bound", 2, 2)], /duplicate evidence/],
    [plan([bound]), [evidence("bound", 3, 2)], /planned period/],
  ];
  for (const [scenarioPlan, visibleExecutionEvidence, pattern] of cases) {
    assert.throws(() => assessDependencyStartsCore({ scenarioPlan, period: period(2), visibleExecutionEvidence }), pattern);
  }
  assert.throws(() => assessDependencyStartsCore({ scenarioPlan: plan([initiative("dependent", 2, ["missing"])]), period: period(2), visibleExecutionEvidence: [] }), /prerequisite missing/);
});
