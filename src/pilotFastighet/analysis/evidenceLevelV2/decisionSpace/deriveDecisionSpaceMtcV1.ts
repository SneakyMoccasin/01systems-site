import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { evaluateEligibilityMtcV1 } from "../execution/evaluateEligibilityMtcV1";
import { layer1ExecutionIdentityMtcV1, layer1StateIdentityMtcV1 } from "../execution/executionIdentityMtcV1";
import type { Layer1ExecutionOutcomeMtcV1, Layer1RuntimeStateMtcV1 } from "../execution/executionMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { scenarioSemanticIdentityMtcV1 } from "../scenario/scenarioSemanticIdentityMtcV1";
import { decisionSpaceSnapshotIdentityMtcV1 } from "./decisionSpaceIdentityMtcV1";
import { DECISION_SPACE_VERSION_MTC_V1, type DecisionSpaceClassificationMtcV1, type DecisionSpaceSnapshotMtcV1 } from "./decisionSpaceMtcV1";

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function snapshot(
  state: Layer1RuntimeStateMtcV1,
  point: DecisionSpaceSnapshotMtcV1["point"],
  scenario: PreparedScenarioMtcV1,
  contract: TwoLayerMtcContractV1,
  execution: Layer1ExecutionOutcomeMtcV1,
): DecisionSpaceSnapshotMtcV1 {
  if (state.stateIdentity !== layer1StateIdentityMtcV1(state)) throw new TypeError("Layer 1 state identity verification failed at Decision Space boundary");
  const declarations = new Map(scenario.initiatives.map((item) => [item.instanceId as string, item]));
  const classifications: DecisionSpaceClassificationMtcV1[] = state.initiatives.map((runtime) => {
    const declaration = declarations.get(runtime.instanceId)!;
    if (runtime.lifecycle === "active") return { instanceId: runtime.instanceId, initiativeTypeId: declaration.initiativeTypeId, classification: "active-not-next-action" as const, reasons: [] as const };
    if (runtime.lifecycle === "completed") return { instanceId: runtime.instanceId, initiativeTypeId: declaration.initiativeTypeId, classification: "completed-terminal" as const, reasons: [] as const };
    const decision = evaluateEligibilityMtcV1(declaration, state, contract);
    return decision.eligible
      ? { instanceId: runtime.instanceId, initiativeTypeId: declaration.initiativeTypeId, classification: "eligible-pending" as const, reasons: [] as const }
      : { instanceId: runtime.instanceId, initiativeTypeId: declaration.initiativeTypeId, classification: "ineligible-pending" as const, reasons: decision.reasons };
  }).sort((a, b) => compareCanonicalStringsMtcV1(a.instanceId, b.instanceId));
  const ids = (classification: DecisionSpaceClassificationMtcV1["classification"]) => classifications.filter((item) => item.classification === classification).map((item) => item.instanceId);
  const semantic = {
    decisionSpaceVersion: DECISION_SPACE_VERSION_MTC_V1,
    semantics: "individual-next-action-eligibility-not-cohort-feasibility" as const,
    scenarioIdentity: scenario.semanticIdentity,
    contractIdentity: execution.contractIdentity,
    executionIdentity: execution.executionIdentity,
    point,
    committedStateIdentity: state.stateIdentity,
    initiativeUniverse: scenario.initiatives.map((item) => item.instanceId).sort(compareCanonicalStringsMtcV1),
    eligibleInitiativeIds: ids("eligible-pending"),
    ineligibleInitiativeIds: ids("ineligible-pending"),
    activeInitiativeIds: ids("active-not-next-action"),
    terminalInitiativeIds: ids("completed-terminal"),
    classifications,
  };
  return freezeDeep({ ...semantic, snapshotIdentity: decisionSpaceSnapshotIdentityMtcV1(semantic) });
}

export function deriveDecisionSpaceHistoryMtcV1(
  execution: Layer1ExecutionOutcomeMtcV1,
  scenario: PreparedScenarioMtcV1,
  contract: TwoLayerMtcContractV1,
): readonly DecisionSpaceSnapshotMtcV1[] {
  const contractIdentity = contractSemanticIdentityMtcV1(contract);
  if (scenario.semanticIdentity !== scenarioSemanticIdentityMtcV1(scenario) || execution.scenarioIdentity !== scenario.semanticIdentity) throw new TypeError("Scenario identity mismatch at Decision Space boundary");
  if (scenario.domainContract.semanticIdentity !== contractIdentity || execution.contractIdentity !== contractIdentity) throw new TypeError("Contract identity mismatch at Decision Space boundary");
  if (execution.executionIdentity !== layer1ExecutionIdentityMtcV1(execution)) throw new TypeError("Execution identity verification failed at Decision Space boundary");
  const history = [snapshot(execution.initialState, { kind: "initial", periodOrBoundary: scenario.horizon.firstPeriod }, scenario, contract, execution)];
  for (const record of execution.history) history.push(snapshot(record.resultingState, { kind: "period-commit", periodOrBoundary: record.period }, scenario, contract, execution));
  if (execution.status === "completed-horizon" && history.at(-1)!.committedStateIdentity !== execution.terminalState.stateIdentity) {
    history.push(snapshot(execution.terminalState, { kind: "terminal-boundary", periodOrBoundary: execution.terminalBoundary.boundary }, scenario, contract, execution));
  }
  return freezeDeep(history);
}
