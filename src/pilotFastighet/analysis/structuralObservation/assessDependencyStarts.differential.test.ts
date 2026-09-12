import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { assessDependencyStartsForPeriod } from "./assessDependencyStarts";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";

function definition(id: string, actionKey: ActionKey, prerequisites: string[] = []) {
  return { id: id as InitiativeId, actionKey, prerequisites: prerequisites.map((item) => ({ initiativeId: item as InitiativeId, type: "finish-to-start" as const })), resourceClaims: [] };
}

test("V1 adapter preserves golden dependency output and bound/unbound same-action isolation", () => {
  const bound = definition("bound", "reduce_travel_time");
  const unbound = definition("unbound", "reduce_travel_time");
  const dependent = definition("dependent", "increase_service_frequency", ["bound"]);
  const scenarioPlan: ResolvedStructuralScenarioPlan = { scenario: "A", initiatives: [
    { initiativeId: bound.id, actionKey: bound.actionKey, scenario: "A", plannedExecutionPeriod: 1 as DisplayedPeriod, bindingStatus: "bound", definition: bound },
    { initiativeId: dependent.id, actionKey: dependent.actionKey, scenario: "A", plannedExecutionPeriod: 3 as DisplayedPeriod, bindingStatus: "bound", definition: dependent },
    { initiativeId: unbound.id, actionKey: unbound.actionKey, scenario: "A", plannedExecutionPeriod: null, bindingStatus: "not-bound", definition: unbound },
  ] };
  const result = assessDependencyStartsForPeriod({ scenarioPlan, period: 3 as DisplayedPeriod, provenance: [{ scenario: "A", actionKey: "reduce_travel_time", scheduledExecutionPeriod: 1 as DisplayedPeriod, actualExecutionPeriod: 1 as DisplayedPeriod }] });
  assert.deepEqual(result, [{ initiativeId: "dependent", scenario: "A", evaluatedAtPeriod: 3, outcome: "eligible", blockingReasons: [] }]);
});

test("V1 adapter and neutral core preserve existing blocker ordering", () => {
  const a = definition("a-planned", "expand_cycling_infrastructure");
  const z = definition("z-unbound", "reduce_travel_time");
  const dependent = definition("dependent", "increase_service_frequency", ["z-unbound", "a-planned"]);
  const scenarioPlan: ResolvedStructuralScenarioPlan = { scenario: "A", initiatives: [
    { initiativeId: z.id, actionKey: z.actionKey, scenario: "A", plannedExecutionPeriod: null, bindingStatus: "not-bound", definition: z },
    { initiativeId: a.id, actionKey: a.actionKey, scenario: "A", plannedExecutionPeriod: 2 as DisplayedPeriod, bindingStatus: "bound", definition: a },
    { initiativeId: dependent.id, actionKey: dependent.actionKey, scenario: "A", plannedExecutionPeriod: 5 as DisplayedPeriod, bindingStatus: "bound", definition: dependent },
  ] };
  assert.deepEqual(assessDependencyStartsForPeriod({ scenarioPlan, period: 5 as DisplayedPeriod, provenance: [] })[0].blockingReasons.map(({ code, prerequisiteInitiativeId }) => `${code}:${prerequisiteInitiativeId}`), ["prerequisite-not-completed-before-start:a-planned", "prerequisite-not-planned:z-unbound"]);
});
