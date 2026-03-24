import { DecisionFlowEngine } from "./engine";
import { evaluateGoals } from "./goals";
import { METRIC_SEMANTICS } from "./modelSpec";

// STEP 1 — Define policy multiplier
function getPolicyMultiplier(policy: "conservative" | "balanced" | "aggressive"): number {
  switch (policy) {
    case "conservative":
      return 0.75;
    case "balanced":
      return 1.0;
    case "aggressive":
      return 1.25;
  }
}

// Demand multiplier helper
function getDemandMultiplier(demandChange: number): number {
  return 1 + (demandChange / 100);
}

function buildConclusion(compareV2: any): string {
  const rawDeltaChange = compareV2.rawDelta.delta;
  const loadDelta = compareV2.load.delta;

  const rawDeltaText =
    rawDeltaChange === 0
      ? "ingen förändring i rätt delta"
      : rawDeltaChange > 0
      ? `+${rawDeltaChange.toFixed(2)} i rätt delta`
      : `${rawDeltaChange.toFixed(2)} i rätt delta`;

  const loadText =
    loadDelta === 0
      ? "oförändrad belastning"
      : loadDelta > 0
      ? `+${loadDelta.toFixed(2)} i belastning`
      : `${loadDelta.toFixed(2)} i belastning`;

  return `Scenariot innebär ${rawDeltaText} och ${loadText}.`;
}

export type RunOptions = {
  policy: "balanced" | "aggressive" | "conservative";
  steps?: number;
  baseline?: {
    load: number;
    cost: number;
  };
  externalChange?: {
    load: number;
    cost: number;
  };
  demandChange?: number;
  systemCapacity?: {
    maxLoad: number;
    maxCost: number;
  };
};

export function runDecisionFlow(options: RunOptions) {
  const baselineLoad = options.baseline?.load ?? 0.8;
  const baselineCost = options.baseline?.cost ?? 8;
  const capacity = options.systemCapacity ?? {
    maxLoad: Math.max(1, baselineLoad * 1.6),
    maxCost: Math.max(1, baselineCost * 1.5),
  };

  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: baselineLoad,
      cost: baselineCost
    }
  });

  const policyMultiplier = getPolicyMultiplier(options.policy);
  const demandMultiplier = getDemandMultiplier(options.demandChange ?? 0);
  const finalMultiplier = policyMultiplier * demandMultiplier;
  const steps = options.steps ?? 3;

  // Temporal dynamics v0.1: per-tick pressure + gradual recovery (deterministic).
  // External pressure applied every tick; policy response applied every tick with decay.
  const externalLoad = options.externalChange?.load ?? 0;
  const externalCost = options.externalChange?.cost ?? 0;
  const loadDeltaBase: Record<string, number> = {
    conservative: -0.05,
    balanced: -0.02,
    aggressive: 0.01,
  };
  const costDeltaBase: Record<string, number> = {
    conservative: 0.08,
    balanced: 0.15,
    aggressive: 0.30,
  };
  const lBase = loadDeltaBase[options.policy] ?? 0;
  const cBase = costDeltaBase[options.policy] ?? 0;

  for (let tick = 1; tick <= steps; tick++) {
    engine.applyLoad(state => {
      state.metrics.load += externalLoad;
      state.metrics.cost += externalCost;
    });
    const decay = Math.exp(-0.25 * (tick - 1));
    engine.applyDecision(state => {
      state.metrics.load += lBase * finalMultiplier * decay;
      state.metrics.cost += cBase * finalMultiplier * decay;
    });
    engine.applyLoad(state => {
      state.metrics.load = Math.max(0, state.metrics.load);
    });
    engine.run(1);
  }

  // Build timeline for goal evaluation (engine remains source of truth)
  const baseline = engine.baselineSnapshot();
  const final = engine.snapshot();
  const consequences = engine.consequencesLog();

  const timeline: Array<{
    tick: number;
    metrics: { load: number; cost: number };
  }> = [];

  timeline.push({
    tick: baseline.time,
    metrics: {
      load: baseline.metrics.load,
      cost: baseline.metrics.cost,
    },
  });

  const consequencesByTime = new Map<number, { load?: number; cost?: number }>();

  for (const c of consequences) {
    if (!consequencesByTime.has(c.time)) {
      consequencesByTime.set(c.time, {});
    }
    const tickData = consequencesByTime.get(c.time)!;
    if (c.metric === "load") tickData.load = c.value;
    if (c.metric === "cost") tickData.cost = c.value;
  }

  let lastLoad = baseline.metrics.load;
  let lastCost = baseline.metrics.cost;

  for (let tick = 1; tick <= final.time; tick++) {
    const tickData = consequencesByTime.get(tick);
    if (tickData) {
      if (tickData.load !== undefined) lastLoad = tickData.load;
      if (tickData.cost !== undefined) lastCost = tickData.cost;
    }
    timeline.push({
      tick,
      metrics: { load: lastLoad, cost: lastCost },
    });
  }

  const compare = engine.compareToBaseline();

  const compareV2 = {
    rawDelta: {
      baseline: baseline.metrics.rawDelta,
      final: final.metrics.rawDelta,
      delta: compare.rawDelta
    },
    load: {
      baseline: baseline.metrics.load,
      final: final.metrics.load,
      delta: compare.load
    },
    cost: {
      baseline: baseline.metrics.cost,
      final: final.metrics.cost,
      delta: compare.cost
    }
  };

  const conclusion = buildConclusion(compareV2);

  let trend: "IMPROVING" | "DECLINING" | "STABLE";

  if (compareV2.rawDelta.delta > 0) {
    trend = "IMPROVING";
  } else if (compareV2.rawDelta.delta < 0) {
    trend = "DECLINING";
  } else {
    trend = "STABLE";
  }

  // Pulse Structural Margin v1.0 — capacity-based normalization (load/cost vs fixed capacity)
  function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
  }
  const wL = 0.5;
  const wC = 0.5;
  const maxLoadRef = Math.max(1, capacity.maxLoad);
  const maxCostRef = Math.max(1, capacity.maxCost);
  const structuralMarginByTick = timeline.map(t => {
    const normalizedLoad = clamp01(t.metrics.load / maxLoadRef);
    const normalizedCost = clamp01(t.metrics.cost / maxCostRef);
    const structuralStrain = wL * normalizedLoad + wC * normalizedCost;
    const structuralMargin = 1 - structuralStrain;
    return Math.max(0, Math.min(1, structuralMargin));
  });

  const minMargin = Math.min(...structuralMarginByTick);

  // Goal status from post-start consequences only (exclude t=0 baseline)
  const marginPost = structuralMarginByTick.length <= 1 ? [] : structuralMarginByTick.slice(1);
  const minMarginPost = marginPost.length > 0 ? Math.min(...marginPost) : undefined;

  const goalStatus =
    marginPost.length === 0
      ? (minMargin >= 0.6 ? "STABIL" : minMargin >= 0.4 ? "ANSTRÄNGD" : minMargin >= 0.2 ? "INSTABIL" : "OHÅLLBAR")
      : (minMarginPost ?? 0) >= 0.6
      ? "STABIL"
      : (minMarginPost ?? 0) >= 0.4
      ? "ANSTRÄNGD"
      : (minMarginPost ?? 0) >= 0.2
      ? "INSTABIL"
      : "OHÅLLBAR";

  const baselineMinMargin = structuralMarginByTick[0] ?? 0;
  const scenarioMinMargin =
    marginPost.length > 0 ? (minMarginPost ?? 0) : minMargin;
  const goalResult = evaluateGoals({ baselineMinMargin, scenarioMinMargin });

  const decisionSummary = {
    comparison: {
      rawDeltaChange: compareV2.rawDelta.delta,
      loadChange: compareV2.load.delta,
      costChange: compareV2.cost.delta
    },
    systemState: {
      goalStatus,
      goalWorst: undefined,
      goalEvaluation: {
        goalStatus: goalResult.goalStatus,
        goalText: goalResult.goalText,
        ...goalResult.debug,
        capacity: { maxLoad: capacity.maxLoad, maxCost: capacity.maxCost },
      },
    },
    interpretation: {
      trend
    }
  };

  const snapshotExport = {
    meta: {
      model_version: "v0.3",
      scenario_type: "decision-flow",
      deterministic: true,
      generated_at: new Date().toISOString()
    },
    input: options,
    output: {
      baseline,
      final,
      compare,
      compareV2,
      conclusion,
      decisionSummary,
      systemCapacity: capacity,
      timeSeries: {
        load: timeline.map(t => t.metrics.load) as readonly number[],
        cost: timeline.map(t => t.metrics.cost) as readonly number[],
        margin: structuralMarginByTick as readonly number[],
      },
      debug: {
        metricsSemantics: METRIC_SEMANTICS,
        sample: {
          load: final.metrics.load,
          cost: final.metrics.cost,
          rawDelta: final.metrics.rawDelta
        },
        compare,
        steps,
        minMarginPost,
        statusNote: "status computed from minMarginPost (t>=1) using thresholds only",
        warnings: [
          ...(baseline.metrics.load < 0
            ? ["SEMANTICS: baseline.load is negative; load should represent positive pressure."]
            : []),
          ...(final.metrics.load < 0
            ? ["SEMANTICS: final.load is negative; load should represent positive pressure."]
            : []),
          ...(compare.load < 0
            ? ["SEMANTICS: compare.load is negative; load should represent positive pressure."]
            : [])
        ]
      }
    }
  };

  return {
    baseline,
    final,
    compare,
    compareV2,
    conclusion,
    decisionSummary,
    snapshotExport,
    consequences: engine.consequencesLog(),
    goalStatus,
    goalWorst: undefined,
    goalEvaluation: goalResult,
  };
}

