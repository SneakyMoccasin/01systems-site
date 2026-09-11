import type { ExecutableDomainProfile } from "../../executableDomainProfile";
import type {
  ReactAnalysisBoundaryResult,
  ScenarioSchedules,
} from "../reactScheduledAnalysisBoundary";
import {
  buildDecisionSpaceSnapshots,
  type StructuralObservationResult,
} from "./buildDecisionSpaceSnapshots";
import {
  prepareStructuralObservationRun,
} from "./prepareStructuralObservationRun";
import {
  buildStructuralObservationFingerprints,
} from "./structuralObservationFingerprints";
import {
  createStructuralObservationIdentity,
  type StructuralObservationIdentity,
} from "./structuralObservationIdentity";

export type CompletedStructuralObservation = Readonly<{
  result: StructuralObservationResult;
  identity: StructuralObservationIdentity;
}>;

export async function observeCompletedStructuralAnalysis(input: Readonly<{
  contract?: unknown;
  profile: ExecutableDomainProfile;
  schedules: ScenarioSchedules;
  horizon: number;
  analysisResult: ReactAnalysisBoundaryResult;
}>): Promise<CompletedStructuralObservation | null> {
  if (input.contract === undefined) return null;

  const prepared = prepareStructuralObservationRun({
    contract: input.contract,
    profile: input.profile,
    schedules: input.schedules,
    horizon: input.horizon,
    analysisResult: input.analysisResult,
  });
  const result = buildDecisionSpaceSnapshots(prepared);
  const fingerprints = await buildStructuralObservationFingerprints(prepared);
  const identity = createStructuralObservationIdentity({
    fingerprints,
    horizon: prepared.horizon,
  });

  return Object.freeze({ result, identity });
}
