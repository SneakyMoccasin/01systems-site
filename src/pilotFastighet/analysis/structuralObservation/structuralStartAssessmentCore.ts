import type { DependencyBlockingReason, DependencyStartAssessment } from "./dependencyAssessmentCore";
import type { DisplayedPeriod, InitiativeId, SharedResourceId } from "./contract";
import { compareObservationText, freezeObservationValue, type ObservationScenarioPlan } from "./observationPlanCore";
import type { ResourcePressureObservation } from "./resourcePressureCore";

export type ResourceBlockingReason = Readonly<{ code: "resource-overallocated"; resourceId: SharedResourceId; period: DisplayedPeriod; capacity: number; demandIncludingCurrentStarts: number; overallocatedBy: number }>;
export type StructuralBlockingReason = DependencyBlockingReason | ResourceBlockingReason;
export type StructuralStartAssessment = Readonly<{ initiativeId: InitiativeId; scenario: ObservationScenarioPlan["scenario"]; evaluatedAtPeriod: DisplayedPeriod; outcome: "eligible" | "would-be-blocked"; blockingReasons: readonly StructuralBlockingReason[] }>;
const BLOCKING_REASON_ORDER = Object.freeze({ "prerequisite-not-planned": 0, "prerequisite-not-completed-before-start": 1, "resource-overallocated": 2 } satisfies Readonly<Record<StructuralBlockingReason["code"], number>>);
function invariant(message: string): never { throw new Error(`Combined structural assessment invariant failed: ${message}`); }
function reasonIdentity(reason: StructuralBlockingReason): string { return reason.code === "resource-overallocated" ? reason.resourceId : reason.prerequisiteInitiativeId; }

export function combineStructuralStartAssessmentsCore(input: Readonly<{ scenarioPlan: ObservationScenarioPlan; period: DisplayedPeriod; dependencyAssessments: readonly DependencyStartAssessment[]; resourcePressure: readonly ResourcePressureObservation[] }>): readonly StructuralStartAssessment[] {
  if (!Number.isInteger(input.period) || input.period < 1) invariant("period must be positive.");
  const currentIds = input.scenarioPlan.initiatives.filter(({ plannedExecutionPeriod }) => plannedExecutionPeriod === input.period).map(({ initiativeId }) => initiativeId);
  const currentSet = new Set(currentIds);
  if (currentSet.size !== currentIds.length || input.dependencyAssessments.length !== currentSet.size) invariant("dependency assessments must cover every current starter exactly once.");
  const assessmentIds = new Set<string>();
  for (const assessment of input.dependencyAssessments) {
    if (!currentSet.has(assessment.initiativeId)) invariant(`dependency assessment contains non-current initiative ${assessment.initiativeId}.`);
    if (assessmentIds.has(assessment.initiativeId)) invariant(`duplicate dependency assessment for ${assessment.initiativeId}.`);
    assessmentIds.add(assessment.initiativeId);
    if (assessment.scenario !== input.scenarioPlan.scenario || assessment.evaluatedAtPeriod !== input.period) invariant("dependency assessment scenario or period does not match the requested start.");
  }
  const resourcesByInitiative = new Map<InitiativeId, ResourceBlockingReason[]>();
  const reasonIds = new Set<string>();
  for (const resource of input.resourcePressure) {
    if (resource.period !== input.period) invariant(`resource ${resource.resourceId} does not match the requested period.`);
    for (const initiativeId of resource.wouldBlockStartingInitiativeIds) {
      if (!currentSet.has(initiativeId)) invariant(`resource ${resource.resourceId} would block non-current initiative ${initiativeId}.`);
      const key = `${initiativeId}\0${resource.resourceId}`;
      if (reasonIds.has(key)) invariant(`duplicate resource reason for ${initiativeId} and ${resource.resourceId}.`);
      reasonIds.add(key);
      const reasons = resourcesByInitiative.get(initiativeId) ?? [];
      reasons.push({ code: "resource-overallocated", resourceId: resource.resourceId, period: resource.period, capacity: resource.capacity, demandIncludingCurrentStarts: resource.totalClaimed, overallocatedBy: resource.overallocatedBy });
      resourcesByInitiative.set(initiativeId, reasons);
    }
  }
  const result = input.dependencyAssessments.map((assessment) => {
    const blockingReasons: StructuralBlockingReason[] = [...assessment.blockingReasons, ...(resourcesByInitiative.get(assessment.initiativeId) ?? [])];
    blockingReasons.sort((left, right) => BLOCKING_REASON_ORDER[left.code] - BLOCKING_REASON_ORDER[right.code] || compareObservationText(reasonIdentity(left), reasonIdentity(right)));
    return { initiativeId: assessment.initiativeId, scenario: assessment.scenario, evaluatedAtPeriod: assessment.evaluatedAtPeriod, outcome: blockingReasons.length === 0 ? "eligible" as const : "would-be-blocked" as const, blockingReasons };
  }).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  return freezeObservationValue(structuredClone(result));
}
