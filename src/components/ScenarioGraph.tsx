"use client";

import React from "react";

export function ScenarioGraph({
  load,
  cost,
  width = 700,
  height = 300,
}: {
  load: readonly number[];
  cost: readonly number[];
  width?: number;
  height?: number;
}) {
  const allValues = [...load, ...cost];
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

  const loadPoints =
    load.length > 0
      ? load
          .map((v, i) => `${toX(i, load.length)},${toY(v)}`)
          .join(" ")
      : "";
  const costPoints =
    cost.length > 0
      ? cost
          .map((v, i) => `${toX(i, cost.length)},${toY(v)}`)
          .join(" ")
      : "";

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {loadPoints ? (
        <polyline
          points={loadPoints}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1}
        />
      ) : null}
      {load.map((v, i) => (
        <circle
          key={`load-${i}`}
          cx={toX(i, load.length)}
          cy={toY(v)}
          r={2}
          fill="#9ca3af"
        />
      ))}
      {costPoints ? (
        <polyline
          points={costPoints}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={1}
        />
      ) : null}
      {cost.map((v, i) => (
        <circle
          key={`cost-${i}`}
          cx={toX(i, cost.length)}
          cy={toY(v)}
          r={2}
          fill="#60a5fa"
        />
      ))}
    </svg>
  );
}
