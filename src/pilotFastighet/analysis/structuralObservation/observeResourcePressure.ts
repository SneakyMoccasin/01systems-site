import type { DisplayedPeriod, ValidatedStructuralObservationContractV1 } from "./contract";
import { freezeObservationValue, type ObservationScenarioPlan } from "./observationPlanCore";
import { observeResourcePressureCore, RESOURCE_CAPACITY_EPSILON, type ActiveInitiativeResourceClaim, type ResourcePressureObservation } from "./resourcePressureCore";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";

export { RESOURCE_CAPACITY_EPSILON };
export type { ActiveInitiativeResourceClaim, ResourcePressureObservation };

function adaptV1Plan(contract: ValidatedStructuralObservationContractV1, scenarioPlan: ResolvedStructuralScenarioPlan): ObservationScenarioPlan {
  const definitions = new Map(contract.initiatives.map((item) => [item.id, item]));
  for (const initiative of scenarioPlan.initiatives) {
    const definition = definitions.get(initiative.initiativeId);
    if (!definition || definition.actionKey !== initiative.actionKey) throw new Error(`Structural resource invariant failed: initiative ${initiative.initiativeId} does not belong to the validated contract.`);
  }
  return freezeObservationValue(structuredClone({ scenario: scenarioPlan.scenario, initiatives: scenarioPlan.initiatives.map((initiative) => ({ initiativeId: initiative.initiativeId, scenario: initiative.scenario, bindingStatus: initiative.bindingStatus, plannedExecutionPeriod: initiative.plannedExecutionPeriod, definition: { initiativeId: initiative.initiativeId, prerequisites: initiative.definition.prerequisites, resourceClaims: initiative.definition.resourceClaims } })) }));
}

export function observeResourcePressureForPeriod(input: Readonly<{ contract: ValidatedStructuralObservationContractV1; scenarioPlan: ResolvedStructuralScenarioPlan; period: DisplayedPeriod }>): readonly ResourcePressureObservation[] {
  return observeResourcePressureCore({ resources: input.contract.resources, scenarioPlan: adaptV1Plan(input.contract, input.scenarioPlan), period: input.period });
}
