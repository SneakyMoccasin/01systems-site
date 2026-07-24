"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealEstateEngine = void 0;
const constraintState_1 = require("./constraintState");
const impactContract_1 = require("./impactContract");
const simulateConstraintsStep_1 = require("./simulateConstraintsStep");
const computeDimensionMultipliers_1 = require("./computeDimensionMultipliers");
const riskPropagation_1 = require("./riskPropagation");
const runtimeProfile_1 = require("@/src/lib/runtimeProfile");
class RealEstateEngine {
    baselineMargin;
    sensitivity;
    state;
    constructor(initialRiskState) {
        const riskState = initialRiskState ??
            impactContract_1.REAL_ESTATE_IMPACT_CONTRACT.reduce((acc, param) => {
                acc[param.key] = "MODERATE";
                return acc;
            }, {});
        this.baselineMargin = 1.0;
        this.sensitivity = 1.2;
        this.state = {
            step: 0,
            margin: this.baselineMargin,
            registry: (0, constraintState_1.createInitialConstraintRegistry)(),
            riskState,
            cascadeEvents: [],
        };
    }
    getState() {
        return this.state;
    }
    setRiskState(riskState) {
        this.state.riskState = riskState;
        this.reset();
    }
    reset() {
        this.state.step = 0;
        this.state.margin = this.baselineMargin;
        this.state.registry = (0, constraintState_1.createInitialConstraintRegistry)();
        this.state.cascadeEvents = [];
    }
    stepForward() {
        (0, runtimeProfile_1.profileCount)("RealEstateEngine.stepForward.calls");
        return (0, runtimeProfile_1.profileMeasure)("RealEstateEngine.stepForward.ms", () => {
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("ENGINE STEP FORWARD RUNNING");
            }
            const { riskState, margin, registry, step, cascadeEvents } = this.state;
            // Minimal stress-triggered escalation so cascades can start during runtime.
            // If the system is already underwater, financing pressure typically spikes.
            const escalatedRiskState = { ...riskState };
            if (margin < -1.0) {
                const current = escalatedRiskState.interestRateExposureRisk;
                if (current === "LOW" || current == null) {
                    escalatedRiskState.interestRateExposureRisk = "MODERATE";
                }
                else if (current === "MODERATE") {
                    escalatedRiskState.interestRateExposureRisk = "HIGH";
                }
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("ESCALATED STATE", {
                    before: riskState.interestRateExposureRisk,
                    after: escalatedRiskState.interestRateExposureRisk,
                    margin,
                });
            }
            const { next: propagatedState, events } = (0, riskPropagation_1.propagateRisks)(escalatedRiskState);
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("AFTER PROPAGATION", {
                    interestRateExposureRisk: propagatedState.interestRateExposureRisk,
                });
            }
            const riskStateForTick = propagatedState;
            const result = (0, simulateConstraintsStep_1.simulateConstraintsStep)({
                riskState: riskStateForTick,
                margin,
                baselineMargin: this.baselineMargin,
                sensitivity: this.sensitivity,
                leverageLevel: riskStateForTick.leverageLevelRisk ?? "MODERATE",
                step,
                registry,
            });
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("Engine multiplier input:", this.state.riskState);
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("riskStateForTick:", riskStateForTick);
            }
            const baseMultipliers = (0, computeDimensionMultipliers_1.computeDimensionMultipliers)(riskStateForTick, step);
            const adjustedCost = result.multipliersAfterConstraints.cost;
            const adjustedRecovery = result.multipliersAfterConstraints.recovery;
            const adjustedLoad = result.multipliersAfterConstraints.load;
            const loadImpact = Math.max(0, adjustedLoad - 1);
            const riskPressure = (baseMultipliers.load - 1) +
                (baseMultipliers.cost - 1) +
                (1 - baseMultipliers.recovery) +
                (baseMultipliers.sensitivity - 1);
            const erosion = (adjustedCost - 1) * 1.2 +
                (1 - adjustedRecovery) * 1.1 +
                loadImpact * 0.45 +
                riskPressure * 0.8;
            const pullToBaseline = (this.baselineMargin - margin) * 0.12;
            const nextMargin = margin - erosion + pullToBaseline;
            const clampedNextMargin = Math.max(-3, Math.min(3, nextMargin));
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("MARGIN INPUT", {
                    demand: riskStateForTick.demandRisk,
                    pricing: riskStateForTick.pricingPowerRisk,
                    tenant: riskStateForTick.tenantStabilityRisk,
                    maintenance: riskStateForTick.maintenanceIntensityRisk,
                    financing: {
                        interestRateExposureRisk: riskStateForTick
                            .interestRateExposureRisk,
                        leverageLevelRisk: riskStateForTick.leverageLevelRisk,
                        refinancingRisk: riskStateForTick.refinancingRisk,
                    },
                    external: {
                        energyExposureRisk: riskStateForTick.energyExposureRisk,
                        marketVolatilityRisk: riskStateForTick.marketVolatilityRisk,
                        regulatoryPressureRisk: riskStateForTick.regulatoryPressureRisk,
                        capitalCommitmentRigidityRisk: riskStateForTick.capitalCommitmentRigidityRisk,
                    },
                    // Numeric pieces used by the erosion/margin formula
                    baseMultipliers,
                    adjustedLoad,
                    adjustedCost,
                    adjustedRecovery,
                    loadImpact,
                    riskPressure,
                    erosion,
                    pullToBaseline,
                    margin,
                    step,
                });
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("MARGIN OUTPUT BEFORE CLAMP", {
                    rawMargin: nextMargin,
                    step,
                });
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("MARGIN OUTPUT FINAL", {
                    finalMargin: clampedNextMargin,
                    step,
                });
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log({
                    step,
                    margin,
                    baseMultipliers,
                    erosion,
                    pullToBaseline,
                    nextMargin,
                });
            }
            (0, runtimeProfile_1.profileValue)("RealEstateEngine.stepForward.cascadeEvents", cascadeEvents.length + events.length, "events");
            this.state = {
                step: step + 1,
                margin: clampedNextMargin,
                registry: result.updatedRegistry,
                riskState: riskStateForTick,
                cascadeEvents: [...cascadeEvents, ...events],
            };
        });
    }
}
exports.RealEstateEngine = RealEstateEngine;
