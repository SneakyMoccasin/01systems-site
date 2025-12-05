// =======================================================
// ===============   PULSE ENGINE RESET CORE   ============
// =======================================================
// This module provides a unified, safe, deterministic reset
// mechanism for the entire engine (Pixi + React + AI).
//
// It centralizes:
// - Ticker shutdown
// - Global listener cleanup
// - World graph cleanup
// - Goal state cleanup
// - HUD & UI reset events
//
// All future reset calls MUST go through resetManager.
// =======================================================

import { Application } from "pixi.js";
import { hardGoalReset } from "./goalHooks";
import { registerMovementRuntime } from "./movementLoop";

// -------------------------------
// Global ticker registry
// -------------------------------
const tickRegistry = new Set<() => void>();

export function registerTick(fn: () => void) {
  tickRegistry.add(fn);
}

export function unregisterTick(fn: () => void) {
  tickRegistry.delete(fn);
}

export function clearAllTicks() {
  tickRegistry.clear();
}

// Called by PixiStage once per frame
export function runAllTicks() {
  for (const fn of tickRegistry) fn();
}

// -------------------------------
// Global listener registry
// -------------------------------
const listenerRegistry: Array<{
  target: any;
  type: string;
  handler: any;
}> = [];

export function registerListener(
  target: any,
  type: string,
  handler: any
) {
  target.addEventListener(type, handler);
  listenerRegistry.push({ target, type, handler });
}

export function clearAllListeners() {
  for (const { target, type, handler } of listenerRegistry) {
    target.removeEventListener(type, handler);
  }
  listenerRegistry.length = 0;
}

// -------------------------------
// Reset events dispatched to React UI
// -------------------------------
export function broadcastUIReset() {
  window.dispatchEvent(new Event("pulse-ui-reset"));
}

export function broadcastGoalReset() {
  window.dispatchEvent(new Event("pulse-goal-reset"));
}

// -------------------------------
// CORE RESET FUNCTION
// -------------------------------
export function resetEngine(app: Application) {
  // 1. Reset goal state
  hardGoalReset();

  // 2. Full world memory cleanse
  const world = (window as any).__pulseWorld;
  if (world?.memory?.entities) {
    world.memory.entities.length = 0;
  }

  // Also reset entity graphics or caches if needed (safe)
  if ((window as any).__goal_activeEntities) {
    (window as any).__goal_activeEntities = new Set();
  }

  // 3. Stop all tickers
  clearAllTicks();

  // 4. Remove ALL listeners across engine
  clearAllListeners();

  // 5. Hard clear Pixi stage EXCEPT background layers
  const toPreserve = new Set(["vignetteLayer", "starsLayer"]);

  const survivors: any[] = [];
  for (const child of app.stage.children) {
    if (toPreserve.has(child.name)) {
      survivors.push(child);
      continue;
    }
    child.destroy({ children: true, texture: true, baseTexture: true });
  }

  app.stage.removeChildren();
  for (const s of survivors) app.stage.addChild(s);

  // 6. UI + Goal resets
  broadcastUIReset();
  broadcastGoalReset();

  // 7. Force Pixi redraw
  app.render();
}

// -------------------------------
// WORLD RUNTIME ATTACHMENT
// -------------------------------
export function attachWorldToRuntime(world: any) {
  registerMovementRuntime(world);
}

