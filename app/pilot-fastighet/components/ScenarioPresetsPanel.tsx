import React from "react";

type Props = {
  scenarioTarget: string | null;
  setScenarioTarget: (target: string) => void;
};

const PRESETS = [
  {
    key: "increase_accessibility",
    label: "Förbättra tillgänglighet",
  },
  {
    key: "increase_modal_attractiveness",
    label: "Öka kollektivtrafikens attraktivitet",
  },
  {
    key: "reduce_capacity_pressure",
    label: "Minska kapacitetstryck",
  },
  {
    key: "margin_stability",
    label: "Stabilisera marginaler",
  },
  {
    key: "avoid_tipping",
    label: "Undvik tipping",
  },
] as const;

export default function ScenarioPresetsPanel({
  scenarioTarget,
  setScenarioTarget,
}: Props) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Scenario
      </h3>

      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => {
          const selected = scenarioTarget === preset.key;

          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => setScenarioTarget(preset.key)}
              className="w-full text-left rounded border px-3 py-2 text-sm transition-colors"
              style={{
                background: selected ? "#2563EB" : "transparent",
                border: selected
                  ? "1px solid #2563EB"
                  : "1px solid rgba(255,255,255,0.15)",
                color: selected ? "#FFFFFF" : "#D1D5DB",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
