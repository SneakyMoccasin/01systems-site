import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalizeBaselineValueV1 } from "../baselineCanonicalizationV1";
import { parseEngineBaselineInputFixtureV1, runEngineBaselineFixtureV1 } from "../engineOutputProjectionV1";
import { hashDomainModelContractSemanticIdentityV1 } from "../domainModelContractV1/domainModelContractSemanticIdentityV1";
import { parseDomainModelContractV1 } from "../domainModelContractV1/parseDomainModelContractV1";
import { parseDomainModelContractV1Structure } from "../domainModelContractV1/parseDomainModelContractV1Structure";
import { validateDomainModelContractV1Semantics } from "../domainModelContractV1/validateDomainModelContractV1Semantics";
import { verifyLegacyProfileProjectionEnvelopeV1Hashes } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import { parseLegacyProfileProjectionEnvelopeV1Structure, parseLegacyProfileProjectionEnvelopeV1StructureJson } from "../domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "../domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics";
import {
  buildLegacyCompatibilityExecutionPlanV1,
  admitActionOccurrenceV1,
  projectNativeSourceCaseV1,
  PROPAGATION_DECLARATION_PATH,
  REGISTRY_DECLARATION_PREFIX,
  type NativeSourceCaseProjectionV1,
} from "./buildLegacyCompatibilityExecutionPlanV1";
import {
  compareCompatibilityNormalizedLegacyEngineCoreV1,
  compareLegacyToCompatibilityEffective,
  detachedFrozen,
  hashDifferentialReportContent,
  verifyAdapterReportDiscrepanciesV1,
  verifyCompatibilityDiscrepanciesV1,
  verifyNativeExecutionDiscrepanciesV1,
  type ActionAdmissionAttributionResultV1,
  type CompatibilityDeclarationCounterfactualV1,
  type DifferentialObservationV1,
  type FullCompatibilityComparatorV1,
} from "./differentialExecutionV1";
import * as differentialExecutionV1 from "./differentialExecutionV1";
import {
  executeAdmittedCompatibilityActionV1,
  executeCompatibilityPropagationWitnessV1,
  executeDerivedRegistryCounterfactualsV1,
  executeImmediateVisibilityWitnessV1,
  executePureNativeProjectionV1,
  evaluateSustainThresholdV1,
} from "./executeVerifiedNativeProjectionV1";
import { comparePureNativeToCompatibilityEffective, verifyActionAttributionBindingV1 } from "./runCompatibilityCounterfactualV1";
import { runActionAdmissionDifferentialV1, runDomainModelDifferentialV1 } from "./runDomainModelDifferentialV1";

const envelopeText = readFileSync(new URL("../domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json", import.meta.url), "utf8");
const fixtureText = readFileSync(new URL("../fixtures/engine-baseline-input-v1/legacy-real-estate-v1-neutral.json", import.meta.url), "utf8");
const registryKeys = ["RefinancingConstraint", "LiquidityConstraint", "CovenantConstraint", "Custom"] as const;
const compatibilityKeys = registryKeys.slice(1);
const scenarios = ["scenarioA", "scenarioB", "baseline"] as const;

type MutableRawEnvelope = {
  compatibility: {
    declarationsHash: string;
    propagation: {
      executionSemantics?: { eventPolicy: { delaySteps: number } };
      compatibilityOnlyEdges: Array<{ triggerPredicate: string }>;
      implicitNode: null | { scoreMaterialization: string };
      sourceEvaluationOrder: unknown[];
    };
    legacyRegistryProjection: { entries: unknown[] };
  };
};

function rawEnvelope(): MutableRawEnvelope {
  return JSON.parse(envelopeText) as MutableRawEnvelope;
}

function verifiedEnvelope(): HashVerifiedLegacyProfileProjectionEnvelopeV1 {
  const structural = parseLegacyProfileProjectionEnvelopeV1StructureJson(envelopeText);
  assert.equal(structural.ok, true);
  if (!structural.ok) throw new Error("structural verification failed");
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) throw new Error("semantic verification failed");
  const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
  assert.equal(verified.ok, true);
  if (!verified.ok) throw new Error("hash verification failed");
  return verified.value;
}

function verifiedProfileEnvelope(profileId: "legacy-real-estate-v1" | "legacy-municipal-v1" | "legacy-consulting-v1"): HashVerifiedLegacyProfileProjectionEnvelopeV1 {
  const text = readFileSync(new URL(`../domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`, import.meta.url), "utf8");
  const structural = parseLegacyProfileProjectionEnvelopeV1StructureJson(text);
  assert.equal(structural.ok, true);
  if (!structural.ok) throw new Error("structural verification failed");
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) throw new Error("semantic verification failed");
  const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
  assert.equal(verified.ok, true);
  if (!verified.ok) throw new Error("hash verification failed");
  return verified.value;
}

function neutralFixture(profileId: "legacy-real-estate-v1" | "legacy-municipal-v1" | "legacy-consulting-v1") {
  return parseEngineBaselineInputFixtureV1(JSON.parse(readFileSync(new URL(`../fixtures/engine-baseline-input-v1/${profileId}-neutral.json`, import.meta.url), "utf8")));
}

function fixture() {
  return parseEngineBaselineInputFixtureV1(JSON.parse(fixtureText));
}

function stressedFixture(profileId: "legacy-real-estate-v1" | "legacy-municipal-v1" | "legacy-consulting-v1") {
  return parseEngineBaselineInputFixtureV1(JSON.parse(readFileSync(new URL(`../fixtures/engine-baseline-input-v1/${profileId}-stressed-scheduled.json`, import.meta.url), "utf8")));
}

function comparatorAuthority() {
  const envelope = verifiedEnvelope();
  return { envelope, sourceCase: projectNativeSourceCaseV1(envelope, fixture()) };
}

function actionOutputSurface(value: unknown): unknown {
  const surface = value as Readonly<{ scenarioA: unknown; scenarioB: unknown; baseline: unknown; comparison: unknown }>;
  return detachedFrozen({ scenarioA: surface.scenarioA, scenarioB: surface.scenarioB, baseline: surface.baseline, comparison: surface.comparison });
}

function fullActionComparatorHarness() {
  const envelope = verifiedEnvelope();
  const source = neutralFixture("legacy-real-estate-v1");
  const sourceCase = projectNativeSourceCaseV1(envelope, source);
  const entry = envelope.compatibility.actionAdmission.entries.find((candidate) => candidate.sourceActionId === "increase_liquidity_buffer");
  if (!entry) throw new Error("action entry missing");
  const occurrence = detachedFrozen({
    profileId: source.profileId,
    scenario: "scenarioA" as const,
    sourceActionId: entry.sourceActionId,
    scheduledStep: 1,
    canonicalSourceEffects: [...entry.retainedEffects, ...entry.ignoredEffects]
      .map(({ sourceDriverId, delta }) => ({ sourceDriverId, delta }))
      .sort((left, right) => left.sourceDriverId < right.sourceDriverId ? -1 : left.sourceDriverId > right.sourceDriverId ? 1 : 0),
  });
  const admitted = admitActionOccurrenceV1({ envelope, occurrence, horizon: source.horizon, duplicate: false, observationKind: "compatibility-effective-native" });
  if ("outcome" in admitted) throw new Error("action admission unexpectedly rejected");
  const ordinary = runDomainModelDifferentialV1({ envelope, fixture: source });
  const executed = executeAdmittedCompatibilityActionV1({ envelope, sourceCase, admitted });
  const pureNative = detachedFrozen({ ...ordinary.pureNative, comparisonSurface: actionOutputSurface(ordinary.pureNative.comparisonSurface) });
  const compatibilityEffective = detachedFrozen({
    ...ordinary.compatibilityEffectiveCandidate,
    activatedDeclarationPaths: executed.activatedDeclarationPaths,
    compatibilityLedger: executed.compatibilityLedger,
    comparisonSurface: actionOutputSurface(executed.comparisonSurface),
  });
  const counterfactuals = ordinary.counterfactuals.map((counterfactual) => detachedFrozen({ ...counterfactual, comparisonSurface: actionOutputSurface(counterfactual.comparisonSurface) }));
  const correct = runActionAdmissionDifferentialV1({ envelope, fixture: source, sourceActionId: entry.sourceActionId, scheduledStep: 1 }).actionAdmissionAttribution;
  const compare = (actionAttribution: ActionAdmissionAttributionResultV1) => comparePureNativeToCompatibilityEffective({
    envelope,
    sourceCase,
    pureNative,
    compatibilityEffective,
    counterfactuals,
    actionAttribution,
    actionOccurrence: { sourceActionId: entry.sourceActionId, scheduledStep: 1 },
  });
  return { correct, compare };
}

function assertDeepFrozen(value: unknown): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

function assertNoKey(value: unknown, forbidden: string): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.prototype.hasOwnProperty.call(value, forbidden), false);
  for (const child of Object.values(value)) assertNoKey(child, forbidden);
}

function mutableSurface(observation: DifferentialObservationV1): Record<string, unknown> {
  return structuredClone(observation.comparisonSurface) as Record<string, unknown>;
}

function scenarioFrom(surface: Record<string, unknown>, scenario: typeof scenarios[number]) {
  return surface[scenario] as { trajectory: Array<{ registry: Record<string, Record<string, unknown>> }>; constraintHistory: Array<Record<string, Record<string, unknown>>>; terminalState: { registry: Record<string, Record<string, unknown>> } };
}

function expectStructuralIssue(mutate: (raw: MutableRawEnvelope) => void, code: string, path: string): void {
  const raw = rawEnvelope();
  mutate(raw);
  const result = parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === code && issue.path === path), JSON.stringify(result.issues));
}

function expectSemanticIssue(mutate: (raw: MutableRawEnvelope) => void, code: string, path: string): void {
  const raw = rawEnvelope();
  mutate(raw);
  const structural = parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok, true);
  if (!structural.ok) return;
  const result = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === code && issue.path === path), JSON.stringify(result.issues));
}

test("neutral RE produces three separate observations and exact full Comparator A parity", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  assert.equal(report.comparatorA.ok, true);
  assert.deepEqual(report.comparatorA.discrepancies, []);
  assert.equal(report.comparatorB.status, "pass");
  assert.notStrictEqual(report.legacyReference.comparisonSurface, report.pureNative.comparisonSurface);
  assert.notStrictEqual(report.pureNative.comparisonSurface, report.compatibilityEffectiveCandidate.comparisonSurface);
  assert.notStrictEqual(report.legacyReference.comparisonSurface, report.compatibilityEffectiveCandidate.comparisonSurface);
});

test("differential result ownership is compile-time closed and engine-core mismatch fails", () => {
  const full: FullCompatibilityComparatorV1 = {
    comparator: "pure-native-vs-full-compatibility-effective-v1",
    status: "pass",
    primaryDifferences: [],
    attributions: [],
    discrepancies: [],
  };
  const action: ActionAdmissionAttributionResultV1 = {
    comparator: "full-effective-with-action-vs-without-exact-action-declaration-v1",
    status: "pass",
    declarationPath: "/compatibility/actionAdmission/entries/0",
    outputDisposition: "unchanged",
    attributedDifferences: [],
    discrepancies: [],
  };
  const single: CompatibilityDeclarationCounterfactualV1 = {
    comparator: "single-declaration-leave-one-out-v1",
    status: "pass",
    declarationPath: action.declarationPath,
    before: {},
    after: {},
    attributedDifferences: [],
    discrepancies: [],
  };
  assert.deepEqual([full.status, action.status, single.status], ["pass", "pass", "pass"]);
  const mismatch = compareCompatibilityNormalizedLegacyEngineCoreV1({ value: 1 }, { value: 2 }, "sha256:test");
  assert.equal(mismatch.status, "fail");
  assert.equal(mismatch.comparator, "compatibility-normalized-legacy-engine-core-vs-native-effective-v1");
  if (false) {
    // @ts-expect-error action-local attribution cannot be represented as full Comparator B
    const invalidFull: FullCompatibilityComparatorV1 = action;
    // @ts-expect-error full Comparator B cannot be represented as a single-declaration result
    const invalidSingle: CompatibilityDeclarationCounterfactualV1 = full;
    // @ts-expect-error the engine-core status union is closed
    mismatch.status = "actual-legacy-runtime-parity";
    void invalidFull;
    void invalidSingle;
  }
});

test("legacy comparison surface is the complete unmodified legacy execution output", () => {
  const envelope = verifiedEnvelope();
  const source = fixture();
  const legacyOutput = runEngineBaselineFixtureV1(source);
  const report = runDomainModelDifferentialV1({ envelope, fixture: source });
  assert.deepEqual(report.legacyReference.comparisonSurface, legacyOutput);
  assert.deepEqual(Object.keys(report.legacyReference.comparisonSurface as Record<string, unknown>), Object.keys(legacyOutput));
  assert.deepEqual((report.legacyReference.comparisonSurface as { profileIdentity: unknown }).profileIdentity, {
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "legacy-global-v1",
  });
  assert.notDeepEqual(
    (report.legacyReference.comparisonSurface as { profileIdentity: unknown }).profileIdentity,
    envelope.projection.contract.identity
  );
});

test("pure-native boundary receives only a hash-verified native contract and projected source case", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const forbidden = new Set(["compatibility", "driverIdMappings", "legacyRegistryProjection", "executionSemantics", "compatibilityOnlyEdges", "sustainThresholdDisposition"]);
  const reads: string[] = [];
  const guardedContract = new Proxy(envelope.projection.contract, { get(target, key, receiver) { reads.push(String(key)); if (forbidden.has(String(key))) throw new Error(`forbidden ${String(key)}`); return Reflect.get(target, key, receiver); } });
  const guardedSource = new Proxy(sourceCase, { get(target, key, receiver) { reads.push(String(key)); if (forbidden.has(String(key))) throw new Error(`forbidden ${String(key)}`); return Reflect.get(target, key, receiver); } });
  const result = executePureNativeProjectionV1({ contract: guardedContract, sourceCase: guardedSource });
  assert.equal(Boolean(result.comparisonSurface), true);
  assert.equal(reads.some((key) => forbidden.has(key)), false);
  if (false) {
    // @ts-expect-error the pure-native API has no envelope admission surface
    executePureNativeProjectionV1({ envelope, contract: envelope.projection.contract, sourceCase });
  }
});

test("registry overlay is exact on trajectory, history, and terminal surfaces", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  const pure = mutableSurface(report.pureNative);
  const effective = mutableSurface(report.compatibilityEffectiveCandidate);
  for (const scenarioName of scenarios) {
    const pureScenario = scenarioFrom(pure, scenarioName);
    const effectiveScenario = scenarioFrom(effective, scenarioName);
    for (let step = 0; step < fixture().horizon; step += 1) {
      assert.deepEqual(Object.keys(pureScenario.trajectory[step].registry), ["RefinancingConstraint"]);
      assert.deepEqual(Object.keys(effectiveScenario.trajectory[step].registry), registryKeys);
      assert.deepEqual(Object.keys(effectiveScenario.constraintHistory[step]), registryKeys);
    }
    assert.deepEqual(Object.keys(effectiveScenario.terminalState.registry), registryKeys);
  }
});

test("missing compatibility source is evaluated but never triggers or materializes", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const result = executeCompatibilityPropagationWitnessV1({ envelope, initialState: sourceCase.initialState });
  assert.equal(result.evaluatedEdgeIds.some((edgeId) => edgeId.includes("liquidity-pressure")), true);
  assert.equal(result.events.length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(result.state, "liquidity-pressure"), false);
});

test("raise materializes the implicit liquidity node at high with anchor score two", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const state: Record<string, { levelId: string; score: number }> = structuredClone(sourceCase.initialState);
  state["leverage-level-risk"] = { levelId: "high", score: 2 };
  const result = executeCompatibilityPropagationWitnessV1({ envelope, initialState: state });
  assert.deepEqual(result.state["liquidity-pressure"], { levelId: "high", score: 2 });
  assert.ok(result.events.some((event) => event.sourceRisk === "leverageLevelRisk" && event.targetRisk === "liquidityPressure"));
});

test("later compatibility occurrence sees the materialized node in the same iteration", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const state: Record<string, { levelId: string; score: number }> = structuredClone(sourceCase.initialState);
  state["leverage-level-risk"] = { levelId: "high", score: 2 };
  const result = executeImmediateVisibilityWitnessV1({ envelope, initialState: state });
  const materialize = result.events.find((event) => event.targetRisk === "liquidityPressure");
  const downstream = result.events.find((event) => event.sourceRisk === "liquidityPressure" && event.targetRisk === "capitalCommitmentRigidityRisk");
  assert.equal(materialize?.iteration, 1);
  assert.equal(downstream?.iteration, 1);
  assert.ok(result.events.indexOf(materialize!) < result.events.indexOf(downstream!));
});

test("full graph evaluates the later liquidity edge without a duplicate no-change event", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const state: Record<string, { levelId: string; score: number }> = structuredClone(sourceCase.initialState);
  state["leverage-level-risk"] = { levelId: "high", score: 2 };
  state["capital-commitment-rigidity-risk"] = { levelId: "high", score: 2 };
  const result = executeCompatibilityPropagationWitnessV1({ envelope, initialState: state });
  assert.equal(result.evaluatedEdgeIds.includes("legacy-compat-edge-v1.liquidity-pressure.to.capital-commitment-rigidity-risk"), true);
  assert.equal(result.events.some((event) => event.sourceRisk === "liquidityPressure" && event.targetRisk === "capitalCommitmentRigidityRisk"), false);
});

test("events carry exact legacy IDs, level, iteration, step, delay, and deterministic order", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const state: Record<string, { levelId: string; score: number }> = structuredClone(sourceCase.initialState);
  state["leverage-level-risk"] = { levelId: "severe", score: 3 };
  const first = executeCompatibilityPropagationWitnessV1({ envelope, initialState: state });
  const second = executeCompatibilityPropagationWitnessV1({ envelope, initialState: state });
  assert.deepEqual(first, second);
  assert.equal(first.events.length, 6);
  assert.deepEqual(first.events, [
    { step: 2, sourceRisk: "leverageLevelRisk", targetRisk: "liquidityPressure", level: "HIGH", iteration: 1, delaySteps: 1 },
    { step: 2, sourceRisk: "leverageLevelRisk", targetRisk: "capitalCommitmentRigidityRisk", level: "HIGH", iteration: 1, delaySteps: 1 },
    { step: 2, sourceRisk: "capitalCommitmentRigidityRisk", targetRisk: "operationalEfficiencyRisk", level: "HIGH", iteration: 1, delaySteps: 1 },
    { step: 2, sourceRisk: "capitalCommitmentRigidityRisk", targetRisk: "maintenanceIntensityRisk", level: "HIGH", iteration: 1, delaySteps: 1 },
    { step: 2, sourceRisk: "operationalEfficiencyRisk", targetRisk: "tenantStabilityRisk", level: "HIGH", iteration: 1, delaySteps: 1 },
    { step: 2, sourceRisk: "tenantStabilityRisk", targetRisk: "demandRisk", level: "HIGH", iteration: 1, delaySteps: 1 },
  ]);
});

test("Comparator A reports exact RFC 6901 path and both concrete values", () => {
  const envelope = verifiedEnvelope();
  const report = runDomainModelDifferentialV1({ envelope, fixture: fixture() });
  const surface = mutableSurface(report.legacyReference);
  scenarioFrom(surface, "scenarioA").trajectory[0].registry.LiquidityConstraint.lifecycle = "ACTIVE";
  const legacy = detachedFrozen({ ...report.legacyReference, comparisonSurface: surface });
  const result = compareLegacyToCompatibilityEffective({ envelope, legacy, pureNative: report.pureNative, effective: report.compatibilityEffectiveCandidate, comparatorB: report.comparatorB });
  assert.equal(result.ok, false);
  assert.deepEqual(result.discrepancies[0], {
    path: "/comparisonSurface/scenarioA/trajectory/0/registry/LiquidityConstraint/lifecycle",
    left: "ACTIVE",
    right: "INACTIVE",
    classification: "unresolved-design-decision",
  });
});

test("Comparator B uses real before/after paths with unique internally derived attribution", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  assert.equal(report.comparatorB.status, "pass");
  assert.equal(report.comparatorB.attributions.length, 3);
  const paths = report.comparatorB.attributions.flatMap((attribution, index) => {
    assert.deepEqual(attribution.declarationPaths, [`${REGISTRY_DECLARATION_PREFIX}${index}`]);
    assert.equal(attribution.observedOutputPaths.every((path) => path.includes(`/${compatibilityKeys[index]}`)), true);
    assert.deepEqual(attribution.observedDifferences.map((entry) => entry.path), attribution.observedOutputPaths);
    for (const difference of attribution.observedDifferences) {
      assert.deepEqual(difference.before, { presence: "absent" });
      assert.equal(typeof difference.after, "object");
    }
    return attribution.observedOutputPaths;
  });
  assert.equal(new Set(paths).size, paths.length);
  const ledgerOnly = detachedFrozen({ ...report.pureNative, kind: "compatibility-counterfactual" as const, activatedDeclarationPaths: [`${REGISTRY_DECLARATION_PREFIX}0`], compatibilityLedger: report.counterfactuals[0].compatibilityLedger });
  const rejected = comparePureNativeToCompatibilityEffective({ ...comparatorAuthority(), pureNative: report.pureNative, compatibilityEffective: ledgerOnly, counterfactuals: [ledgerOnly] });
  assert.equal(rejected.status, "fail");
});

test("Comparator B rejects fabricated surfaces and changed nested values exactly", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  const declarationPath = `${REGISTRY_DECLARATION_PREFIX}0`;
  const ledger = [{ declarationPath, status: "applied" as const, mechanism: "test-derived-registry-effect", sourceId: "LiquidityConstraint", nativeId: "legacy-registry-entry-v1.liquidity-constraint", executionStep: 0 }];
  const pureNative = detachedFrozen({ ...report.pureNative, comparisonSurface: { witness: {} } });
  const compatibilityEffective = detachedFrozen({
    ...report.compatibilityEffectiveCandidate,
    activatedDeclarationPaths: [declarationPath],
    comparisonSurface: { witness: { value: { alpha: 1, nested: { left: 2, right: 3 } } } },
  });
  const reordered = detachedFrozen({
    ...report.counterfactuals[0],
    activatedDeclarationPaths: [declarationPath],
    compatibilityLedger: ledger,
    comparisonSurface: { witness: { value: { nested: { right: 3, left: 2 }, alpha: 1 } } },
  });
  const accepted = comparePureNativeToCompatibilityEffective({ ...comparatorAuthority(), pureNative, compatibilityEffective, counterfactuals: [reordered] });
  assert.equal(accepted.status, "fail");

  const changed = detachedFrozen({
    ...reordered,
    comparisonSurface: { witness: { value: { nested: { right: 4, left: 2 }, alpha: 1 } } },
  });
  const rejected = comparePureNativeToCompatibilityEffective({ ...comparatorAuthority(), pureNative, compatibilityEffective, counterfactuals: [changed] });
  assert.equal(rejected.status, "fail");
  const changedValue = rejected.discrepancies.find((entry) => entry.path === "/comparisonSurface/witness/value");
  assert.deepEqual(changedValue, {
    path: "/comparisonSurface/witness/value",
    left: { before: { presence: "absent" }, after: { alpha: 1, nested: { left: 2, right: 3 } } },
    right: { before: { presence: "absent" }, after: { nested: { right: 4, left: 2 }, alpha: 1 } },
    classification: "compatibility-rule",
  });
  const comparatorSource = readFileSync(new URL("./runCompatibilityCounterfactualV1.ts", import.meta.url), "utf8");
  assert.doesNotMatch(comparatorSource, /JSON\.stringify/);
});

test("full Comparator B mechanically rejects gaps, collisions, collateral paths, and wrong action values", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  const compare = (counterfactuals: readonly DifferentialObservationV1[], actionAttribution?: ActionAdmissionAttributionResultV1) =>
    comparePureNativeToCompatibilityEffective({
      ...comparatorAuthority(),
      pureNative: report.pureNative,
      compatibilityEffective: report.compatibilityEffectiveCandidate,
      counterfactuals,
      ...(actionAttribution ? { actionAttribution } : {}),
    });

  assert.equal(compare(report.counterfactuals.slice(1)).status, "fail");
  assert.equal(compare([...report.counterfactuals, report.counterfactuals[0]]).status, "fail");

  const collateralSurface = mutableSurface(report.counterfactuals[0]);
  collateralSurface.collateral = true;
  const collateral = detachedFrozen({ ...report.counterfactuals[0], comparisonSurface: collateralSurface });
  assert.equal(compare([collateral, ...report.counterfactuals.slice(1)]).status, "fail");

  const propagationChangedSurface = mutableSurface(report.counterfactuals[0]);
  const propagationScenario = scenarioFrom(propagationChangedSurface, "scenarioA");
  propagationScenario.trajectory[0].registry.RefinancingConstraint.lifecycle = "ALTERED";
  const propagationChanged = detachedFrozen({ ...report.counterfactuals[0], comparisonSurface: propagationChangedSurface });
  assert.equal(compare([propagationChanged, ...report.counterfactuals.slice(1)]).status, "fail");

  const provenancePath = `${REGISTRY_DECLARATION_PREFIX}0`;
  const provenanceLedger = [{ declarationPath: provenancePath, status: "applied" as const, mechanism: "test-only-provenance", sourceId: null, nativeId: null, executionStep: 0 }];
  const provenanceOnly = detachedFrozen({
    ...report.pureNative,
    kind: "compatibility-counterfactual" as const,
    activatedDeclarationPaths: [provenancePath],
    compatibilityLedger: provenanceLedger,
    comparisonSurface: { ...(report.pureNative.comparisonSurface as Record<string, unknown>), executionProvenance: [{ declarationPath: provenancePath }] },
  });
  const provenanceEffective = detachedFrozen({ ...provenanceOnly, kind: "compatibility-effective" as const });
  assert.equal(comparePureNativeToCompatibilityEffective({ ...comparatorAuthority(), pureNative: report.pureNative, compatibilityEffective: provenanceEffective, counterfactuals: [provenanceOnly] }).status, "fail");

  const primary = report.comparatorB.primaryDifferences[0];
  const wrongBefore: ActionAdmissionAttributionResultV1 = detachedFrozen({
    comparator: "full-effective-with-action-vs-without-exact-action-declaration-v1",
    status: "pass",
    declarationPath: report.compatibilityEffectiveCandidate.activatedDeclarationPaths[0],
    outputDisposition: "changed",
    attributedDifferences: [{ ...primary, before: { wrong: "before" } }],
    discrepancies: [],
  });
  const wrongAfter: ActionAdmissionAttributionResultV1 = detachedFrozen({
    ...wrongBefore,
    attributedDifferences: [{ ...primary, after: { wrong: "after" } }],
  });
  assert.equal(compare(report.counterfactuals, wrongBefore).status, "fail");
  assert.equal(compare(report.counterfactuals, wrongAfter).status, "fail");
});

test("Comparator B binds every evidence owner to the hash-verified plan and action entry", () => {
  const envelope = verifiedEnvelope();
  const source = fixture();
  const sourceCase = projectNativeSourceCaseV1(envelope, source);
  const report = runDomainModelDifferentialV1({ envelope, fixture: source });
  const compare = (counterfactuals: readonly DifferentialObservationV1[]) => comparePureNativeToCompatibilityEffective({
    envelope,
    sourceCase,
    pureNative: report.pureNative,
    compatibilityEffective: report.compatibilityEffectiveCandidate,
    counterfactuals,
  });
  const registry = report.counterfactuals.filter((entry) => entry.activatedDeclarationPaths[0].startsWith(REGISTRY_DECLARATION_PREFIX));
  assert.equal(registry.length, 3);

  const swapOwners = (left: DifferentialObservationV1, right: DifferentialObservationV1) => detachedFrozen({
    ...left,
    activatedDeclarationPaths: right.activatedDeclarationPaths,
    compatibilityLedger: right.compatibilityLedger,
  });
  assert.equal(compare([swapOwners(registry[0], registry[1]), swapOwners(registry[1], registry[0]), registry[2]]).status, "fail");

  const liquidityWithCustomOutput = detachedFrozen({ ...registry[0], comparisonSurface: registry[2].comparisonSurface });
  assert.equal(compare([liquidityWithCustomOutput, registry[1], registry[2]]).status, "fail");

  const stressed = stressedFixture("legacy-real-estate-v1");
  const stressedCase = projectNativeSourceCaseV1(envelope, stressed);
  const stressedReport = runDomainModelDifferentialV1({ envelope, fixture: stressed });
  const propagation = stressedReport.counterfactuals.find((entry) => entry.activatedDeclarationPaths[0] === PROPAGATION_DECLARATION_PATH);
  const stressedRegistry = stressedReport.counterfactuals.find((entry) => entry.activatedDeclarationPaths[0].startsWith(REGISTRY_DECLARATION_PREFIX));
  assert.ok(propagation);
  assert.ok(stressedRegistry);
  const compareStressed = (counterfactuals: readonly DifferentialObservationV1[]) => comparePureNativeToCompatibilityEffective({
    envelope,
    sourceCase: stressedCase,
    pureNative: stressedReport.pureNative,
    compatibilityEffective: stressedReport.compatibilityEffectiveCandidate,
    counterfactuals,
  });
  const propagationAsRegistry = detachedFrozen({ ...propagation, activatedDeclarationPaths: stressedRegistry.activatedDeclarationPaths, compatibilityLedger: stressedRegistry.compatibilityLedger });
  const registryAsPropagation = detachedFrozen({ ...stressedRegistry, activatedDeclarationPaths: propagation.activatedDeclarationPaths, compatibilityLedger: propagation.compatibilityLedger });
  assert.equal(compareStressed(stressedReport.counterfactuals.map((entry) => entry === propagation ? propagationAsRegistry : entry)).status, "fail");
  assert.equal(compareStressed(stressedReport.counterfactuals.map((entry) => entry === stressedRegistry ? registryAsPropagation : entry)).status, "fail");

  const ledgerMutations = [
    ["mechanism", "wrong-mechanism"],
    ["sourceId", "WrongConstraint"],
    ["nativeId", "wrong-native-id"],
    ["executionStep", 1],
    ["status", "ignored"],
  ] as const;
  for (const [field, value] of ledgerMutations) {
    const mutated = structuredClone(registry[0]);
    Reflect.set(mutated.compatibilityLedger[0], field, value);
    const result = compare([detachedFrozen(mutated), registry[1], registry[2]]);
    assert.equal(result.status, "fail", field);
    assert.ok(result.discrepancies.some((entry) => entry.path === `/counterfactualBinding${registry[0].activatedDeclarationPaths[0]}/compatibilityLedger/0/${field}`), field);
  }

  const contextMutations: ReadonlyArray<readonly [string, (value: DifferentialObservationV1) => void]> = [
    ["profileId", (value) => { Reflect.set(value, "profileId", "wrong-profile"); }],
    ["caseId", (value) => { Reflect.set(value, "caseId", "wrong-case"); }],
    ["scenario", (value) => { Reflect.set(value, "scenario", "scenarioA"); }],
    ["hashidentity", (value) => { Reflect.set(value.hashes, "envelopeHash", `sha256:${"0".repeat(64)}`); }],
    ["kind", (value) => { Reflect.set(value, "kind", "pure-native"); }],
    ["nativeStateHasCompatibilityProperties", (value) => { Reflect.set(value, "nativeStateHasCompatibilityProperties", true); }],
  ];
  for (const [label, mutate] of contextMutations) {
    const changed = structuredClone(registry[0]);
    mutate(changed);
    const result = compare([detachedFrozen(changed), registry[1], registry[2]]);
    assert.equal(result.status, "fail", label);
    assert.ok(result.discrepancies.some((entry) => entry.path.startsWith(`/counterfactualBinding${registry[0].activatedDeclarationPaths[0]}`)), label);
  }

  const actionReport = runActionAdmissionDifferentialV1({ envelope, fixture: neutralFixture("legacy-real-estate-v1"), sourceActionId: "increase_liquidity_buffer", scheduledStep: 1 });
  const actionPath = actionReport.actionAdmissionAttribution.declarationPath;
  const entry = envelope.compatibility.actionAdmission.entries.find((candidate) => candidate.sourceActionId === "increase_liquidity_buffer");
  assert.ok(entry);
  const actionLedger = [{ declarationPath: actionPath, status: "applied" as const, mechanism: "legacy-action-admission-v1", sourceId: entry.sourceActionId, nativeId: entry.sourceActionId, executionStep: 1 }];
  const verifyAction = (attribution: ActionAdmissionAttributionResultV1) => verifyActionAttributionBindingV1({
    envelope,
    attribution,
    effectiveActivatedDeclarationPaths: [actionPath],
    effectiveCompatibilityLedger: actionLedger,
    occurrence: { sourceActionId: entry.sourceActionId, scheduledStep: 1 },
  });
  assert.deepEqual(verifyAction(actionReport.actionAdmissionAttribution), []);
  for (const declarationPath of [`${REGISTRY_DECLARATION_PREFIX}0`, PROPAGATION_DECLARATION_PATH, "/compatibility/actionAdmission/entries/999"]) {
    assert.ok(verifyAction(detachedFrozen({ ...actionReport.actionAdmissionAttribution, declarationPath })).some((failure) => failure.path === "/actionAttributionBinding/declarationPath"));
  }
  assert.ok(verifyAction(detachedFrozen({ ...actionReport.actionAdmissionAttribution, outputDisposition: "unchanged" as const })).some((failure) => failure.path === "/actionAttributionBinding/outputDisposition"));
});

test("full Comparator B fails closed for every inconsistent action-attribution state", () => {
  const { correct, compare } = fullActionComparatorHarness();
  const expectFailure = (attribution: ActionAdmissionAttributionResultV1, path: string) => {
    const result = compare(attribution);
    assert.equal(result.status, "fail");
    assert.ok(result.discrepancies.some((entry) => entry.path === path), `${path}: ${JSON.stringify(result.discrepancies.slice(0, 8))}`);
  };

  assert.equal(compare(correct).status, "pass");
  for (const declarationPath of ["/compatibility/actionAdmission/entries/1", `${REGISTRY_DECLARATION_PREFIX}0`, PROPAGATION_DECLARATION_PATH]) {
    expectFailure(detachedFrozen({ ...correct, declarationPath }), "/actionAttributionBinding/declarationPath");
  }

  expectFailure(detachedFrozen({ ...correct, outputDisposition: "unchanged" as const }), "/actionAttributionBinding/outputDisposition");
  expectFailure(detachedFrozen({ ...correct, status: "fail" as const, discrepancies: [] }), "/actionAttribution/consistency/status");
  expectFailure(detachedFrozen({ ...correct, status: "fail" as const, discrepancies: [] }), "/actionAttribution/consistency/discrepancies");

  const fabricatedDiscrepancy = detachedFrozen({ path: "/fabricated", left: "left", right: "right", classification: "compatibility-rule" as const });
  expectFailure(detachedFrozen({ ...correct, status: "pass" as const, discrepancies: [fabricatedDiscrepancy] }), "/actionAttribution/consistency/discrepancies");
  expectFailure(detachedFrozen({ ...correct, status: "fail" as const, discrepancies: [fabricatedDiscrepancy] }), "/actionAttribution/consistency/status");

  expectFailure(detachedFrozen({ ...correct, outputDisposition: "unchanged" as const }), "/actionAttribution/consistency/outputDisposition");
  expectFailure(detachedFrozen({ ...correct, outputDisposition: "changed" as const, attributedDifferences: [] }), "/actionAttribution/consistency/outputDisposition");
});

test("counterfactuals preserve native propagation and do not mutate the envelope", () => {
  const envelope = verifiedEnvelope();
  const before = canonicalizeBaselineValueV1(envelope);
  const report = runDomainModelDifferentialV1({ envelope, fixture: fixture() });
  const plan = buildLegacyCompatibilityExecutionPlanV1(envelope);
  assert.equal(plan.orderedPropagation.some((edge) => edge.sourceKind === "native"), true);
  assert.equal(report.counterfactuals.every((entry) => entry.activatedDeclarationPaths.length === 1), true);
  assert.equal(canonicalizeBaselineValueV1(envelope), before);
});

test("every registry counterfactual behaviorally preserves a triggered pure-native propagation", () => {
  const envelope = verifiedEnvelope();
  const projected = projectNativeSourceCaseV1(envelope, fixture());
  const initialState: Record<string, { levelId: string; score: number }> = structuredClone(projected.initialState);
  initialState["interest-rate-exposure-risk"] = { levelId: "high", score: 2 };
  const witness = detachedFrozen({ ...projected, initialState });
  const pure = executePureNativeProjectionV1({ contract: envelope.projection.contract, sourceCase: witness });
  const counterfactuals = executeDerivedRegistryCounterfactualsV1({ envelope, sourceCase: witness });
  const nativeProjection = (surface: unknown) => {
    const trajectory = (surface as { scenarioA: { trajectory: Array<{ riskState: unknown; driverScores: unknown; cascadeEvents: unknown[] }> } }).scenarioA.trajectory;
    return trajectory.map(({ riskState, driverScores, cascadeEvents }) => ({ riskState, driverScores, cascadeEvents }));
  };
  const pureNativeProjection = nativeProjection(pure.comparisonSurface);
  assert.equal(pureNativeProjection.some((step) => step.cascadeEvents.length > 0), true);
  for (const counterfactual of counterfactuals) {
    assert.deepEqual(nativeProjection(counterfactual.comparisonSurface), pureNativeProjection);
    assert.equal(counterfactual.activatedDeclarationPaths.length, 1);
    assert.equal(counterfactual.compatibilityLedger.length, 1);
    assert.equal(counterfactual.compatibilityLedger[0].declarationPath, counterfactual.activatedDeclarationPaths[0]);
  }
  if (false) {
    // @ts-expect-error counterfactual admission is internally derived and cannot be caller supplied
    executeDerivedRegistryCounterfactualsV1({ envelope, sourceCase: witness, declarationPath: `${REGISTRY_DECLARATION_PREFIX}0` });
  }
});

test("structural, semantic, and hash boundaries reject propagation mutations at exact paths", () => {
  expectStructuralIssue((raw) => { delete raw.compatibility.propagation.executionSemantics; }, "missing-required-field", "/compatibility/propagation/executionSemantics");
  expectStructuralIssue((raw) => { raw.compatibility.propagation.compatibilityOnlyEdges[0].triggerPredicate = "other"; }, "invalid-literal", "/compatibility/propagation/compatibilityOnlyEdges/0/triggerPredicate");
  expectStructuralIssue((raw) => {
    const semantics = raw.compatibility.propagation.executionSemantics;
    if (!semantics) throw new Error("fixture execution semantics missing");
    semantics.eventPolicy.delaySteps = 2;
  }, "invalid-literal", "/compatibility/propagation/executionSemantics/eventPolicy/delaySteps");
  expectStructuralIssue((raw) => {
    const implicitNode = raw.compatibility.propagation.implicitNode;
    if (!implicitNode) throw new Error("fixture implicit node missing");
    implicitNode.scoreMaterialization = "other";
  }, "invalid-literal", "/compatibility/propagation/implicitNode/scoreMaterialization");
  expectSemanticIssue((raw) => { raw.compatibility.propagation.implicitNode = null; }, "legacy-propagation-order-mismatch", "/compatibility/propagation");
  expectSemanticIssue((raw) => { raw.compatibility.propagation.compatibilityOnlyEdges.pop(); }, "legacy-propagation-order-mismatch", "/compatibility/propagation");
  expectSemanticIssue((raw) => { raw.compatibility.propagation.sourceEvaluationOrder.reverse(); }, "legacy-propagation-order-mismatch", "/compatibility/propagation");
  expectSemanticIssue((raw) => { raw.compatibility.legacyRegistryProjection.entries.pop(); }, "legacy-registry-projection-mismatch", "/compatibility/legacyRegistryProjection");
  const raw = rawEnvelope();
  raw.compatibility.declarationsHash = `sha256:${"3".repeat(64)}`;
  const structural = parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok, true);
  if (!structural.ok) return;
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) return;
  const hash = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
  assert.equal(hash.ok, false);
  if (!hash.ok) assert.deepEqual(hash.issues.map((issue) => [issue.code, issue.path]), [["compatibility-declarations-hash-mismatch", "/compatibility/declarationsHash"]]);
});

test("a real projected output identity collision reaches and is rejected by the pure boundary", () => {
  const envelope = verifiedEnvelope();
  const sourceCase = projectNativeSourceCaseV1(envelope, fixture());
  const ids = Object.keys(sourceCase.outputSourceIdByNativeId);
  const collided: NativeSourceCaseProjectionV1 = detachedFrozen({
    ...sourceCase,
    outputSourceIdByNativeId: { ...sourceCase.outputSourceIdByNativeId, [ids[1]]: sourceCase.outputSourceIdByNativeId[ids[0]] },
  });
  assert.throws(() => executePureNativeProjectionV1({ contract: envelope.projection.contract, sourceCase: collided }), /output identity collision/);
});

test("repeated reports are detached, recursively frozen, deterministic, and mutation-free", () => {
  const envelope = verifiedEnvelope();
  const source = fixture();
  const envelopeBefore = canonicalizeBaselineValueV1(envelope);
  const sourceBefore = canonicalizeBaselineValueV1(source);
  const first = runDomainModelDifferentialV1({ envelope, fixture: source });
  const second = runDomainModelDifferentialV1({ envelope, fixture: source });
  assert.deepEqual(first, second);
  assert.equal(canonicalizeBaselineValueV1(envelope), envelopeBefore);
  assert.equal(canonicalizeBaselineValueV1(source), sourceBefore);
  assertDeepFrozen(first);
  assertNoKey(first.pureNative.comparisonSurface, "compatibility");
  assertNoKey(first.pureNative.comparisonSurface, "sustainThreshold");
  assert.deepEqual(first.pureNative.compatibilityLedger, []);
  assert.equal("golden" in first, false);
  assert.equal("acceptGolden" in first, false);
});

const profileMatrix = [
  ["legacy-real-estate-v1", "legacy-real-estate-v1-neutral", "legacy-real-estate-v1-stressed-scheduled"],
  ["legacy-municipal-v1", "legacy-municipal-v1-neutral", "legacy-municipal-v1-stressed-scheduled"],
  ["legacy-consulting-v1", "legacy-consulting-v1-neutral", "legacy-consulting-v1-stressed-scheduled"],
] as const;

for (const [profileId, ...caseNames] of profileMatrix) {
  test(`${profileId} runs the complete locked M0B neutral/stressed matrix`, () => {
    const rawEnvelope = readFileSync(new URL(`../domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`, import.meta.url), "utf8");
    const structural = parseLegacyProfileProjectionEnvelopeV1StructureJson(rawEnvelope);
    assert.equal(structural.ok, true);
    if (!structural.ok) return;
    const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
    assert.equal(semantic.ok, true);
    if (!semantic.ok) return;
    const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    for (const caseName of caseNames) {
      const source = parseEngineBaselineInputFixtureV1(JSON.parse(readFileSync(new URL(`../fixtures/engine-baseline-input-v1/${caseName}.json`, import.meta.url), "utf8")));
      const first = runDomainModelDifferentialV1({ envelope: verified.value, fixture: source });
      const second = runDomainModelDifferentialV1({ envelope: verified.value, fixture: source });
      assert.deepEqual(first, second);
      assert.equal(first.comparatorA.ok, true, `${caseName}: ${JSON.stringify(first.comparatorA.discrepancies.slice(0, 40))}`);
      assert.equal(first.comparatorB.status, "pass", `${caseName}: ${JSON.stringify(first.comparatorB.discrepancies.slice(0, 5))}`);
    }
  });
}

test("RE and CO prove every compatibility propagation edge while MU has none", () => {
  for (const profileId of ["legacy-real-estate-v1", "legacy-consulting-v1"] as const) {
    const raw = readFileSync(new URL(`../domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`, import.meta.url), "utf8");
    const structural = parseLegacyProfileProjectionEnvelopeV1StructureJson(raw);
    assert.equal(structural.ok, true);
    if (!structural.ok) continue;
    const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
    assert.equal(semantic.ok, true);
    if (!semantic.ok) continue;
    const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
    assert.equal(verified.ok, true);
    if (!verified.ok) continue;
    const neutralName = `${profileId}-neutral`;
    const source = parseEngineBaselineInputFixtureV1(JSON.parse(readFileSync(new URL(`../fixtures/engine-baseline-input-v1/${neutralName}.json`, import.meta.url), "utf8")));
    const projected = projectNativeSourceCaseV1(verified.value, source);
    const plan = buildLegacyCompatibilityExecutionPlanV1(verified.value);
    assert.equal(plan.orderedPropagation.filter((edge) => edge.sourceKind === "compatibility").length, 3);

    for (const levelId of ["low", "high", "severe"] as const) {
      const state: Record<string, { levelId: string; score: number }> = structuredClone(projected.initialState);
      state["leverage-level-risk"] = { levelId, score: levelId === "low" ? 0 : levelId === "high" ? 2 : 3 };
      const result = executeImmediateVisibilityWitnessV1({ envelope: verified.value, initialState: state });
      assert.equal(result.events.length, levelId === "low" ? 0 : 2);
      if (levelId !== "low") {
        assert.deepEqual(result.state["liquidity-pressure"], { levelId: "high", score: 2 });
        assert.deepEqual(result.events.map((event) => [event.sourceRisk, event.targetRisk, event.step, event.iteration, event.delaySteps]), [
          ["leverageLevelRisk", "liquidityPressure", 2, 1, 1],
          ["liquidityPressure", "capitalCommitmentRigidityRisk", 2, 1, 1],
        ]);
      }
    }

    const alreadyHigh: Record<string, { levelId: string; score: number }> = structuredClone(projected.initialState);
    alreadyHigh["refinancing-risk"] = { levelId: "high", score: 2 };
    alreadyHigh["liquidity-pressure"] = { levelId: "high", score: 2 };
    alreadyHigh["capital-commitment-rigidity-risk"] = { levelId: "high", score: 2 };
    assert.equal(executeImmediateVisibilityWitnessV1({ envelope: verified.value, initialState: alreadyHigh }).events.length, 0);
  }

  const raw = readFileSync(new URL("../domainModelContractV1/fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json", import.meta.url), "utf8");
  const structural = parseLegacyProfileProjectionEnvelopeV1StructureJson(raw);
  assert.equal(structural.ok, true);
  if (!structural.ok) return;
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) return;
  const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  const plan = buildLegacyCompatibilityExecutionPlanV1(verified.value);
  assert.equal(plan.implicitNode, null);
  assert.equal(plan.orderedPropagation.some((edge) => edge.sourceKind === "compatibility"), false);
});

const actionAdmissionCases = [
  ["legacy-municipal-v1", "congestion_pricing", "output-neutral-v1", false, ["modal_shift_pressure", "political_feasibility"]],
  ["legacy-consulting-v1", "congestion_pricing", "output-neutral-v1", false, ["modal_shift_pressure", "political_feasibility"]],
  ["legacy-real-estate-v1", "increase_liquidity_buffer", "retained-native-effects-v1", true, ["liquidityPressure"]],
  ["legacy-real-estate-v1", "stagger_project_starts", "retained-native-effects-v1", true, ["implementationPacingRisk"]],
] as const;

for (const [profileId, actionId, disposition, outputChanged, unsupported] of actionAdmissionCases) {
  test(`${profileId} ${actionId} keeps actual rejection separate and proves bounded engine-core agreement`, () => {
    const envelope = verifiedProfileEnvelope(profileId);
    const report = runActionAdmissionDifferentialV1({ envelope, fixture: neutralFixture(profileId), sourceActionId: actionId, scheduledStep: 1 });
    const repeated = runActionAdmissionDifferentialV1({ envelope, fixture: neutralFixture(profileId), sourceActionId: actionId, scheduledStep: 1 });
    assert.deepEqual(repeated, report);
    assert.equal(report.comparatorA.status, "not-applicable-no-successful-legacy-output");
    assert.equal(report.comparatorA.ok, null);
    assert.equal(report.engineCoreComparator.reference, "compatibility-normalized-legacy-engine-core-reconstruction-v1");
    assert.equal(report.engineCoreComparator.comparator, "compatibility-normalized-legacy-engine-core-vs-native-effective-v1");
    assert.equal(report.engineCoreComparator.status, "pass", JSON.stringify(report.engineCoreComparator.discrepancies.slice(0, 5)));
    assert.equal(report.admissionComparator.status, "pass");
    assert.deepEqual(report.actualRuntimeRejection.unsupportedSourceDriverIds, unsupported);
    assert.equal(report.actualRuntimeRejection.failureStage, "normalize-scheduled-actions-before-step-v1");
    assert.equal(report.actualRuntimeRejection.failureReason, "canonical-effect-driver-not-applicable-v1");
    assert.equal(report.normalizedEngineCoreProvenance.outcome, "admitted");
    assert.equal(report.compatibilityEffectiveProvenance.outcome, "admitted");
    if (report.normalizedEngineCoreProvenance.outcome === "admitted") {
      assert.equal(report.normalizedEngineCoreProvenance.outputDisposition, disposition);
      assert.equal(report.normalizedEngineCoreProvenance.outputChanged, outputChanged);
      assert.equal(report.normalizedEngineCoreProvenance.scheduledStep, report.normalizedEngineCoreProvenance.actualStep);
    }
    assert.equal(report.actionAdmissionAttribution.comparator, "full-effective-with-action-vs-without-exact-action-declaration-v1");
    assert.equal(report.actionAdmissionAttribution.outputDisposition, outputChanged ? "changed" : "unchanged");
    assert.equal(report.actionAdmissionAttribution.attributedDifferences.length > 0, outputChanged);
    assert.equal(report.actionAdmissionAttribution.attributedDifferences.every((entry) => entry.path.startsWith("/comparisonSurface/scenarioA/") || entry.path.startsWith("/comparisonSurface/comparison/")), true);
    assert.equal(report.actionCounterfactual.comparator, "single-declaration-leave-one-out-v1");
    assert.equal(report.comparatorB.status, "pass", JSON.stringify(report.comparatorB.discrepancies.slice(0, 5)));
    assert.equal(report.comparatorB.discrepancies.length, 0);
    for (const ignoredDriverId of unsupported) assertNoKey(report.compatibilityEffectiveOutput, ignoredDriverId);
    assertDeepFrozen(report);
  });
}

test("action admission rejects every closed failure family atomically", () => {
  const envelope = verifiedEnvelope();
  const entry = envelope.compatibility.actionAdmission.entries[0];
  const effects = [...entry.retainedEffects.map(({ sourceDriverId, delta }) => ({ sourceDriverId, delta })), ...entry.ignoredEffects.map(({ sourceDriverId, delta }) => ({ sourceDriverId, delta }))];
  const base = { profileId: envelope.source.identity.profileId, scenario: "scenarioA" as const, sourceActionId: entry.sourceActionId, scheduledStep: 1, canonicalSourceEffects: effects };
  const reject = (occurrence: typeof base, duplicate = false) => admitActionOccurrenceV1({ envelope, occurrence, horizon: 4, duplicate, observationKind: "compatibility-effective-native" });
  const cases = [
    reject({ ...base, profileId: "legacy-consulting-v1" }),
    reject({ ...base, sourceActionId: "undeclared" }),
    reject(base, true),
    reject({ ...base, scheduledStep: 5 }),
    reject({ ...base, canonicalSourceEffects: effects.slice(1) }),
    reject({ ...base, canonicalSourceEffects: [...effects, { sourceDriverId: "extra", delta: 1 }] }),
    reject({ ...base, canonicalSourceEffects: [...effects, effects[0]] }),
    reject({ ...base, canonicalSourceEffects: effects.map((effect, index) => index === 0 ? { ...effect, delta: effect.delta + 1 } : effect) }),
  ];
  assert.deepEqual(cases.map((result) => "outcome" in result && result.outcome === "rejected" ? [result.failureStage, result.failureReason, result.engineOutput, result.stateMutation, result.canonicalExecutionProvenance] : null), [
    ["profile-binding", "wrong-profile", "absent", false, "absent"],
    ["action-admission", "undeclared-action", "absent", false, "absent"],
    ["schedule-validation", "duplicate-action", "absent", false, "absent"],
    ["schedule-validation", "step-outside-horizon", "absent", false, "absent"],
    ["effect-partition", "missing-effect", "absent", false, "absent"],
    ["effect-partition", "extra-effect", "absent", false, "absent"],
    ["effect-partition", "duplicate-effect", "absent", false, "absent"],
    ["effect-partition", "source-effect-inventory-mismatch", "absent", false, "absent"],
  ]);
});

test("sustainThreshold is contractually excluded without caller-supplied authority", () => {
  for (const profileId of ["legacy-real-estate-v1", "legacy-consulting-v1"] as const) {
    const envelope = verifiedProfileEnvelope(profileId);
    const before = structuredClone(envelope);
    const first = evaluateSustainThresholdV1({ envelope });
    const second = evaluateSustainThresholdV1({ envelope });
    assert.deepEqual(first, {
      declarationPath: "/compatibility/sustainThresholdDisposition",
      status: "excluded-no-authoritative-value",
      historicalMechanismObserved: true,
      hashBoundValue: "absent",
      execution: "forbidden",
      claim: "excluded-from-final-equivalence",
    });
    assert.deepEqual(second, first);
    assert.notStrictEqual(second, first);
    assertDeepFrozen(first);
    assert.deepEqual(envelope, before);
    if (false) {
      // @ts-expect-error sustain execution cannot accept a caller-supplied value
      evaluateSustainThresholdV1({ envelope, compatibilityOverride: 1.2 });
    }
  }
  const municipal = verifiedProfileEnvelope("legacy-municipal-v1");
  const municipalBefore = structuredClone(municipal);
  assert.equal(municipal.compatibility.sustainThresholdDisposition, null);
  const first = evaluateSustainThresholdV1({ envelope: municipal });
  const second = evaluateSustainThresholdV1({ envelope: municipal });
  assert.deepEqual(first, {
    declarationPath: null,
    status: "ineligible-no-declaration",
    historicalMechanismObserved: false,
    hashBoundValue: "absent",
  });
  assert.equal(Object.hasOwn(first, "declarationPath"), true);
  assert.equal(Object.hasOwn(first, "historicalMechanismObserved"), true);
  assert.equal(Object.hasOwn(first, "hashBoundValue"), true);
  assert.equal(Object.hasOwn(first, "execution"), false);
  assert.equal(Object.hasOwn(first, "claim"), false);
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes('"execution"'), false);
  assert.equal(serialized.includes('"claim"'), false);
  assert.deepEqual(second, first);
  assert.notStrictEqual(second, first);
  assertDeepFrozen(first);
  assert.deepEqual(municipal, municipalBefore);
});

test("M1D-3 classification authority is derived and exposes no literal evidence factory", () => {
  assert.equal("causeExcludedComparatorAEvidenceV1" in differentialExecutionV1, false);
  assert.equal("classifyComparatorAEvidenceV1" in differentialExecutionV1, false);
  assert.equal("verifyDiscrepancyInvariantsV1" in differentialExecutionV1, false);
  if (false) {
    // @ts-expect-error Comparator A accepts verified runtime inputs, not raw evidence literals
    compareLegacyToCompatibilityEffective({}, { kind: "cause-excluded-unresolved", executionsSucceeded: true });
    // @ts-expect-error ownership-specific verifier has no caller-selectable emitter
    verifyAdapterReportDiscrepanciesV1({ emitter: "verified-compatibility-binding", status: "pass", discrepancies: [] });
  }
});

test("M1D-3 discrepancy verifier enforces emitter, RFC 6901, ownership, sorting, freeze, and status invariants", () => {
  const discrepancy = (path: string, classification: "adapter-error" | "contract-error" | "compatibility-rule" | "unresolved-design-decision") =>
    detachedFrozen({ path, left: { presence: "absent" as const }, right: { value: 1 }, classification });
  verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a~0b/c~1d", "adapter-error")] });
  verifyAdapterReportDiscrepanciesV1({ status: "pass", discrepancies: [] });
  for (const status of ["not-applicable-no-successful-legacy-output", "not-applicable-normalization-rejected", "excluded-no-authoritative-value", "ineligible-no-declaration", "rejected"] as const) {
    verifyAdapterReportDiscrepanciesV1({ status, discrepancies: [] });
    assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status, discrepancies: [discrepancy("/status", "adapter-error")] }), /closed non-comparison status/);
  }
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "pass", discrepancies: [discrepancy("/status", "adapter-error")] }), /pass result/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [] }), /requires discrepancies/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("relative", "adapter-error")] }), /RFC 6901/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/bad~2escape", "adapter-error")] }), /RFC 6901/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/", "adapter-error")] }), /RFC 6901/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/b", "adapter-error"), discrepancy("/a", "adapter-error")] }), /code-unit order/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "adapter-error"), discrepancy("/a", "adapter-error")] }), /duplicate/);
  assert.throws(() => verifyCompatibilityDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "adapter-error")] }), /forbidden for ownership boundary/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "compatibility-rule")] }), /forbidden for ownership boundary/);
  assert.throws(() => verifyNativeExecutionDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "adapter-error")] }), /forbidden for ownership boundary/);
  verifyNativeExecutionDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "contract-error")] });
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "contract-error")] }), /forbidden for ownership boundary/);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "known-explicitly-deferred" as never)] }), /reserved or unknown/);
  assert.throws(() => verifyCompatibilityDiscrepanciesV1({ status: "fail", discrepancies: [discrepancy("/a", "possible-legacy-runtime-defect" as never)] }), /reserved or unknown/);
  const unfrozen = [{ path: "/a", left: { value: 1 }, right: 2, classification: "adapter-error" as const }];
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: unfrozen }), /recursively frozen/);
  const undefinedValue = detachedFrozen([{ path: "/a", left: undefined, right: 2, classification: "adapter-error" as const }]);
  assert.throws(() => verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: undefinedValue }), /concrete/);
});

test("M1D-3 observation identity mutation matrix is adapter-owned", () => {
  const paths = [
    "/version", "/kind", "/profileId", "/caseId", "/scenario",
    "/hashes/sourceSemanticPayloadHash", "/hashes/projectedSemanticPayloadHash",
    "/hashes/compatibilityDeclarationsHash", "/hashes/envelopeHash",
    "/nativeStateHasCompatibilityProperties",
  ];
  for (const path of paths) {
    const discrepancies = detachedFrozen([{ path, left: "expected", right: "mutated", classification: "adapter-error" as const }]);
    verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies });
  }
  const reEnvelope = verifiedProfileEnvelope("legacy-real-estate-v1");
  assert.throws(() => projectNativeSourceCaseV1(reEnvelope, neutralFixture("legacy-municipal-v1")), /identity mismatch/i);
});

test("M1D-3 Comparator A derives compatibility ownership and cause-excluded unresolved paths", () => {
  const envelope = verifiedEnvelope();
  const report = runDomainModelDifferentialV1({ envelope, fixture: fixture() });
  const unresolvedLegacy = detachedFrozen({ ...report.legacyReference, comparisonSurface: { witness: { value: 1 } } });
  const unresolvedEffective = detachedFrozen({ ...report.compatibilityEffectiveCandidate, comparisonSurface: { witness: { value: 2 } } });
  assert.throws(() => compareLegacyToCompatibilityEffective({ envelope, legacy: unresolvedLegacy, pureNative: report.pureNative, effective: unresolvedEffective, comparatorB: report.comparatorB }), /compatibility prerequisite mismatch/);

  const legacySurface = structuredClone(report.legacyReference.comparisonSurface) as Record<string, unknown>;
  const attribution = report.comparatorB.attributions.find((entry) => entry.observedDifferences.length > 0);
  assert.ok(attribution);
  const observed = attribution.observedDifferences[0];
  const segments = observed.path.split("/").slice(2).map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let owner: Record<string, unknown> = legacySurface;
  for (const segment of segments.slice(0, -1)) owner = Reflect.get(owner, segment) as Record<string, unknown>;
  Reflect.set(owner, segments.at(-1)!, "m1d-compatibility-owned-witness");
  const compatibilityLegacy = detachedFrozen({ ...report.legacyReference, comparisonSurface: legacySurface });
  const compatibilityResult = compareLegacyToCompatibilityEffective({ envelope, legacy: compatibilityLegacy, pureNative: report.pureNative, effective: report.compatibilityEffectiveCandidate, comparatorB: report.comparatorB });
  assert.equal(compatibilityResult.status, "fail");
  assert.equal(compatibilityResult.discrepancies.find((entry) => entry.path === observed.path)?.classification, "compatibility-rule");

  const unresolvedSurface = structuredClone(report.legacyReference.comparisonSurface) as Record<string, unknown>;
  Reflect.set(unresolvedSurface, "mechanically-unowned-witness", 1);
  const causeExcludedLegacy = detachedFrozen({ ...report.legacyReference, comparisonSurface: unresolvedSurface });
  const unresolvedResult = compareLegacyToCompatibilityEffective({ envelope, legacy: causeExcludedLegacy, pureNative: report.pureNative, effective: report.compatibilityEffectiveCandidate, comparatorB: report.comparatorB });
  assert.equal(unresolvedResult.status, "fail");
  assert.deepEqual(unresolvedResult.discrepancies.at(-1), { path: "/comparisonSurface/mechanically-unowned-witness", left: 1, right: { presence: "absent" }, classification: "unresolved-design-decision" });
});

test("M1D-3 Comparator A rejects a passing Comparator B with discrepancies at the prerequisite boundary", () => {
  const envelope = verifiedEnvelope();
  const report = runDomainModelDifferentialV1({ envelope, fixture: fixture() });
  const comparatorB = detachedFrozen({
    ...report.comparatorB,
    discrepancies: [{
      path: "/comparisonSurface/fabricated-prerequisite-discrepancy",
      left: { presence: "absent" as const },
      right: "fabricated",
      classification: "compatibility-rule" as const,
    }],
  });
  assertDeepFrozen(comparatorB);
  assert.throws(
    () => compareLegacyToCompatibilityEffective({
      envelope,
      legacy: report.legacyReference,
      pureNative: report.pureNative,
      effective: report.compatibilityEffectiveCandidate,
      comparatorB,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "M1D Comparator A requires a passing Comparator B to have an empty discrepancies list");
      return true;
    }
  );
});

test("M1D-3 contract-error uses a real structural-semantic-hash pipeline", () => {
  const envelope = verifiedProfileEnvelope("legacy-municipal-v1");
  const raw = structuredClone(envelope.projection.contract) as unknown as {
    identity: { semanticPayloadHash: string };
    semanticPayload: { constraints: unknown[]; measures: unknown[] };
  };
  raw.semanticPayload.constraints = [];
  raw.semanticPayload.measures = [];
  const structural = parseDomainModelContractV1Structure(raw);
  assert.equal(structural.ok, true);
  if (!structural.ok) return;
  const semantic = validateDomainModelContractV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) return;
  raw.identity.semanticPayloadHash = hashDomainModelContractSemanticIdentityV1(semantic.value);
  const verified = parseDomainModelContractV1(raw);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  const sourceCase = projectNativeSourceCaseV1(envelope, neutralFixture("legacy-municipal-v1"));
  assert.throws(() => executePureNativeProjectionV1({ contract: verified.value, sourceCase }), /contract-error: missing structural-margin measure/);
  const discrepancies = detachedFrozen([{ path: "/semanticPayload/measures", left: "required executable measure", right: { presence: "absent" as const }, classification: "contract-error" as const }]);
  verifyNativeExecutionDiscrepanciesV1({ status: "fail", discrepancies });
});

test("M1D-3 report hash owns exact content, ignores object insertion order, and preserves array order", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  const { reportHash: ignored, ...content } = report;
  void ignored;
  assert.equal(report.reportHash, hashDifferentialReportContent(content));
  assert.equal(runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() }).reportHash, report.reportHash);
  assert.equal(hashDifferentialReportContent({ a: 1, b: 2 }), hashDifferentialReportContent({ b: 2, a: 1 }));
  assert.notEqual(hashDifferentialReportContent({ ordered: [1, 2] }), hashDifferentialReportContent({ ordered: [2, 1] }));
  assert.notEqual(hashDifferentialReportContent({ ...content, version: "mutated" }), report.reportHash);
  const semanticMutations: Array<(value: unknown) => void> = [
    (value) => { (value as { legacyReference: { comparisonSurface: { fixtureId: string } } }).legacyReference.comparisonSurface.fixtureId = "mutated"; },
    (value) => { (value as { pureNative: { comparisonSurface: { fixtureId: string } } }).pureNative.comparisonSurface.fixtureId = "mutated"; },
    (value) => { (value as { compatibilityEffectiveCandidate: { comparisonSurface: { fixtureId: string } } }).compatibilityEffectiveCandidate.comparisonSurface.fixtureId = "mutated"; },
    (value) => { (value as { counterfactuals: unknown[] }).counterfactuals.reverse(); },
    (value) => { (value as { comparatorA: { comparator: string } }).comparatorA.comparator = "mutated"; },
    (value) => { (value as { comparatorB: { comparator: string } }).comparatorB.comparator = "mutated"; },
  ];
  for (const mutate of semanticMutations) {
    const changed = structuredClone(content);
    mutate(changed);
    assert.notEqual(hashDifferentialReportContent(changed), report.reportHash);
  }
  const stale = detachedFrozen([{ path: "/reportHash", left: report.reportHash, right: "stale", classification: "adapter-error" as const }]);
  verifyAdapterReportDiscrepanciesV1({ status: "fail", discrepancies: stale });
  assert.notEqual(hashDifferentialReportContent(report), report.reportHash);
});
