"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConstraintActivationTimeline = buildConstraintActivationTimeline;
exports.compareConstraintActivationTimelines = compareConstraintActivationTimelines;
exports.compareConstraintActivationOrdering = compareConstraintActivationOrdering;
function mapConstraintStatus(lifecycle) {
    switch (lifecycle) {
        case "APPROACHING":
            return "approaching";
        case "ACTIVE":
        default:
            return "active";
    }
}
function mapConstraintType(type) {
    switch (type) {
        case "RefinancingConstraint":
            return "capital";
        case "LiquidityConstraint":
            return "capacity";
        case "CovenantConstraint":
            return "covenant";
        case "Custom":
        default:
            return "custom";
    }
}
function buildConstraintActivationTimeline(registry) {
    if (!registry)
        return [];
    return Object.values(registry)
        .filter((constraint) => Boolean(constraint) &&
        (() => {
            const lifecycle = String(constraint.lifecycle);
            return ((lifecycle === "APPROACHING" || lifecycle === "ACTIVE") &&
                typeof constraint.activatedAtStep === "number" &&
                Number.isFinite(constraint.activatedAtStep));
        })())
        .map((constraint) => {
        const lifecycle = String(constraint.lifecycle);
        return {
            constraintType: mapConstraintType(constraint.type),
            status: mapConstraintStatus(lifecycle),
            activationStep: constraint.activatedAtStep,
        };
    })
        .sort((a, b) => {
        const stepDelta = a.activationStep - b.activationStep;
        if (stepDelta !== 0)
            return stepDelta;
        return a.constraintType.localeCompare(b.constraintType);
    });
}
function compareConstraintActivationTimelines(timelineA, timelineB) {
    const stepByTypeA = new Map(timelineA.map((entry) => [entry.constraintType, entry.activationStep]));
    const stepByTypeB = new Map(timelineB.map((entry) => [entry.constraintType, entry.activationStep]));
    const constraintTypes = Array.from(new Set([
        ...timelineA.map((entry) => entry.constraintType),
        ...timelineB.map((entry) => entry.constraintType),
    ])).sort();
    return constraintTypes.map((constraintType) => {
        const stepA = stepByTypeA.get(constraintType) ?? null;
        const stepB = stepByTypeB.get(constraintType) ?? null;
        return {
            constraintType,
            stepA,
            stepB,
            difference: stepA != null && stepB != null ? stepB - stepA : null,
        };
    });
}
function compareConstraintActivationOrdering(timelineA, timelineB) {
    const stepByTypeA = new Map(timelineA.map((entry) => [entry.constraintType, entry.activationStep]));
    const stepByTypeB = new Map(timelineB.map((entry) => [entry.constraintType, entry.activationStep]));
    const sharedConstraintTypes = Array.from(new Set(timelineA
        .map((entry) => entry.constraintType)
        .filter((constraintType) => stepByTypeB.has(constraintType)))).sort();
    const comparisons = [];
    for (let i = 0; i < sharedConstraintTypes.length; i += 1) {
        for (let j = i + 1; j < sharedConstraintTypes.length; j += 1) {
            const firstConstraint = sharedConstraintTypes[i];
            const secondConstraint = sharedConstraintTypes[j];
            const firstStepA = stepByTypeA.get(firstConstraint);
            const secondStepA = stepByTypeA.get(secondConstraint);
            const firstStepB = stepByTypeB.get(firstConstraint);
            const secondStepB = stepByTypeB.get(secondConstraint);
            if (firstStepA == null ||
                secondStepA == null ||
                firstStepB == null ||
                secondStepB == null ||
                firstStepA === secondStepA ||
                firstStepB === secondStepB) {
                continue;
            }
            const orderingA = firstStepA < secondStepA ? "earlier" : "later";
            const orderingB = firstStepB < secondStepB ? "earlier" : "later";
            if (orderingA !== orderingB) {
                comparisons.push({
                    earlierConstraint: firstConstraint,
                    laterConstraint: secondConstraint,
                    orderingA,
                    orderingB,
                });
            }
        }
    }
    return comparisons;
}
