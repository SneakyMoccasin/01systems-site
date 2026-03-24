import { registerTick } from "./resetManager";

export function registerMovementRuntime(world: any) {
  // Movement tick is registered ONCE by PixiStage after app init.
  const movementLoop = () => {
    if (!world?.memory?.entities) return;

    const entities = world.memory.entities;

    for (const ent of entities) {
      if (ent.type !== "unit") continue;
      if (!ent.transform || !ent.ai) continue;

      if ((ent.ai as any).formationLocked === true) {
        continue;
      }

      const tx = ent.ai.targetX;
      const ty = ent.ai.targetY;

      const cx = ent.transform.x;
      const cy = ent.transform.y;

      if (typeof tx !== "number" || typeof ty !== "number") continue;
      if (typeof cx !== "number" || typeof cy !== "number") continue;

      // === FREEZE-ON-ARRIVAL ===
      if ((ent.ai as any).isFormation === true) {
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 3) {
          (ent.ai as any).formationLocked = true;
          // snap to target to avoid jitter
          ent.transform.x = tx;
          ent.transform.y = ty;
          continue; // skip further movement
        }
      }

      // Smooth movement
      const speed = 0.05;
      const nx = cx + (tx - cx) * speed;
      const ny = cy + (ty - cy) * speed;

      ent.transform.x = nx;
      ent.transform.y = ny;
    }
  };

  registerTick(movementLoop);

  if (typeof window !== "undefined") {
    (window as any).__movementTick = movementLoop;
  }
}
