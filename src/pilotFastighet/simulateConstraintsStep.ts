import type { RiskLevel } from "./impactContract";
import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import { evaluateRefinancingConstraint } from "./refinancingLogic";
import { updateConstraintRegistry } from "./updateConstraintRegistry";
import { applyConstraintEffects } from "./applyConstraintEffects";
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

  // DIAGNOSTIC: bypass all constraint effects (revert after verification)
  return {
    multipliersBeforeConstraints: baseMultipliers,
    multipliersAfterConstraints: baseMultipliers,
    updatedRegistry: input.registry,
  };

  const refinancingResult = evaluateRefinancingConstraint({
    margin: input.margin,
    baselineMargin: input.baselineMargin,
    sensitivity: input.sensitivity,
    leverageLevel: input.leverageLevel,
    step: input.step,
  });

  const updatedRegistry = updateConstraintRegistry(
    input.registry,
    {
      type: "RefinancingConstraint",
      triggered: refinancingResult.triggered,
      targetSeverity: refinancingResult.severityIndex,
      step: input.step,
      thresholdOvershoot: refinancingResult.triggered
        ? 0
        : refinancingResult.threshold
          ? (input.margin - refinancingResult.threshold) / input.baselineMargin
          : 0,
    }
  );

  const constrainedMultipliers = applyConstraintEffects(
    baseMultipliers,
    updatedRegistry
  );

  const multipliersAfterConstraints = {
    ...constrainedMultipliers,
    cost: Math.max(0.85, Math.min(1.6, constrainedMultipliers.cost)),
    recovery: Math.max(0.85, Math.min(1.2, constrainedMultipliers.recovery)),
    load: Math.max(0.85, Math.min(2.2, constrainedMultipliers.load)),
  };

  return {
    multipliersBeforeConstraints: baseMultipliers,
    multipliersAfterConstraints,
    updatedRegistry,
  };
}
