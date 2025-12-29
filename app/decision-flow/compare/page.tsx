"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { runDecisionFlow } from "@/src/decisionFlow/run";
import { evaluateGoals, PILOT_V5_GOALS } from "@/src/decisionFlow/goals";

export default function DecisionFlowComparePage() {
  // Read parameters from URL
  const searchParams = useSearchParams();
  const policy = (searchParams.get("policy") as "conservative" | "balanced" | "aggressive") ?? "balanced";
  const demandChange = Number(searchParams.get("demandChange")) || 0;

  // Define comparison logic
  const leftPolicy = policy;
  
  // Default compareWith based on selected policy
  const defaultCompareWith =
    policy === "conservative"
      ? "aggressive"
      : policy === "balanced"
      ? "aggressive"
      : "conservative";
  
  const [compareWith, setCompareWith] = useState<"conservative" | "balanced" | "aggressive">(defaultCompareWith);
  const rightPolicy = compareWith;

  // Helper function to process a simulation result
  function processResult(
    result: ReturnType<typeof runDecisionFlow>,
    policy: "conservative" | "balanced" | "aggressive",
    demandChange: number
  ) {
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

    // Group consequences by tick
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

    return {
      historicalResult,
      tickGroups,
      policyLabel: {
        conservative: "Försiktig",
        balanced: "Balanserad",
        aggressive: "Aggressiv",
      }[policy],
      demandChange,
    };
  }

  // Run both simulations
  const leftResult = runDecisionFlow({
    policy: leftPolicy,
    demandChange,
  });

  const rightResult = runDecisionFlow({
    policy: rightPolicy,
    demandChange,
  });

  // Process both results
  const left = processResult(leftResult, leftPolicy, demandChange);
  const right = processResult(rightResult, rightPolicy, demandChange);

  // Goal thresholds
  const GOALS = {
    load: 3,
    cost: 13,
  };

  // Helper functions
  function getStatus(value: number, threshold: number) {
    if (value > threshold) return "FAIL";
    if (value >= threshold * 0.9) return "NEAR";
    return "OK";
  }

  function displayStatus(status: "OK" | "NEAR" | "FAIL") {
    if (status === "OK") return "OK";
    if (status === "NEAR") return "NÄRA";
    return "BRUTET";
  }

  function formatDemandChange(value: number): string {
    if (value === 0) return "0 %";
    if (value > 0) return `+${value} %`;
    return `${value} %`;
  }

  function formatDelta(delta: number): string {
    if (delta === 0) return "";
    if (delta > 0) return ` (+${delta})`;
    return ` (${delta})`;
  }

  function getStatusColor(status: string) {
    if (status === "OK") return "#86efac";
    if (status === "NEAR") return "#fbbf24";
    return "#fca5a5";
  }

  // Render a single column (reused for both sides)
  function renderColumn(data: typeof left, title: string) {
    const baselineLoad = data.historicalResult.baseline.metrics.load;
    const baselineCost = data.historicalResult.baseline.metrics.cost;

    return (
      <div style={{ flex: 1 }}>
        <h2 style={{ marginBottom: 24, fontSize: 18 }}>{title}</h2>

        {/* Selected Decision Section */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Valt beslut</h3>
          <div style={{
            padding: 20,
            background: "#1a1f2e",
            border: "1px solid #2f333a",
            borderRadius: 8
          }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Strategi:</strong> {data.policyLabel}
            </p>
            <p>
              <strong>Efterfrågeförändring:</strong> {formatDemandChange(data.demandChange)}
            </p>
          </div>
        </section>

        {/* Baseline Section */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Utgångsläge</h3>
          <div style={{
            padding: 20,
            background: "#1a1f2e",
            border: "1px solid #2f333a",
            borderRadius: 8
          }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Tid:</strong> {data.historicalResult.baseline.time}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Belastning:</strong> {data.historicalResult.baseline.metrics.load}
            </p>
            <p>
              <strong>Kostnad:</strong> {data.historicalResult.baseline.metrics.cost}
            </p>
          </div>
        </section>

        {/* Consequences Over Time Section */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Konsekvenser över tid</h3>
          <div style={{
            padding: 20,
            background: "#1a1f2e",
            border: "1px solid #2f333a",
            borderRadius: 8
          }}>
            {data.tickGroups.map((tick) => {
              const loadStatus = getStatus(tick.load, GOALS.load);
              const costStatus = getStatus(tick.cost, GOALS.cost);
              
              const loadDelta = tick.load - baselineLoad;
              const costDelta = tick.cost - baselineCost;

              return (
                <div key={tick.time} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #2f333a" }}>
                  <h4 style={{ fontSize: 15, marginBottom: 12 }}>Steg {tick.time}</h4>
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

        {/* Summary Section */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Sammanfattning</h3>
          <div style={{
            padding: 20,
            background: "#1a1f2e",
            border: "1px solid #2f333a",
            borderRadius: 8
          }}>
            {data.historicalResult.goals.status === "OK" ? (
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                Denna strategi håller systemet inom definierade gränser för både belastning och kostnad.
              </p>
            ) : data.historicalResult.goals.status === "FAIL" && data.historicalResult.goals.failure ? (
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                {data.historicalResult.goals.failure.metric === "load"
                  ? "Denna strategi driver belastningen över gränsen trots kontrollerad kostnad."
                  : "Denna strategi driver kostnaden över gränsen trots kontrollerad belastning."}
              </p>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                Systemets utveckling under den valda strategin.
              </p>
            )}
          </div>
        </section>

        {/* Goals Section */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Mål</h3>
          <div style={{
            padding: 20,
            background: "#1a1f2e",
            border: "1px solid #2f333a",
            borderRadius: 8
          }}>
            <p style={{
              fontSize: 16,
              fontWeight: 600,
              color: data.historicalResult.goals.status === "STABIL" || data.historicalResult.goals.status === "ANSTRÄNGD" ? "#86efac" : "#fca5a5",
              marginBottom: 12,
              display: "flex",
              alignItems: "center"
            }}>
              Status: {data.historicalResult.goals.status}
              {(() => {
                const defaultGoalStatus =
                  data.historicalResult.goals.status === "STABIL" || data.historicalResult.goals.status === "ANSTRÄNGD"
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
            {data.historicalResult.goals.status === "STABIL" || data.historicalResult.goals.status === "ANSTRÄNGD" ? (
              <p style={{ fontSize: 13, opacity: 0.9 }}>
                {data.historicalResult.goals.status === "STABIL" 
                  ? "Systemet är stabilt och har marginal."
                  : "Systemet fungerar men utan marginal."}
              </p>
            ) : data.historicalResult.goals.status === "INSTABIL" || data.historicalResult.goals.status === "OHÅLLBAR" ? (
              <div style={{ fontSize: 13 }}>
                <p style={{ marginBottom: 8 }}>
                  {data.historicalResult.goals.status === "INSTABIL"
                    ? "Systemet överskrider gränsvärden och kräver åtgärd."
                    : "Systemet är ohållbart och riskerar kollaps."}
                </p>
                {data.historicalResult.goals.worst && (
                  <>
                    <p><strong>Brutet mått:</strong> {data.historicalResult.goals.worst.metric === "load" ? "belastning" : "kostnad"}</p>
                    <p><strong>Värde:</strong> {data.historicalResult.goals.worst.value}</p>
                    <p><strong>Gräns:</strong> {data.historicalResult.goals.worst.threshold}</p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
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
          href="/decision-flow/setup"
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
          ← Ändra beslut
        </Link>
      </div>

      <h1 style={{ marginBottom: 32 }}>Jämförelse</h1>

      {/* Comparison Selection */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#e6edf3" }}>
          Jämför med:
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setCompareWith("conservative")}
            disabled={leftPolicy === "conservative"}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              background: compareWith === "conservative" ? "#2563eb" : "#1a1f2e",
              color: compareWith === "conservative" ? "#ffffff" : "#e6edf3",
              border: "1px solid #2f333a",
              borderRadius: 4,
              cursor: leftPolicy === "conservative" ? "not-allowed" : "pointer",
              opacity: leftPolicy === "conservative" ? 0.5 : 1
            }}
          >
            Försiktig
          </button>
          <button
            onClick={() => setCompareWith("balanced")}
            disabled={leftPolicy === "balanced"}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              background: compareWith === "balanced" ? "#2563eb" : "#1a1f2e",
              color: compareWith === "balanced" ? "#ffffff" : "#e6edf3",
              border: "1px solid #2f333a",
              borderRadius: 4,
              cursor: leftPolicy === "balanced" ? "not-allowed" : "pointer",
              opacity: leftPolicy === "balanced" ? 0.5 : 1
            }}
          >
            Balanserad
          </button>
          <button
            onClick={() => setCompareWith("aggressive")}
            disabled={leftPolicy === "aggressive"}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              background: compareWith === "aggressive" ? "#2563eb" : "#1a1f2e",
              color: compareWith === "aggressive" ? "#ffffff" : "#e6edf3",
              border: "1px solid #2f333a",
              borderRadius: 4,
              cursor: leftPolicy === "aggressive" ? "not-allowed" : "pointer",
              opacity: leftPolicy === "aggressive" ? 0.5 : 1
            }}
          >
            Aggressiv
          </button>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 32,
        alignItems: "flex-start"
      }}>
        {renderColumn(left, left.policyLabel + " strategi")}
        {renderColumn(right, right.policyLabel + " strategi")}
      </div>
    </main>
  );
}

