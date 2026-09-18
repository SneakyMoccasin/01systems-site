import test from "node:test";
import assert from "node:assert/strict";

import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { domainNeutralScenarioMtcV1 } from "../testSupport/domainNeutralScenarioMtcV1";
import { parseScenarioJsonMtcV1, parseScenarioMtcV1 } from "./parseScenarioMtcV1";

function contractRaw(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1", semanticId: "contract:scenario-fixture", revision: 1,
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
      resources: [
        { resourceId: "resource:room", kind: "exclusive" },
        { resourceId: "resource:team", kind: "quantitative-capacity", unit: "person", capacity: "5" },
      ],
      constraints: [{ constraintId: "constraint:hold", kind: "blocking" }],
      entitlements: [
        { entitlementId: "entitlement:membership", kind: "reusable" },
        { entitlementId: "entitlement:permit", kind: "consumable" },
      ],
    },
    layer2: { resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1", nodes: [], edges: [] },
  };
}

function contract(): TwoLayerMtcContractV1 {
  const result = parseContractMtcV1(contractRaw());
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: TwoLayerMtcContractV1 }).value;
}

function valid(raw: unknown, domain = contract()) {
  const result = parseScenarioMtcV1(raw, domain);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected valid scenario");
  return result.value;
}

function codes(raw: unknown, domain = contract()): string[] {
  const result = parseScenarioMtcV1(raw, domain);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

function clone<T>(value: T): T { return structuredClone(value); }
function initiatives(raw: Record<string, unknown>): Array<Record<string, unknown>> { return raw.initiatives as Array<Record<string, unknown>>; }

test("prepares a detached immutable scenario with explicit duration and horizon semantics", () => {
  const domain = contract(); const raw = domainNeutralScenarioMtcV1(domain); const prepared = valid(raw, domain);
  const one = prepared.initiatives.find((item) => item.instanceId === "instance:foundation")!;
  const three = prepared.initiatives.find((item) => item.instanceId === "instance:delivery-a")!;
  const terminal = prepared.initiatives.find((item) => item.instanceId === "instance:delivery-b")!;
  assert.deepEqual([one.scheduledStartPeriod, one.completionBoundary, one.terminalLifecycle], [1, 2, "completed"]);
  assert.deepEqual([three.scheduledStartPeriod, three.completionBoundary, three.terminalLifecycle], [2, 5, "completed"]);
  assert.deepEqual([terminal.scheduledStartPeriod, terminal.completionBoundary, terminal.terminalLifecycle], [5, 8, "active"]);
  (initiatives(raw)[0] as Record<string, unknown>).durationPeriods = 99;
  assert.equal(one.durationPeriods, 1);
  assert.equal(Object.isFrozen(prepared), true);
  assert.equal(Object.isFrozen(prepared.initiatives[0].dependencies), true);
});

test("identity repeats, ignores set insertion order and display metadata, and binds semantic changes", () => {
  const domain = contract(); const base = domainNeutralScenarioMtcV1(domain);
  const identity = valid(base, domain).semanticIdentity;
  assert.equal(valid(base, domain).semanticIdentity, identity);
  const reordered = clone(base);
  (reordered.initiatives as unknown[]).reverse(); (reordered.resources as unknown[]).reverse();
  (reordered.initialEntitlements as unknown[]).reverse();
  for (const item of initiatives(reordered)) {
    (item.dependencies as unknown[]).reverse(); (item.resourceClaims as unknown[]).reverse();
  }
  assert.equal(valid(reordered, domain).semanticIdentity, identity);
  const renamed = clone(base); (renamed.metadata as Record<string, unknown>).displayName = "Another label";
  assert.equal(valid(renamed, domain).semanticIdentity, identity);
  for (const mutate of [
    (raw: Record<string, unknown>) => { initiatives(raw)[0].scheduledStartPeriod = 2; },
    (raw: Record<string, unknown>) => { initiatives(raw)[0].durationPeriods = 2; },
    (raw: Record<string, unknown>) => { (raw.initialConstraints as Array<Record<string, unknown>>)[0].state = "present"; },
    (raw: Record<string, unknown>) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[1].state = "consumed"; },
    (raw: Record<string, unknown>) => { (raw.horizon as Record<string, unknown>).finalPeriod = 7; },
  ]) {
    const changed = clone(base); mutate(changed); assert.notEqual(valid(changed, domain).semanticIdentity, identity);
  }
});

test("domain resource capacity and claim changes are identity-bound without instance semantic overrides", () => {
  const firstDomain = contract(); const first = valid(domainNeutralScenarioMtcV1(firstDomain), firstDomain);
  const changedRaw = contractRaw();
  const resources = (changedRaw.layer1 as Record<string, unknown>).resources as Array<Record<string, unknown>>;
  resources[1].capacity = "6";
  const types = (changedRaw.layer1 as Record<string, unknown>).initiativeTypes as Array<Record<string, unknown>>;
  const deliveryRules = (types[2].eligibilityRules as Array<Record<string, unknown>>);
  deliveryRules[2].amount = "3";
  const parsed = parseContractMtcV1(changedRaw); assert.equal(parsed.ok, true);
  const changedDomain = (parsed as { ok: true; value: TwoLayerMtcContractV1 }).value;
  const changedScenario = domainNeutralScenarioMtcV1(changedDomain);
  const scenarioResources = changedScenario.resources as Array<Record<string, unknown>>;
  scenarioResources[1].capacity = "6"; scenarioResources[1].initialAvailableCapacity = "6";
  for (const item of initiatives(changedScenario)) for (const claim of item.resourceClaims as Array<Record<string, unknown>>) if (claim.kind === "quantitative-capacity") claim.amount = "3";
  assert.notEqual(valid(changedScenario, changedDomain).semanticIdentity, first.semanticIdentity);
});

test("strict structure, version, IDs, schedules, duration, lifecycle, and domain identity fail closed", () => {
  const domain = contract(); const base = domainNeutralScenarioMtcV1(domain);
  const invalidJson = parseScenarioJsonMtcV1("{", domain);
  assert.equal(invalidJson.ok, false);
  assert.equal(invalidJson.ok ? undefined : invalidJson.issues[0].code, "invalid-json");
  const mutations: Array<[string, (raw: Record<string, unknown>) => void]> = [
    ["unknown-field", (raw) => { raw.execution = {}; }],
    ["invalid-discriminant", (raw) => { raw.schemaVersion = "full-v2"; }],
    ["invalid-id", (raw) => { initiatives(raw)[0].instanceId = "bad id"; }],
    ["duplicate-instance-id", (raw) => { initiatives(raw)[1].instanceId = initiatives(raw)[0].instanceId; }],
    ["schedule-outside-horizon", (raw) => { initiatives(raw)[0].scheduledStartPeriod = 0; }],
    ["unsafe-integer", (raw) => { initiatives(raw)[0].durationPeriods = 0; }],
    ["invalid-discriminant", (raw) => { initiatives(raw)[0].initialLifecycle = "active"; }],
    ["domain-identity-mismatch", (raw) => { (raw.domainContract as Record<string, unknown>).semanticIdentity = "0".repeat(64); }],
  ];
  for (const [expected, mutate] of mutations) { const raw = clone(base); mutate(raw); assert.ok(codes(raw, domain).includes(expected), expected); }
});

test("dependency bindings reject unknown, self, duplicate, wrong-type, missing, and cycles independent of order", () => {
  const domain = contract(); const base = domainNeutralScenarioMtcV1(domain);
  const cases: Array<[string, (raw: Record<string, unknown>) => void]> = [
    ["unknown-reference", (raw) => { ((initiatives(raw)[1].dependencies as Array<Record<string, unknown>>)[0]).prerequisiteInstanceId = "instance:missing"; }],
    ["self-dependency", (raw) => { ((initiatives(raw)[1].dependencies as Array<Record<string, unknown>>)[0]).prerequisiteInstanceId = "instance:delivery-a"; }],
    ["duplicate-dependency", (raw) => { const deps = initiatives(raw)[1].dependencies as unknown[]; deps.push(clone(deps[0])); }],
    ["rule-binding-mismatch", (raw) => { ((initiatives(raw)[1].dependencies as Array<Record<string, unknown>>)[0]).prerequisiteInstanceId = "instance:independent"; }],
    ["incomplete-initial-state", (raw) => { initiatives(raw)[1].dependencies = []; }],
    ["dependency-cycle", (raw) => {
      const foundation = initiatives(raw)[0]; foundation.initiativeTypeId = "initiative:delivery";
      foundation.dependencies = [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:delivery-a", condition: "completed" }];
      foundation.resourceClaims = clone(initiatives(raw)[1].resourceClaims);
    }],
  ];
  for (const [expected, mutate] of cases) { const raw = clone(base); mutate(raw); assert.ok(codes(raw, domain).includes(expected), expected); }
  const cycle = clone(base); const foundation = initiatives(cycle)[0]; foundation.initiativeTypeId = "initiative:delivery"; foundation.dependencies = [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:delivery-a", condition: "completed" }]; foundation.resourceClaims = clone(initiatives(cycle)[1].resourceClaims); initiatives(cycle).reverse(); assert.ok(codes(cycle, domain).includes("dependency-cycle"));
});

test("a three-instance completed-prerequisite chain is valid and closing it is cyclic in any declaration order", () => {
  const chainContractRaw = contractRaw();
  const layer1 = chainContractRaw.layer1 as Record<string, unknown>;
  const types = layer1.initiativeTypes as Array<Record<string, unknown>>;
  types.push({ initiativeTypeId: "initiative:middle", lifecycle: "pending-active-completed-v1", eligibilityRules: [
    { ruleId: "rule:middle-prerequisite", kind: "prerequisite-completed", prerequisiteInitiativeTypeId: "initiative:foundation" },
  ] });
  const deliveryRules = types[2].eligibilityRules as Array<Record<string, unknown>>;
  deliveryRules[0].prerequisiteInitiativeTypeId = "initiative:middle";
  const parsed = parseContractMtcV1(chainContractRaw); assert.equal(parsed.ok, true);
  const chainDomain = (parsed as { ok: true; value: TwoLayerMtcContractV1 }).value;
  const chain = domainNeutralScenarioMtcV1(chainDomain);
  for (const item of initiatives(chain).filter((candidate) => candidate.initiativeTypeId === "initiative:delivery")) {
    (item.dependencies as Array<Record<string, unknown>>)[0].prerequisiteInstanceId = "instance:middle";
  }
  initiatives(chain).push({
    instanceId: "instance:middle", initiativeTypeId: "initiative:middle", scheduledStartPeriod: 2,
    durationPeriods: 1, initialLifecycle: "pending",
    dependencies: [{ ruleId: "rule:middle-prerequisite", prerequisiteInstanceId: "instance:foundation", condition: "completed" }],
    resourceClaims: [],
  });
  assert.equal(parseScenarioMtcV1(chain, chainDomain).ok, true);

  const cycleContractRaw = clone(chainContractRaw);
  const cycleTypes = ((cycleContractRaw.layer1 as Record<string, unknown>).initiativeTypes as Array<Record<string, unknown>>);
  cycleTypes[0].eligibilityRules = [{ ruleId: "rule:foundation-prerequisite", kind: "prerequisite-completed", prerequisiteInitiativeTypeId: "initiative:delivery" }];
  const cycleParsed = parseContractMtcV1(cycleContractRaw); assert.equal(cycleParsed.ok, true);
  const cycleDomain = (cycleParsed as { ok: true; value: TwoLayerMtcContractV1 }).value;
  const cycle = domainNeutralScenarioMtcV1(cycleDomain);
  for (const item of initiatives(cycle).filter((candidate) => candidate.initiativeTypeId === "initiative:delivery")) {
    (item.dependencies as Array<Record<string, unknown>>)[0].prerequisiteInstanceId = "instance:middle";
  }
  initiatives(cycle).push({
    instanceId: "instance:middle", initiativeTypeId: "initiative:middle", scheduledStartPeriod: 2,
    durationPeriods: 1, initialLifecycle: "pending",
    dependencies: [{ ruleId: "rule:middle-prerequisite", prerequisiteInstanceId: "instance:foundation", condition: "completed" }],
    resourceClaims: [],
  });
  initiatives(cycle)[0].dependencies = [{ ruleId: "rule:foundation-prerequisite", prerequisiteInstanceId: "instance:delivery-a", condition: "completed" }];
  initiatives(cycle).reverse();
  assert.ok(codes(cycle, cycleDomain).includes("dependency-cycle"));
});

test("resource claims and explicit complete initial states fail closed on every mismatch", () => {
  const domain = contract(); const base = domainNeutralScenarioMtcV1(domain);
  const cases: Array<[string, (raw: Record<string, unknown>) => void]> = [
    ["unknown-reference", (raw) => { (initiatives(raw)[1].resourceClaims as Array<Record<string, unknown>>)[0].resourceInstanceId = "resource-instance:missing"; }],
    ["duplicate-resource-claim", (raw) => { const claims = initiatives(raw)[1].resourceClaims as unknown[]; claims.push(clone(claims[0])); }],
    ["unit-mismatch", (raw) => { (initiatives(raw)[1].resourceClaims as Array<Record<string, unknown>>)[1].unit = "hour"; }],
    ["rule-binding-mismatch", (raw) => { (initiatives(raw)[1].resourceClaims as Array<Record<string, unknown>>)[1].amount = "1"; }],
    ["incomplete-initial-state", (raw) => { initiatives(raw)[1].resourceClaims = []; }],
    ["initial-state-mismatch", (raw) => { (raw.resources as Array<Record<string, unknown>>)[0].initialState = "reserved"; }],
    ["incomplete-initial-state", (raw) => { raw.initialConstraints = []; }],
    ["duplicate-initial-state", (raw) => { const states = raw.initialConstraints as unknown[]; states.push(clone(states[0])); }],
    ["initial-state-mismatch", (raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[0].state = "consumed"; }],
    ["initial-state-mismatch", (raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[1].kind = "reusable"; }],
  ];
  for (const [expected, mutate] of cases) { const raw = clone(base); mutate(raw); assert.ok(codes(raw, domain).includes(expected), expected); }
});
