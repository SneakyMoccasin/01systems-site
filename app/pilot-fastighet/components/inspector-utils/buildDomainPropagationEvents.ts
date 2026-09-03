import {
  TRANSPORT_PROPAGATION_METADATA,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportSystemDriverId,
} from "@/src/pilotFastighet/transportDomainMapping";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { mapRiskLabelToPolicyLabel } from "./mapRiskLabelToPolicyLabel";

export function getPrimaryPropagationSignature(events?: CascadeEvent[]) {
  if (!events || events.length === 0) return null;

  return events
    .slice(0, 2)
    .map((event) => {
      const enriched = event as CascadeEvent & {
        readableLabel?: string;
        id?: string;
      };
      return (
        enriched.readableLabel ??
        enriched.id ??
        `${event.sourceRisk} → ${event.targetRisk}`
      );
    })
    .join(" → ");
}

export function buildDomainPropagationEvents(
  primaryDriver?: TransportSystemDriverId | null,
  language: "sv" | "en" = "en",
  cascadeEventsA?: CascadeEvent[],
  cascadeEventsB?: CascadeEvent[],
  executiveDemo?: boolean
): {
  events: {
    month: number;
    label: string;
  }[];
  primaryPropagationSignatureA: string | null;
  primaryPropagationSignatureB: string | null;
} {
  const labelOpts = executiveDemo ? { executiveDemo: true as const } : undefined;
  const hasResultEvidence =
    cascadeEventsA !== undefined || cascadeEventsB !== undefined;
  const approvedEdgeIds = new Set(
    TRANSPORT_PROPAGATION_METADATA.map(({ edgeId }) => edgeId)
  );
  const approvedEventsA = (cascadeEventsA ?? []).filter((event) =>
    approvedEdgeIds.has(`${event.sourceRisk}->${event.targetRisk}`)
  );
  const approvedEventsB = (cascadeEventsB ?? []).filter((event) =>
    approvedEdgeIds.has(`${event.sourceRisk}->${event.targetRisk}`)
  );
  const primaryPropagationSignatureA = getPrimaryPropagationSignature(approvedEventsA);
  const primaryPropagationSignatureB = getPrimaryPropagationSignature(approvedEventsB);
  const sourceEvents =
    approvedEventsB.length > 0
      ? approvedEventsB
      : approvedEventsA.length > 0
      ? approvedEventsA
      : [];
  if (hasResultEvidence) {
    return {
      events: sourceEvents.slice(0, 3).map((event, index) => ({
        month: index,
        label: mapRiskLabelToPolicyLabel(event.targetRisk, language, labelOpts),
      })),
      primaryPropagationSignatureA,
      primaryPropagationSignatureB,
    };
  }
  if (!primaryDriver) {
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
      const readable = mapRiskLabelToPolicyLabel(normalizedDriverId, language, labelOpts);
      const isFirst = index === 0;
      const isLast = index === chain.length - 1;
      const phrase =
        language === "sv"
          ? isFirst
            ? "är första tecknet på hur förändringen sprids"
            : isLast
            ? "påverkas senare när effekten sprids vidare"
            : "påverkas när effekten sprids vidare"
          : isFirst
          ? "is the first sign of how the effect spreads"
          : isLast
          ? "is affected later as the effect spreads"
          : "is affected as the effect spreads";

      return {
        month: index,
        label: `${readable} ${phrase}`,
      };
    }),
    primaryPropagationSignatureA,
    primaryPropagationSignatureB,
  };
}
