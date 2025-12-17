import { DecisionFlowEngine } from "./engine";

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
};

export function runDecisionFlow(options: RunOptions) {
  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: options.baseline?.load ?? 1,
      cost: options.baseline?.cost ?? 10
    }
  });

  // Load / Change
  engine.applyLoad(state => {
    // If externalChange is not provided at all, use original defaults (3, 2) for GET compatibility
    // If provided (even with undefined values), use provided values or 0
    if (options.externalChange === undefined) {
      state.metrics.load += 3;
      state.metrics.cost += 2;
    } else {
      state.metrics.load += options.externalChange.load ?? 0;
      state.metrics.cost += options.externalChange.cost ?? 0;
    }
  });

  // Decision policy
  const policyMap = {
    balanced: (state: any) => {
      state.metrics.load -= 1;
      state.metrics.cost += 1;
    },
    aggressive: (state: any) => {
      state.metrics.load -= 2;
      state.metrics.cost += 3;
    },
    conservative: (state: any) => {
      state.metrics.load -= 0.5;
      state.metrics.cost += 0.5;
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

