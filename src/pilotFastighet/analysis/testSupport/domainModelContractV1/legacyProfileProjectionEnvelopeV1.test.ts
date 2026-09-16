import assert from "node:assert/strict";
import test from "node:test";
import { hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { AdmittedActionProvenanceV1, HashVerifiedLegacyProfileProjectionEnvelopeV1, RejectedActionFailureV1, RejectedActionProvenanceV1, SemanticallyValidatedLegacyProfileProjectionEnvelopeV1, StructurallyValidatedLegacyProfileProjectionEnvelopeV1 } from "./legacyProfileProjectionEnvelopeV1";
import { hashLegacyCompatibilityIdentityV1, hashLegacyProfileProjectionEnvelopeV1, projectLegacyCompatibilityIdentityV1, projectLegacyProfileProjectionEnvelopeHashV1, validateLegacyProfileProjectionEnvelopeV1 } from "./hashLegacyProfileProjectionEnvelopeV1";
import { makeValidEnvelope } from "./legacyProfileProjectionEnvelopeV1TestSupport";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "./parseLegacyProfileProjectionEnvelopeV1Structure";
import { LEGACY_DRIVER_ID_MAPPINGS_V1 } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

const validRejectedFailurePairs = [
  {failureStage:"profile-binding",failureReason:"wrong-profile"},
  {failureStage:"action-admission",failureReason:"undeclared-action"},
  {failureStage:"schedule-validation",failureReason:"duplicate-action"},
  {failureStage:"schedule-validation",failureReason:"step-outside-horizon"},
  {failureStage:"effect-partition",failureReason:"source-effect-inventory-mismatch"},
  {failureStage:"effect-partition",failureReason:"missing-effect"},
  {failureStage:"effect-partition",failureReason:"extra-effect"},
  {failureStage:"effect-partition",failureReason:"duplicate-effect"},
  {failureStage:"effect-partition",failureReason:"mapping-mismatch"},
] as const satisfies readonly RejectedActionFailureV1[];
// @ts-expect-error wrong-profile is only valid with profile-binding
const invalidProfilePair:RejectedActionFailureV1={failureStage:"effect-partition",failureReason:"wrong-profile"};
// @ts-expect-error duplicate-action is only valid with schedule-validation
const invalidSchedulePair:RejectedActionFailureV1={failureStage:"action-admission",failureReason:"duplicate-action"};
// @ts-expect-error mapping-mismatch is only valid with effect-partition
const invalidPartitionPair:RejectedActionFailureV1={failureStage:"profile-binding",failureReason:"mapping-mismatch"};
const admittedWithoutFailure:AdmittedActionProvenanceV1={version:"normalized-action-admission-provenance-v1",outcome:"admitted",observationKind:"compatibility-normalized-reference",profileId:"profile",scenario:"scenarioA",entryId:"entry",sourceActionId:"action",declarationPath:"/compatibility/actionAdmission/entries/0",scheduledStep:1,actualStep:1,retainedEffects:[],ignoredEffects:[],outputDisposition:"output-neutral-v1",outputChanged:false};
// @ts-expect-error admitted provenance has no failure fields
const admittedWithFailure:AdmittedActionProvenanceV1={...admittedWithoutFailure,failureStage:"profile-binding",failureReason:"wrong-profile"};
const rejectedWithoutExecution:RejectedActionProvenanceV1={version:"normalized-action-admission-provenance-v1",outcome:"rejected",observationKind:"compatibility-effective-native",profileId:"profile",scenario:"scenarioB",entryId:null,sourceActionId:"action",declarationPath:null,scheduledStep:1,canonicalSourceEffects:[],failureStage:"action-admission",failureReason:"undeclared-action",engineOutput:"absent",stateMutation:false,canonicalExecutionProvenance:"absent"};
// @ts-expect-error rejected provenance has no admitted execution fields
const rejectedWithExecution:RejectedActionProvenanceV1={...rejectedWithoutExecution,actualStep:1,retainedEffects:[],ignoredEffects:[],outputDisposition:"output-neutral-v1",outputChanged:false};
void [validRejectedFailurePairs,invalidProfilePair,invalidSchedulePair,invalidPartitionPair,admittedWithFailure,rejectedWithExecution];

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

test("compatibility projection contains every field except declarationsHash and every projected part is hashed",()=>{for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const){const value=makeValidEnvelope(profile),projection=projectLegacyCompatibilityIdentityV1(value.semantic),{declarationsHash:ignored,...clone}=structuredClone(value.semantic.compatibility);void ignored;assert.deepEqual(projection,clone);assert.deepEqual(Object.keys(projection).sort(),["actionAdmission","compatibilityOnlyActions","curveFallbackDeclaration","declarationsVersion","driverIdMappings","excludedSourceValues","excludedUnsupportedActionIds","ignoredUnknownDriverDeltas","legacyRegistryProjection","propagation","sustainThresholdDisposition"].sort());const baseline=hashBaselineValueV1(projection);for(const key of Object.keys(projection) as (keyof typeof projection)[]){const changed=structuredClone(projection),original=changed[key];Reflect.set(changed,key,key==="declarationsVersion"||original===null?"changed":null);assert.notEqual(hashBaselineValueV1(changed),baseline,key);}}});

test("every action-admission leaf and array order is compatibility- and envelope-hash-significant",()=>{
  for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const){
    const base=makeValidEnvelope(profile).validated.envelope,compatibilityHash=hashLegacyCompatibilityIdentityV1(base),envelopeHash=hashLegacyProfileProjectionEnvelopeV1(base),paths:(string|number)[][]=[];
    const visit=(value:unknown,path:(string|number)[]):void=>{if(Array.isArray(value))value.forEach((nested,index)=>visit(nested,[...path,index]));else if(value&&typeof value==="object")Object.entries(value).forEach(([key,nested])=>visit(nested,[...path,key]));else paths.push(path);};
    visit(base.compatibility.actionAdmission,[]);
    for(const path of paths){const changed=structuredClone(base);let target:unknown=changed.compatibility.actionAdmission;for(const segment of path.slice(0,-1))target=Reflect.get(target as object,segment);const leaf=path.at(-1)!,original=Reflect.get(target as object,leaf);Reflect.set(target as object,leaf,typeof original==="number"?original+1:`${original}.changed`);assert.notEqual(hashLegacyCompatibilityIdentityV1(changed),compatibilityHash,path.join("/"));assert.notEqual(hashLegacyProfileProjectionEnvelopeV1(changed),envelopeHash,path.join("/"));}
    const arrays=[base.compatibility.actionAdmission.entries,...base.compatibility.actionAdmission.entries.flatMap(entry=>[entry.retainedEffects,entry.ignoredEffects])];
    for(const [index,array] of arrays.entries())if(array.length>1){const changed=structuredClone(base),target:unknown=index===0?changed.compatibility.actionAdmission.entries:changed.compatibility.actionAdmission.entries.flatMap(entry=>[entry.retainedEffects,entry.ignoredEffects])[index-1];assert.ok(Array.isArray(target));target.reverse();assert.notEqual(hashLegacyCompatibilityIdentityV1(changed),compatibilityHash);assert.notEqual(hashLegacyProfileProjectionEnvelopeV1(changed),envelopeHash);}
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate invalid hash-domain mutations bypass validated brands
test("every M1C-5 propagation leaf is compatibility- and envelope-hash-significant",()=>{const value=makeValidEnvelope("legacy-real-estate-v1"),compatibilityBaseline=hashLegacyCompatibilityIdentityV1(value.semantic),envelopeBaseline=hashLegacyProfileProjectionEnvelopeV1(value.validated.envelope);const paths=["executionSemantics.algorithm","executionSemantics.sourceReadPolicy","executionSemantics.targetReadPolicy","executionSemantics.targetComparison","executionSemantics.writeVisibility","executionSemantics.iterationPolicy","executionSemantics.eventPolicy.emission","executionSemantics.eventPolicy.step","executionSemantics.eventPolicy.delaySteps","executionSemantics.eventPolicy.duplicateSuppression","implicitNode.sourceNodeId","implicitNode.adapterLocalNodeId","implicitNode.initialLevel","implicitNode.initialScore","implicitNode.targetMissingDefaultLevelId","implicitNode.materialization","implicitNode.scoreMaterialization","implicitNode.impacts","compatibilityOnlyEdges.0.triggerPredicate","compatibilityOnlyEdges.0.triggerLevelIds"] as const;for(const path of paths){const semantic:any=structuredClone(value.semantic),verified:any=structuredClone(value.validated.envelope);const mutate=(root:any)=>{const parts=path.split(".");let target=root.compatibility.propagation;for(const part of parts.slice(0,-1))target=target[Number.isNaN(Number(part))?part:Number(part)];const key=parts.at(-1)!;target[key]=Array.isArray(target[key])?[...target[key]].reverse():typeof target[key]==="number"?target[key]+1:`changed:${target[key]}`;};mutate(semantic);mutate(verified);assert.notEqual(hashLegacyCompatibilityIdentityV1(semantic),compatibilityBaseline,path);assert.notEqual(hashLegacyProfileProjectionEnvelopeV1(verified),envelopeBaseline,path);assert.equal(semantic.source.semanticPayloadHash,value.semantic.source.semanticPayloadHash);assert.equal(semantic.projection.semanticPayloadHash,value.semantic.projection.semanticPayloadHash);}});

test("envelope hash projection is complete, stable, diagnostic-free and sensitive to every top-level area",()=>{const a=makeValidEnvelope("legacy-consulting-v1"),b=makeValidEnvelope("legacy-consulting-v1"),projection=projectLegacyProfileProjectionEnvelopeHashV1(a.validated.envelope);assert.deepEqual(projection,a.validated.envelope);assert.equal("envelopeHash" in projection,false);assert.equal("diagnostics" in projection,false);assert.equal(hashLegacyProfileProjectionEnvelopeV1(a.validated.envelope),hashLegacyProfileProjectionEnvelopeV1(b.validated.envelope));const baseline=hashBaselineValueV1(projection);for(const key of ["source","projection","compatibility"] as const){const changed=structuredClone(projection);Reflect.set(changed,key,null);assert.notEqual(hashBaselineValueV1(changed),baseline);}});

test("nested property insertion order is neutral through semantic validation, projections and hashes",()=>{const base=makeValidEnvelope("legacy-real-estate-v1"),raw=structuredClone(base.raw),entry=raw.compatibility.driverIdMappings[0];raw.compatibility.driverIdMappings[0]={projectedDriverId:entry.projectedDriverId,sourceDriverId:entry.sourceDriverId};const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(structural.ok,true);if(!structural.ok)return;const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(semantic.ok,true);if(!semantic.ok)return;assert.deepEqual(projectLegacyCompatibilityIdentityV1(semantic.value),projectLegacyCompatibilityIdentityV1(base.semantic));assert.equal(hashLegacyCompatibilityIdentityV1(semantic.value),hashLegacyCompatibilityIdentityV1(base.semantic));const combined=validateLegacyProfileProjectionEnvelopeV1(structural.value);assert.equal(combined.ok,true);if(combined.ok)assert.equal(hashLegacyProfileProjectionEnvelopeV1(combined.value.envelope),hashLegacyProfileProjectionEnvelopeV1(base.validated.envelope));});

test("diagnostics equal explicit profile-local locked data over two independent pipelines",()=>{
  const common=(excluded:{reason:string;path:string}[])=>[{code:"legacy-curve-fallback-deferred-to-m1e",path:"/compatibility/curveFallbackDeclaration",message:"legacy-curve-fallback-deferred-to-m1e:legacy-neutral-multiplier-v1"},...excluded.map((x,index)=>({code:"legacy-source-value-excluded",path:`/compatibility/excludedSourceValues/${index}`,message:`legacy-source-value-excluded:${x.reason}:${x.path}`}))];
  const order={code:"legacy-propagation-evaluation-order-declared",path:"/compatibility/propagation/sourceEvaluationOrder",message:"legacy-propagation-evaluation-order-declared:legacy-source-and-target-insertion-order-v1"};const execution={code:"legacy-propagation-execution-semantics-declared",path:"/compatibility/propagation/executionSemantics",message:"legacy-propagation-execution-semantics-declared:ordered-monotone-raise-fixed-point-v1"};const fallback=[{reason:"no-public-activation-transition",path:"constraints.LiquidityConstraint"},{reason:"no-public-activation-transition",path:"constraints.CovenantConstraint"},{reason:"inert-global-registry-member",path:"constraints.Custom"}];const edges=["legacy-compat-edge-v1.leverage-level-risk.to.liquidity-pressure","legacy-compat-edge-v1.refinancing-risk.to.liquidity-pressure","legacy-compat-edge-v1.liquidity-pressure.to.capital-commitment-rigidity-risk"].map((id,index)=>({code:"legacy-propagation-only-edge",path:`/compatibility/propagation/compatibilityOnlyEdges/${index}`,message:`legacy-propagation-only-edge:${id}`}));
  const expected={"legacy-real-estate-v1":[...common(fallback),{code:"legacy-ignored-unknown-driver-delta",path:"/compatibility/ignoredUnknownDriverDeltas/0",message:"legacy-ignored-unknown-driver-delta:legacy-real-estate-v1:stagger_project_starts:implementationPacingRisk:-1"},{code:"legacy-ignored-unknown-driver-delta",path:"/compatibility/ignoredUnknownDriverDeltas/1",message:"legacy-ignored-unknown-driver-delta:legacy-real-estate-v1:increase_liquidity_buffer:liquidityPressure:-1"},order,execution,...edges,{code:"legacy-sustain-threshold-excluded",path:"/compatibility/sustainThresholdDisposition",message:"legacy-sustain-threshold-excluded:no-authoritative-value"}],"legacy-municipal-v1":[...common([{reason:"profile-constraint-disabled",path:"constraints.RefinancingConstraint"},...fallback]),{code:"legacy-compatibility-only-action",path:"/compatibility/compatibilityOnlyActions/0",message:"legacy-compatibility-only-action:congestion_pricing:omitted-from-native-actions"},order,execution],"legacy-consulting-v1":[...common(fallback),{code:"legacy-compatibility-only-action",path:"/compatibility/compatibilityOnlyActions/0",message:"legacy-compatibility-only-action:congestion_pricing:omitted-from-native-actions"},order,execution,...edges,{code:"legacy-sustain-threshold-excluded",path:"/compatibility/sustainThresholdDisposition",message:"legacy-sustain-threshold-excluded:no-authoritative-value"}]};
  for(const profile of Object.keys(expected) as (keyof typeof expected)[]){const admissions=makeValidEnvelope(profile).semantic.compatibility.actionAdmission.entries;admissions.forEach((entry,index)=>expected[profile].push({code:"legacy-action-admission-declared",path:`/compatibility/actionAdmission/entries/${index}`,message:`legacy-action-admission-declared:${profile}:${entry.sourceActionId}:${entry.outputDisposition}`}));const keys=profile==="legacy-municipal-v1"?["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"]:["LiquidityConstraint","CovenantConstraint","Custom"];keys.forEach((key,index)=>expected[profile].push({code:"legacy-registry-output-materialization-declared",path:`/compatibility/legacyRegistryProjection/entries/${index}`,message:`legacy-registry-output-materialization-declared:${profile}:${key}`}));}
  const compare=(a:{code:string;path:string;message:string},b:{code:string;path:string;message:string})=>a.code<b.code?-1:a.code>b.code?1:a.path<b.path?-1:a.path>b.path?1:a.message<b.message?-1:a.message>b.message?1:0;for(const profile of Object.keys(expected) as (keyof typeof expected)[]){const locked=[...expected[profile]].sort(compare),first=makeValidEnvelope(profile).validated.diagnostics,second=makeValidEnvelope(profile).validated.diagnostics;assert.deepEqual(first,locked);assert.deepEqual(second,locked);assert.deepEqual(first,[...first].sort(compare));}
});
