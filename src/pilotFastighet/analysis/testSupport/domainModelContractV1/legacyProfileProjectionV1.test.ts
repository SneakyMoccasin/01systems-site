import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import { projectLegacyDomainProfileSemanticPayloadV1 } from "../legacyDomainProfileSemanticPayloadV1";
import { createInitialConstraintRegistry } from "../../../constraintState";
import consultingSourceFixture from "../fixtures/legacy-domain-profile-semantic-payload-v1/legacy-consulting-v1.json";
import municipalSourceFixture from "../fixtures/legacy-domain-profile-semantic-payload-v1/legacy-municipal-v1.json";
import realEstateSourceFixture from "../fixtures/legacy-domain-profile-semantic-payload-v1/legacy-real-estate-v1.json";
import consultingFixture from "./fixtures/legacy-profile-projection-v1/legacy-consulting-v1.json";
import municipalFixture from "./fixtures/legacy-profile-projection-v1/legacy-municipal-v1.json";
import realEstateFixture from "./fixtures/legacy-profile-projection-v1/legacy-real-estate-v1.json";
import { hashLegacyCompatibilityIdentityV1, hashLegacyProfileProjectionEnvelopeV1, projectLegacyCompatibilityIdentityV1, projectLegacyProfileProjectionEnvelopeHashV1, verifyLegacyProfileProjectionEnvelopeV1Hashes } from "./hashLegacyProfileProjectionEnvelopeV1";
import { LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES, LEGACY_PROFILE_PROJECTION_V1_PROVENANCE, LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING } from "./legacyProfileProjectionV1";
import { hashDomainModelContractSemanticIdentityV1, projectDomainModelContractSemanticIdentityV1 } from "./domainModelContractSemanticIdentityV1";
import { parseDomainModelContractV1 } from "./parseDomainModelContractV1";
import { parseDomainModelContractV1Structure } from "./parseDomainModelContractV1Structure";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "./parseLegacyProfileProjectionEnvelopeV1Structure";
import { projectLegacyProfilePayloadV1, projectLegacyProfileToDomainModelContractV1, projectLegacyProfileV1 } from "./projectLegacyProfileToDomainModelContractV1";
import { validateDomainModelContractIdentityCollisionsV1 } from "./validateDomainModelContractIdentityCollisionsV1";
import { validateDomainModelContractV1Semantics } from "./validateDomainModelContractV1Semantics";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

const PROFILES = ["legacy-real-estate-v1", "legacy-municipal-v1", "legacy-consulting-v1"] as const;
const FIXTURES = { "legacy-real-estate-v1": realEstateFixture, "legacy-municipal-v1": municipalFixture, "legacy-consulting-v1": consultingFixture } as const;
const SOURCE_FIXTURES = { "legacy-real-estate-v1": realEstateSourceFixture, "legacy-municipal-v1": municipalSourceFixture, "legacy-consulting-v1": consultingSourceFixture } as const;
const SOURCE_HASHES = { "legacy-real-estate-v1": "sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc", "legacy-municipal-v1": "sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b", "legacy-consulting-v1": "sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7" } as const;
const ENVELOPE_HASHES = { "legacy-real-estate-v1": "sha256:fb31efa3ea25f58c12091328350ee321e1da85abec291384b8fc545e2f286183", "legacy-municipal-v1": "sha256:08ae9d9de9de5774a62a86e75616adb1891bf60c0d4b642d23f0a3e71cb19c0f", "legacy-consulting-v1": "sha256:9df150ed7122ebfc17f0f3a9a80406d34c20c1db30ec0563da9b5dbc221dfc7d" } as const;
const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
const keys = (value: object): string[] => Object.keys(value).sort(compareText);
type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function requireProjection(profileId: typeof PROFILES[number]) { const result = projectLegacyProfileV1(profileId); assert.equal(result.ok, true); if (!result.ok) throw new Error("Projection unexpectedly failed."); return result.value; }
function visitFrozen(value: unknown): void { if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); Object.values(value).forEach(visitFrozen); } }

test("projects all three live legacy profiles through the complete validated pipeline", () => { for (const profileId of PROFILES) { const first = requireProjection(profileId), second = requireProjection(profileId); assert.deepEqual(first, second); assert.equal(canonicalizeBaselineValueV1(first), canonicalizeBaselineValueV1(second)); visitFrozen(first); } });
test("binds exact source and projected identities and independently recomputes source fixture hashes", () => { const domains = { "legacy-real-estate-v1": ["realEstate", "real-estate"], "legacy-municipal-v1": ["municipal", "municipal"], "legacy-consulting-v1": ["consulting", "consulting"] } as const; for (const profileId of PROFILES) { const source = projectLegacyDomainProfileSemanticPayloadV1(profileId), value = requireProjection(profileId).envelope; assert.equal(`sha256:${hashBaselineValueV1(source)}`, SOURCE_HASHES[profileId]); assert.equal(value.source.semanticPayloadHash, SOURCE_HASHES[profileId]); assert.equal(value.source.identity.domainId, domains[profileId][0]); assert.equal(value.projection.identity.domainId, domains[profileId][1]); assert.equal(value.projection.identity.profileId, `${profileId}-domain-model-contract-v1`); } });
test("projects exact native driver, action, effect, curve, edge, constraint and measure inventories", () => { for (const profileId of PROFILES) { const envelope = requireProjection(profileId).envelope, payload = envelope.projection.contract.semanticPayload; assert.equal(payload.drivers.length, 18); assert.equal(payload.curves.length, 18); assert.equal(new Set(payload.curves.map(value => value.curveId)).size, 18); assert.equal(payload.actions.length, profileId === "legacy-real-estate-v1" ? 8 : profileId === "legacy-municipal-v1" ? 6 : 9); assert.equal(payload.actions.some(value => value.actionId === "congestion_pricing"), false); assert.equal(payload.drivers.some(value => value.driverId === "liquidity-pressure"), false); assert.equal(payload.constraints.length, profileId === "legacy-municipal-v1" ? 0 : 1); assert.equal(payload.measures.length, 1); assert.equal(payload.measures[0].terms.length, 4); for (const action of payload.actions) assert.ok(action.effects.length > 0); for (const edge of payload.propagation.edges) assert.ok(payload.drivers.some(driver => driver.driverId === edge.sourceDriverId) && payload.drivers.some(driver => driver.driverId === edge.targetDriverId)); } });
test("projects exact profile-local compatibility and all six gap tuple occurrences", () => { let tuples = 0; const ids = new Set<string>(); for (const profileId of PROFILES) { const value = requireProjection(profileId).envelope.compatibility; assert.deepEqual(value.excludedUnsupportedActionIds, [...value.excludedUnsupportedActionIds].sort(compareText)); assert.equal(value.compatibilityOnlyActions.length, profileId === "legacy-real-estate-v1" ? 0 : 1); assert.equal(value.propagation.sourceEvaluationOrder.length, profileId === "legacy-municipal-v1" ? 3 : 20); assert.equal(value.propagation.compatibilityOnlyEdges.length, profileId === "legacy-municipal-v1" ? 0 : 3); for (const tuple of value.ignoredUnknownDriverDeltas) { tuples += 1; ids.add(tuple.sourceDriverId); } for (const action of value.compatibilityOnlyActions) for (const effect of action.ignoredEffects) { tuples += 1; ids.add(effect.driverId); } } assert.equal(tuples, 6); assert.deepEqual([...ids].sort(compareText), ["implementationPacingRisk", "liquidityPressure", "modal_shift_pressure", "political_feasibility"].sort(compareText)); });
test("registry compatibility projection matches the production constructor without entering native constraints",()=>{const initial=createInitialConstraintRegistry();for(const profileId of PROFILES){const envelope=requireProjection(profileId).envelope,entries=envelope.compatibility.legacyRegistryProjection.entries;assert.deepEqual(entries.map(x=>x.sourceRegistryKey),profileId==="legacy-municipal-v1"?["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"]:["LiquidityConstraint","CovenantConstraint","Custom"]);for(const entry of entries){assert.deepEqual(initial[entry.sourceRegistryKey],{type:entry.legacyType,lifecycle:entry.initialState.lifecycle,lastUpdatedStep:entry.initialState.lastUpdatedStep});assert.equal(entry.initialState.activatedAtStep,"absent");assert.equal(entry.sourceEvidence.initialRegistryStateHash,withSha256Prefix(initial[entry.sourceRegistryKey]));}assert.equal(envelope.projection.contract.semanticPayload.constraints.some(x=>entries.some(entry=>entry.compatibilityEntryId.endsWith(x.constraintId))),false);}});
test("accounts exhaustively for every enumerable source field family", () => { assert.deepEqual(keys(LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING), ["actions", "applicableDrivers", "clampPolicy", "constraints", "curveConfiguration", "defaultState", "identity", "impactContract", "marginEscalationRules", "propagationRelationships", "schemaVersion", "supportedActionIds"]); for (const profileId of PROFILES) { const source = projectLegacyDomainProfileSemanticPayloadV1(profileId); assert.deepEqual(keys(source), keys(LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING)); assert.deepEqual(keys(source.identity), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.identity); assert.deepEqual(keys(source.actions[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.action); assert.deepEqual(keys(source.propagationRelationships[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.propagationRelationship); assert.deepEqual(keys(source.propagationRelationships[0].targets[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.propagationTarget); assert.deepEqual(keys(source.constraints), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.constraints); assert.deepEqual(keys(source.impactContract[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.impactContractEntry); assert.deepEqual(keys(source.impactContract[0].impacts[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.impact); assert.deepEqual(keys(Object.values(source.curveConfiguration)[0]), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.curveConfigurationEntry); assert.deepEqual(keys(Object.values(source.curveConfiguration)[0].amplitude), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.amplitude); assert.deepEqual(keys(source.clampPolicy), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.clampPolicy); assert.deepEqual(keys(source.defaultState), [...source.applicableDrivers].sort(compareText)); assert.deepEqual(keys(source.curveConfiguration), [...source.applicableDrivers].sort(compareText)); assert.deepEqual(source.impactContract.map(entry => entry.key).sort(compareText), [...source.applicableDrivers].sort(compareText)); assert.deepEqual(keys(source.constraints.activeEffects), ["CovenantConstraint", "LiquidityConstraint", "RefinancingConstraint"]); for (const action of source.actions) assert.ok(Object.keys(action.driverDeltas).length > 0); for (const rule of source.marginEscalationRules) assert.deepEqual(keys(rule), LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES.marginEscalationRule); } });
test("rejects unknown, missing, extra or changed locked source data fail-closed", () => { assert.deepEqual(projectLegacyProfileV1("unknown"), { ok: false, code: "unknown-legacy-profile", message: "Unknown legacy profile: unknown" }); const source = structuredClone(projectLegacyDomainProfileSemanticPayloadV1("legacy-real-estate-v1")) as Mutable<ReturnType<typeof projectLegacyDomainProfileSemanticPayloadV1>>; for (const mutate of [(value: typeof source) => { value.identity.modelVersion = "changed"; }, (value: typeof source) => { Reflect.deleteProperty(value.identity, "domainId"); }, (value: typeof source) => { Reflect.set(value, "extra", true); }, (value: typeof source) => { value.curveConfiguration.demandRisk.amplitude.high += .01; }]) { const changed = structuredClone(source); mutate(changed); assert.equal(projectLegacyProfilePayloadV1(changed).ok, false); } });
test("is neutral to object insertion order but preserves legacy propagation array order", () => { const source = structuredClone(projectLegacyDomainProfileSemanticPayloadV1("legacy-real-estate-v1")) as Mutable<ReturnType<typeof projectLegacyDomainProfileSemanticPayloadV1>>; source.identity = { profileId: source.identity.profileId, calibrationVersion: source.identity.calibrationVersion, domainId: source.identity.domainId, modelVersion: source.identity.modelVersion }; assert.equal(projectLegacyProfilePayloadV1(source).ok, true); source.propagationRelationships.reverse(); assert.equal(projectLegacyProfilePayloadV1(source).ok, false); });
test("does not mutate live source and returns detached output", () => { for (const profileId of PROFILES) { const source = structuredClone(projectLegacyDomainProfileSemanticPayloadV1(profileId)), before = structuredClone(source), contract = projectLegacyProfileToDomainModelContractV1(source); assert.deepEqual(source, before); assert.notEqual(contract.semanticPayload.drivers, source.applicableDrivers); } });
test("reproduces exactly three checked-in fixtures through the real adapter", () => { assert.deepEqual(readdirSync(new URL("./fixtures/legacy-profile-projection-v1", import.meta.url)).sort(compareText), PROFILES.map(profileId => `${profileId}.json`).sort(compareText)); assert.equal(Object.keys(FIXTURES).length, 3); for (const profileId of PROFILES) { const value = requireProjection(profileId).envelope; assert.deepEqual(value, FIXTURES[profileId]); const parsed = parseLegacyProfileProjectionEnvelopeV1Structure(FIXTURES[profileId]); assert.equal(parsed.ok, true); } });
test("locks deterministic envelope hashes independently verified by M1C-3b", () => { for (const profileId of PROFILES) assert.equal(hashLegacyProfileProjectionEnvelopeV1(requireProjection(profileId).envelope), ENVELOPE_HASHES[profileId]); });
test("locks exact binary64 materialization boundaries", () => { const scale = requireProjection("legacy-real-estate-v1").envelope.projection.contract.semanticPayload.scales[0]; assert.deepEqual(scale.levels.map(value => value.materialization), [{ minimumInclusive: 0, maximumExclusive: .5000000000000001 }, { minimumInclusive: .5000000000000001, maximumExclusive: 1.5 }, { minimumInclusive: 1.5, maximumExclusive: 2.5 }, { minimumInclusive: 2.5, maximumInclusive: 3 }]); });

function validatedFixture(profileId: typeof PROFILES[number]) {
  const structural = parseLegacyProfileProjectionEnvelopeV1Structure(FIXTURES[profileId]);
  assert.equal(structural.ok, true);
  if (!structural.ok) throw new Error("Fixture is structurally invalid.");
  const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) throw new Error("Fixture is semantically invalid.");
  const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);
  assert.equal(verified.ok, true);
  if (!verified.ok) throw new Error("Fixture hashes are invalid.");
  return { structural, semantic, verified };
}

function semanticContract(raw: unknown) {
  const structural = parseDomainModelContractV1Structure(raw);
  assert.equal(structural.ok, true);
  if (!structural.ok) throw new Error("Contract is structurally invalid.");
  const semantic = validateDomainModelContractV1Semantics(structural.value);
  assert.equal(semantic.ok, true);
  if (!semantic.ok) throw new Error("Contract is semantically invalid.");
  return semantic.value;
}

const withSha256Prefix = (value: unknown): `sha256:${string}` => `sha256:${hashBaselineValueV1(value)}`;

test("exposes one recursively frozen, versioned provenance row per closed profile", () => {
  assert.equal(LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.version, "legacy-profile-projection-v1-provenance-v1");
  assert.deepEqual(keys(LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles), [...PROFILES].sort(compareText));
  visitFrozen(LEGACY_PROFILE_PROJECTION_V1_PROVENANCE);
  for (const profileId of PROFILES) {
    const row = LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles[profileId];
    assert.equal(row.source.profileId, profileId);
    assert.equal(row.projected.profileId, `${profileId}-domain-model-contract-v1`);
    assert.equal(row.fixturePath, `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`);
    assert.equal(row.schemaVersion, "legacy-profile-projection-v1");
    assert.equal(row.adapterVersion, "legacy-domain-profile-adapter-v1");
    assert.equal(row.engineProtocolVersion, "pulse-domain-engine-protocol-v1");
    assert.equal(row.semanticPayloadHashPolicy, "domain-model-contract-v1-semantic-payload-v1");
    assert.equal(row.declarationsVersion, "legacy-compatibility-declarations-v1");
  }
});

test("independently reproduces source hashes from readable fixtures and live M0B projections", () => {
  for (const profileId of PROFILES) {
    const fixture = SOURCE_FIXTURES[profileId];
    const live = projectLegacyDomainProfileSemanticPayloadV1(profileId);
    const row = LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles[profileId];
    assert.equal(canonicalizeBaselineValueV1(fixture), canonicalizeBaselineValueV1(live));
    assert.equal(withSha256Prefix(fixture), row.source.semanticPayloadHash);
    assert.equal(withSha256Prefix(live), row.source.semanticPayloadHash);
  }
});

test("independently reproduces projected, compatibility and envelope hashes", () => {
  for (const profileId of PROFILES) {
    const raw = FIXTURES[profileId];
    const row = LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles[profileId];
    const pipeline = validatedFixture(profileId);
    const nested = semanticContract(raw.projection.contract);
    const projectedIdentity = projectDomainModelContractSemanticIdentityV1(nested);
    const projectedHash = withSha256Prefix(projectedIdentity);
    assert.equal(projectedHash, raw.projection.contract.identity.semanticPayloadHash);
    assert.equal(projectedHash, raw.projection.identity.semanticPayloadHash);
    assert.equal(projectedHash, raw.projection.semanticPayloadHash);
    assert.equal(projectedHash, row.projected.semanticPayloadHash);
    assert.equal(hashDomainModelContractSemanticIdentityV1(nested), projectedHash);

    const { declarationsHash: ignored, ...compatibilityIdentity } = structuredClone(raw.compatibility);
    void ignored;
    assert.deepEqual(keys(compatibilityIdentity), keys(raw.compatibility).filter(key => key !== "declarationsHash"));
    const compatibilityHash = withSha256Prefix(compatibilityIdentity);
    assert.equal(compatibilityHash, raw.compatibility.declarationsHash);
    assert.equal(compatibilityHash, row.compatibilityDeclarationsHash);
    assert.equal(hashLegacyCompatibilityIdentityV1(pipeline.semantic.value), compatibilityHash);
    assert.deepEqual(projectLegacyCompatibilityIdentityV1(pipeline.semantic.value), compatibilityIdentity);

    assert.equal("envelopeHash" in raw, false);
    assert.equal("diagnostics" in raw, false);
    const envelopeHash = withSha256Prefix(pipeline.verified.value);
    assert.equal(envelopeHash, row.envelopeHash);
    assert.equal(hashLegacyProfileProjectionEnvelopeV1(pipeline.verified.value), envelopeHash);
    assert.deepEqual(projectLegacyProfileProjectionEnvelopeHashV1(pipeline.verified.value), pipeline.verified.value);
  }
});

test("makes each hash domain sensitive to its owned fields", () => {
  const profileId = "legacy-real-estate-v1";
  const source = structuredClone(SOURCE_FIXTURES[profileId]);
  const sourceHash = withSha256Prefix(source);
  const sourceMutations = [
    (value: typeof source) => { value.identity.domainId += "-changed"; },
    (value: typeof source) => { value.identity.profileId += "-changed"; },
    (value: typeof source) => { value.identity.modelVersion += "-changed"; },
    (value: typeof source) => { value.identity.calibrationVersion += "-changed"; },
    (value: typeof source) => { value.schemaVersion += "-changed"; },
    (value: typeof source) => { value.defaultState.demandRisk = "SEVERE"; },
  ];
  for (const mutate of sourceMutations) { const changed = structuredClone(source); mutate(changed); assert.notEqual(withSha256Prefix(changed), sourceHash); assert.equal(projectLegacyProfilePayloadV1(changed).ok, false); }

  const raw = structuredClone(FIXTURES[profileId]);
  const contract = raw.projection.contract;
  const projectedMutations: ((value: Mutable<typeof contract>) => void)[] = [
    value => { value.identity.domainId += "-changed"; }, value => { value.identity.profileId += "-changed"; },
    value => { value.identity.modelVersion += "-changed"; }, value => { value.identity.calibrationVersion += "-changed"; },
    value => { value.semanticPayload.scales[0].levels[0].materialization.minimumInclusive = .1; },
    value => { value.semanticPayload.drivers[0].initial.score = 2; }, value => { value.semanticPayload.actions[0].effects[0].delta += 1; },
    value => { value.semanticPayload.propagation.edges[0].propagatedLevelId = "severe"; },
    value => { value.semanticPayload.curves[0].amplitudeByLevel.high += .1; },
    value => { value.semanticPayload.constraints[0].activation.threshold += .01; },
    value => { value.semanticPayload.measures[0].terms[0].weight += .01; }, value => { value.semanticPayload.measures[0].range.minimum -= 1; },
    value => { value.semanticPayload.measures[0].escalationRules[0].whenBelow -= .1; },
  ];
  const baseProjection = withSha256Prefix(projectDomainModelContractSemanticIdentityV1(semanticContract(contract)));
  for (const mutate of projectedMutations) {
    const changed = structuredClone(contract); mutate(changed);
    const structural = parseDomainModelContractV1Structure(changed);
    if (!structural.ok) continue;
    const semantic = validateDomainModelContractV1Semantics(structural.value);
    if (!semantic.ok) continue;
    assert.notEqual(withSha256Prefix(projectDomainModelContractSemanticIdentityV1(semantic.value)), baseProjection);
  }

  const { declarationsHash: omitted, ...compatibility } = raw.compatibility;
  void omitted;
  const compatibilityBase = withSha256Prefix(compatibility);
  const compatibilityMutations: ((value: Mutable<typeof compatibility>) => void)[] = [
    value => { value.ignoredUnknownDriverDeltas[0].delta -= 1; },
    value => { value.driverIdMappings[0].projectedDriverId += "-changed"; },
    value => { value.excludedUnsupportedActionIds.reverse(); },
    value => { if (value.sustainThresholdOverride) value.sustainThresholdOverride.sourceField = "changed"; },
    value => { value.propagation.sourceEvaluationOrder.reverse(); },
    value => { value.propagation.compatibilityOnlyEdges[0].occurrencePosition += 1; },
    value => { value.excludedSourceValues[0].sourcePath += ".changed"; },
    value => { value.legacyRegistryProjection.entries[0].sourceEvidence.initialRegistryStateHash = `sha256:${"0".repeat(64)}`; },
    value => { value.curveFallbackDeclaration.neutralMultiplier = 2; },
  ];
  for (const mutate of compatibilityMutations) { const changed = structuredClone(compatibility); mutate(changed); assert.notEqual(withSha256Prefix(changed), compatibilityBase); }
  const municipalCompatibility = structuredClone(municipalFixture.compatibility);
  const { declarationsHash: municipalIgnored, ...municipalIdentity } = municipalCompatibility; void municipalIgnored;
  municipalIdentity.compatibilityOnlyActions[0].ignoredEffects[0].delta += 1;
  assert.notEqual(withSha256Prefix(municipalIdentity), municipalFixture.compatibility.declarationsHash);

  const envelope = validatedFixture(profileId).verified.value;
  const envelopeHash = withSha256Prefix(envelope);
  for (const mutate of [(value: Mutable<typeof raw>) => { value.source.identity.modelVersion += "-changed"; }, (value: Mutable<typeof raw>) => { value.projection.identity.modelVersion += "-changed"; }, (value: Mutable<typeof raw>) => { value.compatibility.declarationsVersion += "-changed"; }]) {
    const changed = structuredClone(raw); mutate(changed); assert.notEqual(withSha256Prefix(changed), envelopeHash);
  }
});

test("characterizes exact clamp materialization boundaries without runtime imports", () => {
  const levels = realEstateFixture.projection.contract.semanticPayload.scales[0].levels;
  const materialize = (input: number): string | undefined => {
    const value = Math.min(3, Math.max(0, input));
    for (const level of levels) {
      const band: { minimumInclusive: number; maximumExclusive?: number; maximumInclusive?: number } = level.materialization;
      const belowMaximum = band.maximumExclusive !== undefined ? value < band.maximumExclusive : band.maximumInclusive !== undefined && value <= band.maximumInclusive;
      if (value >= band.minimumInclusive && belowMaximum) return level.levelId;
    }
    return undefined;
  };
  const cases: readonly [number, string][] = [[-1, "low"], [0, "low"], [.5, "low"], [.5000000000000001, "moderate"], [1.4999999999999998, "moderate"], [1.5, "high"], [1.5000000000000002, "high"], [2.4999999999999996, "high"], [2.5, "severe"], [2.5000000000000004, "severe"], [3, "severe"], [4, "severe"]];
  for (const [value, expected] of cases) assert.equal(materialize(value), expected);
});

test("locks the source-local sustain threshold declaration without claiming runtime equivalence", () => {
  const expected = {
    kind: "legacy-risk-state-number-overrides-constraint-threshold-v1",
    sourceField: "sustainThreshold",
    constraintId: "refinancing-constraint",
    acceptedRuntimeType: "number-including-non-finite",
    comparison: "margin-strictly-below-threshold",
    applicability: "this-envelope-source-only",
  };
  assert.deepEqual(realEstateFixture.compatibility.sustainThresholdOverride, expected);
  assert.deepEqual(consultingFixture.compatibility.sustainThresholdOverride, expected);
  assert.equal(municipalFixture.compatibility.sustainThresholdOverride, null);
  assert.equal(realEstateFixture.projection.contract.semanticPayload.constraints[0].activation.threshold, .8);
  assert.equal(consultingFixture.projection.contract.semanticPayload.constraints[0].activation.threshold, .8);
  const assertFiniteNumbers = (value: unknown): void => {
    if (typeof value === "number") { assert.equal(Number.isFinite(value), true); return; }
    if (value && typeof value === "object") for (const child of Object.values(value)) assertFiniteNumbers(child);
  };
  for (const fixture of Object.values(FIXTURES)) {
    assert.equal(Object.hasOwn(fixture.projection.contract.semanticPayload, "sustainThreshold"), false);
    assertFiniteNumbers(fixture);
  }
});

test("characterizes JavaScript comparison semantics declared by M1C while runtime equivalence remains M1D scope", () => {
  // This is a language-level characterization of the declaration, not execution of or proof about existing runtime code.
  const isBelow = (margin: number, override: unknown, fallback = .8): boolean => margin < (typeof override === "number" ? override : fallback);
  assert.equal(isBelow(.7, .75), true); assert.equal(isBelow(.7, "invalid"), true);
  assert.equal(isBelow(.7, Number.NaN), false); assert.equal(isBelow(0, Number.POSITIVE_INFINITY), true); assert.equal(isBelow(0, Number.NEGATIVE_INFINITY), false);
});

test("keeps projected hashes order-neutral while raw envelope hashes remain representation-sensitive", () => {
  for (const profileId of PROFILES) {
    const fixture = FIXTURES[profileId];
    const basePipeline = validatedFixture(profileId);
    const base = semanticContract(fixture.projection.contract);
    const expectedProjection = projectDomainModelContractSemanticIdentityV1(base);
    const changedEnvelope = structuredClone(fixture) as Mutable<typeof realEstateFixture>;
    const payload = changedEnvelope.projection.contract.semanticPayload;
    payload.drivers.reverse(); payload.actions.reverse(); payload.actions.forEach(action => action.effects.reverse());
    payload.propagation.edges.reverse(); payload.dimensions.reverse(); payload.curves.reverse(); payload.constraints.reverse();
    payload.constraints.forEach(constraint => { constraint.activeEffects.reverse(); constraint.allowedTransitions.reverse(); });
    payload.measures.reverse(); payload.measures.forEach(measure => { measure.terms.reverse(); measure.escalationRules.reverse(); measure.escalationRules.forEach(rule => rule.transitions.reverse()); });
    const structural = parseLegacyProfileProjectionEnvelopeV1Structure(changedEnvelope); assert.equal(structural.ok, true);
    if (!structural.ok) throw new Error("Set-like permutation was structurally rejected.");
    const semantic = validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value); assert.equal(semantic.ok, true);
    if (!semantic.ok) throw new Error("Set-like permutation was semantically rejected.");
    const verified = verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value); assert.equal(verified.ok, true);
    if (!verified.ok) throw new Error("Set-like permutation failed its unchanged projected hash binding.");
    const reorderedProjection = projectDomainModelContractSemanticIdentityV1(verified.value.projection.contract);
    assert.deepEqual(reorderedProjection, expectedProjection);
    assert.equal(hashDomainModelContractSemanticIdentityV1(verified.value.projection.contract), hashDomainModelContractSemanticIdentityV1(base));
    assert.notEqual(hashLegacyProfileProjectionEnvelopeV1(verified.value), hashLegacyProfileProjectionEnvelopeV1(basePipeline.verified.value));
  }
  const levelsChanged = structuredClone(realEstateFixture.projection.contract); levelsChanged.semanticPayload.scales[0].levels.reverse();
  const levelsStructural = parseDomainModelContractV1Structure(levelsChanged); assert.equal(levelsStructural.ok, true);
  if (levelsStructural.ok) assert.equal(validateDomainModelContractV1Semantics(levelsStructural.value).ok, false);
  const legacyChanged = structuredClone(realEstateFixture); legacyChanged.compatibility.propagation.sourceEvaluationOrder.reverse();
  const legacyStructural = parseLegacyProfileProjectionEnvelopeV1Structure(legacyChanged); assert.equal(legacyStructural.ok, true);
  if (legacyStructural.ok) assert.equal(validateLegacyProfileProjectionEnvelopeV1Semantics(legacyStructural.value).ok, false);
});

test("proves cross-profile uniqueness, idempotence and collision behavior", () => {
  const rows = PROFILES.map(profileId => LEGACY_PROFILE_PROJECTION_V1_PROVENANCE.profiles[profileId]);
  for (const select of [(row: typeof rows[number]) => [row.source.domainId, row.source.profileId, row.source.modelVersion, row.source.calibrationVersion], (row: typeof rows[number]) => [row.projected.domainId, row.projected.profileId, row.projected.modelVersion, row.projected.calibrationVersion], (row: typeof rows[number]) => row.source.semanticPayloadHash, (row: typeof rows[number]) => row.projected.semanticPayloadHash, (row: typeof rows[number]) => row.compatibilityDeclarationsHash, (row: typeof rows[number]) => row.envelopeHash]) assert.equal(new Set(rows.map(row => canonicalizeBaselineValueV1(select(row)))).size, 3);
  const verified = PROFILES.map(profileId => parseDomainModelContractV1(FIXTURES[profileId].projection.contract));
  assert.equal(verified.every(result => result.ok), true);
  const contracts = verified.map(result => { if (!result.ok) throw new Error("Verified fixture expected."); return result.value; });
  assert.equal(validateDomainModelContractIdentityCollisionsV1([...contracts, contracts[0]]).ok, true);
  const collisionRaw = structuredClone(realEstateFixture.projection.contract); collisionRaw.semanticPayload.curves[0].amplitudeByLevel.high += .01;
  const collisionSemantic = semanticContract(collisionRaw); collisionRaw.identity.semanticPayloadHash = hashDomainModelContractSemanticIdentityV1(collisionSemantic);
  const collision = parseDomainModelContractV1(collisionRaw); assert.equal(collision.ok, true);
  if (collision.ok) assert.equal(validateDomainModelContractIdentityCollisionsV1([contracts[0], collision.value]).ok, false);
  for (const version of ['quote"', "back\\slash", "line\nbreak", "nul\u0000like"]) {
    const raw = structuredClone(realEstateFixture.projection.contract); raw.identity.modelVersion = version;
    const semantic = semanticContract(raw); raw.identity.semanticPayloadHash = hashDomainModelContractSemanticIdentityV1(semantic);
    const result = parseDomainModelContractV1(raw); assert.equal(result.ok, true);
    if (result.ok) assert.equal(validateDomainModelContractIdentityCollisionsV1([contracts[0], result.value]).ok, true);
  }
});

test("locks native identifier hygiene and checked-in fixture bytes", () => {
  const fixtureHashes = { "legacy-real-estate-v1": "7138540eb93e4dbbf0e26974290b1221edb71000f41870fae37e9623dce5abec", "legacy-municipal-v1": "e66576a70196a359b7ce5a0e9501de880e263d951147d7c0e67b5502986285f6", "legacy-consulting-v1": "5cd144034e3c512e2a3ab459b5c95a9fc7b0d22c46bab660f8d26ca998a17c0b" } as const;
  const sourceOnly = ["demandRisk", "pricingPowerRisk", "tenantStabilityRisk", "maintenanceIntensityRisk", "operationalEfficiencyRisk", "energyExposureRisk", "interestRateExposureRisk", "leverageLevelRisk", "refinancingRisk", "marketVolatilityRisk", "regulatoryPressureRisk", "capitalCommitmentRigidityRisk"];
  // M1B does not export ID_PATTERN, so this is its exact parser rule rather than a competing variant.
  const idPattern = /^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$/;
  const assertNamespace = (ids: readonly string[]): void => { assert.equal(ids.every(id => idPattern.test(id)), true); assert.equal(new Set(ids).size, ids.length); };
  assert.equal(idPattern.test("1invalid"), false);
  const invalid = structuredClone(realEstateFixture.projection.contract); invalid.identity.domainId = "1invalid";
  const invalidResult = parseDomainModelContractV1Structure(invalid); assert.equal(invalidResult.ok, false);
  if (!invalidResult.ok) assert.equal(invalidResult.issues.some(issue => issue.code === "invalid-id" && issue.path === "/identity/domainId"), true);
  for (const profileId of PROFILES) {
    const raw = FIXTURES[profileId]; validatedFixture(profileId);
    const native = canonicalizeBaselineValueV1(raw.projection.contract.semanticPayload);
    for (const id of sourceOnly) assert.equal(native.includes(`\"${id}\"`), false);
    assert.equal(native.includes("liquidityPressure"), false); assert.equal(native.includes("liquidity-pressure"), false);
    const payload = raw.projection.contract.semanticPayload;
    assertNamespace(payload.drivers.map(driver => driver.driverId));
    assertNamespace(payload.actions.map(action => action.actionId));
    assertNamespace(payload.curves.map(curve => curve.curveId));
    assertNamespace(payload.propagation.edges.map(edge => edge.edgeId));
    assertNamespace(raw.compatibility.propagation.compatibilityOnlyEdges.map(edge => edge.compatibilityEdgeId));
    const adapterLocalLiquidityIds = raw.compatibility.propagation.compatibilityOnlyEdges.flatMap(edge => [edge.adapterLocalSourceDriverId, edge.adapterLocalTargetDriverId]).filter(id => id === "liquidity-pressure");
    assert.equal(adapterLocalLiquidityIds.every(id => idPattern.test(id)), true);
    if (profileId !== "legacy-municipal-v1") assert.ok(adapterLocalLiquidityIds.length > 0);
    const path = new URL(`./fixtures/legacy-profile-projection-v1/${profileId}.json`, import.meta.url);
    const before = readFileSync(path); assert.equal(createHash("sha256").update(before).digest("hex"), fixtureHashes[profileId]);
    const after = readFileSync(path); assert.deepEqual(after, before);
  }
});
