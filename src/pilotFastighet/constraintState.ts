export type ConstraintType =
  | "RefinancingConstraint"
  | "LiquidityConstraint"
  | "CovenantConstraint"
  | "Custom";

export type ConstraintLifecycle =
  | "INACTIVE"
  | "ACTIVE"
  | "RECOVERING";

export type ConstraintState = {
  type: ConstraintType;
  lifecycle: ConstraintLifecycle;
  activatedAtStep?: number;
  lastUpdatedStep: number;
};

export type ConstraintRegistry = Record<ConstraintType, ConstraintState>;

export function createInitialConstraintRegistry(): ConstraintRegistry {
  return {
    RefinancingConstraint: {
      type: "RefinancingConstraint",
      lifecycle: "INACTIVE",
      lastUpdatedStep: 0,
    },
    LiquidityConstraint: {
      type: "LiquidityConstraint",
      lifecycle: "INACTIVE",
      lastUpdatedStep: 0,
    },
    CovenantConstraint: {
      type: "CovenantConstraint",
      lifecycle: "INACTIVE",
      lastUpdatedStep: 0,
    },
    Custom: {
      type: "Custom",
      lifecycle: "INACTIVE",
      lastUpdatedStep: 0,
    },
  };
}
