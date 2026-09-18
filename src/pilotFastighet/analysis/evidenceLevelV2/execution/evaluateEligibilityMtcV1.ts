import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import type { PreparedInitiativeMtcV1 } from "../scenario/scenarioMtcV1";
import { compareDecimalMtcV1 } from "./exactDecimalMtcV1";
import type { EligibilityDecisionMtcV1, EligibilityReasonMtcV1, Layer1RuntimeStateMtcV1 } from "./executionMtcV1";

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function reasonKey(reason: EligibilityReasonMtcV1): string {
  return new TextDecoder().decode(canonicalJsonBytesMtcV1(reason));
}

/** The single authoritative, read-only eligibility mechanism used by CP3B and CP5A. */
export function evaluateEligibilityMtcV1(
  declaration: PreparedInitiativeMtcV1,
  state: Layer1RuntimeStateMtcV1,
  contract: TwoLayerMtcContractV1,
): EligibilityDecisionMtcV1 {
  const reasons: EligibilityReasonMtcV1[] = [];
  const runtime = state.initiatives.find((item) => item.instanceId === declaration.instanceId)!;
  if (runtime.lifecycle !== "pending") reasons.push({ code: "invalid-lifecycle", instanceId: declaration.instanceId, lifecycle: runtime.lifecycle });
  for (const dependency of declaration.dependencies) {
    const prerequisite = state.initiatives.find((item) => item.instanceId === dependency.prerequisiteInstanceId)!;
    if (prerequisite.lifecycle !== "completed") reasons.push({ code: "prerequisite-incomplete", ruleId: dependency.ruleId, prerequisiteInstanceId: dependency.prerequisiteInstanceId, lifecycle: prerequisite.lifecycle });
  }
  for (const claim of declaration.resourceClaims) {
    const resource = state.resources.find((item) => item.resourceInstanceId === claim.resourceInstanceId)!;
    if (claim.kind === "exclusive" && resource.kind === "exclusive") {
      const holders = [...resource.holders].sort(compareCanonicalStringsMtcV1);
      if (holders.length) reasons.push({ code: "exclusive-resource-unavailable", ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, activeHolders: holders });
    } else if (claim.kind === "quantitative-capacity" && resource.kind === "quantitative-capacity" && compareDecimalMtcV1(resource.available, claim.amount) < 0) {
      reasons.push({ code: "quantitative-capacity-insufficient", ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, requested: claim.amount, available: resource.available, unit: claim.unit });
    }
  }
  const type = contract.layer1.initiativeTypes.find((item) => item.initiativeTypeId === declaration.initiativeTypeId)!;
  for (const rule of type.eligibilityRules) {
    if (rule.kind === "constraint-absent") {
      if (state.constraints.find((item) => item.constraintId === rule.constraintId)!.state === "present") reasons.push({ code: "constraint-present", ruleId: rule.ruleId, constraintId: rule.constraintId });
    } else if (rule.kind === "entitlement-available") {
      const value = state.entitlements.find((item) => item.entitlementId === rule.entitlementId)!;
      if (value.state !== "available") reasons.push({ code: "entitlement-unavailable", ruleId: rule.ruleId, entitlementId: rule.entitlementId, state: value.state as "unavailable" | "consumed" });
    }
  }
  reasons.sort((a, b) => compareCanonicalStringsMtcV1(reasonKey(a), reasonKey(b)));
  return freezeDeep({ instanceId: declaration.instanceId, eligible: reasons.length === 0, reasons });
}
