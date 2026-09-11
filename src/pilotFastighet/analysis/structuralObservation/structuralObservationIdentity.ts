import type { StructuralObservationFingerprints } from "./structuralObservationFingerprints";

export type StructuralObservationIdentity = Readonly<{
  version: "structural-observation-v1";
  resultSchemaVersion: "decision-space-snapshot-v1";
  canonicalizationVersion: "structural-semantic-json-v1";
  fingerprintAlgorithm: "sha256";
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
  horizon: number;
}>;

export type StructuralObservationCompatibility =
  | Readonly<{ classification: "both-unobserved"; comparable: false }>
  | Readonly<{ classification: "only-one-observed"; comparable: false }>
  | Readonly<{
      classification: "malformed-observation-identity";
      comparable: false;
    }>
  | Readonly<{
      classification: "different-observation-version";
      comparable: false;
    }>
  | Readonly<{
      classification: "different-result-schema";
      comparable: false;
    }>
  | Readonly<{
      classification: "different-fingerprint-protocol";
      comparable: false;
    }>
  | Readonly<{ classification: "different-horizon"; comparable: false }>
  | Readonly<{
      classification: "different-structural-definition";
      comparable: false;
    }>
  | Readonly<{ classification: "different-scenario-plan-a"; comparable: false }>
  | Readonly<{ classification: "different-scenario-plan-b"; comparable: false }>
  | Readonly<{ classification: "compatible"; comparable: true }>;

type ReadableStructuralObservationIdentity = Readonly<{
  version: string;
  resultSchemaVersion: string;
  canonicalizationVersion: string;
  fingerprintAlgorithm: string;
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
  horizon: number;
}>;

type StructuralObservationIdentityProjection =
  | Readonly<{ status: "absent" }>
  | Readonly<{ status: "malformed" }>
  | Readonly<{ status: "unsupported-version"; identity: ReadableStructuralObservationIdentity }>
  | Readonly<{ status: "readable"; identity: ReadableStructuralObservationIdentity }>;

const OBSERVATION_VERSION = "structural-observation-v1";
const RESULT_SCHEMA_VERSION = "decision-space-snapshot-v1";
const CANONICALIZATION_VERSION = "structural-semantic-json-v1";
const FINGERPRINT_ALGORITHM = "sha256";
const SHA256_LOWERCASE_HEX = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && SHA256_LOWERCASE_HEX.test(value);
}

function freezeCompatibility(
  classification: StructuralObservationCompatibility["classification"],
  comparable: boolean
): StructuralObservationCompatibility {
  return Object.freeze({ classification, comparable }) as StructuralObservationCompatibility;
}

function copyReadableIdentity(
  input: Record<string, unknown>
): ReadableStructuralObservationIdentity | null {
  if (
    typeof input.version !== "string" ||
    typeof input.resultSchemaVersion !== "string" ||
    typeof input.canonicalizationVersion !== "string" ||
    typeof input.fingerprintAlgorithm !== "string" ||
    !isFingerprint(input.structuralDefinitionFingerprint) ||
    !isFingerprint(input.scenarioPlanFingerprintA) ||
    !isFingerprint(input.scenarioPlanFingerprintB) ||
    !isPositiveInteger(input.horizon)
  ) {
    return null;
  }
  return Object.freeze({
    version: input.version,
    resultSchemaVersion: input.resultSchemaVersion,
    canonicalizationVersion: input.canonicalizationVersion,
    fingerprintAlgorithm: input.fingerprintAlgorithm,
    structuralDefinitionFingerprint: input.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: input.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: input.scenarioPlanFingerprintB,
    horizon: input.horizon,
  });
}

function classifyIdentity(input: unknown): StructuralObservationIdentityProjection {
  if (input === null || input === undefined) return Object.freeze({ status: "absent" });
  if (!isRecord(input)) return Object.freeze({ status: "malformed" });
  const identity = copyReadableIdentity(input);
  if (!identity) return Object.freeze({ status: "malformed" });
  return identity.version === OBSERVATION_VERSION
    ? Object.freeze({ status: "readable", identity })
    : Object.freeze({ status: "unsupported-version", identity });
}

function assertFingerprint(value: unknown, field: string): asserts value is string {
  if (!isFingerprint(value)) {
    throw new TypeError(
      `Structural observation identity failed: ${field} must be exactly 64 lowercase hexadecimal characters.`
    );
  }
}

export function createStructuralObservationIdentity(input: Readonly<{
  fingerprints: StructuralObservationFingerprints;
  horizon: number;
}>): StructuralObservationIdentity {
  if (!isPositiveInteger(input.horizon)) {
    throw new TypeError(
      "Structural observation identity failed: horizon must be a positive integer."
    );
  }
  if (input.fingerprints.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM) {
    throw new TypeError(
      "Structural observation identity failed: unsupported fingerprint algorithm."
    );
  }
  if (input.fingerprints.canonicalizationVersion !== CANONICALIZATION_VERSION) {
    throw new TypeError(
      "Structural observation identity failed: unsupported canonicalization version."
    );
  }
  assertFingerprint(
    input.fingerprints.structuralDefinitionFingerprint,
    "structuralDefinitionFingerprint"
  );
  assertFingerprint(
    input.fingerprints.scenarioPlanFingerprintA,
    "scenarioPlanFingerprintA"
  );
  assertFingerprint(
    input.fingerprints.scenarioPlanFingerprintB,
    "scenarioPlanFingerprintB"
  );
  return Object.freeze({
    version: OBSERVATION_VERSION,
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    fingerprintAlgorithm: FINGERPRINT_ALGORITHM,
    structuralDefinitionFingerprint:
      input.fingerprints.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: input.fingerprints.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: input.fingerprints.scenarioPlanFingerprintB,
    horizon: input.horizon,
  });
}

export function projectStructuralObservationIdentity(
  input: unknown
): StructuralObservationIdentity | null {
  const projection = classifyIdentity(input);
  if (projection.status !== "readable") return null;
  const identity = projection.identity;
  if (
    identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION ||
    identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM
  ) {
    return null;
  }
  return Object.freeze({
    version: OBSERVATION_VERSION,
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    fingerprintAlgorithm: FINGERPRINT_ALGORITHM,
    structuralDefinitionFingerprint: identity.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: identity.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: identity.scenarioPlanFingerprintB,
    horizon: identity.horizon,
  });
}

export function evaluateStructuralObservationCompatibility(
  left: unknown,
  right: unknown
): StructuralObservationCompatibility {
  const a = classifyIdentity(left);
  const b = classifyIdentity(right);
  if (a.status === "absent" && b.status === "absent") {
    return freezeCompatibility("both-unobserved", false);
  }
  if (a.status === "absent" || b.status === "absent") {
    return freezeCompatibility("only-one-observed", false);
  }
  if (a.status === "malformed" || b.status === "malformed") {
    return freezeCompatibility("malformed-observation-identity", false);
  }
  if (
    a.status === "unsupported-version" ||
    b.status === "unsupported-version" ||
    a.identity.version !== b.identity.version
  ) {
    return freezeCompatibility("different-observation-version", false);
  }
  if (
    a.identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION ||
    b.identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION ||
    a.identity.resultSchemaVersion !== b.identity.resultSchemaVersion
  ) {
    return freezeCompatibility("different-result-schema", false);
  }
  if (
    a.identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    b.identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    a.identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM ||
    b.identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM ||
    a.identity.canonicalizationVersion !== b.identity.canonicalizationVersion ||
    a.identity.fingerprintAlgorithm !== b.identity.fingerprintAlgorithm
  ) {
    return freezeCompatibility("different-fingerprint-protocol", false);
  }
  if (a.identity.horizon !== b.identity.horizon) {
    return freezeCompatibility("different-horizon", false);
  }
  if (
    a.identity.structuralDefinitionFingerprint !==
    b.identity.structuralDefinitionFingerprint
  ) {
    return freezeCompatibility("different-structural-definition", false);
  }
  if (a.identity.scenarioPlanFingerprintA !== b.identity.scenarioPlanFingerprintA) {
    return freezeCompatibility("different-scenario-plan-a", false);
  }
  if (a.identity.scenarioPlanFingerprintB !== b.identity.scenarioPlanFingerprintB) {
    return freezeCompatibility("different-scenario-plan-b", false);
  }
  return freezeCompatibility("compatible", true);
}
