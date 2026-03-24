export function moveTowardsGoal(entity: any, gfx: any, delta: number) {
  if (!entity.goal) return;

  const goalX = entity.goal.x;
  const goalY = entity.goal.y;

  if (!entity.transform) return;

  // Safe default speed
  const speed = entity.speed ?? 2.0;

  const dx = goalX - entity.transform.x;
  const dy = goalY - entity.transform.y;

  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) {
    entity.goal = null;
    return;
  }

  // Normalize movement
  const nx = dx / dist;
  const ny = dy / dist;

  entity.transform.x += nx * speed * delta;
  entity.transform.y += ny * speed * delta;

  // Sync PIXI container
  gfx.x = Math.round(entity.transform.x);
  gfx.y = Math.round(entity.transform.y);
}

export function hasGoal(entity: any) {
  return !!(entity.goal && entity.goal.x != null && entity.goal.y != null);
}

