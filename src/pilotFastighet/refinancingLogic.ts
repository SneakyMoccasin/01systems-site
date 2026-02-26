import type { RiskLevel, SystemEvent } from "./impactContract";

export type RefinancingState = {
  margin: number;
  baselineMargin: number;
  sensitivity: number;
  leverageLevel: RiskLevel;
  step: number;
};

export type RefinancingResult = {
  triggered: boolean;
  severityIndex: number;
  riskAdjustedMargin: number;
  threshold: number;
  event?: SystemEvent;
};

const SAFETY_FACTOR = 0.45;
const MIN_LEVERAGE_FOR_TRIGGER: RiskLevel = "HIGH";

function isHighOrSevere(level: RiskLevel): boolean {
  return level === "HIGH" || level === "SEVERE";
}

export function evaluateRefinancingConstraint(
  state: RefinancingState
): RefinancingResult {
  const {
    margin,
    baselineMargin,
    sensitivity,
    leverageLevel,
    step,
  } = state;

  const threshold = baselineMargin * SAFETY_FACTOR;

  const riskAdjustedMargin =
    sensitivity > 0 ? margin / sensitivity : margin;

  const leverageCondition = isHighOrSevere(leverageLevel);

  const triggered =
    leverageCondition &&
    riskAdjustedMargin < threshold;

  if (!triggered) {
    return {
      triggered: false,
      severityIndex: 0,
      riskAdjustedMargin,
      threshold,
    };
  }

  const depthRatio =
    (threshold - riskAdjustedMargin) / baselineMargin;

  const severityIndex = Math.max(0, depthRatio);

  const event: SystemEvent = {
    type: "RefinancingConstraintActivated",
    step,
    reason:
      "Risk-adjusted margin fell below safety threshold under elevated leverage.",
    trigger: {
      step,
      margin,
      leverageFactor: sensitivity,
      safetyMarginThreshold: threshold,
      leverageThreshold: 1,
    },
  };

  return {
    triggered: true,
    severityIndex,
    riskAdjustedMargin,
    threshold,
    event,
  };
}
