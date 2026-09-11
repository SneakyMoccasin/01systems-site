import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { StructuralObservationFingerprints } from "./structuralObservationFingerprints";
import {
  createStructuralObservationIdentity,
  evaluateStructuralObservationCompatibility,
  projectStructuralObservationIdentity,
} from "./structuralObservationIdentity";
import { evaluateSavedRunCompatibility } from "../savedRunPersistence";

const hashes = {
  definition: "1".repeat(64),
  planA: "2".repeat(64),
  planB: "3".repeat(64),
};

function fingerprints(): StructuralObservationFingerprints {
  return {
    fingerprintAlgorithm: "sha256",
    canonicalizationVersion: "structural-semantic-json-v1",
    structuralDefinitionFingerprint: hashes.definition,
    scenarioPlanFingerprintA: hashes.planA,
    scenarioPlanFingerprintB: hashes.planB,
  };
}

function identity(overrides: Record<string, unknown> = {}) {
  return {
    version: "structural-observation-v1",
    resultSchemaVersion: "decision-space-snapshot-v1",
    canonicalizationVersion: "structural-semantic-json-v1",
    fingerprintAlgorithm: "sha256",
    structuralDefinitionFingerprint: hashes.definition,
    scenarioPlanFingerprintA: hashes.planA,
    scenarioPlanFingerprintB: hashes.planB,
    horizon: 36,
    ...overrides,
  };
}

test("creates a minimal immutable identity from existing fingerprints", () => {
  const source = fingerprints();
  const before = structuredClone(source);
  const result = createStructuralObservationIdentity({ fingerprints: source, horizon: 36 });
  assert.deepEqual(result, identity());
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(source), false);
  assert.deepEqual(Object.keys(result).sort(), Object.keys(identity()).sort());
  for (const forbidden of [
    "executionIdentity",
    "profileIdentity",
    "structuralMargin",
    "trajectories",
    "provenance",
    "diagnostics",
    "snapshots",
    "label",
    "language",
  ]) {
    assert.equal(forbidden in result, false);
  }
});

test("creation rejects invalid horizon, hash, algorithm, and canonicalization", () => {
  for (const horizon of [0, -1, 1.5]) {
    assert.throws(() => createStructuralObservationIdentity({ fingerprints: fingerprints(), horizon }));
  }
  for (const invalid of ["a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
    assert.throws(() =>
      createStructuralObservationIdentity({
        fingerprints: { ...fingerprints(), scenarioPlanFingerprintA: invalid },
        horizon: 36,
      })
    );
  }
  assert.throws(() =>
    createStructuralObservationIdentity({
      fingerprints: { ...fingerprints(), fingerprintAlgorithm: "sha512" as never },
      horizon: 36,
    })
  );
  assert.throws(() =>
    createStructuralObservationIdentity({
      fingerprints: {
        ...fingerprints(),
        canonicalizationVersion: "future" as never,
      },
      horizon: 36,
    })
  );
});

test("projects a valid runtime identity into a fresh frozen whitelist", () => {
  const input = { ...identity(), unknown: { leaked: true } };
  const before = structuredClone(input);
  const projected = projectStructuralObservationIdentity(input);
  assert.deepEqual(projected, identity());
  assert.notEqual(projected, input);
  assert.equal(Object.isFrozen(projected), true);
  assert.equal("unknown" in (projected ?? {}), false);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.unknown), false);
});

test("projection fails closed without throwing for malformed or unsupported input", () => {
  for (const input of [
    null,
    "identity",
    [],
    {},
    identity({ horizon: 0 }),
    identity({ horizon: 1.5 }),
    identity({ structuralDefinitionFingerprint: "bad" }),
    identity({ fingerprintAlgorithm: "sha512" }),
    identity({ canonicalizationVersion: "future" }),
    identity({ resultSchemaVersion: "future" }),
    identity({ version: "structural-observation-v2" }),
  ]) {
    assert.doesNotThrow(() => projectStructuralObservationIdentity(input));
    assert.equal(projectStructuralObservationIdentity(input), null);
  }
});

test("classifies absence and malformed identities with exact precedence", () => {
  assert.deepEqual(evaluateStructuralObservationCompatibility(null, undefined), {
    classification: "both-unobserved",
    comparable: false,
  });
  assert.equal(
    evaluateStructuralObservationCompatibility(null, identity()).classification,
    "only-one-observed"
  );
  assert.equal(
    evaluateStructuralObservationCompatibility(identity(), undefined).classification,
    "only-one-observed"
  );
  assert.equal(
    evaluateStructuralObservationCompatibility({}, identity({ version: "v2" })).classification,
    "malformed-observation-identity"
  );
});

test("classifies version, schema, protocol, and horizon before fingerprints", () => {
  const cases = [
    [{ version: "structural-observation-v2", horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) }, "different-observation-version"],
    [{ resultSchemaVersion: "decision-space-snapshot-v2", horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) }, "different-result-schema"],
    [{ canonicalizationVersion: "structural-semantic-json-v2", horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) }, "different-fingerprint-protocol"],
    [{ fingerprintAlgorithm: "sha512", horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) }, "different-fingerprint-protocol"],
    [{ horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) }, "different-horizon"],
  ] as const;
  for (const [changes, expected] of cases) {
    assert.equal(
      evaluateStructuralObservationCompatibility(identity(), identity(changes)).classification,
      expected
    );
  }
  assert.equal(
    evaluateStructuralObservationCompatibility(
      identity({ version: "structural-observation-v2" }),
      identity({ version: "structural-observation-v2" })
    ).classification,
    "different-observation-version"
  );
});

test("classifies each semantic fingerprint and full compatibility", () => {
  const cases = [
    [{ structuralDefinitionFingerprint: "4".repeat(64) }, "different-structural-definition"],
    [{ scenarioPlanFingerprintA: "4".repeat(64) }, "different-scenario-plan-a"],
    [{ scenarioPlanFingerprintB: "4".repeat(64) }, "different-scenario-plan-b"],
  ] as const;
  for (const [changes, expected] of cases) {
    assert.equal(
      evaluateStructuralObservationCompatibility(identity(), identity(changes)).classification,
      expected
    );
  }
  assert.deepEqual(evaluateStructuralObservationCompatibility(identity(), identity()), {
    classification: "compatible",
    comparable: true,
  });
});

test("compatibility is deterministic, symmetric, frozen, and non-mutating", () => {
  const left = identity();
  const right = identity({ horizon: 48, scenarioPlanFingerprintA: "4".repeat(64) });
  const before = structuredClone([left, right]);
  const first = evaluateStructuralObservationCompatibility(left, right);
  const second = evaluateStructuralObservationCompatibility(left, right);
  assert.deepEqual(first, second);
  assert.deepEqual(first, evaluateStructuralObservationCompatibility(right, left));
  assert.equal(Object.isFrozen(first), true);
  assert.deepEqual([left, right], before);
  assert.equal(Object.isFrozen(left), false);
  assert.equal(Object.isFrozen(right), false);
});

test("engine compatibility remains independent of observation mismatch", () => {
  const executionIdentity = {
    domainId: "municipal",
    profileId: "legacy-municipal-v1",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "transport-causal-subset-v2",
  } as const;
  const snapshot = (scenario: "A" | "B") => ({
    snapshotId: scenario,
    createdAt: 1,
    engineState: { margin: 1 } as never,
    metadata: { caseId: null, scenario, modelVersion: executionIdentity.modelVersion },
    executionIdentity,
  });
  assert.equal(
    evaluateSavedRunCompatibility(snapshot("A"), snapshot("B")).classification,
    "compatible"
  );
  assert.equal(
    evaluateStructuralObservationCompatibility(
      identity(),
      identity({ structuralDefinitionFingerprint: "4".repeat(64) })
    ).classification,
    "different-structural-definition"
  );
  const source = readFileSync(
    "src/pilotFastighet/analysis/structuralObservation/structuralObservationIdentity.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /SavedRunSnapshot|ExecutableIdentity|evaluateSavedRunCompatibility/);
});
