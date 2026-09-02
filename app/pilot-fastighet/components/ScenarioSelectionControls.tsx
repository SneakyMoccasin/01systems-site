"use client";

import { getCascadeScenarioControlColors, type CascadeThemeId } from "@/src/pilotFastighet/cascadePresentation";

type ScenarioSelection = "A" | "B" | "BOTH";

export default function ScenarioSelectionControls({
  theme,
  selected,
  labelA,
  labelB,
  labelBoth,
  compact = false,
  onSelect,
}: {
  theme: CascadeThemeId;
  selected: ScenarioSelection;
  labelA: string;
  labelB: string;
  labelBoth: string;
  compact?: boolean;
  onSelect: (selection: ScenarioSelection) => void;
}) {
  return (
    <>
      {([
        ["A", labelA],
        ["B", labelB],
        ["BOTH", labelBoth],
      ] as const).map(([scenario, label]) => {
        const colors = getCascadeScenarioControlColors(theme, scenario, selected === scenario);
        return (
          <button
            key={scenario}
            type="button"
            data-scenario-selector={scenario}
            aria-pressed={selected === scenario}
            onClick={() => onSelect(scenario)}
            style={{
              padding: compact ? "5px 11px" : "8px 16px",
              fontSize: compact ? "11px" : undefined,
              background: colors.background,
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: compact ? "5px" : "6px",
              color: colors.text,
              cursor: "pointer",
              boxShadow: "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
