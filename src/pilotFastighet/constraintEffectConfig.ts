import type { ConstraintType } from "./constraintState";

export type DimensionImpactConfig = {
  load?: number;
  cost?: number;
  recovery?: number;
  sensitivity?: number;
};

export type ConstraintEffectConfig = Record<
  ConstraintType,
  DimensionImpactConfig
>;

export const CONSTRAINT_EFFECT_CONFIG: ConstraintEffectConfig = {
  RefinancingConstraint: {
    cost: 0.6,
    recovery: 0.4,
    sensitivity: 0.5,
  },
  LiquidityConstraint: {
    cost: 0.4,
    recovery: 0.6,
    sensitivity: 0.7,
  },
  CovenantConstraint: {
    cost: 0.5,
    recovery: 0.3,
    sensitivity: 0.6,
  },
  Custom: {
    cost: 0.5,
    recovery: 0.5,
    sensitivity: 0.5,
  },
};
