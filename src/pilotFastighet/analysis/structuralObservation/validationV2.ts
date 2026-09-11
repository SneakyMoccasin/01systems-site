import {
  ACTION_EFFECTS,
  DOMAIN_ACTIONS,
  type ActionKey,
} from "../../actionEffects";
import type { ExecutableDomainProfile } from "../../executableDomainProfile";
import type {
  DisplayedPeriod,
  InitiativeId,
  InitiativePrerequisite,
  InitiativeResourceClaim,
  PeriodCapacity,
  PositiveInteger,
  SharedResourceDefinition,
  SharedResourceId,
} from "./contract";
import type {
  EffectDefinitionId,
  InitiativeDefinitionV2,
  ValidatedStructuralObservationContractV2,
} from "./contractV2";

export type StructuralObservationV2ValidationCode =
  | "invalid-contract"
  | "unknown-version"
  | "invalid-horizon"
  | "unknown-field"
  | "scenario-bindings-not-allowed"
  | "invalid-label"
  | "empty-initiative-id"
  | "duplicate-initiative-id"
  | "unknown-effect-definition"
  | "unsupported-effect-definition"
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
  | "capacity-period-outside-horizon";

export type StructuralObservationV2ValidationIssue = Readonly<{
  code: StructuralObservationV2ValidationCode;
  path: string;
  message: string;
  initiativeId?: string;
  effectDefinitionId?: string;
  resourceId?: string;
  horizon?: number;
}>;

export type StructuralObservationV2ValidationResult =
  | Readonly<{
      valid: true;
      value: ValidatedStructuralObservationContractV2;
      issues: readonly [];
    }>
  | Readonly<{
      valid: false;
      issues: readonly StructuralObservationV2ValidationIssue[];
    }>;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function push(
  issues: StructuralObservationV2ValidationIssue[],
  code: StructuralObservationV2ValidationCode,
  path: string,
  message: string,
  metadata: Omit<
    StructuralObservationV2ValidationIssue,
    "code" | "path" | "message"
  > = {}
): void {
  issues.push({ code, path, message, ...metadata });
}

function rejectUnknownFields(
  value: UnknownRecord,
  allowed: readonly string[],
  path: string,
  issues: StructuralObservationV2ValidationIssue[]
): void {
  const allowedFields = new Set(allowed);
  for (const key of Object.keys(value).sort(compareText)) {
    if (!allowedFields.has(key)) {
      push(
        issues,
        key === "scenarioBindings"
          ? "scenario-bindings-not-allowed"
          : "unknown-field",
        path === "$" ? key : `${path}.${key}`,
        key === "scenarioBindings"
          ? "Scenario bindings are owned exclusively by initiative schedules in V2."
          : `Unknown semantic field ${key} is not allowed.`
      );
    }
  }
}

function issueSort(
  left: StructuralObservationV2ValidationIssue,
  right: StructuralObservationV2ValidationIssue
): number {
  return (
    compareText(left.path, right.path) ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function normalizedLabel(
  value: unknown,
  path: string,
  issues: StructuralObservationV2ValidationIssue[]
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    push(issues, "invalid-label", path, "Label must be a string when supplied.");
    return undefined;
  }
  return value;
}

export function validateAndNormalizeStructuralObservationContractV2(
  input: Readonly<{
    contract: unknown;
    horizon: number;
    profile: ExecutableDomainProfile;
  }>
): StructuralObservationV2ValidationResult {
  const issues: StructuralObservationV2ValidationIssue[] = [];
  const source = record(input.contract);
  if (!source) {
    return deepFreeze({
      valid: false as const,
      issues: [
        {
          code: "invalid-contract" as const,
          path: "$",
          message: "Structural observation V2 contract must be an object.",
        },
      ],
    });
  }

  rejectUnknownFields(source, ["version", "initiatives", "resources"], "$", issues);
  if (source.version !== "structural-observation-v2") {
    push(issues, "unknown-version", "version", "Unsupported structural observation contract version.");
  }
  if (!Number.isInteger(input.horizon) || input.horizon < 1) {
    push(issues, "invalid-horizon", "horizon", "Horizon must be a positive integer.", {
      horizon: input.horizon,
    });
  }

  const initiativeSources = Array.isArray(source.initiatives)
    ? source.initiatives
    : [];
  const resourceSources = Array.isArray(source.resources) ? source.resources : [];
  if (!Array.isArray(source.initiatives)) {
    push(issues, "invalid-contract", "initiatives", "Initiatives must be an array.");
  }
  if (!Array.isArray(source.resources)) {
    push(issues, "invalid-contract", "resources", "Resources must be an array.");
  }

  const rawInitiativeIds = new Set(
    initiativeSources
      .map((candidate) => record(candidate)?.id)
      .filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0
      )
  );
  const initiativeIds = new Set<string>();
  const initiatives: InitiativeDefinitionV2[] = [];

  initiativeSources.forEach((candidate, index) => {
    const path = `initiatives[${index}]`;
    const value = record(candidate);
    if (!value) {
      push(issues, "invalid-contract", path, "Initiative must be an object.");
      return;
    }
    rejectUnknownFields(
      value,
      ["id", "effectDefinitionId", "label", "prerequisites", "resourceClaims"],
      path,
      issues
    );
    const id = typeof value.id === "string" ? value.id : "";
    if (id.trim().length === 0) {
      push(issues, "empty-initiative-id", `${path}.id`, "Initiative ID must not be empty.");
    } else if (initiativeIds.has(id)) {
      push(issues, "duplicate-initiative-id", `${path}.id`, "Initiative ID must be unique.", {
        initiativeId: id,
      });
    }
    initiativeIds.add(id);

    const effectDefinitionId =
      typeof value.effectDefinitionId === "string"
        ? value.effectDefinitionId
        : "";
    const knownEffect = Object.prototype.hasOwnProperty.call(
      ACTION_EFFECTS,
      effectDefinitionId
    );
    if (!knownEffect) {
      push(
        issues,
        "unknown-effect-definition",
        `${path}.effectDefinitionId`,
        "Effect definition is not a canonical executable action.",
        { initiativeId: id, effectDefinitionId }
      );
    } else {
      const actionKey = effectDefinitionId as ActionKey;
      const effect = input.profile.actionEffects[actionKey];
      const supported =
        effect !== undefined &&
        DOMAIN_ACTIONS[input.profile.domainId].includes(actionKey) &&
        Object.entries(effect).every(
          ([driver, delta]) =>
            input.profile.applicableDrivers.includes(driver as never) &&
            typeof delta === "number" &&
            Number.isFinite(delta)
        );
      if (!supported) {
        push(
          issues,
          "unsupported-effect-definition",
          `${path}.effectDefinitionId`,
          "Effect definition is not supported by the executable domain profile.",
          { initiativeId: id, effectDefinitionId }
        );
      }
    }

    const prerequisites: InitiativePrerequisite[] = [];
    const prerequisiteSources = Array.isArray(value.prerequisites)
      ? value.prerequisites
      : [];
    if (!Array.isArray(value.prerequisites)) {
      push(issues, "invalid-contract", `${path}.prerequisites`, "Prerequisites must be an array.");
    }
    const seenPrerequisites = new Set<string>();
    prerequisiteSources.forEach((candidatePrerequisite, prerequisiteIndex) => {
      const prerequisitePath = `${path}.prerequisites[${prerequisiteIndex}]`;
      const prerequisite = record(candidatePrerequisite);
      if (!prerequisite) {
        push(issues, "invalid-contract", prerequisitePath, "Prerequisite must be an object.");
        return;
      }
      rejectUnknownFields(prerequisite, ["initiativeId", "type"], prerequisitePath, issues);
      const prerequisiteId =
        typeof prerequisite.initiativeId === "string"
          ? prerequisite.initiativeId
          : "";
      if (prerequisite.type !== "finish-to-start") {
        push(issues, "unsupported-dependency-type", `${prerequisitePath}.type`, "Only finish-to-start is supported.", {
          initiativeId: id,
        });
      }
      if (!rawInitiativeIds.has(prerequisiteId)) {
        push(issues, "unknown-prerequisite-initiative", `${prerequisitePath}.initiativeId`, "Prerequisite initiative is not defined.", {
          initiativeId: id,
        });
      }
      if (prerequisiteId === id) {
        push(issues, "self-prerequisite", `${prerequisitePath}.initiativeId`, "Initiative cannot depend on itself.", {
          initiativeId: id,
        });
      }
      if (seenPrerequisites.has(prerequisiteId)) {
        push(issues, "duplicate-prerequisite", prerequisitePath, "Prerequisite must be unique per initiative.", {
          initiativeId: id,
        });
      }
      seenPrerequisites.add(prerequisiteId);
      if (prerequisite.type === "finish-to-start" && prerequisiteId) {
        prerequisites.push({
          initiativeId: prerequisiteId as InitiativeId,
          type: "finish-to-start",
        });
      }
    });

    const resourceClaims: InitiativeResourceClaim[] = [];
    const claimSources = Array.isArray(value.resourceClaims)
      ? value.resourceClaims
      : [];
    if (!Array.isArray(value.resourceClaims)) {
      push(issues, "invalid-contract", `${path}.resourceClaims`, "Resource claims must be an array.");
    }
    const seenClaims = new Set<string>();
    claimSources.forEach((candidateClaim, claimIndex) => {
      const claimPath = `${path}.resourceClaims[${claimIndex}]`;
      const claim = record(candidateClaim);
      if (!claim) {
        push(issues, "invalid-contract", claimPath, "Resource claim must be an object.");
        return;
      }
      rejectUnknownFields(claim, ["resourceId", "amount", "durationPeriods"], claimPath, issues);
      const resourceId = typeof claim.resourceId === "string" ? claim.resourceId : "";
      if (seenClaims.has(resourceId)) {
        push(issues, "duplicate-resource-claim", claimPath, "Initiative may claim a resource only once.", {
          initiativeId: id,
          resourceId,
        });
      }
      seenClaims.add(resourceId);
      if (
        typeof claim.amount !== "number" ||
        !Number.isFinite(claim.amount) ||
        claim.amount <= 0
      ) {
        push(issues, "invalid-claim-amount", `${claimPath}.amount`, "Claim amount must be finite and greater than zero.", {
          initiativeId: id,
          resourceId,
        });
      }
      if (!Number.isInteger(claim.durationPeriods) || (claim.durationPeriods as number) < 1) {
        push(issues, "invalid-claim-duration", `${claimPath}.durationPeriods`, "Claim duration must be a positive integer.", {
          initiativeId: id,
          resourceId,
        });
      }
      if (
        resourceId &&
        typeof claim.amount === "number" &&
        Number.isFinite(claim.amount) &&
        claim.amount > 0 &&
        Number.isInteger(claim.durationPeriods) &&
        (claim.durationPeriods as number) > 0
      ) {
        resourceClaims.push({
          resourceId: resourceId as SharedResourceId,
          amount: claim.amount,
          durationPeriods: claim.durationPeriods as PositiveInteger,
        });
      }
    });

    const label = normalizedLabel(value.label, `${path}.label`, issues);
    if (id && knownEffect) {
      initiatives.push({
        id: id as InitiativeId,
        effectDefinitionId: effectDefinitionId as EffectDefinitionId,
        ...(label === undefined ? {} : { label }),
        prerequisites: prerequisites.sort((left, right) =>
          compareText(left.initiativeId, right.initiativeId)
        ),
        resourceClaims: resourceClaims.sort((left, right) =>
          compareText(left.resourceId, right.resourceId)
        ),
      });
    }
  });

  const resources: SharedResourceDefinition[] = [];
  const resourceIds = new Set<string>();
  resourceSources.forEach((candidate, index) => {
    const path = `resources[${index}]`;
    const value = record(candidate);
    if (!value) {
      push(issues, "invalid-contract", path, "Resource must be an object.");
      return;
    }
    rejectUnknownFields(value, ["id", "label", "capacity"], path, issues);
    const id = typeof value.id === "string" ? value.id : "";
    if (id.trim().length === 0) {
      push(issues, "empty-resource-id", `${path}.id`, "Resource ID must not be empty.");
    } else if (resourceIds.has(id)) {
      push(issues, "duplicate-resource-id", `${path}.id`, "Resource ID must be unique.", {
        resourceId: id,
      });
    }
    resourceIds.add(id);
    const label = normalizedLabel(value.label, `${path}.label`, issues);
    const capacity = record(value.capacity);
    if (!capacity) {
      push(issues, "invalid-resource-capacity", `${path}.capacity`, "Resource capacity must be an object.", {
        resourceId: id,
      });
      return;
    }

    if (capacity.type === "constant") {
      rejectUnknownFields(capacity, ["type", "amount"], `${path}.capacity`, issues);
      if (
        typeof capacity.amount !== "number" ||
        !Number.isFinite(capacity.amount) ||
        capacity.amount < 0
      ) {
        push(issues, "invalid-resource-capacity", `${path}.capacity.amount`, "Capacity must be finite and non-negative.", {
          resourceId: id,
        });
      } else if (id) {
        resources.push({
          id: id as SharedResourceId,
          ...(label === undefined ? {} : { label }),
          capacity: { type: "constant", amount: capacity.amount },
        });
      }
      return;
    }

    if (capacity.type !== "periodized") {
      rejectUnknownFields(capacity, ["type", "amounts"], `${path}.capacity`, issues);
      push(issues, "invalid-resource-capacity", `${path}.capacity.type`, "Capacity must be constant or periodized.", {
        resourceId: id,
      });
      return;
    }

    rejectUnknownFields(capacity, ["type", "amounts"], `${path}.capacity`, issues);
    const amountSources = Array.isArray(capacity.amounts) ? capacity.amounts : [];
    if (!Array.isArray(capacity.amounts)) {
      push(issues, "invalid-resource-capacity", `${path}.capacity.amounts`, "Periodized capacity amounts must be an array.", {
        resourceId: id,
      });
    }
    const amounts: PeriodCapacity[] = [];
    const seenPeriods = new Set<number>();
    amountSources.forEach((candidateAmount, amountIndex) => {
      const amountPath = `${path}.capacity.amounts[${amountIndex}]`;
      const amount = record(candidateAmount);
      if (!amount) {
        push(issues, "invalid-resource-capacity", amountPath, "Period capacity must be an object.", {
          resourceId: id,
        });
        return;
      }
      rejectUnknownFields(amount, ["period", "amount"], amountPath, issues);
      if (!Number.isInteger(amount.period) || (amount.period as number) < 1) {
        push(issues, "invalid-capacity-period", `${amountPath}.period`, "Capacity period must be a positive integer.", {
          resourceId: id,
        });
      } else {
        const period = amount.period as number;
        if (seenPeriods.has(period)) {
          push(issues, "duplicate-capacity-period", `${amountPath}.period`, "Capacity period must be unique.", {
            resourceId: id,
          });
        }
        seenPeriods.add(period);
        if (period > input.horizon) {
          push(issues, "capacity-period-outside-horizon", `${amountPath}.period`, "Capacity period must be inside the horizon.", {
            resourceId: id,
            horizon: input.horizon,
          });
        }
      }
      if (
        typeof amount.amount !== "number" ||
        !Number.isFinite(amount.amount) ||
        amount.amount < 0
      ) {
        push(issues, "invalid-resource-capacity", `${amountPath}.amount`, "Capacity must be finite and non-negative.", {
          resourceId: id,
        });
      }
      if (
        Number.isInteger(amount.period) &&
        (amount.period as number) >= 1 &&
        typeof amount.amount === "number" &&
        Number.isFinite(amount.amount) &&
        amount.amount >= 0
      ) {
        amounts.push({
          period: amount.period as DisplayedPeriod,
          amount: amount.amount,
        });
      }
    });
    if (Number.isInteger(input.horizon) && input.horizon > 0) {
      for (let period = 1; period <= input.horizon; period += 1) {
        if (!seenPeriods.has(period)) {
          push(issues, "missing-capacity-period", `${path}.capacity.amounts`, `Periodized capacity is missing M${period}.`, {
            resourceId: id,
            horizon: input.horizon,
          });
        }
      }
    }
    if (id) {
      resources.push({
        id: id as SharedResourceId,
        ...(label === undefined ? {} : { label }),
        capacity: {
          type: "periodized",
          amounts: amounts.sort((left, right) => left.period - right.period),
        },
      });
    }
  });

  for (const [initiativeIndex, initiative] of initiatives.entries()) {
    for (const [claimIndex, claim] of initiative.resourceClaims.entries()) {
      if (!resourceIds.has(claim.resourceId)) {
        push(issues, "unknown-resource", `initiatives[${initiativeIndex}].resourceClaims[${claimIndex}].resourceId`, "Claim references an unknown resource.", {
          initiativeId: initiative.id,
          resourceId: claim.resourceId,
        });
      }
    }
  }

  const graph = new Map(
    initiatives.map((initiative) => [
      initiative.id as string,
      initiative.prerequisites.map(
        (prerequisite) => prerequisite.initiativeId as string
      ),
    ])
  );
  const visitState = new Map<string, 0 | 1 | 2>();
  const cycleMembers = new Set<string>();
  const visit = (id: string, stack: string[]): void => {
    if (visitState.get(id) === 1) {
      const start = stack.indexOf(id);
      for (const member of stack.slice(start)) cycleMembers.add(member);
      return;
    }
    if (visitState.get(id) === 2) return;
    visitState.set(id, 1);
    for (const dependency of graph.get(id) ?? []) {
      if (graph.has(dependency)) visit(dependency, [...stack, id]);
    }
    visitState.set(id, 2);
  };
  for (const id of [...graph.keys()].sort(compareText)) visit(id, []);
  for (const id of [...cycleMembers].sort(compareText)) {
    push(issues, "dependency-cycle", `initiatives.${id}.prerequisites`, "Initiative participates in a dependency cycle.", {
      initiativeId: id,
    });
  }

  issues.sort(issueSort);
  if (issues.length > 0) {
    return deepFreeze({ valid: false as const, issues });
  }
  const normalized = {
    version: "structural-observation-v2" as const,
    initiatives: initiatives.sort((left, right) => compareText(left.id, right.id)),
    resources: resources.sort((left, right) => compareText(left.id, right.id)),
  } as unknown as ValidatedStructuralObservationContractV2;
  return deepFreeze({ valid: true as const, value: normalized, issues: [] as const });
}
