import { PROTOCOL_LIMITS_MTC_V1 } from "../protocol/protocolLimitsMtcV1";
import { compareCanonicalStringsMtcV1 } from "./canonicalOrderMtcV1";

const UTF8 = new TextEncoder();

function fail(message: string): never {
  throw new TypeError(message);
}

function serialize(value: unknown, depth: number, ancestors: Set<object>): string {
  if (depth > PROTOCOL_LIMITS_MTC_V1.maxCanonicalDepth) {
    throw new RangeError("Canonical value exceeds the nesting limit");
  }
  if (value === null) return fail("null requires an explicit admitting schema");
  if (typeof value === "string") {
    if (value.normalize("NFC") !== value) return fail("String must already be NFC");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fail("Non-finite numbers are forbidden");
    if (Object.is(value, -0)) return fail("Negative zero is forbidden");
    if (!Number.isSafeInteger(value)) return fail("Numbers must be safe integers");
    return String(value);
  }
  if (value === undefined) return fail("undefined is forbidden");
  if (typeof value !== "object") return fail("Unsupported canonical value shape");
  if (ancestors.has(value)) return fail("Cyclic values are forbidden");

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > PROTOCOL_LIMITS_MTC_V1.maxCollectionEntries) {
        throw new RangeError("Array exceeds the collection limit");
      }
      const ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.length !== value.length + 1 ||
        ownKeys.some(
          (key) =>
            typeof key !== "string" ||
            (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key)),
        )
      ) {
        return fail("Array has unsupported extra properties");
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) {
          return fail("Sparse arrays are forbidden");
        }
      }
      return `[${value.map((entry) => serialize(entry, depth + 1, ancestors)).join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail("Only plain objects are canonicalizable");
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length > PROTOCOL_LIMITS_MTC_V1.maxCollectionEntries) {
      throw new RangeError("Object exceeds the collection limit");
    }
    if (keys.some((key) => typeof key !== "string")) {
      return fail("Symbol keys are forbidden");
    }

    const stringKeys = keys as string[];
    for (const key of stringKeys) {
      if (key.normalize("NFC") !== key) return fail("Object key must already be NFC");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return fail("Accessors and non-enumerable properties are forbidden");
      }
    }
    stringKeys.sort(compareCanonicalStringsMtcV1);
    return `{${stringKeys
      .map((key) => `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key], depth + 1, ancestors)}`)
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJsonBytesMtcV1(value: unknown): Uint8Array {
  const bytes = UTF8.encode(serialize(value, 0, new Set()));
  if (bytes.byteLength > PROTOCOL_LIMITS_MTC_V1.maxCanonicalPayloadBytes) {
    throw new RangeError("Canonical payload exceeds the byte limit");
  }
  return bytes;
}

export function canonicalJsonTextMtcV1(value: unknown): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(canonicalJsonBytesMtcV1(value));
}
