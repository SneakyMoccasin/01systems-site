import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";

import ExpertModeSurface from "../../../app/pilot-fastighet/components/ExpertModeSurface";
import SystemDriversPanel from "../../../app/pilot-fastighet/components/SystemDriversPanel";
import DecisionExplanationPanel from "../../../app/pilot-fastighet/components/DecisionExplanationPanel";
import ScenarioInterpretationPanel from "../../../app/pilot-fastighet/components/ScenarioInterpretationPanel";
import ScenarioOutcomePanel from "../../../app/pilot-fastighet/components/ScenarioOutcomePanel";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const SURFACE = readFileSync("app/pilot-fastighet/components/ExpertModeSurface.tsx", "utf8");
const PANEL_SOURCES = [
  "SystemDriversPanel.tsx",
  "DecisionExplanationPanel.tsx",
  "ScenarioInterpretationPanel.tsx",
  "ScenarioOutcomePanel.tsx",
].map((name) =>
  readFileSync(`app/pilot-fastighet/components/${name}`, "utf8")
);

function renderSurface(appearance: "light" | "dark", language: "sv" | "en") {
  return renderToStaticMarkup(
    createElement(
      "div",
      {
        "data-ce-appearance": appearance,
        style: {
          "--ce-surface-elevated": appearance === "light" ? "#FFFFFF" : "#111827",
          "--ce-surface-subtle": appearance === "light" ? "#F7F8FA" : "#0F172A",
          "--ce-surface-primary": appearance === "light" ? "#FFFFFF" : "#111827",
          "--ce-border": appearance === "light" ? "#D0D5DD" : "#1F2937",
          "--ce-divider-strong": appearance === "light" ? "#B8C0CC" : "#334155",
          "--ce-text-primary": appearance === "light" ? "#111827" : "#E5E7EB",
          "--ce-text-secondary": appearance === "light" ? "#374151" : "#A8B1C0",
          "--ce-text-muted": appearance === "light" ? "#667085" : "#7C899D",
          "--ce-control-bg": appearance === "light" ? "#FFFFFF" : "#111827",
          "--ce-focus-ring": appearance === "light" ? "#2563EB" : "#60A5FA",
          "--ce-shadow": "rgba(15, 23, 42, 0.10)",
        } as React.CSSProperties,
      },
      createElement(
        ExpertModeSurface,
        {
          appearance,
          title: language === "sv" ? "Expertläge" : "Expert Mode",
          subtitle:
            language === "sv"
              ? "Strukturellt inspektionslager"
              : "Structural inspection layer",
          closeLabel: language === "sv" ? "Stäng expertläge" : "Close Expert Mode",
          onClose() {},
        },
        createElement(SystemDriversPanel, { language }),
        createElement(DecisionExplanationPanel, { language }),
        createElement(ScenarioInterpretationPanel, {
          language,
          parsedScenarioEffectsA: [],
          parsedScenarioEffectsB: [],
        }),
        createElement(ScenarioOutcomePanel, {
          language,
          breachA: null,
          breachB: null,
          finalMarginA: 1.25,
          finalMarginB: 1.75,
          breachDifference: null,
        })
      )
    )
  );
}

test("Light Expert Mode uses only semantic surfaces while Dark retains its resolved surface", () => {
  const light = renderSurface("light", "en");
  const dark = renderSurface("dark", "en");
  assert.match(light, /data-expert-appearance="light"/);
  assert.match(dark, /data-expert-appearance="dark"/);
  assert.match(light, /--ce-surface-elevated:#FFFFFF/);
  assert.match(dark, /--ce-surface-elevated:#111827/);
  for (const source of [SURFACE, ...PANEL_SOURCES]) {
    assert.doesNotMatch(source, /#0f172a|#111827|#1f2937|#E5E7EB|#e5e7eb|#9CA3AF|#374151|#6B7280/i);
    assert.match(source, /var\(--ce-/);
  }
});

test("System consumes the resolved appearance supplied by the workspace", () => {
  assert.match(PAGE, /<ExpertModeSurface[\s\S]*appearance=\{uiTheme\}/);
  assert.doesNotMatch(SURFACE, /matchMedia|localStorage|appearancePreference/);
});

test("close remains a genuine accessible interaction", async () => {
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  let closes = 0;
  const root = createRoot(window.document.getElementById("root")!);
  await act(async () => {
    root.render(createElement(
      ExpertModeSurface,
      {
        appearance: "light",
        title: "Expert Mode",
        subtitle: "Structural inspection layer",
        closeLabel: "Close Expert Mode",
        onClose: () => { closes += 1; },
      },
      createElement("div", null, "Diagnostics"),
    ));
  });
  const close = window.document.querySelector('button[aria-label="Close Expert Mode"]') as HTMLElement;
  assert.ok(close);
  await act(async () => close.click());
  assert.equal(closes, 1);
  await act(async () => root.unmount());
});

test("canonical sections, values, empty states, and bilingual information remain present", () => {
  for (const component of [
    "SystemDriversPanel",
    "DecisionExplanationPanel",
    "ScenarioInterpretationPanel",
    "ScenarioOutcomePanel",
  ]) assert.match(PAGE, new RegExp(`<${component}`));
  for (const text of ["structuralMetrics", "constraintView", "minimumMargin", "collapseThreshold", "sustainThreshold", "Sustain breach", "Collapse breach"]) {
    assert.match(PAGE, new RegExp(text));
  }
  const en = renderSurface("light", "en");
  const sv = renderSurface("light", "sv");
  assert.match(en, /Expert Mode|System Drivers|Scenario A|1\.25/);
  assert.match(sv, /Expertläge|Scenario A|1\.25/);
  assert.match(en, /—/);
  assert.match(sv, /—/);
});

test("Expert layout is bounded, scrollable, safely wrapped, and Executive Demo remains isolated", () => {
  assert.match(SURFACE, /clamp\(360px, 38vw, 620px\)/);
  assert.match(SURFACE, /maxWidth: "calc\(100vw - 24px\)"/);
  assert.match(SURFACE, /overflowY: "auto"/);
  assert.match(SURFACE, /overflowX: "hidden"/);
  assert.match(SURFACE, /overflowWrap: "anywhere"/);
  assert.match(PAGE, /uiMode === "expert"/);
  assert.doesNotMatch(SURFACE, /executiveDemoMode|SCHEDULED_EXECUTIVE_DEMO/);
});
