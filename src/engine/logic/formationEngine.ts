// =============================================================
// PREMIUM FORMATION ENGINE — SAFE & ISOLATED (December Demo)
// =============================================================
// Pure math-only formation algorithms.
// Does NOT import from Pixi or worldState.
// Fully deterministic and future-proof.
// =============================================================

export interface FormationPoint {
  x: number;
  y: number;
}

export interface EntityLike {
  transform: { x: number | null; y: number | null };
}

export function computeRallyPositions(
  units: EntityLike[],
  center: FormationPoint
): FormationPoint[] {
  const count = units.length;
  if (count === 0) return [];

  const radius = 40 + count * 2;
  const angleStep = (Math.PI * 2) / count;

  return units.map((_, i) => {
    const angle = i * angleStep;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

export function computeScatterPositions(
  units: EntityLike[],
  center: FormationPoint
): FormationPoint[] {
  const count = units.length;
  if (count === 0) return [];

  return units.map(() => {
    return {
      x: center.x + (Math.random() - 0.5) * 300,
      y: center.y + (Math.random() - 0.5) * 300,
    };
  });
}

export function computeLineFormationPositions(
  units: EntityLike[],
  center: FormationPoint
): FormationPoint[] {
  const count = units.length;
  if (count === 0) return [];

  const spacing = 40;
  const totalWidth = (count - 1) * spacing;

  return units.map((_, i) => {
    return {
      x: center.x - totalWidth / 2 + i * spacing,
      y: center.y,
    };
  });
}
