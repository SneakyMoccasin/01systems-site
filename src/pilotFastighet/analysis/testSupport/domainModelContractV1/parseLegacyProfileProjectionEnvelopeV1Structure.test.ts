/* eslint-disable @typescript-eslint/no-explicit-any -- hostile boundary tests deliberately construct invalid values */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SemanticHashVerifiedDomainModelContractV1, SemanticallyValidatedDomainModelContractV1, StructurallyValidatedDomainModelContractV1 } from "./contractV1";
import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1, SemanticallyValidatedLegacyProfileProjectionEnvelopeV1, StructurallyValidatedLegacyProfileProjectionEnvelopeV1 } from "./legacyProfileProjectionEnvelopeV1";
import { LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES, parseLegacyProfileProjectionEnvelopeV1Structure, parseLegacyProfileProjectionEnvelopeV1StructureJson } from "./parseLegacyProfileProjectionEnvelopeV1Structure";

const contractText = readFileSync(new URL("./fixtures/synthetic-domain-model-contract-v1.json", import.meta.url), "utf8");
const sha = `sha256:${"a".repeat(64)}`;
const listedCodes = new Set<string>(LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES);

function fresh(): any {
  const contract = JSON.parse(contractText);
  return {
    schemaVersion: "legacy-profile-projection-v1", adapterVersion: "legacy-domain-profile-adapter-v1", engineProtocolVersion: "pulse-domain-engine-protocol-v1",
    source: { identity: { domainId: "realEstate", profileId: "legacy-real-estate-v1", modelVersion: "pilot-fastighet-v0.4", calibrationVersion: "legacy-global-v1" }, semanticPayloadVersion: "legacy-domain-profile-semantic-payload-v1", semanticPayloadHash: sha },
    projection: { identity: structuredClone(contract.identity), semanticPayloadHashPolicy: "domain-model-contract-v1-semantic-payload-v1", semanticPayloadHash: sha, contract },
    compatibility: {
      declarationsVersion: "legacy-compatibility-declarations-v1", declarationsHash: sha,
      ignoredUnknownDriverDeltas: [{ sourceProfileId: "legacy-real-estate-v1", sourceActionId: "increase_liquidity_buffer", sourceDriverId: "liquidityPressure", delta: -1 }],
      compatibilityOnlyActions: [{ kind: "legacy-compatibility-only-action-v1", sourceProfileId: "legacy-consulting-v1", sourceActionId: "congestion_pricing", projectedNativeAction: "omitted-because-no-modeled-effects", admission: "legacy-adapter-only", ignoredEffects: [{ driverId: "modal_shift_pressure", delta: 2 }] }],
      driverIdMappings: [{ sourceDriverId: "demandRisk", projectedDriverId: "demand-risk" }, { sourceDriverId: "accessibility", projectedDriverId: "accessibility" }],
      excludedUnsupportedActionIds: ["congestion_pricing"],
      sustainThresholdOverride: { kind: "legacy-risk-state-number-overrides-constraint-threshold-v1", sourceField: "sustainThreshold", constraintId: "refinancing-constraint", acceptedRuntimeType: "number-including-non-finite", comparison: "margin-strictly-below-threshold", applicability: "this-envelope-source-only" },
      propagation: {
        edgeEvaluationOrder: "legacy-source-and-target-insertion-order-v1",
        executionSemantics: { algorithm: "ordered-monotone-raise-fixed-point-v1", sourceReadPolicy: "missing-source-does-not-trigger-v1", targetReadPolicy: "missing-target-uses-declared-default-v1", targetComparison: "propagated-rank-strictly-greater-v1", writeVisibility: "later-occurrences-same-iteration-v1", iterationPolicy: "repeat-from-start-until-no-raise-v1", eventPolicy: { emission: "on-target-level-change-v1", step: "iteration-plus-one-v1", delaySteps: 1, duplicateSuppression: "no-change-no-event-v1" } },
        implicitNode: { sourceNodeId: "liquidityPressure", adapterLocalNodeId: "liquidity-pressure", initialLevel: "absent", initialScore: "absent", targetMissingDefaultLevelId: "low", materialization: "on-propagation-raise-v1", scoreMaterialization: "projected-level-anchor-after-propagation-v1", impacts: "none" },
        sourceEvaluationOrder: [{ sourcePosition: 0, edgePosition: 0, sourceLegacyDriverId: "demandRisk", targetLegacyDriverId: "tenantStabilityRisk", projectedOrCompatibilityEdgeId: "legacy-edge-v1.demand-risk.to.tenant-stability-risk" }],
        compatibilityOnlyEdges: [{ sourcePosition: 1, edgePosition: 0, occurrencePosition: 2, sourceLegacySourceDriverId: "leverageLevelRisk", sourceLegacyTargetDriverId: "liquidityPressure", adapterLocalSourceDriverId: "leverage-level-risk", adapterLocalTargetDriverId: "liquidity-pressure", compatibilityEdgeId: "legacy-compat-edge-v1.leverage-level-risk.to.liquidity-pressure", sourcePropagatedLevelId: "HIGH", projectedPropagatedLevelId: "high", triggerPredicate: "source-level-in-set-v1", triggerLevelIds: ["high", "severe"] }],
      },
      excludedSourceValues: [{ kind: "provably-unreachable-public-execution-v1", sourcePath: "constraints.Custom", sourceValueHash: sha, reasonCode: "inert-global-registry-member" }],
      legacyRegistryProjection: {
        version: "legacy-registry-projection-compatibility-v1",
        registryOrder: "legacy-constraint-registry-constructor-order-v1",
        materialization: { scenarios: ["scenarioA", "scenarioB", "baseline"], surfaces: ["trajectory.registry", "constraintHistory", "terminalState.registry"], cadence: "initial-and-every-completed-step-v1" },
        entries: [{ kind: "legacy-inert-registry-entry-v1", sourceProfileId: "legacy-real-estate-v1", sourceRegistryKey: "Custom", compatibilityEntryId: "legacy-registry-entry-v1.custom", legacyType: "Custom", initialState: { lifecycle: "INACTIVE", activatedAtStep: "absent", lastUpdatedStep: 0 }, transitionPolicy: "no-public-transition-v1", executionPolicy: "immutable-inert-output-placeholder-v1", sourceEvidence: { constructorPath: "src/pilotFastighet/constraintState.ts#createInitialConstraintRegistry", excludedSourcePath: "constraints.Custom", initialRegistryStateHash: sha } }],
      },
      curveFallbackDeclaration: { policyId: "legacy-neutral-multiplier-v1", appliesTo: ["missing-curve-configuration", "unsupported-curve-discriminant"], neutralMultiplier: 1, evidenceStatus: "deferred-to-m1e" },
    },
  };
}

function expectIssue(value: unknown, code: string, path?: string): void {
  const result = parseLegacyProfileProjectionEnvelopeV1Structure(value);
  assert.equal(result.ok, false);
  if (result.ok) return;
  for (const entry of result.issues) assert.ok(listedCodes.has(entry.code), `Unlisted issue code: ${entry.code}`);
  assert.ok(result.issues.some((entry) => entry.code === code && (path === undefined || entry.path === path)), JSON.stringify(result.issues));
}

test("accepts equivalent JSON and memory boundaries with separated source/native IDs", () => {
  const input = fresh(); input.projection.identity.domainId = "real-estate"; input.projection.contract.identity.domainId = "real-estate";
  const memory = parseLegacyProfileProjectionEnvelopeV1Structure(input);
  const json = parseLegacyProfileProjectionEnvelopeV1StructureJson(JSON.stringify(input));
  assert.equal(memory.ok, true); assert.deepEqual(memory, json);
  if (memory.ok) { assert.equal(memory.value.source.identity.domainId, "realEstate"); assert.equal(memory.value.projection.identity.domainId, "real-estate"); assert.equal(memory.value.compatibility.driverIdMappings[0].sourceDriverId, "demandRisk"); }
});

test("preserves actual detached structural nested result and fabricates no later brand", () => {
  const input = fresh(); const result = parseLegacyProfileProjectionEnvelopeV1Structure(input); assert.equal(result.ok, true); if (!result.ok) return;
  const envelope: StructurallyValidatedLegacyProfileProjectionEnvelopeV1 = result.value;
  const nested: StructurallyValidatedDomainModelContractV1 = envelope.projection.contract;
  assert.notEqual(nested, input.projection.contract); assert.deepEqual(nested, input.projection.contract); assert.equal(Object.isFrozen(nested), true); assert.equal(Object.getOwnPropertySymbols(nested).length, 0);
  type A = typeof nested extends SemanticallyValidatedDomainModelContractV1 ? true : false;
  type B = typeof nested extends SemanticHashVerifiedDomainModelContractV1 ? true : false;
  type C = typeof envelope extends SemanticallyValidatedLegacyProfileProjectionEnvelopeV1 ? true : false;
  type D = typeof envelope extends HashVerifiedLegacyProfileProjectionEnvelopeV1 ? true : false;
  const proof: [false, false, false, false] = [false as A, false as B, false as C, false as D]; assert.deepEqual(proof, [false, false, false, false]);
});

test("returns detached recursively frozen deterministic data without input mutation", () => {
  const input = fresh(), before = structuredClone(input); const first = parseLegacyProfileProjectionEnvelopeV1Structure(input), second = parseLegacyProfileProjectionEnvelopeV1Structure(input);
  assert.deepEqual(first, second); assert.deepEqual(input, before); assert.equal(first.ok, true); if (!first.ok) return; assert.notEqual(first.value, input);
  const visit = (value: unknown): void => { if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); Object.values(value).forEach(visit); } }; visit(first.value);
  input.source.identity.domainId = "changed"; assert.equal(first.value.source.identity.domainId, "realEstate");
});

const levels: readonly [string, (input: any) => any, string][] = [
  ["root", (x) => x, "schemaVersion"], ["source", (x) => x.source, "identity"], ["source.identity", (x) => x.source.identity, "domainId"],
  ["projection", (x) => x.projection, "contract"], ["projection.identity", (x) => x.projection.identity, "domainId"], ["compatibility", (x) => x.compatibility, "propagation"],
  ["ignored delta", (x) => x.compatibility.ignoredUnknownDriverDeltas[0], "sourceDriverId"], ["compatibility action", (x) => x.compatibility.compatibilityOnlyActions[0], "kind"],
  ["ignored effect", (x) => x.compatibility.compatibilityOnlyActions[0].ignoredEffects[0], "driverId"], ["mapping", (x) => x.compatibility.driverIdMappings[0], "sourceDriverId"],
  ["sustain", (x) => x.compatibility.sustainThresholdOverride, "kind"], ["propagation", (x) => x.compatibility.propagation, "edgeEvaluationOrder"],
  ["execution semantics", (x) => x.compatibility.propagation.executionSemantics, "algorithm"], ["event policy", (x) => x.compatibility.propagation.executionSemantics.eventPolicy, "emission"], ["implicit node", (x) => x.compatibility.propagation.implicitNode, "sourceNodeId"],
  ["order entry", (x) => x.compatibility.propagation.sourceEvaluationOrder[0], "sourcePosition"], ["compatibility edge", (x) => x.compatibility.propagation.compatibilityOnlyEdges[0], "compatibilityEdgeId"],
  ["excluded source", (x) => x.compatibility.excludedSourceValues[0], "kind"], ["fallback", (x) => x.compatibility.curveFallbackDeclaration, "policyId"],
  ["registry projection", (x) => x.compatibility.legacyRegistryProjection, "version"], ["registry materialization", (x) => x.compatibility.legacyRegistryProjection.materialization, "cadence"],
  ["registry entry", (x) => x.compatibility.legacyRegistryProjection.entries[0], "kind"], ["registry initial state", (x) => x.compatibility.legacyRegistryProjection.entries[0].initialState, "lifecycle"], ["registry source evidence", (x) => x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence, "constructorPath"],
];

test("rejects unknown fields and diagnostics at every envelope object level", () => {
  for (const [, locate] of levels) { const input = fresh(); locate(input).unexpected = true; expectIssue(input, "unknown-field"); }
  const input = fresh(); input.diagnostics = []; expectIssue(input, "unknown-field", "/diagnostics");
});

test("rejects missing required fields at every envelope object level", () => {
  for (const [, locate, key] of levels) { const input = fresh(); delete locate(input)[key]; expectIssue(input, "missing-required-field"); }
});

test("requires the closed execution, implicit-node and trigger declarations",()=>{
  for(const [locate,key,path] of [
    [(x:any)=>x.compatibility.propagation,"executionSemantics","/compatibility/propagation/executionSemantics"],
    [(x:any)=>x.compatibility.propagation,"implicitNode","/compatibility/propagation/implicitNode"],
    [(x:any)=>x.compatibility.propagation.compatibilityOnlyEdges[0],"triggerPredicate","/compatibility/propagation/compatibilityOnlyEdges/0/triggerPredicate"],
    [(x:any)=>x.compatibility.propagation.compatibilityOnlyEdges[0],"triggerLevelIds","/compatibility/propagation/compatibilityOnlyEdges/0/triggerLevelIds"],
  ] as const){const input=fresh();delete locate(input)[key];expectIssue(input,"missing-required-field",path);}
  for(const [triggerLevelIds,code] of [[["high"],"invalid-literal"],[["high","severe","low"],"collection-limit-exceeded"],[["high","high"],"invalid-literal"],[["severe","high"],"invalid-literal"]] as const){const input=fresh();input.compatibility.propagation.compatibilityOnlyEdges[0].triggerLevelIds=triggerLevelIds;expectIssue(input,code);}
  const sparse=fresh();sparse.compatibility.propagation.compatibilityOnlyEdges[0].triggerLevelIds=Array(2);expectIssue(sparse,"sparse-array","/compatibility/propagation/compatibilityOnlyEdges/0/triggerLevelIds/0");
});

test("separates ordinary string, version, StableId, and hash validation", () => {
  const ordinaryLong = fresh(); ordinaryLong.source.identity.domainId = "x".repeat(LIMITS.maxMetadataStringLength + 1); expectIssue(ordinaryLong, "metadata-string-limit-exceeded", "/source/identity/domainId");
  const ordinaryExact = fresh(); ordinaryExact.source.identity.domainId = "x".repeat(LIMITS.maxMetadataStringLength); assert.equal(parseLegacyProfileProjectionEnvelopeV1Structure(ordinaryExact).ok, true);
  const versionLong = fresh(); versionLong.source.identity.modelVersion = "x".repeat(LIMITS.maxVersionStringLength + 1); const vr = parseLegacyProfileProjectionEnvelopeV1Structure(versionLong); assert.equal(vr.ok, false); if (!vr.ok) assert.deepEqual(vr.issues.map((x) => x.code), ["version-string-limit-exceeded"]);
  const versionExact = fresh(); versionExact.source.identity.modelVersion = "x".repeat(LIMITS.maxVersionStringLength); assert.equal(parseLegacyProfileProjectionEnvelopeV1Structure(versionExact).ok, true);
  const invalidId = fresh(); invalidId.compatibility.driverIdMappings[0].projectedDriverId = "liquidityPressure"; expectIssue(invalidId, "invalid-id", "/compatibility/driverIdMappings/0/projectedDriverId");
  for (const bad of [`sha256:${"a".repeat(65)}`, `sha256:${"A".repeat(64)}`]) { const input = fresh(); input.compatibility.declarationsHash = bad; const result = parseLegacyProfileProjectionEnvelopeV1Structure(input); assert.equal(result.ok, false); if (!result.ok) assert.deepEqual(result.issues.map((x) => x.code), ["invalid-hash"]); }
});

test("validates every envelope hash field", () => {
  const fields: readonly [((x: any) => any), string, string][] = [
    [(x) => x.source, "semanticPayloadHash", "/source/semanticPayloadHash"], [(x) => x.projection.identity, "semanticPayloadHash", "/projection/identity/semanticPayloadHash"],
    [(x) => x.projection, "semanticPayloadHash", "/projection/semanticPayloadHash"], [(x) => x.compatibility, "declarationsHash", "/compatibility/declarationsHash"],
    [(x) => x.compatibility.excludedSourceValues[0], "sourceValueHash", "/compatibility/excludedSourceValues/0/sourceValueHash"],
    [(x) => x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence, "initialRegistryStateHash", "/compatibility/legacyRegistryProjection/entries/0/sourceEvidence/initialRegistryStateHash"],
  ];
  for (const [locate, key, path] of fields) { const input = fresh(); locate(input)[key] = "bad"; expectIssue(input, "invalid-hash", path); }
});

test("locks all envelope literal and discriminant families", () => {
  const cases: readonly [((x: any) => void), string, string][] = [
    [(x) => { x.schemaVersion = "v2"; }, "invalid-literal", "/schemaVersion"], [(x) => { x.adapterVersion = "v2"; }, "invalid-literal", "/adapterVersion"],
    [(x) => { x.engineProtocolVersion = "v2"; }, "invalid-literal", "/engineProtocolVersion"], [(x) => { x.source.semanticPayloadVersion = "v2"; }, "invalid-literal", "/source/semanticPayloadVersion"],
    [(x) => { x.projection.semanticPayloadHashPolicy = "v2"; }, "invalid-literal", "/projection/semanticPayloadHashPolicy"], [(x) => { x.compatibility.declarationsVersion = "v2"; }, "invalid-literal", "/compatibility/declarationsVersion"],
    [(x) => { x.compatibility.compatibilityOnlyActions[0].kind = "other"; }, "invalid-literal", "/compatibility/compatibilityOnlyActions/0/kind"], [(x) => { x.compatibility.compatibilityOnlyActions[0].projectedNativeAction = "other"; }, "invalid-literal", "/compatibility/compatibilityOnlyActions/0/projectedNativeAction"],
    [(x) => { x.compatibility.compatibilityOnlyActions[0].admission = "native"; }, "invalid-literal", "/compatibility/compatibilityOnlyActions/0/admission"], [(x) => { x.compatibility.sustainThresholdOverride.kind = "other"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/kind"],
    [(x) => { x.compatibility.sustainThresholdOverride.sourceField = "other"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/sourceField"], [(x) => { x.compatibility.sustainThresholdOverride.constraintId = "other"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/constraintId"],
    [(x) => { x.compatibility.sustainThresholdOverride.acceptedRuntimeType = "finite"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/acceptedRuntimeType"], [(x) => { x.compatibility.sustainThresholdOverride.comparison = "other"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/comparison"],
    [(x) => { x.compatibility.sustainThresholdOverride.applicability = "global"; }, "invalid-literal", "/compatibility/sustainThresholdOverride/applicability"],
    [(x) => { x.compatibility.propagation.edgeEvaluationOrder = "sorted"; }, "invalid-literal", "/compatibility/propagation/edgeEvaluationOrder"], [(x) => { x.compatibility.propagation.compatibilityOnlyEdges[0].triggerPredicate = "other"; }, "invalid-literal", "/compatibility/propagation/compatibilityOnlyEdges/0/triggerPredicate"],
    [(x) => { x.compatibility.propagation.compatibilityOnlyEdges[0].triggerLevelIds.reverse(); }, "invalid-literal", "/compatibility/propagation/compatibilityOnlyEdges/0/triggerLevelIds/0"], [(x) => { x.compatibility.propagation.executionSemantics.algorithm = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/algorithm"],
    [(x) => { x.compatibility.propagation.executionSemantics.sourceReadPolicy = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/sourceReadPolicy"], [(x) => { x.compatibility.propagation.executionSemantics.targetReadPolicy = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/targetReadPolicy"],
    [(x) => { x.compatibility.propagation.executionSemantics.targetComparison = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/targetComparison"], [(x) => { x.compatibility.propagation.executionSemantics.writeVisibility = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/writeVisibility"],
    [(x) => { x.compatibility.propagation.executionSemantics.iterationPolicy = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/iterationPolicy"], [(x) => { x.compatibility.propagation.executionSemantics.eventPolicy.emission = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/eventPolicy/emission"],
    [(x) => { x.compatibility.propagation.executionSemantics.eventPolicy.step = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/eventPolicy/step"], [(x) => { x.compatibility.propagation.executionSemantics.eventPolicy.delaySteps = 2; }, "invalid-literal", "/compatibility/propagation/executionSemantics/eventPolicy/delaySteps"],
    [(x) => { x.compatibility.propagation.executionSemantics.eventPolicy.duplicateSuppression = "other"; }, "invalid-literal", "/compatibility/propagation/executionSemantics/eventPolicy/duplicateSuppression"], [(x) => { x.compatibility.propagation.implicitNode.sourceNodeId = "other"; }, "invalid-literal", "/compatibility/propagation/implicitNode/sourceNodeId"],
    [(x) => { x.compatibility.propagation.implicitNode.adapterLocalNodeId = "other"; }, "invalid-literal", "/compatibility/propagation/implicitNode/adapterLocalNodeId"], [(x) => { x.compatibility.propagation.implicitNode.initialLevel = "present"; }, "invalid-literal", "/compatibility/propagation/implicitNode/initialLevel"],
    [(x) => { x.compatibility.propagation.implicitNode.initialScore = "present"; }, "invalid-literal", "/compatibility/propagation/implicitNode/initialScore"], [(x) => { x.compatibility.propagation.implicitNode.targetMissingDefaultLevelId = "other"; }, "invalid-literal", "/compatibility/propagation/implicitNode/targetMissingDefaultLevelId"],
    [(x) => { x.compatibility.propagation.implicitNode.materialization = "other"; }, "invalid-literal", "/compatibility/propagation/implicitNode/materialization"], [(x) => { x.compatibility.propagation.implicitNode.scoreMaterialization = "other"; }, "invalid-literal", "/compatibility/propagation/implicitNode/scoreMaterialization"],
    [(x) => { x.compatibility.propagation.implicitNode.impacts = "some"; }, "invalid-literal", "/compatibility/propagation/implicitNode/impacts"], [(x) => { x.compatibility.excludedSourceValues[0].kind = "other"; }, "invalid-literal", "/compatibility/excludedSourceValues/0/kind"],
    [(x) => { x.compatibility.excludedSourceValues[0].reasonCode = "other"; }, "invalid-discriminant", "/compatibility/excludedSourceValues/0/reasonCode"], [(x) => { x.compatibility.curveFallbackDeclaration.policyId = "other"; }, "invalid-literal", "/compatibility/curveFallbackDeclaration/policyId"],
    [(x) => { x.compatibility.curveFallbackDeclaration.appliesTo[0] = "other"; }, "invalid-literal", "/compatibility/curveFallbackDeclaration/appliesTo/0"], [(x) => { x.compatibility.curveFallbackDeclaration.neutralMultiplier = 2; }, "invalid-literal", "/compatibility/curveFallbackDeclaration/neutralMultiplier"],
    [(x) => { x.compatibility.curveFallbackDeclaration.evidenceStatus = "verified"; }, "invalid-literal", "/compatibility/curveFallbackDeclaration/evidenceStatus"],
  ];
  for (const [mutate, code, path] of cases) { const input = fresh(); mutate(input); expectIssue(input, code, path); }
});

test("validates the complete closed legacy registry projection structure", () => {
  for (const profile of ["legacy-real-estate-v1", "legacy-municipal-v1", "legacy-consulting-v1"] as const) {
    const text = readFileSync(new URL(`./fixtures/legacy-profile-projection-v1/${profile}.json`, import.meta.url), "utf8");
    const memory = parseLegacyProfileProjectionEnvelopeV1Structure(JSON.parse(text));
    const json = parseLegacyProfileProjectionEnvelopeV1StructureJson(text);
    assert.equal(memory.ok, true); assert.deepEqual(memory, json);
    if (memory.ok) assert.equal(memory.value.compatibility.legacyRegistryProjection.entries.length, profile === "legacy-municipal-v1" ? 4 : 3);
  }
  const cases: readonly [((x: any) => void), string, string][] = [
    [x => { x.compatibility.legacyRegistryProjection.version = "v2"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/version"],
    [x => { x.compatibility.legacyRegistryProjection.registryOrder = "sorted"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/registryOrder"],
    [x => { x.compatibility.legacyRegistryProjection.materialization.cadence = "once"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/materialization/cadence"],
    [x => { x.compatibility.legacyRegistryProjection.materialization.scenarios.reverse(); }, "invalid-literal", "/compatibility/legacyRegistryProjection/materialization/scenarios/0"],
    [x => { x.compatibility.legacyRegistryProjection.materialization.surfaces.reverse(); }, "invalid-literal", "/compatibility/legacyRegistryProjection/materialization/surfaces/0"],
    [x => { x.compatibility.legacyRegistryProjection.entries = Array(5).fill(x.compatibility.legacyRegistryProjection.entries[0]); }, "collection-limit-exceeded", "/compatibility/legacyRegistryProjection/entries"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].kind = "other"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/kind"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].sourceProfileId = "other"; }, "invalid-discriminant", "/compatibility/legacyRegistryProjection/entries/0/sourceProfileId"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].sourceRegistryKey = "other"; }, "invalid-discriminant", "/compatibility/legacyRegistryProjection/entries/0/sourceRegistryKey"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].compatibilityEntryId = "other"; }, "invalid-discriminant", "/compatibility/legacyRegistryProjection/entries/0/compatibilityEntryId"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].legacyType = "other"; }, "invalid-discriminant", "/compatibility/legacyRegistryProjection/entries/0/legacyType"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].initialState.lifecycle = "ACTIVE"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/initialState/lifecycle"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].initialState.activatedAtStep = null; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/initialState/activatedAtStep"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].initialState.lastUpdatedStep = 0.5; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/initialState/lastUpdatedStep"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].transitionPolicy = "other"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/transitionPolicy"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].executionPolicy = "other"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/executionPolicy"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence.constructorPath = "other"; }, "invalid-literal", "/compatibility/legacyRegistryProjection/entries/0/sourceEvidence/constructorPath"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence.excludedSourcePath = "other"; }, "invalid-discriminant", "/compatibility/legacyRegistryProjection/entries/0/sourceEvidence/excludedSourcePath"],
    [x => { x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence.initialRegistryStateHash = "bad"; }, "invalid-hash", "/compatibility/legacyRegistryProjection/entries/0/sourceEvidence/initialRegistryStateHash"],
  ];
  for (const [mutate, code, path] of cases) { const input = fresh(); mutate(input); expectIssue(input, code, path); }
});

test("registry nested accessors and hostile arrays fail before getter execution", () => {
  for (const locate of [(x:any)=>x.compatibility.legacyRegistryProjection,(x:any)=>x.compatibility.legacyRegistryProjection.materialization,(x:any)=>x.compatibility.legacyRegistryProjection.entries[0],(x:any)=>x.compatibility.legacyRegistryProjection.entries[0].initialState,(x:any)=>x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence]) {
    let calls=0;const input=fresh();Object.defineProperty(locate(input),"trap",{enumerable:true,get:()=>{calls+=1;return true;}});expectIssue(input,"accessor-field");assert.equal(calls,0);
  }
  const sparse=fresh();sparse.compatibility.legacyRegistryProjection.entries.length=2;delete sparse.compatibility.legacyRegistryProjection.entries[1];expectIssue(sparse,"sparse-array");
  const extra=fresh();extra.compatibility.legacyRegistryProjection.entries.extra=true;expectIssue(extra,"extra-array-property");
});

test("prefixes native issues but accepts semantic-invalid and hash-mismatched contracts", () => {
  const bad = fresh(); bad.projection.contract.identity.domainId = "realEstate"; expectIssue(bad, "invalid-id", "/projection/contract/identity/domainId");
  for (const mutate of [(x: any) => { x.projection.contract.semanticPayload.drivers[0].scaleId = "missing-scale"; }, (x: any) => { x.projection.contract.identity.semanticPayloadHash = sha; }]) { const input = fresh(); mutate(input); assert.equal(parseLegacyProfileProjectionEnvelopeV1Structure(input).ok, true); }
});

test("rejects nested and array-index getters without invocation", () => {
  for (const mutate of [(x: any, g: () => unknown) => Object.defineProperty(x.source, "identity", { enumerable: true, get: g }), (x: any, g: () => unknown) => Object.defineProperty(x.compatibility.compatibilityOnlyActions[0], "ignoredEffects", { enumerable: true, get: g }), (x: any, g: () => unknown) => Object.defineProperty(x.compatibility.driverIdMappings, "0", { enumerable: true, get: g })]) {
    let calls = 0; const input = fresh(); mutate(input, () => { calls += 1; return {}; }); expectIssue(input, "accessor-field"); assert.equal(calls, 0);
  }
});

test("rejects hostile in-memory values", () => {
  const cases: readonly [((x: any) => void), string][] = [
    [(x) => Object.defineProperty(x.source.identity, "hidden", { value: 1, enumerable: false }), "non-enumerable-field"], [(x) => { x[Symbol("x")] = 1; }, "symbol-key"], [(x) => { x.source.identity.domainId = Symbol("x"); }, "unsupported-symbol"],
    [(x) => { x.source.identity = new (class X {})(); }, "class-instance"], [(x) => { x.source.identity.domainId = () => 0; }, "unsupported-function"], [(x) => { x.compatibility.ignoredUnknownDriverDeltas[0].delta = BigInt(1); }, "unsupported-bigint"],
    [(x) => { x.source.identity.domainId = undefined; }, "unsupported-undefined"], [(x) => { x.compatibility.ignoredUnknownDriverDeltas[0].delta = NaN; }, "non-finite-number"], [(x) => { x.compatibility.ignoredUnknownDriverDeltas[0].delta = Infinity; }, "non-finite-number"],
    [(x) => { x.compatibility.ignoredUnknownDriverDeltas[0].delta = -0; }, "negative-zero"], [(x) => { x.source.identity = x; }, "cyclic-reference"], [(x) => { x.compatibility.driverIdMappings.length = 3; delete x.compatibility.driverIdMappings[1]; }, "sparse-array"], [(x) => { x.compatibility.driverIdMappings.extra = true; }, "extra-array-property"],
  ];
  for (const [mutate, code] of cases) { const input = fresh(); mutate(input); expectIssue(input, code); }
});

test("raw JSON rejects syntax and decoded duplicates without string false positives", () => {
  const malformed = parseLegacyProfileProjectionEnvelopeV1StructureJson("{"); assert.equal(malformed.ok, false); if (!malformed.ok) { assert.equal(malformed.issues[0].code, "invalid-json-syntax"); assert.ok(listedCodes.has(malformed.issues[0].code)); }
  for (const text of [`{${JSON.stringify(fresh()).slice(1, -1)},"schemaVersion":"x"}`, JSON.stringify(fresh()).replace('"source":{', '"source":{"identity":{},"\\u0069dentity":{},')]) { const result = parseLegacyProfileProjectionEnvelopeV1StructureJson(text); assert.equal(result.ok, false); if (!result.ok) { assert.ok(result.issues.some((x) => x.code === "duplicate-object-key")); for (const entry of result.issues) assert.ok(listedCodes.has(entry.code)); } }
  const registryDuplicate=JSON.stringify(fresh()).replace('"registryOrder":', '"version":"legacy-registry-projection-compatibility-v1","registryOrder":');const duplicate=parseLegacyProfileProjectionEnvelopeV1StructureJson(registryDuplicate);assert.equal(duplicate.ok,false);if(!duplicate.ok)assert.ok(duplicate.issues.some(x=>x.code==="duplicate-object-key"&&x.path==="/compatibility/legacyRegistryProjection/version"));
  const stringOnly = JSON.stringify(fresh()).replace('"domainId":"realEstate"', '"domainId":"{\\\"a\\\":1,\\\"a\\\":2}"'); assert.equal(parseLegacyProfileProjectionEnvelopeV1StructureJson(stringOnly).ok, true);
});

test("enforces resource, numeric, position, nesting, and total-node limits", () => {
  const utf8 = parseLegacyProfileProjectionEnvelopeV1StructureJson("é".repeat(LIMITS.maxUtf8Bytes)); assert.equal(utf8.ok, false); if (!utf8.ok) { assert.equal(utf8.issues[0].code, "input-size-limit-exceeded"); assert.ok(listedCodes.has(utf8.issues[0].code)); }
  const collection = fresh(); collection.compatibility.driverIdMappings = Array(LIMITS.maxDrivers + 1).fill({ sourceDriverId: "a", projectedDriverId: "a" }); expectIssue(collection, "collection-limit-exceeded", "/compatibility/driverIdMappings");
  for (const n of [-1, 0.5]) { const input = fresh(); input.compatibility.propagation.sourceEvaluationOrder[0].sourcePosition = n; expectIssue(input, "invalid-non-negative-integer"); }
  const magnitude = fresh(); magnitude.compatibility.ignoredUnknownDriverDeltas[0].delta = LIMITS.maxAbsoluteNumber + 1; expectIssue(magnitude, "numeric-magnitude-limit-exceeded");
  let exact: unknown = null; for (let i = 0; i < LIMITS.maxNestingDepth; i += 1) exact = [exact]; const exactResult = parseLegacyProfileProjectionEnvelopeV1Structure(exact); assert.equal(exactResult.ok, false); if (!exactResult.ok) assert.equal(exactResult.issues.some((x) => x.code === "nesting-depth-limit-exceeded"), false); expectIssue([exact], "nesting-depth-limit-exceeded");
  const wide: Record<string, unknown>[] = []; for (let i = 0; i < 2_048; i += 1) { const record: Record<string, unknown> = {}; for (let j = 0; j < 48; j += 1) record[`k${j}`] = [null]; wide.push(record); } expectIssue(wide, "total-node-limit-exceeded");
});

test("container overflow short-circuits before getter", () => {
  let calls = 0; const input = fresh(); input.compatibility.driverIdMappings = Array(LIMITS.maxContainerEntries + 1).fill(null); Object.defineProperty(input.compatibility.driverIdMappings, String(LIMITS.maxContainerEntries), { enumerable: true, get: () => { calls += 1; return null; } }); expectIssue(input, "container-entry-limit-exceeded"); assert.equal(calls, 0);
});

test("issues are deterministic, sorted, deduplicated, and listed", () => {
  const input = fresh(); input.zzz = 1; input.aaa = 1; const first = parseLegacyProfileProjectionEnvelopeV1Structure(input), second = parseLegacyProfileProjectionEnvelopeV1Structure(input); assert.deepEqual(first, second); if (!first.ok) assert.deepEqual(first.issues.map((x) => x.path), ["/aaa", "/zzz"]);
  assert.equal(new Set(LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES).size, LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES.length);
  for (const [mutate, code] of [[(x: any) => { x.compatibility.declarationsHash = "bad"; }, "invalid-hash"], [(x: any) => { x.compatibility.excludedSourceValues[0].reasonCode = "bad"; }, "invalid-discriminant"], [(x: any) => { x.source.identity.domainId = "x".repeat(LIMITS.maxMetadataStringLength + 1); }, "metadata-string-limit-exceeded"]] as const) { const value = fresh(); mutate(value); expectIssue(value, code); }
});
