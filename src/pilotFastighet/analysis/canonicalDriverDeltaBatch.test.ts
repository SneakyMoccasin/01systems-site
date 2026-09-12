import assert from "node:assert/strict";
import test from "node:test";
import type { DriverDeltas } from "../RealEstateEngine";
import { resolveExecutableDomainProfile } from "../executableDomainProfile";
import {
  combineCanonicalDriverDeltaBatch,
  type CanonicalDriverDeltaContribution,
} from "./canonicalDriverDeltaBatch";

function legacyCombine(
  contributions: readonly CanonicalDriverDeltaContribution[]
): DriverDeltas {
  const combined = new Map<string, number>();
  for (const contribution of contributions) {
    for (const [driver, delta] of Object.entries(contribution.driverDeltas)) {
      combined.set(driver, (combined.get(driver) ?? 0) + delta);
    }
  }
  return Object.fromEntries(
    [...combined.entries()].sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0
    )
  ) as DriverDeltas;
}

const contribution = (
  effectIdentity: string,
  instanceIdentity: string,
  driverDeltas: DriverDeltas
): CanonicalDriverDeltaContribution => ({
  effectIdentity,
  instanceIdentity,
  driverDeltas,
});

test("matches the previous legacy Map aggregation for canonically ordered unique actions", () => {
  const input = [
    contribution("a", "a", { demandRisk: 0.25, accessibility: -0.5 }),
    contribution("b", "b", { demandRisk: -0.75, modal_attractiveness: 1 }),
  ];
  assert.deepEqual(combineCanonicalDriverDeltaBatch(input), legacyCombine(input));
});

test("matches legacy aggregation across every canonical profile effect", () => {
  for (const profileId of [
    "legacy-real-estate-v1",
    "legacy-municipal-v1",
    "legacy-consulting-v1",
  ] as const) {
    const profile = resolveExecutableDomainProfile(profileId);
    const input = Object.entries(profile.actionEffects)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([effectIdentity, effect]) =>
        contribution(
          effectIdentity,
          effectIdentity,
          Object.fromEntries(
            Object.entries(effect).sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0
            )
          ) as DriverDeltas
        )
      );
    assert.deepEqual(combineCanonicalDriverDeltaBatch(input), legacyCombine(input));
  }
});

test("combines one or many effects, overlapping drivers, and opposing deltas", () => {
  assert.deepEqual(
    combineCanonicalDriverDeltaBatch([
      contribution("a", "one", { demandRisk: 0.4 }),
    ]),
    { demandRisk: 0.4 }
  );
  assert.deepEqual(
    combineCanonicalDriverDeltaBatch([
      contribution("a", "one", { demandRisk: 0.4, accessibility: 1 }),
      contribution("b", "two", { demandRisk: -0.15, modal_attractiveness: 0.5 }),
    ]),
    { accessibility: 1, demandRisk: 0.25, modal_attractiveness: 0.5 }
  );
});

test("counts separate instances of the same effect and is input-order invariant", () => {
  const input = [
    contribution("shared", "second", { demandRisk: 0.1 }),
    contribution("shared", "first", { demandRisk: 0.2 }),
    contribution("other", "third", { demandRisk: -0.05 }),
  ];
  const expected = combineCanonicalDriverDeltaBatch(input);
  assert.equal(expected.demandRisk, 0.25);
  assert.deepEqual(combineCanonicalDriverDeltaBatch([...input].reverse()), expected);
});

test("uses canonical driver order and preserves existing addition semantics for -0 and fractions", () => {
  const result = combineCanonicalDriverDeltaBatch([
    contribution("a", "a", { transit_signal_priority: -0, accessibility: 0.1 }),
    contribution("b", "b", { accessibility: 0.2 }),
  ]);
  assert.deepEqual(Object.keys(result), ["accessibility", "transit_signal_priority"]);
  assert.equal(result.accessibility, 0.30000000000000004);
  assert.equal(Object.is(result.transit_signal_priority, -0), false);
});

test("rejects non-finite values before producing a batch", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () =>
        combineCanonicalDriverDeltaBatch([
          contribution("a", "a", { demandRisk: value }),
        ]),
      /non-finite delta/
    );
  }
});

test("does not mutate or freeze caller input and returns detached frozen output", () => {
  const input = [contribution("a", "a", { demandRisk: 0.5 })];
  const before = structuredClone(input);
  const result = combineCanonicalDriverDeltaBatch(input);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input[0].driverDeltas), false);
  assert.equal(Object.isFrozen(result), true);
  assert.notEqual(result, input[0].driverDeltas);
});
