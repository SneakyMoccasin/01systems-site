"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { runDecisionFlow } from "@/src/decisionFlow/run";
import { evaluateGoals } from "@/src/decisionFlow/goals";

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

  const marginSeries =
    (result.snapshotExport?.output?.timeSeries?.margin as number[] | undefined) ?? [];
  const baselineMinMargin = marginSeries[0] ?? 0;
  const scenarioMinMargin =
    marginSeries.length > 0 ? Math.min(...marginSeries) : 0;
  const goalResult = evaluateGoals({ baselineMinMargin, scenarioMinMargin });

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
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: 8,
            color: historicalResult.goalStatus === "STABIL" || historicalResult.goalStatus === "ANSTRÄNGD" ? "#86efac" : historicalResult.goalStatus === "INSTABIL" ? "#fcd34d" : "#fca5a5"
          }}>
            Status (absolut): {historicalResult.goalStatus ?? "—"}
          </p>
          {historicalResult.goals?.goalText != null && (
            <>
              {(() => {
                const relStatus = historicalResult.goals.goalStatus;
                const badge =
                  relStatus === "improved"
                    ? "Förbättring mot baseline"
                    : relStatus === "no_deviation"
                    ? "Ingen avvikelse mot baseline"
                    : relStatus === "minor" || relStatus === "serious" || relStatus === "critical"
                    ? "Avvikelse mot baseline"
                    : null;
                const evalColor =
                  relStatus === "improved" || relStatus === "no_deviation"
                    ? "#86efac"
                    : relStatus === "minor"
                    ? "#fcd34d"
                    : "#fca5a5";
                return (
                  <>
                    {badge && (
                      <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>{badge}</p>
                    )}
                    <p style={{ fontSize: 13, opacity: 0.9, color: evalColor, margin: 0 }}>
                      Bedömning (mot baseline): {historicalResult.goals.goalText}
                    </p>
                  </>
                );
              })()}
            </>
          )}
          {historicalResult.goals.debug?.relativeDrop != null && (
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
              Relativ försämring: {(historicalResult.goals.debug.relativeDrop * 100).toFixed(1)}%
            </p>
          )}
          {historicalResult.goals?.debug && (
            <div style={{
              marginTop: 12,
              padding: "8px 10px",
              fontSize: 12,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 6,
              fontFamily: "monospace",
              opacity: 0.8
            }}>
              <div><strong>Goal Debug</strong></div>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(historicalResult.goals.debug, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

