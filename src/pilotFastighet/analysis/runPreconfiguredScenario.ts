import {
  RealEstateEngine,
  type EngineState,
} from "../RealEstateEngine";
import type { ExecutableDomainProfile } from "../executableDomainProfile";
import type {
  PreconfiguredScenarioInput,
  ScenarioAnalysisResult,
} from "./runCascadeAnalysis";

export function runPreconfiguredScenario(
  input: PreconfiguredScenarioInput,
  horizon: number,
  profile: ExecutableDomainProfile
): ScenarioAnalysisResult {
  const engine = new RealEstateEngine(
    structuredClone(input.initialRiskState),
    input.initialDriverScores
      ? structuredClone(input.initialDriverScores)
      : undefined,
    profile
  );
  const trajectory: EngineState[] = [];

  for (let index = 0; index < horizon; index += 1) {
    engine.stepForward();
    trajectory.push(structuredClone(engine.getState()));
  }

  return {
    trajectory,
    get marginHistory() {
      return trajectory.map((state) => state.margin);
    },
    get constraintHistory() {
      return trajectory.map((state) => state.registry);
    },
    get cascadeHistory() {
      return trajectory[trajectory.length - 1].cascadeEvents;
    },
    get terminalState() {
      return trajectory[trajectory.length - 1];
    },
  };
}
