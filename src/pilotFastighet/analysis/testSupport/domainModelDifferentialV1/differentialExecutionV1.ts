import { hashBaselineValueV1 } from "../baselineCanonicalizationV1";

export type ObservationKind =
  | "legacy-reference"
  | "pure-native"
  | "compatibility-effective"
  | "compatibility-counterfactual";

export type M1CHashIdentity = Readonly<{
  sourceSemanticPayloadHash: string;
  projectedSemanticPayloadHash: string;
  compatibilityDeclarationsHash: string;
  envelopeHash: string;
}>;

export type CompatibilityLedgerEntry = Readonly<{
  declarationPath: string;
  status: "admitted" | "applied" | "ignored" | "rejected";
  mechanism: string;
  sourceId: string | null;
  nativeId: string | null;
  executionStep: number;
}>;

export type DifferentialObservationV1 = Readonly<{
  version: "domain-model-differential-observation-v1";
  kind: ObservationKind;
  profileId: string;
  caseId: string;
  scenario: "combined";
  hashes: M1CHashIdentity;
  activatedDeclarationPaths: readonly string[];
  compatibilityLedger: readonly CompatibilityLedgerEntry[];
  nativeStateHasCompatibilityProperties: false;
  comparisonSurface: unknown;
}>;

export type DiscrepancyClassification =
  | "adapter-error"
  | "contract-error"
  | "compatibility-rule"
  | "known-explicitly-deferred"
  | "possible-legacy-runtime-defect"
  | "unresolved-design-decision";

export type DifferentialDiscrepancyV1 = Readonly<{
  path: string;
  left: unknown;
  right: unknown;
  classification: DiscrepancyClassification;
}>;

export type ComparatorAResultV1 = Readonly<{
  comparator: "legacy-vs-compatibility-effective-v1";
  ok: boolean;
  discrepancies: readonly DifferentialDiscrepancyV1[];
}>;

export type CompatibilityAttributionV1 = Readonly<{
  declarationPaths: readonly string[];
  profileId: string;
  caseId: string;
  scenario: "combined";
  sourceId: string | null;
  nativeId: string | null;
  executionStep: number;
  observedOutputPaths: readonly string[];
  observedDifferences: readonly Readonly<{ path: string; before: unknown; after: unknown }>[];
  mechanismLedger: Readonly<{
    admitted: readonly string[];
    applied: readonly string[];
    ignored: readonly string[];
    rejected: readonly string[];
  }>;
}>;

export type ComparatorBResultV1 = Readonly<{
  comparator: "pure-native-vs-compatibility-effective-v1";
  ok: boolean;
  permittedDeclarationPaths: readonly string[];
  attributions: readonly CompatibilityAttributionV1[];
  discrepancies: readonly DifferentialDiscrepancyV1[];
}>;

export type DomainModelDifferentialReportV1 = Readonly<{
  version: "domain-model-differential-report-v1";
  legacyReference: DifferentialObservationV1;
  pureNative: DifferentialObservationV1;
  compatibilityEffectiveCandidate: DifferentialObservationV1;
  counterfactuals: readonly DifferentialObservationV1[];
  comparatorA: ComparatorAResultV1;
  comparatorB: ComparatorBResultV1;
  reportHash: string;
}>;

export function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function detachedFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function pathChild(path: string, key: string): string {
  const escaped = key.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${path}/${escaped}`;
}

export function collectDiscrepancies(
  left: unknown,
  right: unknown,
  classification: DiscrepancyClassification,
  path = ""
): DifferentialDiscrepancyV1[] {
  if (Object.is(left, right)) return [];
  if (typeof left !== typeof right || left === null || right === null) {
    return [{ path: path || "/", left: detachedFrozen(left), right: detachedFrozen(right), classification }];
  }
  if (typeof left !== "object") {
    return [{ path: path || "/", left, right, classification }];
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return [{ path: path || "/", left: detachedFrozen(left), right: detachedFrozen(right), classification }];
    }
    const out: DifferentialDiscrepancyV1[] = [];
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      out.push(...collectDiscrepancies(left[index], right[index], classification, pathChild(path, String(index))));
    }
    return out;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort(compareCodeUnits);
  return keys.flatMap((key) =>
    collectDiscrepancies(leftRecord[key], rightRecord[key], classification, pathChild(path, key))
  );
}

export function compareLegacyToCompatibilityEffective(
  legacy: DifferentialObservationV1,
  effective: DifferentialObservationV1,
  classification: DiscrepancyClassification = "unresolved-design-decision"
): ComparatorAResultV1 {
  const discrepancies = collectDiscrepancies(
    legacy.comparisonSurface,
    effective.comparisonSurface,
    classification,
    "/comparisonSurface"
  ).sort((a, b) => compareCodeUnits(a.path, b.path));
  return detachedFrozen({
    comparator: "legacy-vs-compatibility-effective-v1" as const,
    ok: discrepancies.length === 0,
    discrepancies,
  });
}

export function hashDifferentialReportContent(value: unknown): string {
  return hashBaselineValueV1(value);
}
