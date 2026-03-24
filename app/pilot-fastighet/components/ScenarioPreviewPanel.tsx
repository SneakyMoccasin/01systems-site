import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type ScenarioChange = {
  parameter: string;
  from: string;
  to: string;
};

type ScenarioPreviewPanelProps = {
  visible: boolean;
  changesA: ScenarioChange[];
  changesB: ScenarioChange[];
  onApply: () => void;
  onCancel: () => void;
  scenarioTextA?: string;
  scenarioTextB?: string;
  language?: "sv" | "en";
  /** When true, the Apply (run simulation) button is disabled in the UI. */
  applyDisabled?: boolean;
};

const ScenarioPreviewPanel: React.FC<ScenarioPreviewPanelProps> = ({
  visible,
  changesA,
  changesB,
  onApply,
  onCancel,
  scenarioTextA,
  scenarioTextB,
  language = "en",
  applyDisabled = false,
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  if (!visible) return null;

  const renderChanges = (changes: ScenarioChange[], label: string) => (
    <div key={label} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{label}</div>
      {changes.length === 0 ? (
        <div style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 1.4 }}>
          {t.noRecognizedScenarioFactors}
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {changes.map((change, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                padding: "4px 0",
              }}
            >
              <span style={{ color: "#E5E7EB", fontSize: "12px" }}>{change.parameter}</span>
              <span style={{ color: "#9CA3AF", fontSize: "12px", whiteSpace: "nowrap" }}>
                <span>{change.from}</span>
                <span style={{ margin: "0 4px" }}>→</span>
                <span>{change.to}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
          marginBottom: "8px",
        }}
      >
        {t.proposedChanges}
      </div>

      {scenarioTextA && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Scenario A</div>
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              background: "#111827",
              border: "1px solid #374151",
              color: "#E5E7EB",
            }}
          >
            {scenarioTextA}
          </span>
        </div>
      )}
      {renderChanges(changesA, t.scenarioAChanges)}

      {scenarioTextB && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Scenario B</div>
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              background: "#111827",
              border: "1px solid #374151",
              color: "#E5E7EB",
            }}
          >
            {scenarioTextB}
          </span>
        </div>
      )}
      {renderChanges(changesB, t.scenarioBChanges)}

      <div
        style={{
          marginBottom: "10px",
          fontSize: "12px",
          color: "#e5e7eb",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            background: "#020617",
            border: "1px solid #374151",
            borderRadius: "4px",
            color: "#E5E7EB",
            cursor: "pointer",
          }}
        >
          {t.cancel}
        </button>
        <button
          type="button"
          disabled={applyDisabled}
          onClick={onApply}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 500,
            background: "#16a34a",
            border: "1px solid #16a34a",
            borderRadius: "4px",
            color: "#0b1120",
            cursor: "pointer",
          }}
        >
          {t.runSimulation}
        </button>
      </div>
    </div>
  );
};

export default ScenarioPreviewPanel;

