"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { Entity } from "../types";

interface FormationPoint {
  x: number;
  y: number;
}

function computeRallyPositions(units: Entity[], center: FormationPoint): FormationPoint[] {
  const count = units.length;
  if (count === 0) return [];

  const radius = 40 + count * 2;
  const step = (Math.PI * 2) / count;
  return units.map((_, i) => ({
    x: center.x + Math.cos(i * step) * radius,
    y: center.y + Math.sin(i * step) * radius,
  }));
}

function computeScatterPositions(units: Entity[], center: FormationPoint): FormationPoint[] {
  return units.map(() => ({
    x: center.x + (Math.random() - 0.5) * 300,
    y: center.y + (Math.random() - 0.5) * 300,
  }));
}

function computeLineFormationPositions(units: Entity[], center: FormationPoint): FormationPoint[] {
  const count = units.length;
  if (count === 0) return [];

  const spacing = 40;
  const totalWidth = (count - 1) * spacing;
  return units.map((_, i) => ({
    x: center.x - totalWidth / 2 + i * spacing,
    y: center.y,
  }));
}

interface WorldMemory {
  entities: Entity[];
}

interface WorldState {
  memory: WorldMemory;
  addEntity: (entity: { type: "unit" | "prop" | "marker" | "effect"; role: string; x?: number; y?: number; name?: string }) => void;
  spawnEntity?: (type: "unit" | "prop" | "marker" | "effect") => void;
  spawnMany?: (type: "unit" | "prop" | "marker" | "effect", count: number) => void;
  addManyEntities?: (entities: Entity[]) => void;
  deleteEntity: (id: string) => void;
  baseDeleteEntity?: (id: string) => void;
  clearEntities: () => void;
  subscribe: (callback: () => void) => () => void;
  forceRender: () => void;
  createEntity: (type: "unit" | "prop" | "marker" | "effect", role: string, x?: number, y?: number, name?: string) => Entity;
  blinkAll?: () => void;
  setBlinkAll?: (fn: (() => void) | undefined) => void;
  setDeleteEntity?: (fn: ((id: string) => void) | undefined) => void;
  uiVisible: boolean;
  setUiVisible?: (visible: boolean) => void;
  uiWaterlooOpen: boolean;
  setUiWaterlooOpen?: (open: boolean) => void;
  showWaterloo?: boolean;
  showTrafficDemo?: boolean;
  currentMode: "none" | "rally" | "scatter" | "line";
  setCurrentMode?: (mode: "none" | "rally" | "scatter" | "line") => void;
  rally?: (center: { x: number; y: number }) => void;
  scatter?: (center: { x: number; y: number }) => void;
  lineFormation?: (center: { x: number; y: number }) => void;
  applyFormation?: (mode: "rally" | "scatter" | "line", center: { x: number; y: number }) => void;
  handleCommand?: (cmd: string) => void;
  moveSelected?: (direction: string, amount?: number) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const WorldContext = createContext<WorldState | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<WorldMemory>({ entities: [] });
  const [subscribers, setSubscribers] = useState<Set<() => void>>(new Set());
  const [blinkAllFn, setBlinkAllFn] = useState<(() => void) | undefined>(undefined);
  const deleteEntityRef = useRef<((id: string) => void) | undefined>(undefined);
  const [uiVisible, setUiVisible] = useState(false);
  const [uiWaterlooOpen, setUiWaterlooOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<"none" | "rally" | "scatter" | "line">("none");

  const unitCounter = useRef(0);
  const propCounter = useRef(0);
  const markerCounter = useRef(0);
  const effectCounter = useRef(0);

  // ------------------------------------------------------------------------------
  // FORCE RENDER — same as before (PixiStage uses this heavily)
  // ------------------------------------------------------------------------------
  const forceRender = useCallback(() => {
    subscribers.forEach(cb => cb());
  }, [subscribers]);

  // ------------------------------------------------------------------------------
  // ⭐ FIXED CREATE ENTITY (no more spawn at corner)
  // ------------------------------------------------------------------------------
  const createEntity = useCallback(
    (
      type: "unit" | "prop" | "marker" | "effect",
      role: string,
      x?: number,
      y?: number,
      name?: string
    ): Entity => {
      let shortId = "";

      if (type === "unit") {
        unitCounter.current++;
        shortId = "u" + unitCounter.current;
      } else if (type === "prop") {
        propCounter.current++;
        shortId = "p" + propCounter.current;
      } else if (type === "marker") {
        markerCounter.current++;
        shortId = "m" + markerCounter.current;
      } else if (type === "effect") {
        effectCounter.current++;
        shortId = "e" + effectCounter.current;
      }

      // ⭐ FIX: force x/y to always be numbers or null (never undefined!)
      const safeX = typeof x === "number" && !isNaN(x) ? x : null;
      const safeY = typeof y === "number" && !isNaN(y) ? y : null;

      return {
        id: shortId,
        uuid: crypto.randomUUID(),
        type,
        role,
        name: name || role,
        transform: {
          x: safeX,
          y: safeY,
          scale: 1,
        },
        ai: {
          targetX: safeX,
          targetY: safeY,
          nextUpdate: Date.now() + 1000 + Math.random() * 2000,
        },
      };
    },
    []
  );

  // ------------------------------------------------------------------------------
  // ADD ONE ENTITY
  // ------------------------------------------------------------------------------
  const addEntity = useCallback(
    (entity: { type: "unit" | "prop" | "marker" | "effect"; role: string; x?: number; y?: number; name?: string }) => {
      const newEntity = createEntity(entity.type, entity.role, entity.x, entity.y, entity.name);

      setMemory(prev => ({
        entities: [...prev.entities, newEntity],
      }));

      forceRender();
    },
    [createEntity, forceRender]
  );

  // ------------------------------------------------------------------------------
  // ADD MANY ENTITIES
  // ------------------------------------------------------------------------------
  const addManyEntities = useCallback(
    (entities: Entity[]) => {
      setMemory(prev => ({
        entities: [...prev.entities, ...entities],
      }));
      forceRender();
    },
    [forceRender]
  );

  // ------------------------------------------------------------------------------
  // BASE DELETE ENTITY (pixi unified delete wraps this)
  // ------------------------------------------------------------------------------
  const baseDeleteEntity = useCallback(
    (id: string) => {
      // Find entity before deletion for logging
      const entity = memory.entities.find(e => e.id === id);
      const entityType = entity?.type ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1) : "Entity";
      
      setMemory(prev => ({
        entities: prev.entities.filter(e => e.id !== id),
      }));
      forceRender();
      
      // LOG: Deleted entity
      if (typeof window !== "undefined" && (window as any).__pulseLog) {
        (window as any).__pulseLog(`> Deleted ${entityType} #${id}`, "warn");
      }
    },
    [forceRender, memory.entities]
  );

  // ------------------------------------------------------------------------------
  // DELETE ENTITY ENTRYPOINT
  // ------------------------------------------------------------------------------
  const deleteEntity = useCallback(
    (id: string) => {
      // if PixiStage registered unified delete handler, use that
      if (deleteEntityRef.current) {
        deleteEntityRef.current(id);
        return;
      }
      // fallback: remove from memory
      baseDeleteEntity(id);
    },
    [baseDeleteEntity]
  );

  // ------------------------------------------------------------------------------
  // CLEAR ENTITIES
  // ------------------------------------------------------------------------------
  const clearEntities = useCallback(() => {
    setMemory({ entities: [] });
    unitCounter.current = 0;
    propCounter.current = 0;
    markerCounter.current = 0;
    effectCounter.current = 0;
    forceRender();
    // --- CLEAR LOGGING ---
    if (typeof window !== "undefined" && (window as any).__pulseLog) {
      (window as any).__pulseLog("Cleared all entities", "warn");
    }
  }, [forceRender]);

  // ------------------------------------------------------------------------------
  // SUBSCRIBE
  // ------------------------------------------------------------------------------
  const subscribe = useCallback((callback: () => void) => {
    setSubscribers(prev => new Set(prev).add(callback));

    return () => {
      setSubscribers(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  // ------------------------------------------------------------------------------
  // REGISTER CALLBACKS TO WORLD
  // ------------------------------------------------------------------------------
  const setBlinkAll = useCallback((fn: (() => void) | undefined) => {
    setBlinkAllFn(() => fn);
  }, []);

  const setDeleteEntity = useCallback((fn: ((id: string) => void) | undefined) => {
    deleteEntityRef.current = fn;
  }, []);

  // ------------------------------------------------------------------------------
  // FORMATION FUNCTIONS
  // ------------------------------------------------------------------------------
  const rally = useCallback((center: { x: number; y: number }) => {
    const units = memory.entities.filter(e => e.type === "unit");
    units.forEach((u) => {
      if (!u.ai) return;
      (u.ai as any).isFormation = false;
      (u.ai as any).formationLocked = false;
    });
    const targets = computeRallyPositions(units, center);
    units.forEach((u, i) => {
      if (u.ai) {
        u.ai.targetX = targets[i].x;
        u.ai.targetY = targets[i].y;
        (u.ai as any).isFormation = true;
      }
    });
    forceRender();
  }, [memory.entities, forceRender]);

  const scatter = useCallback((center: { x: number; y: number }) => {
    const units = memory.entities.filter(e => e.type === "unit");
    units.forEach((u) => {
      if (!u.ai) return;
      (u.ai as any).isFormation = false;
      (u.ai as any).formationLocked = false;
    });
    const targets = computeScatterPositions(units, center);
    units.forEach((u, i) => {
      if (u.ai) {
        u.ai.targetX = targets[i].x;
        u.ai.targetY = targets[i].y;
        (u.ai as any).isFormation = true;
      }
    });
    forceRender();
  }, [memory.entities, forceRender]);

  const lineFormation = useCallback((center: { x: number; y: number }) => {
    const units = memory.entities.filter(e => e.type === "unit");
    units.forEach((u) => {
      if (!u.ai) return;
      (u.ai as any).isFormation = false;
      (u.ai as any).formationLocked = false;
    });
    const targets = computeLineFormationPositions(units, center);
    units.forEach((u, i) => {
      if (u.ai) {
        u.ai.targetX = targets[i].x;
        u.ai.targetY = targets[i].y;
        (u.ai as any).isFormation = true;
      }
    });
    forceRender();
  }, [memory.entities, forceRender]);

  // === APPLY FORMATION DISPATCHER ===
  const applyFormation = useCallback(
    (mode: "rally" | "scatter" | "line", center: { x: number; y: number }) => {
      // Count how many units are affected
      const unitCount = memory.entities.filter(e => e.type === "unit").length;

      // LOG: Formation applied with unit count
      if (typeof window !== "undefined" && (window as any).__pulseLog) {
        (window as any).__pulseLog(`Formation: ${mode.toUpperCase()} (${unitCount} units)`);
      }
      if (mode === "rally") return rally(center);
      if (mode === "scatter") return scatter(center);
      if (mode === "line") return lineFormation(center);
    },
    [rally, scatter, lineFormation, memory.entities]
  );

  // --------------------------------------------------------------
  // MOVE SELECTED ENTITIES (up, down, left, right, center)
  // --------------------------------------------------------------
  const moveSelected = useCallback(
    (direction: string, amount?: number) => {
      const dist = amount ?? 20;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const selected = memory.entities.filter(e => (e as any).selected === true);
      if (selected.length === 0) return;

      selected.forEach(e => {
        if (!e.transform) return;

        switch (direction) {
          case "up":
            e.transform.y = (e.transform.y ?? 0) - dist;
            break;
          case "down":
            e.transform.y = (e.transform.y ?? 0) + dist;
            break;
          case "left":
            e.transform.x = (e.transform.x ?? 0) - dist;
            break;
          case "right":
            e.transform.x = (e.transform.x ?? 0) + dist;
            break;
          case "center":
            e.transform.x = centerX;
            e.transform.y = centerY;
            break;
        }
      });

      forceRender();
    },
    [memory.entities, forceRender]
  );

  // ------------------------------------------------------------------------------
  // SPAWN ENTITY (simple, safe wrapper around addEntity)
  // ------------------------------------------------------------------------------
  const spawnEntity = useCallback(
    (type: "unit" | "prop" | "marker" | "effect") => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // small random offset so units spawn as a cluster, not stacked
      const ox = Math.random() * 120 - 60;
      const oy = Math.random() * 120 - 60;

      addEntity({
        type,
        role: type,
        x: cx + ox,
        y: cy + oy,
      });
      if (typeof window !== "undefined" && (window as any).__pulseLog) {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        (window as any).__pulseLog(`> Spawned 1 ${label}`, "info");
      }
    },
    [addEntity]
  );

  const spawnMany = useCallback(
    (type: "unit" | "prop" | "marker" | "effect", count: number) => {
      for (let i = 0; i < count; i++) {
        spawnEntity(type);
      }
      if (typeof window !== "undefined" && (window as any).__pulseLog) {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        (window as any).__pulseLog(`> Spawned ${count} ${label}${count > 1 ? "s" : ""}`, "info");
      }
    },
    [spawnEntity]
  );

  // ------------------------------------------------------------------------------
  // HANDLE COMMAND (PromptDock)
  // ------------------------------------------------------------------------------
  const handleCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();

      // ----------------------------------------
      // WATERLOO COMMANDS (full multi-word support)
      // ----------------------------------------
      if (trimmed.startsWith("waterloo")) {
        const parts = trimmed
          .split(" ")
          .slice(1)
          .filter(p => p.trim() !== "");
        if (parts.length === 0) return;

        const key = parts.join("").toLowerCase(); // e.g. "frenchcolumn"

        const WATERLOO_KEYMAP: Record<string, string> = {
          "frenchcolumn": "frenchColumn",
          "britishsquare": "britishSquare",
          "frenchcavalrywedge": "frenchCavalryWedge",
          "britishartilleryline": "britishArtilleryLine",
          "help": "help"
        };

        const presetName = WATERLOO_KEYMAP[key];
        if (!presetName) {
          (window as any).__pulseLog?.("> Unknown Waterloo command", "error");
          return;
        }

        // Handle help
        if (presetName === "help") {
          const helpText = [
            "=== WATERLOO MINI HELP ===",
            "Commands:",
            "  waterloo french column",
            "  waterloo british square",
            "  waterloo french cavalry wedge",
            "  waterloo british artillery line",
            "",
            "Shapes:",
            "  circle = infantry",
            "  triangle = cavalry",
            "  square = artillery",
          ].join("\n");

          (window as any).__pulseLog?.(helpText, "info");
          return;
        }

        // Spawn preset
        import("../waterloo/waterlooTrigger").then(({ spawnWaterlooPreset }) => {
          spawnWaterlooPreset(presetName, worldValue);
        });

        return;
      }

      if (trimmed === "spawn 1") {
        spawnEntity?.("unit");
        return;
      }

      if (trimmed.startsWith("spawn ")) {
        const count = parseInt(trimmed.split(" ")[1], 10);
        if (!isNaN(count)) {
          for (let i = 0; i < count; i++) spawnEntity?.("unit");
        }
        return;
      }

      console.warn("Unknown command:", cmd);
    },
    [spawnEntity]
  );

  // ------------------------------------------------------------------------------
  // WORLD VALUE
  // ------------------------------------------------------------------------------
  const worldValue = {
    memory,
    addEntity,
    spawnEntity,
    moveSelected,
    spawnMany,
    addManyEntities,
    deleteEntity,
    baseDeleteEntity,
    clearEntities,
    subscribe,
    forceRender,
    createEntity,
    blinkAll: blinkAllFn,
    setBlinkAll,
    setDeleteEntity,
    uiVisible,
    setUiVisible,
    uiWaterlooOpen,
    setUiWaterlooOpen,
    showWaterloo: false,
    showTrafficDemo: false,
    currentMode,
    setCurrentMode,
    rally,
    scatter,
    lineFormation,
    applyFormation,
    handleCommand,
  };

  // ------------------------------------------------------------------------------
  // EXPOSE WORLD FOR POISSON HELPER
  // ------------------------------------------------------------------------------
  if (typeof window !== "undefined") {
    (window as any).__pulseWorld = worldValue;
  }

  return <WorldContext.Provider value={worldValue}>{children}</WorldContext.Provider>;
}

// ------------------------------------------------------------------------------
export function useWorld() {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error("useWorld must be used within WorldProvider");
  }
  return context;
}
