export type StructuralFindingsSourceClassification =
  | "configured-input"
  | "direct-engine-evidence"
  | "deterministic-presentation"
  | "user-history-metadata";

export type StructuralFindingsMode = "normal" | "expert" | "executive-demo";

export type StructuralFindingsFieldId =
  | "emptyState"
  | "scenarioIdentities"
  | "analysisGoal"
  | "analysisFocus"
  | "caseMetadata"
  | "goalDirection"
  | "decisionEffectSummary"
  | "executiveSummaryLines"
  | "policyDriver"
  | "systemDriver"
  | "primaryDriver"
  | "systemPressure"
  | "structuralStatus"
  | "dominantConstraint"
  | "propagationRoot"
  | "propagationChain"
  | "upstreamDependencies"
  | "dominantScenarioDifferenceChannel"
  | "constraintOrderingDifferences"
  | "constraintComparisonStatements"
  | "structuralGoalStatements"
  | "margins"
  | "forwardDecisionFlexibility"
  | "goalConflict"
  | "goalProgress"
  | "goalRisk"
  | "strategyDifference"
  | "firstStructuralDivergence"
  | "domainEvents"
  | "tippingWindow"
  | "cascadeStatus"
  | "expertDiagnostics"
  | "executiveDemoSections";

export interface StructuralFindingsProvenanceReference {
  readonly kind:
    | "analysis-result"
    | "constraint-registry"
    | "cascade-events"
    | "configured-selection"
    | "scheduled-execution";
  readonly scenario?: "A" | "B" | "comparison";
  readonly reference: unknown;
}

export interface StructuralFindingsPresentationField<T = unknown> {
  readonly id: StructuralFindingsFieldId;
  readonly source: StructuralFindingsSourceClassification;
  readonly visible: boolean;
  readonly value: T;
  readonly provenance: readonly StructuralFindingsProvenanceReference[];
}

export interface StructuralFindingsPresentationModel {
  readonly kind: "structural-findings";
  readonly mode: StructuralFindingsMode;
  readonly language: "sv" | "en";
  readonly analysisReady: boolean;
  readonly orderedFields: readonly StructuralFindingsPresentationField[];
  readonly fields: Readonly<
    Partial<Record<StructuralFindingsFieldId, StructuralFindingsPresentationField>>
  >;
}

export interface StructuralFindingsPresentationModelInput {
  readonly mode: StructuralFindingsMode;
  readonly language: "sv" | "en";
  readonly analysisReady: boolean;
  readonly values: Readonly<Partial<Record<StructuralFindingsFieldId, unknown>>>;
  readonly visibility?: Readonly<Partial<Record<StructuralFindingsFieldId, boolean>>>;
  readonly sources?: Readonly<
    Partial<Record<StructuralFindingsFieldId, StructuralFindingsSourceClassification>>
  >;
  readonly provenance?: Readonly<
    Partial<
      Record<StructuralFindingsFieldId, readonly StructuralFindingsProvenanceReference[]>
    >
  >;
}

/**
 * Stable presentation order matching AIInspectorPanel's existing hierarchy.
 * Fields stay in the model when hidden so a conditional or fallback cannot be
 * silently lost during later presentation-only restructuring.
 */
export const STRUCTURAL_FINDINGS_FIELD_ORDER = [
  "emptyState",
  "scenarioIdentities",
  "analysisGoal",
  "analysisFocus",
  "caseMetadata",
  "goalDirection",
  "decisionEffectSummary",
  "executiveSummaryLines",
  "policyDriver",
  "systemDriver",
  "primaryDriver",
  "systemPressure",
  "structuralStatus",
  "dominantConstraint",
  "propagationRoot",
  "propagationChain",
  "upstreamDependencies",
  "dominantScenarioDifferenceChannel",
  "constraintOrderingDifferences",
  "constraintComparisonStatements",
  "structuralGoalStatements",
  "margins",
  "forwardDecisionFlexibility",
  "goalConflict",
  "goalProgress",
  "goalRisk",
  "strategyDifference",
  "firstStructuralDivergence",
  "domainEvents",
  "tippingWindow",
  "cascadeStatus",
  "expertDiagnostics",
  "executiveDemoSections",
] as const satisfies readonly StructuralFindingsFieldId[];

const CONFIGURED_FIELDS = new Set<StructuralFindingsFieldId>([
  "scenarioIdentities",
  "analysisGoal",
  "analysisFocus",
  "caseMetadata",
]);

const ENGINE_FIELDS = new Set<StructuralFindingsFieldId>([
  "systemPressure",
  "structuralStatus",
  "margins",
  "domainEvents",
  "cascadeStatus",
]);

function defaultSource(
  id: StructuralFindingsFieldId
): StructuralFindingsSourceClassification {
  if (CONFIGURED_FIELDS.has(id)) return "configured-input";
  if (ENGINE_FIELDS.has(id)) return "direct-engine-evidence";
  return "deterministic-presentation";
}

export function buildStructuralFindingsPresentationModel(
  input: StructuralFindingsPresentationModelInput
): StructuralFindingsPresentationModel {
  const orderedFields = STRUCTURAL_FINDINGS_FIELD_ORDER.map((id) => ({
    id,
    source: input.sources?.[id] ?? defaultSource(id),
    visible: input.visibility?.[id] ?? input.values[id] != null,
    value: input.values[id] ?? null,
    provenance: input.provenance?.[id] ?? [],
  }));

  return {
    kind: "structural-findings",
    mode: input.mode,
    language: input.language,
    analysisReady: input.analysisReady,
    orderedFields,
    fields: Object.fromEntries(orderedFields.map((field) => [field.id, field])),
  };
}

export function structuralFindingsValue<T>(
  model: StructuralFindingsPresentationModel,
  id: StructuralFindingsFieldId
): T {
  return model.fields[id]?.value as T;
}
