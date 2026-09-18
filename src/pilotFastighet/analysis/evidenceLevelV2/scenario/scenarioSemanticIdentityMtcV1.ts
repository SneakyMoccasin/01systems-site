import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { TwoLayerMtcScenarioV1 } from "./scenarioMtcV1";

export function projectScenarioSemanticsMtcV1(scenario: TwoLayerMtcScenarioV1): unknown {
  const semantic: Partial<TwoLayerMtcScenarioV1> = structuredClone(scenario);
  Reflect.deleteProperty(semantic, "metadata");
  return semantic;
}

export function scenarioSemanticIdentityMtcV1(scenario: TwoLayerMtcScenarioV1): string {
  return hashCanonicalMtcV1(
    "CE:TWO-LAYER-MTC:SCENARIO",
    scenario.schemaVersion,
    canonicalJsonBytesMtcV1(projectScenarioSemanticsMtcV1(scenario)),
  );
}
