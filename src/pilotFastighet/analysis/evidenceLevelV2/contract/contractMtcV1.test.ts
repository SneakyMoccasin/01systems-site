import test from "node:test";
import assert from "node:assert/strict";

import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import {
  minimalLayer1ContractMtcV1,
  minimalTwoLayerContractMtcV1,
} from "../testSupport/domainNeutralContractsMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { OBSERVATION_RESULTS_MTC_V1 } from "./contractMtcV1";
import { parseContractJsonMtcV1, parseContractMtcV1 } from "./parseContractMtcV1";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function valid(value: unknown) {
  const result = parseContractMtcV1(value);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected valid contract");
  return result.value;
}

function issueCodes(value: unknown): string[] {
  const result = parseContractMtcV1(value);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map(({ code }) => code);
}

test("minimal Layer 1-only contract is closed, detached, frozen, and deterministic", () => {
  const raw = minimalLayer1ContractMtcV1();
  const first = valid(raw);
  const second = valid(raw);
  (raw.layer1 as { initiativeTypes: Array<{ initiativeTypeId: string }> })
    .initiativeTypes[0].initiativeTypeId = "initiative:mutated";

  assert.deepEqual(first, second);
  assert.equal(first.layer1.initiativeTypes[0].initiativeTypeId, "initiative:alpha");
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.layer1.initiativeTypes), true);
  assert.equal(contractSemanticIdentityMtcV1(first), contractSemanticIdentityMtcV1(second));
});

test("minimum structural declarations represent dependencies, both resources, constraints, and entitlements", () => {
  const raw = minimalLayer1ContractMtcV1();
  const layer1 = raw.layer1 as Record<string, unknown>;
  layer1.resources = [
    { resourceId: "resource:exclusive", kind: "exclusive" },
    { resourceId: "resource:capacity", kind: "quantitative-capacity", unit: "person-hour", capacity: "10.5" },
  ];
  layer1.constraints = [{ constraintId: "constraint:hold", kind: "blocking" }];
  layer1.entitlements = [
    { entitlementId: "entitlement:permit", kind: "consumable" },
    { entitlementId: "entitlement:membership", kind: "reusable" },
  ];
  layer1.initiativeTypes = [
    { initiativeTypeId: "initiative:prerequisite", lifecycle: "pending-active-completed-v1", eligibilityRules: [] },
    {
      initiativeTypeId: "initiative:alpha",
      lifecycle: "pending-active-completed-v1",
      eligibilityRules: [
        { ruleId: "rule:dependency", kind: "prerequisite-completed", prerequisiteInitiativeTypeId: "initiative:prerequisite" },
        { ruleId: "rule:exclusive", kind: "exclusive-resource-available", resourceId: "resource:exclusive", reservation: "while-active" },
        { ruleId: "rule:capacity", kind: "quantitative-capacity-available", resourceId: "resource:capacity", amount: "2.5", unit: "person-hour", reservation: "while-active" },
        { ruleId: "rule:constraint", kind: "constraint-absent", constraintId: "constraint:hold" },
        { ruleId: "rule:entitlement", kind: "entitlement-available", entitlementId: "entitlement:permit", consumption: "consume-on-admission" },
      ],
    },
  ];

  const parsed = valid(raw);
  assert.equal(parsed.layer1.resources.length, 2);
  assert.equal(parsed.layer1.initiativeTypes[0].initiativeTypeId, "initiative:alpha");
});

test("Two-layer fixture validates a bounded categorical evidence-linked DAG", () => {
  const parsed = valid(minimalTwoLayerContractMtcV1());
  assert.deepEqual(OBSERVATION_RESULTS_MTC_V1, ["affected", "exposed", "unchanged", "unknown"]);
  assert.deepEqual(parsed.layer2.edges.map(({ edgeId }) => edgeId), [
    "edge:middle-terminal",
    "edge:source-middle",
  ]);
  assert.equal(parsed.layer2.edges[0].evidence.kind, "explicit-assumption");
  assert.equal(parsed.layer2.edges[1].evidence.kind, "evidence-reference");
});

test("invalid JSON, unknown fields, missing fields, and discriminants fail closed", () => {
  assert.deepEqual(parseContractJsonMtcV1("{"), {
    ok: false,
    issues: [{ code: "invalid-json", path: "", message: "Invalid JSON." }],
  });
  const unknown = minimalLayer1ContractMtcV1();
  unknown.utility = 1;
  assert.ok(issueCodes(unknown).includes("unknown-field"));
  const missing = minimalLayer1ContractMtcV1();
  delete missing.layer2;
  assert.ok(issueCodes(missing).includes("missing-field"));
  const discriminant = minimalLayer1ContractMtcV1();
  discriminant.schemaVersion = "ce-dmc-v2";
  assert.ok(issueCodes(discriminant).includes("invalid-discriminant"));
});

test("invalid and duplicate semantic IDs fail closed", () => {
  const invalid = minimalLayer1ContractMtcV1();
  invalid.semanticId = "not valid";
  assert.ok(issueCodes(invalid).includes("invalid-id"));
  const duplicate = minimalLayer1ContractMtcV1();
  const layer1 = duplicate.layer1 as { initiativeTypes: unknown[] };
  layer1.initiativeTypes.push(clone(layer1.initiativeTypes[0]));
  assert.ok(issueCodes(duplicate).includes("duplicate-semantic-id"));
});

test("unknown Layer 1 references and incompatible resource declarations fail closed", () => {
  const unknown = minimalLayer1ContractMtcV1();
  const initiative = (unknown.layer1 as { initiativeTypes: Array<{ eligibilityRules: unknown[] }> }).initiativeTypes[0];
  initiative.eligibilityRules.push({
    ruleId: "rule:missing-resource",
    kind: "exclusive-resource-available",
    resourceId: "resource:missing",
    reservation: "while-active",
  });
  assert.ok(issueCodes(unknown).includes("unknown-reference"));

  const mismatch = minimalLayer1ContractMtcV1();
  (mismatch.layer1 as Record<string, unknown>).resources = [
    { resourceId: "resource:capacity", kind: "quantitative-capacity", unit: "person-hour", capacity: "5" },
  ];
  const mismatchInitiative = (mismatch.layer1 as { initiativeTypes: Array<{ eligibilityRules: unknown[] }> }).initiativeTypes[0];
  mismatchInitiative.eligibilityRules.push({
    ruleId: "rule:wrong-kind",
    kind: "exclusive-resource-available",
    resourceId: "resource:capacity",
    reservation: "while-active",
  });
  assert.ok(issueCodes(mismatch).includes("resource-kind-mismatch"));
});

test("quantitative resources require exact canonical decimals and exact unit identity", () => {
  for (const capacity of [1.5, "1.0", "-1", "1e3"]) {
    const raw = minimalLayer1ContractMtcV1();
    (raw.layer1 as Record<string, unknown>).resources = [
      { resourceId: "resource:capacity", kind: "quantitative-capacity", unit: "person-hour", capacity },
    ];
    assert.ok(issueCodes(raw).includes("invalid-decimal"));
  }
  const raw = minimalLayer1ContractMtcV1();
  (raw.layer1 as Record<string, unknown>).resources = [
    { resourceId: "resource:capacity", kind: "quantitative-capacity", unit: "person-hour", capacity: "5" },
  ];
  const initiative = (raw.layer1 as { initiativeTypes: Array<{ eligibilityRules: unknown[] }> }).initiativeTypes[0];
  initiative.eligibilityRules.push({
    ruleId: "rule:capacity",
    kind: "quantitative-capacity-available",
    resourceId: "resource:capacity",
    amount: "1",
    unit: "count",
    reservation: "while-active",
  });
  assert.ok(issueCodes(raw).includes("unit-mismatch"));
});

test("entitlement consumption exactly matches reusable and consumable kinds", () => {
  for (const [kind, consumption] of [["reusable", "consume-on-admission"], ["consumable", "retain"]] as const) {
    const raw = minimalLayer1ContractMtcV1();
    (raw.layer1 as Record<string, unknown>).entitlements = [{ entitlementId: "entitlement:test", kind }];
    const initiative = (raw.layer1 as { initiativeTypes: Array<{ eligibilityRules: unknown[] }> }).initiativeTypes[0];
    initiative.eligibilityRules.push({ ruleId: "rule:entitlement", kind: "entitlement-available", entitlementId: "entitlement:test", consumption });
    assert.ok(issueCodes(raw).includes("entitlement-kind-mismatch"));
  }
});

test("observation edges reject self edges, duplicate pairs, unknown nodes, and cycles", () => {
  const self = minimalTwoLayerContractMtcV1();
  const selfEdge = ((self.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0];
  selfEdge.targetNodeId = selfEdge.sourceNodeId;
  assert.ok(issueCodes(self).includes("self-edge"));

  const duplicate = minimalTwoLayerContractMtcV1();
  const duplicateEdges = (duplicate.layer2 as { edges: Array<Record<string, unknown>> }).edges;
  duplicateEdges.push({ ...clone(duplicateEdges[0]), edgeId: "edge:duplicate" });
  assert.ok(issueCodes(duplicate).includes("duplicate-observation-edge"));

  const unknown = minimalTwoLayerContractMtcV1();
  ((unknown.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0].targetNodeId = "observation:missing";
  assert.ok(issueCodes(unknown).includes("unknown-reference"));

  const cycle = minimalTwoLayerContractMtcV1();
  (cycle.layer2 as { edges: Array<Record<string, unknown>> }).edges.push({
    edgeId: "edge:terminal-source",
    sourceNodeId: "observation:terminal",
    targetNodeId: "observation:source",
    relationship: "directional-causal-observation",
    persistence: "none",
    evidence: { kind: "explicit-assumption", rationale: "Cycle mutation" },
  });
  assert.ok(issueCodes(cycle).includes("causal-cycle"));
});

test("edges require explicit valid evidence or an explicit assumption", () => {
  const missing = minimalTwoLayerContractMtcV1();
  delete ((missing.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0].evidence;
  assert.ok(issueCodes(missing).includes("missing-field"));

  const invalid = minimalTwoLayerContractMtcV1();
  ((invalid.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0].evidence = {
    kind: "evidence-reference",
    evidenceId: "evidence:missing",
  };
  assert.ok(issueCodes(invalid).includes("unknown-reference"));
});

test("Layer 2 to Layer 1 authority bridges are structurally rejected", () => {
  const targetBridge = minimalTwoLayerContractMtcV1();
  (targetBridge.layer1 as Record<string, unknown>).resources = [
    { resourceId: "resource:exclusive", kind: "exclusive" },
  ];
  ((targetBridge.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0].targetNodeId = "resource:exclusive";
  assert.ok(issueCodes(targetBridge).includes("forbidden-cross-layer-reference"));

  for (const [field, value] of [
    ["admission", "allow"],
    ["resourceEffect", "reserve"],
    ["entitlementEffect", "consume"],
    ["threshold", "1"],
    ["promote", true],
  ] as const) {
    const raw = minimalTwoLayerContractMtcV1();
    ((raw.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0][field] = value;
    assert.ok(issueCodes(raw).includes("unknown-field"), field);
  }

  const predicateBridge = minimalLayer1ContractMtcV1();
  const initiative = (predicateBridge.layer1 as { initiativeTypes: Array<{ eligibilityRules: unknown[] }> }).initiativeTypes[0];
  initiative.eligibilityRules.push({ ruleId: "rule:observation", kind: "observation-status", observationNodeId: "observation:source" });
  assert.ok(issueCodes(predicateBridge).includes("invalid-discriminant"));
});

test("hard node limit and bounded DAG depth reject limit plus one", () => {
  const nodesOver = minimalLayer1ContractMtcV1();
  (nodesOver.layer2 as Record<string, unknown>).nodes = Array.from(
    { length: CONTRACT_LIMITS_MTC_V1.maxObservationNodes + 1 },
    (_, index) => ({ nodeId: `observation:n-${index}` }),
  );
  assert.ok(issueCodes(nodesOver).includes("limit-exceeded"));

  const deep = minimalLayer1ContractMtcV1();
  const count = CONTRACT_LIMITS_MTC_V1.maxObservationDepth + 1;
  (deep.layer2 as Record<string, unknown>).nodes = Array.from(
    { length: count },
    (_, index) => ({ nodeId: `observation:depth-${index}` }),
  );
  (deep.layer2 as Record<string, unknown>).edges = Array.from(
    { length: count - 1 },
    (_, index) => ({
      edgeId: `edge:depth-${index}`,
      sourceNodeId: `observation:depth-${index}`,
      targetNodeId: `observation:depth-${index + 1}`,
      relationship: "directional-causal-observation",
      persistence: "none",
      evidence: { kind: "explicit-assumption", rationale: "Depth fixture" },
    }),
  );
  assert.ok(issueCodes(deep).includes("causal-depth-exceeded"));
});

test("semantic-set reordering is identity-neutral", () => {
  const first = valid(minimalTwoLayerContractMtcV1());
  const reordered = minimalTwoLayerContractMtcV1();
  (reordered.evidence as unknown[]).reverse();
  (reordered.layer2 as { nodes: unknown[]; edges: unknown[] }).nodes.reverse();
  (reordered.layer2 as { nodes: unknown[]; edges: unknown[] }).edges.reverse();
  const second = valid(reordered);
  assert.equal(contractSemanticIdentityMtcV1(first), contractSemanticIdentityMtcV1(second));
});

test("semantic identity includes semantics and excludes display labels", () => {
  const base = minimalTwoLayerContractMtcV1();
  const baseIdentity = contractSemanticIdentityMtcV1(valid(base));

  const display = clone(base);
  ((display.layer2 as { nodes: Array<Record<string, unknown>> }).nodes)[0].label = "Changed display label";
  assert.equal(contractSemanticIdentityMtcV1(valid(display)), baseIdentity);

  const semantics = clone(base);
  ((semantics.layer2 as { edges: Array<Record<string, unknown>> }).edges)[0].persistence = "declared-persistent";
  assert.notEqual(contractSemanticIdentityMtcV1(valid(semantics)), baseIdentity);

  const evidence = clone(base);
  ((evidence.evidence as Array<Record<string, unknown>>)[0]).reference = "Changed evidence reference";
  assert.notEqual(contractSemanticIdentityMtcV1(valid(evidence)), baseIdentity);
});
