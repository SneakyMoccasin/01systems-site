'use client';

/*
CORE-LOCK NOTICE — DECEMBER DEMO

This file is part of the locked Engine Core.
Status: READ-ONLY until after the December demo.

Rules:
- No behavior changes.
- No refactors.
- No scenario-specific logic.
- No demo hacks.
- Rendering and input only.

If a feature requires changing this file:
STOP and redesign the feature as a scenario.

Owner intent:
PixiStage may SEE the world, but must never THINK for it.
*/

import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useWorld } from '../core/worldState';
import { ENTITY_COLORS } from '../config/entityColors';
import { PULSE_SETTINGS } from '../config/pulseConfig';
import { resetEngine, registerTick, unregisterTick, runAllTicks } from "@/engine/runtime/resetManager";
import { registerMovementRuntime } from "@/engine/runtime/movementLoop";
// =======================================================
// =============== PULSE ENGINE CORE — LOCKED ===========
// =======================================================
// This file is now considered ENGINE CORE for the December demo.
// No existing logic may be edited, removed or refactored.
// All new systems must be attached using add-on layers only.
//
// ALLOWED:
// ✓ New imports (non-destructive)
// ✓ New helper functions (isolated, below core logic)
// ✓ New hooks
//
// FORBIDDEN:
// ✗ Editing wander AI
// ✗ Editing dragging logic
// ✗ Editing spawn/render logic
// ✗ Editing highlight/glow logic
// ✗ Editing intro sequence
// ✗ Editing ticker setup
//
// All new behavior must live in:
// /engine/actions/*
// /engine/runtime/*
// /core/worldState (safe, additive)
//
// =======================================================
// Extend PIXI.Graphics and Container to include custom properties
declare module 'pixi.js' {
  interface Graphics {
    pulseDir?: number;
    baseScale?: number;
    entityId?: string;
    dragging?: boolean;
    dragOffset?: { x: number; y: number };
    alphaDir?: number;
    auraScale?: number;
    auraColor?: number;
    auraAlpha?: number;
    shimmerTime?: number;
    shimmerRadius?: number;
    shimmerColor?: number;
    __isPulseLine?: boolean;
  }
  interface Container {
    entityId?: string;
    dragging?: boolean;
    dragOffset?: { x: number; y: number };
    lastSync?: number;
    pulseDir?: number;
    baseScale?: number;
    pulseSettings?: { speed: number; maxScale: number; minScale: number; };
    orbitInner?: PIXI.Graphics;
    orbitOuter?: PIXI.Graphics;
    auraOrbitContainer?: PIXI.Container;
  }
  interface DisplayObject {
    alphaDir?: number;
    __isPulseLine?: boolean;
  }
}

export default function PixiStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const graphicsMapRef = useRef<Map<string, PIXI.Container>>(new Map());
  const tickerRef = useRef<PIXI.Ticker | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  // --- WEB AUDIO ENGINE (always works) ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clickBufferRef = useRef<AudioBuffer | null>(null);
  // helper to play a buffer
  const playBuffer = (buf: AudioBuffer | null, vol = 1.0) => {
    if (!buf || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buf;
    const gain = audioCtxRef.current.createGain();
    gain.gain.value = vol;
    source.connect(gain).connect(audioCtxRef.current.destination);
    source.start();
  };
  let pulseLogoTime = 0;
  const vignetteRef = useRef<PIXI.Graphics | null>(null);
  const twinkleContainerRef = useRef<PIXI.Container | null>(null);
  const introPlayedRef = useRef(false);
  const inIntroRef = useRef(false);
  const startScreenRef = useRef<PIXI.Container | null>(null);
  const audioUnlockedRef = useRef(false);
  const hudContainerRef = useRef<PIXI.Container | null>(null);
  const promptDockContainerRef = useRef<PIXI.Container | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const waterlooDrag = useRef({
    active: false,
    group: [] as any[],
    lastX: 0,
    lastY: 0,
  });
  const world = useWorld();
  
  // Arrow key movement for selected entity
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Check if any entity is selected (using selectedIdRef which tracks selection)
      const selectedId = selectedIdRef.current;
      if (!selectedId) return;

      switch (e.key) {
        case "ArrowUp":
          world.moveSelected?.("up", 20);
          break;
        case "ArrowDown":
          world.moveSelected?.("down", 20);
          break;
        case "ArrowLeft":
          world.moveSelected?.("left", 20);
          break;
        case "ArrowRight":
          world.moveSelected?.("right", 20);
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [world.moveSelected]);

  // PATCH H6 — Live world binding
  const worldRef = useRef(world);
  const { memory } = world;
  // Update worldRef when world changes
  useEffect(() => {
    worldRef.current = world;

    // DEBUG / RUNTIME BINDING — expose the live world for Pixi + DevTools
    if (typeof window !== "undefined") {
      // World used by UI and other systems
      // @ts-ignore
      window.world = worldRef.current;

      // World used by Pixi runtime and movement logic
      (window as any).__pixiWorld = worldRef.current;
    }
  }, [world]);

  // --- UNIFIED DELETE ENTITY FUNCTION ---
  const deleteEntity = useCallback((id: string) => {
    const app = appRef.current;
    const graphicsMap = graphicsMapRef.current;
    // Check if entity exists in graphicsMap
    if (!graphicsMap.has(id)) {
      // Still remove from memory if it exists there
      // Use the base deleteEntity to avoid recursion
      const w = worldRef.current;
      if (w?.baseDeleteEntity) {
        w.baseDeleteEntity(id);
      }
      return;
    }
    // Get the container
    const container = graphicsMap.get(id);
    if (!container || !(container instanceof PIXI.Container)) {
      graphicsMap.delete(id);
      // Use the base deleteEntity to avoid recursion
      const w = worldRef.current;
      if (w?.baseDeleteEntity) {
        w.baseDeleteEntity(id);
      }
      return;
    }
    // Remove event listeners
    container.off("pointerdown");
    container.off("pointerup");
    container.off("pointerupoutside");
    container.off("pointermove");
    container.off("pointerover");
    container.off("pointerout");
    // Remove container from stage
    if (app && app.stage && container.parent === app.stage) {
      // PATCH: Race condition fix - preserve vignetteLayer and starsLayer
      if (container.name !== "vignetteLayer" && container.name !== "starsLayer") {
        app.stage.removeChild(container);
      } else {
        return;
      }
    }
    // Destroy the container and all children
    container.destroy({ children: true });
    // Remove from graphicsMap
    graphicsMap.delete(id);
    // Clear selection if this was the selected entity
    if (selectedIdRef.current === id) {
      selectedIdRef.current = null;
    }
    // Remove from memory.entities (use base deleteEntity to avoid recursion)
    const w = worldRef.current;
    if (w?.baseDeleteEntity) {
      w.baseDeleteEntity(id);
    }
    // Force rerender
    if (w?.forceRender) {
      w.forceRender();
    }
  }, [world]);

  // Register the unified deleteEntity with worldState
  useEffect(() => {
    if (world.setDeleteEntity) {
      world.setDeleteEntity(deleteEntity);
    }
    return () => {
      if (world.setDeleteEntity) {
        world.setDeleteEntity(undefined);
      }
    };
  }, []); // IMPORTANT: empty dependency array

  // --- ENTITY SELECTION HIGHLIGHT ---
  const highlightSelectedEntity = useCallback(() => {
    const selectedId = selectedIdRef.current;
    const graphicsMap = graphicsMapRef.current;
    graphicsMap.forEach((container, eid) => {
      if (!(container instanceof PIXI.Container)) return;
      const highlight = container.getChildByName("highlight-ring");
      if (eid === selectedId) {
        // Add or update highlight
        if (highlight) {
          highlight.visible = true;
        } else {
          const ring = new PIXI.Graphics();
          ring.name = "highlight-ring";
          ring.lineStyle(2, 0xffffff, 0.75);
          ring.drawCircle(0, 0, 42);
          ring.endFill();
          container.addChild(ring);
        }
      } else {
        // Hide highlight on others
        if (highlight) highlight.visible = false;
      }
    });
  }, []);

  // --- WORLD EVENT GLOW PULSE ---
  const [worldGlowPulse, setWorldGlowPulse] = useState<number>(0);
  const prevEntityCountRef = useRef<number>(0);

  // --- AI CURSOR RIPPLE TRACKING ---
  const cursorPos = useRef({ x: -9999, y: -9999 });
  const [cursorPulse, setCursorPulse] = useState(0);
  const cursorRippleRef = useRef<HTMLDivElement>(null);

  // --- AI THINKING GLOW ---
  const [aiThinkingPulse, setAiThinkingPulse] = useState(0);
  const thinkingStartRef = useRef<number | null>(null);

  // --- ENTITY HOVER & CLICK HIGHLIGHTS ---
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const lastHoveredIdRef = useRef<string | null>(null);

  // Helper to convert degrees to radians (used for orbital rings)
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Helper to interpolate between two colors
  const interpolateColor = (color1: number, color2: number, t: number): number => {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  };

  // Helper function to draw a wobbling circle with hologram shimmer
  const drawWobblingCircle = (
    gfx: PIXI.Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    lineWidth: number,
    color: number,
    baseAlpha: number,
    time: number,
    segments: number = 64
  ) => {
    const wobbleStrength = radius * 0.02; // 2% of radius (0.015-0.025 range)
    const segmentsArray: { x: number; y: number; alpha: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Simple pseudo-random wavering using multiple sin waves (Perlin-like)
      const noise1 = Math.sin(angle * 3 + time * 0.3) * 0.5;
      const noise2 = Math.sin(angle * 7 + time * 0.5) * 0.3;
      const noise3 = Math.sin(angle * 13 + time * 0.4) * 0.2;
      const wobble = (noise1 + noise2 + noise3) * wobbleStrength;
      // Tonal variation: alternate between slightly darker and brighter
      const tonalPhase = angle * 4 + time * 0.2;
      const tonalOffset = Math.sin(tonalPhase) * 0.08; // ±8% alpha variation
      const alpha = Math.max(0.3, Math.min(1.0, baseAlpha + tonalOffset));
      const adjustedRadius = radius + wobble;
      segmentsArray.push({
        x: centerX + Math.cos(angle) * adjustedRadius,
        y: centerY + Math.sin(angle) * adjustedRadius,
        alpha: alpha
      });
    }
    // Draw the wobbling circle with tonal variation
    for (let i = 0; i < segmentsArray.length - 1; i++) {
      const seg1 = segmentsArray[i];
      const seg2 = segmentsArray[i + 1];
      // Use average alpha for smooth interpolation
      const avgAlpha = (seg1.alpha + seg2.alpha) * 0.5;
      gfx.lineStyle(lineWidth, color, avgAlpha);
      if (i === 0) {
        gfx.moveTo(seg1.x, seg1.y);
      }
      gfx.lineTo(seg2.x, seg2.y);
    }
  };

  // Clean update function - only unit movement, no animations
  const pulseUpdate = useCallback(() => {
    // DEBUG: expose pulseUpdate for runtime
    ;(window as any).__pulseUpdate = pulseUpdate;
    const app = appRef.current;
    if (!app) return;
    if (graphicsMapRef.current.size === 0) return;
    // Always read live worldState
    const w = worldRef.current;
    if (!w) return;
    const entities = w.memory.entities;

    // ==== DRAG UPDATE (frame-driven) ====
    // PATCH: Movement Binding Fix - use graphicsMapRef.current directly
    for (const [id, gfx] of graphicsMapRef.current.entries()) {
      if (gfx.dragging && gfx.dragOffset) {
        const targetX = pointerRef.current.x - gfx.dragOffset.x;
        const targetY = pointerRef.current.y - gfx.dragOffset.y;
        // light smoothing (85% toward target – instant but silky)
        gfx.x = Math.round(gfx.x + (targetX - gfx.x) * 0.85);
        gfx.y = Math.round(gfx.y + (targetY - gfx.y) * 0.85);
        // sync worldState immediately
        const ent = entities.find(e => e.id === id);
        if (ent && ent.transform) {
          ent.transform.x = gfx.x;
          ent.transform.y = gfx.y;
        }
        continue;
      }
    }

    // ***********************************************************
    // PATCH H9 — FIXED MOVEMENT LOOP (LIVE)
    // Correct binding to graphicsMapRef, ensures all units move.
    // ***********************************************************
    // PATCH: Movement Binding Fix - use graphicsMapRef.current directly
    for (const [entityId, gfx] of graphicsMapRef.current.entries()) {
      const entity = entities.find(e => e.id === entityId);
      if (!entity) continue;
      //// === SAFE LOCK SYSTEM — VERSION S =========================

      // Ensure ai exists
      if (!entity.ai) entity.ai = { targetX: null, targetY: null, nextUpdate: 0 };

      // 1) SPAWN LOCK — only set once per entity
      if (!(entity.ai as any).spawnLocked) {
        (entity.ai as any).spawnLocked = true;
        (entity.ai as any).spawnLockUntil = Date.now() + 2000;  // 2 sec after spawn
      }

      // --- FINAL RTS LOCK ---
      // Units freeze permanently after formation.
      // Reset happens only when a NEW formation is applied.

      const spawnLocked = false; // spawn lock disabled
      const formLocked = (entity.ai as any).formationLocked === true;

      // FINAL RTS LOCK — units freeze exactly where transform says
      if (formLocked) {
        if (entity.transform) {
          gfx.x = Math.round(entity.transform.x ?? 0);
          gfx.y = Math.round(entity.transform.y ?? 0);
        }
        continue;
      }

      //// === END SAFE LOCK SYSTEM =================================
      if (entity.type !== "unit") continue;
      if (!entity.transform || !entity.ai) continue;
      const tx = entity.ai.targetX;
      const ty = entity.ai.targetY;
      const cx = entity.transform.x;
      const cy = entity.transform.y;
      if (typeof tx !== "number" || typeof ty !== "number") continue;
      if (typeof cx !== "number" || typeof cy !== "number") continue;
      const speed = 0.05;
      const nextX = cx + (tx - cx) * speed;
      const nextY = cy + (ty - cy) * speed;
      entity.transform.x = nextX;
      entity.transform.y = nextY;
      gfx.x = Math.round(nextX);
      gfx.y = Math.round(nextY);
      
      // --- GLOBAL OFFSCREEN CLAMP ---
      const app = appRef.current;
      if (app) {
        const maxX = app.screen.width - 20;   // safe margin
        const maxY = app.screen.height - 20;

        const clampedX = Math.max(20, Math.min(entity.transform.x, maxX));
        const clampedY = Math.max(20, Math.min(entity.transform.y, maxY));

        entity.transform.x = clampedX;
        entity.transform.y = clampedY;

        gfx.x = Math.round(clampedX);
        gfx.y = Math.round(clampedY);
      }
      
    }

    // === WANDER AI — CONTINUOUS MOVEMENT ===
    {
      const now = Date.now();
      for (const [entityId, gfx] of graphicsMapRef.current.entries()) {
        const entity = entities.find(e => e.id === entityId);
        if (!entity) continue;
        if (entity.type !== "unit") continue;
        if (!entity.transform || !entity.ai) continue;
        
        // STOP WANDER WHEN UNIT IS IN FORMATION
        if ((entity.ai as any).isFormation === true) continue;
        
        // FINAL RTS LOCK — never wander if formation is active
        if ((entity.ai as any).formationLocked === true) {
          continue;
        }
        // Skip if locked or being dragged
        const spawnLocked = (entity.ai as any).spawnLockUntil && now < (entity.ai as any).spawnLockUntil;
        const formLocked = (entity.ai as any).formLockUntil && now < (entity.ai as any).formLockUntil;
        if (spawnLocked || formLocked || gfx.dragging) continue;
        
        // Time for next wander update?
        if (entity.ai.nextUpdate && now >= entity.ai.nextUpdate) {
          if ((entity.ai as any).isWaterloo) continue;
          const angle = Math.random() * Math.PI * 2;
          const distance = 50 + Math.random() * 120;
          const tx = (entity.transform.x ?? 0) + Math.cos(angle) * distance;
          const ty = (entity.transform.y ?? 0) + Math.sin(angle) * distance;
          
          entity.ai.targetX = tx;
          entity.ai.targetY = ty;
          
          // *** WANDER LOOP FIX ***
          // Schedule next wander update (1.2–2.0 sec)
          entity.ai.nextUpdate = Date.now() + 1200 + Math.random() * 800;
        }
      }
    }

    // --- HARD PIXI SYNC FROM TRANSFORM (Frame-based) ---
    // PATCH: Movement Binding Fix - use graphicsMapRef.current directly
    for (const [entityId, gfx] of graphicsMapRef.current.entries()) {
      const ent = entities.find(e => e.id === entityId);
      
      // Waterloo spawn protection — never override initial transform
      if ((ent?.ai as any)?.isWaterloo) {
        continue;
      }
      
      if (!ent || !ent.transform) continue;

      // DURING WATERLOO DRAG — DO NOT OVERRIDE POSITIONS
      if (waterlooDrag.current.active && (ent.ai as any)?.isWaterloo) {
        continue; // skip sync for Waterloo entities while dragging
      }

      if (!gfx) continue;
      
      // APPLY TRANSFORM TO PIXI GRAPHICS
      gfx.x = ent.transform?.x ?? 0;
      gfx.y = ent.transform?.y ?? 0;
    }

  }, []);

  // Blink all entities function
  const blinkAll = useCallback(() => {
    const map = graphicsMapRef.current;
    map.forEach((gfx) => {
      // Save original alpha
      const original = gfx.alpha;
      gfx.alpha = 0.2;
      // fade out quickly
      setTimeout(() => {
        gfx.alpha = original;
        // restore after 0.15s
      }, 150); // faster responsiveness
    });
  }, []);

  // Register blinkAll with world context
  useEffect(() => {
    if (world.setBlinkAll) {
      world.setBlinkAll(blinkAll);
    }
    return () => {
      if (world.setBlinkAll) {
        world.setBlinkAll(undefined);
      }
    };
  }, [blinkAll, world]);

  // INITIERA PIXI – BARA EN GÅNG
  useEffect(() => {
    if (!containerRef.current) return;

    // --- WEB AUDIO ENGINE (always works) ---
    audioCtxRef.current = new AudioContext();
    // helper to load audio into a buffer
    async function loadBuffer(url: string) {
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      return await audioCtxRef.current!.decodeAudioData(arrayBuf);
    }
    // load UI click sound
    (async () => {
      clickBufferRef.current = await loadBuffer("/sfx/ui_click_tick.wav");
    })();

    // --- AUDIO UNLOCK (browser only) ---
    const unlockAudio = () => {
      const ctx = new AudioContext();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      window.removeEventListener("pointerdown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });

    // Improve rendering crispness
    PIXI.settings.RESOLUTION = 1; // DISABLE RETINA SCALING
    PIXI.settings.ROUND_PIXELS = true;

    const app = new PIXI.Application({
      backgroundColor: 0x02040a,
      backgroundAlpha: 1,
      antialias: true,
    });
    appRef.current = app;
    // Enable zIndex sorting for all layers
    app.stage.sortableChildren = true;

    // ⭐ RÄTT RAD – PIXI v8 använder .canvas, INTE .view
    containerRef.current.appendChild(app.view as HTMLCanvasElement);

    // Ensure stage always receives pointer events
    app.stage.eventMode = "static";
    app.stage.hitArea = new PIXI.Rectangle(
      0,
      0,
      app.renderer.width,
      app.renderer.height
    );

    function syncSize() {
      if (!app || !app.renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      app.renderer.resolution = 1;   // DISABLE RETINA SCALING
      app.renderer.resize(w, h);
      
      const wState = worldRef.current;
      if (wState) {
        wState.canvasWidth = w;
        wState.canvasHeight = h;
      }
      
      app.stage.hitArea = new PIXI.Rectangle(0, 0, w, h);
    }
    syncSize();
    
    const wState = worldRef.current;
    if (wState) {
      wState.canvasWidth = app.screen.width;
      wState.canvasHeight = app.screen.height;
    }
    
    window.addEventListener("resize", syncSize);

    // DEBUG: expose Pixi app for ticker inspection
    (window as any).__pixiApp = app;

    app.stage.eventMode = "static";
    app.stage.interactive = true;
    app.stage.on("pointermove", (e) => {
      const pos = e.global;
      pointerRef.current.x = pos.x;
      pointerRef.current.y = pos.y;
    });

    // DRAG MOVE
    app.stage.on("pointermove", (e) => {
      if (!waterlooDrag.current.active) return;

      const pos = e.global;
      const dx = pos.x - waterlooDrag.current.lastX;
      const dy = pos.y - waterlooDrag.current.lastY;

      // Move entire block on world-level
      waterlooDrag.current.group.forEach((ent: any) => {
        if (!ent.transform) ent.transform = {};
        ent.transform.x = (ent.transform.x ?? 0) + dx;
        ent.transform.y = (ent.transform.y ?? 0) + dy;
      });

      waterlooDrag.current.lastX = pos.x;
      waterlooDrag.current.lastY = pos.y;

      world.forceRender?.();
    });

    // DRAG END
    app.stage.on("pointerup", () => {
      // After drag ends, Waterloo formation remains exactly where dropped
      waterlooDrag.current.group.forEach((ent: any) => {
        if (ent.ai) {
          (ent.ai as any).formationLocked = true;
        }
      });

      waterlooDrag.current.active = false;
      waterlooDrag.current.group = [];
    });

    //-------------------------------------------------------
    // CLEAR SELECTION WHEN CLICKING EMPTY SPACE
    //-------------------------------------------------------
    app.stage.onpointerdown = () => {
      let changed = false;
      for (const u of world.memory.entities) {
        if ((u as any).selected) {
          (u as any).selected = false;
          changed = true;
        }
      }
      if (changed) world.forceRender?.();
    };

    // === VIGNETTE (MEDIUM CINEMATIC) ===
    const vignette = new PIXI.Graphics();
    vignette.name = "vignetteLayer";
    vignetteRef.current = vignette;
    // Soft cinematic edges
    vignette.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    // Draw function
    function drawVignette() {
      const vignette = vignetteRef.current;
      if (!vignette) return;
      const app = appRef.current;
      if (!app) return;
      const w = app.screen.width;
      const h = app.screen.height;
      vignette.clear();
      // Ellipse radii based on screen
      const radiusX = w * 0.55; // wider horizontal fade
      const radiusY = h * 0.65; // deeper vertical fade
      vignette.beginFill(0x000000, 0.35);
      vignette.drawEllipse(w / 2, h / 2, radiusX, radiusY);
      vignette.endFill();
    }
    drawVignette();
    // PATCH: Race condition fix
    if (app && app.stage) {
      app.stage.addChildAt(vignette, 0);
    }

    // === STAR TWINKLE LAYER ===
    const twinkleContainer = new PIXI.Container();
    twinkleContainer.name = "starsLayer";
    twinkleContainerRef.current = twinkleContainer;
    // PATCH: Race condition fix
    if (app && app.stage) {
      app.stage.addChildAt(twinkleContainer, 1); // under entities, över vignette
    }
    // Create 60 tiny "stars"
    const twinkleW = app.screen.width;
    const twinkleH = app.screen.height;
    for (let i = 0; i < 60; i++) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff, 0.25); // faint
      star.drawCircle(0, 0, Math.random() * 1.2 + 0.8);
      star.endFill();
      star.x = Math.random() * twinkleW;
      star.y = Math.random() * twinkleH;
      // store blink timer
      star.alphaDir = Math.random() > 0.5 ? 1 : -1;
      star.alpha = Math.random() * 0.4 + 0.1; // between 0.1–0.5
      twinkleContainer.addChild(star);
    }

    // --- TWINKLE UPDATE LOOP ---
    const twinkleUpdate = () => {
      if (!twinkleContainer) return;
      twinkleContainer.children.forEach(star => {
        // normal twinkle animation
        if (!star.alphaDir) star.alphaDir = 1;
        star.alpha += star.alphaDir * 0.006;
        if (star.alpha >= 0.45) star.alphaDir = -1;
        if (star.alpha <= 0.08) star.alphaDir = 1;
      });
    };
    registerTick(twinkleUpdate);

    // --- CLEAN CINEMATIC START SCREEN (NO ANIMATION, NO UNDERLINE, NO EFFECTS) ---
    const startScreen = new PIXI.Container();
    startScreenRef.current = startScreen;
    startScreen.alpha = 0;
    // Ensure startScreen never blocks pointer events after fade-out
    startScreen.eventMode = "static";
    startScreen.interactive = true;
    const screenW = app.screen.width;
    const screenH = app.screen.height;
    startScreen.hitArea = new PIXI.Rectangle(0, 0, screenW, screenH);
    startScreen.on("removed", () => {
      startScreen.eventMode = "none";
      startScreen.interactive = false;
    });

    // Black overlay
    const black = new PIXI.Graphics();
    black.beginFill(0x000000, 1);
    black.drawRect(0, 0, screenW, screenH);
    black.endFill();
    startScreen.addChild(black);

    // Tagline styling
    const taglineStyle = new PIXI.TextStyle({
      fill: "#e6e6e6",
      fontSize: 30,
      fontWeight: "400",
      fontFamily: "Montserrat",
      letterSpacing: 1.4,
    });

    // Click to Start styling
    const clickStyle = new PIXI.TextStyle({
      fill: "#ffffff",
      fontSize: 32,
      fontWeight: "500",
      fontFamily: "Montserrat",
    });

    // --- TITLE WITH MAGENTA SLASHES ---
    const titleLeft = new PIXI.Text("Pulse Engine ", {
      fontFamily: "Montserrat",
      fontSize: 72,
      fill: 0x00ffff,
      fontWeight: "700"
    });
    const titleSlashes = new PIXI.Text("//", {
      fontFamily: "Montserrat",
      fontSize: 72,
      fill: 0xb855d3, // perfect darker, cooler match to on-screen pulse-line magenta
      fontWeight: "700"
    });
    const titleRight = new PIXI.Text(" X", {
      fontFamily: "Montserrat",
      fontSize: 72,
      fill: 0x00ffff,
      fontWeight: "700"
    });

    // anchor & positioning
    titleLeft.anchor.set(0.5);
    titleSlashes.anchor.set(0.5);
    titleRight.anchor.set(0.5);

    // baseline
    const titleY = screenH / 2 - 80;
    titleLeft.y = titleY;
    titleSlashes.y = titleY;
    titleRight.y = titleY;

    // horizontal centering as a group
    const totalWidth = titleLeft.width + titleSlashes.width + titleRight.width;
    const centerX = screenW / 2;
    titleLeft.x = centerX - totalWidth / 2 + titleLeft.width / 2;
    titleSlashes.x = titleLeft.x + titleLeft.width / 2 + titleSlashes.width / 2;
    titleRight.x = titleSlashes.x + titleSlashes.width / 2 + titleRight.width / 2;

    startScreen.addChild(titleLeft);
    startScreen.addChild(titleSlashes);
    startScreen.addChild(titleRight);

    // Tagline
    const tagline = new PIXI.Text("Everything starts with a Pulse.", taglineStyle);
    tagline.anchor.set(0.5);
    tagline.x = screenW / 2;
    tagline.y = screenH / 2 - 15;
    startScreen.addChild(tagline);

    // --- STATIC LOGO BETWEEN TAGLINE & CLICK ---
    const pulseLogo = PIXI.Sprite.from("/branding/pulse_engine_static.png");
    pulseLogo.anchor.set(0.5);
    pulseLogo.x = screenW / 2;
    pulseLogo.y = screenH / 2 + 150;
    pulseLogo.alpha = 1;
    pulseLogo.scale.set(0.58); // new baseline scale
    pulseLogo.filters = [
      new PIXI.filters.BlurFilter(0) // light blur, animated later
    ];
    startScreen.addChild(pulseLogo);

    // Click to Start
    const clickText = new PIXI.Text("Click to Start", clickStyle);
    clickText.anchor.set(0.5);
    clickText.x = screenW / 2;
    clickText.y = screenH / 2 + 265;
    startScreen.addChild(clickText);

    // PATCH: Race condition fix
    // INTRO DISABLED - Start screen bypassed for immediate simulation access
    // if (app && app.stage) {
    //   app.stage.addChild(startScreen);
    // }
    
    // INTRO DISABLED - Show UI immediately, skip intro sequence
    if (world.setUiVisible) {
      world.setUiVisible(true);
    }

    // Subtle glow-pulse animation on pulseLogo (only for start screen)
    const pulseLogoTicker = (delta: number) => {
      // --- SUBTLE GLOW PULSE ON PULSE LOGO ---
      if (startScreen.parent && startScreen.alpha > 0) {
        pulseLogoTime += delta * 0.03;
        // small breathing scale effect
        const scale = 0.58 + Math.sin(pulseLogoTime) * 0.010; // small vibration around new baseline
        pulseLogo.scale.set(scale);
        // subtle glow (blur radius)
        const blurAmount = 0.3 + (Math.sin(pulseLogoTime * 0.7) + 1) * 0.8;
        if (pulseLogo.filters && pulseLogo.filters[0] instanceof PIXI.BlurFilter) {
          pulseLogo.filters[0].blur = blurAmount;
        }
        // slight luminance pulse (alpha breathing)
        pulseLogo.alpha = 0.93 + Math.sin(pulseLogoTime * 0.6) * 0.05;
      }
    };
    const pulseLogoTickerWrapper = () => {
      pulseLogoTicker(1); // Pass default delta
    };
    registerTick(pulseLogoTickerWrapper);

    // Clean up ticker when start screen is removed
    const originalDestroy = startScreen.destroy.bind(startScreen);
    startScreen.destroy = (options?: boolean | { children?: boolean; texture?: boolean; baseTexture?: boolean }) => {
      unregisterTick(pulseLogoTickerWrapper);
      return originalDestroy(options);
    };

    // Fade-in only
    const fadeInStart = performance.now();
    const fadeInDuration = 800;
    function fadeInStartScreen() {
      const t = performance.now() - fadeInStart;
      const p = Math.min(1, t / fadeInDuration);
      startScreen.alpha = p;
      if (p < 1) requestAnimationFrame(fadeInStartScreen);
    }
    // INTRO DISABLED - Skip fade-in animation
    // requestAnimationFrame(fadeInStartScreen);

    // INTRO DISABLED - Skip start screen click handler
    // On click → fade out only, then run intro
    // startScreen.cursor = "pointer";
    // startScreen.on("pointerdown", () => {
    //   // PATCH: Race condition fix
    //   const app = appRef.current;
    //   if (!app || !app.stage) {
    //     return;
    //   }
    //   // Play click sound
    //   playBuffer(clickBufferRef.current, 0.85);
    //   const fadeOutStart = performance.now();
    //   const fadeOutDuration = 700;
    //   function fadeOutStartScreen() {
    //     const t = performance.now() - fadeOutStart;
    //     const p = Math.min(1, t / fadeOutDuration);
    //     startScreen.alpha = 1 - p;
    //     if (p < 1) requestAnimationFrame(fadeOutStartScreen);
    //     else {
    //       startScreen.interactiveChildren = false;
    //       startScreen.eventMode = "none";
    //       // PATCH: Race condition fix
    //       if (app && app.stage) {
    //         app.stage.removeChild(startScreen);
    //       }
    //       startScreen.destroy(true);
    //       runIntroSequence();
    //     }
    //   }
    //   requestAnimationFrame(fadeOutStartScreen);
    // });

    // === DUAL INTRO SEQUENCE ===
    const playIntro = async (introTexture: PIXI.Texture, withSound: boolean): Promise<void> => {
      return new Promise(async (resolve) => {
        // PATCH: Race condition fix
        const app = appRef.current;
        if (!app || !app.stage) {
          resolve();
          return;
        }
        // Force pure black background in intro scenes
        app.renderer.background.color = 0x000000;
        // Mark as in intro and hide stars
        inIntroRef.current = true;
        if (twinkleContainerRef.current) {
          twinkleContainerRef.current.visible = false;
        }
        if (vignetteRef.current) {
          vignetteRef.current.visible = false;
        }

        const introSprite = new PIXI.Sprite(introTexture);
        // Center on stage
        introSprite.anchor.set(0.5);
        const w = app.screen.width;
        const h = app.screen.height;
        introSprite.x = w / 2;
        introSprite.y = h / 2;
        // Set static scale
        introSprite.scale.set(0.85);
        introSprite.alpha = 0;

        // PATCH: Race condition fix
        if (app && app.stage) {
          // Add to stage at highest z-index (above everything, including overlay)
          app.stage.addChildAt(introSprite, app.stage.children.length - 1);
        }

        // Create audio if enabled (before fade-in)
        let introSound: HTMLAudioElement | null = null;
        if (withSound) {
          introSound = new Audio("/audio/intro/pulse_engine_intro_heartbeat.wav");
          introSound.volume = 0.85;
        }

        // Fade in: 0 → 1 over 1200ms
        const fadeInDuration = 1200;
        const fadeInStart = Date.now();
        const fadeIn = () => {
          // Start sound exactly when fade-in begins
          if (withSound && introSound && introSound.paused) {
            introSound.currentTime = 0;
            introSound.play().catch(()=>{});
          }
          const elapsed = Date.now() - fadeInStart;
          const progress = Math.min(elapsed / fadeInDuration, 1);
          introSprite.alpha = progress;
          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            // Hold visible for 2600ms (static, no animation)
            const holdStart = Date.now();
            const holdDuration = 2600;
            // Smooth fade-out function (must be defined BEFORE the hold phase ends)
            function fadeOutLogo() {
              const fadeOutDuration = 1200;
              const start = Date.now();
              const step = () => {
                const t = (Date.now() - start) / fadeOutDuration;
                const p = Math.min(1, t);
                introSprite.alpha = 1 - p;
                if (p < 1) {
                  requestAnimationFrame(step);
                } else {
                  // PATCH: Race condition fix
                  if (introSprite.parent && app && app.stage) {
                    app.stage.removeChild(introSprite);
                  }
                  introSprite.destroy(true);
                  // Mark intro as complete and show stars again
                  inIntroRef.current = false;
                  if (twinkleContainerRef.current) {
                    twinkleContainerRef.current.visible = true;
                  }
                  if (vignetteRef.current) {
                    vignetteRef.current.visible = true;
                  }
                  resolve(); // continue sequence
                }
              };
              requestAnimationFrame(step);
            }
            const hold = () => {
              const elapsed = Date.now() - holdStart;
              if (elapsed < holdDuration) {
                requestAnimationFrame(hold);
              } else {
                // --- WAIT FOR AUDIO THEN FADE OUT LOGO ---
                if (withSound && introSound) {
                  const waitForAudio = () => {
                    if (introSound.ended) {
                      fadeOutLogo();
                    } else {
                      requestAnimationFrame(waitForAudio);
                    }
                  };
                  waitForAudio();
                } else {
                  fadeOutLogo();
                }
              }
            };
            requestAnimationFrame(hold);
          }
        };
        requestAnimationFrame(fadeIn);
      });
    };

    // === INTRO SEQUENCE FUNCTION ===
    const runIntroSequence = async () => {
      // PATCH: Race condition fix
      const app = appRef.current;
      if (!app || !app.stage) {
        return;
      }
      // === LOAD INTRO TEXTURES ===
      const arctaviaTexture = await PIXI.Assets.load("/branding/arctavia_labs_intro.png");
      const pulseTexture = await PIXI.Assets.load("/branding/pulse_engine_x_intro_v5.png");

      // === RUN INTRO SEQUENCE ===
      // --- Arctavia intro (silent) ---
      await playIntro(arctaviaTexture, false);
      // --- Pulse Engine // X intro (WITH SOUND) ---
      await playIntro(pulseTexture, true);

      // Intros complete - world spawning can now proceed

      // --- WATERMARK (Pulse Engine // X) ---
      {
        // PATCH: Race condition fix
        const app = appRef.current;
        if (app && app.stage) {
          const w = app.screen.width;
          const h = app.screen.height;
          // Watermark
          const watermarkTexture = PIXI.Texture.from("/branding/pulse_engine_watermark_white.png");
          const watermark = new PIXI.Sprite(watermarkTexture);
          watermark.anchor.set(1, 1);
          watermark.alpha = 0.38;
          watermark.scale.set(0.22);
          watermark.position.set(w - 22, h - 22);
          watermark.zIndex = 9999;
          app.stage.addChild(watermark);
        }
      }

      // --- SHOW HUD + PROMPT DOCK AFTER INTRO ---
      // tell React to show the UI now that intro is finished
      if (world.setUiVisible) world.setUiVisible(true);
    };

    // --- GLOBAL RESET LISTENER ---
    function onGlobalReset() {
      if (appRef.current) {
        resetEngine(appRef.current);
      }
      // Clear selection when resetting
      selectedIdRef.current = null;
      window.dispatchEvent(new CustomEvent("entity-cleared"));
    }
    window.addEventListener("pulse-reset-world", onGlobalReset);

    // Create ticker for pulse animation
    const ticker = PIXI.Ticker.shared;
    ticker.autoStart = true;
    tickerRef.current = ticker;

    // Register main ticker to run all registered ticks
    app.ticker.add((ticker) => {
      runAllTicks();
    });

    // --- ENSURE pulseUpdate is registered exactly once ---
    registerTick(pulseUpdate);

    // === ATTACH MOVEMENT RUNTIME (SAFE, ONCE) ===
    try {
      const w = (window as any).__pulseWorld;
      if (w && !(window as any).__movementRuntimeAttached) {
        registerMovementRuntime(w);
        (window as any).__movementRuntimeAttached = true;
      }
    } catch (err) {
      // MovementRuntime attachment failed silently
    }

    return () => {
      unregisterTick(pulseUpdate);
      unregisterTick(twinkleUpdate);
      window.removeEventListener("pulse-reset-world", onGlobalReset);
      window.removeEventListener("resize", syncSize);
      graphicsMapRef.current.forEach(gfx => gfx.destroy({ children: true }));
      graphicsMapRef.current.clear();
      // PATCH: Skybox/Himmel Stabilitet - preserve layers, don't destroy them
      if (vignetteRef.current && vignetteRef.current.parent) {
        vignetteRef.current.parent.removeChild(vignetteRef.current);
      }
      vignetteRef.current = null;
      if (twinkleContainerRef.current && twinkleContainerRef.current.parent) {
        twinkleContainerRef.current.parent.removeChild(twinkleContainerRef.current);
      }
      twinkleContainerRef.current = null;
      app.destroy(true);
      appRef.current = null;
      tickerRef.current = null;
    };
  }, []);

  // RENDER ENTITIES
  useEffect(() => {
    const app = appRef.current;
    // PATCH: Race condition fix
    if (!app || !app.stage) return;

    const graphicsMap = graphicsMapRef.current;
    const currentIds = new Set(memory.entities.map(e => e.id));
    const existingIds = new Set(graphicsMap.keys());

    // Remove deleted entities (use unified cleanup - memory already updated)
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const container = graphicsMap.get(id);
        if (container && container instanceof PIXI.Container) {
          // Remove event listeners
          container.off("pointerdown");
          container.off("pointerup");
          container.off("pointerupoutside");
          container.off("pointermove");
          container.off("pointerover");
          container.off("pointerout");
          // Remove container from stage
          // PATCH: Race condition fix + preserve layers
          if (app && app.stage && container.parent === app.stage) {
            if (container.name !== "vignetteLayer" && container.name !== "starsLayer") {
              app.stage.removeChild(container);
            } else {
              continue;
            }
          }
          // Destroy the container and all children
          container.destroy({ children: true });
          // Remove from graphicsMap
          graphicsMap.delete(id);
        }
      }
    }

    // PATCH: Skybox/Himmel Stabilitet - ensure layers exist before rendering entities
    // Ensure vignetteLayer exists
    if (!vignetteRef.current || !app.stage.getChildByName("vignetteLayer")) {
      const vignette = new PIXI.Graphics();
      vignette.name = "vignetteLayer";
      vignetteRef.current = vignette;
      vignette.blendMode = PIXI.BLEND_MODES.MULTIPLY;
      function drawVignette() {
        const app = appRef.current;
        if (!app) return;
        const w = app.screen.width;
        const h = app.screen.height;
        vignette.clear();
        const radiusX = w * 0.55;
        const radiusY = h * 0.65;
        vignette.beginFill(0x000000, 0.35);
        vignette.drawEllipse(w / 2, h / 2, radiusX, radiusY);
        vignette.endFill();
      }
      drawVignette();
      if (app && app.stage) {
        app.stage.addChildAt(vignette, 0);
      }
    }
    // Ensure starsLayer exists
    if (!twinkleContainerRef.current || !app.stage.getChildByName("starsLayer")) {
      const twinkleContainer = new PIXI.Container();
      twinkleContainer.name = "starsLayer";
      twinkleContainerRef.current = twinkleContainer;
      if (app && app.stage) {
        app.stage.addChildAt(twinkleContainer, 1);
      }
      // Create stars if container is empty
      if (twinkleContainer.children.length === 0) {
        for (let i = 0; i < 60; i++) {
          const star = new PIXI.Graphics();
          star.beginFill(0xffffff, 0.25);
          star.drawCircle(0, 0, Math.random() * 1.2 + 0.8);
          star.endFill();
          const app = appRef.current;
          if (!app) return;
          star.x = Math.random() * app.screen.width;
          star.y = Math.random() * app.screen.height;
          star.alphaDir = Math.random() > 0.5 ? 1 : -1;
          star.alpha = Math.random() * 0.4 + 0.1;
          twinkleContainer.addChild(star);
        }
      }
    }

    // Add/update current entities
    for (const ent of memory.entities) {
      let gfx = graphicsMap.get(ent.id);
      if (!gfx) {
        const baseScale = ent.transform?.scale ?? 1;
        const entityContainer = new PIXI.Container();
        entityContainer.entityId = ent.id;
        entityContainer.baseScale = baseScale;
        entityContainer.scale.set(baseScale);

        // CRITICAL: Register container IMMEDIATELY (before any rendering logic)
        // This ensures ALL entities (including Waterloo) are always visible
        graphicsMap.set(ent.id, entityContainer);
        if (app && app.stage) app.stage.addChild(entityContainer);
        gfx = entityContainer;

        // --- ENTITY COLORS ---
        const entityColors = {
          unit: 0x00F6FF, // cyan
          marker: 0xFF42FF, // pink-magenta
          prop: 0x008BFF, // azure-blue
          effect: 0xFFA200, // laser-orange
        };
        const entityColor = entityColors[ent.type] || 0x00F6FF;

        // --- SELECTION HIGHLIGHT ---
        if (selectedIdRef.current === ent.id) {
          const hl = new PIXI.Graphics();
          hl.lineStyle(3, 0x00ffff, 0.65);
          hl.drawCircle(0, 0, 48 * (ent.transform?.scale ?? 1));
          hl.zIndex = 9999;
          entityContainer.addChild(hl);
        }

        // --- BASE CIRCLE (clean, no blur, no halos) ---
        const core = new PIXI.Graphics();
        core.entityId = ent.id;
        entityContainer.addChild(core);

        // ----------------------------------------------------------
        // WATERLOO SHAPE RENDERING (create-time only)
        // ----------------------------------------------------------
        const ai = ent.ai as any;
        if (ai && ai.isWaterloo) {
          // Hide Waterloo visuals
          if (world.showWaterloo === false) {
            continue;
          }
          const shape = ai.shape;
          const nation = ai.nation;

          const color =
            nation === "british" ? 0xff4a4a : 0x4a7dff;

          core.clear();
          core.lineStyle(2, 0xffffff, 1);
          core.beginFill(color);

          const r = 10;
          const s = 12;

          if (shape === "circle") {
            core.drawCircle(0, 0, r);
          } else if (shape === "triangle") {
            core.drawPolygon([0, -s, s, s, -s, s]);
          } else if (shape === "square") {
            core.drawRect(-s, -s, s * 2, s * 2);
          }

          core.endFill();

          // Waterloo drag setup
          if (gfx) {
            gfx.eventMode = "static";
            gfx.cursor = "grab";

            gfx.on("pointerdown", (e) => {
              const pos = e.global;

              waterlooDrag.current.active = true;
              waterlooDrag.current.lastX = pos.x;
              waterlooDrag.current.lastY = pos.y;

              // Select full Waterloo block
              waterlooDrag.current.group = world.memory.entities.filter(
                (x: any) => (x.ai as any)?.isWaterloo
              );

              // LOCK WATERLOO FORMATION MOVEMENT WHILE DRAGGING
              waterlooDrag.current.group.forEach((ent: any) => {
                if (ent.ai) {
                  (ent.ai as any).formationLocked = true;
                }
              });

              if (gfx) gfx.cursor = "grabbing";
              e.stopPropagation(); // prevents UI layers from blocking
            });
          }

          continue;   // safe now because gfx already registered
        }

        // --- CLEAN CIRCLE ---
        core.clear();
        core.beginFill(entityColor, 1.0);
        core.drawCircle(0, 0, 18);
        core.endFill();
        // --- SPAWN THINKING GLOW (non-destructive, auto-clean) ---
        if (ent.type === "unit") {
          const glow = new PIXI.Graphics();
          glow.name = "spawn-thinking-glow";

          const radius = 26;
          glow.lineStyle(4, 0x00ffff, 0.55);
          glow.drawCircle(0, 0, radius);
          glow.alpha = 0.9;

          entityContainer.addChild(glow);

          // Smooth fade-out animation (500ms total)
          const start = Date.now();
          function fadeGlow() {
            const t = (Date.now() - start) / 500;
            if (t >= 1) {
              if (glow.parent) glow.parent.removeChild(glow);
              glow.destroy();
              return;
            }
            glow.alpha = 0.9 * (1 - t);
            requestAnimationFrame(fadeGlow);
          }
          requestAnimationFrame(fadeGlow);
        }
        // Set hit area for interaction
        core.hitArea = new PIXI.Circle(0, 0, 18);

        // POSITIONING
        // === FINALIZED: NO SPAWN LOGIC IN PIXI ===
        // PixiStage must only READ x/y coming from worldState.
        // Spawn positions are computed in PromptDock Poisson system.
        if (ent.transform?.x != null && ent.transform?.y != null) {
          // --- SOFT DISTRIBUTION (only for non-units) ---
          if (ent.type !== "unit" && (ent as any).category !== "unit") {
            const app = appRef.current;
            if (app) {
              // Random angle
              const angle = Math.random() * Math.PI * 2;
              // Random distance (35–85 px)
              const distance = 35 + Math.random() * 50;
              // Offset
              const offsetX = Math.cos(angle) * distance;
              const offsetY = Math.sin(angle) * distance;
              // Apply offset to transform
              ent.transform.x += offsetX;
              ent.transform.y += offsetY;
              // Prevent going outside canvas
              ent.transform.x = Math.max(40, Math.min(app.screen.width - 40, ent.transform.x));
              ent.transform.y = Math.max(40, Math.min(app.screen.height - 40, ent.transform.y));
            }
          }
          entityContainer.x = ent.transform?.x ?? entityContainer.x;
          entityContainer.y = ent.transform?.y ?? entityContainer.y;
        }

        // Enable drag & drop
        const entityContainerRef = entityContainer; // Store reference for event handlers
        entityContainerRef.eventMode = "static";
        entityContainerRef.cursor = "pointer";

        //-------------------------------------------------------
        // SINGLE CLICK SELECTION (safe, isolated)
        //-------------------------------------------------------
        const entityId = ent.id; // Capture entity ID for closure
        entityContainerRef.onpointerdown = (e) => {
          e.stopPropagation(); // don't trigger stage click

          const clickedEnt = world.memory.entities.find(x => x.id === entityId);
          if (!clickedEnt) return;

          // Clear old selection
          for (const u of world.memory.entities) {
            (u as any).selected = false;
          }

          // Select this one
          (clickedEnt as any).selected = true;

          // Update UI / editor overlays
          world.forceRender?.();
        };

        // Helper function to update entity transform without React re-renders
        const updateEntityTransform = (entityId: string, x: number, y: number) => {
          const w = worldRef.current;
          if (!w) return;
          const entity = w.memory.entities.find(ent => ent.id === entityId);
          if (entity) {
            entity.transform = entity.transform || {};
            entity.transform.x = x;
            entity.transform.y = y;
          }
        };

        entityContainerRef.on("pointerdown", (e) => {
          e.stopPropagation();
          // UI click sound
          playBuffer(clickBufferRef.current, 0.45);
          entityContainerRef.dragging = true;
          entityContainerRef.dragOffset = {
            x: e.global.x - entityContainerRef.x,
            y: e.global.y - entityContainerRef.y
          };
          // Select the entity
          if (entityContainerRef.entityId) {
            selectedIdRef.current = entityContainerRef.entityId;
            window.dispatchEvent(
              new CustomEvent("entity-selected", { detail: entityContainerRef.entityId })
            );
            highlightSelectedEntity();
            // --- SELECT LOGGING ---
            if (typeof window !== "undefined" && (window as any).__pulseLog) {
              const label = ent.type.charAt(0).toUpperCase() + ent.type.slice(1);
              (window as any).__pulseLog(`> Selected ${label} #${ent.id}`);
            }
          }
        });

        entityContainerRef.on("pointerup", () => {
          entityContainerRef.dragging = false;
        });

        entityContainerRef.on("pointerupoutside", () => {
          entityContainerRef.dragging = false;
        });

        // NOTE: Registration already done at top of CREATE block
        // (graphicsMap.set, app.stage.addChild, gfx assignment)
        // No duplicate registration needed here

        // === SPAWN-WANDER FIX v1 — start moving immediately ===
        if (ent.ai) {
          const driftAngle = Math.random() * Math.PI * 2;
          const driftDist = 50 + Math.random() * 120;

          const startX = ent.transform?.x ?? 0;
          const startY = ent.transform?.y ?? 0;

          // First movement target for immediate motion
          ent.ai.targetX = startX + Math.cos(driftAngle) * driftDist;
          ent.ai.targetY = startY + Math.sin(driftAngle) * driftDist;

          // Schedule next wander update (1–2 sec)
          ent.ai.nextUpdate = Date.now() + 1000 + Math.random() * 800;

          // Remove all spawn locks (they prevent movement)
          (ent.ai as any).spawnLockUntil = 0;
          (ent.ai as any).spawnLocked = false;
        }
      } else {
        // --- Core Restore Patch (Waterloo visibility fix) ---
        let core = gfx.children.find(c => (c as any).entityId === ent.id) as PIXI.Graphics;

        if (!core) {
          core = new PIXI.Graphics();
          (core as any).entityId = ent.id;
          gfx.addChild(core);
        }

        // ----------------------------------------------------------
        // WATERLOO SHAPE RENDERING — correct placement (Patch A)
        // ----------------------------------------------------------
        if ((ent.ai as any)?.isWaterloo) {
          // Hide Waterloo visuals
          if (world.showWaterloo === false) {
            continue;
          }

          const core = gfx.children.find(c => (c as any).entityId === ent.id) as PIXI.Graphics;
          if (core) {
            const shape = (ent.ai as any).shape;     // circle | triangle | square
            const nation = (ent.ai as any).nation;   // french | british

            const color =
              nation === "british"
                ? 0xff4a4a   // red
                : 0x4a7dff;  // blue (french)

            core.clear();
            core.lineStyle(2, 0xffffff, 1);          // white outline
            core.beginFill(color);

            const r = 10;   // radius for circle
            const s = 12;   // size for triangle/square

            if (shape === "circle") {
              core.drawCircle(0, 0, r);

            } else if (shape === "triangle") {
              core.drawPolygon([
                0, -s,
                s, s,
                -s, s
              ]);

            } else if (shape === "square") {
              core.drawRect(-s, -s, s * 2, s * 2);
            }

            core.endFill();
            core.hitArea = new PIXI.Circle(0, 0, 18);
          }

          // IMPORTANT:
          // Do NOT continue or return here.
          // Waterloo units MUST still get position and zIndex updates.
        }

        // Update position if changed (round for crisp pixels)
        if (gfx instanceof PIXI.Container) {
          // Only units can have their positions updated from transform
          // Non-units are frozen in place
          if (ent.type === "unit" || (ent as any).category === "unit") {
            if (ent.transform) {
              gfx.x = ent.transform?.x ?? 0;
              gfx.y = ent.transform?.y ?? 0;
            }
          } else {
            // Non-units must follow transform exactly
            if (ent.transform?.x != null) gfx.x = Math.round(ent.transform.x);
            if (ent.transform?.y != null) gfx.y = Math.round(ent.transform.y);
          }

          // Update base scale if changed (no animations, just set directly)
          const newBaseScale = ent.transform?.scale ?? 1;
          if (gfx.baseScale !== newBaseScale) {
            gfx.baseScale = newBaseScale;
            gfx.scale.set(newBaseScale);
          }
        }
      }
    }

    // Global pointer move handler for hover detection (only add once)
    if (!app.stage.listenerCount("pointermove")) {
      app.stage.eventMode = "dynamic";
      app.stage.on("pointermove", (e) => {
        // Ensure WebAudio is active
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume();
        }
        const mx = e.global.x;
        const my = e.global.y;
        let nearest: string | null = null;
        let minDist = 99999;
        // Find nearest entity
        memory.entities.forEach((entity) => {
          const x = entity.transform?.x ?? 0;
          const y = entity.transform?.y ?? 0;
          const dx = mx - x;
          const dy = my - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28 && dist < minDist) {
            minDist = dist;
            nearest = entity.id;
          }
        });
        // Update hover state for selection highlight
        lastHoveredIdRef.current = nearest;
      });

      app.stage.on("pointerdown", (e) => {
        // --- UI CLICK PROTECTION (FINAL VERSION) ---
        // Allow PIXI canvas clicks ALWAYS.
        // Block ONLY real DOM UI panels marked with data-dom-ui="true".
        const nativeTarget = e.nativeEvent?.target as HTMLElement | null;
        // 1) If target IS the Pixi canvas → allow click.
        if (nativeTarget && nativeTarget === (app.view as any)) {
          // canvas click → forward to Pixi formation logic
        }
        // 2) Otherwise block if it's inside a DOM UI element
        else if (nativeTarget && nativeTarget.closest("[data-dom-ui='true']")) {
          return; // UI click → do NOT send to Pixi
        }

        // --- PATCH H: Ensure we always read current mode ---
        const mode = worldRef.current?.currentMode;
        if (mode) {
          const target = { x: e.global.x, y: e.global.y };
          if (typeof worldRef.current.applyFormation === "function") {
            // FINAL RTS LOCK — clear lock for all units when new formation is applied
            const w = worldRef.current;
            if (w?.memory?.entities) {
              for (const entity of w.memory.entities) {
                if (entity.ai) {
                  (entity.ai as any).formationLocked = false; // allow movement to new formation target
                }
              }
            }
            if (mode !== "none") {
              worldRef.current.applyFormation(mode, target);
            }
            return; // stop further processing
          }
        }

        const w = worldRef.current;
        if (!w) return;

        const clickX = e.global.x;
        const clickY = e.global.y;

        // Check if clicked on an entity
        const clickedEntity = e.target && "entityId" in e.target ? (e.target as any).entityId : null;

        // Fix selection clearing - clear if not clicking an entity
        if (!clickedEntity) {
          selectedIdRef.current = null;
          window.dispatchEvent(new CustomEvent("entity-cleared"));
        }

        // DEFAULT FALLBACK (existing logic)
        // Selection clearing already handled above
        highlightSelectedEntity();
      });
    }

    // Update selection highlights after containers are created/updated
    highlightSelectedEntity();
  }, [memory.entities, highlightSelectedEntity]);

  // Detect world events and trigger glow pulse
  useEffect(() => {
    const currentCount = memory.entities.length;
    if (currentCount !== prevEntityCountRef.current) {
      setWorldGlowPulse(Date.now());
      prevEntityCountRef.current = currentCount;
    }
  }, [memory.entities]);

  // Cursor pulse animation
  useEffect(() => {
    let anim: number;
    const loop = () => {
      setCursorPulse((t) => t + 0.1);
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, []);

  // Keyboard delete listener for selected entity
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const id = selectedIdRef.current;
        if (id) {
          deleteEntity(id);
          selectedIdRef.current = null;
          highlightSelectedEntity();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteEntity, highlightSelectedEntity]);

  // Listen for AI thinking event
  useEffect(() => {
    const onThinking = () => {
      // Always reset, never accumulate intensity
      thinkingStartRef.current = Date.now();
      setAiThinkingPulse(Date.now());
    };
    window.addEventListener("ai-thinking", onThinking as EventListener);
    return () => {
      window.removeEventListener("ai-thinking", onThinking as EventListener);
    };
  }, []);

  // Update entity highlights when hover/click state changes
  useEffect(() => {
    const app = appRef.current;
    // PATCH: Race condition fix
    if (!app || !app.stage) return;
    const graphicsMap = graphicsMapRef.current;
    graphicsMap.forEach((gfx, entityId) => {
      if (!(gfx instanceof PIXI.Container)) return;
      // Remove existing highlight graphics
      const existingHover = gfx.children.find(child => child instanceof PIXI.Graphics && (child as any).__isHoverHighlight);
      const existingClick = gfx.children.find(child => child instanceof PIXI.Graphics && (child as any).__isClickHighlight);
      if (existingHover) gfx.removeChild(existingHover);
      if (existingClick) gfx.removeChild(existingClick);

      // Add hover highlight
      if (hoveredId === entityId) {
        const hoverHighlight = new PIXI.Graphics();
        (hoverHighlight as any).__isHoverHighlight = true;
        hoverHighlight.lineStyle(2, 0x00ffff, 0.85);
        hoverHighlight.drawCircle(0, 0, 21); // radius 18 + 3
        hoverHighlight.blendMode = PIXI.BLEND_MODES.SCREEN;
        gfx.addChild(hoverHighlight);
      }

      // Add click pulse highlight
      if (clickedId === entityId) {
        const clickHighlight = new PIXI.Graphics();
        (clickHighlight as any).__isClickHighlight = true;
        clickHighlight.blendMode = PIXI.BLEND_MODES.SCREEN;
        gfx.addChild(clickHighlight);
        // Animate the pulse
        const animatePulse = () => {
          if (clickedId !== entityId || !gfx.children.includes(clickHighlight)) {
            return;
          }
          const currentPulse = 1 + Math.sin(Date.now() / 60) * 0.22;
          clickHighlight.clear();
          clickHighlight.lineStyle(3, 0x00ffff, 0.95);
          clickHighlight.drawCircle(0, 0, 23 * currentPulse);
          requestAnimationFrame(animatePulse);
        };
        animatePulse();
      }
    });
  }, [hoveredId, clickedId]);

  return (
    <div ref={containerRef} className="pixi-container" />
  );
}
