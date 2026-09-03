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
  | "energyExposureRisk"
  | "operationalEfficiencyRisk"
  | "demandRisk"
  | "tenantStabilityRisk"
  | "maintenanceIntensityRisk"
  | "capitalCommitmentRigidityRisk";

export type DriverInfluenceDirection = "increase" | "decrease";

export type TransportActionPresentationId =
  | "increase_service_frequency"
  | "reduce_travel_time"
  | "expand_cycling_infrastructure"
  | "electrify_bus_fleet"
  | "transit_signal_priority"
  | "reduce_parking_supply";

export type TransportActionPresentation = Readonly<{
  actionId: TransportActionPresentationId;
  actionLabel: Readonly<{ sv: string; en: string }>;
  operationalDescription: Readonly<{ sv: string; en: string }>;
  effects: readonly Readonly<{
    driverId: EngineRiskKey;
    direction: DriverInfluenceDirection;
    role: "represented-benefit" | "represented-trade-off" | "represented-effect";
    label: Readonly<{ sv: string; en: string }>;
  }>[];
}>;

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
  /** Ordered steps for inspector/graph (engine keys and/or transport driver ids). */
  propagationChain: (EngineRiskKey | TransportSystemDriverId)[];
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
    engineRiskKey: "demandRisk",
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

/**
 * Deterministic presentation of the currently executable Municipal action effects.
 * Numeric magnitudes remain owned exclusively by the executable profile.
 */
export const TRANSPORT_ACTION_PRESENTATION: Readonly<
  Record<TransportActionPresentationId, TransportActionPresentation>
> = {
  increase_service_frequency: {
    actionId: "increase_service_frequency",
    actionLabel: { sv: "Öka turtäthet", en: "Increase service frequency" },
    operationalDescription: {
      sv: "Ökar turtätheten. Modellen representerar förbättrad tillgänglighet samt minskad tillgänglig operativ kapacitet och ökat budgettryck som avvägningar.",
      en: "Increases service frequency. The model represents improved accessibility, with reduced available operational capacity and increased budget pressure as trade-offs.",
    },
    effects: [
      { driverId: "accessibility", direction: "increase", role: "represented-benefit", label: { sv: "Tillgängligheten ökar", en: "Accessibility increases" } },
      { driverId: "operational_capacity", direction: "decrease", role: "represented-trade-off", label: { sv: "Tillgänglig operativ kapacitet minskar", en: "Available operational capacity decreases" } },
      { driverId: "budget_pressure", direction: "increase", role: "represented-trade-off", label: { sv: "Budgettrycket ökar", en: "Budget pressure increases" } },
    ],
  },
  reduce_travel_time: {
    actionId: "reduce_travel_time",
    actionLabel: { sv: "Minska restid", en: "Reduce travel time" },
    operationalDescription: {
      sv: "Minskar restiden. Modellen representerar ökad färdmedelsattraktivitet.",
      en: "Reduces travel time. The model represents increased modal attractiveness.",
    },
    effects: [
      { driverId: "modal_attractiveness", direction: "increase", role: "represented-benefit", label: { sv: "Färdmedelsattraktiviteten ökar", en: "Modal attractiveness increases" } },
    ],
  },
  expand_cycling_infrastructure: {
    actionId: "expand_cycling_infrastructure",
    actionLabel: { sv: "Bygg ut cykelinfrastruktur", en: "Expand cycling infrastructure" },
    operationalDescription: {
      sv: "Bygger ut cykelinfrastrukturen. Modellen representerar ökad färdmedelsattraktivitet, minskat trängseltryck och ökat budgettryck som genomförandeavvägning.",
      en: "Expands cycling infrastructure. The model represents increased modal attractiveness, reduced congestion pressure, and increased budget pressure as the implementation trade-off.",
    },
    effects: [
      { driverId: "modal_attractiveness", direction: "increase", role: "represented-benefit", label: { sv: "Färdmedelsattraktiviteten ökar", en: "Modal attractiveness increases" } },
      { driverId: "congestion_pressure", direction: "decrease", role: "represented-benefit", label: { sv: "Trängseltrycket minskar", en: "Congestion pressure decreases" } },
      { driverId: "budget_pressure", direction: "increase", role: "represented-trade-off", label: { sv: "Budgettrycket ökar", en: "Budget pressure increases" } },
    ],
  },
  electrify_bus_fleet: {
    actionId: "electrify_bus_fleet",
    actionLabel: { sv: "Elektrifiera bussflotta", en: "Electrify bus fleet" },
    operationalDescription: {
      sv: "Elektrifierar bussflottan. Modellen representerar minskad energiexponeringsrisk och drifteffektivitetsrisk samt ökad kapitalbindning som avvägning.",
      en: "Electrifies the bus fleet. The model represents reduced energy-exposure and operational-efficiency risk, with increased capital-commitment rigidity as the trade-off.",
    },
    effects: [
      { driverId: "energyExposureRisk", direction: "decrease", role: "represented-benefit", label: { sv: "Energiexponeringsrisken minskar", en: "Energy-exposure risk decreases" } },
      { driverId: "operationalEfficiencyRisk", direction: "decrease", role: "represented-benefit", label: { sv: "Drifteffektivitetsrisken minskar", en: "Operational-efficiency risk decreases" } },
      { driverId: "capitalCommitmentRigidityRisk", direction: "increase", role: "represented-trade-off", label: { sv: "Kapitalbindningen ökar", en: "Capital-commitment rigidity increases" } },
    ],
  },
  transit_signal_priority: {
    actionId: "transit_signal_priority",
    actionLabel: { sv: "Signalprioritera kollektivtrafik", en: "Transit signal priority" },
    operationalDescription: {
      sv: "Prioriterar kollektivtrafiken i signaler. Modellen representerar ökad signalprioritet för kollektivtrafik.",
      en: "Prioritizes transit at signals. The model represents increased transit signal priority.",
    },
    effects: [
      { driverId: "transit_signal_priority", direction: "increase", role: "represented-effect", label: { sv: "Signalprioriteten för kollektivtrafik ökar", en: "Transit signal priority increases" } },
    ],
  },
  reduce_parking_supply: {
    actionId: "reduce_parking_supply",
    actionLabel: { sv: "Minska parkeringsutbud", en: "Reduce parking supply" },
    operationalDescription: {
      sv: "Minskar parkeringsutbudet. Den nuvarande modellen representerar endast ökad negativ efterfrågerisk; ingen effekt på färdmedelsval, trängsel eller tillgänglighet beräknas.",
      en: "Reduces parking supply. The current model represents only increased adverse demand risk; no mode-shift, congestion, or accessibility effect is calculated.",
    },
    effects: [
      { driverId: "demandRisk", direction: "increase", role: "represented-trade-off", label: { sv: "Den negativa efterfrågerisken ökar", en: "Adverse demand risk increases" } },
    ],
  },
};

export function getTransportActionPresentation(
  actionId: string
): TransportActionPresentation | null {
  return TRANSPORT_ACTION_PRESENTATION[
    actionId as TransportActionPresentationId
  ] ?? null;
}

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
): (EngineRiskKey | TransportSystemDriverId)[] {
  return TRANSPORT_SYSTEM_DRIVERS[driver].propagationChain;
}
