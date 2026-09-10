import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { ScenarioSchedules } from "../reactScheduledAnalysisBoundary";
import { validateAndNormalizeStructuralObservationContract } from "./validation";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const schedules: ScenarioSchedules = {
  A: [{ actionId: "increase_service_frequency", executionStep: 1 }],
  B: [{ actionId: "increase_service_frequency", executionStep: 2 }],
};

interface MutableTestContract {
  version: string;
  initiatives: Array<{
    id: string;
    actionKey: string;
    label?: string;
    prerequisites: Array<{ initiativeId: string; type: string }>;
    resourceClaims: Array<{ resourceId: string; amount: number; durationPeriods: number }>;
  }>;
  resources: Array<{
    id: string;
    label?: string;
    capacity: {
      type: string;
      amount?: number;
      amounts?: Array<{ period: number; amount: number }>;
    };
  }>;
  scenarioBindings: Array<{ scenario: string; initiativeId: string }>;
}

function validContract(): MutableTestContract {
  return {
    version: "structural-observation-v1",
    initiatives: [
      {
        id: "service",
        actionKey: "increase_service_frequency",
        label: "Service",
        prerequisites: [],
        resourceClaims: [{ resourceId: "team", amount: 1, durationPeriods: 1 }],
      },
    ],
    resources: [{ id: "team", capacity: { type: "constant", amount: 2 } }],
    scenarioBindings: [
      { scenario: "A", initiativeId: "service" },
      { scenario: "B", initiativeId: "service" },
    ],
  };
}

function validate(contract: unknown, overrides: Partial<{ schedules: ScenarioSchedules; horizon: number }> = {}) {
  return validateAndNormalizeStructuralObservationContract({
    contract,
    schedules: overrides.schedules ?? schedules,
    horizon: overrides.horizon ?? 3,
    profile,
  });
}

function codes(contract: unknown, overrides?: Partial<{ schedules: ScenarioSchedules; horizon: number }>) {
  const result = validate(contract, overrides);
  assert.equal(result.valid, false);
  return result.issues.map((issue) => issue.code);
}

test("normalizes and deeply freezes the minimum valid contract without mutating input", () => {
  const input = validContract();
  const before = structuredClone(input);
  const result = validate(input);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(input, before);
  assert.notEqual(result.value, input);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.initiatives[0].resourceClaims), true);
});

test("normalization deterministically sorts every semantically relevant array", () => {
  const contract = validContract();
  contract.initiatives.push({ id: "alpha", actionKey: "reduce_travel_time", label: "A", prerequisites: [], resourceClaims: [] });
  contract.scenarioBindings.push({ scenario: "A", initiativeId: "alpha" }, { scenario: "B", initiativeId: "alpha" });
  const expandedSchedules = { A: [...schedules.A, { actionId: "reduce_travel_time" as const, executionStep: 2 }], B: [...schedules.B, { actionId: "reduce_travel_time" as const, executionStep: 1 }] };
  contract.initiatives.reverse(); contract.scenarioBindings.reverse();
  const result = validate(contract, { schedules: expandedSchedules });
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.value.initiatives.map(({ id }) => id), ["alpha", "service"]);
  assert.deepEqual(result.value.scenarioBindings.map(({ scenario, initiativeId }) => `${scenario}:${initiativeId}`), ["A:alpha", "A:service", "B:alpha", "B:service"]);
});

test("rejects unknown versions and malformed top-level arrays", () => {
  const contract = { ...validContract(), version: "v2", resources: null };
  assert.deepEqual(codes(contract), ["invalid-contract", "unknown-resource", "unknown-version"]);
});

test("rejects empty and duplicate initiative IDs", () => {
  const contract = validContract();
  contract.initiatives.push({ ...contract.initiatives[0] }, { ...contract.initiatives[0], id: " " });
  const result = codes(contract);
  assert.ok(result.includes("duplicate-initiative-id"));
  assert.ok(result.includes("empty-initiative-id"));
});

test("rejects unknown and profile-unsupported canonical actions", () => {
  const unknown = validContract(); unknown.initiatives[0].actionKey = "missing";
  assert.ok(codes(unknown).includes("unknown-action-key"));
  const unsupported = validContract(); unsupported.initiatives[0].actionKey = "delay_maintenance";
  assert.ok(codes(unsupported).includes("unsupported-action-key"));
});

test("validates unknown, self, duplicate, and unsupported prerequisites", () => {
  const contract = validContract();
  contract.initiatives[0].prerequisites = [
    { initiativeId: "missing", type: "finish-to-start" },
    { initiativeId: "service", type: "finish-to-start" },
    { initiativeId: "service", type: "finish-to-start" },
    { initiativeId: "missing", type: "other" },
  ];
  const result = codes(contract);
  for (const expected of ["unknown-prerequisite-initiative", "self-prerequisite", "duplicate-prerequisite", "unsupported-dependency-type"] as const) assert.ok(result.includes(expected));
});

test("rejects direct and indirect dependency cycles", () => {
  const direct = validContract();
  direct.initiatives = [
    { id: "a", actionKey: "increase_service_frequency", prerequisites: [{ initiativeId: "b", type: "finish-to-start" }], resourceClaims: [] },
    { id: "b", actionKey: "reduce_travel_time", prerequisites: [{ initiativeId: "a", type: "finish-to-start" }], resourceClaims: [] },
  ];
  assert.equal(codes(direct).filter((code) => code === "dependency-cycle").length, 2);
  const indirect = structuredClone(direct);
  indirect.initiatives = [
    ...indirect.initiatives,
    { id: "c", actionKey: "expand_cycling_infrastructure", prerequisites: [{ initiativeId: "a", type: "finish-to-start" }], resourceClaims: [] },
  ];
  indirect.initiatives[1].prerequisites = [{ initiativeId: "c", type: "finish-to-start" }];
  assert.equal(codes(indirect).filter((code) => code === "dependency-cycle").length, 3);
});

test("rejects unknown resources, duplicate claims, invalid amounts, and invalid durations", () => {
  const invalidValues = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
  for (const amount of invalidValues) {
    const contract = validContract(); contract.initiatives[0].resourceClaims[0].amount = amount;
    assert.ok(codes(contract).includes("invalid-claim-amount"));
  }
  const contract = validContract();
  contract.initiatives[0].resourceClaims = [
    { resourceId: "missing", amount: 1, durationPeriods: 0 },
    { resourceId: "missing", amount: 1, durationPeriods: 1 },
  ];
  const result = codes(contract);
  assert.ok(result.includes("unknown-resource"));
  assert.ok(result.includes("duplicate-resource-claim"));
  assert.ok(result.includes("invalid-claim-duration"));
});

test("rejects invalid constant capacity", () => {
  for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const contract = validContract(); contract.resources[0].capacity = { type: "constant", amount };
    assert.ok(codes(contract).includes("invalid-resource-capacity"));
  }
});

test("requires periodized capacity to cover exactly the horizon", () => {
  const contract = validContract();
  contract.resources[0].capacity = { type: "periodized", amounts: [{ period: 1, amount: 1 }, { period: 1, amount: 1 }, { period: 4, amount: 1 }] };
  const result = codes(contract);
  assert.ok(result.includes("duplicate-capacity-period"));
  assert.ok(result.includes("missing-capacity-period"));
  assert.ok(result.includes("capacity-period-outside-horizon"));
});

test("allows an unbound global initiative", () => {
  const contract = validContract();
  contract.initiatives.push({ id: "unbound", actionKey: "reduce_travel_time", prerequisites: [], resourceClaims: [] });
  assert.equal(validate(contract).valid, true);
});

test("validates unknown and duplicate bindings", () => {
  const contract = validContract();
  contract.scenarioBindings.push({ scenario: "A", initiativeId: "missing" }, { scenario: "A", initiativeId: "service" });
  const result = codes(contract);
  assert.ok(result.includes("unknown-binding-initiative"));
  assert.ok(result.includes("duplicate-scenario-binding"));
});

test("rejects multiple initiative instances of one action in one scenario", () => {
  const contract = validContract();
  contract.initiatives.push({ id: "service-2", actionKey: "increase_service_frequency", prerequisites: [], resourceClaims: [] });
  contract.scenarioBindings.push({ scenario: "A", initiativeId: "service-2" });
  assert.ok(codes(contract).includes("duplicate-action-binding-in-scenario"));
});

test("requires exact bidirectional binding-to-schedule coverage", () => {
  const missingSchedule = validContract();
  missingSchedule.scenarioBindings.push({ scenario: "A", initiativeId: "other" });
  missingSchedule.initiatives.push({ id: "other", actionKey: "reduce_travel_time", prerequisites: [], resourceClaims: [] });
  assert.ok(codes(missingSchedule).includes("binding-missing-schedule-entry"));
  const missingBinding = validContract(); missingBinding.scenarioBindings = missingBinding.scenarioBindings.filter(({ scenario }: { scenario: string }) => scenario !== "B");
  assert.ok(codes(missingBinding).includes("schedule-entry-missing-binding"));
});

test("rejects a bound claim extending beyond the horizon without clipping it", () => {
  const contract = validContract(); contract.initiatives[0].resourceClaims[0].durationPeriods = 3;
  const result = validate(contract);
  assert.equal(result.valid, false);
  const issue = result.issues.find(({ code, scenario }) => code === "resource-claim-outside-horizon" && scenario === "B");
  assert.deepEqual(issue && { plannedPeriod: issue.plannedPeriod, horizon: issue.horizon }, { plannedPeriod: 2, horizon: 3 });
});

test("permits the same initiative binding in A and B", () => {
  assert.equal(validate(validContract()).valid, true);
});

test("sorts simultaneous independent errors deterministically", () => {
  const contract = validContract();
  contract.initiatives[0].resourceClaims[0].amount = 0;
  contract.resources[0].capacity = { type: "constant", amount: -1 };
  const first = validate(contract); const second = validate(structuredClone(contract));
  assert.equal(first.valid, false); assert.equal(second.valid, false);
  assert.deepEqual(first.issues, second.issues);
  assert.deepEqual(first.issues, [...first.issues].sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message)));
});
