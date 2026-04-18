"use client";
import React from "react";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";

export type CascadeNode = { label: string; quarter: number };

function formatCascadeChain(
  events: CascadeEvent[],
  getLabel: (key: string) => string
): CascadeNode[] {
  if (events.length === 0) return [];

  const nodes: CascadeNode[] = [];
  const seen = new Set<string>();
  let stepIndex = 0;

  for (const e of events) {
    const quarter = stepIndex + 1;

    if (!seen.has(e.sourceRisk)) {
      nodes.push({ label: getLabel(e.sourceRisk), quarter });
      seen.add(e.sourceRisk);
      stepIndex += 1;
    }

    if (!seen.has(e.targetRisk)) {
      const nextQuarter = stepIndex + 1;
      nodes.push({ label: getLabel(e.targetRisk), quarter: nextQuarter });
      seen.add(e.targetRisk);
      stepIndex += 1;
    }
  }

  return nodes;
}

type Props = {
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  getRiskLabel?: (key: string) => string;
};

const CascadeRendererRealEstate: React.FC<Props> = ({
  cascadeEventsA = [],
  cascadeEventsB = [],
  getRiskLabel = (k) => k,
}) => {
  const nodesA = formatCascadeChain(cascadeEventsA, getRiskLabel);
  const nodesB = formatCascadeChain(cascadeEventsB, getRiskLabel);

  const nodes = nodesB.length > 0 ? nodesB : nodesA;

  if (nodes.length === 0) {
    return <div>—</div>;
  }

  return (
    <div>
      {`Kaskad: ${nodes.map((n) => n.label).join(" → ")}`}
    </div>
  );
};

export default CascadeRendererRealEstate;
