export const PROTOCOL_LIMITS_MTC_V1 = Object.freeze({
  maxCanonicalDepth: 64,
  maxCanonicalPayloadBytes: 32 * 1024 * 1024,
  maxCollectionEntries: 50_000,
  maxSemanticIdBytes: 128,
  maxPeriodIndex: 239,
  maxPeriods: 240,
  maxDecimalPrecision: 34,
  maxDecimalScale: 18,
  maxDecimalIntegerDigits: 18,
} as const);
