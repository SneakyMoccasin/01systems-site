import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import { OBSERVATION_EVALUATION_VERSION, type CausalPathMtcV1, type ObservationEvaluationResultMtcV1 } from "./observationEvaluationMtcV1";

export function causalPathIdentityMtcV1(path: Omit<CausalPathMtcV1, "pathIdentity"> | CausalPathMtcV1): string {
  const semantic = structuredClone(path) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "pathIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:CAUSAL-PATH", OBSERVATION_EVALUATION_VERSION, canonicalJsonBytesMtcV1(semantic));
}

export function observationEvaluationIdentityMtcV1(result: Omit<ObservationEvaluationResultMtcV1, "evaluationIdentity"> | ObservationEvaluationResultMtcV1): string {
  const semantic = structuredClone(result) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "evaluationIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:OBSERVATION-EVALUATION", OBSERVATION_EVALUATION_VERSION, canonicalJsonBytesMtcV1(semantic));
}
