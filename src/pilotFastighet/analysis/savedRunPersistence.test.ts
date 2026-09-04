import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { EngineState } from "../RealEstateEngine";
import type { ExecutableIdentity } from "../executableDomainProfile";
import {
  calculateCompatibleSavedMarginDelta,
  createSavedRunSnapshot,
  evaluateSavedRunCompatibility,
  getSavedRunCompatibilityMessage,
  loadSavedRunHistory,
  readSavedRunHistory,
} from "./savedRunPersistence";

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
