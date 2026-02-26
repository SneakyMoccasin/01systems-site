export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type CurveType = "LINEAR" | "EXPONENTIAL" | "LOGISTIC";
export type SystemDimension = "load" | "cost" | "recovery" | "sensitivity";

export type ParameterKey =
  | "demandRisk"
  | "pricingPowerRisk"
  | "tenantStabilityRisk"
  | "maintenanceIntensityRisk"
  | "operationalEfficiencyRisk"
  | "energyExposureRisk"
  | "interestRateExposureRisk"
  | "leverageLevelRisk"
  | "refinancingRisk"
  | "marketVolatilityRisk"
  | "regulatoryPressureRisk"
  | "capitalCommitmentRigidityRisk";

export type ImpactSpec = {
  dimension: SystemDimension;
  direction: "increase" | "decrease";
  curve: CurveType;
};

export type ParameterSpec = {
  key: ParameterKey;
  label: string;
  group: "Income Dynamics" | "Operations" | "Capital & Financing" | "External Pressure";
  impacts: ImpactSpec[];
};

export type RefinancingTriggerSnapshot = {
  step: number;
  margin: number;
  leverageFactor: number;
  safetyMarginThreshold: number;
  leverageThreshold: number;
};

export type SystemEvent =
  | {
      type: "RefinancingConstraintActivated";
      step: number;
      reason: string;
      trigger: RefinancingTriggerSnapshot;
    }
  | {
      type: "RefinancingConstraintEscalation";
      step: number;
      severityIndex: number;
      reason: string;
    };

export const REAL_ESTATE_IMPACT_CONTRACT: ParameterSpec[] = [
  {
    key: "demandRisk",
    label: "Demand Strength (risk)",
    group: "Income Dynamics",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "pricingPowerRisk",
    label: "Pricing Power (risk)",
    group: "Income Dynamics",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "tenantStabilityRisk",
    label: "Tenant Stability (risk)",
    group: "Income Dynamics",
    impacts: [
      { dimension: "load", direction: "increase", curve: "LINEAR" },
      { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
    ],
  },
  {
    key: "maintenanceIntensityRisk",
    label: "Maintenance Intensity (risk)",
    group: "Operations",
    impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
  },
  {
    key: "operationalEfficiencyRisk",
    label: "Operational Efficiency (risk)",
    group: "Operations",
    impacts: [
      { dimension: "cost", direction: "increase", curve: "LINEAR" },
      { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
    ],
  },
  {
    key: "energyExposureRisk",
    label: "Energy Exposure (risk)",
    group: "Operations",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "interestRateExposureRisk",
    label: "Interest Rate Exposure (risk)",
    group: "Capital & Financing",
    impacts: [{ dimension: "cost", direction: "increase", curve: "EXPONENTIAL" }],
  },
  {
    key: "leverageLevelRisk",
    label: "Leverage Level (risk)",
    group: "Capital & Financing",
    impacts: [
      { dimension: "cost", direction: "increase", curve: "EXPONENTIAL" },
      { dimension: "sensitivity", direction: "increase", curve: "EXPONENTIAL" },
    ],
  },
  {
    key: "refinancingRisk",
    label: "Refinancing Risk (risk)",
    group: "Capital & Financing",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LOGISTIC" }],
  },
  {
    key: "marketVolatilityRisk",
    label: "Market Volatility (risk)",
    group: "External Pressure",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "regulatoryPressureRisk",
    label: "Regulatory Pressure (risk)",
    group: "External Pressure",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "capitalCommitmentRigidityRisk",
    label: "Capital Commitment Rigidity (risk)",
    group: "External Pressure",
    impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
  },
];

const CAPITAL_KEYS: ParameterKey[] = [
  "interestRateExposureRisk",
  "leverageLevelRisk",
  "refinancingRisk",
];

export function groupContractByGroup(
  contract: ParameterSpec[]
): Record<ParameterSpec["group"], ParameterSpec[]> {
  const out: Record<string, ParameterSpec[]> = {
    "Income Dynamics": [],
    Operations: [],
    "Capital & Financing": [],
    "External Pressure": [],
  };
  for (const spec of contract) {
    out[spec.group].push(spec);
  }
  return out as Record<ParameterSpec["group"], ParameterSpec[]>;
}

export function isCapitalKey(key: ParameterKey): boolean {
  return CAPITAL_KEYS.includes(key);
}
