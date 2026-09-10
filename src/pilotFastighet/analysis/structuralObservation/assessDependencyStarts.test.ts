import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { ActionKey } from "../../actionEffects";
import type {
  ScenarioExecutionProvenance,
  ScenarioSchedules,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import type { ScheduledActionExecution } from "../runCascadeAnalysis";
import { assessDependencyStartsForPeriod } from "./assessDependencyStarts";
import type { DisplayedPeriod } from "./contract";
import { resolveStructuralScenarioPlans } from "./resolveScenarioPlans";
import { validateAndNormalizeStructuralObservationContract } from "./validation";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");

type InitiativeInput = {
  id: string;
  actionKey: ActionKey;
  prerequisites: Array<{ initiativeId: string; type: "finish-to-start" }>;
  resourceClaims: never[];
};

function initiative(
  id: string,
  actionKey: ActionKey,
  prerequisites: string[] = []
): InitiativeInput {
  return {
    id,
    actionKey,
    prerequisites: prerequisites.map((initiativeId) => ({
      initiativeId,
      type: "finish-to-start",
    })),
    resourceClaims: [],
  };
}

function execution(
  scenario: ScheduleScenarioId,
  actionId: ActionKey,
  actualExecutionStep: number
): ScheduledActionExecution {
  return {
    scenario: scenario === "A" ? "scenarioA" : "scenarioB",
    actionId,
    scheduledStep: actualExecutionStep,
    actualExecutionStep,
    appliedDriverDeltas: {},
  };
}

function setup(input: {
  initiatives: InitiativeInput[];
  bindings: Array<{ scenario: ScheduleScenarioId; initiativeId: string }>;
  schedules: ScenarioSchedules;
}) {
  const validation = validateAndNormalizeStructuralObservationContract({
    contract: {
      version: "structural-observation-v1",
      initiatives: input.initiatives,
      resources: [],
      scenarioBindings: input.bindings,
    },
    schedules: input.schedules,
    horizon: 8,
    profile,
  });
  assert.equal(
    validation.valid,
    true,
    validation.valid ? undefined : JSON.stringify(validation.issues)
  );
  if (!validation.valid) throw new Error("Test setup must validate.");
  return resolveStructuralScenarioPlans({
    contract: validation.value,
    schedules: input.schedules,
  });
}

const emptyProvenance: ScenarioExecutionProvenance = { A: [], B: [] };

test("a current starter without prerequisites is eligible", () => {
  const plans = setup({
    initiatives: [initiative("start", "increase_service_frequency")],
    bindings: [{ scenario: "A", initiativeId: "start" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 3 }], B: [] },
  });
  assert.deepEqual(
    assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: emptyProvenance }),
    [{ initiativeId: "start", scenario: "A", evaluatedAtPeriod: 3, outcome: "eligible", blockingReasons: [] }]
  );
});

test("only earlier actual provenance completes a prerequisite", () => {
  const plans = setup({
    initiatives: [
      initiative("prerequisite", "reduce_travel_time"),
      initiative("dependent", "increase_service_frequency", ["prerequisite"]),
    ],
    bindings: [
      { scenario: "A", initiativeId: "prerequisite" },
      { scenario: "A", initiativeId: "dependent" },
    ],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 4 }, { actionId: "reduce_travel_time", executionStep: 2 }], B: [] },
  });
  const result = assessDependencyStartsForPeriod({
    scenarioPlan: plans.A,
    period: 4 as DisplayedPeriod,
    provenance: { A: [execution("A", "reduce_travel_time", 2)], B: [] },
  });
  assert.equal(result[0].outcome, "eligible");
});

test("planning without earlier execution blocks and preserves only declared plan timing", () => {
  const plans = setup({
    initiatives: [
      initiative("prerequisite", "reduce_travel_time"),
      initiative("dependent", "increase_service_frequency", ["prerequisite"]),
    ],
    bindings: [
      { scenario: "A", initiativeId: "prerequisite" },
      { scenario: "A", initiativeId: "dependent" },
    ],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 4 }, { actionId: "reduce_travel_time", executionStep: 2 }], B: [] },
  });
  const result = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance: emptyProvenance });
  assert.deepEqual(result[0].blockingReasons, [{ code: "prerequisite-not-completed-before-start", prerequisiteInitiativeId: "prerequisite", prerequisitePlannedPeriod: 2, priorActualExecutionPeriod: null }]);
});

test("same-period and future provenance block without leaking actual timing", () => {
  for (const actualPeriod of [4, 6]) {
    const plans = setup({
      initiatives: [initiative("prerequisite", "reduce_travel_time"), initiative("dependent", "increase_service_frequency", ["prerequisite"])],
      bindings: [{ scenario: "A", initiativeId: "prerequisite" }, { scenario: "A", initiativeId: "dependent" }],
      schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 4 }, { actionId: "reduce_travel_time", executionStep: actualPeriod }], B: [] },
    });
    const result = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance: { A: [execution("A", "reduce_travel_time", actualPeriod)], B: [] } });
    assert.equal(result[0].outcome, "would-be-blocked");
    assert.equal("priorActualExecutionPeriod" in result[0].blockingReasons[0] && result[0].blockingReasons[0].priorActualExecutionPeriod, null);
  }
});

test("an unbound prerequisite has the explicit not-planned reason", () => {
  const plans = setup({
    initiatives: [initiative("unbound", "reduce_travel_time"), initiative("dependent", "increase_service_frequency", ["unbound"])],
    bindings: [{ scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 3 }], B: [] },
  });
  const result = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: emptyProvenance });
  assert.deepEqual(result[0].blockingReasons, [{ code: "prerequisite-not-planned", prerequisiteInitiativeId: "unbound" }]);
});

test("multiple prerequisites require all evidence and reasons sort deterministically", () => {
  const plans = setup({
    initiatives: [
      initiative("z-unbound", "reduce_travel_time"),
      initiative("a-planned", "expand_cycling_infrastructure"),
      initiative("dependent", "increase_service_frequency", ["z-unbound", "a-planned"]),
    ],
    bindings: [{ scenario: "A", initiativeId: "a-planned" }, { scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 5 }, { actionId: "expand_cycling_infrastructure", executionStep: 2 }], B: [] },
  });
  const blocked = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 5 as DisplayedPeriod, provenance: emptyProvenance });
  assert.deepEqual(blocked[0].blockingReasons.map(({ code, prerequisiteInitiativeId }) => `${code}:${prerequisiteInitiativeId}`), ["prerequisite-not-completed-before-start:a-planned", "prerequisite-not-planned:z-unbound"]);
  const oneMissing = assessDependencyStartsForPeriod({
    scenarioPlan: plans.A,
    period: 5 as DisplayedPeriod,
    provenance: {
      A: [execution("A", "expand_cycling_infrastructure", 2)],
      B: [],
    },
  });
  assert.deepEqual(oneMissing[0].blockingReasons, [
    {
      code: "prerequisite-not-planned",
      prerequisiteInitiativeId: "z-unbound",
    },
  ]);
  const allBoundPlans = setup({
    initiatives: [initiative("travel", "reduce_travel_time"), initiative("cycling", "expand_cycling_infrastructure"), initiative("dependent", "increase_service_frequency", ["travel", "cycling"])],
    bindings: [{ scenario: "A", initiativeId: "travel" }, { scenario: "A", initiativeId: "cycling" }, { scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 5 }, { actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "expand_cycling_infrastructure", executionStep: 2 }], B: [] },
  });
  const eligible = assessDependencyStartsForPeriod({ scenarioPlan: allBoundPlans.A, period: 5 as DisplayedPeriod, provenance: { A: [execution("A", "expand_cycling_infrastructure", 2), execution("A", "reduce_travel_time", 1)], B: [] } });
  assert.equal(eligible[0].outcome, "eligible");
});

test("assesses current starters only and returns empty for periods without starts", () => {
  const plans = setup({
    initiatives: [initiative("past", "reduce_travel_time"), initiative("current", "increase_service_frequency"), initiative("future", "expand_cycling_infrastructure"), initiative("unbound", "reduce_travel_time")],
    bindings: [{ scenario: "A", initiativeId: "past" }, { scenario: "A", initiativeId: "current" }, { scenario: "A", initiativeId: "future" }],
    schedules: { A: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 3 }, { actionId: "expand_cycling_infrastructure", executionStep: 6 }], B: [] },
  });
  assert.deepEqual(assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: emptyProvenance }).map(({ initiativeId }) => initiativeId), ["current"]);
  assert.deepEqual(assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance: emptyProvenance }), []);
});

test("A and B consume only their own plan and provenance by action identity", () => {
  const plans = setup({
    initiatives: [initiative("prerequisite", "reduce_travel_time"), initiative("dependent", "increase_service_frequency", ["prerequisite"])],
    bindings: [{ scenario: "A", initiativeId: "prerequisite" }, { scenario: "A", initiativeId: "dependent" }, { scenario: "B", initiativeId: "prerequisite" }, { scenario: "B", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 4 }, { actionId: "reduce_travel_time", executionStep: 1 }], B: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "increase_service_frequency", executionStep: 4 }] },
  });
  const provenance: ScenarioExecutionProvenance = { A: [execution("A", "reduce_travel_time", 1)], B: [] };
  assert.equal(assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance })[0].outcome, "eligible");
  assert.equal(assessDependencyStartsForPeriod({ scenarioPlan: plans.B, period: 4 as DisplayedPeriod, provenance })[0].outcome, "would-be-blocked");
});

test("provenance order is irrelevant and caller inputs remain unchanged", () => {
  const plans = setup({
    initiatives: [initiative("travel", "reduce_travel_time"), initiative("cycling", "expand_cycling_infrastructure"), initiative("dependent", "increase_service_frequency", ["travel", "cycling"])],
    bindings: [{ scenario: "A", initiativeId: "travel" }, { scenario: "A", initiativeId: "cycling" }, { scenario: "A", initiativeId: "dependent" }],
    schedules: { A: [{ actionId: "reduce_travel_time", executionStep: 1 }, { actionId: "expand_cycling_infrastructure", executionStep: 2 }, { actionId: "increase_service_frequency", executionStep: 4 }], B: [] },
  });
  const provenance: ScenarioExecutionProvenance = { A: [execution("A", "reduce_travel_time", 1), execution("A", "expand_cycling_infrastructure", 2)], B: [] };
  const before = structuredClone(provenance);
  const first = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance });
  const second = assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 4 as DisplayedPeriod, provenance: { A: [...provenance.A].reverse(), B: [] } });
  assert.deepEqual(first, second);
  assert.deepEqual(provenance, before);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first[0]), true);
  assert.equal(Object.isFrozen(first[0].blockingReasons), true);
});

test("duplicate or contradictory canonical provenance throws an invariant error", () => {
  const plans = setup({
    initiatives: [initiative("start", "increase_service_frequency")],
    bindings: [{ scenario: "A", initiativeId: "start" }],
    schedules: { A: [{ actionId: "increase_service_frequency", executionStep: 3 }], B: [] },
  });
  assert.throws(() => assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: { A: [execution("A", "increase_service_frequency", 3), execution("A", "increase_service_frequency", 4)], B: [] } }), /duplicate provenance/);
  assert.throws(() => assessDependencyStartsForPeriod({ scenarioPlan: plans.A, period: 3 as DisplayedPeriod, provenance: { A: [{ ...execution("A", "increase_service_frequency", 3), scenario: "scenarioB" }], B: [] } }), /contains provenance for scenarioB/);
});
