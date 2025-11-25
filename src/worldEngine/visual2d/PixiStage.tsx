'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useWorld } from '../core/worldState';
import { ENTITY_COLORS } from '../config/entityColors';
import { PULSE_SETTINGS } from '../config/pulseConfig';

// --- UI SOUND EFFECTS ---
const hoverSound = typeof Audio !== "undefined" ? new Audio("/sfx/hover_tick.wav") : null;
const clickSound = typeof Audio !== "undefined" ? new Audio("/sfx/ui_click_tick.wav") : null;

if (hoverSound) hoverSound.volume = 0.14;
if (clickSound) clickSound.volume = 0.18;

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
    pulseSettings?: {
      speed: number;
      maxScale: number;
      minScale: number;
    };
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

  const vignetteRef = useRef<PIXI.Graphics | null>(null);
  const twinkleContainerRef = useRef<PIXI.Container | null>(null);
  const introPlayedRef = useRef(false);
  const startScreenRef = useRef<PIXI.Container | null>(null);
  const audioUnlockedRef = useRef(false);
  const hudContainerRef = useRef<PIXI.Container | null>(null);
  const promptDockContainerRef = useRef<PIXI.Container | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const world = useWorld();
  const { memory } = world;

  // --- UNIFIED DELETE ENTITY FUNCTION ---
  const deleteEntity = useCallback((id: string) => {
    const app = appRef.current;
    const graphicsMap = graphicsMapRef.current;

    console.log("DELETE START — id:", id);

    // Check if entity exists in graphicsMap
    if (!graphicsMap.has(id)) {
      console.log("DELETE SKIP — no graphics found for id:", id);
      // Still remove from memory if it exists there
      // Use the base deleteEntity to avoid recursion
      if (world.baseDeleteEntity) {
        world.baseDeleteEntity(id);
      }
      return;
    }

    // Get the container
    const container = graphicsMap.get(id);
    if (!container || !(container instanceof PIXI.Container)) {
      console.log("DELETE SKIP — invalid container for id:", id);
      graphicsMap.delete(id);
      // Use the base deleteEntity to avoid recursion
      if (world.baseDeleteEntity) {
        world.baseDeleteEntity(id);
      }
      return;
    }

    console.log("DELETE STEP 1 — found container for id:", id);

    // Remove event listeners
    container.off("pointerdown");
    container.off("pointerup");
    container.off("pointerupoutside");
    container.off("pointermove");
    container.off("pointerover");
    container.off("pointerout");
    console.log("DELETE STEP 2 — removed event listeners for id:", id);

    // Remove container from stage
    if (app && app.stage && container.parent === app.stage) {
      app.stage.removeChild(container);
      console.log("DELETE STEP 3 — removed from stage for id:", id);
    }

    // Destroy the container and all children
    container.destroy({ children: true });
    console.log("DELETE STEP 4 — destroyed container for id:", id);

    // Remove from graphicsMap
    graphicsMap.delete(id);
    console.log("DELETE STEP 5 — removed from graphicsMap for id:", id);

    // Clear selection if this was the selected entity
    if (selectedIdRef.current === id) {
      selectedIdRef.current = null;
    }

    // Remove from memory.entities (use base deleteEntity to avoid recursion)
    if (world.baseDeleteEntity) {
      world.baseDeleteEntity(id);
      console.log("DELETE STEP 6 — removed from memory.entities for id:", id);
    }

    // Force rerender
    world.forceRender();
    console.log("DELETE STEP 7 — triggered forceRender for id:", id);

    // Verify cleanup (check after a brief delay to allow state updates)
    setTimeout(() => {
      const stillInStage = app && app.stage && app.stage.children.includes(container);
      const stillInMap = graphicsMap.has(id);
      const stillInMemory = world.memory.entities.some((e: any) => e.id === id);
      console.log("DELETE VERIFY — stage:", !stillInStage, "map:", !stillInMap, "memory:", !stillInMemory);
    }, 0);

    console.log("DELETE OK — id:", id);
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
    const graphicsMap = graphicsMapRef.current;
    const app = appRef.current;

    if (!app) return;
    if (graphicsMap.size === 0) return;

    // ==== WANDER AI (units only) ====
    for (const [entityId, gfx] of graphicsMap.entries()) {
      const entity = world.memory.entities.find(e => e.id === entityId);
      if (!entity) continue;
      if (!(gfx instanceof PIXI.Container)) continue;

      const entityContainer = gfx;

      // Only units move - all other entities are locked still
      if (entity.type === "unit" || (entity as any).category === "unit") {
        // Skip wander AI and sync for entities being dragged
        if (!entityContainer.dragging) {
          // ==== WANDER FREEZE — prevent movement for 1200ms after spawn ====
          if (!(entity as any).__spawnTime) {
            (entity as any).__spawnTime = Date.now();
          }

          const age = Date.now() - (entity as any).__spawnTime;
          if (age < 1200) {
            // Still sync position even during freeze
            if (entity.transform) {
              if (entity.transform.x !== null && entity.transform.x !== undefined) {
                entityContainer.x = Math.round(entity.transform.x);
              }
              if (entity.transform.y !== null && entity.transform.y !== undefined) {
                entityContainer.y = Math.round(entity.transform.y);
              }
            }
            continue;
          }

          // ==== NORMAL WANDER LOGIC ====
          if (entity.ai && Date.now() > entity.ai.nextUpdate) {
            entity.ai.targetX = Math.random() * window.innerWidth;
            entity.ai.targetY = Math.random() * window.innerHeight;
            entity.ai.nextUpdate = Date.now() + 1000 + Math.random() * 2000;
          }

          // Wander AI movement
          if (entity.ai && entity.transform && entity.ai.targetX != null && entity.ai.targetY != null && entity.transform.x != null && entity.transform.y != null) {
            const currentX = entity.transform.x;
            const currentY = entity.transform.y;
            const dx = entity.ai.targetX - currentX;
            const dy = entity.ai.targetY - currentY;

            const nextX = currentX + dx * 0.02;
            const nextY = currentY + dy * 0.02;

            const margin = 20;
            const maxX = window.innerWidth - margin;
            const maxY = window.innerHeight - margin;

            const boundedX = Math.max(margin, Math.min(nextX, maxX));
            const boundedY = Math.max(margin, Math.min(nextY, maxY));

            entity.transform.x = boundedX;
            entity.transform.y = boundedY;
          }

          // Sync PIXI position for units (rounded for crisp pixels)
          // ONLY sync IF we are NOT dragging this entity
          if (entity.transform) {
            if (entity.transform.x !== null && entity.transform.x !== undefined) {
              entityContainer.x = Math.round(entity.transform.x);
            }
            if (entity.transform.y !== null && entity.transform.y !== undefined) {
              entityContainer.y = Math.round(entity.transform.y);
            }
          }
        }
      } else {
        // Freeze everything else - no movement, no drift
        entityContainer.x = Math.round(entityContainer.x);
        entityContainer.y = Math.round(entityContainer.y);
      }
    }
  }, [world.memory.entities]);

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

    // Improve rendering crispness
    PIXI.settings.RESOLUTION = window.devicePixelRatio;
    PIXI.settings.ROUND_PIXELS = true;

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x02040a, // Deep tech space color
      backgroundAlpha: 1,
      antialias: true,
    });

    // ⭐ RÄTT RAD – PIXI v8 använder .canvas, INTE .view
    containerRef.current.appendChild(app.view as HTMLCanvasElement);

    appRef.current = app;

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
    app.stage.addChildAt(vignette, 0);

    // === STAR TWINKLE LAYER ===
    const twinkleContainer = new PIXI.Container();
    twinkleContainerRef.current = twinkleContainer;
    app.stage.addChildAt(twinkleContainer, 1); // under entities, över vignette

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

    // --- CINEMATIC START SCREEN ---
    const startScreen = new PIXI.Container();
    startScreenRef.current = startScreen;
    startScreen.alpha = 0;

    // Black overlay
    const black = new PIXI.Graphics();
    black.beginFill(0x000000, 1);
    black.drawRect(0, 0, window.innerWidth, window.innerHeight);
    black.endFill();
    startScreen.addChild(black);

    // Title styling
    const titleStyle = new PIXI.TextStyle({
      fill: "#66faff",
      fontSize: 64,
      fontWeight: "800",
      fontFamily: "Arial",
      dropShadow: true,
      dropShadowColor: "#00d0ff",
      dropShadowBlur: 12,
    });

    // Tagline styling
    const taglineStyle = new PIXI.TextStyle({
      fill: "#e6e6e6",
      fontSize: 30,
      fontWeight: "400",
      fontFamily: "Arial",
      letterSpacing: 1.4,
    });

    // Click to start styling
    const clickStyle = new PIXI.TextStyle({
      fill: "#ffffff",
      fontSize: 32,
      fontWeight: "500",
      fontFamily: "Arial",
    });

    // Title
    const title = new PIXI.Text("Pulse Engine // X", titleStyle);
    title.anchor.set(0.5);
    title.x = window.innerWidth / 2;
    title.y = window.innerHeight / 2 - 90;
    startScreen.addChild(title);

    // Tagline
    const tagline = new PIXI.Text("Everything starts with a Pulse.", taglineStyle);
    tagline.anchor.set(0.5);
    tagline.x = window.innerWidth / 2;
    tagline.y = window.innerHeight / 2 - 15;
    startScreen.addChild(tagline);

    // --- ANIMATED PULSE LINE ---
    const line = new PIXI.Graphics();
    line.__isPulseLine = true;
    startScreen.addChild(line);

    let pulseTime = 0;
    app.ticker.add(() => {
      if (!startScreenRef.current) return;  // start screen removed
      const line = startScreenRef.current.children.find(c => c.__isPulseLine === true);
      if (!line) return; // line removed or not created yet

      pulseTime += 0.04;
      (line as PIXI.Graphics).clear();

      const glowStrength = 0.55 + Math.sin(pulseTime * 1.2) * 0.25;
      const lineWidth = 3 + Math.sin(pulseTime * 2.1) * 1.3;

      const colorShift = (Math.sin(pulseTime * 0.9) + 1) / 2;
      const color = PIXI.utils.rgb2hex([
        0.0,
        0.82 * (1 - colorShift) + 0.5 * colorShift,
        1.0 * (1 - colorShift) + 0.9 * colorShift,
      ]);

      (line as PIXI.Graphics).lineStyle(lineWidth, color, 0.9);
      const startX = window.innerWidth / 2 - 140;
      const endX = window.innerWidth / 2 + 140;
      const y = window.innerHeight / 2 + 22;
      const waveOffset = Math.sin(pulseTime * 3) * 4;

      (line as PIXI.Graphics).moveTo(startX, y + waveOffset);
      (line as PIXI.Graphics).lineTo(endX, y - waveOffset * 0.7);

      const glowFilter = new PIXI.BlurFilter();
      glowFilter.blur = 4 + Math.sin(pulseTime * 1.5) * 1.5;
      (line as PIXI.Graphics).filters = [glowFilter];
    });

    // Click to Start
    const clickText = new PIXI.Text("Click to Start", clickStyle);
    clickText.anchor.set(0.5);
    clickText.x = window.innerWidth / 2;
    clickText.y = window.innerHeight / 2 + 90;
    startScreen.addChild(clickText);

    // Pulse animation for click-text
    app.ticker.add(() => {
      clickText.alpha = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
    });

    app.stage.addChild(startScreen);

    startScreen.eventMode = "static";
    startScreen.cursor = "pointer";

    startScreen.on("pointerdown", () => {
      if (!audioUnlockedRef.current) {
        const temp = new Audio();
        temp.muted = true;
        temp.play().then(() => {
          temp.pause();
          temp.muted = false;
          audioUnlockedRef.current = true;
        }).catch(() => {});
      }

      const fadeOutStart = performance.now();
      const fadeOutDuration = 700;
      function fadeOutStartScreen() {
        const t = performance.now() - fadeOutStart;
        const p = Math.min(1, t / fadeOutDuration);
        startScreen.alpha = 1 - p;
        if (p < 1) requestAnimationFrame(fadeOutStartScreen);
        else {
          app.stage.removeChild(startScreen);
          startScreen.destroy(true);
          runIntroSequence();
        }
      }
      requestAnimationFrame(fadeOutStartScreen);
    });

    const fadeInStart = performance.now();
    const fadeInDuration = 800;
    function fadeInStartScreen() {
      const t = performance.now() - fadeInStart;
      const p = Math.min(1, t / fadeInDuration);
      startScreen.alpha = p;
      if (p < 1) requestAnimationFrame(fadeInStartScreen);
    }
    requestAnimationFrame(fadeInStartScreen);

    // === DUAL INTRO SEQUENCE ===
    const playIntro = async (introTexture: PIXI.Texture, withSound: boolean): Promise<void> => {
      return new Promise(async (resolve) => {
        const app = appRef.current;
        if (!app || !app.stage) {
          resolve();
          return;
        }
        
        const introSprite = new PIXI.Sprite(introTexture);
        
        // Center on stage
        introSprite.anchor.set(0.5);
        introSprite.x = window.innerWidth / 2;
        introSprite.y = window.innerHeight / 2;
        const baseScale = 0.8;
        introSprite.scale.set(baseScale);
        introSprite.alpha = 0;
        
        // Add to stage at highest z-index (above everything, including overlay)
        app.stage.addChildAt(introSprite, app.stage.children.length - 1);
        
        // Pulse animation setup
        let pulseTime = 0;
        const pulseSpeed = 0.003; // animation speed
        const pulseAmplitude = 0.02; // ±0.02 scale oscillation
        
        const updatePulse = () => {
          pulseTime += pulseSpeed;
          const pulseOffset = Math.sin(pulseTime) * pulseAmplitude;
          introSprite.scale.set(baseScale + pulseOffset);
        };
        
        // Create audio if enabled (before fade-in)
        let introSound: HTMLAudioElement | null = null;
        if (withSound) {
          introSound = new Audio("/audio/intro/PE_intro_signaturePulse_v1.wav");
          introSound.volume = 1.0;
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
          updatePulse();
          
          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            // Hold visible for 2600ms (with pulse animation, matches audio length)
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
                updatePulse();

                if (p < 1) {
                  requestAnimationFrame(step);
                } else {
                  if (introSprite.parent && app) {
                    app.stage.removeChild(introSprite);
                  }
                  introSprite.destroy(true);
                  resolve(); // continue sequence
                }
              };

              requestAnimationFrame(step);
            }
            
            const hold = () => {
              updatePulse();
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
      const app = appRef.current;
      if (!app || !app.stage) return;

      // === INTRO OVERLAY SETUP ===
      const overlay = new PIXI.Graphics();
      overlay.beginFill(0x000000, 1);
      overlay.drawRect(0, 0, window.innerWidth, window.innerHeight);
      overlay.endFill();
      overlay.alpha = 0;
      app.stage.addChildAt(overlay, 0);

      // === OVERLAY FADE HELPERS ===
      function fadeInOverlay(duration = 500): Promise<void> {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(ts: number) {
            const t = Math.min(1, (ts - start) / duration);
            overlay.alpha = t;
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
      }

      function fadeOutOverlay(duration = 600): Promise<void> {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(ts: number) {
            const t = Math.min(1, (ts - start) / duration);
            overlay.alpha = 1 - t;
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
      }

      // === LOAD INTRO TEXTURES ===
      const arctaviaTexture = await PIXI.Assets.load("/branding/arctavia_labs_intro.png");
      const pulseTexture = await PIXI.Assets.load("/branding/pulse_engine_x_intro.png");

      // === RUN INTRO SEQUENCE ===
      // --- Arctavia intro (silent) ---
      await fadeInOverlay(700);
      await playIntro(arctaviaTexture, false);
      await fadeOutOverlay(600);

      // --- Pulse Engine // X intro (WITH SOUND) ---
      await fadeInOverlay(700);
      await playIntro(pulseTexture, true);
      await fadeOutOverlay(600);
      // Intros complete - world spawning can now proceed

      // --- WATERMARK (Pulse Engine // X) ---
      {
        const app = appRef.current;
        if (app && app.stage) {
          // Glow plate
          const glow = new PIXI.Graphics();
          glow.beginFill(0x000000, 0.12);
          glow.drawEllipse(0, 0, 200, 70);
          glow.endFill();
          glow.filters = [new PIXI.BlurFilter(6)];

          // Position glow (anchor as center)
          glow.x = window.innerWidth - 200;
          glow.y = window.innerHeight - 70;

          // Watermark
          const watermarkTexture = PIXI.Texture.from("/branding/pulse_engine_x_watermark_clean.svg");
          const watermark = new PIXI.Sprite(watermarkTexture);
          watermark.anchor.set(1, 1);
          watermark.scale.set(0.22);
          watermark.alpha = 0.15;
          watermark.x = window.innerWidth - 38;
          watermark.y = window.innerHeight - 70;

          // Add glow then watermark
          app.stage.addChild(glow);
          app.stage.addChild(watermark);
        }
      }

      // --- SHOW HUD + PROMPT DOCK AFTER INTRO ---
      // tell React to show the UI now that intro is finished
      if (world.setUiVisible) world.setUiVisible(true);
    };

    // Resize handler
    function handleVignetteResize() {
      drawVignette();
    }
    window.addEventListener("resize", handleVignetteResize);

    // Create ticker for pulse animation
    const ticker = PIXI.Ticker.shared;
    ticker.autoStart = true;
    tickerRef.current = ticker;

    return () => {
      const ticker = tickerRef.current;
      if (ticker) {
        ticker.remove(pulseUpdate);
      }
      graphicsMapRef.current.forEach(gfx => gfx.destroy({ children: true }));
      graphicsMapRef.current.clear();
      if (vignetteRef.current) {
        vignetteRef.current.destroy(true);
        vignetteRef.current = null;
      }
      if (twinkleContainerRef.current) {
        twinkleContainerRef.current.destroy({ children: true });
        twinkleContainerRef.current = null;
      }
      window.removeEventListener("resize", handleVignetteResize);
      app.destroy(true);
      appRef.current = null;
      tickerRef.current = null;
    };
  }, []);

  // RENDER ENTITIES
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const graphicsMap = graphicsMapRef.current;
    const currentIds = new Set(memory.entities.map(e => e.id));
    const existingIds = new Set(graphicsMap.keys());

    // Remove deleted entities (use unified cleanup - memory already updated)
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const container = graphicsMap.get(id);
        if (container && container instanceof PIXI.Container) {
          console.log("DELETE START — id:", id);
          
          // Remove event listeners
          container.off("pointerdown");
          container.off("pointerup");
          container.off("pointerupoutside");
          container.off("pointermove");
          container.off("pointerover");
          container.off("pointerout");
          console.log("DELETE STEP 1 — removed event listeners for id:", id);

          // Remove container from stage
          if (container.parent === app.stage) {
            app.stage.removeChild(container);
            console.log("DELETE STEP 2 — removed from stage for id:", id);
          }

          // Destroy the container and all children
          container.destroy({ children: true });
          console.log("DELETE STEP 3 — destroyed container for id:", id);

          // Remove from graphicsMap
          graphicsMap.delete(id);
          console.log("DELETE STEP 4 — removed from graphicsMap for id:", id);

          // Verify cleanup
          const stillInStage = app.stage.children.includes(container);
          const stillInMap = graphicsMap.has(id);
          console.log("DELETE VERIFY — stage:", !stillInStage, "map:", !stillInMap);
          console.log("DELETE OK — id:", id);
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

        // --- ENTITY COLORS ---
        const entityColors = {
          unit:   0x00F6FF,   // cyan
          marker: 0xFF42FF,   // pink-magenta
          prop:   0x008BFF,   // azure-blue
          effect: 0xFFA200,   // laser-orange
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

        gfx = entityContainer;

        // --- CLEAN CIRCLE ---
        core.clear();
        core.beginFill(entityColor, 1.0);
        core.drawCircle(0, 0, 18);
        core.endFill();

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
          
          entityContainer.x = Math.round(ent.transform.x); // Round for crisp pixels
          entityContainer.y = Math.round(ent.transform.y); // Round for crisp pixels
        }

        // Enable drag & drop
        const entityContainerRef = entityContainer; // Store reference for event handlers
        entityContainerRef.eventMode = "static";
        entityContainerRef.cursor = "pointer";

        // Helper function to update entity transform without React re-renders
        const updateEntityTransform = (entityId: string, x: number, y: number) => {
          const entity = world.memory.entities.find(ent => ent.id === entityId);
          if (entity) {
            entity.transform = entity.transform || {};
            entity.transform.x = x;
            entity.transform.y = y;
          }
        };

        entityContainerRef.on("pointerdown", (e) => {
          e.stopPropagation();
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
          }
        });

        entityContainerRef.on("pointerup", () => {
          entityContainerRef.dragging = false;
        });

        entityContainerRef.on("pointerupoutside", () => {
          entityContainerRef.dragging = false;
        });

        entityContainerRef.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
          if (!entityContainerRef.dragging) return;
          
          e.stopPropagation();

          // Update PIXI position every frame
          entityContainerRef.x = Math.round(e.global.x - entityContainerRef.dragOffset!.x);
          entityContainerRef.y = Math.round(e.global.y - entityContainerRef.dragOffset!.y);

          // Throttle world_state sync to every ~90ms
          const now = performance.now();
          if (!entityContainerRef.lastSync || (now - entityContainerRef.lastSync) > 90) {
            const entity = world.memory.entities.find(ent => ent.id === entityContainerRef.entityId);
            if (entity) {
              entity.transform = entity.transform || {};
              entity.transform.x = entityContainerRef.x;
              entity.transform.y = entityContainerRef.y;
            }
            entityContainerRef.lastSync = now;
          }
        });

        app.stage.addChild(gfx);
        graphicsMap.set(ent.id, gfx);
        
        // Ensure wander AI starts immediately
        if (ent.ai) {
          ent.ai.nextUpdate = Date.now();
        }
      } else {
        // Update position if changed (round for crisp pixels)
        if (gfx instanceof PIXI.Container) {
          // Only units can have their positions updated from transform
          // Non-units are frozen in place
          if (ent.type === "unit" || (ent as any).category === "unit") {
            if (ent.transform?.x != null) {
              gfx.x = Math.round(ent.transform.x);
            }
            if (ent.transform?.y != null) {
              gfx.y = Math.round(ent.transform.y);
            }
          } else {
            // Freeze non-units - round current position to prevent any drift
            gfx.x = Math.round(gfx.x);
            gfx.y = Math.round(gfx.y);
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
      app.stage.eventMode = "static";
      app.stage.on("pointermove", (e) => {
        const mx = e.global.x;
        const my = e.global.y;

        let nearest: string | null = null;
        let minDist = 99999;

        // Check all entities
        memory.entities.forEach((entity) => {
          const x = entity.transform?.x ?? 0;
          const y = entity.transform?.y ?? 0;
          const dx = mx - x;
          const dy = my - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 28 && dist < minDist) {  // hover radius
            minDist = dist;
            nearest = entity.id;
          }
        });

        // Play hover sound only when hover actually changes
        if (nearest !== lastHoveredIdRef.current) {
          if (nearest && hoverSound) hoverSound.play().catch(() => {});
          lastHoveredIdRef.current = nearest;
        }

        // Hover should be handled internally by PIXI graphics, not React
        // setHoveredId(nearest); // COMMENTED OUT to prevent re-renders
      });
    }
    
    // Start ticker AFTER first entity render
    const ticker = tickerRef.current;
    if (ticker) {
      ticker.add(pulseUpdate);
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
    if (!app) return;

    const graphicsMap = graphicsMapRef.current;
    
    graphicsMap.forEach((gfx, entityId) => {
      if (!(gfx instanceof PIXI.Container)) return;

      // Remove existing highlight graphics
      const existingHover = gfx.children.find(child => 
        child instanceof PIXI.Graphics && (child as any).__isHoverHighlight
      );
      const existingClick = gfx.children.find(child => 
        child instanceof PIXI.Graphics && (child as any).__isClickHighlight
      );
      
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
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - 40;
        const y = e.clientY - rect.top - 40;
        if (cursorRippleRef.current) {
          cursorRippleRef.current.style.transform = `translate(${x}px, ${y}px)`;
        }
      }}
    >
      {/* --- WORLD EVENT GLOW OVERLAY --- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          mixBlendMode: "screen",
          background: `
            radial-gradient(
              circle at center,
              rgba(0, 255, 255, 0.14) 0%,
              rgba(0, 255, 255, 0.06) 35%,
              rgba(0, 255, 255, 0.02) 70%,
              rgba(0, 255, 255, 0.00) 100%
            )
          `,
          opacity:
            worldGlowPulse === 0
              ? 0
              : Math.max(
                  0,
                  0.22 -
                    (Date.now() - worldGlowPulse) / 800 // fade-out over ~800ms
                ),
          transition: "opacity 480ms ease-out",
          zIndex: 3,
        }}
      />
      {/* --- AI THINKING GLOW --- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 3,
          mixBlendMode: "screen",
          transition: "opacity 200ms linear",
          opacity: (() => {
            if (!aiThinkingPulse) return 0;
            const age = Date.now() - aiThinkingPulse;
            if (age > 1500) return 0;            // FULL RESET
            return 0.35 * (1 - age / 1500);      // smooth fade-out
          })(),
          display: (() => {
            if (!aiThinkingPulse) return "none";
            const age = Date.now() - aiThinkingPulse;
            return age < 1500 ? "block" : "none";
          })(),
          background: `
            radial-gradient(circle at center,
              rgba(0,255,255,0.20) 0%,
              rgba(0,255,255,0.08) 45%,
              rgba(0,255,255,0.00) 75%
            )
          `,
          filter: "blur(6px)"
        }}
      />
      {/* --- AI CURSOR RIPPLE --- */}
      <div
        style={{
          position: "absolute",
          pointerEvents: "none",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        }}
      >
        <div
          ref={cursorRippleRef}
          style={{
            position: "absolute",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: `radial-gradient(
              circle,
              rgba(0,255,255,0.32) 0%,
              rgba(0,255,255,0.12) 45%,
              rgba(0,255,255,0) 75%
            )`,
            filter: "blur(10px)",
            opacity: 0.55,
            mixBlendMode: "screen",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      </div>
    </div>
  );
}

