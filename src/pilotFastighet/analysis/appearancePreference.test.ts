import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import ScenarioSelectionControls from "../../../app/pilot-fastighet/components/ScenarioSelectionControls";
import {
  CE_APPEARANCE_STORAGE_KEY,
  isCascadeAppearancePreference,
  readCascadeAppearancePreference,
  resolveCascadeAppearance,
  subscribeToSystemAppearance,
  writeCascadeAppearancePreference,
} from "../appearancePreference";
import { CASCADE_PRESENTATION, CASCADE_THEME_TOKENS, getCascadeScenarioControlColors } from "../cascadePresentation";

test("appearance preference is typed and malformed or unavailable storage preserves the safe Dark default", () => {
  assert.equal(isCascadeAppearancePreference("system"), true);
  assert.equal(isCascadeAppearancePreference("light"), true);
  assert.equal(isCascadeAppearancePreference("dark"), true);
  assert.equal(isCascadeAppearancePreference("sepia"), false);
  assert.equal(readCascadeAppearancePreference(null), "dark");
  assert.equal(readCascadeAppearancePreference({ getItem: () => "broken" }), "dark");
  assert.equal(readCascadeAppearancePreference({ getItem: () => { throw new Error("blocked"); } }), "dark");
});

test("explicit preferences persist under a CE-specific key without storing the resolved theme", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  writeCascadeAppearancePreference(storage, "system");
  assert.equal(values.get(CE_APPEARANCE_STORAGE_KEY), "system");
  assert.equal(readCascadeAppearancePreference(storage), "system");
  writeCascadeAppearancePreference(storage, "light");
  assert.equal(readCascadeAppearancePreference(storage), "light");
});

test("System resolves and follows OS changes while explicit Light and Dark ignore them", () => {
  assert.equal(resolveCascadeAppearance("system", true), "dark");
  assert.equal(resolveCascadeAppearance("system", false), "light");
  assert.equal(resolveCascadeAppearance("light", true), "light");
  assert.equal(resolveCascadeAppearance("dark", false), "dark");
  let listener: ((event: { matches: boolean }) => void) | null = null;
  const query = {
    matches: false,
    addEventListener: (_type: "change", next: (event: { matches: boolean }) => void) => { listener = next; },
    removeEventListener: () => { listener = null; },
  };
  const resolved: string[] = [];
  const unsubscribe = subscribeToSystemAppearance(query, "system", (value) => resolved.push(value));
  assert.ok(listener);
  (listener as (event: { matches: boolean }) => void)({ matches: true });
  assert.deepEqual(resolved, ["dark"]);
  unsubscribe();
  subscribeToSystemAppearance(query, "light", (value) => resolved.push(value));
  assert.equal(listener, null);
});

test("semantic tokens cover the primary workspace without changing analytical colors", () => {
  const required = [
    "pageBackground", "primarySurface", "subtleSurface", "elevatedSurface", "graphSurface",
    "border", "strongDivider", "primaryText", "secondaryText", "mutedText", "disabledText",
    "controlBackground", "controlHover", "selectedControl", "focusRing", "shadow",
    "criticalState", "scenarioA", "scenarioB",
  ];
  for (const theme of [CASCADE_THEME_TOKENS.light, CASCADE_THEME_TOKENS.dark]) {
    assert.deepEqual(Object.keys(theme), required);
    assert.equal(theme.scenarioA, CASCADE_PRESENTATION.scenarios.A.color);
    assert.equal(theme.scenarioB, CASCADE_PRESENTATION.scenarios.B.color);
    assert.notEqual(theme.criticalState, theme.scenarioB);
  }
});

test("Light graph and visible secondary surfaces use resolved semantic tokens while Dark remains distinct", () => {
  const graph = readFileSync("app/pilot-fastighet/components/MarginGraph.tsx", "utf8");
  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  const snapshot = readFileSync("src/pilotFastighet/components/SnapshotCompare.tsx", "utf8");
  assert.match(graph, /const graphBackground = theme\.graphBg/);
  assert.doesNotMatch(graph, /inspectionDepth === "executive"\s*\? "#0B1220"/);
  assert.equal(CASCADE_THEME_TOKENS.light.graphSurface, "#FCFCFD");
  assert.equal(CASCADE_THEME_TOKENS.dark.graphSurface, "#0B0F14");
  assert.notEqual(CASCADE_THEME_TOKENS.light.primaryText, CASCADE_THEME_TOKENS.light.mutedText);
  assert.notEqual(CASCADE_THEME_TOKENS.light.secondaryText, CASCADE_THEME_TOKENS.light.disabledText);
  assert.match(snapshot, /--ce-surface-primary/);
  assert.match(snapshot, /--ce-text-primary/);
  assert.match(page, /background: semanticTheme\.controlBackground/);
  assert.match(page, /background: semanticTheme\.primarySurface/);
});

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("scenario selectors preserve canonical A, B, and neutral Both identity in Light and Dark", () => {
  for (const theme of ["light", "dark"] as const) {
    const selectedA = getCascadeScenarioControlColors(theme, "A", true);
    const selectedB = getCascadeScenarioControlColors(theme, "B", true);
    const selectedBoth = getCascadeScenarioControlColors(theme, "BOTH", true);
    const inactiveA = getCascadeScenarioControlColors(theme, "A", false);
    const inactiveB = getCascadeScenarioControlColors(theme, "B", false);
    assert.equal(selectedA.background, "#3B82F6");
    assert.equal(selectedB.background, "#F59E0B");
    assert.notEqual(selectedB.background, CASCADE_THEME_TOKENS[theme].selectedControl);
    assert.equal(selectedBoth.background, CASCADE_THEME_TOKENS[theme].selectedControl);
    assert.notEqual(selectedBoth.background, selectedA.background);
    assert.notEqual(selectedBoth.background, selectedB.background);
    assert.equal(inactiveA.border, "#3B82F6");
    assert.equal(inactiveB.border, "#F59E0B");
    assert.ok(contrastRatio(selectedA.background, selectedA.text) >= 4.5);
    assert.ok(contrastRatio(selectedB.background, selectedB.text) >= 4.5);
  }
});

test("rendered Scenario B selection has an authoritative amber fill and unchanged click callback", async () => {
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const selections: string[] = [];
  function Harness() {
    const [selected, setSelected] = useState<"A" | "B" | "BOTH">("A");
    return createElement(ScenarioSelectionControls, {
      theme: "light",
      selected,
      labelA: "Baseline",
      labelB: "Goal strategy",
      labelBoth: "Both",
      onSelect: (next) => { selections.push(next); setSelected(next); },
    });
  }
  const container = window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(Harness)));
  const scenarioB = window.document.querySelector('[data-scenario-selector="B"]') as HTMLButtonElement;
  await act(async () => scenarioB.click());
  assert.deepEqual(selections, ["B"]);
  assert.equal(scenarioB.getAttribute("aria-pressed"), "true");
  assert.match(scenarioB.getAttribute("style") ?? "", /background:\s*#F59E0B/i);
  assert.match(scenarioB.getAttribute("style") ?? "", /background-color:\s*#F59E0B/i);
  assert.doesNotMatch(scenarioB.getAttribute("class") ?? "", /active-button/);
  assert.doesNotMatch(scenarioB.getAttribute("style") ?? "", /#3B82F6|selectedControl|gradient/i);
  const both = window.document.querySelector('[data-scenario-selector="BOTH"]') as HTMLButtonElement;
  await act(async () => both.click());
  assert.equal(both.getAttribute("aria-pressed"), "true");
  assert.doesNotMatch(both.getAttribute("style") ?? "", /#3B82F6|#F59E0B/i);
  await act(async () => root.unmount());
});

test("primary first-view surfaces consume semantic tokens and Executive Demo branching remains", () => {
  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  const findings = readFileSync("app/pilot-fastighet/components/StructuralFindingsSection.tsx", "utf8");
  const configuration = readFileSync("app/pilot-fastighet/components/WorkspaceConfigurationShell.tsx", "utf8");
  const graph = readFileSync("app/pilot-fastighet/components/MarginGraph.tsx", "utf8");
  const ai = readFileSync("app/pilot-fastighet/components/AIInterpretationPanel.tsx", "utf8");
  assert.match(page, /data-ce-appearance/);
  assert.match(page, /background: semanticTheme\.primarySurface/);
  for (const source of [findings, configuration, graph, ai]) assert.match(source, /--ce-|theme\./);
  assert.match(page, /executiveDemoMode/);
  assert.match(graph, /CASCADE_PRESENTATION\.scenarios\.A\.color/);
  assert.match(graph, /CASCADE_PRESENTATION\.scenarios\.B\.color/);
});
