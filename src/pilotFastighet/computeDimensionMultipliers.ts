import type { RiskLevel } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import { getImpactMultiplier } from "./curveConfig";

export type RiskState = Record<string, RiskLevel>;

export type DimensionMultipliers = {
  load: number;
  cost: number;
  recovery: number;
  sensitivity: number;
};

export function computeDimensionMultipliers(
  riskState: RiskState,
  step: number = 1
): DimensionMultipliers {
  let load = 1;
  let cost = 1;
  let recovery = 1;
  let sensitivity = 1;

  for (const param of REAL_ESTATE_IMPACT_CONTRACT) {
    const level = riskState[param.key];
    if (!level) continue;

    const multiplier = getImpactMultiplier(param.key, level, step);

    for (const impact of param.impacts) {
      if (impact.dimension === "load") {
        load *= multiplier;
      }

      if (impact.dimension === "cost") {
        cost *= multiplier;
      }

      if (impact.dimension === "sensitivity") {
        sensitivity *= multiplier;
      }

      if (impact.dimension === "recovery") {
        recovery /= multiplier;
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
