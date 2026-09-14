import {
  canonicalizeBaselineValueV1,
  type BaselineJsonValue,
} from "./baselineCanonicalizationV1";

export type DomainModelBaselineManifestV1 = Readonly<{
  schemaVersion: "domain-model-baseline-manifest-v1";
  baselineSource: Readonly<{
    baselineCodeCommit: string;
    baselineCodeTreeHash: string;
    m0bStartCommit: string;
  }>;
  canonicalization: Readonly<{
    algorithm: "canonical-json-v1";
    hashAlgorithm: "sha256-lowercase-hex";
  }>;
  engine: Readonly<{
    modelVersion: string;
    algorithmVersion: string;
  }>;
  profile: Readonly<{
    domainId: string;
    profileId: string;
    modelVersion: string;
    calibrationVersion: string;
    semanticPayloadHash: string;
  }>;
  executionSurface: string;
  input: Readonly<{
    fixtureId: string;
    canonicalHash: string;
  }>;
  result: Readonly<{
    trajectoryHash?: string;
    terminalStateHash?: string;
    marginHistoryHash?: string;
    constraintHistoryHash?: string;
    cascadeEventHash?: string;
    provenanceHash?: string;
    comparisonHash?: string;
    structuralDefinitionFingerprint?: string;
    scenarioPlanFingerprintA?: string;
    scenarioPlanFingerprintB?: string;
    expectedExactMetrics: Readonly<Record<string, BaselineJsonValue>>;
  }>;
  createdDate: string;
  reviewedDate: string;
}>;

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOP_LEVEL_FIELDS = ["schemaVersion", "baselineSource", "canonicalization", "engine", "profile", "executionSurface", "input", "result", "createdDate", "reviewedDate"] as const;
const RESULT_HASH_FIELDS = ["trajectoryHash", "terminalStateHash", "marginHistoryHash", "constraintHistoryHash", "cascadeEventHash", "provenanceHash", "comparisonHash", "structuralDefinitionFingerprint", "scenarioPlanFingerprintA", "scenarioPlanFingerprintB"] as const;

function fail(path: string, reason: string): never {
  throw new TypeError(`Domain Model Baseline Manifest V1 validation failed at ${path}: ${reason}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
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
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) fail(`${path}.${key}`, "unknown field");
  }
  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key}`, "required field is missing");
  }
}

function nonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
}

function literal(value: unknown, expected: string, path: string): void {
  if (value !== expected) fail(path, `must equal ${JSON.stringify(expected)}`);
}

function hash(value: unknown, path: string): void {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(path, "must be exactly 64 lowercase hexadecimal characters");
}

function gitObject(value: unknown, path: string): void {
  if (typeof value !== "string" || !GIT_OBJECT_PATTERN.test(value)) fail(path, "must be exactly 40 lowercase hexadecimal characters");
}

function date(value: unknown, path: string): void {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) fail(path, "must use YYYY-MM-DD format");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(path, "must be a valid calendar date");
}

function cloneAndFreeze(value: BaselineJsonValue): BaselineJsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneAndFreeze(entry)));
  }
  const object = value as { readonly [key: string]: BaselineJsonValue };
  const clone: Record<string, BaselineJsonValue> = {};
  for (const key of Object.keys(object)) clone[key] = cloneAndFreeze(object[key]);
  return Object.freeze(clone);
}

export function validateDomainModelBaselineManifestV1(value: unknown): asserts value is DomainModelBaselineManifestV1 {
  const manifest = record(value, "$");
  exactFields(manifest, TOP_LEVEL_FIELDS, "$");
  literal(manifest.schemaVersion, "domain-model-baseline-manifest-v1", "$.schemaVersion");

  const baselineSource = record(manifest.baselineSource, "$.baselineSource");
  exactFields(baselineSource, ["baselineCodeCommit", "baselineCodeTreeHash", "m0bStartCommit"], "$.baselineSource");
  gitObject(baselineSource.baselineCodeCommit, "$.baselineSource.baselineCodeCommit");
  gitObject(baselineSource.baselineCodeTreeHash, "$.baselineSource.baselineCodeTreeHash");
  gitObject(baselineSource.m0bStartCommit, "$.baselineSource.m0bStartCommit");

  const canonicalization = record(manifest.canonicalization, "$.canonicalization");
  exactFields(canonicalization, ["algorithm", "hashAlgorithm"], "$.canonicalization");
  literal(canonicalization.algorithm, "canonical-json-v1", "$.canonicalization.algorithm");
  literal(canonicalization.hashAlgorithm, "sha256-lowercase-hex", "$.canonicalization.hashAlgorithm");

  const engine = record(manifest.engine, "$.engine");
  exactFields(engine, ["modelVersion", "algorithmVersion"], "$.engine");
  nonEmptyString(engine.modelVersion, "$.engine.modelVersion");
  nonEmptyString(engine.algorithmVersion, "$.engine.algorithmVersion");

  const profile = record(manifest.profile, "$.profile");
  exactFields(profile, ["domainId", "profileId", "modelVersion", "calibrationVersion", "semanticPayloadHash"], "$.profile");
  for (const field of ["domainId", "profileId", "modelVersion", "calibrationVersion"] as const) nonEmptyString(profile[field], `$.profile.${field}`);
  hash(profile.semanticPayloadHash, "$.profile.semanticPayloadHash");
  nonEmptyString(manifest.executionSurface, "$.executionSurface");

  const input = record(manifest.input, "$.input");
  exactFields(input, ["fixtureId", "canonicalHash"], "$.input");
  nonEmptyString(input.fixtureId, "$.input.fixtureId");
  hash(input.canonicalHash, "$.input.canonicalHash");

  const result = record(manifest.result, "$.result");
  const resultFields = [...RESULT_HASH_FIELDS, "expectedExactMetrics"];
  for (const key of Object.keys(result).sort()) if (!resultFields.includes(key)) fail(`$.result.${key}`, "unknown field");
  if (!Object.prototype.hasOwnProperty.call(result, "expectedExactMetrics")) fail("$.result.expectedExactMetrics", "required field is missing");
  for (const field of RESULT_HASH_FIELDS) if (Object.prototype.hasOwnProperty.call(result, field)) hash(result[field], `$.result.${field}`);
  const metrics = record(result.expectedExactMetrics, "$.result.expectedExactMetrics");
  canonicalizeBaselineValueV1(metrics, "$.result.expectedExactMetrics");
  const hasResultHash = RESULT_HASH_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(result, field));
  if (!hasResultHash && Object.keys(metrics).length === 0) {
    fail("$.result", "must contain at least one hash or fingerprint, or at least one expected exact metric");
  }

  date(manifest.createdDate, "$.createdDate");
  date(manifest.reviewedDate, "$.reviewedDate");
}

export function parseDomainModelBaselineManifestV1(value: unknown): DomainModelBaselineManifestV1 {
  validateDomainModelBaselineManifestV1(value);
  return cloneAndFreeze(value as BaselineJsonValue) as DomainModelBaselineManifestV1;
}
