import type { ScenarioExecutionProvenance, ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod } from "./contract";
import { assessDependencyStartsCore, type DependencyBlockingReason, type DependencyStartAssessment } from "./dependencyAssessmentCore";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import { freezeObservationValue, type ObservationExecutionEvidence, type ObservationScenarioPlan } from "./observationPlanCore";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";

export type { DependencyBlockingReason, DependencyStartAssessment };

function canonicalProvenanceScenario(scenario: ScheduleScenarioId) { return scenario === "A" ? "scenarioA" : "scenarioB"; }
function structuralEvidence(scenarioPlan: ResolvedStructuralScenarioPlan, provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[]): readonly StructuralExecutionEvidence[] {
  if (Array.isArray(provenance)) return provenance;
  const expectedScenario = canonicalProvenanceScenario(scenarioPlan.scenario);
  return (provenance as ScenarioExecutionProvenance)[scenarioPlan.scenario].map((execution) => {
    if (execution.scenario !== expectedScenario) throw new Error(`Structural dependency invariant failed: scenario ${scenarioPlan.scenario} contains provenance for ${execution.scenario}.`);
    return { scenario: scenarioPlan.scenario, actionKey: execution.actionId, scheduledExecutionPeriod: execution.scheduledStep as DisplayedPeriod, actualExecutionPeriod: execution.actualExecutionStep as DisplayedPeriod };
  });
}
function adaptV1Plan(scenarioPlan: ResolvedStructuralScenarioPlan): ObservationScenarioPlan {
  const initiativeIds = scenarioPlan.initiatives.map(({ initiativeId }) => initiativeId);
  if (new Set(initiativeIds).size !== initiativeIds.length) {
    throw new Error(
      "Combined structural assessment invariant failed: dependency assessments must cover every current starter exactly once."
    );
  }
  return freezeObservationValue(structuredClone({ scenario: scenarioPlan.scenario, initiatives: scenarioPlan.initiatives.map((initiative) => ({ initiativeId: initiative.initiativeId, scenario: initiative.scenario, bindingStatus: initiative.bindingStatus, plannedExecutionPeriod: initiative.plannedExecutionPeriod, definition: { initiativeId: initiative.initiativeId, prerequisites: initiative.definition.prerequisites, resourceClaims: initiative.definition.resourceClaims } })) }));
}
function adaptV1Evidence(scenarioPlan: ResolvedStructuralScenarioPlan, provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[]): readonly ObservationExecutionEvidence[] {
  const boundByAction = new Map<string, typeof scenarioPlan.initiatives>();
  for (const initiative of scenarioPlan.initiatives) {
    if (initiative.bindingStatus !== "bound") continue;
    boundByAction.set(initiative.actionKey, [...(boundByAction.get(initiative.actionKey) ?? []), initiative]);
  }
  const seenActions = new Set<string>();
  const result = structuralEvidence(scenarioPlan, provenance).map((execution) => {
    if (seenActions.has(execution.actionKey)) {
      throw new Error(
        `Structural dependency invariant failed: scenario ${scenarioPlan.scenario} contains duplicate provenance for action ${execution.actionKey}.`
      );
    }
    seenActions.add(execution.actionKey);
    const matches = boundByAction.get(execution.actionKey) ?? [];
    if (matches.length !== 1) throw new Error(`Structural dependency invariant failed: action ${execution.actionKey} must match exactly one bound initiative in scenario ${scenarioPlan.scenario}.`);
    return { scenario: execution.scenario, initiativeId: matches[0].initiativeId, scheduledExecutionPeriod: execution.scheduledExecutionPeriod, actualExecutionPeriod: execution.actualExecutionPeriod };
  });
  return freezeObservationValue(structuredClone(result));
}

export function assessDependencyStartsForPeriod(input: Readonly<{ scenarioPlan: ResolvedStructuralScenarioPlan; period: DisplayedPeriod; provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[] }>): readonly DependencyStartAssessment[] {
  return assessDependencyStartsCore({ scenarioPlan: adaptV1Plan(input.scenarioPlan), period: input.period, visibleExecutionEvidence: adaptV1Evidence(input.scenarioPlan, input.provenance) });
}
