import type { RiskLevel } from "./impactContract";

export type DriverScoreState = Record<string, number>;

export const RISK_LEVEL_TO_SCORE: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  SEVERE: 3,
};

export const SCORE_TO_RISK_LEVEL: readonly RiskLevel[] = [
  "LOW",
  "MODERATE",
  "HIGH",
  "SEVERE",
] as const;

export function clampDriverScore(score: number): number {
  return Math.max(0, Math.min(SCORE_TO_RISK_LEVEL.length - 1, score));
}

export function riskLevelToScore(level: RiskLevel): number {
  return RISK_LEVEL_TO_SCORE[level];
}

export function scoreToRiskLevel(score: number): RiskLevel {
  const clamped = clampDriverScore(score);

  if (clamped <= 0.5) return "LOW";
  if (clamped < 1.5) return "MODERATE";
  if (clamped < 2.5) return "HIGH";
  return "SEVERE";
}

export function buildDriverScoreState(
  riskState: Record<string, RiskLevel>
): DriverScoreState {
  return Object.fromEntries(
    Object.entries(riskState).map(([key, value]) => [key, riskLevelToScore(value)])
  );
}

export function materializeRiskStateFromScores(
  driverScores: DriverScoreState
): Record<string, RiskLevel> {
  return Object.fromEntries(
    Object.entries(driverScores).map(([key, value]) => [key, scoreToRiskLevel(value)])
  );
}
