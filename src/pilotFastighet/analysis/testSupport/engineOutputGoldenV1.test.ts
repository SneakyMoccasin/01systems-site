import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { createScenarioAnalysisResult } from "../cascadeAnalysisProjection";
import { prepareOrdinaryConfiguredRunSource } from "../configuredRunSource";
import { createCleanRunSourceSnapshot, runReactAnalysisBoundary } from "../reactScheduledAnalysisBoundary";
import { runInitiativeScheduledAnalysis } from "../structuralObservation/runInitiativeScheduledAnalysis";
import { calculateScheduledExecutiveMetrics } from "../scheduledExecutivePresentation";
import { getScheduledExecutiveDemoRunSource, SCHEDULED_EXECUTIVE_DEMO_HORIZON, SCHEDULED_EXECUTIVE_DEMO_SCHEDULES } from "../../scheduledExecutiveDemo";
import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "./baselineCanonicalizationV1";
import { parseDomainModelBaselineManifestV1 } from "./domainModelBaselineManifestV1";
import { LEGACY_ALGORITHM_ASSUMPTIONS_V1 } from "./legacyAlgorithmAssumptionsV1";
import { projectLegacyDomainProfileSemanticPayloadV1 } from "./legacyDomainProfileSemanticPayloadV1";
import { parseEngineOutputGoldenV1 } from "./engineOutputGoldenV1";
import { parseEngineBaselineInputFixtureV1, runEngineBaselineFixtureV1 } from "./engineOutputProjectionV1";
import consultingNeutral from "./fixtures/engine-baseline-input-v1/legacy-consulting-v1-neutral.json";
import consultingStressed from "./fixtures/engine-baseline-input-v1/legacy-consulting-v1-stressed-scheduled.json";
import municipalNeutral from "./fixtures/engine-baseline-input-v1/legacy-municipal-v1-neutral.json";
import municipalStressed from "./fixtures/engine-baseline-input-v1/legacy-municipal-v1-stressed-scheduled.json";
import realEstateNeutral from "./fixtures/engine-baseline-input-v1/legacy-real-estate-v1-neutral.json";
import realEstateStressed from "./fixtures/engine-baseline-input-v1/legacy-real-estate-v1-stressed-scheduled.json";
import consultingNeutralGolden from "./fixtures/engine-output-golden-v1/legacy-consulting-v1-neutral.json";
import consultingStressedGolden from "./fixtures/engine-output-golden-v1/legacy-consulting-v1-stressed-scheduled.json";
import municipalNeutralGolden from "./fixtures/engine-output-golden-v1/legacy-municipal-v1-neutral.json";
import municipalStressedGolden from "./fixtures/engine-output-golden-v1/legacy-municipal-v1-stressed-scheduled.json";
import realEstateNeutralGolden from "./fixtures/engine-output-golden-v1/legacy-real-estate-v1-neutral.json";
import realEstateStressedGolden from "./fixtures/engine-output-golden-v1/legacy-real-estate-v1-stressed-scheduled.json";

const CASES = [
  [parseEngineBaselineInputFixtureV1(realEstateNeutral), parseEngineOutputGoldenV1(realEstateNeutralGolden)], [parseEngineBaselineInputFixtureV1(realEstateStressed), parseEngineOutputGoldenV1(realEstateStressedGolden)],
  [parseEngineBaselineInputFixtureV1(municipalNeutral), parseEngineOutputGoldenV1(municipalNeutralGolden)], [parseEngineBaselineInputFixtureV1(municipalStressed), parseEngineOutputGoldenV1(municipalStressedGolden)],
  [parseEngineBaselineInputFixtureV1(consultingNeutral), parseEngineOutputGoldenV1(consultingNeutralGolden)], [parseEngineBaselineInputFixtureV1(consultingStressed), parseEngineOutputGoldenV1(consultingStressedGolden)],
] as const;

function scenario(value: ReturnType<typeof runEngineBaselineFixtureV1>["scenarioA"]) {
  return { trajectory: value.trajectory, terminalState: value.terminalState, marginHistory: value.marginHistory, constraintHistory: value.constraintHistory, cascadeHistory: value.cascadeHistory };
}
function initiativeScenario(trajectory: readonly ReturnType<typeof runEngineBaselineFixtureV1>["scenarioA"]["terminalState"][]) {
  return scenario(createScenarioAnalysisResult([...structuredClone(trajectory)]) as ReturnType<typeof runEngineBaselineFixtureV1>["scenarioA"]);
}
function hashes(output: ReturnType<typeof runEngineBaselineFixtureV1>) {
  return {
    outputHash: hashBaselineValueV1(output),
    trajectoryHash: hashBaselineValueV1({ A: output.scenarioA.trajectory, B: output.scenarioB.trajectory, baseline: output.baseline.trajectory }),
    terminalStateHash: hashBaselineValueV1({ A: output.scenarioA.terminalState, B: output.scenarioB.terminalState, baseline: output.baseline.terminalState }),
    marginHistoryHash: hashBaselineValueV1({ A: output.scenarioA.marginHistory, B: output.scenarioB.marginHistory, baseline: output.baseline.marginHistory }),
    constraintHistoryHash: hashBaselineValueV1({ A: output.scenarioA.constraintHistory, B: output.scenarioB.constraintHistory, baseline: output.baseline.constraintHistory }),
    cascadeEventHash: hashBaselineValueV1({ A: output.scenarioA.cascadeHistory, B: output.scenarioB.cascadeHistory, baseline: output.baseline.cascadeHistory }),
    provenanceHash: hashBaselineValueV1(output.executionProvenance),
    baselineHash: hashBaselineValueV1(output.baseline),
    comparisonHash: hashBaselineValueV1(output.comparison),
  };
}
function metrics(output: ReturnType<typeof runEngineBaselineFixtureV1>) {
  const first = (value: typeof output.scenarioA) => { const i = value.constraintHistory.findIndex((r) => r.RefinancingConstraint.lifecycle === "ACTIVE"); return i < 0 ? null : i + 1; };
  return { horizon: output.horizon, terminalMarginA: output.scenarioA.terminalState.margin, terminalMarginB: output.scenarioB.terminalState.margin, baselineTerminalMargin: output.baseline.terminalState.margin, firstDivergencePeriod: output.comparison.firstDivergenceIndex === null ? null : output.comparison.firstDivergenceIndex + 1, cascadeEventCountA: output.scenarioA.cascadeHistory.length, cascadeEventCountB: output.scenarioB.cascadeHistory.length, provenanceCount: output.executionProvenance.length, firstRefinancingPeriodA: first(output.scenarioA), firstRefinancingPeriodB: first(output.scenarioB) };
}
function assertFrozen(value: unknown): void { if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); for (const child of Object.values(value)) assertFrozen(child); } }
function nested(value: Record<string, unknown>, key: string): Record<string, unknown> { return value[key] as Record<string, unknown>; }

test("exactly two explicit strict-JSON fixtures exist per legacy profile and avoid known gap actions", () => {
  assert.equal(CASES.length, 6);
  for (const profileId of ["legacy-real-estate-v1", "legacy-municipal-v1", "legacy-consulting-v1"] as const) assert.equal(CASES.filter(([f]) => f.profileId === profileId).length, 2);
  for (const [raw] of CASES) {
    const f = raw; assert.doesNotThrow(() => canonicalizeBaselineValueV1(f)); assertFrozen(f);
    assert.equal(Object.keys(f.initialState.riskState).length, 18); assert.equal(Object.keys(f.initialState.driverScores).length, 18);
    const supported = new Set(projectLegacyDomainProfileSemanticPayloadV1(f.profileId).supportedActionIds);
    for (const action of [...f.schedules.A, ...f.schedules.B]) assert.equal(supported.has(action.actionId), true);
    for (const gapAction of ["stagger_project_starts", "increase_liquidity_buffer", "congestion_pricing"]) assert.equal([...f.schedules.A, ...f.schedules.B].some((a) => a.actionId === gapAction), false);
    if (f.kind === "stressed-scheduled") {
      assert.ok(f.schedules.A.length >= 2); assert.deepEqual(f.schedules.A.map((a) => a.actionId).sort(), f.schedules.B.map((a) => a.actionId).sort());
      assert.ok([f.schedules.A, f.schedules.B].some((entries) => new Set(entries.map((e) => e.executionStep)).size < entries.length));
    }
  }
});

test("input parser validates the complete test-only fixture contract and returns detached frozen data", () => {
  const original = structuredClone(realEstateStressed) as unknown;
  const parsed = parseEngineBaselineInputFixtureV1(original);
  assert.notStrictEqual(parsed, original);
  assertFrozen(parsed);
  (original as { fixtureId: string }).fixtureId = "changed";
  assert.equal(parsed.fixtureId, "legacy-real-estate-v1-stressed-scheduled-v1");
  assert.throws(() => { (parsed as { fixtureId: string }).fixtureId = "mutated"; }, TypeError);
});

test("input parser rejects malformed structure, identity, state, scores, and schedules", () => {
  const mutate = (change: (value: Record<string, unknown>) => void, pattern: RegExp): void => {
    const value = structuredClone(realEstateStressed) as unknown as Record<string, unknown>;
    change(value);
    assert.throws(() => parseEngineBaselineInputFixtureV1(value), pattern);
  };
  const initial = (value: Record<string, unknown>) => nested(value, "initialState");
  const schedules = (value: Record<string, unknown>) => nested(value, "schedules");
  mutate((v) => { v.unknown = true; }, /\$\.unknown: unknown field/);
  mutate((v) => { initial(v).unknown = true; }, /\$\.initialState\.unknown: unknown field/);
  mutate((v) => { nested(initial(v), "riskState").unknown = "LOW"; }, /\$\.initialState\.riskState\.unknown: unknown field/);
  mutate((v) => { nested(initial(v), "driverScores").unknown = 1; }, /\$\.initialState\.driverScores\.unknown: unknown field/);
  mutate((v) => { schedules(v).unknown = []; }, /\$\.schedules\.unknown: unknown field/);
  mutate((v) => { (schedules(v).A as Record<string, unknown>[])[0].unknown = true; }, /\$\.schedules\.A\[0\]\.unknown: unknown field/);
  mutate((v) => { v.version = "future"; }, /\$\.version/);
  mutate((v) => { v.fixtureId = ""; }, /\$\.fixtureId/);
  mutate((v) => { v.kind = "other"; }, /\$\.kind/);
  mutate((v) => { v.domainId = "other"; }, /\$\.domainId/);
  mutate((v) => { v.profileId = "other"; }, /\$\.profileId/);
  mutate((v) => { v.domainId = "municipal"; }, /\$\.profileId: does not match domain municipal/);
  mutate((v) => { v.horizon = 0; }, /\$\.horizon/);
  mutate((v) => { v.horizon = 1.5; }, /\$\.horizon/);
  mutate((v) => { nested(initial(v), "riskState").demandRisk = "UNKNOWN"; }, /riskState\.demandRisk/);
  mutate((v) => { delete nested(initial(v), "riskState").demandRisk; }, /riskState\.demandRisk: required field is missing/);
  mutate((v) => { delete nested(initial(v), "driverScores").demandRisk; }, /driverScores\.demandRisk: required field is missing/);
  mutate((v) => { nested(initial(v), "driverScores").demandRisk = Number.POSITIVE_INFINITY; }, /driverScores\.demandRisk/);
  mutate((v) => { nested(initial(v), "driverScores").demandRisk = -0; }, /driverScores\.demandRisk/);
  mutate((v) => { (schedules(v).A as Record<string, unknown>[])[0].executionStep = 0; }, /executionStep/);
  mutate((v) => { (schedules(v).A as Record<string, unknown>[])[0].executionStep = 1.5; }, /executionStep/);
  mutate((v) => { (schedules(v).A as Record<string, unknown>[])[0].actionId = "congestion_pricing"; }, /actionId: must be supported/);
  mutate((v) => { (schedules(v).A as Record<string, unknown>[]).push(structuredClone((schedules(v).A as Record<string, unknown>[])[0])); }, /duplicate action within scenario/);
  mutate((v) => { (schedules(v).B as Record<string, unknown>[]).pop(); }, /same action set in A and B/);
  mutate((v) => { schedules(v).A = []; schedules(v).B = []; }, /\$\.schedules\.A: stressed-scheduled fixtures require at least one entry/);
  const neutral = structuredClone(realEstateNeutral) as unknown as Record<string, unknown>;
  (nested(neutral, "schedules").A as unknown[]).push({ actionId: "early_refinancing", executionStep: 1 });
  assert.throws(() => parseEngineBaselineInputFixtureV1(neutral), /neutral fixtures require empty schedules/);
});

test("input parser rejects symbols, accessors, sparse arrays, and non-plain objects", () => {
  const symbol = structuredClone(realEstateNeutral) as unknown as Record<string, unknown>;
  symbol[Symbol("hidden") as unknown as string] = true;
  assert.throws(() => parseEngineBaselineInputFixtureV1(symbol), /symbol keys are not supported/);
  const accessor = structuredClone(realEstateNeutral) as unknown as Record<string, unknown>;
  Object.defineProperty(accessor, "fixtureId", { enumerable: true, get: () => "fixture" });
  assert.throws(() => parseEngineBaselineInputFixtureV1(accessor), /accessor fields are not supported/);
  const sparse = structuredClone(realEstateStressed) as unknown as Record<string, unknown>;
  delete (nested(sparse, "schedules").A as unknown[])[0];
  assert.throws(() => parseEngineBaselineInputFixtureV1(sparse), /sparse arrays are not supported/);
  const nonPlain = structuredClone(realEstateNeutral) as unknown as Record<string, unknown>;
  Object.setPrototypeOf(nested(nonPlain, "initialState"), new Date());
  assert.throws(() => parseEngineBaselineInputFixtureV1(nonPlain), /must be a plain object/);
});

test("output Golden parser accepts all fixtures and returns detached recursively frozen data", () => {
  for (const raw of [realEstateNeutralGolden, realEstateStressedGolden, municipalNeutralGolden, municipalStressedGolden, consultingNeutralGolden, consultingStressedGolden]) {
    const original = structuredClone(raw) as unknown;
    const parsed = parseEngineOutputGoldenV1(original);
    assert.notStrictEqual(parsed, original);
    assertFrozen(parsed);
    (original as { fixtureId: string }).fixtureId = "changed";
    assert.notEqual(parsed.fixtureId, "changed");
    assert.throws(() => { (parsed as { fixtureId: string }).fixtureId = "mutated"; }, TypeError);
  }
});

test("output Golden parser rejects unknown, missing, invalid, and non-data inputs", () => {
  const mutate = (change: (value: Record<string, unknown>) => void, pattern: RegExp): void => {
    const value = structuredClone(realEstateNeutralGolden) as unknown as Record<string, unknown>;
    change(value);
    assert.throws(() => parseEngineOutputGoldenV1(value), pattern);
  };
  mutate((v) => { v.unknown = true; }, /\$\.unknown: unknown field/);
  mutate((v) => { delete v.inputHash; }, /\$\.inputHash: required field is missing/);
  mutate((v) => { v.version = "future"; }, /\$\.version/);
  mutate((v) => { v.outputHash = "A".repeat(64); }, /\$\.outputHash/);
  mutate((v) => { v.exactMetrics = { nested: { value: undefined } }; }, /\$\.exactMetrics\.nested\.value: undefined is not supported/);
  mutate((v) => { (v.manifest as Record<string, unknown>).schemaVersion = "future"; }, /Domain Model Baseline Manifest V1 validation failed at \$\.schemaVersion/);

  const symbol = structuredClone(realEstateNeutralGolden) as unknown as Record<string, unknown>;
  symbol[Symbol("hidden") as unknown as string] = true;
  assert.throws(() => parseEngineOutputGoldenV1(symbol), /symbol keys are not supported/);
  const accessor = structuredClone(realEstateNeutralGolden) as unknown as Record<string, unknown>;
  Object.defineProperty(accessor, "fixtureId", { enumerable: true, get: () => "fixture" });
  assert.throws(() => parseEngineOutputGoldenV1(accessor), /accessor fields are not supported/);
  const nonEnumerable = structuredClone(realEstateNeutralGolden) as unknown as Record<string, unknown>;
  Object.defineProperty(nonEnumerable, "hidden", { enumerable: false, value: true });
  assert.throws(() => parseEngineOutputGoldenV1(nonEnumerable), /non-enumerable fields are not supported/);
  const classInstance = Object.assign(new (class Golden {})(), structuredClone(realEstateNeutralGolden));
  assert.throws(() => parseEngineOutputGoldenV1(classInstance), /must be a plain object/);
});

test("six output projections match explicit input, full-output, component, metric, and manifest goldens", () => {
  for (const [raw, golden] of CASES) {
    const f = raw; const before = structuredClone(f); const output = runEngineBaselineFixtureV1(f);
    assert.equal(golden.version, "engine-output-golden-v1");
    assert.equal(golden.fixtureId, f.fixtureId);
    assert.equal(hashBaselineValueV1(f), golden.inputHash); assert.deepEqual(hashes(output), { outputHash: golden.outputHash, trajectoryHash: golden.trajectoryHash, terminalStateHash: golden.terminalStateHash, marginHistoryHash: golden.marginHistoryHash, constraintHistoryHash: golden.constraintHistoryHash, cascadeEventHash: golden.cascadeEventHash, provenanceHash: golden.provenanceHash, baselineHash: golden.baselineHash, comparisonHash: golden.comparisonHash });
    assert.deepEqual(metrics(output), golden.exactMetrics); assert.deepEqual(f, before); assertFrozen(output); assert.notStrictEqual(output.scenarioA.trajectory, f.initialState);
    const parsed = parseDomainModelBaselineManifestV1(golden.manifest); assert.notStrictEqual(parsed, golden.manifest); assertFrozen(parsed);
    assert.equal(hashBaselineValueV1(golden.manifest), golden.manifestHash);
    assert.equal(parsed.input.fixtureId, f.fixtureId);
    assert.equal(parsed.executionSurface, output.executionSurface);
    assert.deepEqual(parsed.profile, { ...output.profileIdentity, semanticPayloadHash: parsed.profile.semanticPayloadHash });
    assert.equal(parsed.result.baselineHash, golden.baselineHash);
    assert.equal(
      parsed.profile.semanticPayloadHash,
      hashBaselineValueV1(projectLegacyDomainProfileSemanticPayloadV1(f.profileId)),
    );
  }
});

test("neutral baselines and stressed profile-specific behavior are exact", () => {
  for (const [, golden] of CASES.filter(([f]) => f.kind === "neutral")) assert.deepEqual(golden.exactMetrics, { horizon: 6, terminalMarginA: 1, terminalMarginB: 1, baselineTerminalMargin: 1, firstDivergencePeriod: null, cascadeEventCountA: 0, cascadeEventCountB: 0, provenanceCount: 0, firstRefinancingPeriodA: null, firstRefinancingPeriodB: null });
  assert.deepEqual(municipalStressedGolden.exactMetrics, { horizon: 8, terminalMarginA: -3, terminalMarginB: -3, baselineTerminalMargin: -3, firstDivergencePeriod: 1, cascadeEventCountA: 3, cascadeEventCountB: 3, provenanceCount: 6, firstRefinancingPeriodA: null, firstRefinancingPeriodB: null });
  assert.notEqual(realEstateStressedGolden.outputHash, consultingStressedGolden.outputHash);
  assert.deepEqual(realEstateStressedGolden.exactMetrics.firstRefinancingPeriodA, 5); assert.deepEqual(consultingStressedGolden.exactMetrics.firstRefinancingPeriodB, 2);
});

test("repeated execution is byte-identical, detached, and non-mutating", () => {
  for (const [f] of CASES) { const a = runEngineBaselineFixtureV1(f); const b = runEngineBaselineFixtureV1(f); assert.notStrictEqual(a, b); assert.equal(canonicalizeBaselineValueV1(a), canonicalizeBaselineValueV1(b)); assert.equal(hashBaselineValueV1(a), hashBaselineValueV1(b)); }
});

test("surface equivalence is explicit and compares common engine semantics only", () => {
  const matrix = [
    ["direct preconfigured ↔ ordinary configured boundary", "EQUIVALENT AFTER EXPLICIT PROJECTION"],
    ["direct scheduled ↔ React scheduled boundary", "EQUIVALENT AFTER EXPLICIT PROJECTION"],
    ["embedded baseline ↔ action-free preconfigured scenario", "EXACT ENGINE EQUIVALENT"],
    ["initiative-scheduled ↔ action scheduled", "EQUIVALENT AFTER EXPLICIT PROJECTION"],
  ] as const;
  assert.deepEqual(matrix.map((row) => row[1]), ["EQUIVALENT AFTER EXPLICIT PROJECTION", "EQUIVALENT AFTER EXPLICIT PROJECTION", "EXACT ENGINE EQUIVALENT", "EQUIVALENT AFTER EXPLICIT PROJECTION"]);
  // Configured wrappers add run-source metadata; only common engine semantics are compared.
  for (const raw of [realEstateNeutral, municipalNeutral, consultingNeutral]) {
    const f = parseEngineBaselineInputFixtureV1(raw); const direct = runEngineBaselineFixtureV1(f); const source = prepareOrdinaryConfiguredRunSource({ domainId: f.domainId, scenarioA: { baseRiskState: f.initialState.riskState, selectedActions: [] }, scenarioB: { baseRiskState: f.initialState.riskState, selectedActions: [] }, baselineRiskState: f.initialState.riskState });
    const boundary = runReactAnalysisBoundary({ executionMode: "configured-start", horizon: f.horizon, runSource: source });
    assert.deepEqual(scenario(boundary.analysis.scenarioA as never), direct.scenarioA); assert.deepEqual(scenario(boundary.analysis.scenarioB as never), direct.scenarioB); assert.deepEqual(scenario(boundary.analysis.baseline as never), direct.baseline); assert.deepEqual(boundary.analysis.comparison, direct.comparison); assert.deepEqual(boundary.executionProfile, direct.profileIdentity);
  }
  // React splits provenance by scenario and exposes wrapper metadata; concatenation restores engine order.
  for (const raw of [realEstateStressed, municipalStressed, consultingStressed]) {
    const f = parseEngineBaselineInputFixtureV1(raw); const direct = runEngineBaselineFixtureV1(f); const source = createCleanRunSourceSnapshot({ domainId: f.domainId, profileId: f.profileId, scenarioA: { baseRiskState: f.initialState.riskState, baseDriverScores: f.initialState.driverScores }, scenarioB: { baseRiskState: f.initialState.riskState, baseDriverScores: f.initialState.driverScores }, baseline: { baseRiskState: f.initialState.riskState, baseDriverScores: f.initialState.driverScores } });
    const boundary = runReactAnalysisBoundary({ executionMode: "actions-over-time", horizon: f.horizon, runSource: source, schedules: f.schedules as never });
    assert.deepEqual(scenario(boundary.analysis.scenarioA as never), direct.scenarioA); assert.deepEqual(scenario(boundary.analysis.scenarioB as never), direct.scenarioB); assert.deepEqual(scenario(boundary.analysis.baseline as never), direct.baseline); assert.deepEqual(boundary.analysis.comparison, direct.comparison); assert.deepEqual([...boundary.provenance.A, ...boundary.provenance.B], direct.executionProvenance); assert.deepEqual(boundary.executionProfile, direct.profileIdentity);
  }
});

test("initiative-scheduled and action-scheduled are engine-equivalent after explicit projection for all profiles", () => {
  for (const raw of [realEstateStressed, municipalStressed, consultingStressed]) {
    const fixture = parseEngineBaselineInputFixtureV1(raw);
    const actionScheduled = runEngineBaselineFixtureV1(fixture);
    const definitions = fixture.schedules.A.map(({ actionId }) => ({
      id: `initiative-${actionId}`,
      effectDefinitionId: actionId,
      prerequisites: [],
      resourceClaims: [],
    }));
    const initiativeIdByEffect = new Map(definitions.map(({ id, effectDefinitionId }) => [effectDefinitionId, id]));
    const schedule = (scenarioId: "A" | "B") => fixture.schedules[scenarioId].map(({ actionId, executionStep }) => ({
      initiativeId: initiativeIdByEffect.get(actionId) as string,
      executionStep,
    }));
    const initiativeScheduled = runInitiativeScheduledAnalysis({
      version: "initiative-scheduled-analysis-input-v1",
      executionMode: "initiative-schedule-v1",
      domainId: fixture.domainId,
      profileId: fixture.profileId,
      horizon: fixture.horizon,
      contract: { version: "structural-observation-v2", initiatives: definitions, resources: [] },
      schedules: { version: "initiative-schedule-v1", comparisonPolicy: "same-initiative-set", A: schedule("A"), B: schedule("B") },
      initialState: { initialRiskState: fixture.initialState.riskState, initialDriverScores: fixture.initialState.driverScores },
    });

    assert.deepEqual(initiativeScheduled.executionIdentity, actionScheduled.profileIdentity);
    assert.deepEqual(initiativeScenario(initiativeScheduled.scenarioA.trajectory), actionScheduled.scenarioA);
    assert.deepEqual(initiativeScenario(initiativeScheduled.scenarioB.trajectory), actionScheduled.scenarioB);
    assert.deepEqual(scenario(initiativeScheduled.baseline as never), actionScheduled.baseline);
    assert.deepEqual(initiativeScheduled.comparison, actionScheduled.comparison);

    const initiativePeriods = [...initiativeScheduled.scenarioA.executionProvenance.entries, ...initiativeScheduled.scenarioB.executionProvenance.entries].map((entry) => ({
      scenario: entry.scenario,
      effectDefinitionId: entry.effectDefinitionId as string,
      actualExecutionPeriod: entry.actualExecutionPeriod as number,
    }));
    const actionPeriods = actionScheduled.executionProvenance.map((entry) => ({
      scenario: entry.scenario === "scenarioA" ? "A" : "B",
      effectDefinitionId: entry.actionId as ActionKey,
      actualExecutionPeriod: entry.actualExecutionStep,
    }));
    assert.deepEqual(initiativePeriods, actionPeriods);
  }
  // Initiative wrappers retain contract identity and per-scenario Structural Observation
  // provenance; action scheduling retains action IDs and one combined provenance list.
});

test("Executive Demo retains existing hashes/metrics and gains separate canonical component goldens", () => {
  const result = runReactAnalysisBoundary({ executionMode: "actions-over-time", horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON, runSource: getScheduledExecutiveDemoRunSource(), schedules: SCHEDULED_EXECUTIVE_DEMO_SCHEDULES }); const a = result.analysis;
  assert.deepEqual([a.scenarioA, a.scenarioB, a.baseline].map((s) => createHash("sha256").update(JSON.stringify(s.trajectory)).digest("hex")), ["8f7834cc667d7f1c7216bf967476afb366a8c6d428f21cb98425babcd59e81cf", "28bd52f393138ed2a3994e680e6d22c5ab2255626098304a8b2afcc4b7d58eaa", "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af"]);
  const A = scenario(a.scenarioA as never), B = scenario(a.scenarioB as never), baseline = scenario(a.baseline as never);
  assert.deepEqual({ terminalStateHash: hashBaselineValueV1({ A: A.terminalState, B: B.terminalState }), marginHistoryHash: hashBaselineValueV1({ A: A.marginHistory, B: B.marginHistory }), constraintHistoryHash: hashBaselineValueV1({ A: A.constraintHistory, B: B.constraintHistory }), cascadeEventHash: hashBaselineValueV1({ A: A.cascadeHistory, B: B.cascadeHistory }), provenanceHash: hashBaselineValueV1(result.provenance), comparisonHash: hashBaselineValueV1(a.comparison), baselineHash: hashBaselineValueV1(baseline), fullProjectionHash: hashBaselineValueV1({ identity: result.executionProfile, horizon: 36, A, B, baseline, comparison: a.comparison, provenance: result.provenance }) }, { terminalStateHash: "5e3c16bbb5d7aab232cf6a866c26a80247b254beb239230f7ec0bd470d9536e6", marginHistoryHash: "2d5c2d48a1fe9ac42c832859b7f64dbf9d85a3cb27894ba96c7c925970822900", constraintHistoryHash: "c8ee9964aba6f29717e8af9d3d67543579cb84d50d5dc4c26ac4bc8c45fe6789", cascadeEventHash: "19bd4457e018b31d94dc9cc7e85823c4d498f48ba8332c149c0761f0d0c4b0e7", provenanceHash: "0c49662571a9f827d0a67a4ff388f4a95e7f91c10ea9f43a9c05351cbbae98d4", comparisonHash: "7b6992c446468c96ef85089f7ff13bb2cb26301bdbc7d66acf79cbb92ab22205", baselineHash: "7319d08c07c7bcaa3ba6e7e02fa77ed2e867b0b5a65db1fd861524f6b8cac68e", fullProjectionHash: "beb2a8d8ea2dca959e48dc7bc20b0b70c35d2f1573adc0b57531de602c0b43f9" });
  assert.deepEqual(calculateScheduledExecutiveMetrics({ marginHistoryA: a.scenarioA.marginHistory, marginHistoryB: a.scenarioB.marginHistory, terminalStateA: a.scenarioA.terminalState, terminalStateB: a.scenarioB.terminalState }), { firstDivergencePeriod: 1, maximumMarginSeparation: 6, cumulativeAbsoluteSeparation: 107.22345298061776, firstLowerClampPeriodA: 4, firstLowerClampPeriodB: 24, visibleConstraintPeriodA: 2, visibleConstraintPeriodB: 21, terminalMarginA: -3, terminalMarginB: -3, convergencePeriod: 24 }); assert.equal(a.baseline.terminalState.margin, 1);
});

test("algorithm assumptions map to output coverage without pretending to be profile fields", () => {
  const coverage = ["BOTH", "TRANSITIVE OUTPUT GOLDEN", "TRANSITIVE OUTPUT GOLDEN", "TRANSITIVE OUTPUT GOLDEN", "NOT COVERED", "BOTH", "TRANSITIVE OUTPUT GOLDEN", "BOTH"] as const;
  assert.equal(coverage.length, LEGACY_ALGORITHM_ASSUMPTIONS_V1.length); assert.equal(coverage.filter((value) => value === "NOT COVERED").length, 1);
  assert.match(LEGACY_ALGORITHM_ASSUMPTIONS_V1[4].subject, /fallback/);
});

test("output projection excludes presentation, AI, wall-clock, and Structural Observation fields", () => {
  const serialized = JSON.stringify(runEngineBaselineFixtureV1(parseEngineBaselineInputFixtureV1(realEstateStressed)));
  assert.doesNotMatch(serialized, /label|presentation|interpretation|\bai\b|createdDate|reviewedDate|structuralObservation/i);
});
