"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDimensionMultipliers = computeDimensionMultipliers;
const impactContract_1 = require("./impactContract");
const curveConfig_1 = require("./curveConfig");
function computeDimensionMultipliers(riskState, step = 1) {
    let load = 1;
    let cost = 1;
    let recovery = 1;
    let sensitivity = 1;
    for (const param of impactContract_1.REAL_ESTATE_IMPACT_CONTRACT) {
        const level = riskState[param.key];
        if (!level)
            continue;
        const multiplier = (0, curveConfig_1.getImpactMultiplier)(param.key, level, step);
        if (process.env.NODE_ENV === "development") {
            // console.log("[PULSE DEBUG] multiplier", {
            //   key: param.key,
            //   level,
            //   multiplier,
            // });
        }
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
