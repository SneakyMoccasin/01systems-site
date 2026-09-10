import type { ActionKey } from "../../actionEffects";
import type {
  ScenarioSchedules,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import type {
  DisplayedPeriod,
  InitiativeDefinition,
  InitiativeId,
  ValidatedStructuralObservationContractV1,
} from "./contract";

export type StructuralInitiativeBindingStatus = "bound" | "not-bound";

export type ResolvedStructuralInitiative = Readonly<{
  initiativeId: InitiativeId;
  actionKey: ActionKey;
  scenario: ScheduleScenarioId;
  plannedExecutionPeriod: DisplayedPeriod | null;
  bindingStatus: StructuralInitiativeBindingStatus;
  definition: InitiativeDefinition;
}>;

export type ResolvedStructuralScenarioPlan = Readonly<{
  scenario: ScheduleScenarioId;
  initiatives: readonly ResolvedStructuralInitiative[];
}>;

export type ResolvedStructuralScenarioPlans = Readonly<{
  A: ResolvedStructuralScenarioPlan;
  B: ResolvedStructuralScenarioPlan;
}>;

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

function resolveScenario(
  scenario: ScheduleScenarioId,
  contract: ValidatedStructuralObservationContractV1,
  schedules: ScenarioSchedules
): ResolvedStructuralScenarioPlan {
  const bindingIds = new Set(
    contract.scenarioBindings
      .filter((binding) => binding.scenario === scenario)
      .map((binding) => binding.initiativeId)
  );

  const initiatives = contract.initiatives.map((definition) => {
    if (!bindingIds.has(definition.id)) {
      return {
        initiativeId: definition.id,
        actionKey: definition.actionKey,
        scenario,
        plannedExecutionPeriod: null,
        bindingStatus: "not-bound",
        definition,
      } as const;
    }

    const matches = schedules[scenario].filter(
      (scheduledAction) => scheduledAction.actionId === definition.actionKey
    );
    if (matches.length !== 1) {
      throw new Error(
        `Validated structural observation invariant failed: scenario ${scenario} ` +
          `initiative ${definition.id} must match exactly one canonical schedule entry.`
      );
    }

    return {
      initiativeId: definition.id,
      actionKey: definition.actionKey,
      scenario,
      plannedExecutionPeriod: matches[0].executionStep as DisplayedPeriod,
      bindingStatus: "bound",
      definition,
    } as const;
  });

  initiatives.sort((left, right) =>
    compareCanonicalStrings(left.initiativeId, right.initiativeId)
  );
  return { scenario, initiatives };
}

/**
 * The orchestration boundary must pass the same schedules that were validated
 * with this contract, using the same horizon. Resolution deliberately does not
 * repeat contract validation or introduce a second schedule source.
 */
export function resolveStructuralScenarioPlans(input: Readonly<{
  contract: ValidatedStructuralObservationContractV1;
  schedules: ScenarioSchedules;
}>): ResolvedStructuralScenarioPlans {
  return deepFreeze({
    A: resolveScenario("A", input.contract, input.schedules),
    B: resolveScenario("B", input.contract, input.schedules),
  });
}
