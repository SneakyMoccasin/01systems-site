import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import type { ObservationEdgeEvidenceMtcV1 } from "../contract/contractMtcV1";

export const OBSERVATION_EVALUATION_VERSION = "ce-two-layer-mtc-observation-evaluation-v1" as const;

export interface Layer2PeriodContextMtcV1 {
  readonly scenarioIdentity: string;
  readonly firstPeriod: number;
  readonly finalPeriod: number;
}

export interface CausalPathMtcV1 {
  readonly pathIdentity: string;
  readonly sourceEventIdentity: string;
  readonly bindingId: CanonicalSemanticIdMtcV1;
  readonly sourceNodeId: CanonicalSemanticIdMtcV1;
  readonly targetNodeId: CanonicalSemanticIdMtcV1;
  readonly nodeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly edgeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly edgeEvidence: readonly Readonly<{
    edgeId: CanonicalSemanticIdMtcV1;
    evidence: ObservationEdgeEvidenceMtcV1;
  }>[];
  readonly result: "affected" | "exposed";
  readonly persistence: "none" | "declared-persistent";
  readonly firstVisiblePeriod: number;
  readonly finalVisiblePeriod: number;
}

export interface NodeObservationMtcV1 {
  readonly nodeId: CanonicalSemanticIdMtcV1;
  readonly result: "affected" | "exposed";
  readonly causalPaths: readonly CausalPathMtcV1[];
}

export interface ObservationPeriodRecordMtcV1 {
  readonly period: number;
  readonly consumedSourceEventIdentities: readonly string[];
  readonly consumedBindingIds: readonly CanonicalSemanticIdMtcV1[];
  readonly newlyVisibleNodeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly continuingPersistentNodeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly terminatedNodeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly traversedEdgeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly observations: readonly NodeObservationMtcV1[];
  readonly stateIdentity: string;
}

export interface ObservationEvaluationBaseMtcV1 {
  readonly evaluationVersion: typeof OBSERVATION_EVALUATION_VERSION;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly executionIdentity: string;
  readonly sourceResultIdentity: string;
  readonly bindingIdentity: string;
}

export type ObservationEvaluationResultMtcV1 =
  | Readonly<ObservationEvaluationBaseMtcV1 & {
      status: "evaluated";
      mechanicallyProducedCategories: readonly ["affected", "exposed"];
      history: readonly ObservationPeriodRecordMtcV1[];
      terminalBoundary: Readonly<{ boundary: number; terminatedNodeIds: readonly CanonicalSemanticIdMtcV1[] }>;
      evaluationIdentity: string;
    }>
  | Readonly<ObservationEvaluationBaseMtcV1 & {
      status: "failed-bounds";
      code: "history-period-limit" | "path-limit" | "occurrence-limit";
      limit: number;
      observed: number;
      evaluationIdentity: string;
    }>;
