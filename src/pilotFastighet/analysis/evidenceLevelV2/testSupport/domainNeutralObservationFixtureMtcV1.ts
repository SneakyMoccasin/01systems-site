import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import { runLayer1MtcV1 } from "../execution/runLayer1MtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { deriveObservationSourcesMtcV1 } from "../observationSource/deriveObservationSourcesMtcV1";
import type { ObservationSourceBindingsMtcV1 } from "../observationSource/observationSourceMtcV1";
import { parseObservationSourceBindingsMtcV1 } from "../observationSource/parseObservationSourceBindingsMtcV1";
import { parseScenarioMtcV1 } from "../scenario/parseScenarioMtcV1";
import type { PreparedScenarioMtcV1 } from "../scenario/scenarioMtcV1";

export function rawObservationContractMtcV1(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1", semanticId: "contract:observation-fixture", revision: 1,
    protocolVersion: "ce-two-layer-mtc-protocol-v1", limitsVersion: "ce-two-layer-mtc-limits-v1",
    evidence: [{ evidenceId: "evidence:causal", basis: "synthetic", reference: "domain-neutral causal fixture" }],
    layer1: { initiativeTypes: [{ initiativeTypeId: "initiative:alpha", lifecycle: "pending-active-completed-v1", eligibilityRules: [] }], resources: [], constraints: [], entitlements: [] },
    layer2: {
      resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1",
      nodes: ["x", "y", "z", "w", "orphan"].map((id) => ({ nodeId: `observation:${id}` })),
      edges: [
        { edgeId: "edge:x-y", sourceNodeId: "observation:x", targetNodeId: "observation:y", relationship: "directional-causal-observation", persistence: "declared-persistent", evidence: { kind: "evidence-reference", evidenceId: "evidence:causal" } },
        { edgeId: "edge:x-z", sourceNodeId: "observation:x", targetNodeId: "observation:z", relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "Synthetic branch" } },
        { edgeId: "edge:y-w", sourceNodeId: "observation:y", targetNodeId: "observation:w", relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "evidence-reference", evidenceId: "evidence:causal" } },
        { edgeId: "edge:z-w", sourceNodeId: "observation:z", targetNodeId: "observation:w", relationship: "directional-causal-observation", persistence: "declared-persistent", evidence: { kind: "explicit-assumption", rationale: "Synthetic convergence" } },
      ],
    },
  };
}

export function observationFixtureMtcV1(options: Readonly<{
  mutateContract?: (raw: Record<string, unknown>) => void;
  includeCompletionBinding?: boolean;
  noBindings?: boolean;
}> = {}) {
  const rawContract = rawObservationContractMtcV1(); options.mutateContract?.(rawContract);
  const contractResult = parseContractMtcV1(rawContract);
  if (!contractResult.ok) throw new Error(JSON.stringify(contractResult.issues));
  const contract: TwoLayerMtcContractV1 = contractResult.value;
  const rawScenario = {
    schemaVersion: "ce-two-layer-mtc-scenario-v1", scenarioId: "scenario:observation-fixture", revision: 1,
    domainContract: { semanticId: contract.semanticId, semanticIdentity: contractSemanticIdentityMtcV1(contract) },
    horizon: { firstPeriod: 1, finalPeriod: 4 },
    initiatives: [{ instanceId: "instance:alpha", initiativeTypeId: "initiative:alpha", scheduledStartPeriod: 1, durationPeriods: 1, initialLifecycle: "pending", dependencies: [], resourceClaims: [] }],
    resources: [], initialConstraints: [], initialEntitlements: [],
  };
  const scenarioResult = parseScenarioMtcV1(rawScenario, contract);
  if (!scenarioResult.ok) throw new Error(JSON.stringify(scenarioResult.issues));
  const scenario: PreparedScenarioMtcV1 = scenarioResult.value;
  const rawBindings = {
    schemaVersion: "ce-two-layer-mtc-source-bindings-v1",
    scenarioIdentity: scenario.semanticIdentity,
    contractIdentity: contractSemanticIdentityMtcV1(contract),
    bindings: options.noBindings ? [] : [
      { bindingId: "binding:alpha-admitted", eventKind: "initiative-admitted", initiativeInstanceId: "instance:alpha", targetNodeId: "observation:x" },
      ...(options.includeCompletionBinding ? [{ bindingId: "binding:alpha-completed", eventKind: "initiative-completed", initiativeInstanceId: "instance:alpha", targetNodeId: "observation:x" }] : []),
    ],
  };
  const bindingResult = parseObservationSourceBindingsMtcV1(rawBindings, scenario, contract);
  if (!bindingResult.ok) throw new Error(JSON.stringify(bindingResult.issues));
  const bindings: ObservationSourceBindingsMtcV1 = bindingResult.value;
  const execution = runLayer1MtcV1(scenario, contract);
  const sources = deriveObservationSourcesMtcV1(execution, scenario, contract, bindings);
  const context = { scenarioIdentity: scenario.semanticIdentity, firstPeriod: 1, finalPeriod: 4 };
  return { contract, scenario, bindings, execution, sources, context };
}
