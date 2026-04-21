import {
  getTransportPolicyExplanationLabel,
  TRANSPORT_ENGINE_RISK_LABELS,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportSystemDriverId,
} from "@/src/pilotFastighet/transportDomainMapping";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";

export function getPrimaryPropagationSignature(events?: CascadeEvent[]) {
  if (!events || events.length === 0) return null;

  return events
    .slice(0, 2)
    .map((e) => (e as any).readableLabel ?? (e as any).id ?? `${e.sourceRisk} → ${e.targetRisk}`)
    .join(" → ");
}

export function buildDomainPropagationEvents(
  primaryDriver?: TransportSystemDriverId | null,
  language: "sv" | "en" = "en",
  cascadeEventsA?: CascadeEvent[],
  cascadeEventsB?: CascadeEvent[]
): {
  events: {
    month: number;
    label: string;
  }[];
  primaryPropagationSignatureA: string | null;
  primaryPropagationSignatureB: string | null;
} {
  const primaryPropagationSignatureA = getPrimaryPropagationSignature(cascadeEventsA);
  const primaryPropagationSignatureB = getPrimaryPropagationSignature(cascadeEventsB);
  if (!primaryDriver) {
    const sourceEvents =
      cascadeEventsB && cascadeEventsB.length > 0
        ? cascadeEventsB
        : cascadeEventsA && cascadeEventsA.length > 0
        ? cascadeEventsA
        : [];
    if (sourceEvents.length > 0) {
      return {
        events: sourceEvents.slice(0, 3).map((event, index) => ({
          month: index,
          label: getTransportPolicyExplanationLabel(
            event.targetRisk,
            language
          ),
        })),
        primaryPropagationSignatureA,
        primaryPropagationSignatureB,
      };
    }
    return {
      events: [],
      primaryPropagationSignatureA,
      primaryPropagationSignatureB,
    };
  }

  const driverDef = TRANSPORT_SYSTEM_DRIVERS[primaryDriver];
  if (!driverDef?.propagationChain?.length) {
    return {
      events: [],
      primaryPropagationSignatureA,
      primaryPropagationSignatureB,
    };
  }

  return {
    events: driverDef.propagationChain.map((driverId, index, chain) => {
      const normalizedDriverId = driverId;
      const readable = getTransportPolicyExplanationLabel(
        normalizedDriverId,
        language
      );
      const isFirst = index === 0;
      const isLast = index === chain.length - 1;
      const phrase =
        language === "sv"
          ? isFirst
            ? "börjar förändras"
            : isLast
            ? "börjar påverkas"
            : "börjar förändras"
          : isFirst
          ? "begins shifting"
          : isLast
          ? "begins adjusting"
          : "starts changing";

      return {
        month: index,
        label: `${readable} ${phrase}`,
      };
    }),
    primaryPropagationSignatureA,
    primaryPropagationSignatureB,
  };
}
