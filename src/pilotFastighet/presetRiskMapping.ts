import type { RiskLevel } from "./impactContract";

export type ScenarioTarget = "A" | "B";

export type RiskStateUpdater = (
  updater: (prev: any) => any
) => void;

/** Baseline risk state — scenario presets always start from this (no merge with prior UI state). */
export const defaultRiskState: Record<string, RiskLevel> = {
  demandRisk: "MODERATE",
  pricingPowerRisk: "MODERATE",
  tenantStabilityRisk: "MODERATE",
  maintenanceIntensityRisk: "MODERATE",
  operationalEfficiencyRisk: "MODERATE",
  energyExposureRisk: "MODERATE",
  interestRateExposureRisk: "MODERATE",
  leverageLevelRisk: "MODERATE",
  refinancingRisk: "MODERATE",
  marketVolatilityRisk: "MODERATE",
  regulatoryPressureRisk: "MODERATE",
  capitalCommitmentRigidityRisk: "MODERATE",
  accessibility: "MODERATE",
  modal_attractiveness: "MODERATE",
  congestion_pressure: "MODERATE",
  operational_capacity: "MODERATE",
  transit_signal_priority: "MODERATE",
  budget_pressure: "MODERATE",
};

const PRESET_MAPPINGS: Record<string, Record<string, RiskLevel>> = {
  "interest-shock": {
    interestRateExposureRisk: "HIGH",
    refinancingRisk: "HIGH",
    leverageLevelRisk: "HIGH",
    capitalCommitmentRigidityRisk: "HIGH",
    maintenanceIntensityRisk: "HIGH",
    tenantStabilityRisk: "HIGH",
    demandRisk: "HIGH",
  },
  "energy-spike": {
    energyExposureRisk: "HIGH",
    maintenanceIntensityRisk: "MODERATE",
  },
  "tenant-loss": {
    tenantStabilityRisk: "HIGH",
    demandRisk: "HIGH",
  },
  "maintenance-backlog": {
    maintenanceIntensityRisk: "HIGH",
    tenantStabilityRisk: "MODERATE",
  },
  "active-maintenance-strategy": {
    maintenanceIntensityRisk: "LOW",
    tenantStabilityRisk: "LOW",
    capitalCommitmentRigidityRisk: "LOW",
    demandRisk: "LOW",
  },
  "refinancing-shock": {
    refinancingRisk: "HIGH",
    capitalCommitmentRigidityRisk: "HIGH",
  },
};

/** Full risk state after applying a preset (baseline + overrides). Same result as `applyScenarioPreset` updater. */
export function getRiskStateAfterPreset(presetId: string): Record<string, RiskLevel> {
  console.log("Preset lookup:", presetId);
  const next = structuredClone(defaultRiskState);

  const presetMapping = PRESET_MAPPINGS[presetId];
  if (!presetMapping) {
    return next;
  }

  Object.entries(presetMapping).forEach(([key, value]) => {
    next[key] = value;
  });

  return next;
}

export function applyScenarioPreset(
  presetId: string,
  setRiskStateA: RiskStateUpdater,
  setRiskStateB: RiskStateUpdater,
  target: ScenarioTarget
) {
  const updater =
    target === "A" ? setRiskStateA : setRiskStateB;

  updater(() => getRiskStateAfterPreset(presetId));
}
