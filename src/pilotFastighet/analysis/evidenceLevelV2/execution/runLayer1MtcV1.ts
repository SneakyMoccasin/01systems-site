import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { CanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import type { CanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import type { EligibilityRuleMtcV1, TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import type { PreparedInitiativeMtcV1, PreparedScenarioMtcV1, ScenarioResourceClaimMtcV1 } from "../scenario/scenarioMtcV1";
import { scenarioSemanticIdentityMtcV1 } from "../scenario/scenarioSemanticIdentityMtcV1";
import { addDecimalMtcV1, compareDecimalMtcV1, subtractDecimalMtcV1 } from "./exactDecimalMtcV1";
import {
  TWO_LAYER_MTC_EXECUTION_VERSION,
  type AdmissionConflictMtcV1,
  type EligibilityDecisionMtcV1,
  type EligibilityReasonMtcV1,
  type Layer1ExecutionOutcomeMtcV1,
  type Layer1RuntimeStateMtcV1,
  type PeriodRecordMtcV1,
  type ResourceEventMtcV1,
  type TerminalBoundaryRecordMtcV1,
} from "./executionMtcV1";

type MutableState = {
  committedThroughPeriod: number;
  boundary: number;
  initiatives: Array<{ instanceId: CanonicalSemanticIdMtcV1; lifecycle: "pending" | "active" | "completed" }>;
  resources: Array<{
    resourceInstanceId: CanonicalSemanticIdMtcV1; kind: "exclusive" | "quantitative-capacity";
    unit?: CanonicalSemanticIdMtcV1; capacity?: CanonicalDecimalMtcV1; used?: CanonicalDecimalMtcV1; available?: CanonicalDecimalMtcV1;
    holders: Array<CanonicalSemanticIdMtcV1 | { instanceId: CanonicalSemanticIdMtcV1; amount: CanonicalDecimalMtcV1 }>;
  }>;
  constraints: Array<{ constraintId: CanonicalSemanticIdMtcV1; state: "present" | "absent" }>;
  entitlements: Array<{ entitlementId: CanonicalSemanticIdMtcV1; kind: "reusable" | "consumable"; state: "available" | "unavailable" | "consumed" }>;
};

const byString = <T>(items: T[], key: (item: T) => string): T[] => items.sort((a, b) => compareCanonicalStringsMtcV1(key(a), key(b)));

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function stateIdentity(state: MutableState): string {
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:LAYER1-STATE", TWO_LAYER_MTC_EXECUTION_VERSION, canonicalJsonBytesMtcV1(state));
}

function immutableState(state: MutableState): Layer1RuntimeStateMtcV1 {
  const copy = structuredClone(state);
  return freezeDeep({ ...copy, stateIdentity: stateIdentity(copy) }) as unknown as Layer1RuntimeStateMtcV1;
}

function initialState(scenario: PreparedScenarioMtcV1): Layer1RuntimeStateMtcV1 {
  const state: MutableState = {
    committedThroughPeriod: scenario.horizon.firstPeriod - 1,
    boundary: scenario.horizon.firstPeriod,
    initiatives: scenario.initiatives.map(({ instanceId }) => ({ instanceId, lifecycle: "pending" })),
    resources: scenario.resources.map((resource) => resource.kind === "exclusive"
      ? { resourceInstanceId: resource.resourceInstanceId, kind: "exclusive", holders: [] }
      : { resourceInstanceId: resource.resourceInstanceId, kind: "quantitative-capacity", unit: resource.unit, capacity: resource.capacity, used: "0" as CanonicalDecimalMtcV1, available: resource.initialAvailableCapacity, holders: [] }),
    constraints: structuredClone(scenario.initialConstraints) as unknown as MutableState["constraints"],
    entitlements: structuredClone(scenario.initialEntitlements) as unknown as MutableState["entitlements"],
  };
  byString(state.initiatives, (item) => item.instanceId);
  byString(state.resources, (item) => item.resourceInstanceId);
  byString(state.constraints, (item) => item.constraintId);
  byString(state.entitlements, (item) => item.entitlementId);
  return immutableState(state);
}

function mutable(state: Layer1RuntimeStateMtcV1): MutableState {
  const { stateIdentity: _identity, ...copy } = structuredClone(state);
  void _identity;
  return copy as unknown as MutableState;
}

function claimEvent(instanceId: CanonicalSemanticIdMtcV1, claim: ScenarioResourceClaimMtcV1): ResourceEventMtcV1 {
  return claim.kind === "exclusive"
    ? { instanceId, ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, kind: claim.kind }
    : { instanceId, ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, kind: claim.kind, amount: claim.amount };
}

function completeAtBoundary(state: MutableState, scenario: PreparedScenarioMtcV1, boundary: number): {
  completions: CanonicalSemanticIdMtcV1[]; releases: ResourceEventMtcV1[]; transitions: Array<{ instanceId: CanonicalSemanticIdMtcV1; from: "active"; to: "completed" }>;
} {
  const initiatives = new Map(scenario.initiatives.map((item) => [item.instanceId as string, item]));
  const completions: CanonicalSemanticIdMtcV1[] = []; const releases: ResourceEventMtcV1[] = []; const transitions: Array<{ instanceId: CanonicalSemanticIdMtcV1; from: "active"; to: "completed" }> = [];
  for (const runtime of state.initiatives) {
    const declaration = initiatives.get(runtime.instanceId)!;
    if (runtime.lifecycle !== "active" || declaration.completionBoundary !== boundary) continue;
    runtime.lifecycle = "completed"; completions.push(runtime.instanceId); transitions.push({ instanceId: runtime.instanceId, from: "active", to: "completed" });
    for (const claim of declaration.resourceClaims) {
      const resource = state.resources.find((item) => item.resourceInstanceId === claim.resourceInstanceId)!;
      if (claim.kind === "exclusive") resource.holders = resource.holders.filter((holder) => holder !== runtime.instanceId);
      else {
        resource.holders = resource.holders.filter((holder) => typeof holder === "string" || holder.instanceId !== runtime.instanceId);
        resource.used = subtractDecimalMtcV1(resource.used! as never, claim.amount);
        resource.available = addDecimalMtcV1(resource.available! as never, claim.amount);
      }
      releases.push(claimEvent(runtime.instanceId, claim));
    }
  }
  completions.sort(compareCanonicalStringsMtcV1); byString(releases, (item) => `${item.resourceInstanceId}\0${item.instanceId}\0${item.ruleId}`); byString(transitions, (item) => item.instanceId);
  return { completions, releases, transitions };
}

function evaluate(
  declaration: PreparedInitiativeMtcV1,
  state: MutableState,
  contract: TwoLayerMtcContractV1,
): EligibilityDecisionMtcV1 {
  const reasons: EligibilityReasonMtcV1[] = [];
  const runtime = state.initiatives.find((item) => item.instanceId === declaration.instanceId)!;
  if (runtime.lifecycle !== "pending") reasons.push({ code: "invalid-lifecycle", instanceId: declaration.instanceId, lifecycle: runtime.lifecycle });
  for (const dependency of declaration.dependencies) {
    const prerequisite = state.initiatives.find((item) => item.instanceId === dependency.prerequisiteInstanceId)!;
    if (prerequisite.lifecycle !== "completed") reasons.push({ code: "prerequisite-incomplete", ruleId: dependency.ruleId, prerequisiteInstanceId: dependency.prerequisiteInstanceId, lifecycle: prerequisite.lifecycle });
  }
  for (const claim of declaration.resourceClaims) {
    const resource = state.resources.find((item) => item.resourceInstanceId === claim.resourceInstanceId)!;
    if (claim.kind === "exclusive") {
      const holders = resource.holders.filter((holder): holder is CanonicalSemanticIdMtcV1 => typeof holder === "string").sort(compareCanonicalStringsMtcV1);
      if (holders.length) reasons.push({ code: "exclusive-resource-unavailable", ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, activeHolders: holders as never });
    } else if (compareDecimalMtcV1(resource.available! as never, claim.amount) < 0) {
      reasons.push({ code: "quantitative-capacity-insufficient", ruleId: claim.ruleId, resourceInstanceId: claim.resourceInstanceId, requested: claim.amount, available: resource.available! as never, unit: claim.unit });
    }
  }
  const type = contract.layer1.initiativeTypes.find((item) => item.initiativeTypeId === declaration.initiativeTypeId)!;
  for (const rule of type.eligibilityRules) {
    if (rule.kind === "constraint-absent") {
      const value = state.constraints.find((item) => item.constraintId === rule.constraintId)!;
      if (value.state === "present") reasons.push({ code: "constraint-present", ruleId: rule.ruleId, constraintId: rule.constraintId });
    } else if (rule.kind === "entitlement-available") {
      const value = state.entitlements.find((item) => item.entitlementId === rule.entitlementId)!;
      if (value.state !== "available") reasons.push({ code: "entitlement-unavailable", ruleId: rule.ruleId, entitlementId: rule.entitlementId, state: value.state as "unavailable" | "consumed" });
    }
  }
  byString(reasons, (reason) => canonicalReasonKey(reason));
  return freezeDeep({ instanceId: declaration.instanceId, eligible: reasons.length === 0, reasons });
}

function canonicalReasonKey(reason: EligibilityReasonMtcV1): string {
  return new TextDecoder().decode(canonicalJsonBytesMtcV1(reason));
}

type EntitlementRule = Extract<EligibilityRuleMtcV1, { kind: "entitlement-available" }>;

function consumableRules(initiative: PreparedInitiativeMtcV1, contract: TwoLayerMtcContractV1): EntitlementRule[] {
  return contract.layer1.initiativeTypes.find((item) => item.initiativeTypeId === initiative.initiativeTypeId)!.eligibilityRules.filter((rule): rule is EntitlementRule => rule.kind === "entitlement-available" && rule.consumption === "consume-on-admission");
}

function conflicts(eligible: PreparedInitiativeMtcV1[], state: MutableState, contract: TwoLayerMtcContractV1): AdmissionConflictMtcV1[] {
  const result: AdmissionConflictMtcV1[] = [];
  for (const resource of state.resources) {
    const claims = eligible.flatMap((initiative) => initiative.resourceClaims.filter((claim) => claim.resourceInstanceId === resource.resourceInstanceId).map((claim) => ({ initiative, claim })));
    if (resource.kind === "exclusive" && claims.length > 1) result.push({ code: "simultaneous-exclusive-conflict", resourceInstanceId: resource.resourceInstanceId as never, candidateInstanceIds: claims.map(({ initiative }) => initiative.instanceId).sort(compareCanonicalStringsMtcV1) });
    if (resource.kind === "quantitative-capacity" && claims.length > 1) {
      let requested = "0" as CanonicalDecimalMtcV1;
      for (const { claim } of claims) if (claim.kind === "quantitative-capacity") requested = addDecimalMtcV1(requested, claim.amount);
      if (compareDecimalMtcV1(requested, resource.available! as never) > 0) result.push({ code: "simultaneous-capacity-conflict", resourceInstanceId: resource.resourceInstanceId as never, candidateInstanceIds: claims.map(({ initiative }) => initiative.instanceId).sort(compareCanonicalStringsMtcV1), requested, available: resource.available! as never, unit: resource.unit! as never });
    }
  }
  const uses = new Map<CanonicalSemanticIdMtcV1, CanonicalSemanticIdMtcV1[]>();
  for (const initiative of eligible) for (const rule of consumableRules(initiative, contract)) {
    const values = uses.get(rule.entitlementId) ?? [];
    values.push(initiative.instanceId); uses.set(rule.entitlementId, values);
  }
  for (const [entitlementId, candidates] of uses) if (candidates.length > 1) result.push({ code: "simultaneous-consumable-conflict", entitlementId: entitlementId as never, candidateInstanceIds: candidates.sort(compareCanonicalStringsMtcV1) });
  return byString(result, (item) => `${item.code}\0${"resourceInstanceId" in item ? item.resourceInstanceId : item.entitlementId}`);
}

function reserveAndConsume(state: MutableState, eligible: PreparedInitiativeMtcV1[], contract: TwoLayerMtcContractV1): {
  reservations: ResourceEventMtcV1[]; consumptions: Array<{ instanceId: CanonicalSemanticIdMtcV1; ruleId: CanonicalSemanticIdMtcV1; entitlementId: CanonicalSemanticIdMtcV1 }>;
} {
  const reservations: ResourceEventMtcV1[] = []; const consumptions: Array<{ instanceId: CanonicalSemanticIdMtcV1; ruleId: CanonicalSemanticIdMtcV1; entitlementId: CanonicalSemanticIdMtcV1 }> = [];
  for (const initiative of eligible) {
    state.initiatives.find((item) => item.instanceId === initiative.instanceId)!.lifecycle = "active";
    for (const claim of initiative.resourceClaims) {
      const resource = state.resources.find((item) => item.resourceInstanceId === claim.resourceInstanceId)!;
      if (claim.kind === "exclusive") resource.holders.push(initiative.instanceId);
      else {
        resource.holders.push({ instanceId: initiative.instanceId, amount: claim.amount });
        resource.used = addDecimalMtcV1(resource.used! as never, claim.amount);
        resource.available = subtractDecimalMtcV1(resource.available! as never, claim.amount);
      }
      reservations.push(claimEvent(initiative.instanceId, claim));
    }
    for (const rule of consumableRules(initiative, contract)) if (rule.kind === "entitlement-available") {
      state.entitlements.find((item) => item.entitlementId === rule.entitlementId)!.state = "consumed";
      consumptions.push({ instanceId: initiative.instanceId, ruleId: rule.ruleId, entitlementId: rule.entitlementId });
    }
  }
  for (const resource of state.resources) byString(resource.holders, (holder) => typeof holder === "string" ? holder : holder.instanceId);
  byString(reservations, (item) => `${item.resourceInstanceId}\0${item.instanceId}\0${item.ruleId}`);
  byString(consumptions, (item) => `${item.entitlementId}\0${item.instanceId}\0${item.ruleId}`);
  return { reservations, consumptions };
}

function executionIdentity(value: Omit<Layer1ExecutionOutcomeMtcV1, "executionIdentity">): string {
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:LAYER1-EXECUTION", TWO_LAYER_MTC_EXECUTION_VERSION, canonicalJsonBytesMtcV1(value));
}

export function runLayer1MtcV1(scenario: PreparedScenarioMtcV1, contract: TwoLayerMtcContractV1): Layer1ExecutionOutcomeMtcV1 {
  const contractIdentity = contractSemanticIdentityMtcV1(contract);
  if (scenario.domainContract.semanticId !== contract.semanticId || scenario.domainContract.semanticIdentity !== contractIdentity) throw new TypeError("Prepared scenario is not bound to the supplied contract");
  if (scenario.semanticIdentity !== scenarioSemanticIdentityMtcV1(scenario)) throw new TypeError("Prepared scenario semantic identity verification failed");

  const initial = initialState(scenario); let committed = initial; const history: PeriodRecordMtcV1[] = [];
  const declarations = new Map(scenario.initiatives.map((item) => [item.instanceId as string, item]));
  for (let period = scenario.horizon.firstPeriod; period <= scenario.horizon.finalPeriod; period += 1) {
    const state = mutable(committed); state.boundary = period;
    const boundary = completeAtBoundary(state, scenario, period);
    const candidates = scenario.initiatives.filter((item) => item.scheduledStartPeriod === period && state.initiatives.find((runtime) => runtime.instanceId === item.instanceId)!.lifecycle === "pending").sort((a, b) => compareCanonicalStringsMtcV1(a.instanceId, b.instanceId));
    const eligibility = candidates.map((item) => evaluate(item, state, contract));
    const eligible = eligibility.filter((item) => item.eligible).map((item) => declarations.get(item.instanceId)!).sort((a, b) => compareCanonicalStringsMtcV1(a.instanceId, b.instanceId));
    const admissionConflicts = conflicts(eligible, state, contract);
    if (admissionConflicts.length) {
      const base = {
        executionVersion: TWO_LAYER_MTC_EXECUTION_VERSION, scenarioIdentity: scenario.semanticIdentity, contractIdentity,
        initialStateIdentity: initial.stateIdentity, history: freezeDeep(structuredClone(history)), status: "failed-unresolved" as const,
        failedPeriod: period, lastCommittedState: committed,
        attempt: freezeDeep({ priorStateIdentity: committed.stateIdentity, tentativeCompletions: boundary.completions, tentativeReleases: boundary.releases, scheduledCandidates: candidates.map((item) => item.instanceId), eligibility, conflicts: admissionConflicts }),
      };
      return freezeDeep({ ...base, executionIdentity: executionIdentity(base as never) });
    }
    const { reservations, consumptions } = reserveAndConsume(state, eligible, contract);
    state.committedThroughPeriod = period; state.boundary = period + 1;
    const next = immutableState(state);
    const admissions = candidates.map((item) => ({ instanceId: item.instanceId, status: (eligibility.find((decision) => decision.instanceId === item.instanceId)!.eligible ? "admitted" : "not-admitted-ineligible") as "admitted" | "not-admitted-ineligible" }));
    const transitions = [...boundary.transitions, ...eligible.map((item) => ({ instanceId: item.instanceId, from: "pending" as const, to: "active" as const }))]; byString(transitions, (item) => item.instanceId);
    history.push(freezeDeep({ period, priorStateIdentity: committed.stateIdentity, completions: boundary.completions, releases: boundary.releases, scheduledCandidates: candidates.map((item) => item.instanceId), eligibility, admissions, reservations, entitlementConsumptions: consumptions, lifecycleTransitions: transitions, resultingStateIdentity: next.stateIdentity }) as PeriodRecordMtcV1);
    committed = next;
  }
  const terminalMutable = mutable(committed); const terminalBoundaryValue = scenario.horizon.finalPeriod + 1; terminalMutable.boundary = terminalBoundaryValue;
  const terminalChanges = completeAtBoundary(terminalMutable, scenario, terminalBoundaryValue);
  const terminalState = immutableState(terminalMutable);
  const terminalBoundary: TerminalBoundaryRecordMtcV1 = freezeDeep({ boundary: terminalBoundaryValue, priorStateIdentity: committed.stateIdentity, completions: terminalChanges.completions, releases: terminalChanges.releases, resultingStateIdentity: terminalState.stateIdentity });
  const base = { executionVersion: TWO_LAYER_MTC_EXECUTION_VERSION, scenarioIdentity: scenario.semanticIdentity, contractIdentity, initialStateIdentity: initial.stateIdentity, history: freezeDeep(history), status: "completed-horizon" as const, terminalBoundary, terminalState };
  return freezeDeep({ ...base, executionIdentity: executionIdentity(base as never) });
}
