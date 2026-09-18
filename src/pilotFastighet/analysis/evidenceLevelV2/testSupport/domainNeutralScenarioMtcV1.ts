import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";

export function domainNeutralScenarioMtcV1(contract: TwoLayerMtcContractV1): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-scenario-v1",
    scenarioId: "scenario:synthetic-alpha",
    revision: 1,
    domainContract: {
      semanticId: contract.semanticId,
      semanticIdentity: contractSemanticIdentityMtcV1(contract),
    },
    horizon: { firstPeriod: 1, finalPeriod: 6 },
    initiatives: [
      {
        instanceId: "instance:foundation",
        initiativeTypeId: "initiative:foundation",
        scheduledStartPeriod: 1,
        durationPeriods: 1,
        initialLifecycle: "pending",
        dependencies: [],
        resourceClaims: [],
      },
      {
        instanceId: "instance:delivery-a",
        initiativeTypeId: "initiative:delivery",
        scheduledStartPeriod: 2,
        durationPeriods: 3,
        initialLifecycle: "pending",
        dependencies: [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:foundation", condition: "completed" }],
        resourceClaims: [
          { ruleId: "rule:delivery-room", resourceInstanceId: "resource-instance:room-1", kind: "exclusive", reservation: "while-active" },
          { ruleId: "rule:delivery-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: "2", unit: "person", reservation: "while-active" },
        ],
      },
      {
        instanceId: "instance:delivery-b",
        initiativeTypeId: "initiative:delivery",
        scheduledStartPeriod: 5,
        durationPeriods: 3,
        initialLifecycle: "pending",
        dependencies: [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:foundation", condition: "completed" }],
        resourceClaims: [
          { ruleId: "rule:delivery-room", resourceInstanceId: "resource-instance:room-1", kind: "exclusive", reservation: "while-active" },
          { ruleId: "rule:delivery-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: "2", unit: "person", reservation: "while-active" },
        ],
      },
      {
        instanceId: "instance:independent",
        initiativeTypeId: "initiative:independent",
        scheduledStartPeriod: 3,
        durationPeriods: 1,
        initialLifecycle: "pending",
        dependencies: [],
        resourceClaims: [],
      },
    ],
    resources: [
      { resourceInstanceId: "resource-instance:room-1", resourceId: "resource:room", kind: "exclusive", initialState: "available" },
      { resourceInstanceId: "resource-instance:team-1", resourceId: "resource:team", kind: "quantitative-capacity", unit: "person", capacity: "5", initialAvailableCapacity: "5" },
    ],
    initialConstraints: [{ constraintId: "constraint:hold", state: "absent" }],
    initialEntitlements: [
      { entitlementId: "entitlement:membership", kind: "reusable", state: "available" },
      { entitlementId: "entitlement:permit", kind: "consumable", state: "available" },
    ],
    metadata: { displayName: "Synthetic scenario" },
  };
}
