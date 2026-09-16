import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalizeBaselineValueV1 } from "../baselineCanonicalizationV1";
import { parseEngineBaselineInputFixtureV1, runEngineBaselineFixtureV1 } from "../engineOutputProjectionV1";
import { verifyLegacyProfileProjectionEnvelopeV1Hashes } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import { parseLegacyProfileProjectionEnvelopeV1Structure, parseLegacyProfileProjectionEnvelopeV1StructureJson } from "../domainModelContractV1/parseLegacyProfileProjectionEnvelopeV1Structure";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "../domainModelContractV1/validateLegacyProfileProjectionEnvelopeV1Semantics";
import {
  buildLegacyCompatibilityExecutionPlanV1,
  projectNativeSourceCaseV1,
  REGISTRY_DECLARATION_PREFIX,
  type NativeSourceCaseProjectionV1,
} from "./buildLegacyCompatibilityExecutionPlanV1";
import { compareLegacyToCompatibilityEffective, detachedFrozen, type DifferentialObservationV1 } from "./differentialExecutionV1";
import {
  executeCompatibilityPropagationWitnessV1,
  executeDerivedRegistryCounterfactualsV1,
  executeImmediateVisibilityWitnessV1,
  executePureNativeProjectionV1,
} from "./executeVerifiedNativeProjectionV1";
import { comparePureNativeToCompatibilityEffective } from "./runCompatibilityCounterfactualV1";
import { runDomainModelDifferentialV1 } from "./runDomainModelDifferentialV1";

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

function fixture() {
  return parseEngineBaselineInputFixtureV1(JSON.parse(fixtureText));
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
  assert.equal(report.comparatorB.ok, true);
  assert.notStrictEqual(report.legacyReference.comparisonSurface, report.pureNative.comparisonSurface);
  assert.notStrictEqual(report.pureNative.comparisonSurface, report.compatibilityEffectiveCandidate.comparisonSurface);
  assert.notStrictEqual(report.legacyReference.comparisonSurface, report.compatibilityEffectiveCandidate.comparisonSurface);
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
  const forbidden = new Set(["compatibility", "driverIdMappings", "legacyRegistryProjection", "executionSemantics", "compatibilityOnlyEdges", "sustainThresholdOverride"]);
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
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  const surface = mutableSurface(report.compatibilityEffectiveCandidate);
  scenarioFrom(surface, "scenarioA").trajectory[0].registry.LiquidityConstraint.lifecycle = "ACTIVE";
  const candidate = detachedFrozen({ ...report.compatibilityEffectiveCandidate, comparisonSurface: surface });
  const result = compareLegacyToCompatibilityEffective(report.legacyReference, candidate);
  assert.equal(result.ok, false);
  assert.deepEqual(result.discrepancies[0], {
    path: "/comparisonSurface/scenarioA/trajectory/0/registry/LiquidityConstraint/lifecycle",
    left: "INACTIVE",
    right: "ACTIVE",
    classification: "unresolved-design-decision",
  });
});

test("Comparator B uses real before/after paths with unique internally derived attribution", () => {
  const report = runDomainModelDifferentialV1({ envelope: verifiedEnvelope(), fixture: fixture() });
  assert.equal(report.comparatorB.ok, true);
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
  const rejected = comparePureNativeToCompatibilityEffective({ pureNative: report.pureNative, compatibilityEffective: ledgerOnly, counterfactuals: [ledgerOnly] });
  assert.equal(rejected.ok, false);
});

test("Comparator B value equality is insertion-order-neutral and rejects changed nested values exactly", () => {
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
  const accepted = comparePureNativeToCompatibilityEffective({ pureNative, compatibilityEffective, counterfactuals: [reordered] });
  assert.equal(accepted.ok, true);

  const changed = detachedFrozen({
    ...reordered,
    comparisonSurface: { witness: { value: { nested: { right: 4, left: 2 }, alpha: 1 } } },
  });
  const rejected = comparePureNativeToCompatibilityEffective({ pureNative, compatibilityEffective, counterfactuals: [changed] });
  assert.equal(rejected.ok, false);
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
