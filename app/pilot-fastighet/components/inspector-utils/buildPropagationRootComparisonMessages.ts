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
  language: "sv" | "en" = "en"
): PropagationRootComparisonMessage | null {
  if (!primaryDriverA || !primaryDriverB) return null;
  if (primaryDriverA === primaryDriverB) return null;

  const readableDriverA = mapRiskLabelToPolicyLabel(primaryDriverA, language);
  const readableDriverB = mapRiskLabelToPolicyLabel(primaryDriverB, language);

  return {
    driverA: readableDriverA,
    driverB: readableDriverB,
    scenarioDirection: "target",
    message:
      language === "sv"
        ? `Strategierna börjar skilja sig eftersom ${readableDriverB.toLowerCase()} påverkar andra delar av systemet än ${readableDriverA.toLowerCase()}.`
        : `The strategies begin to differ because ${readableDriverB.toLowerCase()} affects different parts of the system than ${readableDriverA.toLowerCase()}.`,
  };
}
