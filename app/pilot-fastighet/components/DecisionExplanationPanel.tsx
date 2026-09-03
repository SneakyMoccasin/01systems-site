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
        background: "var(--ce-surface-subtle)",
        border: "1px solid var(--ce-border)",
        borderRadius: "6px",
        padding: "12px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--ce-text-primary)",
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
        <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "var(--ce-text-secondary)", minWidth: "160px" }}>
            {t.driverChange}:
          </span>
          <span style={{ color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>
            {primaryDriver
              ? `${driverLabels[primaryDriver] ?? riskLabels[primaryDriver] ?? primaryDriver} ↓`
              : "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "var(--ce-text-secondary)", minWidth: "160px" }}>
            {t.cascadePropagation}:
          </span>
          <span style={{ color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>{cascadePropagation}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "var(--ce-text-secondary)", minWidth: "160px" }}>
            {t.pressureResponse}:
          </span>
          <span style={{ color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>{systemPressure ?? "—"}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "var(--ce-text-secondary)", minWidth: "160px" }}>
            {t.marginTrend}:
          </span>
          <span style={{ color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>{marginTrendLabel}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
          <span style={{ color: "var(--ce-text-secondary)", minWidth: "160px" }}>
            {t.estimatedBreach}:
          </span>
          <span style={{ color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>{breachLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default DecisionExplanationPanel;
