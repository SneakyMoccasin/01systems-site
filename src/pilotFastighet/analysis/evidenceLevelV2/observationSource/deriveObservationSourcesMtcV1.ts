import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { layer1ExecutionIdentityMtcV1 } from "../execution/executionIdentityMtcV1";
import type { Layer1ExecutionOutcomeMtcV1 } from "../execution/executionMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { scenarioSemanticIdentityMtcV1 } from "../scenario/scenarioSemanticIdentityMtcV1";
import {
  observationSourceBindingsIdentityMtcV1,
  observationSourceEventIdentityMtcV1,
  observationSourceResultIdentityMtcV1,
} from "./observationSourceIdentityMtcV1";
import {
  OBSERVATION_SOURCE_EVENT_VERSION,
  OBSERVATION_SOURCE_RESULT_VERSION,
  type ObservationActivationCandidateMtcV1,
  type ObservationSourceBindingResultMtcV1,
  type ObservationSourceBindingsMtcV1,
  type ObservationSourceEventMtcV1,
} from "./observationSourceMtcV1";

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function event(
  semantic: Omit<ObservationSourceEventMtcV1, "sourceEventIdentity">,
): ObservationSourceEventMtcV1 {
  return freezeDeep({ ...semantic, sourceEventIdentity: observationSourceEventIdentityMtcV1(semantic) });
}

export function deriveObservationSourcesMtcV1(
  execution: Layer1ExecutionOutcomeMtcV1,
  scenario: PreparedScenarioMtcV1,
  contract: TwoLayerMtcContractV1,
  bindings: ObservationSourceBindingsMtcV1,
): ObservationSourceBindingResultMtcV1 {
  const scenarioIdentity = scenarioSemanticIdentityMtcV1(scenario);
  const contractIdentity = contractSemanticIdentityMtcV1(contract);
  if (scenario.semanticIdentity !== scenarioIdentity || execution.scenarioIdentity !== scenarioIdentity || bindings.scenarioIdentity !== scenarioIdentity) throw new TypeError("Scenario identity verification failed at observation-source boundary");
  if (scenario.domainContract.semanticIdentity !== contractIdentity || execution.contractIdentity !== contractIdentity || bindings.contractIdentity !== contractIdentity) throw new TypeError("Contract identity verification failed at observation-source boundary");
  if (execution.executionIdentity !== layer1ExecutionIdentityMtcV1(execution)) throw new TypeError("Layer 1 execution identity verification failed at observation-source boundary");
  if (bindings.semanticIdentity !== observationSourceBindingsIdentityMtcV1(bindings)) throw new TypeError("Source-binding identity verification failed");

  const declarations = new Map(scenario.initiatives.map((item) => [item.instanceId as string, item]));
  const sourceEvents: ObservationSourceEventMtcV1[] = [];
  for (const record of execution.history) {
    for (const admission of record.admissions) if (admission.status === "admitted") {
      const declaration = declarations.get(admission.instanceId)!;
      sourceEvents.push(event({
        sourceEventVersion: OBSERVATION_SOURCE_EVENT_VERSION,
        scenarioIdentity, contractIdentity, executionIdentity: execution.executionIdentity,
        committedBoundary: record.period, kind: "initiative-admitted",
        initiativeInstanceId: admission.instanceId, initiativeTypeId: declaration.initiativeTypeId,
        provenance: { source: "committed-period", periodOrBoundary: record.period, priorStateIdentity: record.priorStateIdentity, resultingStateIdentity: record.resultingStateIdentity, transition: "pending-to-active" },
      }));
    }
    for (const instanceId of record.completions) {
      const declaration = declarations.get(instanceId)!;
      sourceEvents.push(event({
        sourceEventVersion: OBSERVATION_SOURCE_EVENT_VERSION,
        scenarioIdentity, contractIdentity, executionIdentity: execution.executionIdentity,
        committedBoundary: record.period, kind: "initiative-completed",
        initiativeInstanceId: instanceId, initiativeTypeId: declaration.initiativeTypeId,
        provenance: { source: "committed-period", periodOrBoundary: record.period, priorStateIdentity: record.priorStateIdentity, resultingStateIdentity: record.resultingStateIdentity, transition: "active-to-completed" },
      }));
    }
  }
  if (execution.status === "completed-horizon") for (const instanceId of execution.terminalBoundary.completions) {
    const declaration = declarations.get(instanceId)!;
    sourceEvents.push(event({
      sourceEventVersion: OBSERVATION_SOURCE_EVENT_VERSION,
      scenarioIdentity, contractIdentity, executionIdentity: execution.executionIdentity,
      committedBoundary: execution.terminalBoundary.boundary, kind: "initiative-completed",
      initiativeInstanceId: instanceId, initiativeTypeId: declaration.initiativeTypeId,
      provenance: { source: "terminal-boundary", periodOrBoundary: execution.terminalBoundary.boundary, priorStateIdentity: execution.terminalBoundary.priorStateIdentity, resultingStateIdentity: execution.terminalBoundary.resultingStateIdentity, transition: "active-to-completed" },
    }));
  }
  if (sourceEvents.length > CONTRACT_LIMITS_MTC_V1.maxSourceEvents) throw new RangeError(`Source-event limit ${CONTRACT_LIMITS_MTC_V1.maxSourceEvents} exceeded`);
  sourceEvents.sort((a, b) => a.committedBoundary - b.committedBoundary || compareCanonicalStringsMtcV1(a.kind, b.kind) || compareCanonicalStringsMtcV1(a.initiativeInstanceId, b.initiativeInstanceId) || compareCanonicalStringsMtcV1(a.sourceEventIdentity, b.sourceEventIdentity));
  const eventIdentities = new Set<string>();
  for (const sourceEvent of sourceEvents) {
    if (eventIdentities.has(sourceEvent.sourceEventIdentity)) throw new TypeError("Duplicate committed observation source event");
    eventIdentities.add(sourceEvent.sourceEventIdentity);
  }

  const bindingBySource = new Map(bindings.bindings.map((binding) => [`${binding.eventKind}\0${binding.initiativeInstanceId}`, binding]));
  const activationCandidates: ObservationActivationCandidateMtcV1[] = [];
  const unmappedSourceEventIdentities: string[] = [];
  for (const sourceEvent of sourceEvents) {
    const binding = bindingBySource.get(`${sourceEvent.kind}\0${sourceEvent.initiativeInstanceId}`);
    if (!binding) { unmappedSourceEventIdentities.push(sourceEvent.sourceEventIdentity); continue; }
    activationCandidates.push(freezeDeep({
      bindingId: binding.bindingId,
      sourceEventIdentity: sourceEvent.sourceEventIdentity,
      targetNodeId: binding.targetNodeId,
      provenance: { sourceEventIdentity: sourceEvent.sourceEventIdentity, bindingIdentity: bindings.semanticIdentity, observationNodeId: binding.targetNodeId },
    }));
  }
  activationCandidates.sort((a, b) => compareCanonicalStringsMtcV1(a.sourceEventIdentity, b.sourceEventIdentity) || compareCanonicalStringsMtcV1(a.bindingId, b.bindingId));
  unmappedSourceEventIdentities.sort(compareCanonicalStringsMtcV1);
  const base = {
    resultVersion: OBSERVATION_SOURCE_RESULT_VERSION,
    scenarioIdentity, contractIdentity, executionIdentity: execution.executionIdentity,
    bindingIdentity: bindings.semanticIdentity,
    horizon: structuredClone(scenario.horizon),
    sourceEvents: freezeDeep(sourceEvents), activationCandidates: freezeDeep(activationCandidates),
    unmappedSourceEventIdentities: freezeDeep(unmappedSourceEventIdentities),
  };
  return freezeDeep({ ...base, resultIdentity: observationSourceResultIdentityMtcV1(base) });
}
