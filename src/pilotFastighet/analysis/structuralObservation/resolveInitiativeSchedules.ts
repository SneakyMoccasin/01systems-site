import { DOMAIN_ACTIONS, type ActionKey } from "../../actionEffects";
import type { ExecutableDomainProfile } from "../../executableDomainProfile";
import type { ParameterKey } from "../../impactContract";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type {
  EffectDefinitionId,
  InitiativeDefinitionV2,
  ValidatedStructuralObservationContractV2,
} from "./contractV2";
import {
  INITIATIVE_SCHEDULE_SCENARIOS,
  type ScheduleScenarioId,
  type ScheduledInitiativeV1,
  type ValidatedScenarioInitiativeSchedulesV1,
} from "./initiativeScheduleContract";

export type ResolvedScheduledInitiativeV1 = Readonly<{
  scenario: ScheduleScenarioId;
  initiativeId: InitiativeId;
  effectDefinitionId: EffectDefinitionId;
  executionStep: DisplayedPeriod;
  driverDeltas: Readonly<Partial<Record<ParameterKey, number>>>;
}>;

export type ResolvedScenarioInitiativeSchedulesV1 = Readonly<{
  version: "resolved-initiative-schedule-v1";
  A: readonly ResolvedScheduledInitiativeV1[];
  B: readonly ResolvedScheduledInitiativeV1[];
}>;

type UnknownRecord = Record<string, unknown>;

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
  throw new Error(`Initiative schedule resolution invariant failed: ${message}`);
}

function resolveEffect(
  definition: InitiativeDefinitionV2,
  profile: ExecutableDomainProfile
): Readonly<Partial<Record<ParameterKey, number>>> {
  const effectDefinitionId = definition.effectDefinitionId as string;
  if (!DOMAIN_ACTIONS[profile.domainId].includes(effectDefinitionId as ActionKey)) {
    invariant(
      `effect definition ${effectDefinitionId} for ${definition.id} is not supported by profile ${profile.profileId}`
    );
  }
  const effect = profile.actionEffects[effectDefinitionId as ActionKey];
  if (!effect) {
    invariant(
      `effect definition ${effectDefinitionId} for ${definition.id} is missing from profile ${profile.profileId}`
    );
  }

  const supportedDrivers = new Set<string>(profile.applicableDrivers);
  const driverDeltas: Partial<Record<ParameterKey, number>> = {};
  for (const [driver, delta] of Object.entries(effect).sort(([left], [right]) =>
    compareText(left, right)
  )) {
    if (!supportedDrivers.has(driver)) {
      invariant(
        `effect definition ${effectDefinitionId} uses unsupported driver ${driver}`
      );
    }
    if (typeof delta !== "number" || !Number.isFinite(delta)) {
      invariant(
        `effect definition ${effectDefinitionId} has a non-finite delta for ${driver}`
      );
    }
    driverDeltas[driver as ParameterKey] = delta;
  }
  return driverDeltas;
}

function resolveScenario(
  scenario: ScheduleScenarioId,
  schedule: readonly ScheduledInitiativeV1[],
  definitionById: ReadonlyMap<string, InitiativeDefinitionV2>,
  profile: ExecutableDomainProfile
): ResolvedScheduledInitiativeV1[] {
  if (scenario !== "A" && scenario !== "B") {
    invariant(`unknown scenario ${String(scenario)}`);
  }
  const seenInitiatives = new Set<string>();
  const resolved = schedule.map((entry) => {
    const initiativeId = entry.initiativeId as string;
    if (seenInitiatives.has(initiativeId)) {
      invariant(`duplicate initiative ${initiativeId} in scenario ${scenario}`);
    }
    seenInitiatives.add(initiativeId);
    const definition = definitionById.get(initiativeId);
    if (!definition) {
      invariant(`unknown initiative ${initiativeId} in scenario ${scenario}`);
    }
    if (!Number.isInteger(entry.executionStep) || entry.executionStep < 1) {
      invariant(
        `invalid execution period ${String(entry.executionStep)} for ${initiativeId} in scenario ${scenario}`
      );
    }
    return {
      scenario,
      initiativeId: definition.id,
      effectDefinitionId: definition.effectDefinitionId,
      executionStep: entry.executionStep,
      driverDeltas: resolveEffect(definition, profile),
    };
  });

  resolved.sort(
    (left, right) =>
      left.executionStep - right.executionStep ||
      compareText(left.initiativeId, right.initiativeId)
  );
  for (const entry of resolved) {
    if (entry.scenario !== scenario) {
      invariant(`resolved scenario identity changed from ${scenario}`);
    }
  }
  return resolved;
}

function assertSameInitiativeSet(
  scenarioA: readonly ResolvedScheduledInitiativeV1[],
  scenarioB: readonly ResolvedScheduledInitiativeV1[]
): void {
  const idsA = [...scenarioA.map(({ initiativeId }) => initiativeId)].sort(compareText);
  const idsB = [...scenarioB.map(({ initiativeId }) => initiativeId)].sort(compareText);
  if (
    idsA.length !== idsB.length ||
    idsA.some((initiativeId, index) => initiativeId !== idsB[index])
  ) {
    invariant("scenario A and B initiative sets differ");
  }
}

export function resolveInitiativeSchedules(
  input: Readonly<{
    contract: ValidatedStructuralObservationContractV2;
    schedules: ValidatedScenarioInitiativeSchedulesV1;
    profile: ExecutableDomainProfile;
  }>
): ResolvedScenarioInitiativeSchedulesV1 {
  const definitionById = new Map<string, InitiativeDefinitionV2>();
  for (const definition of input.contract.initiatives) {
    const initiativeId = definition.id as string;
    if (definitionById.has(initiativeId)) {
      invariant(`duplicate initiative definition ${initiativeId}`);
    }
    definitionById.set(initiativeId, definition);
  }

  const byScenario = Object.fromEntries(
    INITIATIVE_SCHEDULE_SCENARIOS.map((scenario) => [
      scenario,
      resolveScenario(
        scenario,
        input.schedules[scenario],
        definitionById,
        input.profile
      ),
    ])
  ) as Record<ScheduleScenarioId, ResolvedScheduledInitiativeV1[]>;
  assertSameInitiativeSet(byScenario.A, byScenario.B);

  return deepFreeze({
    version: "resolved-initiative-schedule-v1",
    A: byScenario.A,
    B: byScenario.B,
  });
}
