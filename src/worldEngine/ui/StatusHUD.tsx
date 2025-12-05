"use client";

import { useEffect, useState } from "react";
import { useWorld } from "../core/worldState";

export default function StatusHUD() {
  const { currentMode } = useWorld();
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    function onSelect(e: any) {
      if (!e?.detail) {
        setSelectedCount(0);
        return;
      }
      setSelectedCount(1);
    }

    function onClear() {
      setSelectedCount(0);
    }

    window.addEventListener("entity-selected", onSelect);
    window.addEventListener("entity-cleared", onClear);

    return () => {
      window.removeEventListener("entity-selected", onSelect);
      window.removeEventListener("entity-cleared", onClear);
    };
  }, []);

  return (
    <div data-dom-ui="true" className="pulse-panel hud-panel">
      <div className="hud-label">MODE</div>
      <div className="hud-value">
        {currentMode === "wake" ? "" : currentMode?.toUpperCase()}
      </div>

      <div className="hud-label">SELECTED</div>
      <div className="hud-value">{selectedCount}</div>

      <div className="hud-note">
        Formations apply to units only
      </div>
    </div>
  );
}
