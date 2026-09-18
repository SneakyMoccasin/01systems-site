import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import type { DecisionSpaceSnapshotMtcV1 } from "../decisionSpace/decisionSpaceMtcV1";
import type { Layer1RuntimeStateMtcV1 } from "../execution/executionMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import type { ObservationSourceBindingsMtcV1 } from "../observationSource/observationSourceMtcV1";
import { buildSingleRunResultMtcV1 } from "../singleRunResult/buildSingleRunResultMtcV1";
import type { SingleRunResultMtcV1 } from "../singleRunResult/singleRunResultMtcV1";
import { comparisonIdentityMtcV1 } from "./comparisonIdentityMtcV1";
import { COMPARISON_VERSION_MTC_V1, SEQUENCE_TIMING_ONLY_MTC_V1, type ComparedDifferenceMtcV1, type ComparisonPointMtcV1, type ComparisonResultMtcV1, type DecisionSpaceSetDifferenceMtcV1, type DifferenceDimensionMtcV1, type DifferenceIntervalMtcV1 } from "./comparisonMtcV1";

export interface ComparisonRunInputMtcV1 { readonly result: SingleRunResultMtcV1; readonly scenario: PreparedScenarioMtcV1; readonly contract: TwoLayerMtcContractV1; readonly sourceBindings?: ObservationSourceBindingsMtcV1 }
const bytes = (value: unknown) => new TextDecoder().decode(canonicalJsonBytesMtcV1(value));
const equal = (a: unknown, b: unknown) => bytes(a) === bytes(b);
const identity = (domain: string, value: unknown) => hashCanonicalMtcV1(domain, COMPARISON_VERSION_MTC_V1, canonicalJsonBytesMtcV1(value));
function freezeDeep<T>(value: T): T { if (typeof value === "object" && value !== null && !Object.isFrozen(value)) { for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child); Object.freeze(value); } return value; }
function finish<T extends Omit<ComparisonResultMtcV1, "comparisonIdentity">>(value: T): ComparisonResultMtcV1 { return freezeDeep({ ...value, comparisonIdentity: comparisonIdentityMtcV1(value as never) }) as unknown as ComparisonResultMtcV1; }

function verify(input: ComparisonRunInputMtcV1): void {
  const rebuilt = buildSingleRunResultMtcV1(input.result.execution, input.scenario, input.contract, input.result.layer2);
  if (rebuilt.resultIdentity !== input.result.resultIdentity) throw new TypeError("CP5A result identity verification failed at comparison boundary");
}
function scenarioProjection(s: PreparedScenarioMtcV1) {
  return { schemaVersion: s.schemaVersion, scenarioId: s.scenarioId, revision: s.revision, domainContract: s.domainContract, initiatives: s.initiatives.map((item) => ({ instanceId: item.instanceId, initiativeTypeId: item.initiativeTypeId, durationPeriods: item.durationPeriods, initialLifecycle: item.initialLifecycle, terminalLifecycle: item.terminalLifecycle, dependencies: item.dependencies, resourceClaims: item.resourceClaims })), resources: s.resources, initialConstraints: s.initialConstraints, initialEntitlements: s.initialEntitlements };
}
function bindingProjection(input: ComparisonRunInputMtcV1) { const bindings = input.result.layer2?.bindings ?? input.sourceBindings; return bindings ? { schemaVersion: bindings.schemaVersion, bindings: bindings.bindings } : { absent: true as const }; }
function stateProjection(state: Layer1RuntimeStateMtcV1) { const copy = structuredClone(state) as unknown as Record<string, unknown>; delete copy.stateIdentity; return copy; }
function snapshotSemantic(s: DecisionSpaceSnapshotMtcV1) { return { eligible: s.eligibleInitiativeIds, ineligible: s.ineligibleInitiativeIds, active: s.activeInitiativeIds, terminal: s.terminalInitiativeIds, classifications: s.classifications }; }
function pointKey(point: ComparisonPointMtcV1): string { return `${point.kind === "initial" ? "0" : "1"}:${String(point.period).padStart(12, "0")}`; }
function differenceKey(dimension: DifferenceDimensionMtcV1, subjectId: string): string { return `${dimension}:${subjectId}`; }

function comparability(a: ComparisonRunInputMtcV1, b: ComparisonRunInputMtcV1) {
  const checks: Array<[string, unknown, unknown]> = [
    ["result-protocol", a.result.resultVersion, b.result.resultVersion], ["execution-protocol", a.result.execution.executionVersion, b.result.execution.executionVersion],
    ["contract-semantic-identity", a.result.contractIdentity, b.result.contractIdentity], ["scenario-non-schedule-semantics", scenarioProjection(a.scenario), scenarioProjection(b.scenario)],
    ["initial-authoritative-state", stateProjection(a.result.execution.initialState), stateProjection(b.result.execution.initialState)], ["horizon", a.scenario.horizon, b.scenario.horizon],
    ["source-binding-semantics", bindingProjection(a), bindingProjection(b)],
  ];
  return checks.filter(([, av, bv]) => !equal(av, bv)).map(([dimension, av, bv]) => ({ dimension, aIdentity: identity(`CE:COMPARE:A:${dimension}`, av), bIdentity: identity(`CE:COMPARE:B:${dimension}`, bv) })).sort((x, y) => compareCanonicalStringsMtcV1(x.dimension, y.dimension));
}

function timeline(result: SingleRunResultMtcV1, through: number) { return result.decisionSpaceHistory.filter((s) => s.point.kind === "initial" || (s.point.kind === "period-commit" && s.point.periodOrBoundary <= through)).map((s) => ({ point: { kind: s.point.kind as "initial" | "period-commit", period: s.point.periodOrBoundary }, snapshot: s, state: s.point.kind === "initial" ? result.execution.initialState : result.execution.history.find((r) => r.period === s.point.periodOrBoundary)!.resultingState })); }
function add(differences: ComparedDifferenceMtcV1[], dimension: DifferenceDimensionMtcV1, subjectId: string, point: ComparisonPointMtcV1, aSemantic: unknown, bSemantic: unknown, a: SingleRunResultMtcV1, b: SingleRunResultMtcV1, as?: DecisionSpaceSnapshotMtcV1, bs?: DecisionSpaceSnapshotMtcV1, paths?: { a: string[]; b: string[] }) {
  if (equal(aSemantic, bSemantic)) return;
  differences.push({ differenceKey: differenceKey(dimension, subjectId), dimension, subjectId, point, aSemantic, bSemantic, provenance: { aResultIdentity: a.resultIdentity, bResultIdentity: b.resultIdentity, ...(as ? { aSnapshotIdentity: as.snapshotIdentity } : {}), ...(bs ? { bSnapshotIdentity: bs.snapshotIdentity } : {}), ...(paths ? { aPathIdentities: paths.a, bPathIdentities: paths.b } : {}) } });
}
function layer2At(result: SingleRunResultMtcV1, period: number) { return result.layer2?.evaluation.status === "evaluated" ? result.layer2.evaluation.history.find((item) => item.period === period) : undefined; }

export function compareSingleRunsMtcV1(a: ComparisonRunInputMtcV1, b: ComparisonRunInputMtcV1): ComparisonResultMtcV1 {
  verify(a); verify(b);
  const base = { comparisonVersion: COMPARISON_VERSION_MTC_V1, policy: SEQUENCE_TIMING_ONLY_MTC_V1, aResultIdentity: a.result.resultIdentity, bResultIdentity: b.result.resultIdentity };
  const reasons = comparability(a, b); if (reasons.length) return finish({ ...base, status: "not-comparable" as const, reasons });
  const boundedSides = ([a.result.status === "failed-bounds" ? "A" : null, b.result.status === "failed-bounds" ? "B" : null].filter(Boolean) as ("A" | "B")[]);
  if (boundedSides.length) return finish({ ...base, status: "incomplete-bounds" as const, boundedSides });
  const committed = (input: ComparisonRunInputMtcV1) => input.result.execution.status === "failed-unresolved" ? input.result.execution.lastCommittedState.committedThroughPeriod : input.scenario.horizon.finalPeriod;
  const authorityThroughPeriod = Math.min(committed(a), committed(b));
  const at = timeline(a.result, authorityThroughPeriod); const bt = timeline(b.result, authorityThroughPeriod);
  const differences: ComparedDifferenceMtcV1[] = []; const decisionSpaceDifferences: DecisionSpaceSetDifferenceMtcV1[] = [];
  for (let index = 0; index < Math.min(at.length, bt.length); index += 1) {
    const ar = at[index], br = bt[index]; const point = ar.point;
    for (const field of [["initiatives", "initiative-lifecycle"], ["resources", "resource-state"], ["constraints", "constraint-state"], ["entitlements", "entitlement-state"]] as const) {
      const am = new Map((ar.state[field[0]] as readonly Record<string, unknown>[]).map((x) => [String(x.instanceId ?? x.resourceInstanceId ?? x.constraintId ?? x.entitlementId), x]));
      const bm = new Map((br.state[field[0]] as readonly Record<string, unknown>[]).map((x) => [String(x.instanceId ?? x.resourceInstanceId ?? x.constraintId ?? x.entitlementId), x]));
      for (const key of [...new Set([...am.keys(), ...bm.keys()])].sort(compareCanonicalStringsMtcV1)) add(differences, field[1], key, point, am.get(key), bm.get(key), a.result, b.result, ar.snapshot, br.snapshot);
    }
    const ac = new Map(ar.snapshot.classifications.map((x) => [x.instanceId as string, x])); const bc = new Map(br.snapshot.classifications.map((x) => [x.instanceId as string, x]));
    const classificationDifferences = [...ac.keys()].filter((key) => !equal(ac.get(key), bc.get(key))).sort(compareCanonicalStringsMtcV1).map((instanceId) => ({ instanceId, a: ac.get(instanceId)!, b: bc.get(instanceId)! }));
    for (const row of classificationDifferences) add(differences, "decision-space", row.instanceId, point, row.a, row.b, a.result, b.result, ar.snapshot, br.snapshot);
    const aEligible = new Set(ar.snapshot.eligibleInitiativeIds as readonly string[]), bEligible = new Set(br.snapshot.eligibleInitiativeIds as readonly string[]);
    if (classificationDifferences.length) decisionSpaceDifferences.push({ point, eligibleOnlyA: [...aEligible].filter((x) => !bEligible.has(x)).sort(compareCanonicalStringsMtcV1), eligibleOnlyB: [...bEligible].filter((x) => !aEligible.has(x)).sort(compareCanonicalStringsMtcV1), eligibleInBoth: [...aEligible].filter((x) => bEligible.has(x)).sort(compareCanonicalStringsMtcV1), classificationDifferences });
    if (point.kind === "period-commit") {
      const ap = layer2At(a.result, point.period), bp = layer2At(b.result, point.period); const ao = new Map((ap?.observations ?? []).map((x) => [x.nodeId as string, x])); const bo = new Map((bp?.observations ?? []).map((x) => [x.nodeId as string, x]));
      for (const node of [...new Set([...ao.keys(), ...bo.keys()])].sort(compareCanonicalStringsMtcV1)) {
        const av = ao.get(node), bv = bo.get(node); add(differences, "layer2-observation", node, point, av ? { result: av.result } : { absent: true }, bv ? { result: bv.result } : { absent: true }, a.result, b.result);
        const ak = av?.causalPaths.map((p) => ({ sourcePeriod: p.firstVisiblePeriod, nodes: p.nodeIds, edges: p.edgeIds, persistence: p.persistence, result: p.result })) ?? []; const bk = bv?.causalPaths.map((p) => ({ sourcePeriod: p.firstVisiblePeriod, nodes: p.nodeIds, edges: p.edgeIds, persistence: p.persistence, result: p.result })) ?? [];
        add(differences, "layer2-paths", node, point, ak, bk, a.result, b.result, undefined, undefined, { a: av?.causalPaths.map((p) => p.pathIdentity) ?? [], b: bv?.causalPaths.map((p) => p.pathIdentity) ?? [] });
      }
      const sourceProjection = (r: SingleRunResultMtcV1) => r.layer2?.sources.sourceEvents.filter((e) => e.committedBoundary === point.period).map((e) => ({ kind: e.kind, initiativeInstanceId: e.initiativeInstanceId, initiativeTypeId: e.initiativeTypeId, committedBoundary: e.committedBoundary })) ?? [];
      add(differences, "source-event", "period-events", point, sourceProjection(a.result), sourceProjection(b.result), a.result, b.result);
    }
  }
  if (a.result.status !== b.result.status) add(differences, "run-status", "terminal-status", { kind: "period-commit", period: authorityThroughPeriod }, a.result.status, b.result.status, a.result, b.result);
  differences.sort((x, y) => compareCanonicalStringsMtcV1(pointKey(x.point), pointKey(y.point)) || compareCanonicalStringsMtcV1(x.differenceKey, y.differenceKey));
  const points = at.map((x) => x.point); const intervals: DifferenceIntervalMtcV1[] = [];
  for (const key of [...new Set(differences.map((d) => d.differenceKey))].sort(compareCanonicalStringsMtcV1)) {
    const rows = differences.filter((d) => d.differenceKey === key); const differing = new Set(rows.map((d) => pointKey(d.point))); let start = -1;
    for (let index = 0; index <= points.length; index += 1) {
      const isDifferent = index < points.length && differing.has(pointKey(points[index]));
      if (isDifferent && start < 0) start = index;
      if (!isDifferent && start >= 0) { const end = index - 1; const convergencePoint = index < points.length ? points[index] : undefined; intervals.push({ differenceKey: key, dimension: rows[0].dimension, subjectId: rows[0].subjectId, firstDifferingPoint: points[start], lastDifferingPoint: points[end], ...(convergencePoint ? { convergencePoint } : {}), persistsThroughAuthorityBoundary: !convergencePoint }); start = -1; }
    }
  }
  const first = differences[0]; const firstDivergence = first ? { point: first.point, dimensions: [...new Set(differences.filter((d) => equal(d.point, first.point)).map((d) => d.dimension))].sort(compareCanonicalStringsMtcV1) } : undefined;
  const terminalStructuralEquivalent = equal(stateProjection(a.result.execution.status === "completed-horizon" ? a.result.execution.terminalState : a.result.execution.lastCommittedState), stateProjection(b.result.execution.status === "completed-horizon" ? b.result.execution.terminalState : b.result.execution.lastCommittedState));
  const terminalDecisionSpaceEquivalent = equal(snapshotSemantic(at.at(-1)!.snapshot), snapshotSemantic(bt.at(-1)!.snapshot));
  const unresolved = { ...(a.result.status === "failed-unresolved" ? { A: { failedPeriod: a.result.failedPeriod, conflicts: a.result.execution.status === "failed-unresolved" ? a.result.execution.attempt.conflicts : [] } } : {}), ...(b.result.status === "failed-unresolved" ? { B: { failedPeriod: b.result.failedPeriod, conflicts: b.result.execution.status === "failed-unresolved" ? b.result.execution.attempt.conflicts : [] } } : {}) };
  return finish({ ...base, status: "compared" as const, completeness: Object.keys(unresolved).length ? "limited-unresolved" as const : "full" as const, authorityThroughPeriod, runStatuses: { A: a.result.status, B: b.result.status }, unresolved, outcome: differences.length ? "compared-differences" as const : "no-compared-difference" as const, ...(firstDivergence ? { firstDivergence } : {}), differences, intervals, decisionSpaceDifferences, historicalDivergence: differences.length > 0, terminalStructuralEquivalent, terminalDecisionSpaceEquivalent });
}
