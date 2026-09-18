import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { TwoLayerMtcScenarioV1 } from "./scenarioMtcV1";

export function projectScenarioSemanticsMtcV1(scenario: TwoLayerMtcScenarioV1): unknown {
  return {
    schemaVersion: scenario.schemaVersion,
    scenarioId: scenario.scenarioId,
    revision: scenario.revision,
    domainContract: scenario.domainContract,
    horizon: scenario.horizon,
    initiatives: scenario.initiatives.map((initiative) => ({
      instanceId: initiative.instanceId,
      initiativeTypeId: initiative.initiativeTypeId,
      scheduledStartPeriod: initiative.scheduledStartPeriod,
      durationPeriods: initiative.durationPeriods,
      initialLifecycle: initiative.initialLifecycle,
      dependencies: initiative.dependencies,
      resourceClaims: initiative.resourceClaims,
    })),
    resources: scenario.resources,
    initialConstraints: scenario.initialConstraints,
    initialEntitlements: scenario.initialEntitlements,
  };
}

export function scenarioSemanticIdentityMtcV1(scenario: TwoLayerMtcScenarioV1): string {
  return hashCanonicalMtcV1(
    "CE:TWO-LAYER-MTC:SCENARIO",
    scenario.schemaVersion,
    canonicalJsonBytesMtcV1(projectScenarioSemanticsMtcV1(scenario)),
  );
}
