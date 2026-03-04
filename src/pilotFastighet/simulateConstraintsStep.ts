import type { RiskLevel } from "./impactContract";
import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import type { ConstraintRegistry } from "./constraintState";

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

  return {
    multipliersBeforeConstraints: baseMultipliers,
    multipliersAfterConstraints: baseMultipliers,
    updatedRegistry: input.registry,
  };
}
