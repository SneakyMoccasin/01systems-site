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
  const marginImprovement = finalMarginB - finalMarginA;
  const showSummary =
    (breachDifference != null && breachDifference !== 0) ||
    marginImprovement !== 0;

  return (
    <div
      style={{
        background: "#111827",
        padding: "10px",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#E5E7EB",
        marginTop: "16px",
        border: "1px solid #1f2937",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "#E5E7EB",
        }}
      >
        {t.scenarioOutcomeTitle}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            marginBottom: "4px",
          }}
        >
          Scenario A
        </div>
        <div style={{ color: "#E5E7EB" }}>
          {t.structuralBreach}:{" "}
          {breachA != null ? `Q${breachA}` : t.noBreachInHorizon}
        </div>
        <div style={{ color: "#E5E7EB" }}>
          {t.finalMargin}: {finalMarginA.toFixed(2)}
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            marginBottom: "4px",
          }}
        >
          Scenario B
        </div>
        <div style={{ color: "#E5E7EB" }}>
          {t.structuralBreach}:{" "}
          {breachB != null ? `Q${breachB}` : t.noBreachInHorizon}
        </div>
        <div style={{ color: "#E5E7EB" }}>
          {t.finalMargin}: {finalMarginB.toFixed(2)}
        </div>
      </div>

      {showSummary && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            padding: "10px",
            borderRadius: "6px",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#9CA3AF",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            {t.resultLabel}
          </div>
          {breachDifference != null && breachDifference > 0 && (
            <div style={{ color: "#E5E7EB", marginBottom: "4px" }}>
              {typeof t.scenarioBDelaysCollapse === "function"
                ? t.scenarioBDelaysCollapse(breachDifference)
                : String(t.scenarioBDelaysCollapse)}
            </div>
          )}
          <div style={{ color: "#E5E7EB" }}>
            {t.marginImprovementLabel}:{" "}
            {marginImprovement >= 0
              ? `+${marginImprovement.toFixed(2)}`
              : marginImprovement.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioOutcomePanel;
