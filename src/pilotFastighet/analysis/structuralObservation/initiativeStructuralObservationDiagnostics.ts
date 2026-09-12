import type { DisplayedPeriod, InitiativeId, SharedResourceId } from "./contract";
import type { EffectDefinitionId } from "./contractV2";
import type {
  DecisionSpaceSnapshotV2,
  StructuralObservationResultV2,
} from "./buildInitiativeDecisionSpaceSnapshots";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type { StructuralInitiativeExecutionEvidenceV1 } from "./prepareInitiativeStructuralObservationRun";
import type { StructuralStartAssessment } from "./structuralStartAssessmentCore";
import { compareObservationText, freezeObservationValue } from "./observationPlanCore";

export type InitiativeDiagnosticSnapshotState = Omit<DecisionSpaceSnapshotV2, "diagnostics">;

export type InitiativeStructuralObservationDiagnostic =
  | Readonly<{
      code: "would-be-blocked";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      effectDefinitionId: EffectDefinitionId;
      blockingReasons: StructuralStartAssessment["blockingReasons"];
    }>
  | Readonly<{
      code: "resource-overallocated";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      resourceId: SharedResourceId;
      contributingInitiativeIds: readonly InitiativeId[];
      wouldBlockStartingInitiativeIds: readonly InitiativeId[];
      capacity: number;
      totalClaimed: number;
      overallocatedBy: number;
    }>
  | Readonly<{
      code: "executed-despite-structural-block";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      effectDefinitionId: EffectDefinitionId;
      blockingReasons: StructuralStartAssessment["blockingReasons"];
    }>
  | Readonly<{
      code: "prerequisite-executed-same-period";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      effectDefinitionId: EffectDefinitionId;
      prerequisiteInitiativeId: InitiativeId;
    }>
  | Readonly<{
      code: "planned-initiative-not-executed";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      effectDefinitionId: EffectDefinitionId;
      plannedExecutionPeriod: DisplayedPeriod;
    }>;

const DIAGNOSTIC_CODE_ORDER = Object.freeze({
  "would-be-blocked": 0,
  "resource-overallocated": 1,
  "executed-despite-structural-block": 2,
  "prerequisite-executed-same-period": 3,
  "planned-initiative-not-executed": 4,
} satisfies Readonly<Record<InitiativeStructuralObservationDiagnostic["code"], number>>);

function invariant(message: string): never {
  throw new Error(`Initiative structural diagnostic invariant failed: ${message}`);
}

function assertSortedUnique(ids: readonly string[], label: string): void {
  for (let index = 1; index < ids.length; index += 1) {
    if (compareObservationText(ids[index - 1], ids[index]) >= 0) {
      invariant(`${label} must be sorted and unique`);
    }
  }
}

function diagnosticIdentity(diagnostic: InitiativeStructuralObservationDiagnostic): string {
  const subject = diagnostic.code === "resource-overallocated"
    ? diagnostic.resourceId
    : diagnostic.initiativeId;
  const detail = diagnostic.code === "prerequisite-executed-same-period"
    ? diagnostic.prerequisiteInitiativeId
    : "";
  return [diagnostic.code, diagnostic.scenario, diagnostic.period, subject, detail].join("\u0000");
}

function compareDiagnostics(
  left: InitiativeStructuralObservationDiagnostic,
  right: InitiativeStructuralObservationDiagnostic
): number {
  return (
    DIAGNOSTIC_CODE_ORDER[left.code] - DIAGNOSTIC_CODE_ORDER[right.code] ||
    compareObservationText(left.scenario, right.scenario) ||
    left.period - right.period ||
    compareObservationText(diagnosticIdentity(left), diagnosticIdentity(right))
  );
}

function assertSnapshotCanonical(snapshot: InitiativeDiagnosticSnapshotState): void {
  assertSortedUnique(snapshot.initiatives.map(({ initiativeId }) => initiativeId), "initiative IDs");
  assertSortedUnique(snapshot.resourcePressure.map(({ resourceId }) => resourceId), "resource IDs");
  for (const resource of snapshot.resourcePressure) {
    if (resource.period !== snapshot.period) invariant("resource period differs from snapshot");
    assertSortedUnique(resource.contributingInitiativeIds, "resource contributor IDs");
    assertSortedUnique(resource.startingInitiativeIds, "resource starter IDs");
    assertSortedUnique(resource.wouldBlockStartingInitiativeIds, "resource blocker IDs");
  }
}

function copyReasons(reasons: StructuralStartAssessment["blockingReasons"]) {
  return reasons.map((reason) => ({ ...reason }));
}

function finalize(
  snapshot: InitiativeDiagnosticSnapshotState,
  diagnostics: InitiativeStructuralObservationDiagnostic[]
): readonly InitiativeStructuralObservationDiagnostic[] {
  diagnostics.sort(compareDiagnostics);
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    if (diagnostic.scenario !== snapshot.scenario || diagnostic.period !== snapshot.period) {
      invariant("diagnostic scenario or period differs from snapshot");
    }
    const identity = diagnosticIdentity(diagnostic);
    if (seen.has(identity)) invariant(`duplicate diagnostic ${identity}`);
    seen.add(identity);
  }
  return freezeObservationValue(structuredClone(diagnostics));
}

export function deriveInitiativeBeforeExecutionDiagnostics(
  snapshot: InitiativeDiagnosticSnapshotState
): readonly InitiativeStructuralObservationDiagnostic[] {
  if (snapshot.phase !== "before-execution") invariant("before diagnostics require before-execution phase");
  assertSnapshotCanonical(snapshot);
  const diagnostics: InitiativeStructuralObservationDiagnostic[] = [];
  for (const initiative of snapshot.initiatives) {
    const assessment = initiative.startAssessment;
    if (initiative.planningStatus !== "scheduled-current" || assessment?.outcome !== "would-be-blocked") continue;
    if (
      initiative.structuralStatus !== "would-be-blocked" ||
      assessment.initiativeId !== initiative.initiativeId ||
      assessment.scenario !== snapshot.scenario ||
      assessment.evaluatedAtPeriod !== snapshot.period ||
      assessment.blockingReasons.length === 0
    ) invariant(`blocked assessment contradicts current initiative ${initiative.initiativeId}`);
    diagnostics.push({
      code: "would-be-blocked",
      scenario: snapshot.scenario,
      period: snapshot.period,
      initiativeId: initiative.initiativeId,
      effectDefinitionId: initiative.effectDefinitionId,
      blockingReasons: copyReasons(assessment.blockingReasons),
    });
  }
  const initiativeIds = new Set(snapshot.initiatives.map(({ initiativeId }) => initiativeId));
  for (const resource of snapshot.resourcePressure) {
    if (!resource.overallocated) continue;
    if (resource.overallocatedBy <= 0) invariant(`resource ${resource.resourceId} has no positive excess`);
    for (const id of [...resource.contributingInitiativeIds, ...resource.wouldBlockStartingInitiativeIds]) {
      if (!initiativeIds.has(id)) invariant(`resource ${resource.resourceId} references unknown initiative ${id}`);
    }
    for (const id of resource.wouldBlockStartingInitiativeIds) {
      const initiative = snapshot.initiatives.find((candidate) => candidate.initiativeId === id);
      if (initiative?.planningStatus !== "scheduled-current") invariant(`resource blocks non-current initiative ${id}`);
    }
    diagnostics.push({
      code: "resource-overallocated",
      scenario: snapshot.scenario,
      period: snapshot.period,
      resourceId: resource.resourceId,
      contributingInitiativeIds: [...resource.contributingInitiativeIds],
      wouldBlockStartingInitiativeIds: [...resource.wouldBlockStartingInitiativeIds],
      capacity: resource.capacity,
      totalClaimed: resource.totalClaimed,
      overallocatedBy: resource.overallocatedBy,
    });
  }
  return finalize(snapshot, diagnostics);
}

export function deriveInitiativeAfterTransitionDiagnostics(
  snapshot: InitiativeDiagnosticSnapshotState,
  visibleExecutionEvidence: readonly StructuralInitiativeExecutionEvidenceV1[]
): readonly InitiativeStructuralObservationDiagnostic[] {
  if (snapshot.phase !== "after-transition") invariant("after diagnostics require after-transition phase");
  assertSnapshotCanonical(snapshot);
  const initiativeById = new Map(snapshot.initiatives.map((initiative) => [initiative.initiativeId, initiative]));
  const currentEvidence = new Map<InitiativeId, StructuralInitiativeExecutionEvidenceV1>();
  for (const evidence of visibleExecutionEvidence) {
    if (evidence.scenario !== snapshot.scenario) invariant("execution evidence leaks across scenarios");
    if (evidence.actualExecutionPeriod !== snapshot.period) continue;
    const initiative = initiativeById.get(evidence.initiativeId);
    if (!initiative || initiative.effectDefinitionId !== evidence.effectDefinitionId) {
      invariant(`execution evidence has unknown initiative or effect mismatch for ${evidence.initiativeId}`);
    }
    if (currentEvidence.has(evidence.initiativeId)) invariant(`duplicate current evidence for ${evidence.initiativeId}`);
    currentEvidence.set(evidence.initiativeId, evidence);
  }
  const diagnostics: InitiativeStructuralObservationDiagnostic[] = [];
  for (const initiative of snapshot.initiatives) {
    if (initiative.planningStatus !== "scheduled-current") continue;
    const evidence = currentEvidence.get(initiative.initiativeId);
    const assessment = initiative.startAssessment;
    if (initiative.executionStatus === "executed-despite-structural-block") {
      if (!evidence || assessment?.outcome !== "would-be-blocked" || assessment.blockingReasons.length === 0) {
        invariant(`executed-despite status lacks evidence or blocked assessment for ${initiative.initiativeId}`);
      }
      diagnostics.push({ code: "executed-despite-structural-block", scenario: snapshot.scenario, period: snapshot.period, initiativeId: initiative.initiativeId, effectDefinitionId: initiative.effectDefinitionId, blockingReasons: copyReasons(assessment.blockingReasons) });
    }
    if (assessment) {
      for (const reason of assessment.blockingReasons) {
        if (reason.code !== "prerequisite-not-completed-before-start") continue;
        if (currentEvidence.has(reason.prerequisiteInitiativeId)) {
          diagnostics.push({ code: "prerequisite-executed-same-period", scenario: snapshot.scenario, period: snapshot.period, initiativeId: initiative.initiativeId, effectDefinitionId: initiative.effectDefinitionId, prerequisiteInitiativeId: reason.prerequisiteInitiativeId });
        }
      }
    }
    if (!evidence) {
      if (initiative.executionStatus !== "not-executed" || initiative.plannedExecutionPeriod !== snapshot.period) {
        invariant(`missing-execution state contradicts current initiative ${initiative.initiativeId}`);
      }
      diagnostics.push({ code: "planned-initiative-not-executed", scenario: snapshot.scenario, period: snapshot.period, initiativeId: initiative.initiativeId, effectDefinitionId: initiative.effectDefinitionId, plannedExecutionPeriod: snapshot.period });
    }
  }
  return finalize(snapshot, diagnostics);
}

function validatePersistedDiagnostic(
  snapshot: DecisionSpaceSnapshotV2,
  diagnostic: InitiativeStructuralObservationDiagnostic
): void {
  if (diagnostic.scenario !== snapshot.scenario || diagnostic.period !== snapshot.period) invariant("persisted diagnostic has wrong scenario or period");
  const beforeCode = diagnostic.code === "would-be-blocked" || diagnostic.code === "resource-overallocated";
  if ((snapshot.phase === "before-execution") !== beforeCode) invariant(`diagnostic ${diagnostic.code} is stored in the wrong phase`);
  if (diagnostic.code === "resource-overallocated") {
    const resource = snapshot.resourcePressure.find(({ resourceId }) => resourceId === diagnostic.resourceId);
    if (
      !resource?.overallocated ||
      resource.capacity !== diagnostic.capacity ||
      resource.totalClaimed !== diagnostic.totalClaimed ||
      resource.overallocatedBy !== diagnostic.overallocatedBy ||
      JSON.stringify(resource.contributingInitiativeIds) !== JSON.stringify(diagnostic.contributingInitiativeIds) ||
      JSON.stringify(resource.wouldBlockStartingInitiativeIds) !== JSON.stringify(diagnostic.wouldBlockStartingInitiativeIds)
    ) invariant(`diagnostic references unknown or contradictory resource ${diagnostic.resourceId}`);
    return;
  }
  const initiative = snapshot.initiatives.find(({ initiativeId }) => initiativeId === diagnostic.initiativeId);
  if (!initiative || initiative.effectDefinitionId !== diagnostic.effectDefinitionId) invariant(`diagnostic initiative or effect mismatch for ${diagnostic.initiativeId}`);
  if (initiative.planningStatus !== "scheduled-current") invariant(`diagnostic references non-current initiative ${diagnostic.initiativeId}`);
  if (
    diagnostic.code === "would-be-blocked" &&
    (initiative.structuralStatus !== "would-be-blocked" || initiative.startAssessment?.outcome !== "would-be-blocked")
  ) invariant(`blocking diagnostic contradicts ${diagnostic.initiativeId}`);
  if (
    diagnostic.code === "executed-despite-structural-block" &&
    (initiative.visibleActualExecutionPeriod !== snapshot.period || initiative.executionStatus !== "executed-despite-structural-block")
  ) invariant(`execution diagnostic lacks visible same-period initiative execution for ${diagnostic.initiativeId}`);
  if (diagnostic.code === "prerequisite-executed-same-period") {
    const prerequisite = snapshot.initiatives.find(({ initiativeId }) => initiativeId === diagnostic.prerequisiteInitiativeId);
    if (prerequisite?.visibleActualExecutionPeriod !== snapshot.period) invariant(`same-period diagnostic lacks prerequisite execution for ${diagnostic.prerequisiteInitiativeId}`);
  }
  if (diagnostic.code === "planned-initiative-not-executed" && initiative.executionStatus !== "not-executed") invariant(`missing-execution diagnostic contradicts ${diagnostic.initiativeId}`);
}

export function selectInitiativeStructuralObservationDiagnostics(
  result: StructuralObservationResultV2
): readonly InitiativeStructuralObservationDiagnostic[] {
  const diagnostics: InitiativeStructuralObservationDiagnostic[] = [];
  for (const scenario of ["A", "B"] as const) {
    for (const snapshot of result.scenarios[scenario]) {
      for (const diagnostic of snapshot.diagnostics) {
        validatePersistedDiagnostic(snapshot, diagnostic);
        diagnostics.push(structuredClone(diagnostic));
      }
    }
  }
  diagnostics.sort(compareDiagnostics);
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    const identity = diagnosticIdentity(diagnostic);
    if (seen.has(identity)) invariant(`duplicate persisted diagnostic ${identity}`);
    seen.add(identity);
  }
  return freezeObservationValue(diagnostics);
}
