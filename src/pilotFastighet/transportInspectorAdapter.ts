import {
  TRANSPORT_POLICY_LEVER_MAPPINGS,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportPolicyLeverId,
  type TransportSystemDriverId,
} from "./transportDomainMapping";
import type { CascadeEvent } from "./riskPropagation";

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
    cascadeEventsB && cascadeEventsB.length > 0
      ? (cascadeEventsB[0].sourceRisk as TransportSystemDriverId)
      : cascadeEventsA && cascadeEventsA.length > 0
      ? (cascadeEventsA[0].sourceRisk as TransportSystemDriverId)
      : null;
  if (!selectedTransportDriver) return null;

  const policyLeverLabel = localizePolicyLeverName(policyLever, language);
  const systemDriverLabel = localizeSystemDriverName(selectedTransportDriver, language);
  const propagationChain = TRANSPORT_SYSTEM_DRIVERS[
    selectedTransportDriver
  ].propagationChain
    .map((driverId) => {
      const driverDef =
        TRANSPORT_SYSTEM_DRIVERS[
          driverId as keyof typeof TRANSPORT_SYSTEM_DRIVERS
        ];

      return language === "sv"
        ? driverDef?.readableLabel_sv ?? driverId
        : driverDef?.readableLabel_en ?? driverId;
    })
    .join(" → ");
  const propagationChainLabel = propagationChain;
  const dominantScenarioDifferenceChannel =
    primaryPropagationSignatureA &&
    primaryPropagationSignatureB &&
    primaryPropagationSignatureA !== primaryPropagationSignatureB
      ? primaryPropagationSignatureB
      : null;

  return {
    policyLeverLabel,
    systemDriverLabel,
    propagationChainLabel,
    primaryDriver: selectedTransportDriver,
    dominantScenarioDifferenceChannel,
  };
}
