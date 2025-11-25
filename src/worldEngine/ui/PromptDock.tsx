"use client";

import { useState, useEffect, useRef } from "react";
import { useWorld } from "../core/worldState";
import { findDynamicSpreadPosition } from "../core/poissonHelper";

export default function PromptDock() {
  const { addEntity, deleteEntity, clearEntities, memory, forceRender } = useWorld();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Autofocus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Selected entity from PixiStage
  useEffect(() => {
    function handler(e: any) {
      (window as any).__selectedEntity = e.detail;
    }
    window.addEventListener("entity-selected", handler);
    return () => window.removeEventListener("entity-selected", handler);
  }, []);

  // Keyboard arrow-key movement
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const selected = (window as any).__selectedEntity;
      if (!selected) return;

      const ent = memory.entities.find(e => e.id === selected);
      if (!ent) return;

      const step = 18;

      if (e.key === "ArrowLeft")  ent.transform.x -= step;
      if (e.key === "ArrowRight") ent.transform.x += step;
      if (e.key === "ArrowUp")    ent.transform.y -= step;
      if (e.key === "ArrowDown")  ent.transform.y += step;

      ent.ai.targetX = ent.transform.x;
      ent.ai.targetY = ent.transform.y;

      forceRender();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [memory.entities, forceRender]);

  // --- LEVENSHTEIN DISTANCE ---
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // --- FUZZY MATCH HELPER ---
  function fuzzyMatch(input: string, list: string[]): string | null {
    input = input.toLowerCase();
    let best: string | null = null;
    let bestDist = 999;
    for (const item of list) {
      const dist = levenshtein(input, item);
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    }
    return bestDist <= 2 ? best : null;
  }

  // --- ADD LOG HELPER ---
  function addLog(message: string) {
    setOutput((p) => [...p, message]);
    setInput("");
    setTimeout(() => {
      const logRef = logContainerRef?.current;
      if (logRef) {
        logRef.scrollTop = logRef.scrollHeight;
      }
    }, 0);
  }

  // --- SEND COMMAND ---
  function handleSend() {
    if (!input.trim()) return;

    const raw = input.trim();
    const lower = raw.toLowerCase();
    const words = lower.split(" ");

    setOutput((prev) => [...prev, `> ${raw}`]);

    // ---------- STRICT COMMAND VALIDATION ----------
    const cmd = words[0];
    const validCommands = ["spawn", "move", "delete", "clear", "list"];
    
    if (!validCommands.includes(cmd)) {
      addLog(`Unknown command: "${cmd}"`);
      return;
    }

    // ---------- MULTI-SPAWN ----------
    if (cmd === "spawn") {
      // spawn 5 unit OR spawn unit
      let count = 1;
      let typeIndex = 1;

      if (!isNaN(Number(words[1]))) {
        count = Math.max(1, Number(words[1]));
        typeIndex = 2;
      }

      const rawType = words[typeIndex];
      if (!rawType) {
        addLog("(missing type: unit/prop/marker/effect)");
        return;
      }

      // Fuzzy match entity types
      const canonicalTypes = ["unit", "prop", "marker", "effect"];
      const pluralTypes = ["units", "props", "markers", "effects"];
      const allTypes = [...canonicalTypes, ...pluralTypes];

      let matched = fuzzyMatch(rawType, allTypes);
      if (!matched) {
        addLog(`Unknown entity type: "${rawType}"`);
        return;
      }

      // Convert plural → singular
      if (matched.endsWith("s")) {
        matched = matched.slice(0, -1);
      }

      const type = matched as "unit" | "prop" | "marker" | "effect";
      const role = "generic";

      for (let i = 0; i < count; i++) {
        const pos = findDynamicSpreadPosition(type);
        addEntity({ type, role, x: pos.x, y: pos.y });
      }

      setInput("");
      return;
    }

    // ---------- DELETE ----------
    if (cmd === "delete") {
      const id = words[1];
      if (!id) {
        addLog("(missing id)");
        return;
      }
      deleteEntity(id);
      setInput("");
      return;
    }

    // ---------- MOVE (uses selected entity) ----------
    if (cmd === "move") {
      const selected = (window as any).__selectedEntity;
      if (!selected) {
        setOutput(prev => [...prev, "(no entity selected)"]);
        setInput("");
        return;
      }

      const ent = memory.entities.find(e => e.id === selected);
      if (!ent) {
        setOutput(prev => [...prev, "(invalid selected entity)"]);
        setInput("");
        return;
      }

      const words = raw.split(" ");

      // --- move left / right / up / down ---
      const step = 25;

      if (words[1] === "left")  ent.transform.x -= step;
      else if (words[1] === "right") ent.transform.x += step;
      else if (words[1] === "up")    ent.transform.y -= step;
      else if (words[1] === "down")  ent.transform.y += step;

      // --- move center ---
      else if (words[1] === "center") {
        ent.transform.x = window.innerWidth / 2;
        ent.transform.y = window.innerHeight / 2;
      }

      // --- move random ---
      else if (words[1] === "random") {
        ent.transform.x = Math.random() * window.innerWidth;
        ent.transform.y = Math.random() * window.innerHeight;
      }

      // --- move x y (absolute position) ---
      else if (words.length === 3) {
        const x = parseFloat(words[1]);
        const y = parseFloat(words[2]);
        if (!isNaN(x) && !isNaN(y)) {
          ent.transform.x = x;
          ent.transform.y = y;
        } else {
          setOutput(prev => [...prev, "(invalid coordinates)"]);
        }
      } 
      else {
        setOutput(prev => [...prev, "(unknown move command)"]);
      }

      // update AI targets
      ent.ai.targetX = ent.transform.x;
      ent.ai.targetY = ent.transform.y;

      forceRender();
      setInput("");
      return;
    }

    // ---------- LIST ----------
    if (cmd === "list") {
      const lines = memory.entities.map(
        (e) => `${e.id}  (${e.type})  x=${e.transform.x}  y=${e.transform.y}`
      );
      setOutput((p) => [...p, ...lines]);
      setInput("");
      return;
    }

    // ---------- CLEAR ----------
    if (cmd === "clear") {
      clearEntities();
      setInput("");
      return;
    }
  }

  return (
    <>
      <style>{`
        @keyframes caretPulse {
          0%   { opacity: 0.25; }
          50%  { opacity: 1.0; }
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
          alignItems: "flex-start",

          // --- OLD STYLE EXACT ---
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(0,255,255,0.35)",
          boxShadow: "0 0 10px rgba(0,255,255,0.25)",
          padding: "10px 14px",
          borderRadius: "12px",

          width: "fit-content",
          maxWidth: "760px",
          pointerEvents: "auto",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          overflow: "visible",
          zIndex: 5,
        }}
      >
        {/* --- OUTPUT CONSOLE --- */}
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
              opacity: 0.9,
            }}
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {/* --- COMMAND HINT BAR --- */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#7FF7FF",
            marginBottom: "4px",
            opacity: 0.9,
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

              // --- OLD INPUT STYLE EXACT ---
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(0,255,255,0.35)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#cfffff",
              outline: "none",
              fontFamily: "monospace",
              fontSize: "14px",

              boxShadow: "inset 0 0 6px rgba(0,255,255,0.22)",
              caretColor: "#00eaff",
              animation: "caretPulse 1.4s ease-in-out infinite",
            }}
          />

          <button
            onClick={handleSend}
            style={{
              border: "1px solid rgba(0,255,255,0.25)",
              borderRadius: "6px",
              background: "rgba(0, 10, 20, 0.35)",
              backdropFilter: "blur(6px)",
              fontFamily: "inherit",
              padding: "6px 14px",
              color: "#cfffff",
              fontSize: "14px",
              cursor: "pointer",
              outline: "none",
              transition: "background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 25, 40, 0.45)";
              e.currentTarget.style.borderColor = "rgba(0,255,255,0.45)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(0,255,255,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 10, 20, 0.35)";
              e.currentTarget.style.borderColor = "rgba(0,255,255,0.25)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
