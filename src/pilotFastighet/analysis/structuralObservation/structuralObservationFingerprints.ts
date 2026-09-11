import type { ActionKey } from "../../actionEffects";
import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceId,
} from "./contract";
import type { PreparedStructuralObservationRun } from "./prepareStructuralObservationRun";

export type StructuralDefinitionFingerprintPayloadV1 = Readonly<{
  version: "structural-definition-fingerprint-v1";
  initiatives: readonly Readonly<{
    initiativeId: InitiativeId;
    actionKey: ActionKey;
    prerequisites: readonly Readonly<{
      initiativeId: InitiativeId;
      type: "finish-to-start";
    }>[];
    resourceClaims: readonly Readonly<{
      resourceId: SharedResourceId;
      amount: number;
      durationPeriods: number;
    }>[];
  }>[];
  resources: readonly Readonly<{
    resourceId: SharedResourceId;
    capacity:
      | Readonly<{ type: "constant"; amount: number }>
      | Readonly<{
          type: "periodized";
          amounts: readonly Readonly<{
            period: DisplayedPeriod;
            amount: number;
          }>[];
        }>;
  }>[];
}>;

export type StructuralScenarioPlanFingerprintPayloadV1 = Readonly<{
  version: "structural-scenario-plan-fingerprint-v1";
  scenario: ScheduleScenarioId;
  horizon: number;
  bindings: readonly Readonly<{
    initiativeId: InitiativeId;
    plannedExecutionPeriod: DisplayedPeriod;
  }>[];
}>;

export type StructuralFingerprintPayload =
  | StructuralDefinitionFingerprintPayloadV1
  | StructuralScenarioPlanFingerprintPayloadV1;

export type StructuralObservationFingerprints = Readonly<{
  fingerprintAlgorithm: "sha256";
  canonicalizationVersion: "structural-semantic-json-v1";
  structuralDefinitionFingerprint: string;
  scenarioPlanFingerprintA: string;
  scenarioPlanFingerprintB: string;
}>;

interface CanonicalObject {
  readonly [key: string]: CanonicalValue;
}

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | CanonicalObject;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finiteNumber(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `Structural fingerprint canonicalization failed: ${path} must be finite.`
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function assertPrepared(prepared: PreparedStructuralObservationRun): void {
  if (prepared.preparationVersion !== "structural-observation-preparation-v1") {
    throw new Error(
      "Structural fingerprint invariant failed: unsupported preparation version."
    );
  }
  if (!Number.isInteger(prepared.horizon) || prepared.horizon < 1) {
    throw new Error(
      "Structural fingerprint invariant failed: horizon must be a positive integer."
    );
  }
}

export function projectStructuralDefinitionFingerprintPayload(
  prepared: PreparedStructuralObservationRun
): StructuralDefinitionFingerprintPayloadV1 {
  assertPrepared(prepared);
  const initiatives = prepared.contract.initiatives
    .map((initiative) => ({
      initiativeId: initiative.id,
      actionKey: initiative.actionKey,
      prerequisites: initiative.prerequisites
        .map((prerequisite) => ({
          initiativeId: prerequisite.initiativeId,
          type: prerequisite.type,
        }))
        .sort((left, right) =>
          compareText(left.initiativeId, right.initiativeId)
        ),
      resourceClaims: initiative.resourceClaims
        .map((claim) => ({
          resourceId: claim.resourceId,
          amount: finiteNumber(claim.amount, "resource claim amount"),
          durationPeriods: finiteNumber(
            claim.durationPeriods,
            "resource claim duration"
          ),
        }))
        .sort((left, right) => compareText(left.resourceId, right.resourceId)),
    }))
    .sort((left, right) => compareText(left.initiativeId, right.initiativeId));
  const resources = prepared.contract.resources
    .map((resource) => ({
      resourceId: resource.id,
      capacity:
        resource.capacity.type === "constant"
          ? {
              type: "constant" as const,
              amount: finiteNumber(
                resource.capacity.amount,
                "constant resource capacity"
              ),
            }
          : {
              type: "periodized" as const,
              amounts: resource.capacity.amounts
                .map((entry) => ({
                  period: finiteNumber(
                    entry.period,
                    "periodized capacity period"
                  ) as DisplayedPeriod,
                  amount: finiteNumber(
                    entry.amount,
                    "periodized resource capacity"
                  ),
                }))
                .sort((left, right) => left.period - right.period),
            },
    }))
    .sort((left, right) => compareText(left.resourceId, right.resourceId));
  return deepFreeze({
    version: "structural-definition-fingerprint-v1",
    initiatives,
    resources,
  });
}

export function projectStructuralScenarioPlanFingerprintPayload(
  prepared: PreparedStructuralObservationRun,
  scenario: ScheduleScenarioId
): StructuralScenarioPlanFingerprintPayloadV1 {
  assertPrepared(prepared);
  const plan = prepared.scenarioPlans[scenario];
  if (!plan || plan.scenario !== scenario) {
    throw new Error(
      `Structural fingerprint invariant failed: missing canonical scenario ${scenario} plan.`
    );
  }
  const bindings = plan.initiatives
    .filter((initiative) => initiative.bindingStatus === "bound")
    .map((initiative) => {
      if (initiative.plannedExecutionPeriod === null) {
        throw new Error(
          `Structural fingerprint invariant failed: bound initiative ${initiative.initiativeId} has no period.`
        );
      }
      return {
        initiativeId: initiative.initiativeId,
        plannedExecutionPeriod: finiteNumber(
          initiative.plannedExecutionPeriod,
          "planned execution period"
        ) as DisplayedPeriod,
      };
    })
    .sort((left, right) => compareText(left.initiativeId, right.initiativeId));
  return deepFreeze({
    version: "structural-scenario-plan-fingerprint-v1",
    scenario,
    horizon: prepared.horizon,
    bindings,
  });
}

function whitelistPayload(payload: StructuralFingerprintPayload): CanonicalValue {
  if (payload.version === "structural-definition-fingerprint-v1") {
    return {
      version: payload.version,
      initiatives: payload.initiatives
        .map((initiative) => ({
          initiativeId: initiative.initiativeId,
          actionKey: initiative.actionKey,
          prerequisites: initiative.prerequisites
            .map((prerequisite) => ({
              initiativeId: prerequisite.initiativeId,
              type: prerequisite.type,
            }))
            .sort((left, right) =>
              compareText(left.initiativeId, right.initiativeId)
            ),
          resourceClaims: initiative.resourceClaims
            .map((claim) => ({
              resourceId: claim.resourceId,
              amount: finiteNumber(claim.amount, "resource claim amount"),
              durationPeriods: finiteNumber(
                claim.durationPeriods,
                "resource claim duration"
              ),
            }))
            .sort((left, right) =>
              compareText(left.resourceId, right.resourceId)
            ),
        }))
        .sort((left, right) =>
          compareText(left.initiativeId, right.initiativeId)
        ),
      resources: payload.resources
        .map((resource) => ({
          resourceId: resource.resourceId,
          capacity: (resource.capacity.type === "constant"
              ? {
                  type: resource.capacity.type,
                  amount: finiteNumber(
                    resource.capacity.amount,
                    "constant resource capacity"
                  ),
                }
              : {
                  type: resource.capacity.type,
                  amounts: resource.capacity.amounts
                    .map((entry) => ({
                      period: finiteNumber(
                        entry.period,
                        "periodized capacity period"
                      ),
                      amount: finiteNumber(
                        entry.amount,
                        "periodized resource capacity"
                      ),
                    }))
                    .sort((left, right) => left.period - right.period),
                }) as CanonicalObject,
        }))
        .sort((left, right) =>
          compareText(left.resourceId, right.resourceId)
        ),
    };
  }
  if (payload.version === "structural-scenario-plan-fingerprint-v1") {
    return {
      version: payload.version,
      scenario: payload.scenario,
      horizon: finiteNumber(payload.horizon, "scenario plan horizon"),
      bindings: payload.bindings
        .map((binding) => ({
          initiativeId: binding.initiativeId,
          plannedExecutionPeriod: finiteNumber(
            binding.plannedExecutionPeriod,
            "planned execution period"
          ),
        }))
        .sort((left, right) =>
          compareText(left.initiativeId, right.initiativeId)
        ),
    };
  }
  throw new Error(
    `Structural fingerprint canonicalization failed: unsupported payload version ${String(
      (payload as { version?: unknown }).version
    )}.`
  );
}

function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return JSON.stringify(finiteNumber(value, "number"));
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const object = value as CanonicalObject;
  return `{${Object.keys(object)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function canonicalizeStructuralFingerprintPayload(
  payload: StructuralFingerprintPayload
): string {
  return canonicalJson(whitelistPayload(payload));
}

export async function sha256StructuralFingerprint(
  canonicalPayload: string
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Structural fingerprint hashing failed: Web Crypto subtle.digest is unavailable."
    );
  }
  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalPayload)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildStructuralObservationFingerprints(
  prepared: PreparedStructuralObservationRun
): Promise<StructuralObservationFingerprints> {
  const definition = projectStructuralDefinitionFingerprintPayload(prepared);
  const planA = projectStructuralScenarioPlanFingerprintPayload(prepared, "A");
  const planB = projectStructuralScenarioPlanFingerprintPayload(prepared, "B");
  const [
    structuralDefinitionFingerprint,
    scenarioPlanFingerprintA,
    scenarioPlanFingerprintB,
  ] = await Promise.all(
    [definition, planA, planB].map((payload) =>
      sha256StructuralFingerprint(
        canonicalizeStructuralFingerprintPayload(payload)
      )
    )
  );
  return deepFreeze({
    fingerprintAlgorithm: "sha256",
    canonicalizationVersion: "structural-semantic-json-v1",
    structuralDefinitionFingerprint,
    scenarioPlanFingerprintA,
    scenarioPlanFingerprintB,
  });
}
