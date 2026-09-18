import { parseCanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import { parseCanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { EligibilityRuleMtcV1, TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import {
  TWO_LAYER_MTC_SCENARIO_SCHEMA_VERSION,
  type ParseScenarioResultMtcV1,
  type PreparedScenarioMtcV1,
  type ScenarioIssueCodeMtcV1,
  type ScenarioIssueMtcV1,
  type TwoLayerMtcScenarioV1,
} from "./scenarioMtcV1";
import { scenarioSemanticIdentityMtcV1 } from "./scenarioSemanticIdentityMtcV1";

type R = Record<string, unknown>;
const SHA256 = /^[0-9a-f]{64}$/;

function add(issues: ScenarioIssueMtcV1[], code: ScenarioIssueCodeMtcV1, path: string, message: string): void {
  issues.push({ code, path, message });
}

function objectValue(value: unknown, path: string, issues: ScenarioIssueMtcV1[]): R | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    add(issues, "invalid-type", path, "Expected a plain object."); return undefined;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    add(issues, "invalid-type", path, "Expected a plain object."); return undefined;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !Object.getOwnPropertyDescriptor(value, key)?.enumerable ||
        !("value" in Object.getOwnPropertyDescriptor(value, key)!)) {
      add(issues, "invalid-type", path, "Only enumerable string data properties are permitted.");
      return undefined;
    }
  }
  return value as R;
}

function arrayValue(value: unknown, path: string, max: number, issues: ScenarioIssueMtcV1[]): unknown[] | undefined {
  if (!Array.isArray(value)) { add(issues, "invalid-type", path, "Expected an array."); return undefined; }
  if (value.length > max) add(issues, "limit-exceeded", path, `Maximum is ${max}.`);
  if (Reflect.ownKeys(value).length !== value.length + 1) {
    add(issues, "invalid-type", path, "Sparse arrays and extra properties are forbidden."); return undefined;
  }
  return value;
}

function shape(value: R, path: string, required: readonly string[], optional: readonly string[], issues: ScenarioIssueMtcV1[]): void {
  const allowed = new Set([...required, ...optional]);
  for (const field of required) if (!Object.hasOwn(value, field)) add(issues, "missing-field", `${path}/${field}`, "Required field is missing.");
  for (const field of Object.keys(value)) if (!allowed.has(field)) add(issues, "unknown-field", `${path}/${field}`, "Unknown field.");
}

function id(value: unknown, path: string, issues: ScenarioIssueMtcV1[]): value is string {
  try { parseCanonicalSemanticIdMtcV1(value); return true; }
  catch { add(issues, "invalid-id", path, "Expected a bounded canonical ASCII semantic ID."); return false; }
}

function integer(value: unknown, path: string, min: number, issues: ScenarioIssueMtcV1[]): value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Object.is(value, -0) || value < min) {
    add(issues, "unsafe-integer", path, `Expected a safe integer >= ${min}.`); return false;
  }
  return true;
}

function positiveDecimal(value: unknown, path: string, issues: ScenarioIssueMtcV1[]): value is string {
  try {
    const parsed = parseCanonicalDecimalMtcV1(value);
    if (parsed === "0" || parsed.startsWith("-")) throw new Error();
    return true;
  } catch { add(issues, "invalid-decimal", path, "Expected a positive canonical decimal."); return false; }
}

function nonnegativeDecimal(value: unknown, path: string, issues: ScenarioIssueMtcV1[]): value is string {
  try {
    const parsed = parseCanonicalDecimalMtcV1(value);
    if (parsed.startsWith("-")) throw new Error();
    return true;
  } catch { add(issues, "invalid-decimal", path, "Expected a nonnegative canonical decimal."); return false; }
}

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as R)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

export function parseScenarioJsonMtcV1(json: string, contract: TwoLayerMtcContractV1): ParseScenarioResultMtcV1 {
  try { return parseScenarioMtcV1(JSON.parse(json) as unknown, contract); }
  catch { return freezeDeep({ ok: false as const, issues: [{ code: "invalid-json" as const, path: "", message: "Invalid JSON." }] }); }
}

export function parseScenarioMtcV1(raw: unknown, contract: TwoLayerMtcContractV1): ParseScenarioResultMtcV1 {
  const issues: ScenarioIssueMtcV1[] = [];
  const root = objectValue(raw, "", issues);
  if (!root) return freezeDeep({ ok: false as const, issues });
  shape(root, "", ["schemaVersion", "scenarioId", "revision", "domainContract", "horizon", "initiatives", "resources", "initialConstraints", "initialEntitlements"], ["metadata"], issues);
  if (root.schemaVersion !== TWO_LAYER_MTC_SCENARIO_SCHEMA_VERSION) add(issues, "invalid-discriminant", "/schemaVersion", `Expected ${TWO_LAYER_MTC_SCENARIO_SCHEMA_VERSION}.`);
  id(root.scenarioId, "/scenarioId", issues);
  integer(root.revision, "/revision", 1, issues);

  const domain = objectValue(root.domainContract, "/domainContract", issues);
  if (domain) {
    shape(domain, "/domainContract", ["semanticId", "semanticIdentity"], [], issues);
    if (id(domain.semanticId, "/domainContract/semanticId", issues) && domain.semanticId !== contract.semanticId)
      add(issues, "domain-identity-mismatch", "/domainContract/semanticId", "Domain semantic ID does not match the validated contract.");
    if (typeof domain.semanticIdentity !== "string" || !SHA256.test(domain.semanticIdentity))
      add(issues, "invalid-hash", "/domainContract/semanticIdentity", "Expected a lowercase SHA-256 identity.");
    else if (domain.semanticIdentity !== contractSemanticIdentityMtcV1(contract))
      add(issues, "domain-identity-mismatch", "/domainContract/semanticIdentity", "Domain semantic identity does not match the validated contract.");
  }

  let first: number | undefined; let final: number | undefined;
  const horizon = objectValue(root.horizon, "/horizon", issues);
  if (horizon) {
    shape(horizon, "/horizon", ["firstPeriod", "finalPeriod"], [], issues);
    if (integer(horizon.firstPeriod, "/horizon/firstPeriod", 0, issues)) first = horizon.firstPeriod;
    if (integer(horizon.finalPeriod, "/horizon/finalPeriod", 0, issues)) final = horizon.finalPeriod;
    if (first !== undefined && final !== undefined && final < first) add(issues, "schedule-outside-horizon", "/horizon/finalPeriod", "Final period must not precede first period.");
  }

  const types = new Map(contract.layer1.initiativeTypes.map((item) => [item.initiativeTypeId as string, item]));
  const resourceDefs = new Map(contract.layer1.resources.map((item) => [item.resourceId as string, item]));
  const resourceInstances = new Map<string, { resourceId: string; kind: string; unit?: string; path: string }>();
  const resourceDefinitionCounts = new Map<string, number>();
  const resources = arrayValue(root.resources, "/resources", CONTRACT_LIMITS_MTC_V1.maxScenarioResourceInstances, issues);
  resources?.forEach((entry, index) => {
    const path = `/resources/${index}`; const item = objectValue(entry, path, issues); if (!item) return;
    const quantitative = item.kind === "quantitative-capacity";
    shape(item, path, quantitative ? ["resourceInstanceId", "resourceId", "kind", "unit", "capacity", "initialAvailableCapacity"] : ["resourceInstanceId", "resourceId", "kind", "initialState"], [], issues);
    let instanceId: string | undefined;
    if (id(item.resourceInstanceId, `${path}/resourceInstanceId`, issues)) {
      instanceId = item.resourceInstanceId;
      if (resourceInstances.has(instanceId)) add(issues, "duplicate-instance-id", `${path}/resourceInstanceId`, "Duplicate resource instance ID.");
    }
    let definition: (typeof contract.layer1.resources)[number] | undefined;
    if (id(item.resourceId, `${path}/resourceId`, issues)) {
      definition = resourceDefs.get(item.resourceId);
      if (!definition) add(issues, "unknown-reference", `${path}/resourceId`, "Unknown resource declaration.");
      else resourceDefinitionCounts.set(item.resourceId, (resourceDefinitionCounts.get(item.resourceId) ?? 0) + 1);
    }
    if (item.kind !== "exclusive" && !quantitative) add(issues, "invalid-discriminant", `${path}/kind`, "Unsupported resource kind.");
    if (definition && definition.kind !== item.kind) add(issues, "resource-kind-mismatch", `${path}/kind`, "Resource kind differs from its domain declaration.");
    if (quantitative) {
      const capacityValid = nonnegativeDecimal(item.capacity, `${path}/capacity`, issues);
      const availableValid = nonnegativeDecimal(item.initialAvailableCapacity, `${path}/initialAvailableCapacity`, issues);
      if (id(item.unit, `${path}/unit`, issues) && definition?.kind === "quantitative-capacity" && item.unit !== definition.unit) add(issues, "unit-mismatch", `${path}/unit`, "Resource unit differs from its domain declaration.");
      if (definition?.kind === "quantitative-capacity" && capacityValid && item.capacity !== definition.capacity) add(issues, "initial-state-mismatch", `${path}/capacity`, "Instance capacity must equal the domain-declared capacity.");
      if (capacityValid && availableValid && item.initialAvailableCapacity !== item.capacity) add(issues, "initial-state-mismatch", `${path}/initialAvailableCapacity`, "All-pending scenarios require full initial capacity.");
    } else if (item.initialState !== "available") add(issues, "initial-state-mismatch", `${path}/initialState`, "All-pending scenarios require an available exclusive resource.");
    if (instanceId && typeof item.resourceId === "string") resourceInstances.set(instanceId, { resourceId: item.resourceId, kind: String(item.kind), unit: typeof item.unit === "string" ? item.unit : undefined, path });
  });
  for (const definition of contract.layer1.resources) if (!resourceDefinitionCounts.has(definition.resourceId)) add(issues, "incomplete-initial-state", "/resources", `No instance declares resource ${definition.resourceId}.`);

  const constraintSeen = new Set<string>();
  const constraints = arrayValue(root.initialConstraints, "/initialConstraints", CONTRACT_LIMITS_MTC_V1.maxConstraints, issues);
  const constraintIds = new Set(contract.layer1.constraints.map((item) => item.constraintId as string));
  constraints?.forEach((entry, index) => {
    const path = `/initialConstraints/${index}`; const item = objectValue(entry, path, issues); if (!item) return;
    shape(item, path, ["constraintId", "state"], [], issues);
    if (id(item.constraintId, `${path}/constraintId`, issues)) {
      if (!constraintIds.has(item.constraintId)) add(issues, "unknown-reference", `${path}/constraintId`, "Unknown constraint.");
      if (constraintSeen.has(item.constraintId)) add(issues, "duplicate-initial-state", `${path}/constraintId`, "Duplicate constraint state.");
      constraintSeen.add(item.constraintId);
    }
    if (item.state !== "present" && item.state !== "absent") add(issues, "invalid-discriminant", `${path}/state`, "Constraint state must be present or absent.");
  });
  for (const value of constraintIds) if (!constraintSeen.has(value)) add(issues, "incomplete-initial-state", "/initialConstraints", `Missing initial state for ${value}.`);

  const entitlementDefs = new Map(contract.layer1.entitlements.map((item) => [item.entitlementId as string, item.kind]));
  const entitlementSeen = new Set<string>();
  const entitlements = arrayValue(root.initialEntitlements, "/initialEntitlements", CONTRACT_LIMITS_MTC_V1.maxEntitlements, issues);
  entitlements?.forEach((entry, index) => {
    const path = `/initialEntitlements/${index}`; const item = objectValue(entry, path, issues); if (!item) return;
    shape(item, path, ["entitlementId", "kind", "state"], [], issues);
    let expected: string | undefined;
    if (id(item.entitlementId, `${path}/entitlementId`, issues)) {
      expected = entitlementDefs.get(item.entitlementId);
      if (!expected) add(issues, "unknown-reference", `${path}/entitlementId`, "Unknown entitlement.");
      if (entitlementSeen.has(item.entitlementId)) add(issues, "duplicate-initial-state", `${path}/entitlementId`, "Duplicate entitlement state.");
      entitlementSeen.add(item.entitlementId);
    }
    if (item.kind !== "reusable" && item.kind !== "consumable") add(issues, "invalid-discriminant", `${path}/kind`, "Unsupported entitlement kind.");
    else if (expected && expected !== item.kind) add(issues, "initial-state-mismatch", `${path}/kind`, "Entitlement kind differs from its domain declaration.");
    const allowed = item.kind === "reusable" ? ["available", "unavailable"] : ["available", "consumed"];
    if (!allowed.includes(item.state as string)) add(issues, "initial-state-mismatch", `${path}/state`, "State is incompatible with entitlement kind.");
  });
  for (const value of entitlementDefs.keys()) if (!entitlementSeen.has(value)) add(issues, "incomplete-initial-state", "/initialEntitlements", `Missing initial state for ${value}.`);

  const instanceIds = new Set<string>();
  const initiativeRows: Array<{ item: R; path: string }> = [];
  const initiatives = arrayValue(root.initiatives, "/initiatives", CONTRACT_LIMITS_MTC_V1.maxScenarioInitiatives, issues);
  initiatives?.forEach((entry, index) => {
    const path = `/initiatives/${index}`; const item = objectValue(entry, path, issues); if (!item) return;
    shape(item, path, ["instanceId", "initiativeTypeId", "scheduledStartPeriod", "durationPeriods", "initialLifecycle", "dependencies", "resourceClaims"], [], issues);
    if (id(item.instanceId, `${path}/instanceId`, issues)) {
      if (instanceIds.has(item.instanceId)) add(issues, "duplicate-instance-id", `${path}/instanceId`, "Duplicate initiative instance ID.");
      instanceIds.add(item.instanceId);
    }
    if (id(item.initiativeTypeId, `${path}/initiativeTypeId`, issues) && !types.has(item.initiativeTypeId)) add(issues, "unknown-reference", `${path}/initiativeTypeId`, "Unknown initiative type.");
    if (integer(item.scheduledStartPeriod, `${path}/scheduledStartPeriod`, 0, issues) && first !== undefined && final !== undefined && (item.scheduledStartPeriod < first || item.scheduledStartPeriod > final)) add(issues, "schedule-outside-horizon", `${path}/scheduledStartPeriod`, "Scheduled start lies outside the scenario horizon.");
    if (integer(item.durationPeriods, `${path}/durationPeriods`, 1, issues) && typeof item.scheduledStartPeriod === "number" && !Number.isSafeInteger(item.scheduledStartPeriod + item.durationPeriods)) add(issues, "completion-overflow", `${path}/durationPeriods`, "Completion boundary exceeds safe integer range.");
    if (item.initialLifecycle !== "pending") add(issues, "invalid-discriminant", `${path}/initialLifecycle`, "CP3A supports only explicit pending initial lifecycle.");
    initiativeRows.push({ item, path });
  });

  const graph = new Map([...instanceIds].map((value) => [value, [] as string[]]));
  let dependencyCount = 0; let claimCount = 0;
  for (const { item, path } of initiativeRows) {
    const type = types.get(item.initiativeTypeId as string);
    const rules = new Map(type?.eligibilityRules.map((rule) => [rule.ruleId as string, rule]) ?? []);
    const requiredDependencies = new Set(type?.eligibilityRules.filter((rule) => rule.kind === "prerequisite-completed").map((rule) => rule.ruleId as string));
    const seenDependencies = new Set<string>();
    const dependencies = arrayValue(item.dependencies, `${path}/dependencies`, CONTRACT_LIMITS_MTC_V1.maxScenarioDependencies, issues);
    dependencies?.forEach((entry, index) => {
      dependencyCount += 1; const depPath = `${path}/dependencies/${index}`; const dep = objectValue(entry, depPath, issues); if (!dep) return;
      shape(dep, depPath, ["ruleId", "prerequisiteInstanceId", "condition"], [], issues);
      let rule: EligibilityRuleMtcV1 | undefined;
      if (id(dep.ruleId, `${depPath}/ruleId`, issues)) {
        rule = rules.get(dep.ruleId); if (!rule) add(issues, "unknown-reference", `${depPath}/ruleId`, "Unknown rule for initiative type.");
        else if (rule.kind !== "prerequisite-completed") add(issues, "rule-binding-mismatch", `${depPath}/ruleId`, "Rule is not a completed-prerequisite rule.");
        if (seenDependencies.has(dep.ruleId)) add(issues, "duplicate-dependency", `${depPath}/ruleId`, "Rule has more than one dependency binding.");
        seenDependencies.add(dep.ruleId);
      }
      if (id(dep.prerequisiteInstanceId, `${depPath}/prerequisiteInstanceId`, issues)) {
        if (!instanceIds.has(dep.prerequisiteInstanceId)) add(issues, "unknown-reference", `${depPath}/prerequisiteInstanceId`, "Unknown prerequisite instance.");
        if (dep.prerequisiteInstanceId === item.instanceId) add(issues, "self-dependency", `${depPath}/prerequisiteInstanceId`, "Self dependency is forbidden.");
        const prerequisite = initiativeRows.find((row) => row.item.instanceId === dep.prerequisiteInstanceId)?.item;
        if (rule?.kind === "prerequisite-completed" && prerequisite && prerequisite.initiativeTypeId !== rule.prerequisiteInitiativeTypeId) add(issues, "rule-binding-mismatch", `${depPath}/prerequisiteInstanceId`, "Prerequisite instance type does not match the domain rule.");
        if (typeof item.instanceId === "string" && graph.has(item.instanceId) && graph.has(dep.prerequisiteInstanceId)) graph.get(item.instanceId)!.push(dep.prerequisiteInstanceId);
      }
      if (dep.condition !== "completed") add(issues, "invalid-discriminant", `${depPath}/condition`, "Only completed prerequisites are supported.");
    });
    for (const ruleId of requiredDependencies) if (!seenDependencies.has(ruleId)) add(issues, "incomplete-initial-state", `${path}/dependencies`, `Missing dependency binding for ${ruleId}.`);

    const requiredClaims = new Set(type?.eligibilityRules.filter((rule) => rule.kind === "exclusive-resource-available" || rule.kind === "quantitative-capacity-available").map((rule) => rule.ruleId as string));
    const seenClaims = new Set<string>();
    const claims = arrayValue(item.resourceClaims, `${path}/resourceClaims`, CONTRACT_LIMITS_MTC_V1.maxScenarioResourceClaims, issues);
    claims?.forEach((entry, index) => {
      claimCount += 1; const claimPath = `${path}/resourceClaims/${index}`; const claim = objectValue(entry, claimPath, issues); if (!claim) return;
      const quantitative = claim.kind === "quantitative-capacity";
      shape(claim, claimPath, quantitative ? ["ruleId", "resourceInstanceId", "kind", "amount", "unit", "reservation"] : ["ruleId", "resourceInstanceId", "kind", "reservation"], [], issues);
      let rule: EligibilityRuleMtcV1 | undefined;
      if (id(claim.ruleId, `${claimPath}/ruleId`, issues)) {
        rule = rules.get(claim.ruleId); if (!rule) add(issues, "unknown-reference", `${claimPath}/ruleId`, "Unknown rule for initiative type.");
        else if (rule.kind !== "exclusive-resource-available" && rule.kind !== "quantitative-capacity-available") add(issues, "rule-binding-mismatch", `${claimPath}/ruleId`, "Rule is not a resource rule.");
        if (seenClaims.has(claim.ruleId)) add(issues, "duplicate-resource-claim", `${claimPath}/ruleId`, "Rule has more than one claim binding.");
        seenClaims.add(claim.ruleId);
      }
      let instance: ReturnType<typeof resourceInstances.get>;
      if (id(claim.resourceInstanceId, `${claimPath}/resourceInstanceId`, issues)) {
        instance = resourceInstances.get(claim.resourceInstanceId); if (!instance) add(issues, "unknown-reference", `${claimPath}/resourceInstanceId`, "Unknown resource instance.");
      }
      const expectedKind = rule?.kind === "exclusive-resource-available" ? "exclusive" : rule?.kind === "quantitative-capacity-available" ? "quantitative-capacity" : undefined;
      if (claim.kind !== "exclusive" && !quantitative) add(issues, "invalid-discriminant", `${claimPath}/kind`, "Unsupported claim kind.");
      if (expectedKind && (claim.kind !== expectedKind || instance?.kind !== expectedKind)) add(issues, "resource-kind-mismatch", `${claimPath}/kind`, "Claim, instance, and rule kinds must match.");
      if (rule && "resourceId" in rule && instance && rule.resourceId !== instance.resourceId) add(issues, "rule-binding-mismatch", `${claimPath}/resourceInstanceId`, "Resource instance does not implement the rule's resource declaration.");
      if (claim.reservation !== "while-active") add(issues, "invalid-discriminant", `${claimPath}/reservation`, "Claims must reserve while active.");
      if (quantitative) {
        positiveDecimal(claim.amount, `${claimPath}/amount`, issues); id(claim.unit, `${claimPath}/unit`, issues);
        if (rule?.kind === "quantitative-capacity-available" && claim.amount !== rule.amount) add(issues, "rule-binding-mismatch", `${claimPath}/amount`, "Claim amount must equal the domain rule.");
        if (rule?.kind === "quantitative-capacity-available" && claim.unit !== rule.unit) add(issues, "unit-mismatch", `${claimPath}/unit`, "Claim unit must equal the domain rule.");
        if (instance?.unit && claim.unit !== instance.unit) add(issues, "unit-mismatch", `${claimPath}/unit`, "Claim unit must equal the resource instance unit.");
      }
    });
    for (const ruleId of requiredClaims) if (!seenClaims.has(ruleId)) add(issues, "incomplete-initial-state", `${path}/resourceClaims`, `Missing resource claim binding for ${ruleId}.`);
  }
  if (dependencyCount > CONTRACT_LIMITS_MTC_V1.maxScenarioDependencies) add(issues, "limit-exceeded", "/initiatives", `Maximum total dependencies is ${CONTRACT_LIMITS_MTC_V1.maxScenarioDependencies}.`);
  if (claimCount > CONTRACT_LIMITS_MTC_V1.maxScenarioResourceClaims) add(issues, "limit-exceeded", "/initiatives", `Maximum total resource claims is ${CONTRACT_LIMITS_MTC_V1.maxScenarioResourceClaims}.`);

  const visiting = new Set<string>(); const visited = new Set<string>(); let cycle = false;
  const visit = (node: string): void => { if (visiting.has(node)) { cycle = true; return; } if (visited.has(node)) return; visiting.add(node); for (const target of (graph.get(node) ?? []).sort(compareCanonicalStringsMtcV1)) visit(target); visiting.delete(node); visited.add(node); };
  for (const node of [...graph.keys()].sort(compareCanonicalStringsMtcV1)) visit(node);
  if (cycle) add(issues, "dependency-cycle", "/initiatives", "Initiative dependency graph must be acyclic.");

  if (root.metadata !== undefined) {
    const metadata = objectValue(root.metadata, "/metadata", issues);
    if (metadata) {
      shape(metadata, "/metadata", ["displayName"], [], issues);
      if (typeof metadata.displayName !== "string" || metadata.displayName.length === 0 || metadata.displayName.normalize("NFC") !== metadata.displayName || new TextEncoder().encode(metadata.displayName).length > CONTRACT_LIMITS_MTC_V1.maxDisplayStringBytes) add(issues, "invalid-string", "/metadata/displayName", "Expected a nonempty bounded NFC display name.");
    }
  }

  issues.sort((a, b) => compareCanonicalStringsMtcV1(a.path, b.path) || compareCanonicalStringsMtcV1(a.code, b.code) || compareCanonicalStringsMtcV1(a.message, b.message));
  if (issues.length) return freezeDeep({ ok: false as const, issues });
  const copy = structuredClone(root) as unknown as TwoLayerMtcScenarioV1;
  const by = <T>(items: T[], key: (item: T) => string): void => { items.sort((a, b) => compareCanonicalStringsMtcV1(key(a), key(b))); };
  by(copy.resources as unknown as R[], (item) => item.resourceInstanceId as string);
  by(copy.initialConstraints as unknown as R[], (item) => item.constraintId as string);
  by(copy.initialEntitlements as unknown as R[], (item) => item.entitlementId as string);
  by(copy.initiatives as unknown as R[], (item) => item.instanceId as string);
  for (const initiative of copy.initiatives) {
    by(initiative.dependencies as unknown as R[], (item) => `${item.ruleId}\0${item.prerequisiteInstanceId}`);
    by(initiative.resourceClaims as unknown as R[], (item) => `${item.ruleId}\0${item.resourceInstanceId}`);
  }
  const preparedBase = copy as unknown as R;
  preparedBase.initiatives = copy.initiatives.map((initiative) => ({ ...initiative, completionBoundary: initiative.scheduledStartPeriod + initiative.durationPeriods, terminalLifecycle: initiative.scheduledStartPeriod + initiative.durationPeriods <= copy.horizon.finalPeriod + 1 ? "completed" : "active" }));
  preparedBase.semanticIdentity = scenarioSemanticIdentityMtcV1(copy);
  return freezeDeep({ ok: true as const, value: preparedBase as unknown as PreparedScenarioMtcV1 });
}
