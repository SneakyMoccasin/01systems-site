import type { EngineBaselineInputFixtureV1 } from "../engineOutputProjectionV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import type { AdmittedActionProvenanceV1, NormalizedActionAdmissionProvenanceV1, RejectedActionFailureV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import type { SemanticHashVerifiedDomainModelContractV1 } from "../domainModelContractV1/contractV1";
import { compareCodeUnits, detachedFrozen } from "./differentialExecutionV1";

export const PROPAGATION_DECLARATION_PATH = "/compatibility/propagation";
export const REGISTRY_DECLARATION_PREFIX = "/compatibility/legacyRegistryProjection/entries/";
export const ACTION_ADMISSION_DECLARATION_PREFIX = "/compatibility/actionAdmission/entries/";

export type ActionOccurrenceV1 = Readonly<{
  profileId: string;
  scenario: "scenarioA" | "scenarioB";
  sourceActionId: string;
  scheduledStep: number;
  canonicalSourceEffects: readonly Readonly<{ sourceDriverId: string; delta: number }>[];
}>;

export type AdmittedActionOccurrenceV1 = Readonly<{
  occurrence: ActionOccurrenceV1;
  declarationPath: string;
  entry: HashVerifiedLegacyProfileProjectionEnvelopeV1["compatibility"]["actionAdmission"]["entries"][number];
}>;

export type NativeSourceCaseProjectionV1 = Readonly<{
  version: "native-source-case-projection-v1";
  fixtureId: string;
  profileId: string;
  domainId: string;
  horizon: number;
  executionProfileIdentity: Readonly<{
    domainId: string;
    profileId: string;
    modelVersion: string;
    calibrationVersion: string;
  }>;
  schedules: Readonly<{
    A: readonly Readonly<{ actionId: string; executionStep: number }>[];
    B: readonly Readonly<{ actionId: string; executionStep: number }>[];
  }>;
  initialState: Readonly<Record<string, Readonly<{ levelId: string; score: number }>>>;
  outputSourceIdByNativeId: Readonly<Record<string, string>>;
}>;

export type OrderedPropagationOccurrenceV1 = Readonly<{
  occurrencePosition: number;
  edgeId: string;
  sourceId: string;
  targetId: string;
  sourceLegacyId: string;
  targetLegacyId: string;
  sourceKind: "native" | "compatibility";
  triggerLevelIds: readonly string[];
  propagatedLevelId: string;
}>;

export type RegistryOverlayEntryV1 = Readonly<{
  declarationPath: string;
  sourceRegistryKey: string;
  compatibilityEntryId: string;
  legacyType: string;
  lifecycle: "INACTIVE";
  lastUpdatedStep: 0;
}>;

export type CompatibilityExecutionPlanV1 = Readonly<{
  profileId: string;
  declarationPaths: readonly string[];
  orderedPropagation: readonly OrderedPropagationOccurrenceV1[];
  implicitNode: null | Readonly<{
    sourceNodeId: string;
    adapterLocalNodeId: string;
    targetMissingDefaultLevelId: string;
  }>;
  registryEntries: readonly RegistryOverlayEntryV1[];
}>;

function fail(reason: string): never {
  throw new Error(`M1D compatibility plan rejected: ${reason}.`);
}

function rejected(
  observationKind: "compatibility-normalized-reference" | "compatibility-effective-native",
  occurrence: ActionOccurrenceV1,
  failure: RejectedActionFailureV1,
  entry: AdmittedActionOccurrenceV1 | null
): NormalizedActionAdmissionProvenanceV1 {
  return detachedFrozen({
    version: "normalized-action-admission-provenance-v1" as const,
    outcome: "rejected" as const,
    observationKind,
    profileId: occurrence.profileId,
    scenario: occurrence.scenario,
    entryId: entry?.entry.entryId ?? null,
    sourceActionId: occurrence.sourceActionId,
    declarationPath: entry?.declarationPath ?? null,
    scheduledStep: occurrence.scheduledStep,
    canonicalSourceEffects: [...occurrence.canonicalSourceEffects].sort((a, b) => compareCodeUnits(a.sourceDriverId, b.sourceDriverId)),
    ...failure,
    engineOutput: "absent" as const,
    stateMutation: false as const,
    canonicalExecutionProvenance: "absent" as const,
  });
}

export function admitActionOccurrenceV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  occurrence: ActionOccurrenceV1;
  horizon: number;
  duplicate: boolean;
  observationKind: "compatibility-normalized-reference" | "compatibility-effective-native";
}>): AdmittedActionOccurrenceV1 | NormalizedActionAdmissionProvenanceV1 {
  const { envelope, occurrence } = input;
  if (occurrence.profileId !== envelope.source.identity.profileId) return rejected(input.observationKind, occurrence, { failureStage: "profile-binding", failureReason: "wrong-profile" }, null);
  const index = envelope.compatibility.actionAdmission.entries.findIndex((entry) => entry.sourceActionId === occurrence.sourceActionId);
  if (index < 0) return rejected(input.observationKind, occurrence, { failureStage: "action-admission", failureReason: "undeclared-action" }, null);
  const admitted = detachedFrozen({ occurrence, declarationPath: `${ACTION_ADMISSION_DECLARATION_PREFIX}${index}`, entry: envelope.compatibility.actionAdmission.entries[index] });
  if (input.duplicate) return rejected(input.observationKind, occurrence, { failureStage: "schedule-validation", failureReason: "duplicate-action" }, admitted);
  if (!Number.isInteger(occurrence.scheduledStep) || occurrence.scheduledStep < 1 || occurrence.scheduledStep > input.horizon) return rejected(input.observationKind, occurrence, { failureStage: "schedule-validation", failureReason: "step-outside-horizon" }, admitted);
  const actual = [...occurrence.canonicalSourceEffects].sort((a, b) => compareCodeUnits(a.sourceDriverId, b.sourceDriverId));
  const ids = actual.map((effect) => effect.sourceDriverId);
  if (new Set(ids).size !== ids.length) return rejected(input.observationKind, occurrence, { failureStage: "effect-partition", failureReason: "duplicate-effect" }, admitted);
  const declared = [...admitted.entry.retainedEffects.map(({ sourceDriverId, delta }) => ({ sourceDriverId, delta })), ...admitted.entry.ignoredEffects.map(({ sourceDriverId, delta }) => ({ sourceDriverId, delta }))].sort((a, b) => compareCodeUnits(a.sourceDriverId, b.sourceDriverId));
  const actualById = new Map(actual.map((effect) => [effect.sourceDriverId, effect.delta]));
  const declaredById = new Map(declared.map((effect) => [effect.sourceDriverId, effect.delta]));
  if (actual.some((effect) => !declaredById.has(effect.sourceDriverId))) return rejected(input.observationKind, occurrence, { failureStage: "effect-partition", failureReason: "extra-effect" }, admitted);
  if (declared.some((effect) => !actualById.has(effect.sourceDriverId))) return rejected(input.observationKind, occurrence, { failureStage: "effect-partition", failureReason: "missing-effect" }, admitted);
  if (actual.some((effect) => declaredById.get(effect.sourceDriverId) !== effect.delta)) return rejected(input.observationKind, occurrence, { failureStage: "effect-partition", failureReason: "source-effect-inventory-mismatch" }, admitted);
  const mappings = new Map(envelope.compatibility.driverIdMappings.map((mapping) => [mapping.sourceDriverId, mapping.projectedDriverId]));
  if (admitted.entry.retainedEffects.some((effect) => mappings.get(effect.sourceDriverId) !== effect.projectedDriverId)) return rejected(input.observationKind, occurrence, { failureStage: "effect-partition", failureReason: "mapping-mismatch" }, admitted);
  return admitted;
}

export function admittedActionProvenanceV1(input: Readonly<{
  admitted: AdmittedActionOccurrenceV1;
  observationKind: AdmittedActionProvenanceV1["observationKind"];
  outputChanged: boolean;
}>): AdmittedActionProvenanceV1 {
  const { admitted } = input;
  return detachedFrozen({
    version: "normalized-action-admission-provenance-v1" as const,
    outcome: "admitted" as const,
    observationKind: input.observationKind,
    profileId: admitted.occurrence.profileId,
    scenario: admitted.occurrence.scenario,
    entryId: admitted.entry.entryId,
    sourceActionId: admitted.occurrence.sourceActionId,
    declarationPath: admitted.declarationPath,
    scheduledStep: admitted.occurrence.scheduledStep,
    actualStep: admitted.occurrence.scheduledStep,
    retainedEffects: admitted.entry.retainedEffects,
    ignoredEffects: admitted.entry.ignoredEffects,
    outputDisposition: admitted.entry.outputDisposition,
    outputChanged: input.outputChanged,
  });
}

function assertExecutionSemantics(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1): void {
  const semantics = envelope.compatibility.propagation.executionSemantics;
  if (semantics.algorithm !== "ordered-monotone-raise-fixed-point-v1") fail("executionSemantics.algorithm");
  if (semantics.sourceReadPolicy !== "missing-source-does-not-trigger-v1") fail("executionSemantics.sourceReadPolicy");
  if (semantics.targetReadPolicy !== "missing-target-uses-declared-default-v1") fail("executionSemantics.targetReadPolicy");
  if (semantics.targetComparison !== "propagated-rank-strictly-greater-v1") fail("executionSemantics.targetComparison");
  if (semantics.writeVisibility !== "later-occurrences-same-iteration-v1") fail("executionSemantics.writeVisibility");
  if (semantics.iterationPolicy !== "repeat-from-start-until-no-raise-v1") fail("executionSemantics.iterationPolicy");
  if (semantics.eventPolicy.emission !== "on-target-level-change-v1") fail("executionSemantics.eventPolicy.emission");
  if (semantics.eventPolicy.step !== "iteration-plus-one-v1") fail("executionSemantics.eventPolicy.step");
  if (semantics.eventPolicy.delaySteps !== 1) fail("executionSemantics.eventPolicy.delaySteps");
  if (semantics.eventPolicy.duplicateSuppression !== "no-change-no-event-v1") fail("executionSemantics.eventPolicy.duplicateSuppression");
}

export function projectNativeSourceCaseV1(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  fixture: EngineBaselineInputFixtureV1
): NativeSourceCaseProjectionV1 {
  if (fixture.profileId !== envelope.source.identity.profileId || fixture.domainId !== envelope.source.identity.domainId) fail("source case identity mismatch");
  const drivers = new Map(envelope.projection.contract.semanticPayload.drivers.map((driver) => [driver.driverId, driver]));
  const sourceToNative = new Map<string, string>();
  const nativeToSource = new Map<string, string>();
  for (const mapping of envelope.compatibility.driverIdMappings) {
    if (sourceToNative.has(mapping.sourceDriverId)) fail("duplicate source driver mapping");
    if (nativeToSource.has(mapping.projectedDriverId)) fail("native identity collision");
    sourceToNative.set(mapping.sourceDriverId, mapping.projectedDriverId);
    nativeToSource.set(mapping.projectedDriverId, mapping.sourceDriverId);
  }
  if (drivers.size !== sourceToNative.size || drivers.size !== nativeToSource.size) fail("incomplete driver mapping");
  const initialState: Record<string, { levelId: string; score: number }> = {};
  const outputSourceIdByNativeId: Record<string, string> = {};
  for (const sourceId of Object.keys(fixture.initialState.riskState)) {
    const nativeId = sourceToNative.get(sourceId);
    if (!nativeId) fail(`missing source mapping ${sourceId}`);
    const driver = drivers.get(nativeId);
    if (!driver) fail(`mapped driver absent from contract ${nativeId}`);
    const levelId = fixture.initialState.riskState[sourceId].toLowerCase();
    const score = fixture.initialState.driverScores[sourceId];
    if (!driver.numericRange || score < driver.numericRange.minimum || score > driver.numericRange.maximum) fail(`source score outside native range ${sourceId}`);
    initialState[nativeId] = { levelId, score };
    outputSourceIdByNativeId[nativeId] = sourceId;
  }
  return detachedFrozen({
    version: "native-source-case-projection-v1" as const,
    fixtureId: fixture.fixtureId,
    profileId: envelope.projection.contract.identity.profileId,
    domainId: envelope.projection.contract.identity.domainId,
    horizon: fixture.horizon,
    executionProfileIdentity: {
      domainId: envelope.source.identity.domainId,
      profileId: envelope.source.identity.profileId,
      modelVersion: envelope.source.identity.modelVersion,
      calibrationVersion: envelope.source.identity.calibrationVersion,
    },
    schedules: structuredClone(fixture.schedules),
    initialState,
    outputSourceIdByNativeId,
  });
}

export function buildPureNativePropagationOrderV1(
  contract: SemanticHashVerifiedDomainModelContractV1,
  sourceCase: NativeSourceCaseProjectionV1
): readonly OrderedPropagationOccurrenceV1[] {
  return detachedFrozen([...contract.semanticPayload.propagation.edges]
    .sort((a, b) => compareCodeUnits(a.edgeId, b.edgeId))
    .map((edge, occurrencePosition) => ({
      occurrencePosition,
      edgeId: edge.edgeId,
      sourceId: edge.sourceDriverId,
      targetId: edge.targetDriverId,
      sourceLegacyId: sourceCase.outputSourceIdByNativeId[edge.sourceDriverId] ?? fail(`missing source projection ${edge.sourceDriverId}`),
      targetLegacyId: sourceCase.outputSourceIdByNativeId[edge.targetDriverId] ?? fail(`missing target projection ${edge.targetDriverId}`),
      sourceKind: "native" as const,
      triggerLevelIds: [...edge.triggerLevelIds],
      propagatedLevelId: edge.propagatedLevelId,
    })));
}

export function buildLegacyCompatibilityExecutionPlanV1(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1
): CompatibilityExecutionPlanV1 {
  assertExecutionSemantics(envelope);
  const profileId = envelope.source.identity.profileId;
  const propagation = envelope.compatibility.propagation;
  const nativeEdges = new Map(envelope.projection.contract.semanticPayload.propagation.edges.map((edge) => [edge.edgeId, edge]));
  const compatibilityEdges = new Map(propagation.compatibilityOnlyEdges.map((edge) => [edge.compatibilityEdgeId, edge]));
  if (nativeEdges.size !== envelope.projection.contract.semanticPayload.propagation.edges.length) fail("duplicate native edge identity");
  if (compatibilityEdges.size !== propagation.compatibilityOnlyEdges.length) fail("duplicate compatibility edge identity");
  const orderedPropagation = propagation.sourceEvaluationOrder.map((entry, occurrencePosition) => {
    const native = nativeEdges.get(entry.projectedOrCompatibilityEdgeId);
    const compatibility = compatibilityEdges.get(entry.projectedOrCompatibilityEdgeId);
    if ((native ? 1 : 0) + (compatibility ? 1 : 0) !== 1) fail("ambiguous or missing occurrence");
    if (native) return {
      occurrencePosition,
      edgeId: native.edgeId,
      sourceId: native.sourceDriverId,
      targetId: native.targetDriverId,
      sourceLegacyId: entry.sourceLegacyDriverId,
      targetLegacyId: entry.targetLegacyDriverId,
      sourceKind: "native" as const,
      triggerLevelIds: [...native.triggerLevelIds],
      propagatedLevelId: native.propagatedLevelId,
    };
    if (!compatibility || compatibility.occurrencePosition !== occurrencePosition) fail("shifted compatibility occurrence");
    if (compatibility.triggerPredicate !== "source-level-in-set-v1") fail("compatibility trigger predicate");
    return {
      occurrencePosition,
      edgeId: compatibility.compatibilityEdgeId,
      sourceId: compatibility.adapterLocalSourceDriverId,
      targetId: compatibility.adapterLocalTargetDriverId,
      sourceLegacyId: compatibility.sourceLegacySourceDriverId,
      targetLegacyId: compatibility.sourceLegacyTargetDriverId,
      sourceKind: "compatibility" as const,
      triggerLevelIds: [...compatibility.triggerLevelIds],
      propagatedLevelId: compatibility.projectedPropagatedLevelId,
    };
  });
  if (orderedPropagation.length !== nativeEdges.size + compatibilityEdges.size) fail("incomplete occurrence plan");
  if (new Set(orderedPropagation.map((entry) => entry.edgeId)).size !== orderedPropagation.length) fail("duplicate occurrence");
  const registry = envelope.compatibility.legacyRegistryProjection;
  if (registry.materialization.cadence !== "initial-and-every-completed-step-v1") fail("unsupported registry cadence");
  const sourceKeys = new Set<string>();
  const identities = new Set<string>();
  const registryEntries = registry.entries.map((entry, index) => {
    if (entry.sourceProfileId !== profileId) fail("wrong-profile registry entry");
    if (entry.sourceRegistryKey !== entry.legacyType) fail("registry key/type mismatch");
    if (sourceKeys.has(entry.sourceRegistryKey) || identities.has(entry.compatibilityEntryId)) fail("registry identity collision");
    if (entry.initialState.activatedAtStep !== "absent") fail("unsupported activatedAtStep");
    if (entry.transitionPolicy !== "no-public-transition-v1" || entry.executionPolicy !== "immutable-inert-output-placeholder-v1") fail("executable registry overlay");
    sourceKeys.add(entry.sourceRegistryKey);
    identities.add(entry.compatibilityEntryId);
    return {
      declarationPath: `${REGISTRY_DECLARATION_PREFIX}${index}`,
      sourceRegistryKey: entry.sourceRegistryKey,
      compatibilityEntryId: entry.compatibilityEntryId,
      legacyType: entry.legacyType,
      lifecycle: entry.initialState.lifecycle,
      lastUpdatedStep: entry.initialState.lastUpdatedStep,
    };
  });
  return detachedFrozen({
    profileId,
    declarationPaths: [PROPAGATION_DECLARATION_PATH, ...registryEntries.map((entry) => entry.declarationPath)].sort(compareCodeUnits),
    orderedPropagation,
    implicitNode: propagation.implicitNode === null ? null : {
      sourceNodeId: propagation.implicitNode.sourceNodeId,
      adapterLocalNodeId: propagation.implicitNode.adapterLocalNodeId,
      targetMissingDefaultLevelId: propagation.implicitNode.targetMissingDefaultLevelId,
    },
    registryEntries,
  });
}
