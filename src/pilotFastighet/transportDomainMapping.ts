export type TransportSystemDriverId =
  | "accessibility"
  | "modalAttractiveness"
  | "demand"
  | "networkEfficiency"
  | "capacityPressure"
  | "implementationPacing"
  | "budgetPressure";

export type TransportPolicyLeverId =
  | "busSignalPriority"
  | "serviceFrequency"
  | "travelTimeReduction"
  | "parkingReduction"
  | "transitCorridorPriority";

export type EngineRiskKey =
  | "accessibility"
  | "modal_attractiveness"
  | "congestion_pressure"
  | "operational_capacity"
  | "transit_signal_priority"
  | "budget_pressure"
  | "demandRisk"
  | "tenantStabilityRisk"
  | "maintenanceIntensityRisk"
  | "capitalCommitmentRigidityRisk";

export type DriverInfluenceDirection = "increase" | "decrease";

export type TransportDriverDefinition = {
  id: TransportSystemDriverId;
  label: string;
  readableLabel_sv?: string;
  readableLabel_en?: string;
  // Optional direct bridge to current engine risk-state keys.
  engineRiskKey?: EngineRiskKey;
  // Optional upstream causal dependencies for inspector explainability.
  upstreamDependencies?: TransportSystemDriverId[];
  // Deterministic propagation metadata for Inspector/explainability layers.
  propagationChain: EngineRiskKey[];
};

export type TransportPolicyLeverMapping = {
  lever: TransportPolicyLeverId;
  label: string;
  influences: Array<{
    driver: TransportSystemDriverId;
    direction: DriverInfluenceDirection;
    weight: number;
  }>;
};

export const TRANSPORT_ENGINE_RISK_LABELS: Record<
  string,
  { readableLabel_sv: string; readableLabel_en: string }
> = {
  demandRisk: {
    readableLabel_sv: "Efterfrågetryck i transportsystemet",
    readableLabel_en: "Transport demand pressure",
  },
  budget_pressure: {
    readableLabel_sv: "Budgettryck i genomförandet",
    readableLabel_en: "Budget pressure in implementation",
  },
  capitalCommitmentRigidity: {
    readableLabel_sv: "Investeringsbindning i transportsystemet",
    readableLabel_en: "Capital commitment rigidity in the transport system",
  },
  capitalCommitmentRigidityRisk: {
    readableLabel_sv: "Ökad kapitalbindning",
    readableLabel_en: "Increased capital commitment rigidity",
  },
  maintenanceIntensity: {
    readableLabel_sv: "Underhallsintensiteten i transportsystemet",
    readableLabel_en: "Maintenance intensity in the transport system",
  },
  maintenanceIntensityRisk: {
    readableLabel_sv: "Underhallsintensiteten i transportsystemet",
    readableLabel_en: "Maintenance intensity in the transport system",
  },
  operational_capacity: {
    readableLabel_sv: "Genomförandekapacitet",
    readableLabel_en: "Implementation capacity",
  },
  transit_signal_priority: {
    readableLabel_sv: "Signalprioritering för kollektivtrafik",
    readableLabel_en: "Transit signal priority",
  },
  accessibility: {
    readableLabel_sv: "Tillgänglighet i nätverket",
    readableLabel_en: "Network accessibility",
  },
  modal_attractiveness: {
    readableLabel_sv: "Ökad färdmedelsattraktivitet",
    readableLabel_en: "Improved modal attractiveness",
  },
  tenantStabilityRisk: {
    readableLabel_sv: "Stabilitet i efterfrågebasen",
    readableLabel_en: "Demand-base stability",
  },
};

export const TRANSPORT_POLICY_EXPLANATION_LABELS: Record<
  string,
  { sv: string; en: string }
> = {
  budgetPressure: {
    sv: "budgettryck i genomförandet",
    en: "budget pressure in implementation",
  },
  implementationPacing: {
    sv: "genomförandetakt",
    en: "implementation pacing",
  },
  capacityPressure: {
    sv: "kapacitetstryck i nätverket",
    en: "network capacity pressure",
  },
  accessibility: {
    sv: "tillgänglighet i nätverket",
    en: "network accessibility",
  },
  modal_attractiveness: {
    sv: "ökad färdmedelsattraktivitet",
    en: "improved modal attractiveness",
  },
  demandRisk: {
    sv: "efterfrågetryck i transportsystemet",
    en: "transport demand pressure",
  },
  demand: {
    sv: "efterfrågetryck i transportsystemet",
    en: "transport demand pressure",
  },
  budget_pressure: {
    sv: "budgettryck i genomförandet",
    en: "budget pressure in implementation",
  },
  capitalCommitmentRigidityRisk: {
    sv: "ökad kapitalbindning",
    en: "increased capital commitment rigidity",
  },
  maintenanceIntensityRisk: {
    sv: "stigande underhållstryck",
    en: "rising maintenance pressure",
  },
  tenantStabilityRisk: {
    sv: "försvagad stabilitet i efterfrågebasen",
    en: "weakened demand-base stability",
  },
  operational_capacity: {
    sv: "genomförandekapacitet",
    en: "implementation capacity",
  },
  transit_signal_priority: {
    sv: "signalprioritering för kollektivtrafik",
    en: "transit signal priority",
  },
  congestion_pressure: {
    sv: "kapacitetstryck i nätverket",
    en: "network capacity pressure",
  },
};

export function getTransportPolicyExplanationLabel(
  key: string,
  language: "sv" | "en"
): string {
  const explicit = TRANSPORT_POLICY_EXPLANATION_LABELS[key];
  if (explicit) {
    return explicit[language];
  }

  const engineLabel = TRANSPORT_ENGINE_RISK_LABELS[key];
  if (engineLabel) {
    return language === "sv"
      ? engineLabel.readableLabel_sv
      : engineLabel.readableLabel_en;
  }

  const systemDriver =
    TRANSPORT_SYSTEM_DRIVERS[key as keyof typeof TRANSPORT_SYSTEM_DRIVERS];
  if (systemDriver) {
    return language === "sv"
      ? systemDriver.readableLabel_sv ?? systemDriver.label
      : systemDriver.readableLabel_en ?? systemDriver.label;
  }

  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function buildTransportPolicyPropagationExplanation(
  chain: string[],
  language: "sv" | "en"
): string {
  const labels = chain
    .map((step) => getTransportPolicyExplanationLabel(step, language))
    .filter(Boolean);

  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];

  if (language === "sv") {
    if (labels.length === 2) {
      return `${labels[0]} påverkar ${labels[1]}`;
    }

    return `${labels[0]} påverkar ${labels
      .slice(1, -1)
      .join(", ")} och leder vidare till ${labels[labels.length - 1]}`;
  }

  if (labels.length === 2) {
    return `${labels[0]} affects ${labels[1]}`;
  }

  return `${labels[0]} affects ${labels
    .slice(1, -1)
    .join(", ")} and ultimately drives ${labels[labels.length - 1]}`;
}

export const TRANSPORT_SYSTEM_DRIVERS: Record<
  TransportSystemDriverId,
  TransportDriverDefinition
> = {
  accessibility: {
    id: "accessibility",
    label: "Accessibility",
    readableLabel_sv: "Tillgängligheten i transportsystemet",
    readableLabel_en: "Accessibility",
    engineRiskKey: "accessibility",
    propagationChain: [
      "accessibility",
      "demand",
      "budgetPressure",
      "implementationPacing",
      "capacityPressure",
      "networkEfficiency",
    ],
  },
  modalAttractiveness: {
    id: "modalAttractiveness",
    label: "Modal attractiveness",
    readableLabel_sv: "Attraktiviteten i transportsystemet",
    readableLabel_en: "Modal attractiveness",
    engineRiskKey: "modal_attractiveness",
    propagationChain: ["modal_attractiveness", "accessibility", "demandRisk"],
  },
  demand: {
    id: "demand",
    label: "Demand",
    readableLabel_sv: "Efterfrågetryck i transportsystemet",
    readableLabel_en: "Transport demand pressure",
    engineRiskKey: "demand",
    propagationChain: [
      "demand",
      "budgetPressure",
      "implementationPacing",
      "capacityPressure",
      "networkEfficiency",
    ],
    upstreamDependencies: ["accessibility"],
  },
  networkEfficiency: {
    id: "networkEfficiency",
    label: "Network efficiency",
    engineRiskKey: "transit_signal_priority",
    propagationChain: [
      "transit_signal_priority",
      "operational_capacity",
      "tenantStabilityRisk",
      "demandRisk",
    ],
  },
  capacityPressure: {
    id: "capacityPressure",
    label: "Capacity pressure",
    engineRiskKey: "congestion_pressure",
    propagationChain: [
      "capacityPressure",
      "modalAttractiveness",
      "accessibility",
      "demand"
    ],
  },
  implementationPacing: {
    id: "implementationPacing",
    label: "Implementation pacing",
    engineRiskKey: "operational_capacity",
    propagationChain: [
      "implementationPacing",
      "networkEfficiency",
      "accessibility",
      "demand"
    ],
  },
  budgetPressure: {
    id: "budgetPressure",
    label: "Budget pressure",
    engineRiskKey: "budget_pressure",
    propagationChain: [
      "budgetPressure",
      "implementationPacing",
      "capacityPressure",
      "demand"
    ],
  },
};

export const TRANSPORT_POLICY_ACTION_LABELS = {
  increase_service_frequency: {
    sv: "Ökad turtäthet",
    en: "Increase service frequency",
  },
  reduce_travel_time: {
    sv: "Kortare restider",
    en: "Reduce travel time",
  },
  transit_signal_priority: {
    sv: "Signalprioritering för kollektivtrafik",
    en: "Transit signal priority",
  },
  reduce_parking_supply: {
    sv: "Minskad parkeringstillgång",
    en: "Reduce parking supply",
  },

  improve_accessibility: {
    sv: "Förbättrad tillgänglighet",
    en: "Improve accessibility",
  },

  expand_capacity: {
    sv: "Kapacitetsutbyggnad",
    en: "Expand capacity",
  },
};

export const TRANSPORT_POLICY_LEVER_MAPPINGS: Record<
  TransportPolicyLeverId,
  TransportPolicyLeverMapping
> = {
  busSignalPriority: {
    lever: "busSignalPriority",
    label: "Bus signal priority",
    influences: [
      { driver: "networkEfficiency", direction: "increase", weight: 0.8 },
      { driver: "capacityPressure", direction: "decrease", weight: 0.4 },
    ],
  },
  serviceFrequency: {
    lever: "serviceFrequency",
    label: "Service frequency",
    influences: [
      { driver: "accessibility", direction: "increase", weight: 0.9 },
      { driver: "implementationPacing", direction: "increase", weight: 0.5 },
      { driver: "budgetPressure", direction: "increase", weight: 0.5 },
    ],
  },
  travelTimeReduction: {
    lever: "travelTimeReduction",
    label: "Travel time reduction",
    influences: [
      { driver: "modalAttractiveness", direction: "increase", weight: 0.8 },
      { driver: "networkEfficiency", direction: "increase", weight: 0.6 },
    ],
  },
  parkingReduction: {
    lever: "parkingReduction",
    label: "Parking reduction",
    influences: [
      { driver: "modalAttractiveness", direction: "increase", weight: 0.6 },
      { driver: "demand", direction: "decrease", weight: 0.5 },
    ],
  },
  transitCorridorPriority: {
    lever: "transitCorridorPriority",
    label: "Transit corridor priority",
    influences: [
      { driver: "networkEfficiency", direction: "increase", weight: 0.7 },
      { driver: "implementationPacing", direction: "increase", weight: 0.6 },
      { driver: "budgetPressure", direction: "increase", weight: 0.4 },
    ],
  },
};

(TRANSPORT_POLICY_LEVER_MAPPINGS as Record<string, TransportPolicyLeverMapping>)[
  "increase_service_frequency"
] = TRANSPORT_POLICY_LEVER_MAPPINGS["serviceFrequency"];

export function getTransportDriverMappingForLever(
  lever: TransportPolicyLeverId
): TransportPolicyLeverMapping {
  return TRANSPORT_POLICY_LEVER_MAPPINGS[lever];
}

export function getTransportPropagationChain(
  driver: TransportSystemDriverId
): EngineRiskKey[] {
  return TRANSPORT_SYSTEM_DRIVERS[driver].propagationChain;
}
