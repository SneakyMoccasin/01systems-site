"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useWorld } from "@/worldEngine/core/worldState";

// PixiStage must run client-side only
const PixiStage = dynamic(
  () => import("@/worldEngine/visual2d/PixiStage"),
  { ssr: false }
);

// UI v1 locked for demo – visual changes frozen
// UI components
import ModeSelector from "@/worldEngine/ui/ModeSelector";
import SpawnDock from "@/worldEngine/ui/SpawnDock";
import PromptDock from "@/worldEngine/ui/PromptDock";
import SelectionHUD from "@/worldEngine/ui/SelectionHUD";
import CommandFeedbackHUD from "@/worldEngine/ui/CommandFeedbackHUD";
import ScreenBoundsHUD from "@/worldEngine/ui/ScreenBoundsHUD";
import RightHUDStack from "@/worldEngine/ui/RightHUDStack";
import WaterlooPanel from "@/worldEngine/ui/WaterlooPanel";

export default function PlayPage() {
  const [worldReady, setWorldReady] = useState(false);
  const world = useWorld();

  useEffect(() => {
    if (world) {
      setWorldReady(true);
    }
  }, [world]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "#02040a",
      }}
    >
      {/* PIXI CANVAS — ALWAYS */}
      <PixiStage />

      {/* UI OVERLAY — ONLY WHEN WORLD IS READY */}
      {worldReady && world.uiVisible && (
        <>
          <div style={{ position: "absolute", top: 18, left: 18, zIndex: 10000 }}>
            <ModeSelector />
          </div>

          <WaterlooPanel />
          <RightHUDStack>
            <SelectionHUD />
            <CommandFeedbackHUD />
            <ScreenBoundsHUD />
          </RightHUDStack>

          <div style={{ position: "absolute", bottom: 120, left: 18, zIndex: 10000 }}>
            <SpawnDock />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10000,
            }}
          >
            {false && (
            <PromptDock />
          )}
          </div>

          {/* Engine Status Indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              zIndex: 10000,
              fontFamily: "ui-monospace, monospace",
              fontSize: "10px",
              color: "#E8E8E8",
              opacity: 0.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              lineHeight: "1.4",
              textAlign: "right",
              pointerEvents: "none",
            }}
          >
            <div>ENGINE STATUS</div>
            <div style={{ marginTop: "2px" }}>RUNNING (HEADLESS-READY)</div>
            <div style={{ marginTop: "2px" }}>UI CONNECTED AS CLIENT</div>
          </div>
        </>
      )}
    </div>
  );
}
