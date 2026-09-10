import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceDefinition,
  SharedResourceId,
  ValidatedStructuralObservationContractV1,
} from "./contract";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";

/** Shared comparison boundary for resource-capacity observations. */
export const RESOURCE_CAPACITY_EPSILON = 1e-9;

export interface ActiveInitiativeResourceClaim {
  readonly initiativeId: InitiativeId;
  readonly resourceId: SharedResourceId;
  readonly amount: number;
  readonly startPeriod: DisplayedPeriod;
  readonly endPeriod: DisplayedPeriod;
  readonly isStartingThisPeriod: boolean;
}

export interface ResourcePressureObservation {
  readonly resourceId: SharedResourceId;
  readonly period: DisplayedPeriod;
  readonly capacity: number;
  readonly totalClaimed: number;
  readonly remainingCapacity: number;
  readonly overallocatedBy: number;
  readonly overallocated: boolean;
  readonly activeClaims: readonly ActiveInitiativeResourceClaim[];
  readonly contributingInitiativeIds: readonly InitiativeId[];
  readonly startingInitiativeIds: readonly InitiativeId[];
  readonly wouldBlockStartingInitiativeIds: readonly InitiativeId[];
}

function compareText(left: string, right: string): number {
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

function capacityForPeriod(
  resource: SharedResourceDefinition,
  period: DisplayedPeriod
): number {
  if (resource.capacity.type === "constant") return resource.capacity.amount;
  const matches = resource.capacity.amounts.filter(
    (entry) => entry.period === period
  );
  if (matches.length !== 1) {
    throw new Error(
      `Structural resource invariant failed: resource ${resource.id} must have ` +
        `exactly one capacity for M${period}.`
    );
  }
  return matches[0].amount;
}

function uniqueSorted(ids: readonly InitiativeId[]): InitiativeId[] {
  return [...new Set(ids)].sort(compareText);
}

function assertPlanInvariants(
  contract: ValidatedStructuralObservationContractV1,
  scenarioPlan: ResolvedStructuralScenarioPlan
): void {
  const resources = new Set(contract.resources.map(({ id }) => id));
  const definitions = new Map(contract.initiatives.map((item) => [item.id, item]));
  for (const initiative of scenarioPlan.initiatives) {
    if (initiative.scenario !== scenarioPlan.scenario) {
      throw new Error(
        `Structural resource invariant failed: scenario ${scenarioPlan.scenario} ` +
          `contains initiative ${initiative.initiativeId} for ${initiative.scenario}.`
      );
    }
    if (initiative.bindingStatus === "bound" && initiative.plannedExecutionPeriod === null) {
      throw new Error(
        `Structural resource invariant failed: bound initiative ${initiative.initiativeId} ` +
          `has no planned execution period.`
      );
    }
    const definition = definitions.get(initiative.initiativeId);
    if (!definition || definition.actionKey !== initiative.actionKey) {
      throw new Error(
        `Structural resource invariant failed: initiative ${initiative.initiativeId} ` +
          `does not belong to the validated contract.`
      );
    }
    for (const claim of initiative.definition.resourceClaims) {
      if (!resources.has(claim.resourceId)) {
        throw new Error(
          `Structural resource invariant failed: initiative ${initiative.initiativeId} ` +
            `claims unknown resource ${claim.resourceId}.`
        );
      }
    }
  }
}

/**
 * Contract and plan must originate from the same validated analysis input.
 * Claims are planned observations only; no provenance or enforcement is read.
 */
export function observeResourcePressureForPeriod(input: Readonly<{
  contract: ValidatedStructuralObservationContractV1;
  scenarioPlan: ResolvedStructuralScenarioPlan;
  period: DisplayedPeriod;
}>): readonly ResourcePressureObservation[] {
  if (!Number.isInteger(input.period) || input.period < 1) {
    throw new Error("Structural resource invariant failed: period must be positive.");
  }
  assertPlanInvariants(input.contract, input.scenarioPlan);

  const observations = input.contract.resources.map((resource) => {
    const capacity = capacityForPeriod(resource, input.period);
    const activeClaims: ActiveInitiativeResourceClaim[] = [];

    for (const initiative of input.scenarioPlan.initiatives) {
      if (
        initiative.bindingStatus !== "bound" ||
        initiative.plannedExecutionPeriod === null
      ) {
        continue;
      }
      for (const claim of initiative.definition.resourceClaims) {
        if (claim.resourceId !== resource.id) continue;
        const startPeriod = initiative.plannedExecutionPeriod;
        const endPeriod = (startPeriod + claim.durationPeriods - 1) as DisplayedPeriod;
        if (startPeriod <= input.period && input.period <= endPeriod) {
          activeClaims.push({
            initiativeId: initiative.initiativeId,
            resourceId: claim.resourceId,
            amount: claim.amount,
            startPeriod,
            endPeriod,
            isStartingThisPeriod: startPeriod === input.period,
          });
        }
      }
    }
    activeClaims.sort(
      (left, right) =>
        compareText(left.initiativeId, right.initiativeId) ||
        compareText(left.resourceId, right.resourceId)
    );

    const totalClaimed = activeClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const rawExcess = totalClaimed - capacity;
    if (![capacity, totalClaimed, rawExcess].every(Number.isFinite)) {
      throw new Error(
        `Structural resource invariant failed: resource ${resource.id} produced ` +
          `a non-finite capacity calculation.`
      );
    }
    const overallocated = rawExcess > RESOURCE_CAPACITY_EPSILON;
    const overallocatedBy = overallocated ? rawExcess : 0;
    const remainingCapacity = overallocated
      ? -overallocatedBy
      : Math.max(0, capacity - totalClaimed);
    const contributingInitiativeIds = uniqueSorted(
      activeClaims.map(({ initiativeId }) => initiativeId)
    );
    const startingInitiativeIds = uniqueSorted(
      activeClaims
        .filter(({ isStartingThisPeriod }) => isStartingThisPeriod)
        .map(({ initiativeId }) => initiativeId)
    );

    return {
      resourceId: resource.id,
      period: input.period,
      capacity,
      totalClaimed,
      remainingCapacity,
      overallocatedBy,
      overallocated,
      activeClaims,
      contributingInitiativeIds,
      startingInitiativeIds,
      wouldBlockStartingInitiativeIds: overallocated
        ? [...startingInitiativeIds]
        : [],
    };
  });

  observations.sort((left, right) => compareText(left.resourceId, right.resourceId));
  return deepFreeze(observations);
}
