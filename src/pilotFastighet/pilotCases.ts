import type { RiskLevel } from "@/src/pilotFastighet/impactContract";

export type RiskState = Record<string, RiskLevel>;

export type PilotCase = {
  id: string;
  title: string;
  oneLiner: string;
  riskStateA: RiskState;
  riskStateB: RiskState;
};

const BASE_RISK_STATE: RiskState = {
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
};

const make = (base: RiskState, overrides: Partial<RiskState>): RiskState =>
  ({ ...base, ...overrides } as RiskState);

export const PILOT_CASES: PilotCase[] = [
  {
    id: "neutral-baseline",
    title: "Neutral baseline (debug)",
    oneLiner: "All risks MODERATE. Used to verify model neutrality.",
    riskStateA: {
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
    },
    riskStateB: {
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
    },
  },
  {
    id: "refinancing_squeeze",
    title: "Refinancing squeeze",
    oneLiner: "Higher rates + leverage amplifies refinancing stress.",
    riskStateA: make(BASE_RISK_STATE, {
      interestRateExposureRisk: "LOW",
      leverageLevelRisk: "LOW",
      refinancingRisk: "LOW",
    }),
    riskStateB: make(BASE_RISK_STATE, {
      interestRateExposureRisk: "HIGH",
      leverageLevelRisk: "MODERATE",
      refinancingRisk: "HIGH",
      marketVolatilityRisk: "MODERATE",
    }),
  },
  {
    id: "maintenance_deferral",
    title: "Maintenance deferral",
    oneLiner: "Deferring maintenance increases structural pressure over time.",
    riskStateA: make(BASE_RISK_STATE, {
      maintenanceIntensityRisk: "MODERATE",
      tenantStabilityRisk: "LOW",
      regulatoryPressureRisk: "LOW",
    }),
    riskStateB: {
      demandRisk: "MODERATE",
      pricingPowerRisk: "MODERATE",
      tenantStabilityRisk: "MODERATE",
      maintenanceIntensityRisk: "HIGH",
      operationalEfficiencyRisk: "MODERATE",
      energyExposureRisk: "MODERATE",
      interestRateExposureRisk: "MODERATE",
      leverageLevelRisk: "MODERATE",
      refinancingRisk: "MODERATE",
      marketVolatilityRisk: "MODERATE",
      regulatoryPressureRisk: "MODERATE",
      capitalCommitmentRigidityRisk: "MODERATE",
    },
  },
  {
    id: "energy_shock_ops",
    title: "Energy shock + operations",
    oneLiner: "Energy exposure + weak operations creates rapid margin erosion.",
    riskStateA: make(BASE_RISK_STATE, {
      energyExposureRisk: "MODERATE",
      operationalEfficiencyRisk: "LOW",
      marketVolatilityRisk: "LOW",
    }),
    riskStateB: make(BASE_RISK_STATE, {
      energyExposureRisk: "HIGH",
      operationalEfficiencyRisk: "HIGH",
      marketVolatilityRisk: "HIGH",
      pricingPowerRisk: "HIGH",
    }),
  },
];
