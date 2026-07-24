"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARAMETER_CURVE_CONFIG = void 0;
exports.resolveLinear = resolveLinear;
exports.resolveExponential = resolveExponential;
exports.resolveLogistic = resolveLogistic;
exports.getImpactMultiplier = getImpactMultiplier;
exports.PARAMETER_CURVE_CONFIG = {
    demandRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.9, high: 1.15, severe: 1.3 },
    },
    pricingPowerRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.9, high: 1.15, severe: 1.3 },
    },
    tenantStabilityRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.9, high: 1.2, severe: 1.35 },
    },
    maintenanceIntensityRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.95, high: 1.15, severe: 1.3 },
    },
    operationalEfficiencyRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.9, high: 1.2, severe: 1.4 },
    },
    energyExposureRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.95, high: 1.2, severe: 1.35 },
    },
    interestRateExposureRisk: {
        curve: "EXPONENTIAL",
        amplitude: { base: 1.0, low: 0.9, high: 1.4, severe: 1.9 },
    },
    leverageLevelRisk: {
        curve: "EXPONENTIAL",
        amplitude: { base: 1.0, low: 0.9, high: 1.6, severe: 2.3 },
    },
    refinancingRisk: {
        curve: "LOGISTIC",
        amplitude: {
            base: 1.0,
            low: 0.97,
            high: 1.18,
            severe: 1.35,
        },
    },
    marketVolatilityRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.95, high: 1.2, severe: 1.4 },
    },
    regulatoryPressureRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.95, high: 1.25, severe: 1.5 },
    },
    capitalCommitmentRigidityRisk: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.95, high: 1.15, severe: 1.3 },
    },
    accessibility: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.98, high: 1.04, severe: 1.08 },
    },
    modal_attractiveness: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.97, high: 1.05, severe: 1.1 },
    },
    congestion_pressure: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.98, high: 1.05, severe: 1.1 },
    },
    operational_capacity: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.98, high: 1.04, severe: 1.08 },
    },
    transit_signal_priority: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.98, high: 1.03, severe: 1.06 },
    },
    budget_pressure: {
        curve: "LINEAR",
        amplitude: { base: 1.0, low: 0.99, high: 1.06, severe: 1.12 },
    },
};
function resolveLinear(level, amp) {
    switch (level) {
        case "LOW":
            return amp.low;
        case "MODERATE":
            return amp.base;
        case "HIGH":
            return amp.high;
        case "SEVERE":
            return amp.severe;
    }
}
function resolveExponential(level, amp) {
    const base = resolveLinear(level, amp);
    return Math.pow(base, 1.2);
}
function resolveLogistic(level, amp, step = 1) {
    const base = resolveLinear(level, amp);
    const k = 0.8;
    const x0 = 3;
    return 1 + (base - 1) / (1 + Math.exp(-k * (step - x0)));
}
function getImpactMultiplier(parameterKey, level, step) {
    const config = exports.PARAMETER_CURVE_CONFIG[parameterKey];
    if (!config)
        return 1;
    const { curve, amplitude } = config;
    switch (curve) {
        case "LINEAR":
            return resolveLinear(level, amplitude);
        case "EXPONENTIAL":
            return resolveExponential(level, amplitude);
        case "LOGISTIC":
            return resolveLogistic(level, amplitude, step ?? 1);
        default:
            return 1;
    }
}
