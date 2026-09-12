import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { EffectDefinitionId, InitiativeDefinitionV2 } from "./contractV2";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import { compareObservationText, freezeObservationValue, type ObservationScenarioPlan } from "./observationPlanCore";
import type { PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";

export type ResolvedInitiativeObservationPlanEntryV2 = Readonly<{ initiativeId: InitiativeId; effectDefinitionId: EffectDefinitionId; scenario: ScheduleScenarioId; bindingStatus: "bound" | "not-bound"; plannedExecutionPeriod: DisplayedPeriod | null; definition: InitiativeDefinitionV2 }>;
export type ResolvedInitiativeObservationScenarioPlanV2 = Readonly<{ scenario: ScheduleScenarioId; initiatives: readonly ResolvedInitiativeObservationPlanEntryV2[] }>;
export type ResolvedInitiativeObservationPlansV2 = Readonly<{ version: "resolved-initiative-observation-plans-v2"; A: ResolvedInitiativeObservationScenarioPlanV2; B: ResolvedInitiativeObservationScenarioPlanV2 }>;

function invariant(message: string): never { throw new Error(`Initiative observation plan invariant failed: ${message}`); }
function resolveScenario(prepared: PreparedInitiativeStructuralObservationRunV2, scenario: ScheduleScenarioId): ResolvedInitiativeObservationScenarioPlanV2 {
  const definitionIds = new Set<string>();
  for (const definition of prepared.contract.initiatives) {
    if (definitionIds.has(definition.id)) invariant(`duplicate initiative definition ${definition.id}`);
    definitionIds.add(definition.id);
  }
  const scheduledById = new Map();
  for (const entry of prepared.resolvedSchedules[scenario]) {
    if (scheduledById.has(entry.initiativeId)) invariant(`duplicate scheduled initiative ${entry.initiativeId} in scenario ${scenario}`);
    if (!definitionIds.has(entry.initiativeId)) invariant(`unknown scheduled initiative ${entry.initiativeId} in scenario ${scenario}`);
    scheduledById.set(entry.initiativeId, entry);
  }
  const initiatives = prepared.contract.initiatives.map((definition) => {
    const scheduled = scheduledById.get(definition.id);
    return { initiativeId: definition.id, effectDefinitionId: definition.effectDefinitionId, scenario, bindingStatus: scheduled ? "bound" as const : "not-bound" as const, plannedExecutionPeriod: scheduled?.executionStep ?? null, definition: structuredClone(definition) };
  }).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  return { scenario, initiatives };
}
export function toObservationScenarioPlanV2(plan: ResolvedInitiativeObservationScenarioPlanV2): ObservationScenarioPlan {
  return freezeObservationValue(structuredClone({ scenario: plan.scenario, initiatives: plan.initiatives.map((initiative) => ({ initiativeId: initiative.initiativeId, scenario: initiative.scenario, bindingStatus: initiative.bindingStatus, plannedExecutionPeriod: initiative.plannedExecutionPeriod, definition: { initiativeId: initiative.initiativeId, prerequisites: initiative.definition.prerequisites, resourceClaims: initiative.definition.resourceClaims } })) }));
}
export function resolveInitiativeObservationPlans(prepared: PreparedInitiativeStructuralObservationRunV2): ResolvedInitiativeObservationPlansV2 {
  if (prepared.preparationVersion !== "structural-observation-preparation-v2") invariant("unsupported preparation version");
  const A = resolveScenario(prepared, "A");
  const B = resolveScenario(prepared, "B");
  const boundA = A.initiatives.filter(({ bindingStatus }) => bindingStatus === "bound").map(({ initiativeId }) => initiativeId);
  const boundB = B.initiatives.filter(({ bindingStatus }) => bindingStatus === "bound").map(({ initiativeId }) => initiativeId);
  if (boundA.length !== boundB.length || boundA.some((id, index) => id !== boundB[index])) invariant("scenario A and B bound initiative sets differ");
  return freezeObservationValue(structuredClone({ version: "resolved-initiative-observation-plans-v2" as const, A, B }));
}
