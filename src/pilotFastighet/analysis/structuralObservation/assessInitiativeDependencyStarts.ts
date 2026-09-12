import type { DisplayedPeriod } from "./contract";
import { assessDependencyStartsCore, type DependencyStartAssessment } from "./dependencyAssessmentCore";
import { freezeObservationValue } from "./observationPlanCore";
import type { PreparedInitiativeObservationFrameV2, StructuralInitiativeExecutionEvidenceV1 } from "./prepareInitiativeStructuralObservationRun";
import { toObservationScenarioPlanV2, type ResolvedInitiativeObservationScenarioPlanV2 } from "./resolveInitiativeObservationPlans";

export function assessInitiativeDependencyStartsForPeriod(input: Readonly<{ scenarioPlan: ResolvedInitiativeObservationScenarioPlanV2; period: DisplayedPeriod; visibleExecutionEvidence: readonly StructuralInitiativeExecutionEvidenceV1[] }>): readonly DependencyStartAssessment[] {
  const initiativeById = new Map(input.scenarioPlan.initiatives.map((initiative) => [initiative.initiativeId, initiative]));
  const evidence = input.visibleExecutionEvidence.map((entry) => {
    const initiative = initiativeById.get(entry.initiativeId);
    if (!initiative || initiative.effectDefinitionId !== entry.effectDefinitionId) {
      throw new Error(
        `Initiative dependency adapter invariant failed: evidence for ${entry.initiativeId} does not match its scenario-plan definition.`
      );
    }
    return { scenario: entry.scenario, initiativeId: entry.initiativeId, scheduledExecutionPeriod: entry.scheduledExecutionPeriod, actualExecutionPeriod: entry.actualExecutionPeriod };
  });
  return assessDependencyStartsCore({ scenarioPlan: toObservationScenarioPlanV2(input.scenarioPlan), period: input.period, visibleExecutionEvidence: freezeObservationValue(structuredClone(evidence)) });
}
export function assessInitiativeDependencyStartsForFrame(input: Readonly<{ scenarioPlan: ResolvedInitiativeObservationScenarioPlanV2; frame: PreparedInitiativeObservationFrameV2 }>): readonly DependencyStartAssessment[] {
  if (input.frame.scenario !== input.scenarioPlan.scenario) throw new Error("Initiative dependency adapter invariant failed: frame and scenario plan disagree.");
  return assessInitiativeDependencyStartsForPeriod({ scenarioPlan: input.scenarioPlan, period: input.frame.period, visibleExecutionEvidence: input.frame.visibleExecutionEvidence });
}
