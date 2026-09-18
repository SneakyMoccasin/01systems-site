import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import type { EligibilityReasonMtcV1 } from "../execution/executionMtcV1";

export const DECISION_SPACE_VERSION_MTC_V1 = "ce-two-layer-mtc-decision-space-v1" as const;

export type DecisionSpaceClassificationMtcV1 =
  | Readonly<{ instanceId: CanonicalSemanticIdMtcV1; initiativeTypeId: CanonicalSemanticIdMtcV1; classification: "eligible-pending"; reasons: readonly [] }>
  | Readonly<{ instanceId: CanonicalSemanticIdMtcV1; initiativeTypeId: CanonicalSemanticIdMtcV1; classification: "ineligible-pending"; reasons: readonly EligibilityReasonMtcV1[] }>
  | Readonly<{ instanceId: CanonicalSemanticIdMtcV1; initiativeTypeId: CanonicalSemanticIdMtcV1; classification: "active-not-next-action"; reasons: readonly [] }>
  | Readonly<{ instanceId: CanonicalSemanticIdMtcV1; initiativeTypeId: CanonicalSemanticIdMtcV1; classification: "completed-terminal"; reasons: readonly [] }>;

export interface DecisionSpaceSnapshotMtcV1 {
  readonly decisionSpaceVersion: typeof DECISION_SPACE_VERSION_MTC_V1;
  readonly semantics: "individual-next-action-eligibility-not-cohort-feasibility";
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly executionIdentity: string;
  readonly point: Readonly<{ kind: "initial" | "period-commit" | "terminal-boundary"; periodOrBoundary: number }>;
  readonly committedStateIdentity: string;
  readonly initiativeUniverse: readonly CanonicalSemanticIdMtcV1[];
  readonly eligibleInitiativeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly ineligibleInitiativeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly activeInitiativeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly terminalInitiativeIds: readonly CanonicalSemanticIdMtcV1[];
  readonly classifications: readonly DecisionSpaceClassificationMtcV1[];
  readonly snapshotIdentity: string;
}
