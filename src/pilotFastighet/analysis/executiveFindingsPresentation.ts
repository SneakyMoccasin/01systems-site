import type {
  StructuralFindingsPresentationField,
  StructuralFindingsPresentationModel,
} from "./structuralFindingsPresentationModel";

export const EXECUTIVE_RESULT_DESTINATIONS = Object.freeze({
  sequenceAnalysis: "sequence-analysis",
  configuredSignals: "structural-findings",
  decisionAnalytic: "structural-findings",
  mainLead: "structural-findings",
  spreadSummary: "structural-findings",
  earlyLines: "structural-findings",
  forwardFlexibility: "structural-findings",
  overview: "ai-interpretation",
  structuralDrivers: "ai-interpretation",
  dependencyPropagation: "ai-interpretation",
  pressureEvolution: "ai-interpretation",
} as const);

type ExecutiveSections = Readonly<{
  configuredSignals?: readonly unknown[] | null;
  earlyLines?: readonly string[];
  forwardFlexibility?: unknown;
  marginDelta?: unknown;
  [key: string]: unknown;
}>;

const CONFIGURED_SIGNAL_REVEAL_PERIODS = [1, 3, 21, 36] as const;

function meaningfulExecutiveField(field: StructuralFindingsPresentationField): boolean {
  if (!field.visible || field.value == null || field.value === "") return false;
  if (field.id === "expertDiagnostics") return false;
  if (field.id === "policyDriver" || field.id === "systemDriver") {
    const value = field.value as Record<string, unknown>;
    return Boolean(value.value || value.transportLabel);
  }
  if (field.id === "propagationChain") {
    const value = field.value as Record<string, unknown>;
    return Boolean(
      value.pathwayComparison || value.transportLabel ||
      (Array.isArray(value.nodes) && value.nodes.length > 0)
    );
  }
  if (Array.isArray(field.value)) return field.value.length > 0;
  if (typeof field.value === "object") {
    return Object.entries(field.value as Record<string, unknown>).some(
      ([key, entry]) => key !== "label" && entry != null && entry !== "" &&
        (!Array.isArray(entry) || entry.length > 0)
    );
  }
  return true;
}

/**
 * Presentation-only reveal adapter. It filters existing model content and never
 * derives a finding or provenance record.
 */
export function revealExecutiveFindings(
  model: StructuralFindingsPresentationModel,
  revealedPeriod: number,
  terminalPeriod: number
): StructuralFindingsPresentationModel {
  const period = Math.max(0, Math.min(revealedPeriod, terminalPeriod));
  const executiveField = model.fields.executiveDemoSections;
  if (!executiveField || !executiveField.value || typeof executiveField.value !== "object") {
    return model;
  }

  const sections = executiveField.value as ExecutiveSections;
  const configuredSignals = sections.configuredSignals?.filter(
    (_entry, index) => period >= (CONFIGURED_SIGNAL_REVEAL_PERIODS[index] ?? terminalPeriod)
  );
  const earlyLines = sections.earlyLines?.filter((line) => {
    const match = line.match(/\bM(\d+)\b/);
    return !match || Number(match[1]) <= period;
  });
  const terminal = period >= terminalPeriod;
  const value = {
    ...sections,
    configuredSignals,
    earlyLines,
    forwardFlexibility: terminal ? sections.forwardFlexibility : null,
    marginDelta: terminal ? sections.marginDelta : null,
  };
  const orderedFields = model.orderedFields.map((field) => {
    const next = field.id === "executiveDemoSections" ? { ...field, value } : field;
    return { ...next, visible: meaningfulExecutiveField(next) };
  });

  return {
    ...model,
    orderedFields,
    fields: Object.fromEntries(orderedFields.map((field) => [field.id, field])),
  };
}
