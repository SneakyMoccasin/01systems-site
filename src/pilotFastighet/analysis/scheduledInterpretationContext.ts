export function buildScheduledInterpretationContext(value: any): string {
  if (
    value?.mode !== "actions-over-time" ||
    value.naturalCompletion !== true ||
    !Array.isArray(value.plannedSchedules?.A) ||
    !Array.isArray(value.plannedSchedules?.B) ||
    !Array.isArray(value.executedProvenance?.A) ||
    !Array.isArray(value.executedProvenance?.B)
  ) {
    throw new Error("Scheduled interpretation requires a naturally completed, scenario-specific execution context.");
  }
  const compactExecution = (entry: any) => ({
    actionId: entry.actionId,
    scheduledStep: entry.scheduledStep,
    actualExecutionStep: entry.actualExecutionStep,
  });
  const analyticalFacts = {
    horizon: value.horizon,
    naturalCompletion: true,
    plannedSchedules: value.plannedSchedules,
    executedProvenance: {
      A: value.executedProvenance.A.map(compactExecution),
      B: value.executedProvenance.B.map(compactExecution),
    },
    fairComparisonFacts: value.fairComparisonFacts,
  };
  return `\n\nSCHEDULED EXECUTION CONTEXT (authoritative analytical facts):
${JSON.stringify(analyticalFacts, null, 2)}

Safety rules:
- Scenario A and Scenario B use their supplied planned schedules and actual execution records; never mix them.
- Distinguish planned actions from executed actions. Compare timing or order only when these records support it.
- Never infer execution time from cascade depth, cascade events, or array position.
- Do not claim a simultaneous-action overload penalty. This engine has no separate implementation-capacity or concurrency-cost mechanic.
- Do not claim timing caused a difference when initial states or canonical action sets differ.
- Use the supplied fair-comparison facts, including whether initial states and canonical action sets are identical and whether differences are timing/order-only.
- Describe adverse-first versus mitigation-first ordering only when the supplied records establish it.
- Do not recommend a best decision beyond the analytical evidence. Human judgement remains required.`;
}
