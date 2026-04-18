import {
  TRANSPORT_POLICY_LEVER_MAPPINGS,
  TRANSPORT_SYSTEM_DRIVERS,
  type EngineRiskKey,
  type TransportPolicyLeverId,
  type TransportSystemDriverId,
} from "./transportDomainMapping";

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

function toReadableLabel(driverId: string): string {
  const withSpaces = driverId.replace(/([a-z])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function findTransportDriverByEngineRiskKey(
  key: string | null | undefined
): TransportSystemDriverId | null {
  if (!key) return null;
  const entry = Object.values(TRANSPORT_SYSTEM_DRIVERS).find(
    (driver) => driver.engineRiskKey === key
  );
  return entry?.id ?? null;
}

export type TransportInspectorContext = {
  policyLeverLabel: string;
  systemDriverLabel: string;
  propagationChainLabel: string;
  primaryDriver: TransportSystemDriverId;
};

type ResolveArgs = {
  language: Language;
  selectedActions?: string[];
  policyDriverKey?: string | null;
  systemDriverKey?: string | null;
  primaryDriverKey?: string | null;
};

export function resolveTransportInspectorContext(
  args: ResolveArgs
): TransportInspectorContext | null {
  const { language, selectedActions = [], policyDriverKey, systemDriverKey, primaryDriverKey } = args;

  const latestAction = selectedActions[selectedActions.length - 1];
  const policyLever = latestAction ? ACTION_TO_POLICY_LEVER[latestAction] : undefined;
  if (!policyLever) return null;

  const leverMapping = TRANSPORT_POLICY_LEVER_MAPPINGS[policyLever];
  if (!leverMapping || leverMapping.influences.length === 0) return null;

  const transportDriverFromSignals =
    findTransportDriverByEngineRiskKey(policyDriverKey) ??
    findTransportDriverByEngineRiskKey(systemDriverKey) ??
    findTransportDriverByEngineRiskKey(primaryDriverKey);

  const topWeightedDriver =
    [...leverMapping.influences].sort((a, b) => b.weight - a.weight)[0]?.driver ?? null;

  const primaryTransportDriver =
    primaryDriverKey &&
    primaryDriverKey in TRANSPORT_SYSTEM_DRIVERS
      ? (primaryDriverKey as TransportSystemDriverId)
      : null;

  const selectedTransportDriver =
    topWeightedDriver ??
    transportDriverFromSignals ??
    primaryTransportDriver;
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

  return {
    policyLeverLabel,
    systemDriverLabel,
    propagationChainLabel,
    primaryDriver: selectedTransportDriver,
  };
}
