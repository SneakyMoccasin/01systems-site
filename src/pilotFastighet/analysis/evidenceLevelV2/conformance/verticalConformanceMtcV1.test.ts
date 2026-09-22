import test from "node:test";
import assert from "node:assert/strict";

import { compareSingleRunsMtcV1 } from "../comparison/compareSingleRunsMtcV1";
import { comparisonIdentityMtcV1 } from "../comparison/comparisonIdentityMtcV1";
import type { ComparisonResultMtcV1 } from "../comparison/comparisonMtcV1";
import { MAX_PROJECTED_FINDINGS_MTC_V1, projectComparisonFindingsMtcV1 } from "./projectComparisonFindingsMtcV1";
import { verticalConformanceFixtureMtcV1 } from "../testSupport/verticalConformanceFixtureMtcV1";

test("primary six-initiative fixture executes the real vertical chain with timing-only fairness", () => {
  const fixture = verticalConformanceFixtureMtcV1();
  assert.equal(fixture.A.scenario.initiatives.length, 6); assert.equal(fixture.B.scenario.initiatives.length, 6);
  assert.equal(fixture.A.execution.status, "completed-horizon"); assert.equal(fixture.B.execution.status, "completed-horizon");
  assert.equal(fixture.A.execution.history.length, 6); assert.equal(fixture.B.execution.history.length, 6);
  assert.ok(fixture.A.sources.sourceEvents.length > 0); assert.ok(fixture.A.sources.activationCandidates.length > 0);
  assert.equal(fixture.A.evaluation.status, "evaluated"); assert.equal(fixture.B.evaluation.status, "evaluated");
  assert.ok(fixture.A.result.decisionSpaceHistory.length >= 7); assert.equal(fixture.A.result.status, "completed-resolved");
  assert.equal(fixture.comparison.status, "compared"); if (fixture.comparison.status !== "compared") return;
  assert.equal(fixture.comparison.policy, "SEQUENCE_TIMING_ONLY"); assert.ok(fixture.comparison.firstDivergence);
  assert.ok(fixture.comparison.differences.some((row) => row.dimension === "initiative-lifecycle"));
  assert.ok(fixture.comparison.differences.some((row) => row.dimension === "decision-space"));
  assert.ok(fixture.comparison.differences.some((row) => row.dimension === "layer2-observation"));
  assert.ok(fixture.comparison.differences.some((row) => row.dimension === "layer2-paths"));
  assert.ok(fixture.comparison.intervals.length > 0);
});

test("the fixture exercises frozen dependency, resource, constraint, entitlement, branching and persistence semantics", () => {
  const { A } = verticalConformanceFixtureMtcV1();
  const migration = A.scenario.initiatives.find((row) => row.instanceId === "instance:migration")!;
  assert.equal(migration.dependencies.length, 1); assert.equal(migration.resourceClaims.length, 2);
  assert.ok(A.contract.layer1.constraints.length > 0); assert.deepEqual(A.contract.layer1.entitlements.map((row) => row.kind).sort(), ["consumable", "reusable"]);
  assert.equal(A.contract.layer2.edges.length, 4); assert.ok(A.contract.layer2.edges.some((edge) => edge.persistence === "declared-persistent"));
  assert.ok(A.evaluation.status === "evaluated" && A.evaluation.history.some((period) => period.observations.some((observation) => observation.nodeId === "observation:convergence")));
  assert.ok(A.execution.history.some((period) => period.entitlementConsumptions.length > 0));
});

test("bounded findings retain raw oriented comparison evidence and complete structural and causal provenance", () => {
  const fixture = verticalConformanceFixtureMtcV1(); const projection = projectComparisonFindingsMtcV1(fixture.comparison, fixture.A.result, fixture.B.result);
  assert.equal(projection.comparisonIdentity, fixture.comparison.comparisonIdentity); assert.deepEqual(projection.orientation, { A: fixture.A.result.resultIdentity, B: fixture.B.result.resultIdentity });
  assert.ok(projection.findings.length > 0 && projection.findings.length <= MAX_PROJECTED_FINDINGS_MTC_V1);
  assert.ok(projection.findings.some((finding) => finding.category === "first-divergence")); assert.ok(projection.findings.some((finding) => finding.category === "convergence"));
  assert.ok(projection.findings.some((finding) => finding.provenance.aSnapshotIdentities.length > 0 || finding.provenance.bSnapshotIdentities.length > 0));
  assert.ok(projection.findings.some((finding) => finding.provenance.aPathIdentities.length > 0 || finding.provenance.bPathIdentities.length > 0));
  assert.equal(fixture.comparison.status, "compared"); if (fixture.comparison.status !== "compared") return;
  const rolloutDifference = fixture.comparison.differences.find((row) => row.subjectId === "instance:rollout" && row.dimension === "decision-space" && typeof row.bSemantic === "object" && row.bSemantic !== null && Array.isArray((row.bSemantic as { reasons?: unknown }).reasons) && ((row.bSemantic as { reasons: unknown[] }).reasons.length > 0))!;
  const bSnapshot = fixture.B.result.decisionSpaceHistory.find((snapshot) => snapshot.snapshotIdentity === rolloutDifference.provenance.bSnapshotIdentity)!;
  const reason = bSnapshot.classifications.find((classification) => classification.instanceId === "instance:rollout")!.reasons[0];
  assert.equal(reason.code, "exclusive-resource-unavailable");
  assert.ok(fixture.B.execution.history.some((period) => period.resultingStateIdentity === bSnapshot.committedStateIdentity));
  assert.ok(fixture.B.scenario.initiatives.some((item) => item.instanceId === "instance:rollout" && item.resourceClaims.some((claim) => claim.ruleId === reason.ruleId)));
  assert.ok(fixture.B.contract.layer1.initiativeTypes.some((type) => type.eligibilityRules.some((rule) => rule.ruleId === reason.ruleId)));
  const source = fixture.A.sources.sourceEvents.find((event) => event.initiativeInstanceId === "instance:enablement")!;
  const activation = fixture.A.sources.activationCandidates.find((item) => item.sourceEventIdentity === source.sourceEventIdentity)!;
  const path = fixture.A.evaluation.status === "evaluated" ? fixture.A.evaluation.history.flatMap((period) => period.observations.flatMap((observation) => observation.causalPaths)).find((item) => item.sourceEventIdentity === source.sourceEventIdentity) : undefined;
  assert.equal(activation.bindingId, "binding:enablement-admitted"); assert.ok(path?.edgeEvidence.some((item) => item.evidence.kind === "evidence-reference" || item.evidence.kind === "explicit-assumption"));
  assert.ok(fixture.A.execution.history.some((period) => period.lifecycleTransitions.some((transition) => transition.instanceId === source.initiativeInstanceId)));
  assert.ok(fixture.A.scenario.initiatives.some((item) => item.instanceId === source.initiativeInstanceId));
});

test("finding projection is canonical, non-valuative, replayable and accepts no-compared-difference", () => {
  const first = verticalConformanceFixtureMtcV1(), replay = verticalConformanceFixtureMtcV1();
  const projected = projectComparisonFindingsMtcV1(first.comparison, first.A.result, first.B.result);
  assert.deepEqual(projectComparisonFindingsMtcV1(replay.comparison, replay.A.result, replay.B.result), projected);
  assert.equal(first.A.scenario.semanticIdentity, replay.A.scenario.semanticIdentity); assert.equal(first.A.execution.executionIdentity, replay.A.execution.executionIdentity);
  assert.equal(first.A.sources.resultIdentity, replay.A.sources.resultIdentity); assert.equal(first.A.evaluation.evaluationIdentity, replay.A.evaluation.evaluationIdentity);
  assert.equal(first.A.result.resultIdentity, replay.A.result.resultIdentity); assert.equal(first.comparison.comparisonIdentity, replay.comparison.comparisonIdentity);
  const forbidden = /winner|recommendation|severity|priority|rank|score|utility|magnitude|structuralMargin/i; assert.equal(forbidden.test(JSON.stringify(projected)), false);
  const identicalComparison = verticalConformanceFixtureMtcV1();
  const same = compareSingleRunsMtcV1({ result: identicalComparison.A.result, scenario: identicalComparison.A.scenario, contract: identicalComparison.A.contract }, { result: identicalComparison.A.result, scenario: identicalComparison.A.scenario, contract: identicalComparison.A.contract });
  const empty = projectComparisonFindingsMtcV1(same, identicalComparison.A.result, identicalComparison.A.result); assert.ok(empty.findings.some((finding) => finding.category === "no-compared-difference"));
});

test("unordered declaration mutation is invariant through the complete chain", () => {
  const base = verticalConformanceFixtureMtcV1();
  const reordered = verticalConformanceFixtureMtcV1({ contract: (raw) => { const layer2 = raw.layer2 as { nodes: unknown[]; edges: unknown[] }; layer2.nodes.reverse(); layer2.edges.reverse(); }, scenario: (raw) => { (raw.initiatives as unknown[]).reverse(); (raw.resources as unknown[]).reverse(); (raw.initialEntitlements as unknown[]).reverse(); } });
  assert.equal(reordered.A.scenario.semanticIdentity, base.A.scenario.semanticIdentity); assert.equal(reordered.A.execution.executionIdentity, base.A.execution.executionIdentity);
  assert.equal(reordered.A.sources.resultIdentity, base.A.sources.resultIdentity); assert.equal(reordered.A.evaluation.evaluationIdentity, base.A.evaluation.evaluationIdentity);
  assert.equal(reordered.comparison.comparisonIdentity, base.comparison.comparisonIdentity);
});

test("controlled semantic mutations are detected at their proper downstream boundaries", () => {
  const base = verticalConformanceFixtureMtcV1();
  const dependency = verticalConformanceFixtureMtcV1({ scenario: (raw) => { const row = (raw.initiatives as Array<Record<string, unknown>>).find((item) => item.instanceId === "instance:rollout")!; row.dependencies = [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:enablement", condition: "completed" }]; } });
  assert.notEqual(dependency.A.scenario.semanticIdentity, base.A.scenario.semanticIdentity); assert.notEqual(dependency.A.result.resultIdentity, base.A.result.resultIdentity);
  const capacity = verticalConformanceFixtureMtcV1({ contract: (raw) => { ((raw.layer1 as Record<string, unknown>).resources as Array<Record<string, unknown>>)[1].capacity = "6"; }, scenario: (raw) => { const resource = (raw.resources as Array<Record<string, unknown>>).find((item) => item.kind === "quantitative-capacity")!; resource.capacity = "6"; resource.initialAvailableCapacity = "6"; } });
  assert.notEqual(capacity.A.execution.executionIdentity, base.A.execution.executionIdentity);
  const entitlement = verticalConformanceFixtureMtcV1({ scenario: (raw) => { (raw.initialEntitlements as Array<Record<string, unknown>>).find((item) => item.entitlementId === "entitlement:membership")!.state = "unavailable"; } });
  assert.notEqual(entitlement.A.execution.executionIdentity, base.A.execution.executionIdentity);
  const binding = verticalConformanceFixtureMtcV1({ bindings: (raw) => { (raw.bindings as Array<Record<string, unknown>>)[0].targetNodeId = "observation:branch-a"; } });
  assert.notEqual(binding.A.bindings.semanticIdentity, base.A.bindings.semanticIdentity); assert.notEqual(binding.A.evaluation.evaluationIdentity, base.A.evaluation.evaluationIdentity);
  const persistence = verticalConformanceFixtureMtcV1({ contract: (raw) => { (((raw.layer2 as Record<string, unknown>).edges as Array<Record<string, unknown>>)[0]).persistence = "none"; } });
  assert.notEqual(persistence.A.evaluation.evaluationIdentity, base.A.evaluation.evaluationIdentity);
});

test("sequence incompatibility and broken projected provenance fail closed", () => {
  const fixture = verticalConformanceFixtureMtcV1();
  const incompatible = verticalConformanceFixtureMtcV1({ scenario: (raw) => { (raw.initialConstraints as Array<Record<string, unknown>>)[0].state = "present"; } });
  const compare = compareSingleRunsMtcV1({ result: fixture.A.result, scenario: fixture.A.scenario, contract: fixture.A.contract }, { result: incompatible.B.result, scenario: incompatible.B.scenario, contract: incompatible.B.contract });
  assert.equal(compare.status, "not-comparable");
  assert.equal(fixture.comparison.status, "compared"); if (fixture.comparison.status !== "compared") return;
  const clone = structuredClone(fixture.comparison) as unknown as { differences: Array<{ provenance: { aResultIdentity: string } }>; comparisonIdentity: string };
  clone.differences[0].provenance.aResultIdentity = "0".repeat(64); clone.comparisonIdentity = comparisonIdentityMtcV1(clone as unknown as ComparisonResultMtcV1);
  assert.throws(() => projectComparisonFindingsMtcV1(clone as unknown as ComparisonResultMtcV1, fixture.A.result, fixture.B.result), /provenance mismatch/);
});

test("existing typed bounds and lower-layer authority remain unchanged", () => {
  const fixture = verticalConformanceFixtureMtcV1();
  assert.equal(fixture.A.result.execution, fixture.A.execution); assert.equal(fixture.A.result.layer2?.evaluation, fixture.A.evaluation);
  assert.equal(fixture.A.result.decisionSpaceHistory[0].committedStateIdentity, fixture.A.execution.initialState.stateIdentity);
  assert.equal(fixture.comparison.status, "compared");
});
