import { DecisionFlowEngine } from "./engine";

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

  return {
    baseline: engine.baselineSnapshot(),
    final: engine.snapshot(),
    compare: engine.compareToBaseline(),
    consequences: engine.consequencesLog()
  };
}

