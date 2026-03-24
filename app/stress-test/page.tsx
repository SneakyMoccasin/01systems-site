"use client";

import { useMemo, useState } from "react";

type Point = { t: number; health: number };

function buildPath(data: Point[], width: number, height: number) {
  return data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - d.health * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default function StressTestPage() {
  const [cost, setCost] = useState(35);
  const [load, setLoad] = useState(45);
  const [recovery, setRecovery] = useState(55);
  const [series, setSeries] = useState<Point[]>([]);

  const runSimulation = () => {
    const c = cost / 100;
    const l = load / 100;
    const r = recovery / 100;

    const stress = c * 0.6 + l * 0.8 - r * 0.7;
    console.log("stress", stress);

    const data: Point[] = [];
    for (let t = 0; t <= 60; t++) {
      let health = 1 - stress * t * 0.015;

      if (!Number.isFinite(health)) {
        health = 1;
      }

      health = Math.max(0, Math.min(1, health));

      data.push({ t, health });
    }
    console.log("series", data);
    setSeries(data);
  };

  const safeSeries = useMemo(
    () => series.filter((d) => Number.isFinite(d.health)),
    [series]
  );

  const { cascadeStart, failurePoint } = useMemo(() => {
    const cs =
      safeSeries.length > 0 ? safeSeries.findIndex((d) => d.health < 0.4) : -1;
    const fp =
      safeSeries.length > 0 ? safeSeries.findIndex((d) => d.health < 0.2) : -1;
    return {
      cascadeStart: cs >= 0 ? cs : null,
      failurePoint: fp >= 0 ? fp : null,
    };
  }, [safeSeries]);

  const explanation = useMemo(() => {
    if (series.length === 0) return "";
    if (cascadeStart == null) {
      return "The system remains stable.\n\nCurrent conditions are absorbed without creating cascading effects.";
    }
    if (failurePoint == null) {
      return `A cascade begins around step ${cascadeStart}.\n\nPressure builds beyond what the system can absorb, and effects start to amplify over time.`;
    }
    return `A cascade begins around step ${cascadeStart}.\n\nThe system can no longer absorb the pressure, and effects compound until failure occurs.`;
  }, [series.length, cascadeStart, failurePoint]);

  const keyDriver = useMemo(() => {
    const recoveryWeakness = 100 - recovery;
    const top = Math.max(cost, load, recoveryWeakness);
    if (top === recoveryWeakness) return "Recovery capacity is too low";
    if (top === load) return "System load is too high";
    return "Cost pressure is too high";
  }, [cost, load, recovery]);

  const svgWidth = 600;
  const svgHeight = 200;
  const pathD = useMemo(() => {
    if (safeSeries.length === 0) return "";
    return buildPath(safeSeries, svgWidth, svgHeight);
  }, [safeSeries]);

  const markersClose =
    cascadeStart != null &&
    failurePoint != null &&
    Math.abs(failurePoint - cascadeStart) <= 2;
  const denom = Math.max(1, safeSeries.length - 1);
  const xCascade = cascadeStart != null ? (cascadeStart / denom) * svgWidth : null;
  const xFailure = failurePoint != null ? (failurePoint / denom) * svgWidth : null;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        color: "#0f172a",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          Decision Stress Test
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          marginBottom: 16,
          padding: 14,
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          background: "#ffffff",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#334155",
              marginBottom: 6,
            }}
          >
            <span>Cost Pressure</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{cost}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#334155",
              marginBottom: 6,
            }}
          >
            <span>System Load</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{load}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={load}
            onChange={(e) => setLoad(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#334155",
              marginBottom: 6,
            }}
          >
            <span>Recovery Capacity</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {recovery}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={recovery}
            onChange={(e) => setRecovery(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={runSimulation}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Run simulation
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          background: "#ffffff",
          padding: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#0f172a" }}>
          See when your system starts to fail
        </div>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height={240}
          style={{ display: "block" }}
        >
          {/* Background zones */}
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight - 0.6 * svgHeight}
            fill="rgba(34,197,94,0.12)"
          />
          <text
            x={svgWidth / 2}
            y={(svgHeight - 0.6 * svgHeight) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fill="#14532d"
            opacity={0.95}
          >
            Stable
          </text>
          <rect
            x={0}
            y={svgHeight - 0.6 * svgHeight}
            width={svgWidth}
            height={(svgHeight - 0.4 * svgHeight) - (svgHeight - 0.6 * svgHeight)}
            fill="rgba(234,179,8,0.12)"
          />
          <text
            x={svgWidth / 2}
            y={(svgHeight - 0.6 * svgHeight) + ((svgHeight - 0.4 * svgHeight) - (svgHeight - 0.6 * svgHeight)) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fill="#713f12"
            opacity={0.95}
          >
            At risk
          </text>
          <rect
            x={0}
            y={svgHeight - 0.4 * svgHeight}
            width={svgWidth}
            height={svgHeight - (svgHeight - 0.4 * svgHeight)}
            fill="rgba(239,68,68,0.12)"
          />
          <text
            x={svgWidth / 2}
            y={(svgHeight - 0.4 * svgHeight) + (svgHeight - (svgHeight - 0.4 * svgHeight)) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fill="#7f1d1d"
            opacity={0.95}
          >
            System failure
          </text>

          {/* Cascade marker */}
          {cascadeStart != null && safeSeries.length > 1 && (
            <>
              <line
                x1={xCascade as number}
                x2={xCascade as number}
                y1={0}
                y2={svgHeight}
                stroke="#ef4444"
                strokeWidth={3}
                opacity={1}
              />
              <rect
                x={(xCascade as number) - 46}
                y={2}
                width={92}
                height={30}
                rx={6}
                fill="white"
                opacity={0.92}
              />
              <text
                x={xCascade as number}
                y={14}
                textAnchor="middle"
                fontSize={11}
                fill="#991b1b"
              >
                Cascade starts
              </text>
              <text
                x={xCascade as number}
                y={markersClose ? 26 : 26}
                textAnchor="middle"
                fontSize={10}
                fill="#991b1b"
                opacity={0.9}
              >
                (effects begin to amplify)
              </text>
            </>
          )}

          {/* Failure marker */}
          {failurePoint != null && safeSeries.length > 1 && (
            <>
              <line
                x1={xFailure as number}
                x2={xFailure as number}
                y1={0}
                y2={svgHeight}
                stroke="#991b1b"
                strokeWidth={3}
                opacity={0.9}
              />
              <rect
                x={(xFailure as number) - 60 + (markersClose ? 10 : 0)}
                y={markersClose ? 26 : 22}
                width={120}
                height={30}
                rx={6}
                fill="white"
                opacity={0.92}
              />
              <text
                x={(xFailure as number) + (markersClose ? 10 : 0)}
                y={markersClose ? 38 : 34}
                textAnchor="middle"
                fontSize={11}
                fill="#991b1b"
              >
                System failure
              </text>
              <text
                x={(xFailure as number) + (markersClose ? 10 : 0)}
                y={markersClose ? 50 : 46}
                textAnchor="middle"
                fontSize={10}
                fill="#991b1b"
                opacity={0.9}
              >
                (no recovery possible)
              </text>
            </>
          )}

          {/* Series */}
          {safeSeries.length > 0 && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="black"
                strokeWidth="4"
              />
              <circle
                cx={svgWidth}
                cy={svgHeight - safeSeries[safeSeries.length - 1].health * svgHeight}
                r={4}
                fill="black"
              />
            </>
          )}
        </svg>
        <div style={{ marginTop: 12, color: "#334155", fontSize: 13, lineHeight: 1.4, whiteSpace: "pre-line" }}>
          {explanation}
        </div>
        <div style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>
          Primary driver: <span style={{ fontWeight: 600, color: "#0f172a" }}>{keyDriver}</span>
        </div>
      </div>
    </div>
  );
}

