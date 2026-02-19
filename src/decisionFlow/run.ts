import { DecisionFlowEngine } from "./engine";
import { evaluateGoals, PILOT_V5_GOALS } from "./goals";
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
  const marginDelta = compareV2.margin.delta;
  const loadDelta = compareV2.load.delta;

  const marginText =
    marginDelta === 0
      ? "ingen förändring i marginal"
      : marginDelta > 0
      ? `+${marginDelta.toFixed(2)} i marginal`
      : `${marginDelta.toFixed(2)} i marginal`;

  const loadText =
    loadDelta === 0
      ? "oförändrad belastning"
      : loadDelta > 0
      ? `+${loadDelta.toFixed(2)} i belastning`
      : `${loadDelta.toFixed(2)} i belastning`;

  return `Scenariot innebär ${marginText} och ${loadText}.`;
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
};

export function runDecisionFlow(options: RunOptions) {
  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: options.baseline?.load ?? 0.8,
      cost: options.baseline?.cost ?? 8
    }
  });

  // Load / Change
  engine.applyLoad(state => {
    // If externalChange is not provided at all, use calibrated defaults for demo
    // If provided (even with undefined values), use provided values or 0
    if (options.externalChange === undefined) {
      state.metrics.load += 1.2;
      state.metrics.cost += 1.0;
    } else {
      state.metrics.load += options.externalChange.load ?? 0;
      state.metrics.cost += options.externalChange.cost ?? 0;
    }
  });

  // Decision policy
  const policyMultiplier = getPolicyMultiplier(options.policy);
  const demandMultiplier = getDemandMultiplier(options.demandChange ?? 0);
  const finalMultiplier = policyMultiplier * demandMultiplier;
  
  const policyMap = {
    balanced: (state: any) => {
      state.metrics.load -= 0.4 * finalMultiplier;
      state.metrics.cost += 0.8 * finalMultiplier;
    },
    aggressive: (state: any) => {
      state.metrics.load -= 0.4 * finalMultiplier;
      state.metrics.cost += 3.0 * finalMultiplier;
    },
    conservative: (state: any) => {
      state.metrics.load -= 0.9 * finalMultiplier;
      state.metrics.cost += 0.2 * finalMultiplier;
    }
  };

  engine.applyDecision(policyMap[options.policy]);

  engine.run(options.steps ?? 3);

  // Build timeline for goal evaluation
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

  const goalResult = evaluateGoals(timeline, PILOT_V5_GOALS);

  const compare = engine.compareToBaseline();

  const compareV2 = {
    margin: {
      baseline: baseline.metrics.margin,
      final: final.metrics.margin,
      delta: compare.margin
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

  if (compareV2.margin.delta > 0) {
    trend = "IMPROVING";
  } else if (compareV2.margin.delta < 0) {
    trend = "DECLINING";
  } else {
    trend = "STABLE";
  }

  // Pulse Structural Margin v1.0 — per-tick margin from normalized load + cost
  const wL = 0.5;
  const wC = 0.5;
  const maxLoad = Math.max(1, ...timeline.map(t => t.metrics.load));
  const maxCost = Math.max(1, ...timeline.map(t => t.metrics.cost));
  const structuralMarginByTick = timeline.map(t => {
    const normalizedLoad = t.metrics.load / maxLoad;
    const normalizedCost = t.metrics.cost / maxCost;
    const structuralStrain = wL * normalizedLoad + wC * normalizedCost;
    const structuralMargin = 1 - structuralStrain;
    return Math.max(0, Math.min(1, structuralMargin));
  });

  const minMargin = Math.min(...structuralMarginByTick);

  const goalStatus =
    minMargin >= 0.6
      ? "STABIL"
      : minMargin >= 0.4
      ? "ANSTRÄNGD"
      : minMargin >= 0.2
      ? "INSTABIL"
      : "OHÅLLBAR";

  const decisionSummary = {
    comparison: {
      marginChange: compareV2.margin.delta,
      loadChange: compareV2.load.delta,
      costChange: compareV2.cost.delta
    },
    systemState: {
      goalStatus,
      goalWorst: goalResult.worst
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
          margin: final.metrics.margin
        },
        compare,
        steps: options.steps ?? 3,
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
    goalWorst: goalResult.worst
  };
}

