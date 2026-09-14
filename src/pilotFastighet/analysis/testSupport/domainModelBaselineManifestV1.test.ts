import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDomainModelBaselineManifestV1,
  validateDomainModelBaselineManifestV1,
} from "./domainModelBaselineManifestV1";

const HASH = "a".repeat(64);
const COMMIT = "b".repeat(40);

function manifest(): Record<string, unknown> {
  return {
    schemaVersion: "domain-model-baseline-manifest-v1",
    baselineSource: { baselineCodeCommit: COMMIT, baselineCodeTreeHash: COMMIT, m0bStartCommit: COMMIT },
    canonicalization: { algorithm: "canonical-json-v1", hashAlgorithm: "sha256-lowercase-hex" },
    engine: { modelVersion: "model-v1", algorithmVersion: "engine-v1" },
    profile: { domainId: "realEstate", profileId: "legacy-real-estate-v1", modelVersion: "model-v1", calibrationVersion: "calibration-v1", semanticPayloadHash: HASH },
    executionSurface: "initiative-scheduled-analysis",
    input: { fixtureId: "fixture-1", canonicalHash: HASH },
    result: { trajectoryHash: HASH, baselineHash: HASH, structuralDefinitionFingerprint: HASH, expectedExactMetrics: { margin: 1.25, periods: [1, 2], nested: { exact: true } } },
    createdDate: "2026-09-14",
    reviewedDate: "2026-09-14",
  };
}

test("accepts a complete strict V1 manifest", () => {
  const value = manifest();
  assert.doesNotThrow(() => validateDomainModelBaselineManifestV1(value));
});

test("rejects absent optional result hashes combined with empty exact metrics", () => {
  const value = manifest();
  value.result = { expectedExactMetrics: {} };
  assert.throws(
    () => validateDomainModelBaselineManifestV1(value),
    /\$\.result: must contain at least one hash or fingerprint, or at least one expected exact metric/
  );
});

test("accepts metrics as the sole relevant result content", () => {
  const value = manifest();
  value.result = { expectedExactMetrics: { exactMargin: 1 } };
  assert.doesNotThrow(() => validateDomainModelBaselineManifestV1(value));
});

test("accepts baselineHash as the sole relevant result hash", () => {
  const value = manifest();
  value.result = { baselineHash: HASH, expectedExactMetrics: {} };
  assert.doesNotThrow(() => validateDomainModelBaselineManifestV1(value));
});

test("parse returns a detached, recursively frozen copy", () => {
  const value = manifest();
  const parsed = parseDomainModelBaselineManifestV1(value);
  assert.notStrictEqual(parsed, value);
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.profile), true);
  assert.equal(Object.isFrozen(parsed.result), true);
  assert.equal(Object.isFrozen(parsed.result.expectedExactMetrics), true);
  assert.equal(Object.isFrozen(parsed.result.expectedExactMetrics.periods), true);

  (value.profile as Record<string, unknown>).profileId = "changed-after-parse";
  ((value.result as Record<string, unknown>).expectedExactMetrics as Record<string, unknown>).margin = 999;
  assert.equal(parsed.profile.profileId, "legacy-real-estate-v1");
  assert.equal(parsed.result.expectedExactMetrics.margin, 1.25);
  assert.throws(() => { (parsed.profile as { profileId: string }).profileId = "mutated"; }, TypeError);
  assert.throws(() => { (parsed.result.expectedExactMetrics.periods as number[]).push(3); }, TypeError);
  assert.equal(parsed.profile.profileId, "legacy-real-estate-v1");
  assert.deepEqual(parsed.result.expectedExactMetrics.periods, [1, 2]);
});

test("rejects unknown fields at every fixed manifest object level", () => {
  const cases: ReadonlyArray<readonly [string, (value: Record<string, unknown>) => Record<string, unknown>]> = [
    ["$.unknown", (value) => value],
    ["$.baselineSource.unknown", (value) => value.baselineSource as Record<string, unknown>],
    ["$.canonicalization.unknown", (value) => value.canonicalization as Record<string, unknown>],
    ["$.engine.unknown", (value) => value.engine as Record<string, unknown>],
    ["$.profile.unknown", (value) => value.profile as Record<string, unknown>],
    ["$.input.unknown", (value) => value.input as Record<string, unknown>],
    ["$.result.unknown", (value) => value.result as Record<string, unknown>],
  ];
  for (const [path, select] of cases) {
    const value = manifest();
    select(value).unknown = true;
    assert.throws(() => validateDomainModelBaselineManifestV1(value), new RegExp(`${path.replaceAll("$", "\\$").replaceAll(".", "\\.")}: unknown field`));
  }
  const missing = manifest();
  delete (missing.input as Record<string, unknown>).fixtureId;
  assert.throws(() => validateDomainModelBaselineManifestV1(missing), /\$\.input\.fixtureId: required field is missing/);
});

test("rejects incorrect versions, protocols, hashes, commits, and dates", () => {
  const cases: readonly [(value: Record<string, unknown>) => void, RegExp][] = [
    [(value) => { value.schemaVersion = "future"; }, /\$\.schemaVersion/],
    [(value) => { (value.canonicalization as Record<string, unknown>).algorithm = "other"; }, /\$\.canonicalization\.algorithm/],
    [(value) => { (value.profile as Record<string, unknown>).semanticPayloadHash = "A".repeat(64); }, /\$\.profile\.semanticPayloadHash/],
    [(value) => { (value.baselineSource as Record<string, unknown>).baselineCodeCommit = "b".repeat(39); }, /\$\.baselineSource\.baselineCodeCommit/],
    [(value) => { (value.baselineSource as Record<string, unknown>).baselineCodeTreeHash = "B".repeat(40); }, /\$\.baselineSource\.baselineCodeTreeHash/],
    [(value) => { (value.baselineSource as Record<string, unknown>).m0bStartCommit = "not-a-commit"; }, /\$\.baselineSource\.m0bStartCommit/],
    [(value) => { (value.input as Record<string, unknown>).canonicalHash = "a".repeat(63); }, /\$\.input\.canonicalHash/],
    [(value) => { (value.result as Record<string, unknown>).trajectoryHash = "A".repeat(64); }, /\$\.result\.trajectoryHash/],
    [(value) => { (value.result as Record<string, unknown>).baselineHash = "a".repeat(63); }, /\$\.result\.baselineHash/],
    [(value) => { value.createdDate = "2026-13-01"; }, /\$\.createdDate: must be a valid calendar date/],
    [(value) => { value.reviewedDate = "2026-02-30"; }, /\$\.reviewedDate: must be a valid calendar date/],
  ];
  for (const [mutate, pattern] of cases) {
    const value = manifest();
    mutate(value);
    assert.throws(() => validateDomainModelBaselineManifestV1(value), pattern);
  }
});

test("rejects non-empty requirements and invalid exact metric JSON with precise paths", () => {
  for (const [mutate, pattern] of [
    [(value: Record<string, unknown>) => { (value.engine as Record<string, unknown>).modelVersion = ""; }, /\$\.engine\.modelVersion: must be a non-empty string/],
    [(value: Record<string, unknown>) => { value.executionSurface = ""; }, /\$\.executionSurface: must be a non-empty string/],
    [(value: Record<string, unknown>) => { (value.input as Record<string, unknown>).fixtureId = ""; }, /\$\.input\.fixtureId: must be a non-empty string/],
  ] as const) {
    const value = manifest();
    mutate(value);
    assert.throws(() => validateDomainModelBaselineManifestV1(value), pattern);
  }
  const invalidMetric = manifest();
  (invalidMetric.result as Record<string, unknown>).expectedExactMetrics = { nested: { value: undefined } };
  assert.throws(() => validateDomainModelBaselineManifestV1(invalidMetric), /\$\.result\.expectedExactMetrics\.nested\.value: undefined is not supported/);
});
