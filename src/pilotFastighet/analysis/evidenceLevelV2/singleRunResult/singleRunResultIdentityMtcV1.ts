import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import { SINGLE_RUN_RESULT_VERSION_MTC_V1, type SingleRunResultMtcV1 } from "./singleRunResultMtcV1";

export function singleRunResultIdentityMtcV1(
  result: Omit<SingleRunResultMtcV1, "resultIdentity"> | SingleRunResultMtcV1,
): string {
  const semantic = structuredClone(result) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "resultIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:SINGLE-RUN-RESULT", SINGLE_RUN_RESULT_VERSION_MTC_V1, canonicalJsonBytesMtcV1(semantic));
}
