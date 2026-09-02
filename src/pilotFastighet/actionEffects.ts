import type { RiskLevel } from "./impactContract";
import {
  buildDriverScoreState,
  clampDriverScore,
  materializeRiskStateFromScores,
  type DriverScoreState,
} from "./driverScoreState";
import type { ExecutableDomainProfile } from "./executableDomainProfile";

export type ActionEffectsMap = Record<string, number>;

export const ACTION_EFFECTS = {
  increase_service_frequency: {
    accessibility: +1,
    operational_capacity: -0.5,
    budget_pressure: +0.5,
  },
  reduce_travel_time: {
    modal_attractiveness: +1,
  },
  expand_cycling_infrastructure: {
    modal_attractiveness: +2,
    congestion_pressure: -1,
    budget_pressure: +1,
  },
  congestion_pricing: {
    modal_shift_pressure: +2,
    political_feasibility: -1,
  },
  electrify_bus_fleet: {
    energyExposureRisk: -1,
    operationalEfficiencyRisk: -0.5,
    capitalCommitmentRigidityRisk: +0.5,
  },
  transit_signal_priority: {
    transit_signal_priority: +1,
  },
  reduce_parking_supply: {
    demandRisk: +1,
  },
  phase_project_starts: {
    capitalCommitmentRigidityRisk: -1,
    refinancingRisk: -0.5,
  },
  stagger_project_starts: {
    capitalCommitmentRigidityRisk: -1,
    implementationPacingRisk: -1,
  },
  increase_liquidity_buffer: {
    liquidityPressure: -1,
    refinancingRisk: -1,
  },
  reduce_leverage: {
    refinancingRisk: -1,
    interestRateExposureRisk: -1,
  },
  secure_long_term_leases: {
    tenantStabilityRisk: -1,
    demandRisk: -1,
  },
  energy_retrofit_program: {
    energyExposureRisk: -1,
    operationalEfficiencyRisk: +1,
  },
  delay_maintenance: {
    maintenanceIntensityRisk: +1,
    tenantStabilityRisk: +0.5,
  },
  early_refinancing: {
    refinancingRisk: -1,
    interestRateExposureRisk: -0.5,
  },
} as const satisfies Record<string, ActionEffectsMap>;

export type ActionKey = keyof typeof ACTION_EFFECTS;
export type ActionDomainKey = "realEstate" | "municipal" | "consulting";

export const DOMAIN_ACTIONS: Record<ActionDomainKey, ActionKey[]> = {
  realEstate: [
    "delay_maintenance",
    "early_refinancing",
    "phase_project_starts",
    "stagger_project_starts",
    "increase_liquidity_buffer",
    "reduce_leverage",
    "secure_long_term_leases",
    "energy_retrofit_program",
  ],
  municipal: [
    "increase_service_frequency",
    "reduce_travel_time",
    "expand_cycling_infrastructure",
    "congestion_pricing",
    "electrify_bus_fleet",
    "transit_signal_priority",
    "reduce_parking_supply",
  ],
  consulting: [
    "increase_service_frequency",
    "reduce_travel_time",
    "expand_cycling_infrastructure",
    "congestion_pricing",
    "electrify_bus_fleet",
    "transit_signal_priority",
    "reduce_parking_supply",
    "phase_project_starts",
    "delay_maintenance",
    "early_refinancing",
  ],
};

export function getUnsupportedActionDrivers(
  action: string,
  validKeys: Iterable<string>
): string[] {
  const effects = ACTION_EFFECTS[action as ActionKey];
  if (!effects) return [action];

  const valid = new Set(validKeys);
  return Object.keys(effects).filter((driver) => !valid.has(driver));
}

export function actionHasOnlyModeledDrivers(
  action: string,
  validKeys: Iterable<string>
): boolean {
  return getUnsupportedActionDrivers(action, validKeys).length === 0;
}

export function applyActionEffectsToRiskState(
  baseState: Record<string, RiskLevel>,
  actions: readonly string[],
  profile?: ExecutableDomainProfile
): Record<string, RiskLevel> {
  return resolveActionDrivenState(baseState, actions, profile).riskState;
}

export function resolveActionDrivenState(
  baseState: Record<string, RiskLevel>,
  actions: readonly string[],
  profile?: ExecutableDomainProfile
): {
  riskState: Record<string, RiskLevel>;
  driverScores: DriverScoreState;
} {
  const nextDriverScores = buildDriverScoreState(baseState);
  const cumulativeDeltas = new Map<string, number>();

  for (const action of actions) {
    const effects = profile?.actionEffects[action as ActionKey] ?? ACTION_EFFECTS[action as ActionKey];
    if (!effects) continue;

    for (const [driver, delta] of Object.entries(effects)) {
      if (!(driver in nextDriverScores)) continue;
      cumulativeDeltas.set(driver, (cumulativeDeltas.get(driver) ?? 0) + Number(delta));
    }
  }

  for (const [driver, delta] of cumulativeDeltas.entries()) {
    const currentScore = nextDriverScores[driver];
    if (typeof currentScore !== "number") continue;
    nextDriverScores[driver] = clampDriverScore(currentScore + delta);
  }

  return {
    driverScores: nextDriverScores,
    riskState: materializeRiskStateFromScores(nextDriverScores),
  };
}
