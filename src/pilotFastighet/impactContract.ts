export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type CurveType = "LINEAR" | "EXPONENTIAL" | "LOGISTIC";
export type SystemDimension = "load" | "cost" | "recovery" | "sensitivity";
export type PropagationPolarity = "risk" | "benefit";

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
  | "capitalCommitmentRigidityRisk"
  | "accessibility"
  | "modal_attractiveness"
  | "congestion_pressure"
  | "operational_capacity"
  | "transit_signal_priority"
  | "budget_pressure";

export type ImpactSpec = {
  dimension: SystemDimension;
  direction: "increase" | "decrease";
  curve: CurveType;
};

export type ParameterSpec = {
  key: ParameterKey;
  label: string | { sv: string; en: string };
  propagationPolarity?: PropagationPolarity;
  group:
    | "Income Dynamics"
    | "Operations"
    | "Capital & Financing"
    | "External Pressure"
    | "Accessibility & Mode Shift"
    | "Operations & Capacity"
    | "Financial Flexibility";
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
    };

export const REAL_ESTATE_IMPACT_CONTRACT: ParameterSpec[] = [
  {
    key: "demandRisk",
    label: "Efterfrågan (risk)",
    propagationPolarity: "risk",
    group: "Income Dynamics",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "pricingPowerRisk",
    label: "Prissättningskraft (risk)",
    propagationPolarity: "risk",
    group: "Income Dynamics",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "tenantStabilityRisk",
    label: "Hyresgästers stabilitet (risk)",
    propagationPolarity: "risk",
    group: "Income Dynamics",
    impacts: [
      { dimension: "load", direction: "increase", curve: "LINEAR" },
      { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
    ],
  },
  {
    key: "maintenanceIntensityRisk",
    label: "Underhållsnivå (risk)",
    propagationPolarity: "risk",
    group: "Operations",
    impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
  },
  {
    key: "operationalEfficiencyRisk",
    label: "Drifteffektivitet (risk)",
    propagationPolarity: "risk",
    group: "Operations",
    impacts: [
      { dimension: "cost", direction: "increase", curve: "LINEAR" },
      { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
    ],
  },
  {
    key: "energyExposureRisk",
    label: "Energiexponering (risk)",
    propagationPolarity: "risk",
    group: "Operations",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "interestRateExposureRisk",
    label: "Ränteexponering (risk)",
    propagationPolarity: "risk",
    group: "Capital & Financing",
    impacts: [{ dimension: "cost", direction: "increase", curve: "EXPONENTIAL" }],
  },
  {
    key: "leverageLevelRisk",
    label: "Belåningsgrad (risk)",
    propagationPolarity: "risk",
    group: "Capital & Financing",
    impacts: [
      { dimension: "cost", direction: "increase", curve: "EXPONENTIAL" },
      { dimension: "sensitivity", direction: "increase", curve: "EXPONENTIAL" },
    ],
  },
  {
    key: "refinancingRisk",
    label: "Refinansieringsrisk (risk)",
    propagationPolarity: "risk",
    group: "Capital & Financing",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LOGISTIC" }],
  },
  {
    key: "marketVolatilityRisk",
    label: "Marknadsvolatilitet (risk)",
    propagationPolarity: "risk",
    group: "External Pressure",
    impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "regulatoryPressureRisk",
    label: "Regulatoriskt tryck (risk)",
    propagationPolarity: "risk",
    group: "External Pressure",
    impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
  },
  {
    key: "capitalCommitmentRigidityRisk",
    label: "Kapitalbindning (risk)",
    propagationPolarity: "risk",
    group: "External Pressure",
    impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
  },
  {
    key: "accessibility",
    label: {
      sv: "Tillgänglighet",
      en: "Accessibility",
    },
    propagationPolarity: "benefit",
    group: "Accessibility & Mode Shift",
    impacts: [
      { dimension: "load", direction: "decrease", curve: "LINEAR" },
      { dimension: "recovery", direction: "increase", curve: "LINEAR" },
    ],
  },
  {
    key: "modal_attractiveness",
    label: {
      sv: "Färdmedelsattraktivitet",
      en: "Modal Attractiveness",
    },
    propagationPolarity: "benefit",
    group: "Accessibility & Mode Shift",
    impacts: [
      { dimension: "load", direction: "decrease", curve: "LINEAR" },
      { dimension: "recovery", direction: "increase", curve: "LINEAR" },
    ],
  },
  {
    key: "congestion_pressure",
    label: {
      sv: "Trängseltryck",
      en: "Congestion Pressure",
    },
    propagationPolarity: "risk",
    group: "Accessibility & Mode Shift",
    impacts: [
      { dimension: "load", direction: "increase", curve: "LINEAR" },
      { dimension: "cost", direction: "increase", curve: "LINEAR" },
    ],
  },
  {
    key: "operational_capacity",
    label: {
      sv: "Operativ kapacitet",
      en: "Operational Capacity",
    },
    propagationPolarity: "benefit",
    group: "Operations & Capacity",
    impacts: [
      { dimension: "load", direction: "decrease", curve: "LINEAR" },
      { dimension: "recovery", direction: "increase", curve: "LINEAR" },
    ],
  },
  {
    key: "transit_signal_priority",
    label: {
      sv: "Signalprioritering kollektivtrafik",
      en: "Transit Signal Priority",
    },
    propagationPolarity: "benefit",
    group: "Operations & Capacity",
    impacts: [
      { dimension: "load", direction: "decrease", curve: "LINEAR" },
      { dimension: "recovery", direction: "increase", curve: "LINEAR" },
    ],
  },
  {
    key: "budget_pressure",
    label: {
      sv: "Budgettryck",
      en: "Budget Pressure",
    },
    propagationPolarity: "risk",
    group: "Financial Flexibility",
    impacts: [
      { dimension: "cost", direction: "increase", curve: "LINEAR" },
      { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
    ],
  },
];

function cloneImpactContract(contract: ParameterSpec[]): ParameterSpec[] {
  return contract.map((spec) => ({
    ...spec,
    impacts: spec.impacts.map((impact) => ({ ...impact })),
  }));
}

export const MUNICIPAL_IMPACT_CONTRACT = cloneImpactContract(
  REAL_ESTATE_IMPACT_CONTRACT
);

export const CONSULTING_IMPACT_CONTRACT = cloneImpactContract(
  REAL_ESTATE_IMPACT_CONTRACT
);

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
    "Accessibility & Mode Shift": [],
    "Operations & Capacity": [],
    "Financial Flexibility": [],
  };
  for (const spec of contract) {
    out[spec.group].push(spec);
  }
  return out as Record<ParameterSpec["group"], ParameterSpec[]>;
}

export function isCapitalKey(key: ParameterKey): boolean {
  return CAPITAL_KEYS.includes(key);
}

const DEFAULT_ADVERSE_PROPAGATION_LEVELS: Record<PropagationPolarity, RiskLevel[]> = {
  risk: ["HIGH", "SEVERE"],
  benefit: ["LOW"],
};

export function getParameterSpec(
  key: string
): ParameterSpec | undefined {
  return REAL_ESTATE_IMPACT_CONTRACT.find((spec) => spec.key === key);
}

export function getPropagationTriggerLevels(
  key: string
): RiskLevel[] {
  const spec = getParameterSpec(key);
  const polarity = spec?.propagationPolarity ?? "risk";
  return DEFAULT_ADVERSE_PROPAGATION_LEVELS[polarity];
}

export function isPropagationTriggerLevel(
  key: string,
  level: RiskLevel | undefined
): boolean {
  if (!level) return false;
  return getPropagationTriggerLevels(key).includes(level);
}
