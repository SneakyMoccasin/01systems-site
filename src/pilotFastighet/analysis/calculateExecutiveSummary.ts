export type ExecutiveSummaryInput = {
  marginSeriesA: number[];
  marginSeriesB: number[];
  tippingThreshold: number;
  sustainThreshold: number;
  collapseThreshold: number;
};

export type StructuralStatus =
  | "Stabil"
  | "Fungerande men dömd"
  | "Marginell överskridelse"
  | "Strukturell kollaps";

export type TippingRiskLevel =
  | "Låg"
  | "Måttlig"
  | "Hög"
  | "Oåterkallelig";

export type ExecutiveSummaryResult = {
  structuralStatus: StructuralStatus;
  deltaMargin: number;
  tippingStep: number | null;
  tippingRiskLevel: TippingRiskLevel;
  compression: number;
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
  if (tippingStep == null) tippingRiskLevel = "Låg";
  else if (tippingStep <= 4) tippingRiskLevel = "Oåterkallelig";
  else if (tippingStep <= 8) tippingRiskLevel = "Hög";
  else tippingRiskLevel = "Måttlig";

  const initialMargin = marginSeriesB[0] ?? 0;
  const minimumMargin = min(marginSeriesB);
  const compression = initialMargin - minimumMargin;

  const lastMargin =
    marginSeriesB.length > 0 ? marginSeriesB[marginSeriesB.length - 1] : 0;

  let structuralStatus: StructuralStatus;
  if (lastMargin <= collapseThreshold) {
    structuralStatus = "Strukturell kollaps";
  } else if (minimumMargin <= sustainThreshold) {
    structuralStatus = "Marginell överskridelse";
  } else {
    const lookback = marginSeriesB.slice(-8);
    const slope = linearSlope(lookback);
    if (compression > 3 && slope < 0) {
      structuralStatus = "Fungerande men dömd";
    } else {
      structuralStatus = "Stabil";
    }
  }

  let interpretationText = "";

  if (structuralStatus === "Strukturell kollaps") {
    interpretationText =
      "Marginalerna ligger på eller under nivån för strukturell kollaps. Situationen kräver omedelbar omprövning av kapital- och riskprofil.";
  } else if (structuralStatus === "Marginell överskridelse") {
    interpretationText =
      "Marginalerna understiger uthålliga nivåer vid flera tidpunkter. Portföljen är känslig för vidare påfrestningar.";
  } else if (structuralStatus === "Fungerande men dömd") {
    interpretationText =
      "Systemet fungerar i nuläget men visar en tydlig nedåtgående trend i marginalerna över tid. Utan åtgärder förväntas försvagning inom planeringshorisonten.";
  } else {
    interpretationText =
      "Marginalerna är stabila och ligger över definierade tröskelnivåer. Portföljen bedöms som robust under nuvarande antaganden.";
  }

  if (deltaMargin < 0) {
    interpretationText +=
      " Scenario B innebär en försämring av genomsnittlig marginal jämfört med scenario A.";
  } else if (deltaMargin > 0) {
    interpretationText +=
      " Scenario B innebär en förbättring av genomsnittlig marginal jämfört med scenario A.";
  } else {
    interpretationText +=
      " Genomsnittlig marginal är oförändrad mellan scenarierna.";
  }

  if (tippingRiskLevel === "Oåterkallelig") {
    interpretationText +=
      " Tippingpunkt nära horisonten indikerar en höggradigt oåterkallelig riskprofil.";
  } else if (tippingRiskLevel === "Hög") {
    interpretationText +=
      " Tidig tippingpunkt ger hög risk för negativ spiral i marginalerna.";
  } else if (tippingRiskLevel === "Måttlig") {
    interpretationText +=
      " Tippingpunkten ligger inom, men inte i början av horisonten, vilket indikerar måttlig risk.";
  } else {
    interpretationText +=
      " Ingen tydlig tippingpunkt identifieras inom horisonten, vilket motsvarar låg risk.";
  }

  return {
    structuralStatus,
    deltaMargin,
    tippingStep,
    tippingRiskLevel,
    compression,
    interpretationText,
  };
}

