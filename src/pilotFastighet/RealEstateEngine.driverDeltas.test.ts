import test from "node:test";
import assert from "node:assert/strict";

import { RealEstateEngine, type DriverDeltas } from "./RealEstateEngine";
import { buildDriverScoreState } from "./driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "./executiveDemoPlaybackScenario";

test("applies fractional positive and negative deltas to precise inherited scores", () => {
  const engine = new RealEstateEngine();

  engine.applyDriverDeltas({
    demandRisk: 0.5,
    operational_capacity: -0.5,
  });

  assert.equal(engine.getState().driverScores.demandRisk, 1.5);
  assert.equal(engine.getState().driverScores.operational_capacity, 0.5);
  assert.equal(engine.getState().riskState.demandRisk, "HIGH");
  assert.equal(engine.getState().riskState.operational_capacity, "LOW");
});

test("applies multiple canonical driver deltas atomically from one pre-state", () => {
  const engine = new RealEstateEngine();

  engine.applyDriverDeltas({
    demandRisk: 1.5,
    budget_pressure: 0.5,
    accessibility: -0.5,
  });

  assert.equal(engine.getState().driverScores.demandRisk, 2.5);
  assert.equal(engine.getState().driverScores.budget_pressure, 1.5);
  assert.equal(engine.getState().driverScores.accessibility, 0.5);
  assert.equal(engine.getState().riskState.demandRisk, "SEVERE");
  assert.equal(engine.getState().riskState.budget_pressure, "HIGH");
  assert.equal(engine.getState().riskState.accessibility, "LOW");
});

test("clamps each resulting driver score exactly to the supported boundaries", () => {
  const engine = new RealEstateEngine();

  engine.applyDriverDeltas({ demandRisk: 20, accessibility: -20 });

  assert.equal(engine.getState().driverScores.demandRisk, 3);
  assert.equal(engine.getState().driverScores.accessibility, 0);
  assert.equal(engine.getState().riskState.demandRisk, "SEVERE");
  assert.equal(engine.getState().riskState.accessibility, "LOW");
});

test("updates inherited analytical state without resetting execution history", () => {
  const { riskStateA } = getExecutiveDemoPlaybackRiskStates();
  const engine = new RealEstateEngine(
    structuredClone(riskStateA),
    buildDriverScoreState(riskStateA)
  );
  engine.stepForward();
  engine.stepForward();
  engine.stepForward();

  const before = structuredClone(engine.getState());
  engine.applyDriverDeltas({ interestRateExposureRisk: -1.5 });
  const after = engine.getState();

  assert.equal(after.driverScores.interestRateExposureRisk, 0.5);
  assert.equal(after.riskState.interestRateExposureRisk, "LOW");
  assert.equal(after.step, before.step);
  assert.equal(after.margin, before.margin);
  assert.deepEqual(after.registry, before.registry);
  assert.deepEqual(after.cascadeEvents, before.cascadeEvents);

  for (const [driver, score] of Object.entries(before.driverScores)) {
    if (driver !== "interestRateExposureRisk") {
      assert.equal(after.driverScores[driver], score);
      assert.equal(after.riskState[driver], before.riskState[driver]);
    }
  }
});

test("direct recovery does not reverse historical cascades or downstream effects", () => {
  const { riskStateA } = getExecutiveDemoPlaybackRiskStates();
  const engine = new RealEstateEngine(
    structuredClone(riskStateA),
    buildDriverScoreState(riskStateA)
  );
  engine.stepForward();
  engine.stepForward();
  engine.stepForward();

  const before = structuredClone(engine.getState());
  engine.applyDriverDeltas({ interestRateExposureRisk: -3 });
  const after = engine.getState();

  assert.equal(after.riskState.interestRateExposureRisk, "LOW");
  assert.equal(after.riskState.refinancingRisk, before.riskState.refinancingRisk);
  assert.equal(after.riskState.leverageLevelRisk, before.riskState.leverageLevelRisk);
  assert.equal(after.riskState.liquidityPressure, before.riskState.liquidityPressure);
  assert.equal(
    after.riskState.capitalCommitmentRigidityRisk,
    before.riskState.capitalCommitmentRigidityRisk
  );
  assert.deepEqual(after.cascadeEvents, before.cascadeEvents);
  assert.deepEqual(after.registry, before.registry);
  assert.equal(after.margin, before.margin);
  assert.equal(after.step, before.step);
});

test("rejects unknown, non-finite, and malformed deltas without partial mutation", () => {
  const invalidInputs: unknown[] = [
    { demandRisk: 0.5, unknownDriver: 1 },
    { demandRisk: Number.NaN },
    { demandRisk: Number.POSITIVE_INFINITY },
    { demandRisk: Number.NEGATIVE_INFINITY },
    { demandRisk: "0.5" },
    { demandRisk: null },
  ];

  for (const invalidInput of invalidInputs) {
    const engine = new RealEstateEngine();
    const before = engine.getState();
    const snapshot = structuredClone(before);

    assert.throws(() =>
      engine.applyDriverDeltas(invalidInput as DriverDeltas)
    );
    assert.strictEqual(engine.getState(), before);
    assert.deepEqual(engine.getState(), snapshot);
  }
});

test("empty, zero, and already-clamped boundary deltas are exact no-ops", () => {
  const engine = new RealEstateEngine();

  const initial = engine.getState();
  engine.applyDriverDeltas({});
  assert.strictEqual(engine.getState(), initial);
  engine.applyDriverDeltas({ demandRisk: 0 });
  assert.strictEqual(engine.getState(), initial);

  engine.applyDriverDeltas({ demandRisk: 20 });
  const clamped = engine.getState();
  engine.applyDriverDeltas({ demandRisk: 1 });
  assert.strictEqual(engine.getState(), clamped);
});
