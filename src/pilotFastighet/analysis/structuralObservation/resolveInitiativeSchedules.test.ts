import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resolveExecutableDomainProfile,
  type ExecutableDomainProfile,
} from "../../executableDomainProfile";
import { validateAndNormalizeStructuralObservationContractV2 } from "./validationV2";
import { validateAndNormalizeScenarioInitiativeSchedulesV1 } from "./validateInitiativeSchedules";
import {
  resolveInitiativeSchedules,
  type ResolvedScenarioInitiativeSchedulesV1,
} from "./resolveInitiativeSchedules";
import type { ValidatedStructuralObservationContractV2 } from "./contractV2";
import type { ValidatedScenarioInitiativeSchedulesV1 } from "./initiativeScheduleContract";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const horizon = 4;

function validatedInputs() {
  const contractResult = validateAndNormalizeStructuralObservationContractV2({
    profile,
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: [
        {
          id: "second-frequency-instance",
          effectDefinitionId: "increase_service_frequency",
          prerequisites: [],
          resourceClaims: [],
        },
        {
          id: "unbound",
          effectDefinitionId: "transit_signal_priority",
          prerequisites: [],
          resourceClaims: [],
        },
        {
          id: "travel-time",
          effectDefinitionId: "reduce_travel_time",
          prerequisites: [],
          resourceClaims: [],
        },
        {
          id: "first-frequency-instance",
          effectDefinitionId: "increase_service_frequency",
          prerequisites: [],
          resourceClaims: [],
        },
      ],
      resources: [],
    },
  });
  assert.equal(contractResult.valid, true);
  if (!contractResult.valid) throw new Error("Test contract must be valid.");

  const scheduleResult = validateAndNormalizeScenarioInitiativeSchedulesV1({
    contract: contractResult.value,
    horizon,
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: [
        { initiativeId: "travel-time", executionStep: 2 },
        { initiativeId: "second-frequency-instance", executionStep: 3 },
        { initiativeId: "first-frequency-instance", executionStep: 1 },
      ],
      B: [
        { initiativeId: "first-frequency-instance", executionStep: 4 },
        { initiativeId: "travel-time", executionStep: 1 },
        { initiativeId: "second-frequency-instance", executionStep: 2 },
      ],
    },
  });
  assert.equal(scheduleResult.valid, true);
  if (!scheduleResult.valid) throw new Error("Test schedules must be valid.");
  return { contract: contractResult.value, schedules: scheduleResult.value };
}

function resolve(
  overrides: Partial<{
    contract: ValidatedStructuralObservationContractV2;
    schedules: ValidatedScenarioInitiativeSchedulesV1;
    profile: ExecutableDomainProfile;
  }> = {}
): ResolvedScenarioInitiativeSchedulesV1 {
  return resolveInitiativeSchedules({
    ...validatedInputs(),
    profile,
    ...overrides,
  });
}

test("resolves A/B by InitiativeId with canonical profile effects and stable order", () => {
  const result = resolve();
  assert.deepEqual(
    result.A.map(({ scenario, initiativeId, effectDefinitionId, executionStep }) => ({
      scenario,
      initiativeId,
      effectDefinitionId,
      executionStep,
    })),
    [
      {
        scenario: "A",
        initiativeId: "first-frequency-instance",
        effectDefinitionId: "increase_service_frequency",
        executionStep: 1,
      },
      {
        scenario: "A",
        initiativeId: "travel-time",
        effectDefinitionId: "reduce_travel_time",
        executionStep: 2,
      },
      {
        scenario: "A",
        initiativeId: "second-frequency-instance",
        effectDefinitionId: "increase_service_frequency",
        executionStep: 3,
      },
    ]
  );
  assert.deepEqual(
    result.B.map(({ initiativeId, executionStep }) => ({ initiativeId, executionStep })),
    [
      { initiativeId: "travel-time", executionStep: 1 },
      { initiativeId: "second-frequency-instance", executionStep: 2 },
      { initiativeId: "first-frequency-instance", executionStep: 4 },
    ]
  );
  assert.deepEqual(result.A[0].driverDeltas, profile.actionEffects.increase_service_frequency);
  assert.deepEqual(result.A[1].driverDeltas, profile.actionEffects.reduce_travel_time);
});

test("two initiative instances sharing one effect remain separate in both scenarios", () => {
  const result = resolve();
  for (const scenario of ["A", "B"] as const) {
    const sharedEffectEntries = result[scenario].filter(
      ({ effectDefinitionId }) => effectDefinitionId === "increase_service_frequency"
    );
    assert.equal(sharedEffectEntries.length, 2);
    assert.deepEqual(
      sharedEffectEntries.map(({ initiativeId }) => initiativeId).sort(),
      ["first-frequency-instance", "second-frequency-instance"]
    );
    assert.notEqual(
      sharedEffectEntries[0].executionStep,
      sharedEffectEntries[1].executionStep
    );
    assert.notEqual(sharedEffectEntries[0].driverDeltas, sharedEffectEntries[1].driverDeltas);
  }
});

test("matches definitions by identity, ignores unbound definitions, and isolates scenarios", () => {
  const result = resolve();
  assert.equal(
    [...result.A, ...result.B].some(({ initiativeId }) => initiativeId === "unbound"),
    false
  );
  assert.equal(result.A.find(({ initiativeId }) => initiativeId === "travel-time")?.executionStep, 2);
  assert.equal(result.B.find(({ initiativeId }) => initiativeId === "travel-time")?.executionStep, 1);
});

test("semantically reordered validated arrays produce deep-equal output", () => {
  const inputs = validatedInputs();
  const reorderedContract = {
    ...inputs.contract,
    initiatives: [...inputs.contract.initiatives].reverse(),
  } as ValidatedStructuralObservationContractV2;
  const reorderedSchedules = {
    ...inputs.schedules,
    A: [...inputs.schedules.A].reverse(),
    B: [...inputs.schedules.B].reverse(),
  } as ValidatedScenarioInitiativeSchedulesV1;
  assert.deepEqual(
    resolve({ contract: reorderedContract, schedules: reorderedSchedules }),
    resolve({ contract: inputs.contract, schedules: inputs.schedules })
  );
});

test("does not mutate or freeze caller input and returns detached deeply frozen output", () => {
  const inputs = validatedInputs();
  const contract = structuredClone(inputs.contract) as ValidatedStructuralObservationContractV2;
  const schedules = structuredClone(inputs.schedules) as ValidatedScenarioInitiativeSchedulesV1;
  const beforeContract = structuredClone(contract);
  const beforeSchedules = structuredClone(schedules);
  const result = resolve({ contract, schedules });
  assert.deepEqual(contract, beforeContract);
  assert.deepEqual(schedules, beforeSchedules);
  assert.equal(Object.isFrozen(contract), false);
  assert.equal(Object.isFrozen(schedules), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.A), true);
  assert.equal(Object.isFrozen(result.A[0].driverDeltas), true);
  assert.notEqual(result.A[0].driverDeltas, profile.actionEffects.increase_service_frequency);
});

test("throws clear invariants for unknown and duplicate initiatives and mismatched sets", () => {
  const inputs = validatedInputs();
  const unknown = {
    ...inputs.schedules,
    A: [{ initiativeId: "unknown", executionStep: 1 }, ...inputs.schedules.A],
  } as ValidatedScenarioInitiativeSchedulesV1;
  assert.throws(() => resolve({ schedules: unknown }), /unknown initiative unknown/);

  const duplicate = {
    ...inputs.schedules,
    A: [...inputs.schedules.A, inputs.schedules.A[0]],
  } as ValidatedScenarioInitiativeSchedulesV1;
  assert.throws(() => resolve({ schedules: duplicate }), /duplicate initiative/);

  const mismatch = {
    ...inputs.schedules,
    B: inputs.schedules.B.slice(1),
  } as ValidatedScenarioInitiativeSchedulesV1;
  assert.throws(() => resolve({ schedules: mismatch }), /initiative sets differ/);
});

test("throws clear invariants for definitions, periods, effects, drivers, and deltas", () => {
  const inputs = validatedInputs();
  const missingDefinition = {
    ...inputs.contract,
    initiatives: inputs.contract.initiatives.filter(({ id }) => id !== "travel-time"),
  } as ValidatedStructuralObservationContractV2;
  assert.throws(() => resolve({ contract: missingDefinition }), /unknown initiative travel-time/);

  const duplicateDefinition = {
    ...inputs.contract,
    initiatives: [...inputs.contract.initiatives, inputs.contract.initiatives[0]],
  } as ValidatedStructuralObservationContractV2;
  assert.throws(() => resolve({ contract: duplicateDefinition }), /duplicate initiative definition/);

  const invalidPeriod = {
    ...inputs.schedules,
    A: [{ ...inputs.schedules.A[0], executionStep: 0 }, ...inputs.schedules.A.slice(1)],
  } as ValidatedScenarioInitiativeSchedulesV1;
  assert.throws(() => resolve({ schedules: invalidPeriod }), /invalid execution period/);

  const foreignEffect = structuredClone(inputs.contract) as unknown as {
    initiatives: Array<{ id: string; effectDefinitionId: string }>;
  };
  foreignEffect.initiatives.find(({ id }) => id === "travel-time")!.effectDefinitionId =
    "early_refinancing";
  assert.throws(
    () =>
      resolve({
        contract: foreignEffect as unknown as ValidatedStructuralObservationContractV2,
      }),
    /not supported by profile/
  );

  const unsupportedDriverProfile = structuredClone(profile) as ExecutableDomainProfile;
  (unsupportedDriverProfile.applicableDrivers as string[]).splice(
    unsupportedDriverProfile.applicableDrivers.indexOf("accessibility"),
    1
  );
  assert.throws(
    () => resolve({ profile: unsupportedDriverProfile }),
    /unsupported driver accessibility/
  );

  const nonFiniteProfile = structuredClone(profile) as ExecutableDomainProfile;
  (nonFiniteProfile.actionEffects.increase_service_frequency as Record<string, number>)[
    "accessibility"
  ] = Number.NaN;
  assert.throws(() => resolve({ profile: nonFiniteProfile }), /non-finite delta/);
});

test("production resolver has no execution, runtime, React, or persistence dependency", () => {
  const source = readFileSync(
    new URL("./resolveInitiativeSchedules.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /ScheduledAction|runCascade|RealEstateEngine|manualScheduledExecution|reactScheduled|savedRun|localStorage|React/
  );
});
