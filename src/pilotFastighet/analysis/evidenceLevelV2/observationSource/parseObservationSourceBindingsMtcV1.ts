import { parseCanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";
import { scenarioSemanticIdentityMtcV1 } from "../scenario/scenarioSemanticIdentityMtcV1";
import { observationSourceBindingsIdentityMtcV1 } from "./observationSourceIdentityMtcV1";
import {
  OBSERVATION_SOURCE_BINDINGS_VERSION,
  type ObservationSourceBindingsMtcV1,
  type ParseSourceBindingsResultMtcV1,
  type SourceBindingIssueCodeMtcV1,
  type SourceBindingIssueMtcV1,
} from "./observationSourceMtcV1";

type R = Record<string, unknown>;
const HASH = /^[0-9a-f]{64}$/;

function add(issues: SourceBindingIssueMtcV1[], code: SourceBindingIssueCodeMtcV1, path: string, message: string): void {
  issues.push({ code, path, message });
}

function objectValue(value: unknown, path: string, issues: SourceBindingIssueMtcV1[]): R | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) { add(issues, "invalid-type", path, "Expected a plain object."); return undefined; }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) { add(issues, "invalid-type", path, "Expected a plain object."); return undefined; }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") { add(issues, "unknown-field", path, "Symbol keys are forbidden."); return undefined; }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) { add(issues, "invalid-type", `${path}/${key}`, "Properties must be enumerable data properties."); return undefined; }
  }
  return value as R;
}

function shape(value: R, path: string, required: readonly string[], issues: SourceBindingIssueMtcV1[]): void {
  const allowed = new Set(required);
  for (const field of required) if (!Object.hasOwn(value, field)) add(issues, "missing-field", `${path}/${field}`, "Required field is missing.");
  for (const field of Object.keys(value)) if (!allowed.has(field)) add(issues, "unknown-field", `${path}/${field}`, "Unknown or authority-bearing field.");
}

function id(value: unknown, path: string, issues: SourceBindingIssueMtcV1[]): value is string {
  try { parseCanonicalSemanticIdMtcV1(value); return true; }
  catch { add(issues, "invalid-id", path, "Expected a bounded canonical ASCII semantic ID."); return false; }
}

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as R)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

export function parseObservationSourceBindingsMtcV1(
  raw: unknown,
  scenario: PreparedScenarioMtcV1,
  contract: TwoLayerMtcContractV1,
): ParseSourceBindingsResultMtcV1 {
  const issues: SourceBindingIssueMtcV1[] = [];
  const root = objectValue(raw, "", issues);
  if (!root) return freezeDeep({ ok: false as const, issues });
  shape(root, "", ["schemaVersion", "scenarioIdentity", "contractIdentity", "bindings"], issues);
  if (root.schemaVersion !== OBSERVATION_SOURCE_BINDINGS_VERSION) add(issues, "invalid-discriminant", "/schemaVersion", `Expected ${OBSERVATION_SOURCE_BINDINGS_VERSION}.`);
  const expectedScenario = scenarioSemanticIdentityMtcV1(scenario);
  const expectedContract = contractSemanticIdentityMtcV1(contract);
  for (const [field, expected] of [["scenarioIdentity", expectedScenario], ["contractIdentity", expectedContract]] as const) {
    if (typeof root[field] !== "string" || !HASH.test(root[field] as string)) add(issues, "invalid-hash", `/${field}`, "Expected a lowercase SHA-256 identity.");
    else if (root[field] !== expected) add(issues, "identity-mismatch", `/${field}`, "Identity does not match the supplied validated artifact.");
  }
  if (scenario.semanticIdentity !== expectedScenario || scenario.domainContract.semanticIdentity !== expectedContract) add(issues, "identity-mismatch", "/scenarioIdentity", "Prepared scenario identity verification failed.");

  const instanceIds = new Set(scenario.initiatives.map((item) => item.instanceId as string));
  const nodeIds = new Set(contract.layer2.nodes.map((item) => item.nodeId as string));
  const layer1Ids = new Set([
    ...contract.layer1.initiativeTypes.map((item) => item.initiativeTypeId as string),
    ...contract.layer1.resources.map((item) => item.resourceId as string),
    ...contract.layer1.constraints.map((item) => item.constraintId as string),
    ...contract.layer1.entitlements.map((item) => item.entitlementId as string),
  ]);
  const seenIds = new Map<string, string>(); const seenSources = new Map<string, { target: string; path: string }>();
  if (!Array.isArray(root.bindings)) add(issues, "invalid-type", "/bindings", "Expected an array.");
  else {
    if (root.bindings.length > CONTRACT_LIMITS_MTC_V1.maxSourceBindings) add(issues, "limit-exceeded", "/bindings", `Maximum is ${CONTRACT_LIMITS_MTC_V1.maxSourceBindings}.`);
    if (Reflect.ownKeys(root.bindings).length !== root.bindings.length + 1) add(issues, "invalid-type", "/bindings", "Sparse arrays and extra properties are forbidden.");
    root.bindings.forEach((entry, index) => {
      const path = `/bindings/${index}`; const item = objectValue(entry, path, issues); if (!item) return;
      shape(item, path, ["bindingId", "eventKind", "initiativeInstanceId", "targetNodeId"], issues);
      if (id(item.bindingId, `${path}/bindingId`, issues)) {
        const prior = seenIds.get(item.bindingId);
        if (prior) add(issues, "duplicate-binding", `${path}/bindingId`, `Binding ID duplicates ${prior}.`);
        else seenIds.set(item.bindingId, path);
      }
      if (item.eventKind !== "initiative-admitted" && item.eventKind !== "initiative-completed") add(issues, "invalid-discriminant", `${path}/eventKind`, "Unsupported source event kind.");
      if (id(item.initiativeInstanceId, `${path}/initiativeInstanceId`, issues) && !instanceIds.has(item.initiativeInstanceId)) add(issues, "unknown-reference", `${path}/initiativeInstanceId`, "Unknown initiative instance.");
      if (id(item.targetNodeId, `${path}/targetNodeId`, issues) && !nodeIds.has(item.targetNodeId)) add(issues, layer1Ids.has(item.targetNodeId) ? "forbidden-layer1-target" : "unknown-reference", `${path}/targetNodeId`, layer1Ids.has(item.targetNodeId) ? "Binding target must be a Layer 2 observation node." : "Unknown Layer 2 observation node.");
      if (typeof item.eventKind === "string" && typeof item.initiativeInstanceId === "string" && typeof item.targetNodeId === "string") {
        const source = `${item.eventKind}\0${item.initiativeInstanceId}`; const prior = seenSources.get(source);
        if (prior) add(issues, prior.target === item.targetNodeId ? "duplicate-binding" : "conflicting-binding", `${path}/targetNodeId`, prior.target === item.targetNodeId ? `Source binding duplicates ${prior.path}.` : `Source already targets a different node at ${prior.path}.`);
        else seenSources.set(source, { target: item.targetNodeId, path });
      }
    });
  }
  issues.sort((a, b) => compareCanonicalStringsMtcV1(a.path, b.path) || compareCanonicalStringsMtcV1(a.code, b.code) || compareCanonicalStringsMtcV1(a.message, b.message));
  if (issues.length) return freezeDeep({ ok: false as const, issues });
  const value = structuredClone(root) as unknown as Omit<ObservationSourceBindingsMtcV1, "semanticIdentity">;
  (value.bindings as unknown as Array<{ bindingId: string }>).sort((a, b) => compareCanonicalStringsMtcV1(a.bindingId, b.bindingId));
  const prepared = { ...value, semanticIdentity: observationSourceBindingsIdentityMtcV1(value) } as ObservationSourceBindingsMtcV1;
  return freezeDeep({ ok: true as const, value: prepared });
}
