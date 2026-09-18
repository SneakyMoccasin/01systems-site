import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import { runLayer1MtcV1 } from "../execution/runLayer1MtcV1";
import { layer1ExecutionIdentityMtcV1 } from "../execution/executionIdentityMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import { parseScenarioMtcV1 } from "../scenario/parseScenarioMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { domainNeutralScenarioMtcV1 } from "../testSupport/domainNeutralScenarioMtcV1";
import { deriveObservationSourcesMtcV1 } from "./deriveObservationSourcesMtcV1";
import { observationSourceEventIdentityMtcV1 } from "./observationSourceIdentityMtcV1";
import type { ObservationSourceBindingsMtcV1, ObservationSourceEventMtcV1 } from "./observationSourceMtcV1";
import { parseObservationSourceBindingsMtcV1 } from "./parseObservationSourceBindingsMtcV1";

function rawContract(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1", semanticId: "contract:source-fixture", revision: 1,
    protocolVersion: "ce-two-layer-mtc-protocol-v1", limitsVersion: "ce-two-layer-mtc-limits-v1", evidence: [],
    layer1: {
      initiativeTypes: [
        { initiativeTypeId: "initiative:foundation", lifecycle: "pending-active-completed-v1", eligibilityRules: [] },
        { initiativeTypeId: "initiative:independent", lifecycle: "pending-active-completed-v1", eligibilityRules: [
          { ruleId: "rule:independent-constraint", kind: "constraint-absent", constraintId: "constraint:hold" },
          { ruleId: "rule:independent-reusable", kind: "entitlement-available", entitlementId: "entitlement:membership", consumption: "retain" },
          { ruleId: "rule:independent-consumable", kind: "entitlement-available", entitlementId: "entitlement:permit", consumption: "consume-on-admission" },
        ] },
        { initiativeTypeId: "initiative:delivery", lifecycle: "pending-active-completed-v1", eligibilityRules: [
          { ruleId: "rule:delivery-prerequisite", kind: "prerequisite-completed", prerequisiteInitiativeTypeId: "initiative:foundation" },
          { ruleId: "rule:delivery-room", kind: "exclusive-resource-available", resourceId: "resource:room", reservation: "while-active" },
          { ruleId: "rule:delivery-capacity", kind: "quantitative-capacity-available", resourceId: "resource:team", amount: "2", unit: "person", reservation: "while-active" },
        ] },
      ],
      resources: [{ resourceId: "resource:room", kind: "exclusive" }, { resourceId: "resource:team", kind: "quantitative-capacity", unit: "person", capacity: "5" }],
      constraints: [{ constraintId: "constraint:hold", kind: "blocking" }],
      entitlements: [{ entitlementId: "entitlement:membership", kind: "reusable" }, { entitlementId: "entitlement:permit", kind: "consumable" }],
    },
    layer2: {
      resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1",
      nodes: [{ nodeId: "observation:alpha" }, { nodeId: "observation:beta" }], edges: [],
    },
  };
}

function contract(): TwoLayerMtcContractV1 {
  const result = parseContractMtcV1(rawContract()); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: TwoLayerMtcContractV1 }).value;
}

function initiatives(raw: Record<string, unknown>): Array<Record<string, unknown>> { return raw.initiatives as Array<Record<string, unknown>>; }

function scenario(domain: TwoLayerMtcContractV1, mutate?: (raw: Record<string, unknown>) => void): PreparedScenarioMtcV1 {
  const raw = domainNeutralScenarioMtcV1(domain); mutate?.(raw);
  const result = parseScenarioMtcV1(raw, domain); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: PreparedScenarioMtcV1 }).value;
}

function bindingRaw(domain: TwoLayerMtcContractV1, prepared: PreparedScenarioMtcV1): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-source-bindings-v1",
    scenarioIdentity: prepared.semanticIdentity,
    contractIdentity: contractSemanticIdentityMtcV1(domain),
    bindings: [{ bindingId: "binding:foundation-completed", eventKind: "initiative-completed", initiativeInstanceId: "instance:foundation", targetNodeId: "observation:alpha" }],
  };
}

function bindings(domain: TwoLayerMtcContractV1, prepared: PreparedScenarioMtcV1, raw = bindingRaw(domain, prepared)): ObservationSourceBindingsMtcV1 {
  const result = parseObservationSourceBindingsMtcV1(raw, prepared, domain);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: ObservationSourceBindingsMtcV1 }).value;
}

function issueCodes(raw: unknown, domain: TwoLayerMtcContractV1, prepared: PreparedScenarioMtcV1): string[] {
  const result = parseObservationSourceBindingsMtcV1(raw, prepared, domain); assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map((item) => item.code);
}

test("committed admission and completion produce canonical immutable sources with one explicit activation", () => {
  const domain = contract(); const prepared = scenario(domain); const execution = runLayer1MtcV1(prepared, domain);
  const result = deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared));
  assert.deepEqual([...new Set(result.sourceEvents.map((item) => item.kind))], ["initiative-admitted", "initiative-completed"]);
  const foundationCompletion = result.sourceEvents.find((item) => item.kind === "initiative-completed" && item.initiativeInstanceId === "instance:foundation")!;
  assert.equal(foundationCompletion.committedBoundary, 2);
  assert.equal(foundationCompletion.provenance.source, "committed-period");
  assert.equal(foundationCompletion.provenance.transition, "active-to-completed");
  assert.deepEqual(result.activationCandidates, [{
    bindingId: "binding:foundation-completed", sourceEventIdentity: foundationCompletion.sourceEventIdentity,
    targetNodeId: "observation:alpha",
    provenance: { sourceEventIdentity: foundationCompletion.sourceEventIdentity, bindingIdentity: result.bindingIdentity, observationNodeId: "observation:alpha" },
  }]);
  assert.ok(result.unmappedSourceEventIdentities.length > 0);
  assert.equal(Object.isFrozen(result), true); assert.equal(Object.isFrozen(result.sourceEvents), true);
});

test("failed-unresolved output emits only prior committed sources, never tentative or future events", () => {
  const domain = contract();
  const prepared = scenario(domain, (raw) => { initiatives(raw).push({ ...structuredClone(initiatives(raw)[2]), instanceId: "instance:delivery-c" }); });
  const execution = runLayer1MtcV1(prepared, domain); assert.equal(execution.status, "failed-unresolved");
  const raw = bindingRaw(domain, prepared);
  (raw.bindings as Array<Record<string, unknown>>)[0] = { bindingId: "binding:delivery-completed", eventKind: "initiative-completed", initiativeInstanceId: "instance:delivery-a", targetNodeId: "observation:alpha" };
  const result = deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared, raw));
  assert.equal(result.activationCandidates.length, 0);
  assert.equal(result.sourceEvents.some((item) => item.initiativeInstanceId === "instance:delivery-a" && item.kind === "initiative-completed"), false);
  assert.equal(result.sourceEvents.some((item) => item.committedBoundary >= 5), false);
  assert.ok(result.sourceEvents.some((item) => item.committedBoundary < 5));
});

test("binding validation rejects unknowns, Layer 1 targets, authority fields, executable values and unsupported versions", () => {
  const domain = contract(); const prepared = scenario(domain); const base = bindingRaw(domain, prepared);
  const mutations: Array<[string, (raw: Record<string, unknown>) => void]> = [
    ["invalid-discriminant", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].eventKind = "resource-mutated"; }],
    ["unknown-reference", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].initiativeInstanceId = "instance:missing"; }],
    ["unknown-reference", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].targetNodeId = "observation:missing"; }],
    ["forbidden-layer1-target", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].targetNodeId = "resource:room"; }],
    ["invalid-id", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].bindingId = "bad id"; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].admission = "allow"; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].threshold = "1"; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].magnitude = "1"; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].score = "1"; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].promote = true; }],
    ["unknown-field", (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].expression = () => true; }],
    ["invalid-discriminant", (raw) => { raw.schemaVersion = "full-v2-bindings"; }],
  ];
  for (const [expected, mutate] of mutations) { const raw = structuredClone(base); mutate(raw); assert.ok(issueCodes(raw, domain, prepared).includes(expected), expected); }
  const over = structuredClone(base); over.bindings = Array.from({ length: CONTRACT_LIMITS_MTC_V1.maxSourceBindings + 1 }, (_, index) => ({ bindingId: `binding:b-${index}`, eventKind: "initiative-completed", initiativeInstanceId: "instance:foundation", targetNodeId: "observation:alpha" }));
  assert.ok(issueCodes(over, domain, prepared).includes("limit-exceeded"));
});

test("duplicate and conflicting source bindings fail closed; fan-out is deferred", () => {
  const domain = contract(); const prepared = scenario(domain); const duplicate = bindingRaw(domain, prepared);
  const rows = duplicate.bindings as Array<Record<string, unknown>>;
  rows.push({ ...structuredClone(rows[0]), bindingId: "binding:duplicate" });
  assert.ok(issueCodes(duplicate, domain, prepared).includes("duplicate-binding"));
  rows[1].targetNodeId = "observation:beta";
  assert.ok(issueCodes(duplicate, domain, prepared).includes("conflicting-binding"));
});

test("replay, scenario order and binding order are invariant while semantic event mutation changes identity", () => {
  const domain = contract(); const prepared = scenario(domain); const execution = runLayer1MtcV1(prepared, domain);
  const raw = bindingRaw(domain, prepared);
  (raw.bindings as Array<Record<string, unknown>>).push({ bindingId: "binding:independent-admitted", eventKind: "initiative-admitted", initiativeInstanceId: "instance:independent", targetNodeId: "observation:beta" });
  const first = deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared, raw));
  const reversedBindings = structuredClone(raw); (reversedBindings.bindings as unknown[]).reverse();
  assert.deepEqual(deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared, reversedBindings)), first);
  const reorderedRaw = domainNeutralScenarioMtcV1(domain); (reorderedRaw.initiatives as unknown[]).reverse(); (reorderedRaw.resources as unknown[]).reverse();
  const parsed = parseScenarioMtcV1(reorderedRaw, domain); assert.equal(parsed.ok, true); const reordered = (parsed as { ok: true; value: PreparedScenarioMtcV1 }).value;
  assert.deepEqual(deriveObservationSourcesMtcV1(runLayer1MtcV1(reordered, domain), reordered, domain, bindings(domain, reordered, raw)), first);
  const changed = structuredClone(first.sourceEvents[0]) as ObservationSourceEventMtcV1;
  (changed as unknown as Record<string, unknown>).committedBoundary = changed.committedBoundary + 1;
  assert.notEqual(observationSourceEventIdentityMtcV1(changed), first.sourceEvents[0].sourceEventIdentity);
});

test("derivation is additive, detached, leaves Layer 1 byte-equivalent and never infers mappings", () => {
  const domain = contract(); const prepared = scenario(domain); const execution = runLayer1MtcV1(prepared, domain); const before = structuredClone(execution);
  const raw = bindingRaw(domain, prepared); raw.bindings = [];
  const preparedBindings = bindings(domain, prepared, raw);
  const result = deriveObservationSourcesMtcV1(execution, prepared, domain, preparedBindings);
  (raw.bindings as unknown[]).push({ bindingId: "binding:late" });
  assert.deepEqual(execution, before);
  assert.equal(result.activationCandidates.length, 0);
  assert.equal(result.unmappedSourceEventIdentities.length, result.sourceEvents.length);
  assert.equal(preparedBindings.bindings.length, 0);
});

test("reversed unresolved declarations preserve identical conflict evidence and outcome", () => {
  const domain = contract();
  const raw = domainNeutralScenarioMtcV1(domain); initiatives(raw)[2].scheduledStartPeriod = 2;
  const firstParsed = parseScenarioMtcV1(raw, domain); assert.equal(firstParsed.ok, true);
  const reversedRaw = structuredClone(raw); (reversedRaw.initiatives as unknown[]).reverse(); (reversedRaw.resources as unknown[]).reverse();
  for (const item of initiatives(reversedRaw)) { (item.dependencies as unknown[]).reverse(); (item.resourceClaims as unknown[]).reverse(); }
  const secondParsed = parseScenarioMtcV1(reversedRaw, domain); assert.equal(secondParsed.ok, true);
  const first = runLayer1MtcV1((firstParsed as { ok: true; value: PreparedScenarioMtcV1 }).value, domain);
  const second = runLayer1MtcV1((secondParsed as { ok: true; value: PreparedScenarioMtcV1 }).value, domain);
  assert.equal(first.status, "failed-unresolved"); assert.deepEqual(second, first);
});

test("import direction prevents Layer 1 from reaching observation-source code and source code has no executor callback", () => {
  const root = path.join(process.cwd(), "src/pilotFastighet/analysis/evidenceLevelV2");
  const executionFiles = fs.readdirSync(path.join(root, "execution")).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
  for (const name of executionFiles) assert.equal(fs.readFileSync(path.join(root, "execution", name), "utf8").includes("observationSource"), false, name);
  const sourceFiles = fs.readdirSync(path.join(root, "observationSource")).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
  for (const name of sourceFiles) {
    const text = fs.readFileSync(path.join(root, "observationSource", name), "utf8");
    assert.equal(text.includes("runLayer1MtcV1"), false, name);
    assert.equal(/callback|writeLayer1|mutateLayer1/.test(text), false, name);
  }
});

test("tampered Layer 1 execution identity cannot cross the source boundary", () => {
  const domain = contract(); const prepared = scenario(domain); const execution = structuredClone(runLayer1MtcV1(prepared, domain));
  (execution as unknown as Record<string, unknown>).executionIdentity = "0".repeat(64);
  assert.throws(() => deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared)), /execution identity verification failed/);
});

test("duplicate committed event evidence is rejected even with a recomputed execution identity", () => {
  const domain = contract(); const prepared = scenario(domain); const execution = structuredClone(runLayer1MtcV1(prepared, domain));
  const firstRecord = execution.history[0] as unknown as { admissions: unknown[] };
  firstRecord.admissions.push(structuredClone(firstRecord.admissions[0]));
  (execution as unknown as Record<string, unknown>).executionIdentity = layer1ExecutionIdentityMtcV1(execution);
  assert.throws(() => deriveObservationSourcesMtcV1(execution, prepared, domain, bindings(domain, prepared)), /Duplicate committed observation source event/);
});
