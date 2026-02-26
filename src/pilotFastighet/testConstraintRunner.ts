import { simulateConstraintsStep } from "./simulateConstraintsStep";
import { createInitialConstraintRegistry } from "./constraintState";
import type { RiskLevel } from "./impactContract";

const baselineMargin = 1.0;

let margin = 1.0;
let registry = createInitialConstraintRegistry();

const riskState: Record<string, RiskLevel> = {
  demandRisk: "MODERATE",
  pricingPowerRisk: "MODERATE",
  tenantStabilityRisk: "HIGH",
  maintenanceIntensityRisk: "MODERATE",
  operationalEfficiencyRisk: "MODERATE",
  energyExposureRisk: "MODERATE",
  interestRateExposureRisk: "HIGH",
  leverageLevelRisk: "HIGH",
  refinancingRisk: "HIGH",
  marketVolatilityRisk: "MODERATE",
  regulatoryPressureRisk: "MODERATE",
  capitalCommitmentRigidityRisk: "MODERATE",
};

for (let step = 1; step <= 20; step++) {
  if (step <= 10) {
    margin -= 0.07;
  } else {
    margin += 0.08;
  }

  const result = simulateConstraintsStep({
    riskState,
    margin,
    baselineMargin,
    sensitivity: 1.2,
    leverageLevel: "HIGH",
    step,
    registry,
  });

  registry = result.updatedRegistry;

  const refinancing = registry.RefinancingConstraint;

  console.log("------------------------------------------------");
  console.log("Step:", step);
  console.log("Margin:", margin.toFixed(3));
  console.log("Lifecycle:", refinancing.lifecycle);
  console.log("Severity:", refinancing.severityIndex.toFixed(4));
  console.log("Multipliers BEFORE:", result.multipliersBeforeConstraints);
  console.log("Multipliers AFTER:", result.multipliersAfterConstraints);
}
