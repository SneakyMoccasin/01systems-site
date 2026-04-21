import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";

export type CascadePathwayComparisonMessage = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
};

export function buildCascadePathwayComparisonMessages(
  cascadeEventsA?: CascadeEvent[] | null,
  cascadeEventsB?: CascadeEvent[] | null
): CascadePathwayComparisonMessage | null {
  if (!cascadeEventsA?.length || !cascadeEventsB?.length) return null;

  const rootA =
    (cascadeEventsA[0] as CascadeEvent & { driverKey?: string })?.driverKey ??
    cascadeEventsA[0]?.sourceRisk ??
    null;
  const rootB =
    (cascadeEventsB[0] as CascadeEvent & { driverKey?: string })?.driverKey ??
    cascadeEventsB[0]?.sourceRisk ??
    null;

  if (!rootA || !rootB) return null;
  if (rootA === rootB) return null;

  return {
    driverA: rootA,
    driverB: rootB,
    scenarioDirection: "target",
  };
}
