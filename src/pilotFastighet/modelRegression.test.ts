import test from "node:test";
import assert from "node:assert/strict";

import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import { RealEstateEngine } from "./RealEstateEngine";
import {
  ACTION_EFFECTS,
  actionHasOnlyModeledDrivers,
  applyActionEffectsToRiskState,
  DOMAIN_ACTIONS,
  resolveActionDrivenState,
} from "./actionEffects";
import { defaultRiskState } from "./presetRiskMapping";
import { propagateRisks } from "./riskPropagation";
import { createFreshDomainScenarioState } from "./domainState";
import { getImpactContract } from "./getImpactContract";

function buildState(
  overrides: Partial<typeof defaultRiskState>
): typeof defaultRiskState {
  return {
    ...defaultRiskState,
    ...overrides,
  } as typeof defaultRiskState;
}

function runSeries(
  riskState: typeof defaultRiskState,
  steps: number
): number[] {
  const engine = new RealEstateEngine(riskState);
  const series: number[] = [];

  for (let i = 0; i < steps; i += 1) {
    engine.stepForward();
    series.push(Number(engine.getState().margin.toFixed(5)));
  }

  return series;
}

test("transport benefit drivers lower load and increase recovery when raised", () => {
  const baseline = computeDimensionMultipliers(buildState({}), 1);
  const accessibilityHigh = computeDimensionMultipliers(
    buildState({ accessibility: "HIGH" }),
    1
  );
  const modalHigh = computeDimensionMultipliers(
    buildState({ modal_attractiveness: "HIGH" }),
    1
  );
  const capacityHigh = computeDimensionMultipliers(
    buildState({ operational_capacity: "HIGH" }),
    1
  );
  const signalHigh = computeDimensionMultipliers(
    buildState({ transit_signal_priority: "HIGH" }),
    1
  );

  for (const result of [accessibilityHigh, modalHigh, capacityHigh, signalHigh]) {
    assert.ok(result.load < baseline.load);
    assert.ok(result.recovery > baseline.recovery);
    assert.equal(result.cost, baseline.cost);
    assert.equal(result.sensitivity, baseline.sensitivity);
  }
});

test("beneficial transport drivers at HIGH do not start negative cascades", () => {
  for (const state of [
    buildState({ modal_attractiveness: "HIGH" }),
    buildState({ operational_capacity: "HIGH" }),
    buildState({ transit_signal_priority: "HIGH" }),
  ]) {
    const result = propagateRisks(state);
    assert.deepEqual(result.next, state);
    assert.equal(result.events.length, 0);
  }
});

test("beneficial transport drivers at LOW do trigger adverse cascades", () => {
  const modal = propagateRisks(buildState({ modal_attractiveness: "LOW" }));
  const capacity = propagateRisks(buildState({ operational_capacity: "LOW" }));
  const signal = propagateRisks(buildState({ transit_signal_priority: "LOW" }));

  assert.equal(modal.next.accessibility, "HIGH");
  assert.ok(modal.events.some((event) => event.targetRisk === "accessibility"));

  assert.equal(capacity.next.tenantStabilityRisk, "HIGH");
  assert.ok(capacity.events.some((event) => event.targetRisk === "tenantStabilityRisk"));

  assert.equal(signal.next.operational_capacity, "HIGH");
  assert.ok(signal.events.some((event) => event.targetRisk === "operational_capacity"));
});

test("transport pressure drivers worsen only their intended dimensions", () => {
  const baseline = computeDimensionMultipliers(buildState({}), 1);
  const demandHigh = computeDimensionMultipliers(
    buildState({ demandRisk: "HIGH" }),
    1
  );
  const congestionHigh = computeDimensionMultipliers(
    buildState({ congestion_pressure: "HIGH" }),
    1
  );
  const budgetHigh = computeDimensionMultipliers(
    buildState({ budget_pressure: "HIGH" }),
    1
  );
  const capitalHigh = computeDimensionMultipliers(
    buildState({ capitalCommitmentRigidityRisk: "HIGH" }),
    1
  );
  const maintenanceHigh = computeDimensionMultipliers(
    buildState({ maintenanceIntensityRisk: "HIGH" }),
    1
  );

  assert.ok(demandHigh.load > baseline.load);
  assert.equal(demandHigh.cost, baseline.cost);
  assert.equal(demandHigh.sensitivity, baseline.sensitivity);

  assert.ok(congestionHigh.load > baseline.load);
  assert.ok(congestionHigh.cost > baseline.cost);
  assert.equal(congestionHigh.recovery, baseline.recovery);
  assert.equal(congestionHigh.sensitivity, baseline.sensitivity);

  assert.ok(budgetHigh.cost > baseline.cost);
  assert.ok(budgetHigh.recovery < baseline.recovery);
  assert.equal(budgetHigh.load, baseline.load);
  assert.equal(budgetHigh.sensitivity, baseline.sensitivity);

  assert.ok(capitalHigh.recovery < baseline.recovery);
  assert.equal(capitalHigh.load, baseline.load);

  assert.ok(maintenanceHigh.recovery < baseline.recovery);
  assert.equal(maintenanceHigh.load, baseline.load);
});

test("risk-driving transport parameters still start negative cascades when adverse", () => {
  const result = propagateRisks(buildState({ budget_pressure: "HIGH" }));

  assert.equal(result.next.capitalCommitmentRigidityRisk, "HIGH");
  assert.ok(
    result.events.some(
      (event) =>
        event.sourceRisk === "budget_pressure" &&
        event.targetRisk === "capitalCommitmentRigidityRisk"
    )
  );
});

test("half steps are symmetric and preserved in the internal score state", () => {
  const plusHalf = resolveActionDrivenState(buildState({}), ["delay_maintenance"]);
  const minusHalf = resolveActionDrivenState(buildState({}), ["electrify_bus_fleet"]);
  const plusFull = applyActionEffectsToRiskState(buildState({}), [
    "delay_maintenance",
    "delay_maintenance",
  ]);
  const minusFull = applyActionEffectsToRiskState(buildState({}), [
    "electrify_bus_fleet",
    "electrify_bus_fleet",
  ]);

  assert.equal(plusHalf.driverScores.tenantStabilityRisk, 1.5);
  assert.equal(minusHalf.driverScores.operationalEfficiencyRisk, 0.5);
  assert.equal(plusHalf.riskState.tenantStabilityRisk, "HIGH");
  assert.equal(minusHalf.riskState.operationalEfficiencyRisk, "LOW");
  assert.equal(plusFull.tenantStabilityRisk, "HIGH");
  assert.equal(minusFull.operationalEfficiencyRisk, "LOW");
});

test("increase_service_frequency preserves its half-step effects internally", () => {
  const resolved = resolveActionDrivenState(buildState({}), [
    "increase_service_frequency",
  ]);
  const multipliers = computeDimensionMultipliers(
    resolved.riskState,
    1,
    resolved.driverScores
  );

  assert.equal(resolved.driverScores.accessibility, 2);
  assert.equal(resolved.driverScores.operational_capacity, 0.5);
  assert.equal(resolved.driverScores.budget_pressure, 1.5);

  assert.equal(resolved.riskState.accessibility, "HIGH");
  assert.equal(resolved.riskState.operational_capacity, "LOW");
  assert.equal(resolved.riskState.budget_pressure, "HIGH");

  assert.ok(multipliers.load > 0.97 && multipliers.load < 0.98);
  assert.ok(multipliers.cost > 1.02 && multipliers.cost < 1.04);
  assert.ok(multipliers.recovery > 0.99 && multipliers.recovery < 1.01);
});

test("a single negative or positive half-step changes the trajectory", () => {
  const baselineSeries = runSeries(buildState({}), 12);
  const frequencyResolved = resolveActionDrivenState(buildState({}), [
    "increase_service_frequency",
  ]);
  const electrifyResolved = resolveActionDrivenState(buildState({}), [
    "electrify_bus_fleet",
  ]);

  const frequencyEngine = new RealEstateEngine(
    frequencyResolved.riskState,
    frequencyResolved.driverScores
  );
  const electrifyEngine = new RealEstateEngine(
    electrifyResolved.riskState,
    electrifyResolved.driverScores
  );

  const frequencySeries: number[] = [];
  const electrifySeries: number[] = [];

  for (let i = 0; i < 12; i += 1) {
    frequencyEngine.stepForward();
    electrifyEngine.stepForward();
    frequencySeries.push(Number(frequencyEngine.getState().margin.toFixed(5)));
    electrifySeries.push(Number(electrifyEngine.getState().margin.toFixed(5)));
  }

  assert.notDeepEqual(frequencySeries, baselineSeries);
  assert.notDeepEqual(electrifySeries, baselineSeries);
});

test("unsupported selectable measures are filtered out of current modeled domains", () => {
  const supportedMunicipal = DOMAIN_ACTIONS.municipal.filter((action) =>
    actionHasOnlyModeledDrivers(action, Object.keys(defaultRiskState))
  );
  const supportedRealEstate = DOMAIN_ACTIONS.realEstate.filter((action) =>
    actionHasOnlyModeledDrivers(action, Object.keys(defaultRiskState))
  );

  assert.ok(!supportedMunicipal.includes("congestion_pricing"));
  assert.ok(!supportedRealEstate.includes("stagger_project_starts"));
  assert.ok(!supportedRealEstate.includes("increase_liquidity_buffer"));
});

test("every remaining selectable measure changes at least one modeled driver", () => {
  const supportedActions = [
    ...DOMAIN_ACTIONS.municipal,
    ...DOMAIN_ACTIONS.realEstate,
    ...DOMAIN_ACTIONS.consulting,
  ].filter((action, index, all) => {
    return (
      all.indexOf(action) === index &&
      actionHasOnlyModeledDrivers(action, Object.keys(defaultRiskState))
    );
  });

  for (const action of supportedActions) {
    const nextState = applyActionEffectsToRiskState(buildState({}), [action]);
    assert.notDeepEqual(
      nextState,
      defaultRiskState,
      `${action} should change at least one modeled driver`
    );
  }
});

test("same engine input still yields identical output", () => {
  const state = buildState({
    accessibility: "HIGH",
    modal_attractiveness: "HIGH",
    transit_signal_priority: "HIGH",
    capitalCommitmentRigidityRisk: "HIGH",
  });

  const seriesA = runSeries(state, 12);
  const seriesB = runSeries(state, 12);

  assert.deepEqual(seriesA, seriesB);
});

test("real estate reference scenario remains unchanged", () => {
  const state = buildState({
    refinancingRisk: "HIGH",
    capitalCommitmentRigidityRisk: "HIGH",
  });

  const series = runSeries(state, 12);

  assert.deepEqual(series, [-3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3]);
});

test("transport scenarios with different modeled measures diverge", () => {
  const baselineState = buildState({});
  const goalState = applyActionEffectsToRiskState(buildState({}), [
    "reduce_travel_time",
    "transit_signal_priority",
    "reduce_parking_supply",
  ]);

  const baselineSeries = runSeries(baselineState, 12);
  const goalSeries = runSeries(goalState, 12);

  assert.notDeepEqual(goalSeries, baselineSeries);
  assert.ok(
    goalSeries.some((value, index) => value !== baselineSeries[index]),
    "transport trajectories should diverge"
  );
});

test("action effect catalog still contains the expected transport no-op for audit visibility", () => {
  assert.deepEqual(
    Object.keys(ACTION_EFFECTS.congestion_pricing),
    ["modal_shift_pressure", "political_feasibility"]
  );
});

test("getImpactContract returns deterministic domain-specific contract instances", () => {
  const realEstateContract = getImpactContract("realEstate");
  const municipalContract = getImpactContract("municipal");
  const consultingContract = getImpactContract("consulting");

  assert.notEqual(realEstateContract, municipalContract);
  assert.notEqual(realEstateContract, consultingContract);
  assert.notEqual(municipalContract, consultingContract);
  assert.deepEqual(realEstateContract, municipalContract);
  assert.deepEqual(realEstateContract, consultingContract);
});

test("domain rehydration clears transport state before entering another domain", () => {
  const transportState = createFreshDomainScenarioState("municipal");
  const resolvedTransport = resolveActionDrivenState(transportState.baseRiskStateA, [
    "reduce_travel_time",
  ]);
  transportState.riskStateA = resolvedTransport.riskState;
  transportState.driverScoresA = resolvedTransport.driverScores;
  transportState.selectedActionsA = ["reduce_travel_time"];
  transportState.scenarioALabel = "transport-scenario-b";

  const switchedToRealEstate = createFreshDomainScenarioState("realEstate");
  const switchedBackToTransport = createFreshDomainScenarioState("municipal");

  assert.deepEqual(switchedToRealEstate.riskStateA, defaultRiskState);
  assert.deepEqual(switchedToRealEstate.selectedActionsA, []);
  assert.equal(switchedToRealEstate.scenarioALabel, "");

  assert.deepEqual(switchedBackToTransport.riskStateA, defaultRiskState);
  assert.deepEqual(switchedBackToTransport.selectedActionsA, []);
  assert.equal(switchedBackToTransport.scenarioALabel, "");
  assert.deepEqual(
    switchedBackToTransport,
    createFreshDomainScenarioState("municipal")
  );
});
