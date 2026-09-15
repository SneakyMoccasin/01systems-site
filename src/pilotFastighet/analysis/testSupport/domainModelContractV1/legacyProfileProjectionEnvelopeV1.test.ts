import assert from "node:assert/strict";
import test from "node:test";
import { hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1, SemanticallyValidatedLegacyProfileProjectionEnvelopeV1, StructurallyValidatedLegacyProfileProjectionEnvelopeV1 } from "./legacyProfileProjectionEnvelopeV1";
import { hashLegacyCompatibilityIdentityV1, hashLegacyProfileProjectionEnvelopeV1, projectLegacyCompatibilityIdentityV1, projectLegacyProfileProjectionEnvelopeHashV1, validateLegacyProfileProjectionEnvelopeV1 } from "./hashLegacyProfileProjectionEnvelopeV1";
import { makeValidEnvelope } from "./legacyProfileProjectionEnvelopeV1TestSupport";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "./parseLegacyProfileProjectionEnvelopeV1Structure";
import { LEGACY_DRIVER_ID_MAPPINGS_V1 } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

test("brand stages remain strictly progressive",()=>{
  type StructuralIsSemantic=StructurallyValidatedLegacyProfileProjectionEnvelopeV1 extends SemanticallyValidatedLegacyProfileProjectionEnvelopeV1?true:false;
  type SemanticIsHash=SemanticallyValidatedLegacyProfileProjectionEnvelopeV1 extends HashVerifiedLegacyProfileProjectionEnvelopeV1?true:false;
  const proof:[false,false]=[false as StructuralIsSemantic,false as SemanticIsHash];
  assert.deepEqual(proof,[false,false]);
});

test("closed driver mapping table has twelve conversions and six identities",()=>{
  assert.equal(LEGACY_DRIVER_ID_MAPPINGS_V1.length,18);
  assert.equal(LEGACY_DRIVER_ID_MAPPINGS_V1.filter(([source,projected])=>source!==projected).length,12);
  assert.equal(LEGACY_DRIVER_ID_MAPPINGS_V1.filter(([source,projected])=>source===projected).length,6);
  assert.equal(new Set(LEGACY_DRIVER_ID_MAPPINGS_V1.map(([,projected])=>projected)).size,18);
});

for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const)test(`runs the complete real brand pipeline for ${profile}`,()=>{
  const first=makeValidEnvelope(profile),second=makeValidEnvelope(profile);
  assert.deepEqual(first.validated,second.validated);
  assert.notEqual(first.validated.envelope,first.raw);
  const visit=(value:unknown):void=>{if(value&&typeof value==="object"){assert.equal(Object.isFrozen(value),true);Object.values(value).forEach(visit);}};visit(first.validated);
  assert.equal(hashLegacyProfileProjectionEnvelopeV1(first.validated.envelope),hashLegacyProfileProjectionEnvelopeV1(second.validated.envelope));
});

test("declarationsHash alone is excluded from compatibility identity",()=>{
  const base=makeValidEnvelope("legacy-real-estate-v1"),changed=structuredClone(base.raw);changed.compatibility.declarationsHash=`sha256:${"f".repeat(64)}`;
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(changed);assert.equal(structural.ok,true);if(!structural.ok)return;const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(semantic.ok,true);if(!semantic.ok)return;
  assert.deepEqual(projectLegacyCompatibilityIdentityV1(semantic.value),projectLegacyCompatibilityIdentityV1(base.semantic));assert.equal(hashLegacyCompatibilityIdentityV1(semantic.value),hashLegacyCompatibilityIdentityV1(base.semantic));assert.equal("declarationsHash" in projectLegacyCompatibilityIdentityV1(semantic.value),false);
});

test("raw mutation cannot affect detached verified envelope or diagnostics",()=>{
  const value=makeValidEnvelope("legacy-consulting-v1"),before=structuredClone(value.validated);
  Reflect.set(value.raw.source.identity,"domainId","changed");Reflect.set(value.raw.compatibility.compatibilityOnlyActions[0].ignoredEffects[0],"delta",99);
  assert.deepEqual(value.validated,before);
});

test("structural, semantic and combined validation do not mutate raw input",()=>{
  const raw=makeValidEnvelope("legacy-real-estate-v1").raw,before=structuredClone(raw);
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(structural.ok,true);assert.deepEqual(raw,before);if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(semantic.ok,true);assert.deepEqual(raw,before);
  const combined=validateLegacyProfileProjectionEnvelopeV1(structural.value);assert.equal(combined.ok,true);assert.deepEqual(raw,before);
});

test("compatibility projection contains every field except declarationsHash and every projected part is hashed",()=>{for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const){const value=makeValidEnvelope(profile),projection=projectLegacyCompatibilityIdentityV1(value.semantic),{declarationsHash:ignored,...clone}=structuredClone(value.semantic.compatibility);void ignored;assert.deepEqual(projection,clone);assert.deepEqual(Object.keys(projection).sort(),["compatibilityOnlyActions","curveFallbackDeclaration","declarationsVersion","driverIdMappings","excludedSourceValues","excludedUnsupportedActionIds","ignoredUnknownDriverDeltas","legacyRegistryProjection","propagation","sustainThresholdOverride"].sort());const baseline=hashBaselineValueV1(projection);for(const key of Object.keys(projection) as (keyof typeof projection)[]){const changed=structuredClone(projection),original=changed[key];Reflect.set(changed,key,key==="declarationsVersion"||original===null?"changed":null);assert.notEqual(hashBaselineValueV1(changed),baseline,key);}}});

test("envelope hash projection is complete, stable, diagnostic-free and sensitive to every top-level area",()=>{const a=makeValidEnvelope("legacy-consulting-v1"),b=makeValidEnvelope("legacy-consulting-v1"),projection=projectLegacyProfileProjectionEnvelopeHashV1(a.validated.envelope);assert.deepEqual(projection,a.validated.envelope);assert.equal("envelopeHash" in projection,false);assert.equal("diagnostics" in projection,false);assert.equal(hashLegacyProfileProjectionEnvelopeV1(a.validated.envelope),hashLegacyProfileProjectionEnvelopeV1(b.validated.envelope));const baseline=hashBaselineValueV1(projection);for(const key of ["source","projection","compatibility"] as const){const changed=structuredClone(projection);Reflect.set(changed,key,null);assert.notEqual(hashBaselineValueV1(changed),baseline);}});

test("nested property insertion order is neutral through semantic validation, projections and hashes",()=>{const base=makeValidEnvelope("legacy-real-estate-v1"),raw=structuredClone(base.raw),entry=raw.compatibility.driverIdMappings[0];raw.compatibility.driverIdMappings[0]={projectedDriverId:entry.projectedDriverId,sourceDriverId:entry.sourceDriverId};const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(structural.ok,true);if(!structural.ok)return;const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(semantic.ok,true);if(!semantic.ok)return;assert.deepEqual(projectLegacyCompatibilityIdentityV1(semantic.value),projectLegacyCompatibilityIdentityV1(base.semantic));assert.equal(hashLegacyCompatibilityIdentityV1(semantic.value),hashLegacyCompatibilityIdentityV1(base.semantic));const combined=validateLegacyProfileProjectionEnvelopeV1(structural.value);assert.equal(combined.ok,true);if(combined.ok)assert.equal(hashLegacyProfileProjectionEnvelopeV1(combined.value.envelope),hashLegacyProfileProjectionEnvelopeV1(base.validated.envelope));});

test("diagnostics equal explicit profile-local locked data over two independent pipelines",()=>{
  const common=(excluded:{reason:string;path:string}[])=>[{code:"legacy-curve-fallback-deferred-to-m1e",path:"/compatibility/curveFallbackDeclaration",message:"legacy-curve-fallback-deferred-to-m1e:legacy-neutral-multiplier-v1"},...excluded.map((x,index)=>({code:"legacy-source-value-excluded",path:`/compatibility/excludedSourceValues/${index}`,message:`legacy-source-value-excluded:${x.reason}:${x.path}`}))];
  const order={code:"legacy-propagation-evaluation-order-declared",path:"/compatibility/propagation/sourceEvaluationOrder",message:"legacy-propagation-evaluation-order-declared:legacy-source-and-target-insertion-order-v1"};const fallback=[{reason:"no-public-activation-transition",path:"constraints.LiquidityConstraint"},{reason:"no-public-activation-transition",path:"constraints.CovenantConstraint"},{reason:"inert-global-registry-member",path:"constraints.Custom"}];const edges=["legacy-compat-edge-v1.leverage-level-risk.to.liquidity-pressure","legacy-compat-edge-v1.refinancing-risk.to.liquidity-pressure","legacy-compat-edge-v1.liquidity-pressure.to.capital-commitment-rigidity-risk"].map((id,index)=>({code:"legacy-propagation-only-edge",path:`/compatibility/propagation/compatibilityOnlyEdges/${index}`,message:`legacy-propagation-only-edge:${id}`}));
  const expected={"legacy-real-estate-v1":[...common(fallback),{code:"legacy-ignored-unknown-driver-delta",path:"/compatibility/ignoredUnknownDriverDeltas/0",message:"legacy-ignored-unknown-driver-delta:legacy-real-estate-v1:stagger_project_starts:implementationPacingRisk:-1"},{code:"legacy-ignored-unknown-driver-delta",path:"/compatibility/ignoredUnknownDriverDeltas/1",message:"legacy-ignored-unknown-driver-delta:legacy-real-estate-v1:increase_liquidity_buffer:liquidityPressure:-1"},order,...edges,{code:"legacy-sustain-threshold-override-declared",path:"/compatibility/sustainThresholdOverride",message:"legacy-sustain-threshold-override-declared:not-covered-by-m0b-engine-goldens"}],"legacy-municipal-v1":[...common([{reason:"profile-constraint-disabled",path:"constraints.RefinancingConstraint"},...fallback]),{code:"legacy-compatibility-only-action",path:"/compatibility/compatibilityOnlyActions/0",message:"legacy-compatibility-only-action:congestion_pricing:omitted-from-native-actions"},order],"legacy-consulting-v1":[...common(fallback),{code:"legacy-compatibility-only-action",path:"/compatibility/compatibilityOnlyActions/0",message:"legacy-compatibility-only-action:congestion_pricing:omitted-from-native-actions"},order,...edges,{code:"legacy-sustain-threshold-override-declared",path:"/compatibility/sustainThresholdOverride",message:"legacy-sustain-threshold-override-declared:not-covered-by-m0b-engine-goldens"}]};
  for(const profile of Object.keys(expected) as (keyof typeof expected)[]){const keys=profile==="legacy-municipal-v1"?["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"]:["LiquidityConstraint","CovenantConstraint","Custom"];keys.forEach((key,index)=>expected[profile].push({code:"legacy-registry-output-materialization-declared",path:`/compatibility/legacyRegistryProjection/entries/${index}`,message:`legacy-registry-output-materialization-declared:${profile}:${key}`}));}
  const compare=(a:{code:string;path:string;message:string},b:{code:string;path:string;message:string})=>a.code<b.code?-1:a.code>b.code?1:a.path<b.path?-1:a.path>b.path?1:a.message<b.message?-1:a.message>b.message?1:0;for(const profile of Object.keys(expected) as (keyof typeof expected)[]){const locked=[...expected[profile]].sort(compare),first=makeValidEnvelope(profile).validated.diagnostics,second=makeValidEnvelope(profile).validated.diagnostics;assert.deepEqual(first,locked);assert.deepEqual(second,locked);assert.deepEqual(first,[...first].sort(compare));}
});
