import { assessInitiativeDependencyStartsForPeriod } from "./assessInitiativeDependencyStarts";
import type { DisplayedPeriod } from "./contract";
import { observeInitiativeResourcePressureForPeriod } from "./observeInitiativeResourcePressure";
import type { PreparedInitiativeStructuralObservationRunV2, StructuralInitiativeExecutionEvidenceV1 } from "./prepareInitiativeStructuralObservationRun";
import { toObservationScenarioPlanV2, type ResolvedInitiativeObservationScenarioPlanV2 } from "./resolveInitiativeObservationPlans";
import { combineStructuralStartAssessmentsCore, type StructuralStartAssessment } from "./structuralStartAssessmentCore";

export function assessInitiativeStructuralStartsForPeriod(input: Readonly<{ prepared: PreparedInitiativeStructuralObservationRunV2; scenarioPlan: ResolvedInitiativeObservationScenarioPlanV2; period: DisplayedPeriod; visibleExecutionEvidence: readonly StructuralInitiativeExecutionEvidenceV1[] }>): readonly StructuralStartAssessment[] {
  const dependencyAssessments = assessInitiativeDependencyStartsForPeriod({ scenarioPlan: input.scenarioPlan, period: input.period, visibleExecutionEvidence: input.visibleExecutionEvidence });
  const resourcePressure = observeInitiativeResourcePressureForPeriod({ prepared: input.prepared, scenarioPlan: input.scenarioPlan, period: input.period });
  return combineStructuralStartAssessmentsCore({ scenarioPlan: toObservationScenarioPlanV2(input.scenarioPlan), period: input.period, dependencyAssessments, resourcePressure });
}
