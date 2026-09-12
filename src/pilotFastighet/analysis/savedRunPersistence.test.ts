import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { EngineState } from "../RealEstateEngine";
import type { ExecutableIdentity } from "../executableDomainProfile";
import {
  calculateCompatibleSavedMarginDelta,
  createSavedRunSnapshot,
  evaluateSavedRunCompatibility,
  evaluateSavedRunInitiativeStructuralObservationCompatibility,
  evaluateSavedRunStructuralObservationCompatibility,
  getSavedRunCompatibilityMessage,
  loadSavedRunHistory,
  readSavedRunHistory,
} from "./savedRunPersistence";
import type { StructuralObservationIdentity } from "./structuralObservation/structuralObservationIdentity";
import type { InitiativeStructuralObservationIdentity } from "./structuralObservation/initiativeStructuralObservationIdentity";

const identities = {
  realEstate: {
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "legacy-global-v1",
  },
  transport: {
    domainId: "municipal",
    profileId: "legacy-municipal-v1",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "transport-causal-subset-v2",
  },
  consulting: {
    domainId: "consulting",
    profileId: "legacy-consulting-v1",
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "legacy-global-v1",
  },
} as const satisfies Record<string, ExecutableIdentity>;

const structuralIdentity = Object.freeze({
  version: "structural-observation-v1",
  resultSchemaVersion: "decision-space-snapshot-v1",
  canonicalizationVersion: "structural-semantic-json-v1",
  fingerprintAlgorithm: "sha256",
  structuralDefinitionFingerprint: "1".repeat(64),
  scenarioPlanFingerprintA: "2".repeat(64),
  scenarioPlanFingerprintB: "3".repeat(64),
  horizon: 36,
}) satisfies StructuralObservationIdentity;

const initiativeStructuralIdentity = Object.freeze({
  version: "initiative-structural-observation-identity-v1",
  structuralObservationSchemaVersion: "structural-observation-v2",
  resultSchemaVersion: "structural-observation-v2",
  fingerprintsVersion: "initiative-structural-observation-fingerprints-v1",
  fingerprintAlgorithm: "sha256",
  canonicalizationVersion: "structural-semantic-json-v1",
  definitionPayloadVersion: "initiative-structural-definition-fingerprint-v2",
  scenarioPlanPayloadVersion: "initiative-scenario-plan-fingerprint-v2",
  horizon: 36,
  structuralDefinitionFingerprint: "4".repeat(64),
  scenarioPlanFingerprintA: "5".repeat(64),
  scenarioPlanFingerprintB: "6".repeat(64),
}) satisfies InitiativeStructuralObservationIdentity;

function engineState(margin: number): EngineState {
  return { margin } as EngineState;
}

function snapshot(
  identity: ExecutableIdentity | undefined,
  margin = 1,
  scenario: "A" | "B" = "A"
) {
  const base = {
    snapshotId: `${scenario}-${margin}`,
    createdAt: 1,
    engineState: engineState(margin),
    metadata: { caseId: null, scenario, modelVersion: "pilot-fastighet-v0.4" },
  } as const;
  return identity ? { ...base, executionIdentity: identity } : base;
}

test("matching Real Estate, Transport, and Consulting results are compatible", () => {
  for (const identity of Object.values(identities)) {
    assert.deepEqual(evaluateSavedRunCompatibility(snapshot(identity), snapshot(identity)), {
      classification: "compatible",
      comparable: true,
    });
  }
});

test("compatibility uses stable domain, profile, model, then calibration precedence", () => {
  const base = identities.realEstate;
  assert.equal(evaluateSavedRunCompatibility(snapshot(base), snapshot(identities.transport)).classification, "different-domain");
  assert.equal(evaluateSavedRunCompatibility(snapshot(base), snapshot({ ...base, profileId: "legacy-consulting-v1" })).classification, "different-profile");
  assert.equal(evaluateSavedRunCompatibility(snapshot(base), snapshot({ ...base, modelVersion: "next" })).classification, "different-model-version");
  assert.equal(evaluateSavedRunCompatibility(snapshot(base), snapshot({ ...base, calibrationVersion: "next" })).classification, "different-calibration-version");
});

test("versioned/legacy, legacy/legacy, and incomplete identities are never compatible", () => {
  const legacy = snapshot(undefined);
  const incomplete = { ...snapshot(undefined), executionIdentity: { ...identities.realEstate, calibrationVersion: undefined } };
  assert.equal(evaluateSavedRunCompatibility(snapshot(identities.realEstate), legacy).classification, "legacy-or-unknown");
  assert.equal(evaluateSavedRunCompatibility(legacy, legacy).comparable, false);
  assert.equal(evaluateSavedRunCompatibility(snapshot(identities.realEstate), incomplete as never).comparable, false);
});

test("compatible delta is numerically invariant and incompatible delta is blocked", () => {
  assert.equal(calculateCompatibleSavedMarginDelta(snapshot(identities.transport, 0.25), snapshot(identities.transport, 0.9, "B")), 0.65);
  assert.equal(calculateCompatibleSavedMarginDelta(snapshot(identities.realEstate, 0.25), snapshot(identities.transport, 0.9, "B")), null);
});

test("new A and B snapshots preserve the exact completed-run identity through JSON reload", () => {
  const completedIdentity = identities.transport;
  const a = createSavedRunSnapshot({ snapshotId: "a", createdAt: 1, engineState: engineState(0.4), caseId: "case", scenario: "A", executionIdentity: completedIdentity });
  const b = createSavedRunSnapshot({ snapshotId: "b", createdAt: 2, engineState: engineState(0.8), caseId: "case", scenario: "B", executionIdentity: completedIdentity });
  const restored = readSavedRunHistory(JSON.stringify([a, b]));
  assert.deepEqual(restored.map((entry) => entry.executionIdentity), [completedIdentity, completedIdentity]);
  assert.equal(evaluateSavedRunCompatibility(restored[0], restored[1]).comparable, true);
  assert.equal(Object.isFrozen(a.executionIdentity), true);
});

test("later language, appearance, domain, and template state cannot rewrite saved identity", () => {
  const mutableUiState = { language: "sv", appearance: "dark", domain: "municipal", template: "one" };
  const saved = createSavedRunSnapshot({ snapshotId: "a", createdAt: 1, engineState: engineState(0.4), caseId: null, scenario: "A", executionIdentity: identities.transport });
  mutableUiState.language = "en";
  mutableUiState.appearance = "light";
  mutableUiState.domain = "realEstate";
  mutableUiState.template = "two";
  assert.deepEqual(saved.executionIdentity, identities.transport);
});

test("legacy values and labels remain readable without migration, while malformed storage fails safely", () => {
  const legacy = { ...snapshot(undefined), label: "Kept label" };
  assert.deepEqual(readSavedRunHistory(JSON.stringify([legacy])), [legacy]);
  assert.deepEqual(readSavedRunHistory("not-json"), []);
  assert.deepEqual(readSavedRunHistory(JSON.stringify({ snapshotId: "wrong-root" })), []);
  assert.deepEqual(readSavedRunHistory(JSON.stringify([{ snapshotId: 3 }, legacy])), [legacy]);
  assert.deepEqual(loadSavedRunHistory({ getItem() { throw new Error("denied"); } }, "history"), []);
});

test("blocked-comparison explanations are bilingual and the page gates numeric output", () => {
  const compatibility = evaluateSavedRunCompatibility(snapshot(identities.realEstate), snapshot(identities.transport));
  assert.match(getSavedRunCompatibilityMessage(compatibility, "sv") ?? "", /kan därför inte jämföras direkt/);
  assert.match(getSavedRunCompatibilityMessage(compatibility, "en") ?? "", /cannot be compared directly/);
  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  assert.match(page, /!frozenComparisonPolicy\.comparable/);
  assert.match(page, /completedExecutionIdentityRef\.current/);
  assert.doesNotMatch(page, /executionIdentity:\s*\{\s*domainId:\s*domain/);
});

test("every incompatibility classification has a specific Swedish and English explanation", () => {
  const base = identities.realEstate;
  const pairs = [
    [snapshot(base), snapshot(identities.transport), /olika domäner/, /different domains/],
    [snapshot(base), snapshot({ ...base, profileId: "legacy-consulting-v1" }), /olika körprofiler/, /different executable profiles/],
    [snapshot(base), snapshot({ ...base, modelVersion: "next" }), /olika modellversioner/, /different model versions/],
    [snapshot(base), snapshot({ ...base, calibrationVersion: "next" }), /olika kalibreringsversioner/, /different calibration versions/],
    [snapshot(base), snapshot(undefined), /äldre resultat/, /legacy result/],
  ] as const;
  for (const [left, right, sv, en] of pairs) {
    const compatibility = evaluateSavedRunCompatibility(left as never, right as never);
    assert.match(getSavedRunCompatibilityMessage(compatibility, "sv") ?? "", sv);
    assert.match(getSavedRunCompatibilityMessage(compatibility, "en") ?? "", en);
  }
});

test("legacy snapshots and creation without observation identity remain unchanged", () => {
  const legacy = snapshot(identities.transport);
  assert.deepEqual(readSavedRunHistory(JSON.stringify([legacy])), [legacy]);
  const created = createSavedRunSnapshot({
    snapshotId: "legacy-compatible",
    createdAt: 123,
    engineState: engineState(0.5),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.transport,
  });
  assert.equal(created.snapshotId, "legacy-compatible");
  assert.equal("structuralObservationIdentity" in created, false);
  assert.deepEqual(created.executionIdentity, identities.transport);
});

test("valid observation identity is safely projected and survives JSON round-trip", () => {
  const callerIdentity = {
    ...structuralIdentity,
    ignoredFutureField: { mustNotLeak: true },
  };
  const before = structuredClone(callerIdentity);
  const created = createSavedRunSnapshot({
    snapshotId: "observed",
    createdAt: 456,
    engineState: engineState(0.75),
    caseId: "case",
    scenario: "B",
    executionIdentity: identities.transport,
    structuralObservationIdentity: callerIdentity,
  });
  assert.deepEqual(created.structuralObservationIdentity, structuralIdentity);
  assert.notEqual(created.structuralObservationIdentity, callerIdentity);
  assert.equal(Object.isFrozen(created.structuralObservationIdentity), true);
  assert.equal(
    "ignoredFutureField" in (created.structuralObservationIdentity ?? {}),
    false
  );
  assert.deepEqual(callerIdentity, before);
  assert.equal(Object.isFrozen(callerIdentity), false);
  assert.equal(Object.isFrozen(callerIdentity.ignoredFutureField), false);
  const restored = readSavedRunHistory(JSON.stringify([created]));
  assert.deepEqual(restored[0].structuralObservationIdentity, structuralIdentity);
  assert.notEqual(
    restored[0].structuralObservationIdentity,
    created.structuralObservationIdentity
  );
});

test("malformed and unsupported observation identity are omitted without losing the saved run", () => {
  for (const invalidIdentity of [
    { ...structuralIdentity, horizon: 0 },
    { ...structuralIdentity, version: "structural-observation-v2" },
    { ...structuralIdentity, scenarioPlanFingerprintA: "invalid" },
  ]) {
    const persisted = {
      ...snapshot(identities.transport),
      structuralObservationIdentity: invalidIdentity,
      unknownSavedRunField: "tolerated",
    };
    const [restored] = readSavedRunHistory(JSON.stringify([persisted]));
    assert.equal(restored.snapshotId, persisted.snapshotId);
    assert.equal("structuralObservationIdentity" in restored, false);
    assert.equal(
      (restored as unknown as Record<string, unknown>).unknownSavedRunField,
      "tolerated"
    );
  }
  const created = createSavedRunSnapshot({
    snapshotId: "invalid-observation",
    createdAt: 1,
    engineState: engineState(1),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.transport,
    structuralObservationIdentity: {
      ...structuralIdentity,
      horizon: 0,
    } as StructuralObservationIdentity,
  });
  assert.equal("structuralObservationIdentity" in created, false);
});

test("observation compatibility is separate from unchanged engine compatibility", () => {
  const observed = (identity: StructuralObservationIdentity | undefined) => ({
    ...snapshot(identities.transport),
    ...(identity ? { structuralObservationIdentity: identity } : {}),
  });
  const changedDefinition = {
    ...structuralIdentity,
    structuralDefinitionFingerprint: "4".repeat(64),
  };
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(
      observed(undefined),
      observed(undefined)
    ).classification,
    "both-unobserved"
  );
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(
      observed(structuralIdentity),
      observed(undefined)
    ).classification,
    "only-one-observed"
  );
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(
      observed(structuralIdentity),
      observed(structuralIdentity)
    ).classification,
    "compatible"
  );
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(
      observed(structuralIdentity),
      observed(changedDefinition)
    ).classification,
    "different-structural-definition"
  );
  assert.deepEqual(
    evaluateSavedRunCompatibility(
      observed(structuralIdentity),
      observed(changedDefinition)
    ),
    evaluateSavedRunCompatibility(observed(undefined), observed(undefined))
  );
});

test("observation identity persistence never stores snapshots or diagnostics", () => {
  const created = createSavedRunSnapshot({
    snapshotId: "identity-only",
    createdAt: 789,
    engineState: engineState(1),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.transport,
    structuralObservationIdentity: structuralIdentity,
  });
  const serialized = JSON.stringify(created);
  assert.doesNotMatch(serialized, /DecisionSpaceSnapshot|snapshots|diagnostics/);
});

test("legacy saved runs remain exact and absent V2 identity is never fabricated", () => {
  const legacy = snapshot(identities.realEstate);
  assert.deepEqual(readSavedRunHistory(JSON.stringify([legacy])), [legacy]);
  const created = createSavedRunSnapshot({
    snapshotId: "without-v2",
    createdAt: 1,
    engineState: engineState(1),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.realEstate,
  });
  assert.equal("initiativeStructuralObservationIdentity" in created, false);
});

test("valid V2 identity is saved as a detached frozen whitelist and round-trips", () => {
  const callerIdentity = {
    ...initiativeStructuralIdentity,
    ignoredFutureField: { mustNotLeak: true },
  };
  const before = structuredClone(callerIdentity);
  const created = createSavedRunSnapshot({
    snapshotId: "with-v2",
    createdAt: 2,
    engineState: engineState(0.5),
    caseId: "case",
    scenario: "B",
    executionIdentity: identities.realEstate,
    initiativeStructuralObservationIdentity: callerIdentity,
  });
  assert.deepEqual(created.initiativeStructuralObservationIdentity, initiativeStructuralIdentity);
  assert.notStrictEqual(created.initiativeStructuralObservationIdentity, callerIdentity);
  assert.equal(Object.isFrozen(created.initiativeStructuralObservationIdentity), true);
  assert.equal("ignoredFutureField" in (created.initiativeStructuralObservationIdentity ?? {}), false);
  assert.deepEqual(callerIdentity, before);
  assert.equal(Object.isFrozen(callerIdentity), false);
  assert.equal(Object.isFrozen(callerIdentity.ignoredFutureField), false);
  const [restored] = readSavedRunHistory(JSON.stringify([created]));
  assert.deepEqual(restored.initiativeStructuralObservationIdentity, initiativeStructuralIdentity);
  assert.notStrictEqual(restored.initiativeStructuralObservationIdentity, created.initiativeStructuralObservationIdentity);
});

test("malformed and unsupported V2 identity are omitted without losing saved runs", () => {
  for (const invalidIdentity of [
    { ...initiativeStructuralIdentity, horizon: 0 },
    { ...initiativeStructuralIdentity, version: "future" },
    { ...initiativeStructuralIdentity, fingerprintAlgorithm: "future" },
    { ...initiativeStructuralIdentity, scenarioPlanFingerprintA: "invalid" },
  ]) {
    const persisted = {
      ...snapshot(identities.realEstate),
      initiativeStructuralObservationIdentity: invalidIdentity,
      unknownSavedRunField: "kept",
    };
    const [restored] = readSavedRunHistory(JSON.stringify([persisted]));
    assert.equal(restored.snapshotId, persisted.snapshotId);
    assert.equal("initiativeStructuralObservationIdentity" in restored, false);
    assert.equal((restored as unknown as Record<string, unknown>).unknownSavedRunField, "kept");
  }
  const created = createSavedRunSnapshot({
    snapshotId: "invalid-v2",
    createdAt: 3,
    engineState: engineState(1),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.realEstate,
    initiativeStructuralObservationIdentity: {
      ...initiativeStructuralIdentity,
      horizon: 0,
    } as InitiativeStructuralObservationIdentity,
  });
  assert.equal("initiativeStructuralObservationIdentity" in created, false);
});

test("V1 and V2 identities coexist but are projected and evaluated separately", () => {
  const created = createSavedRunSnapshot({
    snapshotId: "both",
    createdAt: 4,
    engineState: engineState(0.75),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.realEstate,
    structuralObservationIdentity: structuralIdentity,
    initiativeStructuralObservationIdentity: initiativeStructuralIdentity,
  });
  assert.deepEqual(created.structuralObservationIdentity, structuralIdentity);
  assert.deepEqual(created.initiativeStructuralObservationIdentity, initiativeStructuralIdentity);
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(created, created).classification,
    "compatible"
  );
  assert.deepEqual(
    evaluateSavedRunInitiativeStructuralObservationCompatibility(created, initiativeStructuralIdentity),
    { classification: "compatible", comparable: true }
  );
  const onlyV1 = { ...created, initiativeStructuralObservationIdentity: undefined };
  assert.equal(
    evaluateSavedRunInitiativeStructuralObservationCompatibility(onlyV1, initiativeStructuralIdentity).classification,
    "missing-identity"
  );
  assert.equal(
    evaluateSavedRunStructuralObservationCompatibility(onlyV1, created).classification,
    "compatible"
  );
});

test("V2 compatibility delegates every semantic mismatch without affecting engine compatibility", () => {
  const saved = createSavedRunSnapshot({
    snapshotId: "compatibility",
    createdAt: 5,
    engineState: engineState(1),
    caseId: null,
    scenario: "A",
    executionIdentity: identities.realEstate,
    initiativeStructuralObservationIdentity: initiativeStructuralIdentity,
  });
  const cases = [
    [{ horizon: 35 }, "horizon-mismatch"],
    [{ structuralDefinitionFingerprint: "7".repeat(64) }, "structural-definition-mismatch"],
    [{ scenarioPlanFingerprintA: "7".repeat(64) }, "scenario-plan-a-mismatch"],
    [{ scenarioPlanFingerprintB: "7".repeat(64) }, "scenario-plan-b-mismatch"],
  ] as const;
  for (const [change, classification] of cases) {
    const current = { ...initiativeStructuralIdentity, ...change } as InitiativeStructuralObservationIdentity;
    assert.equal(
      evaluateSavedRunInitiativeStructuralObservationCompatibility(saved, current).classification,
      classification
    );
    assert.equal(evaluateSavedRunCompatibility(saved, saved).classification, "compatible");
  }
});

test("V2 persistence stores identity only and remains deterministic", () => {
  const create = () => createSavedRunSnapshot({
    snapshotId: "identity-only-v2",
    createdAt: 6,
    engineState: engineState(1),
    caseId: null,
    scenario: "B" as const,
    executionIdentity: identities.realEstate,
    initiativeStructuralObservationIdentity: initiativeStructuralIdentity,
  });
  assert.deepEqual(create(), create());
  const persisted = JSON.parse(JSON.stringify(create())) as Record<string, unknown>;
  for (const field of [
    "snapshots",
    "diagnostics",
    "frames",
    "trajectory",
    "executionProvenance",
    "preparedAnalysis",
    "fingerprints",
  ]) {
    assert.equal(field in persisted, false);
  }
});
