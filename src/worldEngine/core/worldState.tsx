import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Entity } from '../types';

interface WorldMemory {
  entities: Entity[];
}

interface WorldState {
  memory: WorldMemory;
  addEntity: (entity: { type: "unit" | "prop" | "marker" | "effect"; role: string; x?: number; y?: number; name?: string }) => void;
  addManyEntities?: (entities: Entity[]) => void;
  deleteEntity: (id: string) => void;
  clearEntities: () => void;
  subscribe: (callback: () => void) => () => void;
  forceRender: () => void;
  createEntity: (type: "unit" | "prop" | "marker" | "effect", role: string, x?: number, y?: number, name?: string) => Entity;
  blinkAll?: () => void;
  setBlinkAll?: (fn: (() => void) | undefined) => void;
}

const WorldContext = createContext<WorldState | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<WorldMemory>({ entities: [] });
  const [subscribers, setSubscribers] = useState<Set<() => void>>(new Set());
  const [blinkAllFn, setBlinkAllFn] = useState<(() => void) | undefined>(undefined);
  const unitCounter = useRef(0);
  const propCounter = useRef(0);
  const markerCounter = useRef(0);
  const effectCounter = useRef(0);

  const forceRender = useCallback(() => {
    subscribers.forEach(callback => callback());
  }, [subscribers]);

  const createEntity = useCallback((
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

    return {
      id: shortId,
      uuid: crypto.randomUUID(),
      type,
      role,
      name: name || role,
      transform: {
        x: x ?? 0,
        y: y ?? 0,
        scale: 1
      },
      ai: {
        targetX: x ?? 0,
        targetY: y ?? 0,
        nextUpdate: Date.now() + 1000 + Math.random() * 2000
      }
    };
  }, []);

  const addEntity = useCallback((entity: { type: "unit" | "prop" | "marker" | "effect"; role: string; x?: number; y?: number; name?: string }) => {
    const newEntity = createEntity(
      entity.type,
      entity.role,
      entity.x,
      entity.y,
      entity.name
    );
    setMemory(prev => ({
      entities: [...prev.entities, newEntity],
    }));
    forceRender();
  }, [createEntity, forceRender]);

  const addManyEntities = useCallback((entities: Entity[]) => {
    setMemory(prev => ({
      entities: [...prev.entities, ...entities]
    }));
    forceRender();
  }, [forceRender]);

  const deleteEntity = useCallback((id: string) => {
    setMemory(prev => ({
      entities: prev.entities.filter(e => e.id !== id),
    }));
    forceRender();
  }, [forceRender]);

  const clearEntities = useCallback(() => {
    setMemory({ entities: [] });
    unitCounter.current = 0;
    propCounter.current = 0;
    markerCounter.current = 0;
    effectCounter.current = 0;
    forceRender();
  }, [forceRender]);

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

  const setBlinkAll = useCallback((fn: (() => void) | undefined) => {
    setBlinkAllFn(() => fn);
  }, []);

  return (
    <WorldContext.Provider
      value={{
        memory,
        addEntity,
        addManyEntities,
        deleteEntity,
        clearEntities,
        subscribe,
        forceRender,
        createEntity,
        blinkAll: blinkAllFn,
        setBlinkAll
      }}
    >
      {children}
    </WorldContext.Provider>
  );
}

export function useWorld() {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error('useWorld must be used within WorldProvider');
  }
  return context;
}
