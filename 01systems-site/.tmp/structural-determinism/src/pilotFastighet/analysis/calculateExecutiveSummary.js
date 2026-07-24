"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateExecutiveSummary = calculateExecutiveSummary;
function average(series) {
    if (series.length === 0)
        return 0;
    const sum = series.reduce((acc, v) => acc + v, 0);
    return sum / series.length;
}
function min(series) {
    if (series.length === 0)
        return 0;
    return series.reduce((m, v) => (v < m ? v : m), series[0]);
}
function linearSlope(series) {
    if (series.length < 2)
        return 0;
    const first = series[0];
    const last = series[series.length - 1];
    const n = series.length - 1;
    return (last - first) / n;
}
function computeStructuralStatus(limited, collapseThreshold, sustainThreshold) {
    const initialMargin = limited[0] ?? 0;
    const minimumMargin = min(limited);
    const compression = initialMargin - minimumMargin;
    const lastMargin = limited.length > 0 ? limited[limited.length - 1] : 0;
    let structuralStatus;
    if (minimumMargin < 0) {
        structuralStatus = "structural_collapse";
    }
    else if (minimumMargin <= sustainThreshold) {
        structuralStatus = "structural_breakdown";
    }
    else {
        const lookback = limited.slice(-8);
        const slope = linearSlope(lookback);
        if (compression > 3 && slope < 0) {
            structuralStatus = "functioning_but_doomed";
        }
        else {
            structuralStatus = "stable";
        }
    }
    return { minimumMargin, lastMargin, compression, structuralStatus };
}
function calculateExecutiveSummary(input) {
    const { marginSeriesA, marginSeriesB, sustainThreshold, collapseThreshold, tippingStepB, } = input;
    const ANALYSIS_HORIZON = 16;
    if (!marginSeriesA.length || !marginSeriesB.length) {
        throw new Error("Margin series cannot be empty.");
    }
    const limitedA = marginSeriesA.slice(0, ANALYSIS_HORIZON);
    const limitedB = marginSeriesB.slice(0, ANALYSIS_HORIZON);
    const avgA = average(limitedA);
    const avgB = average(limitedB);
    const deltaMargin = avgB - avgA;
    // Use lifecycle-based tipping (same as graph). tippingStepB is 1-indexed quarter.
    const tippingStep = tippingStepB ?? null;
    let tippingRiskLevel;
    if (tippingStep == null)
        tippingRiskLevel = "low";
    else if (tippingStep <= 4)
        tippingRiskLevel = "irreversible";
    else if (tippingStep <= 8)
        tippingRiskLevel = "high";
    else
        tippingRiskLevel = "moderate";
    const statusA = computeStructuralStatus(limitedA, collapseThreshold, sustainThreshold);
    const statusB = computeStructuralStatus(limitedB, collapseThreshold, sustainThreshold);
    const minimumMarginA = statusA.minimumMargin;
    const minimumMarginB = statusB.minimumMargin;
    const compressionA = statusA.compression;
    const compressionB = statusB.compression;
    const structuralStatusA = statusA.structuralStatus;
    const structuralStatusB = statusB.structuralStatus;
    const structuralStatus = structuralStatusB;
    const minimumMargin = minimumMarginB;
    const compression = compressionB;
    console.log("Executive summary", { minimumMargin, collapseThreshold });
    return {
        structuralStatus,
        structuralStatusA,
        structuralStatusB,
        deltaMargin,
        tippingStep,
        tippingRiskLevel,
        compression,
        compressionA,
        compressionB,
        minimumMargin,
        minimumMarginA,
        minimumMarginB,
        collapseThreshold,
        interpretationText: "",
    };
}
