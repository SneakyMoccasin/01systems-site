"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REAL_ESTATE_IMPACT_CONTRACT = void 0;
exports.groupContractByGroup = groupContractByGroup;
exports.isCapitalKey = isCapitalKey;
exports.REAL_ESTATE_IMPACT_CONTRACT = [
    {
        key: "demandRisk",
        label: "Efterfrågan (risk)",
        group: "Income Dynamics",
        impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
    },
    {
        key: "pricingPowerRisk",
        label: "Prissättningskraft (risk)",
        group: "Income Dynamics",
        impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
    },
    {
        key: "tenantStabilityRisk",
        label: "Hyresgästers stabilitet (risk)",
        group: "Income Dynamics",
        impacts: [
            { dimension: "load", direction: "increase", curve: "LINEAR" },
            { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
        ],
    },
    {
        key: "maintenanceIntensityRisk",
        label: "Underhållsnivå (risk)",
        group: "Operations",
        impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
    },
    {
        key: "operationalEfficiencyRisk",
        label: "Drifteffektivitet (risk)",
        group: "Operations",
        impacts: [
            { dimension: "cost", direction: "increase", curve: "LINEAR" },
            { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
        ],
    },
    {
        key: "energyExposureRisk",
        label: "Energiexponering (risk)",
        group: "Operations",
        impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
    },
    {
        key: "interestRateExposureRisk",
        label: "Ränteexponering (risk)",
        group: "Capital & Financing",
        impacts: [{ dimension: "cost", direction: "increase", curve: "EXPONENTIAL" }],
    },
    {
        key: "leverageLevelRisk",
        label: "Belåningsgrad (risk)",
        group: "Capital & Financing",
        impacts: [
            { dimension: "cost", direction: "increase", curve: "EXPONENTIAL" },
            { dimension: "sensitivity", direction: "increase", curve: "EXPONENTIAL" },
        ],
    },
    {
        key: "refinancingRisk",
        label: "Refinansieringsrisk (risk)",
        group: "Capital & Financing",
        impacts: [{ dimension: "cost", direction: "increase", curve: "LOGISTIC" }],
    },
    {
        key: "marketVolatilityRisk",
        label: "Marknadsvolatilitet (risk)",
        group: "External Pressure",
        impacts: [{ dimension: "load", direction: "increase", curve: "LINEAR" }],
    },
    {
        key: "regulatoryPressureRisk",
        label: "Regulatoriskt tryck (risk)",
        group: "External Pressure",
        impacts: [{ dimension: "cost", direction: "increase", curve: "LINEAR" }],
    },
    {
        key: "capitalCommitmentRigidityRisk",
        label: "Kapitalbindning (risk)",
        group: "External Pressure",
        impacts: [{ dimension: "recovery", direction: "decrease", curve: "LINEAR" }],
    },
    {
        key: "accessibility",
        label: {
            sv: "Tillgänglighet",
            en: "Accessibility",
        },
        group: "Accessibility & Mode Shift",
        impacts: [
            { dimension: "load", direction: "decrease", curve: "LINEAR" },
            { dimension: "recovery", direction: "increase", curve: "LINEAR" },
        ],
    },
    {
        key: "modal_attractiveness",
        label: {
            sv: "Färdmedelsattraktivitet",
            en: "Modal Attractiveness",
        },
        group: "Accessibility & Mode Shift",
        impacts: [
            { dimension: "load", direction: "decrease", curve: "LINEAR" },
            { dimension: "recovery", direction: "increase", curve: "LINEAR" },
        ],
    },
    {
        key: "congestion_pressure",
        label: {
            sv: "Trängseltryck",
            en: "Congestion Pressure",
        },
        group: "Accessibility & Mode Shift",
        impacts: [
            { dimension: "load", direction: "increase", curve: "LINEAR" },
            { dimension: "cost", direction: "increase", curve: "LINEAR" },
        ],
    },
    {
        key: "operational_capacity",
        label: {
            sv: "Operativ kapacitet",
            en: "Operational Capacity",
        },
        group: "Operations & Capacity",
        impacts: [
            { dimension: "load", direction: "decrease", curve: "LINEAR" },
            { dimension: "recovery", direction: "increase", curve: "LINEAR" },
        ],
    },
    {
        key: "transit_signal_priority",
        label: {
            sv: "Signalprioritering kollektivtrafik",
            en: "Transit Signal Priority",
        },
        group: "Operations & Capacity",
        impacts: [
            { dimension: "load", direction: "decrease", curve: "LINEAR" },
            { dimension: "recovery", direction: "increase", curve: "LINEAR" },
        ],
    },
    {
        key: "budget_pressure",
        label: {
            sv: "Budgettryck",
            en: "Budget Pressure",
        },
        group: "Financial Flexibility",
        impacts: [
            { dimension: "cost", direction: "increase", curve: "LINEAR" },
            { dimension: "recovery", direction: "decrease", curve: "LINEAR" },
        ],
    },
];
const CAPITAL_KEYS = [
    "interestRateExposureRisk",
    "leverageLevelRisk",
    "refinancingRisk",
];
function groupContractByGroup(contract) {
    const out = {
        "Income Dynamics": [],
        Operations: [],
        "Capital & Financing": [],
        "External Pressure": [],
        "Accessibility & Mode Shift": [],
        "Operations & Capacity": [],
        "Financial Flexibility": [],
    };
    for (const spec of contract) {
        out[spec.group].push(spec);
    }
    return out;
}
function isCapitalKey(key) {
    return CAPITAL_KEYS.includes(key);
}
