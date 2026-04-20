import {
  TRANSPORT_ENGINE_RISK_LABELS,
  TRANSPORT_POLICY_LEVER_MAPPINGS,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportPolicyLeverId,
  type TransportSystemDriverId,
} from "./transportDomainMapping";
import type { CascadeEvent } from "./riskPropagation";
import { mapRiskLabelToPolicyLabel } from "@/app/pilot-fastighet/components/inspector-utils/mapRiskLabelToPolicyLabel";

type Language = "sv" | "en";

const ACTION_TO_POLICY_LEVER: Record<string, TransportPolicyLeverId> = {
  increase_service_frequency: "serviceFrequency",
  reduce_travel_time: "travelTimeReduction",
  reduce_parking_supply: "parkingReduction",
  transit_signal_priority: "busSignalPriority",
  expand_cycling_infrastructure: "transitCorridorPriority",
};

function localizeSystemDriverName(driver: TransportSystemDriverId, language: Language): string {
  const sv: Record<TransportSystemDriverId, string> = {
    accessibility: "tillgänglighet",
    modalAttractiveness: "färdmedelsattraktivitet",
    networkEfficiency: "nätverkseffektivitet",
    capacityPressure: "kapacitetstryck",
    implementationPacing: "genomförandetakt",
    budgetPressure: "budgettryck",
  };
  const en: Record<TransportSystemDriverId, string> = {
    accessibility: "accessibility",
    modalAttractiveness: "modal attractiveness",
    networkEfficiency: "network efficiency",
    capacityPressure: "capacity pressure",
    implementationPacing: "implementation pacing",
    budgetPressure: "budget pressure",
  };
  return language === "sv" ? sv[driver] : en[driver];
}

function localizePolicyLeverName(lever: TransportPolicyLeverId, language: Language): string {
  const sv: Record<TransportPolicyLeverId, string> = {
    busSignalPriority: "signalprioritering buss",
    serviceFrequency: "turtäthet",
    travelTimeReduction: "restidsreduktion",
    parkingReduction: "parkeringsreduktion",
    transitCorridorPriority: "prioritering av kollektivtrafikkorridor",
  };
  const en: Record<TransportPolicyLeverId, string> = {
    busSignalPriority: "bus signal priority",
    serviceFrequency: "service frequency",
    travelTimeReduction: "travel time reduction",
    parkingReduction: "parking reduction",
    transitCorridorPriority: "transit corridor priority",
  };
  return language === "sv" ? sv[lever] : en[lever];
}

function normalizeTransportDriverKey(
  key: string | null | undefined
): TransportSystemDriverId | null {
  if (!key) return null;
  const aliases: Record<string, TransportSystemDriverId> = {
    accessibility: "accessibility",
    modal_attractiveness: "modalAttractiveness",
    modalAttractiveness: "modalAttractiveness",
    demandRisk: "demand",
    demand: "demand",
    transit_signal_priority: "networkEfficiency",
    networkEfficiency: "networkEfficiency",
    congestion_pressure: "capacityPressure",
    capacityPressure: "capacityPressure",
    operational_capacity: "implementationPacing",
    implementationPacing: "implementationPacing",
    budget_pressure: "budgetPressure",
    budgetPressure: "budgetPressure",
  };
  return aliases[key] ?? null;
}

function toReadableTransportChainStep(stepKey: string, language: Language): string {
  const systemDef =
    TRANSPORT_SYSTEM_DRIVERS[
      stepKey as keyof typeof TRANSPORT_SYSTEM_DRIVERS
    ];
  if (systemDef) {
    return language === "sv"
      ? systemDef.readableLabel_sv ?? systemDef.label
      : systemDef.readableLabel_en ?? systemDef.label;
  }

  const engineDef = TRANSPORT_ENGINE_RISK_LABELS[stepKey];
  if (engineDef) {
    return language === "sv"
      ? engineDef.readableLabel_sv
      : engineDef.readableLabel_en;
  }

  const policyLabel = mapRiskLabelToPolicyLabel(stepKey, language);
  if (policyLabel !== stepKey) return policyLabel;

  return stepKey
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type TransportInspectorContext = {
  policyLeverLabel: string;
  systemDriverLabel: string;
  propagationChainLabel: string;
  primaryDriver: TransportSystemDriverId;
  dominantScenarioDifferenceChannel?: string | null;
};

type ResolveArgs = {
  language: Language;
  selectedActions?: string[];
  policyDriverKey?: string | null;
  systemDriverKey?: string | null;
  primaryDriverKey?: string | null;
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  primaryPropagationSignatureA?: string | null;
  primaryPropagationSignatureB?: string | null;
};

export function resolveTransportInspectorContext(
  args: ResolveArgs
): TransportInspectorContext | null {
  const {
    language,
    selectedActions = [],
    policyDriverKey,
    systemDriverKey,
    primaryDriverKey,
    cascadeEventsA,
    cascadeEventsB,
    primaryPropagationSignatureA,
    primaryPropagationSignatureB,
  } = args;

  const latestAction = selectedActions[selectedActions.length - 1];
  const policyLever = latestAction ? ACTION_TO_POLICY_LEVER[latestAction] : undefined;
  if (!policyLever) return null;

  const leverMapping = TRANSPORT_POLICY_LEVER_MAPPINGS[policyLever];
  if (!leverMapping || leverMapping.influences.length === 0) return null;

  const selectedTransportDriver =
    primaryDriverKey ??
    (cascadeEventsB && cascadeEventsB.length > 0
      ? (cascadeEventsB[0].sourceRisk as TransportSystemDriverId)
      : cascadeEventsA && cascadeEventsA.length > 0
      ? (cascadeEventsA[0].sourceRisk as TransportSystemDriverId)
      : null);
  if (!selectedTransportDriver) return null;

  const policyLeverLabel = localizePolicyLeverName(policyLever, language);
  const systemDriverLabel = selectedTransportDriver
    ? mapRiskLabelToPolicyLabel(selectedTransportDriver, language)
    : null;
  const normalizedSelectedDriver = normalizeTransportDriverKey(selectedTransportDriver);
  const driverDef =
    (normalizedSelectedDriver &&
      TRANSPORT_SYSTEM_DRIVERS[
        normalizedSelectedDriver as keyof typeof TRANSPORT_SYSTEM_DRIVERS
      ]) ||
    null;

  if (!driverDef) return null;

  const propagationChainLabel = driverDef.propagationChain
    .map((driverId) => toReadableTransportChainStep(driverId, language))
    .map((step, index) => (index === 0 ? step : `→ ${step}`))
    .join("\n");
  const dominantScenarioDifferenceChannel =
    primaryPropagationSignatureA &&
    primaryPropagationSignatureB &&
    primaryPropagationSignatureA !== primaryPropagationSignatureB
      ? primaryPropagationSignatureB
      : null;

  return {
    policyLeverLabel:
      policyDriverKey
        ? mapRiskLabelToPolicyLabel(policyDriverKey, language)
        : null,
    systemDriverLabel:
      systemDriverKey
        ? mapRiskLabelToPolicyLabel(systemDriverKey, language)
        : null,
    propagationChainLabel,
    primaryDriver: selectedTransportDriver,
    dominantScenarioDifferenceChannel,
  };
}
