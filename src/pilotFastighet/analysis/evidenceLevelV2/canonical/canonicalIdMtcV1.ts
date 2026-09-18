import { PROTOCOL_LIMITS_MTC_V1 } from "../protocol/protocolLimitsMtcV1";

const SEMANTIC_ID_GRAMMAR =
  /^[A-Za-z][A-Za-z0-9]*(?:[._:/-][A-Za-z0-9]+)*$/;

export type CanonicalSemanticIdMtcV1 = string & {
  readonly __canonicalSemanticIdMtcV1: unique symbol;
};

export function parseCanonicalSemanticIdMtcV1(
  value: unknown,
): CanonicalSemanticIdMtcV1 {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    new TextEncoder().encode(value).byteLength >
      PROTOCOL_LIMITS_MTC_V1.maxSemanticIdBytes ||
    !SEMANTIC_ID_GRAMMAR.test(value)
  ) {
    throw new TypeError("Semantic ID must match the bounded ASCII ID grammar");
  }

  return value as CanonicalSemanticIdMtcV1;
}
