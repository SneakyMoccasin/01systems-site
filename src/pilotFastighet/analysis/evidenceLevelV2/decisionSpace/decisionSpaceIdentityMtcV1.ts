import { canonicalJsonBytesMtcV1 } from "../canonical/canonicalJsonMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";
import { DECISION_SPACE_VERSION_MTC_V1, type DecisionSpaceSnapshotMtcV1 } from "./decisionSpaceMtcV1";

export function decisionSpaceSnapshotIdentityMtcV1(
  snapshot: Omit<DecisionSpaceSnapshotMtcV1, "snapshotIdentity"> | DecisionSpaceSnapshotMtcV1,
): string {
  const semantic = structuredClone(snapshot) as Record<string, unknown>;
  Reflect.deleteProperty(semantic, "snapshotIdentity");
  return hashCanonicalMtcV1("CE:TWO-LAYER-MTC:DECISION-SPACE", DECISION_SPACE_VERSION_MTC_V1, canonicalJsonBytesMtcV1(semantic));
}
