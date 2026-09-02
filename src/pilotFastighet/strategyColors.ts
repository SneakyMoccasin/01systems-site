"use client";

import { CASCADE_PRESENTATION } from "./cascadePresentation";

export type StrategyColors = {
  baseline: string;
  goal: string;
};

export function getPilotStrategyColors(execRealEstateGraphPassive: boolean): StrategyColors {
  void execRealEstateGraphPassive;
  return {
    baseline: CASCADE_PRESENTATION.scenarios.A.color,
    goal: CASCADE_PRESENTATION.scenarios.B.color,
  };
}
