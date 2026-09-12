import type { DomainKey } from "../../../i18n/pulseLanguage";
import type {
  ExecutableDomainProfile,
  ExecutableIdentity,
  ExecutableProfileId,
} from "../../executableDomainProfile";
import type {
  CascadeAnalysisComparison,
  ScenarioAnalysisResult,
} from "../cascadeAnalysisProjection";
import type { ValidatedStructuralObservationContractV2 } from "./contractV2";
import type { ValidatedScenarioInitiativeSchedulesV1 } from "./initiativeScheduleContract";
import type { ResolvedScenarioInitiativeSchedulesV1 } from "./resolveInitiativeSchedules";
import type {
  InitiativeScenarioExecutionV1,
  InitiativeScenarioInitialStateV1,
} from "./runInitiativeScenario";

export type InitiativeScheduledAnalysisInputV1 = Readonly<{
  version: "initiative-scheduled-analysis-input-v1";
  executionMode: "initiative-schedule-v1";
  domainId: DomainKey;
  profileId: ExecutableProfileId;
  horizon: number;
  contract: unknown;
  schedules: unknown;
  initialState: InitiativeScenarioInitialStateV1;
}>;

export type InitiativeScheduledAnalysisResultV1 = Readonly<{
  version: "initiative-scheduled-analysis-v1";
  executionMode: "initiative-schedule-v1";
  executionIdentity: ExecutableIdentity;
  horizon: number;
  baseline: ScenarioAnalysisResult;
  scenarioA: InitiativeScenarioExecutionV1;
  scenarioB: InitiativeScenarioExecutionV1;
  comparison: CascadeAnalysisComparison;
}>;

declare const preparedInitiativeScheduledAnalysisV1: unique symbol;

/** @internal Prepared once so execution and observation share one context. */
export type PreparedInitiativeScheduledAnalysisV1 = Readonly<{
  preparationVersion: "initiative-scheduled-analysis-preparation-v1";
  profile: ExecutableDomainProfile;
  executionIdentity: ExecutableIdentity;
  horizon: number;
  initialState: InitiativeScenarioInitialStateV1;
  contract: ValidatedStructuralObservationContractV2;
  schedules: ValidatedScenarioInitiativeSchedulesV1;
  resolvedSchedules: ResolvedScenarioInitiativeSchedulesV1;
  readonly [preparedInitiativeScheduledAnalysisV1]: true;
}>;
