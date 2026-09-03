import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getCascadeGraphAnnotationBand,
  resolveCascadeEarlyAnnotationPlacement,
  type CascadeEarlyAnnotationIdentity,
} from "../cascadePresentation";
import { SCHEDULED_EXECUTIVE_DEMO_SCHEDULES } from "../scheduledExecutiveDemo";

const GRAPH = readFileSync("app/pilot-fastighet/components/MarginGraph.tsx", "utf8");

const definitions: ReadonlyArray<{
  identity: CascadeEarlyAnnotationIdentity;
  width: number;
  height?: number;
  period: number;
}> = [
  { identity: "structural-divergence", width: 150, period: 1 },
  { identity: "dominant-constraint", width: 184, height: 28, period: 2 },
  { identity: "execution-a-m1", width: 132, period: 1 },
  { identity: "execution-b-m1", width: 132, period: 1 },
  { identity: "execution-b-m3", width: 132, period: 3 },
];

function intersects(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y;
}

for (const chartWidth of [720, 1024, 1440]) {
  test(`M1–M3 labels occupy stable non-intersecting bounds at ${chartWidth}px`, () => {
    const band = getCascadeGraphAnnotationBand(true);
    const placements = definitions.map((definition) => ({
      ...definition,
      ...resolveCascadeEarlyAnnotationPlacement({
        identity: definition.identity,
        chartWidth,
        estimatedLabelWidth: definition.width,
        estimatedLabelHeight: definition.height,
      }),
    }));
    for (const placement of placements) {
      assert.ok(placement.bounds.x >= 48);
      assert.ok(placement.bounds.x + placement.bounds.width <= chartWidth - 12);
      assert.ok(placement.bounds.y >= 0);
      assert.ok(placement.bounds.y + placement.bounds.height < band.headingY);
    }
    for (let left = 0; left < placements.length; left++) {
      for (let right = left + 1; right < placements.length; right++) {
        assert.equal(
          intersects(placements[left].bounds, placements[right].bounds),
          false,
          `${placements[left].identity} intersects ${placements[right].identity}`
        );
      }
    }
  });
}

test("every early execution annotation retains its canonical period", () => {
  assert.deepEqual(
    SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.A.filter((entry) => entry.executionStep <= 3)
      .map((entry) => [entry.actionId, entry.executionStep]),
    [["delay_maintenance", 1]]
  );
  assert.deepEqual(
    SCHEDULED_EXECUTIVE_DEMO_SCHEDULES.B.filter((entry) => entry.executionStep <= 3)
      .map((entry) => [entry.actionId, entry.executionStep]),
    [["early_refinancing", 1], ["secure_long_term_leases", 3]]
  );
  assert.deepEqual(definitions.map(({ identity, period }) => [identity, period]), [
    ["structural-divergence", 1],
    ["dominant-constraint", 2],
    ["execution-a-m1", 1],
    ["execution-b-m1", 1],
    ["execution-b-m3", 3],
  ]);
});

test("rendering keeps exact anchors, readable text, and progressive filtering", () => {
  assert.match(GRAPH, /x1=\{x\}[\s\S]*y1=\{markerY\}[\s\S]*earlyLabelPlacement\.labelX/);
  assert.match(GRAPH, /fontSize=\{12\}/);
  assert.match(GRAPH, /monthIndex >= revealedSteps/);
  assert.match(GRAPH, /execRealEstateGraphPassive && divergenceMonthIndex <= 2/);
  assert.match(GRAPH, /execRealEstateGraphPassive && match\.monthIndex <= 2/);
  assert.match(GRAPH, /theme\.text \?\? "#dbeafe"/);
});

test("normal CE retains its existing inline annotation branches", () => {
  assert.match(GRAPH, /earlyPlacement\?\.labelX \?\? x \+ 6/);
  assert.match(GRAPH, /execRealEstateGraphPassive \? 12 : 10/);
  assert.match(GRAPH, /earlyLabelPlacement\?\.labelX \?\? x \+ 10/);
});
