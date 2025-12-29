"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { runDecisionFlow } from "@/src/decisionFlow/run";
import { evaluateGoals, PILOT_V5_GOALS } from "@/src/decisionFlow/goals";

export default function DecisionFlowHistoryPage() {
  // STEP 1 — Read query parameters
  const searchParams = useSearchParams();
  const policy = (searchParams.get("policy") as "conservative" | "balanced" | "aggressive") ?? "balanced";
  const demandChange = Number(searchParams.get("demandChange")) || 0;

  // Map policy to Swedish label
  const policyLabel = {
    conservative: "Försiktig",
    balanced: "Balanserad",
    aggressive: "Aggressiv",
  }[policy];

  // STEP 3 — Helper function for formatting demand change (presentation only)
  function formatDemandChange(value: number): string {
    if (value === 0) return "0 %";
    if (value > 0) return `+${value} %`;
    return `${value} %`;
  }

  // Run the simulation
  const result = runDecisionFlow({ policy, demandChange });

  // Build timeline for goal evaluation
  const timeline: Array<{
    tick: number;
    metrics: { load: number; cost: number };
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

  // Combine result with goals
  const historicalResult = {
    ...result,
    goals: goalResult,
  };

  // STEP 1 — Define goal thresholds locally (read-only)
  const GOALS = {
    load: 3,
    cost: 13,
  };

  // STEP 2 — Add a helper to classify status
  function getStatus(value: number, threshold: number) {
    if (value > threshold) return "FAIL";
    if (value >= threshold * 0.9) return "NEAR";
    return "OK";
  }

  // Presentation-only translator for status display
  function displayStatus(status: "OK" | "NEAR" | "FAIL") {
    if (status === "OK") return "OK";
    if (status === "NEAR") return "NÄRA";
    return "BRUTET";
  }

  // STEP 3 — Group consequences by tick
  const consequencesByTick = new Map<number, { load?: number; cost?: number }>();
  for (const c of historicalResult.consequences) {
    if (!consequencesByTick.has(c.time)) {
      consequencesByTick.set(c.time, {});
    }
    const tickData = consequencesByTick.get(c.time)!;
    if (c.metric === "load") {
      tickData.load = c.value;
    } else if (c.metric === "cost") {
      tickData.cost = c.value;
    }
  }

  const tickGroups = Array.from(consequencesByTick.entries())
    .map(([time, metrics]) => ({
      time,
      load: metrics.load ?? historicalResult.baseline.metrics.load,
      cost: metrics.cost ?? historicalResult.baseline.metrics.cost,
    }))
    .sort((a, b) => a.time - b.time);

  // STEP 1 — Read baseline values once
  const baselineLoad = historicalResult.baseline.metrics.load;
  const baselineCost = historicalResult.baseline.metrics.cost;

  // Helper function to format delta (presentation only)
  function formatDelta(delta: number): string {
    if (delta === 0) return "";
    if (delta > 0) return ` (+${delta})`;
    return ` (${delta})`;
  }

  return (
    <main style={{
      background: "#0e1117",
      color: "#e6edf3",
      minHeight: "100vh",
      padding: 32
    }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/decision-flow/setup"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            fontSize: 14
          }}
        >
          ← Tillbaka till beslutsflöde
        </Link>
        <Link
          href={`/decision-flow/compare?policy=${policy}&demandChange=${demandChange}`}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 4,
            textDecoration: "none",
            cursor: "pointer"
          }}
        >
          ↔ Jämför strategier
        </Link>
      </div>

      <h1 style={{ marginBottom: 32 }}>Historiskt beslut</h1>

      {/* Selected Decision Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginBottom: 16 }}>Valt beslut</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Strategi:</strong> {policyLabel}
          </p>
          <p>
            <strong>Efterfrågeförändring:</strong> {formatDemandChange(demandChange)}
          </p>
        </div>
      </section>

      {/* Baseline Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginBottom: 16 }}>Utgångsläge</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Tid:</strong> {historicalResult.baseline.time}
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Belastning:</strong> {historicalResult.baseline.metrics.load}
          </p>
          <p>
            <strong>Kostnad:</strong> {historicalResult.baseline.metrics.cost}
          </p>
        </div>
      </section>

      {/* Consequences Over Time Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginBottom: 16 }}>Konsekvenser över tid</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          {tickGroups.map((tick) => {
            const loadStatus = getStatus(tick.load, GOALS.load);
            const costStatus = getStatus(tick.cost, GOALS.cost);
            
            // STEP 2 — Calculate deltas from baseline
            const loadDelta = tick.load - baselineLoad;
            const costDelta = tick.cost - baselineCost;
            
            const getStatusColor = (status: string) => {
              if (status === "OK") return "#86efac";
              if (status === "NEAR") return "#fbbf24";
              return "#fca5a5";
            };

            return (
              <div key={tick.time} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #2f333a" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Steg {tick.time}</h3>
                <div style={{ marginLeft: 16 }}>
                  <p style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>belastning:</strong>{" "}
                    <span style={{ color: getStatusColor(loadStatus) }}>
                      {tick.load} / {GOALS.load} → {displayStatus(loadStatus)}{formatDelta(loadDelta)}
                    </span>
                  </p>
                  <p style={{ fontSize: 13 }}>
                    <strong>kostnad:</strong>{" "}
                    <span style={{ color: getStatusColor(costStatus) }}>
                      {tick.cost} / {GOALS.cost} → {displayStatus(costStatus)}{formatDelta(costDelta)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goals Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginBottom: 16 }}>Mål</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          <p style={{
            fontSize: 16,
            fontWeight: 600,
            color: historicalResult.goals.status === "STABIL" || historicalResult.goals.status === "ANSTRÄNGD" ? "#86efac" : "#fca5a5",
            marginBottom: 12,
            display: "flex",
            alignItems: "center"
          }}>
            Status: {historicalResult.goals.status}
            {(() => {
              const defaultGoalStatus =
                historicalResult.goals.status === "STABIL" || historicalResult.goals.status === "ANSTRÄNGD"
                  ? "OK"
                  : "EJ_OK";
              return (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    marginLeft: 8,
                    background: defaultGoalStatus === "OK" ? "#dcfce7" : "#fee2e2",
                    color: defaultGoalStatus === "OK" ? "#166534" : "#7f1d1d"
                  }}
                >
                  {defaultGoalStatus === "OK" ? "OK" : "EJ OK"}
                </span>
              );
            })()}
          </p>
          {historicalResult.goals.status === "STABIL" || historicalResult.goals.status === "ANSTRÄNGD" ? (
            <p style={{ fontSize: 13, opacity: 0.9 }}>
              {historicalResult.goals.status === "STABIL" 
                ? "Systemet är stabilt och har marginal."
                : "Systemet fungerar men utan marginal."}
            </p>
          ) : historicalResult.goals.status === "INSTABIL" || historicalResult.goals.status === "OHÅLLBAR" ? (
            <div style={{ fontSize: 13 }}>
              <p style={{ marginBottom: 8 }}>
                {historicalResult.goals.status === "INSTABIL"
                  ? "Systemet överskrider gränsvärden och kräver åtgärd."
                  : "Systemet är ohållbart och riskerar kollaps."}
              </p>
              {historicalResult.goals.worst && (
                <>
                  <p><strong>Brutet mått:</strong> {historicalResult.goals.worst.metric === "load" ? "belastning" : "kostnad"}</p>
                  <p><strong>Värde:</strong> {historicalResult.goals.worst.value}</p>
                  <p><strong>Gräns:</strong> {historicalResult.goals.worst.threshold}</p>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

