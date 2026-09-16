/* eslint-disable @typescript-eslint/no-explicit-any -- table mutations target raw hostile input */
import assert from "node:assert/strict";
import test from "node:test";
import { LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES, type LegacyProfileProjectionEnvelopeV1HashIssueCode, verifyLegacyProfileProjectionEnvelopeV1Hashes } from "./hashLegacyProfileProjectionEnvelopeV1";
import { makeValidEnvelope } from "./legacyProfileProjectionEnvelopeV1TestSupport";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "./parseLegacyProfileProjectionEnvelopeV1Structure";
import { LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_SEMANTIC_ISSUE_CODES, type LegacyProfileProjectionEnvelopeV1SemanticIssueCode, validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

type Profile="legacy-real-estate-v1"|"legacy-municipal-v1"|"legacy-consulting-v1";
function expectStructural(mutate:(raw:any)=>void,code:string,path:string,profile:Profile="legacy-real-estate-v1"){const raw=structuredClone(makeValidEnvelope(profile).raw);mutate(raw);const result=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(result.ok,false);if(!result.ok)assert.ok(result.issues.some(x=>x.code===code&&x.path===path),JSON.stringify(result.issues));}
function expectSemantic(mutate:(raw:any)=>void,code:LegacyProfileProjectionEnvelopeV1SemanticIssueCode,path:string,profile:Profile="legacy-real-estate-v1"){const raw=structuredClone(makeValidEnvelope(profile).raw);mutate(raw);const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(structural.ok,true);if(!structural.ok)return;const result=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(result.ok,false);if(!result.ok)assert.ok(result.issues.some(x=>x.code===code&&x.path===path),JSON.stringify(result.issues));}
function compareText(left:string,right:string):number{return left<right?-1:left>right?1:0;}

test("semantic and hash issue unions are closed and duplicate-free",()=>{assert.equal(new Set(LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_SEMANTIC_ISSUE_CODES).size,LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_SEMANTIC_ISSUE_CODES.length);assert.equal(new Set(LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES).size,LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES.length);});
test("closed semantic families have real parser-to-validator negative paths",()=>{const cases:[(x:any)=>void,LegacyProfileProjectionEnvelopeV1SemanticIssueCode,string][]=[
  [x=>{x.source.identity.domainId="consulting";},"source-identity-mismatch","/source/identity"],[x=>{x.source.semanticPayloadHash=`sha256:${"1".repeat(64)}`;},"source-hash-mismatch","/source/semanticPayloadHash"],[x=>{x.projection.identity.domainId="consulting";x.projection.contract.identity.domainId="consulting";},"native-identity-mismatch","/projection/identity"],
  [x=>x.compatibility.driverIdMappings.pop(),"driver-mapping-mismatch","/compatibility/driverIdMappings"],[x=>{x.compatibility.driverIdMappings[1].projectedDriverId=x.compatibility.driverIdMappings[0].projectedDriverId;},"driver-mapping-collision","/compatibility/driverIdMappings"],[x=>{x.compatibility.ignoredUnknownDriverDeltas[0].delta=-2;},"compatibility-declaration-mismatch","/compatibility/ignoredUnknownDriverDeltas"],
  [x=>{x.compatibility.compatibilityOnlyActions=[{kind:"legacy-compatibility-only-action-v1",sourceProfileId:"legacy-real-estate-v1",sourceActionId:"congestion_pricing",projectedNativeAction:"omitted-because-no-modeled-effects",admission:"legacy-adapter-only",ignoredEffects:[{driverId:"modal_shift_pressure",delta:2}]}];},"compatibility-action-mismatch","/compatibility/compatibilityOnlyActions"],[x=>x.compatibility.excludedUnsupportedActionIds.pop(),"unsupported-action-complement-mismatch","/compatibility/excludedUnsupportedActionIds"],[x=>x.compatibility.propagation.sourceEvaluationOrder.reverse(),"legacy-propagation-order-mismatch","/compatibility/propagation"],
  [x=>{x.compatibility.legacyRegistryProjection.entries[0].legacyType="Custom";},"legacy-registry-projection-mismatch","/compatibility/legacyRegistryProjection"],
  [x=>{x.projection.contract.semanticPayload.drivers[0].initial.score=1.1;},"driver-projection-mismatch","/projection/contract/semanticPayload/drivers"],[x=>{x.projection.contract.semanticPayload.actions[0].effects[0].delta+=.25;},"native-action-mismatch","/projection/contract/semanticPayload/actions"],[x=>{x.projection.contract.semanticPayload.propagation.edges[0].triggerLevelIds=["severe"];},"native-propagation-mismatch","/projection/contract/semanticPayload/propagation"],[x=>{x.projection.contract.semanticPayload.curves[0].amplitudeByLevel.high+=.01;},"curve-projection-mismatch","/projection/contract/semanticPayload/curves"],[x=>{x.projection.contract.semanticPayload.constraints[0].activation.threshold=.81;},"constraint-projection-mismatch","/projection/contract/semanticPayload/constraints"],[x=>{x.projection.contract.semanticPayload.drivers[0].scaleId="missing";},"nested-contract-semantic-invalid","/projection/contract/semanticPayload/drivers/0/scaleId"],[x=>{const d=structuredClone(x.projection.contract.semanticPayload.drivers[0]);d.driverId="liquidity-pressure";d.impacts[0].curveId="legacy-curve-v1.liquidity-pressure";const c=structuredClone(x.projection.contract.semanticPayload.curves[0]);c.curveId="legacy-curve-v1.liquidity-pressure";x.projection.contract.semanticPayload.drivers.push(d);x.projection.contract.semanticPayload.curves.push(c);},"native-source-id-leakage","/projection/contract/semanticPayload/drivers/18/driverId"],
  ];for(const item of cases)expectSemantic(...item);assert.deepEqual([...new Set(cases.map(([,code])=>code))].sort(compareText),[...LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_SEMANTIC_ISSUE_CODES].sort(compareText));});
test("unsupported action complements require exact canonical storage order",()=>{for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const){const value=makeValidEnvelope(profile);assert.deepEqual(value.raw.compatibility.excludedUnsupportedActionIds,[...value.raw.compatibility.excludedUnsupportedActionIds].sort(compareText));assert.equal(value.semantic.compatibility.excludedUnsupportedActionIds.length,value.raw.compatibility.excludedUnsupportedActionIds.length);}expectSemantic(x=>x.compatibility.excludedUnsupportedActionIds.reverse(),"unsupported-action-complement-mismatch","/compatibility/excludedUnsupportedActionIds");expectSemantic(x=>x.compatibility.excludedUnsupportedActionIds.push(x.compatibility.excludedUnsupportedActionIds[0]),"unsupported-action-complement-mismatch","/compatibility/excludedUnsupportedActionIds");expectSemantic(x=>x.compatibility.excludedUnsupportedActionIds.push("unexpected_action"),"unsupported-action-complement-mismatch","/compatibility/excludedUnsupportedActionIds");});
test("every source tuple field and compatibility action effect fails closed",()=>{for(const key of ["sourceProfileId","sourceActionId","sourceDriverId","delta"])expectSemantic(x=>{x.compatibility.ignoredUnknownDriverDeltas[0][key]=key==="delta"?-2:"changed";},"compatibility-declaration-mismatch","/compatibility/ignoredUnknownDriverDeltas");for(const profile of ["legacy-municipal-v1","legacy-consulting-v1"] as const){for(const key of ["sourceProfileId","sourceActionId"])expectSemantic(x=>{x.compatibility.compatibilityOnlyActions[0][key]="changed";},"compatibility-action-mismatch","/compatibility/compatibilityOnlyActions",profile);for(const key of ["driverId","delta"])expectSemantic(x=>{x.compatibility.compatibilityOnlyActions[0].ignoredEffects[0][key]=key==="delta"?3:"changed";},"compatibility-action-mismatch","/compatibility/compatibilityOnlyActions",profile);}});
test("order, liquidity evidence and excluded inventory mutations fail closed",()=>{for(const mutate of [(x:any)=>x.compatibility.propagation.sourceEvaluationOrder.pop(),(x:any)=>x.compatibility.propagation.sourceEvaluationOrder.push(structuredClone(x.compatibility.propagation.sourceEvaluationOrder[0])),(x:any)=>{x.compatibility.propagation.sourceEvaluationOrder[1].sourcePosition=9;},(x:any)=>x.compatibility.propagation.sourceEvaluationOrder.reverse()])expectSemantic(mutate,"legacy-propagation-order-mismatch","/compatibility/propagation");for(const key of ["sourcePosition","edgePosition","occurrencePosition","sourceLegacySourceDriverId","sourceLegacyTargetDriverId","adapterLocalSourceDriverId","adapterLocalTargetDriverId","compatibilityEdgeId","sourcePropagatedLevelId","projectedPropagatedLevelId"])expectSemantic(x=>{const e=x.compatibility.propagation.compatibilityOnlyEdges[0];e[key]=typeof e[key]==="number"?99:"changed";},"legacy-propagation-order-mismatch","/compatibility/propagation");for(const key of ["sourcePath","sourceValueHash"])expectSemantic(x=>{x.compatibility.excludedSourceValues[0][key]=key==="sourceValueHash"?`sha256:${"2".repeat(64)}`:"changed";},"compatibility-declaration-mismatch","/compatibility/excludedSourceValues");});

for(const profile of ["legacy-real-estate-v1","legacy-consulting-v1"] as const)test(`${profile} rejects a structurally valid missing implicit node`,()=>{
  const raw=structuredClone(makeValidEnvelope(profile).raw);
  raw.compatibility.propagation.implicitNode=null;
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok,true);
  if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok,false);
  if(!semantic.ok)assert.ok(semantic.issues.some(x=>x.code==="legacy-propagation-order-mismatch"&&x.path==="/compatibility/propagation"),JSON.stringify(semantic.issues));
});

test("legacy-municipal-v1 rejects a structurally valid RE/CO implicit node",()=>{
  const raw=structuredClone(makeValidEnvelope("legacy-municipal-v1").raw);
  raw.compatibility.propagation.implicitNode=structuredClone(makeValidEnvelope("legacy-real-estate-v1").raw.compatibility.propagation.implicitNode);
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok,true);
  if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok,false);
  if(!semantic.ok)assert.ok(semantic.issues.some(x=>x.code==="legacy-propagation-order-mismatch"&&x.path==="/compatibility/propagation"),JSON.stringify(semantic.issues));
});

test("legacy-municipal-v1 rejects a structurally valid compatibility-only edge and retains an exact zero-edge contract",()=>{
  const municipal=makeValidEnvelope("legacy-municipal-v1");
  assert.equal(municipal.raw.compatibility.propagation.compatibilityOnlyEdges.length,0);
  const raw=structuredClone(municipal.raw);
  raw.compatibility.propagation.compatibilityOnlyEdges.push(structuredClone(makeValidEnvelope("legacy-real-estate-v1").raw.compatibility.propagation.compatibilityOnlyEdges[0]));
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok,true);
  if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok,false);
  if(!semantic.ok)assert.ok(semantic.issues.some(x=>x.code==="legacy-propagation-order-mismatch"&&x.path==="/compatibility/propagation"),JSON.stringify(semantic.issues));
});

test("registry projection enforces profile complement, tuples, order, evidence and independent state hashes",()=>{
  for(const profile of ["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"] as const){const value=makeValidEnvelope(profile).semantic.compatibility.legacyRegistryProjection;assert.deepEqual(value.entries.map(x=>x.sourceRegistryKey),profile==="legacy-municipal-v1"?["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"]:["LiquidityConstraint","CovenantConstraint","Custom"]);}
  const mutations:((x:any)=>void)[]=[
    x=>x.compatibility.legacyRegistryProjection.entries.pop(),
    x=>x.compatibility.legacyRegistryProjection.entries.push(structuredClone(x.compatibility.legacyRegistryProjection.entries[0])),
    x=>x.compatibility.legacyRegistryProjection.entries.reverse(),
    x=>{x.compatibility.legacyRegistryProjection.entries[0].sourceProfileId="legacy-consulting-v1";},
    x=>{x.compatibility.legacyRegistryProjection.entries[0].sourceRegistryKey="Custom";},
    x=>{x.compatibility.legacyRegistryProjection.entries[0].compatibilityEntryId="legacy-registry-entry-v1.custom";},
    x=>{x.compatibility.legacyRegistryProjection.entries[0].legacyType="Custom";},
    x=>{x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence.excludedSourcePath="constraints.Custom";},
    x=>{x.compatibility.legacyRegistryProjection.entries[0].sourceEvidence.initialRegistryStateHash=x.compatibility.excludedSourceValues[0].sourceValueHash;},
    x=>{x.compatibility.excludedSourceValues=x.compatibility.excludedSourceValues.slice(1);},
  ];for(const mutate of mutations)expectSemantic(mutate,"legacy-registry-projection-mismatch","/compatibility/legacyRegistryProjection");
  expectSemantic(x=>x.compatibility.legacyRegistryProjection.entries.unshift(structuredClone(x.compatibility.legacyRegistryProjection.entries[0])),"legacy-registry-projection-mismatch","/compatibility/legacyRegistryProjection","legacy-real-estate-v1");
  expectSemantic(x=>x.compatibility.legacyRegistryProjection.entries.shift(),"legacy-registry-projection-mismatch","/compatibility/legacyRegistryProjection","legacy-municipal-v1");
});

test("registry evidence requires the profile- and key-specific reason code through the structural-to-semantic pipeline",()=>{
  const raw=structuredClone(makeValidEnvelope("legacy-real-estate-v1").raw);
  raw.compatibility.excludedSourceValues[0].reasonCode="inert-global-registry-member";
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok,true);
  if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok,false);
  if(!semantic.ok)assert.ok(semantic.issues.some(x=>x.code==="legacy-registry-projection-mismatch"&&x.path==="/compatibility/legacyRegistryProjection"),JSON.stringify(semantic.issues));
});

for(const profile of ["legacy-real-estate-v1","legacy-consulting-v1"] as const)test(`${profile} rejects a structurally valid Refinancing registry entry as a native duplicate`,()=>{
  const raw=structuredClone(makeValidEnvelope(profile).raw);
  const refinancingEntry=structuredClone(makeValidEnvelope("legacy-municipal-v1").raw.compatibility.legacyRegistryProjection.entries[0]);
  refinancingEntry.sourceProfileId=profile;
  raw.compatibility.legacyRegistryProjection.entries.unshift(refinancingEntry);
  const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);
  assert.equal(structural.ok,true);
  if(!structural.ok)return;
  const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);
  assert.equal(semantic.ok,false);
  if(!semantic.ok)assert.ok(semantic.issues.some(x=>x.code==="legacy-registry-projection-mismatch"&&x.path==="/compatibility/legacyRegistryProjection"),JSON.stringify(semantic.issues));
});

test("locked literals and discriminants fail at the structural leaf",()=>{const action=(key:string)=>expectStructural(x=>{x.compatibility.compatibilityOnlyActions[0][key]="changed";},"invalid-literal",`/compatibility/compatibilityOnlyActions/0/${key}`,"legacy-municipal-v1");action("projectedNativeAction");action("admission");expectStructural(x=>{x.compatibility.propagation.compatibilityOnlyEdges[0].triggerPredicate="changed";},"invalid-literal","/compatibility/propagation/compatibilityOnlyEdges/0/triggerPredicate");expectStructural(x=>{x.compatibility.propagation.compatibilityOnlyEdges[0].triggerLevelIds.reverse();},"invalid-literal","/compatibility/propagation/compatibilityOnlyEdges/0/triggerLevelIds/0");for(const key of ["sourceNodeId","adapterLocalNodeId","initialLevel","initialScore","targetMissingDefaultLevelId","materialization","scoreMaterialization","impacts"])expectStructural(x=>{x.compatibility.propagation.implicitNode[key]="changed";},"invalid-literal",`/compatibility/propagation/implicitNode/${key}`);expectStructural(x=>{x.compatibility.excludedSourceValues[0].reasonCode="changed";},"invalid-discriminant","/compatibility/excludedSourceValues/0/reasonCode");});
test("native fields are closed across scales, drivers, actions, edges, curves, measures and constraints",()=>{const cases:[(x:any)=>void,LegacyProfileProjectionEnvelopeV1SemanticIssueCode,string][]=[
  [x=>{x.projection.contract.semanticPayload.scales[0].levels[0].anchor=.1;},"driver-projection-mismatch","/projection/contract/semanticPayload/scales"],[x=>{x.projection.contract.semanticPayload.drivers[0].initial={levelId:"high",score:2};},"driver-projection-mismatch","/projection/contract/semanticPayload/drivers"],[x=>{x.projection.contract.semanticPayload.drivers[0].adverseLevelIds=["severe"];},"driver-projection-mismatch","/projection/contract/semanticPayload/drivers"],[x=>{x.projection.contract.semanticPayload.drivers[0].impacts[0].direction="decrease";},"driver-projection-mismatch","/projection/contract/semanticPayload/drivers"],
  [x=>{x.projection.contract.semanticPayload.actions[0].effects[0].driverId="pricing-power-risk";},"native-action-mismatch","/projection/contract/semanticPayload/actions"],[x=>{x.projection.contract.semanticPayload.actions[0].effects[0].delta+=.1;},"native-action-mismatch","/projection/contract/semanticPayload/actions"],[x=>{x.projection.contract.semanticPayload.propagation.edges[0].propagatedLevelId="severe";},"native-propagation-mismatch","/projection/contract/semanticPayload/propagation"],
  [x=>{x.projection.contract.semanticPayload.curves[0]={...x.projection.contract.semanticPayload.curves[0],type:"exponential",exponent:1.2};},"curve-projection-mismatch","/projection/contract/semanticPayload/curves"],[x=>{x.projection.contract.semanticPayload.curves[6].exponent=1.3;},"curve-projection-mismatch","/projection/contract/semanticPayload/curves"],[x=>{x.projection.contract.semanticPayload.curves[0].amplitudeByLevel.low=.91;},"curve-projection-mismatch","/projection/contract/semanticPayload/curves"],
  [x=>{x.projection.contract.semanticPayload.measures[0].terms[0].source.stage="base";},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],[x=>{x.projection.contract.semanticPayload.measures[0].terms[0].transform="identity";},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],[x=>{x.projection.contract.semanticPayload.measures[0].terms[0].weight=1.3;},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],[x=>{x.projection.contract.semanticPayload.measures[0].recovery.pull=.2;},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],[x=>{x.projection.contract.semanticPayload.measures[0].range.maximum=4;},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],[x=>{x.projection.contract.semanticPayload.measures[0].escalationRules[0].whenBelow=-1.1;},"constraint-projection-mismatch","/projection/contract/semanticPayload/measures"],
  [x=>{x.projection.contract.semanticPayload.constraints[0].initialLifecycle="active";},"constraint-projection-mismatch","/projection/contract/semanticPayload/constraints"],[x=>{x.projection.contract.semanticPayload.constraints[0].activation.threshold=.7;},"constraint-projection-mismatch","/projection/contract/semanticPayload/constraints"],[x=>{x.projection.contract.semanticPayload.constraints[0].allowedTransitions[1]={from:"active",to:"recovering"};},"constraint-projection-mismatch","/projection/contract/semanticPayload/constraints"],[x=>{x.projection.contract.semanticPayload.constraints[0].activeEffects[0].value=1.2;},"constraint-projection-mismatch","/projection/contract/semanticPayload/constraints"],[x=>{x.compatibility.sustainThresholdOverride=null;},"compatibility-declaration-mismatch","/compatibility/sustainThresholdOverride"],
  ];for(const item of cases)expectSemantic(...item);expectSemantic(x=>x.compatibility.excludedSourceValues.pop(),"compatibility-declaration-mismatch","/compatibility/excludedSourceValues");expectSemantic(x=>x.compatibility.excludedSourceValues.push(structuredClone(x.compatibility.excludedSourceValues[0])),"compatibility-declaration-mismatch","/compatibility/excludedSourceValues");});
test("hash bindings fail independently at exact RFC 6901 paths",()=>{const cases:readonly [string,LegacyProfileProjectionEnvelopeV1HashIssueCode,string][]=[["contract","projected-contract-hash-mismatch","/projection/contract/identity/semanticPayloadHash"],["identity","projected-identity-hash-mismatch","/projection/identity/semanticPayloadHash"],["projection","projected-projection-hash-mismatch","/projection/semanticPayloadHash"],["compatibility","compatibility-declarations-hash-mismatch","/compatibility/declarationsHash"]];for(const [which,code,path] of cases){const raw=structuredClone(makeValidEnvelope("legacy-real-estate-v1").raw),bad:`sha256:${string}`=`sha256:${"3".repeat(64)}`;if(which==="contract")raw.projection.contract.identity.semanticPayloadHash=bad;else if(which==="identity")raw.projection.identity.semanticPayloadHash=bad;else if(which==="projection")raw.projection.semanticPayloadHash=bad;else raw.compatibility.declarationsHash=bad;const structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);assert.equal(structural.ok,true);if(!structural.ok)continue;const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);assert.equal(semantic.ok,true);if(!semantic.ok)continue;const result=verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);assert.equal(result.ok,false);if(!result.ok)assert.deepEqual(result.issues.map(x=>[x.code,x.path]),[[code,path]]);}assert.deepEqual([...new Set(cases.map(([,code])=>code))].sort(compareText),[...LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES].sort(compareText));});


test("action admission rejects every semantically changed policy and partition through raw structural semantic validation",()=>{
  const policyFields=["schemaVersion","protocol","scheduleInput","ordering","duplicatePolicy","undeclaredActionPolicy","undeclaredEffectPolicy","normalizationFailurePolicy","actualRuntimeExpectation","normalizedProvenancePolicy"];
  for(const field of policyFields)expectStructural(raw=>{raw.compatibility.actionAdmission[field]="changed";},"invalid-literal",`/compatibility/actionAdmission/${field}`);
  const mutations:((raw:any)=>void)[]=[
    raw=>{raw.compatibility.actionAdmission.entries[0].sourceProfileId="legacy-consulting-v1";},
    raw=>{raw.compatibility.actionAdmission.entries[0].sourceActionId="congestion_pricing";},
    raw=>{raw.compatibility.actionAdmission.entries[0].entryId="legacy-action-admission-v1.wrong";},
    raw=>{raw.compatibility.actionAdmission.entries[0].retainedEffects[0].projectedDriverId="demand-risk";},
    raw=>{raw.compatibility.actionAdmission.entries[0].retainedEffects[0].delta=1;},
    raw=>{raw.compatibility.actionAdmission.entries[0].ignoredEffects[0].delta=1;},
    raw=>{raw.compatibility.actionAdmission.entries[0].ignoredEffects[0].sourceDriverId="refinancingRisk";},
    raw=>{raw.compatibility.actionAdmission.entries[0].retainedEffects=[];},
    raw=>{raw.compatibility.actionAdmission.entries.pop();},
  ];
  for(const mutate of mutations)expectSemantic(mutate,"compatibility-declaration-mismatch","/compatibility/actionAdmission");
  expectStructural(raw=>{raw.compatibility.actionAdmission.entries.reverse();},"invalid-literal","/compatibility/actionAdmission/entries");
  expectStructural(raw=>{raw.compatibility.actionAdmission.entries[0].ignoredEffects.push(structuredClone(raw.compatibility.actionAdmission.entries[0].ignoredEffects[0]));},"invalid-literal","/compatibility/actionAdmission/entries/0/ignoredEffects/1/sourceDriverId");
  expectSemantic(raw=>{raw.compatibility.actionAdmission=structuredClone(makeValidEnvelope("legacy-consulting-v1").raw.compatibility.actionAdmission);},"compatibility-declaration-mismatch","/compatibility/actionAdmission");
});
