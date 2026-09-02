import type { ImpactSpec, ParameterKey, RiskLevel } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import {
  getImpactMultiplier,
  PARAMETER_CURVE_CONFIG,
  type ParameterCurveConfig,
} from "./curveConfig";
import type { DriverScoreState } from "./driverScoreState";

export type RiskState = Record<string, RiskLevel>;

export type DimensionMultipliers = {
  load: number;
  cost: number;
  recovery: number;
  sensitivity: number;
};

export type ExecutableImpactParameter = Readonly<{
  key: ParameterKey;
  impacts: readonly Readonly<ImpactSpec>[];
}>;

export function computeDimensionMultipliers(
  riskState: RiskState,
  step: number = 1,
  driverScores?: DriverScoreState,
  impactContract: readonly ExecutableImpactParameter[] = REAL_ESTATE_IMPACT_CONTRACT,
  curveConfiguration: Readonly<Record<string, ParameterCurveConfig>> =
    PARAMETER_CURVE_CONFIG
): DimensionMultipliers {
  let load = 1;
  let cost = 1;
  let recovery = 1;
  let sensitivity = 1;

  for (const param of impactContract) {
    const score = driverScores?.[param.key];
    const level = riskState[param.key];
    if (score == null && !level) continue;

    const multiplier = getImpactMultiplier(
      param.key,
      score ?? level,
      step,
      curveConfiguration
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
