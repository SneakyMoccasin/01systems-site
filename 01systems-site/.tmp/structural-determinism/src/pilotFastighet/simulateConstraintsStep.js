"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateConstraintsStep = simulateConstraintsStep;
const computeDimensionMultipliers_1 = require("./computeDimensionMultipliers");
const runtimeProfile_1 = require("@/src/lib/runtimeProfile");
function simulateConstraintsStep(input) {
    (0, runtimeProfile_1.profileCount)("simulateConstraintsStep.calls");
    return (0, runtimeProfile_1.profileMeasure)("simulateConstraintsStep.ms", () => {
        const baseMultipliers = (0, computeDimensionMultipliers_1.computeDimensionMultipliers)(input.riskState, input.step);
        if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
            console.log("BASE", {
                step: input.step,
                load: baseMultipliers.load,
                cost: baseMultipliers.cost,
                recovery: baseMultipliers.recovery,
                sensitivity: baseMultipliers.sensitivity,
            });
        }
        const updatedRegistry = { ...input.registry };
        const rawThreshold = input.riskState.sustainThreshold;
        const sustainThreshold = typeof rawThreshold === "number" ? rawThreshold : 0.8;
        if (input.margin != null &&
            input.margin < sustainThreshold &&
            updatedRegistry.RefinancingConstraint.lifecycle !== "ACTIVE") {
            updatedRegistry.RefinancingConstraint = {
                ...updatedRegistry.RefinancingConstraint,
                lifecycle: "ACTIVE",
                activatedAtStep: input.step,
                lastUpdatedStep: input.step,
            };
        }
        // Apply constraint effects to multipliers.
        let multipliersAfterConstraints = { ...baseMultipliers };
        if (updatedRegistry.RefinancingConstraint.lifecycle === "ACTIVE") {
            multipliersAfterConstraints = {
                ...multipliersAfterConstraints,
                cost: multipliersAfterConstraints.cost * 1.15, // +15% cost
                recovery: multipliersAfterConstraints.recovery * 0.8, // -20% recovery
            };
        }
        if (updatedRegistry.LiquidityConstraint.lifecycle === "ACTIVE") {
            multipliersAfterConstraints = {
                ...multipliersAfterConstraints,
                cost: multipliersAfterConstraints.cost * 1.1, // +10% cost
                load: multipliersAfterConstraints.load * 1.05, // +5% load
            };
        }
        if (updatedRegistry.CovenantConstraint.lifecycle === "ACTIVE") {
            multipliersAfterConstraints = {
                ...multipliersAfterConstraints,
                recovery: multipliersAfterConstraints.recovery * 0.6, // -40% recovery
            };
        }
        (0, runtimeProfile_1.profileValue)("simulateConstraintsStep.activeConstraints", Object.values(updatedRegistry).filter((constraint) => constraint.lifecycle === "ACTIVE")
            .length, "constraints");
        return {
            multipliersBeforeConstraints: baseMultipliers,
            multipliersAfterConstraints,
            updatedRegistry,
        };
    });
}
