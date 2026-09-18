import test from "node:test";
import assert from "node:assert/strict";

import { compareSingleRunsMtcV1 } from "./compareSingleRunsMtcV1";
import { comparisonRunFixtureMtcV1 } from "../testSupport/domainNeutralComparisonFixtureMtcV1";

test("identical runs produce an honest no-compared-difference result", () => {
  const run = comparisonRunFixtureMtcV1(); const result = compareSingleRunsMtcV1(run, run);
  assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.equal(result.outcome, "no-compared-difference"); assert.equal(result.historicalDivergence, false);
  assert.deepEqual(result.differences, []); assert.equal(result.terminalStructuralEquivalent, true); assert.equal(result.terminalDecisionSpaceEquivalent, true);
});

test("sequence-only comparison finds deterministic structural, Decision Space and Layer 2 differences", () => {
  const a = comparisonRunFixtureMtcV1({ foundationPeriod: 1, independentPeriod: 4 });
  const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2, independentPeriod: 5 });
  const result = compareSingleRunsMtcV1(a, b); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.equal(result.outcome, "compared-differences"); assert.equal(result.firstDivergence?.point.period, 1);
  assert.ok((result.firstDivergence?.dimensions.length ?? 0) > 1);
  assert.ok(result.differences.some((d) => d.dimension === "initiative-lifecycle"));
  assert.ok(result.differences.some((d) => d.dimension === "decision-space"));
  assert.ok(result.differences.some((d) => d.dimension === "layer2-observation"));
  assert.ok(result.differences.some((d) => d.dimension === "layer2-paths"));
  assert.ok(result.intervals.some((item) => item.convergencePoint));
});

test("persistent causal provenance may differ while Decision Space is equal before a later Decision Space difference", () => {
  const a = comparisonRunFixtureMtcV1({ foundationPeriod: 1, independentPeriod: 4 }); const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2, independentPeriod: 5 });
  const result = compareSingleRunsMtcV1(a, b); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  const causalAtThree = result.differences.filter((d) => d.point.period === 3 && d.dimension === "layer2-paths");
  const decisionAtThree = result.differences.filter((d) => d.point.period === 3 && d.dimension === "decision-space");
  assert.ok(causalAtThree.length > 0); assert.equal(decisionAtThree.length, 0);
  assert.ok(result.differences.some((d) => d.point.period === 4 && d.dimension === "decision-space"));
  assert.ok(causalAtThree.every((d) => (d.provenance.aPathIdentities?.length ?? 0) > 0 && (d.provenance.bPathIdentities?.length ?? 0) > 0));
});

test("Decision Space oriented sets and reason chains swap mechanically with A/B orientation", () => {
  const a = comparisonRunFixtureMtcV1({ independentPeriod: 4 }); const b = comparisonRunFixtureMtcV1({ independentPeriod: 5 });
  const ab = compareSingleRunsMtcV1(a, b); const ba = compareSingleRunsMtcV1(b, a);
  assert.equal(ab.status, "compared"); assert.equal(ba.status, "compared"); if (ab.status !== "compared" || ba.status !== "compared") return;
  const abd = ab.decisionSpaceDifferences.find((d) => d.point.period === 4)!; const bad = ba.decisionSpaceDifferences.find((d) => d.point.period === 4)!;
  assert.deepEqual(abd.eligibleOnlyA, bad.eligibleOnlyB); assert.deepEqual(abd.eligibleOnlyB, bad.eligibleOnlyA);
  assert.notEqual(ab.comparisonIdentity, ba.comparisonIdentity);
  assert.ok(abd.classificationDifferences.every((d) => d.a.reasons && d.b.reasons));
});

test("temporary history divergence and terminal equivalence are both retained", () => {
  const a = comparisonRunFixtureMtcV1({ foundationPeriod: 1, independentPeriod: 4 }); const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2, independentPeriod: 5 });
  const result = compareSingleRunsMtcV1(a, b); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.equal(result.historicalDivergence, true); assert.equal(result.terminalStructuralEquivalent, true); assert.equal(result.terminalDecisionSpaceEquivalent, true);
});

test("sequence-only fairness fails closed for every non-schedule semantic mutation", () => {
  const base = comparisonRunFixtureMtcV1();
  const mutations = [
    comparisonRunFixtureMtcV1({ mutateScenario: (raw) => { (raw.initialConstraints as Array<Record<string, unknown>>)[0].state = "present"; } }),
    comparisonRunFixtureMtcV1({ mutateScenario: (raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>)[1].state = "consumed"; } }),
    comparisonRunFixtureMtcV1({ mutateScenario: (raw) => { raw.horizon = { firstPeriod: 1, finalPeriod: 5 }; } }),
    comparisonRunFixtureMtcV1({ mutateContract: (raw) => { ((raw.layer1 as Record<string, unknown>).resources as Array<Record<string, unknown>>)[1].capacity = "6"; }, mutateScenario: (raw) => { const resource = (raw.resources as Array<Record<string, unknown>>)[1]; resource.capacity = "6"; resource.initialAvailableCapacity = "6"; } }),
    comparisonRunFixtureMtcV1({ mutateContract: (raw) => { (raw.evidence as Array<Record<string, unknown>>)[0].reference = "changed evidence"; } }),
    comparisonRunFixtureMtcV1({ mutateContract: (raw) => { (((raw.layer1 as Record<string, unknown>).initiativeTypes as Array<Record<string, unknown>>)[2].eligibilityRules as Array<Record<string, unknown>>)[0].prerequisiteInitiativeTypeId = "initiative:independent"; } }),
    comparisonRunFixtureMtcV1({ mutateContract: (raw) => { ((raw.layer2 as Record<string, unknown>).nodes as Array<Record<string, unknown>>).push({ nodeId: "observation:extra" }); } }),
    comparisonRunFixtureMtcV1({ mutateContract: (raw) => { ((raw.layer2 as Record<string, unknown>).edges as Array<Record<string, unknown>>)[0].persistence = "none"; } }),
    comparisonRunFixtureMtcV1({ mutateBindings: (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].eventKind = "initiative-completed"; } }),
  ];
  for (const changed of mutations) { const result = compareSingleRunsMtcV1(base, changed); assert.equal(result.status, "not-comparable"); if (result.status === "not-comparable") assert.ok(result.reasons.length > 0); }
});

test("completed versus unresolved is limited to the common authoritative boundary without preference", () => {
  const addSecond = (samePeriod: boolean) => (raw: Record<string, unknown>) => { const rows = raw.initiatives as Array<Record<string, unknown>>; rows.push({ ...structuredClone(rows[1]), instanceId: "instance:independent-second", scheduledStartPeriod: samePeriod ? 4 : 5 }); };
  const completed = comparisonRunFixtureMtcV1({ mutateScenario: addSecond(false) }); const unresolved = comparisonRunFixtureMtcV1({ mutateScenario: addSecond(true) });
  const result = compareSingleRunsMtcV1(completed, unresolved); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.equal(result.completeness, "limited-unresolved"); assert.equal(result.authorityThroughPeriod, 3); assert.equal(result.unresolved.B?.failedPeriod, 4);
  assert.ok(result.differences.every((d) => d.point.period <= 3)); assert.ok(result.differences.some((d) => d.dimension === "run-status"));
});

test("both unresolved preserve same or different canonical conflict evidence", () => {
  const make = (foundationPeriod: number) => comparisonRunFixtureMtcV1({ foundationPeriod, mutateScenario: (raw) => { const rows = raw.initiatives as Array<Record<string, unknown>>; rows[1].scheduledStartPeriod = 4; rows.push({ ...structuredClone(rows[1]), instanceId: "instance:independent-second" }); } });
  const a = make(1), b = make(2); const result = compareSingleRunsMtcV1(a, b); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.equal(result.completeness, "limited-unresolved"); assert.deepEqual(result.unresolved.A?.conflicts, result.unresolved.B?.conflicts);
});

test("failed-bounds is explicit incomplete comparison and not complete causal output", () => {
  const bounded = comparisonRunFixtureMtcV1({ mutateContract: (raw) => { const layer2 = raw.layer2 as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }; layer2.nodes = [{ nodeId: "observation:x" }]; layer2.edges = []; let prior = ["observation:x"]; for (let level = 1; level <= 17; level += 1) { const current = [`observation:l${level}-a`, `observation:l${level}-b`]; layer2.nodes.push(...current.map((nodeId) => ({ nodeId }))); for (const source of prior) for (const target of current) layer2.edges.push({ edgeId: `edge:${source.slice(12)}-${target.slice(12)}`, sourceNodeId: source, targetNodeId: target, relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "bounded" } }); prior = current; } } });
  const result = compareSingleRunsMtcV1(bounded, bounded); assert.equal(result.status, "incomplete-bounds"); if (result.status === "incomplete-bounds") assert.deepEqual(result.boundedSides, ["A", "B"]);
});

test("comparison identity replays, declaration order is neutral, and schedule semantics are sensitive", () => {
  const a = comparisonRunFixtureMtcV1(); const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2 }); const first = compareSingleRunsMtcV1(a, b);
  assert.deepEqual(compareSingleRunsMtcV1(a, b), first);
  const reordered = comparisonRunFixtureMtcV1({ mutateContract: (raw) => { const layer2 = raw.layer2 as { nodes: unknown[]; edges: unknown[] }; layer2.nodes.reverse(); layer2.edges.reverse(); } });
  assert.deepEqual(compareSingleRunsMtcV1(reordered, b).status, "compared");
  const changed = comparisonRunFixtureMtcV1({ foundationPeriod: 3 }); assert.notEqual(compareSingleRunsMtcV1(a, changed).comparisonIdentity, first.comparisonIdentity);
});

test("tempting cardinality and path differences remain descriptive with no valuation mechanism", () => {
  const a = comparisonRunFixtureMtcV1({ foundationPeriod: 1, independentPeriod: 4 }); const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2, independentPeriod: 5 }); const result = compareSingleRunsMtcV1(a, b);
  assert.equal(result.status, "compared");
  const forbidden = new Set(["winner", "loser", "better", "worse", "superior", "inferior", "preferred", "recommendation", "rank", "score", "utility", "value", "benefit", "harm", "severity", "magnitude", "weightedImpact", "optionalityScore", "structuralMargin"]);
  const keys = (value: unknown): string[] => typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]) : [];
  assert.deepEqual(keys(result).filter((key) => forbidden.has(key)), []);
  assert.equal(JSON.stringify(result).includes("more"), false);
});

test("comparison is read-only and cross-run provenance remains oriented", () => {
  const a = comparisonRunFixtureMtcV1(); const b = comparisonRunFixtureMtcV1({ foundationPeriod: 2 }); const beforeA = structuredClone(a.result), beforeB = structuredClone(b.result);
  const result = compareSingleRunsMtcV1(a, b); assert.equal(result.status, "compared"); if (result.status !== "compared") return;
  assert.deepEqual(a.result, beforeA); assert.deepEqual(b.result, beforeB);
  assert.ok(result.differences.every((d) => d.provenance.aResultIdentity === a.result.resultIdentity && d.provenance.bResultIdentity === b.result.resultIdentity));
});
