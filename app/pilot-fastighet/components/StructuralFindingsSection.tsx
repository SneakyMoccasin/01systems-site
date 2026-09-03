"use client";

import React from "react";
import {
  STRUCTURAL_FINDINGS_FIELD_ORDER,
  type StructuralFindingsFieldId,
  type StructuralFindingsPresentationField,
  type StructuralFindingsPresentationModel,
  type StructuralFindingsSourceClassification,
} from "@/src/pilotFastighet/analysis/structuralFindingsPresentationModel";

const SUMMARY_PRIORITY = [
  "analysisFocus",
  "analysisGoal",
  "structuralStatus",
  "primaryDriver",
  "systemPressure",
  "decisionEffectSummary",
  "strategyDifference",
  "margins",
  "goalConflict",
  "goalProgress",
  "goalRisk",
] as const satisfies readonly StructuralFindingsFieldId[];

export const STRUCTURAL_FINDINGS_GROUP_ORDER = [
  "context", "structural-state", "drivers-and-propagation", "constraints",
  "comparison-and-margins", "goal-progress-and-risk", "expert-diagnostics",
] as const;

export type StructuralFindingsGroupId = (typeof STRUCTURAL_FINDINGS_GROUP_ORDER)[number];

export const STRUCTURAL_FINDINGS_FIELD_GROUP: Readonly<Record<StructuralFindingsFieldId, StructuralFindingsGroupId>> = {
  emptyState: "context", scenarioIdentities: "context", analysisGoal: "context",
  analysisFocus: "context", caseMetadata: "context", goalDirection: "goal-progress-and-risk",
  decisionEffectSummary: "comparison-and-margins", executiveSummaryLines: "context",
  policyDriver: "drivers-and-propagation", systemDriver: "drivers-and-propagation",
  primaryDriver: "drivers-and-propagation", systemPressure: "structural-state",
  structuralStatus: "structural-state", dominantConstraint: "constraints",
  propagationRoot: "drivers-and-propagation", propagationChain: "drivers-and-propagation",
  upstreamDependencies: "drivers-and-propagation", dominantScenarioDifferenceChannel: "drivers-and-propagation",
  constraintOrderingDifferences: "constraints", constraintComparisonStatements: "constraints",
  structuralGoalStatements: "goal-progress-and-risk", margins: "comparison-and-margins",
  forwardDecisionFlexibility: "structural-state", goalConflict: "goal-progress-and-risk",
  goalProgress: "goal-progress-and-risk", goalRisk: "goal-progress-and-risk",
  strategyDifference: "comparison-and-margins", firstStructuralDivergence: "comparison-and-margins",
  domainEvents: "structural-state", tippingWindow: "structural-state", cascadeStatus: "structural-state",
  expertDiagnostics: "expert-diagnostics", executiveDemoSections: "context",
};

const GROUP_LABELS: Record<StructuralFindingsGroupId, { sv: string; en: string }> = {
  context: { sv: "Kontext", en: "Context" },
  "structural-state": { sv: "Strukturellt tillstånd", en: "Structural state" },
  "drivers-and-propagation": { sv: "Drivkrafter och spridning", en: "Drivers and propagation" },
  constraints: { sv: "Begränsningar", en: "Constraints" },
  "comparison-and-margins": { sv: "Jämförelse och marginaler", en: "Comparison and margins" },
  "goal-progress-and-risk": { sv: "Målutveckling och risk", en: "Goal progress and risk" },
  "expert-diagnostics": { sv: "Expertdiagnostik", en: "Expert diagnostics" },
};

export const STRUCTURAL_FINDINGS_DESTINATIONS = Object.fromEntries(
  STRUCTURAL_FINDINGS_FIELD_ORDER.map((id) => [
    id,
    id === "emptyState"
      ? "empty-state"
      : (SUMMARY_PRIORITY as readonly StructuralFindingsFieldId[]).includes(id)
        ? "summary-or-evidence"
        : "evidence",
  ])
) as Readonly<
  Record<StructuralFindingsFieldId, "empty-state" | "summary-or-evidence" | "evidence">
>;

const LABELS: Record<StructuralFindingsFieldId, { sv: string; en: string }> = {
  emptyState: { sv: "Analysstatus", en: "Analysis status" },
  scenarioIdentities: { sv: "Strategier", en: "Strategies" },
  analysisGoal: { sv: "Analysmål", en: "Analysis goal" },
  analysisFocus: { sv: "Analysfokus", en: "Analysis focus" },
  caseMetadata: { sv: "Fall", en: "Case" },
  goalDirection: { sv: "Målriktning", en: "Goal direction" },
  decisionEffectSummary: { sv: "Effekt av beslutet", en: "Decision effect" },
  executiveSummaryLines: { sv: "Sammanfattning", en: "Summary" },
  policyDriver: { sv: "Policydrivare", en: "Policy driver" },
  systemDriver: { sv: "Systemdrivare", en: "System driver" },
  primaryDriver: { sv: "Viktigaste påverkansfaktor", en: "Primary represented driver" },
  systemPressure: { sv: "Påverkan i systemet", en: "System pressure" },
  structuralStatus: { sv: "Strukturell status", en: "Structural status" },
  dominantConstraint: { sv: "Dominerande begränsning", en: "Dominant constraint" },
  propagationRoot: { sv: "Påverkansrot", en: "Propagation root" },
  propagationChain: { sv: "Hur förändringen sprids", en: "Structural propagation chain" },
  upstreamDependencies: { sv: "Strukturell orsaksrelation", en: "Upstream dependencies" },
  dominantScenarioDifferenceChannel: { sv: "Dominerande skillnadskanal", en: "Dominant scenario-difference channel" },
  constraintOrderingDifferences: { sv: "Begränsningarnas ordning", en: "Constraint ordering differences" },
  constraintComparisonStatements: { sv: "Jämförelse av begränsningar", en: "Constraint comparison" },
  structuralGoalStatements: { sv: "Strukturellt målutfall", en: "Structural goal statements" },
  margins: { sv: "Marginaler", en: "Margins" },
  forwardDecisionFlexibility: { sv: "Handlingsutrymme framåt", en: "Forward decision flexibility" },
  goalConflict: { sv: "Målkonflikt", en: "Goal conflict" },
  goalProgress: { sv: "Måluppfyllelse", en: "Goal progress" },
  goalRisk: { sv: "Målrisk", en: "Goal risk" },
  strategyDifference: { sv: "Skillnad mellan strategierna", en: "Difference between strategies" },
  firstStructuralDivergence: { sv: "Första strukturella divergens", en: "First structural divergence" },
  domainEvents: { sv: "När förändringen börjar märkas", en: "When effects begin to appear" },
  tippingWindow: { sv: "Tidig varning om minskad beslutsflexibilitet", en: "Early warning window for reduced decision flexibility" },
  cascadeStatus: { sv: "Kaskadstatus", en: "Cascade status" },
  expertDiagnostics: { sv: "Fördjupad diagnostik", en: "Expert diagnostics" },
  executiveDemoSections: { sv: "Exekutiv beviskedja", en: "Executive proof narrative" },
};

const SOURCE_LABELS: Record<
  StructuralFindingsSourceClassification,
  { sv: string; en: string }
> = {
  "configured-input": { sv: "Konfigurerad indata", en: "Configured input" },
  "direct-engine-evidence": { sv: "Motorunderlag", en: "Engine evidence" },
  "deterministic-presentation": { sv: "Deterministiskt härlett", en: "Deterministically derived" },
  "user-history-metadata": { sv: "Historikmetadata", en: "History metadata" },
};

function hasContent(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasContent);
  }
  return true;
}

function readableKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

function renderCompleteValue(value: unknown, path: string): React.ReactNode {
  if (value == null || value === "") return <span style={{ color: "#64748b" }}>—</span>;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const applicable = value.filter(hasContent);
    if (applicable.length === 0) return <span style={{ color: "#64748b" }}>—</span>;
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {applicable.map((entry, index) => (
          <div key={`${path}-${index}`}>{renderCompleteValue(entry, `${path}-${index}`)}</div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => hasContent(entry));
    if (entries.length === 0) return <span style={{ color: "#64748b" }}>—</span>;
    return (
      <dl style={{ display: "grid", gridTemplateColumns: "minmax(120px, auto) minmax(0, 1fr)", gap: "5px 14px", margin: 0 }}>
        {entries.map(([key, entry]) => (
          <React.Fragment key={`${path}-${key}`}>
            <dt style={{ color: "var(--ce-text-secondary, #94a3b8)" }}>{readableKey(key)}</dt>
            <dd style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>{renderCompleteValue(entry, `${path}-${key}`)}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }
  return String(value);
}

function firstReadableArrayValue(value: readonly unknown[]): string | null {
  for (const entry of value) {
    if (typeof entry === "string" || typeof entry === "number") return String(entry);
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      for (const key of ["title", "label", "body", "text", "displayLabel"]) {
        if (typeof record[key] === "string" && record[key]) return record[key];
      }
    }
  }
  return null;
}

function formatForwardDecisionFlexibility(
  value: unknown,
  language: "sv" | "en"
): string | null {
  if (value === "STABLE") return language === "sv" ? "Stabilt" : "Stable";
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function conciseValue(
  field: StructuralFindingsPresentationField,
  language: "sv" | "en",
  executive = false
): React.ReactNode {
  const value = field.value as Record<string, unknown> | unknown;
  if (executive && field.id === "forwardDecisionFlexibility") {
    return formatForwardDecisionFlexibility(value, language);
  }
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return executive
      ? firstReadableArrayValue(value.filter(hasContent))
      : value.filter(hasContent).slice(0, 2).map(String).join(" · ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const fieldPreferred: Partial<Record<StructuralFindingsFieldId, readonly string[]>> = {
      scenarioIdentities: ["header", "scenarioA", "baseline"],
      policyDriver: ["transportLabel", "value", "label"],
      systemDriver: ["transportLabel", "value", "label"],
      primaryDriver: ["displayLabel", "influence", "fallback", "scenarioB", "scenarioA"],
      systemPressure: ["executiveLabel", "value"],
      structuralStatus: ["selectedState", "value"],
      dominantConstraint: ["message", "executiveBreachEstimate", "label", "breachEstimate"],
      propagationChain: ["pathwayComparison", "transportLabel"],
      structuralGoalStatements: ["summary", "conditionedStatus"],
      margins: ["difference", "scenarioB", "scenarioA"],
      strategyDifference: ["text"],
      tippingWindow: ["text", "heading", "period"],
      cascadeStatus: ["text", "heading"],
      executiveDemoSections: ["mainLead", "spreadSummary", "visiblePeriod"],
    };
    const preferred = [
      ...(executive ? fieldPreferred[field.id] ?? [] : []),
      "selectedState",
      "value",
      "displayLabel",
      "influence",
      "executiveLabel",
      "text",
      "summary",
      "conditionedStatus",
      "difference",
    ];
    for (const key of [...new Set(preferred)]) {
      if (hasContent(record[key]) && ["string", "number"].includes(typeof record[key])) {
        return String(record[key]);
      }
    }
    for (const key of executive ? ["configuredSignals", "earlyLines", "revealedActions", "nodes", "active", "all", "messages"] : []) {
      if (Array.isArray(record[key])) {
        const readable = firstReadableArrayValue(record[key] as readonly unknown[]);
        if (readable) return readable;
      }
    }
  }
  return executive
    ? field.id === "expertDiagnostics" ? LABELS[field.id][language] : null
    : LABELS[field.id].en;
}

function renderExecutiveSections(value: unknown, language: "sv" | "en") {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const rows: Array<{ label: string; value: unknown }> = [];
  const add = (labelSv: string, labelEn: string, entry: unknown) => {
    if (hasContent(entry)) rows.push({ label: language === "sv" ? labelSv : labelEn, value: entry });
  };
  add("Huvudslutsats", "Main finding", record.mainLead);
  add("Kompletterande analys", "Supporting analysis", record.mainSecondary);
  add("Spridning", "Propagation", record.spreadSummary);
  add("Skillnad mellan spår", "Difference between tracks", record.spreadSecondary);
  add("Beslutsanalys", "Decision analysis", record.decisionAnalytic);
  add("Tidiga signaler", "Early signals", record.earlyLines);
  add("Konfigurerade signaler", "Configured signals", record.configuredSignals);
  add("Beslutseffekt", "Decision effect", record.decisionEffect);
  add("Strategisk skillnad", "Strategy difference", record.strategyDifference);
  add("Handlingsutrymme framåt", "Forward flexibility", record.forwardFlexibility);
  add("Marginalskillnad", "Margin delta", record.marginDelta);
  add("Synlig period", "Visible period", record.visiblePeriod);
  add("Visade åtgärder", "Revealed actions", record.revealedActions);
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(145px, .35fr) minmax(0, 1fr)", gap: "7px 16px", margin: 0 }}>
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <dt style={{ color: "var(--ce-text-secondary, #94a3b8)" }}>{row.label}</dt>
          <dd style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{renderCompleteValue(row.value, row.label)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function EvidenceSourceDetail({
  field,
  language,
}: {
  field: StructuralFindingsPresentationField;
  language: "sv" | "en";
}) {
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--ce-border, rgba(148,163,184,0.13))", fontSize: 10.5, color: "var(--ce-text-muted, #7f8da3)" }}>
      <div style={{ letterSpacing: "0.01em" }}>{SOURCE_LABELS[field.source][language]}</div>
      {field.provenance.length > 0 && (
        <div data-testid={`findings-provenance-${field.id}`} style={{ display: "grid", gap: 8, marginTop: 6 }}>
          {field.provenance.map((reference, index) => (
            <div key={`${reference.kind}-${reference.scenario ?? "none"}-${index}`}>
              <dl style={{ display: "grid", gridTemplateColumns: "minmax(88px, auto) minmax(0, 1fr)", gap: "3px 12px", margin: 0 }}>
                <dt>{language === "sv" ? "Livscykel" : "Lifecycle"}</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{readableKey(reference.kind)}</dd>
                {reference.scenario && <><dt>{language === "sv" ? "Scenarioscope" : "Scenario scope"}</dt><dd style={{ margin: 0 }}>{reference.scenario}</dd></>}
              </dl>
              {hasContent(reference.reference) && (
                <details style={{ marginTop: 5, color: "var(--ce-text-secondary, #8f9bad)" }}>
                  <summary style={{ cursor: "pointer", userSelect: "none" }}>{language === "sv" ? "Källdetaljer" : "Source details"}</summary>
                  <div style={{ marginTop: 5, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {renderCompleteValue(reference.reference, `${field.id}-provenance-${index}`)}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingEvidenceRow({
  field,
  language,
  executive,
  expanded,
  onToggle,
}: {
  field: StructuralFindingsPresentationField;
  language: "sv" | "en";
  executive: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const controlId = `findings-control-${field.id}`;
  const detailId = `findings-detail-${field.id}`;
  return (
    <div data-field-id={field.id} style={{ borderTop: "1px solid rgba(148,163,184,0.16)" }}>
      <button
        id={controlId}
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={onToggle}
        style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(180px, .6fr) minmax(0, 1.4fr) auto", gap: 18, alignItems: "start", padding: "11px 0", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{LABELS[field.id][language]}</span>
        <span style={{ minWidth: 0, color: "var(--ce-text-primary, #aeb9c8)", fontSize: 11.5, lineHeight: 1.45, overflowWrap: "anywhere", wordBreak: "break-word" }}>{conciseValue(field, language, executive)}</span>
        <span aria-hidden style={{ color: "#718096", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 120ms ease" }}>›</span>
      </button>
      {expanded && (
        <div id={detailId} role="region" aria-labelledby={controlId} style={{ padding: "0 24px 12px 0", color: "var(--ce-text-primary, #d7dee8)", fontSize: 12, lineHeight: 1.55 }}>
          {executive && field.id === "forwardDecisionFlexibility"
            ? formatForwardDecisionFlexibility(field.value, language)
            : field.id === "executiveDemoSections"
            ? renderExecutiveSections(field.value, language)
            : renderCompleteValue(field.value, field.id)}
          <EvidenceSourceDetail field={field} language={language} />
        </div>
      )}
    </div>
  );
}

export default function StructuralFindingsSection({
  model,
}: {
  model: StructuralFindingsPresentationModel;
}) {
  const [expanded, setExpanded] = React.useState<ReadonlySet<StructuralFindingsFieldId>>(
    () => new Set()
  );
  const language = model.language;
  const executive = model.mode === "executive-demo";
  const applicable = model.orderedFields.filter(
    (field) => field.visible && hasContent(field.value) &&
      (!executive || conciseValue(field, language, true) != null)
  );

  if (!model.analysisReady) {
    const empty = model.fields.emptyState;
    return (
      <section aria-labelledby="structural-findings-title" style={{ background: "var(--ce-surface-subtle, #0F172A)", border: "1px solid var(--ce-border, #1F2937)", borderRadius: 6, padding: 12 }}>
        <h2 id="structural-findings-title" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ce-text-primary, #e5e7eb)" }}>
          {language === "sv" ? "Strukturella fynd" : "Structural Findings"}
        </h2>
        <div style={{ marginTop: 10, color: "var(--ce-text-secondary, #94a3b8)", fontSize: 12 }}>{empty ? renderCompleteValue(empty.value, empty.id) : "—"}</div>
      </section>
    );
  }

  const summary = SUMMARY_PRIORITY.map((id) => model.fields[id])
    .filter((field): field is StructuralFindingsPresentationField => Boolean(
      field?.visible && hasContent(field.value) &&
      (!executive || conciseValue(field, language, true) != null)
    ))
    .slice(0, 6);
  const evidence = applicable.filter(
    (field) => field.id !== "emptyState"
  );
  const groups = STRUCTURAL_FINDINGS_GROUP_ORDER.map((id) => ({
    id,
    fields: evidence.filter((field) => STRUCTURAL_FINDINGS_FIELD_GROUP[field.id] === id),
  })).filter((group) => group.fields.length > 0);
  const allExpanded = evidence.length > 0 && evidence.every((field) => expanded.has(field.id));

  const toggle = (id: StructuralFindingsFieldId) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section aria-labelledby="structural-findings-title" data-mode={model.mode} style={{ background: "var(--ce-surface-subtle, #0F172A)", border: "1px solid var(--ce-border, #1F2937)", borderRadius: 6, padding: "12px 14px", color: "var(--ce-text-primary, #e5e7eb)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <h2 id="structural-findings-title" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
          {language === "sv" ? "Strukturella fynd" : "Structural Findings"}
        </h2>
        {evidence.length > 0 && (
          <button type="button" onClick={() => setExpanded(allExpanded ? new Set() : new Set(evidence.map((field) => field.id)))} style={{ border: 0, background: "transparent", color: "var(--ce-text-secondary, #94a3b8)", padding: "2px 0", fontSize: 11, cursor: "pointer" }}>
            {allExpanded
              ? language === "sv" ? "Dölj alla" : "Collapse all"
              : language === "sv" ? "Visa alla" : "Expand all"}
          </button>
        )}
      </div>

      <style>{`
        .findings-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 1100px) { .findings-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 760px) { .findings-summary-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
      <div className="findings-summary-grid" data-testid="findings-summary" style={{ display: "grid", gap: "14px 28px", marginTop: 14, paddingBottom: evidence.length > 0 ? 12 : 0 }}>
        {summary.map((field) => (
          <div key={field.id} data-summary-field={field.id} style={{ minWidth: 0, fontSize: 12 }}>
            <div style={{ color: "var(--ce-text-muted, #8f9bad)", fontSize: 10.5, marginBottom: 4 }}>{LABELS[field.id][language]}</div>
            <div style={{ color: "var(--ce-text-primary, #e1e7ef)", minWidth: 0, lineHeight: 1.45, overflowWrap: "anywhere", wordBreak: "break-word" }}>{conciseValue(field, language, executive)}</div>
          </div>
        ))}
      </div>

      <div data-testid="findings-evidence">
        {groups.map((group) => (
          <section key={group.id} data-findings-group={group.id} aria-labelledby={`findings-group-${group.id}`} style={{ marginTop: 10 }}>
            <h3 id={`findings-group-${group.id}`} style={{ margin: 0, padding: "10px 0 7px", color: "var(--ce-text-muted, #7f8da3)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.035em", textTransform: "uppercase" }}>
              {GROUP_LABELS[group.id][language]}
            </h3>
            {group.fields.map((field) => (
              <FindingEvidenceRow key={field.id} field={field} language={language} executive={executive} expanded={expanded.has(field.id)} onToggle={() => toggle(field.id)} />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
