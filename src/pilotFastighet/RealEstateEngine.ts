import type { ConstraintRegistry } from "./constraintState";
import { createInitialConstraintRegistry } from "./constraintState";
import type { RiskLevel } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import { simulateConstraintsStep } from "./simulateConstraintsStep";

export type RiskState = Record<string, RiskLevel>;

export type EngineState = {
  step: number;
  margin: number;
  registry: ConstraintRegistry;
  riskState: RiskState;
};

export class RealEstateEngine {
  private baselineMargin: number;
  private sensitivity: number;
  private state: EngineState;

  constructor(initialRiskState?: RiskState) {
    const riskState =
      initialRiskState ??
      REAL_ESTATE_IMPACT_CONTRACT.reduce((acc, param) => {
        acc[param.key] = "MODERATE";
        return acc;
      }, {} as RiskState);

    this.baselineMargin = 1.0;
    this.sensitivity = 1.2;

    this.state = {
      step: 1,
      margin: this.baselineMargin,
      registry: createInitialConstraintRegistry(),
      riskState,
    };
  }

  public getState(): EngineState {
    return this.state;
  }

  public setRiskState(riskState: RiskState) {
    this.state.riskState = riskState;
    this.reset();
  }

  public reset() {
    this.state.step = 1;
    this.state.margin = this.baselineMargin;
    this.state.registry = createInitialConstraintRegistry();
  }

  public stepForward() {
    const { riskState, margin, registry, step } = this.state;

    const result = simulateConstraintsStep({
      riskState,
      margin,
      baselineMargin: this.baselineMargin,
      sensitivity: this.sensitivity,
      leverageLevel: riskState.leverageLevelRisk ?? "MODERATE",
      step,
      registry,
    });

    const adjustedCost = result.multipliersAfterConstraints.cost;
    const adjustedRecovery = result.multipliersAfterConstraints.recovery;
    const adjustedLoad = result.multipliersAfterConstraints.load;

    const loadImpact = Math.max(0, adjustedLoad - 1);

    const erosion =
      (adjustedCost - 1)
      + (1 - adjustedRecovery)
      + loadImpact * 0.5;

    const nextMargin =
      margin - erosion;

    this.state = {
      step: step + 1,
      margin: nextMargin,
      registry: result.updatedRegistry,
      riskState,
    };
  }
}
