// Access via browser: http://localhost:3000/api/decision-flow
// Use ← Back in browser to return to Intro (/)

import { runDecisionFlow } from "@/src/decisionFlow/run";

type DecisionFlowInput = {
  baseline?: {
    load?: number;
    cost?: number;
  };
  externalChange?: {
    load?: number;
    cost?: number;
  };
  policy?: "balanced" | "aggressive" | "conservative";
  steps?: number;
  systemLoadState?: string;
  externalPressureTrend?: string;
  primaryResponseStrategy?: string;
};

const BASELINE_LOAD_FRACTION: Record<string, number> = {
  stable: 0.6,
  managing: 0.75,
  pressure: 0.9,
  nearCapacity: 0.98,
};

const EXTERNAL_PRESSURE_DELTA_PER_STEP: Record<string, number> = {
  decreasing: -0.03,
  stable: 0.0,
  fluctuating: 0.01,
  increasing: 0.03,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const policy =
    (searchParams.get("policy") as
      | "balanced"
      | "aggressive"
      | "conservative") ?? "balanced";

  const result = runDecisionFlow({ policy });

  return Response.json(result);
}

export async function POST(request: Request) {
  let body: DecisionFlowInput = {};

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const policy = body.policy ?? "balanced";
  const steps = body.steps ?? 10;
  const systemLoadState = body.systemLoadState ?? "managing";
  const externalPressureTrend = body.externalPressureTrend ?? "stable";

  const externalPressureDeltaPerStep =
    EXTERNAL_PRESSURE_DELTA_PER_STEP[externalPressureTrend] ??
    EXTERNAL_PRESSURE_DELTA_PER_STEP.stable;

  const systemCapacity = {
    maxLoad: 1.0,
    maxCost: 10,
  };

  const externalChange = {
    load: externalPressureDeltaPerStep,
    cost: externalPressureDeltaPerStep,
  };

  // TEMP calibrator: sweep baseline.load scalar k and return table (no normal result)
  if ((body as { _calibrate?: boolean })._calibrate === true) {
    const TARGET_STABLE_MIN_MARGIN = 0.65;
    const kCandidates = [
      0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32,
      0.35, 0.38, 0.42, 0.45,
    ];
    const _calibrationTable: Array<{
      k: number;
      baselineLoad: number;
      minMargin: number | undefined;
      lastMargin: number | undefined;
    }> = [];

    for (const k of kCandidates) {
      const baselineSweep = {
        load: systemCapacity.maxLoad * k,
        cost: systemCapacity.maxCost * 0.8,
      };
      const systemCapacitySweep = systemCapacity;
      const runResult = runDecisionFlow({
        policy,
        steps,
        baseline: baselineSweep,
        externalChange,
        systemCapacity: systemCapacitySweep,
      });
      const marginSeries =
        (runResult as any)?.snapshotExport?.output?.timeSeries?.margin ??
        (runResult as any)?.output?.timeSeries?.margin;
      const minMargin =
        marginSeries?.length > 0 ? Math.min(...marginSeries) : undefined;
      const lastMargin =
        marginSeries?.length > 0 ? marginSeries[marginSeries.length - 1] : undefined;
      _calibrationTable.push({
        k,
        baselineLoad: baselineSweep.load,
        minMargin,
        lastMargin,
      });
    }

    const stableRows = _calibrationTable
      .filter((r) => typeof r.minMargin === "number" && r.minMargin >= TARGET_STABLE_MIN_MARGIN)
      .sort((a, b) => a.k - b.k);

    const recommendedK = stableRows.length > 0 ? stableRows[0].k : null;

    const _debugRunParams = {
      systemLoadState,
      externalPressureTrend,
      primaryResponseStrategy: body.primaryResponseStrategy,
      policy,
      steps,
      baselineLoadFraction: BASELINE_LOAD_FRACTION[systemLoadState],
      externalPressureDeltaPerStep,
    };

    return Response.json({
      _calibrationTable,
      recommendedK,
      target: TARGET_STABLE_MIN_MARGIN,
      _debugRunParams,
      _note: "TEMP calibrator; body._calibrate === true",
    });
  }

  const baseline = {
    load: systemCapacity.maxLoad * (BASELINE_LOAD_FRACTION[systemLoadState] ?? BASELINE_LOAD_FRACTION.managing),
    cost: systemCapacity.maxCost * 0.8,
  };

  const result = runDecisionFlow({
    policy,
    steps,
    baseline,
    externalChange,
    systemCapacity,
  });

  const marginSeries =
    (result as any)?.snapshotExport?.output?.timeSeries?.margin ??
    (result as any)?.output?.timeSeries?.margin;
  const minMargin =
    marginSeries?.length > 0 ? Math.min(...marginSeries) : undefined;
  const maxMargin =
    marginSeries?.length > 0 ? Math.max(...marginSeries) : undefined;
  const lastMargin =
    marginSeries?.length > 0 ? marginSeries[marginSeries.length - 1] : undefined;

  const _calibrationReport = {
    minMargin,
    maxMargin,
    lastMargin,
    baselineLoad: baseline.load,
    baselineCost: baseline.cost,
    externalChangeLoad: externalChange.load,
    externalChangeCost: externalChange.cost,
    policy,
    steps,
    stabilityThreshold:
      "STABIL>=0.6, ANSTRÄNGD>=0.4, INSTABIL>=0.2 (from run.ts)",
  };

  const _debugRunParams = {
    systemLoadState,
    externalPressureTrend,
    primaryResponseStrategy: body.primaryResponseStrategy,
    policy,
    steps,
    baselineLoadFraction: BASELINE_LOAD_FRACTION[systemLoadState],
    externalPressureDeltaPerStep,
  };

  return Response.json({
    ...result,
    _calibrationReport,
    _debugRunParams,
  });
}

