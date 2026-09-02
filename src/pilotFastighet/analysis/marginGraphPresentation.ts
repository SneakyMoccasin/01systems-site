export type MarginGraphViewMode = "delta" | "absolute";

export type MarginGraphPresentedSeries = {
  scenarioA: number[];
  scenarioB: number[];
};

export type MarginGraphDomain = {
  min: number;
  max: number;
};

const MINIMUM_DOMAIN_PADDING = 0.05;
const DOMAIN_PADDING_RATIO = 0.08;

/**
 * The graph presents the engine histories directly. Delta view changes only
 * the coordinate representation and uses each scenario's own first value as
 * its baseline; it never changes the underlying history.
 */
export function resolveMarginGraphPresentedSeries(
  marginHistoryA: readonly number[],
  marginHistoryB: readonly number[],
  viewMode: MarginGraphViewMode
): MarginGraphPresentedSeries {
  if (viewMode === "absolute") {
    return {
      scenarioA: [...marginHistoryA],
      scenarioB: [...marginHistoryB],
    };
  }

  const baselineA = marginHistoryA[0] ?? 0;
  const baselineB = marginHistoryB[0] ?? 0;
  return {
    scenarioA: marginHistoryA.map((value) => value - baselineA),
    scenarioB: marginHistoryB.map((value) => value - baselineB),
  };
}

/**
 * Adds presentation-only breathing room around normal-workspace data so an
 * extremum remains visible inside the plot. Executive Demo may preserve its
 * verified legacy domain by setting preserveExactDomain.
 */
export function resolveMarginGraphDomain(
  seriesA: readonly number[],
  seriesB: readonly number[],
  viewMode: MarginGraphViewMode,
  preserveExactDomain = false
): MarginGraphDomain {
  const finiteValues = [...seriesA, ...seriesB].filter(Number.isFinite);
  const values = finiteValues.length > 0 ? finiteValues : [0];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const activeMin = viewMode === "delta" ? Math.min(rawMin, 0) : rawMin;
  const activeMax = viewMode === "delta" ? Math.max(rawMax, 0) : rawMax;

  if (preserveExactDomain) {
    return {
      min:
        viewMode === "absolute" && rawMin === rawMax
          ? rawMin - MINIMUM_DOMAIN_PADDING
          : activeMin,
      max:
        viewMode === "absolute" && rawMin === rawMax
          ? rawMax + MINIMUM_DOMAIN_PADDING
          : activeMax,
    };
  }

  const span = activeMax - activeMin;
  const padding =
    span > 0
      ? Math.max(span * DOMAIN_PADDING_RATIO, MINIMUM_DOMAIN_PADDING)
      : Math.max(Math.abs(activeMin) * DOMAIN_PADDING_RATIO, MINIMUM_DOMAIN_PADDING);

  return {
    min: activeMin - padding,
    max: activeMax + padding,
  };
}

export function resolveMarginGraphPoint(
  presentedSeries: MarginGraphPresentedSeries,
  scenario: "A" | "B",
  periodIndex: number
): number | undefined {
  return scenario === "A"
    ? presentedSeries.scenarioA[periodIndex]
    : presentedSeries.scenarioB[periodIndex];
}
