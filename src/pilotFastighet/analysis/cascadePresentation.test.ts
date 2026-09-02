import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CASCADE_PRESENTATION,
  formatCascadeModelPeriod,
  getCascadePresentationCopy,
  getCascadeScenarioPresentation,
} from "../cascadePresentation";
import { getExecutiveDemoSequenceProof } from "../executiveDemoFraming";
import { getPilotStrategyColors } from "../strategyColors";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const GRAPH = readFileSync(
  "app/pilot-fastighet/components/MarginGraph.tsx",
  "utf8"
);
const ACTION_PANEL = readFileSync(
  "app/pilot-fastighet/components/ActionPanel.tsx",
  "utf8"
);

test("workspace and Executive Demo share canonical neutral A/B identities", () => {
  assert.equal(CASCADE_PRESENTATION.scenarios.A.color, "#3B82F6");
  assert.equal(CASCADE_PRESENTATION.scenarios.B.color, "#F59E0B");
  assert.deepEqual(getPilotStrategyColors(false), {
    baseline: "#3B82F6",
    goal: "#F59E0B",
  });
  assert.deepEqual(getPilotStrategyColors(true), {
    baseline: "#3B82F6",
    goal: "#F59E0B",
  });
  assert.notEqual(getCascadeScenarioPresentation("A").markerShape, getCascadeScenarioPresentation("B").markerShape);
  assert.equal(getCascadeScenarioPresentation("A").lineDash, undefined);
  assert.equal(getCascadeScenarioPresentation("B").lineDash, "6 4");
});

test("Scenario B identity is amber and never falls back to red", () => {
  assert.notEqual(CASCADE_PRESENTATION.scenarios.B.color.toLowerCase(), "#ef4444");
  assert.doesNotMatch(ACTION_PANEL, /goal:\s*["']#ef4444["']/i);
  assert.doesNotMatch(
    GRAPH,
    /execRealEstateGraphPassive\s*\?\s*["']#d97706["']\s*:\s*["']#ef4444["']/i
  );
  assert.match(GRAPH, /strokeDasharray=\{execRealEstateGraphPassive \? "9 6" : "6 4"\}/);
});

test("model-period presentation is centralized and uses M1 through Mn", () => {
  assert.equal(getCascadePresentationCopy("en").modelPeriod, "M = model period");
  assert.equal(getCascadePresentationCopy("sv").modelPeriod, "M = modellperiod");
  assert.equal(formatCascadeModelPeriod(1), "M1");
  assert.equal(formatCascadeModelPeriod(36), "M36");
  assert.doesNotMatch(getCascadePresentationCopy("en").modelPeriod, /month/i);
});

test("the shared human-judgement boundary is available to both modes", () => {
  assert.equal(
    getCascadePresentationCopy("en").comparisonBoundary,
    "Comparison, not recommendation."
  );
  assert.equal(
    getExecutiveDemoSequenceProof("en").boundary,
    getCascadePresentationCopy("en").comparisonBoundary
  );
  assert.match(PAGE, /CascadeHumanJudgementBoundary/);
});

test("Structural Margin remains canonical while normal workspace capabilities stay mounted", () => {
  assert.equal(getCascadePresentationCopy("en").structuralMargin, "Structural Margin");
  for (const component of [
    "ActionPanel",
    "MarginGraph",
    "AIInspectorPanel",
    "AIInterpretationPanel",
    "ScenarioLibrary",
    "ScenarioPromptDock",
    "ScenarioPreviewPanel",
    "SnapshotCompare",
  ]) {
    assert.match(PAGE, new RegExp(`<${component}\\b`), component);
  }
  assert.match(PAGE, /scheduleValidationIssues/);
  assert.match(PAGE, /historyA/);
  assert.match(PAGE, /historyB/);
});
