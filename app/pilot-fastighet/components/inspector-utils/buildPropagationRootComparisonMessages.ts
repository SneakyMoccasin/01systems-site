export type PropagationRootComparisonMessage = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
};

export function buildPropagationRootComparisonMessages(
  primaryDriverA?: string | null,
  primaryDriverB?: string | null
): PropagationRootComparisonMessage | null {
  if (!primaryDriverA || !primaryDriverB) return null;
  if (primaryDriverA === primaryDriverB) return null;

  return {
    driverA: primaryDriverA,
    driverB: primaryDriverB,
    scenarioDirection: "target",
  };
}
