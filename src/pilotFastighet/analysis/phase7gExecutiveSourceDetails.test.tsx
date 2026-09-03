import assert from "node:assert/strict";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import StructuralFindingsSection from "../../../app/pilot-fastighet/components/StructuralFindingsSection";
import { buildStructuralFindingsPresentationModel } from "./structuralFindingsPresentationModel";

function model(language: "sv" | "en", mode: "executive-demo" | "normal" = "executive-demo") {
  return buildStructuralFindingsPresentationModel({
    mode,
    language,
    analysisReady: true,
    values: {
      analysisGoal: language === "sv" ? "Bevara handlingsutrymmet" : "Preserve room to act",
      structuralStatus: {
        value: "refinancing risk",
        heading: "Riskläge",
        selectedState: "Pressat",
        label: "Risk",
        detected: true,
      },
      forwardDecisionFlexibility: "STABLE",
      domainEvents: {
        all: [{ month: 0, label: "refinancing risk", detected: true }],
        active: [{ month: 0, label: "refinancing risk", detected: true }],
      },
      propagationChain: {
        pathwayComparison: "Spårbar spridning",
        nodes: [{ label: "Spridningsnod", step: 2, iteration: 1, sourceRisk: "budget_pressure", targetRisk: "capitalCommitmentRigidityRisk", level: "HIGH" }],
      },
      cascadeStatus: { heading: "Kaskadstatus", text: "Spårbar", detected: false },
      executiveDemoSections: {
        configuredSignals: [{ title: "Signal", body: "Underlag" }],
        visiblePeriod: "M3",
        revealedActions: ["delay_maintenance"],
      },
    },
    visibility: {
      analysisGoal: true,
      structuralStatus: true,
      forwardDecisionFlexibility: true,
      domainEvents: true,
      propagationChain: true,
      cascadeStatus: true,
      executiveDemoSections: true,
    },
    provenance: {
      structuralStatus: [{
        kind: "analysis-result",
        scenario: "comparison",
        reference: {
          type: "RefinancingConstraint",
          lifecycle: "ACTIVE",
          activatedAtStep: 0,
          lastUpdatedStep: 2,
          selectedState: "refinancing risk",
        },
      }],
      propagationChain: [{
        kind: "cascade-events",
        scenario: "comparison",
        reference: [{ step: 2, iteration: 1, sourceRisk: "budget_pressure", targetRisk: "capitalCommitmentRigidityRisk", level: "HIGH" }],
      }],
      forwardDecisionFlexibility: [{ kind: "analysis-result", scenario: "comparison", reference: "STABLE" }],
      executiveDemoSections: [{
        kind: "scheduled-execution",
        scenario: "A",
        reference: { actionId: "delay_maintenance", scheduledStep: 1, actualExecutionStep: 1 },
      }],
    },
  });
}

async function render(language: "sv" | "en", mode: "executive-demo" | "normal" = "executive-demo") {
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const container = window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(StructuralFindingsSection, { model: model(language, mode) })));
  return { window, root };
}

async function expandAll(window: ReturnType<typeof parseHTML>["window"]) {
  const button = Array.from(window.document.querySelectorAll("button")).find((entry) =>
    /^(Visa alla|Expand all)$/.test(entry.textContent?.trim() ?? "")
  ) as HTMLButtonElement | undefined;
  assert.ok(button);
  await act(async () => button.click());
}

test("Swedish Executive source details localize presentation keys and semantic values", async () => {
  const { window, root } = await render("sv");
  const compactBefore = window.document.querySelector('[data-testid="findings-summary"]')?.textContent;
  await expandAll(window);
  const text = window.document.body.textContent ?? "";
  for (const englishKey of ["Value", "Heading", "Selected State", "All", "Active", "Month", "Label", "Detected", "Yes", "Body", "Nodes"]) {
    assert.doesNotMatch(text, new RegExp(`\\b${englishKey}\\b`));
  }
  assert.match(text, /Värde/);
  assert.match(text, /Rubrik/);
  assert.match(text, /Valt tillstånd/);
  assert.match(text, /Identifierad[\s\S]*Ja/);
  assert.match(text, /Refinansieringsrisk/);
  assert.match(text, /råvärde: refinancing risk/);
  assert.match(text, /Periodindex[\s\S]*0 \(M1\)/);
  assert.doesNotMatch(text, /Month\s*[012]/);
  assert.match(text, /Spridningsdjup[\s\S]*2/);
  assert.doesNotMatch(text, /Spridningsdjup[\s\S]{0,20}M2/);
  const domainDetail = window.document.querySelector("#findings-detail-domainEvents")?.textContent ?? "";
  assert.match(domainDetail, /Alla/);
  assert.doesNotMatch(domainDetail, /Aktiva/);
  assert.doesNotMatch(text, /\[object Object\]/);
  assert.equal(window.document.querySelectorAll("dl:empty").length, 0);
  assert.equal(window.document.querySelector('[data-testid="findings-summary"]')?.textContent, compactBefore);
  await act(async () => root.unmount());
});

test("English Executive details use English labels and preserve exact technical references", async () => {
  const { window, root } = await render("en");
  await expandAll(window);
  const text = window.document.body.textContent ?? "";
  assert.match(text, /Value/);
  assert.match(text, /Selected state/);
  assert.match(text, /Detected[\s\S]*Yes/);
  assert.match(text, /Refinancing risk/);
  assert.match(text, /raw value: refinancing risk/);
  assert.match(text, /Internal action ID[\s\S]*delay_maintenance/);
  assert.match(text, /Source reference: scheduled-execution/);
  assert.match(text, /Actual model period[\s\S]*M1/);
  await act(async () => root.unmount());
});

test("Executive duplicate primitives are suppressed while raw provenance stays available", async () => {
  const { window, root } = await render("sv");
  const control = window.document.querySelector('[aria-controls="findings-detail-forwardDecisionFlexibility"]') as HTMLButtonElement;
  assert.match(control.textContent ?? "", /Stabilt/);
  await act(async () => control.click());
  const detail = window.document.querySelector("#findings-detail-forwardDecisionFlexibility");
  assert.ok(detail);
  assert.doesNotMatch(detail.textContent ?? "", /Stabilt/);
  assert.match(detail.textContent ?? "", /Råvärde[\s\S]*STABLE/);
  await act(async () => root.unmount());
});

test("differing All and Active collections both remain visible", async () => {
  const changed = buildStructuralFindingsPresentationModel({
    mode: "executive-demo",
    language: "sv",
    analysisReady: true,
    values: { domainEvents: { all: ["alla-poster"], active: ["aktiva-poster"] } },
    visibility: { domainEvents: true },
  });
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  const root = createRoot(window.document.getElementById("root")!);
  await act(async () => root.render(createElement(StructuralFindingsSection, { model: changed })));
  await expandAll(window);
  const text = window.document.body.textContent ?? "";
  assert.match(text, /Alla[\s\S]*alla-poster/);
  assert.match(text, /Aktiva[\s\S]*aktiva-poster/);
  await act(async () => root.unmount());
});

test("normal CE retains the legacy detail renderer unchanged", async () => {
  const { window, root } = await render("sv", "normal");
  await expandAll(window);
  const text = window.document.body.textContent ?? "";
  assert.match(text, /Selected State/);
  assert.match(text, /Detected[\s\S]*Yes/);
  await act(async () => root.unmount());
});
