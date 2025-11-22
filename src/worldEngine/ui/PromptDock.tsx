"use client";

import { useState } from "react";
import { useWorld } from "../core/worldState";
import { Entity } from "../types";

export default function PromptDock() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const world = useWorld();

  const addToConsole = (message: string) => {
    setOutput((prev) => [...prev, message]);
  };

  const findByShortId = (id: string) => {
    return world.memory.entities.find((e) => e.id === id);
  };

  const getLastEntity = () => {
    const ents = world.memory.entities;
    return ents.length > 0 ? ents[ents.length - 1] : null;
  };

  const getLastOfType = (t: "unit" | "prop" | "marker" | "effect") => {
    const ents = world.memory.entities.filter((e) => e.type === t);
    return ents.length > 0 ? ents[ents.length - 1] : null;
  };

  const clampToBounds = (x: number, y: number) => {
    const margin = 20; // how close to edges entities are allowed
    const maxX = window.innerWidth - margin;
    const maxY = window.innerHeight - margin;

    let clampedX = Math.max(margin, Math.min(x, maxX));
    let clampedY = Math.max(margin, Math.min(y, maxY));

    return { x: clampedX, y: clampedY };
  };

  // === MASS SPAWN (CLEAN GRID VERSION) ===
  const spawnMany = (count: number, type: Entity["type"]) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // === TYPE-BASED GRID OFFSETS ===  
    let offsetX = 0;
    let offsetY = 0;

    switch (type) {
      case "unit":
        offsetX = 0;
        offsetY = 0;
        break;
      case "prop":
        offsetX = 0;
        offsetY = 100;
        break;
      case "marker":
        offsetX = 0;
        offsetY = -100;
        break;
      case "effect":
        offsetX = 150;
        offsetY = 0;
        break;
    }

    const cellSize = 50;

    const gridSize = Math.ceil(Math.sqrt(count));
    const totalSize = gridSize * cellSize;

    const startX = (width - totalSize) / 2;
    const startY = (height - totalSize) / 2;

    const toSpawn: Entity[] = [];
    let spawned = 0;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (spawned >= count) break;

        const x = startX + col * cellSize + offsetX;
        const y = startY + row * cellSize + offsetY;

        toSpawn.push(
          world.createEntity(type, type, x, y, type)
        );

        spawned++;
      }
    }

    if (world.addManyEntities) {
      world.addManyEntities(toSpawn);
    }

    addToConsole(`Spawned ${spawned} ${type}(s) in GRID formation.`);

    if (world.blinkAll) setTimeout(() => world.blinkAll!(), 10);
  };

  const moveEntity = (entity: Entity, args: string[]) => {
    const keyword = args[0];

    if (!entity.transform) entity.transform = {};

    // ---- MOVE IMMEDIATELY ----
    let newX: number;
    let newY: number;

    if (keyword === "center") {
      newX = window.innerWidth / 2;
      newY = window.innerHeight / 2;
    } else if (keyword === "left") {
      newX = 50;
      newY = entity.transform.y ?? window.innerHeight / 2;
    } else if (keyword === "right") {
      newX = window.innerWidth - 50;
      newY = entity.transform.y ?? window.innerHeight / 2;
    } else if (keyword === "top") {
      newX = entity.transform.x ?? window.innerWidth / 2;
      newY = 50;
    } else if (keyword === "bottom") {
      newX = entity.transform.x ?? window.innerWidth / 2;
      newY = window.innerHeight - 50;
    } else if (keyword === "random") {
      newX = Math.random() * window.innerWidth;
      newY = Math.random() * window.innerHeight;
    }
    // direct numeric coordinates
    else if (!isNaN(parseFloat(args[0])) && !isNaN(parseFloat(args[1]))) {
      newX = parseFloat(args[0]);
      newY = parseFloat(args[1]);
    } else {
      addToConsole("Unknown move argument.");
      return;
    }

    // clamp movement inside screen bounds
    const bounded = clampToBounds(newX, newY);
    entity.transform.x = bounded.x;
    entity.transform.y = bounded.y;

    // FORCE RENDER — makes movement visible immediately
    world.forceRender();
    addToConsole(`Moved ${entity.id}`);

    // ---- BLINK FEEDBACK AFTER MOVEMENT ----
    if (world.blinkAll) {
      setTimeout(() => {
        world.blinkAll!();
      }, 10); // almost immediate, but AFTER render
    }
  };

  const parseCommand = (rawText: string) => {
    const cmd = rawText.trim().toLowerCase();

    if (!cmd) return;

    // MASS SPAWN
    if (cmd.startsWith("spawn")) {
      const parts = cmd.split(" ");

      // Supported patterns:
      // spawn 10 unit
      // spawn many 10 unit
      // spawn unit 10
      // spawn many unit 10

      let count: number | null = null;
      let type: Entity["type"] | null = null;

      for (const p of parts) {
        if (!isNaN(parseInt(p))) count = parseInt(p);
        if (["unit", "prop", "marker", "effect"].includes(p)) {
          type = p as Entity["type"];
        }
      }

      if (type && count && count > 1) {
        spawnMany(count, type);
        return;
      }
    }

    // SPAWN command
    if (cmd.startsWith("spawn ")) {
      const parts = cmd.split(/\s+/);
      if (parts.length < 2) {
        addToConsole("Error: spawn requires type. Example: spawn unit role=villager");
        return;
      }

      const type = parts[1] as "unit" | "prop" | "marker" | "effect";
      if (type !== "unit" && type !== "prop" && type !== "marker" && type !== "effect") {
        addToConsole(`Error: Invalid type "${parts[1]}". Must be: unit, prop, marker, or effect`);
        return;
      }

      let role = "generic";
      for (let i = 2; i < parts.length; i++) {
        if (parts[i].startsWith("role=")) {
          role = parts[i].slice(5);
          break;
        }
      }

      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 800;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 600;

      world.addEntity({
        type,
        role,
        x: Math.random() * windowWidth,
        y: Math.random() * windowHeight,
      });

      addToConsole(`Spawned ${type}`);
      return;
    }

    // MOVE command
    if (cmd.startsWith("move ")) {
      const parts = cmd.split(" ");

      // AUTO-SELECT: move last <keyword or coords>
      if (parts[1] === "last") {
        const ent = getLastEntity();
        if (!ent) {
          addToConsole("No entities exist.");
          return;
        }
        return moveEntity(ent, parts.slice(2));
      }

      // AUTO-SELECT: move unit/prop/marker/effect <keyword>
      if (["unit", "prop", "marker", "effect"].includes(parts[1])) {
        const ent = getLastOfType(parts[1] as "unit" | "prop" | "marker" | "effect");
        if (!ent) {
          addToConsole(`No ${parts[1]} exists.`);
          return;
        }
        return moveEntity(ent, parts.slice(2));
      }

      // DIRECT ID mode:
      const ent = findByShortId(parts[1]);
      if (ent) {
        return moveEntity(ent, parts.slice(2));
      }

      addToConsole(`No entity with ID ${parts[1]}`);
      return;
    }

    // DELETE command
    if (cmd.startsWith("delete ")) {
      const parts = cmd.split(" ");
      if (parts.length < 2) {
        addToConsole("Error: delete requires entity ID. Example: delete e2");
        return;
      }

      const id = parts[1];
      const entity = world.memory.entities.find((e) => e.id === id);
      if (!entity) {
        addToConsole(`Error: Entity "${id}" not found`);
        return;
      }

      world.deleteEntity(id);
      addToConsole(`Deleted ${id}`);
      return;
    }

    // CLEAR command
    if (cmd === "clear world") {
      world.clearEntities();
      addToConsole("World cleared");
      return;
    }

    // LIST command
    if (cmd === "list") {
      const entities = world.memory.entities;

      if (entities.length === 0) {
        addToConsole("No entities in world.");
        return;
      }

      // Build output
      let out = "";
      for (const e of entities) {
        const x = e.transform?.x ?? "n/a";
        const y = e.transform?.y ?? "n/a";
        out += `${e.id}  ${e.type}  x:${x}  y:${y}\n`;
      }

      addToConsole(out.trim());

      // VISUAL BLINK (0.3s)
      if (world.blinkAll) {
        world.blinkAll();
      }

      return;
    }

    addToConsole(`Unknown command: ${cmd.split(" ")[0]}. Available: spawn, move, delete, clear, list`);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    setOutput((prev) => [...prev, `> ${input}`]);
    parseCommand(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  function createRipple(e: React.MouseEvent<HTMLElement>) {
    const button = e.currentTarget;
    
    // Remove any existing ripple
    const old = button.querySelector(".ripple-effect");
    if (old) old.remove();

    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    
    const size = Math.max(rect.width, rect.height) * 1.8;
    ripple.style.width = ripple.style.height = `${size}px`;

    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
  }

  return (
    <>
      <style jsx>{`
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(0,229,255,0.45);
          transform: scale(0);
          animation: rippleAnim 0.45s ease-out forwards;
          pointer-events: none;
        }
        @keyframes rippleAnim {
          from {
            transform: scale(0);
            opacity: 0.8;
          }
          to {
            transform: scale(3.2);
            opacity: 0;
          }
        }
      `}</style>
    <div
      style={{
        position: "absolute",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: "700px",
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 45px rgba(0, 255, 255, 0.08)",
        padding: "18px 20px 14px 20px",
        pointerEvents: "auto",
        zIndex: 200,
      }}
    >
      <div style={{
        width: "100%",
        height: "2px",
        background: "linear-gradient(90deg, #00e5ff, #007bff)",
        borderRadius: "2px",
        marginBottom: "12px",
      }} />
      <div
        style={{
          maxHeight: "200px",
          overflowY: "auto",
          marginBottom: "12px",
          fontFamily: "Menlo, Consolas, monospace",
          fontSize: "13px",
          color: "#e8f7ff",
          whiteSpace: "pre-wrap",
          lineHeight: "1.45",
        }}
      >
        {output.length === 0 ? (
          <div style={{ color: "#77ddee", opacity: 0.55 }}>Type commands: spawn, move, delete, clear, list</div>
        ) : (
          output.map((line, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              {line}
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter command..."
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "8px",
            color: "#eaffff",
            fontFamily: "Menlo, Consolas, monospace",
            fontSize: "13px",
            outline: "none",
            transition: "border 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.border = "1px solid #00e5ff";
            target.style.boxShadow = "0 0 6px rgba(0,229,255,0.4)";
          }}
          onBlur={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.border = "1px solid rgba(255,255,255,0.18)";
            target.style.boxShadow = "none";
          }}
        />
        <button
          onClick={(e) => {
            createRipple(e);
            handleSend();
          }}
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "10px 18px",
            background: "linear-gradient(135deg, #00e5ff, #0099cc)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            letterSpacing: "0.4px",
            transition: "transform 0.15s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.boxShadow = "0 0 12px rgba(0,229,255,0.7)";
            target.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.boxShadow = "none";
            target.style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.transform = "scale(0.97)";
          }}
        >
          Send
        </button>
      </div>
    </div>
    </>
  );
}
