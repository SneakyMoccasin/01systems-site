import { runDecisionFlow } from "./run";
import { evaluateGoals, PILOT_V5_GOALS, evaluateDefaultGoal } from "./goals";

const policy =
  (process.argv[2] as "balanced" | "aggressive" | "conservative") ??
  "balanced";

const demandChange = process.argv[3] ? Number(process.argv[3]) : 0;

const result = runDecisionFlow({ policy, demandChange });

// Build timeline for goal evaluation
const timeline: Array<{
  tick: number;
  metrics: {
    load: number;
    cost: number;
  };
}> = [];

// Start with baseline at tick 0
timeline.push({
  tick: result.baseline.time,
  metrics: {
    load: result.baseline.metrics.load,
    cost: result.baseline.metrics.cost,
  },
});

// Group consequences by time and reconstruct full state per tick
const consequencesByTime = new Map<number, { load?: number; cost?: number }>();
for (const c of result.consequences) {
  if (!consequencesByTime.has(c.time)) {
    consequencesByTime.set(c.time, {});
  }
  const tickData = consequencesByTime.get(c.time)!;
  if (c.metric === "load") {
    tickData.load = c.value;
  } else if (c.metric === "cost") {
    tickData.cost = c.value;
  }
}

// Build timeline from consequences, using previous values for missing metrics
let lastLoad = result.baseline.metrics.load;
let lastCost = result.baseline.metrics.cost;

for (let tick = 1; tick <= result.final.time; tick++) {
  const tickData = consequencesByTime.get(tick);
  if (tickData) {
    if (tickData.load !== undefined) lastLoad = tickData.load;
    if (tickData.cost !== undefined) lastCost = tickData.cost;
  }
  timeline.push({
    tick,
    metrics: {
      load: lastLoad,
      cost: lastCost,
    },
  });
}

// Evaluate goals
const goalResult = evaluateGoals(timeline, PILOT_V5_GOALS);

// Evaluate default goal (presentation layer)
const defaultGoal = evaluateDefaultGoal(goalResult.status);

console.log(
  JSON.stringify(
    {
      ...result,
      goals: goalResult,
      defaultGoal,
    },
    null,
    2
  )
);


