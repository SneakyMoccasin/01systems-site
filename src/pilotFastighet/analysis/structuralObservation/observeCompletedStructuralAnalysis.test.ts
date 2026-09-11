import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import {
  resolveExecutableDomainProfile,
} from "../../executableDomainProfile";
import { defaultRiskState } from "../../presetRiskMapping";
import {
  getScheduledExecutiveDemoRunSource,
  SCHEDULED_EXECUTIVE_DEMO_HORIZON,
  SCHEDULED_EXECUTIVE_DEMO_SCHEDULES,
} from "../../scheduledExecutiveDemo";
import {
  createCleanRunSourceSnapshot,
  runReactAnalysisBoundary,
  type ScenarioSchedules,
} from "../reactScheduledAnalysisBoundary";
import {
  createSavedRunSnapshot,
  evaluateSavedRunCompatibility,
  evaluateSavedRunStructuralObservationCompatibility,
  readSavedRunHistory,
} from "../savedRunPersistence";
import { buildStructuralObservationFingerprints } from "./structuralObservationFingerprints";
import { createStructuralObservationIdentity } from "./structuralObservationIdentity";
import {
  observeCompletedStructuralAnalysis,
  type CompletedStructuralObservation,
} from "./observeCompletedStructuralAnalysis";
import {
  prepareStructuralObservationRun,
  StructuralObservationPreparationError,
} from "./prepareStructuralObservationRun";

const executiveProfile = resolveExecutableDomainProfile(
  "legacy-real-estate-v1",
  "realEstate"
);
const observedSchedules: ScenarioSchedules = {
  A: [
    { actionId: "delay_maintenance", executionStep: 1 },
    { actionId: "early_refinancing", executionStep: 9 },
    { actionId: "secure_long_term_leases", executionStep: 9 },
  ],
  B: [
    { actionId: "early_refinancing", executionStep: 1 },
    { actionId: "secure_long_term_leases", executionStep: 3 },
    { actionId: "delay_maintenance", executionStep: 18 },
  ],
};

function observationContract(labels = ["Delay", "Refinance", "Leases", "Team"]) {
  return {
    version: "structural-observation-v1",
    initiatives: [
      {
        id: "delay",
        actionKey: "delay_maintenance",
        label: labels[0],
        prerequisites: [],
        resourceClaims: [
          { resourceId: "team", amount: 0.6, durationPeriods: 10 },
        ],
      },
      {
        id: "refinance",
        actionKey: "early_refinancing",
        label: labels[1],
        prerequisites: [
          { initiativeId: "leases", type: "finish-to-start" },
        ],
        resourceClaims: [
          { resourceId: "team", amount: 0.6, durationPeriods: 2 },
        ],
      },
      {
        id: "leases",
        actionKey: "secure_long_term_leases",
        label: labels[2],
        prerequisites: [
          { initiativeId: "delay", type: "finish-to-start" },
        ],
        resourceClaims: [
          { resourceId: "team", amount: 0.6, durationPeriods: 2 },
        ],
      },
    ],
    resources: [
      {
        id: "team",
        label: labels[3],
        capacity: { type: "constant", amount: 1 },
      },
    ],
    scenarioBindings: [
      { scenario: "A", initiativeId: "delay" },
      { scenario: "A", initiativeId: "refinance" },
      { scenario: "A", initiativeId: "leases" },
      { scenario: "B", initiativeId: "delay" },
      { scenario: "B", initiativeId: "refinance" },
      { scenario: "B", initiativeId: "leases" },
    ],
  } as const;
}

function executeExecutive(schedules = observedSchedules) {
  return runReactAnalysisBoundary({
    executionMode: "actions-over-time",
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    runSource: getScheduledExecutiveDemoRunSource(),
    schedules,
  });
}

function executeTransport() {
  const profile = resolveExecutableDomainProfile(
    "legacy-municipal-v1",
    "municipal"
  );
  const initialRiskState = structuredClone(defaultRiskState);
  const initialDriverScores = buildDriverScoreState(initialRiskState);
  const runSource = createCleanRunSourceSnapshot({
    domainId: "municipal",
    profileId: profile.profileId,
    scenarioA: { baseRiskState: initialRiskState, baseDriverScores: initialDriverScores },
    scenarioB: { baseRiskState: initialRiskState, baseDriverScores: initialDriverScores },
    baseline: { baseRiskState: initialRiskState, baseDriverScores: initialDriverScores },
  });
  const schedules: ScenarioSchedules = {
    A: [
      { actionId: "increase_service_frequency", executionStep: 1 },
      { actionId: "reduce_travel_time", executionStep: 3 },
    ],
    B: [{ actionId: "expand_cycling_infrastructure", executionStep: 2 }],
  };
  return {
    profile,
    schedules,
    horizon: 3,
    result: runReactAnalysisBoundary({
      executionMode: "actions-over-time",
      horizon: 3,
      runSource,
      schedules,
    }),
  };
}

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

function assertDeeplyFrozen(value: unknown): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    assertDeeplyFrozen(nested);
  }
}

function frame(
  observation: CompletedStructuralObservation,
  scenario: "A" | "B",
  period: number,
  phase: "before-execution" | "after-transition"
) {
  return observation.result.scenarios[scenario].find(
    (snapshot) => snapshot.period === period && snapshot.phase === phase
  )!;
}

test("legacy scheduled and Executive analyses return null without a declared contract", async () => {
  const transport = executeTransport();
  const executive = executeExecutive();
  for (const input of [
    {
      profile: transport.profile,
      schedules: transport.schedules,
      horizon: transport.horizon,
      analysisResult: transport.result,
    },
    {
      profile: executiveProfile,
      schedules: observedSchedules,
      horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
      analysisResult: executive,
    },
  ]) {
    const before = serialized(input);
    assert.equal(await observeCompletedStructuralAnalysis(input), null);
    assert.equal(serialized(input), before);
  }
});

test("present null, malformed, and invalid contracts never become empty metadata", async () => {
  const analysisResult = executeExecutive();
  const base = {
    profile: executiveProfile,
    schedules: observedSchedules,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult,
  };
  for (const contract of [null, {}, { version: "structural-observation-v1" }]) {
    await assert.rejects(
      observeCompletedStructuralAnalysis({ ...base, contract }),
      StructuralObservationPreparationError
    );
  }
});

test("one explicit real-result fixture produces phase-safe structural observation", async () => {
  const analysisResult = executeExecutive();
  const observation = await observeCompletedStructuralAnalysis({
    contract: observationContract(),
    profile: executiveProfile,
    schedules: observedSchedules,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult,
  });
  assert.ok(observation);
  assert.equal(observation.result.scenarios.A.length, 72);
  assert.equal(observation.result.scenarios.B.length, 72);
  for (const scenario of ["A", "B"] as const) {
    assert.deepEqual(
      observation.result.scenarios[scenario].slice(0, 4).map(({ period, phase }) => [period, phase]),
      [[1, "before-execution"], [1, "after-transition"], [2, "before-execution"], [2, "after-transition"]]
    );
  }
  const aBeforeM9 = frame(observation, "A", 9, "before-execution");
  const aAfterM9 = frame(observation, "A", 9, "after-transition");
  assert.deepEqual(aBeforeM9.diagnostics.map(({ code }) => code), [
    "would-be-blocked",
    "would-be-blocked",
    "resource-overallocated",
  ]);
  assert.deepEqual(aAfterM9.diagnostics.map(({ code }) => code), [
    "executed-despite-structural-block",
    "executed-despite-structural-block",
    "prerequisite-executed-same-period",
  ]);
  assert.equal(
    aAfterM9.initiatives.find(({ initiativeId }) => initiativeId === "refinance")?.executionStatus,
    "executed-despite-structural-block"
  );
  assert.notDeepEqual(observation.result.scenarios.A, observation.result.scenarios.B);
  assert.equal(serialized(observation).includes("decisionSpaceScore"), false);
  assert.equal(aBeforeM9.engineContext?.structuralMargin, analysisResult.analysis.scenarioA.marginHistory[7]);
  assert.equal(
    frame(observation, "A", 1, "before-execution").initiatives.some(
      ({ visibleActualExecutionPeriod }) => visibleActualExecutionPeriod !== null
    ),
    false
  );
  for (const snapshot of [
    ...observation.result.scenarios.A,
    ...observation.result.scenarios.B,
  ]) {
    assert.equal("structuralMargin" in snapshot, false);
    for (const initiative of snapshot.initiatives) {
      if (initiative.visibleActualExecutionPeriod === null) continue;
      assert.ok(
        snapshot.phase === "before-execution"
          ? initiative.visibleActualExecutionPeriod < snapshot.period
          : initiative.visibleActualExecutionPeriod <= snapshot.period
      );
    }
  }
  assertDeeplyFrozen(observation);
});

test("orchestration uses one prepared input for snapshots, fingerprints, and identity", async () => {
  const analysisResult = executeExecutive();
  const contract = observationContract();
  const input = {
    contract,
    profile: executiveProfile,
    schedules: observedSchedules,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult,
  };
  const prepared = prepareStructuralObservationRun(input);
  const fingerprints = await buildStructuralObservationFingerprints(prepared);
  const expectedIdentity = createStructuralObservationIdentity({
    fingerprints,
    horizon: prepared.horizon,
  });
  const first = await observeCompletedStructuralAnalysis(input);
  const second = await observeCompletedStructuralAnalysis(input);
  assert.deepEqual(first?.identity, expectedIdentity);
  assert.deepEqual(first, second);

  const relabeled = await observeCompletedStructuralAnalysis({
    ...input,
    contract: observationContract(["A", "B", "C", "D"]),
  });
  assert.deepEqual(relabeled?.identity, first?.identity);
  const changed = structuredClone(contract) as unknown as {
    resources: Array<{ capacity: { amount: number } }>;
  };
  changed.resources[0].capacity.amount = 1.1;
  const changedObservation = await observeCompletedStructuralAnalysis({
    ...input,
    contract: changed,
  });
  assert.notEqual(
    changedObservation?.identity.structuralDefinitionFingerprint,
    first?.identity.structuralDefinitionFingerprint
  );
  assert.equal(
    changedObservation?.identity.scenarioPlanFingerprintA,
    first?.identity.scenarioPlanFingerprintA
  );
});

test("observation leaves complete canonical analysis and Executive goldens unchanged", async () => {
  const analysisResult = executeExecutive();
  const contract = observationContract();
  const schedulesBefore = structuredClone(observedSchedules);
  const contractBefore = structuredClone(contract);
  const profileBefore = serialized(executiveProfile);
  const resultBefore = serialized(analysisResult);
  const hashesBefore = [
    analysisResult.analysis.scenarioA,
    analysisResult.analysis.scenarioB,
    analysisResult.analysis.baseline,
  ].map((scenario) =>
    createHash("sha256").update(JSON.stringify(scenario.trajectory)).digest("hex")
  );
  await observeCompletedStructuralAnalysis({
    contract,
    profile: executiveProfile,
    schedules: observedSchedules,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult,
  });
  assert.equal(serialized(analysisResult), resultBefore);
  assert.deepEqual(observedSchedules, schedulesBefore);
  assert.deepEqual(contract, contractBefore);
  assert.equal(serialized(executiveProfile), profileBefore);
  assert.equal(Object.isFrozen(contract), false);
  assert.deepEqual(hashesBefore, [
    "6470b46ef3132835215db7ea0376942dbffb079d8131825919dd79618d054169",
    "28bd52f393138ed2a3994e680e6d22c5ab2255626098304a8b2afcc4b7d58eaa",
    "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af",
  ]);

  const canonicalExecutive = executeExecutive(SCHEDULED_EXECUTIVE_DEMO_SCHEDULES);
  const canonicalBefore = serialized(canonicalExecutive);
  const canonicalHashes = [
    canonicalExecutive.analysis.scenarioA,
    canonicalExecutive.analysis.scenarioB,
    canonicalExecutive.analysis.baseline,
  ].map((scenario) =>
    createHash("sha256").update(JSON.stringify(scenario.trajectory)).digest("hex")
  );
  await observeCompletedStructuralAnalysis({
    contract,
    profile: executiveProfile,
    schedules: SCHEDULED_EXECUTIVE_DEMO_SCHEDULES,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult: canonicalExecutive,
  });
  assert.equal(serialized(canonicalExecutive), canonicalBefore);
  assert.deepEqual(canonicalHashes, [
    "8f7834cc667d7f1c7216bf967476afb366a8c6d428f21cb98425babcd59e81cf",
    "28bd52f393138ed2a3994e680e6d22c5ab2255626098304a8b2afcc4b7d58eaa",
    "1e7db269401dc69bf753771fe5708657ac2c6669932a3d1c7ef1c6109777f1af",
  ]);

  const transport = executeTransport();
  const transportBefore = serialized(transport.result);
  assert.equal(
    await observeCompletedStructuralAnalysis({
      profile: transport.profile,
      schedules: transport.schedules,
      horizon: transport.horizon,
      analysisResult: transport.result,
    }),
    null
  );
  assert.equal(serialized(transport.result), transportBefore);
});

test("returned identity round-trips without changing engine compatibility", async () => {
  const analysisResult = executeExecutive();
  const observation = await observeCompletedStructuralAnalysis({
    contract: observationContract(),
    profile: executiveProfile,
    schedules: observedSchedules,
    horizon: SCHEDULED_EXECUTIVE_DEMO_HORIZON,
    analysisResult,
  });
  assert.ok(observation);
  const save = (scenario: "A" | "B") =>
    createSavedRunSnapshot({
      snapshotId: scenario,
      createdAt: 1,
      engineState:
        scenario === "A"
          ? analysisResult.analysis.scenarioA.terminalState
          : analysisResult.analysis.scenarioB.terminalState,
      caseId: null,
      scenario,
      executionIdentity: analysisResult.executionProfile,
      structuralObservationIdentity: observation.identity,
    });
  const restored = readSavedRunHistory(JSON.stringify([save("A"), save("B")]));
  assert.deepEqual(restored.map(({ structuralObservationIdentity }) => structuralObservationIdentity), [
    observation.identity,
    observation.identity,
  ]);
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(restored[0], restored[1]).classification,
    "compatible"
  );
  assert.equal(evaluateSavedRunCompatibility(restored[0], restored[1]).classification, "compatible");
  assert.equal(serialized(restored).includes("snapshots"), false);
  assert.equal(serialized(restored).includes("diagnostics"), false);
});

test("production orchestrator composes builders and never imports an execution path", () => {
  const source = readFileSync(
    "src/pilotFastighet/analysis/structuralObservation/observeCompletedStructuralAnalysis.ts",
    "utf8"
  );
  for (const required of [
    "prepareStructuralObservationRun",
    "buildDecisionSpaceSnapshots",
    "buildStructuralObservationFingerprints",
    "createStructuralObservationIdentity",
  ]) {
    assert.match(source, new RegExp(required));
  }
  assert.doesNotMatch(
    source,
    /runCascadeAnalysis|runReactAnalysisBoundary|RealEstateEngine|stepForward|localStorage|app\/pilot-fastighet/
  );
});
