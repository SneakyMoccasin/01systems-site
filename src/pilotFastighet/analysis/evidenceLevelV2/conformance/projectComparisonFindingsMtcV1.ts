import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import { comparisonIdentityMtcV1 } from "../comparison/comparisonIdentityMtcV1";
import type { ComparedDifferenceMtcV1, ComparisonResultMtcV1, DifferenceIntervalMtcV1 } from "../comparison/comparisonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { SingleRunResultMtcV1 } from "../singleRunResult/singleRunResultMtcV1";

export const FINDING_PROJECTION_VERSION_MTC_V1 = "ce-two-layer-mtc-finding-projection-v1" as const;
export const MAX_PROJECTED_FINDINGS_MTC_V1 = 4096;

export type ProjectedFindingMtcV1 = Readonly<{
  findingIdentity: string;
  category: "first-divergence" | "comparison-difference" | "convergence" | "terminal-equivalence" | "no-compared-difference";
  comparisonIdentity: string;
  differenceKeys: readonly string[];
  interval?: DifferenceIntervalMtcV1;
  provenance: Readonly<{ aResultIdentity: string; bResultIdentity: string; aSnapshotIdentities: readonly string[]; bSnapshotIdentities: readonly string[]; aPathIdentities: readonly string[]; bPathIdentities: readonly string[] }>;
}>;

export type FindingProjectionMtcV1 = Readonly<{
  projectionVersion: typeof FINDING_PROJECTION_VERSION_MTC_V1;
  status: "projected";
  comparisonIdentity: string;
  orientation: Readonly<{ A: string; B: string }>;
  findings: readonly ProjectedFindingMtcV1[];
  projectionIdentity: string;
}>;

function freezeDeep<T>(value: T): T { if (typeof value === "object" && value !== null && !Object.isFrozen(value)) { for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child); Object.freeze(value); } return value; }
function ids(rows: readonly ComparedDifferenceMtcV1[], side: "a" | "b", kind: "Snapshot" | "Path"): string[] { const key = `${side}${kind}Identities` as const; const singular = `${side}${kind}Identity` as const; return [...new Set(rows.flatMap((row) => key in row.provenance ? (row.provenance[key as keyof typeof row.provenance] as readonly string[]) : singular in row.provenance ? [row.provenance[singular as keyof typeof row.provenance] as string] : []))].sort(compareCanonicalStringsMtcV1); }
function provenance(rows: readonly ComparedDifferenceMtcV1[], a: SingleRunResultMtcV1, b: SingleRunResultMtcV1) { return { aResultIdentity: a.resultIdentity, bResultIdentity: b.resultIdentity, aSnapshotIdentities: ids(rows, "a", "Snapshot"), bSnapshotIdentities: ids(rows, "b", "Snapshot"), aPathIdentities: ids(rows, "a", "Path"), bPathIdentities: ids(rows, "b", "Path") }; }
function validate(comparison: ComparisonResultMtcV1, a: SingleRunResultMtcV1, b: SingleRunResultMtcV1): void {
  if (comparison.comparisonIdentity !== comparisonIdentityMtcV1(comparison)) throw new TypeError("Comparison identity mismatch at finding projection boundary");
  if (comparison.aResultIdentity !== a.resultIdentity || comparison.bResultIdentity !== b.resultIdentity) throw new TypeError("Oriented result identity mismatch at finding projection boundary");
  if (comparison.status !== "compared") return;
  const snapshots = (run: SingleRunResultMtcV1) => new Set(run.decisionSpaceHistory.map((item) => item.snapshotIdentity));
  const paths = (run: SingleRunResultMtcV1) => new Set(run.layer2?.evaluation.status === "evaluated" ? run.layer2.evaluation.history.flatMap((period) => period.observations.flatMap((observation) => observation.causalPaths.map((path) => path.pathIdentity))) : []);
  const as = snapshots(a), bs = snapshots(b), ap = paths(a), bp = paths(b);
  for (const row of comparison.differences) {
    if (row.provenance.aResultIdentity !== a.resultIdentity || row.provenance.bResultIdentity !== b.resultIdentity) throw new TypeError("Difference result provenance mismatch");
    if (row.provenance.aSnapshotIdentity && !as.has(row.provenance.aSnapshotIdentity)) throw new TypeError("Unknown A snapshot provenance");
    if (row.provenance.bSnapshotIdentity && !bs.has(row.provenance.bSnapshotIdentity)) throw new TypeError("Unknown B snapshot provenance");
    for (const id of row.provenance.aPathIdentities ?? []) if (!ap.has(id)) throw new TypeError("Unknown A path provenance");
    for (const id of row.provenance.bPathIdentities ?? []) if (!bp.has(id)) throw new TypeError("Unknown B path provenance");
  }
}

export function projectComparisonFindingsMtcV1(comparison: ComparisonResultMtcV1, a: SingleRunResultMtcV1, b: SingleRunResultMtcV1): FindingProjectionMtcV1 {
  validate(comparison, a, b);
  const base = { projectionVersion: FINDING_PROJECTION_VERSION_MTC_V1, status: "projected" as const, comparisonIdentity: comparison.comparisonIdentity, orientation: { A: a.resultIdentity, B: b.resultIdentity } };
  const raw: Array<Omit<ProjectedFindingMtcV1, "findingIdentity">> = [];
  if (comparison.status === "compared") {
    if (!comparison.historicalDivergence) raw.push({ category: "no-compared-difference", comparisonIdentity: comparison.comparisonIdentity, differenceKeys: [], provenance: provenance([], a, b) });
    if (comparison.firstDivergence) { const rows = comparison.differences.filter((row) => row.point.kind === comparison.firstDivergence!.point.kind && row.point.period === comparison.firstDivergence!.point.period); raw.push({ category: "first-divergence", comparisonIdentity: comparison.comparisonIdentity, differenceKeys: [...new Set(rows.map((row) => row.differenceKey))].sort(compareCanonicalStringsMtcV1), provenance: provenance(rows, a, b) }); }
    for (const key of [...new Set(comparison.differences.map((row) => row.differenceKey))].sort(compareCanonicalStringsMtcV1)) { const rows = comparison.differences.filter((row) => row.differenceKey === key); raw.push({ category: "comparison-difference", comparisonIdentity: comparison.comparisonIdentity, differenceKeys: [key], provenance: provenance(rows, a, b) }); }
    for (const interval of comparison.intervals.filter((item) => item.convergencePoint).sort((x, y) => compareCanonicalStringsMtcV1(x.differenceKey, y.differenceKey))) { const rows = comparison.differences.filter((row) => row.differenceKey === interval.differenceKey); raw.push({ category: "convergence", comparisonIdentity: comparison.comparisonIdentity, differenceKeys: [interval.differenceKey], interval, provenance: provenance(rows, a, b) }); }
    raw.push({ category: "terminal-equivalence", comparisonIdentity: comparison.comparisonIdentity, differenceKeys: [], provenance: provenance([], a, b) });
  }
  if (raw.length > MAX_PROJECTED_FINDINGS_MTC_V1) throw new RangeError(`Finding projection bound exceeded: ${raw.length}`);
  const findings = raw.map((finding) => ({ ...finding, findingIdentity: hashCanonicalMtcV1("CE:TWO-LAYER-MTC:FINDING", FINDING_PROJECTION_VERSION_MTC_V1, canonicalJsonBytesMtcV1(finding)) })).sort((x, y) => compareCanonicalStringsMtcV1(x.category, y.category) || compareCanonicalStringsMtcV1(x.differenceKeys.join("\u0000"), y.differenceKeys.join("\u0000")) || compareCanonicalStringsMtcV1(x.findingIdentity, y.findingIdentity));
  const semantic = { ...base, findings }; const projectionIdentity = hashCanonicalMtcV1("CE:TWO-LAYER-MTC:FINDING-PROJECTION", FINDING_PROJECTION_VERSION_MTC_V1, canonicalJsonBytesMtcV1(semantic));
  return freezeDeep({ ...semantic, projectionIdentity });
}
