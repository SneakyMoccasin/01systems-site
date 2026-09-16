import { isDeepStrictEqual } from "node:util";
import { getImpactMultiplier, PARAMETER_CURVE_CONFIG } from "../../../curveConfig";
import { hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import { hashLegacyProfileProjectionEnvelopeV1, verifyLegacyProfileProjectionEnvelopeV1Hashes } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "../domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure";
import { type LegacyProfileIdV1, validateLegacyProfileProjectionEnvelopeV1Semantics } from "../domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics";
import { parseEngineBaselineInputFixtureV1, type EngineBaselineInputFixtureV1 } from "../engineOutputProjectionV1";
import { compareCodeUnits, detachedFrozen, hashDifferentialReportContent, type CompatibilityAttributionV1, type DifferentialDiscrepancyV1, type DifferenceV1, type DomainModelDifferentialReportV1 } from "../domainModelDifferentialV1/differentialExecutionV1";
import { evaluateSustainThresholdV1, type SustainThresholdEvaluationV1 } from "../domainModelDifferentialV1/executeVerifiedNativeProjectionV1";
import { runDomainModelDifferentialV1 } from "../domainModelDifferentialV1/runDomainModelDifferentialV1";

export type CurveFallbackTriggerV1 = "missing-curve-configuration" | "unsupported-curve-discriminant";
type FinalEquivalenceDiscrepancyKindV1 = "curve-fallback-mismatch" | "sustain-binding-mismatch" | "final-report-integrity-error";
export type FinalEquivalenceDiscrepancyV1 = Readonly<{ path: string; left: unknown; right: unknown; kind: FinalEquivalenceDiscrepancyKindV1 }>;
export type CurveFallbackWitnessV1 = Readonly<{
  version: "legacy-curve-fallback-witness-v1"; profileId: string; trigger: CurveFallbackTriggerV1;
  declarationPath: "/compatibility/curveFallbackDeclaration"; policyId: "legacy-neutral-multiplier-v1";
  parameterKey: string; sourceSemanticPayloadHash: string; projectedSemanticPayloadHash: string;
  compatibilityDeclarationsHash: string; envelopeHash: string; expectedMultiplier: 1; actualMultiplier: number;
  status: "pass" | "fail"; discrepancies: readonly FinalEquivalenceDiscrepancyV1[];
}>;
export type SustainFinalEvidenceV1 = SustainThresholdEvaluationV1;
export type FinalEquivalenceProfileEvidenceV1 = Readonly<{
  profileId: LegacyProfileIdV1; domainId: string; modelVersion: string; calibrationVersion: string;
  sourceSemanticPayloadHash: string; projectedSemanticPayloadHash: string; compatibilityDeclarationsHash: string;
  envelopeHash: string; coverageKind: "isolated-synthetic-legacy-runtime-witness-v1";
  curveFallbackWitnesses: readonly [CurveFallbackWitnessV1, CurveFallbackWitnessV1]; sustain: SustainFinalEvidenceV1;
}>;
export type FinalEquivalenceCaseEvidenceV1 = Readonly<{
  profileId: LegacyProfileIdV1; caseId: string; scenario: "combined"; m1dReport: DomainModelDifferentialReportV1;
  m1dReportHash: string; legacyObservationHash: string; pureNativeObservationHash: string;
  compatibilityEffectiveObservationHash: string; comparatorAHash: string; comparatorAStatus: "pass";
  comparatorBHash: string; comparatorBStatus: "pass"; primaryDifferences: readonly DifferenceV1[];
  attributions: readonly CompatibilityAttributionV1[]; m1dDiscrepancies: readonly DifferentialDiscrepancyV1[];
}>;
export type FinalEquivalenceStatusV1 = "pass-declared-contract-surface-v1" | "fail-v1";
export type DomainModelFinalEquivalenceReportV1 = Readonly<{
  version: "domain-model-final-equivalence-report-v1"; profiles: readonly FinalEquivalenceProfileEvidenceV1[];
  cases: readonly FinalEquivalenceCaseEvidenceV1[]; status: FinalEquivalenceStatusV1;
  discrepancies: readonly FinalEquivalenceDiscrepancyV1[]; reportHash: string;
}>;

type FinalReportContentV1 = Omit<DomainModelFinalEquivalenceReportV1, "reportHash">;
type UnknownRecord = Record<string, unknown>;
const PROFILE_ORDER = Object.freeze(["legacy-real-estate-v1", "legacy-municipal-v1", "legacy-consulting-v1"] as const);
const PROFILE_PARAMETER_KEYS = Object.freeze(["demandRisk", "demandRisk", "demandRisk"] as const);
const FIXTURE_KINDS = Object.freeze(["neutral", "stressed-scheduled"] as const);
const CONTENT_FIELDS = Object.freeze(["version", "profiles", "cases", "status", "discrepancies"] as const);
const REPORT_FIELDS = Object.freeze([...CONTENT_FIELDS, "reportHash"] as const);
const PROFILE_FIELDS = Object.freeze(["profileId", "domainId", "modelVersion", "calibrationVersion", "sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash", "coverageKind", "curveFallbackWitnesses", "sustain"] as const);
const CASE_FIELDS = Object.freeze(["profileId", "caseId", "scenario", "m1dReport", "m1dReportHash", "legacyObservationHash", "pureNativeObservationHash", "compatibilityEffectiveObservationHash", "comparatorAHash", "comparatorAStatus", "comparatorBHash", "comparatorBStatus", "primaryDifferences", "attributions", "m1dDiscrepancies"] as const);
const WITNESS_FIELDS = Object.freeze(["version", "profileId", "trigger", "declarationPath", "policyId", "parameterKey", "sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash", "expectedMultiplier", "actualMultiplier", "status", "discrepancies"] as const);

function fail(message: string): never { throw new Error(`M1E final equivalence prerequisite rejected: ${message}`); }
type FinalReportIntegrityFindingV1 = Readonly<{ path: string; left: unknown; right: unknown }>;
function integrityEvidenceV1(value: unknown): unknown {
  try {
    structuredClone(value);
    return value;
  } catch {
    return Object.freeze({ uncloneableObservedType: typeof value });
  }
}
function emitFinalReportIntegrityDiscrepancyV1(finding: FinalReportIntegrityFindingV1): FinalEquivalenceDiscrepancyV1 {
  return detachedFrozen({ path: finding.path, left: integrityEvidenceV1(finding.left), right: integrityEvidenceV1(finding.right), kind: "final-report-integrity-error" as const });
}
class FinalReportIntegrityViolationV1 extends Error {
  readonly discrepancy: FinalEquivalenceDiscrepancyV1;
  constructor(finding: FinalReportIntegrityFindingV1) {
    super(`final-report-integrity-error:${finding.path}`);
    this.name = "FinalReportIntegrityViolationV1";
    this.discrepancy = emitFinalReportIntegrityDiscrepancyV1(finding);
  }
}
function integrityFail(path: string, left: unknown, right: unknown): never {
  throw new FinalReportIntegrityViolationV1({ path, left, right });
}
function escapePathToken(token: string): string { return token.replaceAll("~", "~0").replaceAll("/", "~1"); }
function isRecord(value: unknown): value is UnknownRecord { return value !== null && typeof value === "object" && !Array.isArray(value); }

function exactRecord(value: unknown, fields: readonly string[], path: string): UnknownRecord {
  if (!isRecord(value)) integrityFail(path, value, "plain object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) integrityFail(path, prototype, "Object.prototype or null");
  if (Object.getOwnPropertySymbols(value).length !== 0) integrityFail(path, Object.getOwnPropertySymbols(value), []);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== fields.length || names.some((name) => !fields.includes(name)) || fields.some((name) => !names.includes(name))) integrityFail(path, names, fields);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor?.enumerable || !("value" in descriptor)) integrityFail(`${path}/${escapePathToken(name)}`, descriptor, "ordinary enumerable data descriptor");
  }
  return value;
}

function exactArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) integrityFail(path, value, "ordinary array");
  if (Object.getOwnPropertySymbols(value).length !== 0) integrityFail(path, Object.getOwnPropertySymbols(value), []);
  const names = Object.getOwnPropertyNames(value);
  if (names.some((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name))) integrityFail(path, names, "dense array index fields and length only");
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) integrityFail(`${path}/${index}`, descriptor, "ordinary enumerable array data descriptor");
  }
  return value;
}

function field(record: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !("value" in descriptor)) integrityFail(`/${escapePathToken(key)}`, descriptor, "own data field");
  return descriptor.value;
}
function stringField(record: UnknownRecord, key: string, path: string): string {
  const value = field(record, key);
  if (typeof value !== "string" || value.length === 0) integrityFail(`${path}/${escapePathToken(key)}`, value, "non-empty string");
  return value;
}
function literal(record: UnknownRecord, key: string, expected: unknown, path: string): void {
  const observed = field(record, key);
  if (!Object.is(observed, expected)) integrityFail(`${path}/${escapePathToken(key)}`, observed, expected);
}
function canonicalPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("~01")) return false;
  for (let index = 0; index < path.length; index += 1) if (path[index] === "~") {
    if (path[index + 1] !== "0" && path[index + 1] !== "1") return false;
    index += 1;
  }
  return true;
}
function recursivelyFrozen(value: unknown): boolean {
  return !value || typeof value !== "object" || (Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen));
}

function verifyEnvelope(raw: unknown, expected: LegacyProfileIdV1): HashVerifiedLegacyProfileProjectionEnvelopeV1 {
  const structural = parseLegacyProfileProjectionEnvelopeV1Structure(raw); if (!structural.ok) fail(`M1C structural verification failed for ${expected}`);
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value); if (!semantic.ok) fail(`M1C semantic verification failed for ${expected}`);
  const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value); if (!verified.ok) fail(`M1C hash verification failed for ${expected}`);
  if (verified.value.source.identity.profileId !== expected) fail(`profile order or identity mismatch for ${expected}`);
  return verified.value;
}
function verifyFixture(raw: unknown, profileId: LegacyProfileIdV1, kind: typeof FIXTURE_KINDS[number]): EngineBaselineInputFixtureV1 {
  const fixture = parseEngineBaselineInputFixtureV1(raw);
  if (fixture.profileId !== profileId || fixture.kind !== kind || fixture.fixtureId !== `${profileId}-${kind}-v1`) fail(`fixture order or identity mismatch for ${profileId}:${kind}`);
  return fixture;
}
function profileParameterKey(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1): string {
  const projected = new Set(envelope.projection.contract.semanticPayload.drivers.map((driver) => driver.driverId));
  const key = envelope.compatibility.driverIdMappings.find((entry) => projected.has(entry.projectedDriverId) && Object.prototype.hasOwnProperty.call(PARAMETER_CURVE_CONFIG, entry.sourceDriverId))?.sourceDriverId;
  if (!key) fail(`no profile-bound legacy curve parameter exists for ${envelope.source.identity.profileId}`);
  return key;
}
function invokeLegacyFallback(parameterKey: string, trigger: CurveFallbackTriggerV1): number {
  if (trigger === "missing-curve-configuration") {
    const configuration = structuredClone(PARAMETER_CURVE_CONFIG);
    if (!Reflect.deleteProperty(configuration, parameterKey)) fail("missing-configuration witness could not remove its parameter");
    return getImpactMultiplier(parameterKey, "MODERATE", 1, Object.freeze(configuration));
  }
  const rawConfiguration = Object.freeze({ [parameterKey]: Object.freeze({ curve: "M1E_UNSUPPORTED_CURVE_SENTINEL", amplitude: Object.freeze({ base: 1, low: 1, high: 1, severe: 1 }) }) });
  return Reflect.apply(getImpactMultiplier, undefined, [parameterKey, "MODERATE", 1, rawConfiguration]);
}
function curveWitness(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1, trigger: CurveFallbackTriggerV1, profileIndex: number, witnessIndex: number): CurveFallbackWitnessV1 {
  const declaration = envelope.compatibility.curveFallbackDeclaration;
  if (declaration.policyId !== "legacy-neutral-multiplier-v1" || declaration.neutralMultiplier !== 1 || declaration.evidenceStatus !== "deferred-to-m1e" || declaration.appliesTo[witnessIndex] !== trigger) fail(`curve declaration mismatch for ${envelope.source.identity.profileId}`);
  const parameterKey = profileParameterKey(envelope); const actualMultiplier = invokeLegacyFallback(parameterKey, trigger);
  if (!Number.isFinite(actualMultiplier)) fail("legacy curve witness returned a non-finite multiplier");
  const path = `/profiles/${profileIndex}/curveFallbackWitnesses/${witnessIndex}/actualMultiplier`;
  const discrepancies: FinalEquivalenceDiscrepancyV1[] = actualMultiplier === 1 ? [] : [detachedFrozen({ path, left: actualMultiplier, right: 1, kind: "curve-fallback-mismatch" as const })];
  return detachedFrozen({ version: "legacy-curve-fallback-witness-v1" as const, profileId: envelope.source.identity.profileId, trigger, declarationPath: "/compatibility/curveFallbackDeclaration" as const, policyId: declaration.policyId, parameterKey, sourceSemanticPayloadHash: envelope.source.semanticPayloadHash, projectedSemanticPayloadHash: envelope.projection.semanticPayloadHash, compatibilityDeclarationsHash: envelope.compatibility.declarationsHash, envelopeHash: hashLegacyProfileProjectionEnvelopeV1(envelope), expectedMultiplier: 1 as const, actualMultiplier, status: discrepancies.length ? "fail" as const : "pass" as const, discrepancies });
}
function sustainEvidence(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1, profileIndex: number): Readonly<{ evidence: SustainFinalEvidenceV1; discrepancies: readonly FinalEquivalenceDiscrepancyV1[] }> {
  const evidence = evaluateSustainThresholdV1({ envelope }); const declaration = envelope.compatibility.sustainThresholdDisposition;
  const valid = declaration === null ? evidence.status === "ineligible-no-declaration" && evidence.declarationPath === null && evidence.historicalMechanismObserved === false && evidence.hashBoundValue === "absent" && !Object.prototype.hasOwnProperty.call(evidence, "execution") && !Object.prototype.hasOwnProperty.call(evidence, "claim") : evidence.status === "excluded-no-authoritative-value" && evidence.declarationPath === "/compatibility/sustainThresholdDisposition" && evidence.historicalMechanismObserved === true && evidence.hashBoundValue === "absent" && evidence.execution === "forbidden" && evidence.claim === "excluded-from-final-equivalence";
  const discrepancies: FinalEquivalenceDiscrepancyV1[] = valid ? [] : [detachedFrozen({ path: `/profiles/${profileIndex}/sustain`, left: evidence, right: declaration === null ? "ineligible-no-declaration" : "excluded-no-authoritative-value", kind: "sustain-binding-mismatch" as const })];
  return detachedFrozen({ evidence, discrepancies });
}
function verifyAttribution(report: DomainModelDifferentialReportV1): void {
  if (report.comparatorB.comparator !== "pure-native-vs-full-compatibility-effective-v1" || report.comparatorB.status !== "pass" || report.comparatorB.discrepancies.length) fail("Comparator B must pass with an empty discrepancies list");
  const attributed = report.comparatorB.attributions.flatMap((entry) => { if (!isDeepStrictEqual(entry.observedOutputPaths, entry.observedDifferences.map((difference) => difference.path))) fail("Comparator B attribution path binding mismatch"); return entry.observedDifferences; }).slice().sort((a, b) => compareCodeUnits(a.path, b.path));
  const primary = [...report.comparatorB.primaryDifferences].sort((a, b) => compareCodeUnits(a.path, b.path));
  if (new Set(attributed.map((entry) => entry.path)).size !== attributed.length || !isDeepStrictEqual(attributed, primary)) fail("Comparator B attribution coverage is not complete and unique");
}
function reproduceM1D(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1, fixture: EngineBaselineInputFixtureV1): DomainModelDifferentialReportV1 {
  const report = runDomainModelDifferentialV1({ envelope, fixture }); const { reportHash, ...content } = report;
  if (hashDifferentialReportContent(content) !== reportHash) fail(`stale M1D report hash for ${fixture.fixtureId}`);
  if (report.version !== "domain-model-differential-report-v1" || report.legacyReference.profileId !== fixture.profileId || report.legacyReference.caseId !== fixture.fixtureId || report.comparatorA.comparator !== "legacy-vs-compatibility-effective-v1" || report.comparatorA.status !== "pass" || report.comparatorA.ok !== true || report.comparatorA.discrepancies.length) fail(`Comparator A prerequisite failed for ${fixture.fixtureId}`);
  verifyAttribution(report); return report;
}
function caseEvidence(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1, fixture: EngineBaselineInputFixtureV1): FinalEquivalenceCaseEvidenceV1 {
  const report = reproduceM1D(envelope, fixture);
  return detachedFrozen({ profileId: fixture.profileId, caseId: fixture.fixtureId, scenario: "combined" as const, m1dReport: report, m1dReportHash: report.reportHash, legacyObservationHash: hashBaselineValueV1(report.legacyReference), pureNativeObservationHash: hashBaselineValueV1(report.pureNative), compatibilityEffectiveObservationHash: hashBaselineValueV1(report.compatibilityEffectiveCandidate), comparatorAHash: hashBaselineValueV1(report.comparatorA), comparatorAStatus: "pass" as const, comparatorBHash: hashBaselineValueV1(report.comparatorB), comparatorBStatus: "pass" as const, primaryDifferences: report.comparatorB.primaryDifferences, attributions: report.comparatorB.attributions, m1dDiscrepancies: detachedFrozen([...report.comparatorA.discrepancies, ...report.comparatorB.discrepancies]) });
}

function verifyDifference(raw: unknown, path: string): UnknownRecord {
  const value = exactRecord(raw, ["path", "before", "after"], path);
  const observedPath = stringField(value, "path", path);
  if (!canonicalPath(observedPath)) integrityFail(`${path}/path`, observedPath, "canonical absolute RFC 6901 path");
  return value;
}
function verifyAttributionContent(raw: unknown, path: string, profileId: string, caseId: string): UnknownRecord[] {
  const list = exactArray(raw, path); const differences: UnknownRecord[] = []; const owned = new Set<string>();
  for (const [index, item] of list.entries()) {
    const itemPath = `${path}/${index}`; const value = exactRecord(item, ["declarationPaths", "profileId", "caseId", "scenario", "sourceId", "nativeId", "executionStep", "observedOutputPaths", "observedDifferences", "mechanismLedger"], itemPath);
    literal(value, "profileId", profileId, itemPath); literal(value, "caseId", caseId, itemPath); literal(value, "scenario", "combined", itemPath);
    const declarations = exactArray(field(value, "declarationPaths"), `${itemPath}/declarationPaths`);
    if (!declarations.length || declarations.some((entry) => typeof entry !== "string" || !canonicalPath(entry))) integrityFail(`${itemPath}/declarationPaths`, declarations, "non-empty canonical absolute RFC 6901 paths");
    const observedPaths = exactArray(field(value, "observedOutputPaths"), `${itemPath}/observedOutputPaths`);
    const observedDifferences = exactArray(field(value, "observedDifferences"), `${itemPath}/observedDifferences`).map((entry, i) => verifyDifference(entry, `${itemPath}/observedDifferences/${i}`));
    const differencePaths = observedDifferences.map((entry) => field(entry, "path"));
    if (!isDeepStrictEqual(observedPaths, differencePaths)) integrityFail(`${itemPath}/observedOutputPaths`, observedPaths, differencePaths);
    for (const observedPath of observedPaths) { if (typeof observedPath !== "string" || !canonicalPath(observedPath) || owned.has(observedPath)) integrityFail(`${itemPath}/observedOutputPaths`, observedPath, "unique canonical absolute RFC 6901 path"); owned.add(observedPath); }
    exactRecord(field(value, "mechanismLedger"), ["admitted", "applied", "ignored", "rejected"], `${itemPath}/mechanismLedger`); differences.push(...observedDifferences);
  }
  return differences;
}
function verifyObservation(raw: unknown, path: string, kind: string, profileId: string, caseId: string): UnknownRecord {
  const value = exactRecord(raw, ["version", "kind", "profileId", "caseId", "scenario", "hashes", "activatedDeclarationPaths", "compatibilityLedger", "nativeStateHasCompatibilityProperties", "comparisonSurface"], path);
  literal(value, "version", "domain-model-differential-observation-v1", path); literal(value, "kind", kind, path); literal(value, "profileId", profileId, path); literal(value, "caseId", caseId, path); literal(value, "scenario", "combined", path); literal(value, "nativeStateHasCompatibilityProperties", false, path);
  exactRecord(field(value, "hashes"), ["sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash"], `${path}/hashes`); exactArray(field(value, "activatedDeclarationPaths"), `${path}/activatedDeclarationPaths`); exactArray(field(value, "compatibilityLedger"), `${path}/compatibilityLedger`); return value;
}
function verifyM1DReport(raw: unknown, profileId: string, caseId: string, path: string): UnknownRecord {
  const report = exactRecord(raw, ["version", "legacyReference", "pureNative", "compatibilityEffectiveCandidate", "counterfactuals", "comparatorA", "comparatorB", "reportHash"], path);
  literal(report, "version", "domain-model-differential-report-v1", path); verifyObservation(field(report, "legacyReference"), `${path}/legacyReference`, "legacy-reference", profileId, caseId); verifyObservation(field(report, "pureNative"), `${path}/pureNative`, "pure-native", profileId, caseId); verifyObservation(field(report, "compatibilityEffectiveCandidate"), `${path}/compatibilityEffectiveCandidate`, "compatibility-effective", profileId, caseId);
  exactArray(field(report, "counterfactuals"), `${path}/counterfactuals`).forEach((entry, i) => verifyObservation(entry, `${path}/counterfactuals/${i}`, "compatibility-counterfactual", profileId, caseId));
  const a = exactRecord(field(report, "comparatorA"), ["comparator", "status", "ok", "discrepancies"], `${path}/comparatorA`); literal(a, "comparator", "legacy-vs-compatibility-effective-v1", `${path}/comparatorA`); literal(a, "status", "pass", `${path}/comparatorA`); literal(a, "ok", true, `${path}/comparatorA`); const aDiscrepancies = exactArray(field(a, "discrepancies"), `${path}/comparatorA/discrepancies`); if (aDiscrepancies.length) integrityFail(`${path}/comparatorA/discrepancies`, aDiscrepancies, []);
  const b = exactRecord(field(report, "comparatorB"), ["comparator", "status", "primaryDifferences", "attributions", "discrepancies"], `${path}/comparatorB`); literal(b, "comparator", "pure-native-vs-full-compatibility-effective-v1", `${path}/comparatorB`); literal(b, "status", "pass", `${path}/comparatorB`); const bDiscrepancies = exactArray(field(b, "discrepancies"), `${path}/comparatorB/discrepancies`); if (bDiscrepancies.length) integrityFail(`${path}/comparatorB/discrepancies`, bDiscrepancies, []);
  const primary = exactArray(field(b, "primaryDifferences"), `${path}/comparatorB/primaryDifferences`).map((entry, i) => verifyDifference(entry, `${path}/comparatorB/primaryDifferences/${i}`));
  const attributed = verifyAttributionContent(field(b, "attributions"), `${path}/comparatorB/attributions`, profileId, caseId).slice().sort((x, y) => compareCodeUnits(String(field(x, "path")), String(field(y, "path"))));
  const sortedPrimary = [...primary].sort((x, y) => compareCodeUnits(String(field(x, "path")), String(field(y, "path")))); if (!isDeepStrictEqual(attributed, sortedPrimary)) integrityFail(`${path}/comparatorB/attributions`, attributed, sortedPrimary);
  const content = { version: field(report, "version"), legacyReference: field(report, "legacyReference"), pureNative: field(report, "pureNative"), compatibilityEffectiveCandidate: field(report, "compatibilityEffectiveCandidate"), counterfactuals: field(report, "counterfactuals"), comparatorA: field(report, "comparatorA"), comparatorB: field(report, "comparatorB") };
  const expectedReportHash = hashDifferentialReportContent(content); const observedReportHash = stringField(report, "reportHash", path);
  if (expectedReportHash !== observedReportHash) integrityFail(`${path}/reportHash`, observedReportHash, expectedReportHash); return report;
}
function verifyWitness(raw: unknown, profile: UnknownRecord, profileIndex: number, witnessIndex: number): unknown[] {
  const path = `/profiles/${profileIndex}/curveFallbackWitnesses/${witnessIndex}`; const witness = exactRecord(raw, WITNESS_FIELDS, path);
  literal(witness, "version", "legacy-curve-fallback-witness-v1", path); literal(witness, "profileId", field(profile, "profileId"), path); literal(witness, "trigger", witnessIndex ? "unsupported-curve-discriminant" : "missing-curve-configuration", path); literal(witness, "declarationPath", "/compatibility/curveFallbackDeclaration", path); literal(witness, "policyId", "legacy-neutral-multiplier-v1", path); literal(witness, "parameterKey", PROFILE_PARAMETER_KEYS[profileIndex], path);
  for (const key of ["sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash"]) literal(witness, key, field(profile, key), path);
  literal(witness, "expectedMultiplier", 1, path); const actual = field(witness, "actualMultiplier"); if (typeof actual !== "number" || !Number.isFinite(actual)) integrityFail(`${path}/actualMultiplier`, actual, "finite number");
  const discrepancies = exactArray(field(witness, "discrepancies"), `${path}/discrepancies`); if (actual === 1) { literal(witness, "status", "pass", path); if (discrepancies.length) integrityFail(`${path}/discrepancies`, discrepancies, []); } else { literal(witness, "status", "fail", path); if (discrepancies.length !== 1) integrityFail(`${path}/discrepancies`, discrepancies.length, 1); const owned = exactRecord(discrepancies[0], ["path", "left", "right", "kind"], `${path}/discrepancies/0`); literal(owned, "path", `${path}/actualMultiplier`, path); literal(owned, "left", actual, path); literal(owned, "right", 1, path); literal(owned, "kind", "curve-fallback-mismatch", path); }
  return discrepancies;
}
function verifySustain(raw: unknown, profileId: string, path: string): void {
  const municipal = profileId === "legacy-municipal-v1"; const sustain = exactRecord(raw, municipal ? ["declarationPath", "status", "historicalMechanismObserved", "hashBoundValue"] : ["declarationPath", "status", "historicalMechanismObserved", "hashBoundValue", "execution", "claim"], path);
  if (municipal) { literal(sustain, "declarationPath", null, path); literal(sustain, "status", "ineligible-no-declaration", path); literal(sustain, "historicalMechanismObserved", false, path); literal(sustain, "hashBoundValue", "absent", path); } else { literal(sustain, "declarationPath", "/compatibility/sustainThresholdDisposition", path); literal(sustain, "status", "excluded-no-authoritative-value", path); literal(sustain, "historicalMechanismObserved", true, path); literal(sustain, "hashBoundValue", "absent", path); literal(sustain, "execution", "forbidden", path); literal(sustain, "claim", "excluded-from-final-equivalence", path); }
}
function verifyDiscrepancies(raw: unknown): UnknownRecord[] {
  const list = exactArray(raw, "/discrepancies"); const paths = new Set<string>(); let previous: string | undefined;
  return list.map((item, index) => { const path = `/discrepancies/${index}`; const value = exactRecord(item, ["path", "left", "right", "kind"], path); const ownedPath = stringField(value, "path", path); if (!canonicalPath(ownedPath) || paths.has(ownedPath)) integrityFail(`${path}/path`, ownedPath, "unique canonical absolute RFC 6901 path"); if (previous !== undefined && compareCodeUnits(previous, ownedPath) > 0) integrityFail(`${path}/path`, ownedPath, `path ordered at or after ${previous}`); const kind = field(value, "kind"); if (kind !== "curve-fallback-mismatch" && kind !== "sustain-binding-mismatch" && kind !== "final-report-integrity-error") integrityFail(`${path}/kind`, kind, "closed M1E discrepancy kind"); paths.add(ownedPath); previous = ownedPath; return value; });
}

function verifyFinalReportContentV1(raw: unknown): asserts raw is FinalReportContentV1 {
  const content = exactRecord(raw, CONTENT_FIELDS, ""); literal(content, "version", "domain-model-final-equivalence-report-v1", "");
  const profiles = exactArray(field(content, "profiles"), "/profiles"); if (profiles.length !== 3) integrityFail("/profiles", profiles.length, 3); const profileIds = new Set<string>(); const owned: unknown[] = [];
  for (const [index, rawProfile] of profiles.entries()) { const path = `/profiles/${index}`; const profile = exactRecord(rawProfile, PROFILE_FIELDS, path); literal(profile, "profileId", PROFILE_ORDER[index], path); const profileId = stringField(profile, "profileId", path); if (profileIds.has(profileId)) integrityFail(`${path}/profileId`, profileId, "unique profile ID"); profileIds.add(profileId); for (const key of ["domainId", "modelVersion", "calibrationVersion", "sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash"]) stringField(profile, key, path); literal(profile, "coverageKind", "isolated-synthetic-legacy-runtime-witness-v1", path); const witnesses = exactArray(field(profile, "curveFallbackWitnesses"), `${path}/curveFallbackWitnesses`); if (witnesses.length !== 2) integrityFail(`${path}/curveFallbackWitnesses`, witnesses.length, 2); witnesses.forEach((witness, witnessIndex) => owned.push(...verifyWitness(witness, profile, index, witnessIndex))); verifySustain(field(profile, "sustain"), profileId, `${path}/sustain`); }
  const cases = exactArray(field(content, "cases"), "/cases"); if (cases.length !== 6) integrityFail("/cases", cases.length, 6); const caseIds = new Set<string>();
  for (const [index, rawCase] of cases.entries()) { const path = `/cases/${index}`; const value = exactRecord(rawCase, CASE_FIELDS, path); const profileId = PROFILE_ORDER[Math.floor(index / 2)]; const caseId = `${profileId}-${FIXTURE_KINDS[index % 2]}-v1`; literal(value, "profileId", profileId, path); literal(value, "caseId", caseId, path); literal(value, "scenario", "combined", path); if (caseIds.has(caseId)) integrityFail(`${path}/caseId`, caseId, "unique case ID"); caseIds.add(caseId); const m1d = verifyM1DReport(field(value, "m1dReport"), profileId, caseId, `${path}/m1dReport`); literal(value, "m1dReportHash", field(m1d, "reportHash"), path); literal(value, "legacyObservationHash", hashBaselineValueV1(field(m1d, "legacyReference")), path); literal(value, "pureNativeObservationHash", hashBaselineValueV1(field(m1d, "pureNative")), path); literal(value, "compatibilityEffectiveObservationHash", hashBaselineValueV1(field(m1d, "compatibilityEffectiveCandidate")), path); const a = exactRecord(field(m1d, "comparatorA"), ["comparator", "status", "ok", "discrepancies"], path); const b = exactRecord(field(m1d, "comparatorB"), ["comparator", "status", "primaryDifferences", "attributions", "discrepancies"], path); literal(value, "comparatorAHash", hashBaselineValueV1(a), path); literal(value, "comparatorAStatus", "pass", path); literal(value, "comparatorBHash", hashBaselineValueV1(b), path); literal(value, "comparatorBStatus", "pass", path); const observedPrimary = field(value, "primaryDifferences"); const expectedPrimary = field(b, "primaryDifferences"); if (!isDeepStrictEqual(observedPrimary, expectedPrimary)) integrityFail(`${path}/primaryDifferences`, observedPrimary, expectedPrimary); const observedAttributions = field(value, "attributions"); const expectedAttributions = field(b, "attributions"); if (!isDeepStrictEqual(observedAttributions, expectedAttributions)) integrityFail(`${path}/attributions`, observedAttributions, expectedAttributions); const combined = [...exactArray(field(a, "discrepancies"), path), ...exactArray(field(b, "discrepancies"), path)]; const embeddedDiscrepancies = field(value, "m1dDiscrepancies"); if (!isDeepStrictEqual(embeddedDiscrepancies, combined)) integrityFail(`${path}/m1dDiscrepancies`, embeddedDiscrepancies, combined); }
  const discrepancies = verifyDiscrepancies(field(content, "discrepancies")); if (!isDeepStrictEqual(discrepancies, owned)) integrityFail("/discrepancies", discrepancies, owned); literal(content, "status", discrepancies.length ? "fail-v1" : "pass-declared-contract-surface-v1", "");
}
function verifyFinalReportV1(raw: unknown): asserts raw is DomainModelFinalEquivalenceReportV1 {
  const report = exactRecord(raw, REPORT_FIELDS, ""); const content = { version: field(report, "version"), profiles: field(report, "profiles"), cases: field(report, "cases"), status: field(report, "status"), discrepancies: field(report, "discrepancies") }; verifyFinalReportContentV1(content); const observedHash = field(report, "reportHash"); const expectedHash = hashBaselineValueV1(content); if (observedHash !== expectedHash) integrityFail("/reportHash", observedHash, expectedHash); if (!recursivelyFrozen(raw)) integrityFail("", Object.isFrozen(raw), true);
}

export function hashFinalEquivalenceReportContentV1(value: FinalReportContentV1): string {
  if (isRecord(value) && Object.getOwnPropertyNames(value).includes("reportHash")) {
    verifyFinalReportV1(value);
    return value.reportHash;
  }
  verifyFinalReportContentV1(value);
  return hashBaselineValueV1(value);
}
export function runDomainModelFinalEquivalenceV1(input: unknown): DomainModelFinalEquivalenceReportV1 {
  const root = exactRecord(input, ["envelopes", "fixtures"], ""); const envelopes = exactArray(field(root, "envelopes"), "/envelopes"); const fixtures = exactArray(field(root, "fixtures"), "/fixtures"); if (envelopes.length !== 3) fail("exactly three profile envelopes are required"); if (fixtures.length !== 6) fail("exactly six M0B fixtures are required"); const profiles: FinalEquivalenceProfileEvidenceV1[] = []; const cases: FinalEquivalenceCaseEvidenceV1[] = []; const discrepancies: FinalEquivalenceDiscrepancyV1[] = [];
  for (const [profileIndex, profileId] of PROFILE_ORDER.entries()) { const envelope = verifyEnvelope(envelopes[profileIndex], profileId); const witnesses = envelope.compatibility.curveFallbackDeclaration.appliesTo.map((trigger, witnessIndex) => curveWitness(envelope, trigger, profileIndex, witnessIndex)); const sustain = sustainEvidence(envelope, profileIndex); discrepancies.push(...witnesses.flatMap((witness) => witness.discrepancies), ...sustain.discrepancies); profiles.push(detachedFrozen({ profileId, domainId: envelope.source.identity.domainId, modelVersion: envelope.source.identity.modelVersion, calibrationVersion: envelope.source.identity.calibrationVersion, sourceSemanticPayloadHash: envelope.source.semanticPayloadHash, projectedSemanticPayloadHash: envelope.projection.semanticPayloadHash, compatibilityDeclarationsHash: envelope.compatibility.declarationsHash, envelopeHash: hashLegacyProfileProjectionEnvelopeV1(envelope), coverageKind: "isolated-synthetic-legacy-runtime-witness-v1" as const, curveFallbackWitnesses: [witnesses[0], witnesses[1]], sustain: sustain.evidence })); for (const [kindIndex, kind] of FIXTURE_KINDS.entries()) cases.push(caseEvidence(envelope, verifyFixture(fixtures[profileIndex * 2 + kindIndex], profileId, kind))); }
  discrepancies.sort((a, b) => compareCodeUnits(a.path, b.path)); const content: FinalReportContentV1 = detachedFrozen({ version: "domain-model-final-equivalence-report-v1" as const, profiles, cases, status: discrepancies.length ? "fail-v1" as const : "pass-declared-contract-surface-v1" as const, discrepancies }); verifyFinalReportContentV1(content); const report = detachedFrozen({ ...content, reportHash: hashFinalEquivalenceReportContentV1(content) }); verifyFinalReportV1(report); return report;
}
