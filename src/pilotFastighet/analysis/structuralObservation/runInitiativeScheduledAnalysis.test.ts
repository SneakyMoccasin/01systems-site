import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { buildDriverScoreState } from "../../driverScoreState";
import {
  getExecutableIdentity,
  resolveExecutableDomainProfile,
} from "../../executableDomainProfile";
import { defaultRiskState } from "../../presetRiskMapping";
import { runCascadeAnalysis } from "../runCascadeAnalysis";
import {
  InitiativeScheduledAnalysisValidationError,
  runInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
} from "./runInitiativeScheduledAnalysis";

type Entry = Readonly<{
  id: string;
  effect: ActionKey;
  periodA: number;
  periodB: number;
}>;

function inputFor(
  entries: readonly Entry[],
  horizon = 36
): InitiativeScheduledAnalysisInputV1 {
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
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
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: entries.map(({ id, periodA }) => ({ initiativeId: id, executionStep: periodA })),
      B: entries.map(({ id, periodB }) => ({ initiativeId: id, executionStep: periodB })),
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  };
}

const differentialEntries = [
  { id: "maintenance", effect: "delay_maintenance", periodA: 1, periodB: 18 },
  { id: "refinancing", effect: "early_refinancing", periodA: 1, periodB: 1 },
  { id: "leases", effect: "secure_long_term_leases", periodA: 18, periodB: 1 },
] as const satisfies readonly Entry[];

function toLegacy(input: InitiativeScheduledAnalysisInputV1) {
  const definitions = new Map(
    (input.contract as { initiatives: readonly { id: string; effectDefinitionId: ActionKey }[] })
      .initiatives.map((definition) => [definition.id, definition.effectDefinitionId])
  );
  const schedules = input.schedules as {
    A: readonly { initiativeId: string; executionStep: number }[];
    B: readonly { initiativeId: string; executionStep: number }[];
  };
  const actions = (scenario: "A" | "B") =>
    schedules[scenario].map((entry) => ({
      actionId: definitions.get(entry.initiativeId) as ActionKey,
      executionStep: entry.executionStep,
    }));
  return runCascadeAnalysis({
    executionMode: "scheduled",
    profileId: input.profileId,
    horizon: input.horizon,
    scenarioA: input.initialState,
    scenarioB: input.initialState,
    baseline: input.initialState,
    scenarioAActions: actions("A"),
    scenarioBActions: actions("B"),
  });
}

test("raw V2 orchestration is exactly differential-equivalent to legacy execution", () => {
  const input = inputFor(differentialEntries);
  const actual = runInitiativeScheduledAnalysis(input);
  const legacy = toLegacy(input);

  assert.deepEqual(actual.baseline, legacy.baseline);
  assert.deepEqual(actual.scenarioA.trajectory, legacy.scenarioA.trajectory);
  assert.deepEqual(actual.scenarioB.trajectory, legacy.scenarioB.trajectory);
  assert.deepEqual(actual.scenarioA.trajectory.map((state) => state.driverScores), legacy.scenarioA.trajectory.map((state) => state.driverScores));
  assert.deepEqual(actual.scenarioB.trajectory.map((state) => state.registry), legacy.scenarioB.trajectory.map((state) => state.registry));
  assert.deepEqual(actual.scenarioA.trajectory.map((state) => state.cascadeEvents), legacy.scenarioA.trajectory.map((state) => state.cascadeEvents));
  assert.deepEqual(actual.comparison, legacy.comparison);
  assert.deepEqual(actual.scenarioA.trajectory.at(-1), legacy.scenarioA.terminalState);
  assert.deepEqual(actual.scenarioB.trajectory.at(-1), legacy.scenarioB.terminalState);
  assert.ok(actual.scenarioA.trajectory.some((state) => Object.values(state.registry).some((constraint) => constraint.lifecycle === "ACTIVE")));
  assert.ok(actual.scenarioA.trajectory.some((state) => state.cascadeEvents.length > 0));
  assert.ok(actual.scenarioA.trajectory.some((state) => state.margin === -3 || state.margin === 3));
});

test("the public result has one versioned V2 shape and canonical identity", () => {
  const result = runInitiativeScheduledAnalysis(inputFor(differentialEntries, 20));
  const profile = resolveExecutableDomainProfile("legacy-real-estate-v1", "realEstate");
  assert.equal(result.version, "initiative-scheduled-analysis-v1");
  assert.equal(result.executionMode, "initiative-schedule-v1");
  assert.deepEqual(result.executionIdentity, getExecutableIdentity(profile));
  assert.equal(result.horizon, 20);
  assert.deepEqual(Object.keys(result).sort(), [
    "baseline",
    "comparison",
    "executionIdentity",
    "executionMode",
    "horizon",
    "scenarioA",
    "scenarioB",
    "version",
  ]);
  assert.equal("executionProvenance" in result, false);
  assert.equal("contract" in result, false);
  assert.equal("schedules" in result, false);
});

test("same effect instances remain separate and apply twice", () => {
  const entries = [
    { id: "lease-1", effect: "secure_long_term_leases", periodA: 1, periodB: 2 },
    { id: "lease-2", effect: "secure_long_term_leases", periodA: 1, periodB: 2 },
  ] as const satisfies readonly Entry[];
  const result = runInitiativeScheduledAnalysis(inputFor(entries, 3));
  assert.deepEqual(
    result.scenarioA.executionProvenance.entries.map(({ initiativeId }) => initiativeId),
    ["lease-1", "lease-2"]
  );
  assert.equal(result.scenarioA.executionProvenance.entries.length, 2);
  assert.deepEqual(result.scenarioA.trajectory[0], toLegacy(inputFor(entries, 3)).scenarioA.trajectory[0]);
});

test("A and B use the same initiative set with isolated timing and state", () => {
  const result = runInitiativeScheduledAnalysis(inputFor(differentialEntries));
  assert.deepEqual(
    result.scenarioA.executionProvenance.entries.map(({ initiativeId }) => initiativeId).sort(),
    result.scenarioB.executionProvenance.entries.map(({ initiativeId }) => initiativeId).sort()
  );
  assert.notDeepEqual(result.scenarioA.executionProvenance, result.scenarioB.executionProvenance);
  assert.notStrictEqual(result.scenarioA.trajectory, result.scenarioB.trajectory);
  assert.notStrictEqual(result.scenarioA.trajectory, result.baseline.trajectory);
  assert.notStrictEqual(result.scenarioA.trajectory[0], result.scenarioB.trajectory[0]);
  assert.notStrictEqual(result.scenarioA.trajectory[0], result.baseline.trajectory[0]);
});

test("semantic contract and schedule reordering is full-result invariant", () => {
  const forward = inputFor(differentialEntries);
  const reversed = inputFor([...differentialEntries].reverse());
  assert.deepEqual(
    runInitiativeScheduledAnalysis(forward),
    runInitiativeScheduledAnalysis(reversed)
  );
});

test("input validation rejects top-level version and mode before execution", () => {
  for (const replacement of [
    { version: "wrong" },
    { executionMode: "scheduled" },
  ]) {
    assert.throws(
      () => runInitiativeScheduledAnalysis({ ...inputFor([]), ...replacement } as never),
      (error: unknown) => {
        assert.ok(error instanceof InitiativeScheduledAnalysisValidationError);
        assert.equal(error.stage, "input");
        return true;
      }
    );
  }
});

test("profile resolution rejects unknown and domain-mismatched identities", () => {
  assert.throws(
    () => runInitiativeScheduledAnalysis({ ...inputFor([]), profileId: "missing" } as never),
    /Unknown executable profile/
  );
  assert.throws(
    () => runInitiativeScheduledAnalysis({ ...inputFor([]), domainId: "municipal" }),
    /does not match domain/
  );
});

test("contract and schedule issues retain their typed validation stages", () => {
  assert.throws(
    () => runInitiativeScheduledAnalysis({ ...inputFor([]), contract: null }),
    (error: unknown) => {
      assert.ok(error instanceof InitiativeScheduledAnalysisValidationError);
      assert.equal(error.stage, "contract");
      assert.equal(error.issues[0].code, "invalid-contract");
      return true;
    }
  );
  assert.throws(
    () => runInitiativeScheduledAnalysis({ ...inputFor([]), schedules: null }),
    (error: unknown) => {
      assert.ok(error instanceof InitiativeScheduledAnalysisValidationError);
      assert.equal(error.stage, "schedule");
      assert.equal(error.issues[0].code, "invalid-schedule");
      return true;
    }
  );
});

test("one horizon governs A, B, baseline, schedules, and result", () => {
  const result = runInitiativeScheduledAnalysis(inputFor(differentialEntries, 18));
  assert.equal(result.horizon, 18);
  assert.equal(result.scenarioA.horizon, 18);
  assert.equal(result.scenarioB.horizon, 18);
  assert.equal(result.scenarioA.trajectory.length, 18);
  assert.equal(result.scenarioB.trajectory.length, 18);
  assert.equal(result.baseline.trajectory.length, 18);
});

test("caller input stays mutable while repeated results are detached and deeply frozen", () => {
  const input = inputFor(differentialEntries, 18);
  const before = structuredClone(input);
  const first = runInitiativeScheduledAnalysis(input);
  const second = runInitiativeScheduledAnalysis(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.initialState), false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.scenarioA.trajectory), true);
  assert.equal(Object.isFrozen(first.scenarioA.trajectory[0]), true);
  assert.equal(Object.isFrozen(first.baseline.trajectory), true);
  assert.notStrictEqual(first.scenarioA.trajectory, second.scenarioA.trajectory);
  assert.notStrictEqual(first.baseline.trajectory, second.baseline.trajectory);
});
