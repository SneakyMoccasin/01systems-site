import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_EFFECTS } from "../actionEffects";
import {
  getExecutableProfileIdForDomain,
  resolveExecutableDomainProfile,
  resolveLegacyCompatibilityProfile,
  type ExecutableProfileId,
} from "../executableDomainProfile";
import { defaultRiskState } from "../presetRiskMapping";
import { RISK_PROPAGATION } from "../riskPropagation";
import { getScheduledExecutiveDemoRunSource } from "../scheduledExecutiveDemo";
import { prepareOrdinaryConfiguredRunSource } from "./configuredRunSource";
import {
  createCleanRunSourceSnapshot,
  prepareScheduledFacadeInput,
  runReactAnalysisBoundary,
} from "./reactScheduledAnalysisBoundary";
import { runCascadeAnalysis } from "./runCascadeAnalysis";

const DOMAIN_PROFILES = {
  realEstate: "legacy-real-estate-v1",
  municipal: "legacy-municipal-v1",
  consulting: "legacy-consulting-v1",
} as const;

test("every selectable domain resolves to a known deeply immutable profile", () => {
  for (const [domainId, expectedProfileId] of Object.entries(DOMAIN_PROFILES)) {
    const profileId = getExecutableProfileIdForDomain(
      domainId as keyof typeof DOMAIN_PROFILES
    );
    const profile = resolveExecutableDomainProfile(profileId, domainId as never);
    assert.equal(profileId, expectedProfileId);
    assert.equal(profile.domainId, domainId);
    assert.equal(Object.isFrozen(profile), true);
    assert.equal(Object.isFrozen(profile.actionEffects), true);
    assert.equal(Object.isFrozen(profile.propagationRules), true);
    assert.equal(Object.isFrozen(profile.curveConfiguration), true);
    assert.equal(Object.isFrozen(profile.constraints.activeEffects), true);
    assert.equal("label" in profile, false);
    assert.equal("template" in profile, false);
    assert.equal("ai" in profile, false);
  }
});

test("unknown and domain-mismatched profile identities fail closed", () => {
  assert.throws(() => getExecutableProfileIdForDomain("unknown" as never));
  assert.throws(() =>
    resolveExecutableDomainProfile("unknown" as ExecutableProfileId)
  );
  assert.throws(() =>
    resolveExecutableDomainProfile("legacy-municipal-v1", "realEstate")
  );
});

test("Phase-1 profiles preserve the exact global executable contracts", () => {
  for (const profileId of Object.values(DOMAIN_PROFILES)) {
    const profile = resolveExecutableDomainProfile(profileId);
    assert.deepEqual(profile.actionEffects, ACTION_EFFECTS);
    if (profile.domainId !== "municipal") {
      assert.deepEqual(profile.propagationRules, RISK_PROPAGATION);
    }
    assert.equal(profile.constraints.refinancingMarginThreshold, 0.8);
    assert.deepEqual(profile.clampPolicy, { minimum: -3, maximum: 3 });
  }
  const legacyEscalation = [
    {
      marginBelow: -1,
      driver: "interestRateExposureRisk",
      lowTarget: "MODERATE",
      moderateTarget: "HIGH",
    },
  ];
  assert.equal(
    resolveExecutableDomainProfile("legacy-real-estate-v1").constraints
      .refinancingEnabled,
    true
  );
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-real-estate-v1").marginEscalationRules,
    legacyEscalation
  );
  assert.equal(
    resolveExecutableDomainProfile("legacy-consulting-v1").constraints
      .refinancingEnabled,
    true
  );
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-consulting-v1").marginEscalationRules,
    legacyEscalation
  );
  assert.equal(
    resolveExecutableDomainProfile("legacy-municipal-v1").constraints
      .refinancingEnabled,
    false
  );
  assert.deepEqual(
    resolveExecutableDomainProfile("legacy-municipal-v1").marginEscalationRules,
    []
  );
});

test("normal configured selection derives its trusted profile from domain only", () => {
  const source = prepareOrdinaryConfiguredRunSource({
    domainId: "municipal",
    scenarioA: { baseRiskState: defaultRiskState, selectedActions: [] },
    scenarioB: { baseRiskState: defaultRiskState, selectedActions: [] },
    baselineRiskState: defaultRiskState,
    profileId: "legacy-real-estate-v1",
    templateAttribution: { profileId: "legacy-real-estate-v1" },
  } as never);
  assert.equal(source.domainId, "municipal");
  assert.equal(source.profileId, "legacy-municipal-v1");
  assert.equal(source.modelVersion, "pilot-fastighet-v0.4");
  assert.equal(source.calibrationVersion, "transport-propagation-isolated-v1");
});

test("configured and scheduled boundaries carry one unchanged profile identity", () => {
  const source = createCleanRunSourceSnapshot({
    domainId: "consulting",
    profileId: "legacy-consulting-v1",
    scenarioA: { baseRiskState: defaultRiskState },
    scenarioB: { baseRiskState: defaultRiskState },
    baseline: { baseRiskState: defaultRiskState },
  });
  const scheduled = prepareScheduledFacadeInput({
    horizon: 3,
    runSource: source,
    schedules: { A: [], B: [] },
  });
  assert.equal(scheduled.profileId, source.profileId);
  const configured = runReactAnalysisBoundary({
      executionMode: "configured-start",
      horizon: 3,
      runSource: source,
    });
  const scheduledResult = runReactAnalysisBoundary({
      executionMode: "actions-over-time",
      horizon: 3,
      runSource: source,
      schedules: { A: [], B: [] },
    });
  assert.deepEqual(
    scheduledResult.analysis.scenarioA.trajectory,
    configured.analysis.scenarioA.trajectory
  );
  assert.deepEqual(
    scheduledResult.analysis.scenarioB.trajectory,
    configured.analysis.scenarioB.trajectory
  );
  assert.deepEqual(scheduledResult.provenance, configured.provenance);
  assert.deepEqual(configured.executionProfile, {
    profileId: "legacy-consulting-v1",
    domainId: "consulting",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "legacy-global-v1",
  });
});

test("Real Estate and Consulting retain profile-less legacy histories exactly", () => {
  const legacy = runCascadeAnalysis({
    horizon: 12,
    scenarioA: { initialRiskState: structuredClone(defaultRiskState) },
    scenarioB: { initialRiskState: structuredClone(defaultRiskState) },
  });
  assert.equal(resolveLegacyCompatibilityProfile().profileId, "legacy-real-estate-v1");

  for (const profileId of [
    DOMAIN_PROFILES.realEstate,
    DOMAIN_PROFILES.consulting,
  ]) {
    const profiled = runCascadeAnalysis({
      profileId,
      horizon: 12,
      scenarioA: { initialRiskState: structuredClone(defaultRiskState) },
      scenarioB: { initialRiskState: structuredClone(defaultRiskState) },
    });
    assert.deepEqual(profiled, legacy);
  }
});

test("Executive Demo is explicitly bound to the legacy Real Estate profile", () => {
  const source = getScheduledExecutiveDemoRunSource();
  assert.equal(source.domainId, "realEstate");
  assert.equal(source.profileId, "legacy-real-estate-v1");
});
