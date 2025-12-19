"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorld } from "../core/worldState";
import PulseButton from "./components/PulseButton";
import PulsePanel from "./components/PulsePanel";

const clickSound = typeof window !== "undefined"
  ? new Audio("/sfx/ui_click_tick.wav")
  : null;

export default function ModeSelector() {
  const router = useRouter();
  const world = useWorld();
  const [, forceUpdate] = useState(0);

  // The three formations we support
  const modes = [
    { key: "rally", label: "RALLY" },
    { key: "scatter", label: "SCATTER" },
    { key: "line", label: "LINE" },
  ];

  function handleClick(mode: "rally" | "scatter" | "line") {
    // 1) Update world mode (React state inside worldState)
    world.setCurrentMode?.(mode);

    // 2) Force re-render of this component so active-mode highlight updates immediately
    forceUpdate((x) => x + 1);

    // 3) Trigger the formation logic inside PixiStage
    window.dispatchEvent(
      new CustomEvent("mode-change", { detail: mode })
    );

    // 4) Ensure HUD updates instantly
    world.forceRender?.();
  }

  return (
    <PulsePanel
      data-dom-ui="true"
      title="FORMATIONS"
      style={{
        width: "200px",
        padding: "12px 0",
        borderRadius: "0",
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {modes.map((m) => (
        <PulseButton
          key={m.key}
          data-dom-ui="true"
          active={world.currentMode === m.key}
          style={{
            fontSize: "12px",
            padding: "6px 10px",
            height: "auto",
            letterSpacing: "0.02em",
            fontWeight: 500,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 1) Update mode in world state
            const mode = m.key as "rally" | "scatter" | "line";
            world.currentMode = mode;
            world.setCurrentMode?.(mode);

            // update UI highlight
            forceUpdate((x) => x + 1);
            world.forceRender?.();

            // 2) Determine center of screen
            const center = {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            };

            // 3) NEW — use applyFormation dispatcher (logs included)
            if (world.applyFormation) {
              world.applyFormation(mode, center);
            }

            // 4) Fire event for HUD + StatusHUD
            window.dispatchEvent(
              new CustomEvent("mode-change", { detail: mode })
            );
          }}
        >
          {m.label}
        </PulseButton>
      ))}

      <div style={{ 
        marginTop: "0", 
        paddingTop: "12px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ 
          padding: "0 16px",
          fontSize: "11px",
          color: "rgba(232,232,232,0.4)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "ui-monospace, monospace",
          fontWeight: 500,
          marginBottom: "6px",
          lineHeight: "1.25",
        }}>
          SIMULATION MODES
        </div>
        <button
          data-dom-ui="true"
          onClick={() => {
            if (clickSound) {
              clickSound.currentTime = 0;
              clickSound.volume = 0.20;
              clickSound.play();
            }
            router.push("/traffic-demo");
          }}
          style={{
            width: "100%",
            padding: "6px 10px",
            background: "transparent",
            border: "none",
            borderLeft: "2px solid transparent",
            borderRadius: "6px",
            cursor: "pointer",
            color: "rgba(232,232,232,0.5)",
            fontWeight: 500,
            fontSize: "12px",
            textAlign: "left",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.02em",
            textShadow: "none",
            boxShadow: "none",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(232,232,232,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(232,232,232,0.5)";
          }}
        >
          TRAFFIC SIM
        </button>
        <button
          data-dom-ui="true"
          onClick={() => {
            if (clickSound) {
              clickSound.currentTime = 0;
              clickSound.volume = 0.20;
              clickSound.play();
            }
            router.push("/waterloo-test");
          }}
          style={{
            width: "100%",
            padding: "6px 10px",
            background: "transparent",
            border: "none",
            borderLeft: "2px solid transparent",
            borderRadius: "6px",
            cursor: "pointer",
            color: "rgba(232,232,232,0.5)",
            fontWeight: 500,
            fontSize: "12px",
            textAlign: "left",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.02em",
            textShadow: "none",
            boxShadow: "none",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(232,232,232,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(232,232,232,0.5)";
          }}
        >
          WATERLOO — BATTLE SIM
        </button>
      </div>
    </PulsePanel>
  );
}
