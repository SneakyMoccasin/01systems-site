import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import { jsonPointer, sortContractIssues, type ContractIssue } from "./contractV1Issues";
import { detectDuplicateJsonKeys } from "./detectDuplicateJsonKeys";
import type { StructurallyValidatedDomainModelContractV1 } from "./contractV1";
import type { StructurallyValidatedLegacyProfileProjectionEnvelopeV1 } from "./legacyProfileProjectionEnvelopeV1";
import { parseDomainModelContractV1Structure } from "./parseDomainModelContractV1Structure";

export const LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES = Object.freeze([
  "accessor-field", "class-instance", "collection-limit-exceeded", "container-entry-limit-exceeded", "cyclic-reference",
  "collection-too-small", "conflicting-band-maximum",
  "duplicate-object-key", "empty-string", "extra-array-property", "input-size-limit-exceeded", "invalid-discriminant",
  "invalid-hash", "invalid-id", "invalid-json-syntax", "invalid-literal", "invalid-non-negative-integer", "invalid-type",
  "invalid-amplitude", "invalid-curve-parameter", "invalid-range", "invalid-semantic-payload-hash",
  "missing-required-field", "negative-zero", "nesting-depth-limit-exceeded", "non-enumerable-field", "non-finite-number",
  "metadata-string-limit-exceeded", "missing-band-maximum", "negative-number", "numeric-magnitude-limit-exceeded",
  "predicate-depth-limit-exceeded", "predicate-node-limit-exceeded", "sparse-array", "symbol-key", "total-node-limit-exceeded", "unknown-field",
  "unsupported-curve-type", "unsupported-measure-source-kind", "unsupported-predicate-kind", "unsupported-transform",
  "unsupported-bigint", "unsupported-function", "unsupported-symbol", "unsupported-undefined", "version-string-limit-exceeded",
] as const);
export type LegacyEnvelopeStructuralIssueCode = typeof LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_STRUCTURAL_ISSUE_CODES[number];
export type LegacyEnvelopeStructuralParseResult =
  | Readonly<{ ok: true; value: StructurallyValidatedLegacyProfileProjectionEnvelopeV1 }>
  | Readonly<{ ok: false; issues: readonly ContractIssue[] }>;

type RecordValue = Record<string, unknown>;
type Context = { issues: ContractIssue[] };
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$/;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const issue = (code: string, path: string, message: string): ContractIssue => ({ code, path, message });
const fail = (issues: readonly ContractIssue[]): LegacyEnvelopeStructuralParseResult => ({ ok: false, issues: Object.freeze(sortContractIssues(issues).filter((entry, index, all) => index === 0 || entry.code !== all[index - 1].code || entry.path !== all[index - 1].path || entry.message !== all[index - 1].message).map((entry) => Object.freeze(entry))) });

export function parseLegacyProfileProjectionEnvelopeV1Structure(input: unknown): LegacyEnvelopeStructuralParseResult {
  const boundaryIssue = inspectJsonBoundary(input);
  if (boundaryIssue) return fail([boundaryIssue]);
  const context: Context = { issues: [] };
  const nestedContract = envelope(input, context);
  if (context.issues.length) return fail(context.issues);
  if (!nestedContract) return fail([issue("invalid-type", "/projection/contract", "Expected an object.")]);
  const detached = structuredClone(input) as RecordValue;
  (detached.projection as RecordValue).contract = nestedContract;
  return Object.freeze({ ok: true, value: deepFreeze(detached) as StructurallyValidatedLegacyProfileProjectionEnvelopeV1 });
}

export function parseLegacyProfileProjectionEnvelopeV1StructureJson(input: string): LegacyEnvelopeStructuralParseResult {
  if (typeof input !== "string") return fail([issue("invalid-type", "", "Expected a JSON string.")]);
  if (new TextEncoder().encode(input).byteLength > LIMITS.maxUtf8Bytes) return fail([issue("input-size-limit-exceeded", "", `UTF-8 input must not exceed ${LIMITS.maxUtf8Bytes} bytes.`)]);
  const scan = detectDuplicateJsonKeys(input);
  if (!scan.syntaxValid) return fail([issue("invalid-json-syntax", "", "Input must be valid JSON.")]);
  if (scan.issues.length) return fail(scan.issues);
  let value: unknown;
  try { value = JSON.parse(input) as unknown; } catch { return fail([issue("invalid-json-syntax", "", "Input must be valid JSON.")]); }
  return parseLegacyProfileProjectionEnvelopeV1Structure(value);
}

function inspectJsonBoundary(root: unknown): ContractIssue | undefined {
  const stack: { value: unknown; path: string; depth: number; ancestors: readonly object[] }[] = [{ value: root, path: "", depth: 0, ancestors: [] }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!; const { value, path, depth, ancestors } = current;
    if (++nodes > LIMITS.maxTotalValueNodes) return issue("total-node-limit-exceeded", path, `Input must not contain more than ${LIMITS.maxTotalValueNodes} total value nodes.`);
    if (depth > LIMITS.maxNestingDepth) return issue("nesting-depth-limit-exceeded", path, `Nesting depth must not exceed ${LIMITS.maxNestingDepth}.`);
    if (value === null || typeof value === "string" || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return issue("non-finite-number", path, "Number must be finite.");
      if (Object.is(value, -0)) return issue("negative-zero", path, "Number must not be negative zero.");
      if (Math.abs(value) > LIMITS.maxAbsoluteNumber) return issue("numeric-magnitude-limit-exceeded", path, `Absolute numeric value must not exceed ${LIMITS.maxAbsoluteNumber}.`);
      continue;
    }
    if (typeof value !== "object") return issue(`unsupported-${typeof value}`, path, `${typeof value} values are not supported.`);
    if (ancestors.includes(value)) return issue("cyclic-reference", path, "Cyclic references are not supported.");
    if (Object.getOwnPropertySymbols(value).length) return issue("symbol-key", path, "Symbol keys are not supported.");
    const nextAncestors = [...ancestors, value];
    if (Array.isArray(value)) {
      if (value.length > LIMITS.maxContainerEntries) return issue("container-entry-limit-exceeded", path, `Container must not contain more than ${LIMITS.maxContainerEntries} entries.`);
      const names = Object.getOwnPropertyNames(value);
      for (let index = 0; index < value.length; index++) if (!Object.prototype.hasOwnProperty.call(value, index)) return issue("sparse-array", jsonPointer(path, index), "Sparse arrays are not supported.");
      const extra = names.find((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name));
      if (extra !== undefined) return issue("extra-array-property", jsonPointer(path, extra), "Extra array properties are not supported.");
      for (let index = value.length - 1; index >= 0; index--) {
        const descriptorIssue = pushDescriptor(value, String(index), jsonPointer(path, index), depth, nextAncestors, stack);
        if (descriptorIssue) return descriptorIssue;
      }
      continue;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return issue("class-instance", path, "Class instances are not supported.");
    const names = Object.getOwnPropertyNames(value);
    if (names.length > LIMITS.maxContainerEntries) return issue("container-entry-limit-exceeded", path, `Container must not contain more than ${LIMITS.maxContainerEntries} entries.`);
    for (let index = names.length - 1; index >= 0; index--) {
      const name = names[index]; const descriptor = Object.getOwnPropertyDescriptor(value, name)!; const childPath = jsonPointer(path, name);
      if (!descriptor.enumerable) return issue("non-enumerable-field", childPath, "Non-enumerable fields are not supported.");
      if (!("value" in descriptor)) return issue("accessor-field", childPath, "Accessor fields are not supported.");
      stack.push({ value: descriptor.value, path: childPath, depth: depth + 1, ancestors: nextAncestors });
    }
  }
}
function pushDescriptor(value: unknown[], name: string, path: string, depth: number, ancestors: readonly object[], stack: { value: unknown; path: string; depth: number; ancestors: readonly object[] }[]): ContractIssue | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, name)!;
  if (!descriptor.enumerable) return issue("non-enumerable-field", path, "Non-enumerable fields are not supported.");
  if (!("value" in descriptor)) return issue("accessor-field", path, "Accessor fields are not supported.");
  stack.push({ value: descriptor.value, path, depth: depth + 1, ancestors });
}

function envelope(value: unknown, c: Context): StructurallyValidatedDomainModelContractV1 | undefined {
  const v = object(value, "", c, ["schemaVersion", "adapterVersion", "engineProtocolVersion", "source", "projection", "compatibility"]); if (!v) return undefined;
  literal(v.schemaVersion, "legacy-profile-projection-v1", "/schemaVersion", c); literal(v.adapterVersion, "legacy-domain-profile-adapter-v1", "/adapterVersion", c); literal(v.engineProtocolVersion, "pulse-domain-engine-protocol-v1", "/engineProtocolVersion", c);
  source(v.source, "/source", c); const nestedContract=projection(v.projection, "/projection", c); compatibility(v.compatibility, "/compatibility", c); return nestedContract;
}
function source(value: unknown, path: string, c: Context): void { const v=object(value,path,c,["identity","semanticPayloadVersion","semanticPayloadHash"]);if(!v)return;sourceIdentity(v.identity,`${path}/identity`,c);literal(v.semanticPayloadVersion,"legacy-domain-profile-semantic-payload-v1",`${path}/semanticPayloadVersion`,c);hash(v.semanticPayloadHash,`${path}/semanticPayloadHash`,c); }
function sourceIdentity(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["domainId","profileId","modelVersion","calibrationVersion"]);if(!v)return;plainString(v.domainId,`${path}/domainId`,c);plainString(v.profileId,`${path}/profileId`,c);version(v.modelVersion,`${path}/modelVersion`,c);version(v.calibrationVersion,`${path}/calibrationVersion`,c);}
function projectedIdentity(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["domainId","profileId","modelVersion","calibrationVersion","semanticPayloadHash"]);if(!v)return;id(v.domainId,`${path}/domainId`,c);id(v.profileId,`${path}/profileId`,c);version(v.modelVersion,`${path}/modelVersion`,c);version(v.calibrationVersion,`${path}/calibrationVersion`,c);hash(v.semanticPayloadHash,`${path}/semanticPayloadHash`,c);}
function projection(value:unknown,path:string,c:Context):StructurallyValidatedDomainModelContractV1|undefined {const v=object(value,path,c,["identity","semanticPayloadHashPolicy","semanticPayloadHash","contract"]);if(!v)return undefined;projectedIdentity(v.identity,`${path}/identity`,c);literal(v.semanticPayloadHashPolicy,"domain-model-contract-v1-semantic-payload-v1",`${path}/semanticPayloadHashPolicy`,c);hash(v.semanticPayloadHash,`${path}/semanticPayloadHash`,c);const nested=parseDomainModelContractV1Structure(v.contract);if(!nested.ok){for(const nestedIssue of nested.issues)c.issues.push(issue(nestedIssue.code,`${path}/contract${nestedIssue.path}`,nestedIssue.message));return undefined;}return nested.value;}
function compatibility(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["declarationsVersion","declarationsHash","ignoredUnknownDriverDeltas","compatibilityOnlyActions","driverIdMappings","excludedUnsupportedActionIds","sustainThresholdOverride","propagation","excludedSourceValues","legacyRegistryProjection","curveFallbackDeclaration"]);if(!v)return;literal(v.declarationsVersion,"legacy-compatibility-declarations-v1",`${path}/declarationsVersion`,c);hash(v.declarationsHash,`${path}/declarationsHash`,c);each(array(v.ignoredUnknownDriverDeltas,`${path}/ignoredUnknownDriverDeltas`,c,LIMITS.maxEffectsPerAction),`${path}/ignoredUnknownDriverDeltas`,(x,p)=>ignoredDelta(x,p,c));each(array(v.compatibilityOnlyActions,`${path}/compatibilityOnlyActions`,c,LIMITS.maxActions),`${path}/compatibilityOnlyActions`,(x,p)=>compatibilityAction(x,p,c));each(array(v.driverIdMappings,`${path}/driverIdMappings`,c,LIMITS.maxDrivers),`${path}/driverIdMappings`,(x,p)=>mapping(x,p,c));each(array(v.excludedUnsupportedActionIds,`${path}/excludedUnsupportedActionIds`,c,LIMITS.maxActions),`${path}/excludedUnsupportedActionIds`,(x,p)=>plainString(x,p,c));if(v.sustainThresholdOverride!==null)sustain(v.sustainThresholdOverride,`${path}/sustainThresholdOverride`,c);propagation(v.propagation,`${path}/propagation`,c);each(array(v.excludedSourceValues,`${path}/excludedSourceValues`,c,LIMITS.maxConstraints),`${path}/excludedSourceValues`,(x,p)=>excluded(x,p,c));legacyRegistryProjection(v.legacyRegistryProjection,`${path}/legacyRegistryProjection`,c);fallback(v.curveFallbackDeclaration,`${path}/curveFallbackDeclaration`,c);}
function ignoredDelta(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["sourceProfileId","sourceActionId","sourceDriverId","delta"]);if(!v)return;plainString(v.sourceProfileId,`${path}/sourceProfileId`,c);plainString(v.sourceActionId,`${path}/sourceActionId`,c);plainString(v.sourceDriverId,`${path}/sourceDriverId`,c);num(v.delta,`${path}/delta`,c);}
function compatibilityAction(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["kind","sourceProfileId","sourceActionId","projectedNativeAction","admission","ignoredEffects"]);if(!v)return;literal(v.kind,"legacy-compatibility-only-action-v1",`${path}/kind`,c);plainString(v.sourceProfileId,`${path}/sourceProfileId`,c);plainString(v.sourceActionId,`${path}/sourceActionId`,c);literal(v.projectedNativeAction,"omitted-because-no-modeled-effects",`${path}/projectedNativeAction`,c);literal(v.admission,"legacy-adapter-only",`${path}/admission`,c);each(array(v.ignoredEffects,`${path}/ignoredEffects`,c,LIMITS.maxEffectsPerAction),`${path}/ignoredEffects`,(x,p)=>{const e=object(x,p,c,["driverId","delta"]);if(e){plainString(e.driverId,`${p}/driverId`,c);num(e.delta,`${p}/delta`,c);}});}
function mapping(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["sourceDriverId","projectedDriverId"]);if(!v)return;plainString(v.sourceDriverId,`${path}/sourceDriverId`,c);id(v.projectedDriverId,`${path}/projectedDriverId`,c);}
function sustain(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["kind","sourceField","constraintId","acceptedRuntimeType","comparison","applicability"]);if(!v)return;literal(v.kind,"legacy-risk-state-number-overrides-constraint-threshold-v1",`${path}/kind`,c);literal(v.sourceField,"sustainThreshold",`${path}/sourceField`,c);literal(v.constraintId,"refinancing-constraint",`${path}/constraintId`,c);literal(v.acceptedRuntimeType,"number-including-non-finite",`${path}/acceptedRuntimeType`,c);literal(v.comparison,"margin-strictly-below-threshold",`${path}/comparison`,c);literal(v.applicability,"this-envelope-source-only",`${path}/applicability`,c);}
function propagation(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["edgeEvaluationOrder","executionSemantics","implicitNode","sourceEvaluationOrder","compatibilityOnlyEdges"]);if(!v)return;literal(v.edgeEvaluationOrder,"legacy-source-and-target-insertion-order-v1",`${path}/edgeEvaluationOrder`,c);executionSemantics(v.executionSemantics,`${path}/executionSemantics`,c);if(v.implicitNode!==null)implicitNode(v.implicitNode,`${path}/implicitNode`,c);each(array(v.sourceEvaluationOrder,`${path}/sourceEvaluationOrder`,c,LIMITS.maxPropagationEdges),`${path}/sourceEvaluationOrder`,(x,p)=>orderEntry(x,p,c));each(array(v.compatibilityOnlyEdges,`${path}/compatibilityOnlyEdges`,c,LIMITS.maxPropagationEdges),`${path}/compatibilityOnlyEdges`,(x,p)=>compatibilityEdge(x,p,c));}
function executionSemantics(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["algorithm","sourceReadPolicy","targetReadPolicy","targetComparison","writeVisibility","iterationPolicy","eventPolicy"]);if(!v)return;literal(v.algorithm,"ordered-monotone-raise-fixed-point-v1",`${path}/algorithm`,c);literal(v.sourceReadPolicy,"missing-source-does-not-trigger-v1",`${path}/sourceReadPolicy`,c);literal(v.targetReadPolicy,"missing-target-uses-declared-default-v1",`${path}/targetReadPolicy`,c);literal(v.targetComparison,"propagated-rank-strictly-greater-v1",`${path}/targetComparison`,c);literal(v.writeVisibility,"later-occurrences-same-iteration-v1",`${path}/writeVisibility`,c);literal(v.iterationPolicy,"repeat-from-start-until-no-raise-v1",`${path}/iterationPolicy`,c);eventPolicy(v.eventPolicy,`${path}/eventPolicy`,c);}
function eventPolicy(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["emission","step","delaySteps","duplicateSuppression"]);if(!v)return;literal(v.emission,"on-target-level-change-v1",`${path}/emission`,c);literal(v.step,"iteration-plus-one-v1",`${path}/step`,c);literal(v.delaySteps,1,`${path}/delaySteps`,c);literal(v.duplicateSuppression,"no-change-no-event-v1",`${path}/duplicateSuppression`,c);}
function implicitNode(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["sourceNodeId","adapterLocalNodeId","initialLevel","initialScore","targetMissingDefaultLevelId","materialization","scoreMaterialization","impacts"]);if(!v)return;literal(v.sourceNodeId,"liquidityPressure",`${path}/sourceNodeId`,c);literal(v.adapterLocalNodeId,"liquidity-pressure",`${path}/adapterLocalNodeId`,c);literal(v.initialLevel,"absent",`${path}/initialLevel`,c);literal(v.initialScore,"absent",`${path}/initialScore`,c);literal(v.targetMissingDefaultLevelId,"low",`${path}/targetMissingDefaultLevelId`,c);literal(v.materialization,"on-propagation-raise-v1",`${path}/materialization`,c);literal(v.scoreMaterialization,"projected-level-anchor-after-propagation-v1",`${path}/scoreMaterialization`,c);literal(v.impacts,"none",`${path}/impacts`,c);}
function positions(v:RecordValue,path:string,c:Context,keys:readonly string[]):void {for(const key of keys)integer(v[key],`${path}/${key}`,c);}
function orderEntry(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["sourcePosition","edgePosition","sourceLegacyDriverId","targetLegacyDriverId","projectedOrCompatibilityEdgeId"]);if(!v)return;positions(v,path,c,["sourcePosition","edgePosition"]);plainString(v.sourceLegacyDriverId,`${path}/sourceLegacyDriverId`,c);plainString(v.targetLegacyDriverId,`${path}/targetLegacyDriverId`,c);id(v.projectedOrCompatibilityEdgeId,`${path}/projectedOrCompatibilityEdgeId`,c);}
function compatibilityEdge(value:unknown,path:string,c:Context):void {const keys=["sourcePosition","edgePosition","occurrencePosition","sourceLegacySourceDriverId","sourceLegacyTargetDriverId","adapterLocalSourceDriverId","adapterLocalTargetDriverId","compatibilityEdgeId","sourcePropagatedLevelId","projectedPropagatedLevelId","triggerPredicate","triggerLevelIds"] as const;const v=object(value,path,c,keys);if(!v)return;positions(v,path,c,["sourcePosition","edgePosition","occurrencePosition"]);plainString(v.sourceLegacySourceDriverId,`${path}/sourceLegacySourceDriverId`,c);plainString(v.sourceLegacyTargetDriverId,`${path}/sourceLegacyTargetDriverId`,c);for(const key of ["adapterLocalSourceDriverId","adapterLocalTargetDriverId","compatibilityEdgeId","projectedPropagatedLevelId"] as const)id(v[key],`${path}/${key}`,c);plainString(v.sourcePropagatedLevelId,`${path}/sourcePropagatedLevelId`,c);literal(v.triggerPredicate,"source-level-in-set-v1",`${path}/triggerPredicate`,c);fixedLiterals(v.triggerLevelIds,`${path}/triggerLevelIds`,c,["high","severe"]);}
function excluded(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["kind","sourcePath","sourceValueHash","reasonCode"]);if(!v)return;literal(v.kind,"provably-unreachable-public-execution-v1",`${path}/kind`,c);plainString(v.sourcePath,`${path}/sourcePath`,c);hash(v.sourceValueHash,`${path}/sourceValueHash`,c);enumeration(v.reasonCode,["profile-constraint-disabled","no-public-activation-transition","inert-global-registry-member"],`${path}/reasonCode`,c);}
function legacyRegistryProjection(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["version","registryOrder","materialization","entries"]);if(!v)return;literal(v.version,"legacy-registry-projection-compatibility-v1",`${path}/version`,c);literal(v.registryOrder,"legacy-constraint-registry-constructor-order-v1",`${path}/registryOrder`,c);registryMaterialization(v.materialization,`${path}/materialization`,c);each(array(v.entries,`${path}/entries`,c,4),`${path}/entries`,(x,p)=>registryEntry(x,p,c));}
function registryMaterialization(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["scenarios","surfaces","cadence"]);if(!v)return;fixedLiterals(v.scenarios,`${path}/scenarios`,c,["scenarioA","scenarioB","baseline"]);fixedLiterals(v.surfaces,`${path}/surfaces`,c,["trajectory.registry","constraintHistory","terminalState.registry"]);literal(v.cadence,"initial-and-every-completed-step-v1",`${path}/cadence`,c);}
function fixedLiterals(value:unknown,path:string,c:Context,expected:readonly string[]):void {const values=array(value,path,c,expected.length);if(!values)return;if(values.length!==expected.length)c.issues.push(issue("invalid-literal",path,`Value must contain exactly ${expected.length} entries.`));for(let index=0;index<Math.min(values.length,expected.length);index+=1)literal(values[index],expected[index],jsonPointer(path,index),c);}
function registryEntry(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["kind","sourceProfileId","sourceRegistryKey","compatibilityEntryId","legacyType","initialState","transitionPolicy","executionPolicy","sourceEvidence"]);if(!v)return;literal(v.kind,"legacy-inert-registry-entry-v1",`${path}/kind`,c);enumeration(v.sourceProfileId,["legacy-real-estate-v1","legacy-municipal-v1","legacy-consulting-v1"],`${path}/sourceProfileId`,c);enumeration(v.sourceRegistryKey,["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"],`${path}/sourceRegistryKey`,c);enumeration(v.compatibilityEntryId,["legacy-registry-entry-v1.refinancing-constraint","legacy-registry-entry-v1.liquidity-constraint","legacy-registry-entry-v1.covenant-constraint","legacy-registry-entry-v1.custom"],`${path}/compatibilityEntryId`,c);enumeration(v.legacyType,["RefinancingConstraint","LiquidityConstraint","CovenantConstraint","Custom"],`${path}/legacyType`,c);registryInitialState(v.initialState,`${path}/initialState`,c);literal(v.transitionPolicy,"no-public-transition-v1",`${path}/transitionPolicy`,c);literal(v.executionPolicy,"immutable-inert-output-placeholder-v1",`${path}/executionPolicy`,c);registrySourceEvidence(v.sourceEvidence,`${path}/sourceEvidence`,c);}
function registryInitialState(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["lifecycle","activatedAtStep","lastUpdatedStep"]);if(!v)return;literal(v.lifecycle,"INACTIVE",`${path}/lifecycle`,c);literal(v.activatedAtStep,"absent",`${path}/activatedAtStep`,c);literal(v.lastUpdatedStep,0,`${path}/lastUpdatedStep`,c);}
function registrySourceEvidence(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["constructorPath","excludedSourcePath","initialRegistryStateHash"]);if(!v)return;literal(v.constructorPath,"src/pilotFastighet/constraintState.ts#createInitialConstraintRegistry",`${path}/constructorPath`,c);enumeration(v.excludedSourcePath,["constraints.RefinancingConstraint","constraints.LiquidityConstraint","constraints.CovenantConstraint","constraints.Custom"],`${path}/excludedSourcePath`,c);hash(v.initialRegistryStateHash,`${path}/initialRegistryStateHash`,c);}
function fallback(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["policyId","appliesTo","neutralMultiplier","evidenceStatus"]);if(!v)return;literal(v.policyId,"legacy-neutral-multiplier-v1",`${path}/policyId`,c);const a=array(v.appliesTo,`${path}/appliesTo`,c,2);if(a&&a.length!==2)c.issues.push(issue("invalid-literal",`${path}/appliesTo`,"Value must contain exactly the two deferred fallback cases."));if(a){literal(a[0],"missing-curve-configuration",`${path}/appliesTo/0`,c);literal(a[1],"unsupported-curve-discriminant",`${path}/appliesTo/1`,c);}literal(v.neutralMultiplier,1,`${path}/neutralMultiplier`,c);literal(v.evidenceStatus,"deferred-to-m1e",`${path}/evidenceStatus`,c);}

function object(value:unknown,path:string,c:Context,required:readonly string[]):RecordValue|undefined {if(value===null||typeof value!=="object"||Array.isArray(value)){c.issues.push(issue("invalid-type",path,"Expected an object."));return;}const record=value as RecordValue;const allowed=new Set(required);for(const key of Object.keys(record))if(!allowed.has(key))c.issues.push(issue("unknown-field",jsonPointer(path,key),"Unknown field."));for(const key of required)if(!Object.prototype.hasOwnProperty.call(record,key))c.issues.push(issue("missing-required-field",jsonPointer(path,key),"Required field is missing."));return record;}
function array(value:unknown,path:string,c:Context,max:number):unknown[]|undefined {if(!Array.isArray(value)){c.issues.push(issue("invalid-type",path,"Expected an array."));return;}if(value.length>max){c.issues.push(issue("collection-limit-exceeded",path,`Array must not contain more than ${max} item(s).`));return;}return value;}
function each(values:unknown[]|undefined,path:string,fn:(value:unknown,path:string)=>void):void {values?.forEach((value,index)=>fn(value,jsonPointer(path,index)));}
function requiredString(value:unknown,path:string,c:Context):value is string {if(typeof value!=="string"){c.issues.push(issue("invalid-type",path,"Expected a string."));return false;}if(!value.length){c.issues.push(issue("empty-string",path,"String must not be empty."));return false;}return true;}
function plainString(value:unknown,path:string,c:Context):void {if(requiredString(value,path,c)&&value.length>LIMITS.maxMetadataStringLength)c.issues.push(issue("metadata-string-limit-exceeded",path,`String must not exceed ${LIMITS.maxMetadataStringLength} characters.`));}
function version(value:unknown,path:string,c:Context):void {if(requiredString(value,path,c)&&value.length>LIMITS.maxVersionStringLength)c.issues.push(issue("version-string-limit-exceeded",path,`Version string must not exceed ${LIMITS.maxVersionStringLength} characters.`));}
function id(value:unknown,path:string,c:Context):void {if(!requiredString(value,path,c))return;if(value.length>LIMITS.maxIdLength||!ID_PATTERN.test(value))c.issues.push(issue("invalid-id",path,`ID must match ${ID_PATTERN.source} and contain ${LIMITS.minIdLength}-${LIMITS.maxIdLength} ASCII characters.`));}
function hash(value:unknown,path:string,c:Context):void {if(!requiredString(value,path,c))return;if(!HASH_PATTERN.test(value))c.issues.push(issue("invalid-hash",path,"Hash must use sha256 followed by 64 lowercase hexadecimal characters."));}
function num(value:unknown,path:string,c:Context):value is number {if(typeof value!=="number"){c.issues.push(issue("invalid-type",path,"Expected a number."));return false;}return true;}
function integer(value:unknown,path:string,c:Context):void {if(num(value,path,c)&&(!Number.isInteger(value)||value<0))c.issues.push(issue("invalid-non-negative-integer",path,"Position must be a non-negative integer."));}
function literal(value:unknown,expected:unknown,path:string,c:Context):void {if(value!==expected)c.issues.push(issue("invalid-literal",path,`Value must equal ${JSON.stringify(expected)}.`));}
function enumeration(value:unknown,values:readonly string[],path:string,c:Context):void {if(typeof value!=="string"||!values.includes(value))c.issues.push(issue("invalid-discriminant",path,`Value must be one of: ${values.join(", ")}.`));}
function deepFreeze<T>(value:T):T {if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);for(const nested of Object.values(value as RecordValue))deepFreeze(nested);}return value;}
