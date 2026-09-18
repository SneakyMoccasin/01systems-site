import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import type { DecisionSpaceSnapshotMtcV1 } from "../decisionSpace/decisionSpaceMtcV1";
import type { Layer1ExecutionOutcomeMtcV1 } from "../execution/executionMtcV1";
import type { ObservationEvaluationResultMtcV1 } from "../observationEvaluation/observationEvaluationMtcV1";
import type { ObservationSourceBindingResultMtcV1, ObservationSourceBindingsMtcV1 } from "../observationSource/observationSourceMtcV1";

export const SINGLE_RUN_RESULT_VERSION_MTC_V1 = "ce-two-layer-mtc-single-run-result-v1" as const;

export interface SingleRunLayer2MtcV1 {
  readonly bindings: ObservationSourceBindingsMtcV1;
  readonly sources: ObservationSourceBindingResultMtcV1;
  readonly evaluation: ObservationEvaluationResultMtcV1;
}

interface SingleRunResultBaseMtcV1 {
  readonly resultVersion: typeof SINGLE_RUN_RESULT_VERSION_MTC_V1;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly executionIdentity: string;
  readonly execution: Layer1ExecutionOutcomeMtcV1;
  readonly decisionSpaceHistory: readonly DecisionSpaceSnapshotMtcV1[];
  readonly terminalCommittedStateIdentity: string;
  readonly layer2?: SingleRunLayer2MtcV1;
  readonly provenance: Readonly<{
    structural: readonly Readonly<{ snapshotIdentity: string; stateIdentity: string; initiativeInstanceIds: readonly CanonicalSemanticIdMtcV1[]; scenarioIdentity: string; contractIdentity: string }>[];
    causal?: Readonly<{ evaluationIdentity: string; sourceResultIdentity: string; bindingIdentity: string; pathIdentities: readonly string[] }>;
  }>;
}

export type SingleRunResultMtcV1 =
  | Readonly<SingleRunResultBaseMtcV1 & { status: "completed-resolved"; resultIdentity: string }>
  | Readonly<SingleRunResultBaseMtcV1 & { status: "failed-unresolved"; failedPeriod: number; resultIdentity: string }>
  | Readonly<SingleRunResultBaseMtcV1 & { status: "failed-bounds"; boundFailure: Readonly<{ code: "history-period-limit" | "path-limit" | "occurrence-limit"; limit: number; observed: number }>; resultIdentity: string }>;
