export type ExecutiveSummaryInput = {
  marginSeriesA: number[];
  marginSeriesB: number[];
  tippingThreshold: number;
  sustainThreshold: number;
  collapseThreshold: number;
};

export type StructuralStatus =
  | "stable"
  | "functioning_but_doomed"
  | "marginal_exceedance"
  | "structural_collapse";

export type TippingRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "irreversible";

export type ExecutiveSummaryResult = {
  structuralStatus: StructuralStatus;
  deltaMargin: number;
  tippingStep: number | null;
  tippingRiskLevel: TippingRiskLevel;
  compression: number;
  minimumMargin: number;
  interpretationText: string;
};

function average(series: number[]): number {
  if (series.length === 0) return 0;
  const sum = series.reduce((acc, v) => acc + v, 0);
  return sum / series.length;
}

function min(series: number[]): number {
  if (series.length === 0) return 0;
  return series.reduce((m, v) => (v < m ? v : m), series[0]);
}

function linearSlope(series: number[]): number {
  if (series.length < 2) return 0;
  const first = series[0];
  const last = series[series.length - 1];
  const n = series.length - 1;
  return (last - first) / n;
}

export function calculateExecutiveSummary(
  input: ExecutiveSummaryInput
): ExecutiveSummaryResult {
  const {
    marginSeriesA,
    marginSeriesB,
    tippingThreshold,
    sustainThreshold,
    collapseThreshold,
  } = input;

  if (!marginSeriesA.length || !marginSeriesB.length) {
    throw new Error("Margin series cannot be empty.");
  }

  const avgA = average(marginSeriesA);
  const avgB = average(marginSeriesB);
  const deltaMargin = avgB - avgA;

  let tippingStep: number | null = null;
  for (let i = 0; i < marginSeriesB.length; i++) {
    if (marginSeriesB[i] <= tippingThreshold) {
      tippingStep = i + 1; // 1-indexed, Q1 = 1
      break;
    }
  }

  let tippingRiskLevel: TippingRiskLevel;
  if (tippingStep == null) tippingRiskLevel = "low";
  else if (tippingStep <= 4) tippingRiskLevel = "irreversible";
  else if (tippingStep <= 8) tippingRiskLevel = "high";
  else tippingRiskLevel = "moderate";

  const initialMargin = marginSeriesB[0] ?? 0;
  const minimumMargin = min(marginSeriesB);
  const compression = initialMargin - minimumMargin;

  const lastMargin =
    marginSeriesB.length > 0 ? marginSeriesB[marginSeriesB.length - 1] : 0;

  let structuralStatus: StructuralStatus;
  if (lastMargin <= collapseThreshold) {
    structuralStatus = "structural_collapse";
  } else if (minimumMargin <= sustainThreshold) {
    structuralStatus = "marginal_exceedance";
  } else {
    const lookback = marginSeriesB.slice(-8);
    const slope = linearSlope(lookback);
    if (compression > 3 && slope < 0) {
      structuralStatus = "functioning_but_doomed";
    } else {
      structuralStatus = "stable";
    }
  }

  return {
    structuralStatus,
    deltaMargin,
    tippingStep,
    tippingRiskLevel,
    compression,
    minimumMargin,
    interpretationText: "",
  };
}

