import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as publicApi from "./domainModelFinalEquivalenceV1";
import {
  hashFinalEquivalenceReportContentV1,
  runDomainModelFinalEquivalenceV1,
  type DomainModelFinalEquivalenceReportV1,
} from "./domainModelFinalEquivalenceV1";

const profileIds = [
  "legacy-real-estate-v1",
  "legacy-municipal-v1",
  "legacy-consulting-v1",
] as const;
const fixtureKinds = ["neutral", "stressed-scheduled"] as const;

function loadJson(relativePath: string): unknown {
  const value: unknown = JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
  return value;
}

function rawInput(): { envelopes: unknown[]; fixtures: unknown[] } {
  return {
    envelopes: profileIds.map((profileId) => loadJson(`../domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`)),
    fixtures: profileIds.flatMap((profileId) => fixtureKinds.map((kind) => loadJson(`../fixtures/engine-baseline-input-v1/${profileId}-${kind}.json`))),
  };
}

function report(): DomainModelFinalEquivalenceReportV1 {
  return runDomainModelFinalEquivalenceV1(rawInput());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mutableRecord(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value));
  return value;
}

function mutableArray(value: unknown): unknown[] {
  assert.ok(Array.isArray(value));
  return value;
}

function property(value: unknown, key: string): unknown {
  return Reflect.get(mutableRecord(value), key);
}

function setProperty(value: unknown, key: string, replacement: unknown): void {
  Reflect.set(mutableRecord(value), key, replacement);
}

function cloneReportContent(value: DomainModelFinalEquivalenceReportV1): Record<string, unknown> {
  const clone = structuredClone(value);
  Reflect.deleteProperty(clone, "reportHash");
  return clone;
}

function hashContent(value: Record<string, unknown>): string {
  return Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [value]);
}

function assertDeepFrozen(value: unknown): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

function assertIntegrityRejects(mutate: (content: Record<string, unknown>) => void): void {
  const baseline = report();
  const content = cloneReportContent(baseline);
  mutate(content);
  assert.throws(() => hashContent(content), /final-report-integrity-error/);
}

function captureIntegrityDiscrepancy(run: () => unknown): Record<string, unknown> {
  let caught: unknown;
  try {
    run();
  } catch (error: unknown) {
    caught = error;
  }
  assert.ok(isRecord(caught));
  const discrepancy = property(caught, "discrepancy");
  assert.ok(isRecord(discrepancy));
  assert.deepEqual(Object.keys(discrepancy).sort(), ["kind", "left", "path", "right"]);
  assert.equal(property(discrepancy, "kind"), "final-report-integrity-error");
  assertDeepFrozen(discrepancy);
  return discrepancy;
}

function mutableWitness(content: Record<string, unknown>, profileIndex = 0, witnessIndex = 0): unknown {
  const profile = mutableArray(property(content, "profiles"))[profileIndex];
  return mutableArray(property(profile, "curveFallbackWitnesses"))[witnessIndex];
}

function mutableCase(content: Record<string, unknown>, caseIndex = 0): Record<string, unknown> {
  return mutableRecord(mutableArray(property(content, "cases"))[caseIndex]);
}

function mutableM1D(content: Record<string, unknown>, caseIndex = 0): Record<string, unknown> {
  return mutableRecord(property(mutableCase(content, caseIndex), "m1dReport"));
}

test("closed three-profile six-case matrix produces the declared final pass", () => {
  const result = report();
  assert.equal(result.version, "domain-model-final-equivalence-report-v1");
  assert.equal(result.status, "pass-declared-contract-surface-v1");
  assert.deepEqual(result.discrepancies, []);
  assert.deepEqual(result.profiles.map((entry) => entry.profileId), profileIds);
  assert.equal(result.cases.length, 6);
  assert.deepEqual(result.cases.map((entry) => entry.profileId), profileIds.flatMap((profileId) => [profileId, profileId]));
  assert.deepEqual(result.cases.map((entry) => entry.caseId), profileIds.flatMap((profileId) => fixtureKinds.map((kind) => `${profileId}-${kind}-v1`)));
  assert.ok(result.cases.every((entry) => entry.comparatorAStatus === "pass" && entry.comparatorBStatus === "pass"));
  assert.ok(result.cases.every((entry) => entry.m1dDiscrepancies.length === 0));
});

test("exactly six profile-bound fallback witnesses use the real legacy neutral result", () => {
  const result = report();
  const witnesses = result.profiles.flatMap((profile) => profile.curveFallbackWitnesses);
  assert.equal(witnesses.length, 6);
  for (const [profileIndex, profile] of result.profiles.entries()) {
    assert.equal(profile.coverageKind, "isolated-synthetic-legacy-runtime-witness-v1");
    assert.deepEqual(profile.curveFallbackWitnesses.map((entry) => entry.trigger), [
      "missing-curve-configuration",
      "unsupported-curve-discriminant",
    ]);
    for (const witness of profile.curveFallbackWitnesses) {
      assert.equal(witness.profileId, profileIds[profileIndex]);
      assert.equal(witness.declarationPath, "/compatibility/curveFallbackDeclaration");
      assert.equal(witness.policyId, "legacy-neutral-multiplier-v1");
      assert.equal(witness.expectedMultiplier, 1);
      assert.equal(witness.actualMultiplier, 1);
      assert.equal(witness.status, "pass");
      assert.deepEqual(witness.discrepancies, []);
      assert.equal(witness.sourceSemanticPayloadHash, profile.sourceSemanticPayloadHash);
      assert.equal(witness.projectedSemanticPayloadHash, profile.projectedSemanticPayloadHash);
      assert.equal(witness.compatibilityDeclarationsHash, profile.compatibilityDeclarationsHash);
      assert.equal(witness.envelopeHash, profile.envelopeHash);
    }
  }
});

test("sustain is consumed without execution and preserves the closed profile shapes", () => {
  const result = report();
  for (const profile of [result.profiles[0], result.profiles[2]]) {
    assert.deepEqual(profile.sustain, {
      declarationPath: "/compatibility/sustainThresholdDisposition",
      status: "excluded-no-authoritative-value",
      historicalMechanismObserved: true,
      hashBoundValue: "absent",
      execution: "forbidden",
      claim: "excluded-from-final-equivalence",
    });
  }
  assert.deepEqual(result.profiles[1].sustain, {
    declarationPath: null,
    status: "ineligible-no-declaration",
    historicalMechanismObserved: false,
    hashBoundValue: "absent",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result.profiles[1].sustain, "execution"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.profiles[1].sustain, "claim"), false);
  assert.equal(JSON.stringify(result.profiles[1].sustain).includes("execution"), false);
  assert.equal(JSON.stringify(result.profiles[1].sustain).includes("claim"), false);
});

test("outputs are detached, recursively frozen, input-preserving, and deterministic", () => {
  const input = rawInput();
  const before = structuredClone(input);
  const first = runDomainModelFinalEquivalenceV1(input);
  const second = runDomainModelFinalEquivalenceV1(input);
  assert.deepEqual(input, before);
  assert.deepEqual(first, second);
  assert.equal(first.reportHash, second.reportHash);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.profiles, second.profiles);
  assert.notStrictEqual(first.cases, second.cases);
  assertDeepFrozen(first);
  assert.doesNotThrow(() => Reflect.set(mutableRecord(input.envelopes[0]), "testOnly", true));
  assert.equal(Object.prototype.hasOwnProperty.call(first.profiles[0], "testOnly"), false);
});

test("the public API is closed to the audited exports and one raw-input runner", () => {
  assert.deepEqual(Object.keys(publicApi).sort(), [
    "hashFinalEquivalenceReportContentV1",
    "runDomainModelFinalEquivalenceV1",
  ]);
  assert.equal(runDomainModelFinalEquivalenceV1.length, 1);
});

test("profile and fixture inventories reject missing, extra, duplicate, and reordered entries", () => {
  const mutations: Array<(input: { envelopes: unknown[]; fixtures: unknown[] }) => void> = [
    (input) => { input.envelopes.pop(); },
    (input) => { input.envelopes.push(structuredClone(input.envelopes[0])); },
    (input) => { input.envelopes[1] = structuredClone(input.envelopes[0]); },
    (input) => { input.envelopes.reverse(); },
    (input) => { input.fixtures.pop(); },
    (input) => { input.fixtures.push(structuredClone(input.fixtures[0])); },
    (input) => { input.fixtures[1] = structuredClone(input.fixtures[0]); },
    (input) => { [input.fixtures[0], input.fixtures[1]] = [input.fixtures[1], input.fixtures[0]]; },
  ];
  for (const mutate of mutations) {
    const input = rawInput();
    mutate(input);
    assert.throws(() => runDomainModelFinalEquivalenceV1(input));
  }
});

test("curve declaration mutations reject instead of defaulting or repairing", () => {
  const mutations: Array<[string, unknown]> = [
    ["policyId", "alternate-policy"],
    ["appliesTo", ["unsupported-curve-discriminant", "missing-curve-configuration"]],
    ["appliesTo", ["missing-curve-configuration", "other-trigger"]],
    ["neutralMultiplier", 2],
    ["evidenceStatus", "verified"],
  ];
  for (const [key, replacement] of mutations) {
    const input = rawInput();
    const compatibility = property(input.envelopes[0], "compatibility");
    setProperty(property(compatibility, "curveFallbackDeclaration"), key, replacement);
    assert.throws(() => runDomainModelFinalEquivalenceV1(input));
  }
});

test("each M1C source, projected, compatibility, and envelope binding is fail-closed", () => {
  const mutations: Array<(envelope: unknown) => void> = [
    (envelope) => setProperty(property(envelope, "source"), "semanticPayloadHash", `sha256:${"0".repeat(64)}`),
    (envelope) => setProperty(property(envelope, "projection"), "semanticPayloadHash", `sha256:${"0".repeat(64)}`),
    (envelope) => setProperty(property(property(envelope, "projection"), "identity"), "semanticPayloadHash", `sha256:${"0".repeat(64)}`),
    (envelope) => setProperty(property(envelope, "compatibility"), "declarationsHash", `sha256:${"0".repeat(64)}`),
    (envelope) => setProperty(property(envelope, "source"), "identity", { ...mutableRecord(property(property(envelope, "source"), "identity")), modelVersion: "stale" }),
  ];
  for (const mutate of mutations) {
    const input = rawInput();
    mutate(input.envelopes[0]);
    assert.throws(() => runDomainModelFinalEquivalenceV1(input));
  }
});

test("fixture identity, scenario kind, and payload mutations reject before M1D construction", () => {
  const mutations: Array<(fixture: unknown) => void> = [
    (fixture) => setProperty(fixture, "profileId", "legacy-municipal-v1"),
    (fixture) => setProperty(fixture, "domainId", "municipal"),
    (fixture) => setProperty(fixture, "fixtureId", "wrong-case"),
    (fixture) => setProperty(fixture, "kind", "stressed-scheduled"),
    (fixture) => setProperty(fixture, "horizon", 0),
  ];
  for (const mutate of mutations) {
    const input = rawInput();
    mutate(input.fixtures[0]);
    assert.throws(() => runDomainModelFinalEquivalenceV1(input));
  }
});

test("all witness identity, inventory, result, declaration, and coverage fields are report-hash sensitive", () => {
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    (content) => { mutableArray(property(mutableArray(property(content, "profiles"))[0], "curveFallbackWitnesses")).pop(); },
    (content) => { const witnesses = mutableArray(property(mutableArray(property(content, "profiles"))[0], "curveFallbackWitnesses")); witnesses.push(structuredClone(witnesses[0])); },
    (content) => { mutableArray(property(mutableArray(property(content, "profiles"))[0], "curveFallbackWitnesses")).reverse(); },
    (content) => setProperty(mutableWitness(content), "trigger", "unsupported-curve-discriminant"),
    (content) => setProperty(mutableWitness(content), "profileId", profileIds[1]),
    (content) => setProperty(mutableWitness(content), "actualMultiplier", 2),
    (content) => setProperty(mutableWitness(content), "actualMultiplier", Number.NaN),
    (content) => setProperty(mutableWitness(content), "actualMultiplier", Number.POSITIVE_INFINITY),
    (content) => setProperty(mutableWitness(content), "actualMultiplier", Number.NEGATIVE_INFINITY),
    (content) => setProperty(mutableWitness(content), "parameterKey", "wrong"),
    (content) => setProperty(mutableWitness(content), "policyId", "wrong"),
    (content) => setProperty(mutableWitness(content), "declarationPath", "/wrong"),
    (content) => setProperty(mutableArray(property(content, "profiles"))[0], "coverageKind", "ordinary-case"),
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
});

test("source, projected, compatibility, envelope, and cross-profile substitutions are report-hash sensitive", () => {
  for (const key of ["sourceSemanticPayloadHash", "projectedSemanticPayloadHash", "compatibilityDeclarationsHash", "envelopeHash"]) {
    assertIntegrityRejects((content) => setProperty(mutableArray(property(content, "profiles"))[0], key, "stale"));
    assertIntegrityRejects((content) => setProperty(mutableWitness(content), key, "stale"));
  }
  assertIntegrityRejects((content) => {
    const profiles = mutableArray(property(content, "profiles"));
    const firstWitnesses = mutableArray(property(profiles[0], "curveFallbackWitnesses"));
    firstWitnesses[0] = structuredClone(mutableArray(property(profiles[1], "curveFallbackWitnesses"))[0]);
  });
});

test("M1D report, observations, Comparator A/B, and attribution are report-hash sensitive", () => {
  const caseMutation = (key: string, replacement: unknown) => (content: Record<string, unknown>) => setProperty(mutableArray(property(content, "cases"))[0], key, replacement);
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    caseMutation("m1dReportHash", "stale"),
    caseMutation("legacyObservationHash", "stale"),
    caseMutation("pureNativeObservationHash", "stale"),
    caseMutation("compatibilityEffectiveObservationHash", "stale"),
    caseMutation("comparatorAHash", "stale"),
    caseMutation("comparatorAStatus", "fail"),
    caseMutation("comparatorBHash", "stale"),
    caseMutation("comparatorBStatus", "fail"),
    caseMutation("m1dDiscrepancies", [{ path: "/x", classification: "contract-error" }]),
    (content) => { mutableArray(property(mutableArray(property(content, "cases"))[0], "primaryDifferences")).pop(); },
    (content) => { mutableArray(property(mutableArray(property(content, "cases"))[0], "attributions")).pop(); },
    (content) => { const entries = mutableArray(property(mutableArray(property(content, "cases"))[0], "attributions")); entries.push(structuredClone(entries[0])); },
    (content) => { const entries = mutableArray(property(mutableArray(property(content, "cases"))[0], "attributions")); if (entries.length > 0) setProperty(entries[0], "declarationPaths", ["/wrong"]); else entries.push({ declarationPaths: ["/wrong"] }); },
    (content) => setProperty(mutableM1D(content), "version", "wrong-version"),
    (content) => setProperty(property(mutableM1D(content), "legacyReference"), "profileId", profileIds[1]),
    (content) => setProperty(property(mutableM1D(content), "legacyReference"), "caseId", "wrong-case"),
    (content) => setProperty(property(mutableM1D(content), "legacyReference"), "scenario", "scenarioA"),
    (content) => setProperty(property(mutableM1D(content), "legacyReference"), "kind", "pure-native"),
    (content) => setProperty(property(property(mutableM1D(content), "legacyReference"), "hashes"), "envelopeHash", "stale"),
    (content) => setProperty(mutableM1D(content), "reportHash", "stale"),
    (content) => setProperty(property(mutableM1D(content), "comparatorA"), "status", "fail"),
    (content) => setProperty(property(mutableM1D(content), "comparatorA"), "ok", false),
    (content) => setProperty(property(mutableM1D(content), "comparatorA"), "comparator", "wrong"),
    (content) => setProperty(property(mutableM1D(content), "comparatorA"), "discrepancies", [{ path: "/x", left: 1, right: 2, classification: "unresolved-design-decision" }]),
    (content) => setProperty(property(mutableM1D(content), "comparatorB"), "status", "fail"),
    (content) => setProperty(property(mutableM1D(content), "comparatorB"), "comparator", "wrong"),
    (content) => setProperty(property(mutableM1D(content), "comparatorB"), "discrepancies", [{ path: "/x", left: 1, right: 2, classification: "compatibility-rule" }]),
    (content) => { mutableArray(property(property(mutableM1D(content), "comparatorB"), "primaryDifferences")).pop(); },
    (content) => { mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")).pop(); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); entries.push(structuredClone(entries[0])); },
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
});

test("attribution leaf and semantic ordering mutations reach final integrity verification", () => {
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); setProperty(entries[0], "declarationPaths", ["/wrong"]); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); const differences = mutableArray(property(entries[0], "observedDifferences")); differences[0] = { path: "/wrong", before: 1, after: 2 }; },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); const differences = mutableArray(property(entries[0], "observedDifferences")); setProperty(differences[0], "before", "wrong"); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); const differences = mutableArray(property(entries[0], "observedDifferences")); setProperty(differences[0], "after", "wrong"); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); setProperty(entries[0], "profileId", profileIds[1]); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); setProperty(entries[0], "caseId", "wrong"); },
    (content) => { const entries = mutableArray(property(property(mutableM1D(content), "comparatorB"), "attributions")); mutableArray(property(entries[0], "observedDifferences")).reverse(); },
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
});

test("sustain status, disposition, shape, and numeric injection are report-hash sensitive", () => {
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[0], "sustain"), "status", "ineligible-no-declaration"),
    (content) => Reflect.deleteProperty(mutableRecord(property(mutableArray(property(content, "profiles"))[0], "sustain")), "execution"),
    (content) => Reflect.deleteProperty(mutableRecord(property(mutableArray(property(content, "profiles"))[2], "sustain")), "claim"),
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[1], "sustain"), "status", "excluded-no-authoritative-value"),
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[1], "sustain"), "execution", "forbidden"),
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[1], "sustain"), "claim", "excluded-from-final-equivalence"),
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[1], "sustain"), "numericValue", 0.8),
    (content) => setProperty(property(mutableArray(property(content, "profiles"))[1], "sustain"), "declarationPath", "/compatibility/sustainThresholdDisposition"),
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
});

test("final report version, status, outputs, inventory, discrepancy paths, and hash are sensitive", () => {
  const baseline = report();
  assert.equal(hashContent(cloneReportContent(baseline)), baseline.reportHash);
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    (content) => setProperty(content, "version", "other"),
    (content) => setProperty(content, "status", "fail-v1"),
    (content) => { mutableArray(property(content, "profiles")).pop(); },
    (content) => { mutableArray(property(content, "profiles")).push(structuredClone(mutableArray(property(content, "profiles"))[0])); },
    (content) => { mutableArray(property(content, "cases")).pop(); },
    (content) => { mutableArray(property(content, "cases")).push(structuredClone(mutableArray(property(content, "cases"))[0])); },
    (content) => setProperty(content, "discrepancies", [{ path: "/same", left: 1, right: 2, kind: "final-report-integrity-error" }, { path: "/same", left: 2, right: 3, kind: "final-report-integrity-error" }]),
    (content) => setProperty(mutableArray(property(content, "cases"))[0], "caseId", "mutated"),
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
  assert.equal(Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [baseline]), baseline.reportHash);
  const selfIncluded = cloneReportContent(baseline);
  setProperty(selfIncluded, "hashOfReportHash", baseline.reportHash);
  assert.throws(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [selfIncluded]), /final-report-integrity-error/);
});

test("final report hash, root schema, inventories, and RFC 6901 paths reject through the public hash boundary", () => {
  const baseline = report();
  const stale = structuredClone(baseline);
  setProperty(stale, "reportHash", "stale");
  assert.throws(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [stale]), /final-report-integrity-error:\/reportHash/);
  const mutations: Array<(content: Record<string, unknown>) => void> = [
    (content) => setProperty(content, "extra", true),
    (content) => { mutableArray(property(content, "profiles")).splice(1, 0, structuredClone(mutableArray(property(content, "profiles"))[0])); },
    (content) => { mutableArray(property(content, "cases")).splice(1, 0, structuredClone(mutableArray(property(content, "cases"))[0])); },
    (content) => setProperty(content, "discrepancies", [{ path: "/bad~", left: 1, right: 2, kind: "final-report-integrity-error" }]),
    (content) => setProperty(content, "discrepancies", [{ path: "/bad~2", left: 1, right: 2, kind: "final-report-integrity-error" }]),
    (content) => setProperty(content, "discrepancies", [{ path: "/bad~01", left: 1, right: 2, kind: "final-report-integrity-error" }]),
    (content) => setProperty(content, "discrepancies", [{ path: "/same", left: 1, right: 2, kind: "final-report-integrity-error" }, { path: "/same", left: 2, right: 3, kind: "final-report-integrity-error" }]),
    (content) => setProperty(content, "discrepancies", [{ path: "/z", left: 1, right: 2, kind: "final-report-integrity-error" }, { path: "/a", left: 2, right: 3, kind: "final-report-integrity-error" }]),
  ];
  for (const mutate of mutations) assertIntegrityRejects(mutate);
});

test("private final-integrity ownership emits a frozen discrepancy without caller authority", () => {
  const content = cloneReportContent(report());
  setProperty(content, "kind", "caller-kind");
  setProperty(content, "path", "caller-path");
  const discrepancy = captureIntegrityDiscrepancy(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [content]));
  assert.equal(property(discrepancy, "path"), "");
  assert.notEqual(property(discrepancy, "kind"), "caller-kind");
  assert.notEqual(property(discrepancy, "path"), "caller-path");
});

test("relative RFC 6901 path emits an internally owned integrity discrepancy", () => {
  const content = cloneReportContent(report());
  setProperty(content, "discrepancies", [{ path: "relative", left: 1, right: 2, kind: "final-report-integrity-error" }]);
  const discrepancy = captureIntegrityDiscrepancy(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [content]));
  assert.equal(property(discrepancy, "path"), "/discrepancies/0/path");
  assert.equal(property(discrepancy, "left"), "relative");
  assert.notEqual(property(discrepancy, "path"), "relative");
});

test("missing and extra embedded M1D observations emit private integrity discrepancies", () => {
  const missing = cloneReportContent(report());
  Reflect.deleteProperty(mutableM1D(missing), "legacyReference");
  const missingDiscrepancy = captureIntegrityDiscrepancy(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [missing]));
  assert.equal(property(missingDiscrepancy, "path"), "/cases/0/m1dReport");

  const extra = cloneReportContent(report());
  setProperty(mutableM1D(extra), "extraObservation", { kind: "caller-supplied" });
  const extraDiscrepancy = captureIntegrityDiscrepancy(() => Reflect.apply(hashFinalEquivalenceReportContentV1, undefined, [extra]));
  assert.equal(property(extraDiscrepancy, "path"), "/cases/0/m1dReport");
});

test("canonical hashing is object-order neutral and ordered-array sensitive", () => {
  const baseline = report();
  const content = cloneReportContent(baseline);
  const reorderedObject = Object.fromEntries(Object.entries(content).reverse());
  assert.equal(hashContent(reorderedObject), baseline.reportHash);
  const reversedProfiles = cloneReportContent(baseline);
  mutableArray(property(reversedProfiles, "profiles")).reverse();
  assert.throws(() => hashContent(reversedProfiles), /final-report-integrity-error/);
  const reversedCases = cloneReportContent(baseline);
  mutableArray(property(reversedCases, "cases")).reverse();
  assert.throws(() => hashContent(reversedCases), /final-report-integrity-error/);
});

test("caller-supplied authority fields are rejected at both raw input boundaries", () => {
  for (const key of ["verified", "reportHash", "classification", "attribution", "emitter", "status", "witness", "curveWitnesses", "sustain", "sustainResult", "comparatorA", "comparatorB", "discrepancies", "finalStatus", "pass", "brand"]) {
    const rootInput = rawInput();
    setProperty(rootInput, key, true);
    assert.throws(() => runDomainModelFinalEquivalenceV1(rootInput), /final-report-integrity-error/);
    const envelopeInput = rawInput();
    setProperty(envelopeInput.envelopes[0], key, true);
    assert.throws(() => runDomainModelFinalEquivalenceV1(envelopeInput));
    const fixtureInput = rawInput();
    setProperty(fixtureInput.fixtures[0], key, true);
    assert.throws(() => runDomainModelFinalEquivalenceV1(fixtureInput));
  }
});

test("root input rejects hostile containers and descriptors before property access", () => {
  for (const invalid of [null, [], () => undefined, Object.create({ emitter: true })]) {
    assert.throws(() => runDomainModelFinalEquivalenceV1(invalid), /final-report-integrity-error/);
  }
  const symbolInput = rawInput();
  Reflect.set(symbolInput, Symbol("authority"), true);
  assert.throws(() => runDomainModelFinalEquivalenceV1(symbolInput), /final-report-integrity-error/);
  for (const key of ["envelopes", "fixtures"] as const) {
    let invoked = false;
    const hostile = rawInput();
    Object.defineProperty(hostile, key, { enumerable: true, get() { invoked = true; return []; } });
    assert.throws(() => runDomainModelFinalEquivalenceV1(hostile), /final-report-integrity-error/);
    assert.equal(invoked, false);
  }
});

test("reserved classifications and ordinary-case fallback claims have no emitted route", () => {
  const result = report();
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("known-explicitly-deferred"), false);
  assert.equal(serialized.includes("possible-legacy-runtime-defect"), false);
  assert.equal(serialized.includes("ordinary-m0b-fallback"), false);
  assert.ok(result.cases.every((entry) => !Object.prototype.hasOwnProperty.call(entry, "curveFallbackWitnesses")));
});
