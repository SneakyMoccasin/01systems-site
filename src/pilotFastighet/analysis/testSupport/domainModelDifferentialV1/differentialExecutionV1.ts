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
  status: "pass" | "fail" | "not-applicable-no-successful-legacy-output";
  ok: boolean | null;
  discrepancies: readonly DifferentialDiscrepancyV1[];
}>;

export type ActualRuntimeActionRejectionV1 = Readonly<{
  version: "actual-runtime-action-rejection-v1";
  outcome: "rejected";
  profileId: string;
  scenario: "scenarioA" | "scenarioB";
  sourceActionId: string;
  scheduledStep: number;
  canonicalSourceEffects: readonly Readonly<{ sourceDriverId: string; delta: number }>[];
  unsupportedSourceDriverIds: readonly string[];
  failureStage: "normalize-scheduled-actions-before-step-v1";
  failureReason: "canonical-effect-driver-not-applicable-v1";
  engineOutput: "absent";
  stateMutation: false;
  canonicalExecutionProvenance: "absent";
}>;

export type CompatibilityNormalizedLegacyEngineCoreStatusV1 =
  | "pass"
  | "fail"
  | "not-applicable-normalization-rejected";

export type CompatibilityNormalizedLegacyEngineCoreResultV1 = Readonly<{
  reference: "compatibility-normalized-legacy-engine-core-reconstruction-v1";
  comparator: "compatibility-normalized-legacy-engine-core-vs-native-effective-v1";
  status: CompatibilityNormalizedLegacyEngineCoreStatusV1;
  policyHash: string;
  discrepancies: readonly DifferentialDiscrepancyV1[];
}>;

export type AdmissionComparatorV1 = Readonly<{
  comparator: "actual-runtime-admission-vs-declared-policy-v1";
  status: "pass" | "fail";
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

export type DifferenceV1 = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type ComparatorDiscrepancyV1 = DifferentialDiscrepancyV1;

export interface FullCompatibilityComparatorV1 {
  comparator: "pure-native-vs-full-compatibility-effective-v1";
  status: "pass" | "fail";
  primaryDifferences: readonly DifferenceV1[];
  attributions: readonly CompatibilityAttributionV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}

export interface ActionAdmissionAttributionResultV1 {
  comparator: "full-effective-with-action-vs-without-exact-action-declaration-v1";
  status: "pass" | "fail";
  declarationPath: string;
  outputDisposition: "changed" | "unchanged";
  attributedDifferences: readonly DifferenceV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}

export interface CompatibilityDeclarationCounterfactualV1 {
  comparator: "single-declaration-leave-one-out-v1";
  status: "pass" | "fail";
  declarationPath: string;
  before: unknown;
  after: unknown;
  attributedDifferences: readonly DifferenceV1[];
  discrepancies: readonly ComparatorDiscrepancyV1[];
}

export type DomainModelDifferentialReportV1 = Readonly<{
  version: "domain-model-differential-report-v1";
  legacyReference: DifferentialObservationV1;
  pureNative: DifferentialObservationV1;
  compatibilityEffectiveCandidate: DifferentialObservationV1;
  counterfactuals: readonly DifferentialObservationV1[];
  comparatorA: ComparatorAResultV1;
  comparatorB: FullCompatibilityComparatorV1;
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
      const childPath = pathChild(path, String(index));
      if (!(index in left) || !(index in right)) {
        out.push({ path: childPath, left: index in left ? detachedFrozen(left[index]) : { presence: "absent" }, right: index in right ? detachedFrozen(right[index]) : { presence: "absent" }, classification });
      } else {
        out.push(...collectDiscrepancies(left[index], right[index], classification, childPath));
      }
    }
    return out;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort(compareCodeUnits);
  return keys.flatMap((key) => {
    const childPath = pathChild(path, key);
    const hasLeft = Object.prototype.hasOwnProperty.call(leftRecord, key);
    const hasRight = Object.prototype.hasOwnProperty.call(rightRecord, key);
    if (!hasLeft || !hasRight) return [{ path: childPath, left: hasLeft ? detachedFrozen(leftRecord[key]) : { presence: "absent" }, right: hasRight ? detachedFrozen(rightRecord[key]) : { presence: "absent" }, classification }];
    return collectDiscrepancies(leftRecord[key], rightRecord[key], classification, childPath);
  });
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
    status: discrepancies.length === 0 ? "pass" as const : "fail" as const,
    ok: discrepancies.length === 0,
    discrepancies,
  });
}

export function comparatorANotApplicableV1(): ComparatorAResultV1 {
  return detachedFrozen({ comparator: "legacy-vs-compatibility-effective-v1" as const, status: "not-applicable-no-successful-legacy-output" as const, ok: null, discrepancies: [] });
}

export function compareCompatibilityNormalizedLegacyEngineCoreV1(left: unknown, right: unknown, policyHash: string): CompatibilityNormalizedLegacyEngineCoreResultV1 {
  const discrepancies = collectDiscrepancies(left, right, "compatibility-rule", "/comparisonSurface").sort((a, b) => compareCodeUnits(a.path, b.path));
  return detachedFrozen({
    reference: "compatibility-normalized-legacy-engine-core-reconstruction-v1" as const,
    comparator: "compatibility-normalized-legacy-engine-core-vs-native-effective-v1" as const,
    status: discrepancies.length === 0 ? "pass" as const : "fail" as const,
    policyHash,
    discrepancies,
  });
}

function isOutputAttributionPath(path: string): boolean {
  return path.startsWith("/comparisonSurface/scenarioA/")
    || path.startsWith("/comparisonSurface/scenarioB/")
    || path.startsWith("/comparisonSurface/baseline/")
    || path.startsWith("/comparisonSurface/comparison/");
}

export function deriveActionAdmissionAttributionV1(input: Readonly<{
  declarationPath: string;
  withoutDeclaration: unknown;
  withDeclaration: unknown;
}>): Readonly<{
  attribution: ActionAdmissionAttributionResultV1;
  counterfactual: CompatibilityDeclarationCounterfactualV1;
}> {
  const observed = collectDiscrepancies(input.withoutDeclaration, input.withDeclaration, "compatibility-rule", "/comparisonSurface")
    .sort((a, b) => compareCodeUnits(a.path, b.path));
  const forbidden = observed.filter((entry) => !isOutputAttributionPath(entry.path));
  const discrepancies = forbidden.map((entry) => ({
    path: entry.path,
    left: "output-attribution-path",
    right: entry.path,
    classification: "compatibility-rule" as const,
  }));
  const attributedDifferences = observed
    .filter((entry) => isOutputAttributionPath(entry.path))
    .map((entry) => ({ path: entry.path, before: entry.left, after: entry.right }));
  const status = discrepancies.length === 0 ? "pass" as const : "fail" as const;
  return detachedFrozen({
    attribution: {
      comparator: "full-effective-with-action-vs-without-exact-action-declaration-v1" as const,
      status,
      declarationPath: input.declarationPath,
      outputDisposition: attributedDifferences.length === 0 ? "unchanged" as const : "changed" as const,
      attributedDifferences,
      discrepancies,
    },
    counterfactual: {
      comparator: "single-declaration-leave-one-out-v1" as const,
      status,
      declarationPath: input.declarationPath,
      before: input.withoutDeclaration,
      after: input.withDeclaration,
      attributedDifferences,
      discrepancies,
    },
  });
}

export function compareActualAdmissionV1(input: Readonly<{
  actual: ActualRuntimeActionRejectionV1;
  expectedProfileId: string;
  expectedActionId: string;
  expectedStep: number;
  expectedEffects: readonly Readonly<{ sourceDriverId: string; delta: number }>[];
  expectedUnsupported: readonly string[];
  actualRuntimeExpectation: string;
}>): AdmissionComparatorV1 {
  const expected = {
    version: "actual-runtime-action-rejection-v1",
    outcome: "rejected",
    profileId: input.expectedProfileId,
    scenario: input.actual.scenario,
    sourceActionId: input.expectedActionId,
    scheduledStep: input.expectedStep,
    canonicalSourceEffects: input.expectedEffects,
    unsupportedSourceDriverIds: input.expectedUnsupported,
    failureStage: "normalize-scheduled-actions-before-step-v1",
    failureReason: "canonical-effect-driver-not-applicable-v1",
    engineOutput: "absent",
    stateMutation: false,
    canonicalExecutionProvenance: "absent",
  };
  const discrepancies = input.actualRuntimeExpectation === "reject-unsupported-driver-before-step-v1"
    ? collectDiscrepancies(expected, input.actual, "compatibility-rule", "/actualRuntimeRejection")
    : [{ path: "/declaredPolicy/actualRuntimeExpectation", left: "reject-unsupported-driver-before-step-v1", right: input.actualRuntimeExpectation, classification: "compatibility-rule" as const }];
  return detachedFrozen({ comparator: "actual-runtime-admission-vs-declared-policy-v1" as const, status: discrepancies.length === 0 ? "pass" as const : "fail" as const, discrepancies });
}

export function hashDifferentialReportContent(value: unknown): string {
  return hashBaselineValueV1(value);
}
