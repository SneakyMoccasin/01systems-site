import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import { compareObservationText, freezeObservationValue, type ObservationExecutionEvidence, type ObservationScenarioPlan } from "./observationPlanCore";

export type DependencyBlockingReason = Readonly<{ code: "prerequisite-not-planned"; prerequisiteInitiativeId: InitiativeId }> | Readonly<{ code: "prerequisite-not-completed-before-start"; prerequisiteInitiativeId: InitiativeId; prerequisitePlannedPeriod: DisplayedPeriod | null; priorActualExecutionPeriod: DisplayedPeriod | null }>;
export type DependencyStartAssessment = Readonly<{ initiativeId: InitiativeId; scenario: ScheduleScenarioId; evaluatedAtPeriod: DisplayedPeriod; outcome: "eligible" | "would-be-blocked"; blockingReasons: readonly DependencyBlockingReason[] }>;

function invariant(message: string): never { throw new Error(`Structural dependency invariant failed: ${message}`); }

function assertInputs(scenarioPlan: ObservationScenarioPlan, period: DisplayedPeriod, evidence: readonly ObservationExecutionEvidence[]): Map<InitiativeId, ObservationExecutionEvidence> {
  if (!Number.isInteger(period) || period < 1) invariant("period must be positive.");
  const initiativeById = new Map<string, ObservationScenarioPlan["initiatives"][number]>();
  for (const initiative of scenarioPlan.initiatives) {
    const id = initiative.initiativeId as string;
    if (initiativeById.has(id)) invariant(`duplicate initiative ${id} in plan.`);
    if (initiative.scenario !== scenarioPlan.scenario) invariant(`scenario ${scenarioPlan.scenario} contains initiative ${id} for ${initiative.scenario}.`);
    if (initiative.definition.initiativeId !== initiative.initiativeId) invariant(`initiative ${id} disagrees with its definition.`);
    if (initiative.bindingStatus === "bound" && initiative.plannedExecutionPeriod === null) invariant(`bound initiative ${id} has no planned execution period.`);
    if (initiative.bindingStatus === "not-bound" && initiative.plannedExecutionPeriod !== null) invariant(`not-bound initiative ${id} has a fabricated planned execution period.`);
    initiativeById.set(id, initiative);
  }
  const evidenceById = new Map<InitiativeId, ObservationExecutionEvidence>();
  for (const execution of evidence) {
    const id = execution.initiativeId as string;
    if (execution.scenario !== scenarioPlan.scenario) invariant(`scenario ${scenarioPlan.scenario} contains evidence for scenario ${execution.scenario}.`);
    const initiative = initiativeById.get(id);
    if (!initiative) invariant(`evidence references unknown initiative ${id}.`);
    if (initiative.bindingStatus !== "bound" || initiative.plannedExecutionPeriod === null) invariant(`evidence references unbound initiative ${id}.`);
    if (evidenceById.has(execution.initiativeId)) invariant(`duplicate evidence for initiative ${id}.`);
    if (!Number.isInteger(execution.scheduledExecutionPeriod) || execution.scheduledExecutionPeriod < 1 || !Number.isInteger(execution.actualExecutionPeriod) || execution.actualExecutionPeriod < 1) invariant(`initiative ${id} has invalid execution evidence.`);
    if (execution.scheduledExecutionPeriod !== initiative.plannedExecutionPeriod) invariant(`evidence for initiative ${id} disagrees with its planned period.`);
    evidenceById.set(execution.initiativeId, execution);
  }
  return evidenceById;
}

export function assessDependencyStartsCore(input: Readonly<{ scenarioPlan: ObservationScenarioPlan; period: DisplayedPeriod; visibleExecutionEvidence: readonly ObservationExecutionEvidence[] }>): readonly DependencyStartAssessment[] {
  const evidenceById = assertInputs(input.scenarioPlan, input.period, input.visibleExecutionEvidence);
  const initiativeById = new Map(input.scenarioPlan.initiatives.map((initiative) => [initiative.initiativeId, initiative]));
  const assessments = input.scenarioPlan.initiatives.filter(({ plannedExecutionPeriod }) => plannedExecutionPeriod === input.period).map((initiative): DependencyStartAssessment => {
    const blockingReasons: DependencyBlockingReason[] = [];
    for (const dependency of initiative.definition.prerequisites) {
      const prerequisite = initiativeById.get(dependency.initiativeId);
      if (!prerequisite) invariant(`prerequisite ${dependency.initiativeId} is absent from scenario ${input.scenarioPlan.scenario}.`);
      if (prerequisite.bindingStatus === "not-bound") {
        blockingReasons.push({ code: "prerequisite-not-planned", prerequisiteInitiativeId: prerequisite.initiativeId });
        continue;
      }
      const execution = evidenceById.get(prerequisite.initiativeId);
      const prior = execution && execution.actualExecutionPeriod < input.period ? execution.actualExecutionPeriod : null;
      if (prior === null) blockingReasons.push({ code: "prerequisite-not-completed-before-start", prerequisiteInitiativeId: prerequisite.initiativeId, prerequisitePlannedPeriod: prerequisite.plannedExecutionPeriod, priorActualExecutionPeriod: null });
    }
    blockingReasons.sort((left, right) => compareObservationText(left.code, right.code) || compareObservationText(left.prerequisiteInitiativeId, right.prerequisiteInitiativeId));
    return { initiativeId: initiative.initiativeId, scenario: input.scenarioPlan.scenario, evaluatedAtPeriod: input.period, outcome: blockingReasons.length === 0 ? "eligible" : "would-be-blocked", blockingReasons };
  }).sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  return freezeObservationValue(structuredClone(assessments));
}
