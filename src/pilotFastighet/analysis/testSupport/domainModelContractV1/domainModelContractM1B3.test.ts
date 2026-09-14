/* eslint-disable @typescript-eslint/no-explicit-any -- permutation tests deliberately edit JSON-shaped inputs before strict parsing */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalizeBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { SemanticHashVerifiedDomainModelContractV1 } from "./contractV1";
import { canonicalPredicateKeyV1, projectCanonicalPredicateV1 } from "./canonicalPredicateV1";
import {
  canonicalizeDomainModelContractSemanticIdentityV1,
  hashDomainModelContractSemanticIdentityV1,
  projectDomainModelContractSemanticIdentityV1,
} from "./domainModelContractSemanticIdentityV1";
import {
  parseDomainModelContractV1,
  parseDomainModelContractV1Json,
} from "./parseDomainModelContractV1";
import { parseDomainModelContractV1Structure } from "./parseDomainModelContractV1Structure";
import { validateDomainModelContractIdentityCollisionsV1 } from "./validateDomainModelContractIdentityCollisionsV1";
import { validateDomainModelContractV1Semantics } from "./validateDomainModelContractV1Semantics";

const fixtureText = readFileSync(new URL("./fixtures/synthetic-domain-model-contract-v1.json", import.meta.url), "utf8");
const fresh = (): any => JSON.parse(fixtureText);
const EXPECTED_HASH = "sha256:1fbecc460b0e0203386224e0b824aa4c766a42c5e7cd261c2e2827dffb8443f6";

function semantic(input: any) {
  const structural = parseDomainModelContractV1Structure(input);
  assert.equal(structural.ok, true, structural.ok ? undefined : JSON.stringify(structural.issues));
  if (!structural.ok) throw new Error("structural failure");
  const result = validateDomainModelContractV1Semantics(structural.value);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("semantic failure");
  return result.value;
}

function verified(input: any): SemanticHashVerifiedDomainModelContractV1 {
  input.identity.semanticPayloadHash = hashDomainModelContractSemanticIdentityV1(semantic(input));
  const result = parseDomainModelContractV1(input);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("verification failure");
  return result.value;
}

function richPermutationFixture(): any {
  const input = fresh();
  const payload = input.semanticPayload;
  const levels = payload.scales[0].levels;
  levels[0].materialization.maximumExclusive = 0.33;
  levels.splice(1, 0, { levelId: "moderate", rank: 1, anchor: 0.5, materialization: { minimumInclusive: 0.33, maximumExclusive: 0.66 } });
  levels[2].rank = 2; levels[2].materialization.minimumInclusive = 0.66;
  payload.curves.forEach((curve: any) => { curve.amplitudeByLevel.moderate = 1.05; });
  const secondScale = structuredClone(payload.scales[0]); secondScale.scaleId = "state-z"; payload.scales.push(secondScale);
  payload.drivers[0].adverseLevelIds = ["high", "moderate"];
  payload.drivers[0].impacts.push({ dimensionId: "stability", direction: "decrease", curveId: "linear-response" });
  const thirdDriver = structuredClone(payload.drivers[0]); thirdDriver.driverId = "input-gamma"; thirdDriver.impacts = []; payload.drivers.push(thirdDriver);
  payload.actions[0].effects.push({ driverId: "input-beta", delta: 0.2 });
  payload.propagation.edges[0].triggerLevelIds = ["high", "moderate"];
  payload.propagation.edges.push({ edgeId: "beta-to-gamma", sourceDriverId: "input-beta", targetDriverId: "input-gamma", triggerLevelIds: ["moderate", "high"], propagatedLevelId: "high" });
  const constraint = payload.constraints[0];
  constraint.activation.predicates[1].predicates.push({ kind: "measure-below", measureId: "balance", threshold: 0.5 });
  constraint.allowedTransitions.push({ from: "active", to: "recovering" });
  constraint.activeEffects.push({ dimensionId: "output", operation: "multiply", value: 0.95 });
  const secondConstraint = structuredClone(constraint); secondConstraint.constraintId = "stability-guard-z"; payload.constraints.push(secondConstraint);
  const measure = payload.measures[0];
  measure.escalationRules[0].transitions = [{ fromLevelId: "low", toLevelId: "moderate" }, { fromLevelId: "moderate", toLevelId: "high" }];
  measure.escalationRules.push({ whenBelow: 0.2, driverId: "input-beta", transitions: [{ fromLevelId: "low", toLevelId: "high" }] });
  const secondMeasure = structuredClone(measure); secondMeasure.measureId = "reserve"; secondMeasure.escalationRules = []; payload.measures.push(secondMeasure);
  assert.equal(validateDomainModelContractV1Semantics(parseStructure(input)).ok, true);
  return input;
}

function parseStructure(input: any) {
  const result = parseDomainModelContractV1Structure(input);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("structural failure");
  return result.value;
}

function reverseObjectInsertion(value: any): any {
  if (Array.isArray(value)) return value.map(reverseObjectInsertion);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectInsertion(child)]));
  return value;
}

test("canonical predicate projection implements the locked recursive rules without mutation", () => {
  const a = { kind: "measure-below" as const, measureId: "balance", threshold: 0.2 };
  const b = { kind: "driver-at-level" as const, driverId: "input-alpha", levelIds: ["low", "high"] };
  const c = { kind: "measure-below" as const, measureId: "balance", threshold: 0.3 };
  const before = structuredClone(b);
  assert.equal(canonicalPredicateKeyV1({ kind: "all", predicates: [a, b] }), canonicalPredicateKeyV1({ kind: "all", predicates: [b, a] }));
  assert.equal(canonicalPredicateKeyV1({ kind: "any", predicates: [a, b] }), canonicalPredicateKeyV1({ kind: "any", predicates: [b, a] }));
  assert.notEqual(canonicalPredicateKeyV1({ kind: "all", predicates: [a, b] }), canonicalPredicateKeyV1({ kind: "any", predicates: [a, b] }));
  assert.notEqual(canonicalPredicateKeyV1({ kind: "all", predicates: [a, { kind: "all", predicates: [b, c] }] }), canonicalPredicateKeyV1({ kind: "all", predicates: [a, b, c] }));
  assert.notEqual(canonicalPredicateKeyV1(a), canonicalPredicateKeyV1({ ...a, threshold: 0.3 }));
  assert.deepEqual(projectCanonicalPredicateV1(b), { kind: "driver-at-level", driverId: "input-alpha", levelIds: ["high", "low"] });
  assert.deepEqual(b, before);
});

test("fixture locks the explicit projection bytes, hash, parser boundaries, and repeatability", () => {
  const input = fresh();
  const value = semantic(input);
  const projection = projectDomainModelContractSemanticIdentityV1(value);
  const bytes = canonicalizeDomainModelContractSemanticIdentityV1(value);
  assert.deepEqual(Object.keys(projection), ["schemaVersion", "engineProtocolVersion", "identity", "semanticPayload"]);
  assert.deepEqual(Object.keys(projection.identity), ["domainId", "profileId", "modelVersion", "calibrationVersion"]);
  assert.equal("semanticPayloadHash" in projection.identity, false); assert.equal("metadata" in projection, false);
  assert.equal(bytes, canonicalizeBaselineValueV1(projection, "$domainModelContractSemanticIdentityV1"));
  assert.equal(hashDomainModelContractSemanticIdentityV1(value), EXPECTED_HASH);
  assert.equal(hashDomainModelContractSemanticIdentityV1(value), hashDomainModelContractSemanticIdentityV1(value));
  assert.equal(input.identity.semanticPayloadHash, EXPECTED_HASH);
  for (const parsed of [parseDomainModelContractV1(input), parseDomainModelContractV1Json(fixtureText)]) assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.issues));
});

const permutationCases: readonly Readonly<{ name: string; reverse: (input: any) => void }>[] = [
  { name: "scales by scaleId", reverse: (x) => x.semanticPayload.scales.reverse() },
  { name: "drivers by driverId", reverse: (x) => x.semanticPayload.drivers.reverse() },
  { name: "adverseLevelIds lexically", reverse: (x) => x.semanticPayload.drivers[0].adverseLevelIds.reverse() },
  { name: "driver impacts by stable identity", reverse: (x) => x.semanticPayload.drivers[0].impacts.reverse() },
  { name: "actions by actionId", reverse: (x) => x.semanticPayload.actions.reverse() },
  { name: "action effects by driverId", reverse: (x) => x.semanticPayload.actions[0].effects.reverse() },
  { name: "propagation edges by stable tuple", reverse: (x) => x.semanticPayload.propagation.edges.reverse() },
  { name: "triggerLevelIds lexically", reverse: (x) => x.semanticPayload.propagation.edges[0].triggerLevelIds.reverse() },
  { name: "dimensions by dimensionId", reverse: (x) => x.semanticPayload.dimensions.reverse() },
  { name: "curves by curveId", reverse: (x) => x.semanticPayload.curves.reverse() },
  { name: "constraints by constraintId", reverse: (x) => x.semanticPayload.constraints.reverse() },
  { name: "lifecycle transitions by from and to", reverse: (x) => x.semanticPayload.constraints[0].allowedTransitions.reverse() },
  { name: "active effects by dimensionId", reverse: (x) => x.semanticPayload.constraints[0].activeEffects.reverse() },
  { name: "measures by measureId", reverse: (x) => x.semanticPayload.measures.reverse() },
  { name: "measure terms by termId", reverse: (x) => x.semanticPayload.measures[0].terms.reverse() },
  { name: "aggregate driver references lexically", reverse: (x) => x.semanticPayload.measures[0].terms[1].source.driverIds.reverse() },
  { name: "escalation rules by driverId and whenBelow", reverse: (x) => x.semanticPayload.measures[0].escalationRules.reverse() },
  { name: "escalation transitions by fromLevelId", reverse: (x) => x.semanticPayload.measures[0].escalationRules[0].transitions.reverse() },
  { name: "all children by canonical predicate key", reverse: (x) => x.semanticPayload.constraints[0].activation.predicates.reverse() },
  { name: "any children by canonical predicate key", reverse: (x) => x.semanticPayload.constraints[0].activation.predicates[1].predicates.reverse() },
];

for (const permutationCase of permutationCases) test(`canonicalizes ${permutationCase.name} independently of author order`, () => {
  const original = richPermutationFixture(); const permuted = structuredClone(original); permutationCase.reverse(permuted);
  const originalBefore = structuredClone(original); const permutedBefore = structuredClone(permuted);
  const originalValue = semantic(original); const permutedValue = semantic(permuted);
  assert.deepEqual(projectDomainModelContractSemanticIdentityV1(originalValue), projectDomainModelContractSemanticIdentityV1(permutedValue));
  assert.equal(canonicalizeDomainModelContractSemanticIdentityV1(originalValue), canonicalizeDomainModelContractSemanticIdentityV1(permutedValue));
  assert.equal(hashDomainModelContractSemanticIdentityV1(originalValue), hashDomainModelContractSemanticIdentityV1(permutedValue));
  assert.deepEqual(original, originalBefore); assert.deepEqual(permuted, permutedBefore);
});

test("object insertion order remains hash-neutral", () => {
  const original = fresh(); const reordered = reverseObjectInsertion(original);
  assert.equal(hashDomainModelContractSemanticIdentityV1(semantic(original)), hashDomainModelContractSemanticIdentityV1(semantic(reordered)));
});

test("semantic changes affect hash while metadata-only changes do not, and rank order is preserved", () => {
  const base = fresh(); const metadata = fresh(); metadata.metadata.name = "Presentation only";
  const changed = fresh(); changed.semanticPayload.measures[0].recovery.pull = 0.2;
  assert.equal(hashDomainModelContractSemanticIdentityV1(semantic(base)), hashDomainModelContractSemanticIdentityV1(semantic(metadata)));
  assert.notEqual(hashDomainModelContractSemanticIdentityV1(semantic(base)), hashDomainModelContractSemanticIdentityV1(semantic(changed)));
  assert.deepEqual(projectDomainModelContractSemanticIdentityV1(semantic(base)).semanticPayload.scales[0].levels.map((level) => level.rank), [0, 1]);
  const reversed = fresh(); reversed.semanticPayload.scales[0].levels.reverse();
  const structural = parseDomainModelContractV1Structure(reversed); assert.equal(structural.ok, true);
  if (!structural.ok) return;
  const invalid = validateDomainModelContractV1Semantics(structural.value); assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.ok(invalid.issues.some((issue) => issue.code === "rank-order-mismatch"));
});

test("pipeline fails closed in structural, semantic, then hash order", () => {
  const structural = fresh(); structural.extra = true;
  const structuralResult = parseDomainModelContractV1(structural); assert.equal(structuralResult.ok, false);
  if (!structuralResult.ok) assert.ok(structuralResult.issues.some((issue) => issue.code === "unknown-field"));
  const semanticInput = fresh(); semanticInput.semanticPayload.actions.push(structuredClone(semanticInput.semanticPayload.actions[0]));
  const semanticResult = parseDomainModelContractV1(semanticInput); assert.equal(semanticResult.ok, false);
  if (!semanticResult.ok) assert.ok(semanticResult.issues.some((issue) => issue.code === "duplicate-id"));
  const mismatch = fresh(); mismatch.identity.semanticPayloadHash = `sha256:${"f".repeat(64)}`;
  const mismatchResult = parseDomainModelContractV1(mismatch); assert.deepEqual(mismatchResult, { ok: false, issues: [{ code: "semantic-payload-hash-mismatch", path: "/identity/semanticPayloadHash", message: "Declared semantic payload hash must match the canonical semantic identity projection." }] });
});

test("hash-verified results are detached, recursively frozen, untrusted, and non-executable", () => {
  const input = fresh(); const result = parseDomainModelContractV1(input); assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.notEqual(result.value, input); input.identity.domainId = "changed"; assert.equal(result.value.identity.domainId, "synthetic-systems-lab");
  const stack: unknown[] = [result.value]; while (stack.length) { const value = stack.pop(); if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); stack.push(...Object.values(value)); } }
  assert.equal("trusted" in result.value, false); assert.equal("executable" in result.value, false);
  type HasTrusted = SemanticHashVerifiedDomainModelContractV1 extends { trusted: unknown } ? true : false;
  type HasExecutable = SemanticHashVerifiedDomainModelContractV1 extends { executable: unknown } ? true : false;
  const hasTrusted: HasTrusted = false; const hasExecutable: HasExecutable = false;
  assert.equal(hasTrusted, false); assert.equal(hasExecutable, false);
});

test("canonical identity tuples distinguish control characters and JSON escapes through the full pipeline", () => {
  const nulLeft = fresh(); nulLeft.identity.modelVersion = "a\0b"; nulLeft.identity.calibrationVersion = "c";
  const nulRight = fresh(); nulRight.identity.modelVersion = "a"; nulRight.identity.calibrationVersion = "b\0c";
  assert.deepEqual(validateDomainModelContractIdentityCollisionsV1([verified(nulLeft), verified(nulRight)]), { ok: true });
  const escapedLeft = fresh(); escapedLeft.identity.modelVersion = "quote\"and\\backslash"; escapedLeft.identity.calibrationVersion = "line\nbreak";
  const escapedRight = fresh(); escapedRight.identity.modelVersion = "quote"; escapedRight.identity.calibrationVersion = "and\\backslash\nlinebreak";
  assert.deepEqual(validateDomainModelContractIdentityCollisionsV1([verified(escapedLeft), verified(escapedRight)]), { ok: true });
});

test("pure collision validation groups every conflicting path exactly once", () => {
  const first = verified(fresh()); const same = verified(fresh());
  const changedBInput = fresh(); changedBInput.semanticPayload.measures[0].recovery.pull = 0.2; const changedB = verified(changedBInput);
  const changedCInput = fresh(); changedCInput.semanticPayload.measures[0].recovery.pull = 0.3; const changedC = verified(changedCInput);
  const paths = (inputs: readonly SemanticHashVerifiedDomainModelContractV1[]) => {
    const result = validateDomainModelContractIdentityCollisionsV1(inputs); assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected collision");
    return result.issues.map((issue) => issue.path);
  };
  assert.deepEqual(validateDomainModelContractIdentityCollisionsV1([first, same]), { ok: true });
  assert.deepEqual(paths([first, changedB]), ["/0/identity/semanticPayloadHash", "/1/identity/semanticPayloadHash"]);
  assert.deepEqual(paths([first, changedB, changedB]), ["/0/identity/semanticPayloadHash", "/1/identity/semanticPayloadHash", "/2/identity/semanticPayloadHash"]);
  assert.deepEqual(paths([first, changedB, changedC]), ["/0/identity/semanticPayloadHash", "/1/identity/semanticPayloadHash", "/2/identity/semanticPayloadHash"]);
  assert.deepEqual(paths([changedC, changedB, first]), ["/0/identity/semanticPayloadHash", "/1/identity/semanticPayloadHash", "/2/identity/semanticPayloadHash"]);

  const metadataInput = fresh(); metadataInput.metadata.name = "Different presentation"; const metadata = verified(metadataInput);
  assert.equal(metadata.identity.semanticPayloadHash, first.identity.semanticPayloadHash);
  assert.deepEqual(validateDomainModelContractIdentityCollisionsV1([first, metadata]), { ok: true });
  for (const field of ["modelVersion", "calibrationVersion"] as const) { const separateInput = fresh(); separateInput.identity[field] = `${separateInput.identity[field]}-next`; const separate = verified(separateInput); assert.deepEqual(validateDomainModelContractIdentityCollisionsV1([first, separate]), { ok: true }); }
});
