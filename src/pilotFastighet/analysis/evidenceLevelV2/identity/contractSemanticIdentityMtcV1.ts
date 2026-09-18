import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { canonicalizeSemanticSetMtcV1 } from "../canonical/canonicalOrderMtcV1";
import type { TwoLayerMtcContractV1 } from "../contract/contractMtcV1";
import { hashCanonicalMtcV1 } from "./hashCanonicalMtcV1";

export function projectContractSemanticsMtcV1(contract: TwoLayerMtcContractV1): unknown {
  return {
    schemaVersion: contract.schemaVersion,
    semanticId: contract.semanticId,
    revision: contract.revision,
    protocolVersion: contract.protocolVersion,
    limitsVersion: contract.limitsVersion,
    evidence: canonicalizeSemanticSetMtcV1(contract.evidence, (item) => item.evidenceId),
    layer1: {
      initiativeTypes: canonicalizeSemanticSetMtcV1(
        contract.layer1.initiativeTypes.map((initiative) => ({
          initiativeTypeId: initiative.initiativeTypeId,
          lifecycle: initiative.lifecycle,
          eligibilityRules: canonicalizeSemanticSetMtcV1(
            initiative.eligibilityRules,
            (rule) => rule.ruleId,
          ),
        })),
        (item) => item.initiativeTypeId,
      ),
      resources: canonicalizeSemanticSetMtcV1(
        contract.layer1.resources,
        (item) => item.resourceId,
      ),
      constraints: canonicalizeSemanticSetMtcV1(
        contract.layer1.constraints,
        (item) => item.constraintId,
      ),
      entitlements: canonicalizeSemanticSetMtcV1(
        contract.layer1.entitlements,
        (item) => item.entitlementId,
      ),
    },
    layer2: {
      resultVocabularyVersion: contract.layer2.resultVocabularyVersion,
      nodes: canonicalizeSemanticSetMtcV1(
        contract.layer2.nodes.map(({ nodeId }) => ({ nodeId })),
        (item) => item.nodeId,
      ),
      edges: canonicalizeSemanticSetMtcV1(contract.layer2.edges, (item) => item.edgeId),
    },
  };
}

export function contractSemanticIdentityMtcV1(contract: TwoLayerMtcContractV1): string {
  return hashCanonicalMtcV1(
    "CE:TWO-LAYER-MTC:CONTRACT",
    contract.schemaVersion,
    canonicalJsonBytesMtcV1(projectContractSemanticsMtcV1(contract)),
  );
}
