"use client";

export type StrategyColors = {
  baseline: string;
  goal: string;
};

export function getPilotStrategyColors(execRealEstateGraphPassive: boolean): StrategyColors {
  return execRealEstateGraphPassive
    ? {
        baseline: "#2563eb",
        goal: "#d97706",
      }
    : {
        baseline: "#3b82f6",
        goal: "#ef4444",
      };
}
