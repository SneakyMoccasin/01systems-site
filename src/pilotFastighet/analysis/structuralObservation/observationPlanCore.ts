import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod, InitiativeId, InitiativePrerequisite, InitiativeResourceClaim } from "./contract";

export type ObservationPlanDefinition = Readonly<{ initiativeId: InitiativeId; prerequisites: readonly InitiativePrerequisite[]; resourceClaims: readonly InitiativeResourceClaim[] }>;
export type ObservationPlannedInitiative = Readonly<{ initiativeId: InitiativeId; scenario: ScheduleScenarioId; bindingStatus: "bound" | "not-bound"; plannedExecutionPeriod: DisplayedPeriod | null; definition: ObservationPlanDefinition }>;
export type ObservationScenarioPlan = Readonly<{ scenario: ScheduleScenarioId; initiatives: readonly ObservationPlannedInitiative[] }>;
export type ObservationExecutionEvidence = Readonly<{ scenario: ScheduleScenarioId; initiativeId: InitiativeId; scheduledExecutionPeriod: DisplayedPeriod; actualExecutionPeriod: DisplayedPeriod }>;

export function compareObservationText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
export function freezeObservationValue<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) freezeObservationValue(nested);
  }
  return value;
}
