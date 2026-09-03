"use client";

import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";
import CascadeRendererRealEstate from "./CascadeRendererRealEstate";
import CascadeRendererTransport from "./CascadeRendererTransport";

type Language = "sv" | "en";

type Props = {
  primaryDriver?: string | null;
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  marginImpact?: number;
  breachDifference?: number | null;
  language?: Language;
  getRiskLabel?: (key: string) => string;
  caseType?: "transport" | "real-estate" | null;
  selectedActions?: string[];
};

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
    // use visual order for quarter numbering
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

const WhyPanel: React.FC<Props> = ({
  primaryDriver,
  cascadeEventsA = [],
  cascadeEventsB = [],
  marginImpact = 0,
  breachDifference = null,
  language = "en",
  getRiskLabel = (k) => k,
  caseType = null,
  selectedActions = [],
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const nodesA = formatCascadeChain(cascadeEventsA, getRiskLabel);
  const nodesB = formatCascadeChain(cascadeEventsB, getRiskLabel);
  const nodes = nodesB.length > 0 ? nodesB : nodesA;
  const transportInspectorContext = resolveTransportInspectorContext({
    useExecutableActionPresentation: true,
    language: uiLanguage,
    selectedActions,
    primaryDriverKey: primaryDriver,
    cascadeEventsA,
    cascadeEventsB,
  });
  const cascadeChainText =
    caseType === "transport"
      ? transportInspectorContext?.propagationChainLabel ?? null
      : nodes.length > 0
      ? `Kaskad: ${nodes.map((n) => n.label).join(" \u2192 ")}`
      : null;
  const hasCascade =
    caseType === "transport"
      ? Boolean(transportInspectorContext?.propagationChainLabel)
      : nodes.length > 0;
  const fallbackExplanation =
    primaryDriver && !hasCascade
      ? `${getRiskLabel(primaryDriver)} impacts margin directly`
      : null;

  return (
    <div
      style={{
        background: "#111827",
        padding: "10px",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#e5e7eb",
        marginTop: "16px",
        border: "1px solid #1f2937",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "#e5e7eb",
        }}
      >
        {t.whyPanelTitle}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 12,
            opacity: 0.6,
          }}
        >
          Primary driver
        </div>
        <div
          style={{
            fontWeight: 500,
          }}
        >
          {primaryDriver ? getRiskLabel(primaryDriver) : "—"}
        </div>
      </div>

      <div style={{ marginBottom: "6px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            marginBottom: "2px",
          }}
        >
          {t.cascadePropagation}
        </div>
        <div style={{ color: "#e5e7eb" }}>
          {hasCascade ? (
            <>
              {caseType === "transport" ? (
                <CascadeRendererTransport
                  primaryDriver={primaryDriver}
                  selectedActions={selectedActions}
                  language={uiLanguage}
                />
              ) : (
                <CascadeRendererRealEstate
                  cascadeEventsA={cascadeEventsA}
                  cascadeEventsB={cascadeEventsB}
                  getRiskLabel={getRiskLabel}
                />
              )}
              <div>Margin impact</div>
            </>
          ) : (
            fallbackExplanation || "—"
          )}
        </div>
      </div>

      {marginImpact > 0 && (
        <div style={{ marginBottom: "6px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#9CA3AF",
              marginBottom: "2px",
            }}
          >
            {t.systemImpactLabel}
          </div>
          <div style={{ color: "#e5e7eb" }}>
            {typeof t.scenarioBSlowsDecline === "function"
              ? t.scenarioBSlowsDecline(marginImpact.toFixed(2))
              : String(t.scenarioBSlowsDecline).replace("{x}", marginImpact.toFixed(2))}
          </div>
        </div>
      )}

      {breachDifference != null && breachDifference > 0 && (
        <div style={{ marginBottom: "0" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#9CA3AF",
              marginBottom: "2px",
            }}
          >
            {t.outcomeLabel}
          </div>
          <div style={{ color: "#e5e7eb" }}>
            {typeof t.scenarioBDelaysBreachWhy === "function"
              ? t.scenarioBDelaysBreachWhy(breachDifference)
              : String(t.scenarioBDelaysBreachWhy)}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhyPanel;
