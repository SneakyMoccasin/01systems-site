import React from "react";
import { getScenarioLibrary } from "@/src/pilotFastighet/scenarioLibrary";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type Language = "sv" | "en";

type Props = {
  onSelectScenario: (presetId: string) => void;
  scenarioTarget?: "A" | "B";
  onScenarioTargetChange?: (target: "A" | "B") => void;
  language?: Language;
};

const ScenarioLibrary: React.FC<Props> = ({
  onSelectScenario,
  scenarioTarget = "A",
  onScenarioTargetChange,
  language = "en",
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const scenarios = getScenarioLibrary(language);

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "6px",
        padding: "10px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#9CA3AF",
          marginBottom: "8px",
        }}
      >
        {t.scenarioLibrary}
      </div>
      {onScenarioTargetChange && (
        <div style={{ marginTop: "6px", marginBottom: "10px" }}>
          <span style={{ marginRight: "10px" }}>{t.applyTo}</span>
          <label style={{ marginRight: "10px" }}>
            <input
              type="radio"
              value="A"
              checked={scenarioTarget === "A"}
              onChange={() => onScenarioTargetChange("A")}
            />
            {(t as any).currentStrategy ?? "Current strategy"}
          </label>
          <label>
            <input
              type="radio"
              value="B"
              checked={scenarioTarget === "B"}
              onChange={() => onScenarioTargetChange("B")}
            />
            {(t as any).alternativeStrategy ?? "Alternative strategy"}
          </label>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {scenarios.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => onSelectScenario(s.id)}
              style={{
                padding: "8px 12px",
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                color: "#e5e7eb",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
            <span
              style={{
                fontSize: "11px",
                color: "#9CA3AF",
                maxWidth: "200px",
                lineHeight: 1.3,
              }}
            >
              {s.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScenarioLibrary;
