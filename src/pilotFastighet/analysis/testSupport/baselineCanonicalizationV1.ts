import { createHash } from "node:crypto";

export type BaselineJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly BaselineJsonValue[]
  | { readonly [key: string]: BaselineJsonValue };

function fail(path: string, reason: string): never {
  throw new TypeError(`Baseline canonicalization failed at ${path}: ${reason}.`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function propertyPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function canonicalize(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(path, "number must be finite");
    if (Object.is(value, -0)) fail(path, "negative zero is not supported");
    return JSON.stringify(value);
  }
  if (typeof value === "undefined") fail(path, "undefined is not supported");
  if (typeof value === "bigint") fail(path, "bigint is not supported");
  if (typeof value === "function") fail(path, "functions are not supported");
  if (typeof value === "symbol") fail(path, "symbols are not supported");

  const object = value as object;
  if (ancestors.has(object)) fail(path, "cyclic reference is not supported");
  ancestors.add(object);
  try {
    const symbolKeys = Object.getOwnPropertySymbols(object);
    if (symbolKeys.length > 0) fail(path, "symbol keys are not supported");

    if (Array.isArray(value)) {
      const ownNames = Object.getOwnPropertyNames(value);
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          fail(`${path}[${index}]`, "sparse array entries are not supported");
        }
      }
      const extraKey = ownNames.find((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key));
      if (extraKey !== undefined) fail(propertyPath(path, extraKey), "non-index array properties are not supported");
      return `[${value.map((entry, index) => canonicalize(entry, `${path}[${index}]`, ancestors)).join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(object);
    if (prototype !== Object.prototype && prototype !== null) {
      fail(path, "unsupported class instance");
    }
    const keys = Object.getOwnPropertyNames(object).sort(compareText);
    return `{${keys.map((key) => {
      const childPath = propertyPath(path, key);
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      if (!descriptor?.enumerable) fail(childPath, "non-enumerable properties are not supported");
      if (!("value" in descriptor)) fail(childPath, "accessor properties are not supported");
      return `${JSON.stringify(key)}:${canonicalize(descriptor.value, childPath, ancestors)}`;
    }).join(",")}}`;
  } finally {
    ancestors.delete(object);
  }
}

export function canonicalizeBaselineValueV1(value: unknown, rootPath = "$"): string {
  return canonicalize(value, rootPath, new Set<object>());
}

export function hashBaselineValueV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalizeBaselineValueV1(value), "utf8")
    .digest("hex");
}
