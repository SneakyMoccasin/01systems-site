export type DecisionFlowState = {
  time: number;
  metrics: Record<string, number>;
};

export type DecisionPatch = (state: DecisionFlowState) => void;

export type ConsequenceEvent = {
  time: number;
  metric: string;
  delta: number;
  value: number;
};

export class DecisionFlowEngine {
  private state: DecisionFlowState;
  private baseline: DecisionFlowState;
  private consequences: ConsequenceEvent[] = [];

  constructor(initial: DecisionFlowState) {
    this.state = structuredClone(initial);
    this.baseline = structuredClone(initial);
  }

  applyLoad(load: DecisionPatch) {
    load(this.state);
  }

  applyDecision(decision: DecisionPatch) {
    decision(this.state);
  }

  tick() {
    this.state.time += 1;

    for (const key of Object.keys(this.state.metrics)) {
      const baselineValue = this.baseline.metrics[key] ?? 0;
      const currentValue = this.state.metrics[key];
      const delta = currentValue - baselineValue;

      if (delta !== 0) {
        this.consequences.push({
          time: this.state.time,
          metric: key,
          delta,
          value: currentValue
        });
      }
    }
  }

  run(steps: number) {
    for (let i = 0; i < steps; i++) {
      this.tick();
    }
  }

  snapshot() {
    return structuredClone(this.state);
  }

  baselineSnapshot() {
    return structuredClone(this.baseline);
  }

  consequencesLog() {
    return structuredClone(this.consequences);
  }

  compareToBaseline() {
    const diff: Record<string, number> = {};
    for (const key of Object.keys(this.state.metrics)) {
      diff[key] =
        this.state.metrics[key] -
        (this.baseline.metrics[key] ?? 0);
    }
    return diff;
  }
}

