import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { ObservationEdgeMtcV1, TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { ObservationSourceBindingResultMtcV1, ObservationSourceBindingsMtcV1, ObservationSourceEventMtcV1 } from "../observationSource/observationSourceMtcV1";
import { observationSourceBindingsIdentityMtcV1, observationSourceEventIdentityMtcV1, observationSourceResultIdentityMtcV1 } from "../observationSource/observationSourceIdentityMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import { causalPathIdentityMtcV1, observationEvaluationIdentityMtcV1 } from "./observationEvaluationIdentityMtcV1";
import {
  OBSERVATION_EVALUATION_VERSION,
  type CausalPathMtcV1,
  type Layer2PeriodContextMtcV1,
  type NodeObservationMtcV1,
  type ObservationEvaluationBaseMtcV1,
  type ObservationEvaluationResultMtcV1,
  type ObservationPeriodRecordMtcV1,
} from "./observationEvaluationMtcV1";

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function pathKey(path: CausalPathMtcV1): string {
  return `${path.sourceEventIdentity}\0${path.nodeIds.join("\0")}\0${path.edgeIds.join("\0")}`;
}

function validateBoundary(
  sources: ObservationSourceBindingResultMtcV1,
  bindings: ObservationSourceBindingsMtcV1,
  contract: TwoLayerMtcContractV1,
  context: Layer2PeriodContextMtcV1,
): void {
  const contractIdentity = contractSemanticIdentityMtcV1(contract);
  if (contract.layer2.resultVocabularyVersion !== "affected-exposed-unchanged-unknown-v1") throw new TypeError("Unsupported Layer 2 result vocabulary");
  if (sources.contractIdentity !== contractIdentity || bindings.contractIdentity !== contractIdentity) throw new TypeError("Layer 2 contract identity mismatch");
  if (sources.scenarioIdentity !== context.scenarioIdentity || bindings.scenarioIdentity !== context.scenarioIdentity) throw new TypeError("Layer 2 scenario identity mismatch");
  if (sources.horizon.firstPeriod !== context.firstPeriod || sources.horizon.finalPeriod !== context.finalPeriod) throw new TypeError("Layer 2 period context does not match the scenario horizon");
  if (bindings.semanticIdentity !== observationSourceBindingsIdentityMtcV1(bindings)) throw new TypeError("Layer 2 binding identity verification failed");
  if (sources.bindingIdentity !== bindings.semanticIdentity || sources.resultIdentity !== observationSourceResultIdentityMtcV1(sources)) throw new TypeError("CP4A source result identity verification failed");
  if (!Number.isSafeInteger(context.firstPeriod) || !Number.isSafeInteger(context.finalPeriod) || context.firstPeriod < 0 || context.finalPeriod < context.firstPeriod) throw new TypeError("Invalid Layer 2 period context");

  const eventById = new Map<string, ObservationSourceEventMtcV1>();
  for (const event of sources.sourceEvents) {
    if (event.sourceEventIdentity !== observationSourceEventIdentityMtcV1(event)) throw new TypeError("CP4A source event identity verification failed");
    if (event.scenarioIdentity !== context.scenarioIdentity || event.contractIdentity !== contractIdentity || event.executionIdentity !== sources.executionIdentity) throw new TypeError("CP4A source event context mismatch");
    if (eventById.has(event.sourceEventIdentity)) throw new TypeError("Duplicate CP4A source event");
    if (event.committedBoundary < context.firstPeriod || event.committedBoundary > context.finalPeriod + 1) throw new TypeError("Source event lies outside Layer 2 period context");
    eventById.set(event.sourceEventIdentity, event);
  }
  const bindingById = new Map(bindings.bindings.map((binding) => [binding.bindingId as string, binding]));
  const mapped = new Set<string>();
  for (const candidate of sources.activationCandidates) {
    const event = eventById.get(candidate.sourceEventIdentity); const binding = bindingById.get(candidate.bindingId);
    if (!event || !binding || binding.eventKind !== event.kind || binding.initiativeInstanceId !== event.initiativeInstanceId || binding.targetNodeId !== candidate.targetNodeId || candidate.provenance.sourceEventIdentity !== event.sourceEventIdentity || candidate.provenance.bindingIdentity !== bindings.semanticIdentity || candidate.provenance.observationNodeId !== binding.targetNodeId) throw new TypeError("Invalid CP4A activation candidate");
    if (mapped.has(event.sourceEventIdentity)) throw new TypeError("Duplicate CP4A activation candidate");
    mapped.add(event.sourceEventIdentity);
  }
  const unmapped = new Set(sources.unmappedSourceEventIdentities);
  for (const event of sources.sourceEvents) if (mapped.has(event.sourceEventIdentity) === unmapped.has(event.sourceEventIdentity)) throw new TypeError("CP4A source mapping partition is incomplete or contradictory");
}

function failed(base: ObservationEvaluationBaseMtcV1, code: "history-period-limit" | "path-limit" | "occurrence-limit", limit: number, observed: number): ObservationEvaluationResultMtcV1 {
  const value = { ...base, status: "failed-bounds" as const, code, limit, observed };
  return freezeDeep({ ...value, evaluationIdentity: observationEvaluationIdentityMtcV1(value) });
}

function makePath(
  source: ObservationSourceEventMtcV1,
  bindingId: CanonicalSemanticIdMtcV1,
  nodeIds: readonly CanonicalSemanticIdMtcV1[],
  edges: readonly ObservationEdgeMtcV1[],
  horizon: number,
): CausalPathMtcV1 {
  const lastEdge = edges.at(-1);
  const persistence = lastEdge?.persistence ?? "none";
  const semantic = {
    sourceEventIdentity: source.sourceEventIdentity,
    bindingId,
    sourceNodeId: nodeIds[0], targetNodeId: nodeIds.at(-1)!,
    nodeIds, edgeIds: edges.map((edge) => edge.edgeId),
    edgeEvidence: edges.map((edge) => ({ edgeId: edge.edgeId, evidence: edge.evidence })),
    result: (edges.length === 0 ? "affected" : "exposed") as "affected" | "exposed",
    persistence,
    firstVisiblePeriod: source.committedBoundary,
    finalVisiblePeriod: persistence === "declared-persistent" ? horizon : source.committedBoundary,
  };
  return freezeDeep({ ...semantic, pathIdentity: causalPathIdentityMtcV1(semantic as never) }) as CausalPathMtcV1;
}

export function evaluateObservationsMtcV1(
  sources: ObservationSourceBindingResultMtcV1,
  bindings: ObservationSourceBindingsMtcV1,
  contract: TwoLayerMtcContractV1,
  context: Layer2PeriodContextMtcV1,
): ObservationEvaluationResultMtcV1 {
  validateBoundary(sources, bindings, contract, context);
  const base: ObservationEvaluationBaseMtcV1 = {
    evaluationVersion: OBSERVATION_EVALUATION_VERSION,
    scenarioIdentity: context.scenarioIdentity,
    contractIdentity: sources.contractIdentity,
    executionIdentity: sources.executionIdentity,
    sourceResultIdentity: sources.resultIdentity,
    bindingIdentity: bindings.semanticIdentity,
  };
  const periodCount = context.finalPeriod - context.firstPeriod + 1;
  if (periodCount > CONTRACT_LIMITS_MTC_V1.maxObservationHistoryPeriods) return failed(base, "history-period-limit", CONTRACT_LIMITS_MTC_V1.maxObservationHistoryPeriods, periodCount);

  const adjacency = new Map<string, ObservationEdgeMtcV1[]>();
  for (const node of contract.layer2.nodes) adjacency.set(node.nodeId, []);
  for (const edge of contract.layer2.edges) adjacency.get(edge.sourceNodeId)!.push(edge);
  for (const edges of adjacency.values()) edges.sort((a, b) => compareCanonicalStringsMtcV1(a.edgeId, b.edgeId));
  const eventById = new Map(sources.sourceEvents.map((event) => [event.sourceEventIdentity, event]));
  const allPaths: CausalPathMtcV1[] = [];
  for (const candidate of sources.activationCandidates) {
    const source = eventById.get(candidate.sourceEventIdentity)!;
    if (source.committedBoundary > context.finalPeriod) continue;
    const visit = (nodeIds: CanonicalSemanticIdMtcV1[], edges: ObservationEdgeMtcV1[]): boolean => {
      allPaths.push(makePath(source, candidate.bindingId, nodeIds, edges, context.finalPeriod));
      if (allPaths.length > CONTRACT_LIMITS_MTC_V1.maxObservationPaths) return false;
      for (const edge of adjacency.get(nodeIds.at(-1)!) ?? []) {
        if (edges.length + 1 > CONTRACT_LIMITS_MTC_V1.maxObservationDepth) throw new TypeError("Validated Layer 2 graph exceeds depth limit");
        if (!visit([...nodeIds, edge.targetNodeId], [...edges, edge])) return false;
      }
      return true;
    };
    if (!visit([candidate.targetNodeId], [])) return failed(base, "path-limit", CONTRACT_LIMITS_MTC_V1.maxObservationPaths, allPaths.length);
  }
  allPaths.sort((a, b) => compareCanonicalStringsMtcV1(pathKey(a), pathKey(b)));
  let occurrenceCount = 0; const history: ObservationPeriodRecordMtcV1[] = []; let previousNodes = new Set<CanonicalSemanticIdMtcV1>();
  for (let period = context.firstPeriod; period <= context.finalPeriod; period += 1) {
    const visiblePaths = allPaths.filter((path) => path.firstVisiblePeriod <= period && path.finalVisiblePeriod >= period);
    occurrenceCount += visiblePaths.length;
    if (occurrenceCount > CONTRACT_LIMITS_MTC_V1.maxObservationOccurrences) return failed(base, "occurrence-limit", CONTRACT_LIMITS_MTC_V1.maxObservationOccurrences, occurrenceCount);
    const pathsByNode = new Map<CanonicalSemanticIdMtcV1, CausalPathMtcV1[]>();
    for (const path of visiblePaths) { const paths = pathsByNode.get(path.targetNodeId) ?? []; paths.push(path); pathsByNode.set(path.targetNodeId, paths); }
    const observations: NodeObservationMtcV1[] = [...pathsByNode].map(([nodeId, paths]) => ({
      nodeId,
      result: paths.some((path) => path.result === "affected") ? "affected" as const : "exposed" as const,
      causalPaths: paths.sort((a, b) => compareCanonicalStringsMtcV1(pathKey(a), pathKey(b))),
    })).sort((a, b) => compareCanonicalStringsMtcV1(a.nodeId, b.nodeId));
    const currentNodes = new Set(observations.map((item) => item.nodeId));
    const newNodes = [...currentNodes].filter((node) => !previousNodes.has(node)).sort(compareCanonicalStringsMtcV1);
    const terminated = [...previousNodes].filter((node) => !currentNodes.has(node)).sort(compareCanonicalStringsMtcV1);
    const continuing = [...new Set(visiblePaths.filter((path) => path.persistence === "declared-persistent" && path.firstVisiblePeriod < period).map((path) => path.targetNodeId))].sort(compareCanonicalStringsMtcV1);
    const periodEvents = sources.sourceEvents.filter((event) => event.committedBoundary === period && sources.activationCandidates.some((candidate) => candidate.sourceEventIdentity === event.sourceEventIdentity)).map((event) => event.sourceEventIdentity).sort(compareCanonicalStringsMtcV1);
    const periodBindings = sources.activationCandidates.filter((candidate) => periodEvents.includes(candidate.sourceEventIdentity)).map((candidate) => candidate.bindingId).sort(compareCanonicalStringsMtcV1);
    const traversedEdges = [...new Set(allPaths.filter((path) => path.firstVisiblePeriod === period).flatMap((path) => path.edgeIds))].sort(compareCanonicalStringsMtcV1);
    const stateSemantic = { period, observations };
    const record = {
      period,
      consumedSourceEventIdentities: periodEvents,
      consumedBindingIds: periodBindings,
      newlyVisibleNodeIds: newNodes,
      continuingPersistentNodeIds: continuing,
      terminatedNodeIds: terminated,
      traversedEdgeIds: traversedEdges,
      observations,
      stateIdentity: hashCanonicalMtcV1("CE:TWO-LAYER-MTC:OBSERVATION-STATE", OBSERVATION_EVALUATION_VERSION, canonicalJsonBytesMtcV1(stateSemantic)),
    } as ObservationPeriodRecordMtcV1;
    history.push(freezeDeep(record)); previousNodes = currentNodes;
  }
  const terminal = { boundary: context.finalPeriod + 1, terminatedNodeIds: [...previousNodes].sort(compareCanonicalStringsMtcV1) };
  const value = { ...base, status: "evaluated" as const, mechanicallyProducedCategories: ["affected", "exposed"] as const, history: freezeDeep(history), terminalBoundary: freezeDeep(terminal) };
  return freezeDeep({ ...value, evaluationIdentity: observationEvaluationIdentityMtcV1(value) });
}
