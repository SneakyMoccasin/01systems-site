import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStructuralFindingsPresentationModel,
  STRUCTURAL_FINDINGS_FIELD_ORDER,
  type StructuralFindingsFieldId,
  type StructuralFindingsMode,
} from "./structuralFindingsPresentationModel";

const completeValues = Object.fromEntries(
  STRUCTURAL_FINDINGS_FIELD_ORDER.map((id, index) => [id, `${index}:${id}`])
) as Record<StructuralFindingsFieldId, unknown>;

function buildRepresentative(
  mode: StructuralFindingsMode,
  overrides: Partial<Record<StructuralFindingsFieldId, unknown>> = {},
  visibility: Partial<Record<StructuralFindingsFieldId, boolean>> = {}
) {
  return buildStructuralFindingsPresentationModel({
    mode,
    language: "en",
    analysisReady: mode !== "normal" || overrides.emptyState === null,
    values: { ...completeValues, ...overrides },
    visibility,
  });
}

test("golden field inventory is complete, unique, ordered, and deterministic-only", () => {
  const model = buildRepresentative("normal");
  assert.deepEqual(
    model.orderedFields.map(({ id }) => id),
    STRUCTURAL_FINDINGS_FIELD_ORDER
  );
  assert.equal(new Set(STRUCTURAL_FINDINGS_FIELD_ORDER).size, 33);
  assert.equal(model.orderedFields.length, 33);
  assert.equal(
    model.orderedFields.some((field) =>
      String(field.source).toLowerCase().includes("ai")
    ),
    false
  );
});

test("normal pre-run keeps the empty state and hidden optional fallbacks in the model", () => {
  const model = buildStructuralFindingsPresentationModel({
    mode: "normal",
    language: "en",
    analysisReady: false,
    values: {
      emptyState: "No simulation run yet.",
      primaryDriver: { value: null, fallback: null },
      dominantConstraint: null,
      tippingWindow: { period: null, text: "No reduced-flexibility signal" },
    },
    visibility: {
      emptyState: true,
      primaryDriver: false,
      dominantConstraint: false,
    },
  });
  assert.equal(model.fields.emptyState?.visible, true);
  assert.equal(model.fields.primaryDriver?.visible, false);
  assert.equal(model.fields.primaryDriver?.value != null, true);
  assert.equal(model.fields.dominantConstraint?.visible, false);
  assert.ok(model.fields.tippingWindow);
});

test("completed goal-aware transport and real-estate values retain constraints, margins, fallbacks, and goal branches", () => {
  for (const caseType of ["transport", "real-estate"] as const) {
    const model = buildRepresentative("normal", {
      caseMetadata: { caseType },
      goalDirection: `${caseType}:goal-direction`,
      goalProgress: `${caseType}:goal-progress`,
      goalRisk: `${caseType}:goal-risk`,
      goalConflict: `${caseType}:goal-conflict`,
      policyDriver: { value: "policy", lever: caseType === "transport" },
      systemDriver: { value: "system" },
      dominantConstraint: { type: "capital", period: 4 },
      constraintComparisonStatements: ["avoided", "delayed", "earlier"],
      margins: { scenarioA: 0.2, scenarioB: 0.3, difference: 0.1 },
      firstStructuralDivergence: 3,
    });
    assert.equal(model.fields.goalDirection?.visible, true);
    assert.deepEqual(model.fields.constraintComparisonStatements?.value, [
      "avoided",
      "delayed",
      "earlier",
    ]);
    assert.deepEqual(model.fields.margins?.value, {
      scenarioA: 0.2,
      scenarioB: 0.3,
      difference: 0.1,
    });
  }
});

test("Expert and Executive modes preserve their mode-specific ordered content", () => {
  const expert = buildRepresentative("expert", {
    expertDiagnostics: {
      relationships: 4,
      lifecycle: "Active",
      seriesLengthA: 18,
      seriesLengthB: 18,
      selectedPeriod: 5,
    },
  });
  const executive = buildRepresentative("executive-demo", {
    executiveDemoSections: {
      configuredSignals: ["pressure", "spread", "warning", "evolution"],
      progressive: true,
    },
  });
  assert.equal(expert.fields.expertDiagnostics?.visible, true);
  assert.equal(executive.fields.executiveDemoSections?.visible, true);
  assert.equal(executive.mode, "executive-demo");
  assert.deepEqual(
    expert.orderedFields.map(({ id }) => id),
    executive.orderedFields.map(({ id }) => id)
  );
});

test("provenance is passed through exactly and never invents future or cross-scenario records", () => {
  const revealedA = [{ actionId: "delay_maintenance", actualExecutionStep: 1 }];
  const model = buildStructuralFindingsPresentationModel({
    mode: "executive-demo",
    language: "en",
    analysisReady: true,
    values: { executiveDemoSections: { progressive: true } },
    provenance: {
      executiveDemoSections: [
        {
          kind: "scheduled-execution",
          scenario: "A",
          reference: revealedA,
        },
      ],
    },
  });
  assert.deepEqual(model.fields.executiveDemoSections?.provenance, [
    {
      kind: "scheduled-execution",
      scenario: "A",
      reference: revealedA,
    },
  ]);
  assert.equal(
    JSON.stringify(model.fields.executiveDemoSections?.provenance).includes(
      '"scenario":"B"'
    ),
    false
  );
});
