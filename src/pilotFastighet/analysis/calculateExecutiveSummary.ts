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
  | "structural_breakdown"
  | "structural_collapse";

export type TippingRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "irreversible";

export type ExecutiveSummaryResult = {
  structuralStatus: StructuralStatus;
  structuralStatusA: StructuralStatus;
  structuralStatusB: StructuralStatus;
  deltaMargin: number;
  tippingStep: number | null;
  tippingRiskLevel: TippingRiskLevel;
  compression: number;
  compressionA: number;
  compressionB: number;
  minimumMargin: number;
  minimumMarginA: number;
  minimumMarginB: number;
  collapseThreshold: number;
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

function computeStructuralStatus(
  limited: number[],
  collapseThreshold: number,
  sustainThreshold: number
): { minimumMargin: number; lastMargin: number; compression: number; structuralStatus: StructuralStatus } {
  const initialMargin = limited[0] ?? 0;
  const minimumMargin = min(limited);
  const compression = initialMargin - minimumMargin;
  const lastMargin = limited.length > 0 ? limited[limited.length - 1] : 0;
  let structuralStatus: StructuralStatus;
  if (minimumMargin < 0) {
    structuralStatus = "structural_collapse";
  } else if (minimumMargin <= sustainThreshold) {
    structuralStatus = "structural_breakdown";
  } else {
    const lookback = limited.slice(-8);
    const slope = linearSlope(lookback);
    if (compression > 3 && slope < 0) {
      structuralStatus = "functioning_but_doomed";
    } else {
      structuralStatus = "stable";
    }
  }
  return { minimumMargin, lastMargin, compression, structuralStatus };
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

  const ANALYSIS_HORIZON = 16;

  if (!marginSeriesA.length || !marginSeriesB.length) {
    throw new Error("Margin series cannot be empty.");
  }

  const limitedA = marginSeriesA.slice(0, ANALYSIS_HORIZON);
  const limitedB = marginSeriesB.slice(0, ANALYSIS_HORIZON);

  const avgA = average(limitedA);
  const avgB = average(limitedB);
  const deltaMargin = avgB - avgA;

  let tippingStep: number | null = null;
  for (let i = 0; i < limitedB.length; i++) {
    if (limitedB[i] <= tippingThreshold) {
      tippingStep = i + 1; // 1-indexed, Q1 = 1
      break;
    }
  }

  let tippingRiskLevel: TippingRiskLevel;
  if (tippingStep == null) tippingRiskLevel = "low";
  else if (tippingStep <= 4) tippingRiskLevel = "irreversible";
  else if (tippingStep <= 8) tippingRiskLevel = "high";
  else tippingRiskLevel = "moderate";

  const statusA = computeStructuralStatus(limitedA, collapseThreshold, sustainThreshold);
  const statusB = computeStructuralStatus(limitedB, collapseThreshold, sustainThreshold);

  const minimumMarginA = statusA.minimumMargin;
  const minimumMarginB = statusB.minimumMargin;
  const compressionA = statusA.compression;
  const compressionB = statusB.compression;
  const structuralStatusA = statusA.structuralStatus;
  const structuralStatusB = statusB.structuralStatus;
  const structuralStatus = structuralStatusB;
  const minimumMargin = minimumMarginB;
  const compression = compressionB;

  console.log("Executive summary", { minimumMargin, collapseThreshold });

  return {
    structuralStatus,
    structuralStatusA,
    structuralStatusB,
    deltaMargin,
    tippingStep,
    tippingRiskLevel,
    compression,
    compressionA,
    compressionB,
    minimumMargin,
    minimumMarginA,
    minimumMarginB,
    collapseThreshold,
    interpretationText: "",
  };
}

