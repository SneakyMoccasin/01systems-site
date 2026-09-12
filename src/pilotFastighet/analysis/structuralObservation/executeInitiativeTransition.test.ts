import assert from "node:assert/strict";
import test from "node:test";
import { RealEstateEngine, type DriverDeltas } from "../../RealEstateEngine";
import { defaultRiskState } from "../../presetRiskMapping";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { EffectDefinitionId } from "./contractV2";
import {
  executeInitiativeTransition,
  type InitiativeTransitionEngine,
} from "./executeInitiativeTransition";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type { ResolvedScheduledInitiativeV1 } from "./resolveInitiativeSchedules";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
const period = (value: number) => value as DisplayedPeriod;

function initiative(
  initiativeId: string,
  effectDefinitionId: string,
  executionStep: number,
  driverDeltas: DriverDeltas,
  scenario: ScheduleScenarioId = "A"
): ResolvedScheduledInitiativeV1 {
  return {
    scenario,
    initiativeId: initiativeId as InitiativeId,
    effectDefinitionId: effectDefinitionId as EffectDefinitionId,
    executionStep: period(executionStep),
    driverDeltas,
  };
}

function engineAt(completedPeriods: number): RealEstateEngine {
  const engine = new RealEstateEngine(structuredClone(defaultRiskState), undefined, profile);
  for (let index = 0; index < completedPeriods; index += 1) engine.stepForward();
  return engine;
}

class CountingEngine implements InitiativeTransitionEngine {
  applyCalls = 0;
  stepCalls = 0;
  constructor(
    readonly delegate: RealEstateEngine,
    private readonly failure?: "apply" | "step"
  ) {}
  applyDriverDeltas(deltas: DriverDeltas): void {
    this.applyCalls += 1;
    if (this.failure === "apply") throw new Error("apply failed");
    this.delegate.applyDriverDeltas(deltas);
  }
  stepForward(): ReturnType<RealEstateEngine["stepForward"]> {
    this.stepCalls += 1;
    if (this.failure === "step") throw new Error("step failed");
    return this.delegate.stepForward();
  }
  getState(): ReturnType<RealEstateEngine["getState"]> {
    return this.delegate.getState();
  }
}

test("executes initiatives at M1, a middle period, and the horizon boundary", () => {
  for (const target of [1, 3, 5]) {
    const engine = engineAt(target - 1);
    const trace = executeInitiativeTransition({
      engine,
      scenario: "A",
      period: period(target),
      horizon: 5,
      initiatives: [
        initiative("instance", "reduce_travel_time", target, {
          modal_attractiveness: 1,
        }),
      ],
    });
    assert.equal(trace.state.step, target);
    assert.equal(trace.actualExecutionPeriod, target);
    assert.equal(trace.executions[0].actualExecutionPeriod, target);
  }
});

test("combines overlapping effects atomically and retains separate instance evidence", () => {
  const engine = new CountingEngine(engineAt(0));
  const initiatives = [
    initiative("second", "increase_service_frequency", 1, { demandRisk: -0.5 }),
    initiative("first", "increase_service_frequency", 1, { demandRisk: -0.5 }),
    initiative("other", "reduce_parking_supply", 1, { demandRisk: 1 }),
  ];
  const before = structuredClone(initiatives);
  const trace = executeInitiativeTransition({
    engine,
    scenario: "A",
    period: period(1),
    horizon: 4,
    initiatives,
  });

  assert.equal(engine.applyCalls, 1);
  assert.equal(engine.stepCalls, 1);
  assert.equal(trace.executions.length, 3);
  assert.deepEqual(trace.executions.map(({ initiativeId }) => initiativeId), [
    "first",
    "other",
    "second",
  ]);
  assert.equal(trace.state.driverScores.demandRisk, 1);
  assert.deepEqual(initiatives, before);
  assert.equal(Object.isFrozen(initiatives), false);
});

test("is input-order invariant and keeps A/B engine state isolated", () => {
  const entries = [
    initiative("a", "increase_service_frequency", 1, { accessibility: 0.1 }),
    initiative("b", "reduce_travel_time", 1, { accessibility: 0.2 }),
  ];
  const engineA = engineAt(0);
  const engineB = engineAt(0);
  const a = executeInitiativeTransition({ engine: engineA, scenario: "A", period: period(1), horizon: 2, initiatives: entries });
  const b = executeInitiativeTransition({
    engine: engineB,
    scenario: "B",
    period: period(1),
    horizon: 2,
    initiatives: [...entries].reverse().map((entry) => ({ ...entry, scenario: "B" as const })),
  });
  assert.deepEqual(a.state, b.state);
  assert.notEqual(a.state, b.state);
  assert.deepEqual(a.executions.map(({ initiativeId }) => initiativeId), b.executions.map(({ initiativeId }) => initiativeId));
});

test("rejects all input invariants before mutating the engine", () => {
  const valid = initiative("one", "reduce_travel_time", 1, { accessibility: 0.5 });
  const cases = [
    { patch: { scenario: "B" as const }, expected: /scenario mismatch/ },
    { patch: { initiatives: [valid, valid] }, expected: /duplicate initiative/ },
    { patch: { period: period(2) }, expected: /expected next step/ },
    { patch: { initiatives: [{ ...valid, executionStep: period(2) }] }, expected: /execution period mismatch/ },
    { patch: { horizon: 0 }, expected: /horizon must be positive/ },
  ];
  for (const { patch, expected } of cases) {
    const engine = new CountingEngine(engineAt(0));
    assert.throws(
      () => executeInitiativeTransition({ engine, scenario: "A", period: period(1), horizon: 2, initiatives: [valid], ...patch }),
      expected
    );
    assert.equal(engine.applyCalls, 0);
    assert.equal(engine.stepCalls, 0);
  }
});

test("returns no trace when apply or transition throws", () => {
  const entry = initiative("one", "reduce_travel_time", 1, { accessibility: 0.5 });
  for (const failure of ["apply", "step"] as const) {
    const engine = new CountingEngine(engineAt(0), failure);
    let returned = false;
    assert.throws(() => {
      executeInitiativeTransition({ engine, scenario: "A", period: period(1), horizon: 2, initiatives: [entry] });
      returned = true;
    }, new RegExp(`${failure} failed`));
    assert.equal(returned, false);
  }
});

test("returns a detached deeply frozen trace without freezing resolved input", () => {
  const entry = initiative("one", "reduce_travel_time", 1, { accessibility: 0.5 });
  const trace = executeInitiativeTransition({ engine: engineAt(0), scenario: "A", period: period(1), horizon: 2, initiatives: [entry] });
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.state), true);
  assert.equal(Object.isFrozen(trace.executions), true);
  assert.equal(Object.isFrozen(trace.executions[0]), true);
  assert.equal(Object.isFrozen(trace.executions[0].appliedDriverDeltas), true);
  assert.equal(Object.isFrozen(entry), false);
  assert.notEqual(trace.executions[0].appliedDriverDeltas, entry.driverDeltas);
  assert.notEqual(trace.state, trace.executions);
});
