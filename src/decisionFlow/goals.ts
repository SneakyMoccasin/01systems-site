/**
 * Goal evaluation for Decision Flow / Pilot v5
 * 
 * This module provides read-only goal evaluation.
 * Goals do NOT affect simulation behavior.
 * Evaluation happens AFTER simulation runs.
 */

// STEP 1 — Goal types
export type GoalMetric = "load" | "cost";

export interface Goal {
  metric: GoalMetric;
  operator: "<=" | ">=";
  threshold: number;
}

export interface GoalWorst {
  metric: GoalMetric;
  tick: number;
  value: number;
  threshold: number;
}

export interface GoalResult {
  status: "STABIL" | "ANSTRÄNGD" | "INSTABIL" | "OHÅLLBAR";
  worst?: GoalWorst;
}

// STEP 2 — Implement evaluator
export function evaluateGoals(
  timeline: Array<{
    tick: number;
    metrics: {
      load: number;
      cost: number;
    };
  }>,
  goals: Goal[]
): GoalResult {
  type StabilityState = "STABIL" | "ANSTRÄNGD" | "INSTABIL" | "OHÅLLBAR";
  
  const statePriority: Record<StabilityState, number> = {
    STABIL: 1,
    ANSTRÄNGD: 2,
    INSTABIL: 3,
    OHÅLLBAR: 4,
  };

  let worstState: StabilityState = "STABIL";
  let worstDetails: GoalWorst | undefined = undefined;

  for (const point of timeline) {
    for (const goal of goals) {
      const value = point.metrics[goal.metric];
      const threshold = goal.threshold;

      // Classify stability state based on value relative to threshold
      let state: StabilityState;
      
      if (goal.operator === "<=") {
        // For <= goals, lower is better
        if (value <= threshold * 0.85) {
          state = "STABIL";
        } else if (value <= threshold) {
          state = "ANSTRÄNGD";
        } else if (value <= threshold * 1.15) {
          state = "INSTABIL";
        } else {
          state = "OHÅLLBAR";
        }
      } else {
        // For >= goals, higher is better (inverse logic)
        if (value >= threshold * 1.15) {
          state = "STABIL";
        } else if (value >= threshold) {
          state = "ANSTRÄNGD";
        } else if (value >= threshold * 0.85) {
          state = "INSTABIL";
        } else {
          state = "OHÅLLBAR";
        }
      }

      // Track worst state across all metrics and ticks
      if (statePriority[state] > statePriority[worstState]) {
        worstState = state;
        // Only set worst details for INSTABIL and OHÅLLBAR
        if (state === "INSTABIL" || state === "OHÅLLBAR") {
          worstDetails = {
            metric: goal.metric,
            tick: point.tick,
            value,
            threshold,
          };
        }
      }
    }
  }

  return {
    status: worstState,
    worst: worstDetails,
  };
}

// STEP 3 — Define Pilot v5 goals
export const PILOT_V5_GOALS: Goal[] = [
  { metric: "load", operator: "<=", threshold: 3 },
  { metric: "cost", operator: "<=", threshold: 13 },
];

// STEP 4 — Default goal evaluation (presentation layer)
export type DefaultGoalStatus = "OK" | "EJ_OK";

export interface DefaultGoalResult {
  status: DefaultGoalStatus;
  reason: string;
}

export function evaluateDefaultGoal(
  stability: "STABIL" | "ANSTRÄNGD" | "INSTABIL" | "OHÅLLBAR"
): DefaultGoalResult {
  if (stability === "STABIL") {
    return {
      status: "OK",
      reason: "Systemet är stabilt och har marginal.",
    };
  }

  if (stability === "ANSTRÄNGD") {
    return {
      status: "OK",
      reason: "Systemet fungerar men utan marginal.",
    };
  }

  if (stability === "INSTABIL") {
    return {
      status: "EJ_OK",
      reason: "Systemet överskrider gränsvärden och kräver åtgärd.",
    };
  }

  return {
    status: "EJ_OK",
    reason: "Systemet är ohållbart och riskerar kollaps.",
  };
}

