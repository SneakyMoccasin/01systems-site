import { formatDisplayedPeriod } from "./analysis/periodPresentation";

export type CascadePresentationLanguage = "sv" | "en";
export type CascadeScenarioId = "A" | "B";

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
      page: "#0E1117",
      panel: "#111827",
      analysis: "#0F172A",
      graph: "#0B0F14",
    },
    light: {
      page: "#F9FAFB",
      panel: "#FFFFFF",
      analysis: "#FFFFFF",
      graph: "#FFFFFF",
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
