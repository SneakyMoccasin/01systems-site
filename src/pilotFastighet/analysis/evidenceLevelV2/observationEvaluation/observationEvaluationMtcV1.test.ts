import test from "node:test";
import assert from "node:assert/strict";

import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { deriveObservationSourcesMtcV1 } from "../observationSource/deriveObservationSourcesMtcV1";
import { observationSourceResultIdentityMtcV1 } from "../observationSource/observationSourceIdentityMtcV1";
import type { ObservationSourceBindingResultMtcV1 } from "../observationSource/observationSourceMtcV1";
import { parseObservationSourceBindingsMtcV1 } from "../observationSource/parseObservationSourceBindingsMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import { observationFixtureMtcV1 } from "../testSupport/domainNeutralObservationFixtureMtcV1";
import { evaluateObservationsMtcV1 } from "./evaluateObservationsMtcV1";

test("bound source activates affected node and traverses explicit edges as same-period exposed observations", () => {
  const fixture = observationFixtureMtcV1();
  const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(result.status, "evaluated"); if (result.status !== "evaluated") return;
  assert.deepEqual(result.mechanicallyProducedCategories, ["affected", "exposed"]);
  assert.deepEqual(result.history[0].observations.map(({ nodeId, result: category }) => [nodeId, category]), [
    ["observation:w", "exposed"], ["observation:x", "affected"], ["observation:y", "exposed"], ["observation:z", "exposed"],
  ]);
  assert.equal(result.history[0].observations.some((item) => item.nodeId === "observation:orphan"), false);
  assert.equal(JSON.stringify(result).includes("unchanged"), false);
  assert.equal(JSON.stringify(result).includes("unknown"), false);
});

test("branching and convergence retain every canonical evidence-bearing path without magnitude", () => {
  const fixture = observationFixtureMtcV1(); const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(result.status, "evaluated"); if (result.status !== "evaluated") return;
  const w = result.history[0].observations.find((item) => item.nodeId === "observation:w")!;
  assert.equal(w.result, "exposed"); assert.equal(w.causalPaths.length, 2);
  assert.deepEqual(w.causalPaths.map((path) => path.edgeIds), [["edge:x-y", "edge:y-w"], ["edge:x-z", "edge:z-w"]]);
  assert.equal(w.causalPaths[0].edgeEvidence[0].evidence.kind, "evidence-reference");
  assert.equal(w.causalPaths[1].edgeEvidence[0].evidence.kind, "explicit-assumption");
  assert.equal(JSON.stringify(w).match(/magnitude|weight|score|confidence/g), null);
});

test("non-persistent observations terminate next period while declared persistence continues to horizon then terminates", () => {
  const fixture = observationFixtureMtcV1(); const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(result.status, "evaluated"); if (result.status !== "evaluated") return;
  assert.deepEqual(result.history[1].terminatedNodeIds, ["observation:x", "observation:z"]);
  assert.deepEqual(result.history[1].continuingPersistentNodeIds, ["observation:w", "observation:y"]);
  assert.deepEqual(result.history[1].observations.map((item) => item.nodeId), ["observation:w", "observation:y"]);
  assert.deepEqual(result.history[3].observations.map((item) => item.nodeId), ["observation:w", "observation:y"]);
  assert.deepEqual(result.terminalBoundary, { boundary: 5, terminatedNodeIds: ["observation:w", "observation:y"] });
  const persistent = result.history[0].observations.find((item) => item.nodeId === "observation:y")!.causalPaths[0];
  assert.deepEqual([persistent.firstVisiblePeriod, persistent.finalVisiblePeriod], [1, 4]);
});

test("repeated source activation adds provenance occurrences without strength or duplicate node state", () => {
  const fixture = observationFixtureMtcV1({ includeCompletionBinding: true });
  const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(result.status, "evaluated"); if (result.status !== "evaluated") return;
  assert.equal(result.history[0].observations.filter((item) => item.nodeId === "observation:x").length, 1);
  assert.equal(result.history[1].observations.filter((item) => item.nodeId === "observation:x").length, 1);
  const yAtTwo = result.history[1].observations.find((item) => item.nodeId === "observation:y")!;
  assert.equal(yAtTwo.causalPaths.length, 2);
  assert.equal(new Set(yAtTwo.causalPaths.map((path) => path.sourceEventIdentity)).size, 2);
  assert.deepEqual(result.history[1].consumedBindingIds, ["binding:alpha-completed"]);
  assert.equal(yAtTwo.result, "exposed");
});

test("repeated activation changes only provenance and never categorical state or persistence", () => {
  const single = observationFixtureMtcV1();
  const repeated = observationFixtureMtcV1({ includeCompletionBinding: true });
  const singleResult = evaluateObservationsMtcV1(single.sources, single.bindings, single.contract, single.context);
  const repeatedResult = evaluateObservationsMtcV1(repeated.sources, repeated.bindings, repeated.contract, repeated.context);
  assert.equal(singleResult.status, "evaluated"); assert.equal(repeatedResult.status, "evaluated");
  if (singleResult.status !== "evaluated" || repeatedResult.status !== "evaluated") return;

  const yState = (result: typeof singleResult) => result.history.map((period) => {
    const observation = period.observations.find((item) => item.nodeId === "observation:y")!;
    return {
      period: period.period,
      result: observation.result,
      firstVisiblePeriod: Math.min(...observation.causalPaths.map((path) => path.firstVisiblePeriod)),
      finalVisiblePeriod: Math.max(...observation.causalPaths.map((path) => path.finalVisiblePeriod)),
    };
  });
  assert.deepEqual(yState(repeatedResult), yState(singleResult));
  assert.deepEqual(repeatedResult.terminalBoundary, singleResult.terminalBoundary);
  assert.equal(repeatedResult.terminalBoundary.boundary, repeated.context.finalPeriod + 1);
  assert.equal(repeatedResult.history[1].observations.find((item) => item.nodeId === "observation:y")!.causalPaths.length, 2);
  assert.notDeepEqual(repeatedResult.history[1].observations.find((item) => item.nodeId === "observation:y")!.causalPaths, singleResult.history[1].observations.find((item) => item.nodeId === "observation:y")!.causalPaths);
  assert.equal(JSON.stringify([singleResult, repeatedResult]).match(/magnitude|strength|weight|score/g), null);
  assert.deepEqual(repeated.execution, single.execution);
});

test("multi-path convergence changes only retained paths and never categorical state or persistence", () => {
  const fixture = observationFixtureMtcV1();
  const layer1Before = structuredClone(fixture.execution);
  const singleBindingResult = parseObservationSourceBindingsMtcV1({
    schemaVersion: "ce-two-layer-mtc-source-bindings-v1",
    scenarioIdentity: fixture.scenario.semanticIdentity,
    contractIdentity: contractSemanticIdentityMtcV1(fixture.contract),
    bindings: [{
      bindingId: "binding:alpha-admitted",
      eventKind: "initiative-admitted",
      initiativeInstanceId: "instance:alpha",
      targetNodeId: "observation:z",
    }],
  }, fixture.scenario, fixture.contract);
  assert.equal(singleBindingResult.ok, true); if (!singleBindingResult.ok) return;
  const singleSources = deriveObservationSourcesMtcV1(fixture.execution, fixture.scenario, fixture.contract, singleBindingResult.value);
  const singleResult = evaluateObservationsMtcV1(singleSources, singleBindingResult.value, fixture.contract, fixture.context);
  const multiResult = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(singleResult.status, "evaluated"); assert.equal(multiResult.status, "evaluated");
  if (singleResult.status !== "evaluated" || multiResult.status !== "evaluated") return;

  const wState = (result: typeof singleResult) => result.history.map((period) => {
    const matches = period.observations.filter((item) => item.nodeId === "observation:w");
    assert.equal(matches.length, 1);
    const observation = matches[0];
    return {
      period: period.period,
      result: observation.result,
      firstVisiblePeriod: Math.min(...observation.causalPaths.map((path) => path.firstVisiblePeriod)),
      finalVisiblePeriod: Math.max(...observation.causalPaths.map((path) => path.finalVisiblePeriod)),
    };
  });
  assert.deepEqual(wState(multiResult), wState(singleResult));
  assert.equal(multiResult.terminalBoundary.boundary, singleResult.terminalBoundary.boundary);
  assert.equal(multiResult.terminalBoundary.terminatedNodeIds.some((nodeId) => nodeId === "observation:w"), true);
  assert.equal(singleResult.terminalBoundary.terminatedNodeIds.some((nodeId) => nodeId === "observation:w"), true);
  const multiPaths = multiResult.history[0].observations.find((item) => item.nodeId === "observation:w")!.causalPaths;
  const singlePaths = singleResult.history[0].observations.find((item) => item.nodeId === "observation:w")!.causalPaths;
  assert.deepEqual(multiPaths.map((path) => path.edgeIds), [["edge:x-y", "edge:y-w"], ["edge:x-z", "edge:z-w"]]);
  assert.deepEqual(singlePaths.map((path) => path.edgeIds), [["edge:z-w"]]);
  assert.equal(JSON.stringify([singleResult, multiResult]).match(/magnitude|strength|weight|score/g), null);
  assert.deepEqual(fixture.execution, layer1Before);
  assert.equal(singleSources.executionIdentity, fixture.sources.executionIdentity);
});

test("unmapped sources and failed-period absence create no inferred activation", () => {
  const fixture = observationFixtureMtcV1({ noBindings: true });
  const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.equal(result.status, "evaluated"); if (result.status !== "evaluated") return;
  assert.ok(result.history.every((period) => period.observations.length === 0));
  assert.ok(result.history.every((period) => period.consumedSourceEventIdentities.length === 0));
});

test("repeated evaluation and semantically reordered declarations are identical", () => {
  const fixture = observationFixtureMtcV1(); const first = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.deepEqual(evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context), first);
  const reordered = observationFixtureMtcV1({ mutateContract: (raw) => {
    const layer2 = raw.layer2 as { nodes: unknown[]; edges: unknown[] }; layer2.nodes.reverse(); layer2.edges.reverse();
  } });
  assert.deepEqual(evaluateObservationsMtcV1(reordered.sources, reordered.bindings, reordered.contract, reordered.context), first);
});

test("semantic graph change changes evaluation identity", () => {
  const first = observationFixtureMtcV1(); const firstResult = evaluateObservationsMtcV1(first.sources, first.bindings, first.contract, first.context);
  const changed = observationFixtureMtcV1({ mutateContract: (raw) => {
    const edges = (raw.layer2 as { edges: Array<Record<string, unknown>> }).edges;
    edges.find((edge) => edge.edgeId === "edge:x-z")!.persistence = "declared-persistent";
  } });
  const changedResult = evaluateObservationsMtcV1(changed.sources, changed.bindings, changed.contract, changed.context);
  assert.notEqual(changedResult.evaluationIdentity, firstResult.evaluationIdentity);
  assert.notDeepEqual(changedResult, firstResult);
});

test("Layer 2 evaluation is detached, immutable, and cannot alter Layer 1", () => {
  const fixture = observationFixtureMtcV1(); const before = structuredClone(fixture.execution);
  const result = evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, fixture.context);
  assert.deepEqual(fixture.execution, before);
  assert.equal(Object.isFrozen(result), true);
  if (result.status === "evaluated") assert.equal(Object.isFrozen(result.history[0].observations[0].causalPaths), true);
});

test("source, binding, graph, horizon, and vocabulary mismatches fail closed", () => {
  const fixture = observationFixtureMtcV1();
  const otherGraph = observationFixtureMtcV1({ mutateContract: (raw) => {
    const edges = (raw.layer2 as { edges: Array<Record<string, unknown>> }).edges; edges[0].persistence = "none";
  } });
  assert.throws(() => evaluateObservationsMtcV1(fixture.sources, fixture.bindings, otherGraph.contract, fixture.context), /contract identity mismatch/);
  assert.throws(() => evaluateObservationsMtcV1(fixture.sources, fixture.bindings, fixture.contract, { ...fixture.context, finalPeriod: 5 }), /does not match the scenario horizon/);
  const unsupported = structuredClone(fixture.contract);
  (unsupported.layer2 as unknown as Record<string, unknown>).resultVocabularyVersion = "scored-v2";
  assert.throws(() => evaluateObservationsMtcV1(fixture.sources, fixture.bindings, unsupported, fixture.context), /Unsupported Layer 2 result vocabulary/);
  const tamperedSources = structuredClone(fixture.sources);
  (tamperedSources.activationCandidates[0] as unknown as Record<string, unknown>).targetNodeId = "observation:orphan";
  assert.throws(() => evaluateObservationsMtcV1(tamperedSources, fixture.bindings, fixture.contract, fixture.context), /source result identity verification failed/);
});

test("history-period and path explosion bounds fail explicitly without truncation", () => {
  const fixture = observationFixtureMtcV1();
  const extended = structuredClone(fixture.sources) as ObservationSourceBindingResultMtcV1;
  (extended as unknown as { horizon: { finalPeriod: number } }).horizon.finalPeriod = CONTRACT_LIMITS_MTC_V1.maxObservationHistoryPeriods + 1;
  (extended as unknown as Record<string, unknown>).resultIdentity = observationSourceResultIdentityMtcV1(extended);
  const historyBound = evaluateObservationsMtcV1(extended, fixture.bindings, fixture.contract, { ...fixture.context, finalPeriod: CONTRACT_LIMITS_MTC_V1.maxObservationHistoryPeriods + 1 });
  assert.equal(historyBound.status, "failed-bounds");
  if (historyBound.status === "failed-bounds") assert.equal(historyBound.code, "history-period-limit");

  const explosive = observationFixtureMtcV1({ mutateContract: (raw) => {
    const layer2 = raw.layer2 as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
    layer2.nodes = [{ nodeId: "observation:x" }]; layer2.edges = [];
    let previous = ["observation:x"];
    for (let level = 1; level <= 17; level += 1) {
      const current = [`observation:l${level}-a`, `observation:l${level}-b`];
      layer2.nodes.push(...current.map((nodeId) => ({ nodeId })));
      for (const source of previous) for (const target of current) layer2.edges.push({ edgeId: `edge:${source.slice(12)}-${target.slice(12)}`, sourceNodeId: source, targetNodeId: target, relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "Bound fixture" } });
      previous = current;
    }
  } });
  const pathBound = evaluateObservationsMtcV1(explosive.sources, explosive.bindings, explosive.contract, explosive.context);
  assert.equal(pathBound.status, "failed-bounds");
  if (pathBound.status === "failed-bounds") assert.equal(pathBound.code, "path-limit");
});
