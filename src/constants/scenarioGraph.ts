import type { Year } from "./years";

export type ScenarioGraphPoint = {
  readonly year: Year;
  readonly loadAbsolute: number;
  readonly capacityAbsolute: number;
  readonly loadRatio: number;
};

export type ScenarioGraphData = readonly ScenarioGraphPoint[];
