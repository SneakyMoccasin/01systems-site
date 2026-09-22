import { compareSingleRunsMtcV1 } from "../comparison/compareSingleRunsMtcV1";
import { parseContractMtcV1 } from "../contract/parseContractMtcV1";
import { runLayer1MtcV1 } from "../execution/runLayer1MtcV1";
import { contractSemanticIdentityMtcV1 } from "../identity/contractSemanticIdentityMtcV1";
import { evaluateObservationsMtcV1 } from "../observationEvaluation/evaluateObservationsMtcV1";
import { deriveObservationSourcesMtcV1 } from "../observationSource/deriveObservationSourcesMtcV1";
import { parseObservationSourceBindingsMtcV1 } from "../observationSource/parseObservationSourceBindingsMtcV1";
import { parseScenarioMtcV1 } from "../scenario/parseScenarioMtcV1";
import { buildSingleRunResultMtcV1 } from "../singleRunResult/buildSingleRunResultMtcV1";
import { domainNeutralScenarioMtcV1 } from "./domainNeutralScenarioMtcV1";
import { rawDecisionSpaceContractMtcV1 } from "./domainNeutralDecisionSpaceFixtureMtcV1";

export type VerticalFixtureMutationMtcV1 = Readonly<{
  contract?: (raw: Record<string, unknown>) => void;
  scenario?: (raw: Record<string, unknown>) => void;
  bindings?: (raw: Record<string, unknown>) => void;
}>;

function rawContract() {
  const raw = rawDecisionSpaceContractMtcV1();
  raw.evidence = [{ evidenceId: "evidence:synthetic-conformance", basis: "synthetic", reference: "CP6 domain-neutral fixture" }];
  raw.layer2 = {
    resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1",
    nodes: [{ nodeId: "observation:origin" }, { nodeId: "observation:branch-a" }, { nodeId: "observation:branch-b" }, { nodeId: "observation:convergence" }],
    edges: [
      { edgeId: "edge:origin-a", sourceNodeId: "observation:origin", targetNodeId: "observation:branch-a", relationship: "directional-causal-observation", persistence: "declared-persistent", evidence: { kind: "evidence-reference", evidenceId: "evidence:synthetic-conformance" } },
      { edgeId: "edge:origin-b", sourceNodeId: "observation:origin", targetNodeId: "observation:branch-b", relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "Synthetic branch for deterministic conformance" } },
      { edgeId: "edge:a-convergence", sourceNodeId: "observation:branch-a", targetNodeId: "observation:convergence", relationship: "directional-causal-observation", persistence: "declared-persistent", evidence: { kind: "evidence-reference", evidenceId: "evidence:synthetic-conformance" } },
      { edgeId: "edge:b-convergence", sourceNodeId: "observation:branch-b", targetNodeId: "observation:convergence", relationship: "directional-causal-observation", persistence: "none", evidence: { kind: "explicit-assumption", rationale: "Synthetic convergence for deterministic conformance" } },
    ],
  };
  return raw;
}

function createRun(schedule: "A" | "B", mutation: VerticalFixtureMutationMtcV1 = {}) {
  const contractRaw = rawContract(); mutation.contract?.(contractRaw);
  const parsedContract = parseContractMtcV1(contractRaw); if (!parsedContract.ok) throw new Error(JSON.stringify(parsedContract.issues)); const contract = parsedContract.value;
  const scenarioRaw = domainNeutralScenarioMtcV1(contract); const original = scenarioRaw.initiatives as Array<Record<string, unknown>>;
  const foundation = structuredClone(original[0]), delivery = structuredClone(original[1]), independent = structuredClone(original[3]);
  const foundationB = { ...structuredClone(foundation), instanceId: "instance:enablement", scheduledStartPeriod: schedule === "A" ? 4 : 3 };
  const foundationC = { ...structuredClone(foundation), instanceId: "instance:assurance", scheduledStartPeriod: 6 };
  const deliveryB = { ...structuredClone(delivery), instanceId: "instance:rollout", scheduledStartPeriod: 5, durationPeriods: 2, dependencies: [{ ruleId: "rule:delivery-prerequisite", prerequisiteInstanceId: "instance:foundation", condition: "completed" }] };
  scenarioRaw.initiatives = [
    { ...foundation, scheduledStartPeriod: 1 },
    { ...delivery, instanceId: "instance:migration", scheduledStartPeriod: schedule === "A" ? 2 : 3, durationPeriods: 3 },
    { ...independent, instanceId: "instance:integration", scheduledStartPeriod: schedule === "A" ? 3 : 4 },
    foundationB,
    deliveryB,
    foundationC,
  ];
  scenarioRaw.metadata = { displayName: "CP6 synthetic vertical conformance" }; mutation.scenario?.(scenarioRaw);
  const parsedScenario = parseScenarioMtcV1(scenarioRaw, contract); if (!parsedScenario.ok) throw new Error(JSON.stringify(parsedScenario.issues)); const scenario = parsedScenario.value;
  const bindingsRaw: Record<string, unknown> = { schemaVersion: "ce-two-layer-mtc-source-bindings-v1", scenarioIdentity: scenario.semanticIdentity, contractIdentity: contractSemanticIdentityMtcV1(contract), bindings: [{ bindingId: "binding:enablement-admitted", eventKind: "initiative-admitted", initiativeInstanceId: "instance:enablement", targetNodeId: "observation:origin" }] };
  mutation.bindings?.(bindingsRaw);
  const parsedBindings = parseObservationSourceBindingsMtcV1(bindingsRaw, scenario, contract); if (!parsedBindings.ok) throw new Error(JSON.stringify(parsedBindings.issues)); const bindings = parsedBindings.value;
  const execution = runLayer1MtcV1(scenario, contract); const sources = deriveObservationSourcesMtcV1(execution, scenario, contract, bindings);
  if (execution.status !== "completed-horizon") throw new Error(`Primary CP6 fixture did not complete: ${execution.status}`);
  const evaluation = evaluateObservationsMtcV1(sources, bindings, contract, { scenarioIdentity: scenario.semanticIdentity, ...scenario.horizon });
  const result = buildSingleRunResultMtcV1(execution, scenario, contract, { bindings, sources, evaluation });
  return { contract, scenario, bindings, execution, sources, evaluation, result };
}

export function verticalConformanceFixtureMtcV1(mutation: VerticalFixtureMutationMtcV1 = {}) {
  const A = createRun("A", mutation), B = createRun("B", mutation);
  const comparison = compareSingleRunsMtcV1({ result: A.result, scenario: A.scenario, contract: A.contract }, { result: B.result, scenario: B.scenario, contract: B.contract });
  return { A, B, comparison };
}
