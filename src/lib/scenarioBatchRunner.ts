export async function runScenarioBatch(scenarios: Record<string, unknown>[]) {
  const results: {
    scenario: Record<string, unknown>;
    breach: number | null;
    marginHistory: number[];
  }[] = [];

  for (const scenario of scenarios) {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riskState: scenario,
        simulationHorizon: 16,
      }),
    });

    const data = await response.json();

    results.push({
      scenario,
      breach: data.estimatedTimeToBreach,
      marginHistory: data.marginHistory,
    });
  }

  return results.sort((a, b) => {
    if (a.breach === null) return -1;
    if (b.breach === null) return 1;
    return b.breach - a.breach;
  });
}
