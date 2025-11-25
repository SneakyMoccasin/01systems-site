"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { Entity } from "../types";

interface WorldMemory {
  entities: Entity[];
}

interface WorldState {
  memory: WorldMemory;
  addEntity: (entity: { type: "unit" | "prop" | "marker" | "effect"; role: string; x?: number; y?: number; name?: string }) => void;
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
}

const WorldContext = createContext<WorldState | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<WorldMemory>({ entities: [] });
  const [subscribers, setSubscribers] = useState<Set<() => void>>(new Set());
  const [blinkAllFn, setBlinkAllFn] = useState<(() => void) | undefined>(undefined);
  const deleteEntityRef = useRef<((id: string) => void) | undefined>(undefined);
  const [uiVisible, setUiVisible] = useState(false);

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
      setMemory(prev => ({
        entities: prev.entities.filter(e => e.id !== id),
      }));
      forceRender();
    },
    [forceRender]
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
  // WORLD VALUE
  // ------------------------------------------------------------------------------
  const worldValue = {
    memory,
    addEntity,
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
