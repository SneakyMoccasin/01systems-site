import type {
  ScenarioExecutionProvenance,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import {
  assessDependencyStartsForPeriod,
  type DependencyBlockingReason,
  type DependencyStartAssessment,
} from "./assessDependencyStarts";
import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceId,
  ValidatedStructuralObservationContractV1,
} from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import {
  observeResourcePressureForPeriod,
  type ResourcePressureObservation,
} from "./observeResourcePressure";
import type { ResolvedStructuralScenarioPlan } from "./resolveScenarioPlans";

export type ResourceBlockingReason = Readonly<{
  code: "resource-overallocated";
  resourceId: SharedResourceId;
  period: DisplayedPeriod;
  capacity: number;
  demandIncludingCurrentStarts: number;
  overallocatedBy: number;
}>;

export type StructuralBlockingReason =
  | DependencyBlockingReason
  | ResourceBlockingReason;

export type StructuralStartAssessment = Readonly<{
  initiativeId: InitiativeId;
  scenario: ScheduleScenarioId;
  evaluatedAtPeriod: DisplayedPeriod;
  outcome: "eligible" | "would-be-blocked";
  blockingReasons: readonly StructuralBlockingReason[];
}>;

const BLOCKING_REASON_ORDER = Object.freeze({
  "prerequisite-not-planned": 0,
  "prerequisite-not-completed-before-start": 1,
  "resource-overallocated": 2,
} satisfies Readonly<Record<StructuralBlockingReason["code"], number>>);

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

function reasonIdentity(reason: StructuralBlockingReason): string {
  return reason.code === "resource-overallocated"
    ? reason.resourceId
    : reason.prerequisiteInitiativeId;
}

function assertCombinedInvariants(input: Readonly<{
  scenarioPlan: ResolvedStructuralScenarioPlan;
  period: DisplayedPeriod;
  dependencyAssessments: readonly DependencyStartAssessment[];
  resourceObservations: readonly ResourcePressureObservation[];
}>): void {
  const currentStarters = new Set(
    input.scenarioPlan.initiatives
      .filter(({ plannedExecutionPeriod }) => plannedExecutionPeriod === input.period)
      .map(({ initiativeId }) => initiativeId)
  );
  for (const assessment of input.dependencyAssessments) {
    if (!currentStarters.has(assessment.initiativeId)) {
      throw new Error(
        `Combined structural assessment invariant failed: dependency assessment ` +
          `contains non-current initiative ${assessment.initiativeId}.`
      );
    }
    if (
      assessment.scenario !== input.scenarioPlan.scenario ||
      assessment.evaluatedAtPeriod !== input.period
    ) {
      throw new Error(
        `Combined structural assessment invariant failed: dependency assessment ` +
          `scenario or period does not match the requested start.`
      );
    }
  }
  if (input.dependencyAssessments.length !== currentStarters.size) {
    throw new Error(
      "Combined structural assessment invariant failed: dependency assessments " +
        "must cover every current starter exactly once."
    );
  }
  for (const resource of input.resourceObservations) {
    if (resource.period !== input.period) {
      throw new Error(
        `Combined structural assessment invariant failed: resource ${resource.resourceId} ` +
          `does not match the requested period.`
      );
    }
    for (const initiativeId of resource.wouldBlockStartingInitiativeIds) {
      if (!currentStarters.has(initiativeId)) {
        throw new Error(
          `Combined structural assessment invariant failed: resource ${resource.resourceId} ` +
            `would block non-current initiative ${initiativeId}.`
        );
      }
    }
  }
}

export function assessStructuralStartsForPeriod(input: Readonly<{
  contract: ValidatedStructuralObservationContractV1;
  scenarioPlan: ResolvedStructuralScenarioPlan;
  period: DisplayedPeriod;
  provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[];
}>): readonly StructuralStartAssessment[] {
  const dependencyAssessments = assessDependencyStartsForPeriod({
    scenarioPlan: input.scenarioPlan,
    period: input.period,
    provenance: input.provenance,
  });
  const resourceObservations = observeResourcePressureForPeriod({
    contract: input.contract,
    scenarioPlan: input.scenarioPlan,
    period: input.period,
  });
  assertCombinedInvariants({
    scenarioPlan: input.scenarioPlan,
    period: input.period,
    dependencyAssessments,
    resourceObservations,
  });

  const resourcesByInitiative = new Map<InitiativeId, ResourceBlockingReason[]>();
  for (const resource of resourceObservations) {
    for (const initiativeId of resource.wouldBlockStartingInitiativeIds) {
      const reasons = resourcesByInitiative.get(initiativeId) ?? [];
      reasons.push({
        code: "resource-overallocated",
        resourceId: resource.resourceId,
        period: resource.period,
        capacity: resource.capacity,
        demandIncludingCurrentStarts: resource.totalClaimed,
        overallocatedBy: resource.overallocatedBy,
      });
      resourcesByInitiative.set(initiativeId, reasons);
    }
  }

  const assessments = dependencyAssessments.map((dependencyAssessment) => {
    const blockingReasons: StructuralBlockingReason[] = [
      ...dependencyAssessment.blockingReasons,
      ...(resourcesByInitiative.get(dependencyAssessment.initiativeId) ?? []),
    ];
    blockingReasons.sort(
      (left, right) =>
        BLOCKING_REASON_ORDER[left.code] - BLOCKING_REASON_ORDER[right.code] ||
        compareText(reasonIdentity(left), reasonIdentity(right))
    );
    return {
      initiativeId: dependencyAssessment.initiativeId,
      scenario: dependencyAssessment.scenario,
      evaluatedAtPeriod: dependencyAssessment.evaluatedAtPeriod,
      outcome: blockingReasons.length === 0 ? "eligible" : "would-be-blocked",
      blockingReasons,
    } as const;
  });
  assessments.sort((left, right) =>
    compareText(left.initiativeId, right.initiativeId)
  );
  return deepFreeze(assessments);
}
