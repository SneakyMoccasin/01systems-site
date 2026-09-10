import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { ScheduledActionExecution } from "../runCascadeAnalysis";
import type {
  ScenarioExecutionProvenance,
  ScenarioSchedules,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import { assessStructuralStartsForPeriod } from "./assessStructuralStarts";
import type { DisplayedPeriod } from "./contract";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";
import { resolveStructuralScenarioPlans } from "./resolveScenarioPlans";
import { validateAndNormalizeStructuralObservationContract } from "./validation";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");

type InitiativeInput = {
  id: string;
  actionKey: ActionKey;
  prerequisites: Array<{ initiativeId: string; type: "finish-to-start" }>;
  resourceClaims: Array<{ resourceId: string; amount: number; durationPeriods: number }>;
};

function initiative(
  id: string,
  actionKey: ActionKey,
  options: {
    prerequisites?: string[];
    claims?: Array<{ resourceId: string; amount: number; durationPeriods: number }>;
  } = {}
): InitiativeInput {
  return {
    id,
    actionKey,
    prerequisites: (options.prerequisites ?? []).map((initiativeId) => ({
      initiativeId,
      type: "finish-to-start",
    })),
    resourceClaims: options.claims ?? [],
  };
}

function execution(
  scenario: ScheduleScenarioId,
  actionId: ActionKey,
  period: number
): ScheduledActionExecution {
  return {
    scenario: scenario === "A" ? "scenarioA" : "scenarioB",
    actionId,
    scheduledStep: period,
    actualExecutionStep: period,
    appliedDriverDeltas: {},
  };
}

function setup(input: {
  initiatives: InitiativeInput[];
  resources?: Array<{ id: string; capacity: { type: "constant"; amount: number } }>;
  bindings: Array<{ scenario: ScheduleScenarioId; initiativeId: string }>;
  schedules: ScenarioSchedules;
}) {
  const validated = validateAndNormalizeStructuralObservationContract({
    contract: {
      version: "structural-observation-v1",
      initiatives: input.initiatives,
      resources: input.resources ?? [],
      scenarioBindings: input.bindings,
    },
    schedules: input.schedules,
    horizon: 8,
    profile,
  });
  assert.equal(validated.valid, true, validated.valid ? undefined : JSON.stringify(validated.issues));
  if (!validated.valid) throw new Error("Combined assessment setup must validate.");
  return {
    contract: validated.value,
    plans: resolveStructuralScenarioPlans({ contract: validated.value, schedules: input.schedules }),
  };
}

const none: ScenarioExecutionProvenance = { A: [], B: [] };

test("a current starter without prerequisites or claims is eligible", () => {
  const { contract, plans } = setup({
    initiatives: [initiative("start", "increase_service_frequency")],
    bindings: [{ scenario: "A", initiativeId: "start" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }], B: [] },
  });
  assert.deepEqual(assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod, provenance: none }), [
    { initiativeId: "start", scenario: "A", evaluatedAtPeriod: 2, outcome: "eligible", blockingReasons: [] },
  ]);
});

test("dependency-only and resource-only failures produce canonical reasons", () => {
  const dependency = setup({
    initiatives: [initiative("prerequisite", "reduce_travel_time"), initiative("dependent", "increase_service_frequency", { prerequisites: ["prerequisite"] })],
    bindings: [{ scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }], B: [] },
  });
  const dependencyResult = assessStructuralStartsForPeriod({ contract: dependency.contract, scenarioPlan: dependency.plans.A, period: 2 as DisplayedPeriod, provenance: none })[0];
  assert.equal(dependencyResult.outcome, "would-be-blocked");
  assert.deepEqual(dependencyResult.blockingReasons.map(({ code }) => code), ["prerequisite-not-planned"]);

  const resource = setup({
    initiatives: [initiative("start", "increase_service_frequency", { claims: [{ resourceId: "team", amount: 2, durationPeriods: 1 }] })],
    resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
    bindings: [{ scenario: "A", initiativeId: "start" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }], B: [] },
  });
  const resourceResult = assessStructuralStartsForPeriod({ contract: resource.contract, scenarioPlan: resource.plans.A, period: 2 as DisplayedPeriod, provenance: none })[0];
  assert.deepEqual(resourceResult.blockingReasons, [{ code: "resource-overallocated", resourceId: "team", period: 2, capacity: 1, demandIncludingCurrentStarts: 2, overallocatedBy: 1 }]);
});

test("combines multiple dependency and resource reasons in canonical order", () => {
  const { contract, plans } = setup({
    initiatives: [
      initiative("z-prerequisite", "reduce_travel_time"),
      initiative("a-prerequisite", "expand_cycling_infrastructure"),
      initiative("dependent", "increase_service_frequency", {
        prerequisites: ["z-prerequisite", "a-prerequisite"],
        claims: [
          { resourceId: "z-resource", amount: 2, durationPeriods: 1 },
          { resourceId: "a-resource", amount: 2, durationPeriods: 1 },
        ],
      }),
    ],
    resources: [{ id: "z-resource", capacity: { type: "constant", amount: 1 } }, { id: "a-resource", capacity: { type: "constant", amount: 1 } }],
    bindings: [{ scenario: "A", initiativeId: "a-prerequisite" }, { scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "expand_cycling_infrastructure", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 3 }], B: [] },
  });
  const result = assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: none })[0];
  assert.deepEqual(result.blockingReasons.map((reason) => reason.code === "resource-overallocated" ? `${reason.code}:${reason.resourceId}` : `${reason.code}:${reason.prerequisiteInitiativeId}`), [
    "prerequisite-not-planned:z-prerequisite",
    "prerequisite-not-completed-before-start:a-prerequisite",
    "resource-overallocated:a-resource",
    "resource-overallocated:z-resource",
  ]);
});

test("contributors, non-claiming starters, earlier starters, future and unbound initiatives are not falsely assessed", () => {
  const { contract, plans } = setup({
    initiatives: [
      initiative("past", "reduce_travel_time", { claims: [{ resourceId: "team", amount: 3, durationPeriods: 3 }] }),
      initiative("current-no-claim", "increase_service_frequency"),
      initiative("future", "expand_cycling_infrastructure"),
      initiative("unbound", "reduce_travel_time"),
    ],
    resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
    bindings: [{ scenario: "A", initiativeId: "past" }, { scenario: "A", initiativeId: "current-no-claim" }, { scenario: "A", initiativeId: "future" }],
    schedules: { A: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 2 }, { actionId: "expand_cycling_infrastructure", executionStep: 5 }], B: [] },
  });
  const result = assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod, provenance: none });
  assert.deepEqual(result.map(({ initiativeId, outcome }) => [initiativeId, outcome]), [["current-no-claim", "eligible"]]);
  assert.deepEqual(assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance: none }), []);
});

test("all simultaneous starters on an overallocated resource are marked without priority", () => {
  const { contract, plans } = setup({
    initiatives: [initiative("z", "increase_service_frequency", { claims: [{ resourceId: "team", amount: 1, durationPeriods: 1 }] }), initiative("a", "reduce_travel_time", { claims: [{ resourceId: "team", amount: 1, durationPeriods: 1 }] })],
    resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
    bindings: [{ scenario: "A", initiativeId: "z" }, { scenario: "A", initiativeId: "a" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }, { actionId: "reduce_travel_time", executionStep: 2 }], B: [] },
  });
  const result = assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 2 as DisplayedPeriod, provenance: none });
  assert.deepEqual(result.map(({ initiativeId, outcome }) => [initiativeId, outcome]), [["a", "would-be-blocked"], ["z", "would-be-blocked"]]);
});

test("exact capacity and epsilon-safe excess create no resource reason", () => {
  for (const claimAmount of [1, 1 + 5e-10]) {
    const { contract, plans } = setup({
      initiatives: [initiative("start", "increase_service_frequency", { claims: [{ resourceId: "team", amount: claimAmount, durationPeriods: 1 }] })],
      resources: [{ id: "team", capacity: { type: "constant", amount: 1 } }],
      bindings: [{ scenario: "A", initiativeId: "start" }],
      schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 1 }], B: [] },
    });
    assert.equal(assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 1 as DisplayedPeriod, provenance: none })[0].outcome, "eligible");
  }
});

test("A/B remain isolated and same/future provenance cannot satisfy dependencies", () => {
  const { contract, plans } = setup({
    initiatives: [initiative("prerequisite", "reduce_travel_time"), initiative("dependent", "increase_service_frequency", { prerequisites: ["prerequisite"] })],
    bindings: [{ scenario: "A", initiativeId: "prerequisite" }, { scenario: "A", initiativeId: "dependent" }, { scenario: "B", initiativeId: "prerequisite" }, { scenario: "B", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 3 }], B: [{ actionId: "reduce_travel_time", executionStep: 3 }, { actionId: "increase_service_frequency", executionStep: 3 }] },
  });
  const provenance = { A: [execution("A", "reduce_travel_time", 1)], B: [execution("B", "reduce_travel_time", 3)] };
  assert.equal(assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance })[0].outcome, "eligible");
  const blocked = assessStructuralStartsForPeriod({ contract, scenarioPlan: plans.B, period: 3 as DisplayedPeriod, provenance })[0];
  assert.equal(blocked.outcome, "would-be-blocked");
  assert.equal("priorActualExecutionPeriod" in blocked.blockingReasons[0] && blocked.blockingReasons[0].priorActualExecutionPeriod, null);
});

test("reordered input is deep-equal, caller input is unchanged, and output is deeply frozen", () => {
  const input = {
    initiatives: [
      initiative("z-prerequisite", "reduce_travel_time"),
      initiative("a-prerequisite", "expand_cycling_infrastructure"),
      initiative("start", "increase_service_frequency", {
        prerequisites: ["z-prerequisite", "a-prerequisite"],
        claims: [
          { resourceId: "z-resource", amount: 1, durationPeriods: 1 },
          { resourceId: "a-resource", amount: 1, durationPeriods: 1 },
        ],
      }),
    ],
    resources: [
      { id: "z-resource", capacity: { type: "constant" as const, amount: 2 } },
      { id: "a-resource", capacity: { type: "constant" as const, amount: 2 } },
    ],
    bindings: [
      { scenario: "A" as const, initiativeId: "z-prerequisite" },
      { scenario: "A" as const, initiativeId: "a-prerequisite" },
      { scenario: "A" as const, initiativeId: "start" },
    ],
    schedules: {
      A: [
        { actionId: "reduce_travel_time" as const, executionStep: 1 },
        { actionId: "expand_cycling_infrastructure" as const, executionStep: 2 },
        { actionId: "increase_service_frequency" as const, executionStep: 3 },
      ],
      B: [],
    },
  };
  const before = structuredClone(input);
  const first = setup(input);
  const second = setup({
    ...input,
    initiatives: [...input.initiatives]
      .reverse()
      .map((entry) => ({
        ...entry,
        prerequisites: [...entry.prerequisites].reverse(),
        resourceClaims: [...entry.resourceClaims].reverse(),
      })),
    resources: [...input.resources].reverse(),
    bindings: [...input.bindings].reverse(),
    schedules: { A: [...input.schedules.A].reverse(), B: [] },
  });
  const provenance: ScenarioExecutionProvenance = {
    A: [
      execution("A", "reduce_travel_time", 1),
      execution("A", "expand_cycling_infrastructure", 2),
    ],
    B: [],
  };
  const result = assessStructuralStartsForPeriod({ contract: first.contract, scenarioPlan: first.plans.A, period: 3 as DisplayedPeriod, provenance });
  const reorderedPlan = {
    ...second.plans.A,
    initiatives: [...second.plans.A.initiatives].reverse(),
  } as ResolvedStructuralScenarioPlan;
  const reorderedProvenance = { A: [...provenance.A].reverse(), B: [] };
  const reordered = assessStructuralStartsForPeriod({ contract: second.contract, scenarioPlan: reorderedPlan, period: 3 as DisplayedPeriod, provenance: reorderedProvenance });
  assert.deepEqual(result, reordered);
  assert.deepEqual(input, before);
  assert.deepEqual(provenance.A.map(({ actionId }) => actionId), ["reduce_travel_time", "expand_cycling_infrastructure"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result[0]), true);
  assert.equal(Object.isFrozen(result[0].blockingReasons), true);
});

test("combined invariants reject duplicate current assessments", () => {
  const { contract, plans } = setup({
    initiatives: [initiative("start", "increase_service_frequency")],
    bindings: [{ scenario: "A", initiativeId: "start" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 2 }], B: [] },
  });
  const duplicatedPlan = {
    ...plans.A,
    initiatives: [plans.A.initiatives[0], plans.A.initiatives[0]],
  } as ResolvedStructuralScenarioPlan;
  assert.throws(
    () => assessStructuralStartsForPeriod({ contract, scenarioPlan: duplicatedPlan, period: 2 as DisplayedPeriod, provenance: none }),
    /must cover every current starter exactly once/
  );
});
