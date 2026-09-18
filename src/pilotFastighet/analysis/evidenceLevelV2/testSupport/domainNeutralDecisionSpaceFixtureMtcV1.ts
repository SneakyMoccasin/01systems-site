import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import { runLayer1MtcV1 } from "../execution/runLayer1MtcV1";
import { parseScenarioMtcV1 } from "../scenario/parseScenarioMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { domainNeutralScenarioMtcV1 } from "./domainNeutralScenarioMtcV1";

export function rawDecisionSpaceContractMtcV1(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1", semanticId: "contract:decision-space-fixture", revision: 1,
    protocolVersion: "ce-two-layer-mtc-protocol-v1", limitsVersion: "ce-two-layer-mtc-limits-v1", evidence: [],
    layer1: {
      initiativeTypes: [
        { initiativeTypeId: "initiative:foundation", lifecycle: "pending-active-completed-v1", eligibilityRules: [] },
        { initiativeTypeId: "initiative:independent", lifecycle: "pending-active-completed-v1", eligibilityRules: [
          { ruleId: "rule:independent-constraint", kind: "constraint-absent", constraintId: "constraint:hold" },
          { ruleId: "rule:independent-reusable", kind: "entitlement-available", entitlementId: "entitlement:membership", consumption: "retain" },
          { ruleId: "rule:independent-consumable", kind: "entitlement-available", entitlementId: "entitlement:permit", consumption: "consume-on-admission" },
        ] },
        { initiativeTypeId: "initiative:delivery", lifecycle: "pending-active-completed-v1", eligibilityRules: [
          { ruleId: "rule:delivery-prerequisite", kind: "prerequisite-completed", prerequisiteInitiativeTypeId: "initiative:foundation" },
          { ruleId: "rule:delivery-room", kind: "exclusive-resource-available", resourceId: "resource:room", reservation: "while-active" },
          { ruleId: "rule:delivery-capacity", kind: "quantitative-capacity-available", resourceId: "resource:team", amount: "2", unit: "person", reservation: "while-active" },
        ] },
      ],
      resources: [
        { resourceId: "resource:room", kind: "exclusive" },
        { resourceId: "resource:team", kind: "quantitative-capacity", unit: "person", capacity: "5" },
      ],
      constraints: [{ constraintId: "constraint:hold", kind: "blocking" }],
      entitlements: [{ entitlementId: "entitlement:membership", kind: "reusable" }, { entitlementId: "entitlement:permit", kind: "consumable" }],
    },
    layer2: { resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1", nodes: [], edges: [] },
  };
}

export function decisionSpaceFixtureMtcV1(mutateScenario?: (raw: Record<string, unknown>) => void) {
  const contractResult = parseContractMtcV1(rawDecisionSpaceContractMtcV1());
  if (!contractResult.ok) throw new Error(JSON.stringify(contractResult.issues));
  const contract: TwoLayerMtcContractV1 = contractResult.value;
  const rawScenario = domainNeutralScenarioMtcV1(contract); mutateScenario?.(rawScenario);
  const scenarioResult = parseScenarioMtcV1(rawScenario, contract);
  if (!scenarioResult.ok) throw new Error(JSON.stringify(scenarioResult.issues));
  const scenario: PreparedScenarioMtcV1 = scenarioResult.value;
  return { contract, scenario, execution: runLayer1MtcV1(scenario, contract) };
}
