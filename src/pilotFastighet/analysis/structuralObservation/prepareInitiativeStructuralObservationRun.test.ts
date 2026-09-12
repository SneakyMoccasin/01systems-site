import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import { constraintSourceStepToDisplayedPeriod } from "../periodPresentation";
import {
  prepareInitiativeStructuralObservationRun,
  type PreparedInitiativeStructuralObservationRunV2,
} from "./prepareInitiativeStructuralObservationRun";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
  type InitiativeScheduledAnalysisResultV1,
  type PreparedInitiativeScheduledAnalysisV1,
} from "./runInitiativeScheduledAnalysis";

type Entry = Readonly<{
  id: string;
  effect: ActionKey;
  periodA: number;
  periodB: number;
}>;

const entries = [
  { id: "maintenance", effect: "delay_maintenance", periodA: 1, periodB: 8 },
  { id: "refinancing-1", effect: "early_refinancing", periodA: 1, periodB: 1 },
  { id: "refinancing-2", effect: "early_refinancing", periodA: 3, periodB: 1 },
  { id: "leases", effect: "secure_long_term_leases", periodA: 8, periodB: 3 },
] as const satisfies readonly Entry[];

function rawInput(
  fixtureEntries: readonly Entry[] = entries,
  horizon = 12
): InitiativeScheduledAnalysisInputV1 {
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: [
        ...fixtureEntries.map(({ id, effect }) => ({
          id,
          effectDefinitionId: effect,
          prerequisites: [],
          resourceClaims: [],
        })),
        {
          id: "unbound",
          effectDefinitionId: "reduce_leverage",
          prerequisites: [],
          resourceClaims: [],
        },
      ],
      resources: [],
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: fixtureEntries.map(({ id, periodA }) => ({ initiativeId: id, executionStep: periodA })),
      B: fixtureEntries.map(({ id, periodB }) => ({ initiativeId: id, executionStep: periodB })),
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  };
}

function execute(input = rawInput()) {
  const preparedAnalysis = prepareInitiativeScheduledAnalysis(input);
  const analysisResult = runPreparedInitiativeScheduledAnalysis(preparedAnalysis);
  const observation = prepareInitiativeStructuralObservationRun({
    preparedAnalysis,
    analysisResult,
  });
  return { preparedAnalysis, analysisResult, observation };
}

function mutablePrepared(
  value: PreparedInitiativeScheduledAnalysisV1
): PreparedInitiativeScheduledAnalysisV1 {
  return structuredClone(value) as PreparedInitiativeScheduledAnalysisV1;
}

function mutableResult(
  value: InitiativeScheduledAnalysisResultV1
): InitiativeScheduledAnalysisResultV1 {
  return structuredClone(value) as InitiativeScheduledAnalysisResultV1;
}

test("prepares a versioned V2 observation from the exact prepared analysis", () => {
  const { preparedAnalysis, observation } = execute();
  assert.equal(observation.preparationVersion, "structural-observation-preparation-v2");
  assert.deepEqual(observation.contract, preparedAnalysis.contract);
  assert.deepEqual(observation.schedules, preparedAnalysis.schedules);
  assert.deepEqual(observation.resolvedSchedules, preparedAnalysis.resolvedSchedules);
  assert.deepEqual(observation.executionIdentity, preparedAnalysis.executionIdentity);
  assert.equal(observation.horizon, preparedAnalysis.horizon);
  assert.deepEqual(Object.keys(observation).sort(), [
    "contract",
    "executionIdentity",
    "horizon",
    "preparationVersion",
    "resolvedSchedules",
    "scenarios",
    "schedules",
  ]);
});

test("builds exactly two phase-ordered frames per period and scenario", () => {
  const { observation } = execute();
  for (const scenario of ["A", "B"] as const) {
    const frames = observation.scenarios[scenario].frames;
    assert.equal(frames.length, observation.horizon * 2);
    assert.deepEqual(
      frames.map(({ period, phase }) => `${period}:${phase}`),
      Array.from({ length: observation.horizon }, (_, index) => [
        `${index + 1}:before-execution`,
        `${index + 1}:after-transition`,
      ]).flat()
    );
  }
});

test("engine context uses the previous state before and current state after", () => {
  const { analysisResult, observation } = execute();
  const frames = observation.scenarios.A.frames;
  assert.equal(frames[0].engineContext, null);
  for (let period = 1; period <= observation.horizon; period += 1) {
    const before = frames[(period - 1) * 2];
    const after = frames[(period - 1) * 2 + 1];
    if (period > 1) {
      assert.equal(before.engineContext?.engineStateStep, analysisResult.scenarioA.trajectory[period - 2].step);
      assert.equal(before.engineContext?.structuralMargin, analysisResult.scenarioA.trajectory[period - 2].margin);
    }
    assert.equal(after.engineContext?.engineStateStep, analysisResult.scenarioA.trajectory[period - 1].step);
    assert.equal(after.engineContext?.structuralMargin, analysisResult.scenarioA.trajectory[period - 1].margin);
  }
});

test("before and after visibility is phase-safe with no future evidence", () => {
  const { observation } = execute();
  for (const scenario of ["A", "B"] as const) {
    for (const frame of observation.scenarios[scenario].frames) {
      for (const evidence of frame.visibleExecutionEvidence) {
        assert.equal(evidence.scenario, scenario);
        assert.ok(
          frame.phase === "before-execution"
            ? evidence.actualExecutionPeriod < frame.period
            : evidence.actualExecutionPeriod <= frame.period
        );
      }
    }
  }
  const aM1Before = observation.scenarios.A.frames[0];
  const aM1After = observation.scenarios.A.frames[1];
  assert.deepEqual(aM1Before.visibleExecutionEvidence, []);
  assert.deepEqual(
    aM1After.visibleExecutionEvidence.map(({ initiativeId }) => initiativeId),
    ["maintenance", "refinancing-1"]
  );
});

test("same-effect initiatives remain distinct and different periods stay exact", () => {
  const { observation } = execute();
  const aAfterM3 = observation.scenarios.A.frames[5].visibleExecutionEvidence;
  const refinancing = aAfterM3.filter(
    ({ effectDefinitionId }) => effectDefinitionId === "early_refinancing"
  );
  assert.deepEqual(
    refinancing.map(({ initiativeId, actualExecutionPeriod }) => ({ initiativeId, actualExecutionPeriod })),
    [
      { initiativeId: "refinancing-1", actualExecutionPeriod: 1 },
      { initiativeId: "refinancing-2", actualExecutionPeriod: 3 },
    ]
  );
});

test("A/B evidence stays isolated and unbound definitions fabricate no evidence", () => {
  const { observation } = execute();
  const allA = observation.scenarios.A.frames.at(-1)?.visibleExecutionEvidence ?? [];
  const allB = observation.scenarios.B.frames.at(-1)?.visibleExecutionEvidence ?? [];
  assert.ok(allA.every(({ scenario }) => scenario === "A"));
  assert.ok(allB.every(({ scenario }) => scenario === "B"));
  assert.ok([...allA, ...allB].every(({ initiativeId }) => initiativeId !== "unbound"));
  assert.notStrictEqual(
    observation.scenarios.A.frames[0].visibleExecutionEvidence,
    observation.scenarios.B.frames[0].visibleExecutionEvidence
  );
});

test("constraint context retains source step and canonical displayed period", () => {
  const { analysisResult, observation } = execute();
  const state = analysisResult.scenarioA.trajectory.find((candidate) =>
    Object.values(candidate.registry).some((constraint) => constraint.lifecycle === "ACTIVE")
  );
  assert.ok(state);
  const frame = observation.scenarios.A.frames.find(
    ({ phase, engineContext }) =>
      phase === "after-transition" && engineContext?.engineStateStep === state.step
  );
  assert.ok(frame?.engineContext);
  for (const constraint of frame.engineContext.activeConstraints) {
    if (constraint.activatedAtSourceStep !== null) {
      assert.equal(
        constraint.activatedAtDisplayedPeriod,
        constraintSourceStepToDisplayedPeriod(constraint.activatedAtSourceStep)
      );
    }
  }
});

test("output contains minimal evidence and Structural Margin only as engine context", () => {
  const { observation } = execute();
  const serialized = JSON.stringify(observation);
  assert.doesNotMatch(serialized, /appliedDriverDeltas|decisionSpaceScore/i);
  assert.match(serialized, /structuralMargin/);
  const evidence = observation.scenarios.A.frames.at(-1)?.visibleExecutionEvidence[0];
  assert.deepEqual(Object.keys(evidence ?? {}).sort(), [
    "actualExecutionPeriod",
    "effectDefinitionId",
    "initiativeId",
    "scenario",
    "scheduledExecutionPeriod",
  ]);
});

test("semantic input reordering and repeated preparation are deep-equal", () => {
  const forward = rawInput(entries);
  const reversed = rawInput([...entries].reverse());
  assert.deepEqual(execute(forward).observation, execute(reversed).observation);
  const { preparedAnalysis, analysisResult } = execute(forward);
  assert.deepEqual(
    prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult }),
    prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult })
  );
});

test("output is detached and deeply frozen without altering its inputs", () => {
  const { preparedAnalysis, analysisResult } = execute();
  const preparedBefore = structuredClone(preparedAnalysis);
  const resultBefore = structuredClone(analysisResult);
  const observation = prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult });
  assert.deepEqual(structuredClone(preparedAnalysis), preparedBefore);
  assert.deepEqual(structuredClone(analysisResult), resultBefore);
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(Object.isFrozen(observation.scenarios.A.frames), true);
  assert.equal(Object.isFrozen(observation.scenarios.A.frames[0]), true);
  assert.equal(Object.isFrozen(observation.scenarios.A.frames[0].visibleExecutionEvidence), true);
  assert.notStrictEqual(observation.contract, preparedAnalysis.contract);
  assert.notStrictEqual(observation.schedules, preparedAnalysis.schedules);
  assert.notStrictEqual(observation.resolvedSchedules, preparedAnalysis.resolvedSchedules);
  assert.notStrictEqual(
    observation.scenarios.A.frames[1].engineContext?.activeConstraints,
    analysisResult.scenarioA.trajectory[0].registry
  );
});

test("rejects preparation, result, identity, horizon, and scenario contradictions", () => {
  const { preparedAnalysis, analysisResult } = execute();
  const cases: readonly [PreparedInitiativeScheduledAnalysisV1, InitiativeScheduledAnalysisResultV1, RegExp][] = [
    [{ ...mutablePrepared(preparedAnalysis), preparationVersion: "wrong" } as never, analysisResult, /prepared analysis version/],
    [preparedAnalysis, { ...mutableResult(analysisResult), version: "wrong" } as never, /analysis result version/],
    [preparedAnalysis, { ...mutableResult(analysisResult), executionMode: "wrong" } as never, /execution mode/],
    [preparedAnalysis, { ...mutableResult(analysisResult), horizon: analysisResult.horizon + 1 }, /horizon/],
    [preparedAnalysis, { ...mutableResult(analysisResult), executionIdentity: { ...analysisResult.executionIdentity, calibrationVersion: "wrong" } } as never, /identity/],
    [preparedAnalysis, { ...mutableResult(analysisResult), scenarioA: { ...analysisResult.scenarioA, scenario: "B" } } as never, /scenario A/],
  ];
  for (const [prepared, result, pattern] of cases) {
    assert.throws(
      () => prepareInitiativeStructuralObservationRun({ preparedAnalysis: prepared, analysisResult: result }),
      pattern
    );
  }
});

test("rejects trajectory and provenance integration contradictions", () => {
  const { preparedAnalysis, analysisResult } = execute();
  const check = (mutate: (result: InitiativeScheduledAnalysisResultV1) => void, pattern: RegExp) => {
    const result = mutableResult(analysisResult);
    mutate(result);
    assert.throws(
      () => prepareInitiativeStructuralObservationRun({ preparedAnalysis, analysisResult: result }),
      pattern
    );
  };
  check((result) => {
    (result.scenarioA.trajectory as unknown as EngineStateLike[]).pop();
  }, /trajectory length/);
  check((result) => {
    (result.scenarioA.trajectory[0] as EngineStateLike).step = 2;
  }, /contradictory step/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries[0] as ProvenanceLike).scenario = "B";
  }, /provenance for B/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries[0] as ProvenanceLike).initiativeId = "unknown";
  }, /unplanned initiative/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries[0] as ProvenanceLike).effectDefinitionId = "reduce_leverage";
  }, /effect mismatch/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries[0] as ProvenanceLike).scheduledExecutionPeriod = 12;
  }, /schedule mismatch/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries[0] as ProvenanceLike).actualExecutionPeriod = 13;
  }, /outside horizon/);
  check((result) => {
    const entries = result.scenarioA.executionProvenance.entries as unknown as ProvenanceLike[];
    entries.push(structuredClone(entries[0]));
  }, /does not cover every planned initiative|duplicate provenance/);
  check((result) => {
    (result.scenarioA.executionProvenance.entries as unknown as ProvenanceLike[]).pop();
  }, /does not cover every planned initiative/);
});

test("rejects resolved schedule contradictions without revalidating raw input", () => {
  const { preparedAnalysis, analysisResult } = execute();
  const prepared = mutablePrepared(preparedAnalysis);
  (prepared.resolvedSchedules.A[0] as { executionStep: number }).executionStep += 1;
  assert.throws(
    () => prepareInitiativeStructuralObservationRun({ preparedAnalysis: prepared, analysisResult }),
    /wrong scheduled period/
  );
});

test("production preparation consumes completed artifacts without executing them", () => {
  const source = readFileSync(
    new URL("./prepareInitiativeStructuralObservationRun.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /runCascadeAnalysis|runInitiativeScheduledAnalysis|RealEstateEngine|stepForward|React|localStorage|saved.?run/i
  );
  assert.doesNotMatch(source, /appliedDriverDeltas/);
});

type EngineStateLike = { step: number };
type ProvenanceLike = {
  scenario: string;
  initiativeId: string;
  effectDefinitionId: string;
  scheduledExecutionPeriod: number;
  actualExecutionPeriod: number;
};

const outputTypeCheck: PreparedInitiativeStructuralObservationRunV2 | null = null;
void outputTypeCheck;
