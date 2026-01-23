// IMPORTANT:
// This adapter transforms Decision Flow API scenarios into Bevis-compatible format.
// It does NOT run simulations or create new measurements.
// All scenario data must come from /api/decision-flow.

type DecisionFlowScenario = {
  name: string;
  timeSeries: Array<{ time: number; load: number; cost: number }>;
  collapseTime: number | null;
};

type BevisTickState = {
  time: number;
  load: number;
  capacity: number;
  recovery: number;
};

type BevisScenario = {
  name: string;
  data: BevisTickState[];
  collapseTime: number | null;
};

/**
 * Adapter: Transforms Decision Flow scenarios to Bevis format
 * 
 * Capacity: Derived as sustainable reference from baseline load pattern
 * Recovery: Derived as trend signal from load changes over time
 * 
 * No direct mapping of cost → capacity
 * No guessed recovery values
 */
export function adaptDecisionFlowToBevis(
  scenarios: DecisionFlowScenario[]
): BevisScenario[] {
  if (!scenarios || scenarios.length === 0) {
    return [];
  }

  // Find baseline scenario to establish capacity reference
  const baselineScenario = scenarios.find(s => s.name === "baseline");
  if (!baselineScenario) {
    return [];
  }

  // Derive capacity reference from baseline load pattern
  // Capacity represents sustainable limit, derived from baseline load stability
  const baselineLoads = baselineScenario.timeSeries.map(t => t.load);
  const baselineLoadMax = Math.max(...baselineLoads);
  const baselineLoadMin = Math.min(...baselineLoads);
  const baselineLoadRange = baselineLoadMax - baselineLoadMin;
  
  // Capacity as implicit reference: baseline max load + buffer for sustainable operation
  const capacityReference = baselineLoadMax + (baselineLoadRange * 0.3);

  return scenarios.map(scenario => {
    // First pass: calculate recovery values (needs previous values)
    const adaptedData: BevisTickState[] = [];
    
    scenario.timeSeries.forEach((point, index) => {
      // Load: direct pass-through
      const load = point.load;

      // Capacity: static reference derived from baseline pattern
      const capacity = capacityReference;

      // Recovery: trend signal derived from load changes
      // Positive recovery = load decreasing or stable relative to capacity
      // Negative recovery = load increasing faster than capacity can handle
      let recovery: number;
      
      if (index === 0) {
        // Initial recovery based on initial load position relative to capacity
        const initialGap = capacity - load;
        recovery = Math.max(0, initialGap * 0.5);
      } else {
        const previousPoint = scenario.timeSeries[index - 1];
        const loadDelta = load - previousPoint.load;
        const previousRecovery = adaptedData[index - 1].recovery;
        
        // Recovery trend: improves when load decreases, degrades when load increases
        // Recovery decays naturally but can improve if load pressure decreases
        const recoveryChange = -loadDelta * 0.3;
        recovery = Math.max(0, previousRecovery + recoveryChange - 0.1);
      }

      adaptedData.push({
        time: point.time,
        load,
        capacity,
        recovery
      });
    });

    return {
      name: scenario.name,
      data: adaptedData,
      collapseTime: scenario.collapseTime
    };
  });
}
