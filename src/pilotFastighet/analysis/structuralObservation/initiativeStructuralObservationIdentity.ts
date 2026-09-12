import type { InitiativeStructuralObservationFingerprints } from "./initiativeStructuralObservationFingerprints";
import { freezeObservationValue } from "./observationPlanCore";

export type InitiativeStructuralObservationIdentity = Readonly<{
  version: "initiative-structural-observation-identity-v1";
  structuralObservationSchemaVersion: "structural-observation-v2";
  resultSchemaVersion: "structural-observation-v2";
  fingerprintsVersion: "initiative-structural-observation-fingerprints-v1";
  fingerprintAlgorithm: "sha256";
  canonicalizationVersion: "structural-semantic-json-v1";
  definitionPayloadVersion: "initiative-structural-definition-fingerprint-v2";
  scenarioPlanPayloadVersion: "initiative-scenario-plan-fingerprint-v2";
  horizon: number;
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
}>;

export type InitiativeStructuralObservationCompatibility =
  | Readonly<{ classification: "missing-identity"; comparable: false }>
  | Readonly<{ classification: "malformed-identity"; comparable: false }>
  | Readonly<{ classification: "unsupported-identity-version"; comparable: false }>
  | Readonly<{ classification: "structural-observation-schema-mismatch"; comparable: false }>
  | Readonly<{ classification: "fingerprint-protocol-mismatch"; comparable: false }>
  | Readonly<{ classification: "horizon-mismatch"; comparable: false }>
  | Readonly<{ classification: "structural-definition-mismatch"; comparable: false }>
  | Readonly<{ classification: "scenario-plan-a-mismatch"; comparable: false }>
  | Readonly<{ classification: "scenario-plan-b-mismatch"; comparable: false }>
  | Readonly<{ classification: "compatible"; comparable: true }>;

type ReadableIdentity = Readonly<{
  version: string;
  structuralObservationSchemaVersion: string;
  resultSchemaVersion: string;
  fingerprintsVersion: string;
  fingerprintAlgorithm: string;
  canonicalizationVersion: string;
  definitionPayloadVersion: string;
  scenarioPlanPayloadVersion: string;
  horizon: number;
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
}>;

type IdentityProjection =
  | Readonly<{ status: "absent" }>
  | Readonly<{ status: "malformed" }>
  | Readonly<{ status: "unsupported-version"; identity: ReadableIdentity }>
  | Readonly<{ status: "readable"; identity: ReadableIdentity }>;

const IDENTITY_VERSION = "initiative-structural-observation-identity-v1";
const STRUCTURAL_SCHEMA_VERSION = "structural-observation-v2";
const RESULT_SCHEMA_VERSION = "structural-observation-v2";
const FINGERPRINTS_VERSION = "initiative-structural-observation-fingerprints-v1";
const FINGERPRINT_ALGORITHM = "sha256";
const CANONICALIZATION_VERSION = "structural-semantic-json-v1";
const DEFINITION_PAYLOAD_VERSION = "initiative-structural-definition-fingerprint-v2";
const PLAN_PAYLOAD_VERSION = "initiative-scenario-plan-fingerprint-v2";
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

function copyReadableIdentity(input: Record<string, unknown>): ReadableIdentity | null {
  const stringFields = [
    "version",
    "structuralObservationSchemaVersion",
    "resultSchemaVersion",
    "fingerprintsVersion",
    "fingerprintAlgorithm",
    "canonicalizationVersion",
    "definitionPayloadVersion",
    "scenarioPlanPayloadVersion",
  ] as const;
  if (
    stringFields.some((field) => typeof input[field] !== "string") ||
    !isPositiveInteger(input.horizon) ||
    !isFingerprint(input.structuralDefinitionFingerprint) ||
    !isFingerprint(input.scenarioPlanFingerprintA) ||
    !isFingerprint(input.scenarioPlanFingerprintB)
  ) return null;
  return freezeObservationValue({
    version: input.version as string,
    structuralObservationSchemaVersion: input.structuralObservationSchemaVersion as string,
    resultSchemaVersion: input.resultSchemaVersion as string,
    fingerprintsVersion: input.fingerprintsVersion as string,
    fingerprintAlgorithm: input.fingerprintAlgorithm as string,
    canonicalizationVersion: input.canonicalizationVersion as string,
    definitionPayloadVersion: input.definitionPayloadVersion as string,
    scenarioPlanPayloadVersion: input.scenarioPlanPayloadVersion as string,
    horizon: input.horizon,
    structuralDefinitionFingerprint: input.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: input.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: input.scenarioPlanFingerprintB,
  });
}

function classifyIdentity(input: unknown): IdentityProjection {
  if (input === null || input === undefined) return Object.freeze({ status: "absent" });
  if (!isRecord(input)) return Object.freeze({ status: "malformed" });
  const identity = copyReadableIdentity(input);
  if (!identity) return Object.freeze({ status: "malformed" });
  return identity.version === IDENTITY_VERSION
    ? Object.freeze({ status: "readable", identity })
    : Object.freeze({ status: "unsupported-version", identity });
}

function assertFingerprint(value: unknown, field: string): asserts value is string {
  if (!isFingerprint(value)) {
    throw new TypeError(`Initiative structural observation identity failed: ${field} must be exactly 64 lowercase hexadecimal characters.`);
  }
}

function compatibility(
  classification: InitiativeStructuralObservationCompatibility["classification"],
  comparable: boolean
): InitiativeStructuralObservationCompatibility {
  return Object.freeze({ classification, comparable }) as InitiativeStructuralObservationCompatibility;
}

export function createInitiativeStructuralObservationIdentity(input: Readonly<{
  fingerprints: InitiativeStructuralObservationFingerprints;
  horizon: number;
}>): InitiativeStructuralObservationIdentity {
  if (!isPositiveInteger(input.horizon)) throw new TypeError("Initiative structural observation identity failed: horizon must be a positive integer.");
  if (input.fingerprints.version !== FINGERPRINTS_VERSION) throw new TypeError("Initiative structural observation identity failed: unsupported fingerprints version.");
  if (input.fingerprints.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM) throw new TypeError("Initiative structural observation identity failed: unsupported fingerprint algorithm.");
  if (input.fingerprints.canonicalizationVersion !== CANONICALIZATION_VERSION) throw new TypeError("Initiative structural observation identity failed: unsupported canonicalization version.");
  assertFingerprint(input.fingerprints.structuralDefinitionFingerprint, "structuralDefinitionFingerprint");
  assertFingerprint(input.fingerprints.scenarioPlanFingerprintA, "scenarioPlanFingerprintA");
  assertFingerprint(input.fingerprints.scenarioPlanFingerprintB, "scenarioPlanFingerprintB");
  return freezeObservationValue({
    version: IDENTITY_VERSION,
    structuralObservationSchemaVersion: STRUCTURAL_SCHEMA_VERSION,
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    fingerprintsVersion: FINGERPRINTS_VERSION,
    fingerprintAlgorithm: FINGERPRINT_ALGORITHM,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    definitionPayloadVersion: DEFINITION_PAYLOAD_VERSION,
    scenarioPlanPayloadVersion: PLAN_PAYLOAD_VERSION,
    horizon: input.horizon,
    structuralDefinitionFingerprint: input.fingerprints.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: input.fingerprints.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: input.fingerprints.scenarioPlanFingerprintB,
  });
}

export function projectInitiativeStructuralObservationIdentity(
  input: unknown
): InitiativeStructuralObservationIdentity | null {
  const projection = classifyIdentity(input);
  if (projection.status !== "readable") return null;
  const identity = projection.identity;
  if (
    identity.structuralObservationSchemaVersion !== STRUCTURAL_SCHEMA_VERSION ||
    identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION ||
    identity.fingerprintsVersion !== FINGERPRINTS_VERSION ||
    identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM ||
    identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    identity.definitionPayloadVersion !== DEFINITION_PAYLOAD_VERSION ||
    identity.scenarioPlanPayloadVersion !== PLAN_PAYLOAD_VERSION
  ) return null;
  return freezeObservationValue({
    version: IDENTITY_VERSION,
    structuralObservationSchemaVersion: STRUCTURAL_SCHEMA_VERSION,
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    fingerprintsVersion: FINGERPRINTS_VERSION,
    fingerprintAlgorithm: FINGERPRINT_ALGORITHM,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    definitionPayloadVersion: DEFINITION_PAYLOAD_VERSION,
    scenarioPlanPayloadVersion: PLAN_PAYLOAD_VERSION,
    horizon: identity.horizon,
    structuralDefinitionFingerprint: identity.structuralDefinitionFingerprint,
    scenarioPlanFingerprintA: identity.scenarioPlanFingerprintA,
    scenarioPlanFingerprintB: identity.scenarioPlanFingerprintB,
  });
}

export function evaluateInitiativeStructuralObservationCompatibility(
  persisted: unknown,
  current: InitiativeStructuralObservationIdentity
): InitiativeStructuralObservationCompatibility {
  const left = classifyIdentity(persisted);
  const right = classifyIdentity(current);
  if (left.status === "absent" || right.status === "absent") return compatibility("missing-identity", false);
  if (left.status === "malformed" || right.status === "malformed") return compatibility("malformed-identity", false);
  if (left.status === "unsupported-version" || right.status === "unsupported-version") return compatibility("unsupported-identity-version", false);
  if (
    left.identity.fingerprintsVersion !== FINGERPRINTS_VERSION ||
    right.identity.fingerprintsVersion !== FINGERPRINTS_VERSION ||
    left.identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM ||
    right.identity.fingerprintAlgorithm !== FINGERPRINT_ALGORITHM ||
    left.identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    right.identity.canonicalizationVersion !== CANONICALIZATION_VERSION ||
    left.identity.definitionPayloadVersion !== DEFINITION_PAYLOAD_VERSION ||
    right.identity.definitionPayloadVersion !== DEFINITION_PAYLOAD_VERSION ||
    left.identity.scenarioPlanPayloadVersion !== PLAN_PAYLOAD_VERSION ||
    right.identity.scenarioPlanPayloadVersion !== PLAN_PAYLOAD_VERSION
  ) return compatibility("fingerprint-protocol-mismatch", false);
  if (
    left.identity.structuralObservationSchemaVersion !== STRUCTURAL_SCHEMA_VERSION ||
    right.identity.structuralObservationSchemaVersion !== STRUCTURAL_SCHEMA_VERSION ||
    left.identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION ||
    right.identity.resultSchemaVersion !== RESULT_SCHEMA_VERSION
  ) return compatibility("structural-observation-schema-mismatch", false);
  if (left.identity.horizon !== right.identity.horizon) return compatibility("horizon-mismatch", false);
  if (left.identity.structuralDefinitionFingerprint !== right.identity.structuralDefinitionFingerprint) return compatibility("structural-definition-mismatch", false);
  if (left.identity.scenarioPlanFingerprintA !== right.identity.scenarioPlanFingerprintA) return compatibility("scenario-plan-a-mismatch", false);
  if (left.identity.scenarioPlanFingerprintB !== right.identity.scenarioPlanFingerprintB) return compatibility("scenario-plan-b-mismatch", false);
  return compatibility("compatible", true);
}
