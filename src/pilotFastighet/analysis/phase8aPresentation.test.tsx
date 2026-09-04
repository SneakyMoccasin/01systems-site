import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SystemDriversPanel from "../../../app/pilot-fastighet/components/SystemDriversPanel";
import ScenarioOutcomePanel from "../../../app/pilot-fastighet/components/ScenarioOutcomePanel";
import StructuralFindingsSection from "../../../app/pilot-fastighet/components/StructuralFindingsSection";
import { SnapshotCompare } from "../components/SnapshotCompare";
import {
  buildSavedRunConclusionPresentation,
  formatConfigurationGroup,
  formatConstraintState,
  formatRiskLevel,
  SAVED_RUN_COPY,
} from "../presentationLocalization";
import { buildStructuralFindingsPresentationModel } from "./structuralFindingsPresentationModel";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const FINDINGS = readFileSync("app/pilot-fastighet/components/StructuralFindingsSection.tsx", "utf8");

test("Swedish and English use context-sensitive semantic values without changing raw enums", () => {
  assert.equal(formatRiskLevel("LOW", "sv", "system-pressure"), "Lågt");
  assert.equal(formatRiskLevel("LOW", "sv", "driver"), "Låg");
  assert.equal(formatRiskLevel("MODERATE", "sv", "driver"), "Måttlig");
  assert.equal(formatRiskLevel("HIGH", "sv", "driver"), "Hög");
  assert.equal(formatRiskLevel("SEVERE", "sv", "driver"), "Allvarlig");
  assert.equal(formatConstraintState("ACTIVE", "sv"), "Aktiv");
  assert.equal(formatConstraintState("INACTIVE", "en"), "Inactive");
  assert.equal(formatRiskLevel("MODERATE", "en", "driver"), "Moderate");
  const groups = {
    "Income Dynamics": "Intäktsdynamik",
    Operations: "Drift",
    "Capital & Financing": "Kapital och finansiering",
    "External Pressure": "Externt tryck",
    "Accessibility & Mode Shift": "Tillgänglighet och färdmedelsval",
    "Operations & Capacity": "Drift och kapacitet",
    "Financial Flexibility": "Finansiell flexibilitet",
  } as const;
  for (const [raw, expected] of Object.entries(groups)) {
    assert.equal(formatConfigurationGroup(raw, "sv"), expected);
  }
});

test("normal English rendered presentation remains English and preserves signed values", () => {
  const frozen = renderToStaticMarkup(createElement(SnapshotCompare, {
    language: "en", baselineA: 1, finalA: 0.5, baselineB: 1, finalB: 0.25,
    structuralStatusA: "Stable", structuralStatusB: "Stressed", deltaMargin: -0.25,
    tippingStep: null, tippingLabel: "Tipping point", noTippingText: "No tipping point",
  }));
  assert.match(frozen, /Frozen run comparison|Baseline|Goal strategy|Margin difference|-0\.25/);
  assert.doesNotMatch(frozen, /Frysta|Nuläge|Målstrategi|Marginalskillnad/);
  const outcome = renderToStaticMarkup(createElement(ScenarioOutcomePanel, {
    language: "en", breachA: null, breachB: null, finalMarginA: 5, finalMarginB: 0.93,
    breachDifference: null,
  }));
  assert.match(outcome, /Margin difference: -4\.07/);
  assert.doesNotMatch(outcome, /Marginalskillnad|Marginalförbättring/);
});

test("normal Swedish rendered presentation contains no confirmed Frozen or Expert leakage", () => {
  const frozen = renderToStaticMarkup(createElement(SnapshotCompare, {
    language: "sv", baselineA: 1, finalA: 0.5, baselineB: 1, finalB: 0.25,
    structuralStatusA: "Stabil", structuralStatusB: "Pressad", deltaMargin: -0.25,
    tippingStep: null, tippingLabel: "Tippingpunkt", noTippingText: "Ingen tippingpunkt",
  }));
  assert.match(frozen, /Jämförelse av frysta körningar|Marginalskillnad/);
  assert.doesNotMatch(frozen, /Snapshot Compare|Current Strategy|Alternative Strategy|Margin improvement/);

  const drivers = renderToStaticMarkup(createElement(SystemDriversPanel, {
    language: "sv", primaryDriver: "budgetPressure", systemPressure: "LOW",
  }));
  assert.match(drivers, /Budgettryck|Lågt|Inga/);
  assert.doesNotMatch(drivers, /budgetPressure|>LOW</);

  const outcome = renderToStaticMarkup(createElement(ScenarioOutcomePanel, {
    language: "sv", breachA: null, breachB: null, finalMarginA: 5, finalMarginB: 0.93,
    breachDifference: null,
  }));
  assert.match(outcome, /Marginalskillnad: -4\.07/);
  assert.doesNotMatch(outcome, /Marginalförbättring|Margin improvement/);
});

test("Frozen-run controls and active configuration rendering use the requested language contract", () => {
  const frozenStart = PAGE.indexOf("{!executiveDemoMode && (\n        <>\n      <div style={{ marginTop: \"32px\"");
  const frozenEnd = PAGE.indexOf("</WorkspaceConfigurationShell>", frozenStart);
  const activeFrozen = PAGE.slice(frozenStart, frozenEnd);
  for (const raw of ["Frozen Snapshots", "Select as A", "Select as B", "Margin impact:", "Marginalförbättring"]) {
    assert.doesNotMatch(activeFrozen, new RegExp(raw));
  }
  for (const key of ["frozenRuns", "selectA", "selectB", "remove", "marginDifference", "conclusion", "tags"]) {
    assert.match(activeFrozen, new RegExp(`savedRunCopy\\.${key}`));
  }
  assert.match(PAGE, /formatConfigurationGroup\(groupName, uiLanguage\)/);
  assert.match(PAGE, /formatRiskLevel\(level, uiLanguage, "driver"\)/);
  assert.equal(SAVED_RUN_COPY.sv.compare, "Jämför frysta körningar");
  assert.equal(SAVED_RUN_COPY.en.compare, "Compare frozen runs");
});

test("all deterministic tipping and signed-margin conclusions are complete in both languages", () => {
  const states = [
    { tippingStepA: null, tippingStepB: null },
    { tippingStepA: 3, tippingStepB: null },
    { tippingStepA: null, tippingStepB: 4 },
    { tippingStepA: 3, tippingStepB: 4 },
  ] as const;
  for (const language of ["sv", "en"] as const) {
    for (const state of states) {
      for (const deltaMargin of [-1, 0, 1]) {
        const result = buildSavedRunConclusionPresentation({ ...state, deltaMargin }, language);
        assert.ok(result.title.length > 20);
        assert.equal(result.tags.length, 1);
        if (language === "sv") assert.doesNotMatch(result.title, /Goal strategy|Baseline|No tipping point|terminal margin\b/);
        else assert.doesNotMatch(result.title, /Nuläge|Målstrategi|terminala marginal/);
      }
    }
  }
});

test("Executive compact summary responds to its container and retains six bounded facts", () => {
  const long = "A deliberately long represented value that must wrap inside its own bounded summary column";
  const model = buildStructuralFindingsPresentationModel({
    mode: "executive-demo", language: "en", analysisReady: true,
    values: {
      analysisFocus: long, analysisGoal: long, structuralStatus: { selectedState: long },
      primaryDriver: { displayLabel: long }, systemPressure: { value: long }, decisionEffectSummary: long,
    },
  });
  const html = renderToStaticMarkup(createElement(StructuralFindingsSection, { model }));
  assert.equal((html.match(/data-summary-field=/g) ?? []).length, 6);
  assert.match(html, /container-type:inline-size/);
  assert.match(html, /container-name:structural-findings/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(FINDINGS, /@container structural-findings \(max-width: 680px\).*executive-demo/);
  assert.match(FINDINGS, /@container structural-findings \(max-width: 440px\).*executive-demo/);
  assert.match(FINDINGS, /@media \(max-width: 1100px\).*findings-summary-grid/);
});

test("normal Swedish Findings localize typed values and summarize structured evidence without object coercion", () => {
  const model = buildStructuralFindingsPresentationModel({
    mode: "normal", language: "sv", analysisReady: true,
    values: {
      systemPressure: { value: "HIGH" },
      forwardDecisionFlexibility: "STABLE",
      domainEvents: { all: [{ month: 0, label: "Underhållstryck ökar" }], active: [] },
      propagationChain: { nodes: [{ label: "Budgettryck" }, { label: "Kapitalbindning" }] },
      dominantConstraint: {
        message: { constraintKey: "capital", scenarioDirection: "target" },
        label: null,
      },
      structuralGoalStatements: {
        messages: [{ winningScenario: "target", constraintType: "capital", delayMonths: 2 }],
        summary: null,
        conditionedStatus: null,
      },
    },
    provenance: {
      systemPressure: [{ kind: "analysis-result", scenario: "comparison", reference: { value: "HIGH" } }],
      forwardDecisionFlexibility: [{ kind: "analysis-result", scenario: "comparison", reference: "STABLE" }],
    },
  });
  const html = renderToStaticMarkup(createElement(StructuralFindingsSection, { model }));
  assert.match(html, /Påverkan i systemet[\s\S]*Hög/);
  assert.match(html, /Handlingsutrymme framåt[\s\S]*Stabilt/);
  assert.match(html, /När förändringen börjar märkas[\s\S]*Underhållstryck ökar/);
  assert.match(html, /Hur förändringen sprids[\s\S]*Budgettryck/);
  assert.match(html, /Dominerande begränsning[\s\S]*Kapitalbegränsning · Målstrategin/);
  assert.match(html, /Strukturellt målutfall[\s\S]*Kapitalbegränsning fördröjs 2 modellperioder i målstrategin/);
  assert.doesNotMatch(html, />HIGH<|>STABLE<|\[object Object\]|When effects begin to appear|Structural propagation chain|Dominant constraint|Structural goal statements/);
  assert.deepEqual(model.fields.systemPressure?.provenance[0]?.reference, { value: "HIGH" });
  assert.equal(model.fields.forwardDecisionFlexibility?.provenance[0]?.reference, "STABLE");
  assert.match(FINDINGS, /renderCompleteValue\(reference\.reference,[\s\S]*language, true\)/);
});

test("normal Findings suppress empty structured placeholders and retain English typed formatting", () => {
  const emptySwedish = buildStructuralFindingsPresentationModel({
    mode: "normal", language: "sv", analysisReady: true,
    values: {
      propagationChain: { nodes: [], transportLabel: null, pathwayComparison: null },
      dominantConstraint: { message: null, label: null, breachEstimate: null },
      structuralGoalStatements: { messages: [], summary: null, conditionedStatus: null },
    },
  });
  const emptyHtml = renderToStaticMarkup(createElement(StructuralFindingsSection, { model: emptySwedish }));
  assert.doesNotMatch(emptyHtml, /Hur förändringen sprids|Dominerande begränsning|Strukturellt målutfall/);

  const english = buildStructuralFindingsPresentationModel({
    mode: "normal", language: "en", analysisReady: true,
    values: { systemPressure: { value: "HIGH" }, forwardDecisionFlexibility: "STABLE" },
  });
  const englishHtml = renderToStaticMarkup(createElement(StructuralFindingsSection, { model: english }));
  assert.match(englishHtml, /System pressure[\s\S]*High/);
  assert.match(englishHtml, /Forward decision flexibility[\s\S]*Stable/);
  assert.doesNotMatch(englishHtml, />HIGH<|>STABLE<|\[object Object\]/);
});

test("normal Transport and Consulting Findings retain supplied domain language through the shared formatter", () => {
  for (const value of ["Kollektivtrafikens attraktivitet", "Konsultkapacitet"] as const) {
    const model = buildStructuralFindingsPresentationModel({
      mode: "normal", language: "sv", analysisReady: true,
      values: {
        primaryDriver: { displayLabel: value },
        propagationChain: { nodes: [{ label: value }] },
      },
    });
    const html = renderToStaticMarkup(createElement(StructuralFindingsSection, { model }));
    assert.match(html, new RegExp(value));
    assert.doesNotMatch(html, /\[object Object\]|Structural propagation chain/);
  }
});
