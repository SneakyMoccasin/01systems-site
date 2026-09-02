import { formatDisplayedPeriod } from "./analysis/periodPresentation";

export type CascadePresentationLanguage = "sv" | "en";
export type CascadeScenarioId = "A" | "B";
export type CascadeThemeId = "light" | "dark";

export const CASCADE_THEME_TOKENS = {
  dark: {
    pageBackground: "#0E1117", primarySurface: "#111827", subtleSurface: "#0F172A",
    elevatedSurface: "#111827", graphSurface: "#0B0F14", border: "#1F2937",
    strongDivider: "#334155", primaryText: "#E5E7EB", secondaryText: "#A8B1C0",
    mutedText: "#7C899D", disabledText: "#596579", controlBackground: "#111827", controlHover: "#1F2937",
    selectedControl: "#273449", focusRing: "#60A5FA", shadow: "rgba(2, 6, 23, 0.22)",
    criticalState: "#EF4444", scenarioA: "#3B82F6", scenarioB: "#F59E0B",
  },
  light: {
    pageBackground: "#F5F6F8", primarySurface: "#FFFFFF", subtleSurface: "#F7F8FA",
    elevatedSurface: "#FFFFFF", graphSurface: "#FCFCFD", border: "#D0D5DD",
    strongDivider: "#B8C0CC", primaryText: "#111827", secondaryText: "#374151",
    mutedText: "#667085", disabledText: "#98A2B3", controlBackground: "#FFFFFF", controlHover: "#F2F4F7",
    selectedControl: "#E7ECF3", focusRing: "#2563EB", shadow: "rgba(15, 23, 42, 0.10)",
    criticalState: "#DC2626", scenarioA: "#3B82F6", scenarioB: "#F59E0B",
  },
} as const;

export function getCascadeThemeTokens(theme: CascadeThemeId) {
  return CASCADE_THEME_TOKENS[theme];
}

export type CascadeScenarioControlId = CascadeScenarioId | "BOTH";

export function getCascadeScenarioControlColors(
  theme: CascadeThemeId,
  control: CascadeScenarioControlId,
  selected: boolean
) {
  const tokens = getCascadeThemeTokens(theme);
  if (control === "A") {
    return {
      background: selected ? CASCADE_PRESENTATION.scenarios.A.color : tokens.controlBackground,
      border: CASCADE_PRESENTATION.scenarios.A.color,
      text: selected ? "#111827" : tokens.primaryText,
    };
  }
  if (control === "B") {
    return {
      background: selected ? CASCADE_PRESENTATION.scenarios.B.color : tokens.controlBackground,
      border: CASCADE_PRESENTATION.scenarios.B.color,
      text: selected ? "#111827" : tokens.primaryText,
    };
  }
  return {
    background: selected ? tokens.selectedControl : tokens.controlBackground,
    border: selected ? tokens.strongDivider : tokens.border,
    text: tokens.primaryText,
  };
}

/**
 * Canonical presentation constants shared by the full workspace and Executive
 * Demo. These values describe UI identity only; they carry no analytical
 * meaning and must not be used to rank scenarios.
 */
export const CASCADE_PRESENTATION = {
  scenarios: {
    A: {
      color: "#3B82F6",
      lineDash: undefined,
      markerShape: "circle",
    },
    B: {
      color: "#F59E0B",
      lineDash: "6 4",
      markerShape: "diamond",
    },
  },
  surfaces: {
    dark: {
      page: CASCADE_THEME_TOKENS.dark.pageBackground,
      panel: CASCADE_THEME_TOKENS.dark.primarySurface,
      analysis: CASCADE_THEME_TOKENS.dark.subtleSurface,
      graph: CASCADE_THEME_TOKENS.dark.graphSurface,
    },
    light: {
      page: CASCADE_THEME_TOKENS.light.pageBackground,
      panel: CASCADE_THEME_TOKENS.light.primarySurface,
      analysis: CASCADE_THEME_TOKENS.light.subtleSurface,
      graph: CASCADE_THEME_TOKENS.light.graphSurface,
    },
  },
  borders: {
    dark: "#1F2937",
    light: "#E5E7EB",
    emphasis: "#334155",
  },
  text: {
    primary: "#E5E7EB",
    secondary: "#9CA3AF",
    muted: "#64748B",
  },
  typography: {
    eyebrowSize: 10,
    sectionTitleSize: 14,
    bodySize: 12,
    labelWeight: 700,
    titleWeight: 650,
  },
  spacing: {
    xxs: 4,
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radii: {
    control: 5,
    panel: 8,
    pill: 999,
  },
  constraints: {
    neutral: "#64748B",
    critical: "#EF4444",
  },
} as const;

const COPY = {
  en: {
    structuralMargin: "Structural Margin",
    modelPeriod: "M = model period",
    comparisonBoundary: "Comparison, not recommendation.",
    scenarioA: "Scenario A",
    scenarioB: "Scenario B",
  },
  sv: {
    structuralMargin: "Strukturell marginal",
    modelPeriod: "M = modellperiod",
    comparisonBoundary: "Jämförelse, inte rekommendation.",
    scenarioA: "Scenario A",
    scenarioB: "Scenario B",
  },
} as const;

export function getCascadePresentationCopy(
  language: CascadePresentationLanguage
) {
  return COPY[language];
}

export function getCascadeScenarioPresentation(scenario: CascadeScenarioId) {
  return CASCADE_PRESENTATION.scenarios[scenario];
}

/** Uses the existing canonical period formatter; no temporal semantics live here. */
export function formatCascadeModelPeriod(period: number): string {
  return formatDisplayedPeriod(period);
}
