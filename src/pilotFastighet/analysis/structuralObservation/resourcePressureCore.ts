import type { DisplayedPeriod, InitiativeId, SharedResourceDefinition, SharedResourceId } from "./contract";
import { compareObservationText, freezeObservationValue, type ObservationScenarioPlan } from "./observationPlanCore";

export const RESOURCE_CAPACITY_EPSILON = 1e-9;
export interface ActiveInitiativeResourceClaim { readonly initiativeId: InitiativeId; readonly resourceId: SharedResourceId; readonly amount: number; readonly startPeriod: DisplayedPeriod; readonly endPeriod: DisplayedPeriod; readonly isStartingThisPeriod: boolean }
export interface ResourcePressureObservation { readonly resourceId: SharedResourceId; readonly period: DisplayedPeriod; readonly capacity: number; readonly totalClaimed: number; readonly remainingCapacity: number; readonly overallocatedBy: number; readonly overallocated: boolean; readonly activeClaims: readonly ActiveInitiativeResourceClaim[]; readonly contributingInitiativeIds: readonly InitiativeId[]; readonly startingInitiativeIds: readonly InitiativeId[]; readonly wouldBlockStartingInitiativeIds: readonly InitiativeId[] }

function invariant(message: string): never { throw new Error(`Structural resource invariant failed: ${message}`); }
function capacityForPeriod(resource: SharedResourceDefinition, period: DisplayedPeriod): number {
  if (resource.capacity.type === "constant") return resource.capacity.amount;
  const matches = resource.capacity.amounts.filter((entry) => entry.period === period);
  if (matches.length !== 1) invariant(`resource ${resource.id} must have exactly one capacity for M${period}.`);
  return matches[0].amount;
}
function uniqueSorted(ids: readonly InitiativeId[]): InitiativeId[] { return [...new Set(ids)].sort(compareObservationText); }

export function observeResourcePressureCore(input: Readonly<{ resources: readonly SharedResourceDefinition[]; scenarioPlan: ObservationScenarioPlan; period: DisplayedPeriod }>): readonly ResourcePressureObservation[] {
  if (!Number.isInteger(input.period) || input.period < 1) invariant("period must be positive.");
  const resourceIds = new Set(input.resources.map(({ id }) => id));
  const seenInitiatives = new Set<string>();
  for (const initiative of input.scenarioPlan.initiatives) {
    if (seenInitiatives.has(initiative.initiativeId)) invariant(`duplicate initiative ${initiative.initiativeId} in plan.`);
    seenInitiatives.add(initiative.initiativeId);
    if (initiative.scenario !== input.scenarioPlan.scenario) invariant(`scenario ${input.scenarioPlan.scenario} contains initiative ${initiative.initiativeId} for ${initiative.scenario}.`);
    if (initiative.bindingStatus === "bound" && initiative.plannedExecutionPeriod === null) invariant(`bound initiative ${initiative.initiativeId} has no planned execution period.`);
    if (initiative.bindingStatus === "not-bound" && initiative.plannedExecutionPeriod !== null) invariant(`not-bound initiative ${initiative.initiativeId} has a fabricated planned execution period.`);
    for (const claim of initiative.definition.resourceClaims) {
      if (!resourceIds.has(claim.resourceId)) invariant(`initiative ${initiative.initiativeId} claims unknown resource ${claim.resourceId}.`);
      if (!Number.isFinite(claim.amount)) invariant(`initiative ${initiative.initiativeId} has a non-finite claim.`);
    }
  }
  const observations = input.resources.map((resource) => {
    const capacity = capacityForPeriod(resource, input.period);
    const activeClaims: ActiveInitiativeResourceClaim[] = [];
    for (const initiative of input.scenarioPlan.initiatives) {
      if (initiative.bindingStatus !== "bound" || initiative.plannedExecutionPeriod === null) continue;
      for (const claim of initiative.definition.resourceClaims) {
        if (claim.resourceId !== resource.id) continue;
        const startPeriod = initiative.plannedExecutionPeriod;
        const endPeriod = (startPeriod + claim.durationPeriods - 1) as DisplayedPeriod;
        if (startPeriod <= input.period && input.period <= endPeriod) activeClaims.push({ initiativeId: initiative.initiativeId, resourceId: claim.resourceId, amount: claim.amount, startPeriod, endPeriod, isStartingThisPeriod: startPeriod === input.period });
      }
    }
    activeClaims.sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId) || compareObservationText(left.resourceId, right.resourceId));
    const totalClaimed = activeClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const rawExcess = totalClaimed - capacity;
    if (![capacity, totalClaimed, rawExcess].every(Number.isFinite)) invariant(`resource ${resource.id} produced a non-finite capacity calculation.`);
    const overallocated = rawExcess > RESOURCE_CAPACITY_EPSILON;
    const overallocatedBy = overallocated ? rawExcess : 0;
    const remainingCapacity = overallocated ? -overallocatedBy : Math.max(0, capacity - totalClaimed);
    const contributingInitiativeIds = uniqueSorted(activeClaims.map(({ initiativeId }) => initiativeId));
    const startingInitiativeIds = uniqueSorted(activeClaims.filter(({ isStartingThisPeriod }) => isStartingThisPeriod).map(({ initiativeId }) => initiativeId));
    return { resourceId: resource.id, period: input.period, capacity, totalClaimed, remainingCapacity, overallocatedBy, overallocated, activeClaims, contributingInitiativeIds, startingInitiativeIds, wouldBlockStartingInitiativeIds: overallocated ? [...startingInitiativeIds] : [] };
  });
  observations.sort((left, right) => compareObservationText(left.resourceId, right.resourceId));
  return freezeObservationValue(structuredClone(observations));
}
