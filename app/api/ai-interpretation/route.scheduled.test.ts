import test from "node:test";
import assert from "node:assert/strict";

import { buildScheduledInterpretationContext } from "@/src/pilotFastighet/analysis/scheduledInterpretationContext";

test("scheduled prompt context is scenario-specific, provenance-based, and safety locked", () => {
  const text = buildScheduledInterpretationContext({
    mode: "actions-over-time",
    horizon: 6,
    naturalCompletion: true,
    plannedSchedules: {
      A: [{ actionId: "delay_maintenance", executionStep: 2 }],
      B: [{ actionId: "early_refinancing", executionStep: 4 }],
    },
    executedProvenance: {
      A: [{ actionId: "delay_maintenance", scheduledStep: 2, actualExecutionStep: 2, appliedDriverDeltas: { hidden: 1 } }],
      B: [{ actionId: "early_refinancing", scheduledStep: 4, actualExecutionStep: 4, appliedDriverDeltas: { hidden: 2 } }],
    },
    fairComparisonFacts: {
      identicalInitialStates: true,
      identicalActionSets: false,
      timingOrOrderOnlyDifference: false,
    },
  });
  assert.match(text, /planned schedules and actual execution records/);
  assert.match(text, /Never infer execution time from cascade depth/);
  assert.match(text, /no separate implementation-capacity or concurrency-cost mechanic/);
  assert.match(text, /Human judgement remains required/);
  assert.match(text, /"A"/);
  assert.match(text, /"B"/);
  assert.doesNotMatch(text, /appliedDriverDeltas|hidden/);
});

test("scheduled interpretation rejects stopped or incomplete context", () => {
  assert.throws(() =>
    buildScheduledInterpretationContext({
      mode: "actions-over-time",
      naturalCompletion: false,
      plannedSchedules: { A: [], B: [] },
      executedProvenance: { A: [], B: [] },
    })
  );
});
