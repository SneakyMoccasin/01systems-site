import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import {
  OBSERVATION_SOURCE_BINDINGS_VERSION,
  OBSERVATION_SOURCE_EVENT_VERSION,
  OBSERVATION_SOURCE_RESULT_VERSION,
  type ObservationSourceBindingResultMtcV1,
  type ObservationSourceBindingsMtcV1,
  type ObservationSourceEventMtcV1,
} from "./observationSourceMtcV1";

export function observationSourceEventIdentityMtcV1(event: Omit<ObservationSourceEventMtcV1, "sourceEventIdentity"> | ObservationSourceEventMtcV1): string {
  const semantic = structuredClone(event) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "sourceEventIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:OBSERVATION-SOURCE-EVENT", OBSERVATION_SOURCE_EVENT_VERSION, canonicalJsonBytesMtcV1(semantic));
}

export function observationSourceBindingsIdentityMtcV1(bindings: Omit<ObservationSourceBindingsMtcV1, "semanticIdentity"> | ObservationSourceBindingsMtcV1): string {
  const semantic = structuredClone(bindings) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "semanticIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:OBSERVATION-SOURCE-BINDINGS", OBSERVATION_SOURCE_BINDINGS_VERSION, canonicalJsonBytesMtcV1(semantic));
}

export function observationSourceResultIdentityMtcV1(result: Omit<ObservationSourceBindingResultMtcV1, "resultIdentity"> | ObservationSourceBindingResultMtcV1): string {
  const semantic = structuredClone(result) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "resultIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:OBSERVATION-SOURCE-RESULT", OBSERVATION_SOURCE_RESULT_VERSION, canonicalJsonBytesMtcV1(semantic));
}
