import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DomainSelector from "../../../app/pilot-fastighet/components/DomainSelector";
import CompactScheduleSummary from "../../../app/pilot-fastighet/components/CompactScheduleSummary";

const PAGE = readFileSync(
  new URL("../../../app/pilot-fastighet/page.tsx", import.meta.url),
  "utf8"
);

const colors = {
  background: "#ffffff",
  text: "#111827",
  secondaryText: "#475467",
  border: "#d0d5dd",
  surface: "#f8fafc",
};

test("Domain renders once in the primary normal toolbar with every supported domain", () => {
  const markup = renderToStaticMarkup(
    <DomainSelector
      language="en"
      value="municipal"
      labels={{
        realEstate: "Real Estate Portfolio",
        municipal: "Transport System",
        consulting: "Consulting System",
      }}
      onChange={() => undefined}
      colors={colors}
    />
  );

  assert.match(markup, /data-testid="primary-domain-control"/);
  assert.match(markup, /aria-label="Domain"/);
  assert.match(markup, /Real Estate Portfolio/);
  assert.match(markup, /Transport System/);
  assert.match(markup, /Consulting System/);
  assert.equal((PAGE.match(/<DomainSelector/g) ?? []).length, 1);
  assert.match(PAGE, /<DomainSelector[\s\S]*onChange=\{changeDomain\}/);
  assert.doesNotMatch(PAGE, /marginBottom: "10px",\s*padding: "6px",\s*borderRadius: "4px"/);
});

test("domain switching preserves the established state transition and template filtering", () => {
  assert.match(PAGE, /const changeDomain = \(newDomain: DomainKey\) => \{/);
  for (const transition of [
    "setDomain(newDomain)",
    "setActiveDomain(newDomain)",
    "createFreshDomainScenarioState(newDomain)",
    "setScenarioSchedules(clearAllScenarioSchedules())",
    "setTransportScenarioTarget(null)",
  ]) {
    assert.ok(PAGE.includes(transition), `missing preserved transition: ${transition}`);
  }
  assert.match(PAGE, /VISIBLE_PILOT_CASES\.filter\(\(c\) => c\.domain === domain\)/);
  assert.match(PAGE, /if \(!pilotCase \|\| pilotCase\.domain !== domain\) return/);
});

test("an empty or configured-start schedule reserves no scenario block", () => {
  const emptyMarkup = renderToStaticMarkup(
    <CompactScheduleSummary
      language="en"
      schedules={{ A: [], B: [] }}
      revealedProvenance={{ A: [], B: [] }}
      actionLabel={(id) => id}
      colors={colors}
    />
  );
  assert.equal(emptyMarkup, "");
  assert.match(PAGE, /effectiveExecutionMode === "actions-over-time"/);
  assert.match(PAGE, /<ScenarioPresetsPanel/);
  const focusSource = readFileSync(
    new URL("../../../app/pilot-fastighet/components/ScenarioPresetsPanel.tsx", import.meta.url),
    "utf8"
  );
  assert.match(focusSource, /data-testid="compact-explanation-focus"/);
  assert.doesNotMatch(focusSource, /flex flex-col gap-2/);
});

test("real A and B schedule evidence is compact, exact, and provenance-safe", () => {
  const markup = renderToStaticMarkup(
    <CompactScheduleSummary
      language="en"
      schedules={{
        A: [{ actionId: "delay_maintenance", executionStep: 6 }],
        B: [{ actionId: "early_refinancing", executionStep: 9 }],
      }}
      revealedProvenance={{
        A: [
          {
            scenario: "scenarioA",
            actionId: "delay_maintenance",
            scheduledStep: 6,
            actualExecutionStep: 6,
            appliedDriverDeltas: {},
          },
        ],
        B: [],
      }}
      actionLabel={(id) => id}
      colors={colors}
    />
  );

  assert.match(markup, /data-testid="compact-schedule-summary"/);
  assert.match(markup, /Scenario A/);
  assert.match(markup, /delay_maintenance — M6 · executed M6/);
  assert.match(markup, /Scenario B/);
  assert.match(markup, /early_refinancing — M9/);
  assert.doesNotMatch(markup, /executed M9/);
  assert.match(markup, /border-left:2px solid #3B82F6/);
  assert.match(markup, /border-left:2px dashed #F59E0B/);
  assert.match(markup, /flex-wrap:wrap/);
});

test("Executive Demo stays isolated and graph inputs remain untouched", () => {
  assert.match(PAGE, /\{!executiveDemoMode && \(\s*<DomainSelector/);
  assert.match(PAGE, /\{!executiveDemoMode && effectiveExecutionMode === "actions-over-time" && \(\s*<CompactScheduleSummary/);
  assert.match(PAGE, /<MarginGraph[\s\S]*marginHistoryA=\{marginHistoryA\}[\s\S]*marginHistoryB=\{marginHistoryB\}/);
  assert.match(PAGE, /executionMarkers=\{[\s\S]*scheduledExecutiveGraphMarkers/);
});
