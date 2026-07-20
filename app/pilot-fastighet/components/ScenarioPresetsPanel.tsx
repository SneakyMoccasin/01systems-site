import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type Props = {
  scenarioTarget: string | null;
  setScenarioTarget: (target: string) => void;
  language: "sv" | "en";
};

const PRESET_KEYS = [
  {
    key: "increase_accessibility",
  },
  {
    key: "increase_modal_attractiveness",
  },
  {
    key: "reduce_capacity_pressure",
  },
  {
    key: "margin_stability",
  },
  {
    key: "avoid_tipping",
  },
] as const;

export default function ScenarioPresetsPanel({
  scenarioTarget,
  setScenarioTarget,
  language,
}: Props) {
  const t = pulseLanguage[language];
  const helperText =
    language === "sv"
      ? "Påverkar analytiskt fokus i förklaringen, inte simuleringens numeriska utfall."
      : "Affects analytical focus in the explanation, not the simulation's numerical result.";
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {t.transportScenarioPresetPanelTitle}
      </h3>
      <p className="mb-2 text-xs text-gray-400">
        {helperText}
      </p>

      <div className="flex flex-col gap-2">
        {PRESET_KEYS.map((preset) => {
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
              {t.transportScenarioPresetLabels[preset.key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
