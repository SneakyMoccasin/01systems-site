import { mapRiskLabelToPolicyLabel } from "./mapRiskLabelToPolicyLabel";

export type PropagationRootComparisonMessage = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
  message: string;
};

export function buildPropagationRootComparisonMessages(
  primaryDriverA?: string | null,
  primaryDriverB?: string | null,
  language: "sv" | "en" = "en",
  executiveDemo?: boolean
): PropagationRootComparisonMessage | null {
  if (!primaryDriverA || !primaryDriverB) return null;
  if (primaryDriverA === primaryDriverB) return null;

  const labelOpts = executiveDemo ? { executiveDemo: true as const } : undefined;
  const readableDriverA = mapRiskLabelToPolicyLabel(primaryDriverA, language, labelOpts);
  const readableDriverB = mapRiskLabelToPolicyLabel(primaryDriverB, language, labelOpts);

  return {
    driverA: readableDriverA,
    driverB: readableDriverB,
    scenarioDirection: "target",
    message: executiveDemo
      ? language === "sv"
        ? `Mönstret visar att beslutsspåren divergerar när ${readableDriverB.toLowerCase()} aktiverar en annan beroendestruktur än ${readableDriverA.toLowerCase()}.`
        : `The pattern shows decision paths diverging as ${readableDriverB.toLowerCase()} engages a different dependency structure than ${readableDriverA.toLowerCase()}.`
      : language === "sv"
        ? `Strategierna börjar skilja sig eftersom ${readableDriverB.toLowerCase()} påverkar andra delar av systemet än ${readableDriverA.toLowerCase()}.`
        : `The strategies begin to differ because ${readableDriverB.toLowerCase()} affects different parts of the system than ${readableDriverA.toLowerCase()}.`,
  };
}
