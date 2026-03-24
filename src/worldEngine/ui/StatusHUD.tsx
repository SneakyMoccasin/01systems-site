"use client";

import { useEffect, useState } from "react";

export default function StatusHUD() {
  const [mode, setMode] = useState<string>("none");
  const [selected, setSelected] = useState<string>("none");

  useEffect(() => {
    function onModeChange(e: any) {
      setMode(e.detail);
    }
    window.addEventListener("mode-change", onModeChange);

    function onSelect(e: any) {
      setSelected(e.detail);
    }
    window.addEventListener("entity-selected", onSelect);

    return () => {
      window.removeEventListener("mode-change", onModeChange);
      window.removeEventListener("entity-selected", onSelect);
    };
  }, []);

  const hasData = mode !== "none" || selected !== "none";
  
  return (
    <div
      style={{
        width: "260px",
        padding: "10px 12px",
        background: "rgba(0,0,0,0.30)",
        border: "1px solid rgba(120,180,190,0.22)",
        borderRadius: "0",
        color: hasData ? "#E8E8E8" : "rgba(232,232,232,0.4)",
        fontSize: "13px",
        fontFamily: "ui-monospace, monospace",
        fontWeight: 400,
        lineHeight: "1.35",
        letterSpacing: "0.02em",
        boxShadow: "none",
      }}
    >
      <div style={{ marginBottom: "4px" }}><span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 500, letterSpacing: "0.08em" }}>MODE:</span> <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em" }}>{mode !== "none" ? mode.toUpperCase() : "—"}</span></div>
      <div><span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 500, letterSpacing: "0.08em" }}>SELECTED:</span> <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em" }}>{selected !== "none" ? selected : "—"}</span></div>
    </div>
  );
}
