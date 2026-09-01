import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const GRAPH = readFileSync(
  "app/pilot-fastighet/components/MarginGraph.tsx",
  "utf8"
);
const INSPECTOR = readFileSync(
  "app/pilot-fastighet/components/AIInspectorPanel.tsx",
  "utf8"
);
const SUMMARY = readFileSync(
  "app/pilot-fastighet/components/ExecutiveSummaryCard.tsx",
  "utf8"
);
const INTERPRETATION = readFileSync(
  "app/pilot-fastighet/components/AIInterpretationPanel.tsx",
  "utf8"
);
const API_ROUTE = readFileSync("app/api/ai-interpretation/route.ts", "utf8");
const UI_TEXT = readFileSync("src/pilotFastighet/uiText.ts", "utf8");
const EXECUTIVE_FRAMING = readFileSync(
  "src/pilotFastighet/executiveDemoFraming.ts",
  "utf8"
);
const PROPAGATION_CHAIN = readFileSync(
  "app/pilot-fastighet/components/inspector-utils/buildPropagationChain.ts",
  "utf8"
);

test("the executive strip presents state 36 as terminal M36", () => {
  assert.match(PAGE, /engineStateStepToDisplayedPeriod\(stateA\.step\)/);
  assert.doesNotMatch(PAGE, /stateA\.step[^\n}]*\+\s*1/);
});

test("constraint activation and divergence use explicit presentation conversions", () => {
  assert.match(INSPECTOR, /constraintSourceStepToDisplayedPeriod\(entry\.activationStep\)/);
  assert.match(PAGE, /divergenceIndexToDisplayedPeriod\(/);
  assert.doesNotMatch(INSPECTOR, /M\$\{entry\.activationStep\}/);
});

test("active trajectory result surfaces do not render quarter labels", () => {
  for (const source of [
    PAGE,
    GRAPH,
    INSPECTOR,
    SUMMARY,
    INTERPRETATION,
    API_ROUTE,
    UI_TEXT,
    EXECUTIVE_FRAMING,
  ]) {
    assert.doesNotMatch(source, /[`"']Q\$\{/);
    assert.doesNotMatch(source, /\bQuarter\b|\bKvartal\b/);
  }
});

test("propagation depth is not positioned as execution time", () => {
  assert.doesNotMatch(GRAPH, /mapCascadeToMarkers|safeStep\s*=|e\.step/);
  assert.doesNotMatch(INSPECTOR, /mapCascadeEventToIndex|e\.step/);
  assert.match(PROPAGATION_CHAIN, /type:\s*"interaction",\s*timing:\s*null/);
});

test("Gate 5B1a does not add schedule controls or rerun execution", () => {
  assert.doesNotMatch(PAGE, /executionMode:\s*["']actions-over-time["']/);
  assert.doesNotMatch(PAGE, /addScheduledAction|editScheduledActionStep/);
});
