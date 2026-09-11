import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import { validateAndNormalizeStructuralObservationContractV2 } from "./validationV2";
import { validateAndNormalizeScenarioInitiativeSchedulesV1 } from "./validateInitiativeSchedules";

const horizon = 3;
const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const contractResult = validateAndNormalizeStructuralObservationContractV2({
  horizon,
  profile,
  contract: {
    version: "structural-observation-v2",
    initiatives: [
      {
        id: "alpha",
        effectDefinitionId: "reduce_travel_time",
        prerequisites: [],
        resourceClaims: [{ resourceId: "team", amount: 0.5, durationPeriods: 2 }],
      },
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
    ],
    resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
  },
});
assert.equal(contractResult.valid, true);
if (!contractResult.valid) throw new Error("Test contract must be valid.");
const contract = contractResult.value;

type ScheduleFixture = {
  version: string;
  comparisonPolicy: string;
  A: Array<{ initiativeId: string; executionStep: number }>;
  B: Array<{ initiativeId: string; executionStep: number }>;
};

function validSchedules(): ScheduleFixture {
  return {
    version: "initiative-schedule-v1",
    comparisonPolicy: "same-initiative-set",
    A: [
      { initiativeId: "beta", executionStep: 3 },
      { initiativeId: "alpha", executionStep: 1 },
    ],
    B: [
      { initiativeId: "alpha", executionStep: 2 },
      { initiativeId: "beta", executionStep: 1 },
    ],
  };
}

function validate(schedules: unknown = validSchedules()) {
  return validateAndNormalizeScenarioInitiativeSchedulesV1({
    contract,
    schedules,
    horizon,
  });
}

test("validates A/B with the same initiatives in different order and periods", () => {
  const input = validSchedules();
  const before = structuredClone(input);
  const result = validate(input);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.value.A, [
    { initiativeId: "alpha", executionStep: 1 },
    { initiativeId: "beta", executionStep: 3 },
  ]);
  assert.deepEqual(result.value.B, [
    { initiativeId: "beta", executionStep: 1 },
    { initiativeId: "alpha", executionStep: 2 },
  ]);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.A), true);
});

test("a contract initiative omitted from both scenarios remains valid", () => {
  const result = validate();
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.value.A.some(({ initiativeId }) => initiativeId === "unplanned"), false);
  assert.equal(result.value.B.some(({ initiativeId }) => initiativeId === "unplanned"), false);
});

test("rejects a missing or extra initiative in only one scenario", () => {
  const missing = structuredClone(validSchedules());
  missing.B.pop();
  const missingResult = validate(missing);
  assert.ok(missingResult.issues.some(({ code, scenario, initiativeId }) =>
    code === "scenario-initiative-set-mismatch" && scenario === "B" && initiativeId === "beta"
  ));

  const extra = structuredClone(validSchedules());
  extra.A.push({ initiativeId: "unplanned", executionStep: 1 });
  const extraResult = validate(extra);
  assert.ok(extraResult.issues.some(({ code, scenario, initiativeId }) =>
    code === "scenario-initiative-set-mismatch" && scenario === "B" && initiativeId === "unplanned"
  ));
});

test("rejects duplicates, unknown initiatives, invalid periods, and claim overflow", () => {
  const schedules = structuredClone(validSchedules());
  schedules.A = [
    { initiativeId: "alpha", executionStep: 3 },
    { initiativeId: "alpha", executionStep: 1 },
    { initiativeId: "unknown", executionStep: 1.5 },
  ];
  schedules.B = [
    { initiativeId: "alpha", executionStep: 0 },
    { initiativeId: "unknown", executionStep: 4 },
  ];
  const resultCodes: string[] = validate(schedules).issues.map(({ code }) => code);
  for (const expected of [
    "duplicate-initiative",
    "unknown-initiative",
    "non-integer-execution-step",
    "execution-step-outside-horizon",
    "resource-claim-outside-horizon",
  ]) {
    assert.ok(resultCodes.includes(expected), expected);
  }
});

test("schedule cannot supply effect identity, deltas, or unknown semantic fields", () => {
  const schedules = structuredClone(validSchedules()) as unknown as Record<string, unknown>;
  const entries = schedules.A as Record<string, unknown>[];
  entries[0].effectDefinitionId = "increase_service_frequency";
  entries[0].driverDeltas = { accessibility: 1 };
  schedules.horizon = horizon;
  const result = validate(schedules);
  assert.deepEqual(
    result.issues.map(({ code }) => code),
    ["unknown-field", "unknown-field", "unknown-field"]
  );
});

test("rejects invalid version, policy, shape, and unknown top-level fields", () => {
  const schedules = {
    ...validSchedules(),
    version: "future",
    comparisonPolicy: "asymmetric",
    B: null,
    extra: true,
  };
  const codes = validate(schedules).issues.map(({ code }) => code);
  assert.ok(codes.includes("unknown-version"));
  assert.ok(codes.includes("unsupported-comparison-policy"));
  assert.ok(codes.includes("invalid-scenario-schedule"));
  assert.ok(codes.includes("unknown-field"));
});

test("semantic reordering is deep-equal and issue ordering is deterministic", () => {
  const first = validate(validSchedules());
  const reordered = structuredClone(validSchedules());
  reordered.A.reverse();
  reordered.B.reverse();
  assert.deepEqual(validate(reordered), first);

  const malformed = { ...validSchedules(), version: "future", extra: true };
  const once = validate(malformed);
  const twice = validate(structuredClone(malformed));
  assert.deepEqual(twice.issues, once.issues);
  assert.deepEqual(
    once.issues.map(({ path }) => path),
    [...once.issues.map(({ path }) => path)].sort()
  );
});
