import { parseCanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";
import { parseCanonicalSemanticIdMtcV1 } from "../canonical/canonicalIdMtcV1";
import { parseBoundedIntegerMtcV1 } from "../canonical/canonicalIntegerMtcV1";
import { compareCanonicalStringsMtcV1 } from "../canonical/canonicalOrderMtcV1";
import { CONTRACT_LIMITS_MTC_V1 } from "../protocol/contractLimitsMtcV1";
import {
  TWO_LAYER_MTC_LIMITS_VERSION,
  TWO_LAYER_MTC_PROTOCOL_VERSION,
  TWO_LAYER_MTC_SCHEMA_VERSION,
  type ContractIssueCodeMtcV1,
  type ContractIssueMtcV1,
  type ParseContractResultMtcV1,
  type TwoLayerMtcContractV1,
} from "./contractMtcV1";

type RecordValue = Record<string, unknown>;
type MutableContract = {
  evidence: RecordValue[];
  layer1: {
    initiativeTypes: Array<RecordValue & { eligibilityRules: RecordValue[] }>;
    resources: RecordValue[];
    constraints: RecordValue[];
    entitlements: RecordValue[];
  };
  layer2: { nodes: RecordValue[]; edges: RecordValue[] };
};

const EVIDENCE_BASES = new Set([
  "normative", "observed", "derived", "expert-elicited", "synthetic", "assumed",
]);

function add(
  issues: ContractIssueMtcV1[],
  code: ContractIssueCodeMtcV1,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function objectValue(
  value: unknown,
  path: string,
  issues: ContractIssueMtcV1[],
): RecordValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    add(issues, "invalid-type", path, "Expected a plain object.");
    return undefined;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    add(issues, "invalid-type", path, "Expected a plain object.");
    return undefined;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      add(issues, "unknown-field", path, "Symbol keys are forbidden.");
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      add(issues, "invalid-type", `${path}/${key}`, "Properties must be enumerable data properties.");
      return undefined;
    }
  }
  return value as RecordValue;
}

function arrayValue(
  value: unknown,
  path: string,
  max: number,
  issues: ContractIssueMtcV1[],
): unknown[] | undefined {
  if (!Array.isArray(value)) {
    add(issues, "invalid-type", path, "Expected an array.");
    return undefined;
  }
  if (value.length > max) add(issues, "limit-exceeded", path, `Maximum is ${max}.`);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) {
    add(issues, "invalid-type", path, "Sparse arrays and extra properties are forbidden.");
    return undefined;
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      add(issues, "invalid-type", `${path}/${index}`, "Array entries must be data properties.");
      return undefined;
    }
  }
  return value;
}

function shape(
  value: RecordValue,
  path: string,
  required: readonly string[],
  optional: readonly string[],
  issues: ContractIssueMtcV1[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const field of required) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      add(issues, "missing-field", `${path}/${field}`, "Required field is missing.");
    }
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) add(issues, "unknown-field", `${path}/${field}`, "Unknown field.");
  }
}

function validId(value: unknown, path: string, issues: ContractIssueMtcV1[]): value is string {
  try {
    parseCanonicalSemanticIdMtcV1(value);
    return true;
  } catch {
    add(issues, "invalid-id", path, "Expected a bounded canonical ASCII semantic ID.");
    return false;
  }
}

function validText(value: unknown, path: string, issues: ContractIssueMtcV1[]): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.normalize("NFC") !== value ||
    new TextEncoder().encode(value).byteLength > CONTRACT_LIMITS_MTC_V1.maxDisplayStringBytes
  ) {
    add(issues, "invalid-string", path, "Expected a nonempty bounded NFC string.");
    return false;
  }
  return true;
}

function exact(
  value: unknown,
  expected: string,
  path: string,
  issues: ContractIssueMtcV1[],
): boolean {
  if (value !== expected) {
    add(issues, "invalid-discriminant", path, `Expected ${expected}.`);
    return false;
  }
  return true;
}

function unique(
  id: string,
  path: string,
  seen: Map<string, string>,
  issues: ContractIssueMtcV1[],
): void {
  const earlier = seen.get(id);
  if (earlier) add(issues, "duplicate-semantic-id", path, `ID duplicates ${earlier}.`);
  else seen.set(id, path);
}

function freezeDeep<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as RecordValue)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalCopy(raw: RecordValue): TwoLayerMtcContractV1 {
  const copy = structuredClone(raw) as RecordValue & MutableContract;
  const sort = (items: RecordValue[], key: string): void => {
    items.sort((left, right) => compareCanonicalStringsMtcV1(left[key] as string, right[key] as string));
  };
  sort(copy.evidence, "evidenceId");
  sort(copy.layer1.initiativeTypes, "initiativeTypeId");
  for (const initiative of copy.layer1.initiativeTypes) sort(initiative.eligibilityRules, "ruleId");
  sort(copy.layer1.resources, "resourceId");
  sort(copy.layer1.constraints, "constraintId");
  sort(copy.layer1.entitlements, "entitlementId");
  sort(copy.layer2.nodes, "nodeId");
  sort(copy.layer2.edges, "edgeId");
  return freezeDeep(copy) as unknown as TwoLayerMtcContractV1;
}

export function parseContractJsonMtcV1(json: string): ParseContractResultMtcV1 {
  let decoded: unknown;
  try {
    decoded = JSON.parse(json) as unknown;
  } catch {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ code: "invalid-json", path: "", message: "Invalid JSON." }] as const),
    });
  }
  return parseContractMtcV1(decoded);
}

export function parseContractMtcV1(raw: unknown): ParseContractResultMtcV1 {
  const issues: ContractIssueMtcV1[] = [];
  const root = objectValue(raw, "", issues);
  if (!root) return Object.freeze({ ok: false, issues: Object.freeze(issues) });
  shape(root, "", [
    "schemaVersion", "semanticId", "revision", "protocolVersion", "limitsVersion",
    "evidence", "layer1", "layer2",
  ], [], issues);
  exact(root.schemaVersion, TWO_LAYER_MTC_SCHEMA_VERSION, "/schemaVersion", issues);
  validId(root.semanticId, "/semanticId", issues);
  try {
    parseBoundedIntegerMtcV1(root.revision, { min: 1, max: Number.MAX_SAFE_INTEGER });
  } catch {
    add(issues, "unsafe-integer", "/revision", "Revision must be a positive safe integer.");
  }
  exact(root.protocolVersion, TWO_LAYER_MTC_PROTOCOL_VERSION, "/protocolVersion", issues);
  exact(root.limitsVersion, TWO_LAYER_MTC_LIMITS_VERSION, "/limitsVersion", issues);

  const seen = new Map<string, string>();
  const evidenceIds = new Set<string>();
  const evidence = arrayValue(
    root.evidence, "/evidence", CONTRACT_LIMITS_MTC_V1.maxEvidenceDeclarations, issues,
  );
  evidence?.forEach((entry, index) => {
    const path = `/evidence/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["evidenceId", "basis", "reference"], [], issues);
    if (validId(item.evidenceId, `${path}/evidenceId`, issues)) {
      unique(item.evidenceId, `${path}/evidenceId`, seen, issues);
      evidenceIds.add(item.evidenceId);
    }
    if (!EVIDENCE_BASES.has(item.basis as string)) {
      add(issues, "invalid-discriminant", `${path}/basis`, "Unsupported evidence basis.");
    }
    validText(item.reference, `${path}/reference`, issues);
  });

  const layer1 = objectValue(root.layer1, "/layer1", issues);
  if (layer1) shape(layer1, "/layer1", ["initiativeTypes", "resources", "constraints", "entitlements"], [], issues);
  const initiativeIds = new Set<string>();
  const resourceKinds = new Map<string, string>();
  const resourceUnits = new Map<string, string>();
  const constraintIds = new Set<string>();
  const entitlementIds = new Set<string>();
  const pendingRules: Array<{ item: RecordValue; path: string }> = [];

  const initiatives = layer1 && arrayValue(
    layer1.initiativeTypes, "/layer1/initiativeTypes", CONTRACT_LIMITS_MTC_V1.maxInitiativeTypes, issues,
  );
  initiatives?.forEach((entry, index) => {
    const path = `/layer1/initiativeTypes/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["initiativeTypeId", "lifecycle", "eligibilityRules"], [], issues);
    if (validId(item.initiativeTypeId, `${path}/initiativeTypeId`, issues)) {
      unique(item.initiativeTypeId, `${path}/initiativeTypeId`, seen, issues);
      initiativeIds.add(item.initiativeTypeId);
    }
    exact(item.lifecycle, "pending-active-completed-v1", `${path}/lifecycle`, issues);
    const rules = arrayValue(
      item.eligibilityRules,
      `${path}/eligibilityRules`,
      CONTRACT_LIMITS_MTC_V1.maxEligibilityRulesPerInitiative,
      issues,
    );
    rules?.forEach((rule, ruleIndex) => {
      const rulePath = `${path}/eligibilityRules/${ruleIndex}`;
      const ruleObject = objectValue(rule, rulePath, issues);
      if (ruleObject) pendingRules.push({ item: ruleObject, path: rulePath });
    });
  });

  const resources = layer1 && arrayValue(
    layer1.resources, "/layer1/resources", CONTRACT_LIMITS_MTC_V1.maxResources, issues,
  );
  resources?.forEach((entry, index) => {
    const path = `/layer1/resources/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    const quantitative = item.kind === "quantitative-capacity";
    shape(item, path, quantitative ? ["resourceId", "kind", "unit", "capacity"] : ["resourceId", "kind"], [], issues);
    if (validId(item.resourceId, `${path}/resourceId`, issues)) {
      unique(item.resourceId, `${path}/resourceId`, seen, issues);
      resourceKinds.set(item.resourceId, item.kind as string);
    }
    if (item.kind !== "exclusive" && !quantitative) {
      add(issues, "invalid-discriminant", `${path}/kind`, "Unsupported resource kind.");
    }
    if (quantitative) {
      if (validId(item.unit, `${path}/unit`, issues) && typeof item.resourceId === "string") {
        resourceUnits.set(item.resourceId, item.unit);
      }
      try {
        const capacity = parseCanonicalDecimalMtcV1(item.capacity);
        if (capacity.startsWith("-")) throw new Error();
      } catch {
        add(issues, "invalid-decimal", `${path}/capacity`, "Capacity must be a nonnegative canonical decimal.");
      }
    }
  });

  const constraints = layer1 && arrayValue(
    layer1.constraints, "/layer1/constraints", CONTRACT_LIMITS_MTC_V1.maxConstraints, issues,
  );
  constraints?.forEach((entry, index) => {
    const path = `/layer1/constraints/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["constraintId", "kind"], [], issues);
    if (validId(item.constraintId, `${path}/constraintId`, issues)) {
      unique(item.constraintId, `${path}/constraintId`, seen, issues);
      constraintIds.add(item.constraintId);
    }
    exact(item.kind, "blocking", `${path}/kind`, issues);
  });

  const entitlements = layer1 && arrayValue(
    layer1.entitlements, "/layer1/entitlements", CONTRACT_LIMITS_MTC_V1.maxEntitlements, issues,
  );
  entitlements?.forEach((entry, index) => {
    const path = `/layer1/entitlements/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["entitlementId", "kind"], [], issues);
    if (validId(item.entitlementId, `${path}/entitlementId`, issues)) {
      unique(item.entitlementId, `${path}/entitlementId`, seen, issues);
      entitlementIds.add(item.entitlementId);
    }
    if (item.kind !== "reusable" && item.kind !== "consumable") {
      add(issues, "invalid-discriminant", `${path}/kind`, "Unsupported entitlement kind.");
    }
  });

  pendingRules.forEach(({ item, path }) => {
    const kind = item.kind;
    const fields: Record<string, string[]> = {
      "prerequisite-completed": ["ruleId", "kind", "prerequisiteInitiativeTypeId"],
      "exclusive-resource-available": ["ruleId", "kind", "resourceId", "reservation"],
      "quantitative-capacity-available": ["ruleId", "kind", "resourceId", "amount", "unit", "reservation"],
      "constraint-absent": ["ruleId", "kind", "constraintId"],
      "entitlement-available": ["ruleId", "kind", "entitlementId", "consumption"],
    };
    const required = fields[kind as string];
    shape(item, path, required ?? ["ruleId", "kind"], [], issues);
    if (validId(item.ruleId, `${path}/ruleId`, issues)) unique(item.ruleId, `${path}/ruleId`, seen, issues);
    if (!required) {
      add(issues, "invalid-discriminant", `${path}/kind`, "Unsupported eligibility rule kind.");
      return;
    }
    if (kind === "prerequisite-completed") {
      if (validId(item.prerequisiteInitiativeTypeId, `${path}/prerequisiteInitiativeTypeId`, issues) &&
          !initiativeIds.has(item.prerequisiteInitiativeTypeId)) {
        add(issues, "unknown-reference", `${path}/prerequisiteInitiativeTypeId`, "Unknown initiative type.");
      }
    } else if (kind === "exclusive-resource-available" || kind === "quantitative-capacity-available") {
      const expectedKind = kind === "exclusive-resource-available" ? "exclusive" : "quantitative-capacity";
      if (validId(item.resourceId, `${path}/resourceId`, issues)) {
        if (!resourceKinds.has(item.resourceId)) add(issues, "unknown-reference", `${path}/resourceId`, "Unknown resource.");
        else if (resourceKinds.get(item.resourceId) !== expectedKind) add(issues, "resource-kind-mismatch", `${path}/resourceId`, "Resource kind does not match rule.");
      }
      exact(item.reservation, "while-active", `${path}/reservation`, issues);
      if (kind === "quantitative-capacity-available") {
        try {
          const amount = parseCanonicalDecimalMtcV1(item.amount);
          if (amount === "0" || amount.startsWith("-")) throw new Error();
        } catch {
          add(issues, "invalid-decimal", `${path}/amount`, "Amount must be a positive canonical decimal.");
        }
        if (validId(item.unit, `${path}/unit`, issues) && typeof item.resourceId === "string" &&
            resourceUnits.has(item.resourceId) && resourceUnits.get(item.resourceId) !== item.unit) {
          add(issues, "unit-mismatch", `${path}/unit`, "Claim unit must exactly match resource unit.");
        }
      }
    } else if (kind === "constraint-absent") {
      if (validId(item.constraintId, `${path}/constraintId`, issues) && !constraintIds.has(item.constraintId)) {
        add(issues, "unknown-reference", `${path}/constraintId`, "Unknown constraint.");
      }
    } else if (kind === "entitlement-available") {
      if (validId(item.entitlementId, `${path}/entitlementId`, issues) && !entitlementIds.has(item.entitlementId)) {
        add(issues, "unknown-reference", `${path}/entitlementId`, "Unknown entitlement.");
      }
      if (item.consumption !== "retain" && item.consumption !== "consume-on-admission") {
        add(issues, "invalid-discriminant", `${path}/consumption`, "Unsupported entitlement consumption.");
      }
    }
  });

  const layer2 = objectValue(root.layer2, "/layer2", issues);
  if (layer2) shape(layer2, "/layer2", ["resultVocabularyVersion", "nodes", "edges"], [], issues);
  if (layer2) exact(layer2.resultVocabularyVersion, "affected-exposed-unchanged-unknown-v1", "/layer2/resultVocabularyVersion", issues);
  const nodeIds = new Set<string>();
  const nodes = layer2 && arrayValue(layer2.nodes, "/layer2/nodes", CONTRACT_LIMITS_MTC_V1.maxObservationNodes, issues);
  nodes?.forEach((entry, index) => {
    const path = `/layer2/nodes/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["nodeId"], ["label"], issues);
    if (validId(item.nodeId, `${path}/nodeId`, issues)) {
      unique(item.nodeId, `${path}/nodeId`, seen, issues);
      nodeIds.add(item.nodeId);
    }
    if (Object.prototype.hasOwnProperty.call(item, "label")) validText(item.label, `${path}/label`, issues);
  });

  const layer1Ids = new Set([...initiativeIds, ...resourceKinds.keys(), ...constraintIds, ...entitlementIds]);
  const graph = new Map<string, string[]>();
  for (const nodeId of nodeIds) graph.set(nodeId, []);
  const edgePairs = new Map<string, string>();
  const edges = layer2 && arrayValue(layer2.edges, "/layer2/edges", CONTRACT_LIMITS_MTC_V1.maxObservationEdges, issues);
  edges?.forEach((entry, index) => {
    const path = `/layer2/edges/${index}`;
    const item = objectValue(entry, path, issues);
    if (!item) return;
    shape(item, path, ["edgeId", "sourceNodeId", "targetNodeId", "relationship", "persistence", "evidence"], [], issues);
    if (validId(item.edgeId, `${path}/edgeId`, issues)) unique(item.edgeId, `${path}/edgeId`, seen, issues);
    const sourceValid = validId(item.sourceNodeId, `${path}/sourceNodeId`, issues);
    const targetValid = validId(item.targetNodeId, `${path}/targetNodeId`, issues);
    for (const [field, valid] of [["sourceNodeId", sourceValid], ["targetNodeId", targetValid]] as const) {
      const id = item[field];
      if (valid && !nodeIds.has(id as string)) {
        add(
          issues,
          layer1Ids.has(id as string) ? "forbidden-cross-layer-reference" : "unknown-reference",
          `${path}/${field}`,
          layer1Ids.has(id as string) ? "Layer 2 cannot reference a Layer 1 declaration." : "Unknown observation node.",
        );
      }
    }
    if (sourceValid && targetValid && item.sourceNodeId === item.targetNodeId) {
      add(issues, "self-edge", `${path}/targetNodeId`, "Observation self-edges are forbidden.");
    }
    const sourceId = sourceValid ? item.sourceNodeId as string : undefined;
    const targetId = targetValid ? item.targetNodeId as string : undefined;
    if (sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId) && sourceId !== targetId) {
      const pair = `${sourceId}\u0000${targetId}`;
      const earlier = edgePairs.get(pair);
      if (earlier) add(issues, "duplicate-observation-edge", `${path}/targetNodeId`, `Edge duplicates ${earlier}.`);
      else {
        edgePairs.set(pair, path);
        graph.get(sourceId)!.push(targetId);
      }
    }
    exact(item.relationship, "directional-causal-observation", `${path}/relationship`, issues);
    if (item.persistence !== "none" && item.persistence !== "declared-persistent") {
      add(issues, "invalid-discriminant", `${path}/persistence`, "Unsupported persistence declaration.");
    }
    const evidenceObject = objectValue(item.evidence, `${path}/evidence`, issues);
    if (evidenceObject?.kind === "evidence-reference") {
      shape(evidenceObject, `${path}/evidence`, ["kind", "evidenceId"], [], issues);
      if (validId(evidenceObject.evidenceId, `${path}/evidence/evidenceId`, issues) && !evidenceIds.has(evidenceObject.evidenceId)) {
        add(issues, "unknown-reference", `${path}/evidence/evidenceId`, "Unknown evidence declaration.");
      }
    } else if (evidenceObject?.kind === "explicit-assumption") {
      shape(evidenceObject, `${path}/evidence`, ["kind", "rationale"], [], issues);
      validText(evidenceObject.rationale, `${path}/evidence/rationale`, issues);
    } else if (evidenceObject) {
      shape(evidenceObject, `${path}/evidence`, ["kind"], [], issues);
      add(issues, "invalid-discriminant", `${path}/evidence/kind`, "Evidence must be referenced or explicitly assumed.");
    }
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const depths = new Map<string, number>();
  let cycle = false;
  const visit = (nodeId: string): number => {
    if (visiting.has(nodeId)) { cycle = true; return 0; }
    if (visited.has(nodeId)) return depths.get(nodeId) ?? 1;
    visiting.add(nodeId);
    let depth = 1;
    for (const target of (graph.get(nodeId) ?? []).sort(compareCanonicalStringsMtcV1)) {
      depth = Math.max(depth, 1 + visit(target));
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    depths.set(nodeId, depth);
    return depth;
  };
  for (const nodeId of [...nodeIds].sort(compareCanonicalStringsMtcV1)) visit(nodeId);
  if (cycle) add(issues, "causal-cycle", "/layer2/edges", "Observation graph must be acyclic.");
  else if ([...depths.values()].some((depth) => depth > CONTRACT_LIMITS_MTC_V1.maxObservationDepth)) {
    add(issues, "causal-depth-exceeded", "/layer2/edges", `Maximum DAG depth is ${CONTRACT_LIMITS_MTC_V1.maxObservationDepth}.`);
  }

  issues.sort((left, right) =>
    compareCanonicalStringsMtcV1(left.path, right.path) ||
    compareCanonicalStringsMtcV1(left.code, right.code) ||
    compareCanonicalStringsMtcV1(left.message, right.message),
  );
  if (issues.length > 0) return freezeDeep({ ok: false as const, issues });
  return freezeDeep({ ok: true as const, value: canonicalCopy(root) });
}
