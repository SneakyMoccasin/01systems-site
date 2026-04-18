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
  console.log("[PULSE SCENARIO LIBRARY MOUNTED]");
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const scenarios = getScenarioLibrary(language);
  const groupedScenarios = scenarios.reduce(
    (acc, scenario) => {
      const key = scenario.group ?? "core";
      if (!acc[key]) acc[key] = [];
      acc[key].push(scenario);
      return acc;
    },
    {} as Record<string, typeof scenarios>
  );

  return (
    <div
      style={{
        pointerEvents: "auto",
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
          </label>
          <span style={{ marginRight: "10px" }}>
            {(t as any).currentStrategy ?? "Current strategy"}
          </span>
          <label>
            <input
              type="radio"
              value="B"
              checked={scenarioTarget === "B"}
              onChange={() => onScenarioTargetChange("B")}
            />
          </label>
          <span>{(t as any).alternativeStrategy ?? "Alternative strategy"}</span>
        </div>
      )}
      {Object.entries(groupedScenarios).map(([groupName, list]) => (
        <div key={groupName} style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "6px" }}>
            {groupName === "transport"
              ? (uiLanguage === "sv" ? "Transportscenarier" : "Transport scenarios")
              : (uiLanguage === "sv" ? "Kärnscenarier" : "Core scenarios")}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {list.map((s) => (
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
                  onMouseDown={() => {
                    console.log("[PULSE MOUSEDOWN]", s.id);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    console.log("[PULSE CLICK]", s.id);
                    if (onSelectScenario) {
                      onSelectScenario(s.id);
                    }
                  }}
                  style={{
                    pointerEvents: "auto",
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
      ))}
    </div>
  );
};

export default ScenarioLibrary;
