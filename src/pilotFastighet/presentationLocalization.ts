import type { ExecutiveConclusionInput } from "./compareHelpers";

export type PresentationLanguage = "sv" | "en";
export type RiskValueContext = "driver" | "system-pressure";

const DRIVER_LEVELS = {
  sv: { LOW: "Låg", MODERATE: "Måttlig", HIGH: "Hög", SEVERE: "Allvarlig" },
  en: { LOW: "Low", MODERATE: "Moderate", HIGH: "High", SEVERE: "Severe" },
} as const;

const PRESSURE_LEVELS = {
  sv: { LOW: "Lågt", MODERATE: "Måttligt", HIGH: "Högt", SEVERE: "Allvarligt" },
  en: { LOW: "Low", MODERATE: "Moderate", HIGH: "High", SEVERE: "Severe" },
} as const;

export function formatRiskLevel(
  value: string | null | undefined,
  language: PresentationLanguage,
  context: RiskValueContext
): string {
  if (!value) return "—";
  const labels = context === "system-pressure" ? PRESSURE_LEVELS : DRIVER_LEVELS;
  return labels[language][value as keyof typeof labels[typeof language]] ?? value;
}

export function formatConstraintState(
  value: string,
  language: PresentationLanguage
): string {
  if (value === "ACTIVE") return language === "sv" ? "Aktiv" : "Active";
  if (value === "INACTIVE") return language === "sv" ? "Inaktiv" : "Inactive";
  return value;
}

export function formatBooleanValue(value: boolean, language: PresentationLanguage): string {
  return value ? (language === "sv" ? "Ja" : "Yes") : language === "sv" ? "Nej" : "No";
}

const GROUP_LABELS: Record<string, Readonly<Record<PresentationLanguage, string>>> = {
  "Income Dynamics": { sv: "Intäktsdynamik", en: "Income dynamics" },
  Operations: { sv: "Drift", en: "Operations" },
  "Capital & Financing": { sv: "Kapital och finansiering", en: "Capital & financing" },
  "External Pressure": { sv: "Externt tryck", en: "External pressure" },
  "Accessibility & Mode Shift": { sv: "Tillgänglighet och färdmedelsval", en: "Accessibility & mode shift" },
  "Operations & Capacity": { sv: "Drift och kapacitet", en: "Operations & capacity" },
  "Financial Flexibility": { sv: "Finansiell flexibilitet", en: "Financial flexibility" },
};

export function formatConfigurationGroup(
  value: string,
  language: PresentationLanguage
): string {
  return GROUP_LABELS[value]?.[language] ?? value;
}

export const SAVED_RUN_COPY = {
  sv: {
    frozenRuns: "Frysta körningar",
    noRuns: "Inga frysta körningar ännu.",
    selectA: "Välj som A",
    selectB: "Välj som B",
    remove: "Ta bort",
    rename: "Byt namn",
    renameRun: "Byt namn på fryst körning",
    compare: "Jämför frysta körningar",
    showTechnical: "Visa tekniska detaljer",
    hideTechnical: "Dölj tekniska detaljer",
    marginDifference: "Marginalskillnad",
    tipping: "Tippingpunkt",
    never: "aldrig",
    conclusion: "Slutsats",
    tags: "Etiketter",
    lifecycle: "Refinansieringsstatus",
    step: "Internt steg",
  },
  en: {
    frozenRuns: "Frozen runs",
    noRuns: "No frozen runs yet.",
    selectA: "Select as A",
    selectB: "Select as B",
    remove: "Delete",
    rename: "Rename",
    renameRun: "Rename frozen run",
    compare: "Compare frozen runs",
    showTechnical: "Show technical details",
    hideTechnical: "Hide technical details",
    marginDifference: "Margin difference",
    tipping: "Tipping point",
    never: "never",
    conclusion: "Conclusion",
    tags: "Tags",
    lifecycle: "Refinancing lifecycle",
    step: "Internal step",
  },
} as const;

export type SavedRunConclusionPresentation = Readonly<{
  title: string;
  tags: readonly string[];
}>;

export function buildSavedRunConclusionPresentation(
  input: ExecutiveConclusionInput,
  language: PresentationLanguage
): SavedRunConclusionPresentation {
  const delta = input.deltaMargin ?? 0;
  const a = input.tippingStepA ?? null;
  const b = input.tippingStepB ?? null;
  let tipping: string;
  if (a == null && b == null) {
    tipping = language === "sv"
      ? "Ingen tippingpunkt observerades i något scenario."
      : "No tipping point was observed in either scenario.";
  } else if (a != null && b == null) {
    tipping = language === "sv"
      ? `Nuläge når tippingpunkten vid M${a}; Målstrategi gör det inte.`
      : `Baseline reaches the tipping point at M${a}; Goal strategy does not.`;
  } else if (a == null && b != null) {
    tipping = language === "sv"
      ? `Målstrategi når tippingpunkten vid M${b}; Nuläge gör det inte.`
      : `Goal strategy reaches the tipping point at M${b}; Baseline does not.`;
  } else {
    tipping = language === "sv"
      ? `Båda scenarierna når tippingpunkten (Nuläge M${a}, Målstrategi M${b}).`
      : `Both scenarios reach the tipping point (Baseline M${a}, Goal strategy M${b}).`;
  }

  const margin = delta > 0
    ? language === "sv" ? "Målstrategin har högre terminal marginal." : "Goal strategy has the higher terminal margin."
    : delta < 0
      ? language === "sv" ? "Målstrategin har lägre terminal marginal." : "Goal strategy has the lower terminal margin."
      : language === "sv" ? "Scenarierna har samma terminala marginal." : "The scenarios have equal terminal margins.";
  const tags = [
    delta > 0 ? (language === "sv" ? "Marginal högre" : "Margin higher") : null,
    delta < 0 ? (language === "sv" ? "Marginal lägre" : "Margin lower") : null,
    delta === 0 ? (language === "sv" ? "Marginal lika" : "Margins equal") : null,
  ].filter((tag): tag is string => tag != null);
  return { title: `${tipping} ${margin}`, tags };
}
