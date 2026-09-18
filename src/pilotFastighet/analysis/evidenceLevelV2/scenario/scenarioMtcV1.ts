import type { CanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";

export const TWO_LAYER_MTC_SCENARIO_SCHEMA_VERSION =
  "ce-two-layer-mtc-scenario-v1" as const;

export interface ScenarioDomainReferenceMtcV1 {
  readonly semanticId: CanonicalSemanticIdMtcV1;
  readonly semanticIdentity: string;
}

export type ScenarioResourceInstanceMtcV1 =
  | Readonly<{
      resourceInstanceId: CanonicalSemanticIdMtcV1;
      resourceId: CanonicalSemanticIdMtcV1;
      kind: "exclusive";
      initialState: "available";
    }>
  | Readonly<{
      resourceInstanceId: CanonicalSemanticIdMtcV1;
      resourceId: CanonicalSemanticIdMtcV1;
      kind: "quantitative-capacity";
      unit: CanonicalSemanticIdMtcV1;
      capacity: CanonicalDecimalMtcV1;
      initialAvailableCapacity: CanonicalDecimalMtcV1;
    }>;

export type ScenarioResourceClaimMtcV1 =
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      resourceInstanceId: CanonicalSemanticIdMtcV1;
      kind: "exclusive";
      reservation: "while-active";
    }>
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      resourceInstanceId: CanonicalSemanticIdMtcV1;
      kind: "quantitative-capacity";
      amount: CanonicalDecimalMtcV1;
      unit: CanonicalSemanticIdMtcV1;
      reservation: "while-active";
    }>;

export interface ScenarioDependencyMtcV1 {
  readonly ruleId: CanonicalSemanticIdMtcV1;
  readonly prerequisiteInstanceId: CanonicalSemanticIdMtcV1;
  readonly condition: "completed";
}

export interface ScenarioInitiativeInstanceMtcV1 {
  readonly instanceId: CanonicalSemanticIdMtcV1;
  readonly initiativeTypeId: CanonicalSemanticIdMtcV1;
  readonly scheduledStartPeriod: number;
  readonly durationPeriods: number;
  readonly initialLifecycle: "pending";
  readonly dependencies: readonly ScenarioDependencyMtcV1[];
  readonly resourceClaims: readonly ScenarioResourceClaimMtcV1[];
}

export interface TwoLayerMtcScenarioV1 {
  readonly schemaVersion: typeof TWO_LAYER_MTC_SCENARIO_SCHEMA_VERSION;
  readonly scenarioId: CanonicalSemanticIdMtcV1;
  readonly revision: number;
  readonly domainContract: ScenarioDomainReferenceMtcV1;
  readonly horizon: Readonly<{ firstPeriod: number; finalPeriod: number }>;
  readonly initiatives: readonly ScenarioInitiativeInstanceMtcV1[];
  readonly resources: readonly ScenarioResourceInstanceMtcV1[];
  readonly initialConstraints: readonly Readonly<{
    constraintId: CanonicalSemanticIdMtcV1;
    state: "present" | "absent";
  }>[];
  readonly initialEntitlements: readonly Readonly<{
    entitlementId: CanonicalSemanticIdMtcV1;
    kind: "reusable" | "consumable";
    state: "available" | "unavailable" | "consumed";
  }>[];
  readonly metadata?: Readonly<{ displayName: string }>;
}

export interface PreparedInitiativeMtcV1 extends ScenarioInitiativeInstanceMtcV1 {
  /** Boundary immediately after the last active period. */
  readonly completionBoundary: number;
  readonly terminalLifecycle: "completed" | "active";
}

export interface PreparedScenarioMtcV1 extends Omit<TwoLayerMtcScenarioV1, "initiatives"> {
  readonly initiatives: readonly PreparedInitiativeMtcV1[];
  readonly semanticIdentity: string;
}

export type ScenarioIssueCodeMtcV1 =
  | "invalid-json" | "invalid-type" | "missing-field" | "unknown-field"
  | "invalid-discriminant" | "invalid-id" | "invalid-string" | "invalid-hash"
  | "unsafe-integer" | "invalid-decimal" | "limit-exceeded"
  | "duplicate-instance-id" | "duplicate-dependency" | "duplicate-resource-claim"
  | "duplicate-initial-state" | "unknown-reference" | "domain-identity-mismatch"
  | "schedule-outside-horizon" | "completion-overflow" | "self-dependency"
  | "dependency-cycle" | "rule-binding-mismatch" | "resource-kind-mismatch"
  | "unit-mismatch" | "initial-state-mismatch" | "incomplete-initial-state";

export interface ScenarioIssueMtcV1 {
  readonly code: ScenarioIssueCodeMtcV1;
  readonly path: string;
  readonly message: string;
}

export type ParseScenarioResultMtcV1 =
  | Readonly<{ ok: true; value: PreparedScenarioMtcV1 }>
  | Readonly<{ ok: false; issues: readonly ScenarioIssueMtcV1[] }>;
