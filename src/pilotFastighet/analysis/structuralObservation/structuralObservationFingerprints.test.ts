import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceId,
} from "./contract";
import type { PreparedStructuralObservationRun } from "./prepareStructuralObservationRun";
import {
  buildStructuralObservationFingerprints,
  canonicalizeStructuralFingerprintPayload,
  projectStructuralDefinitionFingerprintPayload,
  projectStructuralScenarioPlanFingerprintPayload,
  sha256StructuralFingerprint,
  type StructuralDefinitionFingerprintPayloadV1,
  type StructuralFingerprintPayload,
} from "./structuralObservationFingerprints";

const initiativeId = (value: string) => value as InitiativeId;
const resourceId = (value: string) => value as SharedResourceId;
const period = (value: number) => value as DisplayedPeriod;
const actionKey = (value: string) => value as ActionKey;

type PreparedOptions = Readonly<{
  labels?: readonly [string, string, string, string];
  reverse?: boolean;
  reversePrerequisites?: boolean;
  reverseClaims?: boolean;
  alphaId?: string;
  alphaAction?: string;
  prerequisiteIds?: readonly string[];
  claimAmount?: number;
  claimDuration?: number;
  claimResource?: string;
  teamCapacity?: number;
  periodizedAmount?: number;
  periodizedPeriodOrder?: readonly number[];
  periodizedCapacity?: boolean;
  aPeriod?: number;
  bPeriod?: number;
  aBound?: boolean;
  bBound?: boolean;
  horizon?: number;
  profileCalibration?: string;
  frameNoise?: number;
}>;

function makePrepared(options: PreparedOptions = {}): PreparedStructuralObservationRun {
  const alphaId = options.alphaId ?? "alpha";
  const prerequisites = (options.prerequisiteIds ?? ["beta", "gamma"]).map(
    (id) => ({ initiativeId: initiativeId(id), type: "finish-to-start" as const })
  );
  if (options.reversePrerequisites) prerequisites.reverse();
  const claims = [
    {
      resourceId: resourceId(options.claimResource ?? "team"),
      amount: options.claimAmount ?? 0.5,
      durationPeriods: options.claimDuration ?? 2,
    },
    { resourceId: resourceId("reserve"), amount: 0.25, durationPeriods: 1 },
  ];
  if (options.reverseClaims) claims.reverse();
  const labels = options.labels ?? ["Alpha", "Beta", "Team", "Reserve"];
  const definitions = [
    {
      id: initiativeId(alphaId),
      actionKey: actionKey(options.alphaAction ?? "reduce_travel_time"),
      label: labels[0],
      prerequisites,
      resourceClaims: claims,
    },
    {
      id: initiativeId("beta"),
      actionKey: actionKey("increase_service_frequency"),
      label: labels[1],
      prerequisites: [],
      resourceClaims: [],
    },
    {
      id: initiativeId("gamma"),
      actionKey: actionKey("expand_cycling_infrastructure"),
      prerequisites: [],
      resourceClaims: [],
    },
  ];
  if (options.reverse) definitions.reverse();
  const periodOrder =
    options.periodizedPeriodOrder ??
    Array.from({ length: options.horizon ?? 3 }, (_, index) => index + 1);
  const resources = [
    {
      id: resourceId("team"),
      label: labels[2],
      capacity: { type: "constant" as const, amount: options.teamCapacity ?? 1 },
    },
    {
      id: resourceId("reserve"),
      label: labels[3],
      capacity: options.periodizedCapacity
        ? {
            type: "periodized" as const,
            amounts: periodOrder.map((value) => ({
              period: period(value),
              amount: value === 2 ? (options.periodizedAmount ?? 0.75) : 1,
            })),
          }
        : { type: "constant" as const, amount: 1 },
    },
    {
      id: resourceId("other"),
      capacity: { type: "constant" as const, amount: 1 },
    },
  ];
  if (options.reverse) resources.reverse();
  const contract = {
    version: "structural-observation-v1" as const,
    initiatives: definitions,
    resources,
    scenarioBindings: [
      ...(options.aBound === false
        ? []
        : [{ scenario: "A" as const, initiativeId: initiativeId(alphaId) }]),
      ...(options.bBound === false
        ? []
        : [{ scenario: "B" as const, initiativeId: initiativeId("beta") }]),
    ],
    ignoredFutureField: "not-semantic",
  };
  const plan = (scenario: "A" | "B") => ({
    scenario,
    initiatives: definitions.map((definition) => {
      const bound =
        scenario === "A"
          ? definition.id === alphaId && options.aBound !== false
          : definition.id === "beta" && options.bBound !== false;
      return {
        initiativeId: definition.id,
        actionKey: definition.actionKey,
        scenario,
        plannedExecutionPeriod: bound
          ? period(scenario === "A" ? (options.aPeriod ?? 1) : (options.bPeriod ?? 2))
          : null,
        bindingStatus: bound ? ("bound" as const) : ("not-bound" as const),
        definition,
      };
    }),
  });
  return {
    preparationVersion: "structural-observation-preparation-v1",
    contract,
    profileIdentity: {
      domainId: "municipal",
      profileId: "legacy-municipal-v1",
      modelVersion: "pilot-fastighet-v0.4",
      calibrationVersion:
        (options.profileCalibration ?? "transport-causal-subset-v2") as never,
    },
    horizon: options.horizon ?? 3,
    scenarioPlans: { A: plan("A"), B: plan("B") },
    frames: {
      A: [{ engineContext: { structuralMargin: options.frameNoise ?? 1 }, diagnostics: ["ignored"] }],
      B: [{ visibleExecutionEvidence: [options.frameNoise ?? 1] }],
    },
  } as unknown as PreparedStructuralObservationRun;
}

async function fingerprints(options: PreparedOptions = {}) {
  return buildStructuralObservationFingerprints(makePrepared(options));
}

test("projects only semantic definition fields and deeply freezes fresh output", async () => {
  const prepared = makePrepared();
  const before = structuredClone(prepared);
  const payload = projectStructuralDefinitionFingerprintPayload(prepared);
  await buildStructuralObservationFingerprints(prepared);
  assert.deepEqual(prepared, before);
  assert.equal(Object.isFrozen(prepared), false);
  assert.equal(Object.isFrozen(payload), true);
  assert.equal(Object.isFrozen(payload.initiatives[0].prerequisites), true);
  assert.equal("label" in payload.initiatives[0], false);
  assert.equal("scenarioBindings" in payload, false);
  assert.equal(JSON.stringify(payload).includes("ignoredFutureField"), false);
  assert.deepEqual(payload.initiatives.map(({ initiativeId: id }) => id), [
    "alpha",
    "beta",
    "gamma",
  ]);
  assert.deepEqual(payload.initiatives[0].prerequisites, [
    { initiativeId: "beta", type: "finish-to-start" },
    { initiativeId: "gamma", type: "finish-to-start" },
  ]);
  assert.match((await fingerprints()).structuralDefinitionFingerprint, /^[0-9a-f]{64}$/);
});

test("labels and every supported presentation ordering are fingerprint-neutral", async () => {
  const base = await fingerprints();
  const changedLabels = await fingerprints({ labels: ["A", "B", "C", "D"] });
  const reordered = await fingerprints({
    reverse: true,
    reversePrerequisites: true,
    reverseClaims: true,
  });
  assert.deepEqual(changedLabels, base);
  assert.deepEqual(reordered, base);
  assert.deepEqual(
    await fingerprints({
      periodizedCapacity: true,
      periodizedPeriodOrder: [3, 1, 2],
    }),
    await fingerprints({ periodizedCapacity: true })
  );
});

test("definition semantics change only the structural definition fingerprint", async () => {
  const base = await fingerprints();
  const variants: PreparedOptions[] = [
    { alphaAction: "transit_signal_priority" },
    { prerequisiteIds: ["beta"] },
    { claimResource: "other" },
    { claimAmount: 0.6 },
    { claimDuration: 3 },
    { teamCapacity: 1.2 },
    { periodizedCapacity: true, periodizedAmount: 0.8 },
  ];
  for (const variant of variants) {
    const changed = await fingerprints(variant);
    assert.notEqual(changed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
    assert.equal(changed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
    assert.equal(changed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  }
  assert.notEqual(
    (await fingerprints({ alphaId: "alpha-renamed" })).structuralDefinitionFingerprint,
    base.structuralDefinitionFingerprint
  );
});

test("dependency type is explicit without fabricating an invalid contract", () => {
  const payload = projectStructuralDefinitionFingerprintPayload(makePrepared());
  assert.equal(payload.initiatives[0].prerequisites[0].type, "finish-to-start");
});

test("periodized capacity period and amount are explicit definition semantics", async () => {
  const payload = projectStructuralDefinitionFingerprintPayload(
    makePrepared({ periodizedCapacity: true })
  );
  const changedPeriod = structuredClone(payload);
  const reserve = changedPeriod.resources.find(
    ({ resourceId: id }) => id === "reserve"
  );
  assert.equal(reserve?.capacity.type, "periodized");
  if (!reserve || reserve.capacity.type !== "periodized") return;
  (reserve.capacity.amounts[1] as { period: DisplayedPeriod }).period = period(4);
  const changedAmount = structuredClone(payload);
  const amountResource = changedAmount.resources.find(
    ({ resourceId: id }) => id === "reserve"
  );
  assert.equal(amountResource?.capacity.type, "periodized");
  if (!amountResource || amountResource.capacity.type !== "periodized") return;
  (amountResource.capacity.amounts[1] as { amount: number }).amount = 0.8;
  const canonical = canonicalizeStructuralFingerprintPayload(payload);
  assert.notEqual(
    await sha256StructuralFingerprint(
      canonicalizeStructuralFingerprintPayload(changedPeriod)
    ),
    await sha256StructuralFingerprint(canonical)
  );
  assert.notEqual(
    await sha256StructuralFingerprint(
      canonicalizeStructuralFingerprintPayload(changedAmount)
    ),
    await sha256StructuralFingerprint(canonical)
  );
});

test("A and B bindings and periods affect only their own plan fingerprints", async () => {
  const base = await fingerprints();
  for (const variant of [{ aPeriod: 2 }, { aBound: false }]) {
    const changed = await fingerprints(variant);
    assert.equal(changed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
    assert.notEqual(changed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
    assert.equal(changed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  }
  for (const variant of [{ bPeriod: 3 }, { bBound: false }]) {
    const changed = await fingerprints(variant);
    assert.equal(changed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
    assert.equal(changed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
    assert.notEqual(changed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  }
});

test("plan payload contains only bound initiative identity, period, scenario, and horizon", () => {
  const prepared = makePrepared();
  const planA = projectStructuralScenarioPlanFingerprintPayload(prepared, "A");
  assert.deepEqual(planA, {
    version: "structural-scenario-plan-fingerprint-v1",
    scenario: "A",
    horizon: 3,
    bindings: [{ initiativeId: "alpha", plannedExecutionPeriod: 1 }],
  });
  assert.equal("actionKey" in planA.bindings[0], false);
  assert.equal(Object.isFrozen(planA.bindings[0]), true);
});

test("horizon affects both plans only; profile and frame output affect none", async () => {
  const base = await fingerprints();
  const horizon = await fingerprints({ horizon: 4 });
  assert.equal(horizon.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
  assert.notEqual(horizon.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
  assert.notEqual(horizon.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  assert.deepEqual(
    await fingerprints({ profileCalibration: "legacy-global-v1", frameNoise: 99 }),
    base
  );
});

test("canonical JSON sorts keys and arrays, normalizes negative zero, and ignores extra fields", () => {
  const payload = projectStructuralDefinitionFingerprintPayload(makePrepared());
  const withNegativeZero = structuredClone(payload) as unknown as {
    version: "structural-definition-fingerprint-v1";
    initiatives: Array<{ resourceClaims: Array<{ amount: number }> }>;
  };
  withNegativeZero.initiatives[0].resourceClaims[0].amount = -0;
  const withZero = structuredClone(withNegativeZero);
  withZero.initiatives[0].resourceClaims[0].amount = 0;
  (withNegativeZero as unknown as Record<string, unknown>).unknown = "ignored";
  assert.equal(
    canonicalizeStructuralFingerprintPayload(withNegativeZero as never),
    canonicalizeStructuralFingerprintPayload(withZero as never)
  );
  assert.match(
    canonicalizeStructuralFingerprintPayload(payload),
    /^\{"initiatives":/
  );
});

test("canonicalizer rejects non-finite numbers and unknown versions", () => {
  const payload = structuredClone(
    projectStructuralDefinitionFingerprintPayload(makePrepared())
  ) as unknown as {
    initiatives: Array<{ resourceClaims: Array<{ amount: number }> }>;
  };
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    payload.initiatives[0].resourceClaims[0].amount = value;
    assert.throws(
      () => canonicalizeStructuralFingerprintPayload(payload as never),
      /must be finite/
    );
  }
  assert.throws(
    () =>
      canonicalizeStructuralFingerprintPayload({
        version: "future-version",
      } as unknown as StructuralFingerprintPayload),
    /unsupported payload version/
  );
});

test("JSON round-trip and repeated calls preserve canonical strings and all hashes", async () => {
  const payload = projectStructuralDefinitionFingerprintPayload(makePrepared());
  const roundTrip = JSON.parse(JSON.stringify(payload)) as StructuralDefinitionFingerprintPayloadV1;
  assert.equal(
    canonicalizeStructuralFingerprintPayload(roundTrip),
    canonicalizeStructuralFingerprintPayload(payload)
  );
  const first = await fingerprints();
  const second = await fingerprints();
  assert.deepEqual(second, first);
  assert.equal(Object.isFrozen(first), true);
  for (const value of [
    first.structuralDefinitionFingerprint,
    first.scenarioPlanFingerprintA,
    first.scenarioPlanFingerprintB,
  ]) {
    assert.match(value, /^[0-9a-f]{64}$/);
  }
});

test("browser Web Crypto matches the known SHA-256 vector", async () => {
  assert.equal(
    await sha256StructuralFingerprint("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("production fingerprint module has no Node crypto or stable-stringify dependency", () => {
  const source = readFileSync(
    new URL("./structuralObservationFingerprints.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /node:crypto|stable.?stringify|createHash/);
  assert.match(source, /globalThis\.crypto\?\.subtle/);
  assert.match(source, /new TextEncoder\(\)/);
});
