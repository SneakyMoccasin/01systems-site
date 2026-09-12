import type { ScenarioExecutionProvenance } from "../reactScheduledAnalysisBoundary";
import { assessDependencyStartsForPeriod } from "./assessDependencyStarts";
import type { DisplayedPeriod, ValidatedStructuralObservationContractV1 } from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import { observeResourcePressureForPeriod } from "./observeResourcePressure";
import { freezeObservationValue, type ObservationScenarioPlan } from "./observationPlanCore";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";
import { combineStructuralStartAssessmentsCore, type ResourceBlockingReason, type StructuralBlockingReason, type StructuralStartAssessment } from "./structuralStartAssessmentCore";

export type { ResourceBlockingReason, StructuralBlockingReason, StructuralStartAssessment };
function adaptPlan(plan: ResolvedStructuralScenarioPlan): ObservationScenarioPlan {
  return freezeObservationValue(structuredClone({ scenario: plan.scenario, initiatives: plan.initiatives.map((initiative) => ({ initiativeId: initiative.initiativeId, scenario: initiative.scenario, bindingStatus: initiative.bindingStatus, plannedExecutionPeriod: initiative.plannedExecutionPeriod, definition: { initiativeId: initiative.initiativeId, prerequisites: initiative.definition.prerequisites, resourceClaims: initiative.definition.resourceClaims } })) }));
}
export function assessStructuralStartsForPeriod(input: Readonly<{ contract: ValidatedStructuralObservationContractV1; scenarioPlan: ResolvedStructuralScenarioPlan; period: DisplayedPeriod; provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[] }>): readonly StructuralStartAssessment[] {
  const dependencyAssessments = assessDependencyStartsForPeriod({ scenarioPlan: input.scenarioPlan, period: input.period, provenance: input.provenance });
  const resourcePressure = observeResourcePressureForPeriod({ contract: input.contract, scenarioPlan: input.scenarioPlan, period: input.period });
  return combineStructuralStartAssessmentsCore({ scenarioPlan: adaptPlan(input.scenarioPlan), period: input.period, dependencyAssessments, resourcePressure });
}
