import assert from "node:assert/strict";
import test from "node:test";
import type { ExecutableProfileId } from "../../executableDomainProfile";
import { resolveExecutableDomainProfile } from "../../executableDomainProfile";
import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "./baselineCanonicalizationV1";
import consultingFixture from "./fixtures/legacy-domain-profile-semantic-payload-v1/legacy-consulting-v1.json";
import municipalFixture from "./fixtures/legacy-domain-profile-semantic-payload-v1/legacy-municipal-v1.json";
import realEstateFixture from "./fixtures/legacy-domain-profile-semantic-payload-v1/legacy-real-estate-v1.json";
import { LEGACY_ALGORITHM_ASSUMPTIONS_V1 } from "./legacyAlgorithmAssumptionsV1";
import {
  projectLegacyDomainProfileSemanticPayloadV1,
  type LegacyDomainProfileSemanticPayloadV1,
} from "./legacyDomainProfileSemanticPayloadV1";

const CASES = [
  {
    domainId: "realEstate",
    profileId: "legacy-real-estate-v1",
    fixture: realEstateFixture,
    hash: "898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc",
  },
  {
    domainId: "municipal",
    profileId: "legacy-municipal-v1",
    fixture: municipalFixture,
    hash: "81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b",
  },
  {
    domainId: "consulting",
    profileId: "legacy-consulting-v1",
    fixture: consultingFixture,
    hash: "b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7",
  },
] as const;

const INCLUDED_FIELDS = [
  "schemaVersion",
  "identity",
  "applicableDrivers",
  "defaultState",
  "actions",
  "supportedActionIds",
  "propagationRelationships",
  "constraints",
  "marginEscalationRules",
  "impactContract",
  "curveConfiguration",
  "clampPolicy",
] as const;

// ExecutableDomainProfile has no label/group/template/AI fields. Those values are
// presentation metadata and are intentionally outside this semantic projection.
const PRESENTATION_ONLY_FIELDS = ["label", "labels", "group", "template", "ai", "copy"] as const;

function fixture(value: unknown): LegacyDomainProfileSemanticPayloadV1 {
  return value as LegacyDomainProfileSemanticPayloadV1;
}

function assertRecursivelyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertRecursivelyFrozen(nested);
}

test("trusted resolver returns exactly the three versioned legacy profiles", () => {
  for (const entry of CASES) {
    const profile = resolveExecutableDomainProfile(entry.profileId, entry.domainId);
    assert.equal(profile.profileId, entry.profileId);
    assert.equal(profile.domainId, entry.domainId);
  }
  assert.throws(() => projectLegacyDomainProfileSemanticPayloadV1("unknown" as ExecutableProfileId), /Unknown executable profile/);
});

test("projection contains the complete explicit profile semantic field set and no presentation copy", () => {
  for (const entry of CASES) {
    const payload = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    assert.deepEqual(Object.keys(payload), INCLUDED_FIELDS);
    const serialized = JSON.stringify(payload);
    for (const field of PRESENTATION_ONLY_FIELDS) {
      assert.equal(new RegExp(`"${field}"`, "i").test(serialized), false);
    }
  }
});

test("each independent fixture and runtime projection is strict canonical JSON", () => {
  for (const entry of CASES) {
    const expected = fixture(entry.fixture);
    const actual = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    assert.doesNotThrow(() => canonicalizeBaselineValueV1(expected));
    assert.doesNotThrow(() => canonicalizeBaselineValueV1(actual));
    assert.deepEqual(JSON.parse(JSON.stringify(expected)), expected);
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), actual);
  }
});

test("every runtime projection deep-equals its independent readable fixture", () => {
  for (const entry of CASES) {
    assert.deepEqual(projectLegacyDomainProfileSemanticPayloadV1(entry.profileId), entry.fixture);
  }
});

test("fixture and runtime hashes match three explicit lowercase SHA-256 goldens", () => {
  const hashes = new Set<string>();
  for (const entry of CASES) {
    assert.match(entry.hash, /^[0-9a-f]{64}$/);
    assert.equal(hashBaselineValueV1(entry.fixture), entry.hash);
    assert.equal(hashBaselineValueV1(projectLegacyDomainProfileSemanticPayloadV1(entry.profileId)), entry.hash);
    hashes.add(entry.hash);
  }
  assert.equal(hashes.size, CASES.length);
});

test("repeated projection has identical canonical bytes and hashes", () => {
  for (const entry of CASES) {
    const first = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    const second = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    assert.deepEqual(first, second);
    assert.equal(canonicalizeBaselineValueV1(first), canonicalizeBaselineValueV1(second));
    assert.equal(hashBaselineValueV1(first), hashBaselineValueV1(second));
  }
});

test("projection is detached and frozen without mutating profiles or fixtures", () => {
  for (const entry of CASES) {
    const profile = resolveExecutableDomainProfile(entry.profileId);
    const profileBefore = structuredClone(profile);
    const fixtureBefore = structuredClone(entry.fixture);
    const payload = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    assert.notStrictEqual(payload, profile);
    assert.notStrictEqual(payload.defaultState, profile.defaultState);
    assert.notStrictEqual(payload, entry.fixture);
    assert.notStrictEqual(payload.defaultState, entry.fixture.defaultState);
    assertRecursivelyFrozen(payload);
    assert.deepEqual(profile, profileBefore);
    assert.deepEqual(entry.fixture, fixtureBefore);
  }
});

test("semantic change and semantic array order change the hash", () => {
  const base = fixture(realEstateFixture);
  const changed = structuredClone(base) as LegacyDomainProfileSemanticPayloadV1;
  (changed.clampPolicy as { maximum: number }).maximum = 2;
  assert.notEqual(hashBaselineValueV1(changed), hashBaselineValueV1(base));

  const reordered = structuredClone(base) as LegacyDomainProfileSemanticPayloadV1;
  (reordered.propagationRelationships as unknown as unknown[]).reverse();
  assert.notEqual(hashBaselineValueV1(reordered), hashBaselineValueV1(base));
});

test("object insertion order is hash-neutral", () => {
  const base = fixture(realEstateFixture);
  const reversedTopLevel = Object.fromEntries(Object.entries(base).reverse());
  assert.equal(hashBaselineValueV1(reversedTopLevel), hashBaselineValueV1(base));
});

test("profile differences are real and remain independently hashed", () => {
  assert.notDeepEqual(realEstateFixture, municipalFixture);
  assert.notDeepEqual(realEstateFixture, consultingFixture);
  assert.notDeepEqual(municipalFixture, consultingFixture);
});

test("legacy profiles expose all 15 global action effects while domain support remains the exact 8/7/10 subset", () => {
  const expectedSupportedCounts = {
    "legacy-real-estate-v1": 8,
    "legacy-municipal-v1": 7,
    "legacy-consulting-v1": 10,
  } as const;
  const globalActions = projectLegacyDomainProfileSemanticPayloadV1(
    "legacy-real-estate-v1"
  ).actions;

  assert.equal(globalActions.length, 15);
  for (const entry of CASES) {
    const payload = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    assert.equal(payload.actions.length, 15);
    assert.deepEqual(payload.actions, globalActions);
    assert.equal(payload.supportedActionIds.length, expectedSupportedCounts[entry.profileId]);

    for (const supportedActionId of payload.supportedActionIds) {
      assert.equal(
        payload.actions.filter(({ actionId }) => actionId === supportedActionId).length,
        1,
        `${entry.profileId} supported action ${supportedActionId} must occur exactly once in the global action registry`
      );
    }
  }
});

// VERIFIED LEGACY SEMANTIC GAP: supported actions currently reference these
// non-applicable drivers. This is not a desired Domain Model Contract rule; the
// migration must resolve it explicitly. M0B-2 records the gap and must not
// normalize, filter, or repair the existing legacy payload.
test("verified legacy semantic gap remains explicit for supported-action drivers outside applicableDrivers", () => {
  const expectedMissingDrivers = {
    "legacy-real-estate-v1": ["implementationPacingRisk", "liquidityPressure"],
    "legacy-municipal-v1": ["modal_shift_pressure", "political_feasibility"],
    "legacy-consulting-v1": ["modal_shift_pressure", "political_feasibility"],
  } as const;

  for (const entry of CASES) {
    const payload = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId);
    const supported = new Set(payload.supportedActionIds);
    const applicable = new Set(payload.applicableDrivers);
    const missingDrivers = [...new Set(
      payload.actions
        .filter(({ actionId }) => supported.has(actionId))
        .flatMap(({ driverDeltas }) => Object.keys(driverDeltas))
        .filter((driverId) => !applicable.has(driverId))
    )].sort();

    assert.deepEqual(missingDrivers, expectedMissingDrivers[entry.profileId]);
  }
});

test("algorithm assumptions are explicitly outside the profile payload and deferred to numeric goldens", () => {
  assert.equal(LEGACY_ALGORITHM_ASSUMPTIONS_V1.length, 8);
  for (const assumption of LEGACY_ALGORITHM_ASSUMPTIONS_V1) {
    assert.equal(assumption.status, "NOT IN PROFILE PAYLOAD");
    assert.match(assumption.runtimeAnchor, /^src\/pilotFastighet\//);
  }
  for (const entry of CASES) {
    const payload = projectLegacyDomainProfileSemanticPayloadV1(entry.profileId) as unknown as Record<string, unknown>;
    assert.equal("algorithmAssumptions" in payload, false);
  }
});

test("profile fixtures do not fabricate M0B-1 execution-result manifests", () => {
  for (const entry of CASES) {
    const expected = entry.fixture as unknown as Record<string, unknown>;
    assert.equal("baselineSource" in expected, false);
    assert.equal("executionSurface" in expected, false);
    assert.equal("input" in expected, false);
    assert.equal("result" in expected, false);
  }
});
