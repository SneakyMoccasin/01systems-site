import {
  buildInitiativeDecisionSpaceSnapshots,
  type StructuralObservationResultV2,
} from "./buildInitiativeDecisionSpaceSnapshots";
import {
  buildInitiativeStructuralObservationFingerprints,
} from "./initiativeStructuralObservationFingerprints";
import {
  createInitiativeStructuralObservationIdentity,
  type InitiativeStructuralObservationIdentity,
} from "./initiativeStructuralObservationIdentity";
import type {
  InitiativeScheduledAnalysisResultV1,
  PreparedInitiativeScheduledAnalysisV1,
} from "./initiativeScheduledAnalysisContract";
import { freezeObservationValue } from "./observationPlanCore";
import { prepareInitiativeStructuralObservationRun } from "./prepareInitiativeStructuralObservationRun";

export type CompletedInitiativeStructuralObservation = Readonly<{
  result: StructuralObservationResultV2;
  identity: InitiativeStructuralObservationIdentity;
}>;

export async function observeCompletedInitiativeStructuralAnalysis(input: Readonly<{
  preparedAnalysis: PreparedInitiativeScheduledAnalysisV1;
  analysisResult: InitiativeScheduledAnalysisResultV1;
}>): Promise<CompletedInitiativeStructuralObservation> {
  const prepared = prepareInitiativeStructuralObservationRun(input);
  const result = buildInitiativeDecisionSpaceSnapshots(prepared);
  const fingerprints = await buildInitiativeStructuralObservationFingerprints(prepared);
  const identity = createInitiativeStructuralObservationIdentity({
    fingerprints,
    horizon: prepared.horizon,
  });

  return freezeObservationValue({ result, identity });
}
