import type { EngineBaselineInputFixtureV1 } from "../engineOutputProjectionV1";
import { runEngineBaselineFixtureV1 } from "../engineOutputProjectionV1";
import { RealEstateEngine, type DriverDeltas, type EngineState } from "../../../RealEstateEngine";
import { ACTION_EFFECTS } from "../../../actionEffects";
import { getExecutableIdentity, resolveExecutableDomainProfile } from "../../../executableDomainProfile";
import { compareScenarioTrajectories, createScenarioAnalysisResult } from "../../cascadeAnalysisProjection";
import type { NormalizedActionAdmissionProvenanceV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import { hashLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import { ACTION_ADMISSION_DECLARATION_PREFIX, admitActionOccurrenceV1, admittedActionProvenanceV1, projectNativeSourceCaseV1, type ActionOccurrenceV1, type AdmittedActionOccurrenceV1 } from "./buildLegacyCompatibilityExecutionPlanV1";
import {
  compareLegacyToCompatibilityEffective,
  comparatorANotApplicableV1,
  compareActualAdmissionV1,
  compareCompatibilityNormalizedLegacyEngineCoreV1,
  deriveActionAdmissionAttributionV1,
  collectDiscrepancies,
  detachedFrozen,
  hashDifferentialReportContent,
  type DifferentialObservationV1,
  type DomainModelDifferentialReportV1,
  type M1CHashIdentity,
  type ActualRuntimeActionRejectionV1,
  type ActionAdmissionAttributionResultV1,
  type CompatibilityDeclarationCounterfactualV1,
  type CompatibilityNormalizedLegacyEngineCoreResultV1,
  type FullCompatibilityComparatorV1,
} from "./differentialExecutionV1";
import {
  executeCompatibilityEffectiveProjectionV1,
  executeAdmittedCompatibilityActionV1,
  executeDerivedRegistryCounterfactualsV1,
  executeDerivedPropagationCounterfactualV1,
  executePureNativeProjectionV1,
  type NativeExecutionResultV1,
} from "./executeVerifiedNativeProjectionV1";
import { comparePureNativeToCompatibilityEffective } from "./runCompatibilityCounterfactualV1";

function hashes(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1): M1CHashIdentity {
  return {
    sourceSemanticPayloadHash: envelope.source.semanticPayloadHash,
    projectedSemanticPayloadHash: envelope.projection.semanticPayloadHash,
    compatibilityDeclarationsHash: envelope.compatibility.declarationsHash,
    envelopeHash: hashLegacyProfileProjectionEnvelopeV1(envelope),
  };
}

export type ActionAdmissionDifferentialReportV1 = Readonly<{
  version: "action-admission-differential-report-v1";
  actualRuntimeRejection: ActualRuntimeActionRejectionV1;
  normalizedEngineCoreOutput: unknown;
  compatibilityEffectiveOutput: unknown;
  normalizedEngineCoreProvenance: NormalizedActionAdmissionProvenanceV1;
  compatibilityEffectiveProvenance: NormalizedActionAdmissionProvenanceV1;
  comparatorA: ReturnType<typeof comparatorANotApplicableV1>;
  engineCoreComparator: CompatibilityNormalizedLegacyEngineCoreResultV1;
  admissionComparator: ReturnType<typeof compareActualAdmissionV1>;
  actionAdmissionAttribution: ActionAdmissionAttributionResultV1;
  actionCounterfactual: CompatibilityDeclarationCounterfactualV1;
  comparatorB: FullCompatibilityComparatorV1;
}>;

function runLegacyScenarioWithRetainedEffects(input: Readonly<{
  fixture: EngineBaselineInputFixtureV1;
  admitted: AdmittedActionOccurrenceV1;
  applyOccurrence: boolean;
}>) {
  const profile = resolveExecutableDomainProfile(input.fixture.profileId, input.fixture.domainId);
  const engine = new RealEstateEngine(structuredClone(input.fixture.initialState.riskState), structuredClone(input.fixture.initialState.driverScores), profile);
  const trajectory: EngineState[] = [];
  for (let step = 1; step <= input.fixture.horizon; step += 1) {
    if (input.applyOccurrence && step === input.admitted.occurrence.scheduledStep) {
      const deltas: DriverDeltas = {};
      for (const effect of input.admitted.entry.retainedEffects) Reflect.set(deltas, effect.sourceDriverId, effect.delta);
      engine.applyDriverDeltas(deltas);
    }
    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }
  return createScenarioAnalysisResult(trajectory);
}

function compatibilityNormalizedLegacyEngineCoreOutput(input: Readonly<{ fixture: EngineBaselineInputFixtureV1; admitted: AdmittedActionOccurrenceV1 }>) {
  const scenarioA = runLegacyScenarioWithRetainedEffects({ ...input, applyOccurrence: true });
  const scenarioB = runLegacyScenarioWithRetainedEffects({ ...input, applyOccurrence: false });
  const baseline = runLegacyScenarioWithRetainedEffects({ ...input, applyOccurrence: false });
  const scheduled = { actionId: input.admitted.entry.sourceActionId, executionStep: input.admitted.occurrence.scheduledStep };
  return detachedFrozen({
    schemaVersion: "canonical-engine-output-projection-v1" as const,
    fixtureId: `${input.fixture.fixtureId}:${scheduled.actionId}:step-${scheduled.executionStep}`,
    executionSurface: "compatibility-normalized-legacy-engine-core-reconstruction-v1" as const,
    profileIdentity: getExecutableIdentity(resolveExecutableDomainProfile(input.fixture.profileId, input.fixture.domainId)),
    horizon: input.fixture.horizon,
    plannedSchedules: { A: [scheduled], B: [] },
    scenarioA,
    scenarioB,
    baseline,
    comparison: compareScenarioTrajectories(scenarioA, scenarioB),
    executionProvenance: input.admitted.entry.retainedEffects.length === 0 ? [] : [{
      scenario: "scenarioA" as const,
      actionId: scheduled.actionId,
      scheduledStep: scheduled.executionStep,
      actualExecutionStep: scheduled.executionStep,
      appliedDriverDeltas: Object.fromEntries(input.admitted.entry.retainedEffects.map((effect) => [effect.sourceDriverId, effect.delta])),
    }],
  });
}

function actionOutputSurface(value: unknown): unknown {
  const surface = value as Readonly<{ scenarioA: unknown; scenarioB: unknown; baseline: unknown; comparison: unknown }>;
  return detachedFrozen({ scenarioA: surface.scenarioA, scenarioB: surface.scenarioB, baseline: surface.baseline, comparison: surface.comparison });
}

function actualRuntimeRejection(input: Readonly<{ fixture: EngineBaselineInputFixtureV1; occurrence: ActionOccurrenceV1; unsupported: readonly string[] }>): ActualRuntimeActionRejectionV1 {
  const scheduled = { actionId: input.occurrence.sourceActionId, executionStep: input.occurrence.scheduledStep };
  const runtimeInput = detachedFrozen({ ...input.fixture, kind: "stressed-scheduled" as const, schedules: { A: [scheduled], B: [] } });
  const before = structuredClone(runtimeInput);
  let message = "";
  try { runEngineBaselineFixtureV1(runtimeInput); } catch (error) { message = error instanceof Error ? error.message : ""; }
  const expectedMessage = `Scheduled action ${scheduled.actionId} has unsupported drivers: ${[...input.unsupported].sort().join(", ")}.`;
  if (message !== expectedMessage) throw new Error(`M1D actual runtime rejection mismatch: ${message || "no rejection"}`);
  if (collectDiscrepancies(before, runtimeInput, "adapter-error").length > 0) throw new Error("M1D actual runtime rejection mutated input");
  return detachedFrozen({
    version: "actual-runtime-action-rejection-v1" as const,
    outcome: "rejected" as const,
    profileId: input.occurrence.profileId,
    scenario: input.occurrence.scenario,
    sourceActionId: scheduled.actionId,
    scheduledStep: scheduled.executionStep,
    canonicalSourceEffects: input.occurrence.canonicalSourceEffects,
    unsupportedSourceDriverIds: [...input.unsupported].sort(),
    failureStage: "normalize-scheduled-actions-before-step-v1" as const,
    failureReason: "canonical-effect-driver-not-applicable-v1" as const,
    engineOutput: "absent" as const,
    stateMutation: false as const,
    canonicalExecutionProvenance: "absent" as const,
  });
}

export function runActionAdmissionDifferentialV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  fixture: EngineBaselineInputFixtureV1;
  sourceActionId: string;
  scheduledStep: number;
}>): ActionAdmissionDifferentialReportV1 {
  const entryIndex = input.envelope.compatibility.actionAdmission.entries.findIndex((entry) => entry.sourceActionId === input.sourceActionId);
  if (entryIndex < 0) throw new Error("M1D action case requires a verified admission entry");
  const entry = input.envelope.compatibility.actionAdmission.entries[entryIndex];
  const runtimeEffects: unknown = Reflect.get(ACTION_EFFECTS, input.sourceActionId);
  if (!runtimeEffects || typeof runtimeEffects !== "object" || Array.isArray(runtimeEffects)) throw new Error("M1D action case is absent from the actual runtime catalog");
  const canonicalSourceEffects = Object.entries(runtimeEffects).map(([sourceDriverId, delta]) => ({ sourceDriverId, delta })).sort((a, b) => a.sourceDriverId < b.sourceDriverId ? -1 : a.sourceDriverId > b.sourceDriverId ? 1 : 0);
  const occurrence: ActionOccurrenceV1 = detachedFrozen({ profileId: input.fixture.profileId, scenario: "scenarioA" as const, sourceActionId: input.sourceActionId, scheduledStep: input.scheduledStep, canonicalSourceEffects });
  const normalizedAdmission = admitActionOccurrenceV1({ envelope: input.envelope, occurrence, horizon: input.fixture.horizon, duplicate: false, observationKind: "compatibility-normalized-reference" });
  const effectiveAdmission = admitActionOccurrenceV1({ envelope: input.envelope, occurrence, horizon: input.fixture.horizon, duplicate: false, observationKind: "compatibility-effective-native" });
  if ("outcome" in normalizedAdmission || "outcome" in effectiveAdmission) throw new Error("M1D verified action admission unexpectedly rejected");
  if (normalizedAdmission.declarationPath !== `${ACTION_ADMISSION_DECLARATION_PREFIX}${entryIndex}`) throw new Error("M1D declaration path mismatch");
  const normalizedEngineCoreOutput = compatibilityNormalizedLegacyEngineCoreOutput({ fixture: input.fixture, admitted: normalizedAdmission });
  const sourceCase = projectNativeSourceCaseV1(input.envelope, input.fixture);
  const effective = executeAdmittedCompatibilityActionV1({ envelope: input.envelope, sourceCase, admitted: effectiveAdmission });
  const compatibilityEffectiveOutput = effective.comparisonSurface;
  const noActionEffective = executeCompatibilityEffectiveProjectionV1({ envelope: input.envelope, sourceCase });
  const effectiveSurface = actionOutputSurface(compatibilityEffectiveOutput);
  const noActionSurface = actionOutputSurface(noActionEffective.comparisonSurface);
  const { attribution: actionAdmissionAttribution, counterfactual: actionCounterfactual } = deriveActionAdmissionAttributionV1({
    declarationPath: effectiveAdmission.declarationPath,
    withoutDeclaration: noActionSurface,
    withDeclaration: effectiveSurface,
  });
  const baseline = runLegacyScenarioWithRetainedEffects({ fixture: input.fixture, admitted: normalizedAdmission, applyOccurrence: false });
  const outputChanged = collectDiscrepancies(baseline, (normalizedEngineCoreOutput as { scenarioA: unknown }).scenarioA, "compatibility-rule").length > 0;
  const actual = actualRuntimeRejection({ fixture: input.fixture, occurrence, unsupported: entry.ignoredEffects.map((effect) => effect.sourceDriverId) });
  const pureNative = observation(input.envelope, input.fixture, "pure-native", executePureNativeProjectionV1({ contract: input.envelope.projection.contract, sourceCase }));
  const compatibilityEffective = observation(input.envelope, input.fixture, "compatibility-effective", { ...effective, comparisonSurface: effectiveSurface });
  const counterfactuals = [
    executeDerivedPropagationCounterfactualV1({ envelope: input.envelope, sourceCase }),
    ...executeDerivedRegistryCounterfactualsV1({ envelope: input.envelope, sourceCase }),
  ].map((result) => observation(input.envelope, input.fixture, "compatibility-counterfactual", { ...result, comparisonSurface: actionOutputSurface(result.comparisonSurface) }))
    .filter((candidate) => collectDiscrepancies(actionOutputSurface(pureNative.comparisonSurface), candidate.comparisonSurface, "compatibility-rule").length > 0);
  const scopedPureNative = detachedFrozen({ ...pureNative, comparisonSurface: actionOutputSurface(pureNative.comparisonSurface) });
  const comparatorB = comparePureNativeToCompatibilityEffective({
    envelope: input.envelope,
    sourceCase,
    pureNative: scopedPureNative,
    compatibilityEffective,
    counterfactuals,
    actionAttribution: actionAdmissionAttribution,
    actionOccurrence: { sourceActionId: occurrence.sourceActionId, scheduledStep: occurrence.scheduledStep },
  });
  return detachedFrozen({
    version: "action-admission-differential-report-v1" as const,
    actualRuntimeRejection: actual,
    normalizedEngineCoreOutput,
    compatibilityEffectiveOutput,
    normalizedEngineCoreProvenance: admittedActionProvenanceV1({ admitted: normalizedAdmission, observationKind: "compatibility-normalized-reference", outputChanged }),
    compatibilityEffectiveProvenance: admittedActionProvenanceV1({ admitted: effectiveAdmission, observationKind: "compatibility-effective-native", outputChanged }),
    comparatorA: comparatorANotApplicableV1(),
    engineCoreComparator: compareCompatibilityNormalizedLegacyEngineCoreV1(actionOutputSurface(normalizedEngineCoreOutput), effectiveSurface, input.envelope.compatibility.declarationsHash),
    admissionComparator: compareActualAdmissionV1({ actual, expectedProfileId: occurrence.profileId, expectedActionId: occurrence.sourceActionId, expectedStep: occurrence.scheduledStep, expectedEffects: occurrence.canonicalSourceEffects, expectedUnsupported: actual.unsupportedSourceDriverIds, actualRuntimeExpectation: input.envelope.compatibility.actionAdmission.actualRuntimeExpectation }),
    actionAdmissionAttribution,
    actionCounterfactual,
    comparatorB,
  });
}

function observation(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  fixture: EngineBaselineInputFixtureV1,
  kind: DifferentialObservationV1["kind"],
  result: NativeExecutionResultV1
): DifferentialObservationV1 {
  return detachedFrozen({
    version: "domain-model-differential-observation-v1" as const,
    kind,
    profileId: fixture.profileId,
    caseId: fixture.fixtureId,
    scenario: "combined" as const,
    hashes: hashes(envelope),
    activatedDeclarationPaths: result.activatedDeclarationPaths,
    compatibilityLedger: result.compatibilityLedger,
    nativeStateHasCompatibilityProperties: false as const,
    comparisonSurface: result.comparisonSurface,
  });
}

function legacyObservation(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  fixture: EngineBaselineInputFixtureV1
): DifferentialObservationV1 {
  const output = runEngineBaselineFixtureV1(fixture);
  return detachedFrozen({
    version: "domain-model-differential-observation-v1" as const,
    kind: "legacy-reference" as const,
    profileId: fixture.profileId,
    caseId: fixture.fixtureId,
    scenario: "combined" as const,
    hashes: hashes(envelope),
    activatedDeclarationPaths: [],
    compatibilityLedger: [],
    nativeStateHasCompatibilityProperties: false as const,
    comparisonSurface: structuredClone(output),
  });
}

export function runDomainModelDifferentialV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  fixture: EngineBaselineInputFixtureV1;
}>): DomainModelDifferentialReportV1 {
  const sourceCase = projectNativeSourceCaseV1(input.envelope, input.fixture);
  const legacyReference = legacyObservation(input.envelope, input.fixture);
  const pureNative = observation(input.envelope, input.fixture, "pure-native", executePureNativeProjectionV1({
    contract: input.envelope.projection.contract,
    sourceCase,
  }));
  const compatibilityEffectiveCandidate = observation(
    input.envelope,
    input.fixture,
    "compatibility-effective",
    executeCompatibilityEffectiveProjectionV1({ envelope: input.envelope, sourceCase })
  );
  const counterfactualResults = [
    executeDerivedPropagationCounterfactualV1({ envelope: input.envelope, sourceCase }),
    ...executeDerivedRegistryCounterfactualsV1({ envelope: input.envelope, sourceCase }),
  ];
  const counterfactuals = counterfactualResults
    .map((result) => observation(input.envelope, input.fixture, "compatibility-counterfactual", result))
    .filter((candidate) => collectDiscrepancies(pureNative.comparisonSurface, candidate.comparisonSurface, "compatibility-rule").length > 0);
  const comparatorA = compareLegacyToCompatibilityEffective(legacyReference, compatibilityEffectiveCandidate);
  const comparatorB = comparePureNativeToCompatibilityEffective({ envelope: input.envelope, sourceCase, pureNative, compatibilityEffective: compatibilityEffectiveCandidate, counterfactuals });
  const content = {
    version: "domain-model-differential-report-v1" as const,
    legacyReference,
    pureNative,
    compatibilityEffectiveCandidate,
    counterfactuals,
    comparatorA,
    comparatorB,
  };
  return detachedFrozen({ ...content, reportHash: hashDifferentialReportContent(content) });
}
