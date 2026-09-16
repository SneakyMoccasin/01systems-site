import { isDeepStrictEqual } from "node:util";
import { hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import { hashLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";

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

export type DiscrepancyResultStatusV1 =
  | "pass"
  | "fail"
  | "not-applicable-no-successful-legacy-output"
  | "not-applicable-normalization-rejected"
  | "excluded-no-authoritative-value"
  | "ineligible-no-declaration"
  | "rejected";

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

const ACTIVE_CLASSIFICATIONS = Object.freeze([
  "adapter-error",
  "contract-error",
  "compatibility-rule",
  "unresolved-design-decision",
] as const);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function isAbsoluteRfc6901Path(path: string): boolean {
  if (path === "/") return true;
  if (!path.startsWith("/")) return false;
  for (let index = 0; index < path.length; index += 1) {
    if (path[index] !== "~") continue;
    if (path[index + 1] !== "0" && path[index + 1] !== "1") return false;
    index += 1;
  }
  return true;
}

function isConcreteFrozen(value: unknown): boolean {
  if (value === undefined) return false;
  if (!value || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isConcreteFrozen);
}

function verifyOwnedDiscrepanciesV1(input: Readonly<{
  permittedClassification: "adapter-error" | "contract-error" | "compatibility-rule" | "unresolved-design-decision";
  status: DiscrepancyResultStatusV1;
  discrepancies: readonly DifferentialDiscrepancyV1[];
  allowRootPath?: boolean;
}>): void {
  const paths = new Set<string>();
  let previous: string | undefined;
  for (const discrepancy of input.discrepancies) {
    if (!(ACTIVE_CLASSIFICATIONS as readonly string[]).includes(discrepancy.classification)) throw new Error("M1D reserved or unknown discrepancy classification");
    if (discrepancy.classification !== input.permittedClassification) throw new Error("M1D discrepancy classification is forbidden for ownership boundary");
    if (!isAbsoluteRfc6901Path(discrepancy.path) || (discrepancy.path === "/" && !input.allowRootPath)) throw new Error("M1D invalid RFC 6901 discrepancy path");
    if (!isConcreteFrozen(discrepancy.left) || !isConcreteFrozen(discrepancy.right)) throw new Error("M1D discrepancy values must be concrete and recursively frozen");
    if (paths.has(discrepancy.path)) throw new Error("M1D duplicate or contradictory discrepancy path");
    if (previous !== undefined && compareCodeUnits(previous, discrepancy.path) > 0) throw new Error("M1D discrepancies must use canonical code-unit order");
    paths.add(discrepancy.path);
    previous = discrepancy.path;
  }
  if (input.status === "pass" && input.discrepancies.length !== 0) throw new Error("M1D pass result cannot contain discrepancies");
  if (input.status === "fail" && input.discrepancies.length === 0) throw new Error("M1D fail result requires discrepancies");
  if (input.status !== "pass" && input.status !== "fail" && input.discrepancies.length !== 0) throw new Error("M1D closed non-comparison status cannot contain discrepancies");
}

type OwnedVerificationInputV1 = Readonly<{
  status: DiscrepancyResultStatusV1;
  discrepancies: readonly DifferentialDiscrepancyV1[];
  allowRootPath?: boolean;
}>;

export function verifyAdapterReportDiscrepanciesV1(input: OwnedVerificationInputV1): void {
  verifyOwnedDiscrepanciesV1({ ...input, permittedClassification: "adapter-error" });
}

export function verifyNativeExecutionDiscrepanciesV1(input: OwnedVerificationInputV1): void {
  verifyOwnedDiscrepanciesV1({ ...input, permittedClassification: "contract-error" });
}

export function verifyCompatibilityDiscrepanciesV1(input: OwnedVerificationInputV1): void {
  verifyOwnedDiscrepanciesV1({ ...input, permittedClassification: "compatibility-rule" });
}

function verifyComparatorADiscrepanciesV1(input: OwnedVerificationInputV1 & Readonly<{ classification: "compatibility-rule" | "unresolved-design-decision" }>): void {
  verifyOwnedDiscrepanciesV1({ ...input, permittedClassification: input.classification });
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
  input: Readonly<{
    envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
    legacy: DifferentialObservationV1;
    pureNative: DifferentialObservationV1;
    effective: DifferentialObservationV1;
    comparatorB: FullCompatibilityComparatorV1;
  }>
): ComparatorAResultV1 {
  const expectedHashes: M1CHashIdentity = {
    sourceSemanticPayloadHash: input.envelope.source.semanticPayloadHash,
    projectedSemanticPayloadHash: input.envelope.projection.semanticPayloadHash,
    compatibilityDeclarationsHash: input.envelope.compatibility.declarationsHash,
    envelopeHash: hashLegacyProfileProjectionEnvelopeV1(input.envelope),
  };
  const observations = [input.legacy, input.pureNative, input.effective] as const;
  const expectedKinds: readonly ObservationKind[] = ["legacy-reference", "pure-native", "compatibility-effective"];
  for (const [index, observation] of observations.entries()) {
    if (!isConcreteFrozen(observation)) throw new Error("M1D Comparator A requires recursively frozen detached observations");
    if (observation.kind !== expectedKinds[index]
      || observation.profileId !== input.envelope.source.identity.profileId
      || observation.caseId !== input.legacy.caseId
      || observation.scenario !== "combined"
      || observation.nativeStateHasCompatibilityProperties !== false
      || !isDeepStrictEqual(observation.hashes, expectedHashes)) {
      throw new Error("M1D Comparator A observation identity or hash binding mismatch");
    }
  }
  if (input.comparatorB.comparator !== "pure-native-vs-full-compatibility-effective-v1" || input.comparatorB.status !== "pass" || !isConcreteFrozen(input.comparatorB)) {
    throw new Error("M1D Comparator A requires a verified passing compatibility comparator");
  }
  if (!Array.isArray(input.comparatorB.discrepancies) || input.comparatorB.discrepancies.length !== 0) {
    throw new Error("M1D Comparator A requires a passing Comparator B to have an empty discrepancies list");
  }
  const primary = collectDiscrepancies(
    input.pureNative.comparisonSurface,
    input.effective.comparisonSurface,
    "compatibility-rule",
    "/comparisonSurface"
  ).sort((left, right) => compareCodeUnits(left.path, right.path));
  const expectedPrimary = primary.map((entry) => ({ path: entry.path, before: entry.left, after: entry.right }));
  if (!isDeepStrictEqual(expectedPrimary, input.comparatorB.primaryDifferences)) throw new Error("M1D Comparator A compatibility prerequisite mismatch");
  const attributedDifferences = input.comparatorB.attributions
    .flatMap((entry) => {
      if (!isDeepStrictEqual(entry.observedOutputPaths, entry.observedDifferences.map((difference) => difference.path))) throw new Error("M1D Comparator A compatibility attribution path mismatch");
      return entry.observedDifferences;
    })
    .slice()
    .sort((left, right) => compareCodeUnits(left.path, right.path));
  if (!isDeepStrictEqual(attributedDifferences, expectedPrimary)) throw new Error("M1D Comparator A received incomplete or superfluous compatibility attribution");
  const compatibilityOwnedPaths = new Set(attributedDifferences.map((entry) => entry.path));

  const firstPass = collectDiscrepancies(
    input.legacy.comparisonSurface,
    input.effective.comparisonSurface,
    "unresolved-design-decision",
    "/comparisonSurface"
  ).sort((a, b) => compareCodeUnits(a.path, b.path));
  const secondPass = collectDiscrepancies(
    input.legacy.comparisonSurface,
    input.effective.comparisonSurface,
    "unresolved-design-decision",
    "/comparisonSurface"
  ).sort((a, b) => compareCodeUnits(a.path, b.path));
  if (!isDeepStrictEqual(firstPass, secondPass)) throw new Error("M1D Comparator A mismatch is not reproducible");
  const discrepancies = detachedFrozen(firstPass.map((entry) => ({
    ...entry,
    classification: compatibilityOwnedPaths.has(entry.path) ? "compatibility-rule" as const : "unresolved-design-decision" as const,
  })));
  const result = detachedFrozen({
    comparator: "legacy-vs-compatibility-effective-v1" as const,
    status: discrepancies.length === 0 ? "pass" as const : "fail" as const,
    ok: discrepancies.length === 0,
    discrepancies,
  });
  const compatibilityDiscrepancies = result.discrepancies.filter((entry) => entry.classification === "compatibility-rule");
  const unresolvedDiscrepancies = result.discrepancies.filter((entry) => entry.classification === "unresolved-design-decision");
  if (result.status === "pass") {
    verifyComparatorADiscrepanciesV1({ status: "pass", discrepancies: [], classification: "unresolved-design-decision" });
  } else {
    if (compatibilityDiscrepancies.length > 0) verifyComparatorADiscrepanciesV1({ status: "fail", discrepancies: compatibilityDiscrepancies, classification: "compatibility-rule" });
    if (unresolvedDiscrepancies.length > 0) verifyComparatorADiscrepanciesV1({ status: "fail", discrepancies: unresolvedDiscrepancies, classification: "unresolved-design-decision" });
  }
  return result;
}

export function comparatorANotApplicableV1(): ComparatorAResultV1 {
  const result = detachedFrozen({ comparator: "legacy-vs-compatibility-effective-v1" as const, status: "not-applicable-no-successful-legacy-output" as const, ok: null, discrepancies: [] });
  verifyComparatorADiscrepanciesV1({ status: result.status, discrepancies: result.discrepancies, classification: "unresolved-design-decision" });
  return result;
}

export function compareCompatibilityNormalizedLegacyEngineCoreV1(left: unknown, right: unknown, policyHash: string): CompatibilityNormalizedLegacyEngineCoreResultV1 {
  const discrepancies = collectDiscrepancies(left, right, "compatibility-rule", "/comparisonSurface").sort((a, b) => compareCodeUnits(a.path, b.path));
  const result = detachedFrozen({
    reference: "compatibility-normalized-legacy-engine-core-reconstruction-v1" as const,
    comparator: "compatibility-normalized-legacy-engine-core-vs-native-effective-v1" as const,
    status: discrepancies.length === 0 ? "pass" as const : "fail" as const,
    policyHash,
    discrepancies,
  });
  verifyCompatibilityDiscrepanciesV1({ status: result.status, discrepancies: result.discrepancies });
  return result;
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
  const result = detachedFrozen({
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
  verifyCompatibilityDiscrepanciesV1({ status: result.attribution.status, discrepancies: result.attribution.discrepancies });
  verifyCompatibilityDiscrepanciesV1({ status: result.counterfactual.status, discrepancies: result.counterfactual.discrepancies });
  return result;
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
  const result = detachedFrozen({ comparator: "actual-runtime-admission-vs-declared-policy-v1" as const, status: discrepancies.length === 0 ? "pass" as const : "fail" as const, discrepancies });
  verifyCompatibilityDiscrepanciesV1({ status: result.status, discrepancies: result.discrepancies });
  return result;
}

export function hashDifferentialReportContent(value: unknown): string {
  return hashBaselineValueV1(value);
}
