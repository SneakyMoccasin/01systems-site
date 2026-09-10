import { ACTION_EFFECTS, DOMAIN_ACTIONS, type ActionKey } from "../../actionEffects";
import type { ExecutableDomainProfile } from "../../executableDomainProfile";
import type {
  ScenarioSchedules,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import type {
  DisplayedPeriod,
  InitiativeDefinition,
  InitiativeId,
  InitiativePrerequisite,
  InitiativeResourceClaim,
  PeriodCapacity,
  PositiveInteger,
  ScenarioInitiativeBinding,
  SharedResourceDefinition,
  SharedResourceId,
  StructuralObservationContractV1,
} from "./contract";

export type StructuralObservationValidationCode =
  | "invalid-contract"
  | "unknown-version"
  | "invalid-horizon"
  | "empty-initiative-id"
  | "duplicate-initiative-id"
  | "unknown-action-key"
  | "unsupported-action-key"
  | "unknown-prerequisite-initiative"
  | "self-prerequisite"
  | "duplicate-prerequisite"
  | "unsupported-dependency-type"
  | "dependency-cycle"
  | "empty-resource-id"
  | "duplicate-resource-id"
  | "unknown-resource"
  | "invalid-claim-amount"
  | "invalid-claim-duration"
  | "duplicate-resource-claim"
  | "invalid-resource-capacity"
  | "invalid-capacity-period"
  | "duplicate-capacity-period"
  | "missing-capacity-period"
  | "capacity-period-outside-horizon"
  | "unknown-binding-initiative"
  | "invalid-binding-scenario"
  | "duplicate-scenario-binding"
  | "duplicate-action-binding-in-scenario"
  | "binding-missing-schedule-entry"
  | "schedule-entry-missing-binding"
  | "resource-claim-outside-horizon";

export interface StructuralObservationValidationIssue {
  readonly code: StructuralObservationValidationCode;
  readonly path: string;
  readonly scenario?: ScheduleScenarioId;
  readonly initiativeId?: string;
  readonly actionKey?: string;
  readonly resourceId?: string;
  readonly plannedPeriod?: number;
  readonly horizon?: number;
  readonly message: string;
}

export type StructuralObservationValidationResult =
  | Readonly<{ valid: true; value: StructuralObservationContractV1; issues: readonly [] }>
  | Readonly<{ valid: false; issues: readonly StructuralObservationValidationIssue[] }>;

type UnknownRecord = Record<string, unknown>;
const SCENARIOS = ["A", "B"] as const;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function issueSort(a: StructuralObservationValidationIssue, b: StructuralObservationValidationIssue) {
  return compareText(a.path, b.path) || compareText(a.code, b.code) || compareText(a.message, b.message);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) deepFreeze(nested);
  }
  return value;
}

function push(
  issues: StructuralObservationValidationIssue[],
  code: StructuralObservationValidationCode,
  path: string,
  message: string,
  metadata: Omit<StructuralObservationValidationIssue, "code" | "path" | "message"> = {}
) {
  issues.push({ code, path, message, ...metadata });
}

function normalizedLabel(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function validateAndNormalizeStructuralObservationContract(input: Readonly<{
  contract: unknown;
  schedules: ScenarioSchedules;
  horizon: number;
  profile: ExecutableDomainProfile;
}>): StructuralObservationValidationResult {
  const issues: StructuralObservationValidationIssue[] = [];
  const source = record(input.contract);
  if (!source) {
    push(issues, "invalid-contract", "$", "Structural observation contract must be an object.");
    return Object.freeze({ valid: false, issues: Object.freeze(issues) });
  }
  if (source.version !== "structural-observation-v1") {
    push(issues, "unknown-version", "version", "Unsupported structural observation contract version.");
  }
  if (!Number.isInteger(input.horizon) || input.horizon < 1) {
    push(issues, "invalid-horizon", "horizon", "Horizon must be a positive integer.", { horizon: input.horizon });
  }

  const initiativeSources = Array.isArray(source.initiatives) ? source.initiatives : [];
  const resourceSources = Array.isArray(source.resources) ? source.resources : [];
  const bindingSources = Array.isArray(source.scenarioBindings) ? source.scenarioBindings : [];
  if (!Array.isArray(source.initiatives) || !Array.isArray(source.resources) || !Array.isArray(source.scenarioBindings)) {
    push(issues, "invalid-contract", "$", "Initiatives, resources, and scenarioBindings must be arrays.");
  }

  const initiatives: InitiativeDefinition[] = [];
  const initiativeIds = new Set<string>();
  const rawInitiativeIds = new Set(
    initiativeSources.map((value) => record(value)?.id).filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  initiativeSources.forEach((candidate, index) => {
    const path = `initiatives[${index}]`;
    const value = record(candidate);
    if (!value) {
      push(issues, "invalid-contract", path, "Initiative must be an object.");
      return;
    }
    const id = typeof value.id === "string" ? value.id : "";
    if (id.trim().length === 0) push(issues, "empty-initiative-id", `${path}.id`, "Initiative ID must not be empty.");
    else if (initiativeIds.has(id)) push(issues, "duplicate-initiative-id", `${path}.id`, "Initiative ID must be unique.", { initiativeId: id });
    initiativeIds.add(id);

    const actionKey = typeof value.actionKey === "string" ? value.actionKey : "";
    const knownAction = Object.prototype.hasOwnProperty.call(ACTION_EFFECTS, actionKey);
    if (!knownAction) push(issues, "unknown-action-key", `${path}.actionKey`, "Action key is not canonical.", { initiativeId: id, actionKey });
    else {
      const effect = input.profile.actionEffects[actionKey as ActionKey];
      const supported =
        effect &&
        DOMAIN_ACTIONS[input.profile.domainId].includes(actionKey as ActionKey) &&
        Object.keys(effect).every((driver) =>
          input.profile.applicableDrivers.includes(driver as never)
        );
      if (!supported) push(issues, "unsupported-action-key", `${path}.actionKey`, "Action key is not supported by the executable domain profile.", { initiativeId: id, actionKey });
    }

    const prerequisites: InitiativePrerequisite[] = [];
    const seenPrerequisites = new Set<string>();
    const prerequisiteSources = Array.isArray(value.prerequisites) ? value.prerequisites : [];
    if (!Array.isArray(value.prerequisites)) push(issues, "invalid-contract", `${path}.prerequisites`, "Prerequisites must be an array.");
    prerequisiteSources.forEach((raw, dependencyIndex) => {
      const dependencyPath = `${path}.prerequisites[${dependencyIndex}]`;
      const dependency = record(raw);
      const prerequisiteId = typeof dependency?.initiativeId === "string" ? dependency.initiativeId : "";
      if (dependency?.type !== "finish-to-start") push(issues, "unsupported-dependency-type", `${dependencyPath}.type`, "Only finish-to-start is supported.", { initiativeId: id });
      if (!rawInitiativeIds.has(prerequisiteId)) push(issues, "unknown-prerequisite-initiative", `${dependencyPath}.initiativeId`, "Prerequisite initiative is not defined.", { initiativeId: id });
      if (prerequisiteId === id) push(issues, "self-prerequisite", `${dependencyPath}.initiativeId`, "Initiative cannot depend on itself.", { initiativeId: id });
      if (seenPrerequisites.has(prerequisiteId)) push(issues, "duplicate-prerequisite", dependencyPath, "Prerequisite must be unique per initiative.", { initiativeId: id });
      seenPrerequisites.add(prerequisiteId);
      if (dependency?.type === "finish-to-start" && prerequisiteId) prerequisites.push({ initiativeId: prerequisiteId as InitiativeId, type: "finish-to-start" });
    });

    const resourceClaims: InitiativeResourceClaim[] = [];
    const seenClaims = new Set<string>();
    const claimSources = Array.isArray(value.resourceClaims) ? value.resourceClaims : [];
    if (!Array.isArray(value.resourceClaims)) push(issues, "invalid-contract", `${path}.resourceClaims`, "Resource claims must be an array.");
    claimSources.forEach((raw, claimIndex) => {
      const claimPath = `${path}.resourceClaims[${claimIndex}]`;
      const claim = record(raw);
      const resourceId = typeof claim?.resourceId === "string" ? claim.resourceId : "";
      if (seenClaims.has(resourceId)) push(issues, "duplicate-resource-claim", claimPath, "Initiative may claim a resource only once.", { initiativeId: id, resourceId });
      seenClaims.add(resourceId);
      if (typeof claim?.amount !== "number" || !Number.isFinite(claim.amount) || claim.amount <= 0) push(issues, "invalid-claim-amount", `${claimPath}.amount`, "Claim amount must be finite and greater than zero.", { initiativeId: id, resourceId });
      if (!Number.isInteger(claim?.durationPeriods) || (claim?.durationPeriods as number) < 1) push(issues, "invalid-claim-duration", `${claimPath}.durationPeriods`, "Claim duration must be a positive integer.", { initiativeId: id, resourceId });
      if (resourceId && typeof claim?.amount === "number" && Number.isFinite(claim.amount) && Number.isInteger(claim.durationPeriods)) resourceClaims.push({ resourceId: resourceId as SharedResourceId, amount: claim.amount, durationPeriods: claim.durationPeriods as PositiveInteger });
    });

    if (id && knownAction) initiatives.push({ id: id as InitiativeId, actionKey: actionKey as ActionKey, ...(normalizedLabel(value.label) === undefined ? {} : { label: normalizedLabel(value.label) }), prerequisites: prerequisites.sort((a, b) => compareText(a.initiativeId, b.initiativeId)), resourceClaims: resourceClaims.sort((a, b) => compareText(a.resourceId, b.resourceId)) });
  });

  const resources: SharedResourceDefinition[] = [];
  const resourceIds = new Set<string>();
  resourceSources.forEach((candidate, index) => {
    const path = `resources[${index}]`;
    const value = record(candidate);
    if (!value) { push(issues, "invalid-contract", path, "Resource must be an object."); return; }
    const id = typeof value.id === "string" ? value.id : "";
    if (id.trim().length === 0) push(issues, "empty-resource-id", `${path}.id`, "Resource ID must not be empty.");
    else if (resourceIds.has(id)) push(issues, "duplicate-resource-id", `${path}.id`, "Resource ID must be unique.", { resourceId: id });
    resourceIds.add(id);
    const capacity = record(value.capacity);
    if (capacity?.type === "constant") {
      if (typeof capacity.amount !== "number" || !Number.isFinite(capacity.amount) || capacity.amount < 0) push(issues, "invalid-resource-capacity", `${path}.capacity.amount`, "Capacity must be finite and non-negative.", { resourceId: id });
      else if (id) resources.push({ id: id as SharedResourceId, ...(normalizedLabel(value.label) === undefined ? {} : { label: normalizedLabel(value.label) }), capacity: { type: "constant", amount: capacity.amount } });
    } else if (capacity?.type === "periodized") {
      const amounts: PeriodCapacity[] = [];
      const seenPeriods = new Set<number>();
      const amountSources = Array.isArray(capacity.amounts) ? capacity.amounts : [];
      amountSources.forEach((raw, amountIndex) => {
        const amountPath = `${path}.capacity.amounts[${amountIndex}]`;
        const periodValue = record(raw);
        const period = periodValue?.period;
        const amount = periodValue?.amount;
        if (!Number.isInteger(period) || (period as number) < 1) push(issues, "invalid-capacity-period", `${amountPath}.period`, "Capacity period must be a positive integer.", { resourceId: id });
        else if (seenPeriods.has(period as number)) push(issues, "duplicate-capacity-period", `${amountPath}.period`, "Capacity period must be unique.", { resourceId: id });
        seenPeriods.add(period as number);
        if (Number.isInteger(period) && ((period as number) < 1 || (period as number) > input.horizon)) push(issues, "capacity-period-outside-horizon", `${amountPath}.period`, "Capacity period must be inside the horizon.", { resourceId: id, horizon: input.horizon });
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) push(issues, "invalid-resource-capacity", `${amountPath}.amount`, "Capacity must be finite and non-negative.", { resourceId: id });
        if (Number.isInteger(period) && typeof amount === "number" && Number.isFinite(amount) && amount >= 0) amounts.push({ period: period as DisplayedPeriod, amount });
      });
      if (Number.isInteger(input.horizon) && input.horizon > 0) for (let period = 1; period <= input.horizon; period += 1) if (!seenPeriods.has(period)) push(issues, "missing-capacity-period", `${path}.capacity.amounts`, `Periodized capacity is missing M${period}.`, { resourceId: id, horizon: input.horizon });
      if (id) resources.push({ id: id as SharedResourceId, ...(normalizedLabel(value.label) === undefined ? {} : { label: normalizedLabel(value.label) }), capacity: { type: "periodized", amounts: amounts.sort((a, b) => a.period - b.period) } });
    } else push(issues, "invalid-contract", `${path}.capacity`, "Resource capacity must be constant or periodized.", { resourceId: id });
  });

  for (const [initiativeIndex, initiative] of initiatives.entries()) for (const [claimIndex, claim] of initiative.resourceClaims.entries()) if (!resourceIds.has(claim.resourceId)) push(issues, "unknown-resource", `initiatives[${initiativeIndex}].resourceClaims[${claimIndex}].resourceId`, "Claim references an unknown resource.", { initiativeId: initiative.id, resourceId: claim.resourceId });

  const bindings: ScenarioInitiativeBinding[] = [];
  const seenBindings = new Set<string>();
  bindingSources.forEach((candidate, index) => {
    const path = `scenarioBindings[${index}]`;
    const value = record(candidate);
    if (!value) { push(issues, "invalid-contract", path, "Scenario binding must be an object."); return; }
    const initiativeId = typeof value.initiativeId === "string" ? value.initiativeId : "";
    const scenario = value.scenario;
    if (!rawInitiativeIds.has(initiativeId)) push(issues, "unknown-binding-initiative", `${path}.initiativeId`, "Binding references an unknown initiative.", { initiativeId });
    if (scenario !== "A" && scenario !== "B") push(issues, "invalid-binding-scenario", `${path}.scenario`, "Binding scenario must be A or B.", { initiativeId });
    if (scenario === "A" || scenario === "B") {
      const key = `${scenario}\0${initiativeId}`;
      if (seenBindings.has(key)) push(issues, "duplicate-scenario-binding", path, "Initiative may be bound only once per scenario.", { scenario, initiativeId });
      seenBindings.add(key);
      if (initiativeId) bindings.push({ scenario, initiativeId: initiativeId as InitiativeId });
    }
  });

  const initiativeById = new Map(initiatives.map((initiative) => [initiative.id as string, initiative]));
  for (const scenario of SCENARIOS) {
    const schedule = input.schedules[scenario];
    const scenarioBindings = bindings.filter((binding) => binding.scenario === scenario);
    const bindingsByAction = new Map<string, ScenarioInitiativeBinding[]>();
    for (const binding of scenarioBindings) {
      const initiative = initiativeById.get(binding.initiativeId);
      if (!initiative) continue;
      const entries = bindingsByAction.get(initiative.actionKey) ?? [];
      entries.push(binding);
      bindingsByAction.set(initiative.actionKey, entries);
    }
    for (const [actionKey, actionBindings] of bindingsByAction) if (actionBindings.length > 1) push(issues, "duplicate-action-binding-in-scenario", `scenarioBindings.${scenario}.${actionKey}`, "Only one initiative per canonical action may be bound in a scenario.", { scenario, actionKey });
    for (const binding of scenarioBindings) {
      const initiative = initiativeById.get(binding.initiativeId);
      if (!initiative) continue;
      const scheduled = schedule.filter((entry) => entry.actionId === initiative.actionKey);
      if (scheduled.length !== 1) push(issues, "binding-missing-schedule-entry", `scenarioBindings.${scenario}.${binding.initiativeId}`, "Binding must match exactly one schedule entry.", { scenario, initiativeId: binding.initiativeId, actionKey: initiative.actionKey });
      else for (const claim of initiative.resourceClaims) if (scheduled[0].executionStep + claim.durationPeriods - 1 > input.horizon) push(issues, "resource-claim-outside-horizon", `scenarioBindings.${scenario}.${binding.initiativeId}`, "Resource claim extends beyond the analysis horizon.", { scenario, initiativeId: binding.initiativeId, actionKey: initiative.actionKey, resourceId: claim.resourceId, plannedPeriod: scheduled[0].executionStep, horizon: input.horizon });
    }
    for (const [index, scheduled] of schedule.entries()) if ((bindingsByAction.get(scheduled.actionId)?.length ?? 0) !== 1) push(issues, "schedule-entry-missing-binding", `schedules.${scenario}[${index}]`, "Schedule entry must have exactly one initiative binding.", { scenario, actionKey: scheduled.actionId, plannedPeriod: scheduled.executionStep, horizon: input.horizon });
  }

  const graph = new Map(initiatives.map((initiative) => [initiative.id as string, initiative.prerequisites.map((dependency) => dependency.initiativeId as string)]));
  const state = new Map<string, 0 | 1 | 2>();
  const cycleMembers = new Set<string>();
  const visit = (id: string, stack: string[]) => {
    if (state.get(id) === 1) { const start = stack.indexOf(id); for (const member of stack.slice(start)) cycleMembers.add(member); return; }
    if (state.get(id) === 2) return;
    state.set(id, 1);
    for (const dependency of graph.get(id) ?? []) if (graph.has(dependency)) visit(dependency, [...stack, id]);
    state.set(id, 2);
  };
  for (const id of [...graph.keys()].sort(compareText)) visit(id, []);
  for (const id of [...cycleMembers].sort(compareText)) push(issues, "dependency-cycle", `initiatives.${id}.prerequisites`, "Initiative participates in a dependency cycle.", { initiativeId: id });

  issues.sort(issueSort);
  if (issues.length > 0) return deepFreeze({ valid: false as const, issues });
  return deepFreeze({ valid: true as const, value: { version: "structural-observation-v1", initiatives: initiatives.sort((a, b) => compareText(a.id, b.id)), resources: resources.sort((a, b) => compareText(a.id, b.id)), scenarioBindings: bindings.sort((a, b) => compareText(a.scenario, b.scenario) || compareText(a.initiativeId, b.initiativeId)) }, issues: [] as const });
}
