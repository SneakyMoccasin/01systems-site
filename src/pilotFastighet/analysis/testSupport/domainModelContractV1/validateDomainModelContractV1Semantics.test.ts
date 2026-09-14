/* eslint-disable @typescript-eslint/no-explicit-any -- semantic rejection cases intentionally mutate fixture-shaped values */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import { parseDomainModelContractV1Structure } from "./parseDomainModelContractV1Structure";
import { DOMAIN_MODEL_CONTRACT_V1_SEMANTIC_ISSUE_CODES, deriveSupportedActionIdsV1, validateDomainModelContractV1Semantics } from "./validateDomainModelContractV1Semantics";

const fixtureText = readFileSync(new URL("./fixtures/synthetic-domain-model-contract-v1.json", import.meta.url), "utf8");
const fresh = (): any => JSON.parse(fixtureText);
const codeUnitCompare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

function validate(value: any) {
  const structural = parseDomainModelContractV1Structure(value);
  assert.equal(structural.ok, true, structural.ok ? undefined : JSON.stringify(structural.issues));
  if (!structural.ok) throw new Error("Expected structurally valid test input");
  return validateDomainModelContractV1Semantics(structural.value);
}
function expectIssue(value: any, code: string, path?: string) {
  const result = validate(value); assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected semantic rejection");
  assert.ok(result.issues.some((entry) => entry.code === code && (path === undefined || entry.path === path)), `Expected ${code}${path ? ` at ${path}` : ""}: ${JSON.stringify(result.issues)}`);
  return result.issues;
}
function addSecondMeasure(value: any) {
  const copy = structuredClone(value.semanticPayload.measures[0]); copy.measureId = "reserve";
  copy.terms = [{ termId: "reserve-input", source: { kind: "current-measure-value" }, transform: "identity", weight: 1 }];
  copy.escalationRules = []; value.semanticPayload.measures.push(copy); return copy;
}
function useThreeLevelScale(value: any) {
  const levels = value.semanticPayload.scales[0].levels;
  levels[0].materialization.maximumExclusive = 0.33;
  levels.splice(1, 0, { levelId: "moderate", rank: 1, anchor: 0.5, materialization: { minimumInclusive: 0.33, maximumExclusive: 0.66 } });
  levels[2].rank = 2; levels[2].materialization.minimumInclusive = 0.66;
  for (const curve of value.semanticPayload.curves) curve.amplitudeByLevel.moderate = 1.1;
}

test("accepts the synthetic contract, derives actions, detaches, and recursively freezes", () => {
  const input = fresh(); const before = structuredClone(input); const result = validate(input);
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.deepEqual(input, before); assert.notEqual(result.value, input);
  assert.deepEqual(deriveSupportedActionIdsV1(result.value), ["adjust-alpha", "adjust-beta"]);
  input.identity.domainId = "changed"; assert.equal(result.value.identity.domainId, "synthetic-systems-lab");
  const stack: unknown[] = [result.value]; while (stack.length) { const value = stack.pop(); if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); stack.push(...Object.values(value)); } }
});

test("rejects duplicate IDs in every stable namespace and reports both paths", () => {
  const cases: readonly [string, (x: any) => void, string][] = [
    ["scales", (x) => x.semanticPayload.scales.push(structuredClone(x.semanticPayload.scales[0])), "/semanticPayload/scales/1/scaleId"],
    ["levels", (x) => x.semanticPayload.scales[0].levels.push(structuredClone(x.semanticPayload.scales[0].levels[0])), "/semanticPayload/scales/0/levels/2/levelId"],
    ["drivers", (x) => x.semanticPayload.drivers.push(structuredClone(x.semanticPayload.drivers[0])), "/semanticPayload/drivers/2/driverId"],
    ["actions", (x) => x.semanticPayload.actions.push(structuredClone(x.semanticPayload.actions[0])), "/semanticPayload/actions/2/actionId"],
    ["edges", (x) => x.semanticPayload.propagation.edges.push(structuredClone(x.semanticPayload.propagation.edges[0])), "/semanticPayload/propagation/edges/1/edgeId"],
    ["dimensions", (x) => x.semanticPayload.dimensions.push(structuredClone(x.semanticPayload.dimensions[0])), "/semanticPayload/dimensions/2/dimensionId"],
    ["curves", (x) => x.semanticPayload.curves.push(structuredClone(x.semanticPayload.curves[0])), "/semanticPayload/curves/3/curveId"],
    ["constraints", (x) => x.semanticPayload.constraints.push(structuredClone(x.semanticPayload.constraints[0])), "/semanticPayload/constraints/1/constraintId"],
    ["measures", (x) => x.semanticPayload.measures.push(structuredClone(x.semanticPayload.measures[0])), "/semanticPayload/measures/1/measureId"],
    ["terms", (x) => x.semanticPayload.measures[0].terms.push(structuredClone(x.semanticPayload.measures[0].terms[0])), "/semanticPayload/measures/0/terms/2/termId"],
  ];
  for (const [name, mutate, secondPath] of cases) { const input = fresh(); mutate(input); const issues = expectIssue(input, name === "terms" ? "duplicate-term-id" : "duplicate-id", secondPath); assert.equal(issues.filter((entry) => entry.code === (name === "terms" ? "duplicate-term-id" : "duplicate-id")).length >= 2, true, name); }
});

test("resolves driver, scale, level, dimension, curve, and measure references at exact paths", () => {
  const cases: readonly [string, string, (x: any) => void][] = [
    ["unknown-scale-reference", "/semanticPayload/drivers/0/scaleId", (x) => { x.semanticPayload.drivers[0].scaleId = "missing"; }],
    ["unknown-level-reference", "/semanticPayload/drivers/0/initial/levelId", (x) => { x.semanticPayload.drivers[0].initial.levelId = "missing"; }],
    ["unknown-driver-reference", "/semanticPayload/actions/0/effects/0/driverId", (x) => { x.semanticPayload.actions[0].effects[0].driverId = "missing"; }],
    ["unknown-driver-reference", "/semanticPayload/propagation/edges/0/sourceDriverId", (x) => { x.semanticPayload.propagation.edges[0].sourceDriverId = "missing"; }],
    ["unknown-level-reference", "/semanticPayload/propagation/edges/0/triggerLevelIds/0", (x) => { x.semanticPayload.propagation.edges[0].triggerLevelIds[0] = "missing"; }],
    ["unknown-level-reference", "/semanticPayload/propagation/edges/0/propagatedLevelId", (x) => { x.semanticPayload.propagation.edges[0].propagatedLevelId = "missing"; }],
    ["unknown-dimension-reference", "/semanticPayload/drivers/0/impacts/0/dimensionId", (x) => { x.semanticPayload.drivers[0].impacts[0].dimensionId = "missing"; }],
    ["missing-curve-reference", "/semanticPayload/drivers/0/impacts/0/curveId", (x) => { x.semanticPayload.drivers[0].impacts[0].curveId = "missing"; }],
    ["unknown-measure-reference", "/semanticPayload/constraints/0/activation/predicates/1/predicates/0/measureId", (x) => { x.semanticPayload.constraints[0].activation.predicates[1].predicates[0].measureId = "missing"; }],
    ["unknown-driver-reference", "/semanticPayload/constraints/0/activation/predicates/0/driverId", (x) => { x.semanticPayload.constraints[0].activation.predicates[0].driverId = "missing"; }],
    ["unknown-dimension-reference", "/semanticPayload/constraints/0/activeEffects/0/dimensionId", (x) => { x.semanticPayload.constraints[0].activeEffects[0].dimensionId = "missing"; }],
    ["unknown-dimension-reference", "/semanticPayload/measures/0/terms/0/source/dimensionId", (x) => { x.semanticPayload.measures[0].terms[0].source.dimensionId = "missing"; }],
    ["unknown-driver-reference", "/semanticPayload/measures/0/terms/1/source/driverIds/0", (x) => { x.semanticPayload.measures[0].terms[1].source.driverIds[0] = "missing"; }],
    ["unknown-driver-reference", "/semanticPayload/measures/0/escalationRules/0/driverId", (x) => { x.semanticPayload.measures[0].escalationRules[0].driverId = "missing"; }],
  ];
  for (const [code, path, mutate] of cases) { const input = fresh(); mutate(input); expectIssue(input, code, path); }
});

test("rejects propagation self edges, duplicate pairs, and deterministic multi-edge cycles", () => {
  const self = fresh(); self.semanticPayload.propagation.edges[0].targetDriverId = "input-alpha"; expectIssue(self, "propagation-self-edge");
  const duplicate = fresh(); const duplicateEdge = structuredClone(duplicate.semanticPayload.propagation.edges[0]); duplicateEdge.edgeId = "second-alpha-beta"; duplicate.semanticPayload.propagation.edges.push(duplicateEdge); expectIssue(duplicate, "duplicate-propagation-edge");
  const cycle = fresh(); cycle.semanticPayload.propagation.edges.push({ edgeId: "beta-to-alpha", sourceDriverId: "input-beta", targetDriverId: "input-alpha", triggerLevelIds: ["high"], propagatedLevelId: "high" }); expectIssue(cycle, "propagation-cycle");
});

test("rejects measure self-reference and indirect dependency cycles", () => {
  const self = fresh(); self.semanticPayload.measures[0].terms[0].source = { kind: "measure", measureId: "balance" }; expectIssue(self, "measure-self-reference", "/semanticPayload/measures/0/terms/0/source/measureId");
  const cycle = fresh(); const reserve = addSecondMeasure(cycle); cycle.semanticPayload.measures[0].terms[0].source = { kind: "measure", measureId: "reserve" }; reserve.terms[0].source = { kind: "measure", measureId: "balance" }; expectIssue(cycle, "measure-dependency-cycle");
});

test("enforces rank order, gap-free half-open bands, exact ranges, and initial materialization", () => {
  const cases: readonly [string, (x: any) => void][] = [
    ["duplicate-rank", (x) => { x.semanticPayload.scales[0].levels[1].rank = 0; }],
    ["non-contiguous-rank", (x) => { x.semanticPayload.scales[0].levels[1].rank = 2; }],
    ["rank-order-mismatch", (x) => { x.semanticPayload.scales[0].levels.reverse(); }],
    ["materialization-gap", (x) => { x.semanticPayload.scales[0].levels[1].materialization.minimumInclusive = 0.6; }],
    ["materialization-overlap", (x) => { x.semanticPayload.scales[0].levels[1].materialization.minimumInclusive = 0.4; }],
    ["invalid-band-endpoint", (x) => { const band=x.semanticPayload.scales[0].levels[0].materialization; band.maximumInclusive=band.maximumExclusive; delete band.maximumExclusive; }],
    ["scale-range-mismatch", (x) => { x.semanticPayload.drivers[0].numericRange.minimum = -1; }],
    ["initial-level-score-mismatch", (x) => { x.semanticPayload.drivers[0].initial.score = 0.75; }],
    ["scale-anchor-materialization-mismatch", (x) => { x.semanticPayload.scales[0].levels[0].anchor = -1; }],
  ];
  for (const [code, mutate] of cases) { const input = fresh(); mutate(input); expectIssue(input, code); }
});

test("requires every anchor to materialize to its own band, including unused scales", () => {
  const below = fresh(); below.semanticPayload.scales[0].levels[1].anchor = 0.4;
  expectIssue(below, "scale-anchor-materialization-mismatch", "/semanticPayload/scales/0/levels/1/anchor");

  const above = fresh(); above.semanticPayload.scales[0].levels[0].anchor = 0.75;
  expectIssue(above, "scale-anchor-materialization-mismatch", "/semanticPayload/scales/0/levels/0/anchor");

  const exclusive = fresh(); exclusive.semanticPayload.scales[0].levels[0].anchor = 0.5;
  expectIssue(exclusive, "scale-anchor-materialization-mismatch", "/semanticPayload/scales/0/levels/0/anchor");

  const inclusive = fresh(); inclusive.semanticPayload.scales[0].levels[1].anchor = 1;
  assert.equal(validate(inclusive).ok, true);

  const unused = fresh(); const scale = structuredClone(unused.semanticPayload.scales[0]); scale.scaleId = "unused-state"; scale.levels[1].anchor = 0.25; unused.semanticPayload.scales.push(scale);
  expectIssue(unused, "scale-anchor-materialization-mismatch", "/semanticPayload/scales/1/levels/1/anchor");
});

test("distinguishes missing curves structurally from unsupported curve discriminants and validates amplitudes", () => {
  const missing = fresh(); missing.semanticPayload.drivers[0].impacts[0].curveId = "absent"; expectIssue(missing, "missing-curve-reference");
  const unsupported = fresh(); unsupported.semanticPayload.curves[0].type = "quadratic"; const structural = parseDomainModelContractV1Structure(unsupported); assert.equal(structural.ok, false); if (!structural.ok) assert.ok(structural.issues.some((entry) => entry.code === "unsupported-curve-type"));
  const incomplete = fresh(); delete incomplete.semanticPayload.curves[0].amplitudeByLevel.high; expectIssue(incomplete, "missing-curve-amplitude", "/semanticPayload/curves/0/amplitudeByLevel/high");
  const unknown = fresh(); unknown.semanticPayload.curves[0].amplitudeByLevel.medium = 1; expectIssue(unknown, "unknown-curve-level", "/semanticPayload/curves/0/amplitudeByLevel/medium");
});

test("curve instances are driver-owned and reusable only within one driver", () => {
  const sameScale = fresh(); sameScale.semanticPayload.drivers[1].impacts[0].curveId = "linear-response";
  expectIssue(sameScale, "curve-shared-across-drivers", "/semanticPayload/drivers/1/impacts/0/curveId");

  const overlappingLevels = fresh(); const scale = structuredClone(overlappingLevels.semanticPayload.scales[0]); scale.scaleId = "other-state"; overlappingLevels.semanticPayload.scales.push(scale); overlappingLevels.semanticPayload.drivers[1].scaleId = "other-state"; overlappingLevels.semanticPayload.drivers[1].impacts[0].curveId = "linear-response";
  expectIssue(overlappingLevels, "curve-shared-across-drivers", "/semanticPayload/drivers/1/impacts/0/curveId");

  const differentLevels = fresh(); const other = structuredClone(differentLevels.semanticPayload.scales[0]); other.scaleId = "other-state"; other.levels[0].levelId = "cold"; other.levels[1].levelId = "hot"; differentLevels.semanticPayload.scales.push(other);
  const beta = differentLevels.semanticPayload.drivers[1]; beta.scaleId = "other-state"; beta.initial.levelId = "hot"; beta.adverseLevelIds = ["cold"];
  differentLevels.semanticPayload.propagation.edges[0].propagatedLevelId = "hot";
  for (const curveId of ["exponential-response", "logistic-response"]) { const curve = differentLevels.semanticPayload.curves.find((entry: any) => entry.curveId === curveId); curve.amplitudeByLevel = { cold: 1, hot: 1.2 }; }
  beta.impacts[0].curveId = "linear-response";
  expectIssue(differentLevels, "curve-shared-across-drivers", "/semanticPayload/drivers/1/impacts/0/curveId");

  const withinDriver = fresh(); withinDriver.semanticPayload.drivers[0].impacts.push({ dimensionId: "stability", direction: "decrease", curveId: "linear-response" });
  assert.equal(validate(withinDriver).ok, true);
});

test("driver impacts are unique by dimension regardless of direction or curve", () => {
  const exact = fresh(); exact.semanticPayload.drivers[0].impacts.push(structuredClone(exact.semanticPayload.drivers[0].impacts[0]));
  expectIssue(exact, "duplicate-driver-impact", "/semanticPayload/drivers/0/impacts/1/dimensionId");

  const otherDirection = fresh(); const reversed = structuredClone(otherDirection.semanticPayload.drivers[0].impacts[0]); reversed.direction = "decrease"; otherDirection.semanticPayload.drivers[0].impacts.push(reversed);
  expectIssue(otherDirection, "duplicate-driver-impact", "/semanticPayload/drivers/0/impacts/1/dimensionId");

  const otherCurve = fresh(); const curve = structuredClone(otherCurve.semanticPayload.curves[0]); curve.curveId = "linear-response-alt"; otherCurve.semanticPayload.curves.push(curve); const alternate = structuredClone(otherCurve.semanticPayload.drivers[0].impacts[0]); alternate.curveId = "linear-response-alt"; otherCurve.semanticPayload.drivers[0].impacts.push(alternate);
  expectIssue(otherCurve, "duplicate-driver-impact", "/semanticPayload/drivers/0/impacts/1/dimensionId");

  const differentDimensions = fresh(); differentDimensions.semanticPayload.drivers[0].impacts.push({ dimensionId: "stability", direction: "decrease", curveId: "linear-response" });
  assert.equal(validate(differentDimensions).ok, true);

  const crossDriver = fresh(); crossDriver.semanticPayload.drivers[1].impacts[0].curveId = "linear-response";
  expectIssue(crossDriver, "curve-shared-across-drivers", "/semanticPayload/drivers/1/impacts/0/curveId");
});

test("validates recursive constraint predicates, transitions, effects, and activation consistency", () => {
  const badLevel = fresh(); badLevel.semanticPayload.constraints[0].activation.predicates[0].levelIds[0] = "missing"; expectIssue(badLevel, "unknown-level-reference");
  const duplicate = fresh(); duplicate.semanticPayload.constraints[0].allowedTransitions.push(structuredClone(duplicate.semanticPayload.constraints[0].allowedTransitions[0])); expectIssue(duplicate, "duplicate-lifecycle-transition");
  const self = fresh(); self.semanticPayload.constraints[0].allowedTransitions[0].to = "inactive"; expectIssue(self, "lifecycle-self-transition");
  const noActivation = fresh(); noActivation.semanticPayload.constraints[0].allowedTransitions = [{ from: "active", to: "recovering" }]; expectIssue(noActivation, "missing-activation-transition");
  const noEffects = fresh(); noEffects.semanticPayload.constraints[0].activeEffects = []; expectIssue(noEffects, "missing-active-effect");
  const threshold = fresh(); threshold.semanticPayload.constraints[0].activation.predicates[1].predicates[0].threshold = -2; expectIssue(threshold, "predicate-threshold-out-of-range");
});

test("lifecycle activation-path rule is narrow for inactive and adds no policy for active or recovering", () => {
  const inactive = fresh(); inactive.semanticPayload.constraints[0].allowedTransitions = [];
  expectIssue(inactive, "missing-activation-transition", "/semanticPayload/constraints/0/allowedTransitions");
  for (const lifecycle of ["active", "recovering"]) { const input = fresh(); input.semanticPayload.constraints[0].initialLifecycle = lifecycle; input.semanticPayload.constraints[0].allowedTransitions = []; assert.equal(validate(input).ok, true, lifecycle); }
});

test("validates measure ranges, escalation levels, direction, duplicates, and source references", () => {
  const range = fresh(); range.semanticPayload.measures[0].range.minimum = 1; expectIssue(range, "invalid-measure-range");
  const threshold = fresh(); threshold.semanticPayload.measures[0].escalationRules[0].whenBelow = -2; expectIssue(threshold, "escalation-threshold-out-of-range");
  const unknown = fresh(); unknown.semanticPayload.measures[0].escalationRules[0].transitions[0].toLevelId = "missing"; expectIssue(unknown, "unknown-level-reference");
  const backwards = fresh(); const transition=backwards.semanticPayload.measures[0].escalationRules[0].transitions[0]; transition.fromLevelId="high"; transition.toLevelId="low"; expectIssue(backwards, "invalid-escalation-transition");
  const duplicate = fresh(); duplicate.semanticPayload.measures[0].escalationRules[0].transitions.push(structuredClone(duplicate.semanticPayload.measures[0].escalationRules[0].transitions[0])); expectIssue(duplicate, "duplicate-level-transition");
  const unknownMeasure = fresh(); const reserve = addSecondMeasure(unknownMeasure); reserve.terms[0].source = { kind: "measure", measureId: "missing" }; expectIssue(unknownMeasure, "unknown-measure-reference");
  const duplicateRule = fresh(); duplicateRule.semanticPayload.measures[0].escalationRules.push(structuredClone(duplicateRule.semanticPayload.measures[0].escalationRules[0])); expectIssue(duplicateRule, "duplicate-escalation-rule");
});

test("escalation transitions are a deterministic partial function from source level", () => {
  const identical = fresh(); identical.semanticPayload.measures[0].escalationRules[0].transitions.push(structuredClone(identical.semanticPayload.measures[0].escalationRules[0].transitions[0]));
  const identicalIssues = expectIssue(identical, "duplicate-level-transition", "/semanticPayload/measures/0/escalationRules/0/transitions/1/fromLevelId");
  assert.ok(identicalIssues.some((entry) => entry.code === "duplicate-level-transition" && entry.path === "/semanticPayload/measures/0/escalationRules/0/transitions/0/fromLevelId"));

  const branching = fresh(); useThreeLevelScale(branching); branching.semanticPayload.measures[0].escalationRules[0].transitions = [
    { fromLevelId: "low", toLevelId: "moderate" },
    { fromLevelId: "low", toLevelId: "high" },
  ];
  expectIssue(branching, "duplicate-level-transition", "/semanticPayload/measures/0/escalationRules/0/transitions/1/fromLevelId");

  const chain = fresh(); useThreeLevelScale(chain); chain.semanticPayload.measures[0].escalationRules[0].transitions = [
    { fromLevelId: "low", toLevelId: "moderate" },
    { fromLevelId: "moderate", toLevelId: "high" },
  ];
  assert.equal(validate(chain).ok, true);
  chain.semanticPayload.measures[0].escalationRules[0].transitions.reverse();
  assert.equal(validate(chain).ok, true);
});

test("every publicly reachable semantic issue code has exact-path negative coverage", () => {
  type Case = Readonly<{ code: string; path: string; mutate: (input: any) => void }>;
  const cases: readonly Case[] = [
    { code: "duplicate-id", path: "/semanticPayload/actions/2/actionId", mutate: (x) => x.semanticPayload.actions.push(structuredClone(x.semanticPayload.actions[0])) },
    { code: "duplicate-rank", path: "/semanticPayload/scales/0/levels/1/rank", mutate: (x) => { x.semanticPayload.scales[0].levels[1].rank = 0; } },
    { code: "non-contiguous-rank", path: "/semanticPayload/scales/0/levels/1/rank", mutate: (x) => { x.semanticPayload.scales[0].levels[1].rank = 2; } },
    { code: "rank-order-mismatch", path: "/semanticPayload/scales/0/levels/0/rank", mutate: (x) => x.semanticPayload.scales[0].levels.reverse() },
    { code: "invalid-band-endpoint", path: "/semanticPayload/scales/0/levels/0/materialization", mutate: (x) => { const band=x.semanticPayload.scales[0].levels[0].materialization; band.maximumInclusive=band.maximumExclusive; delete band.maximumExclusive; } },
    { code: "invalid-band-endpoint", path: "/semanticPayload/scales/0/levels/1/materialization", mutate: (x) => { const band=x.semanticPayload.scales[0].levels[1].materialization; band.maximumExclusive=band.maximumInclusive; delete band.maximumInclusive; } },
    { code: "invalid-materialization-band", path: "/semanticPayload/scales/0/levels/0/materialization", mutate: (x) => { x.semanticPayload.scales[0].levels[0].materialization.maximumExclusive = 0; } },
    { code: "scale-anchor-materialization-mismatch", path: "/semanticPayload/scales/0/levels/0/anchor", mutate: (x) => { x.semanticPayload.scales[0].levels[0].anchor = 0.5; } },
    { code: "materialization-gap", path: "/semanticPayload/scales/0/levels/1/materialization/minimumInclusive", mutate: (x) => { x.semanticPayload.scales[0].levels[1].materialization.minimumInclusive = 0.6; } },
    { code: "materialization-overlap", path: "/semanticPayload/scales/0/levels/1/materialization/minimumInclusive", mutate: (x) => { x.semanticPayload.scales[0].levels[1].materialization.minimumInclusive = 0.4; } },
    { code: "unknown-scale-reference", path: "/semanticPayload/drivers/0/scaleId", mutate: (x) => { x.semanticPayload.drivers[0].scaleId = "missing"; } },
    { code: "duplicate-level-reference", path: "/semanticPayload/drivers/0/adverseLevelIds/1", mutate: (x) => x.semanticPayload.drivers[0].adverseLevelIds.push("high") },
    { code: "unknown-level-reference", path: "/semanticPayload/drivers/0/initial/levelId", mutate: (x) => { x.semanticPayload.drivers[0].initial.levelId = "missing"; } },
    { code: "invalid-numeric-range", path: "/semanticPayload/drivers/0/numericRange", mutate: (x) => { x.semanticPayload.drivers[0].numericRange.maximum = 0; } },
    { code: "initial-score-out-of-range", path: "/semanticPayload/drivers/0/initial/score", mutate: (x) => { x.semanticPayload.drivers[0].initial.score = 2; } },
    { code: "scale-range-mismatch", path: "/semanticPayload/drivers/0/numericRange/minimum", mutate: (x) => { x.semanticPayload.drivers[0].numericRange.minimum = -1; } },
    { code: "initial-level-score-mismatch", path: "/semanticPayload/drivers/0/initial/levelId", mutate: (x) => { x.semanticPayload.drivers[0].initial.score = 0.75; } },
    { code: "duplicate-driver-impact", path: "/semanticPayload/drivers/0/impacts/1/dimensionId", mutate: (x) => x.semanticPayload.drivers[0].impacts.push(structuredClone(x.semanticPayload.drivers[0].impacts[0])) },
    { code: "unknown-dimension-reference", path: "/semanticPayload/drivers/0/impacts/0/dimensionId", mutate: (x) => { x.semanticPayload.drivers[0].impacts[0].dimensionId = "missing"; } },
    { code: "missing-curve-reference", path: "/semanticPayload/drivers/0/impacts/0/curveId", mutate: (x) => { x.semanticPayload.drivers[0].impacts[0].curveId = "missing"; } },
    { code: "duplicate-action-effect", path: "/semanticPayload/actions/0/effects/1/driverId", mutate: (x) => x.semanticPayload.actions[0].effects.push(structuredClone(x.semanticPayload.actions[0].effects[0])) },
    { code: "unknown-driver-reference", path: "/semanticPayload/actions/0/effects/0/driverId", mutate: (x) => { x.semanticPayload.actions[0].effects[0].driverId = "missing"; } },
    { code: "duplicate-propagation-edge", path: "/semanticPayload/propagation/edges/1/targetDriverId", mutate: (x) => { const edge=structuredClone(x.semanticPayload.propagation.edges[0]); edge.edgeId="duplicate-edge"; x.semanticPayload.propagation.edges.push(edge); } },
    { code: "propagation-self-edge", path: "/semanticPayload/propagation/edges/0/targetDriverId", mutate: (x) => { x.semanticPayload.propagation.edges[0].targetDriverId = "input-alpha"; } },
    { code: "propagation-cycle", path: "/semanticPayload/propagation/edges/1", mutate: (x) => x.semanticPayload.propagation.edges.push({ edgeId:"beta-to-alpha", sourceDriverId:"input-beta", targetDriverId:"input-alpha", triggerLevelIds:["high"], propagatedLevelId:"high" }) },
    { code: "curve-shared-across-drivers", path: "/semanticPayload/drivers/1/impacts/0/curveId", mutate: (x) => { x.semanticPayload.drivers[1].impacts[0].curveId = "linear-response"; } },
    { code: "missing-curve-amplitude", path: "/semanticPayload/curves/0/amplitudeByLevel/high", mutate: (x) => { delete x.semanticPayload.curves[0].amplitudeByLevel.high; } },
    { code: "unknown-curve-level", path: "/semanticPayload/curves/0/amplitudeByLevel/medium", mutate: (x) => { x.semanticPayload.curves[0].amplitudeByLevel.medium = 1; } },
    { code: "unknown-measure-reference", path: "/semanticPayload/constraints/0/activation/predicates/1/predicates/0/measureId", mutate: (x) => { x.semanticPayload.constraints[0].activation.predicates[1].predicates[0].measureId = "missing"; } },
    { code: "predicate-threshold-out-of-range", path: "/semanticPayload/constraints/0/activation/predicates/1/predicates/0/threshold", mutate: (x) => { x.semanticPayload.constraints[0].activation.predicates[1].predicates[0].threshold = -2; } },
    { code: "duplicate-lifecycle-transition", path: "/semanticPayload/constraints/0/allowedTransitions/1", mutate: (x) => x.semanticPayload.constraints[0].allowedTransitions.push(structuredClone(x.semanticPayload.constraints[0].allowedTransitions[0])) },
    { code: "lifecycle-self-transition", path: "/semanticPayload/constraints/0/allowedTransitions/0/to", mutate: (x) => { x.semanticPayload.constraints[0].allowedTransitions[0].to = "inactive"; } },
    { code: "missing-activation-transition", path: "/semanticPayload/constraints/0/allowedTransitions", mutate: (x) => { x.semanticPayload.constraints[0].allowedTransitions = []; } },
    { code: "missing-active-effect", path: "/semanticPayload/constraints/0/activeEffects", mutate: (x) => { x.semanticPayload.constraints[0].activeEffects = []; } },
    { code: "duplicate-active-effect", path: "/semanticPayload/constraints/0/activeEffects/1/dimensionId", mutate: (x) => x.semanticPayload.constraints[0].activeEffects.push(structuredClone(x.semanticPayload.constraints[0].activeEffects[0])) },
    { code: "invalid-measure-range", path: "/semanticPayload/measures/0/range", mutate: (x) => { x.semanticPayload.measures[0].range.minimum = 1; } },
    { code: "measure-value-out-of-range", path: "/semanticPayload/measures/0/initialValue", mutate: (x) => { x.semanticPayload.measures[0].initialValue = 2; } },
    { code: "measure-value-out-of-range", path: "/semanticPayload/measures/0/recovery/targetValue", mutate: (x) => { x.semanticPayload.measures[0].recovery.targetValue = 2; } },
    { code: "duplicate-term-id", path: "/semanticPayload/measures/0/terms/2/termId", mutate: (x) => x.semanticPayload.measures[0].terms.push(structuredClone(x.semanticPayload.measures[0].terms[0])) },
    { code: "duplicate-driver-reference", path: "/semanticPayload/measures/0/terms/1/source/driverIds/2", mutate: (x) => x.semanticPayload.measures[0].terms[1].source.driverIds.push("input-alpha") },
    { code: "measure-self-reference", path: "/semanticPayload/measures/0/terms/0/source/measureId", mutate: (x) => { x.semanticPayload.measures[0].terms[0].source = { kind:"measure", measureId:"balance" }; } },
    { code: "duplicate-escalation-rule", path: "/semanticPayload/measures/0/escalationRules/1", mutate: (x) => x.semanticPayload.measures[0].escalationRules.push(structuredClone(x.semanticPayload.measures[0].escalationRules[0])) },
    { code: "escalation-threshold-out-of-range", path: "/semanticPayload/measures/0/escalationRules/0/whenBelow", mutate: (x) => { x.semanticPayload.measures[0].escalationRules[0].whenBelow = -2; } },
    { code: "duplicate-level-transition", path: "/semanticPayload/measures/0/escalationRules/0/transitions/1/fromLevelId", mutate: (x) => x.semanticPayload.measures[0].escalationRules[0].transitions.push(structuredClone(x.semanticPayload.measures[0].escalationRules[0].transitions[0])) },
    { code: "invalid-escalation-transition", path: "/semanticPayload/measures/0/escalationRules/0/transitions/0", mutate: (x) => { const transition=x.semanticPayload.measures[0].escalationRules[0].transitions[0]; transition.fromLevelId="high"; transition.toLevelId="low"; } },
    { code: "measure-dependency-cycle", path: "/semanticPayload/measures/1/terms/0/source/measureId", mutate: (x) => { const reserve=addSecondMeasure(x); x.semanticPayload.measures[0].terms[0].source={kind:"measure",measureId:"reserve"}; reserve.terms[0].source={kind:"measure",measureId:"balance"}; } },
  ];
  assert.deepEqual([...new Set(cases.map(({ code }) => code))].sort(codeUnitCompare), [...DOMAIN_MODEL_CONTRACT_V1_SEMANTIC_ISSUE_CODES].sort(codeUnitCompare));
  for (const { code, path, mutate } of cases) { const input=fresh(); mutate(input); expectIssue(input, code, path); }
});

test("issues are sorted by path, code, message and stable under set-like input permutations", () => {
  const first = fresh(); first.semanticPayload.actions[0].effects[0].driverId = "missing-alpha"; first.semanticPayload.actions[1].effects[0].driverId = "missing-beta";
  const second = fresh(); second.semanticPayload.actions.reverse(); second.semanticPayload.actions[0].effects[0].driverId = "missing-beta"; second.semanticPayload.actions[1].effects[0].driverId = "missing-alpha";
  const one = validate(first); const two = validate(second); assert.equal(one.ok, false); assert.equal(two.ok, false); if (one.ok || two.ok) return;
  const compareIssues = (a: { path: string; code: string; message: string }, b: { path: string; code: string; message: string }) => codeUnitCompare(a.path, b.path) || codeUnitCompare(a.code, b.code) || codeUnitCompare(a.message, b.message);
  for (const result of [one, two]) assert.deepEqual(result.issues, [...result.issues].sort(compareIssues));
  const project = (result: typeof one) => result.ok ? [] : result.issues.map(({code,message})=>({code,message})).sort((a,b)=>codeUnitCompare(a.message,b.message));
  assert.deepEqual(project(one), project(two));
  assert.deepEqual(validate(first), validate(first));
});

test("semantic traversal remains bounded at the exact M1B-1 limits", () => {
  const input = fresh(); input.semanticPayload.measures[0].terms = Array.from({ length: LIMITS.maxMeasureTermsPerMeasure }, (_, index) => ({ termId: `term-${index}`, source: { kind: "current-measure-value" }, transform: "identity", weight: 1 }));
  input.semanticPayload.propagation.edges = [];
  const result = validate(input); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
});
