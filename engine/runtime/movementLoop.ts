// =======================================================
// ===============  MOVEMENT RUNTIME v1 ==================
// =======================================================
// This loop is ENGINE-RUNTIME SAFE.
// No core logic is modified.
// It reads ai.targetX/Y and updates transform.x/y every frame.
// Works for:
//   - spawn movement
//   - user click movement (future)
//   - formation commands (rally, scatter, line)
//   - lockedUntil logic
//
// PixiStage only renders positions (READ-ONLY).
//
// =======================================================

import { registerTick } from "./resetManager";

export function registerMovementRuntime(world: any) {
  registerTick(() => {
    const entities = world.memory?.entities;
    if (!entities || entities.length === 0) return;

    const now = Date.now();

    for (const ent of entities) {
      if (ent.type !== "unit") continue;
      if (!ent.transform || !ent.ai) continue;

      // --- Honor formation lock ---
      if (ent.ai.lockedUntil && now < ent.ai.lockedUntil) {
        continue;
      }

      const tx = ent.ai.targetX;
      const ty = ent.ai.targetY;
      const cx = ent.transform.x;
      const cy = ent.transform.y;

      if (typeof tx !== "number" || typeof ty !== "number") continue;
      if (typeof cx !== "number" || typeof cy !== "number") continue;

      // --- Movement smoothing speed ---
      const speed = 0.08;

      const nextX = cx + (tx - cx) * speed;
      const nextY = cy + (ty - cy) * speed;

      ent.transform.x = nextX;
      ent.transform.y = nextY;
    }
  });
}

