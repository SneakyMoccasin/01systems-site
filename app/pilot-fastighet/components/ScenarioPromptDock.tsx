import React, { useState } from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type ScenarioPromptDockProps = {
  onScenarioSubmit: (textA: string, textB: string) => void;
  language: "sv" | "en";
  scenarioHistory?: string[];
  onSimulationSourceChange?: (source: "scenario" | "prompt") => void;
  scenarioPromptA?: string;
  scenarioPromptB?: string;
  onScenarioPromptAChange?: (text: string) => void;
  onScenarioPromptBChange?: (text: string) => void;
};

const ScenarioPromptDock: React.FC<ScenarioPromptDockProps> = ({
  onScenarioSubmit,
  language,
  scenarioHistory,
  onSimulationSourceChange,
  scenarioPromptA: controlledA,
  scenarioPromptB: controlledB,
  onScenarioPromptAChange,
  onScenarioPromptBChange,
}) => {
  const [internalA, setInternalA] = useState("");
  const [internalB, setInternalB] = useState("");
  const isControlledA = controlledA !== undefined && onScenarioPromptAChange != null;
  const isControlledB = controlledB !== undefined && onScenarioPromptBChange != null;
  const scenarioTextA = isControlledA ? controlledA : internalA;
  const scenarioTextB = isControlledB ? controlledB : internalB;
  const setScenarioTextA = isControlledA ? onScenarioPromptAChange! : setInternalA;
  const setScenarioTextB = isControlledB ? onScenarioPromptBChange! : setInternalB;

  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const canSubmit = scenarioTextA.trim().length > 0 || scenarioTextB.trim().length > 0;

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
          marginBottom: "4px",
        }}
      >
        {t.customScenarioTitle}
      </div>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
          Scenario A
        </div>
        <textarea
          value={scenarioTextA}
          onChange={(e) => setScenarioTextA(e.target.value)}
          placeholder="Describe scenario A..."
          style={{
            width: "100%",
            minHeight: "56px",
            background: "#020617",
            border: "1px solid #1f2937",
            borderRadius: "4px",
            padding: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
            resize: "vertical",
          }}
        />
      </div>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
          Scenario B
        </div>
        <textarea
          value={scenarioTextB}
          onChange={(e) => setScenarioTextB(e.target.value)}
          placeholder="Describe scenario B..."
          style={{
            width: "100%",
            minHeight: "56px",
            background: "#020617",
            border: "1px solid #1f2937",
            borderRadius: "4px",
            padding: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
            resize: "vertical",
          }}
        />
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          marginBottom: "8px",
        }}
      >
        {t.customScenarioHelper}
      </div>
      {scenarioHistory && scenarioHistory.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 10,
              color: "#9CA3AF",
              marginBottom: 4,
            }}
          >
            {t.recentScenarios}
          </div>

          {scenarioHistory.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSimulationSourceChange?.("scenario");
                onScenarioSubmit(s, "");
              }}
              style={{
                marginRight: 6,
                marginBottom: 6,
                fontSize: 11,
                padding: "4px 8px",
                border: "1px solid #374151",
                background: "#111827",
                color: "#E5E7EB",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          onSimulationSourceChange?.("prompt");
          onScenarioSubmit(scenarioTextA, scenarioTextB);
        }}
        style={{
          padding: "8px 16px",
          fontSize: "12px",
          background: "#2563eb",
          border: "1px solid #3b82f6",
          borderRadius: "6px",
          color: "#ffffff",
          opacity: canSubmit ? 1 : 0.5,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {t.previewImpact}
      </button>
      <div
        style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "#9ca3af",
        }}
      >
        {t.previewImpactHelper}
      </div>
    </div>
  );
};

export default ScenarioPromptDock;
