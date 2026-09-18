import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";

export const OBSERVATION_SOURCE_EVENT_VERSION = "ce-two-layer-mtc-source-event-v1" as const;
export const OBSERVATION_SOURCE_BINDINGS_VERSION = "ce-two-layer-mtc-source-bindings-v1" as const;
export const OBSERVATION_SOURCE_RESULT_VERSION = "ce-two-layer-mtc-source-binding-result-v1" as const;

export type ObservationSourceEventKindMtcV1 = "initiative-admitted" | "initiative-completed";

export interface ObservationSourceEventMtcV1 {
  readonly sourceEventVersion: typeof OBSERVATION_SOURCE_EVENT_VERSION;
  readonly sourceEventIdentity: string;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly executionIdentity: string;
  readonly committedBoundary: number;
  readonly kind: ObservationSourceEventKindMtcV1;
  readonly initiativeInstanceId: CanonicalSemanticIdMtcV1;
  readonly initiativeTypeId: CanonicalSemanticIdMtcV1;
  readonly provenance: Readonly<{
    source: "committed-period" | "terminal-boundary";
    periodOrBoundary: number;
    priorStateIdentity: string;
    resultingStateIdentity: string;
    transition: "pending-to-active" | "active-to-completed";
  }>;
}

export interface ObservationSourceBindingMtcV1 {
  readonly bindingId: CanonicalSemanticIdMtcV1;
  readonly eventKind: ObservationSourceEventKindMtcV1;
  readonly initiativeInstanceId: CanonicalSemanticIdMtcV1;
  readonly targetNodeId: CanonicalSemanticIdMtcV1;
}

export interface ObservationSourceBindingsMtcV1 {
  readonly schemaVersion: typeof OBSERVATION_SOURCE_BINDINGS_VERSION;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly bindings: readonly ObservationSourceBindingMtcV1[];
  readonly semanticIdentity: string;
}

export interface ObservationActivationCandidateMtcV1 {
  readonly bindingId: CanonicalSemanticIdMtcV1;
  readonly sourceEventIdentity: string;
  readonly targetNodeId: CanonicalSemanticIdMtcV1;
  readonly provenance: Readonly<{
    sourceEventIdentity: string;
    bindingIdentity: string;
    observationNodeId: CanonicalSemanticIdMtcV1;
  }>;
}

export interface ObservationSourceBindingResultMtcV1 {
  readonly resultVersion: typeof OBSERVATION_SOURCE_RESULT_VERSION;
  readonly scenarioIdentity: string;
  readonly contractIdentity: string;
  readonly executionIdentity: string;
  readonly bindingIdentity: string;
  readonly sourceEvents: readonly ObservationSourceEventMtcV1[];
  readonly activationCandidates: readonly ObservationActivationCandidateMtcV1[];
  readonly unmappedSourceEventIdentities: readonly string[];
  readonly resultIdentity: string;
}

export type SourceBindingIssueCodeMtcV1 =
  | "invalid-type" | "missing-field" | "unknown-field" | "invalid-discriminant"
  | "invalid-id" | "invalid-hash" | "identity-mismatch" | "unknown-reference"
  | "forbidden-layer1-target" | "duplicate-binding" | "conflicting-binding"
  | "limit-exceeded";

export interface SourceBindingIssueMtcV1 {
  readonly code: SourceBindingIssueCodeMtcV1;
  readonly path: string;
  readonly message: string;
}

export type ParseSourceBindingsResultMtcV1 =
  | Readonly<{ ok: true; value: ObservationSourceBindingsMtcV1 }>
  | Readonly<{ ok: false; issues: readonly SourceBindingIssueMtcV1[] }>;
