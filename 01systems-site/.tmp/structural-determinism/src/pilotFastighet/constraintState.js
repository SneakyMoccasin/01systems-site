"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialConstraintRegistry = createInitialConstraintRegistry;
function createInitialConstraintRegistry() {
    return {
        RefinancingConstraint: {
            type: "RefinancingConstraint",
            lifecycle: "INACTIVE",
            lastUpdatedStep: 0,
        },
        LiquidityConstraint: {
            type: "LiquidityConstraint",
            lifecycle: "INACTIVE",
            lastUpdatedStep: 0,
        },
        CovenantConstraint: {
            type: "CovenantConstraint",
            lifecycle: "INACTIVE",
            lastUpdatedStep: 0,
        },
        Custom: {
            type: "Custom",
            lifecycle: "INACTIVE",
            lastUpdatedStep: 0,
        },
    };
}
