import { PROTOCOL_LIMITS_MTC_V1 } from "../protocol/protocolLimitsMtcV1";

const CANONICAL_DECIMAL_GRAMMAR = /^(?:0|-?[1-9][0-9]*(?:\.[0-9]*[1-9])?)$/;

export type CanonicalDecimalMtcV1 = string & {
  readonly __canonicalDecimalMtcV1: unique symbol;
};

export function parseCanonicalDecimalMtcV1(
  value: unknown,
): CanonicalDecimalMtcV1 {
  if (typeof value !== "string" || !CANONICAL_DECIMAL_GRAMMAR.test(value)) {
    throw new TypeError("Value is not a canonical decimal string");
  }

  const unsigned = value.startsWith("-") ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  const significantDigits = `${integer}${fraction}`.replace(/^0+/, "").length || 1;

  if (
    significantDigits > PROTOCOL_LIMITS_MTC_V1.maxDecimalPrecision ||
    integer.length > PROTOCOL_LIMITS_MTC_V1.maxDecimalIntegerDigits ||
    fraction.length > PROTOCOL_LIMITS_MTC_V1.maxDecimalScale
  ) {
    throw new RangeError("Canonical decimal exceeds protocol bounds");
  }

  return value as CanonicalDecimalMtcV1;
}
