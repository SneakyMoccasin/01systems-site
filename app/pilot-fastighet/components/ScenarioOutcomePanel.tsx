"use client";

import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type Language = "sv" | "en";

type Props = {
  breachA: number | null;
  breachB: number | null;
  finalMarginA: number;
  finalMarginB: number;
  breachDifference: number | null;
  language?: Language;
};

const ScenarioOutcomePanel: React.FC<Props> = ({
  breachA,
  breachB,
  finalMarginA,
  finalMarginB,
  breachDifference,
  language = "en",
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const marginDifference = finalMarginB - finalMarginA;
  const showSummary =
    (breachDifference != null && breachDifference !== 0) ||
    marginDifference !== 0;

  return (
    <div
      style={{
        background: "var(--ce-surface-subtle)",
        padding: "10px",
        borderRadius: "6px",
        fontSize: "12px",
        color: "var(--ce-text-primary)",
        marginTop: "16px",
        border: "1px solid var(--ce-border)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "var(--ce-text-primary)",
        }}
      >
        {t.scenarioOutcomeTitle}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ce-text-secondary)",
            marginBottom: "4px",
          }}
        >
          Scenario A
        </div>
        <div style={{ color: "var(--ce-text-primary)" }}>
          {breachA != null
            ? t.structuralBreakExpectedAround(breachA)
            : t.noStructuralBreakWithinHorizon}
        </div>
        <div style={{ color: "var(--ce-text-primary)" }}>
          {t.finalMargin}: {finalMarginA.toFixed(2)}
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ce-text-secondary)",
            marginBottom: "4px",
          }}
        >
          Scenario B
        </div>
        <div style={{ color: "var(--ce-text-primary)" }}>
          {breachB != null
            ? t.structuralBreakExpectedAround(breachB)
            : t.noStructuralBreakWithinHorizon}
        </div>
        <div style={{ color: "var(--ce-text-primary)" }}>
          {t.finalMargin}: {finalMarginB.toFixed(2)}
        </div>
      </div>

      {showSummary && (
        <div
          style={{
            background: "var(--ce-surface-primary)",
            border: "1px solid var(--ce-divider-strong)",
            padding: "10px",
            borderRadius: "6px",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--ce-text-secondary)",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            {t.resultLabel}
          </div>
          {breachDifference != null && breachDifference > 0 && (
            <div style={{ color: "var(--ce-text-primary)", marginBottom: "4px" }}>
              {typeof t.scenarioBDelaysCollapse === "function"
                ? t.scenarioBDelaysCollapse(breachDifference)
                : String(t.scenarioBDelaysCollapse)}
            </div>
          )}
          <div style={{ color: "var(--ce-text-primary)" }}>
            {t.marginImprovementLabel}:{" "}
            {marginDifference >= 0
              ? `+${marginDifference.toFixed(2)}`
              : marginDifference.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioOutcomePanel;
