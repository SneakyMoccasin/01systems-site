"use client";

import React from "react";

function buildBaselineSeries(margins: readonly number[]): number[] {
  const base = margins[0] ?? 0;
  return new Array(margins.length).fill(base);
}

function buildDeltaSeries(margins: readonly number[]): number[] {
  const base = margins[0] ?? 0;
  return margins.map((m) => m - base);
}

const sustainLevel = 70;
// Sanity: sustainLevel === 70 (0..100 scale). value100[i] = margin[i] * 100 (engine margin 0..1).

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function MarginGraph({
  margin,
  width = 700,
  height = 260,
}: {
  margin: readonly number[];
  width?: number;
  height?: number;
}) {
  const value100 = margin.map((v, i) => (margin[i] ?? 0) * 100);
  const seriesMin =
    value100.length > 0 ? Math.min(...value100) : 0;
  const seriesMax =
    value100.length > 0 ? Math.max(...value100) : 100;
  const spread = seriesMax - seriesMin;

  let yMin: number;
  let yMax: number;
  if (spread < 20) {
    const padding = 5;
    yMin = clamp(seriesMin - padding, 0, 100);
    yMax = clamp(seriesMax + padding, 0, 100);
    if (yMax - yMin < 10) {
      const half = (10 - (yMax - yMin)) / 2;
      yMin = clamp(yMin - half, 0, 100);
      yMax = clamp(yMax + half, 0, 100);
    }
  } else {
    yMin = 0;
    yMax = 100;
  }

  const scaleRange = yMax - yMin;
  const toX = (i: number, n: number) =>
    n <= 1 ? width / 2 : (width * i) / (n - 1);
  const toY = (v: number) =>
    height - ((v - yMin) / scaleRange) * height;

  const baselineMargin = margin.length > 0 ? (margin[0] ?? 0) : 0;
  const baselineValue100 = baselineMargin * 100;
  const yBaseline = toY(baselineValue100);

  const refLines = [60, 40, 20];
  const ySustain = toY(sustainLevel);
  const yZero = toY(0);

  const bufferFill = "rgba(0, 200, 120, 0.08)";
  const erosionFill = "rgba(255, 90, 90, 0.07)";
  const aboveBaselineFill = "rgba(0, 200, 120, 0.14)";
  const belowBaselineFill = "rgba(255, 90, 90, 0.14)";

  const deltaSegmentPolygons: Array<{ points: string; fill: string }> = [];
  for (let i = 0; i < margin.length - 1; i++) {
    const value100_1 = (margin[i] ?? 0) * 100;
    const value100_2 = (margin[i + 1] ?? 0) * 100;
    const x1 = toX(i, margin.length);
    const x2 = toX(i + 1, margin.length);
    const yCurve1 = toY(value100_1);
    const yCurve2 = toY(value100_2);
    const midAboveBaseline = (value100_1 + value100_2) / 2 > baselineValue100;
    const points = `${x1},${yBaseline} ${x2},${yBaseline} ${x2},${yCurve2} ${x1},${yCurve1}`;
    deltaSegmentPolygons.push({
      points,
      fill: midAboveBaseline ? aboveBaselineFill : belowBaselineFill,
    });
  }

  const segmentPolygons: Array<{ points: string; fill: string }> = [];
  for (let i = 0; i < margin.length - 1; i++) {
    const value100_1 = (margin[i] ?? 0) * 100;
    const value100_2 = (margin[i + 1] ?? 0) * 100;
    const x1 = toX(i, margin.length);
    const x2 = toX(i + 1, margin.length);
    const yCurve1 = toY(value100_1);
    const yCurve2 = toY(value100_2);
    const points = `${x1},${ySustain} ${x2},${ySustain} ${x2},${yCurve2} ${x1},${yCurve1}`;
    const fill =
      value100_1 >= sustainLevel && value100_2 >= sustainLevel
        ? bufferFill
        : value100_1 < sustainLevel && value100_2 < sustainLevel
          ? erosionFill
          : value100_1 >= sustainLevel
            ? bufferFill
            : erosionFill;
    segmentPolygons.push({ points, fill });
  }

  const buffers = value100.map((v) => v - sustainLevel);
  const currentBuffer = buffers.length > 0 ? buffers[buffers.length - 1] : 0;
  const minBuffer = buffers.length > 0 ? Math.min(...buffers) : 0;
  const firstBelowIndex =
    buffers.length > 0
      ? buffers.findIndex((b) => b < 0) !== -1
        ? buffers.findIndex((b) => b < 0)
        : null
      : null;
  const cumulativeNegative = buffers.reduce(
    (acc, b) => acc + (b < 0 ? -b : 0),
    0
  );

  return (
    <>
      <svg
        width={width}
        height={height}
        style={{
          display: "block",
          background: "rgba(255,255,255,0.96)",
          borderRadius: "8px",
        }}
      >
        {deltaSegmentPolygons.map((seg, idx) => (
          <polygon
            key={`delta-${idx}`}
            points={seg.points}
            fill={seg.fill}
          />
        ))}
        {segmentPolygons.map((seg, idx) => (
          <polygon
            key={`seg-${idx}`}
            points={seg.points}
            fill={seg.fill}
          />
        ))}
        <line
          x1={0}
          y1={yZero}
          x2={width}
          y2={yZero}
          stroke="rgba(0,0,0,0.2)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        {margin.length > 0 && (
          <line
            x1={0}
            y1={yBaseline}
            x2={width}
            y2={yBaseline}
            stroke="rgba(100, 150, 255, 0.9)"
            strokeDasharray="8 4"
            strokeWidth={1.5}
          />
        )}
        {margin.length > 0 && (
          <text
            x={width - 4}
            y={yBaseline - 4}
            textAnchor="end"
            fontSize="10"
            fill="rgba(100, 150, 255, 0.95)"
          >
            Baseline
          </text>
        )}
        {sustainLevel >= yMin && sustainLevel <= yMax && (
          <line
            x1={0}
            y1={ySustain}
            x2={width}
            y2={ySustain}
            stroke="rgba(200,200,200,0.6)"
            strokeDasharray="6 6"
            strokeWidth={2}
          />
        )}
        {refLines
          .filter((val) => val >= yMin && val <= yMax)
          .map((val) => (
          <line
            key={`ref-${val}`}
            x1={0}
            y1={toY(val)}
            x2={width}
            y2={toY(val)}
            stroke="#2f333a"
            strokeDasharray="2 4"
            strokeWidth={0.8}
          />
        ))}
        {spread < 20 && (
          <text
            x={8}
            y={14}
            fill="rgba(0,0,0,0.65)"
            fontSize={11}
          >
            {`Zoomed: ${yMin.toFixed(0)}–${yMax.toFixed(0)}%`}
          </text>
        )}
        {margin.length > 0 ? (
          <>
            <polyline
              fill="none"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={4}
              points={margin
                .map((v, i) => `${toX(i, margin.length)},${toY((margin[i] ?? 0) * 100)}`)
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="rgba(34,197,94,0.95)"
              strokeWidth={2.5}
              points={margin
                .map((v, i) => `${toX(i, margin.length)},${toY((margin[i] ?? 0) * 100)}`)
                .join(" ")}
            />
          </>
        ) : null}
        {margin.map((v, i) => (
          <circle
            key={`margin-${i}`}
            cx={toX(i, margin.length)}
            cy={toY((margin[i] ?? 0) * 100)}
            r={4}
            fill="rgba(34,197,94,0.95)"
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>

      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "#1a1a1a",
          border: "1px solid #2f333a",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#9ca3af",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#e6edf3",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Strukturell flexibilitet
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Aktuell buffert</span>
            <span style={{ color: "#e6edf3" }}>{Math.round(currentBuffer)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Lägsta buffert</span>
            <span style={{ color: "#e6edf3" }}>{Math.round(minBuffer)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Första underskridande</span>
            <span style={{ color: "#e6edf3" }}>
              {firstBelowIndex !== null ? `År ${firstBelowIndex + 1}` : "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Ackumulerad erosion</span>
            <span style={{ color: "#e6edf3" }}>
              {Math.round(cumulativeNegative)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
