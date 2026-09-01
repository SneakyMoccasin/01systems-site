import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { mapConstraintLabelToPolicyLabel } from "./mapConstraintLabelToPolicyLabel";
import { mapRiskLabelToPolicyLabel } from "./mapRiskLabelToPolicyLabel";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";

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
  detectedConstraintType?: string | null,
  executiveDemo?: boolean
): PropagationNode[] {
  profileCount("buildPropagationChain.calls");

  return profileMeasure("buildPropagationChain.ms", () => {
    const nodes: PropagationNode[] = [];
    const labelOpts = executiveDemo ? { executiveDemo: true as const } : undefined;

    if (primaryDriver) {
      nodes.push({
        label: mapRiskLabelToPolicyLabel(primaryDriver, language, labelOpts),
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
      const sourceLabel = mapRiskLabelToPolicyLabel(event.sourceRisk, language, labelOpts);
      const targetLabel = mapRiskLabelToPolicyLabel(event.targetRisk, language, labelOpts);
      nodes.push({
        label: `${sourceLabel} ↑ → ${targetLabel} ↑`,
        type: "interaction",
        timing: null,
      });
    }

    if (constraintBreakQuarter != null) {
      const constraintType = detectedConstraintType ?? "CapitalConstraint";
      const constraintLabel = mapConstraintLabelToPolicyLabel(
        constraintType,
        language,
        labelOpts
      );
      nodes.push({
        label:
          language === "sv"
            ? `${constraintLabel} aktiveras`
            : `${constraintLabel} activated`,
        type: "constraint",
        timing: null,
      });
    }

    nodes.push({
      label: executiveDemo
        ? language === "sv"
          ? "Genomföringsflexibiliteten börjar smalna via delade beroenden"
          : "Execution flexibility begins narrowing through shared dependencies"
        : language === "sv"
          ? "Strukturell marginal påverkas"
          : "Structural margin affected",
      type: "margin",
      timing: null,
    });

    if (tippingQuarter != null) {
      nodes.push({
        label: executiveDemo
          ? language === "sv"
            ? "Fönster där genomföringsflexibiliteten snävas åt"
            : "Window where execution flexibility tightens"
          : "Tipping risk window begins",
        type: "tipping",
        timing: tippingQuarter,
      });
    }

    profileValue("buildPropagationChain.events", orderedEvents.length, "events");
    profileValue("buildPropagationChain.nodes", nodes.length, "nodes");

    return nodes;
  });
}
