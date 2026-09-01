import assert from "node:assert/strict";
import test from "node:test";

import {
  constraintSourceStepToDisplayedPeriod,
  displayedPeriodToGraphIndex,
  divergenceIndexToDisplayedPeriod,
  engineStateStepToDisplayedPeriod,
  executionStepToDisplayedPeriod,
  formatDisplayedPeriod,
  trajectoryIndexToDisplayedPeriod,
} from "./periodPresentation";

test("engine states and trajectory indices map to canonical displayed periods", () => {
  assert.equal(engineStateStepToDisplayedPeriod(1), 1);
  assert.equal(engineStateStepToDisplayedPeriod(36), 36);
  assert.equal(trajectoryIndexToDisplayedPeriod(0), 1);
  assert.equal(trajectoryIndexToDisplayedPeriod(35), 36);
  assert.equal(formatDisplayedPeriod(engineStateStepToDisplayedPeriod(36)), "M36");
});

test("scheduled execution steps align with displayed periods and graph indices", () => {
  for (const [executionStep, graphIndex] of [[1, 0], [6, 5], [36, 35]] as const) {
    const period = executionStepToDisplayedPeriod(executionStep);
    assert.equal(period, executionStep);
    assert.equal(formatDisplayedPeriod(period), `M${executionStep}`);
    assert.equal(displayedPeriodToGraphIndex(period), graphIndex);
  }
});

test("legacy constraint source steps map to the produced analytical period", () => {
  assert.equal(constraintSourceStepToDisplayedPeriod(0), 1);
  assert.equal(constraintSourceStepToDisplayedPeriod(1), 2);
  assert.equal(
    displayedPeriodToGraphIndex(constraintSourceStepToDisplayedPeriod(1)),
    1
  );
});

test("divergence indices are converted safely", () => {
  assert.equal(divergenceIndexToDisplayedPeriod(0), 1);
  assert.equal(divergenceIndexToDisplayedPeriod(1), 2);
  assert.equal(divergenceIndexToDisplayedPeriod(-1), null);
});

test("impossible temporal presentation values fail explicitly", () => {
  assert.throws(() => engineStateStepToDisplayedPeriod(0), RangeError);
  assert.throws(() => trajectoryIndexToDisplayedPeriod(-1), RangeError);
  assert.throws(() => displayedPeriodToGraphIndex(0), RangeError);
  assert.throws(() => executionStepToDisplayedPeriod(1.5), RangeError);
  assert.throws(() => constraintSourceStepToDisplayedPeriod(-1), RangeError);
  assert.throws(() => divergenceIndexToDisplayedPeriod(-2), RangeError);
});
