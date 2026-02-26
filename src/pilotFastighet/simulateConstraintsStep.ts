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

  return {
    multipliersBeforeConstraints: baseMultipliers,
    multipliersAfterConstraints: constrainedMultipliers,
    updatedRegistry,
  };
}
