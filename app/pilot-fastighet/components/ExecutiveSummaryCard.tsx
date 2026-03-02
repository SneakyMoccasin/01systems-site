"use client";

import React from "react";
import type { ExecutiveSummaryResult } from "@/src/pilotFastighet/analysis/calculateExecutiveSummary";
import type { UI_TEXT } from "@/src/pilotFastighet/uiText";

type Theme = {
  panelBg: string;
  panelBorder: string;
  subtext: string;
  text: string;
};

type Props = {
  executiveSummary: ExecutiveSummaryResult;
  theme: Theme;
  t: (typeof UI_TEXT)["sv"] | (typeof UI_TEXT)["en"];
  structuralStatusKey: keyof (typeof UI_TEXT)["sv"]["structuralStatus"];
  interpretation: string;
  narrativeText: string;
};

export function ExecutiveSummaryCard({
  executiveSummary,
  theme,
  t,
  structuralStatusKey,
  interpretation,
  narrativeText,
}: Props) {
  return (
    <div
      style={{
        background: theme.panelBg,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "6px",
        padding: "20px",
        marginBottom: 0,
        boxShadow: "none",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "28px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: theme.subtext,
              marginBottom: "6px",
            }}
          >
            {t.sections.systemStatus}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color:
                structuralStatusKey === "structural_collapse"
                  ? "#B91C1C"
                  : structuralStatusKey === "marginal_exceedance"
                  ? "#B45309"
                  : structuralStatusKey === "functioning_but_doomed"
                  ? "#92400E"
                  : "#F3F4F6",
            }}
          >
            {t.structuralStatus[structuralStatusKey]}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: theme.subtext,
              marginTop: "6px",
            }}
          >
            {t.common.compressionLabel}: {executiveSummary.compression.toFixed(2)} p.p.
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: theme.subtext,
              marginBottom: "6px",
            }}
          >
            {t.sections.effectOfDecision}
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color:
                executiveSummary.deltaMargin < 0
                  ? "#B91C1C"
                  : executiveSummary.deltaMargin > 0
                  ? "#065F46"
                  : "#F3F4F6",
            }}
          >
            {executiveSummary.deltaMargin.toFixed(2)} %
          </div>
          <div
            style={{
              fontSize: "13px",
              color: theme.subtext,
              marginTop: "6px",
            }}
          >
            {t.common.avgMarginChangeLabel}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: theme.subtext,
              marginBottom: "6px",
            }}
          >
            {t.sections.tippingRisk}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color:
                executiveSummary.tippingRiskLevel === "irreversible"
                  ? "#B91C1C"
                  : executiveSummary.tippingRiskLevel === "high"
                  ? "#B45309"
                  : executiveSummary.tippingRiskLevel === "moderate"
                  ? "#92400E"
                  : "#10B981",
            }}
          >
            {t.common.tippingRiskLevel[executiveSummary.tippingRiskLevel]}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#9CA3AF",
              marginTop: "6px",
            }}
          >
            {executiveSummary.tippingStep
              ? (
                  <>
                    {t.common.tippingWithin} {`Q${executiveSummary.tippingStep}`}
                  </>
                )
              : t.common.noTipping}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "#9CA3AF",
              marginBottom: "6px",
            }}
          >
            {t.sections.capacityUnderPressure}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: theme.text,
            }}
          >
            {executiveSummary.compression.toFixed(2)} p.p.
          </div>
          <div
            style={{
              fontSize: "13px",
              color: theme.subtext,
              marginTop: "6px",
            }}
          >
            {t.common.bufferLossLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${theme.panelBorder}`,
          paddingTop: "20px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: theme.subtext,
            marginBottom: "8px",
          }}
        >
          {t.sections.strategicInterpretation}
        </div>
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: theme.text,
            maxWidth: "80ch",
          }}
        >
          {interpretation}
        </div>
      </div>

      <div
        style={{
          marginTop: "28px",
          paddingTop: "20px",
          borderTop: `1px solid ${theme.panelBorder}`,
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.08em",
            color: theme.subtext,
            marginBottom: "8px",
          }}
        >
          {t.sections.scenarioNarrative}
        </div>
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: theme.text,
          }}
        >
          {narrativeText}
        </div>
      </div>
    </div>
  );
}
