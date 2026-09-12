import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type { EffectDefinitionId } from "./contractV2";
import type {
  InitiativeExecutionStatus,
  InitiativePlanningStatus,
  InitiativeStructuralStatus,
} from "./buildDecisionSpaceSnapshots";
import {
  assessInitiativeStructuralStartsForPeriod,
} from "./assessInitiativeStructuralStarts";
import type { StructuralStartAssessment } from "./structuralStartAssessmentCore";
import {
  observeInitiativeResourcePressureForPeriod,
} from "./observeInitiativeResourcePressure";
import type {
  ActiveInitiativeResourceClaim,
  ResourcePressureObservation,
} from "./resourcePressureCore";
import {
  resolveInitiativeObservationPlans,
  type ResolvedInitiativeObservationPlanEntryV2,
  type ResolvedInitiativeObservationScenarioPlanV2,
} from "./resolveInitiativeObservationPlans";
import type {
  PreparedEngineContext,
  StructuralObservationPhase,
} from "./prepareStructuralObservationRun";
import type {
  PreparedInitiativeObservationFrameV2,
  PreparedInitiativeStructuralObservationRunV2,
  StructuralInitiativeExecutionEvidenceV1,
} from "./prepareInitiativeStructuralObservationRun";
import { compareObservationText, freezeObservationValue } from "./observationPlanCore";

export type InitiativeSnapshotV2 = Readonly<{
  initiativeId: InitiativeId;
  effectDefinitionId: EffectDefinitionId;
  plannedExecutionPeriod: DisplayedPeriod | null;
  visibleActualExecutionPeriod: DisplayedPeriod | null;
  planningStatus: InitiativePlanningStatus;
  structuralStatus: InitiativeStructuralStatus;
  executionStatus: InitiativeExecutionStatus;
  startAssessment: StructuralStartAssessment | null;
  activeResourceClaims: readonly ActiveInitiativeResourceClaim[];
  unresolvedPrerequisiteIds: readonly InitiativeId[];
}>;

export type DecisionSpaceSnapshotV2 = Readonly<{
  scenario: ScheduleScenarioId;
  period: DisplayedPeriod;
  phase: StructuralObservationPhase;
  initiatives: readonly InitiativeSnapshotV2[];
  resourcePressure: readonly ResourcePressureObservation[];
  engineContext: PreparedEngineContext | null;
}>;

export type StructuralObservationResultV2 = Readonly<{
  version: "structural-observation-v2";
  horizon: number;
  scenarios: Readonly<{
    A: readonly DecisionSpaceSnapshotV2[];
    B: readonly DecisionSpaceSnapshotV2[];
  }>;
}>;

const SCENARIOS = ["A", "B"] as const;

function invariant(message: string): never {
  throw new Error(`Initiative Decision Space invariant failed: ${message}`);
}

function planningStatus(
  initiative: ResolvedInitiativeObservationPlanEntryV2,
  period: DisplayedPeriod
): InitiativePlanningStatus {
  const planned = initiative.plannedExecutionPeriod;
  if (initiative.bindingStatus === "not-bound" || planned === null) return "not-planned";
  if (planned > period) return "scheduled-future";
  if (planned === period) return "scheduled-current";
  return "scheduled-past";
}

function assertFrames(
  prepared: PreparedInitiativeStructuralObservationRunV2,
  scenario: ScheduleScenarioId
): readonly PreparedInitiativeObservationFrameV2[] {
  const scenarioResult = prepared.scenarios[scenario];
  if (!scenarioResult || scenarioResult.scenario !== scenario) {
    invariant(`missing or contradictory scenario ${scenario}`);
  }
  if (scenarioResult.frames.length !== prepared.horizon * 2) {
    invariant(`scenario ${scenario} must have exactly two frames per period`);
  }
  scenarioResult.frames.forEach((frame, index) => {
    const expectedPeriod = Math.floor(index / 2) + 1;
    const expectedPhase = index % 2 === 0 ? "before-execution" : "after-transition";
    if (
      frame.scenario !== scenario ||
      frame.period !== expectedPeriod ||
      frame.phase !== expectedPhase
    ) {
      invariant(`scenario ${scenario} frame ${index} has contradictory ordering`);
    }
  });
  return scenarioResult.frames;
}

function assertPlanMatchesPreparedSchedule(
  prepared: PreparedInitiativeStructuralObservationRunV2,
  plan: ResolvedInitiativeObservationScenarioPlanV2
): void {
  const scheduledById = new Map(
    prepared.resolvedSchedules[plan.scenario].map((entry) => [entry.initiativeId, entry])
  );
  for (const initiative of plan.initiatives) {
    const scheduled = scheduledById.get(initiative.initiativeId);
    if (
      (initiative.bindingStatus === "bound") !== Boolean(scheduled) ||
      initiative.plannedExecutionPeriod !== (scheduled?.executionStep ?? null) ||
      (scheduled && scheduled.effectDefinitionId !== initiative.effectDefinitionId)
    ) {
      invariant(`scenario ${plan.scenario} plan contradicts prepared schedules for ${initiative.initiativeId}`);
    }
  }
}

function visibleEvidenceByInitiative(
  frame: PreparedInitiativeObservationFrameV2,
  plan: ResolvedInitiativeObservationScenarioPlanV2
): Map<InitiativeId, StructuralInitiativeExecutionEvidenceV1> {
  const planById = new Map(plan.initiatives.map((initiative) => [initiative.initiativeId, initiative]));
  const evidenceById = new Map<InitiativeId, StructuralInitiativeExecutionEvidenceV1>();
  for (const evidence of frame.visibleExecutionEvidence) {
    const initiative = planById.get(evidence.initiativeId);
    if (!initiative || initiative.bindingStatus !== "bound") {
      invariant(`execution evidence references unknown or not-bound initiative ${evidence.initiativeId}`);
    }
    if (evidence.scenario !== frame.scenario) invariant("execution evidence leaks across scenarios");
    if (evidence.effectDefinitionId !== initiative.effectDefinitionId) {
      invariant(`execution evidence has wrong effect definition for ${evidence.initiativeId}`);
    }
    if (evidence.scheduledExecutionPeriod !== initiative.plannedExecutionPeriod) {
      invariant(`execution evidence has wrong scheduled period for ${evidence.initiativeId}`);
    }
    if (
      evidence.actualExecutionPeriod > frame.period ||
      (frame.phase === "before-execution" && evidence.actualExecutionPeriod === frame.period)
    ) {
      invariant(`execution evidence exposes a future execution for ${evidence.initiativeId}`);
    }
    if (evidenceById.has(evidence.initiativeId)) {
      invariant(`duplicate visible execution evidence for ${evidence.initiativeId}`);
    }
    evidenceById.set(evidence.initiativeId, evidence);
  }
  return evidenceById;
}

function unresolvedPrerequisites(
  assessment: StructuralStartAssessment | null,
  isCurrent: boolean
): InitiativeId[] {
  if (!assessment || !isCurrent) return [];
  return [...new Set(assessment.blockingReasons.flatMap((reason) =>
    reason.code === "resource-overallocated" ? [] : [reason.prerequisiteInitiativeId]
  ))].sort(compareObservationText);
}

function activeClaimsFor(
  observations: readonly ResourcePressureObservation[],
  initiativeId: InitiativeId
): ActiveInitiativeResourceClaim[] {
  return observations
    .flatMap(({ activeClaims }) => activeClaims)
    .filter((claim) => claim.initiativeId === initiativeId)
    .map((claim) => ({ ...claim }))
    .sort((left, right) =>
      compareObservationText(left.initiativeId, right.initiativeId) ||
      compareObservationText(left.resourceId, right.resourceId)
    );
}

function createSnapshot(
  frame: PreparedInitiativeObservationFrameV2,
  plan: ResolvedInitiativeObservationScenarioPlanV2,
  history: ReadonlyMap<InitiativeId, StructuralStartAssessment>,
  resourcePressure: readonly ResourcePressureObservation[]
): DecisionSpaceSnapshotV2 {
  const evidenceById = visibleEvidenceByInitiative(frame, plan);
  const initiatives = plan.initiatives.map((initiative): InitiativeSnapshotV2 => {
    const planning = planningStatus(initiative, frame.period);
    const isCurrent = planning === "scheduled-current";
    const assessment = history.get(initiative.initiativeId) ?? null;
    if (initiative.bindingStatus === "not-bound") {
      if (assessment || evidenceById.has(initiative.initiativeId)) {
        invariant(`not-bound initiative ${initiative.initiativeId} has assessment or evidence`);
      }
    } else if (
      initiative.plannedExecutionPeriod !== null &&
      initiative.plannedExecutionPeriod <= frame.period &&
      assessment === null
    ) {
      invariant(`bound initiative ${initiative.initiativeId} is missing its historical start assessment`);
    }
    const evidence = evidenceById.get(initiative.initiativeId) ?? null;
    if (evidence && assessment === null) {
      invariant(`execution evidence for ${initiative.initiativeId} has no start assessment`);
    }
    return {
      initiativeId: initiative.initiativeId,
      effectDefinitionId: initiative.effectDefinitionId,
      plannedExecutionPeriod: initiative.plannedExecutionPeriod,
      visibleActualExecutionPeriod: evidence?.actualExecutionPeriod ?? null,
      planningStatus: planning,
      structuralStatus: isCurrent ? (assessment?.outcome ?? "not-evaluated") : "not-evaluated",
      executionStatus: !evidence
        ? "not-executed"
        : assessment?.outcome === "would-be-blocked"
          ? "executed-despite-structural-block"
          : "executed",
      startAssessment: assessment,
      activeResourceClaims: activeClaimsFor(resourcePressure, initiative.initiativeId),
      unresolvedPrerequisiteIds: unresolvedPrerequisites(assessment, isCurrent),
    };
  });
  initiatives.sort((left, right) => compareObservationText(left.initiativeId, right.initiativeId));
  return {
    scenario: frame.scenario,
    period: frame.period,
    phase: frame.phase,
    initiatives,
    resourcePressure,
    engineContext: frame.engineContext,
  };
}

function buildScenario(
  prepared: PreparedInitiativeStructuralObservationRunV2,
  scenario: ScheduleScenarioId,
  plan: ResolvedInitiativeObservationScenarioPlanV2
): DecisionSpaceSnapshotV2[] {
  const frames = assertFrames(prepared, scenario);
  assertPlanMatchesPreparedSchedule(prepared, plan);
  const history = new Map<InitiativeId, StructuralStartAssessment>();
  const snapshots: DecisionSpaceSnapshotV2[] = [];
  for (let numericPeriod = 1; numericPeriod <= prepared.horizon; numericPeriod += 1) {
    const period = numericPeriod as DisplayedPeriod;
    const before = frames[(numericPeriod - 1) * 2];
    const after = frames[(numericPeriod - 1) * 2 + 1];
    const resourcePressure = observeInitiativeResourcePressureForPeriod({ prepared, scenarioPlan: plan, period });
    const assessments = assessInitiativeStructuralStartsForPeriod({
      prepared,
      scenarioPlan: plan,
      period,
      visibleExecutionEvidence: before.visibleExecutionEvidence,
    });
    const currentIds = new Set(plan.initiatives
      .filter(({ plannedExecutionPeriod }) => plannedExecutionPeriod === period)
      .map(({ initiativeId }) => initiativeId));
    if (assessments.length !== currentIds.size) invariant(`scenario ${scenario} is missing a current start assessment`);
    for (const assessment of assessments) {
      if (
        !currentIds.has(assessment.initiativeId) ||
        assessment.scenario !== scenario ||
        assessment.evaluatedAtPeriod !== period
      ) invariant(`scenario ${scenario} has an assessment for the wrong initiative, scenario, or period`);
      if (history.has(assessment.initiativeId)) invariant(`historical assessment would be overwritten for ${assessment.initiativeId}`);
      history.set(assessment.initiativeId, assessment);
    }
    snapshots.push(createSnapshot(before, plan, history, resourcePressure));
    snapshots.push(createSnapshot(after, plan, history, resourcePressure));
  }
  return snapshots;
}

export function buildInitiativeDecisionSpaceSnapshots(
  prepared: PreparedInitiativeStructuralObservationRunV2
): StructuralObservationResultV2 {
  if (prepared.preparationVersion !== "structural-observation-preparation-v2") {
    invariant("unsupported preparation version");
  }
  if (!Number.isInteger(prepared.horizon) || prepared.horizon < 1) invariant("horizon must be positive");
  const plans = resolveInitiativeObservationPlans(prepared);
  const result: StructuralObservationResultV2 = {
    version: "structural-observation-v2",
    horizon: prepared.horizon,
    scenarios: {
      A: buildScenario(prepared, SCENARIOS[0], plans.A),
      B: buildScenario(prepared, SCENARIOS[1], plans.B),
    },
  };
  return freezeObservationValue(structuredClone(result));
}
