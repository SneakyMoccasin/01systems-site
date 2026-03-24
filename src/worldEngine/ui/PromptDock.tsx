"use client";

import { useState, useRef, useEffect } from "react";
import { useWorld } from "../core/worldState";
import PulseButton from "./components/PulseButton";
import "./components/pulse-ui.css";

export default function PromptDock() {
  const world = useWorld();

  const [input, setInput] = useState("");
  const [showLog, setShowLog] = useState(false);

  // ENDA NYA: logItems = ren text (ingen object object längre)
  const [logItems, setLogItems] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // ------------------------------------------------------------
  // ROTATING PLACEHOLDER
  // ------------------------------------------------------------
  const placeholders = [
    "Try: spawn 5 units",
    "Try: spawn 1 marker",
    "Try: move selected with arrow keys",
    "Try: spawn unit",
    "Try: spawn prop",
    "Try: spawn marker",
    "Try: spawn effect"
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholders.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const activePlaceholder = placeholders[placeholderIndex];

  // ------------------------------------------------------------
  // GLOBAL LOG HOOK – REN TEXT (INGA OBJEKT MER!)
  // ------------------------------------------------------------
  useEffect(() => {
    // === GLOBAL LOG BRIDGE v2 — always works ===
    (window as any).__pulseLog = (msg: string | any, level = "info") => {
      const ts = new Date().toLocaleTimeString("sv-SE", { hour12: false });
      const entry = `[${ts}] ${msg}`;

      // 1) Console fallback (for components that fire before PromptDock exists)
      console.log("[PULSE LOG]", entry);

      // 2) Write into PromptDock once mounted
      setLogItems(prev => [...prev, entry]);
    };
  }, []);

  // ------------------------------------------------------------
  // OPEN LOGS PANEL FUNCTION
  // ------------------------------------------------------------
  const openLogsPanel = () => {
    setShowLog(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__pulseOpenLogs = openLogsPanel;
    }
  }, []);

  // ------------------------------------------------------------
  // AUTO-SCROLL
  // ------------------------------------------------------------
  useEffect(() => {
    if (showLog && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logItems, showLog]);

  // ------------------------------------------------------------
  // SEND COMMAND
  // ------------------------------------------------------------
  const send = () => {
    if (!input.trim()) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }

    const text = input.trim();
    (window as any).__pulseLog("> " + text, "info");

    window.dispatchEvent(
      new CustomEvent("pulse-command", { detail: { msg: text } })
    );

    const lower = text.toLowerCase();
    const parts = lower.split(" ");

    // ------------------------------------------------------
    // MOVE
    // ------------------------------------------------------
    if (parts[0] === "move" && parts.length >= 2) {
      const direction = parts[1];
      let amount: number | undefined;

      if (parts.length >= 3) {
        const num = Number(parts[2]);
        if (!isNaN(num)) amount = num;
      }

      const valid = ["up", "down", "left", "right", "center"];

      if (valid.includes(direction)) {
        world.moveSelected?.(direction, amount);
        setInput("");
        return;
      }
    }

    // ------------------------------------------------------
    // SPAWN MANY + SPAWN 1 FIXAR BÅDA
    // ------------------------------------------------------
    if (parts[0] === "spawn" && parts.length >= 3) {
      const count = parseInt(parts[1], 10);
      let t = parts[2];

      if (t.endsWith("s")) t = t.slice(0, -1);

      const valid = ["unit", "prop", "marker", "effect"];
      if (!isNaN(count) && count > 0 && valid.includes(t)) {
        world.spawnMany?.(t as any, count);
        setInput("");
        return;
      }
    }

    // ------------------------------------------------------
    // FALLBACK → HANDLECOMMAND
    // ------------------------------------------------------
    world.handleCommand?.(text);
    setInput("");
  };

  // ------------------------------------------------------
  // UI RENDER
  // ------------------------------------------------------
  return (
    <div className="pulse-dock-container" style={{ position: "relative" }}>
      <form
        className="pulse-dock"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <audio ref={audioRef} src="/sfx/ui_click_tick.wav" preload="auto" />

        <PulseButton
          type="button"
          className="pulse-logs-btn-inline"
          onClick={() => setShowLog(!showLog)}
        >
          Logs
        </PulseButton>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "0",
            border: "1px solid rgba(120,180,190,0.25)",
            background: "rgba(0,0,0,0.45)",
            color: "#E8E8E8",
            fontSize: "13px",
            fontWeight: "400",
            lineHeight: "1.4",
            outline: "none",
            boxShadow: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />

        <PulseButton type="button" onClick={send}>
          SEND
        </PulseButton>
      </form>

      {/* LOG WINDOW */}
      {showLog && (
        <div
          ref={logRef}
          className="pulse-log-window"
          style={{
            maxHeight: "260px",
            overflowY: "auto",
            marginTop: "8px",
            padding: "10px 12px",
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(120,180,190,0.22)",
            borderRadius: "0",
            backdropFilter: "blur(6px)",
            fontFamily: "ui-monospace, monospace",
            fontSize: "11.5px",
            lineHeight: "1.35",
            whiteSpace: "pre-wrap",
          }}
        >
          {logItems.map((line, i) => {
            const isError = line.toLowerCase().includes("error") || line.toLowerCase().includes("fail");
            return (
              <div 
                key={i} 
                style={{ 
                  color: isError ? "rgba(230,100,100,0.8)" : "#E8E8E8", 
                  marginBottom: "4px", 
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 400 
                }}
              >
                {line}
              </div>
            );
          })}

          <div style={{ marginTop: "12px", textAlign: "right" }}>
            <button
              onClick={() => {
                const blob = new Blob([logItems.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "pulse_logs.txt";
                a.click();
              }}
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(120,180,190,0.22)",
                padding: "4px 10px",
                borderRadius: "0",
                color: "#E8E8E8",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Export Logs
            </button>
          </div>
        </div>
      )}

      <div className="pulse-dock-hints">
        Commands: spawn • move • select • use arrow keys to move selected
      </div>
    </div>
  );
}
