import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDriverScoreState } from "../../driverScoreState";
import { defaultRiskState } from "../../presetRiskMapping";
import type { PreparedInitiativeStructuralObservationRunV2 } from "./prepareInitiativeStructuralObservationRun";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";
import {
  buildInitiativeStructuralObservationFingerprints,
  canonicalizeInitiativeStructuralFingerprintPayload,
  projectInitiativeScenarioPlanFingerprintPayload,
  projectInitiativeStructuralDefinitionFingerprintPayload,
  type InitiativeStructuralFingerprintPayloadV2,
} from "./initiativeStructuralObservationFingerprints";
import {
  prepareInitiativeScheduledAnalysis,
  runPreparedInitiativeScheduledAnalysis,
  type InitiativeScheduledAnalysisInputV1,
} from "./runInitiativeScheduledAnalysis";

type Options = Readonly<{
  reverse?: boolean;
  labels?: readonly [string, string, string];
  firstId?: string;
  firstEffect?: string;
  prerequisite?: string | null;
  claimAmount?: number;
  claimDuration?: number;
  resourceCapacity?: number;
  periodized?: boolean;
  aFirstPeriod?: number;
  bFirstPeriod?: number;
  horizon?: number;
}>;

function input(options: Options = {}): InitiativeScheduledAnalysisInputV1 {
  const firstId = options.firstId ?? "first";
  const horizon = options.horizon ?? 5;
  const labels = options.labels ?? ["First", "Second", "Team"];
  const initiatives = [
    {
      id: firstId,
      effectDefinitionId: options.firstEffect ?? "early_refinancing",
      label: labels[0],
      prerequisites: options.prerequisite === null ? [] : [{ initiativeId: options.prerequisite ?? "second", type: "finish-to-start" as const }],
      resourceClaims: [{ resourceId: "team", amount: options.claimAmount ?? 0.5, durationPeriods: options.claimDuration ?? 2 }],
    },
    {
      id: "second",
      effectDefinitionId: "early_refinancing",
      label: labels[1],
      prerequisites: [],
      resourceClaims: [],
    },
  ];
  const A = [{ initiativeId: firstId, executionStep: options.aFirstPeriod ?? 2 }, { initiativeId: "second", executionStep: 1 }];
  const B = [{ initiativeId: firstId, executionStep: options.bFirstPeriod ?? 3 }, { initiativeId: "second", executionStep: 1 }];
  return {
    version: "initiative-scheduled-analysis-input-v1",
    executionMode: "initiative-schedule-v1",
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    horizon,
    contract: {
      version: "structural-observation-v2",
      initiatives: options.reverse ? [...initiatives].reverse() : initiatives,
      resources: [{
        id: "team",
        label: labels[2],
        capacity: options.periodized
          ? { type: "periodized", amounts: Array.from({ length: horizon }, (_, index) => ({ period: index + 1, amount: index === 1 ? (options.resourceCapacity ?? 1) : 1 })) }
          : { type: "constant", amount: options.resourceCapacity ?? 1 },
      }],
    },
    schedules: {
      version: "initiative-schedule-v1",
      comparisonPolicy: "same-initiative-set",
      A: options.reverse ? [...A].reverse() : A,
      B: options.reverse ? [...B].reverse() : B,
    },
    initialState: {
      initialRiskState: structuredClone(defaultRiskState),
      initialDriverScores: buildDriverScoreState(defaultRiskState),
    },
  } as InitiativeScheduledAnalysisInputV1;
}

function prepared(options: Options = {}): PreparedInitiativeStructuralObservationRunV2 {
  const analysis = prepareInitiativeScheduledAnalysis(input(options));
  const result = runPreparedInitiativeScheduledAnalysis(analysis);
  return prepareInitiativeStructuralObservationRun({ preparedAnalysis: analysis, analysisResult: result });
}

async function fingerprints(options: Options = {}) {
  return buildInitiativeStructuralObservationFingerprints(prepared(options));
}

test("projects only V2 structural definition semantics with separate same-effect initiatives", () => {
  const source = prepared();
  const payload = projectInitiativeStructuralDefinitionFingerprintPayload(source);
  assert.deepEqual(payload.initiatives.map(({ initiativeId, effectDefinitionId }) => ({ initiativeId, effectDefinitionId })), [
    { initiativeId: "first", effectDefinitionId: "early_refinancing" },
    { initiativeId: "second", effectDefinitionId: "early_refinancing" },
  ]);
  assert.deepEqual(payload.initiatives[0].prerequisites, [{ initiativeId: "second", type: "finish-to-start" }]);
  assert.deepEqual(payload.initiatives[0].resourceClaims, [{ resourceId: "team", amount: 0.5, durationPeriods: 2 }]);
  assert.equal("label" in payload.initiatives[0], false);
  assert.equal("scenario" in payload, false);
  assert.equal("horizon" in payload, false);
  assert.equal(Object.isFrozen(payload), true);
});

test("plan payload contains only scenario, horizon, InitiativeId, and planned period", () => {
  const source = prepared();
  assert.deepEqual(projectInitiativeScenarioPlanFingerprintPayload(source, "A"), {
    version: "initiative-scenario-plan-fingerprint-v2",
    scenario: "A",
    horizon: 5,
    initiatives: [
      { initiativeId: "first", plannedExecutionPeriod: 2 },
      { initiativeId: "second", plannedExecutionPeriod: 1 },
    ],
  });
  const serialized = JSON.stringify(projectInitiativeScenarioPlanFingerprintPayload(source, "A"));
  assert.doesNotMatch(serialized, /effectDefinitionId|label|executionEvidence/);
});

test("labels, presentation order, frames, execution, and engine identity are fingerprint-neutral", async () => {
  const basePrepared = prepared();
  const base = await buildInitiativeStructuralObservationFingerprints(basePrepared);
  assert.deepEqual(await fingerprints({ labels: ["Ett", "Två", "Grupp"] }), base);
  assert.deepEqual(await fingerprints({ reverse: true }), base);
  const noisy = structuredClone(basePrepared) as PreparedInitiativeStructuralObservationRunV2;
  (noisy.executionIdentity as { calibrationVersion: string }).calibrationVersion = "ignored";
  (noisy.scenarios.A.frames[1].engineContext as { structuralMargin: number }).structuralMargin = 999;
  (noisy.scenarios.A.frames[1].visibleExecutionEvidence[0] as { actualExecutionPeriod: number }).actualExecutionPeriod = 4;
  assert.deepEqual(await buildInitiativeStructuralObservationFingerprints(noisy), base);
});

test("each definition semantic changes only the definition fingerprint", async () => {
  const base = await fingerprints();
  const variants: Options[] = [
    { firstEffect: "reduce_leverage" },
    { prerequisite: null },
    { claimAmount: 0.6 },
    { claimDuration: 3 },
    { resourceCapacity: 1.2 },
    { periodized: true },
  ];
  for (const variant of variants) {
    const changed = await fingerprints(variant);
    assert.notEqual(changed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
    assert.equal(changed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
    assert.equal(changed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  }
  const renamed = await fingerprints({ firstId: "renamed" });
  assert.notEqual(renamed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
  assert.notEqual(renamed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
  assert.notEqual(renamed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
});

test("scenario timing changes only its own plan fingerprint", async () => {
  const base = await fingerprints();
  const changedA = await fingerprints({ aFirstPeriod: 3 });
  assert.equal(changedA.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
  assert.notEqual(changedA.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
  assert.equal(changedA.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
  const changedB = await fingerprints({ bFirstPeriod: 2 });
  assert.equal(changedB.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
  assert.equal(changedB.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
  assert.notEqual(changedB.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
});

test("horizon changes both plan fingerprints but not the definition fingerprint", async () => {
  const base = await fingerprints();
  const changed = await fingerprints({ horizon: 6 });
  assert.equal(changed.structuralDefinitionFingerprint, base.structuralDefinitionFingerprint);
  assert.notEqual(changed.scenarioPlanFingerprintA, base.scenarioPlanFingerprintA);
  assert.notEqual(changed.scenarioPlanFingerprintB, base.scenarioPlanFingerprintB);
});

test("canonicalization is deterministic, whitelist-only, and normalizes negative zero", () => {
  const payload = structuredClone(projectInitiativeStructuralDefinitionFingerprintPayload(prepared())) as InitiativeStructuralFingerprintPayloadV2;
  const reordered = structuredClone(payload) as typeof payload;
  if (reordered.version !== "initiative-structural-definition-fingerprint-v2") return;
  (reordered.initiatives as unknown as unknown[]).reverse();
  (reordered as unknown as Record<string, unknown>).unknown = "ignored";
  const negativeZero = structuredClone(reordered);
  if (negativeZero.version !== "initiative-structural-definition-fingerprint-v2") return;
  const claimed = negativeZero.initiatives.find(({ resourceClaims }) => resourceClaims.length > 0);
  assert.ok(claimed);
  (claimed.resourceClaims[0] as { amount: number }).amount = -0;
  const zero = structuredClone(negativeZero);
  const zeroClaimed = zero.initiatives.find(({ resourceClaims }) => resourceClaims.length > 0);
  assert.ok(zeroClaimed);
  (zeroClaimed.resourceClaims[0] as { amount: number }).amount = 0;
  assert.equal(canonicalizeInitiativeStructuralFingerprintPayload(payload), canonicalizeInitiativeStructuralFingerprintPayload(reordered));
  assert.equal(canonicalizeInitiativeStructuralFingerprintPayload(negativeZero), canonicalizeInitiativeStructuralFingerprintPayload(zero));
});

test("rejects unsupported preparation, malformed plans, non-finite numbers, and unknown payloads", () => {
  const check = (mutate: (value: PreparedInitiativeStructuralObservationRunV2) => void, pattern: RegExp) => {
    const value = structuredClone(prepared()) as PreparedInitiativeStructuralObservationRunV2;
    mutate(value);
    assert.throws(() => projectInitiativeScenarioPlanFingerprintPayload(value, "A"), pattern);
  };
  check((value) => { (value as { preparationVersion: string }).preparationVersion = "wrong"; }, /preparation version/);
  check((value) => { (value.resolvedSchedules.A[0] as { scenario: string }).scenario = "B"; }, /contains B/);
  check((value) => { (value.resolvedSchedules.A[0] as { effectDefinitionId: string }).effectDefinitionId = "wrong"; }, /mismatched effect/);
  check((value) => { (value.resolvedSchedules.A[0] as { executionStep: number }).executionStep = 9; }, /outside horizon/);
  const definition = structuredClone(projectInitiativeStructuralDefinitionFingerprintPayload(prepared()));
  (definition.initiatives[0].resourceClaims[0] as { amount: number }).amount = Number.NaN;
  assert.throws(() => canonicalizeInitiativeStructuralFingerprintPayload(definition), /must be finite/);
  assert.throws(() => canonicalizeInitiativeStructuralFingerprintPayload({ version: "future" } as never), /unsupported payload version/);
});

test("fingerprints are versioned SHA-256, deterministic, detached, and recursively frozen", async () => {
  const source = structuredClone(prepared()) as PreparedInitiativeStructuralObservationRunV2;
  const before = structuredClone(source);
  const first = await buildInitiativeStructuralObservationFingerprints(source);
  const second = await buildInitiativeStructuralObservationFingerprints(source);
  assert.deepEqual(first, second);
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(source), false);
  assert.deepEqual(Object.keys(first).sort(), [
    "canonicalizationVersion",
    "fingerprintAlgorithm",
    "scenarioPlanFingerprintA",
    "scenarioPlanFingerprintB",
    "structuralDefinitionFingerprint",
    "version",
  ]);
  assert.equal(first.version, "initiative-structural-observation-fingerprints-v1");
  assert.equal(first.fingerprintAlgorithm, "sha256");
  assert.equal(first.canonicalizationVersion, "structural-semantic-json-v1");
  for (const hash of [first.structuralDefinitionFingerprint, first.scenarioPlanFingerprintA, first.scenarioPlanFingerprintB]) assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(first), true);
});

test("production source has no Node crypto, snapshots, diagnostics, persistence, engine, or UI dependency", () => {
  const source = readFileSync(new URL("./initiativeStructuralObservationFingerprints.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /node:crypto|DecisionSpaceSnapshot|Diagnostic|savedRun|localStorage|RealEstateEngine|runCascadeAnalysis|runInitiativeScheduledAnalysis|React/);
});
