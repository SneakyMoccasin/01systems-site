export type GoalType =
  | "robustness"
  | "delay"
  | "avoidance"
  | "margin-preservation";

export const DEFAULT_GOAL_TYPE: GoalType = "robustness";
