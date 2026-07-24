"use strict";
/**
 * UI-only compare helpers for workshop-ready Compare Panel.
 * No engine logic; pure derivations from snapshot/list data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTippingIndex = findTippingIndex;
exports.buildExecutiveConclusion = buildExecutiveConclusion;
/**
 * Returns the first index i where snapshots[i] has lifecycle === "ACTIVE".
 * Safe optional chaining; returns null if never ACTIVE.
 */
function findTippingIndex(historySnapshots) {
    for (let i = 0; i < historySnapshots.length; i++) {
        const life = historySnapshots[i]?.engineState?.registry?.RefinancingConstraint?.lifecycle;
        if (life === "ACTIVE")
            return i;
    }
    return null;
}
const MAX_TITLE_LEN = 140;
/**
 * Deterministic executive conclusion from deltas and lifecycle/tipping.
 * No AI; mapping rules only.
 */
function buildExecutiveConclusion(input) {
    const { deltaMargin = 0, lifecycleA, lifecycleB, tippingStepA, tippingStepB, } = input;
    const tags = [];
    if (deltaMargin > 0)
        tags.push("Margin ↑");
    else if (deltaMargin < 0)
        tags.push("Margin ↓");
    const aActive = lifecycleA === "ACTIVE";
    const bActive = lifecycleB === "ACTIVE";
    const aStep = tippingStepA ?? null;
    const bStep = tippingStepB ?? null;
    const bTipsEarlier = bStep != null && aStep != null && bStep < aStep;
    const bWorse = bTipsEarlier ||
        (bActive && !aActive) ||
        (lifecycleB === "ACTIVE" && lifecycleA !== "ACTIVE");
    if (bWorse)
        tags.push("Risk ↑");
    let title;
    if (bStep != null && aStep != null && bStep < aStep) {
        title = `Alternative Strategy triggers ACTIVE earlier (Q${bStep} vs Q${aStep}), trading margin/stability.`;
    }
    else if (aStep != null && bStep == null) {
        title = `Alternative Strategy avoids ACTIVE while Current triggers it (Q${aStep}).`;
    }
    else if (aStep == null && bStep != null) {
        title = `Current Strategy avoids ACTIVE while Alternative triggers it (Q${bStep}).`;
    }
    else if (aStep == null && bStep == null) {
        title =
            "No ACTIVE tipping observed; compare margin/stability deltas.";
    }
    else {
        title =
            "No ACTIVE tipping observed; compare margin/stability deltas.";
    }
    if (title.length > MAX_TITLE_LEN) {
        title = title.slice(0, MAX_TITLE_LEN - 3) + "...";
    }
    return { title, tags };
}
