import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { ScenarioChange } from "@/lib/scenarioParser";
import { ACTION_EFFECTS, resolveActionDrivenState } from "../actionEffects";
import { buildDriverScoreState } from "../driverScoreState";
import { getExecutiveDemoPlaybackRiskStates } from "../executiveDemoPlaybackScenario";
import { defaultRiskState } from "../presetRiskMapping";
import type { RiskState } from "../RealEstateEngine";
import {
  prepareExplicitConfiguredRunSource,
  prepareOrdinaryConfiguredRunSource,
  prepareScenarioPreviewRun,
  resolveConfiguredScenarioSource,
  type ConfiguredRunSelection,
} from "./configuredRunSource";
import { runReactAnalysisBoundary } from "./reactScheduledAnalysisBoundary";

const HORIZON = 36;

function selection(overrides?: Partial<ConfiguredRunSelection>): ConfiguredRunSelection {
  return {
    domainId: "realEstate",
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: [],
    },
    scenarioB: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: [],
    },
    baselineRiskState: structuredClone(defaultRiskState),
    ...overrides,
  };
}

function run(configuredSelection: ConfiguredRunSelection, horizon = HORIZON) {
  const runSource = prepareOrdinaryConfiguredRunSource(configuredSelection);
  return {
    runSource,
    result: runReactAnalysisBoundary({
      executionMode: "configured-start",
      horizon,
      runSource,
    }),
  };
}

test("ordinary configured preparation exactly preserves clean first-run inputs", () => {
  const configured = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
    scenarioB: {
      baseRiskState: {
        ...structuredClone(defaultRiskState),
        demandRisk: "HIGH",
      },
      selectedActions: ["early_refinancing"],
    },
  });
  const prepared = prepareOrdinaryConfiguredRunSource(configured);
  const legacyA = resolveActionDrivenState(
    configured.scenarioA.baseRiskState,
    configured.scenarioA.selectedActions
  );
  const legacyB = resolveActionDrivenState(
    configured.scenarioB.baseRiskState,
    configured.scenarioB.selectedActions
  );
  assert.deepEqual(prepared.scenarioA.initialRiskState, legacyA.riskState);
  assert.deepEqual(prepared.scenarioA.initialDriverScores, legacyA.driverScores);
  assert.deepEqual(prepared.scenarioB.initialRiskState, legacyB.riskState);
  assert.deepEqual(prepared.scenarioB.initialDriverScores, legacyB.driverScores);
  assert.deepEqual(prepared.baseline.initialRiskState, defaultRiskState);
});

test("canonical actions retain precise fractional scores and scenario isolation", () => {
  const prepared = prepareOrdinaryConfiguredRunSource(
    selection({
      scenarioA: {
        baseRiskState: structuredClone(defaultRiskState),
        selectedActions: ["delay_maintenance"],
      },
    })
  );
  assert.equal(prepared.scenarioA.initialDriverScores?.maintenanceIntensityRisk, 2);
  assert.equal(prepared.scenarioA.initialDriverScores?.tenantStabilityRisk, 1.5);
  assert.equal(prepared.scenarioB.initialDriverScores?.maintenanceIntensityRisk, 1);
  assert.equal(prepared.scenarioB.initialDriverScores?.tenantStabilityRisk, 1);
  assert.deepEqual(ACTION_EFFECTS.delay_maintenance, {
    maintenanceIntensityRisk: 1,
    tenantStabilityRisk: 0.5,
  });
});

test("completion and repeated reruns reproduce exact sources and full analysis", () => {
  const configured = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
  });
  const first = run(configured);
  const terminalDisplayState = first.result.analysis.scenarioA.terminalState;
  assert.notDeepEqual(terminalDisplayState.riskState, configured.scenarioA.baseRiskState);
  const second = run(configured);
  const third = run(configured);
  assert.deepEqual(second.runSource, first.runSource);
  assert.deepEqual(third.runSource, first.runSource);
  assert.deepEqual(second.result, first.result);
  assert.deepEqual(third.result, first.result);
});

test("early, middle, and late stopped prefixes cannot enter the next run source", () => {
  const configured = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
  });
  const clean = run(configured);
  for (const index of [0, 17, 34]) {
    const partialDisplayState = clean.result.analysis.scenarioA.trajectory[index];
    assert.ok(partialDisplayState.step < HORIZON);
    const rerun = run(configured);
    assert.deepEqual(rerun.runSource, clean.runSource);
    assert.deepEqual(rerun.result, clean.result);
  }
});

test("configuration, action, domain-like base, and horizon changes are authoritative", () => {
  const base = selection();
  const changedAction = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
  });
  const changedBase = selection({
    scenarioB: {
      baseRiskState: {
        ...structuredClone(defaultRiskState),
        demandRisk: "SEVERE",
      },
      selectedActions: [],
    },
  });
  assert.notDeepEqual(run(changedAction).runSource, run(base).runSource);
  assert.notDeepEqual(run(changedBase).runSource, run(base).runSource);
  assert.equal(run(base, 12).result.analysis.scenarioA.trajectory.length, 12);
  assert.equal(run(base, 36).result.analysis.scenarioA.trajectory.length, 36);
});

test("executive demo explicit source reproduces its exact configured facade result", () => {
  const demo = getExecutiveDemoPlaybackRiskStates();
  const source = prepareExplicitConfiguredRunSource({
    domainId: "realEstate",
    scenarioA: {
      initialRiskState: demo.riskStateA,
      initialDriverScores: buildDriverScoreState(demo.riskStateA),
    },
    scenarioB: {
      initialRiskState: demo.riskStateB,
      initialDriverScores: buildDriverScoreState(demo.riskStateB),
    },
    baselineRiskState: defaultRiskState,
  });
  const initial = runReactAnalysisBoundary({
    executionMode: "configured-start",
    horizon: HORIZON,
    runSource: source,
  });
  const rerun = runReactAnalysisBoundary({
    executionMode: "configured-start",
    horizon: HORIZON,
    runSource: source,
  });
  assert.deepEqual(rerun, initial);
  assert.equal(initial.analysis.scenarioA.terminalState.margin, -3);
  assert.equal(initial.analysis.scenarioB.terminalState.margin, 3);
  assert.equal(initial.analysis.baseline.terminalState.margin, 1);
  assert.equal(initial.analysis.comparison.terminalMarginDifference, 6);
});

test("preview preserves temporary and persisted scenario policy exactly", () => {
  const changesA: ScenarioChange[] = [
    { parameter: "Demand Risk", from: "MODERATE", to: "HIGH" },
  ];
  const changesB: ScenarioChange[] = [
    { parameter: "Demand Risk", from: "MODERATE", to: "HIGH" },
  ];
  const configured = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["early_refinancing"],
    },
    scenarioB: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
  });
  const preview = prepareScenarioPreviewRun({
    configuredSelection: configured,
    editableScenario: "A",
    changesA,
    changesB,
  });

  const cleanA = resolveConfiguredScenarioSource(configured.scenarioA);
  const cleanB = resolveConfiguredScenarioSource(configured.scenarioB);
  assert.equal(preview.runSource.scenarioA.initialRiskState.demandRisk, "HIGH");
  assert.equal(
    preview.runSource.scenarioB.initialRiskState.demandRisk,
    "HIGH"
  );
  assert.deepEqual(
    preview.runSource.scenarioA.initialDriverScores,
    cleanA.initialDriverScores
  );
  assert.deepEqual(
    preview.runSource.scenarioB.initialDriverScores,
    cleanB.initialDriverScores
  );
  assert.equal(preview.persistedBaseRiskStateA.demandRisk, "HIGH");
  assert.equal(
    preview.persistedBaseRiskStateB.demandRisk,
    "MODERATE"
  );

  const ordinaryAfterPreview = prepareOrdinaryConfiguredRunSource({
    domainId: "realEstate",
    scenarioA: {
      baseRiskState: preview.persistedBaseRiskStateA,
      selectedActions: configured.scenarioA.selectedActions,
    },
    scenarioB: {
      baseRiskState: preview.persistedBaseRiskStateB,
      selectedActions: configured.scenarioB.selectedActions,
    },
    baselineRiskState: configured.baselineRiskState,
  });
  assert.equal(ordinaryAfterPreview.scenarioA.initialRiskState.demandRisk, "HIGH");
  assert.equal(
    ordinaryAfterPreview.scenarioB.initialRiskState.demandRisk,
    cleanB.initialRiskState.demandRisk
  );
  assert.notDeepEqual(ordinaryAfterPreview.scenarioB, preview.runSource.scenarioB);
});

test("baseline remains isolated from actions, preview, terminal, and partial states", () => {
  const baseline = {
    ...structuredClone(defaultRiskState),
    marketVolatilityRisk: "LOW",
  } as RiskState;
  const configured = selection({
    scenarioA: {
      baseRiskState: structuredClone(defaultRiskState),
      selectedActions: ["delay_maintenance"],
    },
    baselineRiskState: baseline,
  });
  const preview = prepareScenarioPreviewRun({
    configuredSelection: configured,
    editableScenario: "B",
    changesA: [
      { parameter: "Market Volatility Risk", from: "MODERATE", to: "SEVERE" },
    ],
    changesB: [],
  });
  assert.deepEqual(preview.runSource.baseline.initialRiskState, baseline);
  assert.equal(preview.runSource.baseline.initialDriverScores, undefined);
  assert.deepEqual(run(configured).runSource.baseline, preview.runSource.baseline);
});

test("page manual configured preparation cannot consume display or playback state", () => {
  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.doesNotMatch(page, /startSimulation\("manual",\s*riskStateA/);
  assert.doesNotMatch(page, /riskOverrideA|driverScoreOverrideA/);
  assert.doesNotMatch(page, /executionMode:\s*["']actions-over-time["']/);
  assert.match(page, /prepareOrdinaryConfiguredRunSource/);
  assert.match(page, /prepareScenarioPreviewRun/);
  assert.match(page, /prepareOrdinaryConfiguredRunSource\(getConfiguredRunSelection\(\)\)/);
});

test("public executive demo uses the canonical scheduled boundary instead of the legacy fixture", () => {
  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.match(page, /getScheduledExecutiveDemoRunSource/);
  assert.match(page, /SCHEDULED_EXECUTIVE_DEMO_SCHEDULES/);
  assert.match(page, /"actions-over-time"/);
  assert.doesNotMatch(page, /getExecutiveDemoPlaybackRiskStates/);
  assert.doesNotMatch(page, /prepareExplicitConfiguredRunSource/);
});
