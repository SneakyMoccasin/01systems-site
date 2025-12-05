"use client";

import { useState } from "react";
import { useWorld } from "../core/worldState";

export default function ModeSelector() {
  const world = useWorld();
  const [, forceUpdate] = useState(0); // force local re-render when clicking modes

  const modes = [
    { key: "rally", label: "RALLY" },
    { key: "scatter", label: "SCATTER" },
    { key: "line", label: "LINE" },
  ];

  function setMode(m: string) {
    world.currentMode = m;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px 18px",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(0,255,255,0.25)",
        borderRadius: "10px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "1px",
          opacity: 0.75,
          marginBottom: "6px",
        }}
      >
        FORMATIONS
      </div>

      {modes.map((m) => (
        <button
          key={m.key}
          data-dom-ui="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 1) Update current mode in world state
            world.currentMode = m.key;
            world.forceRender?.();             // update HUD
            forceUpdate((x) => x + 1);         // immediately update button highlight

            // 2) Immediately apply formation around the screen centre
            const center = {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            };

            if (m.key === "rally" && world.rally) {
              world.rally(center);
            }
            if (m.key === "scatter" && world.scatter) {
              world.scatter(center);
            }
            if (m.key === "line" && world.lineFormation) {
              world.lineFormation(center);
            }
          }}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid rgba(0,255,255,0.25)",
            background:
              world.currentMode === m.key
                ? "rgba(0,255,255,0.25)"
                : "rgba(0,0,0,0.3)",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
