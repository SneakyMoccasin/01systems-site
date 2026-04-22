import type { RiskLevel } from "@/src/pilotFastighet/impactContract";
import type { DomainKey } from "@/src/i18n/pulseLanguage";
import { defaultRiskState } from "@/src/pilotFastighet/presetRiskMapping";

export type RiskState = Record<string, RiskLevel>;

export type PilotCase = {
  id: string;
  domain: DomainKey;
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
    domain: "realEstate",
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
    domain: "realEstate",
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
    domain: "realEstate",
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
    domain: "realEstate",
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
  {
    id: "portfolio_concurrency_pressure",
    domain: "realEstate",
    title: "Portfolio concurrency pressure",
    oneLiner:
      "Simultaneous project starts increase capital lock-in and reduce strategic flexibility.",
    riskStateA: make(defaultRiskState as RiskState, {
      capitalCommitmentRigidityRisk: "HIGH",
      refinancingRisk: "HIGH",
      liquidityPressure: "HIGH",
      implementationPacingRisk: "HIGH",
    }),
    riskStateB: make(defaultRiskState as RiskState, {
      capitalCommitmentRigidityRisk: "MODERATE",
      refinancingRisk: "MODERATE",
      liquidityPressure: "LOW",
      implementationPacingRisk: "MODERATE",
    }),
  },
  {
    id: "refinancing_window_sensitivity",
    domain: "realEstate",
    title: "Refinancing window sensitivity",
    oneLiner:
      "A tighter refinancing window interacts with leverage, lease quality, and liquidity headroom to reduce structural flexibility.",
    riskStateA: make(defaultRiskState as RiskState, {
      refinancingRisk: "HIGH",
      interestRateExposureRisk: "HIGH",
      leverageLevelRisk: "HIGH",
      liquidityPressure: "HIGH",
      capitalCommitmentRigidityRisk: "HIGH",
      tenantStabilityRisk: "MODERATE",
      demandRisk: "MODERATE",
      operationalEfficiencyRisk: "MODERATE",
    }),
    riskStateB: make(defaultRiskState as RiskState, {
      refinancingRisk: "MODERATE",
      interestRateExposureRisk: "MODERATE",
      leverageLevelRisk: "MODERATE",
      liquidityPressure: "LOW",
      capitalCommitmentRigidityRisk: "MODERATE",
      tenantStabilityRisk: "LOW",
      demandRisk: "LOW",
      operationalEfficiencyRisk: "MODERATE",
    }),
  },
  {
    id: "accessibility_push",
    domain: "municipal",
    title: "Tillgänglighetsförbättring",
    oneLiner: "Förbättrad tillgänglighet ökar systemets attraktivitet.",
    riskStateA: make(defaultRiskState as RiskState, {
      accessibility: "MODERATE",
      modal_attractiveness: "MODERATE",
      budget_pressure: "MODERATE",
    }),
    riskStateB: make(defaultRiskState as RiskState, {
      accessibility: "HIGH",
      modal_attractiveness: "HIGH",
      budget_pressure: "MODERATE",
    }),
  },
  {
    id: "capacity_pressure",
    domain: "municipal",
    title: "Kapacitetspress",
    oneLiner: "Ökad efterfrågan skapar strukturellt tryck på nätets kapacitet.",
    riskStateA: make(defaultRiskState as RiskState, {
      demandRisk: "MODERATE",
      congestion_pressure: "MODERATE",
      operational_capacity: "MODERATE",
    }),
    riskStateB: make(defaultRiskState as RiskState, {
      demandRisk: "HIGH",
      congestion_pressure: "HIGH",
      operational_capacity: "HIGH",
    }),
  },
  {
    id: "budget_constraint",
    domain: "municipal",
    title: "Budgetbegränsning",
    oneLiner: "Budgetbegränsningar minskar genomförandetakten.",
    riskStateA: make(defaultRiskState as RiskState, {
      budget_pressure: "MODERATE",
      operational_capacity: "MODERATE",
      capitalCommitmentRigidityRisk: "MODERATE",
    }),
    riskStateB: make(defaultRiskState as RiskState, {
      budget_pressure: "HIGH",
      operational_capacity: "HIGH",
      capitalCommitmentRigidityRisk: "HIGH",
    }),
  },
];
