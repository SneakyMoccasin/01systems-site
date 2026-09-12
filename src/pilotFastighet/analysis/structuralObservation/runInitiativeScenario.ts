import type { ActionKey } from "../../actionEffects";
import type { DriverScoreState } from "../../driverScoreState";
import type { ExecutableDomainProfile } from "../../executableDomainProfile";
import type { ParameterKey } from "../../impactContract";
import {
  RealEstateEngine,
  type EngineState,
  type RiskState,
} from "../../RealEstateEngine";
import type { DisplayedPeriod } from "./contract";
import { executeInitiativeTransition } from "./executeInitiativeTransition";
import {
  createInitiativeExecutionProvenance,
  type InitiativeExecutionProvenanceV1,
  type InitiativeExecutionRecordV1,
} from "./initiativeExecutionProvenance";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type {
  ResolvedScenarioInitiativeSchedulesV1,
  ResolvedScheduledInitiativeV1,
} from "./resolveInitiativeSchedules";

export type InitiativeScenarioInitialStateV1 = Readonly<{
  initialRiskState: RiskState;
  initialDriverScores?: DriverScoreState;
}>;

export type InitiativeScenarioExecutionV1 = Readonly<{
  version: "initiative-scenario-execution-v1";
  scenario: ScheduleScenarioId;
  horizon: number;
  trajectory: readonly EngineState[];
  executionProvenance: InitiativeExecutionProvenanceV1;
}>;

type UnknownRecord = Record<string, unknown>;

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
  throw new Error(`Initiative scenario execution invariant failed: ${message}`);
}

function sameCanonicalDeltas(
  actual: ResolvedScheduledInitiativeV1["driverDeltas"],
  expected: Readonly<Partial<Record<ParameterKey, number>>>
): boolean {
  const actualEntries = Object.entries(actual).sort(([left], [right]) =>
    compareText(left, right)
  );
  const expectedEntries = Object.entries(expected).sort(([left], [right]) =>
    compareText(left, right)
  );
  return (
    actualEntries.length === expectedEntries.length &&
    actualEntries.every(
      ([driver, delta], index) =>
        driver === expectedEntries[index][0] && delta === expectedEntries[index][1]
    )
  );
}

function validateSchedule(
  scenario: ScheduleScenarioId,
  horizon: number,
  schedule: readonly ResolvedScheduledInitiativeV1[],
  profile: ExecutableDomainProfile
): void {
  const seen = new Set<string>();
  for (const initiative of schedule) {
    if (initiative.scenario !== scenario) {
      invariant(`scenario mismatch for ${initiative.initiativeId}`);
    }
    if (seen.has(initiative.initiativeId)) {
      invariant(`duplicate initiative ${initiative.initiativeId}`);
    }
    seen.add(initiative.initiativeId);
    if (
      !Number.isInteger(initiative.executionStep) ||
      initiative.executionStep < 1 ||
      initiative.executionStep > horizon
    ) {
      invariant(`execution period outside horizon for ${initiative.initiativeId}`);
    }
    const effectId = initiative.effectDefinitionId as string;
    if (!Object.prototype.hasOwnProperty.call(profile.actionEffects, effectId)) {
      invariant(`unknown effect definition ${effectId}`);
    }
    const canonical = profile.actionEffects[effectId as ActionKey];
    if (!sameCanonicalDeltas(initiative.driverDeltas, canonical)) {
      invariant(`non-canonical driver deltas for ${initiative.initiativeId}`);
    }
  }
}

/**
 * Runs one resolved initiative scenario over a complete horizon. The engine is
 * locally owned; a failed run discards it and all accumulated local traces.
 * The complete resolved A/B container is retained only so the canonical
 * provenance builder can verify initiative identity without fabrication.
 */
export function runInitiativeScenario(
  input: Readonly<{
    scenario: ScheduleScenarioId;
    resolvedSchedules: ResolvedScenarioInitiativeSchedulesV1;
    profile: ExecutableDomainProfile;
    initialState: InitiativeScenarioInitialStateV1;
    horizon: number;
  }>
): InitiativeScenarioExecutionV1 {
  const { scenario, resolvedSchedules, profile, initialState, horizon } = input;
  if (scenario !== "A" && scenario !== "B") invariant("scenario must be A or B");
  if (!Number.isInteger(horizon) || horizon < 1) invariant("horizon must be positive");
  if (resolvedSchedules.version !== "resolved-initiative-schedule-v1") {
    invariant("unsupported resolved schedule version");
  }
  const schedule = resolvedSchedules[scenario];
  if (!Array.isArray(schedule)) invariant(`scenario ${scenario} schedule must be an array`);
  validateSchedule(scenario, horizon, schedule, profile);

  const initialRiskState = structuredClone(initialState.initialRiskState);
  const initialDriverScores = initialState.initialDriverScores
    ? structuredClone(initialState.initialDriverScores)
    : undefined;
  const byPeriod = new Map<number, ResolvedScheduledInitiativeV1[]>();
  for (const initiative of [...schedule].sort(
    (left, right) =>
      left.executionStep - right.executionStep ||
      compareText(left.initiativeId, right.initiativeId)
  )) {
    const entries = byPeriod.get(initiative.executionStep) ?? [];
    entries.push(initiative);
    byPeriod.set(initiative.executionStep, entries);
  }

  const engine = new RealEstateEngine(
    initialRiskState,
    initialDriverScores,
    profile
  );
  const trajectory: EngineState[] = [];
  const executions: InitiativeExecutionRecordV1[] = [];

  for (let rawPeriod = 1; rawPeriod <= horizon; rawPeriod += 1) {
    const period = rawPeriod as DisplayedPeriod;
    const initiatives = byPeriod.get(rawPeriod) ?? [];
    if (initiatives.length > 0) {
      const trace = executeInitiativeTransition({
        engine,
        scenario,
        period,
        horizon,
        initiatives,
      });
      trajectory.push(structuredClone(trace.state));
      executions.push(...trace.executions);
    } else {
      engine.stepForward();
      trajectory.push(structuredClone(engine.getState()));
    }
  }

  const executionProvenance = createInitiativeExecutionProvenance({
    resolvedSchedules,
    provenance: {
      version: "initiative-execution-provenance-v1",
      entries: executions,
    },
  });

  return deepFreeze({
    version: "initiative-scenario-execution-v1",
    scenario,
    horizon,
    trajectory,
    executionProvenance,
  });
}
