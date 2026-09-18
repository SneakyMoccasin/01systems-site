import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { deriveDecisionSpaceHistoryMtcV1 } from "../decisionSpace/deriveDecisionSpaceMtcV1";
import { decisionSpaceSnapshotIdentityMtcV1 } from "../decisionSpace/decisionSpaceIdentityMtcV1";
import { layer1ExecutionIdentityMtcV1 } from "../execution/executionIdentityMtcV1";
import type { Layer1ExecutionOutcomeMtcV1 } from "../execution/executionMtcV1";
import { observationEvaluationIdentityMtcV1 } from "../observationEvaluation/observationEvaluationIdentityMtcV1";
import { observationSourceBindingsIdentityMtcV1, observationSourceResultIdentityMtcV1 } from "../observationSource/observationSourceIdentityMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { singleRunResultIdentityMtcV1 } from "./singleRunResultIdentityMtcV1";
import { SINGLE_RUN_RESULT_VERSION_MTC_V1, type SingleRunLayer2MtcV1, type SingleRunResultMtcV1 } from "./singleRunResultMtcV1";

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function verifyLayer2(layer2: SingleRunLayer2MtcV1, execution: Layer1ExecutionOutcomeMtcV1): void {
  if (layer2.bindings.semanticIdentity !== observationSourceBindingsIdentityMtcV1(layer2.bindings)) throw new TypeError("Layer 2 binding identity verification failed at single-run boundary");
  if (layer2.sources.resultIdentity !== observationSourceResultIdentityMtcV1(layer2.sources)) throw new TypeError("Layer 2 source identity verification failed at single-run boundary");
  if (layer2.evaluation.evaluationIdentity !== observationEvaluationIdentityMtcV1(layer2.evaluation)) throw new TypeError("Layer 2 evaluation identity verification failed at single-run boundary");
  if (layer2.sources.executionIdentity !== execution.executionIdentity || layer2.evaluation.executionIdentity !== execution.executionIdentity) throw new TypeError("Layer 2 execution identity mismatch at single-run boundary");
  if (layer2.sources.bindingIdentity !== layer2.bindings.semanticIdentity || layer2.evaluation.bindingIdentity !== layer2.bindings.semanticIdentity || layer2.evaluation.sourceResultIdentity !== layer2.sources.resultIdentity) throw new TypeError("Layer 2 provenance chain mismatch at single-run boundary");
}

export function buildSingleRunResultMtcV1(
  execution: Layer1ExecutionOutcomeMtcV1,
  scenario: PreparedScenarioMtcV1,
  contract: TwoLayerMtcContractV1,
  layer2?: SingleRunLayer2MtcV1,
): SingleRunResultMtcV1 {
  if (execution.executionIdentity !== layer1ExecutionIdentityMtcV1(execution)) throw new TypeError("Execution identity verification failed at single-run boundary");
  if (execution.status === "failed-unresolved" && layer2) throw new TypeError("Unresolved execution cannot contain fabricated post-boundary Layer 2 history");
  if (layer2) verifyLayer2(layer2, execution);
  const decisionSpaceHistory = deriveDecisionSpaceHistoryMtcV1(execution, scenario, contract);
  for (const item of decisionSpaceHistory) if (item.snapshotIdentity !== decisionSpaceSnapshotIdentityMtcV1(item)) throw new TypeError("Decision Space identity verification failed");
  const terminalCommittedStateIdentity = execution.status === "completed-horizon" ? execution.terminalState.stateIdentity : execution.lastCommittedState.stateIdentity;
  const pathIdentities = layer2?.evaluation.status === "evaluated"
    ? [...new Set(layer2.evaluation.history.flatMap((period) => period.observations.flatMap((observation) => observation.causalPaths.map((path) => path.pathIdentity))))].sort(compareCanonicalStringsMtcV1)
    : [];
  const base = {
    resultVersion: SINGLE_RUN_RESULT_VERSION_MTC_V1,
    scenarioIdentity: execution.scenarioIdentity,
    contractIdentity: execution.contractIdentity,
    executionIdentity: execution.executionIdentity,
    execution,
    decisionSpaceHistory,
    terminalCommittedStateIdentity,
    ...(layer2 ? { layer2 } : {}),
    provenance: {
      structural: decisionSpaceHistory.map((item) => ({ snapshotIdentity: item.snapshotIdentity, stateIdentity: item.committedStateIdentity, initiativeInstanceIds: item.initiativeUniverse, scenarioIdentity: item.scenarioIdentity, contractIdentity: item.contractIdentity })),
      ...(layer2 ? { causal: { evaluationIdentity: layer2.evaluation.evaluationIdentity, sourceResultIdentity: layer2.sources.resultIdentity, bindingIdentity: layer2.bindings.semanticIdentity, pathIdentities } } : {}),
    },
  };
  const semantic = execution.status === "failed-unresolved"
    ? { ...base, status: "failed-unresolved" as const, failedPeriod: execution.failedPeriod }
    : layer2?.evaluation.status === "failed-bounds"
      ? { ...base, status: "failed-bounds" as const, boundFailure: { code: layer2.evaluation.code, limit: layer2.evaluation.limit, observed: layer2.evaluation.observed } }
      : { ...base, status: "completed-resolved" as const };
  return freezeDeep({ ...semantic, resultIdentity: singleRunResultIdentityMtcV1(semantic as never) }) as SingleRunResultMtcV1;
}
