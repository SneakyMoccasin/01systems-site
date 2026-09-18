import type { CanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";

export const TWO_LAYER_MTC_EXECUTION_VERSION = "ce-two-layer-mtc-execution-v1" as const;

export type InitiativeLifecycleMtcV1 = "pending" | "active" | "completed";

export type EligibilityReasonMtcV1 =
  | Readonly<{ code: "invalid-lifecycle"; instanceId: CanonicalSemanticIdMtcV1; lifecycle: InitiativeLifecycleMtcV1 }>
  | Readonly<{ code: "prerequisite-incomplete"; ruleId: CanonicalSemanticIdMtcV1; prerequisiteInstanceId: CanonicalSemanticIdMtcV1; lifecycle: InitiativeLifecycleMtcV1 }>
  | Readonly<{ code: "exclusive-resource-unavailable"; ruleId: CanonicalSemanticIdMtcV1; resourceInstanceId: CanonicalSemanticIdMtcV1; activeHolders: readonly CanonicalSemanticIdMtcV1[] }>
  | Readonly<{ code: "quantitative-capacity-insufficient"; ruleId: CanonicalSemanticIdMtcV1; resourceInstanceId: CanonicalSemanticIdMtcV1; requested: CanonicalDecimalMtcV1; available: CanonicalDecimalMtcV1; unit: CanonicalSemanticIdMtcV1 }>
  | Readonly<{ code: "constraint-present"; ruleId: CanonicalSemanticIdMtcV1; constraintId: CanonicalSemanticIdMtcV1 }>
  | Readonly<{ code: "entitlement-unavailable"; ruleId: CanonicalSemanticIdMtcV1; entitlementId: CanonicalSemanticIdMtcV1; state: "unavailable" | "consumed" }>;

export interface EligibilityDecisionMtcV1 {
  readonly instanceId: CanonicalSemanticIdMtcV1;
  readonly eligible: boolean;
  readonly reasons: readonly EligibilityReasonMtcV1[];
}

export type RuntimeResourceMtcV1 =
  | Readonly<{ resourceInstanceId: CanonicalSemanticIdMtcV1; kind: "exclusive"; holders: readonly CanonicalSemanticIdMtcV1[] }>
  | Readonly<{ resourceInstanceId: CanonicalSemanticIdMtcV1; kind: "quantitative-capacity"; unit: CanonicalSemanticIdMtcV1; capacity: CanonicalDecimalMtcV1; used: CanonicalDecimalMtcV1; available: CanonicalDecimalMtcV1; holders: readonly Readonly<{ instanceId: CanonicalSemanticIdMtcV1; amount: CanonicalDecimalMtcV1 }>[] }>;

export interface Layer1RuntimeStateMtcV1 {
  /** `firstPeriod - 1` identifies the explicit pre-horizon state. */
  readonly committedThroughPeriod: number;
  readonly boundary: number;
  readonly initiatives: readonly Readonly<{ instanceId: CanonicalSemanticIdMtcV1; lifecycle: InitiativeLifecycleMtcV1 }>[];
  readonly resources: readonly RuntimeResourceMtcV1[];
  readonly constraints: readonly Readonly<{ constraintId: CanonicalSemanticIdMtcV1; state: "present" | "absent" }>[];
  readonly entitlements: readonly Readonly<{ entitlementId: CanonicalSemanticIdMtcV1; kind: "reusable" | "consumable"; state: "available" | "unavailable" | "consumed" }>[];
  readonly stateIdentity: string;
}

export interface ResourceEventMtcV1 {
  readonly instanceId: CanonicalSemanticIdMtcV1;
  readonly ruleId: CanonicalSemanticIdMtcV1;
  readonly resourceInstanceId: CanonicalSemanticIdMtcV1;
  readonly kind: "exclusive" | "quantitative-capacity";
  readonly amount?: CanonicalDecimalMtcV1;
}

export interface PeriodRecordMtcV1 {
  readonly period: number;
  readonly priorStateIdentity: string;
  readonly completions: readonly CanonicalSemanticIdMtcV1[];
  readonly releases: readonly ResourceEventMtcV1[];
  readonly scheduledCandidates: readonly CanonicalSemanticIdMtcV1[];
  readonly eligibility: readonly EligibilityDecisionMtcV1[];
  readonly admissions: readonly Readonly<{ instanceId: CanonicalSemanticIdMtcV1; status: "admitted" | "not-admitted-ineligible" }>[];
  readonly reservations: readonly ResourceEventMtcV1[];
  readonly entitlementConsumptions: readonly Readonly<{ instanceId: CanonicalSemanticIdMtcV1; ruleId: CanonicalSemanticIdMtcV1; entitlementId: CanonicalSemanticIdMtcV1 }>[];
  readonly lifecycleTransitions: readonly Readonly<{ instanceId: CanonicalSemanticIdMtcV1; from: "pending" | "active"; to: "active" | "completed" }>[];
  readonly resultingStateIdentity: string;
  /** Additive immutable committed-state read boundary for CP5A. */
  readonly resultingState: Layer1RuntimeStateMtcV1;
}

export interface TerminalBoundaryRecordMtcV1 {
  readonly boundary: number;
  readonly priorStateIdentity: string;
  readonly completions: readonly CanonicalSemanticIdMtcV1[];
  readonly releases: readonly ResourceEventMtcV1[];
  readonly resultingStateIdentity: string;
}

export type AdmissionConflictMtcV1 =
  | Readonly<{ code: "simultaneous-exclusive-conflict"; resourceInstanceId: CanonicalSemanticIdMtcV1; candidateInstanceIds: readonly CanonicalSemanticIdMtcV1[] }>
  | Readonly<{ code: "simultaneous-capacity-conflict"; resourceInstanceId: CanonicalSemanticIdMtcV1; candidateInstanceIds: readonly CanonicalSemanticIdMtcV1[]; requested: CanonicalDecimalMtcV1; available: CanonicalDecimalMtcV1; unit: CanonicalSemanticIdMtcV1 }>
  | Readonly<{ code: "simultaneous-consumable-conflict"; entitlementId: CanonicalSemanticIdMtcV1; candidateInstanceIds: readonly CanonicalSemanticIdMtcV1[] }>;

export interface ExecutionBaseMtcV1 {
  readonly executionVersion: typeof TWO_LAYER_MTC_EXECUTION_VERSION;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly initialStateIdentity: string;
  /** Additive immutable pre-horizon state read boundary for CP5A. */
  readonly initialState: Layer1RuntimeStateMtcV1;
  readonly history: readonly PeriodRecordMtcV1[];
}

export type Layer1ExecutionOutcomeMtcV1 =
  | Readonly<ExecutionBaseMtcV1 & { status: "completed-horizon"; terminalBoundary: TerminalBoundaryRecordMtcV1; terminalState: Layer1RuntimeStateMtcV1; executionIdentity: string }>
  | Readonly<ExecutionBaseMtcV1 & { status: "failed-unresolved"; failedPeriod: number; lastCommittedState: Layer1RuntimeStateMtcV1; attempt: Readonly<{ priorStateIdentity: string; tentativeCompletions: readonly CanonicalSemanticIdMtcV1[]; tentativeReleases: readonly ResourceEventMtcV1[]; scheduledCandidates: readonly CanonicalSemanticIdMtcV1[]; eligibility: readonly EligibilityDecisionMtcV1[]; conflicts: readonly AdmissionConflictMtcV1[] }>; executionIdentity: string }>;
