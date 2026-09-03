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
    <label
      data-testid="compact-explanation-focus"
      title={helperText}
      className="mb-2 flex flex-wrap items-center gap-2 text-xs"
      style={{ color: "var(--ce-text-secondary, #667085)" }}
    >
      <span style={{ fontWeight: 650 }}>{`${t.transportScenarioPresetPanelTitle}:`}</span>
      <select
        aria-label={t.transportScenarioPresetPanelTitle}
        value={scenarioTarget ?? ""}
        onChange={(event) => setScenarioTarget(event.target.value)}
        style={{
          minWidth: 210,
          maxWidth: "100%",
          padding: "5px 8px",
          borderRadius: 6,
          border: "1px solid var(--ce-border, #d0d5dd)",
          background: "var(--ce-control-bg, #ffffff)",
          color: "var(--ce-text-primary, #101828)",
        }}
      >
        <option value="" disabled>
          {language === "sv" ? "Välj förklaringsfokus" : "Select explanation focus"}
        </option>
        {PRESET_KEYS.map((preset) => (
          <option key={preset.key} value={preset.key}>
            {t.transportScenarioPresetLabels[preset.key]}
          </option>
        ))}
      </select>
    </label>
  );
}
