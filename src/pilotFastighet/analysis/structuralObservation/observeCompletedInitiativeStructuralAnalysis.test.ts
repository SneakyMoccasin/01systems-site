import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { buildInitiativeDecisionSpaceSnapshots } from "./buildInitiativeDecisionSpaceSnapshots";
import { buildInitiativeStructuralObservationFingerprints } from "./initiativeStructuralObservationFingerprints";
import { createInitiativeStructuralObservationIdentity } from "./initiativeStructuralObservationIdentity";
import type { InitiativeScheduledAnalysisInputV1 } from "./initiativeScheduledAnalysisContract";
import {
  observeCompletedInitiativeStructuralAnalysis,
} from "./observeCompletedInitiativeStructuralAnalysis";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
} from "./runInitiativeScheduledAnalysis";

type InputOptions = Readonly<{
  labels?: readonly [string, string, string];
  horizon?: number;
  firstEffect?: string;
  aPeriods?: readonly [number, number, number];
  bPeriods?: readonly [number, number, number];
  reverse?: boolean;
}>;

function rawInput(options: InputOptions = {}): InitiativeScheduledAnalysisInputV1 {
  const labels = options.labels ?? ["Foundation", "Parallel", "Dependent"];
  const horizon = options.horizon ?? 4;
  const initiatives = [
    {
      id: "foundation",
      effectDefinitionId: options.firstEffect ?? "early_refinancing",
      label: labels[0],
      prerequisites: [],
      resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 2 }],
    },
    {
      id: "parallel",
      effectDefinitionId: "early_refinancing",
      label: labels[1],
      prerequisites: [],
      resourceClaims: [{ resourceId: "team", amount: 0.6, durationPeriods: 2 }],
    },
    {
      id: "dependent",
      effectDefinitionId: "secure_long_term_leases",
      label: labels[2],
      prerequisites: [{ initiativeId: "foundation", type: "finish-to-start" as const }],
      resourceClaims: [],
    },
  ];
  const aPeriods = options.aPeriods ?? [1, 1, 1];
  const bPeriods = options.bPeriods ?? [1, 2, 3];
  const schedule = (periods: readonly [number, number, number]) => [
    { initiativeId: "foundation", executionStep: periods[0] },
    { initiativeId: "parallel", executionStep: periods[1] },
    { initiativeId: "dependent", executionStep: periods[2] },
  ];
  const A = schedule(aPeriods);
  const B = schedule(bPeriods);
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: options.reverse ? [...initiatives].reverse() : initiatives,
      resources: [{ id: "team", label: "Team", capacity: { type: "constant", amount: 1 } }],
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: options.reverse ? [...A].reverse() : A,
      B: options.reverse ? [...B].reverse() : B,
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  } as InitiativeScheduledAnalysisInputV1;
}

function completed(options: InputOptions = {}) {
  const input = rawInput(options);
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(input);
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  return { input, preparedAnalysis, analysisResult };
}

test("orchestrates the complete V2 result with only result and identity", async () => {
  const source = completed();
  const observed = await observeCompletedInitiativeStructuralAnalysis(source);
  assert.deepEqual(Object.keys(observed).sort(), ["identity", "result"]);
  assert.equal(observed.result.version, "structural-observation-v2");
  assert.equal(observed.result.scenarios.A.length, 8);
  assert.equal(observed.result.scenarios.B.length, 8);
  assert.deepEqual(observed.result.scenarios.A.map(({ period, phase }) => [period, phase]), [
    [1, "before-execution"], [1, "after-transition"],
    [2, "before-execution"], [2, "after-transition"],
    [3, "before-execution"], [3, "after-transition"],
    [4, "before-execution"], [4, "after-transition"],
  ]);
  assert.deepEqual(Object.keys(observed.identity).sort(), [
    "canonicalizationVersion", "definitionPayloadVersion", "fingerprintAlgorithm",
    "fingerprintsVersion", "horizon", "resultSchemaVersion", "scenarioPlanFingerprintA",
    "scenarioPlanFingerprintB", "scenarioPlanPayloadVersion", "structuralDefinitionFingerprint",
    "structuralObservationSchemaVersion", "version",
  ]);
});

test("keeps evidence phase-safe and same-effect initiative instances separate", async () => {
  const observed = await observeCompletedInitiativeStructuralAnalysis(completed());
  const beforeA1 = observed.result.scenarios.A[0];
  const afterA1 = observed.result.scenarios.A[1];
  assert.ok(beforeA1.initiatives.every(({ visibleActualExecutionPeriod }) => visibleActualExecutionPeriod === null));
  assert.deepEqual(afterA1.initiatives.map(({ initiativeId, visibleActualExecutionPeriod }) => [initiativeId, visibleActualExecutionPeriod]), [
    ["dependent", 1], ["foundation", 1], ["parallel", 1],
  ]);
  assert.equal(afterA1.initiatives.filter(({ effectDefinitionId }) => effectDefinitionId === "early_refinancing").length, 2);
  assert.ok(beforeA1.initiatives.every(({ executionStatus }) => executionStatus === "not-executed"));
  assert.ok(afterA1.initiatives.every(({ executionStatus }) => executionStatus === "executed-despite-structural-block"));
});

test("keeps diagnostics snapshot-local, phase-bound, and scenario-isolated", async () => {
  const observed = await observeCompletedInitiativeStructuralAnalysis(completed());
  const aBefore = observed.result.scenarios.A[0].diagnostics;
  const aAfter = observed.result.scenarios.A[1].diagnostics;
  assert.ok(aBefore.some(({ code }) => code === "would-be-blocked"));
  assert.ok(aBefore.some(({ code }) => code === "resource-overallocated"));
  assert.ok(aAfter.some(({ code }) => code === "executed-despite-structural-block"));
  assert.ok(aAfter.some(({ code }) => code === "prerequisite-executed-same-period"));
  assert.ok(aBefore.every(({ scenario }) => scenario === "A"));
  assert.ok(aAfter.every(({ scenario }) => scenario === "A"));
  assert.ok(observed.result.scenarios.B.flatMap(({ diagnostics }) => diagnostics).every(({ scenario }) => scenario === "B"));
  assert.equal(observed.result.scenarios.A.slice(2).some(({ diagnostics }) => diagnostics.some((diagnostic) => "initiativeId" in diagnostic && diagnostic.initiativeId === "dependent")), false);
});

test("contains Structural Margin only as engine context and no numerical Decision Space score", async () => {
  const observed = await observeCompletedInitiativeStructuralAnalysis(completed());
  const serialized = JSON.stringify(observed);
  assert.doesNotMatch(serialized, /decisionSpaceScore/);
  assert.equal(observed.result.scenarios.A[0].engineContext, null);
  assert.equal(typeof observed.result.scenarios.A[1].engineContext?.structuralMargin, "number");
  assert.equal("structuralMargin" in observed.result, false);
});

test("identity exactly matches direct builders using the same prepared observation", async () => {
  const source = completed();
  const prepared = prepareInitiativeStructuralObservationRun(source);
  const directResult = buildInitiativeDecisionSpaceSnapshots(prepared);
  const fingerprints = await buildInitiativeStructuralObservationFingerprints(prepared);
  const directIdentity = createInitiativeStructuralObservationIdentity({ fingerprints, horizon: prepared.horizon });
  const observed = await observeCompletedInitiativeStructuralAnalysis(source);
  assert.deepEqual(observed.result, directResult);
  assert.deepEqual(observed.identity, directIdentity);
});

test("labels and source ordering are neutral while semantic changes affect only their identity dimensions", async () => {
  const base = await observeCompletedInitiativeStructuralAnalysis(completed());
  const relabeled = await observeCompletedInitiativeStructuralAnalysis(completed({ labels: ["A", "B", "C"] }));
  const reordered = await observeCompletedInitiativeStructuralAnalysis(completed({ reverse: true }));
  assert.deepEqual(relabeled.identity, base.identity);
  assert.deepEqual(reordered, base);

  const definition = await observeCompletedInitiativeStructuralAnalysis(completed({ firstEffect: "delay_maintenance" }));
  assert.notEqual(definition.identity.structuralDefinitionFingerprint, base.identity.structuralDefinitionFingerprint);
  assert.equal(definition.identity.scenarioPlanFingerprintA, base.identity.scenarioPlanFingerprintA);
  assert.equal(definition.identity.scenarioPlanFingerprintB, base.identity.scenarioPlanFingerprintB);

  const changedA = await observeCompletedInitiativeStructuralAnalysis(completed({ aPeriods: [1, 2, 2] }));
  assert.notEqual(changedA.identity.scenarioPlanFingerprintA, base.identity.scenarioPlanFingerprintA);
  assert.equal(changedA.identity.scenarioPlanFingerprintB, base.identity.scenarioPlanFingerprintB);
  assert.equal(changedA.identity.structuralDefinitionFingerprint, base.identity.structuralDefinitionFingerprint);

  const changedB = await observeCompletedInitiativeStructuralAnalysis(completed({ bPeriods: [1, 3, 4] }));
  assert.equal(changedB.identity.scenarioPlanFingerprintA, base.identity.scenarioPlanFingerprintA);
  assert.notEqual(changedB.identity.scenarioPlanFingerprintB, base.identity.scenarioPlanFingerprintB);

  const horizon = await observeCompletedInitiativeStructuralAnalysis(completed({ horizon: 5 }));
  assert.notEqual(horizon.identity.scenarioPlanFingerprintA, base.identity.scenarioPlanFingerprintA);
  assert.notEqual(horizon.identity.scenarioPlanFingerprintB, base.identity.scenarioPlanFingerprintB);
  assert.equal(horizon.identity.structuralDefinitionFingerprint, base.identity.structuralDefinitionFingerprint);
});

test("observation preserves completed execution, provenance, baseline, and comparison", async () => {
  const source = completed();
  const before = structuredClone(source.analysisResult);
  await observeCompletedInitiativeStructuralAnalysis(source);
  assert.deepEqual(source.analysisResult, before);
  assert.deepEqual(source.analysisResult.scenarioA.trajectory, before.scenarioA.trajectory);
  assert.deepEqual(source.analysisResult.scenarioB.trajectory, before.scenarioB.trajectory);
  assert.deepEqual(source.analysisResult.scenarioA.executionProvenance, before.scenarioA.executionProvenance);
  assert.deepEqual(source.analysisResult.scenarioB.executionProvenance, before.scenarioB.executionProvenance);
  assert.deepEqual(source.analysisResult.baseline, before.baseline);
  assert.deepEqual(source.analysisResult.comparison, before.comparison);
});

test("result is deterministic, detached, recursively frozen, and leaves callers mutable", async () => {
  const source = completed();
  const inputBefore = structuredClone(source.input);
  const resultBefore = structuredClone(source.analysisResult);
  const resultWasFrozen = Object.isFrozen(source.analysisResult);
  const first = await observeCompletedInitiativeStructuralAnalysis(source);
  const second = await observeCompletedInitiativeStructuralAnalysis(source);
  assert.deepEqual(first, second);
  assert.deepEqual(source.input, inputBefore);
  assert.deepEqual(source.analysisResult, resultBefore);
  assert.equal(Object.isFrozen(source.input), false);
  assert.equal(Object.isFrozen(source.analysisResult), resultWasFrozen);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.result), true);
  assert.equal(Object.isFrozen(first.result.scenarios.A[0].initiatives[0]), true);
  assert.notStrictEqual(first.result.scenarios.A, source.analysisResult.scenarioA.trajectory);
});

test("contradictory prepared/result pairs fail atomically", async () => {
  const first = completed();
  const second = completed({ horizon: 5 });
  await assert.rejects(
    observeCompletedInitiativeStructuralAnalysis({
      preparedAnalysis: first.preparedAnalysis,
      analysisResult: second.analysisResult,
    }),
    /analysis horizon does not match prepared horizon/
  );
});

test("production orchestrator only composes the approved completed-analysis builders", () => {
  const source = readFileSync(new URL("./observeCompletedInitiativeStructuralAnalysis.ts", import.meta.url), "utf8");
  assert.match(source, /prepareInitiativeStructuralObservationRun\(input\)/);
  assert.match(source, /buildInitiativeDecisionSpaceSnapshots\(prepared\)/);
  assert.match(source, /buildInitiativeStructuralObservationFingerprints\(prepared\)/);
  assert.match(source, /horizon: prepared\.horizon/);
  assert.doesNotMatch(source, /runInitiativeScheduledAnalysis|prepareInitiativeScheduledAnalysis|RealEstateEngine|stepForward|runCascadeAnalysis|savedRun|localStorage|enforce/);
});
