import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_EFFECTS } from "../actionEffects";
import { PARAMETER_CURVE_CONFIG } from "../curveConfig";
import { createInitialConstraintRegistry } from "../constraintState";
import {
  resolveExecutableDomainProfile,
  type ExecutableProfileId,
} from "../executableDomainProfile";
import { defaultRiskState } from "../presetRiskMapping";
import { RISK_PROPAGATION } from "../riskPropagation";
import { simulateConstraintsStep } from "../simulateConstraintsStep";
import { prepareOrdinaryConfiguredRunSource } from "./configuredRunSource";
import {
  createCleanRunSourceSnapshot,
  runReactAnalysisBoundary,
} from "./reactScheduledAnalysisBoundary";
import { runCascadeAnalysis } from "./runCascadeAnalysis";

function configuredFrequencyRun(domainId: "realEstate" | "municipal" | "consulting") {
  const runSource = prepareOrdinaryConfiguredRunSource({
    domainId,
    scenarioA: { baseRiskState: defaultRiskState, selectedActions: [] },
    scenarioB: {
      baseRiskState: defaultRiskState,
      selectedActions: ["increase_service_frequency"],
    },
    baselineRiskState: defaultRiskState,
  });
  return runReactAnalysisBoundary({
    executionMode: "configured-start",
    horizon: 36,
    runSource,
  });
}

test("Transport never activates refinancing or escalates interest below minus one", () => {
  const result = configuredFrequencyRun("municipal");
  const trajectory = result.analysis.scenarioB.trajectory;
  assert.ok(trajectory.some((state) => state.margin < -1));
  assert.ok(
    trajectory.every(
      (state) => state.registry.RefinancingConstraint.lifecycle === "INACTIVE"
    )
  );
  assert.ok(
    trajectory.every(
      (state) => state.riskState.interestRateExposureRisk === "MODERATE"
    )
  );
  assert.ok(
    trajectory.every(
      (state) =>
        !state.cascadeEvents.some(
          (event) => event.sourceRisk === "interestRateExposureRisk"
        )
    )
  );
});

test("Transport refinancing remains inactive across and beyond the supported margin range", () => {
  const profile = resolveExecutableDomainProfile("legacy-municipal-v1");
  for (const margin of [-100, -3, -1.1, 0.7, 3, 100]) {
    const result = simulateConstraintsStep({
      riskState: structuredClone(defaultRiskState),
      margin,
      baselineMargin: 1,
      sensitivity: 1.2,
      leverageLevel: "MODERATE",
      step: 12,
      registry: createInitialConstraintRegistry(),
      profile,
    });
    assert.equal(
      result.updatedRegistry.RefinancingConstraint.lifecycle,
      "INACTIVE"
    );
    assert.deepEqual(
      result.multipliersAfterConstraints,
      result.multipliersBeforeConstraints
    );
  }
});

test("Transport retains all action, propagation, curve, clamp, and threshold data", () => {
  const profile = resolveExecutableDomainProfile("legacy-municipal-v1");
  assert.deepEqual(profile.actionEffects, ACTION_EFFECTS);
  assert.notDeepEqual(profile.propagationRules, RISK_PROPAGATION);
  assert.deepEqual(profile.curveConfiguration, PARAMETER_CURVE_CONFIG);
  assert.deepEqual(profile.clampPolicy, { minimum: -3, maximum: 3 });
  assert.equal(profile.constraints.refinancingMarginThreshold, 0.8);
});

test("configured and M1-scheduled Transport use identical isolation", () => {
  const configured = configuredFrequencyRun("municipal");
  const runSource = createCleanRunSourceSnapshot({
    domainId: "municipal",
    profileId: "legacy-municipal-v1",
    scenarioA: { baseRiskState: defaultRiskState },
    scenarioB: { baseRiskState: defaultRiskState },
    baseline: { baseRiskState: defaultRiskState },
  });
  const scheduled = runReactAnalysisBoundary({
    executionMode: "actions-over-time",
    horizon: 36,
    runSource,
    schedules: {
      A: [],
      B: [{ actionId: "increase_service_frequency", executionStep: 1 }],
    },
  });
  assert.deepEqual(
    scheduled.analysis.scenarioB.trajectory,
    configured.analysis.scenarioB.trajectory
  );
  assert.deepEqual(scheduled.provenance.B, [
    {
      scenario: "scenarioB",
      actionId: "increase_service_frequency",
      scheduledStep: 1,
      actualExecutionStep: 1,
      appliedDriverDeltas: ACTION_EFFECTS.increase_service_frequency,
    },
  ]);
  for (const result of [configured, scheduled]) {
    for (const key of ["scenarioA", "scenarioB", "baseline"] as const) {
      assert.ok(
        result.analysis[key].trajectory.every(
          (state) => state.registry.RefinancingConstraint.lifecycle === "INACTIVE"
        )
      );
    }
  }
});

test("Real Estate still activates refinancing and escalation under legacy conditions", () => {
  const trajectory = configuredFrequencyRun("realEstate").analysis.scenarioB.trajectory;
  assert.ok(
    trajectory.some(
      (state) => state.registry.RefinancingConstraint.lifecycle === "ACTIVE"
    )
  );
  assert.ok(
    trajectory.some((state) => state.riskState.interestRateExposureRisk === "HIGH")
  );
});

test("Consulting remains exactly compatible with the Phase-1 legacy profile", () => {
  const profiled = configuredFrequencyRun("consulting").analysis;
  const legacy = runCascadeAnalysis({
    horizon: 36,
    scenarioA: { initialRiskState: structuredClone(defaultRiskState) },
    scenarioB: {
      initialRiskState: {
        ...structuredClone(defaultRiskState),
        accessibility: "HIGH",
        operational_capacity: "LOW",
        budget_pressure: "HIGH",
      },
      initialDriverScores: {
        ...Object.fromEntries(Object.keys(defaultRiskState).map((key) => [key, 1])),
        accessibility: 2,
        operational_capacity: 0.5,
        budget_pressure: 1.5,
      },
    },
    baseline: { initialRiskState: structuredClone(defaultRiskState) },
  });
  assert.deepEqual(profiled, legacy);
});

test("unknown and mismatched identities still fail before execution", () => {
  assert.throws(() =>
    resolveExecutableDomainProfile("unknown" as ExecutableProfileId)
  );
  assert.throws(() =>
    createCleanRunSourceSnapshot({
      domainId: "municipal",
      profileId: "legacy-real-estate-v1",
      scenarioA: { baseRiskState: defaultRiskState },
      scenarioB: { baseRiskState: defaultRiskState },
      baseline: { baseRiskState: defaultRiskState },
    })
  );
});
