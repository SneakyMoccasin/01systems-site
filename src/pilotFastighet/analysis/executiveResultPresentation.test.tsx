import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import StructuralFindingsSection from "../../../app/pilot-fastighet/components/StructuralFindingsSection";
import { buildStructuralFindingsPresentationModel } from "./structuralFindingsPresentationModel";
import {
  EXECUTIVE_RESULT_DESTINATIONS,
  revealExecutiveFindings,
} from "./executiveFindingsPresentation";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const AI_PANEL = readFileSync("app/pilot-fastighet/components/AIInterpretationPanel.tsx", "utf8");

function modelAt(period: number, language: "sv" | "en" = "en") {
  const model = buildStructuralFindingsPresentationModel({
    mode: "executive-demo",
    language,
    analysisReady: true,
    values: {
      analysisGoal: language === "sv" ? "Bevara handlingsutrymmet" : "Preserve room to act",
      structuralStatus: { selectedState: language === "sv" ? "Strukturellt tryck" : "Structural pressure" },
      policyDriver: { label: language === "sv" ? "Policydrivare" : "Policy driver", value: null },
      propagationChain: { nodes: [], pathwayComparison: null },
      forwardDecisionFlexibility: "STABLE",
      executiveDemoSections: {
        mainLead: "Main lead",
        spreadSummary: "Spread summary",
        decisionAnalytic: { heading: "Decision analytic", body: "Decision body" },
        earlyLines: ["M2 — early", "M21 — constraint"],
        configuredSignals: [
          { title: language === "sv" ? "Genomföringstryck" : "Execution pressure", body: language === "sv" ? "Ett" : "One" },
          { title: language === "sv" ? "Tidig divergens" : "Early divergence", body: language === "sv" ? "Två" : "Two" },
          { title: language === "sv" ? "Strukturell effekt" : "Structural effect", body: language === "sv" ? "Tre" : "Three" },
          { title: language === "sv" ? "Utsikt" : "Outlook", body: language === "sv" ? "Fyra" : "Four" },
        ],
        forwardFlexibility: "Terminal flexibility",
        marginDelta: "0.00",
      },
    },
    visibility: { executiveDemoSections: true },
    provenance: {
      executiveDemoSections: [
        { kind: "scheduled-execution", scenario: "A", reference: { actualExecutionStep: 1 } },
      ],
      forwardDecisionFlexibility: [
        { kind: "analysis-result", scenario: "comparison", reference: "STABLE" },
      ],
    },
  });
  return revealExecutiveFindings(model, period, 36);
}

async function render(period: number, language: "sv" | "en" = "en") {
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const container = window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(StructuralFindingsSection, { model: modelAt(period, language) })));
  return { window, root };
}

test("Executive destination map keeps deterministic findings separate from actual AI", () => {
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.sequenceAnalysis, "sequence-analysis");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.configuredSignals, "structural-findings");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.decisionAnalytic, "structural-findings");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.overview, "ai-interpretation");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.structuralDrivers, "ai-interpretation");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.dependencyPropagation, "ai-interpretation");
  assert.equal(EXECUTIVE_RESULT_DESTINATIONS.pressureEvolution, "ai-interpretation");
});

test("early, M8, constraint, convergence, and terminal reveal states cannot expose future content", () => {
  const sections = (period: number) => modelAt(period).fields.executiveDemoSections?.value as Record<string, unknown>;
  assert.equal((sections(1).configuredSignals as unknown[]).length, 1);
  assert.deepEqual(sections(1).earlyLines, []);
  assert.equal(sections(1).forwardFlexibility, null);
  assert.equal((sections(8).configuredSignals as unknown[]).length, 2);
  assert.deepEqual(sections(8).earlyLines, ["M2 — early"]);
  assert.equal((sections(21).configuredSignals as unknown[]).length, 3);
  assert.deepEqual(sections(21).earlyLines, ["M2 — early", "M21 — constraint"]);
  assert.equal((sections(24).configuredSignals as unknown[]).length, 3);
  assert.equal((sections(36).configuredSignals as unknown[]).length, 4);
  assert.equal(sections(36).forwardFlexibility, "Terminal flexibility");
});

test("canonical Executive Findings disclosures expose only currently revealed fields", async () => {
  const { window, root } = await render(8);
  assert.ok(window.document.querySelector('section[data-mode="executive-demo"]'));
  const expand = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Expand all"
  ) as HTMLButtonElement | undefined;
  assert.ok(expand);
  await act(async () => expand.click());
  const text = window.document.body.textContent ?? "";
  assert.match(text, /Execution pressure/);
  assert.match(text, /Early divergence/);
  assert.doesNotMatch(text, /Structural effect/);
  assert.doesNotMatch(text, /Terminal flexibility/);
  const control = window.document.querySelector('[aria-controls="findings-detail-executiveDemoSections"]');
  assert.equal(control?.getAttribute("aria-expanded"), "true");
  await act(async () => root.unmount());
});

test("Swedish Executive Findings suppress unavailable rows and never coerce objects", async () => {
  const { window, root } = await render(36, "sv");
  const expand = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Visa alla"
  ) as HTMLButtonElement | undefined;
  assert.ok(expand);
  await act(async () => expand.click());
  const text = window.document.body.textContent ?? "";
  assert.doesNotMatch(text, /\[object Object\]/);
  assert.doesNotMatch(text, /Strategios/);
  assert.doesNotMatch(text, /Policy driver|Structural propagation chain|Executive proof narrative|Expert diagnostics/);
  assert.doesNotMatch(text, /Policydrivare/);
  assert.doesNotMatch(text, /Hur förändringen sprids/);
  assert.match(text, /Exekutiv beviskedja/);
  assert.match(text, /Genomföringstryck/);
  assert.match(text, /Handlingsutrymme framåt/);
  assert.equal(window.document.querySelectorAll("[data-findings-group]:empty").length, 0);
  const source = window.document.querySelector('[data-field-id="executiveDemoSections"]')?.textContent ?? "";
  assert.match(source, /Deterministiskt härlett/);
  await act(async () => root.unmount());
});

test("forward flexibility localizes STABLE while preserving its exact source value", async () => {
  const { window, root } = await render(36, "sv");
  const control = window.document.querySelector(
    '[aria-controls="findings-detail-forwardDecisionFlexibility"]'
  ) as HTMLButtonElement | null;
  assert.ok(control);
  assert.match(control.textContent ?? "", /Stabilt/);
  assert.doesNotMatch(control.textContent ?? "", /\bSTABLE\b/);
  await act(async () => control.click());
  const detail = window.document.querySelector("#findings-detail-forwardDecisionFlexibility");
  assert.ok(detail);
  const sourceDetails = detail.querySelector("details");
  assert.ok(sourceDetails);
  assert.match(sourceDetails.textContent ?? "", /STABLE/);
  const visibleValue = detail.firstChild?.textContent ?? "";
  assert.match(visibleValue, /Stabilt/);
  assert.doesNotMatch(visibleValue, /\bSTABLE\b/);
  await act(async () => root.unmount());

  const english = await render(36, "en");
  const englishControl = english.window.document.querySelector(
    '[aria-controls="findings-detail-forwardDecisionFlexibility"]'
  );
  assert.match(englishControl?.textContent ?? "", /Stable/);
  assert.doesNotMatch(englishControl?.textContent ?? "", /\bSTABLE\b/);
  await act(async () => english.root.unmount());
});

test("Executive uses canonical Findings and one row-based AI surface without changing invocation", () => {
  assert.match(PAGE, /data-testid="executive-structural-findings"/);
  assert.match(AI_PANEL, /data-testid="executive-ai-interpretation-rows"/);
  assert.doesNotMatch(AI_PANEL, /minmax\(0, 1fr\) minmax\(0, 1fr\) minmax\(0, 1fr\) minmax\(0, 1\.07fr\)/);
  assert.match(AI_PANEL, /fetch\("\/api\/ai-interpretation"/);
  assert.match(PAGE, /simulationCompleted=\{naturallyCompletedRun\}/);
  assert.match(PAGE, /plannedSchedules: SCHEDULED_EXECUTIVE_DEMO_SCHEDULES/);
  assert.match(PAGE, /executedProvenance: revealedScheduledProvenance/);
});

test("Sequence Analysis and Executive graph contracts remain mounted unchanged", () => {
  assert.match(PAGE, /aria-label=\{uiLanguage === "sv" \? "Sekvensanalys" : "Sequence analysis"\}/);
  assert.match(PAGE, /executiveSequenceAnnotations=\{/);
  assert.match(PAGE, /scheduledExecutiveGraphMarkers/);
});
