import type {
  ScenarioExecutionProvenance,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import type {
  ResolvedStructuralInitiative,
  ResolvedStructuralScenarioPlan,
} from "./resolveScenarioPlans";

export type DependencyBlockingReason =
  | Readonly<{
      code: "prerequisite-not-planned";
      prerequisiteInitiativeId: InitiativeId;
    }>
  | Readonly<{
      code: "prerequisite-not-completed-before-start";
      prerequisiteInitiativeId: InitiativeId;
      prerequisitePlannedPeriod: DisplayedPeriod | null;
      priorActualExecutionPeriod: DisplayedPeriod | null;
    }>;

export type DependencyStartAssessment = Readonly<{
  initiativeId: InitiativeId;
  scenario: ScheduleScenarioId;
  evaluatedAtPeriod: DisplayedPeriod;
  outcome: "eligible" | "would-be-blocked";
  blockingReasons: readonly DependencyBlockingReason[];
}>;

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

function canonicalProvenanceScenario(scenario: ScheduleScenarioId) {
  return scenario === "A" ? "scenarioA" : "scenarioB";
}

function structuralEvidence(
  scenarioPlan: ResolvedStructuralScenarioPlan,
  provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[]
): readonly StructuralExecutionEvidence[] {
  if (Array.isArray(provenance)) return provenance;
  const expectedScenario = canonicalProvenanceScenario(scenarioPlan.scenario);
  return (provenance as ScenarioExecutionProvenance)[scenarioPlan.scenario].map(
    (execution) => {
      if (execution.scenario !== expectedScenario) {
        throw new Error(
          `Structural dependency invariant failed: scenario ${scenarioPlan.scenario} ` +
            `contains provenance for ${execution.scenario}.`
        );
      }
      if (
        !Number.isInteger(execution.actualExecutionStep) ||
        execution.actualExecutionStep < 1
      ) {
        throw new Error(
          `Structural dependency invariant failed: action ${execution.actionId} ` +
            `has an invalid actual execution period.`
        );
      }
      return {
        scenario: scenarioPlan.scenario,
        actionKey: execution.actionId,
        scheduledExecutionPeriod: execution.scheduledStep as DisplayedPeriod,
        actualExecutionPeriod: execution.actualExecutionStep as DisplayedPeriod,
      };
    }
  );
}

function assertCanonicalEvidence(
  scenarioPlan: ResolvedStructuralScenarioPlan,
  evidence: readonly StructuralExecutionEvidence[]
): void {
  const seenActions = new Set<string>();
  for (const execution of evidence) {
    if (execution.scenario !== scenarioPlan.scenario) {
      throw new Error(
        `Structural dependency invariant failed: scenario ${scenarioPlan.scenario} ` +
          `contains evidence for scenario ${execution.scenario}.`
      );
    }
    if (seenActions.has(execution.actionKey)) {
      throw new Error(
        `Structural dependency invariant failed: scenario ${scenarioPlan.scenario} ` +
          `contains duplicate provenance for action ${execution.actionKey}.`
      );
    }
    if (
      !Number.isInteger(execution.scheduledExecutionPeriod) ||
      execution.scheduledExecutionPeriod < 1 ||
      !Number.isInteger(execution.actualExecutionPeriod) ||
      execution.actualExecutionPeriod < 1
    ) {
      throw new Error(
        `Structural dependency invariant failed: action ${execution.actionKey} ` +
          `has invalid structural execution evidence.`
      );
    }
    seenActions.add(execution.actionKey);
  }
}

function priorExecutionPeriod(
  prerequisite: ResolvedStructuralInitiative,
  period: DisplayedPeriod,
  evidence: readonly StructuralExecutionEvidence[]
): DisplayedPeriod | null {
  const execution = evidence.find(
    (candidate) => candidate.actionKey === prerequisite.actionKey
  );
  return execution && execution.actualExecutionPeriod < period
    ? execution.actualExecutionPeriod
    : null;
}

export function assessDependencyStartsForPeriod(input: Readonly<{
  scenarioPlan: ResolvedStructuralScenarioPlan;
  period: DisplayedPeriod;
  provenance: ScenarioExecutionProvenance | readonly StructuralExecutionEvidence[];
}>): readonly DependencyStartAssessment[] {
  if (!Number.isInteger(input.period) || input.period < 1) {
    throw new Error("Structural dependency invariant failed: period must be positive.");
  }
  const evidence = structuralEvidence(input.scenarioPlan, input.provenance);
  assertCanonicalEvidence(input.scenarioPlan, evidence);

  const initiativeById = new Map(
    input.scenarioPlan.initiatives.map((initiative) => [
      initiative.initiativeId,
      initiative,
    ])
  );
  const assessments = input.scenarioPlan.initiatives
    .filter(
      (initiative) => initiative.plannedExecutionPeriod === input.period
    )
    .map((initiative): DependencyStartAssessment => {
      const blockingReasons: DependencyBlockingReason[] = [];
      for (const dependency of initiative.definition.prerequisites) {
        const prerequisite = initiativeById.get(dependency.initiativeId);
        if (!prerequisite) {
          throw new Error(
            `Structural dependency invariant failed: prerequisite ${dependency.initiativeId} ` +
              `is absent from scenario ${input.scenarioPlan.scenario}.`
          );
        }
        if (prerequisite.bindingStatus === "not-bound") {
          blockingReasons.push({
            code: "prerequisite-not-planned",
            prerequisiteInitiativeId: prerequisite.initiativeId,
          });
          continue;
        }
        const actualPeriod = priorExecutionPeriod(
          prerequisite,
          input.period,
          evidence
        );
        if (actualPeriod === null) {
          blockingReasons.push({
            code: "prerequisite-not-completed-before-start",
            prerequisiteInitiativeId: prerequisite.initiativeId,
            prerequisitePlannedPeriod: prerequisite.plannedExecutionPeriod,
            priorActualExecutionPeriod: null,
          });
        }
      }
      blockingReasons.sort(
        (left, right) =>
          compareText(left.code, right.code) ||
          compareText(
            left.prerequisiteInitiativeId,
            right.prerequisiteInitiativeId
          )
      );
      return {
        initiativeId: initiative.initiativeId,
        scenario: input.scenarioPlan.scenario,
        evaluatedAtPeriod: input.period,
        outcome:
          blockingReasons.length === 0 ? "eligible" : "would-be-blocked",
        blockingReasons,
      };
    })
    .sort((left, right) =>
      compareText(left.initiativeId, right.initiativeId)
    );

  return deepFreeze(assessments);
}
