import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { ScenarioSchedules } from "../reactScheduledAnalysisBoundary";
import type { ValidatedStructuralObservationContractV1 } from "./contract";
import { resolveStructuralScenarioPlans } from "./resolveScenarioPlans";
import { validateAndNormalizeStructuralObservationContract } from "./validation";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");

type TestInitiative = {
  id: string;
  actionKey: "increase_service_frequency" | "reduce_travel_time";
  prerequisites: never[];
  resourceClaims: never[];
};

function initiative(
  id: string,
  actionKey: TestInitiative["actionKey"] = "increase_service_frequency"
): TestInitiative {
  return { id, actionKey, prerequisites: [], resourceClaims: [] };
}

function validated(
  initiatives: TestInitiative[],
  scenarioBindings: Array<{ scenario: "A" | "B"; initiativeId: string }>,
  schedules: ScenarioSchedules
): ValidatedStructuralObservationContractV1 {
  const result = validateAndNormalizeStructuralObservationContract({
    contract: {
      version: "structural-observation-v1",
      initiatives,
      resources: [],
      scenarioBindings,
    },
    schedules,
    horizon: 6,
    profile,
  });
  assert.equal(result.valid, true, result.valid ? undefined : JSON.stringify(result.issues));
  if (!result.valid) throw new Error("Test contract unexpectedly failed validation.");
  return result.value;
}

test("resolves the minimum A/B plan from canonical schedules", () => {
  const schedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 1 }],
    B: [{ actionId: "increase_service_frequency", executionStep: 4 }],
  };
  const contract = validated(
    [initiative("service")],
    [
      { scenario: "A", initiativeId: "service" },
      { scenario: "B", initiativeId: "service" },
    ],
    schedules
  );
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.equal(plans.A.initiatives[0].plannedExecutionPeriod, 1);
  assert.equal(plans.B.initiatives[0].plannedExecutionPeriod, 4);
  assert.equal(plans.A.initiatives[0].bindingStatus, "bound");
  assert.equal(plans.B.initiatives[0].bindingStatus, "bound");
});

test("represents initiatives bound only in A, only in B, and in neither scenario", () => {
  const schedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 2 }],
    B: [{ actionId: "reduce_travel_time", executionStep: 3 }],
  };
  const contract = validated(
    [initiative("a-only"), initiative("b-only", "reduce_travel_time"), initiative("unbound")],
    [
      { scenario: "A", initiativeId: "a-only" },
      { scenario: "B", initiativeId: "b-only" },
    ],
    schedules
  );
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.deepEqual(plans.A.initiatives.map(({ initiativeId }) => initiativeId), ["a-only", "b-only", "unbound"]);
  assert.deepEqual(plans.B.initiatives.map(({ initiativeId }) => initiativeId), ["a-only", "b-only", "unbound"]);
  assert.deepEqual(
    plans.A.initiatives.map(({ bindingStatus, plannedExecutionPeriod }) => [bindingStatus, plannedExecutionPeriod]),
    [["bound", 2], ["not-bound", null], ["not-bound", null]]
  );
  assert.deepEqual(
    plans.B.initiatives.map(({ bindingStatus, plannedExecutionPeriod }) => [bindingStatus, plannedExecutionPeriod]),
    [["not-bound", null], ["bound", 3], ["not-bound", null]]
  );
});

test("allows shared global action identity but resolves only the scenario binding", () => {
  const schedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 5 }],
    B: [{ actionId: "increase_service_frequency", executionStep: 2 }],
  };
  const contract = validated(
    [initiative("service-a"), initiative("service-b")],
    [
      { scenario: "A", initiativeId: "service-a" },
      { scenario: "B", initiativeId: "service-b" },
    ],
    schedules
  );
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.deepEqual(plans.A.initiatives.map(({ initiativeId, plannedExecutionPeriod }) => [initiativeId, plannedExecutionPeriod]), [["service-a", 5], ["service-b", null]]);
  assert.deepEqual(plans.B.initiatives.map(({ initiativeId, plannedExecutionPeriod }) => [initiativeId, plannedExecutionPeriod]), [["service-a", null], ["service-b", 2]]);
});

test("matches schedules by canonical action identity rather than array position", () => {
  const schedules: ScenarioSchedules = {
    A: [
      { actionId: "reduce_travel_time", executionStep: 6 },
      { actionId: "increase_service_frequency", executionStep: 1 },
    ],
    B: [],
  };
  const contract = validated(
    [initiative("service"), initiative("travel", "reduce_travel_time")],
    [
      { scenario: "A", initiativeId: "service" },
      { scenario: "A", initiativeId: "travel" },
    ],
    schedules
  );
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.deepEqual(plans.A.initiatives.map(({ initiativeId, plannedExecutionPeriod }) => [initiativeId, plannedExecutionPeriod]), [["service", 1], ["travel", 6]]);
});

test("does not mutate contract or schedules and returns a deeply frozen plan", () => {
  const schedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 1 }],
    B: [],
  };
  const schedulesBefore = structuredClone(schedules);
  const contract = validated([initiative("service")], [{ scenario: "A", initiativeId: "service" }], schedules);
  const contractBefore = structuredClone(contract);
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.deepEqual(schedules, schedulesBefore);
  assert.deepEqual(contract, contractBefore);
  assert.equal(Object.isFrozen(plans), true);
  assert.equal(Object.isFrozen(plans.A), true);
  assert.equal(Object.isFrozen(plans.A.initiatives), true);
  assert.equal(Object.isFrozen(plans.A.initiatives[0]), true);
  assert.equal(Object.isFrozen(plans.A.initiatives[0].definition), true);
});

test("semantically reordered contract input produces identical canonical plans", () => {
  const schedules: ScenarioSchedules = {
    A: [
      { actionId: "increase_service_frequency", executionStep: 1 },
      { actionId: "reduce_travel_time", executionStep: 4 },
    ],
    B: [],
  };
  const initiatives = [initiative("z-service"), initiative("a-travel", "reduce_travel_time")];
  const bindings = [
    { scenario: "A" as const, initiativeId: "z-service" },
    { scenario: "A" as const, initiativeId: "a-travel" },
  ];
  const first = validated(initiatives, bindings, schedules);
  const second = validated([...initiatives].reverse(), [...bindings].reverse(), schedules);

  assert.deepEqual(
    resolveStructuralScenarioPlans({ contract: first, schedules }),
    resolveStructuralScenarioPlans({ contract: second, schedules })
  );
});

test("uses stable A/B and InitiativeId ordering", () => {
  const schedules: ScenarioSchedules = { A: [], B: [] };
  const contract = validated(
    [initiative("z"), initiative("a", "reduce_travel_time")],
    [],
    schedules
  );
  const plans = resolveStructuralScenarioPlans({ contract, schedules });

  assert.deepEqual(Object.keys(plans), ["A", "B"]);
  assert.deepEqual(plans.A.initiatives.map(({ initiativeId }) => initiativeId), ["a", "z"]);
  assert.deepEqual(plans.B.initiatives.map(({ initiativeId }) => initiativeId), ["a", "z"]);
});

test("resolved initiatives contain identity and definition but no effects or driver deltas", () => {
  const schedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 1 }],
    B: [],
  };
  const contract = validated([initiative("service")], [{ scenario: "A", initiativeId: "service" }], schedules);
  const resolved = resolveStructuralScenarioPlans({ contract, schedules }).A.initiatives[0];

  assert.deepEqual(Object.keys(resolved).sort(), ["actionKey", "bindingStatus", "definition", "initiativeId", "plannedExecutionPeriod", "scenario"]);
  assert.equal("actionEffects" in resolved, false);
  assert.equal("driverDeltas" in resolved, false);
  assert.strictEqual(resolved.definition, contract.initiatives[0]);
});

test("defensive invariants reject schedules that differ from the validated boundary", () => {
  const validatedSchedules: ScenarioSchedules = {
    A: [{ actionId: "increase_service_frequency", executionStep: 1 }],
    B: [],
  };
  const contract = validated([initiative("service")], [{ scenario: "A", initiativeId: "service" }], validatedSchedules);
  assert.throws(
    () => resolveStructuralScenarioPlans({ contract, schedules: { A: [], B: [] } }),
    /must match exactly one canonical schedule entry/
  );
});
