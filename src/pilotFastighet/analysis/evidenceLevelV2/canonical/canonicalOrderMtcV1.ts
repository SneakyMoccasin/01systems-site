import { PROTOCOL_LIMITS_MTC_V1 } from "../protocol/protocolLimitsMtcV1";

const UTF8 = new TextEncoder();

export function compareCanonicalStringsMtcV1(left: string, right: string): number {
  const leftBytes = UTF8.encode(left);
  const rightBytes = UTF8.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index] - rightBytes[index];
    if (difference !== 0) return difference;
  }

  return leftBytes.length - rightBytes.length;
}
export function canonicalizeSemanticSetMtcV1<T>(
  values: readonly T[],
  identityOf: (value: T) => string,
): readonly T[] {
  if (values.length > PROTOCOL_LIMITS_MTC_V1.maxCollectionEntries) {
    throw new RangeError("Semantic set exceeds the collection limit");
  }

  const keyed = values.map((value) => {
    const identity = identityOf(value);
    if (identity.normalize("NFC") !== identity) {
      throw new TypeError("Semantic-set identity must already be NFC");
    }
    return { identity, value };
  });
  keyed.sort((left, right) =>
    compareCanonicalStringsMtcV1(left.identity, right.identity),
  );

  for (let index = 1; index < keyed.length; index += 1) {
    if (keyed[index - 1].identity === keyed[index].identity) {
      throw new TypeError(`Duplicate semantic-set identity: ${keyed[index].identity}`);
    }
  }

  return Object.freeze(keyed.map(({ value }) => value));
}
