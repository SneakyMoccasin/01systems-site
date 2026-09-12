import type { ParameterKey } from "../../impactContract";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { EffectDefinitionId } from "./contractV2";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type {
  ResolvedScenarioInitiativeSchedulesV1,
  ResolvedScheduledInitiativeV1,
} from "./resolveInitiativeSchedules";

export type InitiativeExecutionProvenanceVersion =
  "initiative-execution-provenance-v1";

export type InitiativeExecutionRecordV1 = Readonly<{
  scenario: ScheduleScenarioId;
  initiativeId: InitiativeId;
  effectDefinitionId: EffectDefinitionId;
  scheduledExecutionPeriod: DisplayedPeriod;
  actualExecutionPeriod: DisplayedPeriod;
  appliedDriverDeltas: Readonly<Partial<Record<ParameterKey, number>>>;
}>;

export type InitiativeExecutionProvenanceV1 = Readonly<{
  version: InitiativeExecutionProvenanceVersion;
  entries: readonly InitiativeExecutionRecordV1[];
}>;

type UnknownRecord = Record<string, unknown>;

const PROVENANCE_FIELDS = ["version", "entries"] as const;
const ENTRY_FIELDS = [
  "scenario",
  "initiativeId",
  "effectDefinitionId",
  "scheduledExecutionPeriod",
  "actualExecutionPeriod",
  "appliedDriverDeltas",
] as const;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function invariant(message: string): never {
  throw new Error(`Initiative execution provenance invariant failed: ${message}`);
}

function rejectUnknownFields(
  value: UnknownRecord,
  allowed: readonly string[],
  path: string
): void {
  const allowedFields = new Set(allowed);
  const unknown = Object.keys(value)
    .filter((field) => !allowedFields.has(field))
    .sort(compareText);
  if (unknown.length > 0) {
    invariant(`unknown field ${path}.${unknown[0]}`);
  }
}

function requiredIdentifier(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    invariant(`${path} must be a non-empty identifier`);
  }
  return value;
}

function requiredPeriod(value: unknown, path: string): DisplayedPeriod {
  if (!Number.isInteger(value) || (value as number) < 1) {
    invariant(`${path} must be a positive integer model period`);
  }
  return value as DisplayedPeriod;
}

function projectDriverDeltas(
  value: unknown,
  path: string
): Readonly<Partial<Record<ParameterKey, number>>> {
  const source = record(value);
  if (!source) invariant(`${path} must be an object`);
  const projected: Partial<Record<ParameterKey, number>> = {};
  for (const driver of Object.keys(source).sort(compareText)) {
    const delta = source[driver];
    if (typeof delta !== "number" || !Number.isFinite(delta)) {
      invariant(`${path}.${driver} must be a finite number`);
    }
    projected[driver as ParameterKey] = delta;
  }
  return projected;
}

function sameDriverDeltas(
  actual: Readonly<Partial<Record<ParameterKey, number>>>,
  expected: Readonly<Partial<Record<ParameterKey, number>>>
): boolean {
  const actualKeys = Object.keys(actual).sort(compareText);
  const expectedKeys = Object.keys(expected).sort(compareText);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every(
      (driver, index) =>
        driver === expectedKeys[index] &&
        actual[driver as ParameterKey] === expected[driver as ParameterKey]
    )
  );
}

export function assertInitiativeExecutionMatchesResolved(
  execution: InitiativeExecutionRecordV1,
  resolved: ResolvedScheduledInitiativeV1
): void {
  if (execution.scenario !== resolved.scenario) {
    invariant(
      `scenario mismatch for ${execution.initiativeId}: ${execution.scenario} versus ${resolved.scenario}`
    );
  }
  if (execution.initiativeId !== resolved.initiativeId) {
    invariant(
      `initiative mismatch: ${execution.initiativeId} versus ${resolved.initiativeId}`
    );
  }
  if (execution.effectDefinitionId !== resolved.effectDefinitionId) {
    invariant(`effect definition mismatch for ${execution.initiativeId}`);
  }
  if (execution.scheduledExecutionPeriod !== resolved.executionStep) {
    invariant(`scheduled period mismatch for ${execution.initiativeId}`);
  }
  if (!sameDriverDeltas(execution.appliedDriverDeltas, resolved.driverDeltas)) {
    invariant(`applied driver deltas mismatch for ${execution.initiativeId}`);
  }
}

function findResolvedInitiative(
  schedules: ResolvedScenarioInitiativeSchedulesV1,
  scenario: ScheduleScenarioId,
  initiativeId: InitiativeId
): ResolvedScheduledInitiativeV1 {
  const matches = schedules[scenario].filter(
    (entry) => entry.initiativeId === initiativeId
  );
  if (matches.length !== 1) {
    invariant(
      matches.length === 0
        ? `initiative ${initiativeId} is not resolved in scenario ${scenario}`
        : `initiative ${initiativeId} is resolved more than once in scenario ${scenario}`
    );
  }
  return matches[0];
}

/**
 * Projects explicit execution evidence into the V1 provenance contract.
 * This function verifies evidence but never decides or performs execution.
 */
export function createInitiativeExecutionProvenance(
  input: Readonly<{
    resolvedSchedules: ResolvedScenarioInitiativeSchedulesV1;
    provenance: unknown;
  }>
): InitiativeExecutionProvenanceV1 {
  const source = record(input.provenance);
  if (!source) invariant("provenance must be an object");
  rejectUnknownFields(source, PROVENANCE_FIELDS, "provenance");
  if (source.version !== "initiative-execution-provenance-v1") {
    invariant(`unsupported provenance version ${String(source.version)}`);
  }
  if (!Array.isArray(source.entries)) {
    invariant("provenance.entries must be an array");
  }

  const seen = new Set<string>();
  const entries = source.entries.map((candidate, index) => {
    const path = `provenance.entries[${index}]`;
    const value = record(candidate);
    if (!value) invariant(`${path} must be an object`);
    rejectUnknownFields(value, ENTRY_FIELDS, path);
    if (value.scenario !== "A" && value.scenario !== "B") {
      invariant(`${path}.scenario must be A or B`);
    }
    const scenario = value.scenario;
    const initiativeId = requiredIdentifier(
      value.initiativeId,
      `${path}.initiativeId`
    ) as InitiativeId;
    const effectDefinitionId = requiredIdentifier(
      value.effectDefinitionId,
      `${path}.effectDefinitionId`
    ) as EffectDefinitionId;
    const scheduledExecutionPeriod = requiredPeriod(
      value.scheduledExecutionPeriod,
      `${path}.scheduledExecutionPeriod`
    );
    const actualExecutionPeriod = requiredPeriod(
      value.actualExecutionPeriod,
      `${path}.actualExecutionPeriod`
    );
    const appliedDriverDeltas = projectDriverDeltas(
      value.appliedDriverDeltas,
      `${path}.appliedDriverDeltas`
    );
    const identity = `${scenario}:${initiativeId}`;
    if (seen.has(identity)) {
      invariant(`duplicate or contradictory provenance for ${identity}`);
    }
    seen.add(identity);

    const entry: InitiativeExecutionRecordV1 = {
      scenario,
      initiativeId,
      effectDefinitionId,
      scheduledExecutionPeriod,
      actualExecutionPeriod,
      appliedDriverDeltas,
    };
    assertInitiativeExecutionMatchesResolved(
      entry,
      findResolvedInitiative(input.resolvedSchedules, scenario, initiativeId)
    );
    return entry;
  });

  entries.sort(
    (left, right) =>
      compareText(left.scenario, right.scenario) ||
      left.actualExecutionPeriod - right.actualExecutionPeriod ||
      left.scheduledExecutionPeriod - right.scheduledExecutionPeriod ||
      compareText(left.initiativeId, right.initiativeId)
  );
  return deepFreeze({
    version: "initiative-execution-provenance-v1",
    entries,
  });
}
