import test from "node:test";
import assert from "node:assert/strict";

import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import { parseScenarioMtcV1 } from "../scenario/parseScenarioMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { domainNeutralScenarioMtcV1 } from "../testSupport/domainNeutralScenarioMtcV1";
import { runLayer1MtcV1 } from "./runLayer1MtcV1";

function rawContract(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1", semanticId: "contract:execution-fixture", revision: 1,
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

function validatedContract(raw = rawContract()): TwoLayerMtcContractV1 {
  const result = parseContractMtcV1(raw); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: TwoLayerMtcContractV1 }).value;
}

function prepared(contract = validatedContract(), mutate?: (raw: Record<string, unknown>) => void): PreparedScenarioMtcV1 {
  const raw = domainNeutralScenarioMtcV1(contract); mutate?.(raw);
  const result = parseScenarioMtcV1(raw, contract); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return (result as { ok: true; value: PreparedScenarioMtcV1 }).value;
}

function initiatives(raw: Record<string, unknown>): Array<Record<string, unknown>> { return raw.initiatives as Array<Record<string, unknown>>; }
function initiativeState(outcome: ReturnType<typeof runLayer1MtcV1>, id: string): string {
  const state = outcome.status === "completed-horizon" ? outcome.terminalState : outcome.lastCommittedState;
  return state.initiatives.find((item) => item.instanceId === id)!.lifecycle;
}

test("executes exact pending-active-completed timing and preserves active-at-horizon", () => {
  const contract = validatedContract(); const scenario = prepared(contract); const outcome = runLayer1MtcV1(scenario, contract);
  assert.equal(outcome.status, "completed-horizon");
  if (outcome.status !== "completed-horizon") return;
  assert.equal(outcome.history[0].period, 1);
  assert.deepEqual(outcome.history[0].lifecycleTransitions, [{ instanceId: "instance:foundation", from: "pending", to: "active" }]);
  assert.deepEqual(outcome.history[1].completions, ["instance:foundation"]);
  assert.deepEqual(outcome.history[1].lifecycleTransitions, [
    { instanceId: "instance:delivery-a", from: "pending", to: "active" },
    { instanceId: "instance:foundation", from: "active", to: "completed" },
  ]);
  assert.deepEqual(outcome.history[4].completions, ["instance:delivery-a"]);
  assert.equal(initiativeState(outcome, "instance:delivery-b"), "active");
  assert.equal(outcome.terminalBoundary.boundary, 7);
  assert.deepEqual(outcome.terminalBoundary.completions, []);
});

test("completed prerequisite is enforced authoritatively and never executes despite a block", () => {
  const contract = validatedContract();
  const scenario = prepared(contract, (raw) => { initiatives(raw)[1].scheduledStartPeriod = 1; });
  const outcome = runLayer1MtcV1(scenario, contract);
  assert.equal(outcome.status, "completed-horizon");
  const decision = outcome.history[0].eligibility.find((item) => item.instanceId === "instance:delivery-a")!;
  assert.equal(decision.eligible, false);
  assert.deepEqual(decision.reasons.map((item) => item.code), ["prerequisite-incomplete"]);
  assert.equal(outcome.history[0].admissions.find((item) => item.instanceId === "instance:delivery-a")!.status, "not-admitted-ineligible");
  assert.equal(initiativeState(outcome, "instance:delivery-a"), "pending");
  assert.equal(JSON.stringify(outcome).includes("executed-despite-structural-block"), false);
});

test("active resources reject candidates and release exactly at completion boundary for later admission", () => {
  const contract = validatedContract();
  const blocked = runLayer1MtcV1(prepared(contract, (raw) => { initiatives(raw)[2].scheduledStartPeriod = 3; }), contract);
  assert.equal(blocked.status, "completed-horizon");
  assert.deepEqual(blocked.history[2].eligibility[0].reasons.map((item) => item.code), ["exclusive-resource-unavailable"]);
  assert.equal(initiativeState(blocked, "instance:delivery-b"), "pending");

  const released = runLayer1MtcV1(prepared(contract), contract);
  assert.equal(released.status, "completed-horizon");
  assert.deepEqual(released.history[3].releases, []);
  assert.equal(released.history[4].releases.length, 2);
  assert.equal(released.history[4].admissions.find((item) => item.instanceId === "instance:delivery-b")!.status, "admitted");
});

test("blocking constraints and unavailable reusable or consumed entitlements prevent admission", () => {
  const contract = validatedContract();
  for (const [mutate, expected] of [
    [(raw: Record<string, unknown>) => { (raw.initialConstraints as Array<Record<string, unknown>>)[0].state = "present"; }, "constraint-present"],
    [(raw: Record<string, unknown>) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[0].state = "unavailable"; }, "entitlement-unavailable"],
    [(raw: Record<string, unknown>) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[1].state = "consumed"; }, "entitlement-unavailable"],
  ] as const) {
    const outcome = runLayer1MtcV1(prepared(contract, mutate), contract);
    assert.equal(outcome.status, "completed-horizon");
    assert.ok(outcome.history[2].eligibility[0].reasons.some((item) => item.code === expected));
    assert.equal(initiativeState(outcome, "instance:independent"), "pending");
  }
});

test("consumable entitlement is consumed once while reusable entitlement remains available", () => {
  const contract = validatedContract();
  const scenario = prepared(contract, (raw) => {
    initiatives(raw).push({ ...structuredClone(initiatives(raw)[3]), instanceId: "instance:independent-later", scheduledStartPeriod: 4 });
  });
  const outcome = runLayer1MtcV1(scenario, contract); assert.equal(outcome.status, "completed-horizon");
  assert.equal(outcome.history[2].entitlementConsumptions.length, 1);
  assert.equal(outcome.history[3].eligibility[0].eligible, false);
  assert.deepEqual(outcome.history[3].eligibility[0].reasons.map((item) => item.code), ["entitlement-unavailable"]);
  if (outcome.status !== "completed-horizon") return;
  assert.equal(outcome.terminalState.entitlements.find((item) => item.entitlementId === "entitlement:membership")!.state, "available");
  assert.equal(outcome.terminalState.entitlements.find((item) => item.entitlementId === "entitlement:permit")!.state, "consumed");
});

test("simultaneous exclusive and consumable contention fail unresolved without incidental selection", () => {
  const contract = validatedContract();
  const exclusive = prepared(contract, (raw) => { initiatives(raw)[2].scheduledStartPeriod = 2; });
  const exclusiveOutcome = runLayer1MtcV1(exclusive, contract);
  assert.equal(exclusiveOutcome.status, "failed-unresolved");
  if (exclusiveOutcome.status === "failed-unresolved") {
    assert.equal(exclusiveOutcome.failedPeriod, 2);
    assert.deepEqual(exclusiveOutcome.attempt.conflicts.map((item) => item.code), ["simultaneous-exclusive-conflict"]);
    assert.equal(exclusiveOutcome.lastCommittedState.committedThroughPeriod, 1);
  }
  const consumable = prepared(contract, (raw) => {
    initiatives(raw).push({ ...structuredClone(initiatives(raw)[3]), instanceId: "instance:independent-second" });
  });
  const consumableOutcome = runLayer1MtcV1(consumable, contract);
  assert.equal(consumableOutcome.status, "failed-unresolved");
  if (consumableOutcome.status === "failed-unresolved") assert.deepEqual(consumableOutcome.attempt.conflicts.map((item) => item.code), ["simultaneous-consumable-conflict"]);
});

test("failed period rolls tentative completion and release back atomically and stops future periods", () => {
  const contract = validatedContract();
  const scenario = prepared(contract, (raw) => {
    initiatives(raw).push({ ...structuredClone(initiatives(raw)[2]), instanceId: "instance:delivery-c" });
  });
  const outcome = runLayer1MtcV1(scenario, contract); assert.equal(outcome.status, "failed-unresolved");
  if (outcome.status !== "failed-unresolved") return;
  assert.equal(outcome.failedPeriod, 5);
  assert.deepEqual(outcome.attempt.tentativeCompletions, ["instance:delivery-a"]);
  assert.equal(outcome.attempt.tentativeReleases.length, 2);
  assert.equal(outcome.lastCommittedState.committedThroughPeriod, 4);
  assert.equal(outcome.lastCommittedState.initiatives.find((item) => item.instanceId === "instance:delivery-a")!.lifecycle, "active");
  assert.equal(outcome.history.length, 4);
});

function capacityFixture(capacity: string, activeAmount: string, candidateAmount: string) {
  const raw = rawContract(); const layer1 = raw.layer1 as Record<string, unknown>;
  const resources = layer1.resources as Array<Record<string, unknown>>; resources[1].capacity = capacity;
  const types = layer1.initiativeTypes as Array<Record<string, unknown>>;
  types[0].eligibilityRules = [{ ruleId: "rule:foundation-capacity", kind: "quantitative-capacity-available", resourceId: "resource:team", amount: activeAmount, unit: "person", reservation: "while-active" }];
  types[2].eligibilityRules = [{ ruleId: "rule:delivery-capacity", kind: "quantitative-capacity-available", resourceId: "resource:team", amount: candidateAmount, unit: "person", reservation: "while-active" }];
  const contract = validatedContract(raw);
  const scenario = prepared(contract, (scenarioRaw) => {
    const rows = initiatives(scenarioRaw); rows.splice(2, 2); rows[0].durationPeriods = 3;
    rows[0].resourceClaims = [{ ruleId: "rule:foundation-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: activeAmount, unit: "person", reservation: "while-active" }];
    rows[1].scheduledStartPeriod = 2; rows[1].dependencies = [];
    rows[1].resourceClaims = [{ ruleId: "rule:delivery-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: candidateAmount, unit: "person", reservation: "while-active" }];
    const scenarioResources = scenarioRaw.resources as Array<Record<string, unknown>>;
    scenarioResources[1].capacity = capacity; scenarioResources[1].initialAvailableCapacity = capacity;
  });
  return { contract, scenario };
}

test("quantitative capacity uses exact decimal arithmetic for feasible and infeasible candidates", () => {
  const feasible = capacityFixture("10", "6", "4"); const accepted = runLayer1MtcV1(feasible.scenario, feasible.contract);
  assert.equal(accepted.status, "completed-horizon");
  assert.equal(accepted.history[1].admissions[0].status, "admitted");
  const period2StateIdentity = accepted.history[1].resultingStateIdentity;
  assert.ok(period2StateIdentity.length === 64);

  const infeasible = capacityFixture("10", "6", "5"); const rejected = runLayer1MtcV1(infeasible.scenario, infeasible.contract);
  assert.equal(rejected.status, "completed-horizon");
  assert.deepEqual(rejected.history[1].eligibility[0].reasons.map((item) => item.code), ["quantitative-capacity-insufficient"]);

  const exact = capacityFixture("3.3", "1.1", "2.2"); const exactOutcome = runLayer1MtcV1(exact.scenario, exact.contract);
  assert.equal(exactOutcome.history[1].admissions[0].status, "admitted");
});

test("simultaneous quantitative over-capacity is unresolved instead of selecting a cohort", () => {
  const fixture = capacityFixture("10", "6", "3");
  const raw = domainNeutralScenarioMtcV1(fixture.contract);
  const rows = initiatives(raw); rows.splice(2, 2); rows[0].durationPeriods = 3;
  rows[0].resourceClaims = [{ ruleId: "rule:foundation-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: "6", unit: "person", reservation: "while-active" }];
  rows[1].scheduledStartPeriod = 2; rows[1].dependencies = [];
  rows[1].resourceClaims = [{ ruleId: "rule:delivery-capacity", resourceInstanceId: "resource-instance:team-1", kind: "quantitative-capacity", amount: "3", unit: "person", reservation: "while-active" }];
  rows.push({ ...structuredClone(rows[1]), instanceId: "instance:delivery-second" });
  const resources = raw.resources as Array<Record<string, unknown>>; resources[1].capacity = "10"; resources[1].initialAvailableCapacity = "10";
  const parsed = parseScenarioMtcV1(raw, fixture.contract); assert.equal(parsed.ok, true);
  const outcome = runLayer1MtcV1((parsed as { ok: true; value: PreparedScenarioMtcV1 }).value, fixture.contract);
  assert.equal(outcome.status, "failed-unresolved");
  if (outcome.status === "failed-unresolved") assert.deepEqual(outcome.attempt.conflicts.map((item) => item.code), ["simultaneous-capacity-conflict"]);
});

test("replay and unordered declaration mutations are byte-identical and input remains immutable", () => {
  const contract = validatedContract(); const firstScenario = prepared(contract); const before = structuredClone(firstScenario);
  const first = runLayer1MtcV1(firstScenario, contract); const second = runLayer1MtcV1(firstScenario, contract);
  assert.deepEqual(first, second); assert.deepEqual(firstScenario, before); assert.equal(Object.isFrozen(first), true);
  const raw = domainNeutralScenarioMtcV1(contract);
  (raw.initiatives as unknown[]).reverse(); (raw.resources as unknown[]).reverse();
  (raw.initialConstraints as unknown[]).reverse(); (raw.initialEntitlements as unknown[]).reverse();
  for (const item of initiatives(raw)) { (item.dependencies as unknown[]).reverse(); (item.resourceClaims as unknown[]).reverse(); }
  const parsed = parseScenarioMtcV1(raw, contract); assert.equal(parsed.ok, true);
  const reordered = runLayer1MtcV1((parsed as { ok: true; value: PreparedScenarioMtcV1 }).value, contract);
  assert.deepEqual(reordered, first);
});

test("execution rejects tampered prepared scenario identity", () => {
  const contract = validatedContract(); const scenario = structuredClone(prepared(contract));
  (scenario as unknown as Record<string, unknown>).semanticIdentity = "0".repeat(64);
  assert.throws(() => runLayer1MtcV1(scenario, contract), /identity verification failed/);
});
