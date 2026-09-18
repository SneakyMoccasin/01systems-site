import type { CanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";

export const TWO_LAYER_MTC_SCHEMA_VERSION = "ce-two-layer-mtc-v1" as const;
export const TWO_LAYER_MTC_PROTOCOL_VERSION = "ce-two-layer-mtc-protocol-v1" as const;
export const TWO_LAYER_MTC_LIMITS_VERSION = "ce-two-layer-mtc-limits-v1" as const;

export const OBSERVATION_RESULTS_MTC_V1 = Object.freeze([
  "affected",
  "exposed",
  "unchanged",
  "unknown",
] as const);

export type EvidenceBasisMtcV1 =
  | "normative"
  | "observed"
  | "derived"
  | "expert-elicited"
  | "synthetic"
  | "assumed";

export interface EvidenceDeclarationMtcV1 {
  readonly evidenceId: CanonicalSemanticIdMtcV1;
  readonly basis: EvidenceBasisMtcV1;
  readonly reference: string;
}

export type ResourceDeclarationMtcV1 =
  | Readonly<{ resourceId: CanonicalSemanticIdMtcV1; kind: "exclusive" }>
  | Readonly<{
      resourceId: CanonicalSemanticIdMtcV1;
      kind: "quantitative-capacity";
      unit: CanonicalSemanticIdMtcV1;
      capacity: CanonicalDecimalMtcV1;
    }>;

export type EligibilityRuleMtcV1 =
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      kind: "prerequisite-completed";
      prerequisiteInitiativeTypeId: CanonicalSemanticIdMtcV1;
    }>
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      kind: "exclusive-resource-available";
      resourceId: CanonicalSemanticIdMtcV1;
      reservation: "while-active";
    }>
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      kind: "quantitative-capacity-available";
      resourceId: CanonicalSemanticIdMtcV1;
      amount: CanonicalDecimalMtcV1;
      unit: CanonicalSemanticIdMtcV1;
      reservation: "while-active";
    }>
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      kind: "constraint-absent";
      constraintId: CanonicalSemanticIdMtcV1;
    }>
  | Readonly<{
      ruleId: CanonicalSemanticIdMtcV1;
      kind: "entitlement-available";
      entitlementId: CanonicalSemanticIdMtcV1;
      consumption: "retain" | "consume-on-admission";
    }>;

export interface InitiativeTypeDeclarationMtcV1 {
  readonly initiativeTypeId: CanonicalSemanticIdMtcV1;
  readonly lifecycle: "pending-active-completed-v1";
  readonly eligibilityRules: readonly EligibilityRuleMtcV1[];
}

export interface Layer1DeclarationsMtcV1 {
  readonly initiativeTypes: readonly InitiativeTypeDeclarationMtcV1[];
  readonly resources: readonly ResourceDeclarationMtcV1[];
  readonly constraints: readonly Readonly<{
    constraintId: CanonicalSemanticIdMtcV1;
    kind: "blocking";
  }>[];
  readonly entitlements: readonly Readonly<{
    entitlementId: CanonicalSemanticIdMtcV1;
    kind: "reusable" | "consumable";
  }>[];
}

export interface ObservationNodeMtcV1 {
  readonly nodeId: CanonicalSemanticIdMtcV1;
  readonly label?: string;
}

export type ObservationEdgeEvidenceMtcV1 =
  | Readonly<{
      kind: "evidence-reference";
      evidenceId: CanonicalSemanticIdMtcV1;
    }>
  | Readonly<{
      kind: "explicit-assumption";
      rationale: string;
    }>;

export interface ObservationEdgeMtcV1 {
  readonly edgeId: CanonicalSemanticIdMtcV1;
  readonly sourceNodeId: CanonicalSemanticIdMtcV1;
  readonly targetNodeId: CanonicalSemanticIdMtcV1;
  readonly relationship: "directional-causal-observation";
  readonly persistence: "none" | "declared-persistent";
  readonly evidence: ObservationEdgeEvidenceMtcV1;
}

export interface Layer2DeclarationsMtcV1 {
  readonly resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1";
  readonly nodes: readonly ObservationNodeMtcV1[];
  readonly edges: readonly ObservationEdgeMtcV1[];
}

export interface TwoLayerMtcContractV1 {
  readonly schemaVersion: typeof TWO_LAYER_MTC_SCHEMA_VERSION;
  readonly semanticId: CanonicalSemanticIdMtcV1;
  readonly revision: number;
  readonly protocolVersion: typeof TWO_LAYER_MTC_PROTOCOL_VERSION;
  readonly limitsVersion: typeof TWO_LAYER_MTC_LIMITS_VERSION;
  readonly evidence: readonly EvidenceDeclarationMtcV1[];
  readonly layer1: Layer1DeclarationsMtcV1;
  readonly layer2: Layer2DeclarationsMtcV1;
}

export type ContractIssueCodeMtcV1 =
  | "invalid-json"
  | "invalid-type"
  | "missing-field"
  | "unknown-field"
  | "invalid-discriminant"
  | "invalid-id"
  | "invalid-string"
  | "unsafe-integer"
  | "invalid-decimal"
  | "limit-exceeded"
  | "duplicate-semantic-id"
  | "duplicate-observation-edge"
  | "unknown-reference"
  | "forbidden-cross-layer-reference"
  | "resource-kind-mismatch"
  | "unit-mismatch"
  | "self-edge"
  | "causal-cycle"
  | "causal-depth-exceeded";

export interface ContractIssueMtcV1 {
  readonly code: ContractIssueCodeMtcV1;
  readonly path: string;
  readonly message: string;
}

export type ParseContractResultMtcV1 =
  | Readonly<{ ok: true; value: TwoLayerMtcContractV1 }>
  | Readonly<{ ok: false; issues: readonly ContractIssueMtcV1[] }>;
