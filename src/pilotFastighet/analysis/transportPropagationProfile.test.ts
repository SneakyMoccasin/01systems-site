import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { ACTION_EFFECTS } from "../actionEffects";
import { resolveExecutableDomainProfile } from "../executableDomainProfile";
import { defaultRiskState } from "../presetRiskMapping";
import { propagateRisks, RISK_PROPAGATION } from "../riskPropagation";
import { prepareOrdinaryConfiguredRunSource } from "./configuredRunSource";
import { runReactAnalysisBoundary } from "./reactScheduledAnalysisBoundary";

const EXCLUDED = [
  "congestion_pressure->modal_attractiveness",
  "interestRateExposureRisk->leverageLevelRisk",
  "interestRateExposureRisk->refinancingRisk",
  "leverageLevelRisk->capitalCommitmentRigidityRisk",
  "leverageLevelRisk->liquidityPressure",
  "liquidityPressure->capitalCommitmentRigidityRisk",
  "modal_attractiveness->accessibility",
  "refinancingRisk->capitalCommitmentRigidityRisk",
  "refinancingRisk->leverageLevelRisk",
  "refinancingRisk->liquidityPressure",
  "transit_signal_priority->operational_capacity",
] as const;

const RETAINED = [
  "accessibility->demandRisk",
  "budget_pressure->capitalCommitmentRigidityRisk",
  "capitalCommitmentRigidityRisk->maintenanceIntensityRisk",
  "capitalCommitmentRigidityRisk->operationalEfficiencyRisk",
  "maintenanceIntensityRisk->tenantStabilityRisk",
  "operationalEfficiencyRisk->maintenanceIntensityRisk",
  "operationalEfficiencyRisk->tenantStabilityRisk",
  "operational_capacity->tenantStabilityRisk",
  "tenantStabilityRisk->demandRisk",
] as const;

function edgeIds(rules: typeof RISK_PROPAGATION): string[] {
  return Object.entries(rules)
    .flatMap(([source, effects]) =>
      effects.map(({ target }) => `${source}->${target}`)
    )
    .sort();
}

test("Municipal excludes exactly eleven authorized edges and retains every other rule", () => {
  const municipal = resolveExecutableDomainProfile("legacy-municipal-v1");
  const legacyEdges = edgeIds(RISK_PROPAGATION);
  const municipalEdges = edgeIds(municipal.propagationRules as typeof RISK_PROPAGATION);
  assert.deepEqual(
    legacyEdges.filter((edge) => !municipalEdges.includes(edge)),
    [...EXCLUDED].sort()
  );
  assert.deepEqual(municipalEdges, [...RETAINED].sort());
  assert.equal(municipal.calibrationVersion, "transport-propagation-isolated-v1");
});

test("Real Estate and Consulting retain the exact legacy propagation object content", () => {
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-real-estate-v1").propagationRules,
    RISK_PROPAGATION
  );
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-consulting-v1").propagationRules,
    RISK_PROPAGATION
  );
  assert.equal(
    resolveExecutableDomainProfile("legacy-real-estate-v1").calibrationVersion,
    "legacy-global-v1"
  );
  assert.equal(
    resolveExecutableDomainProfile("legacy-consulting-v1").calibrationVersion,
    "legacy-global-v1"
  );
});

test("manual adverse financing state cannot produce a Transport financing cascade", () => {
  const profile = resolveExecutableDomainProfile("legacy-municipal-v1");
  const result = propagateRisks(
    { ...structuredClone(defaultRiskState), interestRateExposureRisk: "HIGH" },
    profile.propagationRules
  );
  assert.deepEqual(result.events, []);
  assert.equal(result.next.refinancingRisk, "MODERATE");
  assert.equal(result.next.leverageLevelRisk, "MODERATE");
  assert.equal(result.next.liquidityPressure, undefined);
});

test("manual adverse sources cannot mechanically improve Transport benefit targets", () => {
  const rules = resolveExecutableDomainProfile("legacy-municipal-v1").propagationRules;
  const cases = [
    ["congestion_pressure", "HIGH", "modal_attractiveness"],
    ["modal_attractiveness", "LOW", "accessibility"],
    ["transit_signal_priority", "LOW", "operational_capacity"],
  ] as const;
  for (const [source, sourceLevel, target] of cases) {
    const initial = { ...structuredClone(defaultRiskState), [source]: sourceLevel };
    const result = propagateRisks(initial, rules);
    assert.equal(result.next[target], initial[target]);
    assert.ok(
      result.events.every(
        (event) => !(event.sourceRisk === source && event.targetRisk === target)
      )
    );
  }
});

const HISTORY_HASHES = {
  increase_service_frequency:
    "0259e702bc2f6ff8eb58d2e8cf85a4a8fc1cbfa0a612429033c9a3bbadc58830",
  reduce_travel_time:
    "b1207ecb0c4523974fa03c286de9c1e3bb6fe990b9e0e991b2d0162bf2e26a79",
  expand_cycling_infrastructure:
    "bc10a02ba9fdb40a1291ff89755f5ae8b33ed01f5f0cab9590198535e3067335",
  electrify_bus_fleet:
    "3e8f2ca5613708df50eb5b04aae96e0cc33ad78f49e5ff5a5477c9eda48bc5c0",
  transit_signal_priority:
    "cb54bff9530d2521b1dd4fc8ce68a7a682489decaf758763f209897104bc59b4",
  reduce_parking_supply:
    "edd8482c4487f13b76e6e06bc0b9afd700d8472397c6da44f53853755a60542d",
} as const;

test("all six configured Transport histories remain exactly Phase-2 compatible", () => {
  for (const [actionId, expectedHash] of Object.entries(HISTORY_HASHES)) {
    const runSource = prepareOrdinaryConfiguredRunSource({
      domainId: "municipal",
      scenarioA: { baseRiskState: defaultRiskState, selectedActions: [] },
      scenarioB: { baseRiskState: defaultRiskState, selectedActions: [actionId] },
      baselineRiskState: defaultRiskState,
    });
    const result = runReactAnalysisBoundary({
      executionMode: "configured-start",
      horizon: 36,
      runSource,
    });
    const history = result.analysis.scenarioB.marginHistory;
    assert.equal(history.length, 36);
    assert.deepEqual(
      history,
      result.analysis.scenarioB.trajectory.map((state) => state.margin)
    );
    assert.equal(
      crypto.createHash("sha256").update(JSON.stringify(history)).digest("hex"),
      expectedHash,
      actionId
    );
  }
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-municipal-v1").actionEffects,
    ACTION_EFFECTS
  );
});
