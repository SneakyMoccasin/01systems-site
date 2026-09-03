import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PILOT_CASES } from "../pilotCases";
import { CASCADE_THEME_TOKENS } from "../cascadePresentation";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const MODEL_SETUP = readFileSync("app/pilot-fastighet/components/ModelSetupSection.tsx", "utf8");
const SHELL = readFileSync("app/pilot-fastighet/components/WorkspaceConfigurationShell.tsx", "utf8");
const FINDINGS = readFileSync("app/pilot-fastighet/components/StructuralFindingsSection.tsx", "utf8");
const AI = readFileSync("app/pilot-fastighet/components/AIInterpretationPanel.tsx", "utf8");
const GRAPH = readFileSync("app/pilot-fastighet/components/MarginGraph.tsx", "utf8");
const SNAPSHOTS = readFileSync("src/pilotFastighet/components/SnapshotCompare.tsx", "utf8");

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("legacy scenario library and free-text analysis surfaces are absent from normal CE", () => {
  for (const component of ["ScenarioLibrary", "ScenarioPromptDock", "ScenarioPreviewPanel"]) {
    assert.doesNotMatch(PAGE, new RegExp(`import ${component}`));
    assert.doesNotMatch(PAGE, new RegExp(`<${component}\\b`));
  }
  assert.doesNotMatch(PAGE, /<textarea\b/);
  assert.match(PAGE, /<WorkspaceConfigurationShell/);
  assert.match(PAGE, /modelSetup=\{/);
});

test("Model Setup remains the exclusive visible template route and manual remains default", () => {
  assert.match(PAGE, /templates=\{modelSetupTemplates\}/);
  assert.match(PAGE, /onLoadTemplate=\{loadPilotCaseTemplate\}/);
  assert.match(PAGE, /onReturnToManual=\{returnToManualConfiguration\}/);
  assert.match(MODEL_SETUP, /useState\(""\)/);
  assert.match(MODEL_SETUP, /data-model-setup-state=\{loadedTemplate \? "template" : "manual"\}/);
  assert.match(MODEL_SETUP, /onClick=\{requestLoad\}/);
  assert.match(MODEL_SETUP, /if \(changed\) \{\s*setConfirming\(true\)/);
  assert.match(MODEL_SETUP, /onLoadTemplate\(candidate\.id\)/);
  assert.match(MODEL_SETUP, /onClick=\{onReturnToManual\}/);
  assert.ok(PILOT_CASES.filter((pilotCase) => pilotCase.id !== "neutral-baseline").length > 0);
});

test("Light semantic hierarchy provides readable active text and reserves disabled styling", () => {
  const light = CASCADE_THEME_TOKENS.light;
  assert.equal(light.primaryText, "#101828");
  assert.equal(light.secondaryText, "#344054");
  assert.equal(light.mutedText, "#475467");
  assert.equal(light.disabledText, "#98A2B3");
  for (const text of [light.primaryText, light.secondaryText, light.mutedText]) {
    assert.ok(contrastRatio(text, light.primarySurface) >= 4.5);
  }
  assert.notEqual(light.disabledText, light.mutedText);
  for (const essentialSurface of [FINDINGS, AI, GRAPH, SHELL, SNAPSHOTS]) {
    assert.doesNotMatch(essentialSurface, /var\(--ce-text-disabled/);
  }
});

test("Configuration and graph-adjacent labels consume semantic Light tokens without changing plot styling", () => {
  assert.doesNotMatch(SHELL, /text-slate-(100|400|500)|border-slate-(700|800)/);
  assert.match(SHELL, /var\(--ce-text-primary\)/);
  assert.match(SHELL, /var\(--ce-text-secondary\)/);
  assert.match(SHELL, /var\(--ce-text-muted\)/);
  assert.match(GRAPH, /var\(--ce-text-secondary/);
  assert.match(SNAPSHOTS, /var\(--ce-text-primary/);
  assert.match(SNAPSHOTS, /var\(--ce-text-secondary/);
});

test("Dark tokens and Executive Demo isolation remain intact", () => {
  assert.equal(CASCADE_THEME_TOKENS.dark.pageBackground, "#0E1117");
  assert.equal(CASCADE_THEME_TOKENS.dark.primarySurface, "#111827");
  assert.equal(CASCADE_THEME_TOKENS.dark.primaryText, "#E5E7EB");
  assert.match(PAGE, /enabled=\{!executiveDemoMode\}/);
  assert.match(PAGE, /getScheduledExecutiveDemoRunSource/);
  assert.doesNotMatch(MODEL_SETUP, /executiveDemo/i);
});

test("the supported workspace stays bounded with no retired-library layout container", () => {
  assert.match(SHELL, /min-w-0 max-w-full/);
  assert.match(SHELL, /@media \(min-width: 1024px\)/);
  assert.doesNotMatch(PAGE, /<ScenarioLibrary[\s\S]*marginTop/);
});
