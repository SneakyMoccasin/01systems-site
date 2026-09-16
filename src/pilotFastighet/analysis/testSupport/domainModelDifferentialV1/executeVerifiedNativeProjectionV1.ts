import type { SemanticHashVerifiedDomainModelContractV1, CurveDefinition } from "../domainModelContractV1/contractV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import {
  buildLegacyCompatibilityExecutionPlanV1,
  buildPureNativePropagationOrderV1,
  PROPAGATION_DECLARATION_PATH,
  type CompatibilityExecutionPlanV1,
  type AdmittedActionOccurrenceV1,
  type NativeSourceCaseProjectionV1,
  type OrderedPropagationOccurrenceV1,
  type RegistryOverlayEntryV1,
} from "./buildLegacyCompatibilityExecutionPlanV1";
import { compareCodeUnits, detachedFrozen, type CompatibilityLedgerEntry } from "./differentialExecutionV1";

type NativeNodeState = Readonly<{ levelId: string; score: number }>;
type NativeState = Readonly<Record<string, NativeNodeState>>;
type Dimensions = Record<string, number>;

export type PropagationEventV1 = Readonly<{
  step: number;
  sourceRisk: string;
  targetRisk: string;
  level: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  iteration: number;
  delaySteps: 1;
}>;

export type NativeExecutionResultV1 = Readonly<{
  comparisonSurface: unknown;
  compatibilityLedger: readonly CompatibilityLedgerEntry[];
  activatedDeclarationPaths: readonly string[];
}>;

function fail(reason: string): never {
  throw new Error(`M1D native execution rejected: ${reason}.`);
}

function levelIndex(contract: SemanticHashVerifiedDomainModelContractV1) {
  const levels = new Map<string, Readonly<{ rank: number; anchor: number }>>();
  for (const scale of contract.semanticPayload.scales) {
    for (const level of scale.levels) {
      const previous = levels.get(level.levelId);
      if (previous && (previous.rank !== level.rank || previous.anchor !== level.anchor)) fail(`ambiguous level ${level.levelId}`);
      levels.set(level.levelId, level);
    }
  }
  return levels;
}

function validateSourceCase(contract: SemanticHashVerifiedDomainModelContractV1, sourceCase: NativeSourceCaseProjectionV1): void {
  if (sourceCase.version !== "native-source-case-projection-v1") fail("source projection version");
  if (sourceCase.profileId !== contract.identity.profileId || sourceCase.domainId !== contract.identity.domainId) fail("source projection identity mismatch");
  const drivers = new Set(contract.semanticPayload.drivers.map((driver) => driver.driverId));
  if (Object.keys(sourceCase.initialState).length !== drivers.size) fail("incomplete native initial state");
  const outputIds = new Set<string>();
  for (const driverId of drivers) {
    if (!sourceCase.initialState[driverId]) fail(`missing native initial state ${driverId}`);
    const outputId = sourceCase.outputSourceIdByNativeId[driverId];
    if (!outputId) fail(`missing output source identity ${driverId}`);
    if (outputIds.has(outputId)) fail(`output identity collision ${outputId}`);
    outputIds.add(outputId);
  }
}

function resolveCurveAtLevel(curve: CurveDefinition, level: string, step: number): number {
  const amplitude = curve.amplitudeByLevel[level];
  if (typeof amplitude !== "number") fail(`missing curve amplitude ${curve.curveId}/${level}`);
  if (curve.type === "linear") return amplitude;
  if (curve.type === "exponential") return Math.pow(amplitude, curve.exponent);
  if (curve.type === "logistic") return 1 + (amplitude - 1) / (1 + Math.exp(-curve.k * (step - curve.x0)));
  return fail("unsupported curve discriminant");
}

function resolveCurve(contract: SemanticHashVerifiedDomainModelContractV1, curve: CurveDefinition, score: number, step: number): number {
  const levels = [...levelIndex(contract).entries()].sort((left, right) => left[1].rank - right[1].rank);
  const clamped = Math.max(levels[0][1].anchor, Math.min(levels.at(-1)![1].anchor, score));
  const lower = levels[Math.floor(clamped)]?.[0] ?? fail(`missing lower curve level ${clamped}`);
  const upper = levels[Math.ceil(clamped)]?.[0] ?? fail(`missing upper curve level ${clamped}`);
  const lowerValue = resolveCurveAtLevel(curve, lower, step);
  const upperValue = resolveCurveAtLevel(curve, upper, step);
  return lowerValue + (upperValue - lowerValue) * (clamped - Math.floor(clamped));
}

function dimensions(contract: SemanticHashVerifiedDomainModelContractV1, state: NativeState, step: number, usePreciseScores: boolean): Dimensions {
  const result = Object.fromEntries(contract.semanticPayload.dimensions.map((dimension) => [dimension.dimensionId, dimension.neutralValue])) as Dimensions;
  const curves = new Map(contract.semanticPayload.curves.map((curve) => [curve.curveId, curve]));
  const drivers = new Map(contract.semanticPayload.drivers.map((driver) => [driver.driverId, driver]));
  for (const driverId of Object.keys(state)) {
    const driver = drivers.get(driverId);
    if (!driver) continue;
    const node = state[driver.driverId];
    if (!node) fail(`missing native driver state ${driver.driverId}`);
    for (const impact of [...driver.impacts].sort((a, b) => compareCodeUnits(`${a.dimensionId}:${a.curveId}:${a.direction}`, `${b.dimensionId}:${b.curveId}:${b.direction}`))) {
      const curve = curves.get(impact.curveId);
      if (!curve) fail(`curve-fallback-hit:${driver.driverId}:missing-curve-configuration:step-${step}`);
      const score = usePreciseScores
        ? node.score
        : levelIndex(contract).get(node.levelId)?.anchor ?? fail(`missing level anchor ${node.levelId}`);
      const multiplier = resolveCurve(contract, curve, score, step);
      const current = result[impact.dimensionId];
      if (typeof current !== "number") fail(`unknown dimension ${impact.dimensionId}`);
      result[impact.dimensionId] = impact.direction === "increase" ? current * multiplier : current / multiplier;
    }
  }
  return result;
}

export function executeOrderedPropagationV1(input: Readonly<{
  contract: SemanticHashVerifiedDomainModelContractV1;
  initialState: NativeState;
  orderedOccurrences: readonly OrderedPropagationOccurrenceV1[];
  implicitNode: CompatibilityExecutionPlanV1["implicitNode"];
}>): Readonly<{ state: NativeState; events: readonly PropagationEventV1[]; evaluatedEdgeIds: readonly string[] }> {
  const levels = levelIndex(input.contract);
  const state = structuredClone(input.initialState) as Record<string, { levelId: string; score: number }>;
  const events: PropagationEventV1[] = [];
  const evaluatedEdgeIds: string[] = [];
  let iteration = 0;
  let changed: boolean;
  do {
    iteration += 1;
    changed = false;
    for (const occurrence of input.orderedOccurrences) {
      evaluatedEdgeIds.push(occurrence.edgeId);
      const source = state[occurrence.sourceId];
      if (!source || !occurrence.triggerLevelIds.includes(source.levelId)) continue;
      const target = state[occurrence.targetId];
      const currentLevelId = target?.levelId ?? (input.implicitNode?.adapterLocalNodeId === occurrence.targetId
        ? input.implicitNode.targetMissingDefaultLevelId
        : fail(`missing undeclared target ${occurrence.targetId}`));
      const current = levels.get(currentLevelId);
      const propagated = levels.get(occurrence.propagatedLevelId);
      if (!current || !propagated) fail(`missing propagation level ${currentLevelId}/${occurrence.propagatedLevelId}`);
      if (propagated.rank <= current.rank) continue;
      state[occurrence.targetId] = { levelId: occurrence.propagatedLevelId, score: propagated.anchor };
      changed = true;
      events.push({
        step: iteration + 1,
        sourceRisk: occurrence.sourceLegacyId,
        targetRisk: occurrence.targetLegacyId,
        level: occurrence.propagatedLevelId.toUpperCase() as PropagationEventV1["level"],
        iteration,
        delaySteps: 1,
      });
    }
  } while (changed);
  return detachedFrozen({ state, events, evaluatedEdgeIds });
}

function transform(value: number, kind: string, neutral = 1): number {
  if (kind === "identity") return value;
  if (kind === "deviation-from-neutral") return value - neutral;
  if (kind === "positive-deviation-from-neutral") return Math.max(0, value - neutral);
  if (kind === "inverse-from-neutral") return neutral - value;
  return fail(`unsupported measure transform ${kind}`);
}

function scoreLevel(contract: SemanticHashVerifiedDomainModelContractV1, score: number): string {
  for (const scale of contract.semanticPayload.scales) {
    for (const level of scale.levels) {
      const materialization = level.materialization;
      if (score < materialization.minimumInclusive) continue;
      if (typeof materialization.maximumExclusive === "number" && score < materialization.maximumExclusive) return level.levelId;
      if (typeof materialization.maximumInclusive === "number" && score <= materialization.maximumInclusive) return level.levelId;
    }
  }
  return fail(`score outside declared materialization ranges ${score}`);
}

function applyScheduledActions(
  contract: SemanticHashVerifiedDomainModelContractV1,
  state: NativeState,
  actions: NativeSourceCaseProjectionV1["schedules"]["A"],
  executionStep: number
): NativeState {
  const index = new Map(contract.semanticPayload.actions.map((action) => [action.actionId, action]));
  const deltas = new Map<string, number>();
  for (const scheduled of [...actions]
    .filter((entry) => entry.executionStep === executionStep)
    .sort((a, b) => compareCodeUnits(a.actionId, b.actionId))) {
    const action = index.get(scheduled.actionId) ?? fail(`unsupported native action ${scheduled.actionId}`);
    for (const effect of [...action.effects].sort((a, b) => compareCodeUnits(a.driverId, b.driverId))) {
      deltas.set(effect.driverId, (deltas.get(effect.driverId) ?? 0) + effect.delta);
    }
  }
  if (deltas.size === 0) return state;
  const next = structuredClone(state) as Record<string, { levelId: string; score: number }>;
  for (const [driverId, delta] of deltas) {
    const current = next[driverId] ?? fail(`missing action driver ${driverId}`);
    const score = Math.max(0, Math.min(3, current.score + delta));
    next[driverId] = { score, levelId: scoreLevel(contract, score) };
  }
  return next;
}

function runScenario(input: Readonly<{
  contract: SemanticHashVerifiedDomainModelContractV1;
  sourceCase: NativeSourceCaseProjectionV1;
  orderedOccurrences: readonly OrderedPropagationOccurrenceV1[];
  implicitNode: CompatibilityExecutionPlanV1["implicitNode"];
  registryOverlay: readonly RegistryOverlayEntryV1[];
  actions: NativeSourceCaseProjectionV1["schedules"]["A"];
}>) {
  const { contract, sourceCase } = input;
  const measure = contract.semanticPayload.measures.find((entry) => entry.measureId === "structural-margin") ?? fail("contract-error: missing structural-margin measure");
  const constraint = contract.semanticPayload.constraints.find((entry) => entry.constraintId === "refinancing-constraint");
  if (constraint && constraint.activation.kind !== "measure-below") fail("unsupported constraint activation");
  const constraintThreshold = constraint?.activation.kind === "measure-below" ? constraint.activation.threshold : null;
  let margin = measure.initialValue;
  let lifecycle: "inactive" | "active" = constraint?.initialLifecycle === "active" ? "active" : "inactive";
  let activatedAtStep: number | undefined;
  let state: NativeState = structuredClone(sourceCase.initialState);
  const trajectory: unknown[] = [];
  let cascadeHistory: PropagationEventV1[] = [];
  for (let index = 0; index < sourceCase.horizon; index += 1) {
    state = applyScheduledActions(contract, state, input.actions, index + 1);
    for (const rule of measure.escalationRules) {
      if (margin >= rule.whenBelow) continue;
      const current = state[rule.driverId];
      const transition = current && rule.transitions.find((entry) => entry.fromLevelId === current.levelId);
      if (current && transition) {
        const anchor = levelIndex(contract).get(transition.toLevelId)?.anchor ?? fail(`missing escalation level ${transition.toLevelId}`);
        state = { ...state, [rule.driverId]: { levelId: transition.toLevelId, score: anchor } };
      }
    }
    const propagated = executeOrderedPropagationV1({ contract, initialState: state, orderedOccurrences: input.orderedOccurrences, implicitNode: input.implicitNode });
    state = propagated.state;
    cascadeHistory = [...cascadeHistory, ...propagated.events];
    const base = dimensions(contract, state, index, false);
    const pressureBase = dimensions(contract, state, index, true);
    if (constraint && constraintThreshold !== null && margin < constraintThreshold && lifecycle !== "active") {
      lifecycle = "active";
      activatedAtStep = index;
    }
    const adjusted = { ...base };
    if (constraint && lifecycle === "active") for (const effect of constraint.activeEffects) adjusted[effect.dimensionId] *= effect.value;
    const basePressure = (pressureBase.load - 1) + (pressureBase.cost - 1) + (1 - pressureBase.recovery) + (pressureBase.sensitivity - 1);
    let erosion = 0;
    for (const term of measure.terms) {
      let sourceValue: number;
      if (term.source.kind === "dimension") sourceValue = (term.source.stage === "base" ? base : adjusted)[term.source.dimensionId];
      else if (term.source.kind === "protocol-signal" && term.source.signalId === "base-dimension-pressure-sum-v1") sourceValue = basePressure;
      else return fail(`unsupported measure source ${term.termId}`);
      erosion += transform(sourceValue, term.transform) * term.weight;
    }
    const pull = (measure.recovery.targetValue - margin) * measure.recovery.pull;
    margin = Math.max(measure.range.minimum, Math.min(measure.range.maximum, margin - erosion + pull));
    const riskState: Record<string, string> = {};
    const driverScores: Record<string, number> = {};
    for (const nativeId of Object.keys(state).sort(compareCodeUnits)) {
      const sourceId = sourceCase.outputSourceIdByNativeId[nativeId]
        ?? (input.implicitNode?.adapterLocalNodeId === nativeId ? input.implicitNode.sourceNodeId : fail(`missing output mapping ${nativeId}`));
      riskState[sourceId] = state[nativeId].levelId.toUpperCase();
      driverScores[sourceId] = state[nativeId].score;
    }
    const refinancing = {
      type: "RefinancingConstraint" as const,
      lifecycle: lifecycle === "active" ? "ACTIVE" as const : "INACTIVE" as const,
      ...(activatedAtStep === undefined ? {} : { activatedAtStep }),
      lastUpdatedStep: activatedAtStep ?? 0,
    };
    const registry: Record<string, unknown> = constraint ? { RefinancingConstraint: refinancing } : {};
    for (const entry of input.registryOverlay) {
      if (Object.prototype.hasOwnProperty.call(registry, entry.sourceRegistryKey)) fail(`registry collision ${entry.sourceRegistryKey}`);
      registry[entry.sourceRegistryKey] = { type: entry.legacyType, lifecycle: entry.lifecycle, lastUpdatedStep: entry.lastUpdatedStep };
    }
    trajectory.push({ step: index + 1, margin, registry, riskState, driverScores, cascadeEvents: cascadeHistory });
  }
  return detachedFrozen({
    trajectory,
    terminalState: structuredClone(trajectory.at(-1)),
    marginHistory: trajectory.map((entry) => (entry as { margin: number }).margin),
    constraintHistory: trajectory.map((entry) => structuredClone((entry as { registry: unknown }).registry)),
    cascadeHistory,
  });
}

function executeCore(input: Readonly<{
  contract: SemanticHashVerifiedDomainModelContractV1;
  sourceCase: NativeSourceCaseProjectionV1;
  orderedOccurrences: readonly OrderedPropagationOccurrenceV1[];
  implicitNode: CompatibilityExecutionPlanV1["implicitNode"];
  registryOverlay: readonly RegistryOverlayEntryV1[];
  declarationPaths: readonly string[];
}>): NativeExecutionResultV1 {
  validateSourceCase(input.contract, input.sourceCase);
  const scenarioInput = { contract: input.contract, sourceCase: input.sourceCase, orderedOccurrences: input.orderedOccurrences, implicitNode: input.implicitNode, registryOverlay: input.registryOverlay };
  const scenarioA = runScenario({ ...scenarioInput, actions: input.sourceCase.schedules.A });
  const scenarioB = runScenario({ ...scenarioInput, actions: input.sourceCase.schedules.B });
  const baseline = runScenario({ ...scenarioInput, actions: [] });
  const marginDifferenceByStep = scenarioB.marginHistory.map((margin, index) => margin - scenarioA.marginHistory[index]);
  const firstDivergenceIndex = marginDifferenceByStep.findIndex((difference) => difference !== 0);
  const comparisonSurface = {
    schemaVersion: "canonical-engine-output-projection-v1",
    fixtureId: input.sourceCase.fixtureId,
    executionSurface: input.sourceCase.schedules.A.length === 0 && input.sourceCase.schedules.B.length === 0
      ? "runCascadeAnalysis/preconfigured"
      : "runCascadeAnalysis/scheduled",
    profileIdentity: structuredClone(input.sourceCase.executionProfileIdentity),
    horizon: input.sourceCase.horizon,
    plannedSchedules: input.sourceCase.schedules,
    scenarioA,
    scenarioB,
    baseline,
    comparison: {
      marginDifferenceByStep,
      firstDivergenceIndex: firstDivergenceIndex === -1 ? null : firstDivergenceIndex,
      terminalMarginDifference: scenarioB.marginHistory.at(-1)! - scenarioA.marginHistory.at(-1)!,
    },
    executionProvenance: [...([...input.sourceCase.schedules.A]
      .sort((a, b) => a.executionStep - b.executionStep || compareCodeUnits(a.actionId, b.actionId))
      .map((entry) => ({ scenario: "scenarioA" as const, ...projectProvenance(input.contract, input.sourceCase, entry) }))),
      ...([...input.sourceCase.schedules.B]
        .sort((a, b) => a.executionStep - b.executionStep || compareCodeUnits(a.actionId, b.actionId))
        .map((entry) => ({ scenario: "scenarioB" as const, ...projectProvenance(input.contract, input.sourceCase, entry) })))],
  };
  const compatibilityLedger: CompatibilityLedgerEntry[] = input.declarationPaths.includes(PROPAGATION_DECLARATION_PATH)
    ? [{ declarationPath: PROPAGATION_DECLARATION_PATH, status: "applied", mechanism: "legacy-ordered-propagation-v1", sourceId: null, nativeId: null, executionStep: 0 }]
    : [];
  compatibilityLedger.push(...input.registryOverlay.map((entry) => ({
    declarationPath: entry.declarationPath,
    status: "applied" as const,
    mechanism: "legacy-inert-registry-output-materialization-v1",
    sourceId: entry.sourceRegistryKey,
    nativeId: entry.compatibilityEntryId,
    executionStep: 0,
  })));
  return detachedFrozen({ comparisonSurface, compatibilityLedger, activatedDeclarationPaths: input.declarationPaths });
}

function projectProvenance(
  contract: SemanticHashVerifiedDomainModelContractV1,
  sourceCase: NativeSourceCaseProjectionV1,
  entry: Readonly<{ actionId: string; executionStep: number }>
) {
  const action = contract.semanticPayload.actions.find((candidate) => candidate.actionId === entry.actionId)
    ?? fail(`unsupported native action ${entry.actionId}`);
  return {
    actionId: entry.actionId,
    scheduledStep: entry.executionStep,
    actualExecutionStep: entry.executionStep,
    appliedDriverDeltas: Object.fromEntries(action.effects
      .map((effect) => [sourceCase.outputSourceIdByNativeId[effect.driverId] ?? fail(`missing action output mapping ${effect.driverId}`), effect.delta] as const)
      .sort(([left], [right]) => compareCodeUnits(left, right))),
  };
}

export function executePureNativeProjectionV1(input: Readonly<{
  contract: SemanticHashVerifiedDomainModelContractV1;
  sourceCase: NativeSourceCaseProjectionV1;
}>): NativeExecutionResultV1 {
  return executeCore({
    contract: input.contract,
    sourceCase: input.sourceCase,
    orderedOccurrences: buildPureNativePropagationOrderV1(input.contract, input.sourceCase),
    implicitNode: null,
    registryOverlay: [],
    declarationPaths: [],
  });
}

export function executeCompatibilityEffectiveProjectionV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  sourceCase: NativeSourceCaseProjectionV1;
}>): NativeExecutionResultV1 {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  return executeCore({
    contract: input.envelope.projection.contract,
    sourceCase: input.sourceCase,
    orderedOccurrences: plan.orderedPropagation,
    implicitNode: plan.implicitNode,
    registryOverlay: plan.registryEntries,
    declarationPaths: plan.declarationPaths,
  });
}

export function executeAdmittedCompatibilityActionV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  sourceCase: NativeSourceCaseProjectionV1;
  admitted: AdmittedActionOccurrenceV1;
}>): NativeExecutionResultV1 {
  const scheduled = { actionId: input.admitted.entry.sourceActionId, executionStep: input.admitted.occurrence.scheduledStep };
  const executableSchedule = input.admitted.entry.retainedEffects.length === 0 ? [] : [scheduled];
  const projectedCase = detachedFrozen({
    ...input.sourceCase,
    fixtureId: `${input.sourceCase.fixtureId}:${scheduled.actionId}:step-${scheduled.executionStep}`,
    schedules: { A: executableSchedule, B: [] },
  });
  const executed = executeCompatibilityEffectiveProjectionV1({ envelope: input.envelope, sourceCase: projectedCase });
  const surface = structuredClone(executed.comparisonSurface) as Record<string, unknown>;
  surface.executionSurface = "runCascadeAnalysis/scheduled";
  surface.plannedSchedules = { A: [scheduled], B: [] };
  const ledger = [...executed.compatibilityLedger, {
    declarationPath: input.admitted.declarationPath,
    status: input.admitted.entry.retainedEffects.length === 0 ? "ignored" as const : "applied" as const,
    mechanism: "legacy-action-admission-v1",
    sourceId: input.admitted.entry.sourceActionId,
    nativeId: input.admitted.entry.retainedEffects.length === 0 ? null : input.admitted.entry.sourceActionId,
    executionStep: input.admitted.occurrence.scheduledStep,
  }];
  return detachedFrozen({ comparisonSurface: surface, compatibilityLedger: ledger, activatedDeclarationPaths: [...executed.activatedDeclarationPaths, input.admitted.declarationPath].sort(compareCodeUnits) });
}

export function executeDerivedRegistryCounterfactualsV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  sourceCase: NativeSourceCaseProjectionV1;
}>): readonly NativeExecutionResultV1[] {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  return detachedFrozen(plan.registryEntries.map((entry) => executeCore({
    contract: input.envelope.projection.contract,
    sourceCase: input.sourceCase,
    orderedOccurrences: buildPureNativePropagationOrderV1(input.envelope.projection.contract, input.sourceCase),
    implicitNode: null,
    registryOverlay: [entry],
    declarationPaths: [entry.declarationPath],
  })));
}

export function executeDerivedPropagationCounterfactualV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  sourceCase: NativeSourceCaseProjectionV1;
}>): NativeExecutionResultV1 {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  return executeCore({
    contract: input.envelope.projection.contract,
    sourceCase: input.sourceCase,
    orderedOccurrences: plan.orderedPropagation,
    implicitNode: plan.implicitNode,
    registryOverlay: [],
    declarationPaths: [PROPAGATION_DECLARATION_PATH],
  });
}

export function executeCompatibilityPropagationWitnessV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  initialState: NativeState;
}>) {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  const result = executeOrderedPropagationV1({ contract: input.envelope.projection.contract, initialState: input.initialState, orderedOccurrences: plan.orderedPropagation, implicitNode: plan.implicitNode });
  return detachedFrozen({ ...result, declarationPath: PROPAGATION_DECLARATION_PATH });
}

export function executeImmediateVisibilityWitnessV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  initialState: NativeState;
}>) {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  const compatibilityOccurrences = plan.orderedPropagation.filter((occurrence) => occurrence.sourceKind === "compatibility");
  const result = executeOrderedPropagationV1({
    contract: input.envelope.projection.contract,
    initialState: input.initialState,
    orderedOccurrences: compatibilityOccurrences,
    implicitNode: plan.implicitNode,
  });
  return detachedFrozen({ ...result, declarationPath: PROPAGATION_DECLARATION_PATH });
}

export function evaluateSustainThresholdV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
}>) {
  const declaration = input.envelope.compatibility.sustainThresholdOverride;
  if (declaration && (declaration.sourceField !== "sustainThreshold" || declaration.comparison !== "margin-strictly-below-threshold" || declaration.applicability !== "this-envelope-source-only")) fail("sustainThreshold declaration mismatch");
  return detachedFrozen({
    declarationPath: declaration ? "/compatibility/sustainThresholdOverride" : null,
    status: declaration ? "deferred-missing-hash-bound-value" as const : "ineligible-no-declaration" as const,
    mechanismDeclared: declaration !== null,
    hashBoundValue: "absent" as const,
    execution: "deferred" as const,
  });
}
