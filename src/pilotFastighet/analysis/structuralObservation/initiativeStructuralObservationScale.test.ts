import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { runCascadeAnalysis } from "../runCascadeAnalysis";
import {
  createSavedRunSnapshot,
  readSavedRunHistory,
} from "../savedRunPersistence";
import type { InitiativeScheduledAnalysisInputV1 } from "./initiativeScheduledAnalysisContract";
import { observeCompletedInitiativeStructuralAnalysis } from "./observeCompletedInitiativeStructuralAnalysis";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
} from "./runInitiativeScheduledAnalysis";

const EFFECTS = [
  "delay_maintenance",
  "early_refinancing",
  "secure_long_term_leases",
] as const satisfies readonly ActionKey[];

type Scale = 10 | 30;
type FixtureOptions = Readonly<{
  reorder?: boolean;
  changeScenario?: "A" | "B";
}>;

function reverse<T>(values: readonly T[]): T[] {
  return [...values].reverse();
}

function fixtureFor(
  count: Scale,
  options: FixtureOptions = {}
): InitiativeScheduledAnalysisInputV1 {
  const horizon = count === 10 ? 12 : 18;
  const ids = Array.from({ length: count }, (_, index) =>
    `initiative-${String(index + 1).padStart(2, "0")}`
  );
  const initiatives = ids.map((id, index) => {
    const prerequisites = index === 0
      ? []
      : index % 7 === 6
        ? [
            { initiativeId: ids[index - 3], type: "finish-to-start" as const },
            { initiativeId: ids[index - 1], type: "finish-to-start" as const },
          ]
        : [{ initiativeId: ids[index - 1], type: "finish-to-start" as const }];
    const resourceClaims = [
      { resourceId: "delivery-team", amount: 0.55, durationPeriods: 2 },
      ...(index % 2 === 0
        ? [{ resourceId: "capital", amount: 0.45, durationPeriods: 1 }]
        : []),
    ];
    return {
      id,
      effectDefinitionId: EFFECTS[index % EFFECTS.length],
      label: `Pilot initiative ${index + 1}`,
      prerequisites: options.reorder ? reverse(prerequisites) : prerequisites,
      resourceClaims: options.reorder ? reverse(resourceClaims) : resourceClaims,
    };
  });
  const periodizedCapacity = Array.from({ length: horizon }, (_, index) => ({
    period: index + 1,
    amount: index % 4 === 0 ? 0.7 : 1.1,
  }));
  const resources = [
    {
      id: "delivery-team",
      label: "Delivery team",
      capacity: { type: "constant" as const, amount: 1 },
    },
    {
      id: "capital",
      label: "Capital",
      capacity: {
        type: "periodized" as const,
        amounts: options.reorder
          ? reverse(periodizedCapacity)
          : periodizedCapacity,
      },
    },
  ];
  const periodsA = ids.map((_, index) => Math.floor(index / 2) + 1);
  const periodsB = ids.map((_, index) => Math.floor((count - 1 - index) / 2) + 1);
  if (options.changeScenario === "A") periodsA[0] += 1;
  if (options.changeScenario === "B") periodsB[count - 1] += 1;
  const schedule = (periods: readonly number[]) => ids.map((initiativeId, index) => ({
    initiativeId,
    executionStep: periods[index],
  }));
  const A = schedule(periodsA);
  const B = schedule(periodsB);

  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: options.reorder ? reverse(initiatives) : initiatives,
      resources: options.reorder ? reverse(resources) : resources,
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: options.reorder ? reverse(A) : A,
      B: options.reorder ? reverse(B) : B,
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  };
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function runChain(input: InitiativeScheduledAnalysisInputV1) {
  const totalStarted = performance.now();
  const preparationStarted = performance.now();
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(input);
  const preparationMs = performance.now() - preparationStarted;
  const executionStarted = performance.now();
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const executionMs = performance.now() - executionStarted;
  const observationStarted = performance.now();
  const completedObservation = await observeCompletedInitiativeStructuralAnalysis({
    preparedAnalysis,
    analysisResult,
  });
  const observationMs = performance.now() - observationStarted;
  const savedRun = createSavedRunSnapshot({
    snapshotId: "scale-result",
    createdAt: 1,
    engineState: analysisResult.scenarioA.trajectory.at(-1)!,
    caseId: null,
    scenario: "A",
    executionIdentity: analysisResult.executionIdentity,
    initiativeStructuralObservationIdentity: completedObservation.identity,
  });
  const restoredSavedRun = readSavedRunHistory(JSON.stringify([savedRun]))[0];
  return {
    preparedAnalysis,
    analysisResult,
    completedObservation,
    savedRun,
    restoredSavedRun,
    timing: {
      preparationMs,
      executionMs,
      observationMs,
      totalMs: performance.now() - totalStarted,
    },
  };
}

function diagnosticCounts(
  snapshots: readonly { diagnostics: readonly { code: string }[] }[]
): Record<string, number> {
  return snapshots
    .flatMap(({ diagnostics }) => diagnostics)
    .reduce<Record<string, number>>((counts, { code }) => {
      counts[code] = (counts[code] ?? 0) + 1;
      return counts;
    }, {});
}

function assertScenarioShape(
  count: Scale,
  horizon: number,
  snapshots: readonly {
    period: number;
    phase: string;
    initiatives: readonly { initiativeId: string }[];
  }[]
): void {
  assert.equal(snapshots.length, horizon * 2);
  snapshots.forEach((snapshot, index) => {
    assert.equal(snapshot.period, Math.floor(index / 2) + 1);
    assert.equal(snapshot.phase, index % 2 === 0 ? "before-execution" : "after-transition");
    assert.equal(snapshot.initiatives.length, count);
    assert.equal(new Set(snapshot.initiatives.map(({ initiativeId }) => initiativeId)).size, count);
  });
}

function assertNoDecisionSpaceScore(value: unknown): void {
  assert.doesNotMatch(JSON.stringify(value), /decisionSpaceScore/);
}

function toLegacy(input: InitiativeScheduledAnalysisInputV1) {
  const contract = input.contract as {
    initiatives: readonly { id: string; effectDefinitionId: ActionKey }[];
  };
  const schedules = input.schedules as {
    A: readonly { initiativeId: string; executionStep: number }[];
    B: readonly { initiativeId: string; executionStep: number }[];
  };
  const effects = new Map(contract.initiatives.map(({ id, effectDefinitionId }) => [id, effectDefinitionId]));
  const actions = (scenario: "A" | "B") => schedules[scenario].map(({ initiativeId, executionStep }) => ({
    actionId: effects.get(initiativeId)!,
    executionStep,
  }));
  return runCascadeAnalysis({
    executionMode: "scheduled",
    profileId: input.profileId,
    horizon: input.horizon,
    scenarioA: input.initialState,
    scenarioB: input.initialState,
    baseline: input.initialState,
    scenarioAActions: actions("A"),
    scenarioBActions: actions("B"),
  });
}

for (const count of [10, 30] as const) {
  test(`${count} initiatives complete the full V2 chain with exact scale invariants`, async () => {
    const input = fixtureFor(count);
    const inputBefore = structuredClone(input);
    const run = await runChain(input);
    const { analysisResult, completedObservation } = run;
    const horizon = input.horizon;
    const definitionIds = (input.contract as { initiatives: readonly { id: string }[] }).initiatives.map(({ id }) => id).sort();
    const idsA = analysisResult.scenarioA.executionProvenance.entries.map(({ initiativeId }) => initiativeId).sort();
    const idsB = analysisResult.scenarioB.executionProvenance.entries.map(({ initiativeId }) => initiativeId).sort();

    assert.equal(definitionIds.length, count);
    assert.deepEqual(idsA, definitionIds);
    assert.deepEqual(idsB, definitionIds);
    assert.equal(analysisResult.scenarioA.executionProvenance.entries.length, count);
    assert.equal(analysisResult.scenarioB.executionProvenance.entries.length, count);
    assertScenarioShape(count, horizon, completedObservation.result.scenarios.A);
    assertScenarioShape(count, horizon, completedObservation.result.scenarios.B);
    assert.ok(completedObservation.result.scenarios.A.every(({ scenario }) => scenario === "A"));
    assert.ok(completedObservation.result.scenarios.B.every(({ scenario }) => scenario === "B"));

    const diagnosticsA = diagnosticCounts(completedObservation.result.scenarios.A);
    const diagnosticsB = diagnosticCounts(completedObservation.result.scenarios.B);
    for (const diagnostics of [diagnosticsA, diagnosticsB]) {
      assert.ok((diagnostics["would-be-blocked"] ?? 0) > 0);
      assert.ok((diagnostics["resource-overallocated"] ?? 0) > 0);
      assert.ok((diagnostics["executed-despite-structural-block"] ?? 0) > 0);
      assert.ok((diagnostics["prerequisite-executed-same-period"] ?? 0) > 0);
    }
    assert.ok(completedObservation.result.scenarios.A.some(({ diagnostics }) =>
      diagnostics.some((diagnostic) =>
        diagnostic.code === "would-be-blocked" &&
        diagnostic.blockingReasons.some((reason) =>
          reason.code === "prerequisite-not-completed-before-start"
        )
      )
    ));
    assert.ok(completedObservation.result.scenarios.A.some(({ resourcePressure }) =>
      resourcePressure.some((resource) =>
        resource.overallocated &&
        resource.contributingInitiativeIds.some((initiativeId) =>
          !resource.startingInitiativeIds.includes(initiativeId)
        )
      )
    ));
    assert.ok(EFFECTS.some((effect) =>
      analysisResult.scenarioA.executionProvenance.entries.filter(
        ({ effectDefinitionId }) => effectDefinitionId === effect
      ).length > 1
    ));
    assert.equal(completedObservation.identity.structuralDefinitionFingerprint.length, 64);
    assert.match(completedObservation.identity.structuralDefinitionFingerprint, /^[0-9a-f]{64}$/);
    assert.deepEqual(run.restoredSavedRun.initiativeStructuralObservationIdentity, completedObservation.identity);
    assert.equal("structuralObservationIdentity" in run.savedRun, false);
    assert.equal("result" in run.savedRun, false);
    assert.doesNotMatch(JSON.stringify(run.savedRun), /diagnostics|snapshots/);
    assertNoDecisionSpaceScore(completedObservation.result);
    assert.equal("structuralMargin" in completedObservation.result, false);
    assert.deepEqual(input, inputBefore);
    assert.equal(Object.isFrozen(input), false);
    assert.equal(Object.isFrozen(completedObservation), true);

    const legacy = toLegacy(input);
    assert.deepEqual(analysisResult.scenarioA.trajectory, legacy.scenarioA.trajectory);
    assert.deepEqual(analysisResult.scenarioB.trajectory, legacy.scenarioB.trajectory);
    assert.deepEqual(analysisResult.baseline, legacy.baseline);
    assert.deepEqual(analysisResult.comparison, legacy.comparison);

    console.log(JSON.stringify({
      scale: count,
      horizon,
      definitions: definitionIds.length,
      plannedPerScenario: idsA.length,
      provenancePerScenario: idsA.length,
      snapshotsPerScenario: completedObservation.result.scenarios.A.length,
      initiativeSnapshotEntries: count * horizon * 2 * 2,
      diagnostics: { A: diagnosticsA, B: diagnosticsB },
      bytes: {
        analysisResult: byteLength(analysisResult),
        completedObservation: byteLength(completedObservation),
        savedRun: byteLength(run.savedRun),
      },
    }));
  });

  test(`${count} initiatives are deterministic and invariant to semantic array reordering`, async () => {
    const input = fixtureFor(count);
    const reorderedInput = fixtureFor(count, { reorder: true });
    const first = await runChain(input);
    const second = await runChain(input);
    const reordered = await runChain(reorderedInput);
    assert.deepEqual(second.analysisResult, first.analysisResult);
    assert.deepEqual(second.completedObservation, first.completedObservation);
    assert.deepEqual(reordered.analysisResult, first.analysisResult);
    assert.deepEqual(reordered.completedObservation, first.completedObservation);
    assert.deepEqual(reordered.completedObservation.identity, first.completedObservation.identity);
    assert.notStrictEqual(second.analysisResult, first.analysisResult);
    assert.notStrictEqual(second.completedObservation, first.completedObservation);
  });

  test(`${count} initiatives retain isolated A/B plan identity dimensions`, async () => {
    const base = await runChain(fixtureFor(count));
    const changedA = await runChain(fixtureFor(count, { changeScenario: "A" }));
    const changedB = await runChain(fixtureFor(count, { changeScenario: "B" }));
    assert.equal(changedA.completedObservation.identity.structuralDefinitionFingerprint, base.completedObservation.identity.structuralDefinitionFingerprint);
    assert.notEqual(changedA.completedObservation.identity.scenarioPlanFingerprintA, base.completedObservation.identity.scenarioPlanFingerprintA);
    assert.equal(changedA.completedObservation.identity.scenarioPlanFingerprintB, base.completedObservation.identity.scenarioPlanFingerprintB);
    assert.equal(changedB.completedObservation.identity.structuralDefinitionFingerprint, base.completedObservation.identity.structuralDefinitionFingerprint);
    assert.equal(changedB.completedObservation.identity.scenarioPlanFingerprintA, base.completedObservation.identity.scenarioPlanFingerprintA);
    assert.notEqual(changedB.completedObservation.identity.scenarioPlanFingerprintB, base.completedObservation.identity.scenarioPlanFingerprintB);
  });
}

test("warm pilot-scale timings stay bounded and report median and maximum by stage", async () => {
  for (const count of [10, 30] as const) {
    await runChain(fixtureFor(count));
    const samples: Array<Awaited<ReturnType<typeof runChain>>["timing"]> = [];
    for (let iteration = 0; iteration < 3; iteration += 1) {
      samples.push((await runChain(fixtureFor(count))).timing);
    }
    const summary = Object.fromEntries(
      (["preparationMs", "executionMs", "observationMs", "totalMs"] as const).map((stage) => {
        const values = samples.map((sample) => sample[stage]);
        return [stage, {
          median: Number(median(values).toFixed(3)),
          max: Number(Math.max(...values).toFixed(3)),
        }];
      })
    );
    console.log(JSON.stringify({ scale: count, warmRuns: samples.length, timingMs: summary }));
    if (count === 30) {
      assert.ok(samples.every(({ totalMs }) => totalMs < 10_000));
    }
  }
});
