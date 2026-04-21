import {
  buildTransportPolicyPropagationExplanation,
  getTransportPolicyExplanationLabel,
  TRANSPORT_ENGINE_RISK_LABELS,
  TRANSPORT_POLICY_LEVER_MAPPINGS,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportPolicyLeverId,
  type TransportSystemDriverId,
} from "./transportDomainMapping";
import type { CascadeEvent } from "./riskPropagation";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";

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
  const translatedLabel = getTransportPolicyExplanationLabel(stepKey, language);
  if (translatedLabel && translatedLabel !== stepKey) {
    return translatedLabel;
  }

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

  return stepKey
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function translatePropagationSignature(
  signature: string | null | undefined,
  language: Language
): string | null {
  if (!signature) return null;

  return signature
    .split("→")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => toReadableTransportChainStep(part, language))
    .join(" → ");
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
  profileCount("resolveTransportInspectorContext.calls");

  return profileMeasure("resolveTransportInspectorContext.ms", () => {
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

    profileValue(
      "resolveTransportInspectorContext.cascadeEvents",
      (cascadeEventsA?.length ?? 0) + (cascadeEventsB?.length ?? 0),
      "events"
    );

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

    const normalizedSelectedDriver =
      normalizeTransportDriverKey(selectedTransportDriver) ??
      (selectedTransportDriver as TransportSystemDriverId);
    const policyLeverLabel = localizePolicyLeverName(policyLever, language);
    const systemDriverLabel = normalizedSelectedDriver
      ? getTransportPolicyExplanationLabel(
          normalizedSelectedDriver,
          language
        )
      : null;
    const driverDef =
      (normalizedSelectedDriver &&
        TRANSPORT_SYSTEM_DRIVERS[
          normalizedSelectedDriver as keyof typeof TRANSPORT_SYSTEM_DRIVERS
        ]) ||
      null;

    if (!driverDef) return null;

    const propagationChainLabel = buildTransportPolicyPropagationExplanation(
      driverDef.propagationChain,
      language
    );
    const dominantScenarioDifferenceChannel =
      primaryPropagationSignatureA &&
      primaryPropagationSignatureB &&
      primaryPropagationSignatureA !== primaryPropagationSignatureB
        ? translatePropagationSignature(
            primaryPropagationSignatureB,
            language
          )
        : null;

    profileValue(
      "resolveTransportInspectorContext.propagationChain.length",
      driverDef.propagationChain.length,
      "steps"
    );

    return {
      policyLeverLabel:
        policyDriverKey
          ? getTransportPolicyExplanationLabel(policyDriverKey, language)
          : null,
      systemDriverLabel:
        systemDriverKey
          ? getTransportPolicyExplanationLabel(systemDriverKey, language)
          : null,
      propagationChainLabel,
      primaryDriver: normalizedSelectedDriver,
      dominantScenarioDifferenceChannel,
    };
  });
}
