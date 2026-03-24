/**
 * Goal evaluation for Decision Flow / Pilot v5
 *
 * This module provides read-only goal evaluation.
 * Goals do NOT affect simulation behavior.
 * Evaluation happens AFTER simulation runs.
 * Classification is based on relative structural degradation vs baseline.
 */

// STEP 1 — Goal types (retained for reference; relative-degradation evaluator does not use goals array)
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

// STEP 2 — Relative structural degradation evaluator (replaces timeline+goals evaluator)
export function evaluateGoals({
  baselineMinMargin,
  scenarioMinMargin,
}: {
  baselineMinMargin: number;
  scenarioMinMargin: number;
}) {
  if (baselineMinMargin <= 0) {
    return {
      goalStatus: "invalid",
      goalText: "Baseline margin är ogiltig.",
      debug: { baselineMinMargin, scenarioMinMargin },
    };
  }

  const relativeDropRaw = (baselineMinMargin - scenarioMinMargin) / baselineMinMargin;
  const relativeDrop = Math.max(0, relativeDropRaw);
  const relativeChange = (scenarioMinMargin - baselineMinMargin) / baselineMinMargin;

  let goalStatus: string;
  let goalText: string;

  if (scenarioMinMargin > baselineMinMargin) {
    goalStatus = "improved";
    goalText = "Strukturell förbättring – handlingsutrymmet ökar jämfört med utgångsläget.";
  } else if (relativeDrop < 0.03) {
    goalStatus = "no_deviation";
    goalText = "Ingen strukturell överskridelse.";
  } else if (relativeDrop < 0.12) {
    goalStatus = "minor";
    goalText =
      "Marginell överskridelse – systemet fungerar men handlingsutrymmet minskar.";
  } else if (relativeDrop < 0.3) {
    goalStatus = "serious";
    goalText =
      "Allvarlig överskridelse – systemets strukturella stabilitet försämras tydligt.";
  } else {
    goalStatus = "critical";
    goalText =
      "Kritisk överskridelse – systemet närmar sig strukturell instabilitet.";
  }

  return {
    goalStatus,
    goalText,
    debug: {
      baselineMinMargin,
      scenarioMinMargin,
      relativeDrop,
      relativeChange,
    },
  };
}

// STEP 3 — Pilot v5 goals (retained for reference; evaluateGoals now uses baselineMinMargin/scenarioMinMargin)
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

