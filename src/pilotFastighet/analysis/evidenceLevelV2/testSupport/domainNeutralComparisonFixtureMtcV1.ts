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

export function comparisonRunFixtureMtcV1(options: Readonly<{
  foundationPeriod?: number; independentPeriod?: number;
  mutateContract?: (raw: Record<string, unknown>) => void;
  mutateScenario?: (raw: Record<string, unknown>) => void;
  mutateBindings?: (raw: Record<string, unknown>) => void;
}> = {}) {
  const rawContract = rawDecisionSpaceContractMtcV1();
  rawContract.evidence = [{ evidenceId: "evidence:sequence", basis: "synthetic", reference: "comparison fixture" }];
  rawContract.layer2 = { resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1", nodes: [{ nodeId: "observation:x" }, { nodeId: "observation:y" }], edges: [{ edgeId: "edge:x-y", sourceNodeId: "observation:x", targetNodeId: "observation:y", relationship: "directional-causal-observation", persistence: "declared-persistent", evidence: { kind: "evidence-reference", evidenceId: "evidence:sequence" } }] };
  options.mutateContract?.(rawContract);
  const parsedContract = parseContractMtcV1(rawContract); if (!parsedContract.ok) throw new Error(JSON.stringify(parsedContract.issues)); const contract = parsedContract.value;
  const rawScenario = domainNeutralScenarioMtcV1(contract); const rows = rawScenario.initiatives as Array<Record<string, unknown>>;
  rawScenario.initiatives = [rows[0], rows[3]]; (rawScenario.initiatives as Array<Record<string, unknown>>)[0].scheduledStartPeriod = options.foundationPeriod ?? 1; (rawScenario.initiatives as Array<Record<string, unknown>>)[1].scheduledStartPeriod = options.independentPeriod ?? 4;
  options.mutateScenario?.(rawScenario);
  const parsedScenario = parseScenarioMtcV1(rawScenario, contract); if (!parsedScenario.ok) throw new Error(JSON.stringify(parsedScenario.issues)); const scenario = parsedScenario.value;
  const rawBindings: Record<string, unknown> = { schemaVersion: "ce-two-layer-mtc-source-bindings-v1", scenarioIdentity: scenario.semanticIdentity, contractIdentity: contractSemanticIdentityMtcV1(contract), bindings: [{ bindingId: "binding:foundation-admitted", eventKind: "initiative-admitted", initiativeInstanceId: "instance:foundation", targetNodeId: "observation:x" }] };
  options.mutateBindings?.(rawBindings);
  const parsedBindings = parseObservationSourceBindingsMtcV1(rawBindings, scenario, contract); if (!parsedBindings.ok) throw new Error(JSON.stringify(parsedBindings.issues)); const bindings = parsedBindings.value;
  const execution = runLayer1MtcV1(scenario, contract); const sources = deriveObservationSourcesMtcV1(execution, scenario, contract, bindings);
  const evaluation = execution.status === "completed-horizon" ? evaluateObservationsMtcV1(sources, bindings, contract, { scenarioIdentity: scenario.semanticIdentity, ...scenario.horizon }) : undefined;
  const result = buildSingleRunResultMtcV1(execution, scenario, contract, evaluation ? { bindings, sources, evaluation } : undefined);
  return { result, scenario, contract, sourceBindings: bindings };
}
