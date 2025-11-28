"use client";

import { useState, useEffect, useRef } from "react";
import { useWorld } from "../core/worldState";
import { findDynamicSpreadPosition } from "../core/poissonHelper";

export default function PromptDock() {
  const { addEntity, deleteEntity, clearEntities, memory, forceRender } = useWorld();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [hoveredSend, setHoveredSend] = useState(false);
  const [shimmerSend, setShimmerSend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for selection events from PixiStage
  useEffect(() => {
    function handler(e: any) {
      (window as any).__selectedEntity = e.detail;
    }
    window.addEventListener("entity-selected", handler);
    return () => window.removeEventListener("entity-selected", handler);
  }, []);

  // --- ARROW KEY MOVEMENT ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const id = (window as any).__selectedEntity;
      if (!id) return;

      const ent = memory.entities.find((x) => x.id === id);
      if (!ent || !ent.transform) return;

      const step = 22;

      if (e.key === "ArrowLeft") ent.transform.x -= step;
      if (e.key === "ArrowRight") ent.transform.x += step;
      if (e.key === "ArrowUp") ent.transform.y -= step;
      if (e.key === "ArrowDown") ent.transform.y += step;

      if (ent.ai) {
        ent.ai.targetX = ent.transform.x;
        ent.ai.targetY = ent.transform.y;
      }

      forceRender();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [memory.entities, forceRender]);

  // LOG HELPER
  function addLog(message: string) {
    setOutput((p) => [...p, message]);
    setInput("");
    setTimeout(() => {
      const box = logContainerRef.current;
      if (box) box.scrollTop = box.scrollHeight;
    }, 20);
  }

  // ---------------------------
  // FUZZY MATCH HELPERS
  // ---------------------------
  function levenshtein(a: string, b: string): number {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          m[i][j] = m[i - 1][j - 1];
        } else {
          m[i][j] = Math.min(
            m[i - 1][j - 1] + 1,
            m[i][j - 1] + 1,
            m[i - 1][j] + 1
          );
        }
      }
    }
    return m[b.length][a.length];
  }

  function fuzzyMatch(input: string, list: string[]): string | null {
    input = input.toLowerCase();
    let best = null;
    let bestDist = 999;

    for (const item of list) {
      const d = levenshtein(input, item);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return bestDist <= 2 ? best : null;
  }

  // ---------------------------
  // COMMAND PARSER
  // ---------------------------
  function handleSend() {
    if (!input.trim()) return;

    const raw = input.trim();
    const lower = raw.toLowerCase();
    const words = lower.split(" ");

    setOutput((p) => [...p, `> ${raw}`]);

    const cmd = words[0];
    const valid = ["spawn", "move", "delete", "clear", "list"];
    if (!valid.includes(cmd)) {
      addLog(`Unknown command: "${cmd}"`);
      return;
    }

    // ------------------------
    // SPAWN
    // ------------------------
    if (cmd === "spawn") {
      let count = 1;
      let typeIndex = 1;

      if (!isNaN(Number(words[1]))) {
        count = Math.max(1, Number(words[1]));
        typeIndex = 2;
      }

      const rawType = words[typeIndex];
      if (!rawType) return addLog("(missing type)");

      const base = ["unit", "prop", "marker", "effect"];
      const plural = ["units", "props", "markers", "effects"];
      let match = fuzzyMatch(rawType, [...base, ...plural]);

      if (!match) return addLog(`Unknown entity type: "${rawType}"`);
      if (match.endsWith("s")) match = match.slice(0, -1);

      for (let i = 0; i < count; i++) {
        const pos = findDynamicSpreadPosition(match as any);
        addEntity({ type: match as any, role: "generic", x: pos.x, y: pos.y });
      }
      setInput("");
      return;
    }

    // ------------------------
    // DELETE
    // ------------------------
    if (cmd === "delete") {
      const id = words[1];
      if (!id) return addLog("(missing id)");

      deleteEntity(id);
      setInput("");
      return;
    }

    // ------------------------
    // MOVE — FIXED VERSION
    // ------------------------
    if (cmd === "move") {
      const tokens = raw.trim().split(/\s+/);
      const id = tokens[1];
      if (!id) return addLog("(missing id)");

      const ent = memory.entities.find((e) => e.id === id);
      if (!ent || !ent.transform) return addLog("(invalid entity)");

      const direction = tokens[2]?.toLowerCase();
      const step = 35;

      const ok = (msg: string) => {
        addLog(msg);
        forceRender();
      };

      // DIRECTION SHORTCUTS
      if (direction === "up") {
        ent.transform.y -= step;
        if (ent.ai) ent.ai.targetY = ent.transform.y;
        if (ent.ai) ent.ai.targetX = ent.transform.x;
        return ok(`Moved ${id} up`);
      }
      if (direction === "down") {
        ent.transform.y += step;
        if (ent.ai) ent.ai.targetY = ent.transform.y;
        if (ent.ai) ent.ai.targetX = ent.transform.x;
        return ok(`Moved ${id} down`);
      }
      if (direction === "left") {
        ent.transform.x -= step;
        if (ent.ai) ent.ai.targetX = ent.transform.x;
        if (ent.ai) ent.ai.targetY = ent.transform.y;
        return ok(`Moved ${id} left`);
      }
      if (direction === "right") {
        ent.transform.x += step;
        if (ent.ai) ent.ai.targetX = ent.transform.x;
        if (ent.ai) ent.ai.targetY = ent.transform.y;
        return ok(`Moved ${id} right`);
      }
      if (direction === "center") {
        ent.transform.x = window.innerWidth / 2;
        ent.transform.y = window.innerHeight / 2;
        if (ent.ai) {
          ent.ai.targetX = ent.transform.x;
          ent.ai.targetY = ent.transform.y;
        }
        return ok(`Moved ${id} to center`);
      }

      // NUMERIC MOVE
      const nx = parseFloat(tokens[2]);
      const ny = parseFloat(tokens[3]);

      if (isNaN(nx) || isNaN(ny)) return addLog("(invalid coordinates)");

      ent.transform.x = nx;
      ent.transform.y = ny;

      if (ent.ai) {
        ent.ai.targetX = ent.transform.x;
        ent.ai.targetY = ent.transform.y;
      }

      return ok(`Moved ${id}`);
    }

    // ------------------------
    // LIST
    // ------------------------
    if (cmd === "list") {
      const lines = memory.entities.map(
        (e) => `${e.id} (${e.type}) x=${e.transform.x} y=${e.transform.y}`
      );
      setOutput((p) => [...p, ...lines]);
      setInput("");
      return;
    }

    // ------------------------
    // CLEAR
    // ------------------------
    if (cmd === "clear") {
      clearEntities();
      setInput("");
      return;
    }
  }

  // ----------------------
  // UI
  // ----------------------
  return (
    <>
      <style>{`
        @keyframes caretPulse {
          0% { opacity: 0.25; }
          50% { opacity: 1; }
          100% { opacity: 0.25; }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(0,255,255,0.35)",
          boxShadow: "0 0 10px rgba(0,255,255,0.25)",
          padding: "10px 14px",
          borderRadius: "12px",
          pointerEvents: "auto",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 5,
        }}
      >
        {output.length > 0 && (
          <div
            ref={logContainerRef}
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#7FF7FF",
              maxHeight: "120px",
              overflowY: "auto",
              marginBottom: "6px",
            }}
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        <div
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#7FF7FF",
            marginBottom: "4px",
          }}
        >
          Type commands: spawn, move, delete, clear, list
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Enter command..."
            style={{
              width: "520px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(0,255,255,0.35)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#cfffff",
              fontFamily: "monospace",
              fontSize: "14px",
              caretColor: "#00eaff",
              animation: "caretPulse 1.4s infinite",
              outline: "none",
            }}
          />

          <button
            onClick={handleSend}
            onMouseEnter={() => {
              setHoveredSend(true);
              setShimmerSend(true);
              setTimeout(() => setShimmerSend(false), 220);
            }}
            onMouseLeave={() => {
              setHoveredSend(false);
            }}
            style={{
              position: "relative",
              overflow: "hidden",
              border: hoveredSend ? "1px solid rgba(0,255,255,0.35)" : "1px solid rgba(0,255,255,0.25)",
              borderRadius: "6px",
              background: hoveredSend ? "rgba(0,0,0,0.45)" : "rgba(0, 10, 20, 0.35)",
              backdropFilter: "blur(12px)",
              boxShadow: hoveredSend 
                ? "0 0 12px rgba(0,255,255,0.25)" 
                : "inset 0 0 6px rgba(255,255,255,0.09)",
              fontFamily: "inherit",
              padding: "6px 14px",
              color: "#cfffff",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
            }}
          >
            Send
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              background: "linear-gradient(120deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0.0) 100%)",
              opacity: shimmerSend ? 1 : 0,
              transform: shimmerSend ? "translateX(38%)" : "translateX(-62%)",
              transition: "opacity 180ms ease, transform 220ms ease",
            }} />
          </button>
        </div>
      </div>
    </>
  );
}
