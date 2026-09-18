import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import { TWO_LAYER_MTC_EXECUTION_VERSION, type Layer1ExecutionOutcomeMtcV1, type Layer1RuntimeStateMtcV1 } from "./executionMtcV1";

export function layer1StateIdentityMtcV1(
  state: Omit<Layer1RuntimeStateMtcV1, "stateIdentity"> | Layer1RuntimeStateMtcV1 | object,
): string {
  const semantic = structuredClone(state) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "stateIdentity");
  return hashCanonicalMtcV1(
    "CE:TWO-LAYER-MTC:LAYER1-STATE",
    TWO_LAYER_MTC_EXECUTION_VERSION,
    canonicalJsonBytesMtcV1(semantic),
  );
}

export function layer1ExecutionIdentityMtcV1(
  outcome: Omit<Layer1ExecutionOutcomeMtcV1, "executionIdentity"> | Layer1ExecutionOutcomeMtcV1,
): string {
  const semantic = structuredClone(outcome) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "executionIdentity");
  return hashCanonicalMtcV1(
    "CE:TWO-LAYER-MTC:LAYER1-EXECUTION",
    TWO_LAYER_MTC_EXECUTION_VERSION,
    canonicalJsonBytesMtcV1(semantic),
  );
}
