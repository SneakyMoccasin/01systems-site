import type { RiskLevel } from "./impactContract";
import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import type { ConstraintRegistry } from "./constraintState";
import type { ExecutableDomainProfile } from "./executableDomainProfile";
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
  profile?: ExecutableDomainProfile;
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
      input.step,
      undefined,
      input.profile?.impactContract,
      input.profile?.curveConfiguration
    );

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

    const rawThreshold = (input.riskState as Record<string, unknown>).sustainThreshold;
    const sustainThreshold = typeof rawThreshold === "number"
      ? rawThreshold
      : input.profile?.constraints.refinancingMarginThreshold ?? 0.8;

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

    const constraintEffects = input.profile?.constraints.activeEffects;
    if (updatedRegistry.RefinancingConstraint.lifecycle === "ACTIVE") {
      const effect = constraintEffects?.RefinancingConstraint;
      multipliersAfterConstraints = {
        ...multipliersAfterConstraints,
        cost: multipliersAfterConstraints.cost * (effect?.cost ?? 1.15),
        recovery: multipliersAfterConstraints.recovery * (effect?.recovery ?? 0.8),
      };
    }

    if (updatedRegistry.LiquidityConstraint.lifecycle === "ACTIVE") {
      const effect = constraintEffects?.LiquidityConstraint;
      multipliersAfterConstraints = {
        ...multipliersAfterConstraints,
        cost: multipliersAfterConstraints.cost * (effect?.cost ?? 1.1),
        load: multipliersAfterConstraints.load * (effect?.load ?? 1.05),
      };
    }

    if (updatedRegistry.CovenantConstraint.lifecycle === "ACTIVE") {
      const effect = constraintEffects?.CovenantConstraint;
      multipliersAfterConstraints = {
        ...multipliersAfterConstraints,
        recovery: multipliersAfterConstraints.recovery * (effect?.recovery ?? 0.6),
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
