import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import { COMPARISON_VERSION_MTC_V1, type ComparisonResultMtcV1 } from "./comparisonMtcV1";
export function comparisonIdentityMtcV1(value: Omit<ComparisonResultMtcV1, "comparisonIdentity"> | ComparisonResultMtcV1): string {
  const semantic = structuredClone(value) as Record<string, unknown>; Reflect.deleteProperty(semantic, "comparisonIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:COMPARISON", COMPARISON_VERSION_MTC_V1, canonicalJsonBytesMtcV1(semantic));
}
