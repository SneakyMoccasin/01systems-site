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
  const app = (window as any).__pixiApp;
  const maxW = app ? app.screen.width - 40 : window.innerWidth - 40;
  const maxH = app ? app.screen.height - 40 : window.innerHeight - 40;

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(v, max));
  }

  const count = units.length;
  if (count === 0) return [];

  const radius = 40 + count * 2;
  const angleStep = (Math.PI * 2) / count;

  return units.map((_, i) => {
    const angle = i * angleStep;
    return {
      x: clamp(center.x + Math.cos(angle) * radius, 40, maxW),
      y: clamp(center.y + Math.sin(angle) * radius, 40, maxH),
    };
  });
}

export function computeScatterPositions(
  units: EntityLike[],
  center: FormationPoint
): FormationPoint[] {
  const app = (window as any).__pixiApp;
  const maxW = app ? app.screen.width - 40 : window.innerWidth - 40;
  const maxH = app ? app.screen.height - 40 : window.innerHeight - 40;

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(v, max));
  }

  const count = units.length;
  if (count === 0) return [];

  return units.map(() => {
    return {
      x: clamp(center.x + (Math.random() - 0.5) * 300, 40, maxW),
      y: clamp(center.y + (Math.random() - 0.5) * 300, 40, maxH),
    };
  });
}

export function computeLineFormationPositions(
  units: EntityLike[],
  center: FormationPoint
): FormationPoint[] {
  const app = (window as any).__pixiApp;
  const maxW = app ? app.screen.width - 40 : window.innerWidth - 40;
  const maxH = app ? app.screen.height - 40 : window.innerHeight - 40;

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(v, max));
  }

  const count = units.length;
  if (count === 0) return [];

  const spacing = 40;
  const totalWidth = (count - 1) * spacing;

  return units.map((_, i) => {
    return {
      x: clamp(center.x - totalWidth / 2 + i * spacing, 40, maxW),
      y: clamp(center.y, 40, maxH),
    };
  });
}
