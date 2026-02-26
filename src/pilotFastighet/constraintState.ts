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
  severityIndex: number;
  activatedAtStep?: number;
  lastUpdatedStep: number;
};

export type ConstraintRegistry = Record<ConstraintType, ConstraintState>;

export function createInitialConstraintRegistry(): ConstraintRegistry {
  return {
    RefinancingConstraint: {
      type: "RefinancingConstraint",
      lifecycle: "INACTIVE",
      severityIndex: 0,
      lastUpdatedStep: 0,
    },
    LiquidityConstraint: {
      type: "LiquidityConstraint",
      lifecycle: "INACTIVE",
      severityIndex: 0,
      lastUpdatedStep: 0,
    },
    CovenantConstraint: {
      type: "CovenantConstraint",
      lifecycle: "INACTIVE",
      severityIndex: 0,
      lastUpdatedStep: 0,
    },
    Custom: {
      type: "Custom",
      lifecycle: "INACTIVE",
      severityIndex: 0,
      lastUpdatedStep: 0,
    },
  };
}
