import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import { resolveInitiativeSchedules } from "./resolveInitiativeSchedules";
import { validateAndNormalizeStructuralObservationContractV2 } from "./validationV2";
import { validateAndNormalizeScenarioInitiativeSchedulesV1 } from "./validateInitiativeSchedules";
import {
  assertInitiativeExecutionMatchesResolved,
  createInitiativeExecutionProvenance,
  type InitiativeExecutionRecordV1,
} from "./initiativeExecutionProvenance";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const horizon = 4;

function resolvedSchedules() {
  const contract = validateAndNormalizeStructuralObservationContractV2({
    profile,
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: [
        {
          id: "frequency-late",
          effectDefinitionId: "increase_service_frequency",
          prerequisites: [],
          resourceClaims: [],
        },
        {
          id: "frequency-early",
          effectDefinitionId: "increase_service_frequency",
          prerequisites: [],
          resourceClaims: [],
        },
        {
          id: "travel-time",
          effectDefinitionId: "reduce_travel_time",
          prerequisites: [],
          resourceClaims: [],
        },
      ],
      resources: [],
    },
  });
  assert.equal(contract.valid, true);
  if (!contract.valid) throw new Error("Test contract must be valid.");
  const schedules = validateAndNormalizeScenarioInitiativeSchedulesV1({
    contract: contract.value,
    horizon,
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: [
        { initiativeId: "frequency-late", executionStep: 3 },
        { initiativeId: "travel-time", executionStep: 2 },
        { initiativeId: "frequency-early", executionStep: 1 },
      ],
      B: [
        { initiativeId: "frequency-early", executionStep: 4 },
        { initiativeId: "frequency-late", executionStep: 2 },
        { initiativeId: "travel-time", executionStep: 1 },
      ],
    },
  });
  assert.equal(schedules.valid, true);
  if (!schedules.valid) throw new Error("Test schedules must be valid.");
  return resolveInitiativeSchedules({
    contract: contract.value,
    schedules: schedules.value,
    profile,
  });
}

function execution(
  scenario: "A" | "B",
  initiativeId: string,
  actualExecutionPeriod: number
) {
  const resolved = resolvedSchedules()[scenario].find(
    (entry) => entry.initiativeId === initiativeId
  );
  assert.ok(resolved);
  return {
    scenario,
    initiativeId,
    effectDefinitionId: resolved.effectDefinitionId,
    scheduledExecutionPeriod: resolved.executionStep,
    actualExecutionPeriod,
    appliedDriverDeltas: { ...resolved.driverDeltas },
  };
}

function create(entries: readonly unknown[]) {
  return createInitiativeExecutionProvenance({
    resolvedSchedules: resolvedSchedules(),
    provenance: {
      version: "initiative-execution-provenance-v1",
      entries,
    },
  });
}

test("creates canonical A/B provenance with planned and actual periods kept separate", () => {
  const result = create([
    execution("B", "frequency-late", 4),
    execution("A", "travel-time", 3),
    execution("A", "frequency-early", 1),
    execution("B", "travel-time", 1),
  ]);
  assert.deepEqual(
    result.entries.map(
      ({ scenario, initiativeId, scheduledExecutionPeriod, actualExecutionPeriod }) => ({
        scenario,
        initiativeId,
        scheduledExecutionPeriod,
        actualExecutionPeriod,
      })
    ),
    [
      {
        scenario: "A",
        initiativeId: "frequency-early",
        scheduledExecutionPeriod: 1,
        actualExecutionPeriod: 1,
      },
      {
        scenario: "A",
        initiativeId: "travel-time",
        scheduledExecutionPeriod: 2,
        actualExecutionPeriod: 3,
      },
      {
        scenario: "B",
        initiativeId: "travel-time",
        scheduledExecutionPeriod: 1,
        actualExecutionPeriod: 1,
      },
      {
        scenario: "B",
        initiativeId: "frequency-late",
        scheduledExecutionPeriod: 2,
        actualExecutionPeriod: 4,
      },
    ]
  );
});

test("same effect instances stay separate and match resolved entries by InitiativeId", () => {
  const result = create([
    execution("A", "frequency-late", 3),
    execution("A", "frequency-early", 2),
    execution("B", "frequency-early", 4),
    execution("B", "frequency-late", 2),
  ]);
  assert.equal(result.entries.length, 4);
  assert.deepEqual(
    result.entries.map(({ scenario, initiativeId, scheduledExecutionPeriod }) => ({
      scenario,
      initiativeId,
      scheduledExecutionPeriod,
    })),
    [
      { scenario: "A", initiativeId: "frequency-early", scheduledExecutionPeriod: 1 },
      { scenario: "A", initiativeId: "frequency-late", scheduledExecutionPeriod: 3 },
      { scenario: "B", initiativeId: "frequency-late", scheduledExecutionPeriod: 2 },
      { scenario: "B", initiativeId: "frequency-early", scheduledExecutionPeriod: 4 },
    ]
  );
});

test("allows one record per scenario for the same initiative without mixing them", () => {
  const result = create([
    execution("B", "travel-time", 2),
    execution("A", "travel-time", 4),
  ]);
  assert.deepEqual(
    result.entries.map(({ scenario, scheduledExecutionPeriod, actualExecutionPeriod }) => ({
      scenario,
      scheduledExecutionPeriod,
      actualExecutionPeriod,
    })),
    [
      { scenario: "A", scheduledExecutionPeriod: 2, actualExecutionPeriod: 4 },
      { scenario: "B", scheduledExecutionPeriod: 1, actualExecutionPeriod: 2 },
    ]
  );
});

test("input ordering is irrelevant and output is detached and deeply frozen", () => {
  const entries = [
    execution("B", "frequency-late", 4),
    execution("A", "travel-time", 3),
    execution("A", "frequency-early", 1),
  ];
  const before = structuredClone(entries);
  const first = create(entries);
  const second = create([...entries].reverse());
  assert.deepEqual(second, first);
  assert.deepEqual(entries, before);
  assert.equal(Object.isFrozen(entries), false);
  assert.equal(Object.isFrozen(entries[0].appliedDriverDeltas), false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.entries), true);
  assert.equal(Object.isFrozen(first.entries[0].appliedDriverDeltas), true);
  assert.notEqual(first.entries[0].appliedDriverDeltas, entries[2].appliedDriverDeltas);
});

test("rejects duplicate and contradictory records in one scenario", () => {
  const first = execution("A", "travel-time", 2);
  assert.throws(() => create([first, first]), /duplicate or contradictory provenance/);
  assert.throws(
    () => create([first, { ...first, actualExecutionPeriod: 3 }]),
    /duplicate or contradictory provenance/
  );
});

test("rejects version, scenario, identity, effect, and period contradictions", () => {
  const resolved = resolvedSchedules();
  const valid = execution("A", "travel-time", 2);
  assert.throws(
    () =>
      createInitiativeExecutionProvenance({
        resolvedSchedules: resolved,
        provenance: { version: "future", entries: [valid] },
      }),
    /unsupported provenance version/
  );
  assert.throws(() => create([{ ...valid, scenario: "C" }]), /scenario must be A or B/);
  assert.throws(() => create([{ ...valid, initiativeId: "" }]), /non-empty identifier/);
  assert.throws(
    () => create([{ ...valid, initiativeId: "missing" }]),
    /is not resolved/
  );
  assert.throws(
    () => create([{ ...valid, effectDefinitionId: "" }]),
    /non-empty identifier/
  );
  assert.throws(
    () => create([{ ...valid, effectDefinitionId: "increase_service_frequency" }]),
    /effect definition mismatch/
  );
  assert.throws(
    () => create([{ ...valid, scheduledExecutionPeriod: 1 }]),
    /scheduled period mismatch/
  );
  assert.throws(
    () => create([{ ...valid, scheduledExecutionPeriod: 0 }]),
    /positive integer model period/
  );
  assert.throws(
    () => create([{ ...valid, actualExecutionPeriod: 0 }]),
    /positive integer model period/
  );
});

test("rejects non-finite or non-canonical applied deltas", () => {
  const valid = execution("A", "frequency-early", 1);
  assert.throws(
    () =>
      create([
        {
          ...valid,
          appliedDriverDeltas: { ...valid.appliedDriverDeltas, accessibility: Number.NaN },
        },
      ]),
    /must be a finite number/
  );
  assert.throws(
    () => create([{ ...valid, appliedDriverDeltas: { accessibility: 1 } }]),
    /applied driver deltas mismatch/
  );
});

test("rejects unknown semantic fields rather than leaking them", () => {
  const valid = execution("A", "travel-time", 2);
  assert.throws(
    () =>
      createInitiativeExecutionProvenance({
        resolvedSchedules: resolvedSchedules(),
        provenance: {
          version: "initiative-execution-provenance-v1",
          entries: [valid],
          runtimeState: "hidden",
        },
      }),
    /unknown field provenance.runtimeState/
  );
  assert.throws(
    () => create([{ ...valid, actionKey: "reduce_travel_time" }]),
    /unknown field provenance.entries\[0\].actionKey/
  );
});

test("exported matcher rejects initiative-instance confusion directly", () => {
  const schedules = resolvedSchedules();
  const executionRecord = execution(
    "A",
    "frequency-early",
    1
  ) as InitiativeExecutionRecordV1;
  const otherInstance = schedules.A.find(
    ({ initiativeId }) => initiativeId === "frequency-late"
  );
  assert.ok(otherInstance);
  assert.throws(
    () => assertInitiativeExecutionMatchesResolved(executionRecord, otherInstance),
    /initiative mismatch/
  );
});

test("production module has no engine, runner, runtime, React, or persistence dependency", () => {
  const source = readFileSync(
    new URL("./initiativeExecutionProvenance.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /ScheduledAction|runCascade|RealEstateEngine|manualScheduledExecution|savedRun|localStorage|from ["']react|from ["']next/
  );
});
