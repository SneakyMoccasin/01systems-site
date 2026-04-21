import type { RiskLevel } from "./impactContract";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";

export const RISK_PROPAGATION: Record<
  string,
  { target: string; level: RiskLevel }[]
> = {
  interestRateExposureRisk: [
    { target: "refinancingRisk", level: "HIGH" },
    { target: "leverageLevelRisk", level: "HIGH" },
  ],
  leverageLevelRisk: [
    { target: "capitalCommitmentRigidityRisk", level: "HIGH" },
  ],
  refinancingRisk: [
    { target: "capitalCommitmentRigidityRisk", level: "HIGH" },
  ],
  capitalCommitmentRigidityRisk: [
    { target: "maintenanceIntensityRisk", level: "HIGH" },
  ],
  maintenanceIntensityRisk: [
    { target: "tenantStabilityRisk", level: "HIGH" },
  ],
  tenantStabilityRisk: [
    { target: "demandRisk", level: "HIGH" },
  ],
  congestion_pressure: [
    { target: "modal_attractiveness", level: "HIGH" },
  ],
  modal_attractiveness: [
    { target: "accessibility", level: "HIGH" },
  ],
  accessibility: [
    { target: "demandRisk", level: "HIGH" },
  ],
  operational_capacity: [
    { target: "tenantStabilityRisk", level: "HIGH" },
  ],
  budget_pressure: [
    { target: "capitalCommitmentRigidityRisk", level: "HIGH" },
  ],
  transit_signal_priority: [
    { target: "operational_capacity", level: "HIGH" },
  ],
};

export type CascadeEvent = {
  step: number;
  sourceRisk: string;
  targetRisk: string;
  level: RiskLevel;
  iteration: number;
  /** Delay in timesteps before cascade appears in timeline (default 1). */
  delaySteps?: number;
};

export function propagateRisks(
  riskState: Record<string, RiskLevel>
): { next: Record<string, RiskLevel>; events: CascadeEvent[] } {
  profileCount("propagateRisks.calls");
  return profileMeasure("propagateRisks.ms", () => {
    if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
      console.log("PROPAGATION RUNNING");
    }
    const severityRank: Record<RiskLevel, number> = {
      LOW: 0,
      MODERATE: 1,
      HIGH: 2,
      SEVERE: 3,
    };

    if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
      console.log("[CASCADE DEBUG] Starting propagation", {
        initialRiskState: riskState,
      });
    }
    if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
      console.log("[CASCADE DEBUG] initial cascade nodes", {
        interestRateExposureRisk: riskState.interestRateExposureRisk,
        refinancingRisk: riskState.refinancingRisk,
        capitalCommitmentRigidityRisk: riskState.capitalCommitmentRigidityRisk,
        maintenanceIntensityRisk: riskState.maintenanceIntensityRisk,
        tenantStabilityRisk: riskState.tenantStabilityRisk,
        demandRisk: riskState.demandRisk,
      });
    }

    const next: Record<string, RiskLevel> = { ...riskState };

    let changed: boolean;
    let iteration = 0;
    const events: CascadeEvent[] = [];
    do {
      iteration += 1;
      changed = false;

      for (const [source, effects] of Object.entries(RISK_PROPAGATION)) {
        const level = next[source] as RiskLevel | undefined;

        if (level === "HIGH" || level === "SEVERE") {
          for (const effect of effects) {
            const current = (next[effect.target] as RiskLevel | undefined) ?? "LOW";
            if (
              iteration === 1 &&
              severityRank[effect.level] > severityRank[current]
            ) {
              if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                console.log("ELIGIBLE FOR UPGRADE", {
                  source,
                  target: effect.target,
                  current,
                  required: effect.level,
                });
              }
            }
            const threshold = severityRank[effect.level];
            const pressure = severityRank[current];
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
              console.log("CASCADE CHECK", {
                node: effect.target,
                source,
                threshold,
                pressure,
                triggered: pressure < threshold,
              });
            }
            if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
              console.log("[CASCADE DEBUG] checking rule", {
                source,
                sourceLevel: level,
                target: effect.target,
                requiredLevel: effect.level,
                currentTargetLevel: current,
              });
            }
            if (severityRank[effect.level] > severityRank[current]) {
              const previous = next[effect.target] as RiskLevel | undefined;

              next[effect.target] = effect.level;
              changed = true;

              // Only record cascade event if level actually changed
              if (previous !== effect.level) {
                if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                  console.log("[CASCADE DEBUG] CASCADE TRIGGERED", {
                    source,
                    target: effect.target,
                    level: effect.level,
                    iteration,
                  });
                }
                if (process.env.NODE_ENV === "development") {
                  // console.log("[PULSE TRACE] risk propagation", {
                  //   iteration,
                  //   source,
                  //   sourceLevel: level,
                  //   target: effect.target,
                  //   previousTargetLevel: current,
                  //   appliedLevel: effect.level,
                  // });
                }
                if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
                  console.log("[CASCADE DEBUG] pushing event", {
                    step: iteration + 1,
                    sourceRisk: source,
                    targetRisk: effect.target,
                  });
                }
                events.push({
                  step: iteration + 1,
                  sourceRisk: source,
                  targetRisk: effect.target,
                  level: effect.level,
                  iteration,
                  delaySteps: 1,
                });
              }
            }
          }
        } else {
          if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
            console.log("[CASCADE DEBUG] propagation skipped", {
              node: source,
              sourceLevel: level ?? null,
              reason: "source is not HIGH/SEVERE",
            });
          }
        }
      }
    } while (changed);

    if (process.env.NEXT_PUBLIC_PULSE_PROFILE) {
      console.log("[CASCADE DEBUG] propagation finished", {
        cascadeEvents: events,
      });
    }

    profileValue("propagateRisks.iterations", iteration, "iterations");
    profileValue("propagateRisks.events", events.length, "events");

    return { next, events };
  });
}
