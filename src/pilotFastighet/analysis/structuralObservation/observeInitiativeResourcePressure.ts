import type { DisplayedPeriod } from "./contract";
import type { PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";
import { observeResourcePressureCore, type ResourcePressureObservation } from "./resourcePressureCore";
import { toObservationScenarioPlanV2, type ResolvedInitiativeObservationScenarioPlanV2 } from "./resolveInitiativeObservationPlans";

export function observeInitiativeResourcePressureForPeriod(input: Readonly<{ prepared: PreparedInitiativeStructuralObservationRunV2; scenarioPlan: ResolvedInitiativeObservationScenarioPlanV2; period: DisplayedPeriod }>): readonly ResourcePressureObservation[] {
  if (input.scenarioPlan !== undefined && input.scenarioPlan.scenario !== "A" && input.scenarioPlan.scenario !== "B") throw new Error("Initiative resource invariant failed: unknown scenario.");
  return observeResourcePressureCore({ resources: input.prepared.contract.resources, scenarioPlan: toObservationScenarioPlanV2(input.scenarioPlan), period: input.period });
}
