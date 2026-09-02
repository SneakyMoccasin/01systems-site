import type { ScenarioChange } from "@/lib/scenarioParser";
import {
  resolveActionDrivenState,
} from "../actionEffects";
import type { DriverScoreState } from "../driverScoreState";
import type { RiskLevel } from "../impactContract";
import type { RiskState } from "../RealEstateEngine";
import type { DomainKey } from "@/src/i18n/pulseLanguage";
import {
  getExecutableProfileIdForDomain,
  resolveExecutableDomainProfile,
  type ExecutableDomainProfile,
} from "../executableDomainProfile";
import {
  createCleanRunSourceSnapshot,
  type CleanRunSourceSnapshot,
} from "./reactScheduledAnalysisBoundary";

export type ConfiguredScenarioSelection = Readonly<{
  baseRiskState: RiskState;
  selectedActions: readonly string[];
}>;

export type ConfiguredRunSelection = Readonly<{
  domainId: DomainKey;
  scenarioA: ConfiguredScenarioSelection;
  scenarioB: ConfiguredScenarioSelection;
  baselineRiskState: RiskState;
}>;

export type ResolvedConfiguredScenarioSource = Readonly<{
  initialRiskState: RiskState;
  initialDriverScores: DriverScoreState;
}>;

export type ExplicitOneRunScenarioSource = Readonly<{
  initialRiskState: RiskState;
  initialDriverScores: DriverScoreState;
}>;

export type ScenarioPreviewPreparation = Readonly<{
  runSource: CleanRunSourceSnapshot;
  persistedBaseRiskStateA: RiskState;
  persistedBaseRiskStateB: RiskState;
  persistedScenarioA: ResolvedConfiguredScenarioSource;
  persistedScenarioB: ResolvedConfiguredScenarioSource;
}>;

const PREVIEW_PARAMETER_TO_DRIVER: Readonly<Record<string, string>> = {
  "Interest Rate Exposure": "interestRateExposureRisk",
  "Energy Exposure": "energyExposureRisk",
  "Tenant Stability": "tenantStabilityRisk",
  "Maintenance Intensity": "maintenanceIntensityRisk",
  "Refinancing Risk": "refinancingRisk",
  "Demand Risk": "demandRisk",
  "Pricing Power Risk": "pricingPowerRisk",
  "Operational Efficiency Risk": "operationalEfficiencyRisk",
  "Market Volatility Risk": "marketVolatilityRisk",
  "Regulatory Pressure Risk": "regulatoryPressureRisk",
  "Capital Commitment Rigidity Risk": "capitalCommitmentRigidityRisk",
  "Leverage Level Risk": "leverageLevelRisk",
};

export function resolveConfiguredScenarioSource(
  selection: ConfiguredScenarioSelection,
  profile?: ExecutableDomainProfile
): ResolvedConfiguredScenarioSource {
  const resolved = resolveActionDrivenState(
    structuredClone(selection.baseRiskState),
    [...selection.selectedActions],
    profile
  );
  return Object.freeze({
    initialRiskState: Object.freeze(structuredClone(resolved.riskState)),
    initialDriverScores: Object.freeze(structuredClone(resolved.driverScores)),
  });
}

export function prepareOrdinaryConfiguredRunSource(
  selection: ConfiguredRunSelection
): CleanRunSourceSnapshot {
  const profile = resolveExecutableDomainProfile(
    getExecutableProfileIdForDomain(selection.domainId),
    selection.domainId
  );
  const scenarioA = resolveConfiguredScenarioSource(selection.scenarioA, profile);
  const scenarioB = resolveConfiguredScenarioSource(selection.scenarioB, profile);
  return prepareExplicitConfiguredRunSource({
    domainId: selection.domainId,
    scenarioA,
    scenarioB,
    baselineRiskState: selection.baselineRiskState,
  });
}

export function prepareExplicitConfiguredRunSource(input: Readonly<{
  domainId: DomainKey;
  scenarioA: ExplicitOneRunScenarioSource;
  scenarioB: ExplicitOneRunScenarioSource;
  baselineRiskState: RiskState;
}>): CleanRunSourceSnapshot {
  return createCleanRunSourceSnapshot({
    domainId: input.domainId,
    profileId: getExecutableProfileIdForDomain(input.domainId),
    scenarioA: {
      baseRiskState: input.scenarioA.initialRiskState,
      baseDriverScores: input.scenarioA.initialDriverScores,
    },
    scenarioB: {
      baseRiskState: input.scenarioB.initialRiskState,
      baseDriverScores: input.scenarioB.initialDriverScores,
    },
    baseline: { baseRiskState: input.baselineRiskState },
  });
}

export function applyPreviewChangesToRiskState(
  riskState: RiskState,
  changes: readonly ScenarioChange[]
): RiskState {
  const next = structuredClone(riskState);
  for (const change of changes) {
    const driver = PREVIEW_PARAMETER_TO_DRIVER[change.parameter];
    if (driver) next[driver] = change.to as RiskLevel;
  }
  return next;
}

export function prepareScenarioPreviewRun(input: Readonly<{
  configuredSelection: ConfiguredRunSelection;
  editableScenario: "A" | "B";
  changesA: readonly ScenarioChange[];
  changesB: readonly ScenarioChange[];
}>): ScenarioPreviewPreparation {
  const profile = resolveExecutableDomainProfile(
    getExecutableProfileIdForDomain(input.configuredSelection.domainId),
    input.configuredSelection.domainId
  );
  const cleanScenarioA = resolveConfiguredScenarioSource(
    input.configuredSelection.scenarioA,
    profile
  );
  const cleanScenarioB = resolveConfiguredScenarioSource(
    input.configuredSelection.scenarioB,
    profile
  );
  const previewRiskStateA = applyPreviewChangesToRiskState(
    cleanScenarioA.initialRiskState,
    input.changesA
  );
  const previewRiskStateB = applyPreviewChangesToRiskState(
    cleanScenarioB.initialRiskState,
    input.changesB
  );

  const persistedBaseRiskStateA =
    input.editableScenario === "A"
      ? applyPreviewChangesToRiskState(
          input.configuredSelection.scenarioA.baseRiskState,
          input.changesA
        )
      : structuredClone(input.configuredSelection.scenarioA.baseRiskState);
  const persistedBaseRiskStateB =
    input.editableScenario === "B"
      ? applyPreviewChangesToRiskState(
          input.configuredSelection.scenarioB.baseRiskState,
          input.changesB
        )
      : structuredClone(input.configuredSelection.scenarioB.baseRiskState);
  const persistedScenarioA = resolveConfiguredScenarioSource({
    baseRiskState: persistedBaseRiskStateA,
    selectedActions: input.configuredSelection.scenarioA.selectedActions,
  }, profile);
  const persistedScenarioB = resolveConfiguredScenarioSource({
    baseRiskState: persistedBaseRiskStateB,
    selectedActions: input.configuredSelection.scenarioB.selectedActions,
  }, profile);

  return Object.freeze({
    runSource: prepareExplicitConfiguredRunSource({
      domainId: input.configuredSelection.domainId,
      scenarioA: {
        initialRiskState: previewRiskStateA,
        initialDriverScores: cleanScenarioA.initialDriverScores,
      },
      scenarioB: {
        initialRiskState: previewRiskStateB,
        initialDriverScores: cleanScenarioB.initialDriverScores,
      },
      baselineRiskState: input.configuredSelection.baselineRiskState,
    }),
    persistedBaseRiskStateA: Object.freeze(
      structuredClone(persistedBaseRiskStateA)
    ),
    persistedBaseRiskStateB: Object.freeze(
      structuredClone(persistedBaseRiskStateB)
    ),
    persistedScenarioA,
    persistedScenarioB,
  });
}
