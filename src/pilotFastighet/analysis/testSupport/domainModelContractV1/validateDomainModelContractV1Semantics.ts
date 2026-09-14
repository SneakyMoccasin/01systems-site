import type {
  ConstraintDefinition,
  DomainModelContractV1,
  NamedMeasureDefinition,
  OrdinalScale,
  Predicate,
  SemanticallyValidatedDomainModelContractV1,
  StructurallyValidatedDomainModelContractV1,
} from "./contractV1";
import { jsonPointer, sortContractIssues, type ContractIssue } from "./contractV1Issues";
import { canonicalPredicateKeyV1 } from "./canonicalPredicateV1";

export type SemanticValidationResult =
  | Readonly<{ ok: true; value: SemanticallyValidatedDomainModelContractV1 }>
  | Readonly<{ ok: false; issues: readonly ContractIssue[] }>;

export const DOMAIN_MODEL_CONTRACT_V1_SEMANTIC_ISSUE_CODES = Object.freeze([
  "curve-shared-across-drivers", "duplicate-action-effect", "duplicate-active-effect", "duplicate-driver-impact",
  "duplicate-driver-reference", "duplicate-escalation-rule", "duplicate-id", "duplicate-level-reference", "duplicate-predicate-child",
  "duplicate-level-transition", "duplicate-lifecycle-transition", "duplicate-propagation-edge", "duplicate-rank",
  "duplicate-term-id", "escalation-threshold-out-of-range", "initial-level-score-mismatch", "initial-score-out-of-range",
  "invalid-band-endpoint", "invalid-escalation-transition", "invalid-materialization-band", "invalid-measure-range",
  "invalid-numeric-range", "lifecycle-self-transition", "materialization-gap", "materialization-overlap",
  "measure-dependency-cycle", "measure-self-reference", "measure-value-out-of-range", "missing-activation-transition",
  "missing-active-effect", "missing-curve-amplitude", "missing-curve-reference", "non-contiguous-rank",
  "predicate-threshold-out-of-range", "propagation-cycle", "propagation-self-edge", "rank-order-mismatch",
  "scale-anchor-materialization-mismatch", "scale-range-mismatch", "unknown-curve-level", "unknown-dimension-reference",
  "unknown-driver-reference", "unknown-level-reference", "unknown-measure-reference", "unknown-scale-reference",
] as const);
type SemanticIssueCode = (typeof DOMAIN_MODEL_CONTRACT_V1_SEMANTIC_ISSUE_CODES)[number];

type Located<T> = Readonly<{ value: T; path: string }>;
type Indexes = Readonly<{
  scales: Map<string, Located<OrdinalScale>>;
  drivers: Map<string, Located<DomainModelContractV1["semanticPayload"]["drivers"][number]>>;
  dimensions: Map<string, Located<DomainModelContractV1["semanticPayload"]["dimensions"][number]>>;
  curves: Map<string, Located<DomainModelContractV1["semanticPayload"]["curves"][number]>>;
  measures: Map<string, Located<NamedMeasureDefinition>>;
}>;

const issue = (code: SemanticIssueCode, path: string, message: string): ContractIssue => ({ code, path, message });

/** Semantic validation only. Hashing, trust, registration and executability are deliberately out of scope. */
export function validateDomainModelContractV1Semantics(
  input: StructurallyValidatedDomainModelContractV1,
): SemanticValidationResult {
  const issues: ContractIssue[] = [];
  const payload = input.semanticPayload;

  const scales = uniqueIndex(payload.scales, "scaleId", "/semanticPayload/scales", issues);
  for (const [index, scale] of payload.scales.entries()) validateScale(scale, `/semanticPayload/scales/${index}`, issues);
  const drivers = uniqueIndex(payload.drivers, "driverId", "/semanticPayload/drivers", issues);
  uniqueIndex(payload.actions, "actionId", "/semanticPayload/actions", issues);
  uniqueIndex(payload.propagation.edges, "edgeId", "/semanticPayload/propagation/edges", issues);
  const dimensions = uniqueIndex(payload.dimensions, "dimensionId", "/semanticPayload/dimensions", issues);
  const curves = uniqueIndex(payload.curves, "curveId", "/semanticPayload/curves", issues);
  uniqueIndex(payload.constraints, "constraintId", "/semanticPayload/constraints", issues);
  const measures = uniqueIndex(payload.measures, "measureId", "/semanticPayload/measures", issues);
  const indexes: Indexes = { scales, drivers, dimensions, curves, measures };

  for (const [index, driver] of payload.drivers.entries()) validateDriver(driver, `/semanticPayload/drivers/${index}`, indexes, issues);
  for (const [index, action] of payload.actions.entries()) {
    const path = `/semanticPayload/actions/${index}`;
    duplicateValues(action.effects, (entry) => entry.driverId, `${path}/effects`, "driverId", "duplicate-action-effect", issues);
    for (const [effectIndex, effect] of action.effects.entries()) requireRef(drivers, effect.driverId, `${path}/effects/${effectIndex}/driverId`, "unknown-driver-reference", "driver", issues);
  }
  validatePropagation(input, indexes, issues);
  validateCurves(input, indexes, issues);
  for (const [index, constraint] of payload.constraints.entries()) validateConstraint(constraint, `/semanticPayload/constraints/${index}`, indexes, issues);
  validateMeasures(input, indexes, issues);

  if (issues.length) return fail(issues);
  const detached = structuredClone(input) as DomainModelContractV1;
  return Object.freeze({ ok: true, value: deepFreezeIterative(detached) as SemanticallyValidatedDomainModelContractV1 });
}

export function deriveSupportedActionIdsV1(input: SemanticallyValidatedDomainModelContractV1): readonly string[] {
  return Object.freeze(input.semanticPayload.actions.map(({ actionId }) => actionId).sort(compare));
}

function uniqueIndex<T extends object, K extends keyof T>(values: readonly T[], key: K, basePath: string, issues: ContractIssue[]): Map<string, Located<T>> {
  const result = new Map<string, Located<T>>();
  for (const [index, value] of values.entries()) {
    const id = String(value[key]);
    const path = `${basePath}/${index}/${String(key)}`;
    const first = result.get(id);
    if (first) {
      issues.push(issue("duplicate-id", first.path, `ID ${JSON.stringify(id)} is duplicated in this namespace.`));
      issues.push(issue("duplicate-id", path, `ID ${JSON.stringify(id)} is duplicated in this namespace.`));
    } else result.set(id, { value, path });
  }
  return result;
}

function duplicateValues<T>(values: readonly T[], key: (value: T) => string, basePath: string, field: string, code: SemanticIssueCode, issues: ContractIssue[]): void {
  const seen = new Map<string, string>();
  for (const [index, value] of values.entries()) {
    const identity = key(value); const itemPath = `${basePath}/${index}`; const path = field ? `${itemPath}/${field}` : itemPath; const first = seen.get(identity);
    if (first) { issues.push(issue(code, first, `Value ${JSON.stringify(identity)} must be unique here.`)); issues.push(issue(code, path, `Value ${JSON.stringify(identity)} must be unique here.`)); }
    else seen.set(identity, path);
  }
}

function validateScale(scale: OrdinalScale, path: string, issues: ContractIssue[]): void {
  uniqueIndex(scale.levels, "levelId", `${path}/levels`, issues);
  duplicateValues(scale.levels, (level) => String(level.rank), `${path}/levels`, "rank", "duplicate-rank", issues);
  const ordered = scale.levels.map((level, index) => ({ level, index })).sort((a, b) => a.level.rank - b.level.rank || compare(a.level.levelId, b.level.levelId));
  for (let position = 0; position < ordered.length; position += 1) {
    const { level, index } = ordered[position]; const bandPath = `${path}/levels/${index}/materialization`;
    if (level.rank !== position) issues.push(issue("non-contiguous-rank", `${path}/levels/${index}/rank`, "Ranks must form the contiguous sequence 0..n-1."));
    if (index !== position) issues.push(issue("rank-order-mismatch", `${path}/levels/${index}/rank`, "Scale levels must be stored in ascending rank order."));
    const last = position === ordered.length - 1;
    if (last && level.materialization.maximumInclusive === undefined) issues.push(issue("invalid-band-endpoint", bandPath, "The final rank must use maximumInclusive."));
    if (!last && level.materialization.maximumExclusive === undefined) issues.push(issue("invalid-band-endpoint", bandPath, "Only the final rank may use maximumInclusive."));
    const maximum = level.materialization.maximumExclusive ?? level.materialization.maximumInclusive;
    if (maximum !== undefined && level.materialization.minimumInclusive >= maximum) issues.push(issue("invalid-materialization-band", bandPath, "A materialization band must have positive width."));
    if (maximum !== undefined && (level.anchor < level.materialization.minimumInclusive || (last ? level.anchor > maximum : level.anchor >= maximum))) {
      issues.push(issue("scale-anchor-materialization-mismatch", `${path}/levels/${index}/anchor`, "Scale level anchor must materialize to its own band."));
    }
    if (position > 0) {
      const previous = ordered[position - 1].level;
      const previousMaximum = previous.materialization.maximumExclusive ?? previous.materialization.maximumInclusive;
      if (previousMaximum !== level.materialization.minimumInclusive) {
        issues.push(issue(previousMaximum! < level.materialization.minimumInclusive ? "materialization-gap" : "materialization-overlap", `${bandPath}/minimumInclusive`, "Adjacent materialization bands must meet exactly."));
      }
    }
  }
}

function validateDriver(driver: DomainModelContractV1["semanticPayload"]["drivers"][number], path: string, indexes: Indexes, issues: ContractIssue[]): void {
  const scale = indexes.scales.get(driver.scaleId);
  requireRef(indexes.scales, driver.scaleId, `${path}/scaleId`, "unknown-scale-reference", "scale", issues);
  duplicateValues(driver.adverseLevelIds, String, `${path}/adverseLevelIds`, "", "duplicate-level-reference", issues);
  if (!scale) return;
  const levels = new Set(scale.value.levels.map(({ levelId }) => levelId));
  if (!levels.has(driver.initial.levelId)) issues.push(issue("unknown-level-reference", `${path}/initial/levelId`, "Initial level must exist in the driver's scale."));
  for (const [index, levelId] of driver.adverseLevelIds.entries()) if (!levels.has(levelId)) issues.push(issue("unknown-level-reference", `${path}/adverseLevelIds/${index}`, "Adverse level must exist in the driver's scale."));
  if (!(driver.numericRange.minimum < driver.numericRange.maximum)) issues.push(issue("invalid-numeric-range", `${path}/numericRange`, "Driver numeric range must have minimum less than maximum."));
  if (driver.initial.score < driver.numericRange.minimum || driver.initial.score > driver.numericRange.maximum) issues.push(issue("initial-score-out-of-range", `${path}/initial/score`, "Initial score must be inside the driver's numeric range."));
  const ordered = [...scale.value.levels].sort((a, b) => a.rank - b.rank);
  if (ordered.length) {
    const firstMinimum = ordered[0].materialization.minimumInclusive;
    const finalMaximum = ordered.at(-1)!.materialization.maximumInclusive ?? ordered.at(-1)!.materialization.maximumExclusive;
    if (firstMinimum !== driver.numericRange.minimum) issues.push(issue("scale-range-mismatch", `${path}/numericRange/minimum`, "Numeric range minimum must equal the scale's first band minimum."));
    if (finalMaximum !== driver.numericRange.maximum) issues.push(issue("scale-range-mismatch", `${path}/numericRange/maximum`, "Numeric range maximum must equal the scale's final band maximum."));
    const materialized = ordered.find((level, index) => {
      const band = level.materialization; const maximum = band.maximumExclusive ?? band.maximumInclusive!;
      return driver.initial.score >= band.minimumInclusive && (index === ordered.length - 1 ? driver.initial.score <= maximum : driver.initial.score < maximum);
    });
    if (materialized && materialized.levelId !== driver.initial.levelId) issues.push(issue("initial-level-score-mismatch", `${path}/initial/levelId`, "Initial score must materialize to the declared initial level."));
  }
  duplicateValues(driver.impacts, (entry) => entry.dimensionId, `${path}/impacts`, "dimensionId", "duplicate-driver-impact", issues);
  for (const [index, impact] of driver.impacts.entries()) {
    requireRef(indexes.dimensions, impact.dimensionId, `${path}/impacts/${index}/dimensionId`, "unknown-dimension-reference", "dimension", issues);
    requireRef(indexes.curves, impact.curveId, `${path}/impacts/${index}/curveId`, "missing-curve-reference", "curve", issues);
  }
}

function validatePropagation(input: StructurallyValidatedDomainModelContractV1, indexes: Indexes, issues: ContractIssue[]): void {
  const edges = input.semanticPayload.propagation.edges; const pairs = new Map<string, string>();
  for (const [index, edge] of edges.entries()) {
    const path = `/semanticPayload/propagation/edges/${index}`; const pair = `${edge.sourceDriverId}\0${edge.targetDriverId}`; const first = pairs.get(pair);
    if (first) { issues.push(issue("duplicate-propagation-edge", first, "Source and target pair must be unique.")); issues.push(issue("duplicate-propagation-edge", `${path}/targetDriverId`, "Source and target pair must be unique.")); } else pairs.set(pair, `${path}/targetDriverId`);
    if (edge.sourceDriverId === edge.targetDriverId) issues.push(issue("propagation-self-edge", `${path}/targetDriverId`, "Propagation source and target must differ."));
    const source = indexes.drivers.get(edge.sourceDriverId); const target = indexes.drivers.get(edge.targetDriverId);
    requireRef(indexes.drivers, edge.sourceDriverId, `${path}/sourceDriverId`, "unknown-driver-reference", "driver", issues);
    requireRef(indexes.drivers, edge.targetDriverId, `${path}/targetDriverId`, "unknown-driver-reference", "driver", issues);
    if (source) { const scale = indexes.scales.get(source.value.scaleId); const levels = new Set(scale?.value.levels.map((x) => x.levelId)); for (const [levelIndex, levelId] of edge.triggerLevelIds.entries()) if (!levels.has(levelId)) issues.push(issue("unknown-level-reference", `${path}/triggerLevelIds/${levelIndex}`, "Trigger level must exist in the source driver's scale.")); }
    if (target) { const scale = indexes.scales.get(target.value.scaleId); if (!scale?.value.levels.some((x) => x.levelId === edge.propagatedLevelId)) issues.push(issue("unknown-level-reference", `${path}/propagatedLevelId`, "Propagated level must exist in the target driver's scale.")); }
    duplicateValues(edge.triggerLevelIds, String, `${path}/triggerLevelIds`, "", "duplicate-level-reference", issues);
  }
  detectDirectedCycles(edges.map((edge, index) => ({ from: edge.sourceDriverId, to: edge.targetDriverId, path: `/semanticPayload/propagation/edges/${index}` })), "propagation-cycle", issues);
}

function validateCurves(input: StructurallyValidatedDomainModelContractV1, indexes: Indexes, issues: ContractIssue[]): void {
  const requiredLevels = new Map<string, Set<string>>();
  const owners = new Map<string, { driverId: string; paths: string[] }>();
  for (const [driverIndex, driver] of input.semanticPayload.drivers.entries()) {
    const scale = indexes.scales.get(driver.scaleId); if (!scale) continue;
    for (const [impactIndex, impact] of driver.impacts.entries()) {
      const curvePath = `/semanticPayload/drivers/${driverIndex}/impacts/${impactIndex}/curveId`;
      const owner = owners.get(impact.curveId);
      if (!owner) {
        owners.set(impact.curveId, { driverId: driver.driverId, paths: [curvePath] });
        requiredLevels.set(impact.curveId, new Set(scale.value.levels.map(({ levelId }) => levelId)));
      } else if (owner.driverId === driver.driverId) owner.paths.push(curvePath);
      else {
        for (const path of owner.paths) issues.push(issue("curve-shared-across-drivers", path, "A curve instance may belong to only one impacted driver."));
        issues.push(issue("curve-shared-across-drivers", curvePath, "A curve instance may belong to only one impacted driver."));
      }
    }
  }
  for (const [index, curve] of input.semanticPayload.curves.entries()) {
    const path = `/semanticPayload/curves/${index}/amplitudeByLevel`; const required = requiredLevels.get(curve.curveId);
    if (!required) continue;
    for (const levelId of [...required].sort(compare)) if (!(levelId in curve.amplitudeByLevel)) issues.push(issue("missing-curve-amplitude", jsonPointer(path, levelId), "Curve amplitude is required for every level of each scale that uses the curve."));
    for (const levelId of Object.keys(curve.amplitudeByLevel).sort(compare)) if (!required.has(levelId)) issues.push(issue("unknown-curve-level", jsonPointer(path, levelId), "Curve amplitude level is not used by a scale that references this curve."));
  }
}

function validateConstraint(constraint: ConstraintDefinition, path: string, indexes: Indexes, issues: ContractIssue[]): void {
  validatePredicate(constraint.activation, `${path}/activation`, indexes, issues);
  if (constraint.sustain.kind !== "until-explicit-transition") validatePredicate(constraint.sustain, `${path}/sustain`, indexes, issues);
  if (constraint.deactivation.kind !== "none") validatePredicate(constraint.deactivation, `${path}/deactivation`, indexes, issues);
  const transitionKeys = constraint.allowedTransitions.map((entry) => `${entry.from}->${entry.to}`);
  duplicateValues(transitionKeys, String, `${path}/allowedTransitions`, "", "duplicate-lifecycle-transition", issues);
  for (const [index, transition] of constraint.allowedTransitions.entries()) {
    if (transition.from === transition.to) issues.push(issue("lifecycle-self-transition", `${path}/allowedTransitions/${index}/to`, "Lifecycle transition must change state."));
  }
  if (constraint.initialLifecycle === "inactive" && !transitionKeys.includes("inactive->active")) issues.push(issue("missing-activation-transition", `${path}/allowedTransitions`, "An initially inactive constraint must allow inactive to active."));
  if (constraint.activeEffects.length === 0) issues.push(issue("missing-active-effect", `${path}/activeEffects`, "A constraint must define at least one active effect."));
  duplicateValues(constraint.activeEffects, (entry) => entry.dimensionId, `${path}/activeEffects`, "dimensionId", "duplicate-active-effect", issues);
  for (const [index, effect] of constraint.activeEffects.entries()) requireRef(indexes.dimensions, effect.dimensionId, `${path}/activeEffects/${index}/dimensionId`, "unknown-dimension-reference", "dimension", issues);
}

function validatePredicate(root: Predicate, path: string, indexes: Indexes, issues: ContractIssue[]): void {
  const stack: Located<Predicate>[] = [{ value: root, path }];
  while (stack.length) {
    const current = stack.pop()!; const predicate = current.value;
    if (predicate.kind === "measure-below") {
      const measure = indexes.measures.get(predicate.measureId);
      requireRef(indexes.measures, predicate.measureId, `${current.path}/measureId`, "unknown-measure-reference", "measure", issues);
      if (measure && (predicate.threshold < measure.value.range.minimum || predicate.threshold > measure.value.range.maximum)) issues.push(issue("predicate-threshold-out-of-range", `${current.path}/threshold`, "Predicate threshold must be inside the referenced measure range."));
    }
    else if (predicate.kind === "driver-at-level") {
      const driver = indexes.drivers.get(predicate.driverId); requireRef(indexes.drivers, predicate.driverId, `${current.path}/driverId`, "unknown-driver-reference", "driver", issues);
      const scale = driver ? indexes.scales.get(driver.value.scaleId) : undefined; const levels = new Set(scale?.value.levels.map((x) => x.levelId));
      duplicateValues(predicate.levelIds, String, `${current.path}/levelIds`, "", "duplicate-level-reference", issues);
      predicate.levelIds.forEach((levelId, index) => { if (driver && !levels.has(levelId)) issues.push(issue("unknown-level-reference", `${current.path}/levelIds/${index}`, "Predicate level must exist in the referenced driver's scale.")); });
    } else {
      duplicateValues(predicate.predicates, canonicalPredicateKeyV1, `${current.path}/predicates`, "", "duplicate-predicate-child", issues);
      for (let index = predicate.predicates.length - 1; index >= 0; index -= 1) stack.push({ value: predicate.predicates[index], path: `${current.path}/predicates/${index}` });
    }
  }
}

function validateMeasures(input: StructurallyValidatedDomainModelContractV1, indexes: Indexes, issues: ContractIssue[]): void {
  const dependencies: { from: string; to: string; path: string }[] = [];
  for (const [measureIndex, measure] of input.semanticPayload.measures.entries()) {
    const path = `/semanticPayload/measures/${measureIndex}`;
    if (!(measure.range.minimum < measure.range.maximum)) issues.push(issue("invalid-measure-range", `${path}/range`, "Measure range must have minimum less than maximum."));
    for (const [field, value] of [["initialValue", measure.initialValue], ["recovery/targetValue", measure.recovery.targetValue]] as const) if (value < measure.range.minimum || value > measure.range.maximum) issues.push(issue("measure-value-out-of-range", `${path}/${field}`, "Measure value must be inside its range."));
    duplicateValues(measure.terms, (term) => term.termId, `${path}/terms`, "termId", "duplicate-term-id", issues);
    for (const [termIndex, term] of measure.terms.entries()) {
      const sourcePath = `${path}/terms/${termIndex}/source`; const source = term.source;
      if (source.kind === "dimension") requireRef(indexes.dimensions, source.dimensionId, `${sourcePath}/dimensionId`, "unknown-dimension-reference", "dimension", issues);
      else if (source.kind === "aggregate-driver-pressure") { duplicateValues(source.driverIds, String, `${sourcePath}/driverIds`, "", "duplicate-driver-reference", issues); source.driverIds.forEach((id, index) => requireRef(indexes.drivers, id, `${sourcePath}/driverIds/${index}`, "unknown-driver-reference", "driver", issues)); }
      else if (source.kind === "measure") { requireRef(indexes.measures, source.measureId, `${sourcePath}/measureId`, "unknown-measure-reference", "measure", issues); dependencies.push({ from: measure.measureId, to: source.measureId, path: `${sourcePath}/measureId` }); if (source.measureId === measure.measureId) issues.push(issue("measure-self-reference", `${sourcePath}/measureId`, "A measure must not reference itself.")); }
    }
    const ruleKeys = measure.escalationRules.map((rule) => `${rule.driverId}\0${rule.whenBelow}`);
    duplicateValues(ruleKeys, String, `${path}/escalationRules`, "", "duplicate-escalation-rule", issues);
    for (const [ruleIndex, rule] of measure.escalationRules.entries()) {
      const rulePath = `${path}/escalationRules/${ruleIndex}`; const driver = indexes.drivers.get(rule.driverId);
      requireRef(indexes.drivers, rule.driverId, `${rulePath}/driverId`, "unknown-driver-reference", "driver", issues);
      if (rule.whenBelow < measure.range.minimum || rule.whenBelow > measure.range.maximum) issues.push(issue("escalation-threshold-out-of-range", `${rulePath}/whenBelow`, "Escalation threshold must be inside the measure range."));
      // V1 escalation transitions form a deterministic partial function from source level to target level.
      // Conditional branching requires a later protocol version.
      duplicateValues(rule.transitions, (entry) => entry.fromLevelId, `${rulePath}/transitions`, "fromLevelId", "duplicate-level-transition", issues);
      const scale = driver ? indexes.scales.get(driver.value.scaleId) : undefined; const ranks = new Map(scale?.value.levels.map((x) => [x.levelId, x.rank]));
      rule.transitions.forEach((transition, transitionIndex) => {
        const transitionPath = `${rulePath}/transitions/${transitionIndex}`;
        if (!ranks.has(transition.fromLevelId)) issues.push(issue("unknown-level-reference", `${transitionPath}/fromLevelId`, "Transition level must exist in the referenced driver's scale."));
        if (!ranks.has(transition.toLevelId)) issues.push(issue("unknown-level-reference", `${transitionPath}/toLevelId`, "Transition level must exist in the referenced driver's scale."));
        if (ranks.has(transition.fromLevelId) && ranks.has(transition.toLevelId) && ranks.get(transition.toLevelId)! <= ranks.get(transition.fromLevelId)!) issues.push(issue("invalid-escalation-transition", transitionPath, "Escalation must move to a strictly higher rank."));
      });
    }
  }
  detectDirectedCycles(dependencies, "measure-dependency-cycle", issues);
}

function detectDirectedCycles(edges: readonly { from: string; to: string; path: string }[], code: SemanticIssueCode, issues: ContractIssue[]): void {
  const adjacency = new Map<string, { to: string; path: string }[]>();
  for (const edge of edges) { const list = adjacency.get(edge.from) ?? []; list.push({ to: edge.to, path: edge.path }); adjacency.set(edge.from, list); }
  for (const list of adjacency.values()) list.sort((a, b) => compare(a.to, b.to) || compare(a.path, b.path));
  const state = new Map<string, 0 | 1 | 2>(); const cyclePaths = new Set<string>();
  for (const start of [...adjacency.keys()].sort(compare)) {
    if (state.get(start)) continue;
    const stack: { node: string; next: number; via?: string }[] = [{ node: start, next: 0 }]; state.set(start, 1);
    while (stack.length) {
      const frame = stack.at(-1)!; const outgoing = adjacency.get(frame.node) ?? [];
      if (frame.next >= outgoing.length) { state.set(frame.node, 2); stack.pop(); continue; }
      const edge = outgoing[frame.next++]; const targetState = state.get(edge.to) ?? 0;
      if (targetState === 0) { state.set(edge.to, 1); stack.push({ node: edge.to, next: 0, via: edge.path }); }
      else if (targetState === 1) { cyclePaths.add(edge.path); for (let index = stack.length - 1; index > 0; index -= 1) { cyclePaths.add(stack[index].via!); if (stack[index - 1].node === edge.to) break; } }
    }
  }
  for (const path of [...cyclePaths].sort(compare)) issues.push(issue(code, path, "Directed dependency graph must be acyclic."));
}

function requireRef(index: Map<string, unknown>, id: string, path: string, code: SemanticIssueCode, noun: string, issues: ContractIssue[]): void {
  if (!index.has(id)) issues.push(issue(code, path, `Referenced ${noun} ${JSON.stringify(id)} does not exist.`));
}
function fail(issues: readonly ContractIssue[]): SemanticValidationResult {
  const sorted = sortContractIssues(issues); const unique: ContractIssue[] = [];
  for (const entry of sorted) { const previous = unique.at(-1); if (!previous || previous.path !== entry.path || previous.code !== entry.code || previous.message !== entry.message) unique.push(Object.freeze(entry)); }
  return Object.freeze({ ok: false, issues: Object.freeze(unique) });
}
function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function deepFreezeIterative<T>(root: T): T { const stack: object[] = [root as object]; while (stack.length) { const value = stack.pop()!; if (Object.isFrozen(value)) continue; Object.freeze(value); for (const nested of Object.values(value)) if (nested && typeof nested === "object") stack.push(nested); } return root; }
