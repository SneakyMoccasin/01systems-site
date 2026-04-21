import type { RiskLevel } from "./impactContract";
import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import type { ConstraintRegistry } from "./constraintState";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";

export type RiskState = Record<string, RiskLevel>;

export type SimulationInput = {
  riskState: RiskState;
  margin: number;
  baselineMargin: number;
  sensitivity: number;
  leverageLevel: RiskLevel;
  step: number;
  registry: ConstraintRegistry;
};

export type SimulationOutput = {
  multipliersBeforeConstraints: ReturnType<typeof computeDimensionMultipliers>;
  multipliersAfterConstraints: ReturnType<typeof computeDimensionMultipliers>;
  updatedRegistry: ConstraintRegistry;
};

export function simulateConstraintsStep(
  input: SimulationInput
): SimulationOutput {
  profileCount("simulateConstraintsStep.calls");
  return profileMeasure("simulateConstraintsStep.ms", () => {
    const baseMultipliers = computeDimensionMultipliers(
      input.riskState,
      input.step
    );

    console.log("BASE", {
      step: input.step,
      load: baseMultipliers.load,
      cost: baseMultipliers.cost,
      recovery: baseMultipliers.recovery,
      sensitivity: baseMultipliers.sensitivity,
    });

    const updatedRegistry = { ...input.registry };

    const rawThreshold = (input.riskState as Record<string, unknown>).sustainThreshold;
    const sustainThreshold =
      typeof rawThreshold === "number" ? rawThreshold : 0.8;

    if (
      input.margin != null &&
      input.margin < sustainThreshold &&
      updatedRegistry.RefinancingConstraint.lifecycle !== "ACTIVE"
    ) {
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

    profileValue(
      "simulateConstraintsStep.activeConstraints",
      Object.values(updatedRegistry).filter((constraint) => constraint.lifecycle === "ACTIVE")
        .length,
      "constraints"
    );

    return {
      multipliersBeforeConstraints: baseMultipliers,
      multipliersAfterConstraints,
      updatedRegistry,
    };
  });
}
