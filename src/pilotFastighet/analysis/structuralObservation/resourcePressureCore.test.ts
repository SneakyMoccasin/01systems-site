import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayedPeriod, InitiativeId, SharedResourceDefinition, SharedResourceId } from "./contract";
import type { ObservationPlannedInitiative, ObservationScenarioPlan } from "./observationPlanCore";
import { observeResourcePressureCore, RESOURCE_CAPACITY_EPSILON } from "./resourcePressureCore";

const id = (value: string) => value as InitiativeId;
const resourceId = (value: string) => value as SharedResourceId;
const period = (value: number) => value as DisplayedPeriod;
function initiative(value: string, start: number | null, amount = 0.6, duration = 2): ObservationPlannedInitiative { return { initiativeId: id(value), scenario: "A", bindingStatus: start === null ? "not-bound" : "bound", plannedExecutionPeriod: start === null ? null : period(start), definition: { initiativeId: id(value), prerequisites: [], resourceClaims: [{ resourceId: resourceId("team"), amount, durationPeriods: duration as never }] } }; }
function plan(items: readonly ObservationPlannedInitiative[]): ObservationScenarioPlan { return { scenario: "A", initiatives: items }; }
const constant = (amount: number): SharedResourceDefinition => ({ id: resourceId("team"), capacity: { type: "constant", amount } });

test("resource core preserves inclusive claims, contributors, starters, and historical-only pressure", () => {
  const scenarioPlan = plan([initiative("past", 1), initiative("current", 2)]);
  const current = observeResourcePressureCore({ resources: [constant(1)], scenarioPlan, period: period(2) })[0];
  assert.deepEqual(current.contributingInitiativeIds, ["current", "past"]);
  assert.deepEqual(current.startingInitiativeIds, ["current"]);
  assert.deepEqual(current.wouldBlockStartingInitiativeIds, ["current"]);
  const historical = observeResourcePressureCore({ resources: [constant(0.5)], scenarioPlan: plan([initiative("past", 1, 0.6, 3)]), period: period(2) })[0];
  assert.equal(historical.overallocated, true);
  assert.deepEqual(historical.contributingInitiativeIds, ["past"]);
  assert.deepEqual(historical.wouldBlockStartingInitiativeIds, []);
});

test("resource core uses explicit period capacity and the canonical epsilon expression", () => {
  const resources: SharedResourceDefinition[] = [{ id: resourceId("team"), capacity: { type: "periodized", amounts: [{ period: period(1), amount: 1 }, { period: period(2), amount: 0.5 }] } }];
  assert.equal(observeResourcePressureCore({ resources, scenarioPlan: plan([initiative("start", 2, 0.5)]), period: period(2) })[0].overallocated, false);
  assert.equal(observeResourcePressureCore({ resources: [constant(1)], scenarioPlan: plan([initiative("start", 1, 1 + RESOURCE_CAPACITY_EPSILON / 2)]), period: period(1) })[0].overallocated, false);
  assert.equal(observeResourcePressureCore({ resources: [constant(1)], scenarioPlan: plan([initiative("start", 1, 1 + RESOURCE_CAPACITY_EPSILON * 2)]), period: period(1) })[0].overallocated, true);
});

test("resource core is deterministic, detached, frozen, and rejects invalid state", () => {
  const items = [initiative("z", 1), initiative("a", 1)];
  const first = observeResourcePressureCore({ resources: [constant(1)], scenarioPlan: plan(items), period: period(1) });
  const second = observeResourcePressureCore({ resources: [constant(1)], scenarioPlan: plan([...items].reverse()), period: period(1) });
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first[0].activeClaims), true);
  assert.equal(Object.isFrozen(items[0]), false);
  assert.throws(() => observeResourcePressureCore({ resources: [{ id: resourceId("team"), capacity: { type: "periodized", amounts: [] } }], scenarioPlan: plan([]), period: period(1) }), /exactly one capacity/);
  assert.throws(() => observeResourcePressureCore({ resources: [], scenarioPlan: plan([initiative("start", 1)]), period: period(1) }), /unknown resource/);
});
