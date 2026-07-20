import type { RiskLevel } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import { getImpactMultiplier } from "./curveConfig";
import type { DriverScoreState } from "./driverScoreState";

export type RiskState = Record<string, RiskLevel>;

export type DimensionMultipliers = {
  load: number;
  cost: number;
  recovery: number;
  sensitivity: number;
};

export function computeDimensionMultipliers(
  riskState: RiskState,
  step: number = 1,
  driverScores?: DriverScoreState
): DimensionMultipliers {
  let load = 1;
  let cost = 1;
  let recovery = 1;
  let sensitivity = 1;

  for (const param of REAL_ESTATE_IMPACT_CONTRACT) {
    const score = driverScores?.[param.key];
    const level = riskState[param.key];
    if (score == null && !level) continue;

    const multiplier = getImpactMultiplier(
      param.key,
      score ?? level,
      step
    );

    if (process.env.NODE_ENV === "development") {
      // console.log("[PULSE DEBUG] multiplier", {
      //   key: param.key,
      //   level,
      //   multiplier,
      // });
    }

    for (const impact of param.impacts) {
      const applyIncrease = (current: number) => current * multiplier;
      const applyDecrease = (current: number) => current / multiplier;
      const applyDirectionalEffect =
        impact.direction === "increase" ? applyIncrease : applyDecrease;

      if (impact.dimension === "load") {
        load = applyDirectionalEffect(load);
      }

      if (impact.dimension === "cost") {
        cost = applyDirectionalEffect(cost);
      }

      if (impact.dimension === "sensitivity") {
        sensitivity = applyDirectionalEffect(sensitivity);
      }

      if (impact.dimension === "recovery") {
        recovery = applyDirectionalEffect(recovery);
      }
    }
  }

  return {
    load,
    cost,
    recovery,
    sensitivity,
  };
}
