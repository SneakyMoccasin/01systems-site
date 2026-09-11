import type { ActionKey } from "../../actionEffects";
import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import {
  assessStructuralStartsForPeriod,
  type StructuralStartAssessment,
} from "./assessStructuralStarts";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import {
  observeResourcePressureForPeriod,
  type ActiveInitiativeResourceClaim,
  type ResourcePressureObservation,
} from "./observeResourcePressure";
import type {
  PreparedEngineContext,
  PreparedStructuralObservationFrame,
  PreparedStructuralObservationRun,
  StructuralObservationPhase,
} from "./prepareStructuralObservationRun";
import type {
  ResolvedStructuralInitiative,
  ResolvedStructuralScenarioPlan,
} from "./resolveScenarioPlans";
import {
  deriveAfterTransitionDiagnostics,
  deriveBeforeExecutionDiagnostics,
  type StructuralObservationDiagnostic,
} from "./structuralObservationDiagnostics";

export type DecisionSpaceSnapshotPhase = StructuralObservationPhase;
export type InitiativePlanningStatus =
  | "not-planned"
  | "scheduled-future"
  | "scheduled-current"
  | "scheduled-past";
export type InitiativeStructuralStatus =
  | "not-evaluated"
  | "eligible"
  | "would-be-blocked";
export type InitiativeExecutionStatus =
  | "not-executed"
  | "executed"
  | "executed-despite-structural-block";

export type InitiativeSnapshot = Readonly<{
  initiativeId: InitiativeId;
  actionKey: ActionKey;
  plannedExecutionPeriod: DisplayedPeriod | null;
  visibleActualExecutionPeriod: DisplayedPeriod | null;
  planningStatus: InitiativePlanningStatus;
  structuralStatus: InitiativeStructuralStatus;
  executionStatus: InitiativeExecutionStatus;
  startAssessment: StructuralStartAssessment | null;
  activeResourceClaims: readonly ActiveInitiativeResourceClaim[];
  unresolvedPrerequisiteIds: readonly InitiativeId[];
}>;

export type DecisionSpaceSnapshot = Readonly<{
  scenario: ScheduleScenarioId;
  period: DisplayedPeriod;
  phase: DecisionSpaceSnapshotPhase;
  initiatives: readonly InitiativeSnapshot[];
  resourcePressure: readonly ResourcePressureObservation[];
  engineContext: PreparedEngineContext | null;
  diagnostics: readonly StructuralObservationDiagnostic[];
}>;

export type StructuralObservationResult = Readonly<{
  version: "structural-observation-v1";
  horizon: number;
  scenarios: Readonly<{
    A: readonly DecisionSpaceSnapshot[];
    B: readonly DecisionSpaceSnapshot[];
  }>;
}>;

const SCENARIOS = ["A", "B"] as const;

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

function assertFrames(
  prepared: PreparedStructuralObservationRun,
  scenario: ScheduleScenarioId,
  plan: ResolvedStructuralScenarioPlan
): void {
  const frames = prepared.frames[scenario];
  if (frames.length !== prepared.horizon * 2) {
    throw new Error(
      `Decision Space invariant failed: scenario ${scenario} must have exactly two frames per period.`
    );
  }
  frames.forEach((frame, index) => {
    const expectedPeriod = Math.floor(index / 2) + 1;
    const expectedPhase = index % 2 === 0 ? "before-execution" : "after-transition";
    if (
      frame.scenario !== scenario ||
      frame.period !== expectedPeriod ||
      frame.phase !== expectedPhase ||
      frame.scenarioPlan !== plan
    ) {
      throw new Error(
        `Decision Space invariant failed: scenario ${scenario} frame ${index} has inconsistent scenario, period, phase, or plan.`
      );
    }
  });
}

function assertVisibleEvidence(
  frame: PreparedStructuralObservationFrame,
  plan: ResolvedStructuralScenarioPlan
): Map<ActionKey, StructuralExecutionEvidence> {
  const boundByAction = new Map(
    plan.initiatives
      .filter((initiative) => initiative.bindingStatus === "bound")
      .map((initiative) => [initiative.actionKey, initiative])
  );
  const evidenceByAction = new Map<ActionKey, StructuralExecutionEvidence>();
  for (const evidence of frame.visibleExecutionEvidence) {
    const initiative = boundByAction.get(evidence.actionKey);
    if (evidence.scenario !== frame.scenario || !initiative) {
      throw new Error(
        `Decision Space invariant failed: scenario ${frame.scenario} contains execution evidence for an unknown or unbound action.`
      );
    }
    if (evidenceByAction.has(evidence.actionKey)) {
      throw new Error(
        `Decision Space invariant failed: scenario ${frame.scenario} contains multiple visible executions for ${evidence.actionKey}.`
      );
    }
    if (evidence.scheduledExecutionPeriod !== initiative.plannedExecutionPeriod) {
      throw new Error(
        `Decision Space invariant failed: execution evidence for ${evidence.actionKey} disagrees with the resolved plan.`
      );
    }
    evidenceByAction.set(evidence.actionKey, evidence);
  }
  return evidenceByAction;
}

function planningStatus(
  initiative: ResolvedStructuralInitiative,
  period: DisplayedPeriod
): InitiativePlanningStatus {
  const planned = initiative.plannedExecutionPeriod;
  if (initiative.bindingStatus === "not-bound" || planned === null) return "not-planned";
  if (planned > period) return "scheduled-future";
  if (planned === period) return "scheduled-current";
  return "scheduled-past";
}

function copyClaims(
  observations: readonly ResourcePressureObservation[],
  initiativeId: InitiativeId
): ActiveInitiativeResourceClaim[] {
  return observations
    .flatMap(({ activeClaims }) => activeClaims)
    .filter((claim) => claim.initiativeId === initiativeId)
    .map((claim) => ({ ...claim }))
    .sort(
      (left, right) =>
        compareText(left.initiativeId, right.initiativeId) ||
        compareText(left.resourceId, right.resourceId)
    );
}

function copyResourcePressure(
  observations: readonly ResourcePressureObservation[]
): ResourcePressureObservation[] {
  return observations.map((observation) => ({
    ...observation,
    activeClaims: observation.activeClaims.map((claim) => ({ ...claim })),
    contributingInitiativeIds: [...observation.contributingInitiativeIds],
    startingInitiativeIds: [...observation.startingInitiativeIds],
    wouldBlockStartingInitiativeIds: [
      ...observation.wouldBlockStartingInitiativeIds,
    ],
  }));
}

function copyEngineContext(
  context: PreparedEngineContext | null
): PreparedEngineContext | null {
  return context === null
    ? null
    : {
        ...context,
        activeConstraints: context.activeConstraints.map((constraint) => ({
          ...constraint,
        })),
      };
}

function unresolvedPrerequisites(
  assessment: StructuralStartAssessment | null,
  isCurrent: boolean
): InitiativeId[] {
  if (!assessment || !isCurrent) return [];
  return [
    ...new Set(
      assessment.blockingReasons.flatMap((reason) =>
        reason.code === "resource-overallocated"
          ? []
          : [reason.prerequisiteInitiativeId]
      )
    ),
  ].sort(compareText);
}

function createSnapshotCore(input: Readonly<{
  frame: PreparedStructuralObservationFrame;
  plan: ResolvedStructuralScenarioPlan;
  assessmentHistory: ReadonlyMap<InitiativeId, StructuralStartAssessment>;
  resourcePressure: readonly ResourcePressureObservation[];
}>): Omit<DecisionSpaceSnapshot, "diagnostics"> {
  const evidenceByAction = assertVisibleEvidence(input.frame, input.plan);
  const initiatives = input.plan.initiatives.map((initiative): InitiativeSnapshot => {
    const planning = planningStatus(initiative, input.frame.period);
    const isCurrent = planning === "scheduled-current";
    const assessment = input.assessmentHistory.get(initiative.initiativeId) ?? null;
    if (
      initiative.bindingStatus === "bound" &&
      initiative.plannedExecutionPeriod !== null &&
      initiative.plannedExecutionPeriod <= input.frame.period &&
      assessment === null
    ) {
      throw new Error(
        `Decision Space invariant failed: bound initiative ${initiative.initiativeId} is missing its historical start assessment.`
      );
    }
    const evidence = evidenceByAction.get(initiative.actionKey) ?? null;
    if (evidence && assessment === null) {
      throw new Error(
        `Decision Space invariant failed: execution evidence for ${initiative.initiativeId} has no start assessment.`
      );
    }
    const executionStatus: InitiativeExecutionStatus = !evidence
      ? "not-executed"
      : assessment?.outcome === "would-be-blocked"
        ? "executed-despite-structural-block"
        : "executed";
    return {
      initiativeId: initiative.initiativeId,
      actionKey: initiative.actionKey,
      plannedExecutionPeriod: initiative.plannedExecutionPeriod,
      visibleActualExecutionPeriod: evidence?.actualExecutionPeriod ?? null,
      planningStatus: planning,
      structuralStatus: isCurrent
        ? (assessment?.outcome ?? "not-evaluated")
        : "not-evaluated",
      executionStatus,
      startAssessment: assessment,
      activeResourceClaims: copyClaims(
        input.resourcePressure,
        initiative.initiativeId
      ),
      unresolvedPrerequisiteIds: unresolvedPrerequisites(
        assessment,
        isCurrent
      ),
    };
  });
  initiatives.sort((left, right) =>
    compareText(left.initiativeId, right.initiativeId)
  );
  return {
    scenario: input.frame.scenario,
    period: input.frame.period,
    phase: input.frame.phase,
    initiatives,
    resourcePressure: copyResourcePressure(input.resourcePressure),
    engineContext: copyEngineContext(input.frame.engineContext),
  };
}

function buildScenario(
  prepared: PreparedStructuralObservationRun,
  scenario: ScheduleScenarioId
): DecisionSpaceSnapshot[] {
  const plan = prepared.scenarioPlans[scenario];
  assertFrames(prepared, scenario, plan);
  const history = new Map<InitiativeId, StructuralStartAssessment>();
  const snapshots: DecisionSpaceSnapshot[] = [];
  for (let numericPeriod = 1; numericPeriod <= prepared.horizon; numericPeriod += 1) {
    const period = numericPeriod as DisplayedPeriod;
    const before = prepared.frames[scenario][(numericPeriod - 1) * 2];
    const after = prepared.frames[scenario][(numericPeriod - 1) * 2 + 1];
    const resourcePressure = observeResourcePressureForPeriod({
      contract: prepared.contract,
      scenarioPlan: plan,
      period,
    });
    const assessments = assessStructuralStartsForPeriod({
      contract: prepared.contract,
      scenarioPlan: plan,
      period,
      provenance: before.visibleExecutionEvidence,
    });
    const currentIds = new Set(
      plan.initiatives
        .filter(({ plannedExecutionPeriod }) => plannedExecutionPeriod === period)
        .map(({ initiativeId }) => initiativeId)
    );
    if (assessments.length !== currentIds.size) {
      throw new Error(
        `Decision Space invariant failed: scenario ${scenario} is missing a current start assessment.`
      );
    }
    for (const assessment of assessments) {
      if (!currentIds.has(assessment.initiativeId)) {
        throw new Error(
          `Decision Space invariant failed: scenario ${scenario} has an assessment for a non-current initiative.`
        );
      }
      if (history.has(assessment.initiativeId)) {
        throw new Error(
          `Decision Space invariant failed: initiative ${assessment.initiativeId} has duplicate start assessments.`
        );
      }
      history.set(assessment.initiativeId, assessment);
    }
    const beforeCore = createSnapshotCore({
      frame: before,
      plan,
      assessmentHistory: history,
      resourcePressure,
    });
    snapshots.push({
      ...beforeCore,
      diagnostics: deriveBeforeExecutionDiagnostics(beforeCore),
    });
    const afterCore = createSnapshotCore({
      frame: after,
      plan,
      assessmentHistory: history,
      resourcePressure,
    });
    snapshots.push({
      ...afterCore,
      diagnostics: deriveAfterTransitionDiagnostics(
        afterCore,
        after.visibleExecutionEvidence
      ),
    });
  }
  return snapshots;
}

export function buildDecisionSpaceSnapshots(
  prepared: PreparedStructuralObservationRun
): StructuralObservationResult {
  if (prepared.preparationVersion !== "structural-observation-preparation-v1") {
    throw new Error(
      "Decision Space invariant failed: unsupported structural observation preparation version."
    );
  }
  const scenarios = {
    A: buildScenario(prepared, SCENARIOS[0]),
    B: buildScenario(prepared, SCENARIOS[1]),
  };
  return deepFreeze({
    version: "structural-observation-v1",
    horizon: prepared.horizon,
    scenarios,
  } satisfies StructuralObservationResult);
}
