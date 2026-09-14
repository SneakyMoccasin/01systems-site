import {
  canonicalizeBaselineValueV1,
  type BaselineJsonValue,
} from "./baselineCanonicalizationV1";
import {
  parseDomainModelBaselineManifestV1,
  type DomainModelBaselineManifestV1,
} from "./domainModelBaselineManifestV1";

export type EngineOutputGoldenV1 = Readonly<{
  version: "engine-output-golden-v1";
  fixtureId: string;
  inputHash: string;
  outputHash: string;
  trajectoryHash: string;
  terminalStateHash: string;
  marginHistoryHash: string;
  constraintHistoryHash: string;
  cascadeEventHash: string;
  provenanceHash: string;
  baselineHash: string;
  comparisonHash: string;
  exactMetrics: Readonly<Record<string, BaselineJsonValue>>;
  manifest: DomainModelBaselineManifestV1;
  manifestHash: string;
}>;

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const FIELDS = [
  "version",
  "fixtureId",
  "inputHash",
  "outputHash",
  "trajectoryHash",
  "terminalStateHash",
  "marginHistoryHash",
  "constraintHistoryHash",
  "cascadeEventHash",
  "provenanceHash",
  "baselineHash",
  "comparisonHash",
  "exactMetrics",
  "manifest",
  "manifestHash",
] as const;
const HASH_FIELDS = [
  "inputHash",
  "outputHash",
  "trajectoryHash",
  "terminalStateHash",
  "marginHistoryHash",
  "constraintHistoryHash",
  "cascadeEventHash",
  "provenanceHash",
  "baselineHash",
  "comparisonHash",
  "manifestHash",
] as const;

function fail(path: string, reason: string): never {
  throw new TypeError(`Engine Output Golden V1 validation failed at ${path}: ${reason}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(path, "must be a plain object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, "must be a plain object");
  if (Object.getOwnPropertySymbols(value).length > 0) fail(path, "symbol keys are not supported");
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) fail(`${path}.${key}`, "non-enumerable fields are not supported");
    if (!("value" in descriptor)) fail(`${path}.${key}`, "accessor fields are not supported");
  }
  return value as Record<string, unknown>;
}

function exactFields(value: Record<string, unknown>, fields: readonly string[], path: string): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${path}.${key}`, "unknown field");
  for (const key of fields) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key}`, "required field is missing");
}

function hash(value: unknown, path: string): void {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(path, "must be exactly 64 lowercase hexadecimal characters");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

export function parseEngineOutputGoldenV1(value: unknown): EngineOutputGoldenV1 {
  const golden = record(value, "$");
  exactFields(golden, FIELDS, "$");
  if (golden.version !== "engine-output-golden-v1") fail("$.version", "must equal \"engine-output-golden-v1\"");
  if (typeof golden.fixtureId !== "string" || golden.fixtureId.length === 0) fail("$.fixtureId", "must be a non-empty string");
  for (const field of HASH_FIELDS) hash(golden[field], `$.${field}`);
  const exactMetrics = record(golden.exactMetrics, "$.exactMetrics");
  canonicalizeBaselineValueV1(exactMetrics, "$.exactMetrics");
  const manifest = parseDomainModelBaselineManifestV1(golden.manifest);
  return deepFreeze(structuredClone({ ...golden, exactMetrics, manifest })) as EngineOutputGoldenV1;
}
