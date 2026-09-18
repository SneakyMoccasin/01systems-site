import test from "node:test";
import assert from "node:assert/strict";

import { evaluateEligibilityMtcV1 } from "../execution/evaluateEligibilityMtcV1";
import { runLayer1MtcV1 } from "../execution/runLayer1MtcV1";
import { evaluateObservationsMtcV1 } from "../observationEvaluation/evaluateObservationsMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import { buildSingleRunResultMtcV1 } from "../singleRunResult/buildSingleRunResultMtcV1";
import { decisionSpaceFixtureMtcV1 } from "../testSupport/domainNeutralDecisionSpaceFixtureMtcV1";
import { observationFixtureMtcV1 } from "../testSupport/domainNeutralObservationFixtureMtcV1";
import { deriveDecisionSpaceHistoryMtcV1 } from "./deriveDecisionSpaceMtcV1";

function initiatives(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  return raw.initiatives as Array<Record<string, unknown>>;
}

test("Decision Space uses the exact CP3B eligibility mechanism and canonical reasons", () => {
  const fixture = decisionSpaceFixtureMtcV1();
  const snapshots = deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  const initial = snapshots[0];
  for (const declaration of fixture.scenario.initiatives) {
    const shared = evaluateEligibilityMtcV1(declaration, fixture.execution.initialState, fixture.contract);
    const projected = initial.classifications.find((item) => item.instanceId === declaration.instanceId)!;
    assert.equal(projected.classification === "eligible-pending", shared.eligible);
    assert.deepEqual(projected.reasons, shared.reasons);
  }
  const periodThreePrior = fixture.execution.history[1].resultingState;
  const declaration = fixture.scenario.initiatives.find((item) => item.instanceId === "instance:independent")!;
  const shared = evaluateEligibilityMtcV1(declaration, periodThreePrior, fixture.contract);
  assert.deepEqual(fixture.execution.history[2].eligibility[0], shared);
});

test("snapshots classify pending eligibility, active non-actions and completed terminal initiatives", () => {
  const fixture = decisionSpaceFixtureMtcV1();
  const snapshots = deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  assert.equal(snapshots[0].semantics, "individual-next-action-eligibility-not-cohort-feasibility");
  assert.deepEqual(snapshots[0].eligibleInitiativeIds, ["instance:foundation", "instance:independent"]);
  assert.deepEqual(snapshots[0].ineligibleInitiativeIds, ["instance:delivery-a", "instance:delivery-b"]);
  assert.deepEqual(snapshots[1].activeInitiativeIds, ["instance:foundation"]);
  assert.equal(snapshots[1].eligibleInitiativeIds.includes("instance:foundation" as never), false);
  assert.ok(snapshots[2].terminalInitiativeIds.some((id) => id === "instance:foundation"));
  assert.ok(snapshots[2].activeInitiativeIds.some((id) => id === "instance:delivery-a"));
  const blocked = snapshots[2].classifications.find((item) => item.instanceId === "instance:delivery-b")!;
  assert.equal(blocked.classification, "ineligible-pending");
  assert.deepEqual(blocked.reasons.map((reason) => reason.code), ["exclusive-resource-unavailable"]);
});

test("individual eligibility remains separate from simultaneous cohort admission", () => {
  const fixture = decisionSpaceFixtureMtcV1((raw) => {
    const independent = structuredClone(initiatives(raw)[3]);
    independent.scheduledStartPeriod = 1;
    raw.initiatives = [independent, { ...structuredClone(independent), instanceId: "instance:independent-second" }];
  });
  assert.equal(fixture.execution.status, "failed-unresolved");
  const initial = deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract)[0];
  assert.deepEqual(initial.eligibleInitiativeIds, ["instance:independent", "instance:independent-second"]);
  if (fixture.execution.status === "failed-unresolved") assert.ok(fixture.execution.attempt.conflicts.some((item) => item.code === "simultaneous-consumable-conflict"));
});

test("prerequisite, reservation, release and entitlement history change Decision Space read-only", () => {
  const fixture = decisionSpaceFixtureMtcV1(); const before = structuredClone(fixture.execution);
  const snapshots = deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  assert.deepEqual(fixture.execution, before);
  const deliveryB = snapshots.map((item) => item.classifications.find((row) => row.instanceId === "instance:delivery-b")!);
  assert.equal(deliveryB[0].reasons.some((reason) => reason.code === "prerequisite-incomplete"), true);
  assert.equal(deliveryB[2].reasons.some((reason) => reason.code === "exclusive-resource-unavailable"), true);
  assert.equal(snapshots[5].activeInitiativeIds.some((id) => id === "instance:delivery-b"), true);
  const independentAfterAdmission = snapshots[3].classifications.find((row) => row.instanceId === "instance:independent")!;
  assert.equal(independentAfterAdmission.classification, "active-not-next-action");
  assert.equal(snapshots[3].committedStateIdentity, fixture.execution.history[2].resultingStateIdentity);
  assert.equal(fixture.execution.history[2].resultingState.entitlements.find((item) => item.entitlementId === "entitlement:membership")!.state, "available");
  assert.equal(fixture.execution.history[2].resultingState.entitlements.find((item) => item.entitlementId === "entitlement:permit")!.state, "consumed");
});

test("same lifecycle with different structural state may differ while different states may share eligible sets", () => {
  const available = decisionSpaceFixtureMtcV1();
  const consumed = decisionSpaceFixtureMtcV1((raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[1].state = "consumed"; });
  const unavailable = decisionSpaceFixtureMtcV1((raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[0].state = "unavailable"; });
  const a = deriveDecisionSpaceHistoryMtcV1(available.execution, available.scenario, available.contract)[0];
  const b = deriveDecisionSpaceHistoryMtcV1(consumed.execution, consumed.scenario, consumed.contract)[0];
  const c = deriveDecisionSpaceHistoryMtcV1(unavailable.execution, unavailable.scenario, unavailable.contract)[0];
  assert.deepEqual(available.execution.initialState.initiatives, consumed.execution.initialState.initiatives);
  assert.notDeepEqual(a.eligibleInitiativeIds, b.eligibleInitiativeIds);
  assert.deepEqual(b.eligibleInitiativeIds, c.eligibleInitiativeIds);
  assert.notEqual(b.committedStateIdentity, c.committedStateIdentity);
  assert.notEqual(b.snapshotIdentity, c.snapshotIdentity);
});

test("snapshot replay and declaration-order normalization are deterministic while semantic state changes identity", () => {
  const fixture = decisionSpaceFixtureMtcV1();
  const first = deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  assert.deepEqual(deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract), first);
  const changed = decisionSpaceFixtureMtcV1((raw) => { (raw.initialConstraints as Array<Record<string, unknown>>)[0].state = "present"; });
  const changedHistory = deriveDecisionSpaceHistoryMtcV1(changed.execution, changed.scenario, changed.contract);
  assert.notEqual(changedHistory[0].snapshotIdentity, first[0].snapshotIdentity);
});

test("single-run completed result preserves structural and causal provenance without valuation", () => {
  const fixture = observationFixtureMtcV1();
  const evaluation = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  const result = buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: fixture.bindings, sources: fixture.sources, evaluation });
  assert.equal(result.status, "completed-resolved");
  assert.equal(result.execution, fixture.execution);
  assert.equal(result.layer2?.evaluation, evaluation);
  assert.equal(result.provenance.structural[0].scenarioIdentity, fixture.scenario.semanticIdentity);
  assert.ok((result.provenance.causal?.pathIdentities.length ?? 0) > 0);
  const forbidden = new Set(["score", "rank", "winner", "loser", "better", "worse", "preferred", "recommendation", "utility", "value", "severity", "magnitude", "structuralMargin"]);
  const keys = (value: unknown): string[] => typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]) : [];
  assert.deepEqual(keys(result).filter((key) => forbidden.has(key)), []);
  assert.equal(Object.isFrozen(result), true);
});

test("failed-unresolved result stops at last committed state and rejects Layer 2 history", () => {
  const fixture = decisionSpaceFixtureMtcV1((raw) => { initiatives(raw)[2].scheduledStartPeriod = 2; });
  assert.equal(fixture.execution.status, "failed-unresolved");
  const result = buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  assert.equal(result.status, "failed-unresolved");
  if (result.status !== "failed-unresolved" || fixture.execution.status !== "failed-unresolved") return;
  assert.equal(result.failedPeriod, fixture.execution.failedPeriod);
  assert.equal(result.decisionSpaceHistory.at(-1)!.committedStateIdentity, fixture.execution.lastCommittedState.stateIdentity);
  assert.equal(result.decisionSpaceHistory.length, fixture.execution.history.length + 1);
  const layer2 = observationFixtureMtcV1(); const evaluation = evaluateObservationsMtcV1(layer2.sources, layer2.bindings, layer2.contract, layer2.context);
  assert.throws(() => buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: layer2.bindings, sources: layer2.sources, evaluation }), /cannot contain fabricated/);
});

test("failed-bounds remains explicit and never presents truncated Layer 2 as complete", () => {
  const fixture = observationFixtureMtcV1({ mutateContract: (raw) => {
    const layer2 = raw.layer2 as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
    layer2.nodes = [{ nodeId: "observation:x" }]; layer2.edges = [];
    let previous = ["observation:x"];
    for (let level = 1; level <= 17; level += 1) {
      const current = [`observation:l${level}-a`, `observation:l${level}-b`]; layer2.nodes.push(...current.map((nodeId) => ({ nodeId })));
      for (const source of previous) for (const target of current) layer2.edges.push({ edgeId: `edge:${source.slice(12)}-${target.slice(12)}`, sourceNodeId: source, targetNodeId: target, relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "Bound fixture" } });
      previous = current;
    }
  } });
  const evaluation = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(evaluation.status, "failed-bounds");
  const result = buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: fixture.bindings, sources: fixture.sources, evaluation });
  assert.equal(result.status, "failed-bounds");
  if (result.status === "failed-bounds") assert.deepEqual(result.boundFailure, { code: "path-limit", limit: CONTRACT_LIMITS_MTC_V1.maxObservationPaths, observed: CONTRACT_LIMITS_MTC_V1.maxObservationPaths + 1 });
  assert.equal("history" in evaluation, false);
});

test("result identity is repeatable, order-neutral and sensitive to semantic run changes", () => {
  const fixture = observationFixtureMtcV1(); const evaluation = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  const first = buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: fixture.bindings, sources: fixture.sources, evaluation });
  assert.deepEqual(buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: fixture.bindings, sources: fixture.sources, evaluation }), first);
  const reordered = observationFixtureMtcV1({ mutateContract: (raw) => { const layer2 = raw.layer2 as { nodes: unknown[]; edges: unknown[] }; layer2.nodes.reverse(); layer2.edges.reverse(); } });
  const reorderedEvaluation = evaluateObservationsMtcV1(reordered.sources, reordered.bindings, reordered.contract, reordered.context);
  assert.deepEqual(buildSingleRunResultMtcV1(reordered.execution, reordered.scenario, reordered.contract, { bindings: reordered.bindings, sources: reordered.sources, evaluation: reorderedEvaluation }), first);
  const changed = observationFixtureMtcV1({ includeCompletionBinding: true }); const changedEvaluation = evaluateObservationsMtcV1(changed.sources, changed.bindings, changed.contract, changed.context);
  const changedResult = buildSingleRunResultMtcV1(changed.execution, changed.scenario, changed.contract, { bindings: changed.bindings, sources: changed.sources, evaluation: changedEvaluation });
  assert.notEqual(changedResult.resultIdentity, first.resultIdentity);
});

test("Decision Space and result derivation cannot mutate Layer 1 or Layer 2", () => {
  const fixture = observationFixtureMtcV1(); const executionBefore = structuredClone(fixture.execution);
  const evaluation = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context); const evaluationBefore = structuredClone(evaluation);
  deriveDecisionSpaceHistoryMtcV1(fixture.execution, fixture.scenario, fixture.contract);
  buildSingleRunResultMtcV1(fixture.execution, fixture.scenario, fixture.contract, { bindings: fixture.bindings, sources: fixture.sources, evaluation });
  assert.deepEqual(fixture.execution, executionBefore); assert.deepEqual(evaluation, evaluationBefore);
  assert.deepEqual(runLayer1MtcV1(fixture.scenario, fixture.contract), fixture.execution);
});
