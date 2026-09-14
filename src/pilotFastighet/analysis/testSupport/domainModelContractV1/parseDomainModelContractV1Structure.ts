import type { DomainModelContractV1, StructurallyValidatedDomainModelContractV1 } from "./contractV1";
import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import { jsonPointer, sortContractIssues, type ContractIssue } from "./contractV1Issues";
import { detectDuplicateJsonKeys } from "./detectDuplicateJsonKeys";

export type StructuralParseResult =
  | Readonly<{ ok: true; value: StructurallyValidatedDomainModelContractV1 }>
  | Readonly<{ ok: false; issues: readonly ContractIssue[] }>;

type RecordValue = Record<string, unknown>;
type Context = { issues: ContractIssue[]; measureTerms: number; predicateNodes: number };
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$/;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

function issue(code: string, path: string, message: string): ContractIssue { return { code, path, message }; }
function finish(issues: readonly ContractIssue[]): StructuralParseResult {
  return { ok: false, issues: Object.freeze(sortContractIssues(issues).map((entry) => Object.freeze(entry))) };
}

/**
 * Validates an already-materialized value. Independent sibling errors accumulate;
 * validation stops inside a value whose container or discriminant cannot be parsed,
 * preventing fabricated descendant errors.
 */
export function parseDomainModelContractV1Structure(input: unknown): StructuralParseResult {
  const boundary = inspectJsonBoundary(input);
  if (boundary) return finish([boundary]);
  const context: Context = { issues: [], measureTerms: 0, predicateNodes: 0 };
  contract(input, "", context);
  if (context.measureTerms > LIMITS.maxMeasureTermsTotal) {
    context.issues.push(issue("collection-limit-exceeded", "/semanticPayload/measures", `Total measure terms must not exceed ${LIMITS.maxMeasureTermsTotal}.`));
  }
  if (context.issues.length) return finish(context.issues);
  const detached = structuredClone(input) as DomainModelContractV1;
  return Object.freeze({ ok: true, value: deepFreeze(detached) as StructurallyValidatedDomainModelContractV1 });
}

export function parseDomainModelContractV1StructureJson(input: string): StructuralParseResult {
  if (typeof input !== "string") return finish([issue("invalid-type", "", "Expected a JSON string.")]);
  const bytes = new TextEncoder().encode(input).byteLength;
  if (bytes > LIMITS.maxUtf8Bytes) return finish([issue("input-size-limit-exceeded", "", `UTF-8 input must not exceed ${LIMITS.maxUtf8Bytes} bytes.`)]);
  const duplicateScan = detectDuplicateJsonKeys(input);
  if (!duplicateScan.syntaxValid) return finish([issue("invalid-json-syntax", "", "Input must be valid JSON.")]);
  if (duplicateScan.issues.length) return finish(duplicateScan.issues);
  let value: unknown;
  try { value = JSON.parse(input) as unknown; }
  catch { return finish([issue("invalid-json-syntax", "", "Input must be valid JSON.")]); }
  return parseDomainModelContractV1Structure(value);
}

function inspectJsonBoundary(root: unknown): ContractIssue | undefined {
  const stack: { value: unknown; path: string; depth: number; ancestors: readonly object[] }[] = [{ value: root, path: "", depth: 0, ancestors: [] }];
  let visitedNodes = 0;
  while (stack.length) {
    const { value, path, depth, ancestors } = stack.pop()!;
    visitedNodes += 1;
    if (visitedNodes > LIMITS.maxTotalValueNodes) return issue("total-node-limit-exceeded", path, `Input must not contain more than ${LIMITS.maxTotalValueNodes} total value nodes.`);
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
      for (let index = 0; index < value.length; index += 1) if (!Object.prototype.hasOwnProperty.call(value, index)) return issue("sparse-array", jsonPointer(path, index), "Sparse arrays are not supported.");
      const extra = names.find((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name));
      if (extra !== undefined) return issue("extra-array-property", jsonPointer(path, extra), "Extra array properties are not supported.");
      for (let index = value.length - 1; index >= 0; index -= 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))!;
        const childPath = jsonPointer(path, index);
        if (!descriptor.enumerable) return issue("non-enumerable-field", childPath, "Non-enumerable fields are not supported.");
        if (!("value" in descriptor)) return issue("accessor-field", childPath, "Accessor fields are not supported.");
        stack.push({ value: descriptor.value, path: childPath, depth: depth + 1, ancestors: nextAncestors });
      }
      continue;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return issue("class-instance", path, "Class instances are not supported.");
    const names = Object.getOwnPropertyNames(value);
    if (names.length > LIMITS.maxContainerEntries) return issue("container-entry-limit-exceeded", path, `Container must not contain more than ${LIMITS.maxContainerEntries} entries.`);
    for (let index = names.length - 1; index >= 0; index -= 1) {
      const name = names[index]; const descriptor = Object.getOwnPropertyDescriptor(value, name)!;
      const childPath = jsonPointer(path, name);
      if (!descriptor.enumerable) return issue("non-enumerable-field", childPath, "Non-enumerable fields are not supported.");
      if (!("value" in descriptor)) return issue("accessor-field", childPath, "Accessor fields are not supported.");
      stack.push({ value: descriptor.value, path: childPath, depth: depth + 1, ancestors: nextAncestors });
    }
  }
  return undefined;
}

function object(value: unknown, path: string, context: Context, required: readonly string[], optional: readonly string[] = []): RecordValue | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) { context.issues.push(issue("invalid-type", path, "Expected an object.")); return undefined; }
  const record = value as RecordValue; const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) context.issues.push(issue("unknown-field", jsonPointer(path, key), "Unknown field."));
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(record, key)) context.issues.push(issue("missing-required-field", jsonPointer(path, key), "Required field is missing."));
  return record;
}
function array(value: unknown, path: string, context: Context, options: { min?: number; max?: number } = {}): unknown[] | undefined {
  if (!Array.isArray(value)) { context.issues.push(issue("invalid-type", path, "Expected an array.")); return undefined; }
  if (options.min !== undefined && value.length < options.min) context.issues.push(issue("collection-too-small", path, `Array must contain at least ${options.min} item(s).`));
  if (options.max !== undefined && value.length > options.max) { context.issues.push(issue("collection-limit-exceeded", path, `Array must not contain more than ${options.max} item(s).`)); return undefined; }
  return value;
}
function string(value: unknown, path: string, context: Context): value is string {
  if (typeof value !== "string") { context.issues.push(issue("invalid-type", path, "Expected a string.")); return false; }
  if (!value.length) { context.issues.push(issue("empty-string", path, "String must not be empty.")); return false; }
  return true;
}
function id(value: unknown, path: string, context: Context): void {
  if (!string(value, path, context)) return;
  if (value.length > LIMITS.maxIdLength || !ID_PATTERN.test(value)) context.issues.push(issue("invalid-id", path, `ID must match ${ID_PATTERN.source} and contain ${LIMITS.minIdLength}-${LIMITS.maxIdLength} ASCII characters.`));
}
function number(value: unknown, path: string, context: Context, nonNegative = false): value is number {
  if (typeof value !== "number") { context.issues.push(issue("invalid-type", path, "Expected a number.")); return false; }
  if (nonNegative && value < 0) context.issues.push(issue("negative-number", path, "Number must be non-negative."));
  return true;
}
function literal(value: unknown, expected: string, path: string, context: Context): void {
  if (value !== expected) context.issues.push(issue("invalid-literal", path, `Value must equal ${JSON.stringify(expected)}.`));
}
function enumeration(value: unknown, values: readonly string[], path: string, context: Context, code = "invalid-discriminant"): value is string {
  if (typeof value !== "string" || !values.includes(value)) { context.issues.push(issue(code, path, `Value must be one of: ${values.join(", ")}.`)); return false; }
  return true;
}
function each(values: unknown[] | undefined, path: string, callback: (value: unknown, path: string) => void): void { values?.forEach((value, index) => callback(value, jsonPointer(path, index))); }

function contract(value: unknown, path: string, c: Context): void {
  const v = object(value, path, c, ["schemaVersion", "engineProtocolVersion", "identity", "semanticPayload"], ["metadata"]); if (!v) return;
  literal(v.schemaVersion, "domain-model-contract-v1", "/schemaVersion", c); literal(v.engineProtocolVersion, "pulse-domain-engine-protocol-v1", "/engineProtocolVersion", c);
  identity(v.identity, "/identity", c); payload(v.semanticPayload, "/semanticPayload", c); if ("metadata" in v) metadata(v.metadata, "/metadata", c);
}
function identity(value: unknown, path: string, c: Context): void {
  const v = object(value, path, c, ["domainId", "profileId", "modelVersion", "calibrationVersion", "semanticPayloadHash"]); if (!v) return;
  id(v.domainId, `${path}/domainId`, c); id(v.profileId, `${path}/profileId`, c); version(v.modelVersion, `${path}/modelVersion`, c); version(v.calibrationVersion, `${path}/calibrationVersion`, c);
  if (string(v.semanticPayloadHash, `${path}/semanticPayloadHash`, c) && !HASH_PATTERN.test(v.semanticPayloadHash)) c.issues.push(issue("invalid-semantic-payload-hash", `${path}/semanticPayloadHash`, "Hash must use sha256 followed by 64 lowercase hexadecimal characters."));
}
function metadata(value: unknown, path: string, c: Context): void {
  const v = object(value, path, c, [], ["name", "description", "labels"]); if (!v) return;
  for (const key of ["name", "description"] as const) if (key in v && string(v[key], `${path}/${key}`, c) && v[key].length > LIMITS.maxMetadataStringLength) c.issues.push(issue("metadata-string-limit-exceeded", `${path}/${key}`, `Metadata string must not exceed ${LIMITS.maxMetadataStringLength} characters.`));
  if ("labels" in v) {
    const labelKeys = Object.keys((v.labels && typeof v.labels === "object" && !Array.isArray(v.labels)) ? v.labels : {});
    if (labelKeys.length > LIMITS.maxMetadataLabels) { c.issues.push(issue("collection-limit-exceeded", `${path}/labels`, `Object must not contain more than ${LIMITS.maxMetadataLabels} entries.`)); return; }
    const labels = object(v.labels, `${path}/labels`, c, [], labelKeys);
    if (labels) for (const [key, label] of Object.entries(labels)) if (string(label, jsonPointer(`${path}/labels`, key), c) && label.length > LIMITS.maxMetadataStringLength) c.issues.push(issue("metadata-string-limit-exceeded", jsonPointer(`${path}/labels`, key), `Metadata string must not exceed ${LIMITS.maxMetadataStringLength} characters.`));
  }
}
function payload(value: unknown, path: string, c: Context): void {
  const v = object(value, path, c, ["scales", "drivers", "actions", "propagation", "dimensions", "curves", "constraints", "measures"]); if (!v) return;
  each(array(v.scales, `${path}/scales`, c, { min: 1, max: LIMITS.maxScales }), `${path}/scales`, (x,p)=>scale(x,p,c));
  each(array(v.drivers, `${path}/drivers`, c, { min: 1, max: LIMITS.maxDrivers }), `${path}/drivers`, (x,p)=>driver(x,p,c));
  each(array(v.actions, `${path}/actions`, c, { min: 1, max: LIMITS.maxActions }), `${path}/actions`, (x,p)=>action(x,p,c));
  propagation(v.propagation, `${path}/propagation`, c);
  each(array(v.dimensions, `${path}/dimensions`, c, { min: 1, max: LIMITS.maxDimensions }), `${path}/dimensions`, (x,p)=>dimension(x,p,c));
  each(array(v.curves, `${path}/curves`, c, { min: 1, max: LIMITS.maxCurves }), `${path}/curves`, (x,p)=>curve(x,p,c));
  each(array(v.constraints, `${path}/constraints`, c, { max: LIMITS.maxConstraints }), `${path}/constraints`, (x,p)=>constraint(x,p,c));
  each(array(v.measures, `${path}/measures`, c, { max: LIMITS.maxMeasures }), `${path}/measures`, (x,p)=>measure(x,p,c));
}
function scale(value: unknown, path: string, c: Context): void { const v=object(value,path,c,["scaleId","levels"]); if(!v)return; id(v.scaleId,`${path}/scaleId`,c); each(array(v.levels,`${path}/levels`,c,{min:1,max:LIMITS.maxLevelsPerScale}),`${path}/levels`,(x,p)=>level(x,p,c)); }
function level(value: unknown,path:string,c:Context):void { const v=object(value,path,c,["levelId","rank","anchor","materialization"]);if(!v)return;id(v.levelId,`${path}/levelId`,c);if(number(v.rank,`${path}/rank`,c,true)&&!Number.isInteger(v.rank))c.issues.push(issue("invalid-non-negative-integer",`${path}/rank`,"Rank must be a non-negative integer."));number(v.anchor,`${path}/anchor`,c);band(v.materialization,`${path}/materialization`,c); }
function band(value:unknown,path:string,c:Context):void { const v=object(value,path,c,["minimumInclusive"],["maximumExclusive","maximumInclusive"]);if(!v)return;const minimum=v.minimumInclusive;const min=number(minimum,`${path}/minimumInclusive`,c);const exclusive=v.maximumExclusive;const inclusive=v.maximumInclusive;const ex="maximumExclusive" in v&&number(exclusive,`${path}/maximumExclusive`,c);const inc="maximumInclusive" in v&&number(inclusive,`${path}/maximumInclusive`,c);if(!("maximumExclusive" in v)&&!("maximumInclusive" in v))c.issues.push(issue("missing-band-maximum",path,"Exactly one band maximum is required."));if("maximumExclusive" in v&&"maximumInclusive" in v)c.issues.push(issue("conflicting-band-maximum",path,"Only one band maximum is allowed."));const max=ex?exclusive:inc?inclusive:undefined;if(min&&typeof max==="number"&&minimum>max)c.issues.push(issue("invalid-range",path,"Minimum must not be greater than maximum.")); }
function driver(value:unknown,path:string,c:Context):void { const v=object(value,path,c,["driverId","scaleId","initial","numericRange","adverseLevelIds","impacts"]);if(!v)return;id(v.driverId,`${path}/driverId`,c);id(v.scaleId,`${path}/scaleId`,c);initial(v.initial,`${path}/initial`,c);range(v.numericRange,`${path}/numericRange`,c);each(array(v.adverseLevelIds,`${path}/adverseLevelIds`,c,{max:LIMITS.maxAdverseLevelsPerDriver}),`${path}/adverseLevelIds`,(x,p)=>id(x,p,c));each(array(v.impacts,`${path}/impacts`,c,{max:LIMITS.maxImpactsPerDriver}),`${path}/impacts`,(x,p)=>impact(x,p,c)); }
function initial(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["levelId","score"]);if(!v)return;id(v.levelId,`${path}/levelId`,c);number(v.score,`${path}/score`,c);}
function range(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["minimum","maximum"]);if(!v)return;const minimum=v.minimum,maximum=v.maximum;const a=number(minimum,`${path}/minimum`,c),b=number(maximum,`${path}/maximum`,c);if(a&&b&&minimum>maximum)c.issues.push(issue("invalid-range",path,"Minimum must not be greater than maximum."));}
function impact(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["dimensionId","direction","curveId"]);if(!v)return;id(v.dimensionId,`${path}/dimensionId`,c);enumeration(v.direction,["increase","decrease"],`${path}/direction`,c);id(v.curveId,`${path}/curveId`,c);}
function action(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["actionId","effects"]);if(!v)return;id(v.actionId,`${path}/actionId`,c);each(array(v.effects,`${path}/effects`,c,{min:1,max:LIMITS.maxEffectsPerAction}),`${path}/effects`,(x,p)=>effect(x,p,c));}
function effect(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["driverId","delta"]);if(!v)return;id(v.driverId,`${path}/driverId`,c);number(v.delta,`${path}/delta`,c);}
function propagation(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["edges","cyclePolicy","selfEdgePolicy","duplicateEdgePolicy"]);if(!v)return;each(array(v.edges,`${path}/edges`,c,{max:LIMITS.maxPropagationEdges}),`${path}/edges`,(x,p)=>edge(x,p,c));for(const key of ["cyclePolicy","selfEdgePolicy","duplicateEdgePolicy"])literal(v[key],"reject",`${path}/${key}`,c);}
function edge(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["edgeId","sourceDriverId","targetDriverId","triggerLevelIds","propagatedLevelId"]);if(!v)return;for(const key of ["edgeId","sourceDriverId","targetDriverId","propagatedLevelId"])id(v[key],`${path}/${key}`,c);each(array(v.triggerLevelIds,`${path}/triggerLevelIds`,c,{min:1,max:LIMITS.maxTriggerLevelsPerEdge}),`${path}/triggerLevelIds`,(x,p)=>id(x,p,c));}
function dimension(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["dimensionId","neutralValue"]);if(!v)return;id(v.dimensionId,`${path}/dimensionId`,c);number(v.neutralValue,`${path}/neutralValue`,c);}
function amplitudes(value:unknown,path:string,c:Context):void {if(value===null||typeof value!=="object"||Array.isArray(value)){c.issues.push(issue("invalid-type",path,"Expected an object."));return;}const keys=Object.keys(value);if(keys.length>LIMITS.maxAmplitudeEntriesPerCurve){c.issues.push(issue("collection-limit-exceeded",path,`Object must not contain more than ${LIMITS.maxAmplitudeEntriesPerCurve} entries.`));return;}for(const key of keys){const x=(value as RecordValue)[key];id(key,jsonPointer(path,key),c);if(number(x,jsonPointer(path,key),c)&&x<=0)c.issues.push(issue("invalid-amplitude",jsonPointer(path,key),"Amplitude must be greater than zero."));}}
function curve(value:unknown,path:string,c:Context):void {if(value===null||typeof value!=="object"||Array.isArray(value)){object(value,path,c,[]);return;}const raw=value as RecordValue;if(!enumeration(raw.type,["linear","exponential","logistic"],`${path}/type`,c,"unsupported-curve-type"))return;const required=raw.type==="linear"?["curveId","type","amplitudeByLevel"]:raw.type==="exponential"?["curveId","type","exponent","amplitudeByLevel"]:["curveId","type","k","x0","amplitudeByLevel"];const v=object(value,path,c,required);if(!v)return;id(v.curveId,`${path}/curveId`,c);amplitudes(v.amplitudeByLevel,`${path}/amplitudeByLevel`,c);if(raw.type==="exponential"&&number(v.exponent,`${path}/exponent`,c)&&v.exponent<=0)c.issues.push(issue("invalid-curve-parameter",`${path}/exponent`,"Exponent must be greater than zero."));if(raw.type==="logistic"){if(number(v.k,`${path}/k`,c)&&v.k===0)c.issues.push(issue("invalid-curve-parameter",`${path}/k`,"Logistic k must not be zero."));number(v.x0,`${path}/x0`,c);}}
function predicate(value:unknown,path:string,c:Context,extras:readonly string[]=[],depth=1):void {c.predicateNodes+=1;if(c.predicateNodes>LIMITS.maxPredicateNodesTotal){if(c.predicateNodes===LIMITS.maxPredicateNodesTotal+1)c.issues.push(issue("predicate-node-limit-exceeded",path,`Predicate tree must not contain more than ${LIMITS.maxPredicateNodesTotal} nodes in total.`));return;}if(depth>LIMITS.maxPredicateDepth){c.issues.push(issue("predicate-depth-limit-exceeded",path,`Predicate nesting depth must not exceed ${LIMITS.maxPredicateDepth}.`));return;}if(value===null||typeof value!=="object"||Array.isArray(value)){object(value,path,c,[]);return;}const raw=value as RecordValue;const kinds=["measure-below","driver-at-level","all","any",...extras];if(!enumeration(raw.kind,kinds,`${path}/kind`,c,"unsupported-predicate-kind"))return;if(raw.kind==="measure-below"){const v=object(value,path,c,["kind","measureId","threshold"]);if(v){id(v.measureId,`${path}/measureId`,c);number(v.threshold,`${path}/threshold`,c);}}else if(raw.kind==="driver-at-level"){const v=object(value,path,c,["kind","driverId","levelIds"]);if(v){id(v.driverId,`${path}/driverId`,c);each(array(v.levelIds,`${path}/levelIds`,c,{min:1,max:LIMITS.maxLevelsPerScale}),`${path}/levelIds`,(x,p)=>id(x,p,c));}}else if(raw.kind==="all"||raw.kind==="any"){const v=object(value,path,c,["kind","predicates"]);if(v)each(array(v.predicates,`${path}/predicates`,c,{min:1,max:LIMITS.maxPredicateNodesTotal}),`${path}/predicates`,(x,p)=>predicate(x,p,c,[],depth+1));}else object(value,path,c,["kind"]);}
function constraint(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["constraintId","initialLifecycle","activation","sustain","deactivation","allowedTransitions","activeEffects"]);if(!v)return;id(v.constraintId,`${path}/constraintId`,c);enumeration(v.initialLifecycle,["inactive","active","recovering"],`${path}/initialLifecycle`,c);predicate(v.activation,`${path}/activation`,c);predicate(v.sustain,`${path}/sustain`,c,["until-explicit-transition"]);predicate(v.deactivation,`${path}/deactivation`,c,["none"]);each(array(v.allowedTransitions,`${path}/allowedTransitions`,c,{max:LIMITS.maxAllowedTransitionsPerConstraint}),`${path}/allowedTransitions`,(x,p)=>transition(x,p,c));each(array(v.activeEffects,`${path}/activeEffects`,c,{max:LIMITS.maxActiveEffectsPerConstraint}),`${path}/activeEffects`,(x,p)=>activeEffect(x,p,c));}
function transition(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["from","to"]);if(!v)return;enumeration(v.from,["inactive","active","recovering"],`${path}/from`,c);enumeration(v.to,["inactive","active","recovering"],`${path}/to`,c);}
function activeEffect(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["dimensionId","operation","value"]);if(!v)return;id(v.dimensionId,`${path}/dimensionId`,c);literal(v.operation,"multiply",`${path}/operation`,c);number(v.value,`${path}/value`,c);}
function measure(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["measureId","kind","updateOperator","initialValue","terms","recovery","range","escalationRules"]);if(!v)return;id(v.measureId,`${path}/measureId`,c);literal(v.kind,"weighted-signal-aggregate-v1",`${path}/kind`,c);literal(v.updateOperator,"subtract-terms-add-recovery-v1",`${path}/updateOperator`,c);number(v.initialValue,`${path}/initialValue`,c);const terms=array(v.terms,`${path}/terms`,c,{min:1,max:LIMITS.maxMeasureTermsPerMeasure});c.measureTerms+=terms?.length??0;each(terms,`${path}/terms`,(x,p)=>term(x,p,c));recovery(v.recovery,`${path}/recovery`,c);range(v.range,`${path}/range`,c);each(array(v.escalationRules,`${path}/escalationRules`,c,{max:LIMITS.maxEscalationRulesPerMeasure}),`${path}/escalationRules`,(x,p)=>escalation(x,p,c));}
function term(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["termId","source","transform","weight"]);if(!v)return;id(v.termId,`${path}/termId`,c);source(v.source,`${path}/source`,c);enumeration(v.transform,["identity","deviation-from-neutral","positive-deviation-from-neutral","inverse-from-neutral"],`${path}/transform`,c,"unsupported-transform");number(v.weight,`${path}/weight`,c);}
function source(value:unknown,path:string,c:Context):void {if(value===null||typeof value!=="object"||Array.isArray(value)){object(value,path,c,[]);return;}const raw=value as RecordValue;if(!enumeration(raw.kind,["dimension","aggregate-driver-pressure","current-measure-value","measure","protocol-signal"],`${path}/kind`,c,"unsupported-measure-source-kind"))return;const fields:Record<string,string[]>={dimension:["kind","dimensionId","stage"],"aggregate-driver-pressure":["kind","driverIds"],"current-measure-value":["kind"],measure:["kind","measureId"],"protocol-signal":["kind","signalId"]};const v=object(value,path,c,fields[String(raw.kind)]);if(!v)return;if(raw.kind==="dimension"){id(v.dimensionId,`${path}/dimensionId`,c);enumeration(v.stage,["base","after-constraints"],`${path}/stage`,c);}else if(raw.kind==="aggregate-driver-pressure")each(array(v.driverIds,`${path}/driverIds`,c,{min:1,max:LIMITS.maxDrivers}),`${path}/driverIds`,(x,p)=>id(x,p,c));else if(raw.kind==="measure")id(v.measureId,`${path}/measureId`,c);else if(raw.kind==="protocol-signal")literal(v.signalId,"base-dimension-pressure-sum-v1",`${path}/signalId`,c);}
function recovery(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["targetValue","pull"]);if(!v)return;number(v.targetValue,`${path}/targetValue`,c);number(v.pull,`${path}/pull`,c,true);}
function escalation(value:unknown,path:string,c:Context):void {const v=object(value,path,c,["whenBelow","driverId","transitions"]);if(!v)return;number(v.whenBelow,`${path}/whenBelow`,c);id(v.driverId,`${path}/driverId`,c);each(array(v.transitions,`${path}/transitions`,c,{max:LIMITS.maxEscalationTransitionsPerRule}),`${path}/transitions`,(x,p)=>{const t=object(x,p,c,["fromLevelId","toLevelId"]);if(t){id(t.fromLevelId,`${p}/fromLevelId`,c);id(t.toLevelId,`${p}/toLevelId`,c);}});}

function version(value: unknown, path: string, c: Context): void { if (string(value, path, c) && value.length > LIMITS.maxVersionStringLength) c.issues.push(issue("version-string-limit-exceeded", path, `Version string must not exceed ${LIMITS.maxVersionStringLength} characters.`)); }

function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const nested of Object.values(value as RecordValue)) deepFreeze(nested); } return value; }
