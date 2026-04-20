import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { mapConstraintLabelToPolicyLabel } from "./mapConstraintLabelToPolicyLabel";
import { mapRiskLabelToPolicyLabel } from "./mapRiskLabelToPolicyLabel";

export type PropagationNode = {
  label: string;
  type: "driver" | "interaction" | "constraint" | "margin" | "tipping";
  timing?: number | null;
};

export function buildPropagationChain(
  cascadeEvents?: CascadeEvent[],
  primaryDriver?: string | null,
  constraintBreakQuarter?: number | null,
  tippingQuarter?: number | null,
  language: "sv" | "en" = "en",
  detectedConstraintType?: string | null
): PropagationNode[] {
  const nodes: PropagationNode[] = [];

  if (primaryDriver) {
    nodes.push({
      label: mapRiskLabelToPolicyLabel(primaryDriver, language),
      type: "driver",
      timing: null,
    });
  }

  const orderedEvents = [...(cascadeEvents ?? [])].sort((a, b) => {
    const stepDelta = (a.step ?? 0) - (b.step ?? 0);
    if (stepDelta !== 0) return stepDelta;
    return (a.iteration ?? 0) - (b.iteration ?? 0);
  });

  for (const event of orderedEvents) {
    const sourceLabel = mapRiskLabelToPolicyLabel(event.sourceRisk, language);
    const targetLabel = mapRiskLabelToPolicyLabel(event.targetRisk, language);
    nodes.push({
      label: `${sourceLabel} ↑ → ${targetLabel} ↑`,
      type: "interaction",
      timing: event.step ?? null,
    });
  }

  if (constraintBreakQuarter != null) {
    const constraintType = detectedConstraintType ?? "CapitalConstraint";
    const constraintLabel = mapConstraintLabelToPolicyLabel(
      constraintType,
      language
    );
    nodes.push({
      label:
        language === "sv"
          ? `${constraintLabel} aktiveras`
          : `${constraintLabel} activated`,
      type: "constraint",
      timing: constraintBreakQuarter,
    });
  }

  nodes.push({
    label:
      language === "sv"
        ? "Strukturell marginal påverkas"
        : "Structural margin affected",
    type: "margin",
    timing: null,
  });

  if (tippingQuarter != null) {
    nodes.push({
      label: "Tipping risk window begins",
      type: "tipping",
      timing: tippingQuarter,
    });
  }

  return nodes;
}
