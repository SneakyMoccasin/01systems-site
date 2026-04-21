import type { ConstraintRegistry } from "./constraintState";
import { createInitialConstraintRegistry } from "./constraintState";
import type { RiskLevel } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import { simulateConstraintsStep } from "./simulateConstraintsStep";
import { computeDimensionMultipliers } from "./computeDimensionMultipliers";
import { propagateRisks, type CascadeEvent } from "./riskPropagation";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";

export type RiskState = Record<string, RiskLevel>;

export type EngineState = {
  step: number;
  margin: number;
  registry: ConstraintRegistry;
  riskState: RiskState;
  cascadeEvents: CascadeEvent[];
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
      step: 0,
      margin: this.baselineMargin,
      registry: createInitialConstraintRegistry(),
      riskState,
      cascadeEvents: [],
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
    this.state.step = 0;
    this.state.margin = this.baselineMargin;
    this.state.registry = createInitialConstraintRegistry();
    this.state.cascadeEvents = [];
  }

  public stepForward() {
    profileCount("RealEstateEngine.stepForward.calls");

    return profileMeasure("RealEstateEngine.stepForward.ms", () => {
      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("ENGINE STEP FORWARD RUNNING");
      }
      const { riskState, margin, registry, step, cascadeEvents } = this.state;

      // Minimal stress-triggered escalation so cascades can start during runtime.
      // If the system is already underwater, financing pressure typically spikes.
      const escalatedRiskState: RiskState = { ...riskState };
      if (margin < -1.0) {
        const current = escalatedRiskState.interestRateExposureRisk;
        if (current === "LOW" || current == null) {
          escalatedRiskState.interestRateExposureRisk = "MODERATE";
        } else if (current === "MODERATE") {
          escalatedRiskState.interestRateExposureRisk = "HIGH";
        }
      }
      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("ESCALATED STATE", {
          before: riskState.interestRateExposureRisk,
          after: escalatedRiskState.interestRateExposureRisk,
          margin,
        });
      }

      const { next: propagatedState, events } = propagateRisks(escalatedRiskState);
      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("AFTER PROPAGATION", {
          interestRateExposureRisk: (propagatedState as RiskState).interestRateExposureRisk,
        });
      }
      const riskStateForTick = propagatedState as RiskState;

      const result = simulateConstraintsStep({
        riskState: riskStateForTick,
        margin,
        baselineMargin: this.baselineMargin,
        sensitivity: this.sensitivity,
        leverageLevel: riskStateForTick.leverageLevelRisk ?? "MODERATE",
        step,
        registry,
      });

      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("Engine multiplier input:", this.state.riskState);
      }
      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("riskStateForTick:", riskStateForTick);
      }
      const baseMultipliers = computeDimensionMultipliers(riskStateForTick, step);

      const adjustedCost = result.multipliersAfterConstraints.cost;
      const adjustedRecovery = result.multipliersAfterConstraints.recovery;
      const adjustedLoad = result.multipliersAfterConstraints.load;

      const loadImpact = Math.max(0, adjustedLoad - 1);

      const riskPressure =
        (baseMultipliers.load - 1) +
        (baseMultipliers.cost - 1) +
        (1 - baseMultipliers.recovery) +
        (baseMultipliers.sensitivity - 1);

      const erosion =
        (adjustedCost - 1) * 1.2 +
        (1 - adjustedRecovery) * 1.1 +
        loadImpact * 0.45 +
        riskPressure * 0.8;

      const pullToBaseline = (this.baselineMargin - margin) * 0.12;

      const nextMargin = margin - erosion + pullToBaseline;

      const clampedNextMargin = Math.max(-3, Math.min(3, nextMargin));

      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("MARGIN INPUT", {
          demand: (riskStateForTick as RiskState).demandRisk,
          pricing: (riskStateForTick as RiskState).pricingPowerRisk,
          tenant: (riskStateForTick as RiskState).tenantStabilityRisk,
          maintenance: (riskStateForTick as RiskState).maintenanceIntensityRisk,
          financing: {
            interestRateExposureRisk: (riskStateForTick as RiskState)
              .interestRateExposureRisk,
            leverageLevelRisk: (riskStateForTick as RiskState).leverageLevelRisk,
            refinancingRisk: (riskStateForTick as RiskState).refinancingRisk,
          },
          external: {
            energyExposureRisk: (riskStateForTick as RiskState).energyExposureRisk,
            marketVolatilityRisk: (riskStateForTick as RiskState).marketVolatilityRisk,
            regulatoryPressureRisk: (riskStateForTick as RiskState).regulatoryPressureRisk,
            capitalCommitmentRigidityRisk: (
              riskStateForTick as RiskState
            ).capitalCommitmentRigidityRisk,
          },
          // Numeric pieces used by the erosion/margin formula
          baseMultipliers,
          adjustedLoad,
          adjustedCost,
          adjustedRecovery,
          loadImpact,
          riskPressure,
          erosion,
          pullToBaseline,
          margin,
          step,
        });
      }

      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("MARGIN OUTPUT BEFORE CLAMP", {
          rawMargin: nextMargin,
          step,
        });
      }

      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log("MARGIN OUTPUT FINAL", {
          finalMargin: clampedNextMargin,
          step,
        });
      }

      if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
        console.log({
          step,
          margin,
          baseMultipliers,
          erosion,
          pullToBaseline,
          nextMargin,
        });
      }

      profileValue(
        "RealEstateEngine.stepForward.cascadeEvents",
        cascadeEvents.length + events.length,
        "events"
      );

      this.state = {
        step: step + 1,
        margin: clampedNextMargin,
        registry: result.updatedRegistry,
        riskState: riskStateForTick,
        cascadeEvents: [...cascadeEvents, ...events],
      };
    });
  }
}
