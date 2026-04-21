import type { ConstraintRegistry, ConstraintType } from "@/src/pilotFastighet/constraintState";

export type ConstraintActivationTimelineEntry = {
  constraintType: "capital" | "capacity" | "covenant" | "custom";
  status: "active" | "approaching";
  activationStep: number;
};

export type ConstraintActivationTimelineComparison = {
  constraintType: ConstraintActivationTimelineEntry["constraintType"];
  stepA: number | null;
  stepB: number | null;
  difference: number | null;
};

export type ConstraintActivationOrderingComparison = {
  earlierConstraint: ConstraintActivationTimelineEntry["constraintType"];
  laterConstraint: ConstraintActivationTimelineEntry["constraintType"];
  orderingA: "earlier" | "later";
  orderingB: "earlier" | "later";
};

function mapConstraintStatus(lifecycle: string): ConstraintActivationTimelineEntry["status"] {
  switch (lifecycle) {
    case "APPROACHING":
      return "approaching";
    case "ACTIVE":
    default:
      return "active";
  }
}

function mapConstraintType(type: ConstraintType): ConstraintActivationTimelineEntry["constraintType"] {
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

export function buildConstraintActivationTimeline(
  registry?: Partial<ConstraintRegistry> | null
): ConstraintActivationTimelineEntry[] {
  if (!registry) return [];

  return Object.values(registry)
    .filter(
      (constraint): constraint is NonNullable<typeof constraint> =>
        Boolean(constraint) &&
        (() => {
          const lifecycle = String(constraint.lifecycle);
          return (
            (lifecycle === "APPROACHING" || lifecycle === "ACTIVE") &&
            typeof constraint.activatedAtStep === "number" &&
            Number.isFinite(constraint.activatedAtStep)
          );
        })()
    )
    .map((constraint) => {
      const lifecycle = String(constraint.lifecycle);
      return {
        constraintType: mapConstraintType(constraint.type),
        status: mapConstraintStatus(lifecycle),
        activationStep: constraint.activatedAtStep as number,
      };
    })
    .sort((a, b) => {
      const stepDelta = a.activationStep - b.activationStep;
      if (stepDelta !== 0) return stepDelta;
      return a.constraintType.localeCompare(b.constraintType);
    });
}

export function compareConstraintActivationTimelines(
  timelineA: ConstraintActivationTimelineEntry[],
  timelineB: ConstraintActivationTimelineEntry[]
): ConstraintActivationTimelineComparison[] {
  const stepByTypeA = new Map(
    timelineA.map((entry) => [entry.constraintType, entry.activationStep])
  );
  const stepByTypeB = new Map(
    timelineB.map((entry) => [entry.constraintType, entry.activationStep])
  );
  const constraintTypes = Array.from(
    new Set([
      ...timelineA.map((entry) => entry.constraintType),
      ...timelineB.map((entry) => entry.constraintType),
    ])
  ).sort();

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

export function compareConstraintActivationOrdering(
  timelineA: ConstraintActivationTimelineEntry[],
  timelineB: ConstraintActivationTimelineEntry[]
): ConstraintActivationOrderingComparison[] {
  const stepByTypeA = new Map(
    timelineA.map((entry) => [entry.constraintType, entry.activationStep])
  );
  const stepByTypeB = new Map(
    timelineB.map((entry) => [entry.constraintType, entry.activationStep])
  );
  const sharedConstraintTypes = Array.from(
    new Set(
      timelineA
        .map((entry) => entry.constraintType)
        .filter((constraintType) => stepByTypeB.has(constraintType))
    )
  ).sort();
  const comparisons: ConstraintActivationOrderingComparison[] = [];

  for (let i = 0; i < sharedConstraintTypes.length; i += 1) {
    for (let j = i + 1; j < sharedConstraintTypes.length; j += 1) {
      const firstConstraint = sharedConstraintTypes[i];
      const secondConstraint = sharedConstraintTypes[j];
      const firstStepA = stepByTypeA.get(firstConstraint);
      const secondStepA = stepByTypeA.get(secondConstraint);
      const firstStepB = stepByTypeB.get(firstConstraint);
      const secondStepB = stepByTypeB.get(secondConstraint);

      if (
        firstStepA == null ||
        secondStepA == null ||
        firstStepB == null ||
        secondStepB == null ||
        firstStepA === secondStepA ||
        firstStepB === secondStepB
      ) {
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
