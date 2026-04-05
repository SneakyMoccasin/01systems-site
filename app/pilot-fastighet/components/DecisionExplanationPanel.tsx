import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type Language = "sv" | "en";

type Props = {
  primaryDriver?: string | null;
  systemPressure?: string | null;
  marginTrend?: "declining" | "stable" | "improving";
  cascadeEventsA?: unknown[];
  cascadeEventsB?: unknown[];
  estimatedTimeToBreach?: number | null;
  language?: Language;
};

const DecisionExplanationPanel: React.FC<Props> = ({
  primaryDriver,
  systemPressure,
  marginTrend,
  cascadeEventsA = [],
  cascadeEventsB = [],
  estimatedTimeToBreach,
  language = "en",
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const riskLabels = (t as any).riskLabels ?? {};
  const driverLabels = (t as any).driverLabels ?? {};

  const marginTrendLabel =
    marginTrend === "declining"
      ? t.marginTrendDeclining
      : marginTrend === "improving"
        ? t.marginTrendImproving
        : t.marginTrendStable;

  const hasCascade = cascadeEventsA.length > 0 || cascadeEventsB.length > 0;
  const cascadePropagation = hasCascade ? t.cascadeDetected : t.cascadeNone;

  const breachLabel =
    estimatedTimeToBreach != null
      ? t.estimatedBreachExpectedAround(estimatedTimeToBreach)
      : t.estimatedBreachNotEstimated;

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "6px",
        padding: "12px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#e5e7eb",
          marginBottom: "10px",
        }}
      >
        {t.decisionExplanation}
      </div>
      <div
        style={{
          display: "grid",
          gap: "6px",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9CA3AF", minWidth: "160px" }}>
            {t.driverChange}:
          </span>
          <span style={{ color: "#E5E7EB" }}>
            {primaryDriver
              ? `${driverLabels[primaryDriver] ?? riskLabels[primaryDriver] ?? primaryDriver} ↓`
              : "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9CA3AF", minWidth: "160px" }}>
            {t.cascadePropagation}:
          </span>
          <span style={{ color: "#E5E7EB" }}>{cascadePropagation}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9CA3AF", minWidth: "160px" }}>
            {t.pressureResponse}:
          </span>
          <span style={{ color: "#E5E7EB" }}>{systemPressure ?? "—"}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9CA3AF", minWidth: "160px" }}>
            {t.marginTrend}:
          </span>
          <span style={{ color: "#E5E7EB" }}>{marginTrendLabel}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9CA3AF", minWidth: "160px" }}>
            {t.estimatedBreach}:
          </span>
          <span style={{ color: "#E5E7EB" }}>{breachLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default DecisionExplanationPanel;
