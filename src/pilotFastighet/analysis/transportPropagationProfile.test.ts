import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { ACTION_EFFECTS } from "../actionEffects";
import { resolveExecutableDomainProfile } from "../executableDomainProfile";
import { defaultRiskState } from "../presetRiskMapping";
import { propagateRisks, RISK_PROPAGATION } from "../riskPropagation";
import { prepareOrdinaryConfiguredRunSource } from "./configuredRunSource";
import { runReactAnalysisBoundary } from "./reactScheduledAnalysisBoundary";

const APPROVED = [
  "accessibility->demandRisk",
  "budget_pressure->capitalCommitmentRigidityRisk",
  "operationalEfficiencyRisk->maintenanceIntensityRisk",
] as const;

const REMOVED_IN_PHASE_4B = [
  "operational_capacity->tenantStabilityRisk",
  "capitalCommitmentRigidityRisk->operationalEfficiencyRisk",
  "capitalCommitmentRigidityRisk->maintenanceIntensityRisk",
  "operationalEfficiencyRisk->tenantStabilityRisk",
  "maintenanceIntensityRisk->tenantStabilityRisk",
  "tenantStabilityRisk->demandRisk",
] as const;

function edgeIds(rules: typeof RISK_PROPAGATION): string[] {
  return Object.entries(rules)
    .flatMap(([source, effects]) =>
      effects.map(({ target }) => `${source}->${target}`)
    )
    .sort();
}

test("Municipal contains exactly the three approved causal-subset edges", () => {
  const municipal = resolveExecutableDomainProfile("legacy-municipal-v1");
  const municipalEdges = edgeIds(municipal.propagationRules as typeof RISK_PROPAGATION);
  assert.deepEqual(municipalEdges, [...APPROVED].sort());
  const municipalEdgeSet = new Set<string>(municipalEdges);
  for (const edge of REMOVED_IN_PHASE_4B) assert.equal(municipalEdgeSet.has(edge), false);
  assert.equal(municipal.calibrationVersion, "transport-causal-subset-v2");
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

test("approved Municipal cascades retain their existing trigger and target mechanics", () => {
  const rules = resolveExecutableDomainProfile("legacy-municipal-v1").propagationRules;
  const cases = [
    ["accessibility", "LOW", "demandRisk"],
    ["budget_pressure", "HIGH", "capitalCommitmentRigidityRisk"],
    ["operationalEfficiencyRisk", "HIGH", "maintenanceIntensityRisk"],
  ] as const;
  for (const [source, level, target] of cases) {
    const result = propagateRisks(
      { ...structuredClone(defaultRiskState), [source]: level },
      rules
    );
    assert.equal(result.next[target], "HIGH");
    assert.deepEqual(
      result.events.map((event) => `${event.sourceRisk}->${event.targetRisk}`),
      [`${source}->${target}`]
    );
  }
});

test("Municipal capital commitment cannot overwrite operations or create tenant cascades", () => {
  const rules = resolveExecutableDomainProfile("legacy-municipal-v1").propagationRules;
  const result = propagateRisks(
    {
      ...structuredClone(defaultRiskState),
      capitalCommitmentRigidityRisk: "HIGH",
      operationalEfficiencyRisk: "LOW",
      maintenanceIntensityRisk: "LOW",
    },
    rules
  );
  assert.equal(result.next.operationalEfficiencyRisk, "LOW");
  assert.equal(result.next.maintenanceIntensityRisk, "LOW");
  assert.ok(result.events.every((event) => ![event.sourceRisk, event.targetRisk].includes("tenantStabilityRisk")));
});

const HISTORY_HASHES = {
  increase_service_frequency:
    "97af6e78ee2e5ced41d3d55ce6c6153a75e34fb2f4ef6522d9cb09be0f3107ad",
  reduce_travel_time:
    "b1207ecb0c4523974fa03c286de9c1e3bb6fe990b9e0e991b2d0162bf2e26a79",
  expand_cycling_infrastructure:
    "2836663e1a6b2c82338c875c1b8dbd260de3a9b122a088f9f545b59e10e45411",
  electrify_bus_fleet:
    "d9af89875f5d0d78ea6b87abdff9a5aeb33c82852a6f55819c4eb4635df17e91",
  transit_signal_priority:
    "cb54bff9530d2521b1dd4fc8ce68a7a682489decaf758763f209897104bc59b4",
  reduce_parking_supply:
    "edd8482c4487f13b76e6e06bc0b9afd700d8472397c6da44f53853755a60542d",
} as const;

test("all six configured Transport histories match the approved Phase-4B subset", () => {
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
    assert.ok(
      result.analysis.scenarioB.cascadeHistory.every(
        (event) =>
          event.sourceRisk !== "tenantStabilityRisk" &&
          event.targetRisk !== "tenantStabilityRisk"
      ),
      actionId
    );
    assert.ok(
      history.slice(0, 11).every((margin) => margin > -3 && margin < 3),
      `${actionId} must not clamp before M12`
    );
    if (actionId === "electrify_bus_fleet") {
      assert.equal(
        result.analysis.scenarioB.terminalState.riskState
          .operationalEfficiencyRisk,
        "LOW"
      );
      assert.equal(
        result.analysis.scenarioB.terminalState.riskState
          .maintenanceIntensityRisk,
        "MODERATE"
      );
    }
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
