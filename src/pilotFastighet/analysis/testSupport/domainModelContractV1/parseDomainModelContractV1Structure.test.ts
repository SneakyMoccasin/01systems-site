/* eslint-disable @typescript-eslint/no-explicit-any -- hostile-input tests intentionally mutate untyped JSON shapes */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import { jsonPointer } from "./contractV1Issues";
import { parseDomainModelContractV1Structure, parseDomainModelContractV1StructureJson } from "./parseDomainModelContractV1Structure";

const fixtureUrl = new URL("./fixtures/synthetic-domain-model-contract-v1.json", import.meta.url);
const fixtureText = readFileSync(fixtureUrl, "utf8");
const fresh = (): any => JSON.parse(fixtureText);

function expectIssue(value: unknown, code: string, path?: string) {
  const result = parseDomainModelContractV1Structure(value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected rejection");
  const found = result.issues.find((entry) => entry.code === code && (path === undefined || entry.path === path));
  assert.ok(found, `Expected ${code}${path === undefined ? "" : ` at ${path}`}: ${JSON.stringify(result.issues)}`);
}

test("accepts the synthetic fixture through equivalent string and in-memory boundaries", () => {
  const fromString = parseDomainModelContractV1StructureJson(fixtureText);
  const fromValue = parseDomainModelContractV1Structure(fresh());
  assert.equal(fromString.ok, true); assert.equal(fromValue.ok, true);
  if (!fromString.ok || !fromValue.ok) return;
  assert.deepEqual(fromString.value, fromValue.value);
  assert.equal(fromString.value.identity.domainId, "synthetic-systems-lab");
  assert.ok(fromString.value.metadata);
  assert.equal("metadata" in fromString.value.semanticPayload, false);
});

test("does not mutate input and returns a detached recursively frozen result", () => {
  const input = fresh(); const before = structuredClone(input);
  const result = parseDomainModelContractV1Structure(input); assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(input, before); assert.notEqual(result.value, input);
  input.identity.domainId = "changed";
  assert.equal(result.value.identity.domainId, "synthetic-systems-lab");
  const visit = (value: unknown): void => { if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); Object.values(value).forEach(visit); } };
  visit(result.value);
});

test("sorts independent issues deterministically by path, code, then message", () => {
  const input = fresh(); input.zzz = true; input.identity.domainId = " Bad "; input.aaa = true;
  const first = parseDomainModelContractV1Structure(input); const second = parseDomainModelContractV1Structure(input);
  assert.deepEqual(first, second); assert.equal(first.ok, false);
  if (first.ok) return;
  assert.deepEqual(first.issues.map((entry) => entry.path), ["/aaa", "/identity/domainId", "/zzz"]);
});

test("uses RFC 6901 paths including escaped unknown keys", () => {
  assert.equal(jsonPointer("/metadata/labels", "a~/b"), "/metadata/labels/a~0~1b");
  const input = fresh(); input.semanticPayload.drivers[0]["bad~/key"] = true;
  expectIssue(input, "unknown-field", "/semanticPayload/drivers/0/bad~0~1key");
});

test("rejects unknown and missing fields across important closed object levels", () => {
  const locations: readonly ((input: any) => any)[] = [
    (x) => x, (x) => x.identity, (x) => x.semanticPayload, (x) => x.metadata,
    (x) => x.semanticPayload.scales[0], (x) => x.semanticPayload.scales[0].levels[0],
    (x) => x.semanticPayload.scales[0].levels[0].materialization, (x) => x.semanticPayload.drivers[0],
    (x) => x.semanticPayload.drivers[0].initial, (x) => x.semanticPayload.drivers[0].numericRange,
    (x) => x.semanticPayload.drivers[0].impacts[0], (x) => x.semanticPayload.actions[0],
    (x) => x.semanticPayload.actions[0].effects[0], (x) => x.semanticPayload.propagation,
    (x) => x.semanticPayload.propagation.edges[0], (x) => x.semanticPayload.dimensions[0],
    (x) => x.semanticPayload.curves[0], (x) => x.semanticPayload.constraints[0],
    (x) => x.semanticPayload.constraints[0].activation, (x) => x.semanticPayload.constraints[0].allowedTransitions[0],
    (x) => x.semanticPayload.constraints[0].activeEffects[0], (x) => x.semanticPayload.measures[0],
    (x) => x.semanticPayload.measures[0].terms[0], (x) => x.semanticPayload.measures[0].terms[0].source,
    (x) => x.semanticPayload.measures[0].recovery, (x) => x.semanticPayload.measures[0].range,
    (x) => x.semanticPayload.measures[0].escalationRules[0], (x) => x.semanticPayload.measures[0].escalationRules[0].transitions[0],
  ];
  for (const locate of locations) { const input = fresh(); locate(input).unexpected = true; expectIssue(input, "unknown-field"); }
  const missingCases: readonly [((input: any) => any), string][] = [
    [(x) => x, "identity"], [(x) => x.identity, "domainId"], [(x) => x.semanticPayload, "drivers"],
    [(x) => x.semanticPayload.scales[0], "scaleId"], [(x) => x.semanticPayload.drivers[0], "initial"],
    [(x) => x.semanticPayload.actions[0], "effects"], [(x) => x.semanticPayload.propagation.edges[0], "edgeId"],
    [(x) => x.semanticPayload.curves[0], "amplitudeByLevel"], [(x) => x.semanticPayload.constraints[0], "activation"],
    [(x) => x.semanticPayload.measures[0], "terms"], [(x) => x.semanticPayload.measures[0].terms[0], "source"],
  ];
  for (const [locate, key] of missingCases) { const input = fresh(); delete locate(input)[key]; expectIssue(input, "missing-required-field"); }
});

test("rejects wrong containers, primitives, empty required strings, and exact versions", () => {
  const cases: readonly [((x: any) => void), string][] = [
    [(x) => { x.identity = null; }, "invalid-type"], [(x) => { x.identity = []; }, "invalid-type"],
    [(x) => { x.semanticPayload.actions = {}; }, "invalid-type"], [(x) => { x.identity.modelVersion = ""; }, "empty-string"],
    [(x) => { x.schemaVersion = "v1"; }, "invalid-literal"], [(x) => { x.engineProtocolVersion = "v2"; }, "invalid-literal"],
    [(x) => { x.semanticPayload.actions[0].effects[0].delta = "1"; }, "invalid-type"],
  ];
  for (const [mutate, code] of cases) { const input = fresh(); mutate(input); expectIssue(input, code); }
});

test("rejects invalid IDs without trimming, case folding, or Unicode normalization", () => {
  for (const invalid of [" alpha", "alpha ", "Alpha", "räv", "a/b", "a~b", "a".repeat(97)]) {
    const input = fresh(); input.identity.domainId = invalid; expectIssue(input, "invalid-id", "/identity/domainId");
  }
});

test("rejects all closed discriminants and locally invalid numeric rules", () => {
  const cases: readonly [((x: any) => void), string, string?][] = [
    [(x) => { x.semanticPayload.curves[0].type = "quadratic"; }, "unsupported-curve-type"],
    [(x) => { x.semanticPayload.constraints[0].activation.kind = "not"; }, "unsupported-predicate-kind"],
    [(x) => { x.semanticPayload.measures[0].terms[0].source.kind = "formula"; }, "unsupported-measure-source-kind"],
    [(x) => { x.semanticPayload.measures[0].terms[0].transform = "script"; }, "unsupported-transform"],
    [(x) => { x.semanticPayload.measures[0].updateOperator = "eval"; }, "invalid-literal"],
    [(x) => { x.semanticPayload.constraints[0].initialLifecycle = "paused"; }, "invalid-discriminant"],
    [(x) => { x.semanticPayload.constraints[0].activeEffects[0].operation = "add"; }, "invalid-literal"],
    [(x) => { x.semanticPayload.drivers[0].numericRange.minimum = 2; }, "invalid-range"],
    [(x) => { x.semanticPayload.curves[1].exponent = 0; }, "invalid-curve-parameter"],
    [(x) => { x.semanticPayload.curves[2].k = 0; }, "invalid-curve-parameter"],
    [(x) => { x.semanticPayload.curves[0].amplitudeByLevel.low = 0; }, "invalid-amplitude"],
    [(x) => { x.semanticPayload.measures[0].recovery.pull = -1; }, "negative-number"],
  ];
  for (const [mutate, code] of cases) { const input = fresh(); mutate(input); expectIssue(input, code); }
});

test("enforces required non-empty collections", () => {
  for (const mutate of [
    (x:any)=>{x.semanticPayload.scales=[];}, (x:any)=>{x.semanticPayload.drivers=[];},
    (x:any)=>{x.semanticPayload.actions=[];}, (x:any)=>{x.semanticPayload.dimensions=[];},
    (x:any)=>{x.semanticPayload.curves=[];}, (x:any)=>{x.semanticPayload.actions[0].effects=[];},
    (x:any)=>{x.semanticPayload.measures[0].terms=[];}, (x:any)=>{x.semanticPayload.propagation.edges[0].triggerLevelIds=[];},
  ]) { const input=fresh(); mutate(input); expectIssue(input,"collection-too-small"); }
});

test("rejects every non-JSON in-memory boundary case without throwing", () => {
  const values: unknown[] = [undefined, BigInt(1), ()=>1, Symbol("x"), Number.NaN, Infinity, -Infinity, -0];
  for (const value of values) { const input=fresh(); input.identity.modelVersion=value; assert.doesNotThrow(()=>parseDomainModelContractV1Structure(input)); expectIssue(input, typeof value === "number" ? (Object.is(value,-0)?"negative-zero":"non-finite-number") : `unsupported-${typeof value}`); }
  const symbolKey=fresh(); symbolKey[Symbol("x")]=1; expectIssue(symbolKey,"symbol-key");
  const accessor=fresh(); Object.defineProperty(accessor.identity,"x",{enumerable:true,get:()=>1}); expectIssue(accessor,"accessor-field");
  const hidden=fresh(); Object.defineProperty(hidden.identity,"x",{enumerable:false,value:1}); expectIssue(hidden,"non-enumerable-field");
  const instance=fresh(); instance.identity=new (class Identity {})(); expectIssue(instance,"class-instance");
  const sparse=fresh(); sparse.semanticPayload.actions=new Array(1); expectIssue(sparse,"sparse-array");
  const extra=fresh(); extra.semanticPayload.actions.note=true; expectIssue(extra,"extra-array-property");
  const cycle=fresh(); cycle.self=cycle; expectIssue(cycle,"cyclic-reference");
});

test("rejects array index descriptors without executing getters", () => {
  let getterCalls = 0;
  const accessor: unknown[] = [];
  Object.defineProperty(accessor, "0", { enumerable: true, configurable: true, get: () => { getterCalls += 1; return fresh(); } });
  Object.defineProperty(accessor, "length", { value: 1 });
  assert.doesNotThrow(() => parseDomainModelContractV1Structure(accessor));
  expectIssue(accessor, "accessor-field", "/0");
  assert.equal(getterCalls, 0);

  const hidden: unknown[] = [];
  Object.defineProperty(hidden, "0", { enumerable: false, configurable: true, value: fresh() });
  Object.defineProperty(hidden, "length", { value: 1 });
  expectIssue(hidden, "non-enumerable-field", "/0");

  const nested = fresh();
  Object.defineProperty(nested.semanticPayload.actions, "0", { enumerable: true, configurable: true, get: () => { getterCalls += 1; return {}; } });
  assert.doesNotThrow(() => parseDomainModelContractV1Structure(nested));
  expectIssue(nested, "accessor-field", "/semanticPayload/actions/0");
  assert.equal(getterCalls, 0);
});

test("raw JSON rejects decoded duplicate keys within their exact object scope", () => {
  const cases: readonly [string, string][] = [
    ['{"a":1,"a":2}', "/a"],
    ['{"outer":{"same":1,"same":2}}', "/outer/same"],
    ['{"a":1,"\\u0061":2}', "/a"],
    ['{"a/b":1,"a\\/b":2}', "/a~1b"],
    ['{"a~b":1,"a\\u007eb":2}', "/a~0b"],
  ];
  for (const [raw, path] of cases) {
    const result = parseDomainModelContractV1StructureJson(raw);
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.issues, [{ code: "duplicate-object-key", path, message: "Object key must be unique within its object." }]);
  }
});

test("raw JSON scanner respects sibling scopes, strings, escapes, arrays, and syntax", () => {
  const allowed = [
    '{"left":{"same":1},"right":{"same":2}}',
    '{"text":"{\\"a\\":1,\\"a\\":2}"}',
    '{"quoted\\\"key":1,"slash\\\\key":2}',
    '[{"same":1},{"same":2}]',
  ];
  for (const raw of allowed) {
    const result = parseDomainModelContractV1StructureJson(raw);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.issues.some((entry) => entry.code === "duplicate-object-key"), false);
  }
  const malformed = parseDomainModelContractV1StructureJson('{"a":1,}');
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.deepEqual(malformed.issues, [{ code: "invalid-json-syntax", path: "", message: "Input must be valid JSON." }]);
});

test("raw JSON depth short-circuits safely at 10,000 nesting levels", () => {
  const raw = `${"[".repeat(10_000)}0${"]".repeat(10_000)}`;
  const expected = [{
    code: "nesting-depth-limit-exceeded",
    path: "/0".repeat(LIMITS.maxNestingDepth + 1),
    message: `Nesting depth must not exceed ${LIMITS.maxNestingDepth}.`,
  }];
  let first: ReturnType<typeof parseDomainModelContractV1StructureJson> | undefined;
  let second: ReturnType<typeof parseDomainModelContractV1StructureJson> | undefined;
  assert.doesNotThrow(() => { first = parseDomainModelContractV1StructureJson(raw); });
  assert.doesNotThrow(() => { second = parseDomainModelContractV1StructureJson(raw); });
  assert.deepEqual(first, { ok: false, issues: expected });
  assert.deepEqual(second, first);
});

test("handles malformed JSON, UTF-8 bytes, and hostile depth deterministically", () => {
  const malformed=parseDomainModelContractV1StructureJson("{"); assert.equal(malformed.ok,false); if(!malformed.ok) assert.deepEqual(malformed.issues,[{code:"invalid-json-syntax",path:"",message:"Input must be valid JSON."}]);
  const oversized=parseDomainModelContractV1StructureJson(`"${"å".repeat(Math.ceil(LIMITS.maxUtf8Bytes/2))}"`); assert.equal(oversized.ok,false); if(!oversized.ok) assert.equal(oversized.issues[0].code,"input-size-limit-exceeded");
  let deep:any={}; for(let i=0;i<LIMITS.maxNestingDepth+2;i++) deep={next:deep}; expectIssue(deep,"nesting-depth-limit-exceeded");
});

test("enforces every locked collection count limit", () => {
  const cases: readonly [((x:any)=>void), string][] = [
    [(x)=>{x.semanticPayload.drivers=Array(LIMITS.maxDrivers+1).fill(x.semanticPayload.drivers[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.actions=Array(LIMITS.maxActions+1).fill(x.semanticPayload.actions[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.actions[0].effects=Array(LIMITS.maxEffectsPerAction+1).fill(x.semanticPayload.actions[0].effects[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.propagation.edges=Array(LIMITS.maxPropagationEdges+1).fill(x.semanticPayload.propagation.edges[0]);}, "container-entry-limit-exceeded"],
    [(x)=>{x.semanticPayload.curves=Array(LIMITS.maxCurves+1).fill(x.semanticPayload.curves[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.constraints=Array(LIMITS.maxConstraints+1).fill(x.semanticPayload.constraints[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.measures=Array(LIMITS.maxMeasures+1).fill(x.semanticPayload.measures[0]);}, "collection-limit-exceeded"],
    [(x)=>{x.semanticPayload.measures[0].terms=Array(LIMITS.maxMeasureTermsPerMeasure+1).fill(x.semanticPayload.measures[0].terms[0]);}, "collection-limit-exceeded"],
  ];
  for(const [mutate, code] of cases){const input=fresh();mutate(input);expectIssue(input,code);}
  const total=fresh(); total.semanticPayload.measures=Array(5).fill(0).map((_,i)=>({...total.semanticPayload.measures[0],measureId:`measure-${i}`,terms:Array(60).fill(0).map((__,j)=>({...total.semanticPayload.measures[0].terms[0],termId:`term-${i}-${j}`}))})); expectIssue(total,"collection-limit-exceeded","/semanticPayload/measures");
});

test("enforces numeric magnitude and metadata string limits", () => {
  const numeric=fresh(); numeric.semanticPayload.actions[0].effects[0].delta=LIMITS.maxAbsoluteNumber+1; expectIssue(numeric,"numeric-magnitude-limit-exceeded");
  const metadata=fresh(); metadata.metadata.name="x".repeat(LIMITS.maxMetadataStringLength+1); expectIssue(metadata,"metadata-string-limit-exceeded","/metadata/name");
});

test("enforces every added collection resource limit", () => {
  const repeated = (value: unknown, count: number) => Array(count).fill(0).map(() => structuredClone(value));
  const cases: readonly [string, (x:any)=>void][] = [
    ["maxScales", (x)=>{x.semanticPayload.scales=repeated(x.semanticPayload.scales[0],LIMITS.maxScales+1);}],
    ["maxLevelsPerScale", (x)=>{x.semanticPayload.scales[0].levels=repeated(x.semanticPayload.scales[0].levels[0],LIMITS.maxLevelsPerScale+1);}],
    ["maxDimensions", (x)=>{x.semanticPayload.dimensions=repeated(x.semanticPayload.dimensions[0],LIMITS.maxDimensions+1);}],
    ["maxImpactsPerDriver", (x)=>{x.semanticPayload.drivers[0].impacts=repeated(x.semanticPayload.drivers[0].impacts[0],LIMITS.maxImpactsPerDriver+1);}],
    ["maxAdverseLevelsPerDriver", (x)=>{x.semanticPayload.drivers[0].adverseLevelIds=Array(LIMITS.maxAdverseLevelsPerDriver+1).fill("high");}],
    ["maxTriggerLevelsPerEdge", (x)=>{x.semanticPayload.propagation.edges[0].triggerLevelIds=Array(LIMITS.maxTriggerLevelsPerEdge+1).fill("high");}],
    ["maxAllowedTransitionsPerConstraint", (x)=>{x.semanticPayload.constraints[0].allowedTransitions=repeated(x.semanticPayload.constraints[0].allowedTransitions[0],LIMITS.maxAllowedTransitionsPerConstraint+1);}],
    ["maxActiveEffectsPerConstraint", (x)=>{x.semanticPayload.constraints[0].activeEffects=repeated(x.semanticPayload.constraints[0].activeEffects[0],LIMITS.maxActiveEffectsPerConstraint+1);}],
    ["maxEscalationRulesPerMeasure", (x)=>{x.semanticPayload.measures[0].escalationRules=repeated(x.semanticPayload.measures[0].escalationRules[0],LIMITS.maxEscalationRulesPerMeasure+1);}],
    ["maxEscalationTransitionsPerRule", (x)=>{x.semanticPayload.measures[0].escalationRules[0].transitions=repeated(x.semanticPayload.measures[0].escalationRules[0].transitions[0],LIMITS.maxEscalationTransitionsPerRule+1);}],
  ];
  for (const [name, mutate] of cases) { const input=fresh(); mutate(input); const result=parseDomainModelContractV1Structure(input); assert.equal(result.ok,false,name); if(!result.ok)assert.ok(result.issues.some((entry)=>entry.code==="collection-limit-exceeded"),name); }

  const amplitudes=fresh(); amplitudes.semanticPayload.curves[0].amplitudeByLevel=Object.fromEntries(Array(LIMITS.maxAmplitudeEntriesPerCurve+1).fill(0).map((_,i)=>[`level-${i}`,1])); expectIssue(amplitudes,"collection-limit-exceeded","/semanticPayload/curves/0/amplitudeByLevel");
  const labels=fresh(); labels.metadata.labels=Object.fromEntries(Array(LIMITS.maxMetadataLabels+1).fill(0).map((_,i)=>[`label-${i}`,"Label"])); expectIssue(labels,"collection-limit-exceeded","/metadata/labels");
});

test("enforces predicate node, predicate depth, version string, and integer rank limits", () => {
  const nodes=fresh(); nodes.semanticPayload.constraints[0].activation={kind:"all",predicates:Array(50).fill(0).map(()=>({kind:"all",predicates:Array(50).fill(0).map(()=>({kind:"measure-below",measureId:"balance",threshold:0}))}))}; expectIssue(nodes,"predicate-node-limit-exceeded");
  const depth=fresh(); let nested:any={kind:"measure-below",measureId:"balance",threshold:0}; for(let i=0;i<LIMITS.maxPredicateDepth;i++)nested={kind:"all",predicates:[nested]}; depth.semanticPayload.constraints[0].activation=nested; expectIssue(depth,"predicate-depth-limit-exceeded");
  const version=fresh(); version.identity.modelVersion="v".repeat(LIMITS.maxVersionStringLength+1); expectIssue(version,"version-string-limit-exceeded","/identity/modelVersion");
  const rank=fresh(); rank.semanticPayload.scales[0].levels[0].rank=0.5; expectIssue(rank,"invalid-non-negative-integer","/semanticPayload/scales/0/levels/0/rank");
});

test("schema collection limits stop descendant traversal", () => {
  const actions=fresh(); actions.semanticPayload.actions=Array(LIMITS.maxActions+1).fill(0).map(()=>structuredClone(actions.semanticPayload.actions[0])); actions.semanticPayload.actions[LIMITS.maxActions]="invalid-descendant";
  const actionResult=parseDomainModelContractV1Structure(actions); assert.deepEqual(actionResult,{ok:false,issues:[{code:"collection-limit-exceeded",path:"/semanticPayload/actions",message:`Array must not contain more than ${LIMITS.maxActions} item(s).`}]});

  const amplitudes=fresh(); amplitudes.semanticPayload.curves[0].amplitudeByLevel=Object.fromEntries(Array(LIMITS.maxAmplitudeEntriesPerCurve+1).fill(0).map((_,i)=>[`level-${i}`,i===LIMITS.maxAmplitudeEntriesPerCurve?"invalid-descendant":1]));
  const amplitudeResult=parseDomainModelContractV1Structure(amplitudes); assert.deepEqual(amplitudeResult,{ok:false,issues:[{code:"collection-limit-exceeded",path:"/semanticPayload/curves/0/amplitudeByLevel",message:`Object must not contain more than ${LIMITS.maxAmplitudeEntriesPerCurve} entries.`}]});

  const labels=fresh(); labels.metadata.labels=Object.fromEntries(Array(LIMITS.maxMetadataLabels+1).fill(0).map((_,i)=>[`label-${i}`,i===LIMITS.maxMetadataLabels?1:"Label"]));
  const labelResult=parseDomainModelContractV1Structure(labels); assert.deepEqual(labelResult,{ok:false,issues:[{code:"collection-limit-exceeded",path:"/metadata/labels",message:`Object must not contain more than ${LIMITS.maxMetadataLabels} entries.`}]});
});

test("global boundary limits short-circuit before later descriptors and nodes", () => {
  let getterCalls=0;
  const oversized: unknown[] = Array(LIMITS.maxContainerEntries+1).fill(null);
  Object.defineProperty(oversized,String(LIMITS.maxContainerEntries),{enumerable:true,configurable:true,get:()=>{getterCalls+=1;return undefined;}});
  const containerResult=parseDomainModelContractV1Structure(oversized);
  assert.deepEqual(containerResult,{ok:false,issues:[{code:"container-entry-limit-exceeded",path:"",message:`Container must not contain more than ${LIMITS.maxContainerEntries} entries.`}]});
  assert.equal(getterCalls,0);

  const wide: unknown[] = Array(101).fill(0).map(()=>Array(1_000).fill(null));
  wide[100]=[undefined];
  let first: ReturnType<typeof parseDomainModelContractV1Structure> | undefined;
  let second: ReturnType<typeof parseDomainModelContractV1Structure> | undefined;
  assert.doesNotThrow(()=>{first=parseDomainModelContractV1Structure(wide);});
  assert.doesNotThrow(()=>{second=parseDomainModelContractV1Structure(wide);});
  assert.equal(first?.ok,false); if(first&&!first.ok){assert.equal(first.issues.length,1);assert.equal(first.issues[0].code,"total-node-limit-exceeded");}
  assert.deepEqual(second,first);
});

test("aggregate driver references stop above maxDrivers and accept the exact boundary", () => {
  const over=fresh(); over.semanticPayload.measures[0].terms[1].source.driverIds=Array(LIMITS.maxDrivers+1).fill("input-alpha");
  const overResult=parseDomainModelContractV1Structure(over); assert.deepEqual(overResult,{ok:false,issues:[{code:"collection-limit-exceeded",path:"/semanticPayload/measures/0/terms/1/source/driverIds",message:`Array must not contain more than ${LIMITS.maxDrivers} item(s).`}]});
  const exact=fresh(); exact.semanticPayload.measures[0].terms[1].source.driverIds=Array(LIMITS.maxDrivers).fill("input-alpha");
  assert.equal(parseDomainModelContractV1Structure(exact).ok,true);
});
