import type { ActionKey } from "./actionEffects";
import { buildDriverScoreState } from "./driverScoreState";
import { defaultRiskState } from "./presetRiskMapping";
import {
  createCleanRunSourceSnapshot,
  type ScenarioSchedules,
} from "./analysis/reactScheduledAnalysisBoundary";

export const SCHEDULED_EXECUTIVE_DEMO_ID =
  "same-actions-different-order" as const;
export const SCHEDULED_EXECUTIVE_DEMO_HORIZON = 36;

export const SCHEDULED_EXECUTIVE_DEMO_SCHEDULES: ScenarioSchedules =
  Object.freeze({
    A: Object.freeze([
      Object.freeze({ actionId: "delay_maintenance", executionStep: 1 }),
      Object.freeze({ actionId: "early_refinancing", executionStep: 9 }),
      Object.freeze({ actionId: "secure_long_term_leases", executionStep: 18 }),
    ]),
    B: Object.freeze([
      Object.freeze({ actionId: "early_refinancing", executionStep: 1 }),
      Object.freeze({ actionId: "secure_long_term_leases", executionStep: 3 }),
      Object.freeze({ actionId: "delay_maintenance", executionStep: 18 }),
    ]),
  } satisfies Record<"A" | "B", readonly { actionId: ActionKey; executionStep: number }[]>);

export function getScheduledExecutiveDemoRunSource() {
  const initialRiskState = structuredClone(defaultRiskState);
  const initialDriverScores = buildDriverScoreState(initialRiskState);
  return createCleanRunSourceSnapshot({
    scenarioA: {
      baseRiskState: initialRiskState,
      baseDriverScores: initialDriverScores,
    },
    scenarioB: {
      baseRiskState: initialRiskState,
      baseDriverScores: initialDriverScores,
    },
    baseline: { baseRiskState: defaultRiskState },
  });
}

export function getScheduledExecutiveDemoTitle(language: "sv" | "en") {
  return language === "sv"
    ? "Samma åtgärder, olika ordning"
    : "Same actions, different order";
}

export function getScheduledExecutiveScenarioLabel(
  scenario: "A" | "B",
  language: "sv" | "en"
) {
  if (scenario === "A") return language === "sv" ? "Belastning först" : "Adverse first";
  return language === "sv" ? "Stabilisering först" : "Mitigation first";
}
