export function minimalLayer1ContractMtcV1(): Record<string, unknown> {
  return {
    schemaVersion: "ce-two-layer-mtc-v1",
    semanticId: "contract:minimal-layer1",
    revision: 1,
    protocolVersion: "ce-two-layer-mtc-protocol-v1",
    limitsVersion: "ce-two-layer-mtc-limits-v1",
    evidence: [],
    layer1: {
      initiativeTypes: [{
        initiativeTypeId: "initiative:alpha",
        lifecycle: "pending-active-completed-v1",
        eligibilityRules: [],
      }],
      resources: [],
      constraints: [],
      entitlements: [],
    },
    layer2: {
      resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1",
      nodes: [],
      edges: [],
    },
  };
}

export function minimalTwoLayerContractMtcV1(): Record<string, unknown> {
  const contract = minimalLayer1ContractMtcV1();
  contract.semanticId = "contract:minimal-two-layer";
  contract.evidence = [{
    evidenceId: "evidence:alpha",
    basis: "synthetic",
    reference: "domain-neutral fixture evidence",
  }];
  contract.layer2 = {
    resultVocabularyVersion: "affected-exposed-unchanged-unknown-v1",
    nodes: [
      { nodeId: "observation:source", label: "Source" },
      { nodeId: "observation:middle", label: "Middle" },
      { nodeId: "observation:terminal", label: "Terminal" },
    ],
    edges: [
      {
        edgeId: "edge:source-middle",
        sourceNodeId: "observation:source",
        targetNodeId: "observation:middle",
        relationship: "directional-causal-observation",
        persistence: "none",
        evidence: { kind: "evidence-reference", evidenceId: "evidence:alpha" },
      },
      {
        edgeId: "edge:middle-terminal",
        sourceNodeId: "observation:middle",
        targetNodeId: "observation:terminal",
        relationship: "directional-causal-observation",
        persistence: "declared-persistent",
        evidence: { kind: "explicit-assumption", rationale: "Fixture assumption" },
      },
    ],
  };
  return contract;
}
