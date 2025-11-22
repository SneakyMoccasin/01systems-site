'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useWorld } from '../core/worldState';
import { ENTITY_COLORS } from '../config/entityColors';
import { PULSE_SETTINGS } from '../config/pulseConfig';

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
  }
  interface Container {
    entityId?: string;
    dragging?: boolean;
    dragOffset?: { x: number; y: number };
    pulseDir?: number;
    baseScale?: number;
    orbitInner?: PIXI.Graphics;
    orbitOuter?: PIXI.Graphics;
  }
  interface DisplayObject {
    alphaDir?: number;
  }
}

export default function PixiStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const graphicsMapRef = useRef<Map<string, PIXI.Container>>(new Map());
  const tickerRef = useRef<PIXI.Ticker | null>(null);

  // Background sprite reference
  const bgSpriteRef = useRef<PIXI.Sprite | null>(null);
  const vignetteRef = useRef<PIXI.Graphics | null>(null);
  const twinkleContainerRef = useRef<PIXI.Container | null>(null);

  const world = useWorld();
  const { memory } = world;

  // Blink all entities function
  const blinkAll = useCallback(() => {
    const map = graphicsMapRef.current;
    map.forEach((gfx) => {
      // Save original alpha
      const original = gfx.alpha;
      gfx.alpha = 0.2; // fade out quickly
      setTimeout(() => {
        gfx.alpha = original; // restore after 0.15s
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

    const app = new PIXI.Application({
      resizeTo: window,
      background: 'black',
    });

    // ⭐ RÄTT RAD – PIXI v8 använder .canvas, INTE .view
    containerRef.current.appendChild(app.view as HTMLCanvasElement);

    appRef.current = app;

    // === STATIC NEBULA BACKGROUND ===
    const bgTexture = PIXI.Texture.from("/backgrounds/nebula.png");
    const bgSprite = new PIXI.Sprite(bgTexture);
    bgSpriteRef.current = bgSprite;

    // Cover entire screen
    bgSprite.width = window.innerWidth;
    bgSprite.height = window.innerHeight;
    bgSprite.anchor.set(0.5);
    bgSprite.x = window.innerWidth / 2;
    bgSprite.y = window.innerHeight / 2;

    // Darken / blend for atmosphere
    bgSprite.alpha = 0.35;

    // Add as FIRST layer
    app.stage.addChildAt(bgSprite, 0);

    // === VIGNETTE (MEDIUM CINEMATIC) ===
    const vignette = new PIXI.Graphics();
    vignetteRef.current = vignette;

    // Soft cinematic edges
    vignette.blendMode = PIXI.BLEND_MODES.MULTIPLY;

    // Draw function
    function drawVignette() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      vignette.clear();

      // Ellipse radii based on screen
      const radiusX = w * 0.55;   // wider horizontal fade
      const radiusY = h * 0.65;   // deeper vertical fade

      vignette.beginFill(0x000000, 0.35);
      vignette.drawEllipse(w / 2, h / 2, radiusX, radiusY);
      vignette.endFill();
    }

    drawVignette();
    app.stage.addChildAt(vignette, 1);

    // === STAR TWINKLE LAYER ===
    const twinkleContainer = new PIXI.Container();
    twinkleContainerRef.current = twinkleContainer;
    app.stage.addChildAt(twinkleContainer, 2); // under entities, över vignette

    // Create 60 tiny "stars"
    for (let i = 0; i < 60; i++) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff, 0.25); // faint
      star.drawCircle(0, 0, Math.random() * 1.2 + 0.8);
      star.endFill();

      star.x = Math.random() * window.innerWidth;
      star.y = Math.random() * window.innerHeight;

      // store blink timer
      star.alphaDir = Math.random() > 0.5 ? 1 : -1;
      star.alpha = Math.random() * 0.4 + 0.1; // between 0.1–0.5

      twinkleContainer.addChild(star);
    }

    // Resize handler
    function handleVignetteResize() {
      drawVignette();
    }
    window.addEventListener("resize", handleVignetteResize);

    // Resize background on window resize
    const handleResize = () => {
      if (bgSpriteRef.current) {
        bgSpriteRef.current.width = window.innerWidth;
        bgSpriteRef.current.height = window.innerHeight;
        bgSpriteRef.current.x = window.innerWidth / 2;
        bgSpriteRef.current.y = window.innerHeight / 2;
      }
    };
    window.addEventListener("resize", handleResize);

    // Create ticker for pulse animation
    const ticker = PIXI.Ticker.shared;
    ticker.autoStart = true;
    tickerRef.current = ticker;

    function clampToBounds(x: number, y: number) {
      const margin = 20; // how close to edges entities are allowed
      const maxX = window.innerWidth - margin;
      const maxY = window.innerHeight - margin;

      let clampedX = Math.max(margin, Math.min(x, maxX));
      let clampedY = Math.max(margin, Math.min(y, maxY));

      return { x: clampedX, y: clampedY };
    }

    const pulseUpdate = () => {
      // ==== TWINKLE ANIMATION (SLOW + SOFT) ====
      if (twinkleContainerRef.current) {
        for (const star of twinkleContainerRef.current.children) {
          if (star.alphaDir === undefined) star.alphaDir = 1;

          // MUCH slower fade (0.003 instead of 0.01)
          star.alpha += star.alphaDir * 0.003;

          // Softer range (0.05 → 0.35 instead of 0.55)
          if (star.alpha > 0.35) star.alphaDir = -1;
          if (star.alpha < 0.05) star.alphaDir = 1;
        }
      }

      const graphicsMap = graphicsMapRef.current;
      const app = appRef.current;
      if (!app) return;

      for (const [entityId, gfx] of graphicsMap.entries()) {
        const entity = world.memory.entities.find(e => e.id === entityId);
        if (!entity) continue;

        if (!(gfx instanceof PIXI.Container)) continue;

        const settings = PULSE_SETTINGS[entity.type];
        const entityContainer = gfx;
        if (!entityContainer.pulseDir) entityContainer.pulseDir = 1;

        const baseScale = entityContainer.baseScale ?? 1;
        let currentScale = entityContainer.scale.x / baseScale;

        currentScale += entityContainer.pulseDir * settings.speed;

        if (currentScale >= settings.maxScale) {
          currentScale = settings.maxScale;
          entityContainer.pulseDir = -1;
        }
        if (currentScale <= settings.minScale) {
          currentScale = settings.minScale;
          entityContainer.pulseDir = 1;
        }

        entityContainer.scale.set(currentScale * baseScale);

        // UPDATE AURA PULSE (only for unit and effect)
        if (entity.type === "unit" || entity.type === "effect") {
          const aura = entityContainer.children[0] as PIXI.Graphics;   // index 0: aura

          if (aura && aura instanceof PIXI.Graphics && aura.auraScale !== undefined) {
            // choose speed based on type
            let speed = 0.0008;
            if (entity.type === "effect") speed = 0.0015;

            aura.auraScale += aura.pulseDir! * speed;

            if (aura.auraScale >= 1.025) aura.pulseDir = -1;
            if (aura.auraScale <= 0.975) aura.pulseDir = 1;

            // redraw aura
            aura.clear();
            aura.beginFill(aura.auraColor!, aura.auraAlpha!);
            aura.drawCircle(0, 0, 30 * aura.auraScale);
            aura.endFill();
          }
        }

        // --- ORBITAL RING ANIMATION ---
        if (entityContainer.orbitInner) {
          entityContainer.orbitInner.rotation += 0.002; // clockwise
        }
        if (entityContainer.orbitOuter) {
          entityContainer.orbitOuter.rotation -= 0.003; // counterclockwise
        }

        // ---- WANDER AI (only for units) ----
        if (entity.type === "unit") {
          // If it's time to pick a new AI target
          if (entity.ai && Date.now() > entity.ai.nextUpdate) {
            entity.ai.targetX = Math.random() * window.innerWidth;
            entity.ai.targetY = Math.random() * window.innerHeight;
            entity.ai.nextUpdate = Date.now() + 1000 + Math.random() * 2000;
          }

          // Smooth movement: LERP toward target
          if (entity.ai && entity.transform) {
            const currentX = entity.transform.x ?? 0;
            const currentY = entity.transform.y ?? 0;
            const dx = entity.ai.targetX - currentX;
            const dy = entity.ai.targetY - currentY;

            const nextX = currentX + dx * 0.02;
            const nextY = currentY + dy * 0.02;

            // clamp movement inside screen bounds
            const bounded = clampToBounds(nextX, nextY);

            entity.transform.x = bounded.x;
            entity.transform.y = bounded.y;
          }
        }
        // ---- END WANDER ----

        // ---- SYNC PIXI POSITION WITH ENTITY TRANSFORM ----
        if (entity.transform) {
          const newX = entity.transform.x ?? entityContainer.x;
          const newY = entity.transform.y ?? entityContainer.y;

          // Apply only if changed (small optimization)
          // Skip if dragging (user is manually moving)
          if (!entityContainer.dragging) {
            if (entityContainer.x !== newX) entityContainer.x = newX;
            if (entityContainer.y !== newY) entityContainer.y = newY;
          }
        }
      }
    };

    ticker.add(pulseUpdate);

    return () => {
      ticker.remove(pulseUpdate);
      graphicsMapRef.current.forEach(gfx => gfx.destroy({ children: true }));
      graphicsMapRef.current.clear();
      if (bgSpriteRef.current) {
        bgSpriteRef.current.destroy(true);
        bgSpriteRef.current = null;
      }
      if (vignetteRef.current) {
        vignetteRef.current.destroy(true);
        vignetteRef.current = null;
      }
      if (twinkleContainerRef.current) {
        twinkleContainerRef.current.destroy({ children: true });
        twinkleContainerRef.current = null;
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleVignetteResize);
      app.destroy(true);
      appRef.current = null;
      tickerRef.current = null;
    };
  }, [world]);

  // RENDER ENTITIES
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const graphicsMap = graphicsMapRef.current;
    const currentIds = new Set(memory.entities.map(e => e.id));
    const existingIds = new Set(graphicsMap.keys());

    // Remove deleted entities
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const gfx = graphicsMap.get(id);
        if (gfx && gfx instanceof PIXI.Container) {
          app.stage.removeChild(gfx);
          gfx.destroy({ children: true });
          graphicsMap.delete(id);
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

        // --- NEW NEON AURA COLORS ---
        let auraColor, auraAlpha;
        if (ent.type === "unit") {
          auraColor = 0x00ffff;   // Pure Neon Cyan
          auraAlpha = 0.25;
        } else if (ent.type === "prop") {
          auraColor = 0xff9d00;   // Bright Neon Orange
          auraAlpha = 0.22;
        } else if (ent.type === "marker") {
          auraColor = 0xc400ff;   // Hyper Violet
          auraAlpha = 0.24;
        } else { // effect
          auraColor = 0xff003c;   // Laser Red
          auraAlpha = 0.28;
        }

        // --- AURA LAYER ---
        const aura = new PIXI.Graphics();
        aura.pulseDir = 1;
        aura.auraScale = 1.0;
        aura.entityId = ent.id;
        entityContainer.addChild(aura);

        // --- ORBITAL RINGS ---
        // Helper to convert degrees to radians
        const degToRad = (deg: number) => (deg * Math.PI) / 180;

        // --- INNER ORBITAL ---
        const orbitInner = new PIXI.Graphics();
        orbitInner.clear();
        // Glow
        orbitInner.beginFill(0xffffff, 0.15);         // soft glow
        orbitInner.drawCircle(0, 0, 29);              // glow ring
        orbitInner.endFill();
        // Shadow arc (offset downward by 1.5px)
        orbitInner.lineStyle(3, 0x000000, 0.25);
        orbitInner.arc(0, 1.5, 26, degToRad(-20), degToRad(100));
        // Highlight arc
        orbitInner.lineStyle(1, 0xffffff, 0.55);
        orbitInner.arc(0, 0, 26, degToRad(150), degToRad(270));
        // Main ring
        orbitInner.lineStyle(2.4, 0xffffff, 0.75);    // white neon
        orbitInner.drawCircle(0, 0, 26);              // main ring

        // --- OUTER ORBITAL ---
        const orbitOuter = new PIXI.Graphics();
        orbitOuter.clear();
        // Glow
        orbitOuter.beginFill(0xffffff, 0.12);         // soft glow
        orbitOuter.drawCircle(0, 0, 37);              // glow
        orbitOuter.endFill();
        // Shadow arc (offset downward by 1.5px)
        orbitOuter.lineStyle(3, 0x000000, 0.25);
        orbitOuter.arc(0, 1.5, 34, degToRad(-20), degToRad(100));
        // Highlight arc
        orbitOuter.lineStyle(1, 0xffffff, 0.55);
        orbitOuter.arc(0, 0, 34, degToRad(150), degToRad(270));
        // Main ring
        orbitOuter.lineStyle(2.0, 0xffffff, 0.65);    // white neon
        orbitOuter.drawCircle(0, 0, 34);              // main ring

        // store refs for animation
        entityContainer.orbitInner = orbitInner;
        entityContainer.orbitOuter = orbitOuter;

        // add AFTER aura but BEFORE core
        entityContainer.addChild(orbitInner);
        entityContainer.addChild(orbitOuter);

        // --- CORE LAYER ---
        const core = new PIXI.Graphics();
        core.entityId = ent.id;
        entityContainer.addChild(core);

        gfx = entityContainer;

        // DRAW CORE (STATIC)
        const color = ENTITY_COLORS[ent.type];

        core.clear();
        core.beginFill(color, 0.3);
        core.drawCircle(0, 0, 24);
        core.endFill();

        core.beginFill(color, 1.0);
        core.drawCircle(0, 0, 18);
        core.endFill();

        // DRAW AURA (STATIC INITIAL)
        aura.clear();
        aura.beginFill(auraColor, auraAlpha);
        aura.drawCircle(0, 0, 30);
        aura.endFill();

        aura.auraColor = auraColor;
        aura.auraAlpha = auraAlpha;

        // POSITIONING
        entityContainer.x = ent.transform?.x ?? 0;
        entityContainer.y = ent.transform?.y ?? 0;

        // Enable drag & drop
        const entityContainerRef = entityContainer; // Store reference for event handlers
        entityContainerRef.eventMode = "static";
        entityContainerRef.cursor = "pointer";

        entityContainerRef.on("pointerdown", (e) => {
          entityContainerRef.dragging = true;
          entityContainerRef.dragOffset = e.data.getLocalPosition(entityContainerRef.parent);
          entityContainerRef.dragOffset.x -= entityContainerRef.x;
          entityContainerRef.dragOffset.y -= entityContainerRef.y;
        });

        entityContainerRef.on("pointerup", () => {
          entityContainerRef.dragging = false;
        });

        entityContainerRef.on("pointerupoutside", () => {
          entityContainerRef.dragging = false;
        });

        entityContainerRef.on("pointermove", (e) => {
          if (!entityContainerRef.dragging) return;

          const pos = e.data.getLocalPosition(entityContainerRef.parent);
          entityContainerRef.x = pos.x - entityContainerRef.dragOffset!.x;
          entityContainerRef.y = pos.y - entityContainerRef.dragOffset!.y;

          // Update worldState live
          const entity = world.memory.entities.find(ent => ent.id === entityContainerRef.entityId);
          if (entity) {
            entity.transform = entity.transform || {};
            entity.transform.x = entityContainerRef.x;
            entity.transform.y = entityContainerRef.y;
          }
          world.forceRender();
        });

        app.stage.addChild(gfx);
        graphicsMap.set(ent.id, gfx);
      } else {
        // Update position if changed
        if (gfx instanceof PIXI.Container) {
          gfx.x = ent.transform?.x ?? 0;
          gfx.y = ent.transform?.y ?? 0;

          // Update base scale if changed
          const newBaseScale = ent.transform?.scale ?? 1;
          if (gfx.baseScale !== newBaseScale) {
            const currentPulseScale = gfx.scale.x / (gfx.baseScale ?? 1);
            gfx.baseScale = newBaseScale;
            gfx.scale.set(currentPulseScale * newBaseScale);
          }
        }
      }
    }
  }, [memory.entities]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    />
  );
}
