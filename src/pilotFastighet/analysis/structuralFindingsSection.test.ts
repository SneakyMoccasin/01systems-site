import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import StructuralFindingsSection, {
  STRUCTURAL_FINDINGS_DESTINATIONS,
  STRUCTURAL_FINDINGS_FIELD_GROUP,
  STRUCTURAL_FINDINGS_GROUP_ORDER,
} from "../../../app/pilot-fastighet/components/StructuralFindingsSection";
import {
  buildStructuralFindingsPresentationModel,
  STRUCTURAL_FINDINGS_FIELD_ORDER,
  type StructuralFindingsFieldId,
  type StructuralFindingsMode,
} from "./structuralFindingsPresentationModel";

const RENDERER_SOURCE = readFileSync(
  "app/pilot-fastighet/components/StructuralFindingsSection.tsx",
  "utf8"
);
const PAGE_SOURCE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");

function representativeModel(mode: StructuralFindingsMode = "normal") {
  const values = Object.fromEntries(
    STRUCTURAL_FINDINGS_FIELD_ORDER.map((id) => [id, `VALUE:${id}`])
  ) as Record<StructuralFindingsFieldId, unknown>;
  values.structuralStatus = { selectedState: "Structurally resilient" };
  values.primaryDriver = { displayLabel: "Refinancing pressure" };
  values.systemPressure = { executiveLabel: "Manageable pressure" };
  values.decisionEffectSummary = "Decision effect unchanged";
  values.strategyDifference = { text: "Scenarios diverge clearly" };
  values.margins = { scenarioA: 0.2, scenarioB: 0.3, difference: 0.1 };
  values.expertDiagnostics = { relationships: 4, lifecycle: "Active" };
  values.executiveDemoSections = {
    visiblePeriod: "M3",
    revealedActions: ["A:delay_maintenance"],
  };

  return buildStructuralFindingsPresentationModel({
    mode,
    language: "en",
    analysisReady: true,
    values,
    visibility: {
      emptyState: false,
      expertDiagnostics: mode === "expert",
      executiveDemoSections: mode === "executive-demo",
    },
    provenance: {
      systemPressure: [
        {
          kind: "analysis-result",
          scenario: "comparison",
          reference: "pressure-result",
        },
      ],
      executiveDemoSections: [
        {
          kind: "scheduled-execution",
          scenario: "A",
          reference: [{ actionId: "delay_maintenance", actualExecutionStep: 1 }],
        },
      ],
    },
  });
}

async function render(model = representativeModel()) {
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  const container = window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(StructuralFindingsSection, { model })));
  return { window, root };
}

test("essential findings are visible while evidence rows are collapsed and keyboard-operable", async () => {
  const { window, root } = await render();
  const summary = window.document.querySelector('[data-testid="findings-summary"]');
  assert.ok(summary);
  assert.match(summary.textContent ?? "", /Structural status/);
  assert.match(summary.textContent ?? "", /Refinancing pressure/);
  assert.match(summary.textContent ?? "", /Manageable pressure/);
  assert.match(summary.textContent ?? "", /Decision effect unchanged/);

  const scenarioControl = window.document.querySelector(
    'button[aria-controls="findings-detail-scenarioIdentities"]'
  ) as HTMLButtonElement | null;
  assert.ok(scenarioControl);
  assert.equal(scenarioControl.getAttribute("aria-expanded"), "false");
  assert.equal(window.document.querySelector("#findings-detail-scenarioIdentities"), null);
  await act(async () => scenarioControl.click());
  assert.equal(scenarioControl.getAttribute("aria-expanded"), "true");
  const detail = window.document.querySelector("#findings-detail-scenarioIdentities");
  assert.ok(detail);
  assert.equal(detail.getAttribute("role"), "region");
  assert.equal(detail.getAttribute("aria-labelledby"), scenarioControl.id);
  await act(async () => root.unmount());
});

test("Expand all exposes applicable fields in model order and Collapse all restores focus", async () => {
  const model = representativeModel();
  const { window, root } = await render(model);
  const expandAll = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Expand all"
  ) as HTMLButtonElement | undefined;
  assert.ok(expandAll);
  await act(async () => expandAll.click());
  const renderedIds = Array.from(window.document.querySelectorAll("[data-field-id]")).map(
    (node) => node.getAttribute("data-field-id")
  );
  const expectedEvidence = STRUCTURAL_FINDINGS_GROUP_ORDER
    .flatMap((group) => model.orderedFields.map((field) => ({ field, group })))
    .filter(({ field }) => field.visible && field.id !== "emptyState")
    .filter(({ field, group }) => STRUCTURAL_FINDINGS_FIELD_GROUP[field.id] === group)
    .map(({ field }) => field.id);
  assert.deepEqual(renderedIds, expectedEvidence);
  assert.equal(
    window.document.querySelectorAll('[role="region"]').length,
    expectedEvidence.length
  );
  const collapseAll = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Collapse all"
  ) as HTMLButtonElement | undefined;
  assert.ok(collapseAll);
  await act(async () => collapseAll.click());
  assert.equal(window.document.querySelectorAll('[role="region"]').length, 0);
  await act(async () => root.unmount());
});

test("hidden fields do not render, classifications stay neutral, and provenance remains attached", async () => {
  const model = buildStructuralFindingsPresentationModel({
    mode: "normal",
    language: "en",
    analysisReady: true,
    values: {
      analysisGoal: "Preserve room to act",
      systemPressure: "Moderate",
      policyDriver: null,
      propagationChain: "Driver → constraint → margin",
    },
    visibility: { policyDriver: false },
    provenance: {
      propagationChain: [
        { kind: "cascade-events", scenario: "comparison", reference: ["event"] },
      ],
    },
  });
  const { window, root } = await render(model);
  assert.equal(window.document.querySelector('[data-field-id="policyDriver"]'), null);
  const expandAll = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Expand all"
  ) as HTMLButtonElement;
  await act(async () => expandAll.click());
  assert.match(window.document.body.textContent ?? "", /Deterministically derived/);
  assert.doesNotMatch(window.document.body.textContent ?? "", /AI-generated/i);
  assert.match(
    window.document.querySelector('[data-testid="findings-provenance-propagationChain"]')?.textContent ?? "",
    /Cascade-events[\s\S]*comparison/i
  );
  await act(async () => root.unmount());
});

test("all 33 inventory fields have a stable tested destination", () => {
  assert.deepEqual(Object.keys(STRUCTURAL_FINDINGS_DESTINATIONS), [
    ...STRUCTURAL_FINDINGS_FIELD_ORDER,
  ]);
  assert.equal(Object.keys(STRUCTURAL_FINDINGS_DESTINATIONS).length, 33);
});

test("all destinations belong to exactly one stable group and retain model order within it", () => {
  assert.deepEqual(Object.keys(STRUCTURAL_FINDINGS_FIELD_GROUP), [
    ...STRUCTURAL_FINDINGS_FIELD_ORDER,
  ]);
  assert.equal(Object.keys(STRUCTURAL_FINDINGS_FIELD_GROUP).length, 33);
  for (const group of STRUCTURAL_FINDINGS_GROUP_ORDER) {
    const expected = STRUCTURAL_FINDINGS_FIELD_ORDER.filter(
      (id) => STRUCTURAL_FINDINGS_FIELD_GROUP[id] === group
    );
    const actual = Object.entries(STRUCTURAL_FINDINGS_FIELD_GROUP)
      .filter(([, assigned]) => assigned === group)
      .map(([id]) => id);
    assert.deepEqual(actual, expected);
  }
});

test("Expand all preserves grouped access to complete values and restrained source details", async () => {
  const model = buildStructuralFindingsPresentationModel({
    mode: "normal",
    language: "en",
    analysisReady: true,
    values: { propagationChain: { complete: "Driver → constraint → margin" } },
    provenance: {
      propagationChain: [{
        kind: "cascade-events",
        scenario: "comparison",
        reference: { internalReference: "very_long_internal_reference_identifier_that_must_wrap_safely" },
      }],
    },
  });
  const { window, root } = await render(model);
  const expandAll = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Expand all"
  ) as HTMLButtonElement;
  await act(async () => expandAll.click());
  assert.match(window.document.body.textContent ?? "", /Driver → constraint → margin/);
  const sourceDetails = window.document.querySelector("details summary") as HTMLElement;
  assert.equal(sourceDetails.textContent, "Source details");
  assert.match(sourceDetails.parentElement?.textContent ?? "", /very_long_internal_reference_identifier/);
  assert.match(RENDERER_SOURCE, /overflowWrap: "anywhere"/);
  const renderedGroups = Array.from(window.document.querySelectorAll("[data-findings-group]"))
    .map((node) => node.getAttribute("data-findings-group"));
  assert.deepEqual(renderedGroups, ["drivers-and-propagation"]);
  await act(async () => root.unmount());
});

test("normal analysis gives the graph full width and renders Findings after it without moving Executive Demo", () => {
  const graph = PAGE_SOURCE.indexOf('data-testid="structural-margin-region"');
  const findings = PAGE_SOURCE.indexOf('data-testid="normal-structural-findings-region"');
  assert.ok(graph >= 0 && findings > graph);
  assert.match(PAGE_SOURCE, /executiveDemoMode \? "flex" : "block"/);
  assert.match(PAGE_SOURCE, /gridTemplateColumns:[\s\S]*minmax\(300px, 0\.35fr\) minmax\(0, 0\.65fr\)/);
  assert.match(PAGE_SOURCE, /!executiveDemoMode && effectiveExecutionMode === "configured-start"/);
});

test("normal, Expert, Executive, empty, and progressive states preserve their boundaries", async () => {
  for (const mode of ["normal", "expert", "executive-demo"] as const) {
    const { window, root } = await render(representativeModel(mode));
    assert.equal(window.document.querySelector("section")?.getAttribute("data-mode"), mode);
    assert.equal(
      window.document.querySelector('[data-field-id="expertDiagnostics"]') != null,
      mode === "expert"
    );
    assert.equal(
      window.document.querySelector('[data-field-id="executiveDemoSections"]') != null,
      mode === "executive-demo"
    );
    assert.doesNotMatch(window.document.body.textContent ?? "", /future_action|scenario B/i);
    await act(async () => root.unmount());
  }

  const empty = buildStructuralFindingsPresentationModel({
    mode: "normal",
    language: "en",
    analysisReady: false,
    values: { emptyState: "No simulation run yet." },
    visibility: { emptyState: true },
  });
  const { window, root } = await render(empty);
  assert.match(window.document.body.textContent ?? "", /No simulation run yet/);
  assert.equal(window.document.querySelector('[data-testid="findings-evidence"]'), null);
  await act(async () => root.unmount());
});

test("renderer remains presentation-only and imports no engine, runtime, or AI layer", () => {
  assert.doesNotMatch(RENDERER_SOURCE, /RealEstateEngine|runCascadeAnalysis|riskPropagation|api\/ai-interpretation|AIInterpretationPanel/);
  assert.match(RENDERER_SOURCE, /StructuralFindingsPresentationModel/);
});
