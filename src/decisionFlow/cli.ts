import { runDecisionFlow } from "./run";
import { evaluateGoals, evaluateDefaultGoal } from "./goals";

const policy =
  (process.argv[2] as "balanced" | "aggressive" | "conservative") ??
  "balanced";

const demandChange = process.argv[3] ? Number(process.argv[3]) : 0;

const result = runDecisionFlow({ policy, demandChange });

const marginSeries =
  (result.snapshotExport?.output?.timeSeries?.margin as number[] | undefined) ?? [];
const baselineMinMargin = marginSeries[0] ?? 0;
const scenarioMinMargin =
  marginSeries.length > 0 ? Math.min(...marginSeries) : 0;

const goalResult = evaluateGoals({ baselineMinMargin, scenarioMinMargin });
const defaultGoal = evaluateDefaultGoal(
  result.goalStatus as "STABIL" | "ANSTRÄNGD" | "INSTABIL" | "OHÅLLBAR"
);

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


