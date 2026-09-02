import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CASCADE_PRESENTATION } from "../cascadePresentation";
import {
  resolveMarginGraphDomain,
  resolveMarginGraphPoint,
  resolveMarginGraphPresentedSeries,
} from "./marginGraphPresentation";

test("normal system-level clamp extrema remain visibly inside the plot", () => {
  const rawA = Array(36).fill(3);
  const rawB = Array(36).fill(-3);
  const presented = resolveMarginGraphPresentedSeries(rawA, rawB, "absolute");
  const domain = resolveMarginGraphDomain(
    presented.scenarioA,
    presented.scenarioB,
    "absolute"
  );

  assert.ok(domain.max > 3, "upper clamp must be below the outer plot edge");
  assert.ok(domain.min < -3, "lower clamp must be above the outer plot edge");
  assert.deepEqual(presented.scenarioA, rawA);
  assert.deepEqual(presented.scenarioB, rawB);
});

test("change-from-baseline retains exact per-scenario values and padded visibility", () => {
  const rawA = [1, 3, 3];
  const rawB = [-3, -3, -3];
  const presented = resolveMarginGraphPresentedSeries(rawA, rawB, "delta");
  const domain = resolveMarginGraphDomain(
    presented.scenarioA,
    presented.scenarioB,
    "delta"
  );

  assert.deepEqual(presented.scenarioA, [0, 2, 2]);
  assert.deepEqual(presented.scenarioB, [0, 0, 0]);
  assert.deepEqual(rawA, [1, 3, 3], "engine series A must not be mutated");
  assert.deepEqual(rawB, [-3, -3, -3], "engine series B must not be mutated");
  assert.ok(domain.min < 0);
  assert.ok(domain.max > 2);
});

test("Scenario B plot, hover and selection resolve from one canonical series", () => {
  const rawB = [-3, -2.5, -2];
  const presented = resolveMarginGraphPresentedSeries([1, 1.1, 1.2], rawB, "absolute");

  assert.equal(presented.scenarioB[0], -3);
  assert.equal(resolveMarginGraphPoint(presented, "B", 0), presented.scenarioB[0]);
  assert.equal(resolveMarginGraphPoint(presented, "B", 2), presented.scenarioB[2]);

  const graphSource = readFileSync(
    "app/pilot-fastighet/components/MarginGraph.tsx",
    "utf8"
  );
  const pageSource = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.doesNotMatch(graphSource, /displayMarginB/);
  assert.doesNotMatch(pageSource, /displayMarginB/);
  assert.match(graphSource, /const marginB = marginHistoryB\[index\]/);
});

test("scenario identities and line styles remain canonical", () => {
  assert.equal(CASCADE_PRESENTATION.scenarios.A.color, "#3B82F6");
  assert.equal(CASCADE_PRESENTATION.scenarios.B.color, "#F59E0B");
  assert.equal(CASCADE_PRESENTATION.scenarios.A.lineDash, undefined);
  assert.equal(CASCADE_PRESENTATION.scenarios.B.lineDash, "6 4");
});

test("varying Transport trajectories are unchanged by system-level presentation", () => {
  const transportA = [1, 1, 1];
  const transportB = [1.242199, 1.63142, 2.99808];
  const presented = resolveMarginGraphPresentedSeries(
    transportA,
    transportB,
    "absolute"
  );

  assert.deepEqual(presented.scenarioA, transportA);
  assert.deepEqual(presented.scenarioB, transportB);
});

test("Executive Demo preserves its verified exact legacy domain", () => {
  const exactDomain = resolveMarginGraphDomain([3], [-3], "absolute", true);
  const normalDomain = resolveMarginGraphDomain([3], [-3], "absolute");

  assert.deepEqual(exactDomain, { min: -3, max: 3 });
  assert.ok(normalDomain.min < exactDomain.min);
  assert.ok(normalDomain.max > exactDomain.max);
});
