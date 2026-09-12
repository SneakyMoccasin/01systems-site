import type { DisplayedPeriod, InitiativeId, SharedResourceId } from "./contract";
import type { EffectDefinitionId } from "./contractV2";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type { PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";
import { compareObservationText, freezeObservationValue } from "./observationPlanCore";
import { sha256StructuralFingerprint } from "./structuralObservationFingerprints";

export type InitiativeStructuralDefinitionFingerprintPayloadV2 = Readonly<{
  version: "initiative-structural-definition-fingerprint-v2";
  initiatives: readonly Readonly<{
    initiativeId: InitiativeId;
    effectDefinitionId: EffectDefinitionId;
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

export type InitiativeScenarioPlanFingerprintPayloadV2 = Readonly<{
  version: "initiative-scenario-plan-fingerprint-v2";
  scenario: ScheduleScenarioId;
  horizon: number;
  initiatives: readonly Readonly<{
    initiativeId: InitiativeId;
    plannedExecutionPeriod: DisplayedPeriod;
  }>[];
}>;

export type InitiativeStructuralFingerprintPayloadV2 =
  | InitiativeStructuralDefinitionFingerprintPayloadV2
  | InitiativeScenarioPlanFingerprintPayloadV2;

export type InitiativeStructuralObservationFingerprints = Readonly<{
  version: "initiative-structural-observation-fingerprints-v1";
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

function invariant(message: string): never {
  throw new Error(`Initiative structural fingerprint invariant failed: ${message}`);
}

function finiteNumber(value: number, path: string): number {
  if (!Number.isFinite(value)) invariant(`${path} must be finite`);
  return Object.is(value, -0) ? 0 : value;
}

function assertPrepared(prepared: PreparedInitiativeStructuralObservationRunV2): void {
  if (prepared.preparationVersion !== "structural-observation-preparation-v2") {
    invariant("unsupported preparation version");
  }
  if (!Number.isInteger(prepared.horizon) || prepared.horizon < 1) {
    invariant("horizon must be a positive integer");
  }
  if (prepared.contract.version !== "structural-observation-v2") {
    invariant("unsupported structural contract version");
  }
  if (prepared.resolvedSchedules.version !== "resolved-initiative-schedule-v1") {
    invariant("unsupported resolved schedule version");
  }
}

export function projectInitiativeStructuralDefinitionFingerprintPayload(
  prepared: PreparedInitiativeStructuralObservationRunV2
): InitiativeStructuralDefinitionFingerprintPayloadV2 {
  assertPrepared(prepared);
  const initiatives = prepared.contract.initiatives
    .map((initiative) => ({
      initiativeId: initiative.id,
      effectDefinitionId: initiative.effectDefinitionId,
      prerequisites: initiative.prerequisites
        .map(({ initiativeId, type }) => ({ initiativeId, type }))
        .sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId)),
      resourceClaims: initiative.resourceClaims
        .map(({ resourceId, amount, durationPeriods }) => ({
          resourceId,
          amount: finiteNumber(amount, "resource claim amount"),
          durationPeriods: finiteNumber(durationPeriods, "resource claim duration"),
        }))
        .sort((left, right) => compareObservationText(left.resourceId, right.resourceId)),
    }))
    .sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  const resources = prepared.contract.resources
    .map((resource) => ({
      resourceId: resource.id,
      capacity: resource.capacity.type === "constant"
        ? {
            type: "constant" as const,
            amount: finiteNumber(resource.capacity.amount, "constant resource capacity"),
          }
        : {
            type: "periodized" as const,
            amounts: resource.capacity.amounts
              .map(({ period, amount }) => ({
                period: finiteNumber(period, "periodized capacity period") as DisplayedPeriod,
                amount: finiteNumber(amount, "periodized resource capacity"),
              }))
              .sort((left, right) => left.period - right.period),
          },
    }))
    .sort((left, right) => compareObservationText(left.resourceId, right.resourceId));
  return freezeObservationValue(structuredClone({
    version: "initiative-structural-definition-fingerprint-v2" as const,
    initiatives,
    resources,
  }));
}

export function projectInitiativeScenarioPlanFingerprintPayload(
  prepared: PreparedInitiativeStructuralObservationRunV2,
  scenario: ScheduleScenarioId
): InitiativeScenarioPlanFingerprintPayloadV2 {
  assertPrepared(prepared);
  const plan = prepared.resolvedSchedules[scenario];
  if (!plan) invariant(`missing canonical scenario ${scenario} plan`);
  const definitionById = new Map(
    prepared.contract.initiatives.map((initiative) => [initiative.id, initiative])
  );
  const seen = new Set<string>();
  const initiatives = plan.map((entry) => {
    if (entry.scenario !== scenario) invariant(`scenario ${scenario} contains ${entry.scenario} schedule entry`);
    if (seen.has(entry.initiativeId)) invariant(`duplicate planned initiative ${entry.initiativeId}`);
    seen.add(entry.initiativeId);
    const definition = definitionById.get(entry.initiativeId);
    if (!definition || definition.effectDefinitionId !== entry.effectDefinitionId) {
      invariant(`planned initiative ${entry.initiativeId} is unknown or has mismatched effect metadata`);
    }
    const period = finiteNumber(entry.executionStep, "planned execution period");
    if (!Number.isInteger(period) || period < 1 || period > prepared.horizon) {
      invariant(`planned initiative ${entry.initiativeId} has period outside horizon`);
    }
    return {
      initiativeId: entry.initiativeId,
      plannedExecutionPeriod: period as DisplayedPeriod,
    };
  }).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  return freezeObservationValue(structuredClone({
    version: "initiative-scenario-plan-fingerprint-v2" as const,
    scenario,
    horizon: prepared.horizon,
    initiatives,
  }));
}

function whitelistPayload(payload: InitiativeStructuralFingerprintPayloadV2): CanonicalValue {
  if (payload.version === "initiative-structural-definition-fingerprint-v2") {
    return {
      version: payload.version,
      initiatives: payload.initiatives.map((initiative) => ({
        initiativeId: initiative.initiativeId,
        effectDefinitionId: initiative.effectDefinitionId,
        prerequisites: initiative.prerequisites.map(({ initiativeId, type }) => ({ initiativeId, type }))
          .sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId)),
        resourceClaims: initiative.resourceClaims.map(({ resourceId, amount, durationPeriods }) => ({
          resourceId,
          amount: finiteNumber(amount, "resource claim amount"),
          durationPeriods: finiteNumber(durationPeriods, "resource claim duration"),
        })).sort((left, right) => compareObservationText(left.resourceId, right.resourceId)),
      })).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId)),
      resources: payload.resources.map((resource) => ({
        resourceId: resource.resourceId,
        capacity: (resource.capacity.type === "constant"
          ? { type: resource.capacity.type, amount: finiteNumber(resource.capacity.amount, "constant resource capacity") }
          : { type: resource.capacity.type, amounts: resource.capacity.amounts.map(({ period, amount }) => ({ period: finiteNumber(period, "periodized capacity period"), amount: finiteNumber(amount, "periodized resource capacity") })).sort((left, right) => left.period - right.period) }) as CanonicalObject,
      })).sort((left, right) => compareObservationText(left.resourceId, right.resourceId)),
    };
  }
  if (payload.version === "initiative-scenario-plan-fingerprint-v2") {
    return {
      version: payload.version,
      scenario: payload.scenario,
      horizon: finiteNumber(payload.horizon, "scenario plan horizon"),
      initiatives: payload.initiatives.map(({ initiativeId, plannedExecutionPeriod }) => ({
        initiativeId,
        plannedExecutionPeriod: finiteNumber(plannedExecutionPeriod, "planned execution period"),
      })).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId)),
    };
  }
  invariant(`unsupported payload version ${String((payload as { version?: unknown }).version)}`);
}

function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(finiteNumber(value, "number"));
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as CanonicalObject;
  return `{${Object.keys(object).sort(compareObservationText).map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

export function canonicalizeInitiativeStructuralFingerprintPayload(
  payload: InitiativeStructuralFingerprintPayloadV2
): string {
  return canonicalJson(whitelistPayload(payload));
}

export async function buildInitiativeStructuralObservationFingerprints(
  prepared: PreparedInitiativeStructuralObservationRunV2
): Promise<InitiativeStructuralObservationFingerprints> {
  const definition = projectInitiativeStructuralDefinitionFingerprintPayload(prepared);
  const planA = projectInitiativeScenarioPlanFingerprintPayload(prepared, "A");
  const planB = projectInitiativeScenarioPlanFingerprintPayload(prepared, "B");
  const [structuralDefinitionFingerprint, scenarioPlanFingerprintA, scenarioPlanFingerprintB] = await Promise.all(
    [definition, planA, planB].map((payload) => sha256StructuralFingerprint(canonicalizeInitiativeStructuralFingerprintPayload(payload)))
  );
  return freezeObservationValue({
    version: "initiative-structural-observation-fingerprints-v1",
    fingerprintAlgorithm: "sha256",
    canonicalizationVersion: "structural-semantic-json-v1",
    structuralDefinitionFingerprint,
    scenarioPlanFingerprintA,
    scenarioPlanFingerprintB,
  });
}
