import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import {
  resolveExecutableDomainProfile,
  type ExecutableDomainProfile,
} from "../../executableDomainProfile";
import { defaultRiskState } from "../../presetRiskMapping";
import {
  runCascadeAnalysis,
  type ScheduledAction,
} from "../runCascadeAnalysis";
import { validateAndNormalizeStructuralObservationContractV2 } from "./validationV2";
import { validateAndNormalizeScenarioInitiativeSchedulesV1 } from "./validateInitiativeSchedules";
import {
  resolveInitiativeSchedules,
  type ResolvedScenarioInitiativeSchedulesV1,
} from "./resolveInitiativeSchedules";
import { runInitiativeScenario } from "./runInitiativeScenario";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");

type FixtureEntry = Readonly<{
  id: string;
  effect: ActionKey;
  periodA: number;
  periodB?: number;
}>;

function resolveFixture(
  entries: readonly FixtureEntry[],
  horizon: number
): ResolvedScenarioInitiativeSchedulesV1 {
  const contractResult = validateAndNormalizeStructuralObservationContractV2({
    profile,
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: entries.map(({ id, effect }) => ({
        id,
        effectDefinitionId: effect,
        prerequisites: [],
        resourceClaims: [],
      })),
      resources: [],
    },
  });
  assert.equal(contractResult.valid, true);
  if (!contractResult.valid) throw new Error("Fixture contract must be valid");
  const schedulesResult = validateAndNormalizeScenarioInitiativeSchedulesV1({
    contract: contractResult.value,
    horizon,
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: entries.map(({ id, periodA }) => ({ initiativeId: id, executionStep: periodA })),
      B: entries.map(({ id, periodA, periodB }) => ({
        initiativeId: id,
        executionStep: periodB ?? periodA,
      })),
    },
  });
  assert.equal(schedulesResult.valid, true);
  if (!schedulesResult.valid) throw new Error("Fixture schedules must be valid");
  return resolveInitiativeSchedules({
    contract: contractResult.value,
    schedules: schedulesResult.value,
    profile,
  });
}

function run(
  resolvedSchedules: ResolvedScenarioInitiativeSchedulesV1,
  horizon: number,
  scenario: "A" | "B" = "A",
  executableProfile: ExecutableDomainProfile = profile
) {
  return runInitiativeScenario({
    scenario,
    resolvedSchedules,
    profile: executableProfile,
    initialState: { initialRiskState: defaultRiskState },
    horizon,
  });
}

test("empty schedule uses canonical empty-period semantics for the complete horizon", () => {
  const horizon = 5;
  const resolved = resolveFixture([], horizon);
  const initiativeResult = run(resolved, horizon);
  const legacy = runCascadeAnalysis({
    executionMode: "scheduled",
    profileId: profile.profileId,
    horizon,
    scenarioA: { initialRiskState: defaultRiskState },
    scenarioB: { initialRiskState: defaultRiskState },
    scenarioAActions: [],
    scenarioBActions: [],
  });
  assert.deepEqual(initiativeResult.trajectory, legacy.scenarioA.trajectory);
  assert.equal(initiativeResult.trajectory.length, horizon);
  assert.deepEqual(initiativeResult.trajectory.map(({ step }) => step), [1, 2, 3, 4, 5]);
  assert.deepEqual(initiativeResult.executionProvenance.entries, []);
});

test("executes one initiative at M1, a middle period, and the final period", () => {
  for (const executionPeriod of [1, 3, 5]) {
    const result = run(
      resolveFixture([
        { id: `initiative-${executionPeriod}`, effect: "reduce_travel_time", periodA: executionPeriod },
      ], 5),
      5
    );
    assert.equal(result.executionProvenance.entries.length, 1);
    assert.equal(result.executionProvenance.entries[0].scheduledExecutionPeriod, executionPeriod);
    assert.equal(result.executionProvenance.entries[0].actualExecutionPeriod, executionPeriod);
    assert.equal(result.trajectory.length, 5);
  }
});

test("collects every initiative across different and shared periods", () => {
  const resolved = resolveFixture([
    { id: "first", effect: "reduce_travel_time", periodA: 1 },
    { id: "middle-a", effect: "increase_service_frequency", periodA: 3 },
    { id: "middle-b", effect: "transit_signal_priority", periodA: 3 },
    { id: "last", effect: "expand_cycling_infrastructure", periodA: 6 },
  ], 6);
  const result = run(resolved, 6);
  assert.deepEqual(
    result.executionProvenance.entries.map(({ initiativeId, actualExecutionPeriod }) => ({ initiativeId, actualExecutionPeriod })),
    [
      { initiativeId: "first", actualExecutionPeriod: 1 },
      { initiativeId: "middle-a", actualExecutionPeriod: 3 },
      { initiativeId: "middle-b", actualExecutionPeriod: 3 },
      { initiativeId: "last", actualExecutionPeriod: 6 },
    ]
  );
  assert.deepEqual(result.trajectory.map(({ step }) => step), [1, 2, 3, 4, 5, 6]);
});

test("real V2 resolution preserves two same-effect instances and doubles their effect", () => {
  const resolved = resolveFixture([
    { id: "frequency-a", effect: "increase_service_frequency", periodA: 1 },
    { id: "frequency-b", effect: "increase_service_frequency", periodA: 1 },
  ], 2);
  const result = run(resolved, 2);
  assert.deepEqual(
    result.executionProvenance.entries.map(({ initiativeId }) => initiativeId),
    ["frequency-a", "frequency-b"]
  );
  const initialScore = 1;
  const delta = profile.actionEffects.increase_service_frequency.operational_capacity ?? 0;
  assert.equal(result.trajectory[0].driverScores.operational_capacity, initialScore + delta * 2);
  assert.equal(result.trajectory[0].step, 1);
});

test("same effect in different periods remains separate and persists once per execution", () => {
  const result = run(resolveFixture([
    { id: "first", effect: "transit_signal_priority", periodA: 1 },
    { id: "second", effect: "transit_signal_priority", periodA: 3 },
  ], 4), 4);
  assert.deepEqual(
    result.executionProvenance.entries.map(({ initiativeId, actualExecutionPeriod }) => [initiativeId, actualExecutionPeriod]),
    [["first", 1], ["second", 3]]
  );
  assert.equal(result.trajectory[0].driverScores.transit_signal_priority, 2);
  assert.equal(result.trajectory[1].driverScores.transit_signal_priority, 2);
  assert.equal(result.trajectory[2].driverScores.transit_signal_priority, 3);
});

test("is exactly differential-equivalent to legacy for unique canonical actions", () => {
  const horizon = 8;
  const entries = [
    { id: "travel", effect: "reduce_travel_time", periodA: 1 },
    { id: "frequency", effect: "increase_service_frequency", periodA: 3 },
    { id: "cycling", effect: "expand_cycling_infrastructure", periodA: 3 },
    { id: "signals", effect: "transit_signal_priority", periodA: 8 },
  ] as const;
  const initiativeResult = run(resolveFixture(entries, horizon), horizon);
  const actions: ScheduledAction[] = entries.map(({ effect, periodA }) => ({
    actionId: effect,
    executionStep: periodA,
  }));
  const legacy = runCascadeAnalysis({
    executionMode: "scheduled",
    profileId: profile.profileId,
    horizon,
    scenarioA: { initialRiskState: defaultRiskState },
    scenarioB: { initialRiskState: defaultRiskState },
    scenarioAActions: actions,
    scenarioBActions: [],
  });
  assert.deepEqual(initiativeResult.trajectory, legacy.scenarioA.trajectory);
  assert.deepEqual(
    initiativeResult.executionProvenance.entries.map((entry) => ({
      actionId: entry.effectDefinitionId,
      scheduledStep: entry.scheduledExecutionPeriod,
      actualExecutionStep: entry.actualExecutionPeriod,
      appliedDriverDeltas: entry.appliedDriverDeltas,
    })),
    legacy.executionProvenance
      .filter(({ scenario }) => scenario === "scenarioA")
      .map((entry) => ({
        actionId: entry.actionId,
        scheduledStep: entry.scheduledStep,
        actualExecutionStep: entry.actualExecutionStep,
        appliedDriverDeltas: entry.appliedDriverDeltas,
      }))
  );
});

test("semantic input reordering and repeated runs are deep-equal", () => {
  const resolved = resolveFixture([
    { id: "zeta", effect: "reduce_travel_time", periodA: 2 },
    { id: "alpha", effect: "increase_service_frequency", periodA: 2 },
  ], 4);
  const reordered = {
    ...resolved,
    A: [...resolved.A].reverse(),
  } as ResolvedScenarioInitiativeSchedulesV1;
  assert.deepEqual(run(resolved, 4), run(reordered, 4));
  assert.deepEqual(run(resolved, 4), run(resolved, 4));
});

test("rejects invalid resolved schedules before execution", () => {
  const resolved = resolveFixture([
    { id: "one", effect: "reduce_travel_time", periodA: 1 },
  ], 3);
  const entry = resolved.A[0];
  const cases = [
    { A: [{ ...entry, scenario: "B" as const }], expected: /scenario mismatch/ },
    { A: [entry, entry], expected: /duplicate initiative/ },
    { A: [{ ...entry, executionStep: 4 }], expected: /outside horizon/ },
    { A: [{ ...entry, driverDeltas: { accessibility: 99 } }], expected: /non-canonical driver deltas/ },
  ];
  for (const { A, expected } of cases) {
    assert.throws(
      () => run({ ...resolved, A } as ResolvedScenarioInitiativeSchedulesV1, 3),
      expected
    );
  }
});

test("transition failure returns no partial result and leaves caller input unchanged", () => {
  const resolved = resolveFixture([], 2);
  const before = structuredClone(resolved);
  const failingProfile = {
    ...profile,
    propagationRules: new Proxy({}, {
      ownKeys() {
        throw new Error("forced transition failure");
      },
    }),
  } as ExecutableDomainProfile;
  let returned = false;
  assert.throws(() => {
    run(resolved, 2, "A", failingProfile);
    returned = true;
  }, /forced transition failure/);
  assert.equal(returned, false);
  assert.deepEqual(resolved, before);
});

test("returns detached deeply frozen output without mutating or freezing caller input", () => {
  const canonical = resolveFixture([
    { id: "one", effect: "reduce_travel_time", periodA: 1, periodB: 2 },
  ], 3);
  const resolved = structuredClone(canonical) as ResolvedScenarioInitiativeSchedulesV1;
  const initialState = { initialRiskState: structuredClone(defaultRiskState) };
  const beforeResolved = structuredClone(resolved);
  const beforeInitial = structuredClone(initialState);
  const resultA = runInitiativeScenario({ scenario: "A", resolvedSchedules: resolved, profile, initialState, horizon: 3 });
  const resultB = runInitiativeScenario({ scenario: "B", resolvedSchedules: resolved, profile, initialState, horizon: 3 });
  assert.deepEqual(resolved, beforeResolved);
  assert.deepEqual(initialState, beforeInitial);
  assert.equal(Object.isFrozen(resolved), false);
  assert.equal(Object.isFrozen(initialState), false);
  assert.equal(Object.isFrozen(resultA), true);
  assert.equal(Object.isFrozen(resultA.trajectory), true);
  assert.equal(Object.isFrozen(resultA.trajectory[0]), true);
  assert.equal(Object.isFrozen(resultA.executionProvenance), true);
  assert.notEqual(resultA.trajectory[0], resultB.trajectory[0]);
  assert.notEqual(resultA.executionProvenance, resultB.executionProvenance);
  assert.equal(resultA.scenario, "A");
  assert.equal(resultB.scenario, "B");
});

test("runner source remains internal and contains no forbidden integration", () => {
  const source = readFileSync(__filename.replace(/\.test\.ts$/, ".ts"), "utf8");
  assert.doesNotMatch(source, /React|localStorage|saved.?run|DecisionSpace|fingerprint|runCascadeAnalysis|ScheduledAction\[\]|enforce/i);
});
