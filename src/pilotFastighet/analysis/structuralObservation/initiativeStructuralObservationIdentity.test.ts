import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { buildInitiativeStructuralObservationFingerprints } from "./initiativeStructuralObservationFingerprints";
import {
  createInitiativeStructuralObservationIdentity,
  evaluateInitiativeStructuralObservationCompatibility,
  projectInitiativeStructuralObservationIdentity,
  type InitiativeStructuralObservationIdentity,
} from "./initiativeStructuralObservationIdentity";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
} from "./runInitiativeScheduledAnalysis";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function fingerprints() {
  return {
    version: "initiative-structural-observation-fingerprints-v1" as const,
    fingerprintAlgorithm: "sha256" as const,
    canonicalizationVersion: "structural-semantic-json-v1" as const,
    structuralDefinitionFingerprint: HASH_A,
    scenarioPlanFingerprintA: HASH_B,
    scenarioPlanFingerprintB: HASH_C,
  };
}

function identity(): InitiativeStructuralObservationIdentity {
  return createInitiativeStructuralObservationIdentity({ fingerprints: fingerprints(), horizon: 3 });
}

function changed(
  base: InitiativeStructuralObservationIdentity,
  values: Partial<Record<keyof InitiativeStructuralObservationIdentity, unknown>>
): unknown {
  return { ...base, ...values };
}

test("constructs the complete V2 identity from exact 7A hashes without rehashing", () => {
  const source = fingerprints();
  const before = structuredClone(source);
  const actual = createInitiativeStructuralObservationIdentity({ fingerprints: source, horizon: 3 });
  assert.deepEqual(actual, {
    version: "initiative-structural-observation-identity-v1",
    structuralObservationSchemaVersion: "structural-observation-v2",
    resultSchemaVersion: "structural-observation-v2",
    fingerprintsVersion: "initiative-structural-observation-fingerprints-v1",
    fingerprintAlgorithm: "sha256",
    canonicalizationVersion: "structural-semantic-json-v1",
    definitionPayloadVersion: "initiative-structural-definition-fingerprint-v2",
    scenarioPlanPayloadVersion: "initiative-scenario-plan-fingerprint-v2",
    horizon: 3,
    structuralDefinitionFingerprint: HASH_A,
    scenarioPlanFingerprintA: HASH_B,
    scenarioPlanFingerprintB: HASH_C,
  });
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(source), false);
  assert.equal(Object.isFrozen(actual), true);
  assert.strictEqual(actual.structuralDefinitionFingerprint, source.structuralDefinitionFingerprint);
});

test("factory rejects invalid horizon, fingerprint protocols, and malformed hashes", () => {
  for (const horizon of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => createInitiativeStructuralObservationIdentity({ fingerprints: fingerprints(), horizon }));
  }
  for (const patch of [
    { version: "future" },
    { fingerprintAlgorithm: "sha512" },
    { canonicalizationVersion: "future" },
  ]) {
    assert.throws(() => createInitiativeStructuralObservationIdentity({ fingerprints: { ...fingerprints(), ...patch } as never, horizon: 3 }));
  }
  for (const hash of ["", "a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
    assert.throws(() => createInitiativeStructuralObservationIdentity({ fingerprints: { ...fingerprints(), structuralDefinitionFingerprint: hash }, horizon: 3 }));
  }
});

test("runtime projector accepts exact hashes, ignores extras, and returns a detached frozen whitelist", () => {
  const source = { ...identity(), extra: { diagnostics: ["excluded"] } };
  const projected = projectInitiativeStructuralObservationIdentity(source);
  assert.deepEqual(projected, identity());
  assert.equal(Object.hasOwn(projected ?? {}, "extra"), false);
  assert.equal(Object.isFrozen(projected), true);
  assert.notStrictEqual(projected, source);
});

test("runtime projector rejects absent, malformed, unsupported, and invalid hash input", () => {
  assert.equal(projectInitiativeStructuralObservationIdentity(undefined), null);
  assert.equal(projectInitiativeStructuralObservationIdentity({}), null);
  assert.equal(projectInitiativeStructuralObservationIdentity(changed(identity(), { version: "future" })), null);
  for (const hash of ["", "a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
    assert.equal(projectInitiativeStructuralObservationIdentity(changed(identity(), { scenarioPlanFingerprintA: hash })), null);
  }
  assert.equal(projectInitiativeStructuralObservationIdentity(changed(identity(), { horizon: 0 })), null);
});

test("compatibility distinguishes missing, malformed, and unsupported identity versions", () => {
  const current = identity();
  assert.deepEqual(evaluateInitiativeStructuralObservationCompatibility(undefined, current), { classification: "missing-identity", comparable: false });
  assert.deepEqual(evaluateInitiativeStructuralObservationCompatibility({}, current), { classification: "malformed-identity", comparable: false });
  assert.deepEqual(evaluateInitiativeStructuralObservationCompatibility(changed(current, { version: "future" }), current), { classification: "unsupported-identity-version", comparable: false });
});

test("compatibility reports protocol, schema, horizon, definition, A, and B mismatch", () => {
  const current = identity();
  const cases: readonly [Partial<Record<keyof InitiativeStructuralObservationIdentity, unknown>>, string][] = [
    [{ fingerprintAlgorithm: "future" }, "fingerprint-protocol-mismatch"],
    [{ definitionPayloadVersion: "future" }, "fingerprint-protocol-mismatch"],
    [{ structuralObservationSchemaVersion: "future" }, "structural-observation-schema-mismatch"],
    [{ resultSchemaVersion: "future" }, "structural-observation-schema-mismatch"],
    [{ horizon: 4 }, "horizon-mismatch"],
    [{ structuralDefinitionFingerprint: "d".repeat(64) }, "structural-definition-mismatch"],
    [{ scenarioPlanFingerprintA: "d".repeat(64) }, "scenario-plan-a-mismatch"],
    [{ scenarioPlanFingerprintB: "d".repeat(64) }, "scenario-plan-b-mismatch"],
  ];
  for (const [patch, classification] of cases) {
    assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, patch), current).classification, classification);
  }
  assert.deepEqual(evaluateInitiativeStructuralObservationCompatibility(current, identity()), { classification: "compatible", comparable: true });
});

test("compatibility precedence is deterministic", () => {
  const current = identity();
  assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, {
    fingerprintAlgorithm: "future",
    structuralObservationSchemaVersion: "future",
    horizon: 4,
  }), current).classification, "fingerprint-protocol-mismatch");
  assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, {
    structuralObservationSchemaVersion: "future",
    horizon: 4,
  }), current).classification, "structural-observation-schema-mismatch");
  assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, {
    horizon: 4,
    structuralDefinitionFingerprint: "d".repeat(64),
    scenarioPlanFingerprintA: "e".repeat(64),
  }), current).classification, "horizon-mismatch");
  assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, {
    structuralDefinitionFingerprint: "d".repeat(64),
    scenarioPlanFingerprintA: "e".repeat(64),
    scenarioPlanFingerprintB: "f".repeat(64),
  }), current).classification, "structural-definition-mismatch");
  assert.equal(evaluateInitiativeStructuralObservationCompatibility(changed(current, {
    scenarioPlanFingerprintA: "e".repeat(64),
    scenarioPlanFingerprintB: "f".repeat(64),
  }), current).classification, "scenario-plan-a-mismatch");
});

test("V1 observation and executable identities cannot be projected as V2", () => {
  assert.equal(projectInitiativeStructuralObservationIdentity({
    version: "structural-observation-v1",
    resultSchemaVersion: "decision-space-snapshot-v1",
    canonicalizationVersion: "structural-semantic-json-v1",
    fingerprintAlgorithm: "sha256",
    structuralDefinitionFingerprint: HASH_A,
    scenarioPlanFingerprintA: HASH_B,
    scenarioPlanFingerprintB: HASH_C,
    horizon: 3,
  }), null);
  assert.equal(projectInitiativeStructuralObservationIdentity({ version: "executable-identity-v1", profileId: "x" }), null);
});

test("identity excludes execution, diagnostics, snapshots, engine context, and margin", () => {
  const serialized = JSON.stringify(identity());
  assert.doesNotMatch(serialized, /execution|diagnostic|snapshot|engineContext|structuralMargin/i);
  assert.deepEqual(identity(), identity());
});

test("real 7A fingerprints flow end to end into identity unchanged", async () => {
  const input = {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon: 2,
    contract: {
      version: "structural-observation-v2",
      initiatives: [{ id: "initiative-1", effectDefinitionId: "early_refinancing", prerequisites: [], resourceClaims: [] }],
      resources: [],
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: [{ initiativeId: "initiative-1", executionStep: 1 }],
      B: [{ initiativeId: "initiative-1", executionStep: 2 }],
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  } as InitiativeScheduledAnalysisInputV1;
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(input);
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const prepared = prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
  const realFingerprints = await buildInitiativeStructuralObservationFingerprints(prepared);
  const actual = createInitiativeStructuralObservationIdentity({ fingerprints: realFingerprints, horizon: prepared.horizon });
  assert.equal(actual.structuralDefinitionFingerprint, realFingerprints.structuralDefinitionFingerprint);
  assert.equal(actual.scenarioPlanFingerprintA, realFingerprints.scenarioPlanFingerprintA);
  assert.equal(actual.scenarioPlanFingerprintB, realFingerprints.scenarioPlanFingerprintB);
});

test("production source contains no hashing, runtime, persistence, result-data, or V1 identity dependency", () => {
  const source = readFileSync(new URL("./initiativeStructuralObservationIdentity.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /sha256StructuralFingerprint|buildInitiativeStructuralObservationFingerprints|runInitiative|savedRun|localStorage|DecisionSpaceSnapshot|Diagnostic|StructuralMargin|ExecutableIdentity|from "\.\/structuralObservationIdentity"/);
});
