import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import { validateAndNormalizeStructuralObservationContractV2 } from "./validationV2";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const horizon = 3;

type ContractFixture = {
  version: string;
  initiatives: Array<{
    id: string;
    effectDefinitionId: string;
    label?: string;
    prerequisites: Array<{ initiativeId: string; type: string }>;
    resourceClaims: Array<{
      resourceId: string;
      amount: number;
      durationPeriods: number;
    }>;
  }>;
  resources: Array<{
    id: string;
    capacity:
      | { type: "constant"; amount: number }
      | {
          type: "periodized";
          amounts: Array<{ period: number; amount: number }>;
        };
  }>;
};

function validContract(): ContractFixture {
  return {
    version: "structural-observation-v2",
    initiatives: [
      {
        id: "beta",
        effectDefinitionId: "increase_service_frequency",
        prerequisites: [{ initiativeId: "alpha", type: "finish-to-start" }],
        resourceClaims: [],
      },
      {
        id: "unplanned",
        effectDefinitionId: "transit_signal_priority",
        prerequisites: [],
        resourceClaims: [],
      },
      {
        id: "alpha",
        effectDefinitionId: "reduce_travel_time",
        label: "Alpha",
        prerequisites: [],
        resourceClaims: [{ resourceId: "team", amount: 0.5, durationPeriods: 2 }],
      },
    ],
    resources: [
      {
        id: "team",
        capacity: {
          type: "periodized",
          amounts: [
            { period: 3, amount: 1 },
            { period: 1, amount: 1 },
            { period: 2, amount: 1 },
          ],
        },
      },
    ],
  };
}

function validate(contract: unknown = validContract()) {
  return validateAndNormalizeStructuralObservationContractV2({
    contract,
    horizon,
    profile,
  });
}

function codes(contract: unknown): string[] {
  return validate(contract).issues.map(({ code }) => code);
}

test("validates and canonically normalizes an immutable V2 contract", () => {
  const input = validContract();
  const before = structuredClone(input);
  const result = validate(input);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.value.initiatives.map(({ id }) => id), ["alpha", "beta", "unplanned"]);
  assert.deepEqual(result.value.resources[0].capacity, {
    type: "periodized",
    amounts: [
      { period: 1, amount: 1 },
      { period: 2, amount: 1 },
      { period: 3, amount: 1 },
    ],
  });
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.initiatives[0].prerequisites), true);
});

test("rejects scenario bindings, scenario/period fields, and unknown semantic fields", () => {
  const contract = structuredClone(validContract()) as Record<string, unknown>;
  contract.scenarioBindings = [];
  (contract.initiatives as Record<string, unknown>[])[0].scenario = "A";
  (contract.initiatives as Record<string, unknown>[])[0].executionStep = 1;
  assert.deepEqual(codes(contract), [
    "unknown-field",
    "unknown-field",
    "scenario-bindings-not-allowed",
  ]);
});

test("rejects empty and duplicate initiative IDs and invalid effect definitions", () => {
  const contract = structuredClone(validContract());
  contract.initiatives[0].id = "";
  contract.initiatives[1].id = "alpha";
  contract.initiatives[1].effectDefinitionId = "unknown";
  contract.initiatives[2].effectDefinitionId = "congestion_pricing";
  const result = validate(contract);
  assert.ok(result.issues.some(({ code }) => code === "empty-initiative-id"));
  assert.ok(result.issues.some(({ code }) => code === "duplicate-initiative-id"));
  assert.ok(result.issues.some(({ code }) => code === "unknown-effect-definition"));
  assert.ok(result.issues.some(({ code }) => code === "unsupported-effect-definition"));
});

test("rejects dependency defects and direct or indirect cycles", () => {
  const contract = structuredClone(validContract());
  contract.initiatives[0].prerequisites = [
    { initiativeId: "beta", type: "finish-to-start" },
    { initiativeId: "missing", type: "finish-to-start" },
    { initiativeId: "missing", type: "finish-to-start" },
  ];
  contract.initiatives[2].prerequisites = [
    { initiativeId: "beta", type: "finish-to-start" },
  ];
  const resultCodes = codes(contract);
  assert.ok(resultCodes.includes("self-prerequisite"));
  assert.ok(resultCodes.includes("unknown-prerequisite-initiative"));
  assert.ok(resultCodes.includes("duplicate-prerequisite"));
  assert.ok(resultCodes.includes("dependency-cycle"));
});

test("rejects resource and periodized-capacity defects", () => {
  const contract = structuredClone(validContract());
  contract.initiatives[2].resourceClaims = [
    { resourceId: "missing", amount: 0, durationPeriods: 0 },
    { resourceId: "missing", amount: 1, durationPeriods: 1 },
  ];
  assert.equal(contract.resources[0].capacity.type, "periodized");
  if (!("amounts" in contract.resources[0].capacity)) return;
  contract.resources[0].capacity.amounts = [
    { period: 1, amount: -1 },
    { period: 1, amount: 1 },
    { period: 4, amount: 1 },
  ];
  const resultCodes = codes(contract);
  for (const expected of [
    "unknown-resource",
    "invalid-claim-amount",
    "invalid-claim-duration",
    "duplicate-resource-claim",
    "invalid-resource-capacity",
    "duplicate-capacity-period",
    "capacity-period-outside-horizon",
    "missing-capacity-period",
  ]) {
    assert.ok(resultCodes.includes(expected), expected);
  }
});

test("semantic reordering is deep-equal and independent errors sort stably", () => {
  const first = validate(validContract());
  const reordered = structuredClone(validContract());
  reordered.initiatives.reverse();
  const capacity = reordered.resources[0].capacity;
  if (capacity.type === "periodized") capacity.amounts.reverse();
  const second = validate(reordered);
  assert.deepEqual(second, first);

  const malformed = { ...validContract(), version: "future", extra: true };
  const once = validate(malformed);
  const twice = validate(structuredClone(malformed));
  assert.deepEqual(twice.issues, once.issues);
  assert.deepEqual(
    once.issues.map(({ path }) => path),
    [...once.issues.map(({ path }) => path)].sort()
  );
});
