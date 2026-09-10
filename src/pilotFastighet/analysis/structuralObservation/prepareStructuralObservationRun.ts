import type { ConstraintType } from "../../constraintState";
import type {
  ExecutableDomainProfile,
  ExecutableIdentity,
} from "../../executableDomainProfile";
import type { EngineState } from "../../RealEstateEngine";
import {
  constraintSourceStepToDisplayedPeriod,
  executionStepToDisplayedPeriod,
} from "../periodPresentation";
import type {
  ReactAnalysisBoundaryResult,
  ScenarioExecutionProvenance,
  ScenarioSchedules,
  ScheduleScenarioId,
} from "../reactScheduledAnalysisBoundary";
import type { ScheduledActionExecution } from "../runCascadeAnalysis";
import type {
  DisplayedPeriod,
  StructuralObservationContractV1,
  ValidatedStructuralObservationContractV1,
} from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import {
  resolveStructuralScenarioPlans,
  type ResolvedStructuralScenarioPlan,
  type ResolvedStructuralScenarioPlans,
} from "./resolveScenarioPlans";
import {
  validateAndNormalizeStructuralObservationContract,
  type StructuralObservationValidationIssue,
} from "./validation";

export type StructuralObservationPhase =
  | "before-execution"
  | "after-transition";

export type PreparedActiveConstraintContext = Readonly<{
  type: ConstraintType;
  lifecycle: "ACTIVE";
  activatedAtSourceStep: number | null;
  activatedAtDisplayedPeriod: DisplayedPeriod | null;
  lastUpdatedSourceStep: number;
}>;

export type PreparedEngineContext = Readonly<{
  engineStateStep: number;
  structuralMargin: number;
  activeConstraints: readonly PreparedActiveConstraintContext[];
}>;

export type PreparedStructuralObservationFrame = Readonly<{
  scenario: ScheduleScenarioId;
  period: DisplayedPeriod;
  phase: StructuralObservationPhase;
  scenarioPlan: ResolvedStructuralScenarioPlan;
  visibleExecutionEvidence: readonly StructuralExecutionEvidence[];
  engineContext: PreparedEngineContext | null;
}>;

export type PreparedStructuralObservationRun = Readonly<{
  preparationVersion: "structural-observation-preparation-v1";
  contract: ValidatedStructuralObservationContractV1;
  profileIdentity: ExecutableIdentity;
  horizon: number;
  scenarioPlans: ResolvedStructuralScenarioPlans;
  frames: Readonly<{
    A: readonly PreparedStructuralObservationFrame[];
    B: readonly PreparedStructuralObservationFrame[];
  }>;
}>;

export class StructuralObservationPreparationError extends Error {
  readonly issues: readonly StructuralObservationValidationIssue[];

  constructor(issues: readonly StructuralObservationValidationIssue[]) {
    super("Structural observation contract failed validation.");
    this.name = "StructuralObservationPreparationError";
    this.issues = issues.map((issue) => ({ ...issue }));
  }
}

const SCENARIOS = ["A", "B"] as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function toExecutionScenarioId(
  scenario: ScheduleScenarioId
): ScheduledActionExecution["scenario"] {
  if (scenario === "A") return "scenarioA";
  if (scenario === "B") return "scenarioB";
  throw new Error(`Structural observation invariant failed: unknown scenario ${String(scenario)}.`);
}

export function toScheduleScenarioId(
  scenario: ScheduledActionExecution["scenario"]
): ScheduleScenarioId {
  if (scenario === "scenarioA") return "A";
  if (scenario === "scenarioB") return "B";
  throw new Error(
    `Structural observation invariant failed: unknown execution scenario ${String(scenario)}.`
  );
}

function profileIdentity(profile: ExecutableDomainProfile): ExecutableIdentity {
  return {
    domainId: profile.domainId,
    profileId: profile.profileId,
    modelVersion: profile.modelVersion,
    calibrationVersion: profile.calibrationVersion,
  };
}

function assertMatchingProfile(
  profile: ExecutableDomainProfile,
  resultIdentity: ExecutableIdentity
): void {
  const expected = profileIdentity(profile);
  for (const key of [
    "domainId",
    "profileId",
    "modelVersion",
    "calibrationVersion",
  ] as const) {
    if (expected[key] !== resultIdentity[key]) {
      throw new Error(
        `Structural observation invariant failed: execution profile ${key} does not match.`
      );
    }
  }
}

function assertTrajectory(
  name: "scenarioA" | "scenarioB" | "baseline",
  trajectory: readonly EngineState[],
  horizon: number
): void {
  if (trajectory.length !== horizon) {
    throw new Error(
      `Structural observation invariant failed: ${name} trajectory length must equal horizon.`
    );
  }
  trajectory.forEach((state, index) => {
    const period = index + 1;
    if (state.step !== period) {
      throw new Error(
        `Structural observation invariant failed: ${name} trajectory M${period} has step ${state.step}.`
      );
    }
    if (!Number.isFinite(state.margin)) {
      throw new Error(
        `Structural observation invariant failed: ${name} trajectory M${period} has a non-finite margin.`
      );
    }
  });
}

function assertProvenance(
  provenance: ScenarioExecutionProvenance,
  schedules: ScenarioSchedules,
  horizon: number
): void {
  for (const scenario of SCENARIOS) {
    const expectedExecutionScenario = toExecutionScenarioId(scenario);
    const scheduleByAction = new Map(
      schedules[scenario].map((entry) => [entry.actionId, entry.executionStep])
    );
    const seen = new Set<string>();
    for (const execution of provenance[scenario]) {
      if (execution.scenario !== expectedExecutionScenario) {
        throw new Error(
          `Structural observation invariant failed: scenario ${scenario} contains provenance for ${execution.scenario}.`
        );
      }
      if (seen.has(execution.actionId)) {
        throw new Error(
          `Structural observation invariant failed: scenario ${scenario} contains duplicate provenance for ${execution.actionId}.`
        );
      }
      seen.add(execution.actionId);
      if (
        !Number.isInteger(execution.scheduledStep) ||
        execution.scheduledStep < 1 ||
        execution.scheduledStep > horizon ||
        !Number.isInteger(execution.actualExecutionStep) ||
        execution.actualExecutionStep < 1 ||
        execution.actualExecutionStep > horizon
      ) {
        throw new Error(
          `Structural observation invariant failed: ${execution.actionId} has execution timing outside the horizon.`
        );
      }
      if (scheduleByAction.get(execution.actionId) !== execution.scheduledStep) {
        throw new Error(
          `Structural observation invariant failed: ${execution.actionId} provenance does not match its canonical schedule.`
        );
      }
    }
  }
}

function executionIdentity(execution: ScheduledActionExecution): string {
  return [
    execution.scenario,
    execution.actualExecutionStep,
    execution.scheduledStep,
    execution.actionId,
  ].join("\u0000");
}

function assertCombinedProvenanceMatches(
  combined: readonly ScheduledActionExecution[],
  split: ScenarioExecutionProvenance
): void {
  const combinedIdentities = combined.map(executionIdentity).sort(compareText);
  const splitIdentities = [...split.A, ...split.B]
    .map(executionIdentity)
    .sort(compareText);
  if (
    combinedIdentities.length !== splitIdentities.length ||
    combinedIdentities.some(
      (identity, index) => identity !== splitIdentities[index]
    )
  ) {
    throw new Error(
      "Structural observation invariant failed: split provenance does not match the scheduled analysis result."
    );
  }
}

function projectEvidence(
  provenance: readonly ScheduledActionExecution[],
  period: DisplayedPeriod,
  phase: StructuralObservationPhase
): StructuralExecutionEvidence[] {
  const visible = provenance
    .filter((execution) =>
      phase === "before-execution"
        ? execution.actualExecutionStep < period
        : execution.actualExecutionStep <= period
    )
    .map((execution) => ({
      scenario: toScheduleScenarioId(execution.scenario),
      actionKey: execution.actionId,
      scheduledExecutionPeriod: executionStepToDisplayedPeriod(
        execution.scheduledStep
      ) as DisplayedPeriod,
      actualExecutionPeriod: executionStepToDisplayedPeriod(
        execution.actualExecutionStep
      ) as DisplayedPeriod,
    }));
  visible.sort(
    (left, right) =>
      left.actualExecutionPeriod - right.actualExecutionPeriod ||
      left.scheduledExecutionPeriod - right.scheduledExecutionPeriod ||
      compareText(left.actionKey, right.actionKey)
  );
  return visible;
}

function projectEngineContext(state: EngineState): PreparedEngineContext {
  const activeConstraints = Object.values(state.registry)
    .filter((constraint) => constraint.lifecycle === "ACTIVE")
    .map((constraint): PreparedActiveConstraintContext => {
      const activatedAtSourceStep = Number.isInteger(constraint.activatedAtStep)
        ? (constraint.activatedAtStep as number)
        : null;
      return {
        type: constraint.type,
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

function buildFrames(input: Readonly<{
  scenario: ScheduleScenarioId;
  scenarioPlan: ResolvedStructuralScenarioPlan;
  provenance: readonly ScheduledActionExecution[];
  trajectory: readonly EngineState[];
  horizon: number;
}>): PreparedStructuralObservationFrame[] {
  const frames: PreparedStructuralObservationFrame[] = [];
  for (let numericPeriod = 1; numericPeriod <= input.horizon; numericPeriod += 1) {
    const period = numericPeriod as DisplayedPeriod;
    frames.push({
      scenario: input.scenario,
      period,
      phase: "before-execution",
      scenarioPlan: input.scenarioPlan,
      visibleExecutionEvidence: projectEvidence(
        input.provenance,
        period,
        "before-execution"
      ),
      engineContext:
        numericPeriod === 1
          ? null
          : projectEngineContext(input.trajectory[numericPeriod - 2]),
    });
    frames.push({
      scenario: input.scenario,
      period,
      phase: "after-transition",
      scenarioPlan: input.scenarioPlan,
      visibleExecutionEvidence: projectEvidence(
        input.provenance,
        period,
        "after-transition"
      ),
      engineContext: projectEngineContext(input.trajectory[numericPeriod - 1]),
    });
  }
  return frames;
}

export function prepareStructuralObservationRun(input: Readonly<{
  contract: StructuralObservationContractV1 | unknown;
  profile: ExecutableDomainProfile;
  schedules: ScenarioSchedules;
  horizon: number;
  analysisResult: ReactAnalysisBoundaryResult;
}>): PreparedStructuralObservationRun {
  if (!Number.isInteger(input.horizon) || input.horizon < 1) {
    throw new Error(
      "Structural observation invariant failed: horizon must be a positive integer."
    );
  }
  assertMatchingProfile(input.profile, input.analysisResult.executionProfile);
  if (!("executionProvenance" in input.analysisResult.analysis)) {
    throw new Error(
      "Structural observation invariant failed: analysis result must come from scheduled execution."
    );
  }
  assertTrajectory(
    "scenarioA",
    input.analysisResult.analysis.scenarioA.trajectory,
    input.horizon
  );
  assertTrajectory(
    "scenarioB",
    input.analysisResult.analysis.scenarioB.trajectory,
    input.horizon
  );
  assertTrajectory(
    "baseline",
    input.analysisResult.analysis.baseline.trajectory,
    input.horizon
  );
  assertProvenance(input.analysisResult.provenance, input.schedules, input.horizon);
  assertCombinedProvenanceMatches(
    input.analysisResult.analysis.executionProvenance,
    input.analysisResult.provenance
  );

  const validation = validateAndNormalizeStructuralObservationContract({
    contract: input.contract,
    profile: input.profile,
    schedules: input.schedules,
    horizon: input.horizon,
  });
  if (!validation.valid) {
    throw new StructuralObservationPreparationError(validation.issues);
  }
  const scenarioPlans = resolveStructuralScenarioPlans({
    contract: validation.value,
    schedules: input.schedules,
  });
  const frames = {
    A: buildFrames({
      scenario: "A",
      scenarioPlan: scenarioPlans.A,
      provenance: input.analysisResult.provenance.A,
      trajectory: input.analysisResult.analysis.scenarioA.trajectory,
      horizon: input.horizon,
    }),
    B: buildFrames({
      scenario: "B",
      scenarioPlan: scenarioPlans.B,
      provenance: input.analysisResult.provenance.B,
      trajectory: input.analysisResult.analysis.scenarioB.trajectory,
      horizon: input.horizon,
    }),
  };

  return deepFreeze({
    preparationVersion: "structural-observation-preparation-v1",
    contract: validation.value,
    profileIdentity: profileIdentity(input.profile),
    horizon: input.horizon,
    scenarioPlans,
    frames,
  } satisfies PreparedStructuralObservationRun);
}
