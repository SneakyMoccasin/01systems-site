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
    propagationChain: ["accessibility", "demandRisk"],
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
    readableLabel_sv: "Efterfrågerisk i transportsystemet",
    readableLabel_en: "Demand risk",
    engineRiskKey: "demand",
    propagationChain: ["demand", "budgetPressure"],
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
      { driver: "modalAttractiveness", direction: "increase", weight: 0.7 },
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
      { driver: "capacityPressure", direction: "decrease", weight: 0.5 },
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
