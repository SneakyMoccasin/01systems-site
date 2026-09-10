import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { ScenarioSchedules, ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type {
  DisplayedPeriod,
  ValidatedStructuralObservationContractV1,
} from "./contract";
import {
  observeResourcePressureForPeriod,
  RESOURCE_CAPACITY_EPSILON,
} from "./observeResourcePressure";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";
import { resolveStructuralScenarioPlans } from "./resolveScenarioPlans";
import { validateAndNormalizeStructuralObservationContract } from "./validation";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");

type ResourceInput = {
  id: string;
  capacity:
    | { type: "constant"; amount: number }
    | { type: "periodized"; amounts: Array<{ period: number; amount: number }> };
};

type InitiativeInput = {
  id: string;
  actionKey: ActionKey;
  prerequisites: never[];
  resourceClaims: Array<{ resourceId: string; amount: number; durationPeriods: number }>;
};

function setup(input: {
  initiatives: InitiativeInput[];
  resources: ResourceInput[];
  bindings: Array<{ scenario: ScheduleScenarioId; initiativeId: string }>;
  schedules: ScenarioSchedules;
  horizon?: number;
}) {
  const validation = validateAndNormalizeStructuralObservationContract({
    contract: {
      version: "structural-observation-v1",
      initiatives: input.initiatives,
      resources: input.resources,
      scenarioBindings: input.bindings,
    },
    schedules: input.schedules,
    horizon: input.horizon ?? 6,
    profile,
  });
  assert.equal(validation.valid, true, validation.valid ? undefined : JSON.stringify(validation.issues));
  if (!validation.valid) throw new Error("Resource test setup must validate.");
  return {
    contract: validation.value,
    plans: resolveStructuralScenarioPlans({ contract: validation.value, schedules: input.schedules }),
  };
}

function item(
  id: string,
  actionKey: ActionKey,
  claims: InitiativeInput["resourceClaims"] = []
): InitiativeInput {
  return { id, actionKey, prerequisites: [], resourceClaims: claims };
}

test("returns every resource with zero load and supports explicit period capacity lookup", () => {
  const { contract, plans } = setup({
    initiatives: [],
    resources: [
      { id: "constant", capacity: { type: "constant", amount: 3 } },
      { id: "periodized", capacity: { type: "periodized", amounts: [
        { period: 3, amount: 7 }, { period: 1, amount: 5 }, { period: 2, amount: 6 },
      ] } },
    ],
    bindings: [], schedules: { A: [], B: [] }, horizon: 3,
  });
  const result = observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod });
  assert.deepEqual(result.map(({ resourceId, capacity, totalClaimed, remainingCapacity }) => ({ resourceId, capacity, totalClaimed, remainingCapacity })), [
    { resourceId: "constant", capacity: 3, totalClaimed: 0, remainingCapacity: 3 },
    { resourceId: "periodized", capacity: 6, totalClaimed: 0, remainingCapacity: 6 },
  ]);
});

test("claims start on planned execution and duration includes the start period", () => {
  const { contract, plans } = setup({
    initiatives: [
      item("one", "increase_service_frequency", [{ resourceId: "team", amount: 1, durationPeriods: 1 }]),
      item("two", "reduce_travel_time", [{ resourceId: "team", amount: 2, durationPeriods: 2 }]),
    ],
    resources: [{ id: "team", capacity: { type: "constant", amount: 5 } }],
    bindings: [{ scenario: "A", initiativeId: "one" }, { scenario: "A", initiativeId: "two" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }, { actionId: "reduce_travel_time", executionStep: 2 }], B: [] },
  });
  const at = (period: number) => observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: period as DisplayedPeriod })[0];
  assert.deepEqual(at(1).activeClaims, []);
  assert.deepEqual(at(2).activeClaims.map(({ initiativeId, startPeriod, endPeriod, isStartingThisPeriod }) => ({ initiativeId, startPeriod, endPeriod, isStartingThisPeriod })), [
    { initiativeId: "one", startPeriod: 2, endPeriod: 2, isStartingThisPeriod: true },
    { initiativeId: "two", startPeriod: 2, endPeriod: 3, isStartingThisPeriod: true },
  ]);
  assert.deepEqual(at(3).activeClaims.map(({ initiativeId, isStartingThisPeriod }) => ({ initiativeId, isStartingThisPeriod })), [{ initiativeId: "two", isStartingThisPeriod: false }]);
  assert.deepEqual(at(4).activeClaims, []);
});

test("unbound initiatives create no claims and resources remain separate", () => {
  const { contract, plans } = setup({
    initiatives: [item("bound", "increase_service_frequency", [{ resourceId: "alpha", amount: 1, durationPeriods: 1 }]), item("unbound", "reduce_travel_time", [{ resourceId: "beta", amount: 2, durationPeriods: 1 }])],
    resources: [{ id: "beta", capacity: { type: "constant", amount: 2 } }, { id: "alpha", capacity: { type: "constant", amount: 2 } }],
    bindings: [{ scenario: "A", initiativeId: "bound" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 1 }], B: [] },
  });
  const result = observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 1 as DisplayedPeriod });
  assert.deepEqual(result.map(({ resourceId, totalClaimed }) => [resourceId, totalClaimed]), [["alpha", 1], ["beta", 0]]);
});

test("sums simultaneous claims without priority or reduction and blocks all current starters", () => {
  const { contract, plans } = setup({
    initiatives: [item("z", "increase_service_frequency", [{ resourceId: "team", amount: 2, durationPeriods: 1 }]), item("a", "reduce_travel_time", [{ resourceId: "team", amount: 2, durationPeriods: 1 }])],
    resources: [{ id: "team", capacity: { type: "constant", amount: 3 } }],
    bindings: [{ scenario: "A", initiativeId: "z" }, { scenario: "A", initiativeId: "a" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }, { actionId: "reduce_travel_time", executionStep: 2 }], B: [] },
  });
  const result = observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod })[0];
  assert.equal(result.totalClaimed, 4);
  assert.equal(result.overallocatedBy, 1);
  assert.deepEqual(result.activeClaims.map(({ initiativeId, amount }) => [initiativeId, amount]), [["a", 2], ["z", 2]]);
  assert.deepEqual(result.contributingInitiativeIds, ["a", "z"]);
  assert.deepEqual(result.startingInitiativeIds, ["a", "z"]);
  assert.deepEqual(result.wouldBlockStartingInitiativeIds, ["a", "z"]);
});

test("uses the named epsilon without rounding exact values", () => {
  const observe = (amount: number) => {
    const { contract, plans } = setup({
      initiatives: [item("claim", "increase_service_frequency", [{ resourceId: "team", amount, durationPeriods: 1 }])],
      resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
      bindings: [{ scenario: "A", initiativeId: "claim" }],
      schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 1 }], B: [] },
    });
    return observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 1 as DisplayedPeriod })[0];
  };
  const exact = observe(1);
  assert.equal(exact.overallocated, false);
  assert.equal(exact.overallocatedBy, 0);
  const within = observe(1 + RESOURCE_CAPACITY_EPSILON / 2);
  assert.equal(within.totalClaimed, 1 + RESOURCE_CAPACITY_EPSILON / 2);
  assert.equal(within.overallocated, false);
  assert.equal(within.overallocatedBy, 0);
  assert.equal(within.remainingCapacity, 0);
  const beyond = observe(1 + RESOURCE_CAPACITY_EPSILON * 2);
  const expectedRawExcess = 1 + RESOURCE_CAPACITY_EPSILON * 2 - 1;
  assert.equal(beyond.overallocated, true);
  assert.equal(beyond.overallocatedBy, expectedRawExcess);
  assert.equal(beyond.remainingCapacity, -expectedRawExcess);
});

test("earlier claims contribute but are never retroactively would-blocked", () => {
  const { contract, plans } = setup({
    initiatives: [item("earlier", "reduce_travel_time", [{ resourceId: "team", amount: 4, durationPeriods: 3 }]), item("no-team-claim", "increase_service_frequency")],
    resources: [{ id: "team", capacity: { type: "constant", amount: 3 } }],
    bindings: [{ scenario: "A", initiativeId: "earlier" }, { scenario: "A", initiativeId: "no-team-claim" }],
    schedules: { A: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 2 }], B: [] },
  });
  const result = observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod })[0];
  assert.equal(result.overallocated, true);
  assert.deepEqual(result.contributingInitiativeIds, ["earlier"]);
  assert.deepEqual(result.startingInitiativeIds, []);
  assert.deepEqual(result.wouldBlockStartingInitiativeIds, []);
});

test("A/B observations are isolated, deterministic, immutable, and do not mutate input", () => {
  const input = {
    initiatives: [item("b", "reduce_travel_time", [{ resourceId: "team", amount: 2, durationPeriods: 1 }]), item("a", "increase_service_frequency", [{ resourceId: "team", amount: 1, durationPeriods: 1 }])],
    resources: [{ id: "team", capacity: { type: "constant" as const, amount: 2 } }],
    bindings: [{ scenario: "A" as const, initiativeId: "a" }, { scenario: "B" as const, initiativeId: "b" }],
    schedules: { A: [{ actionId: "increase_service_frequency" as const, executionStep: 1 }], B: [{ actionId: "reduce_travel_time" as const, executionStep: 1 }] },
  };
  const before = structuredClone(input);
  const first = setup(input);
  const reordered = setup({ ...input, initiatives: [...input.initiatives].reverse(), resources: [...input.resources].reverse(), bindings: [...input.bindings].reverse() });
  const a = observeResourcePressureForPeriod({ contract: first.contract, scenarioPlan: first.plans.A, period: 1 as DisplayedPeriod });
  const b = observeResourcePressureForPeriod({ contract: first.contract, scenarioPlan: first.plans.B, period: 1 as DisplayedPeriod });
  assert.equal(a[0].totalClaimed, 1);
  assert.equal(b[0].totalClaimed, 2);
  assert.deepEqual(a, observeResourcePressureForPeriod({ contract: reordered.contract, scenarioPlan: reordered.plans.A, period: 1 as DisplayedPeriod }));
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(a), true);
  assert.equal(Object.isFrozen(a[0]), true);
  assert.equal(Object.isFrozen(a[0].activeClaims), true);
  assert.equal(Object.isFrozen(a[0].contributingInitiativeIds), true);
});

test("throws clear invariant errors for impossible internal states", () => {
  const { contract, plans } = setup({
    initiatives: [item("claim", "increase_service_frequency", [{ resourceId: "team", amount: 1, durationPeriods: 1 }])],
    resources: [{ id: "team", capacity: { type: "constant", amount: 2 } }],
    bindings: [{ scenario: "A", initiativeId: "claim" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 1 }], B: [] },
  });
  assert.throws(() => observeResourcePressureForPeriod({ contract, scenarioPlan: plans.A, period: 0 as DisplayedPeriod }), /period must be positive/);
  const wrongScenario = { ...plans.A, initiatives: [{ ...plans.A.initiatives[0], scenario: "B" as const }] } as ResolvedStructuralScenarioPlan;
  assert.throws(() => observeResourcePressureForPeriod({ contract, scenarioPlan: wrongScenario, period: 1 as DisplayedPeriod }), /contains initiative/);
  const missingPeriod = { ...contract, resources: [{ id: "team", capacity: { type: "periodized" as const, amounts: [] } }] } as unknown as ValidatedStructuralObservationContractV1;
  assert.throws(() => observeResourcePressureForPeriod({ contract: missingPeriod, scenarioPlan: plans.A, period: 1 as DisplayedPeriod }), /exactly one capacity/);
  const nonFiniteCapacity = { ...contract, resources: [{ id: "team", capacity: { type: "constant" as const, amount: Number.POSITIVE_INFINITY } }] } as unknown as ValidatedStructuralObservationContractV1;
  assert.throws(() => observeResourcePressureForPeriod({ contract: nonFiniteCapacity, scenarioPlan: plans.A, period: 1 as DisplayedPeriod }), /non-finite capacity calculation/);
  const missingPlanPeriod = { ...plans.A, initiatives: [{ ...plans.A.initiatives[0], plannedExecutionPeriod: null }] } as ResolvedStructuralScenarioPlan;
  assert.throws(() => observeResourcePressureForPeriod({ contract, scenarioPlan: missingPlanPeriod, period: 1 as DisplayedPeriod }), /has no planned execution period/);
  const unknownResourcePlan = { ...plans.A, initiatives: [{ ...plans.A.initiatives[0], definition: { ...plans.A.initiatives[0].definition, resourceClaims: [{ resourceId: "missing", amount: 1, durationPeriods: 1 }] } }] } as unknown as ResolvedStructuralScenarioPlan;
  assert.throws(() => observeResourcePressureForPeriod({ contract, scenarioPlan: unknownResourcePlan, period: 1 as DisplayedPeriod }), /claims unknown resource/);
});
