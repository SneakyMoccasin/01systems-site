import type { DecisionSpaceClassificationMtcV1 } from "../decisionSpace/decisionSpaceMtcV1";
import type { AdmissionConflictMtcV1 } from "../execution/executionMtcV1";
import type { SingleRunResultMtcV1 } from "../singleRunResult/singleRunResultMtcV1";

export const COMPARISON_VERSION_MTC_V1 = "ce-two-layer-mtc-comparison-v1" as const;
export const SEQUENCE_TIMING_ONLY_MTC_V1 = "SEQUENCE_TIMING_ONLY" as const;

export type ComparabilityReasonMtcV1 = Readonly<{ dimension: string; aIdentity: string; bIdentity: string }>;
export type ComparisonPointMtcV1 = Readonly<{ kind: "initial" | "period-commit" | "terminal-boundary"; period: number }>;
export type DifferenceDimensionMtcV1 = "initiative-lifecycle" | "resource-state" | "constraint-state" | "entitlement-state" | "decision-space" | "source-event" | "layer2-observation" | "layer2-paths" | "run-status";
export interface ComparedDifferenceMtcV1 {
  readonly differenceKey: string;
  readonly dimension: DifferenceDimensionMtcV1;
  readonly subjectId: string;
  readonly point: ComparisonPointMtcV1;
  readonly aSemantic: unknown;
  readonly bSemantic: unknown;
  readonly provenance: Readonly<{ aResultIdentity: string; bResultIdentity: string; aSnapshotIdentity?: string; bSnapshotIdentity?: string; aPathIdentities?: readonly string[]; bPathIdentities?: readonly string[] }>;
}
export interface DifferenceIntervalMtcV1 {
  readonly differenceKey: string;
  readonly dimension: DifferenceDimensionMtcV1;
  readonly subjectId: string;
  readonly firstDifferingPoint: ComparisonPointMtcV1;
  readonly lastDifferingPoint: ComparisonPointMtcV1;
  readonly convergencePoint?: ComparisonPointMtcV1;
  readonly persistsThroughAuthorityBoundary: boolean;
}
export interface DecisionSpaceSetDifferenceMtcV1 {
  readonly point: ComparisonPointMtcV1;
  readonly eligibleOnlyA: readonly string[];
  readonly eligibleOnlyB: readonly string[];
  readonly eligibleInBoth: readonly string[];
  readonly classificationDifferences: readonly Readonly<{ instanceId: string; a: DecisionSpaceClassificationMtcV1; b: DecisionSpaceClassificationMtcV1 }>[];
}
interface ComparisonBaseMtcV1 { readonly comparisonVersion: typeof COMPARISON_VERSION_MTC_V1; readonly policy: typeof SEQUENCE_TIMING_ONLY_MTC_V1; readonly aResultIdentity: string; readonly bResultIdentity: string; }
export type ComparisonResultMtcV1 =
  | Readonly<ComparisonBaseMtcV1 & { status: "not-comparable"; reasons: readonly ComparabilityReasonMtcV1[]; comparisonIdentity: string }>
  | Readonly<ComparisonBaseMtcV1 & { status: "incomplete-bounds"; boundedSides: readonly ("A" | "B")[]; comparisonIdentity: string }>
  | Readonly<ComparisonBaseMtcV1 & { status: "compared"; completeness: "full" | "limited-unresolved"; authorityThroughPeriod: number; runStatuses: Readonly<{ A: SingleRunResultMtcV1["status"]; B: SingleRunResultMtcV1["status"] }>; unresolved: Readonly<{ A?: Readonly<{ failedPeriod: number; conflicts: readonly AdmissionConflictMtcV1[] }>; B?: Readonly<{ failedPeriod: number; conflicts: readonly AdmissionConflictMtcV1[] }> }>; outcome: "no-compared-difference" | "compared-differences"; firstDivergence?: Readonly<{ point: ComparisonPointMtcV1; dimensions: readonly DifferenceDimensionMtcV1[] }>; differences: readonly ComparedDifferenceMtcV1[]; intervals: readonly DifferenceIntervalMtcV1[]; decisionSpaceDifferences: readonly DecisionSpaceSetDifferenceMtcV1[]; historicalDivergence: boolean; terminalStructuralEquivalent: boolean; terminalDecisionSpaceEquivalent: boolean; comparisonIdentity: string }>;
