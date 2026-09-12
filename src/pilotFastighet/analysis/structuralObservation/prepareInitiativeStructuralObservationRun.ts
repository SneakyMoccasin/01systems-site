import type { ConstraintType } from "../../constraintState";
import type { ExecutableIdentity } from "../../executableDomainProfile";
import { constraintSourceStepToDisplayedPeriod } from "../periodPresentation";
import type { DisplayedPeriod, InitiativeId } from "./contract";
import type {
  EffectDefinitionId,
  ValidatedStructuralObservationContractV2,
} from "./contractV2";
import type {
  ScheduleScenarioId,
  ValidatedScenarioInitiativeSchedulesV1,
} from "./initiativeScheduleContract";
import type { InitiativeExecutionRecordV1 } from "./initiativeExecutionProvenance";
import type {
  InitiativeScheduledAnalysisResultV1,
  PreparedInitiativeScheduledAnalysisV1,
} from "./initiativeScheduledAnalysisContract";
import type { ResolvedScenarioInitiativeSchedulesV1 } from "./resolveInitiativeSchedules";
import type { InitiativeScenarioExecutionV1 } from "./runInitiativeScenario";
import type {
  PreparedActiveConstraintContext,
  PreparedEngineContext,
  StructuralObservationPhase,
} from "./prepareStructuralObservationRun";

export type StructuralInitiativeExecutionEvidenceV1 = Readonly<{
  scenario: ScheduleScenarioId;
  initiativeId: InitiativeId;
  effectDefinitionId: EffectDefinitionId;
  scheduledExecutionPeriod: DisplayedPeriod;
  actualExecutionPeriod: DisplayedPeriod;
}>;

export type PreparedInitiativeObservationFrameV2 = Readonly<{
  scenario: ScheduleScenarioId;
  period: DisplayedPeriod;
  phase: StructuralObservationPhase;
  visibleExecutionEvidence: readonly StructuralInitiativeExecutionEvidenceV1[];
  engineContext: PreparedEngineContext | null;
}>;

export type PreparedInitiativeObservationScenarioV2 = Readonly<{
  scenario: ScheduleScenarioId;
  frames: readonly PreparedInitiativeObservationFrameV2[];
}>;

export type PreparedInitiativeStructuralObservationRunV2 = Readonly<{
  preparationVersion: "structural-observation-preparation-v2";
  contract: ValidatedStructuralObservationContractV2;
  schedules: ValidatedScenarioInitiativeSchedulesV1;
  resolvedSchedules: ResolvedScenarioInitiativeSchedulesV1;
  executionIdentity: ExecutableIdentity;
  horizon: number;
  scenarios: Readonly<{
    A: PreparedInitiativeObservationScenarioV2;
    B: PreparedInitiativeObservationScenarioV2;
  }>;
}>;

type UnknownRecord = Record<string, unknown>;
type InitiativeTrajectoryState = InitiativeScenarioExecutionV1["trajectory"][number];

const SCENARIOS = ["A", "B"] as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) deepFreeze(nested);
  }
  return value;
}

function invariant(message: string): never {
  throw new Error(`Initiative structural observation preparation invariant failed: ${message}`);
}

function sameIdentity(left: ExecutableIdentity, right: ExecutableIdentity): boolean {
  return (
    left.domainId === right.domainId &&
    left.profileId === right.profileId &&
    left.modelVersion === right.modelVersion &&
    left.calibrationVersion === right.calibrationVersion
  );
}

function assertPreparedContext(
  prepared: PreparedInitiativeScheduledAnalysisV1,
  result: InitiativeScheduledAnalysisResultV1
): void {
  if (
    prepared.preparationVersion !==
    "initiative-scheduled-analysis-preparation-v1"
  ) {
    invariant("unsupported prepared analysis version");
  }
  if (result.version !== "initiative-scheduled-analysis-v1") {
    invariant("unsupported analysis result version");
  }
  if (result.executionMode !== "initiative-schedule-v1") {
    invariant("unsupported analysis execution mode");
  }
  if (!Number.isInteger(prepared.horizon) || prepared.horizon < 1) {
    invariant("prepared horizon must be a positive integer");
  }
  if (result.horizon !== prepared.horizon) {
    invariant("analysis horizon does not match prepared horizon");
  }
  if (!sameIdentity(prepared.executionIdentity, result.executionIdentity)) {
    invariant("analysis execution identity does not match prepared identity");
  }
}

function assertResolvedInputs(
  prepared: PreparedInitiativeScheduledAnalysisV1
): void {
  if (prepared.contract.version !== "structural-observation-v2") {
    invariant("unsupported contract version");
  }
  if (
    prepared.schedules.version !== "initiative-schedule-v1" ||
    prepared.schedules.comparisonPolicy !== "same-initiative-set"
  ) {
    invariant("unsupported initiative schedule contract");
  }
  if (prepared.resolvedSchedules.version !== "resolved-initiative-schedule-v1") {
    invariant("unsupported resolved schedule version");
  }

  const definitionById = new Map(
    prepared.contract.initiatives.map((definition) => [definition.id, definition])
  );
  for (const scenario of SCENARIOS) {
    const validated = prepared.schedules[scenario];
    const resolved = prepared.resolvedSchedules[scenario];
    if (validated.length !== resolved.length) {
      invariant(`resolved scenario ${scenario} length does not match validated schedule`);
    }
    const validatedById = new Map(
      validated.map((entry) => [entry.initiativeId, entry])
    );
    for (const entry of resolved) {
      const scheduled = validatedById.get(entry.initiativeId);
      const definition = definitionById.get(entry.initiativeId);
      if (!scheduled) {
        invariant(`resolved initiative ${entry.initiativeId} is not scheduled in scenario ${scenario}`);
      }
      if (!definition) {
        invariant(`resolved initiative ${entry.initiativeId} is not defined`);
      }
      if (entry.scenario !== scenario) {
        invariant(`resolved initiative ${entry.initiativeId} has wrong scenario`);
      }
      if (entry.executionStep !== scheduled.executionStep) {
        invariant(`resolved initiative ${entry.initiativeId} has wrong scheduled period`);
      }
      if (entry.effectDefinitionId !== definition.effectDefinitionId) {
        invariant(`resolved initiative ${entry.initiativeId} has wrong effect definition`);
      }
    }
  }
}

function assertTrajectory(
  scenario: ScheduleScenarioId,
  trajectory: readonly InitiativeTrajectoryState[],
  horizon: number
): void {
  if (trajectory.length !== horizon) {
    invariant(`scenario ${scenario} trajectory length must equal horizon`);
  }
  trajectory.forEach((state, index) => {
    if (state.step !== index + 1) {
      invariant(`scenario ${scenario} trajectory has contradictory step at M${index + 1}`);
    }
    if (!Number.isFinite(state.margin)) {
      invariant(`scenario ${scenario} trajectory has non-finite margin at M${index + 1}`);
    }
  });
}

function projectEvidence(
  scenario: ScheduleScenarioId,
  provenance: readonly InitiativeExecutionRecordV1[],
  prepared: PreparedInitiativeScheduledAnalysisV1
): StructuralInitiativeExecutionEvidenceV1[] {
  const resolvedById = new Map(
    prepared.resolvedSchedules[scenario].map((entry) => [entry.initiativeId, entry])
  );
  if (provenance.length !== resolvedById.size) {
    invariant(`scenario ${scenario} provenance does not cover every planned initiative`);
  }
  const seen = new Set<string>();
  const evidence = provenance.map((execution) => {
    if (execution.scenario !== scenario) {
      invariant(`scenario ${scenario} contains provenance for ${execution.scenario}`);
    }
    const initiativeId = execution.initiativeId as string;
    if (seen.has(initiativeId)) {
      invariant(`scenario ${scenario} contains duplicate provenance for ${initiativeId}`);
    }
    seen.add(initiativeId);
    const resolved = resolvedById.get(execution.initiativeId);
    if (!resolved) {
      invariant(`scenario ${scenario} contains provenance for unplanned initiative ${initiativeId}`);
    }
    if (execution.effectDefinitionId !== resolved.effectDefinitionId) {
      invariant(`scenario ${scenario} provenance effect mismatch for ${initiativeId}`);
    }
    if (execution.scheduledExecutionPeriod !== resolved.executionStep) {
      invariant(`scenario ${scenario} provenance schedule mismatch for ${initiativeId}`);
    }
    if (
      !Number.isInteger(execution.actualExecutionPeriod) ||
      execution.actualExecutionPeriod < 1 ||
      execution.actualExecutionPeriod > prepared.horizon
    ) {
      invariant(`scenario ${scenario} provenance actual period outside horizon for ${initiativeId}`);
    }
    return {
      scenario,
      initiativeId: execution.initiativeId,
      effectDefinitionId: execution.effectDefinitionId,
      scheduledExecutionPeriod: execution.scheduledExecutionPeriod,
      actualExecutionPeriod: execution.actualExecutionPeriod,
    };
  });
  evidence.sort(
    (left, right) =>
      left.actualExecutionPeriod - right.actualExecutionPeriod ||
      left.scheduledExecutionPeriod - right.scheduledExecutionPeriod ||
      compareText(left.initiativeId, right.initiativeId)
  );
  return evidence;
}

function projectEngineContext(state: InitiativeTrajectoryState): PreparedEngineContext {
  const activeConstraints = Object.values(state.registry)
    .filter((constraint) => constraint.lifecycle === "ACTIVE")
    .map((constraint): PreparedActiveConstraintContext => {
      const activatedAtSourceStep = Number.isInteger(constraint.activatedAtStep)
        ? (constraint.activatedAtStep as number)
        : null;
      return {
        type: constraint.type as ConstraintType,
        lifecycle: "ACTIVE",
        activatedAtSourceStep,
        activatedAtDisplayedPeriod:
          activatedAtSourceStep === null
            ? null
            : (constraintSourceStepToDisplayedPeriod(
                activatedAtSourceStep
              ) as DisplayedPeriod),
        lastUpdatedSourceStep: constraint.lastUpdatedStep,
      };
    });
  activeConstraints.sort((left, right) => compareText(left.type, right.type));
  return {
    engineStateStep: state.step,
    structuralMargin: state.margin,
    activeConstraints,
  };
}

function buildScenario(
  scenario: ScheduleScenarioId,
  trajectory: readonly InitiativeTrajectoryState[],
  provenance: readonly InitiativeExecutionRecordV1[],
  prepared: PreparedInitiativeScheduledAnalysisV1
): PreparedInitiativeObservationScenarioV2 {
  assertTrajectory(scenario, trajectory, prepared.horizon);
  const evidence = projectEvidence(scenario, provenance, prepared);
  const frames: PreparedInitiativeObservationFrameV2[] = [];
  for (let numericPeriod = 1; numericPeriod <= prepared.horizon; numericPeriod += 1) {
    const period = numericPeriod as DisplayedPeriod;
    frames.push({
      scenario,
      period,
      phase: "before-execution",
      visibleExecutionEvidence: evidence.filter(
        (entry) => entry.actualExecutionPeriod < period
      ),
      engineContext:
        numericPeriod === 1
          ? null
          : projectEngineContext(trajectory[numericPeriod - 2]),
    });
    frames.push({
      scenario,
      period,
      phase: "after-transition",
      visibleExecutionEvidence: evidence.filter(
        (entry) => entry.actualExecutionPeriod <= period
      ),
      engineContext: projectEngineContext(trajectory[numericPeriod - 1]),
    });
  }
  return { scenario, frames };
}

export function prepareInitiativeStructuralObservationRun(input: Readonly<{
  preparedAnalysis: PreparedInitiativeScheduledAnalysisV1;
  analysisResult: InitiativeScheduledAnalysisResultV1;
}>): PreparedInitiativeStructuralObservationRunV2 {
  assertPreparedContext(input.preparedAnalysis, input.analysisResult);
  assertResolvedInputs(input.preparedAnalysis);
  const scenarioA = input.analysisResult.scenarioA;
  const scenarioB = input.analysisResult.scenarioB;
  if (scenarioA.version !== "initiative-scenario-execution-v1" || scenarioA.scenario !== "A") {
    invariant("scenario A result identity is invalid");
  }
  if (scenarioB.version !== "initiative-scenario-execution-v1" || scenarioB.scenario !== "B") {
    invariant("scenario B result identity is invalid");
  }
  if (scenarioA.horizon !== input.preparedAnalysis.horizon || scenarioB.horizon !== input.preparedAnalysis.horizon) {
    invariant("scenario result horizon does not match prepared horizon");
  }

  const prepared = {
    preparationVersion: "structural-observation-preparation-v2" as const,
    contract: structuredClone(input.preparedAnalysis.contract),
    schedules: structuredClone(input.preparedAnalysis.schedules),
    resolvedSchedules: structuredClone(input.preparedAnalysis.resolvedSchedules),
    executionIdentity: structuredClone(input.preparedAnalysis.executionIdentity),
    horizon: input.preparedAnalysis.horizon,
    scenarios: {
      A: buildScenario(
        "A",
        scenarioA.trajectory,
        scenarioA.executionProvenance.entries,
        input.preparedAnalysis
      ),
      B: buildScenario(
        "B",
        scenarioB.trajectory,
        scenarioB.executionProvenance.entries,
        input.preparedAnalysis
      ),
    },
  } satisfies PreparedInitiativeStructuralObservationRunV2;
  return deepFreeze(prepared);
}
