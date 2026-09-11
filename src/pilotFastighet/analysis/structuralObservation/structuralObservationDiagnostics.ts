import type { ActionKey } from "../../actionEffects";
import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type {
  StructuralBlockingReason,
} from "./assessStructuralStarts";
import type {
  DecisionSpaceSnapshotPhase,
  InitiativeSnapshot,
  StructuralObservationResult,
} from "./buildDecisionSpaceSnapshots";
import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceId,
} from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import type { ResourcePressureObservation } from "./observeResourcePressure";

export type StructuralObservationDiagnostic =
  | Readonly<{
      code: "would-be-blocked";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      blockingReasons: readonly StructuralBlockingReason[];
    }>
  | Readonly<{
      code: "executed-despite-structural-block";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      actionKey: ActionKey;
      blockingReasons: readonly StructuralBlockingReason[];
    }>
  | Readonly<{
      code: "prerequisite-executed-same-period";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      prerequisiteInitiativeId: InitiativeId;
    }>
  | Readonly<{
      code: "planned-action-not-executed";
      scenario: ScheduleScenarioId;
      period: DisplayedPeriod;
      initiativeId: InitiativeId;
      actionKey: ActionKey;
      plannedExecutionPeriod: DisplayedPeriod;
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
    }>;

export type DiagnosticInitiativeState = Pick<
  InitiativeSnapshot,
  | "initiativeId"
  | "actionKey"
  | "plannedExecutionPeriod"
  | "planningStatus"
  | "executionStatus"
  | "startAssessment"
>;

export type DiagnosticSnapshotState = Readonly<{
  scenario: ScheduleScenarioId;
  period: DisplayedPeriod;
  phase: DecisionSpaceSnapshotPhase;
  initiatives: readonly DiagnosticInitiativeState[];
  resourcePressure: readonly ResourcePressureObservation[];
}>;

const DIAGNOSTIC_CODE_ORDER = Object.freeze({
  "would-be-blocked": 0,
  "resource-overallocated": 1,
  "executed-despite-structural-block": 2,
  "prerequisite-executed-same-period": 3,
  "planned-action-not-executed": 4,
} satisfies Readonly<Record<StructuralObservationDiagnostic["code"], number>>);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function copyBlockingReasons(
  reasons: readonly StructuralBlockingReason[]
): StructuralBlockingReason[] {
  return reasons.map((reason) => ({ ...reason }));
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

function diagnosticIdentity(diagnostic: StructuralObservationDiagnostic): string {
  const subject =
    diagnostic.code === "resource-overallocated"
      ? diagnostic.resourceId
      : diagnostic.initiativeId;
  const detail =
    diagnostic.code === "prerequisite-executed-same-period"
      ? diagnostic.prerequisiteInitiativeId
      : "";
  return [diagnostic.code, diagnostic.scenario, diagnostic.period, subject, detail].join("\u0000");
}

function compareDiagnostics(
  left: StructuralObservationDiagnostic,
  right: StructuralObservationDiagnostic
): number {
  return (
    DIAGNOSTIC_CODE_ORDER[left.code] - DIAGNOSTIC_CODE_ORDER[right.code] ||
    compareText(left.scenario, right.scenario) ||
    left.period - right.period ||
    compareText(diagnosticIdentity(left), diagnosticIdentity(right))
  );
}

function finalizeDiagnostics(
  snapshot: DiagnosticSnapshotState,
  diagnostics: StructuralObservationDiagnostic[]
): readonly StructuralObservationDiagnostic[] {
  diagnostics.sort(compareDiagnostics);
  const identities = new Set<string>();
  for (const diagnostic of diagnostics) {
    if (
      diagnostic.scenario !== snapshot.scenario ||
      diagnostic.period !== snapshot.period
    ) {
      throw new Error(
        "Structural diagnostic invariant failed: diagnostic scenario or period differs from its snapshot."
      );
    }
    const identity = diagnosticIdentity(diagnostic);
    if (identities.has(identity)) {
      throw new Error(
        `Structural diagnostic invariant failed: duplicate diagnostic ${identity}.`
      );
    }
    identities.add(identity);
  }
  return deepFreeze(diagnostics);
}

export function deriveBeforeExecutionDiagnostics(
  snapshot: DiagnosticSnapshotState
): readonly StructuralObservationDiagnostic[] {
  if (snapshot.phase !== "before-execution") {
    throw new Error(
      "Structural diagnostic invariant failed: before diagnostics require a before-execution snapshot."
    );
  }
  const diagnostics: StructuralObservationDiagnostic[] = [];
  for (const initiative of snapshot.initiatives) {
    if (
      initiative.planningStatus !== "scheduled-current" ||
      initiative.startAssessment?.outcome !== "would-be-blocked"
    ) {
      continue;
    }
    if (initiative.startAssessment.blockingReasons.length === 0) {
      throw new Error(
        "Structural diagnostic invariant failed: would-be-blocked assessment has no blocking reasons."
      );
    }
    diagnostics.push({
      code: "would-be-blocked",
      scenario: snapshot.scenario,
      period: snapshot.period,
      initiativeId: initiative.initiativeId,
      blockingReasons: copyBlockingReasons(
        initiative.startAssessment.blockingReasons
      ),
    });
  }
  for (const resource of snapshot.resourcePressure) {
    if (!resource.overallocated) continue;
    if (resource.overallocatedBy <= 0) {
      throw new Error(
        "Structural diagnostic invariant failed: overallocated resource has no positive excess."
      );
    }
    diagnostics.push({
      code: "resource-overallocated",
      scenario: snapshot.scenario,
      period: snapshot.period,
      resourceId: resource.resourceId,
      contributingInitiativeIds: [...resource.contributingInitiativeIds].sort(compareText),
      wouldBlockStartingInitiativeIds: [
        ...resource.wouldBlockStartingInitiativeIds,
      ].sort(compareText),
      capacity: resource.capacity,
      totalClaimed: resource.totalClaimed,
      overallocatedBy: resource.overallocatedBy,
    });
  }
  return finalizeDiagnostics(snapshot, diagnostics);
}

export function deriveAfterTransitionDiagnostics(
  snapshot: DiagnosticSnapshotState,
  visibleExecutionEvidence: readonly StructuralExecutionEvidence[]
): readonly StructuralObservationDiagnostic[] {
  if (snapshot.phase !== "after-transition") {
    throw new Error(
      "Structural diagnostic invariant failed: after diagnostics require an after-transition snapshot."
    );
  }
  const diagnostics: StructuralObservationDiagnostic[] = [];
  const initiativeById = new Map(
    snapshot.initiatives.map((initiative) => [initiative.initiativeId, initiative])
  );
  const currentEvidenceByAction = new Map(
    visibleExecutionEvidence
      .filter(
        (evidence) =>
          evidence.scenario === snapshot.scenario &&
          evidence.actualExecutionPeriod === snapshot.period
      )
      .map((evidence) => [evidence.actionKey, evidence])
  );

  for (const initiative of snapshot.initiatives) {
    if (initiative.planningStatus !== "scheduled-current") continue;
    const assessment = initiative.startAssessment;
    if (initiative.executionStatus === "executed-despite-structural-block") {
      if (
        assessment?.outcome !== "would-be-blocked" ||
        assessment.blockingReasons.length === 0
      ) {
        throw new Error(
          "Structural diagnostic invariant failed: executed-despite status lacks a blocked start assessment."
        );
      }
      diagnostics.push({
        code: "executed-despite-structural-block",
        scenario: snapshot.scenario,
        period: snapshot.period,
        initiativeId: initiative.initiativeId,
        actionKey: initiative.actionKey,
        blockingReasons: copyBlockingReasons(assessment.blockingReasons),
      });
    }

    if (assessment) {
      for (const reason of assessment.blockingReasons) {
        if (reason.code !== "prerequisite-not-completed-before-start") continue;
        const prerequisite = initiativeById.get(reason.prerequisiteInitiativeId);
        if (
          prerequisite &&
          currentEvidenceByAction.has(prerequisite.actionKey)
        ) {
          diagnostics.push({
            code: "prerequisite-executed-same-period",
            scenario: snapshot.scenario,
            period: snapshot.period,
            initiativeId: initiative.initiativeId,
            prerequisiteInitiativeId: reason.prerequisiteInitiativeId,
          });
        }
      }
    }

    if (initiative.executionStatus === "not-executed") {
      if (initiative.plannedExecutionPeriod !== snapshot.period) {
        throw new Error(
          "Structural diagnostic invariant failed: planned-not-executed initiative has a different planned period."
        );
      }
      diagnostics.push({
        code: "planned-action-not-executed",
        scenario: snapshot.scenario,
        period: snapshot.period,
        initiativeId: initiative.initiativeId,
        actionKey: initiative.actionKey,
        plannedExecutionPeriod: initiative.plannedExecutionPeriod,
      });
    }
  }
  return finalizeDiagnostics(snapshot, diagnostics);
}

export function selectStructuralObservationDiagnostics(
  result: StructuralObservationResult
): readonly StructuralObservationDiagnostic[] {
  const diagnostics = [...result.scenarios.A, ...result.scenarios.B].flatMap(
    (snapshot) =>
      snapshot.diagnostics.map((diagnostic): StructuralObservationDiagnostic => {
        switch (diagnostic.code) {
          case "would-be-blocked":
          case "executed-despite-structural-block":
            return {
              ...diagnostic,
              blockingReasons: copyBlockingReasons(diagnostic.blockingReasons),
            };
          case "resource-overallocated":
            return {
              ...diagnostic,
              contributingInitiativeIds: [
                ...diagnostic.contributingInitiativeIds,
              ],
              wouldBlockStartingInitiativeIds: [
                ...diagnostic.wouldBlockStartingInitiativeIds,
              ],
            };
          default:
            return { ...diagnostic };
        }
      })
  );
  diagnostics.sort(compareDiagnostics);
  const identities = new Set<string>();
  for (const diagnostic of diagnostics) {
    const identity = diagnosticIdentity(diagnostic);
    if (identities.has(identity)) {
      throw new Error(
        `Structural diagnostic invariant failed: duplicate persisted diagnostic ${identity}.`
      );
    }
    identities.add(identity);
  }
  return deepFreeze([...diagnostics]);
}
