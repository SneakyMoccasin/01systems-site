import type {
  DriverDeltas,
  EngineState,
  RealEstateEngine,
} from "../../RealEstateEngine";
import type { DisplayedPeriod } from "./contract";
import type { InitiativeExecutionRecordV1 } from "./initiativeExecutionProvenance";
import type { ScheduleScenarioId } from "./initiativeScheduleContract";
import type { ResolvedScheduledInitiativeV1 } from "./resolveInitiativeSchedules";
import { combineCanonicalDriverDeltaBatch } from "../canonicalDriverDeltaBatch";

export type InitiativeTransitionEngine = Pick<
  RealEstateEngine,
  "applyDriverDeltas" | "getState" | "stepForward"
>;

export type InitiativeTransitionTraceV1 = Readonly<{
  scenario: ScheduleScenarioId;
  actualExecutionPeriod: DisplayedPeriod;
  state: EngineState;
  executions: readonly InitiativeExecutionRecordV1[];
}>;

type UnknownRecord = Record<string, unknown>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) deepFreeze(nested);
  }
  return value;
}

function invariant(message: string): never {
  throw new Error(`Initiative transition invariant failed: ${message}`);
}

/**
 * Executes one already-resolved initiative period. A future runner must own
 * and discard its engine instance if either engine operation throws.
 */
export function executeInitiativeTransition(
  input: Readonly<{
    engine: InitiativeTransitionEngine;
    scenario: ScheduleScenarioId;
    period: DisplayedPeriod;
    horizon: number;
    initiatives: readonly ResolvedScheduledInitiativeV1[];
  }>
): InitiativeTransitionTraceV1 {
  const { engine, scenario, period, horizon, initiatives } = input;
  if (scenario !== "A" && scenario !== "B") invariant("scenario must be A or B");
  if (!Number.isInteger(horizon) || horizon < 1) invariant("horizon must be positive");
  if (!Number.isInteger(period) || period < 1 || period > horizon) {
    invariant("period must be within horizon");
  }
  if (engine.getState().step + 1 !== period) {
    invariant("period must be the engine's expected next step");
  }
  if (initiatives.length === 0) invariant("period must contain an initiative");

  const seen = new Set<string>();
  for (const initiative of initiatives) {
    if (initiative.scenario !== scenario) {
      invariant(`scenario mismatch for ${initiative.initiativeId}`);
    }
    if (initiative.executionStep !== period) {
      invariant(`execution period mismatch for ${initiative.initiativeId}`);
    }
    if (seen.has(initiative.initiativeId)) {
      invariant(`duplicate initiative ${initiative.initiativeId}`);
    }
    seen.add(initiative.initiativeId);
  }

  const batch = combineCanonicalDriverDeltaBatch(
    initiatives.map((initiative) => ({
      effectIdentity: initiative.effectDefinitionId,
      instanceIdentity: initiative.initiativeId,
      driverDeltas: initiative.driverDeltas,
    }))
  );

  engine.applyDriverDeltas(batch);
  engine.stepForward();

  const executions = [...initiatives]
    .sort((left, right) =>
      left.initiativeId < right.initiativeId
        ? -1
        : left.initiativeId > right.initiativeId
          ? 1
          : 0
    )
    .map<InitiativeExecutionRecordV1>((initiative) => ({
      scenario,
      initiativeId: initiative.initiativeId,
      effectDefinitionId: initiative.effectDefinitionId,
      scheduledExecutionPeriod: initiative.executionStep,
      actualExecutionPeriod: period,
      appliedDriverDeltas: structuredClone(initiative.driverDeltas) as DriverDeltas,
    }));

  return deepFreeze({
    scenario,
    actualExecutionPeriod: period,
    state: structuredClone(engine.getState()),
    executions,
  });
}
