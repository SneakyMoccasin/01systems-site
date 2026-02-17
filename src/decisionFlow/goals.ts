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

  const finalPoint = timeline[timeline.length - 1];
  const metrics = finalPoint?.metrics ?? { load: 0, cost: 0 };

  for (const goal of goals) {
    const value = metrics[goal.metric as keyof typeof metrics];
    const threshold = goal.threshold;

    // Bands: margin/overrun levels. STABLE requires slack; 100% utilization is not stable.
    let state: StabilityState;

    if (goal.operator === "<=") {
      // <= 1.00x STABIL, <= 1.07x ANSTRÄNGD, <= 1.18x INSTABIL, > 1.18x OHÅLLBAR
      if (value <= threshold * 1.0) {
        state = "STABIL";
      } else if (value <= threshold * 1.07) {
        state = "ANSTRÄNGD";
      } else if (value <= threshold * 1.18) {
        state = "INSTABIL";
      } else {
        state = "OHÅLLBAR";
      }
    } else {
      // >= goals: mirror symmetrically (threshold/1.07, threshold/1.18)
      if (value >= threshold) {
        state = "STABIL";
      } else if (value >= threshold / 1.07) {
        state = "ANSTRÄNGD";
      } else if (value >= threshold / 1.18) {
        state = "INSTABIL";
      } else {
        state = "OHÅLLBAR";
      }
    }

    // Track worst state across goals (final tick only)
    if (statePriority[state] > statePriority[worstState]) {
      worstState = state;
      if (state === "INSTABIL" || state === "OHÅLLBAR") {
        worstDetails = {
          metric: goal.metric,
          tick: finalPoint?.tick ?? 0,
          value,
          threshold,
        };
      }
    }
  }

  return {
    status: worstState,
    worst: worstDetails,
  };
}

// STEP 3 — Pilot v5 goals. Load has headroom: 0.92 leaves slack; 1.0 = 100% utilization is not stable.
export const PILOT_V5_GOALS: Goal[] = [
  { metric: "load", operator: "<=", threshold: 0.92 },
  { metric: "cost", operator: "<=", threshold: 12 },
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

