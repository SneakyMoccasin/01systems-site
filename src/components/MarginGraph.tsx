"use client";

import React from "react";

export function MarginGraph({
  margin,
  width = 700,
  height = 260,
}: {
  margin: readonly number[];
  width?: number;
  height?: number;
}) {
  const allValues = [...margin];
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 1;
  const range = rawMax - rawMin || 1;
  const paddingFactor = 0.1;
  const min = rawMin - range * paddingFactor;
  const max = rawMax + range * paddingFactor;
  const scaleRange = max - min;

  const toX = (i: number, n: number) =>
    n <= 1 ? width / 2 : (width * i) / (n - 1);
  const toY = (v: number) =>
    height - ((v - min) / scaleRange) * height;

  const refLines = [0.6, 0.4, 0.2];

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {refLines.map((val) => (
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
      {margin.length > 0 ? (
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth={2.5}
          points={margin
            .map((v, i) => `${toX(i, margin.length)},${toY(v)}`)
            .join(" ")}
        />
      ) : null}
      {margin.map((v, i) => (
        <circle
          key={`margin-${i}`}
          cx={toX(i, margin.length)}
          cy={toY(v)}
          r={3}
          fill="#22c55e"
        />
      ))}
    </svg>
  );
}
